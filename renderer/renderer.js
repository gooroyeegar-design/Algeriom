const SITES = {
  'News': [
    { name: 'APS', url: 'https://www.aps.dz', color: '#0f6b45' },
    { name: 'El Khabar', url: 'https://www.elkhabar.com', color: '#20261f' },
    { name: 'Echorouk', url: 'https://www.echoroukonline.com', color: '#c8102e' },
  ],
  'Government': [
    { name: 'El Mouradia', url: 'https://www.el-mouradia.dz', color: '#0f6b45' },
    { name: 'Journal Officiel', url: 'https://www.joradp.dz', color: '#20261f' },
    { name: 'Algérie Poste', url: 'https://www.poste.dz', color: '#0f6b45' },
  ],
  'Daily life': [
    { name: 'Ouedkniss', url: 'https://www.ouedkniss.com', color: '#c8102e' },
    { name: 'Exam results', url: 'https://www.dzexams.com', color: '#20261f' },
    { name: 'Wikipedia', url: 'https://en.wikipedia.org', color: '#0f6b45' },
  ],
};

let tabsState = [];
let activeId = null;
let bookmarksCache = [];

function renderTabs() {
  const bar = document.getElementById('tabbar');
  bar.querySelectorAll('.tab').forEach(el => el.remove());
  const newTabBtn = document.getElementById('newTabBtn');
  tabsState.forEach(t => {
    const el = document.createElement('div');
    el.className = 'tab' + (t.active ? ' active' : '');
    el.onclick = () => window.algeriom.switchTab(t.id);
    const label = document.createElement('span');
    label.textContent = t.url ? (t.title || hostnameOf(t.url)) : 'New Tab';
    const close = document.createElement('span');
    close.className = 'close';
    close.textContent = '✕';
    close.onclick = (e) => { e.stopPropagation(); window.algeriom.closeTab(t.id); };
    el.appendChild(label);
    el.appendChild(close);
    bar.insertBefore(el, newTabBtn);
  });
}

function hostnameOf(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch (e) { return url; }
}

function currentTab() {
  return tabsState.find(t => t.id === activeId);
}

function isBookmarked(url) {
  return !!url && bookmarksCache.some(b => b.url === url);
}

function renderAddressBar() {
  const tab = currentTab();
  const input = document.getElementById('addrInput');
  const dot = document.getElementById('secureDot');
  const start = document.getElementById('startPage');
  const bookmarkBtn = document.getElementById('bookmarkBtn');

  document.getElementById('backBtn').disabled = !(tab && tab.canGoBack);
  document.getElementById('fwdBtn').disabled = !(tab && tab.canGoForward);

  if (tab && tab.url) {
    input.value = tab.url;
    dot.classList.toggle('insecure', !tab.url.startsWith('https'));
    start.style.display = 'none';
    bookmarkBtn.style.visibility = 'visible';
    bookmarkBtn.classList.toggle('active', isBookmarked(tab.url));
  } else {
    input.value = '';
    dot.classList.remove('insecure');
    start.style.display = 'block';
    bookmarkBtn.style.visibility = 'hidden';
  }
}

function renderGroups() {
  const wrap = document.getElementById('groups');
  wrap.innerHTML = '';
  Object.keys(SITES).forEach(label => {
    const section = document.createElement('div');
    const heading = document.createElement('div');
    heading.className = 'group-label';
    heading.textContent = label;
    section.appendChild(heading);

    const tiles = document.createElement('div');
    tiles.className = 'tiles';
    SITES[label].forEach(site => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.onclick = () => { if (window.algeriom) window.algeriom.navigate(activeId, site.url); };
      tile.innerHTML = `<div class="dot" style="background:${site.color}">${site.name[0]}</div>
                         <div class="name">${site.name}</div>`;
      tiles.appendChild(tile);
    });
    section.appendChild(tiles);
    wrap.appendChild(section);
  });
}

function renderBookmarksSection() {
  const wrap = document.getElementById('bookmarksSection');
  wrap.innerHTML = '';

  const section = document.createElement('div');
  const heading = document.createElement('div');
  heading.className = 'group-label';
  heading.textContent = 'Bookmarks';
  section.appendChild(heading);

  if (bookmarksCache.length === 0) {
    const empty = document.createElement('div');
    empty.style.fontSize = '11.5px';
    empty.style.color = 'var(--muted)';
    empty.textContent = 'Tap the star while browsing to save a page here.';
    section.appendChild(empty);
    wrap.appendChild(section);
    return;
  }

  const tiles = document.createElement('div');
  tiles.className = 'tiles';
  bookmarksCache.slice(0, 6).forEach(bm => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.title = 'Click to open, right-click to remove';
    tile.onclick = () => { if (window.algeriom) window.algeriom.navigate(activeId, bm.url); };
    tile.oncontextmenu = (e) => {
      e.preventDefault();
      window.algeriom.toggleBookmark(bm.title, bm.url).then(list => {
        bookmarksCache = list;
        renderBookmarksSection();
        renderAddressBar();
      });
    };
    tile.innerHTML = `<div class="dot" style="background:#0f6b45">${(bm.title || bm.url)[0].toUpperCase()}</div>
                       <div class="name">${bm.title || hostnameOf(bm.url)}</div>`;
    tiles.appendChild(tile);
  });
  section.appendChild(tiles);
  wrap.appendChild(section);
}

function refreshBookmarks() {
  if (!window.algeriom) return;
  window.algeriom.getBookmarks().then(list => {
    bookmarksCache = list || [];
    renderBookmarksSection();
    renderAddressBar();
  });
}

// Build the start-page tiles first, unconditionally, so a bridge problem
// below can never prevent them from showing up.
renderGroups();
renderBookmarksSection();

if (!window.algeriom) {
  // The preload bridge didn't attach. Surface this clearly instead of
  // failing silently on every click.
  console.error('[Algeriom] window.algeriom is undefined — preload script did not load correctly.');
  const tagline = document.querySelector('.tagline');
  if (tagline) {
    tagline.textContent = 'Something didn\u2019t load correctly — try restarting the app. (Bridge unavailable)';
    tagline.style.color = '#c8102e';
  }
} else {
  // ---- wire up controls ----
  document.getElementById('newTabBtn').onclick = () => window.algeriom.newTab();
  document.getElementById('backBtn').onclick = () => window.algeriom.goBack(activeId);
  document.getElementById('fwdBtn').onclick = () => window.algeriom.goForward(activeId);
  document.getElementById('reloadBtn').onclick = () => window.algeriom.reload(activeId);
  document.getElementById('homeBtn').onclick = () => window.algeriom.goHome(activeId);
  document.getElementById('bookmarkBtn').onclick = () => {
    const tab = currentTab();
    if (!tab || !tab.url) return;
    window.algeriom.toggleBookmark(tab.title || tab.url, tab.url).then(list => {
      bookmarksCache = list;
      renderBookmarksSection();
      renderAddressBar();
    });
  };

  document.getElementById('addrInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') window.algeriom.navigate(activeId, e.target.value);
  });
  document.getElementById('startSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') window.algeriom.navigate(activeId, e.target.value);
  });

  window.algeriom.onTabsUpdated((tabs, activeTabId) => {
    tabsState = tabs;
    activeId = activeTabId;
    renderTabs();
    renderAddressBar();
  });

  refreshBookmarks();
}
