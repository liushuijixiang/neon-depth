#!/usr/bin/env node
'use strict';
/*
 * CHROME BOSS STAGE / presentation-only patch, not applied by its author.
 * node tools/chrome-boss-stage-patch.js --check  => preflight both files; NO writes
 * node tools/chrome-boss-stage-patch.js          => parent applies both files
 *
 * Acorn-located unique functions + function-local exact literals. Never patches
 * bossAct/playerAttack/playerHit/useCyberActive, numbers, targets or turn logic.
 * Browser state binds to owner object + uid + map + mode + runId.
 * No notifications API, permission requests, timers, storage, fetch or assets.
 */
const fs = require('fs');
const path = require('path');
let acorn;
try { acorn = require('acorn'); }
catch (_) { acorn = require('/root/workspace/neon-tooling/node_modules/acorn'); }
const MARKER = 'CHROME_BOSS_STAGE_V1';
const PROFILES = {
  bl_hound: { kind: 'hound', code: 'HOUND / 01', color: '#ff657e', scan: '连段猎杀机体 · 裂齿驱动', hint: '追猎连段 / 留意突进与深蓄', lines: ['椰汁城的夜路，最后一段归我。', '别数齿轮。数你还剩几次呼吸。', '猎杀链已闭合。下一口，不留回声。'] },
  bl_hive: { kind: 'hive', code: 'OVARY / 02', color: '#a3f48f', scan: '生化卵巢机体 · 增殖母床', hint: '卵会孵化 / 巢穴持续增殖', lines: ['椰汁城只卖冷饮。我卖下一代。', '听，管线里的孩子醒了。', '欢迎加入温床，外来者。'] },
  bl_warden: { kind: 'warden', code: 'REACTOR / 03', color: '#ffd07d', scan: '重装反应堆 · 装甲分层扫描', hint: '装甲充能 / 反应堆裸露时机', lines: ['这座城欠的电费，拿你的热量还。', '反应堆升压。请站稳，别碎得太散。', '装甲只是门。里面才是熔炉。'] },
  bl_lance: { kind: 'lance', code: 'RAIL / 04', color: '#7eeaff', scan: '轨道炮机体 · 高压线圈', hint: '轨道炮锁线 / 磁钩回收', lines: ['椰汁城的天际线，今晚少一道影子。', '坐标已写进炮膛。别替我省电。', '收好这束光。没有返程票。'] },
  bl_mine: { kind: 'mine', code: 'MAGNET / 05', color: '#f9b263', scan: '磁网编织机体 · 连锁起爆', hint: '磁雷延迟 / 连锁与遥爆', lines: ['街灯不是星星，是我埋好的引信。', '磁网正在收口。每一步都有回执。', '整条街，给我亮。'] },
  bl_mirror: { kind: 'mirror', code: 'MIRROR / 06', color: '#d5b1ff', scan: '可破坏镜阵 · 折射束增密', hint: '击碎镜面可减少反射密度', lines: ['椰汁城有一千面镜子，没有一张真脸。', '错误回声：你很安全。——这句也是我说的。', '看见了吗？每个倒影都在瞄准你。'] },
  bh_eye: { kind: 'eye', code: 'RETINA / 07', color: '#ff6c9a', scan: '神经灼照核心 · 视神经穿透', hint: '神经灼照 / 防护与续航承压', lines: ['别躲。椰汁城的霓虹早就住进你眼底。', '我没在看你的位置。我在读取你的痛觉。', '瞳孔过曝。椰汁城，闭眼。'] },
  bh_hive: { kind: 'mother', code: 'ROOT / 08', color: '#9ee1b0', scan: '递归母巢 · 根节点网络', hint: '中继、裂隙与巢穴连接根节点', lines: ['你关掉一盏灯，我就长出一条街。', '子节点，接管这具还在发热的终端。', '根目录里，没有你的出口。'] },
  bh_phase: { kind: 'phase', code: 'RIFT / 09', color: '#bba9ff', scan: '三相时间机体 · 裂隙校准', hint: '实体重刃 → 时间回声 → 裂隙降临', lines: ['椰汁城的明天已被我拆成三份。', '别急着眨眼。下一秒不一定属于你。', '时间断层。请把这一刻，当作遗言。'] }
};

// Functions below are serialized into the existing game IIFE, not executed by Node.
function bossStageProfile(e) {
  return BOSS_STAGE_PROFILES[e && e.id] || { kind: 'unknown', code: 'HOSTILE', color: '#ff657e', scan: '敌对机体扫描', hint: '注意机体蓄力', lines: ['敌方通道已接入。', '机体正在蓄力。', '高能协议已释放。'] };
}
function bossStageDOM() {
  if (BOSS_STAGE.dom) return BOSS_STAGE.dom;
  var app = $('#app'), notice = $('#bossnotice'), readout = $('#bossreadout'), invasion = $('#bossinvasion');
  if (!app || !notice || !readout || !invasion) return null;
  BOSS_STAGE.dom = { app: app, notice: notice, readout: readout, invasion: invasion, banner: $('#bossbanner'),
    source: $('#bossnotice-source'), title: $('#bossnotice-title'), quote: $('#bossnotice-quote'),
    status: $('#bossreadout-status'), label: $('#bossreadout-label'), track: $('#bossreadout-track'), fill: $('#bossreadout-fill') };
  return BOSS_STAGE.dom;
}
function bossStageText(el, value) {
  if (el && el.textContent !== String(value)) el.textContent = String(value);
}
function bossStageAttr(el, key, value) {
  if (!el) return;
  if (value == null) { if (el.hasAttribute(key)) el.removeAttribute(key); }
  else if (el.getAttribute(key) !== String(value)) el.setAttribute(key, String(value));
}
function bossStageValid(e) {
  return !!(e && e.boss && e.hp > 0 && p && G.state === 'play' && G.enemies.indexOf(e) >= 0);
}
function bossStageBound() {
  var s = BOSS_STAGE;
  return bossStageValid(s.owner) && s.owner.uid === s.ownerUid && s.map === G.map && s.mode === G.mode && s.runId === G.runId;
}
function bossStageClear() {
  var s = BOSS_STAGE, d = s.dom;
  if (s.animation) { s.animation.cancel(); s.animation = null; }
  if (d) {
    bossStageAttr(d.app, 'data-boss-stage', null); bossStageAttr(d.app, 'data-boss-intrusion', null);
    bossStageAttr(d.app, 'data-boss-impact', null); bossStageAttr(d.app, 'data-boss-muted', null);
    bossStageAttr(d.app, 'data-boss-owner', null);
    bossStageAttr(d.notice, 'hidden', ''); bossStageAttr(d.readout, 'hidden', ''); bossStageAttr(d.invasion, 'hidden', '');
    if (d.banner) d.banner.classList.remove('show');
    bossStageText(d.source, ''); bossStageText(d.title, ''); bossStageText(d.quote, '');
  }
  s.owner = null; s.ownerUid = null; s.map = null; s.mode = null; s.runId = null; s.profile = null;
  s.intent = null; s.notice = null; s.effect = null; s.bannerUntil = 0;
  s.detailKey = ''; s.detail = ''; s.lastForm = null; s.lastPlate = null; s.lastEventTurn = null;
}
function bossStageBind(e) {
  if (!bossStageValid(e)) return false;
  var s = BOSS_STAGE;
  if (s.owner === e && bossStageBound()) return true;
  bossStageClear();
  s.owner = e; s.ownerUid = e.uid; s.map = G.map; s.mode = G.mode; s.runId = G.runId; s.profile = bossStageProfile(e);
  var d = bossStageDOM();
  if (d) {
    d.app.style.setProperty('--boss-stage-color', s.profile.color);
    bossStageAttr(d.app, 'data-boss-owner', String(e.uid));
  }
  return true;
}
function bossStageNotice(e, type, title, quote, duration, delay) {
  if (!bossStageBind(e)) return;
  var s = BOSS_STAGE, now = performance.now();
  s.notice = { type: type, title: title, quote: quote, from: now + (delay || 0), until: now + (delay || 0) + (duration || 2800) };
}
function bossStageEvent(e, kind, label) {
  if (!bossStageValid(e) || !bossStageBind(e)) return;
  var s = BOSS_STAGE, now = performance.now(), pf = s.profile;
  if (kind === 'pulse') {
    bossStageNotice(e, kind, label || '敌方神经脉冲', e.id === 'bh_eye' ? '走位不能规避这次神经灼照；护盾与防护仍可承受压力。' : pf.lines[2], 2600);
    // Pulse is a local ring + readable hostile notice, never a full-screen flash.
    s.effect = { kind: kind, born: now, until: now + 600 };
  } else if (kind === 'mirror') {
    bossStageNotice(e, kind, '镜阵回声 / 敌方伪信号', pf.lines[2] + ' 镜面可击碎。', 2400);
    s.effect = { kind: kind, born: now, until: now + 620 };
  } else if (kind === 'annihilate' || kind === 'rail') {
    bossStageNotice(e, kind, (label || '高能协议') + ' / 已释放', pf.lines[2], 2800);
    s.effect = { kind: kind, born: now, until: now + (kind === 'annihilate' ? 720 : 520) };
  } else if (kind === 'overclock') {
    bossStageNotice(e, kind, '协议升级 / 机体超频', pf.lines[1], 3000);
    s.effect = { kind: kind, born: now, until: now + 1000 };
  }
  s.lastEventTurn = G.turn;
}
function bossStageDetail(e) {
  var b = e.brain || {}, pf = BOSS_STAGE.profile, owned = G.enemies.filter(function (m) { return m.hp > 0 && m.ownerId === e.uid; });
  function count(kind) { return owned.filter(function (m) { return m.structure === kind; }).length; }
  if (pf.kind === 'hound') return e.enraged ? '狂猎连段 / 双重咬合在线' : '连段猎杀 / ' + (b.stance || '追猎');
  if (pf.kind === 'hive') return '卵 ' + count('egg') + ' / 巢穴 ' + count('nest') + ' · 增殖在线';
  if (pf.kind === 'warden') return b.plate > 0 ? '装甲层 ' + Math.round(b.plate) + '% / 反应堆充能' : '装甲剥离 / 反应堆裸露';
  if (pf.kind === 'lance') return '轨道线圈 / ' + (b.stance || '锁线待命');
  if (pf.kind === 'mine') return '磁网 / ' + (G.hazards || []).filter(function (h) { return h.ownerId === e.uid && h.kind === 'mine'; }).length + ' 处磁雷信号';
  if (pf.kind === 'mirror') return '镜阵 ' + count('mirror') + ' 面 / 击碎镜面可降束';
  if (pf.kind === 'eye') return '神经灼照 / 非走位规避 · HUD信号受侵蚀';
  if (pf.kind === 'mother') return '根节点网络 / ' + owned.filter(function (m) { return !!m.structure; }).length + ' 构造节点 · ' + owned.filter(function (m) { return !m.structure; }).length + ' 衍生体';
  if (pf.kind === 'phase') return '三相机体 / ' + ['I 实体重刃', 'II 时间回声', 'III 裂隙降临'][b.form == null ? (e.hp > e.maxHp * .66 ? 0 : e.hp > e.maxHp * .33 ? 1 : 2) : b.form];
  return pf.hint;
}
function bossStageSync(now) {
  var s = BOSS_STAGE;
  if (G.state !== 'play' || !p) { if (s.owner) bossStageClear(); return; }
  if (!bossStageBound()) {
    if (s.owner) bossStageClear();
    var fresh = G.enemies.find(function (e) { return e.boss && e.hp > 0; });
    if (!fresh) return;
    showBossBanner(fresh.name, fresh.spec && fresh.spec.intro || '');
  }
  var e = s.owner, d = bossStageDOM();
  if (!e || !d) return;
  var muted = !!(G.modal || G.paused), pf = s.profile;
  if ((muted || VFX.reduced) && s.animation) { s.animation.cancel(); s.animation = null; }
  bossStageAttr(d.app, 'data-boss-muted', muted ? 'true' : null);
  bossStageAttr(d.app, 'data-boss-stage', pf.kind);
  bossStageAttr(d.app, 'data-boss-intrusion', !muted && (pf.kind === 'eye' || pf.kind === 'mirror') ? pf.kind : null);
  bossStageAttr(d.invasion, 'hidden', muted ? '' : null);
  // Charge is game-turn progress, not a fictitious real-time countdown.
  var a = e.intent;
  if (a && a !== s.intent) {
    s.intent = a;
    bossStageNotice(e, 'charge', '蓄力警报 / ' + a.label, pf.lines[1], 3200);
  } else if (!a) s.intent = null;
  var b = e.brain || {}, key = [G.turn, G.enemies.length, (G.hazards || []).length, b.plate, b.form, b.stance, e.enraged].join('|');
  if (key !== s.detailKey) {
    s.detailKey = key; s.detail = bossStageDetail(e);
    if (pf.kind === 'phase' && b.form != null && s.lastForm != null && b.form !== s.lastForm) {
      bossStageNotice(e, 'phase', s.detail, pf.lines[1], 3000);
      s.effect = { kind: 'overclock', born: now, until: now + 900 };
    }
    if (pf.kind === 'warden' && s.lastPlate > 0 && b.plate <= 0) bossStageNotice(e, 'reactor', '装甲剥离 / 反应堆裸露', '门开了。别把熔炉认成出口。', 2400);
    s.lastForm = b.form; s.lastPlate = b.plate;
  }
  bossStageText(d.status, pf.code + ' · ' + e.name);
  bossStageText(d.label, a ? '蓄力警报 · ' + a.label + ' / 剩余 ' + a.turns + ' 回合' : s.detail);
  bossStageAttr(d.readout, 'data-charge', a ? 'true' : null);
  bossStageAttr(d.readout, 'hidden', muted ? '' : null);
  bossStageAttr(d.track, 'hidden', a ? null : '');
  if (a) {
    var total = Math.max(1, a.total || a.turns || 1), progress = Math.max(0, Math.min(1, 1 - a.turns / total));
    var transform = 'scaleX(' + Math.max(.025, progress).toFixed(3) + ')';
    if (d.fill.style.transform !== transform) d.fill.style.transform = transform;
    bossStageAttr(d.track, 'aria-valuemax', total); bossStageAttr(d.track, 'aria-valuenow', Math.max(0, total - a.turns));
    bossStageAttr(d.track, 'aria-valuetext', a.label + '，剩余 ' + a.turns + ' 回合');
  }
  var bannerOn = now < s.bannerUntil && !muted;
  if (d.banner && d.banner.classList.contains('show') !== bannerOn) d.banner.classList.toggle('show', bannerOn);
  var n = s.notice, noticeOn = n && now >= n.from && now < n.until && !muted && !bannerOn;
  if (noticeOn) {
    bossStageText(d.source, '敌方入侵 · ' + e.name + ' / #' + s.ownerUid);
    bossStageText(d.title, n.title); bossStageText(d.quote, '「' + n.quote + '」');
    bossStageAttr(d.notice, 'data-kind', n.type);
  }
  bossStageAttr(d.notice, 'hidden', noticeOn ? null : '');
  var impact = !muted && !VFX.reduced && s.effect && s.effect.kind === 'annihilate' && now < s.effect.until;
  bossStageAttr(d.app, 'data-boss-impact', impact ? 'annihilate' : null);
  if (s.effect && now >= s.effect.until) s.effect = null;
}
function showBossBanner(name, intro, kicker) {
  var e = G.enemies.find(function (m) { return m.boss && m.hp > 0 && m.name === name; }) || G.enemies.find(function (m) { return m.boss && m.hp > 0; });
  if (!e || !bossStageBind(e)) return;
  var s = BOSS_STAGE, d = bossStageDOM(), bb = d && d.banner, now = performance.now(), upgrade = kicker === 'OVERCLOCK';
  if (!bb) return;
  bossStageText($('#bbname'), name || e.name);
  bossStageText($('#bbk'), (upgrade ? '协议超频' : '敌对机体扫描') + ' // ' + s.profile.code);
  bossStageText($('#bbintro'), s.profile.scan + (intro ? ' · ' + intro : ''));
  s.bannerUntil = now + (upgrade ? 1500 : 2300);
  s.effect = { kind: upgrade ? 'overclock' : 'entry', born: now, until: now + 1300 };
  bossStageNotice(e, upgrade ? 'overclock' : 'entry', upgrade ? '敌方协议升级' : '椰汁城 / 敌方通道接入', s.profile.lines[upgrade ? 1 : 0], 3100, upgrade ? 1550 : 2350);
  if (s.animation) s.animation.cancel();
  bb.classList.add('show');
  // WAAPI restarts the one-shot without reading offsetWidth or forcing layout.
  s.animation = !VFX.reduced && typeof bb.animate === 'function' ? bb.animate([
    { opacity: 0, transform: 'translateX(-12px) skewX(-5deg)' },
    { opacity: 1, transform: 'translateX(0) skewX(0)', offset: .18 },
    { opacity: 1, transform: 'translateX(0)' }
  ], { duration: 420, easing: 'cubic-bezier(.16,.8,.24,1)' }) : null;
}
function bossStageDraw(now, w, h, view) {
  if (!bossStageBound() || G.modal || G.paused || !view) return;
  var s = BOSS_STAGE, e = s.owner, pf = s.profile, effect = s.effect && now < s.effect.until ? s.effect : null, a = e.intent;
  var visible = view.on(e.x, e.y) && G.vis[e.y] && G.vis[e.y][e.x];
  if (visible && (a || effect)) {
    var x = view.sx(e.x), y = view.sy(e.y), r = view.tile * 1.25;
    var motion = VFX.reduced ? 0 : now * .00055, charge = a ? Math.max(0, 1 - a.turns / (a.total || a.turns || 1)) : 0;
    ctx.save(); ctx.strokeStyle = pf.color; ctx.lineWidth = 1.4; ctx.globalAlpha = VFX.reduced ? .7 : .66 + charge * .2;
    if (pf.kind === 'hound') {
      for (var c = 0; c < 3; c++) { ctx.beginPath(); ctx.arc(x, y, r + c * 4, -.9 + c * .3, .65 + c * .3); ctx.stroke(); }
    } else if (pf.kind === 'hive' || pf.kind === 'mother') {
      var count = pf.kind === 'mother' ? 6 : 4;
      for (var n = 0; n < count; n++) { var na = n * TAU / count + motion, nx = x + Math.cos(na) * r, ny = y + Math.sin(na) * r;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(na) * r * .6, y + Math.sin(na) * r * .6); ctx.lineTo(nx, ny); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(nx, ny, 3, 5, na, 0, TAU); ctx.stroke(); }
    } else if (pf.kind === 'warden') {
      ctx.beginPath(); ctx.arc(x, y, r * .6, 0, TAU); ctx.stroke();
      for (var q = -1; q <= 1; q += 2) { ctx.beginPath(); ctx.moveTo(x + q * r * .6, y - r); ctx.lineTo(x + q * r, y - r); ctx.lineTo(x + q * r, y + r); ctx.lineTo(x + q * r * .6, y + r); ctx.stroke(); }
    } else if (pf.kind === 'lance') {
      var tx = a && a.tx != null ? a.tx : p.x, ty = a && a.ty != null ? a.ty : p.y, angle = Math.atan2(ty - e.y, tx - e.x);
      ctx.translate(x, y); ctx.rotate(angle);
      for (var l = -1; l <= 1; l += 2) { ctx.beginPath(); ctx.moveTo(-r * .7, l * r * .5); ctx.lineTo(r * 1.8, l * r * .5); ctx.lineTo(r * 2, l * r * .25); ctx.stroke(); }
    } else if (pf.kind === 'mine') {
      for (var ring = 0; ring < 2; ring++) { visualPolygon(x, y, r * (1 + ring * .3), 6, motion); ctx.stroke(); }
    } else if (pf.kind === 'mirror') {
      for (var m = -1; m <= 1; m++) { visualPolygon(x + m * r, y + Math.abs(m) * r * .3, r * .45, 4, motion * .3); ctx.stroke(); }
    } else if (pf.kind === 'eye') {
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.4, r * .65, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r * (.35 + charge * .35), 0, TAU); ctx.stroke();
      for (var i = 0; i < 8; i++) { var ia = i * TAU / 8; ctx.beginPath(); ctx.moveTo(x + Math.cos(ia) * r * 1.45, y + Math.sin(ia) * r * .85); ctx.lineTo(x + Math.cos(ia) * r * 1.65, y + Math.sin(ia) * r); ctx.stroke(); }
    } else {
      for (var f = 0; f < 3; f++) { ctx.beginPath(); ctx.arc(x + (f - 1) * 5, y, r * (1 + f * .12), motion + f * 2, motion + f * 2 + 1.35); ctx.stroke(); }
    }
    ctx.restore();
  }
  if (!effect || VFX.reduced) return; // Reduced motion retains turn meter/quote/static charge glyph.
  var age = Math.max(0, Math.min(1, (now - effect.born) / (effect.until - effect.born)));
  ctx.save();
  if (effect.kind === 'entry' || effect.kind === 'overclock') {
    ctx.strokeStyle = hexA(pf.color, (1 - age) * .55); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, h * age); ctx.lineTo(w, h * age); ctx.stroke();
    ctx.strokeRect(5.5, 5.5, w - 11, h - 11);
  } else if (effect.kind === 'annihilate') {
    var fade = 1 - age, split = Math.sin(Math.PI * age) * 7;
    ctx.lineWidth = 2; ctx.strokeStyle = hexA('#ff365c', fade * .72); ctx.strokeRect(4 + split, 5, w - 10 - split, h - 11);
    ctx.strokeStyle = hexA('#7eeaff', fade * .55); ctx.strokeRect(5 - split, 8, w - 10, h - 16);
    ctx.fillStyle = hexA(pf.color, fade * .045); ctx.fillRect(0, 0, w, h);
    for (var band = 0; band < 3; band++) { var by = (age * h + band * h / 3) % h;
      ctx.fillStyle = hexA(pf.color, fade * .22); ctx.fillRect(0, by, w * (.2 + band * .1), 1.5); ctx.fillRect(w * .65, by + 6, w * .35, 1); }
  } else if ((effect.kind === 'pulse' || effect.kind === 'mirror' || effect.kind === 'rail') && visible) {
    ctx.strokeStyle = hexA(pf.color, (1 - age) * .65); ctx.lineWidth = 1.5;
    if (effect.kind === 'mirror') { visualPolygon(view.sx(e.x), view.sy(e.y), view.tile * (1 + age * 2), 4, Math.PI / 4); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(view.sx(e.x), view.sy(e.y), view.tile * (1 + age * 2.5), 0, TAU); ctx.stroke(); }
  }
  ctx.restore();
}
function bossStageSnapshot() {
  var s = BOSS_STAGE;
  return { active: bossStageBound(), ownerUid: s.ownerUid, mode: s.mode, runId: s.runId,
    kind: s.profile && s.profile.kind, intent: s.intent && s.intent.kind,
    notice: s.notice ? { title: s.notice.title, type: s.notice.type, quote: s.notice.quote } : null,
    effect: s.effect && s.effect.kind };
}

const CSS = `
/* CHROME_BOSS_STAGE_V1: hostile GAME UI only, never a platform notification. */
#bossnotice,#bossreadout,#bossinvasion,#bossnotice *,#bossreadout *,#bossinvasion *{pointer-events:none!important}
#bossnotice[hidden],#bossreadout[hidden],#bossinvasion[hidden]{display:none!important}
#bossnotice{position:absolute;left:9px;right:9px;top:46px;z-index:7;padding:8px 11px 8px 14px;color:#f4e9ef;background:linear-gradient(110deg,rgba(37,12,27,.96),rgba(7,14,24,.95));border:1px solid var(--boss-stage-color,#ff657e);border-left-width:4px;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,8px 100%,0 calc(100% - 8px));box-shadow:0 5px 18px #02070b;contain:layout style;max-width:440px;margin:0 auto}
#bossnotice::after{content:'';position:absolute;right:5px;top:5px;width:5px;height:5px;background:var(--boss-stage-color,#ff657e)}
#bossnotice .bn-scope{font-size:7px;letter-spacing:.12em;color:#a8becb;line-height:1.5}
#bossnotice-source{font-size:9px;font-weight:700;color:var(--boss-stage-color,#ff657e);line-height:1.5;overflow-wrap:anywhere}
#bossnotice-title{font-size:11px;font-weight:700;line-height:1.5;color:#fff}
#bossnotice-quote{font-size:10px;line-height:1.55;color:#e6cfd8;overflow-wrap:anywhere}
#bossnotice[data-kind='mirror']{background:linear-gradient(120deg,#22142c,#091926 54%,#2c1c38)}
#bossnotice[data-kind='mirror'] #bossnotice-title{text-shadow:2px 0 #704f96,-1px 0 #287585}
#bossnotice[data-kind='annihilate']{border-top-width:3px;background:linear-gradient(100deg,#3a1022,#130f20)}
#bossreadout{position:absolute;left:8px;right:78px;bottom:78px;z-index:5;max-width:360px;padding:5px 7px;background:rgba(4,9,17,.88);border-left:2px solid var(--boss-stage-color,#ff657e);color:#e7eff5;contain:layout style}
#bossreadout-status{font-size:7px;letter-spacing:.08em;color:var(--boss-stage-color,#ff657e);line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#bossreadout-label{font-size:9px;line-height:1.5;overflow-wrap:anywhere}
#bossreadout[data-charge='true']{background:rgba(35,10,22,.94);border-left-width:3px}
#bossreadout-track{height:3px;background:#3a2936;margin-top:4px;overflow:hidden}
#bossreadout-track[hidden]{display:none}
#bossreadout-fill{display:block;height:100%;width:100%;transform-origin:left center;background:var(--boss-stage-color,#ff657e)}
#bossinvasion{position:absolute;inset:0;z-index:3;overflow:hidden;border:1px solid transparent}
#app[data-boss-intrusion='eye'] .hud{border-color:#b25071;box-shadow:inset 0 -2px 0 #77304c,inset 2px 0 0 #77304c}
#app[data-boss-intrusion='eye'] .abtn{border-color:#ac5b7e;background:repeating-linear-gradient(120deg,transparent 0 8px,rgba(248,87,140,.085) 8px 10px),linear-gradient(135deg,#172430,#0a111a)}
#app[data-boss-intrusion='eye'] #bossinvasion{border-color:rgba(243,87,138,.45);box-shadow:inset 0 0 28px rgba(205,40,89,.10)}
#app[data-boss-intrusion='eye'] #bossinvasion::before{content:'';position:absolute;left:0;top:24%;bottom:24%;width:4px;background:repeating-linear-gradient(0deg,#de547f 0 2px,transparent 2px 9px)}
#app[data-boss-intrusion='mirror'] .hud{border-left-color:#b899e8;border-right-color:#68c8da}
#app[data-boss-intrusion='mirror'] #bossinvasion::before,#app[data-boss-intrusion='mirror'] #bossinvasion::after{content:'';position:absolute;top:12%;bottom:12%;width:20px;opacity:.18;transform:skewY(-24deg);background:linear-gradient(90deg,transparent,#d6bcff,transparent)}
#app[data-boss-intrusion='mirror'] #bossinvasion::before{left:0}#app[data-boss-intrusion='mirror'] #bossinvasion::after{right:0;transform:skewY(24deg)}
#app[data-boss-impact='annihilate'] #game{animation:bossStageLens .62s ease-out 1}
@keyframes bossStageLens{0%{filter:saturate(1.8) contrast(1.14)}30%{filter:saturate(1.35) contrast(1.06)}100%{filter:none}}
#app[data-boss-stage] .bossbanner{top:27%;padding:14px 10px;background:linear-gradient(105deg,rgba(6,14,22,.96),rgba(24,12,27,.94));border-color:var(--boss-stage-color,#ff657e);clip-path:polygon(0 0,calc(100% - 20px) 0,100% 20px,100% 100%,20px 100%,0 calc(100% - 20px));box-shadow:0 8px 24px rgba(0,0,0,.55)}
#app[data-boss-stage] .bossbanner.show{animation:none;opacity:1;transform:none}
#app[data-boss-stage] .bb-k{font-size:9px;letter-spacing:.14em;color:var(--boss-stage-color,#ff657e)}
#app[data-boss-stage] .bb-name{font-size:clamp(22px,7vw,34px);animation:none;text-shadow:2px 0 rgba(255,77,94,.8),-2px 0 rgba(0,240,255,.6)}
#app[data-boss-stage] .bb-intro{font-size:10px;letter-spacing:.05em;line-height:1.6;max-width:95%;margin:5px auto 0;color:#d5dfe6}
#app[data-boss-stage] .bossbanner::after{animation:none;box-shadow:none;background:linear-gradient(90deg,transparent,var(--boss-stage-color,#ff657e),transparent)}
#app[data-boss-muted='true'] .bossbanner{opacity:0!important}
@media(max-height:760px){#bossreadout{bottom:64px;padding:4px 6px}#bossnotice{top:40px;padding:6px 9px 6px 12px}#bossnotice-quote{font-size:9px}#bossnotice-title{font-size:10px}}
@media(prefers-reduced-motion:reduce){#app[data-boss-stage] .bossbanner,#app[data-boss-stage] .bb-name,#app[data-boss-stage] .bossbanner::after,#app[data-boss-impact] #game{animation:none!important;transform:none!important;filter:none!important}#app[data-boss-stage] .bb-name{text-shadow:none}#bossinvasion::before,#bossinvasion::after{transform:none!important}#app[data-boss-stage] .bossbanner.show{opacity:1!important}}
`;
const HTML = `
    <!-- CHROME_BOSS_STAGE_V1: fictional enemy channel; no system UI or permissions. -->
    <div id="bossinvasion" aria-hidden="true" hidden></div>
    <aside id="bossnotice" role="status" aria-live="polite" aria-atomic="true" hidden>
      <div class="bn-scope">游戏内敌方通道 / HOSTILE SIGNAL · 非系统通知</div>
      <div id="bossnotice-source"></div><div id="bossnotice-title"></div><div id="bossnotice-quote"></div>
    </aside>
    <div id="bossreadout" aria-live="off" hidden>
      <div id="bossreadout-status"></div><div id="bossreadout-label"></div>
      <div id="bossreadout-track" role="progressbar" aria-label="敌方蓄力回合进度" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0" hidden><i id="bossreadout-fill"></i></div>
    </div>`;
const helpers = [bossStageProfile, bossStageDOM, bossStageText, bossStageAttr, bossStageValid, bossStageBound, bossStageClear, bossStageBind, bossStageNotice, bossStageEvent, bossStageDetail, bossStageSync, bossStageDraw, bossStageSnapshot];
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  Object.keys(node).forEach(function (key) {
    const value = node[key];
    if (Array.isArray(value)) value.forEach(function (child) { if (child && typeof child.type === 'string') walk(child, visit); });
    else if (value && typeof value.type === 'string') walk(value, visit);
  });
}
function propertyName(prop) { return prop && prop.key && (prop.key.type === 'Identifier' ? prop.key.name : prop.key.value); }
function uniqueLiteral(source, text, label) {
  const i = source.indexOf(text);
  if (i < 0 || source.indexOf(text, i + 1) >= 0) throw new Error(label + ': expected one exact local literal; refusing broad overwrite');
  return i;
}
function patchSource(source) {
  if (source.includes(MARKER)) throw new Error('Boss stage patch already applied or marker conflict');
  const ast = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'script' }), declarations = new Map(), exports = [];
  walk(ast, function (node) {
    if (node.type === 'FunctionDeclaration' && node.id) { const list = declarations.get(node.id.name) || []; list.push(node); declarations.set(node.id.name, list); }
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && !node.left.computed && node.left.object.type === 'Identifier' && node.left.object.name === 'window' && node.left.property.name === '__neon') exports.push(node.right);
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && ['BOSS_STAGE', 'BOSS_STAGE_PROFILES'].includes(node.id.name)) throw new Error('Boss stage state variable conflict: ' + node.id.name);
  });
  function uniqueFunction(name) {
    const nodes = declarations.get(name) || [];
    if (nodes.length !== 1) throw new Error('Expected exactly one ' + name + ', found ' + nodes.length);
    return nodes[0];
  }
  helpers.forEach(function (fn) { if (declarations.has(fn.name)) throw new Error('Helper name conflict: ' + fn.name); });
  const edits = [], banner = uniqueFunction('showBossBanner');
  const state = '/* ' + MARKER + ': ephemeral presentation only. */\nvar BOSS_STAGE = { dom: null, owner: null, ownerUid: null, map: null, mode: null, runId: null, bannerUntil: 0, effect: null, notice: null, intent: null, animation: null, detailKey: \'\' };\nvar BOSS_STAGE_PROFILES = ' + JSON.stringify(PROFILES) + ';\n';
  edits.push({ start: banner.start, end: banner.end, text: state + helpers.map(function (f) { return f.toString(); }).join('\n') + '\n' + showBossBanner.toString(), label: 'showBossBanner + isolated presentation helpers' });
  function local(name, before, after) {
    const fn = uniqueFunction(name), body = source.slice(fn.start, fn.end), at = uniqueLiteral(body, before, name);
    edits.push({ start: fn.start + at, end: fn.start + at + before.length, text: after, label: name + ' presentation hook only' });
  }
  local('frame', 'VFX.drawAt=now;', 'VFX.drawAt=now;bossStageSync(now);');
  local('draw', 'ctx.globalAlpha=1;ctx.restore();drawMinimap(w);', 'ctx.globalAlpha=1;ctx.restore();drawMinimap(w);bossStageDraw(now,w,h,view);');
  local('cyberPulse', 'e.pulseFx=performance.now();e.brain.stance=label;', "e.pulseFx=performance.now();e.brain.stance=label;if(e.boss)bossStageEvent(e,'pulse',label);");
  local('tacticResolve', "}else if(a.kind==='annihilate'){", "}else if(a.kind==='annihilate'){\n    if(e.boss)bossStageEvent(e,'annihilate',a.label);");
  local('tacticResolve', "}else if(a.kind==='rail'){", "}else if(a.kind==='rail'){\n    if(e.boss)bossStageEvent(e,'rail',a.label);");
  local('cyberLaser', "cyberImpact(e,ray.cells,power,'rail',.5);return ray;", "cyberImpact(e,ray.cells,power,'rail',.5);if(e.boss&&e.id==='bl_mirror'&&mirrors&&mirrors.length)bossStageEvent(e,'mirror','折射增密');return ray;");
  if (exports.length !== 1 || exports[0].type !== 'ObjectExpression') throw new Error('Expected one window.__neon object');
  const tests = exports[0].properties.filter(function (prop) { return propertyName(prop) === 'test'; });
  if (tests.length !== 1 || tests[0].value.type !== 'ObjectExpression') throw new Error('Expected unique __neon.test object');
  const test = tests[0].value;
  if (test.properties.some(function (prop) { return propertyName(prop) === 'bossStage'; })) throw new Error('__neon.test.bossStage conflict');
  const tail = test.properties[test.properties.length - 1], comma = tail && source.slice(tail.end, test.end - 1).includes(',');
  edits.push({ start: test.end - 1, end: test.end - 1, text: (tail && !comma ? ', ' : '') + 'bossStage: { sync: bossStageSync, event: bossStageEvent, clear: bossStageClear, snapshot: bossStageSnapshot, banner: showBossBanner, profile: bossStageProfile } ', label: 'test-only bossStage presentation API' });
  edits.sort(function (a, b) { return a.start - b.start; });
  for (let i = 1; i < edits.length; i++) if (edits[i].start < edits[i - 1].end) throw new Error('Overlapping edits');
  let output = source;
  edits.slice().reverse().forEach(function (edit) { output = output.slice(0, edit.start) + edit.text + output.slice(edit.end); });
  const post = acorn.parse(output, { ecmaVersion: 'latest', sourceType: 'script' }), counts = new Map(), untouched = new Map();
  walk(post, function (node) { if (node.type === 'FunctionDeclaration' && node.id) { counts.set(node.id.name, (counts.get(node.id.name) || 0) + 1); untouched.set(node.id.name, node); } });
  helpers.concat([showBossBanner]).forEach(function (fn) { if (counts.get(fn.name) !== 1) throw new Error('Postflight missing/duplicate helper: ' + fn.name); });
  ['bossAct', 'playerHit', 'useCyberActive', 'playerAttack', 'hurtPlayer', 'tacticQueue', 'endTurn', 'killEnemy', 'cyberImpact'].forEach(function (name) {
    const old = uniqueFunction(name), next = untouched.get(name);
    if (!next || counts.get(name) !== 1 || source.slice(old.start, old.end) !== output.slice(next.start, next.end)) throw new Error('Protected mechanic changed: ' + name);
  });
  return { source: output, changes: edits.map(function (edit) { return { label: edit.label, start: edit.start, end: edit.end }; }) };
}
function patchHtml(source) {
  if (source.includes(MARKER) || /id=["']boss(?:notice|readout|invasion)["']/.test(source)) throw new Error('Boss stage HTML already applied or IDs conflict');
  const styleAt = uniqueLiteral(source, '</style>', 'inline CSS end'), canvas = '    <canvas id="game"></canvas>';
  uniqueLiteral(source, canvas, 'stage canvas');
  const withStyle = source.slice(0, styleAt) + CSS + source.slice(styleAt);
  const at = uniqueLiteral(withStyle, canvas, 'stage canvas after CSS');
  return { source: withStyle.slice(0, at + canvas.length) + HTML + withStyle.slice(at + canvas.length), changes: ['append isolated inline boss CSS', 'append three pointer-transparent stage overlays'] };
}
function selfTest() {
  const vm = require('vm');
  let writes = 0, clock = 100, animations = 0;
  const nodes = {};
  function element() {
    const attrs = {}, classes = new Set(); let text = '';
    const style = new Proxy({ setProperty: function (key, value) { this[key] = value; } }, { set: function (target, key, value) { writes++; target[key] = value; return true; } });
    return { style: style,
      get textContent() { return text; }, set textContent(value) { writes++; text = value; },
      getAttribute: function (key) { return Object.prototype.hasOwnProperty.call(attrs, key) ? attrs[key] : null; },
      hasAttribute: function (key) { return Object.prototype.hasOwnProperty.call(attrs, key); },
      setAttribute: function (key, value) { writes++; attrs[key] = String(value); },
      removeAttribute: function (key) { writes++; delete attrs[key]; },
      classList: { contains: function (key) { return classes.has(key); }, add: function (key) { writes++; classes.add(key); }, remove: function (key) { writes++; classes.delete(key); }, toggle: function (key, on) { writes++; if (on) classes.add(key); else classes.delete(key); } },
      animate: function () { animations++; return { cancel: function () {} }; }
    };
  }
  ['app', 'bossnotice', 'bossreadout', 'bossinvasion', 'bossbanner', 'bossnotice-source', 'bossnotice-title', 'bossnotice-quote', 'bossreadout-status', 'bossreadout-label', 'bossreadout-track', 'bossreadout-fill', 'bbname', 'bbk', 'bbintro'].forEach(function (id) { nodes['#' + id] = element(); });
  const G = { state: 'play', mode: 'train', runId: 1, turn: 0, map: [], enemies: [], hazards: [], vis: [[1]], modal: null, paused: false };
  const sandbox = { G: G, p: { x: 0, y: 0, hp: 100 }, performance: { now: function () { return clock; } }, VFX: { reduced: false }, $: function (id) { return nodes[id]; }, TAU: Math.PI * 2,
    ctx: new Proxy({}, { get: function (_, key) { return function () {}; }, set: function () { return true; } }), visualPolygon: function () {}, hexA: function () { return '#ffffff'; } };
  vm.createContext(sandbox);
  vm.runInContext('var BOSS_STAGE = { dom: null, owner: null }; var BOSS_STAGE_PROFILES = ' + JSON.stringify(PROFILES) + ';\n' + helpers.map(function (fn) { return fn.toString(); }).join('\n') + '\n' + showBossBanner.toString(), sandbox);
  function assert(ok, label) { if (!ok) throw new Error('Boss stage self-test: ' + label); }
  function make(id, uid) { return { id: id, uid: uid, name: id, boss: true, hp: 100, maxHp: 100, x: 0, y: 0, spec: {}, brain: { plate: 100, form: 0 }, intent: null }; }
  const results = [], view = { tile: 24, sx: function () { return 20; }, sy: function () { return 20; }, on: function () { return true; } };
  Object.keys(PROFILES).forEach(function (id, i) {
    const boss = make(id, i + 1); G.enemies = [boss]; G.map = []; G.turn++;
    sandbox.bossStageSync(clock);
    assert(sandbox.bossStageSnapshot().kind === PROFILES[id].kind, 'nine dossiers / ' + id);
    const before = JSON.stringify(G);
    sandbox.bossStageEvent(boss, 'annihilate', 'test'); sandbox.bossStageSync(clock); sandbox.bossStageDraw(clock, 320, 300, view);
    assert(JSON.stringify(G) === before, 'presentation must not mutate gameplay / ' + id);
    clock += 4000; sandbox.bossStageSync(clock);
    const count = writes; sandbox.bossStageSync(clock + 1);
    assert(writes === count, 'stable frames must not write DOM / ' + id);
  });
  results.push('9 dossiers/draw paths; gameplay snapshot unchanged; stable frame has zero DOM writes');
  const boss = G.enemies[0]; boss.intent = { kind: 'annihilate', label: 'test', turns: 3, total: 3 };
  sandbox.bossStageSync(clock); boss.intent.turns = 2; sandbox.bossStageSync(clock);
  assert(nodes['#bossreadout-label'].textContent.includes('剩余 2 回合'), 'real-turn charge readout');
  const beforeReduce = animations; sandbox.VFX.reduced = true;
  sandbox.showBossBanner(boss.name, ''); sandbox.bossStageEvent(boss, 'annihilate', 'test'); sandbox.bossStageSync(clock);
  assert(animations === beforeReduce && !nodes['#app'].hasAttribute('data-boss-impact'), 'reduced motion disables animation/filter');
  sandbox.bossStageDraw(clock, 320, 300, view); results.push('turn progress and reduced-motion guard');
  G.modal = 'menu'; sandbox.bossStageSync(clock);
  assert(nodes['#bossnotice'].hasAttribute('hidden') && nodes['#bossreadout'].hasAttribute('hidden'), 'modal suspension'); G.modal = null;
  boss.hp = 0; sandbox.bossStageSync(clock);
  assert(!sandbox.bossStageSnapshot().active && !nodes['#app'].hasAttribute('data-boss-stage'), 'dead owner cleanup');
  const next = make('bh_eye', boss.uid); G.enemies = [next]; G.runId++;
  sandbox.bossStageSync(clock); assert(sandbox.bossStageSnapshot().ownerUid === next.uid, 'fresh owner same uid binds safely');
  G.mode = 'normal'; G.enemies = []; sandbox.bossStageSync(clock);
  assert(!sandbox.bossStageSnapshot().active && !nodes['#app'].hasAttribute('data-boss-intrusion'), 'mode / clear cleanup');
  G.state = 'menu'; sandbox.bossStageSync(clock); results.push('modal, death, UID reuse, mode and clear lifecycle guards');
  return results;
}
module.exports = { patchSource, patchHtml, profiles: PROFILES, selfTest };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some(function (arg) { return arg !== '--check'; }) || args.length > 1) throw new Error('Usage: node tools/chrome-boss-stage-patch.js [--check]');
  const gamePath = path.resolve(__dirname, '..', 'game.js'), htmlPath = path.resolve(__dirname, '..', 'index.html');
  const beforeGame = fs.readFileSync(gamePath, 'utf8'), beforeHtml = fs.readFileSync(htmlPath, 'utf8');
  const game = patchSource(beforeGame), html = patchHtml(beforeHtml), checks = selfTest();
  if (!args.includes('--check')) {
    if (fs.readFileSync(gamePath, 'utf8') !== beforeGame || fs.readFileSync(htmlPath, 'utf8') !== beforeHtml) throw new Error('Source changed during preflight; retry current sources');
    fs.writeFileSync(gamePath, game.source, 'utf8');
    fs.writeFileSync(htmlPath, html.source, 'utf8');
  }
  console.log(JSON.stringify({ mode: args.includes('--check') ? 'check-only; no files written' : 'applied', targets: [gamePath, htmlPath], changes: { game: game.changes, html: html.changes }, checks: checks, api: 'window.__neon.test.bossStage', resources: 'inline only; zero network/platform APIs' }, null, 2));
}



















