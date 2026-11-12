p='game.js';s=open(p,encoding='utf8').read()
if 'RELIC_V2' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
mod=open('tools/relic2-module.js',encoding='utf8').read()
anchor="/* =========================================================\n   启动"
rep(anchor,mod+"\n\n"+anchor)
rep("""  var vis = G.enemies.filter(function (e) { return e.hp > 0 && G.vis[e.y] && G.vis[e.y][e.x]; });
  NV.glitch = 1; nvPunch(1.6); G.flash = 1; G.shake = 12; nvColumn(p.x, p.y, '#fcee0a', 7);""","""  var vis = G.enemies.filter(function (e) { return e.hp > 0 && G.vis[e.y] && G.vis[e.y][e.x]; });
  var pw = relicPower(once, id, vis);
  if (pw === false) { G.relicUsed[id] = false; msg('现在用不了：附近没有合适的目标', 'dim'); return; }
  NV.glitch = 1; nvPunch(1.6); G.flash = 1; G.shake = 12; nvColumn(p.x, p.y, '#fcee0a', 7);
  if (pw === true) { toast('遗物 · ' + m.active.name, 'good'); msg('「' + m.name + '」' + RELIC_ONCE[once], 'warn'); G.cyberCd[id] = 0; computeFOV(); updateHUD(); endTurn(); return; }""")
# hurtPlayer hooks
rep("""  if (!(options && options.neural) && Math.random() < dodge) { float(p.x, p.y, 'MISS', C.cyan); return 0; }
  var dmg = Math.max(1, Math.round(raw));""","""  if (G.ghostRunT > 0) { float(p.x, p.y, '穿过', '#c08bff'); return 0; }
  if (G.decoyT > 0 && Math.random() < .6) { float(p.x, p.y, '打中分身', '#c08bff'); return 0; }
  if (!(options && options.neural) && Math.random() < dodge) { float(p.x, p.y, 'MISS', C.cyan); return 0; }
  var dmg = Math.max(1, Math.round(raw));
  if (G.mirrorT > 0 && src && src.hp > 0 && src.maxHp) { var rd = damageEnemy(src, dmg); float(src.x, src.y, '反弹 -' + rd, '#ffb347', true); if (src.hp <= 0) setTimeout(function () { if (src.hp <= 0 && G.enemies.indexOf(src) >= 0) killEnemy(src); }, 0); }""")
rep("""  if (dmg <= 0) return 0;
  p.hp -= dmg;""","""  if (dmg <= 0) return 0;
  if (G.lastDayT > 0 && p.hp - dmg < 1) dmg = Math.max(0, p.hp - 1);
  p.hp -= dmg;""")
# playerHit blood multiplier
rep("""  var calculation = Object.assign({}, opts);
  if (calculation.critRoll == null) calculation.critRoll = Math.random();""","""  var calculation = Object.assign({}, opts);
  if (G.bloodHits > 0 && opts.source !== 'relic' && opts.source !== 'merc') { raw *= 3; G.bloodHits--; float(p.x, p.y, '醉刀 ×3', '#ff365c'); }
  if (calculation.critRoll == null) calculation.critRoll = Math.random();""")
# ghostrun walk through walls
rep("""    if (G.map[ny][nx] === WALL) {
      if (classDef().id === 'ghost'""","""    if (G.map[ny][nx] === WALL && G.ghostRunT > 0 && !enemyAt(nx, ny)) { p.x = nx; p.y = ny; computeFOV(); endTurn(); return; }
    if (G.map[ny][nx] === WALL) {
      if (classDef().id === 'ghost'""")
rep("  tickReload();\n","  tickReload();\n  relicTick();\n")
# decoy ally: passive, drawn as silhouette
rep("    if (a.kind === 'merc') { mercAct(a); return; }","    if (a.kind === 'merc') { mercAct(a); return; }\n    if (a.kind === 'decoy') return;")
rep("if(a.kind==='merc'){","if(a.kind==='decoy'){chromeFxSilhouette(x,y,tile,p.face||0,'#c08bff',.5);return;}if(a.kind==='merc'){")
# floorOnly allies leave
rep("  var keepDrones = G.allies.filter(function (a) { return a.kind === 'drone'; });","  var keepDrones = G.allies.filter(function (a) { return a.kind === 'drone'; });")
rep("  G.npcSeen = []; G.evSeen = []; G.swapQueue = [];","  G.npcSeen = []; G.evSeen = []; G.swapQueue = []; G.decoyT = 0; G.mirrorT = 0; G.ghostRunT = 0; G.jukeT = 0; G.lastDayT = 0; G.bloodHits = 0; G.hist = [];")
open(p,'w',encoding='utf8').write(s)
print('relic2 applied')
