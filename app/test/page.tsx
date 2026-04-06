import { Suspense } from "react";
import { TestPageClient } from "./test-page-client";

export default function TestPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-4 py-10 text-center text-zinc-500">
          불러오는 중…
        </main>
      }
    >
      <TestPageClient />
    </Suspense>
  );
}
