/* Original adaptive score and synthesised effects. No game-state or RNG dependencies. */
(function () {
  'use strict';

  if (window.NeonAudio) return;

  var AudioContextClass = window.AudioContext || window.webkitAudioContext;
  var context = null;
  var graph = null;
  var noiseBuffer = null;
  var unlocked = false;
  var disposed = false;
  var manuallySuspended = false;
  var pageSuspended = false;
  var muted = false;
  var timer = null;
  var nextStepTime = 0;
  var nextStep = 0;
  var resumeAttempt = null;
  var suspendAttempt = null;
  var voices = new Map();
  var scene = { state: 'menu', paused: true, modal: null, boss: false, combat: false, lowHealth: false };
  var profile = 'menu';
  var profileKey = '';
  var scheduledSteps = 0;
  var effectCount = 0;
  var seed = 0x4e454f4e;
  var beat = 60 / 86;
  var stepDuration = beat / 4;
  var chords = [38, 34, 41, 36, 38, 34, 43, 36];
  var melody = [0, null, 7, 10, null, 14, 7, null, 12, null, 10, 7, null, 3, 7, null];
  var profiles = {
    menu: [0.90, 0.12, 0.00, 0.30],
    explore: [0.77, 0.50, 0.23, 0.43],
    combat: [0.58, 0.88, 0.76, 0.72],
    boss: [0.65, 1.00, 1.00, 0.90],
    paused: [0.62, 0.10, 0.00, 0.20],
    over: [0.62, 0.00, 0.00, 0.05],
    win: [0.83, 0.12, 0.00, 0.34]
  };

  try { muted = localStorage.getItem('neon-depth-mute') === '1'; } catch (error) {}

  function random() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  }

  function frequency(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function gain(value) {
    var node = context.createGain();
    node.gain.value = value;
    return node;
  }

  function ramp(parameter, value, duration) {
    var now = context.currentTime;
    if (parameter.cancelAndHoldAtTime) parameter.cancelAndHoldAtTime(now);
    else {
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(parameter.value, now);
    }
    parameter.linearRampToValueAtTime(value, now + duration);
  }

  function createGraph() {
    context = new AudioContextClass({ latencyHint: 'interactive' });
    var master = gain(0);
    var limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -9;
    limiter.knee.value = 12;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.22;
    var analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    master.connect(limiter).connect(analyser).connect(context.destination);

    var music = gain(0.70);
    var effects = gain(0.82);
    music.connect(master);
    effects.connect(master);
    var stems = {};
    ['pad', 'bass', 'drums', 'lead', 'pulse'].forEach(function (name) {
      stems[name] = gain(0);
      stems[name].connect(music);
    });

    var reverb = context.createConvolver();
    var impulse = context.createBuffer(2, Math.ceil(context.sampleRate * 2.6), context.sampleRate);
    for (var channel = 0; channel < 2; channel++) {
      var data = impulse.getChannelData(channel);
      for (var sample = 0; sample < data.length; sample++) {
        var progress = sample / data.length;
        data[sample] = (random() * 2 - 1) * Math.pow(1 - progress, 3.8) * 0.35;
      }
    }
    reverb.buffer = impulse;
    var musicSend = gain(0.14);
    var effectSend = gain(0.08);
    var wet = gain(0.72);
    var reverbFilter = context.createBiquadFilter();
    reverbFilter.type = 'lowpass';
    reverbFilter.frequency.value = 4200;
    music.connect(musicSend).connect(reverb);
    effects.connect(effectSend).connect(reverb);
    reverb.connect(reverbFilter).connect(wet).connect(master);

    var delay = context.createDelay(2);
    delay.delayTime.value = beat * 0.75;
    var feedback = gain(0.27);
    var echoSend = gain(0.24);
    var echoReturn = gain(0.35);
    var echoFilter = context.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.value = 2400;
    stems.lead.connect(echoSend).connect(delay);
    delay.connect(echoFilter).connect(feedback).connect(delay);
    delay.connect(echoReturn).connect(music);

    noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    var noise = noiseBuffer.getChannelData(0);
    var previous = 0;
    for (var i = 0; i < noise.length; i++) {
      previous = previous * 0.35 + (random() * 2 - 1) * 0.65;
      noise[i] = previous;
    }
    graph = {
      master: master,
      music: music,
      effects: effects,
      stems: stems,
      analyser: analyser,
      feedback: feedback,
      reverb: reverb,
      impulse: impulse,
      musicSend: musicSend,
      effectSend: effectSend,
      reverbFilter: reverbFilter,
      delay: delay,
      echoSend: echoSend,
      echoFilter: echoFilter,
      echoReturn: echoReturn,
      nodes: [master, limiter, analyser, music, effects, reverb, musicSend, effectSend,
        wet, reverbFilter, delay, feedback, echoSend, echoReturn, echoFilter].concat(Object.keys(stems).map(function (name) { return stems[name]; }))
    };
    context.onstatechange = function () {
      if (context && context.state !== 'running') stopClock();
      else if (canPlay()) startClock();
    };
    applyProfile(true);
  }

  function track(source, nodes) {
    var live = true;
    function cleanup() {
      if (!live) return;
      live = false;
      source.onended = null;
      nodes.forEach(function (node) { node.disconnect(); });
      voices.delete(source);
    }
    source.onended = cleanup;
    voices.set(source, cleanup);
  }

  function envelope(node, time, duration, volume, attack, release) {
    var fadeIn = Math.min(attack || 0.006, duration * 0.4);
    var fadeOut = Math.min(release || duration * 0.65, duration - fadeIn);
    node.gain.setValueAtTime(0, time);
    node.gain.linearRampToValueAtTime(volume, time + fadeIn);
    node.gain.setValueAtTime(volume, time + duration - fadeOut);
    node.gain.exponentialRampToValueAtTime(0.00001, time + duration);
    node.gain.setValueAtTime(0, time + duration + 0.005);
  }

  function tone(destination, time, pitch, duration, volume, options) {
    options = options || {};
    var oscillator = context.createOscillator();
    var amplitude = gain(0);
    var nodes = [oscillator, amplitude];
    oscillator.type = options.type || 'sine';
    oscillator.frequency.setValueAtTime(Math.max(20, pitch), time);
    if (options.end) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.end), time + duration);
    if (options.detune) oscillator.detune.value = options.detune;
    var output = oscillator;
    if (options.cutoff) {
      var filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(options.cutoff, time);
      filter.Q.value = options.resonance || 0.7;
      if (options.filterEnd) filter.frequency.exponentialRampToValueAtTime(options.filterEnd, time + duration);
      output.connect(filter);
      output = filter;
      nodes.push(filter);
    }
    output.connect(amplitude);
    envelope(amplitude, time, duration, volume, options.attack, options.release);
    if (context.createStereoPanner && options.pan) {
      var panner = context.createStereoPanner();
      panner.pan.value = options.pan;
      amplitude.connect(panner).connect(destination);
      nodes.push(panner);
    } else amplitude.connect(destination);
    track(oscillator, nodes);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.015);
  }

  function noise(destination, time, duration, volume, cutoff, options) {
    options = options || {};
    var source = context.createBufferSource();
    var filter = context.createBiquadFilter();
    var amplitude = gain(0);
    source.buffer = noiseBuffer;
    source.loop = true;
    filter.type = options.type || 'highpass';
    filter.frequency.setValueAtTime(cutoff, time);
    filter.Q.value = options.resonance || 0.7;
    if (options.end) filter.frequency.exponentialRampToValueAtTime(options.end, time + duration);
    source.connect(filter).connect(amplitude).connect(destination);
    envelope(amplitude, time, duration, volume, options.attack, options.release);
    track(source, [source, filter, amplitude]);
    source.start(time, random() * 1.5);
    source.stop(time + duration + 0.015);
  }

  function bell(destination, time, note, duration, volume, pan) {
    var pitch = frequency(note);
    tone(destination, time, pitch, duration, volume, { type: 'sine', pan: pan, release: duration * 0.92 });
    tone(destination, time, pitch * 2.002, duration * 0.45, volume * 0.22, { type: 'sine', pan: pan });
    tone(destination, time, pitch * 3.01, duration * 0.23, volume * 0.08, { type: 'sine', pan: pan });
  }

  /* 1.0：按区域切换的五套配乐。每套有自己的速度、和声、旋律与环境声。 */
  var songs = {
    // 余烬酒吧 / 主菜单：慢、暖、带回声的钟音
    menu: { bpm: 86, chords: [38, 34, 41, 36, 38, 34, 43, 36], melody: [0, null, 7, 10, null, 14, 7, null, 12, null, 10, 7, null, 3, 7, null],
      bass: [0, 6, 8, 14], kick: [0, 8], snare: [4, 12], hat: 2, lead: 'bell', leadOct: 36, amb: 'rain' },
    // B1–B5 霓虹下城：合成器浪潮，十六分琶音，雨
    street: { bpm: 96, chords: [38, 38, 34, 36, 38, 41, 34, 33], melody: [12, null, 10, null, 7, null, 10, 12, null, 15, null, 14, 10, null, 7, null],
      bass: [0, 3, 6, 8, 11, 14], kick: [0, 6, 8], snare: [4, 12], hat: 2, lead: 'pluck', leadOct: 36, arp: [0, 7, 12, 15, 12, 7, 3, 7], amb: 'rain' },
    // B6–B10 冷冻数据港：稀疏、玻璃质感、长混响
    cold: { bpm: 72, chords: [33, 33, 29, 31, 33, 36, 29, 28], melody: [14, null, null, 12, null, null, 7, null, null, 10, null, null, 5, null, 7, null],
      bass: [0, 10], kick: [0], snare: [8], hat: 4, lead: 'glass', leadOct: 48, amb: 'wind' },
    // B11–B15 黑墙裂隙：弗里吉亚、失真低音、坏块噪声
    rift: { bpm: 108, chords: [40, 41, 40, 38, 40, 41, 43, 41], melody: [0, 1, null, 6, null, 5, 1, null, 0, null, 8, 6, null, 5, 1, null],
      bass: [0, 2, 4, 6, 8, 10, 12, 14], kick: [0, 3, 8, 11], snare: [4, 12], hat: 1, lead: 'saw', leadOct: 24, amb: 'drone', glitch: true },
    // B16 生产层：工业节拍、金属敲击
    plant: { bpm: 116, chords: [36, 36, 39, 34, 36, 36, 41, 39], melody: [0, null, 0, 3, null, 0, null, 7, 0, null, 0, 3, null, 10, 7, null],
      bass: [0, 2, 4, 6, 8, 10, 12, 14], kick: [0, 4, 8, 12], snare: [4, 12], hat: 2, lead: 'saw', leadOct: 24, amb: 'machine', clank: [6, 14] }
  };
  var song = songs.menu;
  var songName = 'menu';

  function setSong(name) {
    if (!songs[name] || name === songName) return;
    songName = name; song = songs[name];
    beat = 60 / song.bpm; stepDuration = beat / 4;
    nextStep = Math.ceil(nextStep / 32) * 32;
    if (graph && context) { try { graph.delay.delayTime.setTargetAtTime(beat * 0.75, context.currentTime, 0.2); } catch (error) {} }
  }

  function ambience(time, span) {
    var bus = graph.stems.pad;
    if (song.amb === 'rain') {
      noise(bus, time, span, 0.020, 5200, { type: 'highpass', attack: 0.5, release: 0.6 });
      noise(bus, time, span, 0.016, 320, { type: 'lowpass', attack: 0.6, release: 0.6 });
    } else if (song.amb === 'wind') {
      noise(bus, time, span, 0.034, 380, { type: 'bandpass', resonance: 2.2, end: 620, attack: span * 0.4, release: span * 0.4 });
      if (random() < 0.5) bell(graph.stems.lead, time + random() * span * 0.7, 93 + Math.floor(random() * 3) * 5, 2.4, 0.012, random() * 1.2 - 0.6);
    } else if (song.amb === 'drone') {
      tone(bus, time, 41.2, span, 0.05, { type: 'sawtooth', cutoff: 180, attack: 0.7, release: 0.7, detune: -9 });
      tone(bus, time, 41.2 * 1.498, span, 0.022, { type: 'sawtooth', cutoff: 240, attack: 0.9, release: 0.7, detune: 11 });
    } else if (song.amb === 'machine') {
      tone(bus, time, 50, span, 0.045, { type: 'square', cutoff: 220, attack: 0.4, release: 0.5 });
      noise(bus, time, span, 0.012, 1400, { type: 'bandpass', resonance: 5, attack: 0.4, release: 0.5 });
    }
  }

  function leadVoice(time, note, position) {
    var stems = graph.stems, pan = position % 4 < 2 ? -0.24 : 0.24;
    if (song.lead === 'bell') bell(stems.lead, time, note, beat * 1.3, 0.033, pan);
    else if (song.lead === 'glass') { bell(stems.lead, time, note, beat * 2.6, 0.026, pan); tone(stems.lead, time, frequency(note + 12), beat * 1.8, 0.006, { type: 'sine', attack: 0.05, pan: -pan }); }
    else if (song.lead === 'pluck') tone(stems.lead, time, frequency(note), beat * 0.55, 0.034, { type: 'sawtooth', cutoff: 3600, filterEnd: 500, resonance: 2.4, attack: 0.004, pan: pan });
    else tone(stems.lead, time, frequency(note), beat * 0.42, 0.036, { type: 'sawtooth', cutoff: 2100, filterEnd: 260, resonance: 5, attack: 0.004, pan: pan, detune: 7 });
  }

  function playStep(step, time) {
    var bar = Math.floor(step / 16);
    var position = step % 16;
    var root = song.chords[Math.floor(bar / 2) % song.chords.length];
    var stems = graph.stems;
    var hot = profile === 'boss' || profile === 'combat';

    if (position === 0 && bar % 2 === 0) {
      var minorSecond = songName === 'rift';
      [0, 7, minorSecond ? 13 : 10, minorSecond ? 15 : 14].forEach(function (interval, index) {
        var pitch = frequency(root + 12 + interval);
        var duration = beat * 8 + 0.75;
        tone(stems.pad, time, pitch, duration, 0.026, { type: 'triangle', detune: -5, cutoff: songName === 'cold' ? 1600 : 1000, attack: 0.8, release: 1.8, pan: -0.30 + index * 0.15 });
        tone(stems.pad, time, pitch, duration, 0.015, { type: 'sawtooth', detune: 5, cutoff: 510, attack: 1.1, release: 2.0, pan: 0.30 - index * 0.15 });
      });
      ambience(time, beat * 8 + 0.9);
    }

    if (song.bass.indexOf(position) >= 0) {
      var bassNote = root + (position === 14 ? 7 : position === 6 && songName === 'street' ? 12 : 0);
      var dense = song.bass.length > 6;
      tone(stems.bass, time, frequency(bassNote), beat * (dense ? 0.42 : 0.9), dense ? 0.085 : 0.115, { type: 'sine', attack: 0.012 });
      tone(stems.bass, time, frequency(bassNote + 12), beat * (dense ? 0.36 : 0.6), dense ? 0.04 : 0.033, { type: 'sawtooth', cutoff: dense ? 900 : 600, filterEnd: 110, resonance: dense ? 3 : 1.2, attack: 0.006 });
    }

    if (song.kick.indexOf(position) >= 0 || (profile === 'boss' && position === 11)) {
      tone(stems.drums, time, 135, 0.28, 0.19, { end: 43, release: 0.27 });
      noise(stems.drums, time, 0.025, 0.035, 1800);
    }
    if (song.snare.indexOf(position) >= 0) {
      noise(stems.drums, time, 0.16, 0.11, 1900, { type: 'bandpass', resonance: 0.7 });
      tone(stems.drums, time, 185, 0.08, 0.052, { end: 130 });
      noise(stems.drums, time + 0.018, 0.10, 0.038, 3700);
    }
    if (position % song.hat === 0 || profile === 'boss') {
      noise(stems.drums, time, position === 14 ? 0.12 : 0.045, position % 4 === 2 ? 0.032 : 0.019, 6500);
    }
    if (song.clank && song.clank.indexOf(position) >= 0) {
      tone(stems.drums, time, 620, 0.16, 0.04, { type: 'square', end: 590, cutoff: 2600 });
      tone(stems.drums, time, 931, 0.11, 0.022, { type: 'square', end: 900 });
    }
    if (song.glitch && position % 4 === 3 && random() < 0.3) noise(stems.drums, time, 0.05, 0.05, 2400 + random() * 3000, { type: 'bandpass', resonance: 9 });

    if (song.arp && (hot || bar % 4 >= 2)) {
      var arpNote = root + 24 + song.arp[position % song.arp.length];
      tone(stems.lead, time, frequency(arpNote), stepDuration * 0.9, 0.016, { type: 'square', cutoff: 2400, filterEnd: 700, attack: 0.003, pan: position % 2 ? 0.35 : -0.35 });
    }
    var interval = song.melody[(position + (bar % 2) * 4) % song.melody.length];
    if (interval !== null && (position % 2 === 0 || hot)) leadVoice(time, root + song.leadOct + interval, position);
    if (scene.lowHealth && !scene.paused && scene.state === 'play' && position % 8 === 0) {
      tone(stems.pulse, time, 62, 0.14, 0.07, { end: 42 });
      tone(stems.pulse, time + 0.19, 54, 0.12, 0.045, { end: 38 });
    }
  }

  function canPlay() {
    return !disposed && unlocked && !muted && !manuallySuspended && !pageSuspended && !document.hidden;
  }

  function schedule() {
    if (!canPlay() || !context || context.state !== 'running') return;
    var now = context.currentTime;
    if (nextStepTime < now - 0.12) {
      nextStep = Math.ceil(nextStep / 32) * 32;
      nextStepTime = now + 0.025;
    }
    while (nextStepTime < now + 0.13) {
      playStep(nextStep, nextStepTime);
      nextStep++;
      scheduledSteps++;
      nextStepTime += stepDuration;
    }
  }

  function startClock() {
    if (timer !== null || !canPlay() || !context || context.state !== 'running') return;
    nextStep = Math.ceil(nextStep / 32) * 32;
    nextStepTime = context.currentTime + 0.035;
    ramp(graph.master.gain, 0.82, 0.16);
    ramp(graph.feedback.gain, 0.27, 0.10);
    timer = setInterval(schedule, 40);
    schedule();
  }

  function stopClock() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  function stopVoices() {
    if (!context) return;
    voices.forEach(function (cleanup, source) {
      try { source.stop(); } catch (error) {}
      cleanup();
    });
  }

  function clearTails() {
    graph.musicSend.disconnect();
    graph.effectSend.disconnect();
    graph.reverb.disconnect();
    var reverb = context.createConvolver();
    reverb.buffer = graph.impulse;
    graph.musicSend.connect(reverb);
    graph.effectSend.connect(reverb);
    reverb.connect(graph.reverbFilter);
    graph.nodes[graph.nodes.indexOf(graph.reverb)] = reverb;
    graph.reverb = reverb;

    graph.echoSend.disconnect();
    graph.delay.disconnect();
    graph.feedback.disconnect();
    var delay = context.createDelay(2);
    delay.delayTime.value = beat * 0.75;
    graph.echoSend.connect(delay);
    delay.connect(graph.echoFilter);
    graph.feedback.connect(delay);
    delay.connect(graph.echoReturn);
    graph.nodes[graph.nodes.indexOf(graph.delay)] = delay;
    graph.delay = delay;
  }

  function stopPlayback() {
    var hadPlayback = timer !== null || voices.size > 0;
    stopClock();
    if (!context || context.state === 'closed') return;
    graph.master.gain.cancelScheduledValues(0);
    graph.master.gain.value = 0;
    graph.feedback.gain.cancelScheduledValues(0);
    graph.feedback.gain.value = 0;
    stopVoices();
    if (hadPlayback && !disposed) clearTails();
    if (context.state !== 'suspended' && !suspendAttempt) {
      suspendAttempt = context.suspend().catch(function () {}).then(function () {
        suspendAttempt = null;
        if (canPlay()) reconcile();
      });
    }
  }

  function reconcile() {
    if (!canPlay()) {
      stopPlayback();
      return Promise.resolve(false);
    }
    if (!AudioContextClass) return Promise.resolve(false);
    if (!context) {
      try { createGraph(); } catch (error) { return Promise.resolve(false); }
    }
    if (suspendAttempt) return suspendAttempt.then(reconcile);
    if (context.state === 'running') {
      startClock();
      return Promise.resolve(true);
    }
    if (resumeAttempt) return resumeAttempt;
    resumeAttempt = context.resume().then(function () {
      if (!canPlay()) {
        stopPlayback();
        return false;
      }
      startClock();
      return context.state === 'running';
    }).catch(function () { return false; }).then(function (result) {
      resumeAttempt = null;
      return result;
    });
    return resumeAttempt;
  }

  function unlock() {
    if (disposed) return Promise.resolve(false);
    unlocked = true;
    return reconcile();
  }

  function setMuted(value) {
    var next = !!value;
    if (next === muted) return;
    muted = next;
    reconcile();
  }

  function applyProfile(immediate) {
    if (!graph) return;
    var values = profiles[profile];
    ['pad', 'bass', 'drums', 'lead'].forEach(function (name, index) {
      if (immediate) graph.stems[name].gain.value = values[index];
      else ramp(graph.stems[name].gain, values[index], 0.65);
    });
    var pulse = scene.lowHealth && !scene.paused && scene.state === 'play' ? 0.8 : 0;
    if (immediate) graph.stems.pulse.gain.value = pulse;
    else ramp(graph.stems.pulse.gain, pulse, 0.5);
  }

  function setScene(value) {
    value = value || {};
    scene = {
      state: value.state || 'menu',
      paused: !!value.paused,
      modal: value.modal || null,
      boss: !!value.boss,
      combat: !!value.combat,
      lowHealth: !!value.lowHealth
    };
    setSong(scene.state === 'play' ? (value.zone || 'street') : 'menu');
    if (scene.state === 'play') profile = scene.paused || scene.modal ? 'paused' : scene.boss ? 'boss' : scene.combat ? 'combat' : 'explore';
    else profile = scene.state === 'win' ? 'win' : scene.state === 'over' ? 'over' : 'menu';
    var key = profile + '/' + scene.lowHealth;
    if (key === profileKey) return;
    profileKey = key;
    applyProfile(false);
  }

  function effect(callback) {
    if (!canPlay() || !context || context.state !== 'running') return;
    effectCount++;
    callback(context.currentTime + 0.004, graph.effects);
  }

  var sfx = {
    step: function () {
      effect(function (time, bus) {
        noise(bus, time, 0.045, 0.035, 760, { type: 'bandpass' });
        tone(bus, time, 150, 0.055, 0.035, { end: 95 });
      });
    },
    bump: function () {
      effect(function (time, bus) {
        tone(bus, time, 92, 0.10, 0.075, { type: 'triangle', end: 46 });
        noise(bus, time, 0.045, 0.03, 600, { type: 'lowpass' });
      });
    },
    hit: function () {
      effect(function (time, bus) {
        noise(bus, time, 0.095, 0.14, 2100, { type: 'bandpass', end: 650 });
        tone(bus, time, 210, 0.12, 0.11, { type: 'triangle', end: 62 });
        tone(bus, time, 840, 0.055, 0.033, { type: 'sine', end: 370 });
      });
    },
    hurt: function () {
      effect(function (time, bus) {
        tone(bus, time, 145, 0.24, 0.14, { type: 'sawtooth', end: 45, cutoff: 900, filterEnd: 150 });
        noise(bus, time, 0.17, 0.13, 950, { type: 'bandpass', end: 310 });
      });
    },
    pick: function () {
      effect(function (time, bus) {
        bell(bus, time, 81, 0.22, 0.075, -0.10);
        bell(bus, time + 0.065, 88, 0.32, 0.065, 0.10);
      });
    },
    level: function () {
      effect(function (time, bus) {
        [62, 69, 74, 77, 81].forEach(function (note, index) { bell(bus, time + index * 0.085, note, 0.63, 0.075, (index - 2) * 0.12); });
        noise(bus, time, 0.48, 0.035, 1200, { type: 'highpass', end: 7200, attack: 0.16 });
      });
    },
    stairs: function () {
      effect(function (time, bus) {
        noise(bus, time, 0.65, 0.075, 2800, { type: 'bandpass', end: 180, attack: 0.12 });
        tone(bus, time, 330, 0.60, 0.07, { type: 'triangle', end: 82, attack: 0.06 });
        bell(bus, time + 0.1, 74, 0.55, 0.045, 0);
      });
    },
    death: function () {
      effect(function (time, bus) {
        tone(bus, time, 110, 1.5, 0.15, { type: 'sawtooth', end: 28, cutoff: 700, filterEnd: 65, attack: 0.02 });
        [74, 69, 65, 62].forEach(function (note, index) { bell(bus, time + index * 0.14, note, 0.8, 0.045, 0); });
        noise(bus, time, 0.75, 0.10, 950, { type: 'lowpass', end: 90, attack: 0.03 });
      });
    },
    win: function () {
      effect(function (time, bus) {
        [62, 65, 69, 74, 77, 81, 86].forEach(function (note, index) { bell(bus, time + index * 0.115, note, 1.05, 0.075, (index - 3) * 0.10); });
        [50, 57, 62].forEach(function (note) { tone(bus, time + 0.3, frequency(note), 1.4, 0.04, { type: 'triangle', attack: 0.2, release: 0.8 }); });
      });
    },
    turret: function () {
      effect(function (time, bus) {
        tone(bus, time, 1400, 0.12, 0.085, { type: 'sawtooth', end: 180, cutoff: 3100, filterEnd: 420 });
        noise(bus, time, 0.045, 0.09, 3200);
        tone(bus, time, 100, 0.09, 0.065, { end: 40 });
      });
    },
    ach: function () {
      effect(function (time, bus) {
        [74, 81, 86, 89].forEach(function (note, index) { bell(bus, time + index * 0.09, note, 0.75, 0.07, index % 2 ? 0.2 : -0.2); });
      });
    },
    crit: function () {
      effect(function (time, bus) {
        noise(bus, time, 0.12, 0.16, 3200, { type: 'bandpass', end: 500, resonance: 1.4 });
        tone(bus, time, 520, 0.16, 0.12, { type: 'sawtooth', end: 70, cutoff: 2600, filterEnd: 300 });
        bell(bus, time + 0.02, 93, 0.3, 0.05, 0.15);
      });
    },
    gun: function () {
      effect(function (time, bus) {
        noise(bus, time, 0.07, 0.17, 1500, { type: 'bandpass', end: 320, resonance: 0.9 });
        tone(bus, time, 310, 0.09, 0.10, { type: 'square', end: 55, cutoff: 1800 });
        noise(bus, time + 0.05, 0.16, 0.035, 900, { type: 'lowpass', end: 200 });
      });
    },
    blade: function () {
      effect(function (time, bus) {
        noise(bus, time, 0.14, 0.11, 2600, { type: 'bandpass', end: 7800, resonance: 3.2, attack: 0.03 });
        tone(bus, time + 0.05, 1900, 0.10, 0.03, { type: 'sine', end: 3600 });
      });
    },
    coin: function () {
      effect(function (time, bus) { bell(bus, time, 91, 0.16, 0.05, -0.1); bell(bus, time + 0.055, 98, 0.26, 0.05, 0.1); });
    },
    shield: function () {
      effect(function (time, bus) {
        tone(bus, time, 220, 0.34, 0.07, { type: 'triangle', end: 660, attack: 0.03 });
        noise(bus, time, 0.3, 0.04, 2800, { type: 'bandpass', end: 5200, resonance: 4, attack: 0.08 });
      });
    },
    glitch: function () {
      effect(function (time, bus) {
        for (var k = 0; k < 5; k++) tone(bus, time + k * 0.035, 180 + random() * 1800, 0.03, 0.05, { type: 'square', cutoff: 3000 });
        noise(bus, time, 0.2, 0.06, 1200, { type: 'bandpass', resonance: 8 });
      });
    },
    door: function () {
      effect(function (time, bus) {
        tone(bus, time, 70, 0.5, 0.12, { type: 'sawtooth', end: 38, cutoff: 400, attack: 0.02 });
        noise(bus, time, 0.42, 0.08, 700, { type: 'lowpass', end: 120, attack: 0.02 });
        tone(bus, time + 0.36, 48, 0.2, 0.14, { end: 30 });
      });
    },
    quest: function () {
      effect(function (time, bus) {
        [69, 74, 81].forEach(function (note, index) { bell(bus, time + index * 0.10, note, 0.50, 0.075, 0); });
      });
    }
  };

  function beep(pitch, duration, type, volume, slide) {
    if (!Number.isFinite(pitch) || !Number.isFinite(duration) || duration <= 0) return;
    effect(function (time, bus) {
      tone(bus, time, pitch, Math.min(duration, 8), Math.min(Math.max(volume || 0.04, 0.001), 0.35), {
        type: ['sine', 'square', 'sawtooth', 'triangle'].indexOf(type) >= 0 ? type : 'square',
        end: slide ? Math.max(40, pitch + slide) : 0,
        cutoff: type === 'square' || type === 'sawtooth' ? 4200 : 0
      });
    });
  }

  function suspend() {
    manuallySuspended = true;
    stopPlayback();
  }

  function resume() {
    manuallySuspended = false;
    return reconcile();
  }

  function visibilityChanged() { reconcile(); }
  function pageHidden() { pageSuspended = true; stopPlayback(); }
  function pageShown() { pageSuspended = false; reconcile(); }

  function snapshot() {
    var peak = 0;
    var rms = 0;
    if (graph && context.state === 'running' && canPlay()) {
      var samples = new Float32Array(graph.analyser.fftSize);
      graph.analyser.getFloatTimeDomainData(samples);
      for (var i = 0; i < samples.length; i++) {
        peak = Math.max(peak, Math.abs(samples[i]));
        rms += samples[i] * samples[i];
      }
      rms = Math.sqrt(rms / samples.length);
    }
    return {
      supported: !!AudioContextClass,
      unlocked: unlocked,
      muted: muted,
      disposed: disposed,
      contextState: context ? context.state : 'uninitialized',
      schedulerActive: timer !== null,
      activeVoices: voices.size,
      profile: profile,
      lowHealth: scene.lowHealth,
      scheduledSteps: scheduledSteps,
      effectCount: effectCount,
      nextStep: nextStep,
      nextStepTime: nextStepTime,
      currentTime: context ? context.currentTime : 0,
      masterGain: graph ? graph.master.gain.value : 0,
      peak: peak,
      rms: rms
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stopPlayback();
    document.removeEventListener('pointerdown', unlock, true);
    document.removeEventListener('keydown', unlock, true);
    document.removeEventListener('touchstart', unlock, true);
    document.removeEventListener('visibilitychange', visibilityChanged);
    window.removeEventListener('pagehide', pageHidden);
    window.removeEventListener('pageshow', pageShown);
    if (context) {
      context.onstatechange = null;
      graph.nodes.forEach(function (node) { node.disconnect(); });
      if (context.state !== 'closed') context.close().catch(function () {});
    }
  }

  document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  document.addEventListener('keydown', unlock, true);
  document.addEventListener('touchstart', unlock, { capture: true, passive: true });
  document.addEventListener('visibilitychange', visibilityChanged);
  window.addEventListener('pagehide', pageHidden);
  window.addEventListener('pageshow', pageShown);

  window.NeonAudio = {
    unlock: unlock,
    setMuted: setMuted,
    setScene: setScene,
    sfx: sfx,
    beep: beep,
    suspend: suspend,
    resume: resume,
    snapshot: snapshot,
    dispose: dispose
  };
})();
