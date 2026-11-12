p='game.js';s=open(p,encoding='utf8').read()
if 'WORKSHOP_V19' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
# --- armory ---
i=s.index("function renderGun() {"); j=s.index("function buyGunUp(id) {",i)
s=s[:i]+"""// WORKSHOP_V19
function shopCard(o) {
  var pips = ''; for (var k = 0; k < o.max; k++) pips += '<u class="' + (k < o.lv ? 'on' : '') + '"></u>';
  return '<button class="ws-card' + (o.maxed ? ' maxed' : '') + (o.can ? ' can' : '') + '" ' + o.attr + (o.can ? '' : ' disabled') + ' style="--wc:' + o.color + '">' +
    '<i class="ws-ico">' + o.icon + '</i><b>' + o.name + '</b><em>' + o.desc + '</em>' + (o.max > 1 ? '<span class="lvpips">' + pips + '</span>' : '') +
    '<span class="ws-cost">' + (o.maxed ? (o.doneText || '已满') : o.cost) + '</span></button>';
}
var GUN_ICON = { mag: '匣', dmg: '管', cool: '冷', quick: '装', pierce: '穿', double: '双', overheat: '热', overclock: '频' };
function renderGun() {
  var html = '<div class="card ws gunws"><div class="kicker">ARMORY // 军械库</div><h1 class="title small">枪械改造</h1>' +
    '<div class="ws-res"><div><small>能量</small><b>' + G.energy + '</b><span>/' + G.energyMax + '</span></div><div><small>弹匣</small><b>' + G.ammo + '</b><span>/' + G.ammoMax + '</span></div><div><small>弹种</small><b class="sm">' + (G.magSpecial ? SPECIALS[G.magSpecial].name : '普通弹') + '</b></div><div><small>换弹</small><b>' + reloadTurns() + '</b><span>回合</span></div></div>' +
    '<div class="ws-grid">';
  GUN_UPS.forEach(function (u) {
    var lv = gunLvl(u.id), maxed = lv >= u.max, cost = Array.isArray(u.cost) ? u.cost[lv] : u.cost;
    html += shopCard({ name: u.name, desc: u.desc, icon: GUN_ICON[u.id] || '改', lv: lv, max: u.max, maxed: maxed, can: !maxed && G.energy >= cost, cost: cost + ' 能量', color: '#ff5c7a', attr: 'data-gunup="' + u.id + '"' });
  });
  html += '</div><div class="hint">击杀 +2 能量（精英 +4）。换弹要 1 件消耗品和能量，消耗品决定下一匣的弹种。</div><div class="dock"><button class="cta" id="gunClose">关闭</button></div></div>';
  overlay.innerHTML = html;
  $$('[data-gunup]').forEach(function (btn) {
    btn.addEventListener('click', function (ev) { ev.preventDefault(); btn.classList.add('bought'); buyGunUp(btn.getAttribute('data-gunup')); });
  });
  $('#gunClose').onclick = function () { hideOverlay(); };
}
"""+s[j:]
# --- workbench ---
i=s.index("function openBuild() {"); j=s.index("// 机甲维持费",i)
s=s[:i]+"""var BUILD_ICON = { turret: '塔', wall: '墙', drone: '机', mech: '甲', nuke: '核', mine: '雷', medbay: '医' };
function openBuild() {
  if (classDef().id !== 'engineer' || G.state !== 'play' || G.paused || G.busy) return;
  showModal('build');
  var html = '<div class="card ws buildws"><div class="kicker">WORKBENCH // 工程台</div><h1 class="title small">建造</h1>' +
    '<div class="ws-res"><div><small>废料</small><b>' + G.scrap + '</b></div><div><small>机甲</small><b class="sm">' + (!G.mechBuilt ? '未建造' : G.mech > 0 ? '驾驶中' : G.mechCool ? '冷却 ' + G.mechCool : '待机') + '</b></div><div><small>维持费</small><b>' + (G.mechBuilt ? mechUpkeep() : '—') + '</b><span>/回合</span></div><div><small>改装</small><b>' + (G.mechMods || []).length + '</b><span>/3</span></div></div>';
  html += '<div class="loot-h">装置</div><div class="ws-grid">';
  BUILDS.forEach(function (b2) {
    var on = b2.id === 'mech' && G.mechBuilt;
    html += shopCard({ name: b2.name, desc: on ? '已建造 · 驾驶时每回合消耗废料，越久越贵' : b2.id === 'nuke' ? '视野内全部敌人受到 ' + nukeDamage() + ' 伤害' : b2.desc, icon: BUILD_ICON[b2.id] || '造', lv: 0, max: 1, maxed: on, doneText: '运行中', can: !on && G.scrap >= b2.cost, cost: b2.cost + ' 废料', color: '#ffd166', attr: 'data-buildid="' + b2.id + '"' });
  });
  html += '</div>';
  if (G.mechBuilt) {
    html += '<div class="loot-h">机甲改装（每个改装让维持费 +1）</div><div class="ws-grid">';
    MODULES.forEach(function (m) { var on = mechHas(m.id);
      html += shopCard({ name: m.name, desc: m.desc, icon: '改', lv: on ? 1 : 0, max: 1, maxed: on, doneText: '已加装', can: !on && G.mechMods.length < 3 && G.scrap >= m.cost, cost: m.cost + ' 废料', color: '#22e6ff', attr: 'data-mod="' + m.id + '"' }); });
    html += '</div>';
  }
  html += '<div class="dock"><button class="cta" id="buildClose">关闭</button></div></div>';
  overlay.innerHTML = html;
  $$('[data-buildid]').forEach(function (btn) { btn.addEventListener('click', function (ev) { ev.preventDefault(); buildItem(btn.getAttribute('data-buildid')); }); });
  $$('[data-mod]').forEach(function (btn) { btn.addEventListener('click', function (ev) { ev.preventDefault(); installModule(btn.getAttribute('data-mod')); }); });
  $('#buildClose').onclick = function () { hideOverlay(); };
}
"""+s[j:]
# --- ghost non-hack buttons as kbtn ---
i=s.index("      html += '<button class=\"abtn\" data-ghost=\"' + a.k + '\" style=\"border-")
j=s.index("\n",i)
s=s[:i]+"""      var gcol = killMark ? '#ff4d5e' : a.k === 'stealth' || a.k === 'vanish' ? '#9b5cff' : a.k === 'execute' ? '#ff365c' : '#d3b6ff';
      var gsub = killMark ? '可斩杀 · 临界 +' + a.cost : (a.k === 'assassinate' ? (ghostHidden() ? '隐身中 · ' : '需隐身或标记 · ') : a.k === 'execute' ? '需标记 · ' : '') + '临界 +' + a.cost;
      var gdis = (a.k === 'assassinate' || a.k === 'execute') && !ghostTarget(a.k);
      html += kbtn('', a.n, gsub, gcol, gdis, '', killMark ? 'busy' : '').replace('data-act=""', 'data-ghost="' + a.k + '"');"""+s[j:]
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
css='''
/* WORKSHOP_V19 */
.ws-res{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin:8px 0}
.ws-res div{border:1px solid rgba(120,160,190,.22);background:rgba(8,14,22,.7);padding:5px 4px;text-align:center;min-width:0}
.ws-res small{display:block;font-size:8px;color:#6f8a99;letter-spacing:.1em}.ws-res b{font-size:16px;color:#fff}.ws-res b.sm{font-size:10px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ws-res span{font-size:9px;color:#6f8a99}
.ws-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.ws-card{--wc:#22e6ff;position:relative;font-family:inherit;text-align:left;padding:8px 8px 26px 38px;min-height:84px;color:#eaf6ff;cursor:pointer;
  border:1px solid color-mix(in srgb,var(--wc) 40%,transparent);border-bottom-width:3px;border-radius:4px;background:linear-gradient(160deg,color-mix(in srgb,var(--wc) 10%,#0b1520),#070c14);transition:transform .06s,filter .1s}
.ws-card .ws-ico{position:absolute;left:7px;top:8px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:12px;font-weight:700;color:var(--wc);border:1px solid var(--wc);transform:rotate(45deg)}
.ws-card .ws-ico{writing-mode:horizontal-tb}.ws-card .ws-ico::first-letter{}
.ws-card b{display:block;font-size:12px;color:var(--wc)}.ws-card em{display:block;font-style:normal;font-size:9px;line-height:1.45;color:#a9c3d1;margin-top:2px}
.ws-card .ws-cost{position:absolute;left:38px;right:8px;bottom:6px;font-size:10px;color:#ffd166}
.ws-card .lvpips{margin-top:4px}
.ws-card.can{box-shadow:0 0 10px color-mix(in srgb,var(--wc) 30%,transparent)}
.ws-card.can:active{transform:translateY(2px);border-bottom-width:1px;filter:brightness(1.4)}
.ws-card:disabled{filter:grayscale(.7) brightness(.6);cursor:default}
.ws-card.maxed{filter:none;border-style:solid;opacity:.75}.ws-card.maxed .ws-cost{color:#57ffa8}
.ws-card.bought{animation:lvFlash .5s ease-out}
'''
s=s.replace('</style>\n</head>',css+'</style>\n</head>'); open(p,'w',encoding='utf8').write(s)
print('ui19b applied')
