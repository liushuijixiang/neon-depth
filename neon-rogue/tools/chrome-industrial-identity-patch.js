'use strict';

// Source transformer only: requiring this module never reads/writes game.js.
// Apply before bundling; all replacements must match exactly once. Parent owns tests.
const MARK = '// CHROME_INDUSTRIAL_IDENTITY_V1';
const END = '// END_CHROME_INDUSTRIAL_IDENTITY_V1';
const HELPERS = String.raw`
// CHROME_INDUSTRIAL_IDENTITY_V1
// Encounter state belongs to this entity, map and player instance, never equipment.
function chromeIndustrialRead(e) {
  var s=e&&e.brain&&e.brain.industrial;
  return s&&s.uid===e.uid&&s.map===G.map&&s.target===p&&cyberAlive(e)?s:null;
}
function chromeIndustrialState(e) {
  var s=chromeIndustrialRead(e);if(s)return s;
  if(!cyberAlive(e))return null;
  e.brain=e.brain||{};
  return e.brain.industrial={uid:tacticUid(e),map:G.map,target:p,wound:0,heat:0,hot:0,orbit:1,line:null};
}
function chromeIndustrialBite(e,raw) {
  // hurtPlayer's RETURN is post-dodge, post-shield HP damage; reflected death wins.
  var dealt=hurtPlayer(raw,e);
  if(dealt>0&&p.hp>0&&cyberAlive(e)){
    var s=chromeIndustrialState(e);s.wound=3;
    float(p.x,p.y,'咬伤 / 追猎',C.red);
  }
  return dealt;
}
function chromeIndustrialHunt(e,dist) {
  if(G.freeze>0)return;
  var s=chromeIndustrialRead(e);if(!s||s.wound<=0)return;
  s.wound--;
  // A wound creates pursuit tempo, NOT unavoidable damage or altered player CDs.
  // The existing intent is never moved/retargeted by this extra pursuit step.
  if(!e.intent&&cyberDistance(e,p)>1&&los(e.x,e.y,p.x,p.y))stepToward(e,dist);
}
function chromeIndustrialExposed(e) {
  var s=chromeIndustrialRead(e);return !!(s&&s.hot>0);
}
function chromeIndustrialHeat(e,amount) {
  if(e.id!=='bl_warden'||!cyberAlive(e))return;
  var s=chromeIndustrialState(e);if(s.hot>0)return;
  s.heat=Math.min(100,s.heat+amount);
  if(s.heat>=100){s.hot=3;e.brain.stance='散热口开启';float(e.x,e.y,'热过载 / 开阀',C.amber);}
}
function chromeIndustrialHeatHit(e,amount,origin,dealt) {
  if(e.id!=='bl_warden'||!(dealt>0))return;
  var from=origin||p,facing=e.facing==null?Math.PI:e.facing;
  var flank=Math.cos(Math.atan2(from.y-e.y,from.x-e.x)-facing)<=.15;
  // Actual incoming attack energy, not a preview and not a player-build multiplier.
  chromeIndustrialHeat(e,4+Math.min(24,Math.max(0,Number(amount)||0)*.35)+(flank?12:0));
}
function chromeIndustrialCool(e) {
  if(G.freeze>0)return;
  var s=chromeIndustrialState(e);if(!s)return;
  if(s.hot>0){s.hot--;if(!s.hot)s.heat=35;}
  else s.heat=Math.max(0,s.heat-6);
}
function chromeIndustrialAdvance(e,dist) {
  var x=e.x,y=e.y;stepToward(e,dist);
  if(e.x!==x||e.y!==y)chromeIndustrialHeat(e,18);
}
function chromeIndustrialStrafe(e,steps) {
  if(G.freeze>0||!cyberAlive(e))return;
  var s=chromeIndustrialState(e),start={x:e.x,y:e.y};
  for(var n=0;n<steps;n++){
    var best=null,score=-Infinity,d=cyberDistance(e,p),vx=p.x-e.x,vy=p.y-e.y;
    for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){
      if(!dx&&!dy)continue;
      var x=e.x+dx,y=e.y+dy;
      if(!tacticFloor(x,y)||wallAt(x,y)||occupied(x,y))continue;
      if(dx&&dy&&!tacticFloor(x,e.y)&&!tacticFloor(e.x,y))continue;
      var nd=Math.max(Math.abs(x-p.x),Math.abs(y-p.y));
      var cross=(vx*dy-vy*dx)*s.orbit;
      var value=-Math.abs(nd-5)*4+(cross>0?3:cross<0?-3:0)+(los(x,y,p.x,p.y)?2:0);
      // Do not orbit deeper into melee, or drift away when outside gun range.
      if(d<4&&nd<d||d>7&&nd>d)continue;
      if(value>score){score=value;best={x:x,y:y};}
    }
    if(!best)break;e.x=best.x;e.y=best.y;
  }
  if(e.x!==start.x||e.y!==start.y){
    G.beams.push({x0:start.x+.5,y0:start.y+.5,x1:e.x+.5,y1:e.y+.5,life:180,max:180,color:'#7eeaff'});
  }
  if(steps>1)s.orbit=-s.orbit;
}
function chromeIndustrialRail(e,a) {
  if(e.id!=='bl_lance'||!cyberAlive(e))return;
  var s=chromeIndustrialState(e);
  // A real fixed firing lane: ordinary shield/dodge apply; never a mine or reflector.
  // cyberField's unchanged 72-field budget may defer this lane, never evict danger.
  var cells=(a.cells||[]).filter(function(c){return tacticFloor(c.x,c.y)&&!wallAt(c.x,c.y)&&los(e.x,e.y,c.x,c.y);});
  if(!cells.length)return;
  var line=cyberField(e,'industrial-lane',cells,1,2,Math.round(e.atk*.8),{sourceRef:e,sourceMap:G.map,origin:{x:e.x,y:e.y}});
  if(line)s.line=line;
}
function chromeIndustrialLaneTick(h,owner) {
  if(h.kind!=='industrial-lane')return true;
  if(h.sourceRef!==owner||h.sourceMap!==G.map||!cyberAlive(owner))return false;
  var s=chromeIndustrialRead(owner);if(!s)return false;
  // Hold the ordinary shot on lane ticks: persistence redistributes fire, not stacks it.
  s.suppressTurn=G.turn;
  h.cells=h.cells.filter(function(c){return tacticFloor(c.x,c.y)&&!wallAt(c.x,c.y)&&los(h.origin.x,h.origin.y,c.x,c.y);});
  return true;
}
function chromeIndustrialLanceShot(e,power) {
  var s=chromeIndustrialRead(e);
  if(s&&(s.suppressTurn===G.turn||s.line&&(G.hazards||[]).indexOf(s.line)>=0))return;
  cyberLaser(e,p.x,p.y,power,[]);
}
function chromeIndustrialDetail(e) {
  var s=chromeIndustrialRead(e);
  if(e.id==='bl_hound')return s&&s.wound>0?'咬伤追猎 / 护盾可阻断新伤':'裂齿追猎 / 咬穿护盾才留伤';
  if(e.id==='bl_warden')return '甲 '+Math.round(e.brain.plate||0)+'% / 热 '+Math.round(s?s.heat:0)+'/100'+(s&&s.hot>0?' · 散热口开启':' · 侧后/液压升温');
  if(e.id==='bl_lance')return '机动对枪 / '+(s&&s.line&&(G.hazards||[]).indexOf(s.line)>=0?'固定压制线在线':'磁钩弹射 · 中距绕射');
  return null;
}
function chromeIndustrialVisual(e,x,y,tile) {
  if(e.id!=='bl_hound'&&e.id!=='bl_warden'&&e.id!=='bl_lance')return;
  var s=chromeIndustrialRead(e);if(!s)return;
  ctx.save();ctx.textAlign='center';ctx.font='bold '+Math.max(8,tile*.26)+'px monospace';
  if(e.id==='bl_warden'){
    ctx.fillStyle='#17212a';ctx.fillRect(x-tile*.6,y+tile*.7,tile*1.2,3);
    ctx.fillStyle=s.hot>0?'#7eeaff':'#ffd07d';ctx.fillRect(x-tile*.6,y+tile*.7,tile*1.2*s.heat/100,3);
    if(s.hot>0)ctx.fillText('开阀',x,y+tile*1.1);
  }else if(e.id==='bl_hound'&&s.wound>0){ctx.fillStyle='#ff657e';ctx.fillText('伤猎',x,y+tile*.95);}
  else if(e.id==='bl_lance'&&s.line&&(G.hazards||[]).indexOf(s.line)>=0){ctx.fillStyle='#7eeaff';ctx.fillText('压线',x,y+tile*.95);}
  ctx.restore();
}
// END_CHROME_INDUSTRIAL_IDENTITY_V1
`;

const replacements = [
  ['function bossAct(e,dist) {', HELPERS + '\nfunction bossAct(e,dist) {'],
  ["  if(e.id==='bl_hound'){\n    if(e.hp<e.maxHp*.35", "  if(e.id==='bl_hound'){\n    chromeIndustrialHunt(e,dist);\n    if(e.hp<e.maxHp*.35"],
  ["if(e.enraged&&cyberAlive(e))hurtPlayer(Math.max(1,Math.round(e.atk*.6)-effDef()),e);", "if(e.enraged&&cyberAlive(e))chromeIndustrialBite(e,Math.max(1,Math.round(e.atk*.6)-effDef()));"],
  ['  var dmg = hurtPlayer(raw, e);', "  var dmg = e.id==='bl_hound'?chromeIndustrialBite(e,raw):hurtPlayer(raw,e);"],
  ['  return hurtPlayer(Math.max(1,Math.round(amount-effDef()*(armorFactor==null?1:armorFactor))),e);', "  var raw=Math.max(1,Math.round(amount-effDef()*(armorFactor==null?1:armorFactor)));\n  return e.id==='bl_hound'&&kind==='maul'?chromeIndustrialBite(e,raw):hurtPlayer(raw,e);"],
  ["  if(e.id==='bl_warden'){\n    b.stance=", "  if(e.id==='bl_warden'){\n    chromeIndustrialCool(e);\n    b.stance="],
  ["if(dot>.15)n*=.22;", "if(dot>.15&&!chromeIndustrialExposed(e))n*=.22;"],
  ["  if(e.intent&&e.intent.kind==='repair'){e.intent.taken=", "  chromeIndustrialHeatHit(e,amount,origin,n);\n  if(e.intent&&e.intent.kind==='repair'){e.intent.taken="],
  ["if(d<=1){cyberImpact(e,tacticArea(e.x,e.y,1),Math.round(e.atk*1.3),'shield-bash',1);}else if(t%2===0)stepToward(e,dist);return;", "if(d<=1){cyberImpact(e,tacticArea(e.x,e.y,1),Math.round(e.atk*1.3),'shield-bash',1);}else if(t%2===0)chromeIndustrialAdvance(e,dist);return;"],
  ["  e.cd=a.cooldown||0;", "  if(e.id==='bl_warden'&&a.kind==='hammer')chromeIndustrialHeat(e,28);\n  e.cd=a.cooldown||0;"],
  ['    cyberLaser(e,a.tx,a.ty,a.damage,[]);', '    cyberLaser(e,a.tx,a.ty,a.damage,[]);\n    chromeIndustrialRail(e,a);'],
  ["    b.stance='棱镜游骑';", "    b.stance='机动游骑';"],
  ["    if(t%6===0&&d<=8&&los(e.x,e.y,p.x,p.y)){cyberPull(e,3);b.stance='磁钩回收';}\n    if(d<=9&&los(e.x,e.y,p.x,p.y))cyberLaser(e,p.x,p.y,Math.round(e.atk*(stage>=2?1:.8)),[]);\n    if(t%2===0){if(d<5)stepAway(e,dist);else stepToward(e,dist);}return;", "    if(t%6===0&&d<=8&&los(e.x,e.y,p.x,p.y)){cyberPull(e,3);chromeIndustrialStrafe(e,3);b.stance='磁钩弹射';}\n    else if(t%2===0)chromeIndustrialStrafe(e,1);\n    if(cyberDistance(e,p)<=9&&los(e.x,e.y,p.x,p.y))chromeIndustrialLanceShot(e,Math.round(e.atk*(stage>=2?1:.8)));\n    return;"],
  ["    if(!owner&&!h.orphan){expired[h.id]=true;continue;}", "    if(!owner&&!h.orphan){expired[h.id]=true;continue;}\n    if(!chromeIndustrialLaneTick(h,owner)){expired[h.id]=true;continue;}"],
  ['function bossStageDetail(e) {', 'function bossStageDetail(e) {\n  var industrialDetail=chromeIndustrialDetail(e);if(industrialDetail)return industrialDetail;'],
  ['  if(e.boss)visualBossSignature(e,x,y,r,now);', '  if(e.boss)chromeIndustrialVisual(e,x,y,tile);\n  if(e.boss)visualBossSignature(e,x,y,r,now);'],
  ['function killEnemy(e, selfDestruct) {', "function killEnemy(e, selfDestruct) {\n  if((e.id==='bl_hound'||e.id==='bl_warden'||e.id==='bl_lance')&&e.brain)delete e.brain.industrial;"]
];

// Validate our own call sites rather than whole surrounding functions: other
// encounter patches may independently insert a hook at the same function head.
const PATCH_HOOKS = [
  'chromeIndustrialHunt(e,dist);',
  'chromeIndustrialBite(e,Math.max(1,Math.round(e.atk*.6)-effDef()))',
  "var dmg = e.id==='bl_hound'?chromeIndustrialBite(e,raw):hurtPlayer(raw,e);",
  "return e.id==='bl_hound'&&kind==='maul'?chromeIndustrialBite(e,raw):hurtPlayer(raw,e);",
  'chromeIndustrialCool(e);',
  'if(dot>.15&&!chromeIndustrialExposed(e))n*=.22;',
  'chromeIndustrialHeatHit(e,amount,origin,n);',
  'else if(t%2===0)chromeIndustrialAdvance(e,dist);return;',
  "if(e.id==='bl_warden'&&a.kind==='hammer')chromeIndustrialHeat(e,28);",
  'chromeIndustrialRail(e,a);',
  "b.stance='机动游骑';",
  'chromeIndustrialStrafe(e,3);',
  'chromeIndustrialLanceShot(e,Math.round(e.atk*(stage>=2?1:.8)));',
  'if(!chromeIndustrialLaneTick(h,owner))',
  'var industrialDetail=chromeIndustrialDetail(e);if(industrialDetail)return industrialDetail;',
  'if(e.boss)chromeIndustrialVisual(e,x,y,tile);',
  "if((e.id==='bl_hound'||e.id==='bl_warden'||e.id==='bl_lance')&&e.brain)delete e.brain.industrial;"
];
function count(source, literal) {
  return source.split(literal).length - 1;
}
function patchSource(source) {
  if (typeof source !== 'string') throw new TypeError('patchSource expects source text');
  if (source.includes(MARK)) {
    if (count(source, MARK) !== 1 || count(source, END) !== 1 || !source.includes(HELPERS)) {
      throw new Error('Industrial identity: partial or incompatible helper block');
    }
    for (let i = 0; i < PATCH_HOOKS.length; i++) {
      if (count(source, PATCH_HOOKS[i]) !== 1) throw new Error('Industrial identity: incomplete patched hook ' + i);
    }
    return source;
  }
  if (source.includes(END)) throw new Error('Industrial identity: orphan end marker');
  // Validate ALL anchors before returning anything. Caller never gets a partial patch.
  for (let i = 0; i < replacements.length; i++) {
    const hits = count(source, replacements[i][0]);
    if (hits !== 1) throw new Error('Industrial identity: anchor ' + i + ' matched ' + hits + ' times');
  }
  let result = source;
  for (const [before, after] of replacements) result = result.replace(before, after);
  return result;
}

module.exports = { patchSource };
