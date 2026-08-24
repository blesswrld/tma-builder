import React from "react";
import { Search, Heart } from "lucide-react";

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
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 border-b border-app-border pb-4 font-sans">
      {/* Category Pill Tabs */}
      <div className="relative flex-1 min-w-0">
        <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll-x scrollbar-none py-1 w-full pr-8">
          <button
            type="button"
            onClick={() => onSelectCategory("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium font-mono transition-all shrink-0 cursor-pointer ${
              selectedCategory === "ALL"
                ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                : "bg-app-surface text-app-muted hover:bg-app-hover hover:text-app-primary border border-app-border"
            }`}
          >
            Все
          </button>
          
          {/* Favorites Category Tab */}
          <button
            type="button"
            onClick={() => onSelectCategory("FAVORITES")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedCategory === "FAVORITES"
                ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                : "bg-app-surface text-app-muted hover:bg-app-hover hover:text-app-primary border border-app-border"
            }`}
          >
            <Heart size={13} className={favoritesCount > 0 ? "fill-current text-rose-500" : "text-app-muted"} />
            <span>Избранное ({favoritesCount})</span>
          </button>

          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-app-accent text-app-accent-fg shadow-xs font-semibold"
                  : "bg-app-surface text-app-muted hover:bg-app-hover hover:text-app-primary border border-app-border"
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
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Поиск по каталогу..."
          className="w-full bg-app-surface text-xs rounded-xl pl-9 pr-8 py-2 text-app-primary focus:outline-none focus:border-app-border border border-app-border transition-colors placeholder:text-app-muted font-sans"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-primary text-xs cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
