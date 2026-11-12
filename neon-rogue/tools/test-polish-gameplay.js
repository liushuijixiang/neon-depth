const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('neon-depth-mute', '1');
      localStorage.removeItem('neon-depth-run');
      localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
    });
    await page.goto(pathToFileURL(path.join(root, 'dist.debug.html')).href);
    const checks = await page.evaluate(() => {
      const N = window.__neon, G = N.G, T = N.test, P = N.polish, S = N.spawning, results = [];
      const originalRandom = Math.random;
      const check = (name, passed, detail) => results.push({ name, passed: !!passed, detail });
      function reset(cls = 'assault') {
        Math.random = originalRandom;
        G.classId = cls;
        G.trainPending = true;
        G.rushPending = null;
        N.startGame();
        T.hideOverlay();
        G.mode = 'normal';
        G.state = 'play';
        G.paused = false;
        G.busy = false;
        G.modal = null;
        G.pendingBoard = null;
        G.pendingBoons = 0;
        G.pendingEvo = 0;
        G.storyQueue = [];
        G.quests = [];
        G.sites = [];
        G.items = [];
        G.enemies = [];
        G.allies = [];
        G.hazards = [];
        G.walls = [];
        G.corpOp = null;
        G.trialKit = null;
        G.trial = null;
        G.corpZone = {};
        G.corpSchedule = {};
        G.forceCorp = false;
        G.forceNpc = false;
        G.cams = [];
        G.cfence = [];
        G.cmines = [];
        G.cyber = {};
        G.cyberChips = {};
        G.chips = [];
        G.mods = {};
        G.modBag = [];
        G.inst = {};
        G.runMod = {};
        G.trainBonus = { hp: 0, atk: 0, def: 0 };
        G.adaptBonus = 0;
        G.chal = null;
        G.depth = 1;
        G.turn = 0;
        G.floorDamage = 0;
        G.stealth = 0;
        G.ghostStealth = 0;
        G.ghostRevealed = false;
        G.stealthGraceTurn = -1;
        G.stealthCheckTurn = -1;
        G.instab = 25;
        G.freeze = 0;
        G.overT = 0;
        G.burnout = false;
        G.control = null;
        N.meta.up = {};
        N.p.pending = 0;
        N.p.x = 10;
        N.p.y = 10;
        N.p.level = 1;
        N.p.itemMax = 0;
        N.p.itemAtk = 0;
        N.p.itemDef = 0;
        N.p.buffs = [];
        G.map = Array.from({ length: 30 }, (_, y) => Array.from({ length: 44 }, (_, x) => x === 0 || y === 0 || x === 43 || y === 29 ? 1 : 0));
        G.seen = G.map.map(row => row.map(() => 1));
        G.vis = G.map.map(row => row.map(() => 1));
        G.rooms = [{ x: 1, y: 1, w: 42, h: 28, cx: 22, cy: 15 }];
        G.stairs = { x: 40, y: 26 };
        N.recalc();
        N.p.hp = N.p.maxHp;
        return N.p;
      }
      function own(id) {
        if (!G.modBag.includes(id)) G.modBag.push(id);
        T.v18.instOf(id);
      }
      function equip(id, slot) {
        own(id);
        N.installCyber(id, slot);
        T.hideOverlay();
      }
      function enemy(x, y, ai = 'chase') {
        const spec = T.corp.monsters.find(m => m.ai === ai && !m.boss && !m.corpUnit);
        const e = T.spawnEnemy(spec, x, y, G.depth);
        e.hp = e.maxHp = 1000;
        e.alerted = true;
        e.cd = 100;
        G.enemies.push(e);
        return e;
      }

      let p = reset();
      G.adaptBonus = 30;
      equip('body_red', 'body');
      p.hp = p.maxHp - 3;
      let hp = p.hp;
      const chipsBefore = G.chips.length + Object.values(G.cyberChips).flat().length;
      const fit = T.v36.autoLoadout();
      check('auto-fit preserves health through temporary unequip', fit === true && p.hp === hp, { before: hp, after: p.hp });
      check('auto-fit preserves total chips', chipsBefore === G.chips.length + Object.values(G.cyberChips).flat().length);

      p = reset();
      G.adaptBonus = 40;
      equip('body_blue', 'body');
      own('body_red');
      p.hp = p.maxHp;
      hp = p.hp;
      N.installCyber('body_red', 'body');
      check('manual slot replacement clamps only at final capacity', p.hp === Math.min(hp, p.maxHp), { before: hp, after: p.hp });

      p = reset();
      equip('body_red', 'body');
      N.mods.filter(m => !m.relic && !m.dropOnly && !m.cls && !m.corp).slice(0, 36).forEach(m => own(m.id));
      G.chips = Array.from({ length: 130 }, (_, index) => N.makeChip(index % 2 ? 'atk' : 'hp', 'blue'));
      p.hp = p.maxHp - 2;
      const before = P.loadoutSnap();
      const allChips = () => G.chips.concat(Object.values(G.cyberChips).flat());
      const chipSignature = chips => chips.map(chip => JSON.stringify(chip)).sort();
      const originalChipSignature = chipSignature(allChips());
      const unlimitedFit = T.v36.autoLoadout();
      check('unlimited backpacks auto-fit without overflow confirmation or ground spills', unlimitedFit === true && !document.querySelector('#afYes') && G.items.length === before.ground.length && T.v18.bagCap() === Infinity && T.corp.chipCap() === Infinity);
      check('unlimited auto-fit conserves every implant and chip', G.modBag.length === before.saved.modBag.length && JSON.stringify(chipSignature(allChips())) === JSON.stringify(originalChipSignature));
      check('unlimited auto-fit never heals', p.hp <= before.hp && p.hp <= p.maxHp);
      T.save.saveRun(true);
      T.save.loadRun();
      check('unlimited inventory survives save and resume', G.modBag.length === before.saved.modBag.length && JSON.stringify(chipSignature(allChips())) === JSON.stringify(originalChipSignature));

      const trialRows = [];
      for (const cls of ['assault', 'engineer', 'ghost']) {
        for (const corp of ['dome', 'kharon', 'mobius']) {
          for (const quality of ['purple', 'orange', 'red']) {
            for (const bonus of [0, 20, 80]) {
              p = reset(cls);
              G.adaptBonus = bonus;
              equip('body_red', 'body');
              p.hp = p.maxHp - 4;
              hp = p.hp;
              T.corp.trialBegin(corp, quality);
              const max = p.maxHp, kit = G.trialKit;
              const count = kit.ids.length;
              const slots = Object.keys(G.cyber).filter(sl => kit.ids.includes(G.cyber[sl]));
              const full = slots.every(sl => G.cyberChips[sl].length === (quality === 'purple' ? 3 : 4));
              const safe = N.cyberLoad() <= N.adaptationCap();
              const compatible = slots.flatMap(sl => G.cyberChips[sl]).filter(c => c.stat === 'compat').length;
              const compatibilityBySlot = slots.map(sl => G.cyberChips[sl].filter(c => c.stat === 'compat').length);
              const gearUpgradeable = slots.some(sl => G.inst[G.cyber[sl]].plus < 5 && Object.values(N.mods.find(m => m.id === G.cyber[sl]).stats || {}).some(value => value > 0));
              const chipUpgradeable = slots.flatMap(sl => G.cyberChips[sl]).some(chip => {
                if (chip.stat === 'compat' || chip.stat === 'skill' || (chip.trialUpgrade || 0) >= 5) return false;
                const level = (chip.trialUpgrade || 0) + 1, base = chip.trialBaseValue == null ? chip.val : chip.trialBaseValue;
                const integer = ['atk', 'def', 'hp', 'compat', 'skill'].includes(chip.stat);
                const nextBonus = integer ? Math.max(level, Math.round(base * .15 * level)) : Math.round(base * .15 * level * 100) / 100;
                return base + nextBonus > chip.val;
              });
              const row = { cls, corp, quality, bonus, count, full, safe, hp: p.hp === Math.min(hp, max), load: N.cyberLoad(), cap: N.adaptationCap(), compatible, compatibilityBySlot, power: kit.powerMul,
                upgradeable: gearUpgradeable || chipUpgradeable, types: new Set(slots.flatMap(sl => G.cyberChips[sl]).map(chip => chip.stat)).size };
              trialRows.push(row);
              hp = Math.min(p.hp, 40);
              p.hp = hp;
              T.corp.trialEnd(null);
              row.restoreHp = p.hp === Math.min(hp, p.maxHp);
            }
          }
        }
      }
      check('81 company loadouts fill their slots, avoid overload and preserve HP', trialRows.every(r => r.count === 8 && r.full && r.safe && r.hp && r.restoreHp), trialRows.filter(r => r.count !== 8 || !r.full || !r.safe || !r.hp || !r.restoreHp));
      check('company kits spend the adaptation budget while further upgrades are possible', trialRows.every(r => !r.upgradeable || r.cap - r.load < 1), trialRows.filter(r => r.upgradeable && r.cap - r.load >= 1));
      check('company compatibility chips are distributed evenly across the body', trialRows.every(r => Math.max(...r.compatibilityBySlot) - Math.min(...r.compatibilityBySlot) <= 1), trialRows.filter(r => Math.max(...r.compatibilityBySlot) - Math.min(...r.compatibilityBySlot) > 1));
      check('high-adaptation company kits retain multiple combat chip types at full power', trialRows.filter(r => r.bonus === 80).every(r => r.types >= 4 && r.power === 1), trialRows.filter(r => r.bonus === 80 && (r.types < 4 || r.power !== 1)));

      p = reset();
      G.adaptBonus = 40;
      const borrowedDefinition = T.corp.CORP_MODS.find(definition => definition.corp === 'dome' && definition.q === 'purple' && definition.slot === 'eye');
      own(borrowedDefinition.id);
      const borrowedInstance = { name: N.mods.find(mod => mod.id === borrowedDefinition.id).name, affixes: [], plus: 2, dur: 7, maxDur: 18, heavy: 1 };
      G.inst[borrowedDefinition.id] = borrowedInstance;
      G.cyberGrowth[borrowedDefinition.id] = { lv: 3, xp: 2 };
      G.cyberCd[borrowedDefinition.id] = 4;
      N.installCyber(borrowedDefinition.id, 'eyeL');
      const borrowedChip = N.makeChip('crit', 'purple');
      G.cyberChips.eyeL = [borrowedChip];
      const ownedInstanceBefore = JSON.stringify(borrowedInstance), ownedChipBefore = JSON.stringify(borrowedChip);
      T.corp.trialBegin('dome', 'purple');
      check('owning the same company implant still receives all eight trial slots', G.trialKit.ids.length === 8 && Object.keys(G.cyber).length === 8);
      const protectedIds = G.trialKit.ids.slice();
      T.v18.openDoctor({ type: 'doctor', x: p.x, y: p.y, data: {}, used: false });
      check('doctor offers no paid enhancement for locked trial gear', [...document.querySelectorAll('[data-enh]')].every(button => !protectedIds.includes(button.dataset.enh)));
      const protectedMod = N.mods.find(mod => mod.id === protectedIds[0]);
      const enhancementProbe = { ...G.inst[protectedMod.id], plus: 0, dur: 18 };
      const probeBefore = JSON.stringify(enhancementProbe);
      const enhancementResult = T.v18.enhanceInst(enhancementProbe, protectedMod);
      check('direct enhancement refuses a locked trial implant', enhancementResult === null && JSON.stringify(enhancementProbe) === probeBefore);
      T.corp.trialEnd(null);
      check('borrowed original instance cooldown growth and chips are restored', JSON.stringify(G.inst[borrowedDefinition.id]) === ownedInstanceBefore && G.cyberCd[borrowedDefinition.id] === 4 && JSON.stringify(G.cyberGrowth[borrowedDefinition.id]) === JSON.stringify({ lv: 3, xp: 2 }) && G.cyber.eyeL === borrowedDefinition.id && JSON.stringify(G.cyberChips.eyeL[0]) === ownedChipBefore);

      p = reset();
      T.corp.trialBegin('dome', 'purple');
      const protectedBody = G.cyber.body;
      own('body_red');
      N.installCyber('body_red');
      const implicitProtected = G.cyber.body === protectedBody;
      N.installCyber('body_red', 'body');
      check('explicit and implicit installs respect company locks', implicitProtected && G.cyber.body === protectedBody);

      p = reset();
      G.rooms = [{ x: 7, y: 7, w: 7, h: 7 }];
      const terminal = { type: 'trial', x: 10, y: 10, used: false, data: { kind: 'timed' } };
      G.sites = [terminal];
      T.econ.startTrial(terminal);
      check('trial spawns all five enemies inside its own room', G.trial && G.trial.left === 5 && G.enemies.every(e => e.x >= 7 && e.x < 14 && e.y >= 7 && e.y < 14));
      p = reset();
      G.rooms = [{ x: 9, y: 9, w: 3, h: 3 }];
      const cramped = { type: 'trial', x: 10, y: 10, used: false, data: { kind: 'timed' } };
      T.econ.startTrial(cramped);
      check('cramped trial never scatters enemies to distant rooms or consumes terminal', !G.trial && G.enemies.length === 0 && !cramped.used);
      p = reset();
      G.rooms = [{ x: 7, y: 7, w: 7, h: 7 }];
      const bounty = { type: 'trial', x: 10, y: 10, used: false, data: { kind: 'bounty' } };
      T.econ.startTrial(bounty);
      check('wanted trial target uses the same bounded arena', G.enemies.length === 1 && G.enemies[0].bounty && G.enemies[0].x >= 7 && G.enemies[0].x < 14);

      p = reset();
      G.depth = 7;
      G.corpOp = { corp: 'kharon', rival: 'dome', job: 'heist', depth: 7, active: false, done: false, q: 'orange' };
      T.corp.genCorpOp(7);
      G.enemies = [];
      G.cams = [];
      const dataTerminal = G.sites.find(s => s.type === 'terminal');
      p.x = dataTerminal.x;
      p.y = dataTerminal.y;
      const terminalRoom = G.rooms.find(r => r.w > 2 && r.h > 2 && p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);
      G.freeze = 1;
      T.corp.openTerminal(dataTerminal);
      document.querySelector('#tmGo').onclick();
      check('data-terminal reinforcements spawn in the terminal room', G.enemies.length > 0 && G.enemies.every(e => e.x >= terminalRoom.x && e.x < terminalRoom.x + terminalRoom.w && e.y >= terminalRoom.y && e.y < terminalRoom.y + terminalRoom.h && !(e.x === p.x && e.y === p.y)));

      p = reset();
      const npc = T.story.STORY.npcs.find(n => n.duel && n.hire);
      const site = { type: 'npc', x: 11, y: 10, data: { npc: npc.id } };
      G.sites.push(site);
      G.credits = 999;
      T.story.npcAction(site, npc, 'duel');
      const duelist = G.enemies.find(e => e.npcDuel === npc.id);
      const npcStage = T.story.npcState(npc.id).stage, credits = G.credits;
      T.story.openNpc(site);
      T.story.npcAction(site, npc, 'talk');
      T.story.npcAction(site, npc, 'hire');
      check('duelling NPC rejects conversation and hiring', !!duelist && !G.modal && T.story.npcState(npc.id).stage === npcStage && G.credits === credits && G.allies.length === 0);
      duelist.hp = 0;
      N.killEnemy(duelist);
      T.story.openNpc(site);
      check('NPC interaction returns after duel completion', G.modal === 'npc');

      p = reset('ghost');
      G.instab = 45;
      const scout = enemy(11, 10);
      const chances = [];
      for (let distance = 1; distance <= 5; distance++) { scout.x = p.x + distance; chances.push(P.stealthDetectionChance()); }
      check('stealth detection uses approved 45/30/15/5/0 rates', JSON.stringify(chances) === JSON.stringify([0.45, 0.3, 0.15, 0.05, 0]));
      scout.x = 12;
      G.map[10][11] = 1;
      check('walls block stealth detection', P.stealthDetectionChance() === 0);
      G.map[10][11] = 0;
      scout.x = 11;
      enemy(10, 11);
      let rolls = 0;
      Math.random = () => { rolls++; return .99; };
      G.turn = 1;
      P.checkStealthDetection();
      P.checkStealthDetection();
      check('multiple enemies and repeated checks still roll only once per action', rolls === 1);
      P.beginStealth(5, true);
      G.turn = 2;
      rolls = 0;
      Math.random = () => { rolls++; return 0; };
      P.checkStealthDetection();
      check('casting stealth has a grace action', rolls === 0 && P.playerHidden());
      G.turn = 3;
      P.checkStealthDetection();
      N.updateHUD();
      check('detection clears both stealth sources and updates visible status', !P.playerHidden() && G.stealth === 0 && G.ghostStealth === 0 && G.ghostRevealed && document.querySelector('#buffs').textContent.includes('显形') && !document.querySelector('#buffs').textContent.includes('隐身'));
      check('only approved detection prompt appears', document.querySelector('#toasts').textContent.includes('光学迷彩失效 · 已被发现'));

      p = reset('ghost');
      P.beginStealth(5, true);
      const silentEnemies = [enemy(11, 10), enemy(10, 11, 'turret')];
      const boss = N.spawnBoss(N.bosses()[0], 12, 10, 5);
      G.enemies.push(boss);
      hp = p.hp;
      silentEnemies.concat(boss).forEach(e => T.enemyAct(e, T.buildDistMap()));
      check('ordinary enemies and bosses do not acquire an undetected player', p.hp === hp && silentEnemies.concat(boss).every(e => !e.intent && !e.alerted));
      Math.random = () => .99;
      T.cyberField(boss, 'bomb', [{ x: p.x, y: p.y }], 0, 1, 8);
      G.turn++;
      T.tickHazards();
      check('already placed hazards still resolve during stealth', p.hp < hp);

      p = reset();
      const victim = enemy(16, 10);
      const merc = { x: 10, y: 10, fight: 'chase', skill: 'strike', cd: 0, color: '#57ffa8' };
      const victimHp = victim.hp;
      P.mercAct(merc);
      check('mercenary strike pursues instead of striking eight tiles away', victim.hp === victimHp && merc.cd === 1);
      merc.x = 15; merc.y = 10; merc.cd = 0;
      P.mercAct(merc);
      check('mercenary strike works at adjacent range', victim.hp < victimHp);
      victim.hp = victimHp;
      merc.x = 10; merc.skill = 'snipe'; merc.fight = 'turret'; merc.cd = 0;
      G.map[10][13] = 1;
      P.mercAct(merc);
      check('mercenary sniper cannot fire through walls', victim.hp === victimHp);

      p = reset();
      let centered = true;
      for (const [width, height] of [[360, 480], [768, 850], [1440, 900]]) {
        for (const [x, y] of [[1, 1], [42, 28], [22, 15]]) {
          p.x = x; p.y = y;
          const view = P.cameraFrame(width, height);
          centered &&= Math.abs(view.ox + (x - view.x + .5) * view.tile - width / 2) < 1e-9;
          centered &&= Math.abs(view.oy + (y - view.y + .5) * view.tile - height / 2) < 1e-9;
          T.draw(performance.now());
        }
      }
      G.control = { x: 2, y: 22, turns: 3 };
      const controlled = P.cameraFrame(390, 600);
      centered &&= controlled.ox + (2 - controlled.x + .5) * controlled.tile === 195;
      check('camera remains centered at map edges and follows remote control', centered);

      p = reset();
      G.depth = 4;
      const elites = T.econ.makeContract(T.econ.quests.find(q => q.id === 'c_elites'));
      G.quests = [elites];
      T.v18.contractEnsure();
      check('two-floor elite contract fills targets before an intervening boss floor', G.enemies.filter(e => e.elite).length >= elites.target);
      p = reset();
      const typed = T.econ.quests.find(q => q.type === 'killType');
      check('empty target pool does not offer or accept an impossible typed contract', !P.contractFeasible(typed) && T.econ.acceptContract(T.econ.makeContract(typed)) === false);
      const neutral = enemy(14, 10); neutral.neutral = true;
      const clear = T.econ.makeContract(T.econ.quests.find(q => q.type === 'clear'));
      G.quests = [clear];
      P.contractEvent('kill', { hp: 0, elite: false });
      check('neutral workers cannot block a hostile-clear objective', clear.done);

      const lineageRows = [];
      for (const [depth, cap] of [[1, 10], [6, 15], [11, 20]]) {
        p = reset();
        G.depth = depth;
        const root = enemy(20, 15, 'summoner');
        root.spawnCells = Array.from({ length: 90 }, (_, index) => ({ x: 2 + index % 15, y: 14 + Math.floor(index / 15) }));
        for (let attempt = 0; attempt < 4; attempt++) T.summonMinions(root, cap, ['summoner', 'chase', 'healer']);
        const fullCount = S.count(root);
        const noSummoners = G.enemies.filter(unit => unit.summoned).every(unit => unit.ai !== 'summoner');
        const child = G.enemies.find(unit => unit.summoned && unit.ownerId === root.uid);
        child.hp = 0;
        N.killEnemy(child);
        const afterDeath = S.count(root);
        const replenished = T.summonMinions(root, cap, ['summoner', 'chase']);
        const sibling = T.cyberStructure(root, 'egg', { x: 25, y: 16 });
        sibling.spawnCells = root.spawnCells;
        const blockedSibling = T.summonMinions(sibling, 5, ['chase']);
        const secondRoot = enemy(23, 15, 'summoner');
        secondRoot.spawnCells = root.spawnCells;
        for (let attempt = 0; attempt < 3; attempt++) T.summonMinions(secondRoot, cap, ['summoner', 'chase']);
        lineageRows.push({ depth, limit: S.limit(), cap, fullCount, noSummoners, afterDeath, replenished, blockedSibling, finalCount: S.count(root), otherCount: S.count(secondRoot) });
      }
      check('each hostile summon lineage respects the 10/15/20 living-unit cap', lineageRows.every(row => row.limit === row.cap && row.fullCount === row.cap && row.finalCount === row.cap), lineageRows);
      check('summon pools never produce another summoner', lineageRows.every(row => row.noSummoners), lineageRows);
      check('summon deaths free exactly one lineage slot and child producers share the cap', lineageRows.every(row => row.afterDeath === row.cap - 1 && row.replenished === 1 && row.blockedSibling === 0), lineageRows);
      check('independent summon roots retain independent allowances', lineageRows.every(row => row.otherCount === row.cap), lineageRows);

      p = reset();
      G.trainPending = false;
      N.startGame();
      T.hideOverlay();
      const allowedFloors = [1, 2, 3, 6, 7, 8, 11, 12, 13];
      check('a normal new run preselects a guaranteed company encounter', !!G.corpEncounter && allowedFloors.includes(G.corpEncounter.floor), G.corpEncounter);
      p = reset();
      const selectedFloors = [];
      for (let index = 0; index < allowedFloors.length; index++) {
        Math.random = () => (index + .1) / allowedFloors.length;
        selectedFloors.push(S.planCompany(1).floor);
      }
      check('company planning supports all nine approved floors', JSON.stringify(selectedFloors) === JSON.stringify(allowedFloors), selectedFloors);
      Math.random = () => .55;
      S.planCompany(1);
      Math.random = originalRandom;
      const plannedEncounter = JSON.stringify(G.corpEncounter);
      T.save.saveRun(true);
      G.corpEncounter = null;
      T.save.loadRun();
      check('unvisited company plan survives save and resume without rerolling', JSON.stringify(G.corpEncounter) === plannedEncounter);
      const appearances = [], plannedFloor = G.corpEncounter.floor;
      G.corpZone = {};
      for (let depth = 1; depth <= 15; depth++) {
        G.depth = depth;
        G.sites = [];
        S.placeCompany(depth, G.sites);
        S.placeCompany(depth, G.sites);
        if (G.sites.length) appearances.push([depth, G.sites.length]);
      }
      check('company commission appears exactly once per run on its planned floor', JSON.stringify(appearances) === JSON.stringify([[plannedFloor, 1]]) && G.corpEncounter.appeared, appearances);
      const appearedEncounter = JSON.stringify(G.corpEncounter);
      T.save.saveRun(true);
      G.corpEncounter = null;
      T.save.loadRun();
      G.sites = [];
      S.placeCompany(plannedFloor, G.sites);
      check('saved completed company encounter cannot appear twice', JSON.stringify(G.corpEncounter) === appearedEncounter && G.sites.length === 0);
      Math.random = originalRandom;
      G.mode = 'train';
      G.paused = true;
      return results;
    });
    checks.push({ name: 'no uncaught browser errors', passed: errors.length === 0, detail: errors });
    const output = path.resolve(root, '..', 'work', 'gameplay-regression.json');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(checks, null, 2));
    for (const result of checks) console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${!result.passed ? ' ' + JSON.stringify(result.detail) : ''}`);
    assert(checks.every(result => result.passed), 'Gameplay regressions failed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
