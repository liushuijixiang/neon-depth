p='game.js';s=open(p,encoding='utf8').read()
if 'POUR_V1' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
rep("""    '<div class="sub">核心 ' + META.cores + ' · 四系 28 节点</div>' +""","""    '<div class="sub">核心 <b id="metaCores" class="meta-cores">' + META.cores + '</b> · 点住节点向里灌注核心</div>' +""")
rep("""        var can = !maxed && reqOk && META.cores >= cost;
        html += '<button class="cnode' + (reqOk ? '' : ' lock') + '" data-buy="' + u.id + '"' + (can ? '' : ' disabled') + '>' +
          '<b>' + u.name + '</b><em>' + u.desc + '</em>' +
          '<span style="color:#8aa">Lv.' + lv + '/' + u.max + '</span>' +
          '<span class="cost">' + (maxed ? 'MAX' : cost + ' 核心') + '</span></button>';""","""        var poured = (META.pour || {})[u.id] || 0;
        var can = !maxed && reqOk && META.cores > 0;
        html += '<button class="cnode pournode' + (reqOk ? '' : ' lock') + (maxed ? ' maxed' : '') + '" data-buy="' + u.id + '"' + (can ? '' : ' disabled') + '>' +
          '<i class="pour" style="height:' + (maxed ? 100 : Math.round(poured / Math.max(1, cost) * 100)) + '%"></i>' +
          '<b>' + u.name + '</b><em>' + u.desc + '</em>' +
          '<span class="lvpips">' + Array.from({ length: u.max }, function (_, k) { return '<u class="' + (k < lv ? 'on' : '') + '"></u>'; }).join('') + '</span>' +
          '<span class="cost">' + (maxed ? '已满' : poured + ' / ' + cost) + '</span></button>';""")
rep("""  $$('[data-buy]').forEach(function (btn) {
    btn.onclick = function () { G._metaScroll = card ? card.scrollTop : 0; buyMeta(btn.getAttribute('data-buy')); };
  });""","""  // POUR_V1：按住持续灌注，点击灌注一份
  $$('[data-buy]').forEach(function (btn) {
    var id = btn.getAttribute('data-buy'), timer = null, held = false;
    function stop() { if (timer) clearInterval(timer); timer = null; btn.classList.remove('pouring'); }
    btn.addEventListener('pointerdown', function () { if (btn.disabled) return; held = false; btn.classList.add('pouring'); timer = setInterval(function () { held = true; if (pourMeta(id, btn) !== 'more') stop(); }, 120); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { btn.addEventListener(ev, stop); });
    btn.onclick = function () { G._metaScroll = card ? card.scrollTop : 0; if (!held) pourMeta(id, btn); held = false; };
  });""")
rep("function buyMeta(id) {","""function pourMeta(id, btn) {
  var u = META_UP.find(function (x) { return x.id === id; }); if (!u) return 'stop';
  var lv = metaLvl(id); if (lv >= u.max) return 'stop';
  if (u.tier > 1 && !META_UP.some(function (q) { return q.branch === u.branch && q.tier === u.tier - 1 && metaLvl(q.id) > 0; })) { toast('需先解锁同系上一阶', 'bad'); return 'stop'; }
  var cost = metaCost(id); META.pour = META.pour || {};
  var have = META.pour[id] || 0, chunk = Math.max(1, Math.ceil(cost / 6)), give = Math.min(chunk, cost - have, META.cores);
  if (give <= 0) { toast('核心不足', 'bad'); return 'stop'; }
  META.cores -= give; META.pour[id] = have + give; saveMeta();
  beep(300 + (META.pour[id] / cost) * 500, .04, 'triangle', .02);
  var coresEl = $('#metaCores'); if (coresEl) { coresEl.textContent = META.cores; coresEl.classList.remove('drain'); void coresEl.offsetWidth; coresEl.classList.add('drain'); }
  if (btn) {
    var fill = btn.querySelector('.pour'), costEl = btn.querySelector('.cost');
    if (fill) fill.style.height = Math.round(META.pour[id] / cost * 100) + '%';
    if (costEl) costEl.textContent = META.pour[id] + ' / ' + cost;
    var drop = document.createElement('span'); drop.className = 'pdrop'; drop.textContent = '-' + give; btn.appendChild(drop); setTimeout(function () { drop.remove(); }, 600);
  }
  if (META.pour[id] >= cost) {
    META.pour[id] = 0; META.up[id] = lv + 1; saveMeta(); sfx.level();
    if (btn) { btn.classList.add('lvup'); var t = document.createElement('span'); t.className = 'lvtxt'; t.textContent = 'Lv.' + (lv + 1); btn.appendChild(t); }
    setTimeout(function () { showMeta(); }, VFX.reduced ? 0 : 650);
    return 'up';
  }
  return 'more';
}
function buyMeta(id) {""")
# refund includes poured
rep("""    var refund = metaSpent();
    META.cores += refund;
    META.up = {};""","""    var refund = metaSpent();
    META.cores += refund;
    META.up = {}; META.pour = {};""")
rep("function metaSpent() {\n  var total = 0;","function metaSpent() {\n  var total = 0;\n  Object.keys(META.pour || {}).forEach(function (k) { total += META.pour[k] || 0; });")
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
css='''
/* POUR_V1 */
.meta-cores{color:#fcee0a;display:inline-block}.meta-cores.drain{animation:coreDrain .3s ease-out}
@keyframes coreDrain{0%{transform:translateY(-3px);color:#fff;text-shadow:0 0 10px #fcee0a}100%{transform:none}}
.cnode.pournode{position:relative;overflow:hidden;isolation:isolate}
.cnode.pournode .pour{position:absolute;left:0;right:0;bottom:0;height:0;z-index:-1;background:linear-gradient(0deg,rgba(252,238,10,.55),rgba(252,238,10,.12));box-shadow:0 -2px 10px rgba(252,238,10,.5);transition:height .14s ease-out}
.cnode.pournode .pour::before{content:"";position:absolute;left:0;right:0;top:-3px;height:6px;background:repeating-linear-gradient(90deg,rgba(255,250,200,.9) 0 6px,transparent 6px 12px);opacity:.6;animation:pourWave 1s linear infinite}
@keyframes pourWave{to{background-position:12px 0}}
.cnode.pournode.maxed .pour{background:linear-gradient(0deg,rgba(252,238,10,.3),rgba(252,238,10,.08))}
.cnode.pournode.pouring{box-shadow:0 0 16px rgba(252,238,10,.5);transform:scale(.98)}
.lvpips{display:flex;gap:3px;margin-top:4px}.lvpips u{flex:0 0 12px;height:4px;background:rgba(255,255,255,.12);text-decoration:none}.lvpips u.on{background:#fcee0a;box-shadow:0 0 5px #fcee0a}
.pdrop{position:absolute;right:8px;top:6px;font-size:10px;color:#fcee0a;pointer-events:none;animation:pdrop .6s ease-out forwards}
@keyframes pdrop{to{transform:translateY(16px);opacity:0}}
.cnode.lvup{animation:lvFlash .65s ease-out}
@keyframes lvFlash{0%{box-shadow:0 0 0 rgba(252,238,10,0)}30%{box-shadow:0 0 30px rgba(252,238,10,.9),inset 0 0 30px rgba(255,255,255,.5);filter:brightness(1.8)}100%{box-shadow:none}}
.lvtxt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff;text-shadow:0 0 14px #fcee0a,2px 0 #ff2fa8,-2px 0 #22e6ff;animation:lvTxt .65s ease-out forwards;pointer-events:none}
@keyframes lvTxt{0%{transform:scale(1.8);opacity:0}30%{transform:scale(1);opacity:1}100%{opacity:0;transform:translateY(-10px)}}
/* 挑战树：按难度不同的选中效果 */
.tier-sel-1{box-shadow:0 0 8px rgba(87,255,168,.5)!important;border-color:#57ffa8!important}
.tier-sel-2{box-shadow:0 0 12px rgba(34,230,255,.6)!important;border-color:#22e6ff!important}
.tier-sel-3{box-shadow:0 0 14px rgba(192,139,255,.7)!important;border-color:#c08bff!important;animation:selPulse 2s ease-in-out infinite}
.tier-sel-4{box-shadow:0 0 18px rgba(255,179,71,.75)!important;border-color:#ffb347!important;animation:selPulse 1.4s ease-in-out infinite}
.tier-sel-5{box-shadow:0 0 22px rgba(255,77,94,.85),inset 0 0 14px rgba(255,77,94,.35)!important;border-color:#ff4d5e!important;animation:selPulse .9s ease-in-out infinite,hudGlitch 2.4s steps(1) infinite}
@keyframes selPulse{50%{filter:brightness(1.35)}}
.chal-pop{position:absolute;inset:0;pointer-events:none;border:2px solid currentColor;animation:chalPop .5s ease-out forwards}
@keyframes chalPop{from{transform:scale(1);opacity:1}to{transform:scale(1.25);opacity:0}}
@media(prefers-reduced-motion:reduce){.tier-sel-3,.tier-sel-4,.tier-sel-5,.cnode.pournode .pour::before{animation:none}}
'''
s=s.replace('</style>\n</head>',css+'</style>\n</head>'); open(p,'w',encoding='utf8').write(s)
print('pour patch applied')
