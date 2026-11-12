const { chromium } = require('/root/workspace/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto('file:///root/workspace/neon-rogue/index.html');
  await page.waitForTimeout(300);
  await page.click('#actionBtn');
  await page.waitForTimeout(300);

  const result = await page.evaluate(async () => {
    const { G, doMove } = window.__neon;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const W = 44, H = 30;
    const trace = [];
    let steps = 0;
    let lastDepth = G.depth;

    function pathTo(tx, ty) {
      const prev = Array.from({ length: H }, () => new Array(W).fill(null));
      const seen = Array.from({ length: H }, () => new Array(W).fill(false));
      const q = [[G.player.x, G.player.y]];
      seen[G.player.y][G.player.x] = true;
      const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
      while (q.length) {
        const [x, y] = q.shift();
        if (x === tx && y === ty) {
          const path = [];
          let cx = x, cy = y;
          while (!(cx === G.player.x && cy === G.player.y)) {
            path.push([cx, cy]);
            const p = prev[cy][cx];
            cx = p[0]; cy = p[1];
          }
          return path.reverse();
        }
        for (const [dx, dy] of dirs) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          if (G.map[ny][nx] === 1 || seen[ny][nx]) continue;
          seen[ny][nx] = true;
          prev[ny][nx] = [x, y];
          q.push([nx, ny]);
        }
      }
      return null;
    }

    function nearest(list) {
      const p = G.player;
      let best = null, bd = Infinity;
      for (const o of list) {
        const d = Math.abs(o.x - p.x) + Math.abs(o.y - p.y);
        if (d < bd) { bd = d; best = o; }
      }
      return best;
    }
    function goal() {
      const p = G.player;
      // 像人一点：缺血先找修复包
      const usable = G.items.filter(i => !(i.kind === 'heal' && p.hp >= p.maxHp));
      if (p.hp < p.maxHp * 0.55 && usable.length) {
        const it = nearest(usable);
        return [it.x, it.y];
      }
      // 清敌人
      if (G.enemies.length) {
        let best = null, bd = Infinity;
        for (const e of G.enemies) {
          const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
          if (d < bd) { bd = d; best = e; }
        }
        return [best.x, best.y];
      }
      if (usable.length) {
        let best = null, bd = Infinity;
        for (const it of usable) {
          const d = Math.abs(it.x - p.x) + Math.abs(it.y - p.y);
          if (d < bd) { bd = d; best = it; }
        }
        return [best.x, best.y];
      }
      if (G.stairs) return [G.stairs.x, G.stairs.y];
      return null;
    }

    while (G.state === 'play' && steps < 3000) {
      steps++;
      const p = G.player;
      const adj = G.enemies
        .filter(e => Math.max(Math.abs(e.x - p.x), Math.abs(e.y - p.y)) <= 1)
        .sort((a, b) => a.hp - b.hp)[0];
      if (adj) {
        doMove(adj.x - p.x, adj.y - p.y);
      } else {
        const g = goal();
        const path = g ? pathTo(g[0], g[1]) : null;
        if (path && path.length) {
          const [nx, ny] = path[0];
          doMove(nx - p.x, ny - p.y);
        } else {
          doMove(0, 0);
        }
      }
      if (G.depth !== lastDepth) {
        trace.push({ depth: G.depth, hp: G.player.hp, level: G.player.level, atk: G.player.atk, kills: G.kills, turn: G.turn });
        lastDepth = G.depth;
      }
      await sleep(10);
      if (G.busy) await sleep(500);
    }
    return {
      state: G.state, depth: G.depth, hp: G.player.hp, maxHp: G.player.maxHp,
      level: G.player.level, atk: G.player.atk, kills: G.kills, steps, trace,
      enemiesLeft: G.enemies.length
    };
  });

  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/nd-bot-end.png' });
  console.log(JSON.stringify({ result, errors }, null, 2));
  await browser.close();
})();
