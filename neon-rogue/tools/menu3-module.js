/* =========================================================
   MENU_V3 · 主界面：出发 / 义体 / 神经 / 余烬 · 三步出发
   ========================================================= */
var MN_ICON = {
  depart: '<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0l-5-5m5 5l5-5"/><path d="M4 19h16" opacity=".5"/><path d="M7 22h10" opacity=".3"/></svg>',
  cyber: '<svg viewBox="0 0 24 24"><path d="M12 2l8.5 5v10L12 22l-8.5-5V7z"/><path d="M12 8l3.5 2v4L12 16l-3.5-2v-4z"/></svg>',
  neuro: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.5"/><circle cx="5" cy="6" r="1.6"/><circle cx="19" cy="6" r="1.6"/><circle cx="5" cy="18" r="1.6"/><circle cx="19" cy="18" r="1.6"/><path d="M10 10.5L6.2 7.2M14 10.5l3.8-3.3M10 13.5l-3.8 3.3M14 13.5l3.8 3.3"/></svg>',
  ember: '<svg viewBox="0 0 24 24"><path d="M12 3c1 3.5 5 5 5 10a5 5 0 0 1-10 0c0-2.3 1.2-3.6 2.2-4.6.2 1.6 1 2.6 2.3 3C10.5 9 11 6 12 3z"/><path d="M8 22h8" opacity=".5"/></svg>',
  market: '<svg viewBox="0 0 24 24"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/><path d="M3 9h18"/></svg>',
  stash: '<svg viewBox="0 0 24 24"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>',
  forge: '<svg viewBox="0 0 24 24"><path d="M4 10h11l3-3h2v5h-3l-2 2H8z"/><path d="M8 14v3h7v-3M6 20h11"/></svg>',
  ticket: '<svg viewBox="0 0 24 24"><path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/><path d="M14 7v10" stroke-dasharray="2 2"/></svg>',
  archive: '<svg viewBox="0 0 24 24"><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 11h8M8 15h8M8 19h5"/></svg>',
  codex: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M16 16l5 5M11 8v6M8 11h6"/></svg>',
  ach: '<svg viewBox="0 0 24 24"><path d="M7 3h10v5a5 5 0 0 1-10 0z"/><path d="M7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/></svg>',
  dream: '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="12" r="2.5"/><circle cx="16" cy="12" r="2.5"/><path d="M8 9.5h8"/></svg>',
  bar: '<svg viewBox="0 0 24 24"><path d="M6 3h12l-2 9a4 4 0 0 1-8 0z"/><path d="M12 16v5M8 21h8"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
  core: '<svg viewBox="0 0 24 24"><path d="M12 2l4 4-4 4-4-4zM12 14l4 4-4 4-4-4zM2 12l4-4 4 4-4 4zM14 12l4-4 4 4-4 4z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  go: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>'
};
var MN_EMBLEM = {
  assault: '<svg viewBox="0 0 200 200"><defs><radialGradient id="emA" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="currentColor" stop-opacity=".35"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs><circle cx="100" cy="100" r="92" fill="url(#emA)"/><circle cx="100" cy="100" r="62" class="ln"/><circle cx="100" cy="100" r="40" class="ln dim"/><path class="ln" d="M100 24v34M100 142v34M24 100h34M142 100h34"/><path class="fl" d="M52 112l58-10 6-8 30 2 4 6-30 4-4 10-14 4-6 12-12 2 2-14z"/><path class="ln dim" d="M62 140l4-10M70 142l4-10M78 144l4-10M86 146l4-10M94 148l4-10"/><circle cx="100" cy="100" r="4" class="fl"/></svg>',
  engineer: '<svg viewBox="0 0 200 200"><defs><radialGradient id="emE" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="currentColor" stop-opacity=".35"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs><circle cx="100" cy="100" r="92" fill="url(#emE)"/><path class="ln dim" d="M30 50h140M30 80h140M30 110h140M30 140h140M50 30v140M80 30v140M120 30v140M150 30v140"/><path class="ln" d="M100 18v84"/><path class="fl" d="M100 102l16 18-16 40-16-40z"/><circle cx="100" cy="102" r="5" class="fl"/><g class="ln"><circle cx="146" cy="56" r="16"/><path d="M146 34v6M146 72v6M124 56h6M162 56h6M131 41l4 4M157 67l4 4M131 71l4-4M157 45l4-4"/></g><path class="ln dim" d="M60 168h80"/></svg>',
  ghost: '<svg viewBox="0 0 200 200"><defs><radialGradient id="emG" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="currentColor" stop-opacity=".35"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs><circle cx="100" cy="100" r="92" fill="url(#emG)"/><path class="fl" d="M100 70c-6 0-8 10-8 30s2 40 8 40 8-20 8-40-2-30-8-30z"/><path class="ln" d="M96 72c-4-10-10-16-18-20M104 72c4-10 10-16 18-20"/><path class="fl op" d="M92 88C70 60 34 54 26 70c-8 16 20 40 66 34zM108 88c22-28 58-34 66-18 8 16-20 40-66 34z"/><path class="fl op2" d="M92 112c-28 2-50 18-44 32 6 12 30 6 44-20zM108 112c28 2 50 18 44 32-6 12-30 6-44-20z"/><path class="ln dim" d="M20 160h30M60 166h18M120 164h40M30 34h22M140 30h30"/></svg>'
};
var MN_MODE_ART = {
  normal: '<svg viewBox="0 0 120 60"><path class="ln" d="M10 8h100M20 20h80M30 32h60M40 44h40M50 56h20"/><path class="fl" d="M58 0h4v58h-4z" opacity=".5"/></svg>',
  rush: '<svg viewBox="0 0 120 60"><g class="ln"><circle cx="16" cy="30" r="9"/><circle cx="38" cy="30" r="9"/><circle cx="60" cy="30" r="11"/><circle cx="82" cy="30" r="9"/><circle cx="104" cy="30" r="9"/></g><path class="fl" d="M54 26h4v4h-4zM62 26h4v4h-4zM56 34h8v3h-8z"/></svg>',
  train: '<svg viewBox="0 0 120 60"><g class="ln"><circle cx="60" cy="30" r="24"/><circle cx="60" cy="30" r="14"/><path d="M60 0v14M60 46v14M28 30h14M78 30h14"/></g><circle cx="60" cy="30" r="4" class="fl"/></svg>',
  dream: '<svg viewBox="0 0 120 60"><rect class="ln" x="14" y="10" width="92" height="40" rx="5"/><g class="ln"><circle cx="40" cy="30" r="10"/><circle cx="80" cy="30" r="10"/></g><path class="ln" d="M40 20h40"/><path class="ln dim" d="M20 54h80"/></svg>'
};
function mnStoryTitle(cls) { var c = (STORY.classes || {})[cls]; return c ? c.title : ''; }
function mnBest() { return Math.max(cum.bestDepth || 1, ST.maxDepth || 1); }
function mnSeen() { META.seen = META.seen || {}; return META.seen; }
function mnCounts() { return { arc: Object.keys(ST.chapters || {}).length, ach: ACHIEVEMENTS.filter(function (a) { return unlocked[a.id]; }).length, dream: Object.keys(ST.dreams || {}).length }; }
function mnDot(k) { var s = mnSeen(), c = mnCounts(); if (k === 'neuro') return META_UP.some(function (u) { return metaLvl(u.id) < u.max && META.cores >= metaCost(u.id) && (u.tier === 1 || META_UP.some(function (q) { return q.branch === u.branch && q.tier === u.tier - 1 && metaLvl(q.id) > 0; })); }); return c[k] > (s[k] || 0); }
function mnMark(k) { var s = mnSeen(), c = mnCounts(); s[k] = c[k]; saveMeta(); }
function mnNum(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
/* ---------- 背景：下城天际线 + 雨 ---------- */
function mnBgStart(cv, accent) {
  if (!cv) return;
  var c2 = cv.getContext('2d'), dpr2 = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0, seed = 7;
  function rnd2() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  var layers = [], drops = [];
  function build() {
    var r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = W * dpr2; cv.height = H * dpr2; c2.setTransform(dpr2, 0, 0, dpr2, 0, 0); seed = 7; layers = [];
    [[.55, '#081521', .35], [.68, '#0b1b2a', .55], [.8, '#0e2132', .85]].forEach(function (L, li) {
      var x = 0, bl = []; while (x < W) { var w = 14 + rnd2() * 36, h = H * (1 - L[0]) * (.4 + rnd2() * .9); var win = []; for (var wy = 6; wy < h - 4; wy += 7) for (var wx = 3; wx < w - 3; wx += 6) if (rnd2() < .18) win.push([wx, wy, rnd2()]); bl.push({ x: x, w: w, h: h, win: win, sign: rnd2() < .12 && li === 2 }); x += w + 2 + rnd2() * 6; }
      layers.push({ base: H * L[0] + H * .2, col: L[1], blocks: bl, a: L[2] });
    });
    drops = []; for (var i = 0; i < 70; i++) drops.push({ x: rnd2() * W, y: rnd2() * H, v: 4 + rnd2() * 6, l: 6 + rnd2() * 10 });
  }
  build();
  var t0 = performance.now();
  (function frame(now) {
    if (!cv.isConnected) return;
    var t = (now - t0) / 1000, rec = cv.getBoundingClientRect(); if (Math.abs(rec.width - W) > 2 || Math.abs(rec.height - H) > 2) build();
    var g = c2.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04070d'); g.addColorStop(.6, '#071322'); g.addColorStop(1, '#03060a');
    c2.fillStyle = g; c2.fillRect(0, 0, W, H);
    var glow = c2.createRadialGradient(W * .5, H * .62, 4, W * .5, H * .62, W * .7); glow.addColorStop(0, hexA(accent, .18)); glow.addColorStop(1, hexA(accent, 0)); c2.fillStyle = glow; c2.fillRect(0, 0, W, H);
    layers.forEach(function (L, li) {
      L.blocks.forEach(function (b) {
        var top = L.base - b.h; c2.fillStyle = L.col; c2.fillRect(b.x, top, b.w, H - top);
        b.win.forEach(function (w) { var on = VFX.reduced ? w[2] > .4 : (Math.sin(t * .7 + w[2] * 40) > -.6); if (!on) return; c2.fillStyle = w[2] > .85 ? hexA(accent, .7 * L.a) : 'rgba(255,214,140,' + (.35 * L.a) + ')'; c2.fillRect(b.x + w[0], top + w[1], 2, 3); });
        if (b.sign) { var fl = VFX.reduced ? 1 : (Math.sin(t * 9 + b.x) > -.85 ? 1 : .2); c2.fillStyle = hexA(accent, .55 * fl); c2.fillRect(b.x + 2, top + 8, 2, Math.min(36, b.h * .5)); c2.shadowColor = accent; c2.shadowBlur = 8 * fl; c2.fillRect(b.x + 2, top + 8, 2, Math.min(36, b.h * .5)); c2.shadowBlur = 0; }
      });
    });
    c2.strokeStyle = 'rgba(160,210,255,.18)'; c2.lineWidth = 1; c2.beginPath();
    drops.forEach(function (d) { if (!VFX.reduced) { d.y += d.v; d.x -= d.v * .18; if (d.y > H) { d.y = -10; d.x = Math.random() * (W + 40); } } c2.moveTo(d.x, d.y); c2.lineTo(d.x + d.l * .18, d.y - d.l); });
    c2.stroke();
    var sy = VFX.reduced ? -1 : ((t * 40) % (H + 60)) - 30; if (sy > 0) { c2.fillStyle = hexA(accent, .05); c2.fillRect(0, sy, W, 18); }
    if (!VFX.reduced) requestAnimationFrame(frame);
  })(t0);
}
/* ---------- 主界面 ---------- */
function mnTop() {
  return '<div class="m3-top"><div class="m3-logo"><b>NEON DEPTH</b><small>霓虹深潜 · 3.5</small></div>' +
    '<div class="m3-topr"><button class="m3-cores" id="mnCores">' + MN_ICON.core + '<b>' + mnNum(META.cores || 0) + '</b></button><button class="m3-ibtn" id="mnSet" aria-label="设置">' + MN_ICON.gear + '</button></div></div>';
}
function mnNav() {
  var tabs = [['depart', '出发'], ['cyber', '义体'], ['neuro', '神经'], ['ember', '余烬']];
  return '<nav class="m3-nav">' + tabs.map(function (t) { var dot = t[0] === 'neuro' ? mnDot('neuro') : t[0] === 'ember' ? (mnDot('arc') || mnDot('ach') || mnDot('dream') || (META.cleared && !META.myDream)) : false;
    return '<button class="' + (G.navTab === t[0] ? 'on' : '') + '" data-mntab="' + t[0] + '">' + MN_ICON[t[0]] + '<span>' + t[1] + '</span>' + (dot ? '<i class="m3-dot"></i>' : '') + '</button>'; }).join('') + '<u class="m3-ink" style="--i:' + ['depart', 'cyber', 'neuro', 'ember'].indexOf(G.navTab) + '"></u></nav>';
}
function mnDepart() {
  var cls = classDef(), sv = savedRun(), title = mnStoryTitle(cls.id), C2 = (STORY.classes || {})[cls.id];
  var h = '<section class="m3-hero" style="--mc:' + cls.color + '"><div class="m3-emblem">' + (MN_EMBLEM[cls.id] || '') + '</div>' +
    '<div class="m3-persona"><small>当前人格</small><b>' + econEsc(title || cls.name) + '</b><span>' + cls.name + ' · ' + cls.tag + '</span></div>' +
    '<button class="m3-swap" data-mnact="persona">换人格 ' + MN_ICON.go + '</button></section>';
  if (sv) h += '<button class="m3-cta" id="menuContinue"><span>继续深潜</span><small>' + econEsc(saveSummary(sv)) + '</small><i>' + MN_ICON.go + '</i></button><button class="m3-sub" id="menuNew">开始新的深潜</button>';
  else h += '<button class="m3-cta" id="actionBtn"><span>开始深潜</span><small>模式 · 人格 · 战备</small><i>' + MN_ICON.go + '</i></button>';
  h += '<div class="m3-stats"><div><small>最深</small><b>B' + mnBest() + 'F</b></div><div><small>撤离</small><b>' + (cum.wins || 0) + '</b></div><div><small>通关</small><b>' + (META.cleared || 0) + '</b></div><div><small>挑战</small><b>' + (G.chalSel || []).length + '</b></div></div>';
  var line = typeof hanLine === 'function' ? hanLine() : '';
  if (b16Open() && !META.cleared) line = '主线拼齐了。B15 那个守卫脚下有风，你下去看看。';
  if (line) h += '<div class="m3-quote"><i>' + MN_ICON.bar + '</i><p><b>老韩</b>' + econEsc(line) + '</p></div>';
  return h;
}
function mnTile(icon, title, sub, act, color, badge, dot) {
  return '<button class="m3-tile" data-mnact="' + act + '" style="--tc:' + color + '"><i>' + MN_ICON[icon] + '</i><b>' + title + '</b><small>' + sub + '</small>' + (badge != null ? '<em>' + badge + '</em>' : '') + (dot ? '<u class="m3-dot"></u>' : '') + '</button>';
}
function mnCyber() {
  var chips = META.stash.chips.length, cy = META.stash.cyber.length, tk = (META.tickets || []).length;
  return '<header class="m3-sec"><small>CHROME</small><b>义体</b></header>' +
    '<div class="m3-tiles">' + mnTile('market', '黑市', '义体 · 芯片 · 核心交易', 'market:cyber', '#fcee0a') + mnTile('stash', '仓库', '筛选 · 锁定 · 一键出售', 'market:stash', '#22e6ff', cy) +
    mnTile('forge', '强化', '义体强化 · 芯片重铸', 'market:forge', '#c08bff') + mnTile('ticket', '制式券', 'Boss Rush 整套量产装', 'market:ticket', '#57ffa8', tk || null) + '</div>' +
    '<div class="m3-row"><span>仓库义体</span><b>' + cy + '</b></div><div class="m3-row"><span>仓库芯片</span><b>' + chips + '</b></div><div class="m3-row"><span>义体图鉴收录</span><b>' + Object.keys(G.codex.mods || {}).length + '</b></div>';
}
function mnNeuro() {
  var h = '<header class="m3-sec"><small>NEURAL</small><b>神经</b></header><div class="m3-bigcore">' + MN_ICON.core + '<b>' + mnNum(META.cores || 0) + '</b><small>数据核心 · 已投入 ' + mnNum(metaSpent()) + '</small></div>';
  Object.keys(META_BRANCH).forEach(function (b) {
    var ups = META_UP.filter(function (u) { return u.branch === b; }), have = 0, max = 0;
    ups.forEach(function (u) { have += Math.min(u.max, metaLvl(u.id)); max += u.max; });
    h += '<div class="m3-branch"><div><b>' + META_BRANCH[b] + '</b><span>' + have + ' / ' + max + '</span></div><i><u style="width:' + Math.round(have / Math.max(1, max) * 100) + '%"></u></i></div>';
  });
  h += '<button class="m3-cta alt" data-mnact="meta"><span>进入神经养成</span><small>按住节点，把核心灌进去' + (mnDot('neuro') ? ' · 有可升级的节点' : '') + '</small><i>' + MN_ICON.go + '</i></button>';
  return h;
}
function mnEmber() {
  var c = mnCounts();
  var h = '<header class="m3-sec"><small>EMBER</small><b>余烬</b></header>' +
    '<button class="m3-bar" data-mnact="bar"><i>' + MN_ICON.bar + '</i><div><b>余烬酒吧</b><small>酒单 · 传说墙 · 老韩的话' + (ST.pendingDrink ? ' · 已点一杯' : '') + '</small></div>' + (META.cleared && !META.myDream ? '<u class="m3-dot"></u>' : '') + MN_ICON.go + '</button>';
  var rows = [['archive', '剧情档案', c.arc + ' / ' + (STORY.chapters || []).length, 'archive', '#c08bff', mnDot('arc')], ['codex', '图鉴', '敌人 · 守卫 · 公司要员 · 道具', 'codex', '#22e6ff', false],
    ['ach', '成就', c.ach + ' / ' + ACHIEVEMENTS.length, 'ach', '#fcee0a', mnDot('ach')], ['dream', '超梦录像带', c.dream + ' / ' + DREAMS.length, 'dream', '#ff2fa8', mnDot('dream')]];
  h += '<div class="m3-list">' + rows.map(function (r) { return '<button data-mnact="' + r[3] + '" style="--tc:' + r[4] + '"><i>' + MN_ICON[r[0]] + '</i><b>' + r[1] + '</b><small>' + r[2] + '</small>' + (r[5] ? '<u class="m3-dot"></u>' : '') + MN_ICON.go + '</button>'; }).join('') + '</div>';
  return h;
}
function menuScreen(tab) {
  if (typeof tab === 'string') G.navTab = tab;
  if (['depart', 'cyber', 'neuro', 'ember'].indexOf(G.navTab) < 0) G.navTab = 'depart';
  var cls = classDef(), body = G.navTab === 'cyber' ? mnCyber() : G.navTab === 'neuro' ? mnNeuro() : G.navTab === 'ember' ? mnEmber() : mnDepart();
  overlay.innerHTML = '<div class="card menu3" style="--mc:' + cls.color + '"><canvas class="m3-bg"></canvas><div class="m3-shade"></div>' + mnTop() + '<div class="m3-body m3-' + G.navTab + '">' + body + '</div>' + mnNav() + '</div>';
  overlay.classList.add('show'); G.modal = 'start'; G.paused = true; G.state = 'menu';
  mnBgStart(overlay.querySelector('.m3-bg'), cls.color);
  $$('[data-mntab]').forEach(function (b) { b.onclick = function () { if (G.navTab !== b.getAttribute('data-mntab')) sfx.step(); G.navTab = b.getAttribute('data-mntab'); menuScreen(); }; });
  $('#mnCores').onclick = function () { G.navTab = 'neuro'; menuScreen(); };
  $('#mnSet').onclick = openSettings;
  $$('[data-mnact]').forEach(function (b) {
    b.onclick = function () {
      var a = b.getAttribute('data-mnact'); sfx.step();
      if (a.indexOf('market:') === 0) { G.navTab = 'cyber'; marketScreen(a.slice(7)); }
      else if (a === 'meta') { G.navTab = 'neuro'; showMeta(); }
      else if (a === 'bar') { G.navTab = 'ember'; G._hanLine = null; barScreen('drinks'); }
      else if (a === 'archive') { G.navTab = 'ember'; mnMark('arc'); archiveScreen('main'); }
      else if (a === 'codex') { G.navTab = 'ember'; mnOpenDoc('图鉴', codexHTML()); }
      else if (a === 'ach') { G.navTab = 'ember'; mnMark('ach'); mnOpenDoc('成就', achHTML()); }
      else if (a === 'dream') { G.navTab = 'ember'; mnMark('dream'); dreamShelf(); }
      else if (a === 'persona') { G._personaOnly = true; startFlow(2); }
    };
  });
  if (G.navTab === 'depart') {
    var cb = $('#menuContinue'); if (cb) cb.onclick = function () { if (!loadRun()) { toast('存档损坏，无法读取', 'bad'); clearRun(); menuScreen(); } };
    var ab = $('#actionBtn'); if (ab) ab.onclick = function () { sfx.step(); startFlow(1); };
    var nb = $('#menuNew'); if (nb) nb.onclick = function () { if (!confirm2(nb, '会覆盖当前存档')) return; clearRun(); startFlow(1); };
    setTimeout(maybeHanDream, 300);
  }
  if (cyberBtn) cyberBtn.onclick = function () { openHub(G.hubTab || 'cyber'); };
  var chromeChip = $('#chromeload'); if (chromeChip) chromeChip.onclick = function () { if (G.state === 'play' && !G.modal) openCyber(); };
  var bagChip = $('#bagchip'); if (bagChip) bagChip.onclick = function () { if (G.state === 'play' && !G.modal) openHub('bag'); };
  if (shieldOrb) shieldOrb.onclick = showShieldInfo;
}
function mnOpenDoc(title, body) {
  overlay.innerHTML = '<div class="card m3-doc"><div class="m3-dochead"><button class="m3-ibtn" id="docBack">' + MN_ICON.back + '</button><b>' + title + '</b><span></span></div><div class="plist">' + body + '</div></div>';
  overlay.classList.add('show'); G.modal = 'start';
  $('#docBack').onclick = function () { menuScreen(); };
}
/* ---------- 出发流程 ---------- */
function menuStepper(step, title, right) {
  var names = ['模式', '人格', '战备'];
  return '<div class="m3-flowhead"><button class="m3-ibtn" id="' + (step === 3 ? 'prepBack' : 'flowBack') + '">' + MN_ICON.back + '</button><div class="m3-steps">' + names.map(function (n, i) { return '<span class="' + (i + 1 < step ? 'done' : i + 1 === step ? 'on' : '') + '"><i>' + (i + 1) + '</i>' + n + '</span>'; }).join('<u></u>') + '</div>' + (right || '<button class="m3-ibtn" id="flowClose">' + MN_ICON.close + '</button>') + '</div>' + (title ? '<h2 class="m3-flowtitle">' + title + '</h2>' : '');
}
function startFlow(step) {
  step = step || 1;
  if (step === 3) { prepScreen({ flow: true }); return; }
  var body, cls = classDef();
  if (step === 1) {
    var modes = [
      ['normal', '深潜', '15 层随机地牢 · 主线剧情 · 委托与公司', ['剧情', '存档', '核心'], '#22e6ff'],
      ['rush', 'Boss Rush', '五连守卫 · 挑战倍率 · 入场费 ' + RUSH_FEE + ' 核心', ['五连战', '制式券'], '#ff4d5e'],
      ['train', '训练场', '任意配装 · 任意敌人 · 不计存档', ['自由', '练手'], '#57ffa8'],
      ['dream', '超梦', '别人的一辈子 · 已收录 ' + Object.keys(ST.dreams || {}).length + ' 盘', ['录像带'], '#ff2fa8']];
    body = menuStepper(1, '选择模式') + '<div class="m3-modes">' + modes.map(function (m) {
      return '<button class="m3-mode" data-mode="' + m[0] + '" style="--tc:' + m[4] + '"><div class="art">' + MN_MODE_ART[m[0]] + '</div><div class="tx"><b>' + m[1] + '</b><small>' + m[2] + '</small><span>' + m[3].map(function (t) { return '<em>' + t + '</em>'; }).join('') + '</span></div><i>' + MN_ICON.go + '</i></button>'; }).join('') + '</div>';
  } else {
    body = menuStepper(G._personaOnly ? 0 : 2, G._personaOnly ? '换人格' : '选择人格') + '<div class="m3-personas">' + CLASSES.map(function (c) {
      var S2 = (STORY.classes || {})[c.id] || {}, on = c.id === G.classId, bio = (S2.bio || [''])[0];
      return '<button class="m3-pcard' + (on ? ' on' : '') + '" data-flow-cls="' + c.id + '" style="--tc:' + c.color + '"><div class="em">' + (MN_EMBLEM[c.id] || '') + '</div><div class="tx"><small>' + c.name + ' · ' + c.tag + '</small><b>' + econEsc(S2.title || c.name) + '</b><p>' + econEsc(c.desc) + '</p><em>' + econEsc(bio.slice(0, 54)) + '…</em></div>' + (on ? '<u>当前</u>' : '') + '</button>'; }).join('') + '</div>';
  }
  overlay.innerHTML = '<div class="card menu3 flow" style="--mc:' + cls.color + '"><canvas class="m3-bg"></canvas><div class="m3-shade"></div><div class="m3-body">' + body + '</div></div>';
  overlay.classList.add('show'); G.modal = 'start'; G.paused = true; G.state = 'menu';
  mnBgStart(overlay.querySelector('.m3-bg'), cls.color);
  var back = function () { if (step === 1 || G._personaOnly) { G._personaOnly = false; G.navTab = 'depart'; menuScreen(); } else startFlow(1); };
  $('#flowBack').onclick = back; var fc = $('#flowClose'); if (fc) fc.onclick = function () { G._personaOnly = false; G.navTab = 'depart'; menuScreen(); };
  $$('[data-mode]').forEach(function (b) {
    b.onclick = function () {
      var m = b.getAttribute('data-mode'); sfx.step();
      if (m === 'normal') { G._flowMode = 'normal'; startFlow(2); }
      else if (m === 'rush') { G._flowMode = null; rushPrepScreen(); }
      else if (m === 'train') { G._flowMode = 'train'; startFlow(2); }
      else if (m === 'dream') { G._flowMode = null; G.navTab = 'ember'; dreamShelf(); }
    };
  });
  $$('[data-flow-cls]').forEach(function (b) {
    b.onclick = function () {
      G.classId = b.getAttribute('data-flow-cls'); sfx.step();
      if (G._personaOnly) { G._personaOnly = false; G.navTab = 'depart'; menuScreen(); return; }
      if (G._flowMode === 'train') { G.trainPending = true; startGame(); }
      else startFlow(3);
    };
  });
}
function openSettings() {
  showModal('settings');
  var row = function (id, t, d, on) { return '<button class="m3-toggle' + (on ? ' on' : '') + '" id="' + id + '"><div><b>' + t + '</b><small>' + d + '</small></div><i><u></u></i></button>'; };
  overlay.innerHTML = '<div class="card m3-doc"><div class="m3-dochead"><button class="m3-ibtn" id="setClose">' + MN_ICON.back + '</button><b>设置</b><span></span></div>' +
    row('setMute', '音效', '按键、命中与环境音', !muted) + row('setVfx', '完整动效', '关闭后减少粒子与镜头抖动，更省电', !VFX.reduced) +
    '<div class="m3-about"><b>NEON DEPTH · 霓虹深潜 3.5</b><small>存档保存在本机。清除浏览器数据会丢失进度。</small></div></div>';
  $('#setMute').onclick = function () { muted = !muted; try { localStorage.setItem('neon-depth-mute', muted ? '1' : '0'); } catch (e) {} openSettings(); };
  $('#setVfx').onclick = function () { VFX.reduced = !VFX.reduced; VFX.resizeDirty = true; openSettings(); };
  $('#setClose').onclick = function () { menuScreen(); };
}
