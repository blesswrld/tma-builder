import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface ExplorePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  disabled?: boolean;
}

export const ExplorePagination: React.FC<ExplorePaginationProps> = React.memo(
  ({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    disabled = false,
  }) => {
    // Calculate items range
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    // Compute page numbers array with smart ellipsis
    const pageNumbers = useMemo(() => {
      if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      const pages: (number | string)[] = [];

      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }

      return pages;
    }, [currentPage, totalPages]);

    if (totalPages <= 1 && totalItems <= pageSize) {
      return (
        <div className="bg-app-surface/60 border border-app-border rounded-2xl px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-app-muted shadow-2xs backdrop-blur-xs">
          <span className="font-medium">
            Показано <span className="text-app-primary font-semibold">{totalItems}</span> из{" "}
            <span className="text-app-primary font-semibold">{totalItems}</span> заведений
          </span>
          {onPageSizeChange && (
            <div className="flex items-center gap-2">
              <span className="text-app-muted">Показывать по:</span>
              <div className="flex items-center gap-1 bg-app-card p-0.5 rounded-lg border border-app-border">
                {[12, 24, 48].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => onPageSizeChange(size)}
                    className={`h-6 px-2 text-[11px] font-medium rounded-md transition-colors ${
                      pageSize === size
                        ? "bg-app-accent text-app-accent-fg font-semibold shadow-2xs"
                        : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className="bg-app-surface/70 border border-app-border rounded-2xl p-3 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs backdrop-blur-xs"
        role="navigation"
        aria-label="Пагинация каталога"
      >
        {/* Info & Page size selector */}
        <div className="flex items-center gap-3 text-xs text-app-muted w-full sm:w-auto justify-between sm:justify-start">
          <span className="font-medium">
            Показано{" "}
            <span className="text-app-primary font-semibold">
              {startItem}–{endItem}
            </span>{" "}
            из <span className="text-app-primary font-semibold">{totalItems}</span>
          </span>

          {onPageSizeChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-app-muted hidden md:inline">По:</span>
              <div className="flex items-center gap-0.5 bg-app-card p-0.5 rounded-lg border border-app-border">
                {[12, 24, 48].map((size) => (
                  <button
                    key={size}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPageSizeChange(size)}
                    className={`h-6 px-2 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                      pageSize === size
                        ? "bg-app-accent text-app-accent-fg font-semibold shadow-2xs"
                        : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    aria-label={`Показывать по ${size}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Page controls */}
        <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
          {/* Previous page button */}
          <button
            type="button"
            disabled={currentPage <= 1 || disabled}
            onClick={() => onPageChange(currentPage - 1)}
            className={`h-8 px-2.5 rounded-lg border border-app-border text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
              currentPage <= 1 || disabled
                ? "opacity-30 cursor-not-allowed bg-transparent text-app-muted border-app-border/40"
                : "bg-app-card hover:bg-app-hover text-app-primary active:scale-[0.98] shadow-2xs"
            }`}
            aria-label="Предыдущая страница"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Назад</span>
          </button>

          {/* Numeric page buttons */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((page, idx) => {
              if (page === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-7 h-8 flex items-center justify-center text-app-muted text-xs select-none font-bold"
                  >
                    …
                  </span>
                );
              }

              const pageNum = page as number;
              const isActive = pageNum === currentPage;

              return (
                <button
                  key={pageNum}
                  type="button"
                  disabled={disabled}
                  onClick={() => onPageChange(pageNum)}
                  className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer ${
                    isActive
                      ? "bg-app-accent text-app-accent-fg font-semibold shadow-2xs"
                      : "bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border active:scale-[0.98]"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  aria-label={`Страница ${pageNum}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next page button */}
          <button
            type="button"
            disabled={currentPage >= totalPages || disabled}
            onClick={() => onPageChange(currentPage + 1)}
            className={`h-8 px-2.5 rounded-lg border border-app-border text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
              currentPage >= totalPages || disabled
                ? "opacity-30 cursor-not-allowed bg-transparent text-app-muted border-app-border/40"
                : "bg-app-card hover:bg-app-hover text-app-primary active:scale-[0.98] shadow-2xs"
            }`}
            aria-label="Следующая страница"
          >
            <span className="hidden xs:inline">Вперед</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }
);

ExplorePagination.displayName = "ExplorePagination";
