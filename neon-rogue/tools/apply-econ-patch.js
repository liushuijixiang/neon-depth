// Applies the 1.4 economy hooks to game.js. Each anchor must match exactly once.
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '..', 'game.js');
let s = fs.readFileSync(FILE, 'utf8');
function rep(a, b) {
  const n = s.split(a).length - 1;
  if (n !== 1) throw Error('anchor x' + n + ': ' + a.slice(0, 100));
  s = s.replace(a, () => b);
}

/* ---------- killEnemy ---------- */
rep(`  if (G.mode !== 'train') G.credits += e.elite ? 4 : 2;
  if (e.boss && G.mode !== 'train') {`,
`  if (G.mode !== 'train') gainCredits(killCredits(e), e.x, e.y + .4, !e.elite && !e.boss);
  if (e.boss && G.mode === 'rush') {`);
rep(`  if (G.mode !== 'train' && (G.dropNormal > 0 || G.dropElite > 0 || G.dropBoss > 0 || e.elite || e.boss)) {
    var dropChance = e.boss ? (0.5 + (G.dropBoss || 0)) : e.elite ? (0.15 + (G.dropElite || 0)) : (0.02 + (G.dropNormal || 0));
    if (Math.random() < Math.min(1, dropChance)) {
      var dpool = normalMods().filter(function (m) { return G.modBag.indexOf(m.id) < 0; });
      var dm = pickCyber(dpool, (G.dropQuality || 0) * 10);
      if (dm) {
        applyMod(dm);
        burst(e.x, e.y, QUALITY[dm.quality].color, 18);
        toast('幸运掉落 · ' + dm.name, 'good');
        msg('义体掉落：' + dm.name + '（' + QUALITY[dm.quality].name + '）', 'warn');
      }
    }
  }
  if (e.challenge) {
    G.challenge = Math.max(0, G.challenge - 1);
    if (G.challenge === 0) {
      G.bonus += 40;
      G.credits += 15;
      healPlayer(20, true);
      var cm = pick(normalMods());
      applyMod(cm);
      toast('挑战完成 · 义体 ' + cm.name, 'good');
    }
  }`,
`  if (G.mode !== 'train' && !(e.boss && G.mode === 'normal') && (G.dropNormal > 0 || G.dropElite > 0 || G.dropBoss > 0 || e.elite || e.boss)) {
    var dropChance = e.boss ? (0.5 + (G.dropBoss || 0)) : e.bounty ? 1 : e.elite ? (0.15 + (G.dropElite || 0)) : (0.02 + (G.dropNormal || 0));
    if (Math.random() < Math.min(1, dropChance)) {
      var dpool = normalMods().filter(function (m) { return G.modBag.indexOf(m.id) < 0 && (!e.bounty || Q_ORDER.indexOf(m.quality) >= 3); });
      var dm = pickCyber(dpool, (G.dropQuality || 0) * 10);
      if (dm && G.mode === 'normal') {
        dropGroundMod(dm, e.x, e.y);
        toast('义体掉落 · ' + dm.name, 'good');
        msg('义体掉落：' + dm.name + '（' + QUALITY[dm.quality].name + '）· 踩上去拾取', 'warn');
      } else if (dm) applyMod(dm);
    }
  }
  if (G.mode === 'normal' && e.elite && !e.challenge && !e.bounty && Math.random() < 0.1) dropChest(e.x, e.y, 'common');
  if (e.challenge) trialKill(e);`);
rep(`  var gain = G.mode === 'train' ? 0 : gainXp(e.xp);`,
`  var gain = G.mode === 'train' ? 0 : gainXp(Math.round(e.xp * (G.anomaly === 'overdrive' ? 1.3 : 1)));`);
rep(`  questEvent('kill', e.id);`, `  questEvent('kill', e);`);
rep(`    if (G.depth >= MAX_DEPTH) { win(); return; }
    G.bossAlive = false;
    msg('守卫已清除 · 楼梯解锁', 'good');
    toast('楼梯解锁', 'good');
    return;`,
`    G.bossAlive = false;
    dropChest(e.x, e.y, 'boss', { bossId: e.spec.id, title: e.name + ' · 核心箱' });
    G.flash = 0.6; G.shake = 10;
    if (G.depth >= MAX_DEPTH) {
      G.extract = true;
      msg('撤离信标已开启 · 拿走核心箱，再踏上出口撤离', 'good');
      toast('撤离信标开启', 'good');
      return;
    }
    msg('守卫已清除 · 核心箱掉落 · 楼梯解锁', 'good');
    toast('楼梯解锁', 'good');
    return;`);

/* ---------- 消耗品 ---------- */
rep(`  var eff = spec.effect || {}, did = false;
  if (eff.heal) { healPlayer(depthScale(eff.heal)); did = true; }`,
`  var fx = CONS_FX[spec.use || (id === 'mag_pack' ? 'mag' : '')];
  if (fx) {
    if (fx.run(spec) === false) { G.inv.splice(idx, 0, id); updateHUD(); return; }
    burst(p.x, p.y, spec.color, 10);
    msg('使用 ' + spec.name, 'sys');
    if (G.depth % 5 === 0) G.bossFloorItems = (G.bossFloorItems || 0) + 1;
    G.stats.itemsUsed++; if (G.mode === 'normal') cum.itemsUsed++;
    questEvent('useItem'); checkAch(); recalc(); updateHUD(); endTurn();
    return;
  }
  var eff = spec.effect || {}, did = false;
  if (eff.heal) { healPlayer(depthScale(eff.heal)); did = true; }`);


/* ---------- 拾取 ---------- */
rep(`    if (it.cons) {
      G.items.splice(i, 1);
      addConsumable(it.cons);
      return;
    }`,
`    if (it.chest) {
      G.items.splice(i, 1);
      openChest(it.chest);
      return;
    }
    if (it.cons) {
      if (G.inv.length >= 4 && G.mode === 'normal' && classDef().id !== 'engineer') {
        if (!it.warned) { it.warned = true; msg('背包已满 · ' + it.cons.name + ' 留在地上', 'dim'); }
        continue;
      }
      G.items.splice(i, 1);
      addConsumable(it.cons);
      return;
    }`);
rep(`    if (it.mod) {
      G.items.splice(i, 1);
      applyMod(it.mod);`,
`    if (it.mod) {
      G.items.splice(i, 1);
      if (G.modBag.indexOf(it.mod.id) >= 0) { gainCredits(Math.round((RUN_CYBER_PRICE[it.mod.quality] || 20) * .4), x, y); continue; }
      applyMod(it.mod);`);

/* ---------- 回合 / 下潜 / 撤离 ---------- */
rep(`  if (p.x !== G.stairs.x || p.y !== G.stairs.y || G.depth >= MAX_DEPTH) return;`,
`  if (p.x !== G.stairs.x || p.y !== G.stairs.y) return;
  if (G.depth >= MAX_DEPTH) {
    if (G.mode === 'normal' && !G.bossAlive) {
      if (G.items.some(function (it) { return it.chest; }) && !G.extractWarned) { G.extractWarned = true; msg('核心箱还没拿 · 再踩一次出口确认撤离', 'warn'); return; }
      msg('▲ 撤离中…', 'sys'); win();
    }
    return;
  }`);
rep(`    G.depth++;
    if (classDef().id === 'assault') G.energy = Math.min(G.energyMax, G.energy + 2);
    questEvent('descend');`,
`    G.depth++;
    if (classDef().id === 'assault') G.energy = Math.min(G.energyMax, G.energy + 2);
    if (G.loanFloors > 0) G.loanFloors--;
    questEvent('descend');`);
rep(`    maybeShowBoon();
    maybeShowSkillChoice();
  }, 420);`,
`    maybeShowBoon();
    maybeShowSkillChoice();
    econResume();
  }, 420);`);
rep(`  G.quests.forEach(function (q) {
    if (!q.done && q.def.type === 'survive') {
      q.progress = Math.min(q.target, G.turn);
      if (q.progress >= q.target) completeQuest(q);
    }
  });
  checkAch();`,
`  contractTick(); trialTick();
  checkAch();`);
rep(`  maybeShowBoon();
  maybeShowEvolution();
  maybeShowSkillChoice();
}
function doMove(dx, dy) {`,
`  maybeShowBoon();
  maybeShowEvolution();
  maybeShowSkillChoice();
  maybeShowLoot();
  maybeShowBoard();
}
function doMove(dx, dy) {`);
rep(`  if (!dx && !dy) {
    sfx.step();
  } else {`,
`  if (!dx && !dy) {
    var here = G.sites && siteAt(p.x, p.y);
    if (here && (!here.used || SITE_DEFS[here.type].reuse)) { openSite(here); return; }
    sfx.step();
  } else {`);

/* ---------- 伤害 / 治疗 / 生命修正 ---------- */
rep(`  if (G.mech > 0) dmg = Math.max(1, Math.round(dmg * 0.7));
  var absorbed = 0, broke = 0;`,
`  if (G.mech > 0) dmg = Math.max(1, Math.round(dmg * 0.7));
  dmg = Math.max(1, Math.round(dmg * econDamageTakenMul()));
  var absorbed = 0, broke = 0;`);
rep(`  if (G.chal) n = Math.max(1, Math.round(n * G.chal.healMul));
  var before = p.hp;`,
`  if (G.chal) n = Math.max(1, Math.round(n * G.chal.healMul));
  n = Math.max(1, Math.round(n * econHealMul()));
  var before = p.hp;`);
rep(`* ((G.mode === 'rush' && G.rushMods) ? G.rushMods.hpMul : 1));`,
`* ((G.mode === 'rush' && G.rushMods) ? G.rushMods.hpMul : 1) * econHpMul());`);
rep(`  if (critical) n *= 1.7 + (G.mod.critMult || 0);
  var boosted = n;`,
`  if (critical) n *= 1.7 + (G.mod.critMult || 0);
  n *= econDamageDealtMul();
  var boosted = n;`);
rep(`  if(e.phaseT>0)n*=.15;`, `  if(e.phaseT>0)n*=.15;if(e.vulnT>0)n*=1.35;`);
rep(`  if(e.bleedStacks>0){e.hp-=e.bleedStacks;e.bleedStacks--;if(e.hp<=0){killEnemy(e);return;}}
  if(e.cd>0)e.cd--;if(e.shieldT>0)e.shieldT--;`,
`  if(e.bleedStacks>0){e.hp-=e.bleedStacks;e.bleedStacks--;if(e.hp<=0){killEnemy(e);return;}}
  if(e.igniteT>0){e.igniteT--;var ig=damageEnemy(e,e.igniteDmg||1);float(e.x,e.y,'-'+ig,'#ff7a45');if(e.hp<=0){killEnemy(e);return;}}
  if(e.cd>0)e.cd--;if(e.shieldT>0)e.shieldT--;if(e.vulnT>0)e.vulnT--;`);
rep(`function visionR() { return Math.min(9, 7 + (G.mod ? (G.mod.vision || 0) : 0)); }`,
`function visionR() { return Math.max(3, Math.min(9, 7 + (G.mod ? (G.mod.vision || 0) : 0)) + econVisionMod()); }`);
rep(`  var elite = !spec.boss && depth >= 2 && Math.random() < (0.16 + ((G.chal && G.chal.elite) || 0));`,
`  var elite = !spec.boss && depth >= 2 && Math.random() < (0.16 + ((G.chal && G.chal.elite) || 0) + econEliteBonus());`);
rep(`    var b = p.buffs[i], d = BUFF[b.id];
    if (!d) { b.turns--; continue; }`,
`    var b = p.buffs[i], d = b.def || BUFF[b.id];
    if (!d) { b.turns--; continue; }`);

/* ---------- 地图生成 ---------- */
rep(`  G.enemies = []; G.items = []; G.stairs = null; G.bossAlive = false;

  var rooms = [];`,
`  G.enemies = []; G.items = []; G.stairs = null; G.bossAlive = false; G.extract = false; G.extractWarned = false;
  G.anomaly = rollAnomaly(depth);

  var rooms = [];`);
rep(`  var consN = 1 + rnd(2);`, `  var consN = 1 + rnd(2) + (G.anomaly === 'vein' ? 2 : 0);
  if (G.anomaly === 'vein') for (var vs = 0; vs < 2; vs++) { var vt = randomFloorTile(2, false); if (vt && ITEM.data_shard) G.items.push({ x: vt.x, y: vt.y, it: ITEM.data_shard, seed: Math.random() * TAU }); }`);
rep(`  var count = Math.min(10, 5 + stageOf(depth) - 1 + ((depth - 1) % 5 >= 2 ? 1 : 0) + ((G.chal && G.chal.count) || 0));`,
`  var count = Math.min(12, 5 + stageOf(depth) - 1 + ((depth - 1) % 5 >= 2 ? 1 : 0) + ((G.chal && G.chal.count) || 0) + (G.anomaly === 'lockdown' ? 2 : G.anomaly === 'market' ? -2 : 0));`);
rep(`  G.special = null; G.challenge = 0; G.shopOffers = null;
  if (depth % 5 !== 0 && Math.random() < 0.7) {
    var st = randomFloorTile(3, false);
    if (st) G.special = { type: pick(['shop', 'fountain', 'challenge']), x: st.x, y: st.y, used: false, seed: Math.random() * TAU };
  }`,
`  G.special = null; G.challenge = 0; G.shopOffers = null;
  G.sites = genSites(depth, rooms, start, far);`);
rep(`  G.enemies = []; G.items = []; G.stairs = null; G.special = null; G.challenge = 0; G.shopOffers = null; G.hazards = []; G.hazardTick = 0; G.mines = []; G.mines = [];`,
`  G.enemies = []; G.items = []; G.stairs = null; G.special = null; G.challenge = 0; G.shopOffers = null; G.hazards = []; G.hazardTick = 0; G.mines = []; G.sites = []; G.anomaly = null; G.extract = false; G.extractWarned = false;`);
rep(`  G.enemies = []; G.items = []; G.stairs = null; G.special = null;
  G.hazards = []; G.mines = []; G.hazardTick = 0; G.bossAlive = false; G.bossName = '';`,
`  G.enemies = []; G.items = []; G.stairs = null; G.special = null; G.sites = []; G.anomaly = null;
  G.hazards = []; G.mines = []; G.hazardTick = 0; G.bossAlive = false; G.bossName = '';`);
rep(`  G.log = [];
  G.floorDamage = 0;
  if (G.depth % 5 === 0) {`,
`  G.log = [];
  G.floorDamage = 0;
  econFloorStart();
  if (G.depth % 5 === 0) {`);
rep(`    msg('检测到 ' + G.enemies.length + ' 个敌对信号', 'dim');`,
`    msg('检测到 ' + G.enemies.length + ' 个敌对信号' + ((G.sites || []).length ? ' · ' + G.sites.length + ' 处设施' : ''), 'dim');
    if (G.anomaly) msg('区域异常 · ' + ANOMALIES[G.anomaly].name + '：' + ANOMALIES[G.anomaly].desc, 'warn');`);

/* ---------- 选奖励后续流程 ---------- */
rep(`  p.pending = Math.max(0, p.pending - 1);
  hideOverlay();
  recalc();
  updateHUD();
  if (p.pending > 0) maybeShowSkillChoice();
}`,
`  p.pending = Math.max(0, p.pending - 1);
  hideOverlay();
  recalc();
  updateHUD();
  if (p.pending > 0) maybeShowSkillChoice();
  else econResume();
}`);
rep(`  maybeShowSkillChoice();
  if (G.rushPending) beginRush();`,
`  maybeShowSkillChoice();
  maybeShowBoard();
  if (G.rushPending) beginRush();`);

/* ---------- 消耗品选择权重 ---------- */
rep(`function pickConsumable(depth) {
  var pool = CONSUMABLES.filter(function (m) { return depth >= (m.minDepth || 1); });`,
`function pickConsumable(depth) {
  var pool = CONSUMABLES.filter(function (m) { return m.weight > 0 && depth >= (m.minDepth || 1); }).map(function (m) {
    var tw = m.tier === 'epic' ? (depth >= 11 ? 2 : 1) : m.tier === 'rare' ? (depth >= 6 ? 1.4 : 1) : (depth >= 11 ? .75 : 1);
    return { m: m, weight: m.weight * tw };
  });
  if (!pool.length) return CONSUMABLES[0];
  var tw0 = 0; pool.forEach(function (x) { tw0 += x.weight; });
  var rr = Math.random() * tw0;
  for (var ii = 0; ii < pool.length; ii++) { rr -= pool[ii].weight; if (rr <= 0) return pool[ii].m; }
  return pool[0].m;
}
function pickConsumableLegacy(depth) {
  var pool = CONSUMABLES.filter(function (m) { return depth >= (m.minDepth || 1); });`);
rep(`CONSUMABLES.push({ id: 'mag_pack', name: '标准弹匣', color: '#9fe9ff', glyph: 'gem', weight: 0, minDepth: 1, effect: {}, desc: '换弹底材，无附加效果' });`,
`CONSUMABLES.push({ id: 'mag_pack', name: '标准弹匣', color: '#9fe9ff', glyph: 'gem', tier: 'common', use: 'mag', weight: 0, minDepth: 1, effect: {}, desc: '换弹底材，无附加效果' });`);
rep(`function specialFor(c) {
  var e = c.effect || {};`,
`function specialFor(c) {
  if (c.ammo && SPECIALS[c.ammo]) return c.ammo;
  var e = c.effect || {};`);

/* ---------- 说明文字 ---------- */
rep(`function itemEffectText(spec) {
  var e = spec.effect || {}, out = [];`,
`function itemEffectText(spec) {
  var e = spec.effect || {}, out = [], A = itemAmount(spec);
  if (spec.kind === 'heal' && e.healPct) { out.push('回复 ' + (A.live ? A.heal + '（' : '') + Math.round(e.healPct * 100) + '% 最大生命' + (A.live ? '）' : '')); if (e.cleanse) out.push('清除负面状态'); return out; }
  if (spec.kind === 'atk') return ['攻击永久 +' + A.stat + '（每 6 层 +1）'];
  if (spec.kind === 'def') return ['防御永久 +' + A.stat + '（每 6 层 +1）'];
  if (spec.kind === 'maxhp') return ['生命上限永久 +' + A.maxHp + '（3+层/3）'];
  if (spec.kind === 'xp' && e.xpPct) return ['经验 +' + (A.live ? A.xp + '（' : '') + Math.round(e.xpPct * 100) + '% 升级所需' + (A.live ? '）' : '')];
  if (spec.kind === 'credit') return ['信用点 +' + A.credits + '（' + (e.credits || 6) + '+2×层）'];
  if (spec.kind === 'buff' && e.shieldPct) return ['护盾 ' + (A.live ? A.shield + '（' : '') + Math.round(e.shieldPct * 100) + '% 最大生命' + (A.live ? '）' : '') + '，持续 ' + (e.duration || 5) + ' 回合'];
  if (spec.kind === 'buff' && e.buff === 'regen' && e.healPct) return ['每回合回复 ' + (A.live ? A.heal + '（' : '') + Math.round(e.healPct * 100) + '% 最大生命' + (A.live ? '）' : '') + '，持续 ' + (e.duration || 5) + ' 回合'];
  if (spec.kind === 'random') return ['随机：修复 20% / 攻击或防御 +1 / 经验 / 信用点 / 一件消耗品'];`);
rep(`function consEffectText(spec) {
  var e = spec.effect || {}, out = [];`,
`function consEffectText(spec) {
  var cfx = CONS_FX[spec.use || (spec.id === 'mag_pack' ? 'mag' : '')];
  if (cfx) return cfx.text(G.state === 'play' && !!p && !!G.mod && !!G.map);
  var e = spec.effect || {}, out = [];`);
rep(`var KIND_LABEL = { heal: '恢复', atk: '攻击', def: '防御', xp: '经验', score: '分数', maxhp: '上限', buff: '增益', random: '随机' };`,
`var KIND_LABEL = { heal: '恢复', atk: '攻击', def: '防御', xp: '经验', score: '分数', credit: '信用点', maxhp: '上限', buff: '增益', random: '随机' };`);
rep(`  var consRows = CONSUMABLES.map(function (c) {
    return cxLine(c.name, '道具', [consEffectText(c).join('，') + ' · ' + c.desc]);
  }).join('');`,
`  var consRows = CONSUMABLES.map(function (c) {
    var T = TIER_INFO[c.tier || 'common'] || TIER_INFO.common;
    return cxLine(c.name, T.name + (c.ammo ? ' · 换弹：' + (SPECIALS[c.ammo] || {}).name : ''), [consEffectText(c).join('；'), '<span style="color:#56707e">' + c.desc + '</span>'], T.color);
  }).join('');`);
rep(`  html += det('消耗品图鉴', CONSUMABLES.length, consRows);`,
`  html += det('消耗品图鉴', CONSUMABLES.length, consRows);
  html += econCodexHTML(det, cxLine);`);

/* ---------- 道具详情卡 ---------- */
rep(`  var eff = consEffectText(c).map(function (t) { return '· ' + t; }).join('<br>');
  overlay.innerHTML = '<div class="card">' +
    '<div class="kicker">消耗道具 · 点击使用会消耗一回合</div>' +
    '<div class="sheet-name" style="color:' + c.color + '">' + c.name + '</div>' +`,
`  var eff = consEffectText(c).map(function (t) { return '· ' + t; }).join('<br>');
  var T = TIER_INFO[c.tier || 'common'] || TIER_INFO.common;
  if (classDef().id === 'assault' && c.id !== 'mag_pack') eff += '<br><span style="color:#9fe9ff">· 换弹底材：' + (SPECIALS[specialFor(c)] || {}).name + '</span>';
  overlay.innerHTML = '<div class="card item-sheet" style="--it:' + T.color + '">' +
    '<div class="kicker">' + T.name + '消耗品 · 使用消耗一回合</div>' +
    '<div class="sheet-name" style="color:' + c.color + '">' + c.name + '</div>' +`);
rep(`    '<button class="cta" id="useItem">使用</button>' +`,
`    (c.id === 'mag_pack' ? '' : '<button class="cta" id="useItem">使用</button>') +`);
rep(`  $('#useItem').onclick = function () { hideOverlay(); useConsumable(i); };`,
`  var ub = $('#useItem'); if (ub) ub.onclick = function () { hideOverlay(); useConsumable(i); };`);

/* ---------- HUD ---------- */
rep(`  scoreChip.textContent = String(G.score);`,
`  scoreChip.textContent = String(G.score);
  if (creditsChip) {
    creditsChip.style.display = G.mode === 'normal' ? '' : 'none';
    creditsChip.textContent = '¥' + (G.credits || 0);
    if (G.creditPulse && G.creditPulse !== creditsChip._pulse) { creditsChip._pulse = G.creditPulse; creditsChip.classList.remove('pulse'); void creditsChip.offsetWidth; creditsChip.classList.add('pulse'); }
  }`);
rep(`    critbar = $('#critbar'), critFillEl = $('#critfill'), critLabel = $('#critlabel'), cyberBtn = $('#cyberbtn');`,
`    critbar = $('#critbar'), critFillEl = $('#critfill'), critLabel = $('#critlabel'), cyberBtn = $('#cyberbtn'), creditsChip = $('#credits');`);
rep(`  if (G.overclock > 0) html += '<span class="buff" style="color:' + C.green + '">超频 ' + G.overclock + '</span>';`,
`  if (G.overclock > 0) html += '<span class="buff" style="color:' + C.green + '">超频 ' + G.overclock + '</span>';
  if (G.anomaly && ANOMALIES[G.anomaly]) html += '<span class="buff" style="color:' + ANOMALIES[G.anomaly].color + '">' + ANOMALIES[G.anomaly].name + '</span>';
  contractActive().forEach(function (c) { (c.def.terms || []).forEach(function (t) { if (t !== 'stake') html += '<span class="buff" style="color:#ff9aa5">条款·' + CONTRACT_TERMS[t].name + '</span>'; }); });
  if (G.loanFloors > 0) html += '<span class="buff" style="color:#ff2fa8">高利贷 ' + G.loanFloors + '层</span>';`);
rep(`    var label = d.kind === 'shield' ? '盾 ' + Math.max(0, Math.round(b.pool)) + ' · ' + b.turns + 'T' : d.name + ' ' + b.turns;`,
`    var label = d.kind === 'shield' ? '盾 ' + Math.max(0, Math.round(b.pool)) + ' · ' + b.turns + 'T' : d.name + (d.kind === 'atk' && b.def ? ' +' + d.amount : '') + ' ' + b.turns;`);
rep(`      html += '<button class="slot" data-i="' + i + '" title="' + c.name + ' · ' + consEffectText(c).join('，') + '">' +`,
`      html += '<button class="slot tier-' + (c.tier || 'common') + '" data-i="' + i + '" title="' + c.name + ' · ' + consEffectText(c).join('，') + '">' +`);

/* ---------- 绘制 ---------- */
rep(`  G.items.forEach(function(it){if(!on(it.x,it.y)||!G.vis[it.y]||!G.vis[it.y][it.x])return;var spec=it.it||it.cons;`,
`  drawSites(view,ambient||now);
  G.items.forEach(function(it){if(!on(it.x,it.y)||!G.vis[it.y]||!G.vis[it.y][it.x])return;if(drawItemFx(it,view,now))return;var spec=it.it||it.cons;`);
rep(`ctx.strokeStyle=G.bossAlive?C.red:C.green;ctx.lineWidth=1.5;ctx.globalAlpha=G.vis[G.stairs.y][G.stairs.x]?1:.4;visualPolygon(stx,sty,tile*.38,6,Math.PI/6);ctx.stroke();`,
`ctx.strokeStyle=G.bossAlive?C.red:C.green;ctx.lineWidth=1.5;ctx.globalAlpha=G.vis[G.stairs.y][G.stairs.x]?1:.4;visualPolygon(stx,sty,tile*.38,6,Math.PI/6);ctx.stroke();if(G.extract){ctx.font='600 '+Math.max(8,Math.round(tile*.26))+'px monospace';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillStyle=C.green;ctx.fillText('撤离',stx,sty-tile*.42);}`);
rep(`  G.items.forEach(function(it){if(G.seen[it.y]&&G.seen[it.y][it.x]){ctx.fillStyle='#b1d3dd';ctx.fillRect(x+it.x*tw,y+it.y*th,1.5,1.5);}});`,
`  G.items.forEach(function(it){if(G.seen[it.y]&&G.seen[it.y][it.x]){ctx.fillStyle='#b1d3dd';ctx.fillRect(x+it.x*tw,y+it.y*th,1.5,1.5);}});drawMinimapEcon(x,y,tw,th);`);
rep(`  var key=[G.turn,G.depth,p.x,p.y,`, `  var key=[G.turn,G.depth,p.x,p.y,G.seenStamp||0,`);

/* ---------- 结算 / 局外 ---------- */
rep(`  G.quests.forEach(function (q) { if (q.done) base += 10; });`,
`  (G.quests || []).forEach(function (q) { if (q.done) base += q.tier === 'lethal' ? 20 : q.tier === 'high' ? 10 : 4; });`);
rep(`    '<div class="hint">最高分 <b>' + G.best + '</b>'`,
`    (G.mode === 'normal' ? '<div class="hint">委托 完成 ' + (G.quests || []).filter(function (q) { return q.done; }).length + ' · 失败 ' + (G.quests || []).filter(function (q) { return q.failed; }).length + ' · 剩余信用点 ¥' + (G.credits || 0) + '</div>' : '') +
    '<div class="hint">最高分 <b>' + G.best + '</b>'`);
rep(`    '<div class="kicker">CHROME PROTOCOL · 义体协议 1.3</div>' +`,
`    '<div class="kicker">DARK ALLEY ECONOMY · 暗巷经济 1.4</div>' +`);
rep(`  var tabs = [['quests', '任务'], ['codex', '图鉴'], ['ach', '成就'], ['help', '说明']];`,
`  var tabs = [['quests', '委托'], ['codex', '图鉴'], ['ach', '成就'], ['help', '说明']];`);
rep(`    '<div class="pitem"><div><b>任务</b><em>完成抽一份「机遇」，二选一带代价的强化</em></div></div>' +`,
`    '<div class="pitem"><div><b>委托</b><em>每区开始中间人来电，地图「介」设施也能接。低风险跑腿 / 高危脏活 / 致命黑墙合约：条款越狠，报酬越肥（宝箱、核心、押金翻倍）</em></div></div>' +
    '<div class="pitem"><div><b>信用点</b><em>击杀、信用芯片、委托与宝箱获得，在黑市、重铸池、义体医生、轮盘、保险箱消费</em></div></div>' +
    '<div class="pitem"><div><b>宝箱</b><em>守卫、挑战房、委托、保险箱掉落；打开后「已入账」自动领取，再三选一。光柱颜色即品质</em></div></div>' +
    '<div class="pitem"><div><b>区域异常</b><em>部分楼层断电、封锁、矿脉、夜市或超频，进入时有横幅提示</em></div></div>' +`);
rep(`    '<div class="pitem"><div><b>特殊房</b><em>商店花信用点，泉水回血，挑战房打精英拿模组</em></div></div>' +`,
`    '<div class="pitem"><div><b>设施</b><em>地图上的霓虹招牌：市=黑市 掮=掮客 铸=重铸池 泉=冷却泉 医=义体医生 契=血契 赌=轮盘 锁=保险箱 介=中间人 战=挑战。站在上面按 ◉ 可再次打开</em></div></div>' +`);
rep(`    '<div class="pitem"><div><b>目标</b><em>下潜 15 层；第 5/10/15 层有守卫，击败才能下楼</em></div></div>' +`,
`    '<div class="pitem"><div><b>目标</b><em>下潜 15 层；第 5/10/15 层有守卫，击败才能下楼。最终守卫倒下后拿走核心箱，踏上出口撤离</em></div></div>' +`);
rep(`    '<div class="pitem"><div><b>道具</b><em>底部 4 格，点一下使用（会消耗一回合）</em></div></div>' +`,
`    '<div class="pitem"><div><b>道具</b><em>底部 4 格，点开看实时数值再使用（消耗一回合）。效果随攻击、最大生命与层数成长；边框颜色是品质</em></div></div>' +`);

s = s.replace('// ECONOMY_V14', '// ECONOMY_V14 (applied)');
new (require('vm').Script)(s);
fs.writeFileSync(FILE, s);
console.log('economy patch applied');
