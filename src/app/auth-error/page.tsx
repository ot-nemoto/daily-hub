import { SignOutButton } from "@clerk/nextjs";

export const metadata = {
  title: "ログインエラー | Daily Hub",
};

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm text-center">
        <h1 className="mb-2 text-lg font-semibold text-zinc-900">ログインできません</h1>
        <p className="mb-6 text-sm text-zinc-600">
          このアカウントはすでに別のユーザーに紐付けられています。
          <br />
          一度サインアウトして、正しいアカウントでログインしてください。
        </p>
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
