// DREAM_V2：每段超梦一整套技能；操控守卫时拥有它的全部招式
var DREAM_ACTS = {
  rocker: [
    { k: 'encore', name: '安可', cd: 3, color: '#ff5c7a', desc: '视野内全部敌人受到 3×攻击 伤害' },
    { k: 'dive', name: '跳水', cd: 2, color: '#ffb347', desc: '跳进 4 格内的人群：落点周围 1 格内全部敌人受 2×攻击 伤害并被击退' },
    { k: 'riff', name: '即兴', cd: 6, color: '#fcee0a', desc: '弹一段：6 回合内每次击杀攻击 +2（本层有效）' }
  ],
  runner: [
    { k: 'slow', name: '再快一点', cd: 2, color: '#9fe9ff', desc: '时间停止 3 回合 · 失控值 +30' },
    { k: 'streak', name: '残影穿刺', cd: 1, color: '#22e6ff', desc: '沿面向冲刺 5 格，穿过的敌人各受 2×攻击 伤害 · 失控值 +12' },
    { k: 'vent', name: '强制散热', cd: 5, color: '#57ffa8', desc: '失控值 -40，生命 -10%' }
  ],
  puppet: [
    { k: 'string', name: '牵丝', cd: 2, color: '#57ffa8', desc: '控制 6 格内一个普通敌人 12 回合；守卫被缴械 2 回合' },
    { k: 'net', name: '潜网', cd: 5, color: '#9fe9ff', desc: '视野内全部敌人宕机 2 回合' },
    { k: 'ghostshell', name: '换壳', cd: 4, color: '#c08bff', desc: '与一个被控制的傀儡交换位置，并让它爆炸（3×攻击，周围 1 格）' }
  ],
  replicant: [
    { k: 'oneday', name: '多一天', cd: 6, color: '#ffd166', desc: '回复 35% 生命' },
    { k: 'tears', name: '雨中的泪', cd: 3, color: '#9fe9ff', desc: '对 5 格内生命最高的敌人造成 6×攻击 伤害' },
    { k: 'voight', name: '共情测试', cd: 4, color: '#ff9f43', desc: '6 格内一个非守卫敌人陷入犹豫 3 回合，不再攻击' }
  ],
  hound: [
    { k: 'pounce', name: '突进', cd: 2, color: '#ff7a45', desc: '扑向 4 格内最近的敌人，2×攻击 并留下 2 层伤口' },
    { k: 'maul', name: '深蓄咬合', cd: 4, color: '#ff365c', desc: '本回合蓄力，下一次行动对身边一个敌人 5×攻击，吸血 50%' },
    { k: 'rend', name: '撕扯连段', cd: 2, color: '#ff9f43', desc: '对身边一个敌人连咬 3 次，每次 1×攻击 并叠伤口' }
  ]
};
var DREAM_PASSIVE = {
  rocker: '被动：击杀时观众欢呼，回复 4% 生命',
  runner: '被动：失控值每回合 -5；失控期间伤害 ×2',
  puppet: '被动：被控制的傀儡不会因时间断线',
  replicant: '被动：伤害极高，生命每回合流失 3%',
  hound: '被动「狂猎」：生命低于 35% 时攻击 +50%、吸血 +20%；伤口每回合流血'
};
function dreamVis(r) { return G.enemies.filter(function (e) { return e.hp > 0 && G.vis[e.y] && G.vis[e.y][e.x] && (!r || Math.max(Math.abs(e.x - p.x), Math.abs(e.y - p.y)) <= r); }); }
function dreamNear(r) { return dreamVis(r).sort(function (a, b) { return Math.max(Math.abs(a.x - p.x), Math.abs(a.y - p.y)) - Math.max(Math.abs(b.x - p.x), Math.abs(b.y - p.y)); }); }
function dreamHit(e, mul, col, label) { var h = playerHit(e, effAtk() * mul * (G.mode === 'dream' && G.dream.kit === 'runner' && psychoActive() ? 2 : 1), { source: 'dream' }); float(e.x, e.y, (label ? label + ' ' : '') + '-' + h.damage, col, true); nvSpawn(e.x, e.y, col, 10); if (e.hp <= 0) killEnemy(e); return h; }
function dreamAct2(k) {
  if (G.mode !== 'dream' || G.state !== 'play' || G.paused || G.busy) return;
  var kit = G.dream.kit, act = (DREAM_ACTS[kit] || []).find(function (a) { return a.k === k; }); if (!act) return;
  G.dreamCds = G.dreamCds || {}; if (G.dreamCds[k] > 0) { msg('还需 ' + G.dreamCds[k] + ' 回合', 'dim'); return; }
  var col = act.color, ok = true, t;
  if (k === 'encore') { var v = dreamVis(); if (!v.length) ok = false; else { NV.glitch = 1; nvPunch(1.4); G.shake = 12; v.forEach(function (e) { nvExplode(e.x, e.y, col, 1); dreamHit(e, 3, col); }); } }
  else if (k === 'dive') { t = dreamNear(4)[0]; if (!t) ok = false; else { var land = freeAdjacent(t.x, t.y); if (land) { chromeSkillPush('blink', { x: p.x, y: p.y, tx: land.x, ty: land.y, color: col, priority: 3, life: 420 }); p.x = land.x; p.y = land.y; } nvExplode(p.x, p.y, col, 1.3); G.enemies.filter(function (e) { return e.hp > 0 && Math.max(Math.abs(e.x - p.x), Math.abs(e.y - p.y)) <= 1; }).forEach(function (e) { dreamHit(e, 2, col); if (e.hp > 0 && !e.boss) { var nx = e.x + Math.sign(e.x - p.x), ny = e.y + Math.sign(e.y - p.y); if (G.map[ny] && G.map[ny][nx] !== WALL && !occupied(nx, ny)) { e.x = nx; e.y = ny; } } }); } }
  else if (k === 'riff') { G.dreamRiff = 6; toast('即兴 · 每次击杀攻击 +2', 'good'); }
  else if (k === 'slow') { G.freeze = Math.max(G.freeze || 0, 3); G.dreamHeat += 30; chromeSkillActive({ type: 'sandevistan', color: col, level: 5 }, p, []); }
  else if (k === 'streak') {
    var dx = Math.round(Math.cos(p.face || 0)), dy = Math.round(Math.sin(p.face || 0)); if (!dx && !dy) dx = 1;
    var x = p.x, y = p.y, hits = [];
    for (var i = 0; i < 5; i++) { var nx2 = x + dx, ny2 = y + dy; if (!G.map[ny2] || G.map[ny2][nx2] === WALL) break; var en = enemyAt(nx2, ny2); if (en) hits.push(en); x = nx2; y = ny2; }
    while (enemyAt(x, y) && (x !== p.x || y !== p.y)) { x -= dx; y -= dy; }
    chromeSkillPush('blink', { x: p.x, y: p.y, tx: x, ty: y, color: col, priority: 3, life: 380 }); p.x = x; p.y = y; hits.forEach(function (e) { dreamHit(e, 2, col); }); G.dreamHeat += 12;
  }
  else if (k === 'vent') { G.dreamHeat = Math.max(0, G.dreamHeat - 40); var hl = Math.round(p.maxHp * .1); p.hp = Math.max(1, p.hp - hl); float(p.x, p.y, '-' + hl, C.red); nvSpawn(p.x, p.y, col, 18); }
  else if (k === 'string') { t = dreamNear(6).filter(function (e) { return !e.structure; }).sort(function (a, b) { return b.hp - a.hp; })[0]; if (!t) ok = false; else if (t.boss) { t.disarmT = 2; float(t.x, t.y, '缴械', col, true); } else { ghostHackAct('hijack', t, { n: '牵丝' }); var al = G.allies[G.allies.length - 1]; if (al) al.turns = 99999; } }
  else if (k === 'net') { var vv = dreamVis(); if (!vv.length) ok = false; vv.forEach(function (e) { e.stun = Math.max(e.stun || 0, 2); e.intent = null; nvSpawn(e.x, e.y, col, 8, { kind: 'bit' }); }); NV.glitch = .7; }
  else if (k === 'ghostshell') { var pup = G.allies.filter(function (a) { return a.kind === 'hacked'; }).pop(); if (!pup) ok = false; else { var ox = p.x, oy = p.y; p.x = pup.x; p.y = pup.y; pup.x = ox; pup.y = oy; nvExplode(pup.x, pup.y, col, 1.2); G.enemies.filter(function (e) { return e.hp > 0 && Math.max(Math.abs(e.x - pup.x), Math.abs(e.y - pup.y)) <= 1; }).forEach(function (e) { dreamHit(e, 3, col); }); G.allies.splice(G.allies.indexOf(pup), 1); } }
  else if (k === 'oneday') { healPlayer(pctHp(.35)); nvColumn(p.x, p.y, col, 4); }
  else if (k === 'tears') { t = dreamVis(5).sort(function (a, b) { return b.hp - a.hp; })[0]; if (!t) ok = false; else { G.beams.push({ x0: p.x + .5, y0: p.y + .5, x1: t.x + .5, y1: t.y + .5, life: 420, max: 420, color: col }); dreamHit(t, 6, col, '泪'); } }
  else if (k === 'voight') { t = dreamNear(6).filter(function (e) { return !e.boss; })[0]; if (!t) ok = false; else { t.disarmT = 3; t.intent = null; float(t.x, t.y, '犹豫', col, true); } }
  else if (k === 'pounce') { t = dreamNear(4).filter(function (e) { return los(p.x, p.y, e.x, e.y); })[0]; if (!t) ok = false; else { var ld = freeAdjacent(t.x, t.y); if (ld) { chromeSkillPush('blink', { x: p.x, y: p.y, tx: ld.x, ty: ld.y, color: col, priority: 3, life: 380 }); p.x = ld.x; p.y = ld.y; } p.face = Math.atan2(t.y - p.y, t.x - p.x); t.bleedStacks = Math.min(6, (t.bleedStacks || 0) + 2); dreamHit(t, 2, col, '突进'); } }
  else if (k === 'maul') { G.dreamMaul = true; G.stance = { id: '_maul', type: 'maul', r: 1, turns: 3, color: col, name: '深蓄咬合' }; nvChargeUp(1, 1, col, '咬'); }
  else if (k === 'rend') { t = dreamNear(1)[0]; if (!t) ok = false; else { p.face = Math.atan2(t.y - p.y, t.x - p.x); for (var r = 0; r < 3 && t.hp > 0; r++) { t.bleedStacks = Math.min(6, (t.bleedStacks || 0) + 1); dreamHit(t, 1, col); } chromeSkillPush('slash', { x: p.x, y: p.y, tx: t.x, ty: t.y, face: p.face, color: col, radius: 1.2, variant: 'point', life: 420, priority: 3 }); } }
  if (!ok) { msg('附近没有可用的目标', 'dim'); return; }
  G.dreamCds[k] = act.cd; sfx.hit(); computeFOV(); updateHUD(); endTurn();
}
// 深蓄咬合：下一次行动自动咬
function dreamMaulRelease() {
  if (!G.dreamMaul) return false;
  G.dreamMaul = false; G.stance = null;
  var t = dreamNear(1)[0]; if (!t) { msg('咬空了', 'dim'); return false; }
  p.face = Math.atan2(t.y - p.y, t.x - p.x);
  var h = dreamHit(t, 5, '#ff365c', '咬合'); healPlayer(Math.round(h.damage * .5), true);
  chromeSkillPush('slash', { x: p.x, y: p.y, tx: t.x, ty: t.y, face: p.face, color: '#ff365c', radius: 1.6, heavy: true, stamp: '噬', variant: 'point', life: 640, priority: 3 }); nvPunch(1.3);
  computeFOV(); updateHUD(); endTurn(); return true;
}
