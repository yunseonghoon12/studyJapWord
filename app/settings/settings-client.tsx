"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DEFAULT_STUDY_CARD_VISIBILITY,
  getStudyCardVisibility,
  setStudyCardVisibility,
  type StudyCardVisibility,
} from "@/lib/study-card-visibility";
import { clearClearedBatchCounts } from "@/lib/study-settings";

export function SettingsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resettingProgress, setResettingProgress] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<StudyCardVisibility>(
    DEFAULT_STUDY_CARD_VISIBILITY
  );

  useEffect(() => {
    setVisibility(getStudyCardVisibility());
  }, []);

  const toggleMask = (key: keyof StudyCardVisibility) => {
    setVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      setStudyCardVisibility(next);
      return next;
    });
  };

  const resetStudyProgress = async () => {
    const ok = window.confirm(
      "지금까지 공부한 단어 진행 상태를 초기화할까요?\n(단어 데이터는 유지되고, 공부한 단어 수만 0개로 돌아갑니다.)"
    );
    if (!ok) return;
    setResettingProgress(true);
    setNotice(null);
    try {
      const res = await fetch("/api/user-word/reset", { method: "POST" });
      if (!res.ok) throw new Error("reset failed");
      clearClearedBatchCounts();
      window.dispatchEvent(new Event("focus"));
      setNotice("공부 진행 상태를 초기화했습니다. (공부한 단어 0개)");
    } catch {
      setNotice("초기화 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setResettingProgress(false);
    }
  };

  const handleBack = () => {
    const returnTo = searchParams.get("returnTo");
    if (returnTo && returnTo.startsWith("/")) {
      router.push(returnTo);
      return;
    }
    router.back();
  };

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <button
        type="button"
        onClick={handleBack}
        className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        ← 뒤로
      </button>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">설정</h1>

      <section className="mt-8 rounded-2xl border border-zinc-200/70 bg-white/72 p-5 shadow-sm backdrop-blur-md">
        <h2 className="text-sm font-semibold text-zinc-700">스터디 카드 가리기</h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          체크하면 스터디 카드에서 해당 항목이 블러(모자이크)로 가려집니다.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <label className="flex items-center justify-between rounded-xl border border-zinc-200/70 bg-white/80 px-3 py-2 text-sm text-zinc-800">
            <span>한자 가리기</span>
            <input
              type="checkbox"
              checked={visibility.hideKanji}
              onChange={() => toggleMask("hideKanji")}
              className="h-4 w-4 accent-zinc-900"
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-zinc-200/70 bg-white/80 px-3 py-2 text-sm text-zinc-800">
            <span>히라가나 가리기</span>
            <input
              type="checkbox"
              checked={visibility.hideReading}
              onChange={() => toggleMask("hideReading")}
              className="h-4 w-4 accent-zinc-900"
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-zinc-200/70 bg-white/80 px-3 py-2 text-sm text-zinc-800">
            <span>뜻 가리기</span>
            <input
              type="checkbox"
              checked={visibility.hideMeaning}
              onChange={() => toggleMask("hideMeaning")}
              className="h-4 w-4 accent-zinc-900"
            />
          </label>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-red-200/70 bg-red-50/60 p-5 shadow-sm backdrop-blur-md">
        <h2 className="text-sm font-semibold text-red-700">학습 진행 초기화</h2>
        <p className="mt-1 text-xs leading-relaxed text-red-700/90">
          지금까지 공부해서 연 단어 상태를 모두 초기화합니다.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-red-700/90">
          홈 화면의 학습 단어 수가 0개로 돌아갑니다.
        </p>
        <button
          type="button"
          onClick={() => void resetStudyProgress()}
          disabled={resettingProgress}
          className="mt-4 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100/70 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resettingProgress ? "초기화 중…" : "공부 진행 초기화"}
        </button>
      </section>

      {notice ? (
        <p className="mt-4 rounded-lg border border-zinc-200/80 bg-white/80 px-3 py-2 text-sm text-zinc-700">
          {notice}
        </p>
      ) : null}
    </main>
  );
}
