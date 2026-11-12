'use strict';
/* Isolated encounter identity patch. Never writes game.js.
 * require('./tools/chrome-network-identity-patch').patchSource(source)
 * node tools/chrome-network-identity-patch.js --check [game.js]
 * node tools/chrome-network-identity-patch.js --print [game.js]
 * Three mechanisms only: supply network, recorded phase echoes, magnetic tripwire.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const MARKER = '// CHROME_NETWORK_IDENTITY_V1';
const HELPERS = String.raw`
// CHROME_NETWORK_IDENTITY_V1
function chromeNetworkRoot(e) {
  return e.ownerId ? G.enemies.find(function(m){return m.uid===e.ownerId&&m.hp>0;}) : e;
}
function chromeNetworkOnline(e) {
  var root=chromeNetworkRoot(e);
  // Ordinary recursive descendants remain independent when their summoner dies.
  if(!root||root.id!=='bh_hive')return true;
  return cyberAlive(root)&&!(root.brain.networkUntil>root.brain.step);
}
function chromeNetworkCanProduce(e) {
  return cyberAlive(e)&&chromeNetworkOnline(e);
}
function chromeNetworkRoute(root) {
  if(!cyberAlive(root))return;
  var nodes=tacticOwned(root).filter(function(m){return !!m.structure;}),relay=nodes.find(function(m){return m.structure==='relay';});
  nodes.forEach(function(m){
    m.brain=m.brain||{};
    m.brain.linkUid=m===relay||!relay?root.uid:relay.uid;
    m.brain.stance=chromeNetworkOnline(m)?(m.structure==='gate'?'递归转接':m.structure==='medic'?'再生转接':m.structure==='nest'?'护卫生产':'护盾转接'):'断联 · 停产';
  });
}
function chromeNetworkDeath(e) {
  if(e.id==='bh_phase'&&e.brain){e.brain.phaseHistory=[];e.intent=null;}
  if(e.id==='bl_mine'&&e.brain)e.brain.magnetPairs=[];
  if(e.id==='bh_hive'&&e.brain){e.brain.networkUntil=0;e.brain.networkLastRelay=0;}
  if(e.structure!=='relay')return;
  var root=chromeNetworkRoot(e);
  if(!root||root.id!=='bh_hive'||!cyberAlive(root))return;
  // The relay cuts PRODUCTION, not enemy movement, attacks, casts or player inputs.
  root.brain.networkUntil=(root.brain.step||0)+4;
  root.brain.networkLastRelay=e.uid;
  tacticOwned(root).forEach(function(m){if(m.structure&&m!==e)m.brain.stance='断联 · 停产';});
  float(root.x,root.y,'中继断联 · 生产暂停',C.cyan);
}
function chromeNetworkNode(e,root) {
  if(root.id!=='bh_hive')return false;
  if(!chromeNetworkOnline(e)){e.brain.stance='断联 · 停产';return true;}
  if(e.structure==='gate'||e.structure==='nest'){
    if(e.tick%(e.structure==='gate'?2:3)===0)summonMinions(e,e.structure==='gate'?2:1,e.structure==='gate'?['summoner','charger']:['healer','tank']);
    return true;
  }
  if(e.structure==='medic'){
    if(e.tick%2===0){
      var heal=Math.round(root.maxHp*.012),relay=G.enemies.find(function(m){return m.uid===e.brain.linkUid&&m.hp>0;})||root;
      root.hp=Math.min(root.maxHp,root.hp+heal);float(root.x,root.y,'再生 +'+heal,C.green);
      // Same regeneration amount; the visible path is the actual live routing edge.
      G.beams.push({x0:e.x+.5,y0:e.y+.5,x1:relay.x+.5,y1:relay.y+.5,life:240,max:240,color:C.green});
      if(relay!==root)G.beams.push({x0:relay.x+.5,y0:relay.y+.5,x1:root.x+.5,y1:root.y+.5,life:240,max:240,color:C.green});
    }return true;
  }
  return false;
}
function chromeNetworkMother(e,dist,t,d) {
  var b=e.brain;b.stance=chromeNetworkOnline(e)?'母巢 · 转接网络':'母巢 · 断联重路由';
  var nodes=tacticOwned(e).filter(function(m){return !!m.structure;});
  if((t===1||t%9===0)&&chromeNetworkOnline(e)){
    var kinds=['relay','medic','gate','nest'],spots=cyberSlots(e,3,5);
    kinds.forEach(function(kind){if(cyberAlive(e)&&!nodes.some(function(m){return m.structure===kind;}))cyberStructure(e,kind,spots.pop());});
  }
  chromeNetworkRoute(e);
  // No root egg barrage: gate recursion + support production replace ovary overlap.
  if(t%5===0)cyberPull(e,4);
  if(t%3===0)cyberPulse(e,Math.round(e.atk*.65),'巢群神经压迫');
  if(!cyberAlive(e))return;
  if(d<=2)cyberImpact(e,tacticArea(e.x,e.y,2),e.atk+2,'tendril',1);
}
function chromePhaseRecord(e) {
  var history=e.brain.phaseHistory||(e.brain.phaseHistory=[]);
  history.push({x:p.x,y:p.y,bx:e.x,by:e.y,turn:G.turn});
  if(history.length>6)history.shift();
}
function chromePhaseCells(e,self) {
  var history=(e.brain.phaseHistory||[]).slice(-3),cells=[];
  history.forEach(function(h){var c={x:self?h.bx:h.x,y:self?h.by:h.y};if(tacticFloor(c.x,c.y))cells=tacticMerge(cells,[c]);});
  return cells;
}
function chromePhaseAct(e,dist,t,d) {
  var b=e.brain,form=e.hp>e.maxHp*.66?0:e.hp>e.maxHp*.33?1:2;
  if(b.form!==form){
    e.intent=null;e.phaseT=0;b.phaseHistory=[];b.form=form;
    G.hazards=G.hazards.filter(function(h){return h.ownerId!==e.uid||(h.kind!=='echo'&&!h.phaseEcho);});
    msg(e.name+' · '+['实体：重刃蓄势','时间：最近足迹两拍后重放','裂隙：自身轨迹回卷'][form],'warn');
    if(e.boss)bossStageEvent(e,'phase',['实体重刃','时间回声','裂隙降临'][form]);
  }
  b.stance=['实体重刃','时间回声 · 足迹重放','裂隙降临 · 自身回卷'][form];
  chromePhaseRecord(e);
  var pending=e.intent,from={x:e.x,y:e.y};
  if(tacticResolve(e)){
    if(!cyberAlive(e))return;
    if(form===2&&pending&&pending.kind==='charge'&&!e.intent){
      var length=cyberDistance(from,e),path=length?tacticLine(from,length,e.x,e.y):[];
      var cells=tacticMerge(chromePhaseCells(e,true),path);
      if(cells.length)cyberField(e,'echo',cells,2,1,Math.round(e.atk*1.2),{phaseEcho:true});
    }
    return;
  }
  if(form===0){
    if(t%4===1){tacticQueue(e,'cleaver','重刃迟滞',tacticArea(e.x,e.y,2),2,e.atk*2,{aftershock:true});return;}
    if(d>1)stepToward(e,dist);if(cyberDistance(e,p)<=1)enemyMelee(e);
  }else if(form===1){
    // Discrete visited cells, never an interpolated teleport path or player-following ring.
    if(t%3===1){var trail=chromePhaseCells(e,false);if(trail.length)cyberField(e,'echo',trail,2,1,Math.round(e.atk*1.2),{phaseEcho:true});}
    if(t%3===0){var landing=freeAdjacent(p.x,p.y);if(landing){burst(e.x,e.y,e.color,10);e.x=landing.x;e.y=landing.y;}if(cyberDistance(e,p)<=1)enemyMelee(e);}else stepToward(e,dist);
  }else{
    if(t%6===1){tacticQueue(e,'annihilate','维度断层',tacticArea(e.x,e.y,9),3,e.atk*3.5);e.phaseT=3;return;}
    if(t%2===0){tacticQueue(e,'charge','相位快切 · 轨迹回卷',tacticLine(e,10),1,e.atk*1.8);return;}
    stepToward(e,dist);if(cyberDistance(e,p)<=1)enemyMelee(e);
  }
}
function chromeMagnetEnds(h) {
  var a=G.hazards.find(function(m){return m.id===h.mineA&&m.ownerId===h.ownerId&&m.kind==='mine';});
  var b=G.hazards.find(function(m){return m.id===h.mineB&&m.ownerId===h.ownerId&&m.kind==='mine';});
  return a&&b?[a,b]:null;
}
function chromeMagnetWeave(e) {
  if(!cyberAlive(e))return;
  G.hazards=G.hazards.filter(function(h){return h.ownerId!==e.uid||h.kind!=='magnet-link'||!!chromeMagnetEnds(h);});
  var mines=G.hazards.filter(function(h){return h.ownerId===e.uid&&h.kind==='mine'&&!h.remote;}).slice(-9),pairs=[];
  for(var i=1;i<mines.length;i++){
    var a=mines[i-1],b=mines[i],from={x:a.cx,y:a.cy},to={x:b.cx,y:b.cy},distance=cyberDistance(from,to);
    if(distance<2||distance>8||!los(from.x,from.y,to.x,to.y))continue;
    pairs.push([a.id,b.id]);
    if(G.hazards.some(function(h){return h.kind==='magnet-link'&&h.mineA===a.id&&h.mineB===b.id;}))continue;
    var cells=tacticLine(from,distance,to.x,to.y).filter(function(c){return c.x!==to.x||c.y!==to.y;});
    if(cells.length)cyberField(e,'magnet-link',cells,1,9,0,{mineA:a.id,mineB:b.id});
  }
  e.brain.magnetPairs=pairs;
}
function chromeMagnetTick(h,expired) {
  if(h.kind!=='magnet-link')return false;
  var ends=chromeMagnetEnds(h);
  if(!ends||ends.some(function(m){return expired[m.id];})){expired[h.id]=true;return true;}
  if(h.delay>0)h.delay--;
  h.active=true;h.life--;
  if(h.cells.some(function(c){return c.x===p.x&&c.y===p.y;})){
    // Crossing schedules only the connected endpoints. No extra damage multiplier,
    // resource drain, movement lock or input rewrite. One full action to respond.
    ends.forEach(function(m){if(!m.remote){m.remote=true;m.delay=1;m.bornTurn=G.turn;}});
    expired[h.id]=true;
    float(p.x,p.y,'触网 · 两端引信',C.amber);
  }
  if(h.life<=0)expired[h.id]=true;
  return true;
}
function chromeNetworkDrawNode(e,root,view) {
  if(!root||root.id!=='bh_hive')return false;
  var target=G.enemies.find(function(m){return m.uid===e.brain.linkUid&&m.hp>0;})||root;
  if(!G.vis[e.y]||!G.vis[e.y][e.x]||!G.vis[target.y]||!G.vis[target.y][target.x])return true;
  var online=chromeNetworkOnline(e);
  ctx.save();ctx.strokeStyle=online?(e.structure==='medic'?'rgba(87,255,168,.45)':'rgba(255,54,92,.4)'):'rgba(142,158,170,.5)';
  ctx.lineWidth=online?1.5:1;ctx.setLineDash(online?[4,3]:[1,6]);ctx.beginPath();ctx.moveTo(view.sx(e.x),view.sy(e.y));ctx.lineTo(view.sx(target.x),view.sy(target.y));ctx.stroke();
  if(!online){ctx.font='600 '+Math.max(8,view.tile*.24)+'px monospace';ctx.textAlign='center';ctx.fillStyle='#b4c4ce';ctx.fillText('断联',view.sx(e.x),view.sy(e.y)-view.tile*.65);}
  ctx.restore();return true;
}
function chromeMagnetDraw(h,view) {
  if(h.kind!=='magnet-link')return false;
  if(!chromeMagnetEnds(h))return true;
  var cells=h.cells||[];
  ctx.save();ctx.strokeStyle='rgba(255,54,92,.35)';ctx.lineWidth=Math.max(3,view.tile*.32);ctx.lineCap='square';
  for(var i=0;i<cells.length;i++){
    var c=cells[i];if(!view.on(c.x,c.y)||!G.vis[c.y]||!G.vis[c.y][c.x])continue;
    var next=cells[i+1];if(!next||!G.vis[next.y]||!G.vis[next.y][next.x])next=c;
    ctx.beginPath();ctx.moveTo(view.sx(c.x)-.5,view.sy(c.y));ctx.lineTo(view.sx(next.x)+.5,view.sy(next.y));ctx.stroke();
  }
  ctx.restore();return true;
}
`;
function replaceOnce(source, before, after) {
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0) throw new Error('Missing/nonunique local anchor: ' + before.slice(0, 110));
  return source.slice(0, first) + after + source.slice(first + before.length);
}
const MOTHER = `  if(e.id==='bh_hive'){
    b.stance='母巢中枢';var nodes=tacticOwned(e).filter(function(m){return m.structure;});
    if(t===1||t%9===0){var kinds=['relay','medic','gate','nest'],spaces=cyberSlots(e,3,5);for(var ni=0;ni<kinds.length;ni++)if(!nodes.some(function(m){return m.structure===kinds[ni];}))cyberStructure(e,kinds[ni],spaces.pop());}
    if(t%4===0){var pods=cyberSlots(e,2,6);for(var pi=0;pi<Math.min(2+stage,pods.length);pi++)cyberStructure(e,'egg',pods[pi]);}
    if(t%5===0)cyberPull(e,4);
    if(t%3===0)cyberPulse(e,Math.round(e.atk*.65),'巢群神经压迫');
    if(d<=2)cyberImpact(e,tacticArea(e.x,e.y,2),e.atk+2,'tendril',1);return;
  }`;
const PHASE = `  if(e.id==='bh_phase'){
    var form=e.hp>e.maxHp*.66?0:e.hp>e.maxHp*.33?1:2;b.form=form;b.stance=['实体重刃','时间回声','裂隙降临'][form];
    if(tacticResolve(e))return;
    if(form===0){if(t%4===1){tacticQueue(e,'cleaver','重刃迟滞',tacticArea(e.x,e.y,2),2,e.atk*2,{aftershock:true});return;}if(d>1)stepToward(e,dist);if(cyberDistance(e,p)<=1)enemyMelee(e);}
    else if(form===1){
      cyberField(e,'echo',tacticArea(p.x,p.y,1),t%2?2:1,1,Math.round(e.atk*1.2));
      if(t%3===0){var landing=freeAdjacent(p.x,p.y);if(landing){burst(e.x,e.y,e.color,10);e.x=landing.x;e.y=landing.y;}if(cyberDistance(e,p)<=1)enemyMelee(e);}else stepToward(e,dist);
    }else{
      if(t%6===1){tacticQueue(e,'annihilate','维度断层',tacticArea(e.x,e.y,9),3,e.atk*3.5);e.phaseT=3;return;}
      if(t%2===0){tacticQueue(e,'charge','相位快切',tacticLine(e,10),1,e.atk*1.8,{aftershock:true});return;}
      stepToward(e,dist);if(cyberDistance(e,p)<=1)enemyMelee(e);
    }return;
  }`;
function patchSource(source) {
  if (source.includes(MARKER)) return source;
  source = replaceOnce(source, '// CYBER_ENCOUNTERS_V2', '// CYBER_ENCOUNTERS_V2\n' + HELPERS);
  source = replaceOnce(source, MOTHER, "  if(e.id==='bh_hive'){chromeNetworkMother(e,dist,t,d);return;}");
  source = replaceOnce(source, PHASE, "  if(e.id==='bh_phase'){chromePhaseAct(e,dist,t,d);return;}");
  const retreat = '    if(d<5){stepAway(e,dist);if(stage>=2)stepAway(e,dist);}else if(d>8)stepToward(e,dist);return;';
  source = replaceOnce(source, retreat, '    if(!cyberAlive(e))return;chromeMagnetWeave(e);\n' + retreat);
  source = replaceOnce(source, 'function cyberStructure(owner,kind,spot) {', 'function cyberStructure(owner,kind,spot) {\n  if(!chromeNetworkCanProduce(owner))return null;');
  source = replaceOnce(source, 'function cyberField(owner,kind,cells,delay,life,damage,extra) {', "function cyberField(owner,kind,cells,delay,life,damage,extra) {\n  var liveRoot=chromeNetworkRoot(owner);if(!cyberAlive(owner)||(liveRoot&&!cyberAlive(liveRoot)))return null;");
  source = replaceOnce(source, 'function summonMinions(e,n,roles) {', 'function summonMinions(e,n,roles) {\n  if(!chromeNetworkCanProduce(e))return 0;');
  source = replaceOnce(source, "  if(!root){e.hp=0;killEnemy(e,true);return;}\n  if(e.structure==='egg'){", "  if(!root){e.hp=0;killEnemy(e,true);return;}\n  if(chromeNetworkNode(e,root))return;\n  if(e.structure==='egg'){");
  source = replaceOnce(source, '  G.enemies.splice(idx, 1);\n  if (e.boss) {', '  chromeNetworkDeath(e);\n  G.enemies.splice(idx, 1);\n  if (e.boss) {');
  return finishPatch(source);
}
function finishPatch(source) {
  source = replaceOnce(source, "return m.structure==='relay';}))n*=.25;", "return m.structure==='relay'&&chromeNetworkOnline(m);}))n*=.25;");
  source = replaceOnce(source, '    if(h.delay>0){h.delay--;if(h.delay>0)continue;}', '    if(chromeMagnetTick(h,expired))continue;\n    if(h.delay>0){h.delay--;if(h.delay>0)continue;}');
  source = replaceOnce(source, "G.hazards.forEach(function(hz){visualCells(hz.cells||[], '#ff365c', hz.delay || 0, view, hz.active ? .25 : null);});", "G.hazards.forEach(function(hz){if(!chromeMagnetDraw(hz,view))visualCells(hz.cells||[], '#ff365c', hz.delay || 0, view, hz.active ? .25 : null);});");
  source = replaceOnce(source, "if(root&&['relay','medic','gate'].indexOf(e.structure)>=0){", "if(chromeNetworkDrawNode(e,root,view))return;if(root&&['relay','medic','gate'].indexOf(e.structure)>=0){");
  // Keep the existing stage HUD: no extra grid, panel, animated loop or timer.
  source = replaceOnce(source, "  if (pf.kind === 'mother') return '根节点网络 / '", "  if (pf.kind === 'mother') return (chromeNetworkOnline(e)?'转接在线 / ':'断联停产 / ') + '根节点网络 / '");
  source = replaceOnce(source, "  if (pf.kind === 'mine') return '磁网 / '", "  if (pf.kind === 'mine') return '触网引爆两端 / '");
  source = replaceOnce(source, "['I 实体重刃', 'II 时间回声', 'III 裂隙降临']", "['I 实体重刃', 'II 足迹延迟重放', 'III 自身轨迹回卷']");
  new vm.Script(source, { filename: 'network-patched-game.js' });
  return source;
}
function mechanismTests(patched) {
  let acorn;
  try { acorn = require('acorn'); } catch (_) { acorn = require('/root/workspace/neon-tooling/node_modules/acorn'); }
  const ast = acorn.parse(patched, {ecmaVersion:'latest'});
  const body = ast.body.find(n => n.type==='ExpressionStatement' && n.expression.type==='CallExpression').expression.callee.body.body;
  const names = ['cyberRoot','cyberAlive','cyberDistance','cyberField','cyberStructure','cyberStructureAct','cyberChildren','tacticUid','tacticOwned','tacticMerge','tacticLine','tacticFloor','previewEnemyDamage','tickHazards'];
  const chunks = names.map(name => { const f=body.find(n => n.type==='FunctionDeclaration' && n.id.name===name);assert(f,'function '+name);return patched.slice(f.start,f.end); });
  const sandbox = {console,performance:{now:()=>0},G:{state:'play',enemies:[],hazards:[],beams:[],turn:1,map:Array.from({length:24},()=>Array(24).fill(1)),freeze:0},p:{x:5,y:5},MAP_W:24,MAP_H:24,WALL:0,C:{cyan:'#0ff',green:'#0f0',amber:'#fa0'},msg:()=>{},float:()=>{},bossStageEvent:()=>{},burst:()=>{},wallAt:()=>false,occupied:()=>false,effDef:()=>0,los:()=>true,tacticFx:()=>{},stepToward:()=>{},enemyMelee:()=>{},freeAdjacent:()=>null,cyberPull:()=>{},cyberPulse:()=>{},cyberImpact:()=>{},hurtPlayer:()=>{},tacticResolve:()=>false,tacticQueue:()=>{},cyberSlots:()=>[],summonMinions:()=>0};
  vm.createContext(sandbox);vm.runInContext(HELPERS+'\n'+chunks.join('\n'),sandbox);
  vm.runInContext(`
    var root={id:'bh_hive',uid:1,hp:1000,maxHp:1000,atk:10,x:2,y:2,brain:{step:1},boss:true};
    var relay={uid:2,hp:100,x:3,y:2,structure:'relay',summoned:true,ownerId:1,sourceUid:1,brain:{}};
    var medic={uid:3,hp:100,x:4,y:2,structure:'medic',summoned:true,ownerId:1,sourceUid:1,brain:{},tick:2};
    var gate={uid:4,hp:100,x:3,y:4,structure:'gate',summoned:true,ownerId:1,sourceUid:1,brain:{},tick:2};
    var child={uid:5,hp:100,x:6,y:4,summoned:true,ownerId:1,sourceUid:4,brain:{}};
    G.enemies=[root,relay,medic,gate,child];chromeNetworkRoute(root);
  `,sandbox);
  assert.equal(sandbox.medic.brain.linkUid,2,'medic routes through relay');
  assert.equal(sandbox.previewEnemyDamage(sandbox.root,100),25,'original 75% shield');
  sandbox.root.hp=900;sandbox.chromeNetworkNode(sandbox.medic,sandbox.root);
  assert.equal(sandbox.root.hp,912,'original 1.2% regeneration');
  assert.equal(sandbox.G.beams.length,2,'medic two-hop transfer');
  sandbox.relay.hp=0;sandbox.chromeNetworkDeath(sandbox.relay);
  assert.equal(sandbox.chromeNetworkCanProduce(sandbox.child),false,'recursive production disconnected');
  assert.equal(sandbox.previewEnemyDamage(sandbox.root,100),100,'relay death drops shield');
  sandbox.root.brain.step=4;assert.equal(sandbox.chromeNetworkOnline(sandbox.gate),false,'three root actions disconnected');
  sandbox.root.brain.step=5;assert.equal(sandbox.chromeNetworkOnline(sandbox.gate),true,'root reroutes without permanent softlock');
  const independent={uid:8,ownerId:999,hp:30,brain:{}};sandbox.G.enemies.push(independent);
  assert.equal(sandbox.chromeNetworkCanProduce(independent),true,'ordinary recursive descendant survives missing summoner');
  sandbox.G.enemies.splice(sandbox.G.enemies.indexOf(independent),1);
  assert.equal(sandbox.chromeNetworkCanProduce(independent),false,'removed descendant cannot produce');
  const phase={id:'bh_phase',uid:6,hp:50,maxHp:100,atk:10,x:12,y:12,brain:{step:1,form:1},boss:true};sandbox.G.enemies.push(phase);
  for(const x of [2,3,10]){sandbox.p.x=x;sandbox.chromePhaseRecord(phase);}
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.chromePhaseCells(phase,false))),[{x:2,y:5},{x:3,y:5},{x:10,y:5}],'true sampled positions; blink gap unfilled');
  sandbox.p.x=11;sandbox.chromePhaseAct(phase,null,4,9);
  const echo=sandbox.G.hazards.find(h=>h.phaseEcho);assert(echo&&echo.delay===2&&echo.cells.length===3,'delayed trail replaces player-centered area');
  phase.hp=30;phase.intent={kind:'cleaver'};sandbox.chromePhaseAct(phase,null,3,9);
  assert.equal(phase.intent,null,'phase switch cancels stale rule');assert(!sandbox.G.hazards.some(h=>h.phaseEcho),'phase switch clears stale echoes');
  const mineBoss={id:'bl_mine',uid:7,hp:100,atk:10,x:2,y:10,brain:{}};sandbox.G.enemies.push(mineBoss);
  const a=sandbox.cyberField(mineBoss,'mine',[{x:2,y:8}],1,9,18,{cx:2,cy:8});
  const b=sandbox.cyberField(mineBoss,'mine',[{x:6,y:8}],1,9,18,{cx:6,cy:8});
  sandbox.chromeMagnetWeave(mineBoss);const link=sandbox.G.hazards.find(h=>h.kind==='magnet-link');assert(link,'mine-to-mine link exists');
  sandbox.p.x=4;sandbox.p.y=8;sandbox.G.turn++;const expired={};sandbox.chromeMagnetTick(link,expired);
  assert(a.remote&&b.remote&&a.bornTurn===sandbox.G.turn&&expired[link.id],'wire arms endpoints once, next action');
  sandbox.G.freeze=1;sandbox.G.turn++;sandbox.tickHazards();assert.equal(a.delay,1,'time stop pauses the real hazard clock');
  sandbox.G.freeze=0;sandbox.G.turn++;sandbox.tickHazards();assert.equal(sandbox.G.hazards.length,0,'spent endpoints remove their link');
  phase.intent={kind:'charge'};sandbox.tacticResolve=function(e){e.hp=0;e.intent=null;return true;};sandbox.chromePhaseAct(phase,null,4,9);
  assert.equal(sandbox.G.hazards.length,0,'death during resolve does not recreate phase fields');
  const before=sandbox.G.hazards.length;mineBoss.hp=0;sandbox.chromeMagnetWeave(mineBoss);sandbox.cyberField(mineBoss,'echo',[],1,1,1);
  assert.equal(sandbox.G.hazards.length,before,'dead root cannot resurrect fields');
  sandbox.G.hazards=Array.from({length:72},(_,i)=>({id:i+100}));sandbox.root.hp=900;
  assert.equal(sandbox.cyberField(sandbox.root,'echo',[],1,1,1),null,'72 hazard budget');
  sandbox.G.enemies=Array.from({length:64},()=>sandbox.root);
  assert.equal(sandbox.cyberStructure(sandbox.root,'relay',{x:8,y:8}),null,'64 entity budget');
  return 22;
}
function checkSource(source) {
  const patched=patchSource(source);
  assert.equal(patchSource(patched),patched,'idempotent');
  new vm.Script(patched);
  return {ok:true,mechanismAssertions:mechanismTests(patched),bytes:Buffer.byteLength(patched),writes:false};
}
module.exports={patchSource,checkSource,mechanismTests};
if(require.main===module){
  const mode=process.argv[2]||'--check';
  if(mode!=='--check'&&mode!=='--print')throw new Error('Use --check or --print; this script never writes game.js');
  const file=path.resolve(process.argv[3]||path.join(__dirname,'..','game.js'));
  const source=fs.readFileSync(file,'utf8');
  if(mode==='--print')process.stdout.write(patchSource(source));else console.log(JSON.stringify(checkSource(source),null,2));
}
