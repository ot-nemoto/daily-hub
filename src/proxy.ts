import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth.config";

// Edge 互換の設定のみ使用（bcrypt・Prisma に依存しない）
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    // 認証不要なパスを除いた全ルートに適用
    // 除外: /login, /signup, /api/auth/**, _next/static, _next/image, favicon.ico
    "/((?!login|signup|api/auth|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
