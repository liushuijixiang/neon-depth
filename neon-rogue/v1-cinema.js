/* 1.0 过场画面：矢量场景背景 + 开场片头。纯展示，不读写玩法状态。 */
(function () {
  'use strict';

  function rnd(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function skyline(seed, base, h, fill, lit) {
    var r = rnd(seed), x = -10, out = '';
    while (x < 370) {
      var w = 22 + r() * 44, hh = h * (.35 + r() * .65), y = base - hh;
      out += '<rect x="' + x.toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + (hh + 4).toFixed(0) + '" fill="' + fill + '"/>';
      if (r() < .4) out += '<rect x="' + (x + w * .4).toFixed(0) + '" y="' + (y - 14 - r() * 20).toFixed(0) + '" width="2" height="34" fill="' + fill + '"/>';
      if (lit) for (var wy = y + 6; wy < base - 6; wy += 9) for (var wx = x + 4; wx < x + w - 5; wx += 7) if (r() < .22) out += '<rect x="' + wx.toFixed(0) + '" y="' + wy.toFixed(0) + '" width="3" height="4" fill="' + (r() < .2 ? '#ff2fa8' : r() < .5 ? '#fcee0a' : '#22e6ff') + '" opacity="' + (.25 + r() * .5).toFixed(2) + '"/>';
      x += w + 2 + r() * 6;
    }
    return out;
  }
  function rain(n, seed) {
    var r = rnd(seed), out = '<g class="cn-rain" stroke="#9fe9ff" stroke-width=".7" opacity=".28">';
    for (var i = 0; i < n; i++) { var x = r() * 400 - 20, y = r() * 640; out += '<path d="M' + x.toFixed(0) + ' ' + y.toFixed(0) + 'l-5 22"/>'; }
    return out + '</g>';
  }
  var DEFS = '<defs><linearGradient id="cnSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05060d"/><stop offset=".55" stop-color="#170a26"/><stop offset="1" stop-color="#3a0d37"/></linearGradient>' +
    '<radialGradient id="cnGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="cnDown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".95"/></linearGradient></defs>';

  var SCENES = {
    // 椰汁城天际线：穹顶、招牌、雨
    city: function () {
      return '<rect width="360" height="640" fill="url(#cnSky)"/>' +
        '<ellipse cx="250" cy="330" rx="150" ry="110" fill="none" stroke="#b06bff" stroke-opacity=".35" stroke-width="1.2"/><ellipse cx="250" cy="330" rx="150" ry="110" fill="#b06bff" opacity=".05"/>' +
        '<path d="M100 330h300M130 280h240M160 245h180" stroke="#b06bff" stroke-opacity=".18"/>' +
        '<g opacity=".7">' + skyline(11, 420, 170, '#150f26', false) + '</g>' + skyline(23, 470, 190, '#0c0a18', true) +
        '<g class="cn-flick"><rect x="40" y="300" width="26" height="66" fill="#05060d" stroke="#ff2fa8"/><text x="53" y="324" font-size="16" fill="#ff2fa8" text-anchor="middle" font-weight="700">椰</text><text x="53" y="346" font-size="16" fill="#ff2fa8" text-anchor="middle" font-weight="700">汁</text></g>' +
        '<rect x="286" y="352" width="54" height="18" fill="#05060d" stroke="#22e6ff"/><text x="313" y="365" font-size="10" fill="#22e6ff" text-anchor="middle" letter-spacing="2">DOME</text>' +
        skyline(37, 560, 150, '#06060d', true) + '<rect y="470" width="360" height="170" fill="url(#cnDown)"/>' + rain(46, 5);
    },
    // 唤醒舱
    wake: function () {
      return '<rect width="360" height="640" fill="#04090d"/><ellipse cx="180" cy="300" rx="190" ry="240" fill="#22e6ff" opacity=".05"/>' +
        '<path d="M120 120h120l22 40v300l-22 40H120l-22-40V160z" fill="#07151c" stroke="#22e6ff" stroke-opacity=".6" stroke-width="1.5"/>' +
        '<path d="M132 140h96l16 30v270l-16 30h-96l-16-30V170z" fill="#0a2630" opacity=".7"/>' +
        '<g fill="#03080b" opacity=".92"><ellipse cx="180" cy="215" rx="22" ry="26"/><path d="M146 262q34-24 68 0l10 150h-88z"/></g>' +
        '<g class="cn-bubble" fill="#9fe9ff" opacity=".5"><circle cx="150" cy="420" r="2"/><circle cx="205" cy="380" r="1.5"/><circle cx="168" cy="330" r="2.5"/><circle cx="215" cy="300" r="1.5"/><circle cx="145" cy="250" r="1.8"/></g>' +
        '<path d="M98 200H40v260M262 240h60v260M98 420H60v200M262 180h40V20" fill="none" stroke="#1d4654" stroke-width="5"/>' +
        '<rect x="24" y="92" width="74" height="46" fill="#030709" stroke="#57ffa8" stroke-opacity=".6"/><text x="30" y="108" font-size="8" fill="#57ffa8">SYNC 93%</text><path class="cn-pulse" d="M30 124h14l4-9 6 16 5-7h34" fill="none" stroke="#57ffa8"/>' +
        '<rect class="cn-scan" x="116" y="150" width="128" height="2" fill="#22e6ff" opacity=".7"/><rect y="440" width="360" height="200" fill="url(#cnDown)"/>';
    },
    // 俯视深井
    shaft: function () {
      var out = '<rect width="360" height="640" fill="#020406"/>';
      for (var i = 0; i < 9; i++) {
        var k = Math.pow(.74, i), w = 300 * k, h = 420 * k, c = i < 3 ? '#ff2fa8' : i < 6 ? '#22e6ff' : '#ff365c';
        out += '<rect x="' + (180 - w / 2).toFixed(1) + '" y="' + (300 - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + (i === 8 ? '#000' : 'none') + '" stroke="' + c + '" stroke-opacity="' + (.75 - i * .07).toFixed(2) + '" stroke-width="' + (2.2 * k + .4).toFixed(2) + '"/>';
        if (i < 7) out += '<text x="' + (184 - w / 2).toFixed(1) + '" y="' + (312 - h / 2 + 2).toFixed(1) + '" font-size="' + (11 * k + 3).toFixed(1) + '" fill="' + c + '" opacity=".7">B' + (i * 2 + 1) + '</text>';
      }
      out += '<path d="M30 90L159 269M330 90L201 269M30 510L159 331M330 510L201 331" stroke="#1d3a48" stroke-width="1"/>' +
        '<g stroke="#5b7a88" stroke-width="2"><path d="M168 60L176 290M192 60L184 290"/>';
      for (var j = 0; j < 12; j++) { var t = j / 12, y = 70 + t * 215, hw = 12 - t * 8; out += '<path d="M' + (180 - hw).toFixed(1) + ' ' + y.toFixed(0) + 'h' + (hw * 2).toFixed(1) + '"/>'; }
      return out + '</g><circle class="cn-beat" cx="180" cy="300" r="10" fill="#ff365c" opacity=".5"/><rect y="460" width="360" height="180" fill="url(#cnDown)"/>';
    },
    // 倒下的守卫
    boss: function () {
      return '<rect width="360" height="640" fill="#0a0507"/><ellipse cx="180" cy="430" rx="230" ry="60" fill="#ff365c" opacity=".08"/>' +
        '<path d="M40 430l40-110 60-34 50 12 70-50 60 70-10 80 30 32z" fill="#150a10" stroke="#5c2338" stroke-width="1.5"/>' +
        '<path d="M140 286l-18-60 44 42M240 248l34-66-8 80M300 318l44-22-30 52" fill="#150a10" stroke="#5c2338"/>' +
        '<circle class="cn-dying" cx="205" cy="320" r="9" fill="#ff365c"/><circle cx="205" cy="320" r="26" fill="url(#cnGlow)" opacity=".18"/>' +
        '<path d="M60 432c40 14 90 6 130 12s90-4 120 4" fill="none" stroke="#3a1a22" stroke-width="6"/>' +
        '<g class="cn-smoke" fill="#8a7078" opacity=".14"><ellipse cx="120" cy="250" rx="34" ry="60"/><ellipse cx="262" cy="200" rx="26" ry="70"/></g>' +
        '<g stroke="#ffb347" stroke-width="1.4" opacity=".8"><path d="M168 300l-10-12M172 306l-16 2M250 290l12-10M252 296l15 5"/></g><rect y="440" width="360" height="200" fill="url(#cnDown)"/>';
    },
    // 冷冻数据港：冻存舱
    cold: function () {
      var out = '<rect width="360" height="640" fill="#04090f"/>';
      for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) {
        var x = 26 + c * 82, y = 90 + r * 128, open = (r * 4 + c) % 3 !== 1;
        out += '<rect x="' + x + '" y="' + y + '" width="62" height="108" rx="6" fill="#061520" stroke="#3d6a82"/>' +
          '<rect x="' + (x + 7) + '" y="' + (y + 9) + '" width="48" height="78" rx="3" fill="' + (open ? '#020508' : '#0d3040') + '" stroke="#8fdcff" stroke-opacity=".4"/>' +
          (open ? '<path d="M' + (x + 55) + ' ' + (y + 9) + 'l10 6v76l-10-4" fill="#0a2030" stroke="#8fdcff" stroke-opacity=".5"/>' : '<ellipse cx="' + (x + 31) + '" cy="' + (y + 40) + '" rx="9" ry="12" fill="#04121a"/>') +
          '<circle cx="' + (x + 12) + '" cy="' + (y + 97) + '" r="2" fill="' + (open ? '#ff4d5e' : '#57ffa8') + '"/>';
      }
      return out + '<g fill="#e8fbff" opacity=".22"><path d="M70 500l-4-18 5 2 1-9 5 8 4-6 1 22zM170 520l-4-18 5 2 1-9 5 8 4-6 1 22zM262 505l-4-18 5 2 1-9 5 8 4-6 1 22z"/></g>' +
        '<g class="cn-fog" fill="#8fdcff" opacity=".07"><ellipse cx="100" cy="480" rx="160" ry="30"/><ellipse cx="270" cy="510" rx="150" ry="26"/></g><rect y="440" width="360" height="200" fill="url(#cnDown)"/>';
    },
    // 井底的门
    door: function () {
      return '<rect width="360" height="640" fill="#060408"/><path d="M0 520L120 400h120l120 120" fill="#0c0810"/>' +
        '<g fill="#f4f0ff" opacity=".5"><path d="M40 420l12-70 12 70zM70 430l8-40 8 40zM300 420l10-80 12 80zM274 430l8-34 8 34zM18 380l6-30 6 30z"/></g>' +
        '<rect x="128" y="170" width="104" height="232" fill="#0e0c14" stroke="#b9b2c9" stroke-width="1.5"/><rect x="136" y="178" width="88" height="216" fill="none" stroke="#3b3547"/>' +
        '<g class="cn-hand"><path d="M180 316c-12 0-16-8-16-18v-18l5-2v12l2-24 5-1v22l2-28 5 0v28l3-24 5 1-1 26 6-8 4 3-9 18c-3 8-8 13-16 13z" fill="#ff365c" opacity=".8"/></g>' +
        '<circle cx="180" cy="290" r="70" fill="url(#cnGlow)" opacity=".10"/><rect y="440" width="360" height="200" fill="url(#cnDown)"/>';
    },
    // 白房间
    white: function () {
      return '<rect width="360" height="640" fill="#dfe6ea"/><path d="M0 0h360v330H0z" fill="#eef3f5"/><path d="M0 330h360v310H0z" fill="#c9d3d8"/>' +
        '<rect x="250" width="110" height="640" fill="#030305"/><path d="M250 0v640" stroke="#ff365c" stroke-width="1.5"/>' +
        '<rect x="56" y="318" width="170" height="16" fill="#9aa7b0"/><path d="M62 334v46M220 334v46" stroke="#7c8a93" stroke-width="5"/>' +
        '<path d="M70 318c0-16 20-22 34-22h100c12 0 18 10 18 22z" fill="#f7fafb" stroke="#aab6bd"/><ellipse cx="90" cy="300" rx="13" ry="11" fill="#6b757c"/>' +
        '<g fill="none" stroke="#ff365c" stroke-width="1.3" opacity=".85"><path d="M96 296C140 220 200 250 250 190M130 300C170 260 210 300 250 270M170 302C200 290 226 330 250 330M200 304C220 320 236 380 250 400"/></g>' +
        '<g class="cn-flick" fill="#ff365c"><circle cx="262" cy="190" r="2"/><circle cx="270" cy="270" r="2"/><circle cx="262" cy="330" r="2"/><circle cx="274" cy="400" r="2"/></g>' +
        '<rect y="470" width="360" height="170" fill="url(#cnDown)"/>';
    },
    // 赛博精神病
    psycho: function () {
      var r = rnd(9), out = '<rect width="360" height="640" fill="#120006"/>';
      for (var i = 0; i < 26; i++) out += '<rect class="cn-flick" x="' + (r() * 300).toFixed(0) + '" y="' + (r() * 600).toFixed(0) + '" width="' + (20 + r() * 120).toFixed(0) + '" height="' + (1 + r() * 4).toFixed(0) + '" fill="#ff365c" opacity="' + (.15 + r() * .5).toFixed(2) + '" style="animation-delay:-' + (r() * 2).toFixed(2) + 's"/>';
      return out + '<path d="M60 300Q180 190 300 300Q180 410 60 300Z" fill="#1c0009" stroke="#ff365c" stroke-width="2"/><circle cx="180" cy="300" r="42" fill="none" stroke="#ff365c" stroke-width="2"/><circle class="cn-beat" cx="180" cy="300" r="16" fill="#ff365c"/>' +
        '<text x="24" y="120" font-size="10" fill="#ff365c" opacity=".8">LOAD LIMIT EXCEEDED</text><text x="24" y="136" font-size="10" fill="#ff365c" opacity=".6">MOTOR CONTROL &gt;&gt; CHROME</text><rect y="440" width="360" height="200" fill="url(#cnDown)"/>';
    },
    // 针婆的黑诊所
    clinic: function () {
      return '<rect width="360" height="640" fill="#070b0a"/><path d="M180 60l-90 260h180z" fill="#57ffa8" opacity=".06"/>' +
        '<path d="M180 0v60" stroke="#42514c" stroke-width="3"/><path d="M150 60h60l14 22h-88z" fill="#1a2622" stroke="#57ffa8" stroke-opacity=".6"/>' +
        '<rect x="70" y="330" width="220" height="14" fill="#26332f"/><path d="M84 344v60M276 344v60" stroke="#1c2623" stroke-width="6"/><path d="M80 330c0-14 14-20 26-20h160c10 0 14 8 14 20z" fill="#2d3d38"/>' +
        '<path d="M300 150v190M300 150h-22M278 150v26" stroke="#55665f" stroke-width="2.5" fill="none"/><rect x="268" y="176" width="20" height="34" rx="3" fill="#0d1a16" stroke="#57ffa8" stroke-opacity=".7"/><path d="M278 210c0 50-40 60-60 104" fill="none" stroke="#57ffa8" stroke-opacity=".5"/>' +
        '<g fill="#030605"><ellipse cx="60" cy="258" rx="16" ry="18"/><path d="M36 284q24-16 48 0l8 120H30z"/></g>' +
        '<rect x="20" y="96" width="60" height="30" fill="#030605" stroke="#ff2fa8" stroke-opacity=".7"/><text x="50" y="116" font-size="13" fill="#ff2fa8" text-anchor="middle">诊所</text><rect y="440" width="360" height="200" fill="url(#cnDown)"/>';
    },
    // 余烬酒吧
    bar: function () {
      var r = rnd(4), out = '<rect width="360" height="640" fill="#0b0705"/><rect x="0" y="140" width="360" height="190" fill="#120b07"/>';
      for (var s = 0; s < 3; s++) { out += '<rect x="20" y="' + (170 + s * 52) + '" width="320" height="3" fill="#3a2414"/>'; for (var b = 0; b < 15; b++) { var h = 18 + r() * 20, c = ['#ffb347', '#57ffa8', '#22e6ff', '#ff2fa8', '#fcee0a'][Math.floor(r() * 5)]; out += '<rect x="' + (28 + b * 21) + '" y="' + (170 + s * 52 - h).toFixed(0) + '" width="' + (6 + r() * 5).toFixed(0) + '" height="' + h.toFixed(0) + '" fill="' + c + '" opacity="' + (.2 + r() * .4).toFixed(2) + '"/>'; } }
      return out + '<g class="cn-flick"><text x="180" y="110" font-size="44" fill="none" stroke="#ff7a3d" stroke-width="1.6" text-anchor="middle" font-weight="700" letter-spacing="12">余烬</text></g><ellipse cx="180" cy="100" rx="130" ry="40" fill="#ff7a3d" opacity=".07"/>' +
        '<rect y="340" width="360" height="26" fill="#2a1a0f"/><rect y="366" width="360" height="274" fill="#150d08"/><path d="M0 340h360" stroke="#ffb347" stroke-opacity=".5"/>' +
        '<path d="M150 340l6-36h18l6 36z" fill="none" stroke="#fff6a0" stroke-opacity=".7"/><path d="M158 318h14l3 22h-20z" fill="#ffb347" opacity=".5"/>' +
        '<g fill="#050302"><ellipse cx="250" cy="232" rx="18" ry="20"/><path d="M222 262q28-18 56 0l6 78h-68z"/></g><rect y="440" width="360" height="200" fill="url(#cnDown)"/>';
    },
    // 通讯：灰线的线路
    comms: function () {
      var out = '<rect width="360" height="640" fill="#03060a"/><g stroke="#22e6ff" fill="none" opacity=".5">';
      for (var i = 0; i < 7; i++) out += '<path class="cn-wave" style="animation-delay:-' + (i * .23).toFixed(2) + 's" d="M0 ' + (250 + i * 16) + 'q45 -' + (10 + i * 6) + ' 90 0t90 0 90 0 90 0" stroke-opacity="' + (.2 + i * .08).toFixed(2) + '"/>';
      return out + '</g><rect x="118" y="150" width="124" height="60" fill="#05090e" stroke="#7f95a3"/><text x="180" y="176" font-size="10" fill="#7f95a3" text-anchor="middle" letter-spacing="3">UNKNOWN CALLER</text><text x="180" y="196" font-size="15" fill="#e6f2f6" text-anchor="middle" letter-spacing="6">灰 线</text><circle class="cn-flick" cx="130" cy="160" r="3" fill="#57ffa8"/><rect y="440" width="360" height="200" fill="url(#cnDown)"/>';
    },
    // 黑墙
    wall: function () {
      var r = rnd(77), out = '<rect width="360" height="640" fill="#040105"/>';
      for (var y = 0; y < 13; y++) for (var x = 0; x < 9; x++) { var cx = x * 44 + (y % 2 ? 22 : 0), cy = y * 38 + 20, a = r(); out += '<path d="M' + cx + ' ' + (cy - 22) + 'l19 11v22l-19 11-19-11v-22z" fill="' + (a < .12 ? '#ff365c' : 'none') + '" fill-opacity=".25" stroke="#ff365c" stroke-opacity="' + (.12 + a * .4).toFixed(2) + '"' + (a < .2 ? ' class="cn-flick" style="animation-delay:-' + (a * 9).toFixed(2) + 's"' : '') + '/>'; }
      return out + '<path d="M170 0l14 120-22 70 30 90-16 80 20 120-10 160" fill="none" stroke="#f4f0ff" stroke-width="2.5" opacity=".85"/><path d="M162 190l-40 30M192 280l50 16M176 360l-30 44" stroke="#f4f0ff" stroke-width="1.2" opacity=".6"/><rect y="440" width="360" height="200" fill="url(#cnDown)"/>';
    },
    // 生产层
    plant: function () {
      var out = '<rect width="360" height="640" fill="#0b0a05"/>';
      for (var i = 0; i < 5; i++) { var y = 150 + i * 62, k = 1 - i * .1; out += '<rect x="0" y="' + y + '" width="360" height="8" fill="#2b2812"/>'; for (var j = 0; j < 7; j++) out += '<g class="cn-belt" style="animation-duration:' + (5 + i).toFixed(0) + 's;animation-delay:-' + (j * .8).toFixed(1) + 's"><rect x="' + (-30) + '" y="' + (y - 40 * k).toFixed(0) + '" width="' + (16 * k).toFixed(0) + '" height="' + (40 * k).toFixed(0) + '" rx="5" fill="#141309" stroke="#fcee0a" stroke-opacity=".5"/></g>'; }
      return out + '<path d="M0 120h360" stroke="#fcee0a" stroke-opacity=".6" stroke-width="2" stroke-dasharray="14 10"/><rect y="440" width="360" height="200" fill="url(#cnDown)"/>';
    },
    // 无画面：只有噪点
    void: function () { return '<rect width="360" height="640" fill="#020306"/>'; }
  };

  var KEYWORDS = [
    [/白房间|床上那个人|长着你的脸/, 'white'], [/红字|接管|过线|失控|精神病/, 'psycho'], [/针婆|缝|线还没拆|诊所/, 'clinic'], [/老韩|余烬|酒|杯/, 'bar'],
    [/冻存|冷柜|冷冻|霜|数据港/, 'cold'], [/手印|门是温的|一扇|门上/, 'door'], [/黑墙|裂隙|结晶|裂缝/, 'wall'], [/生产线|流水线|生产层|预制/, 'plant'],
    [/守卫倒|守卫散|残骸|液压油/, 'boss'], [/井盖|梯子|往下|井底|下井|深井/, 'shaft'], [/消毒水|唤醒|睁开|睁眼|投放|同步率/, 'wake'], [/霓虹|椰汁城|码头|旧港|街/, 'city']
  ];
  var WHO = { '灰线': 'comms', '唤醒台': 'wake', '针婆': 'clinic', '老韩': 'bar', '义体': 'psycho' };

  function artFor(line, previous) {
    if (line && line.art && SCENES[line.art]) return line.art;
    var text = (line && line.text) || '';
    for (var i = 0; i < KEYWORDS.length; i++) if (KEYWORDS[i][0].test(text)) return KEYWORDS[i][1];
    if (line && WHO[line.who]) return WHO[line.who];
    return previous || 'void';
  }
  function svgFor(key) {
    return '<svg class="cn-svg" viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + DEFS + (SCENES[key] || SCENES.void)() + '</svg>';
  }

  /* 给已有的过场容器铺背景；返回切换函数 */
  function attach(root) {
    var layer = document.createElement('div'); layer.className = 'sc-art';
    root.insertBefore(layer, root.firstChild); root.classList.add('has-art');
    var current = null;
    return function (line) {
      var key = artFor(line, current);
      if (key === current) return;
      current = key;
      var next = document.createElement('div'); next.className = 'sc-art-frame'; next.innerHTML = svgFor(key);
      layer.appendChild(next);
      while (layer.children.length > 2) layer.removeChild(layer.firstChild);
      if (layer.children.length === 2) { var old = layer.firstChild; old.classList.add('out'); setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 700); }
    };
  }

  /* 首次启动片头 */
  var OPENING = [
    { art: 'city', text: '椰汁城。雨下了十一年，霓虹一晚上都没灭过。' },
    { art: 'city', text: '城中心扣着穹顶。穹顶底下，有一口十五层深的井。' },
    { art: 'shaft', text: '公告上写的是「废弃数据冷库，禁止擅入」。' },
    { art: 'shaft', text: '可隔三差五，总有人拿了钱往下走。上来的不多。' },
    { art: 'wake', text: '你不记得自己是第几个。' },
    { art: 'wake', text: '你只记得冷，还有一股消毒水味。' }
  ];
  function opening(host, done, hooks) {
    hooks = hooks || {};
    var el = document.createElement('div'); el.className = 'cn-opening';
    el.innerHTML = '<div class="sc-art"></div><div class="cn-letter top"></div><div class="cn-cap"></div><div class="cn-title"><b>NEON DEPTH</b><span>霓 虹 深 潜</span><i></i></div><div class="cn-letter bot"><button class="cn-skip">跳过</button></div>';
    host.appendChild(el);
    var layer = el.querySelector('.sc-art'), cap = el.querySelector('.cn-cap'), index = -1, timer = null, typing = null, ended = false, current = null;
    function show(key) { if (key === current) return; current = key; var f = document.createElement('div'); f.className = 'sc-art-frame slow'; f.innerHTML = svgFor(key); layer.appendChild(f); if (layer.children.length > 1) { var old = layer.firstChild; old.classList.add('out'); setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 900); } }
    function finish() { if (ended) return; ended = true; clearTimeout(timer); clearInterval(typing); el.classList.add('leave'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); if (done) done(); }, 520); }
    function title() { cap.textContent = ''; el.classList.add('titled'); if (hooks.title) hooks.title(); timer = setTimeout(finish, 3400); }
    function next() {
      clearTimeout(timer); clearInterval(typing);
      index++;
      if (index >= OPENING.length) { if (el.classList.contains('titled')) finish(); else title(); return; }
      var line = OPENING[index]; show(line.art);
      var n = 0; cap.textContent = '';
      typing = setInterval(function () { n++; cap.textContent = line.text.slice(0, n); if (hooks.tick && n % 2 === 0) hooks.tick(); if (n >= line.text.length) clearInterval(typing); }, 52);
      timer = setTimeout(next, 1500 + line.text.length * 95);
    }
    el.addEventListener('click', function (ev) { if (ev.target.classList.contains('cn-skip')) finish(); else if (el.classList.contains('titled')) finish(); else next(); });
    next();
    return finish;
  }

  window.NeonCinema = { attach: attach, opening: opening, art: artFor, svg: svgFor, scenes: Object.keys(SCENES), register: function (key, draw) { SCENES[key] = draw; } };
})();
