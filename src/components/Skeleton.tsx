import React from "react";

interface SkeletonProps {
  key?: React.Key;
  className?: string;
  style?: React.CSSProperties;
}

/** Basic Skeleton Primitive with Linear/Vercel Shimmer Effect */
export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={`skeleton-shimmer rounded-xl border border-app-border/40 shrink-0 ${className}`}
    />
  );
}

/** Text Line Skeleton Helper */
export function SkeletonText({
  lines = 1,
  className = "",
  widths = ["100%", "80%", "60%"],
  height = "h-3.5",
}: {
  lines?: number;
  className?: string;
  widths?: string[];
  height?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`${height} rounded-md`}
          style={{ width: widths[i % widths.length] }}
        />
      ))}
    </div>
  );
}

/** Avatar / Image Skeleton Helper */
export function SkeletonAvatar({
  size = "w-10 h-10",
  rounded = "rounded-full",
  className = "",
}: {
  size?: string;
  rounded?: string;
  className?: string;
}) {
  return <Skeleton className={`${size} ${rounded} ${className}`} />;
}

/** Badge / Pill Skeleton Helper */
export function SkeletonBadge({ className = "w-16 h-5" }: { className?: string }) {
  return <Skeleton className={`rounded-full ${className}`} />;
}

/** Button Skeleton Helper */
export function SkeletonButton({ className = "w-24 h-9" }: { className?: string }) {
  return <Skeleton className={`rounded-xl ${className}`} />;
}

/** Animated Spinner Loader Icon */
export function SpinnerLoader({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      style={{ width: size, height: size }}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}

/* ==========================================
 * SERVICE CARD SKELETONS (MOBILE / DESKTOP / RESPONSIVE)
 * ========================================== */

/** Compact Horizontal Mobile Service Card Skeleton */
export function MobileServiceCardSkeleton() {
  return (
    <div className="p-3.5 rounded-2xl bg-app-surface border border-app-border/70 flex gap-3.5 items-center justify-between shadow-xs">
      <div className="flex gap-3 items-center min-w-0 flex-1">
        <SkeletonAvatar size="w-14 h-14" rounded="rounded-xl" />
        <div className="flex-1 space-y-1.5 min-w-0">
          <Skeleton className="h-4 w-4/5 rounded-md" />
          <Skeleton className="h-3 w-1/2 rounded-md" />
          <div className="flex items-center gap-2 pt-0.5">
            <Skeleton className="h-4 w-12 rounded-md" />
            <Skeleton className="h-3.5 w-14 rounded-full" />
          </div>
        </div>
      </div>
      <Skeleton className="h-8 w-20 rounded-xl shrink-0" />
    </div>
  );
}

/** Rich Desktop Service Card Skeleton */
export function DesktopServiceCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-app-surface border border-app-border space-y-4 shadow-sm flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex gap-3.5 items-start">
          <SkeletonAvatar size="w-16 h-16" rounded="rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4.5 w-4/5 rounded-md" />
            <Skeleton className="h-3 w-1/3 rounded-md" />
            <div className="flex gap-1.5 pt-1">
              <SkeletonBadge className="w-12 h-4" />
              <SkeletonBadge className="w-16 h-4" />
            </div>
          </div>
        </div>
        <SkeletonText lines={2} widths={["100%", "70%"]} height="h-3" />
      </div>
      <div className="pt-2 border-t border-app-border/40 flex justify-between items-center">
        <div>
          <Skeleton className="h-3 w-12 rounded-md mb-1" />
          <Skeleton className="h-5 w-20 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Responsive Service Card Skeleton */
export function ServiceCardSkeleton() {
  return (
    <>
      <div className="block sm:hidden">
        <MobileServiceCardSkeleton />
      </div>
      <div className="hidden sm:block">
        <DesktopServiceCardSkeleton />
      </div>
    </>
  );
}

/* ==========================================
 * REVIEWS SKELETON
 * ========================================== */

/** Single Review Skeleton Item */
export function ReviewSkeletonItem() {
  return (
    <div className="p-4 rounded-2xl bg-app-surface border border-app-border space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <SkeletonAvatar size="w-8 h-8" />
          <div className="space-y-1">
            <Skeleton className="h-3.5 w-28 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-4 w-14 rounded-md" />
      </div>
      <SkeletonText lines={2} widths={["100%", "85%"]} />
      {/* Optional Store Response Skeleton */}
      <div className="p-3 rounded-xl bg-app-card border border-app-border/50 ml-4 space-y-1.5">
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="h-3 w-4/5 rounded-md" />
      </div>
    </div>
  );
}

/** List of Review Skeletons */
export function ReviewSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ReviewSkeletonItem key={i} />
      ))}
    </div>
  );
}

/* ==========================================
 * CUSTOMER SHOP PAGE SKELETONS (MOBILE / TABLET / DESKTOP)
 * ========================================== */

/** Mobile Shop Page Skeleton (Smartphones / Telegram Mini App) */
export function MobileShopSkeleton() {
  return (
    <div className="min-h-screen bg-app-bg text-app-primary pb-28 font-sans space-y-4 p-3 animate-fade-in">
      {/* Mobile Header Bar */}
      <div className="p-4 rounded-2xl bg-app-surface border border-app-border shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonAvatar size="w-12 h-12" rounded="rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="w-8 h-8 rounded-xl" />
        </div>
      </div>

      {/* Horizontal Category Scroll Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Skeleton className="h-8 w-20 rounded-xl shrink-0" />
        <Skeleton className="h-8 w-24 rounded-xl shrink-0" />
        <Skeleton className="h-8 w-28 rounded-xl shrink-0" />
        <Skeleton className="h-8 w-18 rounded-xl shrink-0" />
      </div>

      {/* Mobile Search Input */}
      <Skeleton className="h-10 w-full rounded-2xl" />

      {/* Promo Banner Slider */}
      <Skeleton className="h-28 w-full rounded-2xl" />

      {/* Services List Header */}
      <div className="flex justify-between items-center pt-1 px-1">
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-3.5 w-16 rounded-md" />
      </div>

      {/* Mobile Service Cards Stack */}
      <div className="space-y-3">
        <MobileServiceCardSkeleton />
        <MobileServiceCardSkeleton />
        <MobileServiceCardSkeleton />
        <MobileServiceCardSkeleton />
      </div>

      {/* Sticky Bottom Mini App Navigation Bar */}
      <div className="fixed bottom-3 left-3 right-3 p-3 rounded-2xl bg-app-surface/90 backdrop-blur-md border border-app-border shadow-2xl flex justify-between items-center z-40">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
    </div>
  );
}

/** Tablet Shop Page Skeleton */
export function TabletShopSkeleton() {
  return (
    <div className="min-h-screen bg-app-bg text-app-primary pb-20 font-sans p-6 space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Tablet Cover & Header */}
      <div className="p-6 rounded-3xl bg-app-surface border border-app-border shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SkeletonAvatar size="w-16 h-16" rounded="rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-44 rounded-lg" />
              <Skeleton className="h-3.5 w-28 rounded-md" />
              <div className="flex gap-2">
                <SkeletonBadge className="w-16 h-4" />
                <SkeletonBadge className="w-20 h-4" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Categories & Search Row */}
      <div className="flex gap-3 items-center">
        <Skeleton className="h-10 flex-1 rounded-2xl" />
        <div className="flex gap-2 overflow-x-auto scrollbar-none shrink-0">
          <Skeleton className="h-10 w-24 rounded-2xl" />
          <Skeleton className="h-10 w-28 rounded-2xl" />
          <Skeleton className="h-10 w-20 rounded-2xl" />
        </div>
      </div>

      {/* 2-Column Grid Skeletons */}
      <div className="grid grid-cols-2 gap-4">
        <DesktopServiceCardSkeleton />
        <DesktopServiceCardSkeleton />
        <DesktopServiceCardSkeleton />
        <DesktopServiceCardSkeleton />
      </div>
    </div>
  );
}

/** Desktop Shop Page Skeleton */
export function DesktopShopSkeleton() {
  return (
    <div className="min-h-screen bg-app-bg text-app-primary pb-24 font-sans animate-fade-in">
      {/* Header Cover Photo Skeleton */}
      <div className="relative h-48 lg:h-64 bg-app-surface border-b border-app-border overflow-hidden">
        <Skeleton className="w-full h-full rounded-none" />
        <div className="absolute top-4 right-6 flex gap-2">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="w-9 h-9 rounded-xl" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-16 relative z-10 space-y-8">
        {/* Profile Info Card */}
        <div className="p-6 rounded-3xl bg-app-surface border border-app-border shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-5">
            <SkeletonAvatar size="w-20 h-20" rounded="rounded-2xl" />
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-56 rounded-lg" />
                <SkeletonBadge className="w-20 h-5" />
              </div>
              <Skeleton className="h-3.5 w-40 rounded-md" />
              <div className="flex items-center gap-3 pt-1">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3 rounded-2xl bg-app-surface border border-app-border flex items-center justify-between gap-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
          <Skeleton className="h-9 w-64 rounded-xl shrink-0" />
        </div>

        {/* Promo Banners Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>

        {/* Services Grid (3 Columns) */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
          <div className="grid grid-cols-3 gap-5">
            <DesktopServiceCardSkeleton />
            <DesktopServiceCardSkeleton />
            <DesktopServiceCardSkeleton />
            <DesktopServiceCardSkeleton />
            <DesktopServiceCardSkeleton />
            <DesktopServiceCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Adaptive Shop Page Skeleton (Auto-Selects Responsive View) */
export function ShopPageSkeleton() {
  return (
    <>
      <div className="block md:hidden">
        <MobileShopSkeleton />
      </div>
      <div className="hidden md:block lg:hidden">
        <TabletShopSkeleton />
      </div>
      <div className="hidden lg:block">
        <DesktopShopSkeleton />
      </div>
    </>
  );
}

/* ==========================================
 * ADMIN DASHBOARD SKELETONS (MOBILE / TABLET / DESKTOP)
 * ========================================== */

/** Mobile Admin Skeleton */
export function MobileAdminSkeleton() {
  return (
    <div className="space-y-4 font-sans animate-fade-in">
      {/* Mobile Admin Header */}
      <div className="p-3 rounded-2xl bg-app-surface border border-app-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="w-8 h-8 rounded-xl" />
        </div>
      </div>

      {/* Swipeable Tabs Bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-xl shrink-0" />
        ))}
      </div>

      {/* Mobile KPI Cards Stack */}
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-3.5 rounded-2xl bg-app-surface border border-app-border space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="w-6 h-6 rounded-lg" />
            </div>
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-2.5 w-12 rounded-md" />
          </div>
        ))}
      </div>

      {/* Mobile Orders List */}
      <div className="p-4 rounded-2xl bg-app-surface border border-app-border space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 rounded-xl bg-app-card border border-app-border/60 flex justify-between items-center">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-24 rounded-md" />
                  <SkeletonBadge className="w-12 h-4" />
                </div>
                <Skeleton className="h-3 w-36 rounded-md" />
              </div>
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Tablet Admin Skeleton */
export function TabletAdminSkeleton() {
  return (
    <div className="min-h-screen bg-app-bg text-app-primary p-6 space-y-6 font-sans animate-fade-in">
      {/* Tablet Header */}
      <div className="p-4 rounded-2xl bg-app-surface border border-app-border flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="h-5 w-40 rounded-md" />
          <SkeletonBadge className="w-20 h-5" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="w-8 h-8 rounded-xl" />
        </div>
      </div>

      {/* 2x2 KPI Grid */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 rounded-2xl bg-app-surface border border-app-border space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="w-8 h-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-32 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="p-5 rounded-3xl bg-app-surface border border-app-border space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-xl" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-app-card border border-app-border flex justify-between items-center">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-3 w-48 rounded-md" />
              </div>
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Desktop Admin Skeleton */
export function DesktopAdminSkeleton() {
  return (
    <div className="min-h-screen bg-app-bg text-app-primary font-sans flex animate-fade-in">
      {/* Desktop Sidebar Placeholder */}
      <aside className="w-64 border-r border-app-border bg-app-surface p-4 flex flex-col justify-between shrink-0 h-screen sticky top-0">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-7 h-7 rounded-lg" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>
            <Skeleton className="w-6 h-6 rounded-md" />
          </div>

          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-app-card/40">
                <Skeleton className="w-4 h-4 rounded-md" />
                <Skeleton className="h-3.5 w-28 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-app-card border border-app-border flex items-center gap-3">
          <SkeletonAvatar size="w-8 h-8" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3.5 w-24 rounded-md" />
            <Skeleton className="h-2.5 w-16 rounded-md" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 space-y-8 overflow-y-auto">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex justify-between items-center">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-3.5 w-64 rounded-md" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
        </div>

        {/* 4 KPI Cards Row */}
        <div className="grid grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl bg-app-surface border border-app-border space-y-3 shadow-xs">
              <div className="flex justify-between items-center">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="w-8 h-8 rounded-xl" />
              </div>
              <Skeleton className="h-7 w-28 rounded-lg" />
              <div className="flex items-center gap-2">
                <SkeletonBadge className="w-12 h-4" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>

        {/* Orders Table Skeleton */}
        <div className="p-6 rounded-3xl bg-app-surface border border-app-border space-y-5 shadow-xs">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-36 rounded-md" />
              <SkeletonBadge className="w-16 h-5" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-48 rounded-xl" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
          </div>

          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-app-card border border-app-border/80 flex items-center justify-between">
                <div className="flex items-center gap-4 w-1/3">
                  <SkeletonAvatar size="w-9 h-9" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-32 rounded-md" />
                    <Skeleton className="h-3 w-24 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-lg" />
                <SkeletonBadge className="w-20 h-6" />
                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/** Adaptive Admin Page Skeleton */
export function AdminPageSkeleton() {
  return (
    <>
      <div className="block md:hidden">
        <MobileAdminSkeleton />
      </div>
      <div className="hidden md:block lg:hidden">
        <TabletAdminSkeleton />
      </div>
      <div className="hidden lg:block">
        <DesktopAdminSkeleton />
      </div>
    </>
  );
}

/* ==========================================
 * ANALYTICS SKELETONS (MOBILE / DESKTOP)
 * ========================================== */

/** Mobile Analytics Skeleton */
export function MobileAnalyticsSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-3.5 rounded-2xl bg-app-surface border border-app-border space-y-2">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
        ))}
      </div>
      <div className="p-4 rounded-2xl bg-app-surface border border-app-border space-y-3">
        <Skeleton className="h-4 w-32 rounded-md" />
        <div className="h-40 flex items-end gap-2 pt-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${25 + (i * 12) % 65}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Desktop Analytics Skeleton */
export function DesktopAnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 rounded-2xl bg-app-surface border border-app-border space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="w-8 h-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-28 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        ))}
      </div>

      {/* 2 Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-app-surface border border-app-border space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
          <div className="h-64 flex items-end gap-3 pt-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t-lg"
                style={{ height: `${20 + ((i * 17) % 70)}%` }}
              />
            ))}
          </div>
        </div>
        <div className="p-6 rounded-3xl bg-app-surface border border-app-border space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
          <div className="h-64 flex items-end gap-3 pt-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t-lg"
                style={{ height: `${30 + ((i * 23) % 60)}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Adaptive Analytics Skeleton */
export function AnalyticsSkeleton() {
  return (
    <>
      <div className="block md:hidden">
        <MobileAnalyticsSkeleton />
      </div>
      <div className="hidden md:block">
        <DesktopAnalyticsSkeleton />
      </div>
    </>
  );
}

/* ==========================================
 * MISCELLANEOUS SKELETONS (BOT SIMULATOR & MODAL)
 * ========================================== */

/** Bot Simulator Window Skeleton */
export function BotSimulatorSkeleton() {
  return (
    <div className="w-full max-w-md mx-auto p-4 rounded-3xl bg-app-surface border border-app-border shadow-xl space-y-4 font-sans">
      <div className="flex items-center gap-3 border-b border-app-border/60 pb-3">
        <SkeletonAvatar size="w-10 h-10" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
      </div>
      <div className="space-y-3 py-4">
        <div className="flex gap-2 items-end">
          <SkeletonAvatar size="w-7 h-7" />
          <Skeleton className="h-12 w-3/4 rounded-2xl rounded-bl-none" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-9 w-1/2 rounded-2xl rounded-br-none" />
        </div>
        <div className="flex gap-2 items-end">
          <SkeletonAvatar size="w-7 h-7" />
          <Skeleton className="h-16 w-4/5 rounded-2xl rounded-bl-none" />
        </div>
      </div>
      <div className="pt-2 border-t border-app-border/60 flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
    </div>
  );
}

/** Generic Modal Skeleton */
export function ModalSkeleton() {
  return (
    <div className="p-6 rounded-3xl bg-app-surface border border-app-border max-w-md w-full space-y-5 shadow-2xl">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-40 rounded-md" />
        <Skeleton className="w-7 h-7 rounded-lg" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-24 rounded-md" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-3.5 w-20 rounded-md" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
      <div className="flex gap-3 pt-2">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 flex-1 rounded-xl" />
      </div>
    </div>
  );
}
