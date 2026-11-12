/* 1.0 补充过场：换区、三个人格各自的醒来。只追加，不改已有场景。 */
(function () {
  var S = (window.NEON = window.NEON || {}).story;
  if (!S) return;
  S.scenes = S.scenes || {};
  var add = {
    enter_cold: [
      { art: 'lift_cold', who: '', text: '电梯门一开，霓虹没了。冷气贴着地面漫上来，没过脚踝。', fx: 'flash' },
      { art: 'pod_rows', who: '', text: '两边是一排排冻存舱，蓝光一格一格亮到看不见的地方。', fx: 'none' },
      { art: 'pod_rows', who: '灰线', text: '到数据港了？这层往下我只能断断续续听见你。', fx: 'static' },
      { art: 'pod_rows', who: '灰线', text: '舱上的标签别细看。看了也别跟我说。', fx: 'none' },
      { art: 'frost_shape', who: '', text: '最近的一格舱是空的。内壁那层霜，是个人的形状。', fx: 'red' }
    ],
    enter_rift: [
      { art: 'wall_face', who: '', text: '第十一层没有墙。该是墙的地方，是一整面发黑的东西，表面有红色的格子在慢慢换位置。', fx: 'flash' },
      { art: 'breach', who: '', text: '井是直着打穿它的。断口上长了一圈白色结晶，摸上去是温的。', fx: 'none' },
      { art: 'breach', who: '灰线', text: '……黑墙。课本上说谁也过不去的那个。', fx: 'static' },
      { art: 'breach', who: '灰线', text: '穹顶在上面盖了十一层楼，就为了把这道口子捂住。', fx: 'none' },
      { art: 'wall_gap', who: '', text: '你走近的时候，格子停了一下，像是认出了什么，然后给你让开了一条缝。', fx: 'red' }
    ],
    enter_deep: [
      { art: 'wet_steps', who: '', text: '第十四层的台阶是新的。水泥还没干透，踩上去留脚印。', fx: 'none' },
      { art: 'dig_sign', who: '', text: '墙上钉着一块施工牌：「本段掘进 0.3 米」。底下一行日期，是你上一回死的那天。', fx: 'red' },
      { art: 'dig_sign', who: '灰线', text: '听得见吗？图纸上这儿是实心的。你现在站的地方，按理说不存在。', fx: 'static' },
      { art: 'unbuilt', who: '', text: '再往下还有一层。没完工，灯已经亮了。', fx: 'flash' }
    ],
    wake_assault: [
      { art: 'gun_notch', who: '', text: '你先摸的是枪。它在，握把上的刻痕也在。', fx: 'none' },
      { art: 'dock_wind', who: '', text: '你用拇指数了一遍，比记得的多了三道。耳朵边起了一阵风，带着码头的咸味。', fx: 'static' },
      { art: 'dock_wind', who: '灰线', text: '他们管你叫「哑火」。挺好，这口井不喜欢话多的。', fx: 'none' }
    ],
    wake_engineer: [
      { art: 'blueprint', who: '', text: '兜里有一卷图纸。你不用展开就知道是哪口井，每一根梁都是你画的。', fx: 'none' },
      { art: 'plumb', who: '', text: '可它比你记得的厚。最后几页的线条，起笔收笔全是你的习惯，你却想不起画过。', fx: 'static' },
      { art: 'plumb', who: '灰线', text: '「铅垂」是吧。带着你的线下去，量量它到底有多深。', fx: 'none' }
    ],
    wake_ghost: [
      { art: 'mirror_lag', who: '', text: '唤醒舱的玻璃上映着一张脸。你抬手，它慢了半拍才抬。', fx: 'glitch' },
      { art: 'three_names', who: '', text: '你想了想自己叫什么。脑子里出来三个名字，哪个都不像。', fx: 'static' },
      { art: 'three_names', who: '灰线', text: '系统里读不出你，全是杂音。我就叫你「白噪」了，你不反对吧。', fx: 'none' }
    ]
  };
  Object.keys(add).forEach(function (k) { if (!S.scenes[k]) S.scenes[k] = add[k]; });
})();

/* 旧过场补图；终焉之眼倒下时的一段 */
(function () {
  var S = window.NEON && window.NEON.story; if (!S || !S.scenes) return;
  var b5 = S.scenes.boss_5; if (b5 && b5[3] && b5[4]) { b5[3].art = 'nameplate'; b5[4].art = 'nameplate'; }
  if (!S.scenes.seen_bh_eye) S.scenes.seen_bh_eye = [
    { art: 'record_flood', who: '', text: '那只眼睛灭掉之前，把它存的东西全倒进了你的义眼。', fx: 'glitch' },
    { art: 'record_flood', who: '', text: '一千多段。同一条走廊，同一个背影，倒下的姿势各不一样。', fx: 'red' },
    { art: 'record_flood', who: '唤醒台', text: '回收完成。投放下一份。回收完成。投放下一份。', fx: 'static' }
  ];
})();
