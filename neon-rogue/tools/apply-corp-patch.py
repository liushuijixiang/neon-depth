p='game.js';s=open(p,encoding='utf8').read()
if 'CORP_V1' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
mod=open('tools/monart-module.js',encoding='utf8').read()+"\n"+open('tools/corp-module.js',encoding='utf8').read()+"""
function corpTick() {
  if (G.mode !== 'normal' || !p) return;
  if (corpCount('mobius') >= 2 && p.hp < p.maxHp) healPlayer(Math.max(1, Math.round(p.maxHp * .02)), true);
}
function maybeShowCorpReward() {
  if (!G.pendingCorpReward || G.state !== 'play' || G.modal || G.paused || G.busy) return false;
  var c = G.pendingCorpReward; G.pendingCorpReward = null; corpRewardScreen(c); return true;
}
"""
anchor="/* =========================================================\n   启动"
rep(anchor,mod+"\n\n"+anchor)
# art hook
rep("  visualPlate(x,y,r*1.65,r*1.75);ctx.fill();ctx.stroke();\n  if(e.boss&&!e.portrait)chromeIndustrialVisual(e,x,y,tile);\n  if(e.boss)visualBossSignature(e,x,y,r,now);\n  else if(e.ai==='tank')",
    "  var arted=!e.boss&&monArt(e,x,y,r,now,hit?'#ffffff':roleCol);\n  if(!arted){visualPlate(x,y,r*1.65,r*1.75);ctx.fill();ctx.stroke();}\n  if(e.boss&&!e.portrait)chromeIndustrialVisual(e,x,y,tile);\n  if(e.boss)visualBossSignature(e,x,y,r,now);\n  else if(arted){}\n  else if(e.ai==='tank')")
rep("  if(e.ai!=='healer'){ctx.fillStyle=roleCol;ctx.fillRect(x-r*.32,y-r*.1,r*.64,r*.2);}","  if(!arted&&e.ai!=='healer'){ctx.fillStyle=roleCol;ctx.fillRect(x-r*.32,y-r*.1,r*.64,r*.2);}\n  if(e.corpKit&&!e.portrait){ctx.fillStyle=CORPS[e.corpKit.corp].color;ctx.font='700 '+Math.max(7,tile*.22)+'px monospace';ctx.textAlign='center';ctx.fillText(CORPS[e.corpKit.corp].en,x,y+r*1.75);}")
rep("ctx.fillText(e.structure==='egg'?'卵'","ctx.fillText(e.structure==='gen'?'主机':e.structure==='egg'?'卵'")
# enemy act
rep("  e.tick++;if(e.structure){cyberStructureAct(e);return;}","  e.tick++;if(e.corpObj)return;if(e.structure){cyberStructureAct(e);return;}")
rep("  if(e.psycho&&!e.intent&&!e.boss&&psychoUseSkill(e,dist))return;","  if(e.psycho&&!e.intent&&!e.boss&&psychoUseSkill(e,dist))return;\n  if(e.corpKit&&!e.intent&&!e.boss&&corpUseSkill(e))return;")
# genMap op
rep("function genMap(depth) {\n  G.corpses = []; G.tacticFx = [];","function genMap(depth) {\n  G.corpses = []; G.tacticFx = [];\n  if (G.mode === 'normal' && G.corpOp && G.corpOp.depth === depth && !G.corpOp.active) { genCorpOp(depth); return; }")
rep("function startFloor() {\n","function startFloor() {\n  if (G.corpOp && (G.corpOp.active || G.depth > G.corpOp.depth) && G.depth !== G.corpOp.depth) { G.corpOp = null; G.opWall = null; }\n")
rep("  spawnPsychoEnemy(G.depth);","  spawnPsychoEnemy(G.depth);\n  corpPatrol(G.depth);\n  if (G.corpOp && G.corpOp.active && G.depth === G.corpOp.depth) { msg('B' + G.depth + 'F · ' + CORPS[G.corpOp.rival].name + '设施 · ' + CORP_JOBS[G.corpOp.job].goal.replace(/\\{rival\\}/g, CORPS[G.corpOp.rival].name), 'warn'); toast(CORPS[G.corpOp.corp].name + '委托 · 「' + CORP_JOBS[G.corpOp.job].name + '」', 'warn'); }")
# stairs lock
rep("  if (p.x !== G.stairs.x || p.y !== G.stairs.y) return;","  if (p.x !== G.stairs.x || p.y !== G.stairs.y) return;\n  if (G.corpOp && G.corpOp.active && !G.corpOp.done) { msg('出口被' + CORPS[G.corpOp.rival].name + '锁死了 · 先完成目标（' + G.corpOp.progress + '/' + G.corpOp.need + '）', 'bad'); return; }")
# kill hooks
rep("  if (e.npcDuel) npcDuelWon(e);\n","  if (e.npcDuel) npcDuelWon(e);\n  if (e.corpObj === 'gen') corpProgress();\n  if (e.corpKit) corpUnitDrop(e);\n  if (G.mode === 'normal' && !e.summoned && corpCount('kharon') >= 6 && Math.random() < .3) { var kcd = Object.keys(G.cyberCd || {}).filter(function (k) { return G.cyberCd[k] > 0; }); if (kcd.length) { var kk = pick(kcd); G.cyberCd[kk] = 0; float(p.x, p.y, '卡隆 · 冷却刷新', '#ffb347'); } }\n")
# sites
rep("  placeNpcSite(depth, sites);\n","  placeNpcSite(depth, sites);\n  placeCorpSite(depth, sites);\n")
rep("  else if (s.type === 'npc') openNpc(s);","  else if (s.type === 'npc') openNpc(s);\n  else if (s.type === 'corp') openCorp(s);\n  else if (s.type === 'terminal') openTerminal(s);")
# wall tint
rep("ctx.fillStyle=vis?'#142034':'#080d16'","ctx.fillStyle=vis?(G.opWall?'#1d1430':'#142034'):'#080d16'")
# chip doubling
rep("""    (Array.isArray(chips) ? chips : []).slice(0, cap).forEach(function (c) {
      addChipStat(c);
      (c && Array.isArray(c.affixes) ? c.affixes : []).forEach(addChipStat);
    });""","""    (Array.isArray(chips) ? chips : []).slice(0, cap).forEach(function (c) {
      addChipStat(c);
      if (c && c.corp && mod.corp === c.corp) addChipStat(c);
      (c && Array.isArray(c.affixes) ? c.affixes : []).forEach(addChipStat);
    });""")
# set bonuses
rep("chipStats().compat + (instStats().compat || 0) + (G.adaptBonus || 0)","chipStats().compat + (instStats().compat || 0) + (corpCount('dome') >= 2 ? 3 : 0) + (G.adaptBonus || 0)")
rep("function cyberPower() { return 1 + chipStats().power + (instStats().power || 0) + ","function cyberPower() { return 1 + chipStats().power + (instStats().power || 0) + (corpCount('dome') >= 4 ? .12 : 0) + ")
rep("  if (G.burnout && classDef().id === 'ghost') m.lifesteal = (m.lifesteal || 0) + .25;","  if (G.burnout && classDef().id === 'ghost') m.lifesteal = (m.lifesteal || 0) + .25;\n  if (typeof corpCount === 'function' && G.mode === 'normal') { if (corpCount('kharon') >= 2) m.atk = (m.atk || 0) + 3; if (corpCount('kharon') >= 4) m.critMult = (m.critMult || 0) + .2; if (corpCount('mobius') >= 4 && G.psycho > 0) { m.atk = (m.atk || 0) + 6; m.lifesteal = (m.lifesteal || 0) + .15; } }")
rep("  G.cyberCd[id] = Math.max(1, a.cd - (G.mods.cooldown_core ? 1 : 0));","  G.cyberCd[id] = Math.max(1, a.cd - (G.mods.cooldown_core ? 1 : 0));\n  if (G.mode === 'normal' && corpCount('dome') >= 6) addBuff('shield', 3, Math.max(2, Math.round(p.maxHp * .1)), '穹顶');")
rep("  tickReload();\n","  tickReload();\n  corpTick();\n")
rep("""function lose() {
  if (G.state !== 'play') return;""","""function lose() {
  if (G.state !== 'play') return;
  if (G.mode === 'normal' && corpCount('mobius') >= 6 && G.mobiusFloor !== G.depth) { G.mobiusFloor = G.depth; p.hp = Math.max(1, Math.round(p.maxHp * .5)); G.psycho = Math.max(G.psycho || 0, 2); NV.glitch = 1; toast('莫比乌斯环 · 重组', 'bad'); msg('身体自己把自己缝了回去。你没在控制它。', 'warn'); recalc(); updateHUD(); psychoSchedule(); return; }""")
rep("function instOf(id) { G.inst = G.inst || {}; if (!G.inst[id] && MOD_BY[id]) G.inst[id] =","function instOf(id) { G.inst = G.inst || {}; if (!G.inst[id] && MOD_BY[id] && MOD_BY[id].corp === 'mobius') { G.inst[id] = rollInst(MOD_BY[id], { origin: '' }); G.inst[id].heavy = 2; } if (!G.inst[id] && MOD_BY[id]) G.inst[id] =")
# reward queue
rep("function econResume() {\n  if (G.state !== 'play') return;\n  if (maybeShowSwap()) return;","function econResume() {\n  if (G.state !== 'play') return;\n  if (maybeShowCorpReward()) return;\n  if (maybeShowSwap()) return;")
rep("  maybeShowSwap();\n  maybeShowLoot();\n  maybeShowStory();","  maybeShowCorpReward();\n  maybeShowSwap();\n  maybeShowLoot();\n  maybeShowStory();")
rep("  G.items.push({ x: G.stairs.x, y: G.stairs.y, corpReward: op.corp, seed: 0 });","  G.pendingCorpReward = op.corp;")
# corp set displays
s=s.replace("""    '<div style="text-align:left;font-size:10px;line-height:1.8;color:#fcee0a;margin-top:4px">特殊：' + m.desc + '</div>'""","""    (typeof corpSetHTML === 'function' ? corpSetHTML(m) : '') + '<div style="text-align:left;font-size:10px;line-height:1.8;color:#fcee0a;margin-top:4px">特殊：' + m.desc + '</div>'""")
rep("row('背包', bagLoad() + ' / ' + bagCap()) + '</div>';","row('背包', bagLoad() + ' / ' + bagCap()) + '</div>' + Object.keys(CORPS).filter(function (k) { return corpCount(k) > 0; }).map(function (k) { var anyId = CORP_MODS.find(function (d) { return d.corp === k; }).id; return corpSetHTML(MOD_BY[anyId]); }).join('');")
# new game resets
rep("  G.npcSeen = []; G.evSeen = []; G.swapQueue = [];","  G.npcSeen = []; G.evSeen = []; G.swapQueue = []; G.corpOp = null; G.corpZone = {}; G.opWall = null; G.pendingCorpReward = null; G.mobiusFloor = 0;")
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
css='''
/* CORP_V1 */
.corpset{--cc:#b06bff;text-align:left;margin:6px 0;padding:7px 9px;border:1px solid color-mix(in srgb,var(--cc) 50%,transparent);border-left:3px solid var(--cc);background:linear-gradient(110deg,color-mix(in srgb,var(--cc) 12%,#070b12),#070b12 70%)}
.corpset b{display:block;font-size:11px;color:var(--cc);margin-bottom:3px}.corpset span{display:block;font-size:10px;color:#5f7380;line-height:1.6}.corpset span.on{color:#eafff3}.corpset span.on::before{content:"✓ ";color:var(--cc)}
.corpset small{display:block;font-size:9px;color:#8aa0ad;margin-top:3px}
.card.corpcard{--acc:var(--site)}.corp-job{text-align:left;padding:8px 10px;margin:8px 0;border:1px dashed color-mix(in srgb,var(--site) 60%,transparent);background:rgba(10,14,22,.7)}
.corp-job b{color:var(--site);font-size:12px}.corp-job p{font-size:11px;color:#e6f2fa;margin:4px 0}.corp-job small{font-size:9px;color:#8aa0ad;line-height:1.5}
'''
s=s.replace('</style>\n</head>',css+'</style>\n</head>'); open(p,'w',encoding='utf8').write(s)
print('corp applied')
