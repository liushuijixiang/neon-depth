'use strict';
/* Apply ONLY the cyber/stat/PLAYER outgoing-damage fixes to current game.js.
 * Parent executes: node tools/cyber-power-patch.js [--check]
 * --check parses/transforms in memory without writing. Safe to run twice.
 * Does NOT replace damageEnemy/previewEnemyDamage or enemy/tactical/visual logic.
 * Contract: playerHit(e, raw, opts) receives specialty-scaled damage BEFORE DEF;
 * ordinary DEF and crit/execute are applied once, then damageEnemy applies the
 * parent's enemy-side mitigation once. Returns {damage, crit, raw}.
 * outgoingDamage is deterministic/no mutation/no RNG; preview calls supply a roll.
 * Blood-burst's aggregate 40% and ghost blood-blade's fixed heal replace generic
 * lifesteal for those attacks. Nano bullets retain their separate fixed +6 heal.
 */
const fs = require('fs');
const path = require('path');
let acorn;
try { acorn = require('acorn'); } catch (_) { acorn = require('/root/workspace/neon-tooling/node_modules/acorn'); }
const file = path.resolve(__dirname, '..', 'game.js');
let source = fs.readFileSync(file, 'utf8');
const MARKER = '// CYBER_POWER_PIPELINE_V1';
if (source.includes(MARKER)) { console.log('Cyber power patch already applied.'); process.exit(0); }
const touched = [];
function tree() { return acorn.parse(source, { ecmaVersion: 'latest' }).body[0].expression.callee.body.body; }
function rewrite(name, transform) {
  const list = tree().filter(n => n.type === 'FunctionDeclaration' && n.id.name === name);
  if (list.length !== 1) throw Error('Expected one function: ' + name + ', got ' + list.length);
  const n = list[0], before = source.slice(n.start, n.end), after = typeof transform === 'string' ? transform : transform(before);
  if (before === after) throw Error('No change for ' + name);
  source = source.slice(0, n.start) + after + source.slice(n.end); touched.push(name);
}
function replaceOnce(s, before, after, label) {
  const at = s.indexOf(before);
  if (at < 0 || s.indexOf(before, at + before.length) >= 0) throw Error('Expected exact unique fragment: ' + (label || before.slice(0, 80)));
  return s.slice(0, at) + after + s.slice(at + before.length);
}
rewrite('calcMods', s => replaceOnce(s, '  return m;', `  // Installed chip main stats AND affixes are derived on every recalc.
  // Never mutate itemAtk/itemMax/runMod with chip values: swaps must be reversible.
  var chips = chipStats();
  Object.keys(chips).forEach(function (key) {
    var stat = key === 'hp' ? 'maxHp' : key;
    m[stat] = (m[stat] || 0) + chips[key];
  });
  return m;`));
rewrite('chipStats', `function chipStats() {
  var out = { atk: 0, hp: 0, def: 0, crit: 0, dodge: 0, execute: 0 };
  function addChipStat(entry) {
    if (!entry || out[entry.stat] === undefined) return;
    var value = Number(entry.val);
    if (Number.isFinite(value)) out[entry.stat] += value;
  }
  Object.keys(G.cyber || {}).forEach(function (slot) {
    var mod = MOD_BY[G.cyber[slot]];
    if (!mod || !slotAccepts(mod, slot)) return;
    var cap = (QUALITY[mod.quality] || QUALITY.gray).slots;
    var chips = (G.cyberChips || {})[slot];
    (Array.isArray(chips) ? chips : []).slice(0, cap).forEach(function (c) {
      addChipStat(c);
      (c && Array.isArray(c.affixes) ? c.affixes : []).forEach(addChipStat);
    });
  });
  return out;
}`);
rewrite('startGame', s => replaceOnce(s, `  var cs = chipStats();
  p.itemAtk += cs.atk; p.itemMax += cs.hp; p.itemDef += cs.def;
  G.runMod.crit = (G.runMod.crit || 0) + cs.crit;
  G.runMod.dodge = (G.runMod.dodge || 0) + cs.dodge;
  G.runMod.execute = (G.runMod.execute || 0) + cs.execute;
`, ''));
rewrite('gunBase', `function gunBase() {
  // p.atk carries item/meta/training ATK. Keep the gun's original base offset (-1).
  return p.atk - 1 + 2 * gunLvl('dmg') + G.mod.atk + buffStat('atk');
}`);
rewrite('buffStat', s => replaceOnce(s, 'var d = BUFF[b.id] || b.def;', 'var d = b.def || BUFF[b.id];'));

const helpers = `${MARKER}
// raw is attack-specific damage BEFORE ordinary enemy DEF; enemy mitigation is
// exclusively owned by damageEnemy. This helper never rolls RNG or changes state.
function outgoingDamage(raw, e, opts) {
  opts = opts || {};
  var n = Math.max(0, Number(raw) || 0);
  var chance = 0.1 + (G.mod.crit || 0);
  var roll = opts.critRoll == null ? 1 : opts.critRoll;
  var critical = opts.crit !== false && (opts.forceCrit === true || chance >= 1 || roll < chance);
  if (opts.execute !== false && e && e.hp < e.maxHp * 0.35) n *= 1 + (G.mod.execute || 0);
  if (critical) n *= 1.7 + (G.mod.critMult || 0);
  var boosted = n;
  if (!opts.ignoreDef && e) n -= Math.max(0, e.def || 0);
  return { amount: Math.max(1, Math.round(n)), crit: critical, raw: boosted };
}
function onPlayerDamage(e, dealt, opts) {
  opts = opts || {};
  if (!(dealt > 0) || opts.lifesteal === false) return;
  var rate = opts.lifestealRate == null ? (G.mod.lifesteal || 0) : opts.lifestealRate;
  if (rate > 0) healPlayer(Math.max(1, Math.round(dealt * rate)), true);
}
function playerHit(e, raw, opts) {
  opts = opts || {};
  if (!e || e.hp <= 0) return { damage: 0, crit: false, raw: 0 };
  var calculation = Object.assign({}, opts);
  if (calculation.critRoll == null) calculation.critRoll = Math.random();
  var hit = outgoingDamage(raw, e, calculation);
  var dealt = damageEnemy(e, hit.amount, opts.origin || p);
  onPlayerDamage(e, dealt, opts);
  if (dealt > 0) G.lastHit = { x: e.x, y: e.y, crit: hit.crit, source: opts.source || 'player',
    damage: dealt, born: performance.now(), origin: { x: (opts.origin || p).x, y: (opts.origin || p).y } };
  return { damage: dealt, crit: hit.crit, raw: hit.raw };
}

`;
source = replaceOnce(source, 'function playerAttack(e) {', helpers + 'function playerAttack(e) {');
rewrite('playerAttack', `function playerAttack(e) {
  if (G.sandev) endSandev();
  var mw = meleeWeapon(), prof = mw ? mw.melee : null;
  if (!G.melee) G.melee = { charge: 0, combo: 0, step: 0 };
  var charged = !!(prof && prof.type === 'charge' && G.melee.charge > 0), meleeBonus = 1;
  if (prof) {
    if (charged) meleeBonus *= 1.5 + 0.5 * G.melee.charge;
    if (prof.type === 'combo') meleeBonus *= 1 + 0.12 * (G.melee.combo || 0);
    if (prof.type === 'alternate') meleeBonus *= 1 + 0.08 * ((G.melee.step || 0) % 3);
  }
  var critRoll = Math.random();
  var raw = Math.max(1, effAtk() + rnd(3) - 1) * comboMul() * ghostCritMul() * meleeBonus;
  var firstStrike = classDef().id === 'ghost' && !e.alerted;
  var wasStealthed = G.stealth > 0;
  if (wasStealthed) { raw *= 1.8 + (G.specF.stealthDmg || 0); G.stealth = 0; }
  function targetRaw(target, scale) {
    var n = raw * scale;
    if (target.boss) n *= 1.5;
    if (classDef().id === 'ghost' && !target.alerted) n *= 1.5 + (G.mod.backstab || 0);
    return n;
  }
  var primaryRaw = targetRaw(e, 1);
  if (classDef().id === 'ghost') { G.ghostStealth = 0; G.ghostRevealed = true; addInstab(6); }
  if (firstStrike) float(e.x, e.y, '先手', C.amber, true);
  var hit = playerHit(e, primaryRaw, { source: 'melee', critRoll: critRoll });
  var dmg = hit.damage, crit = hit.crit;
  e.alerted = true;
  sfx.hit(); vibrate(6);
  burst(e.x, e.y, crit ? C.amber : e.color, crit ? 14 : 8);
  float(e.x, e.y, (crit ? '暴击 ' : '') + '-' + dmg, crit ? C.amber : '#ff8fc7', crit);
  if (prof) {
    var wantArc = charged || prof.type === 'arc' || (prof.type === 'combo' && (G.melee.combo || 0) >= 2) || (prof.type === 'alternate' && (G.melee.step || 0) % 2 === 1);
    var extraTargets = wantArc ? G.enemies.filter(function (o) {
      return o !== e && o.hp > 0 && Math.max(Math.abs(o.x - p.x), Math.abs(o.y - p.y)) <= 2;
    }) : [];
    extraTargets.forEach(function (o) {
      // Derive from the attack, NOT the primary target's post-armor damage.
      var splash = playerHit(o, targetRaw(o, 0.55 * (prof.mult || 1)), { source: 'melee-splash', critRoll: critRoll });
      o.alerted = true;
      burst(o.x, o.y, prof.color || C.pink, 8);
      float(o.x, o.y, '-' + splash.damage, prof.color || '#ff8fc7');
      if (o.hp <= 0) killEnemy(o);
    });
    if (prof.type === 'combo') G.melee.combo = (G.melee.combo || 0) + 1;
    if (prof.type === 'alternate') G.melee.step = (G.melee.step || 0) + 1;
    if (charged) G.melee.charge = 0;
    G.slash = { x: e.x, y: e.y, face: Math.atan2(e.y - p.y, e.x - p.x), born: performance.now(), color: prof.color || '#ff8fc7', wide: wantArc };
    G.hitStopUntil = Date.now() + 70; G.shake = Math.max(G.shake, 7);
  }
  if (e.hp <= 0) killEnemy(e);
}`);
rewrite('shootAt', s => {
  s = replaceOnce(s, `    if (G.mods.execute && target.hp < target.maxHp * 0.3) dmg *= 1.3;
    var crit = Math.random() < (0.1 + (G.mod.crit || 0));
    if (crit) dmg *= (1.7 + (G.mod.critMult || 0));
    dmg = Math.round(dmg * comboMul());
    if (special !== 'pierce') dmg = Math.max(1, dmg - target.def);
    dmg = damageEnemy(target, dmg);`, `    var hit = playerHit(target, dmg * comboMul(), { source: 'gun', ignoreDef: special === 'pierce' });
    dmg = hit.damage;
    var crit = hit.crit;`);
  s = replaceOnce(s, `          var bd = Math.max(1, 4 - en.def);
          bd = damageEnemy(en, bd);`, `          var bd = playerHit(en, 4, { source: 'gun-burst' }).damage;`);
  s = replaceOnce(s, `      var pd = Math.max(1, Math.round(gunBase() * 0.7) - second.def);
      pd = damageEnemy(second, pd);`, `      var pd = playerHit(second, gunBase() * 0.7, { source: 'gun-pierce' }).damage;`);
  return s;
});
rewrite('ghostRawDamage', `function ghostRawDamage(k, e) {
  var a = effAtk(), hidden = ghostHidden();
  var mult = k === 'assassinate' ? 2.6 * (hidden ? 1.4 : 1) : k === 'execute' ? 3 + (e.marks || 1) * 1.2 : k === 'chase' ? 1.8 * (hidden ? 1.5 : 1) : 1.5;
  return Math.max(1, a * mult);
}`);
rewrite('ghostSkillDamage', `function ghostSkillDamage(k, e) {
  // Never promise a kill that needs a random crit. Guaranteed crit builds count.
  var hit = outgoingDamage(ghostRawDamage(k, e), e, { critRoll: 1 });
  return previewEnemyDamage(e, hit.amount);
}`);
rewrite('ghostAct', s => replaceOnce(s, `    var dmg = damageEnemy(target,raw), stacks = target.marks || 1;`, `    var hit = playerHit(target, raw, { source: 'ghost-' + k, lifesteal: k !== 'blood' });
    var dmg = hit.damage, stacks = target.marks || 1;`));
rewrite('useCyberActive', s => {
  s = replaceOnce(s, '  G.cyberCd[id] = a.cd;', '  G.cyberCd[id] = Math.max(1, a.cd - (G.mods.cooldown_core ? 1 : 0));');
  s = replaceOnce(s, '  G.flash = 0.5;\n', '');
  s = replaceOnce(s, `  sfx.hit();
  if (a.type === 'sandevistan')`, `  sfx.hit();
  function cyberFeedback() { G.cyberFx = { type: a.type, born: performance.now(), x: p.x, y: p.y,
    color: ACT_COLOR[a.type] || C.cyan, power: base, level: lv, id: id }; }
  function finishSupport() { cyberFeedback(); gainCyberXp(id, 1); updateHUD(); endTurn(); }
  if (a.type === 'sandevistan')`);
  s = replaceOnce(s, '    gainCyberXp(id, 1);\n', '');
  // These are the nine successful non-generic-hit exits. Each earns one use XP.
  const exits = s.match(/updateHUD\(\); endTurn\(\); return;/g) || [];
  if (exits.length !== 9) throw Error('Support branch shape changed: expected 9 exits, got ' + exits.length);
  s = s.replace(/updateHUD\(\); endTurn\(\); return;/g, 'finishSupport(); return;');
  s = replaceOnce(s, `    updateHUD();
    endTurn();
    return;`, `    finishSupport();
    return;`);
  s = replaceOnce(s, `        var wd = Math.max(1, Math.round(effAtk() * (0.8 + lv * 0.2)) - en.def);
        wd = damageEnemy(en, wd);`, `        var wd = playerHit(en, effAtk() * (0.8 + lv * 0.2), { source: 'cyber-wall' }).damage;`);
  s = replaceOnce(s, `    addBuff('grow', 5);`, `    p.buffs.push({ id: 'grow', turns: 5, pool: 0, def: { kind: 'atk', name: '巨化', color: C.amber,
      amount: 3 + (lv - 1) * 2 + (G.mods.grow_giant ? 6 : 0), desc: '义体巨化' } });`);
  s = replaceOnce(s, `  if (a.type === 'blink') {
    for (var i = 1; i <= 4; i++) {
      var nx = p.x + dx * i, ny = p.y + dy * i;`, `  if (a.type === 'blink') {
    var originX = p.x, originY = p.y;
    for (var i = 1; i <= 4; i++) {
      var nx = originX + dx * i, ny = originY + dy * i;`);
  s = replaceOnce(s, `          var lx = p.x + dx * (i + q), ly = p.y + dy * (i + q);`, `          var lx = originX + dx * (i + q), ly = originY + dy * (i + q);`);
  s = replaceOnce(s, `          if (G.map[ly][lx] === WALL) continue;`, `          if (G.map[ly][lx] === WALL || enemyAt(lx, ly) || wallAt(lx, ly)) continue;`);
  s = replaceOnce(s, `      p.x = nx; p.y = ny;
    }
    burst(p.x, p.y, C.violet, 18);`, `      if (enemyAt(nx, ny) || wallAt(nx, ny)) break;
      p.x = nx; p.y = ny;
    }
    computeFOV();
    burst(p.x, p.y, C.violet, 18);`);
  s = replaceOnce(s, `    var d = Math.max(1, base - e.def);
    d = damageEnemy(e, d); e.alerted = true; dealt += d;`, `    var hit = playerHit(e, base, { source: 'cyber-' + id, lifesteal: !stealType });
    var d = hit.damage; e.alerted = true; dealt += d;`);
  s = replaceOnce(s, `    float(e.x, e.y, '-' + d, C.red, true);`, `    float(e.x, e.y, (hit.crit ? '暴击 ' : '') + '-' + d, hit.crit ? C.amber : C.red, true);`);
  s = replaceOnce(s, `  if (killed > 0) gainCyberXp(id, killed);`, `  cyberFeedback();
  if (killed > 0) gainCyberXp(id, killed);`);
  return s;
});
rewrite('fireLaser', s => replaceOnce(s, `      var dmg = Math.max(1, Math.round(effAtk() * 2) - e.def);
      dmg = damageEnemy(e, dmg);`, `      var dmg = playerHit(e, effAtk() * 2, { source: 'mech-laser', origin: p }).damage;`));
rewrite('mechShock', s => replaceOnce(s, `    var dmg = Math.max(1, Math.round(effAtk() * 1.5) - en.def);
    dmg = damageEnemy(en, dmg);`, `    var dmg = playerHit(en, effAtk() * 1.5, { source: 'mech-shock', origin: p }).damage;`));
rewrite('mechMissiles', s => replaceOnce(s, `    var dmg = Math.max(1, Math.round(effAtk() * 1.2) - en.def);
    dmg = damageEnemy(en, dmg);`, `    var dmg = playerHit(en, effAtk() * 1.2, { source: 'mech-missile', origin: p }).damage;`));
rewrite('assaultShock', s => replaceOnce(s, `    var dmg = Math.max(1, Math.round(gunBase() * 1.4) - en.def);
    dmg = damageEnemy(en, dmg);`, `    var dmg = playerHit(en, gunBase() * 1.4, { source: 'assault-shock', origin: p }).damage;`));
rewrite('alliesAct', s => {
  s = replaceOnce(s, `        var hd = Math.max(1, a.atk);
        hd = damageEnemy(he, hd);`, `        var hd = playerHit(he, Math.max(1, a.atk), { source: 'hacked-ally', origin: a }).damage;`);
  s = replaceOnce(s, `        var dmg = Math.max(1, Math.round(effAtk() * 0.55 * dmul) - e.def);
        dmg = damageEnemy(e, dmg);`, `        var dmg = playerHit(e, effAtk() * 0.55 * dmul, { source: 'drone', origin: a }).damage;`);
  s = replaceOnce(s, `        var td = Math.max(1, 3 + Math.floor(p.level / 2) - e.def);
        td = damageEnemy(e, td);`, `        // Base cannon + 50% of acquired ATK (gear/chips/items/meta/buffs/mech).
        var inheritedAtk = effAtk() - (5 + Math.floor(p.level / 2));
        var td = playerHit(e, 3 + Math.floor(p.level / 2) + inheritedAtk * 0.5, { source: 'turret', origin: a }).damage;`);
  return s;
});
rewrite('abilityEffect', s => {
  s = replaceOnce(s, `      dmg = Math.max(1, Math.round((effAtk() + abilityPower(s)) * mult * comboMul()) - e.def);`, `      dmg = (effAtk() + abilityPower(s)) * mult * comboMul();`);
  s = replaceOnce(s, `      if (G.mods.execute && e.hp < e.maxHp * 0.3) dmg = Math.round(dmg * 1.3);
      dmg = damageEnemy(e, dmg);`, `      dmg = playerHit(e, dmg, { source: 'ability-shot', origin: p }).damage;`);
  s = replaceOnce(s, `          var wd = Math.max(1, 5 - en.def);
          wd = damageEnemy(en, wd);`, `          var wd = playerHit(en, 5, { source: 'ability-wall', origin: p }).damage;`);
  s = replaceOnce(s, `          var bd = Math.max(1, 4 + abilityPower(s) - en.def);
          bd = damageEnemy(en, bd);`, `          var bd = playerHit(en, 4 + abilityPower(s), { source: 'ability-blink', origin: p }).damage;`);
  s = replaceOnce(s, `      dmg = Math.max(1, Math.round((effAtk() * 1.2 + abilityPower(s)) * nmult * comboMul()) - en.def);
      if (G.mods.execute && en.hp < en.maxHp * 0.3) dmg = Math.round(dmg * 1.3);
      dmg = damageEnemy(en, dmg);`, `      dmg = playerHit(en, (effAtk() * 1.2 + abilityPower(s)) * nmult * comboMul(), { source: 'ability-nova', origin: p }).damage;`);
  return s;
});
// Hooks make contract tests deterministic without monkey-patching production code.
source = replaceOnce(source, 'test: { prepScreen: prepScreen,', 'test: { outgoingDamage: outgoingDamage, onPlayerDamage: onPlayerDamage, playerHit: playerHit, gunBase: gunBase, chipStats: chipStats, prepScreen: prepScreen,');
acorn.parse(source, { ecmaVersion: 'latest' });
console.log('Cyber power patch syntax OK; touched:', touched.join(', '));
if (process.argv.includes('--check')) console.log('Dry run only; game.js unchanged.');
else { fs.writeFileSync(file, source); console.log('Applied cyber power patch.'); }
