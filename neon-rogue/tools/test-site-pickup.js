const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const results = [], errors = [];
  const check = (name, passed, detail) => results.push({ name, passed: !!passed, detail });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('neon-depth-mute', '1');
      localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
    });
    await page.goto(pathToFileURL(path.join(root, 'dist.debug.html')).href);
    await page.evaluate(() => {
      window.prepareSitePickup = kind => {
        const N = window.__neon, G = N.G, T = N.test;
        G.classId = 'assault';
        G.trainPending = true;
        G.rushPending = null;
        N.startGame();
        T.hideOverlay();
        Object.assign(G, { mode: 'normal', state: 'play', paused: false, modal: null, busy: false,
          pendingBoard: null, pendingBoons: 0, pendingEvo: 0, pendingCorpReward: null,
          storyQueue: [], lootQueue: [], swapQueue: [], quests: [], items: [], enemies: [], allies: [],
          hazards: [], mines: [], walls: [], cmines: [], cfence: [], cams: [], corpStrikes: [],
          corpOp: null, trial: null, trialKit: null, b16: null, stance: null, control: null,
          hitStopUntil: 0, turn: 6, credits: 128, depth: 1, inv: ['mag_pack'], chips: [] });
        const p = N.p;
        Object.assign(p, { x: kind.startsWith('walk-') ? 9 : 10, y: 10, pending: 0 });
        G.map = Array.from({ length: 30 }, (_, y) => Array.from({ length: 44 }, (_, x) => x === 0 || y === 0 || x === 43 || y === 29 ? 1 : 0));
        G.seen = G.map.map(row => row.map(() => 1));
        G.vis = G.map.map(row => row.map(() => 1));
        G.stairs = { x: 40, y: 26 };
        G.sites = [{ type: 'gamble', x: 10, y: 10, used: false, seed: 0, data: { spins: 0 } }];
        if (kind.includes('chip')) {
          const chip = N.makeChip('atk', 'blue');
          G.items = [{ x: 10, y: 10, chip, seed: 0 }];
          if (kind === 'dropped-chip') G.items[0]._skipTurn = G.turn;
        }
        if (kind === 'walk-chest') G.items = [{ x: 10, y: 10, chest: { tier: 'rare', data: {} }, seed: 0 }];
        if (kind === 'walk-cons') {
          G.inv = ['mag_pack', 'mag_pack', 'mag_pack', 'mag_pack'];
          const consumable = window.NEON.consumables.find(item => item.id !== 'mag_pack');
          G.items = [{ x: 10, y: 10, cons: consumable, seed: 0 }];
        }
        N.recalc();
        N.computeFOV();
        N.updateHUD();
      };
    });
    async function prepare(kind) {
      await page.evaluate(kind => window.prepareSitePickup(kind), kind);
    }
    async function waitAtTile() {
      await page.locator('.key[data-dx="0"][data-dy="0"]').click();
    }
    async function stepOntoTile() {
      await page.locator('.key[data-dx="1"][data-dy="0"]').click();
    }
    async function state() {
      return page.evaluate(() => ({ modal: window.__neon.G.modal, chips: window.__neon.G.chips.length,
        items: window.__neon.G.items.length, credits: window.__neon.G.credits, turn: window.__neon.G.turn,
        lootCard: !!document.querySelector('.card.loot'), swapCard: !!document.querySelector('.card.swap') }));
    }

    await prepare('empty');
    await waitAtTile();
    let actual = await state();
    check('empty interaction tile still opens the roulette without betting', actual.modal === 'gamble' && actual.credits === 128, actual);

    await prepare('standing-chip');
    await waitAtTile();
    actual = await state();
    check('wait collects a chip already under the player on the roulette tile', actual.chips === 1 && actual.items === 0, actual);

    await prepare('dropped-chip');
    await waitAtTile();
    actual = await state();
    check('explicit wait can reclaim an item dropped on an interaction tile this turn', actual.chips === 1 && actual.items === 0, actual);

    await prepare('walk-chip');
    await stepOntoTile();
    actual = await state();
    check('walking onto the facility still collects ordinary ground chips', actual.chips === 1 && actual.items === 0, actual);

    await prepare('walk-chest');
    await stepOntoTile();
    actual = await state();
    check('roulette cannot overwrite the chest reward choice', actual.modal === 'loot' && actual.lootCard && actual.items === 0, actual);
    if (actual.modal === 'loot') {
      await page.locator('.card.loot.ready').waitFor({ timeout: 3000 });
      if (await page.locator('[data-loot]').count()) await page.locator('[data-loot]').first().click();
      else await page.locator('#lootClaim').click();
      await waitAtTile();
      actual = await state();
      check('roulette remains available after claiming the co-located chest', actual.modal === 'gamble', actual);
    } else check('roulette remains available after claiming the co-located chest', false, 'Reward choice was overwritten');

    await prepare('walk-cons');
    await stepOntoTile();
    actual = await state();
    check('roulette cannot overwrite a full consumable inventory choice', actual.modal === 'swap' && actual.swapCard && actual.items === 1, actual);
    if (actual.modal === 'swap') {
      await page.locator('#swDrop').click();
      await waitAtTile();
      actual = await state();
      check('leaving a consumable on the ground does not trap facility interaction', actual.modal === 'gamble' && actual.items === 1, actual);
    } else check('leaving a consumable on the ground does not trap facility interaction', false, 'Inventory choice was overwritten');

    check('no uncaught browser errors', errors.length === 0, errors);
    const output = path.resolve(root, '..', 'work', 'site-pickup-regression.json');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(results, null, 2));
    results.forEach(result => console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.passed ? '' : ' ' + JSON.stringify(result.detail)}`));
    assert(results.every(result => result.passed), 'Interaction-tile pickup regression');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
