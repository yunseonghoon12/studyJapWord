import { Suspense } from "react";
import { VocabularyClient } from "./vocabulary-client";

export default function VocabularyPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-3 py-10 text-center text-zinc-500">
          불러오는 중…
        </main>
      }
    >
      <VocabularyClient />
    </Suspense>
  );
}
