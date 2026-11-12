const fs=require('fs'),path=require('path'),acorn=require('/root/workspace/neon-tooling/node_modules/acorn');const file=path.resolve(__dirname,'../game.js');let s=fs.readFileSync(file,'utf8');function rep(a,b){if(!s.includes(a))throw Error('missing '+a.slice(0,70));s=s.replace(a,b);}
rep('function genBossFloor(depth) {','function genBossFloor(depth, selectedBoss) {');rep('  var spec = pickBoss(depth);','  var spec = selectedBoss || pickBoss(depth);');
rep('  G.enemies.push(boss);\n  var ht1', '  G.map[boss.y][boss.x] = FLOOR;\n  G.enemies.push(boss);\n  var ht1');
rep("  showBossBanner(spec.name, spec.intro || '');", "  showBossBanner(spec.name, (spec.tacticName || '') + ' · ' + (spec.intro || ''));");
rep("  var id=e.id,ratio=e.hp/e.maxHp;", "  var id=e.id,ratio=e.hp/e.maxHp;\n  if (id === 'bh_phase') {\n    var phaseStage = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;\n    if (e.phaseStage && e.phaseStage !== phaseStage) showBossBanner(e.name, phaseStage === 2 ? '近身横扫加入循环 · 环波内侧仍安全' : '冲锋优先 · 侧移后抓住破绽', 'PHASE ' + phaseStage);\n    e.phaseStage = phaseStage;\n  }");
const helper=`function visualBossSignature(e,x,y,r,now) {
  ctx.save();ctx.strokeStyle=e.color;ctx.fillStyle=e.color;ctx.lineWidth=1.6;
  if(e.id==='bl_hound') {
    [-1,1].forEach(function(d){ctx.beginPath();ctx.moveTo(x+d*r*.6,y-r*.4);ctx.lineTo(x+d*r*1.45,y-r*1.25);ctx.lineTo(x+d*r*.3,y-r*.7);ctx.closePath();ctx.fill();});
  } else if(e.id==='bl_hive'||e.id==='bh_hive') {
    for(var i=0;i<(e.id==='bh_hive'?5:3);i++){var a=i*TAU/(e.id==='bh_hive'?5:3);ctx.beginPath();ctx.arc(x+Math.cos(a)*r*.55,y+Math.sin(a)*r*.55,r*.18,0,TAU);ctx.stroke();}
  } else if(e.id==='bl_warden') {
    glyphPath('shield',x,y,r*.9);ctx.fillStyle='#0a1720';ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(x,y-r*.55);ctx.lineTo(x,y+r*.55);ctx.stroke();
  } else if(e.id==='bl_lance') {
    ctx.translate(x,y);ctx.rotate(Math.atan2(p.y-e.y,p.x-e.x));ctx.fillRect(r*.3,-r*.15,r*1.45,r*.3);ctx.strokeRect(r*1.2,-r*.3,r*.4,r*.6);
  } else if(e.id==='bl_mine') {
    for(var j=0;j<4;j++){var a=j*TAU/4+Math.PI/4;ctx.beginPath();ctx.arc(x+Math.cos(a)*r*1.25,y+Math.sin(a)*r*1.25,r*.2,0,TAU);ctx.fill();}
  } else if(e.id==='bl_mirror') {
    ctx.globalAlpha=.7;visualPolygon(x-r*.8,y,r*.55,4,0);ctx.stroke();visualPolygon(x+r*.8,y,r*.55,4,0);ctx.stroke();ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x,y+r);ctx.stroke();
  } else if(e.id==='bh_eye') {
    ctx.fillStyle='#140e1c';ctx.beginPath();ctx.ellipse(x,y,r*.9,r*.52,0,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(x,y,r*.26,0,TAU);ctx.fill();
  } else if(e.id==='bh_phase') {
    ctx.setLineDash([r*.35,r*.22]);ctx.beginPath();ctx.arc(x,y,r*1.55,0,TAU);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r*.65,0,TAU);ctx.stroke();
  }ctx.restore();
}
`;
rep('function visualEnemy(e,x,y,tile,now,silhouette) {',helper+'function visualEnemy(e,x,y,tile,now,silhouette) {');
rep("  }else if(e.ai==='tank'){", "    visualBossSignature(e,x,y,r,now);\n  }else if(e.ai==='tank'){");
rep('test: { tacticBossPlan:', 'test: { genBossFloor: genBossFloor, tacticBossPlan:');
// Keep the current ghost skill table once, instead of a misleading earlier table overwritten at boot.
let body=acorn.parse(s,{ecmaVersion:'latest'}).body[0].expression.callee.body.body;
const decl=body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='GHOST_ACTS'));
const assign=body.find(n=>n.type==='ExpressionStatement'&&n.expression.type==='AssignmentExpression'&&n.expression.left.name==='GHOST_ACTS');
if(decl&&assign){const d=decl.declarations.find(d=>d.id.name==='GHOST_ACTS');const rhs=s.slice(assign.expression.right.start,assign.expression.right.end);s=s.slice(0,assign.start)+s.slice(assign.end);s=s.slice(0,d.init.start)+rhs+s.slice(d.init.end);}
acorn.parse(s,{ecmaVersion:'latest'});fs.writeFileSync(file,s);console.log('9 boss identities and arena spawn fixed');
