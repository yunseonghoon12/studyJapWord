"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const STAGGER = 0.065;
const DURATION = 0.35;
const EASE = [0, 0, 0.2, 1] as const;

export type StudyLevelRow = {
  level: string;
  count: number;
};

type Props = { rows: StudyLevelRow[] };

export function AnimatedStudyLevelList({ rows }: Props) {
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduce ? 0 : STAGGER,
        delayChildren: 0,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 80 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduce ? 0 : DURATION,
        ease: EASE,
      },
    },
  };

  return (
    <motion.ul
      className="flex flex-col gap-2"
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="visible"
    >
      {rows.map(({ level, count: n }) => {
        const rowClass = n
          ? "flex items-center justify-between rounded-xl border border-zinc-200/70 bg-white/72 px-4 py-4 text-lg font-medium text-zinc-900 shadow-sm backdrop-blur-md transition hover:border-pink-200/80 hover:bg-pink-50/50"
          : "flex cursor-not-allowed items-center justify-between rounded-xl border border-dashed border-zinc-200/70 bg-zinc-50/55 px-4 py-4 text-lg text-zinc-400 backdrop-blur-sm";

        return (
          <motion.li key={level} variants={item}>
            {n ? (
              <Link href={`/study/${level}`} className={rowClass}>
                <span>{level}</span>
                <span className="text-sm font-normal text-zinc-500">{n}개</span>
              </Link>
            ) : (
              <div className={rowClass} aria-disabled>
                <span>{level}</span>
                <span className="text-sm font-normal text-zinc-500">준비 중</span>
              </div>
            )}
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
