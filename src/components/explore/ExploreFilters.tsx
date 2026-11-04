import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Truck,
  Star,
  Percent,
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
    <div className="space-y-3">
      {/* Architectural Category Navigation Strip */}
      <div className="relative border-b border-app-border pb-2.5">
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-2.5 z-10 flex items-center pr-3 bg-gradient-to-r from-app-bg via-app-bg/90 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => scrollHoriz("left")}
              className="pointer-events-auto w-7 h-7 rounded-md bg-app-surface border border-app-border flex items-center justify-center text-app-secondary hover:text-app-primary hover:bg-app-hover transition-all cursor-pointer"
              aria-label="Прокрутить влево"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none scroll-smooth"
        >
          {/* "Все заведения" tab */}
          <button
            type="button"
            onClick={() => onSelectCategory("ALL")}
            className={`h-8 px-3 rounded-lg text-xs whitespace-nowrap transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
              selectedCategory === "ALL"
                ? "bg-app-accent text-app-accent-fg border-app-accent font-semibold"
                : "bg-app-surface hover:bg-app-hover text-app-secondary hover:text-app-primary border-app-border font-medium"
            }`}
          >
            <span>Все заведения</span>
            <span
              className={`text-[10px] font-mono tabular-nums ${
                selectedCategory === "ALL"
                  ? "text-app-accent-fg/80"
                  : "text-app-muted"
              }`}
            >
              {totalCount}
            </span>
          </button>

          {/* Dynamic Category Tabs */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`h-8 px-3 rounded-lg text-xs whitespace-nowrap transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-app-accent text-app-accent-fg border-app-accent font-semibold"
                    : "bg-app-surface hover:bg-app-hover text-app-secondary hover:text-app-primary border-app-border font-medium"
                }`}
              >
                <span>{cat}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] font-mono tabular-nums ${
                      isSelected ? "text-app-accent-fg/80" : "text-app-muted"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-2.5 z-10 flex items-center pl-3 bg-gradient-to-l from-app-bg via-app-bg/90 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => scrollHoriz("right")}
              className="pointer-events-auto w-7 h-7 rounded-md bg-app-surface border border-app-border flex items-center justify-center text-app-secondary hover:text-app-primary hover:bg-app-hover transition-all cursor-pointer"
              aria-label="Прокрутить вправо"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Secondary Filter & Sort Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Quick Filter Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={onToggleOnlyOpen}
            className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              onlyOpen
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/35 font-semibold"
                : "bg-app-surface hover:bg-app-hover text-app-secondary hover:text-app-primary border-app-border"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                onlyOpen ? "bg-emerald-500" : "bg-app-muted"
              }`}
            />
            <span>Сейчас открыто</span>
          </button>

          <button
            type="button"
            onClick={onToggleOnlyDelivery}
            className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              onlyDelivery
                ? "bg-app-accent text-app-accent-fg border-transparent font-semibold"
                : "bg-app-surface hover:bg-app-hover text-app-secondary hover:text-app-primary border-app-border"
            }`}
          >
            <Truck size={13} className={onlyDelivery ? "text-app-accent-fg" : "text-app-muted"} />
            <span>Доставка</span>
          </button>

          <button
            type="button"
            onClick={() => onSetMinRating(minRating === 4.5 ? 0 : 4.5)}
            className={`h-8 px-2.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
              minRating >= 4.5
                ? "bg-app-accent text-app-accent-fg border-transparent font-semibold"
                : "bg-app-surface hover:bg-app-hover text-app-secondary hover:text-app-primary border-app-border"
            }`}
          >
            <Star
              size={12}
              className={minRating >= 4.5 ? "fill-app-accent-fg text-app-accent-fg" : "fill-app-muted text-app-muted"}
            />
            <span>4.5+</span>
          </button>

          <button
            type="button"
            onClick={onToggleHasCashback}
            className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              hasCashback
                ? "bg-app-accent text-app-accent-fg border-transparent font-semibold"
                : "bg-app-surface hover:bg-app-hover text-app-secondary hover:text-app-primary border-app-border"
            }`}
          >
            <Percent size={12} className={hasCashback ? "text-app-accent-fg" : "text-app-muted"} />
            <span>Кэшбэк</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="h-8 px-2.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw size={12} />
              <span>Сбросить</span>
            </button>
          )}
        </div>

        {/* Right Sort & View Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          {/* Sort Selector */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setIsSortOpen((prev) => !prev)}
              className="h-8 px-2.5 rounded-lg bg-app-surface hover:bg-app-hover border border-app-border text-xs font-medium text-app-primary focus:outline-hidden cursor-pointer flex items-center gap-1.5 transition-all whitespace-nowrap"
            >
              <ArrowUpDown size={13} className="text-app-muted shrink-0" />
              <span className="truncate max-w-[140px]">{currentSortLabel}</span>
              <ChevronDown
                size={12}
                className={`text-app-muted shrink-0 transition-transform duration-150 ${
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
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 w-52 py-1 bg-app-surface border border-app-border rounded-lg shadow-xl z-50 overflow-hidden"
                >
                  <div className="px-3 py-1 text-[10px] font-mono text-app-muted border-b border-app-border mb-0.5">
                    Сортировка списка
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
                            ? "bg-app-hover text-app-primary font-semibold"
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
          <div className="flex items-center p-0.5 rounded-lg bg-app-surface border border-app-border">
            <button
              type="button"
              onClick={() => onChangeViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-app-accent text-app-accent-fg"
                  : "text-app-muted hover:text-app-primary"
              }`}
              title="Сетка"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode("list")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-app-accent text-app-accent-fg"
                  : "text-app-muted hover:text-app-primary"
              }`}
              title="Список"
            >
              <List size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
