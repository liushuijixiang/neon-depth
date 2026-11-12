// 视效巡检：在固定时间点同步绘制并导出画布，逐帧检查斩击 / 横扫 / 蓄力 / 击杀 / 爆炸 / 光束
const { chromium } = require('playwright'), path = require('path'), fs = require('fs'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => localStorage.setItem('neon-depth-mute', '1'));
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html'));
  const frames = await page.evaluate(() => {
    const N = window.__neon, G = N.G, U = N.test.training, out = {};
    G.classId = 'assault'; G.trainPending = true; N.startGame(); N.test.hideOverlay(); G.paused = false;
    const cv = document.querySelector('#game');
    function setup(weapon) {
      Object.keys(G.cyber).forEach(k => U.remove && U.remove(k)); if (weapon) U.install('handL', weapon); N.test.hideOverlay(); G.paused = false; G.busy = false; G.hitStopUntil = 0;
      G.particles = []; G.texts = []; G.chromeSkillFx = []; G.mines = []; G.tacticFx = []; G.hurt = 0; G.punch = 0;
      const p = N.p; p.face = 0; G.enemies = []; const mk = (dx, dy, hp) => { const m = N.test.spawnEnemy(window.NEON.monsters.find(m => m.ai === 'chase' && !m.boss), p.x + dx, p.y + dy, 5); m.hp = m.maxHp = hp; m.stun = 99; G.enemies.push(m); return m; };
      mk(1, 0, 99999); mk(1, 1, 99999); mk(0, -1, 99999); mk(2, -1, 99999); N.computeFOV();
    }
    function grab(name, t0, times) { times.forEach(dt => { N.test.draw(t0 + dt); out[name + '-' + dt] = cv.toDataURL(); }); }
    const last = kind => G.chromeSkillFx.filter(f => f.kind === kind).pop();
    setup('mantis_blade'); N.doMove(1, 0); grab('mantis', last('slash').born, [30, 90, 200, 330]);
    setup('monowire'); N.doMove(1, 0); grab('sweep', last('slash').born, [40, 110, 250]);
    setup('mantis_blade'); G.melee.charge = 2; N.doMove(1, 0); grab('charged', last('slash').born, [30, 90, 220, 420]);
    setup(null); N.doMove(1, 0); grab('fist', last('slash').born, [40, 120]);
    setup(null); G.enemies[0].hp = 1; N.doMove(1, 0); grab('kill', performance.now(), [60, 200, 420]);
    setup(null); G.mines.push({ x: N.p.x + 2, y: N.p.y + 1, t: 1, dmg: 5 }); N.test.endTurn(); grab('boom', performance.now(), [60, 220]);
    setup(null); N.useCyberActive && (U.install('eyeL', 'eye_red'), N.p.face = 0, N.useCyberActive('eye_red')); const bm = last('beam'); if (bm) grab('beam', bm.born, [60, 200]);
    setup(null); G.ammo = 6; N.test.gunFire(); const sh = last('beam'); if (sh) grab('gun', sh.born, [30, 120]);
    setup(null); U.install('spine', 'spine_orange'); G.cyberCd = {}; N.useCyberActive('spine_orange'); const pu = last('pulse'); if (pu) grab('pulse', pu.born, [80, 250]);
    setup(null); U.install('body', 'body_red'); G.cyberCd = {}; N.useCyberActive('body_red'); const ar = last('armor'); if (ar) grab('shield', ar.born, [80, 300]);
    setup(null); G.hurt = 1; grab('hurt', performance.now(), [0]);
    return out;
  });
  for (const k of Object.keys(frames)) fs.writeFileSync(path.join(ROOT, 'shots', 'fx-' + k + '.png'), Buffer.from(frames[k].split(',')[1], 'base64'));
  console.log(Object.keys(frames).join(' '), 'errors', JSON.stringify(errs)); await b.close();
})();
