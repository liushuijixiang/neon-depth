/* 内容数据校验器：node tools/validate.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');

const files = {
  skills: 'skills.js',
  items: 'items.js',
  buffs: 'buffs.js',
  consumables: 'consumables.js',
  quests: 'quests.js',
  achievements: 'achievements.js',
  boons: 'boons.js',
};

const errors = [];
const warn = [];
const err = m => errors.push(m);
const isStr = v => typeof v === 'string' && v.length > 0;
const isNum = v => typeof v === 'number' && isFinite(v);
const isHex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const allIds = new Map();
const data = {};
const sandbox = { window: {} };
vm.createContext(sandbox);

for (const [key, f] of Object.entries(files)) {
  const p = path.join(CONTENT, f);
  if (!fs.existsSync(p)) { warn.push('缺少文件 content/' + f); continue; }
  try {
    vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    err(f + ' 语法错误: ' + e.message);
    continue;
  }
  const arr = sandbox.window.NEON && sandbox.window.NEON[key];
  if (!Array.isArray(arr)) { err(f + ' 未设置 window.NEON.' + key + ' 数组'); continue; }
  data[key] = arr;
  if (!arr.length) err(f + ' 数组为空');
  for (const it of arr) {
    if (!it || !isStr(it.id)) { err(f + ' 有元素缺少 id'); continue; }
    if (!/^[a-z][a-z0-9_]*$/.test(it.id)) err(f + ' id 不合法: ' + it.id);
    if (allIds.has(it.id)) err('id 重复: ' + it.id + ' (' + files[allIds.get(it.id)] + ' & ' + f + ')');
    allIds.set(it.id, key);
  }
}

// 合并三阶段怪物文件
['monsters.js', 'monsters_stage2.js', 'monsters_stage3.js'].forEach(function (f) {
  const p2 = path.join(CONTENT, f);
  if (!fs.existsSync(p2)) return;
  try { vm.runInContext(fs.readFileSync(p2, 'utf8'), sandbox, { filename: f }); }
  catch (e) { err(f + ' 语法错误: ' + e.message); }
});
data.monsters = (sandbox.window.NEON && sandbox.window.NEON.monsters) || [];
{
  const seenIds = new Set();
  data.monsters.forEach(m => {
    if (seenIds.has(m.id)) err('怪物 id 重复: ' + m.id);
    seenIds.add(m.id);
    allIds.set(m.id, 'monsters');
  });
}


const AIS = ['chase', 'turret', 'charger', 'exploder', 'summoner', 'tank', 'healer'];
const GLYPHS = ['diamond', 'square', 'hex', 'triangle', 'circle', 'star', 'cross', 'arrow', 'shield', 'gem', 'orb'];
const EFF_KEYS = ['atk', 'maxHp', 'def', 'crit', 'critMult', 'dodge', 'lifesteal', 'thorns', 'regen', 'vision', 'onKillHeal', 'xpGain', 'shadowMax', 'shadowGain', 'backstab', 'edgeDmg', 'overloadDmg', 'instabVent', 'hackTurns', 'stopTurns', 'phaseTurns', 'bleedReduce', 'ghostVision', 'executeDmg'];
const ITEM_KINDS = ['heal', 'atk', 'def', 'xp', 'score', 'credit', 'maxhp', 'buff', 'random'];
const ITEM_EFF = ['heal', 'healPct', 'cleanse', 'atk', 'def', 'maxHp', 'xp', 'xpPct', 'score', 'credits', 'buff', 'shieldPct', 'duration'];
const BUFF_KINDS = ['dot', 'hot', 'slow', 'shield', 'atk', 'dodge'];
const CONS_EFF = ['heal', 'shield', 'damageVisible', 'blink', 'stunVisible', 'atkBuff', 'reveal', 'maxHp', 'xp', 'score', 'duration'];
const QUEST_TYPES = ['kill', 'killElite', 'killType', 'clear', 'combo', 'noDamage', 'swift', 'bossTime', 'bossClean', 'challenge', 'hoard', 'shards', 'useItem', 'hunt', 'killCorp', 'chests', 'beacons', 'ambush', 'noSkill', 'corpVip', 'undetected', 'ranged'];
const CONS_USES = ['emp', 'claymore', 'meltdown', 'swarm', 'daemon', 'blackwall', 'patch', 'aegis', 'trauma', 'gene', 'blink', 'smoke', 'scan', 'coolant', 'lace', 'cell', 'cache', 'cred'];
const TERMS = ['hunted', 'anemia', 'glass', 'bounty', 'stake'];
const ACH_TYPES = ['kills', 'depth', 'win', 'clearFloor', 'shards', 'useItems', 'turns', 'bossKill', 'noHealWin', 'chalWins', 'chalBest', 'chalTier', 'chalScore', 'chalNoHeal', 'monKill', 'bossKillType', 'psychoTotal', 'maxLoad', 'syncWin', 'overWin', 'critKills', 'curLoad', 'curAdapt', 'chapters', 'npcsDone', 'relics', 'drinks', 'duels', 'legends', 'psychoKills', 'dreamsOwned', 'dreamsPlayed', 'dreamsDone', 'lockedCh', 'clsAllChal', 'allClsAllChal', 'nakedWin', 'psychoWin', 'speedWin', 'b16Win'];
const ABILITIES = ['shot', 'drone', 'wall', 'turret', 'stealth', 'grow', 'blink', 'nova'];
const BOON_GOOD = ['atk', 'maxHp', 'def', 'crit', 'dodge', 'vision', 'lifesteal', 'thorns', 'regen', 'heal', 'score'];
const BOON_BAD = ['maxHp', 'vision', 'dodge', 'enemyAtk', 'enemyHp', 'heal', 'score'];

function rangePair(it, f, min, max, label) {
  if (!Array.isArray(it[label]) || it[label].length !== 2 || !isNum(it[label][0]) || !isNum(it[label][1])) return err(f + ' ' + it.id + ' ' + label + ' 需为 [a,b]');
  const [a, b] = it[label];
  if (a > b) err(f + ' ' + it.id + ' ' + label + ' 必须递增');
  if (a < min || b > max) err(f + ' ' + it.id + ' ' + label + ' 超出范围 ' + min + '~' + max);
}

(data.monsters || []).forEach(m => {
  if (!isStr(m.name)) err('monster ' + m.id + ' 缺 name');
  if (!isHex(m.color)) err('monster ' + m.id + ' color 需 #rrggbb');
  if (!GLYPHS.includes(m.glyph)) err('monster ' + m.id + ' glyph 非法: ' + m.glyph);
  if (!AIS.includes(m.ai)) err('monster ' + m.id + ' ai 非法: ' + m.ai);
  rangePair(m, 'monsters', 1, 99, 'hp');
  rangePair(m, 'monsters', 1, 99, 'atk');
  rangePair(m, 'monsters', 0, 99, 'def');
  if (!isNum(m.xp)) err('monster ' + m.id + ' xp 需数字');
  if (!isNum(m.weight) || m.weight < 0 || m.weight > 20) err('monster ' + m.id + ' weight 0~20');
  if (!isNum(m.minDepth) || !isNum(m.maxDepth) || m.minDepth < 1 || m.maxDepth > 15 || m.minDepth > m.maxDepth) err('monster ' + m.id + ' minDepth/maxDepth 非法');
  if (!['none', 'explode', 'split'].includes(m.onDeath)) err('monster ' + m.id + ' onDeath 非法');
  if (m.ai === 'turret' && (!isNum(m.range) || m.range < 2)) err('monster ' + m.id + ' turret 需要 range>=2');
  if (!isStr(m.desc)) err('monster ' + m.id + ' 缺 desc');
});

(data.skills || []).forEach(s => {
  if (!['attack', 'survival', 'tactics'].includes(s.branch)) err('skill ' + s.id + ' branch 非法');
  if (s.class !== undefined && !['ghost', 'assault', 'engineer'].includes(s.class)) err('skill ' + s.id + ' class 非法');
  if (![1, 2, 3].includes(s.tier)) err('skill ' + s.id + ' tier 非法');
  if (![1, 2, 3].includes(s.max)) err('skill ' + s.id + ' max 1~3');
  if (!isStr(s.name)) err('skill ' + s.id + ' 缺 name');
  if (s.ability !== undefined) {
    if (!ABILITIES.includes(s.ability)) err('skill ' + s.id + ' ability 非法: ' + s.ability);
    if (!isNum(s.cd) || s.cd < 2 || s.cd > 10) err('skill ' + s.id + ' cd 需 2~10');
    if (!isNum(s.power) || s.power < 1 || s.power > 8) err('skill ' + s.id + ' power 需 1~8');
    if (s.max !== 1) err('skill ' + s.id + ' 主动技 max 必须为 1');
  }
  if (!s.effect || typeof s.effect !== 'object') err('skill ' + s.id + ' 缺 effect');
  else Object.keys(s.effect).forEach(k => {
    if (!EFF_KEYS.includes(k)) err('skill ' + s.id + ' effect key 非法: ' + k);
    if (!isNum(s.effect[k]) || s.effect[k] <= 0) err('skill ' + s.id + ' effect 数值需 >0');
  });
  if (s.req !== null && s.req !== undefined) {
    const r = (data.skills || []).find(x => x.id === s.req);
    if (!r) err('skill ' + s.id + ' req 不存在: ' + s.req);
    else if (r.branch !== s.branch && !(s.class && r.class === s.class)) err('skill ' + s.id + ' req 必须同分支');
  }
});

(data.items || []).forEach(it => {
  if (!ITEM_KINDS.includes(it.kind)) err('item ' + it.id + ' kind 非法');
  if (!GLYPHS.includes(it.glyph)) err('item ' + it.id + ' glyph 非法');
  if (!isHex(it.color)) err('item ' + it.id + ' color 需 #rrggbb');
  if (!isNum(it.weight) || it.weight < 1) err('item ' + it.id + ' weight');
  if (!it.effect || typeof it.effect !== 'object') err('item ' + it.id + ' 缺 effect');
  else Object.keys(it.effect).forEach(k => { if (!ITEM_EFF.includes(k)) err('item ' + it.id + ' effect key 非法: ' + k); });
  if (!isStr(it.msg)) err('item ' + it.id + ' 缺 msg');
});

(data.buffs || []).forEach(b => {
  if (!BUFF_KINDS.includes(b.kind)) err('buff ' + b.id + ' kind 非法');
  if (!isNum(b.amount) || b.amount < 1 || b.amount > 6) err('buff ' + b.id + ' amount 1~6');
  if (!isHex(b.color)) err('buff ' + b.id + ' color 需 #rrggbb');
  if (!isStr(b.name) || !isStr(b.desc)) err('buff ' + b.id + ' 缺 name/desc');
});

(data.consumables || []).forEach(c => {
  if (!GLYPHS.includes(c.glyph)) err('consumable ' + c.id + ' glyph 非法');
  if (!isHex(c.color)) err('consumable ' + c.id + ' color 需 #rrggbb');
  if (!isNum(c.weight) || c.weight < 1) err('consumable ' + c.id + ' weight');
  if (!CONS_USES.includes(c.use)) err('consumable ' + c.id + ' use 非法');
  if (!['common', 'rare', 'epic'].includes(c.tier)) err('consumable ' + c.id + ' tier 非法');
  if (!['nano', 'burst', 'pierce', 'burn'].includes(c.ammo)) err('consumable ' + c.id + ' ammo 非法');
  if (!isStr(c.desc)) err('consumable ' + c.id + ' 缺 desc');
});

(data.quests || []).forEach(q => {
  if (!QUEST_TYPES.includes(q.type)) err('quest ' + q.id + ' type 非法');
  if (!Array.isArray(q.n) || q.n.length !== 2) err('quest ' + q.id + ' n 需 [min,max]');
  if (!['low', 'high', 'lethal'].includes(q.tier)) err('quest ' + q.id + ' tier 非法');
  if (!['floor', 'floors2', 'boss'].includes(q.deadline)) err('quest ' + q.id + ' deadline 非法');
  (q.terms || []).forEach(t => { if (!TERMS.includes(t)) err('quest ' + q.id + ' term 非法: ' + t); });
  if (q.tier === 'lethal' && !(q.terms || []).includes('stake')) err('quest ' + q.id + ' 致命委托必须押金');
  if (!q.reward || !isNum(q.reward.xp)) err('quest ' + q.id + ' 缺 reward.xp');
});

(data.achievements || []).forEach(a => {
  if (!a.cond || !ACH_TYPES.includes(a.cond.type)) err('achievement ' + a.id + ' cond.type 非法');
  if (!isNum(a.cond.n) || a.cond.n < 1) err('achievement ' + a.id + ' cond.n 需 >=1');
  if (!isStr(a.name) || !isStr(a.desc)) err('achievement ' + a.id + ' 缺 name/desc');
});

(data.boons || []).forEach(b => {
  if (!isHex(b.color)) err('boon ' + b.id + ' color 需 #rrggbb');
  if (!isStr(b.name) || !isStr(b.desc)) err('boon ' + b.id + ' 缺 name/desc');
  if (!b.good || !Object.keys(b.good).length) err('boon ' + b.id + ' 缺 good');
  if (!b.bad || !Object.keys(b.bad).length) err('boon ' + b.id + ' 缺 bad');
  Object.keys(b.good || {}).forEach(k => { if (!BOON_GOOD.includes(k)) err('boon ' + b.id + ' good key 非法: ' + k); });
  Object.keys(b.bad || {}).forEach(k => { if (!BOON_BAD.includes(k)) err('boon ' + b.id + ' bad key 非法: ' + k); });
});

for (const [k, v] of Object.entries(data)) console.log(k.padEnd(12), v.length + ' 条');
if (warn.length) console.log('\n提醒:\n  ' + warn.join('\n  '));
if (errors.length) {
  console.log('\n✗ 校验失败 ' + errors.length + ' 条:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log('\n✓ 全部通过');
