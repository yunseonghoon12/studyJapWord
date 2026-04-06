/**
 * 예문 관련 열 이름은 고정:
 *   example_reading      — 예문 읽는 법(히라가나)
 *   example_meaning_kr    — 예문 한국어 해석
 *
 * 전체 헤더 예:
 *   level,word,meaning_kr,kanji,reading,example,example_reading,example_meaning_kr
 * (DB에는 word 열을 저장하지 않고 읽기/뜻 채울 때만 참고합니다.)
 *
 * Usage: npx tsx scripts/import-word-csv.ts "C:\path\to\word.csv"
 */
import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Row = Record<string, string>;

function pick(r: Row, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k]?.trim();
    if (v) return v;
  }
  return "";
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('사용법: npx tsx scripts/import-word-csv.ts "경로\\word.csv"');
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error("파일 없음:", filePath);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Row[];

  const data = rows
    .map((r) => {
      const level = pick(r, "level", "Level");
      const word = pick(r, "word", "Word");
      const meaning = pick(r, "meaning_kr", "meaning", "meaningKr");
      const kanji = pick(r, "kanji", "Kanji");
      const reading = pick(r, "reading", "Reading");
      const example = pick(r, "example", "Example");
      const exampleReading = pick(r, "example_reading");
      const exampleMeaning = pick(r, "example_meaning_kr");
      if (!level || (!word && !reading && !kanji)) return null;
      const gloss = word || reading || kanji;
      return {
        level,
        kanji: kanji || null,
        reading: reading || gloss,
        meaning: meaning || gloss,
        example: example || `${kanji || reading || gloss}。`,
        exampleReading: exampleReading || null,
        exampleMeaning: exampleMeaning || null,
      };
    })
    .filter(Boolean) as {
    level: string;
    kanji: string | null;
    reading: string;
    meaning: string;
    example: string;
    exampleReading: string | null;
    exampleMeaning: string | null;
  }[];

  if (data.length === 0) {
    console.error("가져올 행이 없습니다.");
    process.exit(1);
  }

  await prisma.userWord.deleteMany();
  await prisma.word.deleteMany();

  const BATCH = 200;
  for (let i = 0; i < data.length; i += BATCH) {
    await prisma.word.createMany({ data: data.slice(i, i + BATCH) });
  }

  console.log(`${data.length}개 단어 삽입 완료 (기존 데이터 초기화됨).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
