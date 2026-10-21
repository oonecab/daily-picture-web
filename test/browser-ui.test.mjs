import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

// Run the complete application against a small DOM boundary double. Layout and
// browser top-layer behavior are checked separately in the real browser.
function browser({ native = 'missing', empty = false, archiveCache = null, worker = false, fetchImpl, observe = false, abortSignal = AbortSignal, bitmap } = {}) {
  const elements = new Map();
  const downloaded=[],timeouts=[];
  let document;
  class Element {
    constructor(tagName = 'div', id = '') {
      this.tagName = tagName.toUpperCase(); this.id = id;
      this.attributes = new Map(); this.listeners = new Map(); this.children = [];
      this.hidden = false; this.disabled = false; this.inert = false;
      this.style = { top: '' }; this.dataset = {};
      const classes = new Set();
      this.classList = {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        contains: (name) => classes.has(name),
        toggle(name, force = !classes.has(name)) { if (force) classes.add(name); else classes.delete(name); return force; },
      };
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    addEventListener(name, listener) {
      const listeners = this.listeners.get(name) || []; listeners.push(listener); this.listeners.set(name, listeners);
    }
    async emit(name, data = {}) {
      const event = { target: this, preventDefault() { this.defaultPrevented = true; }, ...data };
      for (const listener of this.listeners.get(name) || []) await listener(event);
      return event;
    }
    append(...nodes) { nodes.forEach((node) => { if (node.tagName === '#FRAGMENT') this.append(...node.children); else { node.parentElement = this; this.children.push(node); } }); }
    replaceChildren(...nodes) {
      if (this.children.some((node) => node === document.activeElement)) document.activeElement = document.body;
      this.children.forEach((node) => { node.parentElement = null; }); this.children = []; this.append(...nodes);
    }
    remove() { if (this.parentElement) { this.parentElement.children = this.parentElement.children.filter((node) => node !== this); this.parentElement = null; } }
    get isConnected() { return Boolean(this.parentElement); }
    get lastElementChild() { return this.children.at(-1) || new Element(); }
    focus() { document.activeElement = this; }
    click() { if(this.tagName==='A'&&this.download)downloaded.push(this.download);return this.emit('click'); }
    closest(selector) { return selector === '[hidden]' ? (this.hidden ? this : this.parentElement?.closest(selector)) : null; }
    querySelector(selector) {
      if (selector === '.close-dialog') { this.closeButton ||= new Element('button'); return this.closeButton; }
      return null;
    }
    querySelectorAll(selector) {
      if (this.id === 'gallery' && selector === 'button:not([disabled])') return galleryButtons.filter((button) => !button.disabled);
      return [];
    }
    showModal() { this.open = true; }
    close() { this.open = false; }
  }
  for (const match of html.matchAll(/<([a-z][\w-]*)\b[^>]*\bid="([^"]+)"/g)) elements.set(match[2], new Element(match[1], match[2]));
  const get = (id) => { assert.ok(elements.has(id), `Unknown element ${id}`); return elements.get(id); };
  const gallery = get('gallery');
  const galleryButtons = ['slideshow', 'fullscreen', 'previous', 'next', 'retry-image', 'empty-action', 'favorite', 'details', 'download'].map(get);
  galleryButtons.forEach((button) => gallery.append(button));
  get('image-error').append(get('retry-image'));
  get('empty-state').append(get('empty-action'));
  const background = [new Element('header'), new Element('a'), new Element('footer')];
  // Pre-existing inert state must survive the temporary viewer.
  background[2].inert = true;
  document = new Element('document');
  document.body = new Element('body'); document.documentElement = new Element('html');
  document.activeElement = get('fullscreen'); document.fullscreenElement = null;
  document.getElementById = get;
  document.createElement = (tag) => new Element(tag);
  document.createElementNS = (_namespace, tag) => new Element(tag);
  document.createDocumentFragment = () => new Element('#fragment');
  document.querySelector = (selector) => selector === 'dialog[open]' ? [...elements.values()].find((element) => element.open) || null : null;
  document.querySelectorAll = (selector) => {
    if (selector === 'dialog') return [...elements.values()].filter((element) => element.tagName === 'DIALOG');
    if (selector === '.app-header, .skip-link, main > :not(#gallery)') return background;
    return [];
  };
  const window = new Element('window');
  window.scrollX = 0; window.scrollY = 347;
  window.scrollTo = (x, y) => { window.scrollX = x; window.scrollY = y; };
  let requests = 0;
  if (native !== 'missing') {
    const prefixed = native === 'prefixed';
    document[prefixed ? 'webkitFullscreenEnabled' : 'fullscreenEnabled'] = native !== 'disabled';
    gallery[prefixed ? 'webkitRequestFullscreen' : 'requestFullscreen'] = async function () {
      assert.equal(this, gallery); requests++;
      if (native === 'reject') throw new Error('Fullscreen denied');
      document[prefixed ? 'webkitFullscreenElement' : 'fullscreenElement'] = gallery;
      await document.emit(prefixed ? 'webkitfullscreenchange' : 'fullscreenchange');
    };
    document[prefixed ? 'webkitExitFullscreen' : 'exitFullscreen'] = async function () {
      assert.equal(this, document);
      document[prefixed ? 'webkitFullscreenElement' : 'fullscreenElement'] = null;
      await document.emit(prefixed ? 'webkitfullscreenchange' : 'fullscreenchange');
    };
  }
  const images = empty ? [] : [0, 1].map((i) => ({ id: `OHR.Test${i}`, date: '2026-10-19', market: 'zh-CN', title: `风景 ${i}`, description: '测试风景', credit: '© Test', copyright: '© Test' }));
  const stored = new Map([
    ['daily-picture-v1:settings', JSON.stringify({ autoRefresh: false })],
    ['daily-picture-v1:archive:zh-CN', JSON.stringify({ market: 'zh-CN', images })],
    ['daily-picture-v1:favorites', JSON.stringify(images.slice(0, 1))],
  ]);
  const serviceWorker = new Element('serviceworker');
  serviceWorker.register = async () => {};
  const observed=[]; let intersect;
  const context = vm.createContext({
    ...(observe ? {IntersectionObserver:class { constructor(callback){intersect=callback;} observe(img){observed.push(img);} unobserve(){} disconnect(){observed.length=0;} }} : {}),
    document, window, navigator: { onLine: true, ...(worker ? { serviceWorker } : {}) },
    localStorage: { getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    URL, URLSearchParams, AbortController, AbortSignal:abortSignal, console,
    ...(bitmap?{createImageBitmap:bitmap}:{}),
    fetch: fetchImpl || (archiveCache ? async () => ({ ok: true, json: async () => ({ market: 'zh-CN', images, fetchedAt: '2026-10-20T00:00:00Z', cache: archiveCache, stale: false }) }) : () => new Promise(() => {})),
    setTimeout: (callback,delay) => {const timer={callback,delay,cancelled:false};timeouts.push(timer);return timer;}, clearTimeout(timer) {if(timer)timer.cancelled=true;}, setInterval: () => 1, clearInterval() {},
  });
  vm.runInContext(source, context);
  return { get, gallery, document, window, background, serviceWorker, observed, downloaded, timeouts, intersect:entries=>intersect(entries), context, requests: () => requests };
}

test('manual refresh reports cooldown instead of claiming a fresh upstream sync', async () => {
  const b = browser({ archiveCache: 'cooldown' });
  await b.get('refresh').emit('click');
  assert.equal(b.get('toast').textContent, '刚刚检查过更新，请稍后再刷新。');
  assert.equal(b.get('refresh').disabled, false);
});
test('offline storage failure is shown once per page', async () => {
  const b = browser({ worker: true });
  await b.serviceWorker.emit('message', { data: { type: 'offline-cache-unavailable' } });
  assert.match(b.get('toast').textContent, /离线保存暂时不可用/);
  b.get('toast').textContent = 'Later notification';
  await b.serviceWorker.emit('message', { data: { type: 'offline-cache-unavailable' } });
  assert.equal(b.get('toast').textContent, 'Later notification');
});

test('thumbnail selection preserves nodes and keyboard focus while updating selection and favorite marks', async () => {
  const b = browser();
  const thumbnails = [...b.get('filmstrip').children];
  assert.equal(thumbnails.length, 2);
  thumbnails[1].focus();
  await thumbnails[1].emit('click');
  assert.deepEqual(b.get('filmstrip').children, thumbnails);
  assert.equal(b.document.activeElement, thumbnails[1]);
  assert.equal(thumbnails[0].getAttribute('aria-pressed'), 'false');
  assert.equal(thumbnails[1].getAttribute('aria-pressed'), 'true');
  await b.get('favorite').emit('click');
  assert.deepEqual(b.get('filmstrip').children, thumbnails);
  assert.equal(b.document.activeElement, thumbnails[1]);
  assert.ok(thumbnails[1].children[0].children.some((node) => node.tagName === 'SVG'));
  await b.get('favorite').emit('click');
  assert.ok(!thumbnails[1].children[0].children.some((node) => node.tagName === 'SVG'));
});

test('missing fullscreen API opens a viewport viewer and restores scrolling and focus on exit', async () => {
  const b = browser();
  await b.get('fullscreen').emit('click');
  assert.equal(b.gallery.classList.contains('is-fullscreen'), true);
  assert.equal(b.document.body.classList.contains('viewer-open'), true);
  assert.equal(b.document.body.style.top, '-347px');
  assert.equal(b.get('fullscreen').getAttribute('aria-label'), '退出全屏');
  assert.equal(b.get('fullscreen').getAttribute('aria-pressed'), 'true');
  assert.equal(b.gallery.getAttribute('aria-modal'), 'true');
  assert.ok(b.background.every((element) => element.inert));
  b.window.scrollY = 0;
  await b.get('fullscreen').emit('click');
  assert.equal(b.gallery.classList.contains('is-fullscreen'), false);
  assert.equal(b.document.body.classList.contains('viewer-open'), false);
  assert.equal(b.document.body.style.top, '');
  assert.equal(b.window.scrollY, 347);
  assert.equal(b.document.activeElement, b.get('fullscreen'));
  assert.deepEqual(b.background.map((element) => element.inert), [false, false, true]);
  assert.equal(b.gallery.getAttribute('aria-modal'), null);
  assert.equal(b.get('fullscreen').getAttribute('aria-label'), '全屏欣赏');
});

for (const native of ['reject', 'disabled']) {
  test(`${native} native fullscreen keeps the viewport viewer usable`, async () => {
    const b = browser({ native });
    await b.get('fullscreen').emit('click');
    assert.equal(b.gallery.classList.contains('is-fullscreen'), true);
    assert.equal(b.requests(), native === 'disabled' ? 0 : 1);
    await b.get('next').emit('click');
    assert.equal(b.get('photo-title').textContent, '风景 1');
    await b.document.emit('keydown', { key: 'Escape' });
    assert.equal(b.gallery.classList.contains('is-fullscreen'), false);
  });
}

for (const native of ['standard', 'prefixed']) {
  test(`${native} fullscreen synchronizes button state after browser exit`, async () => {
    const b = browser({ native });
    await b.get('fullscreen').emit('click');
    assert.equal(b.requests(), 1);
    assert.equal(b.get('fullscreen').getAttribute('aria-label'), '退出全屏');
    await b.document[native === 'prefixed' ? 'webkitExitFullscreen' : 'exitFullscreen']();
    assert.equal(b.gallery.classList.contains('is-fullscreen'), false);
    assert.equal(b.document.body.classList.contains('viewer-open'), false);
    assert.equal(b.get('fullscreen').getAttribute('aria-pressed'), 'false');
  });
}

test('viewer keyboard focus stays inside until Escape, and download can open after exit', async () => {
  const b = browser();
  await b.get('fullscreen').emit('click');
  b.get('download').focus();
  assert.equal((await b.document.emit('keydown', { key: 'Tab' })).defaultPrevented, true);
  assert.equal(b.document.activeElement, b.get('slideshow'));
  await b.document.emit('keydown', { key: 'Tab', shiftKey: true });
  assert.equal(b.document.activeElement, b.get('download'));
  await b.get('download').emit('click');
  assert.equal(b.gallery.classList.contains('is-fullscreen'), false);
  assert.equal(b.get('download-dialog').open, true);
});

test('removing the last favorite exits the viewer before hiding its exit button', async () => {
  const b = browser();
  await b.get('favorites-tab').emit('click');
  await b.get('fullscreen').emit('click');
  assert.equal(b.gallery.classList.contains('is-fullscreen'), true);
  await b.get('favorite').emit('click');
  assert.equal(b.gallery.classList.contains('is-fullscreen'), false);
  assert.equal(b.document.body.classList.contains('viewer-open'), false);
});

test('an empty gallery cannot enter fullscreen through the keyboard', async () => {
  const b = browser({ native: 'standard', empty: true });
  await b.document.emit('keydown', { key: 'f' });
  assert.equal(b.requests(), 0);
  assert.equal(b.gallery.classList.contains('is-fullscreen'), false);
});

test('a delayed native request is exited if the viewport viewer has already closed', async () => {
  const b = browser({ native: 'standard' });
  let grant;
  b.gallery.requestFullscreen = () => new Promise((resolve) => { grant = async () => {
    b.document.fullscreenElement = b.gallery;
    await b.document.emit('fullscreenchange');
    resolve();
  }; });
  const opening = b.get('fullscreen').emit('click');
  await b.get('fullscreen').emit('click');
  assert.equal(b.gallery.classList.contains('is-fullscreen'), false);
  await grant();
  await opening;
  assert.equal(b.document.fullscreenElement, null);
  assert.equal(b.document.body.classList.contains('viewer-open'), false);
});

test('a failed native exit retains the exit control and waits before opening a dialog', async () => {
  const b = browser({ native: 'standard' });
  await b.get('fullscreen').emit('click');
  b.document.exitFullscreen = async () => { throw new Error('Exit denied'); };
  await b.get('download').emit('click');
  assert.equal(b.gallery.classList.contains('is-fullscreen'), true);
  assert.equal(b.get('fullscreen').getAttribute('aria-label'), '退出全屏');
  assert.notEqual(b.get('download-dialog').open, true);
  assert.equal(b.get('toast').parentElement, b.gallery);
});

test('an empty collection keeps the exit control visible until native fullscreen has exited', async () => {
  const b = browser({ native: 'standard' });
  await b.get('favorites-tab').emit('click');
  await b.get('fullscreen').emit('click');
  b.document.exitFullscreen = async () => { throw new Error('Exit denied'); };
  await b.get('favorite').emit('click');
  assert.equal(b.get('image-topbar').hidden, false);
  assert.equal(b.get('fullscreen').getAttribute('aria-label'), '退出全屏');
  b.document.fullscreenElement = null;
  await b.document.emit('fullscreenchange');
  assert.equal(b.get('image-topbar').hidden, true);
  assert.equal(b.document.body.classList.contains('viewer-open'), false);
});

const historyRow=(date)=>({id:`OHR.History${date.replaceAll('-','')}`,date,history:true,market:'zh-CN',title:date,description:'历史风景',credit:'© Test',copyright:'© Test',snapshot:true,source:'npanuhin'});
const historyCatalog={months:['2026-10','2026-09','2024-04'],latest:'2026-10',sync:{}};
function historyFetch(url){
  if(url==='/api/history')return Promise.resolve({ok:true,json:async()=>historyCatalog});
  if(url.startsWith('/api/history?')){const month=new URL(url,'http://localhost').searchParams.get('month');return Promise.resolve({ok:true,json:async()=>({month,images:Array.from({length:10},(_,i)=>historyRow(`${month}-${String(i+1).padStart(2,'0')}`))})});}
  return new Promise(()=>{});
}
test('history loads one month and starts at most two visible thumbnails; favorite keeps history routing',async()=>{
  const calls=[];
  const b=browser({observe:true,fetchImpl:url=>{calls.push(url);return historyFetch(url);}});
  await b.get('history-tab').emit('click');
  assert.equal(b.get('history-controls').hidden,false);
  assert.equal(b.get('market').disabled,true);
  assert.deepEqual(calls.filter(u=>u.startsWith('/api/history')),['/api/history','/api/history?month=2026-10']);
  assert.equal(b.observed.length,10);assert.ok(b.observed.every(i=>!i.src));
  b.intersect(b.observed.slice(0,4).map(target=>({isIntersecting:true,target})));
  assert.equal(b.observed.filter(i=>i.src).length,2);
  await b.observed[0].emit('load');assert.equal(b.observed.filter(i=>i.src).length,3);
  await b.get('favorite').emit('click');await b.get('favorites-tab').emit('click');
  assert.match(b.get('hero-image').src,/api\/history\/image\?date=2026-10-01/);
  await b.get('details').emit('click');assert.equal(b.get('detail-source').href,'https://github.com/npanuhin/Bing-Wallpaper-Archive');
});
test('late history response cannot replace a later month or a different tab',async()=>{
  let release;
  const b=browser({fetchImpl:url=>url.includes('month=2026-09')?new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>({month:'2026-09',images:[historyRow('2026-09-01')]})});}):historyFetch(url)});
  await b.get('history-tab').emit('click');
  b.get('history-month').value='2026-09';const pending=b.get('history-month').emit('change');
  await b.get('browse-tab').emit('click');release();await pending;
  assert.equal(b.get('photo-title').textContent,'风景 0');assert.equal(b.get('history-controls').hidden,true);
});
test('switching history months releases unfinished thumbnail slots and ignores late completion',async()=>{
  const b=browser({observe:true,fetchImpl:historyFetch});
  await b.get('history-tab').emit('click');
  const old=b.observed.slice(0,2);
  b.intersect(old.map(target=>({isIntersecting:true,target})));
  b.get('history-month').value='2026-09';await b.get('history-month').emit('change');
  b.intersect(b.observed.slice(0,4).map(target=>({isIntersecting:true,target})));
  assert.equal(b.observed.filter(i=>i.src).length,2);
  await old[0].emit('load');
  assert.equal(b.observed.filter(i=>i.src).length,2);
  await b.observed[0].emit('load');
  assert.equal(b.observed.filter(i=>i.src).length,3);
});
test('empty or failed history month stays explicit and does not reuse another month',async()=>{
  const b=browser({fetchImpl:url=>url.includes('month=2026-09')?Promise.resolve({ok:false,json:async()=>({error:'归档暂时不可用'})}):historyFetch(url)});
  await b.get('history-tab').emit('click');b.get('history-month').value='2026-09';await b.get('history-month').emit('change');
  assert.equal(b.get('history-status').textContent,'归档暂时不可用');assert.equal(b.get('hero-image').hidden,true);
});
test('historical downloads use original metadata and never label a resized preview as the original',async()=>{
  const b=browser({fetchImpl:async url=>{
    const response=await historyFetch(url);
    if(url.startsWith('/api/history?')) {const data=await response.json();data.images[0].availability={stored:true,width:3840,height:2160};return {ok:true,json:async()=>data};}
    return response;
  }});await b.get('history-tab').emit('click');
  await b.get('download').emit('click');assert.equal(b.get('history-download-size').textContent,'3840 × 2160 · 最近校验尺寸');
  const hero=b.get('hero-image');hero.naturalWidth=1920;hero.naturalHeight=1080;hero.onload();
  assert.equal(b.get('history-download-size').textContent,'3840 × 2160 · 最近校验尺寸');
  b.get('download-dialog').close();await b.get('next').emit('click');await b.get('download').emit('click');
  assert.equal(b.get('history-download-size').textContent,'下载 Bing 提供的原图，尺寸以实际文件为准');
});
test('the supplementary history source is identified in picture details',async()=>{
  const b=browser({fetchImpl:url=>url.startsWith('/api/history?')?Promise.resolve({ok:true,json:async()=>({month:'2026-10',images:[{...historyRow('2026-10-01'),snapshot:false,source:'zxyongyo'}]})}):historyFetch(url)});
  await b.get('history-tab').emit('click');await b.get('details').emit('click');
  assert.equal(b.get('detail-source').href,'https://github.com/zxyongyo/bing-daily-wallpaper');
  assert.match(b.get('detail-history').textContent,/zxyongyo\/bing-daily-wallpaper/);
});

test('history thumbnails request small files while the selected image requests only its preview',async()=>{
  const b=browser({observe:true,fetchImpl:historyFetch});
  await b.get('history-tab').emit('click');
  assert.ok(b.observed.every(i=>new URL(i.dataset.src,'http://localhost').searchParams.get('size')==='thumb'));
  assert.equal(new URL(b.get('hero-image').src,'http://localhost').searchParams.get('size'),'preview');
  assert.equal(new URL(b.get('hero-image').src,'http://localhost').searchParams.get('direct'),'1');
  assert.ok(b.observed.every(i=>!i.src));
  b.intersect(b.observed.slice(0,4).map(target=>({isIntersecting:true,target})));
  assert.equal(b.observed.filter(i=>i.src).length,2);
});

test('history preview falls back once to the same indexed picture after direct loading fails',async()=>{
 const b=browser({fetchImpl:historyFetch});await b.get('history-tab').emit('click');
 const hero=b.get('hero-image'),direct=new URL(hero.src,'http://localhost');
 hero.onerror();const fallback=new URL(hero.src,'http://localhost');
 assert.equal(fallback.searchParams.has('direct'),false);assert.equal(fallback.searchParams.get('id'),direct.searchParams.get('id'));
 assert.equal(fallback.searchParams.get('date'),direct.searchParams.get('date'));assert.equal(b.get('image-error').hidden,true);
 hero.onerror();assert.equal(b.get('image-error').hidden,false);
 await b.get('next').emit('click');assert.equal(new URL(hero.src,'http://localhost').searchParams.get('direct'),'1');
});

test('historical download reserves fallback time and saves the same indexed image after direct timeout',async()=>{
  const calls=[],deadlines=[];
  const b=browser({abortSignal:{timeout:ms=>{deadlines.push(ms);return new AbortController().signal;},any:AbortSignal.any},
    fetchImpl:(url,options)=>{
      if(!url.includes('/api/history/image'))return historyFetch(url);
      calls.push({url,signal:options.signal});
      if(url.includes('direct=1'))return Promise.reject(new DOMException('timed out','TimeoutError'));
      return Promise.resolve(new Response(new Blob([new Uint8Array(200)],{type:'image/jpeg'})));
    }});
  await b.get('history-tab').emit('click');await vm.runInContext("download('original')",b.context);
  assert.equal(calls.length,2);assert.match(calls[0].url,/direct=1/);assert.doesNotMatch(calls[1].url,/direct=1/);
  assert.equal(calls[0].url.replace('&direct=1',''),calls[1].url);
  assert.notEqual(calls[0].signal,calls[1].signal);assert.deepEqual(deadlines.slice(-2),[30000,10000]);
  assert.deepEqual(b.downloaded,['Bing_CN_2026-10-01.jpg']);assert.match(b.get('toast').textContent,/已交给浏览器下载/);
});

test('historical download rejects a placeholder before falling back and closes both decoders',async()=>{
  let decoded=0,closed=0;const calls=[];
  const b=browser({bitmap:async()=>({width:++decoded===1?16:3840,height:2160,close(){closed++;}}),fetchImpl:url=>{
    if(!url.includes('/api/history/image'))return historyFetch(url);
    calls.push(url);return Promise.resolve(new Response(new Blob([new Uint8Array(200)],{type:'image/jpeg'})));
  }});
  await b.get('history-tab').emit('click');await vm.runInContext("download('original')",b.context);
  assert.equal(calls.length,2);assert.equal(closed,2);assert.equal(b.downloaded.length,1);
});

test('slow direct previews fall back within twelve seconds and stale timers cannot switch a newer image',async()=>{
  const b=browser({fetchImpl:historyFetch});await b.get('history-tab').emit('click');
  const timer=()=>b.timeouts.filter(t=>t.delay===12000).at(-1),first=timer(),hero=b.get('hero-image');
  assert.equal(first.cancelled,false);first.callback();assert.doesNotMatch(hero.src,/direct=1/);assert.equal(first.cancelled,true);
  await b.get('next').emit('click');const next=hero.src,second=timer();first.callback();assert.equal(hero.src,next);
  hero.naturalWidth=1920;hero.naturalHeight=1080;hero.onload();assert.equal(second.cancelled,true);
  await b.get('next').emit('click');const third=timer();await b.window.emit('pagehide');assert.equal(third.cancelled,true);
});
