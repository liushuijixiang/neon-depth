// Applies tools/text/rewrites.json to game.js by exact string-literal value (AST), not by line.
const fs = require('fs'), path = require('path'), acorn = require('/root/workspace/neon-tooling/node_modules/acorn');
const FILE = path.join(__dirname, '..', '..', 'game.js');
let src = fs.readFileSync(FILE, 'utf8');
const rw = JSON.parse(fs.readFileSync(path.join(__dirname, 'rewrites.json'), 'utf8'));
const byOld = new Map(); rw.forEach(r => { if (!byOld.has(r.old)) byOld.set(r.old, []); byOld.get(r.old).push(r); });
const ast = acorn.parse(src, { ecmaVersion: 'latest', locations: true });
const lits = []; (function walk(n) { if (!n || typeof n !== 'object') return; if (n.type === 'Literal' && typeof n.value === 'string') lits.push(n); for (const k in n) { if (k === 'loc') continue; const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object' && v.type) walk(v); } })(ast);
const edits = [], missing = [], ambiguous = [];
for (const [old, list] of byOld) {
  const hits = lits.filter(l => l.value === old);
  if (!hits.length) { missing.push(old); continue; }
  const news = [...new Set(list.map(r => r.new))];
  if (news.length === 1) { hits.forEach(h => edits.push([h, news[0]])); continue; }
  // different replacements for the same text: map by order of original line numbers
  const sorted = list.slice().sort((a, b) => a.line - b.line);
  if (sorted.length !== hits.length) { ambiguous.push(old); continue; }
  hits.sort((a, b) => a.start - b.start).forEach((h, i) => edits.push([h, sorted[i].new]));
}
const q = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
edits.sort((a, b) => b[0].start - a[0].start).forEach(([h, nv]) => { src = src.slice(0, h.start) + q(nv) + src.slice(h.end); });
new (require('vm').Script)(src);
fs.writeFileSync(FILE, src);
console.log('applied', edits.length, 'literal edits from', byOld.size, 'texts; missing', missing.length, 'ambiguous', ambiguous.length);
if (missing.length) console.log('MISSING:', JSON.stringify(missing.slice(0, 20)));
if (ambiguous.length) console.log('AMBIG:', JSON.stringify(ambiguous));
