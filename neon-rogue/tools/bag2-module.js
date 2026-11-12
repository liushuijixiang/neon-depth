/* =========================================================
   BAG_V2 · 按重量计算的背包、满包拾取、耐久条、街头事件
   ========================================================= */
var BAG_W = { gray: 1, green: 1, blue: 2, purple: 2, orange: 3, red: 3 };
function modWeight(id) { var m = MOD_BY[id]; if (!m) return 1; return m.relic ? 1 : (BAG_W[m.quality] || 1); }
function bagLoad() { return bagItems().reduce(function (s, id) { return s + modWeight(id); }, 0); }
function bagFits(id) { return G.mode !== 'normal' || bagLoad() + modWeight(id) <= bagCap(); }
function durBar(id, big) {
  var it = (G.inst || {})[id]; if (!it || MOD_BY[id] && MOD_BY[id].relic) return '';
  return durBarOf(it, big);
}
function durBarOf(it, big) {
  if (!it) return '';
  var k = Math.max(0, it.dur) / Math.max(1, it.maxDur), col = it.dur <= 0 ? '#5a2a33' : k < .3 ? '#ff4d5e' : k < .6 ? '#ffb347' : '#57ffa8';
  return '<span class="durbar' + (big ? ' big' : '') + '" title="耐久 ' + Math.max(0, it.dur) + '/' + it.maxDur + '"><i style="width:' + Math.round(k * 100) + '%;background:' + col + '"></i>' + (big ? '<b>' + (it.dur <= 0 ? '已损坏' : '耐久 ' + it.dur + '/' + it.maxDur) + '</b>' : '') + '</span>';
}
// 卸下的义体放不进背包时，放在脚边
function bagSettle() {
  var id = G._justOff; G._justOff = null;
  if (!id || G.mode !== 'normal' || !G.map || G.state !== 'play') return;
  if (Object.keys(G.cyber).some(function (k) { return G.cyber[k] === id; })) return;
  if (G.modBag.indexOf(id) < 0 || bagLoad() <= bagCap()) return;
  G.modBag.splice(G.modBag.indexOf(id), 1);
  var inst = (G.inst || {})[id]; delete G.inst[id];
  dropToGround({ mod: MOD_BY[id], inst: inst });
  toast('背包放不下 · ' + MOD_BY[id].name + ' 放在脚边', 'warn');
}
function takeGroundMod(it) {
  var gi = G.items.indexOf(it); if (gi >= 0) G.items.splice(gi, 1);
  if (it.inst) { G.inst = G.inst || {}; G.inst[it.mod.id] = it.inst; }
  instOf(it.mod.id); G.modBag.push(it.mod.id); recordCodex && 0;
  sfx.pick(); burst(p.x, p.y, it.mod.color || '#9fe9ff', 14);
}
// 满包时踩到义体：替换装配 / 丢掉背包里的东西 / 留在地上
function fullPickupScreen(it) {
  var m = it.mod, q = QUALITY[m.quality] || QUALITY.gray, w = modWeight(m.id);
  showModal('bagfull');
  var html = '<div class="card bagfull"><div class="kicker">背包 ' + bagLoad() + '/' + bagCap() + ' · 放不下</div><h1 class="title small">捡起来？</h1>' +
    '<div class="swap-new" style="--it:' + q.color + '"><b>' + econEsc(it.inst ? it.inst.name : m.name) + '</b><small>' + q.name + ' · ' + (SLOT_LABEL[m.slot] || '') + ' · 重量 ' + w + '</small>' + durBarOf(it.inst, true) + '<em>' + econEsc(m.desc) + '</em></div>';
  var slots = CYBER_SLOTS.filter(function (sl) { return slotAccepts(m, sl.id); });
  html += '<div class="loot-h">直接装上</div><div class="swap-grid">';
  slots.forEach(function (sl) { var cur = G.cyber[sl.id], cm = MOD_BY[cur];
    var fits = !cur || bagLoad() + modWeight(cur) <= bagCap();
    html += '<button class="swap-old" data-fp-eq="' + sl.id + '" style="--it:' + (cm ? (QUALITY[cm.quality] || QUALITY.gray).color : '#57ffa8') + '"><b>' + sl.name + '</b><small>' + (cm ? '换下 ' + econEsc(modName(cur)) + (fits ? ' → 背包' : ' → 地上') : '空槽') + '</small></button>'; });
  html += '</div>';
  var bag = bagItems();
  if (bag.length) {
    html += '<div class="loot-h">或者丢掉背包里的</div><div class="swap-grid">';
    bag.forEach(function (id) { var bm = MOD_BY[id], bq = QUALITY[bm.quality] || QUALITY.gray, ok = bagLoad() - modWeight(id) + w <= bagCap();
      html += '<button class="swap-old" data-fp-drop="' + id + '" style="--it:' + bq.color + '"><b>' + econEsc(modName(id)) + '</b><small>重量 ' + modWeight(id) + (ok ? ' · 丢下后能装下' : ' · 还不够') + '</small>' + durBar(id) + '</button>'; });
    html += '</div>';
  }
  html += '<div class="dock"><button class="ghost" id="fpLeave">先留在地上</button><button class="ghost" id="fpBag">打开背包</button></div></div>';
  overlay.innerHTML = html;
  function done() { hideOverlay(); recalc(); updateHUD(); econResume(); }
  $$('[data-fp-eq]').forEach(function (b) { b.onclick = function () {
    takeGroundMod(it); installCyber(m.id, b.getAttribute('data-fp-eq')); done(); }; });
  $$('[data-fp-drop]').forEach(function (b) { b.onclick = function () {
    var id = b.getAttribute('data-fp-drop'), bi = G.modBag.indexOf(id); if (bi < 0) return;
    G.modBag.splice(bi, 1); var inst = (G.inst || {})[id]; delete G.inst[id];
    G.items.push({ x: p.x, y: p.y, mod: MOD_BY[id], inst: inst, seed: Math.random() * TAU, _skipTurn: G.turn });
    if (bagFits(m.id)) { takeGroundMod(it); toast('换成 ' + m.name, 'good'); done(); } else fullPickupScreen(it);
  }; });
  $('#fpLeave').onclick = function () { it._skipTurn = G.turn; done(); };
  $('#fpBag').onclick = function () { it._skipTurn = G.turn; hideOverlay(); openBag(); };
}

/* ---------- 背包面板 ---------- */
function openBag(tab) {
  if (G.state !== 'play' || psychoActive()) return;
  tab = tab || G.bagTab || 'gear'; G.bagTab = tab;
  showModal('bag');
  var load = bagLoad(), cap = bagCap();
  var html = '<div class="card bagp"><div class="kicker">INVENTORY // 背包</div><h1 class="title small">背包</h1>' +
    '<div class="bag-cap"><span>负重 <b>' + load + '</b> / ' + cap + '</span><small>灰绿 1 · 蓝紫 2 · 橙红 3 · 遗物 1 · 芯片不占位</small></div>' +
    '<div class="bag-bar">' + Array.from({ length: cap }, function (_, i) { return '<u class="' + (i < load ? 'on' : '') + '"></u>'; }).join('') + '</div>' +
    '<div class="tabs"><button class="tab' + (tab === 'gear' ? ' on' : '') + '" data-bt="gear">义体</button><button class="tab' + (tab === 'cons' ? ' on' : '') + '" data-bt="cons">消耗品 ' + G.inv.length + '/4</button><button class="tab' + (tab === 'chips' ? ' on' : '') + '" data-bt="chips">芯片盒 ' + (G.chips || []).length + '</button></div>';
  if (tab === 'gear') {
    html += '<div class="loot-h">背包里（' + bagItems().length + ' 件）</div><div class="bag-grid">';
    bagItems().sort(function (a, b) { return Q_ORDER.indexOf(MOD_BY[b].quality) - Q_ORDER.indexOf(MOD_BY[a].quality); }).forEach(function (id) {
      var m = MOD_BY[id], q = QUALITY[m.quality] || QUALITY.gray, sl = CYBER_SLOTS.filter(function (x) { return slotAccepts(m, x.id); }).map(function (x) { return x.name; }).join('/');
      html += '<div class="bag-it" style="--it:' + q.color + '"><span class="wt">' + modWeight(id) + '</span><b>' + econEsc(modName(id)) + '</b><small>' + q.name + ' · ' + sl + '</small>' + durBar(id) + '<em>' + econEsc(m.desc) + '</em>' +
        '<div class="bag-act"><button data-be="' + id + '">装配</button><button data-binfo="' + id + '">详情</button><button data-bd="m' + id + '">丢下</button></div></div>';
    });
    if (!bagItems().length) html += '<div class="hint" style="grid-column:1/-1">背包是空的。踩到义体会先装进空槽，没空槽才进背包。</div>';
    html += '</div><div class="loot-h">已装配（不占背包）</div><div class="bag-grid">';
    CYBER_SLOTS.forEach(function (sl) { var id = G.cyber[sl.id]; if (!id) return; var m = MOD_BY[id], q = QUALITY[m.quality] || QUALITY.gray, fits = bagLoad() + modWeight(id) <= cap;
      html += '<div class="bag-it worn" style="--it:' + q.color + '"><span class="wt">' + sl.name + '</span><b>' + econEsc(modName(id)) + '</b><small>' + q.name + ' · 负载 ' + instLoad(id) + '</small>' + durBar(id) +
        '<div class="bag-act"><button data-bun="' + sl.id + '">' + (fits ? '卸下' : '卸下到地上') + '</button><button data-binfo="' + id + '">详情</button></div></div>'; });
    html += '</div>';
  } else if (tab === 'cons') {
    html += '<div class="bag-grid">';
    G.inv.forEach(function (id, i) { var c = CONS[id]; if (!c) return; var t = TIER_INFO[c.tier || 'common'] || TIER_INFO.common;
      html += '<div class="bag-it" style="--it:' + t.color + '"><b>' + econEsc(c.name) + '</b><small>' + t.name + '</small><em>' + econEsc(consEffectText(c).join('；')) + '</em><div class="bag-act"><button data-bu="' + i + '">使用</button><button data-bd="c' + i + '">丢下</button><button data-bs="' + i + '">¥' + consValue(c) + '</button></div></div>'; });
    if (!G.inv.length) html += '<div class="hint" style="grid-column:1/-1">没有消耗品</div>';
    html += '</div><div class="hint">消耗品栏满了再捡东西，会问你换掉哪个；换下来的按价折现。</div>';
  } else {
    html += '<div class="bag-grid">';
    (G.chips || []).forEach(function (c, i) { html += '<div class="bag-it" style="--it:' + c.color + '"><b>' + econEsc(c.grade + '·' + c.name) + '</b><em>' + econEsc(chipText(c)) + (c.heavy ? ' · 重改 +' + c.heavy + ' 负载' : '') + '</em><div class="bag-act"><button data-bchip="' + i + '">镶嵌</button><button data-bd="p' + i + '">丢下</button></div></div>'; });
    if (!(G.chips || []).length) html += '<div class="hint" style="grid-column:1/-1">芯片盒是空的</div>';
    html += '</div><div class="hint">芯片放在芯片盒里，不占背包，不会自动分解。镶嵌到义体后才生效。</div>';
  }
  html += '<div class="dock"><button class="ghost" id="bagCyber">义体仓</button><button class="cta" id="bagClose">关闭</button></div></div>';
  overlay.innerHTML = html;
  function back() { openBag(tab); }
  $('#bagClose').onclick = function () { hideOverlay(); updateHUD(); econResume(); };
  $('#bagCyber').onclick = function () { hideOverlay(); openCyber(); };
  $$('[data-bt]').forEach(function (b) { b.onclick = function () { openBag(b.getAttribute('data-bt')); }; });
  $$('[data-bu]').forEach(function (b) { b.onclick = function () { hideOverlay(); useConsumable(+b.getAttribute('data-bu')); }; });
  $$('[data-be]').forEach(function (b) { b.onclick = function () { installCyber(b.getAttribute('data-be')); back(); }; });
  $$('[data-bun]').forEach(function (b) { b.onclick = function () { unequipCyber(b.getAttribute('data-bun')); back(); }; });
  $$('[data-binfo]').forEach(function (b) { b.onclick = function () { hideOverlay(); openCyber(); G.cyberItem = b.getAttribute('data-binfo'); renderCyber(); }; });
  $$('[data-bchip]').forEach(function (b) { b.onclick = function () { var c = G.chips.splice(+b.getAttribute('data-bchip'), 1)[0]; if (c) { var before = G.chips.length; addChipObject(c); toast(G.chips.length > before ? '没有空的芯片槽' : '已镶嵌 · ' + c.name, G.chips.length > before ? 'bad' : 'good'); recalc(); } back(); }; });
  $$('[data-bs]').forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-bs'), c = CONS[G.inv[i]]; if (!c) return; G.inv.splice(i, 1); gainCredits(consValue(c), null, null, true); sfx.pick(); back(); }; });
  $$('[data-bd]').forEach(function (b) { b.onclick = function () {
    var k = b.getAttribute('data-bd'), t = k[0], v = k.slice(1);
    if (t === 'c') { var c = CONS[G.inv[+v]]; if (!c) return; G.inv.splice(+v, 1); G.items.push({ x: p.x, y: p.y, cons: c, seed: Math.random() * TAU, _skipTurn: G.turn }); }
    else if (t === 'm') { var bi = G.modBag.indexOf(v); if (bi < 0) return; G.modBag.splice(bi, 1); var inst = (G.inst || {})[v]; delete (G.inst || {})[v]; G.items.push({ x: p.x, y: p.y, mod: MOD_BY[v], inst: inst, seed: Math.random() * TAU, _skipTurn: G.turn }); }
    else if (t === 'p') { var ch = G.chips.splice(+v, 1)[0]; if (ch) G.items.push({ x: p.x, y: p.y, chip: ch, seed: Math.random() * TAU, _skipTurn: G.turn }); }
    sfx.step(); recalc(); back();
  }; });
}

/* ---------- 街头事件（彩蛋） ---------- */
var NETA = (window.NEON && window.NEON.neta) || { drinks: [], bartender: [], events: [] };
if (STORY.bar) { STORY.bar.drinks = (STORY.bar.drinks || []).concat(NETA.drinks || []); if (STORY.bar.bartender) STORY.bar.bartender.lines = (STORY.bar.bartender.lines || []).concat(NETA.bartender || []); }
SITE_DEFS.event = { name: '街头', char: '?', color: '#ff9f43', reuse: false, tip: '路边的小事，二选一', line: '' };
function placeEventSite(depth, sites) {
  if (G.mode !== 'normal' || depth % 5 === 0 || !(NETA.events || []).length || Math.random() > .5) return;
  G.evSeen = G.evSeen || [];
  var pool = NETA.events.filter(function (e) { return G.evSeen.indexOf(e.id) < 0; }); if (!pool.length) return;
  var ev = pick(pool);
  for (var k = 0; k < 40; k++) { var t = randomFloorTile(4, false); if (!t) break; if (sites.some(function (s) { return Math.abs(s.x - t.x) + Math.abs(s.y - t.y) < 3; })) continue;
    G.evSeen.push(ev.id); sites.push({ type: 'event', x: t.x, y: t.y, used: false, seed: Math.random() * TAU, data: { ev: ev.id } }); return; }
}
function eventEffect(eff) {
  var d = econDepth(), n;
  if (eff === 'heal') { n = pctHp(.25); healPlayer(n, true); return '生命 +' + n; }
  if (eff === 'hurt') { n = Math.min(p.hp - 1, pctHp(.12)); p.hp -= n; G.hurt = .6; return '生命 -' + n; }
  if (eff === 'credits') { n = 10 + d * 3; gainCredits(n, p.x, p.y); return '¥ +' + n; }
  if (eff === 'lose_credits') { n = Math.min(G.credits || 0, 8 + d * 2); G.credits -= n; return '¥ -' + n; }
  if (eff === 'item') { var c = lootCons(d > 6 ? 'rare' : 'common'); addConsumable(c); return '获得 ' + c.name; }
  if (eff === 'chip') { var ch = makeChip(pick(CHIPS).id, chipQualityRoll()); addChipObject(ch); return '获得 ' + ch.grade + '·' + ch.name; }
  if (eff === 'xp') { n = 8 + d * 3; gainXp(n); return '经验 +' + n; }
  if (eff === 'adapt') { G.adaptBonus = (G.adaptBonus || 0) + 2; recalc(); return '本局适应度 +2'; }
  if (eff === 'fight') { var e = guaranteeSpawn(null, true); if (e) { var sp = freeAdjacent(p.x, p.y); if (sp) { e.x = sp.x; e.y = sp.y; } e.alerted = true; } return '有人冲你来了'; }
  if (eff === 'psycho') { setTimeout(triggerPsycho, 50); return '脑子里有东西断了'; }
  return '';
}
function openEvent(s) {
  var ev = (NETA.events || []).find(function (e) { return e.id === s.data.ev; }); if (!ev) { s.used = true; return; }
  showModal('event');
  overlay.innerHTML = '<div class="card site event" style="--site:#ff9f43"><div class="sign"><i>?</i></div><div class="kicker">B' + G.depth + 'F · 街头</div><h1 class="title small">' + econEsc(ev.title) + '</h1>' +
    '<div class="story-text npc-say">' + econEsc(ev.text) + '</div><div class="ev-opts"><button class="kbtn" data-ev="a" style="--kc:#57ffa8"><b>' + econEsc(ev.a.label) + '</b></button><button class="kbtn" data-ev="b" style="--kc:#ff9f43"><b>' + econEsc(ev.b.label) + '</b></button></div></div>';
  $$('[data-ev]').forEach(function (b) { b.onclick = function () {
    var o = ev[b.getAttribute('data-ev')]; s.used = true; var fx = eventEffect(o.eff); sfx.quest();
    overlay.innerHTML = '<div class="card site event" style="--site:#ff9f43"><div class="sign"><i>?</i></div><h1 class="title small">' + econEsc(ev.title) + '</h1><div class="story-text npc-say">' + econEsc(o.result) + '</div>' + (fx ? '<div class="hint" style="color:#ffd166">' + econEsc(fx) + '</div>' : '') + '<div class="dock"><button class="cta" id="evOk">走了</button></div></div>';
    $('#evOk').onclick = function () { hideOverlay(); updateHUD(); econResume(); };
  }; });
}
var CHIP_HELP = {
  atk: '直接加攻击力。', hp: '加最大生命。', def: '加防御，减少每次受到的伤害。',
  crit: '加暴击率。暴击伤害默认 150%。', dodge: '加闪避率，闪避时完全不受伤。', critMult: '加暴击时的伤害倍率（爆伤）。',
  compat: '提高义体适应度。适应度越高，能装越多义体而不过载；过载会降低效能、受击时可能诱发赛博精神病。',
  power: '提高义体主动技能的输出：伤害、护盾量、治疗量都按这个比例放大。不影响普通攻击。',
  skill: '把所装义体的主动技能等级直接提高，等同于成长等级；最高 8 级。等级越高，主动技能伤害系数越高。'
};
