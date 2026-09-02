"use client";

import { useState, useTransition } from "react";
import type { Dict } from "@/lib/i18n";

type Mode = "login" | "signup";

type Props = {
  mode: Mode;
  action: (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>;
  t: Dict["auth"];
};

export default function AuthForm({ mode, action, t }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await action(formData);
      if (!res.ok) setError(res.error);
      // On success the action calls redirect(), so this branch doesn't run.
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <>
          <Field
            name="name"
            label={t.labels.fullName}
            required
            autoComplete="name"
          />
          <Field
            name="phone"
            label={t.labels.phone}
            type="tel"
            autoComplete="tel"
          />
        </>
      )}
      <Field
        name="email"
        label={t.labels.email}
        type="email"
        required
        autoComplete="email"
      />
      <Field
        name="password"
        label={t.labels.password}
        type="password"
        required
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        hint={mode === "signup" ? t.labels.passwordHint : undefined}
      />
      {mode === "signup" && (
        <Field
          name="confirm"
          label={t.labels.confirmPassword}
          type="password"
          required
          autoComplete="new-password"
        />
      )}
      {error && (
        <p className="font-sans text-sm text-pole-red bg-pole-red/10 border border-pole-red/40 rounded-sm px-4 py-3">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full inline-flex items-center justify-center px-8 py-4 text-sm tracking-[0.3em] font-semibold bg-gradient-to-b from-gold-100 to-gold-600 text-black rounded-sm hover:brightness-110 transition shadow-[0_0_30px_rgba(212,175,55,0.35)] disabled:opacity-60"
      >
        {isPending
          ? mode === "login"
            ? t.buttons.signingIn
            : t.buttons.creatingAccount
          : mode === "login"
          ? t.buttons.signIn
          : t.buttons.createAccount}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  autoComplete,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="font-sans text-xs tracking-[0.25em] text-green-300 block mb-2">
        {label.toUpperCase()}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        autoComplete={autoComplete}
        className="w-full bg-bg-card border border-gold-700/40 rounded-sm px-4 py-3 font-sans text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-400 transition"
      />
      {hint && (
        <span className="font-sans text-xs text-white/50 mt-1 block">{hint}</span>
      )}
    </label>
  );
}
