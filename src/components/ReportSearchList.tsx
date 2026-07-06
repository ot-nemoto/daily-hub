"use client";

import { useState } from "react";

import { DISPLAY_FIELDS, useDisplayField } from "./DisplayFieldContext";
import { ReportDetailModal } from "./ReportDetailModal";

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
  currentUserId: string;
};

function matches(report: SearchableReport, query: string, includeAuthor: boolean) {
  const q = query.toLowerCase();
  return (
    (includeAuthor && report.authorName.toLowerCase().includes(q)) ||
    report.workContent.toLowerCase().includes(q) ||
    report.tomorrowPlan.toLowerCase().includes(q) ||
    report.notes.toLowerCase().includes(q)
  );
}

export function ReportSearchList({ reports, primary, emptyMessage, currentUserId }: Props) {
  const [query, setQuery] = useState("");
  const [displayFields] = useDisplayField();
  const [modal, setModal] = useState<{
    report: SearchableReport;
    mode: "detail" | "edit";
  } | null>(null);

  const includeAuthor = primary === "authorName";
  const trimmed = query.trim();
  const filtered = trimmed ? reports.filter((r) => matches(r, trimmed, includeAuthor)) : reports;

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
          placeholder={includeAuthor ? "ユーザー名・日報内容で検索" : "日報内容で検索"}
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
                  <button
                    type="button"
                    onClick={() => setModal({ report, mode: "edit" })}
                    className="cursor-pointer rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    編集
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModal({ report, mode: "detail" })}
                  className="cursor-pointer rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700"
                >
                  詳細
                </button>
              </div>
            </div>
            <dl className="space-y-3">
              {DISPLAY_FIELDS.filter((f) => displayFields.has(f.key)).map((f) => (
                <div key={f.key}>
                  <dt className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                    {f.label}
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-900">
                    {report[f.key]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))
      )}

      {modal && (
        <ReportDetailModal
          report={modal.report}
          initialMode={modal.mode}
          currentUserId={currentUserId}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
