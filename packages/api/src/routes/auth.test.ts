import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { prisma } from "../db/client";
import { hashPassword } from "../utils/hash";

// Integration tests for AUTH-01/AUTH-02/AUTH-03 (D-09 anti-enumeration,
// session regeneration on login) against the live Neon database — mirrors
// pre-registros.test.ts's supertest pattern: import `app`, never listen().

const TEST_EMAIL = "auth-test-recepcion@example.com";
const TEST_PASSWORD = "Secreta123!";

describe("Auth routes (/api/auth)", () => {
  beforeAll(async () => {
    await prisma.personalDeRecepcion.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.personalDeRecepcion.create({
      data: {
        email: TEST_EMAIL,
        nombre: "Ana",
        apellidoPaterno: "Recepcion",
        apellidoMaterno: "Test",
        telefono: "5551234567",
        activo: true,
        passwordHash: await hashPassword(TEST_PASSWORD),
      },
    });
  });

  afterAll(async () => {
    await prisma.personalDeRecepcion.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  it("logs in with valid credentials: 200, safe DTO, Set-Cookie present", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: TEST_EMAIL, nombre: "Ana" });
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("WR-06: logs in when the email casing differs from the stored value (normalized lookup)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: `  ${TEST_EMAIL.toUpperCase()}  `, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: TEST_EMAIL, nombre: "Ana" });
  });

  it("rejects an incorrect password with generic 401 (D-09)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Credenciales inválidas");
  });

  it("rejects a non-existent email with the SAME generic 401 (anti-enumeration, D-09)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "no-existe@example.com", password: "whatever" });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Credenciales inválidas");
  });

  it("GET /me returns staff data for an authenticated agent", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    const res = await agent.get("/api/auth/me");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: TEST_EMAIL, nombre: "Ana" });
  });

  it("GET /me without a session returns 401", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { message: "No autenticado" } });
  });

  it("WR-05: an account deactivated mid-session loses access on the next /me", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    // Sanity: the session is valid while the account is active.
    const before = await agent.get("/api/auth/me");
    expect(before.status).toBe(200);

    // Deactivate the account out-of-band (as an admin would), then confirm the
    // still-open session is rejected on the next guarded request.
    await prisma.personalDeRecepcion.update({
      where: { email: TEST_EMAIL },
      data: { activo: false },
    });

    try {
      const after = await agent.get("/api/auth/me");
      expect(after.status).toBe(401);
    } finally {
      await prisma.personalDeRecepcion.update({
        where: { email: TEST_EMAIL },
        data: { activo: true },
      });
    }
  });

  it("logout destroys the session; a subsequent /me returns 401", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    const logoutRes = await agent.post("/api/auth/logout");
    expect(logoutRes.status).toBe(200);

    const meRes = await agent.get("/api/auth/me");
    expect(meRes.status).toBe(401);
  });
});
