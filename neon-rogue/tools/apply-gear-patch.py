p='game.js';s=open(p,encoding='utf8').read()
if 'GEAR_V1' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
mod=open('tools/gear-module.js',encoding='utf8').read()
anchor="/* =========================================================\n   启动"
rep(anchor,mod+"\n\n"+anchor)

# ---- crit tuning ----
rep("  if (critical) n *= 1.7 + (G.mod.critMult || 0);","  if (critical) n *= 1.5 + (G.mod.critMult || 0);")
rep("  { id: 'crit', name: '暴击芯片', stat: 'crit', val: 0.03 },","  { id: 'crit', name: '暴击芯片', stat: 'crit', val: 0.015 },\n  { id: 'critdmg', name: '爆伤芯片', stat: 'critMult', val: 0.06 },")
rep("var CHIP_PCT = { crit: 1, dodge: 1, power: 1 };","var CHIP_PCT = { crit: 1, dodge: 1, power: 1, critMult: 1 };")
rep("var CHIP_LABEL = { atk: '攻击', hp: '生命', def: '防御', crit: '暴击', dodge: '闪避', compat: '适应度', power: '义体功率', skill: '技能等级' };","var CHIP_LABEL = { atk: '攻击', hp: '生命', def: '防御', crit: '暴击', dodge: '闪避', critMult: '爆伤', compat: '适应度', power: '义体功率', skill: '技能等级' };")
rep("function chipStats() {\n  var out = { atk: 0, hp: 0, def: 0, crit: 0, dodge: 0, compat: 0, power: 0, skill: 0 };","function chipStats() {\n  var out = { atk: 0, hp: 0, def: 0, crit: 0, dodge: 0, critMult: 0, compat: 0, power: 0, skill: 0 };")
rep("function chipAggText(chips) {\n  var out = { atk: 0, hp: 0, def: 0, crit: 0, dodge: 0, compat: 0, power: 0, skill: 0 };","function chipAggText(chips) {\n  var out = { atk: 0, hp: 0, def: 0, crit: 0, dodge: 0, critMult: 0, compat: 0, power: 0, skill: 0 };")

# ---- instance stats in calcMods / load / power / compat ----
rep("""  var chips = chipStats();
  Object.keys(chips).forEach(function (key) {
    if (key === 'compat' || key === 'power' || key === 'skill') return;""","""  var ist = instStats();
  Object.keys(ist).forEach(function (key) { if (key === 'compat' || key === 'power') return; m[key] = (m[key] || 0) + ist[key] * cf; });
  var chips = chipStats();
  Object.keys(chips).forEach(function (key) {
    if (key === 'compat' || key === 'power' || key === 'skill') return;""")
rep("""    var m = MOD_BY[G.cyber[slot]];
    if (m) load += CYBER_COST[m.quality] || 1;""","""    var m = MOD_BY[G.cyber[slot]];
    if (m) load += instLoad(G.cyber[slot]);""")
rep("""      load += Math.ceil((CYBER_COST[c.quality] || 1) * 0.5 *""","""      load += (c.heavy || 0) + Math.ceil((CYBER_COST[c.quality] || 1) * 0.5 *""")
rep("function cyberPower() { return 1 + chipStats().power + ","function cyberPower() { return 1 + chipStats().power + (instStats().power || 0) + ")
rep("chipStats().compat + (G.adaptBonus || 0)","chipStats().compat + (instStats().compat || 0) + (G.adaptBonus || 0)")

# ---- create instance on gain; backpack limit ----
rep("""function applyMod(m) {
  if (m.cls && m.cls !== classDef().id) { toast('该义体不适配当前职业', 'bad'); return; }
  if (G.modBag.indexOf(m.id) >= 0) { toast('已有该义体', 'dim'); return; }
  G.modBag.push(m.id);
  var free = slotPriority(m).find(function (x) { return !G.cyber[x]; });""","""function applyMod(m) {
  if (m.cls && m.cls !== classDef().id) { toast('该义体不适配当前职业', 'bad'); return false; }
  if (G.modBag.indexOf(m.id) >= 0) { toast('已有该义体', 'dim'); return false; }
  var free = slotPriority(m).find(function (x) { return !G.cyber[x]; });
  if (!free && bagFull()) { toast('背包已满（' + bagCount() + '/' + bagCap() + '）', 'bad'); return false; }
  instOf(m.id);
  G.modBag.push(m.id);""")
rep("""      G.items.splice(i, 1);
      if (G.modBag.indexOf(it.mod.id) >= 0) { gainCredits(Math.round((RUN_CYBER_PRICE[it.mod.quality] || 20) * .4), x, y); continue; }
      applyMod(it.mod);""","""      if (G.modBag.indexOf(it.mod.id) >= 0) { G.items.splice(i, 1); gainCredits(Math.round((RUN_CYBER_PRICE[it.mod.quality] || 20) * .4), x, y); continue; }
      if (it.inst) { G.inst = G.inst || {}; G.inst[it.mod.id] = it.inst; }
      if (applyMod(it.mod) === false) { if (it.inst && G.modBag.indexOf(it.mod.id) < 0) delete G.inst[it.mod.id]; continue; }
      G.items.splice(i, 1);""")
rep("""  if (slot) { G.cyberChips[slot] = G.cyberChips[slot] || []; G.cyberChips[slot].push(c); }
  else G.chips.push(c);
}""","""  if (slot) { G.cyberChips[slot] = G.cyberChips[slot] || []; G.cyberChips[slot].push(c); }
  else if (bagFull()) { var cr = CHIP_SELL[c.quality] || 3; gainCredits(cr, null, null, true); toast('背包已满 · 芯片折现 ¥' + cr, 'warn'); }
  else G.chips.push(c);
}""")
# broken implants: no active
rep("  var a = m.active;\n  if (a.type.indexOf('relic_') === 0)","  if (instBroken(id)) { msg(modName(id) + ' 已损坏，无法启动', 'bad'); return; }\n  var a = m.active;\n  if (a.type.indexOf('relic_') === 0)")

# ---- carry-in: restore instance, return incompatible to stash ----
rep("""    (G.prepPick.stashItems || []).forEach(function (entry) {
      if (!MOD_BY[entry.id]) return;
      applyMod(MOD_BY[entry.id]);""","""    (G.prepPick.stashItems || []).forEach(function (entry) {
      if (!MOD_BY[entry.id]) return;
      G.inst = G.inst || {}; if (entry.inst) G.inst[entry.id] = entry.inst;
      if (applyMod(MOD_BY[entry.id]) === false || G.modBag.indexOf(entry.id) < 0) { META.stash.cyber.push(entry); saveMeta(); msg('「' + MOD_BY[entry.id].name + '」无法带入，已退回仓库', 'warn'); return; }""")
rep("  G.boons = []; G.modBag = []; G.cyber = {}; G.cyberChips = {}; G.chips = []; G.runMod = {};","  G.boons = []; G.modBag = []; G.cyber = {}; G.cyberChips = {}; G.chips = []; G.runMod = {}; G.inst = {};")
# ---- extraction: everything + tally ----
rep("""function extractCyber() {
  if (G.mode !== 'normal') return;""","""function extractCyber() {
  return extractAll();
}
function extractCyberLegacy() {
  if (G.mode !== 'normal') return;""")
rep("  storyEvent('win'); G.lastLegend = writeLegend();\n  extractCyber();","  storyEvent('win'); G.lastLegend = writeLegend();\n  G.lastTally = extractCyber();")
rep("  setTimeout(function () { if (G.runId === completedRun && G.state === 'win') endScreen(true, score, isBest); }, 900);",
    "  setTimeout(function () { if (G.runId !== completedRun || G.state !== 'win') return; if (G.lastTally) tallyScreen(G.lastTally, function () { endScreen(true, score, isBest); }); else endScreen(true, score, isBest); }, 900);")
# ---- wear on descent ----
rep("    storyEvent('depth', G.depth);","    storyEvent('depth', G.depth);\n    if (G.mode === 'normal') wearInstalled();")
# ---- meta: backpack node ----
rep('''  {"id": "b3a", "branch": "body", "tier": 3, "name": "骨骼强化", "desc": "起始生命 +2", "max": 3, "stat": {"hp": 2}},''','''  {"id": "b3a", "branch": "body", "tier": 3, "name": "战术背包", "desc": "局内背包容量 +2", "max": 3, "stat": {"bag": 2}},''')
# ---- doctor: repair & enhance ----
rep("""  Object.keys(G.cyber).forEach(function (sl) {
    var id = G.cyber[sl], m = MOD_BY[id]; if (!m || !m.active) return; var g = G.cyberGrowth[id] || { lv: 1 };""","""  Object.keys(G.cyber).forEach(function (sl) {
    var id = G.cyber[sl], m = MOD_BY[id], it = m && !m.relic ? instOf(id) : null; if (!it) return;
    var qc = (QUALITY[m.quality] || QUALITY.gray).color;
    if (it.dur < it.maxDur) { var rc = repairCost(it, m); html += siteRow({ name: '修复 · ' + modName(id), tag: '耐久 ' + it.dur + ' → ' + it.maxDur, desc: it.dur <= 0 ? '已损坏，修复后恢复属性与主动技能' : '恢复全部耐久', color: qc, btn: '¥' + rc, attr: 'data-rep="' + id + '"', dis: (G.credits || 0) < rc }); }
    if (it.plus < 5 && it.dur > 0) { var ec = enhanceCost(it, m); html += siteRow({ name: '强化 · ' + modName(id), tag: '成功率 ' + Math.round(ENH_RATE[it.plus] * 100) + '% · 负载 +1', desc: '成功：基础属性 +15%，耐久 -1。失败：耐久 -3', color: qc, btn: '¥' + ec, attr: 'data-enh="' + id + '"', dis: (G.credits || 0) < ec }); }
  });
  Object.keys(G.cyber).forEach(function (sl) {
    var id = G.cyber[sl], m = MOD_BY[id]; if (!m || !m.active) return; var g = G.cyberGrowth[id] || { lv: 1 };""")
rep("""  $$('[data-tune]').forEach(function (b) { b.onclick = function () {""","""  $$('[data-rep]').forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-rep'), m = MOD_BY[id], it = instOf(id), c = repairCost(it, m); if ((G.credits || 0) < c) return; G.credits -= c; it.dur = it.maxDur; recalc(); sfx.level(); toast('修复完成 · ' + modName(id), 'good'); openDoctor(s); }; });
  $$('[data-enh]').forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-enh'), m = MOD_BY[id], it = instOf(id), c = enhanceCost(it, m); if ((G.credits || 0) < c) return; G.credits -= c; var ok = enhanceInst(it, m); recalc(); if (ok) { sfx.level(); nvColumn(p.x, p.y, '#fcee0a', 4); toast('强化成功 · ' + modName(id), 'good'); } else { sfx.hurt(); G.shake = 6; toast('强化失败 · 耐久 -3', 'bad'); } openDoctor(s); }; });
  $$('[data-tune]').forEach(function (b) { b.onclick = function () {""")
# ---- names in cyber panel ----
rep("""'<div class="bl">' + sl.name + '</div><div class="bn" style="color:' + (q ? q.color : '#56606a') + '">' + (m ? m.name : '空槽') + '</di""","""'<div class="bl">' + sl.name + '</div><div class="bn" style="color:' + (q ? q.color : '#56606a') + '">' + (m ? modName(m.id) : '空槽') + (m && instBroken(m.id) ? ' ⚠' : '') + '</di""")
rep("""    '<h1 class="title small cyber-title" style="color:' + q.color + '!important">' + m.name + '</h1>' +
    '<div class="sub">' + q.name + '品质 · ' + (SLOT_LABEL[m.slot] || m.slot) + ' · 负载 ' + (CYBER_COST[m.quality] || 1) + (slot ?""","""    '<h1 class="title small cyber-title" style="color:' + q.color + '!important">' + modName(m.id) + '</h1>' +
    '<div class="sub">' + q.name + '品质 · ' + (SLOT_LABEL[m.slot] || m.slot) + ' · 负载 ' + instLoad(m.id) + ' · ' + instTag(m.id) + (slot ?""")
rep("""  var lines = cyberStatText(m);
  if (!lines.length) lines = ['无基础属性'];""","""  var lines = cyberStatText(m).concat(instLines(m.id).map(function (t) { return '<span style="color:#ffd166">' + t + '</span>'; }));
  if (!lines.length) lines = ['无基础属性'];""")
rep("""    bag.forEach(function (id) { var m = MOD_BY[id], q = QUALITY[m.quality]; html += siteRow({ name: m.name, tag: q.name + ' · 背包义体',""","""    bag.forEach(function (id) { var m = MOD_BY[id], q = QUALITY[m.quality]; html += siteRow({ name: modName(id), tag: q.name + ' · 背包义体 · ' + instTag(id),""")
# reforge: new implant gets a fresh instance (old one discarded)
rep("  G.modBag.push(nm.id); installCyber(nm.id, slot);","  delete (G.inst || {})[oldId]; G.modBag.push(nm.id); instOf(nm.id); installCyber(nm.id, slot);")
open(p,'w',encoding='utf8').write(s)
print('gear patch applied')
