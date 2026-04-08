import { NextResponse } from "next/server";
import { filterEligible, sortByWrongCountDesc } from "@/lib/eligible-words";
import { buildQuizQuestionForWord, type WordQuizRow } from "@/lib/quiz-question";
import type { QuizQuestion } from "@/lib/quiz-types";
import { QUIZ_TYPES } from "@/lib/quiz-types";
import { prisma } from "@/lib/prisma";
import { sortByStableRandom } from "@/lib/stable-random-order";
import { shuffle } from "@/lib/shuffle";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

function toQuizRow(w: {
  id: string;
  kanji: string | null;
  reading: string;
  meaning: string;
  example: string;
}): WordQuizRow {
  return {
    id: w.id,
    kanji: w.kanji?.trim() ? w.kanji.trim() : null,
    reading: (w.reading || "").trim(),
    meaning: (w.meaning || "").trim(),
    example: (w.example || "").trim(),
  };
}

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    30,
    Math.max(5, Number(searchParams.get("limit")) || 12)
  );

  const levelRaw = searchParams.get("level");
  const level =
    levelRaw && JLPT_LEVELS.includes(levelRaw as (typeof JLPT_LEVELS)[number])
      ? levelRaw
      : null;

  if (!level) {
    return NextResponse.json(
      { error: "level is required (N5–N1)", questions: [] as QuizQuestion[] },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const setRaw = searchParams.get("set");
  const setMode = setRaw !== null && setRaw !== "";
  const setIdx = setMode ? Math.max(0, Math.floor(Number(setRaw))) : 0;
  const batchSize = Math.min(
    50,
    Math.max(5, Number(searchParams.get("batchSize")) || 20)
  );

  const allInLevel = await prisma.word.findMany({
    where: { level },
    include: { userWord: true },
    orderBy: [{ id: "asc" }],
  });
  const orderedLevel = sortByStableRandom(allInLevel, (w) => w.id);

  const poolLevelEligible = filterEligible(orderedLevel).map(toQuizRow);

  if (poolLevelEligible.length < 4) {
    return NextResponse.json(
      {
        questions: [] as QuizQuestion[],
        totalEligible: poolLevelEligible.length,
        needsStudy: setMode ? false : true,
        insufficientLevel: true,
        mode: setMode ? "set" : "main",
        level,
      },
      { headers: NO_STORE_HEADERS }
    );
  }

  if (setMode) {
    const slice = orderedLevel.slice(setIdx * batchSize, setIdx * batchSize + batchSize);
    const sourceEligible = filterEligible(slice).map(toQuizRow);

    if (sourceEligible.length === 0) {
      return NextResponse.json(
        {
          questions: [] as QuizQuestion[],
          totalEligible: 0,
          needsStudy: false,
          emptySet: true,
          mode: "set" as const,
          level,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    const typeCycle = shuffle([...QUIZ_TYPES]);
    const poolOrder = shuffle([...sourceEligible]);
    const questions: QuizQuestion[] = [];
    let ti = 0;
    for (const w of poolOrder) {
      if (questions.length >= limit) break;
      const type = typeCycle[ti % typeCycle.length]!;
      ti++;
      const q = buildQuizQuestionForWord(w, type, poolLevelEligible);
      if (q) questions.push(q);
    }
    const out = shuffle(questions);
    return NextResponse.json(
      {
        questions: out,
        totalEligible: sourceEligible.length,
        needsStudy: false,
        mode: "set" as const,
        level,
      },
      { headers: NO_STORE_HEADERS }
    );
  }

  const eligible = filterEligible(orderedLevel).filter(
    (w) => w.userWord?.seenInStudy === true
  );
  const poolRows = eligible.map(toQuizRow);

  if (poolRows.length < 4) {
    return NextResponse.json(
      {
        questions: [] as QuizQuestion[],
        totalEligible: poolRows.length,
        needsStudy: true,
        mode: "main" as const,
        level,
      },
      { headers: NO_STORE_HEADERS }
    );
  }

  const prioritized = sortByWrongCountDesc(eligible);
  const head = prioritized.slice(0, Math.min(40, prioritized.length));
  const poolOrder = shuffle(head).map(toQuizRow);
  const typeCycle = shuffle([...QUIZ_TYPES]);

  const questions: QuizQuestion[] = [];
  let ti = 0;
  for (const w of poolOrder) {
    if (questions.length >= limit) break;
    const type = typeCycle[ti % typeCycle.length]!;
    ti++;
    const q = buildQuizQuestionForWord(w, type, poolRows);
    if (q) questions.push(q);
  }

  const out = shuffle(questions);

  return NextResponse.json(
    {
      questions: out,
      totalEligible: poolRows.length,
      needsStudy: false,
      mode: "main" as const,
      level,
    },
    { headers: NO_STORE_HEADERS }
  );
}
