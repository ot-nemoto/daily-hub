import { prisma } from "@/lib/prisma";
import { SignupForm } from "./SignupForm";

export const metadata = {
  title: "サインアップ | Daily Hub",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let defaultEmail: string | null = null;
  let tokenValid = false;

  if (token) {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      select: { email: true, usedAt: true, expiresAt: true },
    });
    if (invitation && !invitation.usedAt && invitation.expiresAt > new Date()) {
      tokenValid = true;
      defaultEmail = invitation.email ?? null;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-center text-2xl font-bold tracking-tight text-zinc-900">
          Daily Hub
        </h1>
        <p className="mb-6 text-center text-sm text-zinc-500">サインアップ</p>
        {token && !tokenValid ? (
          <p className="text-center text-sm text-red-600">
            この招待リンクは無効または期限切れです。
          </p>
        ) : (
          <SignupForm token={tokenValid ? token : undefined} defaultEmail={defaultEmail} />
        )}
      </div>
    </div>
  );
}
