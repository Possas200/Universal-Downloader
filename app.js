// ══════════════════════════════════════════════
//  SpotWave — Frontend Controller
// ══════════════════════════════════════════════

const $ = (sel) => document.querySelector(sel);

// ── State ──
const state = {
  page: 'home',           // 'home' | 'download' | 'settings'
  downloadPath: '',
  concurrent: 3,
  sessionId: null,
  songs: {},              // { name: { status, percent } }
  totalSongs: 0,
  doneSongs: 0,
  errorSongs: 0,
  currentSong: null,
  downloadedFiles: [],
  lastDownloadPath: '',
};

// ── Page navigation ──
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $(`#page-${name}`).classList.add('active');
  state.page = name;
}

// ── Init ──
async function init() {
  state.downloadPath = await window.api.getDownloadPath();
  state.concurrent   = await window.api.getConcurrentDownloads();

  updatePathDisplay();
  updateConcurrentDisplay();

  // Settings: spotdl version
  const ver = await window.api.getSpotdlVersion();
  $('#spotdl-version').textContent = ver || 'não encontrado';
  if (!ver) $('#spotdl-version').style.color = 'var(--red)';

  // Settings path
  $('#settings-path-display').textContent = state.downloadPath;
}

function updatePathDisplay() {
  $('#path-display').textContent = state.downloadPath;
  $('#settings-path-display').textContent = state.downloadPath;
}

function updateConcurrentDisplay() {
  $('#concurrent-val').textContent = state.concurrent;
}

// ── Download logic ──
function generateSessionId() {
  return `dl_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function detectType(url) {
  if (url.includes('playlist')) return 'Playlist';
  if (url.includes('album'))    return 'Álbum';
  return 'Música';
}

function startDownload(url) {
  const trimmed = url.trim();
  if (!trimmed) return showToast('Cola um link válido primeiro.');

  // Basic URL validation
  const validHosts = ['open.spotify.com', 'spotify.com', 'youtube.com', 'youtu.be', 'music.youtube.com'];
  let isValid = false;
  try {
    const u = new URL(trimmed);
    isValid = validHosts.some(h => u.hostname.includes(h));
  } catch {
    isValid = false;
  }
  if (!isValid) return showToast('Link não reconhecido. Usa Spotify, YouTube ou YouTube Music.');

  // Reset state
  state.sessionId = generateSessionId();
  state.songs = {};
  state.totalSongs = 0;
  state.doneSongs = 0;
  state.errorSongs = 0;
  state.currentSong = null;
  state.downloadedFiles = [];
  state.lastDownloadPath = state.downloadPath;

  // Prepare UI
  const type = detectType(trimmed);
  $('#dl-title').textContent = `A baixar ${type}...`;
  $('#dl-url').textContent = trimmed;
  $('#sidebar-subtitle').textContent = 'A iniciar...';
  $('#songs-list').innerHTML = '';
  $('#stat-done').textContent = '0';
  $('#stat-total').textContent = '–';
  $('#stat-errors').textContent = '0';
  $('#main-bar').style.width = '0%';
  $('#current-song-label').textContent = 'A iniciar spotdl...';
  $('#pulse-dot').style.display = 'block';
  $('#finish-panel').classList.remove('visible');
  $('#cancel-btn').style.display = 'flex';

  showPage('download');

  // Register listeners
  window.api.removeAllListeners('download-progress');
  window.api.removeAllListeners('download-complete');
  window.api.removeAllListeners('download-error');

  window.api.onDownloadProgress(handleProgress);
  window.api.onDownloadComplete(handleComplete);
  window.api.onDownloadError(handleError);

  // Start
  window.api.startDownload({
    url: trimmed,
    downloadPath: state.downloadPath,
    concurrent: state.concurrent,
    sessionId: state.sessionId,
  });
}

function handleProgress(data) {
  if (data.sessionId !== state.sessionId) return;

  switch (data.type) {
    case 'total': {
      state.totalSongs = data.total;
      $('#stat-total').textContent = data.total;
      $('#sidebar-subtitle').textContent = `${data.total} música${data.total !== 1 ? 's' : ''}`;
      break;
    }
    case 'song-start': {
      state.currentSong = data.song;
      $('#current-song-label').textContent = data.song;
      ensureSongItem(data.song, 'downloading');
      break;
    }
    case 'song-progress': {
      updateSongBar(data.song, data.percent);
      break;
    }
    case 'song-done': {
      state.doneSongs = data.count;
      state.downloadedFiles.push(data.song);
      markSongDone(data.song);
      $('#stat-done').textContent = data.count;

      if (state.totalSongs > 0) {
        const pct = Math.round((data.count / state.totalSongs) * 100);
        $('#main-bar').style.width = pct + '%';
      }
      break;
    }
    case 'song-error': {
      state.errorSongs++;
      markSongError(data.song);
      $('#stat-errors').textContent = state.errorSongs;
      break;
    }
  }
}

function handleComplete(data) {
  if (data.sessionId !== state.sessionId) return;

  $('#main-bar').style.width = '100%';
  $('#pulse-dot').style.display = 'none';
  $('#cancel-btn').style.display = 'none';
  $('#current-song-label').textContent = 'Concluído!';
  $('#dl-title').textContent = 'Download completo';

  // Finish panel
  const panel = $('#finish-panel');
  const files = data.files && data.files.length ? data.files : state.downloadedFiles;

  const errNote = state.errorSongs > 0 ? ` (${state.errorSongs} com erro)` : '';
  $('#finish-title-text').textContent = `${state.doneSongs || files.length} música${(state.doneSongs || files.length) !== 1 ? 's' : ''} baixada${(state.doneSongs || files.length) !== 1 ? 's' : ''}${errNote}`;

  const filesContainer = $('#finish-files');
  filesContainer.innerHTML = '';
  files.slice(0, 30).forEach(f => {
    const div = document.createElement('div');
    div.className = 'finish-file';
    div.textContent = f;
    filesContainer.appendChild(div);
  });
  if (files.length > 30) {
    const more = document.createElement('div');
    more.className = 'finish-file';
    more.style.color = 'var(--text-tertiary)';
    more.textContent = `… e mais ${files.length - 30}`;
    filesContainer.appendChild(more);
  }

  panel.classList.add('visible');
}

function handleError(data) {
  if (data.sessionId !== state.sessionId) return;
  showToast(data.error || 'Erro desconhecido ao baixar.');
  $('#pulse-dot').style.display = 'none';
  $('#cancel-btn').style.display = 'none';
  $('#current-song-label').textContent = 'Erro no download';
}

// ── Song item helpers ──
function ensureSongItem(name, status) {
  if (!state.songs[name]) {
    state.songs[name] = { status, percent: 0 };
    const el = createSongEl(name, status);
    $('#songs-list').appendChild(el);
  } else {
    state.songs[name].status = status;
    const el = document.getElementById(`song-${cssId(name)}`);
    if (el) setSongClass(el, status);
  }
}

function updateSongBar(name, percent) {
  const el = document.getElementById(`song-${cssId(name)}`);
  if (el) {
    const bar = el.querySelector('.song-bar');
    if (bar) bar.style.width = percent + '%';
    const statusEl = el.querySelector('.song-status');
    if (statusEl) statusEl.textContent = percent + '%';
  }
}

function markSongDone(name) {
  const el = document.getElementById(`song-${cssId(name)}`);
  if (el) {
    setSongClass(el, 'done');
    const bar = el.querySelector('.song-bar');
    if (bar) bar.style.width = '100%';
    const statusEl = el.querySelector('.song-status');
    if (statusEl) statusEl.textContent = '✓ Concluída';
  }
}

function markSongError(name) {
  const el = document.getElementById(`song-${cssId(name)}`);
  if (el) {
    setSongClass(el, 'error');
    const statusEl = el.querySelector('.song-status');
    if (statusEl) statusEl.textContent = '✗ Erro';
  }
}

function setSongClass(el, status) {
  el.classList.remove('downloading', 'done', 'error', 'queued');
  el.classList.add(status);
}

function createSongEl(name, status) {
  const div = document.createElement('div');
  div.className = `song-item ${status}`;
  div.id = `song-${cssId(name)}`;
  div.innerHTML = `
    <div class="song-name">${escHtml(name)}</div>
    <div class="song-bar-wrap"><div class="song-bar"></div></div>
    <div class="song-status">${status === 'downloading' ? '▶ A baixar' : status === 'queued' ? '◌ Na fila' : ''}</div>
  `;
  return div;
}

function cssId(name) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40);
}
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Toast ──
let toastTimer;
function showToast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 4000);
}

// ══════════════════════════════════════════════
//  Event Listeners
// ══════════════════════════════════════════════

// Settings button
$('#settings-btn').addEventListener('click', () => {
  if (state.page === 'settings') {
    showPage('home');
  } else if (state.page !== 'download') {
    showPage('settings');
  } else {
    showPage('settings');
  }
});

$('#settings-back').addEventListener('click', () => {
  showPage(state.page === 'settings' ? 'home' : 'home');
});

// Download button
$('#download-btn').addEventListener('click', () => {
  startDownload($('#url-input').value);
});

// Enter key on input
$('#url-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startDownload($('#url-input').value);
});

// Path selector (home)
$('#path-selector').addEventListener('click', async () => {
  const p = await window.api.setDownloadPath();
  if (p) {
    state.downloadPath = p;
    updatePathDisplay();
  }
});

// Settings: change path
$('#settings-change-path').addEventListener('click', async () => {
  const p = await window.api.setDownloadPath();
  if (p) {
    state.downloadPath = p;
    updatePathDisplay();
  }
});

// Settings: concurrent stepper
$('#concurrent-minus').addEventListener('click', async () => {
  if (state.concurrent > 1) {
    state.concurrent = await window.api.setConcurrentDownloads(state.concurrent - 1);
    updateConcurrentDisplay();
  }
});
$('#concurrent-plus').addEventListener('click', async () => {
  if (state.concurrent < 20) {
    state.concurrent = await window.api.setConcurrentDownloads(state.concurrent + 1);
    updateConcurrentDisplay();
  }
});

// Cancel
$('#cancel-btn').addEventListener('click', () => {
  if (state.sessionId) {
    window.api.cancelDownload(state.sessionId);
    state.sessionId = null;
    $('#dl-title').textContent = 'Download cancelado';
    $('#pulse-dot').style.display = 'none';
    $('#cancel-btn').style.display = 'none';
    $('#current-song-label').textContent = 'Cancelado pelo utilizador';
    // Show "download more" anyway
    const panel = $('#finish-panel');
    $('#finish-title-text').textContent = 'Download cancelado';
    $('#finish-files').innerHTML = '';
    panel.classList.add('visible');
  }
});

// Open folder
$('#open-folder-btn').addEventListener('click', () => {
  window.api.openFolder(state.lastDownloadPath || state.downloadPath);
});

// Download more → back to home
$('#download-more-btn').addEventListener('click', () => {
  $('#url-input').value = '';
  showPage('home');
});

// ── Boot ──
init();
