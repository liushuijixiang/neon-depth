/* Directional weapon geometry and short-lived attack presentation. */
(function (root) {
  'use strict';

  var profiles = {
    mantis_blade: {
      normal: [{ shape: 'cone', range: 2, angle: 100 }],
      charged: { shape: 'cone', range: 2, angle: 100, rush: 3 },
      active: { shape: 'cone', range: 2, angle: 120, rush: 3, charge: true },
      effect: 'slash'
    },
    thermal_blade: {
      normal: [{ shape: 'line', range: 2, width: 1 }],
      charged: { shape: 'rect', range: 4, width: 3 },
      active: { shape: 'rect', range: 4, width: 3, charge: true },
      effect: 'rect'
    },
    iaido: {
      normal: [{ shape: 'line', range: 3, width: 1 }],
      charged: { shape: 'rect', range: 7, width: 1 },
      effect: 'rail'
    },
    monowire: {
      normal: [{ shape: 'cone', range: 2, angle: 170 }],
      active: { shape: 'cone', range: 4, angle: 160, charge: false },
      effect: 'tendril'
    },
    gorilla_arms: {
      normal: [{ shape: 'point', range: 1 }, { shape: 'line', range: 2 }, { shape: 'rect', range: 2, width: 3 }],
      active: { shape: 'impact', range: 2, radius: 1, charge: false, push: 1 },
      effect: 'shock'
    },
    emp_knuckles: {
      normal: [{ shape: 'point', range: 1 }, { shape: 'cross', range: 2 }],
      effect: 'network'
    },
    shock_fist: {
      normal: [{ shape: 'cross', range: 1 }],
      active: { shape: 'disc', range: 2, charge: false, stun: 1 },
      effect: 'shock'
    },
    katana: {
      normal: [{ shape: 'cone', range: 2, angle: 120 }, { shape: 'rect', range: 4, width: 1 }, { shape: 'cross', range: 2, forward: 2 }],
      active: { shape: 'sequence', charge: false, strikes: [
        { shape: 'cone', range: 2, angle: 120, multiplier: .45 },
        { shape: 'rect', range: 4, width: 1, multiplier: .45 },
        { shape: 'cross', range: 2, forward: 2, multiplier: .45 }
      ] },
      effect: 'slash'
    },
    chainsaw: {
      normal: [{ shape: 'circle', range: 2 }],
      charged: { shape: 'circle', range: 3 },
      effect: 'spin'
    },
    blood_edge: {
      normal: [{ shape: 'cone', range: 2, angle: 150 }],
      effect: 'tendril'
    }
  };

  function create(game, hooks) {
    function direction(face) {
      var x = Math.round(Math.cos(face || 0)), y = Math.round(Math.sin(face || 0));
      return { x: x || y ? x : 1, y: y };
    }

    function legal(origin, x, y) {
      return hooks.floor(x, y) && !hooks.wallAt(x, y) && hooks.los(origin.x, origin.y, x, y);
    }

    function cells(stage, origin, face) {
      var forward = direction(face), range = stage.range || 1, width = stage.width || 1;
      var center = { x: origin.x + forward.x * (stage.forward || 0), y: origin.y + forward.y * (stage.forward || 0) };
      if (stage.shape === 'impact') center = { x: origin.x + forward.x * range, y: origin.y + forward.y * range };
      var radius = stage.shape === 'impact' ? stage.radius || 1 : range;
      var reach = range + width + (stage.forward || 0) + radius;
      var lengthSquared = forward.x * forward.x + forward.y * forward.y;
      var result = [];
      for (var dy = -reach; dy <= reach; dy++) {
        for (var dx = -reach; dx <= reach; dx++) {
          var x = origin.x + dx, y = origin.y + dy;
          if ((!dx && !dy) || !legal(origin, x, y)) continue;
          var ahead = (dx * forward.x + dy * forward.y) / lengthSquared;
          var side = (dy * forward.x - dx * forward.y) / Math.sqrt(lengthSquared);
          var cx = x - center.x, cy = y - center.y, include = false;
          if (stage.shape === 'circle' || stage.shape === 'sweep' || stage.shape === 'slam' || stage.shape === 'impact') {
            include = Math.max(Math.abs(cx), Math.abs(cy)) <= radius;
          } else if (stage.shape === 'disc') {
            include = cx * cx + cy * cy <= radius * radius + 1;
          } else if (stage.shape === 'cross') {
            include = (cx === 0 || cy === 0) && Math.max(Math.abs(cx), Math.abs(cy)) <= radius;
          } else if (stage.shape === 'cone') {
            var distance = Math.hypot(dx, dy);
            var cosine = (dx * forward.x + dy * forward.y) / (distance * Math.sqrt(lengthSquared));
            include = Math.max(Math.abs(dx), Math.abs(dy)) <= range && cosine >= Math.cos((stage.angle || 120) * Math.PI / 360);
          } else {
            include = ahead >= .5 && ahead <= range && Math.abs(side) <= (width - 1) / 2 + .05;
          }
          if (include) result.push({ x: x, y: y });
        }
      }
      return result;
    }

    function pattern(mod, stage, active) {
      var profile = mod && profiles[mod.id];
      if (!profile) return null;
      if (active) return profile.active ? Object.assign({}, profile.active) : null;
      var sequence = game.melee && game.melee.seq || 0;
      var shape = game.melee && game.melee.charge > 0 && profile.charged ? profile.charged : profile.normal[sequence % profile.normal.length];
      return Object.assign({}, stage || {}, shape);
    }

    function chain(stage, origin) {
      var targets = [], previous = origin;
      var pool = game.enemies.filter(function (enemy) { return enemy.hp > 0 && game.vis[enemy.y] && game.vis[enemy.y][enemy.x]; });
      for (var index = 0; index < stage.count; index++) {
        var range = index ? stage.jump : stage.range;
        var target = pool.filter(function (enemy) {
          return targets.indexOf(enemy) < 0 && Math.max(Math.abs(enemy.x - previous.x), Math.abs(enemy.y - previous.y)) <= range && hooks.los(previous.x, previous.y, enemy.x, enemy.y);
        }).sort(function (a, b) { return Math.hypot(a.x - previous.x, a.y - previous.y) - Math.hypot(b.x - previous.x, b.y - previous.y); })[0];
        if (!target) break;
        targets.push(target); previous = target;
      }
      return targets.map(function (target) { return { x: target.x, y: target.y }; });
    }

    function plan(mod, stage, active) {
      var selected = pattern(mod, stage, active);
      if (!selected) return null;
      var player = hooks.player(), origin = { x: player.x, y: player.y }, face = player.face || 0;
      var forward = direction(face), landing = { x: origin.x, y: origin.y }, path = [];
      for (var step = 1; step <= (selected.rush || 0); step++) {
        var x = origin.x + forward.x * step, y = origin.y + forward.y * step;
        if (!legal(origin, x, y)) break;
        path.push({ x: x, y: y });
        if (hooks.occupied(x, y)) break;
        landing = { x: x, y: y };
      }
      var strikes = selected.strikes || [selected];
      var attacks = strikes.map(function (strike, index) {
        return { stage: strike, cells: strike.shape === 'chain' ? chain(strike, landing) : cells(strike, landing, face),
          multiplier: strike.multiplier == null ? 1 : strike.multiplier, delay: index * 90 };
      });
      if (path.length) attacks[0].cells = path.concat(attacks[0].cells).filter(function (cell, index, all) {
        return all.findIndex(function (other) { return other.x === cell.x && other.y === cell.y; }) === index;
      });
      return { id: mod.id, origin: origin, landing: landing, path: path, face: face, stage: selected, attacks: attacks,
        color: mod.melee && mod.melee.color || mod.color || '#22e6ff', effect: profiles[mod.id].effect };
    }

    function targets(attack) {
      return game.enemies.filter(function (enemy) {
        return enemy.hp > 0 && attack.cells.some(function (cell) { return cell.x === enemy.x && cell.y === enemy.y; });
      });
    }

    function emit(plan) {
      var owner = 'player:' + plan.id;
      if (plan.path.length) hooks.fx.emit('dash', { owner: owner, team: 'player', color: plan.color, origin: plan.origin,
        target: plan.landing, points: [plan.origin].concat(plan.path), life: 240, shake: 3 });
      plan.attacks.forEach(function (attack, index) {
        var shape = attack.stage.shape;
        var kind = shape === 'chain' ? 'network' : shape === 'cross' ? 'cross' : shape === 'rect' || shape === 'line' ? plan.effect === 'rail' ? 'rail' : 'rect' : plan.effect;
        var forward = direction(plan.face);
        var target = { x: plan.landing.x + forward.x * (attack.stage.range || 1), y: plan.landing.y + forward.y * (attack.stage.range || 1) };
        var event = { owner: owner, team: 'player', color: plan.color, origin: plan.landing, target: target,
          angle: plan.face, cells: attack.cells, points: [plan.landing].concat(attack.cells),
          width: attack.stage.width || 1, radius: attack.stage.range || 1, life: 320, delay: attack.delay,
          arc: shape === 'cone' ? (attack.stage.angle || 120) * Math.PI / 180 : shape === 'circle' || shape === 'disc' ? Math.PI * 2 : 0,
          center: shape === 'cross' ? { x: plan.landing.x + forward.x * (attack.stage.forward || 0), y: plan.landing.y + forward.y * (attack.stage.forward || 0) } : null,
          shake: index ? 2 : 4, glitch: plan.id === 'emp_knuckles' || plan.id === 'iaido' ? .2 : 0 };
        // 1.0：玩家招式的刀光交给主引擎的斩击演出，这里只标出实际命中格
        event.life = 260; event.motif = shape; hooks.fx.emit('outline', event);
      });
    }

    function preview(plan) {
      if (!plan) return;
      hooks.fx.setTelegraph('player-weapon', { owner: 'player:' + plan.id, team: 'player', color: plan.color,
        origin: plan.origin, target: plan.landing, cells: plan.attacks.flatMap(function (attack) { return attack.cells; }) });
    }

    return { pattern: pattern, plan: plan, cells: cells, targets: targets, emit: emit, preview: preview,
      clearPreview: function () { hooks.fx.clearTelegraph('player-weapon'); }, profiles: profiles };
  }

  var api = { create: create, profiles: profiles };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NeonImplantCombat = api;
})(typeof window === 'undefined' ? globalThis : window);
