"use client";

import { useEffect, useRef } from "react";

export function StatusTableScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth;
    });
  }, []);

  return (
    <div
      ref={ref}
      className="max-h-[calc(100vh-12rem)] overflow-auto rounded-lg border border-zinc-200 bg-white"
    >
      {children}
    </div>
  );
}
