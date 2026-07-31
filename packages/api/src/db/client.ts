import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma 7 requires a driver adapter — PrismaClient can no longer be
// constructed with zero arguments (schema.prisma no longer carries the
// datasource `url`; see prisma.config.ts and https://pris.ly/d/adapter-pg).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Singleton Prisma client — this is the ONLY file allowed to instantiate
// PrismaClient. Every route/module must import `prisma` from here instead
// of creating a new instance, to avoid exhausting database connections.
export const prisma = new PrismaClient({ adapter });
