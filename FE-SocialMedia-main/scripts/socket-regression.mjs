import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const events = new Map();
const sent = [];
const intervals = new Set();
let created = 0;
const fakeSocket = {
  connected: false, auth: {},
  on(name, handler) { events.set(name, handler); return this; },
  emit(...args) { sent.push(args); },
  connect() { this.connected = true; events.get('connect')?.(); return this; },
  disconnect() { this.connected = false; events.get('disconnect')?.(); return this; },
  removeAllListeners() { events.clear(); },
};
const output = ts.transpileModule(fs.readFileSync('src/lib/messaging/socket-client.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exports = {};
vm.runInNewContext(output, {
  exports,
  require(name) {
    if (name === 'socket.io-client') return { io(_url, options) { created++; fakeSocket.auth = options.auth; return fakeSocket; } };
    if (name === '../api/client') return { API_URL: 'https://backend.invalid' };
    throw new Error('Unexpected import ' + name);
  },
  setInterval(callback) { intervals.add(callback); return callback; },
  clearInterval(callback) { intervals.delete(callback); },
});
exports.joinConversationRoom('chat-one');
exports.connectMessagingSocket('token-one');
fakeSocket.connect();
assert.ok(sent.some(([name, id]) => name === 'join:conversation' && id === 'chat-one'));
assert.equal(intervals.size, 1);
sent.length = 0;
fakeSocket.disconnect();
assert.equal(intervals.size, 0);
fakeSocket.connect();
assert.ok(sent.some(([name, id]) => name === 'join:conversation' && id === 'chat-one'));
assert.equal(intervals.size, 1);
exports.connectMessagingSocket('token-two');
assert.equal(fakeSocket.auth.token, 'token-two');
assert.equal(created, 1);
exports.leaveConversationRoom('chat-one');
sent.length = 0;
fakeSocket.disconnect(); fakeSocket.connect();
assert.equal(sent.some(([name]) => name === 'join:conversation'), false);
exports.disconnectMessagingSocket();
assert.equal(intervals.size, 0);
assert.equal(exports.getMessagingSocket(), null);
console.log('PASS room rejoin after reconnect, auth rotation, presence timer lifecycle, leaving rooms and logout');
