"use client";

import { useRouter } from "next/navigation";

type User = { id: string; name: string; email: string };

type Props = {
  currentMonth: string; // "YYYY-MM"
  currentAuthorId: string;
  users: User[];
};

export function MonthlyFilter({ currentMonth, currentAuthorId, users }: Props) {
  const router = useRouter();

  function handleChange(month: string, authorId: string) {
    const params = new URLSearchParams();
    if (month) {
      const [year, mon] = month.split("-");
      const lastDay = new Date(Number(year), Number(mon), 0).getDate();
      params.set("from", `${month}-01`);
      params.set("to", `${month}-${String(lastDay).padStart(2, "0")}`);
    }
    if (authorId) params.set("authorId", authorId);
    router.push(`/reports/monthly?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="month" className="block text-sm font-medium text-zinc-700">
          月
        </label>
        <input
          id="month"
          type="month"
          defaultValue={currentMonth}
          onChange={(e) => handleChange(e.target.value, currentAuthorId)}
          className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div>
        <label htmlFor="authorId" className="block text-sm font-medium text-zinc-700">
          ユーザー
        </label>
        <select
          id="authorId"
          defaultValue={currentAuthorId}
          onChange={(e) => handleChange(currentMonth, e.target.value)}
          className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
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
