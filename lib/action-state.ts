export type ActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export const initialActionState: ActionState = {
  status: "idle",
  message: ""
};

type DatabaseError = {
  code?: string;
  message?: string;
  details?: string;
};

export function databaseErrorMessage(
  error: unknown,
  duplicateConstraints: Record<string, string>,
  fallback: string
) {
  const databaseError = (error || {}) as DatabaseError;
  const errorText = `${databaseError.message || ""} ${databaseError.details || ""}`;

  if (databaseError.code === "23505" || errorText.includes("duplicate key")) {
    for (const [constraint, message] of Object.entries(duplicateConstraints)) {
      if (errorText.includes(constraint)) return message;
    }

    return "This record already exists. Please use a different value.";
  }

  return fallback;
}
