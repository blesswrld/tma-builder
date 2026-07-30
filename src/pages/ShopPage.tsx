import React, { useEffect, useState, FormEvent } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Minus, X, Check, Search, ShoppingBag, ArrowRight, Star, Clock, 
  MapPin, Phone as PhoneIcon, Receipt, Sparkles, Tag, ChevronRight, 
  Info, ShieldCheck, CornerDownRight, Store, AlertCircle, ShoppingCart
} from "lucide-react";
import NotFoundPage from "./NotFoundPage";
import { useRealtime, useRealtimeEvent } from "../context/RealtimeContext";

declare global {
  interface Window {
    Telegram?: any;
  }
}

interface Service {
  id: string;
  title: string;
  price: number;
  description: string | null;
  category?: string | null;
  isAvailable?: boolean;
}

interface Shop {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  workingHours?: string | null;
  address?: string | null;
  phone?: string | null;
  isOpen?: boolean;
  cashbackPercent?: number;
  services: Service[];
}

interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  badge?: string | null;
  bgGradient?: string | null;
}

interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment?: string | null;
  reply?: string | null;
  createdAt: string;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  items: string; // JSON
  totalPrice: number;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>();
  
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "Подтвердить",
    cancelText: "Отмена",
    isDangerous: true
  });

  // Custom Toast Notifications State
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    type: "success" | "error" | "warning";
  }>>([]);

  const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const requestConfirm = (title: string, message: string, onConfirm: () => void, confirmText = "Подтвердить", isDangerous = true) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      confirmText,
      cancelText: "Отмена",
      isDangerous
    });
  };
  
  const [banners, setBanners] = useState<Banner[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [promocodeInput, setPromocodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent: number; discountAmount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsStats, setReviewsStats] = useState({ totalReviews: 0, avgRating: 5.0 });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newReview, setNewReview] = useState({ name: "", rating: 5, comment: "" });
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [showInfoModal, setShowInfoModal] = useState(false);

  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    tableNumber: "",
    preferredTime: "",
    note: ""
  });
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; general?: string }>({});
  const [orderSuccess, setOrderSuccess] = useState(false);

  const { subscribeShop } = useRealtime();
  const isAnyShopModalOpen = Boolean(isCheckoutOpen || isMyOrdersOpen || isReviewsOpen || showInfoModal);

  useEffect(() => {
    if (isAnyShopModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAnyShopModalOpen]);

  useEffect(() => {
    if (shop?.id) subscribeShop(shop.id);
  }, [shop?.id, subscribeShop]);

  useRealtimeEvent("SHOP_UPDATED", (event) => {
    if (event.payload && event.payload.id === shop?.id) {
      setShop(prev => prev ? { ...prev, ...event.payload } : prev);
    }
  });

  useRealtimeEvent("SERVICE_CREATED", (event) => {
    if (event.payload && event.shopId === shop?.id) {
      setShop(prev => prev ? {
        ...prev,
        services: [event.payload, ...prev.services.filter(s => s.id !== event.payload.id)]
      } : prev);
    }
  });

  useRealtimeEvent("SERVICE_UPDATED", (event) => {
    if (event.payload && event.shopId === shop?.id) {
      setShop(prev => prev ? {
        ...prev,
        services: prev.services.map(s => s.id === event.payload.id ? { ...s, ...event.payload } : s)
      } : prev);
    }
  });

  useRealtimeEvent("SERVICE_DELETED", (event) => {
    if (event.payload?.id && event.shopId === shop?.id) {
      setShop(prev => prev ? {
        ...prev,
        services: prev.services.filter(s => s.id !== event.payload.id)
      } : prev);
    }
  });

  useRealtimeEvent("ORDER_STATUS_UPDATED", (event) => {
    if (event.payload?.id) {
      setMyOrders(prev => prev.map(o => o.id === event.payload.id ? { ...o, status: event.payload.status } : o));
    }
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tableFromUrl = urlParams.get("table") || urlParams.get("t") || urlParams.get("tableNumber");
    if (tableFromUrl) {
      setFormData(prev => ({ ...prev, tableNumber: tableFromUrl }));
    }

    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      if (user?.first_name) {
        setFormData(prev => ({ ...prev, name: user.first_name + (user.last_name ? ` ${user.last_name}` : '') }));
      }
    }

    const fetchShop = async () => {
      try {
        const res = await fetch(`/api/shops/${slug}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to load shop");
        const data = await res.json();
        setShop(data);

        if (data.id) {
          fetch(`/api/shops/${data.id}/banners`)
            .then(r => r.ok ? r.json() : [])
            .then(bData => setBanners(bData))
            .catch(() => {});
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchShop();
  }, [slug]);

  if (notFound) return <NotFoundPage />;

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center gap-3 text-app-muted font-sans">
        <div className="w-6 h-6 border-2 border-app-border border-t-app-primary rounded-full animate-spin"></div>
        <p className="text-xs font-mono tracking-wider text-app-muted uppercase">Загрузка витрины...</p>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center p-6 text-app-secondary font-sans">
        <div className="max-w-md w-full p-6 rounded-2xl bg-app-surface border border-app-border text-center space-y-4">
          <AlertCircle size={32} className="mx-auto text-app-muted" />
          <p className="text-sm text-app-secondary">{error || "Магазин не найден."}</p>
        </div>
      </div>
    );
  }

  const handleAddToCart = (serviceId: string) => {
    setCart(prev => ({ ...prev, [serviceId]: (prev[serviceId] || 0) + 1 }));
  };

  const handleRemoveFromCart = (serviceId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if ((newCart[serviceId] || 0) > 1) {
        newCart[serviceId] = newCart[serviceId] - 1;
      } else {
        delete newCart[serviceId];
      }
      return newCart;
    });
  };

  const totalItems: number = (Object.values(cart) as number[]).reduce((sum, qty) => sum + qty, 0);
  const totalPrice: number = Object.entries(cart).reduce((sum: number, [id, qty]: [string, number]) => {
    const service = shop.services.find(s => s.id === id);
    return sum + (service?.price || 0) * Number(qty);
  }, 0);

  let discountValue = 0;
  if (appliedPromo) {
    if (appliedPromo.discountPercent > 0) {
      discountValue = Math.round((totalPrice * appliedPromo.discountPercent) / 100);
    } else if (appliedPromo.discountAmount > 0) {
      discountValue = Math.min(totalPrice, appliedPromo.discountAmount);
    }
  }
  const finalTotalPrice = Math.max(0, totalPrice - discountValue);

  const handleValidatePromo = async () => {
    if (!promocodeInput.trim() || !shop) return;
    setPromoError(null);
    setIsValidatingPromo(true);
    try {
      const res = await fetch("/api/promocodes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: shop.id, code: promocodeInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Недействительный промокод");
      setAppliedPromo({
        code: data.code,
        discountPercent: data.discountPercent,
        discountAmount: data.discountAmount
      });
      setPromoError(null);
      showToast("Промокод успешно применен!", "success");
    } catch (err: any) {
      setPromoError(err.message);
      setAppliedPromo(null);
      showToast(err.message, "error");
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const fetchReviews = async () => {
    if (!shop?.id) return;
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/shops/${shop.id}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setReviewsStats(data.stats || { totalReviews: 0, avgRating: 5.0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleOpenReviews = () => {
    setIsReviewsOpen(true);
    fetchReviews();
  };

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!newReview.name.trim() || !shop) return;
    setIsSubmittingReview(true);
    setReviewSubmitError(null);
    try {
      const res = await fetch(`/api/shops/${shop.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: newReview.name.trim(),
          rating: newReview.rating,
          comment: newReview.comment.trim()
        })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to submit");
      }
      setReviewSubmitSuccess(true);
      setNewReview({ name: "", rating: 5, comment: "" });
      fetchReviews();
      showToast("Отзыв успешно опубликован! Спасибо!", "success");
    } catch (err: any) {
      setReviewSubmitError(err.message);
      showToast(err.message, "error");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const fetchMyOrders = async () => {
    if (!shop?.id) return;
    setMyOrdersLoading(true);
    try {
      const storageKey = `my_orders_${shop.id}`;
      const savedIds = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (savedIds.length === 0) {
        setMyOrders([]);
        setMyOrdersLoading(false);
        return;
      }
      const res = await fetch(`/api/shops/${shop.id}/my-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: savedIds })
      });
      if (res.ok) {
        const data = await res.json();
        setMyOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMyOrdersLoading(false);
    }
  };

  const handleOpenMyOrders = () => {
    setIsMyOrdersOpen(true);
    fetchMyOrders();
  };

  const handleReorder = (order: Order) => {
    try {
      const items = JSON.parse(order.items);
      if (Array.isArray(items)) {
        const newCart: Record<string, number> = {};
        items.forEach((item: any) => {
          if (item.id) {
            newCart[item.id] = (newCart[item.id] || 0) + (item.quantity || 1);
          }
        });
        setCart(prev => ({ ...prev, ...newCart }));
        setIsMyOrdersOpen(false);
        setIsCheckoutOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const validateForm = () => {
    const errors: { name?: string; phone?: string } = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = "Укажите ваше имя";
    }
    const cleanPhone = formData.phone.trim();
    if (!cleanPhone) {
      errors.phone = "Укажите номер телефона";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    const items = Object.entries(cart).map(([id, qty]: [string, number]) => {
      const service = shop.services.find(s => s.id === id);
      return {
        id,
        title: service?.title,
        price: service?.price,
        quantity: qty
      };
    });

    try {
      const fullNote = appliedPromo
        ? `${formData.note ? `${formData.note.trim()} | ` : ''}Промокод: ${appliedPromo.code}`
        : (formData.note.trim() || undefined);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shop.id,
          customerName: formData.name.trim(),
          customerPhone: formData.phone.trim(),
          tableNumber: formData.tableNumber.trim() || undefined,
          preferredTime: formData.preferredTime.trim() || undefined,
          note: fullNote,
          items,
          totalPrice: finalTotalPrice
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось создать заказ");

      if (shop?.id && data.id) {
        try {
          const storageKey = `my_orders_${shop.id}`;
          const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
          if (!existing.includes(data.id)) {
            localStorage.setItem(storageKey, JSON.stringify([data.id, ...existing]));
          }
        } catch (e) {}
      }

      setOrderSuccess(true);
      setCart({});
      showToast("Заказ успешно оформлен!", "success");
    } catch (err: any) {
      setFormErrors({ general: err.message });
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishOrder = () => {
    setOrderSuccess(false);
    setIsCheckoutOpen(false);
    setCart({});
    try {
      if (window.Telegram?.WebApp?.close) {
        window.Telegram.WebApp.close();
      }
    } catch (e) {}
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center p-6 text-app-primary font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full p-8 rounded-3xl bg-app-surface border border-app-border text-center space-y-6 shadow-2xl"
        >
          <div className="w-16 h-16 bg-app-accent text-app-bg rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Check size={28} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-app-primary">Заказ принят</h2>
            <p className="text-app-secondary text-xs leading-relaxed">
              Ваш заказ обрабатывается в {shop.name}. Отслеживайте статус во вкладке «Заказы».
            </p>
          </div>
          <button
            onClick={handleFinishOrder}
            className="w-full h-11 bg-app-accent text-app-bg font-semibold text-xs rounded-xl hover:bg-app-hover transition-all uppercase tracking-wider font-mono"
          >
            Готово
          </button>
        </motion.div>
      </div>
    );
  }

  const allServices = shop.services || [];
  const categories = Array.from(new Set(allServices.map(s => s.category).filter(Boolean))) as string[];
  const filteredServices = allServices.filter(service => {
    const matchesCategory = selectedCategory === "ALL" || service.category === selectedCategory;
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-app-bg text-app-primary font-sans pb-32">
      {/* Sleek Vercel / Linear Top Header */}
      <header className="sticky top-0 z-40 bg-app-bg/80 backdrop-blur-xl border-b border-app-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-app-card border border-app-border flex items-center justify-center font-mono font-bold text-sm text-app-primary shrink-0">
              {shop.logoUrl ? (
                <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                shop.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-app-primary">{shop.name}</h1>
                <span className={`w-2 h-2 rounded-full ${shop.isOpen !== false ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-rose-500"}`} />
              </div>
              <p className="text-[11px] text-app-muted font-mono truncate max-w-[180px] sm:max-w-xs">
                {shop.workingHours || (shop.isOpen !== false ? "Открыто" : "Закрыто")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfoModal(true)}
              className="p-2 text-app-muted hover:text-app-primary hover:bg-app-hover rounded-xl transition-all border border-transparent hover:border-app-border"
              title="Информация и контакты"
            >
              <Info size={16} />
            </button>
            <button
              onClick={handleOpenReviews}
              className="px-3 py-1.5 rounded-xl bg-app-surface border border-app-border hover:border-app-border text-xs text-app-secondary hover:text-app-primary transition-all flex items-center gap-1.5 font-mono"
            >
              <Star size={13} className="text-amber-500 fill-amber-500" />
              <span>Отзывы</span>
            </button>
            <button
              onClick={handleOpenMyOrders}
              className="px-3 py-1.5 rounded-xl bg-app-surface border border-app-border hover:border-app-border text-xs text-app-secondary hover:text-app-primary transition-all flex items-center gap-1.5 font-mono"
            >
              <Receipt size={13} className="text-app-muted" />
              <span>Заказы</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Banners Carousel / Highlight Cards */}
        {banners.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {banners.map(banner => (
              <div 
                key={banner.id}
                className="relative overflow-hidden p-6 rounded-2xl bg-app-card border border-app-border space-y-2 group"
              >
                {banner.badge && (
                  <span className="inline-block px-2.5 py-0.5 bg-app-badge text-app-primary font-mono text-[10px] rounded-full uppercase tracking-wider border border-app-border">
                    {banner.badge}
                  </span>
                )}
                <h3 className="text-base font-bold text-app-primary tracking-tight">{banner.title}</h3>
                {banner.subtitle && (
                  <p className="text-xs text-app-secondary leading-relaxed">{banner.subtitle}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Catalog Control Bar */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-app-border pb-4">
            {/* Category Pill Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
              <button
                onClick={() => setSelectedCategory("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium font-mono transition-all shrink-0 border ${
                  selectedCategory === "ALL"
                    ? "bg-app-accent text-app-bg border-app-border font-bold shadow-sm"
                    : "bg-app-surface text-app-muted border-app-border hover:text-app-primary"
                }`}
              >
                Все
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 border ${
                    selectedCategory === cat
                      ? "bg-app-accent text-app-bg border-app-border shadow-sm font-semibold"
                      : "bg-app-surface text-app-muted border-app-border hover:text-app-primary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64 shrink-0">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск по каталогу..."
                className="w-full bg-app-surface border border-app-border text-xs rounded-xl pl-9 pr-4 py-2 text-app-primary focus:outline-none focus:border-app-border transition-colors placeholder:text-app-muted font-sans"
              />
            </div>
          </div>

          {/* Product Items List */}
          {filteredServices.length === 0 ? (
            <div className="py-20 text-center bg-app-surface border border-dashed border-app-border rounded-2xl space-y-2">
              <ShoppingCart size={28} className="mx-auto text-app-muted" />
              <p className="text-app-muted text-xs font-mono">По вашему запросу ничего не найдено.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map(service => {
                const qty = cart[service.id] || 0;
                const isOutOfStock = service.isAvailable === false;
                
                return (
                  <motion.div 
                    key={service.id} 
                    layout
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between min-h-[160px] group ${
                      isOutOfStock 
                        ? "bg-app-surface/50 border-app-border/40 opacity-50" 
                        : "bg-app-surface border-app-border hover:border-app-border hover:bg-app-card-hover"
                    }`}
                  >
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-start gap-3">
                        <h3 className={`text-sm font-semibold tracking-tight ${isOutOfStock ? "text-app-muted" : "text-app-primary"}`}>
                          {service.title}
                        </h3>
                        <span className="text-xs font-mono font-bold text-app-primary px-2 py-1 rounded-lg bg-app-card border border-app-border shrink-0">
                          {service.price} ₽
                        </span>
                      </div>
                      {service.description && (
                        <p className="text-app-secondary text-xs leading-relaxed line-clamp-3 font-normal">
                          {service.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-auto pt-4 border-t border-app-border">
                      {service.category ? (
                        <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider">
                          {service.category}
                        </span>
                      ) : <div />}

                      <div>
                        {isOutOfStock ? (
                          <span className="text-xs text-app-muted font-mono">Недоступно</span>
                        ) : qty > 0 ? (
                          <div className="flex items-center gap-2 bg-app-card rounded-xl p-1 border border-app-border">
                            <button 
                              onClick={() => handleRemoveFromCart(service.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-app-secondary text-app-primary hover:bg-app-hover transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-xs font-mono font-bold w-5 text-center text-app-primary">{qty}</span>
                            <button 
                              onClick={() => handleAddToCart(service.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-app-accent text-app-bg hover:bg-app-hover transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleAddToCart(service.id)}
                            className="px-4 py-1.5 rounded-xl bg-app-accent text-app-bg font-medium text-xs hover:bg-app-hover transition-all font-mono"
                          >
                            + Добавить
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Floating Bottom Bar for Cart / Checkout */}
      {totalItems > 0 && !isCheckoutOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4">
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full h-13 bg-app-accent text-app-bg rounded-2xl flex items-center justify-between px-5 shadow-2xl hover:scale-[1.01] transition-transform font-mono border border-app-border"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-app-secondary text-app-primary rounded-lg flex items-center justify-center text-xs font-bold border border-app-border">
                {totalItems}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider">Оформить заказ</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{totalPrice} ₽</span>
              <ArrowRight size={16} />
            </div>
          </button>
        </div>
      )}

      {/* Slide-over Checkout Drawer */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md z-50"
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} 
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-app-modal border-l border-app-border z-50 flex flex-col shadow-2xl text-app-primary font-sans"
            >
              <div className="h-16 flex items-center justify-between px-6 border-b border-app-border bg-app-modal-header">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} className="text-app-muted" />
                  <h2 className="text-sm font-semibold tracking-tight text-app-primary">Корзина</h2>
                </div>
                <button onClick={() => setIsCheckoutOpen(false)} className="text-app-muted hover:text-app-primary transition-colors">
                  <X size={18} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h3 className="text-[10px] font-mono text-app-muted uppercase tracking-wider mb-3">Товары</h3>
                  <div className="space-y-3">
                    {Object.entries(cart).map(([id, qty]) => {
                      const service = shop.services.find(s => s.id === id);
                      if (!service) return null;
                      return (
                        <div key={id} className="flex justify-between items-center text-xs p-3 rounded-xl bg-app-card border border-app-border">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-app-muted">{qty}×</span>
                            <span className="font-medium text-app-primary">{service.title}</span>
                          </div>
                          <span className="font-mono font-semibold text-app-primary">{service.price * Number(qty)} ₽</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Promocode section */}
                  <div className="mt-6 pt-4 border-t border-app-border space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promocodeInput}
                        onChange={e => setPromocodeInput(e.target.value.toUpperCase())}
                        placeholder="Промокод"
                        className="flex-1 bg-app-input border border-app-border rounded-xl px-3 py-2 text-xs text-app-primary focus:outline-none focus:border-app-border font-mono uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleValidatePromo}
                        disabled={isValidatingPromo || !promocodeInput.trim()}
                        className="px-4 bg-app-secondary hover:bg-app-hover text-app-primary text-xs rounded-xl transition-colors disabled:opacity-50 font-mono"
                      >
                        Применить
                      </button>
                    </div>
                    {promoError && <p className="text-xs text-rose-400 font-mono">{promoError}</p>}
                    {appliedPromo && (
                      <div className="flex justify-between items-center text-xs font-mono text-emerald-500">
                        <span>Промокод {appliedPromo.code} применён</span>
                        <span>-{discountValue} ₽</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-app-border flex justify-between items-center font-mono">
                    <span className="text-xs text-app-muted uppercase">Итого</span>
                    <span className="text-lg font-bold text-app-primary">{finalTotalPrice} ₽</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-mono text-app-muted uppercase tracking-wider mb-3">Данные заказа</h3>
                  {formErrors.general && (
                    <div className="mb-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-mono">
                      {formErrors.general}
                    </div>
                  )}
                  <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-3">
                    <div>
                      <input 
                        type="text" 
                        value={formData.name} 
                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} 
                        placeholder="Ваше имя *" 
                        className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors" 
                      />
                      {formErrors.name && <p className="text-[11px] text-rose-400 mt-1 font-mono">{formErrors.name}</p>}
                    </div>
                    <div>
                      <input 
                        type="tel" 
                        value={formData.phone} 
                        onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} 
                        placeholder="Номер телефона *" 
                        className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors font-mono" 
                      />
                      {formErrors.phone && <p className="text-[11px] text-rose-400 mt-1 font-mono">{formErrors.phone}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        value={formData.tableNumber} 
                        onChange={e => setFormData(p => ({ ...p, tableNumber: e.target.value }))} 
                        placeholder="№ стола (опционально)" 
                        className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors" 
                      />
                      <input 
                        type="text" 
                        value={formData.preferredTime} 
                        onChange={e => setFormData(p => ({ ...p, preferredTime: e.target.value }))} 
                        placeholder="Время (опционально)" 
                        className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors" 
                      />
                    </div>
                    <textarea 
                      rows={2} 
                      value={formData.note} 
                      onChange={e => setFormData(p => ({ ...p, note: e.target.value }))} 
                      placeholder="Комментарий к заказу..." 
                      className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors resize-none" 
                    />
                  </form>
                </div>
              </div>
              
              <div className="p-6 border-t border-app-border bg-app-bg">
                <button
                  form="checkout-form"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-app-accent text-app-bg font-semibold text-xs rounded-xl hover:bg-app-hover transition-colors disabled:opacity-50 flex items-center justify-center font-mono uppercase tracking-wider"
                >
                  {isSubmitting ? "Обработка..." : `Подтвердить заказ (${finalTotalPrice} ₽)`}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* My Orders Slide-over */}
      <AnimatePresence>
        {isMyOrdersOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMyOrdersOpen(false)} className="fixed inset-0 bg-black/75 backdrop-blur-md z-50" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 220 }} className="fixed inset-y-0 right-0 w-full max-w-md bg-app-modal border-l border-app-border z-50 flex flex-col shadow-2xl text-app-primary font-sans">
              <div className="h-16 flex items-center justify-between px-6 border-b border-app-border bg-app-modal-header">
                <h2 className="text-sm font-semibold tracking-tight text-app-primary">История заказов</h2>
                <button onClick={() => setIsMyOrdersOpen(false)} className="text-app-muted hover:text-app-primary transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {myOrdersLoading ? (
                  <p className="text-app-muted text-xs font-mono text-center py-10">Загрузка заказов...</p>
                ) : myOrders.length === 0 ? (
                  <p className="text-app-muted text-xs font-mono text-center py-10">История заказов пуста.</p>
                ) : (
                  myOrders.map(order => (
                    <div key={order.id} className="p-4 border border-app-border rounded-2xl bg-app-card space-y-3">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-app-muted">#{order.id.slice(-6)}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold ${
                          order.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' :
                          order.status === 'CONFIRMED' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                          order.status === 'CANCELLED' ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' :
                          'bg-app-secondary text-app-secondary'
                        }`}>
                          {order.status === 'COMPLETED' ? 'ВЫПОЛНЕН' :
                           order.status === 'CONFIRMED' ? 'ПОДТВЕРЖДЁН' :
                           order.status === 'CANCELLED' ? 'ОТМЕНЁН' : 'В ОБРАБОТКЕ'}
                        </span>
                      </div>
                      <div className="text-base font-bold font-mono text-app-primary">{order.totalPrice} ₽</div>
                      <button onClick={() => handleReorder(order)} className="w-full py-2 bg-app-secondary hover:bg-app-hover rounded-xl text-xs font-mono text-app-primary transition-colors">
                        Повторить заказ
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reviews Slide-over */}
      <AnimatePresence>
        {isReviewsOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReviewsOpen(false)} className="fixed inset-0 bg-black/75 backdrop-blur-md z-50" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 220 }} className="fixed inset-y-0 right-0 w-full max-w-md bg-app-modal border-l border-app-border z-50 flex flex-col shadow-2xl text-app-primary font-sans">
              <div className="h-16 flex items-center justify-between px-6 border-b border-app-border bg-app-modal-header">
                <h2 className="text-sm font-semibold text-app-primary">Отзывы ({reviewsStats.totalReviews})</h2>
                <button onClick={() => setIsReviewsOpen(false)} className="text-app-muted hover:text-app-primary transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <form onSubmit={handleSubmitReview} className="space-y-3 p-4 border border-app-border rounded-2xl bg-app-card">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-app-muted font-mono">Оставить отзыв</h3>
                  {reviewSubmitError && <p className="text-xs text-rose-400 font-mono">{reviewSubmitError}</p>}
                  {reviewSubmitSuccess && <p className="text-xs text-emerald-500 font-mono">Спасибо за ваш отзыв!</p>}
                  <input type="text" value={newReview.name} onChange={e => setNewReview(p => ({ ...p, name: e.target.value }))} placeholder="Ваше имя" className="w-full bg-app-input border border-app-border rounded-xl px-3 py-2 text-xs text-app-primary focus:outline-none focus:border-app-border" />
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(r => (
                      <button key={r} type="button" onClick={() => setNewReview(p => ({ ...p, rating: r }))} className={`w-8 h-8 rounded-lg border text-xs font-mono flex items-center justify-center transition-colors ${newReview.rating >= r ? "bg-app-accent text-app-bg border-app-border font-bold" : "bg-app-surface text-app-muted border-app-border"}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <textarea rows={3} value={newReview.comment} onChange={e => setNewReview(p => ({ ...p, comment: e.target.value }))} placeholder="Поделитесь впечатлениями..." className="w-full bg-app-input border border-app-border rounded-xl px-3 py-2 text-xs text-app-primary focus:outline-none focus:border-app-border resize-none" />
                  <button type="submit" disabled={isSubmittingReview || !newReview.name.trim()} className="w-full py-2 bg-app-accent text-app-bg text-xs font-bold font-mono uppercase rounded-xl hover:bg-app-hover transition-colors disabled:opacity-50">
                    Отправить отзыв
                  </button>
                </form>

                <div className="space-y-3">
                  {reviewsLoading ? (
                    <p className="text-app-muted text-xs font-mono text-center">Загрузка...</p>
                  ) : reviews.length === 0 ? (
                    <p className="text-app-muted text-xs font-mono text-center">Отзывов пока нет.</p>
                  ) : (
                    reviews.map(rev => (
                      <div key={rev.id} className="p-4 border border-app-border rounded-2xl bg-app-card">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-app-primary">{rev.customerName}</span>
                          <span className="text-xs text-amber-500 font-mono">★ {rev.rating}</span>
                        </div>
                        {rev.comment && <p className="text-xs text-app-secondary leading-relaxed">{rev.comment}</p>}
                        {rev.reply && (
                          <div className="mt-3 p-2.5 bg-app-surface rounded-xl border border-app-border text-xs">
                            <p className="text-[10px] text-app-muted font-mono uppercase mb-0.5">Ответ заведения</p>
                            <p className="text-app-secondary">{rev.reply}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Info & Contacts Modal */}
      <AnimatePresence>
        {showInfoModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full bg-app-modal border border-app-border rounded-3xl p-6 text-app-primary space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-app-border pb-3 bg-app-modal-header -mx-6 -mt-6 p-6 rounded-t-3xl mb-2">
                <h3 className="text-sm font-semibold tracking-tight text-app-primary">О заведении {shop.name}</h3>
                <button onClick={() => setShowInfoModal(false)} className="text-app-muted hover:text-app-primary">
                  <X size={18} />
                </button>
              </div>

              {shop.description && (
                <p className="text-xs text-app-secondary leading-relaxed">{shop.description}</p>
              )}

              <div className="space-y-3 pt-2 text-xs text-app-secondary font-mono">
                {shop.workingHours && (
                  <div className="flex items-center gap-2.5">
                    <Clock size={14} className="text-app-muted" />
                    <span>{shop.workingHours}</span>
                  </div>
                )}
                {shop.address && (
                  <div className="flex items-center gap-2.5">
                    <MapPin size={14} className="text-app-muted" />
                    <span>{shop.address}</span>
                  </div>
                )}
                {shop.phone && (
                  <div className="flex items-center gap-2.5">
                    <PhoneIcon size={14} className="text-app-muted" />
                    <span>{shop.phone}</span>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowInfoModal(false)}
                className="w-full py-2.5 bg-app-secondary hover:bg-app-hover text-app-primary font-mono text-xs font-semibold rounded-xl transition-colors"
              >
                Закрыть
              </button>
            </motion.div>
          </div>
        )}
       </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="max-w-sm w-full bg-[#141416] border border-app-border rounded-2xl p-6 text-app-primary shadow-2xl space-y-5"
            >
              <div className="space-y-2">
                <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                  <AlertCircle size={16} className={confirmModal.isDangerous ? "text-rose-500" : "text-amber-500"} />
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-app-secondary leading-relaxed font-sans">
                  {confirmModal.message}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-[#1c1c20] border border-app-border text-app-secondary rounded-xl hover:bg-app-hover text-xs font-mono transition-colors"
                >
                  {confirmModal.cancelText || "Отмена"}
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold text-white transition-colors ${
                    confirmModal.isDangerous 
                      ? "bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-900/20" 
                      : "bg-[#1c1c20] border border-app-border hover:bg-app-hover"
                  }`}
                >
                  {confirmModal.confirmText || "Подтвердить"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notifications System */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`p-4 rounded-xl border shadow-lg pointer-events-auto flex items-start gap-3 backdrop-blur-md ${
                toast.type === "success" 
                  ? "bg-[#0b2518]/90 text-emerald-200 border-emerald-800/40" 
                  : toast.type === "error" 
                  ? "bg-[#2d0f13]/90 text-rose-200 border-rose-800/40" 
                  : "bg-[#2d210f]/90 text-amber-200 border-amber-800/40"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {toast.type === "success" ? (
                  <Check size={14} className="text-emerald-400" />
                ) : toast.type === "error" ? (
                  <AlertCircle size={14} className="text-rose-400" />
                ) : (
                  <AlertCircle size={14} className="text-amber-400" />
                )}
              </div>
              <p className="text-xs font-sans leading-relaxed">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
