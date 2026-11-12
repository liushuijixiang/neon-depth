const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const sourceArtifact = path.join(root, 'dist.debug.html');
const output = path.join(root, 'work', 'r38', 'client');
fs.mkdirSync(output, { recursive: true });
const sourceBytes = fs.readFileSync(sourceArtifact);
const artifact = path.join(output, 'dist.debug.snapshot.html');
fs.writeFileSync(artifact, sourceBytes);
const artifactHash = () => crypto.createHash('sha256').update(fs.readFileSync(sourceArtifact)).digest('hex');
const initialHash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
const checks = [];
const only = process.argv.find(argument => argument.startsWith('--only='))?.slice(7);

async function prepare(page, classId = 'assault', gear = true) {
  return page.evaluate(({ classId, gear }) => {
    const N = window.__neon, G = N.G;
    G.classId = classId;
    N.startGame();
    N.test.hideOverlay();
    Object.assign(G, { mode: 'normal', state: 'play', modal: null, paused: false, busy: false, storyQueue: [], pendingBoard: null,
      enemies: [], items: [], sites: [], hazards: [], hackedFields: [], special: null, stairs: null, quests: [],
      skills: {}, cyber: {}, cyberChips: {}, cyberCd: {}, modBag: [], stance: null, inst: {}, adaptBonus: 0 });
    N.p.level = 30; N.p.pending = 0; N.p.x = 10; N.p.y = 10;
    G.map.forEach(row => row.fill(0));
    G.inv = ['nanite_patch', 'aegis_field', 'coolant', 'emp'];
    const stance = N.mods.find(mod => mod.slot === 'hand' && mod.active?.type === 'cleave' && !mod.relic);
    if (gear) {
      const slots = { eyeL: 'eye', eyeR: 'eye', handL: 'hand', handR: 'hand', body: 'body', spine: 'spine', legL: 'leg', legR: 'leg' };
      Object.keys(slots).forEach(slot => {
        const mod = slot === 'handL' ? stance : N.mods.find(candidate => candidate.slot === slots[slot] && candidate.active &&
          !candidate.relic && candidate.id !== stance.id && G.modBag.indexOf(candidate.id) < 0);
        G.cyber[slot] = mod.id; G.modBag.push(mod.id); N.test.v18.instOf(mod.id);
      });
    }
    if (classId === 'ghost') { G.instab = 80; G.skills.act_shot = 1; }
    N.recalc(); N.p.hp = N.p.maxHp; N.updateHUD();
    window.__originalInventory = document.querySelector('#invbar');
    return stance.id;
  }, { classId, gear });
}

function layout() {
  const elements = selector => [...document.querySelectorAll(selector)];
  const labels = elements('.clsrow2 .kbtn>b,.clsrow2 .kbtn>small,.gearrow .nm,.gearrow .cd').map(element => {
    const rect = element.getBoundingClientRect(), range = document.createRange(), style = getComputedStyle(element);
    range.selectNodeContents(element);
    const text = range.getBoundingClientRect(), padding = parseFloat(style.paddingLeft || 0) + parseFloat(style.paddingRight || 0);
    return { text: element.textContent, title: element.title, width: rect.width, font: parseFloat(style.fontSize),
      overflow: text.width > rect.width - padding + 1.5, whitespace: style.whiteSpace };
  });
  return {
    stage: document.querySelector('#stage').getBoundingClientRect().toJSON(),
    personal: elements('.clsrow2 .kbtn').map(element => ({ text: element.querySelector('b').textContent, sub: element.querySelector('small').textContent,
      title: element.title, rect: element.getBoundingClientRect().toJSON() })),
    gear: elements('.gearrow [data-cyberact]').map(element => ({ id: element.dataset.cyberact, rect: element.getBoundingClientRect().toJSON() })),
    labels, toggleFirst: document.querySelector('.gearrow').firstElementChild.id === 'consumablesToggle',
    inventorySame: document.querySelector('#invbar') === window.__originalInventory,
    inventoryIds: document.querySelectorAll('#invbar').length, inventoryButtons: document.querySelectorAll('#invbar .slot').length
  };
}

function glyphPositions() {
  return [...document.querySelectorAll('.chipico>b')].map(element => {
    const glyph = element.getBoundingClientRect(), parent = element.parentElement.getBoundingClientRect();
    return { text: element.textContent, x: (glyph.left + glyph.right - parent.left - parent.right) / 2,
      y: (glyph.top + glyph.bottom - parent.top - parent.bottom) / 2 };
  });
}

async function socketFixture(page) {
  return page.evaluate(() => {
    const N = __neon, G = N.G;
    const mod = N.mods.find(mod => mod.slot === 'eye' && mod.quality === 'orange' && !mod.relic);
    G.cyber = { eyeL: mod.id }; G.modBag = [mod.id];
    const instance = N.test.v18.instOf(mod.id); instance.plus = 0; instance.heavy = 0; instance.dur = instance.maxDur;
    G.cyberChips = { eyeL: [N.makeChip('atk', 'gray'), N.makeChip('crit', 'green'), N.makeChip('def', 'blue'), N.makeChip('power', 'purple')] };
    G.cyberChips.eyeL.forEach(chip => { chip.affixes = []; });
    const safe = N.makeChip('def', 'gray'); safe.affixes = []; safe.mech = true;
    const unsafe = N.makeChip('def', 'red'); unsafe.affixes = []; unsafe.heavy = 2;
    G.chips = [safe, unsafe];
    N.recalc();
    G.adaptBonus += N.cyberLoad() - N.adaptationCap();
    N.recalc();
    window.__safeChip = safe; window.__unsafeChip = unsafe; window.__originalChip = G.cyberChips.eyeL[0];
    const safePlan = N.equipment.preview({ kind: 'chip', slot: 'eyeL', chip: safe, replaceIndex: 0 });
    const unsafePlan = N.equipment.preview({ kind: 'chip', slot: 'eyeL', chip: unsafe, replaceIndex: 0 });
    return { id: mod.id, safe: safePlan.allowed, unsafe: unsafePlan.allowed, load: N.cyberLoad(), cap: N.adaptationCap() };
  });
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  async function run(name, viewport, test) {
    if (only && !name.startsWith(only)) return;
    const page = await browser.newPage({ viewport, hasTouch: true });
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.addInitScript(() => {
        localStorage.clear(); localStorage.setItem('neon-depth-mute', '1');
        localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
      });
      await page.goto(pathToFileURL(artifact).href);
      const result = await test(page);
      assert.equal(errors.length, 0, 'Runtime errors');
      checks.push({ name, passed: true, result, errors });
      await page.screenshot({ path: path.join(output, name + '.png'), animations: 'disabled' });
    } catch (error) {
      checks.push({ name, passed: false, error: error.stack, errors });
      await page.screenshot({ path: path.join(output, name + '-failed.png') }).catch(() => {});
    } finally { await page.close(); }
  }
  try {
    for (const [width, height] of [[360, 640], [390, 844], [560, 900], [844, 390]]) {
      await run('controls-' + width, { width, height }, async page => {
        const classes = [];
        for (const classId of ['assault', 'engineer', 'ghost']) {
          const stanceId = await prepare(page, classId);
          await page.waitForTimeout(100);
          const ready = await page.evaluate(layout);
          assert(ready.toggleFirst && ready.inventorySame && ready.inventoryIds === 1 && ready.inventoryButtons === 4);
          assert(ready.stage.height >= 150);
          assert(ready.personal.every(button => button.rect.height >= 40 && button.rect.height <= 44));
          assert(ready.gear.every(button => button.rect.height >= 26 && button.rect.height <= 32));
          assert(ready.labels.every(label => !label.overflow && label.whitespace === 'nowrap'));
          if (classId === 'ghost') {
            assert.equal(ready.personal.length, 5);
            const subtitles = await page.locator('[data-ghost] small').allTextContents();
            assert(subtitles.every(text => /^临界 \+\d+$/.test(text)), 'Ghost common cost subtitle');
          }
          if (classId !== 'ghost') {
            await page.locator('[data-cyberact="' + stanceId + '"]').click();
            await page.waitForTimeout(80);
            const charged = await page.evaluate(layout);
            assert.deepEqual(charged.gear, ready.gear, 'Stance keeps control positions');
            await page.locator('[data-cyberact="' + stanceId + '"]').click();
            await page.waitForTimeout(80);
            const cooldown = await page.evaluate(layout);
            assert.deepEqual(cooldown.gear, ready.gear, 'Cooldown keeps control positions');
          }
          classes.push({ classId, ready });
        }
        return classes;
      });
    }
    await run('consumables-repeat', { width: 390, height: 844 }, async page => {
      await prepare(page);
      await page.evaluate(() => { __neon.p.hp = Math.round(__neon.p.maxHp / 2); __neon.updateHUD(); });
      const initial = await page.evaluate(() => ({ inventory: [...__neon.G.inv], hp: __neon.p.hp }));
      await page.locator('#consumablesToggle').click();
      await page.locator('#invbar [data-i="0"]').click();
      await page.locator('#useItem').click();
      await page.waitForTimeout(100);
      await page.evaluate(() => { for (let i = 0; i < 25; i++) __neon.updateHUD(); });
      const after = await page.evaluate(layout);
      const state = await page.evaluate(() => ({ inventory: [...__neon.G.inv], hp: __neon.p.hp, open: !document.querySelector('#invbar').hidden }));
      assert.equal(state.inventory.length, initial.inventory.length - 1);
      assert(state.hp > initial.hp);
      assert(after.inventorySame && after.inventoryIds === 1 && after.inventoryButtons === 4);
      if (!state.open) await page.locator('#consumablesToggle').click();
      await page.locator('#invbar [data-i="0"]').click();
      assert(await page.locator('#useItem').count(), 'Remaining item listener after repeated HUD updates');
      await page.locator('#cancelItem').click();
      return { initial, after, state };
    });
    for (const width of [360, 390]) {
      await run('socket-replacement-' + width, { width, height: width === 360 ? 640 : 844 }, async page => {
        await prepare(page, 'assault', false);
        const fixture = await socketFixture(page);
        assert(fixture.safe && !fixture.unsafe);
        await page.locator('#cyberbtn').click();
        const colors = await page.locator('[data-slot="eyeL"] .bp>span').evaluateAll(elements => elements.map(element => getComputedStyle(element).color));
        assert.deepEqual(colors, ['rgb(154, 167, 176)', 'rgb(87, 255, 168)', 'rgb(34, 230, 255)', 'rgb(176, 107, 255)']);
        await page.locator('[data-slot="eyeL"]').click();
        await page.locator('[data-peek-chip="0"]').click();
        assert(await page.locator('.chip-installed-detail .chipcard .cmain').count());
        assert(await page.locator('.chip-replacement-list .fbar').count());
        await page.screenshot({ path: path.join(output, 'installed-chip-peek-' + width + '.png'), animations: 'disabled' });
        await page.locator('[data-fs="sock|def"]').click();
        await page.locator('[data-chip-sort="sock|value"]').click();
        assert(await page.locator('[data-replace-chip="1"]').isDisabled(), 'Overload candidate is disabled');
        assert(await page.locator('[data-replace-chip="0"]').isEnabled(), 'Safe candidate is enabled');
        await page.locator('[data-replace-chip="0"]').click();
        const swapped = await page.evaluate(() => ({ same: __neon.G.cyberChips.eyeL[0] === window.__safeChip,
          oldReturned: __neon.G.chips.includes(window.__originalChip), total: __neon.G.chips.length + __neon.G.cyberChips.eyeL.length,
          load: __neon.cyberLoad(), cap: __neon.adaptationCap(), shown: document.querySelector('.chipcard .cmain').textContent }));
        assert(swapped.same && swapped.oldReturned && swapped.load <= swapped.cap);
        assert.equal(swapped.total, 6);
        await page.locator('#socketBack').click();
        assert.equal(await page.locator('[data-peek-chip]').count(), 4);
        await page.locator('[data-peek-chip="0"]').click();
        await page.locator('#socketRemove').click();
        assert.equal(await page.locator('[data-peek-chip]').count(), 3);
        await page.evaluate(() => __neon.test.v18.openBag('chips'));
        const centers = await page.evaluate(glyphPositions);
        assert(centers.every(center => Math.abs(center.x) < 1 && Math.abs(center.y) < 1));
        assert.equal(await page.locator('.mechb,.mechtag').count(), 0);
        const removed = await page.evaluate(() => ({ inBag: __neon.G.chips.includes(window.__safeChip),
          absentFromImplant: !__neon.G.cyberChips.eyeL.includes(window.__safeChip), total: __neon.G.chips.length + __neon.G.cyberChips.eyeL.length,
          banners: [...document.querySelectorAll('.chipico')].map(element => element.textContent).filter(text => /机改|MECHANICAL/i.test(text)) }));
        assert(removed.inBag && removed.absentFromImplant && removed.total === 6 && removed.banners.length === 0);
        return { fixture, colors, swapped, removed, centers };
      });
    }
    for (const width of [360, 390]) {
      await run('warehouse-sticky-' + width, { width, height: width === 360 ? 640 : 844 }, async page => {
        await prepare(page, 'assault', false);
        await page.evaluate(() => {
          const N = __neon;
          N.meta.stash.chips = Array.from({ length: 36 }, (_, index) => N.makeChip(index % 2 ? 'hp' : 'def', ['gray', 'green', 'blue', 'purple', 'orange', 'red'][index % 6]));
          N.meta.stash.cyber = N.mods.filter(mod => !mod.relic).slice(0, 20).map(mod => ({ id: mod.id, chips: [], inst: JSON.parse(JSON.stringify(N.test.v18.instOf(mod.id))) }));
          N.test.ui.menuScreen('cyber');
        });
        await page.locator('[data-mnact="market:stash"]').click();
        const results = [];
        for (const tab of ['cyber', 'chips']) {
          await page.locator('[data-stab="' + tab + '"]').click();
          await page.waitForTimeout(80);
          const before = await page.evaluate(() => {
            const tools = document.querySelector('.warehouse-tools'), list = document.querySelector('.scy-grid,.chip-grid');
            return { toolsBeforeList: !!(tools.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING), tools: tools.getBoundingClientRect().toJSON() };
          });
          assert(before.toolsBeforeList);
          await page.evaluate(() => { const card = document.querySelector('.card'); card.scrollTop = card.scrollHeight; });
          await page.waitForTimeout(80);
          const after = await page.evaluate(() => {
            const tools = document.querySelector('.warehouse-tools'), bulk = tools.querySelector('[data-bsell]');
            const rect = bulk.getBoundingClientRect();
            const switches = [...tools.querySelectorAll('[data-stab]')].map(button => {
              const bound = button.getBoundingClientRect(); return { text: button.textContent, hit: button.contains(document.elementFromPoint(bound.x + bound.width / 2, bound.y + bound.height / 2)) };
            });
            const mainTabs = [...document.querySelectorAll('[data-mtab]')].map(button => {
              const bound = button.getBoundingClientRect(); return { text: button.textContent, hit: button.contains(document.elementFromPoint(bound.x + bound.width / 2, bound.y + bound.height / 2)) };
            });
            return { tools: tools.getBoundingClientRect().toJSON(), card: document.querySelector('.card').getBoundingClientRect().toJSON(),
              bulkVisible: rect.top >= 0 && rect.bottom <= innerHeight, bulkHit: bulk.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)), switches, mainTabs };
          });
          assert(after.bulkVisible && after.bulkHit && after.switches.every(button => button.hit));
          assert(after.mainTabs.every(button => button.hit), 'Warehouse tools cover primary market navigation');
          results.push({ tab, before, after });
        }
        return results;
      });
    }
  } finally { await browser.close(); }
  const previousFile = path.join(output, 'report.json');
  const previous = only && fs.existsSync(previousFile) ? JSON.parse(fs.readFileSync(previousFile, 'utf8')) : null;
  const combined = previous?.sha256 === initialHash ? previous.checks.filter(check => !checks.some(current => current.name === check.name)).concat(checks) : checks;
  const report = { artifact, sourceArtifact, sha256: initialHash, sourceStable: initialHash === artifactHash(), checks: combined };
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ sha256: initialHash, sourceStable: report.sourceStable, checks: checks.map(check => ({ name: check.name, passed: check.passed, error: check.error?.split('\n').slice(0, 3).join(' ') })) }, null, 2));
  assert(combined.every(check => check.passed), 'Client checks failed');
})().catch(error => { console.error(error); process.exitCode = 1; });
