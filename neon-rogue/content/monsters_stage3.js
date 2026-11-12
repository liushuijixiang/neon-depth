/* NEON DEPTH · 第三阶段：虚空核心（11-15 层）普通怪
 * 8 只，覆盖全部 7 种 ai（chase 出现两次）。
 * 数值带：hp 22-55 / atk 8-14 / def 1-6 / xp 10-20 / weight 4-10。
 * onDeath：explode 2 只（爆蕊、猎犬），split 1 只（螨），其余 none。
 * 设计意图：比第二阶段更硬、更快、更不讲道理——分裂、自爆、召唤、治疗齐备。
 */
window.NEON = window.NEON || {};
window.NEON.monsters = (window.NEON.monsters || []).concat([
  { id:'s3_void_mite', name:'虚空螨', color:'#c9a4ff', glyph:'circle', ai:'chase',
    hp:[24,36], atk:[9,12], def:[2,3], xp:14, range:0, cooldown:2, onDeath:'split',
    minDepth:11, maxDepth:15, weight:9, boss:false, desc:'虚空缝隙里的群虫' },

  { id:'s3_mirror_shade', name:'镜界残影', color:'#8fe8ff', glyph:'diamond', ai:'turret',
    hp:[30,42], atk:[11,14], def:[3,4], xp:17, range:4, cooldown:2, onDeath:'none',
    minDepth:11, maxDepth:15, weight:7, boss:false, desc:'照出你的下一个死法' },

  { id:'s3_rift_charger', name:'裂隙突袭', color:'#ff5d8f', glyph:'triangle', ai:'charger',
    hp:[34,48], atk:[12,14], def:[2,4], xp:16, range:0, cooldown:2, onDeath:'none',
    minDepth:11, maxDepth:15, weight:7, boss:false, desc:'沿裂隙直线贯穿而来' },

  { id:'s3_corrupt_bulwark', name:'腐化壁垒', color:'#7a5cff', glyph:'square', ai:'tank',
    hp:[46,55], atk:[8,10], def:[4,6], xp:18, range:0, cooldown:3, onDeath:'none',
    minDepth:11, maxDepth:15, weight:5, boss:false, desc:'腐化装甲裹着旧神' },

  { id:'s3_void_bloomer', name:'虚空爆蕊', color:'#ff9e64', glyph:'star', ai:'exploder',
    hp:[22,30], atk:[12,14], def:[1,2], xp:12, range:0, cooldown:2, onDeath:'explode',
    minDepth:11, maxDepth:15, weight:6, boss:false, desc:'靠近就准备同归于尽' },

  { id:'s3_fracture_warden', name:'崩界守卫', color:'#b388ff', glyph:'hex', ai:'summoner',
    hp:[38,50], atk:[9,12], def:[3,5], xp:19, range:0, cooldown:4, onDeath:'none',
    minDepth:11, maxDepth:15, weight:4, boss:false, desc:'镇守崩塌边界，不断召出裂隙残片' },

  { id:'s3_hollow_choir', name:'空洞合唱', color:'#9dffdc', glyph:'star', ai:'healer',
    hp:[28,38], atk:[8,10], def:[2,3], xp:15, range:0, cooldown:4, onDeath:'none',
    minDepth:11, maxDepth:15, weight:4, boss:false, desc:'为虚空缝补伤口' },

  { id:'s3_oblivion_hound', name:'湮灭猎犬', color:'#ff7a5c', glyph:'triangle', ai:'chase',
    hp:[40,52], atk:[12,14], def:[3,4], xp:20, range:0, cooldown:2, onDeath:'explode',
    minDepth:11, maxDepth:15, weight:6, boss:false, desc:'嗅着数据残响追猎' }
]);
