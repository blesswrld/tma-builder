import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle } from "lucide-react";
import { useScrollLock } from "../../hooks/useScrollLock";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  isDangerous = false,
  onConfirm,
  onCancel,
}) => {
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[70] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="max-w-sm w-full bg-app-card border border-app-border rounded-2xl p-6 text-app-primary shadow-2xl space-y-5"
        >
          <div className="space-y-2">
            <h3 className="text-sm font-bold tracking-tight text-app-primary flex items-center gap-2 font-mono">
              <AlertCircle size={16} className="text-app-muted" />
              {title}
            </h3>
            <p className="text-xs text-app-secondary leading-relaxed font-sans">
              {message}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-app-surface border border-app-border text-app-primary rounded-xl hover:bg-app-hover text-xs font-mono transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer bg-app-accent text-app-accent-fg hover:opacity-90 shadow-sm"
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
