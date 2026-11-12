const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { create, profiles } = require('../implant-combat');

const game = {
  map: Array.from({ length: 30 }, () => Array(44).fill(0)),
  vis: Array.from({ length: 30 }, () => Array(44).fill(1)),
  enemies: [], allies: [], melee: { seq: 0, charge: 0 }
};
const player = { x: 10, y: 10, face: 0 };
const effects = [];
const previews = new Map();
const hooks = {
  player: () => player,
  floor: (x, y) => x >= 0 && y >= 0 && x < 44 && y < 30 && game.map[y][x] === 0,
  wallAt: () => false,
  occupied: (x, y) => game.enemies.concat(game.allies).some(actor => actor.x === x && actor.y === y),
  los: (ax, ay, bx, by) => {
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let step = 1; step <= steps; step++) {
      const x = Math.round(ax + (bx - ax) * step / steps);
      const y = Math.round(ay + (by - ay) * step / steps);
      if (game.map[y]?.[x] !== 0) return false;
    }
    return true;
  },
  fx: { emit: (kind, data) => effects.push({ kind, ...data }),
    setTelegraph: (key, data) => previews.set(key, data), clearTelegraph: key => previews.delete(key) }
};
const combat = create(game, hooks);
const checks = [];
function check(name, run) { run(); checks.push(name); }
const mod = id => ({ id, color: '#22e6ff', melee: { color: '#22e6ff' } });

check('Cardinal four-by-three slash has twelve forward cells', () => {
  const cells = combat.cells({ shape: 'rect', range: 4, width: 3 }, player, 0);
  assert.equal(cells.length, 12);
  assert(cells.every(cell => cell.x > 10 && cell.x <= 14 && Math.abs(cell.y - 10) <= 1));
});
check('Rectangular slash rotates with all eight directions', () => {
  for (let angle = 0; angle < 8; angle++) {
    const cells = combat.cells({ shape: 'rect', range: 4, width: 3 }, player, angle * Math.PI / 4);
    assert(cells.length >= 8);
    assert(cells.every(cell => hooks.floor(cell.x, cell.y)));
  }
});
check('Directional cone excludes the rear and cross retains distinct arms', () => {
  const cone = combat.cells({ shape: 'cone', range: 3, angle: 120 }, player, 0);
  assert(cone.every(cell => cell.x >= player.x));
  const cross = combat.cells({ shape: 'cross', range: 3 }, player, 0);
  assert.equal(cross.length, 12);
  assert(cross.every(cell => cell.x === player.x || cell.y === player.y));
});
check('Wall occludes long slash targets', () => {
  game.map[10][12] = 1;
  const cells = combat.cells({ shape: 'rect', range: 7, width: 1 }, player, 0);
  assert.deepEqual(cells, [{ x: 11, y: 10 }]);
  game.map[10][12] = 0;
});
check('Charged mantis rush stops before an enemy and includes its impact cell', () => {
  game.melee.charge = 1;
  game.enemies = [{ x: 12, y: 10, hp: 30 }];
  const plan = combat.plan(mod('mantis_blade'), { mult: 1.35 }, false);
  assert.deepEqual(plan.landing, { x: 11, y: 10 });
  assert(plan.attacks[0].cells.some(cell => cell.x === 12 && cell.y === 10));
  assert.equal(combat.targets(plan.attacks[0]).length, 1);
  assert.deepEqual(player, { x: 10, y: 10, face: 0 });
});
check('Dash cannot pass through a wall or ally', () => {
  game.enemies = []; game.allies = [{ x: 11, y: 10 }];
  assert.deepEqual(combat.plan(mod('mantis_blade'), {}, false).landing, { x: 10, y: 10 });
  game.allies = []; game.map[10][11] = 1;
  assert.deepEqual(combat.plan(mod('mantis_blade'), {}, false).landing, { x: 10, y: 10 });
  game.map[10][11] = 0;
});
check('Thermal and iaido charge have different real footprints', () => {
  const thermal = combat.plan(mod('thermal_blade'), {}, false);
  const iaido = combat.plan(mod('iaido'), {}, false);
  assert.equal(thermal.attacks[0].cells.length, 12);
  assert.equal(iaido.attacks[0].cells.length, 7);
});
check('EMP uses a target-to-target circuit instead of an area fill', () => {
  game.enemies = [{ x: 13, y: 10, hp: 10 }, { x: 15, y: 11, hp: 10 }, { x: 16, y: 13, hp: 10 }];
  const plan = combat.plan(mod('emp_knuckles'), {}, true);
  assert.deepEqual(plan.attacks[0].cells, game.enemies.map(enemy => ({ x: enemy.x, y: enemy.y })));
});
check('Three-cut active retains separate shapes and bounded delayed effects', () => {
  effects.length = 0;
  const plan = combat.plan(mod('katana'), {}, true);
  assert.equal(plan.attacks.length, 3);
  assert.equal(new Set(plan.attacks.map(attack => attack.stage.shape)).size, 3);
  combat.emit(plan);
  assert(effects.every(effect => effect.delay + effect.life <= 480));
});
check('Preview is removable and does not advance gameplay', () => {
  const before = JSON.stringify(game);
  combat.preview(combat.plan(mod('thermal_blade'), {}, true));
  assert(previews.has('player-weapon'));
  combat.clearPreview(); assert.equal(previews.size, 0);
  assert.equal(JSON.stringify(game), before);
});
assert.equal(Object.keys(profiles).length, 10);
const output = path.resolve(__dirname, '../../work/r38');
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'implant-geometry-tests.json'), JSON.stringify({ passed: checks.length, checks }, null, 2));
console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
