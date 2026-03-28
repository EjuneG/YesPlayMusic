import store from '@/store';

const player = store.state.player;

export function ipcRenderer(vueInstance) {
  const self = vueInstance;
  const api = window.electronAPI;

  document.body.setAttribute('data-electron', 'yes');
  document.body.setAttribute('data-electron-os', api.platform);

  api.on('changeRouteTo', path => {
    self.$router.push(path);
    if (store.state.showLyrics) {
      store.commit('toggleLyrics');
    }
  });

  api.on('search', () => {
    self.$refs.navbar.$refs.searchInput.focus();
    self.$refs.navbar.inputFocus = true;
  });

  api.on('play', () => {
    player.playOrPause();
  });

  api.on('next', () => {
    if (player.isPersonalFM) {
      player.playNextFMTrack();
    } else {
      player.playNextTrack();
    }
  });

  api.on('previous', () => {
    player.playPrevTrack();
  });

  api.on('increaseVolume', () => {
    if (player.volume + 0.1 >= 1) {
      return (player.volume = 1);
    }
    player.volume += 0.1;
  });

  api.on('decreaseVolume', () => {
    if (player.volume - 0.1 <= 0) {
      return (player.volume = 0);
    }
    player.volume -= 0.1;
  });

  api.on('like', () => {
    store.dispatch('likeATrack', player.currentTrack.id);
  });

  api.on('repeat', () => {
    player.switchRepeatMode();
  });

  api.on('shuffle', () => {
    player.switchShuffle();
  });

  api.on('routerGo', where => {
    self.$refs.navbar.go(where);
  });

  api.on('nextUp', () => {
    self.$refs.player.goToNextTracksPage();
  });

  api.on('rememberCloseAppOption', value => {
    store.commit('updateSettings', {
      key: 'closeAppOption',
      value,
    });
  });

  api.on('setPosition', position => {
    player._howler.seek(position);
  });
}
