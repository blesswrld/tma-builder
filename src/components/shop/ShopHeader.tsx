import React from "react";
import { motion } from "motion/react";
import { Sun, Moon, Star, Receipt, Bug } from "lucide-react";
import { Shop } from "../../types";

interface ShopHeaderProps {
  shop: Shop;
  theme: string;
  toggleTheme?: () => void;
  onToggleTheme?: () => void;
  onOpenReviews: () => void;
  onOpenMyOrders: () => void;
  onOpenReport?: () => void;
}

export const ShopHeader: React.FC<ShopHeaderProps> = ({
  shop,
  theme,
  toggleTheme,
  onToggleTheme,
  onOpenReviews,
  onOpenMyOrders,
  onOpenReport,
}) => {
  const handleToggleTheme = onToggleTheme || toggleTheme || (() => {});
  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-40 bg-app-surface/90 backdrop-blur-md border-b border-app-border shadow-xs text-app-primary transition-colors">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Shop Avatar & Name */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs sm:text-sm shrink-0 overflow-hidden border border-app-border ${
              shop.logoUrl ? "bg-transparent" : "bg-app-card text-app-primary"
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
              <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-app-primary truncate">
                {shop.name}
              </h1>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  shop.isOpen !== false ? "bg-emerald-500" : "bg-zinc-400"
                }`}
              />
            </div>
            <p className="text-[10px] sm:text-[11px] font-mono text-app-muted truncate max-w-[110px] sm:max-w-xs">
              {shop.workingHours || (shop.isOpen !== false ? "Открыто" : "Закрыто")}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Theme switcher */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleToggleTheme}
            className="p-1.5 sm:p-2 rounded-xl text-app-secondary hover:text-app-primary hover:bg-app-hover border border-app-border/40 transition-all cursor-pointer shrink-0"
            title={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
          >
            {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-app-secondary" />}
          </motion.button>

          {/* Reviews button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onOpenReviews}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 font-mono font-medium cursor-pointer shrink-0 bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border"
            title="Отзывы заведения"
          >
            <Star size={13} className="text-amber-400 shrink-0" />
            <span className="hidden min-[440px]:inline">Отзывы</span>
          </motion.button>

          {/* Orders History button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onOpenMyOrders}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 font-mono font-medium cursor-pointer shrink-0 bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border"
            title="Мои заказы"
          >
            <Receipt size={13} className="text-app-muted shrink-0" />
            <span className="hidden min-[440px]:inline">Заказы</span>
          </motion.button>

          {/* Bug / Feedback report */}
          {onOpenReport && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={onOpenReport}
              className="p-1.5 sm:p-2 rounded-xl text-xs transition-all flex items-center justify-center font-mono cursor-pointer shrink-0 bg-app-card hover:bg-app-hover text-app-muted hover:text-app-primary border border-app-border"
              title="Сообщить об ошибке / отзыв"
            >
              <Bug size={14} className="shrink-0" />
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
};
