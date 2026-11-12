/* NEON DEPTH · 终局 Boss bosses_high.js
 * 第 15 层，三阶最终 Boss ×3，必须击杀才能通关。三条不同路线：
 *   bh_eye   持续压迫：激光 / 炸弹 / 辐射光环，逼你一直走位
 *   bh_hive  召唤海：召卵 + 拉扯 + 卵群护盾，人海淹没
 *   bh_phase 阶段转换：无敌相位蓄力 → 全屏震荡，之后狂暴 + 冲锋
 * 反制写在 desc，细则见交付说明。
 */
window.NEON = window.NEON || {};
window.NEON.bosses = (window.NEON.bosses || []).concat([
  { id:'bh_eye', name:'终焉之眼', tier:3, hp:128, atk:11, def:2, xp:155,
    color:'#ff5c8a', glyph:'orb', room:'cross',
    intro:'它睁开眼，整层开始融化',
    desc:'深渊底部的神经监视核心，被它看见即是灼烧',
    abilities:[
      { type:'laser', cd:3, power:11 },
      { type:'bomb',  cd:4, power:9 },
      { type:'aura',  cd:5, power:2 }
    ] },

  { id:'bh_hive', name:'万巢之母', tier:3, hp:136, atk:10, def:3, xp:170,
    color:'#7cffb2', glyph:'hex', room:'open',
    intro:'墙里爬出第一批孩子',
    desc:'把整层墙体改造成神经网络的母巢主机',
    abilities:[
      { type:'summon', cd:3, power:3 },
      { type:'pull',   cd:5 },
      { type:'shield', at:0.5 }
    ] },

  { id:'bh_phase', name:'三相之骸', tier:3, hp:120, atk:12, def:4, xp:180,
    color:'#9b7bff', glyph:'triangle', room:'pillars',
    intro:'它把自己撕成三个阶段',
    desc:'困在三个时间相位间的残骸，过去会追上你',
    abilities:[
      { type:'phase',  cd:6, power:2 },
      { type:'charge', cd:4, power:10 },
      { type:'enrage', at:0.35, power:3 }
    ] }
]);
