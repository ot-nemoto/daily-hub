"use client";

import { useRouter } from "next/navigation";

type User = { id: string; name: string; email: string };

type Props = {
  currentDate: string;
  currentUserId: string;
  users: User[];
};

export function DailyFilter({ currentDate, currentUserId, users }: Props) {
  const router = useRouter();

  function handleChange(date: string, userId: string) {
    const params = new URLSearchParams({ date });
    if (userId) params.set("userId", userId);
    router.push(`/reports/daily?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-zinc-700">
          日付
        </label>
        <input
          id="date"
          type="date"
          defaultValue={currentDate}
          onChange={(e) => handleChange(e.target.value, currentUserId)}
          className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div>
        <label htmlFor="userId" className="block text-sm font-medium text-zinc-700">
          ユーザー
        </label>
        <select
          id="userId"
          defaultValue={currentUserId}
          onChange={(e) => handleChange(currentDate, e.target.value)}
          className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">全員</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
