import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL environment variable");
  }

  const adapter = new PrismaPg({ connectionString });

  const isDev = process.env.NODE_ENV === "development";
  const logQueries = process.env.PRISMA_LOG_QUERIES === "1" || process.env.PRISMA_LOG_QUERIES === "true";

  return new PrismaClient({
    adapter,
    log: isDev
      ? [...(logQueries ? (["query"] as const) : []), "error", "warn"]
      : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
