// NEON DEPTH · 可携带消耗道具（1.4 暗巷经济）
// 数值全部由引擎按「当前攻击 / 最大生命 / 层数」实时结算，desc 只写风味。
// tier: common 普通 / rare 稀有 / epic 传奇；ammo: 突袭者换弹时的弹种。
window.NEON = window.NEON || {};

window.NEON.consumables = [
  // ---- 进攻 ----
  { id: 'emp', name: 'EMP 手雷', color: '#22e6ff', glyph: 'orb', tier: 'common', weight: 9, minDepth: 1, ammo: 'burst', use: 'emp',
    desc: '军用电磁脉冲。烧掉电路，也烧掉正在充能的念头。' },
  { id: 'claymore', name: '阔剑定向雷', color: '#ffb347', glyph: 'square', tier: 'common', weight: 7, minDepth: 1, ammo: 'burst', use: 'claymore',
    desc: '面朝敌人那一面写着「此面向敌」。' },
  { id: 'meltdown_charge', name: '熔核燃烧弹', color: '#ff7a45', glyph: 'star', tier: 'rare', weight: 5, minDepth: 2, ammo: 'burn', use: 'meltdown',
    desc: '铝热剂外壳，落地后烧到只剩金属的味道。' },
  { id: 'nano_swarm', name: '纳米蜂群罐', color: '#57ffa8', glyph: 'hex', tier: 'rare', weight: 4, minDepth: 3, ammo: 'burst', use: 'swarm',
    desc: '拧开盖子，里面的东西会自己找工作。' },
  { id: 'daemon', name: '恶意守护进程', color: '#ff2fa8', glyph: 'diamond', tier: 'rare', weight: 5, minDepth: 3, ammo: 'pierce', use: 'daemon',
    desc: '一段在黑网论坛流传的漏洞脚本，专挖装甲固件。' },
  { id: 'blackwall', name: '黑墙碎片', color: '#ff365c', glyph: 'star', tier: 'epic', weight: 2, minDepth: 6, ammo: 'pierce', use: 'blackwall',
    desc: '从黑墙裂缝里偷出来的东西。它看你的眼神不太对。' },

  // ---- 保命 ----
  { id: 'nanite_patch', name: '纳米胶体贴', color: '#57ffa8', glyph: 'cross', tier: 'common', weight: 10, minDepth: 1, ammo: 'nano', use: 'patch',
    desc: '创伤小组同款贴片，药店价格的三倍。' },
  { id: 'aegis_field', name: '临时力场', color: '#22e6ff', glyph: 'shield', tier: 'common', weight: 8, minDepth: 1, ammo: 'pierce', use: 'aegis',
    desc: '一次性力场发生器，电池只够撑过一场火拼。' },
  { id: 'trauma_injector', name: '创伤小组急救针', color: '#7bffb4', glyph: 'cross', tier: 'rare', weight: 4, minDepth: 3, ammo: 'nano', use: 'trauma',
    desc: '白金会员专属。扎下去之前别看说明书。' },
  { id: 'gene_splice', name: '基因拼接包', color: '#ff9ed2', glyph: 'gem', tier: 'rare', weight: 4, minDepth: 3, ammo: 'nano', use: 'gene',
    desc: '把别人的好基因缝进你身体里，永久生效。' },

  // ---- 战术 ----
  { id: 'phase_blink', name: '相位跃迁', color: '#b06bff', glyph: 'arrow', tier: 'common', weight: 6, minDepth: 1, ammo: 'burn', use: 'blink',
    desc: '短程相位折跃，落点由系统自动挑最安静的角落。' },
  { id: 'smoke', name: '光学烟幕', color: '#9fe9ff', glyph: 'orb', tier: 'common', weight: 6, minDepth: 1, ammo: 'burn', use: 'smoke',
    desc: '带干扰金属粉的烟。义眼看过去只有雪花。' },
  { id: 'scan_pulse', name: '广域扫描', color: '#7dff5e', glyph: 'gem', tier: 'common', weight: 6, minDepth: 1, ammo: 'burn', use: 'scan',
    desc: '借用一次城市监控网，权限只有十秒。' },
  { id: 'coolant', name: '液氮冷却剂', color: '#7eeaff', glyph: 'hex', tier: 'rare', weight: 4, minDepth: 2, ammo: 'pierce', use: 'coolant',
    desc: '直接灌进义体散热管。很冷，非常冷。' },

  // ---- 增益 / 资源 ----
  { id: 'stim_shot', name: '黑蕾丝', color: '#ffd166', glyph: 'star', tier: 'rare', weight: 5, minDepth: 2, ammo: 'pierce', use: 'lace',
    desc: '街头战斗药。痛觉消失，心脏为此付出代价。' },
  { id: 'overclock_cell', name: '职业超频电池', color: '#fcee0a', glyph: 'square', tier: 'rare', weight: 4, minDepth: 2, ammo: 'burst', use: 'cell',
    desc: '按你的义体协议自动调制输出。' },
  { id: 'datacache', name: '数据缓存', color: '#b06bff', glyph: 'orb', tier: 'common', weight: 5, minDepth: 1, ammo: 'burn', use: 'cache',
    desc: '未加密的战斗日志，读完就会。' },
  { id: 'credstick', name: '匿名信用棒', color: '#ffd166', glyph: 'gem', tier: 'common', weight: 5, minDepth: 1, ammo: 'burn', use: 'cred',
    desc: '不记名、不追溯、不退款。' }
];
