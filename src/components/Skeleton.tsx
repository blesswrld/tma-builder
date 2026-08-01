import React from "react";

interface SkeletonProps {
  key?: React.Key;
  className?: string;
  style?: React.CSSProperties;
}

/** Basic Skeleton Primitive with Shimmer Effect */
export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={`skeleton-shimmer rounded-xl border border-app-border/40 ${className}`}
    />
  );
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

/** Skeleton for Single Service Card */
export function ServiceCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl bg-app-surface border border-app-border space-y-3 shadow-sm">
      <div className="flex gap-3 items-start">
        <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 rounded-md" />
          <Skeleton className="h-3 w-1/2 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="flex justify-between items-center pt-1">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
}

/** Skeleton for Reviews Drawer / Tab */
export function ReviewSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-2xl bg-app-surface border border-app-border space-y-2.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Skeleton className="w-7 h-7 rounded-full" />
              <Skeleton className="h-3.5 w-28 rounded-md" />
            </div>
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
          <Skeleton className="h-3.5 w-full rounded-md" />
          <Skeleton className="h-3.5 w-4/5 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for Full Customer Shop Page Loading */
export function ShopPageSkeleton() {
  return (
    <div className="min-h-screen bg-app-bg text-app-primary pb-24 font-sans animate-fade-in">
      {/* Cover / Header Banner Skeleton */}
      <div className="relative h-44 md:h-56 bg-app-surface border-b border-app-border overflow-hidden">
        <Skeleton className="w-full h-full rounded-none" />
        <div className="absolute top-4 right-4 flex gap-2">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="w-9 h-9 rounded-xl" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-12 relative z-10 space-y-6">
        {/* Profile Card Header Skeleton */}
        <div className="p-5 md:p-6 rounded-3xl bg-app-surface border border-app-border shadow-xl flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48 rounded-lg" />
              <Skeleton className="h-3.5 w-32 rounded-md" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>

        {/* Categories Bar Skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Skeleton className="h-8 w-24 rounded-xl shrink-0" />
          <Skeleton className="h-8 w-28 rounded-xl shrink-0" />
          <Skeleton className="h-8 w-20 rounded-xl shrink-0" />
          <Skeleton className="h-8 w-32 rounded-xl shrink-0" />
          <Skeleton className="h-8 w-24 rounded-xl shrink-0" />
        </div>

        {/* Promo Banner Carousel Skeleton */}
        <div className="relative rounded-3xl overflow-hidden">
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>

        {/* Service Cards Grid Skeleton */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <ServiceCardSkeleton />
            <ServiceCardSkeleton />
            <ServiceCardSkeleton />
            <ServiceCardSkeleton />
            <ServiceCardSkeleton />
            <ServiceCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton for Admin Dashboard Loading */
export function AdminPageSkeleton() {
  return (
    <div className="min-h-screen bg-app-bg text-app-primary font-sans">
      {/* Admin Header Skeleton */}
      <header className="sticky top-0 z-40 bg-app-surface/90 backdrop-blur-md border-b border-app-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-xl" />
            <Skeleton className="w-8 h-8 rounded-xl" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Navigation Tabs Skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-app-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-xl shrink-0" />
          ))}
        </div>

        {/* KPI Stat Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Main Orders Table Skeleton */}
        <div className="bg-app-surface border border-app-border rounded-3xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-xl" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-app-card border border-app-border flex justify-between items-center">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-40 rounded-md" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-8 w-24 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton for Analytics Component Loading */
export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-app-surface border border-app-border space-y-4">
          <Skeleton className="h-5 w-44 rounded-md" />
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
          <Skeleton className="h-5 w-44 rounded-md" />
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
