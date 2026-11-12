# Applies STORY_V1 hooks to game.js (each anchor must match exactly once)
p='game.js';s=open(p,encoding='utf8').read()
if 'STORY_V1' in s: raise SystemExit('already applied')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
mod=open('tools/story-module.js',encoding='utf8').read().replace("spec = (BOSSES || []).find(","spec = ((window.NEON && window.NEON.bosses) || []).find(")
anchor="/* =========================================================\n   启动"
rep(anchor,mod+"\n\n"+anchor)
rep("function cyberLore(m) {\n  if (m.lore) return m.lore;","function cyberLore(m) {\n  if (m.lore) return m.lore;\n  if (window.NEON && window.NEON.modLore && window.NEON.modLore[m.id]) return window.NEON.modLore[m.id];")
rep("  if (!s || (s.used && !SITE_DEFS[s.type].reuse)) return;","  if (!s || (s.used && !siteDef(s).reuse)) return;")
rep("    if (here && (!here.used || SITE_DEFS[here.type].reuse)) { openSite(here); return; }","    if (here && (!here.used || siteDef(here).reuse)) { openSite(here); return; }")
rep("  var d = SITE_DEFS[s.type];\n","  var d = siteDef(s);\n")
rep("    var d = SITE_DEFS[s.type], t = view.tile,","    var d = siteDef(s), t = view.tile,")
rep("var d = SITE_DEFS[s.type]; ctx.fillStyle = s.used && !d.r","var d = siteDef(s); ctx.fillStyle = s.used && !d.r")
rep("  else if (s.type === 'trial') openTrial(s);","  else if (s.type === 'trial') openTrial(s);\n  else if (s.type === 'npc') openNpc(s);")
i=s.index("function genSites(depth, rooms, start, far) {"); j=s.index("  return sites;\n}",i)
s=s[:j]+"  placeNpcSite(depth, sites);\n"+s[j:]
rep("  if ((G.cyberCd[id] || 0) > 0) { msg('义体冷却中', 'dim'); return; }\n  var a = m.active;","  if ((G.cyberCd[id] || 0) > 0) { msg('义体冷却中', 'dim'); return; }\n  var a = m.active;\n  if (a.type.indexOf('relic_') === 0) { relicFire(id, m); return; }")
rep("""    var stanceOn = G.stance && G.stance.id === cid;""","""    var stanceOn = G.stance && G.stance.id === cid;
    if (cm.relic) { var spent = (G.relicUsed || {})[cid]; html += '<button class="abtn relic" data-cyberact="' + cid + '"' + (spent ? ' disabled' : '') + '><span class="nm">' + (spent ? '已耗尽 · ' : '◆ ') + cm.active.name + '</span><span class="cd">遗物</span></button>'; return; }""")
rep("""function lose() {
  if (G.state !== 'play') return;""","""function lose() {
  if (G.state !== 'play') return;
  if (G.rebirthArmed && G.mode !== 'train') {
    G.rebirthArmed = false; p.hp = p.maxHp; G.flash = 1; NV.glitch = 1; nvColumn(p.x, p.y, '#fcee0a', 8);
    toast('遗物 · 复苏', 'good'); msg('心跳被重新接上。不是第一次了。', 'warn'); updateHUD(); return;
  }
  if (G.mode === 'normal') storyEvent('death');""")
rep("function adaptationCap() { return 10 + ((p ? p.level : 1) - 1) * 2 + Math.round(metaStatSum('adapt')) + chipStats().compat + (G.adaptBonus || 0); }",
    "function adaptationCap() { return 10 + ((p ? p.level : 1) - 1) * 2 + Math.round(metaStatSum('adapt')) + chipStats().compat + (G.adaptBonus || 0) + ((G.purgeT || 0) > 0 ? 999 : 0) - ((G.chal && G.chal.adaptMinus) || 0); }")
rep("  tickStance();\n","  tickStance();\n  if (G.purgeT > 0 && --G.purgeT === 0) { msg('净化结束 · 负载重新压上神经', 'warn'); recalc(); }\n")
rep("  var keepDrones = G.allies.filter(function (a) { return a.kind === 'drone'; });","  var keepDrones = G.allies.filter(function (a) { return a.kind === 'drone' || a.kind === 'merc'; });")
rep("""  G.allies.forEach(function (a) {
    a.turns--;
    if (a.kind === 'hacked') {""","""  G.allies.forEach(function (a) {
    a.turns--;
    if (a.kind === 'merc') { mercAct(a); return; }
    if (a.kind === 'hacked') {""")
rep("  G.allies.forEach(function(a){if(!on(a.x,a.y))return;var x=sx(a.x),y=sy(a.y);",
    "  G.allies.forEach(function(a){if(!on(a.x,a.y))return;var x=sx(a.x),y=sy(a.y);if(a.kind==='merc'){ctx.save();ctx.fillStyle='#16212b';ctx.strokeStyle=a.color;ctx.lineWidth=1.6;nvGlow(a.color,8);visualPlate(x,y,tile*.62,tile*.62);ctx.fill();ctx.stroke();nvNoGlow();ctx.font='700 '+Math.round(tile*.36)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=a.color;ctx.fillText(a.char||'佣',x,y+1);ctx.restore();return;}")
rep("  nvKill(e, G.lastHit","  if (e.npcDuel) npcDuelWon(e);\n  if (e.boss && G.mode === 'normal') storyEvent('boss', e.spec.id);\n  nvKill(e, G.lastHit")
rep("  c.done = true; c.progress = c.target; c.endTurn = G.turn;","  c.done = true; c.progress = c.target; c.endTurn = G.turn;\n  if (c.def.npc) npcJobDone(c);")
rep("  c.failed = true; c.endTurn = G.turn; c.reason = reason;\n  var pen = '';","  c.failed = true; c.endTurn = G.turn; c.reason = reason;\n  var pen = '';\n  if (c.def.noPenalty) { msg('私人委托落空「' + c.def.name + '」', 'dim'); return; }")
rep("""<div class="loot-sub">「活儿就这些。挑一个，或者都挑——前提是你活得过来。」</div>""","""<div class="loot-sub">' + econEsc((STORY.fixer && STORY.fixer.name ? STORY.fixer.name + '：' : '') + '「' + pick((STORY.fixer && STORY.fixer.lines && STORY.fixer.lines.length) ? STORY.fixer.lines : ['活儿就这些。']) + '」') + '</div>""")
rep("""      '<div class="ct-obj">' + econEsc(contractDesc(c)) + '<small>' + DEADLINE_CN[c.def.deadline] + '</small></div>' +""","""      '<div class="ct-obj">' + econEsc(contractDesc(c)) + '<small>' + DEADLINE_CN[c.def.deadline] + '</small></div>' + ((STORY.contracts || {})[c.def.id] ? '<div class="ct-note">' + econEsc(STORY.contracts[c.def.id]) + '</div>' : '') +""")
rep("  toast('赛博精神病 · 失控 ' + G.psycho + ' 回合', 'bad');","  toast('赛博精神病 · 失控 ' + G.psycho + ' 回合', 'bad');\n  if (G.mode === 'normal') storyEvent('psycho');")
rep("    if (G.loanFloors > 0) G.loanFloors--;","    if (G.loanFloors > 0) G.loanFloors--;\n    storyEvent('depth', G.depth);")
rep("  rollQuests();","  rollQuests();\n  G.storyQueue = []; G.relicUsed = {}; G.rebirthArmed = false; G.purgeT = 0;\n  if (G.mode === 'normal') { applyPendingDrink(); storyEvent('start'); }")
rep("  extractCyber();\n  G.state = 'win'; G.busy = true;\n  cum.wins++;","  storyEvent('win'); G.lastLegend = writeLegend();\n  extractCyber();\n  G.state = 'win'; G.busy = true;\n  cum.wins++;")
rep("function econResume() {\n  if (G.state !== 'play') return;\n  if (maybeShowLoot()) return;","function econResume() {\n  if (G.state !== 'play') return;\n  if (maybeShowLoot()) return;\n  if (maybeShowStory()) return;")
rep("  maybeShowLoot();\n  maybeShowBoard();\n  if (psychoActive()) psychoSchedule();\n}","  maybeShowLoot();\n  maybeShowStory();\n  maybeShowBoard();\n  if (psychoActive()) psychoSchedule();\n}")
rep("""    '<button class="cta" id="actionBtn">返回主菜单</button>' +
    '<button class="ghost" id="endMenu">查看成就</button>' +""","""    (won && G.mode === 'normal' && G.lastLegend ? '<div class="legend end"><small>余烬的墙上多了一行字</small><b>' + econEsc(G.lastLegend.title) + '</b><p>' + econEsc(G.lastLegend.text) + '</p><small>老韩调了一杯「' + econEsc(G.lastLegend.drink) + '」，记在酒单上</small></div>' : '') +
    (!won && G.mode === 'normal' && (STORY.bar || {}).bartender ? '<div class="hint" style="color:#ff9f6a">' + econEsc(STORY.bar.bartender.name) + '会在吧台给你留个座。</div>' : '') +
    '<button class="cta" id="actionBtn">返回主菜单</button>' +
    '<button class="ghost" id="endMenu">查看成就</button>' +""")
rep("""    '<button id="menuStash" class="ghost" style="flex:1;margin-top:0;border-color:rgba(34,230,255,.4);color:#9fe9ff;font-size:9px;padding-left:4px;padding-right:4px">仓库 ' + META.stash.cyber.length + '</button>' +
    '</div>' +""","""    '<button id="menuStash" class="ghost" style="flex:1;margin-top:0;border-color:rgba(34,230,255,.4);color:#9fe9ff;font-size:9px;padding-left:4px;padding-right:4px">仓库 ' + META.stash.cyber.length + '</button>' +
    '</div>' +
    '<div style="display:flex;gap:6px;margin-top:6px">' +
    '<button id="menuArchive" class="ghost" style="flex:1;margin-top:0;border-color:rgba(200,160,255,.5);color:#d6b8ff;font-size:9px">剧情档案 ' + Object.keys(ST.chapters).length + '/' + (STORY.chapters || []).length + '</button>' +
    '<button id="menuBar" class="ghost" style="flex:1;margin-top:0;border-color:rgba(255,122,69,.55);color:#ffb08a;font-size:9px">余烬酒吧' + (ST.pendingDrink ? ' · 已点' : '') + '</button>' +
    '</div>' +""")
rep("  $('#menuRush').onclick = function () { rushPrepScreen(); };","  $('#menuRush').onclick = function () { rushPrepScreen(); };\n  $('#menuArchive').onclick = function () { archiveScreen('main'); };\n  $('#menuBar').onclick = function () { barScreen('drinks'); };")
rep("""        '<b style="color:' + c.color + '">' + c.name + '</b><span class="tag">' + c.tag + '</span>' +""","""        '<b style="color:' + c.color + '">' + c.name + '</b><span class="tag">' + c.tag + (ST.classes[c.id + ':0'] && STORY.classes[c.id] ? ' · ' + STORY.classes[c.id].title : '') + '</span>' +""")
rep("    '<div class=\"kicker\">DARK ALLEY ECONOMY · 暗巷经济 1.5</div>' +","    '<div class=\"kicker\">DEEP WELL ARCHIVE · 深井档案 1.7</div>' +")
open(p,'w',encoding='utf8').write(s)
print('story patch applied')
