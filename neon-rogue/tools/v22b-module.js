/* V22B · 芯片行列表（复用商店行样式）/ 芯片盒容量 / 掉落分散 */
G.chipF.stashsock = G.chipF.stashsock || { q: 'all', s: 'all' };
function chipRow(c, btn, attr, o) {
  o = o || {};
  var aff = (c.affixes || []).map(function (a) { var q = QUALITY[a.quality] || QUALITY.gray; return '<span class="caf2" style="--cq:' + q.color + '"><i>' + q.name + '</i>' + (CHIP_LABEL[a.stat] || a.name) + '+' + chipFmt(a.stat, a.val) + '</span>'; }).join('');
  return '<div class="srow chiprow' + (c.locked ? ' locked' : '') + '" style="--rc:' + c.color + '">' + chipIco(c, '', { div: true }) +
    '<div class="stx"><b>' + econEsc(c.grade + '·' + c.name) + ' <span class="cmv">' + (CHIP_LABEL[c.stat] || '') + ' +' + chipFmt(c.stat, c.val) + '</span>' + (c.locked ? ' <s class="lk">锁</s>' : '') + '</b>' + (aff ? '<div class="cafs">' + aff + '</div>' : '') + (o.tag ? '<small>' + o.tag + '</small>' : '') + (c.heavy ? '<small style="color:#ff9aa5">重改 +' + c.heavy + ' 负载</small>' : '') + '</div>' +
    (btn ? '<button class="sbuy" ' + attr + (o.dis ? ' disabled' : '') + '>' + btn + '</button>' : '') + '</div>';
}
function chipListHTML(list, f, key, btn, attrName, empty) {
  var rows = list.filter(function (o) { return chipPass(o.c, f); }).sort(function (a, b) { return Q_ORDER.indexOf(b.c.quality) - Q_ORDER.indexOf(a.c.quality); })
    .map(function (o) { return chipRow(o.c, btn, attrName + '="' + o.i + '"', { dis: o.dis, tag: o.tag }); }).join('');
  return chipFilterBar(f, key) + '<div class="slist chiplist">' + (rows || '<div class="hint">' + (empty || '没有符合条件的芯片') + '</div>') + '</div>';
}
function chipCap() { return 12 + Math.round(metaStatSum('bag')); }
function chipsFull() { return G.mode === 'normal' && (G.chips || []).length >= chipCap(); }
// 在一点周围找互不重叠、没有物品的落点
function freeDropSpots(x, y, n) {
  var out = [], used = {};
  function ok(cx, cy) { return G.map[cy] && G.map[cy][cx] === FLOOR && !used[cx + ',' + cy] && !G.items.some(function (it) { return it.x === cx && it.y === cy; }); }
  for (var r = 0; r <= 3 && out.length < n; r++) for (var dy = -r; dy <= r && out.length < n; dy++) for (var dx = -r; dx <= r && out.length < n; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; var cx = x + dx, cy = y + dy; if (ok(cx, cy)) { used[cx + ',' + cy] = 1; out.push({ x: cx, y: cy }); } }
  while (out.length < n) out.push({ x: x, y: y });
  return out;
}
