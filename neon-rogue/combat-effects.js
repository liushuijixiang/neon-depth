/* Short world-space attack effects and animated, cell-accurate warnings. */
(function (root) {
  'use strict';

  function create(game, hooks) {
    hooks = hooks || {};
    var effects = [];
    var telegraphs = new Map();
    var edges = new WeakMap();
    var currentMap = game.map;
    var sequence = 0;
    var now = hooks.now || function () { return performance.now(); };

    function point(value) { return { x: Number(value.x) || 0, y: Number(value.y) || 0 }; }
    function positions(values) { return (values || []).map(point); }

    function resetMap() {
      if (currentMap === game.map) return;
      currentMap = game.map;
      effects = [];
      telegraphs.clear();
      edges = new WeakMap();
    }

    function snapshotData(value) {
      var result = Object.assign({}, value);
      result.cells = positions(value.cells);
      result.points = positions(value.points);
      result.origin = point(value.origin || value);
      result.target = point(value.target || { x: value.tx == null ? result.origin.x : value.tx, y: value.ty == null ? result.origin.y : value.ty });
      result.owner = value.owner && typeof value.owner === 'object' ? value.owner.uid : value.owner;
      result.color = value.color || (value.team === 'player' ? '#22e6ff' : '#ff4d5e');
      return result;
    }

    function emit(kind, value) {
      resetMap();
      value = value || {};
      var effect = snapshotData(value);
      effect.kind = kind;
      effect.sequence = sequence++;
      var delay = Math.max(0, Math.min(120, Number(value.delay) || 0));
      effect.born = now() + delay;
      effect.life = Math.max(40, Math.min(480 - delay, Number(value.life) || 320));
      effects.push(effect);
      if (hooks.shake && value.shake) hooks.shake(Math.max(0, Math.min(8, value.shake)));
      if (hooks.glitch && value.glitch) hooks.glitch(Math.max(0, Math.min(0.35, value.glitch)));
      return effect;
    }

    function setTelegraph(key, value) {
      resetMap();
      telegraphs.set(key, snapshotData(value || {}));
    }

    function clearTelegraph(key) { telegraphs.delete(key); }

    function clearOwner(owner) {
      var id = owner && typeof owner === 'object' ? owner.uid : owner;
      effects = effects.filter(function (effect) { return effect.owner !== id; });
      telegraphs.forEach(function (value, key) { if (value.owner === id) telegraphs.delete(key); });
    }

    function clear() {
      effects = [];
      telegraphs.clear();
      edges = new WeakMap();
    }

    function project(value, view) { return { x: view.sx(value.x), y: view.sy(value.y) }; }

    function segment(ctx, start, end, color, width, alpha) {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
    }

    function cellEdges(data) {
      var cached = edges.get(data);
      if (cached) return cached;
      var cells = data.cells || [];
      var occupied = new Set(cells.map(function (cell) { return cell.x + ',' + cell.y; }));
      var result = [];
      cells.forEach(function (cell) {
        if (!occupied.has((cell.x - 1) + ',' + cell.y)) result.push([cell.x - .5, cell.y - .5, cell.x - .5, cell.y + .5]);
        if (!occupied.has((cell.x + 1) + ',' + cell.y)) result.push([cell.x + .5, cell.y - .5, cell.x + .5, cell.y + .5]);
        if (!occupied.has(cell.x + ',' + (cell.y - 1))) result.push([cell.x - .5, cell.y - .5, cell.x + .5, cell.y - .5]);
        if (!occupied.has(cell.x + ',' + (cell.y + 1))) result.push([cell.x - .5, cell.y + .5, cell.x + .5, cell.y + .5]);
      });
      edges.set(data, result);
      return result;
    }

    function drawWarning(ctx, view, data, time) {
      var cells = data.cells || [];
      if (!cells.length) return;
      var color = data.color || '#ff4d5e';
      var pulse = .58 + .26 * Math.sin(time / 115);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = color; ctx.fillStyle = color;
      ctx.shadowColor = color; ctx.shadowBlur = 8;
      ctx.globalAlpha = pulse;
      ctx.lineWidth = Math.max(1.2, view.tile * .045);
      ctx.setLineDash([view.tile * .28, view.tile * .16]);
      ctx.lineDashOffset = -time / 24;
      ctx.beginPath();
      cellEdges(data).forEach(function (edge) {
        ctx.moveTo(view.sx(edge[0]), view.sy(edge[1]));
        ctx.lineTo(view.sx(edge[2]), view.sy(edge[3]));
      });
      ctx.stroke();
      ctx.setLineDash([]);
      var count = Math.min(5, cells.length);
      for (var i = 0; i < count; i++) {
        var cell = cells[(Math.floor(time / 80) + Math.floor(i * cells.length / count)) % cells.length];
        var p = project(cell, view), size = Math.max(2, view.tile * .065);
        ctx.globalAlpha = .45 + .35 * Math.sin(time / 90 + i);
        ctx.fillRect(p.x - size, p.y - size, size * 2, size * 2);
      }
      ctx.restore();
    }

    function drawRail(ctx, view, effect, progress, alpha) {
      var path = effect.points.length > 1 ? effect.points : [effect.origin, effect.target];
      for (var i = 1; i < path.length; i++) {
        var a = project(path[i - 1], view), b = project(path[i], view);
        segment(ctx, a, b, effect.color, view.tile * (.14 * (1 - progress) + .025), alpha * .8);
        segment(ctx, a, b, '#f2feff', Math.max(1, view.tile * .045 * (1 - progress)), alpha);
        var travel = (progress * 2.7 + i * .17) % 1;
        var x = a.x + (b.x - a.x) * travel, y = a.y + (b.y - a.y) * travel;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y - 2, 4, 4);
      }
    }

    function drawDash(ctx, view, effect, progress, alpha) {
      var path = effect.points.length > 1 ? effect.points : [effect.origin, effect.target];
      var end = Math.max(1, Math.min(path.length - 1, Math.ceil(progress * (path.length - 1))));
      var start = Math.max(0, end - 4);
      for (var i = start + 1; i <= end; i++) {
        var a = project(path[i - 1], view), b = project(path[i], view);
        var strength = (i - start) / Math.max(1, end - start);
        segment(ctx, a, b, effect.color, view.tile * .34 * strength, alpha * strength * .3);
        segment(ctx, { x: a.x, y: a.y - view.tile * .11 }, { x: b.x, y: b.y - view.tile * .11 }, '#dffcff', 1.4, alpha * strength);
        segment(ctx, { x: a.x, y: a.y + view.tile * .11 }, { x: b.x, y: b.y + view.tile * .11 }, effect.color, 2, alpha * strength);
      }
    }

    /* 实际命中格：先闪一下再留轮廓，所有带 cells 的效果都画，保证看到的范围就是结算的范围 */
    function drawCells(ctx, view, effect, progress, alpha) {
      var cells = effect.cells || [];
      if (!cells.length) return;
      var t = view.tile, flash = Math.max(0, 1 - progress * 3);
      ctx.save(); ctx.shadowBlur = 6 * alpha; ctx.shadowColor = effect.color; ctx.strokeStyle = effect.color; ctx.fillStyle = effect.color;
      // 虚线轮廓：只描边，不铺色块
      ctx.globalAlpha = Math.min(1, alpha * 1.15); ctx.lineWidth = Math.max(1.1, t * .04);
      ctx.setLineDash([t * .22, t * .13]); ctx.lineDashOffset = -progress * t * 1.2;
      ctx.beginPath();
      cellEdges(effect).forEach(function (edge) { ctx.moveTo(view.sx(edge[0]), view.sy(edge[1])); ctx.lineTo(view.sx(edge[2]), view.sy(edge[3])); });
      ctx.stroke(); ctx.setLineDash([]);
      // 格内小标记：沿出招方向的折角，或十字 / 圆形招式的准星点
      var angle = effect.angle || 0, motif = effect.motif, ox = effect.center || effect.origin;
      ctx.globalAlpha = alpha * (.35 + .5 * flash); ctx.lineWidth = Math.max(1, t * .045);
      cells.forEach(function (cell) {
        var x = view.sx(cell.x), y = view.sy(cell.y), a = angle;
        if (motif === 'cross' || motif === 'circle' || motif === 'disc' || motif === 'impact' || !motif) a = Math.atan2(cell.y - ox.y, cell.x - ox.x);
        var c = Math.cos(a), n = Math.sin(a), k = t * .13, push = t * .1 * flash;
        ctx.beginPath(); ctx.moveTo(x + push * c - k * c - k * n, y + push * n - k * n + k * c); ctx.lineTo(x + push * c + k * c, y + push * n + k * n); ctx.lineTo(x + push * c - k * c + k * n, y + push * n - k * n - k * c); ctx.stroke();
      });
      ctx.restore();
    }

    function drawCross(ctx, view, effect, progress, alpha) {
      var cells = effect.cells || [];
      if (!cells.length) return;
      var cx = 0, cy = 0; cells.forEach(function (cell) { cx += cell.x; cy += cell.y; }); cx = Math.round(cx / cells.length); cy = Math.round(cy / cells.length);
      var center = effect.center || { x: cx, y: cy }, c = project(center, view);
      ctx.strokeStyle = '#f4feff'; ctx.lineWidth = Math.max(1.4, view.tile * .08); ctx.globalAlpha = alpha;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var reach = 0; cells.forEach(function (cell) { var along = (cell.x - center.x) * d[0] + (cell.y - center.y) * d[1], side = (cell.x - center.x) * d[1] + (cell.y - center.y) * d[0]; if (!side && along > reach) reach = along; });
        if (!reach) return; var len = (reach + .5) * view.tile * Math.min(1, progress * 3 + .25);
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + d[0] * len, c.y + d[1] * len); ctx.stroke();
      });
    }

    function drawRectangle(ctx, view, effect, progress, alpha, cross) {
      var a = project(effect.origin, view), b = project(effect.target, view);
      var angle = effect.angle == null ? Math.atan2(b.y - a.y, b.x - a.x) : effect.angle;
      var length = Math.max(view.tile, Math.hypot(b.x - a.x, b.y - a.y)) + view.tile * .5;
      var width = Math.max(.25, effect.width || .8) * view.tile;
      // 格子本身由 drawCells 画；这里只画沿方向推出去的刀光
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(angle);
      ctx.strokeStyle = '#f4feff'; ctx.lineWidth = Math.max(1.4, view.tile * .09); ctx.globalAlpha = alpha;
      var lanes = Math.max(1, Math.round(width / view.tile));
      for (var i = 0; i < lanes; i++) {
        var off = (i - (lanes - 1) / 2) * view.tile;
        ctx.beginPath(); ctx.moveTo(view.tile * .5 + (length - view.tile * .5) * Math.min(.85, progress * .9), off); ctx.lineTo(view.tile * .5 + (length - view.tile * .5) * Math.min(1, progress * 2.6 + .2), off); ctx.stroke();
      }
      ctx.restore();
    }

    function drawSwipe(ctx, view, effect, progress, alpha, cone) {
      var center = project(effect.origin, view);
      var angle = effect.angle == null ? Math.atan2(effect.target.y - effect.origin.y, effect.target.x - effect.origin.x) : effect.angle;
      var radius = (Math.max(.7, effect.radius || 1.6) + (effect.cells && effect.cells.length ? .45 : 0)) * view.tile;
      var sweep = effect.arc ? effect.arc : cone ? Math.PI * .72 : Math.PI * 1.15;
      var head = angle - sweep / 2 + sweep * Math.min(1, progress * 1.55);
      var tail = Math.max(angle - sweep / 2, head - sweep * .62);
      ctx.save(); ctx.translate(center.x, center.y);
      if (cone && !(effect.cells && effect.cells.length)) {
        ctx.globalAlpha = alpha * .24; ctx.fillStyle = effect.color;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, tail, head); ctx.closePath(); ctx.fill();
      }
      for (var trail = 0; trail < 3; trail++) {
        ctx.globalAlpha = alpha * (1 - trail * .28);
        ctx.strokeStyle = trail === 0 ? '#f5feff' : effect.color;
        ctx.lineWidth = Math.max(1.3, view.tile * (trail === 0 ? .06 : .11));
        ctx.beginPath(); ctx.arc(0, 0, radius * (1 - trail * .13), tail, head); ctx.stroke();
      }
      ctx.restore();
    }

    function drawShock(ctx, view, effect, progress, alpha) {
      var center = project(effect.origin, view);
      var radius = Math.max(.6, effect.radius || 2) * view.tile;
      for (var ring = 0; ring < 3; ring++) {
        var travel = Math.max(0, progress - ring * .12);
        if (!travel) continue;
        ctx.globalAlpha = alpha * (1 - ring * .2);
        ctx.strokeStyle = ring ? effect.color : '#eaffff';
        ctx.lineWidth = Math.max(1, view.tile * .09 * (1 - travel));
        ctx.beginPath(); ctx.arc(center.x, center.y, radius * Math.sqrt(travel), 0, Math.PI * 2); ctx.stroke();
      }
      for (var i = 0; i < 12; i++) {
        var angle = i * Math.PI / 6 + effect.sequence * .31;
        var inner = radius * progress * .7, outer = radius * progress + view.tile * .18;
        segment(ctx, { x: center.x + Math.cos(angle) * inner, y: center.y + Math.sin(angle) * inner },
          { x: center.x + Math.cos(angle) * outer, y: center.y + Math.sin(angle) * outer }, effect.color, 1.4, alpha * .7);
      }
    }

    function drawEcho(ctx, view, effect, progress, alpha) {
      var cells = effect.cells.length ? effect.cells : effect.points;
      cells.forEach(function (cell, index) {
        var age = Math.max(0, progress - Math.min(.35, index * .035));
        var p = project(cell, view), size = view.tile * (.24 + age * .45);
        ctx.globalAlpha = alpha * (1 - age) * .9;
        ctx.strokeStyle = index % 2 ? '#eaffff' : effect.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x - size, p.y - size, size * 2, size * 2);
      });
    }

    function draw(ctx, view, time) {
      resetMap();
      time = time == null ? now() : time;
      telegraphs.forEach(function (data) { drawWarning(ctx, view, data, time); });
      (game.enemies || []).forEach(function (enemy) {
        if (enemy.hp > 0 && enemy.intent && enemy.intent.bossCombat) drawWarning(ctx, view, enemy.intent, time);
      });
      (game.hazards || []).forEach(function (field) { if (field.bossCombat) drawWarning(ctx, view, field, time); });
      effects = effects.filter(function (effect) { return time < effect.born + effect.life; });
      effects.forEach(function (effect) {
        if (time < effect.born) return;
        var progress = (time - effect.born) / effect.life;
        var alpha = Math.pow(1 - progress, .7);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowColor = effect.color; ctx.shadowBlur = 16 * alpha;
        if (effect.kind !== 'network' && effect.kind !== 'dash' && effect.kind !== 'blink' && effect.kind !== 'echo') drawCells(ctx, view, effect, progress, alpha);
        if (effect.kind === 'outline') { /* 只有轮廓 */ }
        else if (effect.kind === 'cross') drawCross(ctx, view, effect, progress, alpha);
        else if (effect.kind === 'rail' || effect.kind === 'network') drawRail(ctx, view, effect, progress, alpha);
        else if (effect.kind === 'dash' || effect.kind === 'blink') drawDash(ctx, view, effect, progress, alpha);
        else if (effect.kind === 'rect') drawRectangle(ctx, view, effect, progress, alpha, false);
        else if (effect.kind === 'slash' || effect.kind === 'cone' || effect.kind === 'tendril') drawSwipe(ctx, view, effect, progress, alpha, effect.kind !== 'slash');
        else if (effect.kind === 'echo') drawEcho(ctx, view, effect, progress, alpha);
        else drawShock(ctx, view, effect, progress, alpha);
        ctx.restore();
      });
    }

    return { emit: emit, draw: draw, setTelegraph: setTelegraph, clearTelegraph: clearTelegraph,
      clearOwner: clearOwner, clear: clear, snapshot: function () { return { effects: effects.map(function (effect) { return Object.assign({}, effect); }), telegraphs: telegraphs.size }; } };
  }

  var api = { create: create };
  root.NeonCombatEffects = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
