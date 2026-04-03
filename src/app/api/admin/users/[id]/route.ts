import { type NextRequest, NextResponse } from "next/server";

import { Role } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { deleteUser, updateUserAdmin } from "@/lib/users";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
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

  try {
    const updated = await updateUserAdmin({
      id,
      currentUserId: session.user.id,
      ...(role !== undefined && { role: role as Role }),
      ...(isActive !== undefined && { isActive: isActive as boolean }),
    });
    return NextResponse.json({ id: updated.id });
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 });
    throw e;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await deleteUser({ id, currentUserId: session.user.id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 });
    throw e;
  }
}
