import { DurableObject } from "cloudflare:workers";
import { httpServerHandler } from "cloudflare:node";

// The Node HTTP server and imported service singletons share the isolate lifetime.
// This namespace intentionally uses only the "primary" object below.
let application;

// One instance keeps Socket.IO polling sessions and database connections together.
// SQLite-backed Durable Objects are available on the Workers Free plan.
export class SocialBackend extends DurableObject {
  async initialize() {
    if (!application) {
      application = (async () => {
        const { default: bootstrap } = await import("../src/app.bootstrap.ts");
        const server = await bootstrap({ cloudflare: true });
        return httpServerHandler(server);
      })().catch((error) => {
        application = undefined;
        throw error;
      });
    }
    return application;
  }

  async fetch(request) {
    const application = await this.initialize();
    return application.fetch(request, this.env, this.ctx);
  }

  async cleanupUnverifiedUsers() {
    await this.initialize();
    const { deleteUnverifiedUsers } = await import("../src/common/utils/cronjob/deleteUnverifiedUsers.ts");
    const result = await deleteUnverifiedUsers();
    console.log(`Deleted ${result.deletedCount || 0} unverified users`);
  }
}

export default {
  fetch(request, env) {
    return env.BACKEND.getByName("primary").fetch(request);
  },
  async scheduled(_controller, env) {
    await env.BACKEND.getByName("primary").cleanupUnverifiedUsers();
  },
};
