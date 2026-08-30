import React from "react";
import {
  Settings,
  AlertCircle,
  Check,
  RefreshCw,
  ImageIcon,
  Smartphone,
  ChevronDown,
  QrCode,
  Store,
  CreditCard,
  Truck,
  Share2,
  Send,
  Trash2,
  RotateCcw,
  Undo2,
  Bot,
  ExternalLink,
  Github,
  ShieldCheck,
  Bug,
  HelpCircle,
  Music,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ImageUploader from "../ImageUploader";
import { SpinnerLoader } from "../Skeleton";
import { cleanSlugForSubmit, transliterateToSlug } from "../../lib/validation";
import { AdminMusicSettingsSection } from "./AdminMusicSettingsSection";
import { AdminTelegramIntegrationTab } from "./AdminTelegramIntegrationTab";
import { CustomCheckbox } from "../CustomCheckbox";
import { parseMusicSettings } from "../../types";

interface AdminSettingsTabProps {
  selectedShop: any;
  shops: any[];
  settingsData: {
    name: string;
    slug: string;
    description: string;
    phone: string;
    address: string;
    workingHours: string;
    isOpen: boolean;
    logoUrl: string;
    bannerUrl: string;
    currency: string;
    currencySymbol: string;
    cashbackPercent: number | string;
    paymentInstructions: string;
    socialLinks: {
      telegram: string;
      instagram: string;
      whatsapp: string;
      vk: string;
      website: string;
    };
    deliveryOptions: {
      pickup: boolean;
      courier: boolean;
      shipping: boolean;
      minOrder: string | number;
      deliveryFee: string | number;
    };
    botToken: string;
    adminChatId: string;
    telegramBotToken?: string;
    telegramChatId?: string;
    musicSettings?: any;
  };
  setSettingsData: React.Dispatch<React.SetStateAction<any>>;
  settingsError: string | null;
  settingsSuccess: string | null;
  isSavingSettings: boolean;
  handleSaveSettings: (e: React.FormEvent) => void;
  handleDeleteShop: (shop: any) => void;
  handleRegenerateSlug: () => void;
  setIsQrModalOpen: (open: boolean) => void;
  requestConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string,
    isDangerous?: boolean
  ) => void;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
  // Bot & Sub-tabs handlers
  settingsActiveTab?: "general" | "branding" | "currency" | "delivery" | "social" | "telegram" | "music";
  setSettingsActiveTab?: (tab: "general" | "branding" | "currency" | "delivery" | "social" | "telegram" | "music") => void;
  handleClearSettingsFields?: () => void;
  handleTestBotToken?: () => void;
  handleSetupWebhook?: () => void;
  handleSendTestNotification?: () => void;
  botTestResult?: { botInfo?: { id: number; first_name: string; username: string }; error?: string } | null;
  isTestingBot?: boolean;
  isSettingWebhook?: boolean;
  webhookStatus?: string | null;
  isSendingTestNotification?: boolean;
  onOpenReport?: () => void;
  isOwner?: boolean;
}

const CURRENCY_OPTIONS = [
  { code: "RUB", symbol: "₽", label: "RUB — Российский рубль (₽)", name: "Российский рубль" },
  { code: "USD", symbol: "$", label: "USD — Доллар США ($)", name: "Доллар США" },
  { code: "EUR", symbol: "€", label: "EUR — Евро (€)", name: "Евро" },
  { code: "KZT", symbol: "₸", label: "KZT — Казахстанский тенге (₸)", name: "Казахстанский тенге" },
  { code: "BYN", symbol: "Br", label: "BYN — Белорусский рубль (Br)", name: "Белорусский рубль" },
];

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  selectedShop,
  settingsData,
  setSettingsData,
  settingsError,
  settingsSuccess,
  isSavingSettings,
  handleSaveSettings,
  handleDeleteShop,
  handleRegenerateSlug,
  setIsQrModalOpen,
  requestConfirm,
  showToast,
  settingsActiveTab = "general",
  setSettingsActiveTab,
  handleClearSettingsFields,
  handleTestBotToken,
  handleSetupWebhook,
  handleSendTestNotification,
  botTestResult,
  isTestingBot,
  isSettingWebhook,
  webhookStatus,
  isSendingTestNotification,
  onOpenReport,
  isOwner = true,
}) => {
  const [activeSubTab, setActiveSubTab] = React.useState<
    "general" | "branding" | "currency" | "delivery" | "social" | "telegram"
  >(settingsActiveTab);

  const [isTgGuideOpen, setIsTgGuideOpen] = React.useState(false);
  const [backupSettingsData, setBackupSettingsData] = React.useState<any | null>(null);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = React.useState(false);
  const [isSlugCustomized, setIsSlugCustomized] = React.useState(false);
  const currencyDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (selectedShop) {
      const isTranslit = cleanSlugForSubmit(selectedShop.slug) === cleanSlugForSubmit(transliterateToSlug(selectedShop.name));
      setIsSlugCustomized(!isTranslit);
    }
  }, [selectedShop?.id]);

  const handleRestoreNameSlug = () => {
    const autoSlug = cleanSlugForSubmit(transliterateToSlug(settingsData.name));
    setIsSlugCustomized(false);
    setSettingsData((s: any) => ({ ...s, slug: autoSlug }));
    showToast(`Восстановлен URL из названия: /${autoSlug || "slug"}`, "info");
  };

  const handleRegenerateClick = () => {
    setIsSlugCustomized(true);
    handleRegenerateSlug();
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(e.target as Node)) {
        setIsCurrencyDropdownOpen(false);
      }
    };
    if (isCurrencyDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCurrencyDropdownOpen]);

  const handleResetWithBackup = () => {
    // Save current checkpoint before clearing
    const currentBackup = JSON.parse(JSON.stringify(settingsData));
    setBackupSettingsData(currentBackup);

    if (handleClearSettingsFields) {
      handleClearSettingsFields();
    } else {
      // Direct reset fallback according to active subtab
      setSettingsData((prev: any) => {
        const copy = { ...prev };
        if (activeSubTab === "general") {
          copy.description = "";
          copy.workingHours = "";
          copy.address = "";
          copy.phone = "";
        } else if (activeSubTab === "branding") {
          copy.logoUrl = "";
          copy.bannerUrl = "";
        } else if (activeSubTab === "telegram") {
          copy.botToken = "";
          copy.adminChatId = "";
        } else if (activeSubTab === "social" || activeSubTab === "delivery") {
          copy.paymentInstructions = "";
          copy.socialLinks = { telegram: "", instagram: "", whatsapp: "", vk: "", website: "" };
        }
        return copy;
      });
      if (showToast) {
        showToast("Дополнительные поля текущей секции очищены", "warning");
      }
    }
  };

  const handleUndoReset = () => {
    if (backupSettingsData) {
      setSettingsData(backupSettingsData);
      setBackupSettingsData(null);
      if (showToast) {
        showToast("Сброс полей отменен, данные восстановлены", "info");
      }
    }
  };

  const changeSubTab = (tab: "general" | "branding" | "currency" | "delivery" | "social" | "telegram" | "music") => {
    setActiveSubTab(tab);
    if (setSettingsActiveTab) setSettingsActiveTab(tab);
  };

  const botToken = settingsData.botToken || settingsData.telegramBotToken || "";
  const adminChatId = settingsData.adminChatId || settingsData.telegramChatId || "";

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header & Sub-tabs */}
      <div className="bg-app-surface border border-app-border rounded-2xl p-4 sm:p-5 text-app-primary shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-app-border pb-3.5">
          <div>
            <h3 className="text-sm font-bold font-mono flex items-center gap-2 text-app-primary">
              <Settings size={16} className="text-app-muted" />
              Настройки заведения: {selectedShop.name}
            </h3>
            <p className="text-xs text-app-muted mt-0.5 font-sans">
              Управление брендингом, правилами доставки, музыкой, реквизитами и Telegram ботом
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="px-3 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <QrCode size={14} className="text-app-primary" />
              <span>QR-Код</span>
            </button>
            {handleClearSettingsFields && (
              <button
                type="button"
                onClick={handleResetWithBackup}
                className="px-3 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Очистить доп. поля текущей секции"
              >
                <RotateCcw size={13} className="text-app-primary" />
                <span>Сбросить поля</span>
              </button>
            )}
            {Boolean(backupSettingsData) && (
              <button
                type="button"
                onClick={handleUndoReset}
                className="px-3.5 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 animate-fade-in shrink-0"
                title="Отменить сброс и восстановить сохраненные поля"
              >
                <Undo2 size={14} strokeWidth={2.5} className="text-app-muted" />
                <span>Отмена</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-tab Navigation Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 font-mono text-xs">
          {[
            { id: "general", label: "Основное", icon: Store },
            { id: "branding", label: "Брендинг", icon: ImageIcon },
            { id: "music", label: "Музыка и Плейлист", icon: Music },
            { id: "currency", label: "Оплата и Валюта", icon: CreditCard },
            { id: "delivery", label: "Доставка", icon: Truck },
            { id: "social", label: "Контакты и Соцсети", icon: Share2 },
            { id: "telegram", label: "Telegram Бот", icon: Bot },
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => changeSubTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-app-accent text-app-accent-fg shadow-sm"
                    : "bg-app-card border border-app-border text-app-muted hover:text-app-primary"
                }`}
              >
                <IconComponent size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      {settingsError && (
        <div className="p-3.5 bg-app-card border border-app-border text-app-primary rounded-xl text-xs flex items-center justify-between gap-2.5 font-mono font-medium shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle size={15} className="shrink-0 text-app-muted" />
            <span className="truncate">{settingsError}</span>
          </div>
        </div>
      )}

      {settingsSuccess && (
        <div className="p-3.5 bg-app-card border border-app-border text-app-primary rounded-xl text-xs flex items-center justify-between gap-2.5 font-mono font-medium shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <Check size={15} className="shrink-0 text-app-primary" />
            <span className="truncate">{settingsSuccess}</span>
          </div>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSaveSettings} noValidate className="bg-app-surface border border-app-border rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
        {/* SUBTAB: GENERAL */}
        {activeSubTab === "general" && (
          <div className="space-y-5 font-sans text-xs">
            <h4 className="text-xs font-bold font-mono text-app-primary uppercase tracking-wider flex items-center gap-2 border-b border-app-border pb-3">
              <Store size={16} className="text-app-muted" />
              Основная информация и режим работы
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Название заведения *
                </label>
                <input
                  type="text"
                  value={settingsData.name}
                  onChange={(e) => {
                    const nameVal = e.target.value;
                    const autoSlug = cleanSlugForSubmit(transliterateToSlug(nameVal));

                    setSettingsData((s: any) => {
                      const prevAutoSlug = cleanSlugForSubmit(transliterateToSlug(s.name));
                      if (!isSlugCustomized || !s.slug || s.slug === prevAutoSlug) {
                        setIsSlugCustomized(false);
                        return { ...s, name: nameVal, slug: autoSlug };
                      }
                      return { ...s, name: nameVal };
                    });
                  }}
                  placeholder="Например: Барбершоп «Борода»"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5 font-mono text-[10px]">
                  <label className="block text-[11px] font-mono text-app-muted uppercase tracking-wider">
                    URL Slug (ссылка) *
                  </label>
                  <div className="flex items-center gap-2">
                    {(isSlugCustomized || (settingsData.slug && settingsData.name && settingsData.slug !== cleanSlugForSubmit(transliterateToSlug(settingsData.name)))) && (
                      <button
                        type="button"
                        onClick={handleRestoreNameSlug}
                        className="text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                        title="Вернуть автоматический URL из названия"
                      >
                        <RotateCcw size={10} />
                        <span>Из названия</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRegenerateClick}
                      className="text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                      title="Сгенерировать случайный уникальный URL"
                    >
                      <RefreshCw size={10} />
                      <span>Рандомный URL</span>
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={settingsData.slug}
                  onChange={(e) => {
                    const clean = cleanSlugForSubmit(e.target.value);
                    const autoSlug = cleanSlugForSubmit(transliterateToSlug(settingsData.name));
                    if (!clean || clean === autoSlug) {
                      setIsSlugCustomized(false);
                      setSettingsData((s: any) => ({ ...s, slug: autoSlug }));
                    } else {
                      setIsSlugCustomized(true);
                      setSettingsData((s: any) => ({ ...s, slug: clean }));
                    }
                  }}
                  placeholder="my-barbershop"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                Описание заведения
              </label>
              <textarea
                rows={3}
                value={settingsData.description}
                onChange={(e) =>
                  setSettingsData((s: any) => ({ ...s, description: e.target.value }))
                }
                placeholder="Краткое описание вашей компании для клиентов..."
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent resize-none font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Контактный телефон
                </label>
                <input
                  type="text"
                  value={settingsData.phone}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({ ...s, phone: e.target.value }))
                  }
                  placeholder="+7 (999) 000-00-00"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Режим работы
                </label>
                <input
                  type="text"
                  value={settingsData.workingHours}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({ ...s, workingHours: e.target.value }))
                  }
                  placeholder="Ежедневно с 10:00 до 22:00"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Физический адрес
                </label>
                <input
                  type="text"
                  value={settingsData.address}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({ ...s, address: e.target.value }))
                  }
                  placeholder="г. Москва, ул. Арбат, 10"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
                />
              </div>
            </div>

            {/* Accept Orders Toggle */}
            <div className="p-4 bg-app-card border border-app-border rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-mono font-bold text-xs text-app-primary">
                  Приём заказов клиентов
                </p>
                <p className="text-[11px] text-app-muted font-sans mt-0.5">
                  При отключении клиенты увидят предупреждение о временно приостановленном приеме
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settingsData.isOpen !== false}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({ ...s, isOpen: e.target.checked }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-800 border border-black/10 dark:border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-zinc-900 dark:peer-checked:bg-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-zinc-400 peer-checked:after:bg-white dark:peer-checked:after:bg-black after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm"></div>
              </label>
            </div>
          </div>
        )}

        {/* SUBTAB: BRANDING */}
        {activeSubTab === "branding" && (
          <div className="space-y-5 font-sans text-xs">
            <h4 className="text-xs font-bold font-mono text-app-primary uppercase tracking-wider flex items-center gap-2 border-b border-app-border pb-3">
              <ImageIcon size={16} className="text-app-muted" />
              Оформление, Аватар и Шапка
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[11px] font-mono text-app-muted uppercase tracking-wider">
                  Логотип / Аватар заведения
                </label>
                <ImageUploader
                  value={settingsData.logoUrl}
                  onChange={(url) => setSettingsData((s: any) => ({ ...s, logoUrl: url }))}
                  placeholder="Загрузите логотип заведения"
                />
                <p className="text-[10px] text-app-muted font-mono">
                  Рекомендуемый размер: квадратное изображение 400x400 px
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-mono text-app-muted uppercase tracking-wider">
                  Шапка / Обложка баннер
                </label>
                <ImageUploader
                  value={settingsData.bannerUrl}
                  onChange={(url) => setSettingsData((s: any) => ({ ...s, bannerUrl: url }))}
                  placeholder="Загрузите фоновый баннер"
                />
                <p className="text-[10px] text-app-muted font-mono">
                  Рекомендуемый размер: 1200x400 px
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: MUSIC & ATMOSPHERE */}
        {activeSubTab === "music" && (
          <AdminMusicSettingsSection
            musicSettings={parseMusicSettings(settingsData.musicSettings)}
            onChange={(newMusicSettings) =>
              setSettingsData((s: any) => ({
                ...s,
                musicSettings: newMusicSettings,
              }))
            }
            showToast={showToast}
          />
        )}

        {/* SUBTAB: CURRENCY & PAYMENT */}
        {activeSubTab === "currency" && (
          <div className="space-y-5 font-sans text-xs">
            <h4 className="text-xs font-bold font-mono text-app-primary uppercase tracking-wider flex items-center gap-2 border-b border-app-border pb-3">
              <CreditCard size={16} className="text-app-muted" />
              Валюта, Лояльность и Реквизиты оплаты
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative" ref={currencyDropdownRef}>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Код валюты
                </label>
                <button
                  type="button"
                  onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                  className={`w-full bg-app-card hover:bg-app-hover border ${
                    isCurrencyDropdownOpen ? "border-app-accent ring-1 ring-app-accent/30" : "border-app-border"
                  } rounded-xl px-3.5 py-2.5 text-xs text-app-primary flex items-center justify-between gap-2 transition-all cursor-pointer shadow-xs focus:outline-none`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-app-surface border border-app-border flex items-center justify-center text-[11px] font-mono font-bold text-app-primary shrink-0">
                      {settingsData.currencySymbol || "₽"}
                    </span>
                    <span className="truncate font-mono font-medium text-app-primary">
                      {CURRENCY_OPTIONS.find((c) => c.code === settingsData.currency)?.label ||
                        `${settingsData.currency} (${settingsData.currencySymbol || "₽"})`}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-app-muted shrink-0 transition-transform duration-200 ${
                      isCurrencyDropdownOpen ? "rotate-180 text-app-primary" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isCurrencyDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.12, ease: "easeOut" }}
                      className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-app-surface border border-app-border rounded-2xl shadow-xl p-1.5 overflow-hidden backdrop-blur-md"
                    >
                      <div className="space-y-0.5">
                        {CURRENCY_OPTIONS.map((c) => {
                          const isSelected = settingsData.currency === c.code;
                          return (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                setSettingsData((s: any) => ({
                                  ...s,
                                  currency: c.code,
                                  currencySymbol: c.symbol,
                                }));
                                setIsCurrencyDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-app-accent text-app-accent-fg font-semibold"
                                  : "text-app-secondary hover:text-app-primary hover:bg-app-card"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                                    isSelected
                                      ? "bg-black/15 text-app-accent-fg border border-white/20"
                                      : "bg-app-card text-app-primary border border-app-border"
                                  }`}
                                >
                                  {c.symbol}
                                </span>
                                <div className="truncate">
                                  <span className="font-bold">{c.code}</span>
                                  <span className={`ml-1.5 opacity-80 text-[11px]`}>— {c.name}</span>
                                </div>
                              </div>
                              {isSelected && <Check size={14} className="shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Символ валюты
                </label>
                <input
                  type="text"
                  value={settingsData.currencySymbol}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({ ...s, currencySymbol: e.target.value }))
                  }
                  placeholder="₽"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                />
              </div>
            </div>

            {/* Cashback / Bonus Program Switch */}
            <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono font-bold text-xs text-app-primary">Бонусная программа (Кэшбэк)</p>
                  <p className="text-[11px] text-app-muted mt-0.5 font-sans">
                    Начисление кэшбэка баллами с покупок для клиентов
                  </p>
                </div>
                <CustomCheckbox
                  checked={Number(settingsData.cashbackPercent) > 0}
                  onChange={(checked) => {
                    setSettingsData((s: any) => ({
                      ...s,
                      cashbackPercent: checked ? (Number(s.cashbackPercent) > 0 ? s.cashbackPercent : 5) : 0,
                    }));
                  }}
                  size="md"
                />
              </div>

              {Number(settingsData.cashbackPercent) > 0 ? (
                <div className="pt-3 border-t border-app-border grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                      Размер кэшбэка (%)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={settingsData.cashbackPercent}
                      onChange={(e) =>
                        setSettingsData((s: any) => ({
                          ...s,
                          cashbackPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                        }))
                      }
                      placeholder="5"
                      className="w-full bg-app-surface border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                    />
                  </div>
                  <div className="text-[11px] text-app-muted font-sans">
                    Плашка «Кэшбэк {settingsData.cashbackPercent}%» отображается на витрине и в корзине клиента.
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-app-muted font-sans">
                  Кэшбэк выключен. Плашки и начисление бонусов скрыты в интерфейсе покупателя.
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                Инструкция и реквизиты по оплате заказа
              </label>
              <textarea
                rows={4}
                value={settingsData.paymentInstructions}
                onChange={(e) =>
                  setSettingsData((s: any) => ({ ...s, paymentInstructions: e.target.value }))
                }
                placeholder="Например: Перевод по СБП на карту Т-Банк +7 (999) 000-00-00 (Иван И.). После оплаты пришлите чек в чат."
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent resize-none font-sans"
              />
            </div>
          </div>
        )}

        {/* SUBTAB: DELIVERY */}
        {activeSubTab === "delivery" && (
          <div className="space-y-5 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <h4 className="text-xs font-bold font-mono text-app-primary uppercase tracking-wider flex items-center gap-2">
                <Truck size={16} className="text-app-muted" />
                Способы доставки и самовывоз
              </h4>
            </div>

            {/* Master Toggle for Delivery */}
            <div className="p-4 bg-app-card border border-app-border rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-mono font-bold text-xs text-app-primary">Доставка и самовывоз</p>
                <p className="text-[11px] text-app-muted mt-0.5 font-sans">
                  Возможность клиентам выбирать доставку курьером или самовывоз
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsData.deliveryOptions?.enabled !== false && (settingsData.deliveryOptions?.pickup !== false || settingsData.deliveryOptions?.courier !== false || Boolean(settingsData.deliveryOptions?.shipping))}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setSettingsData((s: any) => {
                      const prev = s.deliveryOptions || {};
                      if (enabled) {
                        return {
                          ...s,
                          deliveryOptions: {
                            ...prev,
                            enabled: true,
                            pickup: true,
                            courier: true,
                          },
                        };
                      } else {
                        return {
                          ...s,
                          deliveryOptions: {
                            ...prev,
                            enabled: false,
                            pickup: false,
                            courier: false,
                            shipping: false,
                          },
                        };
                      }
                    });
                  }}
                  className="w-4 h-4 accent-app-primary cursor-pointer"
                />
              </label>
            </div>

            {settingsData.deliveryOptions?.enabled !== false && (settingsData.deliveryOptions?.pickup !== false || settingsData.deliveryOptions?.courier !== false || Boolean(settingsData.deliveryOptions?.shipping)) ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div
                    onClick={() => {
                      const val = !(settingsData.deliveryOptions?.pickup !== false);
                      setSettingsData((s: any) => {
                        const prev = s.deliveryOptions || {};
                        const anyActive = val || prev.courier !== false || Boolean(prev.shipping);
                        return {
                          ...s,
                          deliveryOptions: {
                            ...prev,
                            pickup: val,
                            enabled: anyActive,
                          },
                        };
                      });
                    }}
                    className={`p-4 border rounded-2xl flex items-center justify-between cursor-pointer select-none transition-all duration-150 ${
                      settingsData.deliveryOptions?.pickup !== false
                        ? "bg-app-card border-app-border hover:border-app-primary/40"
                        : "bg-app-card/40 border-app-border opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div>
                      <p className="font-mono font-bold text-xs text-app-primary">Самовывоз</p>
                      <p className="text-[10px] text-app-muted mt-0.5">Клиент забирает сам</p>
                    </div>
                    <CustomCheckbox
                      checked={settingsData.deliveryOptions?.pickup !== false}
                      onChange={(val) => {
                        setSettingsData((s: any) => {
                          const prev = s.deliveryOptions || {};
                          const anyActive = val || prev.courier !== false || Boolean(prev.shipping);
                          return {
                            ...s,
                            deliveryOptions: {
                              ...prev,
                              pickup: val,
                              enabled: anyActive,
                            },
                          };
                        });
                      }}
                      size="md"
                    />
                  </div>

                  <div
                    onClick={() => {
                      const val = !(settingsData.deliveryOptions?.courier !== false);
                      setSettingsData((s: any) => {
                        const prev = s.deliveryOptions || {};
                        const anyActive = (prev.pickup !== false) || val || Boolean(prev.shipping);
                        return {
                          ...s,
                          deliveryOptions: {
                            ...prev,
                            courier: val,
                            enabled: anyActive,
                          },
                        };
                      });
                    }}
                    className={`p-4 border rounded-2xl flex items-center justify-between cursor-pointer select-none transition-all duration-150 ${
                      settingsData.deliveryOptions?.courier !== false
                        ? "bg-app-card border-app-border hover:border-app-primary/40"
                        : "bg-app-card/40 border-app-border opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div>
                      <p className="font-mono font-bold text-xs text-app-primary">Курьер</p>
                      <p className="text-[10px] text-app-muted mt-0.5">Доставка курьером</p>
                    </div>
                    <CustomCheckbox
                      checked={settingsData.deliveryOptions?.courier !== false}
                      onChange={(val) => {
                        setSettingsData((s: any) => {
                          const prev = s.deliveryOptions || {};
                          const anyActive = (prev.pickup !== false) || val || Boolean(prev.shipping);
                          return {
                            ...s,
                            deliveryOptions: {
                              ...prev,
                              courier: val,
                              enabled: anyActive,
                            },
                          };
                        });
                      }}
                      size="md"
                    />
                  </div>

                  <div
                    onClick={() => {
                      const val = !Boolean(settingsData.deliveryOptions?.shipping);
                      setSettingsData((s: any) => {
                        const prev = s.deliveryOptions || {};
                        const anyActive = (prev.pickup !== false) || (prev.courier !== false) || val;
                        return {
                          ...s,
                          deliveryOptions: {
                            ...prev,
                            shipping: val,
                            enabled: anyActive,
                          },
                        };
                      });
                    }}
                    className={`p-4 border rounded-2xl flex items-center justify-between cursor-pointer select-none transition-all duration-150 ${
                      Boolean(settingsData.deliveryOptions?.shipping)
                        ? "bg-app-card border-app-border hover:border-app-primary/40"
                        : "bg-app-card/40 border-app-border opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div>
                      <p className="font-mono font-bold text-xs text-app-primary">Почта / СДЭК</p>
                      <p className="text-[10px] text-app-muted mt-0.5">Доставка службами</p>
                    </div>
                    <CustomCheckbox
                      checked={Boolean(settingsData.deliveryOptions?.shipping)}
                      onChange={(val) => {
                        setSettingsData((s: any) => {
                          const prev = s.deliveryOptions || {};
                          const anyActive = (prev.pickup !== false) || (prev.courier !== false) || val;
                          return {
                            ...s,
                            deliveryOptions: {
                              ...prev,
                              shipping: val,
                              enabled: anyActive,
                            },
                          };
                        });
                      }}
                      size="md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                      Минимальная сумма заказа для доставки (₽)
                    </label>
                    <input
                      type="number"
                      value={settingsData.deliveryOptions?.minOrder ?? settingsData.deliveryOptions?.deliveryMinOrder ?? "0"}
                      onChange={(e) =>
                        setSettingsData((s: any) => ({
                          ...s,
                          deliveryOptions: { ...s.deliveryOptions, minOrder: e.target.value, deliveryMinOrder: e.target.value },
                        }))
                      }
                      placeholder="0"
                      className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                      Стоимость курьерской доставки (₽)
                    </label>
                    <input
                      type="number"
                      value={settingsData.deliveryOptions?.deliveryFee || "0"}
                      onChange={(e) =>
                        setSettingsData((s: any) => ({
                          ...s,
                          deliveryOptions: { ...s.deliveryOptions, deliveryFee: e.target.value },
                        }))
                      }
                      placeholder="0"
                      className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                      Бесплатная доставка от (₽)
                    </label>
                    <input
                      type="number"
                      value={settingsData.deliveryOptions?.freeDeliveryThreshold || "0"}
                      onChange={(e) =>
                        setSettingsData((s: any) => ({
                          ...s,
                          deliveryOptions: { ...s.deliveryOptions, freeDeliveryThreshold: e.target.value },
                        }))
                      }
                      placeholder="0 (если нет)"
                      className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                      Адрес пункта самовывоза
                    </label>
                    <input
                      type="text"
                      value={settingsData.deliveryOptions?.pickupAddress || ""}
                      onChange={(e) =>
                        setSettingsData((s: any) => ({
                          ...s,
                          deliveryOptions: { ...s.deliveryOptions, pickupAddress: e.target.value },
                        }))
                      }
                      placeholder="Например: ул. Ленина, 10, оф. 4"
                      className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 bg-app-card border border-app-border rounded-2xl text-[11px] text-app-muted font-sans">
                Доставка и самовывоз полностью отключены. Плашки «Доставка» и «Самовывоз» не будут показываться на витрине заведения.
              </div>
            )}
          </div>
        )}

        {/* SUBTAB: SOCIAL & CONTACTS */}
        {activeSubTab === "social" && (
          <div className="space-y-5 font-sans text-xs">
            <h4 className="text-xs font-bold font-mono text-app-primary uppercase tracking-wider flex items-center gap-2 border-b border-app-border pb-3">
              <Share2 size={16} className="text-app-muted" />
              Ссылки на соцсети и мессенджеры
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                  Telegram канал / юзернейм
                </label>
                <input
                  type="text"
                  value={settingsData.socialLinks?.telegram || ""}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({
                      ...s,
                      socialLinks: { ...s.socialLinks, telegram: e.target.value },
                    }))
                  }
                  placeholder="@my_channel или https://t.me/..."
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                  Instagram <span className="text-[10px] text-app-muted/70">(*принадлежит Meta, запрещенной в РФ)</span>
                </label>
                <input
                  type="text"
                  value={settingsData.socialLinks?.instagram || ""}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({
                      ...s,
                      socialLinks: { ...s.socialLinks, instagram: e.target.value },
                    }))
                  }
                  placeholder="@my_instagram"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                  WhatsApp (телефон)
                </label>
                <input
                  type="text"
                  value={settingsData.socialLinks?.whatsapp || ""}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({
                      ...s,
                      socialLinks: { ...s.socialLinks, whatsapp: e.target.value },
                    }))
                  }
                  placeholder="+79990000000"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                  ВКонтакте (VK)
                </label>
                <input
                  type="text"
                  value={settingsData.socialLinks?.vk || ""}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({
                      ...s,
                      socialLinks: { ...s.socialLinks, vk: e.target.value },
                    }))
                  }
                  placeholder="https://vk.com/..."
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                  Официальный сайт
                </label>
                <input
                  type="text"
                  value={settingsData.socialLinks?.website || ""}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({
                      ...s,
                      socialLinks: { ...s.socialLinks, website: e.target.value },
                    }))
                  }
                  placeholder="https://mywebsite.com"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: TELEGRAM BOT */}
        {activeSubTab === "telegram" && selectedShop && (
          <AdminTelegramIntegrationTab
            shop={selectedShop}
            showToast={showToast}
            isOwner={isOwner}
          />
        )}

        {/* Action Controls Footer */}
        <div
          className={`pt-6 border-t border-app-border flex flex-col sm:flex-row items-center gap-4 ${
            activeSubTab === "general" ? "justify-between" : "justify-end"
          }`}
        >
          {activeSubTab === "general" && isOwner && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleDeleteShop(selectedShop)}
                className="text-xs text-app-primary hover:text-app-primary bg-app-card hover:bg-app-hover border border-app-border px-3.5 py-2 rounded-xl transition-all cursor-pointer flex-1 sm:flex-none font-mono flex items-center justify-center gap-1.5 font-medium backdrop-blur-sm"
              >
                <Trash2 size={14} className="text-app-muted" />
                <span>Удалить заведение</span>
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isSavingSettings}
            className="w-full sm:w-auto px-8 py-3 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
          >
            {isSavingSettings ? (
              <>
                <SpinnerLoader size={14} />
                <span>Сохранение...</span>
              </>
            ) : (
              <span>Сохранить настройки</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
