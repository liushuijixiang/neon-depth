/* =========================================================
   V36 · 统一皮肤背景 / 返回栈 / 立绘 / 一键配装 v2 / 养成即时刷新 / 引导 / 通关收尾
   ========================================================= */
/* ---------- 共享背景层 ---------- */
var M3BG = { on: false };
function m3BgEnsure() {
  var cv = document.getElementById('m3bgLayer');
  if (!cv) { cv = document.createElement('canvas'); cv.id = 'm3bgLayer'; overlay.parentNode.insertBefore(cv, overlay); }
  if (M3BG.on) return; M3BG.on = true;
  var c2 = cv.getContext('2d'), dpr2 = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0, seed = 7, layers = [], drops = [];
  function rnd2() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  function build() {
    var r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = W * dpr2; cv.height = H * dpr2; c2.setTransform(dpr2, 0, 0, dpr2, 0, 0); seed = 7; layers = [];
    [[.52, '#081521', .35], [.66, '#0b1b2a', .55], [.78, '#0e2132', .85]].forEach(function (L, li) {
      var x = 0, bl = []; while (x < W) { var w = 14 + rnd2() * 36, h = H * (1 - L[0]) * (.4 + rnd2() * .9), win = []; for (var wy = 6; wy < h - 4; wy += 7) for (var wx = 3; wx < w - 3; wx += 6) if (rnd2() < .18) win.push([wx, wy, rnd2()]); bl.push({ x: x, w: w, h: h, win: win, sign: rnd2() < .12 && li === 2 }); x += w + 2 + rnd2() * 6; }
      layers.push({ base: H * L[0] + H * .2, col: L[1], blocks: bl, a: L[2] });
    });
    drops = []; for (var i = 0; i < 70; i++) drops.push({ x: rnd2() * W, y: rnd2() * H, v: 4 + rnd2() * 6, l: 6 + rnd2() * 10 });
  }
  var t0 = performance.now();
  (function frame(now) {
    if (!document.body.classList.contains('m3menu')) { M3BG.on = false; return; }
    var rec = cv.getBoundingClientRect(); if (Math.abs(rec.width - W) > 2 || Math.abs(rec.height - H) > 2) build();
    var t = (now - t0) / 1000, accent = classDef().color;
    var g = c2.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04070d'); g.addColorStop(.6, '#071322'); g.addColorStop(1, '#03060a'); c2.fillStyle = g; c2.fillRect(0, 0, W, H);
    var glow = c2.createRadialGradient(W * .5, H * .62, 4, W * .5, H * .62, W * .7); glow.addColorStop(0, hexA(accent, .18)); glow.addColorStop(1, hexA(accent, 0)); c2.fillStyle = glow; c2.fillRect(0, 0, W, H);
    layers.forEach(function (L) { L.blocks.forEach(function (b) { var top = L.base - b.h; c2.fillStyle = L.col; c2.fillRect(b.x, top, b.w, H - top);
      b.win.forEach(function (w) { if (!(VFX.reduced ? w[2] > .4 : Math.sin(t * .7 + w[2] * 40) > -.6)) return; c2.fillStyle = w[2] > .85 ? hexA(accent, .7 * L.a) : 'rgba(255,214,140,' + (.35 * L.a) + ')'; c2.fillRect(b.x + w[0], top + w[1], 2, 3); });
      if (b.sign) { var fl = VFX.reduced ? 1 : (Math.sin(t * 9 + b.x) > -.85 ? 1 : .2); c2.fillStyle = hexA(accent, .55 * fl); c2.fillRect(b.x + 2, top + 8, 2, Math.min(36, b.h * .5)); } }); });
    c2.strokeStyle = 'rgba(160,210,255,.18)'; c2.lineWidth = 1; c2.beginPath();
    drops.forEach(function (d) { if (!VFX.reduced) { d.y += d.v; d.x -= d.v * .18; if (d.y > H) { d.y = -10; d.x = Math.random() * (W + 40); } } c2.moveTo(d.x, d.y); c2.lineTo(d.x + d.l * .18, d.y - d.l); });
    c2.stroke();
    requestAnimationFrame(frame);
  })(t0);
}
function m3Skin() {
  var on = G.state === 'menu';
  document.body.classList.toggle('m3menu', on);
  overlay.classList.toggle('m3skin', on);
  if (on) m3BgEnsure();
}
/* ---------- 返回栈 ---------- */
function menuBack() { var f = G._menuRet; G._menuRet = null; if (typeof f === 'function') f(); else menuScreen(); }
/* ---------- 首页：动效标志 / 人物立绘 ---------- */
var MN_LOGO = '<svg viewBox="0 0 240 200" class="m3-logoart"><defs><linearGradient id="lgA" x1="0" x2="1"><stop offset="0" stop-color="#22e6ff"/><stop offset="1" stop-color="#ff2fa8"/></linearGradient></defs>' +
  '<g class="ring r1"><circle cx="120" cy="92" r="78" fill="none" stroke="url(#lgA)" stroke-width="1.5" stroke-dasharray="6 10"/></g>' +
  '<g class="ring r2"><circle cx="120" cy="92" r="62" fill="none" stroke="#22e6ff" stroke-opacity=".5" stroke-width="1" stroke-dasharray="40 14"/></g>' +
  '<path d="M120 30v124" stroke="#22e6ff" stroke-opacity=".25"/><path d="M84 46h72M78 62h84M72 78h96M78 94h84M84 110h72M92 126h56M100 142h40" stroke="url(#lgA)" stroke-width="2.5" stroke-linecap="round" class="well"/>' +
  '<rect x="117" y="40" width="6" height="10" fill="#fcee0a" class="diver"/></svg>';
var MN_FACE = {
  assault: '<svg viewBox="0 0 200 220" class="m3-face"><path class="hair" d="M58 92c-4-46 26-70 52-70 34 0 54 24 50 66l-8-20c-14 8-46 10-70-2z"/><path class="skin" d="M66 88c0 44 16 72 40 72s40-28 40-72c-16 10-58 10-80 0z"/><path class="ln" d="M80 104h18M110 104h18"/><path class="eye" d="M84 104h8M116 104h8"/><path class="ln" d="M100 112v14l-5 4M92 140h18"/><path class="scar" d="M126 86l8 30"/><path class="cloth" d="M40 220c0-34 24-52 66-56 42 4 64 22 64 56z"/><path class="ln dim" d="M58 196l14-4M62 206l14-4M66 214l14-4"/></svg>',
  engineer: '<svg viewBox="0 0 200 220" class="m3-face"><path class="hair" d="M62 86c-2-40 20-62 46-62 30 0 48 22 46 60-20-12-62-12-92 2z"/><path class="skin" d="M66 90c0 42 16 70 40 70s40-28 40-70c-20-8-60-8-80 0z"/><rect class="gog" x="70" y="92" width="30" height="16" rx="5"/><rect class="gog" x="108" y="92" width="30" height="16" rx="5"/><path class="ln" d="M100 100h8M62 98h8M138 98h8"/><path class="ln" d="M104 112v12l-4 4M94 140h20"/><path class="ln dim" d="M96 132q8 4 16 0"/><path class="cloth" d="M40 220c0-34 24-52 66-56 42 4 64 22 64 56z"/><path class="ln" d="M104 164v56"/><circle class="eye" cx="104" cy="196" r="4"/></svg>',
  ghost: '<svg viewBox="0 0 200 220" class="m3-face"><path class="cloth" d="M50 120c-6-60 20-96 54-96s60 36 54 96c-12-20-28-30-54-30s-42 10-54 30z"/><path class="skin" d="M70 96c0 40 14 66 34 66s34-26 34-66c-14-6-54-6-68 0z"/><path class="visor" d="M66 98c14-8 62-8 76 0l-6 14c-20-6-44-6-64 0z"/><path class="ln dim" d="M74 104h60"/><path class="ln" d="M104 118v12M96 142h16"/><path class="cloth" d="M36 220c0-36 28-56 68-58 40 2 68 22 68 58z"/><path class="wing" d="M86 196c-20-14-40-12-46 0 6 10 26 12 46 0zM122 196c20-14 40-12 46 0-6 10-26 12-46 0z"/></svg>'
};
/* ---------- 一键配装 v2 ---------- */
function loadoutSnap() { return { cyber: JSON.parse(JSON.stringify(G.cyber)), chips: JSON.parse(JSON.stringify(G.cyberChips)), pool: JSON.parse(JSON.stringify(G.chips)), ground: G.items.length }; }
function loadoutApply(S) {
  Object.keys(G.cyber).forEach(function (sl) { var id = G.cyber[sl]; if (isTrial(id)) return; applyModStats(MOD_BY[id], -1); delete G.mods[id]; delete G.cyber[sl]; });
  Object.keys(S.cyber).forEach(function (sl) { var id = S.cyber[sl]; if (isTrial(id)) return; G.cyber[sl] = id; G.mods[id] = 1; applyModStats(MOD_BY[id], 1); });
  G.cyberChips = S.chips; G.chips = S.pool; recalc();
}
function chipCompat(c) { var v = c.stat === 'compat' ? c.val : 0; (c.affixes || []).forEach(function (a) { if (a.stat === 'compat') v += a.val; }); return v; }
function autoLoadout() {
  if (G.state !== 'play') return;
  var snap = loadoutSnap();
  // 1. 全部卸下（体验装除外），芯片回芯片盒
  Object.keys(G.cyber).forEach(function (sl) { var id = G.cyber[sl]; if (isTrial(id)) return; (G.cyberChips[sl] || []).forEach(function (c) { G.chips.push(c); }); G.cyberChips[sl] = []; applyModStats(MOD_BY[id], -1); delete G.mods[id]; delete G.cyber[sl]; });
  recalc();
  var owned = G.modBag.filter(function (id) { var m = MOD_BY[id]; return m && !isTrial(id) && !(m.cls && m.cls !== classDef().id) && !instBroken(id); });
  var score = function (id) { var m = MOD_BY[id], it = (G.inst || {})[id] || {}, st = 0; Object.keys(m.stats || {}).forEach(function (k) { var v = m.stats[k]; st += v < 1 ? v * 100 : v; }); return Q_ORDER.indexOf(m.quality) * 20 + (it.plus || 0) * 6 + st + (m.active ? 8 : 0); };
  owned.sort(function (a, b) { return score(b) - score(a); });
  function placeImplants() { owned.forEach(function (id) { if (cyberInstalledSlot(id)) return; var m = MOD_BY[id], sl = slotPriority(m).find(function (x) { return !G.cyber[x]; }); if (!sl) return; if (cyberLoad() + instLoad(id) > adaptationCap()) return; G.cyber[sl] = id; G.mods[id] = 1; G.cyberChips[sl] = []; applyModStats(m, 1); recalc(); }); }
  function freeSock() { return Object.keys(G.cyber).filter(function (k) { var id = G.cyber[k]; return !isTrial(id) && (G.cyberChips[k] || []).length < (QUALITY[MOD_BY[id].quality] || QUALITY.gray).slots; }); }
  function sock(c) { if (c.heavy && cyberLoad() + c.heavy > adaptationCap()) return false; var sl = freeSock().sort(function (a, b) { return (c.corp && MOD_BY[G.cyber[b]].corp === c.corp ? 1 : 0) - (c.corp && MOD_BY[G.cyber[a]].corp === c.corp ? 1 : 0); })[0]; if (!sl) return false; G.chips.splice(G.chips.indexOf(c), 1); G.cyberChips[sl].push(c); recalc(); return true; }
  // 2. 先义体
  placeImplants();
  // 3. 兼容芯片优先（兼容越高越先），每插一枚适应度上涨，再尝试补义体
  for (var pass = 0; pass < 4; pass++) {
    var compat = G.chips.filter(function (c) { return chipCompat(c) > 0; }).sort(function (a, b) { return chipCompat(b) - chipCompat(a); });
    var placed = 0; compat.forEach(function (c) { if (sock(c)) placed++; });
    var before = Object.keys(G.cyber).length; placeImplants();
    if (!placed && Object.keys(G.cyber).length === before) break;
  }
  // 4. 其余芯片按品质
  G.chips.slice().sort(function (a, b) { return Q_ORDER.indexOf(b.quality) - Q_ORDER.indexOf(a.quality); }).forEach(function (c) { sock(c); });
  recalc();
  var over = cyberLoad() > adaptationCap();
  if (over) { loadoutApply(snap); toast('配不出不过载的组合，已恢复原样', 'bad'); return; }
  // 5. 背包放不下：问
  if (bagLoad() > bagCap()) {
    var excess = bagLoad() - bagCap();
    showModal('autofit');
    overlay.innerHTML = '<div class="card"><div class="kicker">AUTO FIT // 一键配装</div><h1 class="title small">背包放不下</h1><div class="hint">按新配装，换下来的义体超出背包 ' + excess + ' 点负重。<br>放在脚边地上，或者取消、维持原来的配装。</div>' +
      '<div class="dock"><button class="ghost" id="afNo">取消</button><button class="cta" id="afYes">放地上</button></div></div>';
    $('#afNo').onclick = function () { loadoutApply(snap); toast('已取消一键配装', 'warn'); openCyber(); };
    $('#afYes').onclick = function () { bagSettle(); toast('一键配装 · 负载 ' + cyberLoad() + '/' + adaptationCap() + ' · 放不下的在脚边', 'good'); openCyber(); };
    return 'ask';
  }
  toast('一键配装 · 负载 ' + cyberLoad() + '/' + adaptationCap(), 'good'); sfx.level();
  return true;
}
/* ---------- 养成：就地刷新 ---------- */
function refreshMetaNodes() {
  var ce = $('#metaCores'); if (ce) ce.textContent = META.cores;
  $$('[data-buy]').forEach(function (btn) {
    var id = btn.getAttribute('data-buy'), u = META_UP.find(function (x) { return x.id === id; }); if (!u) return;
    var lv = metaLvl(id), maxed = lv >= u.max, reqOk = u.tier === 1 || META_UP.some(function (q) { return q.branch === u.branch && q.tier === u.tier - 1 && metaLvl(q.id) > 0; });
    var cost = maxed ? 0 : metaCost(id), poured = (META.pour || {})[id] || 0;
    btn.classList.toggle('lock', !reqOk); btn.classList.toggle('maxed', maxed);
    var can = !maxed && reqOk && (META.cores > 0 || poured > 0);
    if (!btn.classList.contains('pouring')) btn.disabled = !can;
    if (reqOk && btn._wasLock) { btn.classList.remove('unlockfx'); void btn.offsetWidth; btn.classList.add('unlockfx'); }
    btn._wasLock = !reqOk;
    btn.querySelectorAll('.lvpips u').forEach(function (pp, k) { pp.classList.toggle('on', k < lv); });
    var c = btn.querySelector('.cost'); if (c) c.textContent = maxed ? '已满' : poured + ' / ' + cost;
    var f = btn.querySelector('.pour'); if (f && !btn.classList.contains('pouring')) { f.style.transition = 'height .12s ease-out'; f.style.height = (maxed ? 100 : Math.round(poured / Math.max(1, cost) * 100)) + '%'; }
  });
  var rb = $('#metaReset'); if (rb && !G._metaResetArm) rb.textContent = '重置升级 · 返还 ' + metaSpent();
}
/* ---------- 准备界面的适应度条（与局内同款） ---------- */
function prepGaugeHTML(load, cap) {
  var ov = load - cap, st = ov >= 5 ? 'critical' : ov > 0 ? 'over' : load >= cap * .5 ? 'sync' : 'clean', S = CHROME_STATES[st], scale = Math.max(cap * 1.4, load + 2);
  return '<div class="cgauge prepgauge" data-state="' + st + '" style="--cg:' + S.color + '"><div class="cg-head"><b>' + S.name + '</b><small>' + S.en + '</small><span>负载 ' + load + ' / 适应度 ' + cap + '</span></div>' +
    '<div class="cg-bar"><u style="left:' + (cap * .5 / scale * 100).toFixed(1) + '%"></u><i style="width:' + Math.min(100, load / scale * 100).toFixed(1) + '%"></i><em style="left:' + (cap / scale * 100).toFixed(1) + '%"></em></div>' +
    '<div class="cg-desc">' + (ov > 0 ? '超出适应度 ' + ov + '：开局就会过载，义体效能下降、受击可能失控。' : '开局按 1 级计算适应度，之后每升一级 +2。') + '</div></div>';
}
/* ---------- 成套义体插满芯片（体验装 / 制式券共用） ---------- */
function kitFillChips(ids, q, theme) {
  var T = TRIAL_CHIPS[theme] || TRIAL_CHIPS.kharon, corp = TRIAL_CHIPS[theme] ? theme : null, guard = 0, more = true;
  var slots = ids.map(function (id) { return cyberInstalledSlot(id); }).filter(Boolean);
  slots.forEach(function (sl) { G.cyberChips[sl] = G.cyberChips[sl] || []; });
  recalc();
  while (more && guard++ < 12) {
    more = false;
    slots.forEach(function (sl) {
      var cap = (QUALITY[MOD_BY[G.cyber[sl]].quality] || QUALITY.gray).slots, arr = G.cyberChips[sl]; if (arr.length >= cap) return; more = true;
      var deficit = cyberLoad() - adaptationCap(), cq = MOD_BY[G.cyber[sl]].quality;
      arr.push(deficit > 0 ? fixedChip('compat', cq, ['compat', 'hp'], null) : arr.length === 0 && corp ? fixedChip(T.core[0], cq, T.core[1], corp) : fixedChip(T.fill[0], cq, T.fill[1], null));
      recalc();
    });
  }
}
/* ---------- B16 / 委托引导 ---------- */
function objectiveLines() {
  var out = [], op = G.corpOp;
  if (G.b16 && G.depth === 16) {
    if (G.b16.phase === 'lines') out.push(['#fcee0a', '生产层', '切断三条生产线的总闸（小地图黄框）', Object.keys(G.b16.down).length + '/3']);
    else if (G.b16.phase === 'camp') { var k = B16_ORDER[G.b16.camp]; out.push([CORPS[k].color, '战役 ' + (G.b16.camp + 1) + '/3', '击败 ' + FIN.campaigns[k].boss.name, G.bossAlive ? '进行中' : '✓']); }
  }
  if (op && op.active && G.depth === op.depth) out.push([CORPS[op.corp].color, CORPS[op.corp].name + '委托', corpJobText(op.job, op.rival, 'goal') + (op.dev ? ' · 守住 ' + op.dev.left + ' 回合' : ''), op.done ? (op.failed ? '✗' : '✓') : op.progress + '/' + op.need]);
  return out.map(function (l) { return '<div class="qline ct obj" style="--ct:' + l[0] + '"><b>' + l[1] + '</b> ' + econEsc(l[2]) + '<span class="pv">' + l[3] + '</span></div>'; }).join('');
}
function drawObjectiveMarks(x, y, tw, th) {
  var t = performance.now() / 300;
  G.enemies.forEach(function (e) {
    if (e.hp <= 0) return;
    var mark = e.corpObj === 'line' ? '#fcee0a' : e.corpObj === 'gen' ? '#ff7a45' : e.vip ? '#fcee0a' : e.b16Boss ? '#ff365c' : null; if (!mark) return;
    var px = x + e.x * tw, py = y + e.y * th, r = 3 + (VFX.reduced ? 0 : Math.sin(t) * 1.2);
    ctx.save(); ctx.strokeStyle = mark; ctx.lineWidth = 1.5; ctx.strokeRect(px - r, py - r, r * 2, r * 2); ctx.fillStyle = mark; ctx.fillRect(px - 1, py - 1, 2, 2); ctx.restore();
  });
  (G.sites || []).forEach(function (s) { if (s.used || ['terminal', 'desk', 'cage', 'plant'].indexOf(s.type) < 0) return; var px = x + s.x * tw, py = y + s.y * th; ctx.save(); ctx.strokeStyle = '#fcee0a'; ctx.lineWidth = 1.2; ctx.strokeRect(px - 3, py - 3, 6, 6); ctx.restore(); });
}
/* ---------- 通关收尾 ---------- */
function thanksScreen(done) {
  showModal('thanks');
  overlay.innerHTML = '<div class="card thanks"><div class="m3-emblem thx">' + MN_LOGO + '</div><div class="kicker">THANK YOU FOR PLAYING</div><h1 class="title">感谢游玩</h1>' +
    '<div class="story-text" style="text-align:center">三条生产线停了，三个据点都端了。<br>你从井里爬出来了，这次是真的。</div>' +
    '<div class="m3-stats" style="margin:14px 0"><div><small>回合</small><b>' + G.turn + '</b></div><div><small>击杀</small><b>' + (G.kills || 0) + '</b></div><div><small>等级</small><b>' + p.level + '</b></div><div><small>通关</small><b>' + (META.cleared || 1) + '</b></div></div>' +
    '<div class="hint">回到主界面，老韩在余烬等你，他有个提议。</div><div class="dock"><button class="cta" id="thxGo">结算</button></div></div>';
  $('#thxGo').onclick = function () { done(); };
}
