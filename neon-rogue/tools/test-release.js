const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');const ROOT=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await context.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!localStorage.getItem('release-seeded')){localStorage.setItem('neon-depth-meta',JSON.stringify({cores:2000,up:{},stash:{cyber:['subdermal_armor',{id:'subdermal_armor',chips:[{id:'atk',quality:'blue',stat:'atk',value:2,affixes:[]}]}],chips:[{id:'hp',quality:'gray',stat:'maxHp',value:5,affixes:[]}]},tickets:[]}));localStorage.setItem('neon-depth-stats',JSON.stringify({kills:17,bossKills:2,wins:1,bestDepth:6,shards:3,itemsUsed:2}));localStorage.setItem('neon-depth-ach',JSON.stringify({custom_old_record:true}));localStorage.setItem('release-seeded','1');}localStorage.setItem('neon-depth-mute','1');});
 await page.goto('file://'+path.join(ROOT,'dist.html'));
 checks.push(await page.evaluate(()=>({name:'兼容旧字符串仓库及镶嵌芯片',pass:window.__neon.meta.stash.cyber.length===2&&window.__neon.meta.stash.cyber[1].chips.length===1&&window.__neon.stats.kills===17&&window.__neon.unlocked.custom_old_record===true})));
 await page.evaluate(()=>window.__neon.test.prepScreen());await page.locator('[data-stash="1"]').click();await page.locator('#prepGo').click();
 checks.push(await page.evaluate(()=>{const N=window.__neon;return {name:'按实例带入仅消耗选中副本和已镶芯片',pass:N.meta.stash.cyber.length===1&&N.meta.stash.chips.length===1&&Object.values(N.G.cyberChips).some(a=>a.length===1)&&N.G.modBag.includes('subdermal_armor')};}));
 await page.reload();checks.push(await page.evaluate(()=>({name:'实例消费持久化后未丢另一件',pass:window.__neon.meta.stash.cyber.length===1&&window.__neon.meta.stash.chips.length===1})));
 const mechanics=await page.evaluate(()=>{
  const N=window.__neon,T=N.test,G=N.G,out=[];function ok(name,pass,detail){out.push({name,pass:!!pass,detail});}function init(cls){G.classId=cls;G.trainPending=true;G.rushPending=null;N.startGame();T.hideOverlay();G.paused=false;G.busy=false;T.genTrainMap();N.computeFOV();G.quests=[];N.p.pending=0;return N.p;}
  init('assault');N.applyMod(N.mods.find(m=>m.id==='subdermal_armor'));N.p.hp=20;G.chal={noHeal:true};const original=N.p.hp;
  for(let i=0;i<8;i++){const slot=Object.keys(G.cyber).find(k=>G.cyber[k]==='subdermal_armor');T.unequipCyber(slot);N.installCyber('subdermal_armor',slot);}
  ok('反复卸装生命义体不能回血或绕禁疗',N.p.hp<=original,{before:original,after:N.p.hp});
  for(const cls of ['assault','engineer','ghost']){
   init(cls);N.applyMod(N.mods.find(m=>m.id==='sandevistan'));N.p.x=20;N.p.y=15;let b=N.spawnBoss(N.bosses()[0],23,15,5);G.enemies=[b];N.computeFOV();
   if(cls==='engineer'){G.scrap=100;T.buildItem('mech');T.installModule('laserArm');T.toggleMech();T.hideOverlay();N.p.face=0;}
   if(cls==='ghost'){G.instab=50;G.ghostRevealed=false;}
   N.useCyberActive('sandevistan');const tick=b.tick,fuel=G.mech;ok(cls+' 时缓启动',!!G.sandev);
   if(cls==='assault')T.gunFire();else if(cls==='engineer')T.fireLaser();else N.ghostAct('assassinate');
   ok(cls+' 攻击结束时缓并恢复敌回合',!G.sandev&&b.tick>tick&& (cls!=='engineer'||G.mech<fuel));
  }
  init('engineer');G.trainBonus={atk:200,def:200,hp:200};N.recalc();G.trainPending=false;G.rushPending=null;N.startGame();T.hideOverlay();ok('训练调整不串入下一局主线',G.mode==='normal'&&!G.trainBonus&&N.p.atk<30&&N.p.maxHp<100);
  const statsBefore=JSON.stringify(N.stats),stashBefore=JSON.stringify(N.meta.stash);G.rushPending={cyber:[],stashItems:[]};N.startGame();T.hideOverlay();let b=G.enemies.find(e=>e.boss),before=N.meta.cores;b.hp=0;N.killEnemy(b);N.killEnemy(b);
  ok('Rush击杀结算一次且不污染主线统计仓库',N.meta.cores===before+25&&JSON.stringify(N.stats)===statsBefore&&JSON.stringify(N.meta.stash)===stashBefore,{delta:N.meta.cores-before});
  G.trainPending=true;G.rushPending=null;N.startGame();T.hideOverlay();
  // Real arena layouts, sample every fourth walkable tile in range for each attack profile.
  let scenarios=0,unavoidable=[];
  for(const spec of N.bosses()){
   T.genBossFloor(spec.tier*5,spec);G.mode='train';N.computeFOV();const boss=G.enemies[0];
   ok('竞技场出生地可通行 '+spec.id,G.map[boss.y][boss.x]===0);
   const plans={bl_hound:['charge','claw'],bl_hive:['summon','ring'],bl_warden:['slam'],bl_lance:['laser','pull'],bl_mine:['mines','web'],bl_mirror:['blink'],bh_eye:['crossfire','mines','sweep'],bh_hive:['brood','ring'],bh_phase:['phaseWave','charge']}[spec.id];
   for(let y=7;y<23;y+=2)for(let x=9;x<35;x+=2){if(G.map[y]?.[x]!==0||Math.max(Math.abs(x-boss.x),Math.abs(y-boss.y))>9||x===boss.x&&y===boss.y)continue;
    for(const kind of plans){N.p.x=x;N.p.y=y;boss.intent=null;T.tacticBossPlan(boss,kind);const a=boss.intent;if(!a||!a.damage)continue;scenarios++;
      let q=[{x,y,step:0}],seen=new Set(),safe=false;while(q.length){const c=q.shift();if(!a.cells.some(t=>t.x===c.x&&t.y===c.y)){safe=true;break;}if(c.step>=a.turns)continue;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const nx=c.x+dx,ny=c.y+dy,key=nx+','+ny;if(G.map[ny]?.[nx]!==0||boss.x===nx&&boss.y===ny||seen.has(key))continue;seen.add(key);q.push({x:nx,y:ny,step:c.step+1});}}
      if(!safe)unavoidable.push({id:spec.id,kind,x,y,turns:a.turns});
    }
   }
  }
  ok('真实竞技场预警采样可逃',unavoidable.length===0,{scenarios,unavoidable:unavoidable.slice(0,16)});
  // Stress scene measures actual draw body duration, not unrelated rAF counts.
  init('engineer');G.bossAlive=true;N.p.x=22;N.p.y=15;G.enemies=[];for(let i=0;i<24;i++){const spec=window.NEON.monsters.filter(m=>!m.boss)[i];G.enemies.push(T.spawnEnemy(spec,17+i%8,12+Math.floor(i/8),10));}
  const boss=N.spawnBoss(N.bosses()[6],26,17,15);G.enemies.push(boss);T.tacticBossPlan(boss,'crossfire');N.computeFOV();N.addBuff('shield',4,20,'测试');N.updateHUD();document.querySelector('#toasts').innerHTML='';G.log=[];document.querySelector('#log').innerHTML='';
  const durations=[];for(let i=0;i<120;i++){const t=performance.now();T.draw(t);durations.push(performance.now()-t);}durations.sort((a,b)=>a-b);ok('压力场景绘图正常',durations.every(Number.isFinite),{enemies:G.enemies.length,drawP50:durations[60],drawP95:durations[114],device:'本机headless Chromium，非真机显示FPS'});
  return out;
 });checks.push(...mechanics);
 await page.screenshot({path:path.join(ROOT,'boss-preview.png')});
 // Native touch scroll must not cast a skill on pointerdown.
 await page.evaluate(()=>{const N=window.__neon;N.mods.filter(m=>m.active).slice(0,9).forEach(m=>N.applyMod(m));N.test.hideOverlay();N.updateHUD();});
 const before=await page.evaluate(()=>window.__neon.G.turn);const ab=await page.locator('#abilitybar').boundingBox();
 if(ab){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:ab.x+ab.width-20,y:ab.y+20}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:ab.x+20,y:ab.y+20}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});checks.push({name:'横滑技能栏不误施法',pass:await page.evaluate(()=>window.__neon.G.turn)===before});}
 await page.evaluate(()=>{window.__neon.test.menuScreen();});await page.locator('[data-cls="ghost"]').click();await page.locator('#menuTrain').click();await page.locator('#closeMenu').click();
 const t=await page.evaluate(()=>window.__neon.G.turn);await page.locator('[data-ghost="stealth"]').click();checks.push({name:'真实手机点击技能可触发一回合',pass:(await page.evaluate(()=>window.__neon.G.turn))===t+1});
 await page.waitForTimeout(850);checks.push({name:'旧Rush回调不侵入新训练',pass:await page.evaluate(()=>window.__neon.G.mode==='train'&&window.__neon.G.state==='play')});
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.__neon.test.draw(performance.now()));checks.push({name:'无浏览器未捕获异常',pass:errors.length===0,detail:errors});
 const result={checks,errors};fs.writeFileSync(path.join(ROOT,'release-test-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();assert(checks.every(c=>c.pass),'release failures: '+checks.filter(c=>!c.pass).map(c=>c.name).join(', '));
})().catch(e=>{console.error(e);process.exit(1);});
