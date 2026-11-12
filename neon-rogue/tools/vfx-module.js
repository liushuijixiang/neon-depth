/* =========================================================
   NEON_VFX_V2 · 赛博朋克战斗视效（纯渲染：不读写战斗状态，不用随机数影响结算）
   ========================================================= */
var NV = { kills: [], flashes: [], cols: [], booms: [], glitch: 0, crit: 0, critColor: '#ffd166' };
var NV_BITS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ<>/\\#$%&*';
function nvAdd() { if (!VFX.reduced) ctx.globalCompositeOperation = 'lighter'; }
function nvGlow(color, blur) { ctx.shadowColor = color; ctx.shadowBlur = VFX.reduced ? 0 : blur; }
function nvNoGlow() { ctx.shadowBlur = 0; }
function nvEase(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
function nvMix(a, b, t) { return a + (b - a) * t; }
function nvNow() { return performance.now(); }
function nvPunch(n) { G.punch = Math.max(G.punch || 0, n); }

/* ---------- 粒子：火花拖尾 / 碎片 / 数据字符 / 余烬 ---------- */
function nvSpawn(x, y, color, n, o) {
  o = o || {};
  var reduced = VFX.reduced, cap = reduced ? 90 : 520;
  n = Math.max(0, Math.round(n * (reduced ? .4 : 1)));
  if (G.particles.length + n > cap) G.particles.splice(0, G.particles.length + n - cap);
  var dir = o.dir, spread = o.spread == null ? TAU : o.spread, sp0 = o.speed || 3.4;
  for (var i = 0; i < n; i++) {
    var kind = o.kind || (i % 6 === 0 ? 'shard' : i % 9 === 4 ? 'bit' : 'spark');
    var a = dir == null ? Math.random() * TAU : dir + (Math.random() - .5) * spread;
    var sp = sp0 * (.35 + Math.random() * (kind === 'spark' ? 1.35 : .8));
    var life = (kind === 'bit' ? 520 : kind === 'shard' ? 620 : kind === 'ember' ? 900 : 330) * (.7 + Math.random() * .6);
    G.particles.push({ x: x + .5 + (o.jitter ? (Math.random() - .5) * o.jitter : 0), y: y + .5 + (o.jitter ? (Math.random() - .5) * o.jitter : 0),
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: life, max: life, color: i % 4 === 0 && kind === 'spark' ? '#ffffff' : color,
      size: kind === 'shard' ? 2.2 + Math.random() * 3.2 : 1.2 + Math.random() * 1.6, kind: kind,
      rot: Math.random() * TAU, vr: (Math.random() - .5) * 18, ch: NV_BITS[(Math.random() * NV_BITS.length) | 0], drag: o.drag || (kind === 'spark' ? .9 : .93), rise: o.rise || 0 });
  }
}
function burst(x, y, color, n) { nvSpawn(x, y, color, Math.round((n || 8) * 1.7)); }
function nvDrawParticles(view) {
  if (!G.particles.length) return;
  var t = view.tile;
  ctx.save(); nvAdd(); ctx.lineCap = 'round'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 ' + Math.max(8, Math.round(t * .28)) + 'px monospace';
  for (var i = 0; i < G.particles.length; i++) {
    var pt = G.particles[i];
    if (!view.on(pt.x, pt.y)) continue;
    var a = clamp(pt.life / pt.max, 0, 1), x = view.sx(pt.x - .5), y = view.sy(pt.y - .5);
    ctx.globalAlpha = a;
    if (pt.kind === 'spark') {
      var sp = Math.hypot(pt.vx, pt.vy) || 1, L = Math.min(t * .9, sp * t * .07 + 2), ux = pt.vx / sp, uy = pt.vy / sp;
      ctx.strokeStyle = pt.color; ctx.lineWidth = pt.size;
      ctx.beginPath(); ctx.moveTo(x - ux * L, y - uy * L); ctx.lineTo(x, y); ctx.stroke();
    } else if (pt.kind === 'shard') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(pt.rot); ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.moveTo(-pt.size, -pt.size * .35); ctx.lineTo(pt.size * .9, -pt.size * .55); ctx.lineTo(pt.size, pt.size * .4); ctx.lineTo(-pt.size * .7, pt.size * .5); ctx.closePath(); ctx.fill(); ctx.restore();
    } else if (pt.kind === 'bit') {
      ctx.fillStyle = pt.color; ctx.fillText(pt.ch, x, y);
    } else if (pt.kind === 'ember') {
      var g = ctx.createRadialGradient(x, y, 0, x, y, pt.size * 3); g.addColorStop(0, pt.color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - pt.size * 3, y - pt.size * 3, pt.size * 6, pt.size * 6);
    } else { ctx.fillStyle = pt.color; ctx.fillRect(x - pt.size / 2, y - pt.size / 2, pt.size, pt.size); }
  }
  ctx.restore();
}
function nvUpdateParticles(dt) {
  var keep = 0;
  for (var i = 0; i < G.particles.length; i++) {
    var pt = G.particles[i], drag = Math.pow(pt.drag || .95, dt / 16.667);
    pt.x += pt.vx * dt / 1000; pt.y += pt.vy * dt / 1000 - (pt.rise || 0) * dt / 1000; pt.vx *= drag; pt.vy *= drag;
    if (pt.vr) pt.rot += pt.vr * dt / 1000;
    if (pt.kind === 'bit' && Math.random() < .08) pt.ch = NV_BITS[(Math.random() * NV_BITS.length) | 0];
    pt.life -= dt; if (pt.life > 0) G.particles[keep++] = pt;
  }
  G.particles.length = keep;
}

/* ---------- 斩击：霓虹刀弧 ---------- */
// 一刀分三拍：出刀前的白线预兆 → 极速划出的新月刀弧（白芯 + 武器色 + 品红/青色错位） → 刀痕撕裂成横向故障条消散。
function nvCrescentPath(cx, cy, R, thick, a0, a1, steps) {
  ctx.beginPath();
  for (var k = 0; k <= steps; k++) { var q = k / steps, a = a0 + (a1 - a0) * q; ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
  for (var k2 = steps; k2 >= 0; k2--) { var q2 = k2 / steps, a2 = a0 + (a1 - a0) * q2, th = thick * Math.pow(Math.sin(Math.PI * Math.min(1, q2 * 1.08)), .7); ctx.lineTo(cx + Math.cos(a2) * (R - th), cy + Math.sin(a2) * (R - th)); }
  ctx.closePath();
}
function nvBlade(cx, cy, R, thick, a0, a1, color, alpha, glow) {
  if (Math.abs(a1 - a0) < .01) return;
  var g = ctx.createRadialGradient(cx, cy, Math.max(1, R - thick * 1.2), cx, cy, R + 1);
  g.addColorStop(0, hexA(color, 0)); g.addColorStop(.55, hexA(color, .55)); g.addColorStop(.86, color); g.addColorStop(1, '#ffffff');
  ctx.globalAlpha = alpha; nvGlow(color, glow); ctx.fillStyle = g; nvCrescentPath(cx, cy, R, thick, a0, a1, 22); ctx.fill(); nvNoGlow();
  // razor edge
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, thick * .12); ctx.globalAlpha = alpha;
  ctx.beginPath(); for (var k = 0; k <= 22; k++) { var a = a0 + (a1 - a0) * k / 22; ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); } ctx.stroke();
}
function nvStar(x, y, r, color, alpha, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.globalAlpha = alpha; nvGlow(color, r * 1.4);
  ctx.fillStyle = '#ffffff'; ctx.beginPath();
  for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, rr = i % 2 ? r * .16 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); nvNoGlow();
  ctx.fillStyle = color; ctx.globalAlpha = alpha * .6; ctx.beginPath(); ctx.arc(0, 0, r * .35, 0, TAU); ctx.fill();
  ctx.restore();
}
function nvCutLine(x, y, ang, len, color, alpha, w) {
  var ux = Math.cos(ang), uy = Math.sin(ang);
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round';
  [['#ff2fa8', -2.2], ['#22e6ff', 2.2]].forEach(function (c) {
    ctx.strokeStyle = c[0]; ctx.lineWidth = w * .8; ctx.beginPath();
    ctx.moveTo(x - ux * len + c[1] * -uy, y - uy * len + c[1] * ux); ctx.lineTo(x + ux * len + c[1] * -uy, y + uy * len + c[1] * ux); ctx.stroke();
  });
  nvGlow(color, 14); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x - ux * len, y - uy * len); ctx.lineTo(x + ux * len, y + uy * len); ctx.stroke(); nvNoGlow();
  ctx.restore();
}
function nvSlash(f, now, view) {
  var age = now - f.born; if (age < 0 || age >= f.life) return;
  var t = view.tile, u = age / f.life, reduced = VFX.reduced;
  var x = view.sx(f.x), y = view.sy(f.y), ex = view.sx(f.tx), ey = view.sy(f.ty), color = f.color || '#ff8fc7';
  var dx = ex - x, dy = ey - y, dist = Math.hypot(dx, dy); if (dist < 1) { dx = Math.cos(f.face); dy = Math.sin(f.face); dist = 1; }
  var rot = Math.atan2(dy, dx), v = f.variant || 'point', heavy = f.heavy, swing = reduced ? 1 : nvEase(Math.min(1, u / .26));
  var fade = u < .26 ? 1 : Math.max(0, 1 - (u - .26) / .74), dir = (f.seq % 2) ? 1 : -1;
  var R, thick, span;
  if (v === 'sweep') { R = t * Math.max(1.25, f.radius * .95); thick = t * (heavy ? .78 : .55); span = heavy ? 5.6 : 3.9; }
  else if (v === 'slam') { R = t * 1.35; thick = t * .85; span = 2.4; }
  else if (v === 'line') { R = Math.max(t * 1.2, dist + t * .55); thick = t * .3; span = .5; }
  else { R = Math.max(t * .95, dist + t * .38); thick = t * (heavy ? .62 : .44); span = 2.1; }
  var a0 = rot - dir * span / 2, a1 = rot + dir * span / 2, head = nvMix(a0, a1, swing);
  ctx.save(); nvAdd(); ctx.lineJoin = 'round';
  // 0) 攻击范围底光
  if (f.cells && f.cells.length) {
    ctx.globalAlpha = .18 * fade; ctx.fillStyle = color;
    f.cells.forEach(function (c) { if (view.on(c.x, c.y)) ctx.fillRect(view.sx(c.x) - t / 2 + 1, view.sy(c.y) - t / 2 + 1, t - 2, t - 2); });
  }
  // 1) 出刀预兆：沿刀路的白线
  if (!reduced && u < .1) { ctx.globalAlpha = 1 - u / .1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, R, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke(); }
  if (v === 'line') {
    // 突刺：一条贯穿的光刃 + 沿途残影
    var reach = (dist + t * .9) * swing, ux = dx / dist, uy = dy / dist;
    for (var gk = 0; gk < 3; gk++) { var ga = fade * (.25 + gk * .12); ctx.globalAlpha = ga; ctx.fillStyle = color;
      var gx = x + ux * reach * (gk + 1) / 4, gy = y + uy * reach * (gk + 1) / 4; ctx.beginPath(); ctx.arc(gx, gy, t * .18, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = fade; nvGlow(color, 22); ctx.strokeStyle = color; ctx.lineWidth = t * .32; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + ux * t * .3, y + uy * t * .3); ctx.lineTo(x + ux * reach, y + uy * reach); ctx.stroke();
    nvNoGlow(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = t * .1; ctx.stroke();
    nvStar(x + ux * reach, y + uy * reach, t * .55 * (1 - u * .5), color, fade, rot);
  } else {
    // 2) 主刀弧（头部最亮，尾部渐隐），三色错位
    var tailA = nvMix(a0, head, Math.max(0, u - .2) * 1.4);
    if (!reduced) {
      nvBlade(x - 2.5, y + 1, R, thick, tailA, head, '#ff2fa8', .55 * fade, 0);
      nvBlade(x + 2.5, y - 1, R, thick, tailA, head, '#22e6ff', .55 * fade, 0);
    }
    if (u < .45 || reduced) nvBlade(x, y, R, thick, tailA, head, color, fade, heavy ? 34 : 22);
    else {
      // 3) 刀痕撕裂：横向故障切片
      var tear = (u - .45) / .55, bands = 7, bh = (R * 2.4) / bands;
      for (var b = 0; b < bands; b++) {
        ctx.save(); ctx.beginPath(); ctx.rect(x - R * 1.3, y - R * 1.2 + b * bh, R * 2.6, bh * .82); ctx.clip();
        var off = ((f.seq * 7 + b * 13) % 11 - 5) * tear * t * .09;
        nvBlade(x + off, y, R, thick * (1 - tear * .6), tailA, head, color, fade * (1 - tear * .3), 10);
        ctx.restore();
      }
    }
    // 刀尖火花
    if (swing < 1 || u < .32) { var hx = x + Math.cos(head) * R, hy = y + Math.sin(head) * R; nvStar(hx, hy, t * (heavy ? .5 : .34), color, fade, head); }
    // 速度线
    if (!reduced && u < .5) {
      ctx.globalAlpha = (1 - u / .5) * .8; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      for (var s = 0; s < 6; s++) { var sa = nvMix(a0, a1, (s + .5) / 6), r1 = R + t * (.15 + u * .9), r2 = r1 + t * (.35 + (s % 3) * .15);
        ctx.beginPath(); ctx.moveTo(x + Math.cos(sa) * r1, y + Math.sin(sa) * r1); ctx.lineTo(x + Math.cos(sa) * r2, y + Math.sin(sa) * r2); ctx.stroke(); }
    }
  }
  // 4) 目标上的斩线（X 字或一字）
  if (u > .08) {
    var cu = Math.min(1, (u - .08) / .18), cutA = rot + dir * (Math.PI / 2 - .5), clen = t * (heavy ? 1.1 : .75) * nvEase(cu);
    var targets = (f.cells && (v === 'sweep' || v === 'slam')) ? [] : [{ x: ex, y: ey }];
    if (v === 'sweep' || v === 'slam') (f.hits || []).forEach(function (h) { if (view.on(h.x, h.y)) targets.push({ x: view.sx(h.x), y: view.sy(h.y) }); });
    if (!targets.length) targets.push({ x: ex, y: ey });
    targets.forEach(function (tp, i) {
      nvCutLine(tp.x, tp.y, cutA + i * .4, clen, color, fade * (1 - Math.max(0, u - .6)), heavy ? 3 : 2);
      if (v === 'point' && (f.stage || 0) % 2 === 1) nvCutLine(tp.x, tp.y, cutA + Math.PI / 2, clen * .85, color, fade * .9, 2);
    });
  }
  // 5) 重击：地裂冲击环
  if (v === 'slam' || heavy) {
    var ring = nvEase(Math.min(1, u / .6)), rr = t * (.4 + ring * (heavy ? 2.6 : 1.8));
    ctx.globalAlpha = (1 - ring) * .9; nvGlow(color, 18); ctx.strokeStyle = color; ctx.lineWidth = t * .12 * (1 - ring) + 1;
    ctx.beginPath(); ctx.arc(v === 'slam' ? ex : x, v === 'slam' ? ey : y, rr, 0, TAU); ctx.stroke(); nvNoGlow();
    if (v === 'slam') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; for (var c = 0; c < 7; c++) { var ca = c * TAU / 7 + f.seq, cl = t * (.5 + ring * 1.1);
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(ca) * cl * .5 + Math.cos(ca + 1) * t * .12, ey + Math.sin(ca) * cl * .5 + Math.sin(ca + 1) * t * .12); ctx.lineTo(ex + Math.cos(ca) * cl, ey + Math.sin(ca) * cl); ctx.stroke(); } }
  }
  ctx.restore();
}
// 居合：蓄力斩在整块画面上留下一道贯穿的光线
function nvIai(f, now, view, w, h) {
  var age = now - f.born; if (age < 0 || age > 520 || VFX.reduced) return;
  var u = age / 520, x = view.sx(f.tx), y = view.sy(f.ty), ang = Math.atan2(f.ty - f.y, f.tx - f.x) + .35;
  var L = Math.hypot(w, h);
  ctx.save(); nvAdd();
  ctx.globalAlpha = (1 - u) * .9; nvCutLine(x, y, ang, L * Math.min(1, u * 5), f.color, 1 - u, 2 + (1 - u) * 5);
  if (u < .18) { ctx.globalAlpha = (1 - u / .18) * .35; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
  ctx.restore();
}

/* ---------- 击杀：一刀两断 / 数据解体 ---------- */
function nvKill(e, cause) {
  if (!e) return;
  var melee = cause === 'melee', ang = Math.atan2(e.y - p.y, e.x - p.x) + Math.PI / 2 + (Math.random() - .5) * .6;
  NV.kills.push({ x: e.x, y: e.y, color: e.color || '#ff365c', born: nvNow(), ang: ang, boss: !!e.boss, elite: !!e.elite, melee: melee, seq: (G.chromeSkillSerial || 0) });
  if (NV.kills.length > 24) NV.kills.shift();
  nvSpawn(e.x, e.y, e.color || '#ff365c', e.boss ? 90 : e.elite ? 40 : 24, { speed: e.boss ? 6 : 4.2 });
  nvSpawn(e.x, e.y, '#7dffcf', e.boss ? 24 : 8, { kind: 'bit', speed: 1.4, rise: 1.2, drag: .97 });
  if (e.boss) { G.flash = Math.max(G.flash, 1); nvPunch(1.6); NV.glitch = Math.max(NV.glitch, 1); }
  else if (e.elite) nvPunch(.6);
}
function nvDrawKills(now, view) {
  var t = view.tile;
  for (var i = NV.kills.length - 1; i >= 0; i--) {
    var k = NV.kills[i], age = now - k.born, life = k.boss ? 1400 : 700;
    if (age > life) { NV.kills.splice(i, 1); continue; }
    if (!view.on(k.x, k.y)) continue;
    var u = age / life, x = view.sx(k.x), y = view.sy(k.y), r = t * (k.boss ? .9 : .32), sep = nvEase(u) * t * (k.boss ? .9 : .45);
    var nx = Math.cos(k.ang + Math.PI / 2), ny = Math.sin(k.ang + Math.PI / 2), ux = Math.cos(k.ang), uy = Math.sin(k.ang);
    ctx.save();
    // 两半残骸沿斩线滑开
    [-1, 1].forEach(function (s) {
      ctx.save(); ctx.globalAlpha = (1 - u) * .95;
      ctx.translate(x + nx * sep * s + ux * sep * .3 * s, y + ny * sep * s + uy * sep * .3 * s); ctx.rotate(k.ang + s * u * .5);
      ctx.beginPath(); ctx.rect(-r * 1.4, s < 0 ? -r * 1.4 : 0, r * 2.8, r * 1.4); ctx.clip();
      ctx.fillStyle = '#1b2833'; ctx.strokeStyle = k.color; ctx.lineWidth = 1.6; visualPlate(0, 0, r * 2, r * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    });
    nvAdd();
    // 发光切口
    nvCutLine(x, y, k.ang, r * 1.8 * (1 + u), k.color, (1 - u), 2.4);
    // 冲击环 + 闪光
    var ring = nvEase(u); ctx.globalAlpha = (1 - u) * .8; nvGlow(k.color, 16); ctx.strokeStyle = k.color; ctx.lineWidth = 2 + (1 - u) * 3;
    ctx.beginPath(); ctx.arc(x, y, t * (.3 + ring * (k.boss ? 3.2 : 1.2)), 0, TAU); ctx.stroke(); nvNoGlow();
    if (u < .2) nvStar(x, y, t * (k.boss ? 1.6 : .8) * (1 - u * 2), k.color, 1 - u / .2, k.ang);
    if (k.boss && u < .7) { ctx.globalAlpha = (1 - u / .7) * .6; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; for (var j = 0; j < 12; j++) { var a = j * TAU / 12 + u; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * t, y + Math.sin(a) * t); ctx.lineTo(x + Math.cos(a) * t * (2 + u * 5), y + Math.sin(a) * t * (2 + u * 5)); ctx.stroke(); } }
    ctx.restore();
  }
}

/* ---------- 爆炸 / 数据柱 / 屏幕效果 ---------- */
function nvExplode(x, y, color, radius) {
  NV.booms.push({ x: x, y: y, color: color || '#ffb347', r: radius || 1.2, born: nvNow() });
  if (NV.booms.length > 16) NV.booms.shift();
  nvSpawn(x, y, color || '#ffb347', 34, { speed: 5.5 });
  nvSpawn(x, y, '#ffd9a0', 14, { kind: 'ember', speed: 1.6, drag: .96, jitter: 1 });
  nvPunch(.9); G.shake = Math.max(G.shake, 9);
}
function nvColumn(x, y, color, tall) { NV.cols.push({ x: x, y: y, color: color, born: nvNow(), tall: tall || 3 }); if (NV.cols.length > 10) NV.cols.shift(); nvSpawn(x, y, color, 10, { kind: 'bit', speed: .8, rise: 2.6, drag: .98, jitter: .8 }); }
function nvDrawBooms(now, view) {
  var t = view.tile;
  for (var i = NV.booms.length - 1; i >= 0; i--) {
    var b = NV.booms[i], age = now - b.born; if (age > 650) { NV.booms.splice(i, 1); continue; }
    if (!view.on(b.x, b.y)) continue;
    var u = age / 650, x = view.sx(b.x), y = view.sy(b.y), R = t * b.r * (.4 + nvEase(u) * 1.4);
    ctx.save(); nvAdd();
    var g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, 'rgba(255,255,255,' + (1 - u) + ')'); g.addColorStop(.35, hexA(b.color, (1 - u) * .85)); g.addColorStop(1, hexA(b.color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1 - u; nvGlow(b.color, 20); ctx.strokeStyle = b.color; ctx.lineWidth = 3 * (1 - u) + 1;
    chromeFxHex(x, y, R * 1.25, .06, u); ctx.stroke(); nvNoGlow();
    ctx.restore();
  }
  for (var j = NV.cols.length - 1; j >= 0; j--) {
    var c = NV.cols[j], ca = now - c.born; if (ca > 900) { NV.cols.splice(j, 1); continue; }
    if (!view.on(c.x, c.y)) continue;
    var cu = ca / 900, cx = view.sx(c.x), cy = view.sy(c.y), hh = t * c.tall * nvEase(Math.min(1, cu * 2.5));
    ctx.save(); nvAdd();
    var lg = ctx.createLinearGradient(cx, cy - hh, cx, cy); lg.addColorStop(0, hexA(c.color, 0)); lg.addColorStop(1, hexA(c.color, .55 * (1 - cu)));
    ctx.fillStyle = lg; ctx.fillRect(cx - t * .32, cy - hh, t * .64, hh);
    ctx.globalAlpha = 1 - cu; ctx.strokeStyle = c.color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, cy, t * (.4 + cu * .6), t * (.15 + cu * .2), 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}
function nvScreen(now, w, h) {
  var reduced = VFX.reduced;
  ctx.save();
  // 受击：红色色差暗角 + 故障条
  if (G.hurt > 0) {
    var hv = G.hurt, g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .25, w / 2, h / 2, Math.max(w, h) * .72);
    g.addColorStop(0, 'rgba(255,0,60,0)'); g.addColorStop(1, 'rgba(255,0,60,' + (.42 * hv) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    if (!reduced && hv > .45) { nvAdd(); for (var i = 0; i < 4; i++) { var by = ((now * .37 + i * 197) % h), bh2 = 2 + (i % 3) * 3; ctx.globalAlpha = hv * .5; ctx.fillStyle = i % 2 ? '#ff2fa8' : '#22e6ff'; ctx.fillRect((i % 2 ? 6 : -6) * hv, by, w, bh2); } }
  }
  // 暴击：金色瞬闪 + 四角括号收缩
  if (NV.crit > 0) {
    var cv = NV.crit; ctx.globalCompositeOperation = 'source-over'; nvAdd();
    ctx.globalAlpha = cv * .16; ctx.fillStyle = NV.critColor; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = cv; ctx.strokeStyle = NV.critColor; ctx.lineWidth = 3; var m = 8 + (1 - cv) * 30, L = 26;
    [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]].forEach(function (c) { ctx.beginPath(); ctx.moveTo(c[0], c[1] + L * c[3]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0] + L * c[2], c[1]); ctx.stroke(); });
  }
  // 守卫击破 / 大招：全屏 RGB 撕裂
  if (NV.glitch > 0 && !reduced) {
    nvAdd(); var gv = NV.glitch;
    for (var s = 0; s < 9; s++) { var sy2 = ((s * 131 + Math.floor(now / 40) * 57) % h), sh = 3 + (s % 4) * 5; ctx.globalAlpha = gv * .35; ctx.fillStyle = ['#ff2fa8', '#22e6ff', '#fcee0a'][s % 3]; ctx.fillRect(((s * 37) % 23 - 11) * gv * 2, sy2, w, sh); }
  }
  ctx.restore();
}
function nvUpdate(dt) {
  G.punch = Math.max(0, (G.punch || 0) - dt * .006);
  NV.crit = Math.max(0, NV.crit - dt * .004);
  NV.glitch = Math.max(0, NV.glitch - dt * .0018);
}

/* ---------- 伤害数字：倾斜粗体 + 弹出 + 色差 ---------- */
function nvDrawTexts(view) {
  var t = view.tile;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  G.texts.forEach(function (tx) {
    if (!view.on(tx.x, tx.y)) return;
    var a = clamp(tx.life / tx.max, 0, 1), born = tx.max - tx.life, pop = VFX.reduced ? 1 : 1 + Math.max(0, 1 - born / 140) * (tx.big ? .9 : .45);
    var isNum = /^[暴击\s-]*-?\d/.test(tx.text) || /^-\d/.test(tx.text), crit = tx.text.indexOf('暴击') === 0;
    var size = Math.max(10, Math.round(t * (crit ? .62 : tx.big ? .5 : isNum ? .42 : .34) * pop));
    var x = view.sx(tx.x - .5), y = view.sy(tx.y - .5);
    ctx.globalAlpha = a; ctx.font = (isNum ? 'italic 900 ' : '700 ') + size + 'px "Arial Black", Impact, sans-serif';
    if (crit && !VFX.reduced) { ctx.globalAlpha = a * .7; ctx.fillStyle = '#ff2fa8'; ctx.fillText(tx.text, x - 2, y + 1); ctx.fillStyle = '#22e6ff'; ctx.fillText(tx.text, x + 2, y - 1); ctx.globalAlpha = a; }
    ctx.lineWidth = Math.max(2.5, size * .16); ctx.strokeStyle = '#04070d'; ctx.lineJoin = 'round'; ctx.strokeText(tx.text, x, y);
    if (tx.big || crit) nvGlow(tx.color, 10);
    ctx.fillStyle = tx.color; ctx.fillText(tx.text, x, y); nvNoGlow();
  });
  ctx.restore();
}

/* ---------- 子弹 / 光束 / 冲击补光层 ---------- */
function nvBeamGlow(f, now, view) {
  var age = now - f.born; if (age < 0 || age >= f.life) return;
  var u = age / f.life, x = view.sx(f.x), y = view.sy(f.y), ex = view.sx(f.tx), ey = view.sy(f.ty), t = view.tile, heavy = f.heavy;
  var reach = VFX.reduced ? 1 : Math.min(1, u * 6), fx2 = x + (ex - x) * reach, fy2 = y + (ey - y) * reach, fade = 1 - u;
  ctx.save(); nvAdd(); ctx.lineCap = 'round';
  ctx.globalAlpha = fade * .6; nvGlow(f.color, heavy ? 30 : 16); ctx.strokeStyle = f.color; ctx.lineWidth = (heavy ? t * .34 : t * .14) * (1 - u * .6);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(fx2, fy2); ctx.stroke(); nvNoGlow();
  ctx.globalAlpha = fade; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = heavy ? 2.6 : 1.4; ctx.stroke();
  if (u < .3) nvStar(x, y, t * (heavy ? .7 : .42) * (1 - u), f.color, 1 - u / .3, Math.atan2(ey - y, ex - x));
  if (reach >= 1) nvStar(ex, ey, t * (heavy ? .65 : .4) * fade, f.color, fade, u * 3);
  ctx.restore();
}
function nvImpactGlow(f, now, view) {
  var age = now - f.born; if (age < 0 || age >= f.life) return;
  var u = age / f.life, x = view.sx(f.x), y = view.sy(f.y), t = view.tile;
  ctx.save(); nvAdd(); nvStar(x, y, t * (f.crit ? .9 : .5) * (1 - u * .7), f.color, 1 - u, f.seq);
  if (f.crit) { ctx.globalAlpha = 1 - u; nvGlow(f.color, 18); ctx.strokeStyle = f.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, t * (.3 + nvEase(u) * 1.1), 0, TAU); ctx.stroke(); nvNoGlow(); }
  ctx.restore();
}
function nvRingGlow(f, now, view) {
  var age = now - f.born; if (age < 0 || age >= f.life) return;
  var u = age / f.life, x = view.sx(f.x), y = view.sy(f.y), t = view.tile, R = t * f.radius * (.25 + nvEase(u) * 1.05);
  ctx.save(); nvAdd();
  var g = ctx.createRadialGradient(x, y, R * .6, x, y, R);
  g.addColorStop(0, hexA(f.color, 0)); g.addColorStop(.85, hexA(f.color, .35 * (1 - u))); g.addColorStop(1, hexA('#ffffff', .6 * (1 - u)));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
  ctx.restore();
}
