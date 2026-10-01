/* Live regression audit. Only writes to isolated temporary accounts; removes its fixtures. */
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { io } = require('../../FE-SocialMedia-main/node_modules/socket.io-client');
require('dotenv').config({ path: '.env.development', quiet: true });
const base = process.argv[2] || 'https://socialmedia-backend.ziad-socialmedia.workers.dev';
const ids = Array.from({ length: 3 }, () => new mongoose.Types.ObjectId());
const tokens = ids.map(id => jwt.sign({ sub: String(id), aud: [0, 0] }, process.env.USER_ACCESS_TOKEN_SIGNATURE,
  { expiresIn: '15m', jwtid: randomUUID() }));
const failures = [];
const password = `Audit!${randomUUID()}aA1`;
const frontend = 'https://social-media-hazel-nu.vercel.app';
async function api(index, path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${tokens[index]}`);
  if (typeof init.body === 'string') headers.set('Content-Type', 'application/json');
  const response = await fetch(base + path, { ...init, headers, signal: AbortSignal.timeout(30000) });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(body)}`);
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data?.result ?? body.data ?? body;
}
const gql = (index, query, variables = {}) => api(index, '/graphql', { method: 'POST', body: JSON.stringify({ query, variables }) });
async function check(name, fn) {
  try { await fn(); console.log('PASS ' + name); }
  catch (error) { failures.push(name); console.error('FAIL ' + name + ': ' + error.message); }
}
async function main() {
  await mongoose.connect(process.env.DB_URI, { serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;
  const indexes = await db.collection('conversations').indexes();
  console.log('Conversation indexes: ' + JSON.stringify(indexes.map(({ key, unique }) => ({ key, unique }))));
  const passwordHash = await bcrypt.hash(password, 10);
  await db.collection('users').insertMany(ids.map((_id, i) => ({ _id, firstName: 'Audit', lastName: `Temporary${i}`,
    email: `audit-${_id}@example.invalid`, password: passwordHash, role: 0, provider: 1, confirmEmail: new Date(), createdAt: new Date(), updatedAt: new Date() })));
  let conversation, message, post, comment, story;
  try {
    await check('backend password login', async () => {
      const response = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `audit-${ids[0]}@example.invalid`, password }), signal: AbortSignal.timeout(30000) });
      assert.equal(response.status, 200);
    });
    await check('Vercel Auth.js login and session', async () => {
      const jar = new Map();
      const save = response => response.headers.getSetCookie().forEach(cookie => {
        const pair = cookie.split(';')[0]; const split = pair.indexOf('='); jar.set(pair.slice(0, split), pair.slice(split + 1));
      });
      const cookies = () => [...jar].map(([key, value]) => `${key}=${value}`).join('; ');
      const csrfResponse = await fetch(frontend + '/api/auth/csrf'); save(csrfResponse);
      const { csrfToken } = await csrfResponse.json(); assert.ok(csrfToken);
      const response = await fetch(frontend + '/api/auth/callback/credentials', { method: 'POST', redirect: 'manual',
        headers: { Cookie: cookies(), 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' },
        body: new URLSearchParams({ csrfToken, email: `audit-${ids[0]}@example.invalid`, password, callbackUrl: frontend }) });
      save(response);
      const sessionResponse = await fetch(frontend + '/api/auth/session', { headers: { Cookie: cookies() } });
      const session = await sessionResponse.json(); assert.ok(session.accessToken); assert.equal(session.user.email, `audit-${ids[0]}@example.invalid`);
    });
    await check('authenticated profile', () => api(0, '/user/'));
    for (const path of ['/post/feed', '/post/dashboard', '/friend/', '/friend/counts', '/friend/requests/incoming', '/friend/requests/outgoing', '/friend/blocked', '/notification/', '/notification/unread-count', '/story/feed']) {
      await check('read ' + path, () => api(0, path));
    }
    await check('open first conversation', async () => {
      const data = await gql(0, 'mutation($id:ID!){openConversation(recipientId:$id){id peer{id}}}', { id: String(ids[1]) });
      conversation = data.openConversation.id;
    });
    await check('open second conversation for same sender', () => gql(0, 'mutation($id:ID!){openConversation(recipientId:$id){id}}', { id: String(ids[2]) }));
    await check('concurrent open returns same conversation', async () => {
      const results = await Promise.all([gql(1, 'mutation($id:ID!){openConversation(recipientId:$id){id}}', { id: String(ids[2]) }), gql(2, 'mutation($id:ID!){openConversation(recipientId:$id){id}}', { id: String(ids[1]) })]);
      assert.equal(results[0].openConversation.id, results[1].openConversation.id);
    });
    await check('send multipart text message', async () => {
      const body = new FormData(); body.set('recipientId', String(ids[1])); body.set('content', 'Temporary messaging regression check');
      message = await api(0, '/message', { method: 'POST', body }); assert.ok(message.id);
    });
    await check('recipient receives message and unread count', async () => {
      const data = await gql(1, 'query($id:ID!){messages(conversationId:$id){id content} messagingUnreadCount}', { id: conversation });
      assert.ok(data.messages.some(row => row.id === message.id)); assert.ok(data.messagingUnreadCount > 0);
    });
    await check('edit message', async () => { const row = await api(0, `/message/${message.id}`, { method: 'PATCH', body: JSON.stringify({ content: 'Edited audit message' }) }); assert.equal(row.content, 'Edited audit message'); });
    await check('react to message', () => api(1, `/message/${message.id}/react`, { method: 'PATCH', body: JSON.stringify({ type: 'love' }) }));
    await check('pin message', () => api(0, `/message/${message.id}/pin`, { method: 'PATCH', body: JSON.stringify({ pinned: true }) }));
    await check('mark conversation read', async () => {
      await gql(1, 'mutation($id:ID!){markConversationRead(conversationId:$id)}', { id: conversation });
      assert.equal((await gql(1, '{messagingUnreadCount}')).messagingUnreadCount, 0);
    });
    await check('outsider cannot read conversation', async () => {
      await assert.rejects(gql(2, 'query($id:ID!){messages(conversationId:$id){id}}', { id: conversation }), /Conversation not found/);
    });
    await check('authenticated realtime delivery and private room isolation', async () => {
      const sockets = [1, 2].map(index => io(base, { transports: ['polling'], upgrade: false, auth: { token: tokens[index] }, reconnection: false }));
      try {
        await Promise.all(sockets.map(socket => new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Socket connection timeout')), 15000);
          socket.once('connect', () => { clearTimeout(timeout); resolve(); });
          socket.once('connect_error', error => { clearTimeout(timeout); reject(error); });
        })));
        sockets.forEach(socket => socket.emit('join:conversation', conversation));
        await new Promise(resolve => setTimeout(resolve, 500));
        let leaked = false;
        sockets[1].on('message:new', () => { leaked = true; });
        const received = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Message event timeout')), 15000);
          sockets[0].once('message:new', row => { clearTimeout(timeout); resolve(row); });
        });
        const body = new FormData(); body.set('recipientId', String(ids[1])); body.set('content', 'Realtime isolated audit');
        const sent = await api(0, '/message', { method: 'POST', body });
        assert.equal((await received).id, sent.id);
        await new Promise(resolve => setTimeout(resolve, 500));
        assert.equal(leaked, false);
      } finally { sockets.forEach(socket => socket.disconnect()); }
    });
    await check('friend request and production notification link', async () => {
      await api(0, `/friend/request/${ids[1]}`, { method: 'POST' });
      const rows = await api(1, '/notification/');
      const item = rows.find(row => row.type === 'friend_request'); assert.ok(item);
      assert.equal(new URL(item.data.url).origin, 'https://social-media-hazel-nu.vercel.app');
    });
    await check('accept friend request', () => api(1, `/friend/request/${ids[0]}/accept`, { method: 'PATCH' }));
    await check('create post', async () => { const body = new FormData(); body.set('content', 'Temporary audit post'); post = await api(0, '/post', { method: 'POST', body }); assert.ok(post._id ?? post.id); });
    await check('post edit and share', async () => {
      const body = new FormData(); body.set('content', 'Edited temporary audit post');
      await api(0, `/post/${post._id ?? post.id}`, { method: 'PATCH', body });
      await api(1, `/post/${post._id ?? post.id}/share`, { method: 'POST', body: JSON.stringify({ content: 'Temporary audit share' }) });
    });
    await check('react to post', () => api(1, `/post/${post._id ?? post.id}/react`, { method: 'PATCH', body: JSON.stringify({ type: 'like' }) }));
    await check('create comment', async () => { const body = new FormData(); body.set('content', 'Temporary audit comment'); comment = await api(1, `/comment/post/${post._id ?? post.id}`, { method: 'POST', body }); assert.ok(comment._id ?? comment.id); });
    await check('list comments', () => api(0, `/comment/post/${post._id ?? post.id}`));
    await check('comment edit and reaction', async () => {
      await api(1, `/comment/${comment._id ?? comment.id}`, { method: 'PATCH', body: JSON.stringify({ content: 'Edited temporary comment' }) });
      await api(0, `/comment/${comment._id ?? comment.id}/react`, { method: 'PATCH', body: JSON.stringify({ type: 'love' }) });
    });
    await check('story create, view and react', async () => {
      const body = new FormData(); body.set('content', 'Temporary audit story');
      story = await api(0, '/story', { method: 'POST', body });
      const id = story._id ?? story.id; assert.ok(id);
      await api(1, `/story/${id}/view`, { method: 'POST' });
      await api(1, `/story/${id}/react`, { method: 'PATCH', body: JSON.stringify({ type: 'love' }) });
    });
    await check('multipart image message upload to R2', async () => {
      const body = new FormData(); body.set('recipientId', String(ids[1]));
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
      body.set('attachment', new Blob([png], { type: 'image/png' }), 'audit.png');
      const row = await api(0, '/message', { method: 'POST', body });
      assert.equal(row.attachmentType, 'image'); assert.ok(row.attachmentUrl);
      const image = await fetch(row.attachmentUrl, { signal: AbortSignal.timeout(30000) }); assert.equal(image.status, 200);
    });
    await check('block prevents messaging then unblock', async () => {
      await api(1, `/friend/block/${ids[0]}`, { method: 'POST' });
      const body = new FormData(); body.set('recipientId', String(ids[1])); body.set('content', 'Should be blocked');
      await assert.rejects(api(0, '/message', { method: 'POST', body }), /cannot message/);
      await api(1, `/friend/block/${ids[0]}`, { method: 'DELETE' });
    });
    await check('read all notifications', () => api(1, '/notification/read-all', { method: 'PATCH' }));
  } finally {
    // All filters refer solely to IDs created by this run. No existing user data is removed.
    const chats = await db.collection('conversations').find({ participants: { $in: ids } }).toArray();
    const attachments = await db.collection('messages').find({ conversationId: { $in: chats.map(row => row._id) }, 'attachment.key': { $exists: true } }).toArray();
    const r2 = new S3Client({ region: 'auto', endpoint: process.env.R2_ENDPOINT, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
    for (const row of attachments) await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: row.attachment.key }));
    r2.destroy();
    await db.collection('messages').deleteMany({ conversationId: { $in: chats.map(row => row._id) } });
    await db.collection('conversations').deleteMany({ _id: { $in: chats.map(row => row._id) } });
    await db.collection('notifications').deleteMany({ userId: { $in: ids } });
    await db.collection('posts').deleteMany({ author: { $in: ids } });
    await db.collection('comments').deleteMany({ author: { $in: ids } });
    await db.collection('stories').deleteMany({ author: { $in: ids } });
    for (const name of ['friendrequests', 'friendships', 'blocks']) {
      await db.collection(name).deleteMany({ $or: ['requester', 'recipient', 'blocker', 'blocked'].map(key => ({ [key]: { $in: ids } })) });
    }
    await db.collection('users').deleteMany({ _id: { $in: ids } });
    console.log('Temporary accounts and fixtures cleaned');
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); if (failures.length) process.exitCode = 1; });
