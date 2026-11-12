/* =========================================================
   V21 · 芯片图标 / 仓库分类筛选 / 锁定 / 一键出售 / 黑市强化
   ========================================================= */
META.stash.cyber = META.stash.cyber.map(function (x) { return typeof x === 'string' ? { id: x, chips: [] } : x; });
var CHIP_GLYPH = { atk: '攻', hp: '命', def: '防', crit: '暴', dodge: '闪', critMult: '伤', compat: '适', power: '功', skill: '协' };
var Q_NAMES = [['all', '全部'], ['gray', '灰'], ['green', '绿'], ['blue', '蓝'], ['purple', '紫'], ['orange', '橙'], ['red', '红']];
function chipIco(c, attr, o) {
  o = o || {};
  var dots = (c.affixes || []).map(function (a) { return '<u style="background:' + (QUALITY[a.quality] || QUALITY.gray).color + '"></u>'; }).join('');
  return '<button class="chipico' + (o.on ? ' on' : '') + (c.locked ? ' locked' : '') + (c.heavy ? ' heavy' : '') + '" ' + (attr || '') + ' style="--cq:' + c.color + '" title="' + econEsc(chipText(c)) + '">' +
    '<i class="pins"></i><b>' + (CHIP_GLYPH[c.stat] || '芯') + '</b><span>+' + chipFmt(c.stat, c.val) + '</span><em>' + dots + '</em>' + (c.locked ? '<s>锁</s>' : '') + (o.tag ? '<small>' + o.tag + '</small>' : '') + '</button>';
}
function chipFilterBar(f, key) {
  var stats = [['all', '全部']].concat(CHIPS.map(function (c) { return [c.stat, CHIP_LABEL[c.stat] || c.stat]; }));
  return '<div class="fbar"><div class="fpills">' + Q_NAMES.map(function (q) { return '<button class="fpill' + (f.q === q[0] ? ' on' : '') + '" data-fq="' + key + '|' + q[0] + '" style="--pc:' + (q[0] === 'all' ? '#9fe9ff' : QUALITY[q[0]].color) + '">' + q[1] + '</button>'; }).join('') + '</div>' +
    '<div class="fpills">' + stats.map(function (st) { return '<button class="fpill' + (f.s === st[0] ? ' on' : '') + '" data-fs="' + key + '|' + st[0] + '">' + st[1] + '</button>'; }).join('') + '</div></div>';
}
function chipPass(c, f) { if (f.q !== 'all' && c.quality !== f.q) return false; if (f.s !== 'all' && c.stat !== f.s && !(c.affixes || []).some(function (a) { return a.stat === f.s; })) return false; return true; }
function bindChipFilter(fs, rerender) {
  $$('[data-fq]').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-fq').split('|'); fs[v[0]].q = v[1]; rerender(); }; });
  $$('[data-fs]').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-fs').split('|'); fs[v[0]].s = v[1]; rerender(); }; });
}
G.chipF = G.chipF || { sock: { q: 'all', s: 'all' }, bag: { q: 'all', s: 'all' }, stash: { q: 'all', s: 'all' }, forge: { q: 'all', s: 'all' } };
// 义体芯片插槽
function socketRowHTML(chips, cap, attrName) {
  var h = '<div class="sockets">';
  for (var i = 0; i < cap; i++) { var c = chips[i];
    h += c ? '<div class="sock full">' + chipIco(c, attrName ? attrName + '="' + i + '"' : '') + '</div>' : '<div class="sock empty"><i></i><small>空槽</small></div>'; }
  return h + '</div>';
}
/* ---------- 芯片详情小窗 ---------- */
function chipDetail(c, o) {
  showModal(o.modal || 'chipd');
  var html = '<div class="card chipd" style="--fq:' + c.color + '"><div class="kicker">CHIP // 芯片' + (o.where ? ' · ' + econEsc(o.where) : '') + '</div>' + chipHTML(c) +
    '<div class="hint">' + (CHIP_HELP[c.stat] || '') + '</div><div class="cd-acts">' + (o.actions || []).map(function (a, i) { return '<button class="' + (a.cls || 'ghost') + '" data-cda="' + i + '"' + (a.dis ? ' disabled' : '') + '>' + a.label + '</button>'; }).join('') + '</div>' +
    '<div class="dock"><button class="cta" id="cdBack">返回</button></div></div>';
  overlay.innerHTML = html;
  $$('[data-cda]').forEach(function (b) { b.onclick = function () { o.actions[+b.getAttribute('data-cda')].fn(); }; });
  $('#cdBack').onclick = o.back;
}
/* ---------- 一键出售 ---------- */
function bulkSellInfo(kind, maxQ) {
  var mi = Q_ORDER.indexOf(maxQ), list = [], gain = 0;
  if (kind === 'cyber') META.stash.cyber.forEach(function (x) { var m = MOD_BY[stashId(x)]; if (!m || x.locked || m.relic || Q_ORDER.indexOf(m.quality) > mi) return; list.push(x); gain += Math.round(cyberPrice(m) * .5); });
  else META.stash.chips.forEach(function (c) { if (c.locked || Q_ORDER.indexOf(c.quality) > mi) return; list.push(c); gain += Math.round(chipPrice(c.quality) * .5); });
  return { list: list, gain: gain };
}
function bulkSell(kind, maxQ) {
  var info = bulkSellInfo(kind, maxQ);
  if (kind === 'cyber') { info.list.forEach(function (x) { stashChips(x).forEach(function (c) { META.stash.chips.push(c); }); }); META.stash.cyber = META.stash.cyber.filter(function (x) { return info.list.indexOf(x) < 0; }); }
  else META.stash.chips = META.stash.chips.filter(function (c) { return info.list.indexOf(c) < 0; });
  META.cores += info.gain; saveMeta(); sfx.pick();
  toast('售出 ' + info.list.length + ' 件 · +' + info.gain + ' 核心', 'good');
}
function bulkBarHTML(kind, mk) {
  var q = mk['bulk_' + kind] || 'blue', info = bulkSellInfo(kind, q);
  return '<div class="bulk"><span>一键出售 ≤</span>' + Q_NAMES.slice(1).map(function (x) { return '<button class="fpill' + (q === x[0] ? ' on' : '') + '" data-bq="' + kind + '|' + x[0] + '" style="--pc:' + QUALITY[x[0]].color + '">' + x[1] + '</button>'; }).join('') +
    '<button class="sellall' + (mk.bulkArm === kind ? ' arm' : '') + '" data-bsell="' + kind + '"' + (info.list.length ? '' : ' disabled') + '>' + (mk.bulkArm === kind ? '确认出售 ' + info.list.length + ' 件 · +' + info.gain : '出售 ' + info.list.length + ' 件 · +' + info.gain + ' 核心') + '</button></div>';
}
/* ---------- 仓库 / 强化 页面 ---------- */
function stashCyberCard(x, attr) {
  var id = stashId(x), m = MOD_BY[id]; if (!m) return '';
  var q = QUALITY[m.quality] || QUALITY.gray, it = x.inst, chips = stashChips(x), cap = q.slots;
  var sock = ''; for (var i = 0; i < cap; i++) sock += '<u style="' + (chips[i] ? 'background:' + chips[i].color + ';box-shadow:0 0 4px ' + chips[i].color : '') + '"></u>';
  return '<button class="scy' + (x.locked ? ' locked' : '') + '" ' + attr + ' style="--it:' + q.color + '"><span class="slot">' + (SLOT_LABEL[m.slot] || '') + '</span>' + (x.locked ? '<s>锁</s>' : '') +
    '<b>' + econEsc(it ? it.name : m.name) + (it && it.plus ? ' <i>+' + it.plus + '</i>' : '') + '</b><small>' + q.name + (m.relic ? ' · 遗物' : '') + '</small>' + (it && !m.relic ? durBarOf(it) : '') + '<span class="msock">' + sock + '</span></button>';
}
function renderMarketV21() {
  var mk = G.market;
  var html = '<div class="card cyberpanel mkv21" style="max-height:100%;overflow:auto"><div class="kicker" style="color:#fcee0a;letter-spacing:.2em">BLACK MARKET</div><h1 class="title small cyber-title">义体黑市</h1>' +
    '<div class="sub">核心 <b style="color:#fcee0a">' + META.cores + '</b> · 仓库 ' + META.stash.cyber.length + ' 件 / ' + META.stash.chips.length + ' 芯片</div>' + marketTabs();
  var all = [];
  if (mk.tab === 'forge') {
    mk.forgeTab = mk.forgeTab || 'aug';
    html += '<div class="subtabs"><button class="' + (mk.forgeTab === 'aug' ? 'on' : '') + '" data-ftab="aug">义体强化</button><button class="' + (mk.forgeTab === 'chip' ? 'on' : '') + '" data-ftab="chip">芯片重铸</button></div>';
    if (mk.forgeTab === 'aug') {
      var aug = META.stash.cyber.filter(function (x) { var m = MOD_BY[stashId(x)]; return m && !m.relic; });
      html += '<div class="hint">每级 +15% 基础属性、负载 +1。成功耐久 -1，失败耐久 -3。</div><div class="scy-grid">' + (aug.map(function (x) { x.inst = x.inst || rollInst(MOD_BY[x.id]); return stashCyberCard(x, 'data-faug="' + META.stash.cyber.indexOf(x) + '"'); }).join('') || '<div class="hint">仓库里没有可以强化的义体</div>') + '</div>';
    } else {
      META.stash.chips.forEach(function (c, i) { all.push({ c: c, k: 'L' + i }); });
      META.stash.cyber.forEach(function (x, xi) { stashChips(x).forEach(function (c, ci) { all.push({ c: c, k: 'S' + xi + '.' + ci, tag: '已镶嵌' }); }); });
      html += chipFilterBar(G.chipF.forge, 'forge') + '<div class="hint">主词条不变，附加词条重新随机。花费随品质提高。</div><div class="chip-grid">' +
        (all.filter(function (x) { return chipPass(x.c, G.chipF.forge); }).map(function (x) { return chipIco(x.c, 'data-fchip="' + x.k + '"', { tag: x.tag }); }).join('') || '<div class="hint">没有符合条件的芯片</div>') + '</div>';
    }
  } else {
    mk.stashTab = mk.stashTab || 'cyber'; mk.fSlot = mk.fSlot || 'all'; mk.fQ = mk.fQ || 'all';
    html += '<div class="subtabs"><button class="' + (mk.stashTab === 'cyber' ? 'on' : '') + '" data-stab="cyber">义体 ' + META.stash.cyber.length + '</button><button class="' + (mk.stashTab === 'chips' ? 'on' : '') + '" data-stab="chips">芯片 ' + META.stash.chips.length + '</button></div>';
    if (mk.stashTab === 'cyber') {
      var slots = [['all', '全部'], ['eye', '眼'], ['hand', '手'], ['body', '身体'], ['spine', '脊椎'], ['leg', '腿']];
      html += '<div class="fbar"><div class="fpills">' + slots.map(function (x) { return '<button class="fpill' + (mk.fSlot === x[0] ? ' on' : '') + '" data-fslot="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<div class="fpills">' + Q_NAMES.map(function (q) { return '<button class="fpill' + (mk.fQ === q[0] ? ' on' : '') + '" data-fqual="' + q[0] + '" style="--pc:' + (q[0] === 'all' ? '#9fe9ff' : QUALITY[q[0]].color) + '">' + q[1] + '</button>'; }).join('') + '</div></div>';
      var list = META.stash.cyber.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { var m = MOD_BY[stashId(o.x)]; return m && (mk.fSlot === 'all' || m.slot === mk.fSlot) && (mk.fQ === 'all' || m.quality === mk.fQ); })
        .sort(function (a, b) { var ma = MOD_BY[stashId(a.x)], mb = MOD_BY[stashId(b.x)]; return (Q_ORDER.indexOf(mb.quality) - Q_ORDER.indexOf(ma.quality)) || (b.x.locked ? 1 : 0) - (a.x.locked ? 1 : 0); });
      html += '<div class="scy-grid">' + (list.map(function (o) { return stashCyberCard(o.x, 'data-sitem="' + o.i + '"'); }).join('') || '<div class="hint">没有符合条件的义体</div>') + '</div>' + bulkBarHTML('cyber', mk);
    } else {
      html += chipFilterBar(G.chipF.stash, 'stash') + '<div class="chip-grid">' + (META.stash.chips.map(function (c, i) { return { c: c, i: i }; }).filter(function (o) { return chipPass(o.c, G.chipF.stash); })
        .sort(function (a, b) { return Q_ORDER.indexOf(b.c.quality) - Q_ORDER.indexOf(a.c.quality); }).map(function (o) { return chipIco(o.c, 'data-schipd="' + o.i + '"'); }).join('') || '<div class="hint">没有符合条件的芯片</div>') + '</div>' + bulkBarHTML('chips', mk);
    }
  }
  html += '<div class="stickybar"><button class="ghost" id="marketBack" style="margin-top:0">返回</button></div></div>';
  overlay.innerHTML = html; overlay.classList.add('show');
  var rr = renderMarket;
  $$('[data-mtab]').forEach(function (b) { b.onclick = function () { mk.tab = b.getAttribute('data-mtab'); mk.item = null; mk.bulkArm = null; rr(); }; });
  $$('[data-ftab]').forEach(function (b) { b.onclick = function () { mk.forgeTab = b.getAttribute('data-ftab'); rr(); }; });
  $$('[data-stab]').forEach(function (b) { b.onclick = function () { mk.stashTab = b.getAttribute('data-stab'); mk.bulkArm = null; rr(); }; });
  $$('[data-fslot]').forEach(function (b) { b.onclick = function () { mk.fSlot = b.getAttribute('data-fslot'); rr(); }; });
  $$('[data-fqual]').forEach(function (b) { b.onclick = function () { mk.fQ = b.getAttribute('data-fqual'); rr(); }; });
  bindChipFilter(G.chipF, rr);
  $$('[data-bq]').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-bq').split('|'); mk['bulk_' + v[0]] = v[1]; mk.bulkArm = null; rr(); }; });
  $$('[data-bsell]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-bsell'); if (mk.bulkArm !== k) { mk.bulkArm = k; rr(); return; } bulkSell(k, mk['bulk_' + k] || 'blue'); mk.bulkArm = null; rr(); }; });
  $$('[data-sitem]').forEach(function (b) { b.onclick = function () { mk.item = stashId(META.stash.cyber[+b.getAttribute('data-sitem')]); mk.itemIdx = +b.getAttribute('data-sitem'); rr(); }; });
  $$('[data-faug]').forEach(function (b) { b.onclick = function () { var x = META.stash.cyber[+b.getAttribute('data-faug')], m = MOD_BY[x.id];
    enhanceScreen(m.id, x.inst, { unit: '核心', cost: function (it) { return enhanceCost(it, m, true); }, can: function (it) { return META.cores >= enhanceCost(it, m, true); }, pay: function (it) { META.cores -= enhanceCost(it, m, true); saveMeta(); }, back: function () { G.modal = null; rr(); } }); }; });
  function chipByKey(k) { if (k[0] === 'L') return META.stash.chips[+k.slice(1)]; var v = k.slice(1).split('.'); return stashChips(META.stash.cyber[+v[0]])[+v[1]]; }
  $$('[data-fchip]').forEach(function (b) { b.onclick = function () { var c = chipByKey(b.getAttribute('data-fchip')); if (!c) return; var cost = 10 + Q_ORDER.indexOf(c.quality) * 8;
    chipForgeScreen(c, { cost: cost + ' 核心', can: function () { return META.cores >= cost; }, pay: function () { META.cores -= cost; saveMeta(); }, back: function () { G.modal = null; saveMeta(); rr(); } }); }; });
  $$('[data-schipd]').forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-schipd'), c = META.stash.chips[i]; if (!c) return; var cost = 10 + Q_ORDER.indexOf(c.quality) * 8;
    var back = function () { G.modal = null; rr(); };
    chipDetail(c, { where: '仓库', back: back, actions: [
      { label: c.locked ? '解锁' : '锁定', fn: function () { c.locked = !c.locked; saveMeta(); b.onclick(); } },
      { label: '重铸 · ' + cost + ' 核心', cls: 'ghost gold', dis: META.cores < cost, fn: function () { chipForgeScreen(c, { cost: cost + ' 核心', can: function () { return META.cores >= cost; }, pay: function () { META.cores -= cost; saveMeta(); }, back: function () { saveMeta(); b.onclick(); } }); } },
      { label: '出售 · ' + Math.round(chipPrice(c.quality) * .5), dis: !!c.locked, fn: function () { if (c.locked) return; META.cores += Math.round(chipPrice(c.quality) * .5); META.stash.chips.splice(META.stash.chips.indexOf(c), 1); saveMeta(); back(); } }
    ] }); }; });
  $('#marketBack').onclick = function () { menuScreen(); };
}
