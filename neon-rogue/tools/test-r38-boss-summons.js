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
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    const checks = await page.evaluate(() => {
      const N = __neon, G = N.G, T = N.test, S = N.spawning;
      const rows = [];
      function reset(depth) {
        G.classId = 'assault'; G.trainPending = true;
        N.startGame(); T.hideOverlay();
        Object.assign(G, { state: 'play', mode: 'normal', paused: false, busy: false, modal: null,
          depth, enemies: [], allies: [], items: [], sites: [], quests: [], hazards: [],
          storyQueue: [], pendingBoard: null, pendingBoons: 0, pendingEvo: 0, corpOp: null, b16: null });
        N.p.pending = 0; N.p.x = 40; N.p.y = 27;
        G.map = Array.from({ length: 30 }, () => Array(44).fill(0));
        G.vis = G.map.map(row => row.map(() => 1));
        G.seen = G.map.map(row => row.map(() => 1));
        G.rooms = [{ x: 0, y: 0, w: 44, h: 30 }];
      }
      function root(boss, x) {
        const spec = window.NEON.monsters.find(monster => monster.ai === 'summoner');
        const unit = T.spawnEnemy(spec, x, 12, G.depth);
        unit.boss = boss;
        unit.spawnCells = Array.from({ length: 100 }, (_, index) => ({ x: 2 + index % 20, y: 2 + Math.floor(index / 20) }));
        G.enemies.push(unit);
        return unit;
      }
      for (const [depth, ordinaryCap] of [[1, 10], [6, 15], [11, 20]]) {
        reset(depth);
        const boss = root(true, 20);
        T.summonMinions(boss, 100, ['chase', 'summoner']);
        const firstCount = S.count(boss);
        const nest = T.cyberStructure(boss, 'nest', { x: 25, y: 12 });
        delete nest.bossSummoned;
        const legacyDerived = S.limit(nest);
        nest.spawnCells = boss.spawnCells;
        const sharedBlocked = T.summonMinions(nest, 5, ['chase']);
        const child = G.enemies.find(unit => unit.summoned && !unit.structure);
        N.hackedUnits.capture(child, 20);
        G.enemies = G.enemies.filter(unit => unit !== child);
        G.allies.push(child);
        const sharedAfterHack = S.count(boss);
        const victim = G.enemies.find(unit => unit.summoned && !unit.structure);
        victim.hp = 0; N.killEnemy(victim);
        const replaced = T.summonMinions(nest, 100, ['chase', 'summoner']);
        const finalCount = S.count(boss);
        G.enemies = G.enemies.filter(unit => unit !== boss);
        const retained = S.limit(child);
        rows.push({ depth, ordinaryCap, ordinaryLimit: S.limit(), bossLimit: S.limit(boss),
          firstCount, legacyDerived, sharedBlocked, sharedAfterHack, replaced, finalCount, retained,
          noSummoningSources: G.enemies.filter(unit => unit.summoned && !unit.structure).every(unit => unit.ai !== 'summoner') });
        T.save.saveRun(true); T.save.loadRun();
        const restored = G.allies.find(unit => unit.uid === child.uid);
        rows[rows.length - 1].restoredCap = restored && S.limit(restored);

        reset(depth);
        const ordinary = root(false, 20);
        T.summonMinions(ordinary, 100, ['chase']);
        rows[rows.length - 1].ordinaryCount = S.count(ordinary);
      }
      G.paused = true;
      return rows;
    });
    const passed = checks.every(row => row.bossLimit === 25 && row.firstCount === 25 && row.legacyDerived === 25 && row.sharedBlocked === 0 &&
      row.sharedAfterHack === 25 && row.replaced === 1 && row.finalCount === 25 && row.retained === 25 &&
      row.restoredCap === 25 && row.noSummoningSources && row.ordinaryLimit === row.ordinaryCap && row.ordinaryCount === row.ordinaryCap);
    fs.writeFileSync(path.resolve(__dirname, '../../work/r38/boss-summon-tests.json'), JSON.stringify({ passed, checks, errors }, null, 2));
    console.log(JSON.stringify({ passed, checks, errors }, null, 2));
    assert(passed && errors.length === 0);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
