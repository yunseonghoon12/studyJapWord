"use client";

export type StudyCardVisibility = {
  hideKanji: boolean;
  hideReading: boolean;
  hideMeaning: boolean;
};

const KEY = "wordStudy.studyCardVisibility";

export const DEFAULT_STUDY_CARD_VISIBILITY: StudyCardVisibility = {
  hideKanji: false,
  hideReading: false,
  hideMeaning: false,
};

export function getStudyCardVisibility(): StudyCardVisibility {
  if (typeof window === "undefined") return DEFAULT_STUDY_CARD_VISIBILITY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STUDY_CARD_VISIBILITY;
    const parsed = JSON.parse(raw) as Partial<StudyCardVisibility>;
    return {
      hideKanji: parsed.hideKanji === true,
      hideReading: parsed.hideReading === true,
      hideMeaning: parsed.hideMeaning === true,
    };
  } catch {
    return DEFAULT_STUDY_CARD_VISIBILITY;
  }
}

export function setStudyCardVisibility(value: StudyCardVisibility): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(value));
}

