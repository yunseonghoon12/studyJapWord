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
import { readClientCache } from "@/lib/client-cache";
import type { VocabularyWordRow as WordRow } from "@/lib/vocabulary-cache";
import {
  VOCAB_CACHE_VERSION,
  fetchVocabularyAndWriteCache,
  getVocabularyCacheKey,
} from "@/lib/vocabulary-cache";

const PAGE_SIZE = 20;

export function VocabularyClient() {
  const router = useRouter();
  const [fromFavorites, setFromFavorites] = useState<WordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    const cacheKey = getVocabularyCacheKey();
    if (!silent) {
      const cached = readClientCache<{
        fromStudy: WordRow[];
        fromFavorites: WordRow[];
      }>(cacheKey, VOCAB_CACHE_VERSION);
      if (cached) {
        setFromFavorites(cached.fromFavorites ?? []);
        setLoading(false);
      } else {
        setLoading(true);
      }
    }
    try {
      const { fromFavorites: nextFav } = await fetchVocabularyAndWriteCache();
      const apply = () => {
        setFromFavorites(nextFav);
      };
      if (silent) {
        startTransition(apply);
      } else {
        apply();
      }
    } catch {
      if (!silent) {
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
    return () =>
      window.removeEventListener("wordStudy-favorites-changed", onChange);
  }, [load]);

  useEffect(() => {
    const onFocus = () => void load({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const words = fromFavorites;

  const totalPages =
    words.length === 0 ? 1 : Math.ceil(words.length / PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [words.length]);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const pagedWords = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return words.slice(start, start + PAGE_SIZE);
  }, [words, currentPage]);

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
        즐겨찾기한 단어를 모아 볼 수 있습니다.
      </p>

      {loading && (
        <p className="mt-10 text-center text-zinc-500">불러오는 중…</p>
      )}

      {!loading && emptyFav && (
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
