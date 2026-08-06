import React, { FormEvent } from "react";
import { Tag, Trash2, X } from "lucide-react";

interface Promocode {
  id: string;
  code: string;
  discountPercent: number;
  discountAmount: number;
  usedCount: number;
  usageLimit?: number;
}

interface AdminPromocodesTabProps {
  promocodes: Promocode[];
  handleDeletePromocode: (id: string) => void;
  isCreatingPromo: boolean;
  setIsCreatingPromo: (creating: boolean) => void;
  promoError: string | null;
  newPromoData: {
    code: string;
    discountPercent: string;
    discountAmount: string;
    usageLimit: string;
  };
  setNewPromoData: React.Dispatch<
    React.SetStateAction<{
      code: string;
      discountPercent: string;
      discountAmount: string;
      usageLimit: string;
    }>
  >;
  handleCreatePromocode: (e: FormEvent) => void;
}

export function AdminPromocodesTab({
  promocodes,
  handleDeletePromocode,
  isCreatingPromo,
  setIsCreatingPromo,
  promoError,
  newPromoData,
  setNewPromoData,
  handleCreatePromocode,
}: AdminPromocodesTabProps) {
  return (
    <div className="space-y-6">
      {promocodes.length === 0 ? (
        <div className="py-16 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
          <Tag size={28} className="mx-auto text-app-muted mb-2" />
          <p className="text-xs text-app-muted font-mono">
            Нет активных промокодов.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promocodes.map((promo) => (
            <div
              key={promo.id}
              className="p-5 rounded-2xl bg-app-surface border border-app-border flex justify-between items-start"
            >
              <div className="space-y-2.5">
                <div>
                  <span className="inline-block px-2.5 py-1 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-lg uppercase shadow-sm">
                    {promo.code}
                  </span>
                </div>
                <p className="text-xs text-app-primary font-mono">
                  Скидка:{" "}
                  <span className="font-semibold text-app-primary">
                    {promo.discountPercent > 0
                      ? `${promo.discountPercent}%`
                      : `${promo.discountAmount} ₽`}
                  </span>
                </p>
                <p className="text-[11px] text-app-muted font-mono">
                  Использован: {promo.usedCount} раз{" "}
                  {promo.usageLimit ? `/ лимит ${promo.usageLimit}` : ""}
                </p>
              </div>
              <button
                onClick={() => handleDeletePromocode(promo.id)}
                className="p-1.5 text-app-muted hover:text-rose-400 cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Promo Modal */}
      {isCreatingPromo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-6 text-app-primary space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <h3 className="text-sm font-semibold font-mono">Создать промокод</h3>
              <button
                onClick={() => setIsCreatingPromo(false)}
                className="text-app-muted hover:text-app-primary cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            {promoError && (
              <p className="text-xs text-rose-400 font-mono">{promoError}</p>
            )}
            <form onSubmit={handleCreatePromocode} className="space-y-3 font-sans">
              <input
                type="text"
                value={newPromoData.code}
                onChange={(e) =>
                  setNewPromoData((p) => ({
                    ...p,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="ПРОМОКОД (напр. SALE20) *"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none font-mono uppercase"
              />
              <input
                type="number"
                value={newPromoData.discountPercent}
                onChange={(e) =>
                  setNewPromoData((p) => ({
                    ...p,
                    discountPercent: e.target.value,
                  }))
                }
                placeholder="Процент скидки (%)"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none font-mono"
              />
              <input
                type="number"
                value={newPromoData.discountAmount}
                onChange={(e) =>
                  setNewPromoData((p) => ({
                    ...p,
                    discountAmount: e.target.value,
                  }))
                }
                placeholder="Фиксированная скидка (₽)"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none font-mono"
              />
              <input
                type="number"
                value={newPromoData.usageLimit}
                onChange={(e) =>
                  setNewPromoData((p) => ({ ...p, usageLimit: e.target.value }))
                }
                placeholder="Лимит использований (опционально)"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none font-mono"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 uppercase cursor-pointer"
              >
                Создать промокод
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
