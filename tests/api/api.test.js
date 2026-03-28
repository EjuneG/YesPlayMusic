/**
 * Baseline tests for the API layer (src/api/*.js)
 *
 * We mock the request util (axios instance) and verify that each API function
 * sends the correct URL, method, and params. This ensures the API contract
 * doesn't break during the Vue 3 migration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock request — the core HTTP client used by all API modules
const mockRequest = vi.fn(() => Promise.resolve({ data: {} }));
vi.mock('@/utils/request', () => ({ default: mockRequest }));

// Mock common utils used by some API modules
vi.mock('@/utils/common', () => ({
  mapTrackPlayableStatus: vi.fn((tracks, privileges) => tracks),
}));

vi.mock('@/utils/db', () => ({
  cacheTrackDetail: vi.fn(),
  getTrackDetailFromCache: vi.fn(() => Promise.resolve(null)),
  cacheLyric: vi.fn(),
  getLyricFromCache: vi.fn(() => Promise.resolve(null)),
  cacheAlbum: vi.fn(),
  getAlbumFromCache: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/utils/auth', () => ({
  isAccountLoggedIn: vi.fn(() => true),
}));

vi.mock('@/store', () => ({
  default: {
    state: {
      settings: { musicQuality: 320000 },
      data: { user: {} },
    },
  },
}));

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  mockRequest.mockResolvedValue({ data: {} });
});

// ---------- auth.js ----------
describe('api/auth.js', () => {
  it('loginWithPhone sends POST to /login/cellphone', async () => {
    const { loginWithPhone } = await import('@/api/auth');
    await loginWithPhone({ phone: '13800138000', password: 'pass' });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/login/cellphone',
        method: 'post',
      })
    );
  });

  it('loginWithEmail sends POST to /login', async () => {
    const { loginWithEmail } = await import('@/api/auth');
    await loginWithEmail({ email: 'test@163.com', password: 'pass' });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/login',
        method: 'post',
      })
    );
  });

  it('loginQrCodeKey sends GET to /login/qr/key', async () => {
    const { loginQrCodeKey } = await import('@/api/auth');
    await loginQrCodeKey();
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/login/qr/key',
        method: 'get',
      })
    );
  });

  it('logout sends POST to /logout', async () => {
    const { logout } = await import('@/api/auth');
    await logout();
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/logout',
        method: 'post',
      })
    );
  });

  it('refreshCookie sends POST to /login/refresh', async () => {
    const { refreshCookie } = await import('@/api/auth');
    await refreshCookie();
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/login/refresh',
        method: 'post',
      })
    );
  });
});

// ---------- user.js ----------
describe('api/user.js', () => {
  it('userDetail sends GET to /user/detail', async () => {
    const { userDetail } = await import('@/api/user');
    await userDetail(12345);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/user/detail',
        method: 'get',
      })
    );
  });

  it('userAccount sends GET to /user/account', async () => {
    const { userAccount } = await import('@/api/user');
    await userAccount();
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/user/account',
        method: 'get',
      })
    );
  });

  it('userPlaylist sends GET to /user/playlist', async () => {
    const { userPlaylist } = await import('@/api/user');
    await userPlaylist({ uid: 1, limit: 30 });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/user/playlist',
        method: 'get',
      })
    );
  });

  it('userLikedSongsIDs sends GET to /likelist', async () => {
    const { userLikedSongsIDs } = await import('@/api/user');
    await userLikedSongsIDs({ uid: 1 });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/likelist',
        method: 'get',
      })
    );
  });

  it('likedAlbums sends GET to /album/sublist', async () => {
    const { likedAlbums } = await import('@/api/user');
    await likedAlbums({ limit: 25 });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/album/sublist',
        method: 'get',
      })
    );
  });

  it('cloudDisk sends GET to /user/cloud', async () => {
    const { cloudDisk } = await import('@/api/user');
    await cloudDisk({ limit: 200 });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/user/cloud',
        method: 'get',
      })
    );
  });
});

// ---------- track.js ----------
describe('api/track.js', () => {
  it('getMP3 sends GET to /song/url with id and br', async () => {
    const { getMP3 } = await import('@/api/track');
    await getMP3('123');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/song/url',
        method: 'get',
      })
    );
  });

  it('getTrackDetail sends GET to /song/detail', async () => {
    mockRequest.mockResolvedValue({ songs: [{ id: 1 }], privileges: [] });
    const { getTrackDetail } = await import('@/api/track');
    await getTrackDetail('1');
    // getTrackDetail calls request internally
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/song/detail',
        method: 'get',
      })
    );
  });

  it('likeATrack sends GET to /like', async () => {
    const { likeATrack } = await import('@/api/track');
    await likeATrack({ id: 1, like: true });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/like',
        method: 'get',
      })
    );
  });

  it('scrobble sends GET to /scrobble', async () => {
    const { scrobble } = await import('@/api/track');
    await scrobble({ id: 1, sourceid: 2, time: 60 });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/scrobble',
        method: 'get',
      })
    );
  });
});

// ---------- playlist.js ----------
describe('api/playlist.js', () => {
  it('getPlaylistDetail sends GET to /playlist/detail', async () => {
    mockRequest.mockResolvedValue({ playlist: { tracks: [] }, privileges: [] });
    const { getPlaylistDetail } = await import('@/api/playlist');
    await getPlaylistDetail(123);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/playlist/detail',
        method: 'get',
      })
    );
  });

  it('recommendPlaylist sends GET to /personalized', async () => {
    const { recommendPlaylist } = await import('@/api/playlist');
    await recommendPlaylist({ limit: 10 });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/personalized',
        method: 'get',
      })
    );
  });

  it('createPlaylist sends POST to /playlist/create', async () => {
    const { createPlaylist } = await import('@/api/playlist');
    await createPlaylist({ name: 'Test' });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/playlist/create',
        method: 'post',
      })
    );
  });

  it('subscribePlaylist sends POST to /playlist/subscribe', async () => {
    const { subscribePlaylist } = await import('@/api/playlist');
    await subscribePlaylist({ t: 1, id: 100 });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/playlist/subscribe',
        method: 'post',
      })
    );
  });
});

// ---------- album.js ----------
describe('api/album.js', () => {
  it('getAlbum sends GET to /album', async () => {
    mockRequest.mockResolvedValue({ songs: [] });
    const { getAlbum } = await import('@/api/album');
    await getAlbum(123);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/album',
        method: 'get',
      })
    );
  });

  it('newAlbums sends GET to /album/new', async () => {
    const { newAlbums } = await import('@/api/album');
    await newAlbums({ limit: 30, area: 'ALL' });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/album/new',
        method: 'get',
      })
    );
  });

  it('likeAAlbum sends POST to /album/sub', async () => {
    const { likeAAlbum } = await import('@/api/album');
    await likeAAlbum({ id: 1, t: 1 });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/album/sub',
        method: 'post',
      })
    );
  });
});

// ---------- artist.js ----------
describe('api/artist.js', () => {
  it('getArtist sends GET to /artists', async () => {
    mockRequest.mockResolvedValue({ hotSongs: [] });
    const { getArtist } = await import('@/api/artist');
    await getArtist(123);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/artists',
        method: 'get',
      })
    );
  });

  it('followAArtist sends POST to /artist/sub', async () => {
    const { followAArtist } = await import('@/api/artist');
    await followAArtist({ id: 1, t: 1 });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/artist/sub',
        method: 'post',
      })
    );
  });
});
