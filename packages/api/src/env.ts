import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Load environment variables from the package-root .env.local, resolved
// relative to THIS file rather than process.cwd(). `npm run dev` runs tsx from
// packages/api, but `npm run dev --workspaces` and other entry points can run
// from the monorepo root — resolving relative to the source keeps startup
// deterministic regardless of the working directory.
//
// This module is imported for its side effect as the very first import in
// index.ts so DATABASE_URL is populated before src/db/client.ts reads it at
// module-load time.
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(packageRoot, ".env.local") });

// Non-fatal warning for LOCAL DEVELOPMENT only. In production, index.ts fails
// closed when SESSION_SECRET is missing (WR-03); on localhost it falls back to
// a documented dev-only secret, so this warning just flags the gap without
// blocking development.
if (!process.env.SESSION_SECRET) {
  console.warn(
    "SESSION_SECRET no está definido; usando un valor de desarrollo inseguro (no usar en producción).",
  );
}
