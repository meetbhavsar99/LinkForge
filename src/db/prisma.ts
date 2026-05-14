import { PrismaClient } from "@prisma/client";
// hot-reload singleton pattern
/**
 * Singleton Prisma client.
 *
 * Prisma's client manages a connection pool internally. Instantiating multiple clients across the app would
 * exhaust connections fast.
 * Export one instance, import it everywhere.
 *
 * In ts-node-dev hot-reload, the module can be re-evaluated. We attach the client to globalThis in dev to avoid
 * leaking connections on reload.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
