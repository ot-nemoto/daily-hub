"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { updateMe as libUpdateMe } from "@/lib/users";

export async function updateMe(input: {
  name: string;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return redirect("/login");

  try {
    await libUpdateMe({ id: session.user.id, name: input.name });
    revalidatePath("/settings");
    return {};
  } catch (e) {
    if (e instanceof NotFoundError) return { error: "ユーザーが見つかりません" };
    throw e;
  }
}
