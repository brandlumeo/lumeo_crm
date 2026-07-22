"use client";

import type { Route } from "next";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getAccessToken, login, verify2FA } from "@/lib/api";

const postLoginRoutes: Route[] = [
  "/dashboard",
  "/leads",
  "/customers",
  "/deals",
  "/tasks",
  "/notes",
  "/billing",
  "/team",
  "/settings",
];

function resolvePostLoginRoute(nextValue: string | null): Route {
  return postLoginRoutes.includes(nextValue as Route)
    ? (nextValue as Route)
    : "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2FA state
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  function goBackToSignIn() {
    setTwoFactorRequired(false);
    setTwoFactorCode("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await login({ username, password });
      if (response && response.two_factor_required) {
        setTwoFactorRequired(true);
        setLoading(false);
        return;
      }

      await queryClient.invalidateQueries();
      
      const { fetchMe } = require("@/lib/api");
      const user = await fetchMe();
      
      if (user?.role === "customer") {
        router.replace("/portal");
      } else {
        const nextValue =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("next")
            : null;
        router.replace(resolvePostLoginRoute(nextValue));
      }
      router.refresh();
    } catch (err: any) {
      if (err.response) {
        const status = err.response.status;
        const detail = err.response.data?.detail;
        
        if (status === 403) {
          setError("This account is temporarily locked due to multiple failed login attempts. Please try again in 30 minutes.");
        } else if (status === 429) {
          setError("Too many login attempts. Please wait a moment and try again.");
        } else if (status >= 500) {
          setError("Server error (500). Please check if your PostgreSQL database server is running and connected.");
        } else if (detail) {
          setError(detail);
        } else {
          setError("Sign-in failed. Check your email and password.");
        }
      } else {
        setError("Unable to connect to the backend server. Please verify it is running.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleTwoFactorSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!twoFactorCode || twoFactorCode.length !== 6 || isNaN(Number(twoFactorCode))) {
      setError("Please enter a valid 6-digit numeric verification code.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await verify2FA({ username, password, two_factor_code: twoFactorCode });
      await queryClient.invalidateQueries();
      
      const { fetchMe } = require("@/lib/api");
      const user = await fetchMe();
      
      if (user?.role === "customer") {
        router.replace("/portal");
      } else {
        const nextValue =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("next")
            : null;
        router.replace(resolvePostLoginRoute(nextValue));
      }
      router.refresh();
    } catch (err: any) {
      if (err.response) {
        const status = err.response.status;
        const detail = err.response.data?.detail;
        
        if (status === 400 && detail) {
          setError(detail);
        } else if (status === 401) {
          setError("Sign-in failed. Check your email and password.");
        } else if (status === 403) {
          setError("This account is locked. Please try again in 30 minutes.");
        } else {
          setError(detail || "Invalid code. Please try again.");
        }
      } else {
        setError("Unable to connect to the backend server. Please verify it is running.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col px-8 py-10 sm:px-16">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-ink rounded-md grid place-items-center text-bone font-serif italic text-[20px] leading-none pb-0.5">
            L
          </div>
          <div className="font-serif text-[22px] flex items-baseline">
            Lume<em className="text-accent not-italic">o</em>
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted ml-2 font-medium">CRM</span>
          </div>
        </Link>

        <div className="flex-1 grid place-items-center">
          <div className="w-full max-w-sm">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted mb-2 flex items-center gap-2">
              <span className="w-[18px] h-px bg-accent" /> Welcome back
            </div>
            {!twoFactorRequired ? (
              <>
                <h1 className="font-serif text-[44px] leading-none mb-8">
                  Sign in to your <em className="text-accent not-italic">workspace.</em>
                </h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                  <label className="block">
                    <span className="label">Email address</span>
                    <input
                      type="email"
                      required
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="input"
                      placeholder="name@company.com"
                    />
                  </label>
                  <label className="block">
                    <span className="label">Password</span>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="input pr-10"
                        placeholder="********"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-3.5 flex items-center text-muted hover:text-ink transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </label>

                  {error ? (
                    <div className="chip chip-warning justify-center">{error}</div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary justify-center py-2.5 mt-2 disabled:opacity-60"
                  >
                    {loading ? "Signing in..." : "Sign in"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <Link
                    href="/forgot-password"
                    className="text-center text-[13px] text-muted hover:text-ink transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </form>

                <div className="mt-6 flex flex-col items-center gap-3">
                  <Link
                    href="/register"
                    className="text-center text-[13px] text-ink hover:text-accent font-medium transition-colors"
                  >
                    Don't have an account? Sign up
                  </Link>
                  <p className="text-xs text-muted text-center">
                    Use the email created for your Lumeo CRM workspace account.
                  </p>
                </div>
              </>
            ) : (
              <>
                <h1 className="font-serif text-[44px] leading-none mb-4">
                  Security <em className="text-accent not-italic">verification.</em>
                </h1>
                <p className="text-[13.5px] text-muted mb-8 leading-relaxed">
                  Two-Factor Authentication is enabled. Please enter the 6-digit verification code from your Authenticator app.
                </p>

                <form onSubmit={handleTwoFactorSubmit} className="flex flex-col gap-3.5">
                  <label className="block">
                    <span className="label">Authenticator Code</span>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, ""))}
                      className="input text-center font-mono text-xl tracking-widest h-11"
                      placeholder="000000"
                      autoFocus
                    />
                  </label>

                  {error ? (
                    <div className="chip chip-warning justify-center">{error}</div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading || twoFactorCode.length !== 6}
                    className="btn btn-primary justify-center py-2.5 mt-2 disabled:opacity-60"
                  >
                    {loading ? "Verifying..." : "Verify Code"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={goBackToSignIn}
                    className="text-center text-[13px] text-muted hover:text-ink transition-colors mt-2"
                  >
                    Back to sign in
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <div className="text-[11px] text-muted font-mono">Copyright Lumeo CRM 2026</div>
      </div>

      <div className="hidden lg:flex relative bg-ink text-paper p-16 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,91,31,0.25),transparent_60%)] pointer-events-none" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent mb-4">
            Premium pipeline control
          </div>
          <h2 className="font-serif text-[64px] leading-[0.95] max-w-md">
            Built for teams who close the <em className="text-accent not-italic">whole quarter.</em>
          </h2>
        </div>
      </div>
    </div>
  );
}
