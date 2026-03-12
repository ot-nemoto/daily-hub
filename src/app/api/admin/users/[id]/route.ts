import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: { role?: unknown; isActive?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { role, isActive } = body;

  if (role !== undefined && !Object.values(Role).includes(role as Role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (isActive !== undefined && typeof isActive !== "boolean") {
    return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
  }

  if (role === undefined && isActive === undefined) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  // 自分自身の ADMIN ロールを降格しようとした場合は 403
  if (id === session.user.id && role !== undefined && role !== "ADMIN") {
    return NextResponse.json(
      { error: "Cannot demote yourself from ADMIN" },
      { status: 403 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(role !== undefined && { role: role as Role }),
      ...(isActive !== undefined && { isActive: isActive as boolean }),
    },
  });

  return NextResponse.json({ id: updated.id });
}
