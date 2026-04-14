import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/login(.*)", "/auth-error", "/api/reports(.*)", "/api/swagger.json"]);

export default clerkMiddleware(async (auth, request) => {
  // 非本番環境: MOCK_USER_ID / MOCK_USER_EMAIL が設定されている場合はバイパス
  if (process.env.NODE_ENV !== "production" && (process.env.MOCK_USER_ID || process.env.MOCK_USER_EMAIL)) {
    return NextResponse.next();
  }

  // 認証チェック: 未ログインユーザーを /login にリダイレクト
  // ロールベースの認可チェックは Edge Runtime で DB アクセスができないため
  // 各ページ・API ルートで getSession() を使って実施する
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
