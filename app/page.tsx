import Link from "next/link";
import { AnimatedHomeMainLinks } from "@/components/animated-home-main-links";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** 기본은 아주 연한 핑크, hover 시 진한 핑크 */
const HOME_MAIN_LINK =
  "flex h-14 items-center justify-center rounded-xl border border-pink-100/80 bg-pink-50/75 px-4 text-center text-lg font-medium text-zinc-800 shadow-sm backdrop-blur-sm transition hover:border-pink-900 hover:bg-pink-900 hover:text-white sm:flex-1";

const HOME_ATTENDANCE_LINK =
  "inline-flex items-center justify-center rounded-full border border-pink-200/80 bg-pink-50/80 px-5 py-2 text-sm font-semibold text-pink-700 shadow-sm backdrop-blur-sm transition hover:border-pink-300 hover:bg-pink-100/80";

/** 메인 전용 배경 — `public/home-bg.png` 에 두면 됩니다. */
const HOME_BG_URL = "/home-bg.png";

export default async function HomePage() {
  const openedCount = await prisma.userWord.count({
    where: { seenInStudy: true },
  });

  return (
    <div className="relative min-h-dvh w-full">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${HOME_BG_URL})` }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-white/70 via-white/50 to-white/75"
        aria-hidden
      />
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          일본어 단어
        </h1>
        <p className="mt-2 text-lg text-zinc-600">
          단어를 익히고 시험으로 복습하세요.
        </p>
      </div>

      {openedCount === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          아직 시험에 사용할 단어가 없습니다.「단어 공부」에서 한자 학습을
          시작하면 메인 시험에서 랜덤 문제를 풀 수 있습니다.
        </p>
      ) : (
        <p className="text-sm text-zinc-500">
          지금까지 학습한 단어{" "}
          <span className="font-semibold text-zinc-800">{openedCount}</span>개
        </p>
      )}

      <AnimatedHomeMainLinks
        linkClassName={HOME_MAIN_LINK}
        attendanceLinkClassName={HOME_ATTENDANCE_LINK}
      />

      <Link
        href="/settings"
        className="text-center text-sm font-medium text-zinc-600 transition hover:text-pink-900"
      >
        설정 · 세트당 단어 수
      </Link>
      </main>
    </div>
  );
}
