/**
 * Baseline tests for src/utils/auth.js
 *
 * These tests capture the current behaviour so we can detect regressions
 * when migrating to Vue 3.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies BEFORE importing auth
vi.mock('js-cookie', () => {
  const jar = {};
  return {
    default: {
      get: vi.fn(key => jar[key]),
      set: vi.fn((key, val) => {
        jar[key] = val;
      }),
      remove: vi.fn(key => {
        delete jar[key];
      }),
      _jar: jar,
    },
  };
});

vi.mock('@/api/auth', () => ({
  logout: vi.fn(),
}));

vi.mock('@/store', () => {
  return {
    default: {
      state: {
        data: { loginMode: null, user: {}, likedSongPlaylistID: 0 },
      },
      commit: vi.fn(),
    },
  };
});

import {
  setCookies,
  getCookie,
  removeCookie,
  isLoggedIn,
  isAccountLoggedIn,
  isUsernameLoggedIn,
  isLooseLoggedIn,
  doLogout,
} from '@/utils/auth';

import Cookies from 'js-cookie';
import store from '@/store';
import { logout } from '@/api/auth';

describe('auth.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset cookie jar
    for (const key of Object.keys(Cookies._jar)) {
      delete Cookies._jar[key];
    }
    localStorage.clear();
    store.state.data.loginMode = null;
  });

  // ---------- setCookies ----------
  describe('setCookies', () => {
    it('should set document.cookie and localStorage for each cookie', () => {
      setCookies('MUSIC_U=abc123;Path=/;;__csrf=token456;Path=/');
      expect(localStorage.getItem('cookie-MUSIC_U')).toBe('abc123');
      expect(localStorage.getItem('cookie-__csrf')).toBe('token456');
    });
  });

  // ---------- getCookie ----------
  describe('getCookie', () => {
    it('should return from js-cookie first', () => {
      Cookies._jar['MUSIC_U'] = 'from-cookie';
      expect(getCookie('MUSIC_U')).toBe('from-cookie');
    });

    it('should fall back to localStorage when js-cookie returns undefined', () => {
      localStorage.setItem('cookie-MUSIC_U', 'from-ls');
      expect(getCookie('MUSIC_U')).toBe('from-ls');
    });
  });

  // ---------- removeCookie ----------
  describe('removeCookie', () => {
    it('should remove from both js-cookie and localStorage', () => {
      Cookies._jar['MUSIC_U'] = 'val';
      localStorage.setItem('cookie-MUSIC_U', 'val');
      removeCookie('MUSIC_U');
      expect(Cookies.remove).toHaveBeenCalledWith('MUSIC_U');
      expect(localStorage.getItem('cookie-MUSIC_U')).toBeNull();
    });
  });

  // ---------- isLoggedIn ----------
  describe('isLoggedIn', () => {
    it('returns true when MUSIC_U cookie exists', () => {
      Cookies._jar['MUSIC_U'] = 'token';
      expect(isLoggedIn()).toBe(true);
    });

    it('returns true even when MUSIC_U cookie is absent (getCookie falls through to localStorage null)', () => {
      // This is a quirk: getCookie uses ?? so undefined ?? null = null, and null !== undefined is true.
      // In practice, auth works because isAccountLoggedIn also checks loginMode.
      expect(isLoggedIn()).toBe(true);
    });
  });

  // ---------- isAccountLoggedIn ----------
  describe('isAccountLoggedIn', () => {
    it('returns true when MUSIC_U exists AND loginMode is account', () => {
      Cookies._jar['MUSIC_U'] = 'token';
      store.state.data.loginMode = 'account';
      expect(isAccountLoggedIn()).toBe(true);
    });

    it('returns false when MUSIC_U exists but loginMode is not account', () => {
      Cookies._jar['MUSIC_U'] = 'token';
      store.state.data.loginMode = 'username';
      expect(isAccountLoggedIn()).toBe(false);
    });

    it('returns true when loginMode is account even without MUSIC_U (same getCookie quirk)', () => {
      store.state.data.loginMode = 'account';
      // getCookie('MUSIC_U') returns null (not undefined) → isLoggedIn() is true
      expect(isAccountLoggedIn()).toBe(true);
    });
  });

  // ---------- isUsernameLoggedIn ----------
  describe('isUsernameLoggedIn', () => {
    it('returns true when loginMode is username', () => {
      store.state.data.loginMode = 'username';
      expect(isUsernameLoggedIn()).toBe(true);
    });

    it('returns false otherwise', () => {
      store.state.data.loginMode = 'account';
      expect(isUsernameLoggedIn()).toBe(false);
    });
  });

  // ---------- isLooseLoggedIn ----------
  describe('isLooseLoggedIn', () => {
    it('returns true for account login', () => {
      Cookies._jar['MUSIC_U'] = 'token';
      store.state.data.loginMode = 'account';
      expect(isLooseLoggedIn()).toBe(true);
    });

    it('returns true for username login', () => {
      store.state.data.loginMode = 'username';
      expect(isLooseLoggedIn()).toBe(true);
    });

    it('returns false when not logged in at all', () => {
      expect(isLooseLoggedIn()).toBe(false);
    });
  });

  // ---------- doLogout ----------
  describe('doLogout', () => {
    it('should call logout API and clear state', () => {
      doLogout();
      expect(logout).toHaveBeenCalled();
      expect(store.commit).toHaveBeenCalledWith('updateData', {
        key: 'user',
        value: {},
      });
      expect(store.commit).toHaveBeenCalledWith('updateData', {
        key: 'loginMode',
        value: null,
      });
      expect(store.commit).toHaveBeenCalledWith('updateData', {
        key: 'likedSongPlaylistID',
        value: undefined,
      });
    });
  });
});
