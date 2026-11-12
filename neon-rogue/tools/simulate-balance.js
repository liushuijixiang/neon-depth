const {chromium}=require('playwright'),fs=require('fs'),path=require('path');const ROOT=path.resolve(__dirname,'..');
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});const page=await b.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+path.join(ROOT,'dist.html'));
const report=await page.evaluate(()=>{
 const N=window.__neon,T=N.test,G=N.G,rows=[];let seed=712;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const dist=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
 function clearModal(){T.hideOverlay();G.paused=false;G.busy=false;N.p.pending=0;G.pendingEvo=0;G.pendingBoons=0;G.hitStopUntil=0;}
 function moveToward(target){let choices=[];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){if(!dx&&!dy)continue;let c={x:N.p.x+dx,y:N.p.y+dy};if(G.map[c.y]?.[c.x]!==0||G.enemies.some(e=>e.x===c.x&&e.y===c.y))continue;choices.push({dx,dy,score:dist(c,target)});}choices.sort((a,b)=>a.score-b.score);if(choices.length)N.doMove(choices[0].dx,choices[0].dy);else N.doMove(0,0);}
 function dodge(){
   const intents=G.enemies.map(e=>e.intent).filter(a=>a&&a.damage>0);if(!intents.some(a=>a.cells.some(c=>c.x===N.p.x&&c.y===N.p.y)))return false;
   let q=[{x:N.p.x,y:N.p.y,path:[]}],seen=new Set();
   while(q.length){const c=q.shift();if(c.path.length&&intents.every(a=>!a.cells.some(d=>d.x===c.x&&d.y===c.y))){N.doMove(...c.path[0]);return true;}if(c.path.length>=2)continue;
     for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){if(!dx&&!dy)continue;const x=c.x+dx,y=c.y+dy,step=c.path.length+1;if(G.map[y]?.[x]!==0||G.enemies.some(e=>e.x===x&&e.y===y))continue;if(intents.some(a=>a.turns<=step&&a.cells.some(d=>d.x===x&&d.y===y)))continue;const key=x+','+y+','+step;if(seen.has(key))continue;seen.add(key);q.push({x,y,path:c.path.concat([[dx,dy]])});}}
   return false;
 }
 for(const cls of ['assault','engineer','ghost'])for(const spec of N.bosses()){
   seed=712+spec.tier;G.classId=cls;G.rushPending=null;G.trainPending=true;N.startGame();clearModal();T.genTrainMap();N.p.level=spec.tier===1?6:spec.tier===2?11:16;
   // Fixed, modest acquired build: 2/4/6 items; no meta upgrades, chips or red gear.
   const gear=['gorilla_arms','subdermal_armor','surv_spine_p','hunt_eye_p','assault_leg_p','assault_hand_p'];
   const equipped=[];for(const id of gear.slice(0,spec.tier*2)){const m=N.mods.find(m=>m.id===id);if(m){N.applyMod(m);equipped.push(id);}}
   N.recalc();N.p.hp=N.p.maxHp;G.enemies=[];G.items=[];G.allies=[];G.quests=[];G.depth=spec.tier*5;N.p.x=18;N.p.y=15;G.instab=25;G.freeze=0;G.burnout=false;G.overT=0;
   if(cls==='assault'){G.gunUp={dmg:spec.tier,cool:spec.tier,mag:1};G.ammoMax=8;G.ammo=8;G.energy=14;G.inv=['mag_pack','mag_pack','mag_pack','mag_pack'];}
   if(cls==='engineer'){G.scrap=spec.tier===1?60:100;T.buildItem('mech');T.installModule('laserArm');T.installModule('missilePod');T.toggleMech();clearModal();}
   const boss=N.spawnBoss(spec,22,15,G.depth);G.enemies=[boss];G.bossAlive=true;N.computeFOV();const initial={hp:N.p.maxHp,atk:N.p.atk+G.mod.atk,def:N.p.def,bossHp:boss.hp};let steps=0,start=G.turn,damageTaken=0,lastHP=N.p.hp,invalid=0;
   while(steps++<180&&boss.hp>0&&N.p.hp>0&&G.state==='play'){
     clearModal();const before=G.turn;
     if(!dodge()){
       const target=G.enemies.filter(e=>e.hp>0).sort((a,b)=>dist(a,N.p)-dist(b,N.p))[0];
       const active=equipped.map(id=>N.mods.find(m=>m.id===id)).find(m=>m?.active&&(G.cyberCd[m.id]||0)<=0&&((m.active.type==='heal_stealth'&&N.p.hp<N.p.maxHp*.65)||(m.active.type==='cleave'&&dist(N.p,target)<=1)));
       if(active)N.useCyberActive(active.id);
       if(G.turn===before&&cls==='assault'){
         if(G.ammo>0&&dist(N.p,target)<=7)T.gunFire();else if(G.ammo<=0&&G.inv.length&&G.energy>=T.gunReloadCost())T.reloadWithItem(0);else if(dist(N.p,target)<=1)N.doMove(target.x-N.p.x,target.y-N.p.y);else moveToward(target);
       }else if(G.turn===before&&cls==='engineer'){
         if(G.mech>0&&(N.p.x===target.x||N.p.y===target.y||Math.abs(N.p.x-target.x)===Math.abs(N.p.y-target.y))){N.p.face=Math.atan2(target.y-N.p.y,target.x-N.p.x);T.fireLaser();}
         else if(!G.mechBuilt&&G.scrap>=24){T.buildItem('mech');T.toggleMech();}
         else if(dist(N.p,target)<=1)N.doMove(target.x-N.p.x,target.y-N.p.y);else moveToward(target);
       }else if(G.turn===before&&cls==='ghost'){
         const band=N.ghostBand();if(band==='low'){if(!(G.ghostStealth>0))N.ghostAct('stealth');else if(T.ghostTarget('chase'))N.ghostAct('chase');else moveToward(target);}
         else if(band==='mid'){if(T.ghostTarget('assassinate'))N.ghostAct('assassinate');else if(G.ghostRevealed)N.ghostAct('vanish');else moveToward(target);}
         else{if(T.ghostTarget('execute'))N.ghostAct('execute');else if(T.ghostTarget('blood'))N.ghostAct('blood');else if(G.ghostRevealed)N.ghostAct('vanish');else moveToward(target);}
       }
     }
     if(G.turn===before&&G.state==='play'){invalid++;N.doMove(0,0);}
     damageTaken+=Math.max(0,lastHP-N.p.hp);lastHP=N.p.hp;N.computeFOV();
   }
   rows.push({class:cls,boss:spec.id,tier:spec.tier,kit:equipped,initial,win:boss.hp<=0,turns:G.turn-start,hp:Math.max(0,N.p.hp),bossRemaining:Math.max(0,boss.hp),damageTaken,invalid});
 }
 return {method:'单种子开放训练场；无局外升级和芯片，固定2/4/6件非红义体；脚本只通过真实角色动作，并尝试躲避预警。不是玩家通关率。',rows};
});report.errors=errors;fs.writeFileSync(path.join(ROOT,'balance-results.json'),JSON.stringify(report,null,2));console.log(report.rows.map(r=>[r.class,r.boss,r.win?'WIN':'LOSS',r.turns+'T','hp='+r.hp,'boss='+r.bossRemaining].join(' ')).join('\n'));console.log('ERRORS',errors);await b.close();if(errors.length)process.exit(1);})().catch(e=>{console.error(e);process.exit(1);});
