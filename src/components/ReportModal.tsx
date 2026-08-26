import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Bug,
  Lightbulb,
  HelpCircle,
  Paperclip,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Info,
  Send
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BugReport } from "../types";
import { useScrollLock } from "../hooks/useScrollLock";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId?: string;
  shopName?: string;
  sourceContext?: string;
}

interface AttachedFile {
  name: string;
  size: number;
  type: string;
  url: string;
}

const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_TITLE_LENGTH = 80;
const MAX_FILES = 3;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function ReportModal({
  isOpen,
  onClose,
  shopId,
  shopName,
  sourceContext = "web"
}: ReportModalProps) {
  useScrollLock(isOpen);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<"BUG" | "FEATURE" | "OTHER">("BUG");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Pre-fill contact if user is authenticated
  useEffect(() => {
    if (user?.email && !contact) {
      setContact(user.email);
    }
  }, [user]);

  const resetForm = () => {
    setType("BUG");
    setTitle("");
    setDescription("");
    setAttachments([]);
    setError(null);
    setIsDragOver(false);
    if (user?.email) {
      setContact(user.email);
    } else {
      setContact("");
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetForm();
    setSubmittedReportId(null);
    onClose();
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
      setSubmittedReportId(null);
    }
  }, [isOpen]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const availableSlots = MAX_FILES - attachments.length;
    if (availableSlots <= 0) {
      setError(`Достигнут лимит файлов: максимум ${MAX_FILES} прикрепления.`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, availableSlots);
    if (files.length > availableSlots) {
      setError(`Можно прикрепить ещё только ${availableSlots} файл(а). Лишние пропущены.`);
    }

    filesToProcess.forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`Файл «${file.name}» превышает лимит ${MAX_FILE_SIZE_MB} МБ.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setAttachments((prev) => {
          if (prev.length >= MAX_FILES) return prev;
          return [
            ...prev,
            {
              name: file.name,
              size: file.size,
              type: file.type || "application/octet-stream",
              url: dataUrl
            }
          ];
        });
      };
      reader.onerror = () => {
        setError(`Не удалось прочитать файл «${file.name}».`);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      setError("Пожалуйста, опишите обнаруженную ошибку или ваш вопрос.");
      return;
    }

    if (trimmedDesc.length > MAX_DESCRIPTION_LENGTH) {
      setError(`Описание не должно превышать ${MAX_DESCRIPTION_LENGTH} символов.`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Gather system diagnostic metadata
      const isTg = typeof window !== "undefined" && Boolean((window as any).Telegram?.WebApp?.initData);
      const metadata = {
        url: window.location.href,
        path: window.location.pathname,
        shopId: shopId || null,
        shopName: shopName || null,
        source: sourceContext,
        userAgent: navigator.userAgent,
        screen: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio,
        isTelegramWebApp: isTg,
        timestamp: new Date().toISOString()
      };

      const payload: BugReport = {
        type,
        title: title.trim() || undefined,
        description: trimmedDesc,
        contact: contact.trim() || undefined,
        shopId: shopId || undefined,
        attachments: attachments,
        metadata
      };

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Не удалось отправить репорт.");
      }

      setSubmittedReportId(data.report?.id || "rep_success");
    } catch (err: any) {
      console.error("Report submit error:", err);
      setError(err.message || "Произошла ошибка при отправке. Попробуйте еще раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          key="report-modal-wrapper"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 font-sans"
        >
          <motion.div
            key="report-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-50"
          />
          <motion.div
            key="report-panel"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="bg-app-surface border border-app-border rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative z-50"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header */}
        <div className="px-5 py-4 border-b border-app-border flex items-center justify-between bg-app-card/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-app-card border border-app-border flex items-center justify-center text-app-primary">
              <Bug size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-app-primary">
                Сообщить об ошибке
              </h2>
              <p className="text-[11px] text-app-muted font-mono">
                {shopName ? `Заведение: ${shopName}` : "Обратная связь разработчикам"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl hover:bg-app-hover text-app-muted hover:text-app-primary transition-colors cursor-pointer"
            title="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {submittedReportId ? (
            /* Success State */
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 bg-app-accent/15 text-app-primary border border-app-border rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-app-primary">
                  Спасибо! Репорт успешно отправлен
                </h3>
                <p className="text-xs text-app-secondary max-w-sm mx-auto leading-relaxed">
                  Обращение передано напрямую разработчику платформы (<span className="text-app-primary font-mono font-medium">gelgaev.dev@mail.ru</span>). Информация будет рассмотрена в ближайшее время.
                </p>
              </div>

              <div className="p-3 bg-app-card border border-app-border rounded-xl inline-block max-w-xs text-left text-[11px] font-mono space-y-1 text-app-muted">
                <div>
                  <span className="text-app-secondary">ID обращения:</span>{" "}
                  <span className="text-app-primary font-bold">#{submittedReportId.slice(-8)}</span>
                </div>
                <div>
                  <span className="text-app-secondary">Получатель:</span>{" "}
                  <span className="text-app-primary">gelgaev.dev@mail.ru</span>
                </div>
                <div>
                  <span className="text-app-secondary">Тип:</span>{" "}
                  <span className="text-app-primary">
                    {type === "BUG" ? "Ошибка / Баг" : type === "FEATURE" ? "Предложение" : "Вопрос"}
                  </span>
                </div>
                {attachments.length > 0 && (
                  <div>
                    <span className="text-app-secondary">Файлов прикреплено:</span>{" "}
                    <span className="text-app-primary">{attachments.length}</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-sm"
                >
                  Закрыть
                </button>
              </div>
            </div>
          ) : (
            /* Report Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2 animate-fade-in font-mono">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span className="flex-1">{error}</span>
                </div>
              )}

              {/* Type selector */}
              <div>
                <label className="block text-[11px] font-mono text-app-muted uppercase tracking-wider mb-1.5">
                  Тип обращения
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-app-card rounded-xl border border-app-border text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setType("BUG")}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      type === "BUG"
                        ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                        : "text-app-muted hover:text-app-primary"
                    }`}
                  >
                    <Bug size={13} />
                    <span>Баг / Ошибка</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("FEATURE")}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      type === "FEATURE"
                        ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                        : "text-app-muted hover:text-app-primary"
                    }`}
                  >
                    <Lightbulb size={13} />
                    <span>Идея</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("OTHER")}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      type === "OTHER"
                        ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                        : "text-app-muted hover:text-app-primary"
                    }`}
                  >
                    <HelpCircle size={13} />
                    <span>Другое</span>
                  </button>
                </div>
              </div>

              {/* Subject / Title */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-mono text-app-muted uppercase tracking-wider">
                    Краткая тема (необязательно)
                  </label>
                  <span className="text-[10px] font-mono text-app-muted">
                    {title.length}/{MAX_TITLE_LENGTH}
                  </span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
                  maxLength={MAX_TITLE_LENGTH}
                  placeholder="Например: Не открывается корзина при нажатии..."
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary placeholder:text-app-muted/60 focus:outline-none focus:border-app-muted transition-colors font-sans"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-mono text-app-muted uppercase tracking-wider">
                    Подробное описание <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-app-muted">
                    {description.length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  placeholder="Что именно пошло не так? Какие действия привели к ошибке? Что вы ожидали увидеть?"
                  className="w-full bg-app-card border border-app-border rounded-xl p-3 text-xs text-app-primary placeholder:text-app-muted/60 focus:outline-none focus:border-app-border transition-colors font-sans resize-none leading-relaxed"
                />
              </div>

              {/* File Upload Zone */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-mono text-app-muted uppercase tracking-wider flex items-center gap-1">
                    <Paperclip size={12} />
                    <span>Скриншоты / Файлы (до {MAX_FILES} шт.)</span>
                  </label>
                  <span className="text-[10px] font-mono text-app-muted">
                    {attachments.length}/{MAX_FILES}
                  </span>
                </div>

                {attachments.length < MAX_FILES && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      handleFileSelect(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-3 text-center cursor-pointer transition-all ${
                      isDragOver
                        ? "border-app-primary bg-app-card"
                        : "border-app-border hover:border-app-muted bg-app-card/40 hover:bg-app-card"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.txt,.log,.json"
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center gap-2 text-app-primary text-xs">
                      <Upload size={14} className="text-app-muted" />
                      <span className="font-medium">Прикрепить скриншот или лог</span>
                    </div>
                    <p className="text-[10px] text-app-muted font-mono mt-0.5">
                      PNG, JPG, WEBP, PDF, TXT (макс. {MAX_FILE_SIZE_MB} МБ на файл)
                    </p>
                  </div>
                )}

                {/* Attached files preview list */}
                {attachments.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-app-card border border-app-border rounded-xl flex items-center justify-between gap-2 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {file.type.startsWith("image/") ? (
                            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-app-border bg-app-surface">
                              <img src={file.url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg shrink-0 border border-app-border bg-app-surface flex items-center justify-center text-app-muted">
                              <FileText size={14} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-app-primary truncate text-[11px] font-sans font-medium">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-app-muted">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="p-1 text-app-muted hover:text-app-primary rounded-lg hover:bg-app-hover border border-transparent hover:border-app-border transition-all cursor-pointer shrink-0 backdrop-blur-sm"
                          title="Удалить прикрепленный файл"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact Information (Optional) */}
              <div>
                <label className="block text-[11px] font-mono text-app-muted uppercase tracking-wider mb-1">
                  Контакт для связи (Telegram, Email или телефон)
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value.slice(0, 100))}
                  maxLength={100}
                  placeholder="@username или your@email.com"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary placeholder:text-app-muted/60 focus:outline-none focus:border-app-muted transition-colors font-mono"
                />
              </div>

              {/* System Diagnostics Info Note */}
              <div className="p-2.5 bg-app-card/50 border border-app-border/70 rounded-xl flex items-center gap-2 text-[10px] font-mono text-app-muted">
                <Info size={12} className="shrink-0 text-app-muted" />
                <span>К репорту будут автоматически прикреплены технические параметры браузера и адрес страницы.</span>
              </div>

              {/* Submit & Cancel Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 font-mono text-xs">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-secondary hover:text-app-primary rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Отмена
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSubmitting || !description.trim()}
                  className="px-4 py-2 bg-app-accent hover:opacity-90 text-app-accent-fg font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Отправка...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Отправить</span>
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
    )}
  </AnimatePresence>
  );
}
