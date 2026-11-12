const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { create, ids } = require('../boss-combat');

const content = vm.createContext({ window: {} });
for (const name of ['bosses_low', 'bosses_high']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'content', name + '.js'), 'utf8'), content);
const specs = content.window.NEON.bosses;
const results = [];

function test(name, run) {
  const detail = run();
  results.push({ name, passed: true, detail });
}

function fixture(id, playerStats = {}) {
  let serial = 1;
  let hidden = false;
  const spec = specs.find(entry => entry.id === id);
  const depth = spec.tier * 5;
  const player = Object.assign({ x: 7, y: 10, hp: 1000, maxHp: 1000, atk: 10, def: 0, lifesteal: 0, shield: 0 }, playerStats);
  const game = { state: 'play', depth, turn: 0, freeze: 0, enemies: [], allies: [], hazards: [],
    map: Array.from({ length: 23 }, (_, y) => Array.from({ length: 27 }, (_, x) => x > 0 && y > 0 && x < 26 && y < 22 ? 0 : 1)) };
  const boss = { id, spec, boss: true, uid: serial++, name: spec.name, color: spec.color, x: 13, y: 10,
    hp: Math.round(spec.hp * (1 + (depth - 1) * .24) * 4.5), atk: Math.round((spec.atk + 1 + Math.floor((depth - 1) / 2)) * (1 + (depth - 1) * .05)),
    def: spec.def, stun: 0, phaseT: 0, brain: { stage: 0, step: 0, plate: 100 }, intent: null };
  boss.maxHp = boss.hp;
  game.enemies.push(boss);
  const events = [];
  const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const floor = (x, y) => !!game.map[y] && game.map[y][x] === 0;
  function occupied(x, y, owner) {
    return [player, ...game.enemies, ...game.allies].some(actor => actor !== owner && actor.hp > 0 && actor.x === x && actor.y === y);
  }
  function line(origin, range, tx, ty) {
    const length = Math.max(Math.abs(tx - origin.x), Math.abs(ty - origin.y));
    if (!length) return [];
    const cells = [];
    for (let i = 1; i <= range; i++) {
      const x = Math.round(origin.x + (tx - origin.x) / length * i);
      const y = Math.round(origin.y + (ty - origin.y) / length * i);
      if (!floor(x, y)) break;
      cells.push({ x, y });
    }
    return cells;
  }
  function los(x, y, tx, ty) {
    if (x === tx && y === ty) return true;
    return line({ x, y }, distance({ x, y }, { x: tx, y: ty }), tx, ty).some(cell => cell.x === tx && cell.y === ty);
  }
  function area(x, y, radius, inner = 0) {
    const cells = [];
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < inner) continue;
      if (floor(x + dx, y + dy)) cells.push({ x: x + dx, y: y + dy });
    }
    return cells;
  }
  function move(actor, away) {
    const current = distance(actor, player);
    const choices = area(actor.x, actor.y, 1, 1).filter(cell => !occupied(cell.x, cell.y, actor))
      .sort((a, b) => (distance(a, player) - distance(b, player)) * (away ? -1 : 1));
    const next = choices.find(cell => away ? distance(cell, player) > current : distance(cell, player) < current);
    if (next) Object.assign(actor, next);
  }
  function damagePlayer(raw, kind) {
    const shielded = Math.min(player.shield, raw);
    player.shield -= shielded;
    const damage = Math.max(0, raw - shielded);
    player.hp = Math.max(0, player.hp - damage);
    events.push({ kind: 'damage', attack: kind, amount: damage, turn: game.turn });
    if (player.hp <= 0) game.state = 'over';
    return damage;
  }
  const hooks = {
    player: () => player, hidden: () => hidden, uid: actor => actor.uid || (actor.uid = serial++),
    alive: actor => game.enemies.includes(actor) && actor.hp > 0, floor, wallAt: () => false, occupied,
    los, line, area, toward: actor => move(actor, false), away: actor => move(actor, true),
    ray: (origin, tx, ty, range) => {
      events.push({ kind: 'ray', sourceUid: origin.uid, range, turn: game.turn });
      const cells = line(origin, range, tx, ty), end = cells[cells.length - 1] || origin;
      return { cells, segments: [{ x0: origin.x + .5, y0: origin.y + .5, x1: end.x + .5, y1: end.y + .5 }] };
    },
    impact: (actor, cells, amount, kind, armor) => {
      events.push({ kind: 'impact', attack: kind, cells: cells.map(cell => ({ ...cell })), amount, armor, turn: game.turn });
      if (cells.some(cell => cell.x === player.x && cell.y === player.y)) damagePlayer(Math.max(1, Math.round(amount - player.def * armor)), kind);
    },
    field: (owner, kind, cells, delay, life, damage, extra) => {
      const field = Object.assign({ id: serial++, ownerId: owner.uid, sourceUid: owner.uid, kind, cells, delay, life, damage, bornTurn: game.turn }, extra);
      game.hazards.push(field); return field;
    },
    slots: (owner, inner, outer) => area(owner.x, owner.y, outer, inner).filter(cell => !occupied(cell.x, cell.y, owner)),
    owned: owner => game.enemies.filter(actor => actor.ownerId === owner.uid),
    structure: (owner, kind, position) => {
      if (!position || occupied(position.x, position.y, owner)) return null;
      const structure = { uid: serial++, ownerId: owner.uid, sourceUid: owner.uid, structure: kind, x: position.x, y: position.y,
        hp: 40, maxHp: 40, atk: owner.atk, bornTurn: game.turn };
      game.enemies.push(structure); return structure;
    },
    removeStructure: actor => { actor.hp = 0; game.enemies = game.enemies.filter(entry => entry !== actor); },
    networkOnline: () => true, networkRoute: () => {}, magnetWeave: () => {},
    phase: actor => { actor.brain.stage = actor.hp <= actor.maxHp * .25 ? 3 : actor.hp <= actor.maxHp * .5 ? 2 : actor.hp <= actor.maxHp * .75 ? 1 : 0; },
    heat: (actor, amount) => { actor.brain.heat = (actor.brain.heat || 0) + amount; }, cool: () => {}, hunt: () => {},
    industrial: actor => actor.brain.industrial || (actor.brain.industrial = {}),
    pull: (actor, steps) => {
      events.push({ kind: 'pull', steps, turn: game.turn });
      for (let i = 0; i < steps; i++) {
        const next = { x: player.x + Math.sign(actor.x - player.x), y: player.y + Math.sign(actor.y - player.y) };
        if (!floor(next.x, next.y) || occupied(next.x, next.y, player)) break;
        Object.assign(player, next);
      }
    },
    pulse: (actor, amount) => {
      events.push({ kind: 'pulse', amount, turn: game.turn });
      if (distance(actor, player) <= 14) damagePlayer(Math.max(1, Math.round(amount - player.def * .35)), 'pulse');
    },
    effect: (kind, payload) => events.push({ kind: 'effect', shape: kind, payload, turn: game.turn }),
    stageEvent: () => {}, float: () => {}, message: () => {},
    legacyResolve: actor => { actor.intent = null; actor.phaseT = 0; events.push({ kind: 'legacy' }); }
  };
  const controller = create(game, hooks);
  function tickFields() {
    game.hazards = game.hazards.filter(field => {
      if (field.bornTurn === game.turn) return true;
      if (!game.enemies.some(actor => actor.uid === field.ownerId && actor.hp > 0)) return false;
      if (field.delay > 0 && --field.delay > 0) return true;
      const hit = field.cells.some(cell => cell.x === player.x && cell.y === player.y);
      if (hit) damagePlayer(Math.max(1, Math.round(field.damage - player.def * (field.kind === 'acid' ? .25 : .65))), field.kind);
      if (field.kind === 'mine' && (hit || field.remote)) return false;
      return --field.life > 0;
    });
  }
  function turn(before) {
    game.turn++;
    if (before) before();
    tickFields();
    if (game.state === 'play') controller.act(boss, null);
  }
  return { game, boss, player, hooks, controller, events, turn, hidden: value => { hidden = value; }, distance, area, occupied, los };
}

test('All nine bosses produce active pressure and multiple actions', () => {
  return ids.map(id => {
    const f = fixture(id);
    for (let turn = 0; turn < 18 && f.game.state === 'play'; turn++) f.turn();
    const state = f.controller.snapshot(f.boss);
    assert(f.events.some(event => event.kind === 'damage' && event.amount > 0), id + ' never dealt pressure damage');
    assert(Object.keys(state.actions).length >= 2, id + ' has no action variety');
    assert.equal(f.boss.phaseT, f.boss.intent && f.boss.intent.phaseProtection ? f.boss.intent.turns : 0);
    assert(f.game.enemies.filter(actor => actor.structure).every(actor => actor.maxHp === 40));
    return { id, damage: 1000 - f.player.hp, actions: Object.keys(state.actions), structures: f.game.enemies.length - 1 };
  });
});

test('Hidden players are not newly targeted or tracked', () => {
  for (const id of ids) {
    const f = fixture(id); f.hidden(true);
    for (let turn = 0; turn < 8; turn++) f.turn();
    assert.equal(f.player.hp, 1000, id);
    assert.equal(f.boss.intent, null, id);
    assert.equal(f.game.hazards.length, 0, id);
    assert.equal(f.controller.snapshot(f.boss).history.length, 0, id);
  }
});

test('Queued rail uses its warned snapshot after the player hides', () => {
  const f = fixture('bl_lance');
  f.controller.act(f.boss, null);
  // Opening hook is followed by a rail on the next available action.
  for (let i = 0; i < 4 && !f.boss.intent; i++) f.turn();
  assert(f.boss.intent && f.boss.intent.kind === 'rail');
  const warned = JSON.stringify(f.boss.intent.cells);
  const safe = f.area(f.player.x, f.player.y, 2).find(cell => !f.boss.intent.cells.some(mark => mark.x === cell.x && mark.y === cell.y));
  Object.assign(f.player, safe); f.hidden(true); const hp = f.player.hp;
  f.turn();
  assert.equal(f.player.hp, hp);
  const released = f.events.filter(event => event.kind === 'impact' && event.attack === 'rail').pop();
  assert.equal(JSON.stringify(released.cells), warned);
});

test('Freezing preserves boss turn counters and pending critical moves', () => {
  const f = fixture('bl_hound'); f.turn();
  const before = JSON.stringify(f.controller.snapshot(f.boss));
  const intent = JSON.stringify(f.boss.intent); f.game.freeze = 3;
  f.controller.act(f.boss, null);
  assert.equal(JSON.stringify(f.controller.snapshot(f.boss)), before);
  assert.equal(JSON.stringify(f.boss.intent), intent);
});

test('Warden repair can be interrupted through ordinary damage', () => {
  const f = fixture('bl_warden'); f.boss.hp = f.boss.maxHp * .45;
  f.turn(); assert.equal(f.boss.intent.kind, 'repair');
  assert.equal(f.boss.intent.breakThreshold, f.boss.maxHp * .045);
  f.boss.hp -= f.boss.maxHp * .046; const hp = f.boss.hp;
  f.turn(); assert.equal(f.boss.intent, null); assert.equal(f.boss.hp, hp);
  assert.equal(f.controller.snapshot(f.boss).lastAction, 'repair-interrupted');
});

test('Warden keeps a real side/rear opening between facing updates', () => {
  const f = fixture('bl_warden'); f.player.x = f.boss.x + 1;
  f.turn(); const facing = f.boss.facing;
  f.player.x = f.boss.x; f.player.y = f.boss.y - 1;
  f.turn(); assert.equal(f.boss.facing, facing);
});

test('Phase changes cancel earlier-phase warnings and recorded echoes', () => {
  const f = fixture('bh_phase'); f.player.x = 11;
  f.turn(); assert(f.boss.intent);
  f.game.hazards.push({ id: 999, ownerId: f.boss.uid, phaseEcho: true, cells: [], delay: 3, life: 2, bornTurn: f.game.turn });
  f.boss.hp = f.boss.maxHp * .5;
  f.turn(); assert.equal(f.boss.brain.form, 1);
  assert(!f.game.hazards.some(field => field.id === 999));
  assert(!f.boss.intent || f.boss.intent.kind !== 'cleaver');
});

test('Time echoes record visited cells without interpolating teleport paths', () => {
  const f = fixture('bh_phase'); f.boss.hp = f.boss.maxHp * .5;
  f.turn(); const first = { x: f.player.x, y: f.player.y };
  f.player.x = 19; f.player.y = 18; f.turn();
  const history = f.controller.snapshot(f.boss).history;
  assert(history.every(cell => cell.x === first.x && cell.y === first.y || cell.x === 19 && cell.y === 18));
});

test('Destroying the owner clears structures and fields while preserving independent minions', () => {
  const f = fixture('bh_hive'); f.turn();
  const minion = { uid: 500, hp: 30, ownerId: f.boss.uid, summoned: true };
  f.game.enemies.push(minion);
  f.game.hazards.push({ id: 600, ownerId: f.boss.uid, cells: [], life: 3 });
  f.boss.hp = 0; f.controller.clear(f.boss);
  assert.equal(f.game.hazards.length, 0);
  assert(!f.game.enemies.some(actor => actor.structure && actor.ownerId === f.boss.uid));
  assert(f.game.enemies.includes(minion));
});

test('Legacy pending moves use the original resolver on save migration', () => {
  const f = fixture('bl_lance'); f.boss.intent = { kind: 'rail', turns: 1, cells: [] }; f.boss.phaseT = 1;
  f.turn(); assert(f.events.some(event => event.kind === 'legacy'));
  assert.equal(f.boss.intent, null);
});

test('Lance fire obeys solid cover', () => {
  const f = fixture('bl_lance');
  for (let y = 1; y < 22; y++) f.game.map[y][10] = 1;
  for (let i = 0; i < 12; i++) f.turn();
  assert.equal(f.player.hp, 1000);
});

test('Hive restores full-health opening production and four-action egg batches', () => {
  const f = fixture('bl_hive'); f.turn();
  assert.equal(f.game.enemies.find(actor => actor.structure === 'nest').maxHp, 40);
  const eggs = f.game.enemies.filter(actor => actor.structure === 'egg');
  assert.equal(eggs.length, 2); assert(eggs.every(actor => actor.maxHp === 40));
  assert.equal(f.controller.snapshot(f.boss).cooldowns.eggs, 4);
  for (let i = 0; i < 8; i++) f.turn();
  assert.equal(f.game.enemies.filter(actor => actor.structure === 'egg').length, 6);
  const acid = f.game.hazards.find(field => field.kind === 'acid');
  assert(acid.cells.length === 9 && acid.damage === 7);
});

test('Mother opens with all four full-health network nodes', () => {
  const f = fixture('bh_hive'); f.turn();
  assert.deepEqual(f.game.enemies.filter(actor => actor.structure).map(actor => actor.structure), ['relay', 'medic', 'gate', 'nest']);
  assert(f.game.enemies.filter(actor => actor.structure).every(actor => actor.maxHp === 40));
  const mirror = fixture('bl_mirror'); mirror.turn();
  assert(mirror.game.enemies.filter(actor => actor.structure).every(actor => actor.maxHp === 40));
});

function isolate(f, cooldowns = {}, stage = 0) {
  f.boss.brain.combat = { cooldowns: { composite: 100, ...cooldowns }, history: [], selfHistory: [], form: -1, actions: {}, age: 0 };
  f.hooks.phase = actor => { actor.brain.stage = stage; };
  f.hooks.toward = () => {};
  f.hooks.away = () => {};
}

test('All four stage multipliers use powers of 1.2', () => {
  return [1, 1.2, 1.44, 1.728].map((multiplier, stage) => {
    const f = fixture('bl_hound'); isolate(f, {}, stage);
    f.player.x = f.boss.x - 3; f.boss.atk = 100; f.turn();
    assert.equal(f.boss.intent.kind, 'maul');
    assert.equal(f.boss.intent.damage, Math.round(220 * multiplier));
    assert.equal(f.boss.brain.combat.cooldowns.maul, stage >= 2 ? 5 : 6);
    return { stage, multiplier, damage: f.boss.intent.damage };
  });
});

test('Hound preserves the normal melee upper bound and an independent enraged bite', () => {
  const f = fixture('bl_hound'); isolate(f, { maul: 100, charge: 100 }, 3);
  f.player.x = f.boss.x - 1; f.boss.hp = f.boss.maxHp * .2; f.turn();
  const hits = f.events.filter(event => event.kind === 'impact' && event.attack === 'maul');
  assert.equal(f.boss.atk, 13);
  assert.deepEqual(hits.map(hit => hit.amount), [Math.round(14 * 1.728), Math.round(13 * .6 * 1.728)]);
  assert(hits.every(hit => hit.armor === 1));
});

test('Hound retargets with a complete action remaining and stops tracking hidden players', () => {
  const f = fixture('bl_hound'); isolate(f); f.player.x = f.boss.x - 3; f.turn();
  f.player.y += 2; f.turn();
  assert.equal(f.boss.intent.turns, 1);
  assert(f.boss.intent.cells.some(cell => cell.x === f.player.x && cell.y === f.player.y));
  const finalWarning = f.boss.intent.cells.map(cell => ({ ...cell }));
  f.hidden(true); f.player.y += 3; const hp = f.player.hp; f.turn(); assert.equal(f.player.hp, hp);
  const release = f.events.filter(event => event.kind === 'impact' && event.attack === 'maul').pop();
  assert.deepEqual(release.cells, finalWarning);
});

test('Hive restores stage-one third nest and all stage egg counts without a five-egg cap', () => {
  for (let stage = 0; stage < 4; stage++) {
    const f = fixture('bl_hive'); isolate(f, { aura: 100 }, stage); f.turn();
    assert.equal(f.game.enemies.filter(actor => actor.structure === 'egg').length, 2 + stage);
    assert.equal(f.game.hazards[0].life, 5);
    assert.equal(f.game.hazards[0].delay, 1);
    assert.equal(f.game.hazards[0].damage, Math.round(7 * Math.pow(1.2, stage)));
    for (let i = 0; i < 12; i++) f.turn();
    assert.equal(f.game.enemies.filter(actor => actor.structure === 'nest').length, stage >= 1 ? 3 : 2);
    assert.equal(f.game.enemies.filter(actor => actor.structure === 'egg').length, (2 + stage) * 4);
  }
});

test('Hive tendril restores additive damage and original defense subtraction', () => {
  const f = fixture('bl_hive'); isolate(f, { aura: 100 }); f.player.x = f.boss.x - 2; f.turn();
  const hit = f.events.find(event => event.kind === 'impact' && event.attack === 'tendril');
  assert.equal(hit.amount, f.boss.atk + 3); assert.equal(hit.armor, .5);
});

test('Fixed minimum damage receives the same stage multiplier', () => {
  const hive = fixture('bl_hive'); isolate(hive, { aura: 100 }, 3); hive.boss.atk = 1; hive.turn();
  assert.equal(hive.game.hazards.find(field => field.kind === 'acid').damage, Math.round(4 * 1.728));
  const mirror = fixture('bl_mirror'); isolate(mirror, {}, 3); mirror.boss.atk = 1; mirror.turn();
  assert(mirror.boss.intent.shots.slice(1).every(beam => beam.damage === Math.round(2 * 1.728)));
});

test('Warden restores full-radius hammer and unconditional seventy-percent aftershock', () => {
  const f = fixture('bl_warden'); isolate(f); f.player.x = f.boss.x - 4; f.turn();
  const intent = f.boss.intent;
  assert.equal(intent.kind, 'hammer'); assert.equal(intent.damage, 30); assert.equal(intent.turns, 1);
  assert.equal(intent.cells.length, 49); assert.equal(intent.aftershock, true);
  assert.equal(f.boss.brain.combat.cooldowns.hammer, 5);
  f.turn();
  const echo = f.game.hazards.find(field => field.kind === 'echo');
  assert.equal(echo.damage, 21); assert.equal(echo.life, 1); assert.equal(echo.delay, 1);
  assert.deepEqual(echo.cells, intent.cells);
});

test('Warden restores repair strength, interruption threshold, shield bash and plate recovery', () => {
  const f = fixture('bl_warden'); isolate(f, { hammer: 100 }); f.boss.hp = f.boss.maxHp * .55;
  f.boss.brain.plate = 0; f.turn();
  assert.equal(f.boss.intent.kind, 'repair'); assert.equal(f.boss.brain.combat.cooldowns.repair, 8);
  assert.equal(f.boss.intent.breakThreshold, f.boss.maxHp * .045);
  f.boss.hp -= f.boss.maxHp * .04; const damaged = f.boss.hp;
  f.turn(); assert(f.boss.intent); f.turn();
  assert.equal(f.boss.hp, damaged + Math.round(f.boss.maxHp * .08)); assert.equal(f.boss.brain.plate, 35);
  f.boss.brain.plate = 0; f.boss.brain.vent = 0; f.boss.brain.combat.cooldowns.repair = 100;
  f.player.x = f.boss.x - 2;
  for (let i = 0; i < 4; i++) f.turn();
  assert.equal(f.boss.brain.plate, 100);
  assert.equal(f.events.filter(event => event.kind === 'impact' && event.attack === 'rect').pop().amount, 13);
});

test('Lance restores actual thirty-two-cell rail, damage, defense factor and lane persistence', () => {
  const f = fixture('bl_lance'); isolate(f, { hook: 100 }); f.turn();
  const intent = f.boss.intent;
  assert.equal(intent.kind, 'rail'); assert.equal(intent.turns, 1); assert.equal(intent.damage, Math.round(f.boss.atk * 2.2));
  assert(f.events.some(event => event.kind === 'ray' && event.range === 32));
  f.turn();
  const hit = f.events.filter(event => event.kind === 'impact' && event.amount === intent.damage).pop();
  assert.equal(hit.armor, .5); assert.deepEqual(hit.cells, intent.cells);
  const lane = f.game.hazards.find(field => field.kind === 'rail');
  assert.equal(lane.damage, Math.round(f.boss.atk * .8)); assert.equal(lane.life, 2); assert.equal(lane.delay, 1);
  const hook = fixture('bl_lance'); isolate(hook, { rail: 100 }); hook.turn();
  assert.equal(hook.events.find(event => event.kind === 'pull').steps, 3);
  const late = fixture('bl_lance'); isolate(late, { rail: 100, hook: 100 }, 2); late.turn();
  assert.equal(late.events.find(event => event.kind === 'impact').amount, Math.round(late.boss.atk * 1.44));
  assert.equal(late.events.find(event => event.kind === 'ray').range, 32);
});

test('Mine restores stage-one count, radius, lifetime, damage, link lifetime and pulse', () => {
  const f = fixture('bl_mine'); isolate(f, {}, 1);
  f.hooks.magnetWeave = owner => f.hooks.field(owner, 'magnet-link', [{ x: 5, y: 5 }], 1, 9, 0);
  f.turn();
  const mines = f.game.hazards.filter(field => field.kind === 'mine');
  assert.equal(mines.length, 3);
  assert(mines.every(field => field.cells.length === 9 && field.life === 9 && field.delay === 1 && field.damage === Math.round(f.boss.atk * 1.8 * 1.2)));
  assert.equal(f.game.hazards.find(field => field.kind === 'magnet-link').life, 9);
  f.turn(); f.turn();
  assert.equal(f.boss.intent.kind, 'magnet'); assert.equal(f.boss.brain.combat.cooldowns.detonate, 5);
  assert.equal(f.events.find(event => event.kind === 'pulse').amount, Math.round(f.boss.atk * .8 * 1.2));
  const warned = new Set(f.boss.intent.cells.map(cell => `${cell.x},${cell.y}`));
  f.turn();
  assert(f.game.hazards.filter(field => field.kind === 'mine').every(field => field.remote && field.delay === 0 && field.cells.every(cell => warned.has(`${cell.x},${cell.y}`))));
});

test('Mirror restores early focus, separate body/mirror damage, ranges and ten-mirror cap', () => {
  const f = fixture('bl_mirror'); isolate(f); f.turn();
  const intent = f.boss.intent;
  assert.equal(intent.kind, 'mirror-prime'); assert.equal(f.boss.brain.combat.cooldowns.focus, 3);
  assert.deepEqual(f.events.filter(event => event.kind === 'ray').slice(0, 4).map(event => event.range), [32, 24, 24, 24]);
  assert.deepEqual(intent.shots.map(beam => beam.damage), [23, 12, 12, 12]);
  f.turn();
  assert(f.events.filter(event => event.kind === 'impact').every(event => event.armor === .5));
  f.player.hp = 100000; f.player.maxHp = 100000;
  for (let i = 0; i < 26; i++) f.turn();
  assert.equal(f.game.enemies.filter(actor => actor.structure === 'mirror').length, 10);
  const melee = fixture('bl_mirror'); isolate(melee, { focus: 100 }); melee.player.x = melee.boss.x - 1; melee.turn();
  assert.equal(melee.events.find(event => event.kind === 'impact' && event.attack === 'slash').amount, melee.boss.atk + 1);
});

test('Eye restores scan damage, stage-one orthogonal beam, pulse and bomb parameters', () => {
  const f = fixture('bh_eye'); isolate(f, { overexpose: 100 }, 1); f.turn();
  const shots = f.events.filter(event => event.kind === 'impact');
  assert.deepEqual(shots.map(event => event.amount), [Math.round((f.boss.atk + 4) * 1.2), Math.round((f.boss.atk + 2) * 1.2)]);
  assert(shots.every(event => event.armor === .5));
  assert(f.events.filter(event => event.kind === 'ray').every(event => event.range === 32));
  const bomb = f.game.hazards.find(field => field.kind === 'bomb');
  assert.equal(bomb.cells.length, 25); assert.equal(bomb.delay, 1); assert.equal(bomb.life, 1);
  assert.equal(bomb.damage, Math.round(f.boss.atk * 1.8 * 1.2));
  f.turn(); assert.equal(f.boss.brain.combat.cooldowns.pulse, 3);
  assert.equal(f.events.find(event => event.kind === 'pulse').amount, Math.round(Math.max(f.boss.atk * .7, 8 + f.game.depth) * 1.2));
});

test('Annihilation warns its full visible outer area and preserves inner/cover refuge with phase protection', () => {
  for (const [id, factor, cd] of [['bh_eye', 3.2, 8], ['bh_phase', 3.5, 6]]) {
    const f = fixture(id); isolate(f);
    if (id === 'bh_phase') f.boss.hp = f.boss.maxHp * .2;
    for (let y = 1; y < 22; y++) f.game.map[y][16] = 1;
    f.turn(); const intent = f.boss.intent;
    assert.equal(intent.kind, 'annihilate'); assert.equal(intent.turns, 2); assert.equal(f.boss.phaseT, 2);
    assert.equal(intent.damage, Math.round(f.boss.atk * factor)); assert.equal(intent.armorFactor, .35);
    assert.equal(f.boss.brain.combat.cooldowns[id === 'bh_eye' ? 'overexpose' : 'rift'], cd);
    assert(intent.cells.some(cell => f.distance(cell, f.boss) > 9));
    assert(intent.cells.every(cell => f.distance(cell, f.boss) >= 3 && cell.x < 16));
    f.player.x = f.boss.x - 1; const hp = f.player.hp; f.turn(); assert.equal(f.boss.phaseT, 1);
    const beforeRelease = f.player.hp; f.turn(); assert.equal(f.boss.phaseT, 0); assert.equal(f.player.hp, beforeRelease);
    const hit = f.events.filter(event => event.kind === 'impact' && event.attack === 'annihilate').pop();
    assert.deepEqual(hit.cells, intent.cells); assert.equal(hit.armor, .35);
    assert(f.player.hp <= hp);
  }
});

test('Stun and phase switching clear restored annihilation protection', () => {
  const f = fixture('bh_phase'); isolate(f); f.boss.hp = f.boss.maxHp * .2; f.turn();
  assert.equal(f.boss.phaseT, 2); f.boss.hp = f.boss.maxHp * .5; f.turn(); assert.equal(f.boss.phaseT, 0);
  const eye = fixture('bh_eye'); eye.turn(); eye.boss.stun = 1; eye.turn();
  assert.equal(eye.boss.intent, null); assert.equal(eye.boss.phaseT, 0);
});

test('Cover raised during annihilation windup protects cells inside the original warning', () => {
  const f = fixture('bh_eye'); isolate(f); f.turn();
  const warned = new Set(f.boss.intent.cells.map(cell => `${cell.x},${cell.y}`));
  assert(warned.has(`${f.player.x},${f.player.y}`));
  for (let y = 1; y < 22; y++) f.game.map[y][10] = 1;
  const hp = f.player.hp; f.turn(); f.turn(); assert.equal(f.player.hp, hp);
  const hit = f.events.find(event => event.kind === 'impact' && event.attack === 'annihilate');
  assert(hit.cells.every(cell => cell.x > 10 && warned.has(`${cell.x},${cell.y}`)));
});

test('Mother restores pull range/steps/frequency and the original pulse alongside node surge', () => {
  const f = fixture('bh_hive'); isolate(f); f.player.x = 3; f.turn();
  assert.equal(f.events.find(event => event.kind === 'pull').steps, 4); assert.equal(f.boss.brain.combat.cooldowns.pull, 5);
  f.turn(); f.turn();
  assert.equal(f.boss.intent.kind, 'surge'); assert.equal(f.boss.intent.damage, Math.round(f.boss.atk * 1.25));
  assert.equal(f.boss.brain.combat.cooldowns.surge, 3);
  assert.equal(f.events.find(event => event.kind === 'pulse').amount, Math.round(f.boss.atk * .65));
  const close = fixture('bh_hive'); isolate(close, { pull: 100, surge: 100 }); close.player.x = close.boss.x - 2; close.turn();
  assert.equal(close.events.find(event => event.kind === 'impact').amount, Math.round(Math.max(close.boss.atk * 1.1, close.boss.atk + 2)));
});

test('Phase cleaver restores full radius and charge restores damage, cooldown and actual-history echo', () => {
  const physical = fixture('bh_phase'); isolate(physical); physical.player.x = physical.boss.x - 3; physical.turn();
  assert.equal(physical.boss.intent.cells.length, 25); assert.equal(physical.boss.intent.damage, 68); physical.turn();
  assert.equal(physical.game.hazards.find(field => field.kind === 'echo').damage, Math.round(68 * .7));
  const rift = fixture('bh_phase'); isolate(rift, { rift: 100 }); rift.boss.hp = rift.boss.maxHp * .2; rift.turn();
  const origin = { x: rift.boss.x, y: rift.boss.y };
  assert.equal(rift.boss.intent.kind, 'charge'); assert.equal(rift.boss.intent.damage, Math.round(rift.boss.atk * 1.8));
  assert.equal(rift.boss.brain.combat.cooldowns.charge, 2); rift.turn();
  const echo = rift.game.hazards.find(field => field.kind === 'echo');
  assert.equal(echo.damage, Math.round(rift.boss.atk * 1.2)); assert.equal(echo.delay, 2); assert.equal(echo.life, 1);
  assert(echo.cells.some(cell => cell.x === origin.x && cell.y === origin.y));
});

test('Existing low-health composite retains its damage and aftershock with a complete snapshot warning', () => {
  const f = fixture('bl_hound'); isolate(f, { maul: 100, charge: 100, composite: 0 });
  f.boss.hp = f.boss.maxHp * .37; f.turn(); f.turn(); f.turn();
  const intent = f.boss.intent;
  assert.equal(intent.kind, 'composite'); assert.equal(intent.turns, 2);
  assert.equal(intent.damage, Math.round(f.boss.atk * 2.1)); assert.equal(f.boss.brain.combat.cooldowns.composite, 7);
  f.turn(); f.turn();
  const hit = f.events.find(event => event.kind === 'impact' && event.attack === 'maul' && event.amount === intent.damage);
  assert.deepEqual(hit.cells, intent.cells);
  assert.equal(f.game.hazards.find(field => field.kind === 'echo').damage, Math.round(intent.damage * .7));
});

console.log(JSON.stringify({ passed: true, tests: results.length, results }, null, 2));
