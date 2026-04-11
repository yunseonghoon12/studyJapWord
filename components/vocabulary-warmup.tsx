"use client";

import { useEffect, useRef } from "react";
import { fetchVocabularyAndWriteCache } from "@/lib/vocabulary-cache";

/**
 * 메인 등 첫 화면에서 단어장 API를 미리 호출해
 * `lib/vocabulary-cache`와 동일한 로컬 캐시를 채웁니다.
 */
export function VocabularyWarmup() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void fetchVocabularyAndWriteCache().catch(() => {
      /* 단어장에서 재시도 */
    });
  }, []);

  return null;
}
