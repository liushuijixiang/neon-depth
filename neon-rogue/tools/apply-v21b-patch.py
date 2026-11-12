p='game.js';s=open(p,encoding='utf8').read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
i=s.index("    var chips = G.cyberChips[slot] || [];\n    html += '<div class=\"cx-h\" style=\"margin-top:8px;text-align:left\">芯片 ' + chips.length")
j=s.index("      '<button class=\"ghost\" data-uncyber=\"' + slot + '\"",i)
s=s[:i]+"""    var chips = G.cyberChips[slot] || [];
    var cand = G.chips.map(function (c, ci) { return { c: c, i: ci }; }).filter(function (o) { return chipPass(o.c, G.chipF.sock); }).sort(function (a, b) { return Q_ORDER.indexOf(b.c.quality) - Q_ORDER.indexOf(a.c.quality); });
    html += '<div class="cx-h" style="margin-top:8px;text-align:left">芯片插槽 ' + chips.length + '/' + q.slots + ' · 点芯片取下</div>' + socketRowHTML(chips, q.slots, 'data-unchip') +
      '<div class="cx-h" style="margin-top:8px;text-align:left">芯片盒 · 点一下镶嵌' + (chips.length >= q.slots ? '（插槽已满）' : '') + '</div>' + chipFilterBar(G.chipF.sock, 'sock') +
      '<div class="chip-grid">' + (cand.map(function (o) { return chipIco(o.c, 'data-chip="' + o.i + '"'); }).join('') || '<div class="hint" style="grid-column:1/-1">没有符合条件的芯片</div>') + '</div>' +
"""+s[j:]
rep("""    html += '<div class="cx-h" style="margin-top:8px;text-align:left">芯片槽 0/' + q.slots + '</div>' +
      '<div style="text-align:left;font-size:10px;color:#56606a">' + '◇'.repeat(q.slots) + ' · 装配后可镶嵌</div>' +""","""    html += '<div class="cx-h" style="margin-top:8px;text-align:left">芯片插槽 0/' + q.slots + ' · 装配后可镶嵌</div>' + socketRowHTML([], q.slots) +""")
rep("""  bindHub(); bindEquipList();
  overlay.classList.add('show');""","""  bindHub(); bindEquipList(); bindChipFilter(G.chipF, function () { renderCyberDetail(id); });
  overlay.classList.add('show');""")
# bag chips tab
i=s.index("    html += '<div class=\"bag-grid\">';\n    (G.chips || []).forEach(function (c, i) { html += '<div class=\"bag-it\"")
j=s.index("    html += '</div><div class=\"hint\">芯片放在芯片盒里",i)
s=s[:i]+"""    html += chipFilterBar(G.chipF.bag, 'bag') + '<div class="chip-grid">';
    (G.chips || []).map(function (c, i) { return { c: c, i: i }; }).filter(function (o) { return chipPass(o.c, G.chipF.bag); }).sort(function (a, b) { return Q_ORDER.indexOf(b.c.quality) - Q_ORDER.indexOf(a.c.quality); }).forEach(function (o) { html += chipIco(o.c, 'data-bchipd="' + o.i + '"'); });
    if (!(G.chips || []).length) html += '<div class="hint" style="grid-column:1/-1">芯片盒是空的</div>';
"""+s[j:]
rep("""  $$('[data-bchip]').forEach(function (b) {""","""  bindChipFilter(G.chipF, function () { openBag('chips'); });
  $$('[data-bchipd]').forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-bchipd'), c = G.chips[i]; if (!c) return; var back = function () { openBag('chips'); };
    var targets = CYBER_SLOTS.filter(function (sl) { var id = G.cyber[sl.id]; return id && (G.cyberChips[sl.id] || []).length < (QUALITY[MOD_BY[id].quality] || QUALITY.gray).slots; });
    chipDetail(c, { where: '芯片盒', modal: 'bag', back: back, actions: targets.map(function (sl) { return { label: '镶到' + sl.name, cls: 'ghost gold', fn: function () { G.chips.splice(G.chips.indexOf(c), 1); G.cyberChips[sl.id] = G.cyberChips[sl.id] || []; G.cyberChips[sl.id].push(c); recalc(); sfx.pick(); toast('已镶嵌 · ' + c.name, 'good'); back(); } }; }).concat([
      { label: c.locked ? '解锁' : '锁定', fn: function () { c.locked = !c.locked; b.onclick(); } },
      { label: '丢下', dis: !!c.locked, fn: function () { if (c.locked) return; G.chips.splice(G.chips.indexOf(c), 1); G.items.push({ x: p.x, y: p.y, chip: c, seed: Math.random() * TAU, _skipTurn: G.turn }); back(); } }]) }); }; });
  $$('[data-bchip]').forEach(function (b) {""")
open(p,'w',encoding='utf8').write(s)
print('ok')
