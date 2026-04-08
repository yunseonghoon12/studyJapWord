import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 학습 진행 초기화: "공부에서 연 단어" 상태만 초기화 */
export async function POST() {
  const result = await prisma.userWord.updateMany({
    where: { seenInStudy: true },
    data: { seenInStudy: false },
  });

  return NextResponse.json({
    ok: true,
    clearedSeenInStudy: result.count,
  });
}
