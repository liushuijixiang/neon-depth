// 蓄力 / 蓄势 / 连段帧截图
const { chromium } = require('playwright'), path = require('path'), fs = require('fs'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => localStorage.setItem('neon-depth-mute', '1'));
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html'));
  const frames = await page.evaluate(() => {
    const N = window.__neon, G = N.G, U = N.test.training, out = {}, cv = document.querySelector('#game');
    G.classId = 'assault'; G.trainPending = true; N.startGame(); N.test.hideOverlay(); G.paused = false;
    function setup(weapon) {
      Object.keys(G.cyber).forEach(k => U.remove(k)); if (weapon) U.install('handL', weapon); N.test.hideOverlay(); G.paused = false; G.busy = false; G.hitStopUntil = 0;
      G.particles = []; G.texts = []; G.chromeSkillFx = []; G.melee = { charge: 0, combo: 0, step: 0, seq: 0 }; G.stance = null; G.cyberCd = {}; window.__neon.test.nvReset && window.__neon.test.nvReset();
      const p = N.p; p.face = 0; G.enemies = []; const mk = (dx, dy) => { const m = N.test.spawnEnemy(window.NEON.monsters.find(m => m.ai === 'chase' && !m.boss), p.x + dx, p.y + dy, 5); m.hp = m.maxHp = 99999; m.stun = 99; G.enemies.push(m); };
      mk(1, 0); mk(1, 1); mk(-1, -1); mk(3, 0); N.computeFOV();
    }
    const grab = (name, t0, times) => times.forEach(dt => { N.test.draw(t0 + dt); out[name + '-' + dt] = cv.toDataURL(); });
    const last = () => G.chromeSkillFx.filter(f => f.kind === 'slash').pop();
    setup('iaido_blade'); const iai = window.__neon.mods.find(m => m.melee && /居合/.test(m.name)); if (iai) { setup(iai.id); }
    for (let l = 1; l <= 3; l++) { G.busy = false; G.paused = false; (N.startMeleeCharge || N.test.startMeleeCharge)(); G.melee.charge = l; grab('iai-charge' + l, performance.now(), [120 + l]); }
    G.hitStopUntil = 0; G.busy = false; N.doMove(1, 0); const f1 = last(); if (f1) grab('iai-release', f1.born, [60, 200]);
    const kat = window.__neon.mods.find(m => m.id === 'katana'); setup('katana');
    grab('katana-ready', performance.now(), [300]);
    for (let s = 0; s < 3; s++) { G.hitStopUntil = 0; G.busy = false; G.paused = false; N.doMove(1, 0); const f = last(); if (f) grab('katana-s' + (s + 1), f.born, [90, 260]); }
    setup('mantis_blade'); G.busy = false; N.useCyberActive('mantis_blade'); grab('stance-armed', performance.now(), [200]);
    G.busy = false; G.paused = false; G.hitStopUntil = 0; N.doMove(0, 0); const sf = last(); if (sf) grab('stance-release', sf.born, [80, 220, 420]);
    return { out, stance: G.stance, cd: G.cyberCd };
  });
  for (const k of Object.keys(frames.out)) fs.writeFileSync(path.join(ROOT, 'shots', 'fx-' + k + '.png'), Buffer.from(frames.out[k].split(',')[1], 'base64'));
  console.log(Object.keys(frames.out).join(' '), JSON.stringify(frames.cd), 'errors', JSON.stringify(errs)); await b.close();
})();
