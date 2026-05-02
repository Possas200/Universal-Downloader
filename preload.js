const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getDownloadPath:       ()      => ipcRenderer.invoke('get-download-path'),
  setDownloadPath:       ()      => ipcRenderer.invoke('set-download-path'),
  getConcurrentDownloads:()      => ipcRenderer.invoke('get-concurrent-downloads'),
  setConcurrentDownloads:(val)   => ipcRenderer.invoke('set-concurrent-downloads', val),
  openFolder:            (p)     => ipcRenderer.invoke('open-folder', p),
  getBrowserSetup:       ()      => ipcRenderer.invoke('get-browser-setup'),
  saveBrowserChoice:     (id)    => ipcRenderer.invoke('save-browser-choice', id),
  skipBrowserSetup:      ()      => ipcRenderer.invoke('skip-browser-setup'),
  checkTools:            ()      => ipcRenderer.invoke('check-tools'),
  startDownload:         (opts)  => ipcRenderer.invoke('start-download', opts),
  cancelDownload:        (sid)   => ipcRenderer.invoke('cancel-download', sid),
  onDownloadProgress:    (cb)    => ipcRenderer.on('download-progress', (_, d) => cb(d)),
  onDownloadComplete:    (cb)    => ipcRenderer.on('download-complete', (_, d) => cb(d)),
  onDownloadError:       (cb)    => ipcRenderer.on('download-error',    (_, d) => cb(d)),
  removeAllListeners:    ()      => {
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.removeAllListeners('download-complete');
    ipcRenderer.removeAllListeners('download-error');
  },
});
