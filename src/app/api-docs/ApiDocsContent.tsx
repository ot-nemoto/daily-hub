"use client";

import dynamic from "next/dynamic";

// swagger-ui-react はブラウザ API を使用するため SSR を無効化
const SwaggerUIClient = dynamic(
  () => import("./SwaggerUIClient").then((m) => m.SwaggerUIClient),
  { ssr: false },
);

export function ApiDocsContent() {
  return <SwaggerUIClient />;
}
