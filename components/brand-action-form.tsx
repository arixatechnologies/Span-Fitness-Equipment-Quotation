"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef
} from "react";
import { saveBrandAction } from "@/app/actions/taxonomy";
import { ActionFeedback } from "@/components/action-feedback";
import { initialActionState, type ActionState } from "@/lib/action-state";

type BrandActionFormProps = ComponentPropsWithoutRef<"form"> & {
  feedbackClassName?: string;
  resetOnSuccess?: boolean;
};

export function BrandActionForm({
  children,
  feedbackClassName,
  resetOnSuccess = false,
  ...props
}: BrandActionFormProps) {
  const [state, formAction] = useActionState(saveBrandAction, initialActionState);
  const [dismissedState, setDismissedState] = useState<ActionState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.status === "success") {
      formRef.current?.reset();
    }

    if (state.status !== "success") return;

    const timer = window.setTimeout(() => {
      setDismissedState(state);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [resetOnSuccess, state]);

  return (
    <form {...props} ref={formRef} action={formAction}>
      {children}
      <ActionFeedback
        state={dismissedState === state ? initialActionState : state}
        className={feedbackClassName}
      />
    </form>
  );
}
