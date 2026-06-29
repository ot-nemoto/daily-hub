"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

export type DisplayField = "workContent" | "tomorrowPlan" | "notes";

const TABS: { key: DisplayField; label: string }[] = [
  { key: "workContent", label: "本日の作業" },
  { key: "tomorrowPlan", label: "明日の予定" },
  { key: "notes", label: "感想/課題/問題点" },
];

type DisplayFieldContextValue = [DisplayField, (f: DisplayField) => void];

const DisplayFieldContext = createContext<DisplayFieldContextValue | null>(null);

export function DisplayFieldProvider({ children }: { children: ReactNode }) {
  const [field, setField] = useState<DisplayField>("notes");
  return (
    <DisplayFieldContext.Provider value={[field, setField]}>
      {children}
    </DisplayFieldContext.Provider>
  );
}

export function useDisplayField(): DisplayFieldContextValue {
  const ctx = useContext(DisplayFieldContext);
  if (!ctx) {
    throw new Error("useDisplayField must be used within a DisplayFieldProvider");
  }
  return ctx;
}

export function DisplayFieldTabs() {
  const [field, setField] = useDisplayField();
  return (
    <div className="flex gap-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => setField(tab.key)}
          className={`cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
            tab.key === field
              ? "bg-zinc-900 text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
