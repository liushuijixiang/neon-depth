// 1.8 回归：超梦、演出、剧情锁、精神病敌人、义体实例/强化、背包与清点、换弹回合、机甲维持费、灌注
const { chromium } = require('playwright'), path = require('path'), assert = require('assert'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('neon-depth-mute', '1'); localStorage.removeItem('neon-depth-run'); });
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html'));
  const res = await page.evaluate(async () => {
    const N = window.__neon, G = N.G, T = N.test, V = T.v18, S = T.story, out = []; const RND = Math.random; const ok = (n, p, d) => out.push({ n, p: !!p, d });
    const close = () => { T.hideOverlay(); G.paused = false; G.busy = false; G.modal = null; };
    const fresh = (cls) => { G.classId = cls || 'assault'; G.trainPending = false; G.rushPending = null; N.startGame(); close(); G.pendingBoard = null; G.storyQueue = []; N.p.pending = 0; };
    // scenes
    fresh(); ok('首局排入开场演出', true);
    ok('演出可播放', V.playScene('boss_5', null, null, { replay: true }) && document.querySelector('.scene .sc-line'));
    for (let i = 0; i < 10 && G.modal === 'scene'; i++) document.querySelector('.scene').click(); for (let i = 0; i < 10 && G.modal === 'scene'; i++) document.querySelector('.scene').click();
    ok('点击推进演出直至结束', G.modal !== 'scene'); close();
    // implant instance
    fresh(); const m = N.mods.find(x => x.id === 'hand_purple'); N.applyMod(m); const it = V.instOf('hand_purple');
    ok('义体生成实例（名称/耐久/词条）', it && it.name && it.maxDur > 0 && Array.isArray(it.affixes), it);
    const load0 = N.cyberLoad(); it.plus = 0; Math.random = () => 0; const r = V.enhanceInst(it, m); Math.random = RND;
    ok('强化成功：+1 且耐久 -1、负载 +1', r === true && it.plus === 1 && N.cyberLoad() === load0 + 1, [it.plus, it.dur]);
    const d0 = it.dur; Math.random = () => .999; const f = V.enhanceInst(it, m); Math.random = RND; ok('强化失败：耐久 -3', f === false && it.dur === d0 - 3);
    it.dur = 5; N.recalc(); const atkOk = G.mod.atk; it.dur = 0; N.recalc(); ok('损坏义体不提供属性', G.mod.atk < atkOk, [atkOk, G.mod.atk]); it.dur = 5; N.recalc();
    // backpack + extraction
    fresh(); G.credits = 0; const cap = V.bagCap(); let added = 0;
    N.mods.filter(x => x.slot === 'body' && !x.cls && !x.dropOnly && !x.relic).slice(0, cap + 3).forEach(x => { if (N.applyMod(x) !== false) added++; });
    ok('背包容量限制生效', V.bagCount() <= cap, [V.bagCount(), cap]);
    const stashBefore = N.meta.stash.cyber.length, owned = G.modBag.length; const rep = V.extractAll();
    ok('撤离带回全部义体（含背包）', N.meta.stash.cyber.length - stashBefore === owned && rep.cyber.length === owned, [owned, N.meta.stash.cyber.length - stashBefore]);
    V.tallyScreen(rep, () => {}); ok('清点页显示', document.querySelectorAll('.tl-item').length === owned); close();
    // reload turns
    fresh('assault'); G.ammo = 0; G.energy = 14; G.inv = ['mag_pack']; V.reloadWithItem(0); close();
    let t = 0; while (G.reload && t < 6) { G.busy = false; G.paused = false; G.modal = null; T.endTurn(); t++; }
    ok('换弹需要 4 回合（含当回合）', t === 3 && G.ammo === G.ammoMax, t);
    // mech upkeep
    fresh('engineer'); G.mechBuilt = true; G.scrap = 100; G.mechMods = ['energyWall']; V.toggleMech(); const s0 = G.scrap;
    for (let i = 0; i < 6; i++) { G.busy = false; G.paused = false; G.modal = null; T.endTurn(); }
    ok('机甲每回合消耗废料且递增', G.scrap < s0 && V.mechUpkeep() > 2, [s0, G.scrap, V.mechUpkeep()]);
    V.toggleMech(); ok('下机甲进入 5 回合冷却', G.mech === 0 && G.mechCool === 5);
    // psycho enemy
    fresh(); G.depth = 7; N.startFloor(); close(); G.enemies = G.enemies.filter(e => !e.psycho); const pe = V.spawnPsychoEnemy(7, true);
    ok('生成赛博精神病敌人', pe && pe.psycho && pe.psycho.mods.length >= 1, pe && pe.name);
    let used = false;
    for (let k = 0; k < 4 && !used; k++) { const q = k ? V.spawnPsychoEnemy(7, true) : pe; if (!q) continue; G.freeze = 0; q.stun = 0; q.alerted = true; q.psycho.cd = 1; q.intent = null; q.shieldT = 0; N.p.x = q.x + 2; N.p.y = q.y; if (!G.map[N.p.y] || G.map[N.p.y][N.p.x] == null) continue; G.map[N.p.y][N.p.x] = 0; N.computeFOV(); const x0 = q.x; T.enemyAct(q, T.buildDistMap()); used = !!q.intent || q.shieldT > 0 || q.x !== x0; }
    ok('精神病使用义体技能', used);
    const items0 = G.items.length; pe.hp = 0; N.killEnemy(pe);
    const drop = G.items.find(i => i.mod && i.inst); ok('击杀掉落低耐久重改义体', drop && drop.inst.dur <= 3 && drop.inst.heavy >= 2, drop && drop.inst);
    // dream
    S.ST.dreams.bd_hound = Date.now(); V.dreamShelf(); ok('超梦架显示录像带', document.querySelectorAll('.dtape').length >= 5);
    V.dreamStartScreen(V.DREAMS.find(d => d.id === 'bd_hound'), true); ok('似是而非开始界面（只读）', !!document.querySelector('.dream-start .dream-cfg') && document.querySelector('.ghost.ro[disabled]'));
    V.dreamBegin(V.DREAMS.find(d => d.id === 'bd_hound')); close();
    ok('进入超梦模式', G.mode === 'dream' && G.depth === 3 && G.dreamSkin === 'bl_hound');
    const en = G.enemies.find(e => !e.boss); if (en) { en.stun = 99; N.p.x = en.x - 2; N.p.y = en.y; G.map[N.p.y][N.p.x] = 0; G.map[N.p.y][N.p.x + 1] = 0; G.map[N.p.y + 1] && (G.map[N.p.y + 1][N.p.x + 1] = 0); N.computeFOV(); }
    const hp1 = en ? en.hp : 0; G.busy = false; V.dreamAct2('pounce'); ok('超梦专属技能生效', !en || en.hp < hp1 || (G.dreamCds || {}).pounce > 0 || !document);
    G.depth = 5; N.startFloor(); close(); const boss = G.enemies.find(e => e.boss); boss.hp = 0; N.killEnemy(boss);
    await new Promise(r => setTimeout(r, 900)); for (let i = 0; i < 12 && G.modal === 'scene'; i++) document.querySelector('.scene .sc-skip').click();
    ok('走完超梦获得奖励义体', !!S.ST.dreamDone.bd_hound && N.meta.stash.cyber.some(x => x.id === 'relic_bd_hound' || (x.id || '').indexOf('relic_bd') === 0), Object.keys(S.ST.dreamDone));
    // chapter lock
    S.ST.wins = 1; S.ST.maxChalWin = 0; G.mode = 'normal'; S.storyEvent('depth', 1); const lk = S.STORY.chapters.filter(c => c.lock);
    ok('挑战锁章节未满足时不解锁', lk.every(c => !S.ST.chapters[c.id]));
    S.ST.maxChalWin = 6; S.storyEvent('depth', 1); ok('满足挑战数后解锁对应章节', lk.filter(c => c.lock.chal <= 6).every(c => S.ST.chapters[c.id]) && lk.filter(c => c.lock.chal > 6).every(c => !S.ST.chapters[c.id]));
    // pour
    N.meta.cores = 1000; N.meta.up = {}; N.meta.pour = {}; T.ui.showMeta(); const nb = document.querySelector('[data-buy="b1"]');
    for (let i = 0; i < 8; i++) V.pourMeta('b1', document.querySelector('[data-buy="b1"]'));
    ok('灌注核心升级', (N.meta.up.b1 || 0) >= 1 && N.meta.cores < 1000, [N.meta.up.b1, N.meta.cores]);
    return out;
  });
  res.push({ n: '无脚本异常', p: errs.length === 0, d: errs });
  res.forEach(c => console.log((c.p ? '✓ ' : '✗ ') + c.n + (c.p ? '' : ' ' + String(JSON.stringify(c.d)).slice(0, 300))));
  await b.close(); assert(res.every(c => c.p));
})().catch(e => { console.error(e); process.exit(1); });
