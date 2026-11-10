import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const www = join(root, "www");
const skip = new Set([
  "package.json",
  "package-lock.json",
  "capacitor.config.json"
]);
const allow = new Set([".html", ".css", ".js", ".svg", ".png", ".json"]);

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

for (const name of readdirSync(root)) {
  if (name.startsWith(".") || skip.has(name)) continue;
  const src = join(root, name);
  if (!statSync(src).isFile()) continue;
  const dot = name.lastIndexOf(".");
  if (dot < 0 || !allow.has(name.slice(dot))) continue;
  cpSync(src, join(www, name));
}
