import React from "react";
import { Banner } from "../../types";

interface ShopBannersProps {
  banners: Banner[];
}

export const ShopBanners: React.FC<ShopBannersProps> = ({ banners }) => {
  if (!banners || banners.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {banners.map(banner => (
        <div 
          key={banner.id}
          className="relative overflow-hidden p-6 rounded-2xl bg-app-card border border-app-border space-y-2 group"
        >
          {banner.badge && (
            <span className="inline-block px-2.5 py-0.5 bg-app-badge text-app-primary font-mono text-[10px] rounded-full uppercase tracking-wider border border-app-border">
              {banner.badge}
            </span>
          )}
          <h3 className="text-base font-bold text-app-primary tracking-tight">{banner.title}</h3>
          {banner.subtitle && (
            <p className="text-xs text-app-secondary leading-relaxed">{banner.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
};
