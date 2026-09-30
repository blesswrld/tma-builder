import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Banner } from "../../types";
import { ResponsiveImage } from "../common/ResponsiveImage";

interface ShopBannersProps {
  banners: Banner[];
}

export const ShopBanners: React.FC<ShopBannersProps> = ({ banners }) => {
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem("dismissed_banners");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeBanners = (banners || []).filter((b) => !dismissedIds.includes(b.id));

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds((prev) => {
      const next = [...prev, id];
      try {
        sessionStorage.setItem("dismissed_banners", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, offsetWidth } = scrollRef.current;
    if (offsetWidth > 0) {
      const index = Math.round(scrollLeft / (offsetWidth * 0.88));
      setActiveIndex(Math.min(Math.max(0, index), activeBanners.length - 1));
    }
  };

  useEffect(() => {
    if (activeIndex >= activeBanners.length && activeBanners.length > 0) {
      setActiveIndex(activeBanners.length - 1);
    }
  }, [activeBanners.length, activeIndex]);

  if (activeBanners.length === 0) return null;

  return (
    <div className="space-y-2 font-sans">
      {/* Container: Horizontal snap-swiper on mobile, grid on sm+ screens */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex sm:grid sm:grid-cols-2 gap-3 sm:gap-4 overflow-x-auto touch-scroll-x snap-x snap-mandatory scrollbar-none pb-1 -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {activeBanners.map((banner) => {
          const hasImage = Boolean(banner.imageUrl);

          return (
            <div
              key={banner.id}
              className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl border transition-all duration-300 group flex flex-col justify-between min-h-[105px] sm:min-h-[120px] shrink-0 w-[86vw] xs:w-[82vw] sm:w-auto snap-center shadow-2xs ${
                hasImage
                  ? "bg-zinc-950 border-white/15 dark-card shadow-md"
                  : "bg-app-card border-app-border text-app-primary"
              }`}
            >
              {/* Dismiss close button */}
              <button
                type="button"
                onClick={(e) => handleDismiss(banner.id, e)}
                className="absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-xl bg-black/40 hover:bg-black/70 backdrop-blur-md text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="Скрыть баннер"
                aria-label="Скрыть баннер"
              >
                <X size={13} />
              </button>

              {hasImage ? (
                <>
                  <div className="absolute inset-0 pointer-events-none overflow-hidden transition-transform duration-700 ease-out group-hover:scale-105">
                    <ResponsiveImage
                      src={banner.imageUrl}
                      alt={banner.title || "Banner"}
                      preset="banner"
                      className="w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-opacity duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  {/* Multi-stop deep gradient overlay guaranteeing crystal-clear white text readability */}
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/95 via-black/80 to-black/45" />

                  <div className="relative z-10 space-y-1.5 pr-6">
                    {banner.badge && (
                      <span className="inline-block px-2 py-0.5 font-mono text-[9px] font-bold rounded-md uppercase tracking-wider border border-white/30 bg-white/20 text-white keep-white backdrop-blur-md shadow-xs">
                        {banner.badge}
                      </span>
                    )}
                    <h3 className="text-sm sm:text-base font-bold tracking-tight font-sans text-white keep-white drop-shadow-md leading-snug">
                      {banner.title}
                    </h3>
                    {banner.subtitle && (
                      <p className="text-xs leading-relaxed font-sans text-zinc-200 keep-white-subtle drop-shadow-xs line-clamp-2">
                        {banner.subtitle}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="relative z-10 space-y-1.5 pr-6">
                  {banner.badge && (
                    <span className="inline-block px-2 py-0.5 font-mono text-[9px] font-bold rounded-md uppercase tracking-wider border border-app-border bg-app-surface text-app-primary">
                      {banner.badge}
                    </span>
                  )}
                  <h3 className="text-sm sm:text-base font-bold tracking-tight font-sans text-app-primary leading-snug">
                    {banner.title}
                  </h3>
                  {banner.subtitle && (
                    <p className="text-xs leading-relaxed font-sans text-app-secondary line-clamp-2">
                      {banner.subtitle}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination dots for mobile swiper when multiple banners exist */}
      {activeBanners.length > 1 && (
        <div className="flex sm:hidden items-center justify-center gap-1.5 pt-0.5">
          {activeBanners.map((b, idx) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                if (scrollRef.current) {
                  const targetX = idx * (scrollRef.current.offsetWidth * 0.86);
                  scrollRef.current.scrollTo({ left: targetX, behavior: "smooth" });
                }
              }}
              className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                activeIndex === idx
                  ? "w-5 bg-app-accent"
                  : "w-1.5 bg-app-border hover:bg-app-muted"
              }`}
              aria-label={`Баннер ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
