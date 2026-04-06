"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FavoriteStarButton } from "@/components/FavoriteStarButton";
import { StudyCard } from "@/components/StudyCard";
import { getFavoriteWordIds } from "@/lib/favorites";
import { readJsonResponse } from "@/lib/read-json-response";

type WordRow = {
  id: string;
  level: string;
  kanji: string | null;
  reading: string;
  meaning: string;
  example: string;
  exampleReading: string | null;
  exampleMeaning: string | null;
  wrongCount: number;
  correctCount: number;
};

type TabId = "study" | "favorites";

/** 연 세트 탭용 JLPT 레벨 필터 */
type StudyLevelFilter = (typeof JLPT_LEVELS)[number];

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
const PAGE_SIZE = 20;

const TAB_STYLES = {
  active: "border-zinc-900 bg-white/90 text-zinc-900 shadow-sm",
  inactive:
    "border-zinc-200/80 bg-white/50 text-zinc-600 hover:border-zinc-400 hover:bg-white/70",
};

export function VocabularyClient() {
  const router = useRouter();
  const [fromStudy, setFromStudy] = useState<WordRow[]>([]);
  const [fromFavorites, setFromFavorites] = useState<WordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("study");
  const [studyLevel, setStudyLevel] = useState<StudyLevelFilter>("N5");
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    try {
      const fav = getFavoriteWordIds();
      const q =
        fav.length > 0
          ? `?favorites=${encodeURIComponent(fav.join(","))}`
          : "";
      const res = await fetch(`/api/vocabulary${q}`);
      const data = await readJsonResponse<{
        fromStudy?: WordRow[];
        fromFavorites?: WordRow[];
      }>(res);
      const nextStudy = data.fromStudy ?? [];
      const nextFav = data.fromFavorites ?? [];
      const apply = () => {
        setFromStudy(nextStudy);
        setFromFavorites(nextFav);
      };
      if (silent) {
        startTransition(apply);
      } else {
        apply();
      }
    } catch {
      if (!silent) {
        setFromStudy([]);
        setFromFavorites([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChange = () => void load({ silent: true });
    window.addEventListener("wordStudy-favorites-changed", onChange);
    return () => window.removeEventListener("wordStudy-favorites-changed", onChange);
  }, [load]);

  useEffect(() => {
    const onFocus = () => void load({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const words = useMemo(() => {
    const base = tab === "study" ? fromStudy : fromFavorites;
    if (tab !== "study") return base;
    return base.filter((w) => w.level === studyLevel);
  }, [tab, fromStudy, fromFavorites, studyLevel]);

  const totalPages =
    words.length === 0 ? 1 : Math.ceil(words.length / PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [tab, studyLevel]);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const pagedWords = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return words.slice(start, start + PAGE_SIZE);
  }, [words, currentPage]);

  const emptyStudy = !loading && tab === "study" && fromStudy.length === 0;
  const emptyStudyFilter =
    !loading &&
    tab === "study" &&
    fromStudy.length > 0 &&
    words.length === 0;
  const emptyFav = !loading && fromFavorites.length === 0;

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-3 py-4">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        ← 뒤로
      </button>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">단어장</h1>
      <p className="mt-1 text-sm text-zinc-600">
        공부에서 연 단어와 즐겨찾기를 탭으로 나눠 볼 수 있습니다.
      </p>

      <div
        className="mt-5 flex rounded-xl border border-zinc-800/50 bg-white/45 p-1 backdrop-blur-sm"
        role="tablist"
        aria-label="단어장 구분"
      >
        <button
          type="button"
          role="tab"
          id="tab-study"
          aria-selected={tab === "study"}
          onClick={() => {
            setTab("study");
            setOpenId(null);
          }}
          className={`flex-1 rounded-lg border px-2 py-2.5 text-center text-sm font-medium transition ${tab === "study" ? TAB_STYLES.active : TAB_STYLES.inactive}`}
        >
          공부 단어
          {!loading ? (
            <span className="mt-0.5 block text-xs font-normal tabular-nums opacity-80">
              {fromStudy.length}개
            </span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-favorites"
          aria-selected={tab === "favorites"}
          onClick={() => {
            setTab("favorites");
            setOpenId(null);
          }}
          className={`flex-1 rounded-lg border px-2 py-2.5 text-center text-sm font-medium transition ${tab === "favorites" ? TAB_STYLES.active : TAB_STYLES.inactive}`}
        >
          즐겨찾기
          {!loading ? (
            <span className="mt-0.5 block text-xs font-normal tabular-nums opacity-80">
              {fromFavorites.length}개
            </span>
          ) : null}
        </button>
      </div>

      {tab === "study" && (
        <div className="mt-4">
          <p className="text-xs font-medium tracking-wide text-zinc-500">
            난이도
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {JLPT_LEVELS.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => {
                  setStudyLevel(lv);
                  setOpenId(null);
                }}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  studyLevel === lv
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-200/80 bg-white/70 text-zinc-800 backdrop-blur-sm hover:bg-pink-50/55"
                }`}
              >
                {lv}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <p className="mt-10 text-center text-zinc-500">불러오는 중…</p>
      )}

      {!loading && emptyStudy && (
        <p className="mt-10 rounded-xl border border-zinc-800 bg-zinc-50/60 px-4 py-6 text-center text-sm leading-relaxed text-zinc-600 backdrop-blur-sm">
          아직 공부에서 연 단어가 없습니다.
          <br />
          단어 공부에서 세트를 열어 학습해 보세요.
        </p>
      )}

      {!loading && emptyStudyFilter && (
        <p className="mt-10 rounded-xl border border-zinc-800 bg-zinc-50/60 px-4 py-6 text-center text-sm leading-relaxed text-zinc-600 backdrop-blur-sm">
          {studyLevel} 레벨에 해당하는 단어가 없습니다.
          <br />
          다른 난이도를 선택하거나 단어 공부에서 해당 레벨을 열어 보세요.
        </p>
      )}

      {!loading && tab === "favorites" && emptyFav && (
        <p className="mt-10 rounded-xl border border-zinc-800 bg-zinc-50/60 px-4 py-6 text-center text-sm leading-relaxed text-zinc-600 backdrop-blur-sm">
          즐겨찾기한 단어가 없습니다.
          <br />
          단어 공부 화면에서 별을 눌러 추가해 보세요.
        </p>
      )}

      {words.length > 0 ? (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/50 bg-white/60 px-3 py-2.5 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage <= 0}
              className="rounded-lg border border-zinc-200/90 bg-white/80 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:border-pink-200/80 hover:bg-pink-50/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              이전 페이지
            </button>
            <p className="text-sm font-medium tabular-nums text-zinc-700">
              {currentPage + 1} / {totalPages}
              <span className="ml-2 text-xs font-normal text-zinc-500">
                (총 {words.length}개 · 페이지당 {PAGE_SIZE}개)
              </span>
            </p>
            <button
              type="button"
              onClick={() =>
                setPage((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={currentPage >= totalPages - 1}
              className="rounded-lg border border-zinc-200/90 bg-white/80 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:border-pink-200/80 hover:bg-pink-50/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음 페이지
            </button>
          </div>
          <ul className="mt-4 flex flex-col gap-3 pb-8">
          {pagedWords.map((w) => {
            const open = openId === w.id;
            return (
              <li
                key={w.id}
                className="rounded-xl border border-zinc-800 bg-white/80 backdrop-blur-md"
              >
                <div className="flex items-center gap-2 px-2 py-2">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : w.id)}
                    className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left transition hover:bg-pink-50/45"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-zinc-900">
                        {w.kanji?.trim() || w.reading}
                      </span>
                      {w.kanji?.trim() ? (
                        <span className="text-sm text-zinc-600">{w.reading}</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-zinc-700">
                      {w.meaning}
                    </p>
                  </button>
                  <FavoriteStarButton wordId={w.id} />
                </div>
                {open && (
                  <div className="border-t border-zinc-800 px-1 pb-2 pt-2">
                    <StudyCard
                      data={{
                        kanji: w.kanji,
                        reading: w.reading,
                        meaning: w.meaning,
                        example: w.example,
                        exampleReading: w.exampleReading,
                        exampleMeaning: w.exampleMeaning,
                        wrongCount: w.wrongCount,
                        correctCount: w.correctCount,
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        </>
      ) : null}

      <Link
        href="/study"
        className="mt-4 inline-block text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        단어 공부로 →
      </Link>
    </main>
  );
}
