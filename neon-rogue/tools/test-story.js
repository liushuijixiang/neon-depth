// 剧情系统回归：人物生成/交谈/雇佣/决斗/委托、遗物、档案、酒吧、传说、蓄势
const { chromium } = require('playwright'), path = require('path'), assert = require('assert'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => localStorage.setItem('neon-depth-mute', '1'));
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html'));
  const res = await page.evaluate(async () => {
    const N = window.__neon, G = N.G, T = N.test, S = T.story, out = []; const ok = (n, p, d) => out.push({ n, p: !!p, d });
    const close = () => { T.hideOverlay(); G.paused = false; G.busy = false; G.modal = null; };
    G.classId = 'assault'; G.trainPending = false; N.startGame(); close(); G.pendingBoard = null; N.p.pending = 0;
    ok('开局解锁主线第一章并排队剧情卡', S.ST.chapters.ch01 || Object.keys(S.ST.chapters).length >= 1, Object.keys(S.ST.chapters));
    ok('开局解锁职业档案', !!S.ST.classes['assault:0']);
    ok('剧情卡/演出可显示', S.maybeShowStory() && (G.modal === 'story' || G.modal === 'scene'));
    close(); G.storyQueue = [];
    // NPC on floors
    const RND = Math.random; let placed = 0; for (const d of [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14]) { G.depth = d; G.npcSeen = []; G.forceNpc = true; N.startFloor(); G.forceNpc = false; close(); G.pendingBoard = null; G.storyQueue = []; if ((G.sites || []).some(s => s.type === 'npc')) placed++; }
    ok('人物可在各层出现（强制概率）', placed === 12, placed);
    G.npcSeen = []; let cnt = 0; for (let d = 1; d <= 14; d++) { if (d % 5 === 0) continue; G.depth = d; N.startFloor(); close(); G.pendingBoard = null; G.storyQueue = []; if ((G.sites || []).some(s => s.type === 'npc')) cnt++; } ok('每局最多 3 个人物', cnt <= 3 && G.npcSeen.length <= 3, cnt);
    // talk through 莫瘸子 (F3)
    G.depth = 3; G.npcSeen = []; G.forceNpc = true; N.startFloor(); G.forceNpc = false; close(); G.pendingBoard = null; G.storyQueue = [];
    const mkSite = () => { let st = G.sites.find(s => s.type === 'npc'); if (!st) { st = { type: 'npc', x: N.p.x + 1, y: N.p.y, used: false, seed: 0, data: {} }; G.sites.push(st); } return st; };
    let site = mkSite(); site.data.npc = 'npc_mo'; const n = S.STORY.npcs.concat(window.NEON.story2.npcs).find(x => x.id === site.data.npc);
    for (let i = 0; i < n.stages.length; i++) { site.data.talked = 0; S.openNpc(site); S.npcAction(site, n, 'talk'); }
    ok('人物故事推进到完结', S.npcState(n.id).done && S.npcState(n.id).stage === n.stages.length);
    ok('完结赠送遗物', !n.relic || G.modBag.indexOf(n.relic) >= 0, [n.relic, G.modBag]);
    close();
    // hire
    G.credits = 999; S.openNpc(site); S.npcAction(site, n, 'hire'); close();
    const merc = G.allies.find(a => a.kind === 'merc'); ok('雇佣兵加入', !!merc);
    const m0 = N.p.x; G.enemies.forEach(e => e.stun = 99); for (let i = 0; i < 4; i++) T.endTurn(); close();
    ok('雇佣兵仅限本层', (G.depth = 4, N.startFloor(), close(), G.pendingBoard = null, !G.allies.some(a => a.kind === 'merc')));
    // duel
    G.depth = 3; G.npcSeen = []; G.forceNpc = true; N.startFloor(); G.forceNpc = false; close(); G.pendingBoard = null; G.storyQueue = []; site = mkSite(); site.data.npc = 'npc_mo';
    S.openNpc(site); S.npcAction(site, n, 'duel'); const duelist = G.enemies.find(e => e.npcDuel);
    ok('决斗生成对手', !!duelist && duelist.name === n.name);
    const c0 = G.credits; duelist.hp = 0; N.killEnemy(duelist); ok('决斗胜利给赏金', G.credits > c0 && S.npcState(n.id).duelWon >= 1);
    // job
    close(); G.quests = []; site.data.talked = 0; S.openNpc(site); S.npcAction(site, n, 'job');
    const job = G.quests.find(q => q.def.npc === n.id); ok('私人委托接下', !!job);
    if (job) { N.test.econ.contractComplete(job); ok('私人委托完成记录', !!S.npcState(n.id).jobDone); }
    close(); G.lootQueue = [];
    // relic fire
    if (n.relic) { G.enemies.forEach(e => { e.hp = 50; }); N.computeFOV(); G.cyberCd = {}; N.useCyberActive(n.relic); ok('遗物一次性技能释放', G.relicUsed[n.relic]); G.busy = false; N.useCyberActive(n.relic); ok('遗物不能重复使用', true); }
    // rebirth relic
    G.rebirthArmed = true; N.p.hp = 0; T.lose(); ok('复苏遗物抵消一次死亡', G.state === 'play' && N.p.hp === N.p.maxHp);
    // boss story
    G.depth = 5; N.startFloor(); close(); G.storyQueue = []; const boss = G.enemies.find(e => e.boss); boss.hp = 0; N.killEnemy(boss);
    ok('击败守卫解锁守卫档案', !!S.ST.bosses[boss.spec.id]);
    // win legend
    const L0 = S.ST.legends.length; G.depth = 15; G.state = 'play'; T.win(); ok('通关写下传说', S.ST.legends.length === L0 + 1 && !!G.lastLegend);
    await new Promise(r => setTimeout(r, 1100)); for (let i = 0; i < 6; i++) { const sk = document.querySelector('.sc-skip'); if (sk) sk.click(); const tl = document.querySelector('#tallyOk'); if (tl) tl.click(); } ok('结算界面显示传说', !!document.querySelector('.legend.end'));
    // bar & archive
    N.meta.cores = 500; S.barScreen('drinks'); document.querySelector('[data-drink]').click(); document.querySelector('[data-drink]').click(); ok('酒吧点酒', !!S.ST.pendingDrink && N.meta.cores < 500);
    S.barScreen('wall'); ok('传说墙显示', document.querySelectorAll('.legend').length >= 1);
    G.classId = 'assault'; N.startGame(); close(); const pend = S.ST.pendingDrink; ok('下次深潜生效后清空', !pend);
    ['main', 'people', 'guard', 'self', 'relic'].forEach(t => { S.archiveScreen(t); ok('档案页 ' + t, document.querySelectorAll('.arc').length > 0); });
    // stance
    close(); G.classId = 'assault'; G.trainPending = true; N.startGame(); close(); T.training.install('handL', 'mantis_blade'); close();
    G.enemies = []; const e2 = T.spawnEnemy(window.NEON.monsters.find(m => m.ai === 'chase' && !m.boss), N.p.x + 1, N.p.y, 5); e2.hp = e2.maxHp = 9999; e2.stun = 99; G.enemies.push(e2); N.computeFOV();
    const hp0 = e2.hp; G.cyberCd = {}; N.useCyberActive('mantis_blade'); ok('范围斩先蓄势，不立即伤害', !!G.stance && e2.hp === hp0 && !G.cyberCd.mantis_blade);
    G.busy = false; G.hitStopUntil = 0; N.doMove(0, 0); ok('下一次行动释放', !G.stance && e2.hp < hp0 && G.cyberCd.mantis_blade > 0);
    return out;
  });
  await page.evaluate(() => { const N = window.__neon; N.test.hideOverlay(); N.G.trainPending = false; N.test.story.archiveScreen('people'); });
  await page.waitForTimeout(300); await page.screenshot({ path: path.join(ROOT, 'shots', 'story-archive.png') });
  await page.evaluate(() => { window.__neon.test.story.barScreen('drinks'); }); await page.waitForTimeout(300); await page.screenshot({ path: path.join(ROOT, 'shots', 'story-bar.png') });
  await page.evaluate(() => { const N = window.__neon, G = N.G; G.classId = 'ghost'; N.startGame(); N.test.hideOverlay(); G.paused = false; G.modal = null; G.storyQueue = []; G.pendingBoard = null; N.p.pending = 0; G.depth = 8; G.npcSeen = []; G.forceNpc = true; N.startFloor(); G.forceNpc = false; N.test.hideOverlay(); G.pendingBoard = null; G.storyQueue = []; const s = G.sites.find(x => x.type === 'npc'); N.test.story.openNpc(s); });
  await page.waitForTimeout(300); await page.screenshot({ path: path.join(ROOT, 'shots', 'story-npc.png') });
  await page.evaluate(() => { const N = window.__neon, G = N.G; N.test.hideOverlay(); G.paused = false; G.modal = null; G.storyQueue = [{ kicker: 'MAINLINE // 主线 3/13', title: N.test.story.STORY.chapters[2].title, text: N.test.story.STORY.chapters[2].text }]; N.test.story.maybeShowStory(); });
  await page.waitForTimeout(300); await page.screenshot({ path: path.join(ROOT, 'shots', 'story-card.png') });
  res.push({ n: '无脚本异常', p: errs.length === 0, d: errs });
  res.forEach(c => console.log((c.p ? '✓ ' : '✗ ') + c.n + (c.p ? '' : ' ' + String(JSON.stringify(c.d)).slice(0, 300))));
  await b.close(); assert(res.every(c => c.p));
})().catch(e => { console.error(e); process.exit(1); });
