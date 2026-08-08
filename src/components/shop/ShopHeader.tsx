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
  const isDark = theme === "dark";

  return (
    <header
      className={`sticky top-0 z-40 transition-colors ${
        isDark
          ? "bg-zinc-900 border-b border-zinc-800 shadow-md text-white"
          : "bg-white border-b border-zinc-200/80 shadow-sm text-zinc-900"
      }`}
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-6 min-h-[3.75rem] sm:h-16 py-2 sm:py-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs sm:text-sm shrink-0 overflow-hidden ${
              shop.logoUrl
                ? "bg-transparent"
                : isDark
                ? "bg-zinc-800 text-white"
                : "bg-zinc-100 text-zinc-900"
            }`}
          >
            {shop.logoUrl ? (
              <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover" />
            ) : (
              shop.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h1
                className={`text-xs sm:text-sm font-semibold tracking-tight truncate ${
                  isDark ? "text-white" : "text-zinc-900"
                }`}
              >
                {shop.name}
              </h1>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  shop.isOpen !== false ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-rose-500"
                }`}
              />
            </div>
            <p
              className={`text-[10px] sm:text-[11px] font-mono truncate max-w-[120px] sm:max-w-xs ${
                isDark ? "text-zinc-400" : "text-zinc-500"
              }`}
            >
              {shop.workingHours || (shop.isOpen !== false ? "Открыто" : "Закрыто")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleTheme}
            className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
              isDark
                ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
            title={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
          >
            {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-500" />}
          </button>

          <button
            type="button"
            onClick={onOpenReviews}
            className={`px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 font-mono font-medium cursor-pointer shrink-0 border ${
              isDark
                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                : "bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 hover:text-zinc-900 border-zinc-200/80"
            }`}
          >
            <Star size={13} className="text-amber-500 fill-amber-500 shrink-0" />
            <span className="hidden xs:inline sm:inline">Отзывы</span>
          </button>

          <button
            type="button"
            onClick={onOpenMyOrders}
            className={`px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 font-mono font-medium cursor-pointer shrink-0 border ${
              isDark
                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                : "bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 hover:text-zinc-900 border-zinc-200/80"
            }`}
          >
            <Receipt size={13} className={isDark ? "text-zinc-400 shrink-0" : "text-zinc-500 shrink-0"} />
            <span className="hidden xs:inline sm:inline">Заказы</span>
          </button>
        </div>
      </div>
    </header>
  );
};
