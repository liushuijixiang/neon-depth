/* NEON DEPTH · 低阶 Boss bosses_low.js
 * 第 5 层一阶 Boss ×3（玩家约 6-8 级） / 第 10 层二阶 Boss ×3（玩家约 10-14 级）
 * 每个 Boss 守一间专属竞技场，击败才开下层电梯。
 *
 * 机制覆盖（各有唯一的核心动词 + 差异化变化项）：
 *   裂齿猎犬   冲锋 + 低血狂暴       → 侧移一步 / 拉开身位
 *   蜂巢母体   召唤 + 腐蚀光环       → 先清小怪 / 离开 4 格
 *   锈甲守望   高血减伤 + 自愈       → 攒爆发压过半血，别磨血
 *   棱镜枪骑   蓄力激光 + 拉人       → 看预警线横移，被拉后立刻脱线
 *   磁雷蛛     延迟爆雷 + 腐蚀光环   → 保持移动，亮灯即走 2 格
 *   镜渊       瞬移 + 召唤 + 狂暴    → 贴脸就拉开，先拆分身再打本体
 *
 * 全部字段为纯数据，ES5 语法。
 */
window.NEON = window.NEON || {};
window.NEON.bosses = (window.NEON.bosses || []).concat([

  /* ================= 一阶 · 第 5 层 ================= */

  /* 冲锋教学：开阔场无遮挡，逼玩家学会侧移一步而不是对撞 */
  { id:'bl_hound', name:'裂齿猎犬', tier:1, hp:50, atk:6, def:2, xp:50,
    color:'#ff4d2e', glyph:'triangle', room:'open',
    intro:'铁链断了，它闻到血',
    desc:'地下斗犬场逃出的改装猎犬，液压颚能咬穿装甲',
    abilities:[
      { type:'charge', cd:3, power:3 },
      { type:'enrage', at:0.35, power:2 }
    ] },

  /* 召唤教学：十字场四臂留出包抄空间，小怪从侧翼涌出，光环逼玩家不能贴脸站桩 */
  { id:'bl_hive', name:'蜂巢母体', tier:1, hp:56, atk:5, def:1, xp:58,
    color:'#c6ff33', glyph:'hex', room:'cross',
    intro:'天花板开始往下掉卵',
    desc:'失控的生物培养舱，至今仍在批量产卵',
    abilities:[
      { type:'summon', cd:4, power:2 },
      { type:'aura', cd:5, power:3 }
    ] },

  /* 续航教学：高血减伤 40%，半血后免疫护盾但开始回血，考的是爆发窗口而非磨血 */
  { id:'bl_warden', name:'锈甲守望', tier:1, hp:56, atk:5, def:3, xp:57,
    color:'#6fa8ff', glyph:'square', room:'pillars',
    intro:'它把盾举过头顶',
    desc:'旧港反应堆的守门机，锈甲下是滚烫的液压核心',
    abilities:[
      { type:'shield', at:0.5 },
      { type:'heal', cd:6, power:8 }
    ] },

  /* ================= 二阶 · 第 10 层 ================= */

  /* 激光教学：十字场给足直线，蓄力一回合亮红线；拉人把玩家拽上准线，但仍有 1 回合脱线 */
  { id:'bl_lance', name:'棱镜枪骑', tier:2, hp:84, atk:8, def:2, xp:88,
    color:'#25e6ff', glyph:'diamond', room:'cross',
    intro:'红点落在你胸口',
    desc:'企业退役的棱镜火控骑兵，从不在原地开第二枪',
    abilities:[
      { type:'laser', cd:4, power:10 },
      { type:'pull', cd:6 }
    ] },

  /* 雷区压迫：雷埋在脚下、延迟一回合炸 2 格，配合 4 格腐蚀光环封锁原地输出 */
  { id:'bl_mine', name:'磁雷蛛', tier:2, hp:80, atk:7, def:3, xp:84,
    color:'#ffd23f', glyph:'circle', room:'open',
    intro:'脚下亮起三颗红点',
    desc:'八足布雷机，把整层走廊织成一张磁网',
    abilities:[
      { type:'bomb', cd:3, power:7 },
      { type:'aura', cd:6, power:4 }
    ] },

  /* 收官刺客：柱子场限制瞬移落点，闪现贴脸 + 分身 + 低血狂暴，考走位与目标选择 */
  { id:'bl_mirror', name:'镜渊', tier:2, hp:92, atk:9, def:2, xp:98,
    color:'#c04dff', glyph:'star', room:'pillars',
    intro:'镜子里有六个你',
    desc:'寄生在镜面后的刺杀协议，每块玻璃都是它的门',
    abilities:[
      { type:'blink', cd:3 },
      { type:'summon', cd:5, power:2 },
      { type:'enrage', at:0.3, power:2 }
    ] }

]);
