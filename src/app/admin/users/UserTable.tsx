"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastReportAt: string | null;
  submissionRate30d: number;
};

type DeleteDialog = { userId: string; userName: string };

export function UserTable({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog | null>(null);
  const [deleteNameInput, setDeleteNameInput] = useState("");
  const [deleteError, setDeleteError] = useState("");

  async function handleRoleChange(id: string, role: string) {
    setLoading(`role-${id}`);
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setLoading(null);
    router.refresh();
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    setLoading(`active-${id}`);
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setLoading(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteDialog) return;
    setDeleteError("");
    setLoading(`delete-${deleteDialog.userId}`);
    const res = await fetch(`/api/admin/users/${deleteDialog.userId}`, { method: "DELETE" });
    setLoading(null);
    if (!res.ok) {
      setDeleteError("削除に失敗しました");
      return;
    }
    setDeleteDialog(null);
    setDeleteNameInput("");
    router.refresh();
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="pb-3 pr-4 font-medium">名前</th>
              <th className="pb-3 pr-4 font-medium">メールアドレス</th>
              <th className="pb-3 pr-4 font-medium">ロール</th>
              <th className="pb-3 pr-4 font-medium">状態</th>
              <th className="pb-3 pr-4 font-medium">提出率（30日）</th>
              <th className="pb-3 pr-4 font-medium">最終日報</th>
              <th className="pb-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((user) => (
              <tr
                key={user.id}
                className={`py-3 ${!user.isActive ? "opacity-50" : ""}`}
              >
                <td className="py-3 pr-4 font-medium text-zinc-900">
                  {user.name}
                  {user.id === currentUserId && (
                    <span className="ml-2 text-xs text-zinc-400">（自分）</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-zinc-600">{user.email}</td>
                <td className="py-3 pr-4">
                  <select
                    value={user.role}
                    disabled={
                      user.id === currentUserId ||
                      loading === `role-${user.id}`
                    }
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs disabled:opacity-50"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {user.isActive ? "有効" : "無効"}
                  </span>
                </td>
                <td className="py-3 pr-4 text-zinc-600">
                  {Math.round(user.submissionRate30d * 100)}%
                </td>
                <td className="py-3 pr-4 text-zinc-600">
                  {user.lastReportAt
                    ? new Date(user.lastReportAt).toLocaleDateString("ja-JP")
                    : "—"}
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    {user.id !== currentUserId && (
                      <button
                        type="button"
                        disabled={loading === `active-${user.id}`}
                        onClick={() => handleToggleActive(user.id, user.isActive)}
                        className={`rounded px-3 py-1 text-xs font-medium disabled:opacity-50 ${
                          user.isActive
                            ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                            : "bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        {user.isActive ? "無効化" : "有効化"}
                      </button>
                    )}
                    {user.id !== currentUserId && (
                      <button
                        type="button"
                        disabled={loading === `delete-${user.id}`}
                        onClick={() => {
                          setDeleteNameInput("");
                          setDeleteDialog({ userId: user.id, userName: user.name });
                        }}
                        className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 削除確認ダイアログ */}
      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-base font-bold text-zinc-900">ユーザーを削除</h2>
            <p className="mb-4 text-sm text-zinc-600">
              <span className="font-medium text-zinc-900">{deleteDialog.userName}</span>{" "}
              を削除します。この操作は取り消せません。
              <br />
              確認のため、ユーザー名を入力してください。
            </p>
            <input
              type="text"
              value={deleteNameInput}
              onChange={(e) => { setDeleteNameInput(e.target.value); setDeleteError(""); }}
              placeholder={deleteDialog.userName}
              className="mb-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
            />
            {deleteError && (
              <p className="mb-3 text-xs text-red-600">{deleteError}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setDeleteDialog(null); setDeleteNameInput(""); setDeleteError(""); }}
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={deleteNameInput !== deleteDialog.userName || loading === `delete-${deleteDialog.userId}`}
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
