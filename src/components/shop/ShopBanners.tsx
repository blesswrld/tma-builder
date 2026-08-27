import React from "react";
import { Banner } from "../../types";

interface ShopBannersProps {
  banners: Banner[];
}

export const ShopBanners: React.FC<ShopBannersProps> = ({ banners }) => {
  if (!banners || banners.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {banners.map((banner) => {
        const hasImage = Boolean(banner.imageUrl);

        return (
          <div
            key={banner.id}
            className={`relative overflow-hidden p-5 rounded-2xl border transition-all duration-300 group flex flex-col justify-between min-h-[110px] ${
              hasImage
                ? "bg-zinc-950 border-white/10 text-white shadow-md hover:border-white/25"
                : "bg-app-card border-app-border text-app-primary hover:border-app-primary/30"
            }`}
          >
            {hasImage && (
              <>
                <div className="absolute inset-0 pointer-events-none overflow-hidden transition-transform duration-700 ease-out group-hover:scale-105">
                  <img
                    src={banner.imageUrl}
                    alt=""
                    className="w-full h-full object-cover opacity-65 group-hover:opacity-75 transition-opacity duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                {/* Soft gradient overlay for crystal clear typography legibility */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/85 via-black/60 to-black/25" />
              </>
            )}

            <div className="relative z-10 space-y-2">
              {banner.badge && (
                <span
                  className={`inline-block px-2.5 py-0.5 font-mono text-[10px] font-bold rounded-md uppercase tracking-wider border shadow-xs ${
                    hasImage
                      ? "bg-white/20 text-white border-white/25 backdrop-blur-md"
                      : "bg-app-surface text-app-primary border-app-border"
                  }`}
                >
                  {banner.badge}
                </span>
              )}
              <h3
                className={`text-sm font-bold tracking-tight font-sans ${
                  hasImage ? "text-white drop-shadow-xs" : "text-app-primary"
                }`}
              >
                {banner.title}
              </h3>
              {banner.subtitle && (
                <p
                  className={`text-xs leading-relaxed font-sans ${
                    hasImage ? "text-zinc-200" : "text-app-secondary"
                  }`}
                >
                  {banner.subtitle}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
