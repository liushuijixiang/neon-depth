p='game.js';s=open(p,encoding='utf8').read()
if 'DREAM_V2' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
mod=open('tools/dream2-module.js',encoding='utf8').read()
rep("function dreamTick() {",mod+"\nfunction dreamTick() {")
i=s.index("function dreamTick() {"); j=s.index("\n}\n",i)
s=s[:i]+"""function dreamTick() {
  if (G.mode !== 'dream' || !G.dream) return;
  G.dreamCds = G.dreamCds || {}; Object.keys(G.dreamCds).forEach(function (k) { if (G.dreamCds[k] > 0) G.dreamCds[k]--; });
  var kit = G.dream.kit;
  if (kit === 'replicant') { var d = Math.max(1, Math.round(p.maxHp * .03)); p.hp -= d; float(p.x, p.y, '-' + d, '#ffd166'); if (p.hp <= 0) { p.hp = 0; lose(); return; } }
  if (kit === 'runner') { G.dreamHeat = Math.max(0, G.dreamHeat - 5); if (G.dreamHeat >= 100) { G.dreamHeat = 40; triggerPsycho(); } }
  if (kit === 'hound') { var low = p.hp < p.maxHp * .35; if (low !== !!G.dreamFrenzy) { G.dreamFrenzy = low; if (low) { G.dreamFrenzyAtk = Math.round(effAtk() * .5); toast('狂猎', 'bad'); NV.crit = 1; NV.critColor = '#ff365c'; } G.runMod.atk = (G.runMod.atk || 0) + (low ? 1 : -1) * (G.dreamFrenzyAtk || 0); G.runMod.lifesteal = (G.runMod.lifesteal || 0) + (low ? .2 : -.2); recalc(); } }
  if (G.dreamRiff > 0) G.dreamRiff--;
  if (kit === 'puppet') G.allies.forEach(function (a) { if (a.kind === 'hacked') a.turns = Math.max(a.turns, 5); });
}"""+s[j+2:]
rep("""  if (G.mode === 'dream' && G.dream) { var dk = DREAM_KITS[G.dream.kit]; html += kbtn('dream', dk.act.name, G.dreamCd ? '还需 ' + G.dreamCd + ' 回合' : (G.dream.kit === 'runner' ? '失控值 ' + G.dreamHeat + '/100' : '无限次'), dk.act.color, G.dreamCd > 0, '', 'dreamact'); }""",
"""  if (G.mode === 'dream' && G.dream) { G.dreamCds = G.dreamCds || {}; (DREAM_ACTS[G.dream.kit] || []).forEach(function (a) { var cd = G.dreamCds[a.k] || 0; html += kbtn('dream:' + a.k, a.name, cd ? '还需 ' + cd + ' 回合' : a.desc, a.color, cd > 0, '', 'dreamact'); });
    if (G.dream.kit === 'runner') html += '<div class="heatbar"><i style="width:' + Math.min(100, G.dreamHeat) + '%"></i><b>失控值 ' + G.dreamHeat + '/100</b></div>'; }""")
rep("      if (k === 'dream') dreamAct();","      if (k.indexOf('dream:') === 0) dreamAct2(k.slice(6));")
rep("  G.dreamCd = 0; G.dreamHeat = 0; G.dreamSkin = k.skin || null;","  G.dreamCd = 0; G.dreamCds = {}; G.dreamHeat = 0; G.dreamMaul = false; G.dreamFrenzy = false; G.dreamRiff = 0; G.dreamSkin = k.skin || null;")
rep("  if (G.stance && releaseStance()) return;","  if (G.dreamMaul && dreamMaulRelease()) return;\n  if (G.stance && releaseStance()) return;")
rep("  if (e.npcDuel) npcDuelWon(e);\n","  if (e.npcDuel) npcDuelWon(e);\n  if (G.mode === 'dream' && G.dream && G.dream.kit === 'rocker' && !e.summoned) { healPlayer(pctHp(.04), true); if (G.dreamRiff > 0) { G.runMod.atk = (G.runMod.atk || 0) + 2; recalc(); float(p.x, p.y, 'ATK +2', '#fcee0a'); } }\n")
rep("""<p>主动「' + k.act.name + '」：' + k.act.desc + '</p>""","""' + (DREAM_ACTS[d.kit] || []).map(function (a) { return '<p>「' + a.name + '」' + a.desc + '（冷却 ' + a.cd + '）</p>'; }).join('') + '<p>' + (DREAM_PASSIVE[d.kit] || '') + '</p>""")
s=s.replace("// DREAM_V2：","// DREAM_V2 ：",1)
s=s.replace("// DREAM_V2 ：","// DREAM_V2：",1)
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
if 'heatbar' not in s:
    s=s.replace('</style>\n</head>','.kbtn.dreamact{flex-basis:30%!important}.kbtn.dreamact small{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:8px;line-height:1.3}\n.heatbar{flex-basis:100%;position:relative;height:14px;background:rgba(255,255,255,.06);border:1px solid rgba(159,233,255,.3)}.heatbar i{display:block;height:100%;background:linear-gradient(90deg,#22e6ff,#ff365c)}.heatbar b{position:absolute;inset:0;font-size:9px;line-height:12px;text-align:center;color:#fff}\n</style>\n</head>')
    open(p,'w',encoding='utf8').write(s)
print('dream2 applied')
