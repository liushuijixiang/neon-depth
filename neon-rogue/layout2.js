const { chromium } = require('/root/workspace/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  for (const vp of [{ width: 390, height: 600 }, { width: 390, height: 844 }, { width: 360, height: 640 }]) {
    const c = await b.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p = await c.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///root/workspace/neon-rogue/index.html');
    await p.waitForTimeout(250);
    await p.click('#actionBtn');
    await p.waitForTimeout(300);
    await p.evaluate(() => { const N = window.__neon; N.addConsumable(window.NEON.consumables[0]); N.updateHUD(); });
    const m = await p.evaluate(() => {
      const st = document.querySelector('#stage').getBoundingClientRect();
      const inv = document.querySelector('#invbar').getBoundingClientRect();
      const keys = [...document.querySelectorAll('.key')].map(k => k.getBoundingClientRect());
      return { stageH: Math.round(st.height), invTop: Math.round(inv.top), invH: Math.round(inv.height), keyH: Math.round(keys[0].height), bottom: Math.round(Math.max(...keys.map(k => k.bottom))), ih: innerHeight, ow: document.documentElement.scrollWidth };
    });
    console.log(vp.width + 'x' + vp.height, JSON.stringify(m), errs.join('|') || 'ok');
    await p.screenshot({ path: `/tmp/v2-${vp.width}x${vp.height}.png` });
    await c.close();
  }
  await b.close();
})();
