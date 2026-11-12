/* Explicit panel rendering and navigation layout, shared by the game's screens. */
(function () {
  'use strict';

  function signature(card) {
    if (!card) return '';
    var tabs = Array.from(card.querySelectorAll('.tab.on,.hubtab.on,.subtabs .on,[data-rt].on,.fpill.on'));
    return card.className + '|' + tabs.map(function (tab) {
      return Object.keys(tab.dataset).sort().map(function (key) { return key + '=' + tab.dataset[key]; }).join(',');
    }).join('|');
  }

  function scrollPositions(overlay) {
    var positions = [];
    ['.card', '.m3-body', '.plist', '.slist', '.eq-grid', '.fpills', '.tabs', '.hubbar'].forEach(function (selector) {
      overlay.querySelectorAll(selector).forEach(function (element, index) {
        if (element.scrollTop || element.scrollLeft) positions.push({ selector: selector, index: index, top: element.scrollTop, left: element.scrollLeft });
      });
    });
    overlay.querySelectorAll('[data-tr-scroll]').forEach(function (element) {
      positions.push({ selector: '[data-tr-scroll="' + CSS.escape(element.dataset.trScroll) + '"]', index: 0, top: element.scrollTop, left: element.scrollLeft });
    });
    return positions;
  }

  function restoreScroll(overlay, positions) {
    positions.forEach(function (position) {
      var element = overlay.querySelectorAll(position.selector)[position.index];
      if (element) { element.scrollTop = position.top; element.scrollLeft = position.left; }
    });
  }

  function arrangeActions(card) {
    if (!card) return;
    var siteExit = card.querySelector(':scope > #siteClose');
    if (siteExit && siteExit !== card.lastElementChild) card.appendChild(siteExit);
    var merchantBatch = card.querySelector('.bulk:has(#shBulk)');
    if (merchantBatch) {
      var shopTabs = card.querySelector('.tabs');
      if (shopTabs) {
        var tools = document.createElement('div');
        tools.className = 'panel-tools';
        shopTabs.before(tools);
        tools.append(shopTabs, merchantBatch);
      }
    }
    var warehouseBatch = card.querySelector('.bulk:has([data-bsell])');
    var warehouseTabs = card.querySelector('.subtabs:has([data-stab])');
    if (warehouseBatch && warehouseTabs) {
      var warehouseTools = document.createElement('div');
      warehouseTools.className = 'panel-tools warehouse-tools';
      var warehouseFilter = card.querySelector('.fbar');
      var warehousePrimaryTabs = card.querySelector(':scope > .tabs:has([data-mtab])');
      (warehousePrimaryTabs || warehouseTabs).before(warehouseTools);
      if (warehousePrimaryTabs) warehouseTools.appendChild(warehousePrimaryTabs);
      warehouseTools.append(warehouseTabs, warehouseBatch);
      if (warehouseFilter) warehouseTools.appendChild(warehouseFilter);
    }
    var exits = card.querySelectorAll('.m3-dochead #docBack,.m3-dochead #setClose,.m3-flowhead #flowBack,.m3-flowhead #flowClose,.m3-flowhead #prepBack');
    if (!exits.length) return;
    var footer = document.createElement('div');
    footer.className = 'panel-footer';
    var labels = { docBack: '退出', setClose: '退出', flowClose: '退出', flowBack: '返回', prepBack: '返回' };
    exits.forEach(function (button) {
      button.classList.remove('m3-ibtn');
      button.classList.add('ghost');
      button.textContent = labels[button.id];
      footer.appendChild(button);
    });
    card.appendChild(footer);
  }

  function create(overlay, hooks) {
    var currentKey = '';
    function render(html) {
      var previousKey = currentKey;
      var positions = scrollPositions(overlay);
      var focused = overlay.contains(document.activeElement) ? document.activeElement.id : '';
      overlay.innerHTML = html;
      if (hooks.skin) hooks.skin();
      var card = overlay.querySelector('.card');
      arrangeActions(card);
      currentKey = (hooks.screenKey ? hooks.screenKey() : '') + '|' + signature(card);
      if (hooks.present) hooks.present(card, previousKey !== currentKey);
      if (hooks.illustrate) hooks.illustrate(overlay);
      if (card && hooks.portraits && card.querySelector('[data-mon]')) {
        requestAnimationFrame(function () { if (card.isConnected) hooks.portraits(card); });
      }
      if (card && previousKey === currentKey) {
        restoreScroll(overlay, positions);
        requestAnimationFrame(function () { if (card.isConnected) restoreScroll(overlay, positions); });
      }
      if (focused) {
        var replacement = document.getElementById(focused);
        if (replacement && overlay.contains(replacement)) replacement.focus({ preventScroll: true });
      }
    }

    function keepFocus(event) {
      if (event.key !== 'Tab' || !overlay.classList.contains('show')) return;
      var controls = Array.from(overlay.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')).filter(function (element) {
        return element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
      });
      if (!controls.length) return;
      var first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (!overlay.contains(document.activeElement) || document.activeElement === first)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (!overlay.contains(document.activeElement) || document.activeElement === last)) {
        event.preventDefault(); first.focus();
      }
    }
    document.addEventListener('keydown', keepFocus);
    return { render: render, dispose: function () { document.removeEventListener('keydown', keepFocus); } };
  }

  window.NeonPanels = { create: create };
})();
