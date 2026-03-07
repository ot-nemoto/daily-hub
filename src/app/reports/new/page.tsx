import { ReportNewForm } from "./ReportNewForm";

export const metadata = {
  title: "日報作成 | Daily Hub",
};

export default function ReportNewPage() {
  return (
    <div className="min-h-screen bg-zinc-50 py-10">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-bold text-zinc-900">日報作成</h1>
        <ReportNewForm />
      </div>
    </div>
  );
}
