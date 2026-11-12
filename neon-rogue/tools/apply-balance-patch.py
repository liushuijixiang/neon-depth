p='game.js';s=open(p,encoding='utf8').read()
if 'BALANCE_V18' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
s=s.replace("var GUN_UPS = [","// BALANCE_V18\nvar GUN_UPS = [",1)
# ---------- reload takes turns ----------
rep("  { id: 'cool', name: '冷却回路', max: 3, cost: [5, 7, 9], desc: '制弹基础耗能 -1/级' },","  { id: 'cool', name: '冷却回路', max: 3, cost: [5, 7, 9], desc: '制弹基础耗能 -1/级' },\n  { id: 'quick', name: '快速装填', max: 2, cost: [5, 8], desc: '换弹所需回合 -1（4 → 2）' },")
rep("""  G.inv.splice(i, 1);
  G.energy -= ecost;
  G.ammo = G.ammoMax;
  G.magSpecial = (id === 'mag_pack') ? null : specialFor(c);
  hideOverlay();
  if (G.magSpecial) {
    toast('换弹 · ' + c.name + ' → ' + SPECIALS[G.magSpecial].name, 'good');
    msg('弹种：' + SPECIALS[G.magSpecial].name + ' · 本弹匣附带效果', 'warn');
  } else {
    msg('换弹完成 · 普通弹', 'good');
  }""","""  if (G.reload) { msg('正在换弹', 'dim'); return; }
  G.inv.splice(i, 1);
  G.energy -= ecost;
  G.ammo = 0;
  G.reload = { turns: reloadTurns(), max: reloadTurns(), special: (id === 'mag_pack') ? null : specialFor(c), name: c.name };
  hideOverlay();
  msg('换弹中 · ' + G.reload.turns + ' 回合' + (G.reload.special ? ' · 装填' + SPECIALS[G.reload.special].name : ''), 'warn');""")
rep("""  G.mat -= 1;
  G.energy -= ecost;
  G.ammo = G.ammoMax;
  msg('制弹完成 · 材料 -1 · 能量 -' + ecost + ' · 装填 ' + G.ammo + ' 发', 'good');""","""  if (G.reload) { msg('正在换弹', 'dim'); return false; }
  G.mat -= 1;
  G.energy -= ecost;
  G.ammo = 0;
  G.reload = { turns: reloadTurns(), max: reloadTurns(), special: null, name: '制弹' };
  msg('制弹中 · ' + G.reload.turns + ' 回合', 'warn');""")
rep("function gunFire() {","""function reloadTurns() { return Math.max(2, 4 - gunLvl('quick')); }
function tickReload() {
  if (!G.reload) return;
  if (--G.reload.turns > 0) return;
  G.ammo = G.ammoMax; G.magSpecial = G.reload.special; G.reload = null;
  if (G.magSpecial) toast('换弹完成 · ' + SPECIALS[G.magSpecial].name, 'good'); else toast('换弹完成', 'good');
  sfx.pick(); nvSpawn(p.x, p.y, '#9fe9ff', 10, { speed: 2 });
}
function gunFire() {""")
rep("  if (G.ammo <= 0) { msg('弹匣已空 · 点击「换弹」装填', 'dim'); return; }","  if (G.reload) { msg('换弹中 · 还需 ' + G.reload.turns + ' 回合', 'dim'); return; }\n  if (G.ammo <= 0) { msg('弹匣已空 · 点击「换弹」装填', 'dim'); return; }")
rep("  tickStance();\n","  tickStance();\n  tickReload();\n")
rep("  G.energy = 8; G.energyMax = 14; G.ammo = 6; G.ammoMax = 6;","  G.reload = null; G.mechCool = 0; G.energy = 8; G.energyMax = 14; G.ammo = 6; G.ammoMax = 6;")
# ---------- mech: scrap per action ----------
rep("""  if (G.mech > 0) {
    G.mech--;
    if (G.mech <= 0) {
      G.mech = 0;
      G.mechBuilt = false;
      G.mechFuel = 0;
      G.mechMax = 12 + 2 * G.mechMods.length;
      toast('机甲燃料耗尽 · 已停机', 'bad');
      msg('机甲停机，组件保留，可重新建造', 'warn');
    }
  }""","""  if (G.mech > 0) {
    var mcost = mechUpkeep();
    if (G.scrap < mcost) { G.mech = 0; G.mechCool = 5; toast('废料耗尽 · 机甲强制停机', 'bad'); msg('机甲停机 · 冷却 5 回合', 'warn'); }
    else { G.scrap -= mcost; G.mech++; }
  } else if (G.mechCool > 0) { G.mechCool--; if (!G.mechCool && G.mechBuilt) msg('机甲冷却完毕', 'sys'); }""")
rep("""  if (G.mech > 0) {
    G.mechFuel = G.mech;
    G.mech = 0;
    toast('已下机甲 · 燃料 ' + G.mechFuel, 'warn');
  } else {
    if (G.mechFuel <= 0) { msg('机甲没有燃料，需要重新建造', 'dim'); return; }
    G.mech = G.mechFuel;""","""  if (G.mech > 0) {
    G.mech = 0; G.mechCool = 5;
    toast('已下机甲 · 冷却 5 回合', 'warn');
  } else {
    if (G.mechCool > 0) { msg('机甲冷却中 · ' + G.mechCool + ' 回合', 'dim'); return; }
    if (G.scrap < mechUpkeep(1)) { msg('废料不足，无法启动机甲', 'dim'); return; }
    G.mech = 1;""")
rep("""    G.mechFuel = 0;
    G.flash = 0.6;""","""    G.flash = 0.6;""")
rep("    toast('上机甲 · 燃料 ' + G.mech, 'good');","    toast('上机甲 · 每回合消耗废料', 'good');")
rep("function toggleMech() {","""// 机甲维持费：基础 1 + 每 4 回合 +1 + 每个改装 +1
function mechUpkeep(turn) { var t = turn || G.mech || 1; return 1 + Math.floor((t - 1) / 4) + (G.mechMods || []).length; }
function toggleMech() {""")
rep("  G.mechMax += 2;\n  if (G.mech > 0) G.mech += 2; else G.mechFuel += 2;","")
rep("  msg('机甲加装 · ' + m.name + '（燃料上限 +2）', 'good');","  msg('机甲加装 · ' + m.name + '（维持费 +1/回合）', 'good');")
rep("    G.mechMax = 12 + 2 * G.mechMods.length;\n    G.mechFuel = G.mechMax;\n    G.mech = 0;","    G.mech = 0; G.mechCool = 0;")
rep("    if (G.mechBuilt) { G.mechFuel = G.mechMax; G.mech = 0; }","    if (G.mechBuilt) { G.mech = 0; G.mechCool = 0; }")
rep("  else if (G.mechBuilt) html += '<span class=\"buff\" style=\"color:#8a7a55\">机甲待机 ' + G.mechFuel + '</span>';","  else if (G.mechBuilt) html += '<span class=\"buff\" style=\"color:#8a7a55\">' + (G.mechCool ? '机甲冷却 ' + G.mechCool : '机甲待机') + '</span>';")
rep("    html += '<div class=\"cx-h\">机甲改装 ' + G.mechMods.length + '/3 · 燃料 ' + (G.mech > 0 ? G.mech : G.mechFuel) + '/' + G.mechMax + ' · ' + (G.mech > 0 ? '驾驶中'","    html += '<div class=\"cx-h\">机甲改装 ' + G.mechMods.length + '/3 · 维持费 ' + mechUpkeep() + '/回合 · ' + (G.mech > 0 ? '驾驶中'")
rep("'<em>' + (on ? '已建造 · 燃料 ' + (G.mech > 0 ? G.mech : G.mechFuel) + '/' + G.mechMax :","'<em>' + (on ? '已建造 · 维持费 ' + mechUpkeep() + ' 废料/回合' + (G.mechCool ? ' · 冷却 ' + G.mechCool : '') :")
rep("ctx.arc(x,y,r*1.5,-Math.PI/2,-Math.PI/2+TAU*clamp(G.mech/(G.mechMax||12),0,1));","ctx.arc(x,y,r*1.5,-Math.PI/2,-Math.PI/2+TAU*clamp(G.scrap/Math.max(1,mechUpkeep()*8),0,1));")
s=s.replace("12 回合：攻 +4、防 +2、受伤 -30%，可加装组件","攻 +4、防 +2、受伤 -30%；驾驶时每回合消耗废料，越久越贵")
# ---------- button-ized class bar ----------
i=s.index("  if (isAss) {\n    html += '<button class=\"abtn\" data-act=\"fire\"")
j=s.index("  if (laserActive()) html +=",i)
s=s[:i]+"""  if (isAss) {
    var pips = ''; for (var ai = 0; ai < G.ammoMax; ai++) pips += '<i class="' + (ai < G.ammo ? 'on' : '') + '"></i>';
    var rl = G.reload;
    html += kbtn('fire', '开火', rl ? '换弹中' : G.ammo ? (G.magSpecial ? SPECIALS[G.magSpecial].name : '普通弹') : '弹匣空', '#ff5c7a', !G.ammo || !!rl, '<span class="pips">' + pips + '</span>');
    html += kbtn('reload', rl ? '换弹 ' + (rl.max - rl.turns) + '/' + rl.max : '换弹', rl ? '装填中…' : gunReloadCost() + ' 能量 · 1 消耗品 · ' + reloadTurns() + ' 回合', '#9fe9ff', !rl && (G.ammo >= G.ammoMax || !G.inv.length || G.energy < gunReloadCost()), rl ? '<span class="prog"><i style="width:' + Math.round((rl.max - rl.turns) / rl.max * 100) + '%"></i></span>' : '', rl ? 'busy' : '');
    html += kbtn('dash', '冲刺', '2 能量', '#b690ff', G.energy < 2);
    html += kbtn('shock', '震荡', '3 能量', '#ffd166', G.energy < 3);
    if (gunLvl('overheat')) { var oh = G.gunCd.overheat || 0; html += kbtn('overheat', '过热', oh ? '冷却 ' + oh : '就绪', '#ff7a45', oh > 0); }
    if (gunLvl('overclock')) { var oc = G.gunCd.overclock || 0; html += kbtn('overclock', '超频', oc ? '冷却 ' + oc : '就绪', '#57ffa8', oc > 0); }
    html += kbtn('gun', '军械库', '能量 ' + G.energy + '/' + G.energyMax, '#fcee0a', false, '<span class="prog"><i style="width:' + Math.round(G.energy / G.energyMax * 100) + '%"></i></span>');
  }
  if (isEng) html += '<button class="kbtn" data-build="1" style="--kc:#ffd166"><b>工程台</b><small>废料 ' + G.scrap + '</small></button>';
  if (isEng && G.mechBuilt) {
    html += kbtn('mech', G.mech > 0 ? '下机甲' : '上机甲', G.mech > 0 ? '维持 ' + mechUpkeep() + '/回合 · 第 ' + G.mech + ' 回合' : G.mechCool ? '冷却 ' + G.mechCool + ' 回合' : '启动费 ' + mechUpkeep(1) + ' 废料', '#ffe0a3', G.mech <= 0 && (G.mechCool > 0 || G.scrap < mechUpkeep(1)), G.mech > 0 ? '<span class="prog warn"><i style="width:' + Math.min(100, Math.round(G.scrap / Math.max(1, mechUpkeep() * 10) * 100)) + '%"></i></span>' : '', G.mech > 0 ? 'busy' : '');
  }
"""+s[j:]
rep("function mechHas(id) {","""function kbtn(act, name, sub, color, dis, extra, cls) {
  return '<button class="kbtn' + (cls ? ' ' + cls : '') + '" data-act="' + act + '"' + (dis ? ' disabled' : '') + ' style="--kc:' + color + '"><b>' + name + '</b><small>' + sub + '</small>' + (extra || '') + '</button>';
}
function mechHas(id) {""")
open(p,'w',encoding='utf8').write(s)
print('balance patch applied')
