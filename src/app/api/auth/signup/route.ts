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

  // 招待トークンの検証
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
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    // 招待を使用済みにする
    if (invitationId) {
      await prisma.invitation.update({
        where: { id: invitationId },
        data: { usedAt: new Date() },
      });
    }

    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (error) {
    // 同時リクエストによる競合（DB unique 制約違反）を 409 にマッピング
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    throw error;
  }
}
