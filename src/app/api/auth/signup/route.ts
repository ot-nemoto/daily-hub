import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const SignupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  token: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = SignupSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { name, email, password, token } = result.data;

  // 招待トークンの事前検証（存在・期限・email照合）
  let invitationId: string | null = null;
  if (token) {
    const invitation = await prisma.invitation.findUnique({ where: { token } });
    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation token" }, { status: 400 });
    }
    if (invitation.usedAt) {
      return NextResponse.json({ error: "Invitation token already used" }, { status: 400 });
    }
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invitation token expired" }, { status: 400 });
    }
    if (invitation.email && invitation.email !== email) {
      return NextResponse.json({ error: "Email does not match invitation" }, { status: 400 });
    }
    invitationId = invitation.id;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // トランザクション内で招待の使用済みマークとユーザー作成を原子的に実行
    const user = await prisma.$transaction(async (tx) => {
      if (invitationId) {
        // usedAt: null の場合のみ更新（同時リクエストによる二重使用を防ぐ）
        const updated = await tx.invitation.updateMany({
          where: { id: invitationId, usedAt: null },
          data: { usedAt: new Date() },
        });
        if (updated.count === 0) {
          throw Object.assign(new Error("Invitation token already used"), { code: "ALREADY_USED" });
        }
      }
      return tx.user.create({ data: { name, email, passwordHash } });
    });

    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "ALREADY_USED") {
        return NextResponse.json({ error: "Invitation token already used" }, { status: 400 });
      }
      if (code === "P2002") {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }
    throw error;
  }
}
