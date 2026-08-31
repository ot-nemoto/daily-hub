import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { getHolidays } from "@/lib/holiday";
import { HolidayCalendar } from "./HolidayCalendar";

export const metadata = { title: "祝日管理" };

export default async function HolidaysPage() {
  const session = await getSession({ redirectOnInactive: true });
  if (!session) return null;
  if (session.user.role !== "ADMIN") redirect("/");

  const holidays = await getHolidays();

  return (
    <div className="bg-zinc-50 px-4 py-10">
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-bold text-zinc-900">祝日管理</h1>
        <p className="mb-6 text-sm text-zinc-500">
          ここで設定した祝日は全ユーザーに適用されます（管理者のみ設定可能）。
        </p>

        <HolidayCalendar
          holidays={holidays.map((h) => ({
            date: h.date.toISOString().slice(0, 10),
            name: h.name,
          }))}
        />
      </div>
    </div>
  );
}
