const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const order = ['monsters', 'monsters_stage2', 'monsters_stage3', 'skills', 'items', 'buffs', 'consumables', 'quests', 'achievements', 'boons', 'bosses_low', 'bosses_high', 'tactics', 'story', 'scenes_v1', 'story2', 'neta', 'corps', 'finale', 'lore'];
const files = order.map(n => path.join(ROOT, 'content', n + '.js'));
for (const f of files) {
  if (!fs.existsSync(f)) throw new Error('Required content missing: ' + f);
  new (require('vm').Script)(fs.readFileSync(f, 'utf8'), { filename: f });
}
new (require('vm').Script)(fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8'), { filename: 'game.js' });

const inline = files.map(f => '<script>\n' + fs.readFileSync(f, 'utf8') + '\n</script>').join('\n');
const startTag = '<!-- CONTENT:START -->';
const endTag = '<!-- CONTENT:END -->';
const a = html.indexOf(startTag), b = html.indexOf(endTag);
if (a < 0 || b < 0) throw new Error('content markers missing');
html = html.slice(0, a) + inline + '\n' + html.slice(b + endTag.length);

for (const stylesheet of ['ui.css', 'polish.css', 'presentation.css', 'enhancement-wheel.css', 'v1.css']) {
  const tag = '<link rel="stylesheet" href="' + stylesheet + '" />';
  if (!html.includes(tag)) throw new Error('Stylesheet tag missing: ' + stylesheet);
  html = html.replace(tag, () => '<style>\n' + fs.readFileSync(path.join(ROOT, stylesheet), 'utf8') + '\n</style>');
}
for (const moduleName of ['motion-preference.js', 'native-compatibility.js', 'v1-tiles.js', 'v1-actors.js', 'v1-implant-art.js', 'v1-cinema.js', 'v1-cinema-pages.js', 'audio.js', 'npc-unlocks.js', 'presentation.js', 'panels.js', 'interface-effects.js', 'hacked-units.js', 'enhancement-wheel.js', 'body-illustration.js', 'chip-rules.js', 'compact-ui.js', 'combat-effects.js', 'boss-combat.js', 'implant-combat.js']) {
  const tag = '<script src="' + moduleName + '"></script>';
  const source = fs.readFileSync(path.join(ROOT, moduleName), 'utf8');
  new (require('vm').Script)(source, { filename: moduleName });
  if (!html.includes(tag)) throw new Error('Module tag missing: ' + moduleName);
  html = html.replace(tag, () => '<script>\n' + source + '\n</script>');
}

const gameTag = '<script src="game.js"></script>';
if (!html.includes(gameTag)) throw new Error('game tag missing');
const debug = process.argv.includes('--debug');
let engine = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');
if (!debug) engine = require('./tools/release-engine').stripDevelopment(engine);
new (require('vm').Script)(engine, { filename: debug ? 'engine.debug.js' : 'engine.release.js' });
html = html.replace(gameTag, function () { return '<script>\n' + engine + '\n</script>'; });

const out = path.join(ROOT, debug ? 'dist.debug.html' : 'dist.html');
// A standalone HTML must not make requests for an absent manifest or icon folder.
const standalone = html.replace(/<link rel="manifest"[^>]*>\s*/g, '')
  .replace(/href="\.\/icons\/(icon-[0-9]+\.png)"/g, (_, icon) =>
    'href="data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'pwa', 'icons', icon)).toString('base64') + '"');
fs.writeFileSync(out, standalone);
if (!debug) fs.writeFileSync(path.join(ROOT, 'pwa', 'index.html'), html);
console.log('built', out, Math.round(html.length / 1024) + ' KB');
