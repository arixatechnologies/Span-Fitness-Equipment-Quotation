import { LoadingUi } from "@/components/loading-ui";

export default function AuthLoading() {
  return (
    <LoadingUi
      variant="page"
      title="Loading login"
      subtitle="Preparing the secure login page."
    />
  );
}
