p='game.js';s=open(p,encoding='utf8').read()
if 'SAVE_V1' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
mod=open('tools/save-module.js',encoding='utf8').read()
anchor="/* =========================================================\n   启动"
rep(anchor,mod+"\n\n"+anchor)
i=s.index("function endTurn() {"); j=s.index("  G.turn++;\n  afterAction();",i)
s=s[:j]+"  G.turn++;\n  afterAction();\n  saveRun();"+s[j+len("  G.turn++;\n  afterAction();"):]
rep("  econFloorStart();\n","  econFloorStart();\n  saveRun(true);\n")
rep("""function lose() {
  if (G.state !== 'play') return;""","""function lose() {
  if (G.state !== 'play') return;
  if (!G.rebirthArmed && G.mode === 'normal') clearRun();""")
rep("""function win() {
  if (G.state !== 'play') return;""","""function win() {
  if (G.state !== 'play') return;
  if (G.mode === 'normal') clearRun();""")
rep("""    if (!rr.classList.contains('confirm')) { rr.classList.add('confirm'); rr.textContent = '再次点击 · 放弃本次深潜'; return; }
    hideOverlay(); menuScreen();
  };""","""    if (!rr.classList.contains('confirm')) { rr.classList.add('confirm'); rr.textContent = '再次点击 · 放弃本次深潜（存档会删除）'; return; }
    clearRun(); hideOverlay(); menuScreen();
  };
  var sq = $('#saveQuit'); if (sq) sq.onclick = function () { saveRun(true); hideOverlay(); toast('已保存 · 可从主界面继续', 'good'); menuScreen(); };""")
rep("""    (G.mode === 'train' ? '' : '<button class="ghost" id="restartRun">放弃本次深潜</button>') +""","""    (G.mode === 'normal' ? '<button class="ghost" id="saveQuit" style="border-color:rgba(87,255,168,.45);color:#9dffcb">保存并回到主界面</button>' : '') +
    (G.mode === 'train' ? '' : '<button class="ghost" id="restartRun">放弃本次深潜</button>') +""")
# main menu: continue button & overwrite confirm
rep("""    '<button id="actionBtn" class="cta">' + cls.name + ' · 开始潜入</button>' +""","""    (savedRun() ? '<button id="continueBtn" class="cta continue">继续深潜<small>' + saveSummary(savedRun()) + '</small></button>' : '') +
    '<button id="actionBtn" class="' + (savedRun() ? 'ghost' : 'cta') + '">' + cls.name + ' · ' + (savedRun() ? '新的深潜' : '开始潜入') + '</button>' +""")
rep("""  $('#actionBtn').onclick = function () { prepScreen(); };""","""  $('#actionBtn').onclick = function () {
    var ab = $('#actionBtn');
    if (savedRun() && !ab.classList.contains('confirm')) { ab.classList.add('confirm'); ab.textContent = '再次点击 · 开新档会覆盖当前存档'; return; }
    clearRun(); prepScreen();
  };
  var cb = $('#continueBtn'); if (cb) cb.onclick = function () { if (!loadRun()) { toast('存档损坏，无法读取', 'bad'); clearRun(); menuScreen(); } };""")
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
s=s.replace('</style>\n</head>','''.cta.continue{border-color:#57ffa8;color:#eafff3;background:linear-gradient(180deg,rgba(87,255,168,.22),rgba(87,255,168,.04));box-shadow:0 0 18px rgba(87,255,168,.25)}
.cta.continue small{display:block;font-size:9px;letter-spacing:.1em;color:#9dffcb;margin-top:2px}
#actionBtn.confirm{border-color:rgba(255,77,94,.7);color:#ff9aa5}
</style>
</head>''')
open(p,'w',encoding='utf8').write(s)
print('save patch applied')
