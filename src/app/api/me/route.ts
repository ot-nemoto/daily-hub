import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateMeSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  })
  .refine(
    (data) => {
      const hasCurrent = data.currentPassword !== undefined;
      const hasNew = data.newPassword !== undefined;
      return hasCurrent === hasNew;
    },
    { message: "currentPassword and newPassword must be provided together" }
  );

export async function PATCH(request: Request) {
  const session = await auth();
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

  const { name, currentPassword, newPassword } = result.data;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // パスワード変更の場合は現在のパスワードを検証
  if (currentPassword !== undefined && newPassword !== undefined) {
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }
  }

  const updateData: { name?: string; passwordHash?: string } = {};
  if (name !== undefined) updateData.name = name;
  if (newPassword !== undefined) updateData.passwordHash = await bcrypt.hash(newPassword, 10);

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json(updated);
}
