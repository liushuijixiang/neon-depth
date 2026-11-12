/* Run with PLAYWRIGHT_CHANNEL=chrome to use an installed Chrome. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'audio.js'), 'utf8');
assert(!/Math\.random\s*\(/.test(source), 'Audio must not consume gameplay randomness');

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<button id="gesture" style="width:60px;height:60px"></button>');
    await page.addScriptTag({ path: path.join(root, 'audio.js') });
    const snapshot = () => page.evaluate(() => window.NeonAudio.snapshot());
    const initial = await snapshot();
    assert.equal(initial.contextState, 'uninitialized');
    assert.equal(initial.schedulerActive, false);
    await page.evaluate(() => { Math.random = () => { throw new Error('Audio changed gameplay randomness'); }; });

    await page.click('#gesture');
    await page.waitForFunction(() => window.NeonAudio.snapshot().rms > 0.0001);
    assert.equal((await snapshot()).contextState, 'running');

    const scenes = [
      [{ state: 'play' }, 'explore'],
      [{ state: 'play', combat: true }, 'combat'],
      [{ state: 'play', boss: true, lowHealth: true }, 'boss'],
      [{ state: 'play', boss: true, paused: true, modal: 'menu' }, 'paused'],
      [{ state: 'over' }, 'over'],
      [{ state: 'win' }, 'win'],
      [{ state: 'menu', paused: true }, 'menu']
    ];
    for (const [scene, profile] of scenes) {
      await page.evaluate(value => window.NeonAudio.setScene(value), scene);
      assert.equal((await snapshot()).profile, profile);
    }
    await page.evaluate(() => window.NeonAudio.setScene({ state: 'play', boss: true, lowHealth: true }));

    const effectNames = ['step', 'bump', 'hit', 'hurt', 'pick', 'level', 'stairs', 'death', 'win', 'turret', 'ach', 'quest'];
    for (const name of effectNames) {
      await page.evaluate(value => window.NeonAudio.sfx[value](), name);
      await page.waitForTimeout(75);
    }
    assert.equal((await snapshot()).effectCount, effectNames.length);
    await page.evaluate(() => {
      window.NeonAudio.beep(600, 0.09, 'square', 0.04, -200);
      window.NeonAudio.beep(NaN, 0.09, 'square', 0.04);
      window.NeonAudio.beep(600, -1, 'square', 0.04);
    });
    assert.equal((await snapshot()).effectCount, effectNames.length + 1);

    let maximumPeak = 0;
    let maximumRms = 0;
    for (let sample = 0; sample < 12; sample++) {
      await page.waitForTimeout(100);
      const current = await snapshot();
      assert(Number.isFinite(current.rms) && Number.isFinite(current.peak));
      maximumPeak = Math.max(maximumPeak, current.peak);
      maximumRms = Math.max(maximumRms, current.rms);
    }
    assert(maximumPeak > 0.005 && maximumPeak < 0.98, `Invalid PCM peak ${maximumPeak}`);
    assert(maximumRms > 0.001, `Expected audible samples, received ${maximumRms}`);

    await page.evaluate(() => window.NeonAudio.suspend());
    await page.waitForFunction(() => window.NeonAudio.snapshot().contextState === 'suspended');
    const suspended = await snapshot();
    assert.equal(suspended.schedulerActive, false);
    assert.equal(suspended.activeVoices, 0);
    assert.equal(suspended.masterGain, 0);
    await page.waitForTimeout(300);
    assert.equal((await snapshot()).scheduledSteps, suspended.scheduledSteps);
    await page.evaluate(() => window.NeonAudio.resume());
    await page.waitForTimeout(180);
    const resumed = await snapshot();
    assert.equal(resumed.contextState, 'running');
    assert(resumed.scheduledSteps - suspended.scheduledSteps <= 3, 'Suspension must not replay a music backlog');
    assert(resumed.nextStepTime > resumed.currentTime - 0.02);

    await page.evaluate(() => {
      const audio = window.NeonAudio;
      audio.setMuted(true);
      audio.setMuted(false);
      audio.setMuted(true);
      audio.setMuted(false);
    });
    await page.waitForFunction(() => window.NeonAudio.snapshot().contextState === 'running' && window.NeonAudio.snapshot().schedulerActive);
    await page.evaluate(() => window.NeonAudio.setMuted(true));
    await page.waitForFunction(() => window.NeonAudio.snapshot().contextState === 'suspended');
    const muteSnapshot = await snapshot();
    await page.evaluate(() => window.NeonAudio.sfx.level());
    await page.waitForTimeout(120);
    const silent = await snapshot();
    assert.equal(silent.effectCount, muteSnapshot.effectCount);
    assert.equal(silent.activeVoices, 0);
    assert.equal(silent.masterGain, 0);
    assert.equal(silent.schedulerActive, false);
    await page.evaluate(() => window.NeonAudio.setMuted(false));
    await page.waitForFunction(() => window.NeonAudio.snapshot().contextState === 'running');

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForFunction(() => window.NeonAudio.snapshot().contextState === 'suspended');
    const hidden = await snapshot();
    assert.equal(hidden.activeVoices, 0);
    assert.equal(hidden.schedulerActive, false);
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForFunction(() => window.NeonAudio.snapshot().contextState === 'running');
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.waitForFunction(() => window.NeonAudio.snapshot().contextState === 'suspended');
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await page.waitForFunction(() => window.NeonAudio.snapshot().contextState === 'running');

    await page.evaluate(() => window.NeonAudio.dispose());
    await page.waitForFunction(() => window.NeonAudio.snapshot().contextState === 'closed');
    const closed = await snapshot();
    assert.equal(closed.activeVoices, 0);
    assert.equal(closed.schedulerActive, false);
    await page.click('#gesture');
    assert.equal((await snapshot()).contextState, 'closed');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, scenes: scenes.length, effects: effectNames.length,
      maximumPeak, maximumRms, lifecycle: ['gesture', 'suspend', 'rapid-mute', 'visibility', 'pagehide', 'dispose'] }));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
