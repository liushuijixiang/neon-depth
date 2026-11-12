const { chromium } = require('/root/workspace/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  for (const vp of [{width:390,height:600},{width:360,height:560},{width:320,height:520}]) {
    const c = await b.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p = await c.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///root/workspace/neon-rogue/index.html');
    await p.waitForTimeout(250);
    await p.screenshot({ path: `/tmp/menu-${vp.width}x${vp.height}.png` });
    await p.click('#actionBtn');
    await p.waitForTimeout(400);
    const m = await p.evaluate(() => {
      const st = document.querySelector('#stage').getBoundingClientRect();
      const k = document.querySelector('.key').getBoundingClientRect();
      const app = document.querySelector('#app').getBoundingClientRect();
      return { stageH: Math.round(st.height), keyH: Math.round(k.height), appH: Math.round(app.height),
               bottom: Math.round(Math.max(...[...document.querySelectorAll('.key')].map(x => x.getBoundingClientRect().bottom))),
               ih: innerHeight, ow: document.documentElement.scrollWidth };
    });
    await p.screenshot({ path: `/tmp/game-${vp.width}x${vp.height}.png` });
    console.log(vp.width + 'x' + vp.height, JSON.stringify(m), errs.join('|') || 'ok');
    await c.close();
  }
  await b.close();
})();
