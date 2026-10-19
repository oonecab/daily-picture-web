import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

// Run the complete application against a small DOM boundary double. Layout and
// browser top-layer behavior are checked separately in the real browser.
function browser({ native = 'missing', empty = false } = {}) {
  const elements = new Map();
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
    append(...nodes) { nodes.forEach((node) => { node.parentElement = this; this.children.push(node); }); }
    replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
    get lastElementChild() { return this.children.at(-1) || new Element(); }
    focus() { document.activeElement = this; }
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
  document.createDocumentFragment = () => new Element();
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
  const context = vm.createContext({
    document, window, navigator: { onLine: true },
    localStorage: { getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    URL, URLSearchParams, AbortController, AbortSignal, console,
    fetch: () => new Promise(() => {}),
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
  });
  vm.runInContext(source, context);
  return { get, gallery, document, window, background, requests: () => requests };
}

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
