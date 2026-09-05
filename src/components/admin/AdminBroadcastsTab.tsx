import React, { FormEvent, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, X, Plus, Send, Users, Sparkles, MessageSquare, Search, Check, Copy, Target } from "lucide-react";
import { Shop, Broadcast } from "../../types";
import ImageUploader from "../ImageUploader";
import { CustomDropdown } from "../CustomDropdown";

interface AdminBroadcastsTabProps {
  selectedShop: Shop;
  broadcasts: Broadcast[];
  handleDeleteBroadcast: (id: string) => void;
  isCreatingBroadcast: boolean;
  setIsCreatingBroadcast: (creating: boolean) => void;
  broadcastError: string | null;
  newBroadcastData: {
    title: string;
    message: string;
    imageUrl?: string;
    buttonText?: string;
    targetFilter: string;
  };
  setNewBroadcastData: React.Dispatch<
    React.SetStateAction<{
      title: string;
      message: string;
      imageUrl?: string;
      buttonText?: string;
      targetFilter: string;
    }>
  >;
  handleCreateBroadcast: (e: FormEvent) => void;
}

export function AdminBroadcastsTab({
  selectedShop,
  broadcasts,
  handleDeleteBroadcast,
  isCreatingBroadcast,
  setIsCreatingBroadcast,
  broadcastError,
  newBroadcastData,
  setNewBroadcastData,
  handleCreateBroadcast,
}: AdminBroadcastsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const targetLabels: Record<string, { label: string; desc: string }> = {
    ALL: { label: "Все клиенты", desc: "Вся база" },
    ACTIVE: { label: "Активные", desc: ">1 заказа" },
    INACTIVE: { label: "Спящие", desc: "0 заказов" },
    NEW: { label: "Новые", desc: "<7 дней" },
    VIP: { label: "VIP клиенты", desc: ">3000 ₽" },
    BONUS_HOLDERS: { label: "С бонусами", desc: "Баланс >0" },
  };

  const BROADCAST_TEMPLATES = [
    {
      title: "🔥 Скидка 15% на повторный заказ",
      message: "Привет, {name}! Мы соскучились и приготовили для вас скидку 15% на весь ассортимент {shop_name}. Оформите заказ прямо сейчас!",
      buttonText: "🛒 Заказать со скидкой",
      targetFilter: "ALL",
      imageUrl: "https://images.unsplash.com/photo-1557200134-90327ee9fafa?auto=format&fit=crop&q=80&w=600",
    },
    {
      title: "⭐ Нам важно ваше мнение!",
      message: "Здравствуйте, {name}! Пожалуйста, оцените качество обслуживания в {shop_name} и оставьте отзыв. Ваше мнение помогает нам становиться лучше!",
      buttonText: "⭐ Оставить отзыв",
      targetFilter: "ACTIVE",
      imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=600",
    },
    {
      title: "🎁 Вам начислены бонусные баллы",
      message: "Отличные новости, {name}! Мы начислили вам 300 приветственных бонусов в {shop_name}. Спишите их при оформлении следующего заказа!",
      buttonText: "🎁 Использовать бонусы",
      targetFilter: "BONUS_HOLDERS",
      imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=600",
    },
    {
      title: "🆕 Обновление меню и сезонные новинки",
      message: "Привет, {name}! В {shop_name} появились новые фирменные позиции. Загляните в наше интерактивное меню и попробуйте первыми!",
      buttonText: "📱 Открыть Меню",
      targetFilter: "ALL",
      imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=600",
    },
  ];

  const BUTTON_PRESETS = [
    "📱 Открыть Меню",
    "🛒 Заказать онлайн",
    "⭐ Оставить отзыв",
    "🎁 Забрать бонусы",
    "💬 Связаться с нами",
  ];

  const BROADCAST_IMAGE_PRESETS = [
    { label: "🎁 Подарок", url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=600" },
    { label: "🔥 Акция", url: "https://images.unsplash.com/photo-1557200134-90327ee9fafa?auto=format&fit=crop&q=80&w=600" },
    { label: "☕ Меню", url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=600" },
    { label: "🍔 Бургер", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=600" },
  ];

  const insertVariable = (variable: string) => {
    setNewBroadcastData((prev) => ({
      ...prev,
      message: prev.message + variable,
    }));
  };

  const applyTemplate = (tpl: typeof BROADCAST_TEMPLATES[0]) => {
    setNewBroadcastData({
      title: tpl.title,
      message: tpl.message,
      buttonText: tpl.buttonText,
      targetFilter: tpl.targetFilter,
      imageUrl: tpl.imageUrl,
    });
  };

  const filteredBroadcasts = useMemo(() => {
    if (!searchQuery.trim()) return broadcasts;
    const q = searchQuery.toLowerCase();
    return broadcasts.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.message?.toLowerCase().includes(q) ||
        b.targetFilter?.toLowerCase().includes(q)
    );
  }, [broadcasts, searchQuery]);

  const totalRecipients = useMemo(() => {
    return broadcasts.reduce((acc, b) => acc + (b.sentCount || b.recipientsCount || 1), 0);
  }, [broadcasts]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Preview replacement
  const previewMessage = useMemo(() => {
    if (!newBroadcastData.message) return "Текст рассылки появится здесь...";
    return newBroadcastData.message
      .replace(/\{name\}/g, "Алексей")
      .replace(/\{shop_name\}/g, selectedShop.name || "заведении")
      .replace(/\{bonus\}/g, "300");
  }, [newBroadcastData.message, selectedShop.name]);

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-app-surface border border-app-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-app-primary font-mono tracking-tight uppercase">
              Рассылки в Telegram
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-app-card border border-app-border text-[10px] font-mono font-semibold text-app-secondary">
              Кампаний: {broadcasts.length}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-app-card border border-app-border text-[10px] font-mono text-app-muted">
              Доставлено: {totalRecipients}
            </span>
          </div>
          <p className="text-xs text-app-muted font-sans leading-relaxed">
            Отправляйте мгновенные уведомления, акции и промокоды клиентам заведения
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreatingBroadcast(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-app-accent text-app-accent-fg font-mono font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Send size={14} />
          <span>Создать рассылку</span>
        </button>
      </div>

      {/* Search and Filters for Broadcast History */}
      {broadcasts.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-app-surface border border-app-border rounded-xl">
          <Search size={14} className="text-app-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по отправленным рассылкам..."
            className="flex-1 bg-transparent text-xs text-app-primary placeholder:text-app-muted focus:outline-none font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-app-muted hover:text-app-primary p-0.5 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Broadcasts List */}
      {broadcasts.length === 0 ? (
        <div className="py-16 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-app-card border border-app-border flex items-center justify-center mx-auto text-app-muted">
            <MessageSquare size={20} />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <p className="text-xs font-semibold text-app-primary font-mono">
              Рассылок пока не отправлялось
            </p>
            <p className="text-[11px] text-app-muted font-sans leading-relaxed">
              Запустите первую маркетинговую кампанию, чтобы вернуть клиентов и увеличить повторные продажи.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreatingBroadcast(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-app-card border border-app-border text-app-primary text-xs font-mono font-bold hover:bg-app-hover transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>Создать рассылку</span>
          </button>
        </div>
      ) : filteredBroadcasts.length === 0 ? (
        <div className="py-12 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
          <p className="text-xs text-app-muted font-mono">
            По запросу «{searchQuery}» ничего не найдено
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBroadcasts.map((bc, idx) => (
            <motion.div
              key={bc.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              whileHover={{ y: -2 }}
              className="p-5 rounded-2xl bg-app-surface border border-app-border flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
            >
              <div className="space-y-3">
                {/* Header with status badges */}
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-app-card border border-app-border text-app-primary text-[9px] font-mono rounded-md font-semibold">
                        ОТПРАВЛЕНО
                      </span>
                      <span className="px-2 py-0.5 bg-app-card border border-app-border text-app-secondary text-[9px] font-mono rounded-md">
                        {targetLabels[bc.targetFilter || ""]?.label || bc.targetFilter || "Все клиенты"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-app-primary font-mono pt-1">
                      {bc.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(`${bc.title}\n${bc.message}`, bc.id)}
                      className="p-1.5 text-app-secondary hover:text-indigo-500 dark:hover:text-indigo-300 hover:bg-indigo-500/15 border border-transparent hover:border-indigo-500/30 rounded-lg transition-all cursor-pointer active:scale-95"
                      title="Скопировать текст"
                    >
                      {copiedId === bc.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBroadcast(bc.id)}
                      className="p-1.5 text-app-secondary hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 rounded-lg transition-all cursor-pointer active:scale-95"
                      title="Удалить из истории"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Optional Image */}
                {bc.imageUrl && (
                  <div className="rounded-xl overflow-hidden h-28 bg-app-card border border-app-border">
                    <img
                      src={bc.imageUrl}
                      alt={bc.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}

                {/* Message Body */}
                <p className="text-xs text-app-secondary leading-relaxed font-sans line-clamp-3">
                  {bc.message}
                </p>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-app-border flex items-center justify-between text-[10px] font-mono text-app-muted">
                <div className="flex items-center gap-1.5">
                  <Users size={12} />
                  <span>
                    Получателей: <strong className="text-app-primary">{bc.sentCount || bc.recipientsCount || 1}</strong>
                  </span>
                </div>
                {bc.buttonText && (
                  <div className="px-2 py-0.5 bg-app-card border border-app-border text-app-secondary rounded-md text-[9px]">
                    {bc.buttonText}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Broadcast Modal - Compact, No Vertical Scroll */}
      <AnimatePresence>
        {isCreatingBroadcast && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="max-w-5xl w-full bg-app-surface border border-app-border rounded-3xl p-4 sm:p-5 text-app-primary flex flex-col max-h-[94vh] shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-app-border pb-2.5 shrink-0">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold font-mono text-app-primary uppercase tracking-tight">
                      Конструктор Telegram рассылки
                    </h3>
                    <span className="px-2 py-0.5 bg-app-card border border-app-border text-app-accent font-mono text-[10px] rounded-md font-semibold">
                      до 15 МБ фото
                    </span>
                  </div>
                  <p className="text-[11px] text-app-muted font-sans">
                    Настройте таргетинг, загрузите фото и задайте текст с интерактивной кнопкой
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingBroadcast(false)}
                  className="p-1.5 text-app-muted hover:text-app-primary hover:bg-app-hover border border-transparent hover:border-app-border rounded-xl transition-all cursor-pointer active:scale-95"
                  title="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>

              {broadcastError && (
                <div className="my-2 p-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-mono shrink-0">
                  {broadcastError}
                </div>
              )}

              {/* Main 2-Column Content Grid - Compact & Responsive */}
              <div className="flex-1 overflow-y-auto md:overflow-visible py-2.5 space-y-2.5">
                {/* Templates Quick Bar (1 Row) */}
                <div className="space-y-1">
                  <span className="text-[10px] text-app-muted font-mono uppercase tracking-wider block">
                    Готовые сценарии кампаний:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {BROADCAST_TEMPLATES.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="p-1.5 text-left bg-app-card hover:bg-app-hover border border-app-border rounded-xl transition-colors cursor-pointer space-y-0.5"
                      >
                        <p className="font-semibold text-app-primary text-[11px] truncate">
                          {tpl.title}
                        </p>
                        <p className="text-[9px] text-app-muted truncate font-mono">
                          {targetLabels[tpl.targetFilter]?.label || "Все"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
                  {/* Left Column: Form Controls */}
                  <form
                    onSubmit={handleCreateBroadcast}
                    noValidate
                    className="md:col-span-7 space-y-2 font-sans text-xs"
                  >
                    {/* Row 1: Title + Targeting */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] text-app-muted font-mono uppercase tracking-wider">
                          Заголовок кампании *
                        </label>
                        <input
                          type="text"
                          value={newBroadcastData.title}
                          onChange={(e) =>
                            setNewBroadcastData((p) => ({ ...p, title: e.target.value }))
                          }
                          placeholder="Спецпредложение 🔥"
                          className="w-full bg-app-card border border-app-border rounded-xl px-2.5 py-1.5 text-xs text-app-primary focus:outline-none focus:border-app-primary transition-colors"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] text-app-muted font-mono uppercase tracking-wider">
                          Таргетинг (Сегмент)
                        </label>
                        <CustomDropdown
                          value={newBroadcastData.targetFilter}
                          onChange={(val) =>
                            setNewBroadcastData((p) => ({ ...p, targetFilter: val }))
                          }
                          options={Object.entries(targetLabels).map(([id, target]) => ({
                            value: id,
                            label: target.label,
                            description: target.desc,
                            icon: <Target size={13} />,
                          }))}
                          className="w-full"
                          buttonClassName="w-full bg-app-card"
                          minMenuWidth="min-w-[280px]"
                        />
                      </div>
                    </div>

                    {/* Targeting Quick Chips (Compact) */}
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(targetLabels).map(([id, target]) => {
                        const isSelected = newBroadcastData.targetFilter === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() =>
                              setNewBroadcastData((p) => ({ ...p, targetFilter: id }))
                            }
                            className={`px-2 py-0.5 rounded-lg border text-[9px] font-mono transition-all cursor-pointer ${
                              isSelected
                                ? "bg-app-accent text-app-accent-fg border-transparent font-bold"
                                : "bg-app-card border-app-border text-app-secondary hover:text-app-primary hover:bg-app-hover"
                            }`}
                          >
                            {target.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Message Text with Variable Inserters */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] text-app-muted font-mono uppercase tracking-wider">
                          Текст сообщения *
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-app-muted font-mono">Теги:</span>
                          {[
                            { tag: "{name}", label: "Имя" },
                            { tag: "{shop_name}", label: "Заведение" },
                            { tag: "{bonus}", label: "Бонусы" },
                          ].map((v) => (
                            <button
                              key={v.tag}
                              type="button"
                              onClick={() => insertVariable(v.tag)}
                              className="px-1.5 py-0.5 bg-app-card hover:bg-app-hover border border-app-border rounded text-[9px] font-mono text-app-primary cursor-pointer transition-colors"
                              title={`Вставить ${v.tag}`}
                            >
                              {v.tag}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        value={newBroadcastData.message}
                        onChange={(e) =>
                          setNewBroadcastData((p) => ({ ...p, message: e.target.value }))
                        }
                        placeholder="Привет, {name}! Мы приготовили для вас специальный бонус..."
                        className="w-full bg-app-card border border-app-border rounded-xl px-2.5 py-1.5 text-xs text-app-primary focus:outline-none focus:border-app-primary resize-none leading-relaxed transition-colors"
                        required
                      />
                    </div>

                    {/* Image Uploader with File, Presets and URL */}
                    <div className="pt-0.5">
                      <ImageUploader
                        value={newBroadcastData.imageUrl || ""}
                        onChange={(url) =>
                          setNewBroadcastData((p) => ({ ...p, imageUrl: url }))
                        }
                        label="Изображение для рассылки (файл до 15 МБ / ссылка)"
                        type="photo"
                        presets={BROADCAST_IMAGE_PRESETS}
                        placeholder="https://... или выберите файл"
                        maxHeightClass="max-h-20"
                      />
                    </div>

                    {/* Interactive Button */}
                    <div className="space-y-1">
                      <label className="block text-[10px] text-app-muted font-mono uppercase tracking-wider">
                        Интерактивная кнопка в Telegram
                      </label>
                      <input
                        type="text"
                        value={newBroadcastData.buttonText || ""}
                        onChange={(e) =>
                          setNewBroadcastData((p) => ({ ...p, buttonText: e.target.value }))
                        }
                        placeholder="Например: 🛒 Открыть Меню"
                        className="w-full bg-app-card border border-app-border rounded-xl px-2.5 py-1.5 text-xs text-app-primary focus:outline-none focus:border-app-primary"
                      />
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {BUTTON_PRESETS.map((btnPreset) => (
                          <button
                            key={btnPreset}
                            type="button"
                            onClick={() =>
                              setNewBroadcastData((p) => ({ ...p, buttonText: btnPreset }))
                            }
                            className={`px-2 py-0.5 text-[9px] font-mono rounded-lg border transition-colors cursor-pointer ${
                              newBroadcastData.buttonText === btnPreset
                                ? "bg-app-accent text-app-accent-fg border-transparent font-semibold"
                                : "bg-app-card border-app-border text-app-secondary hover:text-app-primary hover:bg-app-hover"
                            }`}
                          >
                            {btnPreset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </form>

                  {/* Right Column: Telegram Simulator Live Preview */}
                  <div className="md:col-span-5 flex flex-col bg-app-card border border-app-border rounded-2xl p-3 space-y-2 justify-between">
                    <div className="flex justify-between items-center border-b border-app-border pb-1.5">
                      <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider">
                        Предпросмотр в боте
                      </span>
                      <span className="text-[9px] font-mono text-app-muted">
                        Telegram Preview
                      </span>
                    </div>

                    <div className="bg-app-surface rounded-xl p-2.5 flex flex-col justify-between border border-app-border shadow-inner relative overflow-hidden min-h-[220px]">
                      <div className="flex justify-between items-center text-[8px] text-app-muted font-mono px-0.5 pb-1">
                        <span>12:00</span>
                        <span>Telegram Mini App</span>
                      </div>

                      <div className="flex-1 flex flex-col justify-end">
                        <div className="bg-app-card rounded-xl p-2.5 border border-app-border space-y-1.5 shadow-md w-full relative">
                          <div className="flex items-center gap-1.5 border-b border-app-border/60 pb-1.5">
                            <div className="w-5 h-5 rounded-full bg-app-surface border border-app-border text-app-primary font-mono text-[9px] flex items-center justify-center font-bold">
                              🤖
                            </div>
                            <div className="leading-tight">
                              <p className="text-[10px] font-bold text-app-primary font-mono truncate max-w-[140px]">
                                {selectedShop.name}
                              </p>
                              <p className="text-[8px] text-app-muted font-mono">bot</p>
                            </div>
                          </div>

                          {newBroadcastData.imageUrl && (
                            <div className="rounded-lg overflow-hidden h-20 bg-app-surface border border-app-border">
                              <img
                                src={newBroadcastData.imageUrl}
                                alt="preview"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            </div>
                          )}

                          <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-app-primary font-mono">
                              {newBroadcastData.title || "Заголовок рассылки"}
                            </p>
                            <p className="text-[10px] text-app-secondary leading-snug font-sans whitespace-pre-wrap break-words line-clamp-4">
                              {previewMessage}
                            </p>
                          </div>

                          {newBroadcastData.buttonText && (
                            <div className="pt-0.5">
                              <div className="w-full py-1 bg-app-accent text-app-accent-fg text-center rounded-lg font-mono text-[10px] font-bold shadow-xs">
                                {newBroadcastData.buttonText}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-center text-[9px] font-mono text-app-muted">
                      Симуляция диалога в Telegram
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Modal Footer with Actions Always in View */}
              <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-app-border shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreatingBroadcast(false)}
                  className="py-2 px-4 bg-app-card hover:bg-app-hover border border-app-border text-app-secondary font-mono font-bold text-xs rounded-xl transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleCreateBroadcast}
                  className="py-2 px-6 bg-app-accent text-app-accent-fg hover:opacity-90 font-mono font-bold text-xs rounded-xl transition-opacity uppercase tracking-wider cursor-pointer shadow-xs"
                >
                  🚀 Отправить рассылку
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
