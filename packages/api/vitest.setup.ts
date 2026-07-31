import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// Load the repo-root .env (DATABASE_URL / DIRECT_URL) before any test module
// imports ../src/index. Vitest runs with cwd = packages/api, so the default
// `dotenv/config` lookup (cwd/.env) would miss the root .env and the
// DATABASE_URL startup guard in src/index.ts would throw.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });
