"use client";

import { CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function TimedNotice({
  message,
  clearHref,
  duration = 3000
}: {
  message: string;
  clearHref: string;
  duration?: number;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
      router.replace(clearHref, { scroll: false });
    }, duration);

    return () => window.clearTimeout(timer);
  }, [clearHref, duration, router]);

  if (!visible) return null;

  return (
    <div
      className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
      role="status"
      aria-live="polite"
    >
      <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
