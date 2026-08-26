import React, { useState, useEffect, useRef, FormEvent } from "react";
import {
  Store,
  Globe,
  Phone,
  MapPin,
  Clock,
  CreditCard,
  Truck,
  Share2,
  Bot,
  Sparkles,
  Check,
  RotateCcw,
  AlertCircle,
  ImageIcon,
  Send,
  Coffee,
  Scissors,
  ShoppingBag,
  UtensilsCrossed,
  Flower2,
  Wrench,
  ChevronDown,
  Eye,
  Info,
  Layers,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ImageUploader from "../ImageUploader";
import { SpinnerLoader } from "../Skeleton";
import { cleanSlugForSubmit, generateRandomSyllableSlug, transliterateToSlug, validateShopName, validateSlug } from "../../lib/validation";

export interface CreateShopFormData {
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
}

interface AdminCreateShopTabProps {
  onCancel: () => void;
  onSubmitSuccess: (newShop: any) => void;
  token?: string | null;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

const CURRENCY_OPTIONS = [
  { code: "RUB", symbol: "₽", label: "RUB — Российский рубль (₽)", name: "Российский рубль" },
  { code: "USD", symbol: "$", label: "USD — Доллар США ($)", name: "Доллар США" },
  { code: "EUR", symbol: "€", label: "EUR — Евро (€)", name: "Евро" },
  { code: "KZT", symbol: "₸", label: "KZT — Казахстанский тенге (₸)", name: "Казахстанский тенге" },
  { code: "BYN", symbol: "Br", label: "BYN — Белорусский рубль (Br)", name: "Белорусский рубль" },
];

interface ShopPreset {
  id: string;
  label: string;
  icon: React.ReactNode;
  name: string;
  description: string;
  workingHours: string;
  delivery: { pickup: boolean; courier: boolean; shipping: boolean };
  payment: string;
  logoUrl?: string;
  bannerUrl?: string;
}

const SHOP_PRESETS: ShopPreset[] = [
  {
    id: "coffee",
    label: "Кофейня / Кафе",
    icon: <Coffee size={14} />,
    name: "Кофейня Aroma",
    description: "Свежеобжаренный спешелти кофе, авторские десерты и свежая выпечка каждый день.",
    workingHours: "Ежедневно 08:00 — 21:00",
    delivery: { pickup: true, courier: true, shipping: false },
    payment: "Оплата при получении картой или наличными, перевод по СБП.",
    logoUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=300",
    bannerUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: "restaurant",
    label: "Ресторан / Бургеры",
    icon: <UtensilsCrossed size={14} />,
    name: "Burger & Grill",
    description: "Сочные бургеры на огне, хрустящие закуски и крафтовые напитки с быстрой доставкой.",
    workingHours: "Пн-Вс 11:00 — 23:00",
    delivery: { pickup: true, courier: true, shipping: false },
    payment: "Картой курьеру, онлайн-перевод СБП или наличные.",
    logoUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=300",
    bannerUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: "barbershop",
    label: "Барбершоп / Салон",
    icon: <Scissors size={14} />,
    name: "TopCut Barbershop",
    description: "Премиальные мужские стрижки, моделирование бороды и уходовая косметика.",
    workingHours: "Ежедневно 10:00 — 21:00",
    delivery: { pickup: true, courier: false, shipping: false },
    payment: "Оплата на ресепшене картой или переводом.",
    logoUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=300",
    bannerUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: "shop",
    label: "Одежда / Магазин",
    icon: <ShoppingBag size={14} />,
    name: "Urban Style Store",
    description: "Стильная одежда, обувь и аксессуары от современных брендов с примеркой.",
    workingHours: "Пн-Сб 10:00 — 20:00, Вс 11:00 — 19:00",
    delivery: { pickup: true, courier: true, shipping: true },
    payment: "100% предоплата или оплата при получении курьеру.",
    logoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300",
    bannerUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: "flowers",
    label: "Цветы и подарки",
    icon: <Flower2 size={14} />,
    name: "Bloom & Flowers",
    description: "Авторские букеты, комнатные растения и подарочные наборы с доставкой за 60 минут.",
    workingHours: "Ежедневно 08:00 — 22:00",
    delivery: { pickup: true, courier: true, shipping: false },
    payment: "Перевод по СБП перед отправкой букета или картой.",
    logoUrl: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&q=80&w=300",
    bannerUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: "services",
    label: "Услуги / Сервис",
    icon: <Wrench size={14} />,
    name: "ProService Центр",
    description: "Качественный ремонт и сервисное обслуживание электроники и техники с гарантией.",
    workingHours: "Пн-Пт 09:00 — 19:00, Сб 10:00 — 16:00",
    delivery: { pickup: true, courier: true, shipping: false },
    payment: "Оплата по факту выполненных работ (карта/наличные/счет).",
    logoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
    bannerUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1000",
  },
];

const INITIAL_FORM_DATA: CreateShopFormData = {
  name: "",
  slug: "",
  description: "",
  phone: "",
  address: "",
  workingHours: "Ежедневно 09:00 — 21:00",
  isOpen: true,
  logoUrl: "",
  bannerUrl: "",
  currency: "RUB",
  currencySymbol: "₽",
  paymentInstructions: "Оплата при получении (картой или наличными), перевод по СБП.",
  socialLinks: {
    telegram: "",
    instagram: "",
    whatsapp: "",
    vk: "",
    website: "",
  },
  deliveryOptions: {
    pickup: true,
    courier: true,
    shipping: false,
    minOrder: "",
    deliveryFee: "",
  },
  botToken: "",
  adminChatId: "",
};

type CreateSectionTab = "general" | "contacts" | "branding" | "currency" | "delivery" | "social" | "telegram";

export const AdminCreateShopTab: React.FC<AdminCreateShopTabProps> = ({
  onCancel,
  onSubmitSuccess,
  token,
  showToast,
}) => {
  const [formData, setFormData] = useState<CreateShopFormData>(INITIAL_FORM_DATA);
  const [activeTab, setActiveTab] = useState<CreateSectionTab>("general");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isSlugCustomized, setIsSlugCustomized] = useState(false);
  const [initialAutoSlug, setInitialAutoSlug] = useState("");
  const [generatedSlugHistory, setGeneratedSlugHistory] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  const handleApplyPreset = (preset: ShopPreset) => {
    const newSlug = transliterateToSlug(preset.name);
    setSelectedPresetId(preset.id);
    setFormData((prev) => ({
      ...prev,
      name: preset.name,
      slug: newSlug,
      description: preset.description,
      workingHours: preset.workingHours,
      deliveryOptions: {
        ...prev.deliveryOptions,
        pickup: preset.delivery.pickup,
        courier: preset.delivery.courier,
        shipping: preset.delivery.shipping,
      },
      paymentInstructions: preset.payment,
      logoUrl: preset.logoUrl || prev.logoUrl,
      bannerUrl: preset.bannerUrl || prev.bannerUrl,
    }));
    setIsSlugCustomized(false);
    setFieldErrors({});
    setError(null);
    showToast(`Применен шаблон «${preset.label}»`, "info");
  };

  const handleNameChange = (val: string) => {
    setSelectedPresetId(null);
    const autoSlug = cleanSlugForSubmit(transliterateToSlug(val));
    setInitialAutoSlug(autoSlug);

    setFormData((prev) => {
      const prevAutoSlug = cleanSlugForSubmit(transliterateToSlug(prev.name));
      const next = { ...prev, name: val };
      if (!isSlugCustomized || !prev.slug || prev.slug === prevAutoSlug) {
        next.slug = autoSlug;
        setIsSlugCustomized(false);
      }
      return next;
    });
    if (fieldErrors.name) {
      setFieldErrors((prev) => ({ ...prev, name: "" }));
    }
  };

  const handleSlugChange = (val: string) => {
    const clean = cleanSlugForSubmit(val);
    const currentAutoSlug = cleanSlugForSubmit(transliterateToSlug(formData.name));

    if (!clean || clean === currentAutoSlug) {
      setIsSlugCustomized(false);
      setFormData((prev) => ({ ...prev, slug: currentAutoSlug }));
    } else {
      setIsSlugCustomized(true);
      setFormData((prev) => ({ ...prev, slug: clean }));
    }
    if (fieldErrors.slug) {
      setFieldErrors((prev) => ({ ...prev, slug: "" }));
    }
  };

  const handleRestoreNameSlug = () => {
    const autoSlug = cleanSlugForSubmit(transliterateToSlug(formData.name));
    setIsSlugCustomized(false);
    setFormData((prev) => ({ ...prev, slug: autoSlug }));
    if (fieldErrors.slug) {
      setFieldErrors((prev) => ({ ...prev, slug: "" }));
    }
    showToast(`Восстановлен URL из названия: /${autoSlug || "slug"}`, "info");
  };

  const handleRegenerateSlug = () => {
    const trimmedName = formData.name ? formData.name.trim() : "";
    if (!trimmedName) {
      setFieldErrors((prev) => ({
        ...prev,
        name: "Сначала укажите название заведения для генерации URL",
      }));
      showToast("Название заведения не указано. Генерация URL-адреса недоступна", "warning");
      return;
    }

    const currentTranslit = cleanSlugForSubmit(transliterateToSlug(trimmedName));
    const excludedList = [
      formData.slug,
      initialAutoSlug,
      currentTranslit,
      ...generatedSlugHistory
    ].filter(Boolean);

    const freshSlug = generateRandomSyllableSlug(trimmedName, excludedList);
    if (!freshSlug) {
      setFieldErrors((prev) => ({
        ...prev,
        slug: "Не удалось сформировать URL из названия",
      }));
      showToast("Не удалось сформировать URL из названия. Введите URL вручную", "warning");
      return;
    }

    setGeneratedSlugHistory((prev) => [...prev, freshSlug]);
    setFormData((prev) => ({ ...prev, slug: freshSlug }));
    setIsSlugCustomized(true);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.name;
      delete next.slug;
      return next;
    });
    showToast(`Сгенерирован рандомный URL: /${freshSlug}`, "success");
  };

  const handleResetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setSelectedPresetId(null);
    setIsSlugCustomized(false);
    setInitialAutoSlug("");
    setGeneratedSlugHistory([]);
    setFieldErrors({});
    setError(null);
    showToast("Форма создания заведения сброшена", "info");
  };

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};

    const nameCheck = validateShopName(formData.name);
    if (!nameCheck.isValid) {
      errs.name = nameCheck.error || "Укажите корректное название (от 2 до 50 символов)";
    }

    const slugCheck = validateSlug(formData.slug);
    if (!slugCheck.isValid) {
      errs.slug = slugCheck.error || "Slug должен содержать от 2 до 30 латинских символов или дефисов";
    }

    if (formData.description && formData.description.length > 500) {
      errs.description = "Описание не должно превышать 500 символов";
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      if (errs.name || errs.slug || errs.description) {
        setActiveTab("general");
      }
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) {
      showToast("Пожалуйста, проверьте обязательные поля (Название и URL)", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const payload = {
        name: formData.name.trim(),
        slug: cleanSlugForSubmit(formData.slug),
        description: formData.description.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        workingHours: formData.workingHours.trim() || undefined,
        isOpen: formData.isOpen,
        logoUrl: formData.logoUrl.trim() || undefined,
        bannerUrl: formData.bannerUrl.trim() || undefined,
        currency: formData.currency.trim() || "RUB",
        currencySymbol: formData.currencySymbol.trim() || "₽",
        paymentInstructions: formData.paymentInstructions.trim() || undefined,
        socialLinks: formData.socialLinks,
        deliveryOptions: {
          pickup: Boolean(formData.deliveryOptions.pickup),
          courier: Boolean(formData.deliveryOptions.courier),
          shipping: Boolean(formData.deliveryOptions.shipping),
          minOrder: formData.deliveryOptions.minOrder ? String(formData.deliveryOptions.minOrder) : "",
          deliveryFee: formData.deliveryOptions.deliveryFee ? String(formData.deliveryOptions.deliveryFee) : "",
        },
        botToken: formData.botToken.trim() || undefined,
        adminChatId: formData.adminChatId.trim() || undefined,
      };

      const res = await fetch("/api/shops", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Ошибка сервера (${res.status})`);
      }

      if (!res.ok) {
        throw new Error(data.error || "Не удалось создать заведение");
      }

      showToast(`Заведение «${data.name}» успешно создано!`, "success");
      onSubmitSuccess(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ошибка при создании заведения");
      showToast(err.message || "Ошибка при создании заведения", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sections: { id: CreateSectionTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "general", label: "Основное", icon: <Store size={14} />, badge: "Обязательно" },
    { id: "contacts", label: "Контакты и график", icon: <MapPin size={14} /> },
    { id: "branding", label: "Оформление", icon: <ImageIcon size={14} /> },
    { id: "currency", label: "Валюта и оплата", icon: <CreditCard size={14} /> },
    { id: "delivery", label: "Доставка и выдача", icon: <Truck size={14} /> },
    { id: "social", label: "Соцсети и ссылки", icon: <Share2 size={14} /> },
    { id: "telegram", label: "Telegram Бот", icon: <Bot size={14} /> },
  ];

  const currentCurrency = CURRENCY_OPTIONS.find((c) => c.code === formData.currency) || CURRENCY_OPTIONS[0];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-app-surface border border-app-border rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-app-muted">
              <span>Панель управления</span>
              <span>/</span>
              <span className="text-app-primary font-semibold">Создание заведения</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-app-primary flex items-center gap-2.5">
              <Store className="text-app-accent shrink-0" size={24} />
              <span>Создать новое заведение</span>
            </h1>
            <p className="text-xs text-app-muted font-sans max-w-2xl">
              Настройте все параметры заведения сразу: контактные данные, витрину, валюту расчетов, условия доставки и Telegram-уведомления.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowLivePreview(!showLivePreview)}
              className={`px-3 py-2 border rounded-xl font-mono text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                showLivePreview
                  ? "bg-app-accent/10 border-app-accent/30 text-app-accent font-semibold"
                  : "bg-app-card hover:bg-app-hover border-app-border text-app-muted hover:text-app-primary"
              }`}
              title="Переключить показ карточки предпросмотра"
            >
              <Eye size={14} />
              <span>{showLivePreview ? "Скрыть превью" : "Показать превью"}</span>
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              className="px-3 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Сбросить все поля к значениям по умолчанию"
            >
              <RotateCcw size={13} className="text-app-primary" />
              <span className="hidden sm:inline">Сбросить</span>
            </button>
          </div>
        </div>

        {/* Quick Category Templates / Presets Bar */}
        <div className="mt-4 pt-4 border-t border-app-border">
          <div className="flex items-center gap-2 mb-2 text-xs font-mono text-app-muted">
            <Sparkles size={13} className="text-amber-400 shrink-0" />
            <span>Быстрые шаблоны направлений (нажмите для автозаполнения):</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {SHOP_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95 border ${
                    isSelected
                      ? "bg-app-accent text-app-accent-fg border-app-accent font-bold shadow-xs"
                      : "bg-app-card hover:bg-app-hover border-app-border text-app-secondary hover:text-app-primary"
                  }`}
                >
                  <span className={isSelected ? "text-app-accent-fg" : "text-app-muted"}>{preset.icon}</span>
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl flex items-start gap-3 text-rose-400 text-xs font-mono"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">
            <div className="font-bold">Ошибка создания заведения</div>
            <div>{error}</div>
          </div>
        </motion.div>
      )}

      {/* Main Grid Layout: Form Tabs + Live Preview */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Sections (Span 8 or 12) */}
        <div className={`space-y-6 ${showLivePreview ? "lg:col-span-8" : "lg:col-span-12"}`}>
          {/* Section Navigation Tabs Bar */}
          <div className="bg-app-surface border border-app-border rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto scrollbar-none shadow-sm">
            {sections.map((sec) => {
              const isActive = activeTab === sec.id;
              const hasError =
                sec.id === "general" && (fieldErrors.name || fieldErrors.slug || fieldErrors.description);
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveTab(sec.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                      : "text-app-muted hover:text-app-primary hover:bg-app-hover"
                  } ${hasError ? "ring-1 ring-rose-500 text-rose-400" : ""}`}
                >
                  <span className={isActive ? "text-app-accent-fg" : "text-app-muted"}>{sec.icon}</span>
                  <span>{sec.label}</span>
                  {sec.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                        isActive ? "bg-app-accent-fg/20 text-app-accent-fg" : "bg-app-card border border-app-border text-app-muted"
                      }`}
                    >
                      {sec.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content Box */}
          <div className="bg-app-surface border border-app-border rounded-2xl p-5 sm:p-7 shadow-sm">
            <AnimatePresence mode="wait">
              {/* TAB 1: GENERAL */}
              {activeTab === "general" && (
                <motion.div
                  key="tab-general"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  <div className="border-b border-app-border pb-3">
                    <h3 className="text-sm font-bold font-mono text-app-primary flex items-center gap-2">
                      <Store size={16} className="text-app-accent" />
                      <span>1. Основная информация о заведении</span>
                    </h3>
                    <p className="text-xs text-app-muted font-sans mt-0.5">
                      Базовые идентификаторы для адресации заведения в системе и ссылки для клиентов
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-mono text-app-muted">
                          Название заведения <span className="text-rose-400">*</span>
                        </label>
                        <span className="text-[10px] font-mono text-app-muted">{formData.name.length}/50</span>
                      </div>
                      <input
                        type="text"
                        maxLength={50}
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Например: Кофейня на Невском"
                        className={`w-full bg-app-card border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none transition-colors ${
                          fieldErrors.name
                            ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
                            : "border-app-border focus:border-app-accent"
                        }`}
                      />
                      {fieldErrors.name && (
                        <p className="text-[11px] text-rose-400 mt-1 font-mono">{fieldErrors.name}</p>
                      )}
                    </div>

                    {/* Slug */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-mono text-app-muted">
                          URL-адрес витрины (Slug) <span className="text-rose-400">*</span>
                        </label>
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          {(isSlugCustomized || (formData.slug && formData.name && formData.slug !== cleanSlugForSubmit(transliterateToSlug(formData.name)))) && (
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
                            onClick={handleRegenerateSlug}
                            className="text-app-accent hover:underline cursor-pointer flex items-center gap-1"
                            title="Сгенерировать случайный уникальный URL"
                          >
                            <Sparkles size={10} />
                            <span>Рандомный URL</span>
                          </button>
                        </div>
                      </div>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-xs text-app-muted font-mono select-none">/</span>
                        <input
                          type="text"
                          maxLength={30}
                          value={formData.slug}
                          onChange={(e) => handleSlugChange(e.target.value)}
                          placeholder="coffee-bar"
                          className={`w-full bg-app-card border rounded-xl pl-7 pr-4 py-2.5 text-xs text-app-primary focus:outline-none font-mono transition-colors ${
                            fieldErrors.slug
                              ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
                              : "border-app-border focus:border-app-accent"
                          }`}
                        />
                      </div>
                      {fieldErrors.slug && (
                        <p className="text-[11px] text-rose-400 mt-1 font-mono">{fieldErrors.slug}</p>
                      )}
                      {formData.slug && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-mono text-app-muted bg-app-card/60 p-2 rounded-xl border border-app-border">
                          <Globe size={13} className="text-emerald-400 shrink-0" />
                          <span>Прямая ссылка витрины:</span>
                          <span className="text-emerald-400 font-bold">/{cleanSlugForSubmit(formData.slug)}</span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-mono text-app-muted">Описание заведения</label>
                        <span className="text-[10px] font-mono text-app-muted">{formData.description.length}/500</span>
                      </div>
                      <textarea
                        rows={3}
                        maxLength={500}
                        value={formData.description}
                        onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Кратко расскажите гостям о заведении, концепции, фирменных блюдах или услугах..."
                        className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent resize-none font-sans"
                      />
                      {fieldErrors.description && (
                        <p className="text-[11px] text-rose-400 mt-1 font-mono">{fieldErrors.description}</p>
                      )}
                    </div>

                    {/* Is Open Toggle */}
                    <div className="p-3.5 bg-app-card border border-app-border rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-xs font-mono font-bold text-app-primary flex items-center gap-1.5">
                          <span>Статус работы:</span>
                          <span className={formData.isOpen ? "text-emerald-400" : "text-rose-400"}>
                            {formData.isOpen ? "Заведение открыто (Принимает заказы)" : "Временно закрыто"}
                          </span>
                        </div>
                        <p className="text-[11px] text-app-muted mt-0.5">
                          Вы можете открыть витрину сразу или подготовить меню перед открытием.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, isOpen: !p.isOpen }))}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                          formData.isOpen ? "bg-emerald-500" : "bg-app-border"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                            formData.isOpen ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: CONTACTS & HOURS */}
              {activeTab === "contacts" && (
                <motion.div
                  key="tab-contacts"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  <div className="border-b border-app-border pb-3">
                    <h3 className="text-sm font-bold font-mono text-app-primary flex items-center gap-2">
                      <MapPin size={16} className="text-app-accent" />
                      <span>2. Контакты, адрес и график работы</span>
                    </h3>
                    <p className="text-xs text-app-muted font-sans mt-0.5">
                      Информация для клиентов в шапке магазина и на чеке заказа
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-mono text-app-muted mb-1.5">Контактный телефон</label>
                      <div className="relative flex items-center">
                        <Phone size={14} className="absolute left-3.5 text-app-muted" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="+7 (999) 000-00-00"
                          className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                        Физический адрес / Точка самовывоза
                      </label>
                      <div className="relative flex items-center">
                        <MapPin size={14} className="absolute left-3.5 text-app-muted" />
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                          placeholder="г. Санкт-Петербург, Невский пр-т, д. 28"
                          className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-app-muted mb-1.5">Режим работы</label>
                      <div className="relative flex items-center">
                        <Clock size={14} className="absolute left-3.5 text-app-muted" />
                        <input
                          type="text"
                          value={formData.workingHours}
                          onChange={(e) => setFormData((p) => ({ ...p, workingHours: e.target.value }))}
                          placeholder="Ежедневно 09:00 — 21:00"
                          className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {["08:00 — 21:00", "09:00 — 22:00", "10:00 — 23:00", "Круглосуточно 24/7"].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setFormData((p) => ({ ...p, workingHours: preset }))}
                            className="px-2 py-1 bg-app-card hover:bg-app-hover border border-app-border rounded-lg text-[10px] font-mono text-app-muted hover:text-app-primary transition-colors cursor-pointer"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: BRANDING & MEDIA */}
              {activeTab === "branding" && (
                <motion.div
                  key="tab-branding"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <div className="border-b border-app-border pb-3">
                    <h3 className="text-sm font-bold font-mono text-app-primary flex items-center gap-2">
                      <ImageIcon size={16} className="text-app-accent" />
                      <span>3. Оформление и брендинг витрины</span>
                    </h3>
                    <p className="text-xs text-app-muted font-sans mt-0.5">
                      Логотип и баннер создают первое впечатление у покупателей в Telegram Mini App
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {/* Logo Uploader */}
                    <div className="p-3.5 bg-app-card/30 border border-app-border rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-mono text-app-primary font-semibold flex items-center gap-1.5">
                          <span>Логотип заведения</span>
                        </label>
                        <span className="text-[9px] font-mono text-app-muted px-1.5 py-0.5 bg-app-card rounded border border-app-border">
                          1:1 Квадрат
                        </span>
                      </div>
                      <ImageUploader
                        value={formData.logoUrl}
                        onChange={(url) => setFormData((p) => ({ ...p, logoUrl: url }))}
                        type="avatar"
                        label=""
                        placeholder="https://... или выберите файл"
                      />
                    </div>

                    {/* Banner Uploader */}
                    <div className="p-3.5 bg-app-card/30 border border-app-border rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-mono text-app-primary font-semibold flex items-center gap-1.5">
                          <span>Баннер-обложка витрины</span>
                        </label>
                        <span className="text-[9px] font-mono text-app-muted px-1.5 py-0.5 bg-app-card rounded border border-app-border">
                          16:9 Баннер
                        </span>
                      </div>
                      <ImageUploader
                        value={formData.bannerUrl}
                        onChange={(url) => setFormData((p) => ({ ...p, bannerUrl: url }))}
                        type="banner"
                        maxHeightClass="max-h-24 sm:max-h-28"
                        label=""
                        placeholder="https://... или выберите файл"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: CURRENCY & PAYMENT */}
              {activeTab === "currency" && (
                <motion.div
                  key="tab-currency"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  <div className="border-b border-app-border pb-3">
                    <h3 className="text-sm font-bold font-mono text-app-primary flex items-center gap-2">
                      <CreditCard size={16} className="text-app-accent" />
                      <span>4. Валюта расчетов и оплата</span>
                    </h3>
                    <p className="text-xs text-app-muted font-sans mt-0.5">
                      Настройка отображения цен и реквизитов для оплаты
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Currency Selector */}
                    <div>
                      <label className="block text-[11px] font-mono text-app-muted mb-1.5">Основная валюта цен</label>
                      <div className="relative" ref={currencyDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                          className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary flex items-center justify-between focus:outline-none focus:border-app-accent cursor-pointer"
                        >
                          <span className="font-mono font-bold">
                            {currentCurrency.code} — {currentCurrency.name} ({currentCurrency.symbol})
                          </span>
                          <ChevronDown size={14} className="text-app-muted" />
                        </button>

                        {isCurrencyDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-app-modal border border-app-border rounded-xl shadow-xl p-1.5 space-y-1">
                            {CURRENCY_OPTIONS.map((opt) => (
                              <button
                                key={opt.code}
                                type="button"
                                onClick={() => {
                                  setFormData((p) => ({ ...p, currency: opt.code, currencySymbol: opt.symbol }));
                                  setIsCurrencyDropdownOpen(false);
                                }}
                                className={`w-full text-left p-2 rounded-lg text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                                  formData.currency === opt.code
                                    ? "bg-app-accent text-app-accent-fg font-bold"
                                    : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
                                }`}
                              >
                                <span>{opt.label}</span>
                                {formData.currency === opt.code && <Check size={14} />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment Instructions */}
                    <div>
                      <label className="block text-[11px] font-mono text-app-muted mb-1.5">Инструкции по оплате</label>
                      <textarea
                        rows={3}
                        value={formData.paymentInstructions}
                        onChange={(e) => setFormData((p) => ({ ...p, paymentInstructions: e.target.value }))}
                        placeholder="Оплата при получении картой/наличными. Перевод на карту Сбер/Т-Банк по номеру..."
                        className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent resize-none font-sans"
                      />
                      <p className="text-[10px] text-app-muted font-sans mt-1">
                        Отображается покупателю на финальном этапе оформления заказа.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 5: DELIVERY */}
              {activeTab === "delivery" && (
                <motion.div
                  key="tab-delivery"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  <div className="border-b border-app-border pb-3">
                    <h3 className="text-sm font-bold font-mono text-app-primary flex items-center gap-2">
                      <Truck size={16} className="text-app-accent" />
                      <span>5. Способы получения и доставка</span>
                    </h3>
                    <p className="text-xs text-app-muted font-sans mt-0.5">
                      Доступные типы выдачи товаров при оформлении заказа в корзине
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Method Checkboxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="p-3 bg-app-card border border-app-border rounded-xl flex items-center gap-2.5 cursor-pointer hover:bg-app-hover transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.deliveryOptions.pickup}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              deliveryOptions: { ...p.deliveryOptions, pickup: e.target.checked },
                            }))
                          }
                          className="rounded border-app-border text-app-accent focus:ring-0 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs font-mono font-bold text-app-primary">Самовывоз</span>
                      </label>

                      <label className="p-3 bg-app-card border border-app-border rounded-xl flex items-center gap-2.5 cursor-pointer hover:bg-app-hover transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.deliveryOptions.courier}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              deliveryOptions: { ...p.deliveryOptions, courier: e.target.checked },
                            }))
                          }
                          className="rounded border-app-border text-app-accent focus:ring-0 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs font-mono font-bold text-app-primary">Курьер</span>
                      </label>

                      <label className="p-3 bg-app-card border border-app-border rounded-xl flex items-center gap-2.5 cursor-pointer hover:bg-app-hover transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.deliveryOptions.shipping}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              deliveryOptions: { ...p.deliveryOptions, shipping: e.target.checked },
                            }))
                          }
                          className="rounded border-app-border text-app-accent focus:ring-0 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs font-mono font-bold text-app-primary">Почта / СДЭК</span>
                      </label>
                    </div>

                    {/* Numeric thresholds */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                          Мин. сумма для заказа ({formData.currencySymbol})
                        </label>
                        <input
                          type="number"
                          value={formData.deliveryOptions.minOrder}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              deliveryOptions: { ...p.deliveryOptions, minOrder: e.target.value },
                            }))
                          }
                          placeholder="Например: 500"
                          className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                          Стоимость доставки курьером ({formData.currencySymbol})
                        </label>
                        <input
                          type="number"
                          value={formData.deliveryOptions.deliveryFee}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              deliveryOptions: { ...p.deliveryOptions, deliveryFee: e.target.value },
                            }))
                          }
                          placeholder="Например: 250"
                          className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 6: SOCIAL LINKS */}
              {activeTab === "social" && (
                <motion.div
                  key="tab-social"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  <div className="border-b border-app-border pb-3">
                    <h3 className="text-sm font-bold font-mono text-app-primary flex items-center gap-2">
                      <Share2 size={16} className="text-app-accent" />
                      <span>6. Социальные сети и контакты для связи</span>
                    </h3>
                    <p className="text-xs text-app-muted font-sans mt-0.5">
                      Кнопки соцсетей будут отображаться в подвале и в инфо-блоке витрины
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-mono text-app-muted mb-1">Telegram (канал или аккаунт)</label>
                      <div className="relative flex items-center">
                        <Send size={14} className="absolute left-3.5 text-app-muted" />
                        <input
                          type="text"
                          value={formData.socialLinks.telegram}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              socialLinks: { ...p.socialLinks, telegram: e.target.value },
                            }))
                          }
                          placeholder="https://t.me/my_channel или @username"
                          className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-4 py-2 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-app-muted mb-1">WhatsApp (номер или ссылка)</label>
                      <div className="relative flex items-center">
                        <Phone size={14} className="absolute left-3.5 text-app-muted" />
                        <input
                          type="text"
                          value={formData.socialLinks.whatsapp}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              socialLinks: { ...p.socialLinks, whatsapp: e.target.value },
                            }))
                          }
                          placeholder="https://wa.me/79990000000"
                          className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-4 py-2 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-app-muted mb-1">Instagram</label>
                      <div className="relative flex items-center">
                        <Share2 size={14} className="absolute left-3.5 text-app-muted" />
                        <input
                          type="text"
                          value={formData.socialLinks.instagram}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              socialLinks: { ...p.socialLinks, instagram: e.target.value },
                            }))
                          }
                          placeholder="https://instagram.com/my_shop"
                          className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-4 py-2 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-app-muted mb-1">ВКонтакте</label>
                      <div className="relative flex items-center">
                        <Globe size={14} className="absolute left-3.5 text-app-muted" />
                        <input
                          type="text"
                          value={formData.socialLinks.vk}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              socialLinks: { ...p.socialLinks, vk: e.target.value },
                            }))
                          }
                          placeholder="https://vk.com/my_group"
                          className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-4 py-2 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-app-muted mb-1">Официальный сайт</label>
                      <div className="relative flex items-center">
                        <Globe size={14} className="absolute left-3.5 text-app-muted" />
                        <input
                          type="url"
                          value={formData.socialLinks.website}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              socialLinks: { ...p.socialLinks, website: e.target.value },
                            }))
                          }
                          placeholder="https://my-brand.ru"
                          className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-4 py-2 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 7: TELEGRAM BOT */}
              {activeTab === "telegram" && (
                <motion.div
                  key="tab-telegram"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  <div className="border-b border-app-border pb-3">
                    <h3 className="text-sm font-bold font-mono text-app-primary flex items-center gap-2">
                      <Bot size={16} className="text-app-accent" />
                      <span>7. Telegram Бот и уведомления о заказах</span>
                    </h3>
                    <p className="text-xs text-app-muted font-sans mt-0.5">
                      Необязательно при создании: вы сможете подключить бота позже в настройках
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-3.5 bg-app-card/60 border border-app-border rounded-xl text-xs space-y-1.5 font-sans">
                      <div className="font-bold text-app-primary flex items-center gap-1.5">
                        <Info size={14} className="text-app-accent shrink-0" />
                        <span>Как подключить Telegram-бота:</span>
                      </div>
                      <p className="text-app-muted text-[11px]">
                        1. Создайте бота в <strong>@BotFather</strong> и скопируйте HTTP API токен.
                      </p>
                      <p className="text-app-muted text-[11px]">
                        2. Напишите боту <strong>@userinfobot</strong>, чтобы узнать ваш Telegram Chat ID.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                        Токен бота (Telegram Bot API Token)
                      </label>
                      <div className="relative flex items-center">
                        <Bot size={14} className="absolute left-3.5 text-app-muted" />
                        <input
                          type="password"
                          value={formData.botToken}
                          onChange={(e) => setFormData((p) => ({ ...p, botToken: e.target.value }))}
                          placeholder="1234567890:ABCDefGhIjKlmnOpQrStUvWxYz..."
                          className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                        Chat ID администратора для уведомлений
                      </label>
                      <div className="relative flex items-center">
                        <Send size={14} className="absolute left-3.5 text-app-muted" />
                        <input
                          type="text"
                          value={formData.adminChatId}
                          onChange={(e) => setFormData((p) => ({ ...p, adminChatId: e.target.value }))}
                          placeholder="Например: 123456789 или -100123456789 (для группы)"
                          className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Sticky Action Bar */}
          <div className="bg-app-surface border border-app-border rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Отмена
            </button>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 active:scale-98 transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <SpinnerLoader size={14} />
                    <span>Создание заведения...</span>
                  </>
                ) : (
                  <>
                    <Store size={15} />
                    <span>СОЗДАТЬ ЗАВЕДЕНИЕ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Live Preview Card (Span 4) */}
        {showLivePreview && (
          <div className="lg:col-span-4 sticky top-6 space-y-4">
            <div className="bg-app-surface border border-app-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-app-border mb-3.5">
                <div className="text-xs font-mono font-bold text-app-primary flex items-center gap-1.5">
                  <Eye size={14} className="text-app-accent" />
                  <span>Живой предпросмотр витрины</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-app-card border border-app-border rounded-full text-app-muted">
                  Клиентский вид
                </span>
              </div>

              {/* Mini-Card Mockup */}
              <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden shadow-md">
                {/* Banner Area */}
                <div className="h-28 bg-gradient-to-r from-slate-900 to-indigo-950 relative flex items-center justify-center overflow-hidden">
                  {formData.bannerUrl ? (
                    <img
                      src={formData.bannerUrl}
                      alt="Banner"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-center p-3">
                      <ImageIcon size={22} className="mx-auto text-white/30 mb-1" />
                      <span className="text-[10px] font-mono text-white/40">Обложка витрины</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold shadow-sm ${
                        formData.isOpen ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                      }`}
                    >
                      {formData.isOpen ? "Открыто" : "Закрыто"}
                    </span>
                  </div>
                </div>

                {/* Logo & Info Area */}
                <div className="p-4 relative pt-0">
                  <div className="flex items-end justify-between -mt-6 mb-2.5">
                    <div className="w-14 h-14 rounded-2xl bg-app-surface border-2 border-app-border overflow-hidden shadow-lg flex items-center justify-center">
                      {formData.logoUrl ? (
                        <img
                          src={formData.logoUrl}
                          alt="Logo"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Store size={22} className="text-app-muted" />
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-app-muted">Валюта:</span>
                      <div className="text-xs font-mono font-bold text-app-primary">
                        {formData.currency} ({formData.currencySymbol})
                      </div>
                    </div>
                  </div>

                  <h4 className="font-bold text-sm font-sans text-app-primary truncate">
                    {formData.name || "Название вашего заведения"}
                  </h4>
                  <p className="text-[11px] font-mono text-emerald-400 mb-2">
                    /{cleanSlugForSubmit(formData.slug) || "vash-slug"}
                  </p>

                  {formData.description ? (
                    <p className="text-xs text-app-muted font-sans line-clamp-3 mb-3">
                      {formData.description}
                    </p>
                  ) : (
                    <p className="text-xs text-app-muted/60 italic font-sans mb-3">
                      Описание заведения появится здесь...
                    </p>
                  )}

                  <div className="space-y-1.5 pt-2.5 border-t border-app-border text-[11px] font-mono text-app-secondary">
                    {formData.address && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-app-muted shrink-0" />
                        <span className="truncate">{formData.address}</span>
                      </div>
                    )}
                    {formData.workingHours && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-app-muted shrink-0" />
                        <span className="truncate">{formData.workingHours}</span>
                      </div>
                    )}
                    {formData.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-app-muted shrink-0" />
                        <span>{formData.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Delivery tags */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-2.5 border-t border-app-border text-[10px] font-mono">
                    {formData.deliveryOptions.pickup && (
                      <span className="px-2 py-0.5 rounded-md bg-app-surface border border-app-border text-app-primary">
                        Самовывоз
                      </span>
                    )}
                    {formData.deliveryOptions.courier && (
                      <span className="px-2 py-0.5 rounded-md bg-app-surface border border-app-border text-app-primary">
                        Курьер {formData.deliveryOptions.deliveryFee ? `(${formData.deliveryOptions.deliveryFee} ${formData.currencySymbol})` : ""}
                      </span>
                    )}
                    {formData.deliveryOptions.shipping && (
                      <span className="px-2 py-0.5 rounded-md bg-app-surface border border-app-border text-app-primary">
                        СДЭК/Почта
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
