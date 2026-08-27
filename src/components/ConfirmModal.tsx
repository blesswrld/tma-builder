import React from "react";
import { AlertTriangle, Info, CheckCircle2, X } from "lucide-react";
import { useScrollLock } from "../hooks/useScrollLock";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  variant = "danger",
  isLoading = false
}: ConfirmModalProps) {
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      icon: AlertTriangle,
      btnBg: "bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-sm font-semibold"
    },
    warning: {
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      icon: AlertTriangle,
      btnBg: "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-sm font-semibold"
    },
    info: {
      iconBg: "bg-app-primary/10 text-app-primary border-app-primary/20",
      icon: Info,
      btnBg: "bg-app-primary hover:opacity-90 text-app-bg border-app-primary font-semibold"
    }
  }[variant];

  const IconComponent = variantStyles.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-app-surface border border-app-border rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-app-muted hover:text-app-primary p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl border shrink-0 ${variantStyles.iconBg}`}
          >
            <IconComponent size={20} />
          </div>
          <div className="space-y-1 pr-4">
            <h3 className="text-base font-semibold text-app-primary leading-tight">
              {title}
            </h3>
            <div className="text-xs text-app-secondary leading-relaxed pt-1">
              {message}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-app-border/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-app-card hover:bg-app-bg border border-app-border text-app-secondary hover:text-app-primary text-xs font-medium rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 border text-xs font-medium rounded-xl transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 ${variantStyles.btnBg}`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
