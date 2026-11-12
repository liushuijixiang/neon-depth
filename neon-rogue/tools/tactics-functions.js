function spawnBoss(spec,x,y,depth){
  var tier=spec.tier||bossTierFor(depth),hp=Math.round(spec.hp*(tier===1?4:tier===2?6:8)*(G.mode==='rush'?1.6:1));
  var e={spec:spec,id:spec.id,name:spec.name,ai:'boss',glyph:spec.glyph,color:spec.color,x:x,y:y,hp:hp,maxHp:hp,atk:spec.atk+(tier-1)*2,def:spec.def,xp:spec.xp+depth*5,range:0,cd:0,cd2:0,tick:0,stun:0,alerted:true,boss:true,elite:false,
    abilities:(spec.abilities||[]).map(function(a){return typeof a==='string'?{type:a,cd:4}:a;}),abiCd:{},guard:spec.id==='bl_warden'?.6:0,guardAt:spec.id==='bh_hive'?0:.5,phaseT:0,laser:null,bomb:null,armorT:0,armorUsed:0,buffs:[],burn:0,enraged:false,intent:null,recovery:0,tacticStep:0,healUsed:0};
  tacticUid(e);return e;
}
function bossAct(e,dist){
  var id=e.id,ratio=e.hp/e.maxHp;
  if(id==='bh_hive'){e.guard=tacticOwned(e).length>0?.6:0;e.guardAt=0;}
  if(id==='bl_warden')e.guard=ratio>.5?.6:0;
  if((id==='bl_hound'||id==='bl_mirror')&&!e.enraged&&ratio<=.35){e.enraged=true;e.atk+=2;toast(e.name+' 狂猎 · 预警仍可躲避','bad');}
  if(!e.halfSupply&&ratio<=.5){e.halfSupply=true;dropBossSupplies(2);}
  if(tacticResolve(e))return;
  var distance=Math.max(Math.abs(e.x-p.x),Math.abs(e.y-p.y));if(distance>10){stepToward(e,dist);return;}
  var patterns={bl_hound:['charge','claw','charge'],bl_hive:['summon','ring','claw'],bl_warden:['slam','heal','claw'],bl_lance:['laser','pull','laser'],bl_mine:['mines','web','mines'],bl_mirror:['blink','clone','claw'],bh_eye:['crossfire','mines','sweep'],bh_hive:['brood','pull','ring'],bh_phase:ratio>.66?['phaseWave','charge']:ratio>.33?['inner','charge','phaseWave']:['charge','phaseWave','inner']};
  var pattern=patterns[id]||['charge','claw'];
  for(var i=0;i<pattern.length;i++){
    var next=pattern[(e.tacticStep||0)%pattern.length];e.tacticStep=(e.tacticStep||0)+1;
    if((next==='claw'||next==='slam'||next==='inner')&&distance>3)continue;
    if((next==='laser'||next==='pull'||next==='charge')&&!los(e.x,e.y,p.x,p.y))continue;
    if(next==='pull'&&distance>6)continue;if(tacticBossPlan(e,next))return;
  }stepToward(e,dist);
}
function tickHazards(){
  if(G.freeze>0)return;
  for(var i=(G.hazards||[]).length-1;i>=0;i--){
    var h=G.hazards[i];if(!h.ownerId||!Array.isArray(h.cells)||!G.enemies.some(function(e){return e.hp>0&&e.uid===h.ownerId;})){G.hazards.splice(i,1);continue;}
    h.t--;if(h.t>0)continue;G.hazards.splice(i,1);tacticFx(h.cells,h.color||C.amber,h.kind||'bomb');
    if(h.cells.some(function(c){return c.x===p.x&&c.y===p.y;}))hurtPlayer(Math.max(1,(h.damage||6)-effDef()),null);
  }
}
function tickMines(){
  if(G.freeze>0)return;
  for(var i=(G.mines||[]).length-1;i>=0;i--){var mn=G.mines[i];mn.t--;if(mn.t>0)continue;G.mines.splice(i,1);burst(mn.x,mn.y,C.amber,26);G.shake=8;var cells=tacticArea(mn.x,mn.y,1);tacticFx(cells,C.amber,'mine');
    G.enemies.slice().forEach(function(e){if(cells.some(function(c){return c.x===e.x&&c.y===e.y;})){var damage=damageEnemy(e,mn.dmg);float(e.x,e.y,'-'+damage,C.amber,true);if(e.hp<=0)killEnemy(e);}});
  }
}
function summonMinions(e,n){
  if(e.summoned)return;var cap=e.id==='bh_hive'?6:e.boss?4:2;n=Math.max(0,Math.min(n,cap-tacticOwned(e).length,24-G.enemies.length));if(!n)return;
  var pool=MONSTERS.filter(function(m){return !m.boss&&m.ai==='chase'&&m.onDeath==='none'&&G.depth>=m.minDepth&&G.depth<=m.maxDepth;});
  if(!pool.length)pool=MONSTERS.filter(function(m){return !m.boss&&m.ai==='chase'&&m.onDeath==='none';});if(!pool.length)return;
  var spots=e.spawnCells||tacticSpawnCells(e,n),spawned=0;
  for(var i=0;i<spots.length&&spawned<n;i++){
    var c=spots[i];if(!tacticFloor(c.x,c.y)||occupied(c.x,c.y)||wallAt(c.x,c.y))continue;var spec=pick(pool),m=spawnEnemy(spec,c.x,c.y,G.depth);
    var eliteMul=m.elite?((G.chal&&G.chal.eliteBuff)?2.1:1.6):1;m.hp=Math.max(3,Math.round(m.hp*(e.id==='bl_mirror'?.3:.45)/eliteMul));m.maxHp=m.hp;m.atk=Math.max(1,Math.round(m.atk*.7));
    m.elite=false;m.xp=0;m.alerted=true;m.noSplit=true;m.summoned=true;m.ownerId=tacticUid(e);m.name=e.id==='bl_mirror'?'镜像残影':'孵化幼体';m.color=e.color;m.ai='chase';tacticUid(m);G.enemies.push(m);spawned++;
  }
  if(spawned){msg(e.name+' 增援 +'+spawned+'（上限 '+cap+'）','bad');burst(e.x,e.y,e.color,10);}
}
function enemyAct(e,dist){
  if(G.freeze>0||e.hp<=0)return;tacticUid(e);
  if(e.burn>0){e.hp-=2;e.burn--;float(e.x,e.y,'-2',C.red);if(e.hp<=0){killEnemy(e);return;}}
  if(e.bleedStacks>0){e.hp-=e.bleedStacks;float(e.x,e.y,'流血 -'+e.bleedStacks,C.red);e.bleedStacks--;if(e.hp<=0){killEnemy(e);return;}}
  if(e.id==='bh_hive'&&e.boss){e.guard=tacticOwned(e).length?.6:0;e.guardAt=0;}
  if(e.cd>0)e.cd--;
  if(e.stun>0){e.stun--;e.intent=null;e.phaseT=0;e.recovery=Math.max(e.recovery||0,1);return;}
  e.tick++;if(e.recovery>0){e.recovery--;if(e.ai==='tank')e.guard=0;return;}
  if(e.boss){bossAct(e,dist);return;}
  var cheb=Math.max(Math.abs(e.x-p.x),Math.abs(e.y-p.y));if(tacticResolve(e))return;
  if(classDef().id==='ghost'&&ghostHidden()){var detect=(G.ghostStealth>0||ghostBand()==='high')?1:2;if(cheb>detect){e.alerted=false;return;}}
  if(G.stealth>0){e.alerted=false;return;}
  if(!e.alerted&&G.vis[e.y][e.x]&&cheb<=9)e.alerted=true;
  if(!e.alerted){if(e.ai==='chase'&&Math.random()<.08)wander(e);return;}
  if(e.ai==='turret'){
    if(e.cd<=0&&cheb<=(e.range||5)&&los(e.x,e.y,p.x,p.y))tacticQueue(e,'shot','炮口锁线 · 横移躲避',tacticLine(e,e.range||5),1,e.atk,{recovery:0});return;
  }
  if(e.ai==='exploder'){
    if(cheb<=2)tacticQueue(e,'explode','自爆倒数 · 离开一格圈',tacticArea(e.x,e.y,1),2,Math.round(e.atk*1.4),{recovery:0});else stepToward(e,dist);return;
  }
  if(e.ai==='summoner'){
    if(e.summoned){if(cheb<=1)enemyMelee(e);else stepToward(e,dist);return;}
    if(e.cd<=0&&cheb<=8&&tacticOwned(e).length<2&&G.enemies.length<24){var cells=tacticSpawnCells(e,1);if(cells.length){tacticQueue(e,'summon','孵化通道 · 受伤打断/占位阻止',cells,2,0,{count:1,recovery:0});return;}}
    if(cheb<=2)stepAway(e,dist);else if(cheb>6)stepToward(e,dist);return;
  }
  if(e.ai==='healer'){
    var ally=null,need=0;G.enemies.forEach(function(other){if(other===e||other.hp<=0||other.hp>=other.maxHp)return;var d=Math.max(Math.abs(other.x-e.x),Math.abs(other.y-e.y));if(d<=4&&los(e.x,e.y,other.x,other.y)&&other.maxHp-other.hp>need){ally=other;need=other.maxHp-other.hp;}});
    if(e.cd<=0&&ally){tacticQueue(e,'heal','修复连线 · 受伤即可打断',[{x:e.x,y:e.y},{x:ally.x,y:ally.y}],1,0,{target:ally,heal:Math.min(12,3+e.atk),recovery:0,color:C.green});return;}
    if(cheb<=2)stepAway(e,dist);else if(cheb>6)stepToward(e,dist);return;
  }
  if(e.ai==='charger'){
    if(e.cd<=0&&cheb<=6&&los(e.x,e.y,p.x,p.y)){tacticQueue(e,'charge','冲撞蓄力 · 侧移避开',tacticLine(e,4),1,e.atk+2,{recovery:1});return;}
    if(cheb<=1)enemyMelee(e);else stepToward(e,dist);return;
  }
  if(e.ai==='tank'){
    e.guard=.75;e.guardAt=0;if(cheb<=1){e.guard=0;tacticQueue(e,'slam','重击蓄力 · 退一步后反击',tacticArea(e.x,e.y,1),1,e.atk+3,{recovery:2});}else if(e.tick%2===0)stepToward(e,dist);return;
  }
  if(cheb<=1)enemyMelee(e);else stepToward(e,dist);
}
