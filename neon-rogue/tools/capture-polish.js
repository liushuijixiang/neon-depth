const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const project = path.resolve(__dirname, '..', '..');
const source = path.join(project, 'neon-rogue');
const output = path.join(project, 'outputs');
const images = path.join(output, 'comparison');
const scratch = path.join(project, 'work', 'comparison');
const sources = {
  before: path.join(project, 'work', 'baseline', 'dist.debug.html'),
  after: path.join(source, 'dist.debug.html')
};
const versions = process.argv.includes('--before-only') ? ['before'] : process.argv.includes('--after-only') ? ['after'] : ['before', 'after'];
const requestedScene = process.argv.find(argument => argument.startsWith('--scene='));
const scenarios = [
  { id: 'chip-normal', title: '普通蓝色芯片', detail: '同一枚攻击芯片的详情与硬件图示。', width: 390, height: 844 },
  { id: 'chip-heavy', title: '重改蓝色公司芯片', detail: '品质固定为蓝色，保留公司及重改属性。', width: 390, height: 844 },
  { id: 'sockets', title: '四个芯片插槽', detail: '同一橙色义眼，装入同样的四枚芯片。', width: 360, height: 640 },
  { id: 'ghost-five', title: '幽灵五个技能', detail: '同一高临界状态，包含赛博精神病与脉冲射击。', width: 360, height: 640 },
  { id: 'challenge', title: '挑战树', detail: '同一挑战选择与进度。', width: 390, height: 844 },
  { id: 'shop-sell', title: '黑市回收列表', detail: '同一批 24 枚芯片，回收列表向下滚动。', width: 390, height: 844 },
  { id: 'npc-unlock', title: '局外人物解锁', detail: '同一未接触人物存档，已经抵达 B7F。', width: 390, height: 844 },
  { id: 'edge-camera', title: '地图边缘镜头', detail: '同一地图，角色位于左上角的 (1, 1)。', width: 390, height: 844 },
  { id: 'body-map', title: '义体仓人体图示', detail: '相同的八件义体与装配部位。', width: 390, height: 844 },
  { id: 'enhancement-wheel', title: '义体强化轮盘', detail: '同一件 +1 义体的强化界面，成功率为 80%。', width: 390, height: 844 }
];

function initialiseCapture() {
  localStorage.clear();
  localStorage.setItem('neon-depth-mute', '1');
  localStorage.setItem('neon-depth-story', JSON.stringify({ scenes: { intro: 1 } }));
  let state = 731;
  window.captureSeed = value => { state = value >>> 0; };
  Math.random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  Date.now = () => 1794319200000;
  const nextFrame = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => nextFrame(() => callback(1200));
  Object.defineProperty(performance, 'now', { value: () => 1200 });
}

function createFixtures() {
  const N = window.__neon;
  window.captureSeed(731);
  const normalChip = N.makeChip('atk', 'blue');
  const heavyChip = N.test.corp.makeCorpChip('mobius', 'blue', true);
  const socketChips = ['crit', 'atk', 'hp', 'power'].map(id => N.makeChip(id, 'blue'));
  const qualities = ['gray', 'green', 'blue', 'purple', 'orange', 'red'];
  const types = ['atk', 'hp', 'def', 'crit', 'power', 'dodge'];
  const marketChips = Array.from({ length: 24 }, (_, index) => N.makeChip(types[index % types.length], qualities[index % qualities.length]));
  return JSON.parse(JSON.stringify({ normalChip, heavyChip, socketChips, marketChips }));
}

function showScenario({ id, fixtures }) {
  const N = window.__neon, T = N.test, G = N.G;
  const copy = value => {
    const result = JSON.parse(JSON.stringify(value));
    if (N.chipRules && N.chipRules.migrate) N.chipRules.migrate(result);
    return result;
  };
  window.captureSeed(1907);
  Object.assign(N.meta, { cores: 735, up: {}, pour: {}, stash: { cyber: [], chips: [] } });
  T.hideOverlay();
  if (id === 'challenge') {
    G.state = 'menu';
    G.chalSel = [];
    T.ui.challengeScreen();
    return;
  }
  if (id === 'npc-unlock') {
    G.state = 'menu';
    G.mode = 'normal';
    Object.assign(T.story.ST, { npc: {}, npcUnlocks: {}, maxDepth: 7, relics: {} });
    N.stats.bestDepth = 7;
    T.story.archiveScreen('people');
    return;
  }
  G.classId = id === 'ghost-five' ? 'ghost' : 'assault';
  G.trainPending = false;
  G.rushPending = null;
  N.startGame();
  T.hideOverlay();
  const p = N.p;
  Object.assign(G, {
    state: 'play', mode: 'normal', modal: null, paused: false, busy: false,
    depth: 1, turn: 12, credits: 128, kills: 0, score: 0, bonus: 0,
    pendingBoard: null, pendingBoons: 0, pendingEvo: 0, storyQueue: [],
    enemies: [], items: [], sites: [], allies: [], hazards: [], mines: [], walls: [],
    beams: [], particles: [], texts: [], tacticFx: [], chromeSkillFx: [],
    corpOp: null, trial: null, trialKit: null, b16: null, control: null,
    cyber: {}, mods: {}, modBag: [], cyberChips: {}, chips: [], inst: {}, runMod: {},
    stance: null, sandev: null, overT: 0, burnout: false, freeze: 0, stealth: 0,
    ghostStealth: 0, ghostRevealed: false, instab: id === 'ghost-five' ? 80 : 25,
    shake: 0, hurt: 0, flash: 0, punch: 0, shieldHit: 0, shieldBreak: 0,
    bossAlive: false, bossName: '', anomaly: null, quests: [], cfence: [], cams: [], cmines: [],
    adaptBonus: 30, trainBonus: { hp: 0, atk: 0, def: 0 }, chal: null,
    rooms: [{ x: 1, y: 1, w: 42, h: 28, cx: 22, cy: 15 }]
  });
  G.map = Array.from({ length: 30 }, (_, y) => Array.from({ length: 44 }, (_, x) => x === 0 || x === 43 || y === 0 || y === 29 ? 1 : 0));
  for (let y = 3; y <= 12; y++) if (y !== 6 && y !== 10) G.map[y][8] = 1;
  for (let x = 4; x <= 16; x++) if (x !== 7 && x !== 12) G.map[12][x] = 1;
  G.seen = G.map.map(row => row.map(() => 1));
  G.vis = G.map.map(row => row.map(() => 0));
  Object.assign(p, { x: id === 'edge-camera' ? 1 : 5, y: id === 'edge-camera' ? 1 : 7,
    level: 1, xp: 5, next: 16, itemMax: 0, itemAtk: 0, itemDef: 0, buffs: [], pending: 0, face: 0 });
  G.stairs = { x: 15, y: 9 };
  if (id === 'ghost-five') G.skills.act_shot = 1;
  const locations = id === 'edge-camera' ? [[4, 2], [6, 4]] : [[6, 7], [7, 9]];
  locations.forEach((position, index) => {
    const spec = T.corp.monsters.find(monster => monster.ai === (index ? 'turret' : 'chase') && !monster.boss && !monster.corpUnit);
    const enemy = T.spawnEnemy(spec, position[0], position[1], 1);
    Object.assign(enemy, { hp: 36, maxHp: 36, alerted: false, tick: 2, marked: id === 'ghost-five', marks: id === 'ghost-five' ? 2 : 0 });
    G.enemies.push(enemy);
  });
  N.recalc();
  p.hp = p.maxHp;
  N.computeFOV();
  N.updateHUD();
  if (id === 'chip-normal' || id === 'chip-heavy') {
    G.chips = [copy(id === 'chip-heavy' ? fixtures.heavyChip : fixtures.normalChip)];
    T.v18.openBag('chips');
    const detail = document.querySelector('[data-bchipd],[data-owned-chip]');
    if (!detail) throw new Error('Chip detail entry is unavailable');
    detail.onclick();
  } else if (id === 'sockets') {
    const mod = N.mods.find(item => item.id === 'eye_orange') || N.mods.find(item => item.quality === 'orange' && item.slot === 'eye' && !item.relic);
    if (!mod) throw new Error('Four-socket eye fixture is unavailable');
    G.modBag.push(mod.id);
    G.inst[mod.id] = { name: mod.name, affixes: [], plus: 0, dur: 18, maxDur: 18, heavy: 0 };
    N.installCyber(mod.id, 'eyeL');
    G.cyberChips.eyeL = copy(fixtures.socketChips);
    N.recalc();
    N.openCyber();
    G.cyberItem = mod.id;
    T.ui.renderCyber();
  } else if (id === 'shop-sell') {
    G.chips = copy(fixtures.marketChips);
    const shop = { type: 'shop', x: p.x, y: p.y, used: false, seed: 0, data: { stock: [], bulkQ: 'blue' } };
    G.sites = [shop];
    T.econ.openSite(shop);
    const sell = document.querySelector('[data-stab="sell"]');
    if (!sell) throw new Error('Shop sell tab is unavailable');
    sell.onclick();
  } else if (id === 'body-map') {
    const ids = ['eye_blue', 'eye_orange', 'hand_blue', 'hand_orange', 'body_blue', 'spine_blue', 'legL_blue', 'legL_green'];
    const slots = ['eyeL', 'eyeR', 'handL', 'handR', 'body', 'spine', 'legL', 'legR'];
    ids.forEach((modId, index) => {
      const mod = N.mods.find(item => item.id === modId);
      if (!mod) throw new Error(`Body fixture implant unavailable ${modId}`);
      G.modBag.push(modId);
      G.inst[modId] = { name: mod.name, affixes: [], plus: 0, dur: 18, maxDur: 18, heavy: 0 };
      N.installCyber(modId, slots[index]);
    });
    N.openCyber();
  } else if (id === 'enhancement-wheel') {
    const mod = N.mods.find(item => item.id === 'body_blue');
    if (!mod) throw new Error('Enhancement fixture implant is unavailable');
    G.modBag.push(mod.id);
    G.inst[mod.id] = { name: mod.name, affixes: [], plus: 1, dur: 14, maxDur: 18, heavy: 0 };
    N.installCyber(mod.id, 'body');
    T.v18.openDoctor({ type: 'doctor', x: p.x, y: p.y, used: false, seed: 0, data: {} });
    const enhance = document.querySelector(`[data-enh="${mod.id}"]`);
    if (!enhance) throw new Error('Doctor enhancement entry is unavailable');
    enhance.onclick();
  }
  T.draw(1200);
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForTimeout(120);
}

function inspectScenario(id) {
  const card = document.querySelector('#overlay.show .card');
  function visibility(element) {
    const box = element.getBoundingClientRect();
    const clip = { top: 0, left: 0, right: innerWidth, bottom: innerHeight };
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor), bounds = ancestor.getBoundingClientRect();
      if (style.overflowY !== 'visible') { clip.top = Math.max(clip.top, bounds.top); clip.bottom = Math.min(clip.bottom, bounds.bottom); }
      if (style.overflowX !== 'visible') { clip.left = Math.max(clip.left, bounds.left); clip.right = Math.min(clip.right, bounds.right); }
    }
    const withinClip = box.width > 0 && box.height > 0 && box.top >= clip.top && box.bottom <= clip.bottom && box.left >= clip.left && box.right <= clip.right;
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    const uncovered = !!hit && (hit === element || element.contains(hit));
    return { text: element.textContent, top: box.top, bottom: box.bottom, clip, withinClip, uncovered };
  }
  const sockets = [...document.querySelectorAll('.sockets .sock')].map(element => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  });
  return {
    id,
    title: document.title,
    viewport: { width: innerWidth, height: innerHeight },
    text: (card || document.querySelector('#app')).textContent,
    scroll: [...document.querySelectorAll('.card,.slist')].map(element => ({ selector: element.className, top: element.scrollTop, max: element.scrollHeight - element.clientHeight })),
    sockets,
    actions: [...document.querySelectorAll('#abilitybar .kbtn b')].map(element => element.textContent),
    chip: window.__neon.G.chips[0] || null,
    batchControls: [...document.querySelectorAll('.bulk:has(#shBulk) button')].map(visibility),
    batchVisible: (() => {
      const controls = [...document.querySelectorAll('.bulk:has(#shBulk) button')];
      return controls.length ? controls.map(visibility).every(control => control.withinClip && control.uncovered) : null;
    })()
  };
}

function escape(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function comparisonHtml() {
  const pairs = scenarios.map(scenario => `<section class="pair" id="${scenario.id}">
    <header><div><h2>${escape(scenario.title)}</h2><p>${escape(scenario.detail)}</p></div><span>${scenario.width} × ${scenario.height}</span></header>
    <div class="screens">
      <figure><figcaption>原版</figcaption><a href="comparison/${scenario.id}-before.png"><img src="comparison/${scenario.id}-before.png" width="${scenario.width}" height="${scenario.height}" alt="${escape(scenario.title)}原版截图"></a></figure>
      <figure><figcaption>本次打磨</figcaption><a href="comparison/${scenario.id}-after.png"><img src="comparison/${scenario.id}-after.png" width="${scenario.width}" height="${scenario.height}" alt="${escape(scenario.title)}打磨后截图"></a></figure>
    </div>
  </section>`).join('\n');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>霓虹深潜 · 画面对比</title><style>
  *{box-sizing:border-box}html{background:#070c13;color:#e6f2f9;font-family:Inter,"Microsoft YaHei",sans-serif}body{margin:0;padding:40px 24px 32px}main{max-width:868px;margin:auto}h1{font-size:28px;letter-spacing:.04em;margin:0 0 10px}p{margin:0;color:#91a8b9;font-size:13px;line-height:1.7}.intro{margin-bottom:30px}.pair{border:1px solid #243347;border-radius:14px;overflow:hidden;margin:0 0 28px;background:#0d1622}.pair>header{padding:18px 22px;display:flex;gap:16px;justify-content:space-between;align-items:start;border-bottom:1px solid #243347}h2{font-size:18px;margin:0 0 5px;font-weight:600}.pair>header>span{color:#93a6b6;font-size:12px;white-space:nowrap;padding-top:4px}.screens{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:18px 20px 24px}figure{margin:0;min-width:0;display:flex;flex-direction:column;align-items:center}figcaption{font-size:13px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #795a67;width:100%;text-align:center;color:#b8c6d1}figure:last-child figcaption{border-color:#50cddd;color:#c6f9ff}a{display:block;max-width:100%}img{display:block;max-width:100%;height:auto;background:#04060b;border:1px solid #243347;border-radius:8px}footer{font-size:12px;color:#8094a6;text-align:center;line-height:1.7;margin-top:18px}@media(max-width:600px){body{padding:20px 10px}.screens{gap:8px;padding:12px 8px}.pair>header{padding:14px 12px;display:block}.pair>header>span{display:block;margin-top:8px}h1{font-size:24px}h2{font-size:16px}}
  </style></head><body><main><div class="intro"><h1>霓虹深潜 · 画面对比</h1><p>两版使用同一组状态、随机种子和视口。新版芯片沿用实际旧存档迁移。截图暂停动画，点击画面可查看原图。</p></div>${pairs}<footer>左侧来自用户提供的原版调试包，右侧来自本次构建。说明文字位于游戏截图之外。</footer></main></body></html>`;
}

(async () => {
  Object.values(sources).forEach(filename => {
    if (!fs.existsSync(filename)) throw new Error(`Source unavailable ${filename}`);
  });
  fs.mkdirSync(images, { recursive: true });
  fs.mkdirSync(scratch, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const report = [];
  try {
    const fixtureFile = path.join(scratch, 'fixtures.json');
    let fixtures;
    if (versions.length === 1 && versions[0] === 'after' && fs.existsSync(fixtureFile)) fixtures = JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));
    else {
      const fixturePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await fixturePage.addInitScript(initialiseCapture);
      await fixturePage.goto(pathToFileURL(sources.before).href);
      fixtures = await fixturePage.evaluate(createFixtures);
      await fixturePage.close();
      fs.writeFileSync(fixtureFile, JSON.stringify(fixtures, null, 2));
    }
    const selectedScenarios = requestedScene ? scenarios.filter(scenario => scenario.id === requestedScene.slice(8)) : scenarios;
    if (!selectedScenarios.length) throw new Error('Requested comparison scene is unavailable');
    for (const scenario of selectedScenarios) {
      for (const version of versions) {
        const filename = sources[version];
        const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height }, deviceScaleFactor: 1, hasTouch: true });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(initialiseCapture);
        await page.goto(pathToFileURL(filename).href);
        await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}' });
        await page.evaluate(showScenario, { id: scenario.id, fixtures });
        await settle(page);
        if (scenario.id === 'sockets' || scenario.id === 'body-map') {
          await page.evaluate(id => {
            const feature = document.querySelector(id === 'sockets' ? '.sockets' : '.bodymap');
            if (feature) feature.scrollIntoView({ block: 'center', inline: 'nearest' });
          }, scenario.id);
        }
        if (scenario.id === 'shop-sell') {
          await page.evaluate(() => {
            const list = document.querySelector('.slist');
            const card = document.querySelector('#overlay.show .card');
            const target = list && list.scrollHeight > list.clientHeight + 2 && ['auto', 'scroll'].includes(getComputedStyle(list).overflowY) ? list : card;
            if (target) target.scrollTop = 240;
          });
        }
        await settle(page);
        const state = await page.evaluate(inspectScenario, scenario.id);
        const imagePath = path.join(images, `${scenario.id}-${version}.png`);
        await page.screenshot({ path: imagePath, animations: 'disabled' });
        const sourceStat = fs.statSync(filename);
        report.push({ ...state, version, source: filename, sourceBytes: sourceStat.size, sourceModified: sourceStat.mtime.toISOString(), screenshot: imagePath, errors });
        await page.close();
        console.log(`captured ${scenario.id} ${version}`);
        if (errors.length) throw new Error(`${scenario.id} ${version} ${errors.join(' | ')}`);
      }
    }
    const reportFile = path.join(scratch, 'capture-report.json');
    const previous = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : [];
    const combined = previous.filter(entry => !report.some(current => current.id === entry.id && current.version === entry.version)).concat(report);
    fs.writeFileSync(reportFile, JSON.stringify(combined, null, 2));
    const htmlPath = path.join(output, 'comparison.html');
    fs.writeFileSync(htmlPath, comparisonHtml());
    if (!scenarios.every(scenario => ['before', 'after'].every(version => fs.existsSync(path.join(images, `${scenario.id}-${version}.png`))))) {
      console.log('Comparison images are partial until the remaining version is captured');
      return;
    }
    const sheet = await browser.newPage({ viewport: { width: 940, height: 1000 }, deviceScaleFactor: 1 });
    await sheet.goto(pathToFileURL(htmlPath).href);
    await sheet.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode()));
    });
    await sheet.screenshot({ path: path.join(output, 'comparison.png'), fullPage: true });
    await sheet.close();
    console.log(`comparison ${htmlPath}`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
