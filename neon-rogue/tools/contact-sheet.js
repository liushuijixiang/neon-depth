// 把 shots/fx-*.png 按组拼成联络表（裁切画面中心）
const { chromium } = require('playwright'), path = require('path'), fs = require('fs'); const DIR = path.resolve(__dirname, '..', 'shots');
(async () => {
  const files = fs.readdirSync(DIR).filter(f => /^fx-.*\.png$/.test(f)).sort();
  const groups = {}; files.forEach(f => { const m = f.match(/^fx-(.+)-(\d+)\.png$/); (groups[m[1]] = groups[m[1]] || []).push([+m[2], f]); });
  const names = Object.keys(groups); const b = await chromium.launch({ args: ['--no-sandbox'] }); const page = await b.newPage({ viewport: { width: 1040, height: 800 } });
  for (let s = 0; s < names.length; s += 3) {
    const part = names.slice(s, s + 3);
    const html = '<body style="margin:0;background:#000;font:12px monospace;color:#9fe9ff">' + part.map(g => '<div style="display:flex">' + groups[g].sort((a, b) => a[0] - b[0]).map(([t, f]) => '<div style="width:260px;height:260px;overflow:hidden;position:relative"><img src="data:image/png;base64,' + fs.readFileSync(path.join(DIR, f)).toString('base64') + '" style="position:absolute;left:50%;top:50%;width:640px;transform:translate(-50%,-50%)"><span style="position:absolute;left:4px;top:2px">' + g + ' ' + t + 'ms</span></div>').join('') + '</div>').join('') + '</body>';
    await page.setContent(html); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(DIR, 'sheet-' + (s / 3) + '.png'), fullPage: true }); console.log('sheet-' + (s / 3), part.join(','));
  }
  await b.close();
})();
