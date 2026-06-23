"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function Drawer({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed right-0 top-0 z-50 flex h-full w-full sm:max-w-xl flex-col bg-paper shadow-2xl animate-rise">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <DialogPrimitive.Title className="font-serif text-lg font-medium text-ink">
              Details
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none">
              <X className="h-5 w-5 text-ink" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto bg-bone-2/30 p-6 custom-scrollbar">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
