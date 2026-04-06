import Link from "next/link";
import { AnimatedStudyLevelList } from "@/components/animated-study-level-list";
import { StudyIndexNav } from "./study-index-nav";
import { prisma } from "@/lib/prisma";

const ALL_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

export default async function StudyIndexPage() {
  const counts = await prisma.word.groupBy({
    by: ["level"],
    _count: { id: true },
  });
  const map = Object.fromEntries(counts.map((c) => [c.level, c._count.id]));

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <div className="mb-6">
        <StudyIndexNav />
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900">레벨 선택</h1>
        <p className="mt-1 text-zinc-600">JLPT 기준으로 단어를 공부합니다.</p>
        <Link
          href="/settings"
          className="mt-3 inline-block text-sm font-medium text-zinc-500 hover:text-zinc-900"
        >
          세트당 단어 수 설정 →
        </Link>
      </div>
      <AnimatedStudyLevelList
        rows={ALL_LEVELS.map((level) => ({
          level,
          count: map[level] ?? 0,
        }))}
      />
    </main>
  );
}
