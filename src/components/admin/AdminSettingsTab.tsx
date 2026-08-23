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
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ImageUploader from "../ImageUploader";
import { SpinnerLoader } from "../Skeleton";
import { cleanSlugForSubmit, transliterateToSlug } from "../../lib/validation";

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
  };
  setSettingsData: React.Dispatch<React.SetStateAction<any>>;
  settingsError: string | null;
  settingsSuccess: string | null;
  isSavingSettings: boolean;
  handleSaveSettings: (e: React.FormEvent) => void;
  handleDeleteShop: (shopId: string) => void;
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
  settingsActiveTab?: "general" | "branding" | "currency" | "delivery" | "social" | "telegram";
  setSettingsActiveTab?: (tab: "general" | "branding" | "currency" | "delivery" | "social" | "telegram") => void;
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
}

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
}) => {
  const [activeSubTab, setActiveSubTab] = React.useState<
    "general" | "branding" | "currency" | "delivery" | "social" | "telegram"
  >(settingsActiveTab);

  const [isTgGuideOpen, setIsTgGuideOpen] = React.useState(false);
  const [backupSettingsData, setBackupSettingsData] = React.useState<any | null>(null);

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

  const changeSubTab = (tab: "general" | "branding" | "currency" | "delivery" | "social" | "telegram") => {
    setActiveSubTab(tab);
    if (setSettingsActiveTab) setSettingsActiveTab(tab);
  };

  const botToken = settingsData.botToken || settingsData.telegramBotToken || "";
  const adminChatId = settingsData.adminChatId || settingsData.telegramChatId || "";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Sub-tabs */}
      <div className="bg-app-surface border border-app-border rounded-3xl p-5 sm:p-6 text-app-primary shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-app-border pb-4">
          <div>
            <h3 className="text-base font-bold font-mono flex items-center gap-2 text-app-primary">
              <Settings size={18} className="text-app-muted" />
              Настройки заведения: {selectedShop.name}
            </h3>
            <p className="text-xs text-app-muted mt-0.5 font-sans">
              Управление брендингом, правилами доставки, реквизитами и Telegram ботом
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="px-3 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <QrCode size={14} className="text-app-muted" />
              <span>QR-Код</span>
            </button>
            {handleClearSettingsFields && (
              <button
                type="button"
                onClick={handleResetWithBackup}
                className="px-3 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary font-mono text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Очистить доп. поля текущей секции"
              >
                <RotateCcw size={13} />
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
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 font-mono text-xs">
          {[
            { id: "general", label: "Основное", icon: Store },
            { id: "branding", label: "Брендинг", icon: ImageIcon },
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
                className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
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
        <div className="p-4 bg-app-card border border-app-border text-app-primary rounded-2xl text-xs flex items-center gap-2.5 font-mono font-medium">
          <AlertCircle size={16} className="shrink-0 text-app-muted" />
          <span>{settingsError}</span>
        </div>
      )}

      {settingsSuccess && (
        <div className="p-4 bg-app-card border border-app-border text-app-primary rounded-2xl text-xs flex items-center gap-2.5 font-mono font-medium">
          <Check size={16} className="shrink-0 text-app-primary" />
          <span>{settingsSuccess}</span>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSaveSettings} className="bg-app-surface border border-app-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
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
                    setSettingsData((s: any) => {
                      const autoSlug = transliterateToSlug(nameVal);
                      return {
                        ...s,
                        name: nameVal,
                        slug: autoSlug || s.slug,
                      };
                    });
                  }}
                  placeholder="Например: Барбершоп «Борода»"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[11px] font-mono text-app-muted uppercase tracking-wider">
                    URL Slug (ссылка) *
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateSlug}
                    className="text-[10px] text-emerald-400 hover:underline font-mono cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw size={10} />
                    <span>Сгенерировать</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={settingsData.slug}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({
                      ...s,
                      slug: cleanSlugForSubmit(e.target.value),
                    }))
                  }
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

        {/* SUBTAB: CURRENCY & PAYMENT */}
        {activeSubTab === "currency" && (
          <div className="space-y-5 font-sans text-xs">
            <h4 className="text-xs font-bold font-mono text-app-primary uppercase tracking-wider flex items-center gap-2 border-b border-app-border pb-3">
              <CreditCard size={16} className="text-app-muted" />
              Валюта, Лояльность и Реквизиты оплаты
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Код валюты
                </label>
                <select
                  value={settingsData.currency}
                  onChange={(e) => {
                    const code = e.target.value;
                    let symbol = "₽";
                    if (code === "USD") symbol = "$";
                    else if (code === "EUR") symbol = "€";
                    else if (code === "KZT") symbol = "₸";
                    else if (code === "BYN") symbol = "Br";
                    setSettingsData((s: any) => ({
                      ...s,
                      currency: code,
                      currencySymbol: symbol,
                    }));
                  }}
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                >
                  <option value="RUB">RUB — Российский рубль (₽)</option>
                  <option value="USD">USD — Доллар США ($)</option>
                  <option value="EUR">EUR — Евро (€)</option>
                  <option value="KZT">KZT — Казахстанский тенге (₸)</option>
                  <option value="BYN">BYN — Белорусский рубль (Br)</option>
                </select>
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

              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Кэшбэк бонусами (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settingsData.cashbackPercent}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({
                      ...s,
                      cashbackPercent: Number(e.target.value) || 0,
                    }))
                  }
                  placeholder="5"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                />
              </div>
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
            <h4 className="text-xs font-bold font-mono text-app-primary uppercase tracking-wider flex items-center gap-2 border-b border-app-border pb-3">
              <Truck size={16} className="text-app-muted" />
              Способы доставки и минимальный заказ
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="p-4 bg-app-card border border-app-border rounded-2xl flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-mono font-bold text-xs text-app-primary">Самовывоз</p>
                  <p className="text-[10px] text-app-muted mt-0.5">Клиент забирает сам</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsData.deliveryOptions?.pickup !== false}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({
                      ...s,
                      deliveryOptions: { ...s.deliveryOptions, pickup: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-app-primary cursor-pointer"
                />
              </label>

              <label className="p-4 bg-app-card border border-app-border rounded-2xl flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-mono font-bold text-xs text-app-primary">Курьер</p>
                  <p className="text-[10px] text-app-muted mt-0.5">Доставка курьером</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsData.deliveryOptions?.courier !== false}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({
                      ...s,
                      deliveryOptions: { ...s.deliveryOptions, courier: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-app-primary cursor-pointer"
                />
              </label>

              <label className="p-4 bg-app-card border border-app-border rounded-2xl flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-mono font-bold text-xs text-app-primary">Почта / СДЭК</p>
                  <p className="text-[10px] text-app-muted mt-0.5">Доставка службами</p>
                </div>
                <input
                  type="checkbox"
                  checked={!!settingsData.deliveryOptions?.shipping}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({
                      ...s,
                      deliveryOptions: { ...s.deliveryOptions, shipping: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-app-primary cursor-pointer"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Минимальная сумма заказа (₽)
                </label>
                <input
                  type="number"
                  value={settingsData.deliveryOptions?.minOrder || "0"}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({
                      ...s,
                      deliveryOptions: { ...s.deliveryOptions, minOrder: e.target.value },
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
            </div>
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
                  Instagram
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
        {activeSubTab === "telegram" && (
          <div className="space-y-5 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <h4 className="text-xs font-bold font-mono text-app-primary uppercase tracking-wider flex items-center gap-2">
                <Smartphone size={16} className="text-app-muted" />
                Интеграция с Telegram Ботом
              </h4>
              <button
                type="button"
                onClick={() => setIsTgGuideOpen(!isTgGuideOpen)}
                className="text-[11px] font-mono text-app-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Инструкция</span>
                <ChevronDown
                  size={13}
                  className={`transition-transform ${isTgGuideOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* Instruction Guide */}
            <AnimatePresence>
              {isTgGuideOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-app-card border border-app-border rounded-2xl text-xs space-y-2.5 font-sans overflow-hidden"
                >
                  <p className="font-bold font-mono text-app-primary">
                    Как привязать своего Telegram бота:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-app-secondary text-[11px] font-mono leading-relaxed">
                    <li>
                      Откройте Telegram и откройте официального бота{" "}
                      <a
                        href="https://t.me/BotFather"
                        target="_blank"
                        rel="noreferrer"
                        className="text-app-primary underline inline-flex items-center gap-1 font-semibold"
                      >
                        @BotFather <ExternalLink size={10} />
                      </a>
                    </li>
                    <li>
                      Отправьте команду{" "}
                      <code className="bg-app-surface border border-app-border px-1.5 py-0.5 rounded text-app-primary">
                        /newbot
                      </code>{" "}
                      и введите название и юзернейм бота
                    </li>
                    <li>Скопируйте полученный **HTTP API Bot Token** и вставьте в поле ниже</li>
                    <li>
                      Для получения своего Chat ID откройте бота{" "}
                      <a
                        href="https://t.me/userinfobot"
                        target="_blank"
                        rel="noreferrer"
                        className="text-app-primary underline inline-flex items-center gap-1 font-semibold"
                      >
                        @userinfobot <ExternalLink size={10} />
                      </a>{" "}
                      и скопируйте свой ID
                    </li>
                    <li>
                      Нажмите кнопку **Проверить бота** и **Настроить Webhook**, чтобы получать мгновенные уведомления о новых заказах прямо в Telegram!
                    </li>
                  </ol>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                  Telegram Bot Token *
                </label>
                <input
                  type="password"
                  value={botToken}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({
                      ...s,
                      botToken: e.target.value,
                      telegramBotToken: e.target.value,
                    }))
                  }
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyZ"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                  Telegram Chat ID администратора *
                </label>
                <input
                  type="text"
                  value={adminChatId}
                  onChange={(e) =>
                    setSettingsData((s: any) => ({
                      ...s,
                      adminChatId: e.target.value,
                      telegramChatId: e.target.value,
                    }))
                  }
                  placeholder="987654321 или -10012345678"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                />
              </div>
            </div>

            {/* Test & Webhook Actions */}
            <div className="pt-2 flex flex-wrap gap-2.5">
              {handleTestBotToken && (
                <button
                  type="button"
                  onClick={handleTestBotToken}
                  disabled={isTestingBot || !botToken}
                  className="px-3.5 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isTestingBot ? <SpinnerLoader size={12} /> : <Bot size={14} className="text-app-muted" />}
                  <span>Проверить бота</span>
                </button>
              )}

              {handleSetupWebhook && (
                <button
                  type="button"
                  onClick={handleSetupWebhook}
                  disabled={isSettingWebhook || !botToken}
                  className="px-3.5 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSettingWebhook ? <SpinnerLoader size={12} /> : <Send size={14} className="text-app-muted" />}
                  <span>Настроить Webhook</span>
                </button>
              )}

              {handleSendTestNotification && (
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  disabled={isSendingTestNotification || !botToken || !adminChatId}
                  className="px-3.5 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSendingTestNotification ? <SpinnerLoader size={12} /> : <Send size={14} className="text-app-muted" />}
                  <span>Тестовое уведомление</span>
                </button>
              )}
            </div>

            {/* Bot Test Output Status */}
            {botTestResult && (
              <div
                className="p-3.5 rounded-xl border border-app-border bg-app-card text-xs font-mono font-medium text-app-primary flex items-center gap-2"
              >
                {botTestResult.error ? (
                  <p>Ошибка: {botTestResult.error}</p>
                ) : (
                  <p>
                    Бот успешно авторизован: {botTestResult.botInfo?.first_name} (@
                    {botTestResult.botInfo?.username})
                  </p>
                )}
              </div>
            )}

            {webhookStatus && (
              <div className="p-3.5 bg-app-card border border-app-border text-app-primary rounded-xl text-xs font-mono font-medium">
                {webhookStatus}
              </div>
            )}
          </div>
        )}

        {/* Action Controls Footer */}
        <div
          className={`pt-6 border-t border-app-border flex flex-col sm:flex-row items-center gap-4 ${
            activeSubTab === "general" ? "justify-between" : "justify-end"
          }`}
        >
          {activeSubTab === "general" && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() =>
                  requestConfirm(
                    "Удаление заведения",
                    `Вы уверены, что хотите безвозвратно удалить "${selectedShop.name}"? Это действие нельзя отменить!`,
                    () => handleDeleteShop(selectedShop.id),
                    "Удалить безвозвратно",
                    true
                  )
                }
                className="text-xs text-app-primary hover:text-app-primary bg-app-card hover:bg-app-hover border border-app-border px-3.5 py-2 rounded-xl transition-all cursor-pointer flex-1 sm:flex-none font-mono flex items-center justify-center gap-1.5 font-medium backdrop-blur-sm"
              >
                <Trash2 size={14} className="text-app-muted" />
                <span>Удалить заведение</span>
              </button>

              {onOpenReport && (
                <button
                  type="button"
                  onClick={onOpenReport}
                  className="text-xs text-app-secondary hover:text-app-primary hover:bg-app-hover border border-app-border px-3.5 py-2 rounded-xl transition-colors cursor-pointer flex-1 sm:flex-none font-mono flex items-center justify-center gap-1.5"
                  title="Сообщить о баге или проблеме в заведении"
                >
                  <Bug size={14} className="text-app-muted" />
                  <span>Сообщить о баге</span>
                </button>
              )}
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
