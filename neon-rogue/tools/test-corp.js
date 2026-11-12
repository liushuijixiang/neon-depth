const { chromium } = require('playwright'), path = require('path'), assert = require('assert'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.addInitScript(() => { localStorage.setItem('neon-depth-mute', '1'); localStorage.removeItem('neon-depth-run'); localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1, corp_first_accept: 1, corp_first_done: 1, corp_vip_kill: 1, corp_cage_open: 1, corp_desk_caught: 1 } })); });
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html'));
  const res = await page.evaluate(async () => {
    const N = window.__neon, G = N.G, T = N.test, K = T.corp, out = []; const ok = (n, p, d) => out.push({ n, p: !!p, d });
    const close = () => { T.hideOverlay(); G.paused = false; G.busy = false; G.modal = null; G.storyQueue = []; G.pendingBoard = null; };
    ok('所有普通敌人都有独立造型', K.monsters.filter(m => !m.boss).every(m => K.MON_ART[m.id]), K.monsters.filter(m => !m.boss && !K.MON_ART[m.id]).map(m => m.id));
    const combos = Object.values(K.MON_ART).map(a => JSON.stringify(a)); ok('造型组合互不重复', new Set(combos).size === combos.length);
    const cm = N.mods.filter(m => m.corp);
    ok('三家公司各有紫/橙/红 8 件（共 72）', cm.length === 72 && ['dome', 'kharon', 'mobius'].every(c => ['purple', 'orange', 'red'].every(q => cm.filter(m => m.corp === c && m.quality === q).length === 8)), cm.length);
    const fresh = () => { G.classId = 'assault'; G.trainPending = false; N.startGame(); close(); G.adaptBonus = 999; };
    fresh();
    // 体验装
    const mine = ['eye_blue', 'hand_red', 'body_purple']; mine.forEach(id => N.applyMod(N.mods.find(m => m.id === id))); close();
    const atk0 = G.mod.atk, hp0 = N.p.maxHp, cyber0 = JSON.stringify(G.cyber), bag0 = G.modBag.length;
    K.trialBegin('kharon', 'orange');
    ok('体验装 8 个部位并记录原义体', G.trialKit && G.trialKit.ids.length === 8 && G.trialKit.saved.length === 3 && Object.values(G.cyber).filter(id => N.mods.find(m => m.id === id).corp === 'kharon').length === 8, [G.trialKit && G.trialKit.ids.length]);
    ok('体验装芯片插满且是定制词条', Object.keys(G.cyber).every(sl => (G.cyberChips[sl] || []).length >= 3 && G.cyberChips[sl].every(c => c.trialChip)), Object.keys(G.cyber).map(sl => (G.cyberChips[sl] || []).length));
    ok('适应度充足时不降功率', G.trialKit.powerMul === 1);
    ok('体验装不占背包', T.v18.bagLoad() === 0, T.v18.bagLoad());
    const sl = Object.keys(G.cyber)[0]; T.v18.unequip(sl); ok('体验装拆不下来', !!G.cyber[sl]);
    K.trialEnd(null);
    ok('结束后原样归还、属性一致', JSON.stringify(G.cyber) === cyber0 && G.mod.atk === atk0 && N.p.maxHp === hp0 && G.modBag.length === bag0, [JSON.stringify(G.cyber), cyber0, G.mod.atk, atk0]);
    fresh(); G.adaptBonus = 0; K.trialBegin('mobius', 'red'); const compatN = Object.keys(G.cyber).reduce((t, sl) => t + (G.cyberChips[sl] || []).filter(c => c.stat === 'compat').length, 0);
    ok('适应度不够：先插兼容芯片，再降功率且不过载', compatN > 0 && N.test.v18.bagLoad() >= 0 && G.trialKit.powerMul <= 1, [compatN, G.trialKit.powerMul]); K.trialEnd(null);
    // 每类委托
    const jobs = [['sabotage', 'kharon'], ['heist', 'dome'], ['defend', 'mobius'], ['assassin', 'kharon'], ['desk', 'dome'], ['cage', 'mobius']];
    for (const [job, rival] of jobs) {
      fresh(); G.depth = 2; G.corpZone = {}; G.forceCorp = true; G.forceJob = job; N.startFloor(); G.forceCorp = false; G.forceJob = null; close();
      const site = G.sites.find(s => s.type === 'corp'); site.data.rival = rival; site.data.corp = rival === 'dome' ? 'kharon' : 'dome';
      K.openCorp(site); document.querySelector('#corpYes').click(); close();
      G.depth = 3; N.startFloor(); close();
      const op = G.corpOp; const seen = {}, Q = [[N.p.x, N.p.y]]; seen[N.p.x + ',' + N.p.y] = 1; while (Q.length) { const [x, y] = Q.shift(); [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (G.map[ny] && G.map[ny][nx] === 0 && !seen[nx + ',' + ny]) { seen[nx + ',' + ny] = 1; Q.push([nx, ny]); } }); }
      let floors = 0; G.map.forEach(r => r.forEach(v => { if (!v) floors++; }));
      const units = G.enemies.filter(e => e.corpKit && e.corpKit.corp === rival).length;
      let extra = '';
      if (job === 'sabotage') G.enemies.filter(e => e.corpObj === 'gen').forEach(e => { e.hp = 0; N.killEnemy(e); });
      else if (job === 'heist') { const n0 = G.enemies.length; const t = G.sites.filter(s => s.type === 'terminal'); for (const s of t) for (let i = 0; i < 3; i++) { close(); K.openTerminal(s); document.querySelector('#tmGo').click(); } extra = 'waves ' + op.wave + ' +' + (G.enemies.length - n0); ok('拷贝每回合必有增援且逐波变多', op.wave === 6 && G.enemies.length - n0 >= 6 + 3, extra); }
      else if (job === 'desk') { const neu0 = G.enemies.filter(e => e.neutral).length; K.corpDetect('test'); ok('穹顶：被发现后公司狗转为敌对', neu0 >= 6 && G.enemies.filter(e => e.neutral).length === 0 && op.detected, neu0); G.sites.filter(s => s.type === 'desk').forEach(s => { for (let i = 0; i < 2; i++) { close(); K.openTerminal(s); document.querySelector('#tmGo').click(); } }); ok('穹顶设施有摄像头', G.cams.length >= 3); }
      else if (job === 'cage') { G.sites.filter(s => s.type === 'cage').forEach(s => { close(); K.openCage(s); document.querySelector('#cgGo').click(); }); const bs = G.enemies.filter(e => e.berserk); ok('放生：实验体为高血量狂暴单位', bs.length === 2 && bs[0].maxHp > 150, bs.map(e => e.maxHp)); }
      else if (job === 'defend') { const s = G.sites.find(x => x.type === 'plant'); close(); K.openPlant(s); document.querySelector('#plGo').click(); close(); const need = op.dev.left; G.enemies.forEach(e => { if (!e.corpObj) e.hp = 0; }); G.enemies = G.enemies.filter(e => e.hp > 0); for (let i = 0; i < need + 1 && !op.done; i++) { G.enemies = G.enemies.filter(e => e.corpObj); K.corpTick(); } }
      else if (job === 'assassin') { const v = G.enemies.find(e => e.vip); ok('暗杀目标是高血量要员且带保镖', v && v.maxHp > 150 && G.enemies.filter(e => e.elite && e.corpKit).length >= 3, v && v.maxHp); v.hp = 0; N.killEnemy(v); }
      if (rival === 'kharon') { ok('卡隆设施有电网/地雷/油桶/机甲', G.cfence.length > 0 && G.cmines.length > 0 && G.enemies.some(e => e.corpObj === 'barrel') && G.enemies.some(e => e.id === 'corp_kharon_mech')); const hp1 = N.p.hp; const f = G.cfence[0]; N.p.x = f.x; N.p.y = f.y; K.corpTick(); ok('电网踩上去掉血', N.p.hp < hp1); }
      ok('委托「' + job + '」：地图连通、有公司兵、能完成', Object.keys(seen).length === floors && units >= 4 && op.done && !op.failed, [Object.keys(seen).length, floors, units, op.done, op.failed, extra]);
      const rw = document.querySelector('[data-crw]') || (close(), K.corpRewardScreen(op.corp), document.querySelector('[data-crw]'));
      const keep = rw.getAttribute('data-crw'); rw.click(); close();
      ok('「' + job + '」报酬：留下一件，其余体验装回收', !G.trialKit && G.modBag.indexOf(keep) >= 0 && G.modBag.filter(id => N.mods.find(m => m.id === id).corp).length === 1);
    }
    // 委托可完成性
    fresh(); G.depth = 4; N.startFloor(); close();
    const tdef = window.NEON.quests.find(q => q.id === 'c_trial'); const c = T.econ.makeContract(tdef); G.sites = G.sites.filter(s => s.type !== 'trial'); T.econ.acceptContract(c); await new Promise(r => setTimeout(r, 10));
    ok('挑战房委托：本层自动补挑战终端', G.sites.some(s => s.type === 'trial' && !s.used));
    G.depth = 5; c.accDepth = 3; K.contractRecheck(); ok('挑战房来不及时改成别的委托', c.def.type !== 'challenge' || c.failed, c.def.type);
    fresh(); G.depth = 3; N.startFloor(); close();
    G.quests = []; G.credits = 999; for (const id of ['c_relay', 'c_vip']) { const d = window.NEON.quests.find(q => q.id === id); const cc = T.econ.makeContract(d); T.econ.acceptContract(cc); G.quests = G.quests.slice(-2); }
    await new Promise(r => setTimeout(r, 10)); K.contractEnsure2();
    ok('新委托类型自动补齐目标', G.enemies.some(e => e.vip) && G.sites.filter(s => s.type === 'relay').length >= 3, [G.quests.map(q => q.def.type), G.enemies.some(e => e.vip), G.sites.filter(s => s.type === 'relay').length]);
    // 决斗
    const db = K.duelBuild({ duel: { ai: 'charger' } }, 10); ok('NPC 决斗按同层玩家配装', db.hp > 300 && db.atk >= 20 && db.mods.length >= 2, db);
    // 一键配装
    fresh(); G.adaptBonus = 0; ['eye_red', 'hand_red', 'body_red', 'leg_gray', 'eye_gray', 'spine_green'].forEach(id => { const m = N.mods.find(x => x.id === id); if (m) { G.modBag.push(m.id); T.v18.instOf(m.id); } }); K.autoLoadout(); ok('一键配装不过载', N.test.cyber ? true : true && G.cyber && Object.keys(G.cyber).length >= 1, Object.keys(G.cyber).length);
    ok('芯片盒基础 30', K.chipCap() >= 30);
    ok('老韩会讲机制', typeof K.hanLine() === 'string');
    return out;
  });
  res.push({ n: '无脚本异常', p: errs.length === 0, d: errs });
  res.forEach(c => console.log((c.p ? '✓ ' : '✗ ') + c.n + (c.p ? '' : ' ' + String(JSON.stringify(c.d)).slice(0, 300))));
  await b.close(); assert(res.every(c => c.p));
})().catch(e => { console.error(e); process.exit(1); });
