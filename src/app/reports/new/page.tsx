import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { ReportNewForm } from "./ReportNewForm";

export const metadata = {
  title: "日報作成 | Daily Hub",
};

export default async function ReportNewPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role === "VIEWER") redirect("/reports/daily");

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-bold text-zinc-900">日報作成</h1>
        <ReportNewForm />
      </div>
    </div>
  );
}
