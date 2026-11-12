p='game.js';s=open(p,encoding='utf8').read()
if 'B16_V1 ·' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
anchor="/* =========================================================\n   启动"
rep(anchor,open('tools/b16-module.js',encoding='utf8').read()+"\n\n"+anchor)
rep("function isBossFloor(d) { return d % 5 === 0 || d === 16; }","function isBossFloor(d) { return d % 5 === 0 && d <= 15; }")
rep("MAX_DEPTH = G.mode === 'normal' && META.b16 ? 16 : BASE_MAX_DEPTH;","MAX_DEPTH = BASE_MAX_DEPTH; G._hanAsked = false;")
rep("function genMap(depth) {\n  G.corpses = []; G.tacticFx = [];\n","function genMap(depth) {\n  G.corpses = []; G.tacticFx = [];\n  if (G.b16 && depth === 16) { if (G.b16.phase === 'lines' || G.b16.phase === 'meet') genB16Lines(); else genB16Base(B16_ORDER[G.b16.camp]); return; }\n")
rep("""    G.bossAlive = false;
    dropChest(e.x, e.y, 'boss',""","""    if (e.b16Boss) { G.bossAlive = false; b16BossDown(e); return; }
    G.bossAlive = false;
    dropChest(e.x, e.y, 'boss',""")
rep("""    if (G.depth >= MAX_DEPTH) {
      G.extract = true;
      msg('撤离信标已开启 · 拾取核心箱后踏上出口', 'good');
      toast('撤离信标开启', 'good');""","""    if (G.depth >= MAX_DEPTH) {
      G.extract = true;
      msg('撤离信标已开启 · 拾取核心箱后踏上出口', 'good');
      toast('撤离信标开启', 'good');
      if (G.mode === 'normal' && G.depth === 15 && b16Open() && !G.b16) { G.pendingPassage = true; msg('守卫倒下的地方，地板下面有风。', 'warn'); }""")
rep("function maybeShowCorpReward() {\n","function maybeShowCorpReward() {\n  if (maybeShowPassage()) return true;\n")
rep("  spawnPsychoEnemy(G.depth);\n  corpPatrol(G.depth);","  if (!G.b16) { spawnPsychoEnemy(G.depth); corpPatrol(G.depth); }")
rep("  corpTick();\n  relicTick();\n","  corpTick();\n  relicTick();\n  b16Tick();\n")
rep("  if (e.corpObj === 'gen') corpProgress();\n  if (e.corpObj === 'barrel')","  if (e.corpObj === 'gen') corpProgress();\n  if (e.corpObj === 'line') b16LineDown(e);\n  if (e.corpObj === 'barrel')")
rep("  if (e.vulnT > 0) raw *= 1.25;","  if (e.vulnT > 0) raw *= 1.25;\n  if (e.b16Boss === 'dome' && G.enemies.some(function (o) { return o.corpObj === 'seat' && o.hp > 0; })) { raw *= .4; if (Math.random() < .3) float(e.x, e.y, '董事会护盾', '#b06bff'); }")
rep("ctx.fillText(e.structure==='barrel'?'桶'","ctx.fillText(e.structure==='line'?'总闸':e.structure==='seat'?'席':e.structure==='barrel'?'桶'")
# dream mine
rep("function dreamBegin(d) {\n  var k = DREAM_KITS[d.kit]; if (!k) return;","function dreamBegin(d) {\n  if (d.kit === 'mine') buildMineKit();\n  var k = DREAM_KITS[d.kit]; if (!k) return;")
rep("  G.depth = k.from; startFloor(); hideOverlay(); G.pendingBoard = null; G.storyQueue = [];","  if (k.mine) { G.b16 = { phase: 'lines', down: {}, camp: 0, origCls: k.cls, t: 0 }; var DM = META.myDream || {}; Object.keys(DM.cyber || {}).forEach(function (sl) { var id = DM.cyber[sl], s2 = cyberInstalledSlot(id); if (s2) G.cyberChips[s2] = JSON.parse(JSON.stringify((DM.chips || {})[sl] || [])); if (DM.inst && DM.inst[id]) G.inst[id] = JSON.parse(JSON.stringify(DM.inst[id])); }); recalc(); p.hp = p.maxHp; }\n  G.depth = k.from; startFloor(); hideOverlay(); G.pendingBoard = null; G.storyQueue = [];")
rep("  var inDream = G.mode === 'dream' && G.dream;","  var inDream = G.mode === 'dream' && G.dream && G.dream.kit !== 'mine';")
rep("  if (m[0] === 'corp') return corpChapterMet(m[1]);","  if (m[0] === 'corp') return corpChapterMet(m[1]);\n  if (m[0] === 'mine') return !!META.myDream;")
rep("  if (m[0] === 'corp') return /^","  if (m[0] === 'mine') return '通关后在余烬答应老韩';\n  if (m[0] === 'corp') return /^")
rep("function dreamShelf() {","function dreamShelf() {\n  buildMineKit();")
# ach metrics
rep("  if (type === 'corpJobs') return cum.corpJobs || 0;","  if (type === 'corpJobs') return cum.corpJobs || 0;\n  if (type === 'finClear') return cum.finClear || 0;\n  if (type === 'finDream') return cum.finDream || 0;\n  if (type === 'finLines') return cum.finLines || 0;\n  if (type === 'finBoss') return (cum.finBoss || {})[a.cond.target] ? 1 : 0;")
# menu han
rep("  if (shieldOrb) shieldOrb.onclick = showShieldInfo;\n}\nfunction startFlow(step) {","  if (shieldOrb) shieldOrb.onclick = showShieldInfo;\n  if (G.navTab === 'depart') setTimeout(maybeHanDream, 250);\n}\nfunction startFlow(step) {")
# achHTML with categories
i=s.index("function achHTML() {"); j=s.index("function codexHTML() {",i)
s=s[:i]+"""function achHTML() {
  var cats = (FIN.achCats) || {}, cur = G.achCat || 'all', got = 0, html = '';
  var list = ACHIEVEMENTS.filter(function (a) { return cur === 'all' || achCatOf(a) === cur; });
  ACHIEVEMENTS.forEach(function (a) { if (unlocked[a.id]) got++; });
  html += '<div class="achtabs">' + [['all', '全部']].concat(ACH_CATS.map(function (k) { return [k, cats[k] || k]; })).map(function (c) {
    var n = ACHIEVEMENTS.filter(function (a) { return c[0] === 'all' || achCatOf(a) === c[0]; }), g = n.filter(function (a) { return unlocked[a.id]; }).length;
    return '<button class="fpill' + (cur === c[0] ? ' on' : '') + '" data-achcat="' + c[0] + '">' + c[1] + ' ' + g + '/' + n.length + '</button>'; }).join('') + '</div>';
  list.forEach(function (a) {
    var on = !!unlocked[a.id];
    var rw = [];
    if (a.reward) { if (a.reward.cores) rw.push('+' + a.reward.cores + ' 核心'); if (a.reward.cyber && MOD_BY[a.reward.cyber]) rw.push('义体「' + MOD_BY[a.reward.cyber].name + '」'); }
    if (a.hidden && !on) { html += '<div class="ach off hid"><span class="mk">?</span><div><b>？？？ · 隐藏成就</b><em style="display:block;font-style:normal;color:#4f6370;font-size:10px">达成条件不明 · 去余烬问问老韩</em></div></div>'; return; }
    html += '<div class="ach ' + (on ? '' : 'off') + (a.hidden ? ' hidon' : '') + '"><span class="mk">' + (on ? '✓' : '·') + '</span>' +
      '<div><b>' + a.name + '</b><em style="display:block;font-style:normal;color:#6f9bb0;font-size:10px">' + a.desc + '</em>' +
      (rw.length ? '<em style="display:block;font-style:normal;color:#fcee0a;font-size:9px">奖励：' + rw.join(' · ') + '</em>' : '') + '</div></div>';
  });
  setTimeout(function () { $$('[data-achcat]').forEach(function (b) { b.onclick = function () { G.achCat = b.getAttribute('data-achcat'); var pl = b.closest('.plist'); if (pl) pl.innerHTML = achHTML(); }; }); }, 0);
  return '<div class="pitem" style="border-top:0"><b>已解锁 ' + got + '/' + ACHIEVEMENTS.length + '</b><span>累计</span></div>' + html;
}
"""+s[j:]
# codex: vips & b16
rep("  html += det('守卫图鉴', blist.length, bossBody);","""  html += det('守卫图鉴', blist.length, bossBody);
  var vipRows = '', vipN = 0, vipT = 0, VS = G.codex.vips || {};
  Object.keys(CX.targets || {}).forEach(function (k) { (CX.targets[k] || []).forEach(function (t) { vipT++; var seen = !!VS[t.name]; if (seen) vipN++; vipRows += cxLine(seen ? t.name + ' · ' + t.title : '？？？', CORPS[k].name, [seen ? t.lore : '还没接触过这个人'], seen ? CORPS[k].color : '#56606a'); }); });
  html += det('公司要员', vipN + '/' + vipT, vipRows);
  if (b16Open() || (G.codex.b16 && Object.keys(G.codex.b16).length)) { var bb = G.codex.b16 || {}, b16Rows = B16_ORDER.map(function (k) { var C = FIN.campaigns[k], seen = !!bb[k]; return cxLine(seen ? C.boss.name + ' · ' + C.boss.title : '？？？', 'B16 · ' + CORPS[k].name + ' · ' + C.base, [seen ? '「' + C.boss.intro + '」' : '在 B16 等着', seen ? C.boss.lore : ''], seen ? CORPS[k].color : '#56606a'); }).join('');
    html += det('B16 守卫', Object.keys(bb).length + '/3', b16Rows); }""")
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
s=s.replace('</style>\n</head>','.achtabs{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0 8px}\n</style>\n</head>')
open(p,'w',encoding='utf8').write(s)
print('b16 applied')
