"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BATCH_SIZE_DEFAULT,
  BATCH_SIZE_MAX,
  BATCH_SIZE_MIN,
  getBatchSize,
  setBatchSize,
} from "@/lib/study-settings";

const PRESETS = [10, 15, 20, 30];

export default function SettingsPage() {
  const router = useRouter();
  const [n, setN] = useState(BATCH_SIZE_DEFAULT);

  useEffect(() => {
    setN(getBatchSize());
  }, []);

  const apply = (v: number) => {
    setBatchSize(v);
    setN(v);
  };

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        ← 뒤로
      </button>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">설정</h1>
      <p className="mt-2 text-zinc-600">
        한 세트에 학습할 단어 수입니다. 시험을 통과하면 다음 세트로 넘어갑니다. 기본은{" "}
        {BATCH_SIZE_DEFAULT}개이며, 레벨에 남은 단어가 그보다 적으면 남은 개수 전체가 한
        세트가 됩니다.
      </p>

      <section className="mt-8 rounded-2xl border border-zinc-200/70 bg-white/72 p-5 shadow-sm backdrop-blur-md">
        <h2 className="text-sm font-semibold text-zinc-500">세트당 단어 수</h2>
        <p className="mt-1 text-xs text-zinc-500">
          기본 {BATCH_SIZE_DEFAULT}개 · {BATCH_SIZE_MIN}〜{BATCH_SIZE_MAX} 사이
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => apply(p)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                n === p
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200/70 bg-white/75 text-zinc-800 backdrop-blur-sm hover:bg-pink-50/60"
              }`}
            >
              {p}개
            </button>
          ))}
        </div>
        <label className="mt-6 flex items-center gap-3">
          <span className="text-sm text-zinc-700">직접 입력</span>
          <input
            type="number"
            min={BATCH_SIZE_MIN}
            max={BATCH_SIZE_MAX}
            value={n}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              setN(v);
            }}
            onBlur={() => apply(Math.min(BATCH_SIZE_MAX, Math.max(BATCH_SIZE_MIN, n)))}
            className="w-24 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
      </section>
    </main>
  );
}
