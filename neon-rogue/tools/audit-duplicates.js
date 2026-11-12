const fs = require('fs');
const acorn = require('/root/workspace/neon-tooling/node_modules/acorn');
const src = fs.readFileSync(require('path').join(__dirname, '../game.js'),'utf8');
const ast = acorn.parse(src,{ecmaVersion:'latest',locations:true});
const body = ast.body[0].expression.callee.body.body;
const grouped = {};
for (const n of body) if(n.type==='FunctionDeclaration') (grouped[n.id.name] ||= []).push(n);
for (const [name, ns] of Object.entries(grouped)) if(ns.length>1) console.log(name, ns.map(n=>`${n.loc.start.line}-${n.loc.end.line}`).join(', '), ns.every(n=>src.slice(n.start,n.end)===src.slice(ns[0].start,ns[0].end))?'IDENTICAL':'DIFFERENT');
console.log('functions',Object.keys(grouped).length,'duplicates',Object.values(grouped).reduce((sum,a)=>sum+a.length-1,0));
if(process.argv.includes('--dedupe')) {
  const remove = Object.values(grouped).flatMap(ns=>ns.slice(0,-1)).sort((a,b)=>b.start-a.start);
  let out = src;
  for(const n of remove) out=out.slice(0,n.start)+out.slice(n.end);
  acorn.parse(out,{ecmaVersion:'latest'});
  fs.writeFileSync(require('path').join(__dirname,'../game.js'),out);
  console.log('Removed shadowed function declarations only:',remove.length);
}
module.exports={src,body,grouped};
