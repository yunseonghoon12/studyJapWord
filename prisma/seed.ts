import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** N5+N4 통합 목록(있으면 이것만 사용) */
const UNIFIED_CSV = path.join(__dirname, "data", "word.csv");
const N5_JSON = path.join(__dirname, "data", "n5-1000.json");
const N4_CSV = path.join(__dirname, "data", "n4-user.csv");

type N5Entry = {
  word: string;
  reading: string;
  meaning: string;
  example: string;
  exampleReading?: string;
  exampleMeaning?: string;
};

type CsvRow = {
  level: string;
  meaning_kr: string;
  kanji: string;
  reading: string;
  example: string;
  example_reading: string;
  example_meaning_kr: string;
};

type WordInsert = {
  level: string;
  sortIndex: number | null;
  kanji: string | null;
  reading: string;
  meaning: string;
  example: string;
  exampleReading: string | null;
  exampleMeaning: string | null;
};

function parseWordsCsv(raw: string, fileLabel: string): WordInsert[] {
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  }) as CsvRow[];

  const out: WordInsert[] = [];
  let n4Index = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const level = (r.level || "").trim();
    if (level !== "N5" && level !== "N4") continue;

    const reading = (r.reading || "").trim();
    if (!reading) {
      throw new Error(`${fileLabel} ${i + 2}행: reading 비어 있음 (${level})`);
    }

    const kanji = (r.kanji || "").trim() || null;
    const meaning = (r.meaning_kr || "").trim() || reading;
    const example = (r.example || "").trim() || `${reading}。`;
    const exampleReading = (r.example_reading || "").trim() || null;
    const exampleMeaning = (r.example_meaning_kr || "").trim() || null;

    if (level === "N5") {
      out.push({
        level: "N5",
        sortIndex: null,
        kanji,
        reading,
        meaning,
        example,
        exampleReading,
        exampleMeaning,
      });
    } else {
      out.push({
        level: "N4",
        sortIndex: n4Index,
        kanji,
        reading,
        meaning,
        example,
        exampleReading,
        exampleMeaning,
      });
      n4Index += 1;
    }
  }

  return out;
}

function loadLegacy(): WordInsert[] {
  const out: WordInsert[] = [];

  if (fs.existsSync(N5_JSON)) {
    const raw = fs.readFileSync(N5_JSON, "utf-8");
    const entries = JSON.parse(raw) as N5Entry[];
    for (const e of entries) {
      out.push({
        level: "N5",
        sortIndex: null,
        kanji: null,
        reading: e.reading || e.word,
        meaning: e.meaning || e.word,
        example: e.example,
        exampleReading: e.exampleReading?.trim() || null,
        exampleMeaning: e.exampleMeaning?.trim() || null,
      });
    }
  } else {
    console.warn(
      `N5 JSON 없음 — N5는 건너뜁니다: ${N5_JSON}\n` +
        `  또는 통합 파일을 두세요: ${UNIFIED_CSV}`
    );
  }

  if (fs.existsSync(N4_CSV)) {
    const raw = fs.readFileSync(N4_CSV, "utf-8");
    out.push(...parseWordsCsv(raw, N4_CSV));
  } else {
    console.warn(`N4 CSV 없음 (건너뜀): ${N4_CSV}`);
  }

  return out;
}

async function main() {
  let inserts: WordInsert[];

  if (fs.existsSync(UNIFIED_CSV)) {
    const raw = fs.readFileSync(UNIFIED_CSV, "utf-8");
    inserts = parseWordsCsv(raw, UNIFIED_CSV);
    console.log(`통합 단어 CSV 사용: ${UNIFIED_CSV}`);
  } else {
    inserts = loadLegacy();
  }

  if (inserts.length === 0) {
    throw new Error(
      `삽입할 단어가 없습니다.\n` +
        `  • ${UNIFIED_CSV} 를 두거나\n` +
        `  • ${N5_JSON} / ${N4_CSV} 중 하나 이상 준비하세요.`
    );
  }

  await prisma.userWord.deleteMany();
  await prisma.word.deleteMany();

  const BATCH = 200;
  for (let i = 0; i < inserts.length; i += BATCH) {
    await prisma.word.createMany({ data: inserts.slice(i, i + BATCH) });
  }

  const n5n = inserts.filter((w) => w.level === "N5").length;
  const n4n = inserts.filter((w) => w.level === "N4").length;
  console.log(`삽입 완료: N5 ${n5n}건, N4 ${n4n}건 (N4는 파일 순서 유지).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
