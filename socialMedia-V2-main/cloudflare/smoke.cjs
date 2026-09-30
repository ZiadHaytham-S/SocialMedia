const assert = require("node:assert/strict");

const base = process.argv[2];
const frontendOrigin = process.argv[3] || "http://localhost:3001";
if (!base || !/^https?:\/\//.test(base)) {
  throw new Error("Usage: node cloudflare/smoke.cjs https://your-worker.workers.dev");
}

async function request(path, options = {}) {
  return fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(60000) });
}

async function main() {
  const root = await request("/");
  assert.equal(root.status, 200, "Backend startup failed");
  assert.equal((await root.json()).message, "Landing Page");
  console.log("PASS backend startup and database connections");

  const protectedRoute = await request("/user/");
  assert.equal(protectedRoute.status, 401);
  const error = await protectedRoute.json();
  if (new URL(base).protocol === "https:") {
    assert.equal(error.stack, undefined, "Production must not expose stack traces");
    assert.equal(error.error, undefined, "Production must not expose raw errors");
  }
  console.log("PASS authentication required");

  const basicAuth = await request("/user/list", {
    headers: { Authorization: "Basic dGVzdDp0ZXN0" },
  });
  assert.equal(basicAuth.status, 401, "Unsupported Basic auth must not bypass authentication");
  console.log("PASS unsupported authentication rejected");

  const invalidLogin = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "invalid", password: "invalid" }),
  });
  assert.equal(invalidLogin.status, 400);
  console.log("PASS login validation");

  const cors = await request("/auth/login", {
    method: "OPTIONS",
    headers: {
      Origin: frontendOrigin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  assert.equal(cors.status, 204);
  assert.equal(cors.headers.get("access-control-allow-origin"), frontendOrigin);
  console.log("PASS frontend CORS");

  const handshake = await request("/socket.io/?EIO=4&transport=polling");
  assert.equal(handshake.status, 200);
  const packet = await handshake.text();
  assert.equal(packet[0], "0");
  const { sid, upgrades } = JSON.parse(packet.slice(1));
  assert.ok(sid);
  assert.deepEqual(upgrades, []);
  const socketPath = `/socket.io/?EIO=4&transport=polling&sid=${encodeURIComponent(sid)}`;
  try {
    const connect = await request(socketPath, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: '40{"token":"invalid"}',
    });
    assert.equal(connect.status, 200);
    const response = await request(socketPath);
    assert.ok((await response.text()).split("\x1e").some((item) => item.startsWith("44")),
      "Socket.IO must reject invalid authentication");
  } finally {
    await request(socketPath, { method: "POST", body: "1" });
  }
  console.log("PASS Socket.IO polling session and authentication");

  const missing = await request("/__deployment_missing_route__");
  assert.equal(missing.status, 404);
  console.log("PASS unknown route handling");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
