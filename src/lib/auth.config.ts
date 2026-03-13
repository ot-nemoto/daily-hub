import type { NextAuthConfig } from "next-auth";

// Edge Runtime 互換の設定（bcrypt・Prisma に依存しない）
// src/proxy.ts はこの設定のみを参照する
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      const isAdminPath = pathname.startsWith("/admin");
      if (isAdminPath) {
        if (!auth?.user) return false; // 未ログイン → /login
        if (auth.user.role !== "ADMIN") {
          // ログイン済み非ADMIN → /
          return Response.redirect(new URL("/", request.nextUrl));
        }
        return true;
      }

      // VIEWER は日報作成・編集ページにアクセス不可 → /reports/daily にリダイレクト
      if (auth?.user?.role === "VIEWER") {
        const isWritePath =
          pathname === "/reports/new" || /^\/reports\/[^/]+\/edit$/.test(pathname);
        if (isWritePath) {
          return Response.redirect(new URL("/reports/daily", request.nextUrl));
        }
      }

      return !!auth?.user;
    },
    // ミドルウェアでも JWT → session のマッピングが必要
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = token.role as string;
      if (token.isActive !== undefined)
        session.user.isActive = token.isActive as boolean;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
