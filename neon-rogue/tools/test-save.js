// 存档回归：自动保存、恢复后状态一致、继续按钮、结束清档
const { chromium } = require('playwright'), path = require('path'), assert = require('assert'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); let page = await ctx.newPage();
  const errs = []; const hook = pg => pg.on('pageerror', e => errs.push(e.message)); hook(page);
  await page.addInitScript(() => localStorage.setItem('neon-depth-mute', '1'));
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html'));
  const before = await page.evaluate(() => { const N = window.__neon, G = N.G, T = N.test; localStorage.removeItem('neon-depth-run');
    G.classId = 'engineer'; G.trainPending = false; N.startGame(); T.hideOverlay(); G.paused = false; G.pendingBoard = null; N.p.pending = 0; G.storyQueue = [];
    G.depth = 3; N.startFloor(); T.hideOverlay(); G.pendingBoard = null; G.storyQueue = []; G.credits = 77; N.p.hp = 13;
    N.applyMod(N.mods.find(m => m.id === 'hand_purple')); for (let i = 0; i < 3; i++) { G.busy = false; G.paused = false; G.modal = null; T.endTurn(); }
    T.save.saveRun(true);
    return { depth: G.depth, turn: G.turn, credits: G.credits, hp: N.p.hp, enemies: G.enemies.length, ehp: G.enemies.map(e => e.hp).join(), bag: G.modBag.join(), inst: JSON.stringify(G.inst), x: N.p.x, sites: (G.sites || []).length, map: G.map.map(r => r.join('')).join('') }; });
  await page.reload();
  const menu = await page.evaluate(() => !!document.querySelector('#menuContinue'));
  await page.locator('#menuContinue').click();
  const after = await page.evaluate(() => { const N = window.__neon, G = N.G;
    return { depth: G.depth, turn: G.turn, credits: G.credits, hp: N.p.hp, enemies: G.enemies.length, ehp: G.enemies.map(e => e.hp).join(), bag: G.modBag.join(), inst: JSON.stringify(G.inst), x: N.p.x, sites: (G.sites || []).length, map: G.map.map(r => r.join('')).join(''), specOk: G.enemies.every(e => e.spec && e.spec.name), state: G.state }; });
  const checks = [];
  const ok = (n, p, d) => checks.push({ n, p: !!p, d });
  ok('主界面出现继续深潜', menu);
  ['depth', 'turn', 'credits', 'hp', 'enemies', 'ehp', 'bag', 'inst', 'x', 'sites', 'map'].forEach(k => ok('恢复一致 ' + k, before[k] === after[k], [before[k], after[k]].map(v => String(v).slice(0, 60))));
  ok('敌人 spec 引用恢复', after.specOk); ok('恢复后可继续游戏', after.state === 'play');
  const cont = await page.evaluate(() => { const N = window.__neon, G = N.G; G.busy = false; G.paused = false; G.modal = null; const t = G.turn; N.doMove(0, 0); return G.turn > t; });
  ok('恢复后可行动', cont);
  const cleared = await page.evaluate(() => { const N = window.__neon; N.p.hp = 0; N.test.lose(); return !localStorage.getItem('neon-depth-run'); });
  ok('死亡后清除存档', cleared);
  ok('无脚本异常', errs.length === 0, errs);
  checks.forEach(c => console.log((c.p ? '✓ ' : '✗ ') + c.n + (c.p ? '' : ' ' + JSON.stringify(c.d))));
  await b.close(); assert(checks.every(c => c.p));
})().catch(e => { console.error(e); process.exit(1); });
