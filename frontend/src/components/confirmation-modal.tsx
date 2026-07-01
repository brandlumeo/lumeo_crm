"use client";

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useEffect } from "react";

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "success";
  loading?: boolean;
}

export function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmationModalProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open) return null;

  const icons = {
    danger: <XCircle className="w-6 h-6 text-red-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-500" />,
    info: <Info className="w-6 h-6 text-blue-500" />,
    success: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
  };

  const buttonClasses = {
    danger: "bg-red-500 hover:bg-red-600 text-white",
    warning: "bg-amber-500 hover:bg-amber-600 text-white",
    info: "bg-blue-500 hover:bg-blue-600 text-white",
    success: "bg-emerald-500 hover:bg-emerald-600 text-white",
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-paper border border-line shadow-2xl rounded-xl w-full max-w-[400px] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full flex-shrink-0 ${
              variant === "danger" ? "bg-red-500/10" :
              variant === "warning" ? "bg-amber-500/10" :
              variant === "info" ? "bg-blue-500/10" :
              "bg-emerald-500/10"
            }`}>
              {icons[variant]}
            </div>
            <div className="pt-1">
              <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
              {description && (
                <p className="mt-2 text-[13px] text-muted leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-bone/50 px-6 py-4 flex items-center justify-end gap-3 border-t border-line-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn btn-secondary px-4 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`btn px-4 border border-transparent shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses[variant]}`}
          >
            {loading ? "Confirming..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
