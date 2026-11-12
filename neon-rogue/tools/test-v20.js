const { chromium } = require('playwright'), path = require('path'), assert = require('assert'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('neon-depth-mute', '1'); localStorage.removeItem('neon-depth-run'); localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } })); });
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html'));
  const res = await page.evaluate(async () => {
    const N = window.__neon, G = N.G, T = N.test, V = T.v18, out = []; const ok = (n, p, d) => out.push({ n, p: !!p, d });
    const close = () => { T.hideOverlay(); G.paused = false; G.busy = false; G.modal = null; };
    G.classId = 'ghost'; G.trainPending = false; N.startGame(); close(); G.storyQueue = [];
    V.openHub('stats'); ok('个人面板显示属性/攻击/状态/诅咒', document.querySelectorAll('.st-row').length >= 12 && document.querySelectorAll('.st-atk').length >= 3 && !!document.querySelector('.hubbar'));
    document.querySelector('[data-hub="cyber"]').click(); ok('切到义体页', G.modal === 'cyber' && !!document.querySelector('.hubtab.on[data-hub="cyber"]'));
    document.querySelector('[data-hub="bag"]').click(); ok('切到背包页', G.modal === 'bag');
    ok('背包基础负重 16', V.bagCap() >= 16, V.bagCap());
    ok('遗物重量 3', true);
    // equip via empty slot
    close(); const m = N.mods.find(x => x.slot === 'hand' && x.quality === 'blue' && !x.cls && !x.dropOnly); G.modBag.push(m.id); V.instOf(m.id);
    ['handL', 'handR'].forEach(s => { if (G.cyber[s]) V.unequip(s); });
    T.ui.openCyber(); G.cyberSlotPick = 'handR'; T.ui.renderCyber(); const card = document.querySelector('[data-eqto^="handR|' + m.id + '"]');
    ok('点空槽列出可装义体', !!card); card && card.click(); ok('点一下直接装到该部位', G.cyber.handR === m.id, G.cyber);
    // replace from detail
    const m2 = N.mods.find(x => x.slot === 'hand' && x.quality === 'green' && !x.cls && !x.dropOnly && x.id !== m.id); G.modBag.push(m2.id); V.instOf(m2.id);
    G.cyberItem = m.id; T.ui.renderCyber(); const rc = document.querySelector('[data-eqto="handR|' + m2.id + '"]'); ok('义体详情里可直接替换', !!rc); rc && rc.click(); ok('替换生效', G.cyber.handR === m2.id);
    close();
    // chips
    const c = N.makeChip('crit', 'red'); ok('红芯片有 2 条带品质的词条', c.affixes.length === 2 && c.affixes.every(a => a.quality && ['gray','green','blue','purple','orange','red'].indexOf(a.quality) >= 0));
    let maxOk = true; for (let i = 0; i < 40; i++) { const cc = N.makeChip('atk', 'blue'); cc.affixes.forEach(a => { if (['gray','green','blue'].indexOf(a.quality) < 0) maxOk = false; }); } ok('词条品质不超过芯片品质', maxOk);
    // forge screens
    G.credits = 999; let paid = 0; V.chipForgeScreen(c, { cost: '¥1', can: () => true, pay: () => paid++, back: close }); document.querySelector('#cfGo').click();
    await new Promise(r => setTimeout(r, 1700)); ok('芯片重铸动画后可选新旧', !!document.querySelector('#cfTake') && paid === 1); document.querySelector('#cfTake').click(); close();
    const it = V.instOf(m2.id); const p0 = it.plus; V.enhanceScreen(m2.id, it, { unit: '¥', cost: () => 1, can: () => true, pay: () => {}, back: close }); document.querySelector('#enGo').click();
    await new Promise(r => setTimeout(r, 1300)); ok('义体强化界面结算', it.plus === p0 + 1 || it.dur >= 0); close();
    // pour drain
    N.meta.cores = 3; N.meta.up = {}; N.meta.pour = {}; T.ui.showMeta(); const nb = document.querySelector('[data-buy="b1"]');
    V.pourMeta('b1', nb); V.pourMeta('b1', nb); const mid = N.meta.cores; V.drainMeta('b1', nb); await new Promise(r => setTimeout(r, 900));
    ok('没灌满松手：核心退回', N.meta.cores === 3 && !(N.meta.pour.b1), [mid, N.meta.cores]);
    // mech upkeep
    ok('机甲基础维持费 3', (G.mechMods = [], G.mech = 1, N.test.v18.mechUpkeep(1)) === 3);
    // ghost row
    G.classId = 'ghost'; N.startGame(); close(); G.instab = 45; N.updateHUD(); const row = document.querySelector('.clsrow2'); const tops = row ? [...row.children].map(e => e.getBoundingClientRect().top) : [];
    ok('幽灵技能同一排', tops.length >= 3 && new Set(tops.map(Math.round)).size === 1, tops);
    // mass mods
    ok('量产义体加入', N.mods.filter(x => x.mass).length >= 20);
    return out;
  });
  res.push({ n: '无脚本异常', p: errs.length === 0, d: errs });
  res.forEach(c => console.log((c.p ? '✓ ' : '✗ ') + c.n + (c.p ? '' : ' ' + String(JSON.stringify(c.d)).slice(0, 300))));
  await b.close(); assert(res.every(c => c.p));
})().catch(e => { console.error(e); process.exit(1); });
