import re
p='game.js';s=open(p,encoding='utf8').read()
if 'V36 ·' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:110]))
    s=s.replace(a,b)
# remove old autoLoadout (v34)
i=s.index("/* ---------- 一键配装 ---------- */\nfunction autoLoadout() {"); j=s.index("/* ---------- 老韩 ---------- */",i)
s=s[:i]+s[j:]
anchor="/* =========================================================\n   启动"
rep(anchor,open('tools/v36-module.js',encoding='utf8').read()+"\n\n"+anchor)
# skin hook
rep("      desc.set.call(this, v);\n","      desc.set.call(this, v);\n      if (typeof m3Skin === 'function') m3Skin();\n")
rep("function hideOverlay() {","function hideOverlay() {\n  setTimeout(function () { if (typeof m3Skin === 'function') m3Skin(); }, 0);")
# menu3: use shared bg
s=s.replace("<canvas class=\"m3-bg\"></canvas><div class=\"m3-shade\"></div>","<div class=\"m3-shade\"></div>")
s=s.replace("  mnBgStart(overlay.querySelector('.m3-bg'), cls.color);\n","  m3Skin();\n")
# depart hero
i=s.index("function mnDepart() {"); j=s.index("\n}\n",i)+3
s=s[:i]+"""function mnDepart() {
  var cls = classDef(), sv = savedRun(), h = '';
  if (sv) {
    var sc = CLASS_BY[sv.cls] || cls, title = mnStoryTitle(sc.id);
    h += '<section class="m3-hero face" style="--mc:' + sc.color + '"><div class="m3-portrait">' + (MN_FACE[sc.id] || '') + '<i class="scan"></i></div>' +
      '<div class="m3-persona"><small>上一次断在这里</small><b>' + econEsc(title || sc.name) + '</b><span>' + sc.name + ' · B' + sv.depth + 'F</span></div></section>';
    h += '<button class="m3-cta" id="menuContinue" style="--mc:' + sc.color + '"><span>继续深潜</span><small>' + econEsc(saveSummary(sv)) + '</small><i>' + MN_ICON.go + '</i></button><button class="m3-sub" id="menuNew">开始新的深潜</button>';
  } else {
    h += '<section class="m3-hero logo"><div class="m3-logobox">' + MN_LOGO + '</div><div class="m3-bigtitle"><b data-t="NEON DEPTH">NEON DEPTH</b><span>霓 虹 深 潜</span></div></section>';
    h += '<button class="m3-cta" id="actionBtn"><span>开始深潜</span><small>模式 · 人格 · 战备</small><i>' + MN_ICON.go + '</i></button>';
  }
  h += '<div class="m3-stats"><div><small>最深</small><b>B' + mnBest() + 'F</b></div><div><small>撤离</small><b>' + (cum.wins || 0) + '</b></div><div><small>通关</small><b>' + (META.cleared || 0) + '</b></div><div><small>挑战</small><b>' + (G.chalSel || []).length + '</b></div></div>';
  var line = typeof hanLine === 'function' ? hanLine() : '';
  if (b16Open() && !META.cleared) line = '主线拼齐了。B15 那个守卫脚下有风，你下去看看。';
  if (line) h += '<div class="m3-quote"><i>' + MN_ICON.bar + '</i><p><b>老韩</b>' + econEsc(line) + '</p></div>';
  return h;
}
"""+s[j:]
# menuScreen mnact resets return
rep("      var a = b.getAttribute('data-mnact'); sfx.step();\n      if (a.indexOf('market:') === 0)","      var a = b.getAttribute('data-mnact'); sfx.step(); G._menuRet = null;\n      if (a.indexOf('market:') === 0)")
# flow: chal chip in normal mode card, return stack
rep("""      return '<button class="m3-mode" data-mode="' + m[0] + '" style="--tc:' + m[4] + '"><div class="art">' + MN_MODE_ART[m[0]] + '</div><div class="tx"><b>' + m[1] + '</b><small>' + m[2] + '</small><span>' + m[3].map(function (t) { return '<em>' + t + '</em>'; }).join('') + '</span></div><i>' + MN_ICON.go + '</i></button>'; }).join('') + '</div>';""",
"""      var cm = challengeMods(), chal = m[0] === 'normal' ? '<span class="m3-chalchip" data-flowchal="1"><b>挑战树</b> ' + (G.chalSel || []).length + ' 项 · +' + cm.score + '%</span>' : '';
      return '<div class="m3-mode" role="button" tabindex="0" data-mode="' + m[0] + '" style="--tc:' + m[4] + '"><div class="art">' + MN_MODE_ART[m[0]] + '</div><div class="tx"><b>' + m[1] + '</b><small>' + m[2] + '</small><span>' + m[3].map(function (t) { return '<em>' + t + '</em>'; }).join('') + '</span>' + chal + '</div><i>' + MN_ICON.go + '</i></div>'; }).join('') + '</div>';""")
rep("""  $$('[data-mode]').forEach(function (b) {
    b.onclick = function () {
      var m = b.getAttribute('data-mode'); sfx.step();
      if (m === 'normal') { G._flowMode = 'normal'; startFlow(2); }
      else if (m === 'rush') { G._flowMode = null; rushPrepScreen(); }
      else if (m === 'train') { G._flowMode = 'train'; startFlow(2); }
      else if (m === 'dream') { G._flowMode = null; G.navTab = 'ember'; dreamShelf(); }
    };
  });""","""  $$('[data-flowchal]').forEach(function (b) { b.onclick = function (ev) { ev.stopPropagation(); sfx.step(); G._chalFromFlow = 'mode'; challengeScreen(); }; });
  $$('[data-mode]').forEach(function (b) {
    b.onclick = function () {
      var m = b.getAttribute('data-mode'); sfx.step();
      if (m === 'normal') { G._flowMode = 'normal'; startFlow(2); }
      else if (m === 'rush') { G._flowMode = null; G._menuRet = function () { startFlow(1); }; rushPrepScreen(); }
      else if (m === 'train') { G._flowMode = 'train'; startFlow(2); }
      else if (m === 'dream') { G._flowMode = null; G._menuRet = function () { startFlow(1); }; dreamShelf(); }
    };
  });""")
# prep: no chal button, gauge at top, roll all slots
rep("    var flowbar = flow ? menuStepper(3, '战备', '<button class=\"m3-chalbtn\" id=\"prepChal\">挑战树 ' + (G.chalSel.length || 0) + '</button>') : '';","    var flowbar = flow ? menuStepper(3, '战备', '<span style=\"width:32px\"></span>') : '';")
rep("lockTxt +\n      '<div class=\"cx-h\" style=\"margin-top:10px\">义体</div>';","'%%PGAUGE%%' + lockTxt +\n      '<div class=\"cx-h\" style=\"margin-top:10px\">初始义体 · 选 ' + picks + ' 件</div>';")
i=s.index("    html += '<div class=\"prep-adapt'"); j=s.index("\n",i)
s=s[:i]+"    html = html.replace('%%PGAUGE%%', prepGaugeHTML(pload, pcap));"+s[j:]
rep("    var empty = shuffle(CYBER_SLOTS.filter(function (s) { return !G.cyber[s.id]; }).map(function (s) { return s.id; }));","    var empty = shuffle(CYBER_SLOTS.map(function (s) { return s.id; }));")
# back handlers
for a,b in [("  $('#marketBack').onclick = menuScreen;","  $('#marketBack').onclick = menuBack;"),
            ("  $('#shopBack').onclick = menuScreen;","  $('#shopBack').onclick = menuBack;"),
            ("  $('#backMenu').onclick = function () { G._metaResetArm = false; menuScreen(); };","  $('#backMenu').onclick = function () { G._metaResetArm = false; menuBack(); };"),
            ("    $('#rushBack').onclick = menuScreen;","    $('#rushBack').onclick = menuBack;"),
            ("  $('#marketBack').onclick = function () { menuScreen(); };","  $('#marketBack').onclick = function () { menuBack(); };"),
            ("  $('#docBack').onclick = function () { menuScreen(); };","  $('#docBack').onclick = function () { menuBack(); };")]:
    rep(a,b)
s=s.replace("  $('#backMenu').onclick = menuScreen;","  $('#backMenu').onclick = menuBack;")
rep("""  $('#chalStart').onclick = function () {
    if (G._chalFromFlow) { G._chalFromFlow = false; startFlow(3); return; }""","""  $('#chalStart').onclick = function () {
    if (G._chalFromFlow === 'mode') { G._chalFromFlow = false; G._flowMode = 'normal'; startFlow(2); return; }
    if (G._chalFromFlow) { G._chalFromFlow = false; startFlow(3); return; }""")
rep("""  $('#chalBack').onclick = function () {
    if (G._chalFromFlow) { G._chalFromFlow = false; startFlow(3); return; }""","""  $('#chalBack').onclick = function () {
    if (G._chalFromFlow === 'mode') { G._chalFromFlow = false; startFlow(1); return; }
    if (G._chalFromFlow) { G._chalFromFlow = false; startFlow(3); return; }""")
# challenge count bug: sanitize selection
rep("function challengeScreen() {\n","function challengeScreen() {\n  G.chalSel = chalSanitize(G.chalSel);\n")
rep("function challengeMods() {","function chalSanitize(sel) {\n  var out = (sel || []).filter(function (id, i, a) { return a.indexOf(id) === i && CHALLENGES.some(function (c) { return c.id === id; }); });\n  for (var t = 2; t <= 9; t++) out = out.filter(function (cid) { var cc = CHALLENGES.find(function (x) { return x.id === cid; }); if (cc.tier !== t) return true; return CHALLENGES.some(function (pp) { return pp.tier === t - 1 && out.indexOf(pp.id) >= 0; }); });\n  return out;\n}\nfunction challengeMods() {\n  G.chalSel = chalSanitize(G.chalSel);")
# autofit button
rep("var af = $('#autoFit'); if (af) af.onclick = function () { autoLoadout(); renderCyber(); };","var af = $('#autoFit'); if (af) af.onclick = function () { if (autoLoadout() !== 'ask') renderCyber(); };")
# meta pour instant
rep("""    btn && (btn._settled = true);
    setTimeout(function () { showMeta(); }, VFX.reduced ? 0 : 700);
    return 'up';""","""    refreshMetaNodes();
    setTimeout(function () { if (!btn) return; btn.querySelectorAll('.lvtxt').forEach(function (t) { t.remove(); }); }, 700);
    return 'up';""")
rep("var r0 = pourMeta(id, btn); if (r0 !== 'more') { if (r0 === 'up') btn.classList.remove('pouring'); return; } timer = setInterval(function () { var r = pourMeta(id, btn); if (r !== 'more') { clearInterval(timer); timer = null; if (r === 'up') btn.classList.remove('pouring'); } }, 110); });",
    "var r0 = pourMeta(id, btn); if (r0 === 'stop') { btn.classList.remove('pouring'); return; } timer = setInterval(function () { var r = pourMeta(id, btn); if (r === 'stop') { clearInterval(timer); timer = null; btn.classList.remove('pouring'); refreshMetaNodes(); } }, 110); });")
rep("    var have = META.pour[id] || 0; if (have <= 0) { META.pour[id] = 0; saveMeta(); if (btn) {","    var have = META.pour[id] || 0; if (have <= 0) { META.pour[id] = 0; saveMeta(); refreshMetaNodes(); if (btn) {")
# guidance
rep("  var html = (G.quests || []).filter(function (c) { return c.def && (!c.done && !c.failed || G.turn - (c.endTurn || 0) <= 6); }).map(contractLineHTML).join('');","  var html = objectiveLines() + (G.quests || []).filter(function (c) { return c.def && (!c.done && !c.failed || G.turn - (c.endTurn || 0) <= 6); }).map(contractLineHTML).join('');")
rep("function renderQuests() {\n  if (G.state !== 'play' || G.mode !== 'normal') { questTrack.innerHTML = ''; return; }","function renderQuests() {\n  if (G.state !== 'play' || (G.mode !== 'normal' && !(G.mode === 'dream' && G.b16))) { questTrack.innerHTML = ''; return; }")
rep("function drawMinimapEcon(x, y, tw, th) {\n","function drawMinimapEcon(x, y, tw, th) {\n  drawObjectiveMarks(x, y, tw, th);\n")
# finale: thanks + legend + red bar
rep("""      G.b16 = null; G.extract = true; G.depth = 16;
      win();""","""      G.b16 = null; G.extract = true; G.depth = 16;
      ST.legends.push({ title: '收工 · 三个人', text: '哑火、铅垂、白噪，三个人从同一口井里爬上来，在吧台前坐了一排。老韩倒了三杯红的，没收钱。', meta: '通关 · ' + new Date().toLocaleDateString(), drink: '三杯', drinkDesc: '老韩请的，红的。喝完那口井就不再往下长了。', red: true });
      if (ST.legends.length > 30) ST.legends.shift(); storySave();
      thanksScreen(function () { win(); });""")
rep("tag: '传说特调 · ' + DRINK_BUFF.legend, desc: L.drinkDesc, color: '#fcee0a'","tag: (L.red ? '通关特调 · ' : '传说特调 · ') + DRINK_BUFF.legend, desc: L.drinkDesc, color: L.red ? '#ff365c' : '#fcee0a'")
rep("  var html = '<div class=\"card site bar\" style=\"--site:#ff7a45\"><div class=\"sign\"><i>烬</i></div>","  var barCol = META.cleared ? '#ff365c' : '#ff7a45';\n  var html = '<div class=\"card site bar' + (META.cleared ? ' cleared' : '') + '\" style=\"--site:' + barCol + '\"><div class=\"sign\"><i>烬</i></div>")
rep("    META.myDream = META.lastClear || { cls: G.classId, lv: 20, cyber: {}, chips: {}, inst: {}, run: {} }; META.cores += 10000; saveMeta();","    META.myDream = META.lastClear || { cls: G.classId, lv: 20, cyber: {}, chips: {}, inst: {}, run: {} }; META.cores += 10000; saveMeta();\n    ST.dreams.bd_mine = ST.dreams.bd_mine || Date.now(); storySave();")
# rush tickets: fill chips
rep("      G.rushPending = { cyber: ids, stashItems: pickedItems };","      G.rushPending = { cyber: ids, stashItems: pickedItems, ticket: selTicket || null };")
rep("  sel.forEach(function (id) { if (MOD_BY[id]) applyMod(MOD_BY[id]); });\n","  sel.forEach(function (id) { if (MOD_BY[id]) applyMod(MOD_BY[id]); });\n  if (pend.ticket) { var TK = TICKETS.find(function (x) { return x.id === pend.ticket; }); if (TK) { hideOverlay(); kitFillChips(TK.items.filter(function (id) { return cyberInstalledSlot(id); }), TK.quality, { assault: 'kharon', survive: 'dome', hunt: 'mobius' }[TK.theme] || 'kharon', true); } }\n")
rep("function kitFillChips(ids, q, theme) {\n  var T = TRIAL_CHIPS[theme] || TRIAL_CHIPS.kharon, corp = TRIAL_CHIPS[theme] ? theme : null,","function kitFillChips(ids, q, theme, noCorp) {\n  var T = TRIAL_CHIPS[theme] || TRIAL_CHIPS.kharon, corp = TRIAL_CHIPS[theme] && !noCorp ? theme : null,")
rep("'<div class=\"cx-h\" style=\"text-align:left\">券内义体 · 8 件</div><div class=\"treebox tkt-items\">';","'<div class=\"hint\" style=\"text-align:left\">入场时 8 件全部装上、芯片插满：适应度不够先插兼容芯片补齐，够了再插本系芯片。</div><div class=\"cx-h\" style=\"text-align:left\">券内义体 · 8 件</div><div class=\"tkt-items\">';")
# B16 fixed boss base per corp
rep("  var C = FIN.campaigns[corp], bspec = pick((EXT_BOSSES.length ? EXT_BOSSES : BOSSES).filter(function (b) { return b.tier === 3; }));","  var C = FIN.campaigns[corp], bspec = b16BaseSpec(corp);")
rep("var B16_ORDER = ['kharon', 'dome', 'mobius'];","var B16_ORDER = ['kharon', 'dome', 'mobius'];\nfunction b16BaseSpec(corp) { var t3 = (EXT_BOSSES.length ? EXT_BOSSES : BOSSES).filter(function (b) { return b.tier === 3; }); return t3[B16_ORDER.indexOf(corp) % t3.length]; }")
# codex: exclude corp units from zone sections, add corp + B16 sections
rep("    var ms = MONSTERS.filter(function (m) { return !m.boss && stageOf(m.minDepth || 1) === st; });","    var ms = MONSTERS.filter(function (m) { return !m.boss && !m.corpUnit && stageOf(m.minDepth || 1) === st; });")
rep("  html += det('公司要员', vipN + '/' + vipT, vipRows);","""  var cu = MONSTERS.filter(function (m) { return m.corpUnit && m.id !== 'b16_clone'; });
  html += det('公司武装', cu.filter(function (m) { return seenM[m.id]; }).length + '/' + cu.length, '<div class="mgrid">' + cu.map(function (m) { return codexPortraitCard(m, !!seenM[m.id], false); }).join('') + '</div>');
  html += det('公司要员', vipN + '/' + vipT, vipRows);""")
i=s.index("  if (b16Open() || (G.codex.b16 && Object.keys(G.codex.b16).length)) { var bb = G.codex.b16 || {}, b16Rows"); j=s.index("\n",s.index("html += det('B16 守卫'",i))
s=s[:i]+"""  var bb = G.codex.b16 || {}, clone = MONSTERS.find(function (m) { return m.id === 'b16_clone'; });
  var b16Cards = (clone ? codexPortraitCard(clone, !!seenM.b16_clone, false) : '') + B16_ORDER.map(function (k) { var C = FIN.campaigns[k], base = b16BaseSpec(k); if (!base) return ''; var spec = Object.assign({}, base, { name: C.boss.name, color: CORPS[k].color, tacticName: C.boss.title, desc: C.boss.lore }); return codexPortraitCard(spec, !!bb[k], true, { hp: Math.round(base.hp * (1 + 15 * .24) * 4.5 * 1.25), atk: Math.round((base.atk + 8) * 1.75 * 1.15), lines: ['「' + C.boss.intro + '」', C.boss.lore, C.base] }); }).join('');
  html += det('B16 · 生产层', (seenM.b16_clone ? 1 : 0) + Object.keys(bb).length + '/4', '<div class="mgrid bossgrid">' + b16Cards + '</div>');"""+s[j:]
open(p,'w',encoding='utf8').write(s)
print('v36 applied')
