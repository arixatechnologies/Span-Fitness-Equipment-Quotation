"use client";

import { useActionState, useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { saveBrandAction } from "@/app/actions/taxonomy";
import { ActionFeedback } from "@/components/action-feedback";
import { initialActionState } from "@/lib/action-state";

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
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.status === "success") {
      formRef.current?.reset();
    }
  }, [resetOnSuccess, state]);

  return (
    <form {...props} ref={formRef} action={formAction}>
      {children}
      <ActionFeedback state={state} className={feedbackClassName} />
    </form>
  );
}
