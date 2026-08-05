import React, { useEffect, useState, FormEvent } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Minus, X, Check, Search, ShoppingBag, ArrowRight, Star, Clock, Scale,
  MapPin, Phone as PhoneIcon, Receipt, Sparkles, Tag, ChevronRight, 
  Info, ShieldCheck, CornerDownRight, Store, AlertCircle, ShoppingCart,
  Heart, Sun, Moon, Send, MessageSquare, ExternalLink, ThumbsUp,
  User, CheckCircle2, MessageCircle, Filter, BarChart2,
  Gift, Truck, Globe, CreditCard, Navigation
} from "lucide-react";
import NotFoundPage from "./NotFoundPage";
import { ShopPageSkeleton, ReviewSkeletonList, SpinnerLoader } from "../components/Skeleton";
import { useRealtime, useRealtimeEvent } from "../context/RealtimeContext";
import { useTheme } from "../context/ThemeContext";
import { jsPDF } from "jspdf";
import { validateCustomerName, validateCisPhone } from "../lib/validation";

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof window !== "undefined" ? window.btoa(binary) : Buffer.from(binary, "binary").toString("base64");
};

declare global {
  interface Window {
    Telegram?: any;
  }
}

interface Service {
  id: string;
  title: string;
  price: number;
  oldPrice?: number | null;
  description: string | null;
  category?: string | null;
  imageUrl?: string | null;
  gallery?: string | null;
  badge?: string | null;
  tags?: string | null;
  prepTime?: string | null;
  weight?: string | null;
  isAvailable?: boolean;
  fulfillment?: string | null;
}

interface Shop {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl?: string | null;
  workingHours?: string | null;
  address?: string | null;
  phone?: string | null;
  currency?: string | null;
  currencySymbol?: string | null;
  socialLinks?: string | null;
  deliveryOptions?: string | null;
  paymentInstructions?: string | null;
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

const parseSocialLinks = (jsonStr?: string | null) => {
  if (!jsonStr) return {};
  try {
    return JSON.parse(jsonStr) as { telegram?: string; instagram?: string; whatsapp?: string; vk?: string; website?: string };
  } catch {
    return {};
  }
};

const parseDeliveryOptions = (jsonStr?: string | null) => {
  if (!jsonStr) return {};
  try {
    return JSON.parse(jsonStr) as {
      pickup?: boolean;
      courier?: boolean;
      shipping?: boolean;
      minOrder?: string | number;
      deliveryFee?: string | number;
      pickupAddress?: string;
      deliveryMinOrder?: number | string;
      deliveryFeeVal?: number | string;
      freeDeliveryThreshold?: number | string;
    };
  } catch {
    return {};
  }
};

export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>();
  const { theme, toggleTheme } = useTheme();
  
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (shop?.id) {
      try {
        const savedFavs = JSON.parse(localStorage.getItem(`fav_${shop.id}`) || "[]");
        setFavorites(savedFavs);
      } catch (e) {}
    }
  }, [shop?.id]);

  const toggleFavorite = (id: string) => {
    if (!shop?.id) return;
    const isFav = favorites.includes(id);
    const updated = isFav ? favorites.filter(item => item !== id) : [...favorites, id];
    setFavorites(updated);
    try {
      localStorage.setItem(`fav_${shop.id}`, JSON.stringify(updated));
    } catch (e) {}
    showToast(
      !isFav ? "Добавлено в избранное ❤️" : "Удалено из избранного",
      "success"
    );
  };

  // Product Customizer Detail Modal State
  const [selectedServiceDetail, setSelectedServiceDetail] = useState<Service | null>(null);
  const [detailItemNote, setDetailItemNote] = useState("");

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
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tipping options
  const [tipPercent, setTipPercent] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>("");

  const [promocodeInput, setPromocodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent: number; discountAmount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsStats, setReviewsStats] = useState({ totalReviews: 0, avgRating: 5.0 });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newReview, setNewReview] = useState({ name: "", rating: 5, comment: "" });
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [filterStar, setFilterStar] = useState<number | "ALL">("ALL");
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
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
    deliveryAddress: "",
    tableNumber: "",
    preferredTime: "",
    note: ""
  });
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"courier" | "pickup">("courier");
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; deliveryAddress?: string; general?: string }>({});
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastOrderReceipt, setLastOrderReceipt] = useState<any>(null);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const generateReceiptPDF = async (receiptData: any) => {
    setIsDownloadingPDF(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Fetch Roboto font for Cyrillic support
      const fontRes = await fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf");
      if (!fontRes.ok) throw new Error("Не удалось загрузить стандартный шрифт");
      const arrayBuffer = await fontRes.arrayBuffer();
      const base64Font = arrayBufferToBase64(arrayBuffer);

      doc.addFileToVFS("Roboto-Regular.ttf", base64Font);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");

      // Also fetch Roboto-Medium.ttf for bold elements
      const boldFontRes = await fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf");
      if (boldFontRes.ok) {
        const boldArrayBuffer = await boldFontRes.arrayBuffer();
        const boldBase64Font = arrayBufferToBase64(boldArrayBuffer);
        doc.addFileToVFS("Roboto-Medium.ttf", boldBase64Font);
        doc.addFont("Roboto-Medium.ttf", "Roboto", "bold");
      }

      doc.setFont("Roboto", "normal");

      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 25;

      // Outer Border Frame
      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(0.5);
      doc.rect(15, 15, pageWidth - 30, doc.internal.pageSize.getHeight() - 30);

      // Decorative header bar
      doc.setFillColor(15, 23, 42);
      doc.rect(15, 15, pageWidth - 30, 8, "F");

      // Shop Name
      doc.setFont("Roboto", "bold");
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text(receiptData.shopName.toUpperCase(), pageWidth / 2, y + 8, { align: "center" });
      
      y += 16;

      // Subtitle / Address & Phone
      doc.setFont("Roboto", "normal");
      doc.setFontSize(9);
      doc.setTextColor(113, 113, 122);
      let shopInfo = "";
      if (receiptData.shopAddress) shopInfo += receiptData.shopAddress;
      if (receiptData.shopPhone) shopInfo += (shopInfo ? " | Тел: " : "Тел: ") + receiptData.shopPhone;
      if (shopInfo) {
        doc.text(shopInfo, pageWidth / 2, y, { align: "center" });
        y += 5;
      }

      doc.text(`Дата: ${receiptData.date}`, pageWidth / 2, y, { align: "center" });
      y += 12;

      // Separator Line
      doc.setDrawColor(228, 228, 231);
      doc.line(20, y, pageWidth - 20, y);
      y += 10;

      // Customer Info Section
      doc.setFont("Roboto", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("ИНФОРМАЦИЯ О ЗАКАЗЕ", 20, y);
      y += 8;

      doc.setFont("Roboto", "normal");
      doc.setFontSize(10);
      doc.setTextColor(63, 63, 70);

      doc.text(`Номер заказа:`, 20, y);
      doc.setFont("Roboto", "bold");
      doc.text(`${receiptData.orderId}`, 50, y);
      doc.setFont("Roboto", "normal");

      doc.text(`Клиент:`, 110, y);
      doc.setFont("Roboto", "bold");
      doc.text(`${receiptData.customerName}`, 130, y);
      doc.setFont("Roboto", "normal");

      y += 6;

      doc.text(`Телефон:`, 20, y);
      doc.text(`${receiptData.customerPhone}`, 50, y);

      if (receiptData.tableNumber) {
        doc.text(`Стол №:`, 110, y);
        doc.setFont("Roboto", "bold");
        doc.text(`${receiptData.tableNumber}`, 130, y);
        doc.setFont("Roboto", "normal");
      } else if (receiptData.preferredTime) {
        doc.text(`Время доставки:`, 110, y);
        doc.setFont("Roboto", "bold");
        doc.text(`${receiptData.preferredTime}`, 145, y);
        doc.setFont("Roboto", "normal");
      }

      y += 12;

      // Separator
      doc.setDrawColor(228, 228, 231);
      doc.line(20, y, pageWidth - 20, y);
      y += 10;

      // Items Section
      doc.setFont("Roboto", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("ПОЗИЦИИ В ЗАКАЗЕ", 20, y);
      y += 8;

      // Table Header
      doc.setFillColor(244, 244, 245);
      doc.rect(20, y, pageWidth - 40, 8, "F");
      
      doc.setFont("Roboto", "bold");
      doc.setFontSize(9);
      doc.setTextColor(63, 63, 70);
      doc.text("Наименование", 24, y + 5.5);
      doc.text("Кол-во", 115, y + 5.5, { align: "right" });
      doc.text("Цена", 145, y + 5.5, { align: "right" });
      doc.text("Сумма", 185, y + 5.5, { align: "right" });

      y += 14;

      doc.setFont("Roboto", "normal");
      doc.setFontSize(10);
      doc.setTextColor(24, 24, 27);

      receiptData.items.forEach((item: any) => {
        if (y > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          doc.setDrawColor(228, 228, 231);
          doc.rect(15, 15, pageWidth - 30, doc.internal.pageSize.getHeight() - 30);
          y = 25;
        }

        doc.setFont("Roboto", "bold");
        doc.text(item.title, 24, y);
        doc.setFont("Roboto", "normal");
        
        doc.text(`${item.quantity} шт`, 115, y, { align: "right" });
        doc.text(`${item.price} ₽`, 145, y, { align: "right" });
        doc.text(`${item.price * item.quantity} ₽`, 185, y, { align: "right" });

        y += 8;
      });

      y += 4;
      doc.setDrawColor(228, 228, 231);
      doc.line(20, y, pageWidth - 20, y);
      y += 10;

      // Pricing Calculations
      const summaryXLabel = 145;
      const summaryXVal = 185;

      doc.setFont("Roboto", "normal");
      doc.setFontSize(10);
      doc.setTextColor(113, 113, 122);
      doc.text("Сумма без скидки:", summaryXLabel, y, { align: "right" });
      doc.setFont("Roboto", "bold");
      doc.setTextColor(24, 24, 27);
      doc.text(`${receiptData.totalPrice} ₽`, summaryXVal, y, { align: "right" });
      doc.setFont("Roboto", "normal");
      y += 6;

      if (receiptData.discountValue > 0) {
        doc.setTextColor(113, 113, 122);
        doc.text(`Скидка ${receiptData.appliedPromo ? `(${receiptData.appliedPromo})` : ""}:`, summaryXLabel, y, { align: "right" });
        doc.setFont("Roboto", "bold");
        doc.setTextColor(239, 68, 68);
        doc.text(`- ${receiptData.discountValue} ₽`, summaryXVal, y, { align: "right" });
        doc.setFont("Roboto", "normal");
        y += 6;
      }

      doc.setDrawColor(228, 228, 231);
      doc.line(110, y - 2, pageWidth - 20, y - 2);

      doc.setFontSize(12);
      doc.setFont("Roboto", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("ИТОГО К ОПЛАТЕ:", summaryXLabel, y + 4, { align: "right" });
      doc.text(`${receiptData.finalTotalPrice} ₽`, summaryXVal, y + 4, { align: "right" });

      y += 20;

      // Footer
      doc.setFont("Roboto", "normal");
      doc.setFontSize(10);
      doc.setTextColor(113, 113, 122);
      doc.text("Спасибо за ваш заказ!", pageWidth / 2, y, { align: "center" });
      y += 5;
      doc.setFontSize(8);
      doc.text("Электронный чек сгенерирован автоматически.", pageWidth / 2, y, { align: "center" });

      doc.save(`Receipt-${receiptData.orderId}.pdf`);
      showToast("Чек успешно сохранен как PDF!", "success");
    } catch (error) {
      console.error("Ошибка при генерации PDF:", error);
      showToast("Не удалось экспортировать PDF", "error");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const { subscribeShop } = useRealtime();
  const isAnyShopModalOpen = Boolean(isCheckoutOpen || isMyOrdersOpen || isReviewsOpen || showInfoModal || selectedServiceDetail);

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
        services: [event.payload, ...(prev.services || []).filter(s => s.id !== event.payload.id)]
      } : prev);
    }
  });

  useRealtimeEvent("SERVICE_UPDATED", (event) => {
    if (event.payload && event.shopId === shop?.id) {
      setShop(prev => prev ? {
        ...prev,
        services: (prev.services || []).map(s => s.id === event.payload.id ? { ...s, ...event.payload } : s)
      } : prev);
    }
  });

  useRealtimeEvent("SERVICE_DELETED", (event) => {
    if (event.payload?.id && event.shopId === shop?.id) {
      setShop(prev => prev ? {
        ...prev,
        services: (prev.services || []).filter(s => s.id !== event.payload.id)
      } : prev);
    }
  });

  useRealtimeEvent("ORDER_STATUS_UPDATED", (event) => {
    if (event.payload?.id) {
      setMyOrders(prev => prev.map(o => o.id === event.payload.id ? { ...o, status: event.payload.status } : o));
    }
  });

  useRealtimeEvent("BANNER_CREATED", (event) => {
    if (event.payload && event.shopId === shop?.id) {
      setBanners(prev => [event.payload, ...prev.filter(b => b.id !== event.payload.id)]);
    }
  });

  useRealtimeEvent("BANNER_DELETED", (event) => {
    if (event.payload?.id && event.shopId === shop?.id) {
      setBanners(prev => prev.filter(b => b.id !== event.payload.id));
    }
  });

  useRealtimeEvent("REVIEW_CREATED", (event) => {
    if (event.payload && event.shopId === shop?.id) {
      setReviews(prev => [event.payload, ...prev.filter(r => r.id !== event.payload.id)]);
    }
  });

  useRealtimeEvent("REVIEW_UPDATED", (event) => {
    if (event.payload && event.shopId === shop?.id) {
      setReviews(prev => prev.map(r => r.id === event.payload.id ? { ...r, ...event.payload } : r));
    }
  });

  useRealtimeEvent("REVIEW_DELETED", (event) => {
    if (event.payload?.id && event.shopId === shop?.id) {
      setReviews(prev => prev.filter(r => r.id !== event.payload.id));
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

  const cartServices = Object.keys(cart).map(id => (shop?.services || []).find(s => s.id === id)).filter(Boolean) as Service[];
  const pickupOnlyItems = cartServices.filter(s => {
    const f = s.fulfillment || "courier,pickup";
    return !f.includes("courier") && f.includes("pickup");
  });
  const courierOnlyItems = cartServices.filter(s => {
    const f = s.fulfillment || "courier,pickup";
    return f.includes("courier") && !f.includes("pickup");
  });

  const isCourierDisabled = pickupOnlyItems.length > 0;
  const isPickupDisabled = courierOnlyItems.length > 0;

  useEffect(() => {
    if (isCourierDisabled && fulfillmentMethod === "courier") {
      setFulfillmentMethod("pickup");
    } else if (isPickupDisabled && fulfillmentMethod === "pickup") {
      setFulfillmentMethod("courier");
    }
  }, [isCourierDisabled, isPickupDisabled, fulfillmentMethod]);

  if (notFound) return <NotFoundPage />;

  if (loading) {
    return <ShopPageSkeleton />;
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

  const handleAddToCart = (serviceId: string, customNote?: string) => {
    setCart(prev => ({ ...prev, [serviceId]: (prev[serviceId] || 0) + 1 }));
    if (customNote) {
      setItemNotes(prev => ({ ...prev, [serviceId]: customNote }));
    }
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

  const getServiceBadges = (service: Service): string[] => {
    const badges: string[] = [];

    // 1. Explicit admin custom badge from position settings
    if (service.badge && service.badge.trim()) {
      badges.push(service.badge.trim());
    }

    // 2. Old price discount percentage badge
    if (service.oldPrice && Number(service.oldPrice) > Number(service.price)) {
      const discountPct = Math.round(((Number(service.oldPrice) - Number(service.price)) / Number(service.oldPrice)) * 100);
      if (discountPct > 0) {
        badges.push(`-${discountPct}%`);
      }
    }

    return badges;
  };

  const totalItems: number = (Object.values(cart) as number[]).reduce((sum, qty) => sum + qty, 0);
  const totalPrice: number = Object.entries(cart).reduce((sum: number, [id, qty]: [string, number]) => {
    const service = (shop?.services || []).find(s => s.id === id);
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

  const shopDeliveryOpts = parseDeliveryOptions(shop?.deliveryOptions);
  const deliveryMinOrderVal = Number(shopDeliveryOpts.deliveryMinOrder || shopDeliveryOpts.minOrder) || 0;
  const deliveryFeeVal = Number(shopDeliveryOpts.deliveryFee || shopDeliveryOpts.deliveryFeeVal) || 0;
  const freeDeliveryThreshVal = Number(shopDeliveryOpts.freeDeliveryThreshold) || 0;

  const isDeliveryFree = freeDeliveryThreshVal > 0 && totalPrice >= freeDeliveryThreshVal;
  const calculatedDeliveryFee = fulfillmentMethod === "courier" 
    ? (isDeliveryFree ? 0 : deliveryFeeVal) 
    : 0;

  const tipAmount = tipPercent > 0 
    ? Math.round((totalPrice * tipPercent) / 100) 
    : (Number(customTip) || 0);

  const finalTotalPrice = Math.max(0, totalPrice - discountValue + tipAmount + calculatedDeliveryFee);

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
    if (!shop) return;

    const nameRes = validateCustomerName(newReview.name);
    if (!nameRes.isValid) {
      setReviewSubmitError(nameRes.error || "Укажите имя");
      return;
    }

    setIsSubmittingReview(true);
    setReviewSubmitError(null);
    try {
      const res = await fetch(`/api/shops/${shop.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: nameRes.formatted,
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
    } catch (e: any) {
      if (e instanceof TypeError || (e?.message && e.message.includes("Failed to fetch"))) {
        console.warn("Failed to fetch my orders (network offline):", e.message);
      } else {
        console.error(e);
      }
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
    const errors: { name?: string; phone?: string; deliveryAddress?: string; general?: string } = {};

    const nameRes = validateCustomerName(formData.name);
    if (!nameRes.isValid) {
      errors.name = nameRes.error;
    }

    const phoneRes = validateCisPhone(formData.phone);
    if (!phoneRes.isValid) {
      errors.phone = phoneRes.error;
    } else {
      // Автоматически форматируем телефон в красивый международный стандарт
      setFormData(prev => ({ ...prev, phone: phoneRes.formatted }));
    }

    if (fulfillmentMethod === "courier") {
      if (!formData.deliveryAddress.trim()) {
        errors.deliveryAddress = "Укажите адрес доставки";
      }
      if (deliveryMinOrderVal > 0 && totalPrice < deliveryMinOrderVal) {
        errors.general = `Минимальная сумма заказа для доставки — ${deliveryMinOrderVal} ₽ (не хватает ${deliveryMinOrderVal - totalPrice} ₽)`;
      }
      if (pickupOnlyItems.length > 0) {
        errors.general = `Позиции «${pickupOnlyItems.map(i => i.title).join(", ")}» недоступны для курьерской доставки. Выберите «Самовывоз» или удалите их из корзины.`;
      }
    } else if (fulfillmentMethod === "pickup") {
      if (courierOnlyItems.length > 0) {
        errors.general = `Позиции «${courierOnlyItems.map(i => i.title).join(", ")}» доступны только для курьерской доставки.`;
      }
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
      const service = (shop?.services || []).find(s => s.id === id);
      return {
        id,
        title: service?.title,
        price: service?.price,
        quantity: qty
      };
    });

    try {
      const deliveryNoteTag = fulfillmentMethod === "courier" 
        ? `Способ: Доставка (${formData.deliveryAddress.trim()})`
        : `Способ: Самовывоз (${shopDeliveryOpts.pickupAddress || shop?.address || "Заведение"})`;

      const fullNoteParts = [
        deliveryNoteTag,
        appliedPromo ? `Промокод: ${appliedPromo.code}` : null,
        formData.note.trim() || null
      ].filter(Boolean);

      const fullNote = fullNoteParts.join(" | ");

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

      // Save last order receipt information before clearing cart and setting success
      setLastOrderReceipt({
        shopName: shop?.name || "Магазин",
        shopAddress: shop?.address || "",
        shopPhone: shop?.phone || "",
        customerName: formData.name.trim(),
        customerPhone: formData.phone.trim(),
        tableNumber: formData.tableNumber.trim(),
        preferredTime: formData.preferredTime.trim(),
        items: items.map(item => ({
          title: item.title || "",
          price: item.price || 0,
          quantity: item.quantity || 1
        })),
        totalPrice: totalPrice,
        discountValue: discountValue,
        finalTotalPrice: finalTotalPrice,
        appliedPromo: appliedPromo ? appliedPromo.code : null,
        date: new Date().toLocaleString("ru-RU"),
        orderId: data.id ? String(data.id).slice(-6).toUpperCase() : `ORD-${Math.floor(1000 + Math.random() * 9000)}`
      });

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
              Ваш заказ обрабатывается в {shop?.name}. Отслеживайте статус во вкладке «Заказы».
            </p>
          </div>
          
          <div className="space-y-2 pt-2">
            {lastOrderReceipt && (
              <button
                type="button"
                onClick={() => generateReceiptPDF(lastOrderReceipt)}
                disabled={isDownloadingPDF}
                className="w-full h-11 border border-app-border hover:border-zinc-700 bg-app-card text-app-primary font-semibold text-xs rounded-xl transition-all uppercase tracking-wider font-mono flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDownloadingPDF ? <SpinnerLoader size={14} /> : <Receipt size={14} />}
                {isDownloadingPDF ? "Генерация PDF..." : "Скачать чек PDF"}
              </button>
            )}

            <button
              onClick={handleFinishOrder}
              className="w-full h-11 bg-app-accent text-app-bg font-semibold text-xs rounded-xl hover:bg-app-hover transition-all uppercase tracking-wider font-mono cursor-pointer"
            >
              Готово
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const activeOrder = myOrders.find(o => o.status === "PENDING" || o.status === "CONFIRMED");

  const allServices = shop.services || [];
  const categories = Array.from(new Set(allServices.map(s => s.category).filter(Boolean))) as string[];
  
  const filteredServices = allServices.filter(service => {
    const isFav = favorites.includes(service.id);
    const matchesCategory = selectedCategory === "ALL" 
      ? true 
      : selectedCategory === "FAVORITES" 
      ? isFav 
      : service.category === selectedCategory;
      
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-app-bg text-app-primary font-sans pb-32">
      {/* Sleek Vercel / Linear Top Header */}
      <header className="sticky top-0 z-40 bg-app-bg/80 backdrop-blur-xl border-b border-app-border">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 min-h-[3.75rem] sm:h-16 py-2 sm:py-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-app-card border border-app-border flex items-center justify-center font-mono font-bold text-xs sm:text-sm text-app-primary shrink-0 shadow-sm">
              {shop.logoUrl ? (
                <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                shop.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-app-primary truncate">{shop.name}</h1>
                <span className={`w-2 h-2 rounded-full shrink-0 ${shop.isOpen !== false ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-rose-500"}`} />
              </div>
              <p className="text-[10px] sm:text-[11px] text-app-muted font-mono truncate max-w-[120px] sm:max-w-xs">
                {shop.workingHours || (shop.isOpen !== false ? "Открыто" : "Закрыто")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-app-muted hover:text-app-primary hover:bg-app-hover rounded-xl transition-all cursor-pointer shrink-0"
              title={theme === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
            >
              {theme === "dark" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />}
            </button>

            <button
              type="button"
              onClick={handleOpenReviews}
              className="px-3 py-1.5 rounded-xl bg-app-surface hover:bg-app-hover text-xs text-app-secondary hover:text-app-primary transition-all flex items-center gap-1.5 font-mono font-medium cursor-pointer shrink-0"
            >
              <Star size={13} className="text-amber-500 fill-amber-500 shrink-0" />
              <span className="hidden xs:inline sm:inline">Отзывы</span>
            </button>

            <button
              type="button"
              onClick={handleOpenMyOrders}
              className="px-3 py-1.5 rounded-xl bg-app-surface hover:bg-app-hover text-xs text-app-secondary hover:text-app-primary transition-all flex items-center gap-1.5 font-mono font-medium cursor-pointer shrink-0"
            >
              <Receipt size={13} className="text-app-muted shrink-0" />
              <span className="hidden xs:inline sm:inline">Заказы</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Establishment Showcase Header Card */}
        {(() => {
          const socials = parseSocialLinks(shop.socialLinks);
          const delivery = parseDeliveryOptions(shop.deliveryOptions);
          const hasSocials = Boolean(socials.telegram || socials.instagram || socials.whatsapp || socials.vk || socials.website);

          return (
            <div className="rounded-3xl bg-app-card border border-app-border overflow-hidden shadow-sm relative space-y-0">
              {/* Cover Banner Image or Gradient Hero */}
              <div className="relative h-36 sm:h-52 w-full bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 overflow-hidden">
                {shop.bannerUrl ? (
                  <img
                    src={shop.bannerUrl}
                    alt={shop.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 opacity-70" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-app-card via-app-card/40 to-transparent" />
                
                {/* Status Badge in top right corner */}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-2 backdrop-blur-md shadow-md border ${
                    shop.isOpen !== false 
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" 
                      : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${shop.isOpen !== false ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" : "bg-rose-400"}`} />
                    <span>{shop.isOpen !== false ? "Открыто" : "Закрыто"}</span>
                  </span>
                </div>
              </div>

              {/* Shop Content Header Body */}
              <div className="px-5 sm:px-6 pb-6 pt-0 relative -mt-12 sm:-mt-16 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="flex items-end gap-3.5">
                    {/* Store Logo */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-app-surface border-2 border-app-border flex items-center justify-center font-mono font-bold text-2xl text-app-primary shrink-0 shadow-lg overflow-hidden">
                      {shop.logoUrl ? (
                        <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        shop.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-app-primary">{shop.name}</h1>
                      {shop.workingHours && (
                        <div className="flex items-center gap-1.5 text-xs text-app-muted font-mono mt-1">
                          <Clock size={13} className="text-amber-500 shrink-0" />
                          <span>{shop.workingHours}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions / Info trigger */}
                  <div className="flex items-center gap-2 self-start sm:self-end">
                    <button
                      type="button"
                      onClick={() => setShowInfoModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-app-surface border border-app-border hover:border-amber-500/50 hover:text-app-primary text-xs font-mono font-semibold text-app-secondary transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Info size={14} className="text-amber-500 shrink-0" />
                      <span>О заведении</span>
                    </button>
                    {shop.phone && (
                      <a
                        href={`tel:${shop.phone}`}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <PhoneIcon size={14} />
                        <span className="hidden xs:inline">Позвонить</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Description / Welcome */}
                {shop.description && (
                  <p className="text-xs sm:text-sm text-app-secondary leading-relaxed pt-1 whitespace-pre-line">
                    {shop.description}
                  </p>
                )}

                {/* Quick Details Chips (Address, Phone, Cashback, Delivery, Socials) */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                  {shop.address && (
                    <div className="px-3 py-1.5 rounded-xl bg-app-surface text-app-secondary flex items-center gap-2">
                      <MapPin size={13} className="text-rose-400 shrink-0" />
                      <span className="truncate max-w-[220px] sm:max-w-xs">{shop.address}</span>
                    </div>
                  )}

                  {shop.cashbackPercent ? (
                    <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-400 flex items-center gap-2 font-bold">
                      <Gift size={13} className="shrink-0" />
                      <span>Кэшбэк {shop.cashbackPercent}%</span>
                    </div>
                  ) : null}

                  {(delivery.courier || delivery.deliveryMinOrder || delivery.deliveryFee) && (
                    <div className="px-3 py-1.5 rounded-xl bg-sky-500/15 text-sky-400 flex items-center gap-2">
                      <Truck size={13} className="shrink-0" />
                      <span>Доставка</span>
                    </div>
                  )}

                  {(delivery.pickup || delivery.pickupAddress) && (
                    <div className="px-3 py-1.5 rounded-xl bg-app-surface text-app-secondary flex items-center gap-2">
                      <Store size={13} className="text-indigo-400 shrink-0" />
                      <span>Самовывоз</span>
                    </div>
                  )}
                </div>

                {/* Social Networks Row if configured */}
                {hasSocials && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-app-border/40">
                    <span className="text-[10px] font-mono text-app-muted uppercase mr-1">Соцсети и связь:</span>
                    {socials.telegram && (
                      <a
                        href={socials.telegram.startsWith("http") ? socials.telegram : `https://t.me/${socials.telegram.replace("@", "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                      >
                        <Send size={12} />
                        <span>Telegram</span>
                      </a>
                    )}
                    {socials.instagram && (
                      <a
                        href={socials.instagram.startsWith("http") ? socials.instagram : `https://instagram.com/${socials.instagram}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-pink-500/15 text-pink-400 hover:bg-pink-500/25 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink size={12} />
                        <span>Instagram</span>
                      </a>
                    )}
                    {socials.whatsapp && (
                      <a
                        href={socials.whatsapp.startsWith("http") ? socials.whatsapp : `https://wa.me/${socials.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                      >
                        <MessageCircle size={12} />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {socials.vk && (
                      <a
                        href={socials.vk.startsWith("http") ? socials.vk : `https://vk.com/${socials.vk}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                      >
                        <Globe size={12} />
                        <span>ВКонтакте</span>
                      </a>
                    )}
                    {socials.website && (
                      <a
                        href={socials.website.startsWith("http") ? socials.website : `https://${socials.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-app-surface text-app-primary hover:bg-app-hover text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                      >
                        <Globe size={12} />
                        <span>Сайт</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Active Order Tracker Banner if customer has an active order */}
        {activeOrder && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-amber-500/30 space-y-3 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span className="text-xs font-bold font-mono text-app-primary">
                  Активный заказ #{activeOrder.id.slice(-6).toUpperCase()}
                </span>
              </div>
              <span className="text-xs font-mono text-amber-500 font-bold uppercase tracking-wider">
                {activeOrder.status === "PENDING" ? "Принят" : "Готовится"}
              </span>
            </div>
            <div className="w-full bg-app-card h-1.5 rounded-full overflow-hidden border border-app-border">
              <div 
                className={`h-full bg-amber-500 transition-all duration-500 ${
                  activeOrder.status === "PENDING" ? "w-1/3" : "w-2/3"
                }`} 
              />
            </div>
            <div className="flex justify-between items-center text-[11px] font-mono text-app-muted">
              <span>Сумма: {activeOrder.totalPrice} ₽</span>
              <button onClick={handleOpenMyOrders} className="text-app-primary font-bold underline hover:text-amber-500 transition-colors">
                Детали заказа →
              </button>
            </div>
          </div>
        )}

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
            <div className="relative flex-1 min-w-0">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 touch-pan-x w-full pr-8">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium font-mono transition-all shrink-0 ${
                    selectedCategory === "ALL"
                      ? "bg-app-accent text-app-bg font-bold shadow-sm"
                      : "bg-app-surface text-app-muted hover:bg-app-hover hover:text-app-primary"
                  }`}
                >
                  Все
                </button>
                
                {/* Favorites Category Tab */}
                <button
                  onClick={() => setSelectedCategory("FAVORITES")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                    selectedCategory === "FAVORITES"
                      ? "bg-rose-500 text-white font-bold shadow-sm"
                      : "bg-app-surface text-app-muted hover:bg-app-hover hover:text-rose-400"
                  }`}
                >
                  <Heart size={13} className={favorites.length > 0 ? "fill-current" : ""} />
                  <span>Избранное ({favorites.length})</span>
                </button>

                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                      selectedCategory === cat
                        ? "bg-app-accent text-app-bg shadow-sm font-semibold"
                        : "bg-app-surface text-app-muted hover:bg-app-hover hover:text-app-primary"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-app-bg to-transparent pointer-events-none" />
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64 shrink-0">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск по каталогу..."
                className="w-full bg-app-surface text-xs rounded-xl pl-9 pr-4 py-2 text-app-primary focus:outline-none focus:ring-1 focus:ring-app-primary/30 transition-all placeholder:text-app-muted font-sans"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map(service => {
                const qty = cart[service.id] || 0;
                const isOutOfStock = service.isAvailable === false;
                const isFav = favorites.includes(service.id);
                const badges = getServiceBadges(service);
                
                return (
                  <motion.div 
                    key={service.id} 
                    layout
                    className={`rounded-2xl border overflow-hidden transition-all flex flex-col justify-between group ${
                      isOutOfStock 
                        ? "bg-app-surface/50 border-app-border/40 opacity-50" 
                        : "bg-app-surface border-app-border hover:border-app-border hover:bg-app-card-hover"
                    }`}
                  >
                    {service.imageUrl ? (
                      <div className="relative">
                        <div 
                          onClick={() => setSelectedServiceDetail(service)}
                          className="h-40 w-full overflow-hidden bg-app-surface border-b border-app-border relative cursor-pointer"
                        >
                          <img
                            src={service.imageUrl}
                            alt={service.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                            referrerPolicy="no-referrer"
                          />
                          {service.category && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-[9px] font-mono text-zinc-300 uppercase tracking-wider backdrop-blur-md">
                              {service.category}
                            </span>
                          )}
                        </div>
                        {/* Favorite Heart Button over image */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(service.id);
                          }}
                          className="absolute top-2 right-2 p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white keep-white hover:scale-110 transition-transform cursor-pointer z-10"
                          title={isFav ? "Удалить из избранного" : "В избранное"}
                        >
                          <Heart size={14} className={isFav ? "fill-rose-500 text-rose-500" : "text-white keep-white"} />
                        </button>
                      </div>
                    ) : (
                      <div className="pt-3.5 px-4 flex justify-between items-center gap-2">
                        {service.category ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-app-card border border-app-border text-[9px] font-mono text-app-muted uppercase tracking-wider">
                            {service.category}
                          </span>
                        ) : <div />}
                        {/* Favorite Heart Button for card without image */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(service.id);
                          }}
                          className="p-1.5 rounded-xl bg-app-card hover:bg-app-hover border border-app-border text-app-primary hover:scale-105 transition-all cursor-pointer shrink-0"
                          title={isFav ? "Удалить из избранного" : "В избранное"}
                        >
                          <Heart size={14} className={isFav ? "fill-rose-500 text-rose-500" : "text-app-muted"} />
                        </button>
                      </div>
                    )}

                    <div className="p-5 pt-2 flex-1 flex flex-col justify-between">
                      <div className="space-y-2 mb-4">
                        <div 
                          onClick={() => setSelectedServiceDetail(service)}
                          className="flex justify-between items-start gap-3 cursor-pointer"
                        >
                          <h3 className={`text-sm font-semibold tracking-tight hover:underline ${isOutOfStock ? "text-app-muted" : "text-app-primary"}`}>
                            {service.title}
                          </h3>
                          <div className="flex flex-col items-end shrink-0">
                            {service.oldPrice && Number(service.oldPrice) > Number(service.price) && (
                              <span className="text-[10px] font-mono text-app-muted line-through leading-none mb-1">
                                {service.oldPrice} ₽
                              </span>
                            )}
                            <span className="text-xs font-mono font-bold text-app-primary px-2.5 py-1 rounded-lg bg-app-card">
                              {service.price} ₽
                            </span>
                          </div>
                        </div>

                        {/* Dietary & Custom Badges */}
                        {badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 py-0.5">
                            {badges.map(badge => (
                              <span key={badge} className="px-2 py-0.5 rounded-md bg-app-badge text-app-primary font-mono text-[9px]">
                                {badge}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Fulfillment restriction badge */}
                        {(() => {
                          const f = service.fulfillment || "courier,pickup";
                          const hasCourier = f.includes("courier");
                          const hasPickup = f.includes("pickup");
                          if (!hasCourier) {
                            return (
                              <div className="pt-0.5">
                                <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-md text-[10px] font-mono">
                                  <Store size={11} /> Только самовывоз
                                </span>
                              </div>
                            );
                          }
                          if (!hasPickup) {
                            return (
                              <div className="pt-0.5">
                                <span className="inline-flex items-center gap-1 bg-sky-500/15 text-sky-400 px-2 py-0.5 rounded-md text-[10px] font-mono">
                                  <Truck size={11} /> Только доставка
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {service.description && (
                          <p 
                            onClick={() => setSelectedServiceDetail(service)}
                            className="text-app-secondary text-xs leading-relaxed line-clamp-2 font-normal cursor-pointer"
                          >
                            {service.description}
                          </p>
                        )}

                        {/* Additional Meta Details: Time, Weight, Tags */}
                        {(service.prepTime || service.weight || service.tags) && (
                          <div 
                            onClick={() => setSelectedServiceDetail(service)}
                            className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono text-app-muted cursor-pointer"
                          >
                            {service.prepTime && (
                              <span className="inline-flex items-center gap-1 bg-app-card px-2.5 py-1 rounded-lg text-app-secondary">
                                <Clock size={11} className="text-amber-500 shrink-0" />
                                <span>{service.prepTime}</span>
                              </span>
                            )}
                            {service.weight && (
                              <span className="inline-flex items-center gap-1 bg-app-card px-2.5 py-1 rounded-lg text-app-secondary">
                                <Scale size={11} className="text-sky-500 shrink-0" />
                                <span>{service.weight}</span>
                              </span>
                            )}
                            {service.tags && (
                              <div className="flex flex-wrap gap-1 items-center">
                                {service.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                                  <span key={tag} className="text-app-muted hover:text-app-primary transition-colors">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center mt-auto pt-4 border-t border-app-border">
                        <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider">
                          {qty > 0 ? `В корзине: ${qty}` : ""}
                        </span>

                        <div>
                          {isOutOfStock ? (
                            <span className="text-xs text-app-muted font-mono">Недоступно</span>
                          ) : qty > 0 ? (
                            <div className="flex items-center gap-2 bg-app-card rounded-xl p-1 border border-app-border">
                              <button 
                                onClick={() => handleRemoveFromCart(service.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-app-secondary text-app-primary hover:bg-app-hover transition-colors cursor-pointer"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="text-xs font-mono font-bold w-5 text-center text-app-primary">{qty}</span>
                              <button 
                                onClick={() => handleAddToCart(service.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-app-accent text-app-bg hover:bg-app-hover transition-colors cursor-pointer"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setSelectedServiceDetail(service)}
                              className="px-4 py-1.5 rounded-xl bg-app-accent text-app-bg font-medium text-xs hover:bg-app-hover transition-all font-mono cursor-pointer"
                            >
                              + Выбрать
                            </button>
                          )}
                        </div>
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
            className="w-full h-13 bg-app-accent text-app-accent-fg rounded-2xl flex items-center justify-between px-5 shadow-2xl hover:scale-[1.01] transition-transform font-mono border border-app-border cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 bg-app-accent-fg/20 text-app-accent-fg rounded-xl flex items-center justify-center text-xs font-bold shrink-0">
                {totalItems}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-app-accent-fg">Оформить заказ</span>
            </div>
            <div className="flex items-center gap-2 text-app-accent-fg">
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
                      const service = (shop?.services || []).find(s => s.id === id);
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
                        className="px-4 bg-app-secondary hover:bg-app-hover text-app-primary text-xs rounded-xl transition-colors disabled:opacity-50 font-mono flex items-center justify-center gap-1.5"
                      >
                        {isValidatingPromo && <SpinnerLoader size={12} />}
                        {isValidatingPromo ? "Проверка..." : "Применить"}
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

                  {/* Tipping Options Section */}
                  <div className="mt-6 pt-4 border-t border-app-border space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider">Чаевые персоналу</span>
                      {tipAmount > 0 && <span className="text-xs font-mono text-amber-500 font-bold">+{tipAmount} ₽</span>}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 5, 10, 15].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setTipPercent(p);
                            setCustomTip("");
                          }}
                          className={`py-2 rounded-xl text-xs font-mono border transition-all cursor-pointer ${
                            tipPercent === p && !customTip 
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold shadow-sm" 
                              : "bg-app-surface text-app-secondary border-app-border hover:text-app-primary hover:bg-app-hover"
                          }`}
                        >
                          {p === 0 ? "Без чаевых" : `${p}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-app-border space-y-1.5 font-mono">
                    <div className="flex justify-between items-center text-xs text-app-muted">
                      <span>Товары ({(Object.values(cart) as number[]).reduce((acc, qty) => acc + (qty || 0), 0)})</span>
                      <span>{totalPrice} ₽</span>
                    </div>
                    {discountValue > 0 && (
                      <div className="flex justify-between items-center text-xs text-emerald-500">
                        <span>Скидка</span>
                        <span>-{discountValue} ₽</span>
                      </div>
                    )}
                    {tipAmount > 0 && (
                      <div className="flex justify-between items-center text-xs text-amber-500">
                        <span>Чаевые</span>
                        <span>+{tipAmount} ₽</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs text-sky-400">
                      <span>Доставка</span>
                      <span>
                        {fulfillmentMethod === "courier"
                          ? (calculatedDeliveryFee === 0 
                              ? (isDeliveryFree ? "Бесплатно (акция)" : "Бесплатно") 
                              : `+${calculatedDeliveryFee} ₽`)
                          : "0 ₽ (Самовывоз)"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-app-border text-base font-bold text-app-primary">
                      <span className="text-xs text-app-muted uppercase font-normal">К оплате</span>
                      <span>{finalTotalPrice} ₽</span>
                    </div>

                    {Boolean(shop.cashbackPercent) && (
                      <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-amber-400 font-semibold bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                        <div className="flex items-center gap-1.5">
                          <Gift size={13} className="shrink-0" />
                          <span>Бонус за заказ ({shop.cashbackPercent}%)</span>
                        </div>
                        <span>+{Math.round((finalTotalPrice * (shop.cashbackPercent || 5)) / 100)} ₽</span>
                      </div>
                    )}
                  </div>
                </div>

                {shop.paymentInstructions && (
                  <div className="p-3.5 bg-app-card border border-app-border rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-app-primary font-mono">
                      <CreditCard size={14} className="text-amber-500 shrink-0" />
                      <span>Инструкции по оплате</span>
                    </div>
                    <p className="text-xs text-app-secondary leading-relaxed font-sans whitespace-pre-line bg-app-surface p-2.5 rounded-xl border border-app-border/60">
                      {shop.paymentInstructions}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-[10px] font-mono text-app-muted uppercase tracking-wider mb-3">Способ получения и данные</h3>
                  
                  {/* Fulfillment Method Selector */}
                  <div className="grid grid-cols-2 gap-2 mb-3 font-mono text-xs">
                    <button
                      type="button"
                      disabled={isCourierDisabled}
                      onClick={() => !isCourierDisabled && setFulfillmentMethod("courier")}
                      className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                        isCourierDisabled
                          ? "bg-app-card/30 text-app-muted/40 border-app-border/40 cursor-not-allowed opacity-40 select-none"
                          : fulfillmentMethod === "courier"
                          ? "bg-sky-500/20 text-sky-400 border-sky-500/40 shadow-sm cursor-pointer"
                          : "bg-app-card text-app-muted border-app-border hover:bg-app-hover hover:text-app-primary cursor-pointer"
                      }`}
                      title={isCourierDisabled ? "Доставка недоступна для выбранных позиций" : undefined}
                    >
                      <Truck size={15} />
                      <span>Доставка</span>
                    </button>
                    <button
                      type="button"
                      disabled={isPickupDisabled}
                      onClick={() => !isPickupDisabled && setFulfillmentMethod("pickup")}
                      className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                        isPickupDisabled
                          ? "bg-app-card/30 text-app-muted/40 border-app-border/40 cursor-not-allowed opacity-40 select-none"
                          : fulfillmentMethod === "pickup"
                          ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/40 shadow-sm cursor-pointer"
                          : "bg-app-card text-app-muted border-app-border hover:bg-app-hover hover:text-app-primary cursor-pointer"
                      }`}
                      title={isPickupDisabled ? "Самовывоз недоступен для выбранных позиций" : undefined}
                    >
                      <Store size={15} />
                      <span>Самовывоз</span>
                    </button>
                  </div>

                  {formErrors.general && (
                    <div className="mb-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-mono flex items-center gap-2">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{formErrors.general}</span>
                    </div>
                  )}

                  <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-3">
                    {fulfillmentMethod === "courier" && (
                      <div>
                        <input 
                          type="text" 
                          maxLength={120}
                          value={formData.deliveryAddress} 
                          onChange={e => setFormData(p => ({ ...p, deliveryAddress: e.target.value }))} 
                          placeholder="Адрес доставки (город, улица, дом, квартира) *" 
                          className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors font-sans" 
                        />
                        {formErrors.deliveryAddress && <p className="text-[11px] text-rose-400 mt-1 font-mono">{formErrors.deliveryAddress}</p>}
                        
                        {deliveryMinOrderVal > 0 && totalPrice < deliveryMinOrderVal && (
                          <p className="text-[11px] text-amber-400 mt-1 font-mono">
                            Минимальный заказ для доставки: {deliveryMinOrderVal} ₽ (не хватает {deliveryMinOrderVal - totalPrice} ₽)
                          </p>
                        )}
                        {isDeliveryFree ? (
                          <p className="text-[11px] text-emerald-400 mt-1 font-mono">
                            ✓ Бесплатная доставка при заказе от {freeDeliveryThreshVal} ₽ применены!
                          </p>
                        ) : freeDeliveryThreshVal > 0 ? (
                          <p className="text-[11px] text-app-muted mt-1 font-mono">
                            Добавьте ещё на {freeDeliveryThreshVal - totalPrice} ₽ для бесплатной доставки!
                          </p>
                        ) : null}
                      </div>
                    )}

                    {fulfillmentMethod === "pickup" && (
                      <div className="p-3 bg-app-card border border-app-border rounded-xl text-xs space-y-1 font-sans">
                        <span className="font-bold text-app-primary font-mono block">Пункт самовывоза:</span>
                        <p className="text-app-secondary">
                          {shopDeliveryOpts.pickupAddress || shop.address || "Адрес заведения"}
                        </p>
                      </div>
                    )}

                    <div>
                      <input 
                        type="text" 
                        maxLength={50}
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
                        maxLength={20}
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
                        maxLength={30}
                        value={formData.tableNumber} 
                        onChange={e => setFormData(p => ({ ...p, tableNumber: e.target.value }))} 
                        placeholder="№ стола (опционально)" 
                        className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors" 
                      />
                      <input 
                        type="text" 
                        maxLength={30}
                        value={formData.preferredTime} 
                        onChange={e => setFormData(p => ({ ...p, preferredTime: e.target.value }))} 
                        placeholder="Желаемое время" 
                        className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors" 
                      />
                    </div>
                    <div className="relative">
                      <textarea 
                        rows={2} 
                        maxLength={300}
                        value={formData.note} 
                        onChange={e => setFormData(p => ({ ...p, note: e.target.value }))} 
                        placeholder="Комментарий к заказу (до 300 символов)..." 
                        className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors resize-none" 
                      />
                      <span className="absolute bottom-2 right-2 text-[10px] font-mono text-app-muted pointer-events-none">
                        {formData.note.length}/300
                      </span>
                    </div>
                  </form>
                </div>
              </div>
              
              <div className="p-6 border-t border-app-border bg-app-bg">
                <button
                  form="checkout-form"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-app-accent text-app-accent-fg font-bold text-xs rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2.5 font-mono uppercase tracking-wider cursor-pointer shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerLoader size={16} />
                      <span>Обработка заказа...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={16} className="text-app-accent-fg" />
                      <span>Подтвердить заказ ({finalTotalPrice} ₽)</span>
                    </>
                  )}
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
              
              {/* Header */}
              <div className="h-16 flex items-center justify-between px-6 border-b border-app-border bg-app-modal-header shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                    <Star size={18} className="fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-app-primary flex items-center gap-2">
                      Отзывы клиентов
                      <span className="px-2 py-0.5 bg-app-card border border-app-border rounded-full text-[11px] font-mono font-semibold text-app-muted">
                        {reviewsStats.totalReviews}
                      </span>
                    </h2>
                    <p className="text-[11px] text-app-muted font-sans truncate max-w-[200px]">
                      {shop?.name || "Заведение"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReviewsOpen(false)}
                  className="p-2 rounded-xl text-app-muted hover:text-app-primary hover:bg-app-card transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
                {/* MINIMALIST RATING SUMMARY */}
                <div className="p-4 rounded-2xl bg-app-surface border border-app-border flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono text-app-primary">
                        {reviewsStats.avgRating ? Number(reviewsStats.avgRating).toFixed(1) : "5.0"}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const avg = Number(reviewsStats.avgRating) || 5.0;
                          return (
                            <Star
                              key={star}
                              size={13}
                              className={
                                star <= Math.floor(avg)
                                  ? "fill-amber-400 text-amber-400"
                                  : star - 0.5 <= avg
                                  ? "fill-amber-400/50 text-amber-400"
                                  : "text-zinc-600 fill-zinc-800"
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-[11px] font-mono text-app-muted">
                      {reviewsStats.totalReviews} {reviewsStats.totalReviews === 1 ? "отзыв" : reviewsStats.totalReviews < 5 ? "отзыва" : "отзывов"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsWriteReviewOpen(!isWriteReviewOpen)}
                    className="px-3 py-1.5 bg-app-accent text-app-accent-fg font-mono text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare size={13} />
                    <span>{isWriteReviewOpen ? "Отмена" : "Написать отзыв"}</span>
                  </button>
                </div>

                {/* WRITE REVIEW FORM (COLLAPSIBLE / EXPANDABLE) */}
                <AnimatePresence>
                  {isWriteReviewOpen && (
                    <motion.form
                      initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleSubmitReview}
                      className="space-y-3 p-4 border border-app-border rounded-2xl bg-app-card relative"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-app-border">
                        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-app-primary">
                          Оставить отзыв
                        </h3>
                        <span className="text-[10px] text-app-muted font-mono">Анонимно или с именем</span>
                      </div>

                      {reviewSubmitError && (
                        <p className="text-xs text-rose-400 font-mono bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                          {reviewSubmitError}
                        </p>
                      )}
                      {reviewSubmitSuccess && (
                        <p className="text-xs text-emerald-400 font-mono bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                          Спасибо за ваш отзыв! Он опубликован.
                        </p>
                      )}

                      {/* Name input */}
                      <div>
                        <input
                          type="text"
                          maxLength={50}
                          value={newReview.name}
                          onChange={(e) => setNewReview((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Ваше имя (до 50 символов)..."
                          className="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                        />
                      </div>

                      {/* Interactive Star Picker */}
                      <div className="flex items-center justify-between bg-app-surface p-2 rounded-xl border border-app-border">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((r) => {
                            const active = (hoverRating !== null ? hoverRating : newReview.rating) >= r;
                            return (
                              <button
                                key={r}
                                type="button"
                                onMouseEnter={() => setHoverRating(r)}
                                onMouseLeave={() => setHoverRating(null)}
                                onClick={() => setNewReview((p) => ({ ...p, rating: r }))}
                                className="p-1 hover:scale-110 transition-transform cursor-pointer"
                              >
                                <Star
                                  size={18}
                                  className={active ? "fill-amber-400 text-amber-400" : "text-zinc-600 fill-zinc-800"}
                                />
                              </button>
                            );
                          })}
                        </div>
                        <span className="text-[11px] font-mono text-amber-400 font-semibold">
                          {(hoverRating !== null ? hoverRating : newReview.rating)} / 5 ★
                        </span>
                      </div>

                      {/* Comment textarea */}
                      <div className="relative">
                        <textarea
                          rows={3}
                          maxLength={500}
                          value={newReview.comment}
                          onChange={(e) => setNewReview((p) => ({ ...p, comment: e.target.value }))}
                          placeholder="Поделитесь впечатлениями о заведении..."
                          className="w-full bg-app-surface border border-app-border rounded-xl p-3 text-xs text-app-primary focus:outline-none focus:border-app-accent resize-none font-sans"
                        />
                        <span className="absolute bottom-2.5 right-2.5 text-[10px] font-mono text-app-muted pointer-events-none">
                          {newReview.comment.length}/500
                        </span>
                      </div>

                      {/* Submit button */}
                      <button
                        type="submit"
                        disabled={isSubmittingReview || !newReview.name.trim()}
                        className="w-full py-2 bg-app-accent text-app-accent-fg font-mono text-xs font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSubmittingReview ? <SpinnerLoader size={14} /> : <Send size={13} />}
                        <span>{isSubmittingReview ? "Отправка..." : "Отправить отзыв"}</span>
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* FILTER PILLS BY STAR */}
                {reviews.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none font-mono text-[11px]">
                    {(["ALL", 5, 4, 3, 2, 1] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFilterStar(s)}
                        className={`px-2.5 py-1 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                          filterStar === s
                            ? "bg-app-accent text-app-accent-fg border-app-accent font-semibold"
                            : "bg-app-surface border-app-border text-app-muted hover:text-app-primary"
                        }`}
                      >
                        {s === "ALL" ? `Все (${reviews.length})` : `${s} ★`}
                      </button>
                    ))}
                  </div>
                )}

                {/* REVIEWS LIST */}
                <div className="space-y-3">
                  {reviewsLoading ? (
                    <ReviewSkeletonList count={3} />
                  ) : reviews.length === 0 ? (
                    <div className="py-12 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6 space-y-2">
                      <MessageSquare className="mx-auto text-app-muted" size={24} />
                      <p className="text-xs text-app-muted font-mono">
                        Отзывов пока нет. Будьте первым!
                      </p>
                    </div>
                  ) : (
                    reviews
                      .filter((r) => filterStar === "ALL" || Number(r.rating) === filterStar)
                      .map((rev) => (
                        <div
                          key={rev.id}
                          className="p-4 border border-app-border rounded-2xl bg-app-surface space-y-2.5 transition-all"
                        >
                          {/* User Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-app-card border border-app-border flex items-center justify-center font-bold font-mono text-[11px] text-app-primary uppercase">
                                {rev.customerName ? rev.customerName[0] : "К"}
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-app-primary block">
                                  {rev.customerName || "Клиент"}
                                </span>
                                <span className="text-[10px] text-app-muted font-mono block">
                                  {new Date(rev.createdAt).toLocaleDateString("ru-RU", {
                                    day: "numeric",
                                    month: "short"
                                  })}
                                </span>
                              </div>
                            </div>

                            {/* Rating */}
                            <div className="flex items-center gap-1 font-mono text-xs text-amber-400 font-semibold">
                              <Star size={12} className="fill-amber-400 text-amber-400" />
                              <span>{rev.rating}.0</span>
                            </div>
                          </div>

                          {/* Comment body - Direct text, no inner nested card! */}
                          {rev.comment && (
                            <p className="text-xs text-app-primary leading-relaxed font-sans pt-0.5">
                              {rev.comment}
                            </p>
                          )}

                          {/* Official Reply block - Clean minimalist accent indicator */}
                          {rev.reply && (
                            <div className="mt-2 pt-1 pl-3 border-l-2 border-emerald-500/70 space-y-0.5">
                              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                                Ответ заведения
                              </span>
                              <p className="text-xs text-app-secondary leading-relaxed font-sans">{rev.reply}</p>
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
              className="max-w-lg w-full max-h-[90vh] overflow-y-auto bg-app-modal border border-app-border rounded-3xl p-6 text-app-primary space-y-5 shadow-2xl scrollbar-none"
            >
              <div className="flex items-center justify-between border-b border-app-border pb-3 bg-app-modal-header -mx-6 -mt-6 p-6 rounded-t-3xl sticky top-0 z-20 backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-app-card border border-app-border flex items-center justify-center font-mono font-bold text-xs text-app-primary shrink-0 overflow-hidden">
                    {shop.logoUrl ? (
                      <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      shop.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-app-primary">{shop.name}</h3>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                      {shop.isOpen !== false ? "● Работает" : "○ Закрыто"}
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowInfoModal(false)} className="text-app-muted hover:text-app-primary p-1 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              {/* Cover Photo if configured */}
              {shop.bannerUrl && (
                <div className="h-32 w-full rounded-2xl overflow-hidden border border-app-border relative">
                  <img src={shop.bannerUrl} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              )}

              {/* Description / Welcome */}
              {shop.description && (
                <div className="p-3.5 bg-app-card border border-app-border rounded-2xl space-y-1">
                  <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider block">О заведении</span>
                  <p className="text-xs text-app-secondary leading-relaxed whitespace-pre-line">{shop.description}</p>
                </div>
              )}

              {/* Contacts & Working Hours */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider block">Контакты и адрес</span>
                <div className="p-3.5 bg-app-card border border-app-border rounded-2xl space-y-2.5 text-xs text-app-secondary font-mono">
                  {shop.workingHours && (
                    <div className="flex items-center gap-2.5">
                      <Clock size={15} className="text-amber-500 shrink-0" />
                      <div>
                        <span className="block text-[9px] text-app-muted uppercase">Режим работы</span>
                        <span className="text-app-primary font-medium">{shop.workingHours}</span>
                      </div>
                    </div>
                  )}
                  {shop.address && (
                    <div className="flex items-start gap-2.5 pt-1 border-t border-app-border/60">
                      <MapPin size={15} className="text-rose-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="block text-[9px] text-app-muted uppercase">Адрес</span>
                        <span className="text-app-primary font-medium block">{shop.address}</span>
                      </div>
                      <a
                        href={`https://yandex.ru/maps/?text=${encodeURIComponent(shop.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold shrink-0 hover:bg-rose-500/20 transition-colors flex items-center gap-1"
                      >
                        <Navigation size={11} />
                        <span>Карта</span>
                      </a>
                    </div>
                  )}
                  {shop.phone && (
                    <div className="flex items-center gap-2.5 pt-1 border-t border-app-border/60">
                      <PhoneIcon size={15} className="text-emerald-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="block text-[9px] text-app-muted uppercase">Телефон для связи</span>
                        <a href={`tel:${shop.phone}`} className="text-app-primary font-medium hover:underline block">
                          {shop.phone}
                        </a>
                      </div>
                      <a
                        href={`tel:${shop.phone}`}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold shrink-0 hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                      >
                        <PhoneIcon size={11} />
                        <span>Вызов</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Cashback Bonus System */}
              {Boolean(shop.cashbackPercent) && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Gift size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-400 font-mono">Бонусная программа</h4>
                    <p className="text-[11px] text-app-secondary leading-snug font-sans">
                      Начисляем <strong className="text-amber-400 font-mono">{shop.cashbackPercent}% кэшбэка</strong> на ваш бонусный счёт с каждой покупки!
                    </p>
                  </div>
                </div>
              )}

              {/* Delivery Options */}
              {(() => {
                const del = parseDeliveryOptions(shop.deliveryOptions);
                const hasDel = Boolean(del.pickup || del.courier || del.shipping || del.pickupAddress || del.deliveryMinOrder || del.deliveryFee);
                if (!hasDel) return null;
                return (
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider block">Условия доставки и самовывоза</span>
                    <div className="p-3.5 bg-app-card border border-app-border rounded-2xl space-y-2 text-xs font-mono text-app-secondary">
                      {del.pickupAddress && (
                        <div className="flex items-center gap-2">
                          <Store size={14} className="text-indigo-400 shrink-0" />
                          <span>Пункт самовывоза: {del.pickupAddress}</span>
                        </div>
                      )}
                      {(del.deliveryMinOrder || del.minOrder) && (
                        <div className="flex items-center gap-2">
                          <Truck size={14} className="text-sky-400 shrink-0" />
                          <span>Минимальная сумма заказа: {del.deliveryMinOrder || del.minOrder} ₽</span>
                        </div>
                      )}
                      {(del.deliveryFee || del.deliveryFeeVal) && (
                        <div className="flex items-center gap-2">
                          <Receipt size={14} className="text-emerald-400 shrink-0" />
                          <span>Стоимость доставки: {del.deliveryFee || del.deliveryFeeVal} ₽</span>
                        </div>
                      )}
                      {del.freeDeliveryThreshold ? (
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                          <Sparkles size={14} className="shrink-0" />
                          <span>Бесплатная доставка от {del.freeDeliveryThreshold} ₽</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })()}

              {/* Payment Instructions */}
              {shop.paymentInstructions && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider block">Инструкция по оплате</span>
                  <div className="p-3.5 bg-app-card border border-app-border rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-app-primary font-mono">
                      <CreditCard size={15} className="text-amber-500 shrink-0" />
                      <span>Способ оплаты / Реквизиты</span>
                    </div>
                    <p className="text-xs text-app-secondary leading-relaxed font-sans whitespace-pre-line bg-app-surface p-2.5 rounded-xl border border-app-border/60">
                      {shop.paymentInstructions}
                    </p>
                  </div>
                </div>
              )}

              {/* Social links / Messaging */}
              {(() => {
                const socials = parseSocialLinks(shop.socialLinks);
                const hasSoc = Boolean(socials.telegram || socials.instagram || socials.whatsapp || socials.vk || socials.website);
                if (!hasSoc) return null;
                return (
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider block">Социальные сети и мессенджеры</span>
                    <div className="grid grid-cols-2 gap-2">
                      {socials.telegram && (
                        <a
                          href={socials.telegram.startsWith("http") ? socials.telegram : `https://t.me/${socials.telegram.replace("@", "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2.5 px-3 bg-sky-500/15 text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 font-mono text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <Send size={14} />
                          <span>Telegram</span>
                        </a>
                      )}
                      {socials.instagram && (
                        <a
                          href={socials.instagram.startsWith("http") ? socials.instagram : `https://instagram.com/${socials.instagram}`}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2.5 px-3 bg-pink-500/15 text-pink-400 border border-pink-500/30 hover:bg-pink-500/25 font-mono text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <ExternalLink size={14} />
                          <span>Instagram</span>
                        </a>
                      )}
                      {socials.whatsapp && (
                        <a
                          href={socials.whatsapp.startsWith("http") ? socials.whatsapp : `https://wa.me/${socials.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2.5 px-3 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 font-mono text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <MessageCircle size={14} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      {socials.vk && (
                        <a
                          href={socials.vk.startsWith("http") ? socials.vk : `https://vk.com/${socials.vk}`}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2.5 px-3 bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 font-mono text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <Globe size={14} />
                          <span>ВКонтакте</span>
                        </a>
                      )}
                      {socials.website && (
                        <a
                          href={socials.website.startsWith("http") ? socials.website : `https://${socials.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="col-span-2 py-2.5 px-3 bg-app-card text-app-primary border border-app-border hover:bg-app-hover font-mono text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <Globe size={14} />
                          <span>Официальный сайт</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })()}

              <button 
                onClick={() => setShowInfoModal(false)}
                className="w-full py-3 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs font-bold rounded-2xl transition-colors cursor-pointer"
              >
                Закрыть окно
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Detail Customizer Modal */}
      <AnimatePresence>
        {selectedServiceDetail && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full bg-app-modal border border-app-border rounded-3xl overflow-hidden text-app-primary shadow-2xl flex flex-col max-h-[90vh]"
            >
              {selectedServiceDetail.imageUrl ? (
                <div className="relative h-56 w-full shrink-0">
                  <img
                    src={selectedServiceDetail.imageUrl}
                    alt={selectedServiceDetail.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => {
                      setSelectedServiceDetail(null);
                      setDetailItemNote("");
                    }}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 backdrop-blur-md text-white keep-white hover:bg-black/80 transition-colors cursor-pointer"
                  >
                    <X size={18} className="text-white keep-white" />
                  </button>
                </div>
              ) : (
                <div className="p-6 border-b border-app-border flex justify-between items-center bg-app-modal-header">
                  <h3 className="text-base font-bold text-app-primary">{selectedServiceDetail.title}</h3>
                  <button
                    onClick={() => {
                      setSelectedServiceDetail(null);
                      setDetailItemNote("");
                    }}
                    className="text-app-muted hover:text-app-primary transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-app-primary">{selectedServiceDetail.title}</h2>
                    {selectedServiceDetail.category && (
                      <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider">
                        Категория: {selectedServiceDetail.category}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    {selectedServiceDetail.oldPrice && Number(selectedServiceDetail.oldPrice) > Number(selectedServiceDetail.price) && (
                      <span className="text-xs font-mono text-app-muted line-through mb-0.5">
                        {selectedServiceDetail.oldPrice} ₽
                      </span>
                    )}
                    <span className="text-base font-bold font-mono text-app-primary px-3 py-1 bg-app-card border border-app-border rounded-xl">
                      {selectedServiceDetail.price} ₽
                    </span>
                  </div>
                </div>

                {/* Dietary & Custom Badges in Modal */}
                {getServiceBadges(selectedServiceDetail).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {getServiceBadges(selectedServiceDetail).map(badge => (
                      <span key={badge} className="px-2.5 py-1 rounded-lg bg-app-badge text-app-primary font-mono text-xs border border-app-border font-medium">
                        {badge}
                      </span>
                    ))}
                  </div>
                )}

                {selectedServiceDetail.description && (
                  <p className="text-xs text-app-secondary leading-relaxed">
                    {selectedServiceDetail.description}
                  </p>
                )}

                {/* Fulfillment constraint info */}
                {(() => {
                  const f = selectedServiceDetail.fulfillment || "courier,pickup";
                  const hasCourier = f.includes("courier");
                  const hasPickup = f.includes("pickup");
                  if (!hasCourier) {
                    return (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2.5 text-xs text-amber-400 font-mono">
                        <Store size={16} className="shrink-0 text-amber-400" />
                        <span>Только самовывоз или оказание услуги в заведении (доставка недоступна).</span>
                      </div>
                    );
                  }
                  if (!hasPickup) {
                    return (
                      <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl flex items-center gap-2.5 text-xs text-sky-400 font-mono">
                        <Truck size={16} className="shrink-0 text-sky-400" />
                        <span>Только курьерская доставка (самовывоз недоступен).</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Meta details: Time, Weight, Tags */}
                {(selectedServiceDetail.prepTime || selectedServiceDetail.weight || selectedServiceDetail.tags) && (
                  <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                    {selectedServiceDetail.prepTime && (
                      <div className="p-2.5 bg-app-card rounded-xl flex items-center gap-2">
                        <Clock size={16} className="text-amber-500 shrink-0" />
                        <div>
                          <span className="block text-[9px] font-mono text-app-muted uppercase">Время</span>
                          <span className="text-xs font-semibold text-app-primary">{selectedServiceDetail.prepTime}</span>
                        </div>
                      </div>
                    )}
                    {selectedServiceDetail.weight && (
                      <div className="p-2.5 bg-app-card rounded-xl flex items-center gap-2">
                        <Scale size={16} className="text-sky-500 shrink-0" />
                        <div>
                          <span className="block text-[9px] font-mono text-app-muted uppercase">Вес / Объём</span>
                          <span className="text-xs font-semibold text-app-primary">{selectedServiceDetail.weight}</span>
                        </div>
                      </div>
                    )}
                    {selectedServiceDetail.tags && (
                      <div className="col-span-2 p-2.5 bg-app-card rounded-xl space-y-1">
                        <span className="block text-[9px] font-mono text-app-muted uppercase">Теги</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedServiceDetail.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                            <span key={tag} className="text-xs font-mono text-app-accent">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Gallery Photos if available */}
                {(() => {
                  let galleryImages: string[] = [];
                  if (selectedServiceDetail.gallery) {
                    try {
                      galleryImages = typeof selectedServiceDetail.gallery === "string"
                        ? JSON.parse(selectedServiceDetail.gallery)
                        : selectedServiceDetail.gallery;
                    } catch {}
                  }
                  if (Array.isArray(galleryImages) && galleryImages.length > 0) {
                    return (
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[10px] font-mono text-app-muted uppercase">Галерея фотографий</label>
                        <div className="grid grid-cols-3 gap-2">
                          {galleryImages.map((imgUrl, idx) => (
                            <div key={idx} className="h-20 rounded-xl overflow-hidden border border-app-border bg-app-card">
                              <img src={imgUrl} alt={`Фото ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Optional Note for Item */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-[11px] font-mono text-app-muted uppercase">Пожелания к блюду / позиции</label>
                  <input
                    type="text"
                    value={detailItemNote}
                    onChange={e => setDetailItemNote(e.target.value)}
                    placeholder="Например: без лука, погорячее..."
                    className="w-full bg-app-input border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-border transition-colors font-sans"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-app-border bg-app-bg flex gap-3">
                <button
                  onClick={() => {
                    toggleFavorite(selectedServiceDetail.id);
                  }}
                  className="p-3 rounded-2xl bg-app-surface border border-app-border hover:bg-app-hover text-app-primary transition-colors shrink-0"
                  title="В избранное"
                >
                  <Heart size={18} className={favorites.includes(selectedServiceDetail.id) ? "fill-rose-500 text-rose-500" : "text-app-muted"} />
                </button>
                <button
                  onClick={() => {
                    handleAddToCart(selectedServiceDetail.id, detailItemNote);
                    setSelectedServiceDetail(null);
                    setDetailItemNote("");
                    showToast(`"${selectedServiceDetail.title}" добавлено в корзину`, "success");
                  }}
                  className="flex-1 py-3 bg-app-accent text-app-bg font-bold font-mono text-xs uppercase rounded-2xl hover:bg-app-hover transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  <span>В корзину • {selectedServiceDetail.price} ₽</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="max-w-sm w-full bg-app-card border border-app-border rounded-2xl p-6 text-app-primary shadow-2xl space-y-5"
            >
              <div className="space-y-2">
                <h3 className="text-sm font-bold tracking-tight text-app-primary flex items-center gap-2">
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
                  className="px-4 py-2 bg-app-surface border border-app-border text-app-primary rounded-xl hover:bg-app-hover text-xs font-mono transition-colors"
                >
                  {confirmModal.cancelText || "Отмена"}
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-colors ${
                    confirmModal.isDangerous 
                      ? "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20" 
                      : "bg-app-accent text-app-accent-fg hover:opacity-90"
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
