import type { Metadata } from "next";
import { AttendanceProvider } from "@/components/attendance-context";
import { JlptTwPreflight } from "@/components/jlpt-tw-preflight";
import { VocabularyWarmup } from "@/components/vocabulary-warmup";
import { appFont } from "@/lib/study-card-font";
import "./globals.css";

export const metadata: Metadata = {
  title: "일본어 단어",
  description: "Japanese vocabulary — study and quiz",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${appFont.className} relative min-h-dvh antialiased`}
      >
        <div
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
          aria-hidden
        >
          {/* 참고 사진: 스케일+블러로 질감·클러터 완화 */}
          <div
            className="absolute -inset-[14%] scale-110 transform bg-[url('/home-bg.png')] bg-cover bg-center bg-no-repeat opacity-[0.93]"
            style={{ filter: "blur(26px)" }}
          />
          {/* 파스텔 톤 + 낮은 대비 */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/85 via-white/78 to-sky-100/82" />
          {/* 중앙은 더 밝게 — 카드·본문용 여백 */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_88%_78%_at_50%_48%,rgba(255,251,252,0.92)_0%,rgba(255,255,255,0.45)_42%,transparent_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/25 via-transparent to-rose-50/20" />
        </div>
        <JlptTwPreflight />
        <AttendanceProvider>
          <VocabularyWarmup />
          {children}
        </AttendanceProvider>
      </body>
    </html>
  );
}
