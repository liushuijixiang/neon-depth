const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(root, 'game.js'));
const sourceHash = crypto.createHash('sha256').update(engine).digest('hex');
const output = path.resolve(root, '../work/r39/prep-storage-regression.json');
const META_KEY = 'neon-depth-meta';
const RUN_KEY = 'neon-depth-run';

function createServer() {
  return http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\//, '') || 'index.html';
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root + path.sep)) { response.writeHead(404); response.end(); return; }
    try {
      const bytes = relative === 'game.js' ? engine : fs.readFileSync(filename);
      const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
      response.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
      response.end(bytes);
    } catch {
      response.writeHead(404); response.end();
    }
  });
}

function installStorageAudit() {
  const metaKey = 'neon-depth-meta', runKey = 'neon-depth-run';
  const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
  const read = () => ({ meta: localStorage.getItem(metaKey), run: localStorage.getItem(runKey) });
  const parse = raw => raw ? JSON.parse(raw) : null;
  const audit = { mode: null, injected: 0, events: [] };
  audit.arm = mode => { audit.mode = mode; audit.injected = 0; audit.events = []; };
  audit.capture = read;
  audit.restore = pair => {
    for (const [key, value] of [[metaKey, pair.meta], [runKey, pair.run]]) {
      if (value == null) remove.call(localStorage, key);
      else set.call(localStorage, key, value);
    }
  };
  Storage.prototype.setItem = function (key, value) {
    if (this !== localStorage || key !== metaKey && key !== runKey) return set.call(this, key, value);
    value = String(value);
    const pair = read(), before = localStorage.getItem(key), next = parse(value);
    const pending = parse(pair.meta)?.pendingPrepTransfer;
    const currentReceipt = parse(pair.run)?.G?.prepReceipt;
    const nextReceipt = key === runKey ? next.G?.prepReceipt : null;
    const firstMeta = key === metaKey && next.pendingPrepTransfer && !pending;
    const completeRun = key === runKey && nextReceipt?.ready === true;
    const finalMeta = key === metaKey && pending && !next.pendingPrepTransfer && currentReceipt?.id === pending.id && currentReceipt.ready === true;
    const matches = audit.mode === 'first-meta' && firstMeta || audit.mode === 'complete-run' && completeRun || audit.mode === 'final-meta' && finalMeta;
    const event = { operation: 'set', key, before, attempted: value, pairBefore: pair, injected: false };
    if (matches && audit.injected === 0) {
      audit.injected++;
      event.injected = true; event.after = localStorage.getItem(key); event.pairAfter = read();
      audit.events.push(event);
      throw new DOMException('Injected storage failure', 'QuotaExceededError');
    }
    try {
      const result = set.call(this, key, value);
      event.after = localStorage.getItem(key); event.pairAfter = read();
      audit.events.push(event);
      return result;
    } catch (error) {
      event.error = error.message; event.after = localStorage.getItem(key); event.pairAfter = read();
      audit.events.push(event); throw error;
    }
  };
  Storage.prototype.removeItem = function (key) {
    if (this !== localStorage || key !== metaKey && key !== runKey) return remove.call(this, key);
    const event = { operation: 'remove', key, before: localStorage.getItem(key), pairBefore: read() };
    const result = remove.call(this, key);
    event.after = localStorage.getItem(key); event.pairAfter = read(); audit.events.push(event);
    return result;
  };
  window.__prepStorageAudit = audit;
  localStorage.setItem('neon-depth-mute', '1');
  localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
  let seed = 39003;
  Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

async function prepare(page) {
  return page.evaluate(() => {
    const N = window.__neon, G = N.G;
    N.meta.up = {}; N.meta.cores = 500;
    N.test.story.ST.pendingDrink = null;
    Object.assign(G, { classId: 'assault', chalSel: [], trainPending: false, dreamPending: null, rushPending: null, prepPick: null });
    function chip(id, quality, marker, reforges = 0) {
      const value = N.makeChip(id, quality);
      value._r39StorageId = marker; value.reforges = reforges; value.heavy = 0;
      return value;
    }
    function entry(id, marker, plus, heavy, dur, chips) {
      const mod = N.mods.find(mod => mod.id === id);
      if (!mod) throw new Error(`Missing fixture ${id}`);
      return { id, locked: marker === 'same-C', chips,
        inst: { name: mod.name, affixes: [], plus, heavy, dur, maxDur: 20, _r39StorageId: marker } };
    }
    const warehouse = [
      entry('body_blue', 'same-A', 0, 0, 9, [chip('hp', 'gray', 'A-chip')]),
      entry('spine_gray', 'spacer', 1, 0, 6, [chip('def', 'gray', 'spacer-chip')]),
      entry('body_blue', 'same-B', 1, 1, 7, [chip('atk', 'blue', 'B-first', 3), chip('compat', 'gray', 'B-second')]),
      entry('eye_gray', 'selected-eye', 0, 0, 11, [chip('compat', 'gray', 'eye-chip')]),
      entry('body_blue', 'same-C', 2, 0, 13, [chip('hp', 'green', 'C-chip', 1)]),
      entry('stealth_heal', 'class-rejected', 0, 0, 15, [chip('hp', 'gray', 'rejected-chip')])
    ];
    const ghost = N.mods.find(mod => mod.id === 'stealth_heal');
    if (!ghost.cls || ghost.cls === 'assault') throw new Error('The rejected fixture must be class-incompatible');
    const loose = [chip('atk', 'gray', 'old-loose-first'), chip('hp', 'blue', 'old-loose-second', 2)];
    N.meta.stash = { cyber: warehouse, chips: loose };
    delete N.meta.pendingPrepTransfer;
    const initial = { meta: JSON.stringify(N.meta), run: null };
    window.__prepStorageAudit.restore(initial);
    N.test.v36.prepScreen();
    return { warehouse: JSON.parse(JSON.stringify(warehouse)), loose: JSON.parse(JSON.stringify(loose)), initial };
  });
}

async function transfer(page, indices, duplicateSelectionCheck = false) {
  if (duplicateSelectionCheck) {
    await page.locator('[data-stash="0"]').click();
    const selectedOne = await page.locator('#prepGo').innerText();
    await page.locator('[data-stash="2"]').click();
    assert.equal(await page.locator('#prepGo').innerText(), selectedOne, 'The UI accepted two instances of the same model');
    await page.locator('[data-stash="0"]').click();
  }
  for (const index of indices) await page.locator(`[data-stash="${index}"]`).click();
  await page.locator('#prepGo').click();
  if (await page.locator('#prepGo').count()) {
    const armed = await page.locator('#prepGo').evaluate(button => !!button._arm);
    if (armed) await page.locator('#prepGo').click();
  }
}

async function readState(page) {
  return page.evaluate(() => ({
    pair: window.__prepStorageAudit.capture(),
    audit: { mode: window.__prepStorageAudit.mode, injected: window.__prepStorageAudit.injected, events: window.__prepStorageAudit.events },
    live: { state: window.__neon.G.state, modal: window.__neon.G.modal, paused: window.__neon.G.paused,
      busy: window.__neon.G.busy, warehouse: window.__neon.meta.stash.cyber }
  }));
}

function parsePair(pair) {
  return { meta: pair.meta ? JSON.parse(pair.meta) : null, run: pair.run ? JSON.parse(pair.run) : null };
}

function readyRun(run) {
  return !!(run && run.v === 3 && run.G && run.p && run.G.prepReceipt?.ready === true);
}

function assertReadyWorld(run) {
  assert.equal(run.G.mode, 'normal');
  assert.equal(run.G.state, 'play');
  assert(run.G.map.length > 0 && run.G.map.every(row => row.length === run.G.map[0].length && row.length > 0));
  assert(run.G.rooms.length > 0 && run.G.stairs, 'Ready was saved before map generation completed');
  assert(Array.isArray(run.G.sites) && Array.isArray(run.G.vis) && Array.isArray(run.G.seen));
  assert(run.G.vis[run.p.y]?.[run.p.x], 'Ready was saved before initial FOV completed');
  assert.notEqual(run.G.map[run.p.y][run.p.x], 1);
  assert.equal(run.G.floorDamage, 0);
  assert.equal(run.G.depth, 1);
  assert.equal(run.G.turn, 0);
  assert(Array.isArray(run.G.prepReceipt.returned));
}

function assertWriteEvents(state) {
  for (const event of state.audit.events) {
    if (event.operation !== 'set') continue;
    if (event.injected || event.error) assert.equal(event.after, event.before, 'A failed write changed durable content');
    else assert.equal(event.after, event.attempted, 'A successful write differs from its requested content');
    if (event.key === RUN_KEY) {
      const next = JSON.parse(event.attempted), pending = parsePair(event.pairBefore).meta?.pendingPrepTransfer;
      if (pending) assert.equal(next.G.prepReceipt?.id, pending.id, 'An early RUN omitted the pending transfer identity');
      if (next.G.prepReceipt?.ready) assertReadyWorld(next);
    }
  }
}

function assertJournal(pair, fixture, selected) {
  const journal = parsePair(pair).meta?.pendingPrepTransfer;
  assert(journal && journal.id != null && String(journal.id).length > 0, 'The complete transfer journal is missing');
  assert.equal(journal.items.length, selected.length);
  journal.items.forEach((item, ordinal) => {
    assert.equal(item.ordinal, ordinal); assert.equal(item.originalIndex, selected[ordinal]);
    assert.deepEqual(item.entry, fixture.warehouse[selected[ordinal]], 'A journal entry lost instance or chip data');
  });
  return journal;
}

function assertOwnership(pair, fixture, accepted) {
  const { meta, run } = parsePair(pair);
  assert(meta && !meta.pendingPrepTransfer, 'Recovery left the transfer pending');
  const wantedWarehouse = fixture.warehouse.filter((entry, index) => !accepted.includes(index));
  assert.deepEqual(meta.stash.cyber, wantedWarehouse, 'Warehouse entries or their original order changed');
  assert.deepEqual(meta.stash.chips, fixture.loose, 'Unselected loose chips changed');
  if (accepted.length) {
    assert(readyRun(run), 'Accepted items have no complete running save');
    assertReadyWorld(run);
  } else assert(!run, 'An incomplete new run remains available after rollback');

  const implants = meta.stash.cyber.map(entry => ({ id: entry.id, inst: entry.inst }));
  const chips = meta.stash.chips.concat(meta.stash.cyber.flatMap(entry => entry.chips));
  if (readyRun(run)) {
    for (const id of run.G.modBag) {
      const inst = run.G.inst[id];
      if (inst?._r39StorageId) implants.push({ id, inst });
    }
    chips.push(...run.G.chips, ...Object.values(run.G.cyberChips).flat());
    for (const index of accepted) assert(run.G.modBag.includes(fixture.warehouse[index].id), 'An accepted implant is absent from the saved inventory');
  }
  const expectedImplants = fixture.warehouse.map(entry => ({ id: entry.id, inst: entry.inst }));
  const expectedChips = fixture.loose.concat(fixture.warehouse.flatMap(entry => entry.chips));
  const orderImplants = values => values.slice().sort((a, b) => a.inst._r39StorageId.localeCompare(b.inst._r39StorageId));
  const orderChips = values => values.filter(chip => chip?._r39StorageId).slice().sort((a, b) => a._r39StorageId.localeCompare(b._r39StorageId));
  assert.deepEqual(orderImplants(implants), orderImplants(expectedImplants), 'An implant instance was lost, duplicated or changed');
  assert.deepEqual(orderChips(chips), orderChips(expectedChips), 'A chip was lost, duplicated or changed');
}

async function reloadAt(page, pair) {
  await page.evaluate(pair => {
    // Abrupt termination has no orderly pagehide save. Stop that hook before replaying the captured cut point.
    window.__neon.G.state = 'menu'; window.__neon.G.saveDirty = false;
    window.__prepStorageAudit.arm(null); window.__prepStorageAudit.restore(pair);
  }, pair);
  await page.reload();
  await page.waitForFunction(() => !!window.__neon);
  return readState(page);
}

async function verifyRepeatedRecovery(page, fixture, accepted) {
  const states = [];
  for (let repeat = 0; repeat < 2; repeat++) {
    const current = await readState(page);
    const restored = await reloadAt(page, current.pair);
    assertOwnership(restored.pair, fixture, accepted);
    assertWriteEvents(restored); states.push(restored);
  }
  return states;
}

(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const results = [], checkpoints = {};
  try {
    browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
    const url = `http://127.0.0.1:${server.address().port}/index.html`;
    async function runCase(name, work) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const errors = [];
      let page, fixture;
      try {
        await context.addInitScript(installStorageAudit);
        page = await context.newPage(); page.setDefaultTimeout(8000);
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(url); fixture = await prepare(page);
        const detail = await work(page, fixture);
        assert.deepEqual(errors, [], 'Uncaught page errors');
        results.push({ name, passed: true, detail });
      } catch (error) {
        let state;
        if (page) { try { state = await readState(page); } catch {} }
        results.push({ name, passed: false, error: error.stack || error.message, fixture, state, errors });
      } finally {
        await context.close();
      }
    }

    for (const [name, selected, accepted] of [
      ['Normal transfer chooses the intended same-model instance', [2, 3], [2, 3]],
      ['Rejected import returns to its original warehouse position', [2, 5], [2]]
    ]) {
      await runCase(name, async (page, fixture) => {
        await page.evaluate(() => window.__prepStorageAudit.arm(null));
        await transfer(page, selected, accepted.length === 2);
        const state = await readState(page);
        assertWriteEvents(state); assertOwnership(state.pair, fixture, accepted);
        const journalEvent = state.audit.events.find(event => event.operation === 'set' && event.key === META_KEY && !event.injected && parsePair(event.pairAfter).meta?.pendingPrepTransfer);
        assert(journalEvent, 'Initial journal write was not observed');
        const journal = assertJournal(journalEvent.pairAfter, fixture, selected);
        const completeEvent = state.audit.events.find(event => event.operation === 'set' && event.key === RUN_KEY && !event.injected && readyRun(parsePair(event.pairAfter).run));
        assert(completeEvent, 'Complete RUN write was not observed');
        const receipt = parsePair(completeEvent.pairAfter).run.G.prepReceipt;
        assert.equal(receipt.id, journal.id);
        assert.deepEqual(receipt.returned, accepted.length === 2 ? [] : [1]);
        const key = accepted.length === 2 ? 'normal' : 'returned';
        checkpoints[key] = { fixture, journal: journalEvent.pairAfter, complete: completeEvent.pairAfter };
        return { fixture, state };
      });
    }

    await runCase('First META write failure preserves the warehouse and preparation screen', async (page, fixture) => {
      await page.evaluate(() => window.__prepStorageAudit.arm('first-meta'));
      await transfer(page, [2, 3]);
      const state = await readState(page);
      assert.equal(state.audit.injected, 1); assertWriteEvents(state);
      assertOwnership(state.pair, fixture, []);
      assert.equal(state.live.modal, 'prep');
      assert.deepEqual(state.live.warehouse, fixture.warehouse);
      const restarts = await verifyRepeatedRecovery(page, fixture, []);
      return { fixture, state, restarts };
    });

    await runCase('Complete RUN write failure restores every selected item', async (page, fixture) => {
      await page.evaluate(() => window.__prepStorageAudit.arm('complete-run'));
      await transfer(page, [2, 3]);
      const state = await readState(page);
      assert.equal(state.audit.injected, 1); assertWriteEvents(state);
      assertOwnership(state.pair, fixture, []);
      const restarts = await verifyRepeatedRecovery(page, fixture, []);
      return { fixture, state, restarts };
    });

    await runCase('RUN success and one failed META finalization recover after interruption', async (page, fixture) => {
      await page.evaluate(() => window.__prepStorageAudit.arm('final-meta'));
      await transfer(page, [2, 3]);
      const state = await readState(page);
      assert.equal(state.audit.injected, 1); assertWriteEvents(state);
      const failed = state.audit.events.find(event => event.injected);
      const journal = assertJournal(failed.pairBefore, fixture, [2, 3]);
      const { run } = parsePair(failed.pairBefore);
      assert(readyRun(run)); assert.equal(run.G.prepReceipt.id, journal.id);
      assert(parsePair(state.pair).meta.pendingPrepTransfer, 'Failed finalization lost its recovery journal');
      assert(state.live.state !== 'play' || state.live.paused || state.live.busy || state.live.modal, 'The unfinalized new run is already interactive');
      const restarted = await reloadAt(page, failed.pairBefore);
      assertOwnership(restarted.pair, fixture, [2, 3]); assertWriteEvents(restarted);
      const repeated = await verifyRepeatedRecovery(page, fixture, [2, 3]);
      return { fixture, state, restarted, repeated };
    });

    for (const recovery of [
      { name: 'Pending journal without a RUN rolls back in original order', checkpoint: 'normal', type: 'journal', accepted: [] },
      { name: 'Pending journal with ready-false RUN restores items and discards the incomplete run', checkpoint: 'normal', type: 'incomplete', accepted: [] },
      { name: 'Pending journal with ready receipt completes exactly once', checkpoint: 'normal', type: 'complete', accepted: [2, 3] },
      { name: 'Ready receipt returns only rejected entries exactly once', checkpoint: 'returned', type: 'complete', accepted: [2] }
    ]) {
      await runCase(recovery.name, async page => {
        const checkpoint = checkpoints[recovery.checkpoint];
        assert(checkpoint, 'A successful real-UI transfer checkpoint is required for this recovery case');
        let pair = { ...(recovery.type === 'journal' ? checkpoint.journal : checkpoint.complete) };
        if (recovery.type === 'incomplete') {
          const run = JSON.parse(checkpoint.complete.run);
          run.G.prepReceipt.ready = false; run.G.map = []; run.G.rooms = []; run.G.stairs = null;
          pair = { meta: checkpoint.journal.meta, run: JSON.stringify(run) };
        }
        const restarted = await reloadAt(page, pair);
        assertOwnership(restarted.pair, checkpoint.fixture, recovery.accepted); assertWriteEvents(restarted);
        const repeated = await verifyRepeatedRecovery(page, checkpoint.fixture, recovery.accepted);
        return { checkpoint: pair, fixture: checkpoint.fixture, restarted, repeated };
      });
    }

    await runCase('A temporarily unreadable RUN leaves the journal intact', async page => {
      const checkpoint = checkpoints.normal;
      assert(checkpoint, 'A complete real-UI checkpoint is required');
      await page.addInitScript(() => {
        const get = Storage.prototype.getItem;
        Storage.prototype.getItem = function (key) {
          if (this === localStorage && key === 'neon-depth-run' && sessionStorage.getItem('r39-run-read-failure') === 'armed') {
            throw new DOMException('Injected read failure', 'SecurityError');
          }
          return get.call(this, key);
        };
      });
      await page.evaluate(pair => {
        window.__neon.G.state = 'menu'; window.__neon.G.saveDirty = false;
        window.__prepStorageAudit.arm(null); window.__prepStorageAudit.restore(pair);
        sessionStorage.setItem('r39-run-read-failure', 'armed');
      }, checkpoint.complete);
      await page.reload();
      await page.waitForFunction(() => !!window.__neon);
      const blockedMeta = await page.evaluate(() => localStorage.getItem('neon-depth-meta'));
      assert.equal(blockedMeta, checkpoint.complete.meta, 'An unreadable RUN changed or discarded the journal');
      await page.evaluate(() => sessionStorage.removeItem('r39-run-read-failure'));
      await page.reload();
      await page.waitForFunction(() => !!window.__neon);
      const recovered = await readState(page);
      assertOwnership(recovered.pair, checkpoint.fixture, [2, 3]);
      assertWriteEvents(recovered);
      return { blockedMeta, recovered };
    });

    const report = { passed: results.every(result => result.passed), sourceHash, cases: results.length,
      scope: 'Real preparation buttons; one-shot setItem exceptions; captured durable cut points replayed with reload; exact instance/chip ownership and original-order recovery.', results };
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
    for (const result of results) console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.passed ? '' : '\n' + result.error}`);
    console.log(`Evidence ${output}`);
    assert(report.passed, 'Preparation storage transaction regression');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
