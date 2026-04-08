import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stableRandomRank } from "@/lib/stable-random-order";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=15, stale-while-revalidate=90",
};

type Row = Prisma.WordGetPayload<{ include: { userWord: true } }>;

const JLPT_ORDER = ["N5", "N4", "N3", "N2", "N1"] as const;

function levelRank(level: string): number {
  const i = JLPT_ORDER.indexOf(level as (typeof JLPT_ORDER)[number]);
  return i >= 0 ? i : 99;
}

function sortRows(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => {
    const lv = levelRank(a.level) - levelRank(b.level);
    if (lv !== 0) return lv;
    const ra = stableRandomRank(a.id);
    const rb = stableRandomRank(b.id);
    if (ra !== rb) return ra - rb;
    return a.id.localeCompare(b.id);
  });
}

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

/** 단어장: 공부에서 연 단어 / 즐겨찾기 — 각각 분리 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const favRaw = searchParams.get("favorites") ?? "";
  const favoriteIds = [
    ...new Set(favRaw.split(",").map((s) => s.trim()).filter(Boolean)),
  ];

  const seenRows = await prisma.word.findMany({
    where: {
      userWord: { is: { seenInStudy: true, isExcluded: false } },
    },
    include: { userWord: true },
  });

  let favRows: Row[] = [];
  if (favoriteIds.length > 0) {
    favRows = await prisma.word.findMany({
      where: {
        id: { in: favoriteIds },
        NOT: { userWord: { is: { isExcluded: true } } },
      },
      include: { userWord: true },
    });
  }

  const fromStudy = sortRows(seenRows).map(mapWord);
  const fromFavorites = sortRows(favRows).map(mapWord);

  return NextResponse.json(
    { fromStudy, fromFavorites },
    { headers: CACHE_HEADERS }
  );
}
