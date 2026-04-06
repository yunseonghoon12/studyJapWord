"use client";

import { useCallback, useEffect, useState } from "react";
import { isFavoriteWordId, toggleFavoriteWordId } from "@/lib/favorites";

type Props = {
  wordId: string;
  className?: string;
};

export function FavoriteStarButton({ wordId, className = "" }: Props) {
  const [active, setActive] = useState(false);

  const sync = useCallback(() => {
    setActive(isFavoriteWordId(wordId));
  }, [wordId]);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    const onChange = () => sync();
    window.addEventListener("wordStudy-favorites-changed", onChange);
    return () => window.removeEventListener("wordStudy-favorites-changed", onChange);
  }, [sync]);

  const onClick = () => {
    const on = toggleFavoriteWordId(wordId);
    setActive(on);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      aria-pressed={active}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/75 bg-white/78 text-amber-400 shadow-sm backdrop-blur-md transition hover:bg-pink-50/55 ${className}`}
    >
      {active ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-amber-400 stroke-amber-500"
          strokeWidth={1}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          className="h-6 w-6 stroke-zinc-400"
          strokeWidth={1.5}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )}
    </button>
  );
}
