import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, X, MessageSquare, Send, Edit2, Trash2, Image as ImageIcon, ZoomIn } from "lucide-react";
import { Review, Shop } from "../../types";
import { ReviewSkeletonList, SpinnerLoader } from "../Skeleton";
import ImageUploader from "../ImageUploader";
import { useScrollLock } from "../../hooks/useScrollLock";

interface ReviewsModalProps {
  shop: Shop | null;
  isOpen: boolean;
  onClose: () => void;
  reviews: Review[];
  reviewsLoading: boolean;
  reviewsStats: { totalReviews: number; avgRating: number };
  isWriteReviewOpen: boolean;
  setIsWriteReviewOpen: (val: boolean) => void;
  newReview: { name: string; rating: number; comment: string; imageUrl?: string };
  setNewReview: React.Dispatch<React.SetStateAction<{ name: string; rating: number; comment: string; imageUrl?: string }>>;
  hoverRating: number | null;
  setHoverRating: (val: number | null) => void;
  isSubmittingReview: boolean;
  reviewSubmitError: string | null;
  reviewSubmitSuccess: boolean;
  handleSubmitReview: (e: React.FormEvent) => void;
  filterStar: "ALL" | number;
  setFilterStar: (val: "ALL" | number) => void;
  myReviewIds?: string[];
  editingReviewId?: string | null;
  onStartEditReview?: (rev: Review) => void;
  onCancelEditReview?: () => void;
  onDeleteReview?: (id: string) => void;
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
  myReviewIds = [],
  editingReviewId = null,
  onStartEditReview,
  onCancelEditReview,
  onDeleteReview,
}) => {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Lock background scroll when modal or lightbox is open
  useScrollLock(isOpen || Boolean(lightboxImage));

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="reviews-modal-container" className="fixed inset-0 z-50">
          <motion.div
            key="reviews-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-50"
          />
          <motion.div
            key="reviews-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-app-modal border-l border-app-border z-50 flex flex-col shadow-2xl text-app-primary font-sans"
          >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-app-border bg-app-modal-header shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-app-card border border-app-border text-app-primary rounded-xl">
              <Star size={18} className="text-app-primary" />
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
                            ? "fill-app-primary text-app-primary"
                            : star - 0.5 <= avg
                            ? "fill-app-primary/40 text-app-primary"
                            : "text-app-muted/30 fill-transparent"
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
              onClick={() => {
                if (isWriteReviewOpen && editingReviewId && onCancelEditReview) {
                  onCancelEditReview();
                } else {
                  setIsWriteReviewOpen(!isWriteReviewOpen);
                }
              }}
              className="px-3 py-1.5 bg-app-accent text-app-accent-fg font-mono text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare size={13} />
              <span>{isWriteReviewOpen ? "Отмена" : "Написать отзыв"}</span>
            </button>
          </div>

          {/* WRITE / EDIT REVIEW FORM */}
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
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-app-primary flex items-center gap-1.5">
                    {editingReviewId ? (
                      <>
                        <Edit2 size={13} className="text-app-primary" />
                        <span>Редактировать отзыв</span>
                      </>
                    ) : (
                      <span>Оставить отзыв</span>
                    )}
                  </h3>
                  <span className="text-[10px] text-app-muted font-mono">
                    {editingReviewId ? "Редактирование" : "Анонимно или с именем"}
                  </span>
                </div>

                {reviewSubmitError && (
                  <p className="text-xs text-rose-500 font-mono font-medium bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                    {reviewSubmitError}
                  </p>
                )}
                {reviewSubmitSuccess && (
                  <p className="text-xs text-app-primary font-mono font-medium bg-app-surface p-2.5 rounded-xl border border-app-border">
                    {editingReviewId ? "Отзыв успешно обновлен!" : "Спасибо за ваш отзыв! Он опубликован."}
                  </p>
                )}

                <div>
                  <label className="block text-[10px] font-mono text-app-muted uppercase mb-1">
                    Ваше имя
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={newReview.name}
                    onChange={(e) => setNewReview((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ваше имя (до 50 символов)..."
                    className="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2 text-xs text-app-primary focus:outline-none focus:border-app-border font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-app-muted uppercase mb-1">
                    Ваша оценка
                  </label>
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
                              className={active ? "fill-app-primary text-app-primary" : "text-app-muted/30 fill-transparent"}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-[11px] font-mono text-app-primary font-semibold">
                      {(hoverRating !== null ? hoverRating : newReview.rating)} / 5 ★
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-app-muted uppercase mb-1">
                    Текст отзыва
                  </label>
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
                </div>

                {/* PHOTO ATTACHMENT */}
                <div className="pt-1">
                  <ImageUploader
                    value={newReview.imageUrl || ""}
                    onChange={(url) => setNewReview((p) => ({ ...p, imageUrl: url }))}
                    label="Фото к отзыву (необязательно)"
                    type="photo"
                    placeholder="Загрузите фото или вставьте ссылку..."
                    maxHeightClass="max-h-28"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  {editingReviewId && onCancelEditReview && (
                    <button
                      type="button"
                      onClick={onCancelEditReview}
                      className="flex-1 py-2 bg-app-surface border border-app-border text-app-muted font-mono text-xs font-semibold rounded-xl hover:text-app-primary transition-colors cursor-pointer"
                    >
                      Отмена
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmittingReview || !newReview.name.trim()}
                    className="flex-1 py-2 bg-app-accent text-app-accent-fg font-mono text-xs font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isSubmittingReview ? <SpinnerLoader size={14} /> : <Send size={13} />}
                    <span>
                      {isSubmittingReview
                        ? "Сохранение..."
                        : editingReviewId
                        ? "Сохранить изменения"
                        : "Отправить отзыв"}
                    </span>
                  </button>
                </div>
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
                .map((rev) => {
                  const isMyReview = myReviewIds.includes(rev.id);
                  return (
                    <div
                      key={rev.id}
                      className="p-4 border border-app-border rounded-2xl space-y-2.5 transition-all bg-app-surface shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-app-card border border-app-border flex items-center justify-center font-bold font-mono text-[11px] text-app-primary uppercase">
                            {rev.customerName ? rev.customerName[0] : "К"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-app-primary">
                                {rev.customerName || "Клиент"}
                              </span>
                              {isMyReview && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-app-card text-app-primary border border-app-border font-medium">
                                  Мой отзыв
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-app-muted font-mono">
                                {new Date(rev.createdAt).toLocaleDateString("ru-RU", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                })}
                              </span>
                              {rev.isEdited && (
                                <span className="text-[9px] font-mono italic text-app-muted bg-app-card px-1 py-0.2 rounded border border-app-border">
                                  изменен
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 font-mono text-xs text-app-primary font-semibold">
                          <Star size={12} className="fill-app-primary text-app-primary" />
                          <span>{rev.rating}.0</span>
                        </div>
                      </div>

                      {rev.comment && (
                        <p className="text-xs text-app-primary leading-relaxed font-sans pt-0.5">
                          {rev.comment}
                        </p>
                      )}

                      {/* PHOTO DISPLAY */}
                      {rev.imageUrl && (
                        <div className="pt-1">
                          <div
                            onClick={() => setLightboxImage(rev.imageUrl || null)}
                            className="relative group w-24 h-24 rounded-xl overflow-hidden border border-app-border cursor-pointer bg-app-card hover:border-app-accent transition-all"
                          >
                            <img
                              src={rev.imageUrl}
                              alt="Фото к отзыву"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <ZoomIn size={16} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* REPLY */}
                      {rev.reply && (
                        <div className="mt-2 pt-1 pl-3 border-l-2 border-app-border space-y-0.5">
                          <span className="text-[10px] font-mono font-bold text-app-primary uppercase tracking-wider block">
                            Ответ заведения
                          </span>
                          <p className="text-xs text-app-secondary leading-relaxed font-sans">{rev.reply}</p>
                        </div>
                      )}

                      {/* ACTIONS FOR AUTHOR (EDIT / DELETE) */}
                      {isMyReview && (
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-app-border font-mono text-[11px]">
                          {onStartEditReview && (
                            <button
                              type="button"
                              onClick={() => onStartEditReview(rev)}
                              className="px-2.5 py-1 rounded-lg bg-app-card border border-app-border text-app-primary hover:bg-app-hover hover:border-app-border transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 size={11} />
                              <span>Редактировать</span>
                            </button>
                          )}
                          {onDeleteReview && (
                            <button
                              type="button"
                              onClick={() => onDeleteReview(rev.id)}
                              className="px-2.5 py-1 rounded-lg bg-app-card border border-app-border text-app-muted hover:text-app-primary hover:bg-app-hover transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 size={11} />
                              <span>Удалить</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </motion.div>
    </div>
    )}

      {/* LIGHTBOX MODAL */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            <img
              src={lightboxImage}
              alt="Полноэкранное фото"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};
