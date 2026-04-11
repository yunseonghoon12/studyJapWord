"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  studyIndexLevelBadgeClass,
  studyIndexRowClass,
} from "@/components/study-index-level-design";

const STAGGER = 0.065;
const DURATION = 0.35;
const EASE = [0, 0, 0.2, 1] as const;

const metaEnabled = "text-sm tabular-nums text-zinc-500";
const metaDisabled = "text-sm font-medium text-zinc-400";

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
    hidden: { opacity: 0, y: 20 },
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
        const enabled = Boolean(n);

        return (
          <motion.li key={level} variants={item} className="w-full">
            {enabled ? (
              <Link
                href={`/study/${level}`}
                className={studyIndexRowClass(level, true)}
                aria-label={`${level} 단어 공부로 이동, ${n}개`}
              >
                <span className={studyIndexLevelBadgeClass(level, true)}>
                  {level}
                </span>
                <span className={metaEnabled}>{n}개</span>
              </Link>
            ) : (
              <div
                className={studyIndexRowClass(level, false)}
                aria-disabled
                aria-label={`${level} 준비 중`}
              >
                <span className={studyIndexLevelBadgeClass(level, false)}>
                  {level}
                </span>
                <span className={metaDisabled}>준비 중</span>
              </div>
            )}
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
