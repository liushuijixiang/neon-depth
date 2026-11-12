const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
(async()=>{
 const b=await chromium.launch({args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{let seed=173;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};localStorage.setItem('neon-depth-mute','1');});
 await page.goto('file://'+path.join(ROOT,'dist.html'));
 const results=await page.evaluate(()=>{
  const N=window.__neon,T=N.test,G=N.G,checks=[];
  function ok(name,cond,detail){checks.push({name,pass:!!cond,detail});}
  function init(cls='assault'){
   G.classId=cls;G.trainPending=true;G.rushPending=null;N.startGame();T.hideOverlay();G.paused=false;G.busy=false;N.p.pending=0;G.pendingEvo=0;G.pendingBoons=0;T.genTrainMap();N.computeFOV();N.updateHUD();
   N.p.x=20;N.p.y=15;G.items=[];G.enemies=[];G.quests=[];G.allies=[];G.freeze=0;G.overT=0;G.burnout=false;G.hitStopUntil=0;G.runMod={};N.recalc();N.p.hp=N.p.maxHp;return N.p;
  }
  const mons=window.NEON.monsters.filter(m=>!m.boss);
  function enemy(ai,x=23,y=15){const e=T.spawnEnemy(mons.find(m=>m.ai===ai),x,y,1);e.alerted=true;e.cd=0;e.stun=0;G.enemies.push(e);return e;}
  function tick(e){T.enemyAct(e,T.buildDistMap());}
  init();let e=enemy('turret');const hp=N.p.hp;tick(e);
  ok('炮台预警不立即造成伤害',e.intent?.kind==='shot'&&N.p.hp===hp);
  const locked=JSON.stringify(e.intent.cells);N.p.y++;tick(e);ok('锁线不追踪，横移可躲',N.p.hp===hp&&locked.includes('15'));
  init();e=enemy('charger');tick(e);ok('冲锋有锁定预警',e.intent?.kind==='charge');N.p.y++;tick(e);ok('冲锋侧移可躲且产生破绽',N.p.hp===N.p.maxHp&&e.recovery===1);
  init();e=enemy('exploder',21,15);tick(e);ok('自爆有两回合倒数',e.intent?.turns===2);N.p.x--;tick(e);N.p.x--;tick(e);ok('自爆可步行逃离',N.p.hp===N.p.maxHp&&!G.enemies.includes(e));
  init();e=enemy('tank',21,15);tick(e);N.p.x--;tick(e);ok('重装后摇可反击',e.recovery===2&&N.p.hp===N.p.maxHp);ok('破绽统一增伤',T.previewEnemyDamage(e,20)===25);
  init();e=enemy('healer',24,15);let ally=enemy('chase',24,16);ally.hp=Math.max(1,ally.maxHp-5);tick(e);ok('治疗读条',e.intent?.kind==='heal');T.damageEnemy(e,1);ok('伤害打断治疗',!e.intent&&e.recovery===1);
  init();e=enemy('summoner');tick(e);ok('孵化读条',e.intent?.kind==='summon');T.damageEnemy(e,1);ok('伤害打断孵化',!e.intent);
  for(let i=0;i<10;i++)T.summonMinions(e,3);let children=T.tacticOwned(e);ok('召唤上限为2',children.length===2,children.length);let child=children[0],before=G.enemies.length;T.summonMinions(child,3);ok('召唤体不能递归',G.enemies.length===before);
  const loot=JSON.stringify([G.credits,G.kills,N.p.xp,G.scrap,N.meta.cores]);N.killEnemy(child);ok('召唤体不能刷奖励',loot===JSON.stringify([G.credits,G.kills,N.p.xp,G.scrap,N.meta.cores]));
  init();e=enemy('turret');tick(e);const intent=JSON.stringify(e.intent);G.freeze=1;T.endTurn();ok('时停最后一回合仍冻结预警',JSON.stringify(e.intent)===intent&&G.freeze===0);
  init('ghost');G.instab=50;G.ghostRevealed=true;const iv=G.instab,tr=G.turn;N.ghostAct('assassinate');ok('无效刺杀不付费不耗回合',G.instab===iv&&G.turn===tr);
  e=enemy('tank',22,15);e.hp=2;e.maxHp=20;e.marked=true;e.marks=2;const selected=T.ghostTarget('assassinate');ok('提示与真实刺杀目标相同',selected===e&&T.ghostEnemyKillable(e));N.ghostAct('assassinate');ok('刺杀成功显形降压',!G.enemies.includes(e)&&G.ghostRevealed&&G.instab<iv, G.instab);
  init('ghost');G.instab=50;G.ghostRevealed=false;e=enemy('turret',23,15);for(let i=0;i<3;i++)T.endTurn();ok('潜行等待叠标记',e.marks===3,e.marks);
  // One fixture per actual boss. Every queued damaging action has a reachable safe tile before resolution.
  const profiles=[];
  for(const spec of N.bosses()){
    init();const boss=N.spawnBoss(spec,23,15,spec.tier*5);G.enemies=[boss];G.bossAlive=true;const kinds=new Set();let intents=0,unsafe=0;
    for(let j=0;j<45;j++){
      if(j===20)boss.hp=boss.maxHp*.45;
      const old=boss.intent;tick(boss);
      if(boss.intent&&boss.intent!==old){const a=boss.intent;kinds.add(a.kind);intents++;
       if(a.damage>0){let positions=[{x:N.p.x,y:N.p.y}];for(let n=0;n<a.turns;n++){const next=[];for(const v of positions)for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const x=v.x+dx,y=v.y+dy;if(G.map[y]?.[x]===0&&!G.enemies.some(o=>o.x===x&&o.y===y))next.push({x,y});}positions=next;}
        const safe=positions.find(c=>!a.cells.some(d=>c.x===d.x&&c.y===d.y));if(!safe)unsafe++;else {N.p.x=safe.x;N.p.y=safe.y;}
       }
      }
      N.p.hp=N.p.maxHp;
    }
    profiles.push({id:spec.id,hp:boss.maxHp,kinds:[...kinds],intents,unsafe});
    ok('Boss '+spec.id+' 有不同战术且预警可逃',intents>0&&unsafe===0,profiles.at(-1));
  }
  init();let mother=N.spawnBoss(N.bosses().find(b=>b.id==='bh_hive'),24,15,15);G.enemies=[mother];T.summonMinions(mother,3);ok('母巢随幼体减伤',T.previewEnemyDamage(mother,100)===60);T.tacticOwned(mother).forEach(x=>N.killEnemy(x));ok('清完幼体即时破盾',T.previewEnemyDamage(mother,100)===100);
  init();let boss=N.spawnBoss(N.bosses()[0],23,15,5);G.enemies=[boss];G.bossAlive=true;let persisted=JSON.stringify([N.stats,N.meta,N.unlocked]);boss.hp=0;N.killEnemy(boss);ok('训练击杀Boss无Rush崩溃或持久奖励',G.mode==='train'&&!G.bossAlive&&persisted===JSON.stringify([N.stats,N.meta,N.unlocked]));T.win();T.win();ok('训练结束不提取义体或主线结算',persisted===JSON.stringify([N.stats,N.meta,N.unlocked]));
  init('engineer');G.control={x:18,y:15,hp:10,maxHp:10,turns:8};G.allies=[{x:18,y:14,kind:'drone',turns:5}];N.alliesAct();ok('骇入与僚机并存不崩溃',G.allies[0].turns===4);
  init('engineer');G.scrap=100;T.buildItem('mech');ok('建造机甲不会自动上机',G.mechBuilt&&G.mech===0);T.toggleMech();ok('机甲可上机',G.mech>0);T.toggleMech();ok('机甲可下机',G.mech===0&&G.mechBuilt);
  init('assault');e=enemy('tank');G.ammo=0;G.energy=14;G.inv=['mag_pack'];const turn=G.turn;T.reloadWithItem(0);ok('突击换弹使用道具和能量',G.inv.length===0&&G.ammo===G.ammoMax&&G.energy<14&&G.turn===turn+1);
  // Rendering must never apply damage, AI ticks or lifecycle changes.
  init('ghost');G.instab=75;G.ghostRevealed=false;boss=N.spawnBoss(N.bosses()[7],24,14,15);G.enemies=[boss,enemy('healer',18,14),enemy('charger',18,17)];boss.marked=true;boss.marks=3;T.bossAct(boss,T.buildDistMap());N.addBuff('shield',4,15,'测试');G.mines=[{x:21,y:16,t:2,dmg:8}];G.slash={x:24,y:14,face:0,born:performance.now(),color:'#ff4d5e'};N.computeFOV();N.updateHUD();
  function combat(){return JSON.stringify({turn:G.turn,hp:N.p.hp,enemies:G.enemies.map(e=>({hp:e.hp,x:e.x,y:e.y,intent:e.intent,recovery:e.recovery})),allies:G.allies,inv:G.inv,instab:G.instab});}
  const snap=combat();for(let i=0;i<60;i++)T.draw(performance.now()+i);ok('60次纯绘图不改变战斗状态',snap===combat());
  ok('新图鉴含战术解释',T.codexHTML().includes('三式审判')&&T.codexHTML().includes('锁线射击'));
  return {checks,profiles};
 });
 await page.screenshot({path:path.join(ROOT,'tactics-preview.png')});
 for(const size of [[320,568],[360,640],[390,844],[412,915]]){
  await page.setViewportSize({width:size[0],height:size[1]});
  const layout=await page.evaluate(()=>{const a=document.querySelector('#app').getBoundingClientRect(),stage=document.querySelector('#stage').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth+1,stageHeight:stage.height,appBottom:a.bottom,screen:innerHeight};});
  results.checks.push({name:'手机布局 '+size.join('x'),pass:!layout.overflow&&layout.stageHeight>=120&&layout.appBottom<=layout.screen+1,detail:layout});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.__neon.test.draw(performance.now()));
 results.checks.push({name:'浏览器无未捕获异常',pass:errors.length===0,detail:errors});
 fs.writeFileSync(path.join(ROOT,'test-results.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));await b.close();assert(results.checks.every(c=>c.pass),'Regression failures: '+results.checks.filter(c=>!c.pass).map(c=>c.name).join(', '));
})().catch(e=>{console.error(e);process.exit(1);});
