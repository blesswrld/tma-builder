import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  X,
  Edit3,
  AlertCircle,
  Copy,
  Trash2,
  Clock,
  Weight,
  Truck,
  Plus,
  ImageIcon,
  CheckCircle2,
  XCircle,
  Store,
  Globe,
  ChevronDown,
  Check,
} from "lucide-react";
import ImageUploader from "../ImageUploader";

const FULFILLMENT_OPTIONS = [
  { value: "courier,pickup", label: "В заведении и Доставка", icon: Store, color: "text-amber-400" },
  { value: "pickup", label: "Только в заведении / Самовывоз", icon: Store, color: "text-indigo-400" },
  { value: "courier", label: "Только Доставка курьером", icon: Truck, color: "text-emerald-400" },
  { value: "online", label: "Онлайн услуга", icon: Globe, color: "text-sky-400" },
];

interface FulfillmentCustomSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const FulfillmentCustomSelect: React.FC<FulfillmentCustomSelectProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentOption = FULFILLMENT_OPTIONS.find(o => o.value === value) || FULFILLMENT_OPTIONS[0];
  const IconComp = currentOption.icon;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary flex items-center justify-between gap-2 focus:outline-none hover:border-amber-500/50 transition-all font-mono cursor-pointer"
      >
        <div className="flex items-center gap-2 truncate">
          <IconComp size={14} className={currentOption.color} />
          <span className="font-semibold truncate">{currentOption.label}</span>
        </div>
        <ChevronDown size={14} className={`text-app-muted transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-app-card border border-app-border rounded-xl shadow-2xl py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {FULFILLMENT_OPTIONS.map((opt) => {
            const OptIcon = opt.icon;
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 text-xs flex items-center justify-between font-mono transition-colors text-left cursor-pointer ${
                  isSelected ? "bg-amber-500/15 text-amber-400 font-bold" : "text-app-primary hover:bg-app-hover"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <OptIcon size={14} className={opt.color} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check size={14} className="text-amber-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export interface Service {
  id: string;
  title: string;
  price: number;
  oldPrice?: number | null;
  description?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  gallery?: string | null;
  badge?: string | null;
  tags?: string | null;
  prepTime?: string | null;
  weight?: string | null;
  fulfillment?: string | null;
  isAvailable?: boolean;
}

interface AdminServicesTabProps {
  services: Service[];
  selectedShop: any;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  isAddingService: boolean;
  setIsAddingService: (val: boolean) => void;
  editingService: Service | null;
  setEditingService: (srv: Service | null) => void;
  newServiceData: {
    title: string;
    price: string;
    oldPrice: string;
    description: string;
    category: string;
    badge: string;
    imageUrl: string;
    gallery?: string[];
    tags?: string;
    prepTime?: string;
    weight?: string;
    fulfillment?: string;
    isAvailable?: boolean;
  };
  setNewServiceData: React.Dispatch<React.SetStateAction<any>>;
  serviceError: string | null;
  categories: string[];
  handleCreateService: (e: React.FormEvent) => void;
  handleUpdateService: (e: React.FormEvent) => void;
  handleDeleteService: (id: string) => void;
  handleDuplicateService: (service: Service) => void;
  handleToggleAvailability: (id: string, isAvailable: boolean) => void;
}

export const AdminServicesTab: React.FC<AdminServicesTabProps> = ({
  services,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  isAddingService,
  setIsAddingService,
  editingService,
  setEditingService,
  newServiceData,
  setNewServiceData,
  serviceError,
  categories,
  handleCreateService,
  handleUpdateService,
  handleDeleteService,
  handleDuplicateService,
  handleToggleAvailability,
}) => {
  const [newGalleryInput, setNewGalleryInput] = useState("");

  const handleAddGalleryImage = (url: string) => {
    if (!url.trim()) return;
    setNewServiceData((prev: any) => ({
      ...prev,
      gallery: [...(prev.gallery || []), url.trim()],
    }));
    setNewGalleryInput("");
  };

  const handleRemoveGalleryImage = (index: number) => {
    setNewServiceData((prev: any) => ({
      ...prev,
      gallery: (prev.gallery || []).filter((_: any, i: number) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar - Hidden when creating or editing a service */}
      {!(isAddingService || editingService) && (
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-app-surface border border-app-border p-3.5 rounded-2xl shadow-sm">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию, тегам или описанию..."
              className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-8 py-2 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-primary cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === "ALL"
                    ? "bg-app-accent text-app-accent-fg shadow-sm"
                    : "bg-app-card border border-app-border text-app-muted hover:text-app-primary"
                }`}
              >
                Все ({services.length})
              </button>
              {categories.map((cat) => {
                const count = services.filter((s) => s.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-app-accent text-app-accent-fg shadow-sm"
                        : "bg-app-card border border-app-border text-app-muted hover:text-app-primary"
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Form: Add or Edit Service */}
      {isAddingService || editingService ? (
        <div className="max-w-4xl mx-auto bg-app-surface border border-app-border rounded-3xl p-6 sm:p-8 text-app-primary space-y-6 shadow-sm">
          <div className="flex justify-between items-center border-b border-app-border pb-4">
            <h3 className="text-base font-bold font-mono text-app-primary flex items-center gap-2">
              <Edit3 size={18} className="text-emerald-400" />
              {editingService ? "Редактировать услугу / товар" : "Новая услуга / товар"}
            </h3>
            <button
              onClick={() => {
                setIsAddingService(false);
                setEditingService(null);
              }}
              className="text-app-muted hover:text-app-primary p-1 rounded-lg cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {serviceError && (
            <div className="p-4 bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300 rounded-2xl text-xs flex items-center gap-2 font-mono font-medium">
              <AlertCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{serviceError}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              if (editingService) handleUpdateService(e);
              else handleCreateService(e);
            }}
            className="space-y-5 font-sans text-xs"
          >
            {/* Title & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Название позиции *
                </label>
                <input
                  type="text"
                  value={newServiceData.title}
                  onChange={(e) =>
                    setNewServiceData((s: any) => ({ ...s, title: e.target.value }))
                  }
                  placeholder="Например: Мужская стрижка + Укладка"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Категория
                </label>
                <input
                  type="text"
                  value={newServiceData.category || ""}
                  onChange={(e) =>
                    setNewServiceData((s: any) => ({ ...s, category: e.target.value }))
                  }
                  placeholder="Например: Стрижки"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
                />
              </div>
            </div>

            {/* Prices & Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Цена (₽) *
                </label>
                <input
                  type="number"
                  value={newServiceData.price}
                  onChange={(e) =>
                    setNewServiceData((s: any) => ({ ...s, price: e.target.value }))
                  }
                  placeholder="1500"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Старая цена (₽)
                </label>
                <input
                  type="number"
                  value={newServiceData.oldPrice || ""}
                  onChange={(e) =>
                    setNewServiceData((s: any) => ({ ...s, oldPrice: e.target.value }))
                  }
                  placeholder="2000"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Текст бейджа (ХИТ, -20%)
                </label>
                <input
                  type="text"
                  value={newServiceData.badge || ""}
                  onChange={(e) =>
                    setNewServiceData((s: any) => ({ ...s, badge: e.target.value }))
                  }
                  placeholder="ХИТ"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                />
              </div>
            </div>

            {/* Additional Info: Prep time, Weight, Fulfillment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Длительность / Время
                </label>
                <input
                  type="text"
                  value={newServiceData.prepTime || ""}
                  onChange={(e) =>
                    setNewServiceData((s: any) => ({ ...s, prepTime: e.target.value }))
                  }
                  placeholder="например: 45 мин"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Вес / Объём
                </label>
                <input
                  type="text"
                  value={newServiceData.weight || ""}
                  onChange={(e) =>
                    setNewServiceData((s: any) => ({ ...s, weight: e.target.value }))
                  }
                  placeholder="например: 350 г или 50 мл"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Формат получения
                </label>
                <FulfillmentCustomSelect
                  value={newServiceData.fulfillment || "courier,pickup"}
                  onChange={(val) =>
                    setNewServiceData((s: any) => ({ ...s, fulfillment: val }))
                  }
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                Теги (через запятую)
              </label>
              <input
                type="text"
                value={newServiceData.tags || ""}
                onChange={(e) =>
                  setNewServiceData((s: any) => ({ ...s, tags: e.target.value }))
                }
                placeholder="хит, подарок, новинка, акция"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                Описание
              </label>
              <textarea
                rows={3}
                value={newServiceData.description || ""}
                onChange={(e) =>
                  setNewServiceData((s: any) => ({ ...s, description: e.target.value }))
                }
                placeholder="Подробное описание услуги или товара..."
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent resize-none font-sans"
              />
            </div>

            {/* Main Image */}
            <div>
              <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                Главное фото
              </label>
              <ImageUploader
                value={newServiceData.imageUrl || ""}
                onChange={(url) =>
                  setNewServiceData((s: any) => ({ ...s, imageUrl: url }))
                }
                placeholder="Загрузите главное изображение"
              />
            </div>

            {/* Gallery Images */}
            <div className="space-y-3 pt-2 border-t border-app-border">
              <label className="block text-[11px] font-mono text-app-muted uppercase tracking-wider">
                Галерея дополнительных фото
              </label>

              {(newServiceData.gallery || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(newServiceData.gallery || []).map((imgUrl: string, idx: number) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded-xl overflow-hidden border border-app-border group bg-app-card shrink-0"
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-500 text-white rounded-lg opacity-80 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newGalleryInput}
                  onChange={(e) => setNewGalleryInput(e.target.value)}
                  placeholder="Вставьте URL картинки..."
                  className="flex-1 bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleAddGalleryImage(newGalleryInput)}
                  className="px-3.5 py-2 bg-app-card hover:bg-app-hover border border-app-border text-emerald-400 font-mono text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Добавить</span>
                </button>
              </div>
            </div>

            {/* Availability checkbox */}
            <div className="p-4 bg-app-card border border-app-border rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-mono font-bold text-xs text-app-primary">
                  Доступность для заказа
                </p>
                <p className="text-[11px] text-app-muted font-sans mt-0.5">
                  Если отключить, услуга будет скрыта из клиентского каталога
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={newServiceData.isAvailable !== false}
                  onChange={(e) =>
                    setNewServiceData((s: any) => ({ ...s, isAvailable: e.target.checked }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t border-app-border">
              <button
                type="button"
                onClick={() => {
                  setIsAddingService(false);
                  setEditingService(null);
                }}
                className="flex-1 py-2.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs rounded-xl transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-[2] py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all shadow-sm cursor-pointer uppercase tracking-wider"
              >
                {editingService ? "Сохранить изменения" : "Создать услугу"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Services Grid Display */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => {
            let galleryList: string[] = [];
            if (service.gallery) {
              try {
                galleryList = JSON.parse(service.gallery);
              } catch {
                galleryList = service.gallery.split(",").map((s) => s.trim()).filter(Boolean);
              }
            }

            return (
              <div
                key={service.id}
                className={`p-5 rounded-2xl bg-app-surface border border-app-border flex flex-col justify-between space-y-4 shadow-sm relative transition-all ${
                  !service.isAvailable ? "opacity-60" : ""
                }`}
              >
                <div className="space-y-3">
                  {/* Image */}
                  {service.imageUrl && (
                    <div className="h-36 rounded-xl overflow-hidden bg-app-card border border-app-border relative">
                      <img
                        src={service.imageUrl}
                        alt={service.title}
                        className="w-full h-full object-cover"
                      />
                      {service.badge && (
                        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-emerald-500 text-black font-mono text-[9px] font-bold rounded-md shadow-sm">
                          {service.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Header Title & Price */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {service.category && (
                          <span className="px-2 py-0.5 bg-app-card border border-app-border text-app-muted font-mono text-[9px] rounded-md">
                            {service.category}
                          </span>
                        )}
                        {service.tags && (
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 font-mono text-[9px] rounded-md">
                            {service.tags}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-app-primary font-sans pt-1">
                        {service.title}
                      </h4>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-sm text-emerald-400">
                        {service.price} ₽
                      </p>
                      {service.oldPrice && (
                        <p className="font-mono text-[10px] text-app-muted line-through">
                          {service.oldPrice} ₽
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {service.description && (
                    <p className="text-xs text-app-muted leading-relaxed font-sans line-clamp-2">
                      {service.description}
                    </p>
                  )}

                  {/* Meta Details: Prep time, Weight, Fulfillment */}
                  <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono text-app-muted">
                    {service.prepTime && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-app-card border border-app-border rounded-md">
                        <Clock size={11} className="text-amber-400" />
                        <span>{service.prepTime}</span>
                      </span>
                    )}
                    {service.weight && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-app-card border border-app-border rounded-md">
                        <Weight size={11} className="text-blue-400" />
                        <span>{service.weight}</span>
                      </span>
                    )}
                    {service.fulfillment && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-app-card border border-app-border rounded-md">
                        <Truck size={11} className="text-emerald-400" />
                        <span>
                          {service.fulfillment === "pickup"
                            ? "В заведении"
                            : service.fulfillment === "courier"
                            ? "Курьером"
                            : service.fulfillment === "online"
                            ? "Онлайн"
                            : "Доставка / Самовывоз"}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Gallery Thumbnails */}
                  {galleryList.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 overflow-x-auto scrollbar-none">
                      {galleryList.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover border border-app-border shrink-0"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-app-border flex items-center justify-between text-xs font-mono">
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleAvailability(service.id, !service.isAvailable)
                    }
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                      service.isAvailable
                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    {service.isAvailable ? (
                      <>
                        <CheckCircle2 size={11} />
                        <span>Доступен</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={11} />
                        <span>Скрыт</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDuplicateService(service)}
                      className="p-1.5 text-app-muted hover:text-app-primary rounded-lg hover:bg-app-card transition-colors cursor-pointer"
                      title="Дублировать"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingService(service);
                        let parsedGallery: string[] = [];
                        if (service.gallery) {
                          try {
                            parsedGallery = JSON.parse(service.gallery);
                          } catch {
                            parsedGallery = service.gallery
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                          }
                        }
                        setNewServiceData({
                          title: service.title,
                          price: String(service.price),
                          oldPrice: service.oldPrice ? String(service.oldPrice) : "",
                          description: service.description || "",
                          category: service.category || "",
                          badge: service.badge || "",
                          imageUrl: service.imageUrl || "",
                          gallery: parsedGallery,
                          tags: service.tags || "",
                          prepTime: service.prepTime || "",
                          weight: service.weight || "",
                          fulfillment: service.fulfillment || "courier,pickup",
                          isAvailable: service.isAvailable !== false,
                        });
                      }}
                      className="p-1.5 text-app-muted hover:text-app-primary rounded-lg hover:bg-app-card transition-colors cursor-pointer"
                      title="Редактировать"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(service.id)}
                      className="p-1.5 text-app-muted hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Удалить"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
