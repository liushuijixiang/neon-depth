const fs=require('fs'),path=require('path'),acorn=require('/root/workspace/neon-tooling/node_modules/acorn');const root=path.resolve(__dirname,'..'),file=path.join(root,'game.js');let s=fs.readFileSync(file,'utf8');
function tree(){return acorn.parse(s,{ecmaVersion:'latest'}).body[0].expression.callee.body.body;}
function rep(a,b){if(!s.includes(a))throw Error('Missing: '+a.slice(0,90));s=s.replace(a,b);}
function rewrite(name,transform){const a=tree().filter(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(a.length!==1)throw Error(name);const n=a[0];s=s.slice(0,n.start)+transform(s.slice(n.start,n.end))+s.slice(n.end);}
if(s.includes('// CYBER_ENCOUNTERS_V2'))throw Error('Already applied');
let additions='// CYBER_ENCOUNTERS_V2\n';
for(const filename of ['cyber-combat-functions.js','cyber-visual-functions.js']){
 const src=fs.readFileSync(path.join(__dirname,filename),'utf8');const funcs=acorn.parse(src,{ecmaVersion:'latest'}).body;
 for(const f of funcs){if(f.type!=='FunctionDeclaration')throw Error('Expected function only');const code=src.slice(f.start,f.end),hits=tree().filter(n=>n.type==='FunctionDeclaration'&&n.id.name===f.id.name);if(hits.length===1)rewrite(f.id.name,()=>code);else if(!hits.length)additions+=code+'\n';else throw Error('duplicate '+f.id.name);}
}
rep("'use strict';","'use strict';\n"+additions);
// Remove the old universal boss pattern authoring helper and its debug export.
const obsolete=tree().find(n=>n.type==='FunctionDeclaration'&&n.id.name==='tacticBossPlan');if(obsolete)s=s.slice(0,obsolete.start)+s.slice(obsolete.end);
rep('tacticBossPlan: tacticBossPlan, ','');
rep('e.maxHp * G.rushMods.enemyHpMul','e.maxHp * 0.35 * G.rushMods.enemyHpMul');
rep('function hurtPlayer(raw, src) {','function hurtPlayer(raw, src, options) {');
rep("  if (Math.random() < dodge) { float(p.x, p.y, 'MISS', C.cyan); return 0; }","  if (!(options && options.neural) && Math.random() < dodge) { float(p.x, p.y, 'MISS', C.cyan); return 0; }");
rep('hurtPlayer(Math.max(1,Math.round(amount-effDef()*.35)),e);','hurtPlayer(Math.max(1,Math.round(amount-effDef()*.35)),e,{neural:true});');
rep("    else { updateHUD(); return; }", "    else { computeFOV(); updateHUD(); return; }");
rep('    if (e.hp <= 0) continue;\n    if (p.hp <= 0', '    if (e.hp <= 0 || G.enemies.indexOf(e) < 0) continue;\n    if (p.hp <= 0');
rep('  G.enemies.splice(idx, 1);\n  if (e.boss)',"  if (!e.summoned && !e.boss && !e.structure) {\n    G.corpses = G.corpses || []; G.corpses.push({spec:e.spec,x:e.x,y:e.y});\n    if (G.corpses.length > 12) G.corpses.shift();\n  }\n  G.enemies.splice(idx, 1);\n  if (e.boss)");
rep("    msg('清除召唤体 · 不计战利品', 'dim');", "    if (G.mod.onKillHeal > 0) healPlayer(G.mod.onKillHeal, true);");
rep('G.weakEnergyTurn = -1;','G.corpses = [];');
for(const name of ['genBossFloor','genMap','genTrainMap'])rewrite(name,src=>src.replace('{','{\n  G.corpses = []; G.tacticFx = [];'));
rewrite('tickMines',src=>src.replace('damageEnemy(e,mn.dmg)','playerHit(e,mn.dmg,{source:\'cyber-mine\',origin:mn}).damage'));
rep("var bossState = boss.intent ? boss.intent.label + ' · ' + boss.intent.turns + 'T' : boss.recovery > 0 ? '破绽 ' + boss.recovery + 'T · 伤害 +25%' : (boss.spec.tacticName || '准备行动');", "var bossState = boss.intent ? boss.intent.label : (boss.brain && boss.brain.stance) || boss.spec.tacticName || '神经在线';");
rep('TACTICAL UPDATE · 战术重构 1.2','CHROME PROTOCOL · 义体协议 1.3');
rep('消耗 1 个道具 + 能量，道具决定弹种；命中首领破绽每回合回收2能量','消耗 1 个道具 + 能量，道具决定弹种；资源不会随Boss受击自动补充');
rep('击杀 +2 能量（精英 +4）；首领破绽命中每回合 +2；换弹消耗 1 个道具与能量，道具决定弹种','击杀 +2 能量（精英 +4）；换弹消耗 1 个道具与能量，道具决定弹种');
rep('底部技能栏横滑可查看更多，抬手点击释放，消耗一回合','技能按钮全部直接排列，点击释放，消耗一回合');
rep('亮格数字是剩余预警回合；离开亮格、打断孵化或利用掩体。招式后破绽增伤25%，半血空投补给','红光和机体姿态提示出手；不同首领考验爆发、承伤、回复、清群或资源管理，没有统一的躲招奖励窗口');
rep("var bhp = Math.round(b.hp * (b.tier === 1 ? 4 : b.tier === 2 ? 6 : 8));", "var bhp = Math.round(b.hp * (1 + (b.tier*5-1)*0.24) * (10/3));");
rep("lines.push('半血空投2份补给；攻击命中破绽时伤害 +25%。Rush 耐久 ×1.6，另叠所选挑战。');", "lines.push('阶段掉落随机补给；按原层数公式成长。没有普遍破绽加伤或命中回能；可用强力义体直接压制机制。');");
rep("(b.atk + (b.tier-1)*2)","(b.atk + Math.floor((b.tier*5-1)/2))");
// Render persistent constructs and all reflected laser paths, not just the last few segments.
rewrite('draw',src=>{
 src=src.replace('G.beams.slice(-24)','G.beams.slice(-96)');
 src=src.replace("G.hazards.forEach(function(hz){visualCells(hz.cells||[{x:hz.x,y:hz.y}],hz.color||C.red,hz.t||1,view,null);});","G.hazards.forEach(function(hz){visualCells(hz.cells||[], '#ff365c', hz.delay || 0, view, hz.active ? .25 : null);});");
 const anchor='  G.enemies.forEach(function(e){if(e.hp<=0||!on(e.x,e.y)||!G.vis[e.y])return;';
 if(!src.includes(anchor))throw Error('draw entity anchor');
 src=src.replace(anchor,"  G.enemies.forEach(function(e){if(!e.structure||!on(e.x,e.y))return;var root=G.enemies.find(function(o){return o.uid===e.ownerId;});if(root&&['relay','medic','gate'].indexOf(e.structure)>=0){ctx.save();ctx.strokeStyle=e.structure==='medic'?'rgba(87,255,168,.25)':'rgba(255,54,92,.23)';ctx.lineWidth=1;ctx.setLineDash([3,5]);ctx.beginPath();ctx.moveTo(sx(e.x),sy(e.y));ctx.lineTo(sx(root.x),sy(root.y));ctx.stroke();ctx.restore();}});\n"+anchor);
 return src;
});
rewrite('updateFx',src=>src.replace('bcap=VFX.reduced?12:24','bcap=VFX.reduced?48:96'));
rep('  test: {', '  test: { cyberStructure: cyberStructure, cyberSlots: cyberSlots, cyberField: cyberField, cyberChildren: cyberChildren, cyberRay: cyberRay, cyberPulse: cyberPulse, cyberStructureAct: cyberStructureAct, cyberWeight: cyberWeight, pickCyber: pickCyber,');
acorn.parse(s,{ecmaVersion:'latest'});fs.writeFileSync(file,s);console.log('Applied cyber encounters + coherent visual functions');
const htmlFile=path.join(root,'index.html');let h=fs.readFileSync(htmlFile,'utf8');let a=h.indexOf('/* TACTICAL VISUAL POLISH */'),b=h.indexOf('</style>',a);if(a<0||b<0)throw Error('CSS anchor');
h=h.slice(0,a)+String.raw`/* CHROME PROTOCOL: one material system, direct-access controls. */
#stage{border-color:#314554;background:#060b11;box-shadow:inset 0 0 28px rgba(0,0,0,.5)}
#stage::after{opacity:.28}
.hud{background:linear-gradient(135deg,#14212d,#080e16);border-color:#354957;box-shadow:none;border-radius:8px}
.meta{gap:4px}.chip{font-size:9px;padding:3px 5px}#score{display:none}
.abbar{display:flex;flex:0 0 auto;flex-wrap:wrap;gap:5px;overflow:visible;min-height:0;max-height:none;padding:0;touch-action:manipulation}
.abtn{flex:1 0 auto;min-width:64px;height:32px;min-height:0;padding:0 5px;flex-direction:row;gap:4px;border-radius:5px;font-size:10px;background:linear-gradient(135deg,#172430,#0a111a);touch-action:manipulation}
.abtn .cd{font-size:9px}.abtn:active:not(:disabled){background:#263d4b;border-color:#b9f3ff}
.key,.slot{border-radius:6px;background:linear-gradient(135deg,#14242e,#080e17)}
.dpad{width:min(100%,216px);gap:6px}.key{aspect-ratio:1.25/1}
.bossrow{flex-wrap:wrap}.bossname{font-size:10px;line-height:1.4;white-space:normal;color:#ff627f}.bossbar{min-width:80px;min-height:8px;flex:1 0 100%}
.qline{background:rgba(3,8,14,.8);text-shadow:none}.log{font-size:10px;max-height:76px;overflow:hidden;background:linear-gradient(to top,rgba(3,6,11,.9),transparent)}
.toast{max-width:94%;line-height:1.4;box-shadow:0 3px 12px #03070a}.title{animation:none}.bslot{backdrop-filter:none}
@media(max-height:760px){#app{gap:5px}.abtn{height:28px;font-size:9px;min-width:58px}.critbar{height:27px}.dpad{width:min(100%,204px);gap:5px}.key{aspect-ratio:1.65/1}.slot{height:30px}.log{max-height:60px;font-size:9px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}#stage::after{background:none}.critbar,.hud,.abtn,.slot,.key{box-shadow:none!important}}
`+h.slice(b);fs.writeFileSync(htmlFile,h);console.log('Restored wrapping direct skill controls');
