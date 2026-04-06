import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    orderBy: [{ reading: "asc" }, { id: "asc" }],
  });

  const words = rows.map((w) => {
    const kanjiRaw = w.kanji?.trim();
    const reading = (w.reading || "").trim();
    const meaning =
      (w.meaning || "").trim() ||
      `〔${w.level}〕 ${reading || "—"}（뜻 보강）`;
    const example = (w.example || "").trim() || `${reading || "—"}。`;
    const exampleReading =
      (w.exampleReading || "").trim() || null;
    const exampleMeaning =
      (w.exampleMeaning || "").trim() || null;
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
  });

  return NextResponse.json({ words });
}
