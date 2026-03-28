/**
 * Baseline tests for src/store/mutations.js
 *
 * We test mutations as plain functions — no Vuex instantiation needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/shortcuts', () => ({
  default: [
    { id: 'play', name: '播放/暂停', shortcut: 'Ctrl+P', globalShortcut: 'Alt+Ctrl+P' },
    { id: 'next', name: '下一首', shortcut: 'Ctrl+Right', globalShortcut: 'Alt+Ctrl+Right' },
  ],
}));

import mutations from '@/store/mutations';

function makeState() {
  return {
    showLyrics: false,
    enableScrolling: true,
    title: 'YesPlayMusic',
    liked: {
      songs: [],
      songsWithDetails: [],
      playlists: [],
      albums: [],
    },
    settings: {
      lang: 'zh-CN',
      musicQuality: 320000,
      lyricFontSize: 28,
      outputDevice: 'default',
      enabledPlaylistCategories: ['华语', '欧美', '流行'],
      shortcuts: [
        { id: 'play', shortcut: 'Ctrl+P', globalShortcut: 'Alt+Ctrl+P' },
        { id: 'next', shortcut: 'Ctrl+Right', globalShortcut: 'Alt+Ctrl+Right' },
      ],
    },
    data: { user: {}, loginMode: null },
    player: { sendSelfToIpcMain: vi.fn() },
    toast: { show: false, text: '', timer: null },
    modals: {
      addTrackToPlaylistModal: { show: false, selectedTrackID: 0 },
    },
    dailyTracks: [],
    lastfm: {},
  };
}

describe('mutations.js', () => {
  let state;

  beforeEach(() => {
    state = makeState();
  });

  // --- updateLikedXXX ---
  it('updateLikedXXX updates liked[name] and calls sendSelfToIpcMain for songs', () => {
    mutations.updateLikedXXX(state, { name: 'songs', data: [1, 2, 3] });
    expect(state.liked.songs).toEqual([1, 2, 3]);
    expect(state.player.sendSelfToIpcMain).toHaveBeenCalled();
  });

  it('updateLikedXXX does NOT call sendSelfToIpcMain for non-songs', () => {
    mutations.updateLikedXXX(state, { name: 'albums', data: ['a'] });
    expect(state.liked.albums).toEqual(['a']);
    expect(state.player.sendSelfToIpcMain).not.toHaveBeenCalled();
  });

  // --- changeLang ---
  it('changeLang sets lang', () => {
    mutations.changeLang(state, 'en');
    expect(state.settings.lang).toBe('en');
  });

  // --- changeMusicQuality ---
  it('changeMusicQuality sets musicQuality', () => {
    mutations.changeMusicQuality(state, 128000);
    expect(state.settings.musicQuality).toBe(128000);
  });

  // --- changeLyricFontSize ---
  it('changeLyricFontSize sets lyricFontSize', () => {
    mutations.changeLyricFontSize(state, 32);
    expect(state.settings.lyricFontSize).toBe(32);
  });

  // --- changeOutputDevice ---
  it('changeOutputDevice sets outputDevice', () => {
    mutations.changeOutputDevice(state, 'speakers');
    expect(state.settings.outputDevice).toBe('speakers');
  });

  // --- updateSettings ---
  it('updateSettings sets arbitrary key', () => {
    mutations.updateSettings(state, { key: 'appearance', value: 'dark' });
    expect(state.settings.appearance).toBe('dark');
  });

  // --- updateData ---
  it('updateData sets arbitrary key on data', () => {
    mutations.updateData(state, { key: 'user', value: { name: 'test' } });
    expect(state.data.user).toEqual({ name: 'test' });
  });

  // --- togglePlaylistCategory ---
  it('togglePlaylistCategory adds category if not present', () => {
    mutations.togglePlaylistCategory(state, '日语');
    expect(state.settings.enabledPlaylistCategories).toContain('日语');
  });

  it('togglePlaylistCategory removes category if present', () => {
    mutations.togglePlaylistCategory(state, '华语');
    expect(state.settings.enabledPlaylistCategories).not.toContain('华语');
  });

  // --- updateToast ---
  it('updateToast replaces toast state', () => {
    const toast = { show: true, text: 'hello', timer: 123 };
    mutations.updateToast(state, toast);
    expect(state.toast).toEqual(toast);
  });

  // --- updateModal ---
  it('updateModal updates a specific modal key', () => {
    mutations.updateModal(state, {
      modalName: 'addTrackToPlaylistModal',
      key: 'selectedTrackID',
      value: 42,
    });
    expect(state.modals.addTrackToPlaylistModal.selectedTrackID).toBe(42);
  });

  it('updateModal disables scrolling when show=true', () => {
    vi.useFakeTimers();
    mutations.updateModal(state, {
      modalName: 'addTrackToPlaylistModal',
      key: 'show',
      value: true,
    });
    vi.advanceTimersByTime(150);
    expect(state.enableScrolling).toBe(false);
    vi.useRealTimers();
  });

  it('updateModal re-enables scrolling when show=false', () => {
    state.enableScrolling = false;
    mutations.updateModal(state, {
      modalName: 'addTrackToPlaylistModal',
      key: 'show',
      value: false,
    });
    expect(state.enableScrolling).toBe(true);
  });

  // --- toggleLyrics ---
  it('toggleLyrics flips showLyrics', () => {
    mutations.toggleLyrics(state);
    expect(state.showLyrics).toBe(true);
    mutations.toggleLyrics(state);
    expect(state.showLyrics).toBe(false);
  });

  // --- updateDailyTracks ---
  it('updateDailyTracks sets dailyTracks', () => {
    mutations.updateDailyTracks(state, [1, 2, 3]);
    expect(state.dailyTracks).toEqual([1, 2, 3]);
  });

  // --- updateLastfm ---
  it('updateLastfm sets lastfm session', () => {
    mutations.updateLastfm(state, { key: 'abc' });
    expect(state.lastfm).toEqual({ key: 'abc' });
  });

  // --- updateShortcut ---
  it('updateShortcut updates specific shortcut by id and type', () => {
    mutations.updateShortcut(state, {
      id: 'play',
      type: 'shortcut',
      shortcut: 'Ctrl+Space',
    });
    const s = state.settings.shortcuts.find(s => s.id === 'play');
    expect(s.shortcut).toBe('Ctrl+Space');
  });

  // --- restoreDefaultShortcuts ---
  it('restoreDefaultShortcuts resets to defaults', () => {
    state.settings.shortcuts = [];
    mutations.restoreDefaultShortcuts(state);
    expect(state.settings.shortcuts).toHaveLength(2);
    expect(state.settings.shortcuts[0].id).toBe('play');
  });

  // --- enableScrolling ---
  it('enableScrolling toggles when no argument', () => {
    mutations.enableScrolling(state);
    expect(state.enableScrolling).toBe(false);
  });

  it('enableScrolling sets to given value', () => {
    mutations.enableScrolling(state, true);
    expect(state.enableScrolling).toBe(true);
  });

  // --- updateTitle ---
  it('updateTitle sets title', () => {
    mutations.updateTitle(state, 'New Title');
    expect(state.title).toBe('New Title');
  });
});
