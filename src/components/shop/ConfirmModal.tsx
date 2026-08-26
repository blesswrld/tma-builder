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

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          key="confirm-modal-container"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        >
          <motion.div
            key="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-[70]"
          />
          <motion.div
            key="confirm-panel"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="max-w-sm w-full bg-app-card border border-app-border rounded-2xl p-6 text-app-primary shadow-2xl space-y-5 relative z-[70]"
          >
            <div className="space-y-2">
              <h3 className="text-sm font-bold tracking-tight text-app-primary flex items-center gap-2 font-mono">
                <AlertCircle size={16} className={isDangerous ? "text-rose-500" : "text-app-muted"} />
                {title}
              </h3>
              <p className="text-xs text-app-secondary leading-relaxed font-sans">
                {message}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-app-surface border border-app-border text-app-primary rounded-xl hover:bg-app-hover text-xs font-mono transition-colors cursor-pointer"
              >
                {cancelText}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={onConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-sm ${
                  isDangerous
                    ? "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20"
                    : "bg-app-accent text-app-accent-fg hover:opacity-90"
                }`}
              >
                {confirmText}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
