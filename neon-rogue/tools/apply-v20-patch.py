p='game.js';s=open(p,encoding='utf8').read()
if 'V20 · 个人面板' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
mod=open('tools/v20-module.js',encoding='utf8').read()
anchor="/* =========================================================\n   启动"
rep(anchor,mod+"\n\n"+anchor)
# chips
rep("""  var val = chipRoll(b.stat, b.val, mult, false);
  var affixN = q === 'red' || q === 'orange' ? 2 : q === 'purple' || q === 'blue' ? 1 : 0;
  var affixes = [];
  var pool = CHIPS.filter(function (x) { return x.stat !== b.stat; });
  for (var i = 0; i < affixN; i++) {
    var a = pick(pool);
    var av = chipRoll(a.stat, a.val, mult, true);
    affixes.push({ id: a.id, name: a.name, stat: a.stat, val: av });
    pool = pool.filter(function (x) { return x.stat !== a.stat; });
  }""","""  var val = b.stat === 'skill' ? chipRoll(b.stat, b.val, mult, false) : (typeof chipJitter === 'function' ? chipJitter(b.stat, chipRoll(b.stat, b.val, mult, false)) : chipRoll(b.stat, b.val, mult, false));
  var affixes = typeof rollChipAffixes === 'function' ? rollChipAffixes({ quality: q, stat: b.stat }) : [];""")
rep("""  if (c.affixes && c.affixes.length) t += ' / ' + c.affixes.map(function (a) { return (CHIP_LABEL[a.stat] || a.name) + '+' + chipFmt(a.stat, a.val); }).join(' / ');""","""  if (c.affixes && c.affixes.length) t += ' / ' + c.affixes.map(function (a) { return (CHIP_LABEL[a.stat] || a.name) + '+' + chipFmt(a.stat, a.val) + (a.quality ? '·' + (QUALITY[a.quality] || QUALITY.gray).name : ''); }).join(' / ');""")
rep("""    G.credits -= pc; s.data.cuses++; var up = rerollChip(c); toast(up ? '洗练升阶 · ' + c.grade : '洗练完成', 'good'); sfx.pick(); openReforge(s, 'chip'); }; });""","""    chipForgeScreen(c, { cost: '¥' + pc, can: function () { return (G.credits || 0) >= econPrice(10 + 6 * s.data.cuses); }, pay: function () { G.credits -= econPrice(10 + 6 * s.data.cuses); s.data.cuses++; }, back: function () { openReforge(s, 'chip'); } }); }; });""")
s=s.replace("'重铸：25% 升阶 · 60% 同阶 · 15% 降阶。芯片尽量保留。'","'重铸义体：25% 升阶 · 60% 同阶 · 15% 降阶。洗练芯片：主词条不变，附加词条重新随机。'",1)
# enhance screens
i=s.index("  $$('[data-enh]').forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-enh')"); j=s.index("\n",i)
s=s[:i]+"""  $$('[data-enh]').forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-enh'), m = MOD_BY[id];
    enhanceScreen(id, instOf(id), { unit: '¥', cost: function (it) { return enhanceCost(it, m); }, can: function (it) { return (G.credits || 0) >= enhanceCost(it, m); }, pay: function (it) { G.credits -= enhanceCost(it, m); }, back: function () { openDoctor(s); } }); }; });"""+s[j:]
rep("    if (en && sit && sit.inst) en.onclick = function () { var c = enhanceCost(sit.inst, smod, true); if (META.cores < c) return; META.cores -= c; var ok = enhanceInst(sit.inst, smod); saveMeta(); toast(ok ? '强化成功 · +' + sit.inst.plus : '强化失败 · 耐久 -3', ok ? 'good' : 'bad'); if (ok) sfx.level(); else sfx.hurt(); renderMarket(); };",
    "    if (en && sit && sit.inst) en.onclick = function () { enhanceScreen(smod.id, sit.inst, { unit: '核心', cost: function (it) { return enhanceCost(it, smod, true); }, can: function (it) { return META.cores >= enhanceCost(it, smod, true); }, pay: function (it) { META.cores -= enhanceCost(it, smod, true); saveMeta(); }, back: function () { G.modal = null; renderMarket(); } }); };")
# hub integration
rep("""function renderCyber() {
  if (G.cyberItem) { renderCyberDetail(G.cyberItem); return; }""","""function renderCyber() {
  if (G.cyberItem) { renderCyberDetail(G.cyberItem); return; }
  if (G.cyberSlotPick) {
    var psl = CYBER_SLOTS.find(function (x) { return x.id === G.cyberSlotPick; });
    showModal('cyber'); G.paused = true;
    overlay.innerHTML = '<div class="card cyberpanel"><div class="kicker" style="color:#fcee0a">CHROME // 装配</div>' + hubBar('cyber') + '<h1 class="title small cyber-title">' + psl.name + ' · 空槽</h1>' + equipListHTML(psl.id, '点一件直接装上') + '<div class="dock"><button class="ghost" id="pickBack">返回</button></div></div>';
    bindHub(); bindEquipList(); $('#pickBack').onclick = function () { G.cyberSlotPick = null; renderCyber(); }; return;
  }""")
rep("""  if (id) { G.cyberItem = id; renderCyber(); return; }
  G.cyberItem = null;
  G.cyberTab = CYBER_SLOTS.find(function (x) { return x.id === slot; }).cat;
  renderCyber();""","""  if (id) { G.cyberItem = id; renderCyber(); return; }
  G.cyberItem = null; G.cyberSlotPick = slot;
  renderCyber();""")
rep("""  html += '<button class="cta" id="cyberClose" style="margin-top:8px">返回战斗</button></div>';
  overlay.innerHTML = html;""","""  html += '<div class="dock"><button class="cta" id="cyberClose">返回战斗</button></div></div>';
  overlay.innerHTML = html.replace('</div>' + cyberTabs(), '</div>' + cyberTabs()).replace(/(<div class="card cyberpanel"[^>]*>)/, '$1' + hubBar('cyber'));
  bindHub();""")
rep("""  html += '<button class="cta" id="cyberBack" style="margin-top:10px">返回</button><button class="ghost" id="cyberClose">关闭</button></div>';
  overlay.innerHTML = html;""","""  if (slot) html += equipListHTML(slot, '替换为（点一下直接换上）');
  html += '<div class="dock"><button class="ghost" id="cyberBack">返回</button><button class="cta" id="cyberClose">关闭</button></div></div>';
  overlay.innerHTML = html.replace(/(<div class="card cyberpanel"[^>]*>)/, '$1' + hubBar('cyber'));
  bindHub(); bindEquipList();""")
rep("""  var html = '<div class="card bagp"><div class="kicker">INVENTORY // 背包</div><h1 class="title small">背包</h1>' +""","""  G.hubTab = 'bag';
  var html = '<div class="card bagp"><div class="kicker">INVENTORY // 背包</div>' + hubBar('bag') +""")
rep("""  $('#bagClose').onclick = function () { hideOverlay(); updateHUD(); econResume(); };""","""  bindHub();
  $('#bagClose').onclick = function () { hideOverlay(); updateHUD(); econResume(); };""")
rep("  if (cyberBtn) cyberBtn.onclick = openCyber;","  if (cyberBtn) cyberBtn.onclick = function () { openHub(G.hubTab || 'cyber'); };")
rep("bagChip.onclick = function () { if (G.state === 'play' && !G.modal) openBag(); };","bagChip.onclick = function () { if (G.state === 'play' && !G.modal) openHub('bag'); };")
rep("function openCyber() {\n  if (psychoActive()) return;\n  if (G.state !== 'play') return;\n  G.cyberTab = 'map'; G.cyberItem = null;","function openCyber() {\n  if (psychoActive()) return;\n  if (G.state !== 'play') return;\n  G.cyberTab = 'map'; G.cyberItem = null; G.cyberSlotPick = null; G.hubTab = 'cyber';")
# bag weights & capacity
rep("function bagCap() { return 8 + Math.round(metaStatSum('bag')); }","function bagCap() { return 16 + Math.round(metaStatSum('bag')); }")
rep("function modWeight(id) { var m = MOD_BY[id]; if (!m) return 1; return m.relic ? 1 : (BAG_W[m.quality] || 1); }","function modWeight(id) { var m = MOD_BY[id]; if (!m) return 1; return m.relic ? 3 : (BAG_W[m.quality] || 1); }")
s=s.replace("灰绿 1 · 蓝紫 2 · 橙红 3 · 遗物 1 · 芯片不占位","灰绿 1 · 蓝紫 2 · 橙红 3 · 遗物 3 · 芯片不占位")
# drop rates
rep("""    { gray: 55, green: 30, blue: 12, purple: 3, orange: 0, red: 0 },
    { gray: 30, green: 35, blue: 25, purple: 8, orange: 2, red: 0 },
    { gray: 10, green: 20, blue: 30, purple: 28, orange: 10, red: 2 },
    { gray: 5, green: 10, blue: 25, purple: 32, orange: 22, red: 6 },
    { gray: 0, green: 5, blue: 15, purple: 25, orange: 35, red: 20 }""","""    { gray: 62, green: 30, blue: 7, purple: 1, orange: 0, red: 0 },
    { gray: 42, green: 36, blue: 18, purple: 4, orange: 0, red: 0 },
    { gray: 22, green: 34, blue: 30, purple: 11, orange: 3, red: 0 },
    { gray: 12, green: 26, blue: 32, purple: 21, orange: 7, red: 2 },
    { gray: 6, green: 18, blue: 30, purple: 28, orange: 13, red: 5 }""")
rep("  var W = { gray: 6, green: 6, blue: 6, purple: 6, orange: 2.6 + d * .12, red: .8 + d * .1 };","  var W = { gray: 8, green: 7, blue: 5, purple: 3, orange: .9 + d * .06, red: .2 + d * .04 };")
rep("    var c1 = rewardCyber(d >= 6 ? 'purple' : 'blue', []);","    var c1 = rewardCyber(d >= 8 ? 'blue' : 'green', [], d >= 8 ? 'purple' : 'blue');")
rep("    var e1 = rewardCyber('orange', []);","    var e1 = rewardCyber(d >= 10 ? 'purple' : 'blue', [], d >= 10 ? 'orange' : 'purple');")
rep("    var b1 = rewardCyber(d >= 10 ? 'orange' : 'purple', sig ? [sig.id] : []);\n    var b2 = rewardCyber(d >= 10 ? 'purple' : 'blue', (sig ? [sig.id] : []).concat(b1.id ? [b1.id] : []));",
    "    var b1 = rewardCyber(d >= 15 ? 'orange' : d >= 10 ? 'purple' : 'blue', sig ? [sig.id] : [], d >= 10 ? 'orange' : 'purple');\n    var b2 = rewardCyber(d >= 10 ? 'blue' : 'green', (sig ? [sig.id] : []).concat(b1.id ? [b1.id] : []), d >= 10 ? 'purple' : 'blue');")
rep("    if (Math.random() < (G.dropBoss || 0)) out.autos.push(rewardCyber('purple', [sig && sig.id, b1.id, b2.id]));","    if (Math.random() < (G.dropBoss || 0)) out.autos.push(rewardCyber('blue', [sig && sig.id, b1.id, b2.id], 'purple'));")
# mech upkeep
rep("function mechUpkeep(turn) { var t = turn || G.mech || 1; return 1 + Math.floor((t - 1) / 4) + (G.mechMods || []).length; }","function mechUpkeep(turn) { var t = turn || G.mech || 1; return 3 + Math.floor((t - 1) / 3) + (G.mechMods || []).length; }")
open(p,'w',encoding='utf8').write(s)
p='index.html';s=open(p,encoding='utf8').read()
css='''
/* V20 */
.hubbar{display:flex;gap:4px;margin:6px 0 8px;position:relative;z-index:3}
.hubtab{flex:1;font:inherit;font-size:12px;letter-spacing:.12em;padding:8px 4px;color:#8fb6cc;background:#0a1220;border:1px solid rgba(120,160,190,.25);border-bottom:2px solid transparent;clip-path:polygon(8px 0,100% 0,100% 100%,0 100%,0 8px)}
.hubtab.on{color:#fcee0a;border-color:rgba(252,238,10,.45);border-bottom-color:#fcee0a;background:linear-gradient(180deg,rgba(252,238,10,.14),rgba(252,238,10,.02));text-shadow:0 0 8px rgba(252,238,10,.5)}
.st-head{display:flex;justify-content:space-between;align-items:baseline;margin:4px 0}.st-head b{font-size:15px}.st-head span{font-size:10px;color:#8aa0ad}
.st-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}
.st-row{padding:6px 7px;background:rgba(10,18,28,.8);border:1px solid rgba(120,160,190,.16);text-align:left;min-width:0}
.st-row span{display:block;font-size:8px;color:#6f8a99;letter-spacing:.08em}.st-row b{display:block;font-size:13px;color:#eaf6ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.st-row small{display:block;font-size:8px;color:#5f7a88}
.st-list{display:grid;gap:4px}
.st-atk{display:grid;grid-template-columns:1fr auto;gap:0 8px;padding:6px 8px;text-align:left;border-left:2px solid #22e6ff;background:rgba(10,18,28,.8)}
.st-atk b{font-size:11px;color:#cfeeff}.st-atk span{font-size:13px;color:#fcee0a;text-align:right}.st-atk small{grid-column:1/-1;font-size:9px;color:#7f9aab}
.st-atk.bad{border-left-color:#ff4d5e}.st-atk.bad b{color:#ff9aa5}
.st-tags{display:flex;flex-wrap:wrap;gap:4px}.st-tag{font-size:10px;padding:3px 8px;border:1px solid;border-radius:2px}.st-tag i{font-style:normal;margin-left:5px;opacity:.7}
.st-tag.good{color:#57ffa8}.st-tag.bad{color:#ff6b7a}.st-tag.warn{color:#ffd166}
.eq-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.eq-card{font-family:inherit;text-align:left;padding:8px;border:1px solid color-mix(in srgb,var(--it) 45%,transparent);border-left:3px solid var(--it);background:#0a1018;color:#eaf6ff;min-width:0}
.eq-card b{display:block;font-size:11px;color:var(--it)}.eq-card small{display:block;font-size:8px;color:#8aa0ad}.eq-card em{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-style:normal;font-size:9px;color:#a9c3d1}
.eq-card:active{background:#16212b;transform:translateY(1px)}
/* 芯片卡 */
.chipcard{--cq:#9fe9ff;text-align:left;padding:9px 10px;border:1px solid var(--cq);background:linear-gradient(135deg,color-mix(in srgb,var(--cq) 16%,#070b12),#070b12 70%);box-shadow:0 0 16px color-mix(in srgb,var(--cq) 30%,transparent)}
.chipcard b{display:block;color:var(--cq);font-size:13px;margin-bottom:4px}.chipcard .cmain{display:block;font-size:12px;color:#fff;margin-bottom:4px}
.caf{--cq:#8aa0ad;display:flex;align-items:center;gap:6px;font-size:11px;color:#e6f2fa;padding:3px 0;border-top:1px dashed rgba(255,255,255,.08)}
.caf i{font-style:normal;font-size:8px;padding:1px 5px;color:#05070d;background:var(--cq);box-shadow:0 0 6px var(--cq)}
.caf.heavy{color:#ff9aa5}
/* 强化/重铸舞台 */
.card.forge{--acc:var(--fq)}
.forge-stage{--fq:#9fe9ff;position:relative;margin:10px auto;padding:14px 0;min-height:120px;display:flex;align-items:center;justify-content:center}
.forge-ring{position:absolute;width:150px;height:150px;border-radius:50%;border:2px solid color-mix(in srgb,var(--fq) 50%,transparent);box-shadow:0 0 30px color-mix(in srgb,var(--fq) 35%,transparent),inset 0 0 30px color-mix(in srgb,var(--fq) 25%,transparent);
  background:conic-gradient(var(--fq) calc(var(--rate,100) * 1%),transparent 0);-webkit-mask:radial-gradient(circle,transparent 66px,#000 67px);mask:radial-gradient(circle,transparent 66px,#000 67px)}
.forge-chip{position:relative;width:86%;z-index:2}
.forge-stage.spinning .forge-ring,.forge-stage.charging .forge-ring{animation:forgeSpin .5s linear infinite;filter:brightness(1.6)}
.forge-stage.spinning .chipcard{animation:hudGlitch .3s steps(1) infinite}
@keyframes forgeSpin{to{transform:rotate(360deg)}}
.forge-stage.done .forge-ring,.forge-stage.success .forge-ring{animation:forgeBurst .7s ease-out;--fq:#fcee0a}
.forge-stage.fail .forge-ring{--fq:#ff4d5e;animation:forgeCrack .5s steps(2) 2}
@keyframes forgeBurst{0%{transform:scale(.8);filter:brightness(3)}60%{transform:scale(1.15)}100%{transform:none}}
@keyframes forgeCrack{50%{transform:scale(.95) rotate(4deg);filter:hue-rotate(-30deg) brightness(1.8)}}
.forge-cmp{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;text-align:left}.forge-cmp>div{padding:6px;border:1px solid rgba(255,255,255,.12)}.forge-cmp .new{border-color:#fcee0a;box-shadow:0 0 10px rgba(252,238,10,.3)}.forge-cmp small{font-size:8px;color:#8aa0ad}
.en-plus{position:relative;z-index:2;text-align:center}.en-plus small{display:block;font-size:9px;letter-spacing:.3em;color:#8aa0ad}.en-plus b{display:block;font-size:42px;font-weight:900;color:#fff;text-shadow:0 0 18px var(--fq),3px 0 rgba(255,47,168,.6),-3px 0 rgba(34,230,255,.6)}.en-plus span{font-size:10px;color:#fcee0a}
.forge-stage.charging .en-plus b{animation:chargeShake .1s steps(2) infinite}@keyframes chargeShake{50%{transform:translate(1px,-1px)}}
.forge-stage.success .en-plus b{color:#fcee0a}.forge-stage.fail .en-plus b{color:#ff4d5e}
.en-stats{display:grid;gap:3px;margin:6px 0}.en-row{display:grid;grid-template-columns:1fr auto auto auto;gap:8px;align-items:baseline;font-size:11px;padding:4px 8px;background:rgba(10,18,28,.8)}
.en-row span{color:#8aa0ad;text-align:left}.en-row b{color:#fff}.en-row i{font-style:normal;color:#5f7a88}.en-row em{font-style:normal;color:#57ffa8}.en-row em.up{color:#ff9f43}
@media(prefers-reduced-motion:reduce){.forge-ring{animation:none!important}}
'''
s=s.replace('</style>\n</head>',css+'</style>\n</head>'); open(p,'w',encoding='utf8').write(s)
print('v20 applied')
