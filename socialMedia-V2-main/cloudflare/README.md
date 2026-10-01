# Cloudflare deployment

Backend URL: https://socialmedia-backend.ziad-socialmedia.workers.dev

## Runtime

The Worker forwards requests to one SQLite-backed `SocialBackend` Durable Object,
named `primary`. The object runs the existing Express REST and Apollo GraphQL APIs
and keeps Socket.IO polling sessions together. MongoDB, Redis, R2, Gmail SMTP and
Firebase continue to use the existing external services configured as secrets.
SQLite is required for Free-plan eligibility; application data remains in MongoDB.

The Node HTTP adapter does not support the WebSocket upgrade used by Socket.IO.
This deployment therefore uses HTTP long polling. The frontend starts with polling
and only upgrades when its backend supports WebSockets. No chat events were removed.
Polling consumes HTTP requests even when a connected chat is idle.

Workers aliases native `bcrypt` to `bcryptjs`, preserving existing bcrypt password
hashes and work factors. Normal Node.js runs retain native bcrypt. The Durable Object
hosts CPU-intensive work because a plain Free Worker has a 10 ms CPU limit.

The hourly Cloudflare Cron Trigger invokes the same unverified-account cleanup as
the local `node-cron` job. Local Node.js starts the original scheduler; Workers does
not. Worker startup does not call the destructive `syncIndexes()` operation.

Only one Durable Object name must be used with this implementation: the Node HTTP
server and service instances are cached for the isolate lifetime. This is a small
application deployment, not a horizontally sharded backend.

## Develop and redeploy

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run check:cloudflare
npm.cmd run dev:cloudflare
```

Local Wrangler reads `.dev.vars`, which is ignored by Git. Populate it with backend
environment variables. Do not commit it, JWT signing secrets, service credentials,
or exported secret files.

Authenticate if needed, then deploy:

```powershell
npx.cmd wrangler login --device
npm.cmd run deploy:cloudflare
node cloudflare/smoke.cjs https://socialmedia-backend.ziad-socialmedia.workers.dev
```

Normal redeploys retain the existing Cloudflare secrets. To update secrets, pass a
JSON or dotenv file using `wrangler deploy --secrets-file <ignored-file>` or use
`wrangler secret put NAME`. Keep `NODE_ENV` and `PORT` in `wrangler.jsonc` rather than
the secrets file.

The initial deployment used the existing `.env.development` service credentials.
The ignored `.wrangler/secrets.production.json` file contains that initial export.
Changes to `.env.development` are not automatically pushed to Cloudflare.

## Frontend

Production frontend: https://social-media-hazel-nu.vercel.app

The existing Vercel project `social-media` now has production `NEXT_PUBLIC_API_URL`
pointing to this Worker and the previously missing `AUTH_SECRET` stored as a secret.
Sign-in through Vercel Auth.js, the resulting backend session token, CORS and sign-out
were tested successfully using a temporary account, which was removed afterward.

Vercel's project root directory is `FE-SocialMedia-main`. Deploy from the workspace
root (`D:\socialFull`), whose ignored `.vercel/project.json` links the existing
project, using `vercel deploy --prod`. The root `.vercelignore` excludes the backend,
local environment files and build artifacts from the frontend upload. This was a
CLI deployment of local files; commit the source changes before a later Git-based
deployment so the Socket.IO polling change is retained.

The local frontend `.env.local` now uses:

```dotenv
NEXT_PUBLIC_API_URL=https://socialmedia-backend.ziad-socialmedia.workers.dev
```

Restart the Next.js development server after an environment change. For a deployed
frontend, set this variable before building and add its exact origin to the backend
`FE_ORIGIN` secret. The current origins are `http://localhost:3001` and
`http://localhost:3000`, plus `https://social-media-hazel-nu.vercel.app`.
The previous local environment is preserved in the ignored
`.env.local.before-cloudflare` file.

Verify the deployed frontend origin with:

```powershell
node cloudflare/smoke.cjs https://socialmedia-backend.ziad-socialmedia.workers.dev https://social-media-hazel-nu.vercel.app
```

## Validation and limits

The 2026-10-01 audit and regression coverage are documented in
[`../../docs/PRODUCTION_AUDIT.md`](../../docs/PRODUCTION_AUDIT.md). Production
notification links use the explicit `FRONTEND_URL` variable in `wrangler.jsonc`.
The conversation index migration runs at startup and preserves existing chat data.

`cloudflare/smoke.cjs` checks startup, protected routes, invalid login validation,
CORS, Socket.IO polling session authentication, and missing-route handling. It does
not create accounts or send messages. An additional deployment check used a
temporary confirmed account to verify native bcrypt compatibility, login, profile,
GraphQL, authenticated Socket.IO and multipart image upload to R2, then removed the
account and uploaded object.

Email delivery, Google sign-in and push delivery require their own
end-to-end checks; they are not covered by the smoke script.

No paid subscription was activated during deployment. Free Workers and SQLite
Durable Objects have daily quotas. Free Durable Objects currently include 100,000
requests and 13,000 GB-seconds per day; exceeding a free quota fails requests rather
than automatically upgrading the account. Existing external services have their
own plans and limits.

References:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/durable-objects/platform/limits/
- https://developers.cloudflare.com/durable-objects/platform/pricing/
- https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/
