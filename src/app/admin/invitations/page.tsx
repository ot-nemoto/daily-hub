"use client";

import { useCallback, useEffect, useState } from "react";

import { parseApiError } from "@/lib/apiError";

type Invitation = {
  id: string;
  email: string | null;
  inviteUrl: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    const res = await fetch("/api/admin/invitations");
    if (res.ok) {
      setInvitations(await res.json());
    }
  }, []);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email || undefined }),
    });

    setSubmitting(false);

    if (res.ok) {
      setEmail("");
      loadInvitations();
    } else {
      setError(await parseApiError(res, "招待リンクの発行に失敗しました。"));
    }
  }

  async function copyToClipboard(id: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-10">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h1 className="mb-4 text-lg font-bold text-zinc-900">招待リンク発行</h1>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス（任意）"
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "発行中..." : "招待リンクを発行"}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-zinc-900">招待一覧</h2>
          {invitations.length === 0 ? (
            <p className="text-sm text-zinc-500">招待はまだありません。</p>
          ) : (
            <div className="space-y-3">
              {invitations.map((inv) => {
                const expired = new Date(inv.expiresAt) < new Date();
                const used = !!inv.usedAt;
                const status = used ? "使用済み" : expired ? "期限切れ" : "有効";
                const statusColor = used
                  ? "text-zinc-400"
                  : expired
                    ? "text-red-500"
                    : "text-green-600";

                return (
                  <div
                    key={inv.id}
                    className="flex items-start justify-between gap-4 rounded-md border border-zinc-100 p-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${statusColor}`}>
                          {status}
                        </span>
                        {inv.email && (
                          <span className="text-xs text-zinc-500">{inv.email}</span>
                        )}
                      </div>
                      <p className="truncate text-xs text-zinc-400">{inv.inviteUrl}</p>
                      <p className="text-xs text-zinc-400">
                        有効期限: {new Date(inv.expiresAt).toLocaleString("ja-JP")}
                      </p>
                    </div>
                    {!used && !expired && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(inv.id, inv.inviteUrl)}
                        className="shrink-0 rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                      >
                        {copiedId === inv.id ? "コピー済み" : "コピー"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
