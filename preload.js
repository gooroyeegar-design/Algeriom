const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('algeriom', {
  newTab: (url) => ipcRenderer.invoke('new-tab', url),
  navigate: (id, url) => ipcRenderer.invoke('navigate', { id, url }),
  closeTab: (id) => ipcRenderer.invoke('close-tab', id),
  switchTab: (id) => ipcRenderer.invoke('switch-tab', id),
  goHome: (id) => ipcRenderer.invoke('go-home', id),
  goBack: (id) => ipcRenderer.invoke('go-back', id),
  goForward: (id) => ipcRenderer.invoke('go-forward', id),
  reload: (id) => ipcRenderer.invoke('reload', id),
  onTabsUpdated: (cb) => ipcRenderer.on('tabs-updated', (_e, tabs, activeId) => cb(tabs, activeId)),
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  toggleBookmark: (title, url) => ipcRenderer.invoke('toggle-bookmark', { title, url }),
});
