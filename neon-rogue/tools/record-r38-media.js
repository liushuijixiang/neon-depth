/* Captures the real page and a tee of its real Web Audio output. Production sources are untouched. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
function option(name, fallback) { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1]; }
const mode = option('--mode', 'preflight');
const duration = Number(option('--duration', mode === 'preflight' ? '6' : '55'));
const source = path.resolve(option('--source', path.join(root, 'neon-rogue/dist.debug.html')));
const ffmpeg = option('--ffmpeg', 'ffmpeg');
const seed = Number(option('--seed', '3838'));
const fps = Number(option('--fps', '60'));
const output = mode === 'preflight' ? path.join(root, 'work/r38/media-preflight') : path.join(root, 'outputs/r38/taptap');
const runDirectory = path.join(root, 'work/r38/media-runs', new Date().toISOString().replace(/[:.]/g, '-') + '-' + mode);
fs.mkdirSync(runDirectory, { recursive: true });
fs.mkdirSync(output, { recursive: true });
const statusFile = path.join(runDirectory, 'status.json');
const status = { pid: process.pid, mode, fps, status: 'starting', source, sourceSha256: crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'), started: new Date().toISOString(), clips: [] };
function update(values) { Object.assign(status, values); fs.writeFileSync(statusFile, JSON.stringify(status, null, 2)); }
function wait(milliseconds) { return new Promise(resolve => setTimeout(resolve, milliseconds)); }

function audioInstrumentation() {
  const NativeAudioContext = window.AudioContext || window.webkitAudioContext;
  const connect = AudioNode.prototype.connect;
  const mirrored = new WeakSet();
  const capture = { context: null, destination: null, recorder: null, chunks: [] };
  AudioNode.prototype.connect = function (target, ...rest) {
    const result = connect.call(this, target, ...rest);
    const context = this.context;
    if (context.__mediaDestination && target === context.destination && !mirrored.has(this)) {
      connect.call(this, context.__mediaDestination, rest[0] || 0, 0);
      mirrored.add(this);
    }
    return result;
  };
  class RecordedAudioContext extends NativeAudioContext {
    constructor(...values) {
      super(...values);
      this.__mediaDestination = this.createMediaStreamDestination();
      capture.context = this;
      capture.destination = this.__mediaDestination;
    }
  }
  window.AudioContext = RecordedAudioContext;
  if (window.webkitAudioContext) window.webkitAudioContext = RecordedAudioContext;
  window.__mediaCapture = {
    start() {
      if (!capture.context || capture.context.state !== 'running') throw new Error('Game audio context is not running');
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('No supported browser audio recording codec');
      capture.chunks = [];
      capture.recorder = new MediaRecorder(capture.destination.stream, { mimeType, audioBitsPerSecond: 192000 });
      capture.recorder.ondataavailable = event => { if (event.data.size) capture.chunks.push(event.data); };
      const start = { wallTime: Date.now(), performanceTime: performance.now(), audioTime: capture.context.currentTime, mimeType };
      capture.recorder.start(500);
      return start;
    },
    stop() {
      return new Promise((resolve, reject) => {
        if (!capture.recorder || capture.recorder.state === 'inactive') return reject(new Error('Audio recorder was not active'));
        capture.recorder.onstop = async () => {
          const blob = new Blob(capture.chunks, { type: capture.recorder.mimeType });
          const reader = new FileReader();
          reader.onerror = reject;
          reader.onload = () => resolve({ data: reader.result.split(',')[1], bytes: blob.size, wallTime: Date.now(), audioTime: capture.context.currentTime });
          reader.readAsDataURL(blob);
        };
        capture.recorder.stop();
      });
    }
  };
}

async function runFFmpeg(argumentsList, logName) {
  const logPath = path.join(runDirectory, logName + '.log');
  return new Promise((resolve, reject) => {
    const process = spawn(ffmpeg, ['-hide_banner', '-y', ...argumentsList], { cwd: runDirectory, windowsHide: true });
    const log = fs.createWriteStream(logPath);
    let text = '';
    process.stdout.on('data', chunk => { log.write(chunk); text += chunk.toString(); });
    process.stderr.on('data', chunk => { log.write(chunk); text += chunk.toString(); });
    process.on('error', error => { log.end(); reject(error); });
    process.on('close', code => { log.end(); code === 0 ? resolve({ text, logPath }) : reject(new Error('ffmpeg ' + logName + ' exit ' + code + ', see ' + logPath)); });
  });
}

async function verifyVideo(filename, width, height, seconds) {
  const validation = await runFFmpeg(['-i', filename, '-map', '0:v:0', '-map', '0:a:0', '-af', 'astats=metadata=1:reset=0', '-f', 'null', 'NUL'], path.basename(filename) + '-verify');
  if (!validation.text.includes(width + 'x' + height) || !/Video: h264/.test(validation.text) || !/Audio: aac/.test(validation.text)) throw new Error('Unexpected output codec or resolution');
  const durationMatch = validation.text.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  const actualSeconds = durationMatch ? Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3]) : 0;
  const rmsValues = [...validation.text.matchAll(/RMS level dB:\s*([-.\d]+)/g)].map(match => Number(match[1]));
  const rmsDb = rmsValues.length ? Math.max(...rmsValues) : null;
  const frameRate = Number(validation.text.match(/Video: h264[^\r\n]*?([\d.]+) fps/)?.[1]);
  if (Math.abs(actualSeconds - seconds) > .15) throw new Error('Unexpected video duration ' + actualSeconds);
  if (rmsDb == null || !Number.isFinite(rmsDb) || rmsDb < -65) throw new Error('Captured game audio is silent or unavailable');
  return { width, height, duration: actualSeconds, frameRate, videoCodec: 'h264', audioCodec: 'aac', audioRmsDb: rmsDb,
    bytes: fs.statSync(filename).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex') };
}

async function newGamePage(browser, width, height, deviceScaleFactor = 1) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor });
  page.mediaErrors = [];
  page.mediaConsoleErrors = [];
  page.on('pageerror', error => page.mediaErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') page.mediaConsoleErrors.push(message.text()); });
  page.setDefaultTimeout(4000);
  await page.addInitScript(audioInstrumentation);
  await page.addInitScript(value => {
    let state = value >>> 0;
    Math.random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
    localStorage.clear();
    localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
    localStorage.setItem('neon-depth-mute', '0');
  }, seed);
  await page.goto(pathToFileURL(source).href);
  await page.waitForFunction(() => !!window.__neon);
  return page;
}

async function clickExisting(page, selector) {
  const candidate = page.locator(selector).first();
  if (await candidate.count() && await candidate.isVisible() && await candidate.isEnabled()) { await candidate.click({ timeout: 1800 }); return true; }
  return false;
}

async function startMode(page, mode, classId) {
  await clickExisting(page, '#actionBtn');
  await page.locator(`[data-mode="${mode}"]`).click();
  await page.locator(`[data-flow-cls="${classId}"]`).click();
  if (mode === 'normal') {
    const selection = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('[data-pcyber]'));
      const active = candidates.find(button => __neon.mods.find(mod => mod.id === button.dataset.pcyber)?.active);
      return (active || candidates[0])?.dataset.pcyber;
    });
    if (selection) await page.locator(`[data-pcyber="${selection}"]`).click();
    await clickExisting(page, '[data-pcons]');
    await page.locator('#prepGo').click();
    await settleModal(page);
  }
}

async function settleModal(page) {
  for (let pass = 0; pass < 6; pass++) {
    const selector = await page.evaluate(() => {
      if (!__neon.G.modal) return null;
      const choices = ['[data-reward^="cyber:"]', '[data-reward="chips"]', '[data-boon]', '.story-card .cta', '#storyNext', '#sceneNext', '#storyClose', '#sceneClose', '#lootOk', '#lootClose', '#closeMenu', '#siteClose', '#boardClose', '#bagClose', '#cyberClose', '#cancelItem'];
      const direct = choices.find(value => document.querySelector(value));
      if (direct) return direct;
      const close = Array.from(document.querySelectorAll('.card button')).find(button => !button.disabled && /^(返回|继续|离开|关闭|完成|领取|全部拾取|全部拿走|收下|暂不)$/.test(button.textContent.trim()));
      if (close && close.id) return '#' + CSS.escape(close.id);
      const primary = document.querySelector('.card .cta:not(:disabled)');
      return primary && primary.id ? '#' + CSS.escape(primary.id) : null;
    });
    if (!selector) break;
    await clickExisting(page, selector);
  }
}

async function trainSetup(page, classId, bossId) {
  await startMode(page, 'train', classId);
  await page.locator('[data-tr-panel="params"]').first().click();
  for (let i = 0; i < 10; i++) await page.locator('[data-tr="lvl+"]').click();
  const kits = {
    assault: [['handL', 'hand_purple'], ['legL', 'blink_charge'], ['body', 'thorns_plate']],
    engineer: [['handL', 'wall_blast'], ['spine', 'turret_net'], ['body', 'body_blue']],
    ghost: [['body', 'stealth_heal'], ['spine', 'grow_giant'], ['handL', 'hand_orange']]
  };
  for (const [slot, id] of kits[classId]) {
    await page.locator('[data-tr-panel="gear"]').first().click();
    await page.locator(`[data-tr-pick="slot"][data-v="${slot}"]`).click();
    await page.locator(`[data-tr-equip="${id}"]`).click();
  }
  await page.locator('[data-tr-panel="params"]').first().click();
  await page.locator('[data-tr="heal"]').click();
  await page.locator('[data-tr="resupply"]').click();
  await page.locator('[data-tr-panel="enemies"]').first().click();
  if (bossId) {
    await page.locator('[data-tr-pick="enemyGroup"][data-v="boss"]').click();
    const depth = await page.evaluate(id => __neon.bosses().find(boss => boss.id === id).tier * 5, bossId);
    await page.locator(`[data-tr-pick="depth"][data-v="${depth}"]`).click();
    await page.locator(`[data-tr-bossarena="${bossId}"]`).locator('..').locator('[data-spawnboss]').click();
  } else {
    await page.locator('[data-tr-pick="depth"][data-v="10"]').click();
    await page.locator('[data-tr-pick="stage"][data-v="2"]').click();
    for (let i = 0; i < 7; i++) await page.locator('[data-spawn]').nth(i % 3).click();
  }
  await clickExisting(page, '#closeMenu');
}

async function planAction(page) {
  return page.evaluate(() => {
    const N = __neon, G = N.G, p = N.p;
    if (G.state !== 'play') return { kind: 'finished', state: G.state };
    if (G.modal) return { kind: 'modal', modal: G.modal };
    const visible = enemy => G.vis[enemy.y] && G.vis[enemy.y][enemy.x];
    const distance = cell => Math.max(Math.abs(cell.x - p.x), Math.abs(cell.y - p.y));
    const enemies = G.enemies.filter(enemy => enemy.hp > 0 && !enemy.neutral && visible(enemy)).sort((a, b) => distance(a) - distance(b));
    const target = enemies[0];
    if (target && p.hp < p.maxHp * .8) {
      const defense = Array.from(document.querySelectorAll('[data-cyberact]')).find(button => {
        const mod = N.mods.find(mod => mod.id === button.dataset.cyberact);
        return !button.disabled && mod && mod.active && !(G.cyberCd[mod.id] > 0) &&
          (mod.active.type === 'shield' && N.shieldPool() <= 0 || /heal/.test(mod.active.type) && p.hp < p.maxHp * .65);
      });
      if (defense) return { kind: 'ability', id: defense.dataset.cyberact };
    }
    if (p.hp < p.maxHp * .55) {
      const heal = G.inv.findIndex(id => id === 'nanite_patch' || id === 'trauma_injector');
      if (heal >= 0) return { kind: 'consumable', index: heal };
    }
    const danger = new Set();
    G.enemies.forEach(enemy => { if (enemy.intent && visible(enemy)) enemy.intent.cells.forEach(cell => danger.add(cell.x + ',' + cell.y)); });
    G.hazards.forEach(field => field.cells.forEach(cell => danger.add(cell.x + ',' + cell.y)));
    const floor = (x, y) => G.map[y] && G.map[y][x] === 0 && !(G.walls || []).some(wall => wall.x === x && wall.y === y && wall.turns > 0);
    const occupied = (x, y) => G.enemies.some(enemy => enemy.hp > 0 && enemy.x === x && enemy.y === y);
    const neighbors = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy || !floor(p.x + dx, p.y + dy) || occupied(p.x + dx, p.y + dy)) continue;
      neighbors.push({ dx, dy, x: p.x + dx, y: p.y + dy });
    }
    if (danger.has(p.x + ',' + p.y)) {
      const safe = neighbors.filter(cell => !danger.has(cell.x + ',' + cell.y));
      if (safe.length) return { kind: 'move', ...safe[0] };
    }
    if (G.reload) return { kind: 'move', dx: 0, dy: 0 };
    if (target) {
      const offensiveItem = G.inv.findIndex(id => id === 'emp' || id === 'nano_swarm');
      if (offensiveItem >= 0 && enemies.length >= 2 && G.turn % 8 === 0) return { kind: 'consumable', index: offensiveItem };
      const dash = document.querySelector('[data-act="dash"]');
      if (dash && !dash.disabled && distance(target) <= 6 && G.turn % 9 === 0) return { kind: 'nativeAbility', selector: '[data-act="dash"]' };
      const buttons = Array.from(document.querySelectorAll('[data-cyberact]')).filter(button => !button.disabled);
      const selected = buttons.find(button => {
        const mod = N.mods.find(mod => mod.id === button.dataset.cyberact);
        if (!mod || !mod.active || G.cyberCd[mod.id] > 0 || !/beam|multi|arc|burst|cleave|blink|drone|turret|grow|shield/.test(mod.active.type)) return false;
        const pattern = N.r38 && N.r38.implantCombat && N.r38.implantCombat.pattern(mod, null, true);
        const range = pattern && pattern.range || ({ cleave: 1, cleave_bleed: 1, burst: 2, arc: 3, multi: 6 })[mod.active.type] || 8;
        return distance(target) <= range;
      });
      if (selected && G.turn % 3 === 0) return { kind: 'ability', id: selected.dataset.cyberact };
      if (G.classId === 'assault' && G.ammo > 0 && distance(target) <= 7) return { kind: 'fire' };
      if (G.classId === 'assault' && G.ammo === 0 && G.inv.length && G.energy >= N.test.gunReloadCost()) return { kind: 'reload' };
      if (distance(target) <= 1) return { kind: 'move', dx: Math.sign(target.x - p.x), dy: Math.sign(target.y - p.y) };
    }
    const goal = target || G.enemies.find(enemy => enemy.hp > 0) || G.items[0] || G.stairs;
    if (goal) {
      const enemyGoal = G.enemies.includes(goal);
      const goalRadius = target && G.classId === 'assault' && G.ammo > 0 ? 5 : enemyGoal ? 1 : 0;
      const queue = [{ x: p.x, y: p.y, first: null }], seen = new Set([p.x + ',' + p.y]);
      for (let index = 0; index < queue.length; index++) {
        const current = queue[index];
        if (current.first && Math.max(Math.abs(current.x - goal.x), Math.abs(current.y - goal.y)) <= goalRadius) return { kind: 'move', ...current.first };
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const x = current.x + dx, y = current.y + dy, key = x + ',' + y;
          if ((!dx && !dy) || seen.has(key) || !floor(x, y) || occupied(x, y) || danger.has(key)) continue;
          seen.add(key); queue.push({ x, y, first: current.first || { dx, dy } });
        }
      }
    }
    return { kind: 'move', dx: 0, dy: 0 };
  });
}

async function act(page, plan) {
  const hitStop = await page.evaluate(() => Math.max(0, (__neon.G.hitStopUntil || 0) - Date.now()));
  if (hitStop > 0) await wait(hitStop + 5);
  if (plan.kind === 'modal') { await settleModal(page); return; }
  if (plan.kind === 'move') await clickExisting(page, `.key[data-dx="${plan.dx}"][data-dy="${plan.dy}"]`);
  else if (plan.kind === 'fire') await clickExisting(page, '[data-act="fire"]');
  else if (plan.kind === 'ability') await clickExisting(page, `[data-cyberact="${plan.id}"]`);
  else if (plan.kind === 'nativeAbility') await clickExisting(page, plan.selector);
  else if (plan.kind === 'consumable') {
    const slot = page.locator('#invbar .slot').nth(plan.index);
    if (!await slot.isVisible()) await clickExisting(page, '#consumablesToggle');
    await slot.click();
    await wait(300);
    await clickExisting(page, '#useItem');
  } else if (plan.kind === 'reload') {
    await clickExisting(page, '[data-act="reload"]');
    await clickExisting(page, '[data-reload]');
  }
}

async function prepareCombat(page) {
  let ready = false, repeated = 0, previous = '';
  const steps = [];
  for (let i = 0; i < 160; i++) {
    const plan = await planAction(page);
    if (plan.kind === 'fire' || plan.kind === 'ability' || plan.kind === 'nativeAbility') { ready = true; break; }
    if (plan.kind === 'finished') throw new Error('Run ended during capture setup');
    await act(page, plan);
    const position = await page.evaluate(() => ({ turn: __neon.G.turn, x: __neon.p.x, y: __neon.p.y, modal: __neon.G.modal, paused: __neon.G.paused, busy: __neon.G.busy }));
    steps.push({ plan, ...position });
    const signature = JSON.stringify(position);
    repeated = signature === previous ? repeated + 1 : 0; previous = signature;
    if (repeated >= 8) break;
    await wait(80);
  }
  if (!ready) {
    await page.screenshot({ path: path.join(runDirectory, 'setup-failed.png'), scale: 'device' });
    const details = await page.evaluate(() => ({ state: __neon.G.state, mode: __neon.G.mode, modal: __neon.G.modal,
      player: { x: __neon.p.x, y: __neon.p.y, hp: __neon.p.hp }, enemies: __neon.G.enemies.length,
      buttons: Array.from(document.querySelectorAll('#overlay button')).map(button => ({ id: button.id, text: button.textContent.trim().slice(0, 80), disabled: button.disabled })) }));
    fs.writeFileSync(path.join(runDirectory, 'setup-failed.json'), JSON.stringify({ details, steps }, null, 2));
    throw new Error('No visible combat target was reached during normal setup, see setup-failed.json');
  }
  await page.waitForFunction(() => !__neon.G.modal && !__neon.G.paused && window.NeonAudio && NeonAudio.snapshot().contextState === 'running' && NeonAudio.snapshot().rms > 0.0001, null, { timeout: 8000 });
}

async function capture(page, name, seconds, width, height, screenshotSchedule = [], captureRegion = null) {
  const folder = path.join(runDirectory, name);
  const frameDirectory = path.join(folder, 'frames');
  fs.mkdirSync(frameDirectory, { recursive: true });
  const session = await page.context().newCDPSession(page);
  const frames = [];
  let firstFrameResolve;
  const firstFrame = new Promise(resolve => { firstFrameResolve = resolve; });
  let clockOffset = null;
  const pixelScale = await page.evaluate(() => devicePixelRatio);
  let frameRunning = true, frameError = null, screenshotLoop = null;
  function saveFrame(data, timestamp) {
    const filename = path.join(frameDirectory, String(frames.length).padStart(6, '0') + '.jpg');
    fs.writeFileSync(filename, Buffer.from(data, 'base64'));
    frames.push({ filename, timestamp });
    firstFrameResolve();
  }
  session.on('Page.screencastFrame', event => {
    const received = Date.now(), timestamp = event.metadata.timestamp * 1000;
    if (clockOffset == null) clockOffset = Math.abs(timestamp - received) < 5000 ? 0 : received - timestamp;
    saveFrame(event.data, timestamp + clockOffset);
    session.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
  });
  if (pixelScale > 1) {
    clockOffset = 0;
    screenshotLoop = (async () => {
      while (frameRunning) {
        const begin = Date.now();
        const frame = await page.screenshot({ type: 'jpeg', quality: 95, animations: 'allow', scale: 'device', clip: captureRegion || undefined });
        saveFrame(frame, (begin + Date.now()) / 2);
      }
    })().catch(error => { frameError = error; frameRunning = false; });
  } else await session.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: width, maxHeight: height, everyNthFrame: 1 });
  await Promise.race([firstFrame, wait(8000).then(() => { throw new Error('No screencast frame arrived'); })]);
  const audioStart = await page.evaluate(() => __mediaCapture.start());
  const initialState = await page.evaluate(() => ({ mode: __neon.G.mode, classId: __neon.G.classId, depth: __neon.G.depth, turn: __neon.G.turn, hp: __neon.p.hp, maxHp: __neon.p.maxHp, level: __neon.p.level,
    cyber: Object.assign({}, __neon.G.cyber), trainingBonus: __neon.G.trainBonus, audio: NeonAudio.snapshot(), viewport: { width: innerWidth, height: innerHeight, deviceScaleFactor: devicePixelRatio },
    stage: (() => { const rect = document.querySelector('#stage').getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; })() }));
  const actions = [], screenshots = [], inputErrors = [];
  const battleScreenshots = name === 'gameplay';
  const sampleFrame = option('--sample-frame', '');
  let sampleCaptured = false;
  const ticker = setInterval(() => update({ status: 'recording', activeClip: name, frames: frames.length, elapsedSeconds: (Date.now() - audioStart.wallTime) / 1000 }), 2000);
  try {
    while (Date.now() < audioStart.wallTime + seconds * 1000) {
      const elapsed = (Date.now() - audioStart.wallTime) / 1000;
      if (frameError) throw frameError;
      if (elapsed > 5 && !actions.length) throw new Error('Capture did not reach a real core action within five seconds');
      if (page.mediaErrors.length) throw new Error('Game script exception during capture: ' + page.mediaErrors[0]);
      const due = battleScreenshots ? null : screenshotSchedule.find(time => time <= elapsed && !screenshots.some(shot => shot.at === time));
      if (due != null) {
        const filename = path.join(output, 'screenshot-' + String(screenshots.length + 1).padStart(2, '0') + '-720x1280.png');
        await page.screenshot({ path: filename, animations: 'allow', scale: 'device' });
        screenshots.push({ at: due, actualSeconds: elapsed, filename });
      }
      const before = await page.evaluate(() => ({ turn: __neon.G.turn, state: __neon.G.state,
        visibleEnemies: __neon.G.enemies.filter(enemy => enemy.hp > 0 && __neon.G.vis[enemy.y] && __neon.G.vis[enemy.y][enemy.x]).length }));
      const plan = await planAction(page);
      if (plan.kind === 'finished') { await wait(250); continue; }
      try { await act(page, plan); } catch (error) { inputErrors.push({ at: elapsed, message: error.message.split('\n')[0] }); }
      const after = await page.evaluate(() => ({ turn: __neon.G.turn, hp: __neon.p.hp, state: __neon.G.state }));
      if (after.turn > before.turn) actions.push({ at: (Date.now() - audioStart.wallTime) / 1000, kind: plan.kind, turn: after.turn, hp: after.hp });
      if (battleScreenshots && screenshots.length < 3 && after.turn > before.turn && before.visibleEnemies > 0 && ['fire', 'ability', 'nativeAbility', 'consumable'].includes(plan.kind) && (!screenshots.length || elapsed - screenshots[screenshots.length - 1].actualSeconds > 1.4)) {
        await wait(75);
        const filename = path.join(output, 'screenshot-' + String(screenshots.length + 1).padStart(2, '0') + '-720x1280.png');
        await page.screenshot({ path: filename, animations: 'allow', scale: 'device' });
        screenshots.push({ kind: 'combat', actualSeconds: elapsed, filename, visibleEnemiesBeforeAction: before.visibleEnemies, action: plan.kind });
      }
      if (sampleFrame && !sampleCaptured && after.turn > before.turn && before.visibleEnemies > 0 && ['fire', 'ability', 'nativeAbility', 'consumable'].includes(plan.kind)) {
        await wait(75);
        fs.mkdirSync(path.dirname(path.resolve(sampleFrame)), { recursive: true });
        await page.screenshot({ path: path.resolve(sampleFrame), animations: 'allow', scale: 'device' });
        sampleCaptured = true;
      }
      await wait(520);
    }
  } finally {
    clearInterval(ticker);
  }
  const audio = await page.evaluate(() => __mediaCapture.stop());
  frameRunning = false;
  if (screenshotLoop) await screenshotLoop;
  else await session.send('Page.stopScreencast');
  await session.detach();
  const audioFile = path.join(folder, 'audio.webm');
  fs.writeFileSync(audioFile, Buffer.from(audio.data, 'base64'));
  if (frames.length < 2 || !audio.bytes) throw new Error('Capture did not contain both video and audio');
  const end = audioStart.wallTime + seconds * 1000;
  let held = frames[0];
  frames.forEach(frame => { if (frame.timestamp <= audioStart.wallTime) held = frame; });
  const timeline = [{ filename: held.filename, timestamp: audioStart.wallTime }].concat(frames.filter(frame => frame.timestamp > audioStart.wallTime && frame.timestamp < end));
  function quote(filename) { return "'" + filename.replace(/\\/g, '/').replace(/'/g, "'\\''") + "'"; }
  const list = [];
  timeline.forEach((frame, index) => {
    const next = timeline[index + 1];
    list.push('file ' + quote(frame.filename));
    list.push('duration ' + Math.max(.001, ((next ? next.timestamp : end) - frame.timestamp) / 1000).toFixed(6));
  });
  list.push('file ' + quote(timeline[timeline.length - 1].filename));
  const concatFile = path.join(folder, 'frames.ffconcat');
  fs.writeFileSync(concatFile, list.join('\n') + '\n');
  const filename = path.join(folder, name + '.mp4');
  update({ status: 'encoding', activeClip: name });
  await runFFmpeg(['-f', 'concat', '-safe', '0', '-i', concatFile, '-i', audioFile, '-vf', `fps=${fps}:start_time=0,tpad=stop_mode=clone:stop_duration=0.2,scale=${width}:${height},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', String(seconds), '-movflags', '+faststart', filename], name + '-encode');
  const verified = await verifyVideo(filename, width, height, seconds);
  const receipt = { name, filename, initialState, frames: frames.length, observedFrameRate: timeline.length / seconds,
    firstSecondCapturedFrames: frames.filter(frame => frame.timestamp >= audioStart.wallTime && frame.timestamp < audioStart.wallTime + 1000).length,
    captureRegion: captureRegion ? { css: captureRegion, nativePixels: { width: captureRegion.width * pixelScale, height: captureRegion.height * pixelScale }, preCropped: true } : null,
    runtime: 'Chrome H5 page', recordingMethod: pixelScale > 1 ? 'Actual device-scale Playwright screenshots with capture midpoint timestamps and recorded live Web Audio' : 'Actual CDP screencast frames and recorded live Web Audio output', scriptErrors: page.mediaErrors.slice(), consoleErrors: page.mediaConsoleErrors.slice(),
    audioStart, audioStop: { wallTime: audio.wallTime, audioTime: audio.audioTime, bytes: audio.bytes },
    frameClockOffsetMs: clockOffset, firstVideoFrameDeltaMs: frames[0].timestamp - audioStart.wallTime,
    representativeFrame: sampleCaptured ? path.resolve(sampleFrame) : null,
    firstCoreActionSeconds: actions[0]?.at ?? null, coreActions: actions.length,
    conservativeCoreActionSeconds: actions.reduce((sum, action, index) => sum + Math.min(0.5, index ? action.at - actions[index - 1].at : 0.5), 0),
    actions, screenshots, inputErrors, verified };
  fs.writeFileSync(path.join(folder, 'receipt.json'), JSON.stringify(receipt, null, 2));
  status.clips.push(receipt); update({ status: 'clip-complete', activeClip: name });
  return receipt;
}

async function gameplay(browser, seconds, preflight) {
  const trainingClass = preflight && option('--training', '');
  const width = trainingClass ? 1920 : 720, height = trainingClass ? 1080 : 1280;
  const clipName = preflight ? 'capture-proof' + (trainingClass ? '-' + trainingClass : '') : 'gameplay';
  const page = await newGamePage(browser, trainingClass ? width : 360, trainingClass ? height : 640, trainingClass ? 1 : 2);
  try {
    if (trainingClass) await trainSetup(page, trainingClass, option('--training-boss', ''));
    else await startMode(page, 'normal', 'assault');
    await prepareCombat(page);
    const receipt = await capture(page, clipName, seconds, width, height,
      preflight ? [] : [8, 18, 28, 38, 48]);
    if (!preflight && (receipt.firstCoreActionSeconds > 5 || receipt.conservativeCoreActionSeconds < 10 || receipt.screenshots.length < 3)) throw new Error('Gameplay capture needs another truthful take to meet its duration/action/screenshot criteria');
    if (!preflight) {
      await settleModal(page);
      await clickExisting(page, '#cyberbtn');
      const equipment = path.join(output, 'screenshot-04-720x1280.png');
      await page.screenshot({ path: equipment, animations: 'allow', scale: 'device' });
      receipt.screenshots.push({ kind: 'equipment', filename: equipment });
      await clickExisting(page, '#cyberClose');
      const looseChips = await page.evaluate(() => __neon.G.chips.length);
      if (looseChips) {
        await clickExisting(page, '#bagchip');
        await clickExisting(page, '[data-bt="chips"]');
        await clickExisting(page, '[data-owned-chip]');
      } else {
        await clickExisting(page, '#cyberbtn');
        await clickExisting(page, '.bslot');
      }
      const detail = path.join(output, 'screenshot-05-720x1280.png');
      await page.screenshot({ path: detail, animations: 'allow', scale: 'device' });
      receipt.screenshots.push({ kind: looseChips ? 'chip-detail' : 'equipment-detail', filename: detail });
    }
    const target = path.join(output, clipName + '-' + width + 'x' + height + '.mp4');
    fs.copyFileSync(receipt.filename, target);
    receipt.deliverable = target;
    return receipt;
  } finally { await page.close(); }
}

async function trailer(browser) {
  const promo = path.join(output, 'promo-1920x1080.png');
  if (!fs.existsSync(promo)) throw new Error('Approved native promo artwork is not ready at ' + promo);
  const clips = [];
  const settings = ['bl_hound', 'bl_hive', 'bl_warden', 'bl_lance', 'bl_mine', 'bl_mirror', 'bh_eye', 'bh_hive', 'bh_phase'].map((bossId, index) => ({
    name: 'trailer-' + bossId, classId: ['assault', 'engineer', 'ghost'][index % 3], seconds: 6, bossId
  }));
  for (const setting of settings) {
    if (setting.name === 'trailer-boss' && option('--reuse-boss', '')) {
      const receiptPath = path.resolve(option('--reuse-boss', ''));
      const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
      const priorStatus = JSON.parse(fs.readFileSync(path.join(path.dirname(path.dirname(receiptPath)), 'status.json'), 'utf8'));
      if (priorStatus.sourceSha256 !== status.sourceSha256 || !fs.existsSync(receipt.filename)) throw new Error('The reusable boss clip does not match the frozen source');
      receipt.reusedFrom = receiptPath; clips.push(receipt); status.clips.push(receipt); update({ status: 'clip-reused', activeClip: setting.name });
      continue;
    }
    const page = await newGamePage(browser, 1920, 1080, 2);
    try {
      await trainSetup(page, setting.classId, setting.bossId);
      await prepareCombat(page);
      const pixelScale = await page.evaluate(() => devicePixelRatio);
      const captureRegion = await page.evaluate(() => {
        const rect = document.querySelector('#stage').getBoundingClientRect();
        const width = Math.floor(rect.width / 2) * 2;
        const height = Math.floor(width * 9 / 16 / 2) * 2;
        return { x: Math.floor(rect.x / 2) * 2, y: Math.floor((rect.y + (rect.height - height) / 2) / 2) * 2, width, height };
      });
      const captured = await capture(page, setting.name, setting.seconds, captureRegion.width * pixelScale, captureRegion.height * pixelScale, [], captureRegion);
      captured.bossId = setting.bossId;
      if (clips.length === 0) {
        const firstFrame = path.join(path.dirname(captured.filename), 'frames/000000.jpg');
        const frameCheck = await runFFmpeg(['-i', firstFrame, '-f', 'null', 'NUL'], 'first-clip-native-frame');
        const dimensions = frameCheck.text.match(/Video: mjpeg[^\r\n]*?\b(\d+)x(\d+)\b/);
        const nativePixels = dimensions ? { width: Number(dimensions[1]), height: Number(dimensions[2]) } : null;
        const check = { nativePixels, firstSecondCapturedFrames: captured.firstSecondCapturedFrames, observedFrameRate: captured.observedFrameRate };
        update({ firstClipCaptureCheck: check });
        console.log(JSON.stringify({ firstClipCaptureCheck: check }));
        if (!nativePixels || nativePixels.width !== captureRegion.width * pixelScale || nativePixels.height !== captureRegion.height * pixelScale) throw new Error('The first raw battle frame has unexpected pixel dimensions');
        if (captured.firstSecondCapturedFrames <= 7 || captured.observedFrameRate <= 6.67) throw new Error('Battle-region capture has not improved the measured frame cadence');
      }
      clips.push(captured);
    } finally { await page.close(); }
  }
  const pieces = clips.map(clip => {
    const death = clip.actions.find(action => action.hp <= 0);
    const available = death ? Math.max(0, Math.floor((death.at - .12) * fps) / fps) : clip.verified.duration;
    return { clip, available, use: Math.min(4, available) };
  });
  let remaining = 36 - pieces.reduce((sum, piece) => sum + piece.use, 0);
  for (const piece of pieces) {
    const addition = Math.min(Math.max(0, remaining), piece.available - piece.use);
    piece.use += addition; remaining -= addition;
  }
  if (remaining > .05) throw new Error('The recorded live combat totals less than 36 seconds, additional actual footage is needed');
  const closeups = [];
  for (const piece of pieces) {
    if (piece.use < .25) continue;
    const filename = path.join(runDirectory, piece.clip.name + '-closeup.mp4');
    await runFFmpeg(['-i', piece.clip.filename, '-vf', 'scale=1920:1080:flags=lanczos,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', String(piece.use), filename], piece.clip.name + '-closeup');
    closeups.push({ filename, source: piece.clip.filename, seconds: piece.use, availableLiveSeconds: piece.available,
      classId: piece.clip.initialState.classId, bossId: piece.clip.bossId, captureRegion: piece.clip.captureRegion });
  }
  const intro = path.join(runDirectory, 'trailer-intro.mp4');
  await runFFmpeg(['-loop', '1', '-i', promo, '-i', clips[0].filename, '-map', '0:v:0', '-map', '1:a:0', '-vf', `fps=${fps},scale=1920:1080,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', '3', intro], 'trailer-intro');
  const outro = path.join(runDirectory, 'trailer-outro.mp4');
  await runFFmpeg(['-i', intro, '-t', '1', '-c', 'copy', outro], 'trailer-outro');
  const concat = path.join(runDirectory, 'trailer.ffconcat');
  fs.writeFileSync(concat, [intro, ...closeups.map(clip => clip.filename), outro].map(filename => "file '" + filename.replace(/\\/g, '/').replace(/'/g, "'\\''") + "'").join('\n') + '\n');
  const target = path.join(output, 'trailer-1920x1080.mp4');
  await runFFmpeg(['-f', 'concat', '-safe', '0', '-i', concat, '-c', 'copy', '-t', '40', '-movflags', '+faststart', target], 'trailer-final');
  return { deliverable: target, promo, introSeconds: 3, outroSeconds: 1, footage: closeups,
    edit: 'Actual battle-area closeups, using only living combat intervals, with no new text or generated attacks.', verified: await verifyVideo(target, 1920, 1080, 40) };
}

(async () => {
  if (!fs.existsSync(ffmpeg)) throw new Error('The specified ffmpeg runtime is unavailable');
  if (![30, 60].includes(fps)) throw new Error('Capture output frame rate must be 30 or 60');
  if (!['preflight', 'gameplay', 'trailer', 'all'].includes(mode)) throw new Error('Unknown capture mode');
  console.log(JSON.stringify({ pid: process.pid, statusFile, runDirectory, mode }));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const deliverables = [];
  try {
    if (mode === 'preflight' || mode === 'gameplay' || mode === 'all') deliverables.push(await gameplay(browser, duration, mode === 'preflight'));
    if (mode === 'trailer' || mode === 'all') deliverables.push(await trailer(browser));
    update({ status: 'complete', exitCode: 0, finished: new Date().toISOString(), deliverables });
    console.log(JSON.stringify({ status: 'complete', statusFile, deliverables: deliverables.map(item => ({ filename: item.deliverable, verified: item.verified })) }, null, 2));
  } finally { await browser.close(); }
})().catch(error => {
  update({ status: 'failed', exitCode: 1, finished: new Date().toISOString(), error: error.stack });
  console.error(error.message);
  process.exitCode = 1;
});
