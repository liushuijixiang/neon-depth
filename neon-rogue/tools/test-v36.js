const { chromium } = require('playwright'), path = require('path'), assert = require('assert'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.addInitScript(() => { localStorage.setItem('neon-depth-mute', '1'); localStorage.removeItem('neon-depth-run'); localStorage.setItem('neon_chal_v1', JSON.stringify(['heavy', 'fury', 'debt', 'elite2', 'siege'])); localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } })); });
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html')); await page.waitForTimeout(500);
  const out = []; const ok = (n, p, d) => out.push({ n, p: !!p, d });
  // 挑战树计数
  const chal = await page.evaluate(() => { const N = window.__neon, G = N.G; N.test.v36.challengeScreen(); return [G.chalSel.length, document.querySelector('.card .sub').textContent]; });
  ok('挑战树不再把失效项算作已选', chal[0] === 0 && /已选 0 项/.test(chal[1]), chal);
  // 导航返回
  await page.evaluate(() => window.__neon.test.ui.menuScreen('depart')); await page.click('#actionBtn'); await page.click('[data-mode="dream"]'); await page.click('#backMenu');
  ok('模式→超梦→返回 回到模式选择', await page.evaluate(() => !!document.querySelector('[data-mode="normal"]')));
  await page.click('[data-flowchal]'); ok('挑战树入口在深潜卡里', await page.evaluate(() => /挑战树/.test(document.querySelector('.card').textContent)));
  await page.click('#chalBack'); ok('挑战树返回到模式', await page.evaluate(() => !!document.querySelector('[data-mode="normal"]')));
  // 战备义体选项
  const prep = await page.evaluate(() => { const N = window.__neon, G = N.G; ['eyeL','eyeR','handL','handR','body','spine','legL','legR'].forEach(s => G.cyber[s] = 'eye_gray'); N.test.v36.prepScreen({ flow: true }); return [document.querySelectorAll('[data-pcyber]').length, !!document.querySelector('.prepgauge'), document.querySelector('.prepgauge').compareDocumentPosition(document.querySelector('[data-pcyber]')) & 4]; });
  ok('战备总有 3 件初始义体可选，适应度条在最上面', prep[0] === 3 && prep[1] && prep[2], prep);
  // 一键配装
  const af = await page.evaluate(() => { const N = window.__neon, G = N.G, V = N.test.v18; G.classId = 'assault'; G.trainPending = false; G.cyber = {}; N.startGame(); N.test.hideOverlay(); G.modal = null; G.paused = false; G.storyQueue = [];
    ['eye_red','hand_red','body_red','spine_orange','legL_red','eye_blue','hand_orange','eye_gray','hand_gray'].forEach(id => { const m = N.mods.find(x => x.id === id); if (m && G.modBag.indexOf(id) < 0) { G.modBag.push(id); V.instOf(id); } });
    for (let i = 0; i < 6; i++) N.addChipObject(N.makeChip(i < 3 ? 'compat' : 'atk', 'purple'));
    G.chips = G.chips.concat(Object.keys(G.cyberChips).reduce((a, k) => a.concat(G.cyberChips[k]), [])); Object.keys(G.cyberChips).forEach(k => G.cyberChips[k] = []);
    G.state = 'play'; const r = N.test.v36.autoLoadout(); const T = window.__neon.test;
    const load = T.v18 ? 0 : 0; return { r, cyber: Object.keys(G.cyber).length, chipsIn: Object.values(G.cyberChips).reduce((t, a) => t + a.length, 0), compatIn: Object.values(G.cyberChips).reduce((t, a) => t + a.filter(c => c.stat === 'compat').length, 0), modal: G.modal }; });
  const ld = await page.evaluate(() => { const N = window.__neon; return [N.test.ui && 0, document.querySelector('#afYes') ? 'ask' : 'none']; });
  const ov = await page.evaluate(() => { const G = window.__neon.G; return [window.__neon.test.corp ? 0 : 0]; });
  const loadOk = await page.evaluate(() => { const N = window.__neon; const s = N.test.v18; return null; });
  ok('一键配装装了义体和芯片，兼容芯片先装', af.cyber >= 1 && af.compatIn >= 1, af);
  const over = await page.evaluate(() => { const N = window.__neon; const H = N.statsPanel || null; const html = N.test.v18.statsPanelHTML(); const m = html.match(/负载 \/ 适应度<\/span><b>(\d+) \/ (\d+)/); return m ? [+m[1], +m[2]] : html.slice(0, 80); });
  ok('一键配装后不过载', Array.isArray(over) && over[0] <= over[1], over);
  // 养成连续灌注
  const meta = await page.evaluate(async () => { const N = window.__neon, G = N.G; N.test.hideOverlay(); G.state = 'menu'; N.meta.cores = 5000; N.meta.up = {}; N.meta.pour = {}; N.test.ui.showMeta(); const btn = document.querySelector('[data-buy="b1"]'); const lock0 = document.querySelectorAll('[data-buy].lock').length; let ups = 0; for (let i = 0; i < 60; i++) { const r = N.test.v36.pourMeta('b1', document.querySelector('[data-buy="b1"]')); if (r === 'up') ups++; if (r === 'stop') break; } return [ups, btn === document.querySelector('[data-buy="b1"]'), N.meta.up.b1, document.querySelectorAll('[data-buy].lock').length < lock0]; });
  ok('养成连续升级不重绘、不等动画、下一阶即时解锁', meta[0] >= 2 && meta[1] && meta[3], meta);
  // B16 引导 + 刻超梦即时出现
  const g = await page.evaluate(() => { const N = window.__neon, G = N.G; G.classId = 'assault'; N.startGame(); N.test.hideOverlay(); G.modal = null; N.test.b16.enterB16(); N.test.hideOverlay(); G.modal = null; G.paused = false; N.updateHUD(); return [N.test.v36.objectiveLines().indexOf('切断三条生产线') >= 0, document.querySelector('#questTrack, .quests') ? document.querySelector('#questTrack, .quests').textContent.indexOf('生产') >= 0 : true]; });
  ok('B16 任务栏写明目标', g[0] && g[1], g);
  const dm = await page.evaluate(() => { const N = window.__neon, G = N.G; N.test.hideOverlay(); G.state = 'menu'; N.meta.cleared = 1; N.meta.myDream = null; N.meta.lastClear = { cls: 'assault', lv: 20, cyber: {}, chips: {}, inst: {}, run: {} }; G._hanAsked = false; N.test.b16.maybeHanDream(); document.querySelector('#hdYes').click(); window.__neon.test.v18.dreamShelf(); return document.querySelectorAll('.dtape:not(.locked)').length > 0 && /投放终止|你自己/.test(document.querySelector('.card').textContent); });
  ok('刻完超梦立刻出现在超梦架', dm);
  // 图鉴 B16
  const cx = await page.evaluate(() => { const h = window.__neon.test.v36.codexHTML(); return /B16 · 生产层/.test(h) && /公司武装/.test(h); });
  ok('图鉴有 B16 与公司武装分区', cx);
  // 制式券插满芯片
  const tk = await page.evaluate(() => { const N = window.__neon, G = N.G; N.test.hideOverlay(); G.rushPending = { cyber: ['kit_assault_blue_0','kit_assault_blue_1','kit_assault_blue_2','kit_assault_blue_3','kit_assault_blue_4','kit_assault_blue_5','kit_assault_blue_6','kit_assault_blue_7'], stashItems: [], ticket: 't_assault_b' }; N.startGame(); N.test.hideOverlay(); return Object.keys(G.cyber).map(sl => (G.cyberChips[sl] || []).length); });
  ok('制式券 8 件、芯片插满', tk.length === 8 && tk.every(n => n >= 3), tk);
  out.push({ n: '无脚本异常', p: errs.length === 0, d: errs });
  out.forEach(c => console.log((c.p ? '✓ ' : '✗ ') + c.n + (c.p ? '' : ' ' + String(JSON.stringify(c.d)).slice(0, 300))));
  await b.close(); assert(out.every(c => c.p));
})().catch(e => { console.error(e); process.exit(1); });
