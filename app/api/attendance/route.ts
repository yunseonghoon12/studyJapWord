import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDays(values: unknown): string[] | null {
  if (!Array.isArray(values)) return null;
  const out = values.filter(
    (v): v is string => typeof v === "string" && DAY_RE.test(v)
  );
  if (out.length !== values.length) return null;
  return [...new Set(out)];
}

/** 출석한 날짜 목록 (YYYY-MM-DD) */
export async function GET() {
  const rows = await prisma.attendanceDay.findMany({
    select: { day: true },
    orderBy: { day: "asc" },
  });
  return NextResponse.json({ days: rows.map((r) => r.day) });
}

type Body = {
  day?: string;
  /** 기존 브라우저 localStorage 일괄 이전용 */
  importDays?: string[];
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (Array.isArray(body.importDays)) {
    const days = validDays(body.importDays);
    if (!days || days.length > 2000) {
      return NextResponse.json({ error: "invalid importDays" }, { status: 400 });
    }
    if (days.length === 0) {
      const rows = await prisma.attendanceDay.findMany({
        select: { day: true },
        orderBy: { day: "asc" },
      });
      return NextResponse.json({ days: rows.map((r) => r.day) });
    }
    await prisma.attendanceDay.createMany({
      data: days.map((day) => ({ day })),
      skipDuplicates: true,
    });
    const rows = await prisma.attendanceDay.findMany({
      select: { day: true },
      orderBy: { day: "asc" },
    });
    return NextResponse.json({ days: rows.map((r) => r.day) });
  }

  const day = body.day;
  if (!day || typeof day !== "string" || !DAY_RE.test(day)) {
    return NextResponse.json({ error: "day (YYYY-MM-DD) required" }, { status: 400 });
  }

  await prisma.attendanceDay.upsert({
    where: { day },
    create: { day },
    update: {},
  });

  const rows = await prisma.attendanceDay.findMany({
    select: { day: true },
    orderBy: { day: "asc" },
  });
  return NextResponse.json({ days: rows.map((r) => r.day) });
}
