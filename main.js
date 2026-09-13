const { app, BrowserWindow, BrowserView, ipcMain, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const CHROME_HEIGHT = 92; // px height of tab bar + address bar in renderer/index.html
const BOOKMARKS_FILE = () => path.join(app.getPath('userData'), 'bookmarks.json');

let mainWindow = null;
let tabs = []; // { id, title, url, view }
let activeTabId = null;
let counter = 0;

// ---------- bookmarks (stored as a small JSON file, survives restarts) ----------

function loadBookmarks() {
  try {
    const raw = fs.readFileSync(BOOKMARKS_FILE(), 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveBookmarks(list) {
  try {
    fs.writeFileSync(BOOKMARKS_FILE(), JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    // non-fatal; bookmarks just won't persist this run
  }
}

function toggleBookmark(title, url) {
  const list = loadBookmarks();
  const idx = list.findIndex(b => b.url === url);
  if (idx === -1) {
    list.unshift({ title: title || url, url });
  } else {
    list.splice(idx, 1);
  }
  saveBookmarks(list);
  return list;
}

ipcMain.handle('get-bookmarks', () => loadBookmarks());
ipcMain.handle('toggle-bookmark', (_e, { title, url }) => toggleBookmark(title, url));

// ---------- tabs ----------

function serializeTabs() {
  return tabs.map(t => ({
    id: t.id,
    title: t.title,
    url: t.url,
    active: t.id === activeTabId,
    canGoBack: t.view ? t.view.webContents.canGoBack() : false,
    canGoForward: t.view ? t.view.webContents.canGoForward() : false,
  }));
}

function pushState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tabs-updated', serializeTabs(), activeTabId);
  }
}

function updateViewBounds() {
  if (!mainWindow) return;
  const [w, h] = mainWindow.getContentSize();
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab && tab.view && tab.url) {
    tab.view.setBounds({ x: 0, y: CHROME_HEIGHT, width: w, height: h - CHROME_HEIGHT });
  }
}

function showActiveView() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab && tab.url && tab.view) {
    mainWindow.setBrowserView(tab.view);
    updateViewBounds();
  } else {
    mainWindow.setBrowserView(null);
  }
}

function normalizeUrl(raw) {
  raw = (raw || '').trim();
  if (!raw) return null;
  const looksLikeUrl = /^https?:\/\//i.test(raw) ||
    (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(raw) && !raw.includes(' '));
  if (looksLikeUrl) return /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
  return 'https://duckduckgo.com/html/?q=' + encodeURIComponent(raw);
}

function attachViewEvents(tab) {
  const wc = tab.view.webContents;
  wc.on('page-title-updated', (_e, title) => { tab.title = title || tab.title; pushState(); });
  wc.on('did-navigate', (_e, url) => { tab.url = url; pushState(); });
  wc.on('did-navigate-in-page', (_e, url) => { tab.url = url; pushState(); });
  wc.on('did-finish-load', () => { pushState(); });
  // open target="_blank" links as new tabs instead of new OS windows
  wc.setWindowOpenHandler(({ url }) => {
    createTab(url);
    return { action: 'deny' };
  });
}

function createTab(url) {
  counter++;
  const id = 'tab-' + counter;
  // No explicit `partition` is set, so this uses Electron's default
  // persistent session — cookies and localStorage are written to disk
  // automatically and survive an app restart with no extra code needed.
  const view = new BrowserView({
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  const tab = { id, title: 'New Tab', url: null, view };
  tabs.push(tab);
  attachViewEvents(tab);
  activeTabId = id;
  if (url) navigateTab(id, url);
  showActiveView();
  pushState();
  return id;
}

function navigateTab(id, rawUrl) {
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;
  const url = normalizeUrl(rawUrl);
  if (!url) return;
  tab.url = url;
  tab.title = url;
  tab.view.webContents.loadURL(url);
  if (id === activeTabId) showActiveView();
  pushState();
}

function closeTab(id) {
  const idx = tabs.findIndex(t => t.id === id);
  if (idx === -1) return;
  const [removed] = tabs.splice(idx, 1);
  if (mainWindow) mainWindow.removeBrowserView(removed.view);
  if (tabs.length === 0) { createTab(); return; }
  if (activeTabId === id) activeTabId = tabs[Math.max(0, idx - 1)].id;
  showActiveView();
  pushState();
}

function switchTab(id) {
  if (!tabs.find(t => t.id === id)) return;
  activeTabId = id;
  showActiveView();
  pushState();
}

function goHome(id) {
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;
  tab.url = null;
  tab.title = 'New Tab';
  mainWindow.setBrowserView(null);
  pushState();
}

ipcMain.handle('new-tab', (_e, url) => createTab(url));
ipcMain.handle('navigate', (_e, { id, url }) => navigateTab(id || activeTabId, url));
ipcMain.handle('close-tab', (_e, id) => closeTab(id));
ipcMain.handle('switch-tab', (_e, id) => switchTab(id));
ipcMain.handle('go-home', (_e, id) => goHome(id || activeTabId));
ipcMain.handle('go-back', (_e, id) => {
  const t = tabs.find(t => t.id === (id || activeTabId));
  if (t && t.view && t.view.webContents.canGoBack()) t.view.webContents.goBack();
});
ipcMain.handle('go-forward', (_e, id) => {
  const t = tabs.find(t => t.id === (id || activeTabId));
  if (t && t.view && t.view.webContents.canGoForward()) t.view.webContents.goForward();
});
ipcMain.handle('reload', (_e, id) => {
  const t = tabs.find(t => t.id === (id || activeTabId));
  if (t && t.view) t.view.webContents.reload();
});

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 760,
    minHeight: 480,
    backgroundColor: '#faf6ec',
    title: 'Algeriom',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('resize', updateViewBounds);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Real downloads: any file a tab tries to download (PDFs, images, etc.)
  // gets saved straight to the OS Downloads folder, with a system
  // notification when it finishes.
  const { session } = require('electron');
  session.defaultSession.on('will-download', (_event, item) => {
    const downloadsDir = app.getPath('downloads');
    let fileName = item.getFilename();
    let savePath = path.join(downloadsDir, fileName);

    // avoid silently overwriting a file with the same name
    let counterSuffix = 1;
    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext);
    while (fs.existsSync(savePath)) {
      fileName = `${base} (${counterSuffix})${ext}`;
      savePath = path.join(downloadsDir, fileName);
      counterSuffix++;
    }
    item.setSavePath(savePath);

    item.once('done', (_e, state) => {
      if (state === 'completed' && Notification.isSupported()) {
        new Notification({
          title: 'Download complete',
          body: fileName,
        }).show();
      }
    });
  });

  createTab();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
