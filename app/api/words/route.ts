import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapDbWordToStudyRow } from "@/lib/study-word-map";
import { sortByStableRandom } from "@/lib/stable-random-order";

/** DB·시드 반영 즉시 필요; Vercel 엣지 공유 캐시 금지(순서/제외 단어 꼬임 방지) */
const CACHE_HEADERS = {
  "Cache-Control": "private, no-store, must-revalidate",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level");
  if (!level) {
    return NextResponse.json({ error: "level is required" }, { status: 400 });
  }

  const rows = await prisma.word.findMany({
    where: {
      level,
      NOT: { userWord: { is: { isExcluded: true } } },
    },
    include: { userWord: true },
    orderBy:
      level === "N4"
        ? [
            { sortIndex: { sort: "asc", nulls: "last" } },
            { id: "asc" },
          ]
        : [{ id: "asc" }],
  });
  const orderedRows =
    level === "N4"
      ? rows
      : sortByStableRandom(rows, (w) => w.id);

  const words = orderedRows.map((w) => mapDbWordToStudyRow(w));

  return NextResponse.json({ words }, { headers: CACHE_HEADERS });
}
