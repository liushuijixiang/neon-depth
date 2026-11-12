/* Normal engine entry-point experiment. Outcomes are reported, including losses and turn limits. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const options = process.argv.slice(2);
function option(name, fallback) {
  const index = options.indexOf(name);
  return index < 0 ? fallback : options[index + 1];
}
const bossIds = option('--bosses', 'bl_hound,bl_hive,bl_warden,bl_lance,bl_mine,bl_mirror,bh_eye,bh_hive,bh_phase').split(',');
const seeds = option('--seeds', '3801').split(',').map(Number);
const maxTurns = Number(option('--turns', '320'));
const profiles = option('--profiles', 'naked,blue').split(',');
const url = option('--url', pathToFileURL(path.join(__dirname, '..', 'dist.debug.html')).href);
const declaration = {
  levelsByDepth: { 5: 7, 10: 12, 15: 17 },
  class: option('--class', 'assault'), specialization: option('--specialization', option('--class', 'assault') === 'engineer' ? 'mechanist' : 'gunner'), purchasedProgression: {},
  gearCandidates: Array.from({ length: 8 }, (_, i) => `kit_assault_blue_${i}`),
  chipCandidates: { quality: 'blue', compat: 16, atk: 8, def: 8, hp: 8 },
  allocation: 'Existing autoLoadout chooses a legal loadout from the fixed blue candidate pool. No post-result rerolls.',
  preparationHeal: 'One real trauma_injector is used through useConsumable before the arena.',
  combatConsumables: ['mag_pack', 'mag_pack', 'nanite_patch', 'aegis_field'],
  actions: 'doMove, gunFire, useCyberActive, useConsumable, reloadWithItem and optional exposed reloadGun',
  policies: option('--policies', 'naive-circle,pattern-aware').split(','),
  profiles,
  setupSeed: option('--setup-seed', null),
  balancedBlue: {
    5: [
      { id: 'eye_blue', chips: ['atk'] }, { id: 'emp_knuckles', chips: ['atk'] },
      { id: 'thorns_plate', chips: ['def', 'hp'] }, { id: 'blink_charge', chips: ['def'] }
    ],
    10: [
      { id: 'eye_blue', chips: ['atk'] }, { id: 'emp_knuckles', chips: ['atk', 'def'] },
      { id: 'hand_blue', chips: ['atk'] }, { id: 'thorns_plate', chips: ['def', 'hp'] },
      { id: 'mass_19', chips: ['def'] }, { id: 'blink_charge', chips: [] }
    ],
    15: [
      { id: 'eye_blue', chips: ['atk'] }, { id: 'emp_knuckles', chips: ['atk', 'def'] },
      { id: 'hand_blue', chips: ['atk'] }, { id: 'thorns_plate', chips: ['def', 'hp'] },
      { id: 'mass_19', chips: ['def'] }, { id: 'blink_charge', chips: [] },
      { id: 'optic', chips: ['def'] }, { id: 'legL_blue', chips: ['hp'] }
    ]
  },
  balancedTiered: {
    5: { chipQuality: 'blue', items: [
      { id: 'eye_blue', slot: 'eyeL', chips: ['atk'] }, { id: 'emp_knuckles', slot: 'handL', chips: ['atk'] },
      { id: 'thorns_plate', slot: 'body', chips: ['def', 'hp'] }, { id: 'blink_charge', slot: 'legL', chips: ['def'] }
    ] },
    10: { chipQuality: 'purple', items: [
      { id: 'thermal_optics', slot: 'eyeL', chips: ['def'] }, { id: 'assault_hand_p', slot: 'handL', chips: ['atk', 'def'] },
      { id: 'surv_body_p', slot: 'body', chips: ['def', 'hp'] }, { id: 'surv_spine_p', slot: 'spine', chips: ['atk'] },
      { id: 'assault_leg_p', slot: 'legL', chips: [] }
    ] },
    15: { chipQuality: 'orange', items: [
      { id: 'eye_orange', slot: 'eyeL', chips: [] }, { id: 'monowire', slot: 'handL', chips: ['atk'] },
      { id: 'hand_orange', slot: 'handR', chips: ['def'] }, { id: 'biomonitor', slot: 'body', chips: ['hp'] },
      { id: 'pain_editor', slot: 'spine', chips: ['def'] }, { id: 'assault_leg_p', slot: 'legL', chips: [] }
    ] }
  },
  geometry: 'Known fixed arena geometry. Target and warning inspection follows the current visibility grid.',
  timing: 'Each action yields a real animation frame and waits for the engine hit-stop deadline without altering it.',
  levelRewards: 'Starting level rewards are declined for a fixed initial loadout. During-combat level rewards choose the offered chips option.',
  seeds, maxTurns
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    const probe = await browser.newPage();
    await probe.goto(url);
    const integrated = await probe.evaluate(() => !!(window.__neon && __neon.bossCombat && typeof __neon.bossCombat.act === 'function'));
    await probe.close();
    if (!integrated) {
      console.log(JSON.stringify({ status: 'PENDING_INTEGRATION', expected: '__neon.bossCombat instance routed through enemyAct', declaration }, null, 2));
      process.exitCode = 2;
      return;
    }
    for (const seed of seeds) for (const bossId of bossIds) for (const profile of profiles) for (const policy of declaration.policies) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(value => {
        let state = value >>> 0;
        Math.random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
        localStorage.clear();
        localStorage.setItem('neon-depth-mute', '1');
        localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
      }, seed);
      try {
        await page.goto(url);
        const result = await page.evaluate(async ({ bossId, profile, policy, declaration }) => {
          const N = __neon, G = N.G, T = N.test;
          const aware = policy !== 'naive-circle', counter = policy === 'counter-aware';
          const bossSpec = N.bosses().find(spec => spec.id === bossId);
          if (!bossSpec) throw new Error('Unknown boss ' + bossId);
          const depth = bossSpec.tier * 5, level = declaration.levelsByDepth[depth];
          if (declaration.setupSeed != null) {
            let setupRandom = (Number(declaration.setupSeed) + depth * 1009) >>> 0;
            Math.random = () => { setupRandom ^= setupRandom << 13; setupRandom ^= setupRandom >>> 17; setupRandom ^= setupRandom << 5; return (setupRandom >>> 0) / 4294967296; };
          }
          N.meta.up = {}; N.meta.pour = {}; N.test.story.ST.pendingDrink = null;
          G.classId = declaration.class; G.trainPending = false; G.rushPending = null; G.dreamPending = null;
          G.prepPick = null; G.chalSel = [];
          N.startGame(); T.hideOverlay();
          G.enemies = []; G.items = []; G.sites = []; G.quests = []; G.storyQueue = [];
          const offeredChoices = [];
          function claimOfferedRewards() {
            while (N.p.pending > 0) {
              T.ui.showSkillChoice();
              const buttons = Array.from(document.querySelectorAll('[data-reward]'));
              const cyber = buttons.find(button => button.dataset.reward.startsWith('cyber:'));
              const mod = cyber && N.mods.find(mod => mod.id === cyber.dataset.reward.slice(6));
              const useful = mod && (mod.active && /drone|turret|wall|multi|arc|burst|cleave|shield|heal|blink/.test(mod.active.type) || mod.stats && (mod.stats.def || mod.stats.maxHp || mod.stats.lifesteal));
              const consumable = buttons.find(button => /^cons:(emp|nano_swarm|nanite_patch|trauma_injector|aegis_field|coolant|overclock_cell)$/.test(button.dataset.reward));
              const selected = useful ? cyber : consumable && G.inv.length < 4 ? consumable : buttons.find(button => button.dataset.reward === 'chips');
              if (!selected) throw new Error('No real offered level reward was available');
              offeredChoices.push({ level: N.p.level, depth: G.depth, offered: buttons.map(button => button.dataset.reward), selected: selected.dataset.reward });
              selected.click(); T.hideOverlay();
            }
          }
          if (profile === 'offered') claimOfferedRewards();
          while (N.p.level < level) {
            if (profile === 'offered') G.depth = 1 + Math.floor((N.p.level - 1) * (depth - 2) / Math.max(1, level - 2));
            N.gainXp(N.p.next - N.p.xp);
            if (profile === 'offered') {
              claimOfferedRewards();
              if (N.p.level >= 5 && !G.spec) { T.chooseSpec(declaration.specialization); T.hideOverlay(); }
            }
          }
          N.p.pending = 0; G.pendingBoard = null; G.pendingBoons = 0;
          if (!G.spec) T.chooseSpec(declaration.specialization);
          T.hideOverlay(); G.pendingEvo = 0;
          // No level-generated inventory is retained in the controlled starting loadout.
          if (profile !== 'offered') { G.chips = []; G.cyberChips = {}; G.modBag = []; G.mods = {}; G.cyber = {}; G.inst = {}; }
          G.trainBonus = null; G.adaptBonus = 0; G.chal = null;
          N.recalc();
          if (profile === 'blue') {
            declaration.gearCandidates.forEach(id => {
              const mod = N.mods.find(entry => entry.id === id);
              if (!mod || mod.quality !== 'blue') throw new Error('Missing blue fixture implant ' + id);
              N.applyMod(mod);
            });
            for (let i = 0; i < declaration.chipCandidates.compat; i++) G.chips.push(N.makeChip('compat', 'blue'));
            for (let i = 0; i < declaration.chipCandidates.atk; i++) {
              ['atk', 'def', 'hp'].forEach(stat => G.chips.push(N.makeChip(stat, 'blue')));
            }
            T.v36.autoLoadout(); T.hideOverlay();
          } else if (profile === 'balanced-blue' || profile === 'balanced-tiered') {
            const recipe = profile === 'balanced-blue' ? declaration.balancedBlue[depth] : declaration.balancedTiered[depth].items;
            const quality = profile === 'balanced-blue' ? 'blue' : declaration.balancedTiered[depth].chipQuality;
            recipe.forEach(entry => {
              const mod = N.mods.find(item => item.id === entry.id);
              if (!mod || mod.cls && mod.cls !== G.classId || ['gray', 'green', 'blue', 'purple', 'orange', 'red'].indexOf(mod.quality) > ['gray', 'green', 'blue', 'purple', 'orange', 'red'].indexOf(quality)) throw new Error('Invalid declared implant ' + entry.id);
              N.applyMod(mod);
            });
            recipe.forEach(entry => {
              const slot = Object.keys(G.cyber).find(slot => G.cyber[slot] === entry.id);
              if (!slot) throw new Error('Balanced fixture implant did not equip ' + entry.id);
              if (entry.slot && entry.slot !== slot) throw new Error('Declared slot differs for ' + entry.id);
              entry.chips.forEach(stat => {
                const index = G.chips.push(N.makeChip(stat, quality)) - 1;
                N.openCyber(); G.cyberItem = entry.id; T.ui.renderCyber();
                const button = document.querySelector('[data-chip="' + index + '"]');
                if (!button || button.disabled) throw new Error('Balanced chip could not use its normal socket control');
                button.click(); T.hideOverlay();
              });
            });
          } else if (profile === 'offered') {
            T.v36.autoLoadout(); T.hideOverlay();
          }
          N.recalc();
          if (N.cyberLoad() > N.adaptationCap()) throw new Error('Controlled blue loadout is overloaded');
          if (profile !== 'offered') G.inv = ['trauma_injector'];
          G.paused = false; G.busy = false; G.modal = null;
          const preparationHeal = G.inv.findIndex(id => id === 'trauma_injector' || id === 'nanite_patch');
          if (preparationHeal >= 0 && (profile !== 'offered' || N.p.hp < N.p.maxHp)) N.useConsumable(preparationHeal);
          T.hideOverlay();
          if (profile !== 'offered') G.inv = declaration.combatConsumables.slice();
          G.depth = depth; G.quests = []; G.corpOp = null; G.trialKit = null; G.storyQueue = [];
          G.cams = []; G.cfence = []; G.cmines = []; G.corpStrikes = [];
          G.allies = profile === 'offered' ? G.allies.filter(ally => ally.kind === 'drone') : [];
          G.hackedFields = []; G.hazards = []; G.walls = [];
          G.paused = false; G.busy = false; G.modal = null; G.state = 'play';
          T.genBossFloor(depth, bossSpec); T.hideOverlay();
          if (profile === 'offered') {
            // Match the existing startFloor placement of naturally earned carried drones.
            G.allies.forEach(ally => {
              const destination = T.tacticArea(N.p.x, N.p.y, 1, 1).find(cell => !G.enemies.concat(G.allies).some(actor => actor !== ally && actor.x === cell.x && actor.y === cell.y));
              if (destination) { ally.x = destination.x; ally.y = destination.y; }
            });
          }
          const boss = G.enemies.find(enemy => enemy.boss);
          const startTurn = G.turn;
          const damageAtStart = G.stats && G.stats.damageTaken || 0;
          const itemsAtStart = G.stats && G.stats.itemsUsed || 0;
          const initial = {
            level: N.p.level, hp: N.p.hp, maxHp: N.p.maxHp, attack: N.p.atk + G.mod.atk, defense: N.p.def,
            load: N.cyberLoad(), adaptation: N.adaptationCap(), ammo: G.ammo, energy: G.energy, materials: G.mat || 0,
            implants: Object.assign({}, G.cyber), chips: Object.fromEntries(Object.entries(G.cyberChips).map(([slot, chips]) => [slot, chips.map(chip => ({ stat: chip.stat, val: chip.val, quality: chip.quality, affixes: chip.affixes }))])),
            instances: JSON.parse(JSON.stringify(G.inst)), derivedMods: Object.assign({}, G.mod),
            bossHp: boss.maxHp, bossAttack: boss.atk, bossDefense: boss.def,
            trainingBonus: G.trainBonus, adaptBonus: G.adaptBonus, progression: Object.assign({}, N.meta.up)
          };
          initial.offeredChoices = offeredChoices;
          initial.skills = Object.assign({}, G.skills);
          initial.specialization = G.spec;
          initial.allies = G.allies.map(ally => ({ kind: ally.kind, turns: ally.turns, x: ally.x, y: ally.y }));
          initial.consumables = G.inv.slice();
          const counts = {}, trace = [], damageFlow = {};
          const production = { createdStructures: {}, createdMinions: 0, removedEntities: 0, liveMinionSum: 0, liveStructureSum: 0, samples: 0 };
          const everSeen = new Set(G.enemies.map(enemy => enemy.uid));
          let previousAlive = new Set(everSeen);
          let frameSamples = 0, warningFrameSamples = 0, hazardFrameSamples = 0, sampling = true, observationFrame;
          function observeFrame() {
            if (!sampling) return;
            frameSamples++;
            if (boss.intent && boss.intent.cells.some(cell => G.vis[cell.y] && G.vis[cell.y][cell.x])) warningFrameSamples++;
            if (G.hazards.some(field => field.bossCombat && field.cells.some(cell => G.vis[cell.y] && G.vis[cell.y][cell.x]))) hazardFrameSamples++;
            observationFrame = requestAnimationFrame(observeFrame);
          }
          observationFrame = requestAnimationFrame(observeFrame);
          const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
          const visible = actor => !!(G.vis[actor.y] && G.vis[actor.y][actor.x]);
          const floor = (x, y) => G.map[y] && G.map[y][x] === 0 && !(G.walls || []).some(wall => wall.x === x && wall.y === y && wall.turns > 0);
          const occupied = (x, y) => G.enemies.some(enemy => enemy.hp > 0 && enemy.x === x && enemy.y === y);
          function los(from, to) {
            const length = distance(from, to);
            for (let step = 1; step <= length; step++) {
              if (!floor(Math.round(from.x + (to.x - from.x) * step / length), Math.round(from.y + (to.y - from.y) * step / length))) return false;
            }
            return true;
          }
          function adjacent(origin) {
            const cells = [];
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue;
              if (floor(origin.x + dx, origin.y + dy) && !occupied(origin.x + dx, origin.y + dy)) cells.push({ x: origin.x + dx, y: origin.y + dy });
            }
            return cells;
          }
          function danger() {
            const cells = [];
            G.enemies.forEach(enemy => { if (enemy.intent) cells.push(...enemy.intent.cells.filter(cell => G.vis[cell.y] && G.vis[cell.y][cell.x])); });
            (G.hazards || []).forEach(field => { if (field.delay <= 2) cells.push(...field.cells.filter(cell => G.vis[cell.y] && G.vis[cell.y][cell.x])); });
            return new Set(cells.map(cell => cell.x + ',' + cell.y));
          }
          function pathStep(goal, dangerCells, limit = 30) {
            const origin = { x: N.p.x, y: N.p.y }, queue = [{ cell: origin, first: null, length: 0 }];
            const seen = new Set([origin.x + ',' + origin.y]);
            for (let i = 0; i < queue.length; i++) {
              const node = queue[i];
              if (node.first && goal(node.cell)) return node.first;
              if (node.length >= limit) continue;
              adjacent(node.cell).forEach(next => {
                const key = next.x + ',' + next.y;
                if (seen.has(key) || dangerCells && dangerCells.has(key)) return;
                seen.add(key); queue.push({ cell: next, first: node.first || next, length: node.length + 1 });
              });
            }
            return null;
          }
          function use(name, run) {
            const before = G.turn;
            run();
            if (G.turn !== before) { counts[name] = (counts[name] || 0) + 1; return true; }
            return false;
          }
          function move(position, name) {
            return position && use(name || 'move', () => N.doMove(position.x - N.p.x, position.y - N.p.y));
          }
          function dismiss() {
            if (!G.modal) return;
            const reward = document.querySelector('[data-reward="chips"]');
            if (reward) { reward.click(); return; }
            if (G.pendingEvo && !G.spec) { T.chooseSpec(declaration.specialization); return; }
            const boon = document.querySelector('[data-boon]');
            if (boon) { boon.click(); return; }
            T.hideOverlay();
          }
          function active(kind, target) {
            const candidates = Object.keys(G.cyber).map(slot => N.mods.find(mod => mod.id === G.cyber[slot])).filter(mod => mod && mod.active && !(G.cyberCd[mod.id] > 0));
            const oldFace = N.p.face;
            if (target) N.p.face = Math.atan2(target.y - N.p.y, target.x - N.p.x);
            const choice = candidates.find(mod => {
              if (!kind.test(mod.active.type)) return false;
              if (!counter || /shield|heal|blink|mark_scan|sandevistan/.test(mod.active.type)) return true;
              const planner = N.r38 && N.r38.implantCombat;
              const plan = planner && planner.plan(mod, null, true);
              if (plan) return plan.attacks.some(attack => planner.targets(attack).some(enemy => visible(enemy)));
              const ranges = { multi: 6, arc: 3, burst: 2, cleave: 1, cleave_bleed: 1, lifesteal_burst: 1 };
              return G.enemies.some(enemy => enemy.hp > 0 && visible(enemy) && distance(enemy, N.p) <= (ranges[mod.active.type] || 7));
            });
            if (!choice) { N.p.face = oldFace; return false; }
            return use('cyber:' + choice.active.type, () => N.useCyberActive(choice.id));
          }
          function blinkLanding(dx, dy) {
            const origin = { x: N.p.x, y: N.p.y };
            let last = origin;
            for (let step = 1; step <= 4; step++) {
              const x = origin.x + dx * step, y = origin.y + dy * step;
              if (!G.map[y] || G.map[y][x] == null) break;
              if (G.map[y][x] === 1) {
                for (let beyond = 1; beyond <= 3; beyond++) {
                  const candidate = { x: origin.x + dx * (step + beyond), y: origin.y + dy * (step + beyond) };
                  if (floor(candidate.x, candidate.y) && !occupied(candidate.x, candidate.y)) { last = candidate; break; }
                }
                break;
              }
              if (!floor(x, y) || occupied(x, y)) break;
              last = { x, y };
            }
            return last;
          }
          function blinkRoute(target, marked, toward) {
            const choices = [];
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue;
              const last = blinkLanding(dx, dy), steps = distance(last, N.p);
              if (steps < 2 || marked.has(last.x + ',' + last.y)) continue;
              if (toward && distance(last, target) > distance(N.p, target) - 2) continue;
              choices.push({ cell: last, steps });
            }
            choices.sort((a, b) => (distance(a.cell, target) - distance(b.cell, target)) * (toward ? 1 : -1) || b.steps - a.steps);
            return choices.length && active(/^blink$/, choices[0].cell);
          }
          function weaponStrike(target) {
            const weapon = N.meleeWeapon(), planner = N.r38 && N.r38.implantCombat;
            if (!weapon || !planner) return false;
            const oldFace = N.p.face;
            N.p.face = Math.atan2(target.y - N.p.y, target.x - N.p.x);
            const stages = N.meleeStages(weapon.melee);
            const plan = planner.plan(weapon, stages[(G.melee.seq || 0) % stages.length], false);
            if (!plan || !plan.attacks.some(attack => planner.targets(attack).some(enemy => visible(enemy)))) { N.p.face = oldFace; return false; }
            return use('weapon-strike', () => N.meleeStrike());
          }
          let stalled = 0, blocked = 0, peakLivingEnemies = G.enemies.length;
          for (let input = 0; input < declaration.maxTurns && G.state === 'play' && N.p.hp > 0 && boss.hp > 0; input++) {
            await new Promise(resolve => requestAnimationFrame(resolve));
            const hitStop = (G.hitStopUntil || 0) - Date.now();
            if (hitStop > 0) await new Promise(resolve => setTimeout(resolve, hitStop + 1));
            dismiss();
            if (G.modal || G.paused || G.busy) { stalled++; if (stalled >= 4) break; continue; }
            stalled = 0;
            const hp = N.p.hp, beforeTurn = G.turn;
            const damageBefore = G.stats.damageTaken, shieldBefore = N.shieldPool();
            const targets = G.enemies.filter(enemy => enemy.hp > 0 && !enemy.neutral && visible(enemy)).sort((a, b) => distance(a, N.p) - distance(b, N.p));
            const nearest = targets[0] || boss;
            const producerOrder = bossId === 'bh_hive' ? ['relay', 'medic', 'gate', 'nest', 'egg'] : ['nest', 'egg', 'gate', 'medic', 'relay'];
            const producer = counter && targets.filter(enemy => producerOrder.includes(enemy.structure))
              .sort((a, b) => producerOrder.indexOf(a.structure) - producerOrder.indexOf(b.structure) || distance(a, N.p) - distance(b, N.p))[0];
            const intended = producer || nearest;
            const marked = aware ? danger() : new Set();
            let acted = false;
            if (counter && G.classId === 'engineer' && targets.length && G.allies.filter(ally => ally.kind === 'drone' && ally.turns > 0).length < 3) {
              const drone = N.activeSkills().find(skill => skill.ability === 'drone' && !(G.cd[skill.id] > 0));
              if (drone) acted = use('class-drone', () => N.useAbility(drone.id));
            }
            if (!acted && aware && N.p.hp < N.p.maxHp * .45) {
              const heal = G.inv.findIndex(id => id === 'nanite_patch' || id === 'trauma_injector');
              if (heal >= 0) acted = use('heal-item', () => N.useConsumable(heal));
              if (!acted) acted = active(/heal|shield/, nearest);
            }
            if (!acted && counter && targets.length >= 3) {
              const clearItem = G.inv.findIndex(id => id === 'emp' || id === 'nano_swarm' || id === 'meltdown_charge');
              if (clearItem >= 0) acted = use('clear-item', () => N.useConsumable(clearItem));
            }
            if (!acted && counter && G.stance) acted = use('release-directed', () => N.doMove(Math.sign(intended.x - N.p.x), Math.sign(intended.y - N.p.y)));
            if (!acted && counter && targets.length && N.shieldPool() <= 0) acted = active(/^shield$/, nearest);
            if (!acted && counter && G.classId === 'engineer' && targets.filter(enemy => distance(enemy, N.p) <= 3).length >= 3) {
              const wall = N.activeSkills().find(skill => skill.ability === 'wall' && !(G.cd[skill.id] > 0));
              if (wall) { N.p.face = Math.atan2(nearest.y - N.p.y, nearest.x - N.p.x); acted = use('class-wall', () => N.useAbility(wall.id)); }
            }
            if (!acted && counter && bossId === 'bh_phase' && boss.brain.form === 1 && distance(N.p, boss) <= 3) acted = blinkRoute(boss, marked, false);
            const threatened = G.enemies.filter(enemy => enemy.intent && enemy.intent.cells.some(cell => cell.x === N.p.x && cell.y === N.p.y))
              .reduce((sum, enemy) => sum + Math.max(1, enemy.intent.damage - N.p.def * .7), 0) +
              G.hazards.filter(field => field.cells.some(cell => cell.x === N.p.x && cell.y === N.p.y))
                .reduce((sum, field) => sum + Math.max(0, field.damage - N.p.def * (field.kind === 'acid' ? .25 : .65)), 0);
            const protectedCommit = counter && producer && distance(N.p, producer) <= 6 && N.shieldPool() >= threatened;
            if (!acted && aware && !protectedCommit && marked.has(N.p.x + ',' + N.p.y)) {
              const safe = adjacent(N.p).filter(cell => !marked.has(cell.x + ',' + cell.y)).sort((a, b) => Math.abs(distance(a, nearest) - 5) - Math.abs(distance(b, nearest) - 5));
              if (safe.length) acted = move(safe[0], 'evade');
              if (!acted && G.enemies.some(enemy => enemy.intent && enemy.intent.turns > 1 && enemy.intent.cells.some(cell => cell.x === N.p.x && cell.y === N.p.y))) {
                acted = move(pathStep(cell => !marked.has(cell.x + ',' + cell.y), null, 2), 'evade-path');
              }
              if (!acted) acted = counter ? blinkRoute(nearest, marked, false) : active(/blink|sandevistan/, nearest);
              if (!acted) {
                const shield = G.inv.indexOf('aegis_field');
                if (shield >= 0) acted = use('shield-item', () => N.useConsumable(shield));
              }
            }
            if (!acted && counter && producer && distance(N.p, producer) > 3) acted = blinkRoute(producer, marked, true);
            if (!acted && aware && targets.length && distance(N.p, nearest) <= 10 && N.shieldPool() <= 0) acted = active(/^shield$/, nearest);
            if (!acted && aware && targets.length && !intended.marked && distance(N.p, intended) <= 7) acted = active(/^mark_scan$/, intended);
            if (!acted && aware && targets.length && distance(N.p, nearest) <= 7) {
              acted = active(/beam|multi|arc|burst|airstrike|cleave|charge/, intended);
            }
            if (!acted && counter && targets.length) acted = weaponStrike(intended);
            if (!acted && counter && producer && (nearest !== producer || distance(N.p, producer) > 6)) {
              const next = pathStep(cell => distance(cell, producer) <= 5 && los(cell, producer) && targets.every(enemy => enemy === producer || distance(cell, enemy) >= distance(cell, producer)), protectedCommit ? null : marked);
              acted = move(next, 'producer-position');
              if (!acted && distance(N.p, producer) > 3) acted = active(/^blink$/, producer);
            }
            if (!acted && G.classId === 'assault' && G.reload) acted = move(adjacent(N.p).filter(cell => !marked.has(cell.x + ',' + cell.y)).sort((a, b) => distance(b, nearest) - distance(a, nearest))[0], 'reload-move');
            if (!acted && G.classId === 'assault' && !G.reload && G.ammo === 0) {
              const magazine = G.inv.indexOf('mag_pack');
              if (magazine >= 0 && G.energy >= T.gunReloadCost()) acted = use('reload-item', () => T.v18.reloadWithItem(magazine));
              if (!acted && N.r38 && N.r38.reloadGun && (G.mat || 0) > 0) acted = use('craft-reload', () => N.r38.reloadGun());
            }
            if (!acted && !producer && targets.length && distance(N.p, nearest) <= 4 && (G.classId !== 'assault' || G.ammo > 0)) {
              const choices = adjacent(N.p).filter(cell => !marked.has(cell.x + ',' + cell.y))
                .sort((a, b) => distance(b, nearest) - distance(a, nearest) || Math.atan2(a.y - nearest.y, a.x - nearest.x) - Math.atan2(b.y - nearest.y, b.x - nearest.x));
              if (choices.length && distance(choices[0], nearest) > distance(N.p, nearest)) acted = move(choices[0], 'kite');
            }
            if (!acted && G.classId === 'assault' && !G.reload && G.ammo > 0 && targets.some(enemy => distance(N.p, enemy) <= 7 && los(N.p, enemy))) acted = use('gun', () => T.gunFire());
            if (!acted && aware) {
              const wanted = G.items.filter(item => visible(item) && (N.p.hp < N.p.maxHp * .7 && item.it && item.it.kind === 'heal' || !G.ammo && item.cons && item.cons.id === 'mag_pack'))
                .sort((a, b) => distance(a, N.p) - distance(b, N.p))[0];
              if (wanted && distance(wanted, N.p) <= 5) acted = move(pathStep(cell => cell.x === wanted.x && cell.y === wanted.y, marked), 'pickup');
            }
            if (!acted && distance(N.p, nearest) <= 1) acted = use('melee', () => N.doMove(Math.sign(nearest.x - N.p.x), Math.sign(nearest.y - N.p.y)));
            if (!acted) {
              const range = G.classId === 'assault' && G.ammo > 0 ? 6 : 1;
              const next = pathStep(cell => distance(cell, intended) <= range && los(cell, intended), aware ? marked : null);
              acted = move(next, 'approach');
            }
            if (!acted) acted = use('wait', () => N.doMove(0, 0));
            peakLivingEnemies = Math.max(peakLivingEnemies, G.enemies.length);
            const nowAlive = new Set(G.enemies.filter(enemy => enemy.hp > 0).map(enemy => enemy.uid));
            G.enemies.forEach(enemy => {
              if (everSeen.has(enemy.uid)) return;
              everSeen.add(enemy.uid);
              if (enemy.structure) production.createdStructures[enemy.structure] = (production.createdStructures[enemy.structure] || 0) + 1;
              else if (enemy.summoned) production.createdMinions++;
            });
            previousAlive.forEach(uid => { if (!nowAlive.has(uid)) production.removedEntities++; });
            previousAlive = nowAlive;
            production.liveMinionSum += G.enemies.filter(enemy => enemy.hp > 0 && enemy.summoned && !enemy.structure).length;
            production.liveStructureSum += G.enemies.filter(enemy => enemy.hp > 0 && enemy.structure).length;
            production.samples++;
            if (G.turn !== beforeTurn) {
              const action = boss.brain.combat && boss.brain.combat.lastAction || 'legacy';
              const flow = damageFlow[action] || (damageFlow[action] = { playerTurns: 0, hpDamage: 0, netShieldReduction: 0 });
              flow.playerTurns += G.turn - beforeTurn;
              flow.hpDamage += Math.max(0, G.stats.damageTaken - damageBefore);
              flow.netShieldReduction += Math.max(0, shieldBefore - N.shieldPool());
            }
            if (G.turn === beforeTurn && G.state === 'play') { blocked++; if (blocked >= 8) break; }
            else blocked = 0;
            if (trace.length < 12 || N.p.hp < hp) trace.push({ turn: G.turn - startTurn, hp: N.p.hp, bossHp: Math.max(0, boss.hp), position: [N.p.x, N.p.y], phase: boss.brain.stage, warning: boss.intent && boss.intent.kind });
          }
          sampling = false; cancelAnimationFrame(observationFrame);
          const damageTaken = (G.stats && G.stats.damageTaken || 0) - damageAtStart;
          return { bossId, profile, policy, depth, seed: null, initial, win: boss.hp <= 0 && N.p.hp > 0,
            outcome: boss.hp <= 0 ? 'boss-defeated' : N.p.hp <= 0 || G.state === 'over' ? 'player-defeated' : stalled >= 4 || blocked >= 8 ? 'blocked-input' : 'turn-limit',
            turns: G.turn - startTurn, hp: N.p.hp, maxHp: N.p.maxHp, bossHp: Math.max(0, boss.hp), damageTaken,
            controllerRouted: !!boss.brain.combat, counts, peakLivingEnemies, trace: trace.slice(-16),
            bossActions: boss.brain.combat && boss.brain.combat.actions, damageFlow,
            sampledVisibleWarningFrameRatio: frameSamples ? warningFrameSamples / frameSamples : 0, frameSamples, warningFrameSamples,
            sampledVisibleHazardFrameRatio: frameSamples ? hazardFrameSamples / frameSamples : 0,
            production, productionScope: 'Created entity counts and mean live counts are observed. Removals include kills, hatching and despawning.',
            damageFlowScope: 'Per-player-action engine damageTaken totals grouped by the last boss action, including simultaneous hazards/adds and possible final-hit overkill.',
            consumedItems: (G.stats && G.stats.itemsUsed || 0) - itemsAtStart, remainingConsumables: G.inv.slice(), remainingEnergy: G.energy, remainingAmmo: G.ammo,
            terminalInput: { state: G.state, modal: G.modal, paused: G.paused, busy: G.busy, reload: G.reload, hitStopRemainingMs: Math.max(0, (G.hitStopUntil || 0) - Date.now()) },
            trainingStatsAbsent: !G.trainBonus && !G.adaptBonus && Object.keys(N.meta.up).length === 0 };
        }, { bossId, profile, policy, declaration });
        result.seed = seed; result.errors = errors;
        result.initialFingerprint = crypto.createHash('sha256').update(JSON.stringify({ level: result.initial.level, hp: result.initial.hp, maxHp: result.initial.maxHp,
          implants: result.initial.implants, chips: result.initial.chips, instances: result.initial.instances, mods: result.initial.derivedMods })).digest('hex');
        results.push(result);
      } catch (error) {
        results.push({ bossId, profile, policy, seed, outcome: 'test-error', error: error.message, errors });
      } finally {
        await page.close();
      }
    }
    const errors = results.filter(result => result.error || result.errors.length || !result.trainingStatsAbsent || !result.controllerRouted);
    const nakedNoHitLance = results.filter(result => result.bossId === 'bl_lance' && result.profile === 'naked' && result.policy === 'naive-circle' && result.win && !result.damageTaken);
    const pairedFixtures = {};
    results.filter(result => result.initialFingerprint).forEach(result => {
      const key = result.bossId + '/' + result.profile + '/' + result.seed;
      pairedFixtures[key] = pairedFixtures[key] || [];
      pairedFixtures[key].push(result.initialFingerprint);
    });
    const mismatchedFixtures = Object.entries(pairedFixtures).filter(([, values]) => new Set(values).size > 1).map(([key]) => key);
    const summary = { status: errors.length || nakedNoHitLance.length ? 'REGRESSION_FAILURE' : 'EXPERIMENT_COMPLETE',
      declaration, total: results.length, wins: results.filter(result => result.win).length,
      losses: results.filter(result => result.outcome === 'player-defeated').length,
      censored: results.filter(result => result.outcome === 'turn-limit' || result.outcome === 'blocked-input').length,
      errors: errors.length, nakedNoHitLance: nakedNoHitLance.length, mismatchedFixtures, results };
    console.log(JSON.stringify(summary, null, 2));
    assert.equal(errors.length, 0, 'Normal engine validation errors');
    assert.equal(nakedNoHitLance.length, 0, 'Naked naive lance no-hit win regression');
    if (declaration.setupSeed != null) assert.equal(mismatchedFixtures.length, 0, 'Paired policies must have identical initial equipment and HP');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
