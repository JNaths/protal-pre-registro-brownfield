import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

// WR-05: requireAuth now re-reads the account's current `activo` status, so the
// prisma client must be mocked for these unit tests.
vi.mock("../db/client", () => ({
  prisma: {
    personalDeRecepcion: {
      findUnique: vi.fn(),
    },
  },
}));

import { requireAuth } from "./require-auth";
import { prisma } from "../db/client";

const findUnique = prisma.personalDeRecepcion.findUnique as unknown as ReturnType<typeof vi.fn>;

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("requireAuth middleware", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("calls next() when the session is valid and the account is still active", async () => {
    findUnique.mockResolvedValue({ activo: true });
    const req = { session: { personalId: 1 } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("responds 401 with 'No autenticado' and does not call next() when unauthenticated", async () => {
    const req = { session: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: "No autenticado" },
    });
  });

  it("WR-05: responds 401 and does not call next() when the account was deactivated mid-session", async () => {
    findUnique.mockResolvedValue({ activo: false });
    const req = { session: { personalId: 1 } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: "No autenticado" },
    });
  });

  it("WR-05: responds 401 when the account no longer exists", async () => {
    findUnique.mockResolvedValue(null);
    const req = { session: { personalId: 99 } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
