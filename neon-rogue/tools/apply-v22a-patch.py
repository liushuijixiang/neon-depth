p='game.js';s=open(p,encoding='utf8').read()
if 'V22A ·' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
mod=open('tools/v22a-module.js',encoding='utf8').read()
anchor="/* =========================================================\n   启动"
rep(anchor,mod+"\n\n"+anchor)
# ---- confirms ----
rep("  $('#tBuy').onclick = function () {","  $('#tBuy').onclick = function () {\n    if (!confirm2($('#tBuy'), t.price + ' 核心')) return;")
rep("""    if (b) b.onclick = function () {
      var m = MOD_BY[b.getAttribute('data-buy')];""","""    if (b) b.onclick = function () {
      if (!confirm2(b)) return;
      var m = MOD_BY[b.getAttribute('data-buy')];""")
rep("""  $$('[data-mchip]').forEach(function (b) { b.onclick = function () {
    var q = b.getAttribute('data-mchip'), p2 = chipPrice(q);""","""  $$('[data-mchip]').forEach(function (b) { b.onclick = function () {
    var q = b.getAttribute('data-mchip'), p2 = chipPrice(q);
    if (META.cores >= p2 && !confirm2(b, p2 + ' 核心')) return;""")
rep("      if (META.cores < RUSH_FEE) { toast('核心不足，入场费 ' + RUSH_FEE, 'bad'); return; }","      if (META.cores < RUSH_FEE) { toast('核心不足，入场费 ' + RUSH_FEE, 'bad'); return; }\n      if (!confirm2($('#rushGo'), '入场费 ' + RUSH_FEE + ' 核心')) return;")
rep("  $$('[data-drink]').forEach(function (b) { b.onclick = function () { var d = B.drinks[+b.getAttribute('data-drink')]; if (META.cores < d.cost || ST.pendingDrink) return;","  $$('[data-drink]').forEach(function (b) { b.onclick = function () { var d = B.drinks[+b.getAttribute('data-drink')]; if (META.cores < d.cost || ST.pendingDrink) return; if (!confirm2(b, d.cost + ' 核心')) return;")
rep("  $$('[data-ldrink]').forEach(function (b) { b.onclick = function () { var L = ST.legends[+b.getAttribute('data-ldrink')]; if (META.cores < 40 || ST.pendingDrink) return;","  $$('[data-ldrink]').forEach(function (b) { b.onclick = function () { var L = ST.legends[+b.getAttribute('data-ldrink')]; if (META.cores < 40 || ST.pendingDrink) return; if (!confirm2(b, '40 核心')) return;")
rep("    if (rp && sit && sit.inst) rp.onclick = function () {","    if (rp && sit && sit.inst) rp.onclick = function () { if (!confirm2(rp)) return;")
rep("""  $('#enGo').onclick = function () {
    if (!o.can(it) || it.plus >= 5 || it.dur <= 0) return; o.pay(it);""","""  $('#enGo').onclick = function () {
    if (!o.can(it) || it.plus >= 5 || it.dur <= 0) return;
    if (o.unit === '核心' && !confirm2($('#enGo'), cost + ' 核心')) return;
    o.pay(it);""")
rep("""  $('#cfGo').onclick = function () {
    if (!o.can()) return; o.pay();""","""  $('#cfGo').onclick = function () {
    if (!o.can()) return;
    if (/核心/.test(o.cost) && !confirm2($('#cfGo'), o.cost)) return;
    o.pay();""")
# meta keep scroll (stale value fix)
rep("  var keep = (G._metaScroll != null ? G._metaScroll : (oldCard ? oldCard.scrollTop : 0));","  var keep = oldCard ? oldCard.scrollTop : (G._metaScroll || 0);")
# ---- remove gun ups overheat/overclock ----
rep("  { id: 'overheat', name: '散热模组', max: 1, cost: 6, desc: '解锁【过热】' },\n","")
rep(",\n  { id: 'overclock', name: '超频电容', max: 1, cost: 7, desc: '解锁【超频】' }","")
# ---- ability bar restructure ----
rep("""  var isAss = clsId === 'assault' && !(G.mode === 'dream' && G.dream && DREAM_KITS[G.dream.kit].noClassBar);
  var isGho = clsId === 'ghost';""","""  var inDream = G.mode === 'dream' && G.dream;
  var isAss = clsId === 'assault' && !inDream;
  var isGho = clsId === 'ghost' && !inDream;
  if (inDream) isEng = false;""")
rep("""  var html = '';
  if (G.mode === 'dream' && G.dream) {""","""  var html = '<div class="clsrow2">';
  if (G.mode === 'dream' && G.dream) {""")
rep("""    html += '<div class="ghrow">';
    GHOST_ACTS[useBand].forEach(function (a) {""","""    if (G.burnout) BURN_ACTS.forEach(function (a) { html += kbtn('', a.n, a.d, '#ff365c', false, '', 'burn').replace('data-act=""', 'data-gburn="' + a.k + '"'); });
    else GHOST_ACTS[useBand].forEach(function (a) {""")
rep("""      html += kbtn('', a.n, gsub, gcol, gdis, '', killMark ? 'busy' : '').replace('data-act=""', 'data-ghost="' + a.k + '"');
    });
    html += '</div>';
  }""","""      html += kbtn('', a.n, gsub, gcol, gdis, '', killMark ? 'busy' : '').replace('data-act=""', 'data-ghost="' + a.k + '"');
    });
  }""")
i=s.index("    var pips = ''; for (var ai = 0; ai < G.ammoMax; ai++)")
j=s.index("  if (isEng) html += '<button class=\"kbtn\" data-build=\"1\"",i)
s=s[:i]+"""    var pips = ''; for (var ai = 0; ai < G.ammoMax; ai++) pips += '<i class="' + (ai < G.ammo ? 'on' : '') + '"></i>';
    var rl = G.reload;
    if (rl) html += kbtn('reload', '换弹 ' + (rl.max - rl.turns) + '/' + rl.max, '装填中…', '#9fe9ff', false, '<span class="prog"><i style="width:' + Math.round((rl.max - rl.turns) / rl.max * 100) + '%"></i></span>', 'busy');
    else if (!G.ammo) html += kbtn('reload', '换弹', gunReloadCost() + ' 能 · 1 消耗品 · ' + reloadTurns() + ' 回合', '#9fe9ff', !G.inv.length || G.energy < gunReloadCost(), '<span class="pips">' + pips + '</span>');
    else html += '<div class="kwrap">' + kbtn('fire', '开火', G.magSpecial ? SPECIALS[G.magSpecial].name : '普通弹 ' + G.ammo + '/' + G.ammoMax, '#ff5c7a', false, '<span class="pips">' + pips + '</span>') + (G.ammo < G.ammoMax ? '<button class="kmini" data-act="reload"' + (!G.inv.length || G.energy < gunReloadCost() ? ' disabled' : '') + ' title="换弹">换</button>' : '') + '</div>';
    html += kbtn('dash', '冲刺', '2 能量', '#b690ff', G.energy < 2);
    html += kbtn('gun', '军械库', '能量 ' + G.energy + '/' + G.energyMax, '#fcee0a', false, '<span class="prog"><i style="width:' + Math.round(G.energy / G.energyMax * 100) + '%"></i></span>');
  }
"""+s[j:]
rep("""  if (laserActive()) html += '<button class="abtn" data-laser="1\"""","""  var SKILL_COL = { act_nova: '#ff9f43', act_wall: '#b06bff', act_drone: '#57ffa8', act_shot: '#ff5c7a', act_blink: '#22e6ff' };
  if (!inDream) list.forEach(function (s) { var cd = G.cd[s.id] || 0; html += kbtn('', s.name, cd ? '冷却 ' + cd : '就绪', SKILL_COL[s.id] || '#9fe9ff', cd > 0).replace('data-act=""', 'data-ab="' + s.id + '"'); });
  html += '</div><div class="gearrow">';
  if (laserActive()) html += '<button class="abtn" data-laser="1\"""")
rep("""  list.forEach(function (s) {
    var cd = G.cd[s.id] || 0;
    html += '<button class="abtn" data-ab="' + s.id + '"' + (cd > 0 ? ' disabled' : '') + '>' +
      '<span class="nm">' + s.name + '</span>' + (cd > 0 ? '<span class="cd">' + cd + '</span>' : '') + '</button>';
  });
""","")
rep("""  abilitybar.innerHTML = html;
  $$('[data-ab]').forEach(function (btn) {""","""  html += '</div>';
  abilitybar.innerHTML = html.replace('<div class="clsrow2"></div>', '').replace('<div class="gearrow"></div>', '');
  $$('[data-gburn]').forEach(function (btn) { btn.addEventListener('click', function (ev) { ev.preventDefault(); ghostBurnAct(btn.getAttribute('data-gburn')); }); });
  $$('[data-ab]').forEach(function (btn) {""")
# burnout passive lifesteal
rep("  if (G.psycho > 0 && typeof frenzyBonus === 'function') {","  if (G.burnout && classDef().id === 'ghost') m.lifesteal = (m.lifesteal || 0) + .25;\n  if (G.psycho > 0 && typeof frenzyBonus === 'function') {")
rep("""  G.burnout = true;
  toast('时停结束 · 临界反噬', 'bad');
  msg('开始持续流失生命与临界，直到归零', 'warn');""","""  G.burnout = true;
  toast('时停结束 · 烧毁 · 近战吸血', 'bad');
  msg('烧毁：持续流失生命与临界，但近战技能组解锁、吸血 +25%', 'warn');
  recalc(); renderAbilities();""")
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
css='''
/* V22A · HUD 压缩 / 技能排 */
#atk,#gun,#scrap{display:none!important}
.hud .meta{flex-wrap:nowrap!important;overflow-x:auto;scrollbar-width:none;gap:4px!important}
.hud .meta::-webkit-scrollbar{display:none}
.hud .meta .chip{flex:0 0 auto;font-size:9px!important;padding:2px 6px!important;white-space:nowrap}
.hud .meta #menuBtn{margin-left:auto}
.hud .meta .icon{flex:0 0 auto;width:28px!important;height:24px!important;min-width:0!important;padding:0!important;font-size:12px}
.chip.chromeload{min-width:0!important}
.buffrow{flex-wrap:nowrap!important;overflow-x:auto;scrollbar-width:none;max-height:22px}
.abbar{flex-direction:column;flex-wrap:nowrap!important;gap:4px!important}
.clsrow2{display:flex;gap:4px;width:100%}
.clsrow2>.kbtn,.clsrow2>.kwrap{flex:1 1 0;min-width:0}
.clsrow2 .kbtn{min-height:42px;padding:5px 6px 6px}
.clsrow2 .kbtn b{font-size:11px}.clsrow2 .kbtn small{font-size:8px}
.kwrap{position:relative;display:flex}.kwrap>.kbtn{flex:1;min-width:0}
.kmini{position:absolute;right:3px;top:3px;width:22px;height:22px;padding:0;font-family:inherit;font-size:10px;font-weight:700;color:#05070d;background:#9fe9ff;border:0;border-radius:3px;box-shadow:0 0 6px #9fe9ff;z-index:2}
.kmini:disabled{background:#3a4a55;color:#8aa;box-shadow:none}.kmini:active:not(:disabled){transform:scale(.9)}
.kbtn.burn{animation:kBusy .9s ease-in-out infinite;--kc:#ff365c}
.gearrow{display:flex;gap:4px;overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none;width:100%}
.gearrow::-webkit-scrollbar{display:none}
.gearrow .abtn{flex:0 0 auto;height:30px!important;min-width:0!important;padding:0 9px!important;font-size:10px}
.ghrow{display:contents}
.arm2{box-shadow:0 0 0 2px #fcee0a,0 0 14px rgba(252,238,10,.6)!important;animation:critChip .6s ease-in-out infinite}
.arm2 b{color:#fcee0a!important}
'''
s=s.replace('</style>\n</head>',css+'</style>\n</head>'); open(p,'w',encoding='utf8').write(s)
print('v22a applied')
