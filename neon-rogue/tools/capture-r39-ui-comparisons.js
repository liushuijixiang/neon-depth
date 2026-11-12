const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const project = path.resolve(__dirname, '../..');
const work = path.join(project, 'work/r39/layout');
const output = path.join(project, 'outputs/r39/界面修复对比');
const baseline = path.join(project, 'work/r39-baseline/dist.debug.html');
const current = path.join(work, 'text-layout.debug.html');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
let styledBaseline = fs.readFileSync(baseline, 'utf8');
for (const filename of ['ui.css', 'polish.css', 'presentation.css', 'compact-ui.js']) {
  const before = fs.readFileSync(path.join(project, 'work/r39-baseline/neon-rogue', filename), 'utf8');
  assert(styledBaseline.includes(before));
  styledBaseline = styledBaseline.replace(before, () => fs.readFileSync(path.join(project, 'neon-rogue', filename), 'utf8'));
}
const runnerCurrent = path.join(work, 'runner-comparison.debug.html');
fs.writeFileSync(runnerCurrent, styledBaseline);

async function prepare(browser, filename) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  await page.addInitScript(() => {
    localStorage.clear(); localStorage.setItem('neon-depth-mute', '1');
    localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
    let state = 39039;
    Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  });
  await page.goto(pathToFileURL(filename).href);
  return page;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const evidence = { viewport: { width: 390, height: 844, deviceScaleFactor: 2 }, errors: [], market: [], runner: null, comparisons: [] };
  try {
    for (const [phase, filename] of [['before', baseline], ['after', current]]) {
      const page = await prepare(browser, filename);
      page.on('pageerror', error => evidence.errors.push(error.message));
      await page.evaluate(() => { __neon.meta.cores = 1000; __neon.meta.stash.chips = []; __neon.test.ui.marketScreen('chip'); });
      const button = page.locator('[data-mchip="green"]');
      await button.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => !!document.querySelector('[data-mchip="green"] canvas').dataset.hardwareDrawn);
      const before = await page.evaluate(() => {
        const button = document.querySelector('[data-mchip="green"]');
        return { cores: __neon.meta.cores, chips: __neon.meta.stash.chips.length,
          selectedStat: document.querySelector('[data-mstat].on').dataset.mstat,
          name: button.querySelector(':scope > b').textContent, iconText: button.querySelector('.chipico').textContent,
          quality: button.dataset.mchip, button: button.getBoundingClientRect().toJSON() };
      });
      await button.click();
      if (phase === 'after') await page.waitForFunction(() => !!document.querySelector('.market-buy-chip canvas').dataset.hardwareDrawn);
      const filenameOut = `${phase}-market-same-scene-390x844.png`;
      await page.screenshot({ path: path.join(output, filenameOut), animations: 'disabled' });
      const result = await page.evaluate(() => ({ cores: __neon.meta.cores, chips: __neon.meta.stash.chips.length,
        prompt: document.querySelector('.market-buy-panel')?.textContent || document.querySelector('[data-mchip="green"]').textContent,
        dialog: !!document.querySelector('.market-buy-dialog') }));
      assert.equal(result.cores, 1000); assert.equal(result.chips, 0);
      evidence.market.push({ phase, source: filename, sourceSha256: hash(fs.readFileSync(filename)), before, result,
        screenshot: filenameOut, screenshotSha256: hash(fs.readFileSync(path.join(output, filenameOut))) });
      await page.close();
    }
    assert.deepEqual(evidence.market[0].before, evidence.market[1].before, 'Both market views start with identical visible chip, balance and geometry');
    const runner = await prepare(browser, runnerCurrent);
    runner.on('pageerror', error => evidence.errors.push(error.message));
    await runner.evaluate(() => {
      const N = __neon, G = N.G, selected = N.test.v18.DREAMS.find(dream => dream.kit === 'runner');
      N.test.story.ST.dreams[selected.id] = 1; N.test.v18.dreamBegin(selected); N.test.hideOverlay();
      Object.assign(G, { modal: null, paused: false, busy: false, storyQueue: [], pendingBoard: null });
      N.p.pending = 0; N.updateHUD();
    });
    await runner.waitForTimeout(100);
    await runner.locator('[data-act="dream:slow"]').click();
    await runner.waitForTimeout(150);
    evidence.runner = await runner.evaluate(() => ({ heat: __neon.G.dreamHeat, freeze: __neon.G.freeze,
      labels: [...document.querySelectorAll('.dreamact')].map(button => button.textContent),
      heatText: document.querySelector('.heatbar').textContent }));
    assert.equal(evidence.runner.heat, 25);
    assert.equal(evidence.runner.freeze, 2);
    evidence.runner.source = runnerCurrent;
    evidence.runner.sourceSha256 = hash(styledBaseline);
    evidence.runner.baselineEvidence = 'work/r39/layout/before-report.json';
    await runner.screenshot({ path: path.join(output, 'final-after-runner-390x844.png'), animations: 'disabled' });
    await runner.close();

    const comparisons = [
      { key: '芯片购买确认', title: '芯片购买确认 · 同场景复现', subtitle: '相同视口 390 × 844 · 绿色攻击芯片 · 核心 1000',
        left: 'before-market-same-scene-390x844.png', right: 'after-market-same-scene-390x844.png', labels: ['旧版 3.8.0', '新版源码'] },
      { key: '技能与失控条', title: '技能与失控条 · 同场景复现', subtitle: '相同 3.8.0 玩法、种子与技能点击 · 仅替换排版源码',
        left: 'before-runner-390x844.png', right: 'final-after-runner-390x844.png', labels: ['旧版排版', '新版排版'] },
      { key: '挑战角标', title: '挑战角标 · 同场景复现', subtitle: '相同视口 390 × 844 · 全选 27 项 · 分数 +935%',
        left: 'before-challenge27-390x844.png', right: 'after-challenge27-390x844.png', labels: ['旧版排版', '新版排版'] }
    ];
    const canvasPage = await browser.newPage();
    for (const item of comparisons) {
      const payload = { ...item, leftData: fs.readFileSync(path.join(output, item.left)).toString('base64'),
        rightData: fs.readFileSync(path.join(output, item.right)).toString('base64') };
      const result = await canvasPage.evaluate(async item => {
        const images = await Promise.all([item.leftData, item.rightData].map(data => new Promise(resolve => {
          const image = new Image(); image.onload = () => resolve(image); image.src = 'data:image/png;base64,' + data;
        })));
        const canvas = document.createElement('canvas'); canvas.width = 1632; canvas.height = 1832;
        const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#07111b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textBaseline = 'top'; ctx.fillStyle = '#e8f5ff'; ctx.font = '700 30px "Microsoft YaHei UI", sans-serif';
        ctx.fillText(item.title, 24, 18);
        ctx.fillStyle = '#9cb6c8'; ctx.font = '18px "Microsoft YaHei UI", sans-serif'; ctx.fillText(item.subtitle, 24, 56);
        const crops = [];
        images.forEach((image, index) => {
          const x = 24 + index * 804, y = 116;
          ctx.fillStyle = index ? '#63e7e9' : '#ffb89b'; ctx.font = '700 22px "Microsoft YaHei UI", sans-serif';
          ctx.fillText(item.labels[index], x, 86);
          ctx.drawImage(image, x, y);
          crops.push({ x, y, width: image.width, height: image.height });
        });
        return { data: canvas.toDataURL('image/png').split(',')[1], crops };
      }, payload);
      const filename = `并排_${item.key}.png`;
      fs.writeFileSync(path.join(output, filename), Buffer.from(result.data, 'base64'));
      evidence.comparisons.push({ file: filename, sha256: hash(fs.readFileSync(path.join(output, filename))),
        left: item.left, right: item.right, crops: result.crops });
    }
    await canvasPage.close();
    fs.writeFileSync(path.join(work, 'ui-comparison-evidence.pending.json'), JSON.stringify(evidence, null, 2));
    const verification = spawnSync('python', ['-c',
      "import sys,json,pathlib;from PIL import Image,ImageChops;data=json.loads(sys.stdin.buffer.read().decode('utf-8'));root=pathlib.Path(data['root']);out=[]\nfor row in data['rows']:\n composite=Image.open(root/row['file']).convert('RGBA')\n for name,rect in zip([row['left'],row['right']],row['crops']):\n  original=Image.open(root/name).convert('RGBA');crop=composite.crop((rect['x'],rect['y'],rect['x']+rect['width'],rect['y']+rect['height']));same=ImageChops.difference(original,crop).getbbox() is None;assert same,(row['file'],name);out.append({'comparison':row['file'],'source':name,'pixelIdentical':same})\nprint(json.dumps(out))"],
      { input: JSON.stringify({ root: output, rows: evidence.comparisons }), encoding: 'utf8' });
    assert.equal(verification.status, 0, verification.stderr);
    evidence.pixelChecks = JSON.parse(verification.stdout);
    assert.equal(evidence.errors.length, 0);
    fs.writeFileSync(path.join(output, '并排对比证据.json'), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ comparisons: evidence.comparisons.length, pixelIdenticalCrops: evidence.pixelChecks.length, runtimeErrors: evidence.errors.length }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
