/**
 * SQLite DB 파일 삭제 후 prisma db push로 빈 스키마 재생성.
 * 사용: npm run db:reset
 */
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const root = path.join(__dirname, "..");
const prismaDir = path.join(root, "prisma");

const suffixes = ["", "-journal", "-wal", "-shm"];

function removeSqliteDb(baseName: string) {
  for (const s of suffixes) {
    const p = path.join(prismaDir, `${baseName}${s}`);
    try {
      fs.unlinkSync(p);
      console.log("삭제:", path.relative(root, p));
    } catch (e: unknown) {
      if (e instanceof Error && "code" in e && (e as NodeJS.ErrnoException).code === "ENOENT")
        continue;
      throw e;
    }
  }
}

removeSqliteDb("dev.db");

execSync("npx prisma db push", { stdio: "inherit", cwd: root });

console.log("\nDB 초기화 완료. Word / UserWord 테이블만 있고 행은 없습니다.");
