// 守卫战遮挡巡检：登场 / 2.5s 后 / 蓄力中 / 转阶段
const { chromium } = require('playwright'), path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => localStorage.setItem('neon-depth-mute', '1'));
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html'));
  await page.evaluate(() => { const N = window.__neon, G = N.G; G.classId = 'assault'; N.startGame(); N.test.hideOverlay(); N.p.pending = 0; G.pendingBoard = null; G.paused = false; G.depth = 10; N.startFloor(); N.test.hideOverlay(); G.pendingBoard = null; G.paused = false; N.p.hp = N.p.maxHp = 400; });
  const covered = () => page.evaluate(() => {
    const st = document.querySelector('#stage').getBoundingClientRect(), out = [];
    ['#bossbanner', '#floorbanner', '#bossinvasion'].forEach(sel => { const el = document.querySelector(sel); if (!el || el.hidden) return; const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      if (cs.display !== 'none' && +cs.opacity > .05 && r.height > 4 && r.bottom > st.top && r.top < st.bottom) out.push(sel + ' ' + Math.round(r.height) + 'px op' + (+cs.opacity).toFixed(2)); });
    return out; });
  await page.waitForTimeout(500); await page.screenshot({ path: path.join(ROOT, 'shots', 'boss-1-entry.png') }); console.log('entry', JSON.stringify(await covered()));
  await page.waitForTimeout(2200); await page.screenshot({ path: path.join(ROOT, 'shots', 'boss-2-after.png') }); console.log('after 2.7s', JSON.stringify(await covered()));
  for (let i = 0; i < 12; i++) { const has = await page.evaluate(() => { const N = window.__neon; N.test.endTurn(); N.test.hideOverlay(); return !!N.G.enemies.find(e => e.boss && e.intent); }); if (has) break; }
  await page.waitForTimeout(300); await page.screenshot({ path: path.join(ROOT, 'shots', 'boss-3-charge.png') }); console.log('charge', JSON.stringify(await covered()), await page.locator('#bosscomms').textContent());
  await page.evaluate(() => { const N = window.__neon, e = N.G.enemies.find(x => x.boss); e.hp = Math.round(e.maxHp * .7); N.test.endTurn(); N.test.hideOverlay(); });
  await page.waitForTimeout(400); await page.screenshot({ path: path.join(ROOT, 'shots', 'boss-4-phase.png') }); console.log('phase', JSON.stringify(await covered()), await page.locator('#bosscomms').textContent());
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
