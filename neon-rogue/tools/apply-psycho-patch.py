p='game.js';s=open(p,encoding='utf8').read()
if 'PSYCHO_V1' in s: raise SystemExit('already')
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: raise SystemExit('anchor x%d: %s'%(n,a[:100]))
    s=s.replace(a,b)
mod=open('tools/psycho-module.js',encoding='utf8').read()
mod=mod.replace("function spawnPsychoEnemy(depth) {\n  if (G.mode !== 'normal' || depth < 2 || depth % 5 === 0) return null;\n  if (Math.random() >","function spawnPsychoEnemy(depth, force) {\n  if (G.mode !== 'normal' || depth < 2 || depth % 5 === 0) return null;\n  if (!force && Math.random() >")
anchor="/* =========================================================\n   启动"
rep(anchor,mod+"\n\n"+anchor)
# frenzy relics registration (after story relics registration)
rep("ACT_COLOR = ACT_COLOR || {}; ACT_LABEL = ACT_LABEL || {};","""(STORY.psychoRelics || []).forEach(function (r) {
  if (MOD_BY[r.id]) return;
  var L = { atk: '攻击', maxHp: '生命', def: '防御', crit: '暴击', dodge: '闪避', lifesteal: '吸血' };
  var parts = Object.keys(r.stats || {}).map(function (k) { var v = r.stats[k]; return (L[k] || k) + ' +' + (v < 1 ? Math.round(v * 100) + '%' : v); });
  var m = { id: r.id, slot: r.slot, quality: r.quality || 'red', name: r.name, color: '#ff365c', stats: r.stats || {}, frenzy: true, dropOnly: true, relic: true, lore: r.lore,
    desc: parts.join('，') + '；失控时攻击 +4、暴击 +10%、吸血 +10%，清醒后永久失去 6% 最大生命与 1 攻击' };
  MODS.push(m); MOD_BY[m.id] = m;
});
if (STORY.fixerPsycho && STORY.fixerPsycho.length) { STORY.contracts = STORY.contracts || {}; STORY.contracts.c_psycho = pick(STORY.fixerPsycho); }
ACT_COLOR = ACT_COLOR || {}; ACT_LABEL = ACT_LABEL || {};""")
# frenzy bonus in calcMods
rep("""  var ist = instStats();""","""  if (G.psycho > 0 && typeof frenzyBonus === 'function') { var fz = frenzyBonus(); if (fz) { m.atk = (m.atk || 0) + 4 * fz; m.crit = (m.crit || 0) + .1 * fz; m.lifesteal = (m.lifesteal || 0) + .1 * fz; } }
  var ist = instStats();""")
rep("  G.psycho = (G.psycho || 0) - 1;","  G.psycho = (G.psycho || 0) - 1;\n  if (G.psycho <= 0) { frenzyOnEnd(); recalc(); }")
rep("  if (G.mode === 'normal') storyEvent('psycho');","  if (G.mode === 'normal') storyEvent('psycho');\n  recalc();")
# spawn
rep("  if (contractHas('bounty') && G.depth % 5 !== 0) spawnBountyElites(2);","  if (contractHas('bounty') && G.depth % 5 !== 0) spawnBountyElites(2);\n  spawnPsychoEnemy(G.depth);")
# skill use
rep("  if((e.disarmT>0||e.frenzyT>0)&&enemyHackTick(e,dist))return;","  if((e.disarmT>0||e.frenzyT>0)&&enemyHackTick(e,dist))return;\n  if(e.psycho&&!e.intent&&!e.boss&&psychoUseSkill(e,dist))return;")
# drops
rep("  if (e.npcDuel) npcDuelWon(e);","  if (e.npcDuel) npcDuelWon(e);\n  if (e.psycho) { psychoDrops(e); var fr = MODS.filter(function (m) { return m.frenzy && G.modBag.indexOf(m.id) < 0 && !META.stash.cyber.some(function (x) { return stashId(x) === m.id; }); }); if (fr.length && Math.random() < .18) { var fm = pick(fr); G.items.push({ x: e.x, y: e.y, mod: fm, seed: 0 }); toast('掉落失控义体 · ' + fm.name, 'good'); } }")
# chip pickup + draw
rep("""    if (it.mod) {""","""    if (it.chip) {
      G.items.splice(i, 1);
      if (bagFull()) { var crv = CHIP_SELL[it.chip.quality] || 3; gainCredits(crv, x, y); toast('背包已满 · 芯片折现 ¥' + crv, 'warn'); return; }
      G.chips.push(it.chip); toast('拾取 · ' + it.chip.name + (it.chip.heavy ? '（重改 +' + it.chip.heavy + ' 负载）' : ''), 'good'); sfx.pick(); return;
    }
    if (it.mod) {""")
rep("if(drawItemFx(it,view,now))return;var spec=it.it||it.cons;if(it.mod)spec={color:it.mod.color,glyph:'gem'};","if(drawItemFx(it,view,now))return;var spec=it.it||it.cons;if(it.mod)spec={color:it.mod.color,glyph:'gem'};if(it.chip)spec={color:it.chip.color,glyph:'square'};")
# contracts
rep("    else if (type === 'challenge' && t === 'challenge') contractProgress(c);","    else if (type === 'challenge' && t === 'challenge') contractProgress(c);\n    else if (type === 'psycho' && t === 'killPsycho') contractProgress(c);")
rep("  if (c.def.type === 'hunt') spawnWanted(c);","  if (c.def.type === 'hunt') spawnWanted(c);\n  if (c.def.type === 'killPsycho' && !G.enemies.some(function (e) { return e.psycho; })) spawnPsychoEnemy(Math.max(2, G.depth), true);")
# achievements metric
rep("  if (type === 'psychoTotal') return cum.psychoTotal || 0;","  if (type === 'psychoTotal') return cum.psychoTotal || 0;\n  if (type === 'psychoKills') return cum.psychoKills || 0;\n  if (type === 'dreamsOwned') return Object.keys(ST.dreams || {}).length;\n  if (type === 'dreamsPlayed') return ST.dreamPlays || 0;\n  if (type === 'dreamsDone') return Object.keys(ST.dreamDone || {}).length;\n  if (type === 'lockedCh') return (STORY.chapters || []).filter(function (c) { return c.lock && ST.chapters[c.id]; }).length;")
open(p,'w',encoding='utf8').write(s)
print('psycho patch applied')
