import type { NextAuthConfig } from "next-auth";

// Edge Runtime 互換の設定（bcrypt・Prisma に依存しない）
// src/proxy.ts はこの設定のみを参照する
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
