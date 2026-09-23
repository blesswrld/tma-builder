import React, { useState, useRef, useEffect, useMemo } from "react";
import { MapPin, ChevronDown, Search, X, Check, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CityDropdownProps {
  cities: string[];
  cityCounts?: Record<string, number>;
  totalShops: number;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  primaryCities?: string[];
}

export const CityDropdown: React.FC<CityDropdownProps> = ({
  cities = [],
  cityCounts = {},
  totalShops,
  selectedCity,
  onSelectCity,
  primaryCities = ["Грозный", "Москва", "Санкт-Петербург"],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    // Auto focus search input on open
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Is selected city outside the 4 primary chips?
  const isSelectedNonPrimary = useMemo(() => {
    return selectedCity !== "ALL" && !primaryCities.includes(selectedCity);
  }, [selectedCity, primaryCities]);

  // Sorted and filtered list of all unique cities
  const filteredCities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sorted = [...cities].sort((a, b) => {
      const countA = cityCounts[a] || 0;
      const countB = cityCounts[b] || 0;
      if (countB !== countA) return countB - countA;
      return a.localeCompare(b, "ru");
    });

    if (!q) return sorted;
    return sorted.filter((city) => city.toLowerCase().includes(q));
  }, [cities, searchQuery, cityCounts]);

  const handleSelect = (city: string) => {
    onSelectCity(city);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClearNonPrimary = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectCity("ALL");
  };

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer select-none shadow-2xs ${
          isSelectedNonPrimary
            ? "bg-app-accent text-app-accent-fg font-semibold shadow-xs"
            : isOpen
            ? "bg-app-card border border-app-border text-app-primary"
            : "bg-app-surface/90 hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <MapPin size={12} className={isSelectedNonPrimary ? "text-app-accent-fg" : "text-app-muted"} />
        <span>
          {isSelectedNonPrimary
            ? `${selectedCity}${cityCounts[selectedCity] ? ` (${cityCounts[selectedCity]})` : ""}`
            : "Другие города"}
        </span>

        {isSelectedNonPrimary ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClearNonPrimary}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClearNonPrimary(e as any);
              }
            }}
            className="ml-0.5 p-0.5 hover:bg-white/20 rounded-md transition-colors cursor-pointer"
            title="Сбросить город"
            aria-label="Сбросить выбор города"
          >
            <X size={12} />
          </span>
        ) : (
          <ChevronDown
            size={12}
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-app-card/95 backdrop-blur-md border border-app-border shadow-xl p-2.5 z-50 overflow-hidden"
            role="listbox"
          >
            {/* Search Input Box */}
            <div className="relative flex items-center px-2.5 py-1.5 rounded-xl bg-app-surface border border-app-border focus-within:border-app-accent transition-colors mb-2">
              <Search size={13} className="text-app-muted shrink-0 mr-2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по городам..."
                className="w-full bg-transparent text-xs text-app-primary placeholder:text-app-muted focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-0.5 text-app-muted hover:text-app-primary rounded-md transition-colors"
                  aria-label="Очистить поиск"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Header info */}
            <div className="px-2 py-1 text-[10px] font-mono text-app-muted uppercase tracking-wider flex items-center justify-between border-b border-app-border/40 pb-1.5 mb-1.5">
              <span>Доступные города</span>
              <span>Всего: {cities.length}</span>
            </div>

            {/* City Options List */}
            <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5 select-none">
              {/* Option: "Все города" */}
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSelect("ALL")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-mono transition-colors cursor-pointer text-left ${
                    selectedCity === "ALL"
                      ? "bg-app-accent text-app-accent-fg font-semibold shadow-2xs"
                      : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
                  }`}
                  role="option"
                  aria-selected={selectedCity === "ALL"}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Globe size={13} className={selectedCity === "ALL" ? "text-app-accent-fg" : "text-app-muted"} />
                    <span className="font-semibold">Все города платформы</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                        selectedCity === "ALL"
                          ? "bg-white/20 text-app-accent-fg"
                          : "bg-app-surface text-app-muted border border-app-border/50"
                      }`}
                    >
                      {totalShops}
                    </span>
                    {selectedCity === "ALL" && <Check size={12} className="stroke-[2.5]" />}
                  </div>
                </button>
              )}

              {/* City items */}
              {filteredCities.length > 0 ? (
                filteredCities.map((city) => {
                  const isSelected = selectedCity === city;
                  const count = cityCounts[city] || 0;

                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => handleSelect(city)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-mono transition-colors cursor-pointer text-left ${
                        isSelected
                          ? "bg-app-accent text-app-accent-fg font-semibold shadow-2xs"
                          : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <MapPin
                          size={13}
                          className={isSelected ? "text-app-accent-fg" : "text-app-muted"}
                        />
                        <span className="truncate">{city}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {count > 0 && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                              isSelected
                                ? "bg-white/20 text-app-accent-fg"
                                : "bg-app-surface text-app-muted border border-app-border/50"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                        {isSelected && <Check size={12} className="stroke-[2.5]" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-app-muted space-y-1">
                  <p>Город не найден</p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-[11px] text-app-primary hover:underline cursor-pointer"
                  >
                    Сбросить поиск
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
