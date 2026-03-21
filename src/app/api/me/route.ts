import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateMeSchema = z
  .object({
    name: z.string().min(1).max(100),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = UpdateMeSchema.safeParse(body);
  if (!result.success) {
    const flat = result.error.flatten();
    const message = flat.formErrors[0] ?? Object.values(flat.fieldErrors).flat()[0] ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { name } = result.data;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json(updated);
}
