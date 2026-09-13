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

function renderAddressBar() {
  const tab = tabsState.find(t => t.id === activeId);
  const input = document.getElementById('addrInput');
  const dot = document.getElementById('secureDot');
  const start = document.getElementById('startPage');

  document.getElementById('backBtn').disabled = !(tab && tab.canGoBack);
  document.getElementById('fwdBtn').disabled = !(tab && tab.canGoForward);

  if (tab && tab.url) {
    input.value = tab.url;
    dot.classList.toggle('insecure', !tab.url.startsWith('https'));
    start.style.display = 'none';
  } else {
    input.value = '';
    dot.classList.remove('insecure');
    start.style.display = 'block';
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
      tile.onclick = () => window.algeriom.navigate(activeId, site.url);
      tile.innerHTML = `<div class="dot" style="background:${site.color}">${site.name[0]}</div>
                         <div class="name">${site.name}</div>`;
      tiles.appendChild(tile);
    });
    section.appendChild(tiles);
    wrap.appendChild(section);
  });
}

document.getElementById('newTabBtn').onclick = () => window.algeriom.newTab();
document.getElementById('backBtn').onclick = () => window.algeriom.goBack(activeId);
document.getElementById('fwdBtn').onclick = () => window.algeriom.goForward(activeId);
document.getElementById('reloadBtn').onclick = () => window.algeriom.reload(activeId);
document.getElementById('homeBtn').onclick = () => window.algeriom.goHome(activeId);

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

renderGroups();
