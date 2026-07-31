import { Router } from "express";
import { prisma } from "../db/client";
import { comparePassword } from "../utils/hash";
import { requireAuth } from "../middleware/require-auth";
import { createRateLimit } from "../middleware/rate-limit";
import { logger } from "../utils/logger";

export const authRouter = Router();

// WR-02: brute-force / credential-stuffing throttle for the login endpoint —
// the most password-sensitive route in the app. Tighter than the public
// pre-registros limiter (15 min window vs 1 min) since legitimate logins are
// infrequent. Same in-memory per-IP helper already used for /api/pre-registros.
const loginRateLimit = createRateLimit({ windowMs: 15 * 60_000, max: 10 });

const log = logger.child({ route: "/api/auth" });

// WR-01 (D-09 anti-enumeration): a real, precomputed bcrypt cost-12 hash used
// as a decoy when the email does not exist. Running a full bcrypt comparison
// against it on the not-found path makes the response latency of "no such
// account" indistinguishable from "wrong password", closing the timing
// side-channel an attacker could otherwise use to enumerate registered emails.
const DUMMY_PASSWORD_HASH =
  "$2b$12$.SKBBttCA6ox9TM9rwoOA.V.zO8fpCxy5p9VvioA4GgRuF7rJR0GK";

authRouter.post("/login", loginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res
        .status(400)
        .json({ error: { message: "Email y contraseña son requeridos" } });
      return;
    }

    // WR-06: the `email` column has a case-sensitive unique constraint, so a
    // user who registered/seeded with one casing but types another would fail
    // to authenticate. Normalize (trim + lowercase) consistently here and at
    // seed/creation time so lookups are stable and case-variant duplicates
    // cannot be created.
    const normalizedEmail = String(email).trim().toLowerCase();

    const personal = await prisma.personalDeRecepcion.findUnique({
      where: { email: normalizedEmail },
    });

    // D-09: anti-enumeration — the SAME generic message and status for a
    // non-existent email and an existing email with the wrong password.
    // The `!personal.activo` check happens ONLY after the password check
    // succeeds, so an attacker can never use it as an oracle to learn
    // whether an email exists.
    //
    // WR-01: ALWAYS run a bcrypt comparison — against the real hash when the
    // account exists, otherwise against a fixed dummy hash — so the not-found
    // path spends the same ~200-300ms of CPU as the wrong-password path and
    // response latency does not reveal whether the email is registered.
    const passwordMatches = await comparePassword(
      password,
      personal?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!personal || !passwordMatches) {
      log.warn({ email, reason: "invalid_credentials" });
      res.status(401).json({ error: { message: "Credenciales inválidas" } });
      return;
    }

    if (!personal.activo) {
      log.warn({ email, reason: "inactive_account" });
      res.status(403).json({ error: { message: "Cuenta desactivada" } });
      return;
    }

    // T-04-02: regenerate the session ID before assigning any authenticated
    // state, mitigating session fixation from a pre-set cookie.
    req.session.regenerate((regenerateErr) => {
      if (regenerateErr) {
        log.error({ err: regenerateErr, action: "session_regenerate_failed" });
        res.status(500).json({ error: { message: "Error interno del servidor" } });
        return;
      }

      // Assign explicit fields only — NEVER the full `personal` row, which
      // would leak passwordHash into the session store (Pitfall 6).
      req.session.personalId = personal.id;
      req.session.email = personal.email;
      req.session.nombre = personal.nombre;
      req.session.activo = personal.activo;

      req.session.save((saveErr) => {
        if (saveErr) {
          log.error({ err: saveErr, action: "session_save_failed" });
          res.status(500).json({ error: { message: "Error interno del servidor" } });
          return;
        }

        log.info({ personalId: personal.id, action: "login_success" });
        res.json({ id: personal.id, nombre: personal.nombre, email: personal.email });
      });
    });
  } catch (error) {
    log.error({ action: "login", failed: true, name: (error as Error)?.name });
    res.status(500).json({ error: { message: "Error interno del servidor" } });
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  try {
    res.json({
      id: req.session.personalId,
      nombre: req.session.nombre,
      email: req.session.email,
    });
  } catch (error) {
    log.error({ action: "me", failed: true, name: (error as Error)?.name });
    res.status(500).json({ error: { message: "Error interno del servidor" } });
  }
});

authRouter.post("/logout", (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        log.error({ err, action: "logout_failed" });
        res.status(500).json({ error: { message: "Error interno del servidor" } });
        return;
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Sesión cerrada" });
    });
  } catch (error) {
    log.error({ action: "logout", failed: true, name: (error as Error)?.name });
    res.status(500).json({ error: { message: "Error interno del servidor" } });
  }
});
