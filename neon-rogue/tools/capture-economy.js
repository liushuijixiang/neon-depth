const { chromium } = require('playwright'), path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.addInitScript(() => localStorage.setItem('neon-depth-mute', '1'));
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html'));
  const shot = n => page.screenshot({ path: path.join(ROOT, 'econ-' + n + '.png') });
  await page.evaluate(() => { const N = window.__neon, G = N.G, T = N.test, E = T.econ; G.classId = 'assault'; N.startGame(); T.hideOverlay(); N.p.pending = 0; G.pendingBoard = null; G.paused = false;
    G.depth = 3; G.credits = 140; N.startFloor(); T.hideOverlay(); G.pendingBoard = null; G.paused = false;
    // place sites & chest around player for the shot
    const p = N.p; for (let y = -4; y <= 4; y++) for (let x = -5; x <= 5; x++) if (G.map[p.y + y] && p.x + x > 0 && p.x + x < 43) G.map[p.y + y][p.x + x] = 0;
    G.enemies = G.enemies.filter(e => Math.abs(e.x - p.x) > 6 || Math.abs(e.y - p.y) > 6);
    G.sites = [{ type: 'shop', x: p.x - 3, y: p.y - 2, data: {}, seed: 1 }, { type: 'reforge', x: p.x + 3, y: p.y - 2, data: {}, seed: 2 }, { type: 'trial', x: p.x - 3, y: p.y + 3, data: { kind: 'timed' }, seed: 3 }, { type: 'gamble', x: p.x + 3, y: p.y + 3, data: {}, seed: 4 }];
    E.dropChest(p.x + 1, p.y + 1, 'boss'); E.dropChest(p.x - 1, p.y + 1, 'rare');
    G.items.push({ x: p.x, y: p.y - 2, mod: window.__neon.mods.find(m => m.quality === 'red'), seed: 1 });
    const c = E.makeContract(E.quests.find(q => q.id === 'c_elites')); E.acceptContract(c); const c2 = E.makeContract(E.quests.find(q => q.id === 'c_sweep')); E.acceptContract(c2);
    G.anomaly = 'blackout'; N.computeFOV(); N.updateHUD(); });
  await page.waitForTimeout(900); await shot('map');
  await page.evaluate(() => { const E = window.__neon.test.econ; E.showContractBoard(E.contractOffers(), '中间人来电', null); });
  await page.waitForTimeout(300); await shot('board');
  await page.evaluate(() => { const N = window.__neon, E = N.test.econ; N.test.hideOverlay(); E.openSite(N.G.sites[0]); });
  await page.waitForTimeout(300); await shot('shop');
  await page.evaluate(() => { const N = window.__neon, E = N.test.econ; N.test.hideOverlay(); N.G.depth = 10; E.openChest({ tier: 'boss', data: { bossId: 'bl_hound', title: '裂齿猎犬 · 核心箱' } }); });
  await page.waitForTimeout(1400); await shot('loot');
  await page.evaluate(() => { const N = window.__neon, E = N.test.econ; N.test.hideOverlay(); E.openSite(N.G.sites[3]); document.querySelector('#spin').click(); });
  await page.waitForTimeout(1500); await shot('gamble');
  await b.close();
})();
