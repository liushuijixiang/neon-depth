/* =========================================================
   V34 · 委托可完成性 / 新委托 / NPC 决斗配装 / 一键配装 / 老韩 / 杂项
   ========================================================= */
/* ---------- 委托 ---------- */
var TRIAL_KINDS = ['elite', 'timed', 'pristine', 'bounty', 'horde'];
function placeTrialSite() {
  var sp = guaranteeSpot(); if (!sp) return false;
  G.sites.push({ type: 'trial', x: sp.x, y: sp.y, used: false, seed: Math.random() * TAU, data: { kind: pick(G.depth >= 3 ? TRIAL_KINDS : TRIAL_KINDS.slice(0, 4)) } });
  msg('中间人：「挑战终端给你挪过来了，在这层。」', 'dim'); return true;
}
function contractFloorsLeft(c) {
  var last = c.def.deadline === 'floor' ? c.accDepth : c.def.deadline === 'floors2' ? c.accDepth + 1 : 99, out = [];
  for (var d = G.depth; d <= Math.min(last, MAX_DEPTH); d++) out.push(d);
  return out;
}
function contractReroll(c, why) {
  var pool = shuffle(QUESTS.filter(function (q) { return q.tier === c.tier && q.type !== c.def.type && q.type !== 'challenge' && contractFeasible(q); }));
  if (!pool.length) { contractFail(c, why || '无法完成'); return; }
  var n = makeContract(pool[0]); ['uid', 'stake'].forEach(function (k) { n[k] = c[k]; });
  Object.keys(c).forEach(function (k) { delete c[k]; }); Object.assign(c, n);
  c.accDepth = G.depth; c.accTurn = G.turn; c.dmgBase = G.floorDamage || 0;
  msg('中间人：「' + (why || '计划有变') + '，原来那单做不成了。换一单：' + c.def.name + '。」', 'warn'); toast('委托改为 · ' + c.def.name, 'warn');
}
function contractRecheck() {
  if (G.mode !== 'normal') return;
  contractActive().forEach(function (c) {
    var t = c.def.type, left = contractFloorsLeft(c).filter(function (d) { return !isBossFloor(d); });
    if (t === 'challenge' && c.progress < c.target && !left.length) contractReroll(c, '挑战房在守卫层开不了');
    else if ((t === 'beacons' || t === 'chests' || t === 'killCorp' || t === 'ambush') && !left.length) contractReroll(c, '守卫层做不了这单');
  });
}
function contractEnsure2() {
  if (G.mode !== 'normal' || isBossFloor(G.depth)) return;
  contractActive().forEach(function (c) {
    var t = c.def.type, need = c.target - c.progress, i;
    if (t === 'challenge' && !(G.sites || []).some(function (s) { return s.type === 'trial' && !s.used; })) placeTrialSite();
    else if (t === 'useItem') { var have = G.inv.length + G.items.filter(function (it) { return it.cons; }).length; for (i = have; i < need; i++) { var sp = guaranteeSpot(); if (sp) G.items.push({ x: sp.x, y: sp.y, cons: pickConsumable(G.depth), seed: 0 }); } }
    else if (t === 'killCorp') { var cu = G.enemies.filter(function (e) { return e.corpKit && e.corpKit.corp && !e.neutral && e.hp > 0; }).length, corp = pick(Object.keys(CORPS)); for (i = cu; i < need; i++) { var s2 = guaranteeSpot(); if (s2) corpSpawn(CORP_UNIT[corp], s2.x, s2.y, G.depth); } }
    else if (t === 'chests') { var ch = G.items.filter(function (it) { return it.chest; }).length; for (i = ch; i < need; i++) { var s3 = guaranteeSpot(); if (s3) dropChest(s3.x, s3.y, 'common', {}); } }
    else if (t === 'beacons') { var rl = (G.sites || []).filter(function (s) { return s.type === 'relay' && !s.used; }).length; for (i = rl; i < need; i++) { var s4 = guaranteeSpot(); if (s4) G.sites.push({ type: 'relay', x: s4.x, y: s4.y, used: false, seed: 0, data: { uid: c.uid } }); } }
    else if (t === 'ambush') { var un = G.enemies.filter(function (e) { return e.hp > 0 && !e.alerted && !e.structure && !e.boss; }).length; for (i = un; i < need; i++) guaranteeSpawn(); }
    else if (t === 'corpVip' && !G.enemies.some(function (e) { return e.vip && e.hp > 0; })) { var s5 = guaranteeSpot(); if (s5) { var v = spawnCorpVip(pick(Object.keys(CORPS)), s5.x, s5.y, G.depth, 2); if (v) { v.contractUid = c.uid; msg('名单上的人在这层：' + v.name, 'warn'); } } }
  });
}
function openRelay(s) {
  if (s.used) return; s.used = true; nvColumn(s.x, s.y, '#9fe9ff', 4); sfx.pick(); toast('中继接通', 'good'); contractEvent('beacon'); hideOverlay(); updateHUD(); econResume();
}
function contractEvent2(type, e) {
  if (G.mode !== 'normal') return;
  contractActive().forEach(function (c) {
    var t = c.def.type;
    if (type === 'kill' && e) {
      if (t === 'ambush' && e._ambushT === G.turn) contractProgress(c);
      if (t === 'noSkill' && !isBossFloor(G.depth) && !G.enemies.some(function (o) { return o.hp > 0 && !o.summoned && !o.structure && !o.neutral; })) { c.progress = 1; contractComplete(c); }
    }
    else if (type === 'corpKill' && t === 'killCorp') contractProgress(c);
    else if (type === 'chest' && t === 'chests') contractProgress(c);
    else if (type === 'beacon' && t === 'beacons') contractProgress(c);
    else if (type === 'vip' && t === 'corpVip') contractProgress(c);
    else if (type === 'skill' && t === 'noSkill' && c.accDepth === G.depth) contractFail(c, '用了义体技能');
  });
}
/* ---------- NPC 决斗：按同层玩家的常见配装 ---------- */
var DUEL_KITS = { charger: ['blink', 'cleave_bleed', 'grow'], turret: ['beam', 'multi', 'shield'], chase: ['cleave', 'sandevistan', 'grow'], tank: ['shield', 'burst', 'grow'], summoner: ['drone', 'beam', 'shield'], exploder: ['burst', 'blink', 'grow'], healer: ['shield', 'beam', 'drone'] };
function duelBuild(n, d) {
  var lv = 1 + Math.round(d * 1.3), hp = 38 + (lv - 1) * 5 + d * 7, atk = 5 + Math.floor(lv / 2) + Math.round(d * 1.1);
  var qi = Math.min(5, 1 + Math.floor(d / 3)), types = DUEL_KITS[(n.duel && n.duel.ai) || 'chase'] || DUEL_KITS.chase;
  var mods = types.map(function (ty) { var pool = MODS.filter(function (m) { return m.active && m.active.type === ty && !m.relic && !m.corp && Math.abs(Q_ORDER.indexOf(m.quality) - qi) <= 1; }); return pool.length ? pick(pool).id : null; }).filter(Boolean);
  return { hp: Math.round(hp * 2.4), atk: atk, def: 1 + Math.floor(d / 3), mods: mods, dodge: Math.min(.3, .05 + d * .015) };
}
function corpKitOf(e) { return e.corpKit || e.npcKit; }
/* ---------- 一键配装 ---------- */
function autoLoadout() {
  if (G.state !== 'play') return;
  var cap = adaptationCap(), owned = G.modBag.filter(function (id) { var m = MOD_BY[id]; return m && !isTrial(id) && !(m.cls && m.cls !== classDef().id) && !instBroken(id); });
  var score = function (id) { var m = MOD_BY[id], it = (G.inst || {})[id] || {}, st = 0; Object.keys(m.stats || {}).forEach(function (k) { var v = m.stats[k]; st += v < 1 ? v * 100 : v; }); return Q_ORDER.indexOf(m.quality) * 20 + (it.plus || 0) * 6 + st + (m.active ? 8 : 0); };
  // 卸下所有非体验装
  G._installing = true;
  Object.keys(G.cyber).forEach(function (sl) { if (!isTrial(G.cyber[sl])) { var id = G.cyber[sl]; (G.cyberChips[sl] || []).forEach(function (c) { G.chips.push(c); }); G.cyberChips[sl] = []; applyModStats(MOD_BY[id], -1); delete G.mods[id]; delete G.cyber[sl]; } });
  G._installing = false; recalc();
  owned.sort(function (a, b) { return score(b) - score(a); }).forEach(function (id) {
    if (cyberInstalledSlot(id)) return;
    var m = MOD_BY[id], sl = slotPriority(m).find(function (x) { return !G.cyber[x]; }); if (!sl) return;
    if (cyberLoad() + instLoad(id) > cap) return;
    G.cyber[sl] = id; G.mods[id] = 1; G.cyberChips[sl] = []; applyModStats(m, 1);
  });
  // 芯片：品质高的先镶，不超载
  var chips = G.chips.slice().sort(function (a, b) { return Q_ORDER.indexOf(b.quality) - Q_ORDER.indexOf(a.quality); });
  chips.forEach(function (c) {
    var sl = Object.keys(G.cyber).filter(function (k) { var id = G.cyber[k]; return !isTrial(id) && (G.cyberChips[k] || []).length < (QUALITY[MOD_BY[id].quality] || QUALITY.gray).slots && (!c.corp || MOD_BY[id].corp === c.corp || true); })
      .sort(function (a, b) { return (c.corp && MOD_BY[G.cyber[b]].corp === c.corp ? 1 : 0) - (c.corp && MOD_BY[G.cyber[a]].corp === c.corp ? 1 : 0); })[0];
    if (!sl) return;
    if (c.heavy && cyberLoad() + c.heavy > cap) return;
    G.chips.splice(G.chips.indexOf(c), 1); G.cyberChips[sl].push(c);
  });
  recalc(); bagSettle(); updateHUD();
  toast('一键配装 · 负载 ' + cyberLoad() + '/' + cap, 'good'); sfx.level();
}
/* ---------- 老韩 ---------- */
var FIN = (window.NEON && window.NEON.finale) || { han: { tips: [], hints: [], talk: [] } };
function hanLine() {
  var H = FIN.han || {}, pool = [];
  (H.tips || []).forEach(function (t) { pool.push(t); pool.push(t); });
  (H.talk || []).forEach(function (t) { pool.push(t); });
  if (ST.wins >= 1) (H.hints || []).forEach(function (t) { pool.push(t); });
  var bt = (STORY.bar || {}).bartender; if (bt) bt.lines.forEach(function (t) { pool.push(t); });
  var l; do { l = pick(pool); } while (pool.length > 1 && l === G._hanLast);
  G._hanLast = l; return l;
}
