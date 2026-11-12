p='game.js';s=open(p,encoding='utf8').read()
if 'V34 ·' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
anchor="/* =========================================================\n   启动"
rep(anchor,open('tools/v34-module.js',encoding='utf8').read()+"\n\n"+anchor)
# contracts
rep("  contractEnsure();\n  if (false) G.pendingBoard","  contractRecheck();\n  contractEnsure();\n  contractEnsure2();\n  if (false) G.pendingBoard")
rep("  setTimeout(contractEnsure, 0);","  setTimeout(function () { contractRecheck(); contractEnsure(); contractEnsure2(); }, 0);")
rep("function contractEvent(type, e) {\n  if (G.mode !== 'normal') return;","function contractEvent(type, e) {\n  if (G.mode !== 'normal') return;\n  contractEvent2(type, e);")
rep("function openChest(c) {\n","function openChest(c) {\n  contractEvent('chest');\n")
rep("  if (def.type === 'challenge' && G.depth % 5 === 4) return false;","  if (def.type === 'challenge' && G.depth % 5 === 4) return false;\n  if (bossFloor && ['killCorp', 'chests', 'beacons', 'ambush', 'noSkill'].indexOf(def.type) >= 0) return false;")
# balance
rep("  var atk = scaleStat(spec, spec.atk, depth) + Math.floor(depth / 6) + (G.curse ? G.curse.enemyAtk : 0);","  var atk = Math.round((scaleStat(spec, spec.atk, depth) + Math.floor(depth / 6)) * (1 + (depth - 1) * .07)) + (G.curse ? G.curse.enemyAtk : 0);\n  hp = Math.round(hp * (1 + (depth - 1) * .03));")
rep("atk:spec.atk+1+Math.floor((depth-1)/2),","atk:Math.round((spec.atk+1+Math.floor((depth-1)/2))*(1+(depth-1)*.05)),")
rep("  var dodge = 0.08 + (G.mod ? G.mod.dodge : 0) + buffStat('dodge') * 0.01;","  var dodge = Math.min(.5, 0.08 + (G.mod ? G.mod.dodge : 0) + buffStat('dodge') * 0.01);")
s=s.replace("  G.mod = calcMods();\n","  G.mod = calcMods();\n  if (G.mod.lifesteal > .3) G.mod.lifesteal = .3;\n")
# duel
rep("    e.hp = e.maxHp = Math.round(e.maxHp * 3.5); e.atk += 2; e.alerted = true; tacticUid(e); G.enemies.push(e);","    var DB = duelBuild(n, G.depth); e.hp = e.maxHp = DB.hp; e.atk = DB.atk; e.def = DB.def; e.npcKit = { corp: null, mods: DB.mods, cd: 1, i: 0 }; e.alerted = true; tacticUid(e); G.enemies.push(e);")
rep("  var k = e.corpKit; if (!k || !e.alerted || e.neutral) return false;","  var k = corpKitOf(e); if (!k || !e.alerted || e.neutral) return false;")
rep("  float(e.x, e.y, '「' + nm + '」', CORPS[k.corp].color, true);","  float(e.x, e.y, '「' + nm + '」', k.corp ? CORPS[k.corp].color : e.color, true);")
rep("if(e.corpKit&&!e.intent&&!e.boss&&corpUseSkill(e))return;","if((e.corpKit||e.npcKit)&&!e.intent&&!e.boss&&corpUseSkill(e))return;")
# chip cap
rep("function chipCap() { return 12 + Math.round(metaStatSum('bag')); }","function chipCap() { return 30 + Math.round(metaStatSum('bag')); }")
# repair cost
rep("rc = Math.round(5 + (si.maxDur - si.dur) * (3 + Q_ORDER.indexOf(m.quality)));","rc = Math.round((8 + (si.maxDur - si.dur) * (4 + Q_ORDER.indexOf(m.quality) * 1.5)) * (1 + (si.plus || 0) * .6));")
i=s.index("    if (rp && sit && sit.inst) rp.onclick = function () {"); j=s.index("\n",i); line=s[i:j]
line2=line.replace("var c = Math.round(5 + (sit.inst.maxDur - sit.inst.dur) * (3 + Q_ORDER.indexOf(smod.quality)));","var c = Math.round((8 + (sit.inst.maxDur - sit.inst.dur) * (4 + Q_ORDER.indexOf(smod.quality) * 1.5)) * (1 + (sit.inst.plus || 0) * .6));")
assert line2!=line, 'repair onclick'
s=s[:i]+line2+s[j:]
# psycho mech chips
rep("  e.psycho.chips.forEach(function (c) { var spot","  e.psycho.chips.forEach(function (c) { c.mech = true; var spot")
rep("'<i class=\"pins\"></i><b>' + (CHIP_GLYPH[c.stat] || '芯') + '</b>","'<i class=\"pins\"></i>' + (c.mech ? '<s class=\"mechb\">机改</s>' : '') + '<b>' + (CHIP_GLYPH[c.stat] || '芯') + '</b>")
rep("'<div class=\"stx\"><b>' + econEsc(c.grade + '·' + c.name)","'<div class=\"stx\"><b>' + (c.mech ? '<span class=\"mechtag\">⚙ 机械改造</span> ' : '') + econEsc(c.grade + '·' + c.name)")
# auto install guard
rep("  instOf(m.id);\n  G.modBag.push(m.id);\n  if (free) {\n    installCyber(m.id, free);","  instOf(m.id);\n  G.modBag.push(m.id);\n  if (free && G.mode === 'normal' && cyberOverload() <= 0 && cyberLoad() + instLoad(m.id) > adaptationCap()) {\n    if (bagFits(m.id)) { toast('装上会过载 · ' + m.name + ' 已放进背包', 'warn'); sfx.pick(); return; }\n    G.modBag.splice(G.modBag.indexOf(m.id), 1); var dI = G.inst[m.id]; delete G.inst[m.id]; dropToGround({ mod: m, inst: dI }); toast('装上会过载，背包也放不下 · 留在脚边', 'warn'); return false;\n  }\n  if (free) {\n    installCyber(m.id, free);")
rep("""function addChipObject(c) {
  var slot = CYBER_SLOTS.map(function (x) { return x.id; }).find(function (sl) {""","""function addChipObject(c) {
  var noAuto = c.heavy && G.mode === 'normal' && p && cyberOverload() <= 0 && cyberLoad() + c.heavy > adaptationCap();
  var slot = noAuto ? null : CYBER_SLOTS.map(function (x) { return x.id; }).find(function (sl) {""")
# auto loadout button
rep("  html += '<div class=\"dock\"><button class=\"cta\" id=\"cyberClose\">返回战斗</button></div></div>';","  html += '<div class=\"dock\"><button class=\"ghost\" id=\"autoFit\">一键配装</button><button class=\"cta\" id=\"cyberClose\">返回战斗</button></div></div>';")
rep("  bindHub();\n  overlay.classList.add('show');\n  G.modal = 'cyber'; G.paused = true; G.busy = false;\n  $$('[data-ctab]')","  bindHub();\n  var af = $('#autoFit'); if (af) af.onclick = function () { autoLoadout(); renderCyber(); };\n  overlay.classList.add('show');\n  G.modal = 'cyber'; G.paused = true; G.busy = false;\n  $$('[data-ctab]')")
# bar talk
rep("  var line = ST.lastDeath && Math.random() < .35 ? '上次你倒在 B' + ST.lastDeath + 'F。我给你留了个座。' : pick(bt.lines.length ? bt.lines : ['……']);","  var line = G._hanLine || (ST.lastDeath && Math.random() < .35 ? '上次你倒在 B' + ST.lastDeath + 'F。我给你留了个座。' : hanLine()); G._hanLine = line;")
rep("'<h1 class=\"title small\">' + econEsc(B.name || '余烬') + '</h1><div class=\"story-text npc-say\">' + econEsc(bt.name) + '：「' + econEsc(line) + '」</div>' +","'<h1 class=\"title small\">' + econEsc(B.name || '余烬') + '</h1><div class=\"story-text npc-say\">' + econEsc(bt.name) + '：「' + econEsc(line) + '」</div><button class=\"ghost\" id=\"hanTalk\" style=\"margin:0 0 6px\">跟老韩聊两句</button>' +")
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
s=s.replace('</style>\n</head>','.chipico .mechb{position:absolute;left:2px;top:2px;font-size:7px;text-decoration:none;background:linear-gradient(90deg,#b0c4cc,#fff);color:#05070d;padding:0 2px;font-weight:700}.mechtag{font-size:8px;padding:0 4px;background:linear-gradient(90deg,#9aaeb8,#fff);color:#05070d;font-weight:700}\n</style>\n</head>')
open(p,'w',encoding='utf8').write(s)
print('v34 applied')
