import re
p='game.js';s=open(p,encoding='utf8').read()
if 'V22C ·' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
mod=open('tools/v22c-module.js',encoding='utf8').read()
anchor="/* =========================================================\n   启动"
rep(anchor,mod+"\n\n"+anchor)
# boss floor generalisation
n1=s.count("G.depth % 5 === 0"); n2=len(re.findall(r"(?<![\w.])depth % 5 === 0",s))
s=s.replace("G.depth % 5 === 0","isBossFloor(G.depth)")
s=re.sub(r"(?<![\w.])depth % 5 === 0","isBossFloor(depth)",s)
s=s.replace("function isBossFloor(d) { return d % 5 === 0 || d === 16; }","function isBossFloor(d) { return d % 5 === 0 || d === 16; }")
print('replaced',n1,n2)
rep("function stageOf(depth) { return Math.ceil(depth / 5); }","function stageOf(depth) { return Math.min(3, Math.ceil(depth / 5)); }")
rep("function bossTierFor(depth) { return Math.ceil(depth / 5); }","function bossTierFor(depth) { return Math.min(3, Math.ceil(depth / 5)); }")
rep("  var hp = Math.round(spec.hp * (1 + (depth - 1) * 0.24) * (G.mode === 'rush' ? 10 : 4.5));","  var hp = Math.round(spec.hp * (1 + (depth - 1) * 0.24) * (G.mode === 'rush' ? 10 : 4.5) * (depth >= 16 ? 1.6 : 1));")
rep("  G.bossName = spec.name;","  G.bossName = (depth >= 16 ? '源点·' : '') + spec.name;")
rep("var MAP_W = 44, MAP_H = 30, WALL = 1, FLOOR = 0, MAX_DEPTH = 15, TAU = Math.PI * 2;","var MAP_W = 44, MAP_H = 30, WALL = 1, FLOOR = 0, MAX_DEPTH = 15, TAU = Math.PI * 2, BASE_MAX_DEPTH = 15;")
rep("  G.mode = G.dreamPending ? 'dream' : G.trainPending ? 'train' : G.rushPending ? 'rush' : 'normal';","  G.mode = G.dreamPending ? 'dream' : G.trainPending ? 'train' : G.rushPending ? 'rush' : 'normal';\n  MAX_DEPTH = G.mode === 'normal' && META.b16 ? 16 : BASE_MAX_DEPTH; G.everEquipped = false; G.runPsycho = 0;")
# tracking
rep("  G.cyber[slot] = id;\n  G.mods[id] = 1;","  G.cyber[slot] = id;\n  G.mods[id] = 1;\n  if (G.mode === 'normal' && G.state === 'play') G.everEquipped = true;")
rep("  if (G.mode === 'normal') { cum.psychoTotal = (cum.psychoTotal || 0) + 1; }","  if (G.mode === 'normal') { cum.psychoTotal = (cum.psychoTotal || 0) + 1; G.runPsycho = (G.runPsycho || 0) + 1; }")
rep("  if (G.stats.healUsed === 0) cum.noHealWin++;","  if (G.stats.healUsed === 0) cum.noHealWin++;\n  hiddenAchCheckWin();")
rep("  if (type === 'psychoKills') return cum.psychoKills || 0;","""  if (type === 'psychoKills') return cum.psychoKills || 0;
  if (type === 'clsAllChal') return (cum.allChalWin || {})[a.cond.target] ? 1 : 0;
  if (type === 'allClsAllChal') return ['assault', 'engineer', 'ghost'].filter(function (k) { return (cum.allChalWin || {})[k]; }).length;
  if (type === 'nakedWin') return cum.nakedWin || 0;
  if (type === 'psychoWin') return cum.psychoWin || 0;
  if (type === 'speedWin') return cum.speedWin || 0;
  if (type === 'b16Win') return cum.b16Win || 0;""")
# achHTML hidden
rep("""    html += '<div class="ach ' + (on ? '' : 'off') + '"><span class="mk">' + (on ? '✓' : '·') + '</span>' +""","""    if (a.hidden && !on) { html += '<div class="ach off hid"><span class="mk">?</span><div><b>？？？ · 隐藏成就</b><em style="display:block;font-style:normal;color:#4f6370;font-size:10px">达成条件不明</em></div></div>'; return; }
    html += '<div class="ach ' + (on ? '' : 'off') + (a.hidden ? ' hidon' : '') + '"><span class="mk">' + (on ? '✓' : '·') + '</span>' +""")
# codex monsters & bosses as portrait grid
rep("""  var monRows = MONSTERS.map(function (m) {
    return cxLine(m.name, (m.tacticName || AI_LABEL[m.ai] || m.ai) + ' · HP ' + m.hp[0] + '-' + m.hp[1] + ' · ATK ' + m.atk[0] + '-' + m.atk[1], [m.desc, m.tacticHint || '']);
  }).join('');
  html += det('怪物图鉴', MONSTERS.length, monRows);""","""  var seenM = G.codex.monsters || {};
  [1, 2, 3].forEach(function (st) {
    var ms = MONSTERS.filter(function (m) { return !m.boss && stageOf(m.minDepth || 1) === st; });
    if (!ms.length) return;
    html += det('敌人 · ' + ZONE_NAME[st], ms.filter(function (m) { return seenM[m.id]; }).length + '/' + ms.length, '<div class="mgrid">' + ms.map(function (m) { return codexPortraitCard(m, !!seenM[m.id], false); }).join('') + '</div>');
  });
  var bl2 = EXT_BOSSES.length ? EXT_BOSSES : BOSSES;
  html += det('守卫', bl2.filter(function (b) { return seenM[b.id]; }).length + '/' + bl2.length, '<div class="mgrid">' + bl2.map(function (b) { return codexPortraitCard(b, !!seenM[b.id], true); }).join('') + '</div>');""")
# hook portraits into overlay setter
rep("      desc.set.call(this, v);\n      var nc = this.querySelector('.card');","      desc.set.call(this, v);\n      if (typeof v === 'string' && v.indexOf('data-mon=') >= 0) { var self = this; setTimeout(function () { drawCodexPortraits(self); }, 0); }\n      var nc = this.querySelector('.card');")
# balance: chips
rep("  { id: 'critdmg', name: '爆伤芯片', stat: 'critMult', val: 0.06 },","  { id: 'critdmg', name: '爆伤芯片', stat: 'critMult', val: 0.04 },")
rep("  { id: 'dodge', name: '闪避芯片', stat: 'dodge', val: 0.02 },","  { id: 'dodge', name: '闪避芯片', stat: 'dodge', val: 0.015 },")
rep("  { id: 'compat', name: '兼容芯片', stat: 'compat', val: 2 },","  { id: 'compat', name: '兼容芯片', stat: 'compat', val: 0.6 },")
rep("  { id: 'power', name: '功率芯片', stat: 'power', val: 0.06 },","  { id: 'power', name: '功率芯片', stat: 'power', val: 0.035 },")
# implant affixes
rep("  { stat: 'crit', lo: .02, hi: .05 }, { stat: 'dodge', lo: .02, hi: .04 }, { stat: 'critMult', lo: .08, hi: .2 },","  { stat: 'crit', lo: .015, hi: .035 }, { stat: 'dodge', lo: .01, hi: .025 }, { stat: 'critMult', lo: .05, hi: .12 },")
rep("  { stat: 'lifesteal', lo: .02, hi: .05 }, { stat: 'power', lo: .04, hi: .1 }, { stat: 'compat', lo: 1, hi: 2, int: 1 }","  { stat: 'lifesteal', lo: .01, hi: .03 }, { stat: 'power', lo: .03, hi: .06 }, { stat: 'compat', lo: 1, hi: 1, int: 1 }")
# drop rates: lower base, meta brings back
rep("    var dropChance = e.boss ? (0.5 + (G.dropBoss || 0)) : e.bounty ? 1 : e.elite ? (0.15 + (G.dropElite || 0)) : (0.02 + (G.dropNormal || 0));","    var dropChance = e.boss ? (0.3 + (G.dropBoss || 0)) : e.bounty ? 1 : e.elite ? (0.07 + (G.dropElite || 0)) : (0.008 + (G.dropNormal || 0));")
rep("""  var d = (G.depth || 1) + (bonus || 0);
  var total = 0;
  pool.forEach(function (m) { total += cyberWeight(m.quality, d); });""","""  var d = Math.max(1, (G.depth || 1) - 3 + (G.mode === 'normal' ? metaStatSum('dropQuality') * 30 : 3) + (bonus || 0) * 0);
  var total = 0;
  pool.forEach(function (m) { total += cyberWeight(m.quality, d); });""")
rep("  var W = { gray: 8, green: 7, blue: 5, purple: 3, orange: .9 + d * .06, red: .2 + d * .04 };","  var dq = Math.max(0, d - 3 + metaStatSum('dropQuality') * 30);\n  var W = { gray: 9, green: 7, blue: 4.5, purple: 2.4, orange: .6 + dq * .05, red: .1 + dq * .035 };")
rep('''"name": "拾荒者", "desc": '普通敌人义体掉率 +2%', "max": 2, "stat": {"dropNormal": 0.02}}''','''"name": "拾荒者", "desc": '普通敌人义体掉率 +0.6%', "max": 2, "stat": {"dropNormal": 0.006}}''')
rep('''"name": "猎杀者", "desc": "精英义体掉率 +5%", "max": 2, "stat": {"dropElite": 0.05}}''','''"name": "猎杀者", "desc": "精英义体掉率 +4%", "max": 2, "stat": {"dropElite": 0.04}}''')
rep('''"name": "品质嗅觉", "desc": '掉落义体品质小幅提升', "max": 2, "stat": {"dropQuality": 0.05}}''','''"name": "品质嗅觉", "desc": '掉落义体品质提升（每级相当于深 1.5 层）', "max": 2, "stat": {"dropQuality": 0.05}}''')
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
css='''
/* V22C 图鉴 */
.mgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;grid-column:1/-1}
.mcard{--mc:#9fe9ff;position:relative;font-family:inherit;padding:6px 4px 7px;text-align:center;color:#eaf6ff;border:1px solid color-mix(in srgb,var(--mc) 35%,transparent);background:linear-gradient(170deg,color-mix(in srgb,var(--mc) 10%,#0a1018),#06090e);border-radius:3px;min-width:0}
.mcard canvas{display:block;margin:0 auto 4px;border:1px solid rgba(120,160,190,.2)}
.mcard b{display:block;font-size:10px;color:var(--mc);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mcard small{display:block;font-size:8px;color:#7f9aab;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mcard .mst{display:flex;flex-wrap:wrap;justify-content:center;gap:2px;margin-top:3px}.mcard .mst i{font-style:normal;font-size:7px;padding:0 3px;border:1px solid rgba(255,255,255,.12);color:#cfe8ff}
.mcard em{display:none;font-style:normal;font-size:9px;line-height:1.5;color:#a9c3d1;text-align:left;margin-top:5px}.mcard em span{color:#ffd166}
.mcard.open{grid-column:span 3;text-align:left;display:grid;grid-template-columns:66px 1fr;gap:0 8px}.mcard.open canvas{grid-row:span 4;margin:0}.mcard.open em{display:block;grid-column:2}.mcard.open .mst{justify-content:flex-start}
.mcard.unseen{border-style:dashed;opacity:.7}.mcard.boss{border-width:2px}
.ach.hid{opacity:.5;border-style:dashed}.ach.hidon b{color:#fcee0a}
'''
s=s.replace('</style>\n</head>',css+'</style>\n</head>'); open(p,'w',encoding='utf8').write(s)
print('v22c applied')
