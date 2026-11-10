import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  MapPin,
  Building2,
  ChevronDown,
  X,
  Search,
  Check,
  Sparkles,
  AlertCircle,
  Move,
  GripHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  ALL_CITY_OPTIONS,
  extractCityAndStreet,
  formatFullAddress,
  isInvalidAddressText,
} from "../../lib/addressHelper";
import { AdminMapPickerModal } from "../admin/AdminMapPickerModal";

export interface UnifiedAddressInputProps {
  label?: string;
  subtitle?: string;
  value: string;
  onChange: (fullAddress: string) => void;
  required?: boolean;
  placeholderStreet?: string;
  className?: string;
  error?: string;
  onMapAddressSelected?: (address: string) => void;
}

export const UnifiedAddressInput: React.FC<UnifiedAddressInputProps> = ({
  label = "ФИЗИЧЕСКИЙ АДРЕС",
  subtitle = "Актуальный адрес с интерактивной картой городов РФ и навигацией для клиентов",
  value,
  onChange,
  required = false,
  placeholderStreet = "Например: ул. Мира, д. 1 / ТЦ Арена, 2 этаж",
  className = "",
  error: externalError,
  onMapAddressSelected,
}) => {
  // Extract initial city and street from the value only on initial mount or when value is changed externally
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    const { city } = extractCityAndStreet(value);
    return city || "";
  });
  const [streetInput, setStreetInput] = useState<string>(() => {
    const { street } = extractCityAndStreet(value);
    return street || "";
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const isInternalChangeRef = useRef(false);

  // Sync internal state when external `value` prop changes (from DB load, preset, etc.)
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    const { city, street } = extractCityAndStreet(value);
    if (city) {
      setSelectedCity(city);
    }
    setStreetInput(street);

    // Validate current street
    if (street) {
      const check = isInvalidAddressText(street);
      if (check.isInvalid) {
        setLocalError(check.reason || "Недопустимое значение адреса");
      } else {
        setLocalError(null);
      }
    } else {
      setLocalError(null);
    }
  }, [value]);

  // Focus search input when floating picker opens
  useEffect(() => {
    if (isDropdownOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isDropdownOpen]);

  // Quick popular cities
  const popularCities = useMemo(() => {
    return ALL_CITY_OPTIONS.filter((c) => c.popular).slice(0, 9);
  }, []);

  // Filtered cities list
  const filteredCities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ALL_CITY_OPTIONS;
    return ALL_CITY_OPTIONS.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const regionMatch = c.region?.toLowerCase().includes(q);
      return nameMatch || regionMatch;
    });
  }, [searchQuery]);

  // Handler: Select a city (explicit user choice via dropdown / floating panel)
  const handleSelectCity = (cityName: string) => {
    isInternalChangeRef.current = true;
    setSelectedCity(cityName);
    setIsDropdownOpen(false);
    setSearchQuery("");

    // Update parent with explicit city and existing street
    const full = formatFullAddress(cityName, streetInput);
    onChange(full);
  };

  // Handler: Clear city
  const handleClearCity = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    isInternalChangeRef.current = true;
    setSelectedCity("");
    const full = formatFullAddress("", streetInput);
    onChange(full);
  };

  // Handler: Street input change with real-time gibberish prevention
  // NOTE: Typing in street NEVER automatically guesses or sets city! City selection is strictly manual.
  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Filter out forbidden characters immediately
    const sanitized = raw.replace(/[<>{}$^*~=%@;?!\\]/g, "");

    isInternalChangeRef.current = true;
    setStreetInput(sanitized);

    // Real-time gibberish check
    const check = isInvalidAddressText(sanitized);
    if (check.isInvalid) {
      setLocalError(check.reason || "Недопустимое значение адреса");
    } else {
      setLocalError(null);
    }

    // Send formatted string to parent keeping currently selected city exactly as is
    const full = formatFullAddress(selectedCity, sanitized);
    onChange(full);
  };

  // Handler: Map address selection
  const handleMapAddressSelect = (mapAddress: string) => {
    const { city, street } = extractCityAndStreet(mapAddress);
    isInternalChangeRef.current = true;
    if (city) {
      setSelectedCity(city);
    }
    setStreetInput(street);
    setLocalError(null);

    const full = formatFullAddress(city || selectedCity, street);
    onChange(full);

    if (onMapAddressSelected) {
      onMapAddressSelected(full);
    }
  };

  const displayError = localError || externalError;

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Top Header with cleanly formatted label, badge, and Map button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-[11px] font-mono text-app-muted uppercase tracking-wider font-semibold">
            {label}
          </label>
          {required && <span className="text-rose-500 font-bold text-xs">*</span>}
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-app-surface text-app-muted border border-app-border">
            город обязателен
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsMapModalOpen(true)}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-500 hover:text-emerald-400 font-medium transition-colors cursor-pointer select-none shrink-0"
        >
          <MapPin size={13} className="text-emerald-500" />
          <span>Указать на карте РФ</span>
        </button>
      </div>

      {/* Grid with Custom City Dropdown and Street Input */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        {/* 1. Custom City Selector Button (Col 1 to 5) */}
        <div className="sm:col-span-5 relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className={`w-full h-10 px-3 py-2 bg-app-card border rounded-xl flex items-center justify-between text-xs font-sans transition-all cursor-pointer select-none ${
              displayError && !selectedCity && required
                ? "border-rose-500/60 ring-1 ring-rose-500/20"
                : isDropdownOpen
                ? "border-app-accent ring-1 ring-app-accent/30"
                : selectedCity
                ? "border-emerald-500/30 bg-emerald-500/5 text-app-primary"
                : "border-app-border text-app-muted hover:text-app-primary hover:border-app-border/80"
            }`}
            aria-haspopup="dialog"
            aria-expanded={isDropdownOpen}
          >
            <div className="flex items-center gap-2 truncate">
              <Building2
                size={14}
                className={selectedCity ? "text-emerald-500 shrink-0" : "text-app-muted shrink-0"}
              />
              <span className={`truncate font-medium ${selectedCity ? "text-app-primary" : "text-app-muted"}`}>
                {selectedCity ? `г. ${selectedCity}` : "Выберите город..."}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-1.5">
              {selectedCity && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClearCity}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleClearCity();
                    }
                  }}
                  className="p-1 hover:bg-app-hover rounded-md text-app-muted hover:text-app-primary transition-colors cursor-pointer"
                  title="Сбросить город"
                >
                  <X size={12} />
                </span>
              )}
              <ChevronDown
                size={13}
                className={`text-app-muted transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>
        </div>

        {/* 2. Street, House & Details Input (Col 6 to 12) */}
        <div className="sm:col-span-7 relative flex items-center">
          <MapPin size={14} className="absolute left-3.5 text-app-muted pointer-events-none" />
          <input
            type="text"
            value={streetInput}
            onChange={handleStreetChange}
            placeholder={placeholderStreet}
            className={`w-full h-10 bg-app-card border rounded-xl pl-9 pr-3.5 py-2 text-xs text-app-primary focus:outline-none font-sans transition-colors ${
              displayError
                ? "border-rose-500/60 ring-1 ring-rose-500/20 bg-rose-500/5 focus:border-rose-500"
                : "border-app-border focus:border-app-accent"
            }`}
          />
        </div>
      </div>

      {/* Error or Hint message */}
      {displayError ? (
        <div className="flex items-center gap-1.5 text-rose-500 text-[11px] font-sans">
          <AlertCircle size={12} className="shrink-0" />
          <span>{displayError}</span>
        </div>
      ) : (
        <p className="text-[11px] text-app-muted font-sans">
          {subtitle}
        </p>
      )}

      {/* Floating Draggable City Selection Widget rendered via Portal across the entire screen */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isDropdownOpen && (
              <div
                key="floating-city-wrapper"
                className="fixed inset-0 pointer-events-none z-[99999] flex items-center justify-center p-4"
              >
                <motion.div
                  drag
                  dragMomentum={false}
                  dragElastic={0.05}
                  initial={{ opacity: 0, scale: 0.95, y: -12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -12 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="pointer-events-auto w-[340px] sm:w-[380px] max-w-[95vw] rounded-2xl bg-app-surface border border-app-border shadow-2xl p-3.5 flex flex-col text-app-primary relative z-[99999]"
                  style={{ touchAction: "none" }}
                >
                  {/* Drag Handle Bar Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-app-border select-none cursor-grab active:cursor-grabbing">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-app-card border border-app-border text-emerald-500">
                        <GripHorizontal size={14} />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-app-primary">Выбор города РФ и СНГ</h4>
                        <p className="text-[10px] text-app-muted font-mono flex items-center gap-1">
                          <Move size={9} /> Перетаскивайте плашку по экрану
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(false)}
                      className="p-1.5 hover:bg-app-hover text-app-muted hover:text-app-primary rounded-xl transition-colors cursor-pointer"
                      title="Закрыть"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Search Input Box */}
                  <div className="relative flex items-center px-3 py-2 rounded-xl bg-app-card border border-app-border focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all mb-2.5">
                    <Search size={14} className="text-app-muted shrink-0 mr-2" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Поиск города РФ или СНГ..."
                      className="w-full bg-transparent text-xs text-app-primary placeholder:text-app-muted focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="p-1 text-app-muted hover:text-app-primary rounded-md transition-colors cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Quick Popular Chips */}
                  {!searchQuery && (
                    <div className="mb-2.5 pb-2.5 border-b border-app-border/60">
                      <div className="text-[10px] font-mono text-app-muted uppercase tracking-wider mb-1.5 px-0.5 flex items-center gap-1">
                        <Sparkles size={11} className="text-emerald-500" />
                        <span>Популярные города:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {popularCities.map((city) => (
                          <button
                            key={city.id}
                            type="button"
                            onClick={() => handleSelectCity(city.name)}
                            className={`px-2.5 py-1 text-[11px] font-sans rounded-lg transition-all cursor-pointer ${
                              selectedCity === city.name
                                ? "bg-emerald-500 text-white font-medium shadow-xs"
                                : "bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border"
                            }`}
                          >
                            {city.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cities Scrollable List */}
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1 select-none text-xs">
                    {filteredCities.length > 0 ? (
                      filteredCities.map((city) => {
                        const isSelected = selectedCity === city.name;
                        return (
                          <button
                            key={city.id}
                            type="button"
                            onClick={() => handleSelectCity(city.name)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer text-left ${
                              isSelected
                                ? "bg-emerald-500 text-white font-medium shadow-xs"
                                : "text-app-secondary hover:text-app-primary hover:bg-app-card border border-transparent hover:border-app-border"
                            }`}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <div className="truncate pr-2">
                              <span className="font-medium block truncate text-xs">{city.name}</span>
                              {city.region && (
                                <span
                                  className={`text-[10px] block truncate mt-0.5 ${
                                    isSelected ? "text-white/80" : "text-app-muted"
                                  }`}
                                >
                                  {city.region}
                                </span>
                              )}
                            </div>
                            {isSelected && <Check size={14} className="shrink-0 stroke-[2.5]" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="py-6 text-center text-xs text-app-muted">
                        Город не найден
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Interactive RF Map Picker Modal */}
      <AdminMapPickerModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        currentAddress={formatFullAddress(selectedCity, streetInput)}
        onSelectAddress={(newAddress) => {
          handleMapAddressSelect(newAddress);
        }}
      />
    </div>
  );
};
