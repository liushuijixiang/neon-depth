/* =========================================================
   SAVE_V1 · 中途存档：每回合自动保存，退出提示，主界面继续
   ========================================================= */
var SAVE_KEY = 'neon-depth-run', SAVE_VER = 3;
var SAVE_SKIP = { particles: 1, texts: 1, beams: 1, chromeSkillFx: 1, chromeSkillMap: 1, tacticFx: 1, killFxCell: 1, cyberFx: 1, slash: 1, sandevTrail: 1, mod: 1, storyQueue: 1 };
var SAVE_REFS = null;
function saveRefs() {
  if (SAVE_REFS) return SAVE_REFS;
  var byObj = new Map(), byKey = {};
  function reg(kind, list) { (list || []).forEach(function (o) { if (o && o.id != null) { var k = kind + ':' + o.id; byObj.set(o, k); byKey[k] = o; } }); }
  reg('mon', MONSTERS); reg('boss', (window.NEON && window.NEON.bosses) || []); reg('lboss', BOSSES); reg('item', ITEMS); reg('cons', CONSUMABLES);
  reg('mod', MODS); reg('quest', QUESTS); reg('buff', BUFFS); reg('chal', CHALLENGES);
  SAVE_REFS = { byObj: byObj, byKey: byKey }; return SAVE_REFS;
}
function saveRun(force) {
  if (G.mode !== 'normal' || G.state !== 'play' || !p || !G.map) return false;
  if (!force && G.saveAt && Date.now() - G.saveAt < 1200) { G.saveDirty = true; return false; }
  var R = saveRefs(), seen = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
  try {
    var data = JSON.stringify({ v: SAVE_VER, at: Date.now(), cls: G.classId, depth: G.depth, G: G, p: p }, function (k, v) {
      if (SAVE_SKIP[k] && this === G) return undefined;
      if (v && typeof v === 'object') {
        var ref = R.byObj.get(v); if (ref) return { $ref: ref };
        if (seen) { if (seen.has(v)) return undefined; seen.add(v); }
      }
      if (typeof v === 'function') return undefined;
      return v;
    });
    localStorage.setItem(SAVE_KEY, data); G.saveAt = Date.now(); G.saveDirty = false; return true;
  } catch (e) { return false; }
}
function savedRun() {
  try { var raw = localStorage.getItem(SAVE_KEY); if (!raw) return null; var o = JSON.parse(raw); return o && o.v === SAVE_VER ? o : null; } catch (e) { return null; }
}
function clearRun() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
function loadRun() {
  var raw; try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  if (!raw) return false;
  var R = saveRefs(), o;
  try { o = JSON.parse(raw, function (k, v) { return v && typeof v === 'object' && v.$ref ? (R.byKey[v.$ref] || null) : v; }); } catch (e) { return false; }
  if (!o || o.v !== SAVE_VER || !o.G || !o.p) return false;
  hideOverlay();
  Object.keys(o.G).forEach(function (k) { G[k] = o.G[k]; });
  p = o.p;
  G.particles = []; G.texts = []; G.beams = []; G.chromeSkillFx = []; G.tacticFx = []; G.storyQueue = [];
  G.enemies = (G.enemies || []).filter(function (e) { return e && e.spec; });
  G.modal = null; G.paused = false; G.busy = false; G.state = 'play'; G.mode = 'normal'; G.runId = (G.runId || 0) + 1;
  G.control = null; G.psychoScheduled = false;
  logEl.innerHTML = '';
  recalc(); computeFOV(); VFX.miniKey = ''; updateHUD(); renderAbilities && renderAbilities();
  msg('深潜已恢复 · B' + G.depth + 'F', 'good'); toast('读取存档 · B' + G.depth + 'F', 'good');
  return true;
}
function saveSummary(o) {
  var c = CLASS_BY[o.cls] || CLASSES[0], d = new Date(o.at);
  return c.name + ' · B' + o.depth + 'F · ' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
window.addEventListener('pagehide', function () { saveRun(true); });
document.addEventListener('visibilitychange', function () { if (document.hidden) saveRun(true); });
window.addEventListener('beforeunload', function (ev) {
  if (G.mode === 'normal' && G.state === 'play') { saveRun(true); ev.preventDefault(); ev.returnValue = '深潜进度已自动保存。确定离开吗？'; return ev.returnValue; }
});
setInterval(function () { if (G.saveDirty) saveRun(); }, 2000);
