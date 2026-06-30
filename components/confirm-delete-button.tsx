"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import { useState } from "react";
import { deleteCustomerAction } from "@/app/actions/customers";
import { deleteMemberAction } from "@/app/actions/members";
import { deleteQuotationAction } from "@/app/actions/quotations";
import { SubmitButton } from "@/components/submit-button";

type DeleteEntity = "customer" | "quotation" | "member";

type ConfirmDeleteButtonProps = {
  entity: DeleteEntity;
  id: string;
  itemName: string;
  className?: string;
  showLabel?: boolean;
  title?: string;
};

const deleteActions = {
  customer: deleteCustomerAction,
  quotation: deleteQuotationAction,
  member: deleteMemberAction
};

const confirmationCopy: Record<
  DeleteEntity,
  { title: string; description: (itemName: string) => string }
> = {
  customer: {
    title: "Delete this customer?",
    description: (itemName) =>
      `"${itemName}" and their saved customer record will be permanently deleted.`
  },
  quotation: {
    title: "Delete this quotation?",
    description: (itemName) =>
      `"${itemName}" and its generated files will be permanently deleted.`
  },
  member: {
    title: "Delete this member?",
    description: (itemName) =>
      `"${itemName}" will lose access and their member profile will be permanently deleted.`
  }
};

export function ConfirmDeleteButton({
  entity,
  id,
  itemName,
  className = "btn-danger px-3",
  showLabel = false,
  title = "Delete"
}: ConfirmDeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const action = deleteActions[entity];
  const copy = confirmationCopy[entity];

  return (
    <>
      <button
        type="button"
        className={className}
        title={title}
        aria-label={`Delete ${itemName}`}
        onClick={() => setIsOpen(true)}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {showLabel ? <span>Delete</span> : null}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setIsOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-${entity}-${id}-title`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id={`delete-${entity}-${id}-title`}
                    className="text-lg font-black text-slate-950"
                  >
                    {copy.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {copy.description(itemName)} This action cannot be undone.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setIsOpen(false)}
                aria-label="Close delete confirmation"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </button>
              <form action={action}>
                <input type="hidden" name="id" value={id} />
                <SubmitButton className="btn-danger" pendingLabel="Deleting...">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </SubmitButton>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
