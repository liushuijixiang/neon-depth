/* Controlled enemies retain their entity, combat statistics, model and AI.
 * Integration supplies the existing engine's geometry, mitigation and effects.
 * act() runs after the caller's existing once-per-turn duration decrement.
 * tickFields() runs beside hostile hazards, under the same freeze condition.
 */
(function (root) {
  'use strict';

  function create(game, hooks) {
    var color = '#57ffa8';
    var random = hooks.random || Math.random;
    var now = hooks.now || function () { return 0; };

    function distance(a, b) {
      return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    }

    function handles(actor) {
      return !!(actor && actor.kind === 'hacked' && actor.spec && actor.hackedModel === 1);
    }

    function alive(actor) {
      return handles(actor) && actor.hp > 0 && actor.turns > 0 &&
        (actor.hackedExpiresTurn == null || game.turn < actor.hackedExpiresTurn);
    }

    function opponents() {
      return game.enemies.filter(function (enemy) { return enemy.hp > 0 && !enemy.neutral; });
    }

    function friends() {
      return game.allies.filter(alive).concat(hooks.player()).filter(function (actor) { return actor && actor.hp > 0; });
    }

    function blocked(x, y, actor) {
      if (!game.map[y] || game.map[y][x] !== 0 || hooks.wallAt(x, y)) return true;
      return game.enemies.concat(game.allies, hooks.player()).some(function (other) {
        return other && other !== actor && (other.hp == null || other.hp > 0) &&
          (other.turns == null || other.turns > 0) && other.x === x && other.y === y;
      });
    }

    function nearest(actor, pool, range) {
      return pool.filter(function (other) { return other !== actor && distance(actor, other) <= range; })
        .sort(function (a, b) { return distance(actor, a) - distance(actor, b); })[0] || null;
    }

    function capture(enemy, turns, tint) {
      hooks.uid(enemy);
      enemy.hackedSourceColor = enemy.hackedSourceColor || enemy.color;
      enemy.kind = 'hacked';
      enemy.team = 'player';
      enemy.hijack = true;
      enemy.hackedModel = 1;
      enemy.hackedRootUid = enemy.ownerId || enemy.uid;
      enemy.turns = turns;
      enemy.hackedExpiresTurn = game.turn + turns;
      enemy.color = tint || color;
      enemy.alerted = true;
      if (enemy.intent) enemy.intent.color = enemy.color;
      var moved = (game.hazards || []).filter(function (field) { return field.sourceUid === enemy.uid; });
      moved.forEach(function (field) {
        field.color = enemy.color;
        field.sourceX = enemy.x;
        field.sourceY = enemy.y;
        field.team = 'player';
        field.hackedExpiresTurn = enemy.hackedExpiresTurn;
      });
      game.hazards = (game.hazards || []).filter(function (field) { return moved.indexOf(field) < 0; });
      game.hackedFields = (game.hackedFields || []).concat(moved);
      return enemy;
    }

    function remove(actor, selfDestruct) {
      var index = game.allies.indexOf(actor);
      if (index < 0) return;
      if (actor.hp <= 0 && !selfDestruct && !actor.summoned && !actor.structure) {
        game.hackedCorpses = game.hackedCorpses || [];
        game.hackedCorpses.push({ spec: actor.spec, x: actor.x, y: actor.y });
        if (game.hackedCorpses.length > 12) game.hackedCorpses.shift();
      }
      game.allies.splice(index, 1);
      hooks.burst(actor.x, actor.y, actor.color || color, 12);
    }

    function receive(actor, postArmorDamage, source) {
      if (!alive(actor)) return 0;
      var dealt = hooks.damage(actor, Math.max(1, Math.round(postArmorDamage)), source);
      if (actor.hp <= 0) remove(actor);
      return dealt;
    }

    function hit(actor, target, amount, armorFactor, selfDestruct) {
      if (!target || target.hp <= 0) return 0;
      var raw = Math.max(1, Math.round(amount - (target.def || 0) * (armorFactor == null ? 1 : armorFactor)));
      var dealt;
      if (target === hooks.player()) dealt = hooks.hurtPlayer(raw, actor);
      else if (handles(target)) dealt = receive(target, raw, actor);
      else {
        dealt = hooks.damage(target, raw, actor);
        if (target.hp <= 0) hooks.kill(target, selfDestruct);
      }
      if (dealt) hooks.float(target.x, target.y, '-' + dealt, actor.color || color);
      return dealt;
    }

    function move(actor, target, away) {
      var field = hooks.pathField(target.x, target.y);
      var current = field[actor.y] && field[actor.y][actor.x];
      if (current == null || current < 0) return;
      var best = null, score = away ? current : Infinity;
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          var x = actor.x + dx, y = actor.y + dy;
          if (blocked(x, y, actor)) continue;
          var next = field[y][x];
          if (away) {
            if (next > score) { score = next; best = { x: x, y: y }; }
          } else if (next >= 0 && next < current) {
            var value = next + (dx && dy ? .35 : 0);
            if (value < score) { score = value; best = { x: x, y: y }; }
          }
        }
      }
      if (best) { actor.x = best.x; actor.y = best.y; }
    }

    function adjacent(target, actor) {
      return hooks.area(target.x, target.y, 1, 1).filter(function (cell) { return !blocked(cell.x, cell.y, actor); })[0];
    }

    function impact(actor, cells, amount, kind, armorFactor) {
      hooks.fx(cells, actor.color || color, kind || 'impact');
      actor.attackFx = now();
      opponents().filter(function (target) {
        return cells.some(function (cell) { return cell.x === target.x && cell.y === target.y; });
      }).forEach(function (target) { hit(actor, target, amount, armorFactor); });
    }

    function laser(actor, x, y, power) {
      var ray = hooks.ray(actor, x, y, 32, []);
      ray.segments.forEach(function (segment) {
        game.beams.push(Object.assign({}, segment, { life: 300, max: 300, color: actor.color || color }));
      });
      impact(actor, ray.cells, power, 'rail', .5);
    }

    function queue(actor, kind, label, cells, turns, damage, extra) {
      actor.intent = Object.assign({ kind: kind, label: label, cells: cells, turns: turns, total: turns,
        color: actor.color || color, damage: damage, startHp: actor.hp, bornTurn: game.turn }, extra || {});
      actor.brain.stance = label;
    }

    function field(actor, kind, cells, delay, life, damage, orphan) {
      game.hackedFields = game.hackedFields || [];
      if (game.hackedFields.length >= 72) return;
      game.hackedFields.push({ ownerId: actor.hackedRootUid || actor.uid, sourceUid: actor.uid,
        kind: kind, cells: cells.slice(), delay: delay, life: life, damage: damage, sourceX: actor.x, sourceY: actor.y,
        color: actor.color || color, team: 'player', bornTurn: game.turn,
        orphan: !!orphan, hackedExpiresTurn: actor.hackedExpiresTurn });
    }

    function tickFields() {
      game.hackedFields = (game.hackedFields || []).filter(function (effect) {
        if (effect.hackedExpiresTurn != null && game.turn >= effect.hackedExpiresTurn) return false;
        var owner = game.allies.find(function (actor) { return actor.uid === effect.sourceUid && alive(actor); });
        if (!owner && !effect.orphan) return false;
        if (effect.bornTurn === game.turn) return true;
        if (effect.delay > 0 && --effect.delay > 0) return true;
        effect.active = true;
        var targets = opponents().filter(function (target) {
          return effect.cells.some(function (cell) { return cell.x === target.x && cell.y === target.y; });
        });
        if (effect.kind === 'mine' && !effect.remote && !targets.length) return --effect.life > 0;
        var source = owner || { color: effect.color, x: effect.sourceX == null ? effect.cells[0].x : effect.sourceX, y: effect.sourceY == null ? effect.cells[0].y : effect.sourceY };
        var armor = effect.kind === 'acid' ? .25 : effect.kind === 'mine' ? .6 : .65;
        targets.forEach(function (target) { hit(source, target, effect.damage, armor); });
        if (effect.kind !== 'acid') hooks.fx(effect.cells, effect.color, effect.kind === 'mine' ? 'explosion' : effect.kind);
        if (effect.kind === 'mine') return false;
        return --effect.life > 0;
      });
    }

    function resolve(actor, target) {
      var intent = actor.intent;
      if (!intent) return false;
      intent.turns--;
      if (intent.track && intent.turns > 0 && target) {
        intent.cells = intent.kind === 'charge'
          ? hooks.line(actor, intent.range || 7, target.x, target.y)
          : hooks.area(target.x, target.y, intent.radius || 1);
      }
      if (intent.turns > 0) return true;
      actor.intent = null;
      actor.phaseT = 0;
      actor.attackFx = now();
      var cells = intent.cells || [];
      if (intent.kind === 'charge') {
        var path = [];
        for (var i = 0; i < cells.length; i++) {
          var cell = cells[i];
          if (!game.map[cell.y] || game.map[cell.y][cell.x] !== 0 || hooks.wallAt(cell.x, cell.y)) break;
          var victim = opponents().find(function (enemy) { return enemy.x === cell.x && enemy.y === cell.y; });
          if (blocked(cell.x, cell.y, actor) && !victim) break;
          path.push(cell);
          if (victim) break;
          actor.x = cell.x;
          actor.y = cell.y;
        }
        cells = path;
        if (path.length < 2) { actor.stun = Math.max(actor.stun || 0, 1); actor.brain.stance = '撞击过载'; }
      }
      if (intent.kind === 'rail') laser(actor, intent.tx, intent.ty, intent.damage);
      else if (intent.kind === 'explode') {
        impact(actor, cells, intent.damage, 'explosion', .6);
        if (actor.spec.onDeath === 'explode' || game.depth >= 6) field(actor, 'acid', cells, 0, 3, Math.max(3, Math.round(actor.atk * .45)), true);
        actor.hp = 0;
        remove(actor, true);
        return true;
      } else {
        impact(actor, cells, intent.damage, intent.kind, intent.armorFactor);
        if (intent.aftershock) field(actor, 'echo', cells, 1, 1, Math.round(intent.damage * .7));
      }
      actor.cd = intent.cooldown || 0;
      return true;
    }

    function shuffledSlots(actor, inner, outer) {
      var slots = hooks.area(actor.x, actor.y, outer, inner).filter(function (cell) { return !blocked(cell.x, cell.y, actor); });
      for (var i = slots.length - 1; i > 0; i--) {
        var j = Math.floor(random() * (i + 1)), temp = slots[i];
        slots[i] = slots[j]; slots[j] = temp;
      }
      return slots;
    }

    function children(actor) {
      return game.allies.filter(function (child) { return alive(child) && child.sourceUid === actor.uid; });
    }

    function affiliate(child, parent) {
      hooks.uid(child);
      child.kind = 'hacked';
      child.team = 'player';
      child.hackedModel = 1;
      child.hijack = false;
      child.color = parent.color || color;
      child.turns = parent.turns;
      child.hackedExpiresTurn = parent.hackedExpiresTurn;
      child.hackedRootUid = parent.hackedRootUid || parent.uid;
      child.ownerId = child.hackedRootUid;
      child.sourceUid = parent.uid;
      child.summoned = true;
      child.bossSummoned = !!(hooks.summonLimit && hooks.summonLimit(parent) === 25);
      child.noSplit = true;
      child.alerted = true;
      game.allies.push(child);
      hooks.burst(child.x, child.y, child.color, 8);
      return child;
    }

    function summon(actor, count, roles) {
      var cap = hooks.summonLimit ? hooks.summonLimit(actor) : [10, 15, 20][Math.min(2, Math.floor((game.depth - 1) / 5))];
      var population = hooks.summonedCount ? hooks.summonedCount(actor) : game.allies.filter(function (child) { return alive(child) && child.summoned && !child.structure && child.hackedRootUid === (actor.hackedRootUid || actor.uid); }).length;
      count = Math.max(0, Math.min(count, cap - population,
        64 - game.allies.filter(handles).length));
      if (!count) return 0;
      roles = roles || actor.spawnRoles || ['chase', 'charger', 'exploder', 'healer', 'summoner'];
      var pool = hooks.monsters.filter(function (spec) {
        return !spec.boss && spec.ai !== 'summoner' && roles.indexOf(spec.ai) >= 0 && game.depth >= spec.minDepth && game.depth <= spec.maxDepth;
      });
      if (!pool.length) pool = hooks.monsters.filter(function (spec) { return !spec.boss && spec.ai !== 'summoner' && roles.indexOf(spec.ai) >= 0; });
      if (!pool.length) return 0;
      var slots = actor.spawnCells || shuffledSlots(actor, 1, actor.structure ? 3 : 4), born = 0;
      for (var i = 0; i < slots.length && born < count; i++) {
        var slot = slots[i];
        if (blocked(slot.x, slot.y, actor)) continue;
        var child = hooks.spawn(pool[Math.floor(random() * pool.length)], slot.x, slot.y, game.depth);
        child.elite = false;
        child.hp = Math.max(8, Math.round(child.hp * (actor.structure === 'egg' ? 1.25 : .85)));
        child.maxHp = child.hp;
        child.atk = Math.max(2, Math.round(child.atk * (actor.structure === 'egg' ? 1.2 : 1)));
        child.xp = 0;
        child.name = (actor.structure === 'egg' ? '孵化·' : '增殖·') + child.spec.name;
        affiliate(child, actor);
        born++;
      }
      return born;
    }

    function egg(actor) {
      var slot = shuffledSlots(actor, 1, 3)[0];
      if (!slot || game.allies.filter(handles).length >= 64) return;
      var rootActor = game.allies.find(function (other) { return other.uid === actor.hackedRootUid; }) || actor;
      var hp = Math.max(18, Math.round((rootActor.maxHp || 100) * .055));
      var spec = { id: 'cyber_egg', name: '生化卵', ai: 'structure', glyph: 'hex', color: actor.color, onDeath: 'none', cooldown: 3 };
      affiliate({ spec: spec, id: spec.id, name: spec.name, ai: 'structure', structure: 'egg', glyph: 'hex',
        x: slot.x, y: slot.y, hp: hp, maxHp: hp, atk: rootActor.atk || 6, def: 0, xp: 0,
        range: 0, cd: 0, tick: 0, stun: 0, boss: false, elite: false, buffs: [], burn: 0,
        incubation: 3, brain: { step: 0, stance: '孵育' } }, actor);
    }

    function melee(actor, target) {
      if (hit(actor, target, actor.atk + Math.floor(random() * 3) - 1)) hooks.burst(target.x, target.y, actor.color || color, 5);
    }

    function heal(actor, target, amount) {
      var restored = Math.min(target.maxHp - target.hp, amount);
      if (target === hooks.player() && hooks.healPlayer) restored = hooks.healPlayer(amount, true);
      else target.hp += restored;
      game.beams.push({ x0: actor.x + .5, y0: actor.y + .5, x1: target.x + .5, y1: target.y + .5,
        life: 230, max: 230, color: actor.color || color });
      if (restored) hooks.float(target.x, target.y, '+' + restored, actor.color || color);
    }

    function support(actor, tier) {
      if (actor.cd <= 0) {
        friends().filter(function (friend) { return friend !== actor && !friend.structure && distance(actor, friend) <= 5 && hooks.los(actor.x, actor.y, friend.x, friend.y); })
          .sort(function (a, b) { return a.hp / a.maxHp - b.hp / b.maxHp; }).slice(0, tier >= 2 ? 2 : 1).forEach(function (friend) {
            heal(actor, friend, Math.round(4 + actor.atk * 1.2));
            if (tier >= 2) friend.shieldT = 2;
          });
        actor.cd = actor.spec.cooldown || 3;
      }
      if (tier >= 2 && actor.tick % 8 === 0 && (game.hackedCorpses || []).length) {
        var corpse = game.hackedCorpses.pop();
          if (corpse.spec.ai !== 'summoner' && (!hooks.summonedCount || hooks.summonedCount(actor) < hooks.summonLimit(actor)) && !blocked(corpse.x, corpse.y, actor) && game.allies.filter(handles).length < 64) {
          var revived = hooks.spawn(corpse.spec, corpse.x, corpse.y, game.depth);
          revived.hp = Math.max(1, Math.round(revived.hp * .6));
          revived.maxHp = revived.hp;
          revived.name = '重构·' + revived.spec.name;
          affiliate(revived, actor);
        }
      }
    }

    function special(actor, target, psychic) {
      var kit = psychic ? actor.psycho : actor.corpKit || actor.npcKit;
      if (!kit || !actor.alerted || actor.neutral) return false;
      if (--kit.cd > 0 || distance(actor, target) > (psychic ? 6 : 7)) return false;
      var mod = psychic
        ? kit.mods.map(function (id) { return hooks.mods[id]; }).filter(function (entry) { return entry && entry.active; })[0]
        : hooks.mods[kit.mods[kit.i++ % kit.mods.length]];
      if (!mod || !mod.active) return false;
      var type = mod.active.type, name = mod.active.name;
      kit.cd = 3;
      hooks.float(actor.x, actor.y, '「' + name + '」', actor.color || color, true);
      var ranged = psychic ? /^(beam|multi|arc)$/.test(type) : /beam|multi|arc|airstrike|audit/.test(type);
      if (ranged) {
        queue(actor, (psychic ? 'psy-' : 'corp-') + type, name,
          type === 'kh_airstrike' ? hooks.area(target.x, target.y, 1) : hooks.line(actor, 9, target.x, target.y),
          type === 'kh_airstrike' ? 2 : 1, Math.round(actor.atk * 1.5));
      } else if (type === 'blink' || type === 'sandevistan') {
        var land = adjacent(target, actor);
        if (land) { hooks.burst(actor.x, actor.y, actor.color, 12); actor.x = land.x; actor.y = land.y; melee(actor, target); }
      } else if (psychic ? /^(shield|grow|stealth|heal_stealth|mech)$/.test(type) : /shield|grow|drone|stealth|heal/.test(type)) {
        actor.shieldT = 3;
        heal(actor, actor, Math.round(actor.maxHp * .12));
      } else if (!psychic && type === 'mb_parasite') {
        if (distance(actor, target) <= 4) heal(actor, actor, hit(actor, target, Math.round(actor.atk * .9), 0));
      } else if (!psychic && (type === 'mb_split' || type === 'mine')) summon(actor, 1, ['chase', 'charger']);
      else if (!psychic && type === 'dome_nda') {
        target.buffs = target.buffs || [];
        var slow = target.buffs.find(function (buff) { return buff.id === 'slow'; });
        if (slow) slow.turns = Math.max(slow.turns, 2);
        else target.buffs.push({ id: 'slow', turns: 2, pool: 0, source: '保密协议' });
      } else queue(actor, psychic ? 'psy-burst' : 'corp-burst', name, hooks.area(actor.x, actor.y, 2), 1, Math.round(actor.atk * 1.7));
      return true;
    }

    function status(actor, target) {
      if (actor.parasite) {
        var drained = receive(actor, actor.parasite.dmg, hooks.player());
        if (hooks.healPlayer) hooks.healPlayer(drained, true);
        if (--actor.parasite.turns <= 0) actor.parasite = null;
      }
      if (actor.hp <= 0) return true;
      if (actor.burn > 0) { actor.hp -= 2; actor.burn--; }
      if (actor.hp <= 0) { remove(actor); return true; }
      if (actor.bleedStacks > 0) { actor.hp -= actor.bleedStacks; actor.bleedStacks--; }
      if (actor.hp <= 0) { remove(actor); return true; }
      if (actor.igniteT > 0) { actor.igniteT--; receive(actor, actor.igniteDmg || 1, actor); }
      if (actor.hp <= 0) return true;
      if (actor.cd > 0) actor.cd--;
      if (actor.shieldT > 0) actor.shieldT--;
      if (actor.vulnT > 0) actor.vulnT--;
      if (actor.stun > 0) { actor.stun--; actor.intent = null; actor.phaseT = 0; actor.brain.stance = '神经中断'; return true; }
      if (actor.disarmT > 0) {
        actor.disarmT--; actor.intent = null; actor.brain.stance = '缴械';
        if (target && distance(actor, target) > 1) move(actor, target);
        return true;
      }
      if (actor.frenzyT > 0) {
        actor.frenzyT--; actor.intent = null; actor.brain.stance = '失控';
        var victim = nearest(actor, opponents().concat(friends()), 6);
        if (victim && distance(actor, victim) <= 1) hit(actor, victim, Math.max(1, Math.round(actor.atk * 1.4)), 0);
        else if (victim) {
          var x = actor.x + Math.sign(victim.x - actor.x), y = actor.y + Math.sign(victim.y - actor.y);
          if (!blocked(x, y, actor)) { actor.x = x; actor.y = y; }
        }
        return true;
      }
      return false;
    }

    function berserk(actor) {
      var victim = nearest(actor, opponents().filter(function (enemy) { return !enemy.structure; }), 8);
      if (!victim || distance(actor, victim) >= distance(actor, hooks.player())) return false;
      if (distance(actor, victim) <= 1) {
        hit(actor, victim, Math.round(actor.atk * 2), 0, true);
        hooks.burst(victim.x, victim.y, actor.color || color, 8);
        return true;
      }
      var dx = Math.sign(victim.x - actor.x), dy = Math.sign(victim.y - actor.y);
      var steps = [[dx, dy], [dx, 0], [0, dy]];
      for (var i = 0; i < steps.length; i++) {
        var x = actor.x + steps[i][0], y = actor.y + steps[i][1];
        if ((steps[i][0] || steps[i][1]) && !blocked(x, y, actor)) { actor.x = x; actor.y = y; return true; }
      }
      return false;
    }

    function act(actor) {
      if (!handles(actor)) return false;
      if (!alive(actor)) { remove(actor); return true; }
      actor.brain = actor.brain || { step: 0, stance: '巡游' };
      hooks.uid(actor);
      var target = nearest(actor, opponents(), Infinity);
      if (target) {
        actor.combatTargetUid = hooks.uid(target);
        actor.facing = Math.atan2(target.y - actor.y, target.x - actor.x);
      }
      if (status(actor, target)) return true;
      if (target && !actor.intent && actor.psycho && special(actor, target, true)) return true;
      if (target && !actor.intent && (actor.corpKit || actor.npcKit) && special(actor, target, false)) return true;
      actor.tick = (actor.tick || 0) + 1;
      if (actor.berserk && berserk(actor)) return true;
      if (actor.structure) {
        var parent = game.allies.find(function (other) { return other.uid === actor.ownerId && alive(other); });
        if (!parent) { actor.hp = 0; remove(actor, true); return true; }
        if (actor.structure === 'egg' && --actor.incubation <= 0) {
          actor.spawnRoles = ['tank', 'summoner', 'charger'];
          if (summon(actor, 1)) { actor.hp = 0; remove(actor, true); }
        }
        return true;
      }
      if (resolve(actor, target)) return true;
      var tier = Math.max(1, Math.ceil((actor.spec.minDepth || game.depth) / 5));
      if (!target) {
        if (actor.ai === 'healer') support(actor, tier);
        if (actor.ai !== 'turret' && hooks.player()) move(actor, hooks.player());
        return true;
      }
      var d = distance(actor, target);
      if (actor.ai === 'turret') {
        if (actor.cd <= 0 && d <= (actor.range || 5) + tier - 1 && hooks.los(actor.x, actor.y, target.x, target.y)) {
          var shots = tier === 1 ? 2 : 3;
          for (var i = 0; i < shots && alive(actor); i++) laser(actor, target.x + (i === 2 ? 1 : 0), target.y, Math.round(actor.atk * (tier === 1 ? .65 : .7)));
          actor.cd = actor.spec.cooldown || 2;
        }
      } else if (actor.ai === 'charger') {
        if (actor.cd <= 0 && d <= 7 && hooks.los(actor.x, actor.y, target.x, target.y)) {
          queue(actor, 'charge', actor.tick % 2 ? '快撞' : '压簧回冲', hooks.line(actor, 5 + tier, target.x, target.y),
            actor.tick % 2 ? 1 : 2, actor.atk * 1.7, { track: actor.tick % 2 === 0, cooldown: 2, aftershock: tier >= 3 });
        } else if (d <= 1) melee(actor, target);
        else { move(actor, target); if (tier >= 2) move(actor, target); }
      } else if (actor.ai === 'exploder') {
        if (d <= 1) queue(actor, 'explode', '引信过热', hooks.area(actor.x, actor.y, tier >= 3 ? 2 : 1), 1, actor.atk * 1.8);
        else { move(actor, target); if (tier >= 2 && actor.tick % 2 === 0) move(actor, target); }
      } else if (actor.ai === 'summoner') {
        if (actor.cd <= 0 && d <= 10) {
          summon(actor, tier >= 3 ? 2 : 1, tier >= 2 ? ['chase', 'healer', 'summoner', 'charger'] : ['chase', 'exploder']);
          actor.cd = actor.spec.cooldown || 4;
        }
        if (tier >= 2 && actor.tick % 7 === 0 && children(actor).filter(function (child) { return child.structure === 'egg'; }).length < 2) egg(actor);
        if (d <= 2) move(actor, target, true); else if (d > 7) move(actor, target);
      } else if (actor.ai === 'healer') {
        support(actor, tier);
        if (d <= 2) move(actor, target, true); else if (d > 6) move(actor, target);
      } else if (actor.ai === 'tank') {
        actor.guard = .55;
        actor.guardAt = 0;
        if (d <= 2 && actor.cd <= 0) queue(actor, 'hammer', '液压落锤', hooks.area(actor.x, actor.y, 2), 2, actor.atk * 2.2, { cooldown: 3, aftershock: tier >= 2 });
        else if (d <= 1) melee(actor, target);
        else if (actor.tick % 2 === 0) move(actor, target);
      } else {
        if (tier >= 3 && d > 2 && d <= 6 && actor.tick % 4 === 0) {
          var flank = adjacent(target, actor);
          if (flank) { hooks.burst(actor.x, actor.y, actor.color, 8); actor.x = flank.x; actor.y = flank.y; }
        } else if (d > 1) { move(actor, target); if (tier >= 2 && actor.tick % 3 === 0) move(actor, target); }
        if (distance(actor, target) <= 1) melee(actor, target);
      }
      return true;
    }

    return { capture: capture, handles: handles, alive: alive, act: act, receive: receive, remove: remove,
      tickFields: tickFields, fields: function () { return game.hackedFields || []; } };
  }

  var api = { create: create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NeonHackedUnits = api;
})(typeof window === 'undefined' ? globalThis : window);
