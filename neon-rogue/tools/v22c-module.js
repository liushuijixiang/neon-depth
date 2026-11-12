/* V22C · 图鉴模型 / 隐藏成就 / B16 */
function isBossFloor(d) { return d % 5 === 0 || d === 16; }
function codexPortraitCard(spec, seen, boss) {
  var role = boss ? '守卫 · ' + (spec.tacticName || '') : (spec.tacticName || AI_LABEL[spec.ai] || spec.ai);
  var hp = boss ? Math.round(spec.hp * 4.5) : spec.hp[0] + '-' + spec.hp[1], atk = boss ? spec.atk : spec.atk[0] + '-' + spec.atk[1];
  return '<button class="mcard' + (seen ? '' : ' unseen') + (boss ? ' boss' : '') + '" style="--mc:' + (spec.color || '#9fe9ff') + '" data-mcard="1"><canvas data-mon="' + spec.id + '" data-sil="' + (seen ? 0 : 1) + '" data-boss="' + (boss ? 1 : 0) + '"></canvas>' +
    '<b>' + (seen ? spec.name : '？？？') + '</b><small>' + (seen ? role : '尚未遭遇') + '</small>' + (seen ? '<span class="mst"><i>HP ' + hp + '</i><i>ATK ' + atk + '</i>' + (spec.minDepth ? '<i>B' + spec.minDepth + '-' + spec.maxDepth + '</i>' : '') + '</span><em>' + (spec.desc || '') + (spec.tacticHint ? '<br><span>' + spec.tacticHint + '</span>' : '') + '</em>' : '') + '</button>';
}
function drawCodexPortraits(root) {
  var all = MONSTERS.concat(EXT_BOSSES.length ? EXT_BOSSES : BOSSES);
  root.querySelectorAll('canvas[data-mon]').forEach(function (cv) {
    if (cv._drawn) return; cv._drawn = true;
    var spec = all.find(function (m) { return m.id === cv.getAttribute('data-mon'); }); if (!spec) return;
    var dpr2 = Math.min(2, window.devicePixelRatio || 1), W = 64, H = 64; cv.width = W * dpr2; cv.height = H * dpr2; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var c2 = cv.getContext('2d'), saved = ctx, boss = cv.getAttribute('data-boss') === '1', sil = cv.getAttribute('data-sil') === '1';
    c2.setTransform(dpr2, 0, 0, dpr2, 0, 0);
    var g = c2.createRadialGradient(W / 2, H / 2, 4, W / 2, H / 2, W / 2); g.addColorStop(0, sil ? '#0d141c' : 'rgba(30,50,70,.9)'); g.addColorStop(1, '#05080d'); c2.fillStyle = g; c2.fillRect(0, 0, W, H);
    c2.strokeStyle = 'rgba(120,160,190,.12)'; c2.lineWidth = 1; for (var i = 8; i < W; i += 8) { c2.beginPath(); c2.moveTo(i, 0); c2.lineTo(i, H); c2.moveTo(0, i); c2.lineTo(W, i); c2.stroke(); }
    var fake = { spec: spec, id: spec.id, name: spec.name, ai: boss ? 'boss' : spec.ai, glyph: spec.glyph, color: spec.color, x: 0, y: 0, hp: 1, maxHp: 1, atk: 1, def: 0, boss: boss, elite: false, alerted: true, tick: 0, stun: 0, buffs: [], intent: null, brain: { step: 0, stage: 0, stance: '', angle: 0, plate: 100, repair: 0 }, facing: Math.PI, face: Math.PI, structure: spec.structure };
    ctx = c2;
    try { visualEnemy(fake, W / 2, H / 2 + (boss ? 2 : 0), boss ? 40 : 54, 0, sil); }
    catch (e) { c2.fillStyle = spec.color || '#9fe9ff'; c2.font = '700 26px sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText((spec.name || '?')[0], W / 2, H / 2); }
    finally { ctx = saved; }
    if (sil) { c2.globalCompositeOperation = 'source-atop'; c2.fillStyle = 'rgba(5,8,13,.85)'; c2.fillRect(0, 0, W, H); c2.globalCompositeOperation = 'source-over'; c2.fillStyle = '#3d5260'; c2.font = '700 20px sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('?', W / 2, H / 2); }
  });
}
document.addEventListener('click', function (ev) { var c = ev.target.closest && ev.target.closest('[data-mcard]'); if (c) c.classList.toggle('open'); }, true);
/* 隐藏成就 */
function hiddenAchCheckWin() {
  if (G.mode !== 'normal') return;
  var cls = classDef().id, all = (G.chalSel || []).length >= CHALLENGES.length;
  cum.allChalWin = cum.allChalWin || {};
  if (all) cum.allChalWin[cls] = 1;
  if (!G.everEquipped) cum.nakedWin = (cum.nakedWin || 0) + 1;
  if ((G.runPsycho || 0) >= 3) cum.psychoWin = (cum.psychoWin || 0) + 1;
  if (G.turn <= 700) cum.speedWin = (cum.speedWin || 0) + 1;
  if (G.depth >= 16) cum.b16Win = (cum.b16Win || 0) + 1;
  if (['assault', 'engineer', 'ghost'].every(function (k) { return cum.allChalWin[k]; }) && !META.b16) { META.b16 = 1; saveMeta(); toast('源点开放 · 解锁 B16', 'good'); }
}
