import React, { FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, X } from "lucide-react";
import { Shop } from "../../types";

interface Broadcast {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  targetFilter?: string;
  sentCount?: number;
  buttonText?: string;
}

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
  const targetLabels: Record<string, string> = {
    ALL: "Все клиенты",
    ACTIVE: "Активные",
    INACTIVE: "Спящие",
    NEW: "Новые",
    VIP: "VIP клиенты",
    BONUS_HOLDERS: "С бонусами",
  };

  return (
    <div className="space-y-4">
      {broadcasts.length === 0 ? (
        <div className="py-16 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
          <p className="text-xs text-app-muted font-mono">
            Рассылок пока не отправлялось.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {broadcasts.map((bc, idx) => (
            <motion.div
              key={bc.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              whileHover={{ y: -3 }}
              className="p-5 rounded-2xl bg-app-surface border border-app-border flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-app-card border border-app-border text-app-primary text-[9px] font-mono rounded-md font-semibold">
                        ОТПРАВЛЕНО
                      </span>
                      <span className="px-2 py-0.5 bg-app-card border border-app-border text-app-secondary text-[9px] font-mono rounded-md">
                        {targetLabels[bc.targetFilter || ""] || bc.targetFilter || "Все клиенты"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-app-primary font-mono pt-1">
                      {bc.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => handleDeleteBroadcast(bc.id)}
                    className="p-1.5 text-app-muted hover:text-app-primary hover:bg-app-hover border border-transparent hover:border-app-border rounded-lg transition-all cursor-pointer backdrop-blur-sm"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {bc.imageUrl && (
                  <div className="rounded-xl overflow-hidden h-24 bg-app-card border border-app-border">
                    <img
                      src={bc.imageUrl}
                      alt={bc.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <p className="text-xs text-app-secondary leading-relaxed font-sans line-clamp-3">
                  {bc.message}
                </p>
              </div>

              <div className="pt-3 border-t border-app-border flex items-center justify-between text-[10px] font-mono text-app-muted">
                <div>
                  Получателей:{" "}
                  <span className="text-app-primary font-bold">
                    {bc.sentCount || 1}
                  </span>
                </div>
                {bc.buttonText && (
                  <div className="px-2 py-1 bg-app-card border border-app-border text-app-secondary rounded-lg text-[9px]">
                    Button: {bc.buttonText}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Broadcast Modal */}
      {isCreatingBroadcast && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-app-modal border border-app-border rounded-3xl p-6 text-app-primary flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto">
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center border-b border-app-border pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold font-mono text-app-primary">
                    Гибкий конструктор рассылки
                  </h3>
                  <p className="text-[11px] text-app-muted font-sans">
                    Настройте таргетинг, шаблоны и интерактивные кнопки
                  </p>
                </div>
                <button
                  onClick={() => setIsCreatingBroadcast(false)}
                  className="text-app-muted hover:text-app-primary md:hidden cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {broadcastError && (
                <p className="text-xs text-rose-800 dark:text-rose-300 font-mono font-medium bg-rose-500/15 border border-rose-500/30 px-3 py-2 rounded-xl">
                  {broadcastError}
                </p>
              )}

              <form onSubmit={handleCreateBroadcast} className="space-y-4 font-sans text-xs">
                <div className="space-y-1">
                  <label className="block text-[11px] text-app-muted font-mono uppercase tracking-wider">
                    Заголовок кампании *
                  </label>
                  <input
                    type="text"
                    value={newBroadcastData.title}
                    onChange={(e) =>
                      setNewBroadcastData((p) => ({ ...p, title: e.target.value }))
                    }
                    placeholder="Например: Спецпредложение для постоянных клиентов! 🔥"
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none focus:border-app-border"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] text-app-muted font-mono uppercase tracking-wider">
                    Целевая аудитория (Таргетинг)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { id: "ALL", label: "Все клиенты", desc: "Вся база CRM" },
                      { id: "ACTIVE", label: "Активные", desc: "Сделали >1 заказа" },
                      { id: "INACTIVE", label: "Спящие", desc: "0 заказов в CRM" },
                      { id: "NEW", label: "Новые", desc: "Регистрация <7 дней" },
                      { id: "VIP", label: "VIP клиенты", desc: "Сумма трат >3000 ₽" },
                      { id: "BONUS_HOLDERS", label: "С бонусами", desc: "Баланс бонусов >0" },
                    ].map((target) => (
                      <button
                        key={target.id}
                        type="button"
                        onClick={() =>
                          setNewBroadcastData((p) => ({ ...p, targetFilter: target.id }))
                        }
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                          newBroadcastData.targetFilter === target.id
                            ? "bg-app-accent text-app-accent-fg border-app-border font-bold animate-pulse-subtle"
                            : "bg-app-card border-app-border text-app-secondary hover:border-app-border"
                        }`}
                      >
                        <span className="font-semibold block text-[11px] font-mono">
                          {target.label}
                        </span>
                        <span
                          className={`text-[9px] block ${
                            newBroadcastData.targetFilter === target.id
                              ? "text-app-accent-fg/80"
                              : "text-app-muted"
                          }`}
                        >
                          {target.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <label className="block text-[11px] text-app-muted font-mono uppercase tracking-wider">
                      Текст сообщения *
                    </label>
                    <span className="text-[10px] text-app-muted font-mono">
                      Переменная: {"{name}"}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={newBroadcastData.message}
                    onChange={(e) =>
                      setNewBroadcastData((p) => ({ ...p, message: e.target.value }))
                    }
                    placeholder="Привет, {name}! Мы приготовили для вас специальный бонус..."
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none focus:border-app-border resize-none leading-relaxed"
                    required
                  />
                  <p className="text-[10px] text-app-muted italic">
                    Используйте {"{name}"}, чтобы автоматически подставить имя клиента при отправке.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] text-app-muted font-mono uppercase tracking-wider">
                    Изображение (URL или шаблон)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBroadcastData.imageUrl || ""}
                      onChange={(e) =>
                        setNewBroadcastData((p) => ({ ...p, imageUrl: e.target.value }))
                      }
                      placeholder="Вставьте ссылку на картинку..."
                      className="flex-1 bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none focus:border-app-border font-mono"
                    />
                    {newBroadcastData.imageUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setNewBroadcastData((p) => ({ ...p, imageUrl: "" }))
                        }
                        className="px-3 bg-app-secondary hover:bg-app-hover rounded-xl text-app-primary font-mono transition-colors cursor-pointer"
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      {
                        label: "🎁 Подарок",
                        url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=400",
                      },
                      {
                        label: "💈 Стрижка",
                        url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=400",
                      },
                      {
                        label: "🔥 Акция",
                        url: "https://images.unsplash.com/photo-1557200134-90327ee9fafa?auto=format&fit=crop&q=80&w=400",
                      },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          setNewBroadcastData((p) => ({ ...p, imageUrl: preset.url }))
                        }
                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono transition-colors cursor-pointer ${
                          newBroadcastData.imageUrl === preset.url
                            ? "bg-app-accent text-app-accent-fg border-transparent font-semibold"
                            : "bg-app-card border-app-border text-app-muted hover:text-app-primary"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] text-app-muted font-mono uppercase tracking-wider">
                    Интерактивная кнопка
                  </label>
                  <input
                    type="text"
                    value={newBroadcastData.buttonText || ""}
                    onChange={(e) =>
                      setNewBroadcastData((p) => ({ ...p, buttonText: e.target.value }))
                    }
                    placeholder="Например: 🛒 Открыть Меню"
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none focus:border-app-border"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["🛒 Заказать", "⭐ Оставить отзыв", "🎁 Забрать бонус"].map(
                      (btnPreset) => (
                        <button
                          key={btnPreset}
                          type="button"
                          onClick={() =>
                            setNewBroadcastData((p) => ({ ...p, buttonText: btnPreset }))
                          }
                          className={`px-2.5 py-1 text-[10px] font-mono rounded-lg border transition-colors cursor-pointer ${
                            newBroadcastData.buttonText === btnPreset
                              ? "bg-app-accent text-app-accent-fg border-transparent font-semibold"
                              : "bg-app-card border-app-border text-app-secondary hover:text-app-primary hover:bg-app-hover"
                          }`}
                        >
                          {btnPreset}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-3 border-t border-app-border">
                  <button
                    type="button"
                    onClick={() => setIsCreatingBroadcast(false)}
                    className="w-full sm:w-auto sm:flex-1 py-2.5 px-4 bg-app-card hover:bg-app-hover border border-app-border text-app-secondary hover:text-app-primary font-mono font-bold text-xs rounded-xl transition-colors uppercase tracking-wider cursor-pointer text-center"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto sm:flex-[2] py-2.5 px-4 bg-app-accent text-app-accent-fg hover:opacity-90 font-mono font-bold text-xs rounded-xl transition-opacity uppercase tracking-wider cursor-pointer shadow-xs text-center"
                  >
                    🚀 Запустить рассылку
                  </button>
                </div>
              </form>
            </div>

            {/* Smartphone Live Preview */}
            <div className="w-full md:w-80 flex flex-col bg-app-card border border-app-border rounded-3xl p-4 space-y-4">
              <div className="flex justify-between items-center border-b border-app-border pb-2">
                <span className="text-[11px] font-mono text-app-muted uppercase tracking-widest">
                  Интерактивный Превью
                </span>
                <button
                  onClick={() => setIsCreatingBroadcast(false)}
                  className="text-app-muted hover:text-app-primary hidden md:block cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 bg-app-surface rounded-2xl p-3 flex flex-col justify-between border border-app-border shadow-inner relative overflow-hidden min-h-[380px]">
                <div className="flex justify-between items-center text-[9px] text-app-muted font-mono px-1">
                  <span>12:30 📱</span>
                  <span>LTE 🔋</span>
                </div>

                <div className="flex-1 flex flex-col justify-end py-4">
                  <div className="bg-app-card rounded-2xl p-3 border border-app-border space-y-3 shadow-xl w-full relative">
                    <div className="flex items-center gap-2 border-b border-app-border/50 pb-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] flex items-center justify-center font-bold">
                        🤖
                      </div>
                      <div className="leading-none">
                        <p className="text-[11px] font-bold text-app-primary font-mono">
                          {selectedShop.name}
                        </p>
                        <p className="text-[9px] text-emerald-400 font-mono">bot</p>
                      </div>
                    </div>

                    {newBroadcastData.imageUrl && (
                      <div className="rounded-xl overflow-hidden h-28 bg-app-surface border border-app-border">
                        <img
                          src={newBroadcastData.imageUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-app-primary font-mono">
                        {newBroadcastData.title || "Заголовок рассылки"}
                      </p>
                      <p className="text-[11px] text-app-secondary leading-relaxed font-sans whitespace-pre-wrap break-words">
                        {newBroadcastData.message
                          ? newBroadcastData.message.replace(/\{name\}/g, "Алексей")
                          : "Текст рассылки появится здесь..."}
                      </p>
                    </div>

                    {newBroadcastData.buttonText && (
                      <div className="pt-1">
                        <div className="w-full py-2 bg-app-accent text-app-accent-fg text-center rounded-xl font-mono text-xs font-bold shadow-sm">
                          {newBroadcastData.buttonText}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center text-[9px] font-mono text-app-muted">
                  Telegram WebApp Simulator
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
