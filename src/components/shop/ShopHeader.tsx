import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sun, Moon, Receipt, Menu, X, Compass, Info, Bug } from "lucide-react";
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
  onOpenReviews?: () => void;
  onOpenMyOrders: () => void;
  onOpenReport?: () => void;
  onOpenMusic?: () => void;
  onOpenChat?: () => void;
  hasActiveOrder?: boolean;
}

export const ShopHeader: React.FC<ShopHeaderProps> = ({
  shop,
  theme,
  toggleTheme,
  onToggleTheme,
  onOpenInfoModal,
  onOpenMyOrders,
  onOpenReport,
  hasActiveOrder,
}) => {
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggleTheme = onToggleTheme || toggleTheme || (() => {});
  const isDark = theme === "dark";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-40 bg-app-surface/90 backdrop-blur-md border-b border-app-border text-app-primary transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Shop Avatar & Name */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs sm:text-sm shrink-0 overflow-hidden border border-app-border shadow-2xs ${
              shop.logoUrl ? "bg-transparent" : "bg-app-card dark:bg-zinc-800 text-app-primary dark:text-white"
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
              <h1 className="text-sm font-bold tracking-tight text-app-primary dark:text-white truncate">
                {shop.name}
              </h1>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  shop.isOpen !== false ? "bg-emerald-500" : "bg-zinc-400"
                }`}
                title={shop.isOpen !== false ? t("shop.open", "Открыто") : t("shop.closed", "Закрыто")}
              />
            </div>
            <p className="text-[11px] font-mono text-app-muted truncate">
              {shop.workingHours || (shop.isOpen !== false ? t("shop.open", "Открыто") : t("shop.closed", "Закрыто"))}
            </p>
          </div>
        </div>

        {/* Right Actions: Orders & Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative" ref={menuRef}>
          {/* Orders History button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onOpenMyOrders}
            className="h-9 px-3 rounded-xl text-xs transition-all flex items-center gap-2 font-mono font-medium cursor-pointer shrink-0 bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border shadow-2xs relative"
            title={t("shop.orders", "Заказы")}
          >
            <Receipt size={14} className="text-app-muted shrink-0" />
            <span className="hidden sm:inline">{t("shop.orders", "Заказы")}</span>
            {hasActiveOrder && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse absolute -top-0.5 -right-0.5" />
            )}
          </motion.button>

          {/* Menu / Settings dropdown trigger */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs border ${
              isMenuOpen
                ? "bg-app-accent text-app-accent-fg border-app-accent"
                : "bg-app-card text-app-secondary hover:text-app-primary hover:bg-app-hover border-app-border"
            }`}
            title="Меню"
            aria-label="Меню настроек"
          >
            {isMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </motion.button>

          {/* Clean Dropdown Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-11 w-52 bg-app-card border border-app-border rounded-2xl shadow-xl p-1.5 z-50 text-xs font-sans space-y-1 fast-panel-slide"
              >
                {/* Theme Switcher Row */}
                <button
                  type="button"
                  onClick={() => {
                    handleToggleTheme();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-app-primary hover:bg-app-hover transition-colors cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2">
                    {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-app-secondary" />}
                    <span>{isDark ? "Светлая тема" : "Тёмная тема"}</span>
                  </span>
                  <span className="text-[10px] font-mono text-app-muted uppercase">
                    {isDark ? "Dark" : "Light"}
                  </span>
                </button>

                {/* About Shop */}
                {onOpenInfoModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenInfoModal();
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-app-primary hover:bg-app-hover transition-colors cursor-pointer text-left"
                  >
                    <Info size={15} className="text-app-muted" />
                    <span>{t("shop.about", "О заведении")}</span>
                  </button>
                )}

                {/* Explore catalog */}
                <Link
                  to="/explore"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-app-primary hover:bg-app-hover transition-colors cursor-pointer"
                >
                  <Compass size={15} className="text-emerald-500" />
                  <span>Каталог заведений</span>
                </Link>

                {/* Report a Bug / Feedback */}
                {onOpenReport && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenReport();
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-app-muted hover:text-app-primary hover:bg-app-hover transition-colors cursor-pointer text-left border-t border-app-border/40 pt-2"
                  >
                    <Bug size={14} />
                    <span>{t("btn.bug_report", "Сообщить об ошибке")}</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
