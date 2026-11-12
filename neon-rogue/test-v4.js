const { chromium } = require('/root/workspace/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGE ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto('file:///root/workspace/neon-rogue/dist.html');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/v4-menu.png' });

  // 局外养成
  await page.evaluate(() => { window.__neon.meta.cores = 500; });
  await page.click('#menuMeta');
  await page.waitForTimeout(250);
  await page.screenshot({ path: '/tmp/v4-meta.png' });
  const metaBefore = await page.evaluate(() => ({ cores: window.__neon.meta.cores, up: JSON.parse(JSON.stringify(window.__neon.meta.up)) }));
  await page.click('[data-buy="hp"]');
  await page.waitForTimeout(250);
  const metaAfter = await page.evaluate(() => ({ cores: window.__neon.meta.cores, up: window.__neon.meta.up.hp, val: localStorage.getItem('neon-depth-meta') }));
  console.log('meta', metaBefore, '->', metaAfter);
  await page.click('#backMenu');
  await page.waitForTimeout(200);

  // 选工程师
  await page.click('[data-cls="engineer"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: '/tmp/v4-menu-engineer.png' });
  await page.click('#actionBtn');
  await page.waitForTimeout(350);
  console.log('start:', await page.evaluate(() => ({
    modal: window.__neon.G.modal, classId: window.__neon.G.classId,
    skills: Object.keys(window.__neon.G.skills), pending: window.__neon.p.pending,
    maxHp: window.__neon.p.maxHp, bar: [...document.querySelectorAll('.abtn')].map(x => x.textContent.trim())
  })));
  await page.screenshot({ path: '/tmp/v4-firstpick.png' });
  if (await page.$('#overlay.show .scard')) await page.click('#overlay.show .scard');
  await page.waitForTimeout(250);

  // 转职
  await page.evaluate(() => { const N = window.__neon; N.p.level = 4; N.p.xp = 0; N.p.next = 16; N.gainXp(20); N.maybeShowEvolution(); });
  await page.waitForTimeout(250);
  console.log('evo modal:', await page.evaluate(() => ({ modal: window.__neon.G.modal, cards: document.querySelectorAll('[data-spec]').length })));
  await page.screenshot({ path: '/tmp/v4-evo.png' });
  if (await page.$('[data-spec]')) await page.click('[data-spec]');
  await page.waitForTimeout(200);
  console.log('spec:', await page.evaluate(() => ({ spec: window.__neon.G.spec, F: window.__neon.G.specF, run: window.__neon.G.runMod })));

  // 模组
  const mod = await page.evaluate(() => {
    const N = window.__neon;
    N.applyMod(window.__neon.mods.find(m => m.id === 'triple_shot'));
    return { mods: window.__neon.G.mods, bar: [...document.querySelectorAll('.abtn')].map(x => x.textContent.trim()) };
  });
  console.log('mod:', mod);

  // 连杀
  const combo = await page.evaluate(() => {
    const N = window.__neon, G = N.G;
    G.turn = 10; G.lastKill = 9;
    const spec = window.NEON.monsters.find(m => m.ai === 'chase');
    for (let i = 0; i < 3; i++) {
      G.enemies.push({ spec, id: spec.id, name: spec.name, ai: 'chase', glyph: spec.glyph, color: spec.color, x: N.p.x + 2, y: N.p.y, hp: 1, maxHp: 1, atk: 1, def: 0, xp: 1, range: 0, cd: 0, tick: 0, stun: 0, alerted: false, boss: false, buffs: [] });
    }
    G.combo = 0; G.lastKill = -99;
    return { before: G.combo };
  });
  await page.evaluate(() => {
    const N = window.__neon, G = N.G;
    G.enemies.slice(-3).forEach(e => { const i = G.enemies.indexOf(e); if (i >= 0) G.enemies.splice(i, 1); });
    G.combo = 3; G.lastKill = G.turn; N.updateHUD();
  });
  console.log('combo chip:', await page.evaluate(() => ({ text: document.querySelector('#combo').textContent, shown: document.querySelector('#combo').style.display, cls: document.querySelector('#cls').textContent })));
  await page.screenshot({ path: '/tmp/v4-play.png' });
  console.log('errors:', errors);
  await b.close();
})();
