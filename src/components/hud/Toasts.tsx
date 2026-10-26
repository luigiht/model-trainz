"use client";

import { useEffect, useState } from "react";

export interface Toast {
  id: number;
  text: string;
}

let push: ((text: string) => void) | null = null;
export const toast = (text: string) => push?.(text);

/** Small stack of auto-dismissing announcements (also read by screen readers). */
export function Toasts() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    let id = 0;
    push = (text) => {
      const t = { id: ++id, text };
      setItems((xs) => [...xs.slice(-2), t]);
      window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), 3200);
    };
    return () => {
      push = null;
    };
  }, []);
  return (
    <div
      className="pointer-events-none flex flex-col items-center gap-2"
      role="status"
      aria-live="polite"
    >
      {items.map((t) => (
        <div key={t.id} className="toast panel px-4 py-2 text-sm text-amber-50">
          {t.text}
        </div>
      ))}
    </div>
  );
}
