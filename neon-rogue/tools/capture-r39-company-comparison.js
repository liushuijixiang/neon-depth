const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const acorn = require('acorn');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const project = path.resolve(__dirname, '../..');
const work = path.join(project, 'work/r39/comparison');
const output = path.join(project, 'outputs/r39/对比');
const native = path.join(output, '原生');
fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(native, { recursive: true });
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fixtureFile = path.join(__dirname, 'test-r39-company-rewards.js');
const fixtureSource = fs.readFileSync(fixtureFile, 'utf8');
const fixtureTree = acorn.parse(fixtureSource, { ecmaVersion: 'latest' });
const functions = {};
function collect(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'FunctionDeclaration' && ['seed', 'clean', 'allChips', 'equipment', 'reset'].includes(node.id.name)) {
    functions[node.id.name] = fixtureSource.slice(node.start, node.end);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') collect(value);
  }
}
collect(fixtureTree);
assert.equal(Object.keys(functions).length, 5);
const helpers = ['seed', 'clean', 'allChips', 'equipment', 'reset'].map(name => functions[name]).join('\n');
fs.writeFileSync(path.join(work, 'fixture-functions.js'), helpers);

const inputs = [
  { key: 'before', label: '源码修改前', file: path.join(project, 'work/r39-baseline/dist.debug.html') },
  { key: 'after', label: '源码修改后', file: path.join(work, 'after.debug.snapshot.html') }
].map(input => ({ ...input, bytes: fs.statSync(input.file).size, sha256: hash(fs.readFileSync(input.file)) }));
const rewardId = 'cx_kharon_purple_spine';
const results = [];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const input of inputs) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
      page.setDefaultTimeout(6000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => { localStorage.clear(); localStorage.setItem('neon-depth-mute', '1'); });
      await page.goto(pathToFileURL(input.file).href);
      const versionLabel = await page.locator('.m3-logo small').textContent();
      const version = versionLabel.match(/\d+\.\d+\.\d+/)?.[0];
      assert(version, 'Visible version is available');
      const outcome = await page.evaluate(({ helpers, rewardId }) => {
        const N = __neon, G = N.G, T = N.test, K = T.corp;
        const execute = new Function('N', 'G', 'T', 'K', 'rewardId', helpers + `
          const originalRandom = Math.random;
          try {
            reset(11, true);
            const initial = {
              classId: G.classId, equipment: equipment(), bag: G.modBag.slice().sort(), chips: allChips(),
              instances: Object.fromEntries(Object.keys(G.inst).sort().map(id => [id, JSON.parse(JSON.stringify(G.inst[id]))])),
              load: N.cyberLoad(), cap: N.adaptationCap(), hp: N.p.hp, maxHp: N.p.maxHp, level: N.p.level
            };
            K.trialBegin('kharon', 'purple');
            const slot = Object.keys(G.cyber).find(slot => G.cyber[slot] === rewardId);
            const rewardChips = G.cyberChips[slot].map(clean);
            const trialReward = { id: rewardId, slot, instance: JSON.parse(JSON.stringify(G.inst[rewardId])), chips: rewardChips };
            K.corpRewardScreen('kharon');
            const button = document.querySelector('[data-crw="' + rewardId + '"]');
            if (!button || button.disabled) throw new Error('Real company reward button unavailable');
            const selectedButton = button.outerHTML;
            button.click();
            const installedSlot = Object.keys(G.cyber).find(slot => G.cyber[slot] === rewardId) || null;
            const final = { classId: G.classId, equipment: equipment(), bag: G.modBag.slice().sort(),
              allChips: allChips(), bagChips: G.chips.map(clean).sort(),
              installedChips: Object.values(G.cyberChips).flat().filter(Boolean).map(clean).sort(),
              load: N.cyberLoad(), cap: N.adaptationCap(), hp: N.p.hp, maxHp: N.p.maxHp,
              rewardId, installedSlot, rewardOwned: G.modBag.includes(rewardId),
              safe: N.cyberLoad() <= N.adaptationCap(), pendingReward: G.pendingCorpReward, modal: G.modal };
            return { initial, trialReward, selectedButton, final,
              expectedChips: initial.chips.concat(rewardChips).sort(),
              action: 'Single HTMLElement.click on the real data-crw reward button' };
          } finally { Math.random = originalRandom; }
        `);
        return execute(N, G, T, K, rewardId);
      }, { helpers, rewardId });
      assert.equal(outcome.final.rewardOwned, true);
      assert.deepEqual(outcome.final.allChips, outcome.expectedChips);
      const files = [];
      const snapshotState = async () => page.evaluate(() => ({ load: __neon.cyberLoad(), cap: __neon.adaptationCap(),
        equipment: Object.entries(__neon.G.cyber), owned: __neon.G.modBag.slice(),
        bagChipCount: __neon.G.chips.length, installedChipCount: Object.values(__neon.G.cyberChips).flat().length }));
      const stateBeforeViews = await snapshotState();
      for (const [key, label] of [['loadout', '负载'], ['bag', '义体背包'], ['chips', '芯片背包']]) {
        await page.evaluate(key => {
          const N = __neon;
          if (key === 'loadout') N.openCyber();
          else N.test.v18.openBag(key === 'chips' ? 'chips' : 'gear');
        }, key);
        await page.waitForTimeout(220);
        const filename = `${version}_${input.label}_${label}.png`;
        const target = path.join(native, filename);
        await page.screenshot({ path: target, animations: 'disabled' });
        files.push({ key, label, file: target, sha256: hash(fs.readFileSync(target)),
          visibleText: await page.locator('#overlay .card').innerText() });
      }
      assert.deepEqual(await snapshotState(), stateBeforeViews, 'Opening comparison panels keeps resulting equipment and chips');
      assert.equal(errors.length, 0);
      assert.equal(hash(fs.readFileSync(input.file)), input.sha256, 'Captured build snapshot stays fixed');
      results.push({ ...input, version, versionLabel, ...outcome, files, errors });
      await page.close();
    }
    assert.equal(results[0].version, results[1].version, 'Both builds show the same version');
    assert.deepEqual(results[0].initial, results[1].initial, 'Identical original loadout and chips');
    assert.deepEqual(results[0].trialReward, results[1].trialReward, 'Identical reward before choosing it');
    assert.equal(results[0].final.safe, false, 'Earlier source reproduces overload');
    assert.equal(results[1].final.safe, true, 'Later source keeps normal load');
    assert.equal(results[1].final.installedSlot, null, 'Reward is kept in backpack');
    assert(results.every(result => result.initial.cap > 0 && result.final.cap > 0));

    const composer = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await composer.setContent('<!doctype html><canvas id="comparison"></canvas>');
    const comparisons = [];
    for (const [key, label] of [['loadout', '负载'], ['bag', '义体背包'], ['chips', '芯片背包']]) {
      const sides = results.map(result => ({ label: result.label, version: result.version, source: result.sha256,
        load: result.final.load, cap: result.final.cap, bagChips: result.final.bagChips.length,
        installedChips: result.final.installedChips.length,
        image: 'data:image/png;base64,' + fs.readFileSync(result.files.find(file => file.key === key).file).toString('base64') }));
      const data = await composer.evaluate(async ({ sides, label }) => {
        const images = await Promise.all(sides.map(side => new Promise((resolve, reject) => {
          const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = side.image;
        })));
        const width = images[0].width, height = images[0].height, margin = 24, gap = 24, header = 150, footer = 94;
        const canvas = document.querySelector('#comparison'); canvas.width = width * 2 + margin * 2 + gap; canvas.height = header + height + footer;
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.fillStyle = '#0c1b29'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 30px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#e4f5fa';
        ctx.fillText('公司奖励领取后 · ' + label, margin, 41);
        ctx.font = '20px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#9cb9c9';
        ctx.fillText('两侧游戏显示版本均为 ' + sides[0].version + '，对应本轮源码修改前与修改后。', margin, 76);
        sides.forEach((side, index) => {
          const x = margin + index * (width + gap);
          ctx.font = 'bold 25px "Microsoft YaHei", sans-serif'; ctx.fillStyle = index ? '#68e7cb' : '#ffc37b';
          ctx.fillText(side.version + ' · ' + side.label, x, 116);
          ctx.font = '16px Consolas, monospace'; ctx.fillStyle = '#8eacbd'; ctx.fillText('SHA256 ' + side.source.slice(0, 20), x, 139);
          ctx.drawImage(images[index], x, header);
          ctx.font = '21px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#c7e3ef';
          ctx.fillText('实际负载 ' + side.load + ' / 适应度 ' + side.cap + ' · 芯片共 ' + (side.bagChips + side.installedChips) + ' 枚', x, header + height + 36);
          ctx.font = '17px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#8eacbd';
          ctx.fillText('其中已装 ' + side.installedChips + ' 枚，背包 ' + side.bagChips + ' 枚', x, header + height + 65);
        });
        return { png: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
      }, { sides, label });
      const file = path.join(output, `并排_${label}.png`);
      fs.writeFileSync(file, Buffer.from(data.png.split(',')[1], 'base64'));
      comparisons.push({ file, width: data.width, height: data.height, sha256: hash(fs.readFileSync(file)) });
    }
    await composer.close();
    const receipt = { fixtureSource: fixtureFile, fixtureSourceSha256: hash(fixtureSource), seed: 39011, fixtureIndex: 11,
      corp: 'kharon', quality: 'purple', withGear: true, rewardId, viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
      sameInitialEquipment: true, sameTrialReward: true, positiveAdaptationCase: true,
      scope: 'This positive-adaptation fixture does not exercise any negative-adaptation floor branch.',
      results, comparisons };
    fs.writeFileSync(path.join(output, '对比证据.json'), JSON.stringify(receipt, null, 2));
    fs.writeFileSync(path.join(output, '阅读说明.txt'), [
      '公司奖励领取后的真实前后对比', '',
      `两侧游戏显示版本均为 ${results[0].version}，分别对应本轮源码修改前与修改后。`,
      '使用同一随机种子39011、相同原始配装、同一公司与奖励按钮。奖励通过真实data-crw按钮处理。',
      `修改前实际负载 ${results[0].final.load} / 适应度 ${results[0].final.cap}。`,
      `修改后实际负载 ${results[1].final.load} / 适应度 ${results[1].final.cap}，奖励义体留在背包，奖励芯片完整保留。`,
      `两侧芯片总数均为 ${results[1].final.allChips.length}，已装与背包分布见图注和证据JSON。`,
      '原生目录保留完整原始截图，并排图在画面外标注版本与源码先后。',
      '该夹具的适应度均为正，采用正适应度计算路径。后续仅调整负适应度下限时，本例仍使用该正值路径。',
      '构建快照、原始配装、奖励实例、实际结果、完整性检查与文件SHA256均保存在对比证据.json。', ''
    ].join('\n'));
    console.log(JSON.stringify({ before: { load: results[0].final.load, cap: results[0].final.cap },
      after: { load: results[1].final.load, cap: results[1].final.cap }, rawImages: 6, comparisons: comparisons.length, output }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
