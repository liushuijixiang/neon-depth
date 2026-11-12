const { chromium } = require('/root/workspace/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  for (const vp of [{width:360,height:640},{width:412,height:915},{width:320,height:568}]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('file:///root/workspace/neon-rogue/index.html');
    await page.waitForTimeout(300);
    await page.click('#actionBtn');
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const app = document.querySelector('#app').getBoundingClientRect();
      const keys = [...document.querySelectorAll('.key')].map(k => k.getBoundingClientRect());
      const stage = document.querySelector('#stage').getBoundingClientRect();
      return {
        docH: document.documentElement.scrollHeight, innerH: innerHeight,
        docW: document.documentElement.scrollWidth, innerW: innerWidth,
        app: [app.x, app.y, app.width, app.height],
        stage: [stage.x, stage.y, stage.width, stage.height],
        keyMinW: Math.min(...keys.map(k => k.width)),
        keyMaxBottom: Math.max(...keys.map(k => k.bottom)),
      };
    });
    // fps
    const fps = await page.evaluate(() => new Promise(res => {
      let n = 0; const t0 = performance.now();
      const tick = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(tick); else res(Math.round(n / ((performance.now() - t0) / 1000))); };
      requestAnimationFrame(tick);
    }));
    await page.screenshot({ path: `/tmp/nd-${vp.width}x${vp.height}.png` });
    console.log(vp.width + 'x' + vp.height, JSON.stringify(m), 'fps~' + fps, errs.length ? 'ERR:' + errs.join('|') : 'no-errors');
    await ctx.close();
  }
  await browser.close();
})();
