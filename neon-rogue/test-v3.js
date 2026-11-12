const { chromium } = require('/root/workspace/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto('file:///root/workspace/neon-rogue/index.html');
  await page.waitForTimeout(400);
  console.log('content:', await page.evaluate(() => ({ s: window.NEON.skills.length, b: window.NEON.boons.length, ab: window.NEON.skills.filter(x => x.ability).length })));
  await page.click('#actionBtn');
  await page.waitForTimeout(300);

  // 解锁全部主动技
  const granted = await page.evaluate(() => {
    const N = window.__neon, G = N.G;
    window.NEON.skills.filter(s => s.ability).forEach(s => { G.skills[s.id] = 1; });
    N.p.hp = 200; N.p.maxHp = 200; N.p.level = 10;
    N.updateHUD();
    return { bar: document.querySelectorAll('.abtn').length, ids: [...document.querySelectorAll('.abtn')].map(b => b.textContent.trim()) };
  });
  console.log('abilities bar:', granted);
  await page.screenshot({ path: '/tmp/v3-bar.png' });

  // 先放一只敌人在右边 3 格
  const setup = await page.evaluate(() => {
    const N = window.__neon, G = N.G;
    N.p.face = 0;
    const spots = [];
    for (let dx = 1; dx <= 4; dx++) {
      const x = N.p.x + dx, y = N.p.y;
      if (x < 44 && G.map[y][x] === 0) { spots.push([x, y]); break; }
    }
    if (!spots.length) return { placed: false };
    const spec = window.NEON.monsters.find(m => m.ai === 'chase');
    G.enemies.push({ spec, id: spec.id, name: spec.name, ai: spec.ai, glyph: spec.glyph, color: spec.color, x: spots[0][0], y: spots[0][1], hp: 60, maxHp: 60, atk: 1, def: 0, xp: 5, range: 0, cd: 0, tick: 0, stun: 0, alerted: false, boss: false, buffs: [] });
    N.computeFOV();
    return { placed: true, ex: spots[0][0], ey: spots[0][1] };
  });
  console.log('setup:', setup);

  async function useAb(key) {
    if (key === 2) await page.evaluate(() => { const N = window.__neon; const e = N.G.enemies[0]; if (e) { e.x = N.p.x + 1; e.y = N.p.y; } N.computeFOV(); });
    if (key === 4) await page.evaluate(() => { const N = window.__neon; const e = N.G.enemies[0]; if (e) { e.x = N.p.x + 6; e.y = N.p.y; } N.computeFOV(); });
    await page.evaluate(() => { window.__neon.G.cd = {}; window.__neon.G.paused = false; window.__neon.G.busy = false; });
    const btn = await page.$(`.abtn:nth-child(${key})`);
    if (!btn) return 'no-btn';
    await btn.click();
    await page.waitForTimeout(200);
    return page.evaluate(() => ({
      cd: window.__neon.G.cd, allies: window.__neon.G.allies.map(a => a.kind),
      walls: window.__neon.G.walls.length, stealth: window.__neon.G.stealth,
      grow: window.__neon.p.buffs.some(b => b.id === 'grow'), hp: Math.round(window.__neon.p.hp),
      state: window.__neon.G.state, modal: window.__neon.G.modal,
    }));
  }
  for (let i = 1; i <= 8; i++) {
    const r = await useAb(i);
    console.log('ability', i, JSON.stringify(r));
    if (i === 6) await page.screenshot({ path: '/tmp/v3-abilities.png' });
  }

  // 机遇二选一
  await page.evaluate(() => { const N = window.__neon; N.G.pendingBoons = 1; N.G.paused = false; N.G.busy = false; N.maybeShowBoon(); });
  await page.waitForTimeout(250);
  console.log('boon modal:', await page.evaluate(() => ({ modal: window.__neon.G.modal, cards: document.querySelectorAll('[data-boon]').length })));
  await page.screenshot({ path: '/tmp/v3-boon.png' });
  await page.click('[data-boon]');
  await page.waitForTimeout(250);
  console.log('boon picked:', await page.evaluate(() => ({ boons: window.__neon.G.boons, runMod: window.__neon.G.runMod, curse: window.__neon.G.curse, paused: window.__neon.G.paused })));

  // 道具说明 + 使用
  await page.evaluate(() => { const N = window.__neon; N.addConsumable(window.NEON.consumables[0]); N.updateHUD(); });
  await page.click('.slot[data-i="0"]');
  await page.waitForTimeout(250);
  console.log('item sheet:', await page.evaluate(() => ({ modal: window.__neon.G.modal, text: document.querySelector('#overlay').innerText.replace(/\n/g, ' | ').slice(0, 120) })));
  await page.screenshot({ path: '/tmp/v3-item.png' });
  await page.click('#useItem');
  await page.waitForTimeout(300);
  console.log('after use:', await page.evaluate(() => ({ inv: window.__neon.G.inv.length, state: window.__neon.G.state, cd: window.__neon.G.cd })));

  // 图鉴
  await page.evaluate(() => { const N = window.__neon; N.G.paused = false; N.G.busy = false; N.G.state = 'play'; });
  await page.click('#menuBtn');
  await page.waitForTimeout(200);
  await page.click('[data-tab="codex"]');
  await page.waitForTimeout(200);
  console.log('codex:', await page.evaluate(() => ({ text: document.querySelector('.plist').innerText.slice(0, 160).replace(/\n/g, ' | '), codex: { m: Object.keys(window.__neon.G.codex.monsters).length, i: Object.keys(window.__neon.G.codex.items).length, c: Object.keys(window.__neon.G.codex.consumables).length } })));
  await page.screenshot({ path: '/tmp/v3-codex.png' });

  console.log('errors:', errors);
  await b.close();
})();
