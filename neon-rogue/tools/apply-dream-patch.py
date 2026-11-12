p='game.js';s=open(p,encoding='utf8').read()
if 'DREAM_V1' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
mod=open('tools/dream-module.js',encoding='utf8').read()
anchor="/* =========================================================\n   启动"
rep(anchor,mod+"\n\n"+anchor)
# chapter lock + dream check + scene queue handling
rep("""  (STORY.chapters || []).forEach(function (c, i) {
    if (ST.chapters[c.id] || !chapterMet(c.unlock)) return;""","""  (STORY.chapters || []).forEach(function (c, i) {
    if (ST.chapters[c.id] || !chapterMet(c.unlock)) return;
    if (c.lock && (ST.maxChalWin || 0) < c.lock.chal) return;""")
rep("  if (got) storySave();\n}\nfunction storyUnlock(","  if (got) storySave();\n  if (typeof dreamCheck === 'function') dreamCheck();\n}\nfunction storyUnlock(")
rep("""  var o = G.storyQueue.shift();
  showModal('story');""","""  var o = G.storyQueue.shift();
  if (o.scene) { playScene(o.scene, econResume); return true; }
  showModal('story');""")
rep("  if (type === 'start') { if (C2) storyUnlock('classes', cls + ':0', C2.title); }","  if (type === 'start') { if (C2) storyUnlock('classes', cls + ':0', C2.title); queueScene('intro'); }")
rep("""    if (b) { if (b.death) {""","""    queueScene('boss_' + G.depth);
    if (b) { if (b.death) {""")
rep("  if (type === 'psycho') ST.psycho++;","  if (type === 'psycho') { ST.psycho++; queueScene('first_psycho'); }")
rep("""  if (type === 'win') {
    ST.wins++;""","""  if (type === 'win') {
    ST.wins++; ST.maxChalWin = Math.max(ST.maxChalWin || 0, (G.chalSel || []).length);""")
# archive: lock hint
rep("""  if (tab === 'main') (STORY.chapters || []).forEach(function (c, i) { body += ST.chapters[c.id] ?""","""  if (tab === 'main') (STORY.chapters || []).forEach(function (c, i) { if (!ST.chapters[c.id] && c.lock) { body += '<div class="arc locked lockch"><b>🔒 ████████</b><p>' + econEsc(c.hint || '') + '</p><p class="arc-lock">' + chapterLockText(c) + '</p></div>'; return; } body += ST.chapters[c.id] ?""")
# death / win scenes
rep("  setTimeout(function () { if (G.runId === completedRun && G.state === 'over') endScreen(false, score, isBest); }, 750);",
    "  setTimeout(function () { if (G.runId !== completedRun || G.state !== 'over') return; if (G.mode === 'normal' && !ST.scenes.first_death && (STORY.scenes || {}).first_death) playScene('first_death', function () { endScreen(false, score, isBest); }); else endScreen(false, score, isBest); }, 750);")
rep("if (G.lastTally) tallyScreen(G.lastTally, function () { endScreen(true, score, isBest); }); else endScreen(true, score, isBest); }, 900);",
    "var goTally = function () { if (G.lastTally) tallyScreen(G.lastTally, function () { endScreen(true, score, isBest); }); else endScreen(true, score, isBest); }; if (!ST.scenes.win_first && (STORY.scenes || {}).win_first) playScene('win_first', goTally); else goTally(); }, 900);")
# lose in dream
rep("""  if (!G.rebirthArmed && G.mode === 'normal') clearRun();""","""  if (!G.rebirthArmed && G.mode === 'normal') clearRun();
  if (G.mode === 'dream' && !G.rebirthArmed) { dreamFinish(false); return; }""")
# mode
rep("  G.mode = G.trainPending ? 'train' : G.rushPending ? 'rush' : 'normal';","  G.mode = G.dreamPending ? 'dream' : G.trainPending ? 'train' : G.rushPending ? 'rush' : 'normal';")
rep("  if (G.rushPending) beginRush();","  if (G.rushPending) beginRush();\n  if (G.dreamPending) { G.dream = G.dreamPending; G.dreamPending = null; dreamSetup(); }")
rep("    if (G.state !== 'play' || G.runId !== descendingRun || G.mode !== 'normal') return;","    if (G.state !== 'play' || G.runId !== descendingRun || (G.mode !== 'normal' && G.mode !== 'dream')) return;")
rep("  if (e.boss && G.mode === 'normal') storyEvent('boss', e.spec.id);","  if (e.boss && G.mode === 'normal') storyEvent('boss', e.spec.id);\n  if (e.boss && G.mode === 'dream' && G.dream && G.depth >= DREAM_KITS[G.dream.kit].to) dreamFinish(true);")
rep("  tickReload();\n","  tickReload();\n  dreamTick();\n")
rep("  var isAss = clsId === 'assault';","  var isAss = clsId === 'assault' && !(G.mode === 'dream' && G.dream && DREAM_KITS[G.dream.kit].noClassBar);")
rep("  var html = '';\n  if (isGho) {","  var html = '';\n  if (G.mode === 'dream' && G.dream) { var dk = DREAM_KITS[G.dream.kit]; html += kbtn('dream', dk.act.name, G.dreamCd ? '还需 ' + G.dreamCd + ' 回合' : (G.dream.kit === 'runner' ? '失控值 ' + G.dreamHeat + '/100' : '无限次'), dk.act.color, G.dreamCd > 0, '', 'dreamact'); }\n  if (isGho) {")
rep("  if (!list.length && !isEng && !isAss && !isGho && G.mech <= 0) { abilitybar.innerHTML = ''; return; }","  if (!list.length && !isEng && !isAss && !isGho && G.mech <= 0 && G.mode !== 'dream') { abilitybar.innerHTML = ''; return; }")
# dream act click: data-act="dream" handled by act dispatcher? add explicit
rep("  $$('[data-ghost]').forEach(function (btn) {","  $$('[data-act=\"dream\"]').forEach(function (btn) { btn.onclick = function (ev) { ev.stopPropagation(); dreamAct(); }; });\n  $$('[data-ghost]').forEach(function (btn) {")
# skin
rep("visualPlayer(sx(p.x),sy(p.y),tile,now);}","if(G.dreamSkin){var sk=((window.NEON&&window.NEON.bosses)||[]).find(function(b){return b.id===G.dreamSkin;});if(sk){visualEnemy({spec:sk,id:sk.id,name:sk.name,boss:true,ai:'boss',color:sk.color,glyph:sk.glyph,hp:p.hp,maxHp:p.maxHp,x:p.x,y:p.y,brain:{},tick:0,face:p.face},sx(p.x),sy(p.y),tile,now,false);}else visualPlayer(sx(p.x),sy(p.y),tile,now);}else visualPlayer(sx(p.x),sy(p.y),tile,now);}")
# menu button
rep("""    '<button id="menuBar" class="ghost" style="flex:1;margin-top:0;border-color:rgba(255,122,69,.55);color:#ffb08a;font-size:9px">余烬酒吧' + (ST.pendingDrink ? ' · 已点' : '') + '</button>' +""","""    '<button id="menuBar" class="ghost" style="flex:1;margin-top:0;border-color:rgba(255,122,69,.55);color:#ffb08a;font-size:9px">余烬酒吧' + (ST.pendingDrink ? ' · 已点' : '') + '</button>' +
    '<button id="menuDream" class="ghost bd-btn" style="flex:1;margin-top:0;font-size:9px">超梦 ' + Object.keys(ST.dreams).length + '/' + DREAMS.length + '</button>' +""")
rep("  $('#menuBar').onclick = function () { barScreen('drinks'); };","  $('#menuBar').onclick = function () { barScreen('drinks'); };\n  $('#menuDream').onclick = function () { dreamShelf(); };")
# challenge tree: story lock hints
rep("""    '<div class="sub">已选 ' + sel.length + ' 项 · 分数 +' + mods.score + '%</div>' +
    '<div class="treebox">';""","""    '<div class="sub">已选 ' + sel.length + ' 项 · 分数 +' + mods.score + '%</div>' +
    (function () { var nx = (STORY.chapters || []).filter(function (c) { return c.lock && !ST.chapters[c.id]; }).sort(function (a, b) { return a.lock.chal - b.lock.chal; })[0];
      return nx ? '<div class="lock-hint' + (sel.length >= nx.lock.chal ? ' ok' : '') + '">🔒 剧情锁：以 ≥' + nx.lock.chal + ' 项通关，解锁下一段档案' + (sel.length >= nx.lock.chal ? ' · 当前已满足' : ' · 还差 ' + (nx.lock.chal - sel.length) + ' 项') + '<small>' + econEsc(nx.hint || '') + '</small></div>' : ''; })() +
    '<div class="treebox">';""")
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
css='''
/* DREAM_V1 */
.scene{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;background:rgba(2,3,6,.86);cursor:pointer;z-index:2}
.sc-bar{height:12%;background:#000;display:flex;align-items:center;justify-content:space-between;padding:0 14px}
.sc-bar.top{border-bottom:1px solid rgba(252,238,10,.25)}.sc-bar.bot{border-top:1px solid rgba(252,238,10,.25)}
.sc-hint{font-size:9px;letter-spacing:.3em;color:#5d6b74;animation:neonBuzz 2s infinite}
.sc-skip{font:inherit;font-size:10px;color:#9fb6c2;background:none;border:1px solid #2b3a45;padding:5px 10px}
.sc-stage{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 24px;text-align:left}
.sc-kicker{font-size:8px;letter-spacing:.32em;color:#fcee0a;opacity:.7;margin-bottom:18px}
.sc-who{font-size:11px;letter-spacing:.2em;color:#ff2fa8;margin-bottom:6px}
.sc-line{font-size:16px;line-height:1.8;color:#f2f6fa;min-height:3.6em;text-shadow:0 0 12px rgba(0,0,0,.8)}
.scene.beat .sc-line{animation:scIn .3s ease-out}
@keyframes scIn{from{opacity:.2;transform:translateY(4px)}to{opacity:1;transform:none}}
.scene[data-fx=glitch] .sc-line{text-shadow:3px 0 rgba(255,47,168,.8),-3px 0 rgba(34,230,255,.8);animation:hudGlitch .5s steps(1) 2}
.scene[data-fx=red]{background:radial-gradient(circle,rgba(70,0,14,.85),rgba(4,0,2,.95))}
.scene[data-fx=red] .sc-line{color:#ffd0d6}
.scene[data-fx=flash].beat{animation:scFlash .5s ease-out}
@keyframes scFlash{0%{background:rgba(255,255,255,.7)}100%{background:rgba(2,3,6,.86)}}
.scene[data-fx=static] .sc-stage{background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px);animation:staticMove .2s steps(2) infinite}
@keyframes staticMove{50%{background-position:0 2px}}
.lock-hint{margin:8px 0;padding:7px 9px;text-align:left;font-size:10px;color:#ffb3c0;border:1px dashed rgba(255,77,94,.5);background:rgba(40,8,14,.4)}
.lock-hint small{display:block;color:#9c7a82;margin-top:3px;font-style:italic}
.lock-hint.ok{color:#9dffcb;border-color:rgba(87,255,168,.5);background:rgba(8,40,24,.4)}
.arc.lockch{--ac:#ff4d5e}.arc.lockch b{color:#7a3a46}.arc.lockch p{color:#a4707a}
.bd-btn{border-color:rgba(192,139,255,.6)!important;color:#d6b8ff!important;background:linear-gradient(90deg,rgba(192,139,255,.15),transparent)!important}
.card.dream-shelf{--acc:#c08bff}
.dlist{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.dtape{position:relative;text-align:left;font-family:inherit;color:#eadfff;padding:10px 10px 22px;border:1px solid rgba(192,139,255,.45);border-radius:4px;background:linear-gradient(160deg,#1c1230,#0a0712);min-height:150px}
.dtape .reel{display:block;width:34px;height:34px;border-radius:50%;border:3px double #c08bff;margin-bottom:6px;box-shadow:0 0 10px rgba(192,139,255,.4)}
.dtape:not(.locked):hover .reel,.dtape:not(.locked):active .reel{animation:spinR 1s linear infinite}
@keyframes spinR{to{transform:rotate(360deg)}}
.dtape b{display:block;font-size:12px;color:#fff}.dtape small{display:block;font-size:9px;color:#a88fd0;margin:2px 0}
.dtape em{display:block;font-style:normal;font-size:9px;line-height:1.5;color:#b9aecb}
.dtape span{position:absolute;left:10px;bottom:6px;font-size:8px;letter-spacing:.1em;color:#c08bff}
.dtape.locked{opacity:.45;border-style:dashed}
.card.dream-start{--acc:#c08bff;filter:hue-rotate(-28deg) saturate(1.2);animation:dreamWobble 6s ease-in-out infinite}
@keyframes dreamWobble{0%,100%{transform:none}50%{transform:skewX(-.6deg) translateX(1px)}}
.glitch-title{position:relative;text-shadow:3px 0 rgba(255,47,168,.7),-3px 0 rgba(34,230,255,.7);animation:hudGlitch 2.2s steps(1) infinite}
.dream-who{border-color:#c08bff!important;background:rgba(192,139,255,.1)!important}
.dream-ghost{opacity:.35;filter:blur(.6px);text-decoration:line-through}
.ghost.ro{opacity:.55}
.dream-cfg{text-align:left;font-size:10px;line-height:1.6;color:#d8ccef;border:1px solid rgba(192,139,255,.35);padding:8px 10px;margin:6px 0;background:rgba(20,10,34,.6)}
.dream-cfg ul{margin:4px 0;padding-left:16px}
.kbtn.dreamact{flex-basis:100%;--kc:#c08bff}
'''
s=s.replace('</style>\n</head>',css+'</style>\n</head>'); open(p,'w',encoding='utf8').write(s)
print('dream patch applied')
