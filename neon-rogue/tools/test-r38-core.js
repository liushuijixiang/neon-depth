const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('neon-depth-mute', '1');
      localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
    });
    await page.goto(pathToFileURL(path.join(root, 'dist.debug.html')).href);
    const checks = await page.evaluate(async () => {
      const N = window.__neon, G = N.G, T = N.test, E = N.equipment, results = [];
      const check = (name, passed, detail) => results.push({ name, passed: !!passed, detail });
      function reset(cls = 'assault') {
        G.classId = cls; G.trainPending = true; G.rushPending = null;
        N.startGame(); T.hideOverlay();
        Object.assign(G, { state: 'play', mode: 'normal', paused: false, busy: false, modal: null,
          pendingBoard: null, pendingBoons: 0, pendingEvo: 0, pendingCorpReward: null,
          storyQueue: [], swapQueue: [], lootQueue: [], quests: [], enemies: [], items: [], sites: [], allies: [],
          hazards: [], mines: [], walls: [], cams: [], cfence: [], cmines: [], corpses: [],
          corpOp: null, trial: null, trialKit: null, b16: null, control: null, stance: null, sandev: null,
          cyber: {}, cyberChips: {}, chips: [], mods: {}, modBag: [], inst: {}, runMod: {},
          trainBonus: { hp: 0, atk: 0, def: 0 }, adaptBonus: 0, chal: null, depth: 1, turn: 6,
          inv: [], floorDamage: 0, hitStopUntil: 0, stealth: 0, ghostStealth: 0,
          ghostRevealed: false, instab: 25, freeze: 0, overT: 0, burnout: false, credits: 128 });
        N.meta.up = {};
        Object.assign(N.p, { x: 10, y: 10, level: 1, pending: 0, itemMax: 0, itemAtk: 0, itemDef: 0, buffs: [] });
        G.map = Array.from({ length: 30 }, (_, y) => Array.from({ length: 44 }, (_, x) => x === 0 || y === 0 || x === 43 || y === 29 ? 1 : 0));
        G.vis = G.map.map(row => row.map(() => 1));
        G.seen = G.map.map(row => row.map(() => 1));
        G.rooms = [{ x: 1, y: 1, w: 42, h: 28 }]; G.stairs = { x: 40, y: 26 };
        N.recalc(); N.p.hp = N.p.maxHp;
        return N.p;
      }
      function own(id) {
        const mod = N.mods.find(item => item.id === id);
        if (!mod) throw new Error(`Missing fixture implant ${id}`);
        if (!G.modBag.includes(id)) G.modBag.push(id);
        G.inst[id] = { name: mod.name, affixes: [], plus: 0, dur: 20, maxDur: 20, heavy: 0 };
        return mod;
      }
      function setGear(entries) {
        for (const [slot, id] of Object.entries(entries)) {
          const mod = own(id); G.cyber[slot] = id; G.mods[id] = 1; G.cyberChips[slot] = [];
          for (const [stat, value] of Object.entries(mod.stats || {})) G.runMod[stat] = (G.runMod[stat] || 0) + value;
        }
        N.recalc(); N.p.hp = N.p.maxHp;
      }
      function chip(stat, value, quality = 'gray') {
        const item = N.makeChip(stat === 'critMult' ? 'critdmg' : stat, quality);
        item.val = value; item.affixes = []; return item;
      }
      function signature() {
        return JSON.stringify({ cyber: G.cyber, chips: G.cyberChips, pool: G.chips,
          mods: G.mods, runMod: G.runMod, hp: N.p.hp, maxHp: N.p.maxHp, items: G.items });
      }

      reset();
      setGear({ body: 'body_red', spine: 'spine_purple' });
      check('fixture reaches exact adaptation capacity', N.cyberLoad() === N.adaptationCap(), { load: N.cyberLoad(), cap: N.adaptationCap() });
      const candidate = N.mods.find(mod => mod.slot === 'hand' && mod.quality === 'green' && !mod.cls && !mod.corp && !mod.relic);
      G.items.push({ x: N.p.x, y: N.p.y, mod: candidate, seed: 0 });
      const hp = N.p.hp;
      T.v18.pickup(N.p.x, N.p.y, true);
      check('implant pickup at equality stays in bag and preserves equipped set', G.modBag.includes(candidate.id) && !Object.values(G.cyber).includes(candidate.id) && N.cyberLoad() <= N.adaptationCap() && N.p.hp === hp);
      const attackChip = chip('atk', 2, 'blue');
      const destination = N.addChipObject(attackChip);
      check('ordinary chip base weight is counted at equality', destination === 'bag' && G.chips.includes(attackChip) && N.cyberLoad() === N.adaptationCap());
      const compatibleChip = chip('compat', 2, 'blue');
      check('compatibility chip can fit by increasing final adaptation', N.addChipObject(compatibleChip) === 'socket' && N.cyberLoad() === N.adaptationCap());

      reset();
      const domeEye = N.mods.find(mod => mod.corp === 'dome' && mod.quality === 'purple' && mod.slot === 'eye');
      const domeLeg = N.mods.find(mod => mod.corp === 'dome' && mod.quality === 'purple' && mod.slot === 'leg');
      setGear({ body: 'body_orange', eyeL: domeEye.id });
      G.inst[domeLeg.id] = { name: domeLeg.name, affixes: [], plus: 0, dur: 20, maxDur: 20, heavy: 0 };
      N.applyMod(domeLeg);
      check('implant preview includes the final two-piece adaptation bonus', Object.values(G.cyber).includes(domeLeg.id) && N.cyberLoad() === N.adaptationCap(), { load: N.cyberLoad(), cap: N.adaptationCap() });
      own('legL_blue');
      const beforeSwap = signature();
      const refusedSwap = N.installCyber('legL_blue', 'legL');
      check('swap cannot remove compatibility and overload the final set', refusedSwap === false && signature() === beforeSwap);

      reset();
      setGear({ body: 'body_blue' });
      own('body_red');
      N.p.hp = Math.min(40, N.p.maxHp);
      const beforeHp = N.p.hp;
      check('safe implant replacement commits once without transient HP loss', N.installCyber('body_red', 'body') === true && N.p.hp === beforeHp);

      reset();
      setGear({ body: 'body_red', spine: 'spine_purple' });
      const compatibility = chip('compat', 4);
      G.cyberChips.body = [compatibility, chip('atk', 1), chip('atk', 1), chip('atk', 1)];
      N.recalc();
      const beforeRemove = signature();
      check('unsafe compatibility removal is atomic', E.removeChip('body', compatibility) === false && signature() === beforeRemove);
      const newAttack = chip('atk', 2, 'blue'); G.chips.push(newAttack);
      const beforeChipReplace = signature();
      check('unsafe chip replacement retains both original and candidate', E.installChip('body', newAttack, 0) === false && signature() === beforeChipReplace);
      const strongerCompatibility = chip('compat', 4, 'blue'); G.chips.push(strongerCompatibility);
      const originalAttack = G.cyberChips.body[1], chipTotal = G.chips.length + Object.values(G.cyberChips).flat().length;
      check('safe full-socket replacement preserves displaced chip', E.installChip('body', strongerCompatibility, 1) && G.chips.includes(originalAttack) && !G.chips.includes(strongerCompatibility) && G.cyberChips.body[1] === strongerCompatibility);
      check('chip replacement conserves every object', G.chips.length + Object.values(G.cyberChips).flat().length === chipTotal && N.cyberLoad() <= N.adaptationCap());

      reset();
      setGear({ body: 'body_red', spine: 'spine_purple' });
      G.cyberChips.body = [chip('atk', 1), chip('atk', 1), chip('atk', 1), chip('atk', 1)];
      const legacyCandidate = chip('compat', 2, 'blue'); G.chips.push(legacyCandidate);
      N.recalc();
      const beforeLegacy = signature();
      check('new installs into an overloaded save require a fully safe final result', E.installChip('spine', legacyCandidate) === false && signature() === beforeLegacy);
      const excess = N.cyberOverload();
      check('legacy overload can be recovered through safe removal', E.removeChip('body', 0) && N.cyberOverload() < excess);

      reset(); G.adaptBonus = 80;
      T.corp.trialBegin('dome', 'purple');
      const trialChip = G.cyberChips.body[0], trialState = signature(), bagChip = chip('atk', 1);
      check('trial chips cannot be removed through the shared API', E.removeChip('body', trialChip) === false && signature() === trialState);
      G.chips.push(bagChip);
      const trialWithCandidate = signature();
      check('trial sockets reject replacement and preserve all objects', E.installChip('body', bagChip, 0) === false && signature() === trialWithCandidate);
      const previewBefore = signature();
      E.preview({ kind: 'chip', slot: 'body', chip: bagChip, replaceIndex: 0 });
      check('equipment previews have no state or HP side effects', signature() === previewBefore);

      reset();
      const heal = T.econ.items.find(item => item.kind === 'heal');
      const healthBefore = N.p.hp;
      G.items = [{ x: N.p.x, y: N.p.y, it: heal }];
      T.v18.pickup(N.p.x, N.p.y, true);
      check('full-health ground healing is consumed without changing health', G.items.length === 0 && N.p.hp === healthBefore);
      reset('engineer');
      const scrapBefore = G.scrap;
      G.items = [{ x: N.p.x, y: N.p.y, it: heal }];
      T.v18.pickup(N.p.x, N.p.y, true);
      check('engineer keeps full-health healing salvage', G.items.length === 0 && G.scrap === scrapBefore + 3);

      reset();
      const consumables = window.NEON.consumables;
      const groundChip = chip('atk', 2, 'blue');
      G.items = [
        { x: 10, y: 10, it: heal },
        { x: 10, y: 10, chip: groundChip },
        { x: 10, y: 10, cons: consumables[0] },
        { x: 10, y: 10, cons: consumables[1] }
      ];
      T.v18.pickup(10, 10, true);
      check('one pickup visits every ordinary item on the same tile', G.items.length === 0 && G.chips.includes(groundChip) && G.inv.length === 2);

      reset();
      G.inv = consumables.slice(0, 4).map(item => item.id);
      G.items = [{ x: 10, y: 10, cons: consumables[4] }];
      T.v18.pickup(10, 10, true);
      check('full inventory always exposes leave-ground and cash-out actions', !!document.querySelector('#swDrop') && !!document.querySelector('#swCash'));
      const groundId = G.activeSwap && G.activeSwap.groundId;
      T.save.saveRun(true);
      T.save.loadRun();
      check('pending ground consumable choice survives save and resume', G.modal === 'swap' && G.activeSwap.groundId === groundId && G.items.length === 1);
      const cashAction = document.querySelector('#swCash').onclick;
      const cashBefore = G.credits;
      cashAction();
      const cashAfter = G.credits;
      cashAction();
      check('cash-out consumes its ground item once and cannot be replayed', G.items.length === 0 && cashAfter > cashBefore && G.credits === cashAfter && !G.activeSwap);

      reset();
      G.inv = consumables.slice(0, 4).map(item => item.id);
      N.addConsumable(consumables[4]);
      T.v18.maybeShowSwap();
      const rewardCashBefore = G.credits;
      document.querySelector('#swDrop').onclick();
      check('unclaimed reward consumable can be left on the ground', G.items.length === 1 && G.items[0].cons.id === consumables[4].id && G.credits === rewardCashBefore);

      reset();
      G.inv = consumables.slice(0, 4).map(item => item.id);
      G.items = [
        { x: 10, y: 10, chest: { tier: 'common', data: {} } },
        { x: 10, y: 10, cons: consumables[4] },
        { x: 10, y: 10, chest: { tier: 'rare', data: {} } },
        { x: 10, y: 10, cons: consumables[5] }
      ];
      G.sites = [{ type: 'gamble', x: 10, y: 10, used: false, data: { spins: 0 } }];
      N.doMove(0, 0);
      check('mixed pile queues all chests and consumable choices without facility overwrite', G.modal === 'swap' && G.lootQueue.length === 2 && G.swapQueue.length === 1 && G.items.length === 2);
      while (G.modal === 'swap') document.querySelector('#swCash').onclick();
      check('queued chests continue after consumable decisions', G.modal === 'loot' && !!G.activeLoot && G.lootQueue.length === 1);
      T.save.saveRun(true);
      T.save.loadRun();
      check('active chest and queued chest both survive save and resume', G.modal === 'loot' && !!G.activeLoot && G.lootQueue.length === 1);
      let claimed = 0;
      for (let step = 0; step < 8 && (G.activeLoot || G.activeSwap || G.lootQueue.length || G.swapQueue.length); step++) {
        if (G.modal === 'swap') { document.querySelector('#swCash').onclick(); continue; }
        if (G.modal !== 'loot') break;
        await new Promise(resolve => setTimeout(resolve, 600));
        const choice = document.querySelector('[data-loot],#lootClaim');
        choice.click();
        choice.click();
        claimed++;
      }
      check('each queued chest resolves exactly once through the real reward buttons', claimed === 2 && !G.activeLoot && !G.activeSwap && G.lootQueue.length === 0 && G.swapQueue.length === 0, { claimed, modal: G.modal, pendingLoot: G.lootQueue.length, pendingSwap: G.swapQueue.length });

      reset();
      const relic = N.mods.find(mod => mod.id === 'relic_frenzy_tab');
      own(relic.id);
      G.inst[relic.id].dur = 2; G.inst[relic.id].maxDur = 99;
      N.installCyber(relic.id, 'body');
      N.openCyber();
      check('relic implants expose their real durability in equipment overview', !!document.querySelector('[data-slot="body"] .durbar'));
      T.hideOverlay();
      const originalRandom = Math.random;
      try {
        Math.random = () => 0;
        N.r38.wearInstalled();
        N.r38.wearInstalled();
      } finally { Math.random = originalRandom; }
      check('relic durability wears and broken relic stats are disabled', G.inst[relic.id].dur === 0 && N.p.maxHp === 38 && !(G.mod.lifesteal > 0), { dur: G.inst[relic.id].dur, hp: N.p.maxHp, lifesteal: G.mod.lifesteal });
      G.inst[relic.id] = { name: relic.name, affixes: [], plus: 0 };
      T.save.saveRun(true);
      T.save.loadRun();
      check('legacy relic instances migrate missing durability consistently', G.inst[relic.id].dur === 99 && G.inst[relic.id].maxDur === 99);
      G.state = 'menu';
      N.meta.stash.cyber = [{ id: relic.id, chips: [], inst: { name: relic.name, affixes: [] } }];
      T.ui.marketScreen('stash');
      check('legacy stash relic cards show migrated durability', N.meta.stash.cyber[0].inst.maxDur === 99 && !!document.querySelector('.scy .durbar'));

      const hiddenQuest = T.econ.quests.find(quest => quest.id === 'c_ghost_hidden');
      const rangedQuest = T.econ.quests.find(quest => quest.id === 'c_assault_range');
      reset('assault');
      const assaultOnly = N.polish.contractFeasible(rangedQuest) && !N.polish.contractFeasible(hiddenQuest);
      reset('ghost');
      const ghostOnly = N.polish.contractFeasible(hiddenQuest) && !N.polish.contractFeasible(rangedQuest);
      reset('engineer');
      check('new contract offers are limited to the matching class', assaultOnly && ghostOnly && !N.polish.contractFeasible(hiddenQuest) && !N.polish.contractFeasible(rangedQuest));
      check('existing generic quests remain available', N.polish.contractFeasible(T.econ.quests.find(quest => quest.id === 'c_sweep')) && T.econ.quests.some(quest => quest.id === 'c_ghost' && quest.type === 'noDamage'));
      function targetAt(x, y, health = 10) {
        const spec = T.corp.monsters.find(monster => monster.ai === 'chase' && monster.minDepth === 1 && !monster.corpUnit);
        const enemy = T.spawnEnemy(spec, x, y, 1);
        enemy.hp = enemy.maxHp = health; enemy.def = 0; enemy.alerted = false;
        G.enemies.push(enemy);
        return enemy;
      }
      reset('assault');
      const rangedContract = T.econ.makeContract(rangedQuest); rangedContract.target = 20; G.quests = [rangedContract];
      function eliminate(source, distance, origin) {
        const target = targetAt(N.p.x + distance, N.p.y);
        T.playerHit(target, 10000, { source, origin, crit: false, lifesteal: false });
        N.killEnemy(target);
      }
      eliminate('gun', 1, N.p);
      check('point-blank gun kills count as ranged attacks', rangedContract.progress === 1);
      eliminate('melee', 5, N.p);
      eliminate('merc', 4, { x: 11, y: 10 });
      eliminate('drone', 4, { x: 11, y: 10 });
      eliminate('hacked-ally', 4, { x: 11, y: 10 });
      check('long melee and allied kills do not count as player ranged kills', rangedContract.progress === 1);
      const beamMod = N.mods.find(mod => mod.active && mod.active.type === 'beam' && !mod.relic);
      eliminate('cyber-' + beamMod.id, 3, N.p);
      check('player beam source counts for the ranged contract', rangedContract.progress === 2);
      const delayedTarget = targetAt(12, 10, 20);
      T.playerHit(delayedTarget, 1, { source: 'gun', crit: false, lifesteal: false });
      T.damageEnemy(delayedTarget, 1000);
      N.killEnemy(delayedTarget);
      check('unattributed delayed damage cannot inherit an earlier ranged kill credit', rangedContract.progress === 2);

      reset('ghost');
      let hiddenContract = T.econ.makeContract(hiddenQuest); G.quests = [hiddenContract];
      let observer = targetAt(11, 10);
      T.enemyAct(observer, T.buildDistMap());
      check('ordinary enemy sight breaks the no-detection contract', hiddenContract.failed);
      reset('ghost');
      hiddenContract = T.econ.makeContract(hiddenQuest); G.quests = [hiddenContract];
      targetAt(11, 10);
      N.polish.beginStealth(5, true); G.turn += 2;
      const detectionRandom = Math.random;
      try { Math.random = () => 0; N.polish.checkStealthDetection(); } finally { Math.random = detectionRandom; }
      check('probabilistic stealth detection breaks the no-detection contract', hiddenContract.failed);
      reset('ghost');
      hiddenContract = T.econ.makeContract(hiddenQuest); G.quests = [hiddenContract];
      G.instab = 45;
      observer = targetAt(11, 10, 1);
      T.playerAttack(observer);
      T.enemiesAct();
      check('self-reveal after killing the only observer is not recorded as discovery', !hiddenContract.failed && G.ghostRevealed && !G.enemies.length);
      G.hitStopUntil = 0; G.stairs = { x: N.p.x, y: N.p.y }; G.bossAlive = false;
      T.econ.checkStairs();
      const stairsConfirmation = document.getElementById('stairsEnter');
      if (stairsConfirmation) stairsConfirmation.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      check('no-detection contract completes on its normal floor exit', hiddenContract.done, { depth: G.depth, failed: hiddenContract.failed, progress: hiddenContract.progress });

      for (const [id, expected, kind] of [
        ['aegis_field', 25, 'shield'], ['trauma_injector', 35, 'shield'],
        ['stim_shot', 18, 'atk'], ['nano_swarm', 75, 'drone']
      ]) {
        reset();
        const spec = consumables.find(item => item.id === id);
        G.inv = [id];
        const description = T.econ.consEffectText(spec).join(' ');
        N.useConsumable(0);
        const effect = kind === 'drone' ? G.allies[0] : N.p.buffs.find(buff => (buff.def || window.NEON.buffs.find(def => def.id === buff.id) || {}).kind === kind);
        check(`${id} advertises the usable turns left after its consuming action`, !!effect && effect.turns === expected && description.includes(expected + ' 回合'), { actual: effect && effect.turns, description });
        N.doMove(0, 0);
        check(`${id} advances its real timer on the next action`, effect.turns === expected - 1, effect.turns);
      }
      reset();
      const shieldPickup = T.econ.items.find(item => item.id === 'shield_emitter');
      G.items = [{ x: 11, y: 10, it: shieldPickup }];
      N.doMove(1, 0);
      check('ground shield metadata description and action timer agree', shieldPickup.effect.duration === 25 && T.econ.itemEffectText(shieldPickup).join(' ').includes('25 回合') && N.p.buffs.find(buff => buff.id === 'shield').turns === 25);
      check('approved duration tiers are shared by all relevant item descriptions', ['common', 'rare', 'epic'].every((tier, index) => N.r38.pickupDuration('atk', { tier }) === [12, 18, 25][index] && N.r38.pickupDuration('shield', { tier }) === [25, 35, 50][index] && N.r38.pickupDuration('drone', { tier }) === [50, 75, 100][index]));

      reset();
      G.inv = consumables.slice(0, 4).map(item => item.id);
      const largeChips = Array.from({ length: 2000 }, () => chip('atk', 1));
      G.items = largeChips.map(item => ({ x: 10, y: 10, chip: item }));
      for (let index = 0; index < 128; index++) G.items.push({ x: 10, y: 10, cons: consumables[4] });
      T.v18.pickup(10, 10, true);
      const creditedBefore = G.credits;
      let swapCount = 0;
      while (G.modal === 'swap' && swapCount < 140) { document.querySelector('#swCash').onclick(); swapCount++; }
      check('large same-cell inventory and 128 decisions finish without losses or duplicates', G.chips.length === 2000 && new Set(G.chips).size === 2000 && swapCount === 128 && G.items.length === 0 && !G.activeSwap && G.swapQueue.length === 0 && G.credits === creditedBefore + 128 * 12, { chips: G.chips.length, swapCount, items: G.items.length, credited: G.credits - creditedBefore });
      T.save.saveRun(true); T.save.loadRun();
      check('large inventory still restores through the normal save path', G.chips.length === 2000 && G.items.length === 0);

      reset();
      const line = targetAt(20, 10, 1), survivor = targetAt(24, 10, 50);
      Object.assign(line, { corpObj: 'line', structure: 'line', lineCorp: 'mobius', hp: 0 });
      Object.assign(survivor, { structure: 'mirror' });
      G.b16 = { phase: 'lines', down: { kharon: 1, dome: 1 }, camp: 0, origCls: 'assault' };
      N.killEnemy(line);
      check('death callback array replacement cannot remove a surviving structure', G.enemies.includes(survivor) && !G.enemies.includes(line));
      G.runId++;
      G.b16 = null;
      T.hideOverlay();
      await new Promise(resolve => setTimeout(resolve, 550));
      check('delayed B16 transition cannot enter a later run', !document.querySelector('.scene') && G.b16 === null);

      G.mode = 'train'; G.paused = true;
      return results;
    });
    await page.waitForTimeout(150);
    checks.push({ name: 'no uncaught browser errors', passed: errors.length === 0, detail: errors });
    const output = process.env.NEON_TEST_OUTPUT ? path.resolve(process.env.NEON_TEST_OUTPUT) : path.resolve(root, '..', 'work', 'r38', 'core-regression.json');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(checks, null, 2));
    checks.forEach(check => console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.name}${check.passed ? '' : ' ' + JSON.stringify(check.detail)}`));
    assert(checks.every(check => check.passed), 'Round 3.8 core regression failed');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
