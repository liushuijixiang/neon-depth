const { chromium } = require('/root/workspace/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto('file:///root/workspace/neon-rogue/index.html');
  await page.click('#actionBtn');
  const out = await page.evaluate(async () => {
    const { G, doMove } = window.__neon;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const W = 44, H = 30;
    function pathTo(tx, ty) {
      const prev = Array.from({ length: H }, () => new Array(W).fill(null));
      const seen = Array.from({ length: H }, () => new Array(W).fill(false));
      const q = [[G.player.x, G.player.y]]; seen[G.player.y][G.player.x] = true;
      const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
      while (q.length) {
        const [x, y] = q.shift();
        if (x === tx && y === ty) { const path = []; let cx = x, cy = y; while (!(cx === G.player.x && cy === G.player.y)) { path.push([cx, cy]); const p = prev[cy][cx]; if(!p) return null; cx = p[0]; cy = p[1]; } return path.reverse(); }
        for (const [dx, dy] of dirs) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; if (G.map[ny][nx] === 1 || seen[ny][nx]) continue; seen[ny][nx] = true; prev[ny][nx] = [x, y]; q.push([nx, ny]); }
      }
      return null;
    }
    function goal() {
      const p = G.player;
      const near = (list) => { let b = null, bd = Infinity; for (const o of list) { const d = Math.abs(o.x - p.x) + Math.abs(o.y - p.y); if (d < bd) { bd = d; b = o; } } return b; };
      if (p.hp < p.maxHp * 0.55 && G.items.length) { const it = near(G.items); return [it.x, it.y]; }
      if (G.enemies.length) { const e = near(G.enemies); return [e.x, e.y]; }
      if (G.stairs) return [G.stairs.x, G.stairs.y];
      return null;
    }
    let steps = 0, stuckInfo = null, lastPos = '';
    while (G.state === 'play' && steps < 400) {
      steps++;
      const p = G.player;
      const adj = G.enemies.filter(e => Math.max(Math.abs(e.x - p.x), Math.abs(e.y - p.y)) <= 1).sort((a, b) => a.hp - b.hp)[0];
      const before = p.x + ',' + p.y;
      if (adj) doMove(adj.x - p.x, adj.y - p.y);
      else {
        const g = goal();
        const path = g ? pathTo(g[0], g[1]) : null;
        if (path && path.length) doMove(path[0][0] - p.x, path[0][1] - p.y);
        else { stuckInfo = { g, stairs: G.stairs, enemies: G.enemies.map(e => [e.x, e.y, e.type]), items: G.items.map(i => [i.x, i.y, i.kind]), pos: [p.x, p.y], busy: G.busy, depth: G.depth, mapAround: [] }; 
          for (let yy = p.y - 2; yy <= p.y + 2; yy++) { let row = ''; for (let xx = p.x - 2; xx <= p.x + 2; xx++) row += (xx<0||yy<0||xx>=W||yy>=H) ? '?' : (G.map[yy][xx] === 1 ? '#' : '.'); stuckInfo.mapAround.push(row); }
          break; }
      }
      await sleep(5);
      if (G.busy) await sleep(450);
    }
    return { steps, state: G.state, depth: G.depth, hp: G.player.hp, kills: G.kills, stuckInfo };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
