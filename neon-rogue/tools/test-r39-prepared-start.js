const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const expectFloor = process.argv.includes('--floor-zero');
const results = [];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    for (const failInstall of [false, true]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => { localStorage.clear(); localStorage.setItem('neon-depth-mute', '1'); });
      await page.goto(pathToFileURL(path.join(root, 'dist.debug.html')).href);
      await page.evaluate(() => {
        const N = __neon, G = N.G, T = N.test;
        const challenges = ['crowd', 'scarce', 'hunt', 'reject', 'skillcap', 'abyss', 'rust'];
        G.classId = 'assault'; G.trainPending = false; G.rushPending = null; G.dreamPending = null;
        N.meta.up = {}; G.chalSel = T.v36.chalSanitize(challenges);
        const mod = N.mods.find(item => item.id === 'body_blue');
        const chip = N.makeChip('atk', 'gray'); chip._r39Marker = 'attached-chip';
        N.meta.stash = { cyber: [{ id: mod.id, locked: true, chips: [chip],
          inst: { name: mod.name, affixes: [], plus: 0, heavy: 0, dur: 11, maxDur: 20, _r39Marker: 'original-instance' } }], chips: [] };
        T.v36.prepScreen();
      });
      await page.locator('[data-stash="0"]').click();
      if (failInstall) await page.evaluate(() => {
        const normalize = window.NeonChipRules.normalize;
        let injected = false;
        window.NeonChipRules.normalize = function (chip) {
          if (!injected && chip._r39Marker === 'attached-chip') { injected = true; window.__r39Injected = true; throw new Error('injected prepared-item failure'); }
          return normalize.apply(this, arguments);
        };
      });
      await page.locator('#prepGo').click();
      if (await page.locator('#prepGo').isVisible().catch(() => false)) await page.locator('#prepGo').click();
      const after = await page.evaluate(failInstall => {
        const N = __neon, G = N.G;
        const stored = N.meta.stash.cyber.filter(item => item.id === 'body_blue');
        const inBag = G.modBag.filter(id => id === 'body_blue');
        const loose = G.chips.concat(Object.values(G.cyberChips).flat()).filter(chip => chip && chip._r39Marker === 'attached-chip');
        return { failInstall, injected: !!window.__r39Injected, mode: G.mode, level: N.p.level,
          load: N.cyberLoad(), cap: N.adaptationCap(), overload: N.cyberOverload(), cyber: G.cyber,
          bagCount: inBag.length, storedCount: stored.length, storedInstance: stored[0]?.inst?._r39Marker,
          storedChips: stored[0]?.chips?.filter(chip => chip._r39Marker === 'attached-chip').length || 0,
          bagInstance: G.inst.body_blue?._r39Marker, looseCount: loose.length,
          persisted: N.test.save.saveRun(true), resumed: N.test.save.loadRun() };
      }, failInstall);
      const afterResume = await page.evaluate(() => ({
        bagCount: __neon.G.modBag.filter(id => id === 'body_blue').length,
        storedCount: __neon.meta.stash.cyber.filter(item => item.id === 'body_blue').length,
        looseCount: __neon.G.chips.concat(Object.values(__neon.G.cyberChips).flat()).filter(chip => chip && chip._r39Marker === 'attached-chip').length
      }));
      results.push({ after, afterResume, errors });
      assert.equal(after.mode, 'normal'); assert.equal(after.level, 1);
      assert.equal(after.cap, expectFloor ? 0 : -2);
      assert.equal(after.load, 0);
      assert.equal(after.overload, expectFloor ? 0 : 2);
      assert(after.persisted && after.resumed);
      if (failInstall) {
        assert(after.injected, 'The installed-chip failure was not exercised');
        assert.equal(after.bagCount, 0); assert.equal(after.storedCount, 1);
        assert.equal(after.storedInstance, 'original-instance'); assert.equal(after.storedChips, 1);
        assert.equal(afterResume.storedCount, 1); assert.equal(afterResume.bagCount, 0);
      } else {
        assert.equal(after.bagCount, 1); assert.equal(after.storedCount, 0);
        assert.equal(after.bagInstance, 'original-instance'); assert.equal(after.looseCount, 1);
        assert.equal(afterResume.bagCount, 1); assert.equal(afterResume.storedCount, 0); assert.equal(afterResume.looseCount, 1);
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    const output = path.resolve(root, '../work/r39/prepared-start-regression.json');
    fs.writeFileSync(output, JSON.stringify({ expectFloor, results }, null, 2));
    console.log(JSON.stringify({ passed: true, scenarios: results.length, expectFloor, results }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
