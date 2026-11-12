// Layout regression and paired visual captures. Run with node tools/test-polish-layout.js.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'work', 'layout');
const baselineOnly = process.argv.includes('--baseline');
const abilitiesOnly = process.argv.includes('--abilities');
const sizes = [[360, 640], [390, 844], [768, 1024], [1440, 900], [844, 390]];

function inspectLayout() {
  const visible = element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const card = document.querySelector('#overlay.show .card');
  const scope = card || document.querySelector('#app');
  const viewport = { width: innerWidth, height: innerHeight };
  const overflow = [...scope.querySelectorAll('button, .tabs, .stx, .m3-list, .clsrow2, .gearrow, .kbtn small, .kbtn b, .abtn .nm, .m3-list small, .m3-list b, .chalnode em')]
    .filter(visible)
    .filter(element => {
      const style = getComputedStyle(element);
      return !['auto', 'scroll'].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 2;
    })
    .map(element => ({ selector: element.id || element.className, text: element.textContent.slice(0, 70), width: element.clientWidth, scroll: element.scrollWidth }));
  const stage = document.querySelector('#stage').getBoundingClientRect();
  const app = document.querySelector('#app').getBoundingClientRect();
  const row = document.querySelector('.clsrow2');
  const primaryRow = row && visible(row) ? [...row.children].filter(visible).map(element => element.getBoundingClientRect().top) : [];
  const primaryWidths = row && visible(row) ? [...row.children].filter(visible).map(element => element.getBoundingClientRect().width) : [];
  const sockets = [...scope.querySelectorAll('.sockets')].map(container => [...container.children].map(element => element.getBoundingClientRect().top));
  const chipGlyphsCentered = [...scope.querySelectorAll('.chipico > b')].every(element => {
    const style = getComputedStyle(element);
    return style.display === 'flex' && style.alignItems === 'center' && style.justifyContent === 'center';
  });
  const menu = document.querySelector('#menuBtn').getBoundingClientRect();
  const mute = document.querySelector('#mute').getBoundingClientRect();
  return {
    viewport,
    overflow,
    rootOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    appBounds: { left: app.left, top: app.top, right: app.right, bottom: app.bottom },
    stageHeight: stage.height,
    primaryRow,
    primaryWidths,
    sockets,
    chipGlyphsCentered,
    menuVisible: menu.left >= 0 && mute.right <= innerWidth,
    text: scope.textContent
  };
}

async function scene(page, name) {
  await page.evaluate(name => {
    const N = window.__neon;
    const G = N.G;
    N.test.hideOverlay();
    if (name === 'menu' || name === 'ember') return N.test.ui.menuScreen(name === 'menu' ? 'depart' : 'ember');
    if (name === 'mode') return N.test.v36.startFlow(1);
    if (name === 'prep') return N.test.v36.prepScreen({ flow: true });
    if (name === 'market') return N.test.ui.marketScreen('cyber');
    if (name === 'meta') return N.test.ui.showMeta();
    if (name === 'challenge') return N.test.ui.challengeScreen();
    G.classId = name.startsWith('ghost') ? 'ghost' : name === 'engineer' ? 'engineer' : 'assault';
    N.startGame();
    N.test.hideOverlay();
    G.modal = null;
    G.paused = false;
    G.storyQueue = [];
    if (name === 'ghost-five') {
      G.instab = 80;
      G.skills.act_shot = 1;
      N.recalc();
    }
    G.pendingBoard = null;
    N.p.pending = 0;
    G.storyQueue = [];
    if (name === 'loaded') {
      G.credits = 123456;
      G.instab = 58;
      N.mods.filter(mod => mod.active && !mod.relic).slice(0, 8).forEach((mod, index) => {
        G.cyber[['eyeL', 'eyeR', 'handL', 'handR', 'body', 'spine', 'legL', 'legR'][index]] = mod.id;
      });
      window.NEON.skills.filter(skill => skill.ability).forEach(skill => { G.skills[skill.id] = 1; });
      N.recalc();
    }
    N.updateHUD();
    if (name === 'cyber') N.openCyber();
    if (name === 'gun') N.test.ui.openGun();
    if (name === 'sockets') {
      const mod = N.mods.find(mod => mod.quality === 'orange' && mod.slot === 'eye');
      if (!mod) throw new Error('Orange eye fixture unavailable');
      G.cyber.eyeL = mod.id;
      G.modBag.push(mod.id);
      N.test.v18.instOf(mod.id);
      G.cyberChips.eyeL = ['crit', 'atk', 'maxHp'].map(stat => N.makeChip(stat, 'blue'));
      N.recalc();
      N.openCyber();
      G.cyberItem = mod.id;
      N.test.ui.renderCyber();
    }
    if (name === 'chip-detail') {
      G.chips = [N.makeChip('atk', 'blue')];
      G.cyber = {};
      N.test.v18.openBag('chips');
      document.querySelector('[data-owned-chip], [data-bchipd]').click();
    }
  }, name);
  await page.waitForTimeout(250);
}

async function abilityTransitions(browser) {
  const report = [];
  const errors = [];
  for (const [width, height] of [[360, 640], [390, 844], [560, 900]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('neon-depth-mute', '1');
      localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
    });
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    const stanceId = await page.evaluate(() => {
      const N = window.__neon, G = N.G;
      G.classId = 'assault';
      N.startGame();
      N.test.hideOverlay();
      Object.assign(G, { mode: 'train', modal: null, paused: false, busy: false, storyQueue: [], pendingBoard: null,
        enemies: [], items: [], sites: [], hazards: [], hackedFields: [], special: null, stairs: null, quests: [],
        skills: {}, cyber: {}, cyberChips: {}, cyberCd: {}, modBag: [], stance: null });
      N.p.level = 30;
      N.p.pending = 0;
      N.p.x = 10;
      N.p.y = 10;
      G.map.forEach(row => row.fill(0));
      const stance = N.mods.find(mod => mod.slot === 'hand' && mod.active && mod.active.type === 'cleave' && !mod.relic);
      if (!stance) throw new Error('Cleave stance fixture unavailable');
      const slots = { eyeL: 'eye', eyeR: 'eye', handL: 'hand', handR: 'hand', body: 'body', spine: 'spine', legL: 'leg', legR: 'leg' };
      Object.keys(slots).forEach(slot => {
        const mod = slot === 'handL' ? stance : N.mods.find(candidate => candidate.slot === slots[slot] && candidate.active &&
          !candidate.relic && candidate.id !== stance.id && G.modBag.indexOf(candidate.id) < 0);
        if (!mod) throw new Error('Active implant fixture unavailable for ' + slot);
        G.cyber[slot] = mod.id;
        G.modBag.push(mod.id);
        N.test.v18.instOf(mod.id);
      });
      N.recalc();
      N.updateHUD();
      return stance.id;
    });
    async function snapshot(state) {
      await page.waitForTimeout(60);
      const result = await page.evaluate(() => {
        const row = document.querySelector('.gearrow');
        const buttons = [...row.querySelectorAll('[data-cyberact]')].map(button => {
          const name = button.querySelector('.nm'), status = button.querySelector('.cd');
          const rect = button.getBoundingClientRect(), label = name.getBoundingClientRect();
          const statusRect = status && status.getBoundingClientRect();
          return { id: button.dataset.cyberact, x: rect.x, y: rect.y, width: rect.width, height: rect.height,
            name: name.textContent, status: status && status.textContent,
            overflow: label.left < rect.left || label.right > rect.right || label.top < rect.top || label.bottom > rect.bottom ||
              !!(statusRect && label.bottom > statusRect.top + .5) };
        });
        return { buttons, rowHeight: row.getBoundingClientRect().height, stageHeight: document.querySelector('#stage').getBoundingClientRect().height,
          stance: window.__neon.G.stance && window.__neon.G.stance.id, cooldowns: { ...window.__neon.G.cyberCd } };
      });
      assert.equal(result.buttons.length, 8, 'Eight original implant controls');
      assert(result.buttons.every(button => !button.overflow), `${width} ${state} label overflow`);
      await page.screenshot({ path: path.join(output, `abilities-${width}-${state}.png`), animations: 'disabled' });
      return result;
    }
    const ready = await snapshot('ready');
    await page.locator('[data-cyberact="' + stanceId + '"]').click();
    const charged = await snapshot('charged');
    assert.equal(charged.stance, stanceId);
    assert(charged.buttons.find(button => button.id === stanceId).name.startsWith('释放'));
    await page.locator('[data-cyberact="' + stanceId + '"]').click();
    const cooldown = await snapshot('cooldown');
    assert(cooldown.cooldowns[stanceId] > 0);
    let turns = 0;
    while (await page.evaluate(id => (window.__neon.G.cyberCd[id] || 0) > 0, stanceId)) {
      assert(++turns <= 30, 'Cooldown completes within its original limit');
      await page.locator('.key.wait').click();
    }
    const recovered = await snapshot('recovered');
    const geometry = result => result.buttons.map(button => ({ id: button.id, x: button.x, y: button.y, width: button.width, height: button.height }));
    for (const transition of [charged, cooldown, recovered]) assert.deepEqual(geometry(transition), geometry(ready), `${width} action positions changed`);
    await page.evaluate(() => {
      const N = window.__neon;
      N.G.classId = 'ghost'; N.G.instab = 80; N.G.skills = { act_shot: 1 };
      N.recalc(); N.updateHUD();
    });
    const ghost = await snapshot('ghost-five-loaded');
    const primary = await page.evaluate(() => [...document.querySelectorAll('.clsrow2 > *')].map(button => button.getBoundingClientRect().toJSON()));
    assert.equal(primary.length, 5);
    assert(primary.every(button => Math.abs(button.y - primary[0].y) < 1));
    assert(ghost.stageHeight >= 150, `${width} loaded ghost stage collapsed`);
    report.push({ width, height, ready, charged, cooldown, recovered, ghost, turns });
    await page.close();
  }
  assert.equal(errors.length, 0);
  fs.writeFileSync(path.join(output, 'ability-transitions.json'), JSON.stringify({ errors, report }, null, 2));
  console.log(JSON.stringify({ sizes: report.map(item => item.width), transitions: report.length * 3, errors }, null, 2));
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const report = [];
  const errors = [];
  try {
    if (abilitiesOnly) {
      await abilityTransitions(browser);
      return;
    }
    for (const [width, height] of sizes) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        localStorage.clear();
        localStorage.setItem('neon-depth-mute', '1');
        localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
      });
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
      await page.evaluate(() => document.querySelectorAll('link[href$="polish.css"]').forEach(link => { link.disabled = true; }));
      for (const name of ['menu', 'ember', 'mode', 'prep', 'market', 'meta', 'challenge', 'assault', 'ghost', 'ghost-five', 'engineer', 'loaded', 'cyber', 'gun', 'sockets', 'chip-detail']) {
        const injected = page.locator('[data-layout-polish]');
        if (await injected.count()) await injected.evaluate(element => element.remove());
        await scene(page, name);
        const before = await page.evaluate(inspectLayout);
        const capture = ['menu', 'loaded', 'cyber', 'ember', 'challenge', 'ghost-five', 'sockets', 'chip-detail'].includes(name) && [360, 390, 844].includes(width);
        const filename = `${name}-${width}x${height}`;
        if (capture) await page.screenshot({ path: path.join(output, `${filename}-before.png`), animations: 'disabled' });
        let after = null;
        if (!baselineOnly) {
          const style = await page.addStyleTag({ path: path.join(root, 'polish.css') });
          await style.evaluate(element => { element.dataset.layoutPolish = ''; });
          await page.evaluate(() => window.dispatchEvent(new Event('resize')));
          await page.waitForTimeout(180);
          after = await page.evaluate(inspectLayout);
          if (capture) await page.screenshot({ path: path.join(output, `${filename}-after.png`), animations: 'disabled' });
        }
        report.push({ name, size: [width, height], before, after });
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(output, baselineOnly ? 'baseline.json' : 'report.json'), JSON.stringify({ errors, report }, null, 2));
  const summary = report.map(row => ({ scene: row.name, size: row.size.join('x'), before: row.before.overflow, after: row.after && row.after.overflow, beforeStage: row.before.stageHeight, afterStage: row.after && row.after.stageHeight }));
  console.log(JSON.stringify({ errors, summary }, null, 2));
  assert.equal(errors.length, 0, 'No runtime errors during layout regression');
  if (!baselineOnly) {
    for (const row of report) {
      assert.equal(row.after.rootOverflow, false, `${row.name} ${row.size} viewport overflow`);
      assert.equal(row.after.overflow.length, 0, `${row.name} ${row.size} content clipped`);
      assert.equal(row.before.text, row.after.text, `${row.name} ${row.size} text changed`);
      for (const socketRow of row.after.sockets) assert(socketRow.every(top => Math.abs(top - socketRow[0]) < 1), `${row.name} ${row.size} sockets wrap`);
      assert(row.after.chipGlyphsCentered, `${row.name} ${row.size} chip glyph alignment`);
      if (row.name === 'ghost-five') {
        assert.equal(row.after.primaryWidths.length, 5, 'Ghost five-action fixture');
        assert(Math.max(...row.after.primaryWidths) - Math.min(...row.after.primaryWidths) < 1, `${row.size} ghost action widths differ`);
      }
      if (['assault', 'ghost', 'ghost-five', 'engineer', 'loaded'].includes(row.name)) {
        assert(row.after.stageHeight >= 150, `${row.name} ${row.size} stage collapsed`);
        assert(row.after.menuVisible, `${row.name} ${row.size} menu controls off screen`);
        assert(row.after.primaryRow.every(top => Math.abs(top - row.after.primaryRow[0]) < 1), `${row.name} ${row.size} primary actions wrap`);
      }
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
