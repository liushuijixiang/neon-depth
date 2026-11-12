const { chromium } = require('/root/workspace/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto('file:///root/workspace/neon-rogue/index.html');
  await page.waitForTimeout(300);
  await page.click('#actionBtn');

  await page.evaluate(() => {
    const { G, doMove } = window.__neon;
    const W = 44, H = 30;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    window.__bot = async (steps) => {
      const pathTo = (tx, ty) => {
        const prev = Array.from({ length: H }, () => new Array(W).fill(null));
        const seen = Array.from({ length: H }, () => new Array(W).fill(false));
        const q = [[G.player.x, G.player.y]]; seen[G.player.y][G.player.x] = true;
        const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
        while (q.length) {
          const [x, y] = q.shift();
          if (x === tx && y === ty) { const path = []; let cx = x, cy = y; while (!(cx === G.player.x && cy === G.player.y)) { path.push([cx, cy]); const p = prev[cy][cx]; if (!p) return null; cx = p[0]; cy = p[1]; } return path.reverse(); }
          for (const [dx, dy] of dirs) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; if (G.map[ny][nx] === 1 || seen[ny][nx]) continue; seen[ny][nx] = true; prev[ny][nx] = [x, y]; q.push([nx, ny]); }
        }
        return null;
      };
      const nearest = list => { let b = null, bd = Infinity; for (const o of list) { const d = Math.abs(o.x - G.player.x) + Math.abs(o.y - G.player.y); if (d < bd) { bd = d; b = o; } } return b; };
      for (let i = 0; i < steps && G.state === 'play'; i++) {
        const p = G.player;
        const adj = G.enemies.filter(e => Math.max(Math.abs(e.x - p.x), Math.abs(e.y - p.y)) <= 1).sort((a, b) => a.hp - b.hp)[0];
        let g = null;
        const usable = G.items.filter(it => !(it.kind === 'heal' && p.hp >= p.maxHp));
        if (p.hp < p.maxHp * 0.55 && usable.length) { const it = nearest(usable); g = [it.x, it.y]; }
        else if (G.enemies.length) { const e = nearest(G.enemies); g = [e.x, e.y]; }
        else if (usable.length) { const it = nearest(usable); g = [it.x, it.y]; }
        else if (G.stairs) g = [G.stairs.x, G.stairs.y];
        if (adj) doMove(adj.x - p.x, adj.y - p.y);
        else {
          const path = g ? pathTo(g[0], g[1]) : null;
          if (path && path.length) doMove(path[0][0] - p.x, path[0][1] - p.y);
          else doMove(0, 0);
        }
        await sleep(8);
        if (G.busy) await sleep(480);
      }
      return { state: G.state, depth: G.depth, hp: G.player.hp, level: G.player.level, kills: G.kills };
    };
  });

  for (let i = 1; i <= 3; i++) {
    const r = await page.evaluate(n => window.__bot(90), i);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `/tmp/nd-run-${i}.png` });
    console.log(i, JSON.stringify(r));
  }
  await browser.close();
})();
