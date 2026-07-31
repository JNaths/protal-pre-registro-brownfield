import { Router } from "express";
import { prisma } from "../db/client";

// GET /api/health — prueba end-to-end de que Express, Prisma y PostgreSQL
// están conectados. Usa `prisma.$queryRaw` (tagged template — parametrizado por
// construcción; nunca su variante "Unsafe") para satisfacer API-04 / T-01-03.
export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  try {
    // Tagged template = consulta parametrizada. Verifica la conexión a la BD.
    await prisma.$queryRaw`SELECT 1 as healthy`;
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
      uptime: process.uptime(),
    });
  } catch {
    // T-01-04 (Information Disclosure): no vincular el error ni exponer sus
    // detalles internos ni la cadena de conexión en la respuesta o en logs.
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
    });
  }
});
