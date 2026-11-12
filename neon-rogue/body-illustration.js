/* 1.0 义体仓人形：霓虹线框，各部位按已装义体品质点亮。坐标系 100×200。 */
(function (root) {
  'use strict';
  // 各槽位在人形上的锚点（百分比，供引线使用）
  var ANCHOR = { eyeL: [46, 9], eyeR: [54, 9], body: [50, 30], spine: [50, 43], handL: [26, 52], handR: [74, 52], legL: [42, 78], legR: [58, 78] };
  var PART = {
    eyeL: '<circle cx="45.5" cy="17" r="2.6"/>',
    eyeR: '<circle cx="54.5" cy="17" r="2.6"/>',
    body: '<path d="M36 40h28l3 8-3 26-7 6H43l-7-6-3-26z"/><path d="M40 50h20M41 58h18M42 66h16" class="thin"/>',
    spine: '<path d="M50 30v62"/><path d="M47 80h6M46.5 86h7M47 92h6" /><circle cx="50" cy="74" r="2.4"/>',
    handL: '<path d="M32 42l-8 5-4 24 3 4 5-3 5-22z"/><circle cx="21.5" cy="78" r="3"/><path d="M19 82l-3 24 5 3 4-5 1-22z"/><path d="M15 110l6 2-1 9-4-1z"/>',
    handR: '<path d="M68 42l8 5 4 24-3 4-5-3-5-22z"/><circle cx="78.5" cy="78" r="3"/><path d="M81 82l3 24-5 3-4-5-1-22z"/><path d="M85 110l-6 2 1 9 4-1z"/>',
    legL: '<path d="M38 98h11l-1 40-7 2-4-4z"/><circle cx="43" cy="145" r="3.4"/><path d="M39 150h8l-1 34h-6z"/><path d="M40 186h7l1 7H35z"/>',
    legR: '<path d="M62 98H51l1 40 7 2 4-4z"/><circle cx="57" cy="145" r="3.4"/><path d="M61 150h-8l1 34h6z"/><path d="M60 186h-7l-1 7h13z"/>'
  };
  function markup(colors) {
    colors = colors || {};
    var parts = Object.keys(PART).map(function (slot) {
      var c = colors[slot];
      return '<g class="nb-part' + (c ? ' on' : '') + '" data-part="' + slot + '"' + (c ? ' style="--pc:' + c + '"' : '') + '>' + PART[slot] + '</g>';
    }).join('');
    return '<svg class="neon-body" viewBox="0 0 100 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<ellipse cx="50" cy="194" rx="30" ry="4.5" class="nb-floor"/><ellipse cx="50" cy="194" rx="19" ry="2.8" class="nb-floor"/>' +
      '<g class="nb-base"><path d="M42 8h16l4 6v10l-5 7H43l-5-7V14z"/><path d="M46 31v5h8v-5"/><path d="M40 88h20l3 8H37z"/></g>' +
      parts + '<rect class="nb-scan" x="12" y="0" width="76" height="1.2"/></svg>';
  }
  var css = '.neon-body{position:absolute;left:31%;top:2%;width:38%;height:96%;overflow:visible}' +
    '.neon-body *{fill:none;stroke:#2c5565;stroke-width:1.1;stroke-linejoin:round;vector-effect:non-scaling-stroke}' +
    '.neon-body .nb-base *{stroke:#3b7186;fill:rgba(34,230,255,.04)}' +
    '.neon-body .nb-floor{stroke:rgba(34,230,255,.28);stroke-dasharray:2 3}' +
    '.neon-body .thin{stroke-width:.6;opacity:.6}' +
    '.neon-body .nb-part{transition:opacity .2s}' +
    '.neon-body .nb-part.on *{stroke:var(--pc);fill:color-mix(in srgb,var(--pc) 16%,transparent);filter:drop-shadow(0 0 3px var(--pc))}' +
    '.neon-body .nb-scan{fill:rgba(34,230,255,.5);stroke:none;animation:nbscan 3.6s linear infinite}' +
    '@keyframes nbscan{0%{transform:translateY(4px);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(192px);opacity:0}}' +
    '@media (prefers-reduced-motion:reduce){.neon-body .nb-scan{animation:none;opacity:0}}';
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  root.NeonBodyIllustration = { markup: markup, anchor: ANCHOR };
})(window);
