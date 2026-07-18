import { resolve } from "node:path";
import { defineConfig } from "vite";

// One config for both apps. The app is chosen by the CLI root argument
// (`vite [build] client|admin -c vite.config.js`); each build lands in its own
// dist folder and is served at the root of its own domain, so `base` stays "/".
// The admin app has no root index (hosting redirects "/" to /auth), hence the
// explicit two-page input list.
const app = process.argv.slice(2).some((arg) => arg === "admin") ? "admin" : "client";
const imagesDir = resolve(process.cwd(), "img").replaceAll("\\", "/");

// The pages reference the shared images as `../img/*`, which resolves above the
// Vite root and so is not served in dev. Map those requests back to the repo
// folder; the production build resolves the same references on its own and
// emits hashed assets, so this is dev-only.
const serveSharedImages = {
  name: "serve-shared-images",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url?.startsWith("/img/")) req.url = `/@fs/${imagesDir}${req.url.slice(4)}`;
      next();
    });
  },
};

export default defineConfig({
  plugins: [serveSharedImages],
  build: {
    outDir: resolve(process.cwd(), "dist", app),
    emptyOutDir: true,
    rollupOptions:
      app === "admin"
        ? {
            input: {
              auth: resolve(process.cwd(), "admin/auth/index.html"),
              dashboard: resolve(process.cwd(), "admin/dashboard/index.html"),
            },
          }
        : {},
  },
});
