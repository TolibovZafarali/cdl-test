const CACHE = 'cdl-document-practice-v23';
const FILES = ['./', './index.html', './styles.css', './app.js', './engine.js', './storage.js', './keywords.js', './manifest.webmanifest', './data/index.js', './data/interface-uz.js', './data/keywords.js', './data/questions.js', './data/general-knowledge.js', './data/combination-vehicles.js', './assets/icon.svg', './source/air-brakes.docx', './source/general-knowledge.docx', './source/combination-vehicles.docx'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => (key.startsWith('missouri-cdl-') || key.startsWith('cdl-pdf-practice-') || key.startsWith('cdl-document-practice-')) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  url.hash = '';
  url.search = '';
  const base = new URL('./', self.location.href);
  const known = FILES.some(file => new URL(file, base).href === url.href);
  if (!known) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(url.href, copy))); }
    return response;
  }).catch(async () => await caches.match(url.href) || Response.error()));
});
