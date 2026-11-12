/* =========================================================
   STORY_V1 · 剧情：档案 / 固定人物 / 剧情义体 / 余烬酒吧 / 传说
   ========================================================= */
var STORY = (window.NEON && window.NEON.story) || { chapters: [], classes: {}, bosses: {}, npcs: [], relics: [], bar: { drinks: [], bartender: { lines: [] }, legendDrink: { names: [], desc: [] }, legends: [] }, contracts: {}, fixer: { lines: [] } };
var STORY_KEY = 'neon-depth-story';
var ST = loadJSON(STORY_KEY, {});
['chapters', 'classes', 'bosses', 'npc', 'relics'].forEach(function (k) { if (!ST[k] || typeof ST[k] !== 'object') ST[k] = {}; });
if (!Array.isArray(ST.legends)) ST.legends = [];
ST.wins = ST.wins || 0; ST.deaths = ST.deaths || 0; ST.psycho = ST.psycho || 0; ST.maxDepth = ST.maxDepth || 0; ST.drinks = ST.drinks || 0;
function storySave() { saveJSON(STORY_KEY, ST); }
var NPC_BY = {}; (STORY.npcs || []).forEach(function (n) { NPC_BY[n.id] = n; });
function npcState(id) { return ST.npc[id] || (ST.npc[id] = { stage: 0, met: 0 }); }
function npcsDoneCount() { return (STORY.npcs || []).filter(function (n) { return npcState(n.id).done; }).length; }
function storyFmt(s, o) { return String(s || '').replace(/\{(\w+)\}/g, function (_, k) { return o[k] != null ? o[k] : ''; }); }

/* ---------- 剧情义体：注册为 MODS（不进随机掉落） ---------- */
var RELIC_ONCE = {
  nuke: '对视野内全部敌人造成 8×攻击 伤害',
  timestop: '时间停止 5 回合',
  rebirth: '本次深潜中第一次致死时，满血复苏',
  purge: '回满生命，8 回合内无视过载',
  execute: '处决视野内全部普通敌人，守卫失去 25% 当前生命',
  overclock: '全部冷却清零，6 回合内攻击翻倍'
};
(STORY.relics || []).forEach(function (r) {
  if (MOD_BY[r.id]) return;
  var parts = Object.keys(r.stats || {}).map(function (k) { var L = { atk: '攻击', maxHp: '生命', def: '防御', crit: '暴击', dodge: '闪避', lifesteal: '吸血' }; var v = r.stats[k]; return (L[k] || k) + ' +' + (v < 1 ? Math.round(v * 100) + '%' : v); });
  var m = { id: r.id, slot: r.slot, quality: r.quality, name: r.name, color: (QUALITY[r.quality] || QUALITY.orange).color, stats: r.stats || {},
    desc: parts.join('，') + '；一次性：' + r.onceName, active: { name: r.onceName, type: 'relic_' + r.once, cd: 1 }, dropOnly: true, relic: true, lore: r.lore };
  MODS.push(m); MOD_BY[m.id] = m;
});
ACT_COLOR = ACT_COLOR || {}; ACT_LABEL = ACT_LABEL || {};
Object.keys(RELIC_ONCE).forEach(function (k) { ACT_COLOR['relic_' + k] = '#fcee0a'; ACT_LABEL['relic_' + k] = '遗物'; });
function relicFire(id, m) {
  var once = m.active.type.slice(6);
  if ((G.relicUsed || {})[id]) { msg('遗物已耗尽', 'dim'); return; }
  G.relicUsed = G.relicUsed || {}; G.relicUsed[id] = true;
  var vis = G.enemies.filter(function (e) { return e.hp > 0 && G.vis[e.y] && G.vis[e.y][e.x]; });
  NV.glitch = 1; nvPunch(1.6); G.flash = 1; G.shake = 12; nvColumn(p.x, p.y, '#fcee0a', 7);
  if (once === 'nuke') vis.forEach(function (e) { var h = playerHit(e, effAtk() * 8, { source: 'relic', lifesteal: false }); nvExplode(e.x, e.y, '#fcee0a', 1.2); float(e.x, e.y, '-' + h.damage, '#fcee0a', true); if (e.hp <= 0) killEnemy(e); });
  else if (once === 'timestop') { G.freeze = Math.max(G.freeze || 0, 5); }
  else if (once === 'rebirth') { G.rebirthArmed = true; }
  else if (once === 'purge') { healPlayer(p.maxHp, true); G.purgeT = 8; p.buffs = p.buffs.filter(function (b) { var d = b.def || BUFF[b.id]; return !d || d.kind !== 'dot'; }); }
  else if (once === 'execute') vis.forEach(function (e) { if (e.boss) { var n = Math.floor(e.hp * .25); e.hp -= n; float(e.x, e.y, '-' + n, '#fcee0a', true); } else { e.hp = 0; nvKill(e, 'melee'); killEnemy(e); } });
  else if (once === 'overclock') { G.cyberCd = {}; G.cd = {}; G.ghostCd = {}; G.gunCd = {}; G.mechCd = {}; G.cyberCd[id] = 0; p.buffs.push({ id: 'relic_oc_' + G.turn, turns: 6, pool: 0, def: { kind: 'atk', name: '超频', color: '#fcee0a', amount: Math.round(effAtk()), desc: '' } }); recalc(); }
  toast('遗物 · ' + m.active.name, 'good');
  msg('「' + m.name + '」' + RELIC_ONCE[once], 'warn');
  G.cyberCd[id] = 0; updateHUD(); endTurn();
}

/* ---------- 解锁与剧情卡 ---------- */
function storyCard(o) { G.storyQueue = G.storyQueue || []; G.storyQueue.push(o); }
function maybeShowStory() {
  if (!G.storyQueue || !G.storyQueue.length || G.state !== 'play' || G.paused || G.modal || G.busy) return false;
  var o = G.storyQueue.shift();
  showModal('story');
  overlay.innerHTML = '<div class="card story-card" style="--acc:' + (o.color || '#fcee0a') + '"><div class="kicker">' + econEsc(o.kicker || 'ARCHIVE // 档案解锁') + '</div>' +
    '<h1 class="title small">' + econEsc(o.title) + '</h1><div class="story-text">' + econEsc(o.text).replace(/\n/g, '<br>') + '</div>' +
    '<button class="cta" id="storyOk">继续</button></div>';
  $('#storyOk').onclick = function () { hideOverlay(); econResume(); };
  return true;
}
function chapterMet(u) {
  if (u === 'start') return true;
  var m = String(u).split(':');
  if (m[0] === 'depth') return ST.maxDepth >= +m[1];
  if (m[0] === 'boss') return !!ST.bosses[m[1]];
  if (m[0] === 'win') return ST.wins >= 1;
  if (m[0] === 'win2') return ST.wins >= 2;
  if (m[0] === 'death3') return ST.deaths >= 3;
  if (m[0] === 'psycho') return ST.psycho >= 1;
  if (m[0] === 'npcs') return npcsDoneCount() >= +m[1];
  return false;
}
function storyCheck(quiet) {
  if (G.mode !== 'normal') return;
  var got = false;
  (STORY.chapters || []).forEach(function (c, i) {
    if (ST.chapters[c.id] || !chapterMet(c.unlock)) return;
    ST.chapters[c.id] = Date.now(); got = true;
    if (!quiet) storyCard({ kicker: 'MAINLINE // 主线 ' + (i + 1) + '/' + STORY.chapters.length, title: c.title, text: c.text });
  });
  if (got) storySave();
}
function storyUnlock(kind, key, title) {
  if (G.mode !== 'normal' || ST[kind][key]) return;
  ST[kind][key] = Date.now(); storySave();
  if (title) msg('◆ 档案解锁 · ' + title, 'warn');
}
function storyEvent(type, arg) {
  if (G.mode !== 'normal') return;
  var cls = classDef().id, C2 = (STORY.classes || {})[cls];
  if (type === 'start') { if (C2) storyUnlock('classes', cls + ':0', C2.title); }
  if (type === 'depth') {
    if (arg > ST.maxDepth) { ST.maxDepth = arg; storySave(); }
    if (C2 && arg >= 6) storyUnlock('classes', cls + ':1', C2.title + ' · 二');
    if (C2 && arg >= 11) storyUnlock('classes', cls + ':2', C2.title + ' · 三');
  }
  if (type === 'boss') {
    var b = (STORY.bosses || {})[arg];
    if (b) { if (b.death) { msg('「' + b.death + '」', 'warn'); var be = G.enemies.find(function (e) { return e.boss; }); } storyUnlock('bosses', arg, b.title); }
  }
  if (type === 'win') {
    ST.wins++; if (C2) storyUnlock('classes', cls + ':end', C2.title + ' · 终章');
    if (C2 && C2.ending) storyCard({ kicker: 'ENDING // ' + classDef().name, title: C2.title, text: C2.ending, color: classDef().color });
  }
  if (type === 'death') { ST.deaths++; ST.lastDeath = G.depth; }
  if (type === 'psycho') ST.psycho++;
  storySave(); storyCheck(type === 'death' || type === 'win');
}

/* ---------- 固定人物 ---------- */
SITE_DEFS.npc = { name: '固定人物', char: '人', color: '#fcee0a', reuse: true, tip: '各层驻守的人物：交谈、雇佣、决斗或接私人委托', line: '' };
function siteDef(s) {
  if (s && s.type === 'npc') { var n = NPC_BY[s.data.npc] || {}; return { name: n.name || '人物', char: n.char || '人', color: n.color || '#fcee0a', reuse: true, tip: n.title || '', line: '' }; }
  return SITE_DEFS[s.type];
}
function placeNpcSite(depth, sites) {
  if (G.mode !== 'normal') return;
  var n = (STORY.npcs || []).find(function (x) { return x.floor === depth; }); if (!n) return;
  for (var k = 0; k < 60; k++) {
    var t = randomFloorTile(5, false); if (!t) break;
    if (sites.some(function (s) { return Math.abs(s.x - t.x) + Math.abs(s.y - t.y) < 4; })) continue;
    sites.push({ type: 'npc', x: t.x, y: t.y, used: false, seed: Math.random() * TAU, data: { npc: n.id } }); return;
  }
}
function npcGiveRelic(n) {
  if (!n.relic || !MOD_BY[n.relic]) return '';
  var st = npcState(n.id);
  var owned = G.modBag.indexOf(n.relic) >= 0 || META.stash.cyber.some(function (x) { return stashId(x) === n.relic; });
  if (owned) return '';
  st.relic = 1; ST.relics[n.relic] = Date.now(); storySave();
  applyMod(MOD_BY[n.relic]); recalc();
  nvColumn(p.x, p.y, '#fcee0a', 6);
  return '获得遗物「' + MOD_BY[n.relic].name + '」';
}
function openNpc(s, said) {
  var n = NPC_BY[s.data.npc]; if (!n) return;
  var st = npcState(n.id); if (!s.data.met) { s.data.met = 1; st.met = (st.met || 0) + 1; storySave(); }
  var total = (n.stages || []).length, d = siteDef(s);
  showModal('npc');
  var html = '<div class="card site npc" style="--site:' + d.color + '"><div class="sign"><i>' + d.char + '</i></div><div class="kicker">B' + G.depth + 'F · ' + econEsc(n.title) + ' · 信用点 ¥' + (G.credits || 0) + '</div>' +
    '<h1 class="title small">' + econEsc(n.name) + '</h1>' +
    '<div class="story-text npc-say">' + econEsc(said || pick(n.greet || ['……'])) + '</div><div class="slist">';
  var canTalk = !s.data.talked;
  html += siteRow({ name: st.done ? '往事' : '交谈', tag: st.done ? '故事已完结' : '故事 ' + Math.min(st.stage, total) + '/' + total, desc: st.done ? '再听一遍最后的话' : canTalk ? '每次深潜可交谈一次' : '今晚说得够多了', color: d.color, btn: '交谈', attr: 'data-npc="talk"', dis: !canTalk && !st.done });
  if (n.hire) {
    var cost = econPrice(n.hire.cost), hired = G.allies.some(function (a) { return a.kind === 'merc' && a.npc === n.id; });
    html += siteRow({ name: '雇佣 · ' + n.hire.skillName, tag: hired ? '已在队伍中' : '¥' + cost + ' · 随行至本次深潜结束', desc: MERC_SKILL_TEXT[n.hire.skill] || '', color: '#57ffa8', btn: hired ? '同行' : '¥' + cost, attr: 'data-npc="hire"', dis: hired || (G.credits || 0) < cost });
  }
  if (n.duel) html += siteRow({ name: '决斗', tag: st.duelWon ? '你赢过一次' : '败者听胜者的', desc: '与 ' + n.name + ' 单挑。获胜可得 ¥' + (20 + G.depth * 4) + (n.relic && !st.relic ? '与 TA 的遗物' : ''), color: '#ff4d5e', btn: s.data.duel ? '进行中' : '挑战', attr: 'data-npc="duel"', dis: !!s.data.duel });
  if (n.job && !st.jobDone) {
    var activeJob = (G.quests || []).some(function (q) { return q.def && q.def.npc === n.id && !q.done && !q.failed; });
    html += siteRow({ name: '私人委托 · ' + n.job.name, tag: activeJob ? '进行中' : '本层内 · 失败无惩罚', desc: n.job.brief, color: '#ffb347', btn: activeJob ? '进行中' : '接下', attr: 'data-npc="job"', dis: activeJob || contractActive().length >= 2 });
  }
  html += '</div><button class="ghost" id="siteClose">离开</button></div>';
  overlay.innerHTML = html;
  $('#siteClose').onclick = closeSite;
  $$('[data-npc]').forEach(function (b) { b.onclick = function () { npcAction(s, n, b.getAttribute('data-npc')); }; });
}
function npcAction(s, n, k) {
  var st = npcState(n.id), total = (n.stages || []).length;
  if (k === 'talk') {
    if (st.done) { openNpc(s, n.stages[total - 1]); return; }
    if (s.data.talked) return;
    s.data.talked = 1;
    var text = n.stages[Math.min(st.stage, total - 1)]; st.stage = Math.min(total, st.stage + 1);
    var extra = '';
    if (st.stage >= total && !st.done) { st.done = Date.now(); extra = npcGiveRelic(n); storyCheck(); toast('人物故事完结 · ' + n.name, 'good'); }
    storySave(); sfx.quest();
    openNpc(s, text + (extra ? '\n\n◆ ' + extra : ''));
  } else if (k === 'hire') {
    var cost = econPrice(n.hire.cost); if ((G.credits || 0) < cost) return;
    G.credits -= cost; G.allies = G.allies.filter(function (a) { return a.kind !== 'merc'; });
    var t = freeAdjacent(p.x, p.y) || { x: p.x, y: p.y };
    G.allies.push({ kind: 'merc', npc: n.id, name: n.name, color: n.color, char: n.char, skill: n.hire.skill, fight: n.hire.fight, x: t.x, y: t.y, turns: 99999, cd: 2 });
    sfx.level(); openNpc(s, n.hire.line);
  } else if (k === 'duel') {
    if (s.data.duel) return; s.data.duel = 1;
    var spec = MONSTERS.filter(function (m) { return !m.boss && m.ai === n.duel.ai; }).sort(function (a, b) { return Math.abs((a.minDepth || 1) - G.depth) - Math.abs((b.minDepth || 1) - G.depth); })[0] || pickMonster(G.depth);
    var spot = econSpawnNear(s.x, s.y, 2, 3) || freeAdjacent(p.x, p.y); if (!spot) return;
    var e = spawnEnemy(spec, spot.x, spot.y, G.depth); e.elite = true; e.npcDuel = n.id; e.name = n.name; e.color = n.color;
    e.hp = e.maxHp = Math.round(e.maxHp * 3.5); e.atk += 2; e.alerted = true; tacticUid(e); G.enemies.push(e);
    hideOverlay(); toast('决斗 · ' + n.name, 'bad'); msg(n.name + '：「' + n.duel.line + '」', 'warn'); G.shake = 6; updateHUD();
  } else if (k === 'job') {
    var def = { id: 'npc_' + n.id, tier: 'high', type: n.job.type, name: n.job.name, desc: n.job.brief + '（{n}）', n: [n.job.n, n.job.n], deadline: 'floor', terms: [], reward: { xp: 30 }, npc: n.id, noPenalty: true };
    var c = makeContract(def); if (acceptContract(c)) openNpc(s, '「' + n.job.brief + '」');
  }
}
function npcDuelWon(e) {
  var n = NPC_BY[e.npcDuel]; if (!n) return;
  var st = npcState(n.id); st.duelWon = (st.duelWon || 0) + 1;
  gainCredits(20 + G.depth * 4, e.x, e.y);
  msg(n.name + '：「' + (n.duel.lose || '……') + '」', 'warn');
  var r = npcGiveRelic(n); if (r) toast(r, 'good');
  storySave();
}
function npcJobDone(c) {
  var n = NPC_BY[c.def.npc]; if (!n) return;
  npcState(n.id).jobDone = Date.now(); storySave();
  if (n.job && n.job.done) msg(n.name + '：「' + n.job.done + '」', 'good');
}

/* ---------- 雇佣兵 ---------- */
var MERC_SKILL_TEXT = { heal: '每 4 回合为你修复 12% 生命', shield: '每 4 回合为你提供护盾', strike: '每 4 回合对身边敌人重击', snipe: '每 4 回合狙击 6 格内敌人', emp: '每 5 回合让周围敌人宕机', bleed: '攻击附加流血' };
function mercAct(a) {
  var ranged = a.fight === 'turret', e = nearestEnemyTo(a, ranged ? 6 : 8, true), atk = effAtk();
  a.cd = (a.cd || 0) - 1;
  if (a.cd <= 0) {
    a.cd = a.skill === 'emp' ? 5 : 4;
    if (a.skill === 'heal' && p.hp < p.maxHp) { healPlayer(pctHp(.12)); G.beams.push({ x0: a.x + .5, y0: a.y + .5, x1: p.x + .5, y1: p.y + .5, life: 260, max: 260, color: C.green }); float(a.x, a.y, a.name, a.color); }
    else if (a.skill === 'shield') { addBuff('shield', 4, pctHp(.12), a.name); float(a.x, a.y, a.name, a.color); }
    else if (a.skill === 'emp') { G.enemies.forEach(function (o) { if (!o.boss && Math.max(Math.abs(o.x - a.x), Math.abs(o.y - a.y)) <= 3) { o.stun = Math.max(o.stun || 0, 1); o.intent = null; } }); nvSpawn(a.x, a.y, a.color, 20); }
    else if (e && (a.skill === 'snipe' || a.skill === 'strike')) { var h = playerHit(e, atk * (a.skill === 'snipe' ? 1.6 : 2), { source: 'merc', origin: a }); G.beams.push({ x0: a.x + .5, y0: a.y + .5, x1: e.x + .5, y1: e.y + .5, life: 260, max: 260, color: a.color }); float(e.x, e.y, '-' + h.damage, a.color, true); if (e.hp <= 0) killEnemy(e); return; }
    else a.cd = 1;
  }
  if (!e) { if (Math.max(Math.abs(a.x - p.x), Math.abs(a.y - p.y)) > 2) allyStep(a, p); return; }
  var d = Math.max(Math.abs(e.x - a.x), Math.abs(e.y - a.y));
  if (ranged ? d <= 6 && los(a.x, a.y, e.x, e.y) : d <= 1) {
    var hit = playerHit(e, atk * .6, { source: 'merc', origin: a });
    if (a.skill === 'bleed') e.bleedStacks = Math.min(6, (e.bleedStacks || 0) + 2);
    if (ranged) G.beams.push({ x0: a.x + .5, y0: a.y + .5, x1: e.x + .5, y1: e.y + .5, life: 180, max: 180, color: a.color });
    float(e.x, e.y, '-' + hit.damage, a.color); if (e.hp <= 0) killEnemy(e);
  } else if (!ranged || d > 6) allyStep(a, e);
}

/* ---------- 余烬酒吧 ---------- */
var DRINK_BUFF = { hp: '下次深潜：生命上限 +12', atk: '下次深潜：攻击 +2', credits: '下次深潜：开局 +¥40', adapt: '下次深潜：适应度 +4', item: '下次深潜：开局 2 件稀有消耗品', crit: '下次深潜：暴击 +6%', legend: '下次深潜：攻击 +1，生命上限 +8，适应度 +2' };
function applyPendingDrink() {
  if (G.mode !== 'normal' || !ST.pendingDrink) return;
  var d = ST.pendingDrink; ST.pendingDrink = null; storySave();
  var b = d.buff;
  if (b === 'hp' || b === 'legend') p.itemMax += b === 'hp' ? 12 : 8;
  if (b === 'atk') p.itemAtk += 2;
  if (b === 'legend') p.itemAtk += 1;
  if (b === 'credits') G.credits = (G.credits || 0) + 40;
  if (b === 'adapt' || b === 'legend') G.adaptBonus = (G.adaptBonus || 0) + (b === 'adapt' ? 4 : 2);
  if (b === 'item') { addConsumable(lootCons('rare')); addConsumable(lootCons('rare')); }
  if (b === 'crit') G.runMod.crit = (G.runMod.crit || 0) + .06;
  recalc(); p.hp = p.maxHp;
  msg('「' + d.name + '」还在喉咙里烧 · ' + DRINK_BUFF[b], 'good');
}
function barScreen(tab) {
  tab = tab || 'drinks';
  var B = STORY.bar || {}, bt = B.bartender || { name: '酒保', lines: [] };
  var line = ST.lastDeath && Math.random() < .35 ? '上次你倒在 B' + ST.lastDeath + 'F。我给你留了个座。' : pick(bt.lines.length ? bt.lines : ['……']);
  var html = '<div class="card site bar" style="--site:#ff7a45"><div class="sign"><i>烬</i></div><div class="kicker">LOWER CITY · ' + econEsc(B.name || '余烬') + ' · 数据核心 ' + META.cores + '</div>' +
    '<h1 class="title small">' + econEsc(B.name || '余烬') + '</h1><div class="story-text npc-say">' + econEsc(bt.name) + '：「' + econEsc(line) + '」</div>' +
    '<div class="tabs"><button class="tab' + (tab === 'drinks' ? ' on' : '') + '" data-bt="drinks">酒单</button><button class="tab' + (tab === 'wall' ? ' on' : '') + '" data-bt="wall">传说墙 ' + ST.legends.length + '</button></div><div class="slist">';
  if (tab === 'drinks') {
    if (ST.pendingDrink) html += '<div class="hint" style="color:#ffb347">已点：「' + econEsc(ST.pendingDrink.name) + '」· ' + DRINK_BUFF[ST.pendingDrink.buff] + '</div>';
    (B.drinks || []).forEach(function (d, i) { html += siteRow({ name: d.name, tag: DRINK_BUFF[d.buff], desc: d.desc, color: '#ff7a45', btn: d.cost + ' 核心', attr: 'data-drink="' + i + '"', dis: META.cores < d.cost || !!ST.pendingDrink }); });
    ST.legends.slice().reverse().forEach(function (L, i) { html += siteRow({ name: L.drink, tag: '传说特调 · ' + DRINK_BUFF.legend, desc: L.drinkDesc, color: '#fcee0a', btn: '40 核心', attr: 'data-ldrink="' + (ST.legends.length - 1 - i) + '"', dis: META.cores < 40 || !!ST.pendingDrink }); });
  } else {
    if (!ST.legends.length) html += '<div class="hint">墙上还空着。老韩说，等你从井底爬回来，他亲手写。</div>';
    ST.legends.slice().reverse().forEach(function (L) { html += '<div class="legend"><b>' + econEsc(L.title) + '</b><p>' + econEsc(L.text) + '</p><small>' + econEsc(L.meta) + '</small></div>'; });
  }
  html += '</div><button class="ghost" id="backMenu">离开</button></div>';
  overlay.innerHTML = html; overlay.classList.add('show'); G.modal = 'start';
  $$('[data-bt]').forEach(function (b) { b.onclick = function () { barScreen(b.getAttribute('data-bt')); }; });
  $$('[data-drink]').forEach(function (b) { b.onclick = function () { var d = B.drinks[+b.getAttribute('data-drink')]; if (META.cores < d.cost || ST.pendingDrink) return; META.cores -= d.cost; saveMeta(); ST.pendingDrink = { name: d.name, buff: d.buff }; ST.drinks++; storySave(); sfx.pick(); barScreen('drinks'); }; });
  $$('[data-ldrink]').forEach(function (b) { b.onclick = function () { var L = ST.legends[+b.getAttribute('data-ldrink')]; if (META.cores < 40 || ST.pendingDrink) return; META.cores -= 40; saveMeta(); ST.pendingDrink = { name: L.drink, buff: 'legend' }; ST.drinks++; storySave(); sfx.pick(); barScreen('drinks'); }; });
  $('#backMenu').onclick = menuScreen;
}
function writeLegend() {
  if (G.mode !== 'normal') return null;
  var B = STORY.bar || {}, LD = B.legendDrink || { names: [], desc: [] };
  var top = null; Object.keys(G.cyber || {}).forEach(function (k) { var m = MOD_BY[G.cyber[k]]; if (m && (!top || Q_ORDER.indexOf(m.quality) > Q_ORDER.indexOf(top.quality))) top = m; });
  var o = { 'class': classDef().name, boss: G.bossName || '守卫', depth: G.depth, kills: G.kills, implant: top ? top.name : '一双空手', n: ST.wins };
  var L = { title: '第 ' + ST.wins + ' 次 · ' + o['class'], text: storyFmt(pick(B.legends && B.legends.length ? B.legends : ['{class}从井底回来了。']), o),
    drink: storyFmt(pick(LD.names && LD.names.length ? LD.names : ['{class}特调']), o), drinkDesc: storyFmt(pick(LD.desc && LD.desc.length ? LD.desc : ['']), o),
    meta: 'B' + G.depth + 'F · 击毁 ' + G.kills + ' · ' + new Date().toISOString().slice(0, 10) };
  ST.legends.push(L); if (ST.legends.length > 30) ST.legends.shift(); storySave();
  return L;
}

/* ---------- 档案界面 ---------- */
function storyLocked(text) { return '<div class="arc locked"><b>████████</b><p>' + (text || '尚未解锁') + '</p></div>'; }
function archiveScreen(tab) {
  tab = tab || 'main';
  var tabs = [['main', '主线'], ['people', '人物'], ['guard', '守卫'], ['self', '人格'], ['relic', '遗物']];
  var body = '';
  if (tab === 'main') (STORY.chapters || []).forEach(function (c, i) { body += ST.chapters[c.id] ? '<div class="arc"><small>' + String(i + 1).padStart(2, '0') + '</small><b>' + econEsc(c.title) + '</b><p>' + econEsc(c.text) + '</p></div>' : storyLocked('继续深潜'); });
  if (tab === 'people') (STORY.npcs || []).forEach(function (n) {
    var st = npcState(n.id), total = (n.stages || []).length;
    if (!st.met) { body += storyLocked('B' + n.floor + 'F'); return; }
    body += '<div class="arc" style="--ac:' + n.color + '"><small>B' + n.floor + 'F · ' + econEsc(n.title) + ' · ' + (st.done ? '完结' : st.stage + '/' + total) + '</small><b>' + econEsc(n.name) + '</b><p>' + econEsc(n.bio) + '</p>' +
      n.stages.slice(0, st.stage).map(function (t, i) { return '<p class="arc-q">' + (i + 1) + '. ' + econEsc(t) + '</p>'; }).join('') + '</div>';
  });
  if (tab === 'guard') (STORY.bosses ? Object.keys(STORY.bosses) : []).forEach(function (id) {
    var b = STORY.bosses[id], spec = (BOSSES || []).find(function (x) { return x.id === id; }) || {};
    body += ST.bosses[id] ? '<div class="arc"><small>' + econEsc(spec.name || id) + '</small><b>' + econEsc(b.title) + '</b><p>' + econEsc(b.bio) + '</p><p class="arc-q">「' + econEsc(b.death) + '」</p></div>' : storyLocked('击败' + (spec.tier ? '第 ' + spec.tier + ' 阶' : '') + '守卫');
  });
  if (tab === 'self') CLASSES.forEach(function (c) {
    var S = (STORY.classes || {})[c.id]; if (!S) return;
    var parts = (S.bio || []).map(function (t, i) { return ST.classes[c.id + ':' + i] ? '<p>' + econEsc(t) + '</p>' : '<p class="arc-lock">████ ' + (i === 0 ? '以此人格出发' : i === 1 ? '以此人格抵达 B6F' : '以此人格抵达 B11F') + '</p>'; }).join('');
    var end = ST.classes[c.id + ':end'] ? '<p class="arc-q">' + econEsc(S.ending) + '</p>' : '<p class="arc-lock">████ 以此人格完成深潜</p>';
    body += '<div class="arc" style="--ac:' + c.color + '"><small>' + c.name + '</small><b>' + econEsc(ST.classes[c.id + ':0'] ? S.title : '？？？') + '</b>' + parts + end + '</div>';
  });
  if (tab === 'relic') (STORY.relics || []).forEach(function (r) {
    var owner = (STORY.npcs || []).find(function (n) { return n.relic === r.id; });
    body += ST.relics[r.id] ? '<div class="arc" style="--ac:#fcee0a"><small>' + (SLOT_LABEL[r.slot] || r.slot) + ' · 一次性「' + econEsc(r.onceName) + '」' + (owner ? ' · 来自 ' + econEsc(owner.name) : '') + '</small><b>' + econEsc(r.name) + '</b><p>' + econEsc(r.lore) + '</p><p class="arc-q">' + RELIC_ONCE[r.once] + '</p></div>' : storyLocked(owner ? '听完 B' + owner.floor + 'F 某人的故事' : '');
  });
  var cnt = Object.keys(ST.chapters).length + '/' + (STORY.chapters || []).length;
  overlay.innerHTML = '<div class="card archive"><div class="kicker">ARCHIVE // 剧情档案 · 主线 ' + cnt + ' · 人物完结 ' + npcsDoneCount() + '/' + (STORY.npcs || []).length + '</div>' +
    '<div class="tabs">' + tabs.map(function (t) { return '<button class="tab' + (t[0] === tab ? ' on' : '') + '" data-arc="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
    '<div class="plist arc-list">' + (tab === 'main' && STORY.premise ? '<div class="arc premise"><p>' + econEsc(STORY.premise) + '</p></div>' : '') + body + '</div><button class="cta" id="backMenu">返回</button></div>';
  overlay.classList.add('show'); G.modal = 'start';
  $$('[data-arc]').forEach(function (b) { b.onclick = function () { archiveScreen(b.getAttribute('data-arc')); }; });
  $('#backMenu').onclick = menuScreen;
}
