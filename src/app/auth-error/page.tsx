import { SignOutButton } from "@clerk/nextjs";

export const metadata = {
  title: "ログインエラー | Daily Hub",
};

const MESSAGES: Record<string, { title: string; description: string }> = {
  inactive: {
    title: "アカウントが無効化されています",
    description:
      "このアカウントは管理者によって無効化されています。\n詳細は管理者にお問い合わせください。",
  },
  default: {
    title: "ログインできません",
    description:
      "このアカウントはすでに別のユーザーに紐付けられています。\n一度サインアウトして、正しいアカウントでログインしてください。",
  },
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const { title, description } = MESSAGES[reason ?? ""] ?? MESSAGES.default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm text-center">
        <h1 className="mb-2 text-lg font-semibold text-zinc-900">{title}</h1>
        <p className="mb-6 text-sm text-zinc-600 whitespace-pre-line">{description}</p>
        <SignOutButton redirectUrl="/login">
          <button
            type="button"
            className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
          >
            サインアウト
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
