import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@/generated/prisma/client";
import { redirect } from "next/navigation";

import { prisma } from "./prisma";

export type Session = {
  user: {
    id: string;
    name: string;
    role: string;
    isActive: boolean;
  };
};

export async function getSession(options?: { redirectOnInactive?: boolean }): Promise<Session | null> {
  const redirectOnInactive = options?.redirectOnInactive ?? false;

  // 非本番環境: MOCK_USER_ID / MOCK_USER_EMAIL が設定されている場合は DB から直接セッションを返す
  if (process.env.NODE_ENV !== "production") {
    if (process.env.MOCK_USER_ID) {
      const user = await prisma.user.findUnique({
        where: { id: process.env.MOCK_USER_ID },
        select: { id: true, name: true, role: true, isActive: true },
      });
      if (!user) {
        console.error(`[MOCK] MOCK_USER_ID="${process.env.MOCK_USER_ID}" に対応するユーザーが DB に存在しません`);
        return null;
      }
      if (!user.isActive) {
        if (redirectOnInactive) redirect("/auth-error?reason=inactive");
        return null;
      }
      return { user };
    }

    if (process.env.MOCK_USER_EMAIL) {
      const user = await prisma.user.findUnique({
        where: { email: process.env.MOCK_USER_EMAIL },
        select: { id: true, name: true, role: true, isActive: true },
      });
      if (!user) {
        console.error(`[MOCK] MOCK_USER_EMAIL="${process.env.MOCK_USER_EMAIL}" に対応するユーザーが DB に存在しません`);
        return null;
      }
      if (!user.isActive) {
        if (redirectOnInactive) redirect("/auth-error?reason=inactive");
        return null;
      }
      return { user };
    }
  }

  const { userId } = await auth();
  if (!userId) return null;

  // まず clerkId で検索
  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, name: true, role: true, isActive: true },
  });

  // 見つからない場合、メールアドレスで突合して初回紐付け or 新規作成
  if (!user) {
    const clerkUser = await currentUser();
    const email = clerkUser?.primaryEmailAddress?.emailAddress;
    if (!email) return null;

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, role: true, isActive: true, clerkId: true },
    });

    if (!existingUser) {
      // DB に存在しない新規サインアップユーザーを自動作成
      // 並行リクエストによるレースコンディション対策: P2002 をキャッチして既存レコードを返す
      // DB にユーザーが0人の場合は初回ログインとみなし ADMIN として作成する
      const userCount = await prisma.user.count();
      const role = userCount === 0 ? "ADMIN" : "MEMBER";
      const name = clerkUser?.fullName ?? clerkUser?.firstName ?? email;
      try {
        user = await prisma.user.create({
          data: { clerkId: userId, email, name, role },
          select: { id: true, name: true, role: true, isActive: true },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, role: true, isActive: true },
          });
          if (!user) return null;
        } else {
          throw e;
        }
      }
    } else if (existingUser.clerkId) {
      redirect("/auth-error"); // 既に別の Clerk ID に紐付き済み
    } else {
      // clerkId: null の場合のみ更新（並行リクエストによる上書き防止）
      const { count } = await prisma.user.updateMany({
        where: { email, clerkId: null },
        data: { clerkId: userId },
      });
      if (count === 0) {
        // 別リクエストが先に紐付けを完了した場合は再取得して返す
        user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, role: true, isActive: true },
        });
        if (!user) return null;
      } else {
        user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, role: true, isActive: true },
        });
        if (!user) return null;
      }
    }
  }

  // isActive=false のユーザー: ページ（redirectOnInactive=true）はリダイレクト、API は null を返す
  if (!user.isActive) {
    if (redirectOnInactive) redirect("/auth-error?reason=inactive");
    return null;
  }

  return { user };
}
