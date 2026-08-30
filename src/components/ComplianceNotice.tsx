import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, X, Settings, Check, Lock } from "lucide-react";

interface ComplianceNoticeProps {
  onOpenPrivacyPolicy?: () => void;
}

export const ComplianceNotice: React.FC<ComplianceNoticeProps> = ({ onOpenPrivacyPolicy }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean>(true);
  const [marketingEnabled, setMarketingEnabled] = useState<boolean>(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("cookie_consent_152fz");
      if (!consent) {
        // Small delay so it transitions smoothly after initial render
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem(
        "cookie_consent_152fz",
        JSON.stringify({
          accepted: true,
          date: new Date().toISOString(),
          necessary: true,
          analytics: true,
          marketing: true,
        })
      );
    } catch {
      // ignore
    }
    setIsVisible(false);
  };

  const handleAcceptEssential = () => {
    try {
      localStorage.setItem(
        "cookie_consent_152fz",
        JSON.stringify({
          accepted: true,
          date: new Date().toISOString(),
          necessary: true,
          analytics: false,
          marketing: false,
        })
      );
    } catch {
      // ignore
    }
    setIsVisible(false);
  };

  const handleSaveCustom = () => {
    try {
      localStorage.setItem(
        "cookie_consent_152fz",
        JSON.stringify({
          accepted: true,
          date: new Date().toISOString(),
          necessary: true,
          analytics: analyticsEnabled,
          marketing: marketingEnabled,
        })
      );
    } catch {
      // ignore
    }
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="compliance-notice"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 260 }}
          className="fixed bottom-3 left-3 right-3 sm:left-6 sm:right-auto sm:max-w-md z-50 pointer-events-auto font-sans"
        >
          <div className="bg-app-card/95 backdrop-blur-xl border border-app-border rounded-2xl p-4 sm:p-5 shadow-2xl text-app-primary">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-app-primary font-mono flex items-center gap-1.5">
                    <span>Использование данных</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-app-surface text-app-muted border border-app-border">152-ФЗ</span>
                  </h4>
                  <span className="text-[10px] text-app-muted font-mono">Соответствие законодательству РФ</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAcceptEssential}
                className="text-app-muted hover:text-app-primary transition-colors p-1 cursor-pointer"
                title="Закрыть"
              >
                <X size={15} />
              </button>
            </div>

            {/* Description */}
            {!showSettings ? (
              <div className="mt-2.5 space-y-2.5 text-xs text-app-secondary leading-relaxed">
                <p className="text-[11px]">
                  Мы используем файлы cookie и локальные хранилища для обеспечения базовой функциональности сервиса, авторизации и защиты данных в соответствии с <strong>ФЗ № 152-ФЗ «О персональных данных»</strong>.
                </p>

                <div className="flex items-center gap-2 text-[10px] font-mono text-app-muted">
                  <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                  <span>Данные обрабатываются на серверах в РФ</span>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="flex-1 py-2 px-3 bg-app-accent text-app-accent-fg font-mono text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Check size={14} />
                    <span>Принять все</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAcceptEssential}
                    className="py-2 px-3 bg-app-surface hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary font-mono text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Только обязательные
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSettings(true)}
                    className="py-2 px-2.5 bg-app-surface hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                    title="Настроить параметры"
                  >
                    <Settings size={14} />
                  </button>
                </div>

                {onOpenPrivacyPolicy && (
                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={onOpenPrivacyPolicy}
                      className="text-[10px] font-mono text-app-muted hover:text-app-primary underline cursor-pointer"
                    >
                      Подробнее в Политике конфиденциальности
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-3 text-xs">
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  <div className="p-2.5 bg-app-surface border border-app-border rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[11px] text-app-primary block font-mono">Технические (Необходимые)</span>
                      <span className="text-[10px] text-app-muted">Сессии, авторизация, корзина</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">Включено</span>
                  </div>

                  <div className="p-2.5 bg-app-surface border border-app-border rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[11px] text-app-primary block font-mono">Аналитические</span>
                      <span className="text-[10px] text-app-muted">Счетчик просмотров, статистика</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={analyticsEnabled}
                      onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                      className="w-4 h-4 accent-app-accent cursor-pointer"
                    />
                  </div>

                  <div className="p-2.5 bg-app-surface border border-app-border rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[11px] text-app-primary block font-mono">Маркетинговые (38-ФЗ)</span>
                      <span className="text-[10px] text-app-muted">Персональные скидки и промо-акции</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={marketingEnabled}
                      onChange={(e) => setMarketingEnabled(e.target.checked)}
                      className="w-4 h-4 accent-app-accent cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="py-1.5 px-3 bg-app-surface border border-app-border text-app-muted hover:text-app-primary font-mono text-xs rounded-xl cursor-pointer"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustom}
                    className="flex-1 py-1.5 px-3 bg-app-accent text-app-accent-fg font-mono text-xs font-bold rounded-xl hover:opacity-90 cursor-pointer"
                  >
                    Сохранить выбор
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
