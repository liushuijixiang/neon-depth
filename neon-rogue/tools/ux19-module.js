/* =========================================================
   UX_V19 · 背包 / 消耗品替换 / 委托保底 / 人物出场节奏
   ========================================================= */
/* ---------- 消耗品满了：询问替换 ---------- */
var CONS_SCRAP = { common: 6, rare: 12, epic: 22 };
function consValue(spec) { return (CONS_SCRAP[spec.tier || 'common'] || 6) + Math.floor(econDepth() / 2); }
function queueSwap(spec, ground) { G.swapQueue = G.swapQueue || []; G.swapQueue.push({ spec: spec, ground: ground || null }); }
function maybeShowSwap() {
  if (!G.swapQueue || !G.swapQueue.length || G.state !== 'play' || G.paused || G.modal || G.busy) return false;
  var job = G.swapQueue.shift(), spec = job.spec;
  if (G.inv.length < 4) { addConsumable(spec); return maybeShowSwap(); }
  showModal('swap');
  var T = TIER_INFO[spec.tier || 'common'] || TIER_INFO.common, val = consValue(spec);
  var html = '<div class="card swap"><div class="kicker">消耗品栏已满 · 4/4</div><h1 class="title small">拿哪个？</h1>' +
    '<div class="swap-new" style="--it:' + T.color + '"><b>' + econEsc(spec.name) + '</b><small>' + T.name + ' · 新拾取</small><em>' + econEsc(consEffectText(spec).join('；')) + '</em></div>' +
    '<div class="loot-h">换掉其中一个（换下的折现）</div><div class="swap-grid">';
  G.inv.forEach(function (id, i) { var c = CONS[id]; if (!c) return; var t = TIER_INFO[c.tier || 'common'] || TIER_INFO.common; html += '<button class="swap-old" data-sw="' + i + '" style="--it:' + t.color + '"><b>' + econEsc(c.name) + '</b><small>折现 ¥' + consValue(c) + '</small></button>'; });
  html += '</div><div class="dock"><button class="ghost" id="swDrop">' + (job.ground ? '留在地上' : '不要了 · 折现 ¥' + val) + '</button></div></div>';
  overlay.innerHTML = html;
  $$('[data-sw]').forEach(function (b) { b.onclick = function () {
    var i = +b.getAttribute('data-sw'), old = CONS[G.inv[i]];
    G.inv.splice(i, 1); if (old) gainCredits(consValue(old), null, null, true);
    if (job.ground) { var gi = G.items.indexOf(job.ground); if (gi >= 0) G.items.splice(gi, 1); }
    G.inv.push(spec.id); recordCodex('consumables', spec.id, spec.name); sfx.pick();
    toast('换下 ' + (old ? old.name : '') + ' · +¥' + (old ? consValue(old) : 0), 'good'); hideOverlay(); updateHUD(); econResume();
  }; });
  $('#swDrop').onclick = function () {
    if (job.ground) job.ground.warned = true; else { gainCredits(val, null, null, true); toast(spec.name + ' 折现 ¥' + val, 'warn'); }
    hideOverlay(); updateHUD(); econResume();
  };
  return true;
}

/* ---------- 背包面板 ---------- */
function dropToGround(obj) {
  var spot = null;
  if (!G.items.some(function (it) { return it.x === p.x && it.y === p.y; })) spot = { x: p.x, y: p.y };
  else spot = freeAdjacent(p.x, p.y) || { x: p.x, y: p.y };
  obj.x = spot.x; obj.y = spot.y; obj.seed = Math.random() * TAU; obj.warned = true; G.items.push(obj);
  return spot;
}
function openBag() {
  if (G.state !== 'play' || psychoActive()) return;
  showModal('bag');
  var on = Object.keys(G.cyber || {}).map(function (k) { return G.cyber[k]; });
  var mods = bagItems(), chips = G.chips || [];
  var html = '<div class="card bagp"><div class="kicker">INVENTORY // 背包 ' + bagCount() + '/' + bagCap() + '</div><h1 class="title small">背包</h1>' +
    '<div class="bag-bar"><i style="width:' + Math.min(100, bagCount() / bagCap() * 100) + '%"></i></div>';
  html += '<div class="loot-h">消耗品 ' + G.inv.length + '/4</div><div class="bag-grid">';
  G.inv.forEach(function (id, i) { var c = CONS[id]; if (!c) return; var t = TIER_INFO[c.tier || 'common'] || TIER_INFO.common;
    html += '<div class="bag-it" style="--it:' + t.color + '"><b>' + econEsc(c.name) + '</b><small>' + t.name + '</small><em>' + econEsc(consEffectText(c)[0] || '') + '</em><div class="bag-act"><button data-bu="' + i + '">使用</button><button data-bd="c' + i + '">丢下</button><button data-bs="c' + i + '">¥' + consValue(c) + '</button></div></div>'; });
  if (!G.inv.length) html += '<div class="hint">空</div>';
  html += '</div><div class="loot-h">义体 ' + mods.length + '</div><div class="bag-grid">';
  mods.forEach(function (id) { var m = MOD_BY[id], q = QUALITY[m.quality] || QUALITY.gray;
    html += '<div class="bag-it" style="--it:' + q.color + '"><b>' + econEsc(modName(id)) + '</b><small>' + q.name + ' · ' + (SLOT_LABEL[m.slot] || '') + ' · ' + econEsc(instTag(id)) + '</small><em>' + econEsc(m.desc) + '</em><div class="bag-act"><button data-be="' + id + '">装配</button><button data-bd="m' + id + '">丢下</button></div></div>'; });
  if (!mods.length) html += '<div class="hint">没有未装配的义体</div>';
  html += '</div><div class="loot-h">芯片 ' + chips.length + '</div><div class="bag-grid">';
  chips.forEach(function (c, i) { html += '<div class="bag-it" style="--it:' + c.color + '"><b>' + econEsc(c.grade + '·' + c.name) + '</b><em>' + econEsc(chipText(c)) + '</em><div class="bag-act"><button data-bd="p' + i + '">丢下</button></div></div>'; });
  if (!chips.length) html += '<div class="hint">没有散装芯片</div>';
  html += '</div><div class="hint">满了以后捡不起来的东西会留在地上。义体、芯片和镶嵌请到义体仓操作。</div><div class="dock"><button class="cta" id="bagClose">关闭</button></div></div>';
  overlay.innerHTML = html;
  $('#bagClose').onclick = function () { hideOverlay(); updateHUD(); econResume(); };
  $$('[data-bu]').forEach(function (b) { b.onclick = function () { hideOverlay(); useConsumable(+b.getAttribute('data-bu')); }; });
  $$('[data-be]').forEach(function (b) { b.onclick = function () { installCyber(b.getAttribute('data-be')); openBag(); }; });
  $$('[data-bs]').forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-bs').slice(1), c = CONS[G.inv[i]]; if (!c) return; G.inv.splice(i, 1); gainCredits(consValue(c), null, null, true); sfx.pick(); openBag(); }; });
  $$('[data-bd]').forEach(function (b) { b.onclick = function () {
    var k = b.getAttribute('data-bd'), t = k[0], v = k.slice(1);
    if (t === 'c') { var c = CONS[G.inv[+v]]; if (!c) return; G.inv.splice(+v, 1); dropToGround({ cons: c }); }
    else if (t === 'm') { var bi = G.modBag.indexOf(v); if (bi < 0) return; G.modBag.splice(bi, 1); var inst = (G.inst || {})[v]; delete (G.inst || {})[v]; dropToGround({ mod: MOD_BY[v], inst: inst }); }
    else if (t === 'p') { var ch = G.chips.splice(+v, 1)[0]; if (ch) dropToGround({ chip: ch }); }
    sfx.step(); recalc(); openBag();
  }; });
}

/* ---------- 委托保底：补怪 ---------- */
// 在未探索区补；都探索过了就在通往出口的路上补
function guaranteeSpot() {
  var cands = [];
  for (var y = 1; y < MAP_H - 1; y++) for (var x = 1; x < MAP_W - 1; x++) {
    if (G.map[y][x] !== FLOOR || occupied(x, y) || (G.sites || []).some(function (s) { return s.x === x && s.y === y; })) continue;
    if (Math.max(Math.abs(x - p.x), Math.abs(y - p.y)) < 6) continue;
    if (!G.seen[y][x]) cands.push({ x: x, y: y, w: 0 });
  }
  if (cands.length) return pick(cands);
  if (!G.stairs) return randomFloorTile(6, false);
  // BFS 从出口回溯到玩家，取路线中段的格子
  var prev = {}, q = [[G.stairs.x, G.stairs.y]], key = function (x, y) { return x + ',' + y; }, seen = {}; seen[key(G.stairs.x, G.stairs.y)] = 1;
  while (q.length) { var c = q.shift(); if (c[0] === p.x && c[1] === p.y) break;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = c[0] + d[0], ny = c[1] + d[1], k = key(nx, ny); if (seen[k] || !G.map[ny] || G.map[ny][nx] === WALL) return; seen[k] = 1; prev[k] = c; q.push([nx, ny]); }); }
  var path = [], cur = [p.x, p.y]; while (cur && !(cur[0] === G.stairs.x && cur[1] === G.stairs.y)) { path.push(cur); cur = prev[key(cur[0], cur[1])]; }
  var mid = path.filter(function (c, i) { return i > 4 && !occupied(c[0], c[1]); });
  if (mid.length) { var m = mid[Math.floor(mid.length / 2)]; return { x: m[0], y: m[1] }; }
  return randomFloorTile(5, false);
}
function guaranteeSpawn(specFilter, elite, tag) {
  var spot = guaranteeSpot(); if (!spot) return null;
  var pool = MONSTERS.filter(function (m) { return !m.boss && econDepth() >= (m.minDepth || 1) - 1 && econDepth() <= (m.maxDepth || 99) + 1 && (!specFilter || specFilter(m)); });
  if (!pool.length) pool = MONSTERS.filter(function (m) { return !m.boss && (!specFilter || specFilter(m)); });
  if (!pool.length) return null;
  var e = spawnEnemy(pick(pool), spot.x, spot.y, G.depth); if (elite) econMakeElite(e);
  e.contractFill = tag || 1; tacticUid(e); G.enemies.push(e); return e;
}
function contractEnsure() {
  if (G.mode !== 'normal' || G.depth % 5 === 0) return;
  var live = G.enemies.filter(function (e) { return e.hp > 0 && !e.summoned && !e.structure && !e.boss; });
  contractActive().forEach(function (c) {
    var t = c.def.type, need = c.target - c.progress, guard = 0;
    if (t === 'kill' || t === 'combo') { var have = live.length; while (have < need + (t === 'combo' ? 1 : 0) && guard++ < 8) { if (guaranteeSpawn()) have++; else break; } }
    else if (t === 'killElite') { var el = live.filter(function (e) { return e.elite; }).length; var floorsLeft = c.def.deadline === 'floor' || (c.def.deadline === 'floors2' && G.depth > c.accDepth) ? 1 : 2; if (floorsLeft === 1 || c.def.deadline === 'boss') while (el < need && guard++ < 6) { if (guaranteeSpawn(null, true)) el++; else break; } }
    else if (t === 'killType') { var ty = live.filter(function (e) { return e.id === c.targetId; }).length; var spec = MONSTERS.find(function (m) { return m.id === c.targetId; }); while (spec && ty < need && guard++ < 6) { var spot = guaranteeSpot(); if (!spot) break; var e = spawnEnemy(spec, spot.x, spot.y, G.depth); tacticUid(e); G.enemies.push(e); ty++; } }
    else if (t === 'shards') { var sh = G.items.filter(function (it) { return it.it && it.it.kind === 'xp'; }).length; while (sh < need && guard++ < 4 && ITEM.data_shard) { var sp = guaranteeSpot(); if (!sp) break; G.items.push({ x: sp.x, y: sp.y, it: ITEM.data_shard, seed: Math.random() * TAU }); sh++; } }
    else if (t === 'hunt') { if (!G.enemies.some(function (e) { return e.bounty && e.contractUid === c.uid; })) spawnWanted(c); }
    else if (t === 'killPsycho') { if (!G.enemies.some(function (e) { return e.psycho; })) spawnPsychoEnemy(Math.max(2, G.depth), true); }
  });
}

/* ---------- 人物出场 ---------- */
function npcPool() { return (STORY.npcs || []).concat(((window.NEON && window.NEON.story2) || {}).npcs || []); }
function pickNpcForFloor(depth) {
  G.npcSeen = G.npcSeen || [];
  if (G.mode !== 'normal' || G.npcSeen.length >= 3 || depth % 5 === 0) return null;
  var floorsLeft = 14 - depth - Math.floor((14 - depth) / 5), need = 3 - G.npcSeen.length;
  var chance = Math.min(.9, .28 + (need / Math.max(1, floorsLeft)) * .5);
  if (Math.random() > chance) return null;
  var pool = npcPool().filter(function (n) { return G.npcSeen.indexOf(n.id) < 0; });
  if (!pool.length) return null;
  pool.forEach(function (n) { var st = npcState(n.id); n._w = (st.done ? 1 : 6 + (st.stage || 0) * 2) * (Math.abs((n.floor || depth) - depth) <= 2 ? 3 : 1); });
  var tot = 0; pool.forEach(function (n) { tot += n._w; }); var r = Math.random() * tot;
  for (var i = 0; i < pool.length; i++) { r -= pool[i]._w; if (r <= 0) return pool[i]; }
  return pool[0];
}
