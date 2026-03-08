import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommentDeleteButton } from "./CommentDeleteButton";
import { CommentForm } from "./CommentForm";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([auth(), params]);

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true } },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!report) notFound();

  const isAuthor = session?.user?.id === report.authorId;
  const dateStr = report.date.toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-zinc-50 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">{dateStr}</p>
              <h1 className="text-xl font-bold text-zinc-900">
                {report.author.name} の日報
              </h1>
            </div>
            {isAuthor && (
              <Link
                href={`/reports/${id}/edit`}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                編集
              </Link>
            )}
          </div>

          <dl className="space-y-6">
            <div>
              <dt className="text-sm font-medium text-zinc-500">本日の作業内容</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">
                {report.workContent}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-zinc-500">明日の予定</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">
                {report.tomorrowPlan}
              </dd>
            </div>
            {report.notes && (
              <div>
                <dt className="text-sm font-medium text-zinc-500">所感・連絡事項</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">
                  {report.notes}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-sm">
          <h2 className="mb-4 font-medium text-zinc-900">
            コメント（{report.comments.length}件）
          </h2>
          {report.comments.length === 0 ? (
            <p className="text-sm text-zinc-500">コメントはまだありません</p>
          ) : (
            <ul className="space-y-4">
              {report.comments.map((c) => (
                <li key={c.id} className="rounded-md bg-zinc-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-zinc-700">{c.author.name}</p>
                    {session?.user?.id === c.author.id && (
                      <CommentDeleteButton reportId={id} commentId={c.id} />
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">{c.body}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {new Date(c.createdAt).toLocaleString("ja-JP")}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <CommentForm reportId={id} />
        </div>
      </div>
    </div>
  );
}
