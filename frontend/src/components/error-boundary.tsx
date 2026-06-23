"use client";

import { useEffect } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// React class-based ErrorBoundary (hooks cannot catch render errors)
import React from "react";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console in dev; swap with a real error reporting service (Sentry etc.) in production
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-bone p-8">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>

            <div>
              <h1 className="font-serif text-2xl text-ink mb-2">Something went wrong</h1>
              <p className="text-sm text-muted">
                An unexpected error occurred in this section. Your data is safe — try refreshing the page.
              </p>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="text-left text-xs bg-red-500/5 border border-red-500/20 rounded-lg p-4 text-red-600">
                <summary className="font-medium cursor-pointer mb-2">Error details (dev only)</summary>
                <pre className="whitespace-pre-wrap break-words">{this.state.error.message}</pre>
              </details>
            )}

            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-ink text-paper px-6 py-2.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
