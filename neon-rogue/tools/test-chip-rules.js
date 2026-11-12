const assert = require('node:assert/strict');
const rules = require('../chip-rules');
const tests = [];
function test(name, run) { run(); tests.push(name); }
const chip = (quality, stat, val, affixes = []) => ({ quality, stat, val, affixes });

test('Quality is the default descending order', () => {
  const entries = [chip('blue', 'hp', 9), chip('red', 'def', 3), chip('gray', 'atk', 1), chip('orange', 'def', 4)];
  assert.deepEqual(rules.sort(entries, 'def').map(entry => entry.quality), ['red', 'orange', 'blue', 'gray']);
});

test('Numeric ordering prioritizes actual selected attribute value', () => {
  const gray = chip('gray', 'def', 5), red = chip('red', 'hp', 20, [{ stat: 'def', val: 2 }]);
  assert.deepEqual(rules.sort([red, gray], 'def', 'value'), [gray, red]);
});

test('Main and all matching affixes are summed', () => {
  assert.equal(rules.value(chip('blue', 'def', 2, [{ stat: 'def', val: 1 }, { stat: 'hp', val: 50 }, { stat: 'def', val: 3 }]), 'def'), 6);
});

test('An affix-only match participates in the selected attribute order', () => {
  const main = chip('red', 'power', .07), affix = chip('blue', 'hp', 8, [{ stat: 'power', val: .1 }]);
  assert.deepEqual(rules.sort([main, affix], 'power', 'value'), [affix, main]);
});

test('Equal values use descending quality', () => {
  const gray = chip('gray', 'def', 1), orange = chip('orange', 'hp', 14, [{ stat: 'def', val: 1 }]);
  assert.deepEqual(rules.sort([gray, orange], 'def', 'value'), [orange, gray]);
});

test('Equal values and qualities retain source inventory index', () => {
  const first = { c: chip('blue', 'def', 2), i: 2 }, last = { c: chip('blue', 'def', 2), i: 9 };
  assert.deepEqual(rules.sort([last, first], 'def', 'value'), [first, last]);
});

test('Entries without saved indices retain stable input order', () => {
  const first = chip('blue', 'def', 2), last = chip('blue', 'def', 2);
  assert.deepEqual(rules.sort([last, first], 'def', 'value'), [last, first]);
});

test('Mixed legacy wrappers have a consistent total order', () => {
  const indexedTwo = { c: chip('blue', 'def', 2), i: 2 };
  const unindexed = chip('blue', 'def', 2);
  const indexedOne = { c: chip('blue', 'def', 2), i: 1 };
  assert.deepEqual(rules.sort([indexedTwo, unindexed, indexedOne], 'def', 'value'), [unindexed, indexedOne, indexedTwo]);
});

test('Cross-attribute all filter preserves quality ordering', () => {
  const hp = chip('gray', 'hp', 100), power = chip('red', 'power', .03);
  assert.deepEqual(rules.sort([hp, power], 'all', 'value'), [power, hp]);
});

test('Unknown attributes and old missing mode preserve quality ordering', () => {
  const gray = chip('gray', 'atk', 1), blue = chip('blue', 'atk', 2);
  assert.deepEqual(rules.sort([gray, blue], 'unused', 'value'), [blue, gray]);
  assert.deepEqual(rules.sort([gray, blue], 'atk', undefined), [blue, gray]);
});

test('Backpack, socket, forge and stash wrappers retain their binding identity', () => {
  const sample = chip('blue', 'def', 2, [{ stat: 'def', val: 1 }]);
  for (const wrapper of [sample, { c: sample, i: 1 }, { c: sample, k: 'stash:1' }, { chip: sample, index: 1 }, { entry: { chip: sample, index: 1 }, index: 1 }]) {
    assert.equal(rules.value(wrapper, 'def'), 3);
    assert.strictEqual(rules.sort([wrapper], 'def', 'value')[0], wrapper);
  }
});

test('No input arrays, chip values, affixes or grades are changed', () => {
  const source = [chip('blue', 'def', 2), chip('orange', 'atk', 4, [{ stat: 'def', val: 1, quality: 'orange' }])];
  const snapshot = JSON.stringify(source);
  const ordered = rules.sort(source, 'def', 'value');
  assert.notStrictEqual(ordered, source);
  assert.equal(JSON.stringify(source), snapshot);
});

test('Malformed legacy numeric fields cannot produce a NaN comparator', () => {
  const a = chip('gray', 'def', '2', [{ stat: 'def', val: '1' }, { stat: 'def', val: NaN }, null]);
  const b = chip('green', 'def', Infinity);
  assert.equal(rules.value(a, 'def'), 3);
  assert.equal(rules.value(b, 'def'), 0);
  assert(Number.isFinite(rules.compare(a, b, 'def', 'value')));
});

test('Percentages keep underlying precision during comparison', () => {
  const low = chip('red', 'crit', .015), high = chip('blue', 'crit', .016);
  assert.deepEqual(rules.sort([low, high], 'crit', 'value'), [high, low]);
});

test('Empty collections and null entries are deterministic', () => {
  assert.deepEqual(rules.sort([], 'def', 'value'), []);
  const present = chip('gray', 'def', 1);
  assert.deepEqual(rules.sort([null, present], 'def', 'value'), [present, null]);
});

test('Approved ATK/DEF affix floors follow all six original quality labels', () => {
  const qualities = ['gray', 'green', 'blue', 'purple', 'orange', 'red'];
  for (const stat of ['atk', 'def']) {
    const saved = chip('orange', 'hp', 17, qualities.map(quality => ({ stat, val: 1, quality })));
    assert.equal(rules.normalize(saved), true);
    assert.deepEqual(saved.affixes.map(affix => affix.val), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(saved.affixes.map(affix => affix.quality), qualities);
  }
});

test('Normalization keeps main stats, other affixes, labels and affix counts intact', () => {
  const saved = chip('red', 'def', 2, [
    { stat: 'def', val: 1, quality: 'orange', name: '防御芯片' },
    { stat: 'compat', val: 1, quality: 'red', name: '兼容芯片' },
    { stat: 'hp', val: 3, quality: 'purple' },
    { stat: 'power', val: .01, quality: 'red' }
  ]);
  saved.grade = '红'; saved.name = '防御芯片';
  const original = JSON.parse(JSON.stringify(saved));
  assert.equal(rules.normalize(saved), true);
  original.affixes[0].val = 5;
  assert.deepEqual(saved, original);
});

test('Existing high rolls are preserved and repeated migration is idempotent', () => {
  const saved = chip('blue', 'atk', 9, [{ stat: 'atk', val: 7, quality: 'blue' }, { stat: 'def', val: 1, quality: 'red' }]);
  assert.equal(rules.normalize(saved), true);
  assert.deepEqual(saved.affixes.map(affix => affix.val), [7, 6]);
  assert.equal(rules.normalize(saved), false);
  assert.equal(saved.val, 9);
});

test('A new rolled chip receives the same approved floors as saved chips', () => {
  const rolled = chip('red', 'hp', 20, [{ stat: 'def', val: 2, quality: 'red' }, { stat: 'atk', val: 1, quality: 'green' }]);
  assert.equal(rules.normalize(rolled), true);
  assert.deepEqual(rolled.affixes.map(affix => affix.val), [6, 2]);
  assert.equal(rolled.val, 20);
});

test('Missing affix quality uses gray without introducing a quality field', () => {
  const saved = chip('red', 'hp', 20, [{ stat: 'def', val: 0 }, { stat: 'atk', val: 3 }]);
  assert.equal(rules.normalize(saved), true);
  assert.deepEqual(saved.affixes, [{ stat: 'def', val: 1 }, { stat: 'atk', val: 3 }]);
  assert.equal(rules.normalize({}), false);
  assert.equal(rules.normalize(null), false);
});

console.log(JSON.stringify({ passed: tests.length, tests }, null, 2));
