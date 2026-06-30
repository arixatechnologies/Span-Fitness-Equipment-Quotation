import { AlertCircle, CircleCheck } from "lucide-react";
import type { ActionState } from "@/lib/action-state";

type ActionFeedbackProps = {
  state: ActionState;
  className?: string;
};

export function ActionFeedback({ state, className = "" }: ActionFeedbackProps) {
  if (state.status === "idle" || !state.message) return null;

  const isError = state.status === "error";
  const Icon = isError ? AlertCircle : CircleCheck;

  return (
    <div
      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      } ${className}`}
      role={isError ? "alert" : "status"}
      aria-live="polite"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{state.message}</span>
    </div>
  );
}
