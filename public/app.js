const $ = (id) => document.getElementById(id);
const MARKET_NAMES = { 'zh-CN': '中国', 'en-US': '美国', 'en-GB': '英国', 'ja-JP': '日本', 'de-DE': '德国', 'fr-FR': '法国' };
const HOUR = 3600000;
const KEY = 'daily-picture-v1';
let storageWarning = false;

function readStored(key, fallback) {
  try { return JSON.parse(localStorage.getItem(`${KEY}:${key}`)) ?? fallback; } catch { return fallback; }
}
function writeStored(key, value) {
  try { localStorage.setItem(`${KEY}:${key}`, JSON.stringify(value)); return true; }
  catch { if (!storageWarning) { storageWarning = true; toast('浏览器存储不可用，本次更改仅在当前页面保留。'); } return false; }
}
function validImage(image) {
  return image && /^OHR\.[A-Za-z0-9_-]{1,180}$/.test(image.id) && Object.hasOwn(MARKET_NAMES, image.market)
    && /^\d{4}-\d{2}-\d{2}$/.test(image.date) && ['title', 'description', 'credit', 'copyright'].every((key) => typeof image[key] === 'string');
}
const savedSettings = readStored('settings', {});
const savedFavorites = readStored('favorites', []);
const state = {
  market: Object.hasOwn(MARKET_NAMES, savedSettings?.market) ? savedSettings.market : 'zh-CN',
  autoRefresh: savedSettings?.autoRefresh !== false,
  contain: savedSettings?.contain === true,
  mode: 'browse', index: 0, images: [],
  favorites: Array.isArray(savedFavorites) ? savedFavorites.filter(validImage).slice(0, 200) : [],
  fetchedAt: null, lastCheck: 0, stale: false, busy: false, request: null, generation: 0,
  heroGeneration: 0, slideshow: null, refreshTimer: null, toastTimer: null, installPrompt: null,
  fullscreenView: null,
};
const downloadUrls = new Set();
function images() { return state.mode === 'favorites' ? state.favorites : state.images; }
function selected() { return images()[state.index]; }
function imageUrl(image, size = '1920x1080') { return `/api/image?${new URLSearchParams({ id: image.id, size })}`; }
function liked(image) { return state.favorites.some((item) => item.id === image?.id); }
function saveSettings() { writeStored('settings', { market: state.market, autoRefresh: state.autoRefresh, contain: state.contain }); }
function friendlyDate(date) { return date ? date.replaceAll('-', '.') : '—'; }
function shortDate(date) { return date ? `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日` : ''; }
function toast(message) {
  clearTimeout(state.toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  // Keep notifications visible when a modal is in the top layer.
  const modal = document.querySelector('dialog[open]');
  (modal || nativeFullscreenElement() || document.body).append($('toast'));
  state.toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
}
function status() {
  const stamp = state.fetchedAt ? new Date(state.fetchedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
  const prefix = !navigator.onLine ? '离线浏览' : state.stale ? '浏览缓存' : '已同步';
  $('sync-status').textContent = state.fetchedAt ? `${prefix} · ${MARKET_NAMES[state.market]} · ${stamp}${state.autoRefresh ? ' · 每小时刷新' : ''}` : (state.busy ? '正在连接 Bing…' : '尚未获取图片');
}
function favoriteButton() {
  const active = liked(selected());
  $('favorite').setAttribute('aria-pressed', String(active));
  $('favorite').setAttribute('aria-label', active ? '取消收藏' : '收藏图片');
  $('favorite').title = active ? '取消收藏 · L' : '收藏图片 · L';
  $('favorite-count').textContent = String(state.favorites.length);
}
function icon(name, className = 'icon') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}
function renderStrip() {
  const fragment = document.createDocumentFragment();
  images().forEach((item, index) => {
    const button = document.createElement('button');
    button.className = 'thumbnail';
    button.setAttribute('aria-label', `${shortDate(item.date)}：${item.title}`);
    button.setAttribute('aria-pressed', String(index === state.index));
    button.title = `${item.title} · ${item.description}`;
    const frame = document.createElement('span'); frame.className = 'thumbnail-image';
    const img = document.createElement('img');
    img.src = imageUrl(item, '640x360'); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.width = 640; img.height = 360;
    img.addEventListener('error', () => { img.hidden = true; frame.classList.add('thumb-broken'); });
    const date = document.createElement('span'); date.className = 'thumb-day'; date.textContent = shortDate(item.date);
    frame.append(img, date);
    if (index === 0 && state.mode === 'browse') {
      const badge = document.createElement('span'); badge.className = 'thumb-tag'; badge.textContent = '最新'; frame.append(badge);
    }
    if (liked(item)) frame.append(icon('heart', 'icon thumb-heart'));
    const caption = document.createElement('span'); caption.className = 'thumbnail-caption';
    const name = document.createElement('span'); name.textContent = item.title;
    caption.append(name);
    button.append(frame, caption);
    button.addEventListener('click', () => { stopSlideshow(); state.index = index; renderSelection(); });
    fragment.append(button);
  });
  if (!images().length) {
    if (state.busy && state.mode === 'browse') {
      for (let i = 0; i < 15; i++) { const card = document.createElement('div'); card.className = 'filmstrip-placeholder'; fragment.append(card); }
    } else { const message = document.createElement('p'); message.className = 'collection-empty'; message.textContent = state.mode === 'favorites' ? '你的风景故事，从一次收藏开始。' : '图片列表将在联网后显示。'; fragment.append(message); }
  }
  $('filmstrip').replaceChildren(fragment);
}
function renderSelection() {
  const list = images();
  state.index = Math.max(0, Math.min(state.index, list.length - 1));
  const item = selected();
  $('image-error').hidden = true;
  $('hero-image').hidden = true;
  state.heroGeneration++;
  for (const id of ['image-bottom', 'position']) $(id).hidden = !item;
  // Keep the exit control available until a native fullscreen exit completes.
  $('image-topbar').hidden = !item && !state.fullscreenView;
  $('previous').hidden = $('next').hidden = list.length < 2;
  $('slideshow').disabled = list.length < 2;
  favoriteButton();
  $('empty-state').hidden = Boolean(item) || (state.busy && state.mode === 'browse');
  $('loading-state').hidden = Boolean(!item && (!state.busy || state.mode === 'favorites'));
  if (!item) {
    exitFullscreenView();
    const favorites = state.mode === 'favorites';
    $('empty-title').textContent = favorites ? '把喜欢的风景留下来' : '风景正在路上';
    $('empty-description').textContent = favorites ? '点击图片上的爱心，建立自己的风景收藏。' : '暂时无法连接 Bing。检查网络后，再试一次。';
    $('empty-action').textContent = favorites ? '去发现图片' : '重新连接';
    $('edition').lastElementChild.textContent = '—';
    renderStrip();
    return;
  }
  $('photo-date').textContent = friendlyDate(item.date);
  $('photo-market').textContent = `${MARKET_NAMES[item.market]} · BING`;
  $('photo-title').textContent = item.title;
  $('photo-description').textContent = item.description;
  $('photo-credit').textContent = item.credit;
  $('image-label').textContent = state.mode === 'favorites' ? '我的收藏' : state.index === 0 ? '最新精选' : '时光里的风景';
  $('position').textContent = `${String(state.index + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
  $('edition').lastElementChild.textContent = friendlyDate(item.date);
  const generation = state.heroGeneration;
  const hero = $('hero-image');
  hero.alt = `${item.title}：${item.description}`;
  hero.onload = () => {
    if (generation !== state.heroGeneration) return;
    hero.hidden = false; $('loading-state').hidden = true; $('image-error').hidden = true;
  };
  hero.onerror = () => {
    if (generation !== state.heroGeneration) return;
    $('loading-state').hidden = true; $('image-error').hidden = false;
  };
  hero.src = imageUrl(item);
  if (hero.complete && hero.naturalWidth) hero.onload();
  renderStrip();
}
function setMode(mode) {
  stopSlideshow();
  state.mode = mode; state.index = 0;
  const favorites = mode === 'favorites';
  $('browse-tab').classList.toggle('active', !favorites); $('browse-tab').setAttribute('aria-pressed', String(!favorites));
  $('favorites-tab').classList.toggle('active', favorites); $('favorites-tab').setAttribute('aria-pressed', String(favorites));
  $('page-heading').textContent = favorites ? '喜欢的风景，值得再看一遍。' : '每天，发现一点不一样。';
  $('filmstrip-title').textContent = favorites ? '我的风景收藏' : '最近十五日';
  $('filmstrip-subtitle').textContent = favorites ? '每一次心动，都有迹可循' : '让美好，多停留一会儿';
  renderSelection();
}
function move(delta, manual = true) {
  if (manual) stopSlideshow();
  if (images().length < 2) return;
  state.index = (state.index + delta + images().length) % images().length;
  renderSelection();
}
async function loadArchive(force = false) {
  state.request?.abort();
  const controller = new AbortController();
  state.request = controller;
  const generation = ++state.generation;
  const market = state.market;
  state.busy = true;
  $('refresh').disabled = true; $('refresh').classList.add('busy');
  const timeout = setTimeout(() => controller.abort(), 25000);
  status();
  if (!state.images.length && state.mode === 'browse') renderSelection();
  try {
    const response = await fetch(`/api/archive?market=${market}${force ? '&refresh=1' : ''}`, { signal: controller.signal, cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '无法更新图片。');
    if (!Array.isArray(data.images) || !data.images.length || !data.images.every(validImage) || data.market !== market) throw new Error('图片列表格式异常，请重试。');
    if (generation !== state.generation) return;
    const currentId = state.mode === 'browse' ? selected()?.id : null;
    state.images = data.images; state.fetchedAt = data.fetchedAt; state.stale = data.stale === true; state.lastCheck = Date.now();
    writeStored(`archive:${market}`, data);
    $('notice').hidden = !state.stale;
    $('notice').textContent = data.warning || '离线浏览：正在显示上次成功更新的图片。';
    if (state.mode === 'browse') {
      state.index = Math.max(0, state.images.findIndex((item) => item.id === currentId));
      renderSelection();
    }
    if (force) toast(state.stale ? '当前显示缓存图片，稍后可再次刷新。' : '已与 Bing 同步，最新风景就在这里。');
  } catch (error) {
    if (generation !== state.generation) return;
    if (controller.signal.aborted && document.hidden) return;
    state.stale = true;
    $('notice').hidden = false;
    $('notice').textContent = state.images.length ? '网络暂时不可用，正在显示已缓存的图片。联网后可点击右上角刷新。' : '暂时无法连接 Bing。请检查网络，再点击刷新重试。';
  } finally {
    clearTimeout(timeout);
    if (generation === state.generation) {
      state.busy = false; $('refresh').disabled = false; $('refresh').classList.remove('busy');
      if (!images().length) renderSelection();
      status();
    }
  }
}
function restoreArchive() {
  const cached = readStored(`archive:${state.market}`, null);
  state.images = cached?.market === state.market && Array.isArray(cached.images) ? cached.images.filter(validImage) : [];
  state.fetchedAt = cached?.fetchedAt || null;
  state.stale = true; state.index = 0;
}
function toggleFavorite() {
  const item = selected(); if (!item) return;
  const exists = liked(item);
  if (!exists && state.favorites.length >= 200) { toast('收藏已达到 200 张，请先移除一些图片。'); return; }
  state.favorites = exists ? state.favorites.filter((entry) => entry.id !== item.id) : [{ ...item, savedAt: new Date().toISOString() }, ...state.favorites];
  const saved = writeStored('favorites', state.favorites);
  if (state.mode === 'favorites') { stopSlideshow(); renderSelection(); }
  else { favoriteButton(); renderStrip(); }
  if (saved) toast(exists ? '已从收藏中移除。' : '已收藏，把这片风景留在身边。');
}
async function openDialog(id) {
  stopSlideshow();
  if (!await exitFullscreenView()) return;
  $(id).showModal();
}
function stopSlideshow() {
  clearInterval(state.slideshow); state.slideshow = null;
  $('slideshow').setAttribute('aria-pressed', 'false');
  $('slideshow').setAttribute('aria-label', '开始幻灯片');
  $('slideshow').replaceChildren(icon('play'));
}
function startSlideshow() {
  if (state.slideshow) { stopSlideshow(); return; }
  if (images().length < 2) return;
  state.slideshow = setInterval(() => move(1, false), 8000);
  $('slideshow').setAttribute('aria-pressed', 'true');
  $('slideshow').setAttribute('aria-label', '暂停幻灯片');
  $('slideshow').replaceChildren(icon('pause'));
  toast('幻灯片已开始，每 8 秒切换一张。');
}
function scheduleRefresh() {
  clearInterval(state.refreshTimer);
  state.refreshTimer = null;
  if (!document.hidden && state.autoRefresh) {
    state.refreshTimer = setInterval(() => { if (!state.busy && Date.now() - state.lastCheck >= HOUR) loadArchive(); }, 60000);
  }
}
function nativeFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement;
}
function fullscreenButton(active) {
  const button = $('fullscreen');
  button.setAttribute('aria-pressed', String(active));
  button.setAttribute('aria-label', active ? '退出全屏' : '全屏欣赏');
  button.title = active ? '退出全屏 · Esc' : '全屏欣赏 · F';
  button.replaceChildren(icon(active ? 'close' : 'expand'));
}
function restoreFullscreenView() {
  const view = state.fullscreenView;
  if (!view) return;
  state.fullscreenView = null;
  $('gallery').classList.remove('is-fullscreen');
  $('gallery').removeAttribute('role');
  $('gallery').removeAttribute('aria-modal');
  $('image-topbar').hidden = !selected();
  document.documentElement.classList.remove('viewer-open');
  document.body.classList.remove('viewer-open');
  document.body.style.top = view.bodyTop;
  for (const [element, inert] of view.background) element.inert = inert;
  fullscreenButton(false);
  if ($('toast').parentElement === $('gallery')) document.body.append($('toast'));
  window.scrollTo(view.x, view.y);
  const focus = view.focus && !view.focus.closest('[hidden]') ? view.focus : $('gallery');
  focus.focus({ preventScroll: true });
}
async function exitFullscreenView() {
  if (nativeFullscreenElement() === $('gallery')) {
    try {
      await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } catch {
      toast('请使用浏览器的退出全屏按钮返回。');
      return false;
    }
  }
  restoreFullscreenView();
  return true;
}
async function fullscreen() {
  if (state.fullscreenView) return exitFullscreenView();
  if (!selected()) return;
  const gallery = $('gallery');
  const view = {
    x: window.scrollX, y: window.scrollY, focus: document.activeElement,
    bodyTop: document.body.style.top, native: false,
    background: [...document.querySelectorAll('.app-header, .skip-link, main > :not(#gallery)')].map((element) => [element, element.inert]),
  };
  state.fullscreenView = view;
  document.body.style.top = `${-view.y}px`;
  document.documentElement.classList.add('viewer-open');
  document.body.classList.add('viewer-open');
  gallery.classList.add('is-fullscreen');
  gallery.setAttribute('role', 'dialog');
  gallery.setAttribute('aria-modal', 'true');
  for (const [element] of view.background) element.inert = true;
  fullscreenButton(true);
  $('fullscreen').focus({ preventScroll: true });
  // The viewport viewer is ready immediately, including on mobile browsers
  // without an element Fullscreen API or when a native request is rejected.
  const request = gallery.requestFullscreen || gallery.webkitRequestFullscreen;
  const enabled = gallery.requestFullscreen ? document.fullscreenEnabled : document.webkitFullscreenEnabled;
  if (request && enabled !== false) {
    try { await request.call(gallery); } catch { /* Keep the viewport viewer. */ }
    // A pending native request may finish after the user has closed the viewer.
    if (!state.fullscreenView && nativeFullscreenElement() === gallery) await exitFullscreenView();
  }
}
function syncFullscreen() {
  if (!state.fullscreenView) return;
  if (nativeFullscreenElement() === $('gallery')) state.fullscreenView.native = true;
  else if (state.fullscreenView.native) restoreFullscreenView();
}
document.addEventListener('fullscreenchange', syncFullscreen);
document.addEventListener('webkitfullscreenchange', syncFullscreen);
async function download(size) {
  const item = selected(); if (!item) return;
  const buttons = document.querySelectorAll('[data-size]');
  buttons.forEach((button) => { button.disabled = true; });
  toast('正在准备图片，请稍候…');
  try {
    const response = await fetch(`${imageUrl(item, size)}&download=1`, { signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.headers.get('Content-Type')?.startsWith('image/')) throw new Error('download');
    const objectUrl = URL.createObjectURL(await response.blob());
    downloadUrls.add(objectUrl);
    const link = document.createElement('a'); link.href = objectUrl; link.download = `${item.id}_${size}.jpg`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => { URL.revokeObjectURL(objectUrl); downloadUrls.delete(objectUrl); }, 60000);
    $('download-dialog').close();
    toast('图片已交给浏览器下载。');
  } catch { toast('下载未完成，请检查网络，或选择其他分辨率重试。'); }
  finally { buttons.forEach((button) => { button.disabled = false; }); }
}

$('market').value = state.market;
$('auto-refresh').checked = state.autoRefresh;
$('contain-image').checked = state.contain;
$('gallery').classList.toggle('contain', state.contain);
$('browse-tab').addEventListener('click', () => setMode('browse'));
$('favorites-tab').addEventListener('click', () => setMode('favorites'));
$('market').addEventListener('change', () => {
  stopSlideshow(); state.market = $('market').value; saveSettings(); restoreArchive(); setMode('browse'); loadArchive();
});
$('refresh').addEventListener('click', () => loadArchive(true));
$('previous').addEventListener('click', () => move(-1));
$('next').addEventListener('click', () => move(1));
$('favorite').addEventListener('click', toggleFavorite);
$('fullscreen').addEventListener('click', fullscreen);
$('slideshow').addEventListener('click', startSlideshow);
$('retry-image').addEventListener('click', () => renderSelection());
$('empty-action').addEventListener('click', () => { if (state.mode === 'favorites') setMode('browse'); else loadArchive(true); });
$('download').addEventListener('click', () => openDialog('download-dialog'));
document.querySelectorAll('[data-size]').forEach((button) => button.addEventListener('click', () => download(button.dataset.size)));
$('settings').addEventListener('click', () => openDialog('settings-dialog'));
$('about').addEventListener('click', () => openDialog('about-dialog'));
$('details').addEventListener('click', () => {
  const item = selected(); if (!item) return;
  $('details-title').textContent = item.title;
  $('detail-description').textContent = item.description;
  $('detail-date').textContent = friendlyDate(item.date);
  $('detail-market').textContent = MARKET_NAMES[item.market];
  $('detail-credit').textContent = item.credit;
  let source = 'https://www.bing.com';
  try { const url = new URL(item.sourceUrl); if (url.protocol === 'https:' && ['www.bing.com', 'cn.bing.com'].includes(url.hostname)) source = url.href; } catch { /* Safe default. */ }
  $('detail-source').href = source;
  openDialog('details-dialog');
});
document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.append($('toast')); });
});
$('auto-refresh').addEventListener('change', () => { state.autoRefresh = $('auto-refresh').checked; saveSettings(); scheduleRefresh(); status(); });
$('contain-image').addEventListener('change', () => { state.contain = $('contain-image').checked; $('gallery').classList.toggle('contain', state.contain); saveSettings(); });
document.addEventListener('keydown', (event) => {
  if (document.querySelector('dialog[open]') || event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;
  if (state.fullscreenView && event.key === 'Escape') { event.preventDefault(); exitFullscreenView(); return; }
  if (state.fullscreenView && event.key === 'Tab') {
    const controls = [...$('gallery').querySelectorAll('button:not([disabled])')].filter((button) => !button.closest('[hidden]'));
    const first = controls[0]; const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
  if (event.key.toLowerCase() === 'l') toggleFavorite();
  if (event.key.toLowerCase() === 'f') fullscreen();
});
let touchStart;
$('gallery').addEventListener('touchstart', (event) => { if (!event.target.closest('button')) touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }, { passive: true });
$('gallery').addEventListener('touchend', (event) => {
  if (!touchStart) return;
  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
  touchStart = null;
}, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopSlideshow();
  else if (state.autoRefresh && !state.busy && Date.now() - state.lastCheck >= HOUR) loadArchive();
  scheduleRefresh();
});
window.addEventListener('online', () => { status(); loadArchive(); });
window.addEventListener('offline', status);
window.addEventListener('pagehide', () => {
  state.request?.abort(); stopSlideshow(); clearInterval(state.refreshTimer); clearTimeout(state.toastTimer);
  for (const url of downloadUrls) URL.revokeObjectURL(url);
  downloadUrls.clear();
});
window.addEventListener('pageshow', (event) => { if (event.persisted) { scheduleRefresh(); loadArchive(); } });
window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); state.installPrompt = event; $('install').hidden = false; });
$('install').addEventListener('click', async () => {
  if (!state.installPrompt) return;
  await state.installPrompt.prompt(); state.installPrompt = null; $('install').hidden = true;
});
window.addEventListener('storage', (event) => {
  if (event.key === `${KEY}:favorites`) {
    const entries = readStored('favorites', []);
    state.favorites = Array.isArray(entries) ? entries.filter(validImage).slice(0, 200) : [];
    if (state.mode === 'favorites') renderSelection(); else { favoriteButton(); renderStrip(); }
  }
});

restoreArchive(); renderSelection(); loadArchive(); scheduleRefresh();
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Warm the offline cache even if the initial request preceded installation.
    loadArchive();
    for (const item of images()) fetch(imageUrl(item, '640x360')).catch(() => {});
    if (selected()) fetch(imageUrl(selected())).catch(() => {});
  });
  navigator.serviceWorker.register('/sw.js').catch(() => { /* Online use remains available. */ });
}
