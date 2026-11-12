/* Shared visual language: cut metal shells, exposed cores, cyan friendly / red hostile signals. */
function visualPlate(x,y,w,h,cut) {
  var c=cut||Math.min(w,h)*.18;
  ctx.beginPath();ctx.moveTo(x-w/2+c,y-h/2);ctx.lineTo(x+w/2,y-h/2);ctx.lineTo(x+w/2,y+h/2-c);ctx.lineTo(x+w/2-c,y+h/2);ctx.lineTo(x-w/2,y+h/2);ctx.lineTo(x-w/2,y-h/2+c);ctx.closePath();
}
function visualBossSignature(e,x,y,r,now) {
  ctx.save();ctx.lineWidth=1.8;ctx.strokeStyle='#a9b8c3';ctx.fillStyle='#18232d';
  if(e.id==='bl_hound'){
    [-1,1].forEach(function(d){ctx.beginPath();ctx.moveTo(x+d*r*.45,y-r*.4);ctx.lineTo(x+d*r*1.5,y-r*1.25);ctx.lineTo(x+d*r*.95,y+r*.65);ctx.lineTo(x+d*r*.35,y+r*.2);ctx.closePath();ctx.fill();ctx.stroke();});
    ctx.strokeStyle='#ff365c';ctx.beginPath();ctx.moveTo(x-r*.45,y+r*.3);ctx.lineTo(x,y+r*.85);ctx.lineTo(x+r*.45,y+r*.3);ctx.stroke();
  }else if(e.id==='bl_hive'||e.id==='bh_hive'){
    for(var i=0;i<(e.id==='bh_hive'?6:4);i++){var a=i*TAU/(e.id==='bh_hive'?6:4),cx=x+Math.cos(a)*r*1.15,cy=y+Math.sin(a)*r*1.15;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*r*.3,cy+Math.sin(a)*r*.3);ctx.stroke();visualPlate(cx,cy,r*.48,r*.6);ctx.fill();ctx.stroke();ctx.fillStyle='#ff365c';ctx.fillRect(cx-1,cy-r*.12,2,r*.24);ctx.fillStyle='#18232d';}
  }else if(e.id==='bl_warden'){
    ctx.save();ctx.translate(x,y);ctx.rotate((e.facing||0)+Math.PI/2);visualPlate(0,-r*.45,r*2.2,r*.9);ctx.fill();ctx.stroke();ctx.strokeStyle='#ff365c';ctx.beginPath();ctx.moveTo(-r*.75,-r*.7);ctx.lineTo(r*.75,-r*.7);ctx.stroke();ctx.restore();
    if(e.brain&&e.brain.plate<=0){ctx.strokeStyle='#ffd166';ctx.beginPath();ctx.arc(x,y,r*.55,0,TAU);ctx.stroke();}
  }else if(e.id==='bl_lance'){
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(p.y-e.y,p.x-e.x));visualPlate(r*.9,0,r*1.9,r*.45);ctx.fill();ctx.stroke();ctx.strokeStyle='#ff365c';ctx.beginPath();ctx.moveTo(r*.2,0);ctx.lineTo(r*1.9,0);ctx.stroke();ctx.restore();
  }else if(e.id==='bl_mine'){
    for(var j=0;j<6;j++){var a=j*TAU/6;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r*.5,y+Math.sin(a)*r*.5);ctx.lineTo(x+Math.cos(a)*r*1.25,y+Math.sin(a)*r*1.25);ctx.lineTo(x+Math.cos(a+.2)*r*1.7,y+Math.sin(a+.2)*r*1.7);ctx.stroke();}
  }else if(e.id==='bl_mirror'){
    [-1,1].forEach(function(d){visualPolygon(x+d*r*.95,y,r*.75,4,0);ctx.fill();ctx.stroke();ctx.strokeStyle='#ff365c';ctx.beginPath();ctx.moveTo(x+d*r*.95-r*.2,y-r*.4);ctx.lineTo(x+d*r*.95+r*.2,y+r*.4);ctx.stroke();ctx.strokeStyle='#a9b8c3';});
  }else if(e.id==='bh_eye'){
    ctx.beginPath();ctx.ellipse(x,y,r*1.25,r*.65,0,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#ff365c';ctx.beginPath();ctx.arc(x,y,r*(e.intent?.38:.24),0,TAU);ctx.fill();ctx.strokeStyle='#ff365c';ctx.beginPath();ctx.arc(x,y,r*1.48,-.4,Math.PI+.4);ctx.stroke();
  }else if(e.id==='bh_phase'){
    ctx.save();ctx.translate(x,y);ctx.rotate(VFX.reduced?0:now*.0003);for(var q=0;q<3;q++){var a=q*TAU/3;visualPolygon(Math.cos(a)*r*.85,Math.sin(a)*r*.85,r*.8,3,a);ctx.fill();ctx.stroke();}ctx.restore();
    ctx.strokeStyle='#ff365c';ctx.setLineDash([r*.4,r*.2]);ctx.beginPath();ctx.arc(x,y,r*1.6,0,TAU);ctx.stroke();
  }
  ctx.restore();
}
function visualStructure(e,x,y,tile,now) {
  var r=tile*.38,hot=typeof e.hitFx==='number'&&now-e.hitFx<130;
  ctx.save();ctx.lineWidth=1.4;ctx.strokeStyle=hot?'#ffffff':'#9bafb9';ctx.fillStyle='#17212a';
  if(e.structure==='egg'){
    ctx.beginPath();ctx.ellipse(x,y,r*.75,r*1.05,0,0,TAU);ctx.fill();ctx.stroke();ctx.strokeStyle='#ff365c';ctx.beginPath();ctx.moveTo(x-r*.2,y-r*.65);ctx.lineTo(x+r*.12,y-r*.18);ctx.lineTo(x-r*.14,y+r*.2);ctx.lineTo(x+r*.2,y+r*.65);ctx.stroke();
    ctx.fillStyle='rgba(255,54,92,'+(VFX.reduced?.25:.18+.18*Math.sin(now/(e.incubation<=1?100:400))).toFixed(2)+')';ctx.beginPath();ctx.ellipse(x,y,r*.48,r*.8,0,0,TAU);ctx.fill();
  }else if(e.structure==='mirror'){
    visualPolygon(x,y,r*1.15,4,0);ctx.fill();ctx.stroke();ctx.strokeStyle='#ff365c';ctx.lineWidth=e.reflectFx&&now-e.reflectFx<350?3:1.5;ctx.beginPath();ctx.moveTo(x-r*.45,y+(e.slant?-1:1)*r*.45);ctx.lineTo(x+r*.45,y+(e.slant?1:-1)*r*.45);ctx.stroke();
  }else{
    visualPlate(x,y,r*1.5,r*1.65);ctx.fill();ctx.stroke();ctx.fillStyle=e.structure==='medic'?'#57ffa8':'#ff365c';
    for(var k=0;k<3;k++)ctx.fillRect(x-r*.4,y-r*.45+k*r*.4,r*.8,2);
    if(e.structure==='nest'||e.structure==='gate'){ctx.strokeStyle='#728995';for(var i=0;i<4;i++){var a=i*TAU/4+Math.PI/4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*r*1.5,y+Math.sin(a)*r*1.5);ctx.stroke();}}
  }
  var w=tile*.8;ctx.fillStyle='#020609';ctx.fillRect(x-w/2,y-r-5,w,3);ctx.fillStyle='#ff365c';ctx.fillRect(x-w/2,y-r-5,w*Math.max(0,e.hp/e.maxHp),2);
  ctx.font='600 '+Math.max(8,tile*.26)+'px monospace';ctx.textAlign='center';ctx.fillStyle='#c6d6dc';ctx.fillText(e.structure==='egg'?'卵':e.structure==='nest'?'巢':e.structure==='mirror'?'镜':e.structure==='relay'?'盾':e.structure==='medic'?'生':'隙',x,y+r+tile*.35);
  ctx.restore();
}
function visualEnemy(e,x,y,tile,now,silhouette) {
  if(e.structure){visualStructure(e,x,y,tile,now);return;}
  var r=tile*(e.boss?.53:.29),red='#ff365c',hit=typeof e.hitFx==='number'&&now-e.hitFx>=0&&now-e.hitFx<130;
  ctx.save();ctx.globalAlpha=silhouette?.35:1;ctx.lineWidth=e.boss?1.9:1.4;ctx.strokeStyle=hit?'#ffffff':'#93a7b1';ctx.fillStyle=hit?'#45353d':'#18232d';
  ctx.save();ctx.fillStyle='rgba(0,0,0,.6)';ctx.beginPath();ctx.ellipse(x,y+r*.8,r*1.1,r*.35,0,0,TAU);ctx.fill();ctx.restore();
  visualPlate(x,y,r*1.65,r*1.75);ctx.fill();ctx.stroke();
  if(e.boss)visualBossSignature(e,x,y,r,now);
  else if(e.ai==='tank'){visualPlate(x,y-r*.2,r*2.4,r*1.8);ctx.fill();ctx.stroke();ctx.strokeStyle=red;ctx.beginPath();ctx.moveTo(x-r*.6,y-r*.65);ctx.lineTo(x+r*.6,y-r*.65);ctx.stroke();}
  else if(e.ai==='turret'){ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(p.y-e.y,p.x-e.x));visualPlate(r*.65,0,r*1.6,r*.45);ctx.fill();ctx.stroke();ctx.fillStyle=red;ctx.fillRect(r*.95,-r*.16,r*.5,r*.32);ctx.restore();}
  else if(e.ai==='charger'){ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(p.y-e.y,p.x-e.x));ctx.beginPath();ctx.moveTo(r*1.5,0);ctx.lineTo(-r*.4,-r*.9);ctx.lineTo(r*.3,0);ctx.lineTo(-r*.4,r*.9);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
  else if(e.ai==='exploder'){ctx.strokeStyle=red;ctx.beginPath();ctx.arc(x,y,r*.72,0,TAU);ctx.stroke();for(var j=0;j<6;j++){var a=j*TAU/6;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r*.9,y+Math.sin(a)*r*.9);ctx.lineTo(x+Math.cos(a)*r*1.25,y+Math.sin(a)*r*1.25);ctx.stroke();}}
  else if(e.ai==='summoner'){for(var q=-1;q<=1;q++){ctx.beginPath();ctx.moveTo(x+q*r*.5,y-r*.6);ctx.lineTo(x+q*r*.85,y-r*1.3);ctx.stroke();ctx.fillStyle=red;ctx.fillRect(x+q*r*.85-1,y-r*1.3-1,2,2);}}
  else if(e.ai==='healer'){ctx.strokeStyle='#57ffa8';ctx.beginPath();ctx.moveTo(x-r*.5,y);ctx.lineTo(x+r*.5,y);ctx.moveTo(x,y-r*.5);ctx.lineTo(x,y+r*.5);ctx.stroke();}
  else{ctx.beginPath();ctx.moveTo(x-r*.6,y+r*.5);ctx.lineTo(x-r*1.15,y+r*1.1);ctx.moveTo(x+r*.6,y+r*.5);ctx.lineTo(x+r*1.15,y+r*1.1);ctx.stroke();}
  if(e.ai!=='healer'){ctx.fillStyle=red;ctx.fillRect(x-r*.32,y-r*.1,r*.64,r*.2);}
  if(e.intent){var charge=1-(e.intent.turns/(e.intent.total||e.intent.turns||1));ctx.strokeStyle='rgba(255,54,92,'+(.35+charge*.5)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r*1.5,-Math.PI*.8,Math.PI*.8);ctx.stroke();}
  if(e.elite){ctx.strokeStyle='#ffd166';ctx.lineWidth=1;visualPlate(x,y,r*2.6,r*2.6);ctx.stroke();}
  if(e.marked){var br=r*1.55,len=tile*.15;ctx.strokeStyle='#22e6ff';ctx.beginPath();[-1,1].forEach(function(dx){[-1,1].forEach(function(dy){ctx.moveTo(x+dx*(br-len),y+dy*br);ctx.lineTo(x+dx*br,y+dy*br);ctx.lineTo(x+dx*br,y+dy*(br-len));});});ctx.stroke();ctx.fillStyle='#22e6ff';var mk=Math.min(5,e.marks||1);for(var m=0;m<mk;m++)ctx.fillRect(x-(mk*4-1)/2+m*4,y+r*1.5+3,3,3);}
  var w=tile*(e.boss?1.5:.72);ctx.fillStyle='#03070c';ctx.fillRect(x-w/2,y-r-6,w,4);ctx.fillStyle=red;ctx.fillRect(x-w/2,y-r-6,w*clamp(e.hp/e.maxHp,0,1),3);
  if(e.boss){ctx.fillStyle='#03070c';for(var b=1;b<4;b++)ctx.fillRect(x-w/2+w*b/4,y-r-6,1,3);}
  if(e.stun>0){ctx.font='bold '+Math.max(9,tile*.3)+'px monospace';ctx.fillStyle='#22e6ff';ctx.textAlign='center';ctx.fillText('断',x,y-r-9);}
  else if(!e.boss&&e.alerted){ctx.fillStyle=red;ctx.fillRect(x-.7,y-r-12,1.4,3);ctx.fillRect(x-.7,y-r-7,1.4,1.4);}
  if(classDef().id==='ghost'&&ghostEnemyKillable(e)){ctx.font='bold '+Math.max(10,tile*.38)+'px monospace';ctx.fillStyle='#ffb0bb';ctx.textAlign='center';ctx.fillText('斩',x+r*1.7,y);}
  if(e.pulseFx&&now-e.pulseFx<550){ctx.strokeStyle='rgba(255,54,92,'+(1-(now-e.pulseFx)/550)*.5+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,tile*(1+(now-e.pulseFx)/120),0,TAU);ctx.stroke();}
  ctx.restore();
}
function visualPlayer(x,y,tile,now) {
  var cls=classDef().id,mech=G.mech>0,hidden=G.stealth>0||(cls==='ghost'&&ghostHidden()),grow=p.buffs.some(function(b){return b.id==='grow';});
  var r=tile*.3*(mech?1.65:grow?1.35:1),color=mech||cls==='engineer'?'#ffd166':cls==='ghost'?'#b690ff':'#22e6ff';
  ctx.save();ctx.globalAlpha=hidden?.5:1;ctx.strokeStyle='#b5cbd2';ctx.fillStyle='#152a34';ctx.lineWidth=1.7;
  ctx.save();ctx.translate(x,y);ctx.rotate(p.face||0);visualPlate(0,0,r*1.7,r*1.65);ctx.fill();ctx.stroke();
  if(mech){[-1,1].forEach(function(d){visualPlate(-r*.15,d*r,r*1.4,r*.65);ctx.fill();ctx.stroke();});visualPlate(r*.85,0,r*1.1,r*.4);ctx.fill();ctx.stroke();}
  else if(cls==='engineer'){visualPlate(-r*.9,0,r*.5,r*1.55);ctx.fill();ctx.stroke();}
  else if(cls==='ghost'){[-1,1].forEach(function(d){ctx.beginPath();ctx.moveTo(-r*.1,d*r*.6);ctx.lineTo(r*1.2,d*r*1.15);ctx.stroke();});}
  else{visualPlate(r*.75,0,r*1.15,r*.35);ctx.fill();ctx.stroke();}
  ctx.fillStyle=color;ctx.fillRect(r*.05,-r*.4,r*.2,r*.8);ctx.restore();
  if(hidden){ctx.setLineDash([3,4]);ctx.strokeStyle=color;ctx.beginPath();ctx.arc(x,y,r*1.65,0,TAU);ctx.stroke();ctx.setLineDash([]);}
  if(mech){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r*1.5,-Math.PI/2,-Math.PI/2+TAU*clamp(G.mech/(G.mechMax||12),0,1));ctx.stroke();}
  if(shieldPool()>0){ctx.strokeStyle='#22e6ff';ctx.lineWidth=1.5+Math.min(1,G.shieldHit||0)*2;visualPolygon(x,y,r*1.85,6,-Math.PI/6);ctx.stroke();}
  if(G.cyberFx&&now-G.cyberFx.born<500){var f=G.cyberFx,age=(now-f.born)/500;ctx.strokeStyle=hexA(f.color||color,1-age);ctx.lineWidth=2;visualPolygon(x,y,r*(1.6+age*1.4),6,Math.PI/6);ctx.stroke();}
  if(G.hurt>0){ctx.strokeStyle=hexA('#ff365c',G.hurt*.8);ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,r*1.5,.2,Math.PI-.2);ctx.stroke();}
  ctx.restore();
}
function visualCells(cells,color,turns,view,impact) {
  if(!Array.isArray(cells)||!cells.length)return;
  var now=performance.now(),pulse=VFX.reduced?.6:.5+.5*Math.sin(now/(turns>1?370:140));
  var hostile=color==='#ff365c'||color===C.red||color===C.pink;var tint=hostile?'#ff365c':color||'#ff365c';
  var keys={};cells.forEach(function(c){keys[c.x+','+c.y]=true;});
  ctx.save();ctx.fillStyle=hexA(tint,impact!=null?(1-impact)*.24:.055+pulse*.075);ctx.strokeStyle=hexA(tint,impact!=null?(1-impact)*.8:.25+pulse*.4);ctx.lineWidth=1.4;ctx.beginPath();
  cells.forEach(function(c){if(!view.on(c.x,c.y)||!G.seen[c.y]||!G.seen[c.y][c.x])return;var x=view.sx(c.x)-view.tile/2,y=view.sy(c.y)-view.tile/2,t=view.tile;
    ctx.fillRect(x,y,t,t);
    if(!keys[(c.x-1)+','+c.y]){ctx.moveTo(x+1,y);ctx.lineTo(x+1,y+t);}
    if(!keys[(c.x+1)+','+c.y]){ctx.moveTo(x+t-1,y);ctx.lineTo(x+t-1,y+t);}
    if(!keys[c.x+','+(c.y-1)]){ctx.moveTo(x,y+1);ctx.lineTo(x+t,y+1);}
    if(!keys[c.x+','+(c.y+1)]){ctx.moveTo(x,y+t-1);ctx.lineTo(x+t,y+t-1);}
  });ctx.shadowColor=tint;ctx.shadowBlur=VFX.reduced?0:5;ctx.stroke();ctx.restore();
}
