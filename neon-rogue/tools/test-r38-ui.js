const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'work', 'r38');
let origin = process.env.NEON_TEST_URL;
fs.mkdirSync(output, { recursive: true });

async function load(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('neon-depth-mute', '1');
    localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
  });
  await page.route('**/game.js', async route => {
    let source = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
    source = source.replace(/window\.NeonCompactUI\.mount\(abilitybar,\s*invbar\)/g,
      '(window.__r38Compact && window.NeonCompactUI.mount(abilitybar, invbar))');
    source = source.replace(/(abilitybar\.innerHTML = html\.replace\([^\n]+\n)/,
      '$1  if (window.__r38Compact && window.NeonCompactUI) window.NeonCompactUI.mount(abilitybar, invbar);\n');
    source = source.replace('window.__neon = {', 'window.__r38Inventory = invbar;\nwindow.__neon = {');
    await route.fulfill({ contentType: 'text/javascript; charset=utf-8', body: source });
  });
  await page.goto(origin);
  if (!await page.evaluate(() => !!window.NeonCompactUI)) await page.addScriptTag({ path: path.join(root, 'compact-ui.js') });
}

async function prepare(page) {
  return page.evaluate(() => {
    const N = window.__neon, G = N.G;
    window.__r38Compact = false;
    G.classId = 'assault';
    N.startGame();
    N.test.hideOverlay();
    Object.assign(G, { mode: 'train', state: 'play', modal: null, paused: false, busy: false, storyQueue: [], pendingBoard: null,
      enemies: [], items: [], sites: [], hazards: [], hackedFields: [], special: null, stairs: null, quests: [],
      skills: {}, cyber: {}, cyberChips: {}, cyberCd: {}, modBag: [], stance: null });
    N.p.level = 30;
    N.p.pending = 0;
    N.p.x = 10; N.p.y = 10;
    G.map.forEach(row => row.fill(0));
    G.inv = window.NEON.consumables.slice(0, 4).map(item => item.id);
    const stance = N.mods.find(mod => mod.slot === 'hand' && mod.active?.type === 'cleave' && !mod.relic);
    const slots = { eyeL: 'eye', eyeR: 'eye', handL: 'hand', handR: 'hand', body: 'body', spine: 'spine', legL: 'leg', legR: 'leg' };
    Object.keys(slots).forEach(slot => {
      const mod = slot === 'handL' ? stance : N.mods.find(candidate => candidate.slot === slots[slot] && candidate.active &&
        !candidate.relic && candidate.id !== stance.id && G.modBag.indexOf(candidate.id) < 0);
      G.cyber[slot] = mod.id; G.modBag.push(mod.id); N.test.v18.instOf(mod.id);
    });
    N.recalc(); N.updateHUD();
    const app = document.querySelector('#app'), inventory = window.__r38Inventory;
    app.classList.remove('compact-ui');
    document.querySelector('#consumablesToggle')?.remove();
    inventory.hidden = false;
    inventory.classList.remove('consumables-drawer');
    app.insertBefore(inventory, document.querySelector('#critbar'));
    return stance.id;
  });
}

function inspect() {
  const controls = [...document.querySelectorAll('.gearrow [data-cyberact]')].map(button => {
    const rect = button.getBoundingClientRect();
    return { id: button.dataset.cyberact, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  const labels = [...document.querySelectorAll('.clsrow2 .kbtn>b,.clsrow2 .kbtn>small,.gearrow .nm,.gearrow .cd')].map(element => {
    const range = document.createRange(); range.selectNodeContents(element);
    const rect = element.getBoundingClientRect(), content = range.getBoundingClientRect(), style = getComputedStyle(element);
    const padding = parseFloat(style.paddingLeft || 0) + parseFloat(style.paddingRight || 0);
    return { text: element.textContent, font: parseFloat(style.fontSize), lines: range.getClientRects().length,
      clipped: content.width > rect.width - padding + 1.5, whitespace: style.whiteSpace };
  });
  return { stage: document.querySelector('#stage').getBoundingClientRect().toJSON(), controls, labels,
    classHeights: [...document.querySelectorAll('.clsrow2 .kbtn')].map(button => button.getBoundingClientRect().height),
    inventoryVisible: !window.__r38Inventory.hidden, inventoryIdentity: document.querySelector('#invbar') === window.__r38Inventory,
    inventoryCount: document.querySelectorAll('#invbar').length,
    firstGear: document.querySelector('.gearrow')?.firstElementChild?.id,
    gameplay: { hp: window.__neon.p.hp, maxHp: window.__neon.p.maxHp, cyber: { ...window.__neon.G.cyber }, inv: [...window.__neon.G.inv] } };
}

async function controlChecks(browser) {
  const results = [];
  for (const [width, height] of [[360, 640], [390, 844], [560, 900], [844, 390]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await load(page);
    const stanceId = await prepare(page);
    await page.waitForTimeout(100);
    const before = await page.evaluate(inspect);
    await page.screenshot({ path: path.join(output, `compact-${width}-before.png`), animations: 'disabled' });
    await page.evaluate(() => { window.__r38Compact = true; window.__neon.updateHUD(); });
    await page.waitForTimeout(120);
    const after = await page.evaluate(inspect);
    assert.deepEqual(after.gameplay, before.gameplay);
    assert(after.inventoryIdentity && after.inventoryCount === 1);
    assert.equal(after.inventoryVisible, false);
    assert.equal(after.firstGear, 'consumablesToggle');
    assert(after.classHeights.every(value => value >= 40 && value <= 44));
    assert(after.controls.every(control => control.height >= 26 && control.height <= 32));
    assert(after.labels.every(label => label.whitespace === 'nowrap' && !label.clipped), `${width} single-line text clipping`);
    assert(after.stage.height >= before.stage.height, `${width} map space decreased`);
    if (height > width) assert(after.stage.height - before.stage.height >= 35, `${width} map space was not reclaimed`);
    await page.screenshot({ path: path.join(output, `compact-${width}-after.png`), animations: 'disabled' });
    await page.locator('#consumablesToggle').click();
    const slots = await page.locator('#invbar .slot').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()));
    assert.equal(slots.length, 4);
    assert(slots.every(slot => Math.abs(slot.y - slots[0].y) < .5));
    await page.locator('#invbar .slot[data-i="0"]').click();
    assert(await page.locator('#overlay.show').count(), 'Original consumable click listener survives moving the node');
    await page.evaluate(() => { window.__neon.test.hideOverlay(); window.__neon.G.modal = null; window.__neon.G.paused = false; window.__neon.updateHUD(); });
    await page.locator('#consumablesToggle').click();
    await page.waitForTimeout(60);
    const ready = await page.evaluate(inspect);
    await page.locator('[data-cyberact="' + stanceId + '"]').click();
    await page.waitForTimeout(60);
    const charged = await page.evaluate(inspect);
    assert.deepEqual(charged.controls, ready.controls, `${width} stance label moved controls`);
    assert(charged.labels.every(label => !label.clipped));
    await page.locator('[data-cyberact="' + stanceId + '"]').click();
    await page.waitForTimeout(60);
    const cooldown = await page.evaluate(inspect);
    assert.deepEqual(cooldown.controls, ready.controls, `${width} cooldown moved controls`);
    assert(cooldown.labels.every(label => !label.clipped));
    await page.evaluate(() => { window.__neon.G.classId = 'ghost'; window.__neon.G.instab = 80; window.__neon.G.skills = { act_shot: 1 }; window.__neon.recalc(); window.__neon.updateHUD(); });
    await page.waitForTimeout(100);
    const ghost = await page.evaluate(inspect);
    assert.equal(ghost.classHeights.length, 5);
    assert(ghost.classHeights.every(value => value === 44));
    assert(ghost.labels.every(label => label.whitespace === 'nowrap' && !label.clipped));
    await page.screenshot({ path: path.join(output, `compact-${width}-ghost-five.png`), animations: 'disabled' });
    assert.equal(errors.length, 0);
    results.push({ width, height, mapGain: after.stage.height - before.stage.height, before, after, ready, charged, cooldown, ghost, errors });
    await page.close();
  }
  return results;
}

async function hardwareChecks(browser) {
  const page = await browser.newPage({ viewport: { width: 560, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await load(page);
  const result = await page.evaluate(() => {
    const N = window.__neon;
    const stats = ['atk', 'hp', 'def', 'crit', 'critMult', 'dodge', 'compat', 'power', 'skill'];
    const samples = stats.map(stat => N.makeChip(stat === 'critMult' ? 'critdmg' : stat, 'blue'));
    const mechanical = N.makeChip('atk', 'blue'); mechanical.mech = true;
    const heavy = N.makeChip('atk', 'blue'); heavy.heavy = 2;
    const combined = N.makeChip('atk', 'blue'); combined.heavy = 2; combined.mech = true;
    samples.push(mechanical, heavy, combined);
    const gallery = document.createElement('div');
    gallery.id = 'r38-gallery';
    gallery.style.cssText = 'position:fixed;inset:0;background:#07101a;padding:20px;overflow:auto;z-index:9999;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-content:start';
    gallery.innerHTML = samples.map(chip => '<div style="height:145px">' + N.presentation.chipIco(chip, '') + '</div>').join('') +
      '<div class="srow chiprow">' + N.presentation.chipIco(samples[2], '') + '</div>' +
      '<div class="sockets"><div class="sock">' + N.presentation.chipIco(samples[4], '') + '</div></div>' +
      '<div class="mchip">' + N.presentation.chipIco(samples[3], '') + '</div>';
    document.body.append(gallery);
    gallery.querySelectorAll(':scope>div>.chipico').forEach(chip => { chip.style.width = '100%'; chip.style.height = '145px'; });
    window.NeonPresentation.mount(gallery);
    return { count: samples.length };
  });
  await page.waitForTimeout(200);
  const pixels = await page.locator('#r38-gallery>div>.chipico canvas').evaluateAll(canvases => canvases.slice(0, 12).map(canvas => canvas.toDataURL()));
  const hashes = pixels.map(data => crypto.createHash('sha256').update(data).digest('hex'));
  assert.equal(new Set(hashes).size, 12, 'Stat, mech and heavy hardware models are distinct');
  const centers = await page.locator('#r38-gallery .chipico>b').evaluateAll(elements => elements.map(element => {
    const label = element.getBoundingClientRect(), chip = element.parentElement.getBoundingClientRect();
    return { x: (label.left + label.right - chip.left - chip.right) / 2, y: (label.top + label.bottom - chip.top - chip.bottom) / 2 };
  }));
  assert(centers.every(center => Math.abs(center.x) < 1 && Math.abs(center.y) < 1));
  assert.equal(await page.locator('#r38-gallery .mechb:visible').count(), 0);
  await page.screenshot({ path: path.join(output, 'hardware-models.png'), animations: 'disabled' });
  const before = await page.evaluate(() => window.NeonPresentation.snapshot());
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.NeonPresentation.snapshot());
  assert.equal(after.artworkDraws, before.artworkDraws, 'Decorative animation does not redraw canvases every frame');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await page.locator('#r38-gallery .chip-hardware.is-visible').evaluateAll(elements => elements.every(element => getComputedStyle(element, '::after').animationName === 'none'));
  assert(reduced);
  assert.equal(errors.length, 0);
  await page.close();
  return { ...result, hashes, centers, before, after, reduced, errors };
}

async function lifecycleChecks(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await load(page);
  const result = await page.evaluate(async () => {
    const N = window.__neon;
    const chip = N.makeChip('def', 'blue');
    const markup = Array.from({ length: 250 }, () => N.presentation.chipIco(chip, '')).join('');
    const host = document.createElement('div');
    host.id = 'r38-lifecycle';
    host.style.cssText = 'position:fixed;inset:0;overflow:auto;z-index:9999;background:#07101a;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:80px;gap:6px;padding:8px;align-content:start';
    document.body.append(host);
    const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const cycles = [];
    for (let i = 0; i < 30; i++) {
      const initial = NeonPresentation.snapshot().artworkDraws;
      host.innerHTML = markup;
      NeonPresentation.mount(host);
      const deadline = performance.now() + 1500;
      do { await frame(); } while (!host.querySelector('[data-hardware-drawn]') && performance.now() < deadline);
      const shown = NeonPresentation.snapshot();
      const allocated = host.querySelectorAll('[data-hardware-drawn]').length;
      host.innerHTML = '';
      NeonPresentation.mount(host);
      await frame();
      cycles.push({ shown, allocated, drawn: shown.artworkDraws - initial, cleared: NeonPresentation.snapshot(), fit: NeonCompactUI.snapshot() });
    }
    host.innerHTML = markup;
    NeonPresentation.mount(host);
    await frame();
    async function frameTiming(paused) {
      document.documentElement.classList.toggle('hardware-paused', paused);
      const deltas = [];
      await new Promise(resolve => {
        let start, previous;
        function tick(time) {
          if (start == null) start = time;
          if (previous != null) deltas.push(time - previous);
          previous = time;
          if (time - start >= 1200) resolve();
          else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
      const sorted = deltas.slice().sort((a, b) => a - b);
      return { frames: deltas.length, averageMs: deltas.reduce((total, value) => total + value, 0) / deltas.length, p95Ms: sorted[Math.floor(sorted.length * .95)] };
    }
    const paused = await frameTiming(true);
    const animated = await frameTiming(false);
    host.remove();
    NeonPresentation.mount(document.querySelector('#overlay'));
    await frame();
    return { cycles, paused, animated, after: NeonPresentation.snapshot(), fitAfter: NeonCompactUI.snapshot() };
  });
  fs.writeFileSync(path.join(output, 'ui-lifecycle-report.json'), JSON.stringify({ ...result, errors }, null, 2));
  for (const [index, cycle] of result.cycles.entries()) {
    assert(cycle.allocated > 0 && cycle.allocated < 250, 'Visible inventory contexts at cycle ' + index + ': ' + cycle.allocated);
    assert.equal(cycle.shown.observed, 250);
    assert.equal(cycle.cleared.observed, 0);
    assert.equal(cycle.cleared.visible, 0);
    assert(cycle.fit.observedRoots <= 2, 'Fitting observers remain bounded');
  }
  assert(result.fitAfter.observedRoots <= 1, 'Removed fitting root is released');
  assert.equal(errors.length, 0);
  await page.close();
  return { ...result, errors };
}

(async () => {
  let server;
  if (!origin) {
    const servingRoot = path.dirname(root);
    server = http.createServer((request, response) => {
      const file = path.resolve(servingRoot, '.' + decodeURIComponent(request.url.split('?')[0]));
      if (!file.startsWith(servingRoot + path.sep)) { response.writeHead(403).end(); return; }
      fs.readFile(file, (error, data) => {
        if (error) { response.writeHead(404).end(); return; }
        const type = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }[path.extname(file)] || 'application/octet-stream';
        response.writeHead(200, { 'Content-Type': type + '; charset=utf-8' }).end(data);
      });
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    origin = 'http://127.0.0.1:' + server.address().port + '/neon-rogue/index.html';
  }
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    if (process.argv.includes('--lifecycle')) {
      const lifecycle = await lifecycleChecks(browser);
      console.log(JSON.stringify({ cycles: lifecycle.cycles.length, paused: lifecycle.paused, animated: lifecycle.animated }, null, 2));
      return;
    }
    const controls = await controlChecks(browser);
    const hardware = await hardwareChecks(browser);
    const lifecycle = await lifecycleChecks(browser);
    fs.writeFileSync(path.join(output, 'ui-report.json'), JSON.stringify({ controls, hardware, lifecycle }, null, 2));
    console.log(JSON.stringify({ controls: controls.map(result => ({ width: result.width, height: result.height, mapGain: result.mapGain })), hardwareModels: hardware.count,
      lifecycleCycles: lifecycle.cycles.length, frameTiming: { paused: lifecycle.paused, animated: lifecycle.animated }, errors: [] }, null, 2));
  } finally { await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
