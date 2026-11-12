'use strict';
/* CHROME SKILL FX — isolated, additive rendering patch.
 * node tools/chrome-skill-fx-patch.js --check [game.js]
 * node tools/chrome-skill-fx-patch.js --print [game.js]  (stdout only)
 * require('./tools/chrome-skill-fx-patch').patchSource(source) -> source
 * This script NEVER writes game.js. The parent owns application.
 * Only acorn-unique function ranges and exact, unique literal anchors are used.
 * checkSource verifies AST identity after removing ONLY this patch's additions.
 * No damage/resource/CD/turn/selection/RNG/AI/training/boss/frame modifications.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');
let acorn;
try { acorn = require('acorn'); } catch (_) { acorn = require('/root/workspace/neon-tooling/node_modules/acorn'); }
const MARKER = '// CHROME_SKILL_FX_V1';
const parse = source => acorn.parse(source, { ecmaVersion: 'latest' });
const isOwn = name => /^(chromeSkill|chromeFx|renderChromeSkill|renderChromePlayer)/.test(name || '');

const HELPERS = String.raw`
// CHROME_SKILL_FX_V1
// Cosmetic-only snapshots. All coordinates are INTEGER-cell centers, not G.beams' +.5 coordinates.
// Queue budgets: 48 / 24 reduced; per-kind limits protect major casts from hit spam.
// No timer callbacks, RNG, gameplay writes, or updateFx/frame dependencies.
function chromeSkillPush(kind, data) {
  if (!p || !G.map) return;
  data = data || {};
  var now = performance.now(), reduced = !!VFX.reduced;
  if (G.chromeSkillMap !== G.map) { G.chromeSkillMap = G.map; G.chromeSkillFx = []; }
  var q = G.chromeSkillFx || (G.chromeSkillFx = []);
  var keep = 0, i;
  for (i = 0; i < q.length; i++) if (now < q[i].born + q[i].life) q[keep++] = q[i];
  q.length = keep;
  var cap = reduced ? 24 : 48;
  var kindCap = kind === 'impact' ? (reduced ? 6 : 14) : kind === 'missile' || kind === 'beam' ? (reduced ? 4 : 10) : (reduced ? 6 : 12);
  var same = 0;
  for (i = 0; i < q.length; i++) if (q[i].kind === kind) same++;
  while (same >= kindCap) { for (i = 0; i < q.length; i++) if (q[i].kind === kind) { q.splice(i, 1); same--; break; } }
  // Switching reduced-motion on must shrink an already populated normal queue too.
  while (q.length > cap) { var trim = 0; for (i = 1; i < q.length; i++) if (q[i].priority < q[trim].priority) trim = i; q.splice(trim, 1); }
  var f = {
    kind: kind, x: Number.isFinite(data.x) ? data.x : p.x, y: Number.isFinite(data.y) ? data.y : p.y,
    tx: Number.isFinite(data.tx) ? data.tx : (Number.isFinite(data.x) ? data.x : p.x),
    ty: Number.isFinite(data.ty) ? data.ty : (Number.isFinite(data.y) ? data.y : p.y),
    face: Number.isFinite(data.face) ? data.face : (p.face || 0),
    born: now + (reduced ? 0 : Math.max(0, Math.min(210, data.delay || 0))),
    life: Math.max(180, Math.min(1200, data.life || 640)),
    color: data.color || '#22e6ff', priority: data.priority == null ? 1 : data.priority,
    power: Math.max(0, Number(data.power) || 0), level: Math.max(1, Math.min(5, Number(data.level) || 1)),
    radius: Math.max(.2, Math.min(4.2, Number(data.radius) || 1)), variant: data.variant || '',
    crit: !!data.crit, wide: !!data.wide, heavy: !!data.heavy,
    seq: G.chromeSkillSerial = ((G.chromeSkillSerial || 0) + 1) % 65536
  };
  if (q.length >= cap) {
    var weakest = 0;
    for (i = 1; i < q.length; i++) if (q[i].priority < q[weakest].priority) weakest = i;
    if (q[weakest].priority > f.priority) return;
    q.splice(weakest, 1);
  }
  q.push(f);
}
function chromeSkillImpact(hit) {
  if (!hit || !(hit.damage > 0)) return;
  var src = hit.source || '', from = hit.origin || p;
  var color = src.indexOf('ghost-') === 0 ? '#b690ff' : src.indexOf('mech-') === 0 ? '#ffd166' : '#22e6ff';
  if (src === 'mech-missile') {
    chromeSkillPush('missile', { x: from.x, y: from.y, tx: hit.x, ty: hit.y, color: '#ffd166', power: hit.damage,
      life: 960, priority: 2, delay: (G.chromeSkillSerial || 0) % 4 * 40, crit: hit.crit });
    return;
  }
  if (src === 'gun-pierce' || src === 'ability-shot' || src === 'turret') {
    chromeSkillPush('beam', { x: from.x, y: from.y, tx: hit.x, ty: hit.y, color: color,
      power: hit.damage, life: 350, variant: src === 'gun-pierce' ? 'pierce' : 'shot', priority: 1 });
  }
  var delay = src === 'gun' ? 65 : 0, now = performance.now(), recent = G.chromeSkillMap === G.map ? (G.chromeSkillFx || []) : [];
  for (var i = recent.length - 1; i >= 0; i--) {
    var old = recent[i];
    if (old.kind === 'impact' && old.x === hit.x && old.y === hit.y && old.variant === src && now - old.born < 35) { delay = Math.min(190, Math.max(delay, old.born - now + 70)); break; }
  }
  chromeSkillPush('impact', { x: hit.x, y: hit.y, tx: from.x, ty: from.y, power: hit.damage,
    color: hit.crit ? '#ffe5a0' : color, crit: hit.crit, life: hit.crit ? 400 : 300,
    priority: 0, delay: delay, variant: src });
}
function chromeSkillBoundBeam(beam, targets, origin) {
  if (!beam || !origin) return;
  var end = origin, distance = -1;
  (targets || []).forEach(function(t) { var d = Math.hypot(t.x - origin.x, t.y - origin.y); if (d > distance) { end = t; distance = d; } });
  // This is the just-created legacy player VFX record, not a projectile/collision body.
  beam.x1 = end.x + .5; beam.y1 = end.y + .5;
}
function chromeSkillActive(fx, origin, targets, mine) {
  if (!fx) return;
  origin = origin || p; targets = targets || [];
  var type = fx.type, color = fx.color || '#22e6ff';
  var d = { x: p.x, y: p.y, tx: origin.x, ty: origin.y, face: origin.face || p.face || 0,
    color: color, power: fx.power || 0, level: fx.level || 1, priority: 3, life: 900, variant: type };
  if (type === 'blink') { d.x = origin.x; d.y = origin.y; d.tx = p.x; d.ty = p.y; chromeSkillPush('blink', d); return; }
  if (type === 'beam' || type === 'multi' || type === 'arc') {
    chromeSkillPush('charge', Object.assign({}, d, { radius: .8, life: 420 }));
    if (type === 'beam') {
      // Use ONLY the already-resolved hit list: never paint through an occluding wall,
      // invent a target, or infer a farther endpoint from equipment level.
      var end = null, distance = -1;
      targets.forEach(function(t) { var dist = Math.hypot(t.x - p.x, t.y - p.y); if (dist > distance) { distance = dist; end = t; } });
      if (end) chromeSkillPush('beam', Object.assign({}, d, { tx: end.x, ty: end.y, heavy: true, life: 680 }));
    } else {
      targets.slice(0, VFX.reduced ? 4 : 10).forEach(function(t, i) {
        chromeSkillPush(type === 'arc' ? 'arc' : 'beam', Object.assign({}, d, {
          tx: t.x, ty: t.y, heavy: true, life: 660, delay: i * 28, priority: 2
        }));
      });
    }
    return;
  }
  if (type === 'cleave' || type === 'cleave_bleed') { d.radius = 1.8; d.heavy = true; d.wide = true; chromeSkillPush('slash', d); return; }
  if (type === 'burst' || type === 'nova' || type === 'lifesteal_burst' || type === 'shock') {
    d.radius = type === 'lifesteal_burst' ? 1.7 : 2.5; chromeSkillPush('pulse', d); return;
  }
  if (type === 'shield' || type === 'wall' || type === 'grow' || type === 'mech') {
    d.radius = type === 'grow' || type === 'mech' ? 1.4 : 1; chromeSkillPush('armor', d); return;
  }
  if (type === 'sandevistan' || type === 'mark_scan') { d.radius = type === 'sandevistan' ? 3 : 2.4; chromeSkillPush('scan', d); return; }
  if (type === 'stealth' || type === 'heal_stealth') { chromeSkillPush('cloak', d); return; }
  if (type === 'mine' && mine) { d.x = mine.x; d.y = mine.y; }
  if (type === 'drone' || type === 'turret' || type === 'mine') { chromeSkillPush('deploy', d); return; }
  // Basic shot is already captured by playerHit; do not turn every bullet into an ultimate.
}
function chromeSkillGhost(kind, origin, target, power) {
  var d = { x: p.x, y: p.y, tx: origin.x, ty: origin.y, color: '#b690ff', power: power,
    priority: 2, life: 730, variant: kind, face: p.face || 0 };
  if (kind === 'stealth' || kind === 'vanish') { chromeSkillPush('cloak', d); return; }
  if (!target) return;
  if (kind === 'mark') { d.x = target.x; d.y = target.y; d.radius = .7; chromeSkillPush('lock', d); return; }
  if (origin.x !== p.x || origin.y !== p.y) chromeSkillPush('blink', Object.assign({}, d, { x: origin.x, y: origin.y, tx: p.x, ty: p.y }));
  d.x = target.x; d.y = target.y; d.face = Math.atan2(target.y - origin.y, target.x - origin.x);
  d.radius = kind === 'execute' ? 1.85 : kind === 'assassinate' ? 1.4 : 1.05;
  d.heavy = kind === 'execute' || kind === 'assassinate'; d.wide = d.heavy;
  d.color = kind === 'execute' || kind === 'blood' ? '#ff6f9f' : '#b690ff';
  chromeSkillPush('slash', d);
}
// Reusable hard-surface line language: chamfered plate, segmented hex, bright spine.
function chromeFxPlate(x, y, w, h, angle) {
  var c = Math.min(w, h) * .22, cs = Math.cos(angle || 0), sn = Math.sin(angle || 0);
  var pts = [[-w/2+c,-h/2],[w/2-c,-h/2],[w/2,-h/2+c],[w/2,h/2-c],[w/2-c,h/2],[-w/2+c,h/2],[-w/2,h/2-c],[-w/2,-h/2+c]];
  ctx.beginPath();
  for (var i=0;i<pts.length;i++) { var px=x+pts[i][0]*cs-pts[i][1]*sn,py=y+pts[i][0]*sn+pts[i][1]*cs; if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py); }
  ctx.closePath();
}
function chromeFxHex(x, y, r, gap, angle) {
  ctx.beginPath();
  for (var i=0;i<6;i++) {
    var a=(angle||0)+i*Math.PI/3,b=a+Math.PI/3;
    var ax=x+Math.cos(a)*r,ay=y+Math.sin(a)*r,bx=x+Math.cos(b)*r,by=y+Math.sin(b)*r;
    ctx.moveTo(ax+(bx-ax)*gap,ay+(by-ay)*gap);ctx.lineTo(bx+(ax-bx)*gap,by+(ay-by)*gap);
  }
}
function chromeFxStroke(color, width, core, glow) {
  var alpha=ctx.globalAlpha;
  ctx.shadowBlur=0;ctx.strokeStyle=color;
  if(!VFX.reduced && glow){ctx.globalAlpha=alpha*.15;ctx.lineWidth=width+5;ctx.stroke();}
  ctx.globalAlpha=alpha;ctx.lineWidth=width;ctx.stroke();
  if(core){ctx.strokeStyle='#eaffff';ctx.lineWidth=Math.max(.65,width*.32);ctx.globalAlpha=alpha*.88;ctx.stroke();}
  ctx.globalAlpha=alpha;
}
function chromeFxSilhouette(x, y, tile, face, color, alpha) {
  ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle='#0b1724';
  chromeFxPlate(x,y,tile*.53,tile*.5,face);ctx.fill();chromeFxStroke(color,1.2,false,false);
  var cs=Math.cos(face),sn=Math.sin(face);
  ctx.beginPath();ctx.moveTo(x+cs*tile*.13-sn*tile*.12,y+sn*tile*.13+cs*tile*.12);
  ctx.lineTo(x+cs*tile*.13+sn*tile*.12,y+sn*tile*.13-cs*tile*.12);chromeFxStroke(color,2,true,false);ctx.restore();
}
function renderChromePlayerHardware(x, y, tile, now) {
  var ids=Object.keys(G.cyber||{}),count=ids.length;
  if(!count&&!G.mech)return;
  var cls=classDef().id,color=G.mech>0||cls==='engineer'?'#ffd166':cls==='ghost'?'#b690ff':'#22e6ff';
  var r=tile*(G.mech>0?.5:.3),lv=1;
  ids.forEach(function(slot){var g=(G.cyberGrowth||{})[G.cyber[slot]];if(g)lv=Math.max(lv,g.lv||1);});
  ctx.save();ctx.translate(x,y);ctx.rotate(p.face||0);ctx.lineCap='butt';ctx.globalAlpha*=.55+lv*.08;
  // Fixed mounted rails rather than an unrelated orbiting aura.
  for(var i=0;i<Math.min(4,Math.ceil(count/2));i++){
    var yy=(i-1.5)*r*.34;
    ctx.beginPath();ctx.moveTo(-r*.72,yy);ctx.lineTo(-r*.35,yy);chromeFxStroke(color,1.4,lv>=4,false);
  }
  if(cls==='ghost'){[-1,1].forEach(function(s){ctx.beginPath();ctx.moveTo(r*.1,s*r*.65);ctx.lineTo(r*1.05,s*r);chromeFxStroke(color,1.5,true,false);});}
  else {ctx.beginPath();ctx.moveTo(r*.6,-r*.16);ctx.lineTo(r*1.35,-r*.16);ctx.moveTo(r*.6,r*.16);ctx.lineTo(r*1.35,r*.16);chromeFxStroke(color,1.3,true,false);}
  ctx.restore();
}
function renderChromeSkillEvent(f, now, view) {
  var age=now-f.born;if(age<0||age>=f.life)return;
  if(!view.on(f.x,f.y)&&!view.on(f.tx,f.ty))return;
  var reduced=!!VFX.reduced,t=view.tile,u=age/f.life;
  // Reduced mode keeps a stable, short-lived signature: no sweep, travel or strobe.
  var v=reduced?.5:u,ease=1-Math.pow(1-v,3),fade=Math.min(1,(1-u)*3.2);
  var x=view.sx(f.x),y=view.sy(f.y),ex=view.sx(f.tx),ey=view.sy(f.ty),color=f.color;
  var gain=1+Math.min(.28,Math.log(1+f.power)/28)+(f.level-1)*.025;
  var r=t*f.radius,face=f.face,cs=Math.cos(face),sn=Math.sin(face),i,a,rr;
  ctx.save();ctx.globalAlpha=fade*(reduced?.7:1);ctx.lineCap='butt';ctx.lineJoin='bevel';ctx.setLineDash([]);ctx.shadowBlur=0;
  if(f.kind==='impact'){
    r=t*(f.crit?.38:.23)*(reduced?1:.55+ease*.7);
    var dir=Math.atan2(y-ey,x-ex);ctx.beginPath();
    for(i=0;i<(f.crit?4:3);i++){a=dir+(i-1)*.65;ctx.moveTo(x+Math.cos(a)*r*.55,y+Math.sin(a)*r*.55);ctx.lineTo(x+Math.cos(a)*r*1.35,y+Math.sin(a)*r*1.35);}
    chromeFxStroke(color,f.crit?1.8:1.25,true,false);
    if(f.crit){chromeFxHex(x,y,r,.2,Math.PI/6);chromeFxStroke(color,1,false,false);}
  }else if(f.kind==='slash'){
    var sweep=reduced?0:(v-.5)*(f.wide?1.25:.85),span=f.wide?1.45:.95;
    var scale=f.heavy?(v<.2?.55+v*2:1):.76+ease*.24;r*=scale*gain;
    ctx.save();ctx.translate(x,y);ctx.rotate(face+sweep);
    ctx.beginPath();ctx.arc(0,0,r,-span,span);ctx.arc(0,0,r*.72,span,-span,true);ctx.closePath();
    ctx.fillStyle=color;var alpha=ctx.globalAlpha;ctx.globalAlpha*=reduced?.07:.12;ctx.fill();ctx.globalAlpha=alpha;
    ctx.beginPath();ctx.arc(0,0,r,-span,span);chromeFxStroke(color,f.heavy?3.3:2,true,f.heavy);
    ctx.beginPath();ctx.arc(0,0,r*.76,-span+.13,span-.13);chromeFxStroke(color,1.1,false,false);
    for(i=0;i<3;i++){a=-span+i*span;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.83,Math.sin(a)*r*.83);ctx.lineTo(Math.cos(a)*r*1.04,Math.sin(a)*r*1.04);chromeFxStroke(color,1.2,false,false);}
    if(f.heavy){ctx.beginPath();ctx.moveTo(r*.2,0);ctx.lineTo(r*1.12,0);chromeFxStroke(color,2.4,true,true);}
    ctx.restore();
  }else if(f.kind==='beam'||f.kind==='arc'){
    var dx=ex-x,dy=ey-y,len=Math.max(1,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len;
    var charge=f.heavy&&!reduced&&v<.18,reach=reduced?1:Math.min(1,Math.max(0,(v-(f.heavy?.12:0))*7));
    ctx.beginPath();ctx.moveTo(x,y);
    if(f.kind==='arc'){
      for(i=1;i<7;i++){var k=i/6,bend=i===6?0:(i%2?1:-1)*t*.13*(reduced?.5:1);ctx.lineTo(x+dx*k+nx*bend,y+dy*k+ny*bend);}
    }else ctx.lineTo(x+dx*reach,y+dy*reach);
    if(!charge)chromeFxStroke(color,(f.heavy?4:1.8)*gain,true,f.heavy);
    if(f.heavy&&!charge){ctx.beginPath();ctx.moveTo(x+nx*t*.12,y+ny*t*.12);ctx.lineTo(ex+nx*t*.12,ey+ny*t*.12);ctx.moveTo(x-nx*t*.12,y-ny*t*.12);ctx.lineTo(ex-nx*t*.12,ey-ny*t*.12);chromeFxStroke(color,.8,false,false);}
    var muzzle=t*(f.heavy?.44:.24)*(charge?.6+v*3:1);
    chromeFxHex(x,y,muzzle,.19,Math.atan2(dy,dx));chromeFxStroke(color,f.heavy?2:1.3,true,f.heavy);
    ctx.beginPath();ctx.moveTo(x-nx*muzzle,y-ny*muzzle);ctx.lineTo(x+nx*muzzle,y+ny*muzzle);chromeFxStroke(color,1.2,true,false);
  }else if(f.kind==='missile'){
    var dxm=ex-x,dym=ey-y,l=Math.max(1,Math.hypot(dxm,dym)),side=f.seq%2?1:-1;
    var bx=(x+ex)/2-dym/l*Math.min(t*2,l*.3)*side,by=(y+ey)/2+dxm/l*Math.min(t*2,l*.3)*side;
    var flight=reduced?1:Math.min(1,v/.6);
    if(!reduced&&v<.68){
      ctx.beginPath();for(i=0;i<=10;i++){var q=Math.max(0,flight-.22)+Math.min(.22,flight)*i/10;var xx=(1-q)*(1-q)*x+2*(1-q)*q*bx+q*q*ex,yy=(1-q)*(1-q)*y+2*(1-q)*q*by+q*q*ey;if(i)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);}chromeFxStroke(color,2.1,true,false);
      var hx=(1-flight)*(1-flight)*x+2*(1-flight)*flight*bx+flight*flight*ex,hy=(1-flight)*(1-flight)*y+2*(1-flight)*flight*by+flight*flight*ey;
      var angle=Math.atan2(2*(1-flight)*(by-y)+2*flight*(ey-by),2*(1-flight)*(bx-x)+2*flight*(ex-bx));
      chromeFxPlate(hx,hy,t*.3,t*.13,angle);ctx.fillStyle='#eaffff';ctx.fill();
    }
    chromeFxHex(ex,ey,t*.44,.31,Math.PI/6);chromeFxStroke(color,.8,false,false);
    if(reduced||v>.56){var boom=reduced?.55:Math.min(1,(v-.56)/.44);chromeFxHex(ex,ey,t*(.25+boom*.9)*gain,.1,Math.PI/6);chromeFxStroke(color,2.6,true,!reduced);chromeFxHex(ex,ey,t*(.22+boom*.55),.2,0);chromeFxStroke(color,1,false,false);}
  }else if(f.kind==='pulse'||f.kind==='scan'){
    var expanding=f.variant==='lifesteal_burst'?1-ease*.7:.18+ease*.82;
    rr=r*(reduced?.8:expanding)*gain;
    chromeFxHex(x,y,rr,.06,Math.PI/6);chromeFxStroke(color,f.kind==='pulse'?2.8:1.5,f.kind==='pulse',true);
    chromeFxHex(x,y,rr*.79,.2,Math.PI/6);chromeFxStroke(color,1,false,false);
    for(i=0;i<6;i++){a=Math.PI/6+i*Math.PI/3;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*rr*.92,y+Math.sin(a)*rr*.92);ctx.lineTo(x+Math.cos(a)*(rr+t*.17),y+Math.sin(a)*(rr+t*.17));chromeFxStroke(color,1.4,true,false);}
    if(f.kind==='scan'){
      ctx.save();ctx.beginPath();ctx.rect(x-r,y-r,r*2,r*2);ctx.clip();
      var scanY=y+(reduced?0:(v*2-1))*r;ctx.beginPath();ctx.moveTo(x-r*.8,scanY);ctx.lineTo(x+r*.8,scanY);chromeFxStroke(color,1.6,true,false);ctx.restore();
    }
  }else if(f.kind==='armor'){
    var assemble=reduced?1:Math.min(1,v/.4),spread=(1-assemble)*t*.7;
    if(f.variant==='wall'){
      ctx.save();ctx.translate(x+cs*t,y+sn*t);ctx.rotate(face);
      for(i=-1;i<=1;i++){chromeFxPlate(spread,i*t,t*.26,t*.85,0);ctx.fillStyle='rgba(12,31,47,.65)';ctx.fill();chromeFxStroke(color,1.7,true,true);}ctx.restore();
    }else{
      for(i=0;i<6;i++){a=Math.PI/6+i*Math.PI/3;rr=r*(.72+spread/t);chromeFxPlate(x+Math.cos(a)*rr,y+Math.sin(a)*rr,t*.43,t*.18,a+Math.PI/2);ctx.fillStyle='rgba(12,31,47,.65)';ctx.fill();chromeFxStroke(color,1.6,true,true);}
      chromeFxHex(x,y,r*.73,.14,Math.PI/6);chromeFxStroke(color,1.4,false,false);
      if(f.variant==='grow'||f.variant==='mech'){chromeFxHex(x,y,r*(.5+assemble*.7),.05,0);chromeFxStroke(color,2.5,true,true);}
    }
  }else if(f.kind==='blink'){
    var count=reduced?2:6;
    for(i=0;i<count;i++){var t1=i/(count-1),appear=reduced?1:Math.max(.12,1-Math.abs(t1-v)*1.4);chromeFxSilhouette(x+(ex-x)*t1,y+(ey-y)*t1,t,Math.atan2(ey-y,ex-x),color,appear*(.22+t1*.3));}
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);chromeFxStroke(color,reduced?.8:1.2,false,false);
    chromeFxHex(ex,ey,t*(.5+(reduced?0:ease*.25)),.2,Math.PI/6);chromeFxStroke(color,2,true,false);
  }else if(f.kind==='cloak'){
    for(i=-1;i<=1;i++){chromeFxSilhouette(x+i*t*(reduced?.24:.6*(1-ease)),y,t,face,color,i===0?.6:.22);}
    var sy=y+(reduced?0:(v*2-1)*t*.6);ctx.beginPath();ctx.moveTo(x-t*.48,sy);ctx.lineTo(x+t*.48,sy);chromeFxStroke(color,1.7,true,false);
    if(f.variant==='heal_stealth'){ctx.beginPath();ctx.moveTo(x-t*.15,y-t*.65);ctx.lineTo(x+t*.15,y-t*.65);ctx.moveTo(x,y-t*.8);ctx.lineTo(x,y-t*.5);chromeFxStroke(color,2,true,false);}
  }else if(f.kind==='charge'){
    for(i=0;i<6;i++){a=face+i*Math.PI/3;var outer=t*(reduced?.6:1.25-ease*.7),inner=outer-t*.22;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*outer,y+Math.sin(a)*outer);ctx.lineTo(x+Math.cos(a)*inner,y+Math.sin(a)*inner);chromeFxStroke(color,2,true,true);}
    chromeFxHex(x,y,t*(.23+ease*.12),.15,Math.PI/6);chromeFxStroke(color,2,true,true);
  }else if(f.kind==='lock'||f.kind==='deploy'){
    rr=t*(f.kind==='lock'?.65:.75)*(reduced?1:1.28-ease*.28);
    ctx.beginPath();for(i=0;i<4;i++){a=Math.PI/4+i*Math.PI/2;var px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr,signX=Math.cos(a)>0?1:-1,signY=Math.sin(a)>0?1:-1;ctx.moveTo(px-signX*t*.18,py);ctx.lineTo(px,py);ctx.lineTo(px,py-signY*t*.18);}chromeFxStroke(color,1.6,true,false);
    if(f.kind==='deploy'){chromeFxPlate(x,y,t*.5,t*(f.variant==='turret'?.65:.36),0);chromeFxStroke(color,2,true,true);ctx.beginPath();ctx.moveTo(x-t*.12,y);ctx.lineTo(x+t*.12,y);chromeFxStroke(color,2,true,false);}
  }
  // Growth/power encoding belongs to the cast, not an intrusive floating HUD.
  if(f.priority===3&&f.level>1){ctx.fillStyle=color;for(i=0;i<f.level;i++)ctx.fillRect(x+(i-(f.level-1)/2)*t*.13,y+t*.7,t*.075,t*.05);}
  ctx.restore();
}
function renderChromeSkillFx(now, view) {
  if(!p||!view)return;
  // draw is read-only, even for expired events. Enqueue compacts the bounded queue.
  var q=G.chromeSkillMap===G.map?(G.chromeSkillFx||[]):[],budget=VFX.reduced?16:36,used=0;
  // Major cast snapshots get first claim on the budget; no unbounded AOE overdraw.
  for(var priority=3;priority>=0;priority--)for(var i=q.length-1;i>=0&&used<budget;i--){
    var f=q[i];if(f.priority!==priority||now<f.born||now>=f.born+f.life)continue;
    if(!view.on(f.x,f.y)&&!view.on(f.tx,f.ty))continue;
    renderChromeSkillEvent(f,now,view);used++;
  }
  if(!view.on(p.x,p.y))return;
  var x=view.sx(p.x),y=view.sy(p.y),t=view.tile;
  ctx.save();ctx.shadowBlur=0;ctx.setLineDash([]);ctx.globalAlpha=1;
  if(G.melee&&G.melee.charge>0){
    var phase=VFX.reduced?.5:(now%1400)/1400;
    for(var j=0;j<4;j++){var a=(p.face||0)+Math.PI/4+j*Math.PI/2,rr=t*(.64+(1-phase)*.35);ctx.beginPath();ctx.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);ctx.lineTo(x+Math.cos(a)*(rr-t*.2),y+Math.sin(a)*(rr-t*.2));chromeFxStroke('#ffb28f',1.7,true,!VFX.reduced);}
    chromeFxHex(x,y,t*.55,.2,Math.PI/6);chromeFxStroke('#ffb28f',1.3,false,false);
  }
  if(G.sandev||G.freeze>0){
    var trail=G.sandevTrail||[],limit=VFX.reduced?2:6;
    for(var j2=Math.max(0,trail.length-limit);j2<trail.length;j2++){var tp=trail[j2];if(view.on(tp.x,tp.y))chromeFxSilhouette(view.sx(tp.x),view.sy(tp.y),t,p.face||0,'#9fe9ff',.14+.2*(j2+1)/Math.max(1,trail.length));}
    chromeFxHex(x,y,t*.82,.3,Math.PI/6);chromeFxStroke('#9fe9ff',1.3,false,false);
    var lineY=y+(VFX.reduced?0:((now%1500)/1500*2-1)*t*.75);ctx.beginPath();ctx.moveTo(x-t*.7,lineY);ctx.lineTo(x+t*.7,lineY);ctx.globalAlpha=.5;chromeFxStroke('#9fe9ff',1.1,true,false);
  }
  ctx.restore();
}
`;

function allFunctions(tree) {
  const result = [];
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'FunctionDeclaration') result.push(n);
    for (const key of Object.keys(n)) {
      const value = n[key];
      if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value);
    }
  })(tree);
  return result;
}
function replaceOnce(text, before, after, label) {
  const at = text.indexOf(before);
  if (at < 0 || text.indexOf(before, at + before.length) >= 0) throw new Error('Unique literal anchor failed: ' + label);
  return text.slice(0, at) + after + text.slice(at + before.length);
}
function patchSource(input) {
  let source = input;
  if (source.includes(MARKER)) {
    const names = allFunctions(parse(source)).map(n => n.id.name);
    for (const name of ['chromeSkillPush', 'chromeSkillActive', 'renderChromeSkillFx', 'renderChromePlayerHardware'])
      assert.strictEqual(names.filter(n => n === name).length, 1, 'Partial/duplicate installation: ' + name);
    return source;
  }
  function rewrite(name, changes) {
    const nodes = allFunctions(parse(source)).filter(n => n.id.name === name);
    assert.strictEqual(nodes.length, 1, 'Expected unique function: ' + name);
    const n = nodes[0]; let text = source.slice(n.start, n.end);
    for (const [before, addition, where] of changes) text = replaceOnce(text, before, where === 'before' ? addition + before : before + addition, name + ': ' + before.slice(0, 80));
    source = source.slice(0, n.start) + text + source.slice(n.end);
  }
  rewrite('playerHit', [[
    '  return { damage: dealt, crit: hit.crit, raw: hit.raw };',
    '  chromeSkillImpact(dealt > 0 ? G.lastHit : null);\n', 'before'
  ]]);
  rewrite('playerAttack', [[
    '  if (e.hp <= 0) killEnemy(e);',
    "  chromeSkillPush('slash', { x: p.x, y: p.y, tx: e.x, ty: e.y, face: Math.atan2(e.y-p.y,e.x-p.x), color: (prof && prof.color) || '#ff8fc7', radius: charged ? 2.25 : wantArc ? 1.65 : 1.02, wide: !!wantArc, heavy: charged, power: raw, priority: charged ? 3 : 1, life: charged ? 780 : 340 });\n", 'before'
  ]]);
  rewrite('startMeleeCharge', [[
    '  G.melee.charge = 1;',
    "\n  chromeSkillPush('charge', { color: (mw.melee && mw.melee.color) || '#ffb28f', priority: 3, life: 760 });"
  ]]);
  rewrite('useCyberActive', [
    ['  var a = m.active;', '\n  var chromeFxOrigin = { x: p.x, y: p.y, face: p.face };\n  var chromeFxBeamIndex = G.beams.length;'],
    ['color: ACT_COLOR[a.type] || C.cyan, power: base, level: lv, id: id };',
      "\n    chromeSkillBoundBeam(a.type === 'beam' ? G.beams[chromeFxBeamIndex] : null, targets || [], chromeFxOrigin);\n    chromeSkillActive(G.cyberFx, chromeFxOrigin, targets || [], mt || null);"]
  ]);
  rewrite('shootAt', [[
    '    burst(target.x, target.y, special ? SPECIALS[special].color : C.cyan, 6);',
    "    chromeSkillPush('beam', { x: p.x, y: p.y, tx: target.x, ty: target.y, color: special ? SPECIALS[special].color : C.cyan, power: dmg, variant: special || 'shot', heavy: special === 'pierce' || G.overheat > 0, priority: 1, life: special ? 420 : 290, delay: i * 85 });\n", 'before'
  ]]);
  rewrite('fireLaser', [[
    '  G.shake = 8;',
    "  chromeSkillPush('beam', { x: p.x, y: p.y, tx: lastX, ty: lastY, color: '#ffd166', heavy: true, power: effAtk() * 2, priority: 3, life: 760, variant: 'laser' });\n", 'before'
  ]]);
  // Missile snapshots use playerHit's existing origin + target; no second target scan.
  rewrite('ghostAct', [
    ['  var raw = target ? ghostRawDamage(k,target) : 0;', '\n  var chromeFxOrigin = { x: p.x, y: p.y, face: p.face };'],
    ['  computeFOV(); updateHUD(); endTurn();', '  chromeSkillGhost(k, chromeFxOrigin, target, raw);\n', 'before']
  ]);
  rewrite('useAbility', [
    ['  if (!abilityEffect(s)) return;', '  var chromeFxOrigin = { x: p.x, y: p.y, face: p.face };\n', 'before'],
    ['  G.cd[id] = effCd(s) + 1;', "  chromeSkillActive({ type: s.ability, color: s.color || '#22e6ff', level: (G.skills || {})[id] || 1 }, chromeFxOrigin, []);\n", 'before']
  ]);
  rewrite('assaultDash', [
    ['  var moved = 0;', '  var chromeFxOrigin = { x: p.x, y: p.y, face: p.face };\n', 'before'],
    ['  if (!moved) { msg(\'前方受阻\', \'dim\'); return; }', "\n  chromeSkillActive({ type: 'blink', color: '#22e6ff' }, chromeFxOrigin, []);"]
  ]);
  rewrite('assaultShock', [[
    '  G.energy -= 3;', "  chromeSkillActive({ type: 'shock', color: '#22e6ff', power: gunBase() * 1.4 }, p, []);\n", 'before'
  ]]);
  rewrite('gunOverheat', [[
    '  G.overheat = 5;', "\n  chromeSkillPush('charge', { color: '#ffb347', priority: 3, life: 900, variant: 'overheat' });"
  ]]);
  rewrite('gunOverclock', [[
    '  G.overclock = 6;', "\n  chromeSkillPush('charge', { color: '#22e6ff', priority: 3, life: 900, variant: 'overclock' });"
  ]]);
  rewrite('mechShock', [[
    '  G.mechCd.shock = 3;', "  chromeSkillActive({ type: 'shock', color: '#ffd166', power: effAtk() * 1.5 }, p, []);\n", 'before'
  ]]);
  rewrite('mechBarrier', [[
    '  G.mechCd.barrier = 3;', "  chromeSkillActive({ type: 'wall', color: '#b690ff' }, p, []);\n", 'before'
  ]]);
  rewrite('toggleMech', [[
    '    G.mech = G.mechFuel;', "\n    chromeSkillActive({ type: 'mech', color: '#ffd166', level: Math.min(5, (G.mechMods || []).length + 1) }, p, []);"
  ]]);
  rewrite('startOverload', [[
    '  G.freeze = 5;', "\n  chromeSkillActive({ type: 'sandevistan', color: '#b690ff', level: 5 }, p, []);"
  ]]);
  rewrite('visualPlayer', [[
    '  ctx.restore();\n}', '  renderChromePlayerHardware(x,y,tile,now);\n', 'before'
  ]]);
  rewrite('draw', [[
    '  ctx.globalAlpha=1;ctx.restore();drawMinimap(w);',
    '  renderChromeSkillFx(now,view);\n', 'before'
  ]]);
  const draw = allFunctions(parse(source)).filter(n => n.id.name === 'draw');
  assert.strictEqual(draw.length, 1);
  source = source.slice(0, draw[0].start) + HELPERS + '\n' + source.slice(draw[0].start);
  parse(source);
  return source;
}
// Strong audit: erase only additions under our namespace; every original AST node must match.
function gameplayAST(tree) {
  function strip(n) {
    if (Array.isArray(n)) return n.map(strip).filter(x => x !== undefined);
    if (!n || typeof n !== 'object') return n;
    if (n.type === 'FunctionDeclaration' && isOwn(n.id.name)) return undefined;
    if (n.type === 'VariableDeclaration' && n.declarations.every(d => d.id.type === 'Identifier' && isOwn(d.id.name))) return undefined;
    if (n.type === 'ExpressionStatement' && n.expression.type === 'CallExpression' && n.expression.callee.type === 'Identifier' && isOwn(n.expression.callee.name)) return undefined;
    const out = {};
    for (const key of Object.keys(n)) if (!['start', 'end', 'raw'].includes(key)) out[key] = strip(n[key]);
    return out;
  }
  return strip(tree);
}
function helperSelfTest() {
  let clock = 1000, saves = 0, calls = 0;
  const noop = (...args) => { for (const a of args) if (typeof a === 'number') assert(Number.isFinite(a), 'Non-finite canvas coordinate'); calls++; };
  const ctx = new Proxy({ globalAlpha: 1, save() { saves++; }, restore() { saves--; assert(saves >= 0); } }, {
    get(target, key) { return key in target ? target[key] : noop; }, set(target, key, value) { target[key] = value; return true; }
  });
  const sandbox = {
    performance: { now: () => clock }, ctx, VFX: { reduced: false },
    p: { x: 4, y: 5, face: .2, hp: 100, buffs: [] },
    G: { map: [[]], melee: { charge: 1 }, sandev: { range: 6 }, sandevTrail: [{ x: 3, y: 5 }], cyber: { hand: 'test' }, cyberGrowth: { test: { lv: 5 } }, energy: 30, turn: 9, cyberCd: { test: 4 }, enemies: [{ x: 6, y: 5, hp: 80 }] },
    classDef: () => ({ id: 'ghost' }), Math: Object.create(Math)
  };
  sandbox.Math.random = () => { throw new Error('VFX must not consume gameplay RNG'); };
  vm.createContext(sandbox); vm.runInContext(HELPERS, sandbox);
  const game = () => JSON.stringify({ p: sandbox.p, G: Object.fromEntries(Object.entries(sandbox.G).filter(([k]) => !k.startsWith('chromeSkill'))) });
  const baseline = game();
  const legacyBeam = { x0: 4.5, y0: 5.5, x1: 11.5, y1: 5.5, life: 220 };
  sandbox.chromeSkillBoundBeam(legacyBeam, [{ x: 6, y: 5 }, { x: 8, y: 5 }], sandbox.p);
  assert.strictEqual(legacyBeam.x1, 8.5); assert.strictEqual(legacyBeam.y1, 5.5);
  sandbox.chromeSkillBoundBeam(legacyBeam, [], sandbox.p);
  assert.strictEqual(legacyBeam.x1, 4.5); assert.strictEqual(legacyBeam.life, 220);
  sandbox.chromeSkillActive({ type: 'beam' }, sandbox.p, []);
  assert(!sandbox.G.chromeSkillFx.some(f => f.kind === 'beam'), 'No-hit beam invented an endpoint');
  for (let i = 0; i < 60; i++) sandbox.chromeSkillPush('test-' + i, { priority: 1 });
  assert.strictEqual(sandbox.G.chromeSkillFx.length, 48);
  sandbox.VFX.reduced = true; sandbox.chromeSkillPush('charge', { priority: 3 });
  assert(sandbox.G.chromeSkillFx.length <= 24, 'Reduced-mode toggle exceeded queue cap');
  const view = { tile: 24, sx: x => 37 + (x - 2 + .5) * 24, sy: y => 19 + (y - 3 + .5) * 24, on: () => true };
  for (const reduced of [false, true]) {
    sandbox.VFX.reduced = reduced; sandbox.G.chromeSkillFx = []; clock += 2000;
    for (let i = 0; i < 1000; i++) sandbox.chromeSkillImpact({ x: i % 10, y: 7, source: i % 2 ? 'gun' : 'mech-missile', origin: sandbox.p, damage: 50, crit: !!(i % 3) });
    assert(sandbox.G.chromeSkillFx.length <= (reduced ? 24 : 48));
    assert(sandbox.G.chromeSkillFx.filter(f => f.kind === 'missile').length <= (reduced ? 4 : 10));
    assert(sandbox.G.chromeSkillFx.filter(f => f.kind === 'impact').length <= (reduced ? 6 : 14));
    const samples = ['impact', 'slash', 'beam', 'arc', 'missile', 'pulse', 'scan', 'armor', 'blink', 'cloak', 'charge', 'lock', 'deploy'];
    for (const kind of samples) {
      sandbox.chromeSkillPush(kind, { x: 4, y: 5, tx: 9, ty: 8, color: '#22e6ff', power: 300, level: 5, heavy: true, wide: true, radius: 2, priority: 3, life: 1000 });
      const f = sandbox.G.chromeSkillFx[sandbox.G.chromeSkillFx.length - 1];
      for (const age of [0, 80, 200, 450, 650, 900, 1200]) sandbox.renderChromeSkillEvent(f, f.born + age, view);
    }
    for (const type of ['shield', 'wall', 'grow', 'mech', 'burst', 'nova', 'lifesteal_burst', 'multi', 'beam', 'arc', 'blink', 'stealth', 'heal_stealth', 'mark_scan', 'sandevistan', 'drone', 'turret', 'mine', 'cleave', 'cleave_bleed']) {
      sandbox.chromeSkillActive({ type, power: 100, level: 5 }, { x: 2, y: 5, face: .1 }, [{ x: 8, y: 5 }, { x: 6, y: 9 }], { x: 9, y: 9 });
      for (const f of sandbox.G.chromeSkillFx) sandbox.renderChromeSkillEvent(f, f.born + 300, view);
    }
    const queueBefore = JSON.stringify(sandbox.G.chromeSkillFx);
    for (const age of [0, 100, 400, 800, 1600]) sandbox.renderChromeSkillFx(clock + age, view);
    sandbox.renderChromePlayerHardware(50, 60, 24, clock);
    assert.strictEqual(JSON.stringify(sandbox.G.chromeSkillFx), queueBefore, 'Rendering mutated event queue');
    assert.strictEqual(game(), baseline, 'VFX changed gameplay state');
    assert.strictEqual(saves, 0, 'Unbalanced canvas save/restore');
  }
  return { canvasCalls: calls, queueCaps: '48/24', renderCaps: '36/16', gameplayUnchanged: true, renderReadOnly: true, noRNG: true };
}
function checkSource(source) {
  const result = patchSource(source);
  assert.deepStrictEqual(gameplayAST(parse(result)), gameplayAST(parse(source)), 'Original gameplay AST changed');
  assert.strictEqual(patchSource(result), result, 'Patch is not idempotent');
  return { source: result, report: { alreadyApplied: source.includes(MARKER), astPreserved: true, idempotent: true, ...helperSelfTest() } };
}
module.exports = { patchSource, checkSource, helperSelfTest, HELPERS };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] !== '--check' && args[0] !== '--print') {
    console.error('Usage: node tools/chrome-skill-fx-patch.js --check|--print [game.js]'); process.exitCode = 2;
  } else {
    const file = path.resolve(args[1] || path.join(__dirname, '..', 'game.js'));
    const result = checkSource(fs.readFileSync(file, 'utf8'));
    if (args[0] === '--print') process.stdout.write(result.source);
    else console.log(JSON.stringify({ file, ...result.report }, null, 2));
  }
}

/* Parent integration / visual QA:
 * 1. Run --check; apply patchSource to the latest merged source, never an old snapshot.
 * 2. Open training: charged cleave, double shot, piercing special, mech laser/missiles,
 *    cyber active types, ghost mark/chase/execute, shield/wall, blink and time-slow.
 * 3. Compare identical gameplay snapshots and seeded RNG before/after; AST proof also
 *    guarantees all original statements remain, including target selection and costs.
 * 4. Screen capture at +80/+220/+500/+850 ms, including camera edge + screen shake.
 *    The independent draw call is INSIDE the exact map ctx.save/restore, uses integer
 *    cell coordinates with view.sx/sy, and never repeats a camera/shake transform.
 * 5. Reduced mode: static signatures, no beam travel, missile flight, scan sweep,
 *    silhouette motion or glow pass; still shows direction/skill/level. No screen wash.
 * 6. 200-hit AOE stress: queue <=48/24, rendered <=36/16; regular impacts <=14/6.
 *    Queues expire by performance.now even when turns do not move. New map references
 *    immediately hide old effects. Critical hits stay local; only casts use large glyphs.
 */
