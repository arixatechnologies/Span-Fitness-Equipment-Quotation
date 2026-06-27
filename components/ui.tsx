import Link from "next/link";
import clsx from "clsx";
import type { QuotationStatus, Status } from "@/lib/types";

export function StatCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="panel p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
      {helper ? <div className="mt-1 text-sm text-slate-500">{helper}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  href,
  action
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="panel flex min-h-56 flex-col items-center justify-center p-8 text-center">
      <div className="text-base font-black text-slate-950">{title}</div>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
      {href && action ? (
        <Link href={href} className="btn-primary mt-5">
          {action}
        </Link>
      ) : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: Status | QuotationStatus | string }) {
  const normalized = status.toLowerCase();
  const className = clsx(
    "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
    normalized === "active" || normalized === "accepted"
      ? "bg-mist text-ink"
      : normalized === "sent"
        ? "bg-cloud text-ink"
        : normalized === "draft"
          ? "bg-rose text-wine"
          : normalized === "cancelled" || normalized === "rejected" || normalized === "inactive"
            ? "bg-red-50 text-red-700"
            : "bg-panel text-slate-700"
  );

  return <span className={className}>{status}</span>;
}

export function ProductPlaceholder({ label = "SFE" }: { label?: string }) {
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-line bg-panel text-xs font-black text-navy">
      {label}
    </div>
  );
}

export function SectionTitle({
  title,
  action
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-base font-black text-slate-950">{title}</h2>
      {action}
    </div>
  );
}
