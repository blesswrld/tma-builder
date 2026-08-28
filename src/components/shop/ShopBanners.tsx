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
            className={`relative overflow-hidden p-5 rounded-2xl border transition-all duration-300 group flex flex-col justify-between min-h-[120px] ${
              hasImage
                ? "bg-zinc-950 border-white/15 dark-card shadow-md hover:border-white/30"
                : "bg-app-card border-app-border text-app-primary hover:border-app-border hover:shadow-xs"
            }`}
          >
            {hasImage ? (
              <>
                <div className="absolute inset-0 pointer-events-none overflow-hidden transition-transform duration-700 ease-out group-hover:scale-105">
                  <img
                    src={banner.imageUrl}
                    alt=""
                    className="w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-opacity duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                {/* Multi-stop deep gradient overlay guaranteeing crystal-clear white text readability */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/95 via-black/80 to-black/45" />

                <div className="relative z-10 space-y-2">
                  {banner.badge && (
                    <span className="inline-block px-2.5 py-0.5 font-mono text-[10px] font-bold rounded-md uppercase tracking-wider border border-white/30 bg-white/20 text-white keep-white backdrop-blur-md shadow-xs">
                      {banner.badge}
                    </span>
                  )}
                  <h3 className="text-sm sm:text-base font-bold tracking-tight font-sans text-white keep-white drop-shadow-md leading-snug">
                    {banner.title}
                  </h3>
                  {banner.subtitle && (
                    <p className="text-xs sm:text-sm leading-relaxed font-sans text-zinc-200 keep-white-subtle drop-shadow-xs line-clamp-2">
                      {banner.subtitle}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="relative z-10 space-y-2">
                {banner.badge && (
                  <span className="inline-block px-2.5 py-0.5 font-mono text-[10px] font-bold rounded-md uppercase tracking-wider border border-app-border bg-app-surface text-app-primary">
                    {banner.badge}
                  </span>
                )}
                <h3 className="text-sm sm:text-base font-bold tracking-tight font-sans text-app-primary leading-snug">
                  {banner.title}
                </h3>
                {banner.subtitle && (
                  <p className="text-xs sm:text-sm leading-relaxed font-sans text-app-secondary line-clamp-2">
                    {banner.subtitle}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
