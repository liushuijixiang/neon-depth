const { chromium } = require('/root/workspace/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  await page.goto('file:///root/workspace/neon-rogue/index.html');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/v2-menu.png' });
  console.log('content loaded:', await page.evaluate(() => ({
    m: window.NEON.monsters.length, s: window.NEON.skills.length, i: window.NEON.items.length,
    b: window.NEON.buffs.length, c: window.NEON.consumables.length, q: window.NEON.quests.length, a: window.NEON.achievements.length
  })));

  await page.click('#actionBtn');
  await page.waitForTimeout(300);
  console.log('start:', await page.evaluate(() => ({ state: window.__neon.G.state, hp: window.__neon.p.hp, x: window.__neon.p.x, y: window.__neon.p.y, enemies: window.__neon.G.enemies.length, items: window.__neon.G.items.length })));
  await page.screenshot({ path: '/tmp/v2-play.png' });

  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  for (let i = 0; i < 50; i++) {
    await page.evaluate(d => window.__neon.doMove(d[0], d[1]), dirs[Math.floor(Math.random() * dirs.length)]);
    await page.waitForTimeout(8);
    if (i % 10 === 0) {
      const st = await page.evaluate(() => ({ state: window.__neon.G.state, hp: window.__neon.p.hp, depth: window.__neon.G.depth }));
      if (st.state !== 'play') break;
    }
  }
  let st = await page.evaluate(() => ({ state: window.__neon.G.state, hp: Math.round(window.__neon.p.hp), maxHp: window.__neon.p.maxHp, depth: window.__neon.G.depth, kills: window.__neon.G.kills, lvl: window.__neon.p.level, inv: window.__neon.G.inv.length, quests: window.__neon.G.quests.map(q => q.def.id + ' ' + q.progress + '/' + q.target) }));
  console.log('after walk:', st);

  // 升级三选一
  await page.evaluate(() => {
    const N = window.__neon;
    N.G.busy = false; N.G.paused = false;
    N.p.pending = 0;
    N.gainXp(N.p.next);
    N.maybeShowSkillChoice();
  });
  await page.waitForTimeout(250);
  console.log('skill modal:', await page.evaluate(() => ({ modal: window.__neon.G.modal, cards: document.querySelectorAll('#overlay.show .scard').length, pending: window.__neon.p.pending })));
  await page.screenshot({ path: '/tmp/v2-skill.png' });
  let picks = 0;
  while (await page.$('#overlay.show .scard')) {
    await page.click('#overlay.show .scard');
    await page.waitForTimeout(180);
    if (++picks > 5) break;
  }
  console.log('picked:', picks, await page.evaluate(() => ({ skills: window.__neon.G.skills, mod: window.__neon.G.mod, paused: window.__neon.G.paused })));

  // 菜单
  await page.click('#menuBtn');
  await page.waitForTimeout(250);
  console.log('menu open:', await page.evaluate(() => window.__neon.G.modal));
  await page.screenshot({ path: '/tmp/v2-menu-panel.png' });
  await page.click('[data-tab="quests"]');
  await page.waitForTimeout(150);
  await page.click('[data-tab="ach"]');
  await page.waitForTimeout(150);
  await page.screenshot({ path: '/tmp/v2-ach.png' });
  await page.click('#closeMenu');
  await page.waitForTimeout(200);

  // 道具
  const invRes = await page.evaluate(() => {
    const N = window.__neon;
    N.G.busy = false;
    N.addConsumable(window.NEON.consumables[0]);
    N.addConsumable(window.NEON.consumables[1]);
    N.updateHUD();
    return { inv: N.G.inv.slice(), slots: document.querySelectorAll('.slot[data-i]').length };
  });
  console.log('inv:', invRes);
  await page.screenshot({ path: '/tmp/v2-inv.png' });
  await page.click('.slot[data-i="0"]');
  await page.waitForTimeout(300);
  console.log('after use:', await page.evaluate(() => ({ inv: window.__neon.G.inv.slice(), buffs: window.__neon.p.buffs.map(b => b.id), hp: Math.round(window.__neon.p.hp), state: window.__neon.G.state })));

  // 下潜
  await page.evaluate(() => {
    const N = window.__neon, G = N.G;
    if (G.state !== 'play') { N.startGame(); }
    G.busy = false; G.paused = false;
    N.p.hp = N.p.maxHp;
    if (G.stairs) { N.p.x = G.stairs.x; N.p.y = G.stairs.y; N.doMove(0, 0); }
  });
  await page.waitForTimeout(800);
  console.log('descend:', await page.evaluate(() => ({ depth: window.__neon.G.depth, state: window.__neon.G.state, hp: Math.round(window.__neon.p.hp) })));

  // Boss
  const boss = await page.evaluate(() => {
    const N = window.__neon, G = N.G;
    G.depth = 5; G.busy = false; G.paused = false; G.modal = null;
    N.startFloor();
    const b = G.enemies.find(e => e.boss);
    if (!b) return { boss: null, enemies: G.enemies.length };
    const spots = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
    let placed = null;
    for (const [dx, dy] of spots) {
      const nx = b.x + dx, ny = b.y + dy;
      if (nx >= 0 && ny >= 0 && nx < 44 && ny < 30 && G.map[ny][nx] === 0) { placed = { x: nx, y: ny, dx: -dx, dy: -dy }; break; }
    }
    if (!placed) return { boss: b.name, placed: false };
    N.p.x = placed.x; N.p.y = placed.y; N.p.atk = 999; N.p.hp = N.p.maxHp;
    N.doMove(placed.dx, placed.dy);
    return { boss: b.name, bossHp: b.hp, state: G.state };
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/v2-win.png' });
  console.log('boss:', boss);
  console.log('final:', await page.evaluate(() => ({ state: window.__neon.G.state, overlay: document.querySelector('#overlay').classList.contains('show'), text: document.querySelector('#overlay').innerText.replace(/\n/g, ' | ').slice(0, 120) })));
  console.log('errors:', errors);
  await b.close();
})();
