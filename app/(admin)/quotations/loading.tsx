import { LoadingUi } from "@/components/loading-ui";

export default function QuotationsLoading() {
  return (
    <LoadingUi
      title="Loading quotations"
      subtitle="Fetching quotation records."
    />
  );
}
