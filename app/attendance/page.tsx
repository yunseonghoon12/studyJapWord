"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const CHECK_KEY = "wordStudy.attendanceDays";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readSet(): Set<string> {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = localStorage.getItem(CHECK_KEY);
    if (!raw) return new Set<string>();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr.filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v)));
  } catch {
    return new Set<string>();
  }
}

function writeSet(s: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHECK_KEY, JSON.stringify([...s].sort()));
}

export default function AttendancePage() {
  const today = new Date();
  const [days, setDays] = useState<Set<string>>(() => readSet());
  const [anchor, setAnchor] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const todayKey = ymd(today);
  const checkedToday = days.has(todayKey);

  const markToday = () => {
    const next = new Set(days);
    next.add(todayKey);
    writeSet(next);
    setDays(next);
  };

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
        <button
          type="button"
          onClick={markToday}
          disabled={checkedToday}
          className="rounded-full border border-pink-200/80 bg-pink-50/80 px-4 py-2 text-sm font-semibold text-pink-700 transition hover:bg-pink-100/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {checkedToday ? "오늘 출석 완료 🌸" : "오늘 출석 체크 🌸"}
        </button>
      </div>

      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">출석 달력</h1>
      <p className="mt-1 text-sm text-zinc-600">
        이번 달 공부한 날을 벚꽃으로 기록합니다.
      </p>

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
    </main>
  );
}
