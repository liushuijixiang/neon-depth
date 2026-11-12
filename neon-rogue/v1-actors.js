/* 1.0 角色造型与移动补间。只负责画，不读写玩法状态。 */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var pos = new WeakMap();
  var lastNow = 0, dt = 16;

  function frame(now) { dt = lastNow ? Math.min(80, Math.max(0, now - lastNow)) : 16; lastNow = now; }

  /* 返回实体的绘制坐标（格子单位）。跨度过大视为瞬移，直接到位。 */
  function at(e, snap) {
    var s = pos.get(e);
    if (!s) { s = { x: e.x, y: e.y, v: 0 }; pos.set(e, s); return s; }
    var dx = e.x - s.x, dy = e.y - s.y, far = Math.abs(dx) > 2.6 || Math.abs(dy) > 2.6;
    if (snap || far) { s.x = e.x; s.y = e.y; s.v = 0; return s; }
    var k = 1 - Math.exp(-dt / 55);
    s.x += dx * k; s.y += dy * k; s.v = Math.abs(dx) + Math.abs(dy);
    if (s.v < .01) { s.x = e.x; s.y = e.y; s.v = 0; }
    return s;
  }

  function poly(ctx, pts) { ctx.beginPath(); for (var i = 0; i < pts.length; i += 2) { if (i) ctx.lineTo(pts[i], pts[i + 1]); else ctx.moveTo(pts[i], pts[i + 1]); } ctx.closePath(); }

  /* 正面小人：o = { cls, face, moving, hidden, lunge(0..1), mech, grow } */
  function player(ctx, x, y, tile, now, o) {
    var u = tile * .58 * (o.grow ? 1.25 : 1), dir = Math.cos(o.face || 0) < -.01 ? -1 : 1;
    var acc = o.cls === 'engineer' ? '#ffd166' : o.cls === 'ghost' ? '#b690ff' : '#22e6ff';
    var line = '#d6ecf2', dark = '#0e1a25', coat = o.cls === 'engineer' ? '#2a2413' : o.cls === 'ghost' ? '#1c1530' : '#10283a';
    var bob = o.still ? 0 : Math.sin(now / 420) * u * .035, swing = o.moving ? Math.sin(now / 55) * u * .12 : 0;
    var lw = Math.max(1.1, tile * .05), L = (o.lunge || 0) * u * .38;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.ellipse(x, y + u * .8, u * .5, u * .16, 0, 0, TAU); ctx.fill();
    var cast = o.cast, ck = cast ? cast.k : 0, cs = cast ? Math.sin(ck * Math.PI) : 0, sqx = 1, sqy = 1, rx = 0, ry = 0;
    if (cast) {
      var cc = cast.color || acc, fx = Math.cos(o.face || 0), fy = Math.sin(o.face || 0);
      if (cast.kind === 'shoot') { rx = -fx * cs * u * .16; ry = -fy * cs * u * .16; }
      else if (cast.kind === 'dash') {
        for (var gi = 3; gi >= 1; gi--) { ctx.globalAlpha = (1 - ck) * .22 * (4 - gi); ctx.fillStyle = cc; var gx = x - fx * gi * u * .55 * (1 - ck * .4), gy = y - fy * gi * u * .55 * (1 - ck * .4);
          ctx.beginPath(); ctx.arc(gx, gy - u * .5, u * .26, 0, TAU); ctx.fill(); ctx.fillRect(gx - u * .32, gy - u * .2, u * .64, u * .7); }
        ctx.globalAlpha = 1;
      } else {
        // 脚下展开的六边阵 + 向上的光柱
        ctx.save(); ctx.translate(x, y + u * .78); ctx.scale(1, .36); ctx.strokeStyle = cc; ctx.globalAlpha = 1 - ck; ctx.lineWidth = lw * 1.4;
        for (var ri = 0; ri < 2; ri++) { var rr = u * (.5 + ck * (1.1 + ri * .7)); ctx.beginPath(); for (var hi = 0; hi < 6; hi++) { var ha = hi * TAU / 6 + ck * (ri ? -1.2 : 1.2); if (hi) ctx.lineTo(Math.cos(ha) * rr, Math.sin(ha) * rr); else ctx.moveTo(Math.cos(ha) * rr, Math.sin(ha) * rr); } ctx.closePath(); ctx.stroke(); }
        ctx.restore();
        ctx.fillStyle = cc; for (var pi = 0; pi < 5; pi++) { var px = x + (pi - 2) * u * .34, ph = u * (1.1 + ((pi * 7) % 3) * .35) * cs; ctx.globalAlpha = (1 - ck) * .5; ctx.fillRect(px - lw * .5, y + u * .7 - ph, lw, ph); }
        ctx.globalAlpha = 1; sqy = 1 + cs * .08 - (ck < .25 ? (.25 - ck) * .5 : 0); sqx = 2 - sqy;
      }
    }
    ctx.translate(x + Math.cos(o.face || 0) * L + rx, y + bob + Math.sin(o.face || 0) * L + ry); ctx.translate(0, u * .78); ctx.scale(dir * sqx, sqy); ctx.translate(0, -u * .78);
    ctx.lineWidth = lw; ctx.strokeStyle = line;
    // 腿
    ctx.beginPath(); ctx.moveTo(-u * .15, u * .3); ctx.lineTo(-u * .19 - swing, u * .76); ctx.moveTo(u * .15, u * .3); ctx.lineTo(u * .19 + swing, u * .76); ctx.stroke();
    ctx.strokeStyle = acc; ctx.beginPath(); ctx.moveTo(-u * .27 - swing, u * .77); ctx.lineTo(-u * .1 - swing, u * .77); ctx.moveTo(u * .11 + swing, u * .77); ctx.lineTo(u * .3 + swing, u * .77); ctx.stroke();
    ctx.strokeStyle = line;
    if (o.cls === 'engineer') {
      // 背包与天线
      ctx.fillStyle = '#3a3118'; ctx.fillRect(-u * .5, -u * .2, u * .22, u * .5); ctx.strokeRect(-u * .5, -u * .2, u * .22, u * .5);
      ctx.beginPath(); ctx.moveTo(-u * .42, -u * .2); ctx.lineTo(-u * .5, -u * .78); ctx.stroke();
      ctx.fillStyle = acc; ctx.fillRect(-u * .54, -u * .84, u * .09, u * .09);
    }
    if (o.cls === 'ghost') {
      // 围巾拖尾
      var w = Math.sin(now / 260) * u * .06;
      ctx.strokeStyle = acc; ctx.beginPath(); ctx.moveTo(-u * .16, -u * .2); ctx.quadraticCurveTo(-u * .52, -u * .12 + w, -u * .7, u * .08 - w); ctx.stroke(); ctx.strokeStyle = line;
    }
    // 躯干
    ctx.fillStyle = coat;
    if (o.cls === 'ghost') poly(ctx, [-u * .3, -u * .2, u * .3, -u * .2, u * .22, u * .2, u * .36, u * .5, -u * .36, u * .5, -u * .22, u * .2]);
    else poly(ctx, [-u * .34, -u * .2, u * .34, -u * .2, u * .38, u * .36, -u * .38, u * .36]);
    ctx.fill(); ctx.stroke();
    // 衣襟 / 胸灯
    ctx.strokeStyle = acc; ctx.beginPath();
    if (o.cls === 'engineer') { ctx.moveTo(-u * .2, u * .08); ctx.lineTo(u * .2, u * .08); ctx.moveTo(-u * .2, u * .2); ctx.lineTo(u * .2, u * .2); }
    else if (o.cls === 'ghost') { ctx.moveTo(0, -u * .14); ctx.lineTo(0, u * .42); }
    else { ctx.moveTo(-u * .16, -u * .2); ctx.lineTo(0, u * .08); ctx.lineTo(u * .16, -u * .2); }
    ctx.stroke(); ctx.strokeStyle = line;
    // 头
    ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(0, -u * .5, u * .27, 0, TAU); ctx.fill(); ctx.stroke();
    if (o.cls === 'engineer') {
      ctx.fillStyle = '#4a3d18'; ctx.beginPath(); ctx.arc(0, -u * .52, u * .29, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = acc; ctx.fillRect(-u * .02, -u * .52, u * .13, u * .1); ctx.fillRect(u * .14, -u * .52, u * .1, u * .1);
    } else if (o.cls === 'ghost') {
      poly(ctx, [-u * .32, -u * .42, 0, -u * .92, u * .32, -u * .42, u * .26, -u * .28, -u * .26, -u * .28]); ctx.fillStyle = '#1c1530'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = acc; ctx.fillRect(-u * .02, -u * .47, u * .1, u * .05); ctx.fillRect(u * .13, -u * .47, u * .1, u * .05);
    } else {
      ctx.beginPath(); ctx.moveTo(-u * .27, -u * .56); ctx.quadraticCurveTo(-u * .1, -u * .92, u * .22, -u * .68); ctx.stroke();
      ctx.fillStyle = acc; ctx.fillRect(-u * .06, -u * .55, u * .34, u * .09);
    }
    // 武器：装了近战义体就画对应的家伙，否则画职业默认武器
    if (o.weapon) {
      var wc = o.weaponColor || acc, sw = (o.lunge || 0);
      ctx.beginPath(); ctx.moveTo(u * .32, -u * .02); ctx.lineTo(u * .5, u * .1); ctx.stroke();
      if (o.weapon === 'fist') {
        ctx.fillStyle = '#16242f'; ctx.beginPath(); ctx.arc(u * .58, u * .12, u * .15, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(-u * .46, u * .12, u * .13, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = wc; ctx.beginPath(); ctx.arc(u * .58, u * .12, u * .22, -1, 1); ctx.stroke();
      } else if (o.weapon === 'wire') {
        ctx.strokeStyle = wc; ctx.beginPath(); ctx.moveTo(u * .5, u * .1); ctx.bezierCurveTo(u * .9, -u * .3, u * .5, -u * .7 - sw * u * .2, u * 1.0, -u * .6); ctx.stroke();
      } else if (o.weapon === 'saw') {
        ctx.fillStyle = '#22384d'; ctx.fillRect(u * .46, -u * .02, u * .5, u * .2); ctx.strokeRect(u * .46, -u * .02, u * .5, u * .2);
        ctx.strokeStyle = wc; ctx.setLineDash([u * .08, u * .06]); ctx.lineDashOffset = -now / 30; ctx.strokeRect(u * .42, -u * .06, u * .58, u * .28); ctx.setLineDash([]);
      } else {
        // 刀：斜持，出手时前压
        ctx.save(); ctx.translate(u * .5, u * .1); ctx.rotate(-.95 + sw * 1.1);
        ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(-u * .1, 0); ctx.lineTo(u * .1, 0); ctx.stroke();
        ctx.strokeStyle = '#f4feff'; ctx.lineWidth = lw * 1.2; ctx.beginPath(); ctx.moveTo(u * .1, 0); ctx.lineTo(u * .95, 0); ctx.stroke();
        ctx.strokeStyle = wc; ctx.lineWidth = lw * .8; ctx.globalAlpha = .8; ctx.beginPath(); ctx.moveTo(u * .16, u * .07); ctx.lineTo(u * .88, u * .07); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.restore();
      }
      ctx.strokeStyle = line; ctx.lineWidth = lw;
    } else if (o.cls === 'engineer') {
      ctx.beginPath(); ctx.moveTo(u * .34, -u * .02); ctx.lineTo(u * .62, u * .16); ctx.stroke();
      ctx.strokeStyle = acc; ctx.beginPath(); ctx.arc(u * .68, u * .2, u * .1, .6, TAU - .9); ctx.stroke();
    } else if (o.cls === 'ghost') {
      ctx.beginPath(); ctx.moveTo(u * .3, u * .02); ctx.lineTo(u * .46, u * .1); ctx.stroke();
      ctx.strokeStyle = '#f4f0ff'; ctx.beginPath(); ctx.moveTo(u * .44, u * .14); ctx.lineTo(u * .9, -u * .3 - L * .3); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(u * .34, -u * .04); ctx.lineTo(u * .5, u * .06); ctx.stroke();
      ctx.fillStyle = '#22384d'; ctx.fillRect(u * .42, -u * .03, u * .44, u * .13); ctx.strokeRect(u * .42, -u * .03, u * .44, u * .13);
      ctx.fillStyle = acc; ctx.fillRect(u * .82, -u * .01, u * .08, u * .08);
    }
    if (cast && cast.kind === 'shoot' && ck < .55) {
      var mf = 1 - ck / .55, mx = o.cls === 'assault' ? u * .92 : u * .7; ctx.fillStyle = '#fff6c8'; ctx.globalAlpha = mf;
      ctx.beginPath(); ctx.moveTo(mx, u * .03); ctx.lineTo(mx + u * .5 * mf, -u * .14); ctx.lineTo(mx + u * .3 * mf, u * .03); ctx.lineTo(mx + u * .5 * mf, u * .2); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    } else if (cast && cast.kind === 'cast') {
      ctx.strokeStyle = cast.color || acc; ctx.lineWidth = lw * 1.3; ctx.globalAlpha = .4 + cs * .6;
      ctx.beginPath(); ctx.moveTo(-u * .3, -u * .12); ctx.lineTo(-u * .5, -u * (.3 + cs * .5)); ctx.stroke();
      ctx.beginPath(); ctx.arc(-u * .5, -u * (.36 + cs * .5), u * .09 * (1 + cs), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /* 机甲：宽肩方块机体 */
  function mech(ctx, x, y, tile, now, o) {
    var u = tile * .72, dir = Math.cos(o.face || 0) < -.01 ? -1 : 1, acc = '#ffd166', line = '#e9dcae', lw = Math.max(1.3, tile * .06);
    var stomp = o.moving ? Math.abs(Math.sin(now / 70)) * u * .05 : 0;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.ellipse(x, y + u * .72, u * .62, u * .18, 0, 0, TAU); ctx.fill();
    ctx.translate(x, y - stomp); ctx.scale(dir, 1); ctx.lineWidth = lw; ctx.strokeStyle = line; ctx.fillStyle = '#2b2512';
    ctx.fillRect(-u * .34, u * .28, u * .2, u * .42); ctx.strokeRect(-u * .34, u * .28, u * .2, u * .42);
    ctx.fillRect(u * .14, u * .28, u * .2, u * .42); ctx.strokeRect(u * .14, u * .28, u * .2, u * .42);
    poly(ctx, [-u * .5, -u * .34, u * .5, -u * .34, u * .42, u * .3, -u * .42, u * .3]); ctx.fill(); ctx.stroke();
    ctx.fillRect(-u * .74, -u * .4, u * .26, u * .34); ctx.strokeRect(-u * .74, -u * .4, u * .26, u * .34);
    ctx.fillRect(u * .48, -u * .4, u * .26, u * .34); ctx.strokeRect(u * .48, -u * .4, u * .26, u * .34);
    ctx.fillStyle = '#16242f'; ctx.fillRect(-u * .2, -u * .56, u * .4, u * .24); ctx.strokeRect(-u * .2, -u * .56, u * .4, u * .24);
    ctx.fillStyle = acc; ctx.fillRect(-u * .06, -u * .5, u * .22, u * .08);
    ctx.fillStyle = '#22384d'; ctx.fillRect(u * .56, -u * .12, u * .5, u * .14); ctx.strokeRect(u * .56, -u * .12, u * .5, u * .14);
    ctx.strokeStyle = acc; ctx.beginPath(); ctx.moveTo(-u * .3, u * .02); ctx.lineTo(u * .3, u * .02); ctx.stroke();
    ctx.restore();
  }

  /* 屏幕外敌人的边缘箭头 */
  function edge(ctx, x, y, w, h, color, big) {
    var m = 12, cx = w / 2, cy = h / 2, dx = x - cx, dy = y - cy;
    var k = Math.min((cx - m) / Math.max(1e-3, Math.abs(dx)), (cy - m) / Math.max(1e-3, Math.abs(dy)));
    var ex = cx + dx * k, ey = cy + dy * k, a = Math.atan2(dy, dx), r = big ? 8 : 5.5;
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = color; ctx.globalAlpha = .9;
    ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * .7, -r * .75); ctx.lineTo(-r * .3, 0); ctx.lineTo(-r * .7, r * .75); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  window.NeonActors = { frame: frame, at: at, player: player, mech: mech, edge: edge };
})();
