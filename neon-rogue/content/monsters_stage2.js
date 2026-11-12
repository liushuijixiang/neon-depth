/* NEON DEPTH — 第二阶段（第 6-10 层）普通怪
 * 主题：冷冻仓 / 电弧配电 / 服务器废墟 / 数据幽灵
 * 8 只，无 Boss；ai 覆盖 chase/turret/charger/exploder/summoner/tank/healer
 * 数值按 8-12 级玩家（HP 50-70 / ATK 8-12）校准
 */
window.NEON = window.NEON || {};
window.NEON.monsters = (window.NEON.monsters || []).concat([
  /* 冷冻仓：成群、脆、死后裂成两只 */
  { id:'s2_frost_mite', name:'霜螨', color:'#8fd8ff', glyph:'circle', ai:'chase',
    hp:[16,26], atk:[6,9], def:[1,2], xp:9, range:0, cooldown:2, onDeath:'split',
    minDepth:6, maxDepth:8, weight:9, boss:false, desc:'冰层里成群爬行' },

  /* 配电区：固定炮台，电弧点名 */
  { id:'s2_arc_pylon', name:'电弧塔', color:'#6fe3ff', glyph:'square', ai:'turret',
    hp:[18,26], atk:[8,11], def:[3,4], xp:11, range:5, cooldown:2, onDeath:'explode',
    minDepth:6, maxDepth:9, weight:6, boss:false, desc:'过载前会嘶嘶作响' },

  /* 冷冻通道：直线冲锋，撞墙自己晕 */
  { id:'s2_ice_ram', name:'冰壳撞兽', color:'#b7ecff', glyph:'triangle', ai:'charger',
    hp:[26,34], atk:[9,11], def:[3,4], xp:12, range:0, cooldown:3, onDeath:'none',
    minDepth:7, maxDepth:10, weight:6, boss:false, desc:'冰壳覆体，一低头便是直线冲撞' },

  /* 机柜废墟：慢、厚、堵路 */
  { id:'s2_core_husk', name:'数据残躯', color:'#7d93b8', glyph:'hex', ai:'tank',
    hp:[30,34], atk:[7,9], def:[4,5], xp:12, range:0, cooldown:3, onDeath:'none',
    minDepth:8, maxDepth:10, weight:5, boss:false, desc:'机柜里爬出的空壳' },

  /* 数据幽灵：快、薄、贴脸咬 */
  { id:'s2_packet_ghost', name:'幽灵包', color:'#b98cff', glyph:'diamond', ai:'chase',
    hp:[14,20], atk:[7,10], def:[0,1], xp:10, range:0, cooldown:2, onDeath:'none',
    minDepth:8, maxDepth:10, weight:7, boss:false, desc:'已死协议的残影' },

  /* 电容区：贴上来就整片跳闸 */
  { id:'s2_volt_sac', name:'电浆囊', color:'#ffe066', glyph:'star', ai:'exploder',
    hp:[16,22], atk:[9,11], def:[0,1], xp:10, range:0, cooldown:3, onDeath:'explode',
    minDepth:6, maxDepth:9, weight:6, boss:false, desc:'碰一下就整片跳闸' },

  /* 废墟深处：唱诗唤醒残骸 */
  { id:'s2_ruin_cantor', name:'废墟唱诗', color:'#c46bff', glyph:'star', ai:'summoner',
    hp:[20,28], atk:[5,7], def:[2,3], xp:13, range:0, cooldown:4, onDeath:'none',
    minDepth:7, maxDepth:10, weight:5, boss:false, desc:'用损坏圣歌唤醒残骸' },

  /* 维护层：焊枪给同伴续命 */
  { id:'s2_repair_drone', name:'修复无人机', color:'#6bffb0', glyph:'square', ai:'healer',
    hp:[18,24], atk:[5,6], def:[2,3], xp:12, range:0, cooldown:4, onDeath:'none',
    minDepth:7, maxDepth:10, weight:5, boss:false, desc:'焊枪会给同伴续命' }
]);
