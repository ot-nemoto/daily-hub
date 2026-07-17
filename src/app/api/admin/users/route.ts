import { type NextRequest, NextResponse } from "next/server";
import { adminForbidden, serializeUser, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { getUsers } from "@/lib/users";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return adminForbidden();

  const users = await getUsers();
  return NextResponse.json({ users: users.map(serializeUser) });
}
