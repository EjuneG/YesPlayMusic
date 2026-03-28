export function getSendSettingsPlugin() {
  const api = window.electronAPI;
  return store => {
    store.subscribe((mutation, state) => {
      if (mutation.type !== 'updateSettings') return;
      api.send('settings', state.settings);
    });
  };
}
