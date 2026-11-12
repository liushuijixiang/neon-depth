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
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const input = path.join(work, 'confirm.debug.html');
const source = fs.readFileSync(input, 'utf8');
const oldCompact = fs.readFileSync(path.join(project, 'work/r39-baseline/neon-rogue/compact-ui.js'), 'utf8');
const compact = fs.readFileSync(path.join(root, 'compact-ui.js'), 'utf8');
const polish = fs.readFileSync(path.join(root, 'polish.css'), 'utf8');
function replacePresentation(html) {
  const styles = [...html.matchAll(/<style>\n([\s\S]*?)\n<\/style>/g)];
  assert(styles[1][1].startsWith('/* Interface polish.'));
  assert(html.includes(oldCompact), 'Frozen compact controls match their pre-edit source');
  return html.replace(styles[1][0], () => '<style>\n' + polish + '\n</style>').replace(oldCompact, () => compact);
}
const after = path.join(work, 'text-layout.debug.html');
fs.writeFileSync(after, replacePresentation(source));

async function prepare(page, filename) {
  await page.addInitScript(() => {
    localStorage.clear(); localStorage.setItem('neon-depth-mute', '1');
    localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
    let state = 39039;
    Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  });
  await page.goto(pathToFileURL(filename).href);
}

async function dream(page, kit) {
  await page.evaluate(kit => {
    const N = __neon, G = N.G;
    const selected = N.test.v18.DREAMS.find(item => item.kit === kit);
    N.test.story.ST.dreams[selected.id] = 1;
    N.test.v18.dreamBegin(selected); N.test.hideOverlay();
    Object.assign(G, { modal: null, paused: false, busy: false, storyQueue: [], pendingBoard: null });
    N.p.pending = 0; N.updateHUD();
  }, kit);
  await page.waitForTimeout(80);
}

async function inspect(page) {
  return page.evaluate(() => {
    const row = document.querySelector('.clsrow2');
    const rect = element => element.getBoundingClientRect().toJSON();
    return { row: rect(row), stage: rect(document.querySelector('#stage')),
      buttons: [...row.querySelectorAll('.dreamact')].map(button => {
        const description = button.querySelector('small');
        const letters = [];
        const text = description.firstChild;
        for (let index = 0; index < text.length; index++) {
          const range = document.createRange(); range.setStart(text, index); range.setEnd(text, index + 1);
          const box = range.getBoundingClientRect();
          if (box.width > .1 && text.data[index].trim()) letters.push(box.toJSON());
        }
        return { act: button.dataset.act, rect: rect(button), description: description.textContent,
          fontSize: getComputedStyle(description).fontSize, inlineFont: description.style.fontSize,
          lines: new Set(letters.map(letter => Math.round(letter.y * 10))).size, letters };
      }) };
  });
}

function verifyDescription(result, width, kit) {
  assert.equal(result.buttons.length, 3);
  assert.equal(result.row.height, kit === 'runner' ? 62 : 44, 'Skill bar height is preserved');
  for (const button of result.buttons) {
    assert.equal(button.rect.height, 44, 'Skill button height is preserved');
    assert.equal(button.inlineFont, '', 'Dream descriptions bypass the single-line shrinking helper');
    assert(parseFloat(button.fontSize) >= 8.5, `${width}/${kit} readable description size`);
    assert(button.lines <= 3, `${width}/${kit}/${button.act} at most three lines, got ${button.lines}`);
    for (const letter of button.letters) {
      assert(letter.left >= button.rect.left && letter.right <= button.rect.right + .2,
        `${width}/${kit}/${button.act} a character overflows horizontally`);
      assert(letter.top >= button.rect.top - .2 && letter.bottom <= button.rect.bottom + .5,
        `${width}/${kit}/${button.act} a character overflows vertically`);
    }
  }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = { source: input, sourceSha256: hash(source), polishSha256: hash(polish), compactSha256: hash(compact), errors: [], viewports: [] };
  try {
    for (const [width, height] of [[320, 640], [390, 844], [844, 390]]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true });
      page.on('pageerror', error => report.errors.push({ width, message: error.message }));
      await prepare(page, after);
      const viewport = { width, height, dreams: [] };
      for (const kit of ['rocker', 'runner', 'puppet', 'replicant', 'hound']) {
        await dream(page, kit);
        const ready = await inspect(page);
        verifyDescription(ready, width, kit);
        if (kit === 'runner') await page.screenshot({ path: path.join(output, `runner-readable-${width}x${height}.png`), animations: 'disabled' });
        await page.evaluate(() => {
          __neon.G.dreamCds = Object.fromEntries([...document.querySelectorAll('.dreamact')].map(button => [button.dataset.act.slice(6), 2]));
          __neon.updateHUD();
        });
        await page.waitForTimeout(50);
        const cooldown = await inspect(page);
        verifyDescription(cooldown, width, kit);
        assert.deepEqual(cooldown.buttons.map(button => button.rect), ready.buttons.map(button => button.rect), 'Cooldown labels keep skill geometry stable');
        viewport.dreams.push({ kit, ready, cooldown });
      }
      await page.evaluate(() => { __neon.meta.cores = 1000; __neon.test.ui.marketScreen('chip'); });
      await page.locator('[data-mchip="red"]').click();
      const purchase = await page.locator('.market-buy-actions .cta').evaluate(button => {
        const range = document.createRange(); range.selectNodeContents(button);
        return { text: button.textContent, rect: button.getBoundingClientRect().toJSON(), textRects: [...range.getClientRects()].map(rect => rect.toJSON()),
          fontSize: getComputedStyle(button).fontSize, scrollWidth: button.scrollWidth, clientWidth: button.clientWidth };
      });
      assert.equal(purchase.textRects.length, 1, 'Purchase label stays on one line');
      assert(purchase.scrollWidth <= purchase.clientWidth, 'Purchase label fits button');
      assert(purchase.textRects[0].left >= purchase.rect.left && purchase.textRects[0].right <= purchase.rect.right, 'Purchase text is completely visible');
      viewport.purchase = purchase;
      await page.screenshot({ path: path.join(output, `market-single-line-${width}x${height}.png`), animations: 'disabled' });
      report.viewports.push(viewport);
      await page.close();
    }
    assert.equal(report.errors.length, 0);
    fs.writeFileSync(path.join(work, 'text-layout-report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(output, '技能说明与购买单行验证.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ viewports: report.viewports.length, dreamStates: 30, descriptions: 90, purchaseLabels: 3, errors: report.errors.length }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
