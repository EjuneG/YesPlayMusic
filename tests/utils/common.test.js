/**
 * Baseline tests for src/utils/common.js
 *
 * Pure utility functions — no heavy mocking required for most of them.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock store (some functions read from store.state)
vi.mock('@/store', () => ({
  default: {
    state: {
      data: { user: { vipType: 0 }, loginMode: 'account' },
      settings: { lang: 'zh-CN' },
    },
    commit: vi.fn(),
  },
}));

vi.mock('@/utils/auth', () => ({
  isAccountLoggedIn: vi.fn(() => false),
}));

vi.mock('@/api/auth', () => ({
  refreshCookie: vi.fn(() => Promise.resolve()),
}));

import {
  isTrackPlayable,
  mapTrackPlayableStatus,
  randomNum,
  throttle,
  updateHttps,
  splitSoundtrackAlbumTitle,
  splitAlbumTitle,
  bytesToSize,
  formatTrackTime,
} from '@/utils/common';
import store from '@/store';
import { isAccountLoggedIn } from '@/utils/auth';

describe('common.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- isTrackPlayable ----------
  describe('isTrackPlayable', () => {
    it('should return playable when privilege.pl > 0', () => {
      const track = { privilege: { pl: 320000 } };
      expect(isTrackPlayable(track)).toEqual({
        playable: true,
        reason: '',
      });
    });

    it('should detect VIP-only tracks (fee=1) as unplayable for non-VIP', () => {
      isAccountLoggedIn.mockReturnValue(true);
      store.state.data.user.vipType = 0;
      const track = { fee: 1, privilege: { pl: 0 } };
      const result = isTrackPlayable(track);
      expect(result.playable).toBe(false);
      expect(result.reason).toBe('VIP Only');
    });

    it('should allow VIP-only tracks for VIP users (vipType=11)', () => {
      isAccountLoggedIn.mockReturnValue(true);
      store.state.data.user.vipType = 11;
      const track = { fee: 1, privilege: { pl: 0 } };
      const result = isTrackPlayable(track);
      expect(result.playable).toBe(true);
    });

    it('should detect paid album tracks (fee=4)', () => {
      const track = { fee: 4, privilege: { pl: 0 } };
      const result = isTrackPlayable(track);
      expect(result.playable).toBe(false);
      expect(result.reason).toBe('付费专辑');
    });

    it('should detect no-copyright tracks', () => {
      const track = { noCopyrightRcmd: {}, privilege: { pl: 0 } };
      const result = isTrackPlayable(track);
      expect(result.playable).toBe(false);
      expect(result.reason).toBe('无版权');
    });

    it('should detect delisted tracks (privilege.st < 0)', () => {
      isAccountLoggedIn.mockReturnValue(true);
      const track = { privilege: { pl: 0, st: -200 }, fee: 0 };
      const result = isTrackPlayable(track);
      expect(result.playable).toBe(false);
      expect(result.reason).toBe('已下架');
    });
  });

  // ---------- mapTrackPlayableStatus ----------
  describe('mapTrackPlayableStatus', () => {
    it('should add playable and reason to each track', () => {
      const tracks = [
        { id: 1, privilege: { pl: 320000 } },
        { id: 2, fee: 4, privilege: { pl: 0 } },
      ];
      const result = mapTrackPlayableStatus(tracks);
      expect(result[0].playable).toBe(true);
      expect(result[1].playable).toBe(false);
    });

    it('should return tracks as-is if tracks is undefined', () => {
      expect(mapTrackPlayableStatus(undefined)).toBeUndefined();
    });

    it('should merge privileges into tracks', () => {
      const tracks = [{ id: 1 }];
      const privileges = [{ id: 1, pl: 320000 }];
      const result = mapTrackPlayableStatus(tracks, privileges);
      expect(result[0].privilege.pl).toBe(320000);
    });
  });

  // ---------- randomNum ----------
  describe('randomNum', () => {
    it('returns 0 with no arguments', () => {
      expect(randomNum()).toBe(0);
    });

    it('returns a number in range [1, max] with one argument', () => {
      for (let i = 0; i < 50; i++) {
        const n = randomNum(10);
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(10);
      }
    });

    it('returns a number in range [min, max] with two arguments', () => {
      for (let i = 0; i < 50; i++) {
        const n = randomNum(5, 10);
        expect(n).toBeGreaterThanOrEqual(5);
        expect(n).toBeLessThanOrEqual(10);
      }
    });
  });

  // ---------- throttle ----------
  describe('throttle', () => {
    it('calls the function immediately and throttles subsequent calls', () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  // ---------- updateHttps ----------
  describe('updateHttps', () => {
    it('replaces http: with https:', () => {
      expect(updateHttps('http://example.com/img.jpg')).toBe(
        'https://example.com/img.jpg'
      );
    });

    it('leaves https: URLs unchanged', () => {
      expect(updateHttps('https://example.com')).toBe('https://example.com');
    });

    it('returns empty string for falsy input', () => {
      expect(updateHttps(null)).toBe('');
      expect(updateHttps(undefined)).toBe('');
      expect(updateHttps('')).toBe('');
    });
  });

  // ---------- splitSoundtrackAlbumTitle ----------
  describe('splitSoundtrackAlbumTitle', () => {
    it('splits a title with a known keyword', () => {
      const result = splitSoundtrackAlbumTitle(
        'Interstellar (Original Motion Picture Soundtrack)'
      );
      expect(result.title.trim()).toBe('Interstellar');
      expect(result.subtitle).toBe('Original Motion Picture Soundtrack');
    });

    it('returns original title and empty subtitle for no match', () => {
      const result = splitSoundtrackAlbumTitle('My Cool Album');
      expect(result.title).toBe('My Cool Album');
      expect(result.subtitle).toBe('');
    });
  });

  // ---------- splitAlbumTitle ----------
  describe('splitAlbumTitle', () => {
    it('splits Deluxe Edition', () => {
      const result = splitAlbumTitle('1989 (Deluxe Edition)');
      expect(result.title.trim()).toBe('1989');
      expect(result.subtitle).toBe('Deluxe Edition');
    });

    it('returns original title when no edition keyword', () => {
      const result = splitAlbumTitle('Folklore');
      expect(result.title).toBe('Folklore');
      expect(result.subtitle).toBe('');
    });
  });

  // ---------- bytesToSize ----------
  describe('bytesToSize', () => {
    it('handles bytes', () => {
      store.state.settings.lang = 'en';
      expect(bytesToSize(500)).toBe('500 Bytes');
    });

    it('handles KB', () => {
      expect(bytesToSize(2048)).toMatch(/KB$/);
    });

    it('handles MB', () => {
      expect(bytesToSize(5 * 1024 * 1024)).toMatch(/MB$/);
    });

    it('handles GB', () => {
      expect(bytesToSize(2 * 1024 * 1024 * 1024)).toMatch(/GB$/);
    });

    it('uses Chinese unit for zh lang', () => {
      store.state.settings.lang = 'zh-CN';
      expect(bytesToSize(500)).toBe('500字节');
    });
  });

  // ---------- formatTrackTime ----------
  describe('formatTrackTime', () => {
    it('formats seconds to mm:ss', () => {
      expect(formatTrackTime(65)).toBe('1:05');
      expect(formatTrackTime(0)).toBe('');
      expect(formatTrackTime(3661)).toBe('61:01');
    });

    it('returns empty for falsy values', () => {
      expect(formatTrackTime(null)).toBe('');
      expect(formatTrackTime(undefined)).toBe('');
    });
  });
});
