/**
 * Vitest global setup — provides browser-like globals and common mocks
 * that nearly every test file needs.
 */
import { vi } from 'vitest';

// ---- localStorage / sessionStorage mock ----
const storageProto = {
  getItem: vi.fn(key => storageProto._store[key] ?? null),
  setItem: vi.fn((key, val) => {
    storageProto._store[key] = String(val);
  }),
  removeItem: vi.fn(key => {
    delete storageProto._store[key];
  }),
  clear: vi.fn(() => {
    storageProto._store = {};
  }),
  _store: {},
};

Object.defineProperty(globalThis, 'localStorage', { value: storageProto });

// Provide a sensible default for settings in localStorage so code that does
// JSON.parse(localStorage.getItem('settings')) won't blow up.
const defaultSettings = {
  lang: 'zh-CN',
  musicQuality: 320000,
  enableRealIP: false,
  realIP: null,
  proxyConfig: { protocol: 'noProxy', server: '', port: null },
};
localStorage.setItem('settings', JSON.stringify(defaultSettings));
localStorage.setItem('data', JSON.stringify({ user: {}, loginMode: null }));

// ---- process.env defaults ----
process.env.IS_ELECTRON = false;
process.env.VUE_APP_NETEASE_API_URL = '/api';
process.env.VUE_APP_ELECTRON_API_URL = '/api';
process.env.VUE_APP_ELECTRON_API_URL_DEV = 'http://127.0.0.1:10754';

// ---- document.cookie support (jsdom has it, but make sure) ----
if (typeof document === 'undefined') {
  globalThis.document = { cookie: '' };
}

// ---- navigator.mediaSession stub ----
if (!navigator.mediaSession) {
  Object.defineProperty(navigator, 'mediaSession', {
    value: {
      metadata: null,
      setActionHandler: vi.fn(),
      setPositionState: vi.fn(),
    },
    writable: true,
  });
}

// ---- window.MediaMetadata stub ----
if (typeof window.MediaMetadata === 'undefined') {
  window.MediaMetadata = class MediaMetadata {
    constructor(init) {
      Object.assign(this, init);
    }
  };
}

// ---- Reset localStorage between tests ----
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('settings', JSON.stringify(defaultSettings));
  localStorage.setItem('data', JSON.stringify({ user: {}, loginMode: null }));
});
