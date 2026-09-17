import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Search,
  BookOpen,
  Sparkles,
  Bot,
  ShoppingBag,
  Truck,
  Gift,
  Music,
  Users,
  Code,
  Activity,
  Percent,
  CheckCircle2,
  Circle,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  ArrowLeft,
  Keyboard,
  Info,
  AlertTriangle,
  Lightbulb,
  CornerDownLeft,
  Flame,
} from "lucide-react";
import {
  DOC_ARTICLES,
  DOC_CATEGORIES,
  ONBOARDING_CHECKLIST,
  DocArticle,
} from "../data/documentationData";
import { Shop, Service, Order } from "../types";

export interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialArticleId?: string | null;
  onNavigateTab?: (tab: string) => void;
  shop?: Shop | null;
  services?: Service[];
  orders?: Order[];
  promocodes?: any[];
}

export const HelpCenterModal: React.FC<HelpCenterModalProps> = ({
  isOpen,
  onClose,
  initialArticleId = null,
  onNavigateTab,
  shop = null,
  services = [],
  orders = [],
  promocodes = [],
}) => {
  const [activeView, setActiveView] = useState<"search" | "articles" | "onboarding" | "hotkeys">("search");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedArticle, setSelectedArticle] = useState<DocArticle | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isAiResponding, setIsAiResponding] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("tma_onboarding_completed");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Parse delivery options
  const deliveryInfo = useMemo(() => {
    if (!shop) return { isSet: false, text: "Условия не настроены" };
    let opts: any = {};
    if (typeof shop.deliveryOptions === "string") {
      try {
        opts = JSON.parse(shop.deliveryOptions);
      } catch {}
    } else if (shop.deliveryOptions && typeof shop.deliveryOptions === "object") {
      opts = shop.deliveryOptions;
    }
    const hasAddress = Boolean(
      (shop.address && shop.address.trim().length > 0) ||
      (opts.pickupAddress && opts.pickupAddress.trim().length > 0)
    );
    const hasDeliveryMethods = opts.pickup !== false || Boolean(opts.courier) || Boolean(opts.shipping) || Number(opts.deliveryFee) > 0 || Number(opts.minOrder) > 0;
    const isSet = hasAddress || hasDeliveryMethods;

    let text = "Самовывоз и условия настроены";
    if (hasAddress) {
      text = `Адрес: ${shop.address || opts.pickupAddress}`;
    } else if (hasDeliveryMethods) {
      text = "Способы получения активны";
    } else {
      text = "Укажите адрес точки или условия доставки";
    }
    return { isSet, text };
  }, [shop]);

  // Real-time dynamic status computation for every onboarding step
  const realChecklistItems = useMemo(() => {
    const menuItemsCount = (services && services.length > 0)
      ? services.length
      : (shop?.services?.length || 0);

    const hasBot = Boolean(
      shop?.botToken ||
      shop?.hasBotToken ||
      shop?.isTelegramConnected ||
      shop?.adminChatId ||
      (typeof shop?.telegramSettings === "string" && shop.telegramSettings.length > 5) ||
      (shop?.telegramSettings && typeof shop.telegramSettings === "object" && Boolean((shop.telegramSettings as any).botToken))
    );

    const hasDelivery = deliveryInfo.isSet;

    const cashbackPct = shop?.cashbackPercent !== undefined && shop?.cashbackPercent !== null
      ? Number(shop.cashbackPercent)
      : 0;
    const hasPromos = Boolean(promocodes && promocodes.length > 0);
    const hasCashbackOrPromos = cashbackPct > 0 || hasPromos;

    const ordersCount = (orders && orders.length > 0)
      ? orders.length
      : (shop?._count?.orders || 0);
    const hasOrders = ordersCount > 0;

    return ONBOARDING_CHECKLIST.map((step) => {
      let isAutoDone = false;
      let liveBadge = "";
      let targetTab = "services";
      let actionName = "Инструкция";

      switch (step.id) {
        case "create-bot":
          isAutoDone = hasBot;
          liveBadge = hasBot ? "Бот подключен" : "Токен не подключен";
          targetTab = "settings";
          actionName = "Настройки бота";
          break;
        case "add-items":
          isAutoDone = menuItemsCount > 0;
          liveBadge = menuItemsCount > 0
            ? `В меню ${menuItemsCount} ${menuItemsCount === 1 ? "услуга" : menuItemsCount < 5 ? "услуги" : "услуг"}`
            : "0 позиций в каталоге";
          targetTab = "services";
          actionName = "Управление меню";
          break;
        case "configure-delivery":
          isAutoDone = hasDelivery;
          liveBadge = deliveryInfo.text;
          targetTab = "settings";
          actionName = "Настроить условия";
          break;
        case "setup-cashback":
          isAutoDone = hasCashbackOrPromos;
          liveBadge = cashbackPct > 0
            ? `Кэшбэк ${cashbackPct}% активен`
            : hasPromos
            ? `Промокодов: ${promocodes?.length}`
            : "Бонусы выключены";
          targetTab = hasPromos ? "promocodes" : "settings";
          actionName = "Настроить кэшбэк";
          break;
        case "test-order":
          isAutoDone = hasOrders;
          liveBadge = hasOrders
            ? `Оформлено ${ordersCount} ${ordersCount === 1 ? "заказ" : ordersCount < 5 ? "заказа" : "заказов"}`
            : "Заказов пока не поступало";
          targetTab = "botsim";
          actionName = "Симулятор бота";
          break;
        default:
          isAutoDone = false;
          liveBadge = "";
          targetTab = "services";
          actionName = "Перейти";
      }

      // Done if auto-detected by real store data OR manually marked by user
      const isDone = isAutoDone || completedSteps.includes(step.id);

      return {
        ...step,
        isDone,
        isAutoDone,
        liveBadge,
        targetTab,
        actionName,
      };
    });
  }, [shop, services, orders, promocodes, completedSteps, deliveryInfo]);

  const completedCount = useMemo(() => {
    return realChecklistItems.filter((i) => i.isDone).length;
  }, [realChecklistItems]);

  const progressPercent = useMemo(() => {
    return Math.round((completedCount / ONBOARDING_CHECKLIST.length) * 100);
  }, [completedCount]);

  // Set initial article if provided
  useEffect(() => {
    if (initialArticleId) {
      const art = DOC_ARTICLES.find((a) => a.id === initialArticleId);
      if (art) {
        setSelectedArticle(art);
        setActiveView("articles");
      }
    }
  }, [initialArticleId, isOpen]);

  // Focus search when opening search view
  useEffect(() => {
    if (isOpen && activeView === "search") {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, activeView]);

  // Handle outside escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedArticle) {
          setSelectedArticle(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, selectedArticle, onClose]);

  // Toggle checklist step
  const toggleStep = (stepId: string) => {
    setCompletedSteps((prev) => {
      const next = prev.includes(stepId)
        ? prev.filter((id) => id !== stepId)
        : [...prev, stepId];
      try {
        localStorage.setItem("tma_onboarding_completed", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filtered articles
  const filteredArticles = useMemo(() => {
    let list = DOC_ARTICLES;
    if (selectedCategory !== "all") {
      list = list.filter((a) => a.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)) ||
          a.aiQuickAnswer.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedCategory, searchQuery]);

  // AI synthesized result based on query
  const aiAnswer = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return null;
    const q = searchQuery.toLowerCase().trim();

    // Match best article
    const bestMatch = DOC_ARTICLES.find(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)) ||
        a.aiQuickAnswer.toLowerCase().includes(q)
    );

    if (bestMatch) {
      return {
        article: bestMatch,
        summary: bestMatch.aiQuickAnswer,
        steps: bestMatch.keySteps.slice(0, 3),
      };
    }

    // Default synthesis if no strict match
    return {
      article: DOC_ARTICLES[0],
      summary: `По запросу «${searchQuery}» рекомендуется проверить настройки в соответствующем разделе панели управления или обратиться к полному списку статей базы знаний.`,
      steps: [
        {
          title: "Проверьте раздел в меню",
          description: "Большинство параметров (доставка, бот, меню, кэшбэк) настраиваются в один клик в боковом меню.",
        },
      ],
    };
  }, [searchQuery]);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "Bot":
        return <Bot size={16} />;
      case "ShoppingBag":
        return <ShoppingBag size={16} />;
      case "Truck":
        return <Truck size={16} />;
      case "Gift":
        return <Gift size={16} />;
      case "Music":
        return <Music size={16} />;
      case "Users":
        return <Users size={16} />;
      case "Code":
        return <Code size={16} />;
      case "Activity":
        return <Activity size={16} />;
      case "Percent":
        return <Percent size={16} />;
      default:
        return <BookOpen size={16} />;
    }
  };

  const quickSuggestions = [
    { label: "Создать бота в @BotFather", query: "botfather токен" },
    { label: "Кэшбэк и бонусы", query: "кэшбэк бонусы" },
    { label: "Настройка доставки и курьера", query: "доставка курьер" },
    { label: "Стоп-лист и блюда", query: "меню стоп лист" },
    { label: "Команда и роли в Telegram", query: "сотрудники роли" },
    { label: "Фоновая музыка", query: "музыка радио" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 md:p-5 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="w-full max-w-4xl bg-app-surface border border-app-border rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[90vh] overflow-hidden text-app-primary"
      >
        {/* Top Header Bar */}
        <div className="px-3.5 sm:px-5 py-3 sm:py-4 border-b border-app-border flex items-center justify-between gap-2.5 sm:gap-4 bg-app-card/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
              <Sparkles size={17} className="sm:w-[19px] sm:h-[19px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-xs sm:text-sm md:text-base font-bold font-mono tracking-tight truncate">
                  Центр помощи & GitBook AI
                </h3>
                <span className="hidden xs:inline-flex px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-full shrink-0">
                  Docs v2.9
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-app-muted font-sans truncate">
                Пошаговые гайды, быстрый AI-поиск по базе знаний и инструкции
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <a
              href="https://docs.gitbook.com"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary rounded-xl text-xs font-mono transition-colors"
              title="Открыть базу знаний на GitBook в новой вкладке"
            >
              <BookOpen size={13} />
              <span>GitBook</span>
              <ExternalLink size={11} className="opacity-60" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-app-muted hover:text-app-primary hover:bg-app-hover rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* View Navigation Tabs */}
        <div className="px-3 sm:px-5 py-2.5 border-b border-app-border bg-app-card/30 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth shrink-0 min-h-[48px]">
          <button
            type="button"
            onClick={() => {
              setActiveView("search");
              setSelectedArticle(null);
            }}
            className={`h-9 px-3.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none shrink-0 whitespace-nowrap border ${
              activeView === "search" && !selectedArticle
                ? "bg-app-surface border-indigo-500/50 text-indigo-500 dark:text-indigo-400 shadow-xs ring-1 ring-indigo-500/20 font-bold"
                : "bg-transparent border-transparent text-app-muted hover:text-app-primary hover:bg-app-hover/60"
            }`}
          >
            <Search size={14} className="shrink-0" />
            <span>AI-Поиск</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView("articles");
            }}
            className={`h-9 px-3.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none shrink-0 whitespace-nowrap border ${
              activeView === "articles" || selectedArticle
                ? "bg-app-surface border-indigo-500/50 text-indigo-500 dark:text-indigo-400 shadow-xs ring-1 ring-indigo-500/20 font-bold"
                : "bg-transparent border-transparent text-app-muted hover:text-app-primary hover:bg-app-hover/60"
            }`}
          >
            <BookOpen size={14} className="shrink-0" />
            <span>База знаний ({DOC_ARTICLES.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView("onboarding");
              setSelectedArticle(null);
            }}
            className={`h-9 px-3.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none shrink-0 whitespace-nowrap border ${
              activeView === "onboarding"
                ? "bg-app-surface border-emerald-500/50 text-emerald-500 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/20 font-bold"
                : "bg-transparent border-transparent text-app-muted hover:text-app-primary hover:bg-app-hover/60"
            }`}
          >
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            <span>Чек-лист запуска</span>
            <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full shrink-0">
              {completedCount}/{ONBOARDING_CHECKLIST.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView("hotkeys");
              setSelectedArticle(null);
            }}
            className={`h-9 px-3.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none shrink-0 whitespace-nowrap border ${
              activeView === "hotkeys"
                ? "bg-app-surface border-indigo-500/50 text-indigo-500 dark:text-indigo-400 shadow-xs ring-1 ring-indigo-500/20 font-bold"
                : "bg-transparent border-transparent text-app-muted hover:text-app-primary hover:bg-app-hover/60"
            }`}
          >
            <Keyboard size={14} className="shrink-0" />
            <span>Горячие клавиши</span>
          </button>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-5 space-y-4 sm:space-y-5">
          {/* ARTICLE DETAIL VIEW */}
          {selectedArticle ? (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-between gap-3 border-b border-app-border pb-3">
                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  className="flex items-center gap-1.5 text-xs font-mono text-app-muted hover:text-app-primary transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Назад ко всем гайдам</span>
                </button>

                <div className="flex items-center gap-2 text-xs font-mono text-app-muted">
                  <span className="px-2.5 py-0.5 bg-app-card border border-app-border rounded-lg">
                    {selectedArticle.categoryLabel}
                  </span>
                  <span>⏱ {selectedArticle.readTime}</span>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold font-mono tracking-tight text-app-primary mb-2">
                  {selectedArticle.title}
                </h2>
                <p className="text-xs text-app-muted leading-relaxed font-sans">
                  {selectedArticle.summary}
                </p>
              </div>

              {/* AI Summary Highlight Card */}
              <div className="p-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/5 border border-indigo-500/20 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  <Sparkles size={14} />
                  <span>Краткая выжимка (AI Quick Summary)</span>
                </div>
                <p className="text-xs text-app-primary leading-relaxed">
                  {selectedArticle.aiQuickAnswer}
                </p>
              </div>

              {/* Step by Step Breakdown */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-app-muted">
                  Пошаговый процесс
                </h4>

                <div className="space-y-3.5">
                  {selectedArticle.keySteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-app-card border border-app-border rounded-2xl space-y-2.5"
                    >
                      <h5 className="font-mono font-bold text-sm text-app-primary">
                        {step.title}
                      </h5>
                      <p className="text-xs text-app-secondary leading-relaxed whitespace-pre-line font-sans">
                        {step.description}
                      </p>

                      {step.code && (
                        <div className="flex items-center justify-between p-2.5 bg-app-surface border border-app-border rounded-xl font-mono text-xs">
                          <code className="text-indigo-500 dark:text-indigo-400 font-semibold truncate select-all">
                            {step.code}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopy(step.code!)}
                            className="p-1.5 hover:bg-app-hover text-app-muted hover:text-app-primary rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                            title="Скопировать"
                          >
                            {copiedCode === step.code ? (
                              <Check size={14} className="text-emerald-500" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      )}

                      {step.tip && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                          <Lightbulb size={15} className="shrink-0 mt-0.5 text-emerald-500" />
                          <span className="leading-snug">{step.tip}</span>
                        </div>
                      )}

                      {step.warning && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
                          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-500" />
                          <span className="leading-snug">{step.warning}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags and Footer */}
              <div className="pt-4 border-t border-app-border flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedArticle.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-app-card border border-app-border text-app-muted text-[10px] font-mono rounded-lg"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <a
                  href={`https://docs.gitbook.com`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-mono text-app-primary hover:underline font-semibold"
                >
                  <span>Открыть в пространстве GitBook</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ) : activeView === "search" ? (
            /* SEARCH & AI ASSISTANT VIEW */
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Search Bar */}
              <div className="flex items-center gap-3 px-4 py-3 bg-app-card border border-app-border rounded-2xl focus-within:border-app-border focus-within:ring-1 focus-within:ring-app-border transition-all shadow-2xs">
                <Search
                  size={18}
                  className="text-app-muted shrink-0"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Задайте вопрос: например, 'как создать бота' или 'настроить кэшбэк'..."
                  className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 font-mono text-xs sm:text-sm text-app-primary placeholder:text-app-muted p-0"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="p-1 text-app-muted hover:text-app-primary hover:bg-app-hover rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Очистить поиск"
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <kbd className="px-2 py-0.5 bg-app-surface border border-app-border text-app-muted font-mono text-[10px] rounded-md shadow-2xs shrink-0 pointer-events-none">
                    ESC
                  </kbd>
                )}
              </div>

              {/* Quick Suggestion Chips */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-app-muted">
                  <Flame size={13} className="text-amber-500" />
                  <span>Популярные запросы:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSearchQuery(item.query)}
                      className="px-2.5 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-secondary hover:text-app-primary text-xs font-mono rounded-xl transition-all cursor-pointer select-none text-left"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Instant Answer Widget */}
              {aiAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-app-card border border-indigo-500/25 rounded-3xl space-y-3.5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      <Sparkles size={15} />
                      <span>Ответ GitBook AI</span>
                    </div>
                    <span className="text-[10px] font-mono text-app-muted bg-app-surface/80 px-2 py-0.5 rounded-full border border-app-border">
                      Мгновенный синтез
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-app-primary font-sans leading-relaxed">
                    {aiAnswer.summary}
                  </p>

                  {/* Key Action Steps from AI */}
                  {aiAnswer.steps && aiAnswer.steps.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-indigo-500/15">
                      <div className="text-[11px] font-mono font-bold text-app-secondary uppercase tracking-wider">
                        Ключевые действия:
                      </div>
                      <div className="space-y-2">
                        {aiAnswer.steps.map((st, i) => (
                          <div
                            key={i}
                            className="p-2.5 bg-app-surface/90 border border-app-border/80 rounded-xl text-xs space-y-1"
                          >
                            <div className="font-mono font-bold text-app-primary">
                              {st.title}
                            </div>
                            <div className="text-[11px] text-app-muted font-sans">
                              {st.description}
                            </div>
                            {st.code && (
                              <code className="block mt-1 p-1 bg-app-card text-indigo-500 font-mono text-[11px] rounded">
                                {st.code}
                              </code>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiAnswer.article && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedArticle(aiAnswer.article)}
                        className="px-4 py-2 bg-app-primary hover:opacity-90 text-app-surface rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 group"
                      >
                        <Sparkles size={13} className="shrink-0 group-hover:rotate-12 transition-transform" />
                        <span className="font-bold">Читать полный гайд</span>
                        <ChevronRight size={14} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Matching Documentation Guides List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-app-muted">
                  <span>Статьи по теме ({filteredArticles.length})</span>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-app-accent hover:underline cursor-pointer"
                    >
                      Сбросить поиск
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredArticles.map((article) => (
                    <div
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className="p-4 bg-app-card hover:bg-app-hover border border-app-border hover:border-app-border rounded-2xl space-y-2 cursor-pointer transition-all duration-150 group shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 bg-app-surface border border-app-border text-app-muted text-[10px] font-mono rounded-lg">
                          {article.categoryLabel}
                        </span>
                        <span className="text-[10px] font-mono text-app-muted">
                          ⏱ {article.readTime}
                        </span>
                      </div>

                      <h4 className="font-mono font-bold text-xs text-app-primary transition-colors line-clamp-2">
                        {article.title}
                      </h4>

                      <p className="text-[11px] text-app-muted line-clamp-2 leading-relaxed font-sans">
                        {article.summary}
                      </p>

                      <div className="pt-1 flex items-center gap-1 text-[11px] font-mono text-app-primary font-semibold">
                        <span>Открыть инструкцию</span>
                        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeView === "articles" ? (
            /* ALL ARTICLES / KNOWLEDGE BASE DIRECTORY */
            <div className="space-y-5">
              {/* Category selector pills */}
              <div className="flex flex-wrap items-center gap-2">
                {DOC_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                      selectedCategory === cat.id
                        ? "bg-app-primary text-app-surface shadow-xs font-bold"
                        : "bg-app-card hover:bg-app-hover border border-app-border text-app-secondary"
                    }`}
                  >
                    {getCategoryIcon(cat.icon)}
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Grid of articles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredArticles.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => setSelectedArticle(article)}
                    className="p-4 bg-app-card hover:bg-app-hover border border-app-border hover:border-app-primary/40 rounded-2xl flex flex-col justify-between gap-3 cursor-pointer transition-all duration-150 group shadow-2xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 bg-app-surface border border-app-border text-app-muted text-[10px] font-mono rounded-lg">
                          {article.categoryLabel}
                        </span>
                        <span className="text-[10px] font-mono text-app-muted">
                          ⏱ {article.readTime}
                        </span>
                      </div>

                      <h4 className="font-mono font-bold text-xs text-app-primary transition-colors line-clamp-2">
                        {article.title}
                      </h4>

                      <p className="text-[11px] text-app-muted line-clamp-3 leading-relaxed font-sans">
                        {article.summary}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-app-border/60 flex items-center justify-between text-xs font-mono">
                      <span className="text-[10px] text-app-muted">
                        {article.keySteps.length} шагов
                      </span>
                      <span className="text-app-primary font-bold flex items-center gap-0.5">
                        <span>Читать</span>
                        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeView === "onboarding" ? (
            /* ONBOARDING CHECKLIST VIEW */
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="p-5 bg-gradient-to-br from-emerald-500/10 via-app-card to-app-card border border-emerald-500/20 rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={18} />
                    <span>Чек-лист запуска заведения в Telegram</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    {progressPercent}% готово
                  </span>
                </div>

                <div className="w-full bg-app-surface h-2.5 rounded-full overflow-hidden border border-app-border">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${progressPercent}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-app-muted font-sans">
                  <span>Выполните эти 5 шагов для полного запуска онлайн-заказов в Telegram Mini App.</span>
                  <span className="font-mono font-semibold text-app-primary shrink-0 ml-2">
                    {completedCount} из {ONBOARDING_CHECKLIST.length} завершено
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {realChecklistItems.map((step, idx) => {
                  const linkedArticle = DOC_ARTICLES.find((a) => a.id === step.articleId);

                  return (
                    <div
                      key={step.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                        step.isDone
                          ? "bg-app-card/60 border-emerald-500/20 shadow-2xs"
                          : "bg-app-card border-app-border hover:border-app-primary/40 shadow-2xs"
                      }`}
                    >
                      <div
                        onClick={() => toggleStep(step.id)}
                        className="flex items-start gap-3 flex-1 cursor-pointer select-none"
                      >
                        <button
                          type="button"
                          className="mt-0.5 text-app-primary shrink-0 transition-transform active:scale-90"
                        >
                          {step.isDone ? (
                            <CheckCircle2 size={20} className="text-emerald-500 fill-emerald-500/20" />
                          ) : (
                            <Circle size={20} className="text-app-muted" />
                          )}
                        </button>

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4
                              className={`font-mono text-xs font-bold ${
                                step.isDone ? "text-app-primary" : "text-app-primary"
                              }`}
                            >
                              {idx + 1}. {step.title}
                            </h4>

                            {step.liveBadge && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium ${
                                  step.isAutoDone
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    : step.isDone
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    : "bg-app-surface text-app-muted border border-app-border"
                                }`}
                              >
                                {step.isDone ? <Check size={10} strokeWidth={3} /> : <Info size={10} />}
                                <span>{step.liveBadge}</span>
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-app-muted font-sans leading-relaxed">
                            {step.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {onNavigateTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateTab(step.targetTab)}
                            className="px-2.5 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-[11px] font-mono text-app-primary font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            title={`Перейти: ${step.actionName}`}
                          >
                            <span>{step.actionName}</span>
                            <ChevronRight size={12} />
                          </button>
                        )}

                        {linkedArticle && (
                          <button
                            type="button"
                            onClick={() => setSelectedArticle(linkedArticle)}
                            className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <BookOpen size={12} />
                            <span>Гайд</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* HOTKEYS VIEW */
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="flex items-center gap-3 p-4 bg-app-card border border-app-border rounded-2xl">
                <div className="w-9 h-9 rounded-xl bg-app-surface border border-app-border text-app-primary flex items-center justify-center">
                  <Keyboard size={18} />
                </div>
                <div>
                  <h4 className="font-mono font-bold text-xs text-app-primary">
                    Управление панелью администратора с клавиатуры
                  </h4>
                  <p className="text-[11px] text-app-muted font-sans">
                    Используйте сочетания клавиш для моментальной навигации без мыши
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <h5 className="text-[11px] font-bold font-mono text-app-muted uppercase tracking-wider mb-2.5">
                    Навигация по разделам
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Меню и услуги</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">
                        Alt + 1
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Заказы</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">
                        Alt + 2
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Промокоды</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">
                        Alt + 3
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Отзывы</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">
                        Alt + 4
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Аналитика</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">
                        Alt + 5
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Рассылки</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">
                        Alt + 6
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Баннеры</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">
                        Alt + 7
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Настройки заведения</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">
                        Alt + 8
                      </kbd>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-[11px] font-bold font-mono text-app-muted uppercase tracking-wider mb-2.5">
                    Глобальные действия
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Открыть Центр помощи</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-indigo-500 font-bold">
                        ? или Shift + /
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Закрыть модалку</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-muted font-bold">
                        ESC
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Status Bar */}
        <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 border-t border-app-border bg-app-card/40 flex items-center justify-between gap-2.5 text-[11px] font-mono text-app-muted shrink-0 min-h-[44px]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">GitBook Knowledge Base</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline">Клавиша <kbd className="px-1.5 py-0.5 bg-app-surface border border-app-border rounded text-[10px]">?</kbd> открывает справку</span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary rounded-lg transition-colors cursor-pointer text-xs font-mono"
            >
              Закрыть
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
