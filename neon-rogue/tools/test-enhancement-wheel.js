const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const wheel = require('../enhancement-wheel');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'work', 'enhancement-wheel');
const rates = [.9, .8, .65, .5, .35];
let plans = 0;
for (const rate of rates) for (const success of [false, true]) for (let index = 0; index < 24; index++) {
  for (const start of [0, .001, Math.PI, 15.6, 99.9]) {
    const motion = wheel.plan(rate, success, index, start);
    assert.equal(wheel.sectorAt(rate, motion.end), success);
    const rotations = (motion.end - motion.start) / (Math.PI * 2);
    assert(rotations >= 4 && rotations < 6);
    const local = motion.landing / (Math.PI * 2);
    const fraction = success ? local / rate : (local - rate) / (1 - rate);
    assert(fraction >= .349 && fraction <= .651);
    plans++;
  }
}
assert.throws(() => wheel.plan(0, true, 0, 0));
assert.throws(() => wheel.plan(1, false, 0, 0));
for (const rate of rates) {
  const boundary = rate * Math.PI * 2;
  assert.equal(wheel.sectorAt(rate, -boundary + .00001), true);
  assert.equal(wheel.sectorAt(rate, -boundary - .00001), false);
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 600 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.setContent('<!doctype html><html><head></head><body><div class="card forge enh" style="--fq:#b06bff;width:340px;margin:20px auto"><div class="forge-stage enh-stage"><div class="forge-ring"></div><div class="en-plus"><small>强化</small><b>+2</b><span>成功率 65%</span></div></div></div></body></html>');
    await page.addStyleTag({ path: path.join(root, 'ui.css') });
    await page.addStyleTag({ path: path.join(root, 'polish.css') });
    await page.screenshot({ path: path.join(output, 'before.png') });
    await page.addStyleTag({ path: path.join(root, 'enhancement-wheel.css') });
    await page.addScriptTag({ path: path.join(root, 'enhancement-wheel.js') });
    const beforeText = await page.textContent('body');
    const results = [];
    for (const success of [true, false]) {
      const result = await page.evaluate(success => new Promise(resolve => {
        const stage = document.querySelector('.enh-stage');
        const component = NeonEnhancementWheel.create(stage, .65);
        window.wheelTest = component;
        let callbacks = 0;
        component.spin(success, 180, actual => {
          callbacks++;
          resolve({ actual, callbacks, snapshot: component.snapshot(), pointer: document.querySelector('.enhancement-wheel-pointer').getBoundingClientRect().toJSON(), bounds: stage.getBoundingClientRect().toJSON() });
        });
        if (component.spin(!success, 10, () => { callbacks++; })) throw new Error('Overlapping spin accepted');
      }), success);
      assert.equal(result.actual, success);
      assert.equal(result.snapshot.successAtPointer, success);
      assert.equal(result.snapshot.running, false);
      assert.equal(result.snapshot.pendingFrame, false);
      assert.equal(result.callbacks, 1);
      assert(Math.abs((result.pointer.left + result.pointer.right) / 2 - (result.bounds.left + result.bounds.right) / 2) < 1);
      results.push(result);
      await page.screenshot({ path: path.join(output, success ? 'success.png' : 'failure.png') });
    }
    assert.equal(await page.textContent('body'), beforeText);
    const reduced = await page.evaluate(() => {
      let called = 0;
      wheelTest.spin(true, 0, () => { called++; });
      return { called, snapshot: wheelTest.snapshot() };
    });
    assert.equal(reduced.called, 1);
    assert.equal(reduced.snapshot.pendingFrame, false);
    assert.equal(reduced.snapshot.successAtPointer, true);
    const cancelled = await page.evaluate(async () => {
      let called = 0;
      wheelTest.spin(false, 1000, () => { called++; });
      document.querySelector('.enh-stage').remove();
      await new Promise(resolve => setTimeout(resolve, 40));
      return { called, snapshot: wheelTest.snapshot() };
    });
    assert.equal(cancelled.called, 0);
    assert.equal(cancelled.snapshot.running, false);
    assert.equal(cancelled.snapshot.pendingFrame, false);
    assert.equal(errors.length, 0);
    const report = { plans, probabilityBoundaries: rates.length * 2, results, reduced, cancelled, errors };
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ plans, probabilityBoundaries: rates.length * 2, browserChecks: 10, errors }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
