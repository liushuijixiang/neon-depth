/* Short, visual-only interface feedback. It never consumes the gameplay RNG. */
(function (root) {
  'use strict';
  var tau = Math.PI * 2;

  function create(overlay, options) {
    options = options || {};
    var canvas = document.createElement('canvas');
    canvas.className = 'interface-effects';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    var context = canvas.getContext('2d');
    var effects = [], frameId = 0, sequence = 0, frames = 0, emitted = 0;
    var surface = { x: 0, y: 0, width: 0, height: 0, scale: 1 };
    var lastInput = -1000;

    function reduced() {
      return options.reduced ? !!options.reduced() : !!(root.NeonMotion && root.NeonMotion.reduced);
    }

    function colorOf(element) {
      var style = getComputedStyle(element);
      var names = ['--cq', '--it', '--tc', '--site', '--fq', '--mc', '--acc'];
      for (var i = 0; i < names.length; i++) {
        var value = style.getPropertyValue(names[i]).trim();
        if (/^#[\da-f]{3,8}$/i.test(value)) return value;
      }
      return '#22e6ff';
    }

    function bounds(element) {
      var rect = element.getBoundingClientRect();
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    }

    function resize() {
      var rect = overlay.getBoundingClientRect();
      var scale = root.devicePixelRatio || 1;
      if (rect.width !== surface.width || rect.height !== surface.height || scale !== surface.scale) {
        canvas.width = Math.max(1, Math.round(rect.width * scale));
        canvas.height = Math.max(1, Math.round(rect.height * scale));
      }
      surface = { x: rect.left, y: rect.top, width: rect.width, height: rect.height, scale: scale };
      canvas.style.left = rect.left + 'px';
      canvas.style.top = rect.top + 'px';
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    }

    function clear() {
      if (!context) return;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    function stop() {
      if (frameId) root.cancelAnimationFrame(frameId);
      frameId = 0;
      effects.length = 0;
      clear();
    }

    function corners(box, distance, color, alpha, thickness) {
      var x = box.x - distance, y = box.y - distance;
      var width = box.width + distance * 2, height = box.height + distance * 2;
      var length = Math.min(22, width * .18, height * .4);
      context.globalAlpha = alpha;
      context.strokeStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 12;
      context.lineWidth = thickness;
      context.beginPath();
      [[x, y, 1, 1], [x + width, y, -1, 1], [x, y + height, 1, -1], [x + width, y + height, -1, -1]].forEach(function (corner) {
        context.moveTo(corner[0] + corner[2] * length, corner[1]);
        context.lineTo(corner[0], corner[1]);
        context.lineTo(corner[0], corner[1] + corner[3] * length);
      });
      context.stroke();
    }

    function scan(box, progress, color, alpha) {
      var y = box.y + box.height * progress;
      context.globalAlpha = alpha;
      context.shadowColor = color;
      context.shadowBlur = 14;
      context.fillStyle = color;
      context.fillRect(box.x + 4, y, Math.max(0, box.width - 8), 1.5);
      context.globalAlpha = alpha * .2;
      context.fillRect(box.x + 4, y - 5, Math.max(0, box.width - 8), 10);
    }

    function fragments(effect, progress, color, count, reach) {
      context.lineWidth = 1.5;
      for (var i = 0; i < count; i++) {
        var angle = i * tau / count + effect.seed * .37;
        var distance = (5 + reach * progress) * (1 + .18 * Math.sin(effect.seed + i * 3));
        var x = effect.cx + Math.cos(angle) * distance;
        var y = effect.cy + Math.sin(angle) * distance * .55;
        context.globalAlpha = Math.pow(1 - progress, 1.4) * .8;
        context.strokeStyle = i % 3 === 0 ? '#ff2fa8' : color;
        context.shadowColor = context.strokeStyle;
        context.shadowBlur = 10;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - Math.cos(angle) * (4 + 8 * (1 - progress)), y - Math.sin(angle) * 4);
        context.stroke();
      }
    }

    function draw(effect, progress) {
      var box = effect.box, fade = 1 - progress;
      if (effect.kind === 'panel') {
        var eased = 1 - Math.pow(1 - progress, 2.2);
        corners(box, 0, effect.color, fade * .8, 1.4);
        scan(box, .04 + eased * .92, effect.color, Math.min(1, fade * 1.6) * .45);
        return;
      }
      if (effect.kind === 'charge') {
        var beat = Math.floor(progress * 10);
        if (beat !== effect.beat) {
          effect.beat = beat;
          if (effect.onPulse) {
            try { effect.onPulse(progress); } catch (error) { effect.onPulse = null; }
          }
        }
        var phase = progress * 10 % 1;
        var radius = Math.min(box.width * .35, box.height * .42);
        for (var arc = 0; arc < 4; arc++) {
          var start = progress * tau * 3 + arc * tau / 4;
          context.globalAlpha = .55 * (1 - arc * .12);
          context.lineWidth = arc === 0 ? 2 : 1;
          context.strokeStyle = arc % 2 ? '#ff2fa8' : effect.color;
          context.shadowColor = context.strokeStyle;
          context.shadowBlur = 16;
          context.beginPath();
          context.arc(effect.cx, effect.cy, radius + arc * 5 + Math.sin(progress * tau * 6) * 3, start, start + .45);
          context.stroke();
        }
        scan(box, phase, effect.color, .65 * (1 - phase));
        corners(box, 2 + phase * 4, phase < .2 ? '#ffffff' : effect.color, .7 * (1 - phase), 1.5);
        return;
      }
      if (effect.kind === 'burst') {
        var flash = progress < .14 ? 1 - progress / .14 : 0;
        context.globalAlpha = flash * .18;
        context.fillStyle = '#ffffff';
        context.fillRect(box.x, box.y, box.width, box.height);
        corners(box, progress * 16, effect.color, fade, 2.2);
        corners(box, progress * 9, '#ff2fa8', fade * .55, 1);
        fragments(effect, progress, effect.color, 16, Math.max(35, box.width * .5));
        scan(box, progress, '#ffffff', fade * .65);
        return;
      }
      if (progress < .2) {
        context.globalAlpha = .14 * (1 - progress / .2);
        context.fillStyle = effect.color;
        context.fillRect(box.x, box.y, box.width, box.height);
      }
      corners(box, progress * 5, effect.color, fade * .9, 1.5);
      if (!effect.reduced) {
        var shift = Math.sin(progress * Math.PI) * 4;
        corners({ x: box.x + shift, y: box.y - 1, width: box.width, height: box.height }, 0, '#ff2fa8', fade * .45, 1);
        fragments(effect, progress, effect.color, 7, 28);
      }
    }

    function tick(now) {
      frameId = 0;
      if (!context || document.hidden || !overlay.classList.contains('show')) { stop(); return; }
      clear();
      context.setTransform(surface.scale, 0, 0, surface.scale, -surface.x * surface.scale, -surface.y * surface.scale);
      context.globalCompositeOperation = 'lighter';
      effects = effects.filter(function (effect) {
        var elapsed = now - effect.started;
        if (elapsed >= effect.duration || effect.target && !effect.target.isConnected) return false;
        context.save();
        draw(effect, Math.max(0, elapsed / effect.duration));
        context.restore();
        return true;
      });
      frames++;
      if (effects.length) frameId = root.requestAnimationFrame(tick);
      else clear();
    }

    function emit(kind, element, duration, extra) {
      if (!context || !element || !element.isConnected || document.hidden) return;
      resize();
      var box = bounds(element);
      if (!box.width || !box.height) return;
      var effect = Object.assign({ kind: kind, box: box, color: colorOf(element),
        cx: box.x + box.width / 2, cy: box.y + box.height / 2,
        started: root.performance.now(), duration: duration, seed: ++sequence, reduced: reduced() }, extra || {});
      effects.push(effect); emitted++;
      if (!frameId) frameId = root.requestAnimationFrame(tick);
    }

    /* 按钮先把按下的反馈播出来，再执行动作；这段时间里其他点击不生效 */
    var PRESS_DELAY = 150, TAP_LIFE = 230, PANEL_LIFE = 340, pendingPress = 0;
    function pressDelay() {
      if (reduced() || (root.navigator && root.navigator.webdriver && !root.__neonPressDelay)) return 0;
      return PRESS_DELAY;
    }
    function clicked(event) {
      var element = event.target.closest && event.target.closest('button,[role="button"],summary');
      if (!element || !overlay.contains(element) || element.disabled || element.getAttribute('aria-disabled') === 'true') return;
      if (element._neonReplay) return;
      var delay = element.tagName === 'SUMMARY' ? 0 : pressDelay();
      if (delay && pendingPress) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      lastInput = root.performance.now();
      resize();
      var box = bounds(element), color = colorOf(element), armed = element.classList.contains('confirm2-armed');
      var point = event.detail && event.clientX >= box.x && event.clientX <= box.x + box.width
        ? { x: event.clientX, y: event.clientY } : { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      function flash(tint) {
        effects.push({ kind: 'tap', box: box, color: tint,
          cx: point.x, cy: point.y, target: element, started: root.performance.now(), duration: reduced() ? 90 : TAP_LIFE,
          seed: ++sequence, reduced: reduced() });
        emitted++;
        if (!frameId) frameId = root.requestAnimationFrame(tick);
      }
      if (delay) {
        event.preventDefault(); event.stopImmediatePropagation();
        element.classList.add('ifx-pressed'); flash(armed ? '#9fe9ff' : color);
        pendingPress = root.setTimeout(function () {
          pendingPress = 0; element.classList.remove('ifx-pressed');
          if (!element.isConnected || element.disabled || !overlay.classList.contains('show')) return;
          element._neonReplay = true; overlay.armed = true;
          try { element.click(); } finally { element._neonReplay = false; }
        }, delay);
        return;
      }
      Promise.resolve().then(function () {
        if (!overlay.classList.contains('show') || document.hidden) return;
        var arming = element.classList.contains('confirm2-armed');
        flash(arming ? '#fcee0a' : armed ? '#9fe9ff' : color);
      });
    }

    function present(card, changed) {
      if (!card) { stop(); return; }
      if (reduced() || !changed && root.performance.now() - lastInput > 200) return;
      effects = effects.filter(function (effect) { return effect.kind !== 'panel' && !(changed && effect.kind === 'tap'); });
      if (changed) clear();
      emit('panel', card, PANEL_LIFE, { target: card });
    }

    function hidden() { if (document.hidden) stop(); }
    overlay.addEventListener('click', clicked, true);
    document.addEventListener('visibilitychange', hidden);
    root.addEventListener('resize', resize);
    canvas.addEventListener('contextlost', function (event) { event.preventDefault(); stop(); });
    canvas.addEventListener('contextrestored', function () { context = canvas.getContext('2d'); resize(); });

    return {
      present: present,
      charge: function (stage, duration, onPulse) {
        if (duration > 0 && !reduced()) emit('charge', stage, duration, { target: stage, beat: -1, onPulse: onPulse });
      },
      burst: function (stage) { if (!reduced()) emit('burst', stage, 460, { target: stage }); },
      snapshot: function () { return { active: effects.length, pendingFrame: !!frameId, emitted: emitted, frames: frames }; },
      dispose: function () {
        stop(); overlay.removeEventListener('click', clicked, true);
        document.removeEventListener('visibilitychange', hidden); root.removeEventListener('resize', resize); canvas.remove();
      }
    };
  }
  root.NeonInterfaceEffects = { create: create };
})(window);
