"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

export type DisplayField = "workContent" | "tomorrowPlan" | "notes";

/* 表示順は固定（本日の作業 → 明日の予定 → 感想/課題/問題点）。表示・トグル両方でこの順を使う */
export const DISPLAY_FIELDS: { key: DisplayField; label: string }[] = [
  { key: "workContent", label: "本日の作業" },
  { key: "tomorrowPlan", label: "明日の予定" },
  { key: "notes", label: "感想/課題/問題点" },
];

type DisplayFieldContextValue = [Set<DisplayField>, (f: DisplayField) => void];

const DisplayFieldContext = createContext<DisplayFieldContextValue | null>(null);

export function DisplayFieldProvider({ children }: { children: ReactNode }) {
  const [fields, setFields] = useState<Set<DisplayField>>(() => new Set(["notes"]));

  // トグル。未選択（0個）も許可する
  function toggleField(field: DisplayField) {
    setFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  }

  return (
    <DisplayFieldContext.Provider value={[fields, toggleField]}>
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
  const [fields, toggleField] = useDisplayField();
  return (
    <fieldset aria-label="表示フィールド切り替え" className="flex gap-1 border-none p-0 m-0">
      {DISPLAY_FIELDS.map((tab) => {
        const selected = fields.has(tab.key);
        return (
          <button
            key={tab.key}
            type="button"
            aria-pressed={selected}
            onClick={() => toggleField(tab.key)}
            className={`cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
              selected ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </fieldset>
  );
}
