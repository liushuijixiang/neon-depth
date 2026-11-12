/* =========================================================
   MONART_V1 · 每种敌人独立造型（矢量部件拼装）
   ========================================================= */
var MON_ART = {
  drone: ['diamond', ['hover', 'antenna'], 'dot'],
  pulse_turret: ['box', ['gun', 'tracks'], 'bar'],
  blade_runner: ['tri', ['blades', 'fins'], 'visor'],
  explode_bug: ['orb', ['wings', 'spikes'], 'cyclops'],
  fission: ['hex', ['core', 'tendrils'], 'twin'],
  data_hound: ['capsule', ['legs4', 'tail', 'horn'], 'visor'],
  hive_mother: ['hex', ['crown', 'legs6'], 'grid'],
  bulkhead: ['box', ['shield', 'tracks'], 'bar'],
  med_drone: ['orb', ['halo', 'hover'], 'cross'],
  prism_sniper: ['diamond', ['rifle', 'dish'], 'cyclops'],
  rail_ram: ['capsule', ['horn', 'tracks'], 'bar'],
  frost_hound: ['tri', ['legs4', 'spikes', 'tail'], 'twin'],
  arc_turret: ['hex', ['twin', 'antenna'], 'dot'],
  splitter: ['twinorb', ['core'], 'twin'],
  bulwark: ['hex', ['shield', 'legs2'], 'visor'],
  medic_drone: ['cross', ['halo', 'wings'], 'dot'],
  bomber_drone: ['tri', ['hover', 'bomb'], 'bar'],
  void_stalker: ['star', ['blades', 'tail'], 'visor'],
  mirror_knight: ['diamond', ['shield', 'crown', 'legs2'], 'visor'],
  spawn_tower: ['tower', ['antenna', 'dish'], 'grid'],
  void_eye: ['orb', ['halo', 'tendrils'], 'bigeye'],
  colossus: ['skull', ['claws', 'legs2'], 'twin'],
  swarmling: ['dart', ['wings', 'legs6'], 'dot'],
  s2_frost_mite: ['mite', ['legs6', 'spikes'], 'twin'],
  s2_arc_pylon: ['tower', ['coil', 'core'], 'dot'],
  s2_ice_ram: ['diamond', ['horn', 'legs4'], 'bar'],
  s2_core_husk: ['skull', ['shield', 'tracks'], 'grid'],
  s2_packet_ghost: ['ghost', ['tendrils', 'hover'], 'twin'],
  s2_volt_sac: ['sac', ['core', 'spikes'], 'cyclops'],
  s2_ruin_cantor: ['skull', ['crown', 'tendrils'], 'grid'],
  s2_repair_drone: ['box', ['wings', 'halo'], 'cross'],
  s3_void_mite: ['mite', ['legs6', 'horn'], 'dot'],
  s3_mirror_shade: ['prism', ['twin', 'fins'], 'visor'],
  s3_rift_charger: ['tri', ['blades', 'wings'], 'cyclops'],
  s3_corrupt_bulwark: ['box', ['spikes', 'shield', 'legs4'], 'grid'],
  s3_void_bloomer: ['star', ['tendrils', 'core'], 'dot'],
  s3_fracture_warden: ['cross', ['crown', 'legs4'], 'visor'],
  s3_hollow_choir: ['ghost', ['halo', 'wings'], 'twin'],
  s3_oblivion_hound: ['capsule', ['legs4', 'spikes', 'horn'], 'cyclops'],
  corp_dome_guard: ['suit', ['shield', 'legs2', 'badge'], 'visor'],
  corp_kharon_trooper: ['suit', ['rifle', 'legs2', 'pack'], 'bar'],
  corp_mobius_subject: ['sac', ['claws', 'tendrils', 'legs2'], 'bigeye']
};
function monArtFace(e) { return p && (p.x !== e.x || p.y !== e.y) ? Math.atan2(p.y - e.y, p.x - e.x) : 0; }
function monArt(e, x, y, r, now, line) {
  var art = MON_ART[e.id]; if (!art || e.boss) return false;
  var acc = e.color || '#ff365c', red = '#ff365c', t = (now || 0) / 1000, face = monArtFace(e), bob = VFX.reduced || e.portrait ? 0 : Math.sin(t * 3 + (e.x || 0)) * r * .06;
  var C2 = ctx; y += bob;
  function stroke() { C2.stroke(); }
  function path(pts) { C2.beginPath(); pts.forEach(function (q, i) { if (i) C2.lineTo(x + q[0] * r, y + q[1] * r); else C2.moveTo(x + q[0] * r, y + q[1] * r); }); C2.closePath(); }
  function line2(a, b, c, d) { C2.beginPath(); C2.moveTo(x + a * r, y + b * r); C2.lineTo(x + c * r, y + d * r); C2.stroke(); }
  function leg(ax, ay, kx, ky, fx, fy) { C2.beginPath(); C2.moveTo(x + ax * r, y + ay * r); C2.lineTo(x + kx * r, y + ky * r); C2.lineTo(x + fx * r, y + fy * r); C2.stroke(); }
  var wig = VFX.reduced || e.portrait ? 0 : Math.sin(t * 9 + (e.x || 0) * 1.3) * .08;
  // ---- 背景部件（在身体之后被遮住的部分先画）----
  art[1].forEach(function (pt) {
    C2.save(); C2.strokeStyle = line; C2.fillStyle = '#18232d';
    if (pt === 'legs2') { leg(-.35, .55, -.5, .95, -.6 + wig, 1.25); leg(.35, .55, .5, .95, .6 - wig, 1.25); }
    else if (pt === 'legs4') { [-1, 1].forEach(function (d) { leg(d * .5, .2, d * 1.05, .45, d * (1.2 + wig), 1.05); leg(d * .35, .45, d * .75, .85, d * (.85 - wig), 1.25); }); }
    else if (pt === 'legs6') { [-1, 1].forEach(function (d) { [-.35, .1, .5].forEach(function (yy, k) { leg(d * .45, yy, d * 1.05, yy - .25, d * (1.3 + (k % 2 ? wig : -wig)), yy + .45); }); }); }
    else if (pt === 'tracks') { C2.fillStyle = '#0d151c'; C2.fillRect(x - r * 1.05, y + r * .55, r * 2.1, r * .45); C2.strokeRect(x - r * 1.05, y + r * .55, r * 2.1, r * .45); for (var i = 0; i < 5; i++) line2(-.9 + i * .45, .55, -.9 + i * .45, 1); }
    else if (pt === 'hover') { C2.strokeStyle = acc; C2.globalAlpha = .7; [-.45, 0, .45].forEach(function (dx) { line2(dx, .8, dx, 1.15 + (VFX.reduced ? 0 : Math.abs(Math.sin(t * 12 + dx)) * .2)); }); }
    else if (pt === 'wings') { [-1, 1].forEach(function (d) { path([[d * .3, -.2], [d * 1.45, -.75 - wig], [d * 1.25, .1], [d * .4, .25]]); C2.globalAlpha = .55; C2.fill(); C2.globalAlpha = 1; stroke(); }); }
    else if (pt === 'tail') { C2.beginPath(); C2.moveTo(x - r * .9, y + r * .1); C2.quadraticCurveTo(x - r * 1.6, y - r * .1 + wig * r, x - r * 1.55, y - r * .7); stroke(); C2.fillStyle = acc; C2.fillRect(x - r * 1.62, y - r * .78, r * .16, r * .16); }
    else if (pt === 'tendrils') { C2.strokeStyle = acc; for (var k = 0; k < 4; k++) { var bx = -.6 + k * .4; C2.beginPath(); C2.moveTo(x + bx * r, y + r * .6); C2.quadraticCurveTo(x + (bx + (k % 2 ? .3 : -.3) + wig) * r, y + r * 1.0, x + (bx + wig) * r, y + r * 1.35); stroke(); } }
    else if (pt === 'halo') { C2.strokeStyle = acc; C2.globalAlpha = .8; C2.beginPath(); C2.ellipse(x, y - r * 1.15, r * .8, r * .22, 0, 0, TAU); stroke(); }
    else if (pt === 'fins') { [-1, 1].forEach(function (d) { path([[d * .5, .1], [d * 1.2, .55], [d * .55, .65]]); C2.fill(); stroke(); }); }
    else if (pt === 'claws') { [-1, 1].forEach(function (d) { leg(d * .7, 0, d * 1.3, -.2, d * 1.45, -.75); leg(d * 1.3, -.2, d * 1.05, -.8, d * 1.2, -1.0); }); }
    else if (pt === 'pack') { C2.fillRect(x - r * .5, y - r * .2, r * 1, r * .9); C2.strokeRect(x - r * .5, y - r * .2, r * 1, r * .9); }
    C2.restore();
  });
  // ---- 身体 ----
  C2.save(); C2.strokeStyle = line; C2.fillStyle = '#18232d'; C2.lineWidth = Math.max(1.4, C2.lineWidth);
  var body = art[0];
  if (body === 'diamond') { path([[0, -1.05], [.95, 0], [0, 1.05], [-.95, 0]]); C2.fill(); stroke(); }
  else if (body === 'box') { visualPlate(x, y, r * 1.9, r * 1.6); C2.fill(); stroke(); C2.fillStyle = line; [[-.75, -.6], [.75, -.6], [-.75, .6], [.75, .6]].forEach(function (q) { C2.fillRect(x + q[0] * r - 1, y + q[1] * r - 1, 2, 2); }); }
  else if (body === 'tri') { C2.save(); C2.translate(x, y); C2.rotate(face); C2.beginPath(); C2.moveTo(r * 1.2, 0); C2.lineTo(-r * .8, -r * .95); C2.lineTo(-r * .45, 0); C2.lineTo(-r * .8, r * .95); C2.closePath(); C2.fill(); C2.stroke(); C2.restore(); }
  else if (body === 'orb') { C2.beginPath(); C2.arc(x, y, r * .95, 0, TAU); C2.fill(); stroke(); C2.beginPath(); C2.arc(x, y, r * .62, Math.PI * 1.1, Math.PI * 1.9); stroke(); }
  else if (body === 'hex') { visualPolygon(x, y, r * 1.05, 6, Math.PI / 6); C2.fill(); stroke(); visualPolygon(x, y, r * .62, 6, Math.PI / 6); stroke(); }
  else if (body === 'capsule') { C2.save(); C2.translate(x, y); C2.rotate(face); C2.beginPath(); C2.moveTo(-r * .7, -r * .6); C2.lineTo(r * .7, -r * .6); C2.arc(r * .7, 0, r * .6, -Math.PI / 2, Math.PI / 2); C2.lineTo(-r * .7, r * .6); C2.arc(-r * .7, 0, r * .6, Math.PI / 2, Math.PI * 1.5); C2.closePath(); C2.fill(); C2.stroke(); C2.restore(); }
  else if (body === 'star') { C2.beginPath(); for (var s5 = 0; s5 < 10; s5++) { var a5 = -Math.PI / 2 + s5 * Math.PI / 5, rr = s5 % 2 ? r * .5 : r * 1.12; if (s5) C2.lineTo(x + Math.cos(a5) * rr, y + Math.sin(a5) * rr); else C2.moveTo(x + Math.cos(a5) * rr, y + Math.sin(a5) * rr); } C2.closePath(); C2.fill(); stroke(); }
  else if (body === 'cross') { path([[-.35, -1], [.35, -1], [.35, -.35], [1, -.35], [1, .35], [.35, .35], [.35, 1], [-.35, 1], [-.35, .35], [-1, .35], [-1, -.35], [-.35, -.35]]); C2.fill(); stroke(); }
  else if (body === 'skull') { C2.beginPath(); C2.arc(x, y - r * .15, r * .9, Math.PI, 0); C2.lineTo(x + r * .9, y + r * .35); C2.lineTo(x + r * .55, y + r * .35); C2.lineTo(x + r * .45, y + r * .85); C2.lineTo(x - r * .45, y + r * .85); C2.lineTo(x - r * .55, y + r * .35); C2.lineTo(x - r * .9, y + r * .35); C2.closePath(); C2.fill(); stroke(); for (var tq = -1; tq <= 1; tq++) line2(tq * .22, .45, tq * .22, .85); }
  else if (body === 'tower') { visualPlate(x, y + r * .1, r * 1.1, r * 2.1); C2.fill(); stroke(); line2(-.55, -.35, .55, -.35); line2(-.55, .35, .55, .35); }
  else if (body === 'twinorb') { var sp = VFX.reduced || e.portrait ? .45 : .45 + Math.sin(t * 2) * .08; [-1, 1].forEach(function (d) { C2.beginPath(); C2.arc(x + d * sp * r, y, r * .68, 0, TAU); C2.fill(); stroke(); }); }
  else if (body === 'dart') { C2.save(); C2.translate(x, y); C2.rotate(face); path([[0, 0]]); C2.beginPath(); C2.moveTo(r, 0); C2.lineTo(-r * .7, -r * .55); C2.lineTo(-r * .7, r * .55); C2.closePath(); C2.fill(); C2.stroke(); C2.restore(); }
  else if (body === 'mite') { C2.beginPath(); C2.ellipse(x, y, r * .75, r * .6, 0, 0, TAU); C2.fill(); stroke(); C2.beginPath(); C2.arc(x, y - r * .65, r * .32, 0, TAU); C2.fill(); stroke(); }
  else if (body === 'ghost') { C2.beginPath(); C2.arc(x, y - r * .1, r * .85, Math.PI, 0); for (var gk = 0; gk <= 4; gk++) C2.lineTo(x + r * .85 - gk * r * .425, y + r * (gk % 2 ? .55 : .9) + (gk % 2 ? 0 : wig * r)); C2.closePath(); C2.globalAlpha = .85; C2.fill(); C2.globalAlpha = 1; stroke(); }
  else if (body === 'sac') { var pulse = VFX.reduced || e.portrait ? 1 : 1 + Math.sin(t * 5) * .06; C2.beginPath(); C2.ellipse(x, y, r * .95 * pulse, r * 1.05 * pulse, 0, 0, TAU); C2.fill(); stroke(); C2.strokeStyle = acc; C2.globalAlpha = .6; C2.beginPath(); C2.moveTo(x - r * .5, y - r * .5); C2.quadraticCurveTo(x, y, x + r * .3, y + r * .6); stroke(); C2.globalAlpha = 1; }
  else if (body === 'prism') { path([[0, -1.1], [.9, -.2], [.5, 1], [-.5, 1], [-.9, -.2]]); C2.globalAlpha = .7; C2.fill(); C2.globalAlpha = 1; stroke(); line2(0, -1.1, 0, 1); }
  else if (body === 'suit') { C2.beginPath(); C2.arc(x, y - r * .75, r * .38, 0, TAU); C2.fill(); stroke(); path([[-.65, -.35], [.65, -.35], [.5, .6], [-.5, .6]]); C2.fill(); stroke(); }
  C2.restore();
  // ---- 前景部件 ----
  art[1].forEach(function (pt) {
    C2.save(); C2.strokeStyle = line; C2.fillStyle = '#18232d';
    if (pt === 'gun' || pt === 'rifle') { C2.translate(x, y); C2.rotate(face); var L = pt === 'rifle' ? 1.7 : 1.25; visualPlate(r * (L / 2 + .2), 0, r * L, r * .32); C2.fill(); C2.stroke(); C2.fillStyle = red; C2.fillRect(r * (L + .15), -r * .1, r * .22, r * .2); }
    else if (pt === 'twin') { C2.translate(x, y); C2.rotate(face); [-.28, .28].forEach(function (d) { visualPlate(r * .85, d * r, r * 1.1, r * .2); C2.fill(); C2.stroke(); }); }
    else if (pt === 'blades') { [-1, 1].forEach(function (d) { C2.beginPath(); C2.moveTo(x + d * r * .5, y - r * .2); C2.lineTo(x + d * r * 1.5, y - r * 1.1); C2.lineTo(x + d * r * 1.1, y + r * .1); C2.closePath(); C2.fillStyle = 'rgba(255,255,255,.08)'; C2.fill(); C2.strokeStyle = acc; C2.stroke(); }); }
    else if (pt === 'antenna') { line2(0, -.95, 0, -1.55); C2.fillStyle = acc; C2.beginPath(); C2.arc(x, y - r * 1.6, r * .14, 0, TAU); C2.fill(); }
    else if (pt === 'dish') { C2.beginPath(); C2.arc(x + r * .55, y - r * 1.05, r * .45, Math.PI * .9, Math.PI * 1.9); C2.stroke(); line2(.55, -1.05, .35, -.6); }
    else if (pt === 'horn') { C2.save(); C2.translate(x, y); C2.rotate(face); C2.beginPath(); C2.moveTo(r * .9, -r * .3); C2.lineTo(r * 1.65, 0); C2.lineTo(r * .9, r * .3); C2.closePath(); C2.fillStyle = acc; C2.globalAlpha = .7; C2.fill(); C2.globalAlpha = 1; C2.stroke(); C2.restore(); }
    else if (pt === 'shield') { C2.save(); C2.translate(x, y); C2.rotate(face); C2.strokeStyle = acc; C2.lineWidth = 2.2; C2.beginPath(); C2.arc(0, 0, r * 1.35, -.75, .75); C2.stroke(); C2.restore(); }
    else if (pt === 'spikes') { C2.strokeStyle = acc; for (var k = 0; k < 8; k++) { var a = k * TAU / 8 + .2; line2(Math.cos(a) * .95, Math.sin(a) * .95, Math.cos(a) * 1.3, Math.sin(a) * 1.3); } }
    else if (pt === 'core') { var g = VFX.reduced || e.portrait ? .8 : .6 + .4 * Math.sin(t * 6); C2.fillStyle = acc; C2.globalAlpha = g; C2.beginPath(); C2.arc(x, y + r * .05, r * .28, 0, TAU); C2.fill(); }
    else if (pt === 'crown') { C2.strokeStyle = acc; path([[-.6, -.85], [-.35, -1.35], [-.15, -.95], [0, -1.45], [.15, -.95], [.35, -1.35], [.6, -.85]]); C2.stroke(); }
    else if (pt === 'bomb') { C2.fillStyle = red; C2.beginPath(); C2.arc(x, y + r * .95, r * .26, 0, TAU); C2.fill(); }
    else if (pt === 'coil') { C2.strokeStyle = acc; for (var c = 0; c < 3; c++) { C2.beginPath(); C2.ellipse(x, y - r * (.6 - c * .45), r * .7, r * .16, 0, 0, TAU); C2.stroke(); } }
    else if (pt === 'badge') { C2.fillStyle = acc; C2.fillRect(x - r * .2, y - r * .15, r * .4, r * .3); }
    C2.restore();
  });
  // ---- 眼 ----
  C2.save(); C2.fillStyle = acc; C2.strokeStyle = acc;
  var eyeY = art[0] === 'suit' ? y - r * .78 : art[0] === 'skull' ? y - r * .25 : art[0] === 'mite' ? y - r * .65 : y - r * .05;
  var eye = art[2];
  if (eye === 'dot') { C2.beginPath(); C2.arc(x, eyeY, r * .15, 0, TAU); C2.fill(); }
  else if (eye === 'bar') C2.fillRect(x - r * .38, eyeY - r * .09, r * .76, r * .18);
  else if (eye === 'visor') { C2.beginPath(); C2.moveTo(x - r * .5, eyeY - r * .05); C2.lineTo(x + r * .5, eyeY - r * .05); C2.lineTo(x + r * .35, eyeY + r * .14); C2.lineTo(x - r * .35, eyeY + r * .14); C2.closePath(); C2.fill(); }
  else if (eye === 'twin') { [-1, 1].forEach(function (d) { C2.beginPath(); C2.arc(x + d * r * .26, eyeY, r * .12, 0, TAU); C2.fill(); }); }
  else if (eye === 'cyclops') { C2.beginPath(); C2.arc(x, eyeY, r * .26, 0, TAU); C2.lineWidth = 1.4; C2.stroke(); C2.beginPath(); C2.arc(x, eyeY, r * .1, 0, TAU); C2.fill(); }
  else if (eye === 'bigeye') { C2.fillStyle = '#05080d'; C2.beginPath(); C2.ellipse(x, eyeY, r * .5, r * .3, 0, 0, TAU); C2.fill(); C2.lineWidth = 1.4; C2.stroke(); C2.fillStyle = acc; C2.beginPath(); C2.arc(x + Math.cos(face) * r * .15, eyeY + Math.sin(face) * r * .08, r * .14, 0, TAU); C2.fill(); }
  else if (eye === 'grid') { for (var gx = -1; gx <= 1; gx++) for (var gy = 0; gy <= 1; gy++) C2.fillRect(x + gx * r * .22 - r * .06, eyeY + gy * r * .2 - r * .1, r * .12, r * .12); }
  else if (eye === 'cross') { C2.fillRect(x - r * .3, eyeY - r * .07, r * .6, r * .14); C2.fillRect(x - r * .07, eyeY - r * .3, r * .14, r * .6); }
  C2.restore();
  return true;
}
