"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, CheckCircle, Eye, EyeOff, AlertCircle } from "lucide-react";
import { confirmPasswordReset } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate token presence on mount
  const tokenMissing = !uid || !token;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset({ uid, token, password });
      setDone(true);
      // Redirect to login after 2.5 seconds
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; password?: string[] } } };
      const msg =
        axiosErr?.response?.data?.error ||
        axiosErr?.response?.data?.password?.[0] ||
        "This reset link has expired or is invalid. Please request a new one.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (tokenMissing) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 border border-amber-200 grid place-items-center mx-auto mb-5">
          <AlertCircle className="w-7 h-7 text-amber-600" />
        </div>
        <h1 className="font-serif text-[36px] leading-none mb-3">Invalid link.</h1>
        <p className="text-[14px] text-muted mb-6 leading-relaxed">
          This reset link is missing required parameters. Please request a new one.
        </p>
        <Link href="/forgot-password" className="btn btn-primary w-full justify-center py-2.5">
          Request new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 border border-green-200 grid place-items-center mx-auto mb-5">
          <CheckCircle className="w-7 h-7 text-green-600" />
        </div>
        <h1 className="font-serif text-[36px] leading-none mb-3">
          Password <em className="text-accent not-italic">updated.</em>
        </h1>
        <p className="text-[14px] text-muted mb-2">
          Your password has been changed successfully.
        </p>
        <p className="text-[12px] text-muted mb-6">Redirecting you to sign in…</p>
        <Link href="/login" className="btn btn-primary w-full justify-center py-2.5">
          Sign in now
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted mb-2 flex items-center gap-2">
        <span className="w-[18px] h-px bg-accent" /> Set new password
      </div>
      <h1 className="font-serif text-[40px] leading-none mb-3">
        Choose a new <em className="text-accent not-italic">password.</em>
      </h1>
      <p className="text-[14px] text-muted mb-8 leading-relaxed">
        Pick a strong password. It must be at least 8 characters long.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <label className="block">
          <span className="label">New password</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input !pr-10"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="label">Confirm new password</span>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input"
            placeholder="Repeat your password"
          />
        </label>

        {/* Password strength hint */}
        {password.length > 0 && (
          <div className="flex gap-1 h-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors duration-300 ${
                  password.length >= i * 4
                    ? i <= 1
                      ? "bg-red-400"
                      : i === 2
                      ? "bg-amber-400"
                      : i === 3
                      ? "bg-blue-400"
                      : "bg-green-400"
                    : "bg-line"
                }`}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="chip chip-warning justify-center text-center">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary justify-center py-2.5 mt-2 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save new password"}
          {!loading && <ArrowRight className="w-3.5 h-3.5" />}
        </button>

        <Link
          href="/login"
          className="text-center text-[13px] text-muted hover:text-ink transition-colors"
        >
          Back to sign in
        </Link>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left column */}
      <div className="flex flex-col px-8 py-10 sm:px-16">
        {/* Logo */}
        <Link href="/login" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-ink rounded-md grid place-items-center text-bone font-serif italic text-[20px] leading-none pb-0.5">
            L
          </div>
          <div className="font-serif text-[22px]">
            Lume<em className="text-accent not-italic">o</em>
          </div>
        </Link>

        <div className="flex-1 grid place-items-center">
          <div className="w-full max-w-sm">
            <Suspense fallback={<div className="text-muted text-sm">Loading…</div>}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>

        <div className="text-[11px] text-muted font-mono">Copyright Lumeo 2026</div>
      </div>

      {/* Right column — brand panel */}
      <div className="hidden lg:flex relative bg-ink text-paper p-16 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,91,31,0.25),transparent_60%)] pointer-events-none" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent mb-4">
            Security
          </div>
          <h2 className="font-serif text-[64px] leading-[0.95] max-w-md">
            Your account,{" "}
            <em className="text-accent not-italic">protected.</em>
          </h2>
        </div>
        <div className="relative grid grid-cols-3 gap-6 text-xs text-paper/70 max-w-md">
          <div>
            <div className="font-mono text-2xl text-paper mb-1">bcrypt</div>
            password hashing
          </div>
          <div>
            <div className="font-mono text-2xl text-paper mb-1">1hr</div>
            link expiry
          </div>
          <div>
            <div className="font-mono text-2xl text-paper mb-1">JWT</div>
            auth tokens
          </div>
        </div>
      </div>
    </div>
  );
}
