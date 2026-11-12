const fs=require('fs'),path=require('path'),acorn=require('/root/workspace/neon-tooling/node_modules/acorn');const root=path.resolve(__dirname,'..'),file=path.join(root,'game.js');let s=fs.readFileSync(file,'utf8');
function rep(a,b){if(!s.includes(a))throw Error('missing '+a.slice(0,90));s=s.replace(a,b);}
function replaceFn(name,source){let ns=acorn.parse(s,{ecmaVersion:'latest'}).body[0].expression.callee.body.body.filter(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(ns.length!==1)throw Error(name);s=s.slice(0,ns[0].start)+source+s.slice(ns[0].end);}
rep("  e.hitFx = performance.now();", "  e.hitFx = performance.now();\n  if (e.boss && e.recovery > 0 && classDef().id === 'assault' && G.weakEnergyTurn !== G.turn) {\n    G.weakEnergyTurn = G.turn; G.energy = Math.min(G.energyMax, G.energy + 2);\n    float(p.x,p.y,'破绽回收 +2',C.cyan);\n  }");
rep('  G.runId = (G.runId || 0) + 1;',"  G.runId = (G.runId || 0) + 1;\n  G.trainBonus = null; G.sandev = null; G.sandevTrail = []; G.weakEnergyTurn = -1;\n  G.log = []; logEl.innerHTML = ''; toastsEl.innerHTML = '';");
rep("function lose() {\n  if (G.state !== 'play') return;", "function lose() {\n  if (G.state !== 'play') return;\n  var completedRun = G.runId;");
rep("setTimeout(function () { endScreen(false, 0, false); }, 400);", "setTimeout(function () { if (G.runId === completedRun && G.state === 'over') endScreen(false, 0, false); }, 400);");
rep("setTimeout(function () { endScreen(false, score, isBest); }, 750);", "setTimeout(function () { if (G.runId === completedRun && G.state === 'over') endScreen(false, score, isBest); }, 750);");
rep("function win() {\n  if (G.state !== 'play') return;", "function win() {\n  if (G.state !== 'play') return;\n  var completedRun = G.runId;");
rep("setTimeout(function () { endScreen(true, score, isBest); }, 900);", "setTimeout(function () { if (G.runId === completedRun && G.state === 'win') endScreen(true, score, isBest); }, 900);");
rep("  msg('▼ 正在下潜…', 'sys');\n  setTimeout(function () {\n    if (G.state !== 'play') return;", "  msg('▼ 正在下潜…', 'sys');\n  var descendingRun = G.runId;\n  setTimeout(function () {\n    if (G.state !== 'play' || G.runId !== descendingRun || G.mode !== 'normal') return;");
rep("if (!(x === x0 && y === y0) && G.map[y][x] === WALL) return false;", "if (!(x === x0 && y === y0) && (G.map[y][x] === WALL || wallAt(x,y))) return false;");
// Supply is near the combatants, not at an arbitrary unexplored map corner.
replaceFn('dropBossSupplies',`function dropBossSupplies(n) {
  var cells = tacticArea(p.x,p.y,4,2).filter(function(c){return !occupied(c.x,c.y);});
  shuffle(cells);
  for(var i=0;i<Math.min(n||2,cells.length);i++) {
    var t=cells[i];
    if(i===1) G.items.push({x:t.x,y:t.y,cons:classDef().id==='assault'?CONS.mag_pack:pickConsumable(G.depth),seed:Math.random()*TAU});
    else G.items.push({x:t.x,y:t.y,it:pickHealItem(),seed:Math.random()*TAU});
    burst(t.x,t.y,C.green,8);
  }
  msg('首领半血 · 附近落下修复与道具补给','good');
}`);
// Honor normal challenge modifiers exactly once. Rush remains independently applied in startRushFloor.
let node=acorn.parse(s,{ecmaVersion:'latest'}).body[0].expression.callee.body.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='spawnBoss');let body=s.slice(node.start,node.end);body=body.replace('  tacticUid(e);return e;',"  if (G.mode === 'normal' && G.chal) { e.maxHp = Math.max(1,Math.round(e.maxHp * G.chal.enemyHpMul)); e.hp = e.maxHp; e.atk += G.chal.atk; }\n  tacticUid(e);return e;");s=s.slice(0,node.start)+body+s.slice(node.end);
rep('消耗 1 个道具 + 能量，道具决定弹种','消耗 1 个道具 + 能量，道具决定弹种；命中首领破绽每回合回收2能量');
// Remove only literally identical duplicate top-level declarations; preserve the first initialization.
const bodyNodes=acorn.parse(s,{ecmaVersion:'latest'}).body[0].expression.callee.body.body,seen={},remove=[];
for(const n of bodyNodes)if(n.type==='VariableDeclaration'){
 let duplicate=n.declarations.every(d=>d.id.type==='Identifier'&&seen[d.id.name]===s.slice(d.init?.start,d.init?.end));
 if(duplicate)remove.push(n);else for(const d of n.declarations)if(d.id.type==='Identifier')seen[d.id.name]=s.slice(d.init?.start,d.init?.end);
}
for(const n of remove.reverse())s=s.slice(0,n.start)+s.slice(n.end);
s=s.replace(/\n(?:[ \t]*\n){3,}/g,'\n\n\n');acorn.parse(s,{ecmaVersion:'latest'});fs.writeFileSync(file,s);console.log('Polish and duplicate tables:',remove.length);
let h=fs.readFileSync(path.join(root,'index.html'),'utf8');h=h.replace('/* TACTICAL VISUAL POLISH */','/* TACTICAL VISUAL POLISH */\n.dpad{width:min(100%,216px);gap:6px}.key{aspect-ratio:1.25/1}\n#score{display:none}.meta{gap:4px}.chip{padding:3px 5px;font-size:9px}');fs.writeFileSync(path.join(root,'index.html'),h);
