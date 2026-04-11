import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapDbWordToStudyRow } from "@/lib/study-word-map";
import { sortByStableRandom } from "@/lib/stable-random-order";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store",
};

/** 단어 공부에서 연 단어(seenInStudy)만, 레벨별 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level");
  if (!level) {
    return NextResponse.json({ error: "level is required" }, { status: 400 });
  }

  const rows = await prisma.word.findMany({
    where: {
      level,
      userWord: {
        is: {
          seenInStudy: true,
          isExcluded: false,
        },
      },
    },
    include: { userWord: true },
    orderBy: [{ id: "asc" }],
  });
  const orderedRows = sortByStableRandom(rows, (w) => w.id);
  const words = orderedRows.map((w) => mapDbWordToStudyRow(w));

  return NextResponse.json({ words }, { headers: CACHE_HEADERS });
}
