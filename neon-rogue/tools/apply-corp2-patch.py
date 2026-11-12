p='game.js';s=open(p,encoding='utf8').read()
if 'CORP_V2 ·' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
i=s.index("/* =========================================================\n   CORP_V1")
j=s.index("function maybeShowCorpReward() {",i); j=s.index("\n}\n",j)+3
s=s[:i]+open('tools/corp2-module.js',encoding='utf8').read()+s[j:]
rep("  if (e.corpObj === 'gen') corpProgress();\n  if (e.corpKit) corpUnitDrop(e);\n","  corpKilled(e);\n")
rep("e.tick++;if(e.corpObj)return;","e.tick++;if(e.corpObj)return;if(e.neutral){corpWorkerIdle(e);return;}if(e.berserk&&berserkAct(e))return;")
rep("  else if (s.type === 'terminal') openTerminal(s);","  else if (s.type === 'terminal' || s.type === 'desk') openTerminal(s);\n  else if (s.type === 'plant') openPlant(s);\n  else if (s.type === 'cage') openCage(s);\n  else if (s.type === 'relay') openRelay(s);")
rep("  drawSites(view,ambient||now);","  drawSites(view,ambient||now);\n  drawCorpFx(view,ambient||now);")
rep("function installCyber(id, slot) {\n  var m = MOD_BY[id];\n  if (!m) return;","function installCyber(id, slot) {\n  var m = MOD_BY[id];\n  if (!m) return;\n  if (slot && G.cyber[slot] && isTrial(G.cyber[slot]) && !isTrial(id)) { toast('体验装锁定，换不下来', 'bad'); return; }")
rep("function unequipCyber(slot) {\n  var id = G.cyber[slot];\n  if (!id) return;","function unequipCyber(slot) {\n  var id = G.cyber[slot];\n  if (!id) return;\n  if (isTrial(id)) { toast('体验装锁定，拆不下来', 'bad'); return; }")
rep("  if (slot) {\n    var chips = G.cyberChips[slot] || [];\n    var cand =","  if (slot && isTrial(id)) { html += '<div class=\"cx-h\" style=\"margin-top:8px;text-align:left\">芯片插槽 · 体验装</div>' + socketRowHTML(G.cyberChips[slot] || [], q.slots) + '<div class=\"hint\" style=\"text-align:left;color:#fcee0a\">体验装：锁定在身上，拆不下、换不了、芯片也动不了。任务结束后会把你原来的义体装回去。</div>'; }\n  else if (slot) {\n    var chips = G.cyberChips[slot] || [];\n    var cand =")
rep("  if (slot) html += equipListHTML(slot, '替换为（点一下直接换上）');","  if (slot && !isTrial(id)) html += equipListHTML(slot, '替换为（点一下直接换上）');")
rep("function modWeight(id) { var m = MOD_BY[id]; if (!m) return 1;","function modWeight(id) { var m = MOD_BY[id]; if (!m) return 1; if (isTrial(id)) return 0;")
rep("function instLoad(id) { var it = (G.inst || {})[id], m = MOD_BY[id]; return (","function instLoad(id) { var it = (G.inst || {})[id], m = MOD_BY[id]; if (isTrial(id)) return Math.ceil((CYBER_COST[m.quality] || 1) / 2); return (")
rep("function extractAll() {\n","function extractAll() {\n  if (G.trial) trialEnd(null);\n")
rep("  if (G.corpOp && (G.corpOp.active || G.depth > G.corpOp.depth) && G.depth !== G.corpOp.depth) { G.corpOp = null; G.opWall = null; }","  if (G.corpOp && (G.corpOp.active || G.depth > G.corpOp.depth) && G.depth !== G.corpOp.depth) { G.corpOp = null; G.opWall = null; }\n  if (G.trial && !G.corpOp) trialEnd(null);\n  G.cams = []; G.cfence = []; G.cmines = []; G.corpStrikes = [];")
i=s.index("  if (G.corpOp && G.corpOp.active && G.depth === G.corpOp.depth) { msg('B' + G.depth + 'F · ' + CORPS[G.corpOp.rival].name + '设施 · ' + CORP_JOBS"); j=s.index("\n",i)
s=s[:i]+"  if (G.corpOp && G.corpOp.active && G.depth === G.corpOp.depth) { var _op = G.corpOp; msg('B' + G.depth + 'F · ' + CORPS[_op.rival].name + '设施 · ' + corpJobText(_op.job, _op.rival, 'goal'), 'warn'); toast(CORPS[_op.corp].name + '委托 · 「' + CORP_JOBS[_op.job].name + '」', 'warn'); if (_op.rival === 'dome') msg('穹顶的摄像头一亮一灭，红光扫到你就报警。', 'dim'); if (_op.rival === 'kharon') msg('卡隆铺了电网和地雷，油桶一碰就炸。', 'dim'); }"+s[j:]
rep("  if (m[0] === 'npcs') return npcsDoneCount() >= +m[1];","  if (m[0] === 'npcs') return npcsDoneCount() >= +m[1];\n  if (m[0] === 'corp') return corpChapterMet(m[1]);")
rep("  if (m[0] === 'depth') return '抵达 B' + m[1] + 'F';","  if (m[0] === 'depth') return '抵达 B' + m[1] + 'F';\n  if (m[0] === 'corp') return /^\\d+$/.test(m[1]) ? '完成 ' + m[1] + ' 次公司委托' : m[1] === 'all' ? '和三家公司都打过交道' : '和' + (CORPS[m[1]] ? CORPS[m[1]].name : '公司') + '打过交道';")
rep("  if (type === 'b16Win') return cum.b16Win || 0;","""  if (type === 'b16Win') return cum.b16Win || 0;
  if (type === 'corpJobs') return cum.corpJobs || 0;
  if (type === 'corpFor') return (cum.corpFor || {})[a.cond.target] || 0;
  if (type === 'corpAssassin') return cum.corpAssassin || 0;
  if (type === 'corpDefend') return cum.corpDefend || 0;
  if (type === 'corpGhostDesk') return cum.corpGhostDesk || 0;
  if (type === 'corpCage') return cum.corpCage || 0;
  if (type === 'corpSet6') return cum.corpSet6 || 0;
  if (type === 'corpAll') return ['dome', 'kharon', 'mobius'].filter(function (k) { return (cum.corpFor || {})[k]; }).length;""")
# frenzy by ghost
rep("else if (k === 'frenzy') { if (target.boss) {","else if (k === 'frenzy') { if (!target.boss) target.frenzyByGhost = true; if (target.boss) {")
# playerHit hooks
rep("  if (G.bloodHits > 0 && opts.source !== 'relic' && opts.source !== 'merc') {","  if (e.vulnT > 0) raw *= 1.25;\n  if (e.neutral && G.corpOp) { e.neutral = false; corpDetect('你动手了'); }\n  if (!e.alerted) e._ambushT = G.turn;\n  if (G.bloodHits > 0 && opts.source !== 'relic' && opts.source !== 'merc') {")
# corp actives in useCyberActive
rep("  var base = Math.round(effAtk() * (1.8 + lv * 0.3) * cyberFactor() * cyberPower() * (stanceKind ? 1.4 : 1));\n","  var base = Math.round(effAtk() * (1.8 + lv * 0.3) * cyberFactor() * cyberPower() * (stanceKind ? 1.4 : 1));\n  var corpR = corpActive(a, id, base);\n  if (corpR === 'none') { G.cyberCd[id] = 0; msg('附近没有可用的目标', 'dim'); return; }\n  if (corpR === true) { contractEvent('skill'); cyberFeedback(); toast(a.name, 'warn'); computeFOV(); updateHUD(); endTurn(); return; }\n  contractEvent('skill');\n")
# set6 tracking in recalc caps
rep("  if (typeof corpCount === 'function' && G.mode === 'normal') {","  if (typeof corpCount === 'function' && G.mode === 'normal') { var _c6 = Math.max(corpCount('dome'), corpCount('kharon'), corpCount('mobius')); if (_c6 > (cum.corpSet6 || 0)) cum.corpSet6 = _c6; }\n  if (typeof corpCount === 'function' && G.mode === 'normal') {")
rep("  G.npcSeen = []; G.evSeen = []; G.swapQueue = []; G.corpOp = null;","  G.npcSeen = []; G.evSeen = []; G.swapQueue = []; G.trial = null; G.corpOp = null;")
# structure labels
rep("ctx.fillText(e.structure==='gen'?'主机'","ctx.fillText(e.structure==='barrel'?'桶':e.structure==='cage'?'笼':e.structure==='gen'?'主机'")
open(p,'w',encoding='utf8').write(s)
print('corp2 applied')
