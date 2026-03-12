import type { NextAuthConfig } from "next-auth";

// Edge Runtime 互換の設定（bcrypt・Prisma に依存しない）
// src/proxy.ts はこの設定のみを参照する
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isAdminPath = request.nextUrl.pathname.startsWith("/admin");
      if (isAdminPath) {
        return auth?.user?.role === "ADMIN";
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
