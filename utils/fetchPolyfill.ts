// Polyfill to ensure window.fetch can be assigned without throwing
// "Cannot set property fetch of #<Window> which has only a getter"
(function() {
  if (typeof window === 'undefined') return;
  try {
    const originalFetch = window.fetch ? window.fetch.bind(window) : undefined;
    let _fetch = originalFetch;

    const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (!desc || !desc.set || !desc.writable) {
      try {
        Object.defineProperty(window, 'fetch', {
          get() {
            return _fetch;
          },
          set(fn) {
            _fetch = fn;
          },
          configurable: true,
          enumerable: true,
        });
      } catch (e1) {
        try {
          if (typeof Window !== 'undefined' && Window.prototype) {
            Object.defineProperty(Window.prototype, 'fetch', {
              get() {
                return _fetch;
              },
              set(fn) {
                _fetch = fn;
              },
              configurable: true,
              enumerable: true,
            });
          }
        } catch (e2) {}
      }
    }
  } catch (err) {
    console.warn('Fetch setter initialization warning:', err);
  }
})();

export {};
