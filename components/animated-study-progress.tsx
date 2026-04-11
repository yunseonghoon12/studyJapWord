"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  STUDY_INDEX_PROGRESS_CARD_CLASS,
  studyIndexLevelBadgeClass,
  studyIndexSectionClass,
  studyIndexSectionTitleClass,
} from "@/components/study-index-level-design";
import { jlptLevelProgressBarFillClass } from "@/components/jlpt-level-styles";

const STAGGER = 0.065;
const DURATION = 0.35;
const EASE = [0, 0, 0.2, 1] as const;

export type StudyProgressRow = {
  level: string;
  ratio: number;
};

type Props = {
  rows: StudyProgressRow[];
};

export function AnimatedStudyProgress({ rows }: Props) {
  const reduce = useReducedMotion();

  const container = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduce ? 0 : DURATION,
        ease: EASE,
      },
    },
  };

  const list = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduce ? 0 : STAGGER,
        delayChildren: reduce ? 0 : 0.04,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 12 },
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
    <motion.section
      className={studyIndexSectionClass}
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="visible"
    >
      <p className={studyIndexSectionTitleClass}>레벨별 학습 진행률</p>
      <motion.ul
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5"
        variants={list}
      >
        {rows.map((row) => {
          const pct = Math.min(100, Math.max(0, row.ratio));
          return (
            <motion.li key={row.level} variants={item} className="min-w-0">
              <div className={STUDY_INDEX_PROGRESS_CARD_CLASS}>
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <span className={studyIndexLevelBadgeClass(row.level, true)}>
                    {row.level}
                  </span>
                  <div
                    className="min-w-0 flex-1"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${row.level} 학습 진행률 ${pct}%`}
                  >
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100/95 ring-1 ring-inset ring-zinc-200/60">
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ease-out ${jlptLevelProgressBarFillClass(row.level)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-base font-semibold tabular-nums tracking-tight text-zinc-800">
                    {row.ratio}
                    <span className="text-xs font-medium text-zinc-400">%</span>
                  </span>
                </div>
              </div>
            </motion.li>
          );
        })}
      </motion.ul>
    </motion.section>
  );
}
