/** 객관식 시험 유형 */
export type QuizType =
  | "kanji-meaning"
  | "kanji-reading"
  | "example-blank"
  | "meaning-word";

export type QuizQuestion = {
  id: string;
  wordId: string;
  type: QuizType;
  prompt: string;
  correctAnswer: string;
  choices: string[];
};

export const QUIZ_TYPES: QuizType[] = [
  "kanji-meaning",
  "kanji-reading",
  "example-blank",
  "meaning-word",
];

export function quizTypeLabel(type: QuizType): string {
  switch (type) {
    case "kanji-meaning":
      return "뜻 고르기";
    case "kanji-reading":
      return "읽기 고르기";
    case "example-blank":
      return "예문 빈칸 고르기";
    case "meaning-word":
      return "뜻보고 단어 고르기";
    default:
      return "";
  }
}

/** 프롬프트 아래 짧은 안내 문구 */
export function quizTypeInstruction(type: QuizType): string {
  switch (type) {
    case "kanji-meaning":
      return "뜻을 고르세요.";
    case "kanji-reading":
      return "읽기를 고르세요.";
    case "example-blank":
      return "빈칸에 알맞은 단어를 고르세요.";
    case "meaning-word":
      return "뜻에 맞는 단어(표기)를 고르세요.";
    default:
      return "";
  }
}
