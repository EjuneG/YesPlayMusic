/**
 * Build the Electron main process with esbuild.
 * Outputs to dist-electron/main.js
 */
const esbuild = require('esbuild');
const path = require('path');

const ESBUILD_COMMON = {
  bundle: true,
  platform: 'node',
  target: 'node16',
  external: [
    'electron',
    'electron-updater',
    'electron-devtools-installer',
    'electron-store',
    'electron-log',
    'electron-is-dev',
    'express',
    'express-http-proxy',
    '@neteaseapireborn/api',
    '@unblockneteasemusic/rust-napi',
    'mpris-service',
    'discord-rich-presence',
    'dbus-next',
  ],
  alias: {
    '@': path.resolve(__dirname, '../src'),
  },
  define: {
    'process.env.IS_ELECTRON': 'true',
    'process.env.NODE_ENV': JSON.stringify(
      process.env.NODE_ENV || 'production'
    ),
  },
  format: 'cjs',
  sourcemap: true,
};

Promise.all([
  esbuild.build({
    ...ESBUILD_COMMON,
    entryPoints: [path.resolve(__dirname, '../src/background.js')],
    outfile: path.resolve(__dirname, '../dist-electron/main.js'),
  }),
  esbuild.build({
    ...ESBUILD_COMMON,
    entryPoints: [path.resolve(__dirname, '../src/preload.js')],
    outfile: path.resolve(__dirname, '../dist-electron/preload.js'),
  }),
])
  .then(() => {
    console.log('Electron main + preload built successfully.');
  })
  .catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
