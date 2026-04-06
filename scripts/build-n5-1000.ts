/**
 * N5 단어 1000개 JSON 생성 (영문 뜻 → 한국어 번역 API, 일본어 예문 자동).
 * 실행: npx tsx scripts/build-n5-1000.ts
 */
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import kuromoji from "kuromoji";
import { toHiragana } from "wanakana";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "prisma", "data");
const OUT = path.join(DATA, "n5-1000.json");

type Row = {
  word: string;
  reading: string;
  meaning: string;
  example: string;
};

type RowDraft = {
  word: string;
  reading: string;
  meaningEn: string;
  example: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function jishoEnglishGloss(word: string): Promise<string> {
  const url = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`;
  try {
    const res = await fetch(url);
    const j = (await res.json()) as {
      data?: { senses?: { english_definitions?: string[] }[] }[];
    };
    const defs = j.data?.[0]?.senses?.[0]?.english_definitions;
    if (defs?.length) return defs.join("; ");
  } catch {
    /* ignore */
  }
  return word;
}

async function enToKo(text: string): Promise<string> {
  const q = text.replace(/\s+/g, " ").trim().slice(0, 240);
  if (!q) return "";
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=en|ko`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
    };
    const t = data.responseData?.translatedText?.trim();
    if (t && !/^MYMEMORY WARNING/i.test(t)) return t;
  } catch {
    /* ignore */
  }
  return q;
}

function exampleJp(word: string, reading: string): string {
  const hasKanji = /[\u4e00-\u9fff々]/.test(word);
  if (hasKanji && word !== reading) {
    return `${word}は「${reading}」と読みます。`;
  }
  return `今日は「${word}」を勉強しました。`;
}

function readingFromTokenizer(tokenizer: kuromoji.Tokenizer, surface: string): string {
  const tokens = tokenizer.tokenize(surface);
  return tokens
    .map((t) => {
      const r = t.reading;
      if (r) return toHiragana(r);
      return toHiragana(t.surface_form);
    })
    .join("");
}

async function buildTokenizer(): Promise<kuromoji.Tokenizer> {
  const dicPath = path.join(ROOT, "node_modules", "kuromoji", "dict");
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath }).build((err, tokenizer) => {
      if (err) reject(err);
      else resolve(tokenizer);
    });
  });
}

function loadCsv(file: string): { expression: string; reading: string; meaning: string }[] {
  const buf = fs.readFileSync(path.join(DATA, file), "utf-8");
  return parse(buf, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as { expression: string; reading: string; meaning: string }[];
}

function minReadingMap(csvPath: string): Map<string, string> {
  const buf = fs.readFileSync(path.join(DATA, csvPath), "utf-8");
  const recs = parse(buf, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as { expression: string; reading: string }[];
  const m = new Map<string, string>();
  for (const r of recs) {
    if (r.expression && r.reading) m.set(r.expression.trim(), r.reading.trim());
  }
  return m;
}

async function main() {
  const jlpt = JSON.parse(
    fs.readFileSync(path.join(DATA, "jlpt-words.json"), "utf-8")
  ) as Record<string, string>;

  const n5Jlpt = new Set(
    Object.entries(jlpt)
      .filter(([, lv]) => lv === "N5")
      .map(([w]) => w)
  );
  const n4Jlpt = Object.entries(jlpt)
    .filter(([, lv]) => lv === "N4")
    .map(([w]) => w);

  const n5Rows = loadCsv("n5-elzup.csv");
  const n4Rows = loadCsv("n4-elzup.csv");
  const n4ByExpr = new Map(n4Rows.map((r) => [r.expression, r]));

  const byExpr = new Map<string, { reading: string; meaningEn: string }>();
  for (const r of n5Rows) {
    byExpr.set(r.expression, { reading: r.reading, meaningEn: r.meaning });
  }

  const minReading = minReadingMap("all.min.csv");

  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const r of n5Rows) {
    if (!seen.has(r.expression)) {
      seen.add(r.expression);
      ordered.push(r.expression);
    }
  }

  for (const w of n5Jlpt) {
    if (!seen.has(w)) {
      seen.add(w);
      ordered.push(w);
    }
  }

  const shortN4 = n4Jlpt
    .filter((w) => !seen.has(w) && [...w].length <= 4)
    .sort((a, b) => a.localeCompare(b, "ja"));

  for (const w of shortN4) {
    if (ordered.length >= 1000) break;
    if (seen.has(w)) continue;
    seen.add(w);
    ordered.push(w);
  }

  if (ordered.length < 1000) {
    console.warn(
      `경고: N5+보충만으로 ${ordered.length}개입니다. (목표 1000 미달)`
    );
  }

  const slice = ordered.slice(0, 1000);
  console.log("kuromoji…");
  const tokenizer = await buildTokenizer();

  const draft: RowDraft[] = [];

  for (const word of slice) {
    let reading: string;
    let meaningEn: string;

    const base = byExpr.get(word);
    const n4 = n4ByExpr.get(word);
    if (base) {
      reading = base.reading;
      meaningEn = base.meaningEn;
    } else if (n4) {
      reading = n4.reading;
      meaningEn = n4.meaning;
    } else {
      reading = minReading.get(word) || readingFromTokenizer(tokenizer, word) || word;
      meaningEn = await jishoEnglishGloss(word);
      await sleep(250);
    }

    draft.push({
      word,
      reading,
      meaningEn,
      example: exampleJp(word, reading),
    });
  }

  console.log(`번역 ${draft.length}건 (en→ko), 약 ${Math.ceil((draft.length * 180) / 1000)}초 예상…`);

  const rows: Row[] = [];
  for (let i = 0; i < draft.length; i++) {
    const d = draft[i]!;
    const meaning = await enToKo(d.meaningEn);
    rows.push({
      word: d.word,
      reading: d.reading,
      meaning,
      example: d.example,
    });
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${draft.length}`);
    await sleep(180);
  }

  fs.writeFileSync(
    OUT,
    JSON.stringify(rows, null, 0),
    "utf-8"
  );
  console.log("저장:", OUT, rows.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
