const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'game.js'));
const sourceHash = crypto.createHash('sha256').update(source).digest('hex');
const output = path.resolve(root, '../work/r39/doctor-reforge-regression.json');
const cases = [
  { name: 'Enhancing a full body slot moves its implant and chips into the bag', action: 'enhance', owner: 'body_red', detach: true },
  { name: 'Removing an overloaded spine preserves HP supplied by the remaining body', action: 'enhance', owner: 'spine_purple', detach: true },
  { name: 'A safe enhancement remains equipped', action: 'enhance', owner: 'body_red', safe: true },
  { name: 'Enhancement after continuing a save retains all displaced items', action: 'enhance', owner: 'body_red', detach: true, restore: true },
  { name: 'Enhancement settles a restored legacy-overloaded set', action: 'enhance', owner: 'body_red', detach: true, restore: true, legacy: true },
  { name: 'Accepting a reforge that removes compatibility moves the owner and all chips into the bag', action: 'reforge', owner: 'body_red', detach: true },
  { name: 'A safe accepted reforge remains equipped', action: 'reforge', owner: 'body_red', safe: true },
  { name: 'Keeping the old affix preserves the equipped set and HP', action: 'reforge', owner: 'body_red', keep: true },
  { name: 'Accepted reforge after continuing a save retains displaced items', action: 'reforge', owner: 'body_red', detach: true, restore: true },
  { name: 'Accepted reforge settles a restored legacy-overloaded set', action: 'reforge', owner: 'body_red', detach: true, restore: true, legacy: true },
  { name: 'Keeping the old affix after continuing a save preserves the equipped set', action: 'reforge', owner: 'body_red', keep: true, restore: true }
];

function createServer() {
  // Freeze the engine in memory so a concurrent source edit cannot mix versions within this run.
  return http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\//, '') || 'index.html';
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root + path.sep)) { response.writeHead(404); response.end(); return; }
    try {
      const content = relative === 'game.js' ? source : fs.readFileSync(filename);
      const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
      response.setHeader('Content-Type', (types[path.extname(filename)] || 'application/octet-stream') + '; charset=utf-8');
      response.end(content);
    } catch {
      response.writeHead(404); response.end();
    }
  });
}

async function snapshot(page) {
  return page.evaluate(() => {
    const N = window.__neon, G = N.G;
    const socketed = Object.entries(G.cyberChips).flatMap(([slot, chips]) => chips.map(chip => ({ ...chip, auditSlot: slot })));
    return {
      mode: G.mode, load: N.cyberLoad(), cap: N.adaptationCap(), overload: N.cyberOverload(),
      hp: N.p.hp, maxHp: N.p.maxHp, credits: G.credits,
      cyber: JSON.parse(JSON.stringify(G.cyber)),
      instances: JSON.parse(JSON.stringify(G.inst)),
      modBag: G.modBag.slice().sort(),
      chips: JSON.parse(JSON.stringify(G.chips)),
      socketed: JSON.parse(JSON.stringify(socketed)),
      ground: (G.items || []).filter(item => item.mod || item.chip).map(item => ({ mod: item.mod && item.mod.id, chip: item.chip && item.chip._r39AuditId }))
    };
  });
}

async function verifySavedResult(page, after) {
  const saved = await page.evaluate(() => {
    const saved = window.__neon.test.save.savedRun();
    if (!saved) return null;
    return { hp: saved.p.hp, cyber: saved.G.cyber, instances: saved.G.inst,
      modBag: saved.G.modBag.slice().sort(),
      markers: saved.G.chips.concat(Object.values(saved.G.cyberChips).flat()).map(chip => chip._r39AuditId).sort() };
  });
  assert(saved, 'The completed operation did not leave a readable run save');
  assert.equal(saved.hp, after.hp, 'The saved HP does not match the final result');
  assert.deepEqual(saved.cyber, after.cyber, 'The save retained a different equipped set');
  assert.deepEqual(saved.instances, after.instances, 'The save lost the final instance values');
  assert.deepEqual(saved.modBag, after.modBag, 'The save lost implant ownership');
  assert.deepEqual(saved.markers, allChips(after).map(chip => chip._r39AuditId).sort(), 'The save lost or duplicated chips');
}

async function prepare(page, scenario) {
  await page.evaluate(scenario => {
    const N = window.__neon, G = N.G, T = N.test;
    N.meta.up = {}; N.meta.stash = { cyber: [], chips: [] };
    T.story.ST.pendingDrink = null;
    Object.assign(G, { classId: 'assault', chalSel: [], trainPending: false, dreamPending: null, rushPending: null });
    const spine = scenario.safe ? 'spine_gray' : scenario.action === 'reforge' ? 'spine_blue' : 'spine_purple';
    function instance(id) {
      return { name: N.mods.find(mod => mod.id === id).name, affixes: [], plus: 0, heavy: 0, dur: 20, maxDur: 20 };
    }
    function compatibility(marker) {
      const chip = N.makeChip('compat', 'gray');
      Object.assign(chip, { affixes: [], heavy: 0, _r39AuditId: marker });
      return chip;
    }
    let ownerChips = [compatibility('owner-first'), compatibility('owner-second')];
    if (scenario.action === 'reforge') {
      const chip = N.makeChip('atk', 'blue');
      Object.assign(chip, { heavy: 0, reforges: 2, _r39AuditId: 'owner-first',
        affixes: [{ id: 'compat', stat: 'compat', name: '兼容', quality: 'blue', val: 3, chipBalanceVersion: 2 }] });
      ownerChips = [chip, compatibility('owner-second')];
    }
    G.prepPick = { cybers: [], stashItems: ['body_red', spine, 'body_blue'].map(id => ({
      id, inst: instance(id), chips: id === scenario.owner ? ownerChips : []
    })) };
    N.startGame(); T.hideOverlay();
    Object.assign(G, { paused: false, busy: false, modal: null, pendingBoard: null,
      storyQueue: [], pendingBoons: 0, pendingEvo: 0, credits: 1000 });
    N.p.pending = 0;
    // Keep a legal exact-capacity fixture after compatibility-chip rebalancing.
    G.adaptBonus += N.cyberLoad() - N.adaptationCap() + (scenario.safe ? 4 : 0);
    N.recalc();
    const bagChip = N.makeChip('atk', 'gray');
    Object.assign(bagChip, { val: 1, affixes: [], heavy: 0, _r39AuditId: 'old-bag-chip' });
    G.chips.push(bagChip);
    if (scenario.legacy) {
      // Persist a historical overloaded state. The public continue flow decides its migration.
      G.inst[spine].heavy = 8;
      N.recalc();
    }
    N.p.hp = N.p.maxHp;
  }, scenario);
  const initial = await snapshot(page);
  assert.equal(initial.mode, 'normal');
  assert.equal(initial.modBag.length, 3);
  assert.equal(initial.socketed.length, 2);
  assert.equal(initial.chips.length, 1);
  if (scenario.legacy) assert(initial.load > initial.cap, 'Legacy fixture must begin overloaded');
  else if (scenario.safe) assert(initial.load < initial.cap, 'Safe fixture needs spare adaptation');
  else assert.equal(initial.load, initial.cap, 'Boundary fixture must begin exactly at capacity');

  if (scenario.restore) {
    assert.equal(await page.evaluate(() => window.__neon.test.save.saveRun(true)), true);
    await page.reload();
    await page.locator('#menuContinue').click();
    await page.waitForFunction(() => window.__neon.p && window.__neon.G.state === 'play');
    if (scenario.legacy) {
      const resumed = await snapshot(page);
      assert(resumed.load <= resumed.cap, 'Continuing did not repair the legacy overload');
      assert.deepEqual(resumed.modBag, initial.modBag, 'Continuing lost an implant');
      assert.deepEqual(allChips(resumed).map(chip => chip._r39AuditId).sort(),
        allChips(initial).map(chip => chip._r39AuditId).sort(), 'Continuing lost or duplicated a chip');
      assert.equal(resumed.hp, Math.min(initial.hp, resumed.maxHp), 'Continuing clipped HP before the final loadout');
    }
  }
  return initial;
}

function allChips(state) {
  return state.chips.concat(state.socketed).map(chip => {
    const copy = { ...chip }; delete copy.auditSlot; return copy;
  });
}

function findChip(state, marker) {
  return allChips(state).find(chip => chip._r39AuditId === marker);
}

function verifyInventory(scenario, before, after) {
  assert.equal(after.mode, 'normal');
  assert(after.load <= after.cap, `Final load ${after.load} exceeds adaptation ${after.cap}`);
  assert.deepEqual(after.modBag, before.modBag, 'Implant ownership changed');
  assert.deepEqual(after.ground, before.ground, 'The operation unexpectedly dropped an item');
  const beforeMarkers = allChips(before).map(chip => chip._r39AuditId).sort();
  const afterMarkers = allChips(after).map(chip => chip._r39AuditId).sort();
  assert.deepEqual(afterMarkers, beforeMarkers, 'A chip was lost or duplicated');
  assert.deepEqual(after.instances.body_blue, before.instances.body_blue, 'An existing bag implant changed');
  assert.deepEqual(findChip(after, 'old-bag-chip'), findChip(before, 'old-bag-chip'), 'An existing bag chip changed');
  assert.deepEqual(findChip(after, 'owner-second'), findChip(before, 'owner-second'), 'The other attached chip changed');
  assert.equal(after.hp, Math.min(before.hp, after.maxHp), 'HP was clipped before the final maximum was known');

  const ownerWasEquipped = Object.values(before.cyber).includes(scenario.owner);
  const chipWasSocketed = before.socketed.some(chip => chip._r39AuditId === 'owner-first');
  const overloadAfterChange = scenario.action === 'enhance' ? before.load + 1 > before.cap : before.load > before.cap - 1;
  const affectsEquippedOwner = ownerWasEquipped && (scenario.action === 'enhance' || chipWasSocketed);
  const shouldDetach = scenario.detach && affectsEquippedOwner && (!scenario.legacy || overloadAfterChange);
  if (shouldDetach) {
    assert(!Object.values(after.cyber).includes(scenario.owner), 'The overloaded implant remains equipped');
    for (const marker of ['owner-first', 'owner-second']) {
      assert(after.chips.some(chip => chip._r39AuditId === marker), `Displaced ${marker} did not reach the bag`);
    }
  } else {
    assert.deepEqual(after.cyber, before.cyber, 'A safe or unchanged loadout was unequipped');
    for (const marker of ['owner-first', 'owner-second']) {
      const wasSocketed = before.socketed.some(chip => chip._r39AuditId === marker);
      const remainsInPlace = (wasSocketed ? after.socketed : after.chips).some(chip => chip._r39AuditId === marker);
      assert(remainsInPlace, `${marker} was unnecessarily moved`);
    }
  }
}

async function enhance(page, scenario) {
  await page.evaluate(() => {
    Math.random = () => 0;
    window.__neon.test.v18.openDoctor({ type: 'doctor', data: {} });
  });
  await page.locator(`[data-enh="${scenario.owner}"]`).click();
  const label = await page.locator('#enGo').innerText();
  const match = label.match(/(\d+(?:\.\d+)?)\s*¥/);
  assert(match, `Enhancement price is missing from ${label}`);
  const cost = Number(match[1]);
  await page.locator('#enGo').click();
  await page.locator('.enh-stage.charging').waitFor({ state: 'detached' });
  return cost;
}

async function reforge(page, scenario) {
  await page.evaluate(() => {
    const N = window.__neon;
    Math.random = () => 0;
    window.__r39ReforgeSite = { type: 'reforge', x: N.p.x, y: N.p.y, data: { uses: 0 } };
    N.test.econ.openSite(window.__r39ReforgeSite);
  });
  await page.locator('[data-rtab="chip"]').click();
  const index = await page.evaluate(() => window.__r39ReforgeSite.data.chipList.findIndex(chip => chip._r39AuditId === 'owner-first'));
  assert(index >= 0, 'The original owned chip is missing from the reforge list');
  await page.locator(`[data-rc="${index}"]`).click();
  const label = await page.locator('#cfGo').innerText();
  const match = label.match(/¥\s*(\d+(?:\.\d+)?)/);
  assert(match, `Reforge price is missing from ${label}`);
  const cost = Number(match[1]);
  await page.locator('#cfGo').click();
  await page.locator('#cfTake').waitFor();
  await page.locator(scenario.keep ? '#cfKeep' : '#cfTake').click();
  return cost;
}

(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const results = [];
  try {
    browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
    const url = `http://127.0.0.1:${server.address().port}/index.html`;
    for (const scenario of cases) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const errors = [];
      let detail;
      try {
        await context.addInitScript(() => {
          localStorage.setItem('neon-depth-mute', '1');
          localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
        });
        const page = await context.newPage(); page.setDefaultTimeout(8000);
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(url);
        const initial = await prepare(page, scenario);
        const before = await snapshot(page);
        const cost = scenario.action === 'enhance' ? await enhance(page, scenario) : await reforge(page, scenario);
        const after = await snapshot(page);
        detail = { scenario, initial, before, after, cost, errors };
        verifyInventory(scenario, before, after);
        assert.equal(after.credits, before.credits - cost, 'The operation fee was reverted or charged twice');
        if (scenario.action === 'enhance') {
          assert.equal(after.instances[scenario.owner].plus, before.instances[scenario.owner].plus + 1, 'Successful enhancement was reverted');
          assert.equal(after.instances[scenario.owner].dur, before.instances[scenario.owner].dur - 1, 'Successful enhancement durability cost changed');
          assert.deepEqual(findChip(after, 'owner-first'), findChip(before, 'owner-first'), 'Enhancement changed an attached chip');
        } else {
          const oldChip = findChip(before, 'owner-first'), newChip = findChip(after, 'owner-first');
          assert.equal(newChip.reforges, oldChip.reforges + 1, 'The reforge count was reverted or incremented twice');
          assert.equal(newChip.stat, oldChip.stat); assert.equal(newChip.val, oldChip.val);
          if (scenario.keep) {
            assert.deepEqual(newChip.affixes, oldChip.affixes, 'Keeping old affixes changed the chip');
            assert.equal(after.hp, before.hp, 'Keeping old affixes changed HP');
          } else {
            assert.deepEqual(newChip.affixes.map(affix => ({ stat: affix.stat, quality: affix.quality, val: affix.val })),
              [{ stat: 'hp', quality: 'gray', val: 2 }], 'The accepted fixed-random affix result was reverted');
          }
        }
        await verifySavedResult(page, after);
        assert.deepEqual(errors, [], 'Uncaught browser errors');
        results.push({ name: scenario.name, passed: true, detail });
      } catch (error) {
        results.push({ name: scenario.name, passed: false, error: error.stack || error.message, detail, browserErrors: errors });
      } finally {
        await context.close();
      }
    }
    const report = { passed: results.every(result => result.passed), sourceHash,
      scope: 'Real doctor/reforge buttons, legal boundary fixtures, deterministic successful rolls, public saved-run continue flow and historical overloaded fixtures.',
      cases: results.length, results };
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
    for (const result of results) console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.passed ? '' : '\n' + result.error}`);
    console.log(`Evidence ${output}`);
    assert(report.passed, 'Doctor/reforge equipment settlement regression');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
