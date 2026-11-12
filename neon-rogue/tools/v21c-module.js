/* V21C · 量产套装与制式券 / 黑市芯片与制式券页 */
var KIT_THEMES = [
  { key: 'assault', name: '突击', brand: '铁砧', color: '#ff5c7a', desc: '攻击和暴击', w: { atk: 1, crit: .015, maxHp: 2 } },
  { key: 'survive', name: '生存', brand: '壳牌', color: '#57ffa8', desc: '生命和防御', w: { maxHp: 5, def: .6, dodge: .005 } },
  { key: 'hunt', name: '猎杀', brand: '夜枭', color: '#c08bff', desc: '暴击和闪避', w: { crit: .02, dodge: .015, atk: .5 } }
];
var KIT_Q = [['gray', '量产', 1, 30], ['green', '改良', 1.7, 55], ['blue', '精工', 2.6, 90]];
var KIT_PARTS = [['eye', '左眼', 'eye'], ['eye', '右眼', 'eye'], ['hand', '左臂', 'hand'], ['hand', '右臂', 'hand'], ['body', '躯干', 'body'], ['spine', '脊柱', 'spine'], ['leg', '左腿', 'leg'], ['leg', '右腿', 'leg']];
var KIT_SLOTW = { eye: { crit: 1.2, dodge: .6, atk: .3, maxHp: .3, def: .3 }, hand: { atk: 1.4, crit: .8, maxHp: .4, def: .4, dodge: .3 }, body: { maxHp: 1.6, def: 1.4, atk: .3, crit: .3, dodge: .3 }, spine: { maxHp: 1, def: 1, atk: .6, crit: .6, dodge: .8 }, leg: { dodge: 1.4, maxHp: .6, def: .5, atk: .3, crit: .3 } };
var KIT_LBL = { atk: '攻击', maxHp: '生命', def: '防御', crit: '暴击', dodge: '闪避' };
KIT_THEMES.forEach(function (th) {
  KIT_Q.forEach(function (kq) {
    KIT_PARTS.forEach(function (pt, pi) {
      var id = 'kit_' + th.key + '_' + kq[0] + '_' + pi; if (MOD_BY[id]) return;
      var st = {}; Object.keys(th.w).forEach(function (k) { var v = th.w[k] * (KIT_SLOTW[pt[2]][k] || .3) * kq[2]; v = k === 'crit' || k === 'dodge' ? Math.round(v * 100) / 100 : Math.round(v); if (v > 0) st[k] = v; });
      if (!Object.keys(st).length) st.maxHp = 2;
      var m = { id: id, slot: pt[0], quality: kq[0], name: th.brand + '·' + kq[1] + pt[1], color: (QUALITY[kq[0]] || QUALITY.gray).color, stats: st, dropOnly: true, kit: th.key,
        desc: Object.keys(st).map(function (k) { var v = st[k]; return KIT_LBL[k] + ' +' + (v < 1 ? Math.round(v * 100) + '%' : v); }).join('，'),
        lore: th.brand + '公司的' + kq[1] + '款' + th.name + '套件，一盒八件，说明书比义体还厚。地下诊所装一套只要半小时，坏了也只要半小时。' };
      MODS.push(m); MOD_BY[id] = m;
    });
  });
});
(function () {
  var refund = { t_assault_p: 200, t_survive_p: 200, t_hunt_p: 200, t_assault_r: 320, t_survive_r: 320, t_hunt_r: 320 }, got = 0;
  TICKETS.length = 0;
  KIT_THEMES.forEach(function (th) { KIT_Q.forEach(function (kq) {
    TICKETS.push({ id: 't_' + th.key + '_' + (kq[0] === 'blue' ? 'b' : kq[0] === 'green' ? 'n' : 'g'), name: th.name + '制式券·' + (QUALITY[kq[0]] || QUALITY.gray).name, quality: kq[0], theme: th.key, price: kq[3],
      desc: th.brand + ' ' + kq[1] + '套件：八个部位全配齐，主打' + th.desc + '。', items: KIT_PARTS.map(function (_, pi) { return 'kit_' + th.key + '_' + kq[0] + '_' + pi; }) });
  }); });
  META.tickets = (META.tickets || []).filter(function (t) { if (refund[t]) { got += refund[t]; return false; } return true; });
  if (got) { META.cores += got; saveMeta(); }
})();
function ticketCard(t) {
  var q = QUALITY[t.quality] || QUALITY.gray, th = KIT_THEMES.find(function (x) { return x.key === t.theme; }) || KIT_THEMES[0];
  var own = META.tickets.filter(function (x) { return x === t.id; }).length;
  var dots = t.items.map(function (id) { var m = MOD_BY[id]; return '<u title="' + (m ? m.name : '') + '"></u>'; }).join('');
  return '<button class="tkt" data-mticket="' + t.id + '" style="--it:' + q.color + ';--th:' + th.color + '"><span class="tkt-q">' + q.name + '</span><b>' + t.name + '</b><small>8 件 · ' + th.desc + '</small><span class="tkt-dots">' + dots + '</span><span class="tkt-p">' + t.price + ' 核心' + (own ? ' · 持有 ' + own : '') + '</span></button>';
}
function marketChipTabHTML(mk) {
  if (!mk.chipStat) mk.chipStat = 'atk';
  var h = '<div class="fbar"><div class="fpills">' + CHIPS.map(function (c) { return '<button class="fpill' + (mk.chipStat === c.id ? ' on' : '') + '" data-mstat="' + c.id + '">' + (CHIP_LABEL[c.stat] || c.name) + '</button>'; }).join('') + '</div></div>';
  var base = CHIPS.find(function (c) { return c.id === mk.chipStat; }) || CHIPS[0];
  h += '<div class="hint">' + (CHIP_HELP[base.stat] || '') + '</div><div class="mchip-grid">';
  Q_ORDER.forEach(function (q) {
    var qq = QUALITY[q], n = q === 'red' || q === 'orange' ? 2 : q === 'purple' || q === 'blue' ? 1 : 0, sample = { stat: base.stat, val: chipRoll(base.stat, base.val, CHIP_MULT[q] || 1, false), color: qq.color, quality: q, affixes: [], grade: qq.name, name: base.name };
    h += '<button class="mchip" data-mchip="' + q + '"' + (META.cores >= chipPrice(q) ? '' : ' disabled') + ' style="--cq:' + qq.color + '">' + chipIco(sample, '') + '<b>' + qq.name + '·' + base.name + '</b><small>约 +' + chipFmt(base.stat, sample.val) + ' · 附加 ' + n + ' 条</small><span>' + chipPrice(q) + ' 核心</span></button>';
  });
  return h + '</div>';
}
function marketTicketTabHTML() {
  var h = '<div class="hint">制式券在「BOSS RUSH」入场时使用：一张券给一整套八件量产义体，用完即止。</div>';
  KIT_THEMES.forEach(function (th) { h += '<div class="tkt-h" style="--th:' + th.color + '">' + th.name + ' · ' + th.brand + '</div><div class="tkt-grid">' + TICKETS.filter(function (t) { return t.theme === th.key; }).map(ticketCard).join('') + '</div>'; });
  return h;
}
