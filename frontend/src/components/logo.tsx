import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "full" | "mark" | "splash";
}

export function Logo({ className, variant = "full" }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 100 100"
        className={cn(
          "shrink-0",
          variant === "splash" ? "w-12 h-12" : "w-7 h-7"
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 5 20 L 5 80 L 25 100 L 85 100 L 85 75 L 30 75 L 30 20 Z"
          className={cn(
            "fill-ink dark:fill-white",
            variant === "splash" && "fill-white"
          )}
        />
        <path
          d="M 45 5 L 100 5 L 100 60 Z"
          fill="#eb5e28"
        />
      </svg>
      {variant !== "mark" && (
        <span
          className={cn(
            "font-sans font-bold tracking-widest uppercase",
            variant === "splash" ? "text-white text-3xl" : "text-ink dark:text-white text-[20px]"
          )}
        >
          Lumeo
        </span>
      )}
    </div>
  );
}
