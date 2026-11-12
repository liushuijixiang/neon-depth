'use strict';
const fs=require('fs'),acorn=require('/root/workspace/neon-tooling/node_modules/acorn');
const file=require('path').resolve(__dirname,'../game.js');let s=fs.readFileSync(file,'utf8');
function fn(name,text){const a=acorn.parse(s,{ecmaVersion:'latest'}).body[0].expression.callee.body.body.filter(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(a.length!==1)throw Error(name);s=s.slice(0,a[0].start)+text+s.slice(a[0].end);}
function once(a,b){const i=s.indexOf(a);if(i<0||s.indexOf(a,i+a.length)>=0)throw Error(a.slice(0,80));s=s.slice(0,i)+b+s.slice(i+a.length);}
if(s.includes('var VFX ='))throw Error('already installed');
once('function resize() {',String.raw`var VFX = { reduced: false, resizeDirty: true, mini: null, miniMap: null, miniKey: '', drawAt: 0 };
var motionMedia = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
if (motionMedia) {
  VFX.reduced = motionMedia.matches;
  var onMotion = function (ev) { VFX.reduced = ev.matches; VFX.resizeDirty = true; };
  if (motionMedia.addEventListener) motionMedia.addEventListener('change', onMotion);
  else if (motionMedia.addListener) motionMedia.addListener(onMotion);
}
var stageSizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function () { VFX.resizeDirty = true; }) : null;
if (stageSizeObserver) stageSizeObserver.observe(stage);
function resize() {`);
fn('resize',String.raw`function resize() {
  var nd = Math.min(window.devicePixelRatio || 1, VFX.reduced ? 1.5 : 2);
  if (!VFX.resizeDirty && cw > 0 && nd === dpr) return;
  VFX.resizeDirty = false;
  var r = stage.getBoundingClientRect();
  var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (w === cw && h === ch && nd === dpr) return;
  cw = w; ch = h; dpr = nd;
  cvs.width = Math.round(w*dpr); cvs.height = Math.round(h*dpr);
  cvs.style.width = w+'px'; cvs.style.height = h+'px'; VFX.miniKey = '';
}`);
const helpers=String.raw`
function visualPolygon(x,y,r,sides,angle) {
  ctx.beginPath();for(var i=0;i<sides;i++){var a=(angle||0)+i*TAU/sides;var xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r;if(i)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);}ctx.closePath();
}
function visualEnemy(e,x,y,tile,now,silhouette) {
  var r=tile*(e.boss?0.53:0.29),color=e.color||C.red;
  var hit=typeof e.hitFx==='number'&&now-e.hitFx>=0&&now-e.hitFx<150;
  ctx.save();ctx.globalAlpha=silhouette?0.38:1;ctx.fillStyle='#100d1c';ctx.strokeStyle=hit?'#fff4d2':color;ctx.lineWidth=e.boss?2.3:1.5;
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.ellipse(x,y+r*.65,r*1.1,r*.4,0,0,TAU);ctx.fill();ctx.fillStyle=hit?hexA(color,.48):'#140f20';
  if(e.boss){
    var seed=0,id=e.id||e.name||'boss';for(var si=0;si<id.length;si++)seed+=id.charCodeAt(si);var sides=5+seed%4;
    visualPolygon(x,y,r*1.2,sides,-Math.PI/2);ctx.fill();ctx.stroke();ctx.save();ctx.translate(x,y);ctx.rotate(seed%2?Math.PI/4:0);
    ctx.fillStyle='#231a29';ctx.fillRect(-r*1.24,-r*.46,r*.52,r*.92);ctx.strokeRect(-r*1.24,-r*.46,r*.52,r*.92);ctx.fillRect(r*.72,-r*.46,r*.52,r*.92);ctx.strokeRect(r*.72,-r*.46,r*.52,r*.92);ctx.restore();
    visualPolygon(x,y,r*.62,4,Math.PI/4);ctx.fillStyle=hexA(color,.24);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.fillRect(x-r*.3,y-r*.12,r*.6,r*.24);
  }else if(e.ai==='tank'){
    visualPolygon(x,y,r*1.2,6,Math.PI/6);ctx.fill();ctx.stroke();ctx.strokeRect(x-r*.62,y-r*.7,r*1.24,r*1.4);ctx.fillStyle=color;ctx.fillRect(x-r*.36,y-r*.12,r*.72,r*.24);
  }else if(e.ai==='turret'){
    visualPolygon(x,y,r*1.1,4,Math.PI/4);ctx.fill();ctx.stroke();ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(p.y-e.y,p.x-e.x));ctx.fillStyle=color;ctx.fillRect(-r*.1,-r*.22,r*1.45,r*.44);ctx.restore();
  }else if(e.ai==='charger'){
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(p.y-e.y,p.x-e.x));ctx.beginPath();ctx.moveTo(r*1.4,0);ctx.lineTo(-r,r*.82);ctx.lineTo(-r*.5,0);ctx.lineTo(-r,-r*.82);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }else if(e.ai==='exploder'){
    for(var k=0;k<8;k++){var a=k*TAU/8;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r*.7,y+Math.sin(a)*r*.7);ctx.lineTo(x+Math.cos(a)*r*1.3,y+Math.sin(a)*r*1.3);ctx.stroke();}visualPolygon(x,y,r*.85,8,Math.PI/8);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r*.25,0,TAU);ctx.fill();
  }else if(e.ai==='summoner'){
    visualPolygon(x,y,r*1.05,3,-Math.PI/2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(x,y,r*.48,0,TAU);ctx.stroke();for(var q=0;q<3;q++){var aa=-Math.PI/2+q*TAU/3;ctx.fillStyle=color;ctx.fillRect(x+Math.cos(aa)*r*1.3-1.5,y+Math.sin(aa)*r*1.3-1.5,3,3);}
  }else if(e.ai==='healer'){
    ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.fillRect(x-r*.15,y-r*.6,r*.3,r*1.2);ctx.fillRect(x-r*.6,y-r*.15,r*1.2,r*.3);
  }else{
    visualPolygon(x,y,r,4,0);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(x-r*.7,y+r*.6);ctx.lineTo(x-r*1.15,y+r);ctx.moveTo(x+r*.7,y+r*.6);ctx.lineTo(x+r*1.15,y+r);ctx.stroke();ctx.fillStyle=color;ctx.fillRect(x-r*.4,y-r*.12,r*.8,r*.24);
  }
  if(e.armorT>0||(e.guard>0&&e.hp>e.maxHp*(e.guardAt||0))){ctx.strokeStyle=C.cyan;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r*1.38,-Math.PI*.88,-Math.PI*.12);ctx.stroke();}
  if(e.elite){ctx.strokeStyle=C.amber;ctx.lineWidth=1;visualPolygon(x,y,r*1.4,4,Math.PI/4);ctx.stroke();}
  if(e.marked){var br=r*1.5,len=Math.max(3,tile*.15),mk=Math.min(5,e.marks||1);ctx.strokeStyle=mk>=3?C.red:C.cyan;ctx.lineWidth=1.5;ctx.beginPath();[-1,1].forEach(function(dx){[-1,1].forEach(function(dy){ctx.moveTo(x+dx*(br-len),y+dy*br);ctx.lineTo(x+dx*br,y+dy*br);ctx.lineTo(x+dx*br,y+dy*(br-len));});});ctx.stroke();ctx.fillStyle=ctx.strokeStyle;for(var m=0;m<mk;m++)ctx.fillRect(x-(mk*4-1)/2+m*4,y+r*1.5+3,3,3);}
  if(e.markFx&&now-e.markFx>=0&&now-e.markFx<360&&!VFX.reduced){ctx.strokeStyle=hexA(C.cyan,1-(now-e.markFx)/360);ctx.beginPath();ctx.arc(x,y,r*(1+(now-e.markFx)/360),0,TAU);ctx.stroke();}
  var bw=tile*(e.boss?1.42:.72),by=y-r-6;ctx.fillStyle='#02050a';ctx.fillRect(x-bw/2-1,by-1,bw+2,5);ctx.fillStyle=e.recovery>0?C.green:color;ctx.fillRect(x-bw/2,by,bw*clamp(e.hp/e.maxHp,0,1),3);
  if(e.boss){ctx.fillStyle='#060b12';for(var phase=1;phase<4;phase++)ctx.fillRect(x-bw/2+bw*phase/4,by,1,3);}
  var status=e.stun>0?'停':e.recovery>0?'破绽':e.intent?(e.intent.label||'预备')+' '+e.intent.turns:e.alerted?'!':'';
  if(status){ctx.font='bold '+Math.max(8,Math.round(tile*.28))+'px monospace';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillStyle=e.recovery>0?C.green:e.intent?C.amber:C.red;ctx.fillText(status,x,by-3);}
  if(classDef().id==='ghost'&&ghostEnemyKillable(e)){ctx.font='bold '+Math.max(10,Math.round(tile*.38))+'px monospace';ctx.fillStyle='#ffb5a8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('斩',x+r*1.7,y);}
  ctx.restore();
}
function visualPlayer(x,y,tile,now) {
  var cls=classDef().id,mech=G.mech>0,ghost=cls==='ghost';var color=mech||cls==='engineer'?C.amber:ghost?(ghostBand()==='high'?C.pink:C.violet):C.cyan;
  var hidden=G.stealth>0||(ghost&&ghostHidden()),scale=mech?1.6:p.buffs.some(function(b){return b.id==='grow';})?1.3:1,r=tile*.29*scale;
  ctx.save();ctx.globalAlpha=G.control ? .5 : hidden ? .55 : 1;ctx.fillStyle='rgba(0,0,0,.6)';ctx.beginPath();ctx.ellipse(x,y+r*.8,r*1.1,r*.38,0,0,TAU);ctx.fill();ctx.strokeStyle=color;ctx.fillStyle=hexA(color,.22);ctx.lineWidth=1.8;ctx.save();ctx.translate(x,y);ctx.rotate(p.face||0);
  if(mech){ctx.fillRect(-r*.8,-r*.75,r*1.55,r*1.5);ctx.strokeRect(-r*.8,-r*.75,r*1.55,r*1.5);ctx.fillStyle='#493923';ctx.fillRect(-r*.4,-r*1.25,r*.95,r*.44);ctx.strokeRect(-r*.4,-r*1.25,r*.95,r*.44);ctx.fillRect(-r*.4,r*.81,r*.95,r*.44);ctx.strokeRect(-r*.4,r*.81,r*.95,r*.44);ctx.fillStyle=color;ctx.fillRect(r*.6,-r*.22,r*.85,r*.44);
  }else if(cls==='engineer'){ctx.fillRect(-r,-r*.8,r*1.7,r*1.6);ctx.strokeRect(-r,-r*.8,r*1.7,r*1.6);ctx.fillStyle=color;ctx.fillRect(-r*1.3,-r*.6,r*.3,r*1.2);ctx.fillRect(r*.4,-r*.18,r*.8,r*.36);
  }else if(ghost){ctx.beginPath();ctx.moveTo(r*1.3,0);ctx.lineTo(-r*.85,-r);ctx.lineTo(-r*.45,0);ctx.lineTo(-r*.85,r);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-r*.1,-r*.7);ctx.lineTo(r*.8,-r*1.25);ctx.moveTo(-r*.1,r*.7);ctx.lineTo(r*.8,r*1.25);ctx.stroke();
  }else{ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(r*.1,-r*.8);ctx.lineTo(-r,-r*.65);ctx.lineTo(-r,r*.65);ctx.lineTo(r*.1,r*.8);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.fillRect(r*.35,-r*.16,r*1.15,r*.32);}
  ctx.fillStyle='#effdff';ctx.fillRect(-r*.12,-r*.25,r*.4,r*.5);ctx.restore();
  if(hidden){ctx.setLineDash([3,4]);ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,r*1.65,0,TAU);ctx.stroke();ctx.setLineDash([]);}
  if(mech){var fuel=clamp(G.mech/(G.mechMax||12),0,1);ctx.lineWidth=2;ctx.strokeStyle=C.amber;ctx.beginPath();ctx.arc(x,y,r*1.55,-Math.PI/2,-Math.PI/2+TAU*fuel);ctx.stroke();}
  if(shieldPool()>0){ctx.strokeStyle=hexA(C.cyan,.45+Math.min(1,G.shieldHit||0)*.5);ctx.lineWidth=1.5+Math.min(1,G.shieldHit||0);visualPolygon(x,y,r*1.8,6,-Math.PI/6);ctx.stroke();}
  if(G.flash>0){ctx.strokeStyle=hexA(color,Math.min(.65,G.flash*.6));ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r*(1.3+(1-clamp(G.flash,0,1))*.6),0,TAU);ctx.stroke();}
  if(G.hurt>0){ctx.strokeStyle=hexA(C.red,Math.min(.9,G.hurt));ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,r*1.6,Math.PI*.1,Math.PI*.9);ctx.stroke();}ctx.restore();
}
function visualCells(cells,color,turns,view,impact) {
  if(!Array.isArray(cells))return;ctx.save();ctx.lineWidth=1;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+Math.max(9,Math.round(view.tile*.36))+'px monospace';
  cells.forEach(function(c){if(!view.on(c.x,c.y)||!G.seen[c.y]||!G.seen[c.y][c.x])return;var x=view.sx(c.x)-view.tile/2,y=view.sy(c.y)-view.tile/2,t=view.tile;ctx.fillStyle=hexA(color,impact!=null ? .18*(1-impact) : .12);ctx.fillRect(x+1,y+1,t-2,t-2);ctx.strokeStyle=hexA(color,impact!=null ? .8*(1-impact) : .75);ctx.strokeRect(x+1.5,y+1.5,t-3,t-3);ctx.beginPath();ctx.moveTo(x+3,y+t-4);ctx.lineTo(x+t-4,y+3);ctx.stroke();if(impact==null){ctx.fillStyle='#ffe7cd';ctx.fillText(String(turns||1),x+t*.5,y+t*.5);}});ctx.restore();
}
`;
once('function draw(now) {',helpers+'\nfunction draw(now) {');acorn.parse(s,{ecmaVersion:'latest'});fs.writeFileSync(file,s);console.log('visual patch 1 installed');
