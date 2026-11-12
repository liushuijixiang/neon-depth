/* Nine turn-based bosses. Geometry, mitigation, production limits and saves remain engine-owned. */
(function (root) {
  'use strict';

  var ids = ['bl_hound', 'bl_hive', 'bl_warden', 'bl_lance', 'bl_mine', 'bl_mirror', 'bh_eye', 'bh_hive', 'bh_phase'];
  var phaseNames = ['实体重刃', '时间回声 · 足迹重放', '裂隙降临 · 自身回卷'];
  var phaseMessages = ['实体：重刃蓄势', '时间：最近足迹两拍后重放', '裂隙：自身轨迹回卷'];

  function create(game, hooks) {
    function handles(enemy) { return !!(enemy && enemy.boss && ids.indexOf(enemy.id) >= 0); }
    function distance(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
    function cell(value) { return { x: value.x, y: value.y }; }
    function alive(enemy) { return enemy.hp > 0 && game.state === 'play' && hooks.alive(enemy); }
    function player() { return hooks.player(); }

    function state(enemy) {
      enemy.brain = enemy.brain || { stage: 0, plate: 100, step: 0 };
      if (!enemy.brain.combat) enemy.brain.combat = { cooldowns: {}, history: [], form: -1, actions: {}, age: 0 };
      return enemy.brain.combat;
    }

    function phase(enemy) { return Math.max(0, Math.min(3, enemy.brain.stage || 0)); }
    function power(enemy, factor, flat) { return Math.max(1, Math.round((enemy.atk * factor + (flat || 0)) * Math.pow(1.2, phase(enemy)))); }
    function ready(enemy, key) { return !(state(enemy).cooldowns[key] > 0); }
    function cooldown(enemy, key, turns) { state(enemy).cooldowns[key] = turns; }

    function action(enemy, key) {
      var data = state(enemy);
      data.lastAction = key;
      data.actions[key] = (data.actions[key] || 0) + 1;
    }

    function effect(enemy, kind, options) {
      if (!hooks.effect) return;
      hooks.effect(kind, Object.assign({ owner: enemy.uid, team: 'enemy', color: enemy.color,
        origin: cell(enemy), life: 300 }, options || {}));
    }

    function clear(enemy) {
      if (!handles(enemy)) return;
      var uid = enemy.uid;
      game.hazards = (game.hazards || []).filter(function (field) { return field.ownerId !== uid && field.sourceUid !== uid; });
      (game.enemies || []).slice().forEach(function (child) {
        if (child !== enemy && child.structure && child.ownerId === uid) {
          if (hooks.removeStructure) hooks.removeStructure(child);
          else { child.hp = 0; game.enemies = game.enemies.filter(function (other) { return other !== child; }); }
        }
      });
      enemy.intent = null;
      enemy.phaseT = 0;
      if (hooks.clearEffects) hooks.clearEffects(uid);
    }

    function available(x, y, enemy) {
      return hooks.floor(x, y) && !hooks.wallAt(x, y) && !hooks.occupied(x, y, enemy);
    }

    function approach(enemy, dist, steps) {
      var from = cell(enemy), target = player();
      for (var i = 0; i < steps && distance(enemy, target) > 1; i++) hooks.toward(enemy, dist);
      if (from.x !== enemy.x || from.y !== enemy.y) {
        effect(enemy, 'dash', { origin: from, target: cell(enemy), life: 220 });
        if (enemy.id === 'bl_warden' && hooks.heat) hooks.heat(enemy, 18);
      }
    }

    function strafe(enemy, target, dist, steps, preferred, minimum) {
      var before = cell(enemy);
      if (distance(enemy, target) < (minimum || 3)) {
        for (var i = 0; i < steps; i++) hooks.away(enemy, dist);
      } else if (distance(enemy, target) > preferred || !hooks.los(enemy.x, enemy.y, target.x, target.y)) approach(enemy, dist, steps);
      else {
        var direction = (state(enemy).age % 8 < 4 ? 1 : -1);
        for (var move = 0; move < steps; move++) {
          var dx = Math.sign(target.x - enemy.x), dy = Math.sign(target.y - enemy.y);
          var candidates = [{ x: enemy.x - dy * direction, y: enemy.y + dx * direction },
            { x: enemy.x + dy * direction, y: enemy.y - dx * direction }];
          var next = candidates.find(function (position) {
            return available(position.x, position.y, enemy) && distance(position, target) >= 3 &&
              hooks.los(position.x, position.y, target.x, target.y);
          });
          if (next) { enemy.x = next.x; enemy.y = next.y; }
        }
      }
      if (before.x !== enemy.x || before.y !== enemy.y) effect(enemy, 'dash', { origin: before, target: cell(enemy), life: 230 });
    }

    function visibleArea(origin, radius, inner) {
      return hooks.area(origin.x, origin.y, radius, inner || 0).filter(function (position) {
        return !hooks.wallAt(position.x, position.y) && hooks.los(origin.x, origin.y, position.x, position.y);
      });
    }

    function annihilationArea(enemy) {
      return visibleArea(enemy, Math.max(game.map.length, game.map[0].length), 3);
    }

    function impact(enemy, cells, amount, kind, armor, options) {
      if (!alive(enemy)) return;
      effect(enemy, kind, Object.assign({ cells: cells, radius: 2, shake: amount >= enemy.atk * 1.5 ? 5 : 2 }, options || {}));
      hooks.impact(enemy, cells, amount, options && options.damageKind || kind, armor == null ? 1 : armor);
    }

    function shot(source, target, range, mirrors) {
      var ray = hooks.ray(source, target.x, target.y, range, mirrors || []);
      var points = [];
      (ray.segments || []).forEach(function (segment) {
        if (!points.length) points.push({ x: segment.x0 - .5, y: segment.y0 - .5 });
        points.push({ x: segment.x1 - .5, y: segment.y1 - .5 });
      });
      if (!points.length) points = [cell(source), cell(target)];
      return { sourceUid: source.uid, origin: cell(source), target: cell(target), cells: ray.cells.map(cell), points: points };
    }

    function fire(enemy, beam, amount) {
      if (!alive(enemy)) return;
      var cells = [];
      for (var i = 0; i < beam.cells.length; i++) {
        var position = beam.cells[i];
        if (!hooks.floor(position.x, position.y) || hooks.wallAt(position.x, position.y)) break;
        cells.push(position);
      }
      impact(enemy, cells, amount, 'rail', .5, { origin: beam.origin, target: beam.target, points: beam.points, life: 280 });
    }

    function aim(enemy, target, factor, range, rayRange) {
      if (distance(enemy, target) > range || !hooks.los(enemy.x, enemy.y, target.x, target.y)) return false;
      fire(enemy, shot(enemy, target, rayRange || range), power(enemy, factor));
      return true;
    }

    function field(enemy, kind, cells, delay, life, amount, extra) {
      return hooks.field(enemy, kind, cells.map(cell), delay, life, amount,
        Object.assign({ bossCombat: true, color: enemy.color, orphan: false, phaseEcho: enemy.id === 'bh_phase' }, extra || {}));
    }

    function queue(enemy, kind, label, cells, turns, amount, extra) {
      enemy.intent = Object.assign({ bossCombat: true, kind: kind, label: label, cells: cells.map(cell),
        turns: turns, total: turns, damage: amount, origin: cell(enemy), color: enemy.color,
        startHp: enemy.hp, bornTurn: game.turn, track: false }, extra || {});
      enemy.brain.stance = label;
      enemy.phaseT = enemy.intent.phaseProtection ? turns : 0;
      effect(enemy, 'shock', { radius: .7, life: 220 });
    }

    function owned(enemy, kind) {
      return hooks.owned(enemy).filter(function (child) { return child.hp > 0 && (!kind || child.structure === kind); });
    }

    function build(enemy, kind, count, maximum, inner, outer, healthFactor) {
      if (hooks.networkOnline && !hooks.networkOnline(enemy)) return 0;
      var missing = Math.max(0, maximum - owned(enemy, kind).length);
      var spots = hooks.slots(enemy, inner, outer), made = 0;
      for (var i = 0; i < spots.length && made < Math.min(count, missing); i++) {
        var child = hooks.structure(enemy, kind, spots[i]);
        if (!child) continue;
        if (healthFactor != null && healthFactor !== 1) {
          child.maxHp = Math.max(1, Math.round(child.maxHp * healthFactor));
          child.hp = Math.min(child.hp, child.maxHp);
        }
        if (kind === 'mirror') child.slant = (made + state(enemy).age) % 2 === 0;
        effect(enemy, kind === 'mirror' ? 'blink' : 'shock', { origin: cell(child), radius: .7, life: 300 });
        made++;
      }
      return made;
    }

    function finish(enemy) {
      var intent = enemy.intent;
      if (!intent || !intent.bossCombat) return false;
      if (intent.kind === 'repair' && intent.startHp - enemy.hp >= intent.breakThreshold) {
        enemy.intent = null;
        enemy.phaseT = 0;
        action(enemy, 'repair-interrupted');
        return true;
      }
      intent.turns--;
      if (intent.turns > 0) {
        if (intent.track && !(hooks.hidden && hooks.hidden())) {
          intent.target = cell(player());
          intent.cells = visibleArea(intent.target, intent.radius || 1);
          if (intent.kind === 'composite') intent.cells = intent.cells.concat(hooks.line(enemy, 10, intent.target.x, intent.target.y));
        }
        if (intent.phaseProtection) enemy.phaseT = intent.turns;
        return false;
      }
      enemy.intent = null;
      enemy.phaseT = 0;
      action(enemy, 'release-' + intent.kind);
      if (intent.kind === 'repair') {
        var restored = Math.min(enemy.maxHp - enemy.hp, Math.round(enemy.maxHp * .08));
        enemy.hp += restored;
        enemy.brain.plate = Math.min(100, (enemy.brain.plate || 0) + 35);
        if (hooks.float) hooks.float(enemy.x, enemy.y, '重铸 +' + restored, enemy.color);
        effect(enemy, 'repair', { radius: 1.4, life: 380 });
        return true;
      }
      if (intent.kind === 'rail' || intent.kind === 'mirror-prime') {
        (intent.shots || []).forEach(function (beam) {
          if (beam.sourceUid !== enemy.uid && !(game.enemies || []).some(function (source) { return source.uid === beam.sourceUid && source.hp > 0; })) return;
          fire(enemy, beam, beam.damage == null ? intent.damage : beam.damage);
        });
        if (intent.kind === 'rail') {
          var lane = field(enemy, 'rail', intent.cells, 1, 2, power(enemy, .8));
          if (hooks.industrial) {
            var industrial = hooks.industrial(enemy);
            if (industrial) industrial.line = lane;
          }
          if (hooks.stageEvent) hooks.stageEvent(enemy, 'rail', intent.label);
        } else {
          var mirrors = owned(enemy, 'mirror');
          if (mirrors.length) {
            var mirror = mirrors[state(enemy).age % mirrors.length], position = cell(enemy);
            enemy.x = mirror.x; enemy.y = mirror.y; mirror.x = position.x; mirror.y = position.y;
            effect(enemy, 'blink', { origin: position, target: cell(enemy), life: 300 });
          }
          if (hooks.stageEvent) hooks.stageEvent(enemy, 'mirror', '折射增密');
        }
        return true;
      }
      var cells = intent.cells;
      if (intent.kind === 'annihilate') {
        cells = cells.filter(function (position) {
          return hooks.floor(position.x, position.y) && !hooks.wallAt(position.x, position.y) &&
            hooks.los(intent.origin.x, intent.origin.y, position.x, position.y);
        });
      }
      if (intent.kind === 'charge') {
        var path = [], from = cell(enemy);
        for (var i = 0; i < cells.length; i++) {
          var position = cells[i];
          if (!hooks.floor(position.x, position.y) || hooks.wallAt(position.x, position.y)) break;
          path.push(position);
          if (hooks.occupied(position.x, position.y, enemy)) break;
          enemy.x = position.x; enemy.y = position.y;
        }
        cells = path;
        effect(enemy, 'dash', { origin: from, target: cell(enemy), points: [from].concat(path), life: 300 });
        if (intent.echo) field(enemy, 'echo', (state(enemy).selfHistory || []).slice(-3).concat(path), 2, 1, power(enemy, 1.2), { phaseEcho: true });
      }
      if (intent.kind === 'magnet') {
        (game.hazards || []).forEach(function (mine) {
          if (mine.ownerId === enemy.uid && mine.kind === 'mine') { mine.remote = true; mine.delay = 0; }
        });
        effect(enemy, 'shock', { cells: cells, radius: 3, life: 360, shake: 4 });
        if (hooks.stageEvent) hooks.stageEvent(enemy, 'pulse', intent.label);
        return true;
      }
      var shape = intent.kind === 'charge' ? 'rect' : intent.kind === 'maul' || intent.kind === 'cleaver' || intent.kind === 'hammer' ? 'cone' : 'shock';
      if (intent.kind === 'cleaver' || intent.kind === 'hammer') effect(enemy, 'shock', { cells: cells, radius: intent.radius, life: 360 });
      impact(enemy, cells, intent.damage, shape, intent.armorFactor == null ? .7 : intent.armorFactor,
        { origin: intent.origin, target: intent.target, radius: intent.radius || 2, width: 1, life: 360,
          damageKind: enemy.id === 'bl_hound' ? 'maul' : intent.kind, glitch: enemy.id === 'bh_phase' ? .15 : 0 });
      if (intent.aftershock && alive(enemy)) field(enemy, 'echo', cells, 1, 1, Math.round(intent.damage * .7));
      if (enemy.id === 'bl_warden' && hooks.heat) hooks.heat(enemy, 28);
      if (intent.kind === 'annihilate' && hooks.stageEvent) hooks.stageEvent(enemy, 'annihilate', intent.label);
      if (intent.kind === 'surge' && hooks.stageEvent) hooks.stageEvent(enemy, 'pulse', intent.label);
      return true;
    }

    function chargingPressure(enemy, target) {
      if (distance(enemy, target) <= 1) {
        impact(enemy, visibleArea(enemy, 1), power(enemy, .5), 'slash', 1, { target: cell(target), radius: 1, life: 200 });
      } else if (enemy.id === 'bl_lance' || enemy.id === 'bh_eye' || enemy.id === 'bl_mirror') aim(enemy, target, .38, 10);
      action(enemy, 'windup-pressure');
    }

    function hound(enemy, target, dist) {
      var stage = phase(enemy);
      if (hooks.hunt) hooks.hunt(enemy, dist);
      if (enemy.hp < enemy.maxHp * .35 && !enemy.enraged) { enemy.enraged = true; enemy.atk += 2; }
      enemy.brain.stance = '追猎';
      if (ready(enemy, 'maul') && distance(enemy, target) <= 3) {
        cooldown(enemy, 'maul', stage >= 2 ? 5 : 6);
        queue(enemy, 'maul', '咬合深蓄', visibleArea(target, 1), 2, power(enemy, 2.2), { target: cell(target), radius: 1, aftershock: stage >= 2, track: true });
        chargingPressure(enemy, target); return;
      }
      if (ready(enemy, 'charge') && distance(enemy, target) <= 10 && hooks.los(enemy.x, enemy.y, target.x, target.y)) {
        cooldown(enemy, 'charge', stage >= 2 ? 4 : 5);
        queue(enemy, 'charge', '裂齿突进', hooks.line(enemy, 10, target.x, target.y), 1, power(enemy, 1.6), { target: cell(target) });
        chargingPressure(enemy, target); return;
      }
      approach(enemy, dist, enemy.enraged ? 3 : 2);
      if (distance(enemy, target) <= 1) {
        impact(enemy, visibleArea(enemy, 1), power(enemy, 1, 1), 'slash', 1, { target: cell(target), radius: 1.25, life: 240, damageKind: 'maul' });
        if (enemy.enraged) impact(enemy, visibleArea(enemy, 1), power(enemy, .6), 'cone', 1, { target: cell(target), radius: 1.25, life: 240, damageKind: 'maul' });
      }
      action(enemy, 'pursuit');
    }

    function hive(enemy, target, dist) {
      var stage = phase(enemy); enemy.brain.stance = '增殖母床';
      if (ready(enemy, 'nest')) { cooldown(enemy, 'nest', 6); build(enemy, 'nest', 1, stage >= 1 ? 3 : 2, 2, 4, 1); action(enemy, 'nest'); }
      if (ready(enemy, 'eggs')) { cooldown(enemy, 'eggs', 4); build(enemy, 'egg', 2 + stage, Infinity, 2, 5, 1); action(enemy, 'eggs'); }
      if (ready(enemy, 'acid')) {
        cooldown(enemy, 'acid', 3);
        field(enemy, 'acid', visibleArea(target, 1), 1, 5, Math.max(power(enemy, 0, 4), power(enemy, .7)));
        effect(enemy, 'rail', { target: cell(target), life: 280 }); action(enemy, 'acid');
      }
      if (ready(enemy, 'aura') && distance(enemy, target) <= 4) {
        cooldown(enemy, 'aura', 6);
        queue(enemy, 'aura', '腐蚀光环', visibleArea(enemy, 3), 1, power(enemy, 1.45), { radius: 3 });
        chargingPressure(enemy, target); return;
      }
      if (distance(enemy, target) > 6) approach(enemy, dist, 1);
      if (distance(enemy, target) <= 2) impact(enemy, visibleArea(enemy, 2), power(enemy, 1, 3), 'tendril', .5, { target: cell(target), radius: 2, life: 250 });
      else if (state(enemy).age % 2 === 0) aim(enemy, target, .55, 8);
      action(enemy, 'tendril-pressure');
    }

    function warden(enemy, target, dist) {
      if (hooks.cool) hooks.cool(enemy);
      enemy.brain.stance = enemy.brain.plate > 0 ? '装甲充能' : '反应堆裸露';
      if (enemy.brain.plate <= 0) {
        enemy.brain.vent = (enemy.brain.vent || 0) + 1;
        if (enemy.brain.vent >= 4) { enemy.brain.plate = 100; enemy.brain.vent = 0; }
      }
      if (enemy.hp < enemy.maxHp * .6 && ready(enemy, 'repair')) {
        cooldown(enemy, 'repair', 8);
        queue(enemy, 'repair', '反应堆重铸', [cell(enemy)], 2, 0, { breakThreshold: enemy.maxHp * .045 });
        chargingPressure(enemy, target); return;
      }
      if (ready(enemy, 'hammer') && distance(enemy, target) <= 4) {
        cooldown(enemy, 'hammer', 5);
        queue(enemy, 'hammer', '液压重锤', visibleArea(enemy, 3), 1, power(enemy, 3), { target: cell(target), radius: 3, aftershock: true });
        chargingPressure(enemy, target); return;
      }
      approach(enemy, dist, 1);
      if (distance(enemy, target) <= 2) impact(enemy, visibleArea(enemy, 2), power(enemy, 1.3), 'rect', 1, { target: cell(target), width: 1.5, life: 250 });
      else aim(enemy, target, .55, 8);
      action(enemy, 'armored-advance');
    }

    function lance(enemy, target, dist) {
      enemy.brain.stance = '机动游骑';
      strafe(enemy, target, dist, phase(enemy) >= 2 ? 2 : 1, 9);
      if (ready(enemy, 'hook') && distance(enemy, target) <= 8 && hooks.los(enemy.x, enemy.y, target.x, target.y)) {
        cooldown(enemy, 'hook', 6);
        if (hooks.pull) hooks.pull(enemy, 3);
        enemy.brain.stance = '磁钩弹射';
        strafe(enemy, player(), dist, 3, 8);
        aim(enemy, player(), .65, 12, 32); action(enemy, 'hook'); return;
      }
      if (ready(enemy, 'rail') && distance(enemy, target) <= 14 && hooks.los(enemy.x, enemy.y, target.x, target.y)) {
        cooldown(enemy, 'rail', phase(enemy) >= 2 ? 4 : 5);
        var beam = shot(enemy, target, 32);
        queue(enemy, 'rail', '轨道炮充能', beam.cells, 1, power(enemy, 2.2), { shots: [beam], target: cell(target) });
        aim(enemy, target, .5, 12, 32); action(enemy, 'rail-prime'); return;
      }
      aim(enemy, target, phase(enemy) >= 2 ? 1 : .8, 12, 32);
      action(enemy, 'mobile-shot');
    }

    function mine(enemy, target, dist) {
      enemy.brain.stance = '磁网编织';
      strafe(enemy, target, dist, phase(enemy) >= 2 ? 2 : 1, 7, 5);
      if (ready(enemy, 'plant')) {
        cooldown(enemy, 'plant', 2);
        var previous = state(enemy).history[state(enemy).history.length - 2] || target;
        var dx = Math.sign(target.x - previous.x), dy = Math.sign(target.y - previous.y);
        var centers = [cell(target), { x: target.x + (dx || 1) * 2, y: target.y + dy * 2 }];
        if (phase(enemy) >= 1) centers.push({ x: target.x - dy * 2, y: target.y + (dx || 1) * 2 });
        centers.forEach(function (position) {
          if (!hooks.floor(position.x, position.y) || hooks.wallAt(position.x, position.y)) return;
          field(enemy, 'mine', visibleArea(position, 1), 1, 9, power(enemy, 1.8), { cx: position.x, cy: position.y });
          effect(enemy, 'rail', { target: position, life: 250 });
        });
        if (hooks.magnetWeave) {
          hooks.magnetWeave(enemy);
          (game.hazards || []).forEach(function (entry) {
            if (entry.ownerId === enemy.uid && entry.kind === 'magnet-link') {
              entry.bossCombat = true; entry.color = enemy.color;
            }
          });
        }
        action(enemy, 'plant');
      }
      if (ready(enemy, 'detonate') && state(enemy).age > 2) {
        cooldown(enemy, 'detonate', 5);
        var mines = (game.hazards || []).filter(function (entry) { return entry.ownerId === enemy.uid && entry.kind === 'mine'; });
        var cells = [];
        mines.forEach(function (entry) { cells = cells.concat(entry.cells); });
        queue(enemy, 'magnet', '磁暴过载', cells, 1, 0, { radius: 3 });
        if (hooks.pulse) hooks.pulse(enemy, power(enemy, .8), '磁暴过载');
        aim(enemy, target, .45, 8); return;
      }
      if (state(enemy).age % 2 === 0) aim(enemy, target, .7, 8);
      action(enemy, 'magnet-pressure');
    }

    function mirror(enemy, target, dist) {
      enemy.brain.stance = '折光矩阵';
      if (ready(enemy, 'mirror')) { cooldown(enemy, 'mirror', 3); build(enemy, 'mirror', state(enemy).age === 1 ? 3 : 1, 10, 2, 6); }
      var mirrors = owned(enemy, 'mirror');
      if (ready(enemy, 'focus')) {
        cooldown(enemy, 'focus', 3);
        var beams = [shot(enemy, target, 32, mirrors)];
        beams[0].damage = power(enemy, 1.15);
        mirrors.forEach(function (source) {
          var beam = shot(source, target, 24, mirrors.filter(function (other) { return other !== source; }));
          beam.damage = Math.max(power(enemy, 0, 2), power(enemy, .62));
          beams.push(beam);
        });
        var cells = [];
        beams.forEach(function (beam) { cells = cells.concat(beam.cells); });
        queue(enemy, 'mirror-prime', '千面聚焦', cells, 1, power(enemy, .62), { shots: beams, target: cell(target) });
        chargingPressure(enemy, target); return;
      }
      if (!aim(enemy, target, .6, 12)) approach(enemy, dist, 1);
      if (mirrors.length) {
        var source = mirrors[state(enemy).age % mirrors.length];
        if (hooks.los(source.x, source.y, target.x, target.y)) fire(enemy, shot(source, target, 12, mirrors.filter(function (entry) { return entry !== source; })), power(enemy, .4));
      }
      if (distance(enemy, target) <= 1) impact(enemy, visibleArea(enemy, 1), power(enemy, 1, 1), 'slash', 1, { target: cell(target), radius: 1.25, life: 240 });
      action(enemy, 'refraction');
    }

    function eye(enemy, target, dist) {
      enemy.brain.stance = '视网膜灼照';
      if (ready(enemy, 'overexpose')) {
        cooldown(enemy, 'overexpose', 8);
        queue(enemy, 'annihilate', '瞳孔过曝', annihilationArea(enemy), 2, power(enemy, 3.2), { radius: 8, armorFactor: .35, phaseProtection: true });
        chargingPressure(enemy, target); return;
      }
      if (ready(enemy, 'pulse') && state(enemy).age > 1) {
        cooldown(enemy, 'pulse', 3);
        if (hooks.pulse) hooks.pulse(enemy, Math.max(power(enemy, .7), power(enemy, 0, 8 + game.depth)), '视神经灼照');
        effect(enemy, 'shock', { radius: Math.min(14, distance(enemy, target)), life: 400, glitch: .12 });
        action(enemy, 'neural-pulse');
      }
      if (ready(enemy, 'bomb')) { cooldown(enemy, 'bomb', 4); field(enemy, 'bomb', visibleArea(target, 2), 1, 1, power(enemy, 1.8)); }
      var angle = (enemy.brain.angle || 0) * Math.PI / 4;
      enemy.brain.angle = (enemy.brain.angle || 0) + 1;
      var heading = state(enemy).age % 2 === 0 ? cell(target) : { x: enemy.x + Math.round(Math.cos(angle) * 14), y: enemy.y + Math.round(Math.sin(angle) * 14) };
      fire(enemy, shot(enemy, heading, 32), power(enemy, 1, 4));
      if (phase(enemy) >= 1) fire(enemy, shot(enemy, { x: enemy.x - Math.round(Math.sin(angle) * 14), y: enemy.y + Math.round(Math.cos(angle) * 14) }, 32), power(enemy, 1, 2));
      if (distance(enemy, target) > 12) approach(enemy, dist, 1);
      action(enemy, 'rotating-sweep');
    }

    function mother(enemy, target, dist) {
      var online = !hooks.networkOnline || hooks.networkOnline(enemy);
      enemy.brain.stance = online ? '母巢 · 转接网络' : '母巢 · 断联重路由';
      if (online && ready(enemy, 'network')) {
        cooldown(enemy, 'network', state(enemy).age === 1 ? 3 : 4);
        var kinds = ['relay', 'medic', 'gate', 'nest'];
        kinds.forEach(function (kind) { build(enemy, kind, 1, 1, 3, 5, 1); });
        action(enemy, 'network');
      }
      if (hooks.networkRoute) hooks.networkRoute(enemy);
      if (ready(enemy, 'surge') && state(enemy).age > 2) {
        cooldown(enemy, 'surge', 3);
        var cells = visibleArea(enemy, 2);
        owned(enemy).filter(function (child) { return child.structure; }).forEach(function (node) { cells = cells.concat(visibleArea(node, 1)); });
        queue(enemy, 'surge', '巢群神经压迫', cells, 1, power(enemy, 1.25), { radius: 3 });
        if (hooks.pulse) hooks.pulse(enemy, power(enemy, .65), '巢群神经压迫');
        chargingPressure(enemy, target); return;
      }
      if (ready(enemy, 'pull') && distance(enemy, target) <= 10 && hooks.los(enemy.x, enemy.y, target.x, target.y)) {
        cooldown(enemy, 'pull', 5);
        if (hooks.pull) hooks.pull(enemy, 4);
      }
      if (distance(enemy, player()) <= 2) impact(enemy, visibleArea(enemy, 2), Math.max(power(enemy, 1.1), power(enemy, 1, 2)), 'tendril', 1, { target: cell(player()), radius: 2, life: 280 });
      else if (state(enemy).age % 2 === 0) aim(enemy, player(), .65, 11);
      if (distance(enemy, player()) > 10) approach(enemy, dist, 1);
      action(enemy, 'network-pressure');
    }

    function updateForm(enemy, target, hidden) {
      var data = state(enemy), form = enemy.hp > enemy.maxHp * .66 ? 0 : enemy.hp > enemy.maxHp * .33 ? 1 : 2;
      if (data.form !== form) {
        data.form = form; enemy.brain.form = form;
        data.history = hidden ? [] : [cell(target)];
        data.selfHistory = [cell(enemy)];
        if (enemy.intent && enemy.intent.bossCombat) enemy.intent = null;
        enemy.phaseT = 0;
        game.hazards = (game.hazards || []).filter(function (entry) { return entry.ownerId !== enemy.uid || !entry.phaseEcho; });
        if (hooks.message) hooks.message(enemy.name + ' · ' + phaseMessages[form], 'warn');
        effect(enemy, 'shock', { radius: 2.3, life: 400, glitch: .2 });
      }
    }

    function phaseBoss(enemy, target, dist) {
      var data = state(enemy), form = data.form;
      enemy.brain.stance = phaseNames[form];
      if (form === 0) {
        if (ready(enemy, 'cleaver') && distance(enemy, target) <= 3) {
          cooldown(enemy, 'cleaver', 4);
          queue(enemy, 'cleaver', '重刃迟滞', visibleArea(enemy, 2), 1, power(enemy, 2), { target: cell(target), radius: 2, aftershock: true });
          chargingPressure(enemy, target); return;
        }
        approach(enemy, dist, 2);
      } else if (form === 1) {
        if (ready(enemy, 'echo')) {
          cooldown(enemy, 'echo', 3);
          field(enemy, 'echo', data.history.slice(-3), 2, 1, power(enemy, 1.25), { phaseEcho: true });
          action(enemy, 'footstep-echo');
        }
        if (ready(enemy, 'blink') && distance(enemy, target) > 2) {
          cooldown(enemy, 'blink', 3);
          var locations = hooks.area(target.x, target.y, 1, 1).filter(function (position) { return available(position.x, position.y, enemy); });
          if (locations.length) {
            var from = cell(enemy), landing = locations[data.age % locations.length];
            enemy.x = landing.x; enemy.y = landing.y;
            effect(enemy, 'blink', { origin: from, target: cell(enemy), life: 300, glitch: .12 });
          }
        } else approach(enemy, dist, 1);
      } else {
        if (ready(enemy, 'rift')) {
          cooldown(enemy, 'rift', 6);
          queue(enemy, 'annihilate', '维度断层', annihilationArea(enemy), 2, power(enemy, 3.5), { radius: 9, armorFactor: .35, phaseProtection: true });
          chargingPressure(enemy, target); return;
        }
        if (ready(enemy, 'charge') && hooks.los(enemy.x, enemy.y, target.x, target.y)) {
          cooldown(enemy, 'charge', 2);
          queue(enemy, 'charge', '相位快切 · 轨迹回卷', hooks.line(enemy, 10, target.x, target.y), 1, power(enemy, 1.8), { echo: true, target: cell(target) });
          chargingPressure(enemy, target); return;
        }
        approach(enemy, dist, 2);
      }
      if (distance(enemy, target) <= 1) impact(enemy, visibleArea(enemy, 1), power(enemy, 1, 1), form === 2 ? 'cross' : 'slash', 1, { target: cell(target), width: 1, radius: 1.6, life: 270 });
      action(enemy, 'phase-pressure-' + form);
    }

    var behavior = { bl_hound: hound, bl_hive: hive, bl_warden: warden, bl_lance: lance, bl_mine: mine,
      bl_mirror: mirror, bh_eye: eye, bh_hive: mother, bh_phase: phaseBoss };

    function act(enemy, dist) {
      if (!handles(enemy)) return false;
      if (!alive(enemy)) { clear(enemy); return true; }
      var data = state(enemy);
      hooks.uid(enemy);
      if (game.freeze > 0) return true;
      if (enemy.stun > 0 || enemy.disarmT > 0) { enemy.intent = null; enemy.phaseT = 0; return true; }
      if (enemy.intent && !enemy.intent.bossCombat && hooks.legacyResolve) {
        hooks.legacyResolve(enemy); return true;
      }
      if (!enemy.intent || !enemy.intent.phaseProtection) enemy.phaseT = 0;
      if (hooks.phase) hooks.phase(enemy);
      enemy.brain.step = (enemy.brain.step || 0) + 1;
      data.age++;
      Object.keys(data.cooldowns).forEach(function (key) { data.cooldowns[key] = Math.max(0, data.cooldowns[key] - 1); });
      var hidden = hooks.hidden && hooks.hidden();
      var target = player();
      if (enemy.id === 'bh_phase') updateForm(enemy, target, hidden);
      data.selfHistory = data.selfHistory || [];
      data.selfHistory.push(cell(enemy));
      if (data.selfHistory.length > 6) data.selfHistory.shift();
      if (!hidden) {
        data.lastSeen = cell(target);
        data.history.push(cell(target));
        if (data.history.length > 6) data.history.shift();
        if (enemy.id !== 'bl_warden' || data.age % 3 === 1 || enemy.facing == null) enemy.facing = Math.atan2(target.y - enemy.y, target.x - enemy.x);
      }
      if (enemy.intent) {
        var finished = finish(enemy);
        if (!finished && !hidden) chargingPressure(enemy, target);
        return true;
      }
      if (hidden) { action(enemy, 'lost-target'); return true; }
      if (enemy.hp < enemy.maxHp * .38 && !enemy.armorT && data.age >= 3 && ready(enemy, 'composite')) {
        cooldown(enemy, 'composite', 7);
        queue(enemy, 'composite', '复合协议·全频过载', visibleArea(target, 2).concat(hooks.line(enemy, 10, target.x, target.y)), 2, power(enemy, 2.1), { aftershock: true, radius: 2, track: true });
        chargingPressure(enemy, target); return true;
      }
      behavior[enemy.id](enemy, target, dist);
      return true;
    }

    return { handles: handles, act: act, clear: clear,
      snapshot: function (enemy) { return JSON.parse(JSON.stringify(state(enemy))); } };
  }

  var api = { create: create, ids: ids.slice() };
  root.NeonBossCombat = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
