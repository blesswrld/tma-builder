import React, { FormEvent, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, X, Plus, Sparkles, Image as ImageIcon, Eye, Tag, Check, Copy } from "lucide-react";
import { Banner } from "../../types";
import ImageUploader from "../ImageUploader";

interface AdminBannersTabProps {
  banners: Banner[];
  handleDeleteBanner: (id: string) => void;
  isCreatingBanner: boolean;
  setIsCreatingBanner: (creating: boolean) => void;
  bannerError: string | null;
  newBannerData: {
    title: string;
    subtitle: string;
    badge: string;
    imageUrl?: string;
    bgGradient?: string;
  };
  setNewBannerData: React.Dispatch<
    React.SetStateAction<{
      title: string;
      subtitle: string;
      badge: string;
      imageUrl?: string;
      bgGradient?: string;
    }>
  >;
  handleCreateBanner: (e: FormEvent) => void;
}

export function AdminBannersTab({
  banners,
  handleDeleteBanner,
  isCreatingBanner,
  setIsCreatingBanner,
  bannerError,
  newBannerData,
  setNewBannerData,
  handleCreateBanner,
}: AdminBannersTabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const BANNER_TEMPLATES = [
    {
      title: "Скидка 15% на первый заказ",
      subtitle: "Используйте промокод FIRST15 при оформлении в корзине",
      badge: "СКИДКА",
      imageUrl: "https://images.unsplash.com/photo-1557200134-90327ee9fafa?auto=format&fit=crop&q=80&w=600",
    },
    {
      title: "Счастливые часы с 12:00 до 16:00",
      subtitle: "Скидка 10% на всё меню по будням в обеденное время",
      badge: "АКЦИЯ",
      imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=600",
    },
    {
      title: "Бесплатная доставка от 1 500 ₽",
      subtitle: "Быстро доставим курьером прямо к вашей двери",
      badge: "ДОСТАВКА",
      imageUrl: "https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&q=80&w=600",
    },
    {
      title: "Фирменный десерт в подарок",
      subtitle: "При заказе на сумму от 2 000 ₽ добавляем комплимент от шефа",
      badge: "ПОДАРОК",
      imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=600",
    },
  ];

  const BADGE_PRESETS = ["АКЦИЯ", "НОВИНКА", "ХИТ", "СКИДКА -15%", "ПОДАРОК", "ДОСТАВКА"];

  const BANNER_IMAGE_PRESETS = [
    { label: "🔥 Акция", url: "https://images.unsplash.com/photo-1557200134-90327ee9fafa?auto=format&fit=crop&q=80&w=600" },
    { label: "☕ Кофе", url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=600" },
    { label: "🎁 Подарок", url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=600" },
    { label: "🚚 Доставка", url: "https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&q=80&w=600" },
    { label: "🍸 Интерьер", url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=600" },
    { label: "🌌 Градиент", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600" },
  ];

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const applyTemplate = (tpl: typeof BANNER_TEMPLATES[0]) => {
    setNewBannerData((prev) => ({
      ...prev,
      title: tpl.title,
      subtitle: tpl.subtitle,
      badge: tpl.badge,
      imageUrl: tpl.imageUrl,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-app-surface border border-app-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-app-primary font-mono tracking-tight uppercase">
              Рекламные промо-баннеры
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-app-card border border-app-border text-[10px] font-mono font-semibold text-app-secondary">
              Всего: {banners.length}
            </span>
          </div>
          <p className="text-xs text-app-muted font-sans leading-relaxed">
            Баннеры отображаются в верхней части витрины и привлекают внимание к скидкам и акциям
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreatingBanner(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-app-accent text-app-accent-fg font-mono font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Plus size={14} />
          <span>Добавить баннер</span>
        </button>
      </div>

      {/* Banners Grid */}
      {banners.length === 0 ? (
        <div className="py-16 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-app-card border border-app-border flex items-center justify-center mx-auto text-app-muted">
            <Sparkles size={20} />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <p className="text-xs font-semibold text-app-primary font-mono">
              Баннеры пока не настроены
            </p>
            <p className="text-[11px] text-app-muted font-sans leading-relaxed">
              Создайте яркие промо-баннеры, чтобы сообщить клиентам об акциях, новинках и скидках.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreatingBanner(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-app-card border border-app-border text-app-primary text-xs font-mono font-bold hover:bg-app-hover transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>Создать первый баннер</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner, idx) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              whileHover={{ y: -2 }}
              className="rounded-2xl bg-app-surface border border-app-border p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
            >
              {/* Optional background image overlay */}
              {banner.imageUrl && (
                <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
                  <img
                    src={banner.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-app-surface/90 via-app-surface/60 to-transparent" />
                </div>
              )}

              <div className="space-y-3 relative z-10">
                {/* Header with Badge and Action Buttons */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {banner.badge ? (
                      <span className="px-2.5 py-0.5 bg-app-card border border-app-border text-app-primary font-mono text-[10px] font-bold rounded-md uppercase tracking-wider">
                        {banner.badge}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-app-card border border-app-border text-app-muted font-mono text-[9px] rounded-md uppercase">
                        Баннер #{idx + 1}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-app-card border border-app-border text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold rounded-md">
                      Активен
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopyText(`${banner.title}\n${banner.subtitle || ""}`, banner.id)}
                      className="p-1.5 text-app-secondary hover:text-indigo-500 dark:hover:text-indigo-300 hover:bg-indigo-500/15 border border-transparent hover:border-indigo-500/30 rounded-lg transition-all cursor-pointer active:scale-95"
                      title="Скопировать текст"
                    >
                      {copiedId === banner.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-1.5 text-app-secondary hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 rounded-lg transition-all cursor-pointer active:scale-95"
                      title="Удалить баннер"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Banner Content */}
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-app-primary font-sans leading-snug tracking-tight">
                    {banner.title}
                  </h3>
                  {banner.subtitle && (
                    <p className="text-xs text-app-secondary font-sans leading-relaxed">
                      {banner.subtitle}
                    </p>
                  )}
                </div>

                {/* Optional Image thumbnail */}
                {banner.imageUrl && (
                  <div className="h-20 w-full rounded-xl overflow-hidden bg-app-card border border-app-border">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Footer info */}
              <div className="pt-3 border-t border-app-border flex items-center justify-between text-[10px] font-mono text-app-muted relative z-10">
                <span className="flex items-center gap-1">
                  <Eye size={11} /> Отображается на главной
                </span>
                <span>
                  {banner.createdAt ? new Date(banner.createdAt).toLocaleDateString("ru-RU") : "Активен"}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Banner Modal */}
      <AnimatePresence>
        {isCreatingBanner && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="max-w-3xl w-full bg-app-surface border border-app-border rounded-3xl p-5 sm:p-6 text-app-primary flex flex-col max-h-[92vh] shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-app-border pb-3 shrink-0">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold font-mono text-app-primary uppercase tracking-tight">
                    Создание промо-баннера
                  </h3>
                  <p className="text-[11px] text-app-muted font-sans">
                    Настройте баннер и загрузите изображение (до 15 МБ) для витрины
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingBanner(false)}
                  className="p-1.5 text-app-muted hover:text-app-primary hover:bg-app-hover border border-transparent hover:border-app-border rounded-xl transition-all cursor-pointer active:scale-95"
                  title="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>

              {bannerError && (
                <div className="my-2 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-mono shrink-0">
                  {bannerError}
                </div>
              )}

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-4 pr-1">
                {/* Ready-to-use Templates */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-app-muted font-mono uppercase tracking-wider">
                    Быстрые шаблоны промо-акций:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {BANNER_TEMPLATES.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="p-2 text-left bg-app-card hover:bg-app-hover border border-app-border rounded-xl transition-colors cursor-pointer space-y-1"
                      >
                        <span className="inline-block px-1.5 py-0.5 bg-app-surface border border-app-border text-[9px] font-mono font-bold text-app-primary rounded">
                          {tpl.badge}
                        </span>
                        <p className="text-[11px] font-semibold text-app-primary font-sans line-clamp-1">
                          {tpl.title}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form & Live Preview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Form Column */}
                  <div className="md:col-span-7 space-y-3 font-sans">
                    <div className="space-y-1">
                      <label className="block text-[11px] text-app-muted font-mono uppercase tracking-wider">
                        Заголовок акции *
                      </label>
                      <input
                        type="text"
                        value={newBannerData.title}
                        onChange={(e) =>
                          setNewBannerData((p) => ({ ...p, title: e.target.value }))
                        }
                        placeholder="Например: Скидка 15% на первый заказ"
                        className="w-full bg-app-card border border-app-border rounded-xl px-3 py-1.5 text-xs text-app-primary focus:outline-none focus:border-app-primary transition-colors"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-app-muted font-mono uppercase tracking-wider">
                        Подзаголовок / Описание
                      </label>
                      <input
                        type="text"
                        value={newBannerData.subtitle}
                        onChange={(e) =>
                          setNewBannerData((p) => ({ ...p, subtitle: e.target.value }))
                        }
                        placeholder="Например: Используйте промокод FIRST15 в корзине"
                        className="w-full bg-app-card border border-app-border rounded-xl px-3 py-1.5 text-xs text-app-primary focus:outline-none focus:border-app-primary transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-[11px] text-app-muted font-mono uppercase tracking-wider">
                          Текст бейджа
                        </label>
                        <span className="text-[10px] text-app-muted font-mono">До 15 символов</span>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newBannerData.badge}
                          onChange={(e) =>
                            setNewBannerData((p) => ({ ...p, badge: e.target.value.toUpperCase() }))
                          }
                          placeholder="АКЦИЯ, СКИДКА, ХИТ..."
                          className="flex-1 bg-app-card border border-app-border rounded-xl px-3 py-1.5 text-xs text-app-primary focus:outline-none focus:border-app-primary font-mono uppercase"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {BADGE_PRESETS.map((bg) => (
                          <button
                            key={bg}
                            type="button"
                            onClick={() => setNewBannerData((p) => ({ ...p, badge: bg }))}
                            className={`px-2 py-0.5 rounded-lg border text-[9px] font-mono transition-colors cursor-pointer ${
                              newBannerData.badge === bg
                                ? "bg-app-accent text-app-accent-fg border-transparent font-bold"
                                : "bg-app-card border-app-border text-app-secondary hover:text-app-primary"
                            }`}
                          >
                            {bg}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Image Uploader with File, Presets and URL */}
                    <div className="pt-1">
                      <ImageUploader
                        value={newBannerData.imageUrl || ""}
                        onChange={(url) =>
                          setNewBannerData((p) => ({ ...p, imageUrl: url }))
                        }
                        label="Изображение баннера (файл до 15 МБ / ссылка)"
                        type="banner"
                        presets={BANNER_IMAGE_PRESETS}
                        placeholder="https://... или выберите файл"
                        maxHeightClass="max-h-24"
                      />
                    </div>
                  </div>

                  {/* Live Preview Column */}
                  <div className="md:col-span-5 space-y-2 flex flex-col">
                    <label className="block text-[11px] text-app-muted font-mono uppercase tracking-wider">
                      Предпросмотр на витрине:
                    </label>

                    <div className="p-4 rounded-2xl bg-app-card border border-app-border flex flex-col justify-between space-y-3 relative overflow-hidden min-h-[190px]">
                      {newBannerData.imageUrl && (
                        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
                          <img
                            src={newBannerData.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}

                      <div className="space-y-2 relative z-10">
                        {newBannerData.badge ? (
                          <span className="inline-block px-2.5 py-0.5 bg-app-surface border border-app-border text-app-primary font-mono text-[10px] font-bold rounded-full uppercase tracking-wider">
                            {newBannerData.badge}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 bg-app-surface border border-app-border text-app-muted font-mono text-[9px] rounded-full uppercase">
                            АКЦИЯ
                          </span>
                        )}

                        <h4 className="text-sm font-bold text-app-primary font-sans leading-snug">
                          {newBannerData.title || "Заголовок промо-баннера"}
                        </h4>

                        <p className="text-xs text-app-secondary font-sans leading-relaxed">
                          {newBannerData.subtitle || "Подзаголовок или описание специального предложения..."}
                        </p>
                      </div>

                      {newBannerData.imageUrl && (
                        <div className="h-16 w-full rounded-xl overflow-hidden bg-app-surface border border-app-border relative z-10">
                          <img
                            src={newBannerData.imageUrl}
                            alt="preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}

                      <div className="text-[9px] font-mono text-app-muted text-right relative z-10">
                        Витрина Telegram Mini App
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-app-border shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreatingBanner(false)}
                  className="py-2 px-4 bg-app-card hover:bg-app-hover border border-app-border text-app-secondary font-mono font-bold text-xs rounded-xl transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleCreateBanner}
                  className="py-2 px-6 bg-app-accent text-app-accent-fg hover:opacity-90 font-mono font-bold text-xs rounded-xl transition-opacity uppercase tracking-wider cursor-pointer shadow-xs"
                >
                  Сохранить баннер
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
