import React from "react";
import { Sun, Moon, Star, Receipt } from "lucide-react";
import { Shop } from "../../types";

interface ShopHeaderProps {
  shop: Shop;
  theme: string;
  toggleTheme?: () => void;
  onToggleTheme?: () => void;
  onOpenReviews: () => void;
  onOpenMyOrders: () => void;
}

export const ShopHeader: React.FC<ShopHeaderProps> = ({
  shop,
  theme,
  toggleTheme,
  onToggleTheme,
  onOpenReviews,
  onOpenMyOrders,
}) => {
  const handleToggleTheme = onToggleTheme || toggleTheme || (() => {});
  return (
    <header className="sticky top-0 z-40 bg-app-bg/80 backdrop-blur-xl border-b border-app-border">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 min-h-[3.75rem] sm:h-16 py-2 sm:py-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-app-card border border-app-border flex items-center justify-center font-mono font-bold text-xs sm:text-sm text-app-primary shrink-0 shadow-sm">
            {shop.logoUrl ? (
              <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              shop.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-app-primary truncate">{shop.name}</h1>
              <span className={`w-2 h-2 rounded-full shrink-0 ${shop.isOpen !== false ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-rose-500"}`} />
            </div>
            <p className="text-[10px] sm:text-[11px] text-app-muted font-mono truncate max-w-[120px] sm:max-w-xs">
              {shop.workingHours || (shop.isOpen !== false ? "Открыто" : "Закрыто")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleTheme}
            className="p-2 text-app-muted hover:text-app-primary hover:bg-app-hover rounded-xl transition-all cursor-pointer shrink-0"
            title={theme === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
          >
            {theme === "dark" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />}
          </button>

          <button
            type="button"
            onClick={onOpenReviews}
            className="px-3 py-1.5 rounded-xl bg-app-surface hover:bg-app-hover text-xs text-app-secondary hover:text-app-primary transition-all flex items-center gap-1.5 font-mono font-medium cursor-pointer shrink-0"
          >
            <Star size={13} className="text-amber-500 fill-amber-500 shrink-0" />
            <span className="hidden xs:inline sm:inline">Отзывы</span>
          </button>

          <button
            type="button"
            onClick={onOpenMyOrders}
            className="px-3 py-1.5 rounded-xl bg-app-surface hover:bg-app-hover text-xs text-app-secondary hover:text-app-primary transition-all flex items-center gap-1.5 font-mono font-medium cursor-pointer shrink-0"
          >
            <Receipt size={13} className="text-app-muted shrink-0" />
            <span className="hidden xs:inline sm:inline">Заказы</span>
          </button>
        </div>
      </div>
    </header>
  );
};
