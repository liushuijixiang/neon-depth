/* =========================================================
   GEAR_V1 · 义体实例：随机名称 / 词条 / 耐久 / 强化；背包；清点
   ========================================================= */
var INST_PREFIX = {
  atk: ['锋利', '暴戾', '嗜血'], maxHp: ['厚重', '增生', '耐用'], def: ['加固', '铁壳', '装甲'], crit: ['精准', '鹰视', '冷酷'],
  dodge: ['轻灵', '滑步', '残影'], critMult: ['致命', '处刑', '断骨'], lifesteal: ['饥渴', '吸髓', '红线'], power: ['超频', '过压', '炽热'], compat: ['温顺', '亲和', '低噪']
};
var INST_ORIGIN = ['', '', '军规', '黑市', '翻新', '走私', '企业', '地下诊所'];
var INST_AFFIX = [
  { stat: 'atk', lo: 1, hi: 3, int: 1 }, { stat: 'maxHp', lo: 4, hi: 12, int: 1 }, { stat: 'def', lo: 1, hi: 2, int: 1 },
  { stat: 'crit', lo: .02, hi: .05 }, { stat: 'dodge', lo: .02, hi: .04 }, { stat: 'critMult', lo: .08, hi: .2 },
  { stat: 'lifesteal', lo: .02, hi: .05 }, { stat: 'power', lo: .04, hi: .1 }, { stat: 'compat', lo: 1, hi: 2, int: 1 }
];
var INST_LABEL = { atk: '攻击', maxHp: '生命', def: '防御', crit: '暴击', dodge: '闪避', critMult: '爆伤', lifesteal: '吸血', power: '义体功率', compat: '适应度' };
var INST_PCT = { crit: 1, dodge: 1, critMult: 1, lifesteal: 1, power: 1 };
var INST_AFFIX_N = { gray: 0, green: 1, blue: 1, purple: 2, orange: 2, red: 3 };
function instFmt(stat, v) { return (INST_LABEL[stat] || stat) + ' ' + (v >= 0 ? '+' : '') + (INST_PCT[stat] ? Math.round(v * 100) + '%' : v); }
function rollInst(m, o) {
  o = o || {};
  var qi = Math.max(0, Q_ORDER.indexOf(m.quality)), n = o.affixN != null ? o.affixN : INST_AFFIX_N[m.quality] || 0, mult = (1 + qi * .25) * (o.boost || 1);
  var pool = shuffle(INST_AFFIX.slice()), affixes = [];
  for (var i = 0; i < n && i < pool.length; i++) {
    var a = pool[i], v = a.lo + Math.random() * (a.hi - a.lo);
    v = a.int ? Math.max(1, Math.round(v * mult)) : Math.round(v * mult * 100) / 100;
    affixes.push({ stat: a.stat, val: v });
  }
  var top = affixes.slice().sort(function (a, b) { return (b.val / (INST_AFFIX.find(function (x) { return x.stat === b.stat; }).hi)) - (a.val / (INST_AFFIX.find(function (x) { return x.stat === a.stat; }).hi)); })[0];
  var maxDur = o.maxDur || (8 + qi * 2 + rnd(5));
  var origin = o.origin != null ? o.origin : pick(INST_ORIGIN);
  var name = (origin ? origin + '·' : '') + (top ? pick(INST_PREFIX[top.stat] || ['']) + '的' : '') + m.name;
  return { name: name, affixes: affixes, plus: o.plus || 0, dur: o.dur != null ? o.dur : maxDur, maxDur: maxDur, heavy: o.heavy || 0, mod: o.mod || '' };
}
function instOf(id) { G.inst = G.inst || {}; if (!G.inst[id] && MOD_BY[id]) G.inst[id] = MOD_BY[id].relic ? { name: MOD_BY[id].name, affixes: [], plus: 0, dur: 99, maxDur: 99, heavy: 0 } : rollInst(MOD_BY[id]); return G.inst[id]; }
function instBroken(id) { var it = (G.inst || {})[id]; return !!(it && it.dur <= 0); }
function modName(id) { var it = (G.inst || {})[id], m = MOD_BY[id]; if (!m) return id; return (it ? it.name : m.name) + (it && it.plus ? ' +' + it.plus : ''); }
function instTag(id) {
  var it = (G.inst || {})[id]; if (!it) return '';
  return '耐久 ' + Math.max(0, it.dur) + '/' + it.maxDur + (it.plus ? ' · 强化 +' + it.plus : '') + (it.heavy ? ' · 重改 +' + it.heavy + ' 负载' : '') + (it.dur <= 0 ? ' · 损坏' : '');
}
function instLines(id) {
  var it = (G.inst || {})[id]; if (!it) return [];
  return (it.affixes || []).map(function (a) { return instFmt(a.stat, a.val); });
}
function instLoad(id) { var it = (G.inst || {})[id], m = MOD_BY[id]; return (CYBER_COST[m ? m.quality : 'gray'] || 1) + (it ? (it.plus || 0) + (it.heavy || 0) : 0); }
// 实例加成：词条 + 强化（每级 +15% 基础属性）；损坏的义体不提供任何属性
function instStats() {
  var out = {};
  Object.keys(G.cyber || {}).forEach(function (slot) {
    var id = G.cyber[slot], m = MOD_BY[id], it = (G.inst || {})[id]; if (!m || !it) return;
    if (it.dur <= 0) { Object.keys(m.stats || {}).forEach(function (k) { out[k] = (out[k] || 0) - m.stats[k]; }); return; }
    (it.affixes || []).forEach(function (a) { out[a.stat] = (out[a.stat] || 0) + a.val; });
    if (it.plus) Object.keys(m.stats || {}).forEach(function (k) { var v = m.stats[k] * .15 * it.plus; out[k] = (out[k] || 0) + (k === 'atk' || k === 'def' || k === 'maxHp' ? Math.round(v) : v); });
  });
  return out;
}
// 强化：成功率随等级下降；成功 -1 耐久，失败 -3 耐久
var ENH_RATE = [.9, .8, .65, .5, .35];
function enhanceInst(it, m) {
  if (!it || it.plus >= 5 || it.dur <= 0) return null;
  var ok = Math.random() < ENH_RATE[it.plus];
  if (ok) { it.plus++; it.dur = Math.max(0, it.dur - 1); } else it.dur = Math.max(0, it.dur - 3);
  return ok;
}
function enhanceCost(it, m, core) { var qi = Q_ORDER.indexOf(m.quality); return core ? Math.round((20 + qi * 12) * (1 + it.plus * .6)) : econPrice(Math.round((18 + qi * 8) * (1 + it.plus * .5))); }
function repairCost(it, m) { return econPrice(4 + Math.max(0, it.maxDur - it.dur) * (2 + Q_ORDER.indexOf(m.quality))); }
// 下潜时：装配的义体有几率磨损
function wearInstalled() {
  Object.keys(G.cyber || {}).forEach(function (slot) {
    var id = G.cyber[slot], it = instOf(id), m = MOD_BY[id];
    if (!m || m.relic || it.dur <= 0 || Math.random() > .35) return;
    it.dur--; if (it.dur <= 0) { toast(modName(id) + ' 损坏', 'bad'); msg(modName(id) + ' 已损坏：属性与主动技能失效，可在义体医生处修复', 'bad'); recalc(); }
    else if (it.dur <= 2) msg(modName(id) + ' 耐久告急（' + it.dur + '）', 'warn');
  });
}

/* ---------- 背包 ---------- */
function bagCap() { return 6 + Math.round(metaStatSum('bag')); }
function bagItems() { var on = Object.keys(G.cyber || {}).map(function (k) { return G.cyber[k]; }); return G.modBag.filter(function (id) { return on.indexOf(id) < 0; }); }
function bagCount() { return bagItems().length + (G.chips || []).length; }
function bagFull() { return G.mode === 'normal' && bagCount() >= bagCap(); }

/* ---------- 带回与清点 ---------- */
function gearValue(id) { var m = MOD_BY[id], it = (G.inst || {})[id]; if (!m) return 0; var v = cyberPrice(m) * (1 + (it ? it.plus * .25 : 0)); return Math.round(it && it.dur <= 0 ? v * .3 : v); }
function extractAll() {
  if (G.mode !== 'normal') return null;
  var report = { cyber: [], chips: [], value: 0 };
  var seen = {};
  G.modBag.forEach(function (id) {
    if (seen[id] || !MOD_BY[id]) return; seen[id] = 1;
    var slot = Object.keys(G.cyber).find(function (k) { return G.cyber[k] === id; });
    var chips = slot ? (G.cyberChips[slot] || []).slice() : [];
    var it = instOf(id);
    META.stash.cyber.push({ id: id, chips: chips, inst: it });
    var v = gearValue(id); report.value += v;
    report.cyber.push({ id: id, name: modName(id), quality: MOD_BY[id].quality, slot: slot, chips: chips.length, value: v, tag: instTag(id) });
    chips.forEach(function (c) { report.value += chipPrice(c.quality); });
  });
  (G.chips || []).forEach(function (c) { META.stash.chips.push(c); report.chips.push(c); report.value += chipPrice(c.quality); });
  saveMeta();
  return report;
}
function tallyScreen(report, done) {
  showModal('tally');
  var S = G.stats || {}, rows = '';
  (report.cyber || []).sort(function (a, b) { return Q_ORDER.indexOf(b.quality) - Q_ORDER.indexOf(a.quality); }).forEach(function (r, i) {
    var q = QUALITY[r.quality] || QUALITY.gray;
    rows += '<div class="tl-item" style="--tc:' + q.color + ';animation-delay:' + (VFX.reduced ? 0 : 200 + i * 90) + 'ms"><b>' + econEsc(r.name) + '</b><small>' + q.name + ' · ' + (r.slot ? '装配中' : '背包') + (r.chips ? ' · 芯片 ' + r.chips : '') + '</small><small>' + econEsc(r.tag) + '</small><span>' + r.value + '</span></div>';
  });
  (report.chips || []).forEach(function (c, i) { rows += '<div class="tl-item chip" style="--tc:' + c.color + ';animation-delay:' + (VFX.reduced ? 0 : 200 + (report.cyber.length + i) * 70) + 'ms"><b>' + econEsc(c.grade + '·' + c.name) + '</b><small>' + econEsc(chipText(c)) + '</small><span>' + chipPrice(c.quality) + '</span></div>'; });
  var html = '<div class="card tally"><div class="kicker">EXTRACTION // 撤离清点</div><h1 class="title small">带回地面的东西</h1>' +
    '<div class="tl-sum"><div><b data-count="' + report.value + '">0</b><small>装备总价值（核心计）</small></div><div><b>' + report.cyber.length + '</b><small>义体</small></div><div><b>' + (report.chips.length + report.cyber.reduce(function (s, r) { return s + r.chips; }, 0)) + '</b><small>芯片</small></div></div>' +
    '<div class="tl-stats"><span>深度 B' + G.depth + 'F</span><span>击毁 ' + G.kills + '</span><span>受到伤害 ' + (S.damageTaken || 0) + '</span><span>回合 ' + G.turn + '</span><span>消耗品 ' + (S.itemsUsed || 0) + '</span><span>剩余 ¥' + (G.credits || 0) + '</span><span>委托 ' + (G.quests || []).filter(function (q) { return q.done; }).length + '</span></div>' +
    '<div class="tl-list">' + (rows || '<div class="hint">两手空空地回来了。</div>') + '</div><div class="hint">全部已存入仓库</div><button class="cta" id="tallyOk">继续</button></div>';
  overlay.innerHTML = html;
  var el = overlay.querySelector('[data-count]'), target = report.value, t0 = performance.now();
  (function tick() { var u = Math.min(1, (performance.now() - t0) / 900); if (el) el.textContent = Math.round(target * (1 - Math.pow(1 - u, 3))); if (u < 1 && G.modal === 'tally') requestAnimationFrame(tick); })();
  $('#tallyOk').onclick = function () { hideOverlay(); done(); };
}
