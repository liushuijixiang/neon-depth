window.NEON = window.NEON || {};
window.NEON.monsters = [
  // ── 第 1 层起可能出现 ──────────────────────────────────────────
  { id:'drone', name:'巡逻机', color:'#ff2fa8', glyph:'diamond',
    ai:'chase', hp:[5,16], atk:[2,6], def:[0,1], xp:5,
    range:0, cooldown:2, onDeath:'none',
    minDepth:1, maxDepth:5, weight:10, boss:false,
    desc:'企业外包的廉价巡逻机，锁定即直扑' },

  { id:'pulse_turret', name:'脉冲炮塔', color:'#ffb02e', glyph:'square',
    ai:'turret', hp:[6,18], atk:[3,8], def:[1,2], xp:7,
    range:4, cooldown:2, onDeath:'none',
    minDepth:1, maxDepth:5, weight:8, boss:false,
    desc:'钉在墙上的脉冲哨戒炮' },

  { id:'blade_runner', name:'刃轮', color:'#ff6b35', glyph:'triangle',
    ai:'charger', hp:[6,17], atk:[3,7], def:[0,1], xp:6,
    range:0, cooldown:2, onDeath:'none',
    minDepth:1, maxDepth:5, weight:9, boss:false,
    desc:'一次滑铲两格，刀锋先行' },

  { id:'explode_bug', name:'自爆蜂', color:'#d6ff3f', glyph:'circle',
    ai:'exploder', hp:[4,12], atk:[3,6], def:[0,1], xp:6,
    range:0, cooldown:2, onDeath:'none',
    minDepth:1, maxDepth:5, weight:8, boss:false,
    desc:'贴着你就烧尽自己的核心' },

  { id:'fission', name:'裂变体', color:'#f2ff49', glyph:'triangle',
    ai:'chase', hp:[7,19], atk:[3,7], def:[0,1], xp:7,
    range:0, cooldown:2, onDeath:'split',
    minDepth:1, maxDepth:4, weight:7, boss:false,
    desc:'裂变核心极不稳定，击碎即一分为二' },

  // ── 第 2 层起 ────────────────────────────────────────────────
  { id:'data_hound', name:'数据猎犬', color:'#22e6ff', glyph:'diamond',
    ai:'chase', hp:[9,24], atk:[4,9], def:[1,2], xp:8,
    range:0, cooldown:2, onDeath:'none',
    minDepth:2, maxDepth:5, weight:8, boss:false,
    desc:'嗅到数据血味就狂奔' },

  { id:'hive_mother', name:'孵巢母体', color:'#b04dff', glyph:'hex',
    ai:'summoner', hp:[9,24], atk:[2,5], def:[1,2], xp:9,
    range:4, cooldown:4, onDeath:'none',
    minDepth:2, maxDepth:5, weight:6, boss:false,
    desc:'从腹腔孵出更小的麻烦' },

  { id:'bulkhead', name:'壁垒机兵', color:'#7a8ba8', glyph:'square',
    ai:'tank', hp:[12,34], atk:[3,8], def:[2,4], xp:10,
    range:0, cooldown:2, onDeath:'none',
    minDepth:2, maxDepth:5, weight:5, boss:false,
    desc:'装甲厚重，动作永远慢半拍' },

  { id:'med_drone', name:'修补无人机', color:'#3dffb0', glyph:'circle',
    ai:'healer', hp:[7,20], atk:[2,4], def:[1,2], xp:8,
    range:3, cooldown:3, onDeath:'none',
    minDepth:2, maxDepth:5, weight:5, boss:false,
    desc:'边打边修补同伴的伤口' },

  // ── 第 3 层起 ────────────────────────────────────────────────
  { id:'prism_sniper', name:'狙击棱镜', color:'#7c6bff', glyph:'star',
    ai:'turret', hp:[7,20], atk:[4,10], def:[1,2], xp:9,
    range:6, cooldown:3, onDeath:'none',
    minDepth:3, maxDepth:5, weight:6, boss:false,
    desc:'远处校准，然后一束穿甲' },

  { id:'rail_ram', name:'熔核冲角', color:'#ff7a45', glyph:'square',
    ai:'charger', hp:[10,26], atk:[4,10], def:[2,3], xp:9,
    range:0, cooldown:2, onDeath:'explode',
    minDepth:3, maxDepth:5, weight:6, boss:false,
    desc:'过载核心，撞上来一起烧' },

  // ── Boss ────────────────────────────────────────────────────
  { id:'abyss_core', name:'深渊主脑', color:'#ff2f6d', glyph:'star',
    ai:'summoner', hp:[55,55], atk:[8,8], def:[2,2], xp:80,
    range:0, cooldown:3, onDeath:'none',
    minDepth:5, maxDepth:5, weight:0, boss:true,
    desc:'深处的主脑，正在孵化下一层' }
];

/* 第二阶段：冷冻数据层 B6-B10 */
window.NEON.monsters = window.NEON.monsters.concat([
  { id:'frost_hound', name:'霜噬犬', color:'#8fd8ff', glyph:'diamond', ai:'chase',
    hp:[14,26], atk:[6,9], def:[1,2], xp:9, range:0, cooldown:2, onDeath:'none',
    minDepth:6, maxDepth:10, weight:10, boss:false, desc:'从冷冻仓冰层里扑出的猎犬' },
  { id:'arc_turret', name:'电弧炮台', color:'#7fe9ff', glyph:'square', ai:'turret',
    hp:[15,24], atk:[7,10], def:[2,3], xp:10, range:6, cooldown:2, onDeath:'none',
    minDepth:6, maxDepth:10, weight:8, boss:false, desc:'过载电弧，射程极远' },
  { id:'splitter', name:'分裂球', color:'#9b5cff', glyph:'circle', ai:'chase',
    hp:[12,20], atk:[5,8], def:[1,2], xp:8, range:0, cooldown:2, onDeath:'split',
    minDepth:6, maxDepth:10, weight:7, boss:false, desc:'打碎会裂成两个' },
  { id:'bulwark', name:'护盾机兵', color:'#ffd166', glyph:'hex', ai:'tank',
    hp:[26,40], atk:[7,10], def:[3,5], xp:12, range:0, cooldown:2, onDeath:'none',
    minDepth:6, maxDepth:10, weight:6, boss:false, desc:'重甲护盾机兵，两回合才挪一步' },
  { id:'medic_drone', name:'医疗无人机', color:'#57ffa8', glyph:'cross', ai:'healer',
    hp:[12,20], atk:[3,5], def:[1,2], xp:9, range:3, cooldown:3, onDeath:'none',
    minDepth:6, maxDepth:10, weight:5, boss:false, desc:'给同伴续命的飞行器' },
  { id:'bomber_drone', name:'轰炸无人机', color:'#ff7a45', glyph:'triangle', ai:'exploder',
    hp:[10,18], atk:[7,10], def:[0,1], xp:9, range:0, cooldown:2, onDeath:'none',
    minDepth:6, maxDepth:10, weight:8, boss:false, desc:'贴身自爆的飞行炸弹' }
]);

/* 第三阶段：虚空核心 B11-B15 */
window.NEON.monsters = window.NEON.monsters.concat([
  { id:'void_stalker', name:'虚空猎手', color:'#ff2fa8', glyph:'star', ai:'charger',
    hp:[22,34], atk:[9,12], def:[2,3], xp:14, range:0, cooldown:2, onDeath:'none',
    minDepth:11, maxDepth:15, weight:9, boss:false, desc:'虚空里冲出的猎手' },
  { id:'mirror_knight', name:'镜甲骑士', color:'#22e6ff', glyph:'hex', ai:'tank',
    hp:[34,50], atk:[9,12], def:[4,6], xp:16, range:0, cooldown:2, onDeath:'none',
    minDepth:11, maxDepth:15, weight:6, boss:false, desc:'镜面装甲，行动迟缓' },
  { id:'spawn_tower', name:'孵化塔', color:'#9b5cff', glyph:'square', ai:'summoner',
    hp:[26,40], atk:[5,8], def:[2,4], xp:16, range:0, cooldown:4, onDeath:'none',
    minDepth:11, maxDepth:15, weight:6, boss:false, desc:'不断吐出虚空幼虫' },
  { id:'void_eye', name:'虚空之眼', color:'#ffd166', glyph:'orb', ai:'turret',
    hp:[20,32], atk:[10,13], def:[2,3], xp:15, range:6, cooldown:2, onDeath:'none',
    minDepth:11, maxDepth:15, weight:7, boss:false, desc:'凝视即灼烧的浮游炮' },
  { id:'colossus', name:'虚空巨像', color:'#ff4d5e', glyph:'triangle', ai:'chase',
    hp:[40,58], atk:[10,13], def:[3,5], xp:20, range:0, cooldown:2, onDeath:'explode',
    minDepth:11, maxDepth:15, weight:5, boss:false, desc:'倒下时也会炸开' },
  { id:'swarmling', name:'虚空幼虫', color:'#c9a4ff', glyph:'circle', ai:'chase',
    hp:[8,14], atk:[6,9], def:[0,1], xp:6, range:0, cooldown:2, onDeath:'none',
    minDepth:11, maxDepth:15, weight:10, boss:false, desc:'数量就是它的武器' }
]);
