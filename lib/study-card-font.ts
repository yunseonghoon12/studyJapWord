import { M_PLUS_Rounded_1c } from "next/font/google";

/**
 * 앱 전역 + 단어 카드 공통 — 둥근 고딕 느낌.
 * `next/font` 에서는 japanese 서브셋이 없어 latin만 로드하고,
 * 한자·가나·한글은 아래 폴백으로 이어집니다.
 */
export const appFont = M_PLUS_Rounded_1c({
  weight: ["400", "500", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
  adjustFontFallback: true,
  fallback: [
    "Hiragino Maru Gothic ProN",
    "Hiragino Maru Gothic Pro",
    "Yu Gothic UI",
    "Meiryo",
    "Malgun Gothic",
    "Apple SD Gothic Neo",
    "sans-serif",
  ],
});

/** @deprecated `appFont` 와 동일 */
export const studyCardFont = appFont;
