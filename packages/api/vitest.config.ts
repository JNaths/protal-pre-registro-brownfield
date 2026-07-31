import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Explicitly exclude the compiled build output. tsconfig's `outDir: dist`
    // mirrors every *.test.ts under src into dist/**/*.test.js; without this,
    // vitest picks up BOTH the source test and its (potentially stale, since
    // it only reflects whatever the last `tsc -b` run compiled) compiled
    // twin, causing duplicate/ghost test runs and false failures whenever
    // dist/ predates the latest source edit (Rule 1 fix, 03-03).
    exclude: [...configDefaults.exclude, "dist/**"],
    // Integration tests share a single external Neon database. Running test
    // files in parallel forks makes DB-mutating tests race on the same rows
    // (e.g. two workers POSTing the same CURP turns a "create" into an
    // "update" via the P2002 retry path). Run the whole suite in one process,
    // sequentially, so fixtures never collide across workers.
    fileParallelism: false,
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
