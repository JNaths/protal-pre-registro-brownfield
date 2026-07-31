import "express-session";

// Augments express-session's own SessionData interface so
// `req.session.personalId` etc. are typed throughout the app. The installed
// @types/express-session version types `req.session` as
// `Session & Partial<SessionData>` where SessionData is declared INSIDE the
// "express-session" module (not `Express.SessionData` as older versions of
// this library/pattern used) — see node_modules/@types/express-session's own
// doc example, which augments via `declare module "express-session"`.
//
// Never assign the full PersonalDeRecepcion row to req.session — only these
// explicit fields (Pitfall 6, 04-RESEARCH.md) so passwordHash never ends up
// in the session store.
declare module "express-session" {
  interface SessionData {
    personalId: number;
    email: string;
    nombre: string;
    activo: boolean;
  }
}
