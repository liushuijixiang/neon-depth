function burst(x,y,color,n){
  var reduced=VFX&&VFX.reduced,cap=reduced?64:160;n=Math.min(reduced?10:32,Math.max(0,Math.round(n*(reduced?.45:1))));if(G.particles.length+n>cap)G.particles.splice(0,G.particles.length+n-cap);
  for(var i=0;i<n;i++){var a=Math.random()*TAU,sp=(reduced?.7:1)*(1+Math.random()*3.2),life=220+Math.random()*200;G.particles.push({x:x+.5,y:y+.5,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:life,max:life,color:color,size:1.3+Math.random()*1.6});}
}
function float(x,y,text,color,big){
  var cap=VFX&&VFX.reduced?20:32;if(G.texts.length>=cap)G.texts.splice(0,G.texts.length-cap+1);var nearby=0;
  for(var i=G.texts.length-1;i>=0;i--){var t=G.texts[i];if(Math.abs(t.x-(x+.5))<.1&&Math.abs(t.y-y)<.7&&t.life>500)nearby++;}
  G.texts.push({x:x+.5,y:y+.2-Math.min(3,nearby)*.18,text:String(text),color:color,life:820,max:820,big:!!big});
}
function drawGlyph(g,x,y,r,color,glow){ctx.save();glyphPath(g,x,y,r);ctx.fillStyle=hexA(color,.19);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();ctx.restore();}
function drawMinimap(w){
  if(!G.map||!p)return;var mw=Math.min(108,Math.max(82,w*.27)),mh=mw*MAP_H/MAP_W,x=w-mw-8,y=8,tw=mw/MAP_W,th=mh/MAP_H;
  var key=[G.turn,G.depth,p.x,p.y,G.control?G.control.x:-1,G.control?G.control.y:-1,visionR(),mw,dpr].join(':');
  if(!VFX.mini)VFX.mini=document.createElement('canvas');
  if(VFX.miniKey!==key||VFX.miniMap!==G.map){var c=VFX.mini;c.width=Math.ceil(mw*dpr);c.height=Math.ceil(mh*dpr);var mc=c.getContext('2d');mc.setTransform(dpr,0,0,dpr,0,0);mc.fillStyle='rgba(3,8,14,.94)';mc.fillRect(0,0,mw,mh);
    for(var yy=0;yy<MAP_H;yy++)for(var xx=0;xx<MAP_W;xx++){if(!G.seen[yy][xx])continue;mc.fillStyle=G.map[yy][xx]===WALL?(G.vis[yy][xx]?'#28586b':'#132c3a'):(G.vis[yy][xx]?'#173142':'#0b1925');mc.fillRect(xx*tw,yy*th,Math.ceil(tw),Math.ceil(th));}VFX.miniKey=key;VFX.miniMap=G.map;
  }
  ctx.save();ctx.drawImage(VFX.mini,x,y,mw,mh);ctx.lineWidth=1;ctx.strokeStyle='rgba(98,177,195,.38)';ctx.strokeRect(x+.5,y+.5,mw-1,mh-1);
  if(G.stairs&&G.seen[G.stairs.y][G.stairs.x]){ctx.fillStyle=G.bossAlive?C.red:C.green;ctx.fillRect(x+G.stairs.x*tw-1,y+G.stairs.y*th-1,3,3);}
  G.enemies.forEach(function(e){if(e.boss&&G.seen[e.y]&&G.seen[e.y][e.x]){ctx.fillStyle=C.red;ctx.fillRect(x+e.x*tw-2,y+e.y*th-2,4,4);}});
  G.items.forEach(function(it){if(G.seen[it.y]&&G.seen[it.y][it.x]){ctx.fillStyle='#b1d3dd';ctx.fillRect(x+it.x*tw,y+it.y*th,1.5,1.5);}});
  if(G.mod&&G.mod.ghostVision)G.enemies.forEach(function(e){if(!e.boss&&Math.max(Math.abs(e.x-p.x),Math.abs(e.y-p.y))<=10){ctx.fillStyle=C.violet;ctx.fillRect(x+e.x*tw-1,y+e.y*th-1,2,2);}});
  ctx.fillStyle='#edfeff';ctx.fillRect(x+p.x*tw-1.5,y+p.y*th-1.5,3,3);if(G.control){ctx.fillStyle=C.cyan;ctx.fillRect(x+G.control.x*tw-1.5,y+G.control.y*th-1.5,3,3);}ctx.restore();
}
function updateFx(dt){
  G.shake=Math.max(0,G.shake-dt*.045);G.hurt=Math.max(0,G.hurt-dt*.0032);G.flash=Math.max(0,G.flash-dt*.0035);G.shieldHit=Math.max(0,(G.shieldHit||0)-dt*.004);G.shieldGain=Math.max(0,(G.shieldGain||0)-dt*.004);
  var drag=Math.pow(.95,dt/16.667),i,keep=0;
  for(i=0;i<G.particles.length;i++){var pt=G.particles[i];pt.x+=pt.vx*dt/1000;pt.y+=pt.vy*dt/1000;pt.vx*=drag;pt.vy*=drag;pt.life-=dt;if(pt.life>0)G.particles[keep++]=pt;}G.particles.length=keep;
  keep=0;for(i=0;i<G.texts.length;i++){var t=G.texts[i];t.life-=dt;t.y-=dt*.00045;if(t.life>0)G.texts[keep++]=t;}G.texts.length=keep;
  keep=0;for(i=0;i<G.beams.length;i++){var b=G.beams[i];b.life-=dt;if(b.life>0)G.beams[keep++]=b;}G.beams.length=keep;
  var pcap=VFX.reduced?64:160,bcap=VFX.reduced?12:24,tcap=VFX.reduced?20:32;if(G.particles.length>pcap)G.particles.splice(0,G.particles.length-pcap);if(G.beams.length>bcap)G.beams.splice(0,G.beams.length-bcap);if(G.texts.length>tcap)G.texts.splice(0,G.texts.length-tcap);
}
function frame(now){
  requestAnimationFrame(frame);if(document.hidden){last=0;return;}
  var playing=G.state==='play'&&!G.modal,fps=playing?(VFX.reduced?30:60):15;if(VFX.drawAt&&now-VFX.drawAt<1000/fps-1)return;VFX.drawAt=now;
  var cbShow=playing&&Date.now()>=(G.uiGuardUntil||0),display=cbShow?'':'none';if(cyberBtn&&cyberBtn.style.display!==display)cyberBtn.style.display=display;
  var trainDisplay=cbShow&&G.mode==='train'?'':'none';if(visualTrainBtn&&visualTrainBtn.style.display!==trainDisplay)visualTrainBtn.style.display=trainDisplay;
  if(cbShow&&visualCyberCount){var count=String(Object.keys(G.cyber||{}).length);if(visualCyberCount.textContent!==count)visualCyberCount.textContent=count;}
  if(!stageSizeObserver&&now-(VFX.measuredAt||0)>250){VFX.resizeDirty=true;VFX.measuredAt=now;}if(!last)last=now;var dt=Math.min(80,Math.max(0,now-last));last=now;updateFx(dt);draw(now);
}
