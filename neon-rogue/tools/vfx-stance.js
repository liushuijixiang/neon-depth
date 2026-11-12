/* =========================================================
   NEON_VFX_STANCE · 蓄力 / 蓄势 / 连段预告（纯渲染）
   ========================================================= */
var NV_NUM = ['', '壱', '弐', '参', '肆', '伍'];
function nvBrackets(x, y, s, color, alpha, lw) {
  var h = s / 2, L = s * .26;
  ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = lw || 1.4; ctx.beginPath();
  ctx.moveTo(x - h, y - h + L); ctx.lineTo(x - h, y - h); ctx.lineTo(x - h + L, y - h);
  ctx.moveTo(x + h - L, y - h); ctx.lineTo(x + h, y - h); ctx.lineTo(x + h, y - h + L);
  ctx.moveTo(x + h, y + h - L); ctx.lineTo(x + h, y + h); ctx.lineTo(x + h - L, y + h);
  ctx.moveTo(x - h + L, y + h); ctx.lineTo(x - h, y + h); ctx.lineTo(x - h, y + h - L);
  ctx.stroke();
}
// 范围格：角括号 + 从角色向外扫过的能量波；lvl 0..1 控制强度
function nvRangeCells(cells, color, lvl, now, view, period) {
  var t = view.tile, px = view.sx(p.x), py = view.sy(p.y), reduced = VFX.reduced;
  var maxD = 1; cells.forEach(function (c) { maxD = Math.max(maxD, Math.max(Math.abs(c.x - p.x), Math.abs(c.y - p.y))); });
  var wave = reduced ? -1 : ((now % (period || 1100)) / (period || 1100)) * (maxD + 1.2);
  cells.forEach(function (c) {
    if (!view.on(c.x, c.y)) return;
    var x = view.sx(c.x), y = view.sy(c.y), d = Math.max(Math.abs(c.x - p.x), Math.abs(c.y - p.y));
    var hit = reduced ? .5 : Math.max(0, 1 - Math.abs(wave - d) * 1.6);
    ctx.globalAlpha = (.05 + lvl * .12 + hit * .22); ctx.fillStyle = color;
    ctx.fillRect(x - t / 2 + 2, y - t / 2 + 2, t - 4, t - 4);
    nvBrackets(x, y, t - 5 - hit * 3, hit > .3 ? '#ffffff' : color, .45 + lvl * .35 + hit * .3, 1.2 + hit * 1.2);
  });
}
function nvChargeAura(now, view, color, lvl, max, shape, face) {
  var t = view.tile, x = view.sx(p.x), y = view.sy(p.y), reduced = VFX.reduced, k = lvl / Math.max(1, max), full = lvl >= max;
  ctx.save(); nvAdd();
  // 汇聚的能量线
  var n = reduced ? 0 : 6 + lvl * 5;
  for (var i = 0; i < n; i++) {
    var seed = i * 2.399, ph = ((now / (520 - lvl * 70)) + i * .37) % 1, a = seed + Math.floor((now / (520 - lvl * 70)) + i * .37) * 1.3;
    var r0 = t * (1.5 - ph * 1.1), r1 = r0 + t * (.25 + k * .35);
    ctx.globalAlpha = Math.sin(ph * Math.PI) * (.5 + k * .5); ctx.strokeStyle = i % 3 ? color : '#ffffff'; ctx.lineWidth = 1 + k * 1.2;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.lineTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.stroke();
  }
  // 环绕的蓄力刻印：已蓄满的发光，未蓄的空心
  var orbit = reduced ? 0 : now * (.0016 + k * .002);
  for (var j = 0; j < max; j++) {
    var oa = orbit + j * TAU / max, ox = x + Math.cos(oa) * t * .72, oy = y + Math.sin(oa) * t * .72, on = j < lvl;
    ctx.save(); ctx.translate(ox, oy); ctx.rotate(oa + Math.PI / 4);
    ctx.globalAlpha = on ? 1 : .35; nvGlow(color, on ? 12 : 0); ctx.fillStyle = on ? '#ffffff' : 'rgba(0,0,0,0)'; ctx.strokeStyle = color; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.rect(-t * .07, -t * .07, t * .14, t * .14); if (on) ctx.fill(); ctx.stroke(); nvNoGlow(); ctx.restore();
  }
  // 刀鞘寒光（直线类）/ 旋转刃环（范围类）
  if (shape === 'line' || shape === 'point') {
    var glint = reduced ? .6 : Math.pow(Math.max(0, Math.sin(now * .006 + lvl)), 6);
    var ux = Math.cos(face), uy = Math.sin(face), L = t * (.45 + k * .5);
    ctx.globalAlpha = .35 + glint * .65; nvGlow(color, 10 + glint * 20); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5 + k * 1.5;
    ctx.beginPath(); ctx.moveTo(x - ux * t * .1 - uy * t * .32, y - uy * t * .1 + ux * t * .32); ctx.lineTo(x + ux * L - uy * t * .32, y + uy * L + ux * t * .32); ctx.stroke(); nvNoGlow();
  } else {
    var sp = reduced ? 0 : now * (.004 + k * .006);
    ctx.globalAlpha = .4 + k * .4; nvGlow(color, 14); ctx.strokeStyle = color; ctx.lineWidth = 2;
    for (var s = 0; s < 3; s++) { ctx.beginPath(); ctx.arc(x, y, t * .58, sp + s * TAU / 3, sp + s * TAU / 3 + .9); ctx.stroke(); } nvNoGlow();
  }
  // 蓄满：脉冲光环 + 电弧
  if (full) {
    var pulse = reduced ? .5 : .5 + .5 * Math.sin(now * .012);
    ctx.globalAlpha = .45 + pulse * .45; nvGlow(color, 24); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5 + pulse * 1.5;
    ctx.beginPath(); ctx.arc(x, y, t * (.86 + pulse * .08), 0, TAU); ctx.stroke(); nvNoGlow();
    if (!reduced) { ctx.strokeStyle = color; ctx.lineWidth = 1.2; for (var z = 0; z < 3; z++) { var za = (Math.floor(now / 70) * 1.7 + z * 2.1), zr = t * .9; ctx.globalAlpha = .8; ctx.beginPath(); ctx.moveTo(x + Math.cos(za) * zr * .6, y + Math.sin(za) * zr * .6);
      for (var q = 1; q <= 4; q++) { var qa = za + (q % 2 ? .25 : -.2), qr = zr * (.6 + q * .15); ctx.lineTo(x + Math.cos(qa) * qr, y + Math.sin(qa) * qr); } ctx.stroke(); } }
  }
  ctx.restore();
}
// 蓄力档位上升：冲击环 + 大号档位字
function nvChargeUp(lvl, max, color) {
  NV.chargeUps = NV.chargeUps || [];
  NV.chargeUps.push({ lvl: lvl, max: max, color: color, born: nvNow() });
  if (NV.chargeUps.length > 4) NV.chargeUps.shift();
  nvSpawn(p.x, p.y, color, 10 + lvl * 8, { speed: 2.6 + lvl });
  nvPunch(.3 + lvl * .25);
}
function nvDrawChargeUps(now, view) {
  var list = NV.chargeUps || [], t = view.tile;
  for (var i = list.length - 1; i >= 0; i--) {
    var c = list[i], age = now - c.born; if (age > 700) { list.splice(i, 1); continue; } if (age < 0 || !view.on(p.x, p.y)) continue;
    var u = age / 700, x = view.sx(p.x), y = view.sy(p.y), full = c.lvl >= c.max;
    ctx.save(); nvAdd();
    ctx.globalAlpha = (1 - u) * .9; nvGlow(c.color, 18); ctx.strokeStyle = full ? '#ffffff' : c.color; ctx.lineWidth = 3 * (1 - u) + 1;
    ctx.beginPath(); ctx.arc(x, y, t * (.4 + nvEase(u) * (full ? 2.4 : 1.5)), 0, TAU); ctx.stroke(); nvNoGlow();
    ctx.globalCompositeOperation = 'source-over'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var sz = t * (full ? 1.25 : 1) * (1 + (1 - nvEase(Math.min(1, u * 3))) * .5), ty = y - t * (1.05 + u * .3);
    ctx.font = '900 ' + Math.round(sz) + 'px "Noto Sans CJK SC", sans-serif'; ctx.lineJoin = 'round';
    ctx.globalAlpha = Math.min(1, (1 - u) * 1.6); ctx.lineWidth = Math.max(3, sz * .14); ctx.strokeStyle = '#05070d'; ctx.strokeText(NV_NUM[c.lvl] || c.lvl, x, ty);
    if (!VFX.reduced) { ctx.globalAlpha *= .8; ctx.fillStyle = '#ff2fa8'; ctx.fillText(NV_NUM[c.lvl] || c.lvl, x - 2, ty + 1); ctx.fillStyle = '#22e6ff'; ctx.fillText(NV_NUM[c.lvl] || c.lvl, x + 2, ty - 1); ctx.globalAlpha /= .8; }
    nvGlow(c.color, 14); ctx.fillStyle = full ? '#ffffff' : c.color; ctx.fillText(NV_NUM[c.lvl] || c.lvl, x, ty); nvNoGlow();
    if (full) { ctx.font = '700 ' + Math.round(t * .26) + 'px monospace'; ctx.fillStyle = '#ffffff'; ctx.fillText('MAX', x, ty + sz * .62); }
    ctx.restore();
  }
}
// 连段刻度：角色脚下显示当前第几式
function nvComboPips(view, n, idx, color) {
  var t = view.tile, x = view.sx(p.x), y = view.sy(p.y) + t * .62, w = t * .16, gap = t * .06, total = n * w + (n - 1) * gap;
  ctx.save();
  for (var i = 0; i < n; i++) {
    var cx = x - total / 2 + i * (w + gap), on = i === idx, done = i < idx;
    ctx.globalAlpha = on ? 1 : done ? .65 : .3; ctx.fillStyle = on ? '#ffffff' : color;
    ctx.beginPath(); ctx.moveTo(cx + 2, y); ctx.lineTo(cx + w, y); ctx.lineTo(cx + w - 2, y + 4); ctx.lineTo(cx, y + 4); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// 主入口：在地形之后、单位之前绘制
function nvStanceLayer(now, view) {
  if (!p || G.state !== 'play') return;
  var mw = meleeWeapon(), face = p.face || 0;
  ctx.save();
  // 义体主动「蓄势」：范围已锁定，下一次行动释放
  if (G.stance) {
    var sc = G.stance.color || '#ff9f43', cells = tacticArea(p.x, p.y, G.stance.r || 1).filter(function (c) { return !(c.x === p.x && c.y === p.y); });
    nvRangeCells(cells, sc, 1, now, view, 700);
    var t = view.tile, x = view.sx(p.x), y = view.sy(p.y), R = t * ((G.stance.r || 1) + .5), sweep = VFX.reduced ? 0 : now * .006;
    ctx.save(); nvAdd(); ctx.globalAlpha = .9; nvGlow(sc, 16); ctx.strokeStyle = sc; ctx.lineWidth = 2;
    ctx.strokeRect(x - R, y - R, R * 2, R * 2); nvNoGlow();
    var g = ctx.createConicGradient ? ctx.createConicGradient(sweep, x, y) : null;
    if (g) { g.addColorStop(0, hexA(sc, .45)); g.addColorStop(.12, hexA(sc, 0)); g.addColorStop(1, hexA(sc, 0)); ctx.fillStyle = g; ctx.globalAlpha = 1; ctx.fillRect(x - R, y - R, R * 2, R * 2); }
    ctx.restore();
    nvChargeAura(now, view, sc, 1, 1, 'sweep', face);
  }
  if (mw && mw.melee) {
    var prof = mw.melee, stages = meleeStages(prof), idx = (G.melee.seq || 0) % stages.length, st = stages[idx], color = prof.color || '#ff8fc7';
    var max = (prof.charge && prof.charge.max) || (prof.type === 'charge' ? 3 : 0), lvl = G.melee.charge || 0;
    var cellsN = meleeRangeCells(st);
    if (lvl > 0) {
      nvRangeCells(cellsN, color, lvl / Math.max(1, max), now, view, 1300 - lvl * 250);
      nvChargeAura(now, view, color, lvl, Math.max(lvl, max), st.shape || 'point', face);
    } else if (st.shape === 'sweep' || st.shape === 'slam') {
      // 下一式是范围招：提前在身边标出范围
      nvRangeCells(cellsN, color, 0, now, view, 1600);
    }
    if (stages.length > 1) nvComboPips(view, stages.length, idx, color);
  }
  nvDrawChargeUps(now, view);
  ctx.restore();
}

/* ---------- 回旋斩：360° 刃环扫过整个范围 ---------- */
function nvSpin(f, now, view) {
  var age = now - f.born; if (age < 0 || age >= f.life) return;
  var t = view.tile, u = age / f.life, x = view.sx(f.x), y = view.sy(f.y), color = f.color || '#ff9f43', reduced = VFX.reduced;
  var r = Math.max(1, f.ring || 1), R = t * (r + .45), turn = reduced ? 1 : nvEase(Math.min(1, u / .38)), a0 = f.face || 0, head = a0 + turn * TAU * (f.seq % 2 ? 1 : -1);
  var fade = u < .38 ? 1 : Math.max(0, 1 - (u - .38) / .62);
  ctx.save(); nvAdd();
  // 扫过的格子依次闪亮
  (f.cells || []).forEach(function (c) {
    if (!view.on(c.x, c.y) || (c.x === f.x && c.y === f.y)) return;
    var ca = Math.atan2(c.y - f.y, c.x - f.x), rel = ((ca - a0) * (f.seq % 2 ? 1 : -1) % TAU + TAU) % TAU, passed = rel <= turn * TAU + .01;
    if (!passed) return;
    var since = Math.max(0, turn * TAU - rel) / TAU, flash = Math.max(0, 1 - since * 2.4);
    ctx.globalAlpha = fade * (.16 + flash * .55); ctx.fillStyle = flash > .5 ? '#ffffff' : color; ctx.fillRect(view.sx(c.x) - t / 2 + 2, view.sy(c.y) - t / 2 + 2, t - 4, t - 4);
    nvBrackets(view.sx(c.x), view.sy(c.y), t - 4, color, fade * .8, 1.6);
  });
  // 刃环主体
  var tail = head - (f.seq % 2 ? 1 : -1) * Math.min(TAU * .9, turn * TAU);
  var A = Math.min(tail, head), B = Math.max(tail, head);
  if (!reduced) { nvBlade(x - 2, y + 1, R, t * .5, A, B, '#ff2fa8', .45 * fade, 0); nvBlade(x + 2, y - 1, R, t * .5, A, B, '#22e6ff', .45 * fade, 0); }
  nvBlade(x, y, R, t * .55, A, B, color, fade, 30);
  if (u < .4) nvStar(x + Math.cos(head) * R, y + Math.sin(head) * R, t * .5, color, 1, head);
  // 收刀冲击环
  if (u > .3) { var ru = (u - .3) / .7; ctx.globalAlpha = (1 - ru) * .9; nvGlow(color, 20); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * (1 - ru) + 1; ctx.strokeRect(x - R - ru * t * .6, y - R - ru * t * .6, (R + ru * t * .6) * 2, (R + ru * t * .6) * 2); nvNoGlow(); }
  ctx.restore();
}
