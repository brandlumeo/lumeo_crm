"use client";

import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Zap, GitBranch } from "lucide-react";
import { WorkflowsSettings } from "@/components/workflows-settings";
import { WorkflowSequencesList } from "@/components/workflow-sequences-list";
import { cn } from "@/lib/utils";

export default function AutomationsPage() {
  const [activeTab, setActiveTab] = useState<"rules" | "sequences">("sequences");

  return (
    <PageShell title="Automations" description="Build and manage workflow automations.">
      <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
        <div className="flex bg-bone/50 p-1 rounded-lg w-fit border border-accent">
          <button
            onClick={() => setActiveTab("sequences")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === "sequences"
                ? "bg-white text-ink shadow-sm border border-accent"
                : "text-ink-2 hover:text-ink"
            )}
          >
            <GitBranch className="w-4 h-4" />
            Workflow Sequences
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === "rules"
                ? "bg-white text-ink shadow-sm border border-accent"
                : "text-ink-2 hover:text-ink"
            )}
          >
            <Zap className="w-4 h-4" />
            Simple Rules
          </button>
        </div>

        <div className="bg-white rounded-xl border border-accent shadow-sm overflow-hidden min-h-[600px]">
          {activeTab === "rules" ? (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-ink">Simple Rules</h3>
                <p className="text-sm text-ink-2">
                  Create simple trigger-action rules for when deals are won, lost, or leads are qualified.
                </p>
              </div>
              <WorkflowsSettings />
            </div>
          ) : (
            <div className="p-0 h-full flex flex-col">
              <WorkflowSequencesList />
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
