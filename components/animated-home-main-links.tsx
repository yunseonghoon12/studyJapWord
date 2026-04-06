"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const STAGGER = 0.065;
const DURATION = 0.35;
/** ease-out — no bounce */
const EASE = [0, 0, 0.2, 1] as const;

type Props = { linkClassName: string };

const LINKS = [
  { href: "/study", label: "단어 공부" },
  { href: "/test", label: "시험" },
  { href: "/vocabulary", label: "단어장" },
] as const;

export function AnimatedHomeMainLinks({ linkClassName }: Props) {
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
      className="flex flex-col gap-3 sm:flex-row"
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="visible"
    >
      {LINKS.map(({ href, label }) => (
        <motion.div key={href} variants={item} className="w-full sm:flex-1">
          <Link href={href} className={`block ${linkClassName}`}>
            {label}
          </Link>
        </motion.div>
      ))}
    </motion.nav>
  );
}
