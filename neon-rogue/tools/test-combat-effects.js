const assert = require('node:assert/strict');
const { create } = require('../combat-effects');

let time = 1000;
const calls = [];
const game = { map: [], enemies: [], hazards: [] };
const fx = create(game, { now: () => time, shake: amount => calls.push(['shake', amount]), glitch: amount => calls.push(['glitch', amount]) });
const ctx = new Proxy({}, { get(target, property) {
  if (property in target) return target[property];
  return (...values) => {
    for (const value of values) if (typeof value === 'number') assert(Number.isFinite(value), property + ' received a non-finite number');
    calls.push([property, ...values]);
  };
} });
const view = { tile: 24, sx: x => x * 24 + 12, sy: y => y * 24 + 12 };
const cells = [{ x: 2, y: 3 }, { x: 3, y: 3 }];
const effect = fx.emit('rect', { x: 1, y: 3, tx: 6, ty: 3, cells, life: 999, delay: 100, shake: 20, glitch: 4 });
cells[0].x = 99;
assert.equal(effect.cells[0].x, 2);
assert(effect.born + effect.life <= 1480);
assert(calls.some(call => call[0] === 'shake' && call[1] === 8));
assert(calls.some(call => call[0] === 'glitch' && call[1] === .35));
for (const kind of ['dash', 'blink', 'rect', 'cross', 'slash', 'cone', 'tendril', 'rail', 'network', 'shock', 'burst', 'mine', 'repair', 'echo']) {
  fx.emit(kind, { owner: 7, x: 1, y: 1, tx: 5, ty: 3, points: [{ x: 1, y: 1 }, { x: 3, y: 2 }, { x: 5, y: 3 }], cells: [{ x: 3, y: 2 }], color: '#22e6ff' });
}
fx.setTelegraph('player-charge', { owner: 3, cells: [{ x: 2, y: 2 }, { x: 3, y: 2 }], color: '#22e6ff' });
game.enemies.push({ hp: 20, intent: { bossCombat: true, cells: [{ x: 5, y: 5 }], color: '#ff4d5e' } });
time = 1150; fx.draw(ctx, view, time);
assert(calls.some(call => call[0] === 'arc'));
assert(calls.some(call => call[0] === 'strokeRect'));
assert(calls.some(call => call[0] === 'setLineDash' && call[1].length));
assert(!calls.some(call => call[0] === 'fillText' || call[0] === 'strokeText'));
const offset = ctx.lineDashOffset; time = 1200; fx.draw(ctx, view, time); assert.notEqual(ctx.lineDashOffset, offset);
fx.clearOwner(7); assert(!fx.snapshot().effects.some(item => item.owner === 7));
fx.clearTelegraph('player-charge'); assert.equal(fx.snapshot().telegraphs, 0);
time = 1481; fx.draw(ctx, view, time); assert.equal(fx.snapshot().effects.length, 0);
fx.emit('shock', { x: 1, y: 1 }); fx.setTelegraph('old-floor', { cells: [{ x: 1, y: 1 }] });
game.map = []; fx.draw(ctx, view, time);
assert.equal(fx.snapshot().effects.length, 0); assert.equal(fx.snapshot().telegraphs, 0);
console.log(JSON.stringify({ passed: true, shapes: 14, checks: ['finite-canvas-coordinates', 'immutable-snapshots', '480ms-lifetime', 'bounded-shake', 'animated-warning', 'text-free', 'owner-cleanup', 'floor-cleanup'] }));
