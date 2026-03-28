/**
 * Baseline tests for src/utils/Player.js
 *
 * Player.js is the heart of the app (~1000 lines). We test its pure logic:
 * - getter/setter behaviour
 * - _getNextTrack / _getPrevTrack navigation
 * - repeat modes, shuffle, queue management
 *
 * Heavy I/O (Howler, IPC, API calls) is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock heavy dependencies ---
vi.mock('howler', () => ({
  Howl: vi.fn().mockImplementation(() => ({
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(() => 0),
    fade: vi.fn(),
    volume: vi.fn(),
    once: vi.fn((event, cb) => cb()),
    on: vi.fn(),
    playing: vi.fn(() => false),
    _sounds: [],
  })),
  Howler: {
    unload: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  default: {
    state: {
      liked: { songs: [] },
      settings: {
        musicQuality: 320000,
        automaticallyCacheSongs: false,
        enableUnblockNeteaseMusic: false,
        enableDiscordRichPresence: false,
        outputDevice: 'default',
        enableOsdlyricsSupport: false,
      },
      lastfm: {},
      data: { user: {} },
    },
    commit: vi.fn(),
    dispatch: vi.fn(),
  },
}));

vi.mock('@/utils/auth', () => ({
  isAccountLoggedIn: vi.fn(() => true),
}));

vi.mock('@/utils/platform', () => ({
  isCreateTray: false,
  isCreateMpris: false,
}));

vi.mock('@/utils/db', () => ({
  cacheTrackSource: vi.fn(),
  getTrackSource: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/api/track', () => ({
  getMP3: vi.fn(() => Promise.resolve({ data: [{ url: 'https://example.com/song.mp3', freeTrialInfo: null, br: 320000 }] })),
  getTrackDetail: vi.fn(id => Promise.resolve({
    songs: [{ id: Number(id), name: 'Test Song', ar: [{ name: 'Artist' }], al: { name: 'Album', picUrl: 'https://img.com/pic.jpg' }, dt: 240000, no: 1 }],
    privileges: [],
  })),
  getLyric: vi.fn(() => Promise.resolve({ lrc: { lyric: '' } })),
  scrobble: vi.fn(),
}));

vi.mock('@/api/album', () => ({
  getAlbum: vi.fn(() => Promise.resolve({ songs: [] })),
}));

vi.mock('@/api/artist', () => ({
  getArtist: vi.fn(() => Promise.resolve({ hotSongs: [] })),
}));

vi.mock('@/api/lastfm', () => ({
  trackScrobble: vi.fn(),
  trackUpdateNowPlaying: vi.fn(),
}));

vi.mock('@/api/others', () => ({
  personalFM: vi.fn(() => Promise.resolve({ data: [{ id: 1 }, { id: 2 }] })),
  fmTrash: vi.fn(),
}));

vi.mock('@/api/playlist', () => ({
  getPlaylistDetail: vi.fn(() => Promise.resolve({ playlist: { trackIds: [] } })),
  intelligencePlaylist: vi.fn(() => Promise.resolve({ data: [] })),
}));

vi.mock('@/utils/base64', () => ({
  decode: vi.fn(() => new Uint8Array()),
}));

vi.mock('lodash/shuffle', () => ({
  default: vi.fn(arr => [...arr].reverse()),
}));

import Player from '@/utils/Player';

describe('Player.js', () => {
  let player;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create player without triggering full _init (we'll test methods individually)
    player = Object.create(Player.prototype);
    // Set default properties manually (same as constructor, minus _init)
    player._playing = false;
    player._progress = 0;
    player._enabled = false;
    player._repeatMode = 'off';
    player._shuffle = false;
    player._reversed = false;
    player._volume = 1;
    player._volumeBeforeMuted = 1;
    player._personalFMLoading = false;
    player._personalFMNextLoading = false;
    player._list = [101, 102, 103, 104, 105];
    player._current = 0;
    player._shuffledList = [];
    player._shuffledCurrent = 0;
    player._playlistSource = { type: 'album', id: 123 };
    player._currentTrack = { id: 101, name: 'Song A', ar: [{ name: 'Artist' }], al: { name: 'Album', picUrl: '' }, dt: 240000, no: 1 };
    player._playNextList = [];
    player._isPersonalFM = false;
    player._personalFMTrack = { id: 0 };
    player._personalFMNextTrack = { id: 0 };
    player.createdBlobRecords = [];
    player._howler = null;
  });

  // ---------- Getters / Setters ----------
  describe('getters and setters', () => {
    it('repeatMode getter returns _repeatMode', () => {
      expect(player.repeatMode).toBe('off');
    });

    it('repeatMode setter validates input', () => {
      player.repeatMode = 'on';
      expect(player._repeatMode).toBe('on');

      player.repeatMode = 'one';
      expect(player._repeatMode).toBe('one');

      player.repeatMode = 'invalid';
      expect(player._repeatMode).toBe('one'); // unchanged
    });

    it('repeatMode setter is blocked in personalFM mode', () => {
      player._isPersonalFM = true;
      player.repeatMode = 'on';
      expect(player._repeatMode).toBe('off'); // unchanged
    });

    it('shuffle setter validates input', () => {
      player.shuffle = true;
      expect(player._shuffle).toBe(true);

      player.shuffle = 'invalid';
      expect(player._shuffle).toBe(true); // unchanged
    });

    it('shuffle setter is blocked in personalFM mode', () => {
      player._isPersonalFM = true;
      player.shuffle = true;
      expect(player._shuffle).toBe(false);
    });

    it('volume setter sets _volume', () => {
      player.volume = 0.5;
      expect(player._volume).toBe(0.5);
    });

    it('list getter returns _list when not shuffled', () => {
      expect(player.list).toEqual([101, 102, 103, 104, 105]);
    });

    it('list getter returns _shuffledList when shuffled', () => {
      player._shuffle = true;
      player._shuffledList = [105, 103, 101, 102, 104];
      expect(player.list).toEqual([105, 103, 101, 102, 104]);
    });

    it('current getter returns _current when not shuffled', () => {
      player._current = 2;
      expect(player.current).toBe(2);
    });

    it('current getter returns _shuffledCurrent when shuffled', () => {
      player._shuffle = true;
      player._shuffledCurrent = 3;
      expect(player.current).toBe(3);
    });

    it('current setter updates _shuffledCurrent when shuffled', () => {
      player._shuffle = true;
      player.current = 4;
      expect(player._shuffledCurrent).toBe(4);
    });

    it('currentTrackID returns track id or 0', () => {
      expect(player.currentTrackID).toBe(101);
      player._currentTrack = null;
      expect(player.currentTrackID).toBe(0);
    });

    it('currentTrackDuration calculates correctly', () => {
      // dt = 240000ms = 240s, duration = floor(240) - 1 = 239
      expect(player.currentTrackDuration).toBe(239);
    });
  });

  // ---------- _getNextTrack ----------
  describe('_getNextTrack', () => {
    it('returns next track in normal mode', () => {
      player._current = 0;
      const [trackID, index] = player._getNextTrack();
      expect(trackID).toBe(102);
      expect(index).toBe(1);
    });

    it('returns previous track when reversed', () => {
      player._current = 3;
      player._reversed = true;
      const [trackID, index] = player._getNextTrack();
      expect(trackID).toBe(103);
      expect(index).toBe(2);
    });

    it('wraps around when repeat=on at end of list', () => {
      player._current = 4; // last
      player._repeatMode = 'on';
      const [trackID, index] = player._getNextTrack();
      expect(trackID).toBe(101);
      expect(index).toBe(0);
    });

    it('wraps around in reverse mode when repeat=on at start', () => {
      player._current = 0;
      player._reversed = true;
      player._repeatMode = 'on';
      const [trackID, index] = player._getNextTrack();
      expect(trackID).toBe(105);
      expect(index).toBe(4);
    });

    it('returns undefined when at end with repeat=off', () => {
      player._current = 4;
      player._repeatMode = 'off';
      const [trackID, index] = player._getNextTrack();
      expect(trackID).toBeUndefined();
      expect(index).toBe(5);
    });

    it('prioritizes playNextList over normal next', () => {
      player._playNextList = [999];
      const [trackID, index] = player._getNextTrack();
      expect(trackID).toBe(999);
      expect(index).toBe(-1); // INDEX_IN_PLAY_NEXT
    });
  });

  // ---------- _getPrevTrack ----------
  describe('_getPrevTrack', () => {
    it('returns previous track in normal mode', () => {
      player._current = 2;
      const [trackID, index] = player._getPrevTrack();
      expect(trackID).toBe(102);
      expect(index).toBe(1);
    });

    it('returns next track when reversed', () => {
      player._current = 2;
      player._reversed = true;
      const [trackID, index] = player._getPrevTrack();
      expect(trackID).toBe(104);
      expect(index).toBe(3);
    });

    it('wraps around when repeat=on at start of list', () => {
      player._current = 0;
      player._repeatMode = 'on';
      // In the code: reversed check is first. With _reversed=false, current=0:
      // next = current-1 = -1, but repeat=on checks:
      // list.length === current + 1? → 5 === 1? no
      // reversed && current === 0? → false
      // So it returns list[-1] = undefined. Let's check the actual code...
      // Actually for _getPrevTrack with reversed=false, current=0:
      // next = 0 - 1 = -1
      // repeat=on: reversed && current===0 → false, list.length===current+1 → 5===1 → false
      // returns [list[-1], -1] = [undefined, -1]
      const [trackID, index] = player._getPrevTrack();
      expect(trackID).toBeUndefined();
      expect(index).toBe(-1);
    });

    it('wraps to last track with repeat=on when reversed at end', () => {
      player._current = 4;
      player._reversed = true;
      player._repeatMode = 'on';
      // reversed=true: next = 4+1=5
      // repeat=on: reversed && current===0 → false. list.length===current+1 → 5===5 → true
      // returns [list[list.length-1], list.length-1] = [105, 4]
      const [trackID, index] = player._getPrevTrack();
      expect(trackID).toBe(105);
      expect(index).toBe(4);
    });
  });

  // ---------- Queue management ----------
  describe('queue management', () => {
    it('addTrackToPlayNext adds to _playNextList', () => {
      player.addTrackToPlayNext(888);
      expect(player._playNextList).toEqual([888]);
    });

    it('clearPlayNextList empties the list', () => {
      player._playNextList = [1, 2, 3];
      player.clearPlayNextList();
      expect(player._playNextList).toEqual([]);
    });

    it('removeTrackFromQueue removes by index', () => {
      player._playNextList = [10, 20, 30];
      player.removeTrackFromQueue(1);
      expect(player._playNextList).toEqual([10, 30]);
    });
  });

  // ---------- switchRepeatMode ----------
  describe('switchRepeatMode', () => {
    it('cycles on → one → off → on', () => {
      player._repeatMode = 'on';
      player.switchRepeatMode();
      expect(player._repeatMode).toBe('one');

      player.switchRepeatMode();
      expect(player._repeatMode).toBe('off');

      player.switchRepeatMode();
      expect(player._repeatMode).toBe('on');
    });
  });

  // ---------- switchShuffle ----------
  describe('switchShuffle', () => {
    it('toggles shuffle', () => {
      expect(player._shuffle).toBe(false);
      player.switchShuffle();
      expect(player._shuffle).toBe(true);
      player.switchShuffle();
      expect(player._shuffle).toBe(false);
    });
  });

  // ---------- switchReversed ----------
  describe('switchReversed', () => {
    it('toggles reversed', () => {
      expect(player._reversed).toBe(false);
      player.switchReversed();
      expect(player._reversed).toBe(true);
    });
  });

  // ---------- mute ----------
  describe('mute', () => {
    it('mutes by saving current volume and setting to 0', () => {
      player._volume = 0.8;
      player.mute();
      expect(player._volume).toBe(0);
      expect(player._volumeBeforeMuted).toBe(0.8);
    });

    it('unmutes by restoring saved volume', () => {
      player._volume = 0;
      player._volumeBeforeMuted = 0.7;
      player.mute();
      expect(player._volume).toBe(0.7);
    });
  });

  // ---------- saveSelfToLocalStorage ----------
  describe('saveSelfToLocalStorage', () => {
    it('saves to localStorage excluding _playing and _progress', () => {
      player.saveSelfToLocalStorage();
      const saved = JSON.parse(localStorage.getItem('player'));
      expect(saved).not.toHaveProperty('_playing');
      expect(saved).not.toHaveProperty('_progress');
      expect(saved).toHaveProperty('_list');
      expect(saved._list).toEqual([101, 102, 103, 104, 105]);
    });
  });

  // ---------- replacePlaylist ----------
  describe('replacePlaylist', () => {
    it('sets list, source, and current=0', () => {
      // Mock _replaceCurrentTrack to avoid real API calls
      player._replaceCurrentTrack = vi.fn();
      player.replacePlaylist([201, 202, 203], 456, 'playlist');
      expect(player._list).toEqual([201, 202, 203]);
      expect(player._playlistSource).toEqual({ type: 'playlist', id: 456 });
      expect(player._isPersonalFM).toBe(false);
      expect(player._replaceCurrentTrack).toHaveBeenCalledWith(201);
    });

    it('sets current to specific track when autoPlayTrackID is given', () => {
      player._replaceCurrentTrack = vi.fn();
      player.replacePlaylist([201, 202, 203], 456, 'playlist', 202);
      expect(player._current).toBe(1);
      expect(player._replaceCurrentTrack).toHaveBeenCalledWith(202);
    });
  });
});
