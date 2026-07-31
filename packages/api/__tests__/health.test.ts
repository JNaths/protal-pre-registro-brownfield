import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../src/index";
import { prisma } from "../src/db/client";

// Integration test for STACK-WIRED / API-04: proves Express + Prisma +
// PostgreSQL are connected end-to-end. supertest binds its own ephemeral
// port from `app` — we never call app.listen() here.
describe("GET /api/health", () => {
  afterAll(async () => {
    // Release the pooled DB connection so `vitest run` exits cleanly.
    await prisma.$disconnect();
  });

  it("returns 200 sourcing status from the database", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      database: "connected",
    });
    expect(typeof res.body.timestamp).toBe("string");
    expect(typeof res.body.uptime).toBe("number");
  });
});
