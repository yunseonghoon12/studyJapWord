"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const STAGGER = 0.065;
const DURATION = 0.35;
/** ease-out — no bounce */
const EASE = [0, 0, 0.2, 1] as const;

type Props = {
  linkClassName: string;
  /** 넣으면 4번째로 같은 stagger 애니메이션 적용 (메인 3개 아래 중앙) */
  attendanceLinkClassName?: string;
};

const LINKS = [
  { href: "/study", label: "단어 공부" },
  { href: "/test", label: "시험" },
  { href: "/vocabulary", label: "단어장" },
] as const;

export function AnimatedHomeMainLinks({
  linkClassName,
  attendanceLinkClassName,
}: Props) {
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
    <motion.nav
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="visible"
    >
      {LINKS.map(({ href, label }) => (
        <motion.div key={href} variants={item} className="min-w-0 sm:col-span-1">
          <Link href={href} className={`block ${linkClassName}`}>
            {label}
          </Link>
        </motion.div>
      ))}
      {attendanceLinkClassName ? (
        <motion.div
          variants={item}
          className="flex justify-center sm:col-span-3"
        >
          <Link href="/attendance" className={attendanceLinkClassName}>
            출석체크 🌸
          </Link>
        </motion.div>
      ) : null}
    </motion.nav>
  );
}
