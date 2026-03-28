/**
 * Baseline tests for src/store/actions.js
 *
 * Actions are tested by calling them with a mock { state, commit, dispatch } context.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock all API dependencies ---
vi.mock('@/utils/auth', () => ({
  isAccountLoggedIn: vi.fn(() => true),
  isLooseLoggedIn: vi.fn(() => true),
}));

vi.mock('@/api/track', () => ({
  likeATrack: vi.fn(() => Promise.resolve()),
  getTrackDetail: vi.fn(() => Promise.resolve({ songs: [] })),
}));

vi.mock('@/api/playlist', () => ({
  getPlaylistDetail: vi.fn(() =>
    Promise.resolve({
      playlist: {
        trackIds: [{ id: 1 }, { id: 2 }],
      },
    })
  ),
}));

vi.mock('@/api/user', () => ({
  userPlaylist: vi.fn(() => Promise.resolve({ playlist: [{ id: 100 }] })),
  userPlayHistory: vi.fn(() =>
    Promise.resolve({ allData: [], weekData: [] })
  ),
  userLikedSongsIDs: vi.fn(() => Promise.resolve({ ids: [1, 2, 3] })),
  likedAlbums: vi.fn(() => Promise.resolve({ data: [] })),
  likedArtists: vi.fn(() => Promise.resolve({ data: [] })),
  likedMVs: vi.fn(() => Promise.resolve({ data: [] })),
  cloudDisk: vi.fn(() => Promise.resolve({ data: [] })),
  userAccount: vi.fn(() =>
    Promise.resolve({ code: 200, profile: { userId: 1 } })
  ),
}));

import actions from '@/store/actions';
import { isAccountLoggedIn, isLooseLoggedIn } from '@/utils/auth';
import { likeATrack } from '@/api/track';
import { userLikedSongsIDs, userAccount } from '@/api/user';

function makeContext(overrides = {}) {
  return {
    state: {
      toast: { show: false, text: '', timer: null },
      liked: { songs: [100, 200] },
      data: { user: { userId: 1 }, likedSongPlaylistID: 12345 },
    },
    commit: vi.fn(),
    dispatch: vi.fn(),
    ...overrides,
  };
}

describe('actions.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------- showToast ----------
  describe('showToast', () => {
    it('commits updateToast with show=true and auto-hides after 3200ms', () => {
      const ctx = makeContext();
      actions.showToast(ctx, 'Hello!');

      expect(ctx.commit).toHaveBeenCalledWith(
        'updateToast',
        expect.objectContaining({ show: true, text: 'Hello!' })
      );

      vi.advanceTimersByTime(3200);
      // second commit hides the toast
      expect(ctx.commit).toHaveBeenCalledTimes(2);
      const lastCall = ctx.commit.mock.calls[1];
      expect(lastCall[1].show).toBe(false);
    });

    it('clears existing timer before showing new toast', () => {
      const ctx = makeContext();
      ctx.state.toast.timer = setTimeout(() => {}, 9999);
      actions.showToast(ctx, 'New toast');
      // Should have called commit twice: first to hide, then to show
      expect(ctx.commit).toHaveBeenCalledTimes(2);
    });
  });

  // ---------- likeATrack ----------
  describe('likeATrack', () => {
    it('shows toast if not logged in', () => {
      isAccountLoggedIn.mockReturnValue(false);
      const ctx = makeContext();
      actions.likeATrack(ctx, 999);
      expect(ctx.dispatch).toHaveBeenCalledWith(
        'showToast',
        '此操作需要登录网易云账号'
      );
    });

    it('unlikes a track that is already liked', async () => {
      isAccountLoggedIn.mockReturnValue(true);
      const ctx = makeContext();
      ctx.state.liked.songs = [100, 200, 999];

      await actions.likeATrack(ctx, 999);

      expect(likeATrack).toHaveBeenCalledWith({ id: 999, like: false });
    });

    it('likes a track that is not liked', async () => {
      isAccountLoggedIn.mockReturnValue(true);
      const ctx = makeContext();
      ctx.state.liked.songs = [100, 200];

      await actions.likeATrack(ctx, 999);

      expect(likeATrack).toHaveBeenCalledWith({ id: 999, like: true });
    });
  });

  // ---------- fetchLikedSongs ----------
  describe('fetchLikedSongs', () => {
    it('fetches liked song IDs and commits them', async () => {
      isAccountLoggedIn.mockReturnValue(true);
      isLooseLoggedIn.mockReturnValue(true);
      const ctx = makeContext();

      await actions.fetchLikedSongs(ctx);

      expect(userLikedSongsIDs).toHaveBeenCalled();
      expect(ctx.commit).toHaveBeenCalledWith('updateLikedXXX', {
        name: 'songs',
        data: [1, 2, 3],
      });
    });

    it('does nothing if not loosely logged in', async () => {
      isLooseLoggedIn.mockReturnValue(false);
      const ctx = makeContext();

      await actions.fetchLikedSongs(ctx);

      expect(userLikedSongsIDs).not.toHaveBeenCalled();
    });
  });

  // ---------- fetchUserProfile ----------
  describe('fetchUserProfile', () => {
    it('fetches and commits user profile', async () => {
      isAccountLoggedIn.mockReturnValue(true);
      const ctx = makeContext();

      await actions.fetchUserProfile(ctx);

      expect(userAccount).toHaveBeenCalled();
      expect(ctx.commit).toHaveBeenCalledWith('updateData', {
        key: 'user',
        value: { userId: 1 },
      });
    });

    it('does nothing if not account logged in', async () => {
      isAccountLoggedIn.mockReturnValue(false);
      const ctx = makeContext();

      await actions.fetchUserProfile(ctx);

      expect(userAccount).not.toHaveBeenCalled();
    });
  });
});
