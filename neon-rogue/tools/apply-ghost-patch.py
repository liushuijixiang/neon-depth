p='game.js';s=open(p,encoding='utf8').read()
if 'GHOST_HACK_V1' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
rep("""var GHOST_ACTS = {
  low: [{ k: 'stealth', n: '潜行', cost: 6 }, { k: 'mark', n: '猎杀标记', cost: 4 }, { k: 'chase', n: '追杀', cost: 8 }],
  mid: [{ k: 'assassinate', n: '刺杀', cost: 10 }, { k: 'chase', n: '追杀', cost: 8 }, { k: 'vanish', n: '隐匿', cost: 6 }],
  high: [{ k: 'execute', n: '处刑', cost: 12 }, { k: 'blood', n: '血刃', cost: 8 }, { k: 'vanish', n: '隐匿', cost: 6 }]
};""","""// GHOST_HACK_V1：潜行 / 背刺 / 处刑 / 隐匿 + 黑客能力（每次骇客动作给目标叠 1 层标记）
var GHOST_ACTS = {
  low: [{ k: 'stealth', n: '潜行', cost: 6 }, { k: 'assassinate', n: '背刺', cost: 10 }, { k: 'overheat', n: '过热', cost: 5, hack: 1 }],
  mid: [{ k: 'assassinate', n: '背刺', cost: 10 }, { k: 'disarm', n: '缴械', cost: 6, hack: 1 }, { k: 'overheat', n: '过热', cost: 5, hack: 1 }, { k: 'vanish', n: '隐匿', cost: 6 }],
  high: [{ k: 'execute', n: '处刑', cost: 12 }, { k: 'frenzy', n: '赛博精神病', cost: 10, hack: 1 }, { k: 'hijack', n: '骇入', cost: 14, hack: 1 }, { k: 'vanish', n: '隐匿', cost: 6 }]
};
var HACK_INFO = {
  overheat: '目标过热，4 回合内每回合受到 0.6×攻击 伤害',
  disarm: '目标 3 回合无法攻击（守卫 1 回合）',
  frenzy: '目标 4 回合内攻击身边的一切（守卫无效）',
  hijack: '控制非守卫目标 12 回合；存活期间临界不会低于 20/个'
};
function hackFloor() { return (G.allies || []).filter(function (a) { return a.kind === 'hacked' && a.turns > 0; }).length * 20; }
function clampHackFloor() { if (classDef().id === 'ghost' && !G.burnout) G.instab = Math.max(G.instab, Math.min(95, hackFloor())); }
function ghostHackAct(k, target, action) {
  target.marked = true; target.marks = Math.min(5, (target.marks || 0) + 1); target.markFx = performance.now();
  var col = k === 'overheat' ? '#ff7a45' : k === 'disarm' ? '#9fe9ff' : k === 'frenzy' ? '#ff365c' : '#57ffa8';
  G.beams.push({ x0: p.x + .5, y0: p.y + .5, x1: target.x + .5, y1: target.y + .5, life: 380, max: 380, color: col });
  nvSpawn(target.x, target.y, col, 14, { kind: 'bit', speed: 1.4, rise: .6 });
  if (k === 'overheat') { target.igniteT = 4; target.igniteDmg = Math.max(2, Math.round(effAtk() * .6)); float(target.x, target.y, '过热', col, true); }
  else if (k === 'disarm') { target.disarmT = target.boss ? 1 : 3; target.intent = null; float(target.x, target.y, '缴械', col, true); }
  else if (k === 'frenzy') { if (target.boss) { float(target.x, target.y, '防火墙拦截', '#8aa'); } else { target.frenzyT = 4; target.intent = null; float(target.x, target.y, '赛博精神病', col, true); } }
  else if (k === 'hijack') {
    var i = G.enemies.indexOf(target); if (i >= 0) G.enemies.splice(i, 1);
    G.allies.push({ kind: 'hacked', name: target.name, x: target.x, y: target.y, atk: Math.max(2, target.atk), turns: 12, color: col, glyph: target.glyph, hijack: true });
    float(target.x, target.y, '骇入 · 已控制', col, true); msg('骇入「' + target.name + '」· 控制 12 回合', 'good');
  }
  msg(action.n + ' · ' + target.name, 'sys');
}
function enemyHackTick(e, dist) {
  if (e.disarmT > 0) { e.disarmT--; e.intent = null; e.brain.stance = '缴械'; if (cyberDistance(e, p) > 1) stepToward(e, dist); return true; }
  if (e.frenzyT > 0) {
    e.frenzyT--; e.intent = null; e.brain.stance = '失控';
    var near = G.enemies.filter(function (o) { return o !== e && o.hp > 0 && Math.max(Math.abs(o.x - e.x), Math.abs(o.y - e.y)) <= 6; })
      .sort(function (a, b) { return Math.max(Math.abs(a.x - e.x), Math.abs(a.y - e.y)) - Math.max(Math.abs(b.x - e.x), Math.abs(b.y - e.y)); })[0];
    if (near && Math.max(Math.abs(near.x - e.x), Math.abs(near.y - e.y)) <= 1) {
      var d = damageEnemy(near, Math.max(1, Math.round(e.atk * 1.4))); float(near.x, near.y, '-' + d, '#ff365c'); nvSpawn(near.x, near.y, '#ff365c', 8);
      if (near.hp <= 0) killEnemy(near);
    } else if (near) { var sx0 = Math.sign(near.x - e.x), sy0 = Math.sign(near.y - e.y), nx = e.x + sx0, ny = e.y + sy0; if (G.map[ny] && G.map[ny][nx] !== WALL && !occupied(nx, ny)) { e.x = nx; e.y = ny; } }
    else if (cyberDistance(e, p) <= 1) enemyMelee(e);
    return true;
  }
  return false;
}
""")
rep("  var ranges = { mark: 6, chase: 4, assassinate: 3, execute: 4, blood: 2 };","  var ranges = { mark: 6, chase: 4, assassinate: 3, execute: 4, blood: 2, overheat: 6, disarm: 5, frenzy: 5, hijack: 4 };")
rep("    if (k === 'assassinate' && !(ghostHidden() || e.marked)) return false;","    if (k === 'assassinate' && !(ghostHidden() || e.marked)) return false;\n    if (k === 'hijack' && (e.boss || e.structure)) return false;\n    if ((k === 'frenzy' || k === 'hijack') && e.frenzyT > 0) return false;")
rep("""  var raw = target ? ghostRawDamage(k,target) : 0;
  var chromeFxOrigin = { x: p.x, y: p.y, face: p.face };
  addInstab(action.cost);""","""  var raw = target ? ghostRawDamage(k,target) : 0;
  var chromeFxOrigin = { x: p.x, y: p.y, face: p.face };
  addInstab(action.cost);
  if (action.hack) { ghostHackAct(k, target, action); clampHackFloor(); computeFOV(); updateHUD(); endTurn(); return; }""")
rep("    if (!target) { msg(k === 'execute' ? '四格内没有可见的标记目标' : k === 'assassinate' ? '三格内需要隐身或已标记目标' : '射程内没有可见目标', 'dim'); return; }",
    "    if (!target) { msg(k === 'execute' ? '四格内没有已标记的目标（骇客能力会叠加标记）' : k === 'assassinate' ? '背刺：三格内需要处于隐身，或目标已被标记' : k === 'hijack' ? '四格内没有可骇入的普通敌人' : '射程内没有可见目标', 'dim'); return; }")
rep("  if(e.stun>0){e.stun--;e.intent=null;e.phaseT=0;e.brain.stance='神经中断';return;}","  if(e.stun>0){e.stun--;e.intent=null;e.phaseT=0;e.brain.stance='神经中断';return;}\n  if((e.disarmT>0||e.frenzyT>0)&&enemyHackTick(e,dist))return;")
rep("  tickReload();\n","  tickReload();\n  clampHackFloor();\n")
rep("""      html += '<button class="abtn" data-ghost="' + a.k + '" style=\"""","""      if (a.hack) { var hcol = a.k === 'overheat' ? '#ff7a45' : a.k === 'disarm' ? '#9fe9ff' : a.k === 'frenzy' ? '#ff365c' : '#57ffa8'; html += kbtn('', a.n, '骇客 · 临界 +' + a.cost, hcol, !ghostTarget(a.k)).replace('data-act=""', 'data-ghost="' + a.k + '"'); return; }
      html += '<button class="abtn" data-ghost="' + a.k + '" style=\"""")
# hacked allies expire visibly
rep("    if (a.kind === 'hacked') {","    if (a.kind === 'hacked' && a.hijack && a.turns <= 0) { float(a.x, a.y, '骇入断开', '#57ffa8'); nvSpawn(a.x, a.y, '#57ffa8', 12); return; }\n    if (a.kind === 'hacked') {")
open(p,'w',encoding='utf8').write(s)
print('ghost patch applied')
