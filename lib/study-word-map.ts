/** 단어 공부 클라이언트 / API 공통 응답 형태 */
export type StudyWordRow = {
  id: string;
  level: string;
  kanji: string | null;
  reading: string;
  meaning: string;
  example: string;
  exampleReading: string | null;
  exampleMeaning: string | null;
  wrongCount: number;
  correctCount: number;
};

type DbWord = {
  id: string;
  level: string;
  kanji: string | null;
  reading: string;
  meaning: string;
  example: string;
  exampleReading: string | null;
  exampleMeaning: string | null;
  userWord: { wrongCount: number; correctCount: number } | null;
};

export function mapDbWordToStudyRow(w: DbWord): StudyWordRow {
  const kanjiRaw = w.kanji?.trim();
  const reading = (w.reading || "").trim();
  const meaning =
    (w.meaning || "").trim() ||
    `〔${w.level}〕 ${reading || "—"}（뜻 보강）`;
  const example = (w.example || "").trim() || `${reading || "—"}。`;
  const exampleReading = (w.exampleReading || "").trim() || null;
  const exampleMeaning = (w.exampleMeaning || "").trim() || null;
  return {
    id: w.id,
    level: w.level,
    kanji: kanjiRaw || null,
    reading,
    meaning,
    example,
    exampleReading,
    exampleMeaning,
    wrongCount: w.userWord?.wrongCount ?? 0,
    correctCount: w.userWord?.correctCount ?? 0,
  };
}
