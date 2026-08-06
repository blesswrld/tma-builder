import React from "react";
import {
  Star,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Check,
  MessageSquare,
  Trash2,
  X,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SpinnerLoader } from "../Skeleton";

interface Review {
  id: string;
  customerName?: string;
  rating: number;
  comment?: string;
  reply?: string;
  createdAt: string;
}

interface AdminReviewsTabProps {
  computedAvgRating: string;
  totalReviewsCount: number;
  positivePercentage: number;
  unrepliedCount: number;
  repliedCount: number;
  starCounts: { 1: number; 2: number; 3: number; 4: number; 5: number };
  reviewStarFilter: "ALL" | number;
  setReviewStarFilter: (val: "ALL" | number) => void;
  reviewReplyFilter: "ALL" | "UNREPLIED" | "REPLIED";
  setReviewReplyFilter: (val: "ALL" | "UNREPLIED" | "REPLIED") => void;
  reviewSearchQuery: string;
  setReviewSearchQuery: (val: string) => void;
  reviewSortOrder: "NEWEST" | "OLDEST" | "RATING_DESC" | "RATING_ASC";
  setReviewSortOrder: (
    val: "NEWEST" | "OLDEST" | "RATING_DESC" | "RATING_ASC"
  ) => void;
  isSortDropdownOpen: boolean;
  setIsSortDropdownOpen: (open: boolean) => void;
  sortDropdownRef: React.RefObject<HTMLDivElement | null>;
  reviewsLoading: boolean;
  filteredReviews: Review[];
  reviews: Review[];
  deletingReviewId: string | null;
  replyingReviewId: string | null;
  setReplyingReviewId: (id: string | null) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  handleDeleteReview: (id: string) => void;
  handleReplyReview: (id: string) => void;
}

export function AdminReviewsTab({
  computedAvgRating,
  totalReviewsCount,
  positivePercentage,
  unrepliedCount,
  repliedCount,
  starCounts,
  reviewStarFilter,
  setReviewStarFilter,
  reviewReplyFilter,
  setReviewReplyFilter,
  reviewSearchQuery,
  setReviewSearchQuery,
  reviewSortOrder,
  setReviewSortOrder,
  isSortDropdownOpen,
  setIsSortDropdownOpen,
  sortDropdownRef,
  reviewsLoading,
  filteredReviews,
  reviews,
  deletingReviewId,
  replyingReviewId,
  setReplyingReviewId,
  replyText,
  setReplyText,
  handleDeleteReview,
  handleReplyReview,
}: AdminReviewsTabProps) {
  return (
    <div className="space-y-4">
      {/* UNIFIED MINIMALIST METRICS BAR */}
      <div className="p-4 rounded-2xl bg-app-surface border border-app-border grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-app-border shadow-sm">
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase text-app-muted block tracking-wider">
            Средний рейтинг
          </span>
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-2xl font-bold text-app-primary">
              {computedAvgRating}
            </span>
            <span className="text-amber-400 text-sm">★</span>
            <span className="text-[11px] text-app-muted">
              ({totalReviewsCount})
            </span>
          </div>
        </div>
        <div className="space-y-1 pt-2 sm:pt-0 sm:pl-4">
          <span className="text-[10px] font-mono uppercase text-app-muted block tracking-wider">
            Всего отзывов
          </span>
          <span className="text-2xl font-bold font-mono text-app-primary">
            {totalReviewsCount}
          </span>
        </div>
        <div className="space-y-1 pt-2 sm:pt-0 sm:pl-4">
          <span className="text-[10px] font-mono uppercase text-app-muted block tracking-wider">
            Довольные клиенты
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {positivePercentage}%
          </span>
        </div>
        <button
          type="button"
          onClick={() =>
            setReviewReplyFilter(
              reviewReplyFilter === "UNREPLIED" ? "ALL" : "UNREPLIED"
            )
          }
          className="space-y-1 pt-2 sm:pt-0 sm:pl-4 text-left group cursor-pointer"
        >
          <span className="text-[10px] font-mono uppercase text-app-muted block tracking-wider group-hover:text-app-primary">
            Требуют ответа
          </span>
          <div className="flex items-center gap-2 font-mono">
            <span
              className={`text-2xl font-bold ${
                unrepliedCount > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {unrepliedCount}
            </span>
            {unrepliedCount > 0 && (
              <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full font-sans">
                Без ответа
              </span>
            )}
          </div>
        </button>
      </div>

      {/* RATING DISTRIBUTION QUICK ROW */}
      {totalReviewsCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-app-surface border border-app-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase text-app-primary">
              Распределение оценок
            </span>
            {reviewStarFilter !== "ALL" && (
              <button
                onClick={() => setReviewStarFilter("ALL")}
                className="text-[10px] font-mono text-emerald-400 hover:underline cursor-pointer"
              >
                Сбросить фильтр
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = starCounts[star as keyof typeof starCounts];
              const pct =
                totalReviewsCount > 0
                  ? Math.round((count / totalReviewsCount) * 100)
                  : 0;
              const isSelected = reviewStarFilter === star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewStarFilter(isSelected ? "ALL" : star)}
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-app-accent text-app-accent-fg border-app-accent font-bold"
                      : "bg-app-card border-app-border text-app-muted hover:text-app-primary"
                  }`}
                >
                  <span className="flex items-center gap-1 font-semibold">
                    {star}{" "}
                    <Star size={11} className="fill-current text-amber-400" />
                  </span>
                  <span className="text-[11px] opacity-80">
                    {count} ({pct}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SEARCH & FILTER TOOLBAR */}
      <div className="p-3.5 rounded-2xl bg-app-surface border border-app-border space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted"
            />
            <input
              type="search"
              value={reviewSearchQuery}
              onChange={(e) => setReviewSearchQuery(e.target.value)}
              placeholder="Поиск по имени или тексту..."
              className="w-full bg-app-card border border-app-border rounded-xl pl-8 pr-12 py-1.5 text-xs text-app-primary focus:outline-none search-input"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-app-muted border border-app-border bg-app-surface px-1 py-0.5 rounded pointer-events-none hidden sm:inline">
              ⌘K
            </kbd>
            {reviewSearchQuery && (
              <button
                onClick={() => setReviewSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-primary cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Custom Sort Dropdown */}
          <div className="relative shrink-0" ref={sortDropdownRef}>
            <button
              type="button"
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="bg-app-card border border-app-border text-app-primary text-xs font-mono rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer flex items-center gap-2 hover:border-app-accent/50 transition-colors shadow-sm"
            >
              <SlidersHorizontal size={13} className="text-app-muted" />
              <span>
                {
                  {
                    NEWEST: "Сначала новые",
                    OLDEST: "Сначала старые",
                    RATING_DESC: "Высокий рейтинг",
                    RATING_ASC: "Низкий рейтинг",
                  }[reviewSortOrder]
                }
              </span>
              <ChevronDown
                size={13}
                className={`text-app-muted transition-transform duration-200 ${
                  isSortDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence>
              {isSortDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1.5 z-30 w-44 bg-app-surface border border-app-border rounded-xl shadow-xl p-1 font-mono text-xs space-y-0.5"
                >
                  {[
                    { id: "NEWEST", label: "Сначала новые" },
                    { id: "OLDEST", label: "Сначала старые" },
                    { id: "RATING_DESC", label: "Высокий рейтинг" },
                    { id: "RATING_ASC", label: "Низкий рейтинг" },
                  ].map((opt) => {
                    const isSelected = reviewSortOrder === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setReviewSortOrder(opt.id as any);
                          setIsSortDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-app-accent text-app-accent-fg font-semibold"
                            : "text-app-primary hover:bg-app-card"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check size={13} />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app-border pt-2.5">
          <div className="flex items-center gap-1 bg-app-card border border-app-border p-1 rounded-xl font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setReviewReplyFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                reviewReplyFilter === "ALL"
                  ? "bg-app-accent text-app-accent-fg font-bold"
                  : "text-app-muted hover:text-app-primary"
              }`}
            >
              Все ({totalReviewsCount})
            </button>
            <button
              type="button"
              onClick={() => setReviewReplyFilter("UNREPLIED")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                reviewReplyFilter === "UNREPLIED"
                  ? "bg-app-accent text-app-accent-fg font-bold"
                  : "text-app-muted hover:text-app-primary"
              }`}
            >
              <span>Без ответа</span>
              {unrepliedCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px]">
                  {unrepliedCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setReviewReplyFilter("REPLIED")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                reviewReplyFilter === "REPLIED"
                  ? "bg-app-accent text-app-accent-fg font-bold"
                  : "text-app-muted hover:text-app-primary"
              }`}
            >
              С ответом ({repliedCount})
            </button>
          </div>

          {/* Stars filter quick pills */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none font-mono text-[11px]">
            {(["ALL", 5, 4, 3, 2, 1] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setReviewStarFilter(s)}
                className={`px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                  reviewStarFilter === s
                    ? "bg-app-accent text-app-accent-fg border-app-accent font-bold"
                    : "border-app-border text-app-muted hover:text-app-primary"
                }`}
              >
                {s === "ALL" ? "Все ★" : `${s} ★`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* REVIEW LIST */}
      {reviewsLoading ? (
        <div className="py-16 text-center bg-app-surface border border-app-border rounded-2xl p-6">
          <SpinnerLoader size={24} className="mx-auto text-app-accent" />
          <p className="text-xs text-app-muted font-mono mt-2">
            Загрузка отзывов...
          </p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="py-12 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6 space-y-2">
          <MessageSquare className="mx-auto text-app-muted" size={24} />
          <p className="text-xs text-app-muted font-mono">
            {reviews.length === 0
              ? "Отзывов пока нет."
              : "Отзывы по заданным фильтрам не найдены."}
          </p>
          {(reviewSearchQuery ||
            reviewStarFilter !== "ALL" ||
            reviewReplyFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setReviewSearchQuery("");
                setReviewStarFilter("ALL");
                setReviewReplyFilter("ALL");
              }}
              className="text-xs text-emerald-400 hover:underline font-mono mt-2 cursor-pointer"
            >
              Сбросить все фильтры
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((rev) => {
            const isReplying = replyingReviewId === rev.id;
            const isDeleting = deletingReviewId === rev.id;
            return (
              <div
                key={rev.id}
                className="p-4 rounded-2xl bg-app-surface border border-app-border space-y-2.5 transition-all relative"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-app-card border border-app-border flex items-center justify-center font-bold font-mono text-xs text-app-primary uppercase shrink-0">
                      {rev.customerName ? rev.customerName[0] : "К"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-app-primary">
                          {rev.customerName || "Клиент"}
                        </span>
                        <span className="text-xs font-bold font-mono text-amber-400 flex items-center gap-0.5">
                          <Star size={11} className="fill-amber-400 text-amber-400" />
                          {rev.rating}.0
                        </span>
                      </div>
                      <span className="text-[10px] text-app-muted font-mono block">
                        {new Date(rev.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteReview(rev.id)}
                    disabled={isDeleting}
                    className="p-1.5 rounded-xl text-app-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Удалить отзыв"
                  >
                    {isDeleting ? <SpinnerLoader size={14} /> : <Trash2 size={14} />}
                  </button>
                </div>

                {rev.comment ? (
                  <p className="text-xs text-app-primary leading-relaxed font-sans pt-0.5">
                    {rev.comment}
                  </p>
                ) : (
                  <p className="text-[11px] text-app-muted italic font-sans">
                    (Без текста отзыва)
                  </p>
                )}

                {rev.reply && !isReplying ? (
                  <div className="mt-2 pt-1.5 pl-3 border-l-2 border-emerald-500/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                        Ответ заведения
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingReviewId(rev.id);
                          setReplyText(rev.reply || "");
                        }}
                        className="text-[10px] font-mono text-app-muted hover:text-app-primary cursor-pointer underline"
                      >
                        Изменить
                      </button>
                    </div>
                    <p className="text-xs text-app-secondary leading-relaxed font-sans">
                      {rev.reply}
                    </p>
                  </div>
                ) : isReplying ? (
                  <div className="p-3.5 bg-app-card rounded-xl border border-app-border space-y-2.5 mt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono font-bold text-app-primary">
                        Ответ клиенту
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingReviewId(null);
                          setReplyText("");
                        }}
                        className="text-app-muted hover:text-app-primary text-xs cursor-pointer"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Напишите ответ..."
                      className="w-full bg-app-surface border border-app-border rounded-xl p-2.5 text-xs text-app-primary focus:outline-none resize-none font-sans"
                    />
                    <div className="flex flex-wrap gap-1">
                      {[
                        "Спасибо за отзыв! Ждём вас снова!",
                        "Благодарим за обратную связь!",
                        "Спасибо за оценку! Обязательно учтём ваши пожелания.",
                      ].map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setReplyText(tmpl)}
                          className="px-2 py-0.5 bg-app-surface border border-app-border hover:border-emerald-500/40 rounded-lg text-[10px] text-app-muted hover:text-app-primary transition-colors cursor-pointer text-left truncate max-w-xs font-sans"
                        >
                          {tmpl}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingReviewId(null);
                          setReplyText("");
                        }}
                        className="px-3 py-1 bg-app-surface hover:bg-app-hover border border-app-border text-app-muted font-mono text-xs rounded-xl cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReplyReview(rev.id)}
                        className="px-3 py-1 bg-app-accent text-app-accent-fg font-mono text-xs font-bold rounded-xl hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
                      >
                        <Send size={12} />
                        <span>Сохранить</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingReviewId(rev.id);
                      setReplyText("");
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-mono font-semibold flex items-center gap-1 cursor-pointer py-0.5"
                  >
                    <MessageSquare size={12} />
                    <span>+ Ответить на отзыв</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
