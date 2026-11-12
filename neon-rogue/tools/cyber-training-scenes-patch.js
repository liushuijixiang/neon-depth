#!/usr/bin/env node
'use strict';

/*
 * Apply AFTER cyber-training-patch.js and the main thread's cyber combat patch.
 * The authoring subagent does not apply this script or alter the base patch.
 *
 * Parent preflight: node tools/cyber-training-scenes-patch.js --check
 * Parent apply:     node tools/cyber-training-scenes-patch.js
 * Pure transform:   require('./cyber-training-scenes-patch').patchSource(source)
 *
 * Adds four training-only helpers, two localized UI/binding edits, and
 * __neon.test.training.scene. It never changes combat formulas, saves, rewards,
 * structure implementation, mainline UI, or the prior training patch file.
 */
const fs = require('fs');
const path = require('path');
const acorn = require('/root/workspace/neon-tooling/node_modules/acorn');

// Serialized into the game's existing IIFE; never called in the Node patcher.
function trainSceneDefinitions() {
  return [
    {
      id: 'hatchery', name: '孵化压力', boss: 'bl_hive', summary: '蜂巢母体 + 3 卵 + 2 巢',
      desc: '在蜂巢母体的原竞技场生成 3 枚生化卵和 2 座增殖巢穴。测试时缓走位、范围清卵、定点拆巢与递归召唤压力；孵化和增殖只在返回战斗后的正常回合发生。',
      groups: [{ kind: 'egg', count: 3, inner: 2, outer: 4, phase: Math.PI / 6 }, { kind: 'nest', count: 2, inner: 4, outer: 7, phase: Math.PI / 2 }]
    },
    {
      id: 'mirror', name: '镜阵压力', boss: 'bl_mirror', summary: '镜渊 + 6 面折光镜',
      desc: '在镜渊的原竞技场布置 6 面斜向交替的真实折光镜。测试贯穿、范围义体与优先拆镜的选择；镜阵由战斗系统正常处理，不伪造反射或攻击数值。',
      groups: [{ kind: 'mirror', count: 6, inner: 3, outer: 6, phase: 0 }]
    },
    {
      id: 'survival', name: '高阶生存', boss: 'bh_eye', summary: '终焉之眼 · 原专属竞技场',
      desc: '进入终焉之眼的原专属竞技场，测试护盾、位移、续航和持续输出。不额外生成结构物，不提高 Boss 或玩家数值。',
      groups: []
    }
  ];
}
function trainSceneSpot(owner, inner, outer, angle) {
  var cells = cyberSlots(owner, inner, outer);
  if (!cells.length) return null;
  var radius = (inner + outer) / 2;
  function score(cell) {
    var dx = cell.x - owner.x, dy = cell.y - owner.y;
    var difference = Math.atan2(dy, dx) - angle;
    var angular = Math.abs(Math.atan2(Math.sin(difference), Math.cos(difference)));
    return angular * 10 + Math.abs(Math.max(Math.abs(dx), Math.abs(dy)) - radius);
  }
  // Real free cells only; angular placement spreads mirrors across the arena.
  cells.sort(function (a, b) { return score(a) - score(b) || a.y - b.y || a.x - b.x; });
  return cells[0];
}
function trainScene(id) {
  if (!trainReady()) return false;
  if (typeof cyberStructure !== 'function' || typeof cyberSlots !== 'function') return false;
  var scene = trainSceneDefinitions().find(function (s) { return s.id === id; });
  if (!scene || !trainBossPool().some(function (b) { return b.id === scene.boss; })) return false;
  var startTurn = G.turn;
  if (!trainBossArena(scene.boss)) return false;
  var owner = G.enemies.find(function (e) { return e.boss && e.id === scene.boss && e.hp > 0; });
  if (!owner) return false;
  tacticUid(owner);
  var created = [], counts = { egg: 0, nest: 0, mirror: 0 }, expected = 0;
  scene.groups.forEach(function (group) {
    expected += group.count;
    for (var i = 0; i < group.count; i++) {
      var angle = group.phase + i * Math.PI * 2 / group.count;
      var spot = trainSceneSpot(owner, group.inner, group.outer, angle);
      if (!spot) continue;
      // cyberStructure assigns original stats, lineage, uid, incubation and pushes
      // to G.enemies itself. Never push twice or substitute a display-only object.
      var structure = cyberStructure(owner, group.kind, spot);
      if (!structure) continue;
      if (group.kind === 'mirror') structure.slant = i % 2 === 0;
      created.push(structure);
      counts[group.kind] = (counts[group.kind] || 0) + 1;
    }
  });
  var complete = created.length === expected;
  var u = trainUIState(); u.panel = 'enemies'; u.enemyGroup = 'boss'; u.stage = 'all';
  G.menuTab = 'train';
  trainRefresh(true);
  // UI buttons keep the menu open; API calls from the field reopen the same panel.
  if (G.modal !== 'menu') openMenu('train');
  toast(scene.name + (complete ? ' · 已就绪，配装后返回战斗' : ' · 空位不足，请检查场地'), complete ? 'good' : 'warn');
  return {
    id: scene.id, boss: owner, created: created, counts: counts,
    complete: complete, expected: expected, turnBefore: startTurn, turnAfter: G.turn
  };
}
function trainScenesHTML() {
  var scenes = trainSceneDefinitions();
  var h = '<div class="tr-entry"><strong>义体压力场景 · 快捷布场</strong><div class="tr-actions">';
  scenes.forEach(function (scene) {
    h += '<button class="tab" data-tr-scene="' + trainEsc(scene.id) + '" title="' + trainEsc(scene.summary) + '">' + trainEsc(scene.name) + '</button>';
  });
  h += '</div><div class="tr-note">替换当前场地并清除敌我单位/障碍；保留配装与生命，不推进回合。可继续在菜单自由配装，点返回再开战。</div><details><summary>查看场景内容与测试方向</summary>';
  scenes.forEach(function (scene) {
    h += '<p><b>' + trainEsc(scene.summary) + '</b><br>' + trainEsc(scene.desc) + '</p>';
  });
  return h + '<p>沿用真实结构物和 Boss 原有属性/行为，不额外治疗、不重置冷却、不发核心。</p></details></div>';
}

const helpers = [trainSceneDefinitions, trainSceneSpot, trainScene, trainScenesHTML];
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  Object.keys(node).forEach(function (key) {
    var value = node[key];
    if (Array.isArray(value)) value.forEach(function (child) { if (child && typeof child.type === 'string') walk(child, visit); });
    else if (value && typeof value.type === 'string') walk(value, visit);
  });
}
function propertyName(property) {
  return property && property.key && (property.key.type === 'Identifier' ? property.key.name : property.key.value);
}
function patchSource(source) {
  const ast = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
  const functions = new Map(), exports = [];
  walk(ast, function (node) {
    if (node.type === 'FunctionDeclaration' && node.id) {
      const list = functions.get(node.id.name) || [];
      list.push(node); functions.set(node.id.name, list);
    }
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && !node.left.computed && node.left.object.type === 'Identifier' && node.left.object.name === 'window' && node.left.property.name === '__neon') exports.push(node.right);
  });
  function uniqueFunction(name) {
    const nodes = functions.get(name) || [];
    if (nodes.length !== 1) throw new Error('Expected one ' + name + '; apply base training and main-thread combat patches first (found ' + nodes.length + ')');
    return nodes[0];
  }
  [
    'trainReady', 'trainBossArena', 'trainBossPool', 'trainRefresh', 'trainUIState', 'trainEsc',
    'trainEnemiesHTML', 'bindTrainingMenu', 'cyberStructure', 'cyberSlots', 'cyberRoot', 'tacticUid'
  ].forEach(uniqueFunction);
  helpers.forEach(function (fn) { if (functions.has(fn.name)) throw new Error('Scene helper already exists (already applied or conflict): ' + fn.name); });
  const edits = [];
  const enemyHTML = uniqueFunction('trainEnemiesHTML');
  edits.push({ start: enemyHTML.start, end: enemyHTML.start, text: '/* Training pressure scenes: use real cyber combat structures. */\n' + helpers.map(function (fn) { return fn.toString(); }).join('\n') + '\n', label: 'four new training scene helpers' });
  function localLiteral(functionName, before, after) {
    const node = uniqueFunction(functionName), text = source.slice(node.start, node.end);
    const index = text.indexOf(before);
    if (index < 0 || text.indexOf(before, index + 1) >= 0) throw new Error('Local scene insertion anchor changed in ' + functionName + '; refusing broad replacement');
    edits.push({ start: node.start + index, end: node.start + index + before.length, text: after, label: functionName + ' local scene insertion only' });
  }
  localLiteral('trainEnemiesHTML', "var h = '<div class=\"tr-fields\">'", "var h = trainScenesHTML() + '<div class=\"tr-fields\">'");
  const binding = "bind('[data-tr-bossarena]', 'data-tr-bossarena', trainBossArena);";
  localLiteral('bindTrainingMenu', binding, binding + "\n  bind('[data-tr-scene]', 'data-tr-scene', trainScene);");
  if (exports.length !== 1 || exports[0].type !== 'ObjectExpression') throw new Error('Expected one window.__neon export');
  function uniqueObjectProperty(object, key) {
    const matches = object.properties.filter(function (prop) { return propertyName(prop) === key; });
    if (matches.length !== 1 || matches[0].value.type !== 'ObjectExpression') throw new Error('Expected one object property ' + key);
    return matches[0].value;
  }
  const training = uniqueObjectProperty(uniqueObjectProperty(exports[0], 'test'), 'training');
  if (training.properties.some(function (prop) { return propertyName(prop) === 'scene'; })) throw new Error('__neon.test.training.scene already exists');
  const tail = training.properties[training.properties.length - 1];
  const trailingComma = tail && source.slice(tail.end, training.end - 1).includes(',');
  edits.push({ start: training.end - 1, end: training.end - 1, text: (tail && !trailingComma ? ', ' : '') + 'scene: trainScene ', label: '__neon.test.training.scene API only' });
  edits.sort(function (a, b) { return a.start - b.start; });
  for (let i = 1; i < edits.length; i++) if (edits[i].start < edits[i - 1].end) throw new Error('Overlapping scene patch edits');
  let output = source;
  edits.slice().reverse().forEach(function (edit) { output = output.slice(0, edit.start) + edit.text + output.slice(edit.end); });
  const result = acorn.parse(output, { ecmaVersion: 'latest', sourceType: 'script' }), counts = new Map();
  walk(result, function (node) { if (node.type === 'FunctionDeclaration' && node.id) counts.set(node.id.name, (counts.get(node.id.name) || 0) + 1); });
  helpers.forEach(function (fn) { if (counts.get(fn.name) !== 1) throw new Error('Postflight duplicate/missing scene helper: ' + fn.name); });
  return { source: output, changes: edits.map(function (edit) { return { label: edit.label, start: edit.start, end: edit.end }; }) };
}
module.exports = { patchSource };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some(function (arg) { return arg !== '--check'; })) throw new Error('Usage: node tools/cyber-training-scenes-patch.js [--check]');
  const target = path.resolve(__dirname, '..', 'game.js');
  const before = fs.readFileSync(target, 'utf8');
  const result = patchSource(before);
  if (!args.includes('--check')) {
    if (fs.readFileSync(target, 'utf8') !== before) throw new Error('game.js changed during scene preflight; retry on latest source');
    fs.writeFileSync(target, result.source, 'utf8');
  }
  console.log(JSON.stringify({ mode: args.includes('--check') ? 'check-only; no files written' : 'applied', target: target, changes: result.changes, api: 'window.__neon.test.training.scene', sceneIds: ['hatchery', 'mirror', 'survival'] }, null, 2));
}
