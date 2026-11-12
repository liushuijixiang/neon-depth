const { chromium } = require('playwright'), path = require('path'), assert = require('assert'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('neon-depth-mute', '1'); localStorage.setItem('neon-depth-meta', JSON.stringify({ cores: 500, up: {}, stash: { cyber: ['eye_gray', { id: 'hand_red', chips: [] }, { id: 'leg_gray', chips: [], locked: true }], chips: [] }, tickets: ['t_assault_r'] })); });
  await page.goto('file://' + path.join(ROOT, 'dist.debug.html'));
  const res = await page.evaluate(async () => {
    const N = window.__neon, G = N.G, V = N.test.v18, out = []; const ok = (n, p, d) => out.push({ n, p: !!p, d });
    ok('旧红色制式券退款并移除', N.meta.cores === 820 && N.meta.tickets.length === 0, [N.meta.cores, N.meta.tickets]);
    ok('仓库字符串条目已规范化', N.meta.stash.cyber.every(x => typeof x === 'object'));
    const T = window.__neon.test; T.ui.marketScreen('ticket'); ok('9 张制式券，每张 8 件且都存在', document.querySelectorAll('.tkt').length === 9 && N.mods.filter(m => m.kit).length === 72);
    for (let i = 0; i < 6; i++) N.meta.stash.chips.push(N.makeChip('atk', ['gray', 'green', 'blue', 'purple', 'orange', 'red'][i])); N.meta.stash.chips[0].locked = true;
    G.market.tab = 'stash'; G.market.stashTab = 'chips'; V.renderMarket(); ok('芯片图标网格', document.querySelectorAll('.chipico').length === 6);
    document.querySelector('[data-fq="stash|red"]').onclick(); ok('按品质筛选', document.querySelectorAll('.chip-grid .chipico').length === 1);
    document.querySelector('[data-fq="stash|all"]').onclick();
    G.market.bulk_chips = 'blue'; V.renderMarket(); const before = N.meta.stash.chips.length; document.querySelector('[data-bsell="chips"]').onclick(); document.querySelector('[data-bsell="chips"]').onclick();
    ok('一键出售跳过锁定（≤蓝 售出 2 件）', N.meta.stash.chips.length === before - 2 && N.meta.stash.chips.some(c => c.locked), N.meta.stash.chips.length);
    G.market.stashTab = 'cyber'; G.market.bulk_cyber = 'red'; V.renderMarket(); document.querySelector('[data-bsell="cyber"]').onclick(); document.querySelector('[data-bsell="cyber"]').onclick();
    ok('锁定义体不被出售', N.meta.stash.cyber.length === 1 && N.meta.stash.cyber[0].locked);
    G.market.tab = 'forge'; G.market.forgeTab = 'chip'; V.renderMarket(); ok('黑市强化 · 芯片重铸页', document.querySelectorAll('[data-fchip]').length >= 1);
    G.market.forgeTab = 'aug'; N.meta.stash.cyber.push({ id: 'hand_red', chips: [] }); V.renderMarket(); ok('黑市强化 · 义体强化页', document.querySelectorAll('[data-faug]').length >= 1);
    document.querySelector('[data-faug]').onclick(); ok('打开强化界面', !!document.querySelector('.forge.enh'));
    return out;
  });
  res.push({ n: '无脚本异常', p: errs.length === 0, d: errs });
  res.forEach(c => console.log((c.p ? '✓ ' : '✗ ') + c.n + (c.p ? '' : ' ' + String(JSON.stringify(c.d)).slice(0, 300))));
  await b.close(); assert(res.every(c => c.p));
})().catch(e => { console.error(e); process.exit(1); });
