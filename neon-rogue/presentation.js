/* Canvas hardware illustrations. This module never reads or writes gameplay state. */
(function () {
  'use strict';

  var palette = {
    gray: '#9aa7b0', green: '#57ffa8', blue: '#22e6ff',
    purple: '#b06bff', orange: '#ffb347', red: '#ff4d5e'
  };
  var boardShapes = {
    atk: [[19, 8], [95, 8], [112, 25], [112, 91], [91, 112], [25, 112], [8, 95], [8, 19]],
    hp: [[34, 8], [86, 8], [103, 24], [107, 60], [103, 96], [86, 112], [34, 112], [17, 96], [13, 60], [17, 24]],
    def: [[17, 12], [103, 12], [112, 30], [108, 77], [93, 98], [60, 114], [27, 98], [12, 77], [8, 30]],
    crit: [[36, 9], [84, 9], [109, 34], [109, 86], [84, 111], [36, 111], [11, 86], [11, 34]],
    critMult: [[29, 9], [91, 9], [112, 30], [112, 91], [91, 112], [29, 112], [8, 91], [8, 30]],
    dodge: [[34, 9], [110, 9], [103, 42], [112, 50], [87, 111], [10, 111], [17, 78], [8, 70]],
    compat: [[12, 18], [43, 18], [43, 9], [77, 9], [77, 18], [108, 18], [108, 102], [77, 102], [77, 111], [43, 111], [43, 102], [12, 102]],
    power: [[24, 8], [96, 8], [106, 20], [106, 45], [112, 45], [112, 75], [106, 75], [106, 100], [96, 112], [24, 112], [14, 100], [14, 75], [8, 75], [8, 45], [14, 45], [14, 20]],
    skill: [[32, 9], [88, 9], [88, 18], [110, 32], [110, 88], [88, 102], [88, 111], [32, 111], [32, 102], [10, 88], [10, 32], [32, 18]]
  };
  var visibleHardware = new Set();
  var artworkDraws = 0;
  var observedGeneration = new WeakMap();
  var generation = 0;
  var observedCount = 0;

  function color(chip) {
    return palette[chip.quality] || chip.color || palette.gray;
  }

  function hardware(chip) {
    var quality = Object.prototype.hasOwnProperty.call(palette, chip.quality) ? chip.quality : 'gray';
    var heavy = chip.heavy > 0;
    var stat = Object.prototype.hasOwnProperty.call(boardShapes, chip.stat) ? chip.stat : 'atk';
    return '<i class="chip-hardware' + (heavy ? ' modified' : '') + (chip.mech ? ' mechanical' : '') + '" aria-hidden="true" style="--hardware-ink:' + palette[quality] + '">' +
      '<canvas width="240" height="240" data-chip-quality="' + quality + '" data-chip-stat="' + stat + '" data-chip-heavy="' + (heavy ? '1' : '0') + '" data-chip-mech="' + (chip.mech ? '1' : '0') + '"></canvas></i>';
  }

  function polygon(ctx, points, fill, stroke, width) {
    ctx.beginPath();
    points.forEach(function (point, index) {
      if (index) ctx.lineTo(point[0], point[1]);
      else ctx.moveTo(point[0], point[1]);
    });
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width || 1; ctx.stroke(); }
  }

  function trace(ctx, points, ink, width) {
    ctx.beginPath();
    points.forEach(function (point, index) {
      if (index) ctx.lineTo(point[0], point[1]);
      else ctx.moveTo(point[0], point[1]);
    });
    ctx.strokeStyle = ink;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function core(ctx, stat, ink, die) {
    if (stat === 'crit' || stat === 'power') {
      ctx.beginPath(); ctx.arc(60, 60, 24, 0, Math.PI * 2); ctx.fillStyle = die; ctx.fill();
      ctx.strokeStyle = '#82969e'; ctx.lineWidth = 1.2; ctx.stroke();
      for (var ring = 0; ring < 3; ring++) {
        ctx.beginPath(); ctx.arc(60, 60, 17 + ring * 2.6, stat === 'crit' ? -.6 : 0, Math.PI * 2 - (stat === 'crit' ? 1 : .3));
        ctx.strokeStyle = ring === 1 ? ink : '#3d6672'; ctx.lineWidth = stat === 'power' ? 1.8 : .7; ctx.stroke();
      }
    } else if (stat === 'critMult') {
      [-1, 1].forEach(function (side) {
        polygon(ctx, [[60 + side * 5, 38], [60 + side * 22, 42], [60 + side * 25, 75], [60 + side * 5, 82]], die, '#738a95', 1);
        trace(ctx, [[60 + side * 12, 46], [60 + side * 17, 53], [60 + side * 15, 73]], ink, 1.1);
      });
    } else if (stat === 'def') {
      polygon(ctx, [[39, 37], [81, 37], [85, 51], [80, 74], [60, 86], [40, 74], [35, 51]], die, '#8ba2ad', 1.3);
      polygon(ctx, [[43, 42], [77, 42], [80, 52], [76, 71], [60, 80], [44, 71], [40, 52]], null, ink, .8);
    } else if (stat === 'dodge') {
      polygon(ctx, [[46, 37], [83, 37], [74, 81], [37, 81]], die, '#8394a4', 1.1);
      trace(ctx, [[49, 42], [76, 42], [71, 74]], ink, 1.1);
      trace(ctx, [[42, 76], [47, 51]], ink, 1.1);
    } else {
      polygon(ctx, [[43, 38], [76, 38], [82, 44], [82, 76], [76, 82], [43, 82], [38, 77], [38, 43]], die, '#72808a', 1.1);
      if (stat === 'hp') {
        [-1, 1].forEach(function (side) {
          for (var cell = 0; cell < 3; cell++) {
            ctx.fillStyle = '#274856'; ctx.fillRect(60 + side * 17 - 3, 43 + cell * 11, 6, 7);
            ctx.fillStyle = ink; ctx.fillRect(60 + side * 17 - 3, 43 + cell * 11, 6, 1);
          }
        });
      } else if (stat === 'compat') {
        for (var row = 0; row < 3; row++) {
          trace(ctx, [[42, 44 + row * 15], [48, 44 + row * 15]], ink, 1.8);
          trace(ctx, [[72, 44 + row * 15], [78, 44 + row * 15]], ink, 1.8);
        }
      } else if (stat === 'skill') {
        for (var node = 0; node < 6; node++) {
          var angle = node * Math.PI / 3;
          var x = 60 + Math.cos(angle) * 21, y = 60 + Math.sin(angle) * 21;
          trace(ctx, [[60, 60], [x, y]], '#527682', .8);
          ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        trace(ctx, [[43, 75], [50, 67], [48, 57], [58, 43]], ink, 1.4);
        trace(ctx, [[64, 76], [72, 64], [70, 53], [77, 45]], ink, 1.4);
      }
    }
    ctx.fillStyle = '#080d15'; ctx.fillRect(47, 47, 26, 26);
    ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.strokeRect(49, 49, 22, 22);
    ctx.fillStyle = ink; ctx.globalAlpha = .13; ctx.fillRect(50, 50, 20, 20); ctx.globalAlpha = 1;
  }

  function drawHardware(canvas) {
    var signature = [canvas.dataset.chipQuality, canvas.dataset.chipStat, canvas.dataset.chipHeavy, canvas.dataset.chipMech].join('|');
    if (canvas.dataset.hardwareDrawn === signature) return;
    if (!canvas.dataset.hardwareContextEvents) {
      canvas.dataset.hardwareContextEvents = '1';
      canvas.addEventListener('contextlost', function () { delete canvas.dataset.hardwareDrawn; });
      canvas.addEventListener('contextrestored', function () { if (canvas.isConnected) drawHardware(canvas); });
    }
    var ctx = canvas.getContext('2d');
    if (!ctx || (ctx.isContextLost && ctx.isContextLost())) return;
    var ink = palette[canvas.dataset.chipQuality] || palette.gray;
    var heavy = canvas.dataset.chipHeavy === '1';
    var mechanical = canvas.dataset.chipMech === '1';
    var stat = canvas.dataset.chipStat || 'atk';
    ctx.clearRect(0, 0, 240, 240);
    ctx.save();
    ctx.scale(2, 2);
    var rank = ['gray', 'green', 'blue', 'purple', 'orange', 'red'].indexOf(canvas.dataset.chipQuality); if (rank < 0) rank = 0;
    var body = [[26, 16], [94, 16], [104, 26], [104, 94], [94, 104], [26, 104], [16, 94], [16, 26]];
    // 引脚：四边各 7 根，品质越高越亮
    for (var side = 0; side < 4; side++) {
      ctx.save(); ctx.translate(60, 60); ctx.rotate(side * Math.PI / 2);
      for (var pin = -3; pin <= 3; pin++) {
        ctx.fillStyle = '#1b2a33'; ctx.fillRect(pin * 10 - 2.5, -54, 5, 11);
        ctx.globalAlpha = .45 + rank * .11; ctx.fillStyle = ink; ctx.fillRect(pin * 10 - 1.5, -54, 3, 7); ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
    // 封装体
    var shell = ctx.createLinearGradient(16, 16, 104, 104);
    shell.addColorStop(0, '#152331'); shell.addColorStop(.5, '#0a121b'); shell.addColorStop(1, '#05080d');
    ctx.shadowColor = ink; ctx.shadowBlur = 3 + rank * 1.6;
    polygon(ctx, body, shell, ink, 2);
    ctx.shadowBlur = 0;
    polygon(ctx, body.map(function (pt) { return [60 + (pt[0] - 60) * .88, 60 + (pt[1] - 60) * .88]; }), null, 'rgba(255,255,255,.07)', 1);
    // 一号脚标记
    polygon(ctx, [[18, 27], [27, 18], [36, 18], [18, 36]], ink, null);
    // 走线：每种词条一套走向
    var routes = {
      atk: [[[30, 92], [44, 78]], [[92, 30], [78, 44]], [[92, 92], [78, 78]]],
      hp: [[[60, 22], [60, 36]], [[60, 98], [60, 84]], [[22, 60], [36, 60]], [[98, 60], [84, 60]]],
      def: [[[26, 44], [36, 44]], [[26, 76], [36, 76]], [[94, 44], [84, 44]], [[94, 76], [84, 76]]],
      crit: [[[92, 28], [80, 40]], [[28, 92], [40, 80]]],
      critMult: [[[92, 28], [80, 40]], [[28, 92], [40, 80]], [[92, 92], [80, 80]], [[40, 26], [40, 36]]],
      dodge: [[[24, 50], [36, 50]], [[24, 60], [36, 60]], [[24, 70], [36, 70]]],
      compat: [[[44, 22], [44, 36]], [[76, 22], [76, 36]], [[44, 98], [44, 84]], [[76, 98], [76, 84]]],
      power: [[[60, 22], [60, 36]], [[50, 98], [50, 84]], [[70, 98], [70, 84]]],
      skill: [[[30, 30], [40, 40]], [[90, 30], [80, 40]], [[30, 90], [40, 80]], [[90, 90], [80, 80]]]
    };
    (routes[stat] || routes.atk).forEach(function (line) {
      trace(ctx, line, 'rgba(120,160,175,.35)', 3);
      ctx.shadowColor = ink; ctx.shadowBlur = rank > 0 ? 4 : 0; trace(ctx, line, ink, 1.4); ctx.shadowBlur = 0;
      ctx.fillStyle = '#eafcff'; ctx.beginPath(); ctx.arc(line[0][0], line[0][1], 1.8, 0, Math.PI * 2); ctx.fill();
    });
    // 晶粒
    var die = ctx.createLinearGradient(36, 36, 84, 84);
    die.addColorStop(0, '#1b2836'); die.addColorStop(1, '#070b12');
    polygon(ctx, [[40, 36], [80, 36], [84, 40], [84, 80], [80, 84], [40, 84], [36, 80], [36, 40]], die, ink, 1.4);
    ctx.globalAlpha = .10 + rank * .025; ctx.fillStyle = ink; ctx.fillRect(38, 38, 44, 44); ctx.globalAlpha = 1;
    if (rank >= 3) { ctx.strokeStyle = ink; ctx.globalAlpha = .5; ctx.lineWidth = .8; ctx.strokeRect(32.5, 32.5, 55, 55); ctx.globalAlpha = 1; }
    if (rank >= 4) [[26, 94], [94, 26], [94, 94]].forEach(function (pt) { ctx.fillStyle = ink; ctx.fillRect(pt[0] - 2.5, pt[1] - 2.5, 5, 5); ctx.fillStyle = '#05080d'; ctx.fillRect(pt[0] - 1, pt[1] - 1, 2, 2); });
    if (rank >= 5) { var hot = ctx.createRadialGradient(60, 60, 4, 60, 60, 34); hot.addColorStop(0, 'rgba(255,77,94,.42)'); hot.addColorStop(1, 'rgba(255,77,94,0)'); ctx.fillStyle = hot; ctx.fillRect(26, 26, 68, 68); }

    if (heavy) {
      // 重改件：外挂散热片与飞线
      polygon(ctx, [[88, 40], [106, 40], [106, 80], [88, 80]], '#2a2f37', '#b98b5b', 1);
      for (var fin = 0; fin < 6; fin++) { ctx.fillStyle = fin % 2 ? '#c99562' : '#3a2c20'; ctx.fillRect(90 + fin * 2.6, 43, 1.8, 34); }
      trace(ctx, [[22, 96], [30, 86], [30, 70], [38, 62]], '#04080e', 5);
      trace(ctx, [[22, 96], [30, 86], [30, 70], [38, 62]], '#ff8a3d', 2.6);
      [[22, 96], [38, 62]].forEach(function (pt) { ctx.fillStyle = '#e8e2d2'; ctx.beginPath(); ctx.arc(pt[0], pt[1], 2.2, 0, Math.PI * 2); ctx.fill(); });
    }
    if (mechanical) {
      // 机改件：四角钢夹
      [[14, 14, 1, 1], [106, 14, -1, 1], [14, 106, 1, -1], [106, 106, -1, -1]].forEach(function (cl) {
        ctx.strokeStyle = '#c5d0d4'; ctx.lineWidth = 3.2; ctx.beginPath();
        ctx.moveTo(cl[0] + cl[2] * 14, cl[1]); ctx.lineTo(cl[0], cl[1]); ctx.lineTo(cl[0], cl[1] + cl[3] * 14); ctx.stroke();
        ctx.fillStyle = '#56666f'; ctx.fillRect(cl[0] + cl[2] * 4 - 1.5, cl[1] + cl[3] * 4 - 1.5, 3, 3);
      });
    }
    ctx.restore();
    canvas.dataset.hardwareDrawn = signature;
    artworkDraws++;
  }

  var visibility = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var illustration = entry.target;
      if (observedGeneration.get(illustration) !== generation) return;
      if (!illustration.isConnected) {
        visibleHardware.delete(illustration);
        observedGeneration.delete(illustration);
        observedCount--;
        visibility.unobserve(illustration);
        return;
      }
      illustration.classList.toggle('is-visible', entry.isIntersecting);
      if (entry.isIntersecting) {
        visibleHardware.add(illustration);
        drawHardware(illustration.querySelector('canvas'));
      } else visibleHardware.delete(illustration);
    });
  }) : null;

  function mount(scope) {
    if (visibility) visibility.disconnect();
    visibleHardware.clear();
    generation++;
    observedCount = 0;
    scope.querySelectorAll('.chip-hardware').forEach(function (illustration, index) {
      illustration.style.setProperty('--hardware-phase', (-index * .37) + 's');
      if (visibility) { observedGeneration.set(illustration, generation); observedCount++; visibility.observe(illustration); }
      else { illustration.classList.add('is-visible'); drawHardware(illustration.querySelector('canvas')); }
    });
    if (window.NeonCompactUI) window.NeonCompactUI.observe(scope);
  }

  function animateForge(stage, duration, complete) {
    var start = performance.now();
    function frame(now) {
      if (!stage.isConnected) return;
      var progress = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
      stage.style.setProperty('--forge-progress', progress);
      if (progress < 1) requestAnimationFrame(frame);
      else complete();
    }
    requestAnimationFrame(frame);
  }

  function visibilityChanged() {
    document.documentElement.classList.toggle('hardware-paused', document.hidden);
  }
  document.addEventListener('visibilitychange', visibilityChanged);
  visibilityChanged();
  window.NeonPresentation = { color: color, hardware: hardware, mount: mount, animateForge: animateForge,
    dispose: function () { if (visibility) visibility.disconnect(); visibleHardware.clear(); observedCount = 0; generation++; document.removeEventListener('visibilitychange', visibilityChanged); },
    snapshot: function () { return { visible: visibleHardware.size, observed: observedCount, artworkDraws: artworkDraws }; } };
})();
