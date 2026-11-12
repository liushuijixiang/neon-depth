const { chromium } = require('playwright'), path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('neon-depth-mute', '1'); localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } })); });
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html'));
  const shot = async (n, fn) => { await page.evaluate(fn); await page.waitForTimeout(500); await page.screenshot({ path: path.join(ROOT, 'shots', 'v20-' + n + '.png') }); };
  const close = () => page.evaluate(() => { const N = window.__neon, G = N.G; N.test.hideOverlay(); G.paused = false; G.modal = null; G.pendingBoard = null; G.storyQueue = []; });
  await page.evaluate(() => { const N = window.__neon, G = N.G; G.classId = 'ghost'; N.startGame(); }); await close();
  await page.evaluate(() => { const N = window.__neon, G = N.G; ['hand_red', 'eye_blue', 'mantis_blade', 'body_purple'].forEach(id => { const m = N.mods.find(x => x.id === id); if (m) N.applyMod(m); }); N.addChipObject(N.makeChip('power', 'red')); G.curse = { enemyAtk: 2, enemyHp: .2 }; N.p.buffs.push({ id: 'shield', turns: 4, pool: 12 }); G.instab = 45; N.recalc(); }); await close();
  await shot('stats', () => window.__neon.test.v18.openHub('stats')); await close();
  await shot('ghost', () => window.__neon.updateHUD());
  await shot('chipforge', () => { const N = window.__neon; window.__neon.test.v18.chipForgeScreen(N.makeChip('crit', 'red'), { cost: '¥20', can: () => true, pay: () => {}, back: () => {} }); });
  await page.evaluate(() => document.querySelector('#cfGo').click()); await page.waitForTimeout(1700); await page.screenshot({ path: path.join(ROOT, 'shots', 'v20-chipforge2.png') }); await close();
  await shot('enh', () => { const V = window.__neon.test.v18; V.enhanceScreen('hand_red', V.instOf('hand_red'), { unit: '¥', cost: () => 40, can: () => true, pay: () => {}, back: () => {} }); }); await close();
  await shot('pour', () => { const N = window.__neon; N.meta.cores = 500; N.meta.up = { b1: 1 }; N.test.ui.showMeta(); const b = document.querySelector('[data-buy="f1"]'); b.dispatchEvent(new PointerEvent('pointerdown')); });
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
