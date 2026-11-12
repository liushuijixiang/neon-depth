/* Cyber combat revision: independent encounter machines, not a universal dodge loop. */
function spawnBoss(spec, x, y, depth) {
  var hp = Math.round(spec.hp * (1 + (depth - 1) * 0.24) * (G.mode === 'rush' ? 10 : 10 / 3));
  var e = { spec:spec,id:spec.id,name:spec.name,ai:'boss',glyph:spec.glyph,color:spec.color,x:x,y:y,hp:hp,maxHp:hp,
    atk:spec.atk+Math.floor((depth-1)/2),def:spec.def,xp:spec.xp+depth*5,range:0,cd:0,tick:0,stun:0,alerted:true,boss:true,elite:false,
    abilities:(spec.abilities||[]).map(function(a){return typeof a==='string'?{type:a}:a;}),guard:0,guardAt:0,phaseT:0,armorT:0,armorUsed:0,
    buffs:[],burn:0,intent:null,recovery:0,brain:{step:0,stage:0,stance:'起动',angle:0,plate:100,repair:0},facing:Math.PI };
  if(G.mode==='normal'&&G.chal){e.maxHp=Math.round(e.maxHp*G.chal.enemyHpMul);e.hp=e.maxHp;e.atk+=G.chal.atk;}
  tacticUid(e);return e;
}
function cyberRoot(e) { return e.ownerId || tacticUid(e); }
function cyberChildren(e) { var id=tacticUid(e);return G.enemies.filter(function(m){return m.hp>0&&m.sourceUid===id;}); }
function cyberAlive(e) { return e && e.hp>0 && G.enemies.indexOf(e)>=0 && G.state==='play'; }
function cyberDistance(a,b) { return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)); }
function cyberSlots(e,inner,outer) {
  var cells=tacticArea(e.x,e.y,outer||5,inner||1).filter(function(c){return !occupied(c.x,c.y)&&!wallAt(c.x,c.y);});
  return shuffle(cells);
}
function cyberStructure(owner,kind,spot) {
  if(!spot||G.enemies.length>=64||occupied(spot.x,spot.y)||!tacticFloor(spot.x,spot.y))return null;
  var root=G.enemies.find(function(m){return m.uid===cyberRoot(owner);})||owner;
  var label={egg:'生化卵',nest:'增殖巢穴',mirror:'折光镜',relay:'护盾中继',medic:'再生中继',gate:'裂隙巢'}[kind]||'构造物';
  var hp=Math.max(18,Math.round((root.maxHp||100)*(kind==='egg'?.055:kind==='mirror'?.065:.10)));
  var spec={id:'cyber_'+kind,name:label,ai:'structure',glyph:'hex',color:root.color,onDeath:'none',cooldown:3};
  var e={spec:spec,id:spec.id,name:label,ai:'structure',structure:kind,glyph:'hex',color:root.color,x:spot.x,y:spot.y,hp:hp,maxHp:hp,
    atk:root.atk||6,def:kind==='egg'?0:2,xp:0,range:0,cd:0,tick:0,stun:0,alerted:true,boss:false,elite:false,buffs:[],burn:0,
    summoned:true,noSplit:true,ownerId:cyberRoot(owner),sourceUid:tacticUid(owner),incubation:kind==='egg'?3:0,brain:{step:0,stance:kind==='egg'?'孵育':'在线'}};
  tacticUid(e);G.enemies.push(e);burst(e.x,e.y,root.color,12);return e;
}
function summonMinions(e,n,roles) {
  // Recursive summoners are intentional. Capacity is a device safety budget, not a lineage ban.
  var cap=e.boss?18:e.structure?10:6;
  n=Math.max(0,Math.min(n,cap-cyberChildren(e).filter(function(m){return !m.structure;}).length,64-G.enemies.length));
  if(!n)return 0;
  roles=roles||e.spawnRoles||['chase','charger','exploder','healer','summoner'];
  var pool=MONSTERS.filter(function(m){return !m.boss&&roles.indexOf(m.ai)>=0&&G.depth>=m.minDepth&&G.depth<=m.maxDepth;});
  if(!pool.length)pool=MONSTERS.filter(function(m){return !m.boss&&roles.indexOf(m.ai)>=0;});
  if(!pool.length)return 0;
  var spots=e.spawnCells||cyberSlots(e,1,e.structure?3:4),born=0;
  for(var i=0;i<spots.length&&born<n;i++){
    var c=spots[i];if(occupied(c.x,c.y)||wallAt(c.x,c.y))continue;
    var m=spawnEnemy(pick(pool),c.x,c.y,G.depth);m.elite=false;
    var factor=e.structure==='egg'?1.25:.85;m.hp=Math.max(8,Math.round(m.hp*factor));m.maxHp=m.hp;m.atk=Math.max(2,Math.round(m.atk*(e.structure==='egg'?1.2:1)));
    m.xp=0;m.alerted=true;m.summoned=true;m.ownerId=cyberRoot(e);m.sourceUid=tacticUid(e);m.noSplit=true;
    m.name=(e.structure==='egg'?'孵化·':'增殖·')+m.spec.name;tacticUid(m);G.enemies.push(m);born++;burst(c.x,c.y,m.color,8);
  }
  return born;
}
function cyberField(owner,kind,cells,delay,life,damage,extra) {
  G.hazards=G.hazards||[];
  // Don't silently replace existing danger: defer extra emission when the visual/entity budget is full.
  if(G.hazards.length>=72)return null;
  var h={id:(G.fieldSerial=(G.fieldSerial||0)+1),ownerId:cyberRoot(owner),sourceUid:tacticUid(owner),kind:kind,cells:cells,
    delay:Math.max(0,delay||0),life:life||1,damage:damage||0,color:'#ff365c',bornTurn:G.turn,active:false,triggered:false};
  Object.keys(extra||{}).forEach(function(k){h[k]=extra[k];});G.hazards.push(h);return h;
}
function cyberImpact(e,cells,amount,kind,armorFactor) {
  if(!cyberAlive(e))return 0;
  tacticFx(cells,'#ff365c',kind||'impact');e.attackFx=performance.now();
  if(!cells.some(function(c){return c.x===p.x&&c.y===p.y;}))return 0;
  return hurtPlayer(Math.max(1,Math.round(amount-effDef()*(armorFactor==null?1:armorFactor))),e);
}
function cyberPulse(e,amount,label) {
  // Encounter stat check: room-wide electronic pressure, intentionally not solved by one sidestep.
  if(!cyberAlive(e)||cyberDistance(e,p)>14)return;
  e.pulseFx=performance.now();e.brain.stance=label;
  G.beams.push({x0:e.x+.5,y0:e.y+.5,x1:p.x+.5,y1:p.y+.5,life:260,max:260,color:'#ff365c'});
  hurtPlayer(Math.max(1,Math.round(amount-effDef()*.35)),e);
}
function cyberRay(origin,tx,ty,range,reflectors) {
  var vx=tx-origin.x,vy=ty-origin.y,length=Math.max(Math.abs(vx),Math.abs(vy))||1;
  var dx=vx/length,dy=vy/length;if(!dx&&!dy)dx=1;
  var x=origin.x,y=origin.y,fx=x,fy=y,lastX=x,lastY=y,cells=[],segments=[],segment={x0:x+.5,y0:y+.5},bounces=0,visited={};
  for(var i=0;i<range;i++){
    fx+=dx;fy+=dy;x=Math.round(fx);y=Math.round(fy);if(!tacticFloor(x,y)||wallAt(x,y))break;
    var key=x+','+y+','+dx.toFixed(3)+','+dy.toFixed(3);if(visited[key])break;visited[key]=1;cells.push({x:x,y:y});lastX=x;lastY=y;
    var mirror=(reflectors||[]).find(function(m){return m.x===x&&m.y===y&&m.hp>0;});
    if(mirror&&bounces<8){segment.x1=x+.5;segment.y1=y+.5;segments.push(segment);var nd=dx;dx=mirror.slant?dy:-dy;dy=mirror.slant?nd:-nd;if(!dx&&!dy)dy=1;segment={x0:x+.5,y0:y+.5};fx=x;fy=y;bounces++;mirror.reflectFx=performance.now();}
  }
  segment.x1=lastX+.5;segment.y1=lastY+.5;segments.push(segment);return {cells:cells,segments:segments,bounces:bounces};
}
function cyberLaser(e,tx,ty,power,mirrors) {
  var ray=cyberRay(e,tx,ty,32,mirrors);
  ray.segments.forEach(function(s){s.life=300;s.max=300;s.color='#ff365c';G.beams.push(s);});
  cyberImpact(e,ray.cells,power,'rail',.5);return ray;
}
function tacticQueue(e,kind,label,cells,turns,damage,extra) {
  e.intent={kind:kind,label:label,cells:cells||[],turns:turns||1,total:turns||1,color:'#ff365c',damage:damage||0,startHp:e.hp,bornTurn:G.turn};
  Object.keys(extra||{}).forEach(function(k){e.intent[k]=extra[k];});
  e.brain=e.brain||{step:0};e.brain.stance=label;
  if(e.boss||G.vis[e.y]&&G.vis[e.y][e.x])msg(e.name+' · '+label,'warn');
}
function tacticResolve(e) {
  var a=e.intent;if(!a)return false;
  a.turns--;
  if(a.track&&a.turns>0){a.cells=a.kind==='charge'?tacticLine(e,a.range||7):tacticArea(p.x,p.y,a.radius||1);}
  if(a.turns>0)return true;
  e.intent=null;e.phaseT=0;e.attackFx=performance.now();
  var cells=a.cells;
  if(a.kind==='charge'){
    var path=[];for(var i=0;i<cells.length;i++){var c=cells[i];if(!tacticFloor(c.x,c.y)||wallAt(c.x,c.y))break;var block=enemyAt(c.x,c.y);if(block&&block!==e)break;path.push(c);if(c.x===p.x&&c.y===p.y)break;e.x=c.x;e.y=c.y;}cells=path;
    if(path.length<2){e.stun=Math.max(e.stun||0,1);e.brain.stance='撞击过载';}
  }
  if(a.kind==='repair'){
    var repaired=Math.min(e.maxHp-e.hp,Math.round(e.maxHp*.08));e.hp+=repaired;e.brain.plate=Math.min(100,e.brain.plate+35);float(e.x,e.y,'重铸 +'+repaired,C.cyan);
  }else if(a.kind==='hatch'){
    var slots=cyberSlots(e,2,5);for(var j=0;j<Math.min(a.count||3,slots.length);j++)cyberStructure(e,'egg',slots[j]);
  }else if(a.kind==='rail'){
    cyberLaser(e,a.tx,a.ty,a.damage,[]);
  }else if(a.kind==='annihilate'){
    // Cover and cyberware mitigate this burst; no guarantee every starting tile has a walking escape.
    var all=[];for(var yy=0;yy<MAP_H;yy++)for(var xx=0;xx<MAP_W;xx++)if(tacticFloor(xx,yy)&&los(e.x,e.y,xx,yy))all.push({x:xx,y:yy});
    cyberImpact(e,all,a.damage,'fracture',.35);e.brain.stance='维度回卷';
  }else if(a.kind==='explode'){
    cyberImpact(e,cells,a.damage,'explosion',.6);
    if(e.spec.onDeath==='explode'||G.depth>=6)cyberField(e,'acid',cells,0,3,Math.max(3,Math.round(e.atk*.45)),{orphan:true});
    killEnemy(e,true);return true;
  }else{
    cyberImpact(e,cells,a.damage,a.kind,a.armorFactor);
    if(a.aftershock)cyberField(e,'echo',cells,1,1,Math.round(a.damage*.7));
  }
  e.cd=a.cooldown||0;
  // No shared recovery or bonus-damage window. Only individual encounter state can pause a machine.
  return true;
}
function tickHazards() {
  if(G.freeze>0)return;
  var list=(G.hazards||[]).slice(),expired={};
  for(var i=0;i<list.length;i++){
    var h=list[i];if(h.bornTurn===G.turn)continue;
    var owner=G.enemies.find(function(e){return e.uid===h.ownerId&&e.hp>0;});
    if(!owner&&!h.orphan){expired[h.id]=true;continue;}
    if(h.delay>0){h.delay--;if(h.delay>0)continue;}
    h.active=true;
    var hit=h.cells.some(function(c){return c.x===p.x&&c.y===p.y;});
    if(h.kind==='mine'&&!h.remote&&!hit){h.life--;if(h.life<=0)expired[h.id]=true;continue;}
    if(h.kind==='mine'){
      h.triggered=true;tacticFx(h.cells,'#ff365c','explosion');
      if(hit)hurtPlayer(Math.max(1,h.damage-effDef()*.6),owner||null);
      list.forEach(function(other){if(other!==h&&other.kind==='mine'&&other.cx!=null&&Math.max(Math.abs(other.cx-h.cx),Math.abs(other.cy-h.cy))<=3){other.remote=true;other.delay=0;}});
      expired[h.id]=true;
    }else{
      if(hit)hurtPlayer(Math.max(1,Math.round(h.damage-effDef()*(h.kind==='acid'?.25:.65))),owner||null);
      if(h.kind!=='acid')tacticFx(h.cells,h.color,h.kind);h.life--;if(h.life<=0)expired[h.id]=true;
    }
    if(G.state!=='play')break;
  }
  G.hazards=G.hazards.filter(function(h){return !expired[h.id];});
}
function cyberStructureAct(e) {
  var root=G.enemies.find(function(m){return m.uid===e.ownerId&&m.hp>0;});
  if(!root){e.hp=0;killEnemy(e,true);return;}
  if(e.structure==='egg'){
    e.incubation--;e.brain.stance=e.incubation>1?'孵育':'破壳';
    if(e.incubation<=0){e.spawnRoles=['tank','summoner','charger'];var born=summonMinions(e,1);if(born){e.hp=0;killEnemy(e,true);}}
  }else if(e.structure==='nest'||e.structure==='gate'){
    if(e.tick%(e.structure==='gate'?2:3)===0)summonMinions(e,e.structure==='gate'?2:1,['summoner','charger','exploder','chase']);
  }else if(e.structure==='medic'){
    if(e.tick%2===0){var heal=Math.round(root.maxHp*.012);root.hp=Math.min(root.maxHp,root.hp+heal);float(root.x,root.y,'再生 +'+heal,C.green);G.beams.push({x0:e.x+.5,y0:e.y+.5,x1:root.x+.5,y1:root.y+.5,life:240,max:240,color:C.green});}
  }
}
function cyberBossPhase(e) {
  var marks=[.75,.5,.25],ratio=e.hp/e.maxHp;
  if((e.armorUsed||0)<3&&ratio<=marks[e.armorUsed||0]){
    e.armorUsed=(e.armorUsed||0)+1;e.brain.stage=e.armorUsed;
    if(e.id==='bl_warden')e.brain.plate=Math.min(100,e.brain.plate+45);
    showBossBanner(e.name,(e.spec.tacticName||'神经协议')+' · 协议升级','OVERCLOCK');
    dropBossSupplies(4);
  }
}
function bossAct(e,dist) {
  e.brain=e.brain||{step:0,stage:0,plate:100,angle:0};var b=e.brain,d=cyberDistance(e,p);cyberBossPhase(e);
  b.step++;var t=b.step,stage=b.stage||0;
  if(e.id==='bl_hound'){
    if(e.hp<e.maxHp*.35&&!e.enraged){e.enraged=true;e.atk+=2;}
    if(tacticResolve(e))return;
    if(t%5===1&&d<=8){tacticQueue(e,'charge','裂齿突进',tacticLine(e,8),1,Math.round(e.atk*1.55),{cooldown:0});return;}
    if(t%7===4&&d<=3){tacticQueue(e,'maul','咬合深蓄',tacticArea(p.x,p.y,1),2,Math.round(e.atk*2.2),{track:true,radius:1,aftershock:stage>=2});return;}
    b.stance='追猎';if(d>1){stepToward(e,dist);if(e.enraged||t%2===0)stepToward(e,dist);}
    if(cyberDistance(e,p)<=1){enemyMelee(e);if(e.enraged&&cyberAlive(e))hurtPlayer(Math.max(1,Math.round(e.atk*.6)-effDef()),e);}return;
  }
  if(e.id==='bl_hive'){
    b.stance='增殖母床';
    var nests=tacticOwned(e).filter(function(m){return m.structure==='nest';});
    if((t===1||t%7===0)&&nests.length<2+Math.min(1,stage)){var slot=cyberSlots(e,2,4)[0];cyberStructure(e,'nest',slot);}
    if(t%4===0){var eggs=cyberSlots(e,2,5);for(var i=0;i<Math.min(2+stage,eggs.length);i++)cyberStructure(e,'egg',eggs[i]);}
    if(t%3===0){var area=tacticArea(p.x,p.y,1);cyberField(e,'acid',area,1,5,Math.max(4,Math.round(e.atk*.7)),{orphan:false});}
    if(d<=2&&t%2===0)cyberImpact(e,tacticArea(e.x,e.y,2),e.atk+3,'tendril',.5);
    if(d>8)stepToward(e,dist);return;
  }
  if(e.id==='bl_warden'){
    b.stance=b.plate>0?'装甲充能':'反应堆裸露';
    if(b.plate<=0){b.vent=(b.vent||0)+1;if(b.vent>=4){b.plate=100;b.vent=0;}}
    if(tacticResolve(e))return;
    if(t%3===0)e.facing=Math.atan2(p.y-e.y,p.x-e.x);
    if(e.hp<e.maxHp*.5&&t%8===0){tacticQueue(e,'repair','反应堆重铸',[{x:e.x,y:e.y}],2,0,{breakThreshold:e.maxHp*.045});return;}
    if(t%6===1&&d<=4){tacticQueue(e,'hammer','液压重锤',tacticArea(e.x,e.y,3),3,e.atk*3,{aftershock:true});return;}
    if(d<=1){cyberImpact(e,tacticArea(e.x,e.y,1),Math.round(e.atk*1.3),'shield-bash',1);}else if(t%2===0)stepToward(e,dist);return;
  }
  if(e.id==='bl_lance'){
    if(tacticResolve(e))return;
    b.stance='棱镜游骑';
    if(t%5===1&&d<=12){tacticQueue(e,'rail','轨道炮充能',tacticLine(e,18),2,Math.round(e.atk*2.2),{tx:p.x,ty:p.y});return;}
    if(t%6===0&&d<=8&&los(e.x,e.y,p.x,p.y)){cyberPull(e,3);b.stance='磁钩回收';}
    if(d<=9&&los(e.x,e.y,p.x,p.y))cyberLaser(e,p.x,p.y,Math.round(e.atk*(stage>=2?1:.8)),[]);
    if(t%2===0){if(d<5)stepAway(e,dist);else stepToward(e,dist);}return;
  }
  if(e.id==='bl_mine'){
    b.stance='磁网编织';
    var offsets=[[0,0],[2,0],[-2,0],[0,2],[0,-2]],count=stage>=1?3:2;
    if(t%2===1){for(var k=0;k<count;k++){var o=offsets[(t+k)%offsets.length],mx=p.x+o[0],my=p.y+o[1];if(tacticFloor(mx,my))cyberField(e,'mine',tacticArea(mx,my,1),k===0?2:1,9,Math.round(e.atk*1.8),{cx:mx,cy:my});}}
    if(t%5===0){G.hazards.forEach(function(h){if(h.ownerId===e.uid&&h.kind==='mine'){h.remote=true;h.delay=0;}});cyberPulse(e,Math.round(e.atk*.8),'磁暴过载');}
    if(d<5){stepAway(e,dist);if(stage>=2)stepAway(e,dist);}else if(d>8)stepToward(e,dist);return;
  }
  if(e.id==='bl_mirror'){
    b.stance='折光矩阵';var mirrors=tacticOwned(e).filter(function(m){return m.structure==='mirror';});
    if((t===1||t%3===0)&&mirrors.length<10){var spots=cyberSlots(e,2,6);var n=t===1?3:1;for(var m=0;m<Math.min(n,spots.length);m++){var made=cyberStructure(e,'mirror',spots[m]);if(made)made.slant=m%2===0;}mirrors=tacticOwned(e).filter(function(m){return m.structure==='mirror';});}
    if(t%3===1){tacticQueue(e,'mirror-prime','千面聚焦',[],1,0);return;}
    if(e.intent){e.intent=null;var previous={x:e.x,y:e.y};
      cyberLaser(e,p.x,p.y,Math.round(e.atk*1.15),mirrors);
      mirrors.forEach(function(mirror,index){if(!cyberAlive(e))return;var tx=p.x+(index%2?1:-1),ty=p.y+(index%3-1);var ray=cyberRay(mirror,tx,ty,24,mirrors.filter(function(o){return o!==mirror;}));ray.segments.forEach(function(s){s.life=300;s.max=300;s.color='#ff365c';G.beams.push(s);});cyberImpact(e,ray.cells,Math.max(2,Math.round(e.atk*.55)),'refraction',.5);mirror.reflectFx=performance.now();});
      if(mirrors.length&&t%6===2){var destination=mirrors[t%mirrors.length];var swap={x:e.x,y:e.y};e.x=destination.x;e.y=destination.y;destination.x=swap.x;destination.y=swap.y;}return;
    }
    if(d<=1)enemyMelee(e);else if(t%2===0)stepToward(e,dist);return;
  }
  if(e.id==='bh_eye'){
    b.stance='视网膜灼照';
    if(t%3===0)cyberPulse(e,8+G.depth,'不可规避 · 神经灼照');
    if(tacticResolve(e))return;
    if(t%9===1){tacticQueue(e,'annihilate','瞳孔过曝',tacticArea(e.x,e.y,8),3,e.atk*3.2);e.phaseT=3;return;}
    var a=(b.angle||0)*Math.PI/4;b.angle=(b.angle||0)+1;
    cyberLaser(e,e.x+Math.round(Math.cos(a)*12),e.y+Math.round(Math.sin(a)*12),e.atk+4,[]);
    if(stage>=1)cyberLaser(e,e.x-Math.round(Math.sin(a)*12),e.y+Math.round(Math.cos(a)*12),e.atk+2,[]);
    if(t%4===0)cyberField(e,'bomb',tacticArea(p.x,p.y,2),2,1,Math.round(e.atk*1.8));return;
  }
  if(e.id==='bh_hive'){
    b.stance='母巢中枢';var nodes=tacticOwned(e).filter(function(m){return m.structure;});
    if(t===1||t%9===0){var kinds=['relay','medic','gate','nest'],spaces=cyberSlots(e,3,5);for(var ni=0;ni<kinds.length;ni++)if(!nodes.some(function(m){return m.structure===kinds[ni];}))cyberStructure(e,kinds[ni],spaces.pop());}
    if(t%4===0){var pods=cyberSlots(e,2,6);for(var pi=0;pi<Math.min(2+stage,pods.length);pi++)cyberStructure(e,'egg',pods[pi]);}
    if(t%5===0)cyberPull(e,4);
    if(t%3===0)cyberPulse(e,Math.round(e.atk*.65),'巢群神经压迫');
    if(d<=2)cyberImpact(e,tacticArea(e.x,e.y,2),e.atk+2,'tendril',1);return;
  }
  if(e.id==='bh_phase'){
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
  }
  if(d<=1)enemyMelee(e);else stepToward(e,dist);
}
function cyberPull(e,steps) {
  if(cyberDistance(e,p)>10||!los(e.x,e.y,p.x,p.y))return;
  for(var i=0;i<steps;i++){var x=p.x+Math.sign(e.x-p.x),y=p.y+Math.sign(e.y-p.y);if(!tacticFloor(x,y)||occupied(x,y)||wallAt(x,y))break;p.x=x;p.y=y;}
  G.beams.push({x0:e.x+.5,y0:e.y+.5,x1:p.x+.5,y1:p.y+.5,life:220,max:220,color:'#ff365c'});computeFOV();
}
function enemyAct(e,dist) {
  if(G.freeze>0||!cyberAlive(e))return;tacticUid(e);e.brain=e.brain||{step:0,stance:'巡游'};
  if(e.burn>0){e.hp-=2;e.burn--;float(e.x,e.y,'灼烧',C.red);if(e.hp<=0){killEnemy(e);return;}}
  if(e.bleedStacks>0){e.hp-=e.bleedStacks;e.bleedStacks--;if(e.hp<=0){killEnemy(e);return;}}
  if(e.cd>0)e.cd--;if(e.shieldT>0)e.shieldT--;
  if(e.stun>0){e.stun--;e.intent=null;e.phaseT=0;e.brain.stance='神经中断';return;}
  e.tick++;if(e.structure){cyberStructureAct(e);return;}if(e.boss){bossAct(e,dist);return;}
  var d=cyberDistance(e,p),tier=Math.max(1,Math.ceil((e.spec.minDepth||G.depth)/5));
  if(tacticResolve(e))return;
  if(classDef().id==='ghost'&&ghostHidden()&&d>((G.ghostStealth>0||ghostBand()==='high')?1:2)){e.alerted=false;return;}
  if(G.stealth>0){e.alerted=false;return;}
  if(!e.alerted&&G.vis[e.y]&&G.vis[e.y][e.x]&&d<=9)e.alerted=true;
  if(!e.alerted){if(e.ai==='chase'&&Math.random()<.08)wander(e);return;}
  if(e.ai==='turret'){
    e.brain.stance=tier===1?'连发炮座':tier===2?'交叉炮口':'棱镜哨戒';
    if(e.cd<=0&&d<=(e.range||5)+tier-1&&los(e.x,e.y,p.x,p.y)){
      var shots=tier===1?2:3;for(var i=0;i<shots&&cyberAlive(e);i++)cyberLaser(e,p.x+(i===2?1:0),p.y,Math.round(e.atk*(tier===1?.65:.7)),[]);
      e.cd=e.spec.cooldown||2;
    }return;
  }
  if(e.ai==='charger'){
    e.brain.stance='撞角伺服';
    if(e.cd<=0&&d<=7&&los(e.x,e.y,p.x,p.y)){tacticQueue(e,'charge',e.tick%2?'快撞':'压簧回冲',tacticLine(e,5+tier),e.tick%2?1:2,e.atk*1.7,{track:e.tick%2===0,cooldown:2,aftershock:tier>=3});return;}
    if(d<=1)enemyMelee(e);else{stepToward(e,dist);if(tier>=2)stepToward(e,dist);}return;
  }
  if(e.ai==='exploder'){
    e.brain.stance='热核失稳';if(d<=1){tacticQueue(e,'explode','引信过热',tacticArea(e.x,e.y,tier>=3?2:1),1,e.atk*1.8);return;}
    stepToward(e,dist);if(tier>=2&&e.tick%2===0)stepToward(e,dist);return;
  }
  if(e.ai==='summoner'){
    e.brain.stance='递归增殖';
    if(e.cd<=0&&d<=10){summonMinions(e,tier>=3?2:1,tier>=2?['chase','healer','summoner','charger']:['chase','exploder']);e.cd=e.spec.cooldown||4;}
    if(tier>=2&&e.tick%7===0&&cyberChildren(e).filter(function(m){return m.structure==='egg';}).length<2)cyberStructure(e,'egg',cyberSlots(e,1,3)[0]);
    if(d<=2)stepAway(e,dist);else if(d>7)stepToward(e,dist);return;
  }
  if(e.ai==='healer'){
    e.brain.stance='生命回路';
    if(e.cd<=0){var allies=G.enemies.filter(function(m){return m!==e&&m.hp>0&&!m.structure&&cyberDistance(m,e)<=5&&los(e.x,e.y,m.x,m.y);}).sort(function(a,b){return a.hp/a.maxHp-b.hp/b.maxHp;});
      allies.slice(0,tier>=2?2:1).forEach(function(m){var heal=Math.min(m.maxHp-m.hp,Math.round(4+e.atk*1.2));m.hp+=heal;if(tier>=2)m.shieldT=2;G.beams.push({x0:e.x+.5,y0:e.y+.5,x1:m.x+.5,y1:m.y+.5,life:230,max:230,color:C.green});if(heal)float(m.x,m.y,'+'+heal,C.green);});e.cd=e.spec.cooldown||3;
    }
    if(tier>=2&&e.tick%8===0&&(G.corpses||[]).length){var c=G.corpses.pop();if(!occupied(c.x,c.y)&&tacticFloor(c.x,c.y)){var revived=spawnEnemy(c.spec,c.x,c.y,G.depth);revived.hp=Math.max(1,Math.round(revived.hp*.6));revived.maxHp=revived.hp;revived.summoned=true;revived.ownerId=cyberRoot(e);revived.sourceUid=e.uid;revived.noSplit=true;revived.alerted=true;revived.name='重构·'+revived.spec.name;tacticUid(revived);if(G.enemies.length<64)G.enemies.push(revived);}}
    if(d<=2)stepAway(e,dist);else if(d>6)stepToward(e,dist);return;
  }
  if(e.ai==='tank'){
    e.brain.stance='重装推进';e.guard=.55;e.guardAt=0;
    if(d<=2&&e.cd<=0){tacticQueue(e,'hammer','液压落锤',tacticArea(e.x,e.y,2),2,e.atk*2.2,{cooldown:3,aftershock:tier>=2});return;}
    if(d<=1)enemyMelee(e);else if(e.tick%2===0)stepToward(e,dist);return;
  }
  e.brain.stance=tier>=3?'虚空猎步':tier===2?'协同追击':'刃轮追杀';
  if(tier>=3&&d>2&&d<=6&&e.tick%4===0){var flank=freeAdjacent(p.x,p.y);if(flank){burst(e.x,e.y,e.color,8);e.x=flank.x;e.y=flank.y;}}
  else if(d>1){stepToward(e,dist);if(tier>=2&&e.tick%3===0)stepToward(e,dist);}
  if(cyberDistance(e,p)<=1)enemyMelee(e);
}
function previewEnemyDamage(e,amount,origin) {
  var n=Math.max(0,Number(amount)||0);if(!n||!e||e.hp<=0)return 0;
  if(e.phaseT>0)n*=.15;
  if(e.shieldT>0)n*=.7;
  if(e.id==='bl_warden'&&e.brain&&e.brain.plate>0){var from=origin||p;var facing=e.facing==null?Math.PI:e.facing;var dot=Math.cos(Math.atan2(from.y-e.y,from.x-e.x)-facing);if(dot>.15)n*=.22;}
  else if(e.id==='bh_hive'){if(tacticOwned(e).some(function(m){return m.structure==='relay';}))n*=.25;}
  else if(e.guard>0&&e.hp>e.maxHp*(e.guardAt||0))n*=e.guard;
  return Math.max(1,Math.round(n));
}
function damageEnemy(e,amount,origin) {
  var n=previewEnemyDamage(e,amount,origin);if(!n)return 0;
  if(G.sandev)endSandev();e.hp-=n;e.hitFx=performance.now();e.alerted=true;
  if(e.id==='bl_warden'&&e.brain&&e.brain.plate>0){e.brain.plate=Math.max(0,e.brain.plate-Math.max(4,amount*.2));if(e.brain.plate<=0){e.brain.stance='装甲过载';float(e.x,e.y,'破甲',C.amber);}}
  if(e.intent&&e.intent.kind==='repair'){e.intent.taken=(e.intent.taken||0)+n;if(e.intent.taken>=(e.intent.breakThreshold||e.maxHp*.045)){e.intent=null;float(e.x,e.y,'重铸中断',C.cyan);}}
  return n;
}
function dropBossSupplies(n) {
  // Restore the original supply economy: no guaranteed magazines or free energy from hit windows.
  for(var i=0;i<(n||4);i++){var t=randomFloorTile(2,false);if(t)G.items.push({x:t.x,y:t.y,it:i<2?pickHealItem():pickItem(G.depth),seed:Math.random()*TAU});}
}
