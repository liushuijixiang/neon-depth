/* Android compatibility settings and storage recovery before the engine loads. */
(function (root) {
  'use strict';

  var bridge = root.NeonAndroid;
  var restoreMarker = 'neon-compatibility-restored';
  var reservationKey = 'neon-compatibility-reserved';
  var storageReady = true;
  var restarting = false;
  var failureCallback = null;
  var reservationCreated = false;

  function releaseReservation() {
    if (!reservationCreated) return;
    try { localStorage.removeItem(reservationKey); } catch (error) { }
    reservationCreated = false;
  }

  function gameKey(key) {
    return key.indexOf('neon-depth-') === 0 || key === 'neon_chal_v1';
  }

  function currentState() {
    if (!bridge || typeof bridge.compatibilityState !== 'function') return { supported: false };
    try {
      var state = JSON.parse(bridge.compatibilityState());
      return {
        supported: state.supported === true,
        requested: state.requested === true,
        active: state.active === true,
        failed: state.failed === true
      };
    } catch (error) {
      return { supported: false };
    }
  }

  function restoreStorage() {
    if (!bridge || typeof bridge.restartStorage !== 'function') return true;
    try {
      var raw = bridge.restartStorage();
      if (!raw) {
        try { localStorage.removeItem(reservationKey); } catch (error) { }
        return true;
      }
      var checkpoint = JSON.parse(raw);
      var entries = checkpoint.entries;
      if (typeof checkpoint.id !== 'string' || !checkpoint.id || !entries
          || typeof entries !== 'object' || Array.isArray(entries)) return false;
      var keys = Object.keys(entries);
      if (keys.some(function (key) { return !gameKey(key) || typeof entries[key] !== 'string'; })) return false;
      var markerWasPresent = localStorage.getItem(restoreMarker) === checkpoint.id;
      localStorage.removeItem(reservationKey);
      if (!markerWasPresent) {
        var remove = [];
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (gameKey(key) && !Object.prototype.hasOwnProperty.call(entries, key)) remove.push(key);
        }
        remove.forEach(function (key) { localStorage.removeItem(key); });
        keys.forEach(function (key) { localStorage.setItem(key, entries[key]); });
        // Write the marker after every value, so an interrupted restore retries.
        localStorage.setItem(restoreMarker, checkpoint.id);
      }
      bridge.storageRestored(checkpoint.id, markerWasPresent);
      return true;
    } catch (error) {
      return false;
    }
  }

  function restart(enabled, onFailure) {
    if (restarting || !storageReady || !currentState().supported) return false;
    try {
      // Reserve the same storage space as the UUID marker before committing a
      // native restart, so a full inventory cannot leave recovery out of quota.
      if (localStorage.getItem(restoreMarker) === null) {
        localStorage.setItem(reservationKey, '00000000-0000-0000-0000-000000000000');
        reservationCreated = true;
      }
      var entries = Object.create(null);
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (gameKey(key)) entries[key] = localStorage.getItem(key);
      }
      restarting = true;
      failureCallback = onFailure;
      var accepted = bridge.restartCompatibility(!!enabled, JSON.stringify({ version: 1, entries: entries }));
      if (accepted === true) return true;
    } catch (error) { }
    restarting = false;
    failureCallback = null;
    releaseReservation();
    return false;
  }

  function restartFailed() {
    restarting = false;
    releaseReservation();
    var callback = failureCallback;
    failureCallback = null;
    if (callback) callback();
  }

  storageReady = restoreStorage();
  root.NeonCompatibility = {
    state: currentState,
    restart: restart,
    restartFailed: restartFailed,
    get storageReady() { return storageReady; },
    get restarting() { return restarting; }
  };
})(window);
