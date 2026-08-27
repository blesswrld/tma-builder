import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, ChevronDown, Check, Search, X, Building2 } from "lucide-react";

export interface CityItem {
  id: string;
  name: string;
  region?: string;
  country?: string;
  popular?: boolean;
}

export const CITIES_DATA: CityItem[] = [
  // Популярные города и ключевые регионы
  { id: "grozny", name: "Грозный", region: "Чеченская Республика", country: "Россия", popular: true },
  { id: "moscow", name: "Москва", region: "Московская область", country: "Россия", popular: true },
  { id: "spb", name: "Санкт-Петербург", region: "Ленинградская область", country: "Россия", popular: true },
  { id: "makhachkala", name: "Махачкала", region: "Республика Дагестан", country: "Россия", popular: true },
  { id: "kazan", name: "Казань", region: "Республика Татарстан", country: "Россия", popular: true },
  { id: "krasnodar", name: "Краснодар", region: "Краснодарский край", country: "Россия", popular: true },
  { id: "rostov", name: "Ростов-на-Дону", region: "Ростовская область", country: "Россия", popular: true },
  { id: "ekaterinburg", name: "Екатеринбург", region: "Свердловская область", country: "Россия", popular: true },
  { id: "novosibirsk", name: "Новосибирск", region: "Новосибирская область", country: "Россия", popular: true },
  { id: "sochi", name: "Сочи", region: "Краснодарский край", country: "Россия", popular: true },
  { id: "vladikavkaz", name: "Владикавказ", region: "Республика Северная Осетия", country: "Россия", popular: true },
  { id: "nalchik", name: "Нальчик", region: "Кабардино-Балкария", country: "Россия", popular: true },
  { id: "derbent", name: "Дербент", region: "Республика Дагестан", country: "Россия", popular: true },
  { id: "khasavyurt", name: "Хасавюрт", region: "Республика Дагестан", country: "Россия", popular: true },
  { id: "gudermes", name: "Гудермес", region: "Чеченская Республика", country: "Россия" },
  { id: "argun", name: "Аргун", region: "Чеченская Республика", country: "Россия" },
  { id: "shali", name: "Шали", region: "Чеченская Республика", country: "Россия" },
  { id: "urus-martan", name: "Урус-Мартан", region: "Чеченская Республика", country: "Россия" },
  { id: "kurchaloy", name: "Курчалой", region: "Чеченская Республика", country: "Россия" },
  { id: "nazran", name: "Назрань", region: "Республика Ингушетия", country: "Россия" },
  { id: "magas", name: "Магас", region: "Республика Ингушетия", country: "Россия" },
  { id: "cherkessk", name: "Черкесск", region: "Карачаево-Черкесия", country: "Россия" },
  { id: "stavropol", name: "Ставрополь", region: "Ставропольский край", country: "Россия" },
  { id: "pyatigorsk", name: "Пятигорск", region: "Ставропольский край", country: "Россия" },
  { id: "min-vody", name: "Минеральные Воды", region: "Ставропольский край", country: "Россия" },
  { id: "kislovodsk", name: "Кисловодск", region: "Ставропольский край", country: "Россия" },
  { id: "essentuki", name: "Ессентуки", region: "Ставропольский край", country: "Россия" },
  { id: "samara", name: "Самара", region: "Самарская область", country: "Россия" },
  { id: "ufa", name: "Уфа", region: "Республика Башкортостан", country: "Россия" },
  { id: "nn", name: "Нижний Новгород", region: "Нижегородская область", country: "Россия" },
  { id: "chelyabinsk", name: "Челябинск", region: "Челябинская область", country: "Россия" },
  { id: "tyumen", name: "Тюмень", region: "Тюменская область", country: "Россия" },
  { id: "krasnoyarsk", name: "Красноярск", region: "Красноярский край", country: "Россия" },
  { id: "voronezh", name: "Воронеж", region: "Воронежская область", country: "Россия" },
  { id: "perm", name: "Пермь", region: "Пермский край", country: "Россия" },
  { id: "volgograd", name: "Волгоград", region: "Волгоградская область", country: "Россия" },
  { id: "saratov", name: "Саратов", region: "Саратовская область", country: "Россия" },
  { id: "omsk", name: "Омск", region: "Омская область", country: "Россия" },
  { id: "tolyatti", name: "Тольятти", region: "Самарская область", country: "Россия" },
  { id: "izhevsk", name: "Ижевск", region: "Удмуртская Республика", country: "Россия" },
  { id: "barnaul", name: "Барнаул", region: "Алтайский край", country: "Россия" },
  { id: "ulyanovsk", name: "Ульяновск", region: "Ульяновская область", country: "Россия" },
  { id: "irkutsk", name: "Иркутск", region: "Иркутская область", country: "Россия" },
  { id: "khabarovsk", name: "Хабаровск", region: "Хабаровский край", country: "Россия" },
  { id: "yaroslavl", name: "Ярославль", region: "Ярославская область", country: "Россия" },
  { id: "vladivostok", name: "Владивосток", region: "Приморский край", country: "Россия" },
  { id: "tomsk", name: "Томск", region: "Томская область", country: "Россия" },
  { id: "orenburg", name: "Оренбург", region: "Оренбургская область", country: "Россия" },
  { id: "kemerovo", name: "Кемерово", region: "Кемеровская область", country: "Россия" },
  { id: "ryazan", name: "Рязань", region: "Рязанская область", country: "Россия" },
  { id: "astrakhan", name: "Астрахань", region: "Астраханская область", country: "Россия" },
  { id: "penza", name: "Пенза", region: "Пензенская область", country: "Россия" },
  { id: "lipetsk", name: "Липецк", region: "Липецкая область", country: "Россия" },
  { id: "tula", name: "Тула", region: "Тульская область", country: "Россия" },
  { id: "cheboksary", name: "Чебоксары", region: "Чувашская Республика", country: "Россия" },
  { id: "kaliningrad", name: "Калининград", region: "Калининградская область", country: "Россия" },
  { id: "surgut", name: "Сургут", region: "ХМАО - Югра", country: "Россия" },
  // Города СНГ
  { id: "minsk", name: "Минск", region: "Минская область", country: "Беларусь" },
  { id: "astana", name: "Астана", region: "Акмолинская область", country: "Казахстан" },
  { id: "almaty", name: "Алматы", region: "Алматинская область", country: "Казахстан" },
  { id: "shymkent", name: "Шымкент", region: "Туркестанская область", country: "Казахстан" },
  { id: "tashkent", name: "Ташкент", region: "Ташкентская область", country: "Узбекистан" },
  { id: "samarkand", name: "Самарканд", region: "Самаркандская область", country: "Узбекистан" },
  { id: "bishkek", name: "Бишкек", region: "Чуйская область", country: "Кыргызстан" },
  { id: "yerevan", name: "Ереван", region: "Араратская область", country: "Армения" },
  { id: "baku", name: "Баку", region: "Апшеронский п-ов", country: "Азербайджан" },
];

interface CityDropdownProps {
  value: string;
  onChange: (city: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
  showQuickChips?: boolean;
}

export const CityDropdown: React.FC<CityDropdownProps> = ({
  value,
  onChange,
  error,
  label = "Город доставки",
  required = true,
  className = "",
  placeholder = "Выберите город...",
  showQuickChips = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customCityInput, setCustomCityInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filter cities by search query
  const filteredCities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return CITIES_DATA;
    return CITIES_DATA.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const regionMatch = c.region?.toLowerCase().includes(q);
      const countryMatch = c.country?.toLowerCase().includes(q);
      return nameMatch || regionMatch || countryMatch;
    });
  }, [searchQuery]);

  const popularCities = useMemo(() => {
    return CITIES_DATA.filter((c) => c.popular);
  }, []);

  const handleSelectCity = (cityName: string) => {
    onChange(cityName);
    setIsCustomMode(false);
    setCustomCityInput("");
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleApplyCustomCity = () => {
    const trimmed = customCityInput.trim();
    if (trimmed) {
      onChange(trimmed);
      setCustomCityInput("");
      setIsCustomMode(false);
      setIsOpen(false);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <div className="flex justify-between items-center text-[11px] font-mono">
          <label className="text-app-muted flex items-center gap-1">
            <MapPin size={12} className="text-app-muted" />
            <span>{label}</span>
            {required && <span className="text-rose-500 font-bold">*</span>}
          </label>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsCustomMode(false);
              }}
              className="text-app-muted hover:text-app-primary flex items-center gap-0.5 text-[10px] cursor-pointer transition-colors"
            >
              <X size={10} /> Сбросить
            </button>
          )}
        </div>
      )}

      {/* Main Trigger Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full bg-app-input border rounded-xl px-3.5 py-2.5 text-xs text-left flex items-center justify-between gap-2 transition-all cursor-pointer select-none font-sans ${
            error
              ? "border-rose-500/60 ring-1 ring-rose-500/20 bg-rose-500/5 text-app-primary"
              : isOpen
              ? "border-app-primary/40 ring-2 ring-app-primary/10 bg-app-card text-app-primary"
              : "border-app-border text-app-primary hover:border-app-border/80 hover:bg-app-hover"
          }`}
        >
          <div className="flex items-center gap-2 truncate min-w-0">
            <Building2 size={14} className={value ? "text-app-primary" : "text-app-muted"} />
            <span className={`truncate font-medium ${value ? "text-app-primary" : "text-app-muted"}`}>
              {value || placeholder}
            </span>
          </div>
          <ChevronDown
            size={14}
            className={`text-app-muted shrink-0 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-app-primary" : ""
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-app-modal border border-app-border rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl p-2 font-sans"
            >
              {/* Search Bar */}
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск города..."
                  className="w-full bg-app-input border border-app-border rounded-xl pl-8.5 pr-8 py-2 text-xs text-app-primary focus:outline-none focus:border-app-border font-sans transition-colors placeholder:text-app-muted"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-primary p-0.5"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Cities List */}
              <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
                {filteredCities.length > 0 ? (
                  filteredCities.map((city) => {
                    const isSelected = value === city.name;
                    return (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => handleSelectCity(city.name)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                            : "text-app-primary hover:bg-app-hover"
                        }`}
                      >
                        <div className="min-w-0 truncate">
                          <span className="font-semibold block truncate">{city.name}</span>
                          {city.region && (
                            <span
                              className={`text-[10px] font-mono block truncate ${
                                isSelected ? "text-app-accent-fg/80" : "text-app-muted"
                              }`}
                            >
                              {city.region}
                              {city.country && city.country !== "Россия" ? ` • ${city.country}` : ""}
                            </span>
                          )}
                        </div>
                        {isSelected && <Check size={14} className="shrink-0 text-app-accent-fg" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="p-3 text-center text-xs text-app-muted">
                    <p>Город не найден в списке</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomMode(true);
                        setCustomCityInput(searchQuery);
                      }}
                      className="mt-2 text-xs font-mono font-bold text-app-primary underline hover:opacity-80 cursor-pointer"
                    >
                      Использовать «{searchQuery}»
                    </button>
                  </div>
                )}
              </div>

              {/* Manual City Entry Option */}
              <div className="mt-2 pt-2 border-t border-app-border/80">
                {!isCustomMode ? (
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(true)}
                    className="w-full py-1.5 px-2.5 text-[11px] font-mono text-app-secondary hover:text-app-primary hover:bg-app-hover rounded-xl text-left flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>+ Другой город (ввести вручную)</span>
                  </button>
                ) : (
                  <div className="flex gap-1.5 p-1 bg-app-input border border-app-border rounded-xl">
                    <input
                      type="text"
                      autoFocus
                      value={customCityInput}
                      onChange={(e) => setCustomCityInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyCustomCity();
                        }
                      }}
                      placeholder="Введите название города..."
                      className="flex-1 bg-transparent px-2 py-1 text-xs text-app-primary focus:outline-none font-sans"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCustomCity}
                      disabled={!customCityInput.trim()}
                      className="px-2.5 py-1 bg-app-accent text-app-accent-fg rounded-lg text-xs font-mono font-bold hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity"
                    >
                      ОК
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Chips for Top Popular Cities */}
      {showQuickChips && !value && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[10px] font-mono text-app-muted mr-0.5">Быстро:</span>
          {popularCities.slice(0, 5).map((pc) => (
            <button
              key={pc.id}
              type="button"
              onClick={() => handleSelectCity(pc.name)}
              className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-app-card border border-app-border text-app-secondary hover:text-app-primary hover:bg-app-hover transition-all cursor-pointer"
            >
              {pc.name}
            </button>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && <p className="text-[11px] text-rose-400 font-mono flex items-center gap-1">{error}</p>}
    </div>
  );
};

export default CityDropdown;
