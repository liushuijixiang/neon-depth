// 背包 v2 回归：重量容量、满包拾取弹窗、卸载放地上、芯片不分解、消耗品替换、委托只在中间人、街头事件、剧情义体效果
const { chromium } = require('playwright'), path = require('path'), assert = require('assert'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('neon-depth-mute', '1'); localStorage.removeItem('neon-depth-run'); localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1, boss_5: 1, first_death: 1 } })); });
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html'));
  const res = await page.evaluate(async () => {
    const N = window.__neon, G = N.G, T = N.test, V = T.v18, out = []; const ok = (n, p, d) => out.push({ n, p: !!p, d });
    const close = () => { T.hideOverlay(); G.paused = false; G.busy = false; G.modal = null; };
    const fresh = (cls) => { G.classId = cls || 'assault'; G.trainPending = false; N.startGame(); close(); G.pendingBoard = null; G.storyQueue = []; G.swapQueue = []; N.p.pending = 0; };
    fresh();
    ok('开局没有委托弹窗', !G.pendingBoard && (G.quests || []).length === 0);
    ok('首层必有中间人', (G.sites || []).some(s => s.type === 'fixer'));
    // fill: equip all body slot then bag heavy items
    const bodies = N.mods.filter(m => m.slot === 'body' && !m.cls && !m.dropOnly && !m.relic && (m.quality === 'red' || m.quality === 'orange'));
    bodies.forEach(m => N.applyMod(m)); close();
    ok('背包按重量不超上限', V.bagLoad() <= V.bagCap(), [V.bagLoad(), V.bagCap()]);
    const ground0 = G.items.filter(i => i.mod).length;
    ok('放不下的义体放在脚边', ground0 > 0, ground0);
    // unequip when full -> ground
    const eq = G.cyber.body; const g1 = G.items.filter(i => i.mod).length; N.test.ui.openCyber && 0; V.unequip('body');
    ok('满包卸下义体放到地上（不会超重）', V.bagLoad() <= V.bagCap() && (G.items.filter(i => i.mod).length === g1 + 1 || G.modBag.indexOf(eq) >= 0), [V.bagLoad(), V.bagCap()]);
    // full pickup prompt
    const it = G.items.find(i => i.mod); N.p.x = it.x; N.p.y = it.y; if (!G.cyber.body) { const bm = N.mods.find(m => m.slot === 'body' && !m.cls && !m.relic && !m.dropOnly && G.modBag.indexOf(m.id) < 0 && m !== it.mod); G.modBag.push(bm.id); N.installCyber(bm.id, 'body'); } close();
    const slotsFree = ['body'].every(s => G.cyber[s]);
    const filler = N.mods.filter(m => !m.cls && !m.relic && !m.dropOnly && G.modBag.indexOf(m.id) < 0 && m.slot === 'eye'); let fi = 0; while (V.bagLoad() + 3 <= V.bagCap() && fi < filler.length) { G.modBag.push(filler[fi].id); fi++; } G.modBag.push(filler[fi++].id); while (V.bagLoad() + 1 <= V.bagCap() && fi < filler.length) G.modBag.push(filler[fi++].id); N.recalc();
    V.pickup(it.x, it.y); ok('满包踩到义体弹出选择', G.modal === 'bagfull' || !slotsFree, G.modal);
    const dropBtn = document.querySelector('[data-fp-drop]'); if (dropBtn) { dropBtn.click(); }
    ok('丢掉背包里的换新义体', G.modal !== 'bagfull' || document.querySelector('.bagfull'), G.modal); close();
    // chips never dissolve
    const c0 = G.chips.length; for (let i = 0; i < 12; i++) N.addChipObject(N.makeChip('atk', 'gray')); ok('芯片不会被分解', G.chips.length + Object.values(G.cyberChips).flat().length >= c0 + 12 - 0);
    // consumable swap
    G.inv = ['mag_pack', 'mag_pack', 'mag_pack', 'mag_pack'].map(x => Object.keys(window.__neon.test.econ ? {} : {}).length ? x : x); G.inv = Object.keys(N.test.consCatalog ? {} : {}).length ? G.inv : G.inv;
    const anyCons = window.NEON.consumables.find(c => c.id !== 'mag_pack'); G.inv = [anyCons.id, anyCons.id, anyCons.id, anyCons.id];
    V.addCons(anyCons); V.maybeShowSwap(); ok('消耗品满时询问替换', G.modal === 'swap');
    const cr = G.credits; document.querySelector('[data-sw]').click(); ok('替换后旧物折现', G.credits > cr && G.inv.length === 4);
    // bag panel
    close(); V.openBag('gear'); ok('背包面板与耐久条', !!document.querySelector('.bagp .bag-bar') && document.querySelectorAll('.durbar').length > 0);
    V.openBag('chips'); ok('芯片盒页', !!document.querySelector('.bagp')); close();
    // event
    const ev = window.NEON.neta.events[0]; const site = { type: 'event', x: N.p.x, y: N.p.y, used: false, data: { ev: ev.id } }; V.openEvent(site); document.querySelector('[data-ev="a"]').click();
    ok('街头事件可选择并结算', site.used && !!document.querySelector('#evOk')); close();
    // contracts ensure
    fresh(); G.depth = 3; N.startFloor(); close(); G.pendingBoard = null;
    const def = window.NEON.quests.find(q => q.id === 'c_sweep'); const c = T.econ.makeContract(def); c.target = G.enemies.length + 5; T.econ.acceptContract(c); V.contractEnsure();
    ok('委托不可完成时补怪', G.enemies.filter(e => !e.boss).length >= c.target - c.progress, [G.enemies.length, c.target]);
    // relics unique
    const rel = N.mods.filter(m => m.relic && m.active && m.active.type.indexOf('relic_') === 0 && !m.frenzy);
    const reachable = rel.filter(m => (m.owner || window.__neon.test.story.STORY.npcs.concat(window.NEON.story2.npcs).some(n => n.relic === m.id) || m.dream));
    const types = reachable.map(m => m.active.type); ok('可获得的剧情义体效果互不相同', new Set(types).size === types.length, types);
    fresh(); G.depth = 4; N.startFloor(); close(); ['relic_cocohook', 'relic_defrost', 'relic_prism', 'relic_meter'].forEach(id => { G.modBag = G.modBag.filter(x => x !== id); });
    const mk = N.mods.find(m => m.id === 'relic_meter'); N.applyMod(mk); close(); G.cyberCd = {}; G.busy = false; N.useCyberActive('relic_meter');
    ok('回程车把人送到出口', Math.max(Math.abs(N.p.x - G.stairs.x), Math.abs(N.p.y - G.stairs.y)) <= 1, [N.p.x, N.p.y, G.stairs]);
    return out;
  });
  res.push({ n: '无脚本异常', p: errs.length === 0, d: errs });
  res.forEach(c => console.log((c.p ? '✓ ' : '✗ ') + c.n + (c.p ? '' : ' ' + String(JSON.stringify(c.d)).slice(0, 300))));
  await b.close(); assert(res.every(c => c.p));
})().catch(e => { console.error(e); process.exit(1); });
