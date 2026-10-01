import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const source = fs.readFileSync('src/lib/notifications/notification-path.ts', 'utf8');
const moduleObject = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports: moduleObject.exports, URL });
const { notificationPath } = moduleObject.exports;
const id = '6abaa886ca3df7d590528c53';
assert.equal(notificationPath(`http://localhost:3001/profile/${id}`), `/profile/${id}`);
assert.equal(notificationPath(`https://old-deployment.vercel.app/post/${id}?comment=x#reply`), `/post/${id}?comment=x#reply`);
assert.equal(notificationPath('/messages?with=' + id), '/messages?with=' + id);
assert.equal(notificationPath('/friends'), '/friends');
for (const invalid of ['javascript:alert(1)', 'data:text/html,hello', '/api/auth/signout', '/login', 'bad-url', null]) {
  assert.equal(notificationPath(invalid), undefined);
}
// Confirm the serialized function remains executable inside the service worker.
const embedded = vm.runInNewContext(`(${notificationPath.toString()})`, { URL });
assert.equal(embedded(`http://localhost:3001/profile/${id}`), `/profile/${id}`);
console.log('PASS legacy notification links, internal routes, rejected destinations, service worker serialization');
