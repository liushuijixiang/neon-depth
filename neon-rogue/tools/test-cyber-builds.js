'use strict';
// Read-only browser tests against index.html + CURRENT game.js, never stale dist.html.
// Run: node tools/test-cyber-builds.js
// Existing defects intentionally fail contract tests. --characterize only makes those
// contract failures non-fatal; proven-working regression tests remain fatal.
// No source files, save files, or generated build artifacts are modified.
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');
const ROOT = path.resolve(__dirname, '..');
const characterize = process.argv.includes('--characterize');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.addInitScript(() => { localStorage.clear(); localStorage.setItem('neon-depth-mute', '1'); });
    await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);
    await page.waitForFunction(() => window.__neon && window.__neon.test);
    const report = await page.evaluate(() => {
      const N = window.__neon, T = N.test, G = N.G, rows = [];
      const caps = { gray: 1, green: 2, blue: 3, purple: 3, orange: 4, red: 4 };
      const originalRandom = Math.random;
      function eq(a, b, why) { if (Math.abs(a - b) > 1e-8) throw Error(`${why}: actual=${a}, expected=${b}`); }
      function ok(value, why) { if (!value) throw Error(why); }
      function check(kind, name, fn) {
        try { const detail = fn(); rows.push({ kind, name, pass: true, detail }); }
        catch (e) { rows.push({ kind, name, pass: false, error: e.message }); }
      }
      function clear() {
        T.hideOverlay(); G.paused = false; G.busy = false; G.hitStopUntil = 0;
        N.p.pending = 0; G.pendingEvo = 0; G.pendingBoons = 0;
      }
      function fresh(cls = 'assault') {
        Math.random = () => 0.713;
        N.meta.up = {}; G.prepPick = null; G.rushPending = null; G.trainPending = true;
        G.classId = cls; N.startGame(); clear(); T.genTrainMap(); G.adaptBonus = 999; G.plainInst = true; G.inst = {}; // stat contracts measure raw values, not overload
        for (let y = 0; y < 30; y++) for (let x = 0; x < 44; x++) G.map[y][x] = x && y && x < 43 && y < 29 ? 0 : 1;
        G.enemies = []; G.allies = []; G.items = []; G.quests = []; G.walls = [];
        G.hazards = []; G.mines = []; G.special = null; G.stairs = null; G.bossAlive = false;
        G.depth = 15; G.turn = 0; G.combo = 0; G.lastKill = -99;
        G.freeze = 50; G.overT = 0; G.burnout = false; G.instab = 25;
        G.trainBonus = null; G.chal = null; G.rushMods = null;
        N.p.x = 10; N.p.y = 10; N.p.face = 0; N.p.level = 16; N.p.xp = 0; N.p.next = 100000;
        N.p.buffs = []; N.recalc(); N.p.hp = N.p.maxHp; N.computeFOV();
        Math.random = () => 0.99;
      }
      function gear(id, slot) { N.applyMod(N.mods.find(m => m.id === id)); if (slot && G.cyber[slot] !== id) N.installCyber(id, slot); clear(); }
      function enemy(x = 11, y = 10, extras = {}) {
        const spec = window.NEON.monsters.find(m => !m.boss && m.ai === 'chase');
        const e = T.spawnEnemy(spec, x, y, 1);
        Object.assign(e, { hp: 100000, maxHp: 100000, def: 0, atk: 0, xp: 0, elite: false,
          boss: false, alerted: true, cd: 999, stun: 999, tick: 0, burn: 0, bleedStacks: 0,
          guard: 0, phaseT: 0, armorT: 0, recovery: 0, intent: null }, extras);
        G.enemies.push(e); N.computeFOV(); return e;
      }
      function attackValue() { return N.p.atk + G.mod.atk + (G.mech > 0 ? 4 : 0); }
      function stats() { return { atk: attackValue(), hp: N.p.maxHp, def: N.p.def,
        crit: G.mod.crit || 0, dodge: G.mod.dodge || 0, execute: G.mod.execute || 0,
        lifesteal: G.mod.lifesteal || 0, critMult: G.mod.critMult || 0 }; }
      function sumChips() {
        const s = { atk: 0, hp: 0, def: 0, crit: 0, dodge: 0, execute: 0 };
        Object.values(G.cyberChips).flat().forEach(c => [c, ...(c.affixes || [])].forEach(a => { if (s[a.stat] !== undefined) s[a.stat] += a.val; }));
        return s;
      }
      function fillChips() {
        const ids = ['atk', 'hp', 'def', 'crit', 'dodge', 'compat', 'power', 'skill']; let i = 0;
        Object.keys(G.cyber).forEach(slot => {
          const m = N.mods.find(m => m.id === G.cyber[slot]);
          while ((G.cyberChips[slot] || []).length < caps[m.quality]) {
            const c = N.makeChip(ids[i++ % ids.length], 'red'); N.addChipObject(c);
          }
        });
        N.recalc(); return sumChips();
      }
      const allRed = ['eye_red', 'quantum_processor', 'hand_red', 'assault_hand_r', 'body_red', 'spine_red', 'legL_red', 'hunt_leg_r'];
      check('contract', '32 red chips: every main/secondary stat applied exactly once', () => {
        fresh(); allRed.forEach(id => gear(id)); const before = stats(), sum = fillChips(), after = stats();
        Object.keys(sum).forEach(k => eq(after[k] - before[k], sum[k], k));
        for (let i = 0; i < 8; i++) N.recalc();
        Object.keys(after).forEach(k => eq(stats()[k], after[k], 'idempotent ' + k));
        return { before, sum, after };
      });
      check('contract', 'unsocket/equip removes chip stats and never leaves ghost bonuses', () => {
        fresh(); gear('hand_red'); const before = stats(); N.addChipObject(N.makeChip('atk', 'red')); N.recalc();
        const chip = sumChips(); eq(stats().atk - before.atk, chip.atk, 'socketed ATK');
        T.unequipCyber('handL'); eq(stats().atk, before.atk - 4, 'unequipped ATK');
        gear('hand_red', 'handL'); eq(stats().atk, before.atk, 're-equipped empty implant');
      });
      check('contract', 'item/meta ATK reaches both bullets of the upgraded gun', () => {
        fresh(); G.gunUp = { dmg: 3, double: 1 }; const e = enemy();
        const hp = e.hp; T.shootAt(e); const before = hp - e.hp;
        N.p.itemAtk += 10; N.recalc(); const hp2 = e.hp; T.shootAt(e);
        eq(hp2 - e.hp - before, 20, '+10 ATK x two bullets');
      });
      function directAttack(channel, mod) {
        fresh(channel === 'ghost' ? 'ghost' : 'assault');
        if (channel === 'cyber') gear('assault_hand_r');
        Object.assign(G.runMod, { crit: -0.1 }, mod); N.recalc();
        const e = enemy(11, 10, { hp: 20000, marks: 5, marked: true });
        G.instab = channel === 'ghost' ? 75 : 25; G.ghostRevealed = true;
        N.p.hp = 30; const hp = e.hp, self = N.p.hp;
        if (channel === 'gun') T.shootAt(e);
        if (channel === 'cyber') N.useCyberActive('assault_hand_r');
        if (channel === 'ghost') N.ghostAct('execute');
        return { damage: hp - e.hp, heal: N.p.hp - self };
      }
      for (const channel of ['gun', 'cyber', 'ghost']) {
        check('contract', channel + ': generic low-HP execute affix is honored', () => {
          const a = directAttack(channel, { execute: 0 });
          const b = directAttack(channel, { execute: 1 });
          ok(b.damage > a.damage, JSON.stringify({ a, b })); return { a, b };
        });
        check('contract', channel + ': generic lifesteal is honored', () => {
          const a = directAttack(channel, { lifesteal: 0 });
          const b = directAttack(channel, { lifesteal: 0.5 });
          ok(b.heal > a.heal, JSON.stringify({ a, b })); return { a, b };
        });
      }
      for (const channel of ['cyber', 'ghost']) check('contract', channel + ': guaranteed crit and critMult change direct damage', () => {
        const a = directAttack(channel, { crit: -0.1, critMult: 0 });
        const b = directAttack(channel, { crit: 1, critMult: 0.5 });
        ok(b.damage > a.damage, JSON.stringify({ a, b })); return { a, b };
      });
      check('contract', 'cooldown_core shortens CYBER actives, not only legacy abilities', () => {
        function cd(core) { fresh(); gear('assault_hand_r'); if (core) gear('cooldown_core'); enemy(); N.useCyberActive('assault_hand_r'); return G.cyberCd.assault_hand_r; }
        const a = cd(false), b = cd(true); eq(a - b, 1, 'cooldown reduction'); return { a, b };
      });
      check('contract', 'shield/support implants can earn growth through successful use', () => {
        fresh(); gear('body_red');
        for (let i = 0; i < 3; i++) { G.cyberCd.body_red = 0; N.useCyberActive('body_red'); }
        ok((G.cyberGrowth.body_red || {}).lv >= 2, JSON.stringify(G.cyberGrowth));
      });
      check('contract', 'Sandevistan refreshes normal-mode FOV after free movement', () => {
        fresh(); G.mode = 'normal'; G.freeze = 0; gear('sandevistan'); const e = enemy(18, 10);
        N.computeFOV(); ok(!G.vis[e.y][e.x], 'target starts outside vision');
        N.useCyberActive('sandevistan'); N.doMove(1, 0); N.doMove(1, 0);
        ok(!!G.sandev, 'still in time slow'); ok(!!G.vis[e.y][e.x], 'target now six tiles away must be visible');
      });
      check('contract', 'red leg blink travels four tiles, not cumulative 1+2+3+4', () => {
        fresh(); gear('legL_red'); const x = N.p.x; N.useCyberActive('legL_red');
        eq(N.p.x - x, 4, 'straight unobstructed blink distance');
      });
      check('contract', 'melee splash does not inherit PRIMARY target guard mitigation', () => {
        function hit(guard) { fresh(); gear('monowire'); const main = enemy(11, 10, { guard }); const side = enemy(10, 11); const hp = side.hp; T.playerAttack(main); return hp - side.hp; }
        const a = hit(0), b = hit(0.25); eq(a, b, 'same unarmored secondary target'); return { a, b };
      });
      check('working', 'Sandevistan freezes enemies, cooldowns, buffs and mech fuel while moving', () => {
        fresh('engineer'); G.freeze = 0; gear('sandevistan'); const e = enemy(12, 12);
        G.mech = 12; G.mechBuilt = true; G.cyberCd.other = 4; N.addBuff('shield', 8, 13, 'test');
        N.useCyberActive('sandevistan'); N.doMove(1, 0); N.doMove(-1, 0);
        eq(e.tick, 0, 'enemy tick'); eq(G.mech, 12, 'mech fuel'); eq(G.cyberCd.other, 4, 'CD');
        eq(N.p.buffs.find(b => b.id === 'shield').turns, 8, 'shield duration');
        T.playerAttack(e); ok(!G.sandev, 'actual attack ends time slow');
      });
      check('working', 'melee applies critMult, execute and lifesteal together', () => {
        fresh(); gear('crit_chip'); gear('hand_red'); gear('vampire');
        G.runMod.crit = 1; N.recalc(); const e = enemy(11, 10, { hp: 20000 });
        N.p.hp = 30; Math.random = () => 0; const a = attackValue();
        const expA = Math.round(Math.round((a - 1) * (1 + G.mod.execute)) * (1.5 + G.mod.critMult)), expB = Math.round((a - 1) * (1 + G.mod.execute) * (1.5 + G.mod.critMult));
        let expected = Math.abs((e.hp - 0) && expB - expA) <= 1 ? expB : expA;
        const before = e.hp; T.playerAttack(e); eq(before - e.hp, expected, 'melee damage');
        eq(N.p.hp - 30, Math.max(1, Math.round(expected * G.mod.lifesteal)), 'lifesteal');
      });
      check('working', 'multi cyberware hits three distinct enemies once, not three hits on one', () => {
        fresh(); gear('assault_hand_r'); G.cyberGrowth.assault_hand_r = { lv: 5, xp: 0 };
        const es = [enemy(11, 10), enemy(12, 10), enemy(13, 10), enemy(14, 10)];
        const expected = Math.round(attackValue() * 3.3); N.useCyberActive('assault_hand_r');
        es.forEach((e, i) => eq(100000 - e.hp, i < 3 ? expected : 0, 'target ' + i));
      });
      check('working', 'mechanist x drone_swarm multiplies drone ATK by 2 x 1.5', () => {
        fresh('engineer'); gear('drone_swarm'); G.specF.droneDmg = 1;
        const e = enemy(13, 10); G.allies = [{ kind: 'drone', x: 12, y: 10, turns: 999 }];
        const expected = Math.round(attackValue() * 0.55 * 3); N.alliesAct();
        eq(100000 - e.hp, expected, 'swarm strike');
      });
      check('working', 'turret_net shoots every turn; architect rate is OR, not a second multiplier', () => {
        fresh('engineer'); gear('turret_net'); G.specF.turretRate = 1;
        const e = enemy(14, 10); G.allies = [{ kind: 'turret', x: 12, y: 10, cd: 0, turns: 15 }];
        N.alliesAct(); N.alliesAct(); eq(100000 - e.hp, 2 * (3 + Math.floor(N.p.level / 2)), 'two turns');
      });
      check('working', 'five ghost marks produce 9x ATK and are consumed by execution', () => {
        fresh('ghost'); const e = enemy(12, 10, { marked: true, marks: 5 }); G.instab = 75;
        const expected = Math.round(attackValue() * 9); N.ghostAct('execute');
        eq(100000 - e.hp, expected, 'five-mark execution'); eq(e.marks, 0, 'consumed stacks'); ok(!e.marked, 'flag cleared');
      });
      check('working', 'shield layers add and absorb once, preserving unbroken remainder', () => {
        fresh(); N.addBuff('shield', 8, 13, 'A'); N.addBuff('shield', 8, 13, 'B');
        eq(N.shieldPool(), 26, 'stacked pool'); const hp = N.p.hp;
        N.hurtPlayer(20, null); eq(N.p.hp, hp, 'fully absorbed'); eq(N.shieldPool(), 6, 'remaining pool');
        N.hurtPlayer(10, null); eq(hp - N.p.hp, 4, 'only overflow hurts HP');
      });
      check('working', 'damaging active growth uses direct kills: 24 XP reaches Lv5', () => {
        fresh(); gear('assault_hand_r'); enemy(11, 10, { hp: 1 }); enemy(12, 10, { hp: 1 }); enemy(13, 10, { hp: 1 });
        N.useCyberActive('assault_hand_r'); eq(G.cyberGrowth.assault_hand_r.lv, 2, 'three direct kills');
        N.gainCyberXp('assault_hand_r', 21); eq(G.cyberGrowth.assault_hand_r.lv, 5, '3+5+7+9 XP');
      });
      check('contract', 'malformed legacy chips cannot introduce NaN or read unsupported value fields', () => {
        fresh(); gear('hand_red'); const before = stats();
        G.cyberChips.handL = [
          { stat: 'atk', value: 999 },
          { stat: 'atk', val: 5, affixes: [{ stat: 'crit', val: 0.06 }, { stat: 'def', val: Infinity }] },
          { stat: 'hp', val: NaN }, { stat: 'dodge', val: undefined }
        ];
        N.recalc(); const after = stats(); Object.values(after).forEach(n => ok(Number.isFinite(n), 'finite stats'));
        eq(after.atk - before.atk, 5, 'valid val only'); eq(after.crit - before.crit, 0.06, 'valid affix');
        eq(after.hp, before.hp, 'NaN ignored'); eq(after.def, before.def, 'Infinity ignored');
      });
      check('contract', 'outgoingDamage is pure and deterministic; only playerHit mutates HP', () => {
        fresh(); const e = enemy(11, 10, { def: 7 });
        const hp = e.hp, own = N.p.hp, turn = G.turn;
        const a = T.outgoingDamage(100, e, { critRoll: 0 });
        const b = T.outgoingDamage(100, e, { critRoll: 0 });
        eq(a.amount, b.amount, 'deterministic'); eq(e.hp, hp, 'target HP unchanged');
        eq(N.p.hp, own, 'own HP unchanged'); eq(G.turn, turn, 'turn unchanged');
        const hit = T.playerHit(e, 100, { critRoll: 0 }); eq(hp - e.hp, a.amount, 'one application'); eq(hit.damage, a.amount, 'returned actual damage');
      });
      check('contract', 'turrets inherit exactly half of acquired ATK', () => {
        function volley(extra) {
          fresh('engineer'); G.runMod.atk = extra; N.recalc();
          const e = enemy(14, 10); G.allies = [{ kind: 'turret', x: 12, y: 10, cd: 0, turns: 15 }];
          N.alliesAct(); return 100000 - e.hp;
        }
        eq(volley(20) - volley(0), 10, '20 acquired ATK -> 10 turret damage');
      });
      check('contract', 'drone attacks inherit player crit and lifesteal, originating from drone', () => {
        fresh('engineer'); gear('drone_swarm'); G.specF.droneDmg = 1;
        G.runMod.crit = 1; G.runMod.critMult = 0.5; G.runMod.lifesteal = 0.3; N.recalc();
        const e = enemy(13, 10); G.allies = [{ kind: 'drone', x: 12, y: 10, turns: 999 }];
        N.p.hp = 30; const raw = attackValue() * 0.55 * 3, expected = Math.round(raw * 2.0);
        N.alliesAct(); eq(100000 - e.hp, expected, 'drone crit');
        eq(N.p.hp - 30, Math.round(expected * 0.3), 'drone lifesteal');
        eq(G.lastHit.origin.x, 12, 'origin is ally rather than player');
      });
      check('contract', 'mech laser inherits player crit and lifesteal exactly once', () => {
        fresh('engineer'); G.mechBuilt = true; G.mech = 12; G.mechMods = ['laserArm'];
        G.runMod.crit = 1; G.runMod.critMult = 0.5; G.runMod.lifesteal = 0.3; N.recalc();
        const e = enemy(14, 10); N.p.hp = 30;
        const expected = Math.round(attackValue() * 2 * 2.0); T.fireLaser();
        eq(100000 - e.hp, expected, 'laser damage'); eq(N.p.hp - 30, Math.round(expected * 0.3), 'laser heal');
      });
      check('working', 'blood burst keeps aggregate 40% heal without adding generic lifesteal again', () => {
        fresh(); gear('vampire'); G.runMod.lifesteal = 5; N.recalc();
        const e = enemy(); N.p.hp = 1; N.useCyberActive('vampire');
        eq(N.p.hp - 1, Math.max(1, Math.round((100000 - e.hp) * 0.4)), 'one intrinsic heal');
      });
      check('working', 'ghost hacks: overheat burns, disarm blocks, hijack converts and raises critical floor', () => {
        fresh('ghost'); G.instab = 25; G.ghostRevealed = true;
        const e = enemy(12, 10, { marks: 0, marked: false }); e.stun = 0; e.cd = 0; N.ghostAct('overheat');
        eq(e.igniteT, 4, 'overheat turns'); eq(e.marks, 1, 'hack marks');
        G.instab = 45; G.busy = false; N.ghostAct('disarm'); eq(e.disarmT > 0, true, 'disarm applied');
        G.instab = 75; G.busy = false; e.disarmT = 0; e.igniteT = 0; N.ghostAct('hijack');
        eq(G.enemies.indexOf(e), -1, 'hijacked removed from enemies'); eq(G.allies.some(a => a.kind === 'hacked' && a.hijack), true, 'ally added');
        G.instab = 0; T.afterAction(); eq(G.instab >= 20, true, 'critical floor while hijacked');
      });
      check('contract', 'giant core promises +6 beyond the base +3 grow buff', () => {
        fresh('ghost'); gear('grow_giant'); const e = enemy(11, 10);
        N.useCyberActive('grow_giant'); const before = e.hp;
        G.instab = 45; G.ghostRevealed = false; G.ghostStealth = 5; G.ghostCd = {}; e.marked = true; N.ghostAct('assassinate');
        eq(before - e.hp > Math.round((attackValue() + 9) * 2.6) - 1, true, 'Lv1 giant +9 ATK reaches backstab');
      });
      const builds = [
        { id: 'assault-crit-double', cls: 'assault', spec: 'berserker', ids: ['crit_chip','eye_red','assault_hand_r','hand_red','body_red','spine_red','legL_red','hunt_leg_r'], focus: 'double + overheat + pierce magazine; critMult works on each main bullet' },
        { id: 'assault-sandev-blood', cls: 'assault', spec: 'berserker', ids: ['crit_chip','eye_red','monowire','hand_red','vampire','sandevistan','legL_red','hunt_leg_r'], focus: 'free reposition, melee crit/execute/lifesteal and arc clearing' },
        { id: 'engineer-mech-swarm', cls: 'engineer', spec: 'mechanist', ids: ['eye_red','quantum_processor','hand_red','assault_hand_r','body_red','drone_swarm','kinetic_legs','legL_red'], modules: ['laserArm','missilePod','energyWall'], focus: 'ATK-scaled laser + 3x drone multiplier; not turret ATK scaling' },
        { id: 'engineer-shield-network', cls: 'engineer', spec: 'architect', ids: ['quantum_processor','eye_red','hand_red','surv_hand_r','body_red','turret_net','kinetic_legs','legL_red'], modules: ['laserArm','missilePod','energyWall'], focus: 'three shield sources + DEF + every-turn turret battery; architect/network fire rates do not multiply' },
        { id: 'ghost-five-mark', cls: 'ghost', spec: 'phaser', ids: ['hunt_eye_r','quantum_processor','hand_red','assault_hand_r','second_heart','cyberdeck','legL_red','kinetic_legs'], focus: 'two scans + hidden aura reach five marks; 9x ATK base, with generic execute/crit/lifesteal after pipeline fix' },
        { id: 'ghost-sandev-ambush', cls: 'ghost', spec: 'assassin', ids: ['crit_chip','eye_red','mantis_blade','hand_red','optical_camo','sandevistan','legL_red','hunt_leg_r'], focus: 'time slow + charge + optical camo; first-strike x camo x charge x melee crit genuinely stack' }
      ];
      builds.forEach(b => {
        fresh(b.cls); b.ids.forEach(id => gear(id));
        G.pendingEvo = 1; N.maybeShowEvolution();
        const button = document.querySelector('[data-spec="' + b.spec + '"]');
        if (!button) throw Error('Missing real specialization UI: ' + b.spec);
        button.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true })); clear();
        b.base = stats(); b.chipSum = fillChips(); b.withChips = stats();
        b.chipCount = Object.values(G.cyberChips).flat().length; b.slots = { ...G.cyber };
      });
      Math.random = originalRandom;
      return { source: 'index.html + current game.js', note: 'Deterministic isolated interaction tests; not a win-rate or low-gear balance benchmark. Contract rows document unmet cross-system promises; working rows preserve proven mechanics.', rows, builds };
    });
    report.errors = errors;
    for (const r of report.rows) console.log(`${r.pass ? 'PASS' : 'FAIL'} [${r.kind}] ${r.name}${r.error ? ': ' + r.error : ''}`);
    console.log(JSON.stringify({ builds: report.builds, errors, totals: {
      pass: report.rows.filter(r => r.pass).length,
      failedContracts: report.rows.filter(r => !r.pass && r.kind === 'contract').length,
      failedWorking: report.rows.filter(r => !r.pass && r.kind === 'working').length
    } }, null, 2));
    if (errors.length || report.rows.some(r => !r.pass && (!characterize || r.kind === 'working'))) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
