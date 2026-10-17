import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Trash2,
  AlertTriangle,
  CheckSquare,
  Square,
  Lock,
  Store,
  X,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Layers,
  Search,
  Users
} from "lucide-react";
import { useEffect } from "react";
import { Shop } from "../../types";

export interface AdminBatchDeleteShopsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shops: Shop[];
  currentUserId?: string | null;
  isDeveloperUser?: boolean;
  myDeviceShopIds?: string[];
  onBatchDeleteSuccess: (deletedIds: string[]) => void;
  token?: string | null;
}

export const AdminBatchDeleteShopsModal: React.FC<AdminBatchDeleteShopsModalProps> = ({
  isOpen,
  onClose,
  shops,
  currentUserId,
  isDeveloperUser = false,
  myDeviceShopIds = [],
  onBatchDeleteSuccess,
  token
}) => {
  const [activeTab, setActiveTab] = useState<"select" | "all">("select");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmWord, setConfirmWord] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
      setConfirmWord("");
      setErrorMessage(null);
      setSearchQuery("");
      setActiveTab("select");
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  // Helper: check if shop is owned by current user
  const isShopOwned = (s: Shop): boolean => {
    if (isDeveloperUser) return true;
    if (s.currentUserRole === "OWNER") return true;
    if (currentUserId && s.ownerId === currentUserId) return true;
    if (currentUserId && s.owner?.id === currentUserId) return true;
    if (!currentUserId && myDeviceShopIds.includes(s.id)) return true;
    return false;
  };

  const ownedShops = useMemo(() => {
    return shops.filter(isShopOwned);
  }, [shops, currentUserId, isDeveloperUser, myDeviceShopIds]);

  const invitedShops = useMemo(() => {
    return shops.filter(s => !isShopOwned(s));
  }, [shops, currentUserId, isDeveloperUser]);

  const filteredShops = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return shops;
    return shops.filter(
      s => s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q)
    );
  }, [shops, searchQuery]);

  const toggleSelect = (id: string, canDelete: boolean) => {
    if (!canDelete) return;
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllOwned = () => {
    const allOwnedIds = ownedShops.map(s => s.id);
    setSelectedIds(allOwnedIds);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0 || isDeleting) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/shops/batch-delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ shopIds: selectedIds })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Не удалось выполнить удаление заведений.");
      }

      const deletedIds = data.deletedIds || selectedIds;
      onBatchDeleteSuccess(deletedIds);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Ошибка при удалении заведений.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllOwned = async () => {
    if (confirmWord.trim().toUpperCase() !== "УДАЛИТЬ" || isDeleting) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/shops/batch-delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ allOwned: true })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Не удалось удалить все созданные заведения.");
      }

      const deletedIds = data.deletedIds || ownedShops.map(s => s.id);
      onBatchDeleteSuccess(deletedIds);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Ошибка при удалении заведений.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto text-app-primary font-sans transition-all"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={e => e.stopPropagation()}
          className="bg-app-modal rounded-3xl max-w-2xl w-full border border-app-border flex flex-col max-h-[90vh] shadow-2xl overflow-hidden relative z-[10000]"
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-app-border flex items-center justify-between bg-app-modal-header rounded-t-3xl shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl shadow-2xs shrink-0 flex items-center justify-center">
                <Trash2 size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold font-mono text-app-primary tracking-tight truncate">
                  Управление и удаление заведений
                </h3>
                <p className="text-xs text-app-muted truncate font-sans mt-0.5">
                  Удаление выбранных заведений или всех созданных заведений сразу
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="p-2 text-app-muted hover:text-app-primary hover:bg-app-hover border border-transparent hover:border-app-border rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-50"
              title="Закрыть"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="px-5 sm:px-6 py-2.5 bg-app-card border-b border-app-border flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 p-0.5 bg-app-surface rounded-xl border border-app-border font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("select");
                  setErrorMessage(null);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                  activeTab === "select"
                    ? "bg-app-accent text-app-accent-fg shadow-2xs"
                    : "text-app-muted hover:text-app-primary"
                }`}
              >
                <CheckSquare size={13} />
                <span>Выбрать конкретные ({selectedIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("all");
                  setErrorMessage(null);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                  activeTab === "all"
                    ? "bg-rose-500 text-white shadow-2xs"
                    : "text-rose-500/80 hover:text-rose-500"
                }`}
              >
                <Trash2 size={13} />
                <span>Удалить все мои ({ownedShops.length})</span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-app-muted hidden sm:flex items-center gap-2">
              <span className="text-emerald-500 font-bold">Мои: {ownedShops.length}</span>
              <span>•</span>
              <span className="text-sky-400 font-medium">Приглашённые: {invitedShops.length}</span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mx-5 sm:mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/25 rounded-2xl flex items-center gap-2.5 text-xs text-rose-500">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Content Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            {/* Security Explanation Note */}
            <div className="p-3 bg-app-card border border-app-border rounded-2xl flex items-start gap-2.5 text-xs">
              <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-sans text-app-secondary">
                <span className="font-bold text-app-primary">Правило безопасности: </span>
                Вы можете удалять <strong className="text-app-primary">только заведения, которые создали сами</strong>. Заведения, в которые вас пригласили в качестве сотрудника или управляющего, защищены от удаления — из них можно только выйти в настройках команды.
              </div>
            </div>

            {activeTab === "select" ? (
              /* TAB 1: Select Specific Venues */
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllOwned}
                      className="px-2.5 py-1 rounded-lg bg-app-surface hover:bg-app-hover border border-app-border text-app-primary transition-colors cursor-pointer text-[11px] font-bold"
                    >
                      Выбрать все мои ({ownedShops.length})
                    </button>
                    {selectedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="px-2.5 py-1 rounded-lg bg-app-surface hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary transition-colors cursor-pointer text-[11px]"
                      >
                        Снять выбор
                      </button>
                    )}
                  </div>

                  <div className="relative min-w-[180px]">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-app-muted" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Поиск по названию..."
                      className="w-full pl-7 pr-2.5 py-1 bg-app-surface border border-app-border rounded-lg text-xs text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-border-focus font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {filteredShops.length === 0 ? (
                    <div className="p-6 text-center text-xs font-mono text-app-muted bg-app-card rounded-2xl border border-app-border">
                      Заведений не найдено
                    </div>
                  ) : (
                    filteredShops.map(shop => {
                      const canDelete = isShopOwned(shop);
                      const isSelected = selectedIds.includes(shop.id);

                      return (
                        <div
                          key={shop.id}
                          onClick={() => toggleSelect(shop.id, canDelete)}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            canDelete
                              ? isSelected
                                ? "bg-rose-500/10 border-rose-500/30 cursor-pointer shadow-2xs"
                                : "bg-app-card border-app-border hover:bg-app-hover hover:border-app-border cursor-pointer"
                              : "bg-app-surface/60 border-app-subtle opacity-65 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {canDelete ? (
                              <div className="text-app-primary shrink-0">
                                {isSelected ? (
                                  <CheckSquare size={18} className="text-rose-500" />
                                ) : (
                                  <Square size={18} className="text-app-muted" />
                                )}
                              </div>
                            ) : (
                              <div className="p-1 rounded bg-app-card border border-app-border text-app-muted shrink-0" title="Приглашённое заведение нельзя удалить">
                                <Lock size={14} />
                              </div>
                            )}

                            <div className="w-8 h-8 rounded-xl bg-app-surface border border-app-border flex items-center justify-center font-mono font-bold text-xs shrink-0 text-app-primary">
                              {shop.name.charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1 font-mono">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold truncate ${isSelected ? "text-rose-400" : "text-app-primary"}`}>
                                  {shop.name}
                                </span>
                                <span className="text-[10px] text-app-muted">/{shop.slug}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-app-muted mt-0.5">
                                <span>{(shop.services || []).length} товаров</span>
                                <span>•</span>
                                <span>{shop._count?.orders ?? 0} заказов</span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right font-mono">
                            {canDelete ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9.5px] font-bold">
                                Моё заведение
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[9.5px] font-medium flex items-center gap-1">
                                <Users size={10} />
                                Приглашён (Сотрудник)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* TAB 2: Delete All Owned Venues */
              <div className="space-y-4">
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-2 font-sans text-xs text-rose-300">
                  <div className="flex items-center gap-2 font-bold text-sm text-rose-400 font-mono">
                    <AlertTriangle size={18} />
                    <span>Внимание: Безвозвратное удаление ВСЕХ ваших заведений</span>
                  </div>
                  <p className="leading-relaxed">
                    Будет безвозвратно удалено <strong>{ownedShops.length}</strong> созданных вами заведений, включая все их меню, историю заказов, клиентскую базу, баннеры, промокоды и отзывы.
                  </p>
                  {invitedShops.length > 0 && (
                    <p className="text-[11px] text-emerald-400 pt-1 border-t border-rose-500/20">
                      ✓ Ваши приглашённые заведения ({invitedShops.length}) <strong>НЕ пострадают</strong> и останутся доступны.
                    </p>
                  )}
                </div>

                <div className="space-y-2 font-sans">
                  <label className="text-xs text-app-muted block">
                    Для подтверждения удаления всех <strong className="text-app-primary">{ownedShops.length}</strong> заведений введите слово <span className="font-mono font-bold text-rose-500">УДАЛИТЬ</span>:
                  </label>
                  <input
                    type="text"
                    value={confirmWord}
                    onChange={e => setConfirmWord(e.target.value)}
                    placeholder="УДАЛИТЬ"
                    className="w-full bg-app-card border border-app-border focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-app-primary font-mono tracking-widest uppercase focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-5 sm:px-6 py-3.5 border-t border-app-border bg-app-modal-header flex items-center justify-between gap-3 shrink-0 rounded-b-3xl">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl bg-app-card hover:bg-app-hover border border-app-border text-app-primary text-xs font-mono transition-colors cursor-pointer disabled:opacity-50"
            >
              Отмена
            </button>

            {activeTab === "select" ? (
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0 || isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs font-mono transition-all cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Удаление...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Удалить выбранные ({selectedIds.length})</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDeleteAllOwned}
                disabled={confirmWord.trim().toUpperCase() !== "УДАЛИТЬ" || ownedShops.length === 0 || isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs font-mono transition-all cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Удаление всех заведений...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Удалить все мои заведения ({ownedShops.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
