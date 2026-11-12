import re
p='game.js';s=open(p,encoding='utf8').read()
if 'TRIAL_CHIPS' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
rep("var CORP_LBL = { atk: '攻击', maxHp: '生命', def: '防御', crit: '暴击', dodge: '闪避', vision: '视野', lifesteal: '吸血', thorns: '反伤', execute: '残血伤害' };\nCORP_MODS.forEach(function (d) {",
"""var CORP_LBL = { atk: '攻击', maxHp: '生命', def: '防御', crit: '暴击', dodge: '闪避', vision: '视野', lifesteal: '吸血', thorns: '反伤', execute: '残血伤害' };
CORP_MODS.filter(function (d) { return d.slot === 'eye' || d.slot === 'leg'; }).forEach(function (d) {
  var st = {}; Object.keys(d.stats).forEach(function (k) { var v = d.stats[k] * .85; st[k] = d.stats[k] < 1 ? Math.round(v * 100) / 100 : Math.max(1, Math.round(v)); });
  CORP_MODS.push({ id: d.id + '_r', corp: d.corp, q: d.q, slot: d.slot + '2', name: d.name + '（右）', stats: st, active: null, lore: '和左边那件是一对，出厂时就配好了序列号。' + d.lore });
});
CORP_MODS.forEach(function (d) {""")
rep("  var C = CORPS[d.corp], q = d.q, slot = d.slot === 'hand2' ? 'hand' : d.slot;","  var C = CORPS[d.corp], q = d.q, slot = d.slot.replace(/2$/, '');")
i=s.index("function trialBegin(corp, q) {"); j=s.index("function trialEnd(keepId) {",i)
s=s[:i]+open('tools/trial2.js',encoding='utf8').read()+s[j:]
rep("function instLoad(id) { var it = (G.inst || {})[id], m = MOD_BY[id]; if (isTrial(id)) return Math.ceil((CYBER_COST[m.quality] || 1) / 2); return (","function instLoad(id) { var it = (G.inst || {})[id], m = MOD_BY[id]; if (isTrial(id)) return Math.floor(Math.ceil((CYBER_COST[m.quality] || 1) / 2) * ((G.trialKit && G.trialKit.loadMul) || 1)); return (")
rep("  var html = '<div class=\"card site corpcard\"","  var kitN = kit.length;\n  var html = '<div class=\"card site corpcard\"")
rep("'<div class=\"loot-h\">体验装 · ' + C.name + CORP_QNAME[q] + ' 6 件（接下即换上）</div>","'<div class=\"loot-h\">体验装 · ' + C.name + CORP_QNAME[q] + ' ' + kitN + ' 件 · 插满定制芯片（接下即换上）</div>")
rep("体验装锁定在身上，拆不下也改不了；负载减半。你原来的义体先替你收着","体验装 8 个部位全换上、芯片插满；锁定在身上，拆不下也改不了，负载减半。适应度不够时先多插兼容芯片补齐，还不够就降功率运行、不会过载。你原来的义体先替你收着")
rep("  var dodge = Math.min(.5, 0.08 + (G.mod ? G.mod.dodge : 0) + buffStat('dodge') * 0.01);","  var dodge = Math.min((G.chal && G.chal.dodgeCap != null) ? G.chal.dodgeCap : 1, 0.08 + (G.mod ? G.mod.dodge : 0) + buffStat('dodge') * 0.01);")
rep("  if (G.mod.lifesteal > .3) G.mod.lifesteal = .3;\n","  if (G.chal && G.chal.leechCap != null && G.mod.lifesteal > G.chal.leechCap) G.mod.lifesteal = G.chal.leechCap;\n",2)
rep("    if (c.psyLong) m.psyLong = (m.psyLong || 0) + c.psyLong;","    if (c.psyLong) m.psyLong = (m.psyLong || 0) + c.psyLong;\n    if (c.dodgeCap != null) m.dodgeCap = Math.min(m.dodgeCap == null ? 1 : m.dodgeCap, c.dodgeCap);\n    if (c.leechCap != null) m.leechCap = Math.min(m.leechCap == null ? 1 : m.leechCap, c.leechCap);\n    if (c.powerCap != null) m.powerCap = Math.min(m.powerCap == null ? 9 : m.powerCap, c.powerCap);\n    if (c.powerMul) m.powerMul = (m.powerMul || 1) * c.powerMul;\n    if (c.skillCap != null) m.skillCap = Math.min(m.skillCap == null ? 8 : m.skillCap, c.skillCap);\n    if (c.cdPlus) m.cdPlus = (m.cdPlus || 0) + c.cdPlus;")
for old,new in [
 ("  { id: 'heavy', tier: 4, name: '重甲', desc: '敌人生命 +25%', score: 30, enemyHpMul: 1.25 },","  { id: 'dodgecap', tier: 4, name: '迟钝', desc: '闪避率上限 50%', score: 25, dodgeCap: 0.5 },"),
 ("  { id: 'fury', tier: 4, name: '狂怒', desc: '敌人攻击 +2', score: 30, atk: 2 },","  { id: 'powercap', tier: 4, name: '降频', desc: '义体主动功率上限 100%（芯片与养成的功率加成失效）', score: 30, powerCap: 1 },"),
 ("  { id: 'debt', tier: 5, name: '血债', desc: '最大生命 -20%', score: 35, hpMul: 0.8 },","  { id: 'skillcap', tier: 5, name: '协议锁', desc: '义体技能等级上限 3', score: 30, skillCap: 3 },"),
 ("  { id: 'elite2', tier: 5, name: '精英猎场 II', desc: '精英率 +15%', score: 35, elite: 0.15 },","  { id: 'leechcap', tier: 5, name: '凝血障碍', desc: '吸血上限 30%', score: 25, leechCap: 0.3 },"),
 ("  { id: 'siege', tier: 6, name: '围攻', desc: '每层敌人 +1', score: 35, count: 1 },","  { id: 'cdplus', tier: 6, name: '散热不良', desc: '义体主动技能冷却 +2 回合', score: 35, cdPlus: 2 },"),
 ("  { id: 'steel', tier: 7, name: '钢铁', desc: '敌人攻击 +3', score: 45, atk: 3 },","  { id: 'throttle', tier: 7, name: '限流', desc: '义体主动功率 ×0.7', score: 45, powerMul: 0.7 },"),
 ("  { id: 'noheal2', tier: 8, name: '禁疗 II', desc: '修复与治疗无效', score: 45, noHeal: true },","  { id: 'numb', tier: 8, name: '麻木', desc: '吸血上限 10%，闪避上限 30%', score: 45, leechCap: 0.1, dodgeCap: 0.3 },")]:
    rep(old,new)
rep("  var lv = Math.min(8, ((G.cyberGrowth[id] || {}).lv || 1) + chipStats().skill);\n  // 自身范围斩","  var lv = Math.min((G.chal && G.chal.skillCap) || 8, ((G.cyberGrowth[id] || {}).lv || 1) + chipStats().skill);\n  // 自身范围斩")
rep("  G.cyberCd[id] = Math.max(1, a.cd - (G.mods.cooldown_core ? 1 : 0));","  G.cyberCd[id] = Math.max(1, a.cd - (G.mods.cooldown_core ? 1 : 0)) + ((G.chal && G.chal.cdPlus) || 0);")
m=re.search(r"function cyberPower\(\) \{ return (.*?); \}\n",s)
assert m, 'cyberPower'
s=s[:m.start()]+"function cyberPower() { var v = "+m.group(1)+"; if (G.chal && G.chal.powerCap != null) v = Math.min(v, G.chal.powerCap); if (G.chal && G.chal.powerMul) v *= G.chal.powerMul; if (G.trialKit && G.trialKit.powerMul < 1) v *= G.trialKit.powerMul; return v; }\n"+s[m.end():]
open(p,'w',encoding='utf8').write(s)
print('v35a ok')
