"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

type AttendanceContextValue = {
  days: Set<string>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const AttendanceContext = createContext<AttendanceContextValue | null>(null);

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const [days, setDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const touch = encodeURIComponent(ymd(new Date()));
      const res = await fetch(`/api/attendance?touch=${touch}`, {
        cache: "no-store",
      });
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

  const value = useMemo(
    () => ({
      days,
      loading,
      error,
      refresh: load,
    }),
    [days, loading, error, load]
  );

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance(): AttendanceContextValue {
  const ctx = useContext(AttendanceContext);
  if (!ctx) {
    throw new Error("useAttendance는 AttendanceProvider 안에서만 사용하세요.");
  }
  return ctx;
}
