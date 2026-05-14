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

/**
 * Verify expected Postgres sequences exist at startup.
 * The createShortUrl mutation depends on `urls_id_seq` existing.
 * If the schema is renamed, this will fail fast on boot instead of
 * silently breaking the mutation path at request time.
 */
export async function verifySequences(): Promise<void> {
  const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'urls_id_seq'
    ) AS exists
  `;
  if (!result[0]?.exists) {
    throw new Error(
      "Required sequence 'urls_id_seq' does not exist. " +
        "Check that Prisma migrations have run and the schema is in sync.",
    );
  }
}
