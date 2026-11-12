p='game.js';s=open(p,encoding='utf8').read()
if 'V22B ·' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
mod=open('tools/v22b-module.js',encoding='utf8').read()
anchor="/* =========================================================\n   启动"
rep(anchor,mod+"\n\n"+anchor)
# stash detail chips
i=s.index("      out += '<div class=\"cx-h\" style=\"margin-top:8px;text-align:left\">芯片槽 ' + schips.length + '/' + q.slots + '</div>' +")
j=s.index("      return out;\n    })() : '') +",i)
s=s[:i]+"""      out += '<div class="cx-h" style="margin-top:8px;text-align:left">芯片插槽 ' + schips.length + '/' + q.slots + ' · 点芯片取下 · ' + chipAggText(schips) + '</div>' + socketRowHTML(schips, q.slots, 'data-suchip') +
        '<div class="cx-h" style="margin-top:8px;text-align:left">仓库芯片 · 镶嵌到这件义体</div>' +
        chipListHTML(META.stash.chips.map(function (c, ci) { return { c: c, i: ci, dis: schips.length >= q.slots }; }), G.chipF.stashsock, 'stashsock', '镶嵌', 'data-schip', '仓库里没有符合条件的芯片');
"""+s[j:]
rep("    $$('[data-schip]').forEach(function (cb) { cb.onclick = function () {","    bindChipFilter(G.chipF, renderMarket);\n    $$('[data-schip]').forEach(function (cb) { cb.onclick = function () {")
# in-run cyber detail chip box -> rows
rep("""      '<div class="cx-h" style="margin-top:8px;text-align:left">芯片盒 · 点一下镶嵌' + (chips.length >= q.slots ? '（插槽已满）' : '') + '</div>' + chipFilterBar(G.chipF.sock, 'sock') +
      '<div class="chip-grid">' + (cand.map(function (o) { return chipIco(o.c, 'data-chip="' + o.i + '"'); }).join('') || '<div class="hint" style="grid-column:1/-1">没有符合条件的芯片</div>') + '</div>' +""","""      '<div class="cx-h" style="margin-top:8px;text-align:left">芯片盒 ' + G.chips.length + '/' + chipCap() + (chips.length >= q.slots ? ' · 插槽已满' : '') + '</div>' +
      chipListHTML(cand.map(function (o) { return { c: o.c, i: o.i, dis: chips.length >= q.slots }; }), G.chipF.sock, 'sock', '镶嵌', 'data-chip') +""")
# chip cap
rep("""    if (it.chip) {
      G.items.splice(i, 1);
      if (it._skipTurn === G.turn) { G.items.splice(i, 0, it); continue; }
      G.chips.push(it.chip); toast('拾取 · ' + it.chip.name + (it.chip.heavy ? '（重改 +' + it.chip.heavy + ' 负载）' : ''), 'good'); sfx.pick(); return;
    }""","""    if (it.chip) {
      if (it._skipTurn === G.turn) continue;
      if (chipsFull()) { it._skipTurn = G.turn; toast('芯片盒满了（' + G.chips.length + '/' + chipCap() + '）· 留在地上', 'warn'); continue; }
      G.items.splice(i, 1);
      G.chips.push(it.chip); toast('拾取 · ' + it.chip.name + (it.chip.heavy ? '（重改 +' + it.chip.heavy + ' 负载）' : ''), 'good'); sfx.pick(); continue;
    }""")
rep("""      G.items.splice(i, 1);
      burst(x, y, it.mod.color, 16);
      return;
    }""","""      G.items.splice(i, 1);
      burst(x, y, it.mod.color, 16);
      continue;
    }""")
rep("""  if (slot) { G.cyberChips[slot] = G.cyberChips[slot] || []; G.cyberChips[slot].push(c); }
  else G.chips.push(c);
}""","""  if (slot) { G.cyberChips[slot] = G.cyberChips[slot] || []; G.cyberChips[slot].push(c); }
  else if (chipsFull() && G.state === 'play' && G.map && p) { var sp = freeDropSpots(p.x, p.y, 1)[0]; G.items.push({ x: sp.x, y: sp.y, chip: c, seed: Math.random() * TAU, _skipTurn: G.turn }); toast('芯片盒满了 · ' + c.name + ' 放在旁边', 'warn'); }
  else G.chips.push(c);
}""")
# psycho drops scatter
rep("""    var spot = i === 0 ? { x: e.x, y: e.y } : (freeAdjacent(e.x, e.y) || { x: e.x, y: e.y });
    G.items.push({ x: spot.x, y: spot.y, mod: m, inst: inst, seed: Math.random() * TAU });""","""    var spot = freeDropSpots(e.x, e.y, 1)[0];
    G.items.push({ x: spot.x, y: spot.y, mod: m, inst: inst, seed: Math.random() * TAU });""")
rep("""  e.psycho.chips.forEach(function (c) { var spot = freeAdjacent(e.x, e.y) || { x: e.x, y: e.y }; G.items.push({ x: spot.x, y: spot.y, chip: c, seed: Math.random() * TAU }); });""","""  e.psycho.chips.forEach(function (c) { var spot = freeDropSpots(e.x, e.y, 1)[0]; G.items.push({ x: spot.x, y: spot.y, chip: c, seed: Math.random() * TAU }); });""")
rep("if (fr.length && Math.random() < .18) { var fm = pick(fr); G.items.push({ x: e.x, y: e.y, mod: fm, seed: 0 });","if (fr.length && Math.random() < .18) { var fm = pick(fr), fsp = freeDropSpots(e.x, e.y, 1)[0]; G.items.push({ x: fsp.x, y: fsp.y, mod: fm, seed: 0 });")
# bag chips tab header with cap
rep("""芯片盒 ' + (G.chips || []).length + '</button>""","""芯片盒 ' + (G.chips || []).length + '/' + chipCap() + '</button>""")
s=s.replace("芯片放在芯片盒里，不占背包，不会自动分解。镶嵌到义体后才生效。","芯片盒最多放 ' + chipCap() + ' 枚（养成「战术背包」可扩充），满了捡不起来。镶到义体上的不占位置。",1)
# shop bulk sell
rep("""    if (!bag.length && !(G.chips || []).length) html += '<div class="hint">背包里没有未装配的义体或芯片</div>';
    html += '</div>';""","""    if (!bag.length && !(G.chips || []).length) html += '<div class="hint">背包里没有未装配的义体或芯片</div>';
    html += '</div>';
    var bq = s.data.bulkQ || 'blue', bi = Q_ORDER.indexOf(bq), bm = bag.filter(function (id) { return Q_ORDER.indexOf(MOD_BY[id].quality) <= bi && !MOD_BY[id].relic; }), bc = (G.chips || []).filter(function (c) { return !c.locked && Q_ORDER.indexOf(c.quality) <= bi; });
    var bgain = bm.reduce(function (t, id) { return t + Math.round((RUN_CYBER_PRICE[MOD_BY[id].quality] || 20) * .4); }, 0) + bc.reduce(function (t, c) { return t + (CHIP_SELL[c.quality] || 3); }, 0);
    if (bag.length || (G.chips || []).length) html += '<div class="bulk"><span>批量回收 ≤</span>' + Q_NAMES.slice(1).map(function (x) { return '<button class="fpill' + (bq === x[0] ? ' on' : '') + '" data-shbq="' + x[0] + '" style="--pc:' + QUALITY[x[0]].color + '">' + x[1] + '</button>'; }).join('') +
      '<button class="sellall" id="shBulk"' + (bm.length + bc.length ? '' : ' disabled') + '>回收 义体 ' + bm.length + ' · 芯片 ' + bc.length + ' · +¥' + bgain + '</button></div>';""")
rep("""  $$('[data-sellp]').forEach(function (b) { b.onclick = function () {""","""  $$('[data-shbq]').forEach(function (b) { b.onclick = function () { s.data.bulkQ = b.getAttribute('data-shbq'); openShop(s, 'sell'); }; });
  var shb = $('#shBulk'); if (shb) shb.onclick = function () {
    if (!confirm2(shb)) return;
    var bq2 = Q_ORDER.indexOf(s.data.bulkQ || 'blue'), inst2 = Object.keys(G.cyber).map(function (k) { return G.cyber[k]; }), gain = 0, n = 0;
    G.modBag.filter(function (id) { var m = MOD_BY[id]; return m && inst2.indexOf(id) < 0 && !m.relic && Q_ORDER.indexOf(m.quality) <= bq2; }).forEach(function (id) { G.modBag.splice(G.modBag.indexOf(id), 1); delete G.cyberGrowth[id]; delete (G.inst || {})[id]; gain += Math.round((RUN_CYBER_PRICE[MOD_BY[id].quality] || 20) * .4); n++; });
    G.chips = G.chips.filter(function (c) { if (!c.locked && Q_ORDER.indexOf(c.quality) <= bq2) { gain += CHIP_SELL[c.quality] || 3; n++; return false; } return true; });
    gainCredits(gain, null, null, true); sfx.pick(); toast('回收 ' + n + ' 件 · +¥' + gain, 'good'); openShop(s, 'sell'); };
  $$('[data-sellp]').forEach(function (b) { b.onclick = function () {""")
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
css='''
/* V22B 芯片行 */
.srow.chiprow{align-items:center;gap:8px}
.srow.chiprow .chipico{flex:0 0 46px;width:46px;height:52px;pointer-events:none}
.srow.chiprow .chipico b{top:8px;width:22px;height:22px;line-height:20px;font-size:11px}.srow.chiprow .chipico span{bottom:9px;font-size:9px}.srow.chiprow .chipico em{bottom:3px}
.srow.chiprow .cmv{font-weight:400;color:#eaf6ff;font-size:11px;margin-left:4px}
.cafs{display:flex;flex-wrap:wrap;gap:3px 8px;margin-top:3px}
.caf2{--cq:#8aa0ad;font-size:10px;color:#cfe8ff;display:inline-flex;align-items:center;gap:3px}.caf2 i{font-style:normal;font-size:8px;padding:0 4px;background:var(--cq);color:#05070d}
.srow.chiprow.locked{box-shadow:inset 0 0 0 1px rgba(252,238,10,.35)}.lk{text-decoration:none;font-size:8px;background:#fcee0a;color:#05070d;padding:0 3px}
.chiplist{max-height:none!important}
'''
s=s.replace('</style>\n</head>',css+'</style>\n</head>'); open(p,'w',encoding='utf8').write(s)
print('v22b applied')
