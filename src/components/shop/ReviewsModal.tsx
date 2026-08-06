import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, X, MessageSquare, Send } from "lucide-react";
import { Review, Shop } from "../../types";
import { ReviewSkeletonList, SpinnerLoader } from "../Skeleton";

interface ReviewsModalProps {
  shop: Shop | null;
  isOpen: boolean;
  onClose: () => void;
  reviews: Review[];
  reviewsLoading: boolean;
  reviewsStats: { totalReviews: number; avgRating: number };
  isWriteReviewOpen: boolean;
  setIsWriteReviewOpen: (val: boolean) => void;
  newReview: { name: string; rating: number; comment: string };
  setNewReview: React.Dispatch<React.SetStateAction<{ name: string; rating: number; comment: string }>>;
  hoverRating: number | null;
  setHoverRating: (val: number | null) => void;
  isSubmittingReview: boolean;
  reviewSubmitError: string | null;
  reviewSubmitSuccess: boolean;
  handleSubmitReview: (e: React.FormEvent) => void;
  filterStar: "ALL" | number;
  setFilterStar: (val: "ALL" | number) => void;
}

export const ReviewsModal: React.FC<ReviewsModalProps> = ({
  shop,
  isOpen,
  onClose,
  reviews,
  reviewsLoading,
  reviewsStats,
  isWriteReviewOpen,
  setIsWriteReviewOpen,
  newReview,
  setNewReview,
  hoverRating,
  setHoverRating,
  isSubmittingReview,
  reviewSubmitError,
  reviewSubmitSuccess,
  handleSubmitReview,
  filterStar,
  setFilterStar,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/75 backdrop-blur-md z-50" />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 220 }} className="fixed inset-y-0 right-0 w-full max-w-md bg-app-modal border-l border-app-border z-50 flex flex-col shadow-2xl text-app-primary font-sans">
        
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-app-border bg-app-modal-header shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Star size={18} className="fill-amber-400 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-app-primary flex items-center gap-2">
                Отзывы клиентов
                <span className="px-2 py-0.5 bg-app-card border border-app-border rounded-full text-[11px] font-mono font-semibold text-app-muted">
                  {reviewsStats.totalReviews}
                </span>
              </h2>
              <p className="text-[11px] text-app-muted font-sans truncate max-w-[200px]">
                {shop?.name || "Заведение"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-app-muted hover:text-app-primary hover:bg-app-card transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {/* RATING SUMMARY */}
          <div className="p-4 rounded-2xl bg-app-surface border border-app-border flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-app-primary">
                  {reviewsStats.avgRating ? Number(reviewsStats.avgRating).toFixed(1) : "5.0"}
                </span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const avg = Number(reviewsStats.avgRating) || 5.0;
                    return (
                      <Star
                        key={star}
                        size={13}
                        className={
                          star <= Math.floor(avg)
                            ? "fill-amber-400 text-amber-400"
                            : star - 0.5 <= avg
                            ? "fill-amber-400/50 text-amber-400"
                            : "text-zinc-600 fill-zinc-800"
                        }
                      />
                    );
                  })}
                </div>
              </div>
              <p className="text-[11px] font-mono text-app-muted">
                {reviewsStats.totalReviews} {reviewsStats.totalReviews === 1 ? "отзыв" : reviewsStats.totalReviews < 5 ? "отзыва" : "отзывов"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsWriteReviewOpen(!isWriteReviewOpen)}
              className="px-3 py-1.5 bg-app-accent text-app-accent-fg font-mono text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare size={13} />
              <span>{isWriteReviewOpen ? "Отмена" : "Написать отзыв"}</span>
            </button>
          </div>

          {/* WRITE REVIEW FORM */}
          <AnimatePresence>
            {isWriteReviewOpen && (
              <motion.form
                initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmitReview}
                className="space-y-3 p-4 border border-app-border rounded-2xl bg-app-card relative"
              >
                <div className="flex items-center justify-between pb-1 border-b border-app-border">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-app-primary">
                    Оставить отзыв
                  </h3>
                  <span className="text-[10px] text-app-muted font-mono">Анонимно или с именем</span>
                </div>

                {reviewSubmitError && (
                  <p className="text-xs text-rose-400 font-mono bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                    {reviewSubmitError}
                  </p>
                )}
                {reviewSubmitSuccess && (
                  <p className="text-xs text-emerald-400 font-mono bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                    Спасибо за ваш отзыв! Он опубликован.
                  </p>
                )}

                <div>
                  <input
                    type="text"
                    maxLength={50}
                    value={newReview.name}
                    onChange={(e) => setNewReview((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ваше имя (до 50 символов)..."
                    className="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                  />
                </div>

                <div className="flex items-center justify-between bg-app-surface p-2 rounded-xl border border-app-border">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((r) => {
                      const active = (hoverRating !== null ? hoverRating : newReview.rating) >= r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onMouseEnter={() => setHoverRating(r)}
                          onMouseLeave={() => setHoverRating(null)}
                          onClick={() => setNewReview((p) => ({ ...p, rating: r }))}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            size={18}
                            className={active ? "fill-amber-400 text-amber-400" : "text-zinc-600 fill-zinc-800"}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[11px] font-mono text-amber-400 font-semibold">
                    {(hoverRating !== null ? hoverRating : newReview.rating)} / 5 ★
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={newReview.comment}
                    onChange={(e) => setNewReview((p) => ({ ...p, comment: e.target.value }))}
                    placeholder="Поделитесь впечатлениями о заведении..."
                    className="w-full bg-app-surface border border-app-border rounded-xl p-3 text-xs text-app-primary focus:outline-none focus:border-app-accent resize-none font-sans"
                  />
                  <span className="absolute bottom-2.5 right-2.5 text-[10px] font-mono text-app-muted pointer-events-none">
                    {newReview.comment.length}/500
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview || !newReview.name.trim()}
                  className="w-full py-2 bg-app-accent text-app-accent-fg font-mono text-xs font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmittingReview ? <SpinnerLoader size={14} /> : <Send size={13} />}
                  <span>{isSubmittingReview ? "Отправка..." : "Отправить отзыв"}</span>
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* FILTER PILLS BY STAR */}
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none font-mono text-[11px]">
              {(["ALL", 5, 4, 3, 2, 1] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStar(s)}
                  className={`px-2.5 py-1 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                    filterStar === s
                      ? "bg-app-accent text-app-accent-fg border-app-accent font-semibold"
                      : "bg-app-surface border-app-border text-app-muted hover:text-app-primary"
                  }`}
                >
                  {s === "ALL" ? `Все (${reviews.length})` : `${s} ★`}
                </button>
              ))}
            </div>
          )}

          {/* REVIEWS LIST */}
          <div className="space-y-3">
            {reviewsLoading ? (
              <ReviewSkeletonList count={3} />
            ) : reviews.length === 0 ? (
              <div className="py-12 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6 space-y-2">
                <MessageSquare className="mx-auto text-app-muted" size={24} />
                <p className="text-xs text-app-muted font-mono">
                  Отзывов пока нет. Будьте первым!
                </p>
              </div>
            ) : (
              reviews
                .filter((r) => filterStar === "ALL" || Number(r.rating) === filterStar)
                .map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 border border-app-border rounded-2xl bg-app-surface space-y-2.5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-app-card border border-app-border flex items-center justify-center font-bold font-mono text-[11px] text-app-primary uppercase">
                          {rev.customerName ? rev.customerName[0] : "К"}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-app-primary block">
                            {rev.customerName || "Клиент"}
                          </span>
                          <span className="text-[10px] text-app-muted font-mono block">
                            {new Date(rev.createdAt).toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "short"
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 font-mono text-xs text-amber-400 font-semibold">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        <span>{rev.rating}.0</span>
                      </div>
                    </div>

                    {rev.comment && (
                      <p className="text-xs text-app-primary leading-relaxed font-sans pt-0.5">
                        {rev.comment}
                      </p>
                    )}

                    {rev.reply && (
                      <div className="mt-2 pt-1 pl-3 border-l-2 border-emerald-500/70 space-y-0.5">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                          Ответ заведения
                        </span>
                        <p className="text-xs text-app-secondary leading-relaxed font-sans">{rev.reply}</p>
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
