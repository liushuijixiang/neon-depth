/* Original local key art composed from the game's own vector renderers. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const acorn = require('acorn');
const { chromium } = require('playwright');

const gameRoot = path.resolve(__dirname, '..');
const projectRoot = path.dirname(gameRoot);
const output = path.join(projectRoot, 'outputs', 'r38', 'taptap');
const media = path.join(projectRoot, 'work', 'r38', 'media');
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(media, { recursive: true });
const squareOnly = process.argv.includes('--square-only');
const hashFile = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const preserved = squareOnly ? Object.fromEntries(['promo-1920x1080.png', 'icon-512.png'].map(file => [file, hashFile(path.join(output, file))])) : null;

let artSource, bodySvg, monsters;
if (squareOnly) {
  artSource = fs.readFileSync(path.join(media, 'monster-renderer.js'), 'utf8');
  bodySvg = fs.readFileSync(path.join(media, 'body.svg'), 'utf8');
  monsters = JSON.parse(fs.readFileSync(path.join(media, 'monster-models.json'), 'utf8'));
} else {
const gameSource = fs.readFileSync(path.join(gameRoot, 'game.js'), 'utf8');
const tree = acorn.parse(gameSource, { ecmaVersion: 'latest' });
const engine = tree.body.find(node => node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression').expression.callee.body.body;
const functions = ['visualPlate', 'visualPolygon', 'monArtFace', 'monArt'];
const declarations = ['MON_ART', 'AI_ROLE_COLOR'];
const pieces = engine.filter(node => node.type === 'FunctionDeclaration' && functions.includes(node.id.name) ||
  node.type === 'VariableDeclaration' && node.declarations.some(declaration => declarations.includes(declaration.id?.name)));
artSource = pieces.map(node => gameSource.slice(node.start, node.end)).join('\n\n');
if (!functions.every(name => artSource.includes('function ' + name + '('))) throw new Error('Game artwork renderer unavailable');
bodySvg = require(path.join(gameRoot, 'body-illustration')).markup().replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
const context = { window: {} };
vm.createContext(context);
for (const file of ['monsters.js', 'monsters_stage2.js', 'monsters_stage3.js']) {
  vm.runInContext(fs.readFileSync(path.join(gameRoot, 'content', file), 'utf8'), context, { filename: file });
}
const ids = ['data_hound', 'blade_runner', 'pulse_turret', 'drone', 'void_eye', 'hive_mother'];
monsters = Object.fromEntries(ids.map(id => {
  const monster = context.window.NEON.monsters.find(entry => entry.id === id);
  if (!monster) throw new Error('Missing artwork entity ' + id);
  return [id, { id, ai: monster.ai, color: monster.color, glyph: monster.glyph }];
}));
fs.writeFileSync(path.join(media, 'body.svg'), bodySvg);
fs.writeFileSync(path.join(media, 'monster-renderer.js'), artSource);
fs.writeFileSync(path.join(media, 'monster-models.json'), JSON.stringify(monsters, null, 2));
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.setContent('<!doctype html><html><body style="margin:0"><canvas id="art"></canvas></body></html>');
    const result = await page.evaluate(async ({ bodySvg, artSource, monsters, squareOnly }) => {
      const canvas = document.querySelector('#art');
      let ctx = canvas.getContext('2d', { alpha: false });
      const TAU = Math.PI * 2;
      function polygon(points, fill, stroke, width = 1) {
        ctx.beginPath(); points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
      }
      function line(points, color, width = 1) {
        ctx.beginPath(); points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
      }
      function glow(x, y, radius, color) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, color); gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      function circuit(points, color, width = 2, luminous = false) {
        ctx.save();
        if (luminous) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
        line(points, color, width);
        const end = points.at(-1); ctx.beginPath(); ctx.arc(end[0], end[1], width * 1.3, 0, TAU); ctx.fillStyle = color; ctx.fill();
        ctx.restore();
      }
      function spacedTitle(text, x, y, size, spacing, fill) {
        ctx.font = '900 ' + size + 'px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = fill;
        for (const character of text) { ctx.fillText(character, x, y); x += ctx.measureText(character).width + spacing; }
      }
      function imageFromSvg(svg) {
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image); image.onerror = reject;
          image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        });
      }
      const body = await imageFromSvg(bodySvg);
      const makeMonsters = new Function('ctx', 'VFX', 'TAU', 'enemyAim', artSource + '\nreturn {draw:monArt,colors:typeof AI_ROLE_COLOR === "undefined"?{}:AI_ROLE_COLOR};');
      const aim = squareOnly ? { x: 720, y: 740 } : { x: 1320, y: 550 };
      const originalRenderer = makeMonsters(ctx, { reduced: true }, TAU, () => aim);

      if (squareOnly) {
        canvas.width = 1440; canvas.height = 1440;
        ctx = canvas.getContext('2d', { alpha: false });
        const backdrop = ctx.createLinearGradient(0, 0, 1440, 1440);
        backdrop.addColorStop(0, '#092940'); backdrop.addColorStop(.48, '#081b2d'); backdrop.addColorStop(1, '#123746');
        ctx.fillStyle = backdrop; ctx.fillRect(0, 0, 1440, 1440);
        glow(720, 620, 690, '#196f8255'); glow(1180, 1120, 470, '#9b24443a'); glow(150, 300, 430, '#2a638441');
        polygon([[0, 0], [444, 0], [245, 190], [0, 190]], '#103749', '#366d7b', 2);
        polygon([[0, 230], [174, 230], [109, 580], [0, 700]], '#0e2b3d', '#275a6e', 2);
        polygon([[1164, 0], [1440, 0], [1440, 1008], [1358, 880], [1258, 332]], '#143142', '#497a89', 2);
        polygon([[1264, 0], [1440, 0], [1440, 342], [1370, 236]], '#1a4251', '#53848f', 1.5);
        circuit([[0, 172], [235, 172], [343, 68], [584, 68]], '#5bb5c1a6', 2.5);
        circuit([[1440, 205], [1322, 205], [1257, 141], [1156, 141]], '#76b9c573', 2);
        circuit([[0, 711], [93, 675], [133, 462]], '#2da0bc9c', 2.5, true);
        circuit([[1440, 1010], [1336, 1010], [1295, 950]], '#f26d8e9e', 2.5, true);
        for (let rung = 0; rung < 14; rung++) {
          const y = 28 + rung * 74;
          polygon([[1385, y], [1416, y + 5], [1432, y + 26], [1401, y + 21]], '#3e6573', '#71969d44', 1);
        }

        ctx.save(); ctx.translate(720, 742);
        for (const [radius, color, width] of [[390, '#214b5c', 24], [369, '#557e89', 2], [350, '#5dd9d880', 2], [319, '#1a5361', 7]]) {
          ctx.beginPath(); ctx.arc(0, 0, radius, -.9, 2.48); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
        }
        for (let tick = 0; tick < 32; tick++) {
          const angle = tick * TAU / 32;
          const inner = tick % 4 ? 380 : 367;
          line([[Math.cos(angle) * inner, Math.sin(angle) * inner], [Math.cos(angle) * 396, Math.sin(angle) * 396]], tick % 4 ? '#467482' : '#86bcc2', tick % 4 ? 2 : 4);
        }
        ctx.restore();
        for (const x of [462, 956]) {
          polygon([[x, 351], [x + 22, 351], [x + 22, 1214], [x, 1233]], '#102e3d', '#365e74', 1.5);
          line([[x + 10, 378], [x + 10, 566]], '#58c2c990', 2);
          line([[x + 10, 1024], [x + 10, 1170]], '#58c2c990', 2);
        }

        polygon([[0, 1010], [720, 893], [1440, 1010], [1440, 1440], [0, 1440]], '#081725', null);
        for (let x = -920; x <= 2390; x += 175) line([[720, 893], [x, 1440]], '#234758a0', 1);
        for (const y of [974, 1033, 1107, 1200, 1310, 1425]) line([[0, y + 60], [720, y - 52], [1440, y + 60]], '#2d56688c', 1);
        polygon([[450, 1179], [720, 1130], [990, 1179], [990, 1296], [720, 1347], [450, 1296]], '#172f3b', '#557989', 2);
        polygon([[482, 1198], [720, 1159], [958, 1198], [958, 1278], [720, 1317], [482, 1278]], '#0b2131', '#29647a', 2);
        glow(720, 1219, 300, '#36d5d837');
        circuit([[0, 1335], [203, 1301], [292, 1217], [460, 1188]], '#28b7c6b5', 3, true);
        circuit([[1440, 1361], [1228, 1316], [1136, 1226]], '#d87a6ca3', 2.5, true);
        line([[525, 1294], [720, 1328], [915, 1294]], '#68dace', 3);

        function squareMonster(id, x, y, radius, opacity = 1) {
          const entity = { ...monsters[id], x, y, hp: 100, maxHp: 100, portrait: true, boss: false };
          ctx.save(); ctx.globalAlpha = opacity;
          ctx.fillStyle = '#01081299'; ctx.beginPath(); ctx.ellipse(x, y + radius * .95, radius * 1.65, radius * .28, 0, 0, TAU); ctx.fill();
          glow(x, y, radius * 2.4, entity.color + '22');
          ctx.lineWidth = 2.3;
          originalRenderer.draw(entity, x, y, radius, 0, originalRenderer.colors[entity.ai] || '#8daab4');
          ctx.restore();
        }
        squareMonster('drone', 283, 550, 46, .88);
        squareMonster('void_eye', 1130, 410, 38, .72);
        squareMonster('hive_mother', 1148, 727, 61, .84);
        squareMonster('data_hound', 288, 1139, 77);
        squareMonster('blade_runner', 1112, 1093, 68);
        squareMonster('pulse_turret', 1196, 1296, 72);

        glow(720, 773, 228, '#59dbe12a');
        ctx.save(); ctx.shadowColor = '#3aafb477'; ctx.shadowBlur = 18;
        ctx.drawImage(body, 450, 343, 540, 891); ctx.restore();
        glow(720, 791, 46, '#8bf6eb55'); glow(720, 791, 16, '#cafff04f');

        ctx.save();
        spacedTitle('霓虹深潜', 347, 280, 176, 7, '#e33c8b');
        spacedTitle('霓虹深潜', 355, 276, 176, 7, '#43e2e7');
        const ink = ctx.createLinearGradient(0, 88, 0, 285);
        ink.addColorStop(0, '#f0fffc'); ink.addColorStop(.65, '#d6f6f4'); ink.addColorStop(1, '#86d5df');
        ctx.shadowColor = '#52e4ed55'; ctx.shadowBlur = 18;
        spacedTitle('霓虹深潜', 351, 276, 176, 7, ink);
        ctx.restore();
        line([[365, 315], [605, 315], [623, 298]], '#4dd5dd', 3);
        line([[669, 315], [1073, 315]], '#377486', 1.5);
        ctx.fillStyle = '#8dd8e003';
        for (let y = 2; y < 1440; y += 5) ctx.fillRect(0, y, 1440, 1);
        const pixels = ctx.getImageData(0, 0, 1440, 1440).data;
        let minimumAlpha = 255;
        for (let offset = 3; offset < pixels.length; offset += 4) minimumAlpha = Math.min(minimumAlpha, pixels[offset]);
        return { square: canvas.toDataURL('image/png'), minimumAlpha, fontAvailable: document.fonts.check('900 176px "Microsoft YaHei"') };
      }

      canvas.width = 1920; canvas.height = 1080;
      ctx = canvas.getContext('2d', { alpha: false });
      const background = ctx.createLinearGradient(0, 0, 1920, 1080);
      background.addColorStop(0, '#08243c'); background.addColorStop(.48, '#071829'); background.addColorStop(1, '#103648');
      ctx.fillStyle = background; ctx.fillRect(0, 0, 1920, 1080);
      glow(1360, 370, 720, '#197b8b55'); glow(1560, 800, 460, '#8a17433d'); glow(350, 640, 700, '#153f6a44');

      // Large structural plates frame one coherent industrial shaft.
      polygon([[0, 0], [858, 0], [680, 145], [0, 145]], '#0d3040', '#35637280', 2);
      polygon([[0, 174], [625, 174], [410, 322], [0, 322]], '#0b2335', '#36566e55', 1.5);
      polygon([[1655, 0], [1920, 0], [1920, 1080], [1858, 1080], [1815, 590], [1682, 390]], '#102a3b', '#416b7b77', 2);
      polygon([[1741, 0], [1920, 0], [1920, 380], [1830, 282]], '#193b4b', '#59808b55', 1.5);
      line([[28, 130], [648, 130], [800, 12]], '#3b8e9e', 3);
      line([[1908, 508], [1840, 390], [1728, 240], [1698, 40]], '#2e697e', 3);
      for (let rung = 0; rung < 12; rung++) {
        const y = 24 + rung * 79;
        polygon([[1862, y], [1903, y + 5], [1916, y + 28], [1878, y + 23]], '#38616c', '#65858d55', 1);
      }
      circuit([[0, 120], [330, 120], [392, 58], [658, 58]], '#4abcc7a0', 2);
      circuit([[70, 250], [367, 250], [435, 206], [662, 206]], '#236071', 2);
      circuit([[1920, 695], [1828, 695], [1774, 639], [1696, 639]], '#ff667b8c', 2.5, true);

      // Hatch rings, collars and braces use the same clipped-metal visual language.
      ctx.save(); ctx.translate(1320, 515);
      for (const [radius, color, width] of [[356, '#214955', 21], [335, '#527d88', 2], [319, '#50cdd386', 2], [286, '#1b4e5a', 7]]) {
        ctx.beginPath(); ctx.arc(0, 0, radius, -.88, 2.5); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
      }
      for (let sector = 0; sector < 24; sector++) {
        const angle = sector * TAU / 24;
        const inner = sector % 3 ? 346 : 336;
        line([[Math.cos(angle) * inner, Math.sin(angle) * inner], [Math.cos(angle) * 361, Math.sin(angle) * 361]], sector % 3 ? '#466d77' : '#82b6bc', sector % 3 ? 2 : 4);
      }
      ctx.restore();
      for (const x of [1120, 1518]) {
        polygon([[x, 105], [x + 26, 105], [x + 26, 912], [x, 936]], '#102d3b', '#386878', 1);
        line([[x + 10, 140], [x + 10, 350]], '#59cbd080', 2);
        line([[x + 14, 725], [x + 14, 880]], '#59cbd080', 2);
      }

      // Ground-plane perspective gives the original enemy models a shared space.
      polygon([[0, 750], [1150, 631], [1920, 744], [1920, 1080], [0, 1080]], '#071523', null);
      for (let x = -1000; x <= 3000; x += 190) line([[1204, 635], [x, 1080]], '#1b3b4c99', 1);
      for (const y of [680, 717, 762, 819, 894, 990, 1070]) line([[0, y + 70], [1204, y - 48], [1920, y + 35]], '#23485888', 1);
      polygon([[1063, 878], [1320, 832], [1583, 878], [1583, 1004], [1320, 1052], [1063, 1004]], '#142a35', '#54717c', 2);
      polygon([[1094, 900], [1320, 861], [1551, 900], [1551, 982], [1320, 1024], [1094, 982]], '#091b28', '#27566b', 2);
      circuit([[35, 1009], [303, 981], [362, 928], [755, 886], [819, 827]], '#22d4dd80', 2.5, true);
      circuit([[1920, 1000], [1689, 966], [1605, 884], [1538, 882]], '#f08d6d99', 2.5, true);
      line([[1142, 993], [1318, 1023], [1494, 993]], '#5ce9df', 3);
      glow(1317, 950, 260, '#37d2e63b');

      function monster(id, x, y, radius, opacity = 1) {
        const entity = { ...monsters[id], x, y, hp: 100, maxHp: 100, portrait: true, boss: false };
        ctx.save();
        ctx.globalAlpha = opacity;
        const ink = originalRenderer.colors[entity.ai] || '#8daab4';
        ctx.fillStyle = '#01081299'; ctx.beginPath(); ctx.ellipse(x, y + radius * .95, radius * 1.7, radius * .3, 0, 0, TAU); ctx.fill();
        glow(x, y, radius * 2.5, entity.color + '22');
        ctx.lineWidth = 2.3;
        originalRenderer.draw(entity, x, y, radius, 0, ink);
        ctx.restore();
      }
      monster('void_eye', 1007, 270, 36, .66);
      monster('drone', 1682, 233, 48, .86);
      monster('hive_mother', 1655, 537, 58, .8);
      monster('data_hound', 745, 887, 76);
      monster('blade_runner', 1014, 848, 63);
      monster('pulse_turret', 1716, 896, 78);

      // The mannequin is the shipped illustration, scaled without changing its geometry.
      glow(1320, 524, 225, '#5cdde12a');
      ctx.save(); ctx.shadowColor = '#3aafb477'; ctx.shadowBlur = 18;
      ctx.drawImage(body, 1020, 56, 600, 990); ctx.restore();
      glow(1320, 554, 48, '#8bf6eb55');
      glow(1320, 554, 16, '#cafff04f');

      // Existing game title only. The chromatic offset matches the in-game identity.
      ctx.save();
      spacedTitle('霓虹深潜', 112, 556, 174, 7, '#e63b8b');
      spacedTitle('霓虹深潜', 120, 552, 174, 7, '#43e2e7');
      const titleFill = ctx.createLinearGradient(0, 370, 0, 570);
      titleFill.addColorStop(0, '#f0fffc'); titleFill.addColorStop(.65, '#d6f6f4'); titleFill.addColorStop(1, '#86d5df');
      ctx.shadowColor = '#52e4ed55'; ctx.shadowBlur = 18;
      spacedTitle('霓虹深潜', 116, 552, 174, 7, titleFill);
      ctx.restore();
      line([[124, 595], [387, 595], [408, 578]], '#4dd5dd', 3);
      line([[464, 595], [844, 595]], '#2e6577', 1.5);
      for (let marker = 0; marker < 4; marker++) polygon([[124 + marker * 18, 625], [133 + marker * 18, 625], [128 + marker * 18, 640], [119 + marker * 18, 640]], '#73b7c155', null);
      // Subtle scan texture keeps the native vector finish consistent with the game.
      ctx.fillStyle = '#8dd8e003';
      for (let y = 2; y < 1080; y += 5) ctx.fillRect(0, y, 1920, 1);
      const promo = canvas.toDataURL('image/png');

      // Independent square icon. Every edge is filled with colored industrial material.
      canvas.width = 512; canvas.height = 512;
      ctx = canvas.getContext('2d', { alpha: false });
      const iconBackground = ctx.createLinearGradient(0, 0, 512, 512);
      iconBackground.addColorStop(0, '#16798a'); iconBackground.addColorStop(.45, '#15547f'); iconBackground.addColorStop(1, '#124556');
      ctx.fillStyle = iconBackground; ctx.fillRect(0, 0, 512, 512);
      glow(410, 70, 360, '#52f4d85e'); glow(50, 500, 340, '#5267ff42');
      polygon([[0, 0], [285, 0], [139, 168], [0, 168]], '#126c7c', '#61c7ca80', 2);
      polygon([[512, 326], [512, 512], [253, 512], [399, 351]], '#244e70', '#5e9cb080', 2);
      for (let y = 15; y < 512; y += 22) line([[0, y], [512, y]], '#97e1dc0b', 1);
      for (const [points, ink] of [
        [[[0, 89], [90, 89], [138, 137]], '#8fe4db'],
        [[[512, 126], [415, 126], [374, 166]], '#7ec8d3'],
        [[[0, 391], [87, 391], [134, 344]], '#65bdd6'],
        [[[512, 407], [417, 407], [370, 360]], '#9bddd2']
      ]) circuit(points, ink, 3);
      const shell = ctx.createLinearGradient(92, 88, 421, 420);
      shell.addColorStop(0, '#628591'); shell.addColorStop(.18, '#243c50'); shell.addColorStop(.68, '#102c43'); shell.addColorStop(1, '#4b727b');
      polygon([[151, 69], [361, 69], [443, 151], [443, 361], [361, 443], [151, 443], [69, 361], [69, 151]], shell, '#9bc5c7', 4);
      polygon([[157, 86], [355, 86], [426, 157], [426, 355], [355, 426], [157, 426], [86, 355], [86, 157]], '#0b3347', '#2f8a99', 2);
      glow(256, 243, 195, '#37dec95c');
      for (let tick = 0; tick < 32; tick++) {
        const angle = tick * TAU / 32;
        const radius = tick % 4 === 0 ? 177 : 184;
        line([[256 + Math.cos(angle) * radius, 256 + Math.sin(angle) * radius], [256 + Math.cos(angle) * 194, 256 + Math.sin(angle) * 194]], tick % 4 ? '#58abb0' : '#b6ddca', tick % 4 ? 2 : 4);
      }
      ctx.save(); ctx.shadowColor = '#2df2d8'; ctx.shadowBlur = 20;
      ctx.strokeStyle = '#37dec0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(256, 256, 167, -.85, 1.43); ctx.stroke();
      ctx.strokeStyle = '#59c4ef'; ctx.beginPath(); ctx.arc(256, 256, 167, 2.2, 4.48); ctx.stroke(); ctx.restore();
      polygon([[148, 137], [364, 137], [384, 157], [384, 355], [364, 375], [148, 375], [128, 355], [128, 157]], '#0f293a', '#416e7c', 2);
      const monogram = [[180, 337], [180, 177], [332, 337], [332, 177]];
      ctx.save(); ctx.lineJoin = 'miter'; ctx.lineCap = 'square';
      line(monogram, '#061e30', 39);
      ctx.shadowColor = '#6dffe5'; ctx.shadowBlur = 18;
      line(monogram, '#53e8db', 24);
      ctx.shadowBlur = 0;
      line(monogram, '#c3fff0', 5);
      ctx.restore();
      [[151, 109], [403, 151], [361, 403], [109, 361]].forEach(([x, y]) => {
        ctx.fillStyle = '#79a9b4'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
        line([[x - 2, y], [x + 2, y]], '#17394d', 1.5);
      });
      const icon = canvas.toDataURL('image/png');
      const pixels = ctx.getImageData(0, 0, 512, 512).data;
      let minimumAlpha = 255;
      for (let offset = 3; offset < pixels.length; offset += 4) minimumAlpha = Math.min(minimumAlpha, pixels[offset]);
      const corners = [[0, 0], [511, 0], [0, 511], [511, 511]].map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data]);
      return { promo, icon, minimumAlpha, corners, fontAvailable: document.fonts.check('900 174px "Microsoft YaHei"') };
    }, { bodySvg, artSource, monsters, squareOnly });
    const entries = squareOnly ? [{ file: 'promo-1440x1440.png', data: result.square, width: 1440, height: 1440, text: ['霓虹深潜'] }] : [
      { file: 'promo-1920x1080.png', data: result.promo, width: 1920, height: 1080, text: ['霓虹深潜'] },
      { file: 'icon-512.png', data: result.icon, width: 512, height: 512, text: ['N'] }
    ];
    const files = entries.map(entry => {
      const bytes = Buffer.from(entry.data.split(',')[1], 'base64');
      const target = path.join(output, entry.file);
      fs.writeFileSync(target, bytes);
      if (bytes.length >= 4 * 1024 * 1024) throw new Error('Image exceeds 4 MiB');
      return { file: target, width: entry.width, height: entry.height, bytes: bytes.length, text: entry.text,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
    });
    const report = { files, minimumAlpha: result.minimumAlpha, iconCorners: result.corners, fontAvailable: result.fontAvailable,
      sources: ['body-illustration.js', 'game.js monArt / MON_ART', 'content/monsters*.js'],
      composition: 'Original key art rendered directly from the owned mannequin, monster geometry and a unified industrial environment.',
      marketingText: squareOnly ? [{ asset: 'promo-1440x1440.png', before: '', after: '霓虹深潜', context: 'User-authorized square key-art title' }] :
        [{ asset: 'promo-1920x1080.png', before: '', after: '霓虹深潜', context: 'Existing game title' },
        { asset: 'icon-512.png', before: '', after: 'N', context: 'Existing title monogram, drawn as geometry' }] };
    if (report.minimumAlpha !== 255) throw new Error('Artwork is not opaque');
    if (preserved) {
      report.preservedAssets = Object.keys(preserved).map(file => ({ file, before: preserved[file], after: hashFile(path.join(output, file)) }));
      if (report.preservedAssets.some(asset => asset.before !== asset.after)) throw new Error('Existing reviewed asset changed');
    }
    fs.writeFileSync(path.join(media, squareOnly ? 'square-asset-report.json' : 'asset-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
