"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function StudyIndexNav() {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
      >
        ← 뒤로
      </button>
      <Link
        href="/"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
      >
        홈
      </Link>
    </div>
  );
}
