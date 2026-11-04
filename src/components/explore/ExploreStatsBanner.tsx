import React, { useState } from "react";
import { MapPin, Navigation, Loader2, Sparkles } from "lucide-react";
import { CityDropdown } from "./CityDropdown";
import { useTheme } from "../../context/ThemeContext";

interface ExploreStatsBannerProps {
  totalShops: number;
  openCount: number;
  totalServices: number;
  cities: string[];
  cityCounts?: Record<string, number>;
  selectedCity: string;
  onSelectCity: (city: string) => void;
}

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "Москва": { lat: 55.7558, lng: 37.6173 },
  "Санкт-Петербург": { lat: 59.9343, lng: 30.3351 },
  "Грозный": { lat: 43.3169, lng: 45.6985 },
  "Казань": { lat: 55.7961, lng: 49.1064 },
  "Екатеринбург": { lat: 56.8389, lng: 60.6057 },
  "Новосибирск": { lat: 55.0084, lng: 82.9357 },
  "Краснодар": { lat: 45.0355, lng: 38.9753 },
  "Сочи": { lat: 43.6028, lng: 39.7342 },
  "Махачкала": { lat: 42.9849, lng: 47.5047 }
};

export const ExploreStatsBanner: React.FC<ExploreStatsBannerProps> = ({
  totalShops,
  openCount,
  totalServices,
  cities,
  cityCounts = {},
  selectedCity,
  onSelectCity,
}) => {
  const { designMode } = useTheme();
  const isAtelier = designMode === "atelier";
  const primaryCities = ["Грозный", "Москва", "Санкт-Петербург"];
  const [isDetectingGeo, setIsDetectingGeo] = useState(false);

  const handleAutoDetectCity = () => {
    if (!navigator.geolocation) {
      return;
    }

    setIsDetectingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGeo(false);
        const { latitude, longitude } = pos.coords;

        let closestCity = "Москва";
        let minDistance = Infinity;

        const allAvailableCities = Array.from(
          new Set([...primaryCities, ...cities, ...Object.keys(CITY_COORDINATES)])
        );

        for (const cityName of allAvailableCities) {
          const coords = CITY_COORDINATES[cityName];
          if (coords) {
            const d = Math.hypot(coords.lat - latitude, coords.lng - longitude);
            if (d < minDistance) {
              minDistance = d;
              closestCity = cityName;
            }
          }
        }

        onSelectCity(closestCity);
      },
      (err) => {
        setIsDetectingGeo(false);
        console.warn("Geolocation error:", err);
      },
      { timeout: 8000 }
    );
  };

  if (isAtelier) {
    return (
      <section className="relative z-20 bg-app-surface border border-app-border rounded-3xl mb-8 overflow-hidden shadow-md">
        {/* Editorial Magazine Cover Masthead */}
        <div className="p-6 sm:p-8 lg:p-10 border-b border-app-border relative">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-editorial italic text-app-secondary">
                <Sparkles size={13} className="text-amber-500" />
                <span>Издание избранных резиденций · Сезон 2025/26</span>
                <span className="text-app-muted">·</span>
                <span className="inline-flex items-center gap-1 font-mono not-italic text-[10px] text-emerald-500 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Гид
                </span>
              </div>
              <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-semibold text-app-primary tracking-tight leading-[1.06]">
                Гастрономия, ритейл &amp; авторские сервисы
              </h1>
              <p className="text-xs sm:text-sm text-app-secondary leading-relaxed max-w-xl">
                Кураторская подборка локальных заведений с прямым заказом, живым меню и мгновенным подтверждением в реальном времени.
              </p>
            </div>

            {/* Editorial Roman Numeral Metrics */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-app-bg/70 border border-app-border min-w-[96px] sm:min-w-[116px]">
                <div className="text-[10px] font-editorial italic text-app-muted">I. Резиденций</div>
                <div className="font-editorial text-2xl sm:text-3xl font-bold text-app-primary tabular-nums mt-1">
                  {totalShops}
                </div>
              </div>
              <div className="p-3.5 sm:p-4 rounded-2xl bg-app-bg/70 border border-emerald-500/25 min-w-[96px] sm:min-w-[116px]">
                <div className="text-[10px] font-editorial italic text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>II. Открыто</span>
                </div>
                <div className="font-editorial text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                  {openCount}
                </div>
              </div>
              <div className="p-3.5 sm:p-4 rounded-2xl bg-app-bg/70 border border-app-border min-w-[96px] sm:min-w-[116px]">
                <div className="text-[10px] font-editorial italic text-app-muted">III. Позиций</div>
                <div className="font-editorial text-2xl sm:text-3xl font-bold text-app-primary tabular-nums mt-1">
                  {totalServices}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Location Salon Strip */}
        <div className="px-6 sm:px-8 py-3.5 bg-app-bg/40 flex items-center gap-2 flex-wrap text-xs">
          <span className="font-editorial italic text-sm text-app-secondary flex items-center gap-1.5 shrink-0 mr-2">
            <MapPin size={13} className="text-amber-500" />
            <span>География гида:</span>
          </span>

          <button
            type="button"
            onClick={() => onSelectCity("ALL")}
            className={`h-8 px-3.5 rounded-full text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              selectedCity === "ALL"
                ? "bg-app-accent text-app-accent-fg font-semibold shadow-2xs"
                : "bg-app-surface hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border"
            }`}
          >
            Все города
          </button>

          {primaryCities.map((city) => {
            const isSelected = selectedCity === city;
            const count = cityCounts[city];
            return (
              <button
                key={city}
                type="button"
                onClick={() => onSelectCity(city)}
                className={`h-8 px-3.5 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  isSelected
                    ? "bg-app-accent text-app-accent-fg font-semibold shadow-2xs"
                    : "bg-app-surface hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border"
                }`}
              >
                <span>{city}</span>
                {count !== undefined && count > 0 && (
                  <span className={`text-[10px] font-mono tabular-nums ${isSelected ? "text-app-accent-fg/80" : "text-app-muted"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          <CityDropdown
            cities={cities}
            cityCounts={cityCounts}
            totalShops={totalShops}
            selectedCity={selectedCity}
            onSelectCity={onSelectCity}
            primaryCities={primaryCities}
          />

          <button
            type="button"
            onClick={handleAutoDetectCity}
            disabled={isDetectingGeo}
            className="h-8 px-3.5 rounded-full text-xs font-medium bg-app-surface hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border transition-all cursor-pointer flex items-center gap-1.5 ml-auto whitespace-nowrap shrink-0"
            title="Определить мой город автоматически"
          >
            {isDetectingGeo ? (
              <Loader2 size={12} className="animate-spin text-emerald-500" />
            ) : (
              <Navigation size={12} className="text-emerald-500" />
            )}
            <span className="hidden sm:inline">Определить локацию</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative z-20 bg-app-surface border border-app-border rounded-xl mb-6 overflow-hidden">
      {/* Top Row: Editorial Header + 1px Hairline Divided Metric Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-app-border">
        {/* Editorial Intro Column */}
        <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-center space-y-1.5">
          <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 tracking-wide">
            Единая витрина · Telegram WebApp
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-app-primary tracking-tight text-balance-wrap">
            Каталог заведений и сервисов
          </h1>
          <p className="text-xs sm:text-sm text-app-secondary leading-relaxed max-w-xl">
            Выбирайте проверенные заведения, просматривайте актуальное меню и оформляйте заказы напрямую с мгновенной синхронизацией статуса.
          </p>
        </div>

        {/* Swiss Tabular Metrics Strip (3 Equal Columns divided by 1px hairlines) */}
        <div className="lg:col-span-5 grid grid-cols-3 divide-x divide-app-border bg-app-bg/40">
          <div className="p-4 sm:p-5 flex flex-col justify-between">
            <span className="text-[11px] text-app-muted font-medium">Заведений</span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-app-primary tabular-nums mt-2">
              {totalShops}
            </span>
          </div>

          <div className="p-4 sm:p-5 flex flex-col justify-between">
            <span className="text-[11px] text-app-muted font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Открыто</span>
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-2">
              {openCount}
            </span>
          </div>

          <div className="p-4 sm:p-5 flex flex-col justify-between">
            <span className="text-[11px] text-app-muted font-medium">Позиций меню</span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-app-primary tabular-nums mt-2">
              {totalServices}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Hairline City Filter Toolbar */}
      <div className="px-4 sm:px-6 py-3 border-t border-app-border bg-app-surface flex items-center gap-2 flex-wrap text-xs">
        <span className="text-app-muted font-medium flex items-center gap-1.5 shrink-0 mr-1">
          <MapPin size={13} className="text-app-muted" />
          <span>Локация:</span>
        </span>

        {/* 1. Все города */}
        <button
          type="button"
          onClick={() => onSelectCity("ALL")}
          className={`h-7 px-2.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            selectedCity === "ALL"
              ? "bg-app-accent text-app-accent-fg font-semibold"
              : "bg-transparent hover:bg-app-hover text-app-secondary hover:text-app-primary border border-transparent hover:border-app-border"
          }`}
        >
          Все города
        </button>

        {/* 2, 3, 4. Primary Cities */}
        {primaryCities.map((city) => {
          const isSelected = selectedCity === city;
          const count = cityCounts[city];

          return (
            <button
              key={city}
              type="button"
              onClick={() => onSelectCity(city)}
              className={`h-7 px-2.5 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                isSelected
                  ? "bg-app-accent text-app-accent-fg font-semibold"
                  : "bg-transparent hover:bg-app-hover text-app-secondary hover:text-app-primary border border-transparent hover:border-app-border font-medium"
              }`}
            >
              <span>{city}</span>
              {count !== undefined && count > 0 && (
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

        {/* Custom searchable dropdown for all other cities */}
        <CityDropdown
          cities={cities}
          cityCounts={cityCounts}
          totalShops={totalShops}
          selectedCity={selectedCity}
          onSelectCity={onSelectCity}
          primaryCities={primaryCities}
        />

        {/* Geolocation auto-detection button */}
        <button
          type="button"
          onClick={handleAutoDetectCity}
          disabled={isDetectingGeo}
          className="h-7 px-2.5 rounded-md text-xs font-medium bg-app-bg hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border transition-all cursor-pointer flex items-center gap-1.5 ml-auto whitespace-nowrap shrink-0"
          title="Определить мой город автоматически"
        >
          {isDetectingGeo ? (
            <Loader2 size={12} className="animate-spin text-emerald-500" />
          ) : (
            <Navigation size={12} className="text-emerald-500" />
          )}
          <span className="hidden sm:inline">Геолокация</span>
        </button>
      </div>
    </section>
  );
};
