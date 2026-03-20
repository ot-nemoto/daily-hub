import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const CreateInvitationSchema = z.object({
  email: z.string().email().optional(),
});

function getBaseUrl(request: Request): string {
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = CreateInvitationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { email } = result.data;
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const baseUrl = getBaseUrl(request);

  const invitation = await prisma.invitation.create({
    data: {
      token,
      email: email ?? null,
      expiresAt,
      invitedById: session.user.id as string,
    },
  });

  return NextResponse.json(
    {
      id: invitation.id,
      token: invitation.token,
      inviteUrl: `${baseUrl}/signup?token=${invitation.token}`,
      expiresAt: invitation.expiresAt,
    },
    { status: 201 },
  );
}

export async function GET(request: Request) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invitations = await prisma.invitation.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      email: true,
      expiresAt: true,
      usedAt: true,
      createdAt: true,
    },
  });

  const baseUrl = getBaseUrl(request);

  const result = invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    inviteUrl: `${baseUrl}/signup?token=${inv.token}`,
    expiresAt: inv.expiresAt,
    usedAt: inv.usedAt,
    createdAt: inv.createdAt,
  }));

  return NextResponse.json(result);
}
