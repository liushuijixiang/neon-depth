const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const url = process.env.NEON_TEST_URL || 'http://127.0.0.1:8766/neon-rogue/dist.debug.html';
const filter = process.env.NEON_INTEGRATION_FILTER ? new RegExp(process.env.NEON_INTEGRATION_FILTER, 'i') : null;

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const checks = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('neon-depth-mute', '1');
      if (!localStorage.getItem('neon-depth-story')) localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
    });
    await page.goto(url);
    await page.evaluate(() => {
      const N = window.__neon, G = N.G, T = N.test;
      const originalRandom = Math.random;
      function reset() {
        Math.random = originalRandom;
        G.classId = 'assault'; G.trainPending = true; G.rushPending = null; G.dreamPending = null;
        N.startGame(); T.hideOverlay();
        Object.assign(G, {
          mode: 'normal', state: 'play', paused: false, busy: false, modal: null, pendingBoard: null,
          pendingBoons: 0, pendingEvo: 0, storyQueue: [], quests: [], sites: [], items: [], enemies: [], allies: [],
          hazards: [], hackedFields: [], hackedCorpses: [], walls: [], corpOp: null, trialKit: null, trial: null,
          corpZone: {}, corpSchedule: {}, forceCorp: false, forceNpc: false, cams: [], cfence: [], cmines: [],
          cyber: {}, cyberChips: {}, chips: [], mods: {}, modBag: [], inst: {}, runMod: {}, chal: null,
          trainBonus: { hp: 0, atk: 0, def: 0 }, adaptBonus: 0, depth: 1, turn: 0, floorDamage: 0,
          stealth: 0, ghostStealth: 0, ghostRevealed: false, freeze: 0, overT: 0, burnout: false,
          control: null, bossAlive: false, credits: 10000, instab: 25
        });
        G.chipF = Object.fromEntries(['sock', 'bag', 'stash', 'forge'].map(key => [key, { q: 'all', s: 'all', sort: 'quality' }]));
        N.meta.up = {};
        Object.assign(N.p, { pending: 0, x: 2, y: 2, level: 1, itemMax: 0, itemAtk: 0, itemDef: 0 });
        G.map = Array.from({ length: 30 }, (_, y) => Array.from({ length: 44 }, (_, x) => x && y && x < 43 && y < 29 ? 0 : 1));
        G.seen = G.map.map(row => row.map(() => 1)); G.vis = G.map.map(row => row.map(() => 1));
        G.rooms = [{ x: 1, y: 1, w: 42, h: 28, cx: 22, cy: 15 }];
        G.stairs = { x: 40, y: 26 };
        N.inventory.selectQualities([]);
        N.recalc(); N.p.hp = N.p.maxHp;
        return N.p;
      }
      function own(id) {
        if (!G.modBag.includes(id)) G.modBag.push(id);
        T.v18.instOf(id);
      }
      function equip(id, slot) { own(id); N.installCyber(id, slot); T.hideOverlay(); }
      function chips() { return G.chips.concat(Object.values(G.cyberChips).flat()); }
      function enemy(x, y, ai = 'chase') {
        const spec = T.corp.monsters.find(monster => monster.ai === ai && !monster.boss && !monster.corpUnit);
        const actor = T.spawnEnemy(spec, x, y, G.depth);
        Object.assign(actor, { hp: 1000, maxHp: 1000, atk: 10, def: 0, alerted: true, cd: 0, tick: 0 });
        G.enemies.push(actor);
        return actor;
      }
      window.integrationFixture = { reset, own, equip, chips, enemy, originalRandom };
    });
    async function check(name, test) {
      if (filter && !filter.test(name)) return;
      try {
        const result = await test();
        assert(result.pass, JSON.stringify(result.detail));
        checks.push({ name, passed: true, detail: result.detail });
      } catch (error) {
        checks.push({ name, passed: false, error: error.message });
      }
    }

    await check('Unrestricted implant acquisition retains over 200 unique implants', async () => {
      const result = await page.evaluate(() => {
        const N = __neon, G = N.G, F = integrationFixture; F.reset();
        const list = N.mods.filter(mod => !mod.cls || mod.cls === G.classId).slice(0, 220);
        list.forEach(mod => N.applyMod(mod));
        return { intended: list.length, owned: G.modBag.length, lost: list.filter(mod => !G.modBag.includes(mod.id)).map(mod => mod.id), dropped: G.items.filter(item => item.mod).length };
      });
      return { pass: result.intended === 220 && result.owned === 220 && !result.lost.length && !result.dropped, detail: result };
    });
    await check('Unrestricted chip acquisition retains over 200 loose chips', async () => {
      const result = await page.evaluate(() => {
        const N = __neon, G = N.G;
        for (let i = 0; i < 260; i++) N.addChipObject(N.makeChip('atk', 'gray'));
        return { loose: G.chips.length, total: integrationFixture.chips().length, ground: G.items.filter(item => item.chip).length, unlimited: N.inventory.cap() === Infinity };
      });
      return { pass: result.loose > 200 && result.total === 260 && !result.ground && result.unlimited, detail: result };
    });
    await check('Inventory omits obsolete capacity and weight meters', async () => {
      const result = await page.evaluate(() => {
        __neon.test.v18.openBag('gear');
        const gear = document.querySelector('.card').textContent;
        const meters = document.querySelectorAll('.bag-cap,.bag-bar').length;
        __neon.test.v18.openBag('chips');
        return { meters, gearHasWeight: /负重/.test(gear), chipTab: document.querySelector('[data-bt="chips"]').textContent,
          installedChipMarkers: document.querySelectorAll('.chipico small').length };
      });
      return { pass: result.meters === 0 && !result.gearHasWeight && !result.chipTab.includes('/') && result.installedChipMarkers === 0, detail: result };
    });

    await page.evaluate(() => {
      const N = __neon, G = N.G, F = integrationFixture; F.reset(); G.adaptBonus = 100;
      ['body_gray', 'body_red', 'eye_blue', 'hand_green'].forEach(F.own);
      F.equip('body_gray', 'body');
      for (let i = 0; i < 8; i++) G.chips.push(N.makeChip(i < 4 ? 'compat' : 'atk', 'purple'));
      N.recalc(); N.p.hp = 7; N.openCyber();
      window.autoBefore = JSON.stringify({ cyber: G.cyber, chips: F.chips(), stats: G.runMod, hp: N.p.hp });
    });
    await check('First auto-fit click only requests confirmation', async () => {
      await page.locator('#autoFit').click();
      const result = await page.evaluate(() => ({ unchanged: autoBefore === JSON.stringify({ cyber: __neon.G.cyber, chips: integrationFixture.chips(), stats: __neon.G.runMod, hp: __neon.p.hp }), armed: !!document.querySelector('#autoFit')._arm }));
      return { pass: result.unchanged && result.armed, detail: result };
    });
    await check('Confirmed auto-fit preserves current HP and all chips', async () => {
      await page.locator('#autoFit').click();
      const result = await page.evaluate(() => ({ hp: __neon.p.hp, chips: integrationFixture.chips().length, equipped: Object.keys(__neon.G.cyber).length, withinAdaptation: __neon.cyberLoad() <= __neon.adaptationCap() }));
      return { pass: result.hp === 7 && result.chips === 8 && result.equipped > 0 && result.withinAdaptation, detail: result };
    });

    await check('Legacy oversized save preserves loose and installed chip identities', async () => {
      const result = await page.evaluate(() => {
        const N = __neon, G = N.G, F = integrationFixture; F.reset(); G.adaptBonus = 100;
        F.equip('eye_red', 'eyeL'); F.equip('body_red', 'body');
        G.chips = Array.from({ length: 235 }, (_, i) => Object.assign(N.makeChip('atk', 'gray'), { integrationId: i }));
        G.cyberChips.eyeL = G.chips.splice(0, 4); G.cyberChips.body = G.chips.splice(0, 4);
        const before = F.chips().map(chip => chip.integrationId).sort((a, b) => a - b);
        const saved = N.test.save.saveRun(true);
        G.chips = []; G.cyberChips = {};
        const loaded = N.test.save.loadRun();
        return { saved, loaded, loose: G.chips.length, installed: Object.values(G.cyberChips).flat().length,
          conserved: JSON.stringify(F.chips().map(chip => chip.integrationId).sort((a, b) => a - b)) === JSON.stringify(before) };
      });
      return { pass: result.saved && result.loaded && result.loose === 227 && result.installed === 8 && result.conserved, detail: result };
    });

    await check('Chip value sorting includes affixes and migration preserves stronger existing stats', async () => {
      const migration = await page.evaluate(() => {
        const N = __neon, G = N.G; integrationFixture.reset();
        const qualities = ['gray', 'green', 'blue', 'purple', 'orange', 'red'];
        const legacy = { chips: qualities.map(quality => ({ stat: 'hp', val: 12, quality, reforges: 4,
          affixes: [{ stat: 'atk', quality, val: 0 }, { stat: 'def', quality, val: 0 }, { stat: 'crit', quality, val: 0.05 }] })) };
        legacy.strong = { stat: 'def', val: 19, affixes: [{ stat: 'atk', quality: 'red', val: 30 }] };
        N.chipRules.migrate(legacy);
        G.chips = [
          Object.assign(N.makeChip('atk', 'red'), { stat: 'atk', val: 99, affixes: [{ stat: 'def', quality: 'gray', val: 2 }] }),
          Object.assign(N.makeChip('def', 'gray'), { stat: 'def', val: 7, affixes: [{ stat: 'def', quality: 'gray', val: 1 }] }),
          Object.assign(N.makeChip('def', 'blue'), { stat: 'def', val: 3, affixes: [{ stat: 'def', quality: 'blue', val: 4 }] }),
          Object.assign(N.makeChip('hp', 'purple'), { stat: 'hp', val: 70, affixes: [{ stat: 'def', quality: 'red', val: 6 }] })
        ];
        G.chipF.bag = { q: 'all', s: 'all', sort: 'quality' };
        N.test.v18.openBag('chips');
        return { floors: legacy.chips.map(chip => chip.affixes.slice(0, 2).map(affix => affix.val)),
          unchanged: legacy.chips.every(chip => chip.val === 12 && chip.affixes[2].val === 0.05 && chip.reforges === 4) && legacy.strong.val === 19 && legacy.strong.affixes[0].val === 30 };
      });
      await page.locator('[data-fs="bag|def"]').click();
      await page.locator('[data-chip-sort="bag|value"]').click();
      const order = await page.evaluate(() => Array.from(document.querySelectorAll('[data-owned-chip]')).map(button => Number(button.dataset.ownedChip)));
      return { pass: migration.unchanged && migration.floors.every((pair, i) => pair[0] === i + 1 && pair[1] === i + 1) && JSON.stringify(order) === '[1,2,3,0]', detail: { migration, order } };
    });

    await check('Reforge price advances 25 percent per chip across run and warehouse even when keeping old affixes', async () => {
      await page.evaluate(() => {
        const N = __neon, G = N.G; integrationFixture.reset();
        G.shopDiscount = 0; G.anomaly = null;
        const chip = N.makeChip('atk', 'blue'); G.chips = [chip];
        window.integrationReforge = { chip, old: JSON.stringify(chip.affixes), credits: G.credits };
        N.test.econ.openSite({ type: 'reforge', data: {} });
      });
      await page.locator('[data-rtab="chip"]').click();
      await page.locator('[data-rc="0"]').click();
      const runBase = await page.locator('#cfGo').textContent();
      await page.locator('#cfGo').click();
      await page.locator('#cfKeep').waitFor({ state: 'visible', timeout: 4000 });
      await page.locator('#cfKeep').click();
      const run = await page.evaluate(() => ({ count: integrationReforge.chip.reforges, unchanged: JSON.stringify(integrationReforge.chip.affixes) === integrationReforge.old,
        spent: integrationReforge.credits - __neon.G.credits, nextPrice: document.querySelector('#cfGo').textContent }));
      await page.evaluate(() => {
        const N = __neon;
        N.test.hideOverlay(); N.meta.stash.chips = []; N.meta.stash.cyber = [];
        N.test.v18.extractAll(); N.G.state = 'menu'; N.meta.cores = 1000;
        N.test.ui.menuScreen('cyber');
      });
      await page.locator('[data-mnact="market:forge"]').click();
      await page.locator('[data-ftab="chip"]').click();
      const warehouse = await page.evaluate(() => ({ count: __neon.meta.stash.chips.length, tab: __neon.G.market.forgeTab, filter: __neon.G.chipF.forge,
        choices: Array.from(document.querySelectorAll('[data-fchip]')).map(button => button.dataset.fchip), text: document.querySelector('.card').textContent.slice(0, 300) }));
      assert(warehouse.choices.includes('L0'), JSON.stringify(warehouse));
      await page.locator('[data-fchip="L0"]').click();
      const metaPrice = await page.locator('#cfGo').textContent();
      await page.locator('#cfGo').click();
      await page.locator('#cfGo').click();
      await page.locator('#cfKeep').waitFor({ state: 'visible', timeout: 4000 });
      await page.locator('#cfKeep').click();
      const meta = await page.evaluate(() => ({ count: __neon.meta.stash.chips[0].reforges, spent: 1000 - __neon.meta.cores,
        nextPrice: document.querySelector('#cfGo').textContent, formula: [0, 1, 2, 3].map(reforges => __neon.chipRules.reforgeCost({ reforges }, 20)) }));
      return { pass: /¥10$/.test(runBase) && run.count === 1 && run.unchanged && run.spent === 10 && /¥13$/.test(run.nextPrice) && /33 核心$/.test(metaPrice) && meta.count === 2 && meta.spent === 33 && /39 核心$/.test(meta.nextPrice) && JSON.stringify(meta.formula) === '[20,25,30,35]', detail: { runBase, run, metaPrice, meta } };
    });

    await check('Quality-select bulk discard protects locked and installed chips', async () => {
      await page.evaluate(() => {
        const N = __neon, G = N.G, F = integrationFixture; F.reset(); F.equip('eye_gray', 'eyeL');
        G.chips = ['gray', 'green', 'blue', 'purple'].map((quality, i) => Object.assign(N.makeChip('atk', quality), { integrationId: i }));
        G.chips[1].locked = true;
        G.cyberChips.eyeL = [Object.assign(N.makeChip('atk', 'gray'), { integrationId: 9 })];
        N.test.v18.openBag('chips');
      });
      for (const quality of ['gray', 'green', 'blue']) await page.locator(`[data-discard-quality="${quality}"]`).click();
      await page.locator('#discardChips').click();
      const result = await page.evaluate(() => {
        const G = __neon.G;
        return { kept: G.chips.map(chip => chip.integrationId), installed: G.cyberChips.eyeL.map(chip => chip.integrationId),
          dropped: G.items.filter(item => item.chip).map(item => item.chip.integrationId),
          skipsCurrentTurn: G.items.every(item => item._skipTurn === G.turn) };
      });
      return { pass: JSON.stringify(result.kept) === '[1,3]' && JSON.stringify(result.installed) === '[9]' && JSON.stringify(result.dropped) === '[0,2]' && result.skipsCurrentTurn, detail: result };
    });

    for (const fullSlots of [true, false]) {
      await check(`Normal shop purchase with large inventory and ${fullSlots ? 'all slots occupied' : 'an available slot'}`, async () => {
        await page.evaluate(full => {
          const N = __neon, G = N.G, F = integrationFixture; F.reset(); G.adaptBonus = 1000;
          if (full) {
            const used = new Set();
            for (const [slot, kind] of [['eyeL', 'eye'], ['eyeR', 'eye'], ['handL', 'hand'], ['handR', 'hand'], ['body', 'body'], ['spine', 'spine'], ['legL', 'leg'], ['legR', 'leg']]) {
              const mod = N.mods.find(item => item.slot === kind && item.quality === 'gray' && !used.has(item.id) && !item.cls);
              used.add(mod.id); F.equip(mod.id, slot);
            }
          }
          const bought = N.mods.find(mod => mod.slot === 'eye' && mod.quality === 'green' && !mod.cls && !G.modBag.includes(mod.id));
          N.mods.filter(mod => mod.id !== bought.id && (!mod.cls || mod.cls === G.classId)).slice(0, 220).forEach(F.own);
          G.credits = 1000; G.items = [];
          window.integrationPurchase = { id: bought.id, before: G.modBag.length, equipped: JSON.stringify(G.cyber) };
          N.presentation.openShop({ type: 'shop', data: { stock: [{ kind: 'cyber', id: bought.id, price: 50 }, { kind: 'heal', price: 9999 }] } }, 'buy');
        }, fullSlots);
        await page.locator('[data-buy="0"]').click();
        const result = await page.evaluate(() => ({ owned: __neon.G.modBag.includes(integrationPurchase.id), growth: __neon.G.modBag.length - integrationPurchase.before,
          credits: __neon.G.credits, onGround: __neon.G.items.some(item => item.mod && item.mod.id === integrationPurchase.id),
          equipped: Object.values(__neon.G.cyber).includes(integrationPurchase.id), existingSlotsUnchanged: JSON.stringify(__neon.G.cyber) === integrationPurchase.equipped }));
        return { pass: result.owned && result.growth === 1 && result.credits === 950 && !result.onGround && (fullSlots ? result.existingSlotsUnchanged : result.equipped), detail: result };
      });
    }

    await page.evaluate(() => {
      const N = __neon, G = N.G; integrationFixture.reset();
      G.chips = Array.from({ length: 70 }, () => N.makeChip('atk', 'gray'));
      N.presentation.openShop({ type: 'shop', data: { stock: [] } }, 'sell');
    });
    await check('Single black-market sale preserves scroll position', async () => {
      const before = await page.evaluate(() => {
        const card = document.querySelector('.card'); card.scrollTop = 740;
        const top = document.querySelector('.panel-tools').getBoundingClientRect().bottom;
        const button = Array.from(document.querySelectorAll('[data-sellp]')).find(node => { const r = node.getBoundingClientRect(); return r.top > top + 12 && r.bottom < innerHeight - 80; });
        return { scroll: card.scrollTop, index: button && button.dataset.sellp, chips: __neon.G.chips.length };
      });
      assert(before.index !== undefined, 'No visible sale button at the requested scroll position');
      await page.locator(`[data-sellp="${before.index}"]`).click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const after = await page.evaluate(() => ({ scroll: document.querySelector('.card').scrollTop, chips: __neon.G.chips.length }));
      return { pass: Math.abs(after.scroll - before.scroll) <= 2 && after.chips === before.chips - 1, detail: { before, after } };
    });
    await check('Black-market batch controls remain visible and unobscured while scrolling', async () => {
      const result = await page.evaluate(() => {
        const button = document.querySelector('#shBulk'), rect = button.getBoundingClientRect(), card = document.querySelector('.card').getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return { top: rect.top, bottom: rect.bottom, cardTop: card.top, cardBottom: card.bottom, accessible: hit === button || button.contains(hit) };
      });
      return { pass: result.top >= result.cardTop && result.bottom <= result.cardBottom && result.accessible, detail: result };
    });

    await check('Each approved integer enhancement stat gains at least one per level', async () => {
      const result = await page.evaluate(() => ['atk', 'def', 'maxHp'].map(stat => ({ stat, first: __neon.presentation.enhancementBonus(stat, 1, 1), second: __neon.presentation.enhancementBonus(stat, 1, 2) })));
      return { pass: result.every(item => item.first === 1 && item.second === 2), detail: result };
    });
    for (const success of [true, false]) {
      await check(`Enhancement wheel lands in the actual ${success ? 'success' : 'failure'} sector`, async () => {
        await page.evaluate(() => {
          const N = __neon, G = N.G, F = integrationFixture; F.reset(); F.own('body_gray');
          const item = G.inst.body_gray; Object.assign(item, { plus: 0, dur: 20, maxDur: 20 });
          window.integrationEnhance = { item, paid: 0 };
          N.test.v18.enhanceScreen('body_gray', item, { unit: '¥', cost: () => 5, can: () => true, pay: () => { integrationEnhance.paid++; }, back: () => N.test.hideOverlay() });
        });
        await page.evaluate(value => {
          const original = Math.random;
          try { Math.random = () => value ? 0 : 0.999999; document.querySelector('#enGo').click(); }
          finally { Math.random = original; }
        }, success);
        await page.waitForFunction(() => !!document.querySelector('.enhancement-wheel[data-result]'), null, { timeout: 5000 });
        const result = await page.evaluate(() => {
          const wheel = document.querySelector('.enhancement-wheel');
          const rotation = Number(wheel.querySelector('.enhancement-wheel-disk').style.transform.match(/rotate\(([-.\de+]+)rad\)/)[1]);
          return { result: wheel.dataset.result, pointerSuccess: NeonEnhancementWheel.sectorAt(0.9, rotation), plus: integrationEnhance.item.plus, durability: integrationEnhance.item.dur, paid: integrationEnhance.paid };
        });
        return { pass: result.result === (success ? 'success' : 'fail') && result.pointerSuccess === success && result.plus === (success ? 1 : 0) && result.durability === (success ? 19 : 17) && result.paid === 1, detail: result };
      });
    }

    await check('Blue corporate chip uses cyan quality and a drawn hardware canvas', async () => {
      const result = await page.evaluate(() => {
        const N = __neon; integrationFixture.reset();
        N.G.chips = [N.test.corp.makeCorpChip('dome', 'blue', false)];
        N.test.v18.openBag('chips');
        const icon = document.querySelector('.chipico'), canvas = icon.querySelector('canvas');
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let visible = 0, cyan = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3]) visible++;
          if (pixels[i] < 100 && pixels[i + 1] > 150 && pixels[i + 2] > 180 && pixels[i + 3] > 100) cyan++;
        }
        return { quality: canvas.dataset.chipQuality, ink: icon.style.getPropertyValue('--cq'), visible, cyan };
      });
      return { pass: result.quality === 'blue' && result.ink === '#22e6ff' && result.visible > 1000 && result.cyan > 20, detail: result };
    });

    await check('Captured turret preserves its entity, combat stats and model identity', async () => {
      const result = await page.evaluate(() => {
        const N = __neon, G = N.G, F = integrationFixture; F.reset();
        const turret = F.enemy(8, 8, 'turret');
        Object.assign(turret, { hp: 42, maxHp: 77, atk: 11, def: 3, range: 6 });
        const spec = turret.spec, glyph = turret.glyph, brain = turret.brain;
        N.test.v18.ghostHackAct('hijack', turret, { n: '骇入' });
        window.integrationTurret = turret;
        return { sameEntity: G.allies[0] === turret, removedFromEnemies: !G.enemies.includes(turret), sameSpec: turret.spec === spec, sameBrain: turret.brain === brain, sameGlyph: turret.glyph === glyph,
          hp: turret.hp, maxHp: turret.maxHp, atk: turret.atk, def: turret.def, range: turret.range, ai: turret.ai, controlled: N.hackedUnits.handles(turret) };
      });
      return { pass: result.sameEntity && result.removedFromEnemies && result.sameSpec && result.sameBrain && result.sameGlyph && result.hp === 42 && result.maxHp === 77 && result.atk === 11 && result.def === 3 && result.range === 6 && result.ai === 'turret' && result.controlled, detail: result };
    });
    await check('Captured turret ranged damage is independent of player attack', async () => {
      const result = await page.evaluate(() => {
        const N = __neon, G = N.G, actor = integrationTurret;
        const target = integrationFixture.enemy(12, 8); target.def = 0;
        N.p.atk = 1; actor.cd = 0; N.alliesAct(); const first = 1000 - target.hp;
        target.hp = 1000; N.p.atk = 999; actor.cd = 0; N.alliesAct(); const second = 1000 - target.hp;
        return { first, second, distance: Math.max(Math.abs(actor.x - target.x), Math.abs(actor.y - target.y)), beams: G.beams.length };
      });
      return { pass: result.first > 0 && result.first === result.second && result.distance > 1 && result.beams > 0, detail: result };
    });
    await check('Hostiles can target and damage a captured ally', async () => {
      const result = await page.evaluate(() => {
        const N = __neon, G = N.G, ally = integrationTurret;
        G.enemies = []; const hostile = integrationFixture.enemy(ally.x + 1, ally.y); hostile.cd = 100;
        const allyBefore = ally.hp, playerBefore = N.p.hp;
        N.test.enemyAct(hostile, N.test.buildDistMap());
        return { allyBefore, allyAfter: ally.hp, playerBefore, playerAfter: N.p.hp, targetUid: hostile.combatTargetUid, allyUid: ally.uid };
      });
      return { pass: result.allyAfter < result.allyBefore && result.playerAfter === result.playerBefore && result.targetUid === result.allyUid, detail: result };
    });
    await check('Captured caster fields expire with their control duration', async () => {
      const result = await page.evaluate(() => {
        const N = __neon, G = N.G, F = integrationFixture; F.reset();
        const caster = F.enemy(8, 8, 'summoner'); caster.uid = 98701;
        G.hazards = [{ sourceUid: caster.uid, kind: 'acid', cells: [{ x: 10, y: 8 }], delay: 1, life: 4, damage: 8 }];
        N.test.v18.ghostHackAct('hijack', caster, { n: '骇入' });
        const adopted = G.hackedFields.length;
        const target = F.enemy(10, 8), hp = target.hp;
        G.turn = caster.hackedExpiresTurn; N.hackedUnits.tickFields();
        return { adopted, hostileFields: G.hazards.length, remaining: G.hackedFields.length, targetUnharmed: target.hp === hp };
      });
      return { pass: result.adopted === 1 && !result.hostileFields && !result.remaining && result.targetUnharmed, detail: result };
    });
    await check('Descending through the actual stair entry clears friendly fields and captured units', async () => {
      await page.evaluate(() => {
        const N = __neon, G = N.G, F = integrationFixture; F.reset();
        const caster = F.enemy(8, 8, 'summoner'); caster.uid = 98702;
        G.hazards = [{ sourceUid: caster.uid, kind: 'acid', cells: [{ x: 10, y: 8 }], delay: 1, life: 4, damage: 8 }];
        N.test.v18.ghostHackAct('hijack', caster, { n: '骇入' });
        G.stairs = { x: N.p.x, y: N.p.y }; N.test.econ.checkStairs();
      });
      await page.waitForFunction(() => __neon.G.depth === 2 && !__neon.G.busy, null, { timeout: 5000 });
      const result = await page.evaluate(() => ({ depth: __neon.G.depth, fields: __neon.G.hackedFields.length, captured: __neon.G.allies.filter(__neon.hackedUnits.handles).length }));
      return { pass: result.depth === 2 && !result.fields && !result.captured, detail: result };
    });

    await check('Progression distinguishes next-level reroll increment from completed cumulative value', async () => {
      const result = await page.evaluate(() => {
        const N = __neon, upgrade = N.progression.upgrades.find(item => item.id === 'l2b');
        N.G.state = 'menu'; N.meta.up.l2b = 1; N.test.ui.showMeta();
        const next = document.querySelector('[data-buy="l2b"]').textContent;
        N.meta.up.l2b = 2; N.test.ui.showMeta();
        const complete = document.querySelector('[data-buy="l2b"]').textContent;
        return { next, complete, nextDescription: N.progression.description(upgrade, 1), completeDescription: N.progression.description(upgrade, 2) };
      });
      return { pass: /下一级/.test(result.next) && /重掷 1 次/.test(result.next) && /累计/.test(result.complete) && /重掷 2 次/.test(result.complete), detail: result };
    });
    await check('Existing b3a node level is retained and applies four starting HP per level', async () => {
      const result = await page.evaluate(() => {
        const N = __neon, G = N.G; integrationFixture.reset();
        G.trainPending = false; N.meta.up = {}; N.startGame(); N.test.hideOverlay();
        const base = N.p.maxHp;
        N.meta.up.b3a = 2; N.startGame(); N.test.hideOverlay();
        const upgrade = N.progression.upgrades.find(item => item.id === 'b3a');
        return { level: N.meta.up.b3a, name: upgrade.name, hpPerLevel: upgrade.stat.hp, base, upgraded: N.p.maxHp };
      });
      return { pass: result.level === 2 && result.name === '强化骨架' && result.hpPerLevel === 4 && result.upgraded - result.base === 8, detail: result };
    });

    await check('Normal menu exposes the approved NPC threshold and free one-time unlock', async () => {
      await page.evaluate(() => {
        const N = __neon, ST = N.test.story.ST;
        Object.assign(ST, { npcUnlocks: {}, npc: {}, relics: {}, maxDepth: 3 }); N.stats.bestDepth = 3;
        N.G.state = 'menu'; N.test.ui.menuScreen('ember');
        window.integrationCores = N.meta.cores;
      });
      await page.locator('[data-mnact="archive"]').click();
      await page.locator('[data-arc="people"]').click();
      const gates = await page.evaluate(() => ['npc_qiao', 'npc_sinan', 'npc_nie'].map(id => ({ id, disabled: document.querySelector(`[data-npc-unlock="${id}"]`).disabled })));
      await page.locator('[data-npc-unlock="npc_qiao"]').click();
      const result = await page.evaluate(() => ({ unlocked: __neon.test.story.ST.npcUnlocks.npc_qiao === true, text: document.querySelector('[data-npc-unlock="npc_qiao"]').textContent,
        disabled: document.querySelector('[data-npc-unlock="npc_qiao"]').disabled, free: __neon.meta.cores === integrationCores,
        stored: JSON.parse(localStorage.getItem('neon-depth-story')).npcUnlocks.npc_qiao === true }));
      return { pass: !gates[0].disabled && gates[1].disabled && gates[2].disabled && result.unlocked && result.disabled && result.free && result.stored && result.text === '已解锁', detail: { gates, result } };
    });
    await check('NPC unlock survives a page reload', async () => {
      await page.reload();
      const result = await page.evaluate(() => ({ unlocked: __neon.test.story.ST.npcUnlocks.npc_qiao === true, saved: JSON.parse(localStorage.getItem('neon-depth-story')).npcUnlocks.npc_qiao === true }));
      return { pass: result.unlocked && result.saved, detail: result };
    });
    checks.push({ name: 'No browser runtime errors', passed: errors.length === 0, detail: errors });
    console.log(JSON.stringify({ passed: checks.every(check => check.passed), count: checks.length, checks }, null, 2));
    assert(checks.every(check => check.passed), 'Integration regressions failed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
