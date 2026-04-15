"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useState } from "react";
import { VocabularyStudyWordsList } from "@/components/vocabulary-study-words-list";
import { readClientCache } from "@/lib/client-cache";
import type { VocabularyWordRow as WordRow } from "@/lib/vocabulary-cache";
import {
  VOCAB_CACHE_VERSION,
  fetchVocabularyAndWriteCache,
  getVocabularyCacheKey,
} from "@/lib/vocabulary-cache";

type Tab = "favorites" | "study";

export function VocabularyClient() {
  const router = useRouter();
  const [fromStudy, setFromStudy] = useState<WordRow[]>([]);
  const [fromFavorites, setFromFavorites] = useState<WordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("favorites");
  const [studyQuery, setStudyQuery] = useState("");

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    const cacheKey = getVocabularyCacheKey();
    if (!silent) {
      const cached = readClientCache<{
        fromStudy: WordRow[];
        fromFavorites: WordRow[];
      }>(cacheKey, VOCAB_CACHE_VERSION);
      if (cached) {
        setFromStudy(cached.fromStudy ?? []);
        setFromFavorites(cached.fromFavorites ?? []);
        setLoading(false);
      } else {
        setLoading(true);
      }
    }
    try {
      const { fromStudy: nextStudy, fromFavorites: nextFav } =
        await fetchVocabularyAndWriteCache();
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
    return () =>
      window.removeEventListener("wordStudy-favorites-changed", onChange);
  }, [load]);

  useEffect(() => {
    const onFocus = () => void load({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const emptyFav = !loading && fromFavorites.length === 0;
  const emptyStudy = !loading && fromStudy.length === 0;
  const filteredStudyWords = fromStudy.filter((w) => {
    const q = studyQuery.trim().toLowerCase();
    if (!q) return true;
    return [w.kanji ?? "", w.reading, w.meaning]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
  const emptyFilteredStudy = !loading && tab === "study" && filteredStudyWords.length === 0;
  const tabBtnClass = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-semibold transition ${
      active
        ? "border border-zinc-900 bg-zinc-900 text-white"
        : "border border-zinc-200/80 bg-white/85 text-zinc-700 hover:border-pink-200/80 hover:bg-pink-50/60"
    }`;

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
        내 단어장과 공부한 단어를 탭으로 나눠 볼 수 있습니다.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("favorites")}
          className={tabBtnClass(tab === "favorites")}
        >
          내 단어장
        </button>
        <button
          type="button"
          onClick={() => setTab("study")}
          className={tabBtnClass(tab === "study")}
        >
          공부한 단어
        </button>
      </div>

      {loading && (
        <p className="mt-10 text-center text-zinc-500">불러오는 중…</p>
      )}

      {!loading && tab === "favorites" && emptyFav && (
        <p className="mt-6 rounded-xl border border-zinc-800 bg-zinc-50/60 px-4 py-6 text-center text-sm leading-relaxed text-zinc-600 backdrop-blur-sm">
          내 단어장에 단어가 없습니다.
          <br />
          단어 공부 화면에서 별을 눌러 추가해 보세요.
        </p>
      )}

      {!loading && tab === "study" && emptyStudy && (
        <p className="mt-6 rounded-xl border border-zinc-800 bg-zinc-50/60 px-4 py-6 text-center text-sm leading-relaxed text-zinc-600 backdrop-blur-sm">
          아직 공부한 단어가 없습니다.
          <br />
          단어 공부에서 세트를 열어 학습해 보세요.
        </p>
      )}

      {!loading && tab === "study" && fromStudy.length > 0 && (
        <div className="mt-4">
          <label
            htmlFor="study-word-search"
            className="mb-1.5 block text-xs font-semibold tracking-wide text-zinc-500"
          >
            단어 검색
          </label>
          <input
            id="study-word-search"
            type="search"
            value={studyQuery}
            onChange={(e) => setStudyQuery(e.target.value)}
            placeholder="한자 / 히라가나 / 한국어 검색"
            className="w-full rounded-xl border border-zinc-200/80 bg-white/85 px-3 py-2.5 text-sm text-zinc-800 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-pink-300/80 focus:ring-2 focus:ring-pink-200/70"
          />
        </div>
      )}

      {emptyFilteredStudy && (
        <p className="mt-4 rounded-xl border border-zinc-800 bg-zinc-50/60 px-4 py-5 text-center text-sm leading-relaxed text-zinc-600 backdrop-blur-sm">
          검색 결과가 없습니다.
        </p>
      )}

      {!loading && tab === "favorites" && fromFavorites.length > 0 && (
        <div className="mt-4">
          <VocabularyStudyWordsList
            words={fromFavorites}
            showLevelFilter={false}
          />
        </div>
      )}

      {!loading && tab === "study" && filteredStudyWords.length > 0 && (
        <div className="mt-4">
          <VocabularyStudyWordsList words={filteredStudyWords} showLevelFilter />
        </div>
      )}

      <Link
        href="/study"
        className="mt-4 inline-block text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        단어 공부로 →
      </Link>
    </main>
  );
}
