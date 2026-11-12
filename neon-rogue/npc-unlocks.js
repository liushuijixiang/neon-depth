/* The three approved optional NPC unlocks share the existing story save. */
(function () {
  'use strict';

  var depths = { npc_qiao: 3, npc_sinan: 4, npc_nie: 7 };

  function requiredDepth(npc) {
    return npc && depths[npc.id] || 0;
  }

  function inherited(npc, story) {
    if (!npc || !story) return false;
    var state = story.npc && story.npc[npc.id] || {};
    return !!(state.met > 0 || state.stage > 0 || state.done || state.duelWon > 0 ||
      state.jobDone || state.relic || npc.relic && story.relics && story.relics[npc.relic]);
  }

  function unlocked(npc, story) {
    if (!requiredDepth(npc)) return true;
    var value = story && story.npcUnlocks && story.npcUnlocks[npc.id];
    return value === true || value === 1 || inherited(npc, story);
  }

  function eligible(npc, story, stats) {
    if (unlocked(npc, story)) return true;
    var storyDepth = Number(story && story.maxDepth) || 0;
    var statsDepth = Number(stats && stats.bestDepth) || 0;
    return Math.max(storyDepth, statsDepth) >= requiredDepth(npc);
  }

  function ensureUnlocks(story) {
    if (!story.npcUnlocks || typeof story.npcUnlocks !== 'object' || Array.isArray(story.npcUnlocks)) story.npcUnlocks = {};
    return story.npcUnlocks;
  }

  function migrate(story, npcs) {
    var changed = false;
    (npcs || []).forEach(function (npc) {
      if (!requiredDepth(npc) || !inherited(npc, story)) return;
      var records = ensureUnlocks(story);
      if (records[npc.id] === true || records[npc.id] === 1) return;
      records[npc.id] = true;
      changed = true;
    });
    return changed;
  }

  function unlock(npc, story, stats, outsideRun) {
    if (outsideRun !== true || !story || !requiredDepth(npc) || unlocked(npc, story) || !eligible(npc, story, stats)) return false;
    ensureUnlocks(story)[npc.id] = true;
    return true;
  }

  function escape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function render(npcs, story, stats, outsideRun) {
    return (npcs || []).filter(function (npc) { return requiredDepth(npc); }).sort(function (a, b) {
      return requiredDepth(a) - requiredDepth(b);
    }).map(function (npc) {
      var owned = unlocked(npc, story);
      var disabled = owned || outsideRun !== true || !eligible(npc, story, stats);
      var color = /^#[\da-f]{6}$/i.test(npc.color || '') ? npc.color : '#22e6ff';
      return '<div class="arc npc-unlock" style="--ac:' + color + ';display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:10px;align-items:center">' +
        '<i aria-hidden="true" style="display:grid;place-items:center;width:32px;height:36px;color:' + color + ';border:1px solid currentColor;border-radius:6px;font-style:normal">' + escape(npc.char) + '</i>' +
        '<div style="min-width:0"><small>B' + requiredDepth(npc) + 'F</small><b>' + escape(npc.name) + '</b></div>' +
        '<button class="ghost" type="button" data-npc-unlock="' + escape(npc.id) + '"' + (disabled ? ' disabled' : '') +
        ' style="width:auto;min-width:66px;min-height:36px;margin:0;padding:7px 10px">' + (owned ? '已解锁' : '解锁') + '</button></div>';
    }).join('');
  }

  window.NeonNpcUnlocks = {
    requiredDepth: requiredDepth,
    inherited: inherited,
    eligible: eligible,
    unlocked: unlocked,
    unlock: unlock,
    migrate: migrate,
    render: render
  };
})();
