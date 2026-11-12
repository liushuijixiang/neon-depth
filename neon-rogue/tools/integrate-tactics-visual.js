const fs=require('fs'),path=require('path'),acorn=require('/root/workspace/neon-tooling/node_modules/acorn');
const root=path.resolve(__dirname,'..'),file=path.join(root,'game.js');let s=fs.readFileSync(file,'utf8');
function rep(a,b){if(!s.includes(a))throw Error('missing '+a.slice(0,90));s=s.replace(a,b);}
function node(name){const hits=acorn.parse(s,{ecmaVersion:'latest'}).body[0].expression.callee.body.body.filter(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(hits.length!==1)throw Error(name+' count '+hits.length);return hits[0];}
function fn(name,text){const n=node(name);s=s.slice(0,n.start)+text+s.slice(n.end);}
function from(file){const src=fs.readFileSync(path.join(__dirname,file),'utf8');for(const n of acorn.parse(src,{ecmaVersion:'latest'}).body){if(n.type!=='FunctionDeclaration')throw Error('only functions');fn(n.id.name,src.slice(n.start,n.end));}}
if(s.includes('function tacticUid'))throw Error('already integrated');
rep('function bossAct(e, dist) {',fs.readFileSync(path.join(__dirname,'tactics-helpers.js'),'utf8')+'\nfunction bossAct(e, dist) {');
from('tactics-functions.js');from('visual-draw.js');from('visual-performance.js');
rep('function frame(now){',"var visualTrainBtn=$('#trainbtn'),visualCyberCount=$('#cybercount');\ndocument.addEventListener('visibilitychange',function(){last=0;VFX.drawAt=0;VFX.resizeDirty=true;});\nfunction frame(now){");
rep("window.addEventListener('resize', function () { cw = 0; });","window.addEventListener('resize', function () { cw = 0; VFX.resizeDirty = true; });");
const ab=node('renderAbilities'),abtext=s.slice(ab.start,ab.end).replaceAll("addEventListener('pointerdown'","addEventListener('click'");s=s.slice(0,ab.start)+abtext+s.slice(ab.end);
rep("    e.recovery = 1;\n    float(e.x, e.y, '打断'", "    e.recovery = 1; e.cd = Math.max(2, e.cd || 0);\n    float(e.x, e.y, '打断'");
acorn.parse(s,{ecmaVersion:'latest'});fs.writeFileSync(file,s);
const hp=path.join(root,'index.html');let h=fs.readFileSync(hp,'utf8');if(h.includes('TACTICAL VISUAL POLISH'))throw Error('style duplicate');
h=h.replace('</style>',String.raw`
/* TACTICAL VISUAL POLISH */
#stage{border-color:rgba(83,155,179,.3);background:#04070d;box-shadow:inset 0 0 28px rgba(0,0,0,.5),0 4px 18px rgba(0,0,0,.22)}
#stage::after{opacity:.35}
.hud{border-color:rgba(78,143,169,.26);box-shadow:0 3px 15px rgba(0,0,0,.18);background:linear-gradient(135deg,#111d2e,#080f19)}
.abbar{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;touch-action:pan-x;padding:2px 0 4px;min-height:44px;gap:6px}
.abbar:empty{min-height:0;padding:0}
.abtn{flex:1 0 82px;min-height:44px;height:44px;padding:4px 8px;border-radius:8px;flex-direction:column;gap:2px;touch-action:pan-x;background:linear-gradient(180deg,#171c31,#0b1220);font-size:11px}
.abtn .cd{font-size:9px;letter-spacing:.02em}.abtn:active:not(:disabled){background:#24354b;border-color:#c2f4ff;transform:translateY(1px)}
.slot{min-height:36px;background:#0b1421;border-color:rgba(113,167,191,.25)}.icon{min-width:30px;min-height:30px}
.qline{background:rgba(3,8,14,.78);text-shadow:none}.log{font-size:10px;max-height:78px;overflow:hidden;background:linear-gradient(to top,rgba(3,6,11,.9),rgba(3,6,11,0))}.log .line{text-shadow:0 1px 2px #02050a}
.toast{box-shadow:0 3px 12px rgba(0,0,0,.35);max-width:94%;line-height:1.45}.title{animation:none}.critbar.high,.critbar.over,.critbar.burn{animation:none}.bossbanner .bb-name{animation:none}.bslot{backdrop-filter:none}
.bossrow{flex-wrap:wrap}.bossname{font-size:10px;white-space:normal;line-height:1.4}.bossbar{min-width:80px;min-height:8px;flex:1 0 100%}
@media(max-height:760px){#app{gap:5px}.abtn{min-height:40px;height:40px;font-size:10px;flex-basis:78px}.abbar{min-height:40px}.critbar{height:27px}.dpad{width:min(100%,216px);gap:5px}.key{aspect-ratio:1.65/1}.log{max-height:64px;font-size:9px}.slot{min-height:32px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}#stage::after{background:none}.title,.bb-name{text-shadow:none}.critbar,.hud,.abtn,.slot,.key{box-shadow:none!important}}
</style>`);fs.writeFileSync(hp,h);console.log('Integrated tactics + visual + performance');
