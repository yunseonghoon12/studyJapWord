import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const uw = await prisma.userWord.deleteMany();
  const w = await prisma.word.deleteMany();
  console.log(`UserWord ${uw.count}건, Word ${w.count}건 삭제됨.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
