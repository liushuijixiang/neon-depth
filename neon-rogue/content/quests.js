/* NEON DEPTH · 暗网委托模板（1.4）
 * tier: low 跑腿 / high 脏活 / lethal 黑墙合约
 * type 由引擎计数：kill / killElite / killType / clear / combo / noDamage / swift /
 *                  bossTime / bossClean / challenge / hoard / shards / useItem / hunt
 * deadline: floor 本层内 / floors2 两层内 / boss 下一个守卫前
 * n: [min,max] 第一区数值；引擎按区域放大（scale:true）。
 * terms: 风险条款，接下后到完成或失败前一直生效（见引擎 CONTRACT_TERMS）。
 */
window.NEON = window.NEON || {};
window.NEON.quests = [
  /* ---------- low 跑腿：本层内，几乎无风险 ---------- */
  { id:'c_sweep', tier:'low', type:'kill', name:'清道协议', desc:'本层击毁 {n} 个敌对单位',
    n:[4,6], scale:false, deadline:'floor', reward:{ xp:12 } },
  { id:'c_shards', tier:'low', type:'shards', name:'碎片走私', desc:'本层回收 {n} 枚数据碎片',
    n:[1,1], deadline:'floor', reward:{ xp:12 } },
  { id:'c_combo', tier:'low', type:'combo', name:'节拍器', desc:'本层打出 ×{n} 连杀',
    n:[3,3], deadline:'floor', reward:{ xp:12 } },
  { id:'c_typed', tier:'low', type:'killType', name:'定点清除', desc:'本层击毁 {n} 个「{t}」',
    n:[2,3], deadline:'floor', reward:{ xp:12 } },
  { id:'c_items', tier:'low', type:'useItem', name:'试药员', desc:'本层使用 {n} 个消耗品',
    n:[1,2], deadline:'floor', reward:{ xp:12 } },

  /* ---------- high 脏活：两层内，附带一条风险条款 ---------- */
  { id:'c_elites', tier:'high', type:'killElite', name:'剥皮行动', desc:'两层内猎杀 {n} 个精英',
    n:[2,3], deadline:'floors2', terms:['hunted'], reward:{ xp:30 } },
  { id:'c_clear', tier:'high', type:'clear', name:'焦土清单', desc:'清空本层全部敌人后再下潜',
    n:[1,1], deadline:'floor', terms:['bounty'], reward:{ xp:30 } },
  { id:'c_ghost', tier:'high', type:'noDamage', name:'零噪潜入', desc:'无伤走完本层（生命不下降）',
    n:[1,1], deadline:'floor', terms:['anemia'], reward:{ xp:30 } },
  { id:'c_trial', tier:'high', type:'challenge', name:'角斗场买家', desc:'两层内完成 {n} 个挑战房',
    n:[1,1], deadline:'floors2', terms:['hunted'], reward:{ xp:30 } },
  { id:'c_swift', tier:'high', type:'swift', name:'快递员', desc:'{n} 回合内抵达下一层',
    n:[28,34], deadline:'floor', terms:['glass'], reward:{ xp:30 } },
  { id:'c_hunt', tier:'high', type:'hunt', name:'通缉令', desc:'击杀本层的赏金目标',
    n:[1,1], deadline:'floor', terms:['anemia'], reward:{ xp:30 } },

  /* ---------- lethal 黑墙合约：押上信用点 + 两条条款，失败永久违约 ---------- */
  { id:'c_boss_time', tier:'lethal', type:'bossTime', name:'限时斩首', desc:'进入守卫层后 {n} 回合内击败守卫',
    n:[34,40], deadline:'boss', terms:['stake','hunted'], reward:{ xp:60 } },
  { id:'c_boss_clean', tier:'lethal', type:'bossClean', name:'徒手协议', desc:'击败下一个守卫，守卫层内不使用消耗品',
    n:[1,1], deadline:'boss', terms:['stake','glass'], reward:{ xp:60 } },
  { id:'c_massacre', tier:'lethal', type:'killElite', name:'血洗名单', desc:'下一个守卫前猎杀 {n} 个精英',
    n:[5,6], deadline:'boss', terms:['stake','bounty'], reward:{ xp:60 } },
  { id:'c_hoard', tier:'lethal', type:'hoard', name:'洗钱路线', desc:'带着至少 {n} 信用点抵达守卫层',
    n:[90,110], scale:true, deadline:'boss', terms:['stake','anemia'], reward:{ xp:60 } },
  { id:'c_pristine', tier:'lethal', type:'noDamage', name:'幽灵协议', desc:'连续两层无伤（每层生命不下降）',
    n:[2,2], deadline:'floors2', terms:['stake','hunted'], reward:{ xp:60 } },
  /* ---------- 3.4 新增 ---------- */
  { id:'c_corp', tier:'low', type:'killCorp', name:'越界执法', desc:'本层击毁 {n} 名公司武装', n:[2,2], deadline:'floor', reward:{ xp:12 } },
  { id:'c_chest', tier:'low', type:'chests', name:'开箱人', desc:'本层打开 {n} 个箱子', n:[2,2], deadline:'floor', reward:{ xp:12 } },
  { id:'c_relay', tier:'low', type:'beacons', name:'接线员', desc:'本层接通 {n} 个信号中继', n:[3,3], deadline:'floor', reward:{ xp:12 } },
  { id:'c_ambush', tier:'high', type:'ambush', name:'背后一刀', desc:'两层内击杀 {n} 个还没发现你的敌人（一刀或一回合内解决）', n:[3,4], deadline:'floors2', terms:['hunted'], reward:{ xp:30 } },
  { id:'c_purist', tier:'high', type:'noSkill', name:'肉身协议', desc:'不用义体主动技能清空本层', n:[1,1], deadline:'floor', terms:['glass'], reward:{ xp:30 } },
  { id:'c_vip', tier:'lethal', type:'corpVip', name:'董事会名单', desc:'下一个守卫倒下前，猎杀名单上的公司高管', n:[1,1], deadline:'boss', terms:['stake','hunted'], reward:{ xp:60 } },
  { id:'c_ghost_hidden', tier:'high', type:'undetected', cls:'ghost', name:'隐匿', desc:'不被发现',
    n:[1,1], deadline:'floor', terms:['anemia'], reward:{ xp:30 } },
  { id:'c_assault_range', tier:'low', type:'ranged', cls:'assault', name:'远程', desc:'远程解决 {n} 个敌人',
    n:[4,6], deadline:'floor', reward:{ xp:12 } }
];
