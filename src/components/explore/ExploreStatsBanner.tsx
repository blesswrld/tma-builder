import React from "react";
import { Sparkles, MapPin } from "lucide-react";
import { CityDropdown } from "./CityDropdown";

interface ExploreStatsBannerProps {
  totalShops: number;
  openCount: number;
  totalServices: number;
  cities: string[];
  cityCounts?: Record<string, number>;
  selectedCity: string;
  onSelectCity: (city: string) => void;
}

export const ExploreStatsBanner: React.FC<ExploreStatsBannerProps> = ({
  totalShops,
  openCount,
  totalServices,
  cities,
  cityCounts = {},
  selectedCity,
  onSelectCity,
}) => {
  // 4 primary chips: "Все города", "Грозный", "Москва", "Санкт-Петербург"
  const primaryCities = ["Грозный", "Москва", "Санкт-Петербург"];

  return (
    <div className="relative z-20 rounded-2xl bg-gradient-to-r from-emerald-600/10 via-teal-500/10 to-transparent border border-emerald-500/20 p-4 sm:p-6 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <Sparkles size={12} className="text-emerald-500" />
            <span>Единая витрина платформы</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-app-primary tracking-tight">
            Откройте для себя заведения платформы
          </h2>
          <p className="text-xs sm:text-sm text-app-muted leading-relaxed">
            Ознакомьтесь с актуальным меню, графиком работы и оформляйте заказы через Telegram WebApp с гарантией сервиса.
          </p>
        </div>

        {/* Highlight Stats Badges */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-app-surface/90 border border-app-border backdrop-blur-sm shadow-xs">
            <div className="text-base sm:text-lg font-mono font-bold text-app-primary leading-tight">
              {totalShops}
            </div>
            <div className="text-[10px] font-mono text-app-muted uppercase">Заведений</div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-app-surface/90 border border-app-border backdrop-blur-sm shadow-xs">
            <div className="text-base sm:text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
              {openCount}
            </div>
            <div className="text-[10px] font-mono text-app-muted uppercase">Открыто сейчас</div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-app-surface/90 border border-app-border backdrop-blur-sm shadow-xs">
            <div className="text-base sm:text-lg font-mono font-bold text-teal-600 dark:text-teal-400 leading-tight">
              {totalServices}
            </div>
            <div className="text-[10px] font-mono text-app-muted uppercase">Позиций меню</div>
          </div>
        </div>
      </div>

      {/* City filter area: 4 primary chips + custom dropdown for all other cities */}
      <div className="flex items-center gap-2 pt-4 border-t border-emerald-500/15 mt-4 flex-wrap text-xs">
        <span className="text-app-muted font-medium flex items-center gap-1 shrink-0">
          <MapPin size={12} className="text-emerald-500" />
          Города:
        </span>

        {/* 1. Все города */}
        <button
          type="button"
          onClick={() => onSelectCity("ALL")}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer shadow-2xs ${
            selectedCity === "ALL"
              ? "bg-app-accent text-app-accent-fg font-semibold shadow-xs"
              : "bg-app-surface/90 hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border"
          }`}
        >
          Все города
        </button>

        {/* 2, 3, 4. Грозный, Москва, Санкт-Петербург */}
        {primaryCities.map((city) => {
          const isSelected = selectedCity === city;
          const count = cityCounts[city];

          return (
            <button
              key={city}
              type="button"
              onClick={() => onSelectCity(city)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                isSelected
                  ? "bg-app-accent text-app-accent-fg font-semibold shadow-xs"
                  : "bg-app-surface/90 hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border"
              }`}
            >
              <span>{city}</span>
              {count !== undefined && count > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isSelected
                      ? "bg-white/20 text-app-accent-fg"
                      : "bg-app-card text-app-muted border border-app-border/40"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Custom searchable dropdown for all other cities */}
        <CityDropdown
          cities={cities}
          cityCounts={cityCounts}
          totalShops={totalShops}
          selectedCity={selectedCity}
          onSelectCity={onSelectCity}
          primaryCities={primaryCities}
        />
      </div>
    </div>
  );
};
