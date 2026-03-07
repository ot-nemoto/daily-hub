import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "ログイン | Daily Hub",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-center text-2xl font-bold tracking-tight text-zinc-900">
          Daily Hub
        </h1>
        <p className="mb-6 text-center text-sm text-zinc-500">ログイン</p>
        <LoginForm />
      </div>
    </div>
  );
}
