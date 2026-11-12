const { chromium } = require('/root/workspace/node_modules/playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto('file:///root/workspace/neon-rogue/index.html');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/nd-menu.png' });

  await page.click('#actionBtn');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/nd-play.png' });

  // layout overflow check
  const layout = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    sh: document.documentElement.scrollHeight,
    iw: innerWidth, ih: innerHeight,
    stage: document.querySelector('#stage').getBoundingClientRect().toJSON(),
    btn: document.querySelector('.key').getBoundingClientRect().toJSON(),
  }));

  // random walk
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1],[0,0]];
  for (let i = 0; i < 160; i++) {
    await page.evaluate(d => window.__neon.doMove(d[0], d[1]), dirs[Math.floor(Math.random() * dirs.length)]);
    await page.waitForTimeout(12);
  }
  const afterWalk = await page.evaluate(() => ({
    state: window.__neon.G.state,
    hp: window.__neon.G.player.hp,
    depth: window.__neon.G.depth,
    enemies: window.__neon.G.enemies.length,
    score: window.__neon.G.score,
  }));
  await page.screenshot({ path: '/tmp/nd-walk.png' });

  // stairs descent test
  const descend = await page.evaluate(async () => {
    const { G, doMove } = window.__neon;
    if (G.state !== 'play') return { ok: false, reason: 'state ' + G.state };
    if (!G.stairs) return { ok: false, reason: 'no stairs' };
    G.player.x = G.stairs.x; G.player.y = G.stairs.y;
    G.player.hp = G.player.maxHp;
    doMove(0, 0);
    return { before: G.depth, stairs: G.stairs };
  });
  await page.waitForTimeout(800);
  const depthAfter = await page.evaluate(() => window.__neon.G.depth);

  // boss floor test
  const bossInfo = await page.evaluate(() => {
    const { G, startFloor } = window.__neon;
    G.depth = 5;
    startFloor();
    const boss = G.enemies.find(e => e.type === 'boss');
    return { depth: G.depth, enemies: G.enemies.length, boss: boss ? { x: boss.x, y: boss.y, hp: boss.hp } : null };
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/nd-boss.png' });

  // win path
  const winInfo = await page.evaluate(() => {
    const { G, doMove } = window.__neon;
    const boss = G.enemies.find(e => e.type === 'boss');
    if (!boss) return { ok: false };
    const spots = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
    let placed = null;
    for (const [dx, dy] of spots) {
      const nx = boss.x + dx, ny = boss.y + dy;
      if (nx >= 0 && ny >= 0 && nx < 44 && ny < 30 && G.map[ny][nx] === 0) { placed = { nx, ny, dx: -dx, dy: -dy }; break; }
    }
    if (!placed) return { ok: false, reason: 'no spot' };
    G.player.x = placed.nx; G.player.y = placed.ny;
    G.player.atk = 999;
    doMove(placed.dx, placed.dy);
    return { ok: true, state: G.state, bossHp: boss.hp };
  });
  await page.waitForTimeout(1400);
  const winState = await page.evaluate(() => ({ state: window.__neon.G.state, overlay: document.querySelector('#overlay').classList.contains('show') }));
  await page.screenshot({ path: '/tmp/nd-win.png' });

  console.log(JSON.stringify({ layout, afterWalk, descend, depthAfter, bossInfo, winInfo, winState, errors }, null, 2));
  await browser.close();
})();
