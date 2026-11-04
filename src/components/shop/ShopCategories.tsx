import React from "react";
import { Search, Heart, X } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface ShopCategoriesProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  favoritesCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const ShopCategories: React.FC<ShopCategoriesProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  favoritesCount,
  searchQuery,
  onSearchChange,
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-app-border pb-3 font-sans">
      {/* Architectural Category Navigation Tabs */}
      <div className="relative flex-1 min-w-0">
        <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll-x scrollbar-none py-0.5 w-full pr-6">
          <button
            type="button"
            onClick={() => onSelectCategory("ALL")}
            className={`h-8 px-3 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center justify-center cursor-pointer whitespace-nowrap border ${
              selectedCategory === "ALL"
                ? "bg-app-accent text-app-accent-fg border-app-accent font-semibold"
                : "bg-app-surface text-app-secondary hover:bg-app-hover hover:text-app-primary border-app-border"
            }`}
          >
            {t("common.all", "Все позиции")}
          </button>

          {favoritesCount > 0 && (
            <button
              type="button"
              onClick={() => onSelectCategory("FAVORITES")}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                selectedCategory === "FAVORITES"
                  ? "bg-app-accent text-app-accent-fg border-app-accent font-semibold"
                  : "bg-app-surface text-app-secondary hover:bg-app-hover hover:text-app-primary border-app-border"
              }`}
            >
              <Heart size={12} className="fill-rose-500 text-rose-500" />
              <span>{t("shop.favorites", "Избранное")}</span>
              <span className="font-mono text-[10px] tabular-nums">{favoritesCount}</span>
            </button>
          )}

          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center justify-center cursor-pointer whitespace-nowrap border ${
                selectedCategory === cat
                  ? "bg-app-accent text-app-accent-fg border-app-accent font-semibold"
                  : "bg-app-surface text-app-secondary hover:bg-app-hover hover:text-app-primary border-app-border"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Minimalist Search Input */}
      <div className="relative w-full sm:w-60 shrink-0">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("shop.search_placeholder", "Поиск по меню...")}
          className="h-8 w-full bg-app-surface text-xs rounded-lg pl-8 pr-7 text-app-primary focus:outline-none focus:border-emerald-500/60 border border-app-border transition-colors placeholder:text-app-muted font-sans"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-app-muted hover:text-app-primary hover:bg-app-hover transition-colors cursor-pointer"
            title={t("common.clear", "Очистить поиск")}
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
};
