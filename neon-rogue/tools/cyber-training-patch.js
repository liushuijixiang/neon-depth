#!/usr/bin/env node
'use strict';

/*
 * Training-only patch. Intentionally NOT applied by the authoring subagent.
 * Parent: node tools/cyber-training-patch.js --check  (in-memory preflight)
 * Parent: node tools/cyber-training-patch.js          (apply to current game.js)
 *
 * Acorn locates unique function declarations, the renderMenu training binding
 * block, and window.__neon.test. No saved game.js snapshot, broad regex replace,
 * content-table edits, mainline UI edits, or save/reward edits are used.
 *
 * Integration contract: calcMods must dynamically aggregate cyberChips. The
 * main thread's chip fix owns that behavior; this patch never adds chip stats
 * to runMod/item stats, so chips cannot be double-counted by the two patches.
 */
const fs = require('fs');
const path = require('path');
const acorn = require('/root/workspace/neon-tooling/node_modules/acorn');

// These declarations are serialized into the game's existing IIFE, not run in Node.
function trainReady() {
  return G.mode === 'train' && G.state === 'play' && !!p && !G.busy;
}
function trainEsc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function trainQualities() {
  var order = ['red', 'orange', 'purple', 'blue', 'green', 'gray'];
  return order.filter(function (q) { return !!QUALITY[q]; }).concat(Object.keys(QUALITY).filter(function (q) { return order.indexOf(q) < 0; }));
}
function trainUIState() {
  if (!G.trainUI) G.trainUI = {
    panel: 'gear', slot: 'handL', quality: 'all', chipId: CHIPS[0].id,
    chipQuality: 'red', chipIndex: 0, itemIndex: 0,
    stage: 'all', enemyType: 'all', enemyGroup: 'normal', depth: String(G.depth || 1)
  };
  var u = G.trainUI;
  if (!CYBER_SLOTS.some(function (s) { return s.id === u.slot; })) u.slot = CYBER_SLOTS[0].id;
  var chips = (G.cyberChips && G.cyberChips[u.slot]) || [];
  var m = MOD_BY[(G.cyber || {})[u.slot]], cap = m ? (QUALITY[m.quality] || QUALITY.gray).slots : 0;
  u.chipIndex = Math.max(0, Math.min(Number(u.chipIndex) || 0, chips.length, Math.max(0, cap - 1)));
  u.itemIndex = Math.max(0, Math.min(Number(u.itemIndex) || 0, (G.inv || []).length, 3));
  u.depth = String(G.depth || 1);
  return u;
}
function trainGearPool(slotId, quality) {
  var sl = CYBER_SLOTS.find(function (s) { return s.id === slotId; });
  if (!sl) return [];
  var order = trainQualities();
  return MODS.filter(function (m) {
    return m.slot === sl.cat && (!quality || quality === 'all' || m.quality === quality);
  }).slice().sort(function (a, b) {
    return order.indexOf(a.quality) - order.indexOf(b.quality) || a.name.localeCompare(b.name);
  });
}
function trainBossPool() {
  return (typeof EXT_BOSSES !== 'undefined' && EXT_BOSSES.length ? EXT_BOSSES : BOSSES).slice();
}
function trainEnemyPool(stage, type) {
  return MONSTERS.filter(function (m) {
    if (m.boss) return false;
    if (type && type !== 'all' && m.ai !== type) return false;
    if (!stage || stage === 'all') return true;
    var lo = (Number(stage) - 1) * 5 + 1, hi = Number(stage) * 5;
    return (m.minDepth || 1) <= hi && (m.maxDepth || MAX_DEPTH) >= lo;
  });
}
function trainPresets() {
  return [
    {
      id: 'timeblade', name: '时缓刀客',
      desc: '斯安威斯坦冻结敌人以便走位；螳螂刀蓄力/连斩、单分子线范围流血，血泵负责续航。时缓会在攻击后结束，不是无限连击。',
      gear: { eyeL: 'crit_chip', eyeR: 'hunt_eye_r', handL: 'mantis_blade', handR: 'monowire', body: 'vampire', spine: 'sandevistan', legL: 'reinforced_tendons', legR: 'hunt_leg_r' },
      chips: ['atk', 'crit', 'hp', 'def']
    },
    {
      id: 'swarm', name: '工程蜂群',
      desc: '蜂群协议主动召唤僚机，并将僚机近战伤害乘以 1.5；相位墙阻挡并震伤周围敌人，弹射发射器布雷。义体主动不要求工程师职业；先召唤，再布场。',
      gear: { eyeL: 'eye_red', eyeR: 'quantum_processor', handL: 'wall_blast', handR: 'projectile_launcher', body: 'second_heart', spine: 'drone_swarm', legL: 'kinetic_legs', legR: 'reinforced_tendons' },
      chips: ['atk', 'hp', 'def', 'crit']
    },
    {
      id: 'gunboost', name: '枪械增幅',
      desc: '过载护手 II 与脉冲肩甲 II 提供攻击和多目标脉冲；暴击义眼增加暴击/暴伤，智能连接器可扫描标记。普通枪械射击仍需突袭者；其他职业可用这些义体主动，不会自动切职业。',
      gear: { eyeL: 'crit_chip', eyeR: 'target_analysis', handL: 'assault_hand_r', handR: 'smart_link', body: 'body_red', spine: 'assault_spine_r', legL: 'assault_leg_r', legR: 'legL_red' },
      chips: ['atk', 'crit', 'hp', 'def']
    }
  ];
}
function trainCatalog() {
  return JSON.parse(JSON.stringify({
    slots: CYBER_SLOTS, qualities: QUALITY, mods: MODS, chips: CHIPS,
    consumables: CONSUMABLES, monsters: trainEnemyPool('all', 'all'), bosses: trainBossPool(), presets: trainPresets()
  }));
}
function trainState() {
  if (G.mode !== 'train' || !p) return null;
  return JSON.parse(JSON.stringify({
    mode: G.mode, classId: G.classId, depth: G.depth, level: p.level,
    stats: { hp: p.hp, maxHp: p.maxHp, atk: effAtk(), def: effDef(), critBonus: G.mod.crit || 0, dodgeBonus: G.mod.dodge || 0 },
    bonus: G.trainBonus, cyber: G.cyber, chips: G.cyberChips, chipTotals: chipStats(), inventory: G.inv,
    active: CYBER_SLOTS.map(function (sl) {
      var m = MOD_BY[G.cyber[sl.id]];
      return m && m.active ? { slot: sl.id, id: m.id, active: m.active, cooldown: G.cyberCd[m.id] || 0, growth: G.cyberGrowth[m.id] || { lv: 1, xp: 0 } } : null;
    }).filter(Boolean),
    enemies: G.enemies.map(function (e) { return { id: e.id, boss: !!e.boss, hp: e.hp, maxHp: e.maxHp, uid: e.uid, ownerId: e.ownerId, summoned: !!e.summoned, trainingDepth: e.trainingDepth }; }),
    ui: trainUIState()
  }));
}
function trainSyncModFlags() {
  // installCyber/unequipCyber store flags by id, but left/right slots may share an id.
  G.mods = {};
  CYBER_SLOTS.forEach(function (sl) { var id = G.cyber[sl.id]; if (id && MOD_BY[id]) G.mods[id] = 1; });
}
function trainRefresh(resetScroll) {
  if (!trainReady()) return false;
  recalc(); computeFOV(); updateHUD();
  if (G.modal === 'menu' && G.menuTab === 'train') {
    var outer = overlay.querySelector('.plist'), top = outer ? outer.scrollTop : 0, saved = {};
    if (!resetScroll) Array.prototype.forEach.call(overlay.querySelectorAll('[data-tr-scroll]'), function (el) { saved[el.getAttribute('data-tr-scroll')] = el.scrollTop; });
    renderMenu();
    var next = overlay.querySelector('.plist');
    if (next) next.scrollTop = resetScroll ? 0 : top;
    if (!resetScroll) Array.prototype.forEach.call(overlay.querySelectorAll('[data-tr-scroll]'), function (el) { el.scrollTop = saved[el.getAttribute('data-tr-scroll')] || 0; });
  }
  return true;
}
function trainChoose(key, value) {
  if (!trainReady()) return false;
  var u = trainUIState(), v = String(value), valid = false;
  if (key === 'panel') valid = ['gear', 'chips', 'items', 'enemies', 'presets', 'params'].indexOf(v) >= 0;
  else if (key === 'slot') valid = CYBER_SLOTS.some(function (s) { return s.id === v; });
  else if (key === 'quality') valid = v === 'all' || Object.prototype.hasOwnProperty.call(QUALITY, v);
  else if (key === 'chipQuality') valid = Object.prototype.hasOwnProperty.call(QUALITY, v);
  else if (key === 'chipId') valid = CHIPS.some(function (c) { return c.id === v; });
  else if (key === 'chipIndex') {
    var m = MOD_BY[G.cyber[u.slot]], chips = G.cyberChips[u.slot] || [];
    valid = /^\d+$/.test(v) && !!m && Number(v) < (QUALITY[m.quality] || QUALITY.gray).slots && Number(v) <= chips.length;
  } else if (key === 'itemIndex') valid = /^\d+$/.test(v) && Number(v) < 4 && Number(v) <= G.inv.length;
  else if (key === 'stage') valid = ['all', '1', '2', '3'].indexOf(v) >= 0;
  else if (key === 'enemyType') valid = v === 'all' || MONSTERS.some(function (m2) { return !m2.boss && m2.ai === v; });
  else if (key === 'enemyGroup') valid = ['normal', 'boss'].indexOf(v) >= 0;
  else if (key === 'depth') valid = /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= MAX_DEPTH;
  if (!valid) return false;
  u[key] = v;
  if (key === 'depth') G.depth = Number(v);
  if (key === 'slot') u.chipIndex = 0;
  trainRefresh(key !== 'chipId' && key !== 'chipQuality' && key !== 'chipIndex' && key !== 'itemIndex');
  return true;
}
function trainInstall(slotId, id, defer) {
  if (!trainReady()) return false;
  var m = MOD_BY[id];
  if (!m || !slotAccepts(m, slotId)) return false;
  if (G.cyber[slotId] === id) return true;
  // Training keeps fitting chips on the chosen limb; overflow is discarded, not rewarded.
  var chips = (G.cyberChips[slotId] || []).slice();
  G.cyberChips[slotId] = [];
  installCyber(id, slotId); // No applyMod class filter: every real mod is legal in training.
  G.cyberChips[slotId] = chips.slice(0, (QUALITY[m.quality] || QUALITY.gray).slots);
  trainSyncModFlags();
  if (!defer) trainRefresh(false);
  return true;
}
function trainRemove(slotId, defer) {
  if (!trainReady() || !CYBER_SLOTS.some(function (s) { return s.id === slotId; }) || !G.cyber[slotId]) return false;
  G.cyberChips[slotId] = [];
  unequipCyber(slotId);
  trainSyncModFlags();
  if (!defer) trainRefresh(false);
  return true;
}
function trainSetChip(slotId, index, id, quality) {
  if (!trainReady()) return false;
  var m = MOD_BY[G.cyber[slotId]], chips = G.cyberChips[slotId] || [], n = Number(index);
  if (!m || !CHIPS.some(function (c) { return c.id === id; }) || !Object.prototype.hasOwnProperty.call(QUALITY, quality)) return false;
  var cap = (QUALITY[m.quality] || QUALITY.gray).slots;
  if (!isFinite(n) || Math.floor(n) !== n || n < 0 || n >= cap || n > chips.length) return false;
  var c = makeChip(id, quality);
  chips[n] = c; G.cyberChips[slotId] = chips;
  trainRefresh(false);
  return c;
}
function trainRemoveChip(slotId, index) {
  if (!trainReady()) return false;
  var chips = G.cyberChips[slotId] || [], n = Number(index);
  if (!isFinite(n) || Math.floor(n) !== n || n < 0 || n >= chips.length) return false;
  chips.splice(n, 1); trainRefresh(false); return true;
}
function trainSetConsumable(id, index) {
  if (!trainReady() || !Object.prototype.hasOwnProperty.call(CONS, id)) return false;
  var n = Number(index);
  if (!isFinite(n) || Math.floor(n) !== n || n < 0 || n > G.inv.length || n >= 4) return false;
  G.inv[n] = id; // Explicit replacement avoids addConsumable's overflow score/scrap reward.
  trainRefresh(false); return true;
}
function trainRemoveConsumable(index) {
  if (!trainReady()) return false;
  var n = Number(index);
  if (!isFinite(n) || Math.floor(n) !== n || n < 0 || n >= G.inv.length) return false;
  G.inv.splice(n, 1); trainRefresh(false); return true;
}
function trainPreset(id) {
  if (!trainReady()) return false;
  var preset = trainPresets().find(function (x) { return x.id === id; });
  if (!preset || !CYBER_SLOTS.every(function (sl) { return slotAccepts(MOD_BY[preset.gear[sl.id]], sl.id); })) return false;
  G.cyberChips = {}; G.chips = [];
  CYBER_SLOTS.forEach(function (sl) {
    trainInstall(sl.id, preset.gear[sl.id], true);
    var m = MOD_BY[preset.gear[sl.id]], count = (QUALITY[m.quality] || QUALITY.gray).slots;
    G.cyberChips[sl.id] = [];
    for (var i = 0; i < count; i++) G.cyberChips[sl.id].push(makeChip(preset.chips[i % preset.chips.length], 'red'));
  });
  trainSyncModFlags(); trainRefresh(false);
  toast('训练预设 · ' + preset.name, 'good');
  return true;
}
function trainUseActive(id) {
  if (!trainReady()) return false;
  var m = MOD_BY[id];
  if (!m || !m.active || !CYBER_SLOTS.some(function (sl) { return G.cyber[sl.id] === id; }) || (G.cyberCd[id] || 0) > 0) return false;
  hideOverlay();
  useCyberActive(id); // The real action, including targeting, cooldown, and turn cost.
  return true;
}
function trainBossArena(id) {
  if (!trainReady()) return false;
  var spec = trainBossPool().find(function (b) { return b.id === id; });
  if (!spec) return false;
  G.depth = Math.min(MAX_DEPTH, Math.max(1, (spec.tier || 1) * 5));
  G.allies = []; G.walls = []; G.control = null; G.sandev = null; G.sandevTrail = []; G.tacticFx = [];
  genBossFloor(G.depth, spec);
  G.stairs = null; // The training arena must never lead into normal progression.
  G.enemies.forEach(function (e) { e.trainingDepth = G.depth; });
  trainRefresh(true);
  return G.enemies.find(function (e) { return e.boss && e.id === id; }) || false;
}
function trainOption(value, label, selected) {
  return '<option value="' + trainEsc(value) + '"' + (String(value) === String(selected) ? ' selected' : '') + '>' + trainEsc(label) + '</option>';
}
function trainSelect(key, label, options, value) {
  return '<label class="tr-field">' + trainEsc(label) + '<select data-tr-select="' + key + '">' + options.map(function (o) { return trainOption(o.id, o.name, value); }).join('') + '</select></label>';
}
function trainSlotOptions() {
  return CYBER_SLOTS.map(function (sl) {
    var m = MOD_BY[G.cyber[sl.id]];
    return { id: sl.id, name: sl.name + ' · ' + (m ? m.name : '空槽') };
  });
}
function trainModInfo(m, slotId) {
  if (!m) return '<div class="tr-note">此部位尚未安装义体。</div>';
  var q = QUALITY[m.quality] || QUALITY.gray, chips = slotId ? (G.cyberChips[slotId] || []) : [];
  var lines = '<strong style="color:' + trainEsc(q.color) + '">' + trainEsc(m.name) + ' · ' + trainEsc(q.name) + '</strong>' +
    '<small>' + trainEsc(m.id) + (m.cls ? ' · 原职业标签 ' + trainEsc((CLASS_BY[m.cls] || {}).name || m.cls) + '（训练不限）' : '') + '</small>' +
    '<p>' + trainEsc(m.desc) + '</p><p>数值：' + trainEsc(cyberStatText(m).join(' · ') || '无被动属性') + '</p>' +
    '<p>芯片槽 ' + (slotId ? chips.length + '/' : '') + q.slots + (slotId ? ' · ' + trainEsc(chipAggText(chips)) : '') + '</p>';
  if (m.melee) lines += '<p>近战：' + trainEsc(meleeStyleText(m)) + '</p>';
  if (m.active) {
    lines += '<p class="tr-active">主动 · ' + trainEsc(m.active.name) + ' / CD ' + m.active.cd + ' 回合' + (slotId ? ' / ' + (G.cyberCd[m.id] > 0 ? '剩余 ' + G.cyberCd[m.id] : '就绪') + ' / ' + trainEsc(cyberGrowthText(m.id)) : '') + '</p><p>' + trainEsc(activeDesc(m)) + '</p>';
    if (slotId) lines += '<button class="tab" data-tr-active="' + trainEsc(m.id) + '"' + (G.cyberCd[m.id] > 0 ? ' disabled' : '') + '>返回场地并试放</button>';
  }
  return lines;
}
function trainLoadoutHTML() {
  var used = CYBER_SLOTS.filter(function (sl) { return !!G.cyber[sl.id]; }).length;
  var h = '<details class="tr-loadout"><summary>查看当前装配 / 主动 / 芯片 · ' + used + '/' + CYBER_SLOTS.length + '</summary><div class="tr-scroll" data-tr-scroll="loadout">';
  CYBER_SLOTS.forEach(function (sl) {
    h += '<article class="tr-entry"><button class="tab" data-tslot="' + sl.id + '">' + trainEsc(sl.name) + ' · 选择义体</button>' + trainModInfo(MOD_BY[G.cyber[sl.id]], sl.id) + '</article>';
  });
  return h + '</div></details>';
}
function trainGearHTML(u) {
  var m = MOD_BY[G.cyber[u.slot]], pool = trainGearPool(u.slot, u.quality);
  var qualities = [{ id: 'all', name: '全部品质' }].concat(trainQualities().map(function (q) { return { id: q, name: QUALITY[q].name + '品质' }; }));
  var h = '<div class="tr-fields">' + trainSelect('slot', '① 具体部位', trainSlotOptions(), u.slot) + trainSelect('quality', '② 品质筛选', qualities, u.quality) + '</div>';
  h += '<details class="tr-loadout"><summary>当前部位：' + trainEsc(m ? m.name : '空槽') + ' · 查看数值/主动</summary><article class="tr-entry">' + trainModInfo(m, u.slot) + (m ? '<button class="tab" data-tr="removegear">卸下此部位（含芯片）</button>' : '') + '</article></details>';
  h += '<div class="tr-note">③ 直接点选义体 · ' + pool.length + ' 件。职业、掉落与成就标签均不限制训练；左右眼/手/腿只按部位类别匹配。换装保留容纳得下的芯片，多余芯片销毁。</div><div class="tr-scroll" data-tr-scroll="gear">';
  pool.forEach(function (item) {
    var on = G.cyber[u.slot] === item.id;
    h += '<article class="tr-entry' + (on ? ' tr-equipped' : '') + '">' + trainModInfo(item) + '<button class="tab" data-tr-equip="' + trainEsc(item.id) + '"' + (on ? ' disabled' : '') + '>' + (on ? '已装配' : '安装到' + trainEsc((CYBER_SLOTS.find(function (sl) { return sl.id === u.slot; }) || {}).name)) + '</button></article>';
  });
  if (!pool.length) h += '<div class="tr-note">该部位没有此品质；请选择“全部品质”。</div>';
  return h + '</div>';
}
function trainChipsHTML(u) {
  var h = trainSelect('slot', '目标义体部位', trainSlotOptions(), u.slot), m = MOD_BY[G.cyber[u.slot]];
  if (!m) return h + '<div class="tr-note">先在此部位安装义体，再直接选择芯片种类、品质及目标芯片槽。</div><button class="tab" data-tr-panel="gear">去选义体</button>';
  var chips = G.cyberChips[u.slot] || [], cap = (QUALITY[m.quality] || QUALITY.gray).slots, positions = [];
  for (var i = 0; i < Math.min(cap, chips.length + 1); i++) positions.push({ id: String(i), name: '槽 ' + (i + 1) + ' · ' + (chips[i] ? chipText(chips[i]) : '新增芯片') });
  h += '<div class="tr-note">' + trainEsc(m.name) + ' · ' + chips.length + '/' + cap + ' 槽 · ' + trainEsc(chipAggText(chips)) + '</div>';
  h += '<div class="tr-fields">' + trainSelect('chipIndex', '目标芯片槽', positions, u.chipIndex) + trainSelect('chipId', '芯片种类（全部）', CHIPS.map(function (c) { return { id: c.id, name: c.name }; }), u.chipId) + trainSelect('chipQuality', '生成品质（全部）', trainQualities().map(function (q) { return { id: q, name: QUALITY[q].name + '品质' }; }), u.chipQuality) + '</div>';
  h += '<div class="tr-actions"><button class="tab" data-tr="setchip">生成并' + (chips[Number(u.chipIndex)] ? '替换选中芯片' : '安装芯片') + '</button><button class="tab" data-tr="removechip"' + (chips[Number(u.chipIndex)] ? '' : ' disabled') + '>删除选中芯片</button><button class="tab" data-tr="clearchips">清空全身/备用芯片</button></div>';
  h += '<div class="tr-note">按原版 makeChip 生成真实数值；蓝/紫 1 条、橙/红 2 条副词条仍随机，不伪造词条或突破容量。替换/删除仅影响本次训练。</div><div class="tr-scroll" data-tr-scroll="chips">';
  for (var n = 0; n < cap; n++) h += '<div class="tr-entry">芯片槽 ' + (n + 1) + '：' + trainEsc(chips[n] ? chipText(chips[n]) : '空') + '</div>';
  return h + '</div>';
}
function trainItemsHTML(u) {
  var positions = [];
  for (var i = 0; i < Math.min(4, G.inv.length + 1); i++) positions.push({ id: String(i), name: '背包格 ' + (i + 1) + ' · ' + (CONS[G.inv[i]] ? CONS[G.inv[i]].name : '新增道具') });
  var h = trainSelect('itemIndex', '点击道具后放入的背包格', positions, u.itemIndex);
  h += '<div class="tr-note">全部 ' + CONSUMABLES.length + ' 种，包含标准弹匣；不按掉落层数过滤。保留 4 格背包，已满时明确替换，不转成废料/分数。道具效果随当前模拟深度 B' + G.depth + ' 缩放。</div><div class="tr-actions"><button class="tab" data-tr="removeitem"' + (G.inv[Number(u.itemIndex)] ? '' : ' disabled') + '>删除选中格道具</button><button class="tab" data-tr="clearitems">清空背包</button></div><div class="tr-scroll" data-tr-scroll="items">';
  CONSUMABLES.forEach(function (c) {
    h += '<article class="tr-entry"><strong style="color:' + trainEsc(c.color) + '">' + trainEsc(c.name) + '</strong><small>' + trainEsc(c.id) + '</small><p>' + trainEsc(c.desc) + '</p><p>基础效果：' + trainEsc(consEffectText(c).join(' · ') || '换弹底材，无附加效果') + '</p><button class="tab" data-tr-item="' + trainEsc(c.id) + '">放入背包格 ' + (Number(u.itemIndex) + 1) + '</button></article>';
  });
  return h + '</div>';
}
function trainEnemiesHTML(u) {
  var bosses = trainBossPool(), normals = trainEnemyPool('all', 'all'), types = [];
  normals.forEach(function (m) { if (types.indexOf(m.ai) < 0) types.push(m.ai); });
  var depths = []; for (var d = 1; d <= MAX_DEPTH; d++) depths.push({ id: String(d), name: 'B' + d + ' · 第' + Math.ceil(d / 5) + '阶段' });
  var h = '<div class="tr-fields">' + trainSelect('enemyGroup', '目标库', [{ id: 'normal', name: '全部普通怪 · ' + normals.length }, { id: 'boss', name: '全部 Boss · ' + bosses.length }], u.enemyGroup) + trainSelect('stage', '内容阶段筛选', [{ id: 'all', name: '全部阶段' }, { id: '1', name: '一阶段 B1–5' }, { id: '2', name: '二阶段 B6–10' }, { id: '3', name: '三阶段 B11–15' }], u.stage) + trainSelect('depth', '场景模拟深度', depths, u.depth);
  if (u.enemyGroup === 'normal') h += trainSelect('enemyType', '行为类型', [{ id: 'all', name: '全部行为' }].concat(types.map(function (t) { return { id: t, name: AI_LABEL[t] || t }; })), u.enemyType);
  h += '</div><div class="tr-note">模拟深度影响新敌人、后续召唤和消耗品，不重算场上旧敌人；普通怪沿用原版随机精英规则。内容阶段仅筛选列表。当前场上 ' + G.enemies.length + ' 个目标。</div><div class="tr-actions"><button class="tab" data-tr="clear">清除敌人/预警</button><button class="tab" data-tr="arena">重建空场（清场）</button></div><div class="tr-scroll" data-tr-scroll="enemies">';
  if (u.enemyGroup === 'normal') {
    var pool = trainEnemyPool(u.stage, u.enemyType);
    pool.forEach(function (m) {
      h += '<article class="tr-entry"><strong style="color:' + trainEsc(m.color) + '">' + trainEsc(m.name) + '</strong><small>' + trainEsc(m.id) + ' · ' + trainEsc(AI_LABEL[m.ai] || m.ai) + ' · B' + (m.minDepth || 1) + '–' + (m.maxDepth || MAX_DEPTH) + '</small><p>' + trainEsc(m.desc) + '</p><button class="tab" data-spawn="' + trainEsc(m.id) + '">放置 · 模拟 B' + G.depth + '</button></article>';
    });
    if (!pool.length) h += '<div class="tr-note">当前阶段/类型没有匹配目标；可切回“全部”。</div>';
  } else {
    bosses.forEach(function (b, index) {
      if (u.stage !== 'all' && Number(u.stage) !== Number(b.tier)) return;
      h += '<article class="tr-entry"><strong style="color:' + trainEsc(b.color) + '">' + trainEsc(b.name) + ' · T' + b.tier + '</strong><small>' + trainEsc(b.id) + '</small><p>' + trainEsc(b.desc) + '</p><div class="tr-actions"><button class="tab" data-spawnboss="' + index + '">放置到当前场地</button><button class="tab" data-tr-bossarena="' + trainEsc(b.id) + '">专属竞技场（清场）</button></div></article>';
    });
  }
  return h + '</div><div class="tr-note">专属竞技场采用 Boss 原场地/阶数深度，清除敌我单位及障碍并移除楼梯；保留义体、芯片、等级、背包和当前生命。不生成核心奖励。</div>';
}
function trainPresetsHTML() {
  var h = '<div class="tr-note">应用预设会替换八部位及全身/备用芯片，按品质容量装满真实红芯片（副词条随机）。不改职业、等级、属性加点、技能等级、冷却、背包或核心，也不额外治疗；换装降低生命上限时按原规则截断生命。同名双侧义体共享原版冷却/成长。</div><div class="tr-scroll" data-tr-scroll="presets">';
  trainPresets().forEach(function (preset) {
    h += '<article class="tr-entry"><strong>' + trainEsc(preset.name) + '</strong><p>' + trainEsc(preset.desc) + '</p><details><summary>实际装配清单 / id</summary>';
    CYBER_SLOTS.forEach(function (sl) {
      var id = preset.gear[sl.id], m = MOD_BY[id];
      h += '<p>' + trainEsc(sl.name + '：' + (m ? m.name : '缺失') + ' [' + id + ']') + '</p>';
    });
    h += '</details><p>每部位芯片顺序：' + trainEsc(preset.chips.map(function (id) { var c = CHIPS.find(function (x) { return x.id === id; }); return c ? c.name : id; }).join(' / ')) + '</p><button class="tab" data-tr-preset="' + preset.id + '">应用 · ' + trainEsc(preset.name) + '</button></article>';
  });
  return h + '</div>';
}
function trainParamsHTML() {
  var tb = G.trainBonus || { atk: 0, def: 0, hp: 0 };
  var h = '<div class="tr-entry"><strong>训练等级 ' + p.level + '</strong><div class="tr-actions"><button class="tab" data-tr="lvl-">等级 −</button><button class="tab" data-tr="lvl+">等级 +</button></div><p>沿用训练等级范围 1–30，调整等级后回满生命。</p></div>';
  [['atk', '攻击'], ['def', '防御'], ['hp', '生命']].forEach(function (x) {
    h += '<div class="tr-entry"><strong>' + x[1] + '训练加成 ' + (tb[x[0]] || 0) + '</strong><div class="tr-actions"><button class="tab" data-attr="' + x[0] + '-">−1</button><button class="tab" data-attr="' + x[0] + '+">+1</button></div></div>';
  });
  return h + '<div class="tr-actions"><button class="tab" data-tr="heal">生命回满</button><button class="tab" data-tr="rearm">重置义体冷却</button><button class="tab" data-tr="clear">清除敌人/预警</button><button class="tab" data-tr="emptygear">卸下全身（含芯片）</button></div><div class="tr-note">预设不暗加训练数值；这里的手动加成沿用 −50～200 范围。不写主线存档、仓库、图鉴、成就或核心。</div>';
}
function trainEnsureStyle() {
  if (document.getElementById('neon-training-picker-style')) return;
  var style = document.createElement('style'); style.id = 'neon-training-picker-style';
  style.textContent = '.train-panel{font-size:11px;line-height:1.5;text-align:left;min-width:0}.train-panel *{box-sizing:border-box}.train-panel .tr-overview{padding:7px;border:1px solid #335265;border-radius:8px;color:#cfe8ff}.train-panel .tr-tabs{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}.train-panel .tr-tabs .tab{flex:1 0 27%;min-height:32px;padding:5px}.train-panel .tr-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.train-panel .tr-field{display:block;min-width:0;color:#a8c6d8;font-size:10px;margin-bottom:6px}.train-panel select{display:block;width:100%;min-width:0;max-width:100%;min-height:36px;margin-top:3px;background:#101d2a;color:#eaffff;border:1px solid #40677b;border-radius:6px;padding:5px;font:inherit;font-size:12px}.train-panel option{background:#101d2a;color:#eaffff}.train-panel .tr-scroll{max-height:29vh;max-height:min(32dvh,330px);overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;padding-right:3px;touch-action:pan-y}.train-panel .tr-entry{border:1px solid #2a4557;border-radius:7px;padding:8px;margin:6px 0;min-width:0;overflow-wrap:anywhere;background:rgba(7,19,29,.65)}.train-panel .tr-entry strong{display:block;color:#d9f6ff;font-size:12px}.train-panel .tr-entry small{display:block;color:#83a6b9;font-size:9px}.train-panel .tr-entry p{margin:4px 0;color:#9cbed0;font-size:10px}.train-panel .tr-entry .tr-active{color:#a6eeff}.train-panel .tr-equipped{border-color:#57ffa8}.train-panel .tr-actions{display:flex;gap:5px;flex-wrap:wrap;margin:6px 0}.train-panel .tab{min-height:32px;white-space:normal}.train-panel button:disabled{opacity:.45;cursor:default}.train-panel button:focus-visible,.train-panel select:focus-visible{outline:2px solid #fcee0a;outline-offset:2px}.train-panel .tr-note{font-size:10px;color:#8daebe;margin:7px 0;overflow-wrap:anywhere}.train-panel .tr-loadout{margin:7px 0;border:1px solid #2a4557;border-radius:7px;padding:6px}.train-panel summary{color:#a8dfee;cursor:pointer;min-height:28px;padding:4px}.train-panel .cta{margin-top:10px}@media(max-width:360px){.train-panel .tr-fields{grid-template-columns:minmax(0,1fr)}.train-panel .tr-scroll{max-height:27vh}}';
  document.head.appendChild(style);
}
function bindTrainingMenu() {
  if (!trainReady()) return;
  var root = overlay.querySelector('.train-panel'); if (!root) return;
  function bind(selector, attr, handler, event) {
    Array.prototype.forEach.call(root.querySelectorAll(selector), function (el) {
      el[event || 'onclick'] = function () { handler(el.getAttribute(attr), el); };
    });
  }
  bind('[data-tr]', 'data-tr', trainAction);
  bind('[data-tslot]', 'data-tslot', trainCycleSlot);
  bind('[data-attr]', 'data-attr', trainAttr);
  bind('[data-spawn]', 'data-spawn', function (id) { trainSpawn(id); });
  bind('[data-spawnboss]', 'data-spawnboss', function (id) { trainSpawnBoss(Number(id)); });
  bind('[data-tr-panel]', 'data-tr-panel', function (panel) { trainChoose('panel', panel); });
  bind('[data-tr-select]', 'data-tr-select', function (key, el) { trainChoose(key, el.value); }, 'onchange');
  bind('[data-tr-equip]', 'data-tr-equip', function (id) { trainInstall(trainUIState().slot, id); });
  bind('[data-tr-item]', 'data-tr-item', function (id) { trainSetConsumable(id, trainUIState().itemIndex); });
  bind('[data-tr-preset]', 'data-tr-preset', trainPreset);
  bind('[data-tr-active]', 'data-tr-active', trainUseActive);
  bind('[data-tr-bossarena]', 'data-tr-bossarena', trainBossArena);
}

// Existing functions: replace only their unique Acorn ranges.
function beginTraining() {
  if (!p) return;
  G.trainPending = false; G.mode = 'train'; G.chal = null;
  G.quests = []; G.pendingBoons = 0; G.pendingEvo = 0; p.pending = 0;
  // Installed mods currently inject stats into runMod. Remove only those stats
  // before discarding the old equipment; preserve class/meta/other run bonuses.
  G.runMod = G.runMod || {};
  Object.keys(G.cyber || {}).forEach(function (slot) { var m = MOD_BY[G.cyber[slot]]; if (m) applyModStats(m, -1); });
  G.cyber = {}; G.cyberChips = {}; G.mods = {}; G.modBag = []; G.chips = []; G.cyberCd = {}; G.cyberGrowth = {};
  G.trainBonus = { atk: 0, def: 0, hp: 0 }; G.trainUI = null;
  G.allies = []; G.walls = []; G.control = null; G.sandev = null; G.sandevTrail = []; G.tacticFx = [];
  p.level = 10; p.next = 16 + (p.level - 1) * 8;
  recalc(); p.hp = p.maxHp;
  genTrainMap(); hideOverlay();
  G.modal = null; G.paused = false; G.busy = false; G.state = 'play';
  computeFOV(); updateHUD();
  toast('训练场 · 全部义体/芯片/目标可直接选择', 'good');
  G.menuTab = 'train'; openMenu('train');
}
function trainHTML() {
  if (G.mode !== 'train' || !p) return '';
  trainEnsureStyle();
  var u = trainUIState();
  var h = '<section class="train-panel"><div class="tr-overview"><b>义体试验场 · ' + trainEsc(classDef().name) + '</b><br>Lv.' + p.level + ' · 生命 ' + p.hp + '/' + p.maxHp + ' · 攻 ' + effAtk() + ' / 防 ' + effDef() + '<br>暴击加成 ' + Math.round((G.mod.crit || 0) * 100) + '% · 闪避加成 ' + Math.round((G.mod.dodge || 0) * 100) + '% · 模拟 B' + G.depth + '</div><div class="tr-note">本次训练临时配置，不写主线存档/仓库，不发核心、成就奖励。</div><div class="tr-tabs">';
  [['gear', '义体'], ['chips', '芯片'], ['items', '消耗品'], ['enemies', '敌人 / Boss'], ['presets', '强力组合'], ['params', '参数']].forEach(function (tab) {
    h += '<button class="tab' + (u.panel === tab[0] ? ' on' : '') + '" data-tr-panel="' + tab[0] + '" aria-pressed="' + (u.panel === tab[0] ? 'true' : 'false') + '">' + tab[1] + '</button>';
  });
  h += '</div>';
  if (u.panel === 'gear') h += trainGearHTML(u);
  else if (u.panel === 'chips') h += trainChipsHTML(u);
  else if (u.panel === 'items') h += trainItemsHTML(u);
  else if (u.panel === 'enemies') h += trainEnemiesHTML(u);
  else if (u.panel === 'presets') h += trainPresetsHTML();
  else h += trainParamsHTML();
  return h + trainLoadoutHTML() + '<button class="cta" data-tr="exit">退出训练 · 返回主菜单</button></section>';
}
function trainAction(a) {
  if (!trainReady()) return false;
  var u = trainUIState();
  if (a === 'lvl+' || a === 'lvl-') {
    p.level = Math.max(1, Math.min(30, p.level + (a === 'lvl+' ? 1 : -1)));
    p.next = 16 + (p.level - 1) * 8; recalc(); p.hp = p.maxHp;
  } else if (a === 'heal') p.hp = p.maxHp;
  else if (a === 'clear') { G.enemies = []; G.bossAlive = false; G.bossName = ''; G.hazards = []; G.mines = []; G.tacticFx = []; }
  else if (a === 'arena') { G.allies = []; G.walls = []; G.control = null; G.sandev = null; G.sandevTrail = []; G.tacticFx = []; genTrainMap(); }
  else if (a === 'rearm') G.cyberCd = {};
  else if (a === 'removegear') return trainRemove(u.slot);
  else if (a === 'emptygear') { CYBER_SLOTS.forEach(function (sl) { trainRemove(sl.id, true); }); G.cyberChips = {}; G.chips = []; }
  else if (a === 'setchip') return trainSetChip(u.slot, u.chipIndex, u.chipId, u.chipQuality);
  else if (a === 'removechip') return trainRemoveChip(u.slot, u.chipIndex);
  else if (a === 'clearchips') { G.cyberChips = {}; G.chips = []; }
  else if (a === 'removeitem') return trainRemoveConsumable(u.itemIndex);
  else if (a === 'clearitems') G.inv = [];
  else if (a === 'fullgear') return trainChoose('panel', 'presets');
  else if (a === 'chips') return trainChoose('panel', 'chips');
  else if (a === 'potions') return trainChoose('panel', 'items');
  else if (a === 'exit') { hideOverlay(); G.state = 'menu'; G.modal = null; G.paused = false; menuScreen(); return true; }
  else return false;
  trainRefresh(false); return true;
}
function trainAttr(a) {
  if (!trainReady() || !/^(atk|def|hp)[+-]$/.test(a)) return false;
  if (!G.trainBonus) G.trainBonus = { atk: 0, def: 0, hp: 0 };
  var key = a.slice(0, -1), delta = a.slice(-1) === '+' ? 1 : -1;
  G.trainBonus[key] = Math.max(-50, Math.min(200, (G.trainBonus[key] || 0) + delta));
  trainRefresh(false); return true;
}
function trainCycleSlot(slotId) {
  // Compatibility name only: opens a direct selector and NEVER cycles equipment.
  if (!trainReady() || !CYBER_SLOTS.some(function (sl) { return sl.id === slotId; })) return false;
  var u = trainUIState(); u.slot = slotId; u.quality = 'all'; u.panel = 'gear'; u.chipIndex = 0;
  trainRefresh(true); return true;
}
function trainSpawn(id, depth) {
  if (!trainReady()) return false;
  var spec = MONSTERS.find(function (m) { return m.id === id && !m.boss; });
  var d = depth == null ? G.depth : Number(depth);
  if (!spec || !isFinite(d) || Math.floor(d) !== d || d < 1 || d > MAX_DEPTH) return false;
  var spot = freeAdjacent(p.x, p.y);
  if (!spot) { toast('周围没有空位，请移动或清场', 'bad'); return false; }
  G.depth = d;
  var e = spawnEnemy(spec, spot.x, spot.y, d);
  e.alerted = true; e.trainingDepth = d; G.enemies.push(e);
  trainRefresh(false); return e;
}
function trainSpawnBoss(indexOrId, depth) {
  if (!trainReady()) return false;
  var pool = trainBossPool(), spec;
  if (typeof indexOrId === 'number') {
    if (Math.floor(indexOrId) !== indexOrId || indexOrId < 0 || indexOrId >= pool.length) return false;
    spec = pool[indexOrId];
  } else spec = pool.find(function (b) { return b.id === indexOrId; });
  var d = depth == null ? G.depth : Number(depth);
  if (!spec || !isFinite(d) || Math.floor(d) !== d || d < 1 || d > MAX_DEPTH) return false;
  var spot = freeAdjacent(p.x, p.y);
  if (!spot) { toast('周围没有空位，请移动或清场', 'bad'); return false; }
  G.depth = d;
  var boss = spawnBoss(spec, spot.x, spot.y, d);
  boss.trainingDepth = d; G.enemies.push(boss);
  G.bossAlive = true; G.bossName = spec.name;
  trainRefresh(false); return boss;
}

const replacements = [beginTraining, trainHTML, trainAction, trainAttr, trainCycleSlot, trainSpawn, trainSpawnBoss];
const helpers = [
  trainReady, trainEsc, trainQualities, trainUIState, trainGearPool, trainBossPool, trainEnemyPool,
  trainPresets, trainCatalog, trainState, trainSyncModFlags, trainRefresh, trainChoose,
  trainInstall, trainRemove, trainSetChip, trainRemoveChip, trainSetConsumable,
  trainRemoveConsumable, trainPreset, trainUseActive, trainBossArena, trainOption,
  trainSelect, trainSlotOptions, trainModInfo, trainLoadoutHTML, trainGearHTML,
  trainChipsHTML, trainItemsHTML, trainEnemiesHTML, trainPresetsHTML, trainParamsHTML,
  trainEnsureStyle, bindTrainingMenu
];
const trainingAPI = `training: {
      catalog: trainCatalog, state: trainState, html: trainHTML, choose: trainChoose,
      gearPool: trainGearPool, enemyPool: trainEnemyPool, bossPool: trainBossPool,
      install: trainInstall, remove: trainRemove, chip: trainSetChip, removeChip: trainRemoveChip,
      consumable: trainSetConsumable, removeConsumable: trainRemoveConsumable,
      preset: trainPreset, presets: trainPresets, action: trainAction, attr: trainAttr,
      selectSlot: trainCycleSlot, useActive: trainUseActive, spawn: trainSpawn,
      spawnBoss: trainSpawnBoss, bossArena: trainBossArena
    }`;

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  Object.keys(node).forEach(function (key) {
    const value = node[key];
    if (Array.isArray(value)) value.forEach(function (child) { if (child && typeof child.type === 'string') walk(child, visit); });
    else if (value && typeof value.type === 'string') walk(value, visit);
  });
}
function propertyName(prop) {
  return prop && prop.key && (prop.key.type === 'Identifier' ? prop.key.name : prop.key.value);
}
function patchSource(source) {
  const ast = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
  const declarations = new Map();
  const exports = [];
  walk(ast, function (node) {
    if (node.type === 'FunctionDeclaration' && node.id) {
      const list = declarations.get(node.id.name) || [];
      list.push(node); declarations.set(node.id.name, list);
    }
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && !node.left.computed && node.left.object.type === 'Identifier' && node.left.object.name === 'window' && node.left.property.name === '__neon') exports.push(node.right);
  });
  function uniqueFunction(name) {
    const nodes = declarations.get(name) || [];
    if (nodes.length !== 1) throw new Error('Expected exactly one function ' + name + ', found ' + nodes.length);
    return nodes[0];
  }
  helpers.forEach(function (fn) {
    if (declarations.has(fn.name)) throw new Error('Training helper already exists (already applied or conflict): ' + fn.name);
  });
  const edits = replacements.map(function (fn) {
    const node = uniqueFunction(fn.name);
    const prefix = fn.name === 'trainHTML' ? '/* Training direct selectors: isolated from mainline storage/rewards. */\n' + helpers.map(function (h) { return h.toString(); }).join('\n') + '\n' : '';
    return { start: node.start, end: node.end, text: prefix + fn.toString(), label: 'function ' + fn.name };
  });
  const menu = uniqueFunction('renderMenu');
  const oldBinding = `if (t === 'train') {
    $$('[data-tr]').forEach(function (b) { b.onclick = function () { trainAction(b.getAttribute('data-tr')); }; });
    $$('[data-tslot]').forEach(function (b) { b.onclick = function () { trainCycleSlot(b.getAttribute('data-tslot')); }; });
    $$('[data-attr]').forEach(function (b) { b.onclick = function () { trainAttr(b.getAttribute('data-attr')); }; });
  $$('[data-spawn]').forEach(function (b) { b.onclick = function () { trainSpawn(b.getAttribute('data-spawn')); }; });
    $$('[data-spawnboss]').forEach(function (b) { b.onclick = function () { trainSpawnBoss(parseInt(b.getAttribute('data-spawnboss'), 10)); }; });
  }`;
  const body = source.slice(menu.start, menu.end);
  const index = body.indexOf(oldBinding);
  if (index < 0 || body.indexOf(oldBinding, index + 1) >= 0) throw new Error('renderMenu training binding literal changed; refusing to overwrite other menu work');
  edits.push({ start: menu.start + index, end: menu.start + index + oldBinding.length, text: "if (t === 'train') bindTrainingMenu();", label: 'renderMenu training event binding only' });
  if (exports.length !== 1 || exports[0].type !== 'ObjectExpression') throw new Error('Expected one window.__neon object export');
  const tests = exports[0].properties.filter(function (prop) { return propertyName(prop) === 'test'; });
  if (tests.length !== 1 || tests[0].value.type !== 'ObjectExpression') throw new Error('Expected one __neon.test object');
  const test = tests[0].value;
  if (test.properties.some(function (prop) { return propertyName(prop) === 'training'; })) throw new Error('__neon.test.training already exists');
  const tail = test.properties[test.properties.length - 1];
  const trailingComma = tail && source.slice(tail.end, test.end - 1).includes(',');
  edits.push({ start: test.end - 1, end: test.end - 1, text: (tail && !trailingComma ? ', ' : '') + trainingAPI + ' ', label: '__neon.test.training API only' });
  edits.sort(function (a, b) { return a.start - b.start; });
  for (let i = 1; i < edits.length; i++) if (edits[i].start < edits[i - 1].end) throw new Error('Overlapping patch edits');
  let output = source;
  edits.slice().reverse().forEach(function (edit) { output = output.slice(0, edit.start) + edit.text + output.slice(edit.end); });
  const result = acorn.parse(output, { ecmaVersion: 'latest', sourceType: 'script' });
  const counts = new Map();
  walk(result, function (node) { if (node.type === 'FunctionDeclaration' && node.id) counts.set(node.id.name, (counts.get(node.id.name) || 0) + 1); });
  replacements.concat(helpers).forEach(function (fn) { if (counts.get(fn.name) !== 1) throw new Error('Postflight duplicate/missing function: ' + fn.name); });
  return { source: output, changes: edits.map(function (edit) { return { label: edit.label, start: edit.start, end: edit.end }; }) };
}
module.exports = { patchSource };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some(function (arg) { return arg !== '--check'; })) throw new Error('Usage: node tools/cyber-training-patch.js [--check]');
  const target = path.resolve(__dirname, '..', 'game.js');
  const before = fs.readFileSync(target, 'utf8');
  const result = patchSource(before);
  if (!args.includes('--check')) {
    // Re-read before commit: never clobber a concurrently modified source file.
    if (fs.readFileSync(target, 'utf8') !== before) throw new Error('game.js changed during preflight; retry on the latest source');
    fs.writeFileSync(target, result.source, 'utf8');
  }
  console.log(JSON.stringify({ mode: args.includes('--check') ? 'check-only; no files written' : 'applied', target: target, changes: result.changes, api: 'window.__neon.test.training', dependency: 'main-thread calcMods dynamic chip aggregation' }, null, 2));
}
