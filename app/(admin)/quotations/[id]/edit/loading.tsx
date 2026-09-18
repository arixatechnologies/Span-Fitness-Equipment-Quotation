import { LoadingUi } from "@/components/loading-ui";

export default function EditQuotationLoading() {
  return (
    <LoadingUi
      title="Loading quotation editor"
      subtitle="Fetching quotation products and customer details."
    />
  );
}
