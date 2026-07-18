import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { UserSummary } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrency(amount: number, currencyCode: string = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (e) {
    // Fallback if currency code is invalid
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

export function formatCompactINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatLongDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRelativeDays(value: string | null) {
  if (!value) {
    return null;
  }

  const now = Date.now();
  const target = new Date(value).getTime();
  const diff = target - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return `${Math.abs(days)} days overdue`;
  }
  if (days === 0) {
    return "Ends today";
  }
  if (days === 1) {
    return "1 day remaining";
  }
  return `${days} days remaining`;
}

export function getDisplayName(
  user?: Pick<UserSummary, "first_name" | "last_name" | "username"> | null,
) {
  if (!user) {
    return "";
  }

  const fullName = `${user.first_name} ${user.last_name}`.trim();
  return fullName || user.username;
}

export function getInitials(value: string) {
  const parts = value.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) {
    return "LU";
  }
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function toNumber(amount: string | number) {
  const numeric =
    typeof amount === "number"
      ? amount
      : Number.parseFloat(amount.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function buildSparkPath(values: number[], width = 200, height = 32) {
  if (values.length === 0) {
    return `M0,${height / 2} L${width},${height / 2}`;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://127.0.0.1:8000/api/v1";
  const baseUrl = apiUrl.replace("/api/v1", "");
  
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
