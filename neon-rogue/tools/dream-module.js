/* =========================================================
   DREAM_V1 · 剧情演出 / 挑战剧情锁 / 超梦录像带
   ========================================================= */
ST.scenes = ST.scenes || {}; ST.dreams = ST.dreams || {}; ST.dreamDone = ST.dreamDone || {}; ST.dreamPlays = ST.dreamPlays || 0; ST.maxChalWin = ST.maxChalWin || 0;
var DREAMS = STORY.dreams || [];
var DREAM_BY = {}; DREAMS.forEach(function (d) { DREAM_BY[d.id] = d; });
var DREAM_KITS = {
  rocker: { cls: 'assault', from: 13, to: 15, lv: 14, mods: ['hand_red', 'body_red', 'eye_red'], run: { atk: 4, maxHp: 30 }, act: { name: '安可', cd: 3, color: '#ff5c7a', desc: '视野内全部敌人受到 3.5×攻击 伤害，无限次' }, rule: '摇滚枪手：主动「安可」无限使用' },
  runner: { cls: 'assault', from: 8, to: 10, lv: 11, mods: ['sandevistan', 'legL_red', 'hunt_leg_r'], run: { atk: 3, dodge: .1 }, act: { name: '再快一点', cd: 2, color: '#9fe9ff', desc: '时间停止 3 回合；每次使用失控值 +30，满 100 即发作' }, rule: '超速者：时停无限，但每次都离失控更近' },
  puppet: { cls: 'ghost', from: 3, to: 5, lv: 9, mods: ['cyberdeck', 'eye_red'], run: { maxHp: 20 }, act: { name: '牵丝', cd: 2, color: '#57ffa8', desc: '控制 6 格内任意普通敌人 12 回合；守卫被缴械 2 回合' }, rule: '傀儡黑客：骇入不受临界限制' },
  replicant: { cls: 'assault', from: 8, to: 10, lv: 12, mods: ['eye_red', 'assault_hand_r'], run: { atk: 12, crit: .15 }, act: { name: '多一天', cd: 6, color: '#ffd166', desc: '回复 35% 生命' }, rule: '仿生人：伤害极高，生命每回合流失 3%' },
  hound: { cls: 'assault', from: 3, to: 5, lv: 9, mods: [], run: { atk: 6, maxHp: 40, lifesteal: .25, def: 2 }, act: { name: '撕咬', cd: 2, color: '#ff7a45', desc: '扑向 4 格内的敌人，造成 3×攻击 伤害并回复一半' }, rule: '裂齿猎犬：没有枪，只有牙', skin: 'bl_hound', noClassBar: true }
};
// 超梦奖励义体
DREAMS.forEach(function (d) {
  var r = d.reward; if (!r || MOD_BY[r.id]) return;
  var L = { atk: '攻击', maxHp: '生命', def: '防御', crit: '暴击', dodge: '闪避', lifesteal: '吸血' };
  var parts = Object.keys(r.stats || {}).map(function (k) { var v = r.stats[k]; return (L[k] || k) + ' +' + (v < 1 ? Math.round(v * 100) + '%' : v); });
  var m = { id: r.id, slot: r.slot, quality: r.quality || 'red', name: r.name, color: '#c08bff', stats: r.stats || {}, dropOnly: true, relic: true, dream: d.id, lore: r.lore,
    desc: parts.join('，') + '；一次性：' + r.onceName, active: { name: r.onceName, type: 'relic_' + r.once, cd: 1 } };
  MODS.push(m); MOD_BY[m.id] = m;
});

/* ---------- 演出 ---------- */
function playScene(key, done, lines, opts) {
  opts = opts || {};
  lines = lines || (STORY.scenes || {})[key];
  if (!lines || !lines.length) { if (done) done(); return false; }
  if (key && !opts.replay) { ST.scenes[key] = Date.now(); storySave(); }
  showModal('scene');
  var i = -1, typing = null;
  overlay.innerHTML = '<div class="scene"><div class="sc-bar top"></div><div class="sc-stage"><div class="sc-kicker">' + econEsc(opts.kicker || 'MEMORY // 记录回放') + '</div><div class="sc-who"></div><div class="sc-line"></div></div><div class="sc-bar bot"><span class="sc-hint">点击继续</span><button class="sc-skip">跳过</button></div></div>';
  var root = overlay.querySelector('.scene'), who = root.querySelector('.sc-who'), line = root.querySelector('.sc-line');
  function finish() { if (typing) clearInterval(typing); hideOverlay(); if (done) done(); }
  function next() {
    if (typing) { clearInterval(typing); typing = null; line.textContent = lines[i].text; return; }
    i++; if (i >= lines.length) { finish(); return; }
    var L = lines[i]; who.textContent = L.who || ''; who.style.display = L.who ? '' : 'none';
    root.setAttribute('data-fx', L.fx || 'none'); root.classList.remove('beat'); void root.offsetWidth; root.classList.add('beat');
    if (L.fx === 'flash' || L.fx === 'red') { G.flash = Math.max(G.flash || 0, .6); }
    if (L.fx === 'glitch' || L.fx === 'static') NV.glitch = Math.max(NV.glitch || 0, .6);
    var full = L.text || '', n = 0; line.textContent = '';
    if (VFX.reduced) { line.textContent = full; return; }
    typing = setInterval(function () { n += 1; line.textContent = full.slice(0, n); if (n % 2 === 0) beep(900 + rnd(400), .015, 'square', .006); if (n >= full.length) { clearInterval(typing); typing = null; } }, 34);
  }
  root.addEventListener('click', function (ev) { if (ev.target.classList.contains('sc-skip')) { finish(); return; } next(); });
  next();
  return true;
}
function queueScene(key) { if (G.mode !== 'normal' || ST.scenes[key] || !(STORY.scenes || {})[key]) return; storyCard({ scene: key }); }

/* ---------- 挑战剧情锁 ---------- */
function chapterLockText(c) { return c.lock ? '以挑战树 ≥' + c.lock.chal + ' 项完成深潜' : ''; }

/* ---------- 录像带获取 ---------- */
function dreamCheck() {
  DREAMS.forEach(function (d) {
    if (ST.dreams[d.id] || !chapterMet(d.unlock)) return;
    ST.dreams[d.id] = Date.now(); storySave();
    if (G.state === 'play' && G.mode === 'normal') storyCard({ kicker: 'BRAINDANCE // 获得超梦录像带', title: '「' + d.name + '」', text: d.desc + '\n\n记忆主人：' + d.who + ' · ' + d.era + '\n回到主界面，点「超梦」播放。', color: '#c08bff' });
  });
}

/* ---------- 超梦架 ---------- */
function dreamShelf() {
  var html = '<div class="card dream-shelf"><div class="kicker">BRAINDANCE // 超梦</div><h1 class="title small">录像带</h1><div class="loot-sub">别人的一辈子，压在一盘带子里。播放时你就是他。</div><div class="dlist">';
  DREAMS.forEach(function (d) {
    var own = ST.dreams[d.id], done = ST.dreamDone[d.id], k = DREAM_KITS[d.kit] || {};
    html += own ? '<button class="dtape" data-dream="' + d.id + '"><i class="reel"></i><b>' + econEsc(d.name) + '</b><small>' + econEsc(d.who) + ' · ' + econEsc(d.era) + '</small><em>' + econEsc(d.desc) + '</em><span>' + (done ? '已走完 · 奖励已入库' : 'B' + k.from + '–B' + k.to + 'F') + '</span></button>'
      : '<div class="dtape locked"><i class="reel"></i><b>████████</b><small>' + dreamUnlockHint(d.unlock) + '</small></div>';
  });
  html += '</div><button class="cta" id="backMenu">返回</button></div>';
  overlay.innerHTML = html; overlay.classList.add('show'); G.modal = 'start';
  $$('[data-dream]').forEach(function (b) { b.onclick = function () { dreamStartScreen(DREAM_BY[b.getAttribute('data-dream')]); }; });
  $('#backMenu').onclick = menuScreen;
}
function dreamUnlockHint(u) {
  var m = String(u).split(':');
  if (m[0] === 'boss') { var b = ((window.NEON && window.NEON.bosses) || []).find(function (x) { return x.id === m[1]; }); return '击败' + (b ? b.name : '某个守卫'); }
  if (m[0] === 'depth') return '抵达 B' + m[1] + 'F';
  if (m[0] === 'npcs') return '听完 ' + m[1] + ' 个人的故事';
  if (m[0] === 'win') return '完成一次深潜';
  if (m[0] === 'psycho') return '经历一次失控';
  return '？';
}
// 似是而非的开始界面：布局一样，内容是别人的，什么都改不了
function dreamStartScreen(d, view) {
  var k = DREAM_KITS[d.kit], cls = CLASS_BY[k.cls];
  var kitList = k.mods.map(function (id) { var m = MOD_BY[id]; return m ? '<li style="color:' + (QUALITY[m.quality] || QUALITY.gray).color + '">' + m.name + '</li>' : ''; }).join('') || '<li>（没有义体）</li>';
  var html = '<div class="card dream-start"><div class="kicker">BRAINDANCE · ' + econEsc(d.era) + ' · 只读</div>' +
    '<h1 class="title glitch-title" data-t="NE0N DEPTH">NE0N DEPTH</h1><div class="sub">霓虹深潛</div>' +
    '<div class="cx-h" style="text-align:center;letter-spacing:.24em;margin:12px 0 6px">选择角色</div>' +
    '<div class="scard dream-who"><b>' + econEsc(d.who) + '</b><span class="tag">' + econEsc(cls.name) + '?</span><em>' + econEsc(k.rule) + '</em></div>' +
    '<div class="scard dream-ghost"><b>' + cls.name + '</b><em>这个位置不属于你</em></div>' +
    '<div class="hint">数据核心 <b>——</b> · 最高分 ——</div>' +
    '<button class="ghost ro" id="dView">挑战树 · 查看（只读）</button>' +
    (view ? '<div class="dream-cfg"><b>配置（只读）</b><ul>' + kitList + '</ul><p>等级 ' + k.lv + ' · ' + Object.keys(k.run).map(function (x) { return boonLine(x, k.run[x]); }).join(' · ') + '</p><p>主动「' + k.act.name + '」：' + k.act.desc + '</p><p>深度 B' + k.from + 'F → B' + k.to + 'F · 挑战树：锁定 · 养成：不生效</p></div>' : '') +
    '<button class="cta" id="dGo">接入记忆</button>' +
    '<div style="display:flex;gap:6px;margin-top:8px"><button class="ghost ro" style="flex:1;margin-top:0" disabled>养成</button><button class="ghost ro" style="flex:1;margin-top:0" disabled>图鉴</button><button class="ghost ro" style="flex:1;margin-top:0" disabled>成就</button></div>' +
    '<button class="ghost" id="dBack">断开</button></div>';
  overlay.innerHTML = html; overlay.classList.add('show'); G.modal = 'start';
  $('#dView').onclick = function () { dreamStartScreen(d, !view); };
  $('#dBack').onclick = dreamShelf;
  $('#dGo').onclick = function () { dreamBegin(d); };
}
function dreamBegin(d) {
  var k = DREAM_KITS[d.kit]; if (!k) return;
  ST.dreamPlays = (ST.dreamPlays || 0) + 1; storySave();
  G.dreamPending = d; G.classId = k.cls; G.prepPick = null; G.trainPending = false; G.rushPending = null;
  startGame();
}
function dreamSetup() {
  var d = G.dream, k = DREAM_KITS[d.kit];
  Object.keys(G.cyber || {}).forEach(function (sl) { unequipCyber(sl); });
  G.modBag = []; G.cyber = {}; G.cyberChips = {}; G.chips = []; G.inst = {}; G.mods = {};
  p.level = k.lv; p.next = 16 + (p.level - 1) * 8; p.pending = 0; G.pendingBoons = 0; G.pendingEvo = 0;
  G.runMod = {}; Object.keys(k.run).forEach(function (x) { G.runMod[x] = (G.runMod[x] || 0) + k.run[x]; });
  G.adaptBonus = 99; G.plainInst = true;
  k.mods.forEach(function (id) { var m = MOD_BY[id]; if (!m) return; G.modBag.push(id); instOf(id); installCyber(id); });
  G.plainInst = false;
  G.dreamCd = 0; G.dreamHeat = 0; G.dreamSkin = k.skin || null;
  G.inv = []; G.credits = 0;
  recalc(); p.hp = p.maxHp;
  G.depth = k.from; startFloor(); hideOverlay(); G.pendingBoard = null; G.storyQueue = [];
  updateHUD(); renderAbilities();
  playScene(null, function () { toast('超梦 · ' + d.who, 'good'); }, (d.opening || []).map(function (t) { return { who: '', text: t, fx: 'static' }; }), { kicker: 'BRAINDANCE // ' + d.name });
}
function dreamAct() {
  if (G.mode !== 'dream' || G.state !== 'play' || G.paused || G.busy || psychoActive()) return;
  var k = DREAM_KITS[G.dream.kit]; if (G.dreamCd > 0) { msg('还需 ' + G.dreamCd + ' 回合', 'dim'); return; }
  var vis = G.enemies.filter(function (e) { return e.hp > 0 && G.vis[e.y] && G.vis[e.y][e.x]; });
  var kit = G.dream.kit;
  if (kit === 'rocker') { if (!vis.length) { msg('视野内没有目标', 'dim'); return; } NV.glitch = 1; nvPunch(1.5); G.shake = 12; vis.forEach(function (e) { var h = playerHit(e, effAtk() * 3.5, { source: 'dream' }); nvExplode(e.x, e.y, '#ff5c7a', 1.1); float(e.x, e.y, '-' + h.damage, '#ff5c7a', true); if (e.hp <= 0) killEnemy(e); }); }
  else if (kit === 'runner') { G.freeze = Math.max(G.freeze || 0, 3); G.dreamHeat += 30; chromeSkillActive({ type: 'sandevistan', color: '#9fe9ff', level: 5 }, p, []); if (G.dreamHeat >= 100) { G.dreamHeat = 30; triggerPsycho(); } }
  else if (kit === 'puppet') {
    var t = vis.filter(function (e) { return Math.max(Math.abs(e.x - p.x), Math.abs(e.y - p.y)) <= 6 && !e.structure; }).sort(function (a, b) { return b.hp - a.hp; })[0];
    if (!t) { msg('6 格内没有目标', 'dim'); return; }
    if (t.boss) { t.disarmT = 2; float(t.x, t.y, '缴械', '#57ffa8', true); } else ghostHackAct('hijack', t, { n: '牵丝' });
  }
  else if (kit === 'replicant') { healPlayer(pctHp(.35)); nvColumn(p.x, p.y, '#ffd166', 4); }
  else if (kit === 'hound') {
    var tg = vis.filter(function (e) { return Math.max(Math.abs(e.x - p.x), Math.abs(e.y - p.y)) <= 4 && los(p.x, p.y, e.x, e.y); }).sort(function (a, b) { return Math.max(Math.abs(a.x - p.x), Math.abs(a.y - p.y)) - Math.max(Math.abs(b.x - p.x), Math.abs(b.y - p.y)); })[0];
    if (!tg) { msg('4 格内没有猎物', 'dim'); return; }
    var land = freeAdjacent(tg.x, tg.y); if (land) { chromeSkillPush('blink', { x: p.x, y: p.y, tx: land.x, ty: land.y, color: '#ff7a45', priority: 3, life: 420 }); p.x = land.x; p.y = land.y; }
    p.face = Math.atan2(tg.y - p.y, tg.x - p.x);
    var hh = playerHit(tg, effAtk() * 3, { source: 'dream' }); healPlayer(Math.round(hh.damage * .5)); float(tg.x, tg.y, '撕咬 -' + hh.damage, '#ff7a45', true); nvKill && hh.damage && nvSpawn(tg.x, tg.y, '#ff365c', 20);
    if (tg.hp <= 0) killEnemy(tg);
  }
  G.dreamCd = k.act.cd; sfx.hit(); computeFOV(); updateHUD(); endTurn();
}
function dreamTick() {
  if (G.mode !== 'dream') return;
  if (G.dreamCd > 0) G.dreamCd--;
  if (G.dream.kit === 'replicant') { var d = Math.max(1, Math.round(p.maxHp * .03)); p.hp -= d; float(p.x, p.y, '-' + d, '#ffd166'); if (p.hp <= 0) { p.hp = 0; lose(); } }
}
function dreamFinish(won) {
  var d = G.dream; if (!d) return;
  G.state = won ? 'win' : 'over'; G.busy = true;
  var lines = won ? (d.ending || []) : ['记录在这里断了。', '带子还在转，画面只剩雪花。'];
  setTimeout(function () {
    playScene(null, function () {
      var reward = '';
      if (won && !ST.dreamDone[d.id]) {
        ST.dreamDone[d.id] = Date.now();
        if (d.reward && MOD_BY[d.reward.id] && !META.stash.cyber.some(function (x) { return stashId(x) === d.reward.id; })) { META.stash.cyber.push({ id: d.reward.id, chips: [] }); saveMeta(); reward = d.reward.name; }
        ST.relics[d.reward.id] = Date.now(); storySave();
      }
      var md = G.mode; G.mode = 'normal'; checkAch(); G.mode = md;
      G.dream = null; G.dreamSkin = null;
      showModal('end');
      overlay.innerHTML = '<div class="card dream-end"><div class="kicker">BRAINDANCE // ' + (won ? '播放完毕' : '信号中断') + '</div><h1 class="title small">' + econEsc(d.name) + '</h1>' +
        '<div class="story-text">' + econEsc(won ? '你摘下头环。手还在抖，那不是你的手。' : '你摘下头环。那个人没能走到最后，这一次也一样。') + '</div>' +
        (reward ? '<div class="legend end"><small>这段记忆留下了一件东西</small><b>' + econEsc(reward) + '</b><p>已存入仓库</p></div>' : '') +
        '<button class="cta" id="dShelf">回到录像带</button><button class="ghost" id="actionBtn">返回主菜单</button></div>';
      $('#dShelf').onclick = dreamShelf; $('#actionBtn').onclick = menuScreen;
    }, lines.map(function (t) { return { who: '', text: t, fx: won ? 'none' : 'static' }; }), { kicker: 'BRAINDANCE // ' + d.name });
  }, 700);
}
