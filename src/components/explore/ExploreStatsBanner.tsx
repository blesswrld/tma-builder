import React, { useState } from "react";
import { Sparkles, MapPin, Navigation, Loader2 } from "lucide-react";
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
  // 4 primary chips: "Все города", "Грозный", "Москва", "Санкт-Петербург"
  const primaryCities = ["Грозный", "Москва", "Санкт-Петербург"];
  const [isDetectingGeo, setIsDetectingGeo] = useState(false);

  const handleAutoDetectCity = () => {
    if (!navigator.geolocation) {
      alert("Геолокация не поддерживается вашим браузером");
      return;
    }

    setIsDetectingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGeo(false);
        const { latitude, longitude } = pos.coords;

        // Find closest city
        let closestCity = "Москва";
        let minDistance = Infinity;

        const allAvailableCities = Array.from(new Set([...primaryCities, ...cities, ...Object.keys(CITY_COORDINATES)]));

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

  return (
    <div className="relative z-20 rounded-2xl bg-app-card border border-app-border p-4 sm:p-6 mb-6 shadow-2xs">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-app-surface text-app-primary border border-app-border">
            <Sparkles size={12} className="text-app-primary" />
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
          <div className="px-3.5 py-2 rounded-xl bg-app-surface border border-app-border shadow-xs">
            <div className="text-base sm:text-lg font-mono font-bold text-app-primary leading-tight">
              {totalShops}
            </div>
            <div className="text-[10px] font-mono text-app-muted uppercase">Заведений</div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-app-surface border border-app-border shadow-xs">
            <div className="text-base sm:text-lg font-mono font-bold text-app-primary leading-tight">
              {openCount}
            </div>
            <div className="text-[10px] font-mono text-app-muted uppercase">Открыто сейчас</div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-app-surface border border-app-border shadow-xs">
            <div className="text-base sm:text-lg font-mono font-bold text-app-primary leading-tight">
              {totalServices}
            </div>
            <div className="text-[10px] font-mono text-app-muted uppercase">Позиций меню</div>
          </div>
        </div>
      </div>

      {/* City filter area: 4 primary chips + custom dropdown for all other cities */}
      <div className="flex items-center gap-2 pt-4 border-t border-app-border mt-4 flex-wrap text-xs">
        <span className="text-app-muted font-medium flex items-center gap-1 shrink-0">
          <MapPin size={12} className="text-app-muted" />
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

        {/* Geolocation auto-detection button */}
        <button
          type="button"
          onClick={handleAutoDetectCity}
          disabled={isDetectingGeo}
          className="px-2.5 py-1.5 rounded-xl text-xs font-mono bg-app-surface hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ml-auto"
          title="Определить мой город автоматически"
        >
          {isDetectingGeo ? (
            <Loader2 size={12} className="animate-spin text-app-primary" />
          ) : (
            <Navigation size={12} className="text-app-primary" />
          )}
          <span className="hidden sm:inline">Определить город</span>
        </button>
      </div>
    </div>
  );
};
