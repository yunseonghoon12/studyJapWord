import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const N5_JSON = path.join(__dirname, "data", "n5-1000.json");

type N5Entry = {
  word: string;
  reading: string;
  meaning: string;
  example: string;
  exampleReading?: string;
  exampleMeaning?: string;
};

async function main() {
  if (!fs.existsSync(N5_JSON)) {
    throw new Error(
      `없음: ${N5_JSON}\n먼저 실행: npx tsx scripts/build-n5-1000.ts`
    );
  }

  const raw = fs.readFileSync(N5_JSON, "utf-8");
  const entries = JSON.parse(raw) as N5Entry[];

  await prisma.userWord.deleteMany();
  await prisma.word.deleteMany();

  const BATCH = 200;
  for (let i = 0; i < entries.length; i += BATCH) {
    const chunk = entries.slice(i, i + BATCH).map((e) => ({
      level: "N5",
      kanji: null as string | null,
      reading: e.reading || e.word,
      meaning: e.meaning || e.word,
      example: e.example,
      exampleReading: e.exampleReading?.trim() || null,
      exampleMeaning: e.exampleMeaning?.trim() || null,
    }));
    await prisma.word.createMany({ data: chunk });
  }

  console.log(`N5 단어 ${entries.length}건 삽입 완료.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
