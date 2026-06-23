"use client";

import type { Route } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getAccessToken, register } from "@/lib/api";

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

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register({
        first_name: firstName,
        last_name: lastName,
        email: email,
        password: password,
        company_name: companyName,
      });
      await queryClient.invalidateQueries();
      const nextValue =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      router.replace(resolvePostLoginRoute(nextValue));
      router.refresh();
    } catch (err: any) {
      if (err.response) {
        const detail = err.response.data?.detail;
        if (detail) {
          setError(detail);
        } else {
          setError("Registration failed. Please try again.");
        }
      } else {
        setError("Unable to connect to the server. Please verify it is running.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col px-8 py-10 sm:px-16 overflow-y-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-ink rounded-md grid place-items-center text-bone font-serif italic text-[20px] leading-none pb-0.5">
            L
          </div>
          <div className="font-serif text-[22px]">
            Lume<em className="text-accent not-italic">o</em>
          </div>
        </Link>

        <div className="flex-1 grid place-items-center py-10">
          <div className="w-full max-w-sm">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted mb-2 flex items-center gap-2">
              <span className="w-[18px] h-px bg-accent" /> Get started
            </div>
            <h1 className="font-serif text-[44px] leading-none mb-8">
              Create your <em className="text-accent not-italic">workspace.</em>
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3.5">
                <label className="block">
                  <span className="label">First Name</span>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="input"
                    placeholder="Jane"
                  />
                </label>
                <label className="block">
                  <span className="label">Last Name</span>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="input"
                    placeholder="Doe"
                  />
                </label>
              </div>

              <label className="block">
                <span className="label">Work Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input"
                  placeholder="jane@company.com"
                />
              </label>

              <label className="block">
                <span className="label">Company Name</span>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  className="input"
                  placeholder="Acme Corp"
                />
              </label>

              <label className="block">
                <span className="label">Password</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input"
                  placeholder="********"
                />
              </label>

              {error ? (
                <div className="chip chip-warning justify-center text-center">{error}</div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary justify-center py-2.5 mt-2 disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Sign up"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <Link
                href="/login"
                className="text-center text-[13px] text-muted hover:text-ink transition-colors mt-2"
              >
                Already have an account? Sign in
              </Link>
            </form>
          </div>
        </div>

        <div className="text-[11px] text-muted font-mono">Copyright Lumeo 2026</div>
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
        <div className="relative grid grid-cols-3 gap-6 text-xs text-paper/70 max-w-md">
          <div>
            <div className="font-mono text-2xl text-paper mb-1">14d</div>
            free trial
          </div>
          <div>
            <div className="font-mono text-2xl text-paper mb-1">0</div>
            card up front
          </div>
          <div>
            <div className="font-mono text-2xl text-paper mb-1">5</div>
            live CRM views
          </div>
        </div>
      </div>
    </div>
  );
}
