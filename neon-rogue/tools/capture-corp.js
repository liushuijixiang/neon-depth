const { chromium } = require('playwright'), path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('neon-depth-mute', '1'); localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } })); });
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html')); await page.waitForTimeout(300);
  await page.evaluate(() => { const N = window.__neon, G = N.G; const m = {}; N.test.corp.monsters.forEach(x => m[x.id] = 1); G.codex.monsters = m; document.querySelector('#menuCodex').onclick(); });
  await page.waitForTimeout(200);
  for (const [i, re] of [[1, /霓虹/], [2, /冷冻/], [3, /黑墙/]]) {
    await page.evaluate((src) => { const r = new RegExp(src); document.querySelectorAll('details.cdx').forEach(d => d.open = false); const d = [...document.querySelectorAll('details.cdx')].find(x => r.test(x.querySelector('summary').textContent) && /敌人/.test(x.querySelector('summary').textContent)); d.open = true; d.scrollIntoView(); }, re.source);
    await page.waitForTimeout(400); await page.screenshot({ path: path.join(ROOT, 'shots', 'corp-art' + i + '.png') });
  }
  await page.evaluate(() => { const N = window.__neon, G = N.G; N.test.hideOverlay(); G.classId = 'assault'; G.trainPending = false; N.startGame(); N.test.hideOverlay(); G.paused = false; G.modal = null; G.storyQueue = []; G.depth = 2; G.corpZone = {}; G.forceCorp = true; N.startFloor(); G.forceCorp = false; N.test.hideOverlay(); G.modal = null; G.pendingBoard = null; const s = G.sites.find(x => x.type === 'corp'); s.data.corp = 'mobius'; s.data.rival = 'kharon'; N.test.corp.openCorp(s); });
  await page.waitForTimeout(400); await page.screenshot({ path: path.join(ROOT, 'shots', 'corp-offer.png') });
  await page.evaluate(() => { const N = window.__neon, G = N.G; document.querySelector('#corpYes').click(); G.depth = 3; N.startFloor(); N.test.hideOverlay(); G.paused = false; G.modal = null; G.storyQueue = []; N.updateHUD(); });
  await page.waitForTimeout(500); await page.screenshot({ path: path.join(ROOT, 'shots', 'corp-op.png') });
  await page.evaluate(() => { const N = window.__neon, G = N.G; G.enemies.forEach(e => { if (!e.corpObj) e.stun = 99; }); const e = G.enemies.find(x => x.corpKit); N.p.x = e.x - 2; N.p.y = e.y; G.map[N.p.y][N.p.x] = 0; N.computeFOV(); N.updateHUD(); });
  await page.waitForTimeout(400); await page.screenshot({ path: path.join(ROOT, 'shots', 'corp-op2.png') });
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
