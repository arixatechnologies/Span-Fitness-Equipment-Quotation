import { AlertTriangle } from "lucide-react";

export function SupabaseSetupNotice({ issue }: { issue: string }) {
  return (
    <section
      className="panel mx-auto max-w-3xl border-red-200 p-6"
      role="alert"
      aria-labelledby="supabase-setup-title"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
        <div className="min-w-0">
          <h1 id="supabase-setup-title" className="text-lg font-black text-slate-950">
            Supabase configuration required
          </h1>
          <p className="mt-2 text-sm text-red-700">{issue}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Update <code className="font-semibold text-slate-950">SUPABASE_URL</code> and{" "}
            <code className="font-semibold text-slate-950">SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
            <code className="font-semibold text-slate-950">.env</code>, then restart the development
            server.
          </p>
        </div>
      </div>
    </section>
  );
}
