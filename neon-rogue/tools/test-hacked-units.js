const assert = require('node:assert/strict');
const { create } = require('../hacked-units');

const checks = [];
function test(name, run) {
  run();
  checks.push(name);
}

function fixture(ai, options = {}) {
  let serial = 0;
  const events = [];
  const player = { x: 18, y: 18, hp: 100, maxHp: 100, def: 0 };
  const game = { turn: 0, depth: options.depth || 1, state: 'play', enemies: [], allies: [], beams: [], hazards: [],
    map: Array.from({ length: 20 }, (_, y) => Array.from({ length: 20 }, (_, x) => x && y && x < 19 && y < 19 ? 0 : 1)) };
  const specs = ['chase', 'turret', 'charger', 'exploder', 'summoner', 'healer', 'tank'].map(role => ({
    id: role, name: role, ai: role, minDepth: options.tier ? (options.tier - 1) * 5 + 1 : 1,
    maxDepth: 99, range: 5, cooldown: role === 'healer' ? 3 : role === 'summoner' ? 4 : 2,
    glyph: 'hex', color: '#ff365c'
  }));
  function spawn(spec, x, y) {
    return { spec, id: spec.id, name: spec.name, ai: spec.ai, x, y, hp: 100, maxHp: 100, atk: 10, def: 3,
      range: spec.range, cd: 0, tick: 0, stun: 0, burn: 0, color: spec.color, glyph: spec.glyph,
      buffs: [], brain: { step: 3 }, alerted: true, elite: false, boss: false };
  }
  function area(x, y, radius, inner = 0) {
    const cells = [];
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < inner) continue;
      if (game.map[y + dy]?.[x + dx] === 0) cells.push({ x: x + dx, y: y + dy });
    }
    return cells;
  }
  function line(origin, range, x, y) {
    const dx = x - origin.x, dy = y - origin.y, length = Math.max(Math.abs(dx), Math.abs(dy));
    if (!length) return [];
    const cells = [];
    for (let i = 1; i <= range; i++) {
      const cell = { x: Math.round(origin.x + dx / length * i), y: Math.round(origin.y + dy / length * i) };
      if (game.map[cell.y]?.[cell.x] !== 0) break;
      cells.push(cell);
    }
    return cells;
  }
  function pathField(x, y) {
    const map = game.map.map(row => row.map(() => -1));
    const queue = [{ x, y }];
    map[y][x] = 0;
    for (let i = 0; i < queue.length; i++) {
      const cell = queue[i];
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
        const nx = cell.x + dx, ny = cell.y + dy;
        if (game.map[ny]?.[nx] !== 0 || map[ny][nx] !== -1) continue;
        map[ny][nx] = map[cell.y][cell.x] + 1;
        queue.push({ x: nx, y: ny });
      }
    }
    return map;
  }
  const mods = Object.fromEntries(['beam', 'multi', 'arc', 'kh_airstrike', 'dome_audit', 'blink', 'sandevistan',
    'shield', 'grow', 'drone', 'stealth', 'heal_stealth', 'mech', 'mb_parasite', 'mb_split', 'mine', 'dome_nda', 'other'].map(type => [type, { active: { type, name: type } }]));
  const hooks = {
    player: () => player, monsters: specs, mods, random: () => .5, now: () => game.turn * 100,
    uid: actor => actor.uid || (actor.uid = ++serial), spawn, area, line, pathField,
    wallAt: () => false, los: () => options.los !== false,
    ray(origin, x, y, range) {
      const cells = line(origin, range, x, y), last = cells.at(-1) || origin;
      return { cells, segments: [{ x0: origin.x + .5, y0: origin.y + .5, x1: last.x + .5, y1: last.y + .5 }] };
    },
    damage(target, amount, source) {
      const shield = target.shieldT > 0 ? .7 : 1;
      const guard = target.guard > 0 ? target.guard : 1;
      const dealt = Math.max(1, Math.round(amount * shield * guard));
      target.hp -= dealt;
      events.push({ kind: 'damage', target, amount: dealt, source });
      return dealt;
    },
    kill(target) { game.enemies.splice(game.enemies.indexOf(target), 1); events.push({ kind: 'kill', target }); },
    hurtPlayer(amount) { player.hp -= amount; return amount; },
    burst() {}, float() {}, fx(cells, tint, kind) { events.push({ kind, cells, tint }); }
  };
  const runtime = create(game, hooks);
  const actor = spawn(specs.find(spec => spec.ai === ai), 2, 2);
  actor.hp = 77;
  const target = spawn(specs[0], options.targetX || 4, options.targetY || 2);
  target.hp = target.maxHp = 1000;
  target.def = 4;
  game.enemies.push(actor, target);
  runtime.capture(actor, 12, '#57ffa8');
  game.enemies.splice(game.enemies.indexOf(actor), 1);
  game.allies.push(actor);
  function advance() {
    game.turn++;
    runtime.tickFields();
    game.allies.slice().forEach(ally => { ally.turns--; runtime.act(ally); });
  }
  return { runtime, actor, target, player, game, hooks, events, advance, spawn, specs };
}

test('Capture keeps every combat stat, spec, current cast and equipment state', () => {
  const f = fixture('turret');
  const actor = f.actor;
  actor.corpKit = { mods: ['beam'], cd: 2, i: 0 };
  actor.psycho = { mods: ['shield'], cd: 1 };
  actor.shieldT = 3;
  actor.vulnT = 2;
  actor.intent = { kind: 'charge', damage: 22, turns: 2, total: 2, cells: [{ x: 3, y: 2 }] };
  const original = { spec: actor.spec, brain: actor.brain, corpKit: actor.corpKit, psycho: actor.psycho, intent: actor.intent };
  assert.strictEqual(f.runtime.capture(actor, 12), actor);
  for (const key of Object.keys(original)) assert.strictEqual(actor[key], original[key]);
  assert.deepEqual([actor.hp, actor.maxHp, actor.atk, actor.def, actor.range, actor.shieldT, actor.vulnT], [77, 100, 10, 3, 5, 3, 2]);
  const saved = JSON.parse(JSON.stringify(actor));
  assert(f.runtime.handles(saved));
  assert.equal(saved.intent.damage, 22);
  assert.equal(saved.corpKit.cd, 2);
});

test('Legacy generic allies remain recognizable by their existing caller', () => {
  const f = fixture('chase');
  const legacy = { kind: 'hacked', hijack: true, atk: 7, turns: 5, x: 2, y: 2 };
  assert.equal(f.runtime.handles(legacy), false);
  assert.equal(f.runtime.act(legacy), false);
  assert.equal(legacy.hp, undefined);
});

test('Chase attacks with original enemy ATK/random/DEF formula, without player bonuses', () => {
  const f = fixture('chase', { targetX: 3 });
  f.advance();
  assert.equal(f.target.hp, 994);
  assert.equal(f.player.hp, 100);
});

test('Turret retains range, LOS, two-shot burst and cooldown', () => {
  const f = fixture('turret', { targetX: 8 });
  f.advance();
  assert.equal(f.target.hp, 1000);
  f.target.x = 7;
  f.advance();
  assert.equal(f.target.hp, 990);
  assert.equal(f.game.beams.length, 2);
  assert.equal(f.actor.cd, 2);
  f.advance();
  assert.equal(f.target.hp, 990);
  f.advance();
  assert.equal(f.target.hp, 980);
  const blocked = fixture('turret', { los: false });
  blocked.advance();
  assert.equal(blocked.game.beams.length, 0);
});

test('Upper-tier turret keeps three rays and its extended range', () => {
  const f = fixture('turret', { tier: 2, targetX: 8 });
  f.advance();
  assert.equal(f.game.beams.length, 3);
  assert.equal(f.target.hp, 985);
});

test('Charger keeps telegraph delay, charge path, target collision and 1.7 ATK', () => {
  const f = fixture('charger', { targetX: 6 });
  f.advance();
  assert.equal(f.actor.intent.kind, 'charge');
  assert.equal(f.actor.intent.turns, 1);
  assert.equal(f.target.hp, 1000);
  f.advance();
  assert.equal(f.target.hp, 987);
  assert.equal(f.actor.x, 5);
  assert.equal(f.actor.cd, 2);
});

test('Exploder keeps area damage, armor factor, self-destruction and finite acid', () => {
  const f = fixture('exploder', { depth: 6, targetX: 3 });
  f.advance();
  assert.equal(f.actor.intent.kind, 'explode');
  assert.equal(f.target.hp, 1000);
  f.advance();
  assert.equal(f.target.hp, 984);
  assert.equal(f.game.allies.length, 0);
  assert.equal(f.runtime.fields().length, 1);
  for (let i = 0; i < 3; i++) { f.game.turn++; f.runtime.tickFields(); }
  assert.equal(f.target.hp, 972);
  assert.equal(f.runtime.fields().length, 0);
});

test('Summoner preserves child scaling, roles, same team and control deadline', () => {
  const f = fixture('summoner', { targetX: 9 });
  f.advance();
  const child = f.game.allies.find(actor => actor !== f.actor);
  assert(child && ['chase', 'exploder'].includes(child.ai));
  assert.deepEqual([child.hp, child.maxHp, child.atk], [85, 85, 10]);
  assert.equal(child.hackedExpiresTurn, f.actor.hackedExpiresTurn);
  assert.equal(child.team, 'player');
  assert.equal(f.actor.cd, 4);
  f.game.turn = child.hackedExpiresTurn;
  f.runtime.act(child);
  assert(!f.game.allies.includes(child));
});

test('Upper-tier summoner keeps egg incubation and its original offspring roles', () => {
  const f = fixture('summoner', { tier: 2, depth: 6, targetX: 9 });
  f.actor.tick = 6;
  f.actor.cd = 9;
  f.advance();
  const egg = f.game.allies.find(actor => actor.structure === 'egg');
  assert(egg);
  assert.equal(egg.hp, 18);
  assert.equal(egg.incubation, 3);
  for (let i = 0; i < 3; i++) f.advance();
  assert(!f.game.allies.includes(egg));
  assert(f.game.allies.some(actor => actor.sourceUid === egg.uid && ['tank', 'summoner', 'charger'].includes(actor.ai)));
});

test('Healer retains wounded-first target order, heal amount and shield duration', () => {
  const f = fixture('healer', { tier: 2, targetX: 6 });
  for (const [y, hp] of [[3, 20], [4, 60]]) {
    const ally = f.spawn(f.specs[0], 2, y);
    f.runtime.capture(ally, 12);
    ally.hp = hp;
    f.game.allies.push(ally);
  }
  f.game.turn++;
  f.actor.turns--;
  f.runtime.act(f.actor);
  assert.deepEqual(f.game.allies.slice(1).map(actor => actor.hp), [36, 76]);
  assert(f.game.allies.slice(1).every(actor => actor.shieldT === 2));
  assert.equal(f.actor.cd, 3);
});

test('Healer remains a support unit after the last hostile is gone', () => {
  const f = fixture('healer');
  f.game.enemies = [];
  f.player.x = 2; f.player.y = 4; f.player.hp = 50;
  f.advance();
  assert.equal(f.player.hp, 66);
});

test('Tank retains mitigation, two-turn hammer and 2.2 ATK area attack', () => {
  const f = fixture('tank');
  f.advance();
  assert.equal(f.actor.guard, .55);
  assert.equal(f.actor.intent.turns, 2);
  assert.equal(f.runtime.receive(f.actor, 20, f.target), 11);
  f.advance();
  assert.equal(f.target.hp, 1000);
  f.advance();
  assert.equal(f.target.hp, 982);
  assert.equal(f.actor.cd, 3);
});

test('Burn, bleed, ignite, stun and disarm survive conversion and tick once', () => {
  const f = fixture('chase', { targetX: 3 });
  Object.assign(f.actor, { burn: 2, bleedStacks: 3, igniteT: 1, igniteDmg: 4, stun: 1, shieldT: 2, cd: 2 });
  f.advance();
  assert.equal(f.actor.hp, 69);
  assert.deepEqual([f.actor.burn, f.actor.bleedStacks, f.actor.igniteT, f.actor.stun, f.actor.shieldT, f.actor.cd], [1, 2, 0, 0, 1, 1]);
  assert.equal(f.target.hp, 1000);
  f.actor.disarmT = 1;
  f.advance();
  assert.equal(f.actor.disarmT, 0);
  assert.equal(f.target.hp, 1000);
});

test('Captured experiment keeps its existing double-ATK berserk bite', () => {
  const f = fixture('chase', { targetX: 3 });
  f.actor.berserk = true;
  f.advance();
  assert.equal(f.target.hp, 980);
});

test('Existing parasite status keeps damage, healing callback and expiry', () => {
  const f = fixture('chase', { targetX: 3 });
  let healed = 0;
  f.hooks.healPlayer = amount => { healed += amount; return amount; };
  f.actor.parasite = { dmg: 6, turns: 1 };
  f.advance();
  assert.equal(f.actor.hp, 71);
  assert.equal(healed, 6);
  assert.equal(f.actor.parasite, null);
});

for (const psychic of [false, true]) {
  const types = psychic ? ['beam', 'multi', 'arc', 'blink', 'sandevistan', 'shield', 'grow', 'stealth', 'heal_stealth', 'mech', 'other']
    : ['beam', 'multi', 'arc', 'kh_airstrike', 'dome_audit', 'blink', 'sandevistan', 'shield', 'grow', 'drone', 'stealth', 'heal_stealth', 'mb_parasite', 'mb_split', 'mine', 'dome_nda', 'other'];
  for (const type of types) test(`${psychic ? 'Psycho' : 'Corporate'} equipment preserves ${type} branch`, () => {
    const f = fixture('turret');
    f.actor[psychic ? 'psycho' : 'corpKit'] = { mods: [type], cd: 1, i: 0 };
    f.advance();
    assert.equal(f.actor[psychic ? 'psycho' : 'corpKit'].cd, 3);
    if (/beam|multi|arc|airstrike|audit/.test(type)) {
      assert.equal(f.actor.intent.damage, 15);
      assert.equal(f.actor.intent.turns, type === 'kh_airstrike' ? 2 : 1);
    } else if (/shield|grow|drone|stealth|heal|mech/.test(type)) {
      assert.equal(f.actor.hp, 89);
      assert.equal(f.actor.shieldT, 3);
    } else if (type === 'mb_parasite') {
      assert.equal(f.target.hp, 991);
      assert.equal(f.actor.hp, 86);
    } else if (type === 'mb_split' || type === 'mine') assert.equal(f.game.allies.length, 2);
    else if (type === 'dome_nda') assert(f.target.buffs.some(buff => buff.id === 'slow' && buff.turns === 2));
    else if (type === 'other') assert.equal(f.actor.intent.damage, 17);
    else assert.equal(f.target.hp, 994);
    assert.equal(f.player.hp, 100);
  });
}

test('Pending delayed casts and migrated hazards cannot outlive the control deadline', () => {
  const f = fixture('tank');
  f.actor.turns = 1;
  f.actor.intent = { kind: 'hammer', turns: 2, total: 2, cells: [{ x: f.target.x, y: f.target.y }], damage: 22 };
  f.game.hazards.push({ sourceUid: f.actor.uid, cells: [{ x: 4, y: 2 }], kind: 'acid', damage: 5, life: 10, delay: 0, bornTurn: 0, orphan: true });
  f.runtime.capture(f.actor, 1);
  assert.equal(f.game.hazards.length, 0);
  assert.equal(f.runtime.fields().length, 1);
  f.advance();
  assert.equal(f.game.allies.length, 0);
  assert.equal(f.target.hp, 1000);
  assert.equal(f.runtime.fields().length, 0);
});

console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
