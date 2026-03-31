import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReportEditForm } from "./ReportEditForm";

export const metadata = {
  title: "日報編集 | Daily Hub",
};

export default async function ReportEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([getSession({ redirectOnInactive: true }), params]);

  const report = await prisma.report.findUnique({
    where: { id },
    select: {
      authorId: true,
      workContent: true,
      tomorrowPlan: true,
      notes: true,
    },
  });

  if (!report) notFound();
  if (report.authorId !== session?.user?.id) redirect(`/reports/${id}`);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-bold text-zinc-900">日報編集</h1>
        <ReportEditForm
          id={id}
          defaultValues={{
            workContent: report.workContent,
            tomorrowPlan: report.tomorrowPlan,
            notes: report.notes ?? "",
          }}
        />
      </div>
    </div>
  );
}
