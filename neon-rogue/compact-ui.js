/* Compact controls reuse the existing inventory node and its event listeners. */
(function (root) {
  'use strict';
  var inventory = document.getElementById('invbar');
  var opened = false;
  var pending = 0;
  var roots = new Set();
  var measure = document.createElement('canvas').getContext('2d');
  var selectors = '.clsrow2 .kbtn > b, .clsrow2 .kbtn:not(.dreamact) > small, .gearrow .abtn > .nm, .gearrow .abtn > .cd, ' +
    '.invbar .slot > .nm, .bslot .bl, .bslot .bn, .bslot .bp, .sockets .chipico > span';

  function fit(element) {
    if (!element.isConnected || !element.clientWidth) return;
    // Measure from the stylesheet size before an intrinsic text box can shrink again.
    element.style.removeProperty('font-size');
    var style = getComputedStyle(element);
    var base = parseFloat(style.fontSize);
    var space = element.clientWidth - parseFloat(style.paddingLeft || 0) - parseFloat(style.paddingRight || 0);
    if (!(space > 0) || !(base > 0)) return;
    var text = element.textContent || '';
    measure.font = style.fontStyle + ' ' + style.fontWeight + ' ' + base + 'px ' + style.fontFamily;
    var spacing = parseFloat(style.letterSpacing) || 0;
    var width = measure.measureText(text).width + Math.max(0, text.length - 1) * spacing;
    var size = Math.min(base, base * Math.max(0, space - 1) / Math.max(1, width));
    size = Math.max(1, Math.floor(size * 20) / 20);
    element.style.fontSize = size + 'px';
  }

  function fitSingleLine(scope) {
    if (!scope) return;
    scope.querySelectorAll(selectors).forEach(fit);
  }

  function schedule() {
    if (pending) return;
    pending = root.requestAnimationFrame(function () {
      pending = 0;
      roots.forEach(function (scope) {
        if (scope.isConnected) fitSingleLine(scope);
        else { observer.unobserve(scope); roots.delete(scope); }
      });
    });
  }

  var observer = new ResizeObserver(schedule);
  function watch(scope) {
    if (roots.has(scope)) return;
    roots.add(scope);
    observer.observe(scope);
  }

  function mount(abilitybar, originalInventory) {
    abilitybar = abilitybar || document.getElementById('abilitybar');
    inventory = originalInventory || inventory;
    if (!abilitybar || !inventory) return;
    var app = document.getElementById('app');
    if (app) app.classList.add('compact-ui');
    var row = abilitybar.querySelector('.gearrow');
    if (!row) { row = document.createElement('div'); row.className = 'gearrow'; abilitybar.append(row); }
    var toggle = row.querySelector('#consumablesToggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.id = 'consumablesToggle';
      toggle.type = 'button';
      toggle.className = 'abtn consumables-toggle';
      toggle.innerHTML = '<span class="nm">消耗品</span>';
      toggle.setAttribute('aria-controls', 'invbar');
      toggle.onclick = function () {
        opened = !opened;
        inventory.hidden = !opened;
        toggle.setAttribute('aria-expanded', String(opened));
        fitSingleLine(abilitybar);
      };
      row.prepend(toggle);
    }
    toggle.setAttribute('aria-expanded', String(opened));
    inventory.hidden = !opened;
    inventory.classList.add('consumables-drawer');
    abilitybar.insertBefore(inventory, row);
    watch(abilitybar);
    fitSingleLine(abilitybar);
  }

  function observe(scope) {
    watch(scope);
    fitSingleLine(scope);
  }

  function dispose() {
    observer.disconnect();
    roots.clear();
    if (pending) root.cancelAnimationFrame(pending);
    pending = 0;
  }

  root.NeonCompactUI = { mount: mount, fitSingleLine: fitSingleLine, observe: observe, dispose: dispose,
    snapshot: function () { return { observedRoots: roots.size, pendingFrame: !!pending, opened: opened }; } };
})(window);
