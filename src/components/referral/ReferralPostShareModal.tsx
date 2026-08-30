import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, Copy, Check, MessageSquare, Sparkles } from "lucide-react";

interface ReferralPostShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralLink: string;
}

export const ReferralPostShareModal: React.FC<ReferralPostShareModalProps> = ({
  isOpen,
  onClose,
  referralLink
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const templates = [
    {
      title: "🔥 Для Telegram-канала / Блога",
      desc: "Привлекательный пост с описанием преимуществ конструктора",
      text: `🚀 Создайте свой Telegram Mini App магазин или ресторан за 5 минут без программирования!\n\n📱 TMA-Builder — готовая платформа для приёма заказов, интеграции Telegram-ботов, оплат и CRM прямо внутри Telegram.\n\n✨ Регистрация по ссылке:\n${referralLink}`
    },
    {
      title: "💬 Для чатов и личных сообщений",
      desc: "Короткое дружеское приглашение для коллег и партнеров",
      text: `Привет! Нашёл крутой конструктор Telegram Mini Apps для бизнеса — TMA-Builder. Позволяет запустить витрину, меню и доставку прямо в Telegram за пару кликов: ${referralLink}`
    },
    {
      title: "💼 Для предпринимателей и рестораторов",
      desc: "Фокус на приём заказов, аналитику и уведомления сотрудников",
      text: `Хотите принимать заказы прямо в Telegram? В TMA-Builder есть всё: интерактивное меню, онлайн-оплата, чат с клиентами и уведомления персонала в реальном времени.\n\nПопробуйте бесплатно:\n${referralLink}`
    }
  ];

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleShareTelegram = (text: string) => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text.replace(referralLink, "").trim())}`;
    window.open(url, "_blank");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-app-card border border-app-border rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-app-primary/10 border border-app-primary/20 flex items-center justify-center text-app-primary">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-app-primary">Готовые промо-посты</h3>
                <p className="text-[11px] text-app-muted font-mono">Скопируйте и опубликуйте в соцсетях</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-app-muted hover:text-app-primary hover:bg-app-hover rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Templates list */}
          <div className="space-y-4">
            {templates.map((tpl, idx) => (
              <div
                key={idx}
                className="p-4 bg-app-bg border border-app-border rounded-xl space-y-2.5 hover:border-app-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-app-primary">{tpl.title}</h4>
                    <p className="text-[10px] text-app-muted">{tpl.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleShareTelegram(tpl.text)}
                      className="p-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 rounded-lg transition-colors cursor-pointer"
                      title="Поделиться в Telegram"
                    >
                      <Send size={14} />
                    </button>
                    <button
                      onClick={() => handleCopy(tpl.text, idx)}
                      className="flex items-center gap-1 py-1 px-2.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary rounded-lg font-mono text-[11px] transition-colors cursor-pointer"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check size={12} className="text-emerald-500" />
                          <span className="text-emerald-500 font-bold">Скопировано</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Копировать</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="p-2.5 bg-app-card/60 border border-app-border/60 rounded-lg font-mono text-[11px] text-app-muted leading-relaxed whitespace-pre-wrap select-all">
                  {tpl.text}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="py-2 px-4 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs rounded-xl transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default ReferralPostShareModal;
