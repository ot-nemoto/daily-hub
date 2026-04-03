"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type Role } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { deleteUser as libDeleteUser, updateUserAdmin as libUpdateUserAdmin } from "@/lib/users";

export async function updateUserAdmin(input: {
  id: string;
  role?: Role;
  isActive?: boolean;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (session?.user.role !== "ADMIN") return redirect("/");

  try {
    await libUpdateUserAdmin({
      id: input.id,
      currentUserId: session.user.id,
      role: input.role,
      isActive: input.isActive,
    });
    revalidatePath("/admin/users");
    return {};
  } catch (e) {
    if (e instanceof ForbiddenError) return { error: e.message };
    if (e instanceof NotFoundError) return { error: "ユーザーが見つかりません" };
    throw e;
  }
}

export async function deleteUser(input: {
  id: string;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (session?.user.role !== "ADMIN") return redirect("/");

  try {
    await libDeleteUser({ id: input.id, currentUserId: session.user.id });
    revalidatePath("/admin/users");
    return {};
  } catch (e) {
    if (e instanceof ForbiddenError) return { error: e.message };
    if (e instanceof NotFoundError) return { error: "ユーザーが見つかりません" };
    throw e;
  }
}
