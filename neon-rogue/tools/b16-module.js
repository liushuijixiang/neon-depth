/* =========================================================
   B16_V1 · 隐藏通道 / 生产层 / 三人三段战役 / 谢幕 / 自己的超梦 / 成就分类 / 图鉴
   ========================================================= */
var B16_ORDER = ['kharon', 'dome', 'mobius'];
var B16_HERO_SKILLS = { assault: ['act_nova', 'act_shot'], engineer: ['act_wall', 'act_drone', 'act_turret'], ghost: ['act_stealth', 'act_blink'] };
function finLines(arr, fx) { return (arr || []).map(function (t) { return typeof t === 'string' ? { who: '', text: t, fx: fx || 'none' } : t; }); }
function mainlineDone() { return (STORY.chapters || []).filter(function (c) { return /^ch(0\d|1[0-3])$/.test(c.id); }).every(function (c) { return ST.chapters[c.id]; }); }
function b16Open() { return !!META.b16 || mainlineDone(); }
/* ---------- 预制玩家 ---------- */
var B16_CLONE = { id: 'b16_clone', name: '预制潜水员', ai: 'chase', glyph: 'diamond', color: '#e8f4ff', hp: [55, 65], atk: [10, 12], def: [2, 3], xp: 40, minDepth: 16, maxDepth: 16, weight: 0, corpUnit: true, scale: 1, desc: '莫比乌斯线上下来的成品。配好了装，背好了你的记忆，出厂编号和你差一位。', tacticName: '量产人格' };
if (!MONSTERS.some(function (m) { return m.id === 'b16_clone'; })) MONSTERS.push(B16_CLONE);
MON_ART.b16_clone = ['suit', ['blades', 'pack'], 'visor'];
var CLONE_NAMES = ['沈岚', '周衡', '蛾'];
function spawnClone(x, y) {
  if (!G.map[y] || G.map[y][x] !== FLOOR || occupied(x, y)) { var f = freeAdjacent(x, y); if (!f) return null; x = f.x; y = f.y; }
  var e = spawnEnemy(B16_CLONE, x, y, 16); e.name = '预制·' + pick(CLONE_NAMES) + ' #' + (1000 + rnd(8999));
  var mods = shuffle(MODS.filter(function (m) { return m.active && !m.relic && (m.quality === 'red' || m.quality === 'orange') && !/^relic_/.test(m.active.type); }).map(function (m) { return m.id; })).slice(0, 2);
  e.npcKit = { corp: null, mods: mods, cd: 2, i: 0 }; e.alerted = true; e.clone = true;
  tacticUid(e); G.enemies.push(e);
  if (Math.random() < .3) float(e.x, e.y, pick((FIN.b16 && FIN.b16.clones) || ['……']), '#e8f4ff');
  return e;
}
/* ---------- 通道 ---------- */
function maybeShowPassage() {
  if (!G.pendingPassage || G.state !== 'play' || G.modal || G.busy) return false;
  G.pendingPassage = false;
  var P = FIN.passage || { title: '隐藏通道', text: '守卫倒下的地方，地板裂开一道缝。', go: '下去', leave: '撤离' };
  showModal('passage');
  overlay.innerHTML = '<div class="card site" style="--site:#fcee0a"><div class="sign"><i>16</i></div><div class="kicker">HIDDEN ACCESS // B16</div><h1 class="title small">' + econEsc(P.title) + '</h1><div class="story-text">' + econEsc(P.text) + '</div>' +
    '<div class="hint">进去以后没有回头路：要切断三条生产线，再分三路端掉三家公司的据点。撤离的话，这一局照常结算。</div>' +
    '<div class="dock"><button class="ghost" id="psLeave">' + econEsc(P.leave) + '</button><button class="cta" id="psGo">' + econEsc(P.go) + '</button></div></div>';
  $('#psLeave').onclick = function () { hideOverlay(); msg('撤离信标还亮着。', 'dim'); econResume(); };
  $('#psGo').onclick = function () { hideOverlay(); enterB16(); };
  return true;
}
function enterB16() {
  G.b16 = { phase: 'lines', down: {}, camp: 0, origCls: G.classId, t: 0 };
  G.extract = false; G.depth = 16;
  startFloor();
  playScene(null, function () { toast('B16 · ' + ((FIN.b16 && FIN.b16.name) || '生产层'), 'warn'); }, finLines(FIN.b16 && FIN.b16.intro), { kicker: 'B16 // ' + ((FIN.b16 && FIN.b16.name) || '') });
}
/* ---------- 生产层：风车地图 ---------- */
function b16Blank() {
  G.enemies = []; G.items = []; G.bossAlive = false; G.extract = false; G.anomaly = null; G.corpses = []; G.tacticFx = []; G.sites = [];
  G.cams = []; G.cfence = []; G.cmines = []; G.corpStrikes = []; G.belts = [];
  G.map = []; G.seen = []; G.vis = [];
  for (var y = 0; y < MAP_H; y++) { var row = [], s1 = [], v1 = []; for (var x = 0; x < MAP_W; x++) { row.push(WALL); s1.push(0); v1.push(0); } G.map.push(row); G.seen.push(s1); G.vis.push(v1); }
  G.stairs = { x: 0, y: 0 };
}
function beltRun(x0, y0, x1, y1, dir) { var dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0), x = x0, y = y0; for (var k = 0; k < 60; k++) { G.belts.push({ x: x, y: y, d: dir }); if (x === x1 && y === y1) break; x += dx; y += dy; } }
var B16_LINE_POS = { dome: [6, 4], mobius: [36, 5], kharon: [38, 25] };
function genB16Lines() {
  b16Blank();
  var R = [[18, 11, 9, 7], [21, 18, 3, 8], [18, 24, 9, 4], [5, 13, 13, 3], [4, 3, 3, 11], [2, 2, 9, 6], [21, 3, 3, 8], [24, 3, 9, 3], [31, 2, 10, 7], [27, 13, 13, 3], [38, 16, 3, 7], [34, 22, 8, 6]];
  R.forEach(function (r) { corpCarve(r[0], r[1], r[2], r[3]); });
  G.rooms = R.map(function (r) { return { x: r[0], y: r[1], w: r[2], h: r[3], cx: r[0] + (r[2] >> 1), cy: r[1] + (r[3] >> 1) }; });
  p.x = 22; p.y = 26;
  beltRun(16, 14, 5, 14, 'l'); beltRun(5, 13, 5, 4, 'u'); beltRun(22, 10, 22, 4, 'u'); beltRun(24, 4, 32, 4, 'r'); beltRun(28, 14, 39, 14, 'r'); beltRun(39, 15, 39, 22, 'd');
  var L = (FIN.b16 && FIN.b16.lines) || {};
  Object.keys(B16_LINE_POS).forEach(function (k) {
    var ps = B16_LINE_POS[k];
    corpStructure('line', ((L[k] && L[k].name) || CORPS[k].name + '生产线') + ' · 总闸', ps[0], ps[1], 900, CORPS[k].color, { lineCorp: k, def: 3 });
  });
  [[22, 14], [20, 12], [25, 16], [10, 14], [31, 14], [22, 6], [5, 9], [39, 18]].forEach(function (s, i) { if (i % 2) spawnClone(s[0], s[1]); else { var k = B16_ORDER[i % 3]; corpSpawn(CORP_UNIT[k], s[0], s[1], 16, { mul: 1.4, strong: true, alert: true }); } });
  for (var i = 0; i < 2; i++) G.items.push({ x: 19 + i * 6, y: 25, it: pickHealItem(), seed: 0 });
  G.bossName = '';
}
/* ---------- 据点：三段战役 ---------- */
function genB16Base(corp) {
  b16Blank();
  var L = CORP_LAYOUTS.A;
  L.rooms.forEach(function (r) { corpCarve(r[0], r[1], r[2], r[3]); });
  G.rooms = L.rooms.map(function (r) { return { x: r[0], y: r[1], w: r[2], h: r[3], cx: r[0] + (r[2] >> 1), cy: r[1] + (r[3] >> 1) }; });
  p.x = L.start[0]; p.y = L.start[1];
  beltRun(13, 24, 38, 24, 'r'); beltRun(20, 22, 20, 5, 'u'); beltRun(34, 22, 34, 5, 'u');
  var op0 = G.corpOp; G.corpOp = { rival: corp, job: 'b16', active: false }; corpFixtures(corp, L, 15); G.corpOp = op0;
  L.spawns.forEach(function (sp, i) { if (i % 3 === 1) spawnClone(sp[0], sp[1]); else corpSpawn(CORP_UNIT[corp], sp[0], sp[1], 16, { mul: 1.5, strong: true, elite: i % 4 === 0 }); });
  // 生产线上的货
  var reds = corpModsOf(corp, 'red'); [[16, 24], [26, 24], [20, 12]].forEach(function (s, i) { var id = reds[i]; if (id && G.modBag.indexOf(id) < 0) G.items.push({ x: s[0], y: s[1], mod: MOD_BY[id], seed: 0 }); });
  [[30, 24], [34, 14]].forEach(function (s) { G.items.push({ x: s[0], y: s[1], chip: makeCorpChip(corp, 'red'), seed: 0 }); });
  G.items.push({ x: 15, y: 18, it: pickHealItem(), seed: 0 });
  // 守卫
  var C = FIN.campaigns[corp], bspec = pick((EXT_BOSSES.length ? EXT_BOSSES : BOSSES).filter(function (b) { return b.tier === 3; }));
  var bx = L.vip[0], by = L.vip[1] + 2, b = spawnBoss(bspec, bx, by, 16);
  b.hp = b.maxHp = Math.round(b.maxHp * 1.25); b.atk = Math.round(b.atk * 1.15); b.name = C.boss.name; b.color = CORPS[corp].color; b.b16Boss = corp;
  G.enemies.push(b); G.bossAlive = true; G.bossName = C.boss.name; G.bossIntro = C.boss.intro;
  if (corp === 'dome') [[37, 4], [41, 4], [39, 10]].forEach(function (s) { corpStructure('seat', '董事席位', s[0], s[1], 220, CORPS.dome.color); });
  G.codex.b16 = G.codex.b16 || {}; G.codex.b16[corp] = 1; saveJSON(CODEX_KEY, G.codex);
}
function b16Tick() {
  if (!G.b16 || G.depth !== 16 || G.state !== 'play') return;
  var B = G.b16; B.t = (B.t || 0) + 1;
  var alive = G.enemies.filter(function (e) { return e.hp > 0 && !e.structure; }).length;
  if (B.phase === 'lines') {
    Object.keys(B16_LINE_POS).forEach(function (k, i) {
      if (B.down[k] || alive >= 16 || (B.t + i) % 3) return;
      var ps = B16_LINE_POS[k];
      if (k === 'mobius' || Math.random() < .35) spawnClone(ps[0] + 1, ps[1] + 1); else corpSpawn(CORP_UNIT[k], ps[0] - 1, ps[1] + 1, 16, { mul: 1.4, strong: true, alert: true });
    });
    return;
  }
  var boss = G.enemies.find(function (e) { return e.b16Boss && e.hp > 0; }); if (!boss) return;
  if (boss.b16Boss === 'kharon') {
    if (B.t % 4 === 0) { tacticQueue(boss, 'b16-air', '空袭', tacticArea(p.x, p.y, 1), 2, Math.round(boss.atk * 1.4)); float(boss.x, boss.y, '「空袭信标」', '#ffb347', true); }
    if (B.t % 6 === 0 && alive < 12) { var f = freeAdjacent(boss.x, boss.y); if (f) corpSpawn('corp_kharon_trooper', f.x, f.y, 16, { mul: 1.3, alert: true }); }
  } else if (boss.b16Boss === 'dome') {
    if (B.t % 5 === 0 && alive < 12) for (var i = 0; i < 2; i++) { var g = randomFloorTile(4, false); if (g) corpSpawn('corp_dome_dog', g.x, g.y, 16, { mul: 1.3, alert: true }); }
  } else if (boss.b16Boss === 'mobius') {
    if (B.t % 4 === 0 && alive < 12) spawnClone(boss.x + 1, boss.y);
    boss.hp = Math.min(boss.maxHp, boss.hp + Math.round(boss.maxHp * .01));
  }
}
function b16LineDown(e) {
  var B = G.b16; if (!B || B.phase !== 'lines') return;
  B.down[e.lineCorp] = 1; nvColumn(e.x, e.y, CORPS[e.lineCorp].color, 8); G.shake = 14;
  toast('切断 · ' + e.name, 'good'); msg(((FIN.b16 || {}).lineDown || {})[e.lineCorp] || '一条线停了。', 'warn');
  if (Object.keys(B.down).length < 3) return;
  cum.finLines = (cum.finLines || 0) + 1; saveJSON(STAT_KEY, cum);
  G.enemies.forEach(function (o) { if (o.hp > 0 && !o.structure) { o.hp = 0; } }); G.enemies = G.enemies.filter(function (o) { return o.hp > 0; });
  if (G.mode === 'dream') { dreamFinish(true); return; }
  B.phase = 'meet';
  setTimeout(function () { playScene(null, function () { b16Campaign(0); }, finLines(FIN.b16 && FIN.b16.meet), { kicker: 'B16 // 三个人' }); }, 500);
}
function b16SwitchClass(cls) {
  G.classId = cls;
  G.skills = G.skills || {}; Object.keys(B16_HERO_SKILLS).forEach(function (k) { B16_HERO_SKILLS[k].forEach(function (s) { delete G.skills[s]; }); });
  B16_HERO_SKILLS[cls].forEach(function (s) { G.skills[s] = 1; }); G.cd = {};
  if (cls === 'assault') { GUN_UPS.forEach(function (u) { G.gunUp[u.id] = u.max; }); syncGun(); G.energy = G.energyMax; G.ammo = G.ammoMax; G.reload = null; }
  if (cls === 'engineer') { G.scrap = 80; G.mechBuilt = true; G.mechMods = MODULES.slice(0, 3).map(function (m) { return m.id; }); G.mechCool = 0; G.mech = 0; }
  if (cls === 'ghost') { G.instab = 25; G.shadow = G.shadowMax; G.burnout = false; G.ghostCd = {}; }
  G.cyberCd = {}; recalc(); p.hp = p.maxHp; G.inv = G.inv || [];
}
function b16Campaign(i) {
  var B = G.b16; B.phase = 'camp'; B.camp = i; B.t = 0;
  var corp = B16_ORDER[i], C = FIN.campaigns[corp];
  b16SwitchClass(C.hero);
  startFloor();
  var lines = finLines(C.opening);
  playScene(null, function () { toast((STORY.classes[C.hero] || {}).title + ' · ' + C.title, 'warn'); msg('「' + C.boss.intro + '」', 'warn'); updateHUD(); renderAbilities(); }, lines, { kicker: 'CAMPAIGN ' + (i + 1) + '/3 // ' + C.base });
}
function b16BossDown(e) {
  var B = G.b16, corp = e.b16Boss, C = FIN.campaigns[corp];
  cum.finBoss = cum.finBoss || {}; cum.finBoss[corp] = 1; saveJSON(STAT_KEY, cum);
  float(e.x, e.y, C.boss.death, '#fcee0a'); G.flash = .8; G.shake = 16; nvColumn(e.x, e.y, CORPS[corp].color, 9);
  G.enemies.forEach(function (o) { if (o !== e) o.hp = 0; });
  setTimeout(function () {
    G.enemies = [];
    playScene(null, function () { if (B.camp < 2) b16Campaign(B.camp + 1); else b16Finale(); }, finLines(C.ending), { kicker: C.base + ' // 收工' });
  }, 600);
}
function b16Finale() {
  var B = G.b16;
  playScene(null, function () {
    playScene(null, function () {
      G.classId = B.origCls; recalc();
      META.cleared = (META.cleared || 0) + 1;
      META.lastClear = { cls: B.origCls, lv: p.level, cyber: JSON.parse(JSON.stringify(G.cyber)), chips: JSON.parse(JSON.stringify(G.cyberChips)), inst: JSON.parse(JSON.stringify(G.inst || {})), run: JSON.parse(JSON.stringify(G.runMod || {})), at: Date.now() };
      saveMeta();
      cum.finClear = (cum.finClear || 0) + 1; cum.b16Win = (cum.b16Win || 0) + 1; saveJSON(STAT_KEY, cum);
      G.b16 = null; G.extract = true; G.depth = 16;
      win();
    }, finLines(FIN.credits, 'static'), { kicker: 'CREDITS' });
  }, finLines(FIN.finale), { kicker: 'FINALE // 谢幕' });
}
/* ---------- 自己的超梦 ---------- */
function maybeHanDream() {
  if (!META.cleared || META.myDream || G._hanAsked || G.state !== 'menu') return false;
  G._hanAsked = true;
  var H = FIN.han || {};
  showModal('handream');
  overlay.innerHTML = '<div class="card site bar" style="--site:#ff7a45"><div class="sign"><i>烬</i></div><div class="kicker">LOWER CITY · 余烬</div><h1 class="title small">老韩</h1>' +
    '<div class="story-text npc-say">老韩：「' + econEsc(pick(H.offer || ['把你这趟刻成一盘带子吧。'])) + '」</div><div class="hint">刻成超梦后：获得一盘你自己的录像带（重现 B16 与当时的配装），外加 10000 数据核心。</div>' +
    '<div class="dock"><button class="ghost" id="hdNo">下回再说</button><button class="cta" id="hdYes">刻吧</button></div></div>';
  $('#hdNo').onclick = function () { overlay.innerHTML = '<div class="card site bar" style="--site:#ff7a45"><div class="story-text npc-say">老韩：「' + econEsc(pick(H.decline || ['行，杯子给你留着。'])) + '」</div><button class="cta" id="hdOk">回去</button></div>'; $('#hdOk').onclick = function () { menuScreen(); }; };
  $('#hdYes').onclick = function () {
    META.myDream = META.lastClear || { cls: G.classId, lv: 20, cyber: {}, chips: {}, inst: {}, run: {} }; META.cores += 10000; saveMeta();
    cum.finDream = 1; saveJSON(STAT_KEY, cum); var md = G.mode; G.mode = 'normal'; checkAch(); G.mode = md;
    overlay.innerHTML = '<div class="card site bar" style="--site:#ff7a45"><div class="story-text npc-say">老韩：「' + econEsc(pick(H.accept || ['刻好了。'])) + '」</div><div class="hint" style="color:#fcee0a">+10000 数据核心 · 超梦架上多了一盘「' + econEsc((FIN.myDream || {}).name || '你') + '」</div><button class="cta" id="hdOk">回去</button></div>';
    $('#hdOk').onclick = function () { menuScreen(); };
  };
  return true;
}
(function () {
  var M = FIN.myDream || { name: '投放终止', desc: '', opening: [], ending: [] };
  if (!DREAMS.some(function (d) { return d.id === 'bd_mine'; })) DREAMS.push({ id: 'bd_mine', name: M.name, who: '你自己', era: '最后一次下潜 · B16', desc: M.desc, kit: 'mine', unlock: 'mine', opening: M.opening, ending: M.ending });
  var tails = FIN.dreamTail || [];
  DREAMS.forEach(function (d, i) { if (d.id !== 'bd_mine' && tails.length && d.ending && d.ending.indexOf(tails[i % tails.length]) < 0) d.ending = d.ending.concat([tails[i % tails.length]]); });
  (FIN.achievements || []).forEach(function (a) {
    if (ACHIEVEMENTS.some(function (x) { return x.id === a.id; })) return;
    var cond = a.id === 'fin_clear' ? { type: 'finClear', n: 1 } : a.id === 'fin_dream' ? { type: 'finDream', n: 1 } : a.id === 'fin_lines' ? { type: 'finLines', n: 1 } : { type: 'finBoss', target: a.id.slice(4), n: 1 };
    var x = { id: a.id, name: a.name, desc: a.desc, tier: 'hardcore', cat: 'finale', cond: cond, reward: { cores: a.id === 'fin_clear' ? 1000 : 300 } };
    ACHIEVEMENTS.push(x); ACH[x.id] = x;
  });
})();
function buildMineKit() {
  var D = META.myDream; if (!D) return null;
  var ids = Object.keys(D.cyber || {}).map(function (k) { return D.cyber[k]; }).filter(function (id) { return MOD_BY[id]; });
  DREAM_KITS.mine = { cls: D.cls || 'assault', from: 16, to: 16, lv: D.lv || 20, mods: ids, run: D.run || {}, act: null, rule: '你自己的记录。B16，生产层。', mine: true };
  return DREAM_KITS.mine;
}
/* ---------- 成就分类 ---------- */
var ACH_CAT_OF = { kills: 'combat', bossKill: 'combat', monKill: 'combat', bossKillType: 'combat', critKills: 'combat', turns: 'combat', clearFloor: 'combat', depth: 'combat', shards: 'combat', useItems: 'combat',
  chalWins: 'challenge', chalBest: 'challenge', chalTier: 'challenge', chalScore: 'challenge', chalNoHeal: 'challenge', noHealWin: 'challenge', win: 'challenge',
  maxLoad: 'chrome', curAdapt: 'chrome', syncWin: 'chrome', overWin: 'chrome', psychoTotal: 'chrome', psychoKills: 'chrome',
  chapters: 'story', npcsDone: 'story', relics: 'story', duels: 'story', drinks: 'story', legends: 'story', dreamsOwned: 'story', dreamsPlayed: 'story', dreamsDone: 'story', lockedCh: 'story' };
function achCatOf(a) { if (a.hidden) return 'hidden'; if (a.cat) return a.cat; if (/^corp/.test(a.cond.type)) return 'corp'; if (/^fin/.test(a.cond.type)) return 'finale'; return ACH_CAT_OF[a.cond.type] || 'combat'; }
var ACH_CATS = ['story', 'combat', 'chrome', 'corp', 'challenge', 'finale', 'hidden'];
