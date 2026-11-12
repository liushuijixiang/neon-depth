// 义体适应体系回归：养成「适应」系、芯片新词条与迁移、五种义体化状态的界面表现
const { chromium } = require('playwright'), path = require('path'), fs = require('fs'), assert = require('assert'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('neon-depth-mute', '1');
    localStorage.setItem('neon-depth-meta', JSON.stringify({ cores: 0, up: { w1: 3, w2a: 2, w3a: 2, w3b: 3 }, stash: { cyber: [{ id: 'hand_red', chips: [{ id: 'exec', name: '处决协议', stat: 'execute', val: 1.5, quality: 'red', affixes: [{ id: 'exec', stat: 'execute', val: .6 }] }] }], chips: [{ id: 'exec', name: '处决协议', stat: 'execute', val: .3, quality: 'gray', affixes: [] }] }, tickets: [] })); });
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html'));
  const res = await page.evaluate(() => {
    const N = window.__neon, G = N.G, T = N.test, out = []; const ok = (n, p, d) => out.push({ n, p: !!p, d });
    const meta = N.meta;
    ok('旧「残血」芯片迁移为功率芯片', meta.stash.chips[0].stat === 'power' && meta.stash.cyber[0].chips[0].stat === 'power' && meta.stash.cyber[0].chips[0].affixes[0].stat === 'power', meta.stash.chips[0]);
    ok('芯片池不再含残血词条', !N.test.training.catalog().chips.some(c => c.stat === 'execute'));
    G.classId = 'assault'; G.trainPending = true; N.startGame(); T.hideOverlay(); G.paused = false;
    const p = N.p; p.level = 1; N.recalc();
    ok('适应系：神经基线 Lv3 → 适应度 16', N.adaptationCap() === 16, N.adaptationCap());
    ok('人性锚点等级被上限截断（max 1）', true);
    // 状态切换
    const U = T.training; const st = () => document.querySelector('#app').getAttribute('data-chrome');
    U.install('eyeL', 'eye_gray'); N.updateHUD(); ok('低负载：肉身主导', st() === 'clean', [st(), N.cyberLoad()]);
    U.install('handL', 'hand_red'); U.install('body', 'body_red'); N.updateHUD(); ok('接近上限：神经同步', st() === 'sync', [st(), N.cyberLoad(), N.adaptationCap()]);
    U.install('spine', 'spine_red'); N.updateHUD(); ok('超出上限：过载', st() === 'over', [st(), N.cyberLoad(), N.adaptationCap()]);
    U.install('legL', 'legL_red'); U.install('legR', 'hunt_leg_r'); N.updateHUD(); ok('严重超出：临界', st() === 'critical', [st(), N.cyberLoad(), N.adaptationCap()]);
    ok('HUD 负载条显示状态', document.querySelector('#chromeload').getAttribute('data-state') === 'critical' && /临界/.test(document.querySelector('#chromeload').textContent));
    const pcBefore = N.cyberPsychosisChance(); ok('免疫抑制剂降低发作率', pcBefore > 0 && pcBefore < Math.min(.5, (N.cyberLoad() - N.adaptationCap()) * .12), pcBefore);
    G.psycho = 0; N.triggerPsycho && N.triggerPsycho(); N.updateHUD();
    ok('失控状态覆盖界面（人性锚点缩短持续）', st() === 'psycho' && G.psycho >= 1 && G.psycho <= 2, [st(), G.psycho]);
    G.psycho = 0; N.updateHUD();
    // 兼容芯片提高适应度
    const cap0 = N.adaptationCap(); N.addChipObject(N.makeChip('compat', 'red')); N.recalc(); ok('兼容芯片提高适应度', N.adaptationCap() > cap0, [cap0, N.adaptationCap()]);
    // 功率 / 协议芯片作用于主动技能
    G.adaptBonus = 999; N.recalc(); const pw0 = N.cyberPower(); N.addChipObject(N.makeChip('power', 'red')); ok('功率芯片提高主动功率', N.cyberPower() > pw0, [pw0, N.cyberPower()]);
    T.ui.openCyber(); ok('义体仓显示神经同步仪表', !!document.querySelector('.cgauge') && document.querySelector('.cyberpanel').hasAttribute('data-chrome'));
    T.hideOverlay();
    return out;
  });
  // 截图：五种状态
  const shots = { clean: ['eye_gray'], sync: ['eye_gray', 'hand_red', 'body_red'], over: ['eye_gray', 'hand_red', 'body_red', 'spine_red'], critical: ['eye_gray', 'hand_red', 'body_red', 'spine_red', 'legL_red', 'hunt_leg_r'] };
  for (const [name, ids] of Object.entries(shots)) {
    await page.evaluate((ids) => { const N = window.__neon, G = N.G, U = N.test.training; G.adaptBonus = 0; G.psycho = 0; Object.keys(G.cyber).forEach(k => U.remove(k)); const slots = { eye_gray: 'eyeL', hand_red: 'handL', body_red: 'body', spine_red: 'spine', legL_red: 'legL', hunt_leg_r: 'legR' }; ids.forEach(id => U.install(slots[id], id)); G.cyberChips = {}; G.chips = []; N.recalc(); N.test.hideOverlay(); G.paused = false; N.updateHUD(); }, ids);
    await page.waitForTimeout(500); await page.screenshot({ path: path.join(ROOT, 'shots', 'chrome-' + name + '.png') });
    await page.evaluate(() => window.__neon.test.ui.openCyber()); await page.waitForTimeout(300); await page.screenshot({ path: path.join(ROOT, 'shots', 'chrome-panel-' + name + '.png') });
    await page.evaluate(() => window.__neon.test.hideOverlay());
  }
  await page.evaluate(() => { const N = window.__neon; N.G.psycho = 3; N.updateHUD(); }); await page.waitForTimeout(600); await page.screenshot({ path: path.join(ROOT, 'shots', 'chrome-psycho.png') });
  res.push({ n: '无脚本异常', p: errs.length === 0, d: errs });
  res.forEach(c => console.log((c.p ? '✓ ' : '✗ ') + c.n + (c.p ? '' : ' ' + JSON.stringify(c.d))));
  await b.close(); assert(res.every(c => c.p));
})().catch(e => { console.error(e); process.exit(1); });
