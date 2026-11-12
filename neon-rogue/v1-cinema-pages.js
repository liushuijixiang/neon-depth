/* 1.0 追加的过场画面。一句旁白一幅，不重复使用。 */
(function () {
  'use strict';
  var R = window.NeonCinema.register;
  var BG = function (c) { return '<rect width="360" height="640" fill="' + c + '"/>'; };
  var FADE = '<rect y="430" width="360" height="210" fill="url(#cnDown)"/>';
  function rep(n, f) { var o = ''; for (var i = 0; i < n; i++) o += f(i); return o; }

  /* —— 冷冻数据港 —— */
  R('lift_cold', function () { // 电梯门开，冷气漫进来
    return BG('#03070c') + '<rect x="40" y="90" width="280" height="400" fill="#07131c" stroke="#3d6a82" stroke-width="2"/>' +
      '<rect x="40" y="90" width="92" height="400" fill="#0b1c28" stroke="#3d6a82"/><rect x="228" y="90" width="92" height="400" fill="#0b1c28" stroke="#3d6a82"/>' +
      '<rect x="132" y="90" width="96" height="400" fill="#0d3345"/><rect x="132" y="90" width="96" height="400" fill="url(#cnDown)" opacity=".6"/>' +
      '<path d="M150 60h60l-30 22z" fill="#8fdcff"/><text x="180" y="50" text-anchor="middle" font-size="14" fill="#8fdcff" font-family="monospace">B6</text>' +
      '<g class="cn-fog" fill="#bfeaff" opacity=".16"><ellipse cx="180" cy="492" rx="150" ry="22"/><ellipse cx="120" cy="520" rx="130" ry="18"/><ellipse cx="250" cy="540" rx="140" ry="20"/></g>' + FADE;
  });
  R('pod_rows', function () { // 两排冻存舱向远处收拢
    var o = BG('#040a10') + '<path d="M0 640L150 300h60l150 340z" fill="#07141d"/>';
    o += rep(7, function (i) { var k = 1 - i * .125, w = 54 * k, h = 150 * k, y = 300 + (1 - k) * -60 + i * 4, xl = 150 - (7 - i) * 21 - w, xr = 210 + (7 - i) * 21;
      var y0 = 520 - (i) * 34 - h; var c = '<rect x="X" y="' + y0.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h.toFixed(0) + '" rx="4" fill="#082030" stroke="#8fdcff" stroke-opacity="' + (.25 + k * .5).toFixed(2) + '"/>';
      return c.replace('X', xl.toFixed(0)) + c.replace('X', xr.toFixed(0)); });
    return o + '<circle cx="180" cy="285" r="60" fill="url(#cnGlow)" opacity=".12"/>' + FADE;
  });
  R('frost_shape', function () { // 空舱内壁的人形霜
    return BG('#03080d') + '<rect x="70" y="60" width="220" height="440" rx="18" fill="#061722" stroke="#63a6c6" stroke-width="2"/>' +
      '<rect x="92" y="84" width="176" height="392" rx="10" fill="#020609" stroke="#8fdcff" stroke-opacity=".4"/>' +
      '<g fill="#dff6ff" opacity=".26"><ellipse cx="180" cy="160" rx="30" ry="36"/><path d="M130 220q50-26 100 0l10 150q-16 14-30 6l-10 80h-40l-10-80q-14 8-30-6z"/></g>' +
      '<g stroke="#ff4d5e" stroke-width="1.6" opacity=".7"><path d="M118 300l8 44M126 296l7 46M134 300l6 40M234 310l-6 40M242 306l-7 44"/></g>' +
      '<circle cx="104" cy="488" r="3" fill="#ff4d5e"/>' + FADE;
  });
  /* —— 黑墙 —— */
  R('wall_face', function () { // 一整面墙，红格子在换位置
    var o = BG('#050307');
    o += rep(70, function (i) { var c = i % 7, r = (i / 7) | 0, on = (i * 37 + r * 11) % 9 === 0; return '<rect x="' + (6 + c * 50) + '" y="' + (20 + r * 46) + '" width="46" height="42" fill="' + (on ? '#3a0d1c' : '#0b0710') + '" stroke="#ff365c" stroke-opacity="' + (on ? .8 : .18) + '"/>'; });
    return o + '<path d="M150 640v-70h60v70z" fill="#000"/><circle cx="180" cy="560" r="6" fill="#d6ecf2"/><path d="M172 570h16l4 40h-24z" fill="#d6ecf2"/>' + FADE;
  });
  R('breach', function () { // 井打穿墙的断口，一圈结晶
    var o = BG('#060408') + '<ellipse cx="180" cy="300" rx="120" ry="170" fill="#000" stroke="#5c2338" stroke-width="3"/>';
    o += rep(22, function (i) { var a = i / 22 * 6.283, x = 180 + Math.cos(a) * 120, y = 300 + Math.sin(a) * 170, l = 18 + (i * 7) % 22, x2 = 180 + Math.cos(a) * (120 - l), y2 = 300 + Math.sin(a) * (170 - l), nx = -Math.sin(a) * 7, ny = Math.cos(a) * 7;
      return '<path d="M' + (x + nx).toFixed(0) + ' ' + (y + ny).toFixed(0) + 'L' + x2.toFixed(0) + ' ' + y2.toFixed(0) + 'L' + (x - nx).toFixed(0) + ' ' + (y - ny).toFixed(0) + 'z" fill="#f4f0ff" opacity="' + (.45 + (i % 3) * .15) + '"/>'; });
    return o + '<path d="M180 130v340" stroke="#22e6ff" stroke-opacity=".25" stroke-dasharray="4 8"/><circle cx="180" cy="300" r="90" fill="url(#cnGlow)" opacity=".06"/>' + FADE;
  });
  R('wall_gap', function () { // 格子让开一条缝
    var o = BG('#050307');
    o += rep(60, function (i) { var c = i % 6, r = (i / 6) | 0, sh = c < 3 ? -(14 + r % 3 * 4) : (14 + r % 3 * 4); return '<rect x="' + (10 + c * 57 + sh) + '" y="' + (16 + r * 48) + '" width="52" height="44" fill="#0c0811" stroke="#ff365c" stroke-opacity=".4"/>'; });
    return o + '<rect x="160" width="40" height="640" fill="#000"/><rect x="176" width="8" height="640" fill="#f4f0ff" opacity=".85"/><rect x="150" width="60" height="640" fill="url(#cnGlow)" opacity=".18"/>' + FADE;
  });
  /* —— 还在往下长的那几层 —— */
  R('wet_steps', function () { // 没干的水泥台阶和脚印
    var o = BG('#07080a');
    o += rep(6, function (i) { var y = 150 + i * 70, x = 30 + i * 14; return '<path d="M' + x + ' ' + y + 'h' + (300 - i * 28) + 'v40h-' + (300 - i * 28) + 'z" fill="#15171b" stroke="#3a3f47"/><path d="M' + x + ' ' + (y + 40) + 'h' + (300 - i * 28) + 'v30h-' + (300 - i * 28) + 'z" fill="#0c0d10"/>'; });
    o += rep(5, function (i) { var x = 150 + (i % 2 ? 26 : 0) + i * 6, y = 160 + i * 70; return '<ellipse cx="' + x + '" cy="' + (y + 16) + '" rx="9" ry="14" fill="#04050699" stroke="#6a727c" stroke-opacity=".5"/>'; });
    return o + FADE;
  });
  R('dig_sign', function () { // 施工牌
    return BG('#08090b') + '<rect x="50" y="170" width="260" height="170" fill="#1d1b10" stroke="#fcee0a" stroke-width="2"/>' +
      rep(9, function (i) { return '<path d="M' + (50 + i * 30) + ' 170l20 0-16 22h-20z" fill="#fcee0a" opacity=".8"/>'; }) +
      '<text x="180" y="250" text-anchor="middle" font-size="22" fill="#fcee0a" font-family="sans-serif" font-weight="700">本段掘进 0.3 米</text>' +
      '<rect x="92" y="282" width="176" height="20" fill="#3a0d14"/><text x="180" y="297" text-anchor="middle" font-size="12" fill="#ff4d5e" font-family="monospace">■■■■ - ■■ - ■■</text>' +
      '<circle cx="62" cy="182" r="3" fill="#888"/><circle cx="298" cy="182" r="3" fill="#888"/><circle cx="62" cy="328" r="3" fill="#888"/><circle cx="298" cy="328" r="3" fill="#888"/>' + FADE;
  });
  R('unbuilt', function () { // 没完工的下一层，灯先亮了
    var o = BG('#050608') + '<path d="M0 360h360v280H0z" fill="#0a0b0e"/>';
    o += rep(7, function (i) { return '<path d="M' + (20 + i * 54) + ' 360v-' + (120 + (i * 53) % 90) + '" stroke="#5a4a2a" stroke-width="5"/><path d="M' + (20 + i * 54) + ' ' + (300 - (i * 31) % 60) + 'h54" stroke="#3d3320" stroke-width="3"/>'; });
    return o + '<path d="M176 0v150" stroke="#888"/><path d="M160 150h32l10 24h-52z" fill="#2a2a2a"/><ellipse cx="176" cy="178" rx="20" ry="6" fill="#fff6c8"/><path d="M152 178L60 640h232L200 178z" fill="#fff6c8" opacity=".08"/>' + FADE;
  });
  /* —— 三个人格的醒来 —— */
  R('gun_notch', function () { // 握把上的刻痕
    return BG('#06080c') + '<g transform="rotate(-18 180 300)"><rect x="60" y="230" width="230" height="46" rx="4" fill="#1a2634" stroke="#9fb6c2" stroke-width="2"/><rect x="286" y="244" width="40" height="16" fill="#0f1822" stroke="#9fb6c2"/>' +
      '<path d="M96 276h64l20 130q-40 14-76 0z" fill="#141d28" stroke="#9fb6c2" stroke-width="2"/>' +
      rep(11, function (i) { return '<path d="M' + (108 + (i % 6) * 9) + ' ' + (296 + ((i / 6) | 0) * 34) + 'v22" stroke="' + (i > 7 ? '#ff2fa8' : '#d6ecf2') + '" stroke-width="2.4"/>'; }) +
      '<rect x="150" y="238" width="60" height="8" fill="#22e6ff" opacity=".7"/></g>' + FADE;
  });
  R('dock_wind', function () { // 码头，风
    var o = BG('#070812') + '<rect y="380" width="360" height="260" fill="#04060c"/><path d="M0 380h360" stroke="#22384d" stroke-width="2"/>';
    o += rep(4, function (i) { return '<rect x="' + (30 + i * 84) + '" y="' + (300 - (i % 2) * 28) + '" width="64" height="' + (80 + (i % 2) * 28) + '" fill="#0d1420" stroke="#2a4660"/><path d="M' + (30 + i * 84) + ' ' + (330 - (i % 2) * 28) + 'h64" stroke="#2a4660"/>'; });
    o += '<path d="M300 380V150h8v230M304 150h-90" stroke="#3a5068" stroke-width="5" fill="none"/><path d="M220 150v60" stroke="#3a5068" stroke-width="2"/>';
    o += rep(9, function (i) { return '<path d="M' + (-20 + (i * 67) % 300) + ' ' + (120 + i * 52) + 'q40-10 90 0" stroke="#9fe9ff" stroke-opacity=".22" fill="none"/>'; });
    return o + '<circle cx="70" cy="420" r="3" fill="#ff2fa8"/><circle cx="150" cy="440" r="3" fill="#ff2fa8"/><circle cx="240" cy="425" r="3" fill="#ff2fa8"/>' + FADE;
  });
  R('blueprint', function () { // 图纸
    var o = BG('#050b12') + '<rect x="40" y="80" width="280" height="420" fill="#0a2238" stroke="#4a7fa6"/>';
    o += rep(13, function (i) { return '<path d="M40 ' + (110 + i * 30) + 'h280" stroke="#4a7fa6" stroke-opacity=".18"/>'; }) + rep(9, function (i) { return '<path d="M' + (70 + i * 30) + ' 80v420" stroke="#4a7fa6" stroke-opacity=".18"/>'; });
    o += '<rect x="150" y="110" width="60" height="360" fill="none" stroke="#bfe6ff" stroke-width="1.5"/>' + rep(15, function (i) { return '<path d="M150 ' + (110 + i * 24) + 'h60" stroke="' + (i >= 10 ? '#ffd166' : '#bfe6ff') + '" stroke-opacity="' + (i >= 10 ? 1 : .7) + '" stroke-dasharray="' + (i >= 10 ? '3 3' : '0') + '"/>'; });
    return o + '<text x="222" y="350" font-size="10" fill="#bfe6ff" font-family="monospace">B10 封底</text><text x="222" y="466" font-size="10" fill="#ffd166" font-family="monospace">B16 ?</text><path d="M40 500q140 26 280 0v16q-140 26-280 0z" fill="#0d2c47" stroke="#4a7fa6"/>' + FADE;
  });
  R('plumb', function () { // 铅垂线，碰不到底
    var o = BG('#040507') + '<path d="M110 0L150 640M250 0L210 640" stroke="#1b2a3c" stroke-width="3"/>';
    o += rep(9, function (i) { var y = 40 + i * 66, w = 128 - i * 8; return '<path d="M' + (180 - w / 2) + ' ' + y + 'h' + w + '" stroke="#22384d" stroke-opacity="' + (.9 - i * .09) + '"/>'; });
    return o + '<path d="M180 0v380" stroke="#ffd166" stroke-width="1.5"/><path d="M170 380h20l-10 40z" fill="#ffd166"/><circle cx="180" cy="520" r="80" fill="#000"/>' + FADE;
  });
  R('mirror_lag', function () { // 镜子里慢半拍的脸
    return BG('#06050b') + '<rect x="70" y="70" width="220" height="400" rx="110" fill="#0d0b18" stroke="#b690ff" stroke-width="2"/>' +
      '<g opacity=".35" transform="translate(14 6)"><ellipse cx="180" cy="230" rx="62" ry="78" fill="none" stroke="#22e6ff" stroke-width="2"/><path d="M150 220h22M190 220h22" stroke="#22e6ff" stroke-width="3"/></g>' +
      '<ellipse cx="180" cy="230" rx="62" ry="78" fill="#120f1f" stroke="#e6dcff" stroke-width="2"/><path d="M150 220h22M190 220h22" stroke="#b690ff" stroke-width="3"/><path d="M164 268h32" stroke="#e6dcff" stroke-width="1.5"/>' +
      '<path d="M118 150q62-80 124 0" fill="none" stroke="#e6dcff" stroke-width="2"/>' + FADE;
  });
  R('three_names', function () { // 三个名字，都被划掉
    var o = BG('#05050a');
    o += rep(3, function (i) { var y = 190 + i * 90; return '<rect x="60" y="' + y + '" width="240" height="56" fill="#0e0c18" stroke="#3b3547"/>' + rep(7, function (j) { return '<rect x="' + (76 + j * 30) + '" y="' + (y + 16) + '" width="' + (14 + ((i * 5 + j * 3) % 12)) + '" height="24" fill="#b690ff" opacity="' + (.25 + ((i + j) % 3) * .2) + '"/>'; }) + '<path d="M56 ' + (y + 40 - i * 6) + 'L304 ' + (y + 14 + i * 6) + '" stroke="#ff365c" stroke-width="2.5"/>'; });
    return o + '<text x="180" y="150" text-anchor="middle" font-size="12" fill="#7f6fa8" font-family="monospace" letter-spacing="4">ID // 无法解析</text>' + FADE;
  });
  /* —— 给旧过场补的两幅 —— */
  R('nameplate', function () { // 残骸里的铭牌
    return BG('#07090c') + '<path d="M0 470q90-50 180-20t180-10v200H0z" fill="#12171d"/><g transform="rotate(-9 180 300)"><rect x="70" y="240" width="220" height="110" rx="6" fill="#1b232c" stroke="#9fb6c2" stroke-width="2"/>' +
      '<circle cx="86" cy="256" r="4" fill="#07090c"/><circle cx="274" cy="334" r="4" fill="#07090c"/>' +
      '<text x="180" y="290" text-anchor="middle" font-size="20" fill="#ff4d5e" font-family="monospace" font-weight="700">0-■■■-417</text><path d="M96 312h168M96 326h110" stroke="#5f7482" stroke-width="2"/></g>' +
      '<path d="M250 180l30 40M290 170l-10 60" stroke="#ff9f43" stroke-opacity=".5"/>' + FADE;
  });
  R('record_flood', function () { // 一千多段同一条走廊
    var o = BG('#050308');
    o += rep(30, function (i) { var c = i % 5, r = (i / 5) | 0, x = 14 + c * 68, y = 40 + r * 84; return '<rect x="' + x + '" y="' + y + '" width="60" height="74" fill="#0d0a12" stroke="#ff5c8a" stroke-opacity=".5"/><path d="M' + x + ' ' + (y + 74) + 'l22-40h16l22 40M' + (x + 22) + ' ' + (y + 34) + 'v-20h16v20" stroke="#ff5c8a" stroke-opacity=".35" fill="none"/><circle cx="' + (x + 30) + '" cy="' + (y + 56 - (i * 7) % 14) + '" r="3" fill="#f4f0ff" opacity=".8"/>'; });
    return o + '<circle cx="180" cy="300" r="120" fill="url(#cnGlow)" opacity=".07"/>' + FADE;
  });
})();
