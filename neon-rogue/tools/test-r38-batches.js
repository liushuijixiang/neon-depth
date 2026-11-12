const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const evidence = path.resolve(root, '../work/r38');

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const failures = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', error => failures.push(error.message));
    await page.addInitScript(() => {
      localStorage.clear(); localStorage.setItem('neon-depth-mute', '1');
      localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
    });
    await page.goto(pathToFileURL(path.join(root, 'dist.debug.html')).href);
    const checks = await page.evaluate(() => {
      const N = window.__neon, T = N.test, G = N.G, results = [];
      const check = (name, passed, detail) => results.push({ name, passed: !!passed, detail });
      function reset(mode = 'normal') {
        G.classId = 'assault'; G.prepPick = null; G.dreamPending = null; G.rushPending = null; G.trainPending = true;
        N.meta.up = {}; T.story.ST.pendingDrink = null;
        N.startGame(); T.hideOverlay();
        Object.assign(G, { mode, state: 'play', modal: null, paused: false, busy: false, hitStopUntil: 0,
          cyber: {}, cyberChips: {}, chips: [], modBag: [], mods: {}, inst: {}, runMod: {},
          adaptBonus: 0, trainBonus: { hp: 0, atk: 0, def: 0 }, chal: null, enemies: [], items: [], sites: [],
          activeSwap: null, activeLoot: null, swapQueue: [], lootQueue: [], storyQueue: [], quests: [],
          pendingBoons: 0, pendingEvo: 0, pendingBoard: null, pendingCorpReward: null, trialKit: null, corpOp: null, b16: null });
        N.p.level = 1; N.p.pending = 0; N.p.itemMax = 0; N.p.itemAtk = 0; N.p.itemDef = 0;
        N.p.x = 10; N.p.y = 10; N.p.buffs = [];
        G.map = Array.from({ length: 30 }, (_, y) => Array.from({ length: 44 }, (_, x) => x === 0 || y === 0 || x === 43 || y === 29 ? 1 : 0));
        G.vis = G.map.map(row => row.map(() => 1)); G.seen = G.map.map(row => row.map(() => 1));
        G.stairs = { x: 40, y: 26 }; N.recalc(); N.p.hp = N.p.maxHp;
      }
      function instance(id, plus = 0, heavy = 0) {
        const mod = N.mods.find(mod => mod.id === id);
        return { name: mod.name, affixes: [], plus, heavy, dur: 11, maxDur: 20 };
      }
      function compatibility(heavy = 0) {
        const chip = N.makeChip('compat', 'red');
        chip.val = 3; chip.heavy = heavy;
        chip.affixes = [{ stat: 'compat', val: 1, name: chip.name, quality: 'red' }];
        return chip;
      }
      function attach(slot, id, chips = []) {
        const mod = N.mods.find(mod => mod.id === id);
        G.cyber[slot] = id; G.cyberChips[slot] = chips; G.modBag.push(id); G.mods[id] = 1; G.inst[id] = instance(id);
        for (const [key, value] of Object.entries(mod.stats || {})) G.runMod[key] = (G.runMod[key] || 0) + value;
      }
      const allChips = () => G.chips.concat(Object.values(G.cyberChips).flat());
      const snapshot = () => JSON.stringify({ cyber: G.cyber, chips: G.cyberChips, pool: G.chips, bag: G.modBag, inst: G.inst, hp: N.p.hp, runMod: G.runMod });

      reset();
      const entries = [
        { id: 'body_red', inst: instance('body_red', 5, 1), chips: Array.from({ length: 4 }, () => compatibility()) },
        { id: 'spine_gray', inst: instance('spine_gray'), chips: [] },
        { id: 'eye_gray', inst: instance('eye_gray'), chips: [] }
      ];
      N.p.hp = 7;
      const oldSetItem = Storage.prototype.setItem, writes = [];
      Storage.prototype.setItem = function (key, value) { if (key === 'neon-depth-run') writes.push(JSON.parse(value)); return oldSetItem.call(this, key, value); };
      const prepared = N.equipment.prepared(entries, []);
      check('complete prepared compatibility set commits together', prepared.committed && Object.keys(G.cyber).length === 3 && N.cyberLoad() === N.adaptationCap(), { load: N.cyberLoad(), cap: N.adaptationCap() });
      check('prepared commit preserves HP and emits no intermediate run saves', N.p.hp === 7 && writes.length === 0);
      check('prepared import keeps original instances and all attached chips', G.inst.body_red === entries[0].inst && allChips().length === 4 && G.cyberChips.body.length === 4);

      reset();
      writes.length = 0;
      G.trainPending = false; G.prepPick = { cybers: [], stashItems: entries, stashChips: [] };
      N.startGame();
      check('normal start imports a complete final-compatible stash loadout', G.mode === 'normal' && Object.keys(G.cyber).length === 3 && N.cyberLoad() <= N.adaptationCap() && G.inst.body_red.plus === 5 && G.inst.body_red.heavy === 1 && G.inst.body_red.dur === 11);
      check('normal startup persists only the final prepared gear', writes.length > 0 && writes.every(write => Object.keys(write.G.cyber).length === 3), writes.map(write => Object.keys(write.G.cyber).length));
      Storage.prototype.setItem = oldSetItem;

      reset();
      const redSet = T.corp.CORP_MODS.filter(definition => definition.corp === 'dome' && definition.q === 'red');
      const rushEntries = redSet.map(definition => ({ id: definition.id, inst: instance(definition.id), chips: Array.from({ length: 4 }, () => compatibility()) }));
      G.trainPending = false; G.rushPending = { cyber: rushEntries.map(entry => entry.id), stashItems: rushEntries };
      N.startGame();
      check('RUSH loads eight red implants before judging their attached compatibility chips', G.mode === 'rush' && Object.keys(G.cyber).length === 8 && N.cyberLoad() <= N.adaptationCap(), { implants: Object.keys(G.cyber).length, load: N.cyberLoad(), cap: N.adaptationCap() });
      check('RUSH retains attached chips and all four ordinary bonus chips', allChips().length === 36 && Object.values(G.cyberChips).flat().length === 32, { total: allChips().length, installed: Object.values(G.cyberChips).flat().length });

      reset();
      const slotNames = { eye: 'eyeL', eye2: 'eyeR', hand: 'handL', hand2: 'handR', body: 'body', spine: 'spine', leg: 'legL', leg2: 'legR' };
      const recording = { cls: 'assault', lv: 20, cyber: {}, chips: {}, inst: {}, run: {} };
      redSet.forEach(definition => {
        const slot = slotNames[definition.slot]; recording.cyber[slot] = definition.id;
        recording.chips[slot] = Array.from({ length: 4 }, () => compatibility(100));
        recording.inst[definition.id] = instance(definition.id);
      });
      N.meta.myDream = recording;
      const recordingBefore = JSON.stringify(recording);
      const dream = Object.assign({}, T.v18.DREAMS[0], { kit: 'mine', opening: [], ending: [] });
      T.v18.dreamBegin(dream);
      check('recorded dream settles the final load and keeps displaced chips', G.mode === 'dream' && N.cyberLoad() <= N.adaptationCap() && allChips().length === 32 && G.modBag.length === 8, { load: N.cyberLoad(), cap: N.adaptationCap(), chips: allChips().length });
      check('dream setup uses independent copies of saved equipment', JSON.stringify(recording) === recordingBefore && Object.keys(G.inst).every(id => G.inst[id] !== recording.inst[id]));
      G.dreamPending = null; G.trainPending = false; G.rushPending = null; G.prepPick = null;
      N.startGame();
      check('dream-only adaptation does not leak into a later normal run', G.adaptBonus === 0 && N.adaptationCap() === 10, { bonus: G.adaptBonus, cap: N.adaptationCap() });

      reset('train');
      const sourceChip = N.makeChip('hp', 'red'), displacedChip = N.makeChip('hp', 'blue');
      sourceChip.val = 50; sourceChip.affixes = []; displacedChip.val = 20; displacedChip.affixes = [];
      attach('eyeL', 'eye_blue', [sourceChip]); attach('eyeR', 'eye_red', [displacedChip]);
      N.recalc(); N.p.hp = 80;
      let currentHp = N.p.hp; const healthWrites = [];
      Object.defineProperty(N.p, 'hp', { configurable: true, get: () => currentHp, set: value => { healthWrites.push(value); currentHp = value; } });
      const moved = T.training.install('eyeR', 'eye_blue', false);
      check('training move preserves HP through one final layout', moved && N.p.hp === 80 && healthWrites.every(value => value === 80) && !G.cyber.eyeL && G.cyber.eyeR === 'eye_blue', healthWrites);
      check('training move retains the original fitting chip and original discard behavior', G.cyberChips.eyeR[0] === sourceChip && G.chips.length === 0 && !allChips().includes(displacedChip));
      G.adaptBonus = -10;
      check('training retains its explicit class and adaptation override', T.training.install('body', 'stealth_heal', false) && G.cyber.body === 'stealth_heal' && N.cyberLoad() > N.adaptationCap());

      reset();
      attach('body', 'body_blue'); attach('spine', 'spine_red');
      const compat = N.makeChip('compat', 'gray'); compat.val = 3; compat.affixes = [];
      G.cyberChips.body = [compat];
      G.cyberChips.spine = Array.from({ length: 3 }, () => { const chip = N.makeChip('atk', 'gray'); chip.val = 1; chip.affixes = []; return chip; });
      N.recalc(); N.p.hp = 7; G.credits = 100;
      const site = { type: 'reforge', x: 10, y: 10, data: {}, used: false }; G.sites = [site];
      const oldRandom = Math.random, oldEquipment = snapshot();
      T.econ.openSite(site);
      Math.random = () => 0;
      document.querySelector('[data-rf="body"]').click();
      check('normal reforge UI refunds a rejected final overload', G.credits === 100 && site.data.uses === 0 && snapshot() === oldEquipment);
      Math.random = () => .99;
      document.querySelector('[data-rf="body"]').click();
      Math.random = oldRandom;
      check('normal reforge UI charges once for a successful atomic replacement', G.credits === 82 && site.data.uses === 1 && G.cyber.body !== 'body_blue' && allChips().length === 4 && N.p.hp === 7);
      const saved = T.save.savedRun();
      check('successful reforge saves its matching fee and equipment result', saved.G.credits === 82 && saved.G.cyber.body === G.cyber.body && saved.p.hp === 7);

      reset();
      const heal = T.econ.items.find(item => item.kind === 'heal');
      T.econ.applyItem(heal, 10, 10);
      check('full-health healing feedback reports zero real HP gain', G.log.some(entry => entry.text === heal.name + ' · +0 HP'));
      N.p.hp = N.p.maxHp - 2; T.econ.applyItem(heal, 10, 10);
      check('partial healing feedback reports only its actual gain', G.log.some(entry => entry.text === heal.name + ' · +2 HP'));
      G.mode = 'train'; G.paused = true;
      return results;
    });

    async function audioPickup(filename) {
      const audioPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
      audioPage.on('pageerror', error => failures.push(error.message));
      await audioPage.addInitScript(() => {
        localStorage.clear(); localStorage.setItem('neon-depth-mute', '0');
        localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
      });
      await audioPage.goto(pathToFileURL(filename).href);
      await audioPage.mouse.click(3, 3);
      await audioPage.evaluate(async () => { await window.NeonAudio.unlock(); window.NeonAudio.setMuted(false); });
      const measure = await audioPage.evaluate(() => {
        const N = window.__neon, G = N.G;
        G.trainPending = true; N.startGame(); N.test.hideOverlay();
        G.mode = 'normal'; G.state = 'play'; G.paused = false; G.busy = false;
        G.chips = []; G.items = []; G.enemies = []; G.sites = []; G.quests = []; G.pendingBoard = null; G.storyQueue = []; N.p.pending = 0;
        for (let index = 0; index < 2000; index++) G.items.push({ x: N.p.x, y: N.p.y, chip: N.makeChip(index % 2 ? 'atk' : 'hp', 'blue') });
        const before = window.NeonAudio.snapshot();
        N.test.v18.pickup(N.p.x, N.p.y, true);
        const after = window.NeonAudio.snapshot();
        return { before, after, effectDelta: after.effectCount - before.effectCount, chips: G.chips.length,
          toasts: [...document.querySelectorAll('#toasts .toast')].map(element => element.textContent), particles: G.particles.length };
      });
      await audioPage.waitForTimeout(1000);
      measure.afterCleanup = await audioPage.evaluate(() => window.NeonAudio.snapshot());
      await audioPage.close();
      return measure;
    }
    const audioBefore = await audioPickup(path.join(evidence, 'batch-input.debug.html'));
    const audioAfter = await audioPickup(path.join(root, 'dist.debug.html'));
    checks.push({ name: 'unmuted bulk pickup collects all items with one complete pickup cue', passed: audioAfter.chips === 2000 && audioAfter.effectDelta === 1 && audioAfter.after.contextState === 'running', detail: audioAfter });
    checks.push({ name: 'bulk pickup retains the same visible final notifications and particle count', passed: JSON.stringify(audioBefore.toasts) === JSON.stringify(audioAfter.toasts) && audioBefore.particles === audioAfter.particles, detail: { before: audioBefore.toasts, after: audioAfter.toasts } });
    checks.push({ name: 'unmuted bulk pickup avoids thousands of simultaneously retained voices', passed: audioBefore.effectDelta === 2000 && audioAfter.after.activeVoices < 100 && audioAfter.afterCleanup.activeVoices < 100, detail: { before: audioBefore.after.activeVoices, after: audioAfter.after.activeVoices, cleanup: audioAfter.afterCleanup.activeVoices } });
    checks.push({ name: 'no uncaught browser errors', passed: failures.length === 0, detail: failures });
    fs.writeFileSync(path.join(evidence, 'batch-regression.json'), JSON.stringify({ checks, audioBefore, audioAfter }, null, 2));
    for (const item of checks) console.log(`${item.passed ? 'PASS' : 'FAIL'} ${item.name}${item.passed ? '' : ' ' + JSON.stringify(item.detail)}`);
    assert(checks.every(item => item.passed), 'Prepared loadout or pickup feedback regression');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
