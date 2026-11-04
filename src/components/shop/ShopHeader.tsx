import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sun, Moon, Receipt, Menu, X, Compass, Info, Bug, Layers } from "lucide-react";
import { Shop } from "../../types";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { ResponsiveImage } from "../common/ResponsiveImage";
import { DesignModeSwitch } from "../common/DesignModeSwitch";

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
  const { designMode, toggleDesignMode } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggleTheme = onToggleTheme || toggleTheme || (() => {});
  const isDark = theme === "dark";
  const isAtelier = designMode === "atelier";

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
    <header
      className={`sticky top-0 z-40 text-app-primary transition-colors ${
        isAtelier
          ? "bg-app-surface/95 backdrop-blur-md border-b-2 border-double border-app-border"
          : "bg-app-surface border-b border-app-border"
      }`}
    >
      <div className={`max-w-5xl mx-auto px-4 sm:px-6 ${isAtelier ? "h-16" : "h-14"} flex items-center justify-between gap-4`}>
        {/* Zone 1: Shop Identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-app-border ${
              isAtelier ? "rounded-full font-editorial text-sm" : "rounded-lg font-mono"
            } ${shop.logoUrl ? "bg-transparent" : "bg-app-bg text-app-primary"}`}
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
          <div className="flex items-center gap-2 min-w-0">
            <h1
              className={`font-bold tracking-tight text-app-primary truncate ${
                isAtelier ? "font-editorial text-lg sm:text-xl" : "text-sm"
              }`}
            >
              {shop.name}
            </h1>
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                shop.isOpen !== false ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
              }`}
              title={shop.isOpen !== false ? t("shop.open", "Открыто") : t("shop.closed", "Закрыто")}
            />
            {shop.workingHours && (
              <span className="hidden md:inline text-xs font-mono text-app-muted pl-2 border-l border-app-border truncate">
                {shop.workingHours}
              </span>
            )}
          </div>
        </div>

        {/* Zone 2 & 3: Right Controls & Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative" ref={menuRef}>
          <DesignModeSwitch compact />

          {/* Orders History button */}
          <button
            type="button"
            onClick={onOpenMyOrders}
            className={`h-8 px-2.5 text-xs transition-all flex items-center gap-1.5 font-mono font-medium cursor-pointer shrink-0 bg-app-bg hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border relative ${
              isAtelier ? "rounded-full" : "rounded-lg"
            }`}
            title={t("shop.orders", "Заказы")}
          >
            <Receipt size={13} className="text-app-muted shrink-0" />
            <span className="hidden sm:inline">{t("shop.orders", "Заказы")}</span>
            {hasActiveOrder && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse absolute -top-0.5 -right-0.5" />
            )}
          </button>

          {/* Menu / Settings dropdown trigger */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`w-8 h-8 flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
              isAtelier ? "rounded-full" : "rounded-lg"
            } ${
              isMenuOpen
                ? "bg-app-accent text-app-accent-fg border-app-accent"
                : "bg-app-bg text-app-secondary hover:text-app-primary hover:bg-app-hover border-app-border"
            }`}
            title="Меню"
            aria-label="Меню настроек"
          >
            {isMenuOpen ? <X size={15} /> : <Menu size={15} />}
          </button>

          {/* Clean Dropdown Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-10 w-60 bg-app-surface border border-app-border rounded-xl shadow-xl p-1.5 z-50 text-xs font-sans space-y-0.5 fast-panel-slide"
              >
                {/* Theme Switcher Row */}
                <button
                  type="button"
                  onClick={() => {
                    handleToggleTheme();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg flex items-center justify-between text-app-primary hover:bg-app-hover transition-colors cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2">
                    {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-app-secondary" />}
                    <span>{isDark ? "Светлая тема" : "Тёмная тема"}</span>
                  </span>
                  <span className="text-[10px] font-mono text-app-muted uppercase">
                    {isDark ? "Dark" : "Light"}
                  </span>
                </button>

                {/* Design Mode Switcher Row (Swiss / Atelier / Classic) */}
                <button
                  type="button"
                  onClick={() => {
                    toggleDesignMode();
                  }}
                  className="w-full px-3 py-2 rounded-lg flex items-center justify-between text-app-primary hover:bg-app-hover transition-colors cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2">
                    <Layers size={14} className="text-emerald-500" />
                    <span>Стиль дизайна</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-500 uppercase font-semibold">
                    {designMode === "swiss"
                      ? "Swiss"
                      : designMode === "atelier"
                      ? "Atelier"
                      : "Classic"}
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
                    className="w-full px-3 py-2 rounded-lg flex items-center gap-2 text-app-primary hover:bg-app-hover transition-colors cursor-pointer text-left"
                  >
                    <Info size={14} className="text-app-muted" />
                    <span>{t("shop.about", "О заведении")}</span>
                  </button>
                )}

                {/* Explore catalog */}
                <Link
                  to="/explore"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full px-3 py-2 rounded-lg flex items-center gap-2 text-app-primary hover:bg-app-hover transition-colors cursor-pointer"
                >
                  <Compass size={14} className="text-emerald-500" />
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
                    className="w-full px-3 py-2 rounded-lg flex items-center gap-2 text-app-muted hover:text-app-primary hover:bg-app-hover transition-colors cursor-pointer text-left border-t border-app-border pt-2 mt-1"
                  >
                    <Bug size={13} />
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
