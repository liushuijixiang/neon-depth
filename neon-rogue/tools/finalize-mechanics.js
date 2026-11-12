const fs=require('fs'),path=require('path');const file=path.resolve(__dirname,'../game.js');let s=fs.readFileSync(file,'utf8');
function rep(a,b){if(!s.includes(a))throw Error('missing '+a.slice(0,90));s=s.replace(a,b);}
rep("function afterAction() {\n  if (G.state !== 'play') return;","function afterAction() {\n  if (G.state !== 'play') return;\n  var frozenTurn = G.freeze > 0;");
rep('  tickHazards();\n  tickMines();','  if (!frozenTurn) { tickHazards(); tickMines(); }');
rep('  enemiesAct();\n  alliesAct();','  if (!frozenTurn) enemiesAct();\n  if (G.state === \'play\') alliesAct();');
rep('  G.stats.itemsUsed++; cum.itemsUsed++;',"  G.stats.itemsUsed++; if (G.mode === 'normal') cum.itemsUsed++;");
rep('    G.stats.shards++; cum.shards++;',"    G.stats.shards++; if (G.mode === 'normal') cum.shards++;");
rep('  if (e.guard > 0 && e.hp > e.maxHp * (e.guardAt || 0)) n *= e.guard;',"  var guard = e.id === 'bh_hive' ? (tacticOwned(e).length ? 0.6 : 0) : e.id === 'bl_warden' ? (e.hp > e.maxHp * 0.5 ? 0.6 : 0) : e.guard;\n  if (guard > 0 && e.hp > e.maxHp * (e.guardAt || 0)) n *= guard;");
rep("    var bph = boss.hp > boss.maxHp * 0.75 ? 1 : boss.hp > boss.maxHp * 0.5 ? 2 : boss.hp > boss.maxHp * 0.25 ? 3 : 4;\n    bossNameEl.textContent = boss.name + ' ' + Math.max(0, Math.ceil(boss.hp)) + '/' + boss.maxHp + ' · P' + bph + (boss.armorT > 0 ? ' · 装甲 ' + boss.armorT + 'T' : '');", "    var bossState = boss.intent ? boss.intent.label + ' · ' + boss.intent.turns + 'T' : boss.recovery > 0 ? '破绽 ' + boss.recovery + 'T · 伤害 +25%' : (boss.spec.tacticName || '准备行动');\n    bossNameEl.textContent = boss.name + ' ' + Math.max(0,Math.ceil(boss.hp)) + '/' + boss.maxHp + ' · ' + bossState;");
rep("      var lines = [((b.intro || '') + ' · ' + (b.desc || '')).replace(/^ · /, '')];\n      (b.abilities || []).forEach(function (ab) {", "      var lines = [b.intro || '', b.tacticHint || b.desc || ''];\n      if (!b.tacticHint) (b.abilities || []).forEach(function (ab) {");
rep("      return cxLine(b.name, 'HP ' + b.hp + ' · ATK ' + b.atk + ' · 阶段 75/50/25%', lines, b.color);", "      var bhp = Math.round(b.hp * (b.tier === 1 ? 4 : b.tier === 2 ? 6 : 8));\n      lines.push('半血空投2份补给；攻击命中破绽时伤害 +25%。Rush 耐久 ×1.6，另叠所选挑战。');\n      return cxLine(b.name, (b.tacticName || '') + ' · 主线 HP ' + bhp + ' · ATK ' + (b.atk + (b.tier-1)*2), lines, b.color);");
rep("[m.desc]);", "[m.desc, m.tacticHint || '']);");
rep('技能与击杀推高临界；背刺/处决击杀 -20；低临界可冥想；爆表时停','技能与击杀推高临界；刺杀/处刑击杀降压20，召唤体降压10；爆表时停5回合');
rep('75%/50%/25% 装甲展开并空投补给，血条上有刻度','亮格数字是剩余预警回合；离开亮格、打断孵化或利用掩体。招式后破绽增伤25%，半血空投补给');
rep('底部紫色栏，点击释放，消耗一回合','底部技能栏横滑可查看更多，抬手点击释放，消耗一回合');
// Tests exercise exact mechanics without using the visible cheat/training UI.
rep('test: { spawnEnemy:', 'test: { tacticBossPlan: tacticBossPlan, tacticResolve: tacticResolve, tacticArea: tacticArea, tacticOwned: tacticOwned, summonMinions: summonMinions, tickMines: tickMines, spawnEnemy:');
new(require('vm').Script)(s);fs.writeFileSync(file,s);console.log('Timing, isolation and codex finalized');
