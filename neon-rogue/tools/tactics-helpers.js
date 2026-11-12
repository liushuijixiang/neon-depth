function tacticUid(e) {
  if (!e.uid) { G.enemySerial = (G.enemySerial || 0) + 1; e.uid = G.enemySerial; }
  return e.uid;
}
function tacticFloor(x, y) { return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && G.map[y][x] !== WALL; }
function tacticArea(x, y, radius, inner) {
  var cells = [];
  for (var yy = y-radius; yy <= y+radius; yy++) for (var xx = x-radius; xx <= x+radius; xx++) {
    var d = Math.max(Math.abs(xx-x), Math.abs(yy-y));
    if (d >= (inner || 0) && tacticFloor(xx,yy) && los(x,y,xx,yy)) cells.push({x:xx,y:yy});
  }
  return cells;
}
function tacticMerge(a,b) {
  var out=[],seen={}; a.concat(b).forEach(function(c){var k=c.x+','+c.y;if(!seen[k]){seen[k]=1;out.push(c);}});return out;
}
function tacticLine(e, range, tx, ty) {
  if (tx == null) { tx=p.x;ty=p.y; }
  var vx=tx-e.x,vy=ty-e.y,length=Math.max(Math.abs(vx),Math.abs(vy));if(!length)return [];
  var ex=e.x+Math.round(vx*range/length),ey=e.y+Math.round(vy*range/length);
  var x=e.x,y=e.y,dx=Math.abs(ex-x),dy=-Math.abs(ey-y),sx=x<ex?1:-1,sy=y<ey?1:-1,err=dx+dy,cells=[];
  for(var n=0;n<range;n++){
    var oldX=x,oldY=y,twice=2*err;if(twice>=dy){err+=dy;x+=sx;}if(twice<=dx){err+=dx;y+=sy;}
    if(!tacticFloor(x,y)||wallAt(x,y))break;
    if(x!==oldX&&y!==oldY&&!tacticFloor(x,oldY)&&!tacticFloor(oldX,y))break;
    cells.push({x:x,y:y});if(x===ex&&y===ey)break;
  }return cells;
}
function tacticOwned(e){var id=tacticUid(e);return G.enemies.filter(function(m){return m.hp>0&&m.summoned&&m.ownerId===id;});}
function tacticSpawnCells(e,count){return tacticArea(e.x,e.y,2,1).filter(function(c){return !occupied(c.x,c.y);}).slice(0,count);}
function tacticQueue(e,kind,label,cells,turns,damage,extra){
  e.intent={kind:kind,label:label,cells:cells||[],turns:turns||1,color:e.color,damage:damage||0,recovery:1,startHp:e.hp};
  Object.keys(extra||{}).forEach(function(k){e.intent[k]=extra[k];});
  msg(e.name+' · '+label+'（'+e.intent.turns+'T）','warn');
}
function tacticFx(cells,color,kind){
  G.tacticFx=(G.tacticFx||[]).filter(function(f){return performance.now()-f.born<900;});
  G.tacticFx.push({cells:cells.slice(),color:color,kind:kind,born:performance.now()});if(G.tacticFx.length>20)G.tacticFx.shift();
}
function tacticResolve(e){
  var action=e.intent;if(!action)return false;action.turns--;if(action.turns>0)return true;
  e.intent=null;e.phaseT=0;var cells=action.cells,hit=false;
  if(action.kind==='charge'){
    var traversed=[];
    for(var i=0;i<cells.length;i++){
      var c=cells[i];if(!tacticFloor(c.x,c.y)||wallAt(c.x,c.y))break;var blocker=enemyAt(c.x,c.y);if(blocker&&blocker!==e)break;
      traversed.push(c);if(c.x===p.x&&c.y===p.y)break;e.x=c.x;e.y=c.y;
    }cells=traversed;
  }else if(action.kind==='blink'&&action.land){
    if(!occupied(action.land.x,action.land.y)&&tacticFloor(action.land.x,action.land.y)){burst(e.x,e.y,e.color,8);e.x=action.land.x;e.y=action.land.y;}else cells=[];
  }
  hit=cells.some(function(c){return c.x===p.x&&c.y===p.y;});tacticFx(cells,action.color,action.kind);
  if(action.kind==='heal'){
    var target=action.target||e;
    if(e.hp<action.startHp||target.hp<=0||G.enemies.indexOf(target)<0||Math.max(Math.abs(e.x-target.x),Math.abs(e.y-target.y))>4||!los(e.x,e.y,target.x,target.y))float(e.x,e.y,'修复中断',C.amber);
    else {var heal=Math.min(target.maxHp-target.hp,action.heal||8);target.hp+=heal;float(target.x,target.y,'+'+heal,C.green);}
  }else if(action.kind==='summon'){e.spawnCells=action.cells;summonMinions(e,action.count||1);e.spawnCells=null;}
  else if(action.kind==='pull'&&hit&&los(e.x,e.y,p.x,p.y)){
    for(var j=0;j<2;j++){var nx=p.x+(e.x===p.x?0:e.x>p.x?1:-1),ny=p.y+(e.y===p.y?0:e.y>p.y?1:-1);if(!tacticFloor(nx,ny)||occupied(nx,ny)||wallAt(nx,ny))break;p.x=nx;p.y=ny;}
    computeFOV();float(p.x,p.y,'牵引',C.violet);
  }else if(hit&&action.damage>0)hurtPlayer(Math.max(1,action.damage-effDef()),e);
  if(action.kind==='explode'){killEnemy(e,true);return true;}
  e.cd=action.cooldown==null?(e.spec.cooldown||2):action.cooldown;e.recovery=action.recovery==null?1:action.recovery;return true;
}
function tacticBossPlan(e,kind){
  var cells,land,damage=e.atk,radius;
  if(kind==='charge'){
    cells=tacticLine(e,e.id==='bh_phase'?7:6);tacticQueue(e,'charge','锁线冲锋 · 侧移避开',cells,1,damage+3,{recovery:2,cooldown:0});
  }else if(kind==='claw'||kind==='slam'||kind==='inner'){
    radius=kind==='slam'?2:1;tacticQueue(e,'slam',kind==='slam'?'重锤蓄力 · 离开两格圈':'近身横扫 · 离开红格',tacticArea(e.x,e.y,radius),radius===2?2:1,damage+(kind==='slam'?4:1),{recovery:2,cooldown:0});
  }else if(kind==='summon'||kind==='brood'||kind==='clone'){
    var cap=e.id==='bh_hive'?6:4,count=Math.min(kind==='brood'?3:2,cap-tacticOwned(e).length);if(count<=0)return false;
    cells=tacticSpawnCells(e,count);if(!cells.length)return false;tacticQueue(e,'summon',kind==='clone'?'镜像成形 · 伤害打断':'孵化蓄力 · 伤害打断或占位',cells,2,0,{count:count,recovery:1,cooldown:0});
  }else if(kind==='ring'||kind==='phaseWave'||kind==='web'){
    var outer=kind==='phaseWave'?4:3,inner=2;cells=tacticArea(e.x,e.y,outer,inner);
    tacticQueue(e,'pulse',kind==='phaseWave'?'相位环波 · 贴近核心或退到五格':'环带腐蚀 · 内圈一格安全',cells,2,Math.max(4,damage-2),{recovery:2,cooldown:0});if(kind==='phaseWave')e.phaseT=2;
  }else if(kind==='heal'){
    if(e.hp>e.maxHp*.5||(e.healUsed||0)>=2)return false;e.healUsed=(e.healUsed||0)+1;e.guard=0;
    tacticQueue(e,'heal','修复充能 · 造成伤害即可打断',[{x:e.x,y:e.y}],2,0,{heal:Math.round(e.maxHp*.08),target:e,recovery:2,cooldown:0,color:C.green});
  }else if(kind==='laser'||kind==='pull'){
    cells=tacticLine(e,kind==='laser'?10:6);tacticQueue(e,kind,kind==='laser'?'棱镜射线 · 横移离线':'磁力牵引 · 离开锁线',cells,1,kind==='laser'?damage+3:0,{recovery:1,cooldown:0});
  }else if(kind==='mines'){
    cells=tacticArea(p.x,p.y,1);if(Math.max(Math.abs(e.x-p.x),Math.abs(e.y-p.y))>4)cells=tacticMerge(cells,tacticArea(e.x,e.y,1));
    tacticQueue(e,'bomb','磁雷倒数 · 两步离开一格爆区',cells,2,damage+2,{recovery:1,cooldown:0});
  }else if(kind==='blink'){
    land=freeAdjacent(p.x,p.y);if(!land)return false;tacticQueue(e,'blink','镜袭落点 · 离开亮格',tacticArea(land.x,land.y,1),2,damage+2,{land:land,recovery:2,cooldown:0});
  }else if(kind==='crossfire'){
    cells=tacticArea(p.x,p.y,4).filter(function(c){return c.x===p.x||c.y===p.y;});tacticQueue(e,'laser','十字审判 · 斜移进入象限',cells,2,damage+3,{recovery:2,cooldown:0});
  }else if(kind==='sweep'){
    cells=tacticArea(e.x,e.y,6).filter(function(c){return Math.abs(c.x-e.x+(e.tacticStep||0))%3===0;});tacticQueue(e,'laser','条带扫射 · 相邻列为安全区',cells,1,damage,{recovery:1,cooldown:0});
  }else return false;return true;
}
