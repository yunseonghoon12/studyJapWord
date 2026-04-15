"use client";
import Link from "next/link";

export function StudyIndexNav() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
      >
        ← 홈으로
      </Link>
    </div>
  );
}
