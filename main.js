'use strict';

/* Boot: runs after every other script has loaded. */

save(); // persist the starter data on first launch
route();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  // When a newer version takes over, reload once so the new screens show up.
  // (Skipped during a rest timer so a workout isn't interrupted; it applies next open.)
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded || timer.interval) return;
    reloaded = true;
    location.reload();
  });
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}
