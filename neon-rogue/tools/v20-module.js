/* =========================================================
   V20 · 个人面板 / 整合义体中心 / 芯片词条品质 / 强化与重铸界面 / 量产义体
   ========================================================= */
/* ---------- 量产义体 ---------- */
(function () {
  var SER = [
    ['eye', '量产型光学镜', { vision: 1 }, 'gray'], ['eye', '量产型测距仪', { crit: .02 }, 'gray'], ['eye', '街头夜视镜', { vision: 1, dodge: .01 }, 'green'], ['eye', '外卖员导航眼', { dodge: .03 }, 'green'], ['eye', '保安巡逻镜', { crit: .03, vision: 1 }, 'blue'],
    ['hand', '量产型握力臂', { atk: 1 }, 'gray'], ['hand', '码头吊钩手', { atk: 1, maxHp: 3 }, 'gray'], ['hand', '外包焊接臂', { atk: 2 }, 'green'], ['hand', '出租车司机腕', { atk: 1, dodge: .02 }, 'green'], ['hand', '保安防暴臂', { atk: 2, def: 1 }, 'blue'],
    ['body', '量产型护板', { def: 1 }, 'gray'], ['body', '外卖保温背甲', { maxHp: 6 }, 'gray'], ['body', '工地缓冲层', { def: 1, maxHp: 4 }, 'green'], ['body', '夜班护工外骨骼', { maxHp: 10 }, 'green'], ['body', '保安凯夫拉衬', { def: 2, maxHp: 6 }, 'blue'],
    ['spine', '量产型脊撑', { maxHp: 4 }, 'gray'], ['spine', '流水线稳定器', { def: 1 }, 'gray'], ['spine', '快递员减震脊', { dodge: .02, maxHp: 3 }, 'green'], ['spine', '夜班兴奋泵', { atk: 1, crit: .01 }, 'green'], ['spine', '安保反射总线', { dodge: .03, def: 1 }, 'blue'],
    ['leg', '量产型步行腿', { dodge: .01 }, 'gray'], ['leg', '外卖员快腿', { dodge: .02 }, 'gray'], ['leg', '工地液压胫', { def: 1, maxHp: 3 }, 'green'], ['leg', '跑酷改装腿', { dodge: .03 }, 'green'], ['leg', '巡警追捕腿', { dodge: .03, atk: 1 }, 'blue']
  ];
  var L = { atk: '攻击', maxHp: '生命', def: '防御', crit: '暴击', dodge: '闪避', vision: '视野' };
  SER.forEach(function (r, i) {
    var id = 'mass_' + i; if (MOD_BY[id]) return;
    var desc = Object.keys(r[2]).map(function (k) { var v = r[2][k]; return L[k] + ' +' + (v < 1 ? Math.round(v * 100) + '%' : v); }).join('，');
    var m = { id: id, slot: r[0], quality: r[3], name: r[1], color: (QUALITY[r[3]] || QUALITY.gray).color, desc: desc, stats: r[2], mass: true,
      lore: '流水线上的货，编号和你身上那件差不多。椰汁城一半的人都装着它的同款，坏了也没人心疼。' };
    MODS.push(m); MOD_BY[id] = m;
  });
})();

/* ---------- 芯片：词条品质 ---------- */
function chipAffixQ(q) {
  var qi = Math.max(0, Q_ORDER.indexOf(q)), r = Math.pow(Math.random(), 1.6);
  return Q_ORDER[Math.min(qi, Math.floor(r * (qi + 1)))];
}
function chipJitter(stat, v) { var k = .85 + Math.random() * .3; return CHIP_INT[stat] ? Math.max(1, Math.round(v * k)) : Math.max(.01, Math.round(v * k * 100) / 100); }
function rollChipAffixes(c, keepStat) {
  var n = c.quality === 'red' || c.quality === 'orange' ? 2 : c.quality === 'purple' || c.quality === 'blue' ? 1 : 0;
  var pool = CHIPS.filter(function (x) { return x.stat !== c.stat; }), out = [];
  for (var i = 0; i < n; i++) { var a = pick(pool), aq = chipAffixQ(c.quality); out.push({ id: a.id, name: a.name, stat: a.stat, quality: aq, val: a.stat === 'skill' ? 1 : chipJitter(a.stat, chipRoll(a.stat, a.val, CHIP_MULT[aq] || 1, true)) }); pool = pool.filter(function (x) { return x.stat !== a.stat; }); }
  return out;
}
function chipAffixHTML(a) {
  var q = QUALITY[a.quality] || QUALITY.gray;
  return '<span class="caf" style="--cq:' + q.color + '"><i>' + q.name + '</i>' + (CHIP_LABEL[a.stat] || a.name) + ' +' + chipFmt(a.stat, a.val) + '</span>';
}
function chipHTML(c) {
  return '<div class="chipcard" style="--cq:' + c.color + '"><b>' + econEsc(c.grade + '·' + c.name) + '</b><span class="cmain">' + (CHIP_LABEL[c.stat] || c.stat) + ' +' + chipFmt(c.stat, c.val) + '</span>' + (c.affixes || []).map(chipAffixHTML).join('') + (c.heavy ? '<span class="caf heavy">重改 +' + c.heavy + ' 负载</span>' : '') + '</div>';
}

/* ---------- 芯片重铸（洗练词条）界面 ---------- */
function chipForgeScreen(c, o) {
  // o: { cost: '¥12', can: fn, pay: fn, back: fn, title }
  showModal('chipforge');
  var html = '<div class="card forge chipforge" style="--fq:' + c.color + '"><div class="kicker">CHIP REFORGE // 词条重铸</div><h1 class="title small">' + econEsc(c.grade + '·' + c.name) + '</h1>' +
    '<div class="forge-stage"><div class="forge-ring"></div><div class="forge-chip">' + chipHTML(c) + '</div></div>' +
    '<div class="hint">主词条不变。附加词条重新随机：种类、品质（不超过芯片品质）、数值都会变。洗完可以选保留新的还是原来的。</div>' +
    '<div class="dock"><button class="ghost" id="cfBack">返回</button><button class="cta" id="cfGo"' + (o.can() ? '' : ' disabled') + '>重铸 · ' + o.cost + '</button></div></div>';
  overlay.innerHTML = html;
  $('#cfBack').onclick = o.back;
  $('#cfGo').onclick = function () {
    if (!o.can()) return; o.pay();
    var old = JSON.parse(JSON.stringify(c.affixes || [])), neu = rollChipAffixes(c), stage = overlay.querySelector('.forge-stage'), chipEl = overlay.querySelector('.forge-chip');
    stage.classList.add('spinning'); $('#cfGo').disabled = true; $('#cfBack').disabled = true;
    var t0 = performance.now(), dur = VFX.reduced ? 0 : 1100;
    (function roll() {
      var u = (performance.now() - t0) / Math.max(1, dur);
      if (u < 1) { var fake = { stat: c.stat, val: c.val, grade: c.grade, name: c.name, color: c.color, affixes: rollChipAffixes(c) }; chipEl.innerHTML = chipHTML(fake); beep(600 + Math.random() * 600, .02, 'square', .01); requestAnimationFrame(function () { setTimeout(roll, 40 + u * 120); }); return; }
      stage.classList.remove('spinning'); stage.classList.add('done');
      var best = neu.reduce(function (s, a) { return Math.max(s, Q_ORDER.indexOf(a.quality)); }, 0);
      stage.style.setProperty('--fq', (QUALITY[Q_ORDER[best]] || QUALITY.gray).color);
      sfx.level();
      var cmp = '<div class="forge-cmp"><div><small>原来</small>' + (old.map(chipAffixHTML).join('') || '<span class="caf">无</span>') + '</div><div class="new"><small>新的</small>' + neu.map(chipAffixHTML).join('') + '</div></div>';
      chipEl.innerHTML = chipHTML({ stat: c.stat, val: c.val, grade: c.grade, name: c.name, color: c.color, affixes: neu }) + cmp;
      var dock = overlay.querySelector('.dock');
      dock.innerHTML = '<button class="ghost" id="cfKeep">保留原来的</button><button class="cta" id="cfTake">用新的</button>';
      $('#cfKeep').onclick = function () { recalc(); chipForgeScreen(c, o); };
      $('#cfTake').onclick = function () { c.affixes = neu; recalc(); if (typeof saveMeta === 'function') saveMeta(); chipForgeScreen(c, o); };
    })();
  };
}

/* ---------- 义体强化界面 ---------- */
function enhanceScreen(id, it, o) {
  // o: { cost(it), can(it), pay(it), back, unit }
  var m = MOD_BY[id], q = QUALITY[m.quality] || QUALITY.gray;
  showModal('enhance');
  var rate = it.plus < 5 ? ENH_RATE[it.plus] : 0, cost = o.cost(it);
  var stats = Object.keys(m.stats || {}).map(function (k) { var v = m.stats[k], now = v * (1 + .15 * it.plus), nx = v * (1 + .15 * (it.plus + 1)); var f = function (x) { return v < 1 ? Math.round(x * 100) + '%' : Math.round(x); }; return '<div class="en-row"><span>' + (INST_LABEL[k] || k) + '</span><b>' + f(now) + '</b><i>→</i><em>' + f(nx) + '</em></div>'; }).join('');
  var html = '<div class="card forge enh" style="--fq:' + q.color + '"><div class="kicker">AUGMENT // 义体强化</div><h1 class="title small" style="color:' + q.color + '">' + econEsc(it.name) + '</h1>' +
    '<div class="forge-stage enh-stage"><div class="forge-ring" style="--rate:' + Math.round(rate * 100) + '"></div><div class="en-plus"><small>强化</small><b>+' + it.plus + '</b><span>成功率 ' + Math.round(rate * 100) + '%</span></div></div>' +
    durBarOf(it, true) + '<div class="en-stats">' + (stats || '<div class="hint">没有基础属性</div>') + '<div class="en-row"><span>负载</span><b>' + ((CYBER_COST[m.quality] || 1) + it.plus + (it.heavy || 0)) + '</b><i>→</i><em class="up">' + ((CYBER_COST[m.quality] || 1) + it.plus + 1 + (it.heavy || 0)) + '</em></div></div>' +
    '<div class="hint">成功：基础属性 +15%，耐久 -1，负载 +1。失败：耐久 -3。耐久归零就损坏。</div>' +
    '<div class="dock"><button class="ghost" id="enBack">返回</button><button class="cta" id="enGo"' + (it.plus < 5 && it.dur > 0 && o.can(it) ? '' : ' disabled') + '>' + (it.plus >= 5 ? '已满级' : it.dur <= 0 ? '已损坏' : '强化 · ' + cost + ' ' + o.unit) + '</button></div></div>';
  overlay.innerHTML = html;
  $('#enBack').onclick = o.back;
  $('#enGo').onclick = function () {
    if (!o.can(it) || it.plus >= 5 || it.dur <= 0) return; o.pay(it);
    var stage = overlay.querySelector('.forge-stage'); stage.classList.add('charging'); $('#enGo').disabled = true; $('#enBack').disabled = true;
    var t0 = performance.now(), dur = VFX.reduced ? 0 : 900;
    (function charge() { var u = (performance.now() - t0) / Math.max(1, dur); if (u < 1) { beep(200 + u * 700, .03, 'sawtooth', .012); setTimeout(charge, 70); return; }
      var ok = enhanceInst(it, m); recalc(); if (typeof saveMeta === 'function') saveMeta();
      stage.classList.remove('charging'); stage.classList.add(ok ? 'success' : 'fail');
      if (ok) { sfx.level(); if (G.state === 'play' && p) nvColumn(p.x, p.y, '#fcee0a', 4); } else { sfx.hurt(); var c = overlay.querySelector('.card'); if (c && c.animate) c.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 260 }); }
      overlay.querySelector('.en-plus').innerHTML = '<small>' + (ok ? '成功' : '失败') + '</small><b>+' + it.plus + '</b><span>' + (ok ? '属性提升' : '耐久 -3') + '</span>';
      setTimeout(function () { enhanceScreen(id, it, o); }, VFX.reduced ? 0 : 900);
    })();
  };
}

/* ---------- 个人面板 ---------- */
function pct(v) { return Math.round(v * 100) + '%'; }
function statsPanelHTML() {
  var cls = classDef(), sp = G.spec ? (SPECS[cls.id] || []).find(function (x) { return x.id === G.spec; }) : null;
  var crit = Math.min(1, (G.mod.crit || 0) + buffStat('crit') * .01), cm = 1.5 + (G.mod.critMult || 0), dodge = .08 + (G.mod.dodge || 0) + buffStat('dodge') * .01;
  var row = function (k, v, hint) { return '<div class="st-row"><span>' + k + '</span><b>' + v + '</b>' + (hint ? '<small>' + hint + '</small>' : '') + '</div>'; };
  var h = '<div class="st-head"><b style="color:' + cls.color + '">' + (G.mode === 'dream' && G.dream ? G.dream.who : cls.name) + (sp ? ' · ' + sp.name : '') + '</b><span>Lv.' + p.level + ' · 经验 ' + p.xp + '/' + p.next + '</span></div>';
  h += '<div class="loot-h">属性</div><div class="st-grid">' +
    row('生命', p.hp + ' / ' + p.maxHp) + row('攻击', Math.round(effAtk())) + row('防御', Math.round(effDef()), '每次受击 -' + Math.round(effDef())) +
    row('暴击率', pct(crit)) + row('暴击伤害', pct(cm)) + row('闪避', pct(Math.min(.9, dodge))) +
    row('吸血', pct(G.mod.lifesteal || 0)) + row('反伤', G.mod.thorns || 0) + row('残血增伤', pct(G.mod.execute || 0), '对 35% 以下目标') +
    row('视野', visionR()) + row('连击', G.combo ? 'x' + G.combo : '—', comboMul() > 1 ? '伤害 ×' + comboMul().toFixed(2) : '') + row('受到伤害', '×' + econDamageTakenMul().toFixed(2)) + '</div>';
  var cf = cyberFactor(), S = CHROME_STATES[chromeState()];
  h += '<div class="loot-h">义体</div><div class="st-grid">' + row('状态', '<span style="color:' + S.color + '">' + S.name + '</span>') + row('负载 / 适应度', cyberLoad() + ' / ' + adaptationCap()) + row('义体效能', pct(cf)) +
    row('主动功率', pct(cyberPower())) + row('发作率', pct(cyberPsychosisChance()), '每次受击') + row('背包', bagLoad() + ' / ' + bagCap()) + '</div>';
  // 攻击详情
  var atk = [];
  var mw = meleeWeapon();
  if (mw && mw.melee) { meleeStages(mw.melee).forEach(function (st, i) { atk.push(['近战 · ' + (st.note || mw.name), Math.round(effAtk() * (st.mult || 1)) + (mw.melee.charge || mw.melee.type === 'charge' ? '（蓄满 ×' + (1 + ((mw.melee.charge && mw.melee.charge.gain) || .6) * ((mw.melee.charge && mw.melee.charge.max) || 3)).toFixed(1) + '）' : ''), (st.range || 1) + ' 格 · ' + ({ sweep: '横扫', line: '直线', slam: '重击', point: '单体' }[st.shape || 'point'] || '')]); }); }
  else atk.push(['普通攻击', Math.max(1, Math.round(effAtk())), '相邻 1 格']);
  if (cls.id === 'assault') atk.push(['射击', Math.round(gunBase() * comboMul()) + (gunLvl('double') ? ' ×2 发' : ''), '7 格 · 弹匣 ' + G.ammo + '/' + G.ammoMax + ' · 换弹 ' + reloadTurns() + ' 回合']);
  if (cls.id === 'engineer') { atk.push(['机甲激光', Math.round(effAtk() * 2), '驾驶机甲时']); atk.push(['机甲维持', mechUpkeep() + ' 废料/回合', '废料 ' + G.scrap]); }
  if (cls.id === 'ghost') (GHOST_ACTS[ghostBand() === 'over' ? 'high' : ghostBand()] || []).forEach(function (a) { var dm = a.hack ? HACK_INFO[a.k] : Math.round(ghostRawDamage(a.k, { marks: 1 })); atk.push([a.n, dm, '临界 +' + a.cost]); });
  Object.keys(G.cyber).forEach(function (sl) { var id = G.cyber[sl], m = MOD_BY[id]; if (!m || !m.active) return; if (m.relic) { atk.push(['遗物 · ' + m.active.name, (G.relicUsed || {})[id] ? '已用' : '可用', activeDesc(m)]); return; }
    var lv = Math.min(8, ((G.cyberGrowth[id] || {}).lv || 1) + chipStats().skill), base = Math.round(effAtk() * (1.8 + lv * .3) * cyberFactor() * cyberPower() * (m.active.type === 'cleave' || m.active.type === 'cleave_bleed' ? 1.4 : 1));
    atk.push([m.active.name + ' L' + lv, base, '冷却 ' + m.active.cd + (G.cyberCd[id] ? ' · 剩 ' + G.cyberCd[id] : ' · 就绪') + (instBroken(id) ? ' · 已损坏' : '')]); });
  h += '<div class="loot-h">攻击与技能</div><div class="st-list">' + atk.map(function (a) { return '<div class="st-atk"><b>' + a[0] + '</b><span>' + a[1] + '</span><small>' + a[2] + '</small></div>'; }).join('') + '</div>';
  // 状态
  var tags = [];
  (p.buffs || []).forEach(function (b) { var d = b.def || BUFF[b.id] || {}; tags.push({ n: (d.name || b.id) + (b.pool ? ' ' + b.pool : ''), t: b.turns, c: d.kind === 'dot' ? 'bad' : 'good', d: d.desc || '' }); });
  var st = [[G.stealth > 0 || G.ghostStealth > 0, '隐身', Math.max(G.stealth || 0, G.ghostStealth || 0), 'good'], [G.freeze > 0, '时停', G.freeze, 'good'], [G.psycho > 0, '失控', G.psycho, 'bad'], [G.reload, '换弹中', G.reload && G.reload.turns, 'warn'], [G.mech > 0, '驾驶机甲', G.mech, 'good'], [G.mechCool > 0, '机甲冷却', G.mechCool, 'warn'], [G.stance, '蓄势', G.stance && G.stance.turns, 'good'],
    [G.purgeT > 0, '净化', G.purgeT, 'good'], [G.decoyT > 0, '分身', G.decoyT, 'good'], [G.mirrorT > 0, '反弹', G.mirrorT, 'good'], [G.ghostRunT > 0, '穿墙无敌', G.ghostRunT, 'good'], [G.jukeT > 0, '最后一首', G.jukeT, 'good'], [G.lastDayT > 0, '多一天', G.lastDayT, 'good'], [G.bloodHits > 0, '醉刀', G.bloodHits + ' 刀', 'good'], [G.burnout, '过热烧毁', '', 'bad']];
  st.forEach(function (x) { if (x[0]) tags.push({ n: x[1], t: x[2], c: x[3] }); });
  h += '<div class="loot-h">状态与增益</div><div class="st-tags">' + (tags.map(function (t) { return '<span class="st-tag ' + t.c + '" title="' + econEsc(t.d || '') + '">' + econEsc(t.n) + (t.t !== '' && t.t != null ? '<i>' + t.t + '</i>' : '') + '</span>'; }).join('') || '<span class="hint">没有</span>') + '</div>';
  // 诅咒与负面
  var cur = [];
  if (G.curse && (G.curse.enemyAtk || G.curse.enemyHp)) cur.push(['违约诅咒', '敌人攻击 +' + (G.curse.enemyAtk || 0) + ' · 敌人生命 +' + pct(G.curse.enemyHp || 0)]);
  (G.boons || []).forEach(function (id) { var b = BOONS.find(function (x) { return x.id === id; }); if (b && b.bad && Object.keys(b.bad).length) cur.push([b.name, Object.keys(b.bad).map(function (k) { return boonLine(k, b.bad[k]); }).join(' · ')]); });
  (contractActive ? contractActive() : []).forEach(function (c) { (c.def.terms || []).forEach(function (t) { cur.push(['委托条款 · ' + c.def.name, (TERM_INFO && TERM_INFO[t] ? TERM_INFO[t].name || t : t)]); }); });
  if (G.chal && G.chal.names && G.chal.names.length) cur.push(['挑战树', G.chal.names.join(' / ')]);
  if (G.anomaly && ANOMALIES[G.anomaly]) cur.push(['区域异常 · ' + ANOMALIES[G.anomaly].name, ANOMALIES[G.anomaly].desc]);
  if (cyberOverload() > 0) cur.push(['过载', '效能 ' + pct(cf) + ' · 受击发作率 ' + pct(cyberPsychosisChance())]);
  Object.keys(G.cyber).forEach(function (sl) { if (instBroken(G.cyber[sl])) cur.push(['损坏', modName(G.cyber[sl]) + ' 不提供属性']); });
  h += '<div class="loot-h">诅咒与负面</div><div class="st-list">' + (cur.map(function (c) { return '<div class="st-atk bad"><b>' + econEsc(c[0]) + '</b><small>' + econEsc(c[1]) + '</small></div>'; }).join('') || '<div class="hint">干干净净</div>') + '</div>';
  return h;
}
/* ---------- 义体中心：角色 / 义体 / 背包 ---------- */
function hubBar(active) {
  return '<div class="hubbar">' + [['stats', '角色'], ['cyber', '义体'], ['bag', '背包 ' + bagLoad() + '/' + bagCap()]].map(function (t) { return '<button class="hubtab' + (t[0] === active ? ' on' : '') + '" data-hub="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
}
function bindHub() { $$('[data-hub]').forEach(function (b) { b.onclick = function () { openHub(b.getAttribute('data-hub')); }; }); }
function openHub(tab) {
  if (G.state !== 'play' || psychoActive()) return;
  G.hubTab = tab;
  if (tab === 'cyber') { G.cyberTab = 'map'; G.cyberItem = null; showModal('cyber'); renderCyber(); return; }
  if (tab === 'bag') { openBag(); return; }
  showModal('stats');
  overlay.innerHTML = '<div class="card statsp"><div class="kicker">OPERATOR // 个人面板</div>' + hubBar('stats') + statsPanelHTML() + '<div class="dock"><button class="cta" id="statsClose">返回战斗</button></div></div>';
  bindHub(); $('#statsClose').onclick = function () { hideOverlay(); G.paused = false; updateHUD(); };
}
/* ---------- 换装 ---------- */
function bagFor(slot) { return G.modBag.filter(function (id) { var m = MOD_BY[id]; return m && !cyberInstalledSlot(id) && slotAccepts(m, slot); }); }
function bestSlotFor(m) { var sl = CYBER_SLOTS.filter(function (s) { return slotAccepts(m, s.id); }); return (sl.find(function (s) { return !G.cyber[s.id]; }) || sl[0] || {}).id; }
function equipListHTML(slot, title) {
  var ids = bagFor(slot);
  return '<div class="cx-h" style="text-align:left;margin-top:8px">' + title + '</div><div class="eq-grid">' + (ids.map(function (id) { var m = MOD_BY[id], q = QUALITY[m.quality] || QUALITY.gray;
    return '<button class="eq-card" data-eqto="' + slot + '|' + id + '" style="--it:' + q.color + '"><b>' + econEsc(modName(id)) + '</b><small>' + q.name + ' · 负载 ' + instLoad(id) + '</small>' + durBar(id) + '<em>' + econEsc(m.desc) + '</em></button>'; }).join('') || '<div class="hint" style="grid-column:1/-1">背包里没有能装在这里的义体</div>') + '</div>';
}
function bindEquipList() { $$('[data-eqto]').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-eqto').split('|'); installCyber(v[1], v[0]); G.cyberItem = null; G.cyberSlotPick = null; renderCyber(); }; }); }
