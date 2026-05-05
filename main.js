const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const Store = require('electron-store');

const store = new Store();
let mainWindow;

// ── Find executable ───────────────────────────────────────────────────────────
function findExecutable(name) {
  const exeName = name + (process.platform === 'win32' ? '.exe' : '');

  // 1. Packaged: resources/bin/
  try {
    const packedPath = path.join(process.resourcesPath, 'bin', exeName);
    if (fs.existsSync(packedPath)) return packedPath;
  } catch (_) {}

  // 2. Dev mode: ./bin/
  const devPath = path.join(__dirname, 'bin', exeName);
  if (fs.existsSync(devPath)) return devPath;

  // 3. System PATH
  try {
    const cmd = process.platform === 'win32' ? `where.exe ${name}` : `which ${name}`;
    const result = execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim();
    const first = result.split('\n')[0].trim();
    if (first && fs.existsSync(first)) return first;
  } catch (_) {}

  // 4. Common Windows pip locations
  if (process.platform === 'win32') {
    const localApp = process.env.LOCALAPPDATA || '';
    const candidates = [
      path.join(localApp, 'Programs', 'Python', 'Python313', 'Scripts', exeName),
      path.join(localApp, 'Programs', 'Python', 'Python312', 'Scripts', exeName),
      path.join(localApp, 'Programs', 'Python', 'Python311', 'Scripts', exeName),
    ];
    try {
      const pkgDir = path.join(localApp, 'Packages');
      if (fs.existsSync(pkgDir)) {
        const pkgs = fs.readdirSync(pkgDir).filter(d => d.startsWith('PythonSoftwareFoundation'));
        for (const pkg of pkgs) {
          const match = pkg.match(/Python\.(\d+)_/);
          if (match) {
            candidates.push(
              path.join(pkgDir, pkg, 'LocalCache', 'local-packages', `Python${match[1]}`, 'Scripts', exeName)
            );
          }
        }
      }
    } catch (_) {}
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }

  return name; // fallback
}

// ── Detect browsers ───────────────────────────────────────────────────────────
function detectBrowsers() {
  const browsers = [];
  if (process.platform === 'win32') {
    const localApp = process.env.LOCALAPPDATA || '';
    const progFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
    const progFiles86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
    const checks = [
      { id: 'chrome',  name: 'Google Chrome', paths: [
        path.join(localApp, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(progFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      ]},
      { id: 'edge', name: 'Microsoft Edge', paths: [
        path.join(progFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(progFiles86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      ]},
      { id: 'brave', name: 'Brave', paths: [
        path.join(localApp, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
        path.join(progFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      ]},
      { id: 'firefox', name: 'Firefox', paths: [
        path.join(progFiles, 'Mozilla Firefox', 'firefox.exe'),
        path.join(progFiles86, 'Mozilla Firefox', 'firefox.exe'),
      ]},
      { id: 'opera', name: 'Opera', paths: [
        path.join(localApp, 'Programs', 'Opera', 'opera.exe'),
      ]},
      { id: 'vivaldi', name: 'Vivaldi', paths: [
        path.join(localApp, 'Vivaldi', 'Application', 'vivaldi.exe'),
      ]},
    ];
    for (const b of checks) {
      if (b.paths.some(p => fs.existsSync(p))) browsers.push({ id: b.id, name: b.name });
    }
  } else if (process.platform === 'darwin') {
    const checks = [
      { id: 'chrome',  name: 'Google Chrome', app: 'Google Chrome.app' },
      { id: 'safari',  name: 'Safari',         app: 'Safari.app' },
      { id: 'firefox', name: 'Firefox',         app: 'Firefox.app' },
      { id: 'brave',   name: 'Brave Browser',   app: 'Brave Browser.app' },
      { id: 'edge',    name: 'Microsoft Edge',  app: 'Microsoft Edge.app' },
    ];
    for (const b of checks) {
      if (fs.existsSync(path.join('/Applications', b.app))) browsers.push({ id: b.id, name: b.name });
    }
  } else {
    const cmds = [
      { id: 'chrome',   name: 'Google Chrome', cmd: 'google-chrome' },
      { id: 'chromium', name: 'Chromium',       cmd: 'chromium-browser' },
      { id: 'firefox',  name: 'Firefox',         cmd: 'firefox' },
      { id: 'brave',    name: 'Brave',           cmd: 'brave-browser' },
      { id: 'edge',     name: 'Microsoft Edge',  cmd: 'microsoft-edge' },
    ];
    for (const b of cmds) {
      try { execSync(`which ${b.cmd}`, { stdio: 'ignore' }); browsers.push({ id: b.id, name: b.name }); } catch (_) {}
    }
  }
  return browsers;
}

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100, height: 720,
    minWidth: 820, minHeight: 580,
    frame: false,
    transparent: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
  });
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.handle('get-download-path', () => store.get('downloadPath', app.getPath('music')));

ipcMain.handle('set-download-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'], title: 'Escolher pasta de download',
  });
  if (!result.canceled && result.filePaths.length > 0) {
    store.set('downloadPath', result.filePaths[0]);
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-concurrent-downloads', () => store.get('concurrentDownloads', 3));
ipcMain.handle('set-concurrent-downloads', (_, val) => { store.set('concurrentDownloads', val); return val; });
ipcMain.handle('open-folder', (_, folderPath) => shell.openPath(folderPath));

ipcMain.handle('get-browser-setup', () => ({
  browsers: detectBrowsers(),
  chosen: store.get('browserForCookies', null),
  setupDone: store.get('setupDone', false),
}));

ipcMain.handle('save-browser-choice', (_, browserId) => {
  store.set('browserForCookies', browserId);
  store.set('setupDone', true);
  return true;
});

ipcMain.handle('skip-browser-setup', () => {
  store.set('setupDone', true);
  store.set('browserForCookies', null);
  return true;
});

ipcMain.handle('check-tools', async () => {
  return {
    ytdlp:  !!findExecutable('yt-dlp'),
    ffmpeg: !!findExecutable('ffmpeg'),
    python: !!findExecutable('python'),
  };
});

// ── Active processes ──────────────────────────────────────────────────────────
const activeProcesses = new Map();

// ── Parallel download settings ────────────────────────────────────────────────
ipcMain.handle('get-parallel-enabled',   () => store.get('parallelEnabled', false));
ipcMain.handle('set-parallel-enabled',   (_, val) => { store.set('parallelEnabled', val); return val; });
ipcMain.handle('get-parallel-downloads', () => store.get('parallelDownloads', 3));
ipcMain.handle('set-parallel-downloads', (_, val) => { store.set('parallelDownloads', val); return val; });

// ── Parallel queue ────────────────────────────────────────────────────────────
// When parallel mode is ON, each URL submitted gets its own independent
// download process up to `parallelDownloads` running simultaneously.
// When parallel mode is OFF this map is never used and behaviour is unchanged.
const parallelQueue   = [];   // pending { event, opts, resolve }
let   parallelRunning = 0;

function drainParallelQueue() {
  const limit = store.get('parallelDownloads', 3);
  while (parallelRunning < limit && parallelQueue.length > 0) {
    const { event, opts, resolve } = parallelQueue.shift();
    parallelRunning++;
    const runner = opts.url.includes('spotify.com') ? runSpotdl : runYtdlp;
    const browserForCookies = store.get('browserForCookies', null);
    runner(event, { ...opts, browserForCookies })
      .then(result => { resolve(result); })
      .finally(() => { parallelRunning--; drainParallelQueue(); });
  }
}

ipcMain.handle('start-download', async (event, { url, downloadPath, concurrent, sessionId }) => {
  const browserForCookies = store.get('browserForCookies', null);
  console.log('[spotwave] browserForCookies:', browserForCookies);
  const isSpotify = url.includes('spotify.com');

  const parallelEnabled = store.get('parallelEnabled', false);

  if (parallelEnabled) {
    // Queue the job and let drainParallelQueue control concurrency
    return new Promise(resolve => {
      parallelQueue.push({ event, opts: { url, downloadPath, concurrent, sessionId }, resolve });
      drainParallelQueue();
    });
  }

  // Original behaviour (parallel OFF)
  if (isSpotify) {
    return runSpotdl(event, { url, downloadPath, concurrent, sessionId, browserForCookies });
  } else {
    return runYtdlp(event, { url, downloadPath, concurrent, sessionId, browserForCookies });
  }
});

// ── spotdl runner ─────────────────────────────────────────────────────────────
function runSpotdl(event, { url, downloadPath, concurrent, sessionId, browserForCookies }) {
  const PYTHON = findExecutable('python');

  const args = [
    '-m', 'spotdl', 'download', url,
    '--output', path.join(downloadPath, '{title}.{output-ext}'),
    '--threads', String(concurrent),
    '--format', 'mp3',
    '--bitrate', '320k',
  ];

  if (browserForCookies) {
    args.push('--cookie-file', `from-browser:${browserForCookies}`);
  }

  return runProcess(event, PYTHON, args, downloadPath, sessionId, 'spotdl');
}

// ── yt-dlp helpers ────────────────────────────────────────────────────────────
function getBrowserProcessName(browserId) {
  const names = {
    vivaldi: 'vivaldi.exe',
    chrome:  'chrome.exe',
    edge:    'msedge.exe',
    brave:   'brave.exe',
    firefox: 'firefox.exe',
    opera:   'opera.exe',
  };
  return names[browserId] || null;
}

function isBrowserRunning(processName) {
  try {
    const out = execSync(`tasklist /FI "IMAGENAME eq ${processName}" /NH`, { encoding: 'utf8' });
    return out.toLowerCase().includes(processName.toLowerCase());
  } catch { return false; }
}

function killBrowser(processName) {
  try { execSync(`taskkill /IM "${processName}" /F /T`, { stdio: 'ignore' }); } catch {}
  try { execSync(`taskkill /IM "${processName}" /F`, { stdio: 'ignore' }); } catch {}
}

function restartBrowser(browserId) {
  const localApp = process.env.LOCALAPPDATA || '';
  const progFiles = process.env.PROGRAMFILES || '';
  const exePaths = {
    vivaldi: [path.join(localApp, 'Vivaldi', 'Application', 'vivaldi.exe')],
    chrome:  [path.join(localApp, 'Google', 'Chrome', 'Application', 'chrome.exe'), path.join(progFiles, 'Google', 'Chrome', 'Application', 'chrome.exe')],
    edge:    [path.join(progFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe')],
    brave:   [path.join(localApp, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')],
    firefox: [path.join(progFiles, 'Mozilla Firefox', 'firefox.exe')],
  };
  for (const p of (exePaths[browserId] || [])) {
    if (fs.existsSync(p)) {
      spawn(p, [], { detached: true, stdio: 'ignore' }).unref();
      return;
    }
  }
}

// ── yt-dlp runner ─────────────────────────────────────────────────────────────
async function runYtdlp(event, { url, downloadPath, concurrent, sessionId, browserForCookies }) {
  const YTDLP = findExecutable('yt-dlp');
  const outputTemplate = path.join(downloadPath, '%(title)s.%(ext)s');

  const args = [
    url,
    '-f', 'bestaudio/best',
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '--embed-thumbnail',
    '--embed-metadata',
    '--add-metadata',
    '--parse-metadata', 'playlist_title:%(album)s',
    '--rm-cache-dir',
    '--retries', '3',
    '--fragment-retries', '3',
    '--concurrent-fragments', String(concurrent),
    '-o', outputTemplate,
    '--newline',
    '--progress',
    '--no-warnings',
    '--postprocessor-args', 'ffmpeg:-id3v2_version 3',
  ];

  if (browserForCookies) {
    const cookiesFile = path.join(app.getPath('userData'), 'yt_cookies.txt');
    const cookiesExist = fs.existsSync(cookiesFile) && fs.statSync(cookiesFile).size > 500;

    if (cookiesExist) {
      console.log('[spotwave] Usando cookies guardadas:', cookiesFile);
      args.push('--cookies', cookiesFile);
    } else {
      const processName = getBrowserProcessName(browserForCookies);
      const wasRunning = processName ? isBrowserRunning(processName) : false;

      if (wasRunning) {
        console.log(`[spotwave] Primeira extração — a fechar ${processName}...`);
        event.sender.send('download-progress', { sessionId, type: 'song-start', song: 'A extrair cookies do browser...' });
        killBrowser(processName);
      }

      await new Promise(r => setTimeout(r, 4000));

      const extractArgs = [
        '--cookies-from-browser', browserForCookies,
        '--cookies', cookiesFile,
        '--skip-download',
        '--no-playlist',
        'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      ];

      console.log('[spotwave] A extrair cookies...');
      let cookiesExtracted = false;

      await new Promise(resolve => {
        const p = spawn(YTDLP, extractArgs, { env: { ...process.env, PYTHONUTF8: '1' } });
        const onData = (d) => {
          const text = d.toString();
          if (/Extracted \d+ cookies/i.test(text)) {
            cookiesExtracted = true;
            console.log('[spotwave] Cookies extraídas!');
            p.kill();
          }
          for (const line of text.split('\n'))
            if (line.trim()) console.log('[cookie-extract]', line.trim());
        };
        p.stdout.on('data', onData);
        p.stderr.on('data', onData);
        const timeout = setTimeout(() => { p.kill(); resolve(); }, 20000);
        p.on('close', () => { clearTimeout(timeout); resolve(); });
        p.on('error', () => { clearTimeout(timeout); resolve(); });
      });

      if (wasRunning) restartBrowser(browserForCookies);

      const fileOk = fs.existsSync(cookiesFile) && fs.statSync(cookiesFile).size > 500;
      if (cookiesExtracted || fileOk) {
        console.log('[spotwave] Cookies prontas:', cookiesFile);
        args.push('--cookies', cookiesFile);
      } else {
        console.log('[spotwave] Fallback para --cookies-from-browser');
        args.push('--cookies-from-browser', browserForCookies);
      }
    }
  }

  return runProcess(event, YTDLP, args, downloadPath, sessionId, 'ytdlp');
}

// ── Generic process runner ────────────────────────────────────────────────────
function runProcess(event, exe, args, cwd, sessionId, tool) {
  return new Promise((resolve) => {
    let proc;
    try {
      proc = spawn(exe, args, { cwd, env: { ...process.env } });
    } catch (e) {
      event.sender.send('download-error', { sessionId, error: e.message });
      resolve({ success: false });
      return;
    }

    activeProcesses.set(sessionId, proc);

    const completedFiles = [];
    let downloadedCount = 0;
    let totalSongs = 0;
    let errorCount = 0;

    const parseLine = (line) => {
      line = line.trim();
      if (!line) return;
      console.log(`[${tool}]`, line);

      if (tool === 'spotdl') {
        const totalMatch = line.match(/Found\s+(\d+)\s+song/i);
        if (totalMatch) {
          totalSongs = parseInt(totalMatch[1]);
          event.sender.send('download-progress', { sessionId, type: 'total', total: totalSongs });
        }
        if (line.match(/Downloading\s+.+/i) && !line.includes('%')) {
          const name = line.replace(/.*Downloading\s+/i, '').replace(/\.\.\./i, '').trim();
          event.sender.send('download-progress', { sessionId, type: 'song-start', song: name });
        }
        const pctMatch = line.match(/(\d+(\.\d+)?)%/);
        if (pctMatch) {
          event.sender.send('download-progress', { sessionId, type: 'song-progress', percent: parseFloat(pctMatch[1]) });
        }
        if (line.match(/Downloaded\s+/i) || line.match(/Skipping\s+/i)) {
          downloadedCount++;
          const name = line.replace(/.*(?:Downloaded|Skipping)\s+/i, '').trim() || `Faixa ${downloadedCount}`;
          completedFiles.push(name);
          event.sender.send('download-progress', { sessionId, type: 'song-done', song: name, count: downloadedCount, total: totalSongs });
        }
        if (line.match(/\berror\b/i) && !line.includes('%')) {
          errorCount++;
          event.sender.send('download-progress', { sessionId, type: 'song-error', message: line, errorCount });
        }
      }

      if (tool === 'ytdlp') {
        const plMatch = line.match(/\[download\] Downloading (?:item|video) (\d+) of (\d+)/i);
        if (plMatch) {
          totalSongs = parseInt(plMatch[2]);
          downloadedCount = parseInt(plMatch[1]) - 1;
          if (totalSongs > 1) event.sender.send('download-progress', { sessionId, type: 'total', total: totalSongs });
        }
        const destMatch = line.match(/\[(?:ExtractAudio|Merger|ffmpeg)\] Destination: (.+)/i);
        if (destMatch) {
          const name = path.basename(destMatch[1]);
          downloadedCount++;
          completedFiles.push(name);
          event.sender.send('download-progress', { sessionId, type: 'song-done', song: name, count: downloadedCount, total: totalSongs || 1 });
        }
        const pctMatch = line.match(/(\d+\.?\d*)%(?:\s+of\s+|)/);
        if (pctMatch) {
          const pct = parseFloat(pctMatch[1]);
          // yt-dlp download phase = 0-70%, postprocess (ffmpeg) = 70-100%
          event.sender.send('download-progress', { sessionId, type: 'song-progress', percent: pct * 0.7 });
        }
        const dlMatch = line.match(/\[youtube.*\].*: Downloading webpage/i) ||
                        line.match(/\[download\] Destination: (.+)/i);
        if (dlMatch) {
          const name = dlMatch[1] ? path.basename(dlMatch[1]) : 'A baixar...';
          event.sender.send('download-progress', { sessionId, type: 'song-start', song: name });
        }
        // ffmpeg / postprocessing started → jump bar to 70%
        if (line.match(/\[(?:ExtractAudio|ffmpeg|Merger)\]/i) && !line.match(/Destination/i)) {
          event.sender.send('download-progress', { sessionId, type: 'song-progress', percent: 85 });
        }
        if (line.match(/ERROR:/i)) {
          errorCount++;
          event.sender.send('download-progress', { sessionId, type: 'song-error', message: line, errorCount });
        }
      }
    };

    let buf = '';
    const onData = (data) => {
      const raw = data.toString();
      // Send raw output to frontend for live terminal
      event.sender.send('download-raw', { sessionId, text: raw });
      buf += raw;
      // Split on both \n and \r so yt-dlp progress lines (\r) are parsed too
      const lines = buf.split(/[\r\n]/);
      buf = lines.pop();
      lines.forEach(parseLine);
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);

    proc.on('close', (code) => {
      activeProcesses.delete(sessionId);
      if (buf) parseLine(buf);
      if (totalSongs === 0 && downloadedCount > 0) totalSongs = downloadedCount;
      event.sender.send('download-complete', { sessionId, success: code === 0, files: completedFiles, downloadPath: cwd, errorCount });
      resolve({ success: code === 0 });
    });

    proc.on('error', (err) => {
      event.sender.send('download-error', { sessionId, error: `Não foi possível iniciar o ${tool}.\n\n${err.message}` });
      resolve({ success: false });
    });
  });
}

ipcMain.handle('cancel-download', (_, sessionId) => {
  const proc = activeProcesses.get(sessionId);
  if (proc) { proc.kill(); activeProcesses.delete(sessionId); }
});
