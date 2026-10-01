import assert from 'node:assert/strict';
import vm from 'node:vm';

const base = process.argv[2] || 'https://social-media-hazel-nu.vercel.app';
for (const path of ['/', '/login', '/register', '/forgot-password', '/confirm-email', '/friends', '/messages', '/profile/6abaa886ca3df7d590528c53']) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.doesNotMatch(await response.text(), /Cannot GET/);
  console.log('PASS frontend route ' + path);
}
const response = await fetch(base + '/firebase-messaging-sw.js');
assert.equal(response.status, 200);
assert.match(response.headers.get('content-type'), /javascript/);
const handlers = new Map();
let opened;
const self = {
  location: { origin: base },
  addEventListener: (name, handler) => handlers.set(name, handler),
};
vm.runInNewContext(await response.text(), {
  URL, self,
  importScripts() {},
  firebase: { initializeApp() {}, messaging: () => ({ onBackgroundMessage() {} }) },
  clients: { openWindow(url) { opened = url; return Promise.resolve(); } },
});
let pending;
handlers.get('notificationclick')({
  notification: { close() {}, data: { url: 'http://localhost:3001/profile/6abaa886ca3df7d590528c53' } },
  waitUntil(promise) { pending = promise; },
});
await pending;
assert.equal(opened, base + '/profile/6abaa886ca3df7d590528c53');
console.log('PASS deployed service worker redirects old localhost notifications to the current frontend');
