import { Suspense } from "react";
import { SettingsPageClient } from "./settings-client";

function SettingsFallback() {
  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <div className="h-6 w-16 animate-pulse rounded bg-zinc-200/80" />
      <div className="mt-4 h-9 w-32 animate-pulse rounded bg-zinc-200/80" />
      <div className="mt-8 h-40 animate-pulse rounded-2xl bg-zinc-100/90" />
      <p className="mt-4 text-sm text-zinc-500">불러오는 중…</p>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <SettingsPageClient />
    </Suspense>
  );
}
