/**
 * DB 내용을 비웁니다. (스키마는 유지)
 * 사용: npm run db:reset
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // FK 순서 보장: 자식(UserWord) -> 부모(Word)
  const uw = await prisma.userWord.deleteMany();
  const w = await prisma.word.deleteMany();
  console.log(`DB 초기화 완료. UserWord ${uw.count}건, Word ${w.count}건 삭제됨.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
