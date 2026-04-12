"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorMessage } from "@/components/ErrorMessage";
import { generateApiKey, revokeApiKey, updateMe } from "./actions";

type Props = {
  initialName: string;
  email: string;
  initialApiKey: string | null;
};

export function SettingsForm({ initialName, email, initialApiKey }: Props) {
  const router = useRouter();
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [namePending, setNamePending] = useState(false);

  const [apiKey, setApiKey] = useState<string | null>(initialApiKey);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyPending, setApiKeyPending] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  async function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNamePending(true);
    setNameError(null);
    setNameSuccess(false);

    const data = new FormData(e.currentTarget);
    const name = data.get("name") as string;

    try {
      const result = await updateMe({ name });
      if (result.error) {
        setNameError(result.error);
      } else {
        setNameSuccess(true);
        router.refresh();
      }
    } catch {
      setNameError("通信エラーが発生しました");
    } finally {
      setNamePending(false);
    }
  }

  async function handleGenerateApiKey() {
    setApiKeyPending(true);
    setApiKeyError(null);
    try {
      const result = await generateApiKey();
      if (result.error) {
        setApiKeyError(result.error);
      } else if (result.apiKey) {
        setApiKey(result.apiKey);
        setApiKeyVisible(true);
      }
    } catch {
      setApiKeyError("通信エラーが発生しました");
    } finally {
      setApiKeyPending(false);
    }
  }

  async function handleRevokeApiKey() {
    setApiKeyPending(true);
    setApiKeyError(null);
    try {
      const result = await revokeApiKey();
      if (result.error) {
        setApiKeyError(result.error);
      } else {
        setApiKey(null);
        setApiKeyVisible(false);
        router.refresh();
      }
    } catch {
      setApiKeyError("通信エラーが発生しました");
    } finally {
      setApiKeyPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 名前変更 */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-zinc-900">プロフィール</h2>
        <form onSubmit={handleNameSubmit} className="space-y-4">
          <div>
            <p className="block text-sm font-medium text-zinc-700">メールアドレス</p>
            <p className="mt-1 text-sm text-zinc-500">{email}</p>
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
              名前
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={initialName}
              maxLength={100}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
          <ErrorMessage message={nameError} />
          {nameSuccess && (
            <p className="text-sm text-green-600">名前を更新しました</p>
          )}
          <button
            type="submit"
            disabled={namePending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {namePending ? "保存中..." : "保存する"}
          </button>
        </form>
      </div>
      {/* APIキー管理 */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-bold text-zinc-900">APIキー</h2>
        <p className="mb-4 text-sm text-zinc-500">
          外部ツールやスクリプトから日報を投稿するためのキーです。
        </p>
        <div className="space-y-3">
          {apiKey ? (
            <>
              <div className="flex items-center gap-2">
                <input
                  type={apiKeyVisible ? "text" : "password"}
                  readOnly
                  value={apiKey}
                  className="block w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-700"
                />
                <button
                  type="button"
                  onClick={() => setApiKeyVisible((v) => !v)}
                  className="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
                >
                  {apiKeyVisible ? "隠す" : "表示"}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGenerateApiKey}
                  disabled={apiKeyPending}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {apiKeyPending ? "処理中..." : "再生成"}
                </button>
                <button
                  type="button"
                  onClick={handleRevokeApiKey}
                  disabled={apiKeyPending}
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {apiKeyPending ? "処理中..." : "失効"}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={handleGenerateApiKey}
              disabled={apiKeyPending}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {apiKeyPending ? "生成中..." : "生成する"}
            </button>
          )}
          <ErrorMessage message={apiKeyError} />
        </div>
      </div>
    </div>
  );
}
