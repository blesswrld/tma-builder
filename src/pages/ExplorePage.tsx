import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Store,
  Compass,
  Search,
  RotateCcw,
  ArrowUp,
  Sparkles,
  Layers,
  PlusCircle,
  Heart,
} from "lucide-react";
import { PublicShop, PublicShopsResponse } from "../types";
import { useTheme } from "../context/ThemeContext";
import { useRealtime, useRealtimeEvent, RealtimeEvent } from "../context/RealtimeContext";
import { ExploreHeader } from "../components/explore/ExploreHeader";
import { ExploreFilters } from "../components/explore/ExploreFilters";
import { ExploreStatsBanner } from "../components/explore/ExploreStatsBanner";
import { ShopCard } from "../components/explore/ShopCard";
import { ExplorePagination } from "../components/explore/ExplorePagination";
import { ExploreSkeleton } from "../components/explore/ExploreSkeleton";
import { computationWorker } from "../workers/workerManager";

export const ExplorePage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state synchronization
  const initialCategory = searchParams.get("category") || "ALL";
  const initialSearch = searchParams.get("q") || "";
  const initialPage = parseInt(searchParams.get("page") || "1", 10);

  // Realtime connection hook
  const { isConnected: isRealtimeConnected, subscribeShop } = useRealtime();

  // Shops pool & pagination state
  const [allLoadedShops, setAllLoadedShops] = useState<PublicShop[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(
    isNaN(initialPage) || initialPage < 1 ? 1 : initialPage
  );
  const [pageSize, setPageSize] = useState<number>(12);
  const [isPageTransitioning, setIsPageTransitioning] = useState<boolean>(false);
  const [serverTotal, setServerTotal] = useState<number>(0);
  const catalogRef = useRef<HTMLDivElement>(null);
  const isInitialFilterRender = useRef<boolean>(true);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [platformStats, setPlatformStats] = useState({
    totalShops: 0,
    openCount: 0,
    totalServices: 0,
    cities: [] as string[],
    cityCounts: {} as Record<string, number>,
  });

  // Filter & search states
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedCity, setSelectedCity] = useState<string>("ALL");
  const [onlyOpen, setOnlyOpen] = useState<boolean>(false);
  const [onlyDelivery, setOnlyDelivery] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [hasCashback, setHasCashback] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"popular" | "rating" | "newest" | "name" | "services">(() => {
    try {
      const saved = localStorage.getItem("explore_sort_by");
      if (saved && ["popular", "rating", "newest", "name", "services"].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return "popular";
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try {
      const saved = localStorage.getItem("explore_view_mode");
      if (saved === "grid" || saved === "list") return saved;
    } catch {}
    return "grid";
  });

  useEffect(() => {
    try {
      localStorage.setItem("explore_sort_by", sortBy);
    } catch {}
  }, [sortBy]);

  useEffect(() => {
    try {
      localStorage.setItem("explore_view_mode", viewMode);
    } catch {}
  }, [viewMode]);

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("tma_favorite_shops") || "[]");
    } catch {
      return [];
    }
  });
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);

  // Worker-filtered shops
  const [filteredShops, setFilteredShops] = useState<PublicShop[]>([]);
  const [totalFiltered, setTotalFiltered] = useState<number>(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  // Fetch full live data from backend (with silent mode for realtime updates)
  const fetchShopsData = useCallback(async (limit = 200, isSilent = false) => {
    if (!isSilent) setIsLoadingInitial(true);
    try {
      const res = await fetch(`/api/explore/shops?limit=${limit}&page=1`);
      if (res.ok) {
        const data: PublicShopsResponse = await res.json();
        if (data && Array.isArray(data.shops)) {
          setAllLoadedShops(data.shops);
          setServerTotal(data.total || data.shops.length);
          if (data.allCategories) {
            setAllCategories(data.allCategories);
          }
          if (data.stats) {
            setPlatformStats(data.stats);
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch latest shops from server:", err);
    } finally {
      if (!isSilent) setIsLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    fetchShopsData(200, false);
  }, [fetchShopsData]);

  // Subscribe to all platform updates on mount
  useEffect(() => {
    subscribeShop("EXPLORE_ALL");
  }, [subscribeShop]);

  // Cross-tab and in-app synchronized favorites
  useEffect(() => {
    const handleFavoritesStorage = (e: StorageEvent) => {
      if (e.key === "tma_favorite_shops") {
        try {
          const parsed = JSON.parse(e.newValue || "[]");
          if (Array.isArray(parsed)) {
            setFavorites(parsed);
          }
        } catch {}
      }
    };

    const handleCustomFavChange = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setFavorites(e.detail);
      }
    };

    window.addEventListener("storage", handleFavoritesStorage);
    window.addEventListener("tma_favorites_changed", handleCustomFavChange);

    return () => {
      window.removeEventListener("storage", handleFavoritesStorage);
      window.removeEventListener("tma_favorites_changed", handleCustomFavChange);
    };
  }, []);

  // Calculate existing favorite shops in the loaded catalog
  const activeFavoritesCount = useMemo(() => {
    if (allLoadedShops.length === 0) return 0;
    return allLoadedShops.filter(
      (s) => favorites.includes(s.id) || favorites.includes(s.slug)
    ).length;
  }, [allLoadedShops, favorites]);

  // Clean up any stale or deleted shop IDs from favorites automatically
  useEffect(() => {
    if (!isLoadingInitial) {
      if (allLoadedShops.length === 0) {
        if (favorites.length > 0) {
          setFavorites([]);
          try {
            localStorage.setItem("tma_favorite_shops", JSON.stringify([]));
          } catch {}
          window.dispatchEvent(new CustomEvent("tma_favorites_changed", { detail: [] }));
        }
      } else {
        const validIds = new Set(allLoadedShops.map((s) => s.id));
        const validSlugs = new Set(allLoadedShops.map((s) => s.slug));
        const cleaned = favorites.filter((id) => validIds.has(id) || validSlugs.has(id));
        if (cleaned.length !== favorites.length) {
          setFavorites(cleaned);
          try {
            localStorage.setItem("tma_favorite_shops", JSON.stringify(cleaned));
          } catch {}
          window.dispatchEvent(new CustomEvent("tma_favorites_changed", { detail: cleaned }));
        }
      }
    }
  }, [allLoadedShops, isLoadingInitial, favorites]);

  // Toggle favorite with full identification cleanup
  const handleToggleFavorite = useCallback(
    (shopIdentifier: string) => {
      const targetShop = allLoadedShops.find(
        (s) => s.id === shopIdentifier || s.slug === shopIdentifier
      );
      const targetId = targetShop?.id || shopIdentifier;
      const targetSlug = targetShop?.slug;

      setFavorites((prev) => {
        const isCurrentlyFav =
          prev.includes(targetId) || (Boolean(targetSlug) && prev.includes(targetSlug!));
        let next: string[];
        if (isCurrentlyFav) {
          // Remove all matching representations
          next = prev.filter(
            (id) => id !== targetId && id !== targetSlug && id !== shopIdentifier
          );
        } else {
          // Add canonical ID
          next = [...prev.filter((id) => id !== targetId && id !== targetSlug), targetId];
        }
        try {
          localStorage.setItem("tma_favorite_shops", JSON.stringify(next));
        } catch {}
        window.dispatchEvent(new CustomEvent("tma_favorites_changed", { detail: next }));
        return next;
      });
    },
    [allLoadedShops]
  );

  // Debounced background sync ref for non-critical aggregated data
  const debounceSyncRef = useRef<any>(null);
  const triggerDebouncedSync = useCallback(() => {
    if (debounceSyncRef.current) clearTimeout(debounceSyncRef.current);
    debounceSyncRef.current = setTimeout(() => {
      fetchShopsData(200, true);
    }, 300);
  }, [fetchShopsData]);

  // Realtime Events Handler via Native WebSocket
  useRealtimeEvent(
    [
      "SHOP_CREATED",
      "SHOP_UPDATED",
      "SHOP_DELETED",
      "SERVICE_CREATED",
      "SERVICE_UPDATED",
      "SERVICE_DELETED",
      "REVIEW_CREATED",
      "REVIEW_UPDATED",
      "REVIEW_DELETED",
      "REALTIME_RECONNECTED",
    ],
    useCallback(
      (event: RealtimeEvent) => {
        const type = event.type;
        const payload = event.payload;

        if (type === "SHOP_DELETED") {
          const deletedId = payload?.id || event.shopId;
          if (deletedId) {
            // 1. Immediately remove from allLoadedShops
            setAllLoadedShops((prev) => {
              const target = prev.find((s) => s.id === deletedId);
              const next = prev.filter((s) => s.id !== deletedId);
              if (target) {
                setPlatformStats((p) => ({
                  ...p,
                  totalShops: Math.max(0, p.totalShops - 1),
                  openCount: target.isOpen ? Math.max(0, p.openCount - 1) : p.openCount,
                }));
              }
              return next;
            });

            // 2. Immediately remove from favorites
            setFavorites((prev) => {
              const next = prev.filter((id) => id !== deletedId);
              try {
                localStorage.setItem("tma_favorite_shops", JSON.stringify(next));
              } catch {}
              window.dispatchEvent(new CustomEvent("tma_favorites_changed", { detail: next }));
              return next;
            });

            // 3. Trigger debounced background sync
            triggerDebouncedSync();
          }
          return;
        }

        if (type === "SHOP_UPDATED") {
          const updated = payload;
          const targetId = updated?.id || event.shopId;
          if (targetId) {
            setAllLoadedShops((prev) => {
              const idx = prev.findIndex((s) => s.id === targetId);
              if (idx === -1) {
                triggerDebouncedSync();
                return prev;
              }
              const current = prev[idx];
              const prevIsOpen = current.isOpen;
              const nextIsOpen =
                updated.isOpen !== undefined ? Boolean(updated.isOpen) : current.isOpen;

              let parsedDelivery = current.deliveryOptions;
              if (updated.deliveryOptions !== undefined) {
                try {
                  parsedDelivery =
                    typeof updated.deliveryOptions === "string"
                      ? JSON.parse(updated.deliveryOptions)
                      : updated.deliveryOptions;
                } catch {
                  parsedDelivery = current.deliveryOptions;
                }
              }

              const merged: PublicShop = {
                ...current,
                name: updated.name !== undefined ? updated.name : current.name,
                description:
                  updated.description !== undefined
                    ? updated.description || ""
                    : current.description,
                logoUrl: updated.logoUrl !== undefined ? updated.logoUrl : current.logoUrl,
                bannerUrl:
                  updated.bannerUrl !== undefined ? updated.bannerUrl : current.bannerUrl,
                workingHours:
                  updated.workingHours !== undefined
                    ? updated.workingHours
                    : current.workingHours,
                address: updated.address !== undefined ? updated.address : current.address,
                phone: updated.phone !== undefined ? updated.phone : current.phone,
                isOpen: nextIsOpen,
                cashbackPercent:
                  updated.cashbackPercent !== undefined
                    ? updated.cashbackPercent
                    : current.cashbackPercent,
                deliveryOptions: parsedDelivery,
              };

              if (prevIsOpen !== nextIsOpen) {
                setPlatformStats((p) => ({
                  ...p,
                  openCount: Math.max(0, p.openCount + (nextIsOpen ? 1 : -1)),
                }));
              }

              const next = [...prev];
              next[idx] = merged;
              return next;
            });
          }
          return;
        }

        if (type === "SHOP_CREATED" || type === "REALTIME_RECONNECTED") {
          fetchShopsData(100, true);
          return;
        }

        if (type.startsWith("SERVICE_") || type.startsWith("REVIEW_")) {
          triggerDebouncedSync();
        }
      },
      [triggerDebouncedSync, fetchShopsData]
    )
  );

  // Sync search, category & page to URL without full reload
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory && selectedCategory !== "ALL") params.set("category", selectedCategory);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (currentPage > 1) params.set("page", String(currentPage));
    setSearchParams(params, { replace: true });
  }, [selectedCategory, searchQuery, currentPage, setSearchParams]);

  // Reset to page 1 whenever any filter or sorting criteria changes
  useEffect(() => {
    if (isInitialFilterRender.current) {
      isInitialFilterRender.current = false;
      return;
    }
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedCategory,
    selectedCity,
    onlyOpen,
    onlyDelivery,
    minRating,
    hasCashback,
    onlyFavorites,
    sortBy,
  ]);

  // Clamp current page if total filtered items decreases
  useEffect(() => {
    if (totalFiltered > 0) {
      const maxPage = Math.max(1, Math.ceil(totalFiltered / pageSize));
      if (currentPage > maxPage) {
        setCurrentPage(maxPage);
      }
    }
  }, [totalFiltered, pageSize, currentPage]);

  // Run filtering & slicing in WebWorker
  useEffect(() => {
    let isCancelled = false;

    const runWorkerFilter = async () => {
      try {
        const offset = Math.max(0, (currentPage - 1) * pageSize);
        const result = await computationWorker.filterPublicShops({
          shops: allLoadedShops,
          searchQuery,
          category: selectedCategory,
          city: selectedCity,
          onlyOpen,
          onlyDelivery,
          minRating,
          hasCashback,
          favorites,
          onlyFavorites,
          sortBy,
          limit: pageSize,
          offset,
        });

        if (!isCancelled && result) {
          setFilteredShops(result.filteredShops);
          setTotalFiltered(result.totalFiltered);
          setCategoryCounts(result.categoryCounts || {});
          setIsPageTransitioning(false);
        }
      } catch (e) {
        console.error("Worker filtering error, fallback:", e);
        setIsPageTransitioning(false);
      }
    };

    runWorkerFilter();

    return () => {
      isCancelled = true;
    };
  }, [
    allLoadedShops,
    searchQuery,
    selectedCategory,
    selectedCity,
    onlyOpen,
    onlyDelivery,
    minRating,
    hasCashback,
    favorites,
    onlyFavorites,
    sortBy,
    currentPage,
    pageSize,
  ]);

  // Pagination navigation handlers with ultra-fast transitions
  const handlePageChange = useCallback((newPage: number) => {
    setIsPageTransitioning(true);
    setCurrentPage(newPage);
    if (catalogRef.current) {
      catalogRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setTimeout(() => {
      setIsPageTransitioning(false);
    }, 100);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setIsPageTransitioning(true);
    setPageSize(newSize);
    setCurrentPage(1);
    if (catalogRef.current) {
      catalogRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setTimeout(() => {
      setIsPageTransitioning(false);
    }, 100);
  }, []);

  // Reset filters
  const hasActiveFilters = Boolean(
    searchQuery ||
      selectedCategory !== "ALL" ||
      onlyOpen ||
      onlyDelivery ||
      minRating > 0 ||
      hasCashback ||
      onlyFavorites ||
      selectedCity !== "ALL"
  );

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("ALL");
    setSelectedCity("ALL");
    setOnlyOpen(false);
    setOnlyDelivery(false);
    setMinRating(0);
    setHasCashback(false);
    setOnlyFavorites(false);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-app-bg text-app-primary transition-colors flex flex-col selection:bg-emerald-500/20">
      {/* Platform Header */}
      <ExploreHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        favoritesCount={activeFavoritesCount}
        onlyFavorites={onlyFavorites}
        onToggleOnlyFavorites={() => setOnlyFavorites((prev) => !prev)}
        theme={theme}
        onToggleTheme={toggleTheme}
        totalShops={platformStats.totalShops}
        openCount={platformStats.openCount}
        isRealtimeConnected={isRealtimeConnected}
      />

      {/* Main Catalog Viewport */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Visual Banner with Platform Stats */}
        <ExploreStatsBanner
          totalShops={platformStats.totalShops}
          openCount={platformStats.openCount}
          totalServices={platformStats.totalServices}
          cities={platformStats.cities}
          cityCounts={platformStats.cityCounts}
          selectedCity={selectedCity}
          onSelectCity={(city) => {
            setSelectedCity(city);
          }}
        />

        {/* Filters, Categories & Controls */}
        <div className="bg-app-surface border border-app-border rounded-2xl p-4 shadow-xs">
          <ExploreFilters
            categories={allCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            categoryCounts={categoryCounts}
            totalCount={allLoadedShops.length}
            onlyOpen={onlyOpen}
            onToggleOnlyOpen={() => setOnlyOpen((prev) => !prev)}
            onlyDelivery={onlyDelivery}
            onToggleOnlyDelivery={() => setOnlyDelivery((prev) => !prev)}
            minRating={minRating}
            onSetMinRating={setMinRating}
            hasCashback={hasCashback}
            onToggleHasCashback={() => setHasCashback((prev) => !prev)}
            sortBy={sortBy}
            onChangeSortBy={setSortBy}
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={handleResetFilters}
          />
        </div>

        {/* Results Counter Bar */}
        <div className="flex items-center justify-between gap-2 text-xs font-mono text-app-muted px-1">
          <div>
            Найдено заведений:{" "}
            <span className="font-bold text-app-primary">{totalFiltered}</span>
            {totalFiltered !== allLoadedShops.length && (
              <span className="text-app-muted ml-1 font-normal">
                (из {allLoadedShops.length})
              </span>
            )}
          </div>
          {onlyFavorites && (
            <span className="text-rose-500 font-medium">
              Показаны только избранные заведения
            </span>
          )}
        </div>

        {/* Establishments Grid / List / Skeletons */}
        <div ref={catalogRef} className="scroll-mt-24">
          {isLoadingInitial || isPageTransitioning ? (
            <ExploreSkeleton count={pageSize} viewMode={viewMode} />
          ) : filteredShops.length === 0 ? (
            allLoadedShops.length === 0 ? (
              <div className="py-24 text-center bg-app-surface border border-dashed border-app-border rounded-3xl p-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-app-card border border-app-border flex items-center justify-center mx-auto text-app-muted shadow-xs">
                  <Store size={26} className="text-app-muted" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-app-primary">
                    Каталог заведений пуст
                  </h3>
                  <p className="text-xs text-app-muted leading-relaxed">
                    На платформе пока нет активных заведений. Создайте первое заведение в панели управления.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-app-accent text-app-accent-fg hover:opacity-90 transition-all cursor-pointer shadow-xs"
                  >
                    <PlusCircle size={14} />
                    <span>Перейти в кабинет</span>
                  </Link>
                </div>
              </div>
            ) : onlyFavorites ? (
              <div className="py-20 text-center bg-app-surface border border-dashed border-app-border rounded-3xl p-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-500 shadow-xs">
                  <Heart size={26} className="text-rose-500 fill-rose-500/20" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-app-primary">
                    В избранном пока нет заведений
                  </h3>
                  <p className="text-xs text-app-muted leading-relaxed">
                    Нажимайте на сердечко на карточке любого заведения, чтобы быстро находить его здесь.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setOnlyFavorites(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-app-accent text-app-accent-fg hover:opacity-90 transition-all cursor-pointer shadow-xs"
                  >
                    <Store size={14} />
                    <span>Показать все заведения</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center bg-app-surface border border-dashed border-app-border rounded-3xl p-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-app-card border border-app-border flex items-center justify-center mx-auto text-app-muted shadow-xs">
                  <Store size={26} className="text-app-muted" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-app-primary">
                    Заведения не найдены
                  </h3>
                  <p className="text-xs text-app-muted leading-relaxed">
                    Попробуйте изменить поисковый запрос, выбрать другую категорию или отключить фильтры.
                  </p>
                </div>
                {hasActiveFilters && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-app-card hover:bg-app-hover border border-app-border text-app-primary transition-all cursor-pointer shadow-xs"
                    >
                      <RotateCcw size={13} />
                      <span>Сбросить все фильтры</span>
                    </button>
                  </div>
                )}
              </div>
            )
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch"
                  : "space-y-3"
              }
            >
              {filteredShops.map((shop) => (
                <ShopCard
                  key={shop.id || shop.slug}
                  shop={shop}
                  isFavorite={favorites.includes(shop.id) || favorites.includes(shop.slug)}
                  onToggleFavorite={handleToggleFavorite}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </div>

        {/* Catalog Pagination */}
        {!isLoadingInitial && totalFiltered > 0 && (
          <div className="pb-12">
            <ExplorePagination
              currentPage={currentPage}
              totalPages={Math.max(1, Math.ceil(totalFiltered / pageSize))}
              totalItems={totalFiltered}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              disabled={isPageTransitioning}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-app-border bg-app-surface py-6 text-center text-xs text-app-muted">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Compass size={14} className="text-emerald-500" />
            <span className="font-semibold text-app-primary">TMA Builder Platform</span>
            <span>•</span>
            <span>Единый каталог заведений</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/admin" className="hover:text-app-primary transition-colors">
              Панель владельца
            </Link>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="hover:text-app-primary transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Наверх</span>
              <ArrowUp size={11} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
