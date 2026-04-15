import { AnimatedStudyLevelList } from "@/components/animated-study-level-list";
import { AnimatedStudyProgress } from "@/components/animated-study-progress";
import { StudyIndexNav } from "./study-index-nav";
import { JLPT_LEVELS } from "@/components/jlpt-level-styles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StudyIndexPage() {
  const [counts, openedRows] = await Promise.all([
    prisma.word.groupBy({
      by: ["level"],
      _count: { id: true },
    }),
    prisma.userWord.findMany({
      where: { seenInStudy: true },
      select: { word: { select: { level: true } } },
    }),
  ]);
  const map = Object.fromEntries(counts.map((c) => [c.level, c._count.id]));

  const openedMap = new Map<string, number>();
  for (const row of openedRows) {
    const lv = row.word.level;
    openedMap.set(lv, (openedMap.get(lv) ?? 0) + 1);
  }

  const progressRows = JLPT_LEVELS.map((level) => {
    const total = map[level] ?? 0;
    const opened = openedMap.get(level) ?? 0;
    const ratio = total > 0 ? Math.round((opened / total) * 100) : 0;
    return { level, ratio, opened, total };
  });

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <div className="mb-6">
        <StudyIndexNav />
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900">레벨 선택</h1>
        <p className="mt-1 text-zinc-600">JLPT 기준으로 단어를 공부합니다.</p>
      </div>
      <AnimatedStudyLevelList
        rows={JLPT_LEVELS.map((level) => ({
          level,
          count: map[level] ?? 0,
        }))}
      />
      <AnimatedStudyProgress
        rows={progressRows.map((row) => ({ level: row.level, ratio: row.ratio }))}
      />
    </main>
  );
}
