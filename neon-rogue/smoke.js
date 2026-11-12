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
  const hasNeon = await page.evaluate(() => !!window.__neon && window.NEON.monsters.length);
  console.log('hasNeon', hasNeon);
  await page.click('#actionBtn');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/v2-play.png' });

  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1],[0,0]];
  for (let i = 0; i < 60; i++) {
    await page.evaluate(d => window.__neon.doMove(d[0], d[1]), dirs[Math.floor(Math.random() * dirs.length)]);
    await page.waitForTimeout(8);
  }
  console.log('walk done');
  const afterWalk = await page.evaluate(() => ({
    state: window.__neon.G.state, depth: window.__neon.G.depth,
    hp: window.__neon.p.hp, maxHp: window.__neon.p.maxHp,
    kills: window.__neon.G.kills, inv: window.__neon.G.inv.length,
    enemies: window.__neon.G.enemies.length, quests: window.__neon.G.quests.map(q => q.def.id + ':' + q.progress + '/' + q.target)
  }));

  // level up → skill choice
  const skill = await page.evaluate(async () => {
    const N = window.__neon;
    N.p.pending = 1;
    N.p.xp = N.p.next;
    N.gainXp(1);
    N.maybeShowSkillChoice();
    return { pending: N.p.pending, modal: N.G.modal, cards: document.querySelectorAll('.scard').length };
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: '/tmp/v2-skill.png' });
  let picks = 0;
  while (await page.$('#overlay.show .scard')) {
    await page.click('.scard');
    await page.waitForTimeout(150);
    picks++;
    if (picks > 4) break;
  }
  const afterSkill = await page.evaluate(() => ({ skills: window.__neon.G.skills, mod: window.__neon.G.mod, paused: window.__neon.G.paused, modal: window.__neon.G.modal }));

  // menu
  await page.click('#menuBtn');
  await page.waitForTimeout(250);
  await page.screenshot({ path: '/tmp/v2-menu-panel.png' });
  await page.click('[data-tab="quests"]');
  await page.waitForTimeout(150);
  await page.click('[data-tab="ach"]');
  await page.waitForTimeout(150);
  await page.screenshot({ path: '/tmp/v2-ach.png' });
  await page.click('#closeMenu');
  await page.waitForTimeout(150);

  // inventory
  const inv = await page.evaluate(() => {
    const N = window.__neon;
    N.addConsumable(window.NEON.consumables[0]);
    N.addConsumable(window.NEON.consumables[1]);
    return { inv: N.G.inv.slice() };
  });
  const before = await page.evaluate(() => ({ hp: window.__neon.p.hp, buffs: window.__neon.p.buffs.length }));
  await page.click('.slot[data-i="0"]');
  await page.waitForTimeout(300);
  const afterUse = await page.evaluate(() => ({ inv: window.__neon.G.inv.slice(), buffs: window.__neon.p.buffs.map(b => b.id), hp: window.__neon.p.hp }));

  // descend
  const desc = await page.evaluate(() => {
    const N = window.__neon, G = N.G;
    if (!G.stairs) return { skip: true };
    N.p.x = G.stairs.x; N.p.y = G.stairs.y;
    N.doMove(0, 0);
    return { busy: G.busy, from: G.depth };
  });
  await page.waitForTimeout(800);
  const depthNow = await page.evaluate(() => window.__neon.G.depth);

  // boss floor + win
  const boss = await page.evaluate(() => {
    const N = window.__neon, G = N.G;
    G.depth = 5; G.busy = false; G.paused = false;
    N.startFloor();
    const b = G.enemies.find(e => e.boss);
    if (!b) return { boss: null, enemies: G.enemies.length };
    const spots = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
    let placed = null;
    for (const [dx, dy] of spots) {
      const nx = b.x + dx, ny = b.y + dy;
      if (nx >= 0 && ny >= 0 && nx < 44 && ny < 30 && G.map[ny][nx] === 0) { placed = { x: nx, y: ny, dx: -dx, dy: -dy }; break; }
    }
    if (!placed) return { boss: b.name, placed: null };
    N.p.x = placed.x; N.p.y = placed.y; N.p.atk = 999; N.p.hp = N.p.maxHp;
    N.doMove(placed.dx, placed.dy);
    return { boss: b.name, hp: b.hp, state: G.state };
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/v2-win.png' });
  const final = await page.evaluate(() => ({ state: window.__neon.G.state, overlay: document.querySelector('#overlay').classList.contains('show'), text: document.querySelector('#overlay').innerText.slice(0, 80) }));

  console.log(JSON.stringify({ hasNeon, afterWalk, skill, afterSkill, inv, before, afterUse, desc, depthNow, boss, final, errors }, null, 2));
  await b.close();
})();
