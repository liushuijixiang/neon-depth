/* =========================================================
   CORP_V1 · 三家公司的义体线 / 套装 / 专用芯片 / 公司敌人 / 招揽委托与专属副本
   ========================================================= */
var CORPS = {
  dome: { name: '穹顶', en: 'DOME', tier: '企业级', color: '#b06bff', q: 'purple', motto: '一切都在合规范围内。',
    set: ['2 件：适应度 +3', '4 件：义体主动功率 +12%', '6 件：每次启动义体主动技能，获得 10% 最大生命的护盾'] },
  kharon: { name: '卡隆军工', en: 'KHARON', tier: '军用级', color: '#ffb347', q: 'orange', motto: '火力就是外交。',
    set: ['2 件：攻击 +3', '4 件：暴击伤害 +20%', '6 件：击杀时 30% 几率刷新一个义体冷却'] },
  mobius: { name: '莫比乌斯实验室', en: 'MÖBIUS', tier: '实验型', color: '#ff4d5e', q: 'red', motto: '我们不制造义体，我们培养它。',
    set: ['2 件：每回合回复 2% 生命', '4 件：失控时攻击 +6、吸血 +15%', '6 件：每层第一次受到致死伤害时恢复 50% 生命，并失控 2 回合'] }
};
var CORP_MODS = [
  // 穹顶 · 企业级（紫）
  { id: 'dome_eye', corp: 'dome', slot: 'eye', name: '穹顶·审计之眼', stats: { crit: .05, vision: 1 }, active: { name: '合规审计', type: 'mark_scan', cd: 4 }, lore: '穹顶内审部的标配。它能看见你的每一笔报销，也能看见墙后面的人。' },
  { id: 'dome_hand', corp: 'dome', slot: 'hand', name: '穹顶·白领义手', stats: { atk: 2, def: 1 }, active: { name: '免责声明', type: 'shield', cd: 5 }, lore: '握手时会自动扫描对方的信用评级。用来挡子弹也行，保修条款里没写不行。' },
  { id: 'dome_hand2', corp: 'dome', slot: 'hand', name: '穹顶·裁员刀', stats: { atk: 3 }, active: { name: '组织优化', type: 'cleave', cd: 4 }, lore: '人事部的人管它叫「优化工具」。刀柄上刻着工号，刻了好几层。' },
  { id: 'dome_body', corp: 'dome', slot: 'body', name: '穹顶·绩效躯干', stats: { maxHp: 14, def: 2 }, lore: '内置心率和工时监测。超过七十二小时不休息，它会自动给你打一针，然后继续。' },
  { id: 'dome_spine', corp: 'dome', slot: 'spine', name: '穹顶·KPI 脊柱', stats: { maxHp: 8, dodge: .03 }, active: { name: '弹性工作', type: 'drone', cd: 6 }, lore: '让你在工位上坐十六个小时不觉得腰疼。代价是你再也站不直了。' },
  { id: 'dome_leg', corp: 'dome', slot: 'leg', name: '穹顶·通勤腿', stats: { dodge: .04 }, active: { name: '打卡冲刺', type: 'blink', cd: 4 }, lore: '设计目标：八点五十九分从家里出发，九点整到工位。' },
  // 卡隆军工 · 军用级（橙）
  { id: 'kh_eye', corp: 'kharon', slot: 'eye', name: '卡隆·火控镜', stats: { crit: .06, execute: .15 }, active: { name: '饱和标定', type: 'beam', cd: 4 }, lore: '卡隆第三装甲旅退下来的。镜片上还留着一串没清掉的目标编号，最后一个是平民区。' },
  { id: 'kh_hand', corp: 'kharon', slot: 'hand', name: '卡隆·迫击臂', stats: { atk: 4 }, active: { name: '覆盖射击', type: 'multi', cd: 4 }, lore: '后坐力能把普通人的肩膀震碎，所以它连着肩膀一起卖。' },
  { id: 'kh_hand2', corp: 'kharon', slot: 'hand', name: '卡隆·榴弹手', stats: { atk: 3, crit: .03 }, active: { name: '清场', type: 'burst', cd: 4 }, lore: '五根手指里有三根是弹仓。戴着它没法弹钢琴，但能让钢琴消失。' },
  { id: 'kh_body', corp: 'kharon', slot: 'body', name: '卡隆·战术装甲', stats: { def: 3, maxHp: 12, thorns: 2 }, lore: '陶瓷复合板，外面喷了一层卡隆的橙色。战场上它是最显眼的靶子，也是最难打穿的那个。' },
  { id: 'kh_spine', corp: 'kharon', slot: 'spine', name: '卡隆·兴奋脊', stats: { atk: 2, crit: .04 }, active: { name: '战斗兴奋', type: 'grow', cd: 6 }, lore: '往脊髓里泵军用兴奋剂。说明书上写着「不建议连续使用超过三次」，后面被人涂掉了。' },
  { id: 'kh_leg', corp: 'kharon', slot: 'leg', name: '卡隆·跃进腿', stats: { dodge: .05 }, active: { name: '布雷撤离', type: 'mine', cd: 5 }, lore: '跳得很远，落地的地方会留下点东西。追你的人会知道是什么。' },
  // 莫比乌斯 · 实验型（红）
  { id: 'mb_eye', corp: 'mobius', slot: 'eye', name: '莫比乌斯·复眼', stats: { crit: .08, vision: 2 }, active: { name: '第二视界', type: 'sandevistan', cd: 7 }, lore: '一千二百个小眼睛，每个都在看不同的东西。第一周你会吐，第二周你会习惯，第三周你会开始挑食。' },
  { id: 'mb_eye2', corp: 'mobius', slot: 'eye', name: '莫比乌斯·裂隙之眼', stats: { crit: .06, execute: .2 }, active: { name: '凝视', type: 'beam', cd: 4 }, lore: '实验记录第 41 号：受试者声称能看见黑墙后面的颜色。第 42 号：受试者开始描述那种颜色。第 43 号：空白。' },
  { id: 'mb_hand', corp: 'mobius', slot: 'hand', name: '莫比乌斯·活体刃', stats: { atk: 5, lifesteal: .06 }, active: { name: '分食', type: 'cleave_bleed', cd: 3 }, lore: '刀刃是长出来的。它会饿，饿了会自己找吃的。' },
  { id: 'mb_body', corp: 'mobius', slot: 'body', name: '莫比乌斯·再生外膜', stats: { maxHp: 22, lifesteal: .04 }, lore: '一层会呼吸的膜，伤口一分钟就能长好。长出来的东西不一定是皮。' },
  { id: 'mb_spine', corp: 'mobius', slot: 'spine', name: '莫比乌斯·第二脊髓', stats: { atk: 3, dodge: .05 }, active: { name: '突变', type: 'grow', cd: 6 }, lore: '和原来那根并排长着。两根脊髓偶尔会意见不合，这时候你的身体会站在两边。' },
  { id: 'mb_leg', corp: 'mobius', slot: 'leg', name: '莫比乌斯·跃迁腿', stats: { dodge: .07 }, active: { name: '相位跃迁', type: 'blink', cd: 3 }, lore: '每次跳跃都会在原地留下一点点你。实验室说那不重要。' }
];
var CORP_LBL = { atk: '攻击', maxHp: '生命', def: '防御', crit: '暴击', dodge: '闪避', vision: '视野', lifesteal: '吸血', thorns: '反伤', execute: '残血伤害' };
CORP_MODS.forEach(function (d) {
  if (MOD_BY[d.id]) return;
  var C = CORPS[d.corp], q = C.q;
  var m = { id: d.id, slot: d.slot, quality: q, name: d.name, color: (QUALITY[q] || QUALITY.purple).color, stats: d.stats, corp: d.corp, dropOnly: true, lore: d.lore,
    desc: Object.keys(d.stats).map(function (k) { var v = d.stats[k]; return CORP_LBL[k] + ' +' + (v < 1 ? Math.round(v * 100) + '%' : v); }).join('，') + ' · ' + C.name + C.tier + '套装' };
  if (d.active) m.active = d.active;
  MODS.push(m); MOD_BY[m.id] = m;
});
var CORP_CHIP = { dome: { stat: 'compat', val: 1, name: '穹顶·协议芯片' }, kharon: { stat: 'critMult', val: .05, name: '卡隆·火控芯片' }, mobius: { stat: 'power', val: .045, name: '莫比乌斯·突变芯片' } };
function makeCorpChip(corp, q) {
  var b = CORP_CHIP[corp], qq = q || CORPS[corp].q, mult = CHIP_MULT[qq] || 1;
  var c = { id: 'corp_' + corp, name: b.name, stat: b.stat, val: chipRoll(b.stat, b.val, mult, false), quality: qq, grade: (QUALITY[qq] || QUALITY.gray).name, color: CORPS[corp].color, corp: corp, affixes: rollChipAffixes({ quality: qq, stat: b.stat }) };
  return c;
}
function corpCount(k) { var n = 0; Object.keys(G.cyber || {}).forEach(function (sl) { var m = MOD_BY[G.cyber[sl]]; if (m && m.corp === k && !instBroken(m.id)) n++; }); return n; }
function corpSetHTML(m) {
  if (!m || !m.corp) return '';
  var C = CORPS[m.corp], n = corpCount(m.corp);
  return '<div class="corpset" style="--cc:' + C.color + '"><b>' + C.name + ' · ' + C.tier + '套装 ' + n + '/6</b>' + C.set.map(function (t, i) { return '<span class="' + (n >= (i + 1) * 2 ? 'on' : '') + '">' + t + '</span>'; }).join('') + '<small>专用芯片「' + CORP_CHIP[m.corp].name + '」镶在本公司义体上时效果翻倍</small></div>';
}
/* ---------- 公司敌人 ---------- */
var CORP_ENEMIES = [
  { id: 'corp_dome_guard', corp: 'dome', name: '穹顶安保', ai: 'tank', glyph: 'square', color: '#b06bff', hp: [14, 34], atk: [3, 7], def: [1, 3], xp: 14, minDepth: 2, maxDepth: 10, weight: 2, desc: '穹顶的外包安保，按小时计费，按人头结算。', tacticName: '合规执法' },
  { id: 'corp_kharon_trooper', corp: 'kharon', name: '卡隆突击兵', ai: 'turret', glyph: 'square', color: '#ffb347', hp: [12, 30], atk: [4, 9], def: [0, 2], xp: 16, minDepth: 5, maxDepth: 13, weight: 2, range: 5, desc: '卡隆军工的现役步兵，橙色涂装是为了让你知道是谁打的你。', tacticName: '火力压制' },
  { id: 'corp_mobius_subject', corp: 'mobius', name: '莫比乌斯试体', ai: 'charger', glyph: 'triangle', color: '#ff4d5e', hp: [16, 38], atk: [5, 10], def: [0, 2], xp: 18, minDepth: 9, maxDepth: 15, weight: 2, desc: '从实验室跑出来的，或者是被放出来做野外测试的。它自己也不知道是哪一种。', tacticName: '失控突变' }
];
CORP_ENEMIES.forEach(function (d) { if (!MONSTERS.some(function (m) { return m.id === d.id; })) MONSTERS.push(Object.assign({ corpUnit: true, scale: 1 }, d)); });
function corpUnitKit(e, corp, strong) {
  var pool = CORP_MODS.filter(function (d) { return d.corp === corp && d.active; });
  e.corpKit = { corp: corp, mods: shuffle(pool.map(function (d) { return d.id; })).slice(0, strong ? 2 : 1), cd: 2 };
  e.color = CORPS[corp].color;
}
function corpUseSkill(e) {
  if (!e.corpKit) return false;
  var saved = e.psycho; e.psycho = { mods: e.corpKit.mods, cd: e.corpKit.cd, chips: [] };
  var r = false; try { r = psychoUseSkill(e); } finally { e.corpKit.cd = e.psycho.cd; e.psycho = saved; }
  return r;
}
function corpUnitDrop(e) {
  if (!e.corpKit || G.mode !== 'normal') return;
  var opBonus = G.corpOp && G.corpOp.active ? .1 : 0;
  if (Math.random() < .06 + opBonus) { var id = pick(e.corpKit.mods), m = MOD_BY[id]; if (m && G.modBag.indexOf(id) < 0) { var sp = freeDropSpots(e.x, e.y, 1)[0]; G.items.push({ x: sp.x, y: sp.y, mod: m, seed: 0 }); toast('掉落 · ' + m.name, 'good'); return; } }
  if (Math.random() < .12 + opBonus) { var sp2 = freeDropSpots(e.x, e.y, 1)[0]; G.items.push({ x: sp2.x, y: sp2.y, chip: makeCorpChip(e.corpKit.corp, Q_ORDER[Math.max(1, Q_ORDER.indexOf(CORPS[e.corpKit.corp].q) - 1)]), seed: 0 }); }
}
function corpPatrol(depth) {
  if (G.mode !== 'normal' || isBossFloor(depth) || (G.corpOp && G.corpOp.active) || Math.random() > .3) return;
  var spec = CORP_ENEMIES.filter(function (d) { return depth >= d.minDepth && depth <= d.maxDepth; });
  if (!spec.length) return; spec = MONSTERS.find(function (m) { return m.id === pick(spec).id; });
  for (var i = 0; i < 1 + (depth > 6 ? 1 : 0); i++) { var t = randomFloorTile(8, false); if (!t) break; var e = spawnEnemy(spec, t.x, t.y, depth); corpUnitKit(e, spec.corp, false); tacticUid(e); G.enemies.push(e); }
  msg('雷达上出现了 ' + CORPS[spec.corp].name + ' 的巡逻队', 'warn');
}
/* ---------- 招揽 ---------- */
var CORP_JOBS = {
  sabotage: { name: '断电', brief: '潜入{rival}的园区，炸掉三台主机。', goal: '摧毁 3 台{rival}主机' },
  heist: { name: '拷贝', brief: '进{rival}的数据库，把两个机房的资料拷出来。', goal: '入侵 2 个{rival}数据终端（每个站上去等待 3 回合）' }
};
var CORP_LINES = {
  dome: ['我们注意你很久了。别紧张，这是夸奖。', '这份合同的保密条款比工作内容长。签吧。', '做完这一单，你就是穹顶的合作伙伴了。至少这周是。'],
  kharon: ['我们不招人，我们征用。不过你可以选拒绝，第一次。', '目标、时间、火力配给，都在这里。问题留到任务结束后。', '卡隆付钱很准时。活着拿钱的人也很准时。'],
  mobius: ['你的神经适应数据很有意思。我们想……合作。', '报酬是实验型义体。副作用？那是另一份合同。', '别怕，这次是你去做实验，不是你被做实验。']
};
SITE_DEFS.corp = { name: '公司联络人', char: '契', color: '#fcee0a', reuse: true, tip: '公司来人招揽：替他们干一票，下一层就是任务现场', line: '' };
SITE_DEFS.terminal = { name: '数据终端', char: '端', color: '#22e6ff', reuse: true, tip: '站上去等待来入侵', line: '' };
function placeCorpSite(depth, sites) {
  if (G.mode !== 'normal' || isBossFloor(depth) || (depth - 1) % 5 > 2 || (G.corpOp && !G.corpOp.done)) return;
  var zone = stageOf(depth); G.corpZone = G.corpZone || {};
  if (G.corpZone[zone] || Math.random() > (G.forceCorp ? 1 : .45)) return;
  var t = null; for (var k = 0; k < 40; k++) { var c = randomFloorTile(5, false); if (c && !sites.some(function (s) { return Math.abs(s.x - c.x) + Math.abs(s.y - c.y) < 4; })) { t = c; break; } }
  if (!t) return;
  var ks = Object.keys(CORPS), corp = pick(ks), rival = pick(ks.filter(function (k) { return k !== corp; })), type = pick(Object.keys(CORP_JOBS));
  G.corpZone[zone] = 1;
  sites.push({ type: 'corp', x: t.x, y: t.y, used: false, seed: Math.random() * TAU, data: { corp: corp, rival: rival, job: type } });
}
function openCorp(s) {
  var d = s.data, C = CORPS[d.corp], R = CORPS[d.rival], J = CORP_JOBS[d.job];
  showModal('corp');
  var fmt = function (t) { return t.replace(/\{rival\}/g, R.name); };
  var offers = CORP_MODS.filter(function (m) { return m.corp === d.corp; }).slice(0, 6).map(function (m) { return MOD_BY[m.id]; });
  var html = '<div class="card site corpcard" style="--site:' + C.color + '"><div class="kicker">' + C.en + ' // ' + C.tier + ' · 招揽</div><h1 class="title small" style="color:' + C.color + '">' + C.name + '</h1>' +
    '<div class="story-text npc-say">「' + econEsc(pick(CORP_LINES[d.corp])) + '」</div>' +
    '<div class="corp-job"><b>委托「' + J.name + '」</b><p>' + econEsc(fmt(J.brief)) + '</p><small>目标：' + econEsc(fmt(J.goal)) + ' · 下一层将变为' + R.name + '的设施，敌人更强，完成目标后出口才会开启</small></div>' +
    '<div class="loot-h">报酬（任选一件 ' + C.tier + '义体 + 专用芯片）</div><div class="eq-grid">' + offers.map(function (m) { return '<div class="eq-card" style="--it:' + m.color + '"><b>' + m.name + '</b><small>' + (SLOT_LABEL[m.slot] || '') + (m.active ? ' · 「' + m.active.name + '」' : '') + '</small><em>' + m.desc + '</em></div>'; }).join('') + '</div>' +
    corpSetHTML(offers[0]) +
    (s.data.accepted ? '<div class="hint" style="color:#57ffa8">已接下。找到出口下潜。</div>' : '') +
    '<div class="dock">' + (s.data.accepted ? '' : '<button class="ghost" id="corpNo">不接</button><button class="cta" id="corpYes">接下委托</button>') + (s.data.accepted ? '<button class="cta" id="corpNo">离开</button>' : '') + '</div></div>';
  overlay.innerHTML = html;
  $('#corpNo').onclick = closeSite;
  var y = $('#corpYes'); if (y) y.onclick = function () {
    s.data.accepted = 1; s.used = true;
    G.corpOp = { corp: d.corp, rival: d.rival, job: d.job, depth: G.depth + 1, active: false, done: false, progress: 0 };
    toast('接下 ' + C.name + ' 的委托', 'good'); msg(C.name + '：「下一层见。」', 'warn'); sfx.quest(); closeSite();
  };
}
/* ---------- 专属副本：固定地图 ---------- */
function corpCarve(x, y, w, h) { for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) if (yy > 0 && xx > 0 && yy < MAP_H - 1 && xx < MAP_W - 1) G.map[yy][xx] = FLOOR; }
var CORP_LAYOUTS = {
  sabotage: { // 园区：左下大厅 → 两条主干道 → 三个机房 → 右下出口
    rooms: [[2, 21, 10, 7], [12, 23, 28, 2], [19, 4, 2, 21], [33, 4, 2, 21], [3, 3, 11, 7], [22, 3, 10, 7], [36, 3, 6, 9], [13, 13, 6, 6], [23, 13, 9, 7], [36, 19, 6, 9], [12, 5, 7, 2], [32, 6, 4, 2], [5, 10, 2, 11], [21, 15, 2, 2], [32, 15, 1, 2]],
    start: [5, 25], exit: [39, 25], objs: [[8, 6], [27, 6], [39, 7]], spawns: [[15, 15], [27, 16], [20, 10], [34, 10], [6, 15], [24, 23], [30, 24], [38, 21], [10, 7], [29, 4], [38, 22], [16, 24], [6, 12], [25, 6]],
    sites: [['fountain', 15, 18], ['vault', 28, 18]]
  },
  heist: { // 数据库：中央开放办公区 + 左右两个金库机房，出口在上方
    rooms: [[17, 23, 10, 5], [21, 17, 2, 6], [8, 11, 28, 6], [3, 3, 9, 8], [32, 3, 9, 8], [6, 9, 2, 3], [36, 9, 2, 3], [18, 3, 8, 6], [21, 8, 2, 4], [12, 19, 5, 6], [27, 19, 5, 6], [16, 21, 2, 2], [26, 21, 2, 2]],
    start: [22, 25], exit: [22, 4], objs: [[7, 6], [36, 6]], spawns: [[12, 13], [18, 14], [26, 14], [32, 13], [6, 5], [9, 8], [34, 5], [38, 8], [20, 5], [24, 6], [14, 21], [29, 21], [22, 12], [10, 15]],
    sites: [['fountain', 14, 22], ['doctor', 29, 23]]
  }
};
function genCorpOp(depth) {
  var op = G.corpOp, L = CORP_LAYOUTS[op.job], R = CORPS[op.rival];
  op.active = true; op.progress = 0; op.need = op.job === 'sabotage' ? 3 : 2;
  G.enemies = []; G.items = []; G.stairs = null; G.bossAlive = false; G.extract = false; G.anomaly = null; G.corpses = []; G.tacticFx = [];
  G.map = []; G.seen = []; G.vis = [];
  for (var y = 0; y < MAP_H; y++) { var row = [], s1 = [], v1 = []; for (var x = 0; x < MAP_W; x++) { row.push(WALL); s1.push(0); v1.push(0); } G.map.push(row); G.seen.push(s1); G.vis.push(v1); }
  L.rooms.forEach(function (r) { corpCarve(r[0], r[1], r[2], r[3]); });
  G.rooms = L.rooms.map(function (r) { return { x: r[0], y: r[1], w: r[2], h: r[3], cx: r[0] + (r[2] >> 1), cy: r[1] + (r[3] >> 1) }; });
  p.x = L.start[0]; p.y = L.start[1]; G.map[p.y][p.x] = FLOOR;
  G.stairs = { x: L.exit[0], y: L.exit[1] }; G.map[G.stairs.y][G.stairs.x] = FLOOR;
  G.sites = [];
  if (op.job === 'sabotage') L.objs.forEach(function (o) {
    var hp = Math.round((40 + depth * 14) * 1.2);
    G.enemies.push({ spec: { id: 'corp_gen', name: R.name + '主机', hp: [hp, hp], atk: [0, 0] }, id: 'corp_gen', name: R.name + '主机', ai: 'structure', structure: 'gen', corpObj: 'gen', glyph: 'hex', color: R.color, x: o[0], y: o[1], hp: hp, maxHp: hp, atk: 0, def: 1, xp: 10, range: 0, cd: 0, tick: 0, stun: 0, alerted: false, boss: false, buffs: [], burn: 0, brain: { step: 0, stage: 0, stance: '运行', angle: 0, plate: 100, repair: 0 } });
  });
  else L.objs.forEach(function (o) { G.sites.push({ type: 'terminal', x: o[0], y: o[1], used: false, seed: 0, data: { prog: 0 } }); });
  L.sites.forEach(function (st) { G.sites.push({ type: st[0], x: st[1], y: st[2], used: false, seed: Math.random() * TAU, data: {} }); });
  var unit = MONSTERS.find(function (m) { return m.corpUnit && m.corp === op.rival; });
  L.spawns.forEach(function (sp, i) {
    var spec = i % 3 === 2 ? pickMonster(depth) : unit;
    if (G.map[sp[1]][sp[0]] !== FLOOR) return;
    var e = spawnEnemy(spec, sp[0], sp[1], depth + 1); e.hp = e.maxHp = Math.round(e.maxHp * 1.3); e.atk += 1;
    if (spec === unit) corpUnitKit(e, op.rival, depth >= 6); if (i % 5 === 0) econMakeElite(e);
    tacticUid(e); G.enemies.push(e);
  });
  for (var it = 0; it < 3; it++) { var t2 = randomFloorTile(3, false); if (t2) G.items.push({ x: t2.x, y: t2.y, it: it ? pickItem(depth) : pickHealItem(), seed: 0 }); }
  G.opWall = R.color;
  G.bossName = '';
  return true;
}
function corpObjDone() {
  var op = G.corpOp; if (!op || op.done) return;
  op.done = true; G.opWall = null;
  toast('目标完成 · 出口已开启', 'good'); msg(CORPS[op.corp].name + '：「干得漂亮。出口开了，报酬在下面等你。」', 'good');
  nvColumn(p.x, p.y, CORPS[op.corp].color, 6); sfx.level();
  G.items.push({ x: G.stairs.x, y: G.stairs.y, corpReward: op.corp, seed: 0 });
}
function corpProgress() {
  var op = G.corpOp; if (!op || !op.active || op.done) return;
  op.progress++; toast(CORP_JOBS[op.job].name + ' · ' + op.progress + '/' + op.need, 'warn');
  if (op.progress >= op.need) corpObjDone();
}
function openTerminal(s) {
  var op = G.corpOp; if (!op || !op.active) return;
  showModal('terminal');
  var R = CORPS[op.rival], pr = s.data.prog || 0;
  overlay.innerHTML = '<div class="card site" style="--site:' + R.color + '"><div class="sign"><i>端</i></div><div class="kicker">' + R.en + ' // 数据终端</div><h1 class="title small">' + (s.used ? '已拷贝' : '入侵中 ' + pr + '/3') + '</h1>' +
    '<div class="bag-bar">' + [0, 1, 2].map(function (i) { return '<u class="' + (i < pr ? 'on' : '') + '"></u>'; }).join('') + '</div>' +
    '<div class="hint">每入侵一回合都会触发警报，附近会有' + R.name + '的人赶来。</div><div class="dock"><button class="ghost" id="tmLeave">离开</button>' + (s.used ? '' : '<button class="cta" id="tmGo">继续入侵（1 回合）</button>') + '</div></div>';
  $('#tmLeave').onclick = closeSite;
  var go = $('#tmGo'); if (go) go.onclick = function () {
    s.data.prog = (s.data.prog || 0) + 1; hideOverlay();
    var unit = MONSTERS.find(function (m) { return m.corpUnit && m.corp === op.rival; }), sp = randomFloorTile(5, false);
    if (unit && sp && Math.random() < .7) { var e = spawnEnemy(unit, sp.x, sp.y, G.depth + 1); corpUnitKit(e, op.rival, false); e.alerted = true; tacticUid(e); G.enemies.push(e); msg('警报 · ' + R.name + '的人在靠近', 'bad'); }
    if (s.data.prog >= 3) { s.used = true; corpProgress(); }
    endTurn(); econResume();
  };
}
function corpRewardScreen(corp) {
  showModal('corpreward');
  var C = CORPS[corp], pool = shuffle(CORP_MODS.filter(function (d) { return d.corp === corp && G.modBag.indexOf(d.id) < 0; })).slice(0, 3);
  var chip = makeCorpChip(corp);
  overlay.innerHTML = '<div class="card corpcard" style="--site:' + C.color + '"><div class="kicker">' + C.en + ' // 报酬</div><h1 class="title small" style="color:' + C.color + '">挑一件</h1>' +
    '<div class="eq-grid">' + pool.map(function (d) { var m = MOD_BY[d.id]; return '<button class="eq-card" data-crw="' + m.id + '" style="--it:' + m.color + '"><b>' + m.name + '</b><small>' + (SLOT_LABEL[m.slot] || '') + (m.active ? ' · 「' + m.active.name + '」' : '') + '</small><em>' + m.desc + '</em></button>'; }).join('') + '</div>' +
    '<div class="loot-h">另附专用芯片</div>' + chipRow(chip, '', '') + corpSetHTML(MOD_BY[pool[0] ? pool[0].id : CORP_MODS[0].id]) + '</div>';
  $$('[data-crw]').forEach(function (b) { b.onclick = function () {
    var m = MOD_BY[b.getAttribute('data-crw')]; hideOverlay();
    if (applyMod(m) === false) { var sp = freeDropSpots(p.x, p.y, 1)[0]; G.items.push({ x: sp.x, y: sp.y, mod: m, seed: 0 }); }
    addChipObject(chip); gainCredits(30 + G.depth * 4, p.x, p.y); toast('报酬到账 · ' + m.name, 'good'); updateHUD(); econResume();
  }; });
}
