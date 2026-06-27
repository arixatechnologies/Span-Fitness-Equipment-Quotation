import Image from "next/image";
import { LoginForm } from "./login-form";
import styles from "./login.module.css";

const errorMessages: Record<string, string> = {
  invalid: "Invalid admin email or password.",
  config: "Admin auth is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD, and AUTH_SECRET.",
  unknown: "Unable to sign in. Please try again."
};

function safeRedirectPath(value: string | string[] | undefined) {
  const path = String(Array.isArray(value) ? value[0] || "" : value || "/dashboard");
  return path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const redirectedFrom = safeRedirectPath(params.redirectedFrom);
  const errorKey = String(params.error || "");
  const error = errorMessages[errorKey];

  return (
    <main className={styles.page}>
      <div className={styles.blobTop} />
      <div className={styles.blobBottom} />
      <div className={styles.ringLeft} />
      <div className={styles.ringRight} />
      <div className={styles.dots} />

      <section className={styles.card}>
        <div className={styles.logoBox}>
          <Image
            src="/login image/span-logo-transparent.png"
            alt="Span Fitness Equipments Logo"
            width={491}
            height={117}
            priority
          />
        </div>

        <h1 className={styles.title}>Welcome Back</h1>

        <LoginForm redirectedFrom={redirectedFrom} error={error} />

        <div className={styles.foot}>
          Don&apos;t have an account? <a href="#">Create account</a>
        </div>
      </section>
    </main>
  );
}
