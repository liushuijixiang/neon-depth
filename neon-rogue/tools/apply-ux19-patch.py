p='game.js';s=open(p,encoding='utf8').read()
if 'UX_V19 · 背包' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
mod=open('tools/ux19-module.js',encoding='utf8').read()
anchor="/* =========================================================\n   启动"
rep(anchor,mod+"\n\n"+anchor)
# consumable full -> swap prompt
rep("""function addConsumable(spec) {
  if (G.inv.length >= 4) {""","""function addConsumable(spec) {
  if (G.inv.length >= 4 && G.mode === 'normal' && spec && spec.id !== 'mag_pack') { queueSwap(spec, null); return; }
  if (G.inv.length >= 4) {""")
rep("""      if (G.inv.length >= 4 && G.mode === 'normal' && classDef().id !== 'engineer') {
        if (!it.warned) { it.warned = true; msg('背包已满 · ' + it.cons.name + ' 留在地上', 'dim'); }
        continue;
      }""","""      if (G.inv.length >= 4 && G.mode === 'normal') {
        if (!it.warned) { queueSwap(it.cons, it); maybeShowSwap(); }
        continue;
      }""")
# chips: full -> leave on ground
rep("""      if (bagFull()) { var crv = CHIP_SELL[it.chip.quality] || 3; gainCredits(crv, x, y); toast('背包已满 · 芯片折现 ¥' + crv, 'warn'); return; }""","""      if (bagFull()) { G.items.splice(i, 0, it); if (!it.warned) { it.warned = true; toast('背包已满 · 芯片留在地上', 'warn'); } continue; }""")
rep("""  else if (bagFull()) { var cr = CHIP_SELL[c.quality] || 3; gainCredits(cr, null, null, true); toast('背包已满 · 芯片折现 ¥' + cr, 'warn'); }""","""  else if (bagFull() && G.state === 'play' && G.map) { dropToGround({ chip: c }); toast('背包已满 · 芯片放在脚边', 'warn'); }""")
rep("""      if (applyMod(it.mod) === false) { if (it.inst && G.modBag.indexOf(it.mod.id) < 0) delete G.inst[it.mod.id]; continue; }""","""      if (applyMod(it.mod) === false) { if (it.inst && G.modBag.indexOf(it.mod.id) < 0) delete G.inst[it.mod.id]; it.warned = true; continue; }""")
rep("""  if (!free && bagFull()) { toast('背包已满（' + bagCount() + '/' + bagCap() + '）', 'bad'); return false; }""","""  if (!free && bagFull()) {
    if (G.state === 'play' && G.map && !(G.items || []).some(function (it) { return it.mod === m; })) { dropToGround({ mod: m, inst: (G.inst || {})[m.id] }); toast('背包已满 · ' + m.name + ' 放在脚边', 'warn'); }
    else toast('背包已满（' + bagCount() + '/' + bagCap() + '）', 'bad');
    return false;
  }""")
# show swap in resume chains
rep("function econResume() {\n  if (G.state !== 'play') return;\n  if (maybeShowLoot()) return;","function econResume() {\n  if (G.state !== 'play') return;\n  if (maybeShowSwap()) return;\n  if (maybeShowLoot()) return;")
rep("  maybeShowLoot();\n  maybeShowStory();\n  maybeShowBoard();\n  if (psychoActive()) psychoSchedule();","  maybeShowSwap();\n  maybeShowLoot();\n  maybeShowStory();\n  maybeShowBoard();\n  if (psychoActive()) psychoSchedule();")
# contracts guarantee
rep("  if (c.def.type === 'hunt') spawnWanted(c);","  if (c.def.type === 'hunt') spawnWanted(c);\n  setTimeout(contractEnsure, 0);")
rep("  spawnPsychoEnemy(G.depth);","  spawnPsychoEnemy(G.depth);\n  contractEnsure();")
rep("  contractTick(); trialTick();","  contractTick(); trialTick();\n  if (G.turn % 4 === 0) contractEnsure();")
# NPC pacing
rep("""  var n = (STORY.npcs || []).find(function (x) { return x.floor === depth; }); if (!n) return;""","""  var n = pickNpcForFloor(depth); if (!n) return;
  G.npcSeen.push(n.id);""")
rep("var NPC_BY = {}; (STORY.npcs || []).forEach(function (n) { NPC_BY[n.id] = n; });","var NPC_BY = {}; (STORY.npcs || []).concat(((window.NEON && window.NEON.story2) || {}).npcs || []).forEach(function (n) { NPC_BY[n.id] = n; });")
rep("  G.storyQueue = []; G.relicUsed = {};","  G.npcSeen = []; G.swapQueue = []; G.storyQueue = []; G.relicUsed = {};")
# hire: this floor only, one at a time, not persisted
rep("  var keepDrones = G.allies.filter(function (a) { return a.kind === 'drone' || a.kind === 'merc'; });","  var hadMerc = G.allies.some(function (a) { return a.kind === 'merc'; });\n  var keepDrones = G.allies.filter(function (a) { return a.kind === 'drone'; });\n  if (hadMerc) msg('雇来的人留在了上一层', 'dim');")
rep("""    html += siteRow({ name: '雇佣 · ' + n.hire.skillName, tag: hired ? '已在队伍中' : '¥' + cost + ' · 随行至本次深潜结束',""","""    var other = G.allies.some(function (a) { return a.kind === 'merc' && a.npc !== n.id; });
    html += siteRow({ name: '雇佣 · ' + n.hire.skillName, tag: hired ? '已在队伍中' : '¥' + cost + ' · 仅限本层' + (other ? ' · 会替换当前雇员' : ''),""")
rep("  var st = npcState(n.id); if (!s.data.met) {","  var st = npcState(n.id); if (s.data.hired && !G.allies.some(function (a) { return a.kind === 'merc' && a.npc === n.id; })) s.data.hireDone = 1;\n  if (!s.data.met) {")
rep("""    var cost = econPrice(n.hire.cost), hired = G.allies.some(function (a) { return a.kind === 'merc' && a.npc === n.id; });""","""    var cost = econPrice(Math.round(n.hire.cost * 1.6)), hired = G.allies.some(function (a) { return a.kind === 'merc' && a.npc === n.id; });""")
rep("""    var cost = econPrice(n.hire.cost); if ((G.credits || 0) < cost) return;""","""    var cost = econPrice(Math.round(n.hire.cost * 1.6)); if ((G.credits || 0) < cost || s.data.hired) return; s.data.hired = 1;""")
# merc draw smaller & translucent
rep("if(a.kind==='merc'){ctx.save();ctx.fillStyle='#16212b';ctx.strokeStyle=a.color;ctx.lineWidth=1.6;nvGlow(a.color,8);visualPlate(x,y,tile*.62,tile*.62);","if(a.kind==='merc'){ctx.save();ctx.globalAlpha=.78;ctx.fillStyle='rgba(22,33,43,.55)';ctx.strokeStyle=a.color;ctx.lineWidth=1.2;visualPlate(x,y,tile*.46,tile*.46);")
rep("ctx.font='700 '+Math.round(tile*.36)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=a.color;ctx.fillText(a.char||'佣',x,y+1);ctx.restore();return;}","ctx.font='700 '+Math.round(tile*.26)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=a.color;ctx.fillText(a.char||'佣',x,y+1);ctx.restore();return;}")
# dream: no level/evo/boon popups
rep("function maybeShowBoon() {\n  if (G.state !== 'play' || G.pendingBoons <= 0","function maybeShowBoon() {\n  if (G.mode === 'dream') { G.pendingBoons = 0; return; }\n  if (G.state !== 'play' || G.pendingBoons <= 0")
rep("function maybeShowEvolution() {\n  if (G.state !== 'play' || !G.pendingEvo","function maybeShowEvolution() {\n  if (G.mode === 'dream') { G.pendingEvo = 0; return; }\n  if (G.state !== 'play' || !G.pendingEvo")
rep("function maybeShowSkillChoice() {\n  if (!p || G.state !== 'play' || p.pending <= 0","function maybeShowSkillChoice() {\n  if (p && G.mode === 'dream') { p.pending = 0; return; }\n  if (!p || G.state !== 'play' || p.pending <= 0")
rep("  if (G.depth % 5 === 1) G.pendingBoard = { offers: contractOffers(),","  if (G.depth % 5 === 1 && G.mode === 'normal') G.pendingBoard = { offers: contractOffers(),")
# HUD bag chip
rep("  var chromeNow = chromeState(), chromeEl = $('#chromeload');","  var bagEl = $('#bagchip'); if (bagEl) { bagEl.style.display = G.mode === 'normal' || G.mode === 'dream' ? '' : 'none'; bagEl.textContent = '包 ' + bagCount() + '/' + bagCap(); bagEl.classList.toggle('full', bagFull()); }\n  var chromeNow = chromeState(), chromeEl = $('#chromeload');")
rep("  var chromeChip = $('#chromeload'); if (chromeChip) chromeChip.onclick = function () { if (G.state === 'play' && !G.modal) openCyber(); };","  var chromeChip = $('#chromeload'); if (chromeChip) chromeChip.onclick = function () { if (G.state === 'play' && !G.modal) openCyber(); };\n  var bagChip = $('#bagchip'); if (bagChip) bagChip.onclick = function () { if (G.state === 'play' && !G.modal) openBag(); };")
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
a='<span id="chromeload"'
assert s.count(a)==1
s=s.replace(a,'<span id="bagchip" class="chip bagchip" role="button" style="display:none">包 0/6</span>\n      '+a)
css='''
.chip.bagchip{cursor:pointer;color:#c9e8ff;border-color:rgba(159,233,255,.35)}.chip.bagchip.full{color:#ff9aa5;border-color:rgba(255,77,94,.6)}
.card.swap{--acc:#ffd166}.swap-new{text-align:left;padding:9px 10px;margin:8px 0;border:1px solid var(--it);border-left:3px solid var(--it);background:linear-gradient(110deg,color-mix(in srgb,var(--it) 14%,#070b12),#070b12 70%)}
.swap-new b{color:var(--it);font-size:13px}.swap-new small{display:block;font-size:9px;color:#8aa0ad}.swap-new em{display:block;font-style:normal;font-size:10px;color:#cfe8ff;margin-top:3px}
.swap-grid,.bag-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.swap-old{font-family:inherit;text-align:left;padding:9px 10px;border:1px solid color-mix(in srgb,var(--it) 50%,transparent);border-radius:4px;background:#0a1018;color:#eaf6ff}
.swap-old b{display:block;color:var(--it);font-size:12px}.swap-old small{font-size:9px;color:#ffd166}
.swap-old:active{background:#16212b}
.card.bagp{--acc:#9fe9ff}.bag-bar{height:4px;background:rgba(255,255,255,.08);margin:6px 0 4px}.bag-bar i{display:block;height:100%;background:linear-gradient(90deg,#22e6ff,#ffd166)}
.bag-it{position:relative;text-align:left;padding:8px 8px 6px;border:1px solid color-mix(in srgb,var(--it) 45%,transparent);border-left:3px solid var(--it);background:#0a1018;min-width:0}
.bag-it b{display:block;font-size:11px;color:var(--it);overflow-wrap:anywhere}.bag-it small{display:block;font-size:8px;color:#8aa0ad;line-height:1.4}
.bag-it em{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-style:normal;font-size:9px;color:#a9c3d1;margin-top:2px}
.bag-act{display:flex;gap:4px;margin-top:5px}.bag-act button{flex:1;font:inherit;font-size:9px;padding:4px 2px;color:#cfe8ff;background:#111c27;border:1px solid #2c4658;border-radius:3px}
.bag-act button:active{background:#22374a}
'''
s=s.replace('</style>\n</head>',css+'</style>\n</head>'); open(p,'w',encoding='utf8').write(s)
print('ux19 patch applied')
