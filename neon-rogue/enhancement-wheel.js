/* Visual-only roulette. The caller determines and commits the real outcome first. */
(function (root) {
  'use strict';
  var fullTurn = Math.PI * 2;
  var mounted = new WeakMap();

  function normalize(angle) {
    return ((angle % fullTurn) + fullTurn) % fullTurn;
  }

  function sectorAt(rate, rotation) {
    return normalize(-rotation) < rate * fullTurn;
  }

  function plan(rate, success, index, start) {
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) throw new RangeError('Invalid enhancement rate');
    if ((success && rate === 0) || (!success && rate === 1)) throw new RangeError('Outcome has no sector');
    var fraction = .35 + ((index * 7) % 11) * .03;
    var local = success ? rate * fraction : rate + (1 - rate) * fraction;
    var target = normalize(-local * fullTurn);
    var delta = normalize(target - normalize(start));
    var turns = 4 + index % 2;
    return { start: start, end: start + turns * fullTurn + delta, landing: local * fullTurn };
  }

  function annulus(ctx, cx, cy, outer, inner, from, to, fill) {
    ctx.beginPath();
    ctx.arc(cx, cy, outer, from, to);
    ctx.arc(cx, cy, inner, to, from, true);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function disk(canvas, rate) {
    var scale = root.devicePixelRatio || 1;
    canvas.width = Math.round(224 * scale);
    canvas.height = Math.round(224 * scale);
    var ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    var start = -Math.PI / 2;
    var boundary = start + rate * fullTurn;
    var success = ctx.createRadialGradient(112, 112, 59, 112, 112, 94);
    success.addColorStop(0, '#124f51');
    success.addColorStop(.55, '#25c9c4');
    success.addColorStop(1, '#82ffe0');
    var failure = ctx.createRadialGradient(112, 112, 59, 112, 112, 94);
    failure.addColorStop(0, '#5a172b');
    failure.addColorStop(.55, '#df385c');
    failure.addColorStop(1, '#ff8b88');
    if (rate > 0) annulus(ctx, 112, 112, 94, 59, start, boundary, success);
    if (rate < 1) annulus(ctx, 112, 112, 94, 59, boundary, start + fullTurn, failure);
    ctx.strokeStyle = 'rgba(5,13,20,.58)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 40; i++) {
      var angle = start + i * fullTurn / 40;
      ctx.beginPath();
      ctx.moveTo(112 + Math.cos(angle) * 61, 112 + Math.sin(angle) * 61);
      ctx.lineTo(112 + Math.cos(angle) * 92, 112 + Math.sin(angle) * 92);
      ctx.stroke();
    }
    // The two sector boundaries use their exact probability angles.
    ctx.strokeStyle = '#08111a';
    ctx.lineWidth = 2;
    [start, boundary].forEach(function (angle) {
      ctx.beginPath();
      ctx.moveTo(112 + Math.cos(angle) * 59, 112 + Math.sin(angle) * 59);
      ctx.lineTo(112 + Math.cos(angle) * 94, 112 + Math.sin(angle) * 94);
      ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(230,255,247,.6)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(112, 112, 91, 0, fullTurn); ctx.stroke();
  }

  function frame(canvas) {
    var scale = root.devicePixelRatio || 1;
    canvas.width = Math.round(224 * scale);
    canvas.height = Math.round(224 * scale);
    var ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    var metal = ctx.createLinearGradient(20, 0, 200, 224);
    metal.addColorStop(0, '#f7d6a3'); metal.addColorStop(.22, '#6f563d');
    metal.addColorStop(.5, '#c99b68'); metal.addColorStop(.75, '#453f38'); metal.addColorStop(1, '#e8bd83');
    annulus(ctx, 112, 112, 108, 96, 0, fullTurn, metal);
    annulus(ctx, 112, 112, 106, 98, 0, fullTurn, '#18222b');
    for (var i = 0; i < 60; i++) {
      var angle = -Math.PI / 2 + i * fullTurn / 60;
      var inner = i % 5 === 0 ? 98 : 101;
      ctx.beginPath();
      ctx.moveTo(112 + Math.cos(angle) * inner, 112 + Math.sin(angle) * inner);
      ctx.lineTo(112 + Math.cos(angle) * 105, 112 + Math.sin(angle) * 105);
      ctx.strokeStyle = i % 5 === 0 ? '#ebc99a' : '#77828a';
      ctx.lineWidth = i % 5 === 0 ? 1.6 : .8;
      ctx.stroke();
    }
    var cap = ctx.createRadialGradient(94, 88, 5, 112, 112, 58);
    cap.addColorStop(0, '#203542'); cap.addColorStop(.65, '#0b1924'); cap.addColorStop(1, '#050d15');
    ctx.beginPath(); ctx.arc(112, 112, 57, 0, fullTurn); ctx.fillStyle = cap; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#b18b60'; ctx.stroke();
    ctx.beginPath(); ctx.arc(112, 112, 52, 0, fullTurn); ctx.strokeStyle = '#283d4b'; ctx.lineWidth = 1; ctx.stroke();
    for (var n = 0; n < 4; n++) {
      var a = Math.PI / 4 + n * Math.PI / 2;
      var x = 112 + Math.cos(a) * 101, y = 112 + Math.sin(a) * 101;
      ctx.beginPath(); ctx.arc(x, y, 2.8, 0, fullTurn); ctx.fillStyle = '#d5b384'; ctx.fill();
      ctx.strokeStyle = '#332f29'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 1.4, y - 1.4); ctx.lineTo(x + 1.4, y + 1.4); ctx.stroke();
    }
  }

  function effects(canvas, accent) {
    var scale = root.devicePixelRatio || 1;
    canvas.width = Math.round(280 * scale);
    canvas.height = Math.round(280 * scale);
    var ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    var colors = ['#22e6ff', '#ff4fd8', '#ffe77d', accent];

    function clear() { ctx.clearRect(0, 0, 280, 280); }

    function arc(radius, start, length, color, width, opacity) {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = width;
      ctx.beginPath(); ctx.arc(0, 0, radius, start, start + length); ctx.stroke();
    }

    function strike(intensity, color) {
      ctx.globalAlpha = intensity;
      ctx.shadowBlur = 18;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (var ray = 0; ray < 6; ray++) {
        var angle = ray * Math.PI / 3;
        var length = ray % 2 ? 8 : 15;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 3, -80 + Math.sin(angle) * 3);
        ctx.lineTo(Math.cos(angle) * length, -80 + Math.sin(angle) * length);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, -80, 3.5, 0, fullTurn); ctx.fill();
    }

    function charge(progress, rotation) {
      clear();
      ctx.save(); ctx.translate(140, 140); ctx.globalCompositeOperation = 'lighter';
      var beatPosition = progress * 10;
      var pulse = Math.pow(1 - (beatPosition % 1), 5);
      var beat = Math.min(9, Math.floor(beatPosition));
      var color = colors[beat % colors.length];
      for (var band = 0; band < 3; band++) {
        var start = -Math.PI / 2 + rotation * (0.46 + band * .13) + band * fullTurn / 3;
        arc(101 + band * 7, start, .65 + progress * .35, colors[(beat + band) % colors.length], 1.2 + pulse * 1.8, .45 + pulse * .45);
        arc(101 + band * 7, start - .22, .15, '#ffffff', 1, .2 + pulse * .5);
      }
      for (var tick = 0; tick < 60; tick++) {
        var theta = -Math.PI / 2 + tick * fullTurn / 60;
        var proximity = Math.pow(Math.max(0, Math.cos(theta - rotation * .7)), 18);
        ctx.globalAlpha = proximity * (.4 + pulse * .6);
        ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8;
        ctx.lineWidth = tick % 5 ? 1 : 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(theta) * 98, Math.sin(theta) * 98);
        ctx.lineTo(Math.cos(theta) * 106, Math.sin(theta) * 106);
        ctx.stroke();
      }
      for (var bolt = 0; bolt < 3; bolt++) {
        var base = rotation * .32 + bolt * fullTurn / 3;
        ctx.globalAlpha = .25 + pulse * .7;
        ctx.strokeStyle = colors[(beat + bolt + 1) % colors.length];
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 14; ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (var point = 0; point < 9; point++) {
          var theta = base + point * .055;
          var radius = 115 + Math.sin(point * 2.7 + beat * 1.3 + bolt) * (2 + pulse * 5);
          var x = Math.cos(theta) * radius, y = Math.sin(theta) * radius;
          if (!point) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      strike(pulse * .9, color);
      ctx.restore();
    }

    function result(success, elapsed) {
      clear();
      var progress = Math.min(1, elapsed / 780);
      var burst = 1 - Math.pow(1 - progress, 3);
      var fade = Math.pow(1 - progress, 1.8);
      var flash = Math.max(0, 1 - elapsed / 115);
      var echo = Math.max(0, 1 - Math.abs(elapsed - 175) / 80) * .45;
      var palette = success ? ['#ffffff', '#57ffa8', '#ffe77d', '#22e6ff'] : ['#ffffff', '#ff4d5e', '#ff40c8', '#ff9a53'];
      ctx.save(); ctx.translate(140, 140); ctx.globalCompositeOperation = 'lighter';
      arc(78 + burst * 45, -Math.PI / 2, fullTurn, palette[1], 1 + flash * 5, fade * .85);
      arc(87 + burst * 25, -Math.PI / 2 + progress, fullTurn, palette[2], 1 + echo * 5, fade * .65);
      arc(96, -Math.PI / 2, fullTurn, palette[0], 3, flash * .8 + echo);
      for (var particle = 0; particle < 20; particle++) {
        var theta = particle * 2.399963 + (success ? .4 : .9);
        var speed = 21 + (particle % 5) * 5;
        var radius = 80 + burst * speed;
        var trail = radius - 6 - (1 - burst) * 12;
        ctx.strokeStyle = palette[particle % palette.length];
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10;
        ctx.globalAlpha = fade * (.4 + (particle % 3) * .25);
        ctx.lineWidth = particle % 3 ? 1.2 : 2.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(theta) * trail, Math.sin(theta) * trail);
        ctx.lineTo(Math.cos(theta) * radius, Math.sin(theta) * radius);
        ctx.stroke();
      }
      if (!success) {
        for (var crack = 0; crack < 5; crack++) {
          var angle = crack * fullTurn / 5 + .35;
          ctx.globalAlpha = fade * (.45 + flash * .5);
          ctx.strokeStyle = palette[2]; ctx.shadowColor = palette[2]; ctx.shadowBlur = 12; ctx.lineWidth = 2;
          ctx.beginPath();
          for (var step = 0; step < 5; step++) {
            var radius = 65 + step * 13;
            var offset = Math.sin(step * 3 + crack) * .09;
            var x = Math.cos(angle + offset) * radius, y = Math.sin(angle + offset) * radius;
            if (!step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      strike(Math.max(flash, echo), palette[2]);
      ctx.restore();
    }

    return { clear: clear, charge: charge, result: result };
  }

  function create(stage, rate, options) {
    var prior = mounted.get(stage);
    if (prior) prior.destroy();
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) throw new RangeError('Invalid enhancement rate');
    var old = stage.querySelector('.forge-ring');
    if (old) old.remove();
    var element = document.createElement('div');
    element.className = 'enhancement-wheel';
    element.setAttribute('aria-hidden', 'true');
    var spinning = document.createElement('canvas');
    spinning.className = 'enhancement-wheel-disk';
    var fixed = document.createElement('canvas');
    fixed.className = 'enhancement-wheel-frame';
    var energy = document.createElement('canvas');
    energy.className = 'enhancement-wheel-effects';
    var needle = document.createElement('i');
    needle.className = 'enhancement-wheel-pointer';
    element.append(spinning, fixed, energy, needle);
    stage.prepend(element);
    stage.classList.add('has-enhancement-wheel');
    disk(spinning, rate);
    frame(fixed);
    var accent = root.getComputedStyle(stage).getPropertyValue('--fq').trim() || '#57ffa8';
    var visual = effects(energy, accent);
    var angle = 0, frameId = 0, effectFrame = 0, index = 0, running = false, observer = null;
    var generation = 0, phase = 'idle';

    function setPhase(value) {
      phase = value;
      stage.dataset.enhancementPhase = value;
    }

    function cleanup() {
      generation++;
      if (frameId) root.cancelAnimationFrame(frameId);
      if (effectFrame) root.cancelAnimationFrame(effectFrame);
      frameId = 0;
      effectFrame = 0;
      if (observer) observer.disconnect();
      observer = null;
      running = false;
      element.classList.remove('spinning', 'settling');
      visual.clear();
      if (mounted.get(stage) === api) {
        stage.classList.remove('charging');
        setPhase('idle');
      }
    }

    function observeRemoval() {
      observer = new MutationObserver(function () {
        if (!stage.isConnected || !element.isConnected) cleanup();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    function settle(success) {
      var started = root.performance.now(), token = generation;
      element.classList.add('settling');
      setPhase(success ? 'success' : 'fail');
      visual.result(success, 0);
      observeRemoval();
      function tick(time) {
        effectFrame = 0;
        if (token !== generation) return;
        if (!stage.isConnected || !element.isConnected) { cleanup(); return; }
        var elapsed = Math.max(0, time - started);
        if (elapsed >= 780) { cleanup(); return; }
        visual.result(success, elapsed);
        effectFrame = root.requestAnimationFrame(tick);
      }
      effectFrame = root.requestAnimationFrame(tick);
    }

    function rotate(value) {
      angle = value;
      spinning.style.transform = 'rotate(' + value + 'rad)';
    }

    function spin(success, duration, onDone) {
      if (running || !stage.isConnected || !element.isConnected || mounted.get(stage) !== api) return false;
      var motion = plan(rate, !!success, index++, angle);
      var milliseconds = Number.isFinite(duration) ? Math.max(0, duration) : 2800;
      cleanup();
      var started = root.performance.now();
      var token = generation, lastPulse = -1;
      running = true;
      stage.classList.add('charging');
      setPhase(milliseconds ? 'spin' : 'reduced');
      element.classList.add('spinning');
      element.style.setProperty('--wheel-beat', milliseconds / 10 + 'ms');
      delete element.dataset.result;
      function finish() {
        if (token !== generation || !running) return;
        rotate(motion.end);
        cleanup();
        if (!stage.isConnected || !element.isConnected) return;
        element.dataset.result = success ? 'success' : 'fail';
        var completed = generation;
        if (typeof onDone === 'function') onDone(!!success);
        if (milliseconds && completed === generation && mounted.get(stage) === api && stage.isConnected && element.isConnected) settle(!!success);
      }
      if (!milliseconds) { finish(); return true; }
      observeRemoval();
      visual.charge(0, angle);
      function tick(time) {
        frameId = 0;
        if (token !== generation) return;
        if (!stage.isConnected || !element.isConnected) { cleanup(); return; }
        var progress = Math.min(1, Math.max(0, (time - started) / milliseconds));
        // Positive angular velocity decays continuously to zero.
        var eased = 1 - Math.pow(1 - progress, 4);
        rotate(motion.start + (motion.end - motion.start) * eased);
        visual.charge(progress, angle);
        var pulse = Math.min(9, Math.floor(progress * 10));
        if (pulse > lastPulse) {
          lastPulse = pulse;
          if (options && typeof options.onPulse === 'function') {
            try { options.onPulse(progress); } catch (error) { root.console.error(error); }
          }
        }
        if (token !== generation) return;
        if (progress >= 1) finish();
        else frameId = root.requestAnimationFrame(tick);
      }
      frameId = root.requestAnimationFrame(tick);
      return true;
    }

    var api = {
      spin: spin,
      cancel: cleanup,
      destroy: function () {
        cleanup(); element.remove();
        if (mounted.get(stage) === api) { stage.classList.remove('has-enhancement-wheel'); delete stage.dataset.enhancementPhase; mounted.delete(stage); }
      },
      snapshot: function () { return { rate: rate, rotation: angle, running: running, successAtPointer: sectorAt(rate, angle), pendingFrame: !!frameId, pendingEffects: !!effectFrame, phase: phase }; }
    };
    mounted.set(stage, api);
    setPhase('idle');
    return api;
  }

  var api = { create: create, plan: plan, sectorAt: sectorAt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NeonEnhancementWheel = api;
})(typeof window === 'undefined' ? globalThis : window);
