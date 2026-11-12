const { chromium } = require('playwright'), path = require('path'), assert = require('assert'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.addInitScript(() => { localStorage.setItem('neon-depth-mute', '1'); localStorage.removeItem('neon-depth-run'); const ch = {}; for (let i = 1; i <= 13; i++) ch['ch' + String(i).padStart(2, '0')] = 1; localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1, boss_15: 1, boss_5: 1, boss_10: 1 }, chapters: ch })); });
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html'));
  const skipScenes = async () => { for (let i = 0; i < 80; i++) { const b2 = await page.$('#sceneNext, #sceneSkip, [data-scene-next], .scene-skip'); if (!b2) break; await b2.click().catch(() => {}); await page.waitForTimeout(30); } };
  const res = await page.evaluate(async () => {
    const N = window.__neon, G = N.G, T = N.test, B = T.b16, out = []; const ok = (n, p, d) => out.push({ n, p: !!p, d });
    const close = () => { T.hideOverlay(); G.paused = false; G.busy = false; G.modal = null; G.storyQueue = []; G.pendingBoard = null; };
    ok('主线 1-13 章解开后开放 B16', B.b16Open());
    G.classId = 'ghost'; G.trainPending = false; N.startGame(); close(); G.adaptBonus = 999;
    ['eye_red', 'hand_red', 'body_red'].forEach(id => N.applyMod(N.mods.find(m => m.id === id))); close();
    G.depth = 15; N.startFloor(); close();
    const boss = G.enemies.find(e => e.boss); boss.hp = 0; N.killEnemy(boss); close();
    ok('打完 B15 出现隐藏通道选项', G.pendingPassage && G.extract);
    B.maybeShowPassage(); ok('通道弹窗', !!document.querySelector('#psGo')); document.querySelector('#psGo').click(); close();
    ok('进入 B16 生产层', G.depth === 16 && G.b16 && G.b16.phase === 'lines' && G.enemies.filter(e => e.corpObj === 'line').length === 3);
    const seen = {}, Q = [[N.p.x, N.p.y]]; seen[N.p.x + ',' + N.p.y] = 1; while (Q.length) { const [x, y] = Q.shift(); [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (G.map[ny] && G.map[ny][nx] === 0 && !seen[nx + ',' + ny]) { seen[nx + ',' + ny] = 1; Q.push([nx, ny]); } }); }
    let floors = 0; G.map.forEach(r => r.forEach(v => { if (!v) floors++; })); ok('风车地图全部连通', Object.keys(seen).length === floors, [Object.keys(seen).length, floors]);
    const n0 = G.enemies.length; for (let i = 0; i < 6; i++) { G.busy = false; G.modal = null; G.paused = false; B.endTurn(); close(); } ok('生产线源源不断出兵', G.enemies.length > n0, [n0, G.enemies.length]);
    ok('有预制玩家', G.enemies.some(e => e.clone));
    G.enemies.filter(e => e.corpObj === 'line').forEach(e => { e.hp = 0; N.killEnemy(e); });
    ok('三条线切断后进入会面', G.b16.phase === 'meet');
    close(); B.b16Campaign(0); close();
    ok('战役 1：沈岚（突袭）打卡隆', G.classId === 'assault' && G.enemies.some(e => e.b16Boss === 'kharon') && Object.keys(G.cyber).length >= 3, [G.classId, Object.keys(G.cyber).length]);
    ok('换人后职业升级满、资源满', Object.values(G.gunUp).length > 0 && G.energy === G.energyMax && N.p.hp === N.p.maxHp);
    for (let i = 0; i < 3; i++) {
      const bb = G.enemies.find(e => e.b16Boss); bb.hp = 0; N.killEnemy(bb); close(); await new Promise(r => setTimeout(r, 700)); close();
      if (i < 2) { B.b16Campaign(i + 1); close(); ok('战役 ' + (i + 2) + ' 角色正确', G.classId === ['engineer', 'ghost'][i] && G.enemies.some(e => e.b16Boss === ['dome', 'mobius'][i])); }
      if (i === 0) {}
    }
    G.b16.camp = 2; B.b16Finale; 
    return out;
  });
  res.forEach(c => console.log((c.p ? '✓ ' : '✗ ') + c.n + (c.p ? '' : ' ' + String(JSON.stringify(c.d)).slice(0, 300))));
  // finale + han dream
  const fin = await page.evaluate(async () => {
    const N = window.__neon, G = N.G, B = N.test.b16; G.state = 'play'; G.busy = false; G.modal = null;
    B.b16Finale(); return true;
  });
  for (let i = 0; i < 60; i++) { const btn = await page.$('.scene button, #sceneNext, #sceneSkip'); if (!btn) break; await btn.click().catch(() => {}); await page.waitForTimeout(40); }
  await page.waitForTimeout(1200);
  const r2 = await page.evaluate(async () => {
    const N = window.__neon, G = N.G, B = N.test.b16, out = []; const ok = (n, p, d) => out.push({ n, p: !!p, d });
    ok('谢幕后通关计数与存档快照', N.meta.cleared >= 1 && N.meta.lastClear, [N.meta.cleared, G.state]);
    N.test.hideOverlay(); G.state = 'menu'; G._hanAsked = false; const c0 = N.meta.cores; B.maybeHanDream(); ok('老韩提议刻超梦', !!document.querySelector('#hdYes')); document.querySelector('#hdYes').click();
    ok('刻超梦得 10000 核心', N.meta.cores >= c0 + 10000 && N.meta.myDream);
    G._hanAsked = false; ok('刻过后不再提议', !B.maybeHanDream());
    const k = B.buildMineKit(); ok('个人超梦可用', k && k.from === 16);
    return out;
  });
  r2.forEach(c => console.log((c.p ? '✓ ' : '✗ ') + c.n + (c.p ? '' : ' ' + String(JSON.stringify(c.d)).slice(0, 300))));
  const all = res.concat(r2); all.push({ n: '无脚本异常', p: errs.length === 0, d: errs }); console.log(errs.length ? '✗ 无脚本异常 ' + JSON.stringify(errs).slice(0, 400) : '✓ 无脚本异常');
  await b.close(); assert(all.every(c => c.p));
})().catch(e => { console.error(e); process.exit(1); });
