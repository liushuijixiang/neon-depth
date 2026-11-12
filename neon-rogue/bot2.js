const { chromium } = require('/root/workspace/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  for (let run = 1; run <= 2; run++) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file:///root/workspace/neon-rogue/index.html');
    await page.waitForTimeout(250);
    await page.click('#actionBtn');
    await page.waitForTimeout(250);

    const res = await page.evaluate(async () => {
      const N = window.__neon, G = N.G;
      const P = () => N.p;
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const W = 44, H = 30;
      function pathTo(tx, ty) {
        const prev = Array.from({ length: H }, () => new Array(W).fill(null));
        const seen = Array.from({ length: H }, () => new Array(W).fill(false));
        const q = [[P().x, P().y]]; seen[P().y][P().x] = true;
        const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
        while (q.length) {
          const [x, y] = q.shift();
          if (x === tx && y === ty) { const path = []; let cx = x, cy = y; while (!(cx === P().x && cy === P().y)) { path.push([cx, cy]); const pr = prev[cy][cx]; if (!pr) return null; cx = pr[0]; cy = pr[1]; } return path.reverse(); }
          for (const [dx, dy] of dirs) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; if (G.map[ny][nx] === 1 || seen[ny][nx]) continue; seen[ny][nx] = true; prev[ny][nx] = [x, y]; q.push([nx, ny]); }
        }
        return null;
      }
      function near(list) { let b = null, bd = Infinity; for (const o of list) { const d = Math.abs(o.x - P().x) + Math.abs(o.y - P().y); if (d < bd) { bd = d; b = o; } } return b; }
      let steps = 0, lastDepth = G.depth, trace = [];
      while (G.state === 'play' && steps < 2500) {
        steps++;
        const p = P();
        // 低血用道具
        if (G.inv.length && p.hp < p.maxHp * 0.45) { N.useConsumable(0); await sleep(30); continue; }
        const adj = G.enemies.filter(e => Math.max(Math.abs(e.x - p.x), Math.abs(e.y - p.y)) <= 1).sort((a, b) => a.hp - b.hp)[0];
        const heals = G.items.filter(it => it.it && it.it.kind === 'heal' && p.hp < p.maxHp);
        let g = null;
        if (p.hp < p.maxHp * 0.55 && heals.length) { const it = near(heals); g = [it.x, it.y]; }
        else if (G.enemies.length) { const e = near(G.enemies); g = [e.x, e.y]; }
        else if (G.stairs) g = [G.stairs.x, G.stairs.y];
        if (adj) N.doMove(adj.x - p.x, adj.y - p.y);
        else { const path = g ? pathTo(g[0], g[1]) : null; if (path && path.length) N.doMove(path[0][0] - p.x, path[0][1] - p.y); else N.doMove(0, 0); }
        if (G.depth !== lastDepth) { trace.push({ d: G.depth, hp: Math.round(P().hp), max: P().maxHp, lv: P().level, kills: G.kills }); lastDepth = G.depth; }
        await sleep(6);
        if (G.busy) await sleep(460);
        if (G.paused && G.modal === 'skill') { document.querySelector('#overlay.show .scard') && document.querySelector('#overlay.show .scard').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await sleep(40); }
      }
      return { state: G.state, depth: G.depth, hp: Math.round(P().hp), maxHp: P().maxHp, level: P().level, kills: G.kills, steps, trace, skills: Object.keys(G.skills).length, quests: G.quests.filter(q => q.done).length };
    });
    console.log('run', run, JSON.stringify(res), 'errors', errors.length ? errors : 'none');
    await page.screenshot({ path: `/tmp/v2-bot-${run}.png` });
    await ctx.close();
  }
  await b.close();
})();
