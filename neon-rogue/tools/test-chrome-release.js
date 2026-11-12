const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');const ROOT=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('neon-depth-mute','1'));
await page.goto('file://'+path.join(ROOT,'dist.debug.html'));
const HAND_COUNT=await page.evaluate(()=>window.__neon.mods.filter(m=>m.slot==='hand').length);
checks.push(...await page.evaluate(()=>{
 const N=window.__neon,T=N.test,U=T.training,S=T.bossStage,G=N.G,out=[];const ok=(name,pass,detail)=>out.push({name,pass:!!pass,detail});
 G.classId='assault';G.trainPending=true;N.startGame();T.hideOverlay();G.paused=false;G.busy=false;
 for(const spec of N.bosses()){const e=U.bossArena(spec.id);T.hideOverlay();S.banner(e.name,e.spec.intro);S.sync(performance.now()+2400);ok('专属登场与敌方通道 '+spec.name,document.querySelector('#app').getAttribute('data-boss-owner')===String(e.uid)&&document.querySelector('#bosscomms-text').textContent.length>0);}
 let e=U.bossArena('bh_eye');T.hideOverlay();S.event(e,'pulse','神经灼照');S.sync(performance.now());
 ok('守卫通讯进入 HUD，地图上无常驻信息框',!document.querySelector('#bossnotice')&&!document.querySelector('#bossreadout')&&getComputedStyle(document.getElementById('bossinvasion')).pointerEvents==='none'&&getComputedStyle(document.getElementById('bossbanner')).pointerEvents==='none');
 ok('通讯行显示机体代号',document.querySelector('#bosscomms-src').textContent.includes('RETINA'));
 const snapshot=JSON.stringify([G.turn,N.p.hp,G.enemies.map(m=>[m.hp,m.tick,m.x,m.y])]);for(let i=0;i<50;i++){T.draw(performance.now()+i);S.sync(performance.now()+i);}ok('Boss侵蚀和演出不推进战斗',snapshot===JSON.stringify([G.turn,N.p.hp,G.enemies.map(m=>[m.hp,m.tick,m.x,m.y])]));
 S.event(e,'annihilate','瞳孔过曝');S.sync(performance.now());S.sync(performance.now()+1500);ok('大招滤镜有时限',!document.querySelector('#app').hasAttribute('data-boss-impact'));
 e.hp=0;N.killEnemy(e);S.sync(performance.now());ok('击杀后UI入侵解除',!document.querySelector('#app').hasAttribute('data-boss-owner')&&document.querySelector('#bosscomms-text').textContent==='');
 e=U.bossArena('bl_mirror');T.hideOverlay();S.event(e,'mirror','镜阵折射');S.sync(performance.now());U.action('clear');S.sync(performance.now());ok('训练清场解除旧入侵',!document.querySelector('#app').hasAttribute('data-boss-owner'));
 // Actual player skill event, not an artificial cosmetic queue.
 U.action('arena');U.install('handL','assault_hand_r');U.install('body','body_red');U.install('spine','sandevistan');T.hideOverlay();N.p.x=20;N.p.y=15;
 const m=T.spawnEnemy(window.NEON.monsters.find(m=>m.ai==='chase'&&!m.boss),22,15,5);m.hp=m.maxHp=10000;m.stun=50;G.enemies=[m];N.computeFOV();N.useCyberActive('assault_hand_r');
 ok('真实义体施放生成有类型的技能演出',Array.isArray(G.chromeSkillFx)&&G.chromeSkillFx.some(f=>f.kind==='beam'));
 const snap=JSON.stringify([G.turn,N.p.hp,m.hp,m.tick]);for(let i=0;i<80;i++)T.draw(performance.now()+i*5);ok('技能演出纯绘制',snap===JSON.stringify([G.turn,N.p.hp,m.hp,m.tick]));
 N.useCyberActive('body_red');T.draw(performance.now());ok('护盾技能有分型动效',G.chromeSkillFx.some(f=>f.kind==='armor'));
 return out;
}));
await page.emulateMedia({reducedMotion:'reduce'});checks.push(await page.evaluate(()=>{const N=window.__neon,S=N.test.bossStage,e=N.test.training.bossArena('bh_eye');N.test.hideOverlay();S.event(e,'annihilate','降维');S.sync(performance.now());N.test.draw(performance.now());return{name:'减少动态模式不使用大招滤镜',pass:getComputedStyle(document.querySelector('#game')).filter==='none'};}));
// Production receives ONLY UI tests: no __neon, no injected scenes or development presets.
await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('file://'+path.join(ROOT,'dist.html'));checks.push({name:'正式包无调试接口',pass:await page.evaluate(()=>typeof window.__neon==='undefined')});
await page.locator('#actionBtn').click();await page.locator('[data-mode="train"]').click();await page.locator('[data-flow-cls="assault"]').click();checks.push({name:'正式训练场无开发场景与强力预设',pass:await page.locator('[data-tr-scene],[data-tr-preset],[data-tr-panel="presets"]').count()===0});
await page.locator('[data-tr-pick="slot"][data-v="handR"]').click();await page.locator('[data-tr-pick="quality"][data-v="all"]').click();checks.push({name:'正式训练场仍有全部手部义体',pass:await page.locator('[data-tr-equip]').count()===HAND_COUNT,detail:HAND_COUNT});await page.locator('[data-tr-equip="hand_red"]').click();
await page.locator('[data-tr-panel="chips"]').click();await page.locator('[data-tr-pick="chipId"][data-v="atk"]').click();await page.locator('[data-tr-pick="chipQuality"][data-v="red"]').click();await page.locator('[data-tr="setchip"]').click();checks.push({name:'正式训练可实际安装指定芯片',pass:(await page.locator('.train-panel').textContent()).includes('攻击')});
await page.locator('[data-tr-panel="enemies"]').click();await page.locator('[data-tr-pick="enemyGroup"][data-v="boss"]').click();checks.push({name:'正式训练完整九Boss入口',pass:await page.locator('[data-spawnboss]').count()===9});
await page.locator('[data-tr-bossarena="bh_eye"]').click();await page.locator('#closeMenu').click();await page.waitForTimeout(500);await page.screenshot({path:path.join(ROOT,'chrome-release-boss.png')});
await page.locator('#trainbtn').click();await page.locator('[data-tr-panel="gear"]').click();await page.screenshot({path:path.join(ROOT,'chrome-release-training.png')});
for(const size of [[320,568],[390,844],[412,915]]){await page.setViewportSize({width:size[0],height:size[1]});const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,buttons:[...document.querySelectorAll('#abilitybar button')].length,wrap:getComputedStyle(document.querySelector('#abilitybar')).flexWrap}));checks.push({name:'正式界面适配 '+size.join('x'),pass:!layout.overflow&&layout.wrap==='wrap',detail:layout});}
checks.push({name:'私有和正式构建均无脚本异常',pass:errors.length===0,detail:errors});fs.writeFileSync(path.join(ROOT,'chrome-release-results.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));await browser.close();assert(checks.every(x=>x.pass),'FAILED '+checks.filter(x=>!x.pass).map(x=>x.name).join(', '));})().catch(e=>{console.error(e);process.exit(1);});
