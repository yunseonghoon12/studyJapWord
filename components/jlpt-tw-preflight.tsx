/**
 * JLPT 톤 클래스가 문자열 조합으로만 쓰일 때도 Tailwind가 유틸을 생성하도록
 * `app/` 트리에서 한 번은 리터럴로 등장시킵니다. 화면에 보이지 않습니다.
 */
export function JlptTwPreflight() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 -z-[100] h-px w-px overflow-hidden opacity-0"
    >
      <span
        className={
          [
            "inline-flex min-w-[2.25rem] shrink-0 items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold tabular-nums tracking-tight",
            "min-w-[2.5rem] text-[11px]",
            "rounded-md px-3 py-1.5 text-sm font-semibold tabular-nums tracking-tight transition [-webkit-tap-highlight-color:transparent]",
            "hover:brightness-[0.97]",
            "bg-sky-100 text-sky-800 bg-sky-200 text-sky-950 ring-2 ring-sky-400/35 ring-offset-1 ring-offset-white bg-sky-100/50 text-sky-600/75",
            "bg-violet-100 text-violet-800 bg-violet-200 text-violet-950 ring-2 ring-violet-400/35 ring-offset-1 ring-offset-white bg-violet-100/50 text-violet-600/75",
            "bg-rose-100 text-rose-800 bg-rose-200 text-rose-950 ring-2 ring-rose-400/35 ring-offset-1 ring-offset-white bg-rose-100/50 text-rose-600/75",
            "bg-orange-100 text-orange-800 bg-orange-200 text-orange-950 ring-2 ring-orange-400/35 ring-offset-1 ring-offset-white bg-orange-100/50 text-orange-600/75",
            "bg-amber-100 text-amber-900 bg-amber-200 text-amber-950 ring-2 ring-amber-400/35 ring-offset-1 ring-offset-white bg-amber-100/50 text-amber-800/70",
            "font-medium font-semibold tabular-nums",
            "h-2 h-full overflow-hidden rounded-full transition-[width] duration-500 ease-out",
            "bg-zinc-100/95 ring-1 ring-inset ring-zinc-200/60",
            "bg-sky-500 bg-violet-500 bg-rose-500 bg-orange-500 bg-amber-500",
          ].join(" ")
        }
      />
    </div>
  );
}
