# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YesPlayMusic — a third-party Netease Cloud Music (网易云音乐) player. Runs as both a web app and an Electron desktop client (macOS/Windows/Linux). Built with Vue 2 + Vuex + Vue Router + Howler.js.

Currently in maintenance mode (v0.4.x); a separate 2.0 Alpha exists elsewhere.

## Commands

```bash
# Install dependencies (use yarn, not npm)
yarn install

# Copy .env.example to .env before first run
cp .env.example .env

# Development
yarn dev                   # Web dev server (Vite)
yarn electron:dev          # Electron dev
yarn netease_api:run       # Run Netease API server standalone (needed for web dev)

# Build
yarn build                 # Web production build (Vite)
yarn electron:build-main   # Electron main process build

# Code quality
yarn lint                  # ESLint (vue/recommended + prettier)
yarn prettier              # Format all src/ with Prettier
```

Node.js version requirement: 14 or 16 (`engines` field in package.json).

## Architecture

### Entry Points
- **Web:** `src/main.js` → mounts Vue app
- **Electron main process:** `src/background.js` → creates BrowserWindow, starts embedded API server on port 10754, sets up IPC/tray/menu/shortcuts

### Core Layers

| Layer | Location | Notes |
|-------|----------|-------|
| Views (pages) | `src/views/` | Lazy-loaded route components |
| Components | `src/components/` | Reusable UI (Player, Navbar, TrackList, Modals) |
| Router | `src/router/index.js` | Hash mode for Electron, history for web. Meta flags: `keepAlive`, `savePosition`, `requireLogin`, `requireAccountLogin` |
| State (Vuex) | `src/store/` | `state.js`, `mutations.js`, `actions.js`. Plugins in `store/plugins/` persist to localStorage and sync to Electron main process |
| API | `src/api/` | One module per domain: `track.js`, `playlist.js`, `user.js`, `auth.js`, `artist.js`, `album.js`, `lastfm.js`, `others.js` |
| Player engine | `src/utils/Player.js` | ~1000-line class using Howler.js. Manages queue, shuffle/repeat, Personal FM mode. Wrapped in Proxy for auto-persistence to localStorage |
| Electron IPC | `src/electron/` | `ipcMain.js` / `ipcRenderer.js` for cross-process communication; `tray.js`, `menu.js`, `mpris.js` (Linux), `globalShortcut.js` |
| Data cache | `src/utils/db.js` | Dexie (IndexedDB) for caching track details & lyrics |
| HTTP client | `src/utils/request.js` | Axios instance, injects `MUSIC_U` cookie, 15s timeout |

### State Shape (Vuex store)

Key top-level state sections:
- `settings` — user preferences (language, theme, music quality, shortcuts, etc.)
- `data.user` — logged-in user info
- `liked` — user's liked songs/playlists/albums/artists/MVs/cloudDisk
- `player` — the Player.js instance (Proxy-wrapped)

### Authentication
Three login methods: phone, email, QR code. Cookie-based (`MUSIC_U`). Two auth levels: loose login (guest/phone) vs account login (full account). Managed in `src/utils/auth.js` and `src/api/auth.js`.

### Path Alias
`@/` maps to `src/` (configured in `jsconfig.json` and `vue.config.js`).

## Code Style

- Prettier: single quotes, trailing commas (es5), 2-space indent, no semicolons omission, arrow parens "avoid", LF line endings
- ESLint: `plugin:vue/recommended` + `@vue/prettier`
- Vue 2 Options API throughout (no Composition API)
