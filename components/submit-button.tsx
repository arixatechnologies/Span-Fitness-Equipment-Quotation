"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
  children: ReactNode;
};

export function SubmitButton({
  children,
  className = "btn-primary",
  disabled,
  pendingLabel = "Please wait",
  type = "submit",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type={type}
      disabled={pending || disabled}
      aria-busy={pending}
      className={className}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {pendingLabel ? <span>{pendingLabel}</span> : null}
        </>
      ) : (
        children
      )}
    </button>
  );
}
