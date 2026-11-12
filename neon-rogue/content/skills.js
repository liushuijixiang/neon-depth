/* NEON DEPTH — 技能树数据（44 节点：attack 14 / survival 15 / tactics 15）
 * 分支：attack（伤害/暴击/吸血）/ survival（生命/防御/回复/荆棘）/ tactics（闪避/视野/经验/击杀回复）
 * 结构：tier1→tier2→tier3，req 只指向本分支上一层；8 个主动技各 1 个，max 恒为 1。
 * 被动 effect 数值均为「每层」增量；主动技带 ability + cd + power。
 */
window.NEON = window.NEON || {};

window.NEON.skills = [
  /* ================= attack ================= */
  { id:'atk_servo', branch:'attack', tier:1, max:3, name:'伺服肌腱',
    desc:'攻击 +1', req:null, effect:{ atk:1 } },

  { id:'atk_nerve', branch:'attack', tier:1, max:3, name:'神经超频',
    desc:'暴击率 +4%', req:null, effect:{ crit:0.04 } },

  { id:'atk_venom', branch:'attack', tier:1, max:2, name:'腐蚀腺体',
    desc:'吸血 +8%', req:null, effect:{ lifesteal:0.08 } },

  { id:'act_shot', branch:'attack', tier:1, max:1, name:'脉冲枪管',
    desc:'主动：发射脉冲，远程狙击最近的敌人', req:null, effect:{}, ability:'shot', cd:3, power:3 },

  { id:'atk_edge', branch:'attack', tier:2, max:2, name:'刃化骨刺',
    desc:'攻击 +1，暴击率 +3%', req:'atk_servo', effect:{ atk:1, crit:0.03 } },

  { id:'atk_overclock', branch:'attack', tier:2, max:2, name:'临界过载',
    desc:'暴击伤害 +30%，暴击率 +3%', req:'atk_nerve', effect:{ critMult:0.3, crit:0.03 } },

  { id:'atk_fang', branch:'attack', tier:2, max:2, name:'血色泵机',
    desc:'吸血 +10%，攻击 +1', req:'atk_venom', effect:{ lifesteal:0.1, atk:1 } },

  { id:'atk_charge', branch:'attack', tier:2, max:2, name:'超导线圈',
    desc:'攻击 +1，暴击伤害 +30%', req:'atk_servo', effect:{ atk:1, critMult:0.3 } },

  { id:'act_nova', branch:'attack', tier:2, max:1, name:'环爆核心',
    desc:'主动：环身引爆，震伤周围一圈敌人', req:'atk_venom', effect:{}, ability:'nova', cd:5, power:4 },

  { id:'atk_singularity', branch:'attack', tier:3, max:1, name:'奇点弹膛',
    desc:'攻击 +2，暴击伤害 +30%', req:'atk_edge', effect:{ atk:2, critMult:0.3 } },

  { id:'atk_hemovore', branch:'attack', tier:3, max:1, name:'血巢共生',
    desc:'吸血 +12%，攻击 +2', req:'atk_fang', effect:{ lifesteal:0.12, atk:2 } },

  { id:'atk_railgun', branch:'attack', tier:3, max:1, name:'轨道穿刺',
    desc:'攻击 +2，暴击率 +4%', req:'atk_charge', effect:{ atk:2, crit:0.04 } },

  { id:'atk_melt', branch:'attack', tier:3, max:1, name:'熔核弹膛',
    desc:'吸血 +10%，暴击伤害 +30%', req:'atk_fang', effect:{ lifesteal:0.1, critMult:0.3 } },

  { id:'act_drone', branch:'attack', tier:3, max:1, name:'蜂群僚机',
    desc:'主动：召唤僚机协同作战', req:'atk_overclock', effect:{}, ability:'drone', cd:9, power:3 },

  /* ================= survival ================= */
  { id:'sv_chassis', branch:'survival', tier:1, max:3, name:'合金骨架',
    desc:'生命上限 +4', req:null, effect:{ maxHp:4 } },

  { id:'sv_plating', branch:'survival', tier:1, max:2, name:'陶瓷镀层',
    desc:'防御 +1', req:null, effect:{ def:1 } },

  { id:'sv_nanite', branch:'survival', tier:1, max:2, name:'纳米修补',
    desc:'每回合回复 1 生命', req:null, effect:{ regen:1 } },

  { id:'sv_spike', branch:'survival', tier:1, max:2, name:'逆刺皮膜',
    desc:'反伤 +2', req:null, effect:{ thorns:2 } },

  { id:'sv_reactor', branch:'survival', tier:2, max:2, name:'副心脏',
    desc:'生命上限 +5，每回合回复 +1', req:'sv_chassis', effect:{ maxHp:5, regen:1 } },

  { id:'sv_mirror', branch:'survival', tier:2, max:2, name:'镜面装甲',
    desc:'防御 +1，反伤 +2', req:'sv_plating', effect:{ def:1, thorns:2 } },

  { id:'sv_marrow', branch:'survival', tier:2, max:2, name:'髓质炉',
    desc:'每回合回复 +1，生命上限 +4', req:'sv_nanite', effect:{ regen:1, maxHp:4 } },

  { id:'sv_barbs', branch:'survival', tier:2, max:2, name:'荆棘回路',
    desc:'反伤 +2，生命上限 +4', req:'sv_spike', effect:{ thorns:2, maxHp:4 } },

  { id:'sv_dense', branch:'survival', tier:2, max:2, name:'致密骨架',
    desc:'生命上限 +5，防御 +1', req:'sv_chassis', effect:{ maxHp:5, def:1 } },

  { id:'act_wall', branch:'survival', tier:2, max:1, name:'相位壁障',
    desc:'主动：立起相位墙，封堵来路', req:'sv_plating', effect:{}, ability:'wall', cd:5, power:3 },

  { id:'sv_phoenix', branch:'survival', tier:3, max:1, name:'不死鸟核心',
    desc:'生命上限 +6，每回合回复 +2', req:'sv_reactor', effect:{ maxHp:6, regen:2 } },

  { id:'sv_bastion', branch:'survival', tier:3, max:1, name:'棱堡骨架',
    desc:'防御 +2，反伤 +3', req:'sv_mirror', effect:{ def:2, thorns:3 } },

  { id:'sv_heart', branch:'survival', tier:3, max:1, name:'双心泵',
    desc:'生命上限 +6，每回合回复 +1', req:'sv_marrow', effect:{ maxHp:6, regen:1 } },

  { id:'sv_aegis', branch:'survival', tier:3, max:1, name:'圣盾协议',
    desc:'防御 +2，生命上限 +5', req:'sv_barbs', effect:{ def:2, maxHp:5 } },

  { id:'act_turret', branch:'survival', tier:3, max:1, name:'自动炮塔',
    desc:'主动：架设炮塔，自动开火', req:'sv_dense', effect:{}, ability:'turret', cd:8, power:3 },

  /* ================= tactics ================= */
  { id:'tc_ghost', branch:'tactics', tier:1, max:3, name:'幽灵步态',
    desc:'闪避 +4%', req:null, effect:{ dodge:0.04 } },

  { id:'tc_cache', branch:'tactics', tier:1, max:3, name:'神经缓存',
    desc:'经验获取 +10%', req:null, effect:{ xpGain:0.1 } },

  { id:'tc_scav', branch:'tactics', tier:1, max:2, name:'尸体回收',
    desc:'击杀回复 2 生命', req:null, effect:{ onKillHeal:2 } },

  { id:'tc_phase', branch:'tactics', tier:2, max:2, name:'相位偏移',
    desc:'闪避 +4%，视野 +1', req:'tc_ghost', effect:{ dodge:0.04, vision:1 } },

  { id:'tc_prey', branch:'tactics', tier:2, max:2, name:'猎杀标记',
    desc:'击杀回复 3 生命', req:'tc_phase', effect:{ onKillHeal:3 } },

  { id:'tc_harvest', branch:'tactics', tier:2, max:2, name:'收割协议',
    desc:'击杀回复 +2，经验获取 +10%', req:'tc_cache', effect:{ onKillHeal:2, xpGain:0.1 } },

  { id:'tc_ping', branch:'tactics', tier:2, max:2, name:'声呐脉冲',
    desc:'视野 +1，击杀回复 +2', req:'tc_scav', effect:{ vision:1, onKillHeal:2 } },

  { id:'act_stealth', branch:'tactics', tier:2, max:1, name:'光学迷彩',
    desc:'主动：短时隐形，敌方视觉暂时失效', req:'tc_ghost', effect:{}, ability:'stealth', cd:6, power:3 },

  { id:'act_blink', branch:'tactics', tier:2, max:1, name:'闪烁突进',
    desc:'主动：朝面向方向瞬移数格', req:'tc_phase', effect:{}, ability:'blink', cd:4, power:4 },

  { id:'tc_wraith', branch:'tactics', tier:3, max:1, name:'幽影协议',
    desc:'闪避 +6%，击杀回复 +3', req:'tc_phase', effect:{ dodge:0.06, onKillHeal:3 } },

  { id:'tc_overmind', branch:'tactics', tier:3, max:2, name:'超脑阵列',
    desc:'经验获取 +20%，击杀回复 +4', req:'tc_harvest', effect:{ xpGain:0.2, onKillHeal:4 } },

  { id:'tc_mark', branch:'tactics', tier:3, max:1, name:'猎杀矩阵',
    desc:'击杀回复 +4，经验获取 +10%', req:'tc_prey', effect:{ onKillHeal:4, xpGain:0.1 } },

  { id:'tc_ghostwalk', branch:'tactics', tier:3, max:1, name:'虚数步',
    desc:'闪避 +6%，视野 +1', req:'tc_ping', effect:{ dodge:0.06, vision:1 } },

  { id:'act_grow', branch:'tactics', tier:3, max:1, name:'巨化血清',
    desc:'主动：注射血清，体型暴涨、攻击大增', req:'tc_prey', effect:{}, ability:'grow', cd:7, power:3 }
];

/* 幽灵：潜行 / 标记 / 刺杀 */
window.NEON.skills = window.NEON.skills.concat([
  { id:'gh_silence', class:'ghost', branch:'attack', tier:1, max:2, name:'静默',
    desc:'先手伤害 +30%', req:null, effect:{ backstab:0.3 } },
  { id:'gh_thirst', class:'ghost', branch:'survival', tier:1, max:2, name:'嗜血',
    desc:'吸血 +8%', req:null, effect:{ lifesteal:0.08 } },
  { id:'gh_veil', class:'ghost', branch:'tactics', tier:1, max:2, name:'薄影',
    desc:'闪避 +4%', req:null, effect:{ dodge:0.04 } },
  { id:'gh_hunter', class:'ghost', branch:'attack', tier:2, max:2, name:'猎杀本能',
    desc:'先手伤害 +40%，暴击率 +5%', req:'gh_silence', effect:{ backstab:0.4, crit:0.05 } },
  { id:'gh_adrenal', class:'ghost', branch:'survival', tier:2, max:2, name:'肾上腺',
    desc:'攻击 +1，生命上限 +4', req:'gh_thirst', effect:{ atk:1, maxHp:4 } },
  { id:'gh_shadowstep', class:'ghost', branch:'tactics', tier:2, max:2, name:'影步精通',
    desc:'闪避 +4%，暴击率 +3%', req:'gh_veil', effect:{ dodge:0.04, crit:0.03 } },
  { id:'gh_bloodmoon', class:'ghost', branch:'attack', tier:3, max:1, name:'血月',
    desc:'先手伤害 +60%，击杀回复 3 生命', req:'gh_hunter', effect:{ backstab:0.6, onKillHeal:3 } },
  { id:'gh_void', class:'ghost', branch:'tactics', tier:3, max:1, name:'无我',
    desc:'暴击率 +8%，闪避 +5%', req:'gh_shadowstep', effect:{ crit:0.08, dodge:0.05 } },
  { id:'gh_flesh', class:'ghost', branch:'survival', tier:3, max:1, name:'血肉替代',
    desc:'生命上限 +10，吸血 +5%', req:'gh_adrenal', effect:{ maxHp:10, lifesteal:0.05 } }
]);
