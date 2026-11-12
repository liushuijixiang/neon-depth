/* Chip ordering and the approved attack/defense affix migration. */
(function (root) {
  'use strict';
  var qualities = ['gray', 'green', 'blue', 'purple', 'orange', 'red'];
  var percent = { crit: 1, dodge: 1, critMult: 1, power: 1 };
  // Offsets use the units printed to players: integers or percentage points.
  var offsets = {
    atk:      [[0,0,1,1,2,4], [0,0,0,0,0,0]],
    def:      [[0,0,1,1,2,4], [0,0,0,0,0,0]],
    hp:       [[0,1,2,3,3,3], [0,1,1,2,3,4]],
    crit:     [[0,1,1,2,4,4], [0,1,2,2,3,3]],
    dodge:    [[0,1,1,2,4,4], [0,1,2,2,3,3]],
    critMult: [[0,1,2,3,3,3], [0,1,1,2,3,4]],
    compat:   [[1,2,3,3,4,4], [0,0,1,1,2,2]],
    power:    [[0,3,4,5,6,7], [0,1,2,3,5,6]],
    skill:    [[0,1,2,3,3,4], [0,1,2,3,4,5]]
  };
  var minimums = {
    atk: [[1,2,3,4,5,8], [1,2,3,4,5,6]],
    def: [[1,2,3,4,5,8], [1,2,3,4,5,6]],
    hp: [[3,6,9,12,15,20], [2,3,4,5,8,11]],
    crit: [[2,3,4,5,8,11], [1,2,3,4,5,6]],
    dodge: [[2,3,4,5,8,11], [1,2,3,4,5,6]],
    critMult: [[3,6,9,12,15,20], [2,3,4,5,8,11]],
    compat: [[2,3,4,5,6,7], [1,1,2,2,3,3]],
    power: [[3,7,10,13,16,22], [1,3,5,6,9,12]],
    skill: [[1,2,3,4,5,6], [1,2,3,4,5,6]]
  };
  // 1.0：适应度回调。v2 的兼容数值（主 4–9 / 副 1–6 / 公司 4–9）按差值迁到这里的表。
  var BALANCE_VERSION = 3;
  var compatV2 = { primary: [4,5,6,7,8,9], affix: [1,2,3,4,5,6], company: [4,5,6,7,8,9] };
  function companyCompat(index) { return minimums.compat[0][index] + 1; }
  var legacyPowerMinimum = [[3,7,10,13,16,22], [1,3,5,6,9,12]];
  var oldMultipliers = [1, 1.5, 2, 2.5, 3.5, 5];
  var primaryMeans = {
    atk: [[1,2,2,3,4,5], [1,2,3,4,6,9]],
    def: [[1,2,2,3,4,5], [1,2,3,4,6,9]],
    hp: [[4,6,8,10,14,20], [4,7,10,13,17,23]],
    crit: [[2,2,3,4,5,8], [2,3,4,6,9,12]],
    dodge: [[2,2,3,4,5,8], [2,3,4,6,9,12]],
    critMult: [[4,6,8,10,14,20], [4,7,10,13,17,23]],
    compat: [[1,1,1,2,2,3], minimums.compat[0]],
    power: [[4,5,7,9,12,18], [4,8,11,14,18,25]],
    skill: [[1,1,1,1,2,2], [1,2,3,4,5,6]]
  };

  function qualityIndex(quality) { return Math.max(0, qualities.indexOf(quality)); }
  function adjustedValue(stat, raw, quality, affix, company, legacy) {
    if (!offsets[stat]) return raw;
    var index = qualityIndex(quality), scale = percent[stat] ? 100 : 1;
    var units = Math.round(number(raw) * scale);
    if (affix && (stat === 'atk' || stat === 'def')) units = Math.max(units, index + 1);
    if (company && !affix) {
      if (stat === 'compat') units = Math.max(units, companyCompat(index));
    } else if (legacy && stat === 'power') {
      units = Math.max(units, legacyPowerMinimum[affix ? 1 : 0][index]);
    } else {
      units = Math.max(minimums[stat][affix ? 1 : 0][index], units + offsets[stat][affix ? 1 : 0][index]);
    }
    return units / scale;
  }

  function normalizeEntry(entry, quality, affix, company) {
    if (!entry || entry.chipBalanceVersion >= BALANCE_VERSION) return false;
    var index = qualityIndex(quality), legacy = entry.stat === 'execute' || entry.id === 'exec';
    if (entry.chipBalanceVersion === 2) {
      entry.chipBalanceVersion = BALANCE_VERSION;
      if (entry.stat !== 'compat' || !Number.isFinite(Number(entry.val))) return false;
      var target = company && !affix ? companyCompat(index) : minimums.compat[affix ? 1 : 0][index];
      var before = (company && !affix ? compatV2.company : affix ? compatV2.affix : compatV2.primary)[index];
      var next = Math.max(target, Math.round(number(entry.val)) - (before - target));
      if (next === entry.val) return false;
      entry.val = next; return true;
    }
    if (legacy) {
      entry.id = 'power'; entry.stat = 'power'; entry.name = '功率芯片';
      entry.val = Math.round(.06 * oldMultipliers[index] * (affix ? .4 : 1) * 100) / 100;
    }
    if (!offsets[entry.stat] || !Number.isFinite(Number(entry.val))) return false;
    entry.val = adjustedValue(entry.stat, entry.val, quality, affix, company, legacy);
    entry.chipBalanceVersion = BALANCE_VERSION;
    return true;
  }

  // Apply at acquisition generation, before showing a reward or a shop offer.
  // The coefficient preserves the raw primary-stat expectation per type and quality.
  function dropRetention(chip) {
    if (!chip) return 0;
    var index = qualityIndex(chip.quality);
    if (chip.corp) {
      if (chip.stat !== 'compat') return 1;
      var old = (chip.heavy ? [2,2,3,4,6,8] : [1,2,2,3,4,5])[index];
      return old / Math.max(old, companyCompat(index));
    }
    var means = primaryMeans[chip.stat];
    return means ? Math.min(1, means[0][index] / means[1][index]) : 1;
  }

  function chipOf(entry) {
    if (!entry) return null;
    if (entry.stat != null) return entry;
    return entry.c || entry.chip || (entry.entry && entry.entry.chip) || null;
  }

  function number(value) {
    var result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  function value(entry, stat) {
    var chip = chipOf(entry);
    if (!chip || !stat || stat === 'all') return 0;
    var total = chip.stat === stat ? number(chip.val) : 0;
    (Array.isArray(chip.affixes) ? chip.affixes : []).forEach(function (affix) {
      if (affix && affix.stat === stat) total += number(affix.val);
    });
    return total;
  }

  function sourceIndex(entry) {
    if (!entry) return null;
    if (Number.isFinite(entry.index)) return entry.index;
    if (Number.isFinite(entry.i)) return entry.i;
    return null;
  }

  function compare(a, b, filterStat, mode) {
    var first = chipOf(a), second = chipOf(b);
    var difference = 0;
    if (mode === 'value' && filterStat && filterStat !== 'all') difference = value(b, filterStat) - value(a, filterStat);
    if (difference) return difference;
    difference = qualities.indexOf(second && second.quality) - qualities.indexOf(first && first.quality);
    return difference;
  }

  function sort(entries, filterStat, mode) {
    return entries.map(function (entry, index) {
      var original = sourceIndex(entry);
      return { entry: entry, index: index, original: original == null ? index : original };
    })
      .sort(function (a, b) { return compare(a.entry, b.entry, filterStat, mode) || a.original - b.original || a.index - b.index; })
      .map(function (item) { return item.entry; });
  }

  function normalize(chip) {
    if (!chip || !Array.isArray(chip.affixes)) return false;
    var changed = chip.stat ? normalizeEntry(chip, chip.quality, false, !!chip.corp) : false;
    chip.affixes.forEach(function (affix) {
      if (normalizeEntry(affix, affix && affix.quality || chip.quality, true, false)) changed = true;
    });
    return changed;
  }

  var api = { value: value, compare: compare, sort: sort, normalize: normalize, adjustedValue: adjustedValue, dropRetention: dropRetention };
  root.NeonChipRules = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
