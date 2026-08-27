import React, { useState, useEffect, useMemo, useRef } from "react";
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
  ChevronRight,
  ChevronLeft,
  Server,
  Key,
  Search,
  Printer,
  FileCheck2,
  Layers,
  Globe2,
  Clock
} from "lucide-react";
import { useScrollLock } from "../hooks/useScrollLock";

export interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName?: string;
  shopSlug?: string;
  source?: "admin" | "shop";
}

interface PolicySection {
  id: string;
  number: number;
  title: string;
  icon: React.ElementType;
  summary: string;
  content: React.ReactNode;
  rawText: string;
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
  const [viewMode, setViewMode] = useState<"sections" | "continuous">("sections");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFullText, setCopiedFullText] = useState(false);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Dynamic values
  const effectiveShopName = shopName?.trim() || "TMA Builder";
  const policyDate = "26.08.2026";
  const domainUrl = typeof window !== "undefined" ? window.location.origin : "https://tma-builder.app";
  const fullPolicyUrl = `${domainUrl}${shopSlug ? `/${shopSlug}` : ""}#privacy`;

  // Keyboard navigation: Escape to close, Arrows to navigate sections
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Ignore arrow shortcuts when typing in search input
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      if (viewMode === "sections") {
        const currentIndex = sections.findIndex(s => s.id === activeSection);
        if (e.key === "ArrowRight" && currentIndex < sections.length - 1) {
          e.preventDefault();
          setActiveSection(sections[currentIndex + 1].id);
          contentContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        } else if (e.key === "ArrowLeft" && currentIndex > 0) {
          e.preventDefault();
          setActiveSection(sections[currentIndex - 1].id);
          contentContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeSection, viewMode, onClose]);

  // Focus search input when toggled open
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [isSearchOpen]);

  // Reset scroll when switching section
  const handleSelectSection = (id: string) => {
    setActiveSection(id);
    contentContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullPolicyUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Structured Policy Sections
  const sections: PolicySection[] = useMemo(() => [
    {
      id: "general",
      number: 1,
      title: "1. Общие положения и правовой статус",
      icon: FileText,
      summary: "Правовой статус документа, цели и стороны взаимодействия",
      rawText: `Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональной информации пользователей платформы TMA Builder и онлайн-витрины заведения ${effectiveShopName}. Использование веб-приложения, Telegram Mini App или панели управления означает согласие с Политикой в соответствии с ФЗ-152 «О персональных данных» и регламентом GDPR.`,
      content: (
        <div className="space-y-3.5 leading-relaxed text-app-secondary">
          <p>
            Настоящая <strong>Политика конфиденциальности</strong> (далее — «Политика») определяет порядок сбора, хранения, обработки, передачи и защиты персональной информации пользователей платформы <strong>TMA Builder</strong> и онлайн-витрины заведения <strong>{effectiveShopName}</strong> (далее — «Оператор»).
          </p>
          <p>
            Использование веб-приложения, Telegram Mini App витрины, оформление заказов, использование программы лояльности или регистрация в панели управления означает полное и безоговорочное согласие пользователя с настоящей Политикой и указанными в ней условиями обработки персональных данных.
          </p>
          <div className="p-3.5 sm:p-4 bg-app-card border border-app-border rounded-2xl flex items-start gap-3">
            <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-app-primary block font-mono">
                Соблюдение законодательства (ФЗ-152 и GDPR)
              </span>
              <p className="text-xs text-app-muted leading-relaxed">
                Оператор обеспечивает соблюдение прав и свобод человека при обработке его персональных данных, включая защиту прав на неприкосновенность частной жизни, личную и семейную тайну, тайну связи и защиту от несанкционированного доступа.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "data-categories",
      number: 2,
      title: "2. Состав и категории собираемых данных",
      icon: Database,
      summary: "Перечень категорий персональных данных, подлежащих обработке",
      rawText: `Оператор обрабатывает следующие категории данных: идентификационные данные (имя, номер телефона, Telegram Username, Telegram User ID), данные о заказах (состав корзины, адрес доставки, номер столика, промокоды, чеки), учетные данные администратора (email, хеш пароля), техническая информация (файлы cookie, localStorage, IP-адрес, тип устройства).`,
      content: (
        <div className="space-y-4 text-app-secondary">
          <p className="leading-relaxed">
            Оператор может обрабатывать следующие категории персональных и технических данных пользователей при оформлении заказов и работе в системе:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 sm:p-3.5 bg-app-surface border border-app-border rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-app-primary">
                <UserCheck size={14} className="text-emerald-400 shrink-0" />
                <span>Идентификационные данные</span>
              </div>
              <p className="text-xs text-app-muted leading-relaxed">
                Имя (или псевдоним), контактный номер телефона в международном формате, Telegram Username и числовой Telegram User ID.
              </p>
            </div>

            <div className="p-3 sm:p-3.5 bg-app-surface border border-app-border rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-app-primary">
                <Server size={14} className="text-indigo-400 shrink-0" />
                <span>Данные о заказах</span>
              </div>
              <p className="text-xs text-app-muted leading-relaxed">
                Состав корзины, адрес доставки, номер столика, комментарии к блюдам, применённые скидочные промокоды и история транзакций.
              </p>
            </div>

            <div className="p-3 sm:p-3.5 bg-app-surface border border-app-border rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-app-primary">
                <Lock size={14} className="text-amber-400 shrink-0" />
                <span>Учетные данные администратора</span>
              </div>
              <p className="text-xs text-app-muted leading-relaxed">
                E-mail адрес, криптографически зашифрованный пароль (bcrypt hash), название заведения, реквизиты Telegram-бота.
              </p>
            </div>

            <div className="p-3 sm:p-3.5 bg-app-surface border border-app-border rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-app-primary">
                <Cookie size={14} className="text-sky-400 shrink-0" />
                <span>Техническая информация</span>
              </div>
              <p className="text-xs text-app-muted leading-relaxed">
                Файлы cookie, локальные токены сессий (Local Storage), тема интерфейса (dark/light), язык браузера и тип операционной системы.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "purposes",
      number: 3,
      title: "3. Цели и основания обработки данных",
      icon: Eye,
      summary: "Законные цели использования данных клиентов и персонала",
      rawText: `Цели обработки: оформление и доставка заказов, информирование о статусе в Telegram, программа лояльности и расчет кешбэка, ответы на отзывы, предотвращение спама и мошенничества.`,
      content: (
        <div className="space-y-3.5 text-app-secondary">
          <p className="leading-relaxed">
            Сбор и обработка персональной информации осуществляются исключительно в законных целях для обеспечения качественного обслуживания:
          </p>
          <div className="space-y-2">
            {[
              {
                title: "Исполнение и выдача заказов",
                desc: "Передача состава блюд и контактных реквизитов на кухню, службу комплектации и курьеру для быстрой и точной доставки."
              },
              {
                title: "Уведомления о статусе в реальном времени",
                desc: "Отправка сервисных push-уведомлений и сообщений в Telegram о подтверждении, готовности и передаче заказа в доставку."
              },
              {
                title: "Программа лояльности и бонусы",
                desc: "Начисление бонусных рублей, расчет накопительного кешбэка и валидация персональных промокодов."
              },
              {
                title: "Клиентская поддержка и отзывы",
                desc: "Обработка обратной связи, модерация клиентских отзывов и оперативное реагирование на обращения."
              },
              {
                title: "Информационная безопасность",
                desc: "Предотвращение флуда, спама, несанкционированного доступа и обеспечение целостности транзакций."
              }
            ].map((item, idx) => (
              <div key={idx} className="p-3 bg-app-surface/60 border border-app-border rounded-xl flex items-start gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <strong className="text-app-primary font-medium">{item.title}: </strong>
                  <span className="text-app-muted">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: "security",
      number: 4,
      title: "4. Защита, криптография и безопасность",
      icon: Lock,
      summary: "Методы защиты: SSL/TLS, хеширование паролей, JWT и изоляция",
      rawText: `Оператор применяет сквозное SSL/TLS шифрование, криптографическое хеширование паролей bcrypt, изоляцию баз данных токенами JWT и автоматическую фильтрацию XSS и SQL injection.`,
      content: (
        <div className="space-y-3 text-app-secondary">
          <p className="leading-relaxed">
            Оператор применяет современные технические и организационные стандарты информационной безопасности:
          </p>
          <div className="space-y-2">
            <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Key size={16} />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-app-primary block">Сквозное шифрование SSL/TLS</span>
                <span className="text-app-muted">Все клиентские запросы передаются исключительно по защищенному протоколу HTTPS с 256-битным шифрованием.</span>
              </div>
            </div>

            <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-app-primary block">Хеширование паролей и JWT изоляция</span>
                <span className="text-app-muted">Пароли администраторов не хранятся в открытом виде (bcrypt). Доступ к заведению строго изолирован криптографическими JWT-токенами.</span>
              </div>
            </div>

            <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                <Server size={16} />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-app-primary block">Никакой продажи третьим лицам</span>
                <span className="text-app-muted">Базы данных никогда не передаются сторонним рекламным сетям, агрегаторам спама или коммерческим брокерам.</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "third-parties",
      number: 5,
      title: "5. Передача данных и третьи лица",
      icon: Globe2,
      summary: "Платежные шлюзы, Telegram API и регламент взаимодействия",
      rawText: `Данные могут передаваться третьим лицам исключительно в рамках исполнения заказа: платежным системам (ЮKassa, Telegram Pay), сервисам доставки и Telegram Bot API.`,
      content: (
        <div className="space-y-3 text-app-secondary leading-relaxed">
          <p>
            Передача персональных данных третьим лицам допускается исключительно в объеме, строго необходимом для исполнения заказа или по требованию законодательства:
          </p>
          <div className="p-3.5 bg-app-card border border-app-border rounded-xl space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <span><strong>Платежные агрегаторы (ЮKassa, Telegram Pay):</strong> обработка банковских платежей без сохранения номеров банковских карт на серверах Оператора.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <span><strong>Telegram Bot API:</strong> отправка служебных сообщений через официальные шлюзы мессенджера Telegram.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <span><strong>Курьерская служба:</strong> адрес и контактный телефон клиента для осуществления доставки заказа.</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "cookies",
      number: 6,
      title: "6. Cookies и хранение данных в браузере",
      icon: Cookie,
      summary: "Назначение Local Storage, сессий и порядок их очистки",
      rawText: `Приложение использует Local Storage и сессионные cookies для корзины, избранного, темы оформления и токенов авторизации. Пользователь может очистить данные в настройках браузера.`,
      content: (
        <div className="space-y-3 text-app-secondary">
          <p className="leading-relaxed">
            Приложение использует технологию <strong>Local Storage</strong> и сессионные cookies исключительно для базового функционирования витрины:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-app-surface border border-app-border rounded-xl">
              <span className="font-mono font-bold text-app-primary block mb-0.5">Корзина и избранное</span>
              <span className="text-app-muted">Сохраняет выбранные позиции до момента оформления заказа.</span>
            </div>
            <div className="p-2.5 bg-app-surface border border-app-border rounded-xl">
              <span className="font-mono font-bold text-app-primary block mb-0.5">Тема оформления</span>
              <span className="text-app-muted">Запоминает выбор темного или светлого режима витрины.</span>
            </div>
            <div className="p-2.5 bg-app-surface border border-app-border rounded-xl">
              <span className="font-mono font-bold text-app-primary block mb-0.5">Токен авторизации</span>
              <span className="text-app-muted">Обеспечивает защищенный вход в панель управления заведением.</span>
            </div>
            <div className="p-2.5 bg-app-surface border border-app-border rounded-xl">
              <span className="font-mono font-bold text-app-primary block mb-0.5">История заказов</span>
              <span className="text-app-muted">Хранит локальный список последних заказов для отслеживания.</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "user-rights",
      number: 7,
      title: "7. Права пользователя и отзыв согласия",
      icon: UserCheck,
      summary: "Порядок получения выписки, изменения или полного удаления данных",
      rawText: `Пользователь имеет право отозвать согласие на обработку данных, запросить выписку или потребовать полного удаления учетной записи и истории заказов.`,
      content: (
        <div className="space-y-3 text-app-secondary">
          <p className="leading-relaxed">
            В соответствии со статьей 14 ФЗ-152 и положениями GDPR, каждый пользователь обладает следующими правами:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-app-secondary pl-1">
            <li>Получать достоверную информацию о сроках и способах обработки своих персональных данных;</li>
            <li>Требовать уточнения, блокирования или уничтожения неполных, устаревших или неточных данных;</li>
            <li>Отозвать согласие на обработку персональных данных в любой момент времени;</li>
            <li>Удалить локальную историю заказов и сохраненную корзину в настройках своего браузера.</li>
          </ul>
          <p className="text-xs text-app-muted leading-relaxed">
            Для полного удаления данных или отзыва согласия свяжитесь со службой поддержки заведения или направьте обращение по адресу <strong>privacy@tma-builder.app</strong>.
          </p>
        </div>
      )
    },
    {
      id: "contacts",
      number: 8,
      title: "8. Контакты и реквизиты оператора",
      icon: Mail,
      summary: "Контакты оператора, регламент и сроки обработки обращений",
      rawText: `Оператор: ${effectiveShopName}. Платформа: TMA Builder. Служба безопасности: privacy@tma-builder.app. Срок ответа на официальные запросы: до 10 рабочих дней.`,
      content: (
        <div className="space-y-3 text-app-secondary">
          <p className="leading-relaxed">
            По всем юридическим вопросам, предложениям, а также для реализации прав субъекта персональных данных вы можете обратиться:
          </p>
          <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-app-border pb-2">
              <span className="text-app-muted">Оператор заведения:</span>
              <span className="font-bold text-app-primary truncate max-w-[200px]">{effectiveShopName}</span>
            </div>
            <div className="flex items-center justify-between border-b border-app-border pb-2">
              <span className="text-app-muted">Платформа:</span>
              <span className="text-app-primary">TMA Builder (v2.6)</span>
            </div>
            <div className="flex items-center justify-between border-b border-app-border pb-2">
              <span className="text-app-muted">Дата редакции:</span>
              <span className="text-app-primary">{policyDate}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-app-muted">Служба безопасности:</span>
              <a
                href="mailto:privacy@tma-builder.app"
                className="text-emerald-400 hover:underline font-bold"
              >
                privacy@tma-builder.app
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-app-muted font-mono pt-1">
            <Clock size={13} className="text-app-muted shrink-0" />
            <span>Регламент рассмотрения обращений: до 10 рабочих дней с момента получения.</span>
          </div>
        </div>
      )
    }
  ], [effectiveShopName, policyDate]);

  // Search filtering logic
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase().trim();
    return sections.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.rawText.toLowerCase().includes(q)
    );
  }, [sections, searchQuery]);

  // Current active section data
  const currentSectionData = useMemo(() => {
    return sections.find(s => s.id === activeSection) || sections[0];
  }, [sections, activeSection]);

  const currentSectionIndex = sections.findIndex(s => s.id === activeSection);

  // Full policy copy as clean formatted text
  const handleCopyFullText = async () => {
    const fullText = `ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ И ОБРАБОТКИ ПЕРСОНАЛЬНЫХ ДАННЫХ
Оператор: ${effectiveShopName}
Платформа: TMA Builder
Дата публикации: ${policyDate}
Ссылка: ${fullPolicyUrl}

============================================================
${sections.map(s => `${s.title}\n\n${s.rawText}`).join("\n\n------------------------------------------------------------\n\n")}
============================================================
Служба безопасности: privacy@tma-builder.app
`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedFullText(true);
      setTimeout(() => setCopiedFullText(false), 2200);
    } catch {
      // Fallback
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          key="privacy-policy-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden font-sans pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]"
        >
          {/* Backdrop */}
          <motion.div
            key="privacy-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] cursor-pointer"
          />

          {/* Modal Panel */}
          <motion.div
            key="privacy-panel"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="w-full max-w-4xl max-h-[92dvh] sm:max-h-[88vh] h-[92dvh] sm:h-auto bg-app-modal border border-app-border rounded-2xl sm:rounded-3xl shadow-2xl relative z-[101] flex flex-col overflow-hidden text-app-primary my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-app-border bg-app-surface/90 backdrop-blur-md flex flex-col gap-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2
                        id="privacy-modal-title"
                        className="text-xs sm:text-base font-bold text-app-primary font-mono tracking-tight truncate"
                      >
                        Политика конфиденциальности
                      </h2>
                      <span className="px-2 py-0.5 bg-app-card border border-app-border rounded-full text-[10px] font-mono text-app-muted hidden sm:inline-block font-normal shrink-0">
                        ФЗ-152 / GDPR
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-app-muted font-sans truncate">
                      Защита персональных данных • {effectiveShopName}
                    </p>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {/* Search toggle */}
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer text-xs font-mono flex items-center gap-1 ${
                      isSearchOpen
                        ? "bg-app-accent text-app-accent-fg border-app-accent font-bold"
                        : "text-app-muted hover:text-app-primary bg-app-card border-app-border"
                    }`}
                    title="Поиск по политике"
                    aria-label="Поиск по политике"
                  >
                    <Search size={15} />
                  </button>

                  {/* Copy Link */}
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="p-2 text-app-muted hover:text-app-primary hover:bg-app-hover bg-app-card border border-app-border rounded-xl transition-all cursor-pointer hidden md:flex items-center gap-1 text-xs font-mono"
                    title="Скопировать ссылку на политику"
                    aria-label="Скопировать ссылку на политику"
                  >
                    {copiedLink ? <CheckCircle2 size={15} className="text-emerald-400" /> : <Copy size={15} />}
                    <span className="hidden lg:inline">{copiedLink ? "Скопировано" : "Ссылка"}</span>
                  </button>

                  {/* Copy Full Text */}
                  <button
                    type="button"
                    onClick={handleCopyFullText}
                    className="p-2 text-app-muted hover:text-app-primary hover:bg-app-hover bg-app-card border border-app-border rounded-xl transition-all cursor-pointer hidden lg:flex items-center gap-1 text-xs font-mono"
                    title="Скопировать полный текст документа"
                    aria-label="Скопировать полный текст"
                  >
                    {copiedFullText ? <CheckCircle2 size={15} className="text-emerald-400" /> : <FileCheck2 size={15} />}
                    <span>{copiedFullText ? "Текст скопирован" : "Текст"}</span>
                  </button>

                  {/* Print button */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="p-2 text-app-muted hover:text-app-primary hover:bg-app-hover bg-app-card border border-app-border rounded-xl transition-all cursor-pointer hidden sm:flex items-center gap-1 text-xs font-mono"
                    title="Распечатать или сохранить в PDF"
                    aria-label="Печать политики"
                  >
                    <Printer size={15} />
                  </button>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl text-app-muted hover:text-app-primary bg-app-card hover:bg-app-hover border border-app-border transition-colors cursor-pointer ml-1"
                    title="Закрыть"
                    aria-label="Закрыть окно"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Collapsible Search Input Bar */}
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="relative flex items-center">
                      <Search size={14} className="absolute left-3 text-app-muted pointer-events-none" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Поиск по разделам (например: cookie, телефон, удаление, ФЗ-152)..."
                        className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-20 py-2 text-xs text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-accent font-sans transition-colors"
                      />
                      {searchQuery && (
                        <div className="absolute right-2.5 flex items-center gap-2">
                          <span className="text-[10px] font-mono text-app-muted bg-app-surface px-1.5 py-0.5 rounded border border-app-border">
                            {filteredSections.length} {filteredSections.length === 1 ? "раздел" : "раздела"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="text-app-muted hover:text-app-primary text-xs cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mobile View Mode Switcher + Mobile Quick Chips */}
              <div className="flex md:hidden items-center justify-between gap-2 pt-0.5">
                {/* Horizontal Navigation Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar scrollbar-none py-0.5 flex-1 min-w-0 touch-scroll-x">
                  {sections.map(s => {
                    const isActive = activeSection === s.id && viewMode === "sections";
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setViewMode("sections");
                          handleSelectSection(s.id);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                          isActive
                            ? "bg-app-accent text-app-accent-fg border-app-accent font-bold shadow-sm"
                            : "bg-app-card text-app-muted border-app-border hover:text-app-primary"
                        }`}
                      >
                        § {s.number}
                      </button>
                    );
                  })}
                </div>

                {/* View Mode Toggle Button */}
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === "sections" ? "continuous" : "sections")}
                  className="px-2.5 py-1.5 bg-app-card hover:bg-app-hover border border-app-border rounded-lg text-[11px] font-mono text-app-secondary shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Переключить режим отображения"
                >
                  <Layers size={12} />
                  <span>{viewMode === "sections" ? "Весь текст" : "По главам"}</span>
                </button>
              </div>
            </div>

            {/* Main Body: Desktop 2-Column Split / Mobile Adaptive View */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
              {/* Left Navigation Menu (Desktop Sidebar) */}
              <div className="hidden md:flex md:col-span-4 border-r border-app-border bg-app-card/30 p-3 flex-col justify-between overflow-y-auto custom-scrollbar shrink-0 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-app-muted">
                      Оглавление документа
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewMode(viewMode === "sections" ? "continuous" : "sections")}
                      className="text-[10px] font-mono text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Layers size={11} />
                      <span>{viewMode === "sections" ? "Весь текст" : "По разделам"}</span>
                    </button>
                  </div>

                  {filteredSections.length === 0 ? (
                    <div className="p-4 text-center text-xs text-app-muted font-mono">
                      Ничего не найдено по запросу «{searchQuery}»
                    </div>
                  ) : (
                    filteredSections.map(s => {
                      const Icon = s.icon;
                      const isActive = activeSection === s.id && viewMode === "sections";
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setViewMode("sections");
                            handleSelectSection(s.id);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-2 cursor-pointer border ${
                            isActive
                              ? "bg-app-accent text-app-accent-fg border-app-accent font-bold shadow-sm"
                              : "border-transparent text-app-secondary hover:text-app-primary hover:bg-app-hover"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Icon
                              size={14}
                              className={isActive ? "text-app-accent-fg shrink-0" : "text-app-muted shrink-0"}
                            />
                            <span className="truncate">{s.title}</span>
                          </div>
                          <ChevronRight
                            size={13}
                            className={`shrink-0 transition-transform ${
                              isActive ? "text-app-accent-fg translate-x-0.5" : "text-app-muted/50"
                            }`}
                          />
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Sidebar Quick Legal Card */}
                <div className="p-3 bg-app-surface/60 border border-app-border rounded-xl space-y-1 text-[11px] font-mono text-app-muted">
                  <div className="flex items-center justify-between text-app-primary font-medium">
                    <span>Стандарт защиты:</span>
                    <span className="text-emerald-400">ФЗ-152 РФ</span>
                  </div>
                  <div>Редакция от: {policyDate}</div>
                </div>
              </div>

              {/* Right Content Area */}
              <div
                ref={contentContainerRef}
                className="md:col-span-8 p-4 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between text-xs sm:text-sm text-app-primary font-sans leading-relaxed"
              >
                {viewMode === "sections" ? (
                  /* Single Section Mode */
                  <div className="space-y-5">
                    {/* Section Header */}
                    <div className="border-b border-app-border pb-3.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-[10px] font-mono font-bold">
                          Раздел {currentSectionData.number} из {sections.length}
                        </span>
                        <span className="text-[11px] font-mono text-app-muted">
                          {effectiveShopName}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-lg font-bold text-app-primary font-mono tracking-tight">
                        {currentSectionData.title}
                      </h3>
                      <p className="text-xs text-app-muted font-sans mt-0.5">
                        {currentSectionData.summary}
                      </p>
                    </div>

                    {/* Section Content */}
                    <div className="text-xs sm:text-sm text-app-secondary animate-fade-in text-balance-wrap">
                      {currentSectionData.content}
                    </div>

                    {/* Step Navigation Controls */}
                    <div className="pt-5 border-t border-app-border flex items-center justify-between gap-2 text-xs font-mono mt-6">
                      {currentSectionIndex > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            const prevId = sections[currentSectionIndex - 1].id;
                            handleSelectSection(prevId);
                          }}
                          className="px-3 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-app-primary text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <ChevronLeft size={13} />
                          <span>Назад</span>
                        </button>
                      ) : (
                        <div />
                      )}

                      <div className="flex items-center gap-2">
                        {currentSectionIndex < sections.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => {
                              const nextId = sections[currentSectionIndex + 1].id;
                              handleSelectSection(nextId);
                            }}
                            className="px-3.5 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-app-primary text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <span>Далее: § {sections[currentSectionIndex + 1].number}</span>
                            <ChevronRight size={13} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-1.5 bg-app-accent text-app-accent-fg font-bold rounded-xl text-xs font-mono hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                          >
                            Ознакомлен
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Continuous Full Document Mode */
                  <div className="space-y-8 print-readable">
                    <div className="border-b border-app-border pb-4">
                      <h3 className="text-base sm:text-xl font-bold font-mono text-app-primary">
                        Полный текст Политики конфиденциальности
                      </h3>
                      <p className="text-xs text-app-muted mt-1">
                        Оператор: {effectiveShopName} • Действует с {policyDate}
                      </p>
                    </div>

                    {filteredSections.map(s => (
                      <div key={s.id} id={`section-${s.id}`} className="space-y-3 pt-2">
                        <div className="flex items-center gap-2 border-b border-app-border/70 pb-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <h4 className="font-mono font-bold text-sm sm:text-base text-app-primary">
                            {s.title}
                          </h4>
                        </div>
                        <div className="text-xs sm:text-sm text-app-secondary leading-relaxed pl-1 sm:pl-2">
                          {s.content}
                        </div>
                      </div>
                    ))}

                    <div className="pt-4 border-t border-app-border flex justify-end">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 bg-app-accent text-app-accent-fg font-bold rounded-xl text-xs font-mono cursor-pointer hover:opacity-90 shadow-sm"
                      >
                        Закрыть документ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Footer Note (Universal across desktop and mobile) */}
            <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-app-surface border-t border-app-border flex flex-wrap items-center justify-between gap-2.5 text-[11px] font-mono text-app-muted shrink-0">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate">ФЗ-152 • Защита персональных данных</span>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 bg-app-card hover:bg-app-hover border border-app-border rounded-lg text-app-secondary hover:text-app-primary transition-colors cursor-pointer flex md:hidden items-center gap-1 text-[10px]"
                >
                  <Copy size={11} />
                  <span>{copiedLink ? "Скопировано" : "Ссылка"}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1 bg-app-card hover:bg-app-hover border border-app-border rounded-lg text-app-primary transition-colors cursor-pointer text-[11px] font-medium"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
