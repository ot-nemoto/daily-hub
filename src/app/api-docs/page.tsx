import { getSession } from "@/lib/auth";

import { ApiDocsContent } from "./ApiDocsContent";

export default async function ApiDocsPage() {
  await getSession({ redirectOnInactive: true });

  return (
    <div className="min-h-screen bg-white">
      <ApiDocsContent />
    </div>
  );
}
