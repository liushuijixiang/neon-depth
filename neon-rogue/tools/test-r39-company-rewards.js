const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const project = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
}
const input = path.resolve(option('--source', path.join(project, 'neon-rogue/dist.debug.html')));
const output = path.resolve(option('--output', path.join(project, 'work/r39/company-rewards-after.json')));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { localStorage.clear(); localStorage.setItem('neon-depth-mute', '1'); });
    await page.goto(pathToFileURL(input).href);
    const checks = await page.evaluate(() => {
      const N = __neon, G = N.G, T = N.test, K = T.corp, rows = [];
      const originalRandom = Math.random;
      function seed(value) {
        let number = value >>> 0;
        Math.random = () => {
          number = (number + 0x6D2B79F5) >>> 0;
          let result = Math.imul(number ^ number >>> 15, 1 | number);
          result ^= result + Math.imul(result ^ result >>> 7, 61 | result);
          return ((result ^ result >>> 14) >>> 0) / 4294967296;
        };
      }
      function clean(chip) {
        const value = JSON.parse(JSON.stringify(chip));
        delete value.trialChip; delete value.trialUpgrade; delete value.trialBaseValue;
        return JSON.stringify(value);
      }
      function allChips() {
        return G.chips.concat(Object.values(G.cyberChips).flat()).filter(Boolean).map(clean).sort();
      }
      function equipment() { return Object.entries(G.cyber).sort(([a], [b]) => a.localeCompare(b)); }
      function reset(index, withGear) {
        seed(39000 + index);
        G.classId = ['assault', 'engineer', 'ghost'][index % 3]; G.trainPending = true; G.rushPending = null;
        N.meta.up = {}; N.startGame(); T.hideOverlay();
        Object.assign(G, { state: 'play', mode: 'normal', paused: false, busy: false, modal: null, hitStopUntil: 0,
          cyber: {}, cyberChips: {}, chips: [], modBag: [], mods: {}, inst: {}, runMod: {}, cyberCd: {}, cyberGrowth: {},
          adaptBonus: 0, trainBonus: { hp: 0, atk: 0, def: 0 }, chal: null, items: [], enemies: [], allies: [], sites: [],
          quests: [], storyQueue: [], pendingBoard: null, pendingBoons: 0, pendingEvo: 0,
          pendingCorpReward: null, pendingPassage: null, trialKit: null, corpOp: null, depth: 1 });
        Object.assign(N.p, { level: 1, pending: 0, itemMax: 0, itemAtk: 0, itemDef: 0, buffs: [], x: 10, y: 10 });
        N.recalc(); N.p.hp = N.p.maxHp;
        G.chips.push(N.makeChip('atk', 'gray'), N.makeChip('hp', 'green'));
        if (withGear) {
          for (const [id, slot] of [['body_red', 'body'], ['hand_green', 'handL'], ['eye_gray', 'eyeL']]) {
            const mod = N.mods.find(item => item.id === id);
            G.inst[id] = { name: mod.name, affixes: [], plus: 0, heavy: 0, dur: 15, maxDur: 20 };
            G.modBag.push(id);
            if (!N.installCyber(id, slot)) throw new Error('Cannot set up ' + id);
          }
          const chip = G.chips.find(item => item.quality === 'gray');
          if (!N.equipment.installChip('body', chip)) throw new Error('Cannot set up original chip');
        }
        T.hideOverlay(); G.paused = false; G.busy = false; G.modal = null;
        N.p.hp = Math.max(1, N.p.maxHp - 3);
      }
      let serial = 0;
      for (const corp of ['kharon', 'dome', 'mobius']) {
        for (const quality of ['purple', 'orange', 'red']) {
          for (const withGear of [false, true]) {
            for (let rewardIndex = 0; rewardIndex < 8; rewardIndex++) {
              reset(serial++, withGear);
              const originalEquipment = equipment(), originalBag = G.modBag.slice().sort(), originalChips = allChips();
              K.trialBegin(corp, quality);
              const rewardId = G.trialKit.ids[rewardIndex];
              const rewardSlot = Object.keys(G.cyber).find(slot => G.cyber[slot] === rewardId);
              const rewardChips = G.cyberChips[rewardSlot].map(clean);
              const healthBefore = N.p.hp, creditsBefore = G.credits;
              K.corpRewardScreen(corp);
              const button = [...document.querySelectorAll('[data-crw]')].find(item => item.getAttribute('data-crw') === rewardId);
              if (!button) throw new Error('Reward button unavailable for ' + rewardId);
              button.click();
              const installed = Object.values(G.cyber).includes(rewardId);
              const afterFirst = JSON.stringify({ bag: G.modBag, cyber: G.cyber, chips: allChips(), credits: G.credits });
              button.click();
              const afterSecond = JSON.stringify({ bag: G.modBag, cyber: G.cyber, chips: allChips(), credits: G.credits });
              const expectedChips = originalChips.concat(rewardChips).sort();
              const expectedBag = originalBag.concat(rewardId).sort();
              rows.push({ name: 'reward', corp, quality, withGear, rewardId, installed,
                safe: N.cyberLoad() <= N.adaptationCap(), load: N.cyberLoad(), cap: N.adaptationCap(),
                equipmentRestoredWhenStored: installed || JSON.stringify(equipment()) === JSON.stringify(originalEquipment),
                allItemsRetained: JSON.stringify(G.modBag.slice().sort()) === JSON.stringify(expectedBag),
                allChipsRetained: JSON.stringify(allChips()) === JSON.stringify(expectedChips),
                noTrialChip: !G.chips.concat(Object.values(G.cyberChips).flat()).filter(Boolean).some(chip => chip.trialChip),
                healthPreserved: N.p.hp === Math.min(healthBefore, N.p.maxHp),
                creditsOnce: G.credits === creditsBefore + 34, idempotent: afterFirst === afterSecond,
                settled: !G.trialKit && !G.pendingCorpReward });
            }
          }
        }
      }
      for (const equipped of [false, true]) {
        reset(serial++, false);
        const corp = 'kharon', quality = 'red';
        const definition = K.CORP_MODS.find(item => item.corp === corp && item.q === quality && item.slot === 'eye');
        const id = definition.id, mod = N.mods.find(item => item.id === id);
        G.inst[id] = { name: mod.name, affixes: [], plus: 0, heavy: 0, dur: 13, maxDur: 20, origin: 'original' };
        G.modBag.push(id);
        if (equipped && !N.installCyber(id, 'eyeL')) throw new Error('Cannot equip the borrowed original');
        const originalInstance = JSON.stringify(G.inst[id]), originalChips = allChips(), originalBag = G.modBag.slice().sort();
        K.trialBegin(corp, quality);
        const slot = Object.keys(G.cyber).find(key => G.cyber[key] === id);
        const rewardChips = G.cyberChips[slot].map(clean), creditsBefore = G.credits, healthBefore = N.p.hp;
        K.corpRewardScreen(corp);
        document.querySelector('[data-crw="' + id + '"]').click();
        rows.push({ name: 'borrowed', equipped, safe: N.cyberLoad() <= N.adaptationCap(),
          originalInstanceRetained: JSON.stringify(G.inst[id]) === originalInstance,
          allItemsRetained: JSON.stringify(G.modBag.slice().sort()) === JSON.stringify(originalBag),
          allChipsRetained: JSON.stringify(allChips()) === JSON.stringify(originalChips.concat(rewardChips).sort()),
          creditsOnce: G.credits === creditsBefore + 34 + Math.round(118 * .4),
          healthPreserved: N.p.hp === Math.min(healthBefore, N.p.maxHp), settled: !G.trialKit && !G.pendingCorpReward });
      }
      for (const legacy of [false, true]) {
        reset(serial++, true);
        K.trialBegin('dome', 'orange');
        const id = G.trialKit.ids[0];
        K.corpRewardScreen('dome');
        if (legacy) {
          const run = JSON.parse(localStorage.getItem('neon-depth-run'));
          run.G.pendingCorpReward = null;
          localStorage.setItem('neon-depth-run', JSON.stringify(run));
        }
        const loaded = T.save.loadRun();
        const button = [...document.querySelectorAll('[data-crw]')].find(item => item.getAttribute('data-crw') === id);
        const recovered = loaded && G.modal === 'corpreward' && !!button && G.pendingCorpReward === 'dome';
        if (button) button.click();
        rows.push({ name: 'resume', legacy, recovered, settled: recovered && !G.trialKit && !G.pendingCorpReward,
          safe: recovered && N.cyberLoad() <= N.adaptationCap() });
      }
      Math.random = originalRandom; G.paused = true;
      return rows;
    });
    const required = ['safe', 'equipmentRestoredWhenStored', 'allItemsRetained', 'allChipsRetained', 'noTrialChip',
      'healthPreserved', 'creditsOnce', 'idempotent', 'settled', 'originalInstanceRetained', 'recovered'];
    const failures = checks.filter(row => required.some(key => row[key] === false));
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify({ input, checks, errors, failures }, null, 2));
    console.log(JSON.stringify({ scenarios: checks.length, failures: failures.length, examples: failures.slice(0, 4), errors }, null, 2));
    assert(failures.length === 0 && errors.length === 0, 'Company reward regression');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
