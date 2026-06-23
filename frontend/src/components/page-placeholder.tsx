import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";

interface PagePlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  stateTitle: string;
  stateDescription: string;
}

export function PagePlaceholder({
  eyebrow,
  title,
  description,
  icon,
  stateTitle,
  stateDescription,
}: PagePlaceholderProps) {
  return (
    <PageShell eyebrow={eyebrow} title={title} description={description}>
      <div className="card animate-rise">
        <EmptyState icon={icon} title={stateTitle} description={stateDescription} />
      </div>
    </PageShell>
  );
}
