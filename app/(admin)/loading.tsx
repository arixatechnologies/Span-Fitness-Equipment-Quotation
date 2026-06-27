import { LoadingUi } from "@/components/loading-ui";

export default function AdminLoading() {
  return (
    <LoadingUi
      title="Loading page"
      subtitle="Fetching the latest quotation data."
    />
  );
}
