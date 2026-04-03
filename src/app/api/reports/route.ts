import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { ConflictError } from "@/lib/errors";
import { createReport } from "@/lib/reports";

const ReportSchema = z.object({
  date: z.string().date(),
  workContent: z.string().min(1).max(5000),
  tomorrowPlan: z.string().min(1).max(5000),
  notes: z.string().max(5000).optional().default(""),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = ReportSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { date, workContent, tomorrowPlan, notes } = result.data;
  const dateObj = new Date(`${date}T00:00:00.000Z`);

  try {
    const report = await createReport({
      date: dateObj,
      workContent,
      tomorrowPlan,
      notes,
      authorId: session.user.id,
    });
    return NextResponse.json({ id: report.id }, { status: 201 });
  } catch (e) {
    if (e instanceof ConflictError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    throw e;
  }
}
