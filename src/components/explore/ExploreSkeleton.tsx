import React from "react";

interface ExploreSkeletonProps {
  count?: number;
  viewMode?: "grid" | "list";
}

export const ExploreSkeleton: React.FC<ExploreSkeletonProps> = React.memo(
  ({ count = 12, viewMode = "grid" }) => {
    const items = Array.from({ length: count }, (_, i) => i);

    if (viewMode === "list") {
      return (
        <div className="space-y-3" role="status" aria-label="Загрузка заведений...">
          {items.map((key) => (
            <div
              key={key}
              className="bg-app-surface border border-app-border rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 transform-gpu animate-pulse shadow-xs"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 w-full sm:w-auto">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-app-card/80 flex-shrink-0 border border-app-border/40" />
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-4.5 bg-app-card/90 rounded-md w-40 sm:w-52" />
                    <div className="h-4 bg-app-card/60 rounded-full w-14 hidden sm:block" />
                  </div>
                  <div className="h-3.5 bg-app-card/60 rounded-md w-48 sm:w-64" />
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="h-3 bg-app-card/40 rounded-md w-24" />
                    <div className="h-3 bg-app-card/40 rounded-md w-28 hidden sm:block" />
                  </div>
                </div>
              </div>

              {/* Right Action column */}
              <div className="flex items-center justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-app-border/40">
                <div className="w-9 h-9 rounded-xl bg-app-card/70 flex-shrink-0" />
                <div className="h-9 w-28 sm:w-32 bg-app-card/90 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
        role="status"
        aria-label="Загрузка заведений..."
      >
        {items.map((key) => (
          <div
            key={key}
            className="bg-app-surface border border-app-border rounded-2xl overflow-hidden flex flex-col transform-gpu animate-pulse shadow-xs"
          >
            {/* Top Banner area */}
            <div className="h-40 sm:h-44 w-full bg-app-card/70 relative overflow-hidden">
              {/* Status badge skeleton */}
              <div className="absolute top-2.5 right-2.5 h-5 w-16 bg-app-surface/90 rounded-full" />
              {/* Logo skeleton */}
              <div className="absolute bottom-2 left-2 w-9 h-9 rounded-lg bg-app-surface/90 border border-app-border" />
            </div>

            {/* Body */}
            <div className="p-4 pt-5 flex-1 flex flex-col justify-between space-y-3">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2 min-h-[1.5rem]">
                  <div className="h-5 bg-app-card/90 rounded-md w-3/5" />
                  <div className="h-4 bg-app-card/60 rounded-full w-14" />
                </div>
                <div className="min-h-[2.5rem] space-y-1.5">
                  <div className="h-3.5 bg-app-card/60 rounded-md w-full" />
                  <div className="h-3.5 bg-app-card/50 rounded-md w-4/5" />
                </div>

                {/* Address & Hours skeleton */}
                <div className="pt-1 border-t border-app-border/60 min-h-[2.6rem] flex flex-col justify-center space-y-1.5">
                  <div className="h-3 bg-app-card/50 rounded-md w-3/4" />
                  <div className="h-3 bg-app-card/40 rounded-md w-1/2" />
                </div>

                {/* Service items preview skeleton */}
                <div className="pt-2">
                  <div className="h-3 bg-app-card/40 rounded-md w-28 mb-2" />
                  <div className="space-y-1.5 h-[62px]">
                    <div className="h-7 bg-app-card/50 rounded-lg w-full" />
                    <div className="h-7 bg-app-card/40 rounded-lg w-full" />
                  </div>
                </div>
              </div>

              {/* Bottom footer */}
              <div className="mt-auto pt-3 border-t border-app-border flex items-center justify-between gap-2">
                <div className="h-3.5 bg-app-card/70 rounded-md w-24" />
                <div className="h-8 w-24 bg-app-card/90 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
);

ExploreSkeleton.displayName = "ExploreSkeleton";
