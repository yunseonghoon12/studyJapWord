import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store, must-revalidate",
};

type Row = Prisma.WordGetPayload<{ include: { userWord: true } }>;

function mapWord(w: Row) {
  const kanjiRaw = w.kanji?.trim();
  const reading = (w.reading || "").trim();
  const meaning =
    (w.meaning || "").trim() ||
    `〔${w.level}〕 ${reading || "—"}（뜻 보강）`;
  const example = (w.example || "").trim() || `${reading || "—"}。`;
  const exampleReading = (w.exampleReading || "").trim() || null;
  const exampleMeaning = (w.exampleMeaning || "").trim() || null;
  return {
    id: w.id,
    level: w.level,
    kanji: kanjiRaw || null,
    reading,
    meaning,
    example,
    exampleReading,
    exampleMeaning,
    wrongCount: w.userWord?.wrongCount ?? 0,
    correctCount: w.userWord?.correctCount ?? 0,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");
  if (!idsParam?.trim()) {
    return NextResponse.json({ words: [] });
  }

  const ids = [...new Set(idsParam.split(",").map((s) => s.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return NextResponse.json({ words: [] });
  }

  const rows = await prisma.word.findMany({
    where: {
      id: { in: ids },
      NOT: { userWord: { is: { isExcluded: true } } },
    },
    include: { userWord: true },
  });

  const byId = Object.fromEntries(rows.map((r) => [r.id, r])) as Record<
    string,
    Row
  >;
  const ordered = ids
    .map((id) => byId[id])
    .filter((w): w is Row => w != null);
  const words = ordered.map(mapWord);

  return NextResponse.json({ words }, { headers: CACHE_HEADERS });
}
