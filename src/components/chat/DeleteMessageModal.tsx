import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2, User, Users, X, Loader2 } from "lucide-react";
import { ChatMessage } from "../../types";
import { useScrollLock } from "../../hooks/useScrollLock";

interface DeleteMessageModalProps {
  isOpen: boolean;
  message: ChatMessage | null;
  mode: "for_all" | "for_me" | null;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isDeleting?: boolean;
}

export const DeleteMessageModal: React.FC<DeleteMessageModalProps> = ({
  isOpen,
  message,
  mode,
  onClose,
  onConfirm,
  isDeleting = false
}) => {
  useScrollLock(isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !message || !mode) return null;

  const isForAll = mode === "for_all";

  const modalContent = (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      {/* Dark overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={isDeleting ? undefined : onClose}
      />

      {/* Modal Dialog Card */}
      <div 
        className="relative w-full max-w-sm bg-app-card border border-app-border rounded-2xl shadow-2xl overflow-hidden z-[10002] flex flex-col animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-app-border bg-app-surface">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              isForAll 
                ? "bg-rose-500/15 text-rose-500 border-rose-500/25" 
                : "bg-amber-500/15 text-amber-500 border-amber-500/25"
            }`}>
              {isForAll ? <Users size={16} /> : <User size={16} />}
            </div>
            <div>
              <h3 className="text-xs font-bold text-app-primary">
                {isForAll ? "Удалить для всех?" : "Удалить у себя?"}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-app-muted hover:text-app-primary p-1 rounded-lg hover:bg-app-hover transition cursor-pointer disabled:opacity-50"
            title="Закрыть"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Message excerpt */}
          {message.text && (
            <div className="p-2.5 rounded-xl bg-app-surface border border-app-border text-[11px] text-app-primary line-clamp-2 italic">
              "{message.text}"
            </div>
          )}

          {/* Description */}
          <p className="text-xs text-app-muted leading-relaxed">
            {isForAll
              ? "Сообщение будет безвозвратно удалено для всех участников диалога."
              : "Сообщение исчезнет только из вашей истории переписки. Собеседник продолжит его видеть."}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-app-border bg-app-surface">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-app-muted hover:text-app-primary hover:bg-app-hover transition cursor-pointer disabled:opacity-50"
          >
            Отмена
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
              isForAll
                ? "bg-rose-600 hover:bg-rose-700 active:scale-95"
                : "bg-amber-600 hover:bg-amber-700 active:scale-95"
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Удаление...</span>
              </>
            ) : (
              <span>{isForAll ? "Удалить у всех" : "Удалить у себя"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default DeleteMessageModal;
