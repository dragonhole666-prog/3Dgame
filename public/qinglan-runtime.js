/* P0.25.6q: same-origin cloud runtime. Local development keeps the local backend fallback. */
(() => {
  const locationObject = globalThis.location;
  const host = locationObject?.hostname ?? '';
  const local = host === 'localhost' || host === '127.0.0.1';
  const backendOrigin = !local && locationObject?.origin ? locationObject.origin : '';
  globalThis.__QINGLAN_RUNTIME__ = Object.freeze({ backendOrigin });
})();
