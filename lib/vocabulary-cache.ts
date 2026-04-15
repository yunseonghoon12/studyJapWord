import { writeClientCache } from "@/lib/client-cache";
import { getFavoriteWordIds } from "@/lib/favorites";
import { readJsonResponse } from "@/lib/read-json-response";

export const VOCAB_CACHE_TTL_MS = 1000 * 60 * 30;
export const VOCAB_CACHE_VERSION = 3;

export type VocabularyWordRow = {
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

export type VocabularyCachePayload = {
  fromStudy: VocabularyWordRow[];
  fromFavorites: VocabularyWordRow[];
};

export function getVocabularyCacheKey(): string {
  const fav = getFavoriteWordIds();
  const favKey = [...fav].sort().join(",");
  return `vocabulary:${favKey}`;
}

/** 단어장과 동일한 API·캐시 키로 서버에서 가져와 로컬 캐시에 저장합니다. */
export async function fetchVocabularyAndWriteCache(): Promise<VocabularyCachePayload> {
  const fav = getFavoriteWordIds();
  const q =
    fav.length > 0
      ? `?favorites=${encodeURIComponent(fav.join(","))}`
      : "";
  const res = await fetch(`/api/vocabulary${q}`, { cache: "no-store" });
  const data = await readJsonResponse<{
    fromStudy?: VocabularyWordRow[];
    fromFavorites?: VocabularyWordRow[];
  }>(res);
  const payload: VocabularyCachePayload = {
    fromStudy: data.fromStudy ?? [],
    fromFavorites: data.fromFavorites ?? [],
  };
  writeClientCache(
    getVocabularyCacheKey(),
    payload,
    VOCAB_CACHE_TTL_MS,
    VOCAB_CACHE_VERSION
  );
  return payload;
}
