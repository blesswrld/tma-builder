import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Phone,
  ShoppingBag,
  DollarSign,
  Search,
  Pencil,
  Trash2,
  X,
  Check,
  Award,
  AlertTriangle
} from "lucide-react";

export interface Customer {
  id: string;
  name?: string;
  phone: string;
  bonusBalance?: number;
  ordersCount?: number;
  totalSpent?: number;
  createdAt?: string;
}

interface AdminCustomersTabProps {
  customers: Customer[];
  shopId?: string;
  token?: string | null;
  requestConfirm?: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string,
    isDangerous?: boolean
  ) => void;
  showToast?: (message: string, type?: "success" | "error" | "warning" | "info") => void;
  onCustomerUpdated?: () => void;
}

export function AdminCustomersTab({
  customers = [],
  shopId,
  token,
  requestConfirm,
  showToast,
  onCustomerUpdated
}: AdminCustomersTabProps) {
  const [search, setSearch] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBonus, setEditBonus] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  });

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditName(customer.name || "");
    setEditPhone(customer.phone || "");
    setEditBonus(customer.bonusBalance || 0);
  };

  const handleCloseEdit = () => {
    setEditingCustomer(null);
    setEditName("");
    setEditPhone("");
    setEditBonus(0);
    setIsSubmitting(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !shopId) return;

    const trimmedName = editName.trim();
    const trimmedPhone = editPhone.trim();

    if (!trimmedName) {
      showToast?.("Имя клиента не может быть пустым", "warning");
      return;
    }
    if (!trimmedPhone) {
      showToast?.("Номер телефона не может быть пустым", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/shops/${shopId}/customers/${editingCustomer.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone,
          bonusBalance: Number(editBonus) || 0
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Не удалось обновить данные клиента");
      }

      showToast?.("Данные клиента успешно обновлены", "success");
      handleCloseEdit();
      onCustomerUpdated?.();
    } catch (err: any) {
      console.error("Ошибка сохранения клиента:", err);
      showToast?.(err.message || "Ошибка при сохранении клиента", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (customer: Customer) => {
    if (!shopId) return;

    const performDelete = async () => {
      setDeletingId(customer.id);
      try {
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/shops/${shopId}/customers/${customer.id}`, {
          method: "DELETE",
          headers
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Не удалось удалить клиента");
        }

        showToast?.(`Клиент «${customer.name || customer.phone}» удален`, "success");
        onCustomerUpdated?.();
      } catch (err: any) {
        console.error("Ошибка удаления клиента:", err);
        showToast?.(err.message || "Ошибка при удалении клиента", "error");
      } finally {
        setDeletingId(null);
      }
    };

    if (requestConfirm) {
      requestConfirm(
        "Удалить клиента",
        `Вы уверены, что хотите удалить клиента «${customer.name || "Клиент"}» (${customer.phone})? Данные о заказах останутся в архиве.`,
        performDelete,
        "Удалить клиента",
        true
      );
    } else {
      if (window.confirm(`Удалить клиента ${customer.name || customer.phone}?`)) {
        performDelete();
      }
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Search & Stats Header */}
      {customers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-app-surface border border-app-border rounded-2xl">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск клиентов по имени или номеру телефона..."
              className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-3 py-2 text-xs text-app-primary placeholder:text-app-muted/60 focus:outline-none focus:border-app-border font-sans transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-primary text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-[11px] font-mono text-app-muted px-1 sm:px-2 shrink-0 flex items-center gap-2">
            <span>
              Всего клиентов: <strong className="text-app-primary font-bold">{customers.length}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Empty States */}
      {customers.length === 0 ? (
        <div className="py-16 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
          <User size={28} className="mx-auto text-app-muted mb-2 opacity-60" />
          <p className="text-xs text-app-muted font-mono">Клиенты пока не зарегистрированы.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
          <p className="text-xs text-app-muted font-mono">По запросу «{search}» ничего не найдено.</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (< sm) */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {filtered.map((c, idx) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.03 }}
                className="p-4 rounded-2xl bg-app-surface border border-app-border space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-app-card border border-app-border flex items-center justify-center font-mono font-bold text-xs text-app-primary shrink-0">
                      {c.name ? c.name.charAt(0).toUpperCase() : "К"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-xs text-app-primary truncate font-sans">
                          {c.name || "Клиент"}
                        </p>
                        {(c.bonusBalance || 0) > 0 && (
                          <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold shrink-0">
                            {c.bonusBalance} Б
                          </span>
                        )}
                      </div>
                      <a
                        href={`tel:${c.phone}`}
                        className="text-[11px] text-app-secondary hover:text-app-primary font-mono flex items-center gap-1 mt-0.5"
                      >
                        <Phone size={11} className="text-app-muted shrink-0" />
                        <span className="truncate">{c.phone}</span>
                      </a>
                    </div>
                  </div>

                  {/* Actions for Mobile */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-secondary hover:text-app-primary rounded-lg transition-colors cursor-pointer"
                      title="Редактировать клиента"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      disabled={deletingId === c.id}
                      className="p-1.5 bg-app-card hover:bg-rose-500/10 border border-app-border hover:border-rose-500/30 text-app-muted hover:text-rose-500 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title="Удалить клиента"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-app-border font-mono text-xs">
                  <div className="flex items-center gap-1 text-app-muted text-[11px]">
                    <ShoppingBag size={12} className="text-app-muted" />
                    <span>Заказов:</span>
                    <strong className="text-app-primary font-bold">{c.ordersCount || 1}</strong>
                  </div>
                  <div className="text-emerald-500 font-bold font-mono text-xs flex items-center gap-1">
                    <DollarSign size={12} className="text-emerald-500" />
                    <span>{(c.totalSpent || 0).toLocaleString("ru-RU")} ₽</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop Table View (>= sm) */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-app-border bg-app-surface shadow-xs">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-app-card border-b border-app-border text-app-muted uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Клиент</th>
                  <th className="p-3.5">Телефон</th>
                  <th className="p-3.5">Заказов</th>
                  <th className="p-3.5">Бонусы</th>
                  <th className="p-3.5 text-right">Всего потрачено</th>
                  <th className="p-3.5 text-right w-24">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-app-hover transition-colors group">
                    <td className="p-3.5 text-app-primary font-semibold">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-app-card border border-app-border flex items-center justify-center text-[10px] font-bold text-app-primary shrink-0">
                          {c.name ? c.name.charAt(0).toUpperCase() : "К"}
                        </div>
                        <span className="truncate">{c.name || "Клиент"}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-app-muted">
                      <a href={`tel:${c.phone}`} className="hover:text-app-primary transition-colors">
                        {c.phone}
                      </a>
                    </td>
                    <td className="p-3.5 text-app-primary font-semibold">{c.ordersCount || 1}</td>
                    <td className="p-3.5">
                      {(c.bonusBalance || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">
                          <Award size={11} /> {c.bonusBalance} Б
                        </span>
                      ) : (
                        <span className="text-app-muted text-[11px]">0 Б</span>
                      )}
                    </td>
                    <td className="p-3.5 text-emerald-500 font-bold text-right">
                      {(c.totalSpent || 0).toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-secondary hover:text-app-primary rounded-lg transition-colors cursor-pointer"
                          title="Редактировать клиента"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          disabled={deletingId === c.id}
                          className="p-1.5 bg-app-card hover:bg-rose-500/10 border border-app-border hover:border-rose-500/30 text-app-muted hover:text-rose-500 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          title="Удалить клиента"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Edit Customer Modal */}
      <AnimatePresence>
        {editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-app-surface border border-app-border rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 font-sans"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-app-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-app-card text-app-primary rounded-xl border border-app-border">
                    <Pencil size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-app-primary">
                      Редактировать данные клиента
                    </h3>
                    <p className="text-xs text-app-muted font-mono">
                      Изменение профиля и баланса в CRM
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="p-1.5 text-app-muted hover:text-app-primary rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleSaveEdit} className="space-y-3.5">
                {/* Name Field */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-app-secondary">
                    Имя клиента <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Например: Иван Иванов"
                      className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-3 py-2 text-xs text-app-primary placeholder:text-app-muted/60 focus:outline-none focus:border-app-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Phone Field */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-app-secondary">
                    Номер телефона <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
                    <input
                      type="text"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+7 (999) 000-00-00"
                      className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-app-primary placeholder:text-app-muted/60 focus:outline-none focus:border-app-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Bonus Balance Field */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-app-secondary flex items-center justify-between">
                    <span>Бонусный баланс</span>
                    <span className="text-[10.5px] font-mono text-app-muted">Баллы заведения</span>
                  </label>
                  <div className="relative">
                    <Award size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editBonus}
                      onChange={(e) => setEditBonus(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-app-primary placeholder:text-app-muted/60 focus:outline-none focus:border-app-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Info Note */}
                <p className="text-[11px] text-app-muted font-mono bg-app-card p-2.5 rounded-xl border border-app-border">
                  Обновление номера или имени синхронизирует профиль клиента и свяжет историю его покупок.
                </p>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-border">
                  <button
                    type="button"
                    onClick={handleCloseEdit}
                    disabled={isSubmitting}
                    className="px-3.5 py-2 text-xs font-mono text-app-secondary hover:text-app-primary bg-app-card hover:bg-app-hover border border-app-border rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-mono font-bold bg-app-accent text-app-accent-fg hover:opacity-90 rounded-xl transition-opacity flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Сохранение...</span>
                    ) : (
                      <>
                        <Check size={14} className="text-app-accent-fg shrink-0" />
                        <span>Сохранить</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
