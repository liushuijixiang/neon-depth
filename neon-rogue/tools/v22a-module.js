/* =========================================================
   V22A · 保留滚动 / 二次确认 / 幽灵烧毁近战
   ========================================================= */
// 同一界面重绘时保留卡片滚动位置（切换页签才回顶部）
(function () {
  var desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  function sig(c) { if (!c) return ''; var k = c.querySelector('.kicker'), t = c.querySelector('.tab.on,.hubtab.on,.subtabs .on,[data-rt].on'); return c.className + '|' + (k ? k.textContent.slice(0, 14) : '') + '|' + (t ? t.textContent.slice(0, 6) : '') + '|' + ((c.querySelectorAll('.subtabs .on')[0] || {}).textContent || ''); }
  Object.defineProperty(overlay, 'innerHTML', {
    configurable: true,
    get: function () { return desc.get.call(this); },
    set: function (v) {
      var old = this.querySelector('.card'), s0 = sig(old), top = old ? old.scrollTop : 0;
      desc.set.call(this, v);
      var nc = this.querySelector('.card');
      if (nc && top > 0 && s0 && sig(nc) === s0) { nc.scrollTop = top; requestAnimationFrame(function () { if (nc.isConnected && Math.abs(nc.scrollTop - top) > 2) nc.scrollTop = top; }); }
    }
  });
})();
// 消耗核心：第一次点击只是「上膛」，2.5 秒内再点才执行
function confirm2(btn, hint) {
  if (!btn) return true;
  if (btn._arm && Date.now() - btn._arm < 2500) { btn._arm = 0; return true; }
  btn._arm = Date.now(); btn._label = btn._label || btn.innerHTML; btn.classList.add('arm2');
  btn.innerHTML = '<b>再点一次确认</b>' + (hint ? '<small>' + hint + '</small>' : '');
  sfx.step();
  setTimeout(function () { if (btn.isConnected && btn._arm) { btn._arm = 0; btn.classList.remove('arm2'); btn.innerHTML = btn._label; } }, 2500);
  return false;
}
/* ---------- 幽灵：时停结束后的烧毁近战 ---------- */
var BURN_ACTS = [
  { k: 'reap', n: '裂魂斩', d: '身边一圈 1.8×，吸血 50%' },
  { k: 'bloodrush', n: '血舞', d: '向前冲 3 格，沿途 2×，回复伤害 30%' },
  { k: 'finale', n: '终幕', d: '相邻一个 3.5×，击杀回 15% 生命' }
];
function ghostBurnAct(k) {
  if (classDef().id !== 'ghost' || !G.burnout || G.state !== 'play' || G.paused || G.busy) return;
  var a = effAtk(), dealt = 0, col = '#ff365c';
  function hit(e, mul, label) { var h = playerHit(e, a * mul, { source: 'ghost-burn' }); dealt += h.damage; float(e.x, e.y, (label ? label + ' ' : '') + '-' + h.damage, col, true); nvSpawn(e.x, e.y, col, 10); var dead = e.hp <= 0; if (dead) killEnemy(e); return dead; }
  if (k === 'reap') {
    var adj = G.enemies.filter(function (e) { return e.hp > 0 && Math.max(Math.abs(e.x - p.x), Math.abs(e.y - p.y)) <= 1; });
    if (!adj.length) { msg('身边没有敌人', 'dim'); return; }
    chromeSkillPush('slash', { x: p.x, y: p.y, tx: adj[0].x, ty: adj[0].y, face: p.face || 0, color: col, variant: 'spin', ring: 1, heavy: true, life: 560, priority: 3, cells: tacticArea(p.x, p.y, 1), stamp: '魂' });
    adj.forEach(function (e) { hit(e, 1.8); }); healPlayer(Math.round(dealt * .5), true);
  } else if (k === 'bloodrush') {
    var dx = Math.round(Math.cos(p.face || 0)), dy = Math.round(Math.sin(p.face || 0)); if (!dx && !dy) dx = 1;
    var x = p.x, y = p.y, passed = [];
    for (var i = 0; i < 3; i++) { var nx = x + dx, ny = y + dy; if (!G.map[ny] || G.map[ny][nx] === WALL) break; var en = enemyAt(nx, ny); if (en) passed.push(en); x = nx; y = ny; }
    while ((x !== p.x || y !== p.y) && enemyAt(x, y)) { x -= dx; y -= dy; }
    if (x === p.x && y === p.y && !passed.length) { msg('前面没有路', 'dim'); return; }
    chromeSkillPush('blink', { x: p.x, y: p.y, tx: x, ty: y, color: col, priority: 3, life: 380, variant: 'ghost-blade' }); p.x = x; p.y = y;
    passed.forEach(function (e) { hit(e, 2); }); healPlayer(Math.round(dealt * .3), true);
  } else if (k === 'finale') {
    var t = G.enemies.filter(function (e) { return e.hp > 0 && Math.max(Math.abs(e.x - p.x), Math.abs(e.y - p.y)) <= 1; }).sort(function (x1, x2) { return x1.hp - x2.hp; })[0];
    if (!t) { msg('身边没有敌人', 'dim'); return; }
    p.face = Math.atan2(t.y - p.y, t.x - p.x);
    chromeSkillPush('slash', { x: p.x, y: p.y, tx: t.x, ty: t.y, face: p.face, color: col, variant: 'line', heavy: true, life: 640, priority: 3, stamp: '終' }); nvPunch(1.3);
    if (hit(t, 3.5, '终幕')) healPlayer(pctHp(.15), true);
  }
  sfx.hit(); computeFOV(); updateHUD(); endTurn();
}
