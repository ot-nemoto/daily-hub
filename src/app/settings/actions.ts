"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { updateMe as libUpdateMe } from "@/lib/users";

const UpdateMeSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function updateMe(input: {
  name: string;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return redirect("/login");

  const parsed = UpdateMeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  try {
    await libUpdateMe({ id: session.user.id, name: parsed.data.name });
    revalidatePath("/settings");
    return {};
  } catch (e) {
    if (e instanceof NotFoundError) return { error: "ユーザーが見つかりません" };
    throw e;
  }
}
