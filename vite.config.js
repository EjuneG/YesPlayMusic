import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import path from 'path';

const isElectron = process.env.IS_ELECTRON === 'true';

export default defineConfig({
  plugins: [
    vue(),
    createSvgIconsPlugin({
      iconDirs: [path.resolve(process.cwd(), 'src/assets/icons')],
      symbolId: 'icon-[name]',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['legacy-js-api'],
      },
    },
  },
  build: {
    cssMinify: false,
  },
  server: {
    port: process.env.DEV_SERVER_PORT || 20201,
    proxy: isElectron
      ? undefined
      : {
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            rewrite: path => path.replace(/^\/api/, '/'),
          },
        },
  },
  define: {
    'process.platform': JSON.stringify(isElectron ? process.platform : ''),
    'process.env': JSON.stringify({
      IS_ELECTRON: isElectron,
      VUE_APP_NETEASE_API_URL: '/api',
      VUE_APP_ELECTRON_API_URL: '/api',
      VUE_APP_ELECTRON_API_URL_DEV: 'http://127.0.0.1:10754',
      VUE_APP_LASTFM_API_KEY: '09c55292403d961aa517ff7f5e8a3d9c',
      VUE_APP_LASTFM_API_SHARED_SECRET: '307c9fda32b3904e53654baff215cb67',
    }),
  },
});
