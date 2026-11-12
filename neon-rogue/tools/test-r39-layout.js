const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const project = path.resolve(__dirname, '../..');
const root = path.join(project, 'neon-rogue');
const work = path.join(project, 'work/r39/layout');
const output = path.join(project, 'outputs/r39/界面修复对比');
const phase = process.argv.includes('--baseline') ? 'before' : 'after';
const sizes = [[320, 640], [360, 640], [390, 844], [560, 900], [844, 390]];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(output, { recursive: true });

const baselineFile = path.join(project, 'work/r39-baseline/dist.debug.html');
let html = fs.readFileSync(baselineFile, 'utf8');
const sources = [];
for (const filename of ['ui.css', 'polish.css', 'presentation.css', 'compact-ui.js']) {
  const original = fs.readFileSync(path.join(project, 'work/r39-baseline/neon-rogue', filename), 'utf8');
  const current = fs.readFileSync(path.join(root, filename), 'utf8');
  assert(html.includes(original), `${filename} exists verbatim in the frozen 3.8.0 build`);
  if (phase === 'after') html = html.replace(original, () => current);
  sources.push({ filename, before: hash(original), after: hash(current) });
}
const snapshot = path.join(work, `${phase}.debug.html`);
fs.writeFileSync(snapshot, html);

async function beginRunner(page) {
  return page.evaluate(() => {
    const N = window.__neon;
    const dream = N.test.v18.DREAMS.find(item => item.kit === 'runner');
    if (!dream) throw new Error('Runner dream missing');
    N.test.story.ST.dreams[dream.id] = 1;
    N.test.v18.dreamBegin(dream);
    N.test.hideOverlay();
    Object.assign(N.G, { modal: null, paused: false, busy: false, storyQueue: [], pendingBoard: null });
    N.p.pending = 0;
    N.updateHUD();
    return { dream: dream.id, heat: N.G.dreamHeat };
  });
}

async function inspectControls(page) {
  return page.evaluate(() => {
    const rect = element => element.getBoundingClientRect().toJSON();
    const row = document.querySelector('.clsrow2');
    const buttons = [...row.querySelectorAll('.kbtn')];
    const heat = row.querySelector('.heatbar');
    const labels = buttons.flatMap(button => [...button.querySelectorAll(':scope > b, :scope > small')].map(label => {
      const range = document.createRange();
      range.selectNodeContents(label);
      return { text: label.textContent, rect: range.getBoundingClientRect().toJSON(), button: rect(button) };
    }));
    return { row: rect(row), buttons: buttons.map(button => ({ act: button.dataset.act, rect: rect(button), text: button.innerText })),
      heat: heat && { rect: rect(heat), text: heat.innerText, fill: rect(heat.querySelector('i')), value: __neon.G.dreamHeat },
      labels, stage: rect(document.querySelector('#stage')), rootOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
}

async function mode(page, count) {
  await page.evaluate(count => {
    const N = window.__neon;
    for (const achievement of window.NEON.achievements) N.unlocked[achievement.id] = true;
    N.G.chalSel = [];
    N.test.ui.challengeScreen();
    const ids = [...document.querySelectorAll('[data-chal]')].map(button => button.dataset.chal);
    if (ids.length !== 27) throw new Error(`Expected 27 challenges, found ${ids.length}`);
    N.G.chalSel = ids.slice(0, count);
    N.test.v36.startFlow(1);
  }, count);
  await page.waitForTimeout(380);
  return page.evaluate(() => {
    const card = document.querySelector('[data-mode="normal"]');
    const badge = card.querySelector('[data-flowchal]');
    const rect = element => element.getBoundingClientRect().toJSON();
    const textRect = element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getBoundingClientRect().toJSON();
    };
    return { selected: __neon.G.chalSel.length, card: rect(card), badge: rect(badge),
      count: { text: badge.querySelector('b').textContent, rect: textRect(badge.querySelector('b')) },
      score: { text: badge.querySelector('small').textContent, rect: textRect(badge.querySelector('small')) },
      title: textRect(card.querySelector('.tx > b')), marginTop: getComputedStyle(badge).marginTop,
      rootOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      animation: getComputedStyle(badge, '::before').animationName,
      diagonalAnimation: getComputedStyle(badge.querySelector('.cut')).animationName };
  });
}

function controlChecks(result, expectedCount, width) {
  assert.equal(result.buttons.length, expectedCount, `${width} skill count`);
  const first = result.buttons[0].rect;
  assert(result.buttons.every(button => Math.abs(button.rect.y - first.y) < 1), `${width} skills share one row`);
  assert(result.buttons.every(button => Math.abs(button.rect.height - 44) < 1), `${width} button height`);
  assert.equal(result.rootOverflow, false, `${width} root overflow`);
  assert(result.stage.height >= 120, `${width} playable map height`);
  for (const label of result.labels) {
    assert(label.rect.left >= label.button.left - 1 && label.rect.right <= label.button.right + 1,
      `${width} label overflow: ${label.text}`);
  }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = { phase, version: null, frozenGameplay: baselineFile, frozenGameplaySha256: hash(fs.readFileSync(baselineFile)),
    sourceHashes: sources, snapshotSha256: hash(html), errors: [], viewports: [] };
  try {
    for (const [width, height] of sizes) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true });
      page.setDefaultTimeout(5000);
      page.on('pageerror', error => report.errors.push({ width, message: error.message }));
      await page.addInitScript(() => {
        localStorage.clear();
        localStorage.setItem('neon-depth-mute', '1');
        localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
        let state = 39039;
        Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
      });
      await page.goto(pathToFileURL(snapshot).href);
      report.version = await page.locator('.m3-logo small').textContent();
      assert(report.version.includes('3.8.0'));
      const viewport = { width, height, runner: [], challenges: [], normal: [] };
      const initial = await beginRunner(page);
      await page.waitForTimeout(100);
      viewport.runner.push({ state: 'initial', result: await inspectControls(page) });
      await page.locator('[data-act="dream:slow"]').click();
      await page.waitForTimeout(150);
      viewport.runner.push({ state: 'actual-action', result: await inspectControls(page) });
      assert(viewport.runner[1].result.heat.value > initial.heat, 'Real runner action updates heat');
      if ([360, 390, 844].includes(width)) await page.screenshot({ path: path.join(output, `${phase}-runner-${width}x${height}.png`), animations: 'disabled' });
      for (const value of [0, 100]) {
        await page.evaluate(value => { __neon.G.dreamHeat = value; __neon.updateHUD(); }, value);
        viewport.runner.push({ state: `renderer-boundary-${value}`, result: await inspectControls(page) });
      }
      for (const count of [0, 1, 9, 10, 27]) {
        const result = await mode(page, count);
        viewport.challenges.push(result);
        assert.equal(result.selected, count);
        if ([360, 390, 844].includes(width) && count === 27) await page.screenshot({ path: path.join(output, `${phase}-challenge27-${width}x${height}.png`), animations: 'disabled' });
        if (phase === 'after') {
          assert(Math.abs(result.badge.top - result.card.top - 1) <= 1, `${width}/${count} triangle reaches card top`);
          assert(result.count.rect.bottom < result.score.rect.top, `${width}/${count} count and score separation`);
          for (const field of [result.count, result.score]) {
            assert(field.rect.left >= result.badge.left && field.rect.right <= result.badge.right + 1,
              `${width}/${count} badge text horizontal bounds`);
            assert(field.rect.bottom <= result.card.bottom - 1, `${width}/${count} badge text vertical bounds`);
          }
          assert.equal(result.rootOverflow, false);
          assert.equal(result.animation, 'm3warn');
          assert.equal(result.diagonalAnimation, 'm3warn');
        }
      }
      await page.locator('[data-flowchal]').click({ position: { x: 15, y: 15 } });
      assert.equal(await page.evaluate(() => __neon.G.modal), 'challenge', 'Badge click reaches challenge tree');
      assert.equal(await page.locator('[data-chal].on').count(), 27, 'All selected challenges remain selected');
      for (const classId of ['assault', 'ghost']) {
        await page.evaluate(classId => {
          const N = __neon, G = N.G;
          N.test.hideOverlay();
          Object.assign(G, { mode: 'normal', classId, chalSel: [], dream: null });
          N.startGame();
          N.test.hideOverlay();
          Object.assign(G, { modal: null, paused: false, busy: false, storyQueue: [], pendingBoard: null, enemies: [] });
          N.p.pending = 0;
          if (classId === 'ghost') { G.instab = 80; G.skills.act_shot = 1; N.recalc(); }
          N.updateHUD();
        }, classId);
        await page.waitForTimeout(80);
        const result = await inspectControls(page);
        viewport.normal.push({ classId, result });
        if (phase === 'after') controlChecks(result, classId === 'ghost' ? 5 : 3, width);
      }
      if (phase === 'after') {
        for (const entry of viewport.runner) {
          const result = entry.result;
          controlChecks(result, 3, width);
          assert(Math.abs(result.heat.rect.left - result.row.left) < 1, `${width} heat starts at row edge`);
          assert(Math.abs(result.heat.rect.width - result.row.width) < 1, `${width} heat spans full row`);
          assert(result.heat.rect.top >= result.buttons[0].rect.bottom + 1, `${width} heat is below all three skills`);
        }
        const geometries = viewport.runner.map(entry => entry.result.buttons.map(button => ({
          x: button.rect.x - entry.result.row.x, y: button.rect.y - entry.result.row.y,
          width: button.rect.width, height: button.rect.height
        })));
        for (const geometry of geometries.slice(1)) assert.deepEqual(geometry, geometries[0], `${width} runner skill geometry is stable`);
      }
      report.viewports.push(viewport);
      await page.close();
    }
    assert.equal(report.errors.length, 0, 'No runtime exceptions');
    fs.writeFileSync(path.join(work, `${phase}-report.json`), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ phase, version: report.version, viewports: report.viewports.length, runnerStates: report.viewports.length * 4,
      challengeStates: report.viewports.length * 5, normalSkillStates: report.viewports.length * 2, errors: report.errors.length }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
