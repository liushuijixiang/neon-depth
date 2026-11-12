const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('neon-depth-mute', '1'));
    await page.goto(pathToFileURL(path.join(__dirname, '../dist.debug.html')).href);
    const checks = await page.evaluate(() => {
      const N = __neon, G = N.G, T = N.test, out = [];
      const check = (name, passed, detail) => out.push({ name, passed: !!passed, detail });
      function setup(id) {
        G.classId = 'assault'; G.trainPending = true; G.rushPending = null;
        N.startGame(); T.hideOverlay(); T.training.action('arena'); T.hideOverlay();
        G.paused = false; G.busy = false; G.modal = null; G.state = 'play'; G.mode = 'train';
        G.pendingBoard = null; G.pendingBoons = 0; G.pendingEvo = 0; G.storyQueue = []; N.p.pending = 0;
        G.enemies = []; G.items = []; G.sites = []; G.allies = []; G.hazards = []; G.quests = [];
        G.cyber = {}; G.cyberChips = {}; G.modBag = []; G.mods = {}; G.runMod = {}; G.inst = {}; G.chips = [];
        G.stance = null; G.melee = { charge: 0, combo: 0, seq: 0 }; G.freeze = 100;
        N.p.x = 10; N.p.y = 10; N.p.face = 0;
        N.applyMod(N.mods.find(mod => mod.id === id)); T.hideOverlay();
        N.recalc(); N.computeFOV(); N.r38.combatFx.clear();
      }
      function dummy(x, y) {
        const enemy = T.spawnEnemy(T.corp.monsters.find(spec => spec.ai === 'chase' && !spec.corpUnit), x, y, 1);
        enemy.hp = enemy.maxHp = 10000; enemy.stun = 100; enemy.elite = false;
        G.enemies.push(enemy); N.computeFOV(); return enemy;
      }

      setup('mantis_blade');
      const rushTarget = dummy(14, 10), turn = G.turn;
      N.useCyberActive('mantis_blade');
      check('Mantis active first action prepares without moving or damaging', G.stance && N.p.x === 10 && rushTarget.hp === 10000 && G.turn === turn + 1);
      N.useCyberActive('mantis_blade');
      check('Mantis release dashes through legal free cells and strikes at landing', N.p.x === 13 && N.p.y === 10 && rushTarget.hp < 10000 && !G.stance, { x: N.p.x, hp: rushTarget.hp });
      check('Rush has a short real displacement trail', N.r38.combatFx.snapshot().effects.some(effect => effect.kind === 'dash' && effect.origin.x === 10 && effect.target.x === 13));

      setup('thermal_blade');
      const rectangle = [dummy(14, 11), dummy(9, 10), dummy(12, 12), dummy(15, 10)];
      N.startMeleeCharge(); N.meleeStrike();
      check('Thermal charged melee uses the forward four-by-three rectangle', rectangle[0].hp < 10000 && rectangle.slice(1).every(enemy => enemy.hp === 10000), rectangle.map(enemy => enemy.hp));

      setup('iaido');
      const longLine = [dummy(17, 10), dummy(17, 11), dummy(18, 10)];
      N.startMeleeCharge(); N.meleeStrike();
      check('Iaido charge reaches seven cells while leaving parallel and distant cells safe', longLine[0].hp < 10000 && longLine[1].hp === 10000 && longLine[2].hp === 10000, longLine.map(enemy => enemy.hp));

      setup('mantis_blade');
      G.map[10][12] = 1;
      const wallTarget = dummy(14, 10);
      N.startMeleeCharge(); N.meleeStrike();
      check('Real charged rush cannot cross a wall or strike through it', N.p.x === 11 && wallTarget.hp === 10000, { x: N.p.x, hp: wallTarget.hp });

      setup('katana');
      const katanaTarget = dummy(12, 10);
      N.useCyberActive('katana');
      const effects = N.r38.combatFx.snapshot().effects.filter(effect => effect.owner === 'player:katana');
      check('Three-cut active uses three different short attacks without a common windup', !G.stance && katanaTarget.hp < 10000 && effects.length === 3 && new Set(effects.map(effect => effect.kind)).size === 3, effects.map(effect => ({ kind: effect.kind, life: effect.life })));
      const frozen = JSON.stringify([G.turn, N.p.hp, G.enemies.map(enemy => enemy.hp)]);
      for (let index = 0; index < 30; index++) T.draw(performance.now() + index * 4);
      check('Weapon motion and effect drawing never advance gameplay or repeat damage', frozen === JSON.stringify([G.turn, N.p.hp, G.enemies.map(enemy => enemy.hp)]));

      setup('emp_knuckles');
      const circuit = [dummy(13, 10), dummy(15, 11), dummy(16, 13), dummy(7, 10)];
      N.useCyberActive('emp_knuckles');
      check('EMP follows its nearest connected targets instead of every enemy in range', circuit.slice(0, 3).every(enemy => enemy.hp < 10000) && circuit[3].hp === 10000, circuit.map(enemy => enemy.hp));
      G.paused = true;
      return out;
    });
    checks.push({ name: 'No runtime exceptions in the real weapon entry points', passed: errors.length === 0, detail: errors });
    const output = path.resolve(__dirname, '../../work/r38/player-entry-tests.json');
    fs.writeFileSync(output, JSON.stringify(checks, null, 2));
    checks.forEach(check => console.log((check.passed ? 'PASS ' : 'FAIL ') + check.name + (check.passed ? '' : ' ' + JSON.stringify(check.detail))));
    assert(checks.every(check => check.passed));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
