const { chromium } = require('playwright'), path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('neon-depth-mute', '1'); localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } })); localStorage.setItem('neon-depth-codex', JSON.stringify({ monsters: { drone: 1, blade_runner: 1, fission: 1, data_hound: 1, bulkhead: 1, bl_hound: 1, bl_hive: 1 }, items: {}, consumables: {}, buffs: {} })); });
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html')); await page.waitForTimeout(300);
  const shot = async (n, fn) => { await page.evaluate(fn); await page.waitForTimeout(500); await page.screenshot({ path: path.join(ROOT, 'shots', 'v22-' + n + '.png') }); };
  await shot('stashdetail', () => { const N = window.__neon; for (let i = 0; i < 8; i++) N.meta.stash.chips.push(N.makeChip(['atk', 'crit', 'power', 'hp'][i % 4], ['blue', 'purple', 'red', 'green'][i % 4])); N.meta.stash.cyber.push({ id: 'body_red', chips: [N.makeChip('def', 'orange')] }); N.test.ui.marketScreen('stash'); N.G.market.item = 'body_red'; N.test.v18.renderMarket(); const c = document.querySelector('.card'); c.scrollTop = 500; });
  await shot('codex', () => { const N = window.__neon; N.test.ui.menuScreen(); document.querySelector('#menuCodex').click(); const d = [...document.querySelectorAll('details.cdx')].find(x => /敌人/.test(x.textContent)); if (d) { d.open = true; d.scrollIntoView(); } });
  await page.evaluate(() => { const c = document.querySelector('.mcard'); c && c.click(); }); await page.waitForTimeout(300); await page.screenshot({ path: path.join(ROOT, 'shots', 'v22-codex2.png') });
  await page.evaluate(() => { const N = window.__neon, G = N.G; G.classId = 'ghost'; N.startGame(); N.test.hideOverlay(); G.paused = false; G.modal = null; G.storyQueue = []; G.burnout = true; G.instab = 80; N.recalc(); N.applyMod(N.mods.find(m => m.id === 'mantis_blade')); N.test.hideOverlay(); G.modal = null; N.updateHUD(); });
  await shot('burn', () => window.__neon.updateHUD());
  await page.evaluate(() => { const N = window.__neon, G = N.G; G.classId = 'engineer'; N.startGame(); N.test.hideOverlay(); G.paused = false; G.modal = null; G.storyQueue = []; G.skills.act_wall = 1; G.skills.act_drone = 1; G.mechBuilt = true; G.scrap = 30; N.applyMod(N.mods.find(m => m.id === 'hand_red')); N.applyMod(N.mods.find(m => m.id === 'eye_red')); N.test.hideOverlay(); G.modal = null; N.updateHUD(); });
  await shot('eng', () => window.__neon.updateHUD());
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
