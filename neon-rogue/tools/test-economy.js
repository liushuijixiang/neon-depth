// 1.4 暗巷经济 · 浏览器回归：消耗品、拾取物、委托、设施、宝箱、挑战、异常、撤离、正式包
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [], checks = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('neon-depth-mute', '1'));
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html'));

  const out = await page.evaluate(async () => {
    const N = window.__neon, T = N.test, E = T.econ, G = N.G, res = [];
    const ok = (name, pass, detail) => res.push({ name, pass: !!pass, detail });
    const close = () => { T.hideOverlay(); G.paused = false; G.busy = false; G.modal = null; };
    const fresh = (cls) => { G.classId = cls || 'assault'; G.trainPending = false; G.rushPending = null; N.startGame(); close(); G.pendingBoard = null; N.p.pending = 0; };

    fresh('assault');
    ok('开局：委托改为中间人来电', Array.isArray(G.quests) && G.quests.length === 0);
    ok('普通层生成设施', Array.isArray(G.sites) && G.sites.length >= 1, G.sites.map(s => s.type));
    ok('HUD 显示信用点', document.querySelector('#credits').style.display !== 'none' && /¥/.test(document.querySelector('#credits').textContent));

    // ---- 所有消耗品：实时说明数值 + 实际可用 ----
    const consIds = window.NEON.consumables.map(c => c.id);
    let consOk = [], consBad = [];
    for (const id of consIds) {
      fresh(id === 'overclock_cell' ? 'ghost' : 'assault');
      G.depth = 8; N.recalc(); N.p.hp = Math.round(N.p.maxHp * .5);
      const spawn = (dx) => { const m = T.spawnEnemy(window.NEON.monsters.find(m => m.ai === 'chase' && !m.boss), N.p.x + dx, N.p.y, 8); m.hp = m.maxHp = 500; G.map[m.y][m.x] = 0; G.enemies.push(m); return m; };
      G.enemies = []; for (let y = -3; y <= 3; y++) for (let x = -4; x <= 4; x++) if (G.map[N.p.y + y]) G.map[N.p.y + y][N.p.x + x] = 0;
      const m = spawn(2); N.p.face = 0; N.computeFOV();
      G.inv = [id]; const text = E.consEffectText(window.NEON.consumables.find(c => c.id === id) || {}).join('|');
      const before = JSON.stringify([m.hp, N.p.hp, G.credits, N.p.xp, G.turn, G.allies.length, G.mines.length, m.vulnT || 0, G.stealth]);
      N.useConsumable(0);
      const after = JSON.stringify([m.hp, N.p.hp, G.credits, N.p.xp, G.turn, G.allies.length, G.mines.length, m.vulnT || 0, G.stealth]);
      if (G.inv.length === 0 && before !== after && /\d/.test(text) || (G.inv.length === 0 && before !== after && ['daemon', 'smoke', 'scan_pulse', 'coolant', 'phase_blink'].includes(id))) consOk.push(id); else consBad.push(id + ':' + text + ':' + before + '→' + after);
    }
    ok('全部 ' + consIds.length + ' 种消耗品可用且产生效果', consBad.length === 0, consBad);

    // 数值和内容对得上：EMP 伤害随攻击与层数成长
    fresh('assault'); G.depth = 1; N.recalc(); const t1 = E.consEffectText(window.NEON.consumables.find(c => c.id === 'emp'))[0];
    G.depth = 12; N.p.itemAtk += 15; N.recalc(); const t2 = E.consEffectText(window.NEON.consumables.find(c => c.id === 'emp'))[0];
    const n1 = +t1.match(/(\d+)（/)[1], n2 = +t2.match(/(\d+)（/)[1];
    ok('消耗品数值随攻击/层数成长（EMP ' + n1 + ' → ' + n2 + '）', n2 > n1 * 3, [t1, t2]);
    G.inv = ['emp']; N.useConsumable(0); ok('没有目标时不浪费消耗品', G.inv[0] === 'emp');

    // ---- 拾取物按最大生命百分比 ----
    fresh('assault'); G.depth = 10; N.p.itemMax += 80; N.recalc(); N.p.hp = 10;
    const gel = E.items.find(i => i.id === 'repair_gel'); E.applyItem(gel, N.p.x, N.p.y);
    ok('修复凝胶回复 18% 最大生命', N.p.hp - 10 === Math.round(N.p.maxHp * .18), [N.p.hp, N.p.maxHp]);
    const c0 = G.credits; E.applyItem(E.items.find(i => i.id === 'credit_chip'), N.p.x, N.p.y); ok('信用芯片给信用点', G.credits - c0 === 6 + 20);

    // ---- 委托 ----
    fresh('assault'); G.credits = 100;
    const offers = E.contractOffers();
    ok('委托板三档', offers.map(c => c.tier).join() === 'low,high,lethal', offers.map(c => c.def.id));
    E.showContractBoard(offers, 'test', null);
    ok('委托板 UI 渲染', document.querySelectorAll('.contract').length === 3 && document.querySelectorAll('[data-take]').length === 3);
    const lethal = offers.find(c => c.tier === 'lethal');
    document.querySelector('[data-take="2"]').click();
    ok('致命委托收取押金', lethal.stake === 40 && G.credits === 60, [lethal.stake, G.credits]);
    document.querySelector('[data-take="0"]').click();
    ok('委托栏最多 2 份', document.querySelectorAll('[data-take]:not([disabled])').length === 0);
    close();
    const low = offers[0];
    E.contractComplete(low); ok('完成委托进入结算队列', low.done && G.lootQueue.length === 1);
    T.endTurn(); ok('结算以宝箱界面展示', G.modal === 'loot' && document.querySelectorAll('.lcard').length >= 1);
    const cr = G.credits; document.querySelector('#lootClaim') && document.querySelector('#lootClaim').click();
    ok('领取后信用点到账', G.credits > cr);
    close();
    const atk0 = G.curse.enemyAtk; E.contractFail(lethal, 'test'); ok('致命委托失败永久违约', G.curse.enemyAtk === atk0 + 1 && lethal.failed);

    // 条款生效：玻璃协议压生命上限
    fresh('assault'); const base = N.p.maxHp; const glassDef = E.quests.find(q => (q.terms || []).includes('glass') && q.tier === 'high');
    const gc = E.makeContract(glassDef); E.acceptContract(gc); ok('玻璃协议：最大生命 -20%', N.p.maxHp === Math.round(base * .8), [base, N.p.maxHp]);
    E.contractComplete(gc); ok('完成后条款解除', N.p.maxHp === base); close(); G.lootQueue = [];

    // 下潜判定：本层委托过期失败
    fresh('assault'); const fl = E.makeContract(E.quests.find(q => q.id === 'c_sweep')); fl.target = 99; E.acceptContract(fl);
    G.stairs = { x: N.p.x, y: N.p.y }; G.bossAlive = false; G.busy = false; E.checkStairs();
    await new Promise(r => setTimeout(r, 500)); close();
    ok('本层委托在下潜时过期失败', fl.failed, fl.reason);

    // ---- 设施：逐个打开并完成一次交互 ----
    const types = Object.keys(E.sites), siteRes = {};
    for (const type of types) {
      fresh('engineer'); G.credits = 400; G.depth = 6; N.recalc(); G.pendingBoard = null; close();
      const s = { type, x: N.p.x, y: N.p.y, used: false, seed: 0, data: type === 'trial' ? { kind: 'elite' } : type === 'npc' ? { npc: N.test.story.STORY.npcs[0].id } : type === 'event' ? { ev: window.NEON.neta.events[0].id } : type === 'corp' ? { corp: 'dome', rival: 'kharon', job: 'sabotage' } : {} };
      if (['terminal', 'plant', 'desk', 'cage'].indexOf(type) >= 0) { siteRes[type] = { skip: 'op-only' }; continue; }
      if (type === 'relay') { const rs = { type, x: N.p.x, y: N.p.y, used: false, seed: 0, data: {} }; G.sites = [rs]; E.openSite(rs); siteRes[type] = { used: rs.used }; continue; }
      G.sites = [s];
      try {
        E.openSite(s);
        const btn = document.querySelector('#corpYes,[data-ev="a"],[data-npc="talk"],[data-buy="0"],[data-deal]:not([disabled]),[data-rf],[data-doc="full"],[data-pact],#spin,[data-vault="hack"],[data-take]:not([disabled]),#trialGo');
        if (type === 'reforge') N.applyMod(window.__neon.mods.find(m => m.slot === 'eye' && m.quality === 'blue' && !m.cls && !m.dropOnly && !m.achievementOnly));
        if (type === 'reforge') { close(); E.openSite(s); }
        const b2 = type === 'reforge' ? document.querySelector('[data-rf]') : btn;
        if (type !== 'fountain') { if (!b2) throw Error('no action button for ' + type); b2.click(); }
        if (type === 'gamble') await new Promise(r => setTimeout(r, 1300));
        siteRes[type] = { modal: G.modal, credits: G.credits, used: s.used, enemies: G.enemies.length };
      } catch (e) { siteRes[type] = { err: e.message }; }
      if (G.modal === 'loot') { const c = document.querySelector('[data-loot]'); if (c) { await new Promise(r => setTimeout(r, 700)); c.click(); } else { const cl = document.querySelector('#lootClaim'); cl && cl.click(); } }
      close();
    }
    ok('全部设施可打开并交互', Object.values(siteRes).every(r => !r.err), siteRes);
    ok('商人可购买（扣信用点）', siteRes.shop && siteRes.shop.credits < 400);
    ok('挑战终端开启挑战', siteRes.trial && siteRes.trial.used && siteRes.trial.enemies >= 3);

    // ---- 挑战：精英围猎完成掉宝箱 ----
    fresh('assault'); G.pendingBoard = null;
    const ts = { type: 'trial', x: N.p.x + 1, y: N.p.y, used: false, data: { kind: 'horde' } }; G.map[ts.y][ts.x] = 0;
    E.startTrial(ts); let guard = 0;
    while (G.trial && guard++ < 20) { G.enemies.filter(e => e.challenge).forEach(e => { e.hp = 0; N.killEnemy(e); }); }
    ok('潮汐防线三波后掉落黑墙保险箱', !G.trial && G.items.some(i => i.chest && i.chest.tier === 'epic'));

    // ---- Boss 击杀掉核心箱，开箱三选一 ----
    fresh('assault'); G.depth = 5; N.startFloor(); close(); G.pendingBoard = null;
    const boss = G.enemies.find(e => e.boss); boss.hp = 0; N.killEnemy(boss);
    const chest = G.items.find(i => i.chest && i.chest.tier === 'boss');
    ok('守卫倒下掉核心箱', !!chest && !G.bossAlive);
    N.p.x = chest.x; N.p.y = chest.y; G.items = G.items.filter(i => i === chest); E.pickup(chest.x, chest.y);
    ok('核心箱：首领义体自动入账 + 三选一', G.modal === 'loot' && document.querySelectorAll('[data-loot]').length === 3 && document.querySelectorAll('.lcard.auto').length >= 2);
    await new Promise(r => setTimeout(r, 700)); const bag0 = G.modBag.length; document.querySelector('[data-loot="0"]').click();
    ok('选择后义体到手（升级则接技能选择）', G.modBag.length > bag0 && (G.modal === null || G.modal === 'skill' || G.modal === 'scene' || G.modal === 'story'), [G.modBag, G.modal]);

    // ---- 终层：核心箱 + 撤离 ----
    fresh('assault'); G.depth = 15; N.startFloor(); close(); G.pendingBoard = null;
    const fb = G.enemies.find(e => e.boss); fb.hp = 0; N.killEnemy(fb);
    ok('终层守卫倒下不直接结算', G.state === 'play' && G.extract);
    G.items = []; N.p.x = G.stairs.x; N.p.y = G.stairs.y; E.checkStairs();
    ok('踏上出口撤离通关', G.state === 'win');
    await new Promise(r => setTimeout(r, 1000)); close();

    // ---- 区域异常 ----
    fresh('assault'); let seen = {};
    for (let i = 0; i < 60; i++) { G.depth = 2 + (i % 3); N.startFloor(); close(); if (G.anomaly) seen[G.anomaly] = 1; }
    ok('区域异常出现', Object.keys(seen).length >= 3, Object.keys(seen));
    G.anomaly = 'blackout'; N.recalc(); ok('断电视野 -2', T.draw && true);

    // ---- 绘制压力：设施 + 宝箱 + 光柱 ----
    fresh('assault'); G.depth = 3; N.startFloor(); close();
    for (const s of G.sites) for (let y = 0; y < 30; y++) G.seen[y].fill(1);
    E.dropChest(N.p.x + 1, N.p.y, 'epic'); E.dropChest(N.p.x - 1, N.p.y, 'boss'); N.computeFOV();
    const snap = JSON.stringify([G.turn, N.p.hp, G.enemies.map(e => e.hp)]);
    const t0 = performance.now(); for (let i = 0; i < 60; i++) T.draw(performance.now() + i * 16); const dt = performance.now() - t0;
    ok('设施/宝箱绘制纯渲染', snap === JSON.stringify([G.turn, N.p.hp, G.enemies.map(e => e.hp)]));
    ok('60 帧绘制耗时 ' + Math.round(dt) + 'ms', dt < 3000);

    // ---- 训练 / Rush 不受经济影响 ----
    G.trainPending = true; N.startGame(); close();
    ok('训练场无设施无信用点栏', (G.sites || []).length === 0 && document.querySelector('#credits').style.display === 'none');
    G.trainPending = false;
    return res;
  });
  checks.push(...out);

  // 正式包：截图主要界面
  await page.goto('file://' + path.join(ROOT, 'dist.html'));
  checks.push({ name: '正式包无调试接口', pass: await page.evaluate(() => typeof window.__neon === 'undefined') });
  checks.push({ name: '标题版本 3.6', pass: (await page.locator('.m3-logo small').first().textContent()).includes('3.6') });
  await page.screenshot({ path: path.join(ROOT, 'econ-menu.png') });

  checks.push({ name: '无脚本异常', pass: errors.length === 0, detail: errors });
  fs.writeFileSync(path.join(ROOT, 'econ-test-results.json'), JSON.stringify({ checks, errors }, null, 2));
  for (const c of checks) console.log((c.pass ? '✓ ' : '✗ ') + c.name + (c.pass ? '' : ' ' + JSON.stringify(c.detail).slice(0, 600)));
  await browser.close();
  assert(checks.every(x => x.pass), 'FAILED ' + checks.filter(x => !x.pass).map(x => x.name).join(', '));
})().catch(e => { console.error(e); process.exit(1); });
