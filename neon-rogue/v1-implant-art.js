/* 1.0 义体线稿图标。按部位、名称关键字与主动类型选型，纯展示。 */
(function () {
  'use strict';

  var Q = { gray: '#9aa7b0', green: '#57ffa8', blue: '#22e6ff', purple: '#b06bff', orange: '#ffb347', red: '#ff4d5e' };
  var RANK = { gray: 0, green: 1, blue: 2, purple: 3, orange: 4, red: 5 };

  function hash(s) { var h = 2166136261; s = String(s || ''); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  var ART = {
    /* ---- 眼 ---- */
    eye_iris: '<path d="M5 24Q24 7 43 24Q24 41 5 24Z" class="f"/><circle cx="24" cy="24" r="8.5"/><circle cx="24" cy="24" r="3.2" class="s"/><path d="M24 11v4M24 33v4M11 24h4M33 24h4" class="t"/>',
    eye_lens: '<circle cx="24" cy="24" r="16" class="f"/><circle cx="24" cy="24" r="10.5"/><circle cx="24" cy="24" r="4" class="s"/><path d="M24 13.5l5 6M33.1 18.7l-2.6 7.4M33.1 29.3l-7.6 1.4M24 34.5l-5-6M14.9 29.3l2.6-7.4M14.9 18.7l7.6-1.4" class="t"/>',
    eye_multi: '<path d="M24 5l16 9v20l-16 9-16-9V14z" class="f"/><circle cx="24" cy="16" r="5"/><circle cx="16" cy="29" r="5"/><circle cx="32" cy="29" r="5"/><circle cx="24" cy="16" r="1.6" class="s"/><circle cx="16" cy="29" r="1.6" class="s"/><circle cx="32" cy="29" r="1.6" class="s"/>',
    eye_visor: '<path d="M6 18h36l-3 13H9z" class="f"/><path d="M11 24h26" class="g"/><circle cx="8" cy="15" r="1.5" class="s"/><circle cx="40" cy="15" r="1.5" class="s"/><path d="M16 21v6M24 20v8M32 21v6" class="t"/>',
    eye_scope: '<circle cx="24" cy="24" r="15" class="f"/><path d="M24 5v12M24 31v12M5 24h12M31 24h12"/><circle cx="24" cy="24" r="5"/><circle cx="24" cy="24" r="1.5" class="s"/><path d="M34 14l3-3M14 34l-3 3" class="t"/>',
    /* ---- 手 ---- */
    hand_palm: '<path d="M15 44V30l-4-6v-7l4 1v6M15 30h18v14" class="f"/><path d="M17 30V12h4v18M22 30V8h4v22M27 30V10h4v20M32 31V16h3v13l-2 4"/><path d="M17 20h4M22 18h4M27 19h4" class="t"/><circle cx="24" cy="37" r="2.5" class="s"/>',
    hand_blade: '<path d="M5 41l8-4 5 5-4 6z" class="f"/><path d="M13 37C17 20 29 9 44 4 40 19 31 31 18 42z" class="f"/><path d="M17 37C22 24 31 14 41 8" class="g"/><path d="M8 37l7 7" class="t"/>',
    hand_katana: '<path d="M7 43l5-5" /><path d="M10 36l4 4" class="g"/><path d="M13 37L41 7q2 4-2 8L15 39z" class="f"/><path d="M16 36L39 11" class="t"/><circle cx="8" cy="42" r="1.8" class="s"/>',
    hand_saw: '<circle cx="27" cy="21" r="13" class="f"/><circle cx="27" cy="21" r="4" class="s"/><path d="M27 5l2 4M38 9l-2 4M43 20l-4 1M40 31l-4-2M30 37l-1-4M19 34l2-4M13 25l4-1M15 13l3 3" /><path d="M6 44l10-12 4 4-10 10z" class="f"/>',
    hand_gun: '<path d="M6 30h20v10H6z" class="f"/><path d="M14 18h28v10H14z" class="f"/><path d="M42 20v6M38 18v10M34 18v10" class="t"/><circle cx="20" cy="23" r="2.5" class="s"/><path d="M10 30v10M18 30v10" class="t"/><path d="M26 23h6" class="g"/>',
    hand_missile: '<path d="M6 34h22v8H6z" class="f"/><path d="M12 34V22l4-6 4 6v12M24 34V18l4-6 4 6v16" class="f"/><path d="M36 30V20l3-5 3 5v10" /><path d="M16 12V8M28 8V4M39 11V8" class="g"/>',
    hand_fist: '<path d="M10 20h26l4 5v12l-5 6H14l-4-5z" class="f"/><path d="M10 20v-6h6v6M17 20v-8h6v8M24 20v-8h6v8M31 20v-6h5v6"/><path d="M12 28h26" class="t"/><path d="M19 34l3-4 3 6 3-4" class="g"/>',
    hand_wire: '<path d="M8 44V34l5-6h6l5 6v10" class="f"/><path d="M16 28V18"/><path d="M16 18C16 4 40 6 36 18S20 20 26 30s18 2 16 12" class="g"/><circle cx="16" cy="18" r="2" class="s"/>',
    /* ---- 身体 ---- */
    body_plate: '<path d="M10 9h28l4 9-4 18-14 8-14-8-4-18z" class="f"/><path d="M24 9v35M12 20h24M14 29h20" class="t"/><path d="M17 14h14" class="g"/>',
    body_heart: '<path d="M24 41L10 28a8.5 8.5 0 0 1 14-10 8.5 8.5 0 0 1 14 10z" class="f"/><path d="M24 18V6M30 15l5-7M18 15l-5-7"/><path d="M12 28h6l3-6 4 11 3-5h8" class="g"/>',
    body_core: '<circle cx="24" cy="24" r="16" class="f"/><circle cx="24" cy="24" r="7"/><circle cx="24" cy="24" r="2.8" class="s"/><path d="M24 8v9M24 31v9M8 24h9M31 24h9" /><path d="M12.7 12.7l4 4M31.3 31.3l4 4M35.3 12.7l-4 4M16.7 31.3l-4 4" class="t"/>',
    body_camo: '<path d="M16 6h16l4 8 6 4-3 12-5-2v16H14V28l-5 2-3-12 6-4z" class="d"/><path d="M14 20h20M14 28h20M14 36h20" class="t"/><circle cx="24" cy="14" r="2" class="s"/>',
    body_gen: '<path d="M10 12h28v24H10z" class="f"/><path d="M26 15l-7 10h6l-3 9 8-11h-6z" class="g"/><path d="M6 18h4M6 30h4M38 18h4M38 30h4"/>',
    body_vent: '<path d="M9 10h30v28H9z" class="f"/><path d="M13 16h22M13 21h22M13 26h22M13 31h22" class="t"/><path d="M4 14l5 4M4 34l5-4M44 14l-5 4M44 34l-5-4" class="g"/>',
    /* ---- 脊椎 ---- */
    spine_col: '<path d="M18 5h12l2 6H16zM17 14h14l2 6H15zM17 23h14l2 6H15zM18 32h12l2 6H16z" class="f"/><path d="M24 5v38" class="g"/><path d="M15 17H8M33 17h7M15 26H6M33 26h9M16 35h-6M32 35h6" class="t"/><path d="M21 41h6l-3 4z" class="s"/>',
    spine_core: '<path d="M19 4h10v8H19zM19 36h10v8H19z" class="f"/><circle cx="24" cy="24" r="9" class="f"/><circle cx="24" cy="24" r="3.5" class="s"/><path d="M24 12v3M24 33v3" class="g"/><path d="M15 24H6M33 24h9M17.6 17.6l-5-5M30.4 17.6l5-5M17.6 30.4l-5 5M30.4 30.4l5 5" class="t"/>',
    spine_deck: '<path d="M11 13h26v22H11z" class="f"/><path d="M16 18h16v12H16z"/><path d="M15 13V8M21 13V8M27 13V8M33 13V8M15 35v5M21 35v5M27 35v5M33 35v5" class="t"/><path d="M19 24h4l2-3 2 6 2-3h2" class="g"/>',
    spine_pump: '<path d="M20 4h8v40h-8z" class="f"/><path d="M28 12h8v10h-8M20 26h-8v10h8" /><circle cx="36" cy="17" r="2" class="s"/><circle cx="12" cy="31" r="2" class="s"/><path d="M24 8v32" class="g"/>',
    /* ---- 腿 ---- */
    leg_std: '<path d="M17 4h12l-1 15h-9z" class="f"/><circle cx="23.5" cy="22" r="4"/><path d="M19 25h9l1 14h-9z" class="f"/><path d="M19 39h10l8 5H17z" class="f"/><path d="M23.5 8v8M24 29v7" class="t"/><circle cx="23.5" cy="22" r="1.4" class="s"/>',
    leg_spring: '<path d="M18 4h12v9H18z" class="f"/><path d="M19 13l10 4-10 4 10 4-10 4 10 4" class="g"/><path d="M17 37h14l7 7H15z" class="f"/><path d="M24 4v9" class="t"/>',
    leg_thrust: '<path d="M17 4h12l-1 15h-9z" class="f"/><circle cx="23.5" cy="22" r="4"/><path d="M19 25h9l2 12H18z" class="f"/><path d="M36 22h5v10h-5z" class="f"/><path d="M28 27h8" /><path d="M20 38l-2 7M24 38v8M28 38l2 7M38.5 33v8" class="g"/>',
    leg_blade: '<path d="M18 4h11l-1 14h-9z" class="f"/><circle cx="23.5" cy="21" r="3.6"/><path d="M21 24c-2 8 2 14 12 20-12-1-17-8-16-20z" class="f"/><path d="M22 27c0 7 4 12 9 15" class="g"/>',
    leg_heavy: '<path d="M14 4h18l2 16H12z" class="f"/><path d="M13 22h20v15H13z" class="f"/><path d="M10 37h28v7H10z" class="f"/><path d="M17 26h12M17 31h12" class="t"/><path d="M12 20h22" class="g"/><circle cx="23" cy="12" r="2.6" class="s"/>'
  };

  var RULES = {
    eye: [[/热成像|光谱|广角|扫描/, 'eye_lens'], [/复眼|蜂/, 'eye_multi'], [/目镜|分析|处理器|视觉/, 'eye_visor'], [/鹰|猎|瞄|棱镜|神谕|审判/, 'eye_scope']],
    hand: [[/螳螂|热能|血刃|刃|爪|颚/, 'hand_blade'], [/破晓|居合|刀/, 'hand_katana'], [/链锯|锯/, 'hand_saw'], [/导弹|发射器|炸药|雷/, 'hand_missile'], [/脉冲|弹道|连接器|枪|炮|过载/, 'hand_gun'], [/拳|指虎|猩猩|手臂|护手|铁壁/, 'hand_fist'], [/线|鞭|丝/, 'hand_wire']],
    body: [[/心|血|泵/, 'body_heart'], [/核心|反应|红质/, 'body_core'], [/迷彩|皮膜|隐/, 'body_camo'], [/发电|电/, 'body_gen'], [/散热|监测|冷却/, 'body_vent']],
    spine: [[/核心|斯安威斯坦|量子|巨人/, 'spine_core'], [/甲板|接口|编辑|协调|处理/, 'spine_deck'], [/肾上腺|泵|再生|狂暴|导体/, 'spine_pump']],
    leg: [[/弹簧|肌腱|跳/, 'leg_spring'], [/推进|相位|瞬影|疾风/, 'leg_thrust'], [/影|静音|刃/, 'leg_blade'], [/动能|腿甲|液压|重/, 'leg_heavy']]
  };
  var POOL = {
    eye: ['eye_iris', 'eye_lens', 'eye_visor', 'eye_scope'], hand: ['hand_palm', 'hand_fist', 'hand_gun'],
    body: ['body_plate', 'body_core', 'body_vent'], spine: ['spine_col', 'spine_deck', 'spine_pump'], leg: ['leg_std', 'leg_heavy', 'leg_spring']
  };
  var CORP_MARK = { dome: '穹', charon: '卡', karon: '卡', mobius: '莫' };

  function pickArt(mod) {
    var slot = mod.slot || 'body', name = String(mod.name || ''), rules = RULES[slot] || [];
    for (var i = 0; i < rules.length; i++) if (rules[i][0].test(name)) return rules[i][1];
    var pool = POOL[slot] || POOL.body;
    return pool[hash(mod.id || name) % pool.length];
  }

  function frame(rank, c) {
    var s = '<path d="M9 1.5h30l7.5 7.5v30L39 46.5H9L1.5 39V9z" fill="rgba(5,10,17,.92)" stroke="' + c + '" stroke-opacity="' + (.35 + rank * .1) + '" stroke-width="1"/>';
    if (rank >= 2) s += '<path d="M2 15V9l7-7h6M33 2h6l7 7v6M46 33v6l-7 7h-6M15 46H9l-7-7v-6" fill="none" stroke="' + c + '" stroke-width="1.6"/>';
    if (rank >= 4) s += '<path d="M20 1.5h8M20 46.5h8M1.5 20v8M46.5 20v8" stroke="' + c + '" stroke-width="2.4"/>';
    if (rank >= 5) s += '<path d="M11 5h26l6 6v26l-6 6H11l-6-6V11z" fill="none" stroke="' + c + '" stroke-opacity=".35" stroke-width=".8" stroke-dasharray="2 2"/>';
    return s;
  }

  function svg(mod, size, opts) {
    if (!mod) return '';
    opts = opts || {};
    var c = Q[mod.quality] || mod.color || Q.gray, rank = RANK[mod.quality] || 0, art = ART[pickArt(mod)] || ART.body_plate;
    var corp = mod.corp && CORP_MARK[mod.corp];
    var px = size || 40;
    return '<svg class="imp-art q' + rank + (opts.cls ? ' ' + opts.cls : '') + '" viewBox="0 0 48 48" width="' + px + '" height="' + px + '" aria-hidden="true" style="--ia:' + c + '">' +
      frame(rank, c) + '<g class="ia-g" transform="translate(6 6) scale(.75)">' + art + '</g>' +
      (mod.active ? '<path d="M38 5l5 5-5 5-5-5z" fill="' + c + '"/>' : '') +
      (corp ? '<text x="8" y="43" font-size="8" font-weight="700" fill="' + c + '" font-family="sans-serif">' + corp + '</text>' : '') +
      '</svg>';
  }

  function emptySlot(cat, size) {
    var key = { eye: 'eye_iris', hand: 'hand_palm', body: 'body_plate', spine: 'spine_col', leg: 'leg_std' }[cat] || 'body_plate';
    var px = size || 40;
    return '<svg class="imp-art empty" viewBox="0 0 48 48" width="' + px + '" height="' + px + '" aria-hidden="true" style="--ia:#4b5d6b">' +
      '<path d="M9 1.5h30l7.5 7.5v30L39 46.5H9L1.5 39V9z" fill="rgba(5,10,17,.6)" stroke="#33434f" stroke-dasharray="3 3"/>' +
      '<g class="ia-g" transform="translate(6 6) scale(.75)">' + ART[key] + '</g></svg>';
  }

  var css = '.imp-art{flex:none;display:block;overflow:visible}' +
    '.imp-art .ia-g *{fill:none;stroke:var(--ia);stroke-width:1.9;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}' +
    '.imp-art .ia-g .f{fill:color-mix(in srgb,var(--ia) 13%,transparent)}' +
    '.imp-art .ia-g .s{fill:var(--ia);stroke:none}' +
    '.imp-art .ia-g .t{stroke-width:1;opacity:.6}' +
    '.imp-art .ia-g .g{stroke:#f2fdff;stroke-width:1.5;filter:drop-shadow(0 0 2px var(--ia))}' +
    '.imp-art .ia-g .d{stroke-dasharray:3 2.5;fill:color-mix(in srgb,var(--ia) 8%,transparent)}' +
    '.imp-art.q3,.imp-art.q4{filter:drop-shadow(0 0 3px color-mix(in srgb,var(--ia) 45%,transparent))}' +
    '.imp-art.q5{filter:drop-shadow(0 0 5px color-mix(in srgb,var(--ia) 70%,transparent))}' +
    '.imp-art.empty .ia-g *{opacity:.55}';
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  window.NeonImplantArt = { svg: svg, empty: emptySlot, kind: pickArt, keys: Object.keys(ART) };
})();
