"use client";

import { useEffect, useState } from "react";
import { RequiredMark } from "@/components/required-mark";
import styles from "./login.module.css";

type LoginFormProps = {
  redirectedFrom: string;
  error?: string;
};

export function LoginForm({ redirectedFrom, error }: LoginFormProps) {
  const [canLogin, setCanLogin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateButtonState(form: HTMLFormElement) {
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    setCanLogin(email.length > 0 && password.length > 0);
  }

  useEffect(() => {
    const form = document.getElementById("login-form") as HTMLFormElement | null;
    if (!form) return;

    const immediateTimeout = window.setTimeout(() => updateButtonState(form), 0);
    const autofillTimeout = window.setTimeout(() => updateButtonState(form), 300);

    return () => {
      window.clearTimeout(immediateTimeout);
      window.clearTimeout(autofillTimeout);
    };
  }, []);

  return (
    <form
      id="login-form"
      action="/api/auth/login"
      method="post"
      onInput={(event) => updateButtonState(event.currentTarget)}
      onSubmit={() => setIsSubmitting(true)}
    >
      <input type="hidden" name="redirectedFrom" value={redirectedFrom} />

      <div className={styles.group}>
        <label className={styles.label} htmlFor="email">
          Email or Username
          <RequiredMark />
        </label>
        <div className={styles.field}>
          <span className={styles.iconBadge} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="8" r="4" />
            </svg>
          </span>
          <input
            id="email"
            name="email"
            type="text"
            placeholder="Enter your email or username"
            autoComplete="username"
            required
          />
        </div>
      </div>

      <div className={styles.group}>
        <label className={styles.label} htmlFor="password">
          Password
          <RequiredMark />
        </label>
        <div className={styles.field}>
          <span className={styles.iconBadge} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <rect x="4" y="11" width="16" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 1 1 8 0v3" />
              <path d="M12 15v2" />
            </svg>
          </span>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
          <span className={styles.eye} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
        </div>
      </div>

      <div className={styles.row}>
        <label className={styles.remember}>
          <input type="checkbox" name="remember" defaultChecked />
          <span>Remember me</span>
        </label>
        <a href="#" aria-disabled="true">
          Forgot password?
        </a>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      <button
        className={`${styles.btn} ${canLogin || isSubmitting ? styles.btnReady : ""}`}
        type="submit"
        disabled={!canLogin || isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            Logging in...
          </>
        ) : (
          <>
            Login
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
}
