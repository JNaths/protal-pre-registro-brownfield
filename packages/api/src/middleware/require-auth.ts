import type { RequestHandler } from "express";
import { prisma } from "../db/client";

// Reusable session guard (T-04-05): rejects requests without a valid
// server-side session before any route handler logic runs. Reused as-is by
// Phase 5's authenticated console routes.
//
// WR-05: the account-active gate must be re-evaluated on every authenticated
// request, not only at login. The session stores a snapshot of `activo` taken
// at login time, so an account deactivated mid-session would otherwise keep
// full console access for the remaining rolling window (up to 8h). Re-read the
// row's current `activo` status so revocation takes effect promptly — a
// requirement for a compliance-sensitive patient-data console.
export const requireAuth: RequestHandler = async (req, res, next) => {
  const personalId = req.session.personalId;

  if (!personalId) {
    res.status(401).json({ error: { message: "No autenticado" } });
    return;
  }

  try {
    const personal = await prisma.personalDeRecepcion.findUnique({
      where: { id: personalId },
      select: { activo: true },
    });

    // Account deleted or deactivated since login → treat the session as no
    // longer valid. Same generic 401 as an unauthenticated request.
    if (!personal || !personal.activo) {
      res.status(401).json({ error: { message: "No autenticado" } });
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
};
