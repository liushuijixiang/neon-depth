// 交互一致性回归：拖尾点击、无延迟按钮、无系统控件、Esc 关闭、放弃需二次确认
const { chromium } = require('playwright'), path = require('path'), assert = require('assert'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [], checks = []; page.on('pageerror', e => errs.push(e.message)); const ok = (n, p, d) => checks.push({ n, p: !!p, d });
  await page.addInitScript(() => localStorage.setItem('neon-depth-mute', '1'));
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html'));
  // 1) D-pad 按下时踩上设施：同一手势的抬起点击不能落到面板按钮上
  await page.evaluate(() => { const N = window.__neon, G = N.G; G.classId = 'assault'; N.startGame(); N.test.hideOverlay(); N.p.pending = 0; G.pendingBoard = null; G.paused = false;
    const p = N.p; G.map[p.y][p.x + 1] = 0; G.enemies = []; G.items = []; G.credits = 999;
    G.sites = [{ type: 'broker', x: p.x + 1, y: p.y, used: false, seed: 0, data: { deals: [{ id: 'intel', name: '情报', desc: 'x', cost: 1, ok: true }] } }]; });
  const key = page.locator('.key[data-dx="1"][data-dy="0"]'); const kb = await key.boundingBox();
  // put the deal button exactly under the finger after the panel opens
  await page.mouse.move(kb.x + kb.width / 2, kb.y + kb.height / 2); await page.mouse.down();
  const opened = await page.evaluate(() => window.__neon.G.modal);
  await page.evaluate(([x, y]) => { const btn = document.querySelector('[data-deal]'); if (btn) { btn.style.position = 'fixed'; btn.style.left = (x - 30) + 'px'; btn.style.top = (y - 20) + 'px'; btn.style.width = '60px'; btn.style.height = '40px'; btn.style.zIndex = 99; } }, [kb.x + kb.width / 2, kb.y + kb.height / 2]);
  await page.mouse.up();
  const after = await page.evaluate(() => ({ used: window.__neon.G.sites[0].used, modal: window.__neon.G.modal }));
  ok('踩上设施打开面板', opened === 'broker');
  ok('同一手势的拖尾点击被吞掉', !after.used && after.modal === 'broker', after);
  await page.evaluate(() => document.querySelector('[data-deal]').removeAttribute('style'));
  await page.locator('[data-deal]').click();
  ok('新的点击正常生效', await page.evaluate(() => window.__neon.G.sites[0].used));
  // 2) 关闭面板后义体按钮立即可用（无 400ms 延迟）
  await page.evaluate(() => { window.__neon.test.hideOverlay(); });
  await page.waitForTimeout(40);
  ok('义体按钮立即显示', await page.locator('#cyberbtn').isVisible());
  await page.locator('#cyberbtn').click(); ok('义体按钮立即可点', await page.evaluate(() => window.__neon.G.modal === 'cyber'));
  // 3) Esc 关闭面板
  await page.keyboard.press('Escape'); ok('Esc 关闭当前面板', await page.evaluate(() => window.__neon.G.modal === null));
  // 4) 放弃本次深潜需二次确认
  await page.locator('#menuBtn').click(); await page.locator('#restartRun').click();
  ok('第一次点击仅进入确认态', await page.evaluate(() => window.__neon.G.state === 'play' && document.querySelector('#restartRun').classList.contains('confirm')));
  await page.locator('#restartRun').click(); ok('第二次点击才放弃', await page.evaluate(() => window.__neon.G.modal === 'start'));
  // 5) 全部面板不出现系统下拉框
  await page.evaluate(() => { const N = window.__neon, G = N.G; G.trainPending = true; N.startGame(); });
  let selects = 0; for (const t of ['gear', 'chips', 'items', 'enemies', 'params']) { await page.locator('[data-tr-panel="' + t + '"]').click(); selects += await page.locator('select').count(); }
  ok('训练场无系统下拉框', selects === 0);
  await page.locator('[data-tr-panel="gear"]').click();
  await page.locator('[data-tr-pick="slot"][data-v="handR"]').click();
  ok('自绘选择器可切换', await page.locator('[data-tr-pick="slot"][data-v="handR"].on').count() === 1);
  ok('无脚本异常', errs.length === 0, errs);
  checks.forEach(c => console.log((c.p ? '✓ ' : '✗ ') + c.n + (c.p ? '' : ' ' + JSON.stringify(c.d))));
  await b.close(); assert(checks.every(c => c.p));
})().catch(e => { console.error(e); process.exit(1); });
