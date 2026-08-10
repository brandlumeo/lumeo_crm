"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            // Keep data fresh for 2 minutes to prevent massive waterfall loaders on page navigation
            staleTime: 2 * 60 * 1000, 
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            classNames: {
              toast: "bg-paper/80 backdrop-blur-xl border border-line/50 shadow-2xl rounded-2xl p-4 flex gap-3 font-sans items-start",
              title: "text-[14px] font-semibold text-ink leading-snug",
              description: "text-[13px] text-muted",
              icon: "mt-0.5",
              success: "border-l-4 border-l-emerald-500",
              error: "border-l-4 border-l-rose-500",
              warning: "border-l-4 border-l-amber-500",
              info: "border-l-4 border-l-blue-500",
            }
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
