const $ = (id) => document.getElementById(id);
const MARKET_NAMES = { 'zh-CN': '中国', 'en-US': '美国', 'en-GB': '英国', 'ja-JP': '日本', 'de-DE': '德国', 'fr-FR': '法国' };
const HOUR = 3600000;
const KEY = 'daily-picture-v1';
let storageWarning = false;
let offlineCacheWarning = false;

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
  heroDimensions: null, heroTimer: null,
  fullscreenView: null,
  historyImages: [], historyError: null, historyCatalog: null, historyMonth: null, historyBusy: false, historyRequest: null, historyGeneration: 0,
};
const downloadUrls = new Set();
function images() { return state.mode === 'favorites' ? state.favorites : state.mode === 'history' ? state.historyImages : state.images; }
function selected() { return images()[state.index]; }
function imageUrl(image, size = '1920x1080', direct = true) {
  if(image.history === true) {
    const variant=size==='640x360'?'thumb':size==='original'?'original':'preview';
    return `/api/history/image?${new URLSearchParams({date:image.date,id:image.id,size:variant,...(image.market!=='zh-CN'?{market:image.market}:{}),...(direct&&variant!=='thumb'?{direct:'1'}:{})})}`;
  }
  return `/api/image?${new URLSearchParams({id:image.id,size})}`;
}
function sameImage(a,b) { return a?.id===b?.id && a?.date===b?.date && a?.market===b?.market; }
function liked(image) { return state.favorites.some((item) => sameImage(item,image)); }
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
  if(state.mode==='history') {
    const region=MARKET_NAMES[state.market];
    $('sync-status').textContent=state.historyBusy ? `正在读取历史索引… · ${region}` : state.historyError ? `历史索引读取失败 · ${region}`
      : `${navigator.onLine?'历史影像':'离线历史'} · ${region} · ${state.historyMonth || '按月浏览'} · ${state.historyImages.length} 张`;
    return;
  }
  if(state.mode==='favorites') {
    $('sync-status').textContent=`我的收藏 · ${state.favorites.length} 张`;
    return;
  }
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
  if(state.mode==='favorites')status();
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
let lazyQueue = [], lazyActive = 0;
const lazyLoads = new Map();
const historyObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) { historyObserver.unobserve(entry.target); lazyQueue.push(entry.target); }
  drainImages();
}, {rootMargin:'80px'}) : null;
function drainImages() {
  while (lazyActive < 2 && lazyQueue.length) {
    const img=lazyQueue.shift();
    if (!img.isConnected) continue;
    lazyActive++;
    let done=false;
    const complete=()=>{if(done)return;done=true;lazyLoads.delete(img);lazyActive--;drainImages();};
    lazyLoads.set(img,complete);
    img.addEventListener('load',complete,{once:true}); img.addEventListener('error',complete,{once:true});
    img.src=img.dataset.src;
    if(img.complete) complete();
  }
}
function resetLazyImages() {
  historyObserver?.disconnect(); lazyQueue = [];
  for (const [img,complete] of lazyLoads) { complete(); img.removeAttribute('src'); }
}
let stripList, stripMode, stripBusy, stripFavorites;
let stripIndex = -1;
let stripNodes = [];
function renderStrip() {
  const list = images();
  const loading=state.mode === 'history' ? state.historyBusy : state.busy;
  if (stripList === list && stripMode === state.mode && (list.length || stripBusy === loading)) {
    stripNodes[stripIndex]?.button.setAttribute('aria-pressed', 'false');
    stripNodes[state.index]?.button.setAttribute('aria-pressed', 'true');
    stripIndex = state.index;
    if (stripFavorites !== state.favorites) {
      stripNodes.forEach((node, index) => {
        const active = liked(list[index]);
        if (active && !node.heart) { node.heart = icon('heart', 'icon thumb-heart'); node.frame.append(node.heart); }
        else if (!active && node.heart) { node.heart.remove(); node.heart = null; }
      });
      stripFavorites = state.favorites;
    }
    return;
  }
  const focused = stripNodes.findIndex((node) => node.button === document.activeElement);
  const focusedId = focused >= 0 ? stripList[focused]?.id : null;
  resetLazyImages();
  stripNodes = [];
  const fragment = document.createDocumentFragment();
  list.forEach((item, index) => {
    const button = document.createElement('button');
    button.className = 'thumbnail';
    button.setAttribute('aria-label', `${shortDate(item.date)}：${item.title}`);
    button.setAttribute('aria-pressed', String(index === state.index));
    button.title = `${item.title} · ${item.description}`;
    const frame = document.createElement('span'); frame.className = 'thumbnail-image';
    if(item.history) frame.classList.add('thumb-history');
    const img = document.createElement('img');
    if(item.history && historyObserver) {img.dataset.src=imageUrl(item,'640x360');historyObserver.observe(img);}
    else img.src = imageUrl(item, '640x360');
    img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.width = 640; img.height = 360;
    img.addEventListener('error', () => { img.hidden = true; frame.classList.add('thumb-broken'); button.title = `${item.title} · 图片暂不可用，可选中后重试`; });
    const date = document.createElement('span'); date.className = 'thumb-day'; date.textContent = shortDate(item.date);
    frame.append(img, date);
    if (index === 0 && state.mode === 'browse') {
      const badge = document.createElement('span'); badge.className = 'thumb-tag'; badge.textContent = '最新'; frame.append(badge);
    }
    const heart = liked(item) ? icon('heart', 'icon thumb-heart') : null;
    if (heart) frame.append(heart);
    const caption = document.createElement('span'); caption.className = 'thumbnail-caption';
    const name = document.createElement('span'); name.textContent = item.title;
    caption.append(name);
    button.append(frame, caption);
    button.addEventListener('click', () => { stopSlideshow(); state.index = index; renderSelection(); });
    fragment.append(button);
    stripNodes.push({ button, frame, heart });
  });
  if (!images().length) {
    if (loading && state.mode !== 'favorites') {
      for (let i = 0; i < 15; i++) { const card = document.createElement('div'); card.className = 'filmstrip-placeholder'; fragment.append(card); }
    } else { const message = document.createElement('p'); message.className = 'collection-empty'; message.textContent = state.mode === 'favorites' ? '你的风景故事，从一次收藏开始。' : state.mode === 'history' ? '请选择其他月份，或刷新重试。' : '图片列表将在联网后显示。'; fragment.append(message); }
  }
  $('filmstrip').replaceChildren(fragment);
  stripList = list; stripMode = state.mode; stripBusy = loading; stripFavorites = state.favorites; stripIndex = state.index;
  if (focusedId) stripNodes[list.findIndex((item) => item.id === focusedId)]?.button.focus({ preventScroll: true });
}
function renderSelection() {
  const list = images();
  state.index = Math.max(0, Math.min(state.index, list.length - 1));
  const item = selected();
  $('gallery').classList.toggle('history-view',item?.history === true);
  $('image-error').hidden = true;
  $('hero-image').hidden = true;
  state.heroGeneration++;
  clearTimeout(state.heroTimer); state.heroTimer=null;
  state.heroDimensions=null;
  for (const id of ['image-bottom', 'position']) $(id).hidden = !item;
  // Keep the exit control available until a native fullscreen exit completes.
  $('image-topbar').hidden = !item && !state.fullscreenView;
  $('previous').hidden = $('next').hidden = list.length < 2;
  $('slideshow').disabled = list.length < 2;
  favoriteButton();
  const busy = state.mode === 'history' ? state.historyBusy : state.mode === 'browse' && state.busy;
  $('empty-state').hidden = Boolean(item) || busy;
  $('loading-state').hidden = !item && !busy;
  $('loading-label').textContent = state.mode === 'history' ? '正在打开这段时光…' : '正在打开风景…';
  $('image-error-text').textContent = item?.history ? '这张旧图暂时不可用，索引仍保留。可稍后重试或查看其他图片。' : '图片未能加载';
  if (!item) {
    exitFullscreenView();
    const favorites = state.mode === 'favorites';
    $('empty-title').textContent = favorites ? '把喜欢的风景留下来' : '风景正在路上';
    $('empty-description').textContent = favorites ? '点击图片上的爱心，建立自己的风景收藏。' : '暂时无法连接 Bing。检查网络后，再试一次。';
    $('empty-action').textContent = favorites ? '去发现图片' : '重新连接';
    if(state.mode === 'history') { $('empty-title').textContent = state.historyError ? '暂时无法读取这个月' : '这个月的风景还未收录'; $('empty-description').textContent = state.historyError || '可选择其他月份，或稍后刷新重试。'; $('empty-action').textContent='刷新本月'; }
    $('edition').lastElementChild.textContent = '—';
    renderStrip();
    return;
  }
  $('photo-date').textContent = friendlyDate(item.date);
  $('photo-market').textContent = `${MARKET_NAMES[item.market]} · ${item.history ? '历史影像' : 'BING'}`;
  $('photo-title').textContent = item.title;
  $('photo-description').textContent = item.description.length > 140 ? `${item.description.slice(0,140)}…` : item.description;
  $('photo-credit').textContent = item.credit;
  $('image-label').textContent = state.mode === 'favorites' ? '我的收藏' : state.mode === 'browse' && state.index === 0 ? '最新精选' : '时光里的风景';
  $('position').textContent = `${String(state.index + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
  $('edition').lastElementChild.textContent = friendlyDate(item.date);
  const generation = state.heroGeneration;
  const hero = $('hero-image');
  let fallback=false;
  hero.crossOrigin='anonymous';
  hero.alt = `${item.title}：${item.description}`;
  hero.onload = () => {
    if (generation !== state.heroGeneration) return;
    clearTimeout(state.heroTimer);
    if(item.history&&hero.naturalWidth&&hero.naturalHeight&&(hero.naturalWidth<320||hero.naturalHeight<180)){hero.onerror();return;}
    hero.hidden = false; $('loading-state').hidden = true; $('image-error').hidden = true;
    state.heroDimensions={width:hero.naturalWidth,height:hero.naturalHeight};
    historyDownloadSize();
  };
  hero.onerror = () => {
    if (generation !== state.heroGeneration) return;
    clearTimeout(state.heroTimer);
    if(item.history&&!fallback){fallback=true;hero.src=imageUrl(item,'1920x1080',false);return;}
    $('loading-state').hidden = true; $('image-error').hidden = false;
  };
  hero.src = imageUrl(item);
  if(item.history)state.heroTimer=setTimeout(hero.onerror,12000);
  if (hero.complete && hero.naturalWidth) hero.onload();
  renderStrip();
}
async function setMode(mode) {
  stopSlideshow();
  state.mode = mode; state.index = 0;
  const favorites = mode === 'favorites';
  const history = mode === 'history';
  state.historyRequest?.abort(); state.historyGeneration++; state.historyBusy=false;
  $('history-controls').hidden=!history;
  $('history-tab').classList.toggle('active',history); $('history-tab').setAttribute('aria-pressed',String(history));
  $('browse-tab').classList.toggle('active', mode === 'browse'); $('browse-tab').setAttribute('aria-pressed', String(mode === 'browse'));
  $('notice').hidden = history || !state.stale;
  $('favorites-tab').classList.toggle('active', favorites); $('favorites-tab').setAttribute('aria-pressed', String(favorites));
  $('page-heading').textContent = history ? '沿着时间，重遇一片风景。' : favorites ? '喜欢的风景，值得再看一遍。' : '每天，发现一点不一样。';
  $('filmstrip-title').textContent = history ? '按月回望' : favorites ? '我的风景收藏' : '最近十五日';
  $('filmstrip-subtitle').textContent = favorites ? '每一次心动，都有迹可循' : '让美好，多停留一会儿';
  renderSelection();
  status();
  if(history) await loadHistory();
}
function move(delta, manual = true) {
  if (manual) stopSlideshow();
  if (images().length < 2) return;
  state.index = (state.index + delta + images().length) % images().length;
  renderSelection();
}
function historyPickers() {
  const months=state.historyCatalog.months;
  const year=state.historyMonth.slice(0,4);
  function options(id, values, selected, label) {
    $(id).replaceChildren(...values.map(value=>{const option=document.createElement('option');option.value=value;option.textContent=label(value);return option;}));
    $(id).value=selected;
  }
  options('history-year',[...new Set(months.map(m=>m.slice(0,4)))],year,y=>`${y} 年`);
  options('history-month',months.filter(m=>m.startsWith(year)),state.historyMonth,m=>`${Number(m.slice(5))} 月`);
}
async function loadHistory(force=false) {
  state.historyRequest?.abort();
  const controller=new AbortController();state.historyRequest=controller;
  const generation=++state.historyGeneration;
  const month=state.historyMonth;
  const market=state.market;
  const query=values=>{const params=new URLSearchParams({...values,...(market!=='zh-CN'?{market}:{})});return '/api/history'+(params.size?'?'+params:'');};
  state.historyBusy=true;state.historyError=null;state.historyImages=[];state.index=0;
  status();
  $('history-label').textContent=`${MARKET_NAMES[market]} · 历史影像`;
  $('history-market').value=market;
  $('history-year').disabled=true;$('history-month').disabled=true;
  $('history-status').textContent='正在读取所选月份…';
  $('filmstrip-title').textContent=month ? `${month.replace('-',' 年 ')} 月` : '按月回望';
  $('filmstrip-subtitle').textContent='正在读取所选月份…';
  renderSelection();
  const timeout=setTimeout(()=>controller.abort(),25000);
  const json=async url=>{const response=await fetch(url,{signal:controller.signal,cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error || '历史归档暂时不可用。');return data;};
  try {
    if(!state.historyCatalog || (state.historyCatalog.market||'zh-CN')!==market || force) {
      const catalog=await json(query({}));
      if(generation!==state.historyGeneration)return;
      if((catalog.market||'zh-CN')!==market || !Array.isArray(catalog.months) || !catalog.months.length || !catalog.months.includes(catalog.latest) || !catalog.months.every(m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m)))throw new Error('历史年月目录格式异常。');
      state.historyCatalog=catalog;
      state.historyMonth=catalog.months.includes(month)?month:catalog.latest;
    }
    historyPickers();
    $('history-year').disabled=false;$('history-month').disabled=false;
    const requested=state.historyMonth;
    const data=await json(query({month:requested,...(force?{refresh:'1'}:{})}));
    if(generation!==state.historyGeneration || state.mode!=='history')return;
    if((data.market||'zh-CN')!==market || data.month!==requested || !Array.isArray(data.images) || data.images.length>31 || !data.images.every(i=>validImage(i) && i.history===true && i.market===market && i.date.startsWith(requested)))throw new Error('历史图片列表格式异常。');
    state.historyImages=data.images;
    $('filmstrip-title').textContent=`${requested.replace('-',' 年 ')} 月 · ${data.images.length} 张`;
    $('filmstrip-subtitle').textContent='选择缩略图，查看当日影像';
    $('history-status').textContent=data.stale ? (data.warning || '正在显示已保存的历史索引。') : data.images.length ? `本月收录 ${data.images.length} 张影像` : '这个月暂时没有收录图片，可选择其他月份。';
    if(state.historyCatalog.sync?.error) $('history-status').textContent+=` ${state.historyCatalog.sync.error}`;
  } catch(error) {
    if(generation!==state.historyGeneration || state.mode!=='history')return;
    state.historyError=controller.signal.aborted?'加载超时，请刷新重试。':error.message;
    $('history-status').textContent=state.historyError;
  } finally {
    clearTimeout(timeout);
    if(generation===state.historyGeneration) {state.historyBusy=false;if(state.mode==='history'){renderSelection();status();}}
  }
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
    $('notice').hidden = state.mode === 'history' || (!state.stale && !data.historyWarning);
    $('notice').textContent = data.historyWarning || data.warning || '离线浏览：正在显示上次成功更新的图片。';
    if (state.mode === 'browse') {
      state.index = Math.max(0, state.images.findIndex((item) => item.id === currentId));
      renderSelection();
    }
    if (force) toast(state.stale ? '当前显示缓存图片，稍后可再次刷新。' : data.cache === 'cooldown' ? '刚刚检查过更新，请稍后再刷新。' : '已与 Bing 同步，最新风景就在这里。');
  } catch (error) {
    if (generation !== state.generation) return;
    if (controller.signal.aborted && document.hidden) return;
    state.stale = true;
    $('notice').hidden = state.mode === 'history';
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
  state.favorites = exists ? state.favorites.filter((entry) => !sameImage(entry,item)) : [{ ...item, savedAt: new Date().toISOString() }, ...state.favorites];
  const saved = writeStored('favorites', state.favorites);
  if (state.mode === 'favorites') { stopSlideshow(); renderSelection(); }
  else { favoriteButton(); renderStrip(); }
  if (saved) toast(exists ? '已从收藏中移除。' : '已收藏，把这片风景留在身边。');
}
function historyDownloadSize() {
  const size=selected()?.availability;
  $('history-download-size').textContent=size?.width && size?.height ? `${size.width} × ${size.height} · 最近校验尺寸` : '下载来源提供的原图，尺寸以实际文件为准';
}
async function openDialog(id) {
  stopSlideshow();
  if (!await exitFullscreenView()) return;
  if(id==='download-dialog') {
    const history=selected()?.history === true;
    historyDownloadSize();
    $('history-download-note').hidden=!history;
    $('download-description').textContent=history ? '保存这张历史影像到下载文件夹。' : '选择适合屏幕的尺寸，保存到下载文件夹。';
    $('download-note').textContent=history ? '请保留摄影版权与来源信息。下载后可在系统设置中设为壁纸。' : '尺寸以 Bing 实际返回为准。下载后可在系统设置中设为桌面或锁屏。';
    document.querySelectorAll('[data-size]').forEach(button=>{button.hidden=history ? button.dataset.size !== 'original' : button.dataset.size === 'original';});
  }
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
    const signal=AbortSignal.timeout(30000);
    async function read(direct){
      // Reserve time for the same-origin fallback when the browser cannot reach Bing.
      const controller=new AbortController();
      const timer=item.history&&direct?setTimeout(()=>controller.abort(),10000):null;
      const attempt=timer?AbortSignal.any([signal,controller.signal]):signal;
      try{
      const response=await fetch(`${imageUrl(item,size,direct)}&download=1`,{signal:attempt});
      // A protected original (including an older favorite) is already being served locally.
      // Allow its body the full transfer budget instead of retrying the same large file.
      if(response.url&&new URL(response.url).origin===location.origin)clearTimeout(timer);
      if(!response.ok||!response.headers.get('Content-Type')?.startsWith('image/'))throw new Error('download');
      const blob=await response.blob();
      if(blob.size>20*1024*1024||blob.size<100)throw new Error('download');
      if(item.history&&typeof createImageBitmap==='function'){
        const bitmap=await createImageBitmap(blob);try{if(bitmap.width<320||bitmap.height<180)throw new Error('placeholder');}finally{bitmap.close();}
      }
      return blob;
      }finally{clearTimeout(timer);}
    }
    let blob;
    try{blob=await read(true);}catch(error){if(!item.history||signal.aborted)throw error;blob=await read(false);}
    const objectUrl = URL.createObjectURL(blob);
    downloadUrls.add(objectUrl);
    const link = document.createElement('a'); link.href = objectUrl; link.download = item.history ? `Bing_${item.market.split('-')[1]}_${item.date}.jpg` : `${item.id}_${size}.jpg`;
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
$('history-tab').addEventListener('click', () => setMode('history'));
$('history-year').addEventListener('change', () => {
  const months=state.historyCatalog.months.filter(m=>m.startsWith($('history-year').value));
  state.historyMonth=months.find(m=>m.slice(5)===state.historyMonth?.slice(5)) || months[0];
  historyPickers(); return loadHistory();
});
$('history-month').addEventListener('change', () => {state.historyMonth=$('history-month').value;return loadHistory();});
async function setMarket(market) {
  if(!Object.hasOwn(MARKET_NAMES,market)||market===state.market)return;
  stopSlideshow();state.request?.abort();state.generation++;state.busy=false;
  $('refresh').disabled=false;$('refresh').classList.remove('busy');
  state.market=market;$('market').value=market;$('history-market').value=market;
  state.historyCatalog=null;state.historyImages=[];
  saveSettings();restoreArchive();status();
  if(state.mode==='history')return loadHistory();
  await setMode('browse');return loadArchive();
}
$('market').addEventListener('change', () => setMarket($('market').value));
$('history-market').addEventListener('change', () => setMarket($('history-market').value));
$('refresh').addEventListener('click', () => state.mode === 'history' ? loadHistory(true) : loadArchive(true));
$('previous').addEventListener('click', () => move(-1));
$('next').addEventListener('click', () => move(1));
$('favorite').addEventListener('click', toggleFavorite);
$('fullscreen').addEventListener('click', fullscreen);
$('slideshow').addEventListener('click', startSlideshow);
$('retry-image').addEventListener('click', () => renderSelection());
$('empty-action').addEventListener('click', () => { if (state.mode === 'favorites') setMode('browse'); else if(state.mode==='history') return loadHistory(true); else loadArchive(true); });
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
  const archived=item.history === true;
  if(archived && item.snapshot) source='https://github.com/npanuhin/Bing-Wallpaper-Archive';
  else if(archived && item.source==='zxyongyo') source='https://github.com/zxyongyo/bing-daily-wallpaper';
  $('detail-source').href = source;
  $('detail-source').textContent = archived && (item.snapshot || item.source==='zxyongyo') ? '查看历史归档项目 ↗' : '在 Bing 了解更多 ↗';
  $('detail-history').hidden=!archived;
  const sourceNames={npanuhin:'npanuhin/Bing-Wallpaper-Archive',zxyongyo:'zxyongyo/bing-daily-wallpaper',bing:'Bing 每日索引'};
  const sourceLabels=(Array.isArray(item.sources)?item.sources:[item.source]).map(key=>sourceNames[key]).filter(Boolean);
  $('detail-history').textContent = archived ? `索引来源：${sourceLabels.join('、') || 'Bing 每日索引'}。缩略图由本站保存，预览与原图按需从 Bing 或历史归档获取；尺寸以实际图片为准。` : '';
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
  state.request?.abort(); state.historyRequest?.abort(); state.historyGeneration++; resetLazyImages(); stopSlideshow(); clearInterval(state.refreshTimer); clearTimeout(state.toastTimer); clearTimeout(state.heroTimer);
  for (const url of downloadUrls) URL.revokeObjectURL(url);
  downloadUrls.clear();
});
window.addEventListener('pageshow', (event) => { if (event.persisted) { scheduleRefresh(); loadArchive(); if(state.mode === 'history') loadHistory(); } });
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
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'offline-cache-unavailable' && !offlineCacheWarning) {
      offlineCacheWarning = true;
      toast('图片已显示，但离线保存暂时不可用。请检查浏览器存储空间。');
    }
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Warm the offline cache even if the initial request preceded installation.
    loadArchive();
    if(state.mode !== 'history') for (const item of images().filter(item=>!item.history)) fetch(imageUrl(item, '640x360')).catch(() => {});
    if (selected()) fetch(imageUrl(selected())).catch(() => {});
  });
  navigator.serviceWorker.register('/sw.js').catch(() => { /* Online use remains available. */ });
}
