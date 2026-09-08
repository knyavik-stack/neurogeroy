import app from "./main_app.js";

// Compatibility entrypoint: Cloudflare deployments that still point at worker.js
// must receive the same canonical NeuroGeroy Mini App as wrangler.toml.
export default app;
