/* =========================================================
   CORP_V2 · 三家公司 × 三档义体 / 公司兵 / 六类委托 / 各家机关 / 体验装 / 剧情接入
   ========================================================= */
var CX = (window.NEON && window.NEON.corps) || { corps: {}, jobs: {}, targets: {}, subjects: [], workers: [], barks: {}, mods: [], chapters: [], scenes: {}, achievements: [], dreams: [], bar: [] };
var CORPS = {
  dome: { name: '穹顶', en: 'DOME', tier: '企业级', color: '#b06bff', motto: '一切都在合规范围内。',
    set: ['2 件：适应度 +3', '4 件：义体主动功率 +12%', '6 件：每次启动义体主动技能，获得 10% 最大生命的护盾'] },
  kharon: { name: '卡隆军工', en: 'KHARON', tier: '军用级', color: '#ffb347', motto: '火力就是外交。',
    set: ['2 件：攻击 +3', '4 件：暴击伤害 +20%', '6 件：击杀时 30% 几率刷新一个义体冷却'] },
  mobius: { name: '莫比乌斯实验室', en: 'MÖBIUS', tier: '实验型', color: '#ff4d5e', motto: '我们不制造义体，我们培养它。',
    set: ['2 件：每回合回复 2% 生命', '4 件：失控时攻击 +6、吸血 +15%', '6 件：每层第一次受到致死伤害时恢复 50% 生命，并失控 2 回合'] }
};
Object.keys(CORPS).forEach(function (k) { var c = (CX.corps || {})[k] || {}; CORPS[k].bio = c.bio || ''; CORPS[k].recruiter = c.recruiter || { name: '联络人', title: '' }; CORPS[k].lines = c; if (c.motto) CORPS[k].motto = c.motto; });
var CORP_QNAME = { purple: '精品', orange: '专供', red: '原型' };
function corpZoneQ(depth) { return ['purple', 'orange', 'red'][Math.max(0, Math.min(2, stageOf(depth || G.depth || 1) - 1))]; }
/* ---------- 义体 ---------- */
var CORP_MODS = [
  { id: 'dome_eye', corp: 'dome', q: 'purple', slot: 'eye', name: '穹顶·审计之眼', stats: { crit: .05, vision: 1 }, active: { name: '合规审计', type: 'mark_scan', cd: 4 }, lore: '穹顶内审部的标配。它能看见你的每一笔报销，也能看见墙后面的人。' },
  { id: 'dome_hand', corp: 'dome', q: 'purple', slot: 'hand', name: '穹顶·白领义手', stats: { atk: 2, def: 1 }, active: { name: '免责声明', type: 'shield', cd: 5 }, lore: '握手时会自动扫描对方的信用评级。用来挡子弹也行，保修条款里没写不行。' },
  { id: 'dome_hand2', corp: 'dome', q: 'purple', slot: 'hand2', name: '穹顶·裁员刀', stats: { atk: 3 }, active: { name: '组织优化', type: 'cleave', cd: 4 }, lore: '人事部的人管它叫「优化工具」。刀柄上刻着工号，刻了好几层。' },
  { id: 'dome_body', corp: 'dome', q: 'purple', slot: 'body', name: '穹顶·绩效躯干', stats: { maxHp: 14, def: 2 }, lore: '内置心率和工时监测。超过七十二小时不休息，它会自动给你打一针，然后继续。' },
  { id: 'dome_spine', corp: 'dome', q: 'purple', slot: 'spine', name: '穹顶·KPI 脊柱', stats: { maxHp: 8, dodge: .03 }, active: { name: '弹性工作', type: 'drone', cd: 6 }, lore: '让你在工位上坐十六个小时不觉得腰疼。代价是你再也站不直了。' },
  { id: 'dome_leg', corp: 'dome', q: 'purple', slot: 'leg', name: '穹顶·通勤腿', stats: { dodge: .04 }, active: { name: '打卡冲刺', type: 'blink', cd: 4 }, lore: '设计目标：八点五十九分从家里出发，九点整到工位。' },
  { id: 'kh_eye', corp: 'kharon', q: 'orange', slot: 'eye', name: '卡隆·火控镜', stats: { crit: .06, execute: .15 }, active: { name: '饱和标定', type: 'beam', cd: 4 }, lore: '卡隆第三装甲旅退下来的。镜片上还留着一串没清掉的目标编号，最后一个是平民区。' },
  { id: 'kh_hand', corp: 'kharon', q: 'orange', slot: 'hand', name: '卡隆·迫击臂', stats: { atk: 4 }, active: { name: '覆盖射击', type: 'multi', cd: 4 }, lore: '后坐力能把普通人的肩膀震碎，所以它连着肩膀一起卖。' },
  { id: 'kh_hand2', corp: 'kharon', q: 'orange', slot: 'hand2', name: '卡隆·榴弹手', stats: { atk: 3, crit: .03 }, active: { name: '清场', type: 'burst', cd: 4 }, lore: '五根手指里有三根是弹仓。戴着它没法弹钢琴，但能让钢琴消失。' },
  { id: 'kh_body', corp: 'kharon', q: 'orange', slot: 'body', name: '卡隆·战术装甲', stats: { def: 3, maxHp: 12, thorns: 2 }, lore: '陶瓷复合板，外面喷了一层卡隆的橙色。战场上它是最显眼的靶子，也是最难打穿的那个。' },
  { id: 'kh_spine', corp: 'kharon', q: 'orange', slot: 'spine', name: '卡隆·兴奋脊', stats: { atk: 2, crit: .04 }, active: { name: '战斗兴奋', type: 'grow', cd: 6 }, lore: '往脊髓里泵军用兴奋剂。说明书上写着「不建议连续使用超过三次」，后面被人涂掉了。' },
  { id: 'kh_leg', corp: 'kharon', q: 'orange', slot: 'leg', name: '卡隆·跃进腿', stats: { dodge: .05 }, active: { name: '布雷撤离', type: 'mine', cd: 5 }, lore: '跳得很远，落地的地方会留下点东西。追你的人会知道是什么。' },
  { id: 'mb_eye', corp: 'mobius', q: 'red', slot: 'eye', name: '莫比乌斯·复眼', stats: { crit: .08, vision: 2 }, active: { name: '第二视界', type: 'sandevistan', cd: 7 }, lore: '一千二百个小眼睛，每个都在看不同的东西。第一周你会吐，第二周你会习惯，第三周你会开始挑食。' },
  { id: 'mb_eye2', corp: 'mobius', q: 'red', slot: 'hand2', name: '莫比乌斯·裂隙之爪', stats: { atk: 4, execute: .2 }, active: { name: '凝视', type: 'mb_parasite', cd: 4 }, lore: '实验记录第 41 号：受试者声称能看见黑墙后面的颜色。第 42 号：受试者开始描述那种颜色。第 43 号：空白。' },
  { id: 'mb_hand', corp: 'mobius', q: 'red', slot: 'hand', name: '莫比乌斯·活体刃', stats: { atk: 5, lifesteal: .06 }, active: { name: '分食', type: 'cleave_bleed', cd: 3 }, lore: '刀刃是长出来的。它会饿，饿了会自己找吃的。' },
  { id: 'mb_body', corp: 'mobius', q: 'red', slot: 'body', name: '莫比乌斯·再生外膜', stats: { maxHp: 22, lifesteal: .04 }, lore: '一层会呼吸的膜，伤口一分钟就能长好。长出来的东西不一定是皮。' },
  { id: 'mb_spine', corp: 'mobius', q: 'red', slot: 'spine', name: '莫比乌斯·第二脊髓', stats: { atk: 3, dodge: .05 }, active: { name: '突变', type: 'mb_split', cd: 7 }, lore: '和原来那根并排长着。两根脊髓偶尔会意见不合，这时候你的身体会站在两边。' },
  { id: 'mb_leg', corp: 'mobius', q: 'red', slot: 'leg', name: '莫比乌斯·跃迁腿', stats: { dodge: .07 }, active: { name: '相位跃迁', type: 'blink', cd: 3 }, lore: '每次跳跃都会在原地留下一点点你。实验室说那不重要。' }
];
var CORP_PROFILE = {
  dome: { eye: { crit: .04, vision: 1 }, hand: { atk: 2, def: 1 }, hand2: { atk: 3 }, body: { maxHp: 12, def: 2 }, spine: { maxHp: 8, dodge: .02 }, leg: { dodge: .03, def: 1 } },
  kharon: { eye: { crit: .04, execute: .12 }, hand: { atk: 3 }, hand2: { atk: 2, crit: .02 }, body: { def: 2, maxHp: 10, thorns: 2 }, spine: { atk: 2, crit: .03 }, leg: { dodge: .03, atk: 1 } },
  mobius: { eye: { crit: .04, vision: 1 }, hand: { atk: 3, lifesteal: .03 }, hand2: { atk: 2, execute: .1 }, body: { maxHp: 14, lifesteal: .02 }, spine: { atk: 2, dodge: .03 }, leg: { dodge: .04 } }
};
var CORP_QMUL = { purple: 1, orange: 1.35, red: 1.75 };
var CORP_ACTS = {
  purple: { dome: { eye: 'mark_scan', hand: 'shield', hand2: 'cleave', body: 'shield', spine: 'drone', leg: 'blink' }, kharon: { eye: 'beam', hand: 'multi', hand2: 'burst', body: 'grow', spine: 'grow', leg: 'mine' }, mobius: { eye: 'sandevistan', hand: 'cleave_bleed', hand2: 'cleave_bleed', body: 'grow', spine: 'grow', leg: 'blink' } },
  hi: { dome: { eye: 'dome_audit', hand: 'dome_nda', hand2: 'dome_layoff', body: 'shield', spine: 'drone', leg: 'blink' }, kharon: { eye: 'kh_airstrike', hand: 'multi', hand2: 'kh_suppress', body: 'grow', spine: 'kh_airstrike', leg: 'mine' }, mobius: { eye: 'mb_parasite', hand: 'cleave_bleed', hand2: 'mb_split', body: 'grow', spine: 'mb_split', leg: 'blink' } }
};
var CORP_ACT_CD = { dome_audit: 5, dome_nda: 4, dome_layoff: 4, kh_airstrike: 5, kh_suppress: 5, mb_parasite: 4, mb_split: 7, mark_scan: 4, shield: 5, cleave: 4, drone: 6, blink: 4, beam: 4, multi: 4, burst: 4, grow: 6, mine: 5, sandevistan: 7, cleave_bleed: 3 };
(CX.mods || []).forEach(function (d) {
  var st = {}, base = CORP_PROFILE[d.corp][d.slot] || {}, k = CORP_QMUL[d.q] || 1;
  Object.keys(base).forEach(function (s) { var v = base[s] * k; st[s] = base[s] < 1 ? Math.round(v * 100) / 100 : Math.round(v); });
  var ty = d.act ? (d.q === 'purple' ? CORP_ACTS.purple : CORP_ACTS.hi)[d.corp][d.slot] : null;
  if (d.act && d.slot === 'body') ty = d.corp === 'kharon' ? 'kh_suppress' : d.corp === 'mobius' ? 'mb_parasite' : 'shield';
  CORP_MODS.push({ id: 'cx_' + d.corp + '_' + d.q + '_' + d.slot, corp: d.corp, q: d.q, slot: d.slot, name: d.name, stats: st, active: ty ? { name: d.act, type: ty, cd: CORP_ACT_CD[ty] || 5 } : null, lore: d.lore });
});
var CORP_LBL = { atk: '攻击', maxHp: '生命', def: '防御', crit: '暴击', dodge: '闪避', vision: '视野', lifesteal: '吸血', thorns: '反伤', execute: '残血伤害' };
CORP_MODS.forEach(function (d) {
  if (MOD_BY[d.id]) return;
  var C = CORPS[d.corp], q = d.q, slot = d.slot === 'hand2' ? 'hand' : d.slot;
  var m = { id: d.id, slot: slot, quality: q, name: d.name, color: (QUALITY[q] || QUALITY.purple).color, stats: d.stats, corp: d.corp, corpSlot: d.slot, dropOnly: true, lore: d.lore,
    desc: Object.keys(d.stats).map(function (k) { var v = d.stats[k]; return CORP_LBL[k] + ' +' + (v < 1 ? Math.round(v * 100) + '%' : v); }).join('，') + ' · ' + C.name + CORP_QNAME[q] };
  if (d.active) m.active = d.active;
  MODS.push(m); MOD_BY[m.id] = m;
});
function corpModsOf(corp, q) { return CORP_MODS.filter(function (d) { return d.corp === corp && (!q || d.q === q); }).map(function (d) { return d.id; }); }
/* 新技能说明 */
Object.assign(ACTIVE_INFO, {
  dome_audit: '视野内全部敌人被标记并「立案」4 回合：受到伤害 +25%，各受 0.6 倍技能伤害',
  dome_nda: '5 格内最近的敌人缴械 3 回合、打断蓄力，并受 1.2 倍技能伤害',
  dome_layoff: '2 格内生命最低的敌人：低于 30% 直接裁掉（守卫除外），否则 1.6 倍技能伤害',
  kh_airstrike: '标定 7 格内最近敌人周围 3×3，下回合炮击，每格 2.2 倍技能伤害（会误伤自己）',
  kh_suppress: '4 格内全部敌人被压制 1 回合并受 0.8 倍技能伤害',
  mb_parasite: '向 4 格内一个敌人植入寄生体 4 回合：每回合吸取 0.5 倍技能伤害为自己回血',
  mb_split: '分裂出一具突变体同伴，存在 8 回合，攻击力为你的 70%'
});
Object.assign(ACT_LABEL, { dome_audit: '控制', dome_nda: '控制', dome_layoff: '攻击', kh_airstrike: '攻击', kh_suppress: '控制', mb_parasite: '吸取', mb_split: '召唤' });
Object.assign(ACT_COLOR, { dome_audit: '#b06bff', dome_nda: '#c99bff', dome_layoff: '#ff6b81', kh_airstrike: '#ffb347', kh_suppress: '#ffd166', mb_parasite: '#ff4d5e', mb_split: '#ff7a8a' });
function corpActive(a, id, base) {
  var ty = a.type, near = function (r) { return G.enemies.filter(function (e) { return e.hp > 0 && !e.neutral && visibleTarget(e) && Math.max(Math.abs(e.x - p.x), Math.abs(e.y - p.y)) <= r; }).sort(function (x, y) { return Math.max(Math.abs(x.x - p.x), Math.abs(x.y - p.y)) - Math.max(Math.abs(y.x - p.x), Math.abs(y.y - p.y)); }); };
  function hit(e, mul, col) { var h = playerHit(e, base * mul, { source: 'cyber-' + id }); e.alerted = true; float(e.x, e.y, (h.crit ? '暴击 ' : '') + '-' + h.damage, col, true); nvSpawn(e.x, e.y, col, 8); if (e.hp <= 0) killEnemy(e); return h; }
  var col = ACT_COLOR[ty] || '#fcee0a', t;
  if (ty === 'dome_audit') { var v = near(9); if (!v.length) return 'none'; v.forEach(function (e) { e.marked = true; e.marks = (e.marks || 0) + 2; e.vulnT = 4; hit(e, .6, col); }); NV.glitch = .5; return true; }
  if (ty === 'dome_nda') { t = near(5)[0]; if (!t) return 'none'; t.disarmT = Math.max(t.disarmT || 0, 3); t.intent = null; float(t.x, t.y, '保密协议', col, true); hit(t, 1.2, col); return true; }
  if (ty === 'dome_layoff') { t = near(2).sort(function (x, y) { return x.hp / x.maxHp - y.hp / y.maxHp; })[0]; if (!t) return 'none'; if (!t.boss && t.hp < t.maxHp * .3) { float(t.x, t.y, '已优化', col, true); t.hp = 0; killEnemy(t); } else hit(t, 1.6, col); return true; }
  if (ty === 'kh_airstrike') { t = near(7)[0]; if (!t) return 'none'; var cells = tacticArea(t.x, t.y, 1); G.corpStrikes = G.corpStrikes || []; G.corpStrikes.push({ cells: cells, dmg: Math.round(base * 2.2), turns: 1 }); G.hazards.push({ cells: cells, delay: 1, active: false, corpStrike: true, life: 2 }); float(t.x, t.y, '炮击标定', col, true); return true; }
  if (ty === 'kh_suppress') { var s = near(4); if (!s.length) return 'none'; s.forEach(function (e) { e.stun = Math.max(e.stun || 0, 1); e.intent = null; hit(e, .8, col); }); G.shake = 6; return true; }
  if (ty === 'mb_parasite') { t = near(4)[0]; if (!t) return 'none'; t.parasite = { turns: 4, dmg: Math.round(base * .5) }; float(t.x, t.y, '寄生', col, true); hit(t, .5, col); return true; }
  if (ty === 'mb_split') { var sp = freeAdjacent(p.x, p.y); if (!sp) return 'none'; G.allies.push({ kind: 'hacked', name: '突变体', x: sp.x, y: sp.y, atk: Math.max(3, Math.round(effAtk() * .7)), hp: 30, turns: 8, color: '#ff4d5e', glyph: 'triangle', floorOnly: true }); nvSpawn(sp.x, sp.y, col, 16); return true; }
  return false;
}
function corpCount(k) { var n = 0; Object.keys(G.cyber || {}).forEach(function (sl) { var m = MOD_BY[G.cyber[sl]]; if (m && m.corp === k && !instBroken(m.id)) n++; }); return n; }
var CORP_CHIP = { dome: { stat: 'compat', val: 1, name: '穹顶·协议芯片' }, kharon: { stat: 'critMult', val: .05, name: '卡隆·火控芯片' }, mobius: { stat: 'power', val: .045, name: '莫比乌斯·突变芯片' } };
function makeCorpChip(corp, q, heavy) {
  var b = CORP_CHIP[corp], qq = q || corpZoneQ(), mult = CHIP_MULT[qq] || 1;
  var c = { id: 'corp_' + corp, name: (heavy ? '重改·' : '') + b.name, stat: b.stat, val: chipRoll(b.stat, b.val, mult * (heavy ? 1.6 : 1), false), quality: qq, grade: (QUALITY[qq] || QUALITY.gray).name, color: CORPS[corp].color, corp: corp, affixes: rollChipAffixes({ quality: qq, stat: b.stat }) };
  if (heavy) { c.heavy = 2; c.mech = true; }
  return c;
}
function corpSetHTML(m) {
  if (!m || !m.corp) return '';
  var C = CORPS[m.corp], n = corpCount(m.corp);
  return '<div class="corpset" style="--cc:' + C.color + '"><b>' + C.name + ' · 套装 ' + n + '/6</b>' + C.set.map(function (t, i) { return '<span class="' + (n >= (i + 1) * 2 ? 'on' : '') + '">' + t + '</span>'; }).join('') + '<small>专用芯片「' + CORP_CHIP[m.corp].name + '」镶在本公司义体上时主词条翻倍</small></div>';
}
/* ---------- 公司兵 ---------- */
var CORP_ENEMIES = [
  { id: 'corp_dome_guard', corp: 'dome', name: '穹顶安保', ai: 'tank', glyph: 'square', color: '#b06bff', hp: [16, 40], atk: [4, 9], def: [1, 3], xp: 14, desc: '穹顶的外包安保，按小时计费，按人头结算。', tacticName: '合规执法' },
  { id: 'corp_dome_dog', corp: 'dome', name: '穹顶职员', ai: 'chase', glyph: 'diamond', color: '#c99bff', hp: [10, 26], atk: [3, 7], def: [0, 1], xp: 8, desc: '穹顶的上班族，兼职安保。平时只想下班，看见入侵者就想加班费。', tacticName: '公司狗' },
  { id: 'corp_kharon_trooper', corp: 'kharon', name: '卡隆突击兵', ai: 'turret', glyph: 'square', color: '#ffb347', hp: [14, 34], atk: [5, 10], def: [0, 2], xp: 16, range: 5, desc: '卡隆军工的现役步兵，橙色涂装是为了让你知道是谁打的你。', tacticName: '火力压制' },
  { id: 'corp_kharon_mech', corp: 'kharon', name: '卡隆步行机甲', ai: 'tank', glyph: 'hex', color: '#ff9f43', hp: [60, 140], atk: [7, 14], def: [2, 5], xp: 40, desc: '两条腿的履带车，驾驶员是个刚满十八岁的征召兵。', tacticName: '重装推进' },
  { id: 'corp_mobius_subject', corp: 'mobius', name: '莫比乌斯试体', ai: 'charger', glyph: 'triangle', color: '#ff4d5e', hp: [18, 42], atk: [6, 11], def: [0, 2], xp: 18, desc: '从实验室跑出来的，或者是被放出来做野外测试的。它自己也不知道是哪一种。', tacticName: '失控突变' },
  { id: 'corp_mobius_beast', corp: 'mobius', name: '笼中实验体', ai: 'charger', glyph: 'star', color: '#ff2f6d', hp: [90, 200], atk: [9, 16], def: [1, 3], xp: 60, desc: '关在笼子里的东西。放出来以后谁离它近它咬谁。', tacticName: '见谁咬谁' }
];
CORP_ENEMIES.forEach(function (d) { if (!MONSTERS.some(function (m) { return m.id === d.id; })) MONSTERS.push(Object.assign({ corpUnit: true, scale: 1, minDepth: 1, maxDepth: 16, weight: 0 }, d)); });
Object.assign(MON_ART, { corp_dome_dog: ['suit', ['badge', 'legs4'], 'dot'], corp_kharon_mech: ['box', ['legs4', 'twin', 'pack'], 'visor'], corp_mobius_beast: ['skull', ['claws', 'legs4', 'spikes'], 'bigeye'] });
function corpSpec(id) { return MONSTERS.find(function (m) { return m.id === id; }); }
function corpUnitKit(e, corp, strong, q) {
  var pool = corpModsOf(corp, q || corpZoneQ()).filter(function (id) { return MOD_BY[id].active; });
  e.corpKit = { corp: corp, mods: shuffle(pool).slice(0, strong ? 3 : 1), cd: 2, i: 0, q: q || corpZoneQ() };
  e.color = CORPS[corp].color;
}
function corpUseSkill(e) {
  var k = e.corpKit; if (!k || !e.alerted || e.neutral) return false;
  if (--k.cd > 0) return false;
  var d = cyberDistance(e, p); if (d > 7) return false;
  var m = MOD_BY[k.mods[k.i++ % k.mods.length]]; if (!m || !m.active) return false;
  var ty = m.active.type, nm = m.active.name; k.cd = 3;
  float(e.x, e.y, '「' + nm + '」', CORPS[k.corp].color, true);
  if (/beam|multi|arc|airstrike|audit/.test(ty)) tacticQueue(e, 'corp-' + ty, nm, ty === 'kh_airstrike' ? tacticArea(p.x, p.y, 1) : tacticLine(e, 9, p.x, p.y), ty === 'kh_airstrike' ? 2 : 1, Math.round(e.atk * 1.5));
  else if (ty === 'blink' || ty === 'sandevistan') { var land = freeAdjacent(p.x, p.y); if (land) { nvSpawn(e.x, e.y, e.color, 12); e.x = land.x; e.y = land.y; enemyMelee(e); } }
  else if (/shield|grow|drone|stealth|heal/.test(ty)) { e.shieldT = 3; var h = Math.round(e.maxHp * .12); e.hp = Math.min(e.maxHp, e.hp + h); float(e.x, e.y, '+' + h, C.green); }
  else if (ty === 'mb_parasite') { if (d <= 4) { var dm = hurtPlayer(Math.round(e.atk * .9), e); e.hp = Math.min(e.maxHp, e.hp + dm); float(e.x, e.y, '吸取 +' + dm, '#ff4d5e'); } }
  else if (ty === 'mb_split' || ty === 'mine') { if (typeof summonMinions === 'function') summonMinions(e, 1, ['chase', 'charger']); }
  else if (ty === 'dome_nda') { addBuff('slow', 2, 0, '保密协议'); float(p.x, p.y, '缄默', '#c99bff'); }
  else tacticQueue(e, 'corp-burst', nm, tacticArea(e.x, e.y, 2), 1, Math.round(e.atk * 1.7));
  return true;
}
function corpUnitDrop(e) {
  if (!e.corpKit || G.mode !== 'normal' || e.trialGear) return;
  var op = G.corpOp && G.corpOp.active ? .08 : 0, q = e.corpKit.q || corpZoneQ();
  if (e.frenzyByGhost && Math.random() < .15) { var sh = freeDropSpots(e.x, e.y, 1)[0]; G.items.push({ x: sh.x, y: sh.y, chip: makeCorpChip(e.corpKit.corp, q, true), seed: 0 }); toast('骇疯的员工身上掉出一枚重改芯片', 'good'); }
  if (Math.random() < (e.vip ? 1 : .05 + op)) { var id = pick(e.corpKit.mods), m = MOD_BY[id]; if (m && G.modBag.indexOf(id) < 0) { var sp = freeDropSpots(e.x, e.y, 1)[0]; G.items.push({ x: sp.x, y: sp.y, mod: m, seed: 0 }); toast('掉落 · ' + m.name, 'good'); return; } }
  if (Math.random() < .1 + op) { var sp2 = freeDropSpots(e.x, e.y, 1)[0]; G.items.push({ x: sp2.x, y: sp2.y, chip: makeCorpChip(e.corpKit.corp, Q_ORDER[Math.max(1, Q_ORDER.indexOf(q) - 1)]), seed: 0 }); }
}
function corpSpawn(id, x, y, depth, o) {
  o = o || {}; var spec = corpSpec(id); if (!spec || !G.map[y] || G.map[y][x] !== FLOOR || occupied(x, y)) return null;
  var e = spawnEnemy(spec, x, y, depth || G.depth); if (o.mul) { e.hp = e.maxHp = Math.round(e.maxHp * o.mul); e.atk = Math.round(e.atk * (1 + (o.mul - 1) * .5)); }
  corpUnitKit(e, spec.corp, !!o.strong); if (o.elite) econMakeElite(e); if (o.alert) e.alerted = true; if (o.neutral) { e.neutral = true; e.alerted = false; }
  tacticUid(e); G.enemies.push(e); return e;
}
var CORP_UNIT = { dome: 'corp_dome_guard', kharon: 'corp_kharon_trooper', mobius: 'corp_mobius_subject' };
function corpPatrol(depth) {
  if (G.mode !== 'normal' || isBossFloor(depth) || (G.corpOp && G.corpOp.active) || Math.random() > .3) return;
  var corp = pick(Object.keys(CORPS));
  for (var i = 0; i < 1 + (depth > 6 ? 1 : 0); i++) { var t = randomFloorTile(8, false); if (t) corpSpawn(CORP_UNIT[corp], t.x, t.y, depth); }
  msg('雷达上出现了 ' + CORPS[corp].name + ' 的巡逻队', 'warn');
}
/* ---------- 委托类型 ---------- */
var CORP_JOBS = {
  sabotage: { name: '断电', goal: '摧毁 3 台{rival}主机', map: 'A' },
  heist: { name: '拷贝', goal: '入侵 2 个{rival}数据终端', map: 'B' },
  defend: { name: '钉子', goal: '架设干扰器并守住它', map: 'A' },
  assassin: { name: '退休', goal: '暗杀{rival}的目标人物', map: 'A' },
  desk: { name: '加班', goal: '从 3 个工位偷出机密', map: 'B' },
  cage: { name: '放生', goal: '打开 2 个实验笼', map: 'B' }
};
function corpJobText(job, rival, field) {
  var J = (CX.jobs || {})[job] || {}, R = J[rival] || {};
  if (field === 'goal') return R.goal || CORP_JOBS[job].goal.replace(/\{rival\}/g, CORPS[rival].name);
  return R.brief || CORP_JOBS[job].goal.replace(/\{rival\}/g, CORPS[rival].name);
}
SITE_DEFS.corp = { name: '公司联络人', char: '契', color: '#fcee0a', reuse: true, tip: '公司来人招揽：替他们干一票，下一层就是任务现场', line: '' };
SITE_DEFS.terminal = { name: '数据终端', char: '端', color: '#22e6ff', reuse: true, tip: '站上去入侵，每回合都会引来增援', line: '' };
SITE_DEFS.plant = { name: '架设点', char: '钉', color: '#57ffa8', reuse: true, tip: '在这里架设干扰器', line: '' };
SITE_DEFS.desk = { name: '工位', char: '桌', color: '#c99bff', reuse: true, tip: '在工位上翻机密，需要 2 回合', line: '' };
SITE_DEFS.cage = { name: '实验笼', char: '笼', color: '#ff2f6d', reuse: true, tip: '打开笼门。里面的东西见谁咬谁', line: '' };
SITE_DEFS.relay = { name: '信号中继', char: '中', color: '#9fe9ff', tip: '接通中继', line: '' };
function placeCorpSite(depth, sites) {
  if (G.mode !== 'normal' || isBossFloor(depth) || (depth - 1) % 5 > 2 || depth >= 16 || (G.corpOp && !G.corpOp.done)) return;
  var zone = stageOf(depth); G.corpZone = G.corpZone || {};
  if (G.corpZone[zone] || Math.random() > (G.forceCorp ? 1 : .45)) return;
  var t = null; for (var k = 0; k < 40; k++) { var c = randomFloorTile(5, false); if (c && !sites.some(function (s) { return Math.abs(s.x - c.x) + Math.abs(s.y - c.y) < 4; })) { t = c; break; } }
  if (!t) return;
  var ks = Object.keys(CORPS), corp = pick(ks), rival = pick(ks.filter(function (k) { return k !== corp; }));
  var jobs = ['sabotage', 'heist', 'defend', 'assassin'].concat(rival === 'dome' ? ['desk', 'desk'] : rival === 'mobius' ? ['cage', 'cage'] : []);
  G.corpZone[zone] = 1;
  sites.push({ type: 'corp', x: t.x, y: t.y, used: false, seed: Math.random() * TAU, data: { corp: corp, rival: rival, job: G.forceJob || pick(jobs) } });
}
function corpLine(corp, key) { var L = (CORPS[corp].lines || {})[key]; return L && L.length ? pick(L) : ''; }
function openCorp(s) {
  var d = s.data, C = CORPS[d.corp], R = CORPS[d.rival], J = CORP_JOBS[d.job], q = corpZoneQ();
  showModal('corp');
  var kit = corpModsOf(d.corp, q).map(function (id) { return MOD_BY[id]; });
  var rc = C.recruiter || {};
  var html = '<div class="card site corpcard" style="--site:' + C.color + '"><div class="kicker">' + C.en + ' // ' + econEsc((rc.name || '') + ' · ' + (rc.title || '招揽')) + '</div><h1 class="title small" style="color:' + C.color + '">' + C.name + '</h1>' +
    (rc.look ? '<div class="hint" style="text-align:left">' + econEsc(rc.look) + '</div>' : '') +
    '<div class="story-text npc-say">「' + econEsc(corpLine(d.corp, 'greet') || C.motto) + '」</div>' +
    '<div class="corp-job"><b>委托「' + J.name + '」 · 目标：' + R.name + '</b><p>' + econEsc(corpJobText(d.job, d.rival)) + '</p><small>' + econEsc(corpJobText(d.job, d.rival, 'goal')) + ' · 下一层是' + R.name + '的设施：敌人更强，目标完成前出口锁死</small></div>' +
    '<div class="loot-h">体验装 · ' + C.name + CORP_QNAME[q] + ' 6 件（接下即换上）</div><div class="eq-grid">' + kit.map(function (m) { return '<div class="eq-card" style="--it:' + m.color + '"><b>' + m.name + '</b><small>' + (SLOT_LABEL[m.slot] || '') + (m.active ? ' · 「' + m.active.name + '」' : '') + '</small><em>' + m.desc + '</em></div>'; }).join('') + '</div>' +
    '<div class="hint" style="text-align:left">体验装锁定在身上，拆不下也改不了；负载减半。你原来的义体先替你收着，任务结束原样归还。完成后可以留下其中一件连同芯片。</div>' +
    corpSetHTML(kit[0]) +
    (d.accepted ? '<div class="hint" style="color:#57ffa8">已接下。找到出口下潜。</div>' : '') +
    '<div class="dock">' + (d.accepted ? '<button class="cta" id="corpNo">离开</button>' : '<button class="ghost" id="corpNo">不接</button><button class="cta" id="corpYes">接下委托</button>') + '</div></div>';
  overlay.innerHTML = html;
  $('#corpNo').onclick = closeSite;
  var y = $('#corpYes'); if (y) y.onclick = function () {
    d.accepted = 1; s.used = true;
    G.corpOp = { corp: d.corp, rival: d.rival, job: d.job, depth: G.depth + 1, active: false, done: false, progress: 0, q: q, wave: 0 };
    trialBegin(d.corp, q);
    cum.corpTouch = cum.corpTouch || {}; cum.corpTouch[d.corp] = 1; cum.corpTouch[d.rival] = 1; saveJSON(STAT_KEY, cum);
    toast('接下 ' + C.name + ' 的委托 · 体验装已换上', 'good'); msg(C.name + '：「' + (corpLine(d.corp, 'accept') || '下一层见。') + '」', 'warn'); sfx.quest(); closeSite();
    queueScene('corp_first_accept');
  };
}
/* ---------- 体验装：锁定、替换并记录玩家义体 ---------- */
function isTrial(id) { return !!(G.trialKit && G.trialKit.ids.indexOf(id) >= 0); }
function trialBegin(corp, q) {
  if (G.trialKit) trialEnd(null);
  var map = { eye: 'eyeL', hand: 'handL', hand2: 'handR', body: 'body', spine: 'spine', leg: 'legL' };
  var saved = [], ids = [];
  CORP_MODS.filter(function (d) { return d.corp === corp && d.q === q; }).forEach(function (d) {
    var slot = map[d.slot]; if (!slot) return;
    if (G.cyber[slot]) { var old = G.cyber[slot]; saved.push({ slot: slot, id: old, chips: (G.cyberChips[slot] || []).slice() }); applyModStats(MOD_BY[old], -1); delete G.mods[old]; delete G.cyber[slot]; G.cyberChips[slot] = []; }
    if (G.modBag.indexOf(d.id) >= 0) return;
    G.modBag.push(d.id); G.inst = G.inst || {}; G.inst[d.id] = rollInst(MOD_BY[d.id], { origin: '体验装' }); G.inst[d.id].dur = G.inst[d.id].maxDur;
    G.cyber[slot] = d.id; G.mods[d.id] = 1; applyModStats(MOD_BY[d.id], 1); G.cyberChips[slot] = [makeCorpChip(corp, q)];
    if ((QUALITY[q] || {}).slots > 1) G.cyberChips[slot].push(makeChip(pick(CHIPS).id, Q_ORDER[Q_ORDER.indexOf(q) - 1]));
    ids.push(d.id);
  });
  G.trialKit = { corp: corp, q: q, ids: ids, saved: saved };
  recalc(); updateHUD();
}
function trialEnd(keepId) {
  var T = G.trialKit; if (!T) return;
  T.ids.forEach(function (id) {
    if (id === keepId) return;
    var sl = cyberInstalledSlot(id); if (sl) { applyModStats(MOD_BY[id], -1); delete G.mods[id]; delete G.cyber[sl]; G.cyberChips[sl] = []; }
    var i = G.modBag.indexOf(id); if (i >= 0) G.modBag.splice(i, 1);
    delete (G.inst || {})[id]; delete G.cyberCd[id]; delete G.cyberGrowth[id];
  });
  G.trialKit = null;
  T.saved.forEach(function (s) {
    if (G.modBag.indexOf(s.id) < 0) return;
    if (!G.cyber[s.slot] && !cyberInstalledSlot(s.id)) { G.cyber[s.slot] = s.id; G.mods[s.id] = 1; applyModStats(MOD_BY[s.id], 1); G.cyberChips[s.slot] = s.chips; }
    else s.chips.forEach(function (c) { G.chips.push(c); });
  });
  recalc(); if (typeof bagSettle === 'function') bagSettle(); updateHUD();
  msg('体验装已回收 · 你原来的义体装回去了', 'dim');
}
/* ---------- 固定地图 ---------- */
function corpCarve(x, y, w, h) { for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) if (yy > 0 && xx > 0 && yy < MAP_H - 1 && xx < MAP_W - 1) G.map[yy][xx] = FLOOR; }
var CORP_LAYOUTS = {
  A: { // 园区：左下大厅 → 两条主干道 → 三个机房 → 右下出口
    rooms: [[2, 21, 10, 7], [12, 23, 28, 2], [19, 4, 2, 21], [33, 4, 2, 21], [3, 3, 11, 7], [22, 3, 10, 7], [36, 3, 6, 9], [13, 13, 6, 6], [23, 13, 9, 7], [36, 19, 6, 9], [12, 5, 7, 2], [32, 6, 4, 2], [5, 10, 2, 11], [21, 15, 2, 2], [32, 15, 1, 2]],
    start: [5, 25], exit: [39, 25], objs: [[8, 6], [27, 6], [39, 7]], plant: [27, 16], vip: [39, 6],
    spawns: [[15, 15], [27, 16], [20, 10], [34, 10], [6, 15], [24, 23], [30, 24], [38, 21], [10, 7], [29, 4], [38, 22], [16, 24], [6, 12], [25, 6]],
    sites: [['fountain', 15, 18], ['vault', 28, 18]]
  },
  B: { // 数据库：中央开放办公区 + 左右两个机房，出口在上方
    rooms: [[17, 23, 10, 5], [21, 17, 2, 6], [8, 11, 28, 6], [3, 3, 9, 8], [32, 3, 9, 8], [6, 9, 2, 3], [36, 9, 2, 3], [18, 3, 8, 6], [21, 8, 2, 4], [12, 19, 5, 6], [27, 19, 5, 6], [16, 21, 2, 2], [26, 21, 2, 2]],
    start: [22, 25], exit: [22, 4], objs: [[7, 6], [36, 6]], desks: [[7, 6], [36, 6], [30, 13]],
    spawns: [[12, 13], [18, 14], [26, 14], [32, 13], [6, 5], [9, 8], [34, 5], [38, 8], [20, 5], [24, 6], [14, 21], [29, 21], [22, 12], [10, 15]],
    sites: [['fountain', 14, 22], ['doctor', 29, 23]]
  }
};
function corpOpSpawnUnit(depth, x, y, o) { var op = G.corpOp; return corpSpawn(CORP_UNIT[op.rival], x, y, depth + 1, Object.assign({ mul: 1.3, strong: depth >= 6 }, o || {})); }
function genCorpOp(depth) {
  var op = G.corpOp, L = CORP_LAYOUTS[CORP_JOBS[op.job].map], R = CORPS[op.rival];
  op.active = true; op.progress = 0; op.wave = 0; op.detected = false; op.alarmCd = 0;
  op.need = op.job === 'sabotage' ? 3 : op.job === 'heist' || op.job === 'cage' ? 2 : op.job === 'desk' ? 3 : 1;
  G.enemies = []; G.items = []; G.stairs = null; G.bossAlive = false; G.extract = false; G.anomaly = null; G.corpses = []; G.tacticFx = [];
  G.cams = []; G.cfence = []; G.cmines = []; G.corpStrikes = [];
  G.map = []; G.seen = []; G.vis = [];
  for (var y = 0; y < MAP_H; y++) { var row = [], s1 = [], v1 = []; for (var x = 0; x < MAP_W; x++) { row.push(WALL); s1.push(0); v1.push(0); } G.map.push(row); G.seen.push(s1); G.vis.push(v1); }
  L.rooms.forEach(function (r) { corpCarve(r[0], r[1], r[2], r[3]); });
  G.rooms = L.rooms.map(function (r) { return { x: r[0], y: r[1], w: r[2], h: r[3], cx: r[0] + (r[2] >> 1), cy: r[1] + (r[3] >> 1) }; });
  p.x = L.start[0]; p.y = L.start[1]; G.map[p.y][p.x] = FLOOR;
  G.stairs = { x: L.exit[0], y: L.exit[1] }; G.map[G.stairs.y][G.stairs.x] = FLOOR;
  G.sites = [];
  var d1 = depth + 1, zone = stageOf(depth);
  // 目标
  if (op.job === 'sabotage') L.objs.forEach(function (o) { corpStructure('gen', R.name + '主机', o[0], o[1], Math.round((40 + depth * 14) * 1.3), R.color); });
  else if (op.job === 'heist') L.objs.forEach(function (o) { G.sites.push({ type: 'terminal', x: o[0], y: o[1], used: false, seed: 0, data: { prog: 0 } }); });
  else if (op.job === 'desk') L.desks.forEach(function (o) { G.sites.push({ type: 'desk', x: o[0], y: o[1], used: false, seed: 0, data: { prog: 0 } }); });
  else if (op.job === 'cage') L.objs.forEach(function (o) { G.sites.push({ type: 'cage', x: o[0], y: o[1], used: false, seed: 0, data: {} }); });
  else if (op.job === 'defend') { G.sites.push({ type: 'plant', x: L.plant[0], y: L.plant[1], used: false, seed: 0, data: {} }); op.hold = 12 + zone * 3; }
  else if (op.job === 'assassin') spawnCorpVip(op.rival, L.vip[0], L.vip[1], depth, 5);
  L.sites.forEach(function (st) { G.sites.push({ type: st[0], x: st[1], y: st[2], used: false, seed: Math.random() * TAU, data: {} }); });
  // 守军
  L.spawns.forEach(function (sp, i) {
    if (op.job === 'desk' && i % 2 === 0) { corpSpawn('corp_dome_dog', sp[0], sp[1], d1, { neutral: true }); return; }
    if (i % 3 === 2) { var e2 = spawnEnemy(pickMonster(depth), sp[0], sp[1], d1); if (G.map[sp[1]][sp[0]] === FLOOR && !occupied(sp[0], sp[1])) { tacticUid(e2); G.enemies.push(e2); } return; }
    corpOpSpawnUnit(depth, sp[0], sp[1], { elite: i % 5 === 0 });
  });
  if (op.job === 'desk') for (var w = 0; w < 6; w++) { var wt = randomFloorTile(4, false); if (wt) corpSpawn('corp_dome_dog', wt.x, wt.y, d1, { neutral: true }); }
  corpFixtures(op.rival, L, depth);
  for (var it = 0; it < 3; it++) { var t2 = randomFloorTile(3, false); if (t2) G.items.push({ x: t2.x, y: t2.y, it: it ? pickItem(depth) : pickHealItem(), seed: 0 }); }
  G.opWall = R.color; G.bossName = '';
  return true;
}
function corpStructure(kind, name, x, y, hp, color, extra) {
  if (!G.map[y] || G.map[y][x] !== FLOOR || occupied(x, y)) return null;
  var e = Object.assign({ spec: { id: 'corp_' + kind, name: name, hp: [hp, hp], atk: [0, 0] }, id: 'corp_' + kind, name: name, ai: 'structure', structure: kind, corpObj: kind, glyph: 'hex', color: color, x: x, y: y, hp: hp, maxHp: hp, atk: 0, def: 1, xp: 6, range: 0, cd: 0, tick: 0, stun: 0, alerted: false, boss: false, buffs: [], burn: 0, brain: { step: 0, stage: 0, stance: '', angle: 0, plate: 100, repair: 0 } }, extra || {});
  G.enemies.push(e); return e;
}
function corpFixtures(rival, L, depth) {
  var far = function (t) { return Math.max(Math.abs(t.x - p.x), Math.abs(t.y - p.y)) >= 6; };
  if (rival === 'dome') {
    G.rooms.forEach(function (r, i) { if (r.w >= 5 && r.h >= 5 && i > 0) G.cams.push({ x: r.x, y: r.y, r: 3, phase: rnd(4), period: 4, on: 2 }); });
  } else if (rival === 'kharon') {
    G.rooms.forEach(function (r) { if (r.w <= 2 && r.h >= 5) { var fy = r.y + (r.h >> 1); for (var fx = r.x; fx < r.x + r.w; fx++) G.cfence.push({ x: fx, y: fy }); } else if (r.h <= 2 && r.w >= 8) { var fx2 = r.x + (r.w >> 1); for (var fy2 = r.y; fy2 < r.y + r.h; fy2++) G.cfence.push({ x: fx2, y: fy2 }); } });
    for (var m = 0; m < 6; m++) { var t = randomFloorTile(6, false); if (t && far(t)) G.cmines.push({ x: t.x, y: t.y }); }
    for (var b = 0; b < 4; b++) { var bt = randomFloorTile(5, false); if (bt) corpStructure('barrel', '油桶', bt.x, bt.y, 6, '#ff7a45'); }
    var mt = randomFloorTile(8, false); if (mt) corpSpawn('corp_kharon_mech', mt.x, mt.y, depth + 1, { strong: true });
  } else if (rival === 'mobius' && G.corpOp.job !== 'cage') {
    var ct = randomFloorTile(6, false); if (ct) corpStructure('cage', '实验笼', ct.x, ct.y, 30 + depth * 4, '#ff2f6d');
  }
}
function spawnCorpVip(rival, x, y, depth, guards) {
  var zone = stageOf(depth), tg = pick(((CX.targets || {})[rival]) || [{ name: '目标', title: '高管', line: '……' }]);
  var e = corpSpawn(CORP_UNIT[rival], x, y, depth + 1, { strong: true, alert: false }) || corpSpawn(CORP_UNIT[rival], freeAdjacent(x, y).x, freeAdjacent(x, y).y, depth + 1, { strong: true });
  if (!e) return null;
  var bhp = Math.round((40 + zone * 25) * (1 + (depth - 1) * .24) * 4.5 * .45);
  e.hp = e.maxHp = bhp; e.atk = Math.round(e.atk * 1.6) + 2; e.def += 2; e.vip = tg; e.elite = true; e.name = tg.name + ' · ' + tg.title; e.xp *= 4;
  for (var i = 0; i < guards; i++) { var g = freeAdjacent(e.x, e.y) || randomFloorTile(3, false); if (g) corpSpawn(CORP_UNIT[rival], g.x, g.y, depth + 1, { elite: i < 2, mul: 1.2 }); }
  G.codex.monsters = G.codex.monsters || {}; return e;
}
/* ---------- 进度 / 完成 / 失败 ---------- */
function corpObjDone() {
  var op = G.corpOp; if (!op || op.done) return;
  op.done = true; G.opWall = null;
  toast('目标完成 · 出口已开启', 'good'); msg(CORPS[op.corp].name + '：「' + (corpLine(op.corp, 'done') || '干得漂亮。') + '」', 'good');
  nvColumn(p.x, p.y, CORPS[op.corp].color, 6); sfx.level();
  cum.corpJobs = (cum.corpJobs || 0) + 1; cum.corpFor = cum.corpFor || {}; cum.corpFor[op.corp] = (cum.corpFor[op.corp] || 0) + 1;
  if (op.job === 'assassin') cum.corpAssassin = (cum.corpAssassin || 0) + 1;
  if (op.job === 'defend') cum.corpDefend = (cum.corpDefend || 0) + 1;
  if (op.job === 'cage') cum.corpCage = (cum.corpCage || 0) + 1;
  if (op.job === 'desk' && !op.detected) cum.corpGhostDesk = (cum.corpGhostDesk || 0) + 1;
  saveJSON(STAT_KEY, cum); storyCheck(); queueScene('corp_first_done');
  G.pendingCorpReward = op.corp;
}
function corpFail(reason) {
  var op = G.corpOp; if (!op || op.done) return;
  op.done = true; op.failed = true; G.opWall = null;
  toast('委托失败 · ' + reason, 'bad'); msg(CORPS[op.corp].name + '：「' + (corpLine(op.corp, 'fail') || '算了。') + '」 出口已开启。', 'bad');
  trialEnd(null);
}
function corpProgress() {
  var op = G.corpOp; if (!op || !op.active || op.done) return;
  op.progress++; toast(CORP_JOBS[op.job].name + ' · ' + op.progress + '/' + op.need, 'warn');
  if (op.job === 'sabotage') corpWave(2, '主机报警');
  if (op.progress >= op.need) corpObjDone();
}
function corpWave(n, why) {
  var op = G.corpOp; if (!op) return; op.wave = (op.wave || 0) + 1;
  var cnt = n || 1 + Math.floor(op.wave / 2), mul = 1 + op.wave * .15, made = 0;
  for (var i = 0; i < cnt; i++) {
    var t = null; for (var k = 0; k < 40 && !t; k++) { var c = randomFloorTile(5, false); if (c && !(G.vis[c.y] && G.vis[c.y][c.x])) t = c; }
    t = t || randomFloorTile(5, false); if (!t) continue;
    if (corpOpSpawnUnit(G.depth - 1, t.x, t.y, { mul: mul * 1.3, alert: true, elite: op.wave >= 4 && i === 0 })) made++;
  }
  if (made) msg((why || '警报') + ' · 第 ' + op.wave + ' 波增援 ×' + made, 'bad');
}
function corpDetect(why) {
  var op = G.corpOp; if (!op || !op.active || op.done) return;
  if ((op.alarmCd || 0) > 0) return;
  op.alarmCd = 8;
  if (!op.detected) { op.detected = true; queueScene('corp_desk_caught'); }
  G.enemies.forEach(function (e) { if (e.neutral) { e.neutral = false; e.alerted = true; if (Math.random() < .5) float(e.x, e.y, pick((CX.barks || {}).dome || ['有人闯进来了！']), '#c99bff'); } });
  NV.glitch = .8; G.flash = .4; sfx.hurt();
  toast('被发现了 · ' + (why || '摄像头'), 'bad');
  corpWave(2, '穹顶警报');
}
function openTerminal(s) {
  var op = G.corpOp; if (!op || !op.active) return;
  showModal('terminal');
  var R = CORPS[op.rival], pr = s.data.prog || 0, desk = s.type === 'desk', need = desk ? 2 : 3;
  overlay.innerHTML = '<div class="card site" style="--site:' + R.color + '"><div class="sign"><i>' + (desk ? '桌' : '端') + '</i></div><div class="kicker">' + R.en + ' // ' + (desk ? '工位' : '数据终端') + '</div><h1 class="title small">' + (s.used ? '已拿到' : (desk ? '翻找中 ' : '入侵中 ') + pr + '/' + need) + '</h1>' +
    '<div class="bag-bar">' + [0, 1, 2].slice(0, need).map(function (i) { return '<u class="' + (i < pr ? 'on' : '') + '"></u>'; }).join('') + '</div>' +
    '<div class="hint">' + (desk ? '翻工位不会报警，但摄像头扫到你就完了。' : '每入侵一回合都会引来一波增援，一波比一波狠。') + '</div><div class="dock"><button class="ghost" id="tmLeave">离开</button>' + (s.used ? '' : '<button class="cta" id="tmGo">继续（1 回合）</button>') + '</div></div>';
  $('#tmLeave').onclick = closeSite;
  var go = $('#tmGo'); if (go) go.onclick = function () {
    s.data.prog = (s.data.prog || 0) + 1; hideOverlay();
    if (!desk) corpWave(0, R.name + '入侵警报');
    if (s.data.prog >= need) { s.used = true; corpProgress(); }
    endTurn(); econResume();
  };
}
function openPlant(s) {
  var op = G.corpOp; if (!op || !op.active || s.used) return;
  showModal('plant');
  overlay.innerHTML = '<div class="card site" style="--site:#57ffa8"><div class="sign"><i>钉</i></div><div class="kicker">' + CORPS[op.corp].en + ' // 架设</div><h1 class="title small">架设干扰器</h1><div class="hint">架好以后要守住 ' + op.hold + ' 回合。敌人会一波波压过来，站在干扰器旁边的敌人会砸它。干扰器被砸烂，任务就黄了。</div><div class="dock"><button class="ghost" id="plNo">再等等</button><button class="cta" id="plGo">架设</button></div></div>';
  $('#plNo').onclick = closeSite;
  $('#plGo').onclick = function () { s.used = true; var hp = 60 + G.depth * 12; op.dev = { x: s.x, y: s.y, hp: hp, maxHp: hp, left: op.hold }; hideOverlay(); toast('干扰器上线 · 守住 ' + op.hold + ' 回合', 'warn'); corpWave(2, '信号异常'); endTurn(); econResume(); };
}
function openCage(s) {
  var op = G.corpOp; if (!op || !op.active || s.used) return;
  showModal('cage');
  var sub = pick(CX.subjects || [{ name: '实验体', code: 'MB-0000', line: '……', lore: '' }]);
  overlay.innerHTML = '<div class="card site" style="--site:#ff2f6d"><div class="sign"><i>笼</i></div><div class="kicker">MÖBIUS // ' + econEsc(sub.code) + '</div><h1 class="title small">' + econEsc(sub.name) + '</h1><div class="story-text">' + econEsc(sub.lore || '') + '</div><div class="hint">打开笼门，它会冲出来，见谁咬谁，包括你。</div><div class="dock"><button class="ghost" id="cgNo">先不开</button><button class="cta" id="cgGo">打开笼门</button></div></div>';
  $('#cgNo').onclick = closeSite;
  $('#cgGo').onclick = function () { s.used = true; hideOverlay(); releaseSubject(s.x, s.y, sub); corpProgress(); cum.corpCage = cum.corpCage || 0; queueScene('corp_cage_open'); endTurn(); econResume(); };
}
function releaseSubject(x, y, sub) {
  var t = freeAdjacent(x, y) || { x: x, y: y }, zone = stageOf(G.depth);
  var e = corpSpawn('corp_mobius_beast', t.x, t.y, G.depth, { strong: true, alert: true }); if (!e) return null;
  e.hp = e.maxHp = Math.round((40 + zone * 25) * (1 + (G.depth - 1) * .24) * 4.5 * .4); e.atk = Math.round(e.atk * 1.5); e.berserk = true; e.name = (sub && sub.name) || '实验体';
  float(e.x, e.y, (sub && sub.line) || '……', '#ff2f6d'); G.shake = 10; NV.glitch = .7;
  return e;
}
// 实验体：谁近咬谁
function berserkAct(e) {
  var others = G.enemies.filter(function (o) { return o !== e && o.hp > 0 && !o.structure; });
  var dp = Math.max(Math.abs(e.x - p.x), Math.abs(e.y - p.y)), best = null, bd = 99;
  others.forEach(function (o) { var d = Math.max(Math.abs(o.x - e.x), Math.abs(o.y - e.y)); if (d < bd) { bd = d; best = o; } });
  if (!best || bd >= dp || bd > 8) return false;
  if (bd <= 1) { var dm = damageEnemy(best, Math.round(e.atk * 2)); float(best.x, best.y, '撕咬 -' + dm, '#ff2f6d'); nvSpawn(best.x, best.y, '#ff2f6d', 8); if (best.hp <= 0) killEnemy(best, true); return true; }
  var sx2 = Math.sign(best.x - e.x), sy2 = Math.sign(best.y - e.y), opts = [[sx2, sy2], [sx2, 0], [0, sy2]];
  for (var i = 0; i < opts.length; i++) { var nx = e.x + opts[i][0], ny = e.y + opts[i][1]; if ((opts[i][0] || opts[i][1]) && G.map[ny] && G.map[ny][nx] === FLOOR && !occupied(nx, ny) && (nx !== p.x || ny !== p.y)) { e.x = nx; e.y = ny; return true; } }
  return false;
}
function corpWorkerIdle(e) { if (Math.random() < .04 && G.vis[e.y] && G.vis[e.y][e.x]) float(e.x, e.y, pick(CX.workers && CX.workers.length ? CX.workers : ['好想下班']), '#8a7aa8'); }
/* ---------- 每回合 ---------- */
function camOn(c) { return ((G.turn + c.phase) % c.period) < c.on; }
function corpTick() {
  if (G.mode !== 'normal' || !p) return;
  if (corpCount('mobius') >= 2 && p.hp < p.maxHp) healPlayer(Math.max(1, Math.round(p.maxHp * .02)), true);
  G.enemies.forEach(function (e) {
    if (e.vulnT > 0) e.vulnT--;
    if (e.parasite && e.hp > 0) { var pd = damageEnemy(e, e.parasite.dmg); healPlayer(pd, true); float(e.x, e.y, '寄生 -' + pd, '#ff4d5e'); if (--e.parasite.turns <= 0) e.parasite = null; if (e.hp <= 0) killEnemy(e); }
  });
  (G.corpStrikes || []).forEach(function (s) {
    if (--s.turns > 0) return;
    s.cells.forEach(function (c) { nvExplode(c.x, c.y, '#ffb347', .7); var en = enemyAt(c.x, c.y); if (en && en.hp > 0) { var h = playerHit(en, s.dmg, { source: 'airstrike' }); float(en.x, en.y, '-' + h.damage, '#ffb347', true); if (en.hp <= 0) killEnemy(en); } if (c.x === p.x && c.y === p.y) hurtPlayer(Math.round(s.dmg * .3), null); });
    G.shake = 10;
  });
  G.corpStrikes = (G.corpStrikes || []).filter(function (s) { return s.turns > 0; });
  G.hazards = (G.hazards || []).filter(function (h) { return !h.corpStrike || --h.life > 0; });
  var op = G.corpOp; if (!op || !op.active || op.done || G.depth !== op.depth) return;
  if (op.alarmCd > 0) op.alarmCd--;
  (G.cams || []).forEach(function (c) { if (camOn(c) && Math.max(Math.abs(p.x - c.x), Math.abs(p.y - c.y)) <= c.r && los(c.x, c.y, p.x, p.y) && !(G.stealth > 0)) corpDetect('摄像头'); });
  if ((G.cfence || []).some(function (f) { return f.x === p.x && f.y === p.y; })) { var fd = hurtPlayer(Math.round(p.maxHp * .08 + G.depth), null, { neural: true }); float(p.x, p.y, '电网 -' + fd, '#7fe9ff', true); nvSpawn(p.x, p.y, '#7fe9ff', 10, { kind: 'bit' }); }
  var mi = (G.cmines || []).findIndex(function (m) { return m.x === p.x && m.y === p.y; });
  if (mi >= 0) { var mn = G.cmines.splice(mi, 1)[0]; corpBoom(mn.x, mn.y, Math.round(p.maxHp * .16), '地雷'); }
  if (op.dev) {
    var dv = op.dev;
    G.enemies.forEach(function (e) { if (e.hp > 0 && !e.structure && !e.neutral && Math.max(Math.abs(e.x - dv.x), Math.abs(e.y - dv.y)) <= 1) { dv.hp -= e.atk; float(dv.x, dv.y, '-' + e.atk, '#ff4d5e'); } });
    if (dv.hp <= 0) { corpFail('干扰器被砸烂了'); op.dev = null; return; }
    dv.left--; if (dv.left > 0 && dv.left % 2 === 0) corpWave(0, '干扰源定位');
    if (dv.left <= 0) { op.dev = null; corpProgress(); }
  }
}
function corpBoom(x, y, dmg, label) {
  nvExplode(x, y, '#ff7a45', 1.3); G.shake = 12; sfx.hit();
  if (Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) <= 1) { var d = hurtPlayer(dmg, null, { neural: true }); float(p.x, p.y, label + ' -' + d, '#ff7a45', true); }
  G.enemies.forEach(function (e) { if (e.hp > 0 && Math.max(Math.abs(e.x - x), Math.abs(e.y - y)) <= 1 && !(e.x === x && e.y === y && e.corpObj === 'barrel')) { var dm = damageEnemy(e, Math.max(dmg, Math.round(effAtk() * 3))); float(e.x, e.y, '-' + dm, '#ff7a45'); if (e.hp <= 0) setTimeout(function () { if (e.hp <= 0 && G.enemies.indexOf(e) >= 0) killEnemy(e); }, 0); } });
}
function corpKilled(e) {
  if (e.corpObj === 'gen') corpProgress();
  if (e.corpObj === 'barrel') corpBoom(e.x, e.y, Math.round(p.maxHp * .1), '爆炸');
  if (e.corpObj === 'cage') releaseSubject(e.x, e.y, pick(CX.subjects || [null]));
  if (e.neutral) corpDetect('有人看见你动手');
  if (e.vip) {
    float(e.x, e.y, e.vip.death || '……', '#fcee0a');
    G.codex.vips = G.codex.vips || {}; if (!G.codex.vips[e.vip.name]) { G.codex.vips[e.vip.name] = 1; saveJSON(CODEX_KEY, G.codex); }
    queueScene('corp_vip_kill');
    if (G.corpOp && G.corpOp.active && G.corpOp.job === 'assassin') corpProgress();
    contractEvent('vip', e);
  }
  if (e.corpKit) corpUnitDrop(e);
  if (e.corpKit && !e.neutral) contractEvent('corpKill', e);
}
/* ---------- 机关绘制 ---------- */
function drawCorpFx(view, now) {
  var t = view.tile;
  (G.cams || []).forEach(function (c) {
    if (!view.on(c.x, c.y) || !G.seen[c.y] || !G.seen[c.y][c.x]) return;
    var x = view.sx(c.x), y = view.sy(c.y), on = camOn(c), warn = !on && ((G.turn + 1 + c.phase) % c.period) < c.on;
    ctx.save();
    if (on) { var g = ctx.createRadialGradient(x, y, 2, x, y, t * (c.r + .5)); g.addColorStop(0, 'rgba(255,40,60,.32)'); g.addColorStop(1, 'rgba(255,40,60,0)'); ctx.fillStyle = g; ctx.fillRect(x - t * (c.r + .5), y - t * (c.r + .5), t * (c.r * 2 + 1), t * (c.r * 2 + 1)); ctx.strokeStyle = 'rgba(255,54,92,.55)'; ctx.setLineDash([4, 4]); ctx.strokeRect(x - t * (c.r + .5), y - t * (c.r + .5), t * (c.r * 2 + 1), t * (c.r * 2 + 1)); ctx.setLineDash([]); }
    ctx.fillStyle = '#1a1424'; ctx.strokeStyle = on ? '#ff365c' : warn ? '#ffd166' : '#6b5a80'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, t * .22, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = on ? '#ff365c' : warn ? '#ffd166' : '#3a3050'; ctx.beginPath(); ctx.arc(x, y, t * .09, 0, TAU); ctx.fill();
    ctx.restore();
  });
  (G.cfence || []).forEach(function (f) {
    if (!view.on(f.x, f.y) || !G.seen[f.y] || !G.seen[f.y][f.x]) return;
    var x = view.sx(f.x), y = view.sy(f.y), ph = VFX.reduced ? 0 : now / 80;
    ctx.save(); ctx.strokeStyle = 'rgba(127,233,255,' + (.5 + .3 * Math.sin(ph)) + ')'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (var i = 0; i <= 6; i++) { var xx = x - t * .45 + i * t * .15, yy = y + (i % 2 ? -1 : 1) * t * .18 * (VFX.reduced ? 1 : Math.sin(ph + i)); if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
    ctx.stroke(); ctx.restore();
  });
  (G.cmines || []).forEach(function (m) {
    if (!view.on(m.x, m.y) || !G.vis[m.y] || !G.vis[m.y][m.x]) return;
    var x = view.sx(m.x), y = view.sy(m.y), bl = VFX.reduced ? 1 : (Math.sin(now / 200) > 0 ? 1 : .3);
    ctx.save(); ctx.fillStyle = '#2a1a10'; ctx.strokeStyle = '#ff7a45'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, t * .17, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,54,92,' + bl + ')'; ctx.beginPath(); ctx.arc(x, y, t * .06, 0, TAU); ctx.fill(); ctx.restore();
  });
  var op = G.corpOp;
  if (op && op.dev && view.on(op.dev.x, op.dev.y)) {
    var dv = op.dev, x2 = view.sx(dv.x), y2 = view.sy(dv.y), pu = VFX.reduced ? 1 : .7 + .3 * Math.sin(now / 150);
    ctx.save(); ctx.strokeStyle = 'rgba(87,255,168,' + pu + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x2, y2, t * (.9 + .2 * pu), 0, TAU); ctx.stroke();
    ctx.fillStyle = '#0d2018'; ctx.fillRect(x2 - t * .3, y2 - t * .3, t * .6, t * .6); ctx.strokeRect(x2 - t * .3, y2 - t * .3, t * .6, t * .6);
    ctx.fillStyle = '#03070c'; ctx.fillRect(x2 - t * .5, y2 - t * .62, t, 4); ctx.fillStyle = '#57ffa8'; ctx.fillRect(x2 - t * .5, y2 - t * .62, t * Math.max(0, dv.hp / dv.maxHp), 3);
    ctx.font = '700 ' + Math.max(8, t * .28) + 'px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#57ffa8'; ctx.fillText(dv.left + '', x2, y2 + t * .75); ctx.restore();
  }
}
/* ---------- 报酬：留下体验装中的一件 ---------- */
function corpRewardScreen(corp) {
  showModal('corpreward');
  var C = CORPS[corp], ids = (G.trialKit && G.trialKit.ids.slice()) || corpModsOf(corp, corpZoneQ()).slice(0, 3);
  overlay.innerHTML = '<div class="card corpcard" style="--site:' + C.color + '"><div class="kicker">' + C.en + ' // 报酬</div><h1 class="title small" style="color:' + C.color + '">留下一件</h1><div class="hint">体验装要还回去。挑一件留下，上面的芯片一起归你。</div>' +
    '<div class="eq-grid">' + ids.map(function (id) { var m = MOD_BY[id], sl = cyberInstalledSlot(id), chips = sl ? (G.cyberChips[sl] || []) : []; return '<button class="eq-card" data-crw="' + id + '" style="--it:' + m.color + '"><b>' + m.name + '</b><small>' + (SLOT_LABEL[m.slot] || '') + (m.active ? ' · 「' + m.active.name + '」' : '') + ' · 芯片 ' + chips.length + '</small><em>' + m.desc + '</em></button>'; }).join('') + '</div>' +
    corpSetHTML(MOD_BY[ids[0]]) + '</div>';
  $$('[data-crw]').forEach(function (b) { b.onclick = function () {
    var id = b.getAttribute('data-crw'), m = MOD_BY[id], sl = cyberInstalledSlot(id), chips = sl ? (G.cyberChips[sl] || []).slice() : [];
    hideOverlay();
    if (G.trialKit) { trialEnd(id); var nsl = cyberInstalledSlot(id); if (!nsl) { if (sl && !G.cyber[sl]) { installCyber(id, sl); hideOverlay(); G.cyberChips[sl] = chips; } else chips.forEach(function (c) { addChipObject(c); }); } if (G.inst && G.inst[id]) G.inst[id].origin = C.name + '报酬'; }
    else if (applyMod(m) === false) { var sp = freeDropSpots(p.x, p.y, 1)[0]; G.items.push({ x: sp.x, y: sp.y, mod: m, seed: 0 }); }
    gainCredits(30 + G.depth * 4, p.x, p.y); toast('报酬到账 · ' + m.name, 'good'); recalc(); updateHUD(); econResume();
  }; });
}
function maybeShowCorpReward() {
  if (!G.pendingCorpReward || G.state !== 'play' || G.modal || G.paused || G.busy) return false;
  var c = G.pendingCorpReward; G.pendingCorpReward = null; corpRewardScreen(c); return true;
}
/* ---------- 剧情 / 档案 / 成就 / 超梦 ---------- */
(function () {
  (CX.chapters || []).forEach(function (c) { if (!STORY.chapters.some(function (x) { return x.id === c.id; })) STORY.chapters.push(c); });
  STORY.scenes = STORY.scenes || {};
  Object.keys(CX.scenes || {}).forEach(function (k) { STORY.scenes[k] = CX.scenes[k].map(function (t) { return typeof t === 'string' ? { who: '', text: t, fx: 'none' } : t; }); });
  (CX.achievements || []).forEach(function (a) { if (!ACHIEVEMENTS.some(function (x) { return x.id === a.id; })) { a.cat = 'corp'; ACHIEVEMENTS.push(a); ACH[a.id] = a; } });
  if (STORY.bar && STORY.bar.bartender) (CX.bar || []).forEach(function (l) { STORY.bar.bartender.lines.push(l); });
  (CX.dreams || []).forEach(function (d) {
    if (DREAMS.some(function (x) { return x.id === d.id; })) return; DREAMS.push(d);
    var r = d.reward; if (!r || MOD_BY[r.id]) return;
    var L = { atk: '攻击', maxHp: '生命', def: '防御', crit: '暴击', dodge: '闪避', lifesteal: '吸血' };
    var m = { id: r.id, slot: r.slot, quality: r.quality || 'red', name: r.name, color: '#c08bff', stats: r.stats || {}, dropOnly: true, relic: true, dream: d.id, lore: r.lore,
      desc: Object.keys(r.stats || {}).map(function (k) { var v = r.stats[k]; return (L[k] || k) + ' +' + (v < 1 ? Math.round(v * 100) + '%' : v); }).join('，') + '；一次性：' + r.onceName, active: { name: r.onceName, type: 'relic_' + r.once, cd: 1 } };
    MODS.push(m); MOD_BY[m.id] = m;
  });
})();
function corpChapterMet(k) {
  var T = cum.corpTouch || {}, n = cum.corpJobs || 0;
  if (/^\d+$/.test(k)) return n >= +k;
  if (k === 'all') return ['dome', 'kharon', 'mobius'].every(function (c) { return T[c]; });
  return !!T[k];
}
