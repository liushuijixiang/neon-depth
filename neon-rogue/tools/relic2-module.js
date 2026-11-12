/* RELIC_V2 · 每件剧情义体一种独有效果 */
Object.assign(RELIC_ONCE, {
  decoy: '放出全息分身 6 回合：敌人的攻击有六成打在分身上',
  chain: '闪电在视野内敌人之间跳 6 次，每跳 2×攻击',
  swap: '与最远的可见敌人换位，并让它宕机 2 回合',
  magnet: '把 4 格内的敌人拽到身边，各受 1.5×攻击',
  mirror: '5 回合内把受到的伤害原样还给出手的人',
  bank: '把 30% 信用点换成双倍护盾',
  blood: '扣 30% 生命，接下来 3 次攻击伤害 ×3',
  ghostrun: '3 回合无敌，可以直接穿墙',
  rewind: '回到 3 回合前的位置和生命',
  reboot: '所有冷却清零，修好全部义体耐久',
  jukebox: '6 回合：每回合回复 5% 生命，身边 2 格内的敌人宕机',
  taxi: '叫车：直接送到本层出口旁边',
  pack: '叫来两只猎犬同伴，陪你走完这一层',
  lastday: '5 回合内生命不会低于 1，结束时回复 30% 生命'
});
var S2 = (window.NEON && window.NEON.story2) || {};
(S2.relics || []).forEach(function (r) {
  if (MOD_BY[r.id]) return;
  var L = { atk: '攻击', maxHp: '生命', def: '防御', crit: '暴击', dodge: '闪避', lifesteal: '吸血' };
  var parts = Object.keys(r.stats || {}).map(function (k) { var v = r.stats[k]; return (L[k] || k) + ' +' + (v < 1 ? Math.round(v * 100) + '%' : v); });
  var m = { id: r.id, slot: r.slot, quality: r.quality, name: r.name, color: (QUALITY[r.quality] || QUALITY.orange).color, stats: r.stats || {},
    desc: parts.join('，') + '；一次性：' + r.powerName, active: { name: r.powerName, type: 'relic_' + r.power, cd: 1 }, dropOnly: true, relic: true, lore: r.lore, owner: r.owner };
  MODS.push(m); MOD_BY[m.id] = m;
  var o = NPC_BY[r.owner]; if (o) o.relic = r.id;
  STORY.relics.push({ id: r.id, name: r.name, slot: r.slot, quality: r.quality, stats: r.stats, once: r.power, onceName: r.powerName, lore: r.lore });
});
// 超梦奖励改成各自独有的效果
(function () { var map = { bd_replicant: 'lastday', bd_hound: 'pack' }; DREAMS.forEach(function (d) { var k = map[d.id], m = d.reward && MOD_BY[d.reward.id]; if (k && m) { m.active.type = 'relic_' + k; d.reward.once = k; } }); })();
function relicPower(once, id, vis) {
  var a = effAtk(), t;
  if (once === 'decoy') { var sp = freeAdjacent(p.x, p.y) || { x: p.x, y: p.y }; G.allies.push({ kind: 'decoy', x: sp.x, y: sp.y, turns: 6, color: '#c08bff', name: '分身' }); G.decoyT = 6; return true; }
  if (once === 'chain') { if (!vis.length) return false; var cur = { x: p.x, y: p.y }, hit = []; for (var i = 0; i < 6; i++) { var pool = vis.filter(function (e) { return e.hp > 0 && hit[hit.length - 1] !== e; }).sort(function (x, y) { return Math.hypot(x.x - cur.x, x.y - cur.y) - Math.hypot(y.x - cur.x, y.y - cur.y); }); t = pool[0]; if (!t) break; G.beams.push({ x0: cur.x + .5, y0: cur.y + .5, x1: t.x + .5, y1: t.y + .5, life: 300 + i * 60, max: 300 + i * 60, color: '#9fe9ff' }); var h = playerHit(t, a * 2, { source: 'relic' }); float(t.x, t.y, '-' + h.damage, '#9fe9ff', true); hit.push(t); cur = { x: t.x, y: t.y }; if (t.hp <= 0) killEnemy(t); } return true; }
  if (once === 'swap') { t = vis.slice().sort(function (x, y) { return Math.max(Math.abs(y.x - p.x), Math.abs(y.y - p.y)) - Math.max(Math.abs(x.x - p.x), Math.abs(x.y - p.y)); })[0]; if (!t) return false; var ox = p.x, oy = p.y; p.x = t.x; p.y = t.y; t.x = ox; t.y = oy; t.stun = Math.max(t.stun || 0, 2); t.intent = null; chromeSkillPush('blink', { x: ox, y: oy, tx: p.x, ty: p.y, color: '#ffb347', priority: 3, life: 420 }); return true; }
  if (once === 'magnet') { var near = G.enemies.filter(function (e) { return e.hp > 0 && !e.structure && Math.max(Math.abs(e.x - p.x), Math.abs(e.y - p.y)) <= 4; }); if (!near.length) return false; near.forEach(function (e) { if (!e.boss) { var s2 = freeAdjacent(p.x, p.y); if (s2) { G.beams.push({ x0: e.x + .5, y0: e.y + .5, x1: s2.x + .5, y1: s2.y + .5, life: 260, max: 260, color: '#ffd166' }); e.x = s2.x; e.y = s2.y; } } var h = playerHit(e, a * 1.5, { source: 'relic' }); float(e.x, e.y, '-' + h.damage, '#ffd166', true); if (e.hp <= 0) killEnemy(e); }); return true; }
  if (once === 'mirror') { G.mirrorT = 5; return true; }
  if (once === 'bank') { var c = Math.floor((G.credits || 0) * .3); if (c < 2) return false; G.credits -= c; addBuff('shield', 8, c * 2, '找零'); float(p.x, p.y, '护盾 +' + c * 2, '#ffd166', true); return true; }
  if (once === 'blood') { var cost = Math.round(p.maxHp * .3); p.hp = Math.max(1, p.hp - cost); G.bloodHits = 3; float(p.x, p.y, '-' + cost, C.red, true); return true; }
  if (once === 'ghostrun') { G.ghostRunT = 3; return true; }
  if (once === 'rewind') { var h3 = (G.hist || [])[0]; if (!h3) return false; p.x = h3.x; p.y = h3.y; p.hp = Math.max(p.hp, h3.hp); return true; }
  if (once === 'reboot') { G.cyberCd = {}; G.gunCd = {}; G.ghostCd = {}; G.mechCd = {}; G.mechCool = 0; Object.keys(G.inst || {}).forEach(function (k) { G.inst[k].dur = G.inst[k].maxDur; }); return true; }
  if (once === 'jukebox') { G.jukeT = 6; return true; }
  if (once === 'taxi') { if (!G.stairs) return false; var s3 = freeAdjacent(G.stairs.x, G.stairs.y) || G.stairs; chromeSkillPush('blink', { x: p.x, y: p.y, tx: s3.x, ty: s3.y, color: '#fcee0a', priority: 3, life: 500 }); p.x = s3.x; p.y = s3.y; return true; }
  if (once === 'pack') { for (var k = 0; k < 2; k++) { var s4 = freeAdjacent(p.x, p.y); if (s4) G.allies.push({ kind: 'hacked', name: '猎犬', x: s4.x, y: s4.y, atk: Math.max(3, Math.round(a * .6)), turns: 99999, color: '#ff7a45', glyph: 'triangle', floorOnly: true }); } return true; }
  if (once === 'lastday') { G.lastDayT = 5; return true; }
  return null;
}
function relicTick() {
  if (G.decoyT > 0) G.decoyT--;
  if (G.mirrorT > 0) G.mirrorT--;
  if (G.ghostRunT > 0 && --G.ghostRunT === 0 && G.map[p.y][p.x] === WALL) { var f = freeAdjacent(p.x, p.y); for (var r = 1; !f && r < 6; r++) { for (var dy = -r; dy <= r && !f; dy++) for (var dx = -r; dx <= r && !f; dx++) { var nx = p.x + dx, ny = p.y + dy; if (G.map[ny] && G.map[ny][nx] === FLOOR && !occupied(nx, ny)) f = { x: nx, y: ny }; } } if (f) { p.x = f.x; p.y = f.y; } }
  if (G.jukeT > 0) { G.jukeT--; healPlayer(pctHp(.05), true); G.enemies.forEach(function (e) { if (!e.boss && Math.max(Math.abs(e.x - p.x), Math.abs(e.y - p.y)) <= 2) { e.stun = Math.max(e.stun || 0, 1); e.intent = null; } }); nvSpawn(p.x, p.y, '#fcee0a', 6, { kind: 'bit' }); }
  if (G.lastDayT > 0 && --G.lastDayT === 0) { healPlayer(pctHp(.3)); msg('又撑过了一天', 'good'); }
  G.hist = G.hist || []; G.hist.push({ x: p.x, y: p.y, hp: p.hp }); if (G.hist.length > 3) G.hist.shift();
}
