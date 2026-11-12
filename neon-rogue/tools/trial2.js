var TRIAL_CHIPS = { dome: { core: ['compat', ['def', 'hp']], fill: ['def', ['hp', 'compat']] }, kharon: { core: ['critMult', ['atk', 'crit']], fill: ['atk', ['crit', 'critMult']] }, mobius: { core: ['power', ['hp', 'dodge']], fill: ['hp', ['power', 'dodge']] } };
function fixedChip(stat, q, affixStats, corp) {
  var base = CHIPS.find(function (x) { return x.stat === stat; }) || CHIPS[0], mult = CHIP_MULT[q] || 1, qq = QUALITY[q] || QUALITY.gray;
  var own = corp && CORP_CHIP[corp].stat === stat, n = q === 'red' || q === 'orange' ? 2 : q === 'purple' || q === 'blue' ? 1 : 0;
  return { id: base.id, name: own ? CORP_CHIP[corp].name : '体验·' + base.name, stat: stat, val: chipRoll(stat, own ? CORP_CHIP[corp].val : base.val, mult, false), quality: q, grade: qq.name, color: own ? CORPS[corp].color : qq.color, corp: own ? corp : undefined, trialChip: true,
    affixes: affixStats.slice(0, n).map(function (st) { var a = CHIPS.find(function (x) { return x.stat === st; }) || CHIPS[0]; return { id: a.id, name: a.name, stat: st, quality: q, val: chipRoll(st, a.val, mult, true) }; }) };
}
function trialBegin(corp, q) {
  if (G.trialKit) trialEnd(null);
  var map = { eye: 'eyeL', eye2: 'eyeR', hand: 'handL', hand2: 'handR', body: 'body', spine: 'spine', leg: 'legL', leg2: 'legR' };
  var saved = [], ids = [];
  G.trialKit = { corp: corp, q: q, ids: ids, saved: saved, loadMul: 1, powerMul: 1 };
  var T = TRIAL_CHIPS[corp];
  CORP_MODS.filter(function (d) { return d.corp === corp && d.q === q; }).forEach(function (d) {
    var slot = map[d.slot]; if (!slot) return;
    if (G.cyber[slot]) { var old = G.cyber[slot]; saved.push({ slot: slot, id: old, chips: (G.cyberChips[slot] || []).slice() }); applyModStats(MOD_BY[old], -1); delete G.mods[old]; delete G.cyber[slot]; G.cyberChips[slot] = []; }
    if (G.modBag.indexOf(d.id) >= 0) return;
    G.modBag.push(d.id); G.inst = G.inst || {}; var pl = G.plainInst; G.plainInst = true; G.inst[d.id] = rollInst(MOD_BY[d.id], {}); G.plainInst = pl;
    G.inst[d.id].origin = '体验装'; G.inst[d.id].name = MOD_BY[d.id].name;
    G.cyber[slot] = d.id; G.mods[d.id] = 1; applyModStats(MOD_BY[d.id], 1);
    G.cyberChips[slot] = [fixedChip(T.core[0], q, T.core[1], corp)];
    ids.push(d.id);
  });
  // 芯片插满：适应度不够先插兼容芯片，刚好补齐为止；还不够才降功率
  recalc();
  var slots = ids.map(function (id) { return cyberInstalledSlot(id); }).filter(Boolean), cap = (QUALITY[q] || QUALITY.gray).slots, more = true, guard = 0;
  while (more && guard++ < 12) {
    more = false;
    slots.forEach(function (sl) {
      var arr = G.cyberChips[sl]; if (arr.length >= cap) return; more = true;
      var deficit = cyberLoad() - adaptationCap();
      arr.push(deficit > 0 ? fixedChip('compat', q, ['compat', 'hp'], corp === 'dome' ? corp : null) : fixedChip(T.fill[0], q, T.fill[1], null));
      recalc();
    });
  }
  var L = cyberLoad(), Cp = adaptationCap();
  if (L > Cp) { G.trialKit.loadMul = Math.max(.1, Cp / L); G.trialKit.powerMul = G.trialKit.loadMul; msg('适应度不够：体验装降功率运行（' + Math.round(G.trialKit.powerMul * 100) + '%），不会过载', 'warn'); }
  recalc(); updateHUD();
}
