import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  X,
  Lock,
  FileText,
  Eye,
  Database,
  UserCheck,
  Cookie,
  Mail,
  CheckCircle2,
  Copy,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Server,
  Key
} from "lucide-react";
import { useScrollLock } from "../hooks/useScrollLock";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName?: string;
  shopSlug?: string;
  source?: "admin" | "shop";
}

interface PolicySection {
  id: string;
  title: string;
  icon: React.ElementType;
  summary: string;
  content: React.ReactNode;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  shopName = "Сервис TMA Builder",
  shopSlug,
  source = "shop"
}) => {
  useScrollLock(isOpen);
  const [activeSection, setActiveSection] = useState<string>("general");
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    const url = window.location.origin + (shopSlug ? `/${shopSlug}` : "") + "#privacy";
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const sections: PolicySection[] = [
    {
      id: "general",
      title: "1. Общие положения",
      icon: FileText,
      summary: "Правовой статус, цели документа и стороны взаимодействия",
      content: (
        <div className="space-y-3">
          <p className="leading-relaxed">
            Настоящая <strong>Политика конфиденциальности</strong> (далее — «Политика») определяет порядок обработки и защиты персональной информации пользователей платформы <strong>TMA Builder</strong> и онлайн-витрины заведения <strong>{shopName}</strong> (далее — «Оператор»).
          </p>
          <p className="leading-relaxed">
            Использование веб-приложения, Telegram Mini App витрины, оформление заказов или регистрация в панели управления означает безоговорочное согласие пользователя с настоящей Политикой и указанными в ней условиями обработки его персональных данных.
          </p>
          <div className="p-3.5 bg-app-card border border-app-border rounded-2xl flex items-start gap-3">
            <ShieldCheck size={18} className="text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-xs text-app-secondary leading-relaxed">
              Оператор ставит соблюдение прав и свобод человека и гражданина главным условием при осуществлении своей деятельности, включая защиту прав на неприкосновенность частной жизни, личную и семейную тайну.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "data-categories",
      title: "2. Состав собираемых данных",
      icon: Database,
      summary: "Какие категории персональных данных обрабатываются",
      content: (
        <div className="space-y-4">
          <p className="leading-relaxed">
            Оператор может обрабатывать следующие категории данных пользователей при оформлении заказов и работе в системе:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 bg-app-surface border border-app-border rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-app-primary">
                <UserCheck size={14} className="text-app-accent" />
                <span>Идентификационные данные</span>
              </div>
              <p className="text-xs text-app-muted">Имя, контактный номер телефона, Telegram Username и Telegram User ID.</p>
            </div>

            <div className="p-3 bg-app-surface border border-app-border rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-app-primary">
                <Server size={14} className="text-app-accent" />
                <span>Данные о заказах</span>
              </div>
              <p className="text-xs text-app-muted">Состав корзины, адрес доставки, номер столика, комментарии, промокоды и чаевые.</p>
            </div>

            <div className="p-3 bg-app-surface border border-app-border rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-app-primary">
                <Lock size={14} className="text-app-accent" />
                <span>Учетные данные администратора</span>
              </div>
              <p className="text-xs text-app-muted">E-mail адрес, зашифрованный пароль (хеш), название заведения, реквизиты Telegram-бота.</p>
            </div>

            <div className="p-3 bg-app-surface border border-app-border rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-app-primary">
                <Cookie size={14} className="text-app-accent" />
                <span>Техническая информация</span>
              </div>
              <p className="text-xs text-app-muted">Файлы cookie, локальные токены сессии (Local Storage), тема оформления, язык и тип устройства.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "purposes",
      title: "3. Цели обработки данных",
      icon: Eye,
      summary: "Зачем и для каких сервисов используются данные",
      content: (
        <div className="space-y-3">
          <p className="leading-relaxed">
            Сбор и обработка персональных данных осуществляются исключительно в законных целях:
          </p>
          <ul className="space-y-2 text-xs text-app-secondary">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Оформление и исполнение заказов:</strong> передача информации кухне, упаковке, курьеру и персоналу заведения для своевременной выдачи.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Уведомление о статусе:</strong> отправка push-сообщений и служебных уведомлений в Telegram о подтверждении, готовности и доставке.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Программа лояльности:</strong> корректный расчет бонусов, кешбэка и валидация скидочных промокодов.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Обратная связь:</strong> ответы на отзывы клиентов, рассмотрение сообщений об ошибках и улучшение клиентского опыта.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Безопасность:</strong> предотвращение мошеннических действий, спама и несанкционированного доступа к панели управления.</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: "security",
      title: "4. Защита и безопасность данных",
      icon: Lock,
      summary: "Методы шифрования, доступ персонала и безопасность серверов",
      content: (
        <div className="space-y-3">
          <p className="leading-relaxed">
            Оператор принимает все необходимые технические и организационные меры для защиты персональной информации от неправомерного доступа, изменения, раскрытия или уничтожения.
          </p>
          <div className="space-y-2">
            <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center gap-3">
              <Key size={16} className="text-app-accent shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-app-primary block">Сквозное шифрование SSL/TLS</span>
                <span className="text-app-muted">Все клиентские запросы передаются исключительно по защищенному протоколу HTTPS.</span>
              </div>
            </div>
            <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center gap-3">
              <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-app-primary block">Хеширование паролей и изоляция данных</span>
                <span className="text-app-muted">Пароли администраторов хранятся в виде криптографических хешей (bcrypt/argon2). Доступ к заведению строго изолирован токенами JWT.</span>
              </div>
            </div>
            <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center gap-3">
              <Database size={16} className="text-indigo-400 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-app-primary block">Никакой продажи третьим лицам</span>
                <span className="text-app-muted">Персональные данные никогда не передаются сторонним рекламным сетям или брокерам данных.</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "user-rights",
      title: "5. Права пользователя",
      icon: UserCheck,
      summary: "Как отозвать согласие, удалить аккаунт или получить копию данных",
      content: (
        <div className="space-y-3">
          <p className="leading-relaxed">
            В соответствии с законодательством о защите персональных данных, каждый пользователь имеет право:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-app-secondary pl-1">
            <li>Получать сведения о сроках и способах обработки своих персональных данных;</li>
            <li>Требовать уточнения, блокирования или уничтожения неполных, устаревших или неточных данных;</li>
            <li>Отозвать свое согласие на обработку персональных данных в любой момент времени;</li>
            <li>Удалить локальную историю заказов и сохраненные данные корзины в настройках браузера/приложения.</li>
          </ul>
          <p className="text-xs text-app-muted leading-relaxed">
            Для удаления персональных данных или отзыва согласия свяжитесь с поддержкой заведения или администрацией через раздел обратной связи.
          </p>
        </div>
      )
    },
    {
      id: "cookies",
      title: "6. Cookies и хранение данных",
      icon: Cookie,
      summary: "Использование LocalStorage, сессий и технических меток",
      content: (
        <div className="space-y-3">
          <p className="leading-relaxed">
            Приложение использует технологию <strong>Local Storage</strong> и сессионные cookies для обеспечения корректной работы функционала:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-app-surface border border-app-border rounded-xl">
              <span className="font-mono font-bold text-app-primary block mb-1">Корзина и Избранное</span>
              <span className="text-app-muted">Сохраняет выбранные блюда и товары до оформления заказа.</span>
            </div>
            <div className="p-2.5 bg-app-surface border border-app-border rounded-xl">
              <span className="font-mono font-bold text-app-primary block mb-1">Тема оформления</span>
              <span className="text-app-muted">Запоминает выбор темной или светлой темы интерфейса.</span>
            </div>
            <div className="p-2.5 bg-app-surface border border-app-border rounded-xl">
              <span className="font-mono font-bold text-app-primary block mb-1">Токен авторизации</span>
              <span className="text-app-muted">Обеспечивает безопасный вход в панель управления без повторного ввода пароля.</span>
            </div>
            <div className="p-2.5 bg-app-surface border border-app-border rounded-xl">
              <span className="font-mono font-bold text-app-primary block mb-1">История заказов</span>
              <span className="text-app-muted">Хранит список оформленных пользователем заказов для отслеживания.</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "contacts",
      title: "7. Контакты и реквизиты",
      icon: Mail,
      summary: "Как связаться с оператором персональных данных",
      content: (
        <div className="space-y-3">
          <p className="leading-relaxed">
            По всем вопросам, предложениям, а также для реализации прав субъекта персональных данных вы можете обратиться:
          </p>
          <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-app-border pb-2">
              <span className="text-app-muted">Оператор:</span>
              <span className="font-bold text-app-primary">{shopName}</span>
            </div>
            <div className="flex items-center justify-between border-b border-app-border pb-2">
              <span className="text-app-muted">Платформа:</span>
              <span className="text-app-primary">TMA Builder (v2.6)</span>
            </div>
            <div className="flex items-center justify-between border-b border-app-border pb-2">
              <span className="text-app-muted">Политика действует с:</span>
              <span className="text-app-primary">26.08.2026</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-app-muted">Служба безопасности:</span>
              <span className="text-emerald-400">privacy@tma-builder.app</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentSectionData = sections.find(s => s.id === activeSection) || sections[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          key="privacy-policy-modal"
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 overflow-hidden font-sans"
        >
          {/* Backdrop */}
          <motion.div
            key="privacy-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80]"
          />

          {/* Modal Panel */}
          <motion.div
            key="privacy-panel"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="max-w-3xl w-full max-h-[90vh] bg-app-modal border border-app-border rounded-3xl overflow-hidden shadow-2xl relative z-[80] flex flex-col text-app-primary my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-app-border bg-app-surface/90 backdrop-blur-md flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-app-primary font-mono tracking-tight flex items-center gap-2">
                    Политика конфиденциальности
                    <span className="px-2 py-0.5 bg-app-card border border-app-border rounded-full text-[10px] font-mono text-app-muted hidden sm:inline-block font-normal">
                      ФЗ-152 / GDPR
                    </span>
                  </h2>
                  <p className="text-xs text-app-muted font-sans truncate max-w-xs sm:max-w-md">
                    Защита персональных данных • {shopName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2 text-app-muted hover:text-app-primary hover:bg-app-card border border-transparent hover:border-app-border rounded-xl transition-all cursor-pointer hidden sm:flex items-center gap-1.5 text-xs font-mono"
                  title="Скопировать ссылку на политику"
                >
                  {copiedLink ? <CheckCircle2 size={15} className="text-emerald-400" /> : <Copy size={15} />}
                  <span>{copiedLink ? "Скопировано" : "Ссылка"}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-app-muted hover:text-app-primary bg-app-card border border-app-border transition-colors cursor-pointer"
                  title="Закрыть"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body: Split Layout (Tabs / Sections + Content) */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
              {/* Left Navigation Menu (Desktop) & Top Chips (Mobile) */}
              <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-app-border bg-app-card/30 p-2.5 sm:p-3 overflow-x-auto md:overflow-y-auto custom-scrollbar shrink-0 flex md:flex-col gap-1.5">
                <div className="hidden md:block px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-app-muted mb-1">
                  Разделы документа
                </div>
                {sections.map(s => {
                  const Icon = s.icon;
                  const isActive = activeSection === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveSection(s.id)}
                      className={`text-left px-3 py-2 sm:py-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-2 cursor-pointer shrink-0 md:w-full ${
                        isActive
                          ? "bg-app-accent text-app-accent-fg font-bold shadow-sm"
                          : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon size={14} className={isActive ? "text-app-accent-fg" : "text-app-muted shrink-0"} />
                        <span className="truncate">{s.title}</span>
                      </div>
                      <ChevronRight size={13} className={`hidden md:block shrink-0 transition-transform ${isActive ? "text-app-accent-fg translate-x-0.5" : "text-app-muted/50"}`} />
                    </button>
                  );
                })}
              </div>

              {/* Right Content Area */}
              <div className="md:col-span-8 p-5 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between space-y-6 text-xs sm:text-sm text-app-primary font-sans leading-relaxed">
                <div className="space-y-4">
                  {/* Current Section Title */}
                  <div className="border-b border-app-border pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-app-primary font-mono flex items-center gap-2">
                        {currentSectionData.title}
                      </h3>
                      <p className="text-xs text-app-muted font-sans mt-0.5">
                        {currentSectionData.summary}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Content */}
                  <div className="animate-fade-in text-xs sm:text-sm text-app-secondary">
                    {currentSectionData.content}
                  </div>
                </div>

                {/* Section Step Footer */}
                <div className="pt-4 border-t border-app-border flex items-center justify-between text-xs font-mono">
                  <span className="text-app-muted">
                    Раздел {sections.findIndex(s => s.id === activeSection) + 1} из {sections.length}
                  </span>

                  <div className="flex items-center gap-2">
                    {sections.findIndex(s => s.id === activeSection) < sections.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          const nextIdx = sections.findIndex(s => s.id === activeSection) + 1;
                          setActiveSection(sections[nextIdx].id);
                        }}
                        className="px-3 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-app-primary text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>Далее</span>
                        <ChevronRight size={13} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 bg-app-accent text-app-accent-fg font-bold rounded-xl text-xs font-mono hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                      >
                        Понятно
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Note */}
            <div className="px-6 py-3 bg-app-surface border-t border-app-border flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-app-muted shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Данные надежно защищены в соответствии с ФЗ-152 «О персональных данных»</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 bg-app-card hover:bg-app-hover border border-app-border rounded-lg text-app-primary transition-colors cursor-pointer ml-auto"
              >
                Закрыть
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
