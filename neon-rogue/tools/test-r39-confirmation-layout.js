const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const project = path.resolve(__dirname, '../..');
const work = path.join(project, 'work/r39/layout');
const output = path.join(project, 'outputs/r39/界面修复对比');
const original = path.join(work, 'confirm.debug.html');
const autoFitOnly = process.argv.includes('--auto-fit-only');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
let html = fs.readFileSync(original, 'utf8');
const styles = [...html.matchAll(/<style>\n([\s\S]*?)\n<\/style>/g)];
assert(styles[1][1].startsWith('/* Interface polish.'));
const css = fs.readFileSync(path.join(project, 'neon-rogue/polish.css'), 'utf8');
html = html.replace(styles[1][0], () => '<style>\n' + css + '\n</style>');
const effective = path.join(work, 'confirm.effective.debug.html');
fs.writeFileSync(effective, html);

async function grid(page) {
  return page.evaluate(() => [...document.querySelectorAll('[data-mchip]')].map(button => ({
    quality: button.dataset.mchip, html: button.innerHTML, rect: button.getBoundingClientRect().toJSON()
  })));
}

async function geometry(page, selector) {
  return page.evaluate(selector => [...document.querySelectorAll(selector)].map(button => ({
    key: button.dataset.drink || button.dataset.bun || button.id,
    rect: button.getBoundingClientRect().toJSON()
  })), selector);
}

async function inspectPrompt(page, selector) {
  return page.evaluate(selector => {
    const button = document.querySelector(selector);
    const prompt = button.querySelector('.confirm2-indicator');
    const rect = element => element.getBoundingClientRect().toJSON();
    const rangeRect = element => {
      const range = document.createRange(); range.selectNodeContents(element);
      return range.getBoundingClientRect().toJSON();
    };
    const card = button.closest('.card');
    return { button: rect(button), prompt: rect(prompt), card: rect(card), text: prompt.innerText,
      fields: [...prompt.children].map(element => ({ text: element.textContent, rect: rangeRect(element) })),
      hit: document.elementFromPoint(rect(button).x + rect(button).width / 2, rect(button).y + rect(button).height / 2)?.closest('button') === button,
      pointerEvents: getComputedStyle(prompt).pointerEvents, originalNodesPreserved: window.originalPromptNodes.every(node => node.parentNode === button) };
  }, selector);
}

function assertPrompt(result, label) {
  assert(result.originalNodesPreserved, `${label} preserves original DOM children`);
  assert.equal(result.pointerEvents, 'none');
  assert(result.hit, `${label} original button remains clickable`);
  assert(result.prompt.left >= result.card.left - 1 && result.prompt.right <= result.card.right + 1, `${label} prompt horizontal bounds`);
  assert(result.prompt.top >= result.card.top - 1, `${label} prompt is visible above button`);
  assert(result.prompt.left >= result.button.left - 1 && result.prompt.right <= result.button.right + 1,
    `${label} prompt anchors to its own button`);
  for (const field of result.fields) {
    assert(field.rect.left >= result.prompt.left - 1 && field.rect.right <= result.prompt.right + 1, `${label} full text fits horizontally`);
    assert(field.rect.top >= result.prompt.top && field.rect.bottom <= result.prompt.bottom + 1, `${label} full text fits vertically`);
  }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = { frozenInput: original, frozenInputSha256: hash(fs.readFileSync(original)), cssSha256: hash(css), effectiveSha256: hash(html), errors: [], viewports: [] };
  try {
    for (const [width, height] of [[320, 640], [360, 640], [390, 844], [560, 900], [844, 390]]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true });
      page.setDefaultTimeout(5000);
      page.on('pageerror', error => report.errors.push({ width, message: error.message }));
      await page.addInitScript(() => { localStorage.clear(); localStorage.setItem('neon-depth-mute', '1'); });
      await page.goto(pathToFileURL(effective).href);
      await page.evaluate(() => {
        const N = __neon;
        N.meta.cores = 100000;
        N.meta.stash.chips = [];
        N.test.ui.marketScreen('chip');
      });
      const viewport = { width, height, market: [], prompts: [] };
      if (!autoFitOnly) {
      for (const quality of ['gray', 'green', 'blue', 'purple', 'orange', 'red']) {
        const source = page.locator(`[data-mchip="${quality}"]`);
        await source.scrollIntoViewIfNeeded();
        const before = await grid(page);
        const economy = await page.evaluate(() => ({ cores: __neon.meta.cores, chips: __neon.meta.stash.chips.length }));
        await source.click();
        await page.waitForFunction(() => {
          const canvas = document.querySelector('.market-buy-chip canvas');
          return canvas && canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.some((value, index) => index % 4 === 3 && value > 0);
        });
        assert.deepEqual(await grid(page), before, `${width}/${quality} market card grid stays exactly in place`);
        const dialog = await page.evaluate(() => {
          const panel = document.querySelector('.market-buy-panel');
          const rect = element => element.getBoundingClientRect().toJSON();
          return { panel: rect(panel), icon: rect(panel.querySelector('.chipico')), name: panel.querySelector('.market-buy-name').textContent,
            fields: [...panel.querySelectorAll('.market-buy-name, button')].map(element => ({ text: element.innerText, rect: rect(element), overflow: element.scrollWidth > element.clientWidth + 1 })),
            buttons: [...panel.querySelectorAll('button')].map(element => rect(element)),
            active: document.activeElement.className, rootOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
        });
        assert(dialog.panel.left >= 0 && dialog.panel.right <= width && dialog.panel.top >= 0 && dialog.panel.bottom <= height, 'Dialog fits viewport');
        assert(dialog.icon.width >= 60 && dialog.icon.height >= 60, 'Chip illustration remains visible');
        assert(dialog.fields.every(field => !field.overflow), 'Dialog labels fit');
        assert.equal(dialog.rootOverflow, false);
        assert.equal(dialog.active, 'ghost', 'Cancel receives initial keyboard focus');
        const originalIcon = await source.locator('.chipico canvas').evaluate(element => element.toDataURL());
        assert.equal(await page.locator('.market-buy-chip canvas').evaluate(element => element.toDataURL()), originalIcon, 'Production chip illustration is pixel-identical in dialog');
        if (quality === 'red' && [320, 390, 844].includes(width)) await page.screenshot({ path: path.join(output, `market-confirm-${width}x${height}.png`), animations: 'disabled' });
        await page.locator('.market-buy-actions .ghost').click();
        assert.equal(await page.locator('.market-buy-dialog').count(), 0, 'Cancel removes dialog');
        assert.deepEqual(await grid(page), before, 'Cancel keeps original grid and icons');
        assert.deepEqual(await page.evaluate(() => ({ cores: __neon.meta.cores, chips: __neon.meta.stash.chips.length })), economy, 'Cancel leaves purchase state intact');
        viewport.market.push({ quality, dialog, cancel: true });
      }
      for (const [statIndex, quality] of [[0, 'blue'], [1, 'red']]) {
        const stat = page.locator('[data-mstat]').nth(statIndex);
        const chipId = await stat.getAttribute('data-mstat');
        await stat.click();
        const economy = await page.evaluate(() => ({ cores: __neon.meta.cores, count: __neon.meta.stash.chips.length }));
        await page.locator(`[data-mchip="${quality}"]`).click();
        const buy = page.locator('.market-buy-actions .cta');
        const price = Number((await buy.textContent()).match(/\d+/)[0]);
        await buy.click();
        const bought = await page.evaluate(() => ({ cores: __neon.meta.cores, count: __neon.meta.stash.chips.length,
          chip: __neon.meta.stash.chips.at(-1), savedCount: JSON.parse(localStorage.getItem('neon-depth-meta')).stash.chips.length }));
        assert.equal(bought.cores, economy.cores - price);
        assert.equal(bought.count, economy.count + 1);
        assert.equal(bought.savedCount, bought.count);
        assert.equal(bought.chip.id, chipId);
        assert.equal(bought.chip.quality, quality);
        assert.equal(await page.locator('.market-buy-dialog').count(), 0);
        viewport.market.push({ quality, chipId, price, bought: { cores: bought.cores, count: bought.count, savedCount: bought.savedCount } });
      }
      await page.locator('[data-mchip="gray"]').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.market-buy-dialog').count(), 0, 'Escape cancels');
      await page.locator('[data-mchip="green"]').click();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.className), 'cta');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.className), 'ghost');
      await page.locator('.market-buy-dialog').click({ position: { x: 1, y: 1 } });
      assert.equal(await page.locator('.market-buy-dialog').count(), 0, 'Backdrop cancels');

      await page.evaluate(() => { __neon.test.story.ST.pendingDrink = null; __neon.test.story.barScreen('drinks'); });
      await page.locator('[data-drink="0"]').scrollIntoViewIfNeeded();
      const drinkGeometry = await geometry(page, '[data-drink]');
      const initialCores = await page.evaluate(() => __neon.meta.cores);
      await page.evaluate(() => { window.originalPromptNodes = [...document.querySelector('[data-drink="0"]').childNodes]; });
      await page.locator('[data-drink="0"]').click();
      const firstPrompt = await inspectPrompt(page, '[data-drink="0"]');
      assertPrompt(firstPrompt, `${width} first drink`);
      assert.deepEqual(await geometry(page, '[data-drink]'), drinkGeometry, 'Arming drink keeps all buttons stable');
      assert.equal(await page.evaluate(() => __neon.meta.cores), initialCores);
      if ([320, 390].includes(width)) await page.screenshot({ path: path.join(output, `drink-confirm-${width}x${height}.png`), animations: 'disabled' });
      await page.evaluate(() => { window.originalPromptNodes = [...document.querySelector('[data-drink="1"]').childNodes]; });
      await page.locator('[data-drink="1"]').click();
      const secondPrompt = await inspectPrompt(page, '[data-drink="1"]');
      assertPrompt(secondPrompt, `${width} different drink`);
      assert.equal(await page.locator('.confirm2-indicator').count(), 1, 'Only one prompt remains armed');
      assert.equal(await page.locator('[data-drink="0"].confirm2-armed').count(), 0);
      await page.waitForTimeout(2650);
      assert.equal(await page.locator('.confirm2-indicator').count(), 0, 'Prompt clears after original 2.5 seconds');
      assert.equal(await page.evaluate(() => __neon.meta.cores), initialCores);
      await page.locator('[data-drink="1"]').click();
      const drinkPrice = Number((await page.locator('[data-drink="1"] .confirm2-indicator small').textContent()).match(/\d+/)[0]);
      await page.locator('[data-drink="1"]').click();
      assert.equal(await page.evaluate(() => __neon.meta.cores), initialCores - drinkPrice, 'Second click purchases one drink');
      assert(await page.evaluate(() => !!__neon.test.story.ST.pendingDrink));
      viewport.prompts.push({ firstPrompt, secondPrompt, drinkPrice });
      }

      await page.evaluate(() => {
        const N = __neon, G = N.G;
        G.mode = 'normal'; G.classId = 'assault'; G.chalSel = [];
        N.startGame(); N.test.hideOverlay();
        Object.assign(G, { modal: null, paused: false, busy: false, storyQueue: [], pendingBoard: null, enemies: [], cyber: {}, cyberChips: {} });
        N.p.pending = 0;
        N.recalc(); N.openCyber();
      });
      const autoFit = page.locator('#autoFit');
      await autoFit.scrollIntoViewIfNeeded();
      const autoFitGeometry = await geometry(page, '#autoFit');
      await page.evaluate(() => { window.originalPromptNodes = [...document.querySelector('#autoFit').childNodes]; });
      await autoFit.click();
      const autoFitPrompt = await inspectPrompt(page, '#autoFit');
      assertPrompt(autoFitPrompt, `${width} no-hint confirmation`);
      assert.equal(autoFitPrompt.fields.length, 1, 'No extra hint is introduced');
      assert.deepEqual(await geometry(page, '#autoFit'), autoFitGeometry, 'Auto-loadout button keeps its geometry');
      if ([320, 390, 844].includes(width)) await page.screenshot({ path: path.join(output, `auto-fit-confirm-${width}x${height}.png`), animations: 'disabled' });
      viewport.prompts.push({ autoFitPrompt });
      report.viewports.push(viewport);
      await page.close();
    }
    assert.equal(report.errors.length, 0, 'No runtime exceptions');
    const reportName = autoFitOnly ? 'confirmation-button-anchor-report.json' : 'confirmation-report.json';
    const outputName = autoFitOnly ? '确认提示按钮定位复验.json' : '购买与确认验证.json';
    fs.writeFileSync(path.join(work, reportName), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(output, outputName), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ viewports: report.viewports.length, marketCancels: autoFitOnly ? 0 : report.viewports.length * 6,
      purchases: autoFitOnly ? 0 : report.viewports.length * 2, promptCases: report.viewports.length * (autoFitOnly ? 1 : 3), errors: report.errors.length }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
