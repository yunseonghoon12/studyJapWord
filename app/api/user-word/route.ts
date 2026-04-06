import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Body = {
  wordId?: string;
  wrong?: boolean;
  /** 정답 1회 (오답과 동시에 보내지 마세요) */
  right?: boolean;
  isExcluded?: boolean;
  /** default true: updates lastSeenAt */
  seen?: boolean;
  /** 단어 공부에서 호출하면 메인 시험 대상에 포함 */
  fromStudy?: boolean;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.wordId || typeof body.wordId !== "string") {
    return NextResponse.json({ error: "wordId is required" }, { status: 400 });
  }

  const word = await prisma.word.findUnique({ where: { id: body.wordId } });
  if (!word) {
    return NextResponse.json({ error: "Word not found" }, { status: 404 });
  }

  const now = new Date();
  const touchSeen = body.seen !== false;

  const fromStudy = body.fromStudy === true;

  const record = await prisma.userWord.upsert({
    where: { wordId: body.wordId },
    create: {
      wordId: body.wordId,
      wrongCount: body.wrong ? 1 : 0,
      correctCount: body.right ? 1 : 0,
      isExcluded: body.isExcluded === true,
      lastSeenAt: now,
      seenInStudy: fromStudy,
    },
    update: {
      ...(body.wrong ? { wrongCount: { increment: 1 } } : {}),
      ...(body.right ? { correctCount: { increment: 1 } } : {}),
      ...(body.isExcluded !== undefined ? { isExcluded: body.isExcluded } : {}),
      ...(touchSeen ? { lastSeenAt: now } : {}),
      ...(fromStudy ? { seenInStudy: true } : {}),
    },
  });

  return NextResponse.json({ userWord: record });
}
