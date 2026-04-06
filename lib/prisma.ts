import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

/** 프로덕션만 global 캐시. 개발에서는 스키마/prisma generate 후 서버 재시작이 필요합니다. */
export const prisma =
  process.env.NODE_ENV === "production"
    ? (globalForPrisma.prisma ??= createPrisma())
    : createPrisma();
