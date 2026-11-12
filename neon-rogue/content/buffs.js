// NEON DEPTH · 增益/负面状态（8 条，纯数据）
window.NEON = window.NEON || {};

window.NEON.buffs = [
  // ---- 负面 ----
  {
    id: 'burn',
    name: '灼烧',
    color: '#ff7a45',
    kind: 'dot',
    amount: 2,
    desc: '组织碳化：每回合 -2 生命'
  },
  {
    id: 'poison',
    name: '神经毒素',
    color: '#7dff5e',
    kind: 'dot',
    amount: 4,
    desc: '毒素扩散：每回合 -4 生命'
  },
  {
    id: 'slow',
    name: '迟滞',
    color: '#8f9bff',
    kind: 'slow',
    amount: 1,
    desc: '运动皮层受阻：每 2 回合行动一次'
  },

  // ---- 正面 ----
  {
    id: 'regen',
    name: '纳米再生',
    color: '#57ffa8',
    kind: 'hot',
    amount: 2,
    desc: '纳米修复：每回合回复 2 生命'
  },
  {
    id: 'shield',
    name: '力场护盾',
    color: '#22e6ff',
    kind: 'shield',
    amount: 5,
    desc: '力场展开：吸收 5 点伤害'
  },

  // ---- 战术（玩家技能/道具施加）----
  {
    id: 'grow',
    name: '巨化',
    color: '#ffb347',
    kind: 'atk',
    amount: 3,
    desc: '血清催化：攻击 +3，体型增大'
  },
  {
    id: 'overclock',
    name: '超频',
    color: '#ff2fa8',
    kind: 'atk',
    amount: 2,
    desc: '核心过载：攻击 +2'
  },
  {
    id: 'adrenaline',
    name: '肾上腺素',
    color: '#ffd166',
    kind: 'atk',
    amount: 3,
    desc: '背水一战：攻击 +3'
  },
  {
    id: 'ghost',
    name: '相位幽灵',
    color: '#b06bff',
    kind: 'dodge',
    amount: 3,
    desc: '身位虚化：闪避 +3'
  }
];

window.NEON.pickupDurations = {
  atk: { common: 12, rare: 18, epic: 25 },
  shield: { common: 25, rare: 35, epic: 50 },
  drone: { common: 50, rare: 75, epic: 100 }
};
