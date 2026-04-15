import { shuffle } from "@/lib/shuffle";
import type { QuizQuestion, QuizType } from "@/lib/quiz-types";
import { QUIZ_TYPES } from "@/lib/quiz-types";

export type WordQuizRow = {
  id: string;
  reading: string;
  meaning: string;
  kanji: string | null;
  example: string;
};

export type KanjiMcKind = "meaning" | "reading";

/** Prompt: 한자 우선, 없으면 읽기 표기 */
export function quizPromptSurface(w: WordQuizRow): string {
  const k = w.kanji?.trim();
  if (k) return k;
  return (w.reading || "").trim() || "—";
}

const EXAMPLE_BLANK = "（　　）";

/** 예문에서 해당 단어 부분을 빈칸으로 바꾼 뒤, 단어(표기) 객관식 */
export function buildExampleBlankQuestion(
  w: WordQuizRow,
  pool: WordQuizRow[],
  distractorCount = 3
): { prompt: string; correctAnswer: string; choices: string[] } | null {
  const ex = (w.example || "").trim();
  if (!ex || pool.length < distractorCount + 1) return null;

  const correct = quizPromptSurface(w);
  if (!correct) return null;

  const reading = (w.reading || "").trim();
  let idx = ex.indexOf(correct);
  let matchLen = correct.length;

  if (idx < 0 && reading && reading !== correct) {
    idx = ex.indexOf(reading);
    matchLen = reading.length;
  }
  if (idx < 0) return null;

  const prompt = `${ex.slice(0, idx)}${EXAMPLE_BLANK}${ex.slice(idx + matchLen)}`;

  const candidates = shuffle(pool.filter((x) => x.id !== w.id));
  const distractors: string[] = [];
  for (const x of candidates) {
    const s = quizPromptSurface(x);
    if (!s || s === correct || distractors.includes(s)) continue;
    distractors.push(s);
    if (distractors.length >= distractorCount) break;
  }
  if (distractors.length < distractorCount) return null;

  return {
    prompt,
    correctAnswer: correct,
    choices: shuffle([correct, ...distractors]),
  };
}

/** 뜻(한국어)을 보고 단어 표기(한자 또는 읽기) 객관식 */
export function buildMeaningToSurfaceQuestion(
  w: WordQuizRow,
  pool: WordQuizRow[],
  distractorCount = 3
): { prompt: string; correctAnswer: string; choices: string[] } | null {
  const meaning = (w.meaning || "").trim();
  const correct = quizPromptSurface(w);
  if (!meaning || !correct || pool.length < distractorCount + 1) return null;

  const candidates = shuffle(pool.filter((x) => x.id !== w.id));
  const distractors: string[] = [];
  for (const x of candidates) {
    const s = quizPromptSurface(x);
    if (!s || s === correct || distractors.includes(s)) continue;
    distractors.push(s);
    if (distractors.length >= distractorCount) break;
  }
  if (distractors.length < distractorCount) return null;

  return {
    prompt: meaning,
    correctAnswer: correct,
    choices: shuffle([correct, ...distractors]),
  };
}

export function buildKanjiMcQuestion(
  w: WordQuizRow,
  pool: WordQuizRow[],
  kind: KanjiMcKind,
  distractorCount = 3
): { prompt: string; correctAnswer: string; choices: string[] } | null {
  if (pool.length < distractorCount + 1) return null;
  const field = kind === "meaning" ? "meaning" : "reading";
  const correct = (w[field] || "").trim();
  if (!correct) return null;

  const candidates = shuffle(pool.filter((x) => x.id !== w.id));
  const distractors: string[] = [];
  for (const x of candidates) {
    const s = (x[field] || "").trim();
    if (!s || s === correct || distractors.includes(s)) continue;
    distractors.push(s);
    if (distractors.length >= distractorCount) break;
  }
  if (distractors.length < distractorCount) return null;

  const choices = shuffle([correct, ...distractors]);
  return {
    prompt: quizPromptSurface(w),
    correctAnswer: correct,
    choices,
  };
}

export function randomMcKind(): KanjiMcKind {
  return Math.random() < 0.5 ? "meaning" : "reading";
}

/** 선호 유형으로 시도한 뒤, 같은 단어에 대해 다른 유형 순으로 폴백 */
export function buildQuizQuestionForWord(
  w: WordQuizRow,
  preferred: QuizType,
  pool: WordQuizRow[],
  distractorCount = 3
): QuizQuestion | null {
  const rest = QUIZ_TYPES.filter((t) => t !== preferred);
  const tryOrder: QuizType[] = [preferred, ...shuffle(rest)];

  for (const t of tryOrder) {
    let built: { prompt: string; correctAnswer: string; choices: string[] } | null =
      null;
    switch (t) {
      case "kanji-meaning":
        built = buildKanjiMcQuestion(w, pool, "meaning", distractorCount);
        break;
      case "kanji-reading":
        built = buildKanjiMcQuestion(w, pool, "reading", distractorCount);
        break;
      case "meaning-word":
        built = buildMeaningToSurfaceQuestion(w, pool, distractorCount);
        break;
    }
    if (built) {
      return {
        id: `${w.id}-${t}`,
        wordId: w.id,
        type: t,
        prompt: built.prompt,
        correctAnswer: built.correctAnswer,
        choices: built.choices,
      };
    }
  }
  return null;
}
