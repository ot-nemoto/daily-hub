"use client";

import Link from "next/link";
import { useState } from "react";

export type SearchableReport = {
  id: string;
  date: string;
  authorName: string;
  workContent: string;
  tomorrowPlan: string;
  notes: string;
  commentCount: number;
  isAuthor: boolean;
};

type Props = {
  reports: SearchableReport[];
  /* カード上段に出すメイン項目: daily はユーザー名、monthly は日付 */
  primary: "authorName" | "date";
  /* 日報が1件もない場合のメッセージ（検索0件とは区別する） */
  emptyMessage: string;
};

function matches(report: SearchableReport, query: string) {
  const q = query.toLowerCase();
  return (
    report.authorName.toLowerCase().includes(q) ||
    report.workContent.toLowerCase().includes(q) ||
    report.tomorrowPlan.toLowerCase().includes(q) ||
    report.notes.toLowerCase().includes(q)
  );
}

export function ReportSearchList({ reports, primary, emptyMessage }: Props) {
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const filtered = trimmed ? reports.filter((r) => matches(r, trimmed)) : reports;

  if (reports.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ユーザー名・日報内容で検索"
          aria-label="日報を検索"
          className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">該当する日報がありません</p>
        </div>
      ) : (
        filtered.map((report) => (
          <div key={report.id} className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                {primary === "authorName" ? (
                  <>
                    <p className="text-xs text-zinc-400">{report.date}</p>
                    <p className="font-medium text-zinc-900">{report.authorName}</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-zinc-900">{report.date}</p>
                    <p className="text-xs text-zinc-400">{report.authorName}</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {report.commentCount > 0 && (
                  <span className="text-xs text-zinc-400">💬 {report.commentCount}</span>
                )}
                {report.isAuthor && (
                  <Link
                    href={`/reports/${report.id}/edit`}
                    className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    編集
                  </Link>
                )}
                <Link
                  href={`/reports/${report.id}`}
                  className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700"
                >
                  詳細
                </Link>
              </div>
            </div>
            <dl>
              <div>
                <dt className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                  感想/課題/問題点
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-900">
                  {report.notes}
                </dd>
              </div>
            </dl>
          </div>
        ))
      )}
    </div>
  );
}
