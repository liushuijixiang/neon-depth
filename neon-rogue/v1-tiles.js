/* 1.0 分区地块绘制。只读取地图与可见性，不写入任何玩法状态。 */
(function () {
  'use strict';

  var THEMES = {
    // B1–B5 霓虹下城：湿沥青、招牌灯管、排水格栅
    street: {
      floor: ['#132436', '#11202f', '#15283b'], floorDim: '#0a121c', seam: 'rgba(90,160,190,.20)',
      wall: '#1d2d4a', wallTop: '#070c15', wallDim: '#0a101b', cap: '#4a7fa6', capDim: '#1b2a3c',
      neon: ['#ff2fa8', '#22e6ff', '#fcee0a'], accent: '#22e6ff'
    },
    // B6–B10 冷冻数据港：机柜、霜、蓝白指示灯
    cold: {
      floor: ['#10293a', '#0e2534', '#122d40'], floorDim: '#08141d', seam: 'rgba(150,215,245,.20)',
      wall: '#1a3446', wallTop: '#061019', wallDim: '#09131c', cap: '#63a6c6', capDim: '#1a3243',
      neon: ['#8fdcff', '#57ffa8', '#e8fbff'], accent: '#8fdcff'
    },
    // B11–B15 黑墙裂隙：黑曜石、红色 ICE、白色结晶
    rift: {
      floor: ['#1b1224', '#181020', '#1f1429'], floorDim: '#0c0811', seam: 'rgba(255,80,110,.18)',
      wall: '#2c1529', wallTop: '#0a060c', wallDim: '#0e0810', cap: '#8f3354', capDim: '#2a121f',
      neon: ['#ff365c', '#b06bff', '#f4f0ff'], accent: '#ff365c'
    },
    // B16 生产层：警示黄、传送带
    plant: {
      floor: ['#222114', '#1e1d12', '#262417'], floorDim: '#0e0e0b', seam: 'rgba(252,238,10,.16)',
      wall: '#322e18', wallTop: '#0b0a06', wallDim: '#100f0a', cap: '#9c8c28', capDim: '#2c2811',
      neon: ['#fcee0a', '#ffb347', '#ff4d5e'], accent: '#fcee0a'
    }
  };

  function themeFor(depth) {
    if (depth >= 16) return THEMES.plant;
    if (depth >= 11) return THEMES.rift;
    if (depth >= 6) return THEMES.cold;
    return THEMES.street;
  }
  function themeName(depth) { return depth >= 16 ? 'plant' : depth >= 11 ? 'rift' : depth >= 6 ? 'cold' : 'street'; }

  function h2(x, y) { var n = (x * 374761393 + y * 668265263) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return (n ^ (n >>> 16)) >>> 0; }

  function isWall(map, x, y) { return !map[y] || map[y][x] !== 0; }

  function drawFloor(ctx, T, name, x, y, px, py, s, vis, now) {
    var k = h2(x, y);
    if (!vis) { ctx.fillStyle = T.floorDim; ctx.fillRect(px, py, s, s); return; }
    ctx.fillStyle = T.floor[k % 3]; ctx.fillRect(px, py, s, s);
    // 地砖缝
    ctx.fillStyle = T.seam;
    if (name === 'cold') { ctx.fillRect(px, py, s, 1); ctx.fillRect(px, py, 1, s); }
    else if (name === 'plant') { if ((x + y) % 2 === 0) ctx.fillRect(px, py + s - 1, s, 1); }
    else if (name === 'rift') { if (k % 5 === 0) { ctx.fillRect(px + (k % 7) * s / 8, py, 1, s); } }
    else { if (y % 2 === 0) ctx.fillRect(px, py + s - 1, s, 1); if ((x + (y >> 1)) % 3 === 0) ctx.fillRect(px + s - 1, py, 1, s); }
    var d = k % 41;
    if (name === 'street') {
      if (d === 0) { // 水洼反光
        var a = .10 + .05 * Math.sin(now * .0016 + k);
        ctx.fillStyle = 'rgba(255,47,168,' + a.toFixed(3) + ')'; ctx.fillRect(px + s * .18, py + s * .55, s * .62, s * .16);
        ctx.fillStyle = 'rgba(34,230,255,' + (a * .8).toFixed(3) + ')'; ctx.fillRect(px + s * .3, py + s * .68, s * .4, s * .08);
      } else if (d === 1) { // 排水格栅
        ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(px + s * .2, py + s * .25, s * .6, s * .5);
        ctx.fillStyle = 'rgba(70,110,130,.5)'; for (var g = 0; g < 4; g++) ctx.fillRect(px + s * .2, py + s * (.3 + g * .12), s * .6, 1);
      } else if (d === 2) { ctx.fillStyle = 'rgba(252,238,10,.16)'; ctx.fillRect(px + s * .1, py + s * .46, s * .8, 2); } // 路面黄线
      else if (d === 3) { ctx.fillStyle = 'rgba(120,150,170,.25)'; ctx.fillRect(px + s * .6, py + s * .3, 2, 2); ctx.fillRect(px + s * .3, py + s * .62, 3, 1); } // 碎屑
    } else if (name === 'cold') {
      if (d < 3) { // 霜纹
        ctx.strokeStyle = 'rgba(200,240,255,.20)'; ctx.lineWidth = 1; ctx.beginPath();
        var cx = px + s * (.3 + (k % 5) * .1), cy = py + s * (.3 + (k % 3) * .15);
        for (var i = 0; i < 3; i++) { var an = i * 2.09 + (k % 6); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(an) * s * .28, cy + Math.sin(an) * s * .28); }
        ctx.stroke();
      } else if (d === 3) { ctx.fillStyle = 'rgba(143,220,255,.22)'; ctx.fillRect(px + s * .42, py + s * .42, s * .16, s * .16); } // 地面读数灯
      else if (d === 4) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(px + s * .15, py + s * .4, s * .7, s * .2); ctx.fillStyle = 'rgba(143,220,255,.3)'; ctx.fillRect(px + s * .15, py + s * .4, s * .7, 1); } // 线缆槽
    } else if (name === 'rift') {
      if (d < 3) { // 白色结晶
        ctx.fillStyle = 'rgba(244,240,255,' + (.35 + .2 * Math.sin(now * .002 + k)).toFixed(3) + ')';
        var bx = px + s * (.25 + (k % 4) * .12), by = py + s * (.3 + (k % 3) * .15);
        ctx.beginPath(); ctx.moveTo(bx, by - s * .14); ctx.lineTo(bx + s * .07, by); ctx.lineTo(bx, by + s * .1); ctx.lineTo(bx - s * .07, by); ctx.closePath(); ctx.fill();
      } else if (d === 3 || d === 4) { // 裂缝
        ctx.strokeStyle = 'rgba(255,54,92,' + (.25 + .15 * Math.sin(now * .003 + k)).toFixed(3) + ')'; ctx.lineWidth = 1; ctx.beginPath();
        ctx.moveTo(px + s * .1, py + s * .2); ctx.lineTo(px + s * .45, py + s * .5); ctx.lineTo(px + s * .35, py + s * .7); ctx.lineTo(px + s * .85, py + s * .9); ctx.stroke();
      } else if (d === 5 && Math.floor(now / 180 + k) % 9 === 0) { // 坏块
        ctx.fillStyle = 'rgba(176,107,255,.3)'; ctx.fillRect(px + s * .1, py + s * (.2 + (k % 5) * .1), s * .8, 2);
      }
    } else {
      if (d < 2) { // 警示斜纹
        ctx.save(); ctx.beginPath(); ctx.rect(px + 1, py + s * .72, s - 2, s * .2); ctx.clip();
        ctx.strokeStyle = 'rgba(252,238,10,.28)'; ctx.lineWidth = Math.max(1, s * .08);
        for (var q = -1; q < 5; q++) { ctx.beginPath(); ctx.moveTo(px + q * s * .25, py + s * .95); ctx.lineTo(px + q * s * .25 + s * .25, py + s * .7); ctx.stroke(); }
        ctx.restore();
      } else if (d === 2) { ctx.fillStyle = 'rgba(255,179,71,.2)'; ctx.fillRect(px + s * .25, py + s * .25, s * .5, s * .5); ctx.fillStyle = T.floor[0]; ctx.fillRect(px + s * .32, py + s * .32, s * .36, s * .36); }
    }
  }

  function edgeLines(ctx, T, map, x, y, px, py, s, top) {
    var w = Math.max(2, Math.round(s * .07));
    ctx.fillStyle = T.cap;
    if (!isWall(map, x - 1, y)) ctx.fillRect(px, py, w, s);
    if (!isWall(map, x + 1, y)) ctx.fillRect(px + s - w, py, w, s);
    if (top && !isWall(map, x, y - 1)) ctx.fillRect(px, py, s, w);
  }
  function drawWall(ctx, T, name, map, x, y, px, py, s, vis, now, tint) {
    var face = !isWall(map, x, y + 1); // 下方是地面：画立面
    if (!vis) {
      ctx.fillStyle = T.wallDim; ctx.fillRect(px, py, s, s);
      ctx.fillStyle = T.capDim;
      if (face) ctx.fillRect(px, py + s - 2, s, 2);
      if (!isWall(map, x - 1, y)) ctx.fillRect(px, py, 2, s);
      if (!isWall(map, x + 1, y)) ctx.fillRect(px + s - 2, py, 2, s);
      if (!isWall(map, x, y - 1)) ctx.fillRect(px, py, s, 2);
      return;
    }
    var k = h2(x, y);
    ctx.fillStyle = face ? (tint || T.wall) : T.wallTop; ctx.fillRect(px, py, s, s);
    if (!face) {
      // 顶面：压暗并打斜纹，与地面相邻的边用亮线描出可走区域的轮廓
      ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1; ctx.beginPath();
      for (var hx = -s; hx < s; hx += Math.max(5, s / 4)) { ctx.moveTo(px + Math.max(0, hx), py + Math.max(0, -hx)); ctx.lineTo(px + Math.min(s, hx + s), py + Math.min(s, s - hx)); }
      ctx.stroke();
      edgeLines(ctx, T, map, x, y, px, py, s, true);
      return;
    }
    var fg = ctx.createLinearGradient(0, py, 0, py + s); fg.addColorStop(0, 'rgba(255,255,255,.07)'); fg.addColorStop(1, 'rgba(0,0,0,.38)'); ctx.fillStyle = fg; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = T.cap; ctx.fillRect(px, py, s, 2);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(px, py + s - 3, s, 3);
    ctx.globalAlpha = .75; ctx.fillStyle = T.cap; ctx.fillRect(px, py + s - 1, s, 1); ctx.globalAlpha = 1;
    edgeLines(ctx, T, map, x, y, px, py, s, false);
    var d = k % 9, c = T.neon[k % T.neon.length];
    if (name === 'street') {
      if (d === 0 || d === 1) { // 竖排灯管招牌
        var on = Math.floor(now / 90 + k) % 37 !== 0;
        ctx.fillStyle = 'rgba(4,6,11,.8)'; ctx.fillRect(px + s * .3, py + s * .14, s * .4, s * .64);
        ctx.globalAlpha = on ? 1 : .25; ctx.fillStyle = c;
        ctx.fillRect(px + s * .36, py + s * .2, s * .28, 2); ctx.fillRect(px + s * .36, py + s * .4, s * .28, 2); ctx.fillRect(px + s * .36, py + s * .6, s * .28, 2);
        ctx.fillRect(px + s * .48, py + s * .2, 2, s * .42);
        ctx.globalAlpha = on ? .16 : .04; ctx.fillRect(px + s * .1, py + s * .1, s * .8, s * .8); ctx.globalAlpha = 1;
      } else if (d === 2) { // 横灯管
        ctx.fillStyle = c; ctx.fillRect(px + s * .12, py + s * .42, s * .76, 2);
        ctx.globalAlpha = .14; ctx.fillRect(px + s * .12, py + s * .3, s * .76, s * .3); ctx.globalAlpha = 1;
      } else if (d === 3) { // 卷帘门
        ctx.fillStyle = 'rgba(70,100,125,.4)'; for (var r = 0; r < 5; r++) ctx.fillRect(px + s * .12, py + s * (.2 + r * .13), s * .76, 1);
      } else if (d === 4) { // 管道
        ctx.fillStyle = '#22384d'; ctx.fillRect(px + s * .66, py + 2, s * .12, s - 5); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(px + s * .66, py + 2, 1, s - 5);
      } else { ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(px + 2, py + s * .5, s - 4, 1); }
    } else if (name === 'cold') {
      if (d < 5) { // 机柜 + 指示灯
        ctx.fillStyle = '#0a141d'; ctx.fillRect(px + s * .12, py + s * .14, s * .76, s * .68);
        for (var row = 0; row < 4; row++) {
          ctx.fillStyle = 'rgba(100,150,180,.28)'; ctx.fillRect(px + s * .18, py + s * (.2 + row * .15), s * .5, 1);
          var lit = (Math.floor(now / (240 + (k % 5) * 60)) + row * 3 + k) % 4;
          ctx.fillStyle = lit === 0 ? '#57ffa8' : lit === 1 ? '#8fdcff' : 'rgba(80,110,130,.5)';
          ctx.fillRect(px + s * .74, py + s * (.19 + row * .15), 2, 2);
        }
      } else if (d === 5) { // 冻存舱窗
        ctx.fillStyle = 'rgba(143,220,255,.22)'; ctx.fillRect(px + s * .28, py + s * .18, s * .44, s * .58);
        ctx.fillStyle = 'rgba(232,251,255,.5)'; ctx.fillRect(px + s * .28, py + s * .18, s * .44, 1);
      } else { ctx.fillStyle = 'rgba(200,240,255,.10)'; ctx.fillRect(px + 1, py + s - 6, s - 2, 3); } // 霜线
    } else if (name === 'rift') {
      if (d < 3) { // ICE 六边形
        ctx.strokeStyle = 'rgba(255,54,92,' + (.35 + .25 * Math.sin(now * .0024 + k)).toFixed(3) + ')'; ctx.lineWidth = 1; ctx.beginPath();
        for (var a2 = 0; a2 < 6; a2++) { var ang = a2 * Math.PI / 3 + Math.PI / 6, hx = px + s * .5 + Math.cos(ang) * s * .26, hy = py + s * .48 + Math.sin(ang) * s * .26; if (a2) ctx.lineTo(hx, hy); else ctx.moveTo(hx, hy); }
        ctx.closePath(); ctx.stroke();
      } else if (d === 3) { // 数据流
        var off = (now * .03 + k) % s;
        ctx.fillStyle = 'rgba(176,107,255,.5)'; ctx.fillRect(px + s * .3, py + off * .8, 1, s * .18); ctx.fillRect(px + s * .64, py + ((off + s * .5) % s) * .8, 1, s * .14);
      } else if (d === 4) { // 结晶簇
        ctx.fillStyle = 'rgba(244,240,255,.55)'; ctx.beginPath(); ctx.moveTo(px + s * .3, py + s - 3); ctx.lineTo(px + s * .4, py + s * .45); ctx.lineTo(px + s * .5, py + s - 3); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(px + s * .5, py + s - 3); ctx.lineTo(px + s * .62, py + s * .6); ctx.lineTo(px + s * .7, py + s - 3); ctx.closePath(); ctx.fill();
      }
    } else {
      if (d < 3) { // 警示条
        ctx.save(); ctx.beginPath(); ctx.rect(px + 1, py + s * .34, s - 2, s * .26); ctx.clip();
        ctx.fillStyle = '#17150a'; ctx.fillRect(px, py + s * .34, s, s * .26);
        ctx.strokeStyle = 'rgba(252,238,10,.55)'; ctx.lineWidth = Math.max(1.5, s * .1);
        for (var z = -1; z < 5; z++) { ctx.beginPath(); ctx.moveTo(px + z * s * .28, py + s * .62); ctx.lineTo(px + z * s * .28 + s * .28, py + s * .32); ctx.stroke(); }
        ctx.restore();
      } else if (d === 3) { // 旋转警灯
        var bl = (Math.sin(now * .006 + k) + 1) / 2;
        ctx.fillStyle = 'rgba(255,77,94,' + (.3 + bl * .6).toFixed(3) + ')'; ctx.fillRect(px + s * .42, py + s * .2, s * .16, s * .12);
        ctx.globalAlpha = bl * .12; ctx.fillStyle = '#ff4d5e'; ctx.fillRect(px, py, s, s); ctx.globalAlpha = 1;
      } else if (d === 4) { ctx.fillStyle = '#2b2812'; ctx.fillRect(px + s * .2, py + s * .2, s * .6, s * .55); ctx.fillStyle = 'rgba(252,238,10,.3)'; ctx.fillRect(px + s * .2, py + s * .2, s * .6, 1); }
    }
    if (tint) { ctx.fillStyle = tint; ctx.globalAlpha = .28; ctx.fillRect(px, py + s * .86, s, 2); ctx.globalAlpha = 1; }
  }

  /* 出口：竖井电梯口 */
  function drawExit(ctx, x, y, s, open, vis, now, label) {
    var c = open ? '#57ffa8' : '#ff4d5e', r = s * .4;
    ctx.save(); ctx.globalAlpha = vis ? 1 : .4;
    ctx.fillStyle = '#04070b'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.strokeRect(x - r + .5, y - r + .5, r * 2 - 1, r * 2 - 1);
    // 向下滚动的箭头
    var t = open ? (now * .0016) % 1 : 0;
    for (var i = 0; i < 3; i++) {
      var yy = y - r * .55 + ((i / 3 + t) % 1) * r * 1.1, a = open ? 1 - Math.abs(((i / 3 + t) % 1) - .5) * 1.6 : .55;
      ctx.globalAlpha = (vis ? 1 : .4) * Math.max(.12, a);
      ctx.beginPath(); ctx.moveTo(x - r * .45, yy - r * .16); ctx.lineTo(x, yy + r * .16); ctx.lineTo(x + r * .45, yy - r * .16); ctx.stroke();
    }
    if (!open) { ctx.globalAlpha = vis ? .9 : .35; ctx.fillStyle = c; ctx.fillRect(x - r * .7, y - 1, r * 1.4, 2); }
    ctx.globalAlpha = vis ? 1 : .4;
    ctx.fillStyle = c; var k = r * .28;
    ctx.fillRect(x - r, y - r, k, 2); ctx.fillRect(x - r, y - r, 2, k); ctx.fillRect(x + r - k, y - r, k, 2); ctx.fillRect(x + r - 2, y - r, 2, k);
    ctx.fillRect(x - r, y + r - 2, k, 2); ctx.fillRect(x - r, y + r - k, 2, k); ctx.fillRect(x + r - k, y + r - 2, k, 2); ctx.fillRect(x + r - 2, y + r - k, 2, k);
    if (label) { ctx.font = '600 ' + Math.max(8, Math.round(s * .26)) + 'px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(label, x, y - r - 2); }
    ctx.restore();
  }

  /* 以玩家为中心的柔光与四周压暗 */
  function drawLight(ctx, x, y, s, w, h, color) {
    var g = ctx.createRadialGradient(x, y, s * .4, x, y, s * 5.2);
    g.addColorStop(0, color || 'rgba(90,200,240,.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - s * 5.2, y - s * 5.2, s * 10.4, s * 10.4);
  }

  window.NeonTiles = {
    theme: themeFor, themeName: themeName, floor: drawFloor, wall: drawWall, exit: drawExit, light: drawLight
  };
})();
