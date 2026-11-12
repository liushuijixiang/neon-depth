const acorn=require('acorn');
function stripDevelopment(source){
 const removed=new Set(['trainSceneDefinitions','trainSceneSpot','trainScene','trainScenesHTML','trainPresets','trainPreset','trainPresetsHTML','trainCatalog','trainState']);
 let s=source,ast=acorn.parse(s,{ecmaVersion:'latest'}),cuts=[];const body=ast.body[0].expression.callee.body.body;
 for(const n of body){if(n.type==='FunctionDeclaration'&&removed.has(n.id.name))cuts.push(n);if(n.type==='ExpressionStatement'&&n.expression.type==='AssignmentExpression'){const l=n.expression.left;if(l.type==='MemberExpression'&&l.object.name==='window'&&l.property.name==='__neon')cuts.push(n);}}
 for(const n of cuts.sort((a,b)=>b.start-a.start))s=s.slice(0,n.start)+s.slice(n.end);
 function rep(a,b){if(!s.includes(a))throw Error('Release strip missing '+a.slice(0,90));s=s.replace(a,b);}
 rep("var h = trainScenesHTML() + '<div class=\"tr-fields\">'","var h = '<div class=\"tr-fields\">'");
 rep("  bind('[data-tr-preset]', 'data-tr-preset', trainPreset);",'');
 rep("  bind('[data-tr-scene]', 'data-tr-scene', trainScene);",'');
 rep(", ['presets', '强力组合']",'');
 rep("  else if (u.panel === 'presets') h += trainPresetsHTML();",'');
 rep("['gear', 'chips', 'items', 'enemies', 'presets', 'params']","['gear', 'chips', 'items', 'enemies', 'params']");
 rep("  else if (a === 'fullgear') return trainChoose('panel', 'presets');",'');
 // Player-facing language, no developer fixture descriptions or template IDs in item cards.
 s=s.replace("['enemies', '敌人 / Boss']","['enemies', '敌人']");
 s=s.replace('预设不暗加训练数值；这里的手动加成沿用 −50～200 范围。','手动调节仅影响训练。');
 s=s.replace('按原版 makeChip 生成真实数值；蓝/紫 1 条、橙/红 2 条副词条仍随机，不伪造词条或突破容量。替换/删除仅影响本次训练。','蓝/紫含1条副词条，橙/红含2条，词缀随机生成。替换仅影响本次训练。');
 s=s.replace('职业、掉落与成就标签均不限制训练；左右眼/手/腿只按部位类别匹配。换装保留容纳得下的芯片，多余芯片销毁。','全部义体均可试装；换装保留容量内的芯片。');
 s=s.replace('普通怪沿用原版随机精英规则。内容阶段仅筛选列表。','普通怪可能出现精英。');
 s=s.replace('沿用训练等级范围 1–30，调整等级后回满生命。','等级范围1–30，调整后回满生命。');
 s=s.replace('.train-panel .tr-tabs .tab{flex:1 0 27%;','.train-panel .tr-tabs .tab{flex:1 0 16%;');
 // Keep IDs in data-* action bindings, but do not expose them as debug text.

 s=s.replace("'<small>' + trainEsc(m.id) + ' · ' + trainEsc(AI_LABEL[m.ai] || m.ai)","'<small>' + trainEsc(AI_LABEL[m.ai] || m.ai)");
 s=s.replace(/<small>' \+ trainEsc\(m\.id\) \+ '<\/small>/g,'');
 s=s.replace(/<small>' \+ trainEsc\(item\.id\) \+ '<\/small>/g,'');
 s=s.replace(/<small>' \+ trainEsc\(c\.id\) \+ '<\/small>/g,'');
 s=s.replace(/<small>' \+ trainEsc\(b\.id\) \+ '<\/small>/g,'');
 const final=acorn.parse(s,{ecmaVersion:'latest'});let dangling=[];
 function walk(n){if(!n||typeof n!=='object')return;if(n.type==='Identifier'&&removed.has(n.name))dangling.push(n.name);for(const [k,v]of Object.entries(n)){if(k==='start'||k==='end')continue;if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}}
 walk(final);if(dangling.length)throw Error('Dangling dev functions '+[...new Set(dangling)]);
 if(s.includes('window.__neon')||s.includes('data-tr-scene')||s.includes('data-tr-preset')||s.includes('义体压力场景'))throw Error('Development fixture leaked');
 return s;
}
module.exports={stripDevelopment};
