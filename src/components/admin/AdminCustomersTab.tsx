import React, { useState } from "react";
import { motion } from "motion/react";
import { User, Phone, ShoppingBag, DollarSign, Search } from "lucide-react";

interface Customer {
  id: string;
  name?: string;
  phone: string;
  ordersCount?: number;
  totalSpent?: number;
}

interface AdminCustomersTabProps {
  customers: Customer[];
}

export function AdminCustomersTab({ customers }: AdminCustomersTabProps) {
  const [search, setSearch] = useState("");

  const filtered = customers.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 font-sans">
      {/* Search Header if customers exist */}
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
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-primary text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-[11px] font-mono text-app-muted px-1 sm:px-2 shrink-0">
            Всего клиентов: <strong className="text-app-primary font-bold">{customers.length}</strong>
          </div>
        </div>
      )}

      {customers.length === 0 ? (
        <div className="py-16 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
          <User size={28} className="mx-auto text-app-muted mb-2 opacity-60" />
          <p className="text-xs text-app-muted font-mono">
            Клиенты пока не зарегистрированы.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
          <p className="text-xs text-app-muted font-mono">
            По запросу «{search}» ничего не найдено.
          </p>
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
                whileHover={{ y: -2 }}
                className="p-4 rounded-2xl bg-app-surface border border-app-border space-y-3 shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-app-card border border-app-border flex items-center justify-center font-mono font-bold text-xs text-app-primary shrink-0">
                      {c.name ? c.name.charAt(0).toUpperCase() : "К"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-app-primary truncate font-sans">
                        {c.name || "Клиент"}
                      </p>
                      <a
                        href={`tel:${c.phone}`}
                        className="text-[11px] text-app-secondary hover:text-app-primary font-mono flex items-center gap-1 mt-0.5"
                      >
                        <Phone size={11} className="text-app-muted shrink-0" />
                        <span className="truncate">{c.phone}</span>
                      </a>
                    </div>
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
                  <th className="p-3.5 text-right">Всего потрачено</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-app-hover transition-colors">
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
                    <td className="p-3.5 text-emerald-500 font-bold text-right">
                      {(c.totalSpent || 0).toLocaleString("ru-RU")} ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
