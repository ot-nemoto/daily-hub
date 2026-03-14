import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <Header />
      <div className="min-h-screen bg-zinc-50 py-10">
        <div className="mx-auto max-w-xl space-y-2 px-4">
          <h1 className="text-lg font-bold text-zinc-900">個人設定</h1>
          <SettingsForm
            initialName={session.user.name ?? ""}
            email={session.user.email ?? ""}
          />
        </div>
      </div>
    </>
  );
}
