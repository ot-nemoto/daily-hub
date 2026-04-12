import { type Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { ForbiddenError, NotFoundError } from "./errors";

export async function updateUserAdmin(input: {
  id: string;
  currentUserId: string;
  role?: Role;
  isActive?: boolean;
}): Promise<{ id: string }> {
  const { id, currentUserId, role, isActive } = input;

  if (role === undefined && isActive === undefined) {
    throw new Error("At least one of role or isActive must be specified");
  }

  // 自分自身の ADMIN ロールを降格しようとした場合は禁止
  if (id === currentUserId && role !== undefined && role !== "ADMIN") {
    throw new ForbiddenError("Cannot demote yourself from ADMIN");
  }
  // 自分自身の isActive を変更しようとした場合は禁止
  if (id === currentUserId && isActive !== undefined) {
    throw new ForbiddenError("Cannot change your own active status");
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("User not found");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(role !== undefined && { role }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  return { id: updated.id };
}

export async function deleteUser(input: {
  id: string;
  currentUserId: string;
}): Promise<void> {
  const { id, currentUserId } = input;

  // 自分自身の削除は禁止
  if (id === currentUserId) {
    throw new ForbiddenError("Cannot delete yourself");
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("User not found");
  }

  // FK制約の順序でカスケード削除
  // 本人の日報に他ユーザーが付けたコメントと、本人が書いたコメントを両方削除
  await prisma.$transaction([
    prisma.comment.deleteMany({
      where: { OR: [{ report: { authorId: id } }, { authorId: id }] },
    }),
    prisma.report.deleteMany({ where: { authorId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);
}

export async function generateApiKey(input: {
  id: string;
}): Promise<{ apiKey: string }> {
  const { id } = input;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const apiKey = crypto.randomUUID();
  await prisma.user.update({
    where: { id },
    data: { apiKey },
  });
  return { apiKey };
}

export async function revokeApiKey(input: {
  id: string;
}): Promise<void> {
  const { id } = input;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError("User not found");
  }

  await prisma.user.update({
    where: { id },
    data: { apiKey: null },
  });
}

export async function updateMe(input: {
  id: string;
  name: string;
}): Promise<{ id: string; name: string; email: string }> {
  const { id, name } = input;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { name },
    select: { id: true, name: true, email: true },
  });
  return updated;
}
