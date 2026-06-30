"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getReportComments, type ReportComment } from "@/app/reports/[id]/actions";
import { CommentDeleteButton } from "@/app/reports/[id]/CommentDeleteButton";
import { CommentForm } from "@/app/reports/[id]/CommentForm";
import { ReportEditForm } from "@/app/reports/[id]/edit/ReportEditForm";
import type { SearchableReport } from "./ReportSearchList";

type Props = {
  report: SearchableReport;
  initialMode?: "detail" | "edit";
  currentUserId: string;
  onClose: () => void;
};

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">{value}</dd>
    </div>
  );
}

export function ReportDetailModal({
  report,
  initialMode = "detail",
  currentUserId,
  onClose,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"detail" | "edit">(initialMode);
  const [fields, setFields] = useState({
    workContent: report.workContent,
    tomorrowPlan: report.tomorrowPlan,
    notes: report.notes,
  });
  const [comments, setComments] = useState<ReportComment[] | null>(null);
  const [commentsError, setCommentsError] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    getReportComments(report.id)
      .then((res) => {
        if (!active) return;
        if (res.comments) {
          setComments(res.comments);
          setCommentsError(false);
        } else {
          setCommentsError(true);
        }
      })
      .catch(() => {
        if (active) setCommentsError(true);
      });
    return () => {
      active = false;
    };
  }, [report.id]);

  function handleEditSuccess(values: { workContent: string; tomorrowPlan: string; notes: string }) {
    setFields(values);
    setMode("detail");
    router.refresh();
  }

  async function handleCommentCreated() {
    const res = await getReportComments(report.id);
    if (res.comments) {
      setComments(res.comments);
      setCommentsError(false);
    } else {
      setCommentsError(true);
    }
    router.refresh();
  }

  function handleCommentDeleted(commentId: string) {
    setComments((prev) => (prev ? prev.filter((c) => c.id !== commentId) : prev));
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-dialog-title"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-zinc-50 shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
          <div>
            <p className="text-xs text-zinc-500">{report.date}</p>
            <h2 id="report-dialog-title" className="text-base font-bold text-zinc-900">
              {mode === "edit" ? "日報編集" : `${report.authorName} の日報`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="cursor-pointer rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="p-6">
          {mode === "edit" ? (
            <ReportEditForm
              id={report.id}
              defaultValues={fields}
              onSuccess={handleEditSuccess}
              onCancel={() => setMode("detail")}
            />
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-end">
                  {report.isAuthor && (
                    <button
                      type="button"
                      onClick={() => setMode("edit")}
                      className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      編集
                    </button>
                  )}
                </div>
                <dl className="space-y-6">
                  <Field label="本日の作業" value={fields.workContent} />
                  <Field label="明日の予定" value={fields.tomorrowPlan} />
                  {fields.notes && <Field label="感想/課題/問題点" value={fields.notes} />}
                </dl>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-medium text-zinc-900">
                  コメント{comments ? `（${comments.length}件）` : ""}
                </h3>
                {commentsError ? (
                  <p className="text-sm text-red-600">コメントの取得に失敗しました</p>
                ) : comments === null ? (
                  <p className="text-sm text-zinc-400">読み込み中...</p>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-zinc-500">コメントはまだありません</p>
                ) : (
                  <ul className="space-y-4">
                    {comments.map((c) => (
                      <li key={c.id} className="rounded-md bg-zinc-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-zinc-700">{c.authorName}</p>
                          {currentUserId === c.authorId && (
                            <CommentDeleteButton
                              reportId={report.id}
                              commentId={c.id}
                              onDeleted={() => handleCommentDeleted(c.id)}
                            />
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
                <CommentForm reportId={report.id} onCreated={handleCommentCreated} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
