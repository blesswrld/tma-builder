import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Truck,
  Star,
  Percent,
  Clock,
  LayoutGrid,
  List,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ChevronDown,
  Check,
} from "lucide-react";

interface ExploreFiltersProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  categoryCounts: Record<string, number>;
  totalCount: number;

  onlyOpen: boolean;
  onToggleOnlyOpen: () => void;

  onlyDelivery: boolean;
  onToggleOnlyDelivery: () => void;

  minRating: number;
  onSetMinRating: (rating: number) => void;

  hasCashback: boolean;
  onToggleHasCashback: () => void;

  sortBy: "popular" | "rating" | "newest" | "name" | "services";
  onChangeSortBy: (val: "popular" | "rating" | "newest" | "name" | "services") => void;

  viewMode: "grid" | "list";
  onChangeViewMode: (mode: "grid" | "list") => void;

  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

const SORT_OPTIONS: Array<{
  id: "popular" | "rating" | "newest" | "name" | "services";
  label: string;
}> = [
  { id: "popular", label: "По популярности" },
  { id: "rating", label: "По рейтингу" },
  { id: "newest", label: "Сначала новые" },
  { id: "name", label: "По названию (А-Я)" },
  { id: "services", label: "По позициям меню" },
];

export const ExploreFilters: React.FC<ExploreFiltersProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  totalCount,
  onlyOpen,
  onToggleOnlyOpen,
  onlyDelivery,
  onToggleOnlyDelivery,
  minRating,
  onSetMinRating,
  hasCashback,
  onToggleHasCashback,
  sortBy,
  onChangeSortBy,
  viewMode,
  onChangeViewMode,
  hasActiveFilters,
  onResetFilters,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const hasOverflow = el.scrollWidth > el.clientWidth + 6;
    setCanScrollLeft(hasOverflow && el.scrollLeft > 8);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      checkScroll();
    });
    ro.observe(el);

    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, categories, totalCount]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollHoriz = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -240 : 240;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.id === sortBy)?.label || "По популярности";

  return (
    <div className="space-y-4">
      {/* Category Pills Carousel with Scroll Controls */}
      <div className="relative">
        {/* Left Arrow (only visible if scrolled right) */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-4 bg-gradient-to-r from-app-surface via-app-surface/90 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => scrollHoriz("left")}
              className="pointer-events-auto w-7 h-7 rounded-full bg-app-surface border border-app-border shadow-md flex items-center justify-center text-app-secondary hover:text-app-primary hover:bg-app-hover transition-all cursor-pointer"
              aria-label="Прокрутить влево"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth"
        >
          {/* "Все" pill */}
          <button
            type="button"
            onClick={() => onSelectCategory("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
              selectedCategory === "ALL"
                ? "bg-app-accent text-app-accent-fg border-app-accent shadow-xs"
                : "bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary border-app-border"
            }`}
          >
            <span>Все заведения</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedCategory === "ALL"
                  ? "bg-app-accent-fg/15 text-app-accent-fg"
                  : "bg-app-hover text-app-muted"
              }`}
            >
              {totalCount}
            </span>
          </button>

          {/* Dynamic Category Pills (if any) */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                  isSelected
                    ? "bg-app-accent text-app-accent-fg border-app-accent font-semibold shadow-xs"
                    : "bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary border-app-border font-medium"
                }`}
              >
                <span>{cat}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected
                        ? "bg-app-accent-fg/15 text-app-accent-fg"
                        : "bg-app-hover text-app-muted"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Arrow (only visible if content overflows to the right) */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-4 bg-gradient-to-l from-app-surface via-app-surface/90 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => scrollHoriz("right")}
              className="pointer-events-auto w-7 h-7 rounded-full bg-app-surface border border-app-border shadow-md flex items-center justify-center text-app-secondary hover:text-app-primary hover:bg-app-hover transition-all cursor-pointer"
              aria-label="Прокрутить вправо"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Secondary Filter & Sort Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Open Now */}
          <button
            type="button"
            onClick={onToggleOnlyOpen}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs ${
              onlyOpen
                ? "bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/20"
                : "bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary border-app-border"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                onlyOpen ? "bg-white" : "bg-emerald-500"
              }`}
            />
            <span>Сейчас открыто</span>
          </button>

          {/* Delivery */}
          <button
            type="button"
            onClick={onToggleOnlyDelivery}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs ${
              onlyDelivery
                ? "bg-blue-600 text-white border-blue-600 shadow-blue-600/20"
                : "bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary border-app-border"
            }`}
          >
            <Truck size={13} className={onlyDelivery ? "text-white" : "text-blue-500"} />
            <span>Доставка</span>
          </button>

          {/* Rating 4.5+ */}
          <button
            type="button"
            onClick={() => onSetMinRating(minRating === 4.5 ? 0 : 4.5)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs ${
              minRating >= 4.5
                ? "bg-amber-500 text-white border-amber-500 shadow-amber-500/20"
                : "bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary border-app-border"
            }`}
          >
            <Star
              size={13}
              className={minRating >= 4.5 ? "fill-white text-white" : "fill-amber-400 text-amber-400"}
            />
            <span>4.5+</span>
          </button>

          {/* Cashback */}
          <button
            type="button"
            onClick={onToggleHasCashback}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs ${
              hasCashback
                ? "bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20"
                : "bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary border-app-border"
            }`}
          >
            <Percent size={12} className={hasCashback ? "text-white" : "text-emerald-500"} />
            <span>Кэшбэк</span>
          </button>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-2 py-1.5 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Сбросить</span>
            </button>
          )}
        </div>

        {/* Right Sort & View Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          {/* Custom Sleek Sort Selector */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setIsSortOpen((prev) => !prev)}
              className="h-8 pl-2.5 pr-2.5 rounded-xl bg-app-card hover:bg-app-hover border border-app-border hover:border-app-border-focus text-xs font-medium text-app-primary focus:outline-hidden cursor-pointer shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <ArrowUpDown size={13} className="text-app-muted shrink-0" />
              <span className="truncate max-w-[140px]">{currentSortLabel}</span>
              <ChevronDown
                size={12}
                className={`text-app-muted shrink-0 transition-transform duration-200 ${
                  isSortOpen ? "rotate-180 text-app-primary" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {isSortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1.5 w-52 py-1 bg-app-surface border border-app-border rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="px-2.5 py-1 text-[10px] font-mono text-app-muted uppercase tracking-wider border-b border-app-border/60 mb-0.5">
                    Сортировка
                  </div>
                  {SORT_OPTIONS.map((opt) => {
                    const isCurrent = sortBy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onChangeSortBy(opt.id);
                          setIsSortOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors cursor-pointer ${
                          isCurrent
                            ? "bg-app-accent/10 text-app-primary font-bold"
                            : "text-app-secondary hover:bg-app-hover hover:text-app-primary"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isCurrent && (
                          <Check size={13} className="text-emerald-500 stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* View Mode Toggle (Grid / List) */}
          <div className="flex items-center p-0.5 rounded-xl bg-app-card border border-app-border shadow-2xs">
            <button
              type="button"
              onClick={() => onChangeViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-app-surface text-app-primary shadow-xs"
                  : "text-app-muted hover:text-app-primary"
              }`}
              title="Сетка"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-app-surface text-app-primary shadow-xs"
                  : "text-app-muted hover:text-app-primary"
              }`}
              title="Список"
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
