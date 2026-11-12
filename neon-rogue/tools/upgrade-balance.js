const fs=require('fs'), acorn=require('/root/workspace/neon-tooling/node_modules/acorn');
const file=require('path').join(__dirname,'../game.js');
let s=fs.readFileSync(file,'utf8');
function rep(a,b){if(!s.includes(a))throw Error('missing '+a.slice(0,100));s=s.replace(a,b);}
function fn(name,text){const a=acorn.parse(s,{ecmaVersion:'latest'}).body[0].expression.callee.body.body.filter(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(a.length!==1)throw Error('function '+name+' count '+a.length);s=s.slice(0,a[0].start)+text+s.slice(a[0].end);}
rep('born: Date.now(), color: prof.color','born: performance.now(), color: prof.color');
rep("    if (target.phaseT > 0) dmg = Math.round(dmg * 0.15);\n    if (target.armorT > 0) dmg = Math.round(dmg * 0.45);\n    else if (target.guard > 0 && target.hp > target.maxHp * target.guardAt) dmg = Math.round(dmg * target.guard);\n",'');
// Route attack effects through the same mitigation path. Enemy DOT intentionally remains true damage.
const excluded=new Set(['damageEnemy','enemyAct','tickMines','bossAct','spawnEnemy','spawnBoss']);
let ast=acorn.parse(s,{ecmaVersion:'latest'}), changes=[];
for(const f of ast.body[0].expression.callee.body.body){if(f.type!=='FunctionDeclaration'||excluded.has(f.id.name))continue;
 function walk(n){if(!n||typeof n!=='object')return;
 if(n.type==='AssignmentExpression'&&n.operator==='-='&&n.left.type==='MemberExpression'&&!n.left.computed&&n.left.property.name==='hp'&&n.left.object.type==='Identifier'&&['e','en','o','he','target','second','src','t','ct','at','et','bt'].includes(n.left.object.name)){
 const obj=n.left.object.name, rhs=s.slice(n.right.start,n.right.end);changes.push({start:n.start,end:n.end,text:(n.right.type==='Identifier'?rhs+' = ':'')+'damageEnemy('+obj+', '+rhs+')'});return;}
 for(const [k,v]of Object.entries(n)){if(k==='start'||k==='end')continue;if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}}
 walk(f.body);
}
for(const c of changes.sort((a,b)=>b.start-a.start))s=s.slice(0,c.start)+c.text+s.slice(c.end);
// Training and Rush never write normal-mode records or extract generated equipment.
rep("function recordCodex(kind, id, name) {","function recordCodex(kind, id, name) {\n  if (G.mode !== 'normal') return false;");
rep("function checkAch() {\n  if (G.mode === 'train') return;","function checkAch() {\n  if (G.mode !== 'normal') return;");
rep("function extractCyber() {","function extractCyber() {\n  if (G.mode !== 'normal') return;");
rep("function win() {\n  if (G.mode !== 'rush') extractCyber();\n  if (G.state !== 'play') return;","function win() {\n  if (G.state !== 'play') return;\n  if (G.mode !== 'normal') {\n    G.state = 'win'; G.busy = true;\n    var run = G.runId;\n    setTimeout(function () { if (G.runId === run && G.state === 'win') endScreen(true, G.mode === 'train' ? 0 : finalScore(), false); }, 450);\n    return;\n  }\n  extractCyber();");
rep("  var isBest = saveBest(score);\n  G.coresEarned = coresForRun();\n  gainCores(G.coresEarned);\n  saveJSON(STAT_KEY, cum);", "  var isBest = G.mode === 'normal' ? saveBest(score) : false;\n  if (G.mode === 'normal') {\n    G.coresEarned = coresForRun(); gainCores(G.coresEarned);\n    saveJSON(STAT_KEY, cum);\n  }");
rep("  G.mode = 'normal';\n  G.state = 'play';", "  G.mode = G.trainPending ? 'train' : G.rushPending ? 'rush' : 'normal';\n  G.runId = (G.runId || 0) + 1;\n  G.melee = { charge: 0, combo: 0, step: 0 }; G.cyberGrowth = {}; G.cyberCd = {};\n  G.tacticFx = []; G.slash = null; G.killFxCell = null; G.burstCount = 0; G.rush = null;\n  G.state = 'play';");
rep("  G.chal = challengeMods();", "  G.chal = G.mode === 'normal' ? challengeMods() : null;");
rep("e.maxHp * 0.35 * G.rushMods.enemyHpMul", "e.maxHp * G.rushMods.enemyHpMul");
// Capped summons do not become an unlimited XP/credit/heal farm.
rep("  G.enemies.splice(idx, 1);\n  G.kills++; G.stats.kills++;", "  G.enemies.splice(idx, 1);\n  if (e.boss) {\n    G.enemies = G.enemies.filter(function (m) { return !m.summoned || m.ownerId !== e.uid; });\n    G.hazards = G.hazards.filter(function (h) { return h.ownerId !== e.uid; });\n  }\n  if (e.summoned) {\n    burst(e.x, e.y, e.color, 8);\n    msg('清除召唤体 · 不计战利品', 'dim');\n    if (classDef().id === 'ghost' && !G.burnout && G.overT <= 0) addInstab(1);\n    return;\n  }\n  G.kills++; G.stats.kills++;");
rep("  if (classDef().id === 'ghost') {\n    var gain = (e.elite", "  if (classDef().id === 'ghost') {\n    if (!G.burnout && G.overT <= 0) addInstab(1);\n    var gain = (e.elite");
rep("    if (G.mode === 'rush' || G.mode === 'train') {\n      G.rush.killed++;", "    if (G.mode === 'train') {\n      G.bossAlive = G.enemies.some(function (o) { return o.boss && o.hp > 0; });\n      msg('训练目标击破 · 可继续放置敌人', 'good');\n      updateHUD(); return;\n    }\n    if (G.mode === 'rush' && G.rush) {\n      G.rush.killed++;");
rep("      if (G.rush.killed >= G.rush.total) {", "      var clearedRun = G.runId; G.bossAlive = false; G.busy = true;\n      if (G.rush.killed >= G.rush.total) {");
rep("setTimeout(function () { if (G.state === 'play') win(); }, 700);", "setTimeout(function () { if (G.runId === clearedRun && G.mode === 'rush' && G.state === 'play') win(); }, 700);");
rep("setTimeout(function () { if (G.state === 'play') startRushFloor(G.rush.killed); }, 750);", "setTimeout(function () { if (G.runId === clearedRun && G.mode === 'rush' && G.state === 'play') startRushFloor(G.rush.killed); }, 750);");
rep("if (e.abilities.indexOf('split') >= 0)", "if ((e.abilities || []).some(function (a) { return a === 'split' || a.type === 'split'; }))");
// Enemy targeting, button kill indication and actual ghost hit use one resolver.
fn('ghostSkillDamage',`function ghostRawDamage(k, e) {
  var a = effAtk(), hidden = ghostHidden();
  var mult = k === 'assassinate' ? 2.6 * (hidden ? 1.4 : 1) : k === 'execute' ? 3 + (e.marks || 1) * 1.2 : k === 'chase' ? 1.8 * (hidden ? 1.5 : 1) : 1.5;
  return Math.max(1, Math.round(a * mult) - e.def);
}
function ghostSkillDamage(k, e) { return previewEnemyDamage(e, ghostRawDamage(k, e)); }
function ghostTarget(k) {
  var ranges = { mark: 6, chase: 4, assassinate: 3, execute: 4, blood: 2 };
  var range = ranges[k] || 0;
  return G.enemies.filter(function (e) {
    if (e.hp <= 0 || Math.max(Math.abs(e.x-p.x), Math.abs(e.y-p.y)) > range) return false;
    if (!G.vis[e.y] || !G.vis[e.y][e.x] || !los(p.x,p.y,e.x,e.y)) return false;
    if (k === 'execute' && !e.marked) return false;
    if (k === 'assassinate' && !(ghostHidden() || e.marked)) return false;
    return true;
  }).sort(function (a,b) {
    // Prioritize a guaranteed takedown, then mark stacks, then distance.
    var ak = ghostSkillDamage(k,a) >= a.hp, bk = ghostSkillDamage(k,b) >= b.hp;
    return (bk-ak) || (k === 'execute' ? ((b.marks||0)-(a.marks||0)) : 0) ||
      Math.max(Math.abs(a.x-p.x),Math.abs(a.y-p.y))-Math.max(Math.abs(b.x-p.x),Math.abs(b.y-p.y));
  })[0] || null;
}`);
fn('ghostKillInRange',`function ghostKillInRange(k) {
  if (classDef().id !== 'ghost') return false;
  var t = ghostTarget(k); return !!t && ghostSkillDamage(k,t) >= t.hp;
}`);
fn('ghostEnemyKillable',`function ghostEnemyKillable(e) {
  if (classDef().id !== 'ghost') return false;
  var band = ghostBand(), k = band === 'mid' ? 'assassinate' : (band === 'high' || band === 'over') ? 'execute' : null;
  return !!k && ghostTarget(k) === e && ghostSkillDamage(k,e) >= e.hp;
}`);
fn('ghostAct',`function ghostAct(k) {
  if (classDef().id !== 'ghost' || G.state !== 'play' || G.paused || G.busy) return;
  var band = ghostBand(), acts = GHOST_ACTS[band === 'over' ? 'high' : band] || [];
  var action = acts.find(function (a) { return a.k === k; });
  if (!action) { msg('当前形态不可使用该技能', 'dim'); return; }
  var target = null, land = null;
  if (k !== 'stealth' && k !== 'vanish') {
    target = ghostTarget(k);
    if (!target) { msg(k === 'execute' ? '四格内没有可见的标记目标' : k === 'assassinate' ? '三格内需要隐身或已标记目标' : '射程内没有可见目标', 'dim'); return; }
    if (k === 'chase') {
      land = freeAdjacent(target.x,target.y);
      if (!land) { msg('目标周围没有安全落点', 'dim'); return; }
    }
  }
  // Capture damage before cost changes the form; a failed action costs no turn/resource.
  var raw = target ? ghostRawDamage(k,target) : 0;
  addInstab(action.cost);
  if (k === 'stealth' || k === 'vanish') {
    G.ghostStealth = 5; G.ghostRevealed = false;
    G.enemies.forEach(function (e) { e.alerted = false; });
    burst(p.x,p.y,C.violet,8); msg('光学迷彩 · 移动或等待积累标记', 'good');
  } else if (k === 'mark') {
    target.marked = true; target.marks = Math.min(5,(target.marks||0)+1); target.markFx=performance.now();
    float(target.x,target.y,'标记 '+target.marks,C.cyan); msg('锁定 '+target.name+' · '+target.marks+' 层', 'sys');
  } else {
    if (land) { p.x=land.x; p.y=land.y; pickup(p.x,p.y); }
    var dmg = damageEnemy(target,raw), stacks = target.marks || 1;
    if (k === 'execute') { target.marked=false; target.marks=0; }
    if (k === 'blood') { target.marked=true; target.marks=Math.min(5,(target.marks||0)+2); healPlayer(3+2*target.marks,true); }
    G.ghostStealth=0; G.ghostRevealed=true;
    G.slash={x:target.x,y:target.y,face:Math.atan2(target.y-p.y,target.x-p.x),born:performance.now(),color:k==='execute'?C.red:C.violet,wide:k==='execute'};
    G.shake=Math.max(G.shake,3); burst(target.x,target.y,k==='execute'?C.red:C.violet,12);
    float(target.x,target.y,action.n+' -'+dmg,k==='execute'?C.red:C.violet,true); sfx.hit();
    if (target.hp<=0) {
      killEnemy(target);
      if (k==='assassinate'||k==='execute') { ghostVent(target.summoned ? 10 : 20); G.killFxCell={x:target.x,y:target.y,t:performance.now()}; float(p.x,p.y,'降压 '+(target.summoned?10:20),C.cyan); }
      else if(k==='blood') ghostVent(6);
    }
  }
  computeFOV(); updateHUD(); endTurn();
}`);
// Limit repetition penalties rather than exponential unavoidable deaths across long runs.
rep("var bmul = Math.pow(2, Math.max(0, (G.burstCount || 1) - 1));", "var bmul = Math.min(2, 1 + Math.max(0, (G.burstCount || 1) - 1) * 0.25);");
rep("    float(p.x, p.y, '-6', C.red);", "    float(p.x, p.y, '-' + Math.round(3 * bmul), C.red);");
rep("&& (e.marks || 0) < 5) {", "&& (e.marks || 0) < 5 && los(p.x,p.y,e.x,e.y)) {");
// Expose deterministic testing endpoints, not user-facing cheat controls.
rep("  get p() { return p; }, get mod() { return G.mod; }", "  test: { spawnEnemy: spawnEnemy, enemyAct: enemyAct, enemiesAct: enemiesAct, bossAct: bossAct, damageEnemy: damageEnemy, previewEnemyDamage: previewEnemyDamage, ghostTarget: ghostTarget, ghostSkillDamage: ghostSkillDamage, ghostEnemyKillable: ghostEnemyKillable, endTurn: endTurn, afterAction: afterAction, playerAttack: playerAttack, buildDistMap: buildDistMap, draw: draw, updateFx: updateFx, hideOverlay: hideOverlay, beginTraining: beginTraining, genTrainMap: genTrainMap, beginRush: beginRush, startRushFloor: startRushFloor, win: win, lose: lose, codexHTML: codexHTML, gunFire: gunFire, shootAt: shootAt, reloadWithItem: reloadWithItem, gunReloadCost: gunReloadCost, buildItem: buildItem, toggleMech: toggleMech, installModule: installModule, fireLaser: fireLaser, trainSpawnBoss: trainSpawnBoss, trainSpawn: trainSpawn },\n  get p() { return p; }, get mod() { return G.mod; }");
acorn.parse(s,{ecmaVersion:'latest'});fs.writeFileSync(file,s);console.log('Balance/logic patch applied:',changes.length,'attack sites');
