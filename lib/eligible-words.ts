import type { Prisma } from "@prisma/client";

export type WordWithUser = Prisma.WordGetPayload<{
  include: { userWord: true };
}>;

export function isWordEligible(w: WordWithUser): boolean {
  const uw = w.userWord;
  if (!uw) return true;
  return !uw.isExcluded;
}

export function filterEligible(words: WordWithUser[]) {
  return words.filter(isWordEligible);
}

/** Higher wrongCount first for quiz prioritization */
export function sortByWrongCountDesc(words: WordWithUser[]) {
  return [...words].sort((a, b) => {
    const wa = a.userWord?.wrongCount ?? 0;
    const wb = b.userWord?.wrongCount ?? 0;
    return wb - wa;
  });
}
