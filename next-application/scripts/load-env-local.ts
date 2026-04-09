import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

/**
 * Load `.env.local` then `.env` into `process.env` when keys are unset (simple parser).
 * Keeps scripts free of an extra `dotenv` dependency for portfolio demos.
 */
export function loadEnvLocal(cwd: string = process.cwd()): void {
  for (const name of [".env.local", ".env"]) {
    const filePath = resolve(cwd, name);
    if (!existsSync(filePath)) continue;
    const raw = readFileSync(filePath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}
