/* =========================================================
   PSYCHO_V1 · 赛博精神病敌人 / 失控义体
   ========================================================= */
var PSY_NAMES = ['断线的', '烧穿的', '红眼', '无名', '过载的', '空壳', '尖叫', '前潜入者'];
var PSY_TIERS = { 1: ['green', 'blue'], 2: ['blue', 'purple', 'orange'], 3: ['purple', 'orange', 'red'] };
function psychoGear(depth) {
  var tier = stageOf(depth), qs = PSY_TIERS[tier] || PSY_TIERS[1], n = 1 + Math.floor(depth / 6);
  var pool = MODS.filter(function (m) { return !m.dropOnly && !m.achievementOnly && !m.relic && !m.cls && qs.indexOf(m.quality) >= 0; });
  var act = shuffle(pool.filter(function (m) { return m.active; })), rest = shuffle(pool.filter(function (m) { return !m.active; }));
  var mods = act.slice(0, 1).concat(shuffle(act.slice(1).concat(rest)).slice(0, n - 1)).map(function (m) { return m.id; });
  var chips = []; for (var i = 0; i < Math.min(3, 1 + Math.floor(depth / 5)); i++) { var c = makeChip(pick(CHIPS).id, pick(qs)); c.heavy = 1 + rnd(2); c.name = '重改·' + c.name; chips.push(c); }
  return { mods: mods, chips: chips };
}
function spawnPsychoEnemy(depth) {
  if (G.mode !== 'normal' || depth < 2 || depth % 5 === 0) return null;
  if (Math.random() > Math.min(.7, .3 + depth * .03) * (G.anomaly === 'lockdown' ? 1.4 : 1)) return null;
  var specs = MONSTERS.filter(function (m) { return !m.boss && ['chase', 'charger', 'tank'].indexOf(m.ai) >= 0 && depth >= (m.minDepth || 1) && depth <= (m.maxDepth || 99); });
  if (!specs.length) return null;
  var t = randomFloorTile(7, false); if (!t) return null;
  var e = spawnEnemy(pick(specs), t.x, t.y, depth), gear = psychoGear(depth);
  e.elite = true; e.psycho = { mods: gear.mods, chips: gear.chips, cd: 2 };
  e.name = '赛博精神病·' + pick(PSY_NAMES) + e.spec.name; e.color = '#ff365c';
  e.hp = e.maxHp = Math.round(e.maxHp * 3.2); e.atk += 2 + Math.floor(depth / 3); e.xp = Math.round(e.xp * 3);
  tacticUid(e); G.enemies.push(e);
  msg('警报：本层有一名赛博精神病（' + gear.mods.map(function (id) { return MOD_BY[id].name; }).join('、') + '）', 'bad');
  return e;
}
function psychoUseSkill(e, dist) {
  var ps = e.psycho; if (!ps || !e.alerted) return false;
  if (--ps.cd > 0) return false;
  var d = cyberDistance(e, p); if (d > 6) return false;
  var m = ps.mods.map(function (id) { return MOD_BY[id]; }).filter(function (x) { return x && x.active; })[0]; if (!m) return false;
  var ty = m.active.type, nm = m.active.name; ps.cd = 3;
  float(e.x, e.y, '「' + nm + '」', '#ff365c', true);
  if (ty === 'beam' || ty === 'multi' || ty === 'arc') tacticQueue(e, 'psy-' + ty, nm, tacticLine(e, 9, p.x, p.y), 1, Math.round(e.atk * 1.5));
  else if (ty === 'blink' || ty === 'sandevistan') { var land = freeAdjacent(p.x, p.y); if (land) { nvSpawn(e.x, e.y, '#ff365c', 12); e.x = land.x; e.y = land.y; enemyMelee(e); } }
  else if (ty === 'shield' || ty === 'grow' || ty === 'stealth' || ty === 'heal_stealth' || ty === 'mech') { e.shieldT = 3; var h = Math.round(e.maxHp * .12); e.hp = Math.min(e.maxHp, e.hp + h); float(e.x, e.y, '+' + h, C.green); }
  else tacticQueue(e, 'psy-burst', nm, tacticArea(e.x, e.y, 2), 1, Math.round(e.atk * 1.7));
  return true;
}
function psychoDrops(e) {
  if (G.mode !== 'normal' || !e.psycho) return;
  cum.psychoKills = (cum.psychoKills || 0) + 1;
  e.psycho.mods.forEach(function (id, i) {
    var m = MOD_BY[id]; if (!m) return;
    var inst = rollInst(m, { affixN: (INST_AFFIX_N[m.quality] || 0) + 1, boost: 1.6, dur: 1 + rnd(3), maxDur: 10, heavy: 2 + rnd(3), origin: '精神病改装', force: true });
    var spot = i === 0 ? { x: e.x, y: e.y } : (freeAdjacent(e.x, e.y) || { x: e.x, y: e.y });
    G.items.push({ x: spot.x, y: spot.y, mod: m, inst: inst, seed: Math.random() * TAU });
  });
  e.psycho.chips.forEach(function (c) { var spot = freeAdjacent(e.x, e.y) || { x: e.x, y: e.y }; G.items.push({ x: spot.x, y: spot.y, chip: c, seed: Math.random() * TAU }); });
  toast('精神病倒下 · 改装件散落一地', 'good');
  contractEvent('psycho', e);
}
// 失控义体：失控期间暴走，清醒后结账
function frenzyBonus() {
  var n = 0; Object.keys(G.cyber || {}).forEach(function (k) { var m = MOD_BY[G.cyber[k]]; if (m && m.frenzy) n++; }); return n;
}
function frenzyOnEnd() {
  var n = frenzyBonus(); if (!n || G.mode === 'train') return;
  var hpLoss = Math.max(1, Math.round(p.maxHp * .06 * n)), atkLoss = n;
  p.itemMax -= hpLoss; p.itemAtk -= atkLoss; recalc(); p.hp = Math.min(p.hp, p.maxHp);
  G.hurt = 1; float(p.x, p.y, 'MAX -' + hpLoss + ' / ATK -' + atkLoss, C.red, true);
  msg('清醒了。账单到了：最大生命 -' + hpLoss + '，攻击 -' + atkLoss, 'bad');
}
