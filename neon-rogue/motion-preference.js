/* One motion preference for canvas effects and CSS presentation. */
(function (root) {
  'use strict';
  var key = 'neon-depth-vfx';
  var media = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var manual = null;
  var reduced = false;
  var listeners = [];

  function apply() {
    reduced = manual == null ? !!(media && media.matches) : manual;
    document.documentElement.dataset.neonMotion = reduced ? 'reduced' : 'full';
    listeners.slice().forEach(function (listener) { listener(reduced); });
  }

  function refresh() {
    try {
      var stored = localStorage.getItem(key);
      manual = stored === '0' ? false : stored === '1' ? true : null;
    } catch (error) { manual = null; }
    apply();
  }

  function setReduced(value) {
    manual = !!value;
    try { localStorage.setItem(key, manual ? '1' : '0'); } catch (error) { }
    apply();
  }

  function systemChanged() {
    if (manual == null) apply();
  }
  if (media) {
    if (media.addEventListener) media.addEventListener('change', systemChanged);
    else if (media.addListener) media.addListener(systemChanged);
  }
  refresh();
  root.NeonMotion = {
    refresh: refresh,
    setReduced: setReduced,
    get reduced() { return reduced; },
    subscribe: function (listener) {
      listeners.push(listener);
      listener(reduced);
      return function () { listeners = listeners.filter(function (item) { return item !== listener; }); };
    }
  };
})(window);
