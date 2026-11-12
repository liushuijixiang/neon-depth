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
    await page.goto(pathToFileURL(path.resolve(__dirname, '../dist.debug.html')).href);
    const rows = await page.evaluate(() => {
      const N = __neon, G = N.G, T = N.test;
      G.classId = 'assault'; G.trainPending = true;
      N.startGame(); T.hideOverlay();
      const results = [];
      for (const specification of N.bosses()) {
        for (const stage of [0, 1, 2, 3]) {
          const enemy = T.training.bossArena(specification.id);
          T.hideOverlay();
          Object.assign(G, { state: 'play', paused: false, busy: false, modal: null, freeze: 0,
            pendingBoard: null, pendingBoons: 0, pendingEvo: 0, storyQueue: [] });
          N.p.pending = 0;
          // This fixture keeps the renderer alive while checking every action branch.
          // Its HP is excluded from balance and victory conclusions.
          N.p.maxHp = N.p.hp = 100000;
          enemy.hp = Math.round(enemy.maxHp * [.9, .7, .45, .2][stage]);
          enemy.brain.stage = stage;
          const before = N.p.hp;
          for (let action = 0; action < 16; action++) {
            const distance = [1, 4, 7, 4][action % 4];
            const target = { x: enemy.x - distance, y: enemy.y };
            if (G.map[target.y]?.[target.x] === 0 && !G.enemies.some(unit => unit.hp > 0 && unit.x === target.x && unit.y === target.y)) {
              N.p.x = target.x; N.p.y = target.y;
            }
            G.turn++;
            N.computeFOV();
            T.enemiesAct();
            T.tickHazards();
            T.draw(performance.now());
          }
          const combat = N.bossCombat.snapshot(enemy);
          results.push({ id: specification.id, stage, actions: combat.actions,
            damageTaken: before - N.p.hp, intents: enemy.intent?.kind || null,
            effects: N.r38.combatFx.snapshot().effects.length, state: G.state });
        }
      }
      G.paused = true;
      return results;
    });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    const passed = rows.length === 36 && rows.every(row => row.state === 'play' && Object.keys(row.actions).length > 0) && errors.length === 0;
    const report = { passed, purpose: 'Engine action and rendering integration', syntheticSurvivalFixture: true,
      playerHp: 100000, actionsPerScenario: 16, rows, errors };
    fs.writeFileSync(path.resolve(__dirname, '../../work/r38/boss-runtime-tests.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed, scenarios: rows.length, actionsPerScenario: 16, errors }, null, 2));
    assert(passed);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
