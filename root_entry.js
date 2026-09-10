import app from "./main_app.js";

// Single runtime entrypoint. All routing, Telegram bootstrap and navigation
// belong to main_app.js; this file intentionally does not mutate HTML responses.
export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
};
