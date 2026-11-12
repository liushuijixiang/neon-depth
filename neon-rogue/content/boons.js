/* NEON DEPTH · 机遇与风险 boons.js
 * 16 条二选一奖励：common 7 / rare 5 / cursed 4
 * 每条同时含 good 与 bad：收益明确，代价同样明确。
 * good key: atk / maxHp / def / crit / dodge / vision / lifesteal / thorns / regen / heal / score
 * bad  key: maxHp / vision / dodge / enemyAtk / enemyHp / heal / score
 */
window.NEON = window.NEON || {};

window.NEON.boons = [
  /* ---------- common 7 ---------- */
  { id: 'overclock_core', name: '过载核心', color: '#ff2fa8', rarity: 'common',
    desc: '攻击 +3；代价：生命上限 -8',
    good: { atk: 3 }, bad: { maxHp: -8 } },

  { id: 'iron_shell', name: '铁壁协议', color: '#39d0ff', rarity: 'common',
    desc: '防御 +2；代价：视野 -1',
    good: { def: 2 }, bad: { vision: -1 } },

  { id: 'spike_coating', name: '反射涂层', color: '#7cff6b', rarity: 'common',
    desc: '反伤 +3；代价：闪避 -3%',
    good: { thorns: 3 }, bad: { dodge: -0.03 } },

  { id: 'eagle_eye', name: '鹰眼插件', color: '#a8f0ff', rarity: 'common',
    desc: '视野 +1；代价：生命上限 -4',
    good: { vision: 1 }, bad: { maxHp: -4 } },

  { id: 'static_field', name: '静电场', color: '#5ce1e6', rarity: 'common',
    desc: '防御 +1；代价：敌方攻击 +1',
    good: { def: 1 }, bad: { enemyAtk: 1 } },

  { id: 'emergency_cell', name: '应急电池', color: '#ffe066', rarity: 'common',
    desc: '回复 20 生命；代价：信用点 -40',
    good: { heal: 20 }, bad: { score: -40 } },

  { id: 'armor_expand', name: '装甲扩容', color: '#8fa8c8', rarity: 'common',
    desc: '生命上限 +12；代价：闪避 -3%',
    good: { maxHp: 12 }, bad: { dodge: -0.03 } },

  /* ---------- rare 5 ---------- */
  { id: 'night_strider', name: '暗巷步法', color: '#8b5cff', rarity: 'rare',
    desc: '闪避 +6%；代价：视野 -1',
    good: { dodge: 0.06 }, bad: { vision: -1 } },

  { id: 'nano_mend', name: '自愈纳米', color: '#3dffa8', rarity: 'rare',
    desc: '每回合回复 +2；代价：生命上限 -6',
    good: { regen: 2 }, bad: { maxHp: -6 } },

  { id: 'neural_crit', name: '神经超频', color: '#ff9f1c', rarity: 'rare',
    desc: '暴击率 +8%；代价：立即失去 10 生命',
    good: { crit: 0.08 }, bad: { heal: -10 } },

  { id: 'phase_shift', name: '相位偏移', color: '#b388ff', rarity: 'rare',
    desc: '闪避 +5%；代价：生命上限 -6',
    good: { dodge: 0.05 }, bad: { maxHp: -6 } },

  { id: 'hologram_radar', name: '全息雷达', color: '#4dd6b8', rarity: 'rare',
    desc: '视野 +1；代价：敌方生命 +15%',
    good: { vision: 1 }, bad: { enemyHp: 0.15 } },

  /* ---------- cursed 4 ---------- */
  { id: 'glass_cannon', name: '玻璃大炮', color: '#ff5c39', rarity: 'cursed',
    desc: '攻击 +4；代价：生命上限 -12',
    good: { atk: 4 }, bad: { maxHp: -12 } },

  { id: 'double_or_nothing', name: '加倍下注', color: '#ffd23f', rarity: 'cursed',
    desc: '信用点 +60；代价：敌方攻击 +1',
    good: { score: 60 }, bad: { enemyAtk: 1 } },

  { id: 'blood_circuit', name: '血色回路', color: '#ff2f5e', rarity: 'cursed',
    desc: '吸血 +12%；代价：生命上限 -8',
    good: { lifesteal: 0.12 }, bad: { maxHp: -8 } },

  { id: 'data_gamble', name: '数据赌局', color: '#ff7ad9', rarity: 'cursed',
    desc: '信用点 +80；代价：敌方生命 +25%',
    good: { score: 80 }, bad: { enemyHp: 0.25 } }
];
