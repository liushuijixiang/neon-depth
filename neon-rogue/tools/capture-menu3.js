const { chromium } = require('playwright'), path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('neon-depth-mute', '1'); });
  await page.goto('file://' + path.join(ROOT, process.argv[2] || 'dist.html')); await page.waitForTimeout(900);
  const shot = async (n) => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(ROOT, 'shots', 'm3-' + n + '.png') }); };
  await shot('depart');
  for (const t of ['cyber', 'neuro', 'ember']) { await page.click('[data-mntab="' + t + '"]'); await shot(t); }
  await page.click('[data-mntab="depart"]'); await page.click('#actionBtn'); await shot('mode');
  await page.click('[data-mode="normal"]'); await shot('persona');
  await page.click('[data-flow-cls="ghost"]'); await shot('prep');
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
