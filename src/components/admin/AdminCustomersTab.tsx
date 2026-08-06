import React from "react";

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
  return (
    <div className="space-y-4">
      {customers.length === 0 ? (
        <div className="py-16 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
          <p className="text-xs text-app-muted font-mono">
            Клиенты пока не зарегистрированы.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-app-border bg-app-surface">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-app-card border-b border-app-border text-app-muted uppercase text-[10px]">
              <tr>
                <th className="p-3">Клиент</th>
                <th className="p-3">Телефон</th>
                <th className="p-3">Заказов</th>
                <th className="p-3">Всего потрачено</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-app-hover transition-colors">
                  <td className="p-3 text-app-primary font-semibold">
                    {c.name || "Клиент"}
                  </td>
                  <td className="p-3 text-app-muted">{c.phone}</td>
                  <td className="p-3 text-app-primary">{c.ordersCount || 1}</td>
                  <td className="p-3 text-emerald-500 font-bold">
                    {c.totalSpent || 0} ₽
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
