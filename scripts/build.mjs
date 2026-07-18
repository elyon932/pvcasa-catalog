// Assembles the deploy output. Each app becomes a self-contained web root with
// the shared modules and images copied alongside, so the relative paths resolve
// when the app is served at the root of its own domain (no /client or /admin in
// the URL, no code changes). See README "Deployment".
import { rmSync, mkdirSync, cpSync } from "node:fs";

const apps = [
  { src: "client", out: "dist/client" },
  { src: "admin", out: "dist/admin" },
];

rmSync("dist", { recursive: true, force: true });

for (const { src, out } of apps) {
  mkdirSync(out, { recursive: true });
  cpSync(src, out, { recursive: true });
  cpSync("img", `${out}/img`, { recursive: true });
  cpSync("shared", `${out}/shared`, { recursive: true });
}

console.log("Built dist/client and dist/admin");
