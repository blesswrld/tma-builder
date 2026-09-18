import React from "react";
import { motion } from "motion/react";
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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 border-b border-app-border pb-4 font-sans">
      {/* Category Pill Tabs */}
      <div className="relative flex-1 min-w-0">
        <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll-x scrollbar-none py-0.5 w-full pr-8">
          <button
            type="button"
            onClick={() => onSelectCategory("ALL")}
            className={`h-9 px-3.5 rounded-xl text-xs font-mono font-medium transition-all duration-75 active:scale-95 shrink-0 flex items-center justify-center cursor-pointer shadow-2xs ${
              selectedCategory === "ALL"
                ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                : "bg-app-card text-app-secondary hover:bg-app-hover hover:text-app-primary border border-app-border"
            }`}
          >
            {t("common.all", "Все")}
          </button>
          
          {/* Favorites Category Tab */}
          <button
            type="button"
            onClick={() => onSelectCategory("FAVORITES")}
            className={`h-9 px-3.5 rounded-xl text-xs font-mono font-medium transition-all duration-75 active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              selectedCategory === "FAVORITES"
                ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                : "bg-app-card text-app-secondary hover:bg-app-hover hover:text-app-primary border border-app-border"
            }`}
          >
            <Heart size={13} className={favoritesCount > 0 ? "fill-current text-rose-500" : "text-app-muted"} />
            <span>{t("shop.favorites", "Избранное")} ({favoritesCount})</span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`h-9 px-3.5 rounded-xl text-xs font-mono font-medium transition-all duration-75 active:scale-95 shrink-0 flex items-center justify-center cursor-pointer shadow-2xs ${
                selectedCategory === cat
                  ? "bg-app-accent text-app-accent-fg shadow-xs font-bold"
                  : "bg-app-card text-app-secondary hover:bg-app-hover hover:text-app-primary border border-app-border"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-app-bg to-transparent pointer-events-none" />
      </div>

      {/* Search Box */}
      <div className="relative w-full sm:w-64 shrink-0">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("shop.search_placeholder", "Поиск по каталогу...")}
          className="h-9 w-full bg-app-surface text-xs rounded-xl pl-9 pr-8 text-app-primary focus:outline-none focus:border-app-secondary border border-app-border transition-colors placeholder:text-app-muted font-sans shadow-2xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center text-app-muted hover:text-app-primary hover:bg-app-hover transition-colors cursor-pointer"
            title={t("common.clear", "Очистить поиск")}
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
};
