# Production audit — 2026-10-01

Frontend: https://social-media-hazel-nu.vercel.app

Backend: https://socialmedia-backend.ziad-socialmedia.workers.dev

## Reproduced failures and fixes

- Opening a second chat failed with MongoDB `E11000`: a unique multikey index on
  `participants` made each participant unique across all conversations. A targeted
  startup migration backfills a sorted pair key, creates its unique index, and
  replaces only the legacy participants index. Existing messages and chats stay intact.
- Notification URLs selected the first CORS origin (`localhost:3001`). Production
  now has an explicit `FRONTEND_URL`; the notification bell and push click handlers
  convert old absolute URLs into validated local routes on the current frontend.
- Socket subscriptions now require conversation membership. Typing events require
  an authorized room subscription. Socket reconnects restore active rooms, token
  changes reauthenticate, and a heartbeat renews online presence. Closing one of
  several account connections no longer immediately marks the account offline.
- Removed 23 frontend lint errors: redundant effect state updates, hydration state,
  stale search results, memoization dependencies, and attachment preview lifecycle.
  Layout measurement keeps two narrowly documented lint exceptions because portal
  geometry must update before paint. No global lint rules were disabled.

## Validation

The live audit passed 37 grouped checks using three temporary accounts, covering:

- Backend password login and Vercel Auth.js login/session.
- Profile, feed, dashboard, friends, requests, notifications and story feed reads.
- Multiple conversations, concurrent opens, message send/receive/edit/reaction/pin,
  unread/read status, realtime delivery, and rejection of outsider subscriptions/reads.
- Friend request/acceptance, production notification URLs, blocking/unblocking.
- Post creation/edit/share/reaction and comment creation/list/edit/reaction.
- Story creation/view/reaction and multipart image chat upload with public R2 retrieval.

The script deletes only its own account IDs and associated records and R2 objects.
It never messages existing users or modifies their posts.

Both production builds passed. Frontend lint passed with **0 errors** and 30
existing image optimization warnings. Notification and socket lifecycle regression
tests passed. The backend's seven deployment smoke checks passed.
The frontend HTTP smoke checks cover eight routes and execute the deployed push
service worker's click handler against an old localhost notification URL.

Re-run from the respective project directories:

```powershell
# Frontend
npm.cmd run test:regression
npm.cmd run test:smoke
npm.cmd run lint
npm.cmd run build

# Backend (requires ignored .env.development credentials)
npm.cmd run test:smoke
npm.cmd run test:live
npm.cmd run build
```

`test:live` requires both projects' dependencies and intentionally writes temporary
fixtures to the configured database and backend. Use matching credentials/endpoints.

## Boundaries

No interactive browser was exposed in this session. These are live HTTP/API,
Socket.IO, database, unit regression and build checks, not a visual browser/device
audit. Email/OTP delivery, Google OAuth, actual FCM device delivery, camera/microphone
permissions and mobile layout still require interactive end-to-end verification.
The app's explicit free-tier deployment limits still apply; tests do not guarantee
uptime or that every possible user input is free of defects.
