"use client";

import Link from "next/link";

function isMissingSchemaError(message: string) {
  return (
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    message.includes("public.products")
  );
}

export default function AdminError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const missingSchema = isMissingSchemaError(error.message);

  return (
    <section className="panel mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-black text-slate-950">
        {missingSchema ? "Database Tables Not Created" : "Something Went Wrong"}
      </h1>

      {missingSchema ? (
        <div className="mt-4 grid gap-4 text-sm text-slate-700">
          <p>
            Supabase is connected, but the app tables are missing. Run the migration SQL files in
            Supabase SQL Editor.
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Open Supabase Dashboard.</li>
            <li>Open your project.</li>
            <li>Go to SQL Editor.</li>
            <li>Run `supabase/migrations/001_schema.sql` first.</li>
            <li>Run `supabase/migrations/002_seed.sql` second.</li>
            <li>
              Run every later migration in order, including `005_update_ui_theme_color.sql` and
              `006_add_team_members.sql`.
            </li>
            <li>Restart the dev server and refresh this page.</li>
          </ol>
          <div className="rounded-md border border-line bg-rose px-4 py-3 font-semibold text-wine">
            Original error: {error.message}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Try Again
        </button>
        <Link href="/dashboard" className="btn-secondary">
          Dashboard
        </Link>
      </div>
    </section>
  );
}
