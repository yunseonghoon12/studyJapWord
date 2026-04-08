/**
 * Word 테이블에서 Prisma 스키마에 없는 레거시 컬럼만 DROP합니다.
 * (초기 마이그레이션의 "word", 엑셀 잔여 "A" 등)
 * 사용: npx tsx scripts/drop-word-legacy-columns.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const url = process.env.DATABASE_URL || "";

const LEGACY_COLUMNS = ["word", "A"] as const;

type TableInfoRow = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: unknown;
  pk: number;
};

async function tableColumns(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<TableInfoRow[]>`
    PRAGMA table_info("Word");
  `;
  return new Set(rows.map((r) => r.name));
}

async function main() {
  if (!url.startsWith("file:")) {
    console.log("SQLite 전용 스크립트입니다. 현재 DATABASE_URL에서는 건너뜁니다.");
    return;
  }
  for (const col of LEGACY_COLUMNS) {
    const names = await tableColumns();
    if (!names.has(col)) {
      console.log(`Word."${col}" 없음 — 건너뜀`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Word" DROP COLUMN "${col.replace(/"/g, '""')}"`
    );
    console.log(`Word."${col}" 삭제됨`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
