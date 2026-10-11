// Writes the built-in template catalog (structures + theme skins) to the
// backend's seed file, which `npm run db:seed` upserts as the system rows.
// Run from the backend (it has tsx):  cd pageCraft-backend && npm run catalog:export
// Theme CSS is read from THIS repo's model copy — the one the editor ships.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUILTIN_STRUCTURES, BUILTIN_ORDER } from "../src/grid/builtinStructures.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const themesDir = path.join(here, "../model/src/styles/themes");
const outFile = path.resolve(process.argv[2] ?? path.join(here, "../../pageCraft-backend/seed/catalog.json"));

const pretty = (slug: string) => slug.replace(/^canva-/, "").replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const templates = BUILTIN_ORDER.map((key, i) => {
  const { key: _k, name, docType, ...spec } = BUILTIN_STRUCTURES[key];
  return { key, name, docType, sortOrder: i, spec };
});
const themes = readdirSync(themesDir)
  .filter((f) => f.endsWith(".css"))
  .sort()
  .map((f) => ({ slug: f.slice(0, -4), name: pretty(f.slice(0, -4)), css: readFileSync(path.join(themesDir, f), "utf8") }));

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ templates, themes }, null, 2) + "\n");
console.log(`wrote ${templates.length} templates + ${themes.length} themes → ${outFile}`);
