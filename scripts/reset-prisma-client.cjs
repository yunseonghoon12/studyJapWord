/**
 * Stale Prisma client (예: Word.word 컬럼 참조)일 때 실행.
 * 사용: npm run db:reset-client
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const clientDir = path.join(root, "node_modules", ".prisma", "client");

try {
  fs.rmSync(clientDir, { recursive: true, force: true });
} catch (e) {
  if (e && e.code !== "ENOENT") throw e;
}

execSync("npx prisma generate", { stdio: "inherit", cwd: root });
