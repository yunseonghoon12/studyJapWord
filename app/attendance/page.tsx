"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAttendance } from "@/components/attendance-context";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AttendancePage() {
  const today = new Date();
  const { days, loading, error, refresh } = useAttendance();
  const [anchor, setAnchor] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const todayKey = ymd(today);
  const checkedToday = days.has(todayKey);

  const monthGrid = useMemo(() => {
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const startBlank = first.getDay();
    const total = last.getDate();
    const cells: { key: string; day: number; checked: boolean }[] = [];
    for (let i = 0; i < startBlank; i++) {
      cells.push({ key: `blank-${i}`, day: 0, checked: false });
    }
    for (let d = 1; d <= total; d++) {
      const k = ymd(new Date(y, m, d));
      cells.push({ key: k, day: d, checked: days.has(k) });
    }
    return cells;
  }, [anchor, days]);

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
        >
          ← 홈으로
        </Link>
        <div className="rounded-full border border-pink-200/80 bg-pink-50/80 px-4 py-2 text-sm font-semibold text-pink-700">
          {loading
            ? "불러오는 중…"
            : checkedToday
              ? "오늘 출석 완료 🌸"
              : "오늘 출석 반영 중…"}
        </div>
      </div>

      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">출석 달력</h1>
      <p className="mt-1 text-sm text-zinc-600">
        앱에 접속한 날은 자동으로 출석 처리되며, 달력에 벚꽃으로 표시됩니다.
      </p>

      {error ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-950 hover:bg-amber-100/80"
          >
            다시 시도
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-8 text-center text-zinc-500">불러오는 중…</p>
      ) : (
        <section className="mt-5 rounded-2xl border border-pink-100/90 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
              }
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              이전 달
            </button>
            <p className="text-base font-semibold text-zinc-800">
              {anchor.getFullYear()}년 {anchor.getMonth() + 1}월
            </p>
            <button
              type="button"
              onClick={() =>
                setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
              }
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              다음 달
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs text-zinc-500">
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
            {monthGrid.map((c) =>
              c.day === 0 ? (
                <div key={c.key} className="h-10 rounded-lg bg-transparent" />
              ) : (
                <div
                  key={c.key}
                  className={`flex h-10 items-center justify-center rounded-lg border text-sm ${
                    c.checked
                      ? "border-pink-200 bg-pink-50 text-pink-700"
                      : "border-zinc-200 bg-white text-zinc-700"
                  }`}
                >
                  {c.checked ? "🌸" : c.day}
                </div>
              )
            )}
          </div>
        </section>
      )}
    </main>
  );
}
