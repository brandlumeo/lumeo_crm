"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-8 h-8 border border-line bg-paper rounded-md grid place-items-center opacity-50">
        <span className="w-[15px] h-[15px]" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-8 h-8 border border-line bg-paper rounded-md grid place-items-center text-ink-2 hover:bg-bone-2 transition-colors relative"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-[15px] h-[15px]" strokeWidth={1.6} />
      ) : (
        <Moon className="w-[15px] h-[15px]" strokeWidth={1.6} />
      )}
    </button>
  );
}
