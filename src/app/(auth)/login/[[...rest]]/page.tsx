import { SignIn } from "@clerk/nextjs";

export const metadata = {
  title: "ログイン",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <SignIn />
    </div>
  );
}
