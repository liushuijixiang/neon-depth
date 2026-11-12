const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ window: {} });
for (const file of ['content/story.js', 'content/story2.js', 'npc-unlocks.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
vm.runInContext('Math.random = function () { throw new Error("Unexpected gameplay RNG use"); };', context);
const api = context.window.NeonNpcUnlocks;
const npcs = [...context.window.NEON.story.npcs, ...context.window.NEON.story2.npcs];
const ids = ['npc_qiao', 'npc_sinan', 'npc_nie'];
const floors = [3, 4, 7];
let assertions = 0;
function check(value, message) {
  assertions++;
  assert(value, message);
}

ids.forEach((id, index) => {
  const npc = npcs.find(candidate => candidate.id === id);
  const depth = floors[index];
  const story = { npc: {}, relics: {}, maxDepth: 1, unrelated: { unchanged: true } };
  const stats = { bestDepth: depth - 1, credits: 531 };
  check(api.requiredDepth(npc) === depth, id + ' required floor');
  check(!api.unlocked(npc, story), id + ' starts locked');
  check(!api.eligible(npc, story, stats), id + ' remains locked before required floor');
  check(!api.unlock(npc, story, stats, true), id + ' rejects premature unlock');
  stats.bestDepth = depth;
  check(api.eligible(npc, story, stats), id + ' reaches required floor');
  check(!api.unlock(npc, story, stats, false), id + ' cannot unlock during a run');
  check(!api.unlock(npc, story, stats), id + ' requires outside-run context');
  check(api.unlock(npc, story, stats, true), id + ' unlocks outside run');
  check(api.unlocked(npc, story), id + ' becomes available');
  check(!api.unlock(npc, story, stats, true), id + ' repeated unlock is idempotent');
  check(stats.credits === 531, id + ' has no currency cost');
  check(story.unrelated.unchanged, id + ' preserves unrelated save state');
  check(api.unlocked(npc, JSON.parse(JSON.stringify(story))), id + ' persists across save round trip');
  const viaStory = { maxDepth: depth, npc: {}, relics: {} };
  check(api.eligible(npc, viaStory, { bestDepth: 1 }), id + ' accepts existing story depth');

  for (const field of ['met', 'stage', 'done', 'duelWon', 'jobDone', 'relic']) {
    const legacy = { npc: { [id]: { [field]: 1 } }, relics: {}, maxDepth: 1 };
    check(api.inherited(npc, legacy), id + ' inherits ' + field);
    check(api.unlocked(npc, legacy), id + ' is immediately usable from ' + field);
    check(api.migrate(legacy, npcs), id + ' migrates ' + field);
    check(legacy.npcUnlocks[id] === true, id + ' records inherited unlock');
    check(!api.migrate(legacy, npcs), id + ' migration is idempotent');
    check(legacy.npc[id][field] === 1, id + ' keeps legacy progress');
  }
  const relicSave = { npc: {}, relics: { [npc.relic]: 12345 } };
  check(api.migrate(relicSave, npcs), id + ' inherits relic archive ownership');
  check(api.unlocked(npc, relicSave), id + ' remains available after relic migration');
  const emptyRecord = { npc: { [id]: { stage: 0, met: 0 } }, relics: {} };
  check(!api.migrate(emptyRecord, npcs), id + ' does not count empty archive lookup as meeting');
  check(!api.unlocked(npc, emptyRecord), id + ' empty old record stays locked');
});

const unaffected = npcs.filter(npc => !ids.includes(npc.id));
check(unaffected.every(npc => api.unlocked(npc, {})), 'All other NPC availability is unchanged');
const rendered = api.render(npcs, { npc: {}, maxDepth: 7 }, { bestDepth: 1 }, true);
check((rendered.match(/data-npc-unlock=/g) || []).length === 3, 'Exactly three approved cards are rendered');
check(rendered.indexOf('阿撬') < rendered.indexOf('司南') && rendered.indexOf('司南') < rendered.indexOf('老聂'), 'Cards follow B3, B4, B7 order');
const visibleText = rendered.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean);
const approvedText = new Set(['撬', '车', '弦', 'B3F', 'B4F', 'B7F', '阿撬', '司南', '老聂', '解锁', '已解锁']);
check(visibleText.every(text => approvedText.has(text)), 'No additional UI or story text is rendered');
check((api.render(npcs, {}, {}, false).match(/ disabled/g) || []).length === 3, 'Unlock controls are disabled during a run');
check((api.render(npcs, {}, { bestDepth: 2 }, true).match(/ disabled/g) || []).length === 3, 'All required-depth locks are shown');
const partial = api.render(npcs, { npcUnlocks: { npc_qiao: true } }, { bestDepth: 3 }, true);
check(partial.includes('已解锁'), 'Previously unlocked state is visible');
check((partial.match(/ disabled/g) || []).length === 3, 'Owned and ineligible controls are disabled');

const loadedSite = { type: 'npc', data: { npc: 'npc_qiao' } };
const existingRun = { sites: [loadedSite] };
api.migrate({ npc: {} }, npcs);
check(existingRun.sites[0] === loadedSite, 'Migration leaves existing run sites intact');
console.log(JSON.stringify({ passed: true, assertions, gated: ids, unaffected: unaffected.length }));
