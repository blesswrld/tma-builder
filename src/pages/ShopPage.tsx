import React, { useEffect, useState, useCallback, FormEvent } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ShoppingCart } from "lucide-react";
import NotFoundPage from "./NotFoundPage";
import { ShopPageSkeleton } from "../components/Skeleton";
import { useRealtime, useRealtimeEvent } from "../context/RealtimeContext";
import { useTheme } from "../context/ThemeContext";
import { jsPDF } from "jspdf";
import { validateCustomerName, validateCisPhone } from "../lib/validation";

import { Service, Shop, Banner, Review, Order, parseDeliveryOptions, getServiceBadges } from "../types";
import { ShopHeader } from "../components/shop/ShopHeader";
import { ShopHero } from "../components/shop/ShopHero";
import { ShopActiveOrderTracker } from "../components/shop/ShopActiveOrderTracker";
import { ShopBanners } from "../components/shop/ShopBanners";
import { ShopCategories } from "../components/shop/ShopCategories";
import { ServiceCard } from "../components/shop/ServiceCard";
import { ShopInfoModal } from "../components/shop/ShopInfoModal";
import { ServiceDetailModal } from "../components/shop/ServiceDetailModal";
import { CheckoutModal } from "../components/shop/CheckoutModal";
import { MyOrdersModal } from "../components/shop/MyOrdersModal";
import { ReviewsModal } from "../components/shop/ReviewsModal";
import { ConfirmModal } from "../components/shop/ConfirmModal";

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

export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cart & Catalog filters
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [cartNotes, setCartNotes] = useState<{ [key: string]: string }>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<string>("courier");

  // Modals & Drawers state
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedServiceDetail, setSelectedServiceDetail] = useState<Service | null>(null);
  const [detailItemNote, setDetailItemNote] = useState<string>("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);

  // Reviews slide-over
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsStats, setReviewsStats] = useState({ totalReviews: 0, avgRating: 5.0 });
  const [filterStar, setFilterStar] = useState<"ALL" | number>("ALL");
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [newReview, setNewReview] = useState({ name: "", rating: 5, comment: "" });
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null);
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState(false);

  // Promocode state
  const [promocodeInput, setPromocodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  // Tipping State
  const [tipPercent, setTipPercent] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>("");

  // Toast Notifications State
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: "success" | "error" | "warning" }>>([]);

  const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Custom Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Active Order Tracking
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Checkout form
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    deliveryAddress: "",
    tableNumber: "",
    preferredTime: "",
    note: "",
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { theme, toggleTheme } = useTheme();

  // Load saved favorites from localStorage
  useEffect(() => {
    try {
      const savedFavs = localStorage.getItem(`favs_${slug}`);
      if (savedFavs) {
        setFavorites(JSON.parse(savedFavs));
      }
    } catch (err) {
      console.error("Error reading favorites:", err);
    }
  }, [slug]);

  const toggleFavorite = (serviceId: string) => {
    setFavorites(prev => {
      const next = prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId];
      try {
        localStorage.setItem(`favs_${slug}`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Pre-fill Telegram WebApp user info if available
  useEffect(() => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
      setFormData(prev => ({
        ...prev,
        name: prev.name || [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" "),
      }));
    }
  }, []);

  // Fetch shop data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch(`/api/public/shops/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error("Заведение не найдено");
        return res.json();
      })
      .then(data => {
        if (!isMounted) return;
        setShop(data);
        setError(null);

        // Fetch banners
        fetch(`/api/public/shops/${data.id}/banners`)
          .then(r => r.ok ? r.json() : [])
          .then(bData => { if (isMounted) setBanners(bData); })
          .catch(() => {});

        // Fetch active order for this user phone / customer if saved in localStorage
        const savedPhone = localStorage.getItem(`customer_phone_${data.id}`);
        if (savedPhone) {
          fetch(`/api/public/shops/${data.id}/orders/my?phone=${encodeURIComponent(savedPhone)}`)
            .then(r => r.ok ? r.json() : [])
            .then((orders: Order[]) => {
              if (isMounted && orders.length > 0) {
                const pending = orders.find(o => o.status === "PENDING" || o.status === "CONFIRMED");
                if (pending) setActiveOrder(pending);
              }
            })
            .catch(() => {});
        }
      })
      .catch(err => {
        if (!isMounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [slug]);

  // Realtime subscription
  const { subscribeShop, isConnected } = useRealtime();

  useEffect(() => {
    if (shop?.id) {
      subscribeShop(shop.id);
    }
  }, [shop?.id, subscribeShop]);

  const refreshShopData = useCallback(() => {
    if (!slug) return;
    fetch(`/api/public/shops/${slug}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setShop(data);
          // Fetch banners in sync
          fetch(`/api/public/shops/${data.id}/banners`)
            .then(r => r.ok ? r.json() : [])
            .then(bData => setBanners(bData))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [slug]);

  const refreshMyOrders = useCallback(() => {
    if (!shop?.id) return;
    const savedPhone = localStorage.getItem(`customer_phone_${shop.id}`);
    const queryPhone = savedPhone || formData.phone || "";
    if (!queryPhone) return;

    fetch(`/api/public/shops/${shop.id}/orders/my?phone=${encodeURIComponent(queryPhone)}`)
      .then(res => res.ok ? res.json() : [])
      .then((orders: Order[]) => {
        setMyOrders(orders);
        if (orders.length > 0) {
          const active = orders.find(o => o.status === "PENDING" || o.status === "CONFIRMED");
          if (active) {
            setActiveOrder(active);
          } else {
            setActiveOrder(prev => {
              if (!prev) return null;
              const updated = orders.find(o => o.id === prev.id);
              return updated || null;
            });
          }
        }
      })
      .catch(() => {});
  }, [shop?.id, formData.phone]);

  // Auto-hide completed or cancelled order banner after 10 seconds
  useEffect(() => {
    if (activeOrder && (activeOrder.status === "COMPLETED" || activeOrder.status === "CANCELLED")) {
      const timer = setTimeout(() => {
        setActiveOrder(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [activeOrder?.id, activeOrder?.status]);

  const refreshReviews = useCallback(() => {
    if (!shop?.id) return;
    fetch(`/api/public/shops/${shop.id}/reviews`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setReviews(data.reviews || []);
          setReviewsStats(data.stats || { totalReviews: 0, avgRating: 5.0 });
        }
      })
      .catch(() => {});
  }, [shop?.id]);

  useEffect(() => {
    if (slug) {
      const interval = setInterval(() => {
        refreshShopData();
        refreshMyOrders();
        refreshReviews();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [slug, refreshShopData, refreshMyOrders, refreshReviews]);

  useRealtimeEvent(["SHOP_UPDATED", "SERVICE_UPDATED", "SERVICE_CREATED", "SERVICE_DELETED", "BANNER_CREATED", "BANNER_DELETED", "PROMOCODE_CREATED", "PROMOCODE_DELETED"], (event) => {
    if (!event.shopId || event.shopId === shop?.id) {
      refreshShopData();
    }
  });

  useRealtimeEvent(["REVIEW_CREATED", "REVIEW_UPDATED", "REVIEW_DELETED"], (event) => {
    if (!event.shopId || event.shopId === shop?.id) {
      refreshShopData();
      refreshReviews();
    }
  });

  useRealtimeEvent("BROADCAST_CREATED", (event) => {
    if (!event.shopId || event.shopId === shop?.id) {
      if (event.payload?.title || event.payload?.message) {
        showToast(`📢 ${event.payload.title || "Рассылка"}: ${event.payload.message || ""}`, "warning");
      }
    }
  });

  useRealtimeEvent(["ORDER_CREATED", "ORDER_DELETED", "CUSTOMER_UPDATED"], (event) => {
    if (!event.shopId || event.shopId === shop?.id) {
      refreshMyOrders();
    }
  });

  useRealtimeEvent(["ORDER_STATUS_UPDATED", "ORDER_STATUS_CHANGED"], (event: any) => {
    const payload = event.payload || event;
    const orderId = payload?.id || payload?.orderId;
    const status = payload?.status;
    if (orderId && status) {
      setActiveOrder(prev => (prev && prev.id === orderId) ? { ...prev, status } : prev);
      setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      const statusLabel = status === "COMPLETED" ? "Завершён" : status === "CONFIRMED" ? "Подтверждён" : status === "IN_PROGRESS" ? "В работе" : status === "CANCELLED" ? "Отменён" : "В ожидании";
      showToast(`Заказ #${orderId.slice(-6).toUpperCase()}: статус изменён на "${statusLabel}"`, status === "COMPLETED" ? "success" : status === "CANCELLED" ? "error" : "warning");
      refreshMyOrders();
    }
  });

  // Calculate cart metrics
  const totalItems = Object.values(cart).reduce<number>((sum, qty) => sum + (Number(qty) || 0), 0);
  
  const totalPrice = Object.entries(cart).reduce<number>((sum, [id, qty]) => {
    const service = shop?.services.find(s => s.id === id);
    return sum + (service ? service.price * (Number(qty) || 0) : 0);
  }, 0);

  // Promocode discount
  let discountValue = 0;
  if (appliedPromo) {
    if (appliedPromo.discountType === "PERCENT") {
      discountValue = Math.round((totalPrice * appliedPromo.discountValue) / 100);
    } else if (appliedPromo.discountType === "FIXED") {
      discountValue = Math.min(totalPrice, appliedPromo.discountValue);
    }
  }

  // Calculate tip amount
  const discountedPrice = Math.max(0, totalPrice - discountValue);
  let tipAmount = 0;
  if (customTip && !isNaN(Number(customTip)) && Number(customTip) > 0) {
    tipAmount = Math.round(Number(customTip));
  } else if (tipPercent > 0) {
    tipAmount = Math.round((discountedPrice * tipPercent) / 100);
  }

  // Delivery options & costs calculation
  const deliveryOpts = parseDeliveryOptions(shop?.deliveryOptions);
  const deliveryMinOrderVal = Number(deliveryOpts.deliveryMinOrder || deliveryOpts.minOrder || 0);
  const freeDeliveryThreshVal = Number(deliveryOpts.freeDeliveryThreshold || 0);
  const standardDeliveryFee = Number(deliveryOpts.deliveryFee || deliveryOpts.deliveryFeeVal || 0);

  const isDeliveryFree = freeDeliveryThreshVal > 0 && totalPrice >= freeDeliveryThreshVal;
  const calculatedDeliveryFee = isDeliveryFree ? 0 : standardDeliveryFee;

  const finalTotalPrice = Math.max(0, totalPrice - discountValue) + tipAmount + (fulfillmentMethod === "courier" ? calculatedDeliveryFee : 0);

  // Fulfillment restriction helper
  const isCourierDisabled = Object.entries(cart).some(([id, qty]) => {
    if (!qty) return false;
    const service = shop?.services.find(s => s.id === id);
    if (!service) return false;
    const f = service.fulfillment || "courier,pickup";
    return !f.includes("courier");
  });

  const isPickupDisabled = Object.entries(cart).some(([id, qty]) => {
    if (!qty) return false;
    const service = shop?.services.find(s => s.id === id);
    if (!service) return false;
    const f = service.fulfillment || "courier,pickup";
    return !f.includes("pickup");
  });

  const isOnlineDisabled = Object.entries(cart).some(([id, qty]) => {
    if (!qty) return false;
    const service = shop?.services.find(s => s.id === id);
    if (!service) return false;
    const f = service.fulfillment || "courier,pickup";
    return !f.includes("online");
  });

  useEffect(() => {
    if (isCourierDisabled && fulfillmentMethod === "courier") {
      setFulfillmentMethod(isPickupDisabled ? "online" : "pickup");
    } else if (isPickupDisabled && fulfillmentMethod === "pickup") {
      setFulfillmentMethod(isCourierDisabled ? "online" : "courier");
    } else if (isOnlineDisabled && fulfillmentMethod === "online") {
      setFulfillmentMethod(isPickupDisabled ? "courier" : "pickup");
    }
  }, [isCourierDisabled, isPickupDisabled, isOnlineDisabled, fulfillmentMethod]);

  // Cart operations
  const handleAddToCart = (serviceId: string, note?: string) => {
    setCart(prev => ({
      ...prev,
      [serviceId]: (prev[serviceId] || 0) + 1
    }));
    if (note) {
      setCartNotes(prev => ({ ...prev, [serviceId]: note }));
    }
  };

  const handleRemoveFromCart = (serviceId: string) => {
    setCart(prev => {
      const current = prev[serviceId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      }
      return { ...prev, [serviceId]: current - 1 };
    });
  };

  // Promocode validation handler
  const handleValidatePromo = async () => {
    if (!promocodeInput.trim() || !shop) return;
    setIsValidatingPromo(true);
    setPromoError(null);
    try {
      const res = await fetch(`/api/public/promocodes/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: shop.id, code: promocodeInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error || "Недействительный промокод");
        setAppliedPromo(null);
      } else {
        setAppliedPromo(data.promocode);
        setPromoError(null);
        showToast(`Промокод ${data.promocode.code} успешно применён!`, "success");
      }
    } catch (e) {
      setPromoError("Ошибка при проверке промокода");
    } finally {
      setIsValidatingPromo(false);
    }
  };

  // Checkout submission
  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!shop) return;

    const errors: { [key: string]: string } = {};

    const nameVal = validateCustomerName(formData.name);
    if (!nameVal.isValid) {
      errors.name = nameVal.error || "Некорректное имя";
    }

    const phoneVal = validateCisPhone(formData.phone);
    if (!phoneVal.isValid) {
      errors.phone = phoneVal.error || "Некорректный номер телефона";
    }

    if (fulfillmentMethod === "courier") {
      if (!formData.deliveryAddress.trim()) {
        errors.deliveryAddress = "Укажите адрес доставки";
      } else if (formData.deliveryAddress.trim().length < 5) {
        errors.deliveryAddress = "Адрес доставки слишком короткий";
      }

      if (deliveryMinOrderVal > 0 && totalPrice < deliveryMinOrderVal) {
        errors.general = `Минимальная сумма заказа для доставки — ${deliveryMinOrderVal} ₽`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const itemsPayload = Object.entries(cart).map(([id, quantity]) => {
        const s = shop.services.find(item => item.id === id);
        return {
          id,
          title: s?.title || "Услуга",
          price: s?.price || 0,
          quantity,
          note: cartNotes[id] || undefined,
        };
      });

      const payload = {
        shopId: shop.id,
        customerName: formData.name.trim(),
        customerPhone: phoneVal.formatted || formData.phone.trim(),
        deliveryAddress: fulfillmentMethod === "courier" ? formData.deliveryAddress.trim() : undefined,
        tableNumber: formData.tableNumber.trim() || undefined,
        preferredTime: formData.preferredTime.trim() || undefined,
        note: formData.note.trim() || undefined,
        fulfillmentMethod,
        promocode: appliedPromo?.code || undefined,
        discountAmount: discountValue,
        tipAmount,
        deliveryFee: fulfillmentMethod === "courier" ? calculatedDeliveryFee : 0,
        items: itemsPayload,
        totalPrice: finalTotalPrice,
      };

      const res = await fetch(`/api/public/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось оформить заказ");

      // Save customer phone for active order tracking
      try {
        localStorage.setItem(`customer_phone_${shop.id}`, phoneVal.formatted || formData.phone.trim());
      } catch (e) {}

      // Generate PDF Receipt Client-Side
      try {
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("ЧЕК ЗАКАЗА", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Заведение: ${shop.name}`, 14, 32);
        doc.text(`Номер заказа: #${data.order.id.slice(-6).toUpperCase()}`, 14, 38);
        doc.text(`Дата: ${new Date().toLocaleString("ru-RU")}`, 14, 44);
        doc.text(`Клиент: ${formData.name}`, 14, 50);
        doc.text(`Телефон: ${formData.phone}`, 14, 56);
        doc.text(`Способ получения: ${fulfillmentMethod === "courier" ? "Доставка" : "Самовывоз"}`, 14, 62);
        if (fulfillmentMethod === "courier" && formData.deliveryAddress) {
          doc.text(`Адрес: ${formData.deliveryAddress}`, 14, 68);
        }

        let yPos = fulfillmentMethod === "courier" ? 78 : 72;
        doc.line(14, yPos, 196, yPos);
        yPos += 8;

        doc.setFont("helvetica", "bold");
        doc.text("Позиция", 14, yPos);
        doc.text("Кол-во", 120, yPos);
        doc.text("Сумма", 160, yPos);
        yPos += 4;
        doc.line(14, yPos, 196, yPos);
        yPos += 8;

        doc.setFont("helvetica", "normal");
        itemsPayload.forEach(it => {
          doc.text(`${it.title}`, 14, yPos);
          doc.text(`${it.quantity}`, 120, yPos);
          doc.text(`${Number(it.price) * Number(it.quantity)} RUB`, 160, yPos);
          yPos += 6;
        });

        yPos += 4;
        doc.line(14, yPos, 196, yPos);
        yPos += 8;

        if (discountValue > 0) {
          doc.text(`Скидка по промокоду: -${discountValue} RUB`, 14, yPos);
          yPos += 6;
        }
        if (tipAmount > 0) {
          doc.text(`Чаевые: +${tipAmount} RUB`, 14, yPos);
          yPos += 6;
        }
        if (fulfillmentMethod === "courier") {
          doc.text(`Доставка: ${calculatedDeliveryFee} RUB`, 14, yPos);
          yPos += 6;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`ИТОГО К ОПЛАТЕ: ${finalTotalPrice} RUB`, 14, yPos);

        const pdfArrayBuffer = doc.output("arraybuffer");
        const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);

        // Send PDF via Telegram WebApp if available
        if (window.Telegram?.WebApp?.sendData) {
          window.Telegram.WebApp.sendData(JSON.stringify({
            event: "ORDER_CREATED",
            orderId: data.order.id,
            pdf: pdfBase64,
          }));
        }
      } catch (pdfErr) {
        console.error("Error generating PDF receipt:", pdfErr);
      }

      setCart({});
      setCartNotes({});
      setAppliedPromo(null);
      setPromocodeInput("");
      setTipPercent(0);
      setCustomTip("");
      setIsCheckoutOpen(false);
      setActiveOrder(data.order);

      showToast("Заказ успешно оформлен! Ожидайте подтверждения.", "success");
    } catch (err: any) {
      setFormErrors({ general: err.message || "Ошибка сервера" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open My Orders History modal
  const handleOpenMyOrders = () => {
    setIsMyOrdersOpen(true);
    setMyOrdersLoading(true);

    const savedPhone = localStorage.getItem(`customer_phone_${shop?.id}`);
    const queryPhone = savedPhone || formData.phone || "";

    fetch(`/api/public/shops/${shop?.id}/orders/my?phone=${encodeURIComponent(queryPhone)}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setMyOrders(data))
      .catch(() => setMyOrders([]))
      .finally(() => setMyOrdersLoading(false));
  };

  // Repeat Order from history
  const handleReorder = (order: Order) => {
    try {
      const items = JSON.parse(order.items);
      const newCart: { [key: string]: number } = {};
      items.forEach((it: any) => {
        newCart[it.id] = it.quantity || 1;
      });
      setCart(newCart);
      setIsMyOrdersOpen(false);
      setIsCheckoutOpen(true);
      showToast("Товары из предыдущего заказа добавлены в корзину!", "success");
    } catch (e) {
      showToast("Не удалось повторить заказ", "error");
    }
  };

  // Fetch Reviews
  const handleOpenReviews = () => {
    setIsReviewsOpen(true);
    if (!shop) return;
    setReviewsLoading(true);

    fetch(`/api/public/shops/${shop.id}/reviews`)
      .then(res => res.ok ? res.json() : { reviews: [], stats: { totalReviews: 0, avgRating: 5.0 } })
      .then(data => {
        setReviews(data.reviews || []);
        setReviewsStats(data.stats || { totalReviews: 0, avgRating: 5.0 });
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  };

  // Submit Review
  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    setIsSubmittingReview(true);
    setReviewSubmitError(null);
    setReviewSubmitSuccess(false);

    try {
      const res = await fetch(`/api/public/shops/${shop.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: newReview.name.trim() || "Аноним",
          rating: newReview.rating,
          comment: newReview.comment.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось отправить отзыв");

      setReviewSubmitSuccess(true);
      setNewReview({ name: "", rating: 5, comment: "" });
      setIsWriteReviewOpen(false);

      // Refresh reviews list
      fetch(`/api/public/shops/${shop.id}/reviews`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) {
            setReviews(d.reviews || []);
            setReviewsStats(d.stats || { totalReviews: 0, avgRating: 5.0 });
          }
        });

      showToast("Отзыв успешно опубликован! Спасибо.", "success");
    } catch (err: any) {
      setReviewSubmitError(err.message || "Ошибка отправки отзыва");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) return <ShopPageSkeleton />;
  if (error || !shop) return <NotFoundPage message={error || "Заведение не найдено"} />;

  // Filter Categories
  const categories = Array.from(new Set((shop.services || []).map(s => s.category).filter(Boolean))) as string[];

  const filteredServices = (shop.services || []).filter(s => {
    const matchesCategory =
      selectedCategory === "ALL" ? true :
      selectedCategory === "FAVORITES" ? favorites.includes(s.id) :
      s.category === selectedCategory;

    const matchesSearch = searchQuery.trim() === "" ? true :
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.tags && s.tags.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-app-bg text-app-primary selection:bg-app-accent selection:text-app-bg transition-colors duration-200">
      
      {/* Navigation Header */}
      <ShopHeader
        shop={shop}
        favoritesCount={favorites.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenInfoModal={() => setShowInfoModal(true)}
        onOpenMyOrders={handleOpenMyOrders}
        onOpenReviews={handleOpenReviews}
      />

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6 pb-28">
        
        {/* Hero Section */}
        <ShopHero
          shop={shop}
          reviewsStats={reviewsStats}
          onOpenInfoModal={() => setShowInfoModal(true)}
          onOpenReviews={handleOpenReviews}
        />

        {/* Active Order Tracker Banner */}
        {activeOrder && (
          <ShopActiveOrderTracker
            activeOrder={activeOrder}
            onOpenMyOrders={handleOpenMyOrders}
          />
        )}

        {/* Banners Carousel */}
        <ShopBanners banners={banners} />

        {/* Catalog Control Bar & Products List */}
        <section className="space-y-6">
          <ShopCategories
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            favoritesCount={favorites.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* Product Items List */}
          {filteredServices.length === 0 ? (
            <div className="py-20 text-center bg-app-surface border border-dashed border-app-border rounded-2xl space-y-2">
              <ShoppingCart size={28} className="mx-auto text-app-muted" />
              <p className="text-app-muted text-xs font-mono">По вашему запросу ничего не найдено.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map(service => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  quantity={cart[service.id] || 0}
                  isFavorite={favorites.includes(service.id)}
                  onToggleFavorite={toggleFavorite}
                  onAddToCart={handleAddToCart}
                  onRemoveFromCart={handleRemoveFromCart}
                  onSelectDetail={setSelectedServiceDetail}
                />
              ))}
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

      {/* Slide-over Checkout Modal */}
      <CheckoutModal
        shop={shop}
        cart={cart}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        promocodeInput={promocodeInput}
        setPromocodeInput={setPromocodeInput}
        handleValidatePromo={handleValidatePromo}
        isValidatingPromo={isValidatingPromo}
        promoError={promoError}
        appliedPromo={appliedPromo}
        discountValue={discountValue}
        tipPercent={tipPercent}
        setTipPercent={setTipPercent}
        customTip={customTip}
        setCustomTip={setCustomTip}
        tipAmount={tipAmount}
        totalPrice={totalPrice}
        finalTotalPrice={finalTotalPrice}
        fulfillmentMethod={fulfillmentMethod}
        setFulfillmentMethod={setFulfillmentMethod}
        isCourierDisabled={isCourierDisabled}
        isPickupDisabled={isPickupDisabled}
        isOnlineDisabled={isOnlineDisabled}
        calculatedDeliveryFee={calculatedDeliveryFee}
        isDeliveryFree={isDeliveryFree}
        deliveryMinOrderVal={deliveryMinOrderVal}
        freeDeliveryThreshVal={freeDeliveryThreshVal}
        formData={formData}
        setFormData={setFormData}
        formErrors={formErrors}
        isSubmitting={isSubmitting}
        handleSubmitOrder={handleSubmitOrder}
      />

      {/* Info & Contacts Modal */}
      <ShopInfoModal
        shop={shop}
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />

      {/* Product Detail Customizer Modal */}
      <ServiceDetailModal
        service={selectedServiceDetail}
        isFavorite={selectedServiceDetail ? favorites.includes(selectedServiceDetail.id) : false}
        onClose={() => setSelectedServiceDetail(null)}
        onToggleFavorite={toggleFavorite}
        onAddToCart={handleAddToCart}
        onShowToast={showToast}
      />

      {/* My Orders Modal */}
      <MyOrdersModal
        isOpen={isMyOrdersOpen}
        onClose={() => setIsMyOrdersOpen(false)}
        myOrders={myOrders}
        myOrdersLoading={myOrdersLoading}
        onReorder={handleReorder}
      />

      {/* Reviews Slide-over */}
      <ReviewsModal
        shop={shop}
        isOpen={isReviewsOpen}
        onClose={() => setIsReviewsOpen(false)}
        reviews={reviews}
        reviewsLoading={reviewsLoading}
        reviewsStats={reviewsStats}
        isWriteReviewOpen={isWriteReviewOpen}
        setIsWriteReviewOpen={setIsWriteReviewOpen}
        newReview={newReview}
        setNewReview={setNewReview}
        hoverRating={hoverRating}
        setHoverRating={setHoverRating}
        isSubmittingReview={isSubmittingReview}
        reviewSubmitError={reviewSubmitError}
        reviewSubmitSuccess={reviewSubmitSuccess}
        handleSubmitReview={handleSubmitReview}
        filterStar={filterStar}
        setFilterStar={setFilterStar}
      />

      {/* Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        isDangerous={confirmModal.isDangerous}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

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
              <p className="text-xs font-sans leading-relaxed">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
