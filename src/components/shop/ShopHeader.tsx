import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Sun, Moon, Star, Receipt, Bug, Compass } from "lucide-react";
import { Shop } from "../../types";
import { useLanguage } from "../../context/LanguageContext";
import { ResponsiveImage } from "../common/ResponsiveImage";

interface ShopHeaderProps {
  shop: Shop;
  theme: string;
  toggleTheme?: () => void;
  onToggleTheme?: () => void;
  favoritesCount?: number;
  onOpenInfoModal?: () => void;
  onOpenReviews: () => void;
  onOpenMyOrders: () => void;
  onOpenReport?: () => void;
  onOpenMusic?: () => void;
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
  const { t } = useLanguage();
  const handleToggleTheme = onToggleTheme || toggleTheme || (() => {});
  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-40 bg-app-surface/90 backdrop-blur-md border-b border-app-border shadow-xs text-app-primary transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Shop Avatar & Name */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs sm:text-sm shrink-0 overflow-hidden border border-app-border shadow-xs ${
              shop.logoUrl ? "bg-transparent" : "bg-app-card text-app-primary"
            }`}
          >
            {shop.logoUrl ? (
              <ResponsiveImage
                src={shop.logoUrl}
                alt={shop.name}
                preset="avatar"
                className="w-full h-full object-cover"
              />
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
            <p className="text-[10px] sm:text-[11px] font-mono text-app-muted truncate max-w-[120px] sm:max-w-xs">
              {shop.workingHours || (shop.isOpen !== false ? t("shop.open", "Открыто") : t("shop.closed", "Закрыто"))}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Explore Catalog link */}
          <Link
            to="/explore"
            className="h-8 px-2.5 rounded-lg text-xs transition-all flex items-center gap-1.5 font-mono font-medium cursor-pointer shrink-0 bg-app-card hover:bg-app-hover text-app-secondary hover:text-emerald-500 border border-app-border shadow-2xs"
            title="Каталог всех заведений"
          >
            <Compass size={13} className="text-emerald-500 shrink-0" />
            <span className="hidden min-[500px]:inline">Все заведения</span>
          </Link>

          {/* Theme switcher */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={handleToggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-app-secondary hover:text-app-primary hover:bg-app-hover bg-app-card border border-app-border transition-all cursor-pointer shrink-0 shadow-2xs"
            title={isDark ? t("btn.theme_light", "Переключить на светлую тему") : t("btn.theme_dark", "Переключить на тёмную тему")}
          >
            {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-app-secondary" />}
          </motion.button>

          {/* Reviews button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onOpenReviews}
            className="h-8 px-2.5 rounded-lg text-xs transition-all flex items-center gap-1.5 font-mono font-medium cursor-pointer shrink-0 bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border shadow-2xs"
            title={t("shop.reviews", "Отзывы")}
          >
            <Star size={13} className="text-amber-400 shrink-0" />
            <span className="hidden min-[440px]:inline">{t("shop.reviews", "Отзывы")}</span>
          </motion.button>

          {/* Orders History button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onOpenMyOrders}
            className="h-8 px-2.5 rounded-lg text-xs transition-all flex items-center gap-1.5 font-mono font-medium cursor-pointer shrink-0 bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border shadow-2xs"
            title={t("shop.orders", "Заказы")}
          >
            <Receipt size={13} className="text-app-muted shrink-0" />
            <span className="hidden min-[440px]:inline">{t("shop.orders", "Заказы")}</span>
          </motion.button>

          {/* Bug / Feedback report */}
          {onOpenReport && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={onOpenReport}
              className="w-8 h-8 rounded-lg text-xs transition-all flex items-center justify-center font-mono cursor-pointer shrink-0 bg-app-card hover:bg-app-hover text-app-muted hover:text-app-primary border border-app-border shadow-2xs"
              title={t("btn.bug_report", "Сообщить об ошибке")}
            >
              <Bug size={14} className="shrink-0" />
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
};
