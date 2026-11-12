p='game.js';s=open(p,encoding='utf8').read()
if 'V21 · 芯片图标' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
mod=open('tools/v21-module.js',encoding='utf8').read()
anchor="/* =========================================================\n   启动"
rep(anchor,mod+"\n\n"+anchor)
rep("  var tabs = [['cyber', '义体'], ['chip', '芯片'], ['ticket', '制式券'], ['stash', '仓库']];","  var tabs = [['cyber', '义体'], ['chip', '芯片'], ['forge', '强化'], ['ticket', '制式券'], ['stash', '仓库']];")
rep("""  var html = '<div class="card cyberpanel" style="max-height:100%;overflow:auto"><div class="kicker" style="color:#fcee0a;letter-spacing:.2em">BLACK MARKET</div>' +""","""  if (mk.tab === 'forge' || mk.tab === 'stash') { renderMarketV21(); return; }
  var html = '<div class="card cyberpanel" style="max-height:100%;overflow:auto"><div class="kicker" style="color:#fcee0a;letter-spacing:.2em">BLACK MARKET</div>' +""")
# lock in stash detail
rep("""    (isStash ? '<button class="cta" id="mSell" data-sell="' + m.id + '" style="margin-top:0">出售 · ' + Math.round(cyberPrice(m) * 0.5) + ' 核心</button>' :""","""    (isStash ? '<button class="ghost" id="mLock" style="margin-top:0;flex:0 0 28%">' + ((findStashCyber(m.id) || {}).locked ? '解锁' : '锁定') + '</button><button class="cta" id="mSell" data-sell="' + m.id + '" style="margin-top:0"' + ((findStashCyber(m.id) || {}).locked ? ' disabled' : '') + '>出售 · ' + Math.round(cyberPrice(m) * 0.5) + ' 核心</button>' :""")
rep("    if (sl) sl.onclick = function () {","    var lk = $('#mLock'); if (lk) lk.onclick = function () { var x = findStashCyber(mk.item); if (x) { x.locked = !x.locked; saveMeta(); renderMarket(); } };\n    if (sl) sl.onclick = function () {\n      if ((findStashCyber(mk.item) || {}).locked) return;")
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
css='''
/* V21 */
.chip-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(62px,1fr));gap:6px;margin:6px 0}
.chipico{--cq:#9fe9ff;position:relative;font-family:inherit;height:70px;padding:0;color:#fff;cursor:pointer;border:1px solid var(--cq);border-radius:6px;
  background:radial-gradient(circle at 50% 38%,color-mix(in srgb,var(--cq) 35%,#0b1220) 0,#080c14 70%);box-shadow:inset 0 0 12px color-mix(in srgb,var(--cq) 30%,transparent),0 0 6px color-mix(in srgb,var(--cq) 25%,transparent);overflow:hidden}
.chipico .pins{position:absolute;inset:6px 3px;background:repeating-linear-gradient(90deg,var(--cq) 0 2px,transparent 2px 7px) top/100% 3px no-repeat,repeating-linear-gradient(90deg,var(--cq) 0 2px,transparent 2px 7px) bottom/100% 3px no-repeat;opacity:.55}
.chipico b{position:absolute;left:50%;top:13px;transform:translateX(-50%);width:26px;height:26px;line-height:24px;font-size:13px;border:1px solid var(--cq);background:#060a10;color:var(--cq);text-shadow:0 0 6px var(--cq);clip-path:polygon(25% 0,75% 0,100% 25%,100% 75%,75% 100%,25% 100%,0 75%,0 25%)}
.chipico span{position:absolute;left:0;right:0;bottom:13px;font-size:10px;font-weight:600;text-align:center}
.chipico em{position:absolute;left:0;right:0;bottom:6px;display:flex;justify-content:center;gap:3px}.chipico em u{width:5px;height:5px;border-radius:50%;display:block}
.chipico s{position:absolute;right:2px;top:2px;font-size:8px;text-decoration:none;background:#fcee0a;color:#05070d;padding:0 2px}
.chipico small{position:absolute;left:2px;top:2px;font-size:7px;color:#9fe9ff}
.chipico.heavy{border-style:dashed}.chipico.on{outline:2px solid #fff}.chipico:active{transform:scale(.95)}
.sockets{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0;padding:8px;border:1px solid rgba(120,160,190,.2);background:repeating-linear-gradient(45deg,rgba(255,255,255,.015) 0 6px,transparent 6px 12px),#070c14}
.sock{width:66px}.sock .chipico{width:100%}
.sock.empty{height:70px;border:1px dashed rgba(159,233,255,.35);border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#5f7a88}
.sock.empty i{width:22px;height:22px;border:1px dashed rgba(159,233,255,.5);clip-path:polygon(25% 0,75% 0,100% 25%,100% 75%,75% 100%,25% 100%,0 75%,0 25%);background:rgba(159,233,255,.06)}
.sock.empty small{font-size:8px;margin-top:4px}
.fbar{display:grid;gap:4px;margin:6px 0}.fpills{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}
.fpill{--pc:#9fe9ff;flex:0 0 auto;font-family:inherit;font-size:10px;padding:4px 9px;color:var(--pc);background:#0a1220;border:1px solid color-mix(in srgb,var(--pc) 35%,transparent);border-radius:99px}
.fpill.on{background:color-mix(in srgb,var(--pc) 22%,#0a1220);border-color:var(--pc);color:#fff;box-shadow:0 0 6px color-mix(in srgb,var(--pc) 40%,transparent)}
.subtabs{display:flex;gap:4px;margin:6px 0}.subtabs button{flex:1;font-family:inherit;font-size:11px;padding:7px;color:#8fb6cc;background:#0a1220;border:1px solid rgba(120,160,190,.25)}.subtabs button.on{color:#fcee0a;border-color:#fcee0a;background:rgba(252,238,10,.08)}
.scy-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.scy{position:relative;font-family:inherit;text-align:left;padding:8px 8px 18px;color:#eaf6ff;border:1px solid color-mix(in srgb,var(--it) 45%,transparent);border-left:3px solid var(--it);background:linear-gradient(150deg,color-mix(in srgb,var(--it) 10%,#0a1018),#070b12);min-width:0}
.scy b{display:block;font-size:11px;color:var(--it);padding-right:22px}.scy b i{font-style:normal;color:#fcee0a}.scy small{display:block;font-size:8px;color:#8aa0ad}
.scy .slot{position:absolute;right:5px;top:5px;font-size:8px;color:#8aa0ad}.scy s{position:absolute;right:5px;top:17px;font-size:8px;text-decoration:none;background:#fcee0a;color:#05070d;padding:0 3px}
.scy .msock{position:absolute;left:8px;bottom:6px;display:flex;gap:3px}.scy .msock u{width:9px;height:9px;display:block;border:1px solid rgba(159,233,255,.4);transform:rotate(45deg)}
.scy.locked{box-shadow:inset 0 0 0 1px rgba(252,238,10,.4)}
.bulk{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:10px 0 4px;padding:8px;border:1px solid rgba(255,77,94,.3);background:rgba(30,8,12,.4)}
.bulk>span{font-size:10px;color:#ff9aa5}.sellall{flex:1 1 100%;font-family:inherit;font-size:11px;padding:7px;color:#ff9aa5;background:#140a0e;border:1px solid rgba(255,77,94,.5)}.sellall.arm{color:#fff;background:#5a1420;border-color:#ff4d5e;animation:critChip .8s infinite}.sellall:disabled{opacity:.4}
.card.chipd{--acc:var(--fq)}.cd-acts{display:flex;gap:6px;flex-wrap:wrap}.cd-acts button{flex:1;margin-top:0}
'''
s=s.replace('</style>\n</head>',css+'</style>\n</head>'); open(p,'w',encoding='utf8').write(s)
print('v21 applied')
