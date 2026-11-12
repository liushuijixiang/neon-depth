const {chromium}=require('playwright'),fs=require('fs'),path=require('path');const ROOT=path.resolve(__dirname,'..');
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});const page=await b.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('neon-depth-mute','1'));await page.goto('file://'+path.join(ROOT,'dist.debug.html'));
const result=await page.evaluate(()=>{
 const N=window.__neon,T=N.test,U=T.training,G=N.G,rows=[];let seed=42;function rng(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}Math.random=rng;
 const dist=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));const catalog=U.catalog();
 const builds=[
 {id:'assault-crit',cls:'assault',spec:'berserker',ids:['crit_chip','eye_red','assault_hand_r','hand_red','body_red','spine_red','legL_red','hunt_leg_r']},
 {id:'assault-timeblade',cls:'assault',spec:'berserker',ids:['crit_chip','eye_red','monowire','hand_red','vampire','sandevistan','legL_red','hunt_leg_r']},
 {id:'engineer-swarm',cls:'engineer',spec:'mechanist',ids:['eye_red','quantum_processor','hand_red','assault_hand_r','body_red','drone_swarm','kinetic_legs','legL_red']},
 {id:'engineer-shields',cls:'engineer',spec:'architect',ids:['quantum_processor','eye_red','hand_red','surv_hand_r','body_red','turret_net','kinetic_legs','legL_red']},
 {id:'ghost-execution',cls:'ghost',spec:'phaser',ids:['hunt_eye_r','quantum_processor','hand_red','assault_hand_r','second_heart','cyberdeck','legL_red','kinetic_legs']},
 {id:'ghost-timeblade',cls:'ghost',spec:'assassin',ids:['crit_chip','eye_red','mantis_blade','hand_red','optical_camo','sandevistan','legL_red','hunt_leg_r']}
 ];
 function clean(){T.hideOverlay();G.paused=false;G.busy=false;G.hitStopUntil=0;N.p.pending=0;G.pendingEvo=0;G.pendingBoons=0;}
 function walk(target){const q=[{x:N.p.x,y:N.p.y,first:null}],seen=new Set([N.p.x+','+N.p.y]);let best=null,bestD=dist(N.p,target);
  while(q.length){const c=q.shift();if(c.first&&dist(c,target)<=1){N.doMove(...c.first);return true;}if(c.first&&dist(c,target)<bestD){bestD=dist(c,target);best=c;}for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){if(!dx&&!dy)continue;let x=c.x+dx,y=c.y+dy,key=x+','+y;if(G.map[y]?.[x]!==0||G.enemies.some(e=>e.x===x&&e.y===y)||seen.has(key))continue;seen.add(key);q.push({x,y,first:c.first||[dx,dy]});}}
  if(best){N.doMove(...best.first);return true;}return false;
 }
 function avoid(){const threats=G.enemies.map(e=>e.intent).filter(a=>a&&a.damage>0&&a.turns<=1).map(a=>a.cells).concat(G.hazards.filter(h=>h.active||h.delay<=1).map(h=>h.cells));const bad=(x,y)=>threats.filter(cs=>cs.some(c=>c.x===x&&c.y===y)).length;const now=bad(N.p.x,N.p.y);if(!now||N.shieldPool()>30)return false;const options=[];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const x=N.p.x+dx,y=N.p.y+dy;if(G.map[y]?.[x]===0&&!G.enemies.some(e=>e.x===x&&e.y===y)&&bad(x,y)<now)options.push({dx,dy,cost:bad(x,y)});}options.sort((a,b)=>a.cost-b.cost);if(options.length){N.doMove(options[0].dx,options[0].dy);return true;}return false;}
 function setup(cls,bossSpec,build){seed=731+bossSpec.tier*97;Math.random=rng;G.classId=cls;G.rushPending=null;G.trainPending=true;G.prepPick=null;N.meta.up={};N.startGame();clean();G.depth=bossSpec.tier*5;N.p.level=[0,6,11,16][bossSpec.tier];N.p.xp=0;N.p.next=100000;
  const selected=[];
  if(build){for(let i=0;i<catalog.slots.length;i++){U.install(catalog.slots[i].id,build.ids[i]);selected.push(build.ids[i]);}for(const sl of catalog.slots){const mod=N.mods.find(m=>m.id===G.cyber[sl.id]),cap=catalog.qualities[mod.quality].slots;for(let j=0;j<cap;j++)U.chip(sl.id,j,['atk','hp','def','crit'][j%4],'red');}}
  else{const slots=bossSpec.tier===1?catalog.slots.filter(s=>['eyeL','handL','body','spine','legL'].includes(s.id)):bossSpec.tier===2?catalog.slots.filter(s=>s.id!=='legR'):catalog.slots;
   for(const sl of slots){const pool=N.mods.filter(m=>m.slot===sl.cat&&!m.dropOnly&&!m.achievementOnly&&(!m.cls||m.cls===cls)&&!selected.includes(m.id));const m=T.pickCyber(pool);if(m){U.install(sl.id,m.id);selected.push(m.id);}}
   for(let i=0;i<[0,6,14,24][bossSpec.tier];i++)N.gainChip();
  }
  clean();const e=U.bossArena(bossSpec.id);clean();N.p.level=[0,6,11,16][bossSpec.tier];G.enemies=[];T.chooseSpec(build?.spec||(cls==='engineer'?'mechanist':cls==='ghost'?'assassin':'berserker'));clean();
  if(cls==='assault'){G.gunUp={dmg:bossSpec.tier,cool:Math.min(3,bossSpec.tier),mag:bossSpec.tier,double:bossSpec.tier>=2?1:0,overheat:build?1:0};G.ammoMax=6+2*bossSpec.tier;G.ammo=G.ammoMax;G.energy=14;G.inv=build?['mag_pack','mag_pack','mag_pack','mag_pack']:['mag_pack',catalog.consumables.find(c=>c.effect&&c.effect.heal).id];}
  if(cls==='engineer'){G.scrap=build?100:[0,50,80,100][bossSpec.tier];T.buildItem('mech');T.installModule('laserArm');if(G.scrap>=12)T.installModule('missilePod');if(build&&G.scrap>=10)T.installModule('energyWall');T.toggleMech();}
  clean();G.enemies=[e];G.bossAlive=true;G.hazards=[];G.corpses=[];G.items=[];G.quests=[];N.recalc();N.p.hp=N.p.maxHp;G.freeze=0;G.overT=0;G.burnout=false;N.computeFOV();return {boss:e,selected};
 }
 function run(cls,spec,build){const prepared=setup(cls,spec,build),e=prepared.boss,initial={hp:N.p.maxHp,atk:N.p.atk+G.mod.atk,def:N.p.def,crit:G.mod.crit,life:G.mod.lifesteal,energy:G.energy,scrap:G.scrap,ammo:G.ammo,bossHp:e.hp};const startTurn=G.turn;let actions=0,peak=0,resources=0,stalled=0;
  while(actions++<100&&e.hp>0&&N.p.hp>0&&G.state==='play'){
   clean();peak=Math.max(peak,G.enemies.length);const before=G.turn;const targets=G.enemies.filter(x=>x.hp>0);targets.sort((a,b)=>{const score=x=>(x.structure==='relay'?-8:x.structure==='medic'?-7:x.structure==='nest'||x.structure==='gate'?-6:x.structure==='mirror'?-5:x.structure==='egg'?-4:0)+dist(N.p,x)*.8;return score(a)-score(b);});const target=targets[0]||e;N.p.face=Math.atan2(target.y-N.p.y,target.x-N.p.x);
   const actives=Object.values(G.cyber).map(id=>N.mods.find(m=>m.id===id)).filter(m=>m?.active&&(G.cyberCd[m.id]||0)<=0);
   let acted=false;
   const heal=actives.find(m=>m.active.type==='heal_stealth');if(N.p.hp<N.p.maxHp*.55&&heal){N.useCyberActive(heal.id);acted=true;}
   const shield=actives.find(m=>m.active.type==='shield');if(!acted&&shield&&N.shieldPool()<8){N.useCyberActive(shield.id);acted=true;}
   if(!acted&&avoid())acted=true;
   const support=actives.find(m=>m.active.type==='drone'&&G.allies.filter(a=>a.kind==='drone').length<3||m.active.type==='turret'&&G.allies.filter(a=>a.kind==='turret').length<2);
   if(!acted&&support){N.useCyberActive(support.id);acted=true;}
   const bladeBuild=!!build&&build.id.includes('timeblade');
   const time=actives.find(m=>m.active.type==='sandevistan'),cloak=actives.find(m=>m.active.type==='stealth'),grow=actives.find(m=>m.active.type==='grow');
   if(!acted&&bladeBuild&&time&&!G.sandev&&dist(N.p,target)>1){N.useCyberActive(time.id);acted=true;}
   if(!acted&&bladeBuild&&dist(N.p,target)<=2&&N.meleeWeapon()?.melee?.type==='charge'&&!G.melee.charge){N.startMeleeCharge();acted=G.turn!==before;}
   if(!acted&&bladeBuild&&cloak&&G.stealth<=0&&dist(N.p,target)<=2){N.useCyberActive(cloak.id);acted=true;}
   if(!acted&&grow&&!N.p.buffs.some(b=>b.id==='grow')&&dist(N.p,target)<=4){N.useCyberActive(grow.id);acted=true;}
   if(!acted&&bladeBuild&&dist(N.p,target)<=1){N.doMove(target.x-N.p.x,target.y-N.p.y);acted=G.turn!==before;}
   if(!acted&&cls==='ghost'&&!bladeBuild){const band=N.ghostBand();if((band==='high'||band==='over')&&T.ghostTarget('execute')){N.ghostAct('execute');acted=true;}else if(band==='mid'&&T.ghostTarget('assassinate')){N.ghostAct('assassinate');acted=true;}else if(band!=='low'&&actives.some(m=>m.active.type==='mark_scan')){N.useCyberActive(actives.find(m=>m.active.type==='mark_scan').id);acted=true;}}
   const offensive=actives.find(m=>{const type=m.active.type,d=dist(N.p,target);return type==='multi'&&d<=6||type==='beam'&&d<=7&&(target.x===N.p.x||target.y===N.p.y||Math.abs(target.x-N.p.x)===Math.abs(target.y-N.p.y))||type==='arc'&&d<=3||type==='burst'&&d<=2||['cleave','cleave_bleed','lifesteal_burst'].includes(type)&&d<=1||type==='mine'&&d<=5;});
   if(!acted&&offensive){N.useCyberActive(offensive.id);acted=G.turn!==before;}
   if(!acted){const close=G.enemies.filter(x=>dist(N.p,x)<=1).length;const inherited=N.activeSkills().find(s=>(G.cd[s.id]||0)<=0&&(s.ability==='nova'&&close>=2||s.ability==='shot'&&dist(N.p,target)<=6||s.ability==='drone'&&G.allies.filter(a=>a.kind==='drone').length<3||s.ability==='grow'&&!N.p.buffs.some(b=>b.id==='grow')&&dist(N.p,target)<=2||s.ability==='wall'&&close>=2&&G.walls.length<3));if(inherited){N.useAbility(inherited.id);acted=G.turn!==before;}}
   if(!acted&&cls==='assault'){
    const near=G.enemies.slice().sort((a,b)=>dist(N.p,a)-dist(N.p,b))[0];
    if(G.ammo>0&&dist(N.p,near)<=7)T.gunFire();else if(G.ammo===0&&G.inv.length&&G.energy>=T.gunReloadCost())T.reloadWithItem(0);else if(dist(N.p,target)<=1)N.doMove(target.x-N.p.x,target.y-N.p.y);else walk(target);
    if(G.ammo===0&&(!G.inv.length||G.energy<T.gunReloadCost()))resources++;
   }else if(!acted&&cls==='engineer'){
    if(G.mech>0&&G.mechMods.includes('missilePod')&&(G.mechCd.missile||0)<=0)T.mechMissiles();
    else if(G.mech>0&&(target.x===N.p.x||target.y===N.p.y||Math.abs(target.x-N.p.x)===Math.abs(target.y-N.p.y)))T.fireLaser();
    else if(!G.mechBuilt&&G.scrap>=24){T.buildItem('mech');clean();T.toggleMech();}
    else if(dist(N.p,target)<=1)N.doMove(target.x-N.p.x,target.y-N.p.y);else walk(target);
   }else if(!acted&&cls==='ghost'){
    const band=N.ghostBand();if(band==='low'){if(!N.ghostHidden())N.ghostAct('stealth');else if(T.ghostTarget('chase'))N.ghostAct('chase');else walk(target);}
    else if(band==='mid'){if(T.ghostTarget('assassinate'))N.ghostAct('assassinate');else if(!N.ghostHidden())N.ghostAct('vanish');else walk(target);}
    else{if(T.ghostTarget('execute'))N.ghostAct('execute');else if(T.ghostTarget('blood'))N.ghostAct('blood');else if(!N.ghostHidden())N.ghostAct('vanish');else walk(target);}
   }
   if(G.turn===before&&G.state==='play'){stalled++;N.doMove(0,0);}N.computeFOV();T.updateFx(100);
  }
  rows.push({class:cls,profile:build?.id||'stage-weighted-drop',boss:spec.id,tier:spec.tier,gear:prepared.selected,initial,win:e.hp<=0,reason:e.hp<=0?'defeated':N.p.hp<=0?'down':'turn-budget',turns:G.turn-startTurn,hp:Math.max(0,N.p.hp),remaining:Math.max(0,e.hp),peakEntities:peak,resourceLimitedTurns:resources,stalled});
 }
 for(const cls of ['assault','engineer','ghost'])for(const spec of N.bosses())run(cls,spec,null);
 for(const build of builds)for(const spec of N.bosses().filter(b=>b.tier===3||b.id==='bl_hound'))run(build.cls,spec,build);
 return {method:'27场分阶段真实权重配装+24场强力组合对照；6/11/16级，普通配置按当层pickCyber与gainChip，强力组合合法满槽红芯片；真实职业动作/义体主动，100步上限。不要求全部获胜，不模拟完整跑图经济，不等于玩家通关率。',rows};
});result.errors=errors;fs.writeFileSync(path.join(ROOT,'chrome-balance-results.json'),JSON.stringify(result,null,2));console.log(result.method);for(const group of ['stage-weighted-drop','assault-crit','assault-timeblade','engineer-swarm','engineer-shields','ghost-execution','ghost-timeblade']){const r=result.rows.filter(x=>x.profile===group);console.log(group,r.filter(x=>x.win).length+'/'+r.length,'wins','turns',r.map(x=>x.turns).join(','));}console.log('errors',errors);await b.close();if(errors.length)process.exit(1);})().catch(e=>{console.error(e);process.exit(1);});
