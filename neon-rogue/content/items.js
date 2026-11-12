/* NEON DEPTH · 地面拾取物（1.4 暗巷经济）
 * 踩上即生效。数值按「最大生命 / 升级所需经验 / 层数」实时结算：
 *   healPct  回复最大生命的百分比     xpPct  升级所需经验的百分比
 *   credits  基础信用点（+2/层）      shieldPct 护盾占最大生命百分比
 *   atk/def  永久属性（每 6 层 +1）   maxHp 生命上限基础值（+1/3层）
 */
window.NEON = window.NEON || {};
window.NEON.items = [
  /* ---------- heal ×4 ---------- */
  { id:'nano_patch', name:'纳米补片', kind:'heal', color:'#57ffa8', glyph:'cross',
    weight:18, minDepth:1, maxDepth:15, effect:{ healPct:0.12 }, msg:'补片贴合',
    desc:'一次性纳米修复贴片' },

  { id:'repair_gel', name:'修复凝胶', kind:'heal', color:'#3df0c0', glyph:'cross',
    weight:13, minDepth:1, maxDepth:15, effect:{ healPct:0.18 }, msg:'凝胶注入',
    desc:'缓释凝胶，创口自愈' },

  { id:'field_suture', name:'战地缝合', kind:'heal', color:'#7bffb4', glyph:'cross',
    weight:7, minDepth:3, maxDepth:15, effect:{ healPct:0.26 }, msg:'缝合完成',
    desc:'机械臂自动缝合创口' },

  { id:'coolant_cell', name:'冷却液罐', kind:'heal', color:'#22e6ff', glyph:'orb',
    weight:10, minDepth:1, maxDepth:15, effect:{ healPct:0.1, cleanse:1 }, msg:'冷却回灌',
    desc:'循环冷却液，压回体温并冲掉毒素' },

  /* ---------- atk / def ---------- */
  { id:'overclock_chip', name:'超频芯片', kind:'atk', color:'#ff2fa8', glyph:'gem',
    weight:6, minDepth:2, maxDepth:15, effect:{ atk:1 }, msg:'主频拉满',
    desc:'突破散热上限的主频' },

  { id:'armor_plate', name:'装甲片', kind:'def', color:'#4aa8ff', glyph:'shield',
    weight:6, minDepth:1, maxDepth:15, effect:{ def:1 }, msg:'装甲啮合',
    desc:'拼接式合金装甲' },

  /* ---------- xp / credits / maxhp ---------- */
  { id:'data_shard', name:'数据碎片', kind:'xp', color:'#9b5cff', glyph:'gem',
    weight:14, minDepth:1, maxDepth:15, effect:{ xpPct:0.22 }, msg:'碎片读取',
    desc:'未解密的深层数据' },

  { id:'credit_chip', name:'信用芯片', kind:'credit', color:'#ffd166', glyph:'orb',
    weight:12, minDepth:1, maxDepth:15, effect:{ credits:6 }, msg:'余额入账',
    desc:'匿名信用点，黑市通用' },

  { id:'bio_reactor', name:'生体反应炉', kind:'maxhp', color:'#57ffa8', glyph:'gem',
    weight:5, minDepth:3, maxDepth:15, effect:{ maxHp:3 }, msg:'槽位扩容',
    desc:'植入式生体反应炉' },

  /* ---------- buff ×2 ---------- */
  { id:'shield_emitter', name:'护盾发生器', kind:'buff', color:'#22e6ff', glyph:'shield',
    weight:8, minDepth:1, maxDepth:15, effect:{ buff:'shield', shieldPct:0.15, duration:25 }, msg:'护盾充能',
    desc:'生成吸收伤害的护盾' },

  { id:'regen_pod', name:'再生舱', kind:'buff', color:'#3df0c0', glyph:'orb',
    weight:8, minDepth:1, maxDepth:15, effect:{ buff:'regen', healPct:0.04, duration:5 }, msg:'再生启动',
    desc:'细胞级修复程序，持续回复' },

  /* ---------- random ---------- */
  { id:'chaos_cache', name:'混沌缓存', kind:'random', color:'#ff2fa8', glyph:'star',
    weight:7, minDepth:1, maxDepth:15, effect:{}, msg:'缓存解包',
    desc:'可能是补给、属性、信用点，或一件消耗品' }
];
