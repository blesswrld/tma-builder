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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-app-border pb-4">
      {/* Category Pill Tabs */}
      <div className="relative flex-1 min-w-0">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 touch-pan-x w-full pr-8">
          <button
            onClick={() => onSelectCategory("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium font-mono transition-all shrink-0 ${
              selectedCategory === "ALL"
                ? "bg-app-accent text-app-accent-fg font-bold shadow-sm"
                : "bg-app-surface text-app-muted hover:bg-app-hover hover:text-app-primary"
            }`}
          >
            Все
          </button>
          
          {/* Favorites Category Tab */}
          <button
            onClick={() => onSelectCategory("FAVORITES")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
              selectedCategory === "FAVORITES"
                ? "bg-rose-500 text-white font-bold shadow-sm"
                : "bg-app-surface text-app-muted hover:bg-app-hover hover:text-rose-400"
            }`}
          >
            <Heart size={13} className={favoritesCount > 0 ? "fill-current" : ""} />
            <span>Избранное ({favoritesCount})</span>
          </button>

          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                selectedCategory === cat
                  ? "bg-app-accent text-app-accent-fg shadow-sm font-semibold"
                  : "bg-app-surface text-app-muted hover:bg-app-hover hover:text-app-primary"
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
          className="w-full bg-app-surface text-xs rounded-xl pl-9 pr-4 py-2 text-app-primary focus:outline-none focus:ring-1 focus:ring-app-primary/30 transition-all placeholder:text-app-muted font-sans"
        />
      </div>
    </div>
  );
};
