"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronRight, Check, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { getInitials } from "@/lib/utils";

interface WorkspaceSwitcherProps {
  workspaceName: string;
  workspaceState: string;
}

export function WorkspaceSwitcher({ workspaceName, workspaceState }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="bg-bone-2 border border-line rounded-md px-3 py-2.5 flex items-center gap-2.5 text-left hover:border-ink-2/30 transition-colors"
        >
          <div className="w-7 h-7 rounded-md grid place-items-center text-white font-semibold text-xs bg-gradient-to-br from-accent to-gold shrink-0">
            {getInitials(workspaceName).slice(0, 1)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate text-ink">{workspaceName}</div>
            <div className="text-[11px] text-muted capitalize truncate">{workspaceState}</div>
          </div>
          <ChevronRight className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 w-64 rounded-xl border border-line bg-paper p-1.5 shadow-xl animate-rise text-ink"
        >
          <div className="px-2 py-2 text-[10px] uppercase tracking-[0.12em] text-muted font-medium">
            Your Workspaces
          </div>
          
          <div className="flex flex-col gap-1 mb-2">
            <button className="flex items-center gap-2.5 rounded-lg px-2 py-2 bg-bone-2 text-left transition-colors">
              <div className="w-7 h-7 rounded-md grid place-items-center text-white font-semibold text-xs bg-gradient-to-br from-accent to-gold shrink-0">
                {getInitials(workspaceName).slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate text-ink">{workspaceName}</div>
                <div className="text-[11px] text-muted capitalize truncate">Current</div>
              </div>
              <Check className="w-4 h-4 text-accent shrink-0" />
            </button>
          </div>

          <div className="h-px bg-line my-1" />

          <div className="flex flex-col gap-0.5">
            <button className="flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-ink-2 hover:bg-bone-2 hover:text-ink transition-colors text-left w-full">
              <div className="w-7 h-7 grid place-items-center rounded-md bg-bone border border-dashed border-line text-muted shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <span className="font-medium">Create workspace</span>
            </button>
            <Link 
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-ink-2 hover:bg-bone-2 hover:text-ink transition-colors text-left w-full"
            >
              <div className="w-7 h-7 grid place-items-center rounded-md bg-bone text-muted shrink-0">
                <Settings className="w-4 h-4" />
              </div>
              <span className="font-medium">Workspace settings</span>
            </Link>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
