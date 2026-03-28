/**
 * Electron development script:
 * 1. Start Vite dev server
 * 2. Parse Vite output to get actual port
 * 3. Build main process with esbuild
 * 4. Launch Electron pointing at the Vite dev server
 */
const { spawn } = require('child_process');
const esbuild = require('esbuild');
const path = require('path');

const ESBUILD_EXTERNAL = [
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
];

const ESBUILD_COMMON = {
  bundle: true,
  platform: 'node',
  target: 'node16',
  external: ESBUILD_EXTERNAL,
  alias: { '@': path.resolve(__dirname, '../src') },
  define: {
    'process.env.IS_ELECTRON': 'true',
    'process.env.NODE_ENV': '"development"',
  },
  format: 'cjs',
  sourcemap: true,
};

function buildMainProcess() {
  return Promise.all([
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
  ]);
}

async function main() {
  // 1. Build main process first (doesn't depend on Vite port)
  console.log('Building Electron main process...');
  await buildMainProcess();
  console.log('Main process built.');

  // 2. Start Vite and parse its output to get the actual URL
  console.log('Starting Vite dev server...');
  const viteProcess = spawn('npx', ['vite', '--port', '20201'], {
    shell: true,
    env: { ...process.env, IS_ELECTRON: 'true' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const viteUrl = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Vite startup timeout')), 15000);
    let output = '';

    const onData = chunk => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
      // Parse: "  ➜  Local:   http://localhost:20201/"
      const match = output.match(/Local:\s+(https?:\/\/[^\s/]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    };

    viteProcess.stdout.on('data', onData);
    viteProcess.stderr.on('data', chunk => {
      process.stderr.write(chunk);
    });
    viteProcess.on('error', reject);
    viteProcess.on('close', code => {
      clearTimeout(timeout);
      reject(new Error(`Vite exited with code ${code}`));
    });
  });

  console.log(`\nVite ready at: ${viteUrl}`);

  // Pipe remaining Vite output to console
  viteProcess.stdout.on('data', chunk => process.stdout.write(chunk));
  viteProcess.stderr.on('data', chunk => process.stderr.write(chunk));

  // 3. Launch Electron with the Vite URL in env
  console.log('Launching Electron...');
  const electronPath = require('electron');
  const electronProcess = spawn(
    String(electronPath),
    [path.resolve(__dirname, '../dist-electron/main.js')],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: viteUrl,
        IS_ELECTRON: 'true',
      },
    }
  );

  electronProcess.on('close', () => {
    viteProcess.kill();
    process.exit();
  });

  process.on('SIGINT', () => {
    electronProcess.kill();
    viteProcess.kill();
    process.exit();
  });

  process.on('SIGTERM', () => {
    electronProcess.kill();
    viteProcess.kill();
    process.exit();
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
