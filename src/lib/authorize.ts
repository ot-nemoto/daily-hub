import { compare } from "bcryptjs";

import type { Role } from "../generated/prisma/client";
import { prisma } from "./prisma";

export async function authorizeCredentials(
  email: string | undefined,
  password: string | undefined,
): Promise<{ id: string; name: string; email: string; role: Role; isActive: boolean } | null> {
  if (!email || !password) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  if (!user.isActive) return null;

  const isValid = await compare(password, user.passwordHash);
  if (!isValid) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive };
}
