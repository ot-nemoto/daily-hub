import { compare } from "bcryptjs";

import { prisma } from "./prisma";

export async function authorizeCredentials(
  email: string | undefined,
  password: string | undefined,
): Promise<{ id: string; name: string; email: string } | null> {
  if (!email || !password) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const isValid = await compare(password, user.passwordHash);
  if (!isValid) return null;

  return { id: user.id, name: user.name, email: user.email };
}
