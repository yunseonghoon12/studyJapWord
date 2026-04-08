"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { readJsonResponse } from "@/lib/read-json-response";

const CHECK_KEY = "wordStudy.attendanceDays";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readLocalBackup(): Set<string> {
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

export default function AttendancePage() {
  const today = new Date();
  const [days, setDays] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance");
      const data = await readJsonResponse<{
        days?: string[];
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "출석 목록을 불러올 수 없습니다.");
      let list = data.days ?? [];

      if (list.length === 0 && typeof window !== "undefined") {
        const backup = readLocalBackup();
        if (backup.size > 0) {
          const importRes = await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ importDays: [...backup] }),
          });
          const imported = await readJsonResponse<{
            days?: string[];
            error?: string;
          }>(importRes);
          if (importRes.ok) {
            localStorage.removeItem(CHECK_KEY);
            list = imported.days ?? list;
          }
        }
      }

      setDays(new Set(list));
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
      setDays(readLocalBackup());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const todayKey = ymd(today);
  const checkedToday = days.has(todayKey);

  const markToday = async () => {
    if (checkedToday || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: todayKey }),
      });
      const data = await readJsonResponse<{
        days?: string[];
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "저장에 실패했습니다.");
      setDays(new Set(data.days ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 오류");
    } finally {
      setSaving(false);
    }
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
          onClick={() => void markToday()}
          disabled={checkedToday || saving || loading}
          className="rounded-full border border-pink-200/80 bg-pink-50/80 px-4 py-2 text-sm font-semibold text-pink-700 transition hover:bg-pink-100/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {checkedToday
            ? "오늘 출석 완료 🌸"
            : saving
              ? "저장 중…"
              : "오늘 출석 체크 🌸"}
        </button>
      </div>

      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">출석 달력</h1>
      <p className="mt-1 text-sm text-zinc-600">
        이번 달 공부한 날을 벚꽃으로 기록합니다.
      </p>

      {error ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {error}
        </p>
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
