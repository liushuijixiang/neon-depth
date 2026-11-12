p='game.js';s=open(p,encoding='utf8').read()
if 'BAG_V2' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
# remove old openBag (from UX_V19) — replaced
i=s.index("/* ---------- 背包面板 ---------- */\nfunction dropToGround(obj) {")
j=s.index("function openBag() {",i); k=s.index("/* ---------- 委托保底：补怪 ---------- */",j)
s=s[:j]+s[k:]
mod=open('tools/bag2-module.js',encoding='utf8').read()
anchor="/* =========================================================\n   启动"
rep(anchor,mod+"\n\n"+anchor)
# capacity by weight
rep("function bagCap() { return 6 + Math.round(metaStatSum('bag')); }","function bagCap() { return 8 + Math.round(metaStatSum('bag')); }")
rep("function bagCount() { return bagItems().length + (G.chips || []).length; }","function bagCount() { return bagLoad(); }")
rep("function bagFull() { return G.mode === 'normal' && bagCount() >= bagCap(); }","function bagFull() { return G.mode === 'normal' && bagLoad() >= bagCap(); }")
rep('"name": "战术背包", "desc": "局内背包容量 +2", "max": 3, "stat": {"bag": 2}','"name": "战术背包", "desc": "局内背包负重 +3", "max": 3, "stat": {"bag": 3}')
# applyMod uses weight
rep("""  if (!free && bagFull()) {
    if (G.state === 'play' && G.map && !(G.items || []).some(function (it) { return it.mod === m; })) { dropToGround({ mod: m, inst: (G.inst || {})[m.id] }); toast('背包已满 · ' + m.name + ' 放在脚边', 'warn'); }
    else toast('背包已满（' + bagCount() + '/' + bagCap() + '）', 'bad');
    return false;
  }""","""  if (!free && !bagFits(m.id)) {
    if (G.state === 'play' && G.map && !(G.items || []).some(function (it) { return it.mod === m; })) { instOf(m.id); var dInst = G.inst[m.id]; delete G.inst[m.id]; dropToGround({ mod: m, inst: dInst }); toast('背包放不下 · ' + m.name + ' 放在脚边', 'warn'); }
    else toast('背包放不下（' + bagLoad() + '/' + bagCap() + '）', 'bad');
    return false;
  }""")
# ground pickup of mods: prompt when full
rep("""      if (it.inst) { G.inst = G.inst || {}; G.inst[it.mod.id] = it.inst; }
      if (applyMod(it.mod) === false)""","""      if (it._skipTurn === G.turn) continue;
      if (G.mode === 'normal' && !(it.mod.cls && it.mod.cls !== classDef().id) && !slotPriority(it.mod).some(function (x) { return !G.cyber[x]; }) && !bagFits(it.mod.id)) { fullPickupScreen(it); return; }
      if (it.inst) { G.inst = G.inst || {}; G.inst[it.mod.id] = it.inst; }
      if (applyMod(it.mod) === false)""")
rep("""      if (G.inv.length >= 4 && G.mode === 'normal') {
        if (!it.warned) { queueSwap(it.cons, it); maybeShowSwap(); }
        continue;
      }""","""      if (G.inv.length >= 4 && G.mode === 'normal') {
        if (it._skipTurn !== G.turn) { it._skipTurn = G.turn; queueSwap(it.cons, it); maybeShowSwap(); }
        continue;
      }""")
rep("""    if (job.ground) job.ground.warned = true; else {""","""    if (job.ground) job.ground._skipTurn = G.turn; else {""")
# chips never auto-dissolve / never blocked
rep("""      if (bagFull()) { G.items.splice(i, 0, it); if (!it.warned) { it.warned = true; toast('背包已满 · 芯片留在地上', 'warn'); } continue; }\n""","""      if (it._skipTurn === G.turn) { G.items.splice(i, 0, it); continue; }\n""")
rep("""  else if (bagFull() && G.state === 'play' && G.map) { dropToGround({ chip: c }); toast('背包已满 · 芯片放在脚边', 'warn'); }\n""","")
# unequip settles bag
rep("""  applyModStats(m, -1);
  recalc();
  if (G.modal === 'cyber') openCyber();
}""","""  applyModStats(m, -1);
  recalc();
  G._justOff = id; if (!G._installing) bagSettle();
  if (G.modal === 'cyber') openCyber();
}""")
rep("""  if (G.cyber[slot]) unequipCyber(slot);
  G.cyber[slot] = id;
  G.mods[id] = 1;""","""  G._installing = true; if (G.cyber[slot]) unequipCyber(slot); G._installing = false;
  G.cyber[slot] = id;
  G.mods[id] = 1;
  if (G.modBag.indexOf(id) < 0) G.modBag.push(id);
  bagSettle();""")
# reforge: avoid settle dropping the reforged part
rep("  var nm = pick(exact), chips = (G.cyberChips[slot] || []).slice();\n  unequipCyber(slot);","  var nm = pick(exact), chips = (G.cyberChips[slot] || []).slice();\n  G._installing = true; unequipCyber(slot); G._installing = false; G._justOff = null;")
# durability bars
rep("""(m ? modName(m.id) : '空槽') + (m && instBroken(m.id) ? ' ⚠' : '') + '</div>' +""","""(m ? modName(m.id) : '空槽') + (m && instBroken(m.id) ? ' ⚠' : '') + '</div>' + (m ? durBar(m.id) : '') +""")
rep("""    '<div class="sub">' + q.name + '品质 · ' + (SLOT_LABEL[m.slot] || m.slot) + ' · 负载 ' + instLoad(m.id) + ' · ' + instTag(m.id) + (slot ?""","""    durBar(m.id, true) + '<div class="sub">' + q.name + '品质 · ' + (SLOT_LABEL[m.slot] || m.slot) + ' · 负载 ' + instLoad(m.id) + ' · 重量 ' + modWeight(m.id) + (slot ?""")
rep("""'</b><small>耐久 ' + Math.max(0, si.dur) + '/' + si.maxDur + ' · 负载 '""","""'</b>' + durBarOf(si, true) + '<small>负载 '""")
rep("""'</small><small>' + econEsc(r.tag) + '</small><span>' + r.value + '</span></div>';""","""'</small>' + (r.inst ? durBarOf(r.inst) : '') + '<span>' + r.value + '</span></div>';""")
rep("report.cyber.push({ id: id, name: modName(id), quality: MOD_BY[id].quality, slot: slot, chips: chips.length, value: v, tag: instTag(id) });","report.cyber.push({ id: id, name: modName(id), quality: MOD_BY[id].quality, slot: slot, chips: chips.length, value: v, tag: instTag(id), inst: MOD_BY[id].relic ? null : it });")
rep("""    if (it.dur < it.maxDur) { var rc = repairCost(it, m); html += siteRow({ name: '修复 · ' + modName(id), tag: '耐久 ' + it.dur + ' → ' + it.maxDur,""","""    if (it.dur < it.maxDur) { var rc = repairCost(it, m); html += siteRow({ name: '修复 · ' + modName(id), tag: '耐久 ' + Math.max(0, it.dur) + ' → ' + it.maxDur,""")
# HUD chip label
rep("bagEl.textContent = '包 ' + bagCount() + '/' + bagCap();","bagEl.textContent = '背包 ' + bagLoad() + '/' + bagCap();")
# events & contracts only from fixer
rep("  placeNpcSite(depth, sites);\n","  placeNpcSite(depth, sites);\n  placeEventSite(depth, sites);\n")
rep("  else if (s.type === 'npc') openNpc(s);","  else if (s.type === 'npc') openNpc(s);\n  else if (s.type === 'event') openEvent(s);")
rep("  if (G.depth % 5 === 1 && G.mode === 'normal') G.pendingBoard = { offers: contractOffers(),","  if (false) G.pendingBoard = { offers: contractOffers(),")
rep("  if (zf === 2 && !G.zoneShop[zone]) forced.push('shop');","  if (zf === 2 && !G.zoneShop[zone]) forced.push('shop');\n  if (G.mode === 'normal' && (zf === 0 || zf === 3)) forced.push('fixer');")
rep("['fixer', depth >= 2 ? 7 : 0]]","['fixer', 10]]")
rep("  G.npcSeen = []; G.swapQueue = [];","  G.npcSeen = []; G.evSeen = []; G.swapQueue = [];")
# codex chip help
rep("""      return cxLine(c.name, '主词条 +' + fmt(c.stat, v), []);""","""      return cxLine(c.name, '主词条 +' + fmt(c.stat, v), [CHIP_HELP[c.stat] || '']);""")
rep("""  html += det('芯片图鉴', 6, chipBody);""","""  var helpBody = CHIPS.map(function (c) { return cxLine(c.name, CHIP_LABEL[c.stat] || c.stat, [CHIP_HELP[c.stat] || '']); }).join('') +
    cxLine('芯片负载', '规则', ['每枚芯片按品质占一点义体负载（灰绿 1、蓝紫 2、橙红 3，各减半向上取整）。从赛博精神病身上拆下的「重改」芯片额外占负载。']) +
    cxLine('芯片槽', '规则', ['义体品质决定芯片槽数：灰 1、绿 2、蓝紫 3、橙红 4。芯片放在芯片盒里不占背包，镶到义体上才生效。']);
  html += det('芯片图鉴', CHIPS.length, det('词条说明', CHIPS.length, helpBody) + chipBody);""")
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
css='''
/* BAG_V2 */
.durbar{display:block;position:relative;height:3px;margin:3px 0 2px;background:rgba(255,255,255,.08);overflow:hidden}
.durbar i{display:block;height:100%;transition:width .3s}
.durbar.big{height:14px;margin:6px 0;border:1px solid rgba(255,255,255,.12)}
.durbar.big b{position:absolute;inset:0;font-size:9px;line-height:12px;text-align:center;color:#fff;font-weight:600;text-shadow:0 0 3px #000,0 0 3px #000}
.bag-cap{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;color:#cfe8ff;margin-top:6px}
.bag-cap b{color:#ffd166;font-size:16px}.bag-cap small{font-size:8px;color:#6f8a99}
.bag-bar{display:flex!important;gap:2px;height:8px!important;background:none!important;margin:5px 0 8px!important}
.bag-bar u{flex:1;display:block;background:rgba(255,255,255,.08);transform:skewX(-18deg)}.bag-bar u.on{background:linear-gradient(180deg,#ffe48a,#ffb347);box-shadow:0 0 4px #ffb347}
.bag-it .wt{position:absolute;right:5px;top:4px;font-size:8px;color:#ffd166;border:1px solid rgba(255,209,102,.4);padding:0 4px}
.bag-it.worn{opacity:.85;border-style:dashed}
.bag-it b{padding-right:30px}
.card.bagfull{--acc:#ff9f43}
.ev-opts{display:flex;gap:8px;margin-top:12px}.ev-opts .kbtn{min-height:44px;text-align:center}
.bslot .durbar{margin:2px 4px 0}
'''
s=s.replace('</style>\n</head>',css+'</style>\n</head>'); open(p,'w',encoding='utf8').write(s)
print('bag2 patch applied')
