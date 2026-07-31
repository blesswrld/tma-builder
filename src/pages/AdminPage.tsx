import React, { useEffect, useState, FormEvent, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Trash2, ExternalLink, Store, ShoppingBag, Check, Copy, Settings, 
  AlertCircle, Clock, CheckCircle2, XCircle, Package, RefreshCw, Phone, 
  User, ListOrdered, Edit3, Search, BarChart3, Tag, TrendingUp, Layers, 
  LogIn, LogOut, ShieldCheck, Mail, Lock, QrCode, Download, Volume2, 
  VolumeX, Crown, FileSpreadsheet, Bell, Star, Sparkles, Smartphone, 
  Image as ImageIcon, Send, Users, Radio, Gift, ChevronDown, ChevronUp, 
  Grid, X, Menu, SlidersHorizontal, ArrowUpRight, Zap, Sun, Moon
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useRealtime, useRealtimeEvent } from "../context/RealtimeContext";
import { useTheme } from "../context/ThemeContext";
import QrGeneratorModal from "../components/QrGeneratorModal";
import PlanModal from "../components/PlanModal";
import AnalyticsTab from "../components/AnalyticsTab";

interface Service {
  id: string;
  title: string;
  price: number;
  description: string | null;
  category?: string | null;
  imageUrl?: string | null;
  isAvailable?: boolean;
}

interface OrderItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  shopId: string;
  customerName: string;
  customerPhone: string;
  tableNumber?: string | null;
  preferredTime?: string | null;
  items: string; // JSON
  totalPrice: number;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  note?: string | null;
  createdAt: string;
}

interface Shop {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  botToken?: string | null;
  adminChatId?: string | null;
  workingHours?: string | null;
  address?: string | null;
  phone?: string | null;
  isOpen?: boolean;
  ownerId?: string | null;
  owner?: {
    id: string;
    email: string;
    name?: string | null;
  } | null;
  services: Service[];
  _count?: {
    orders: number;
  };
}

export default function AdminPage() {
  const { user, token, login, register, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Auth modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
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
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const { subscribeShop, isConnected } = useRealtime();

  useEffect(() => {
    if (selectedShop?.id) {
      subscribeShop(selectedShop.id);
    }
  }, [selectedShop?.id, subscribeShop]);

  useRealtimeEvent("ORDER_CREATED", (event) => {
    if (event.payload && event.shopId === selectedShop?.id) {
      setOrders(prev => [event.payload, ...prev.filter(o => o.id !== event.payload.id)]);
      setNewOrderAlert(event.payload);
      playOrderChime();
    }
  });

  useRealtimeEvent("ORDER_STATUS_UPDATED", (event) => {
    if (event.payload && event.shopId === selectedShop?.id) {
      setOrders(prev => prev.map(o => o.id === event.payload.id ? { ...o, status: event.payload.status } : o));
    }
  });

  useRealtimeEvent("ORDER_DELETED", (event) => {
    if (event.payload?.id) {
      setOrders(prev => prev.filter(o => o.id !== event.payload.id));
    }
  });

  useRealtimeEvent("SERVICE_CREATED", (event) => {
    if (event.payload && event.shopId === selectedShop?.id) {
      setShops(prev => prev.map(s => s.id === selectedShop?.id ? {
        ...s,
        services: [event.payload, ...s.services.filter(srv => srv.id !== event.payload.id)]
      } : s));
      setSelectedShop(prev => prev ? {
        ...prev,
        services: [event.payload, ...prev.services.filter(srv => srv.id !== event.payload.id)]
      } : prev);
    }
  });

  useRealtimeEvent("SERVICE_UPDATED", (event) => {
    if (event.payload && event.shopId === selectedShop?.id) {
      setShops(prev => prev.map(s => s.id === selectedShop?.id ? {
        ...s,
        services: s.services.map(srv => srv.id === event.payload.id ? { ...srv, ...event.payload } : srv)
      } : s));
      setSelectedShop(prev => prev ? {
        ...prev,
        services: prev.services.map(srv => srv.id === event.payload.id ? { ...srv, ...event.payload } : srv)
      } : prev);
    }
  });

  useRealtimeEvent("SERVICE_DELETED", (event) => {
    if (event.payload?.id && event.shopId === selectedShop?.id) {
      setShops(prev => prev.map(s => s.id === selectedShop?.id ? {
        ...s,
        services: s.services.filter(srv => srv.id !== event.payload.id)
      } : s));
      setSelectedShop(prev => prev ? {
        ...prev,
        services: prev.services.filter(srv => srv.id !== event.payload.id)
      } : prev);
    }
  });

  useRealtimeEvent("REVIEW_CREATED", (event) => {
    if (event.payload && event.shopId === selectedShop?.id) {
      setReviews(prev => [event.payload, ...prev.filter(r => r.id !== event.payload.id)]);
    }
  });

  useRealtimeEvent("REVIEW_UPDATED", (event) => {
    if (event.payload && event.shopId === selectedShop?.id) {
      setReviews(prev => prev.map(r => r.id === event.payload.id ? { ...r, ...event.payload } : r));
    }
  });

  useRealtimeEvent("CUSTOMER_UPDATED", (event) => {
    if (event.payload && event.shopId === selectedShop?.id) {
      setCustomers(prev => {
        const exists = prev.some(c => c.id === event.payload.id || c.phone === event.payload.phone);
        if (!exists) return [event.payload, ...prev];
        return prev.map(c => (c.id === event.payload.id || c.phone === event.payload.phone) ? { ...c, ...event.payload } : c);
      });
    }
  });

  useRealtimeEvent("BROADCAST_CREATED", (event) => {
    if (event.payload && event.shopId === selectedShop?.id) {
      setBroadcasts(prev => [event.payload, ...prev.filter(b => b.id !== event.payload.id)]);
    }
  });

  useRealtimeEvent("BROADCAST_DELETED", (event) => {
    if (event.payload?.id) {
      setBroadcasts(prev => prev.filter(b => b.id !== event.payload.id));
    }
  });

  useRealtimeEvent("PROMOCODE_CREATED", (event) => {
    if (event.payload && event.shopId === selectedShop?.id) {
      setPromocodes(prev => [event.payload, ...prev.filter(p => p.id !== event.payload.id)]);
    }
  });

  useRealtimeEvent("PROMOCODE_DELETED", (event) => {
    if (event.payload?.id) {
      setPromocodes(prev => prev.filter(p => p.id !== event.payload.id));
    }
  });

  useRealtimeEvent("BANNER_CREATED", (event) => {
    if (event.payload && event.shopId === selectedShop?.id) {
      setBanners(prev => [event.payload, ...prev.filter(b => b.id !== event.payload.id)]);
    }
  });

  useRealtimeEvent("BANNER_DELETED", (event) => {
    if (event.payload?.id) {
      setBanners(prev => prev.filter(b => b.id !== event.payload.id));
    }
  });

  useRealtimeEvent("SHOP_UPDATED", (event) => {
    if (event.payload?.id) {
      setShops(prev => prev.map(s => s.id === event.payload.id ? { ...s, ...event.payload } : s));
      if (selectedShop?.id === event.payload.id) {
        setSelectedShop(prev => prev ? { ...prev, ...event.payload } : prev);
      }
    }
  });

  // Admin tabs
  const [activeTab, setActiveTab] = useState<"services" | "orders" | "promocodes" | "reviews" | "banners" | "broadcasts" | "customers" | "analytics" | "botsim">("services");

  // Broadcasts
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);
  const [isCreatingBroadcast, setIsCreatingBroadcast] = useState(false);
  const [newBroadcastData, setNewBroadcastData] = useState({
    title: "",
    message: "",
    imageUrl: "",
    buttonText: "📱 Open Menu",
    targetFilter: "ALL"
  });
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  // CRM
  const [customers, setCustomers] = useState<any[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [bonusModalCustomer, setBonusModalCustomer] = useState<any | null>(null);
  const [bonusDeltaInput, setBonusDeltaInput] = useState<string>("100");

  // Banners
  const [banners, setBanners] = useState<any[]>([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [isCreatingBanner, setIsCreatingBanner] = useState(false);
  const [newBannerData, setNewBannerData] = useState({
    title: "",
    subtitle: "",
    badge: "",
    bgGradient: "from-zinc-900 to-indigo-950"
  });
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Bot simulator
  const [botSimMessages, setBotSimMessages] = useState<Array<{ sender: "bot" | "user"; text: string; button?: string; time: string }>>([
    { sender: "bot", text: "👋 Welcome! Tap the button below to open the Mini App storefront.", button: "📱 Open Menu", time: "12:00" }
  ]);
  const [botSimInput, setBotSimInput] = useState("");

  // Promocodes
  const [promocodes, setPromocodes] = useState<any[]>([]);
  const [promocodesLoading, setPromocodesLoading] = useState(false);
  const [isCreatingPromo, setIsCreatingPromo] = useState(false);
  const [newPromoData, setNewPromoData] = useState({ code: "", discountPercent: "", discountAmount: "", usageLimit: "" });
  const [promoError, setPromoError] = useState<string | null>(null);

  // Reviews
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("ALL");

  // Create Shop
  const [isCreatingShop, setIsCreatingShop] = useState(false);
  const [newShopData, setNewShopData] = useState({ name: "", slug: "", description: "" });
  const [createShopError, setCreateShopError] = useState<string | null>(null);
  const [createShopFieldErrors, setCreateShopFieldErrors] = useState<{ name?: string; slug?: string; description?: string }>({});

  // Add Service
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceData, setNewServiceData] = useState({ title: "", price: "", description: "", category: "", imageUrl: "" });
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceFieldErrors, setServiceFieldErrors] = useState<{ title?: string; price?: string; description?: string }>({});

  // Edit Service
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editServiceData, setEditServiceData] = useState({ title: "", price: "", description: "", category: "", imageUrl: "" });
  const [editServiceError, setEditServiceError] = useState<string | null>(null);
  const [editServiceFieldErrors, setEditServiceFieldErrors] = useState<{ title?: string; price?: string; description?: string }>({});
  const [isSavingEditService, setIsSavingEditService] = useState(false);

  // Filters
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");

  // Telegram guide
  const [isTgGuideOpen, setIsTgGuideOpen] = useState(false);

  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsData, setSettingsData] = useState({
    name: "",
    description: "",
    botToken: "",
    adminChatId: "",
    workingHours: "",
    address: "",
    phone: "",
    cashbackPercent: 5,
    isOpen: true
  });
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsFieldErrors, setSettingsFieldErrors] = useState<{ botToken?: string; adminChatId?: string; name?: string }>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Delete Shop
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);
  const [isDeletingShop, setIsDeletingShop] = useState(false);
  const [deleteShopError, setDeleteShopError] = useState<string | null>(null);

  // Device shop linking
  const [myDeviceShopIds, setMyDeviceShopIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("my_admin_shops");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [shopFilterMode, setShopFilterMode] = useState<"my" | "all">("my");

  // SaaS Features Modals
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
  const prevOrdersCountRef = useRef<number | null>(null);

  const playOrderChime = () => {
    if (!isAudioEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.3);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.12);
      osc2.stop(audioCtx.currentTime + 0.5);
    } catch (err) {
      console.error("Audio chime error:", err);
    }
  };

  const exportOrdersToCsv = () => {
    if (!orders || orders.length === 0) {
      alert("No orders to export.");
      return;
    }

    let csvContent = "\uFEFFOrder ID;Date & Time;Customer;Phone;Table / Time;Items;Total (₽);Status;Note\n";

    orders.forEach(order => {
      let parsedItems = "";
      try {
        const itemsArr = JSON.parse(order.items);
        if (Array.isArray(itemsArr)) {
          parsedItems = itemsArr.map((i: any) => `${i.title} (x${i.quantity})`).join(", ");
        } else {
          parsedItems = order.items;
        }
      } catch {
        parsedItems = order.items;
      }

      const tableOrTime = [order.tableNumber ? `Table: ${order.tableNumber}` : "", order.preferredTime ? `Time: ${order.preferredTime}` : ""].filter(Boolean).join(" | ") || "—";
      const formattedDate = new Date(order.createdAt).toLocaleString("en-US");

      const row = [
        order.id,
        formattedDate,
        `"${(order.customerName || "").replace(/"/g, '""')}"`,
        `"${(order.customerPhone || "").replace(/"/g, '""')}"`,
        `"${tableOrTime.replace(/"/g, '""')}"`,
        `"${parsedItems.replace(/"/g, '""')}"`,
        order.totalPrice,
        order.status,
        `"${(order.note || "").replace(/"/g, '""')}"`
      ];

      csvContent += row.join(";") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `orders_${selectedShop?.slug || "shop"}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const linkShopToDevice = (shopId: string) => {
    try {
      const updated = Array.from(new Set([...myDeviceShopIds, shopId]));
      localStorage.setItem("my_admin_shops", JSON.stringify(updated));
      setMyDeviceShopIds(updated);
    } catch (e) {
      console.error("Storage error:", e);
    }
  };

  const unlinkShopFromDevice = (shopId: string) => {
    try {
      const updated = myDeviceShopIds.filter(id => id !== shopId);
      localStorage.setItem("my_admin_shops", JSON.stringify(updated));
      setMyDeviceShopIds(updated);
    } catch (e) {
      console.error("Storage error:", e);
    }
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmittingAuth(true);

    try {
      if (authMode === "login") {
        await login(authEmail, authPassword);
      } else {
        await register(authEmail, authPassword, authName);
      }
      setIsAuthModalOpen(false);
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
      await fetchShops();
    } catch (err: any) {
      setAuthError(err.message || "Ошибка авторизации");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const fetchShops = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/shops", { headers });
      if (!res.ok) {
        let errMsg = `Server error (${res.status})`;
        const text = await res.text();
        try {
          const errData = JSON.parse(text);
          if (errData.error) errMsg = errData.error;
        } catch {
          if (text) errMsg = `${errMsg}: ${text.slice(0, 150)}`;
        }
        throw new Error(errMsg);
      }
      const data: Shop[] = await res.json();
      setShops(data);

      let currentDeviceIds = myDeviceShopIds;
      if (localStorage.getItem("my_admin_shops") === null && data.length > 0) {
        currentDeviceIds = data.map((s: Shop) => s.id);
        localStorage.setItem("my_admin_shops", JSON.stringify(currentDeviceIds));
        setMyDeviceShopIds(currentDeviceIds);
      }

      const myShops = data.filter((s: Shop) => currentDeviceIds.includes(s.id));
      const activeList = shopFilterMode === "my" && myShops.length > 0 ? myShops : data;

      setSelectedShop(prev => {
        if (prev) {
          const updated = data.find((s: Shop) => s.id === prev.id);
          if (updated) return updated;
        }
        return activeList.length > 0 ? activeList[0] : null;
      });
    } catch (err: any) {
      if (err instanceof TypeError || (err?.message && err.message.includes("Failed to fetch"))) {
        console.warn("Failed to fetch shops (network offline):", err.message);
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, [token]);

  const fetchOrders = async (shopId: string, silent = false) => {
    if (!silent) setOrdersLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/shops/${shopId}/orders`, { headers });
      if (res.ok) {
        const data: Order[] = await res.json();
        
        if (prevOrdersCountRef.current !== null && data.length > prevOrdersCountRef.current) {
          const newest = data[0];
          if (newest && newest.status === "PENDING") {
            setNewOrderAlert(newest);
            playOrderChime();
          }
        }
        prevOrdersCountRef.current = data.length;
        setOrders(data);
      }
    } catch (err: any) {
      if (err instanceof TypeError || (err?.message && err.message.includes("Failed to fetch"))) {
        console.warn("Error loading orders (network offline):", err.message);
      } else {
        console.error("Error loading orders:", err);
      }
    } finally {
      if (!silent) setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (selectedShop) {
      prevOrdersCountRef.current = null;
      fetchOrders(selectedShop.id);

      const interval = setInterval(() => {
        fetchOrders(selectedShop.id, true);
      }, 10000);

      return () => clearInterval(interval);
    } else {
      setOrders([]);
      prevOrdersCountRef.current = null;
    }
  }, [selectedShop?.id]);

  useEffect(() => {
    if (selectedShop) {
      if (activeTab === "orders") fetchOrders(selectedShop.id, true);
    }
  }, [activeTab]);

  const handleUpdateOrderStatus = async (orderId: string, status: Order["status"]) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status })
      });

      let data: any = {};
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (e) {}

      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        showToast("Статус заказа обновлен", "success");
      } else {
        showToast(data.error || text || "Не удалось обновить статус", "error");
      }
    } catch (err: any) {
      showToast("Ошибка сети: " + err.message, "error");
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    requestConfirm(
      "Удалить заказ?",
      "Вы действительно хотите удалить этот заказ? Это действие безвозвратно удалит все данные.",
      async () => {
        try {
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const res = await fetch(`/api/orders/${orderId}`, {
            method: "DELETE",
            headers
          });

          let data: any = {};
          const text = await res.text();
          try {
            data = JSON.parse(text);
          } catch (e) {}

          if (res.ok) {
            setOrders(prev => prev.filter(o => o.id !== orderId));
            showToast("Заказ успешно удален", "success");
          } else {
            showToast(data.error || text || "Не удалось удалить заказ", "error");
          }
        } catch (err: any) {
          showToast("Ошибка: " + err.message, "error");
        }
      },
      "Удалить",
      true
    );
  };

  const validateCreateShop = () => {
    const errors: { name?: string; slug?: string; description?: string } = {};

    if (!newShopData.name.trim() || newShopData.name.trim().length < 2) {
      errors.name = "Название должно содержать не менее 2 символов";
    }

    const cleanSlug = newShopData.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
    const slugRegex = /^[a-z0-9-]{2,30}$/;
    if (!cleanSlug) {
      errors.slug = "Введите адресную ссылку (Slug)";
    } else if (!slugRegex.test(cleanSlug)) {
      errors.slug = "Slug должен состоять из 2-30 букв латиницы, цифр или дефисов";
    }

    setCreateShopFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateShop = async (e: FormEvent) => {
    e.preventDefault();
    setCreateShopError(null);

    if (!validateCreateShop()) return;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/shops", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: newShopData.name.trim(),
          slug: newShopData.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-"),
          description: newShopData.description.trim() || undefined
        })
      });

      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Ошибка сервера (${res.status})`);
      }

      if (!res.ok) throw new Error(data.error || "Не удалось создать заведение");

      if (data?.id) {
        linkShopToDevice(data.id);
        setShopFilterMode("my");
      }

      setNewShopData({ name: "", slug: "", description: "" });
      setCreateShopFieldErrors({});
      setIsCreatingShop(false);
      await fetchShops();
      setSelectedShop(data);
    } catch (err: any) {
      setCreateShopError(err.message);
    }
  };

  const confirmDeleteShop = async () => {
    if (!shopToDelete) return;

    setIsDeletingShop(true);
    setDeleteShopError(null);

    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/shops/${shopToDelete.id}`, { method: "DELETE", headers });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Не удалось удалить заведение`);
      }

      unlinkShopFromDevice(shopToDelete.id);
      setShopToDelete(null);
      setSelectedShop(null);
      await fetchShops();
    } catch (err: any) {
      setDeleteShopError(err.message || "Ошибка при удалении заведения");
    } finally {
      setIsDeletingShop(false);
    }
  };

  const handleAddService = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;
    setServiceError(null);

    if (!newServiceData.title.trim() || !newServiceData.price) {
      setServiceError("Пожалуйста, заполните обязательные поля");
      return;
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/shops/${selectedShop.id}/services`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: newServiceData.title.trim(),
          price: Number(newServiceData.price),
          description: newServiceData.description.trim() || undefined,
          category: newServiceData.category.trim() || undefined,
          imageUrl: newServiceData.imageUrl.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось добавить позицию");

      setNewServiceData({ title: "", price: "", description: "", category: "", imageUrl: "" });
      setIsAddingService(false);
      await fetchShops();
    } catch (err: any) {
      setServiceError(err.message);
    }
  };

  const handleOpenEditService = (service: Service) => {
    setEditingService(service);
    setEditServiceData({
      title: service.title,
      price: service.price.toString(),
      description: service.description || "",
      category: service.category || "",
      imageUrl: service.imageUrl || ""
    });
    setEditServiceError(null);
  };

  const handleSaveEditService = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    setIsSavingEditService(true);
    setEditServiceError(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/services/${editingService.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          title: editServiceData.title.trim(),
          price: Number(editServiceData.price),
          description: editServiceData.description.trim() || undefined,
          category: editServiceData.category.trim() || undefined,
          imageUrl: editServiceData.imageUrl.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить изменения");

      setEditingService(null);
      await fetchShops();
    } catch (err: any) {
      setEditServiceError(err.message);
    } finally {
      setIsSavingEditService(false);
    }
  };

  const handleDeleteService = (serviceId: string) => {
    requestConfirm(
      "Удалить услугу?",
      "Вы действительно хотите удалить эту услугу? Она исчезнет из каталога для всех клиентов.",
      async () => {
        try {
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const res = await fetch(`/api/services/${serviceId}`, { method: "DELETE", headers });
          if (!res.ok) throw new Error("Не удалось удалить услугу");
          await fetchShops();
          showToast("Услуга успешно удалена", "success");
        } catch (err: any) {
          showToast(err.message, "error");
        }
      },
      "Удалить",
      true
    );
  };

  const handleToggleServiceAvailability = async (serviceId: string, currentStatus?: boolean) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/services/${serviceId}/toggle-availability`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ isAvailable: !currentStatus })
      });
      if (!res.ok) throw new Error("Не удалось изменить доступность услуги");
      await fetchShops();
      showToast(currentStatus ? "Услуга скрыта из каталога" : "Услуга теперь доступна для заказа", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const fetchPromocodes = async () => {
    if (!selectedShop) return;
    setPromocodesLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/shops/${selectedShop.id}/promocodes`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPromocodes(data);
      }
    } catch (e: any) {
      if (e instanceof TypeError || (e?.message && e.message.includes("Failed to fetch"))) {
        console.warn("Failed to fetch promocodes (network offline):", e.message);
      } else {
        console.error(e);
      }
    } finally {
      setPromocodesLoading(false);
    }
  };

  const handleCreatePromocode = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedShop || !newPromoData.code.trim()) return;
    setPromoError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/shops/${selectedShop.id}/promocodes`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          code: newPromoData.code.trim().toUpperCase(),
          discountPercent: Number(newPromoData.discountPercent) || 0,
          discountAmount: Number(newPromoData.discountAmount) || 0,
          usageLimit: Number(newPromoData.usageLimit) || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось создать промокод");
      setNewPromoData({ code: "", discountPercent: "", discountAmount: "", usageLimit: "" });
      setIsCreatingPromo(false);
      fetchPromocodes();
    } catch (err: any) {
      setPromoError(err.message);
    }
  };

  const handleDeletePromocode = (id: string) => {
    requestConfirm(
      "Удалить промокод?",
      "Вы действительно хотите удалить этот промокод? Клиенты больше не смогут его активировать.",
      async () => {
        try {
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;
          const res = await fetch(`/api/promocodes/${id}`, { method: "DELETE", headers });
          if (res.ok) {
            fetchPromocodes();
            showToast("Промокод успешно удален", "success");
          } else {
            showToast("Не удалось удалить промокод", "error");
          }
        } catch (e: any) {
          showToast("Ошибка: " + e.message, "error");
        }
      }
    );
  };

  const fetchReviews = async () => {
    if (!selectedShop) return;
    setReviewsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/shops/${selectedShop.id}/reviews`, { headers });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (e: any) {
      if (e instanceof TypeError || (e?.message && e.message.includes("Failed to fetch"))) {
        console.warn("Failed to fetch reviews (network offline):", e.message);
      } else {
        console.error(e);
      }
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchBanners = async () => {
    if (!selectedShop) return;
    setBannersLoading(true);
    try {
      const res = await fetch(`/api/shops/${selectedShop.id}/banners`);
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      }
    } catch (e: any) {
      if (e instanceof TypeError || (e?.message && e.message.includes("Failed to fetch"))) {
        console.warn("Failed to fetch banners (network offline):", e.message);
      } else {
        console.error(e);
      }
    } finally {
      setBannersLoading(false);
    }
  };

  const handleCreateBanner = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedShop || !newBannerData.title.trim()) return;
    setBannerError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/shops/${selectedShop.id}/banners`, {
        method: "POST",
        headers,
        body: JSON.stringify(newBannerData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось создать баннер");
      setNewBannerData({ title: "", subtitle: "", badge: "", bgGradient: "from-zinc-900 to-indigo-950" });
      setIsCreatingBanner(false);
      fetchBanners();
    } catch (err: any) {
      setBannerError(err.message);
    }
  };

  const handleDeleteBanner = (id: string) => {
    requestConfirm(
      "Удалить баннер?",
      "Вы действительно хотите удалить этот рекламный баннер? Он исчезнет с главного экрана витрины.",
      async () => {
        try {
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;
          const res = await fetch(`/api/banners/${id}`, { method: "DELETE", headers });
          if (res.ok) {
            fetchBanners();
            showToast("Баннер удален", "success");
          } else {
            showToast("Не удалось удалить баннер", "error");
          }
        } catch (e: any) {
          showToast("Ошибка: " + e.message, "error");
        }
      }
    );
  };

  const fetchBroadcasts = async () => {
    if (!selectedShop) return;
    setBroadcastsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/shops/${selectedShop.id}/broadcasts`, { headers });
      if (res.ok) {
        const data = await res.json();
        setBroadcasts(data);
      }
    } catch (e: any) {
      if (e instanceof TypeError || (e?.message && e.message.includes("Failed to fetch"))) {
        console.warn("Failed to fetch broadcasts (network offline):", e.message);
      } else {
        console.error(e);
      }
    } finally {
      setBroadcastsLoading(false);
    }
  };

  const handleCreateBroadcast = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedShop || !newBroadcastData.title.trim() || !newBroadcastData.message.trim()) return;
    setBroadcastError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/shops/${selectedShop.id}/broadcasts`, {
        method: "POST",
        headers,
        body: JSON.stringify(newBroadcastData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось создать рассылку");
      setNewBroadcastData({ title: "", message: "", imageUrl: "", buttonText: "📱 Открыть меню", targetFilter: "ALL" });
      setIsCreatingBroadcast(false);
      fetchBroadcasts();
    } catch (err: any) {
      setBroadcastError(err.message);
    }
  };

  const handleDeleteBroadcast = (id: string) => {
    requestConfirm(
      "Удалить историю рассылки?",
      "Вы действительно хотите удалить эту запись из истории рассылок? Это не отменит уже отправленные сообщения.",
      async () => {
        try {
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;
          const res = await fetch(`/api/broadcasts/${id}`, { method: "DELETE", headers });
          if (res.ok) {
            fetchBroadcasts();
            showToast("История рассылки удалена", "success");
          } else {
            showToast("Не удалось удалить запись", "error");
          }
        } catch (e: any) {
          showToast("Ошибка: " + e.message, "error");
        }
      }
    );
  };

  const fetchCustomers = async () => {
    if (!selectedShop) return;
    setCustomersLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/shops/${selectedShop.id}/customers`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (e: any) {
      if (e instanceof TypeError || (e?.message && e.message.includes("Failed to fetch"))) {
        console.warn("Failed to fetch customers (network offline):", e.message);
      } else {
        console.error(e);
      }
    } finally {
      setCustomersLoading(false);
    }
  };

  useEffect(() => {
    if (selectedShop) {
      fetchPromocodes();
      fetchReviews();
      fetchBanners();
      fetchBroadcasts();
      fetchCustomers();
    }
  }, [selectedShop?.id]);

  const handleOpenSettings = (shop: Shop) => {
    setSettingsData({
      name: shop.name,
      description: shop.description || "",
      botToken: shop.botToken || "",
      adminChatId: shop.adminChatId || "",
      workingHours: shop.workingHours || "",
      address: shop.address || "",
      phone: shop.phone || "",
      cashbackPercent: 5,
      isOpen: shop.isOpen !== false
    });
    setSettingsError(null);
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;

    setIsSavingSettings(true);
    setSettingsError(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/shops/${selectedShop.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: settingsData.name.trim(),
          description: settingsData.description.trim() || undefined,
          botToken: settingsData.botToken.trim() || undefined,
          adminChatId: settingsData.adminChatId.trim() || undefined,
          workingHours: settingsData.workingHours.trim() || undefined,
          address: settingsData.address.trim() || undefined,
          phone: settingsData.phone.trim() || undefined,
          isOpen: settingsData.isOpen
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось обновить настройки");

      setIsSettingsOpen(false);
      await fetchShops();
    } catch (err: any) {
      setSettingsError(err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSendBotSimMessage = (text: string) => {
    if (!text.trim()) return;
    const now = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const userMsg = { sender: "user" as const, text, time: now };
    
    let botReplyText = "Пожалуйста, нажмите на кнопку ниже, чтобы открыть интерактивное меню и оформить заказ:";
    let buttonText = "📱 Открыть Меню";

    const textLower = text.toLowerCase();
    if (textLower.includes("/start")) {
      botReplyText = `👋 Добро пожаловать в ${selectedShop?.name || "наше заведение"}!\n\nОформляйте заказы, копите бонусы и оставляйте отзывы прямо внутри Telegram Mini App.`;
    } else if (textLower.includes("статус") || textLower.includes("заказ") || textLower.includes("status") || textLower.includes("order")) {
      botReplyText = `📦 Проверяю статус вашего последнего заказа в CRM... Вы можете отслеживать актуальный статус выполнения во вкладке «Мои Заказы» в меню!`;
      buttonText = "📋 Мои Заказы";
    } else if (textLower.includes("бонус") || textLower.includes("скидк") || textLower.includes("промо") || textLower.includes("bonus")) {
      botReplyText = `🎁 У нас действует гибкая программа лояльности! Копите кешбэк с каждого заказа и используйте промокоды в корзине для получения скидок.`;
      buttonText = "📱 Открыть Меню";
    } else if (textLower.includes("отзыв") || textLower.includes("review") || textLower.includes("оценк")) {
      botReplyText = `⭐ Ваше мнение очень важно для нас! Пожалуйста, перейдите в раздел отзывов в меню и поделитесь вашими впечатлениями.`;
      buttonText = "⭐ Оставить отзыв";
    }

    const botMsg = { sender: "bot" as const, text: botReplyText, button: buttonText, time: now };
    setBotSimMessages(prev => [...prev, userMsg, botMsg]);
    setBotSimInput("");
  };

  const handleReplyReview = async (reviewId: string) => {
    if (!replyText.trim()) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ reply: replyText.trim() })
      });
      if (res.ok) {
        setReplyingReviewId(null);
        setReplyText("");
        fetchReviews();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const myShopsList = shops.filter(s => myDeviceShopIds.includes(s.id));
  const activeShops = shopFilterMode === "my" && myShopsList.length > 0 ? myShopsList : shops;

  const categories = selectedShop
    ? Array.from(new Set(selectedShop.services.map(s => s.category).filter(Boolean))) as string[]
    : [];

  const filteredServices = (selectedShop?.services || []).filter(service => {
    const matchesCategory = selectedCategoryFilter === "ALL" || service.category === selectedCategoryFilter;
    const matchesSearch = service.title.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
      (service.description && service.description.toLowerCase().includes(serviceSearchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const filteredOrders = orders.filter(o => orderStatusFilter === "ALL" || o.status === orderStatusFilter);

  return (
    <div className="min-h-screen bg-app-bg text-app-primary font-sans flex flex-col md:flex-row selection:bg-zinc-800">
      {/* Mobile Top Navigation */}
      <div className="md:hidden sticky top-0 z-40 bg-app-surface/90 backdrop-blur-xl border-b border-app-border px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-app-accent text-app-accent-fg flex items-center justify-center font-mono font-bold text-xs">
            ▲
          </div>
          <span className="font-semibold text-sm text-white font-mono">TMA BUILDER</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-app-muted hover:text-white">
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sleek Vercel / Linear Left Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-app-surface border-r border-app-border flex flex-col justify-between p-4 transition-transform duration-200
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="space-y-6">
          {/* Logo Brand Header */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-app-accent text-app-accent-fg flex items-center justify-center font-mono font-bold text-xs shadow-md shadow-white/10">
                ▲
              </div>
              <span className="font-bold text-sm tracking-tight text-app-primary font-mono">TMA BUILDER</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-md bg-app-card border border-app-border text-[9px] font-mono text-app-muted uppercase">
              v2.4
            </span>
          </div>

          {/* Workspace / Shop Selector Dropdown */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-app-muted px-2 block">
              Активное заведение
            </label>
            <div className="relative">
              <select
                value={selectedShop?.id || ""}
                onChange={(e) => {
                  const found = shops.find(s => s.id === e.target.value);
                  if (found) setSelectedShop(found);
                }}
                className="w-full bg-app-card border border-app-border hover:border-app-border text-xs font-medium text-white rounded-xl px-3 py-2.5 appearance-none focus:outline-none transition-colors cursor-pointer"
              >
                {activeShops.map(s => (
                  <option key={s.id} value={s.id} className="bg-app-card text-white">
                    {s.name} ({s.slug})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted pointer-events-none" />
            </div>

            {/* Quick Actions Bar */}
            {selectedShop && (
              <div className="flex items-center justify-between gap-1 px-1 pt-1">
                <button
                  onClick={() => setIsCreatingShop(true)}
                  className="flex-1 py-1.5 bg-app-card hover:bg-zinc-800 border border-app-border text-[11px] font-mono text-app-secondary rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Plus size={12} /> Заведение
                </button>
                <button
                  onClick={() => handleOpenSettings(selectedShop)}
                  className="p-1.5 bg-app-card hover:bg-zinc-800 border border-app-border text-app-muted hover:text-white rounded-lg transition-colors"
                  title="Настройки заведения"
                >
                  <Settings size={13} />
                </button>
                <a
                  href={`/${selectedShop.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-app-card hover:bg-zinc-800 border border-app-border text-app-muted hover:text-white rounded-lg transition-colors"
                  title="Открыть витрину"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1 font-mono text-xs">
            {[
              { id: "services", label: "Меню и услуги", icon: Layers, badge: selectedShop?.services.length },
              { id: "orders", label: "Заказы", icon: ShoppingBag, badge: orders.filter(o => o.status === "PENDING").length, alert: orders.filter(o => o.status === "PENDING").length > 0 },
              { id: "promocodes", label: "Промокоды", icon: Tag, badge: promocodes.length },
              { id: "reviews", label: "Отзывы", icon: Star, badge: reviews.length },
              { id: "banners", label: "Баннеры", icon: ImageIcon, badge: banners.length },
              { id: "broadcasts", label: "Рассылки", icon: Send, badge: broadcasts.length },
              { id: "customers", label: "Клиенты CRM", icon: Users, badge: customers.length },
              { id: "analytics", label: "Аналитика", icon: BarChart3 },
              { id: "botsim", label: "Симулятор бота", icon: Smartphone }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                    isActive 
                      ? "bg-app-accent text-app-accent-fg font-bold shadow-sm" 
                      : "text-app-muted hover:text-app-primary hover:bg-app-hover"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className={isActive ? "text-app-accent-fg" : "text-app-muted"} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all ${
                      tab.alert 
                        ? "bg-rose-500 text-white animate-pulse" 
                        : isActive 
                          ? "bg-white/20 text-white dark:bg-black/20 dark:text-black border border-white/20 dark:border-black/10" 
                          : "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-300/60 dark:border-zinc-700/60"
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Footer */}
        <div className="space-y-3 pt-4 border-t border-app-border font-mono text-xs">
          <div className="flex items-center justify-between px-1 gap-1">
            <button
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              className="p-2 bg-app-card hover:bg-zinc-800 border border-app-border rounded-xl text-app-muted hover:text-white transition-colors"
              title={isAudioEnabled ? "Отключить звук уведомлений" : "Включить звук уведомлений"}
            >
              {isAudioEnabled ? <Volume2 size={14} className="text-emerald-400" /> : <VolumeX size={14} />}
            </button>
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="p-2 bg-app-card hover:bg-zinc-800 border border-app-border rounded-xl text-app-muted hover:text-white transition-colors"
              title="Генератор QR-кодов"
            >
              <QrCode size={14} />
            </button>
            <button
              onClick={() => setIsPlanModalOpen(true)}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-1"
            >
              <Crown size={12} className="text-amber-400" />
              <span>{user?.plan || "БЕСПЛАТНЫЙ"}</span>
            </button>
          </div>

          <div className="p-3 bg-app-surface border border-app-border rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-zinc-800 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user?.email ? user.email.charAt(0).toUpperCase() : "А"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{user?.email || "Администратор"}</p>
                <p className="text-[10px] text-app-muted truncate">{token ? "Авторизован" : "Локальный сеанс"}</p>
              </div>
            </div>
            {token ? (
              <button onClick={logout} className="p-1.5 text-app-muted hover:text-rose-400 transition-colors" title="Выйти">
                <LogOut size={14} />
              </button>
            ) : (
              <button onClick={() => setIsAuthModalOpen(true)} className="p-1.5 text-app-muted hover:text-white transition-colors" title="Войти">
                <LogIn size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Workspace Top Bar Header */}
        <header className="h-16 border-b border-app-border px-6 flex items-center justify-between gap-4 bg-app-surface/80 backdrop-blur-md sticky top-0 z-30">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-app-muted font-mono">Заведение /</span>
              <h2 className="text-sm font-semibold tracking-tight text-white font-mono">
                {activeTab === "services" && "Меню и услуги"}
                {activeTab === "orders" && "Заказы"}
                {activeTab === "promocodes" && "Промокоды"}
                {activeTab === "reviews" && "Отзывы"}
                {activeTab === "banners" && "Баннеры"}
                {activeTab === "broadcasts" && "Рассылки"}
                {activeTab === "customers" && "Клиенты CRM"}
                {activeTab === "analytics" && "Аналитика"}
                {activeTab === "botsim" && "Симулятор бота"}
              </h2>
            </div>
            <p className="text-[11px] text-app-muted font-sans">
              Управление заведением {selectedShop?.name || ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-app-card hover:bg-app-hover border border-app-border text-app-primary rounded-xl transition-all cursor-pointer flex items-center justify-center"
              title={theme === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
            >
              {theme === "dark" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />}
            </button>

            {activeTab === "services" && (
              <button
                onClick={() => setIsAddingService(true)}
                className="px-3.5 py-2 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} /> Добавить услугу
              </button>
            )}

            {activeTab === "orders" && (
              <button
                onClick={exportOrdersToCsv}
                className="px-3.5 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs rounded-xl transition-all flex items-center gap-1.5"
              >
                <FileSpreadsheet size={14} /> Экспорт CSV
              </button>
            )}

            {activeTab === "promocodes" && (
              <button
                onClick={() => setIsCreatingPromo(true)}
                className="px-3.5 py-2 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5"
              >
                <Plus size={14} /> Новый промокод
              </button>
            )}

            {activeTab === "banners" && (
              <button
                onClick={() => setIsCreatingBanner(true)}
                className="px-3.5 py-2 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5"
              >
                <Plus size={14} /> Новый баннер
              </button>
            )}

            {activeTab === "broadcasts" && (
              <button
                onClick={() => setIsCreatingBroadcast(true)}
                className="px-3.5 py-2 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5"
              >
                <Plus size={14} /> Новая рассылка
              </button>
            )}
          </div>
        </header>

        {/* Tab Views Content Container */}
        <div className="p-6 flex-1 space-y-6">
          {!selectedShop && !loading && (
            <div className="py-20 text-center bg-app-surface border border-dashed border-app-border rounded-3xl p-8 space-y-4 max-w-md mx-auto">
              <Store size={36} className="mx-auto text-app-muted" />
              <h3 className="text-base font-semibold text-white">Заведение не создано</h3>
              <p className="text-xs text-app-muted leading-relaxed">
                Создайте свое первое заведение в Telegram Mini App, чтобы начать управлять каталогом, заказами и акциями.
              </p>
              <button
                onClick={() => setIsCreatingShop(true)}
                className="px-5 py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:bg-zinc-200 transition-colors uppercase tracking-wider"
              >
                + Создать заведение
              </button>
            </div>
          )}

          {selectedShop && (
            <>
              {/* TAB 1: SERVICES / MENU */}
              {activeTab === "services" && (
                <div className="space-y-6">
                  {/* Shop Welcome Message Widget */}
                  <div className="bg-app-surface border border-app-border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-app-card border border-app-border flex items-center justify-center shrink-0 mt-0.5 text-amber-500">
                        <Sparkles size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-mono font-bold text-app-muted uppercase tracking-wider">
                          Приветственное сообщение для покупателей
                        </span>
                        <p className="text-xs text-app-primary leading-relaxed">
                          {selectedShop.description || (
                            <span className="text-app-muted italic">
                              Приветственное сообщение не задано. Нажмите «Изменить», чтобы добавить описание для витрины.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenSettings(selectedShop)}
                      className="px-3.5 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs font-semibold rounded-xl transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
                    >
                      <Edit3 size={13} />
                      <span>Изменить</span>
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-app-surface p-3 rounded-2xl border border-app-border">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                      <button
                        onClick={() => setSelectedCategoryFilter("ALL")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                          selectedCategoryFilter === "ALL" ? "bg-app-accent text-app-accent-fg font-bold" : "text-app-muted hover:text-app-primary"
                        }`}
                      >
                        ВСЕ
                      </button>
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                            selectedCategoryFilter === cat ? "bg-app-accent text-app-accent-fg font-bold" : "text-app-muted hover:text-app-primary"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
                      <input
                        type="text"
                        value={serviceSearchQuery}
                        onChange={e => setServiceSearchQuery(e.target.value)}
                        placeholder="Поиск по меню..."
                        className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-600"
                      />
                    </div>
                  </div>

                  {filteredServices.length === 0 ? (
                    <div className="py-16 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
                      <p className="text-xs text-app-muted font-mono">В меню пока нет позиций.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredServices.map(service => (
                        <div
                          key={service.id}
                          className={`rounded-2xl border overflow-hidden transition-all flex flex-col justify-between ${
                            service.isAvailable === false ? "bg-app-surface/50 border-app-border opacity-60" : "bg-app-surface border-app-border hover:border-app-border"
                          }`}
                        >
                          {service.imageUrl && (
                            <div className="h-36 w-full overflow-hidden bg-zinc-950 border-b border-app-border relative">
                              <img
                                src={service.imageUrl}
                                alt={service.title}
                                className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                                referrerPolicy="no-referrer"
                              />
                              {service.category && (
                                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 border border-white/10 text-[9px] font-mono text-app-secondary uppercase tracking-wider backdrop-blur-md">
                                  {service.category}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="p-5 flex-1 flex flex-col justify-between">
                            <div className="space-y-2 mb-4">
                              <div className="flex justify-between items-start gap-2">
                                <h3 className="text-sm font-semibold text-white">{service.title}</h3>
                                <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded-md bg-white/5 border border-white/10 shrink-0">
                                  {service.price} ₽
                                </span>
                              </div>
                              {!service.imageUrl && service.category && (
                                <span className="inline-block px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-app-muted uppercase tracking-wider">
                                  {service.category}
                                </span>
                              )}
                              {service.description && (
                                <p className="text-xs text-app-muted line-clamp-2 leading-relaxed">{service.description}</p>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-app-border">
                              <button
                                onClick={() => handleToggleServiceAvailability(service.id, service.isAvailable)}
                                className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                  service.isAvailable !== false
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                }`}
                              >
                                {service.isAvailable !== false ? "В наличии" : "Отключено"}
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditService(service)}
                                  className="p-1.5 bg-app-card hover:bg-zinc-800 border border-app-border rounded-lg text-app-muted hover:text-white transition-colors cursor-pointer"
                                  title="Редактировать"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteService(service.id)}
                                  className="p-1.5 bg-app-card hover:bg-rose-900/30 border border-app-border hover:border-rose-800 text-app-muted hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                                  title="Удалить"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: LIVE ORDERS */}
              {activeTab === "orders" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none bg-app-surface p-3 rounded-2xl border border-app-border">
                    {[
                      { key: "ALL", label: "ВСЕ" },
                      { key: "PENDING", label: "ОЖИДАЕТ" },
                      { key: "CONFIRMED", label: "ПОДТВЕРЖДЕН" },
                      { key: "COMPLETED", label: "ВЫПОЛНЕН" },
                      { key: "CANCELLED", label: "ОТМЕНЕН" }
                    ].map(statusObj => (
                      <button
                        key={statusObj.key}
                        onClick={() => setOrderStatusFilter(statusObj.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                          orderStatusFilter === statusObj.key ? "bg-app-accent text-app-accent-fg font-bold" : "text-app-muted hover:text-app-primary"
                        }`}
                      >
                        {statusObj.label}
                      </button>
                    ))}
                  </div>

                  {filteredOrders.length === 0 ? (
                    <div className="py-20 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
                      <ShoppingBag size={28} className="mx-auto text-zinc-600 mb-2" />
                      <p className="text-xs text-app-muted font-mono">Заказов не найдено.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredOrders.map(order => {
                        let parsedItems: OrderItem[] = [];
                        try {
                          parsedItems = JSON.parse(order.items);
                        } catch (e) {}

                        return (
                          <div key={order.id} className="p-5 rounded-2xl bg-app-surface border border-app-border space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-app-border pb-3 font-mono text-xs">
                              <div className="flex items-center gap-3">
                                <span className="text-white font-bold">#{order.id.slice(-6)}</span>
                                <span className="text-app-muted">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {order.tableNumber && (
                                  <span className="px-2 py-0.5 bg-zinc-800 text-app-secondary rounded font-bold">
                                    Столик {order.tableNumber}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {[
                                  { key: "PENDING", label: "Ожидает" },
                                  { key: "CONFIRMED", label: "Принят" },
                                  { key: "COMPLETED", label: "Готов" },
                                  { key: "CANCELLED", label: "Отменен" }
                                ].map(st => (
                                  <button
                                    key={st.key}
                                    onClick={() => handleUpdateOrderStatus(order.id, st.key as any)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                                      order.status === st.key 
                                        ? st.key === 'COMPLETED' ? 'bg-emerald-500 text-black' :
                                          st.key === 'CONFIRMED' ? 'bg-amber-500 text-black' :
                                          st.key === 'CANCELLED' ? 'bg-rose-500 text-white' : 'bg-app-accent text-app-accent-fg'
                                        : 'bg-app-card text-app-muted hover:text-white border border-app-border'
                                    }`}
                                  >
                                    {st.label}
                                  </button>
                                ))}
                                <button onClick={() => handleDeleteOrder(order.id)} className="p-1 text-app-muted hover:text-rose-400">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="md:col-span-2 space-y-2">
                                <p className="text-[10px] font-mono uppercase text-app-muted">Позиции заказа</p>
                                <div className="space-y-1">
                                  {Array.isArray(parsedItems) && parsedItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs text-app-secondary font-mono">
                                      <span>{item.quantity}× {item.title}</span>
                                      <span className="text-app-muted">{(item.price || 0) * item.quantity} ₽</span>
                                    </div>
                                  ))}
                                </div>
                                {order.note && (
                                  <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl mt-2">
                                    Примечание: {order.note}
                                  </p>
                                )}
                              </div>

                              <div className="bg-app-card p-3 rounded-xl border border-app-border space-y-1 text-xs">
                                <p className="text-[10px] font-mono uppercase text-app-muted">Данные клиента</p>
                                <p className="font-semibold text-white">{order.customerName}</p>
                                <p className="font-mono text-app-muted">{order.customerPhone}</p>
                                <div className="pt-2 border-t border-app-border flex justify-between font-mono font-bold text-white text-sm">
                                  <span>Итого</span>
                                  <span>{order.totalPrice} ₽</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PROMOCODES */}
              {activeTab === "promocodes" && (
                <div className="space-y-6">
                  {promocodes.length === 0 ? (
                    <div className="py-16 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
                      <Tag size={28} className="mx-auto text-zinc-600 mb-2" />
                      <p className="text-xs text-app-muted font-mono">Нет активных промокодов.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {promocodes.map(promo => (
                        <div key={promo.id} className="p-5 rounded-2xl bg-app-surface border border-app-border flex justify-between items-start">
                          <div className="space-y-2">
                            <span className="px-2.5 py-1 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-lg uppercase">
                              {promo.code}
                            </span>
                            <p className="text-xs text-app-secondary font-mono">
                              Скидка: {promo.discountPercent > 0 ? `${promo.discountPercent}%` : `${promo.discountAmount} ₽`}
                            </p>
                            <p className="text-[11px] text-app-muted font-mono">
                              Использован: {promo.usedCount} раз {promo.usageLimit ? `/ лимит ${promo.usageLimit}` : ''}
                            </p>
                          </div>
                          <button onClick={() => handleDeletePromocode(promo.id)} className="p-1.5 text-app-muted hover:text-rose-400">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: REVIEWS */}
              {activeTab === "reviews" && (
                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <div className="py-16 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
                      <p className="text-xs text-app-muted font-mono">Отзывов пока нет.</p>
                    </div>
                  ) : (
                    reviews.map(rev => (
                      <div key={rev.id} className="p-5 rounded-2xl bg-app-surface border border-app-border space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-white">{rev.customerName}</span>
                            <span className="text-xs text-amber-400 font-mono">★ {rev.rating}</span>
                          </div>
                          <span className="text-[10px] text-app-muted font-mono">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {rev.comment && <p className="text-xs text-app-secondary leading-relaxed">{rev.comment}</p>}
                        {rev.reply ? (
                          <div className="p-3 bg-app-card rounded-xl border border-app-border text-xs">
                            <p className="text-[10px] text-app-muted font-mono uppercase mb-1">Ваш ответ</p>
                            <p className="text-app-secondary">{rev.reply}</p>
                          </div>
                        ) : replyingReviewId === rev.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              placeholder="Напишите ответ..."
                              className="flex-1 bg-app-card border border-app-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                            />
                            <button onClick={() => handleReplyReview(rev.id)} className="px-3 py-1.5 bg-app-accent text-app-accent-fg font-mono text-xs font-bold rounded-xl">
                              Отправить
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setReplyingReviewId(rev.id)} className="text-xs text-app-muted hover:text-white font-mono underline">
                            + Ответить на отзыв
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 5: BANNERS */}
              {activeTab === "banners" && (
                <div className="space-y-6">
                  {banners.length === 0 ? (
                    <div className="py-16 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
                      <p className="text-xs text-app-muted font-mono">Рекламные баннеры не настроены.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {banners.map(banner => (
                        <div key={banner.id} className="p-6 rounded-2xl bg-gradient-to-br from-[#18181c] to-[#121215] border border-app-border space-y-3 relative">
                          <button onClick={() => handleDeleteBanner(banner.id)} className="absolute top-4 right-4 p-1.5 text-app-muted hover:text-rose-400">
                            <Trash2 size={14} />
                          </button>
                          {banner.badge && (
                            <span className="px-2.5 py-0.5 bg-white/10 text-white font-mono text-[10px] rounded-full uppercase">
                              {banner.badge}
                            </span>
                          )}
                          <h3 className="text-base font-bold text-white">{banner.title}</h3>
                          {banner.subtitle && <p className="text-xs text-app-muted">{banner.subtitle}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: BROADCASTS */}
              {activeTab === "broadcasts" && (
                <div className="space-y-4">
                  {broadcasts.length === 0 ? (
                    <div className="py-16 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
                      <p className="text-xs text-app-muted font-mono">Рассылок пока не отправлялось.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {broadcasts.map(bc => {
                        const targetLabels: Record<string, string> = {
                          ALL: "Все клиенты",
                          ACTIVE: "Активные",
                          INACTIVE: "Спящие",
                          NEW: "Новые",
                          VIP: "VIP клиенты",
                          BONUS_HOLDERS: "С бонусами"
                        };
                        return (
                          <div key={bc.id} className="p-5 rounded-2xl bg-app-surface border border-app-border flex flex-col justify-between space-y-4">
                            <div className="space-y-3">
                              {/* Header row */}
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-mono rounded-md font-semibold">
                                      ✅ ОТПРАВЛЕНО
                                    </span>
                                    <span className="px-2 py-0.5 bg-zinc-800 text-app-secondary text-[9px] font-mono rounded-md">
                                      🎯 {targetLabels[bc.targetFilter] || bc.targetFilter || "Все клиенты"}
                                    </span>
                                  </div>
                                  <h3 className="text-sm font-bold text-white font-mono pt-1">{bc.title}</h3>
                                </div>
                                <button onClick={() => handleDeleteBroadcast(bc.id)} className="p-1.5 text-app-muted hover:text-rose-400 hover:bg-rose-500/5 rounded-lg transition-colors">
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              {/* Image preset if exists */}
                              {bc.imageUrl && (
                                <div className="rounded-xl overflow-hidden h-24 bg-zinc-950 border border-zinc-900">
                                  <img src={bc.imageUrl} alt={bc.title} className="w-full h-full object-cover opacity-85" />
                                </div>
                              )}

                              <p className="text-xs text-app-secondary leading-relaxed font-sans line-clamp-3">{bc.message}</p>
                            </div>

                            {/* Footer stats / buttons */}
                            <div className="pt-3 border-t border-app-border flex items-center justify-between text-[10px] font-mono text-app-muted">
                              <div>
                                Получателей: <span className="text-white font-bold">{bc.sentCount || 1}</span>
                              </div>
                              {bc.buttonText && (
                                <div className="px-2 py-1 bg-zinc-900 border border-app-border text-app-secondary rounded-lg text-[9px]">
                                  Button: {bc.buttonText}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: CRM CUSTOMERS */}
              {activeTab === "customers" && (
                <div className="space-y-4">
                  {customers.length === 0 ? (
                    <div className="py-16 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
                      <p className="text-xs text-app-muted font-mono">Клиенты пока не зарегистрированы.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-app-border bg-app-surface">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="bg-app-card border-b border-app-border text-app-muted uppercase text-[10px]">
                          <tr>
                            <th className="p-3">Клиент</th>
                            <th className="p-3">Телефон</th>
                            <th className="p-3">Заказов</th>
                            <th className="p-3">Всего потрачено</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                          {customers.map(c => (
                            <tr key={c.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-3 text-white font-semibold">{c.name || "Клиент"}</td>
                              <td className="p-3 text-app-muted">{c.phone}</td>
                              <td className="p-3 text-white">{c.ordersCount || 1}</td>
                              <td className="p-3 text-emerald-400 font-bold">{c.totalSpent || 0} ₽</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 8: ANALYTICS */}
              {activeTab === "analytics" && (
                <AnalyticsTab shopId={selectedShop.id} />
              )}

              {/* TAB 9: TELEGRAM BOT SIMULATOR */}
              {activeTab === "botsim" && (
                <div className="max-w-md mx-auto p-4 rounded-3xl bg-app-surface border border-app-border shadow-2xl space-y-4 font-sans">
                  <div className="flex items-center justify-between border-b border-app-border pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-white font-mono">{selectedShop.name} Бот</span>
                    </div>
                    <span className="text-[10px] text-app-muted font-mono">Telegram Симулятор</span>
                  </div>

                  <div className="h-80 overflow-y-auto space-y-3 p-2 font-sans">
                    {botSimMessages.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3 rounded-2xl max-w-[80%] text-xs ${msg.sender === 'user' ? 'bg-app-accent text-app-accent-fg' : 'bg-app-card text-white border border-app-border'}`}>
                          <p>{msg.text}</p>
                          {msg.button && (
                            <a
                              href={`/${selectedShop.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 block w-full py-2 bg-app-accent text-app-accent-fg text-center rounded-xl font-mono text-xs font-bold hover:bg-zinc-200 transition-colors"
                            >
                              {msg.button}
                            </a>
                          )}
                        </div>
                        <span className="text-[9px] text-zinc-600 font-mono mt-1">{msg.time}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 border-t border-app-border pt-3">
                    <input
                      type="text"
                      value={botSimInput}
                      onChange={e => setBotSimInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendBotSimMessage(botSimInput)}
                      placeholder="Введите /start или сообщение..."
                      className="flex-1 bg-app-card border border-app-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <button onClick={() => handleSendBotSimMessage(botSimInput)} className="px-3 py-2 bg-app-accent text-app-accent-fg rounded-xl font-mono text-xs font-bold">
                      Отправить
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* DRAWERS & MODALS */}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-app-surface border border-app-border rounded-3xl p-6 text-white space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold tracking-tight uppercase font-mono">
                {authMode === "login" ? "Вход в аккаунт" : "Регистрация"}
              </h3>
              <button onClick={() => setIsAuthModalOpen(false)} className="text-app-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            {authError && <p className="text-xs text-rose-400 font-mono">{authError}</p>}
            <form onSubmit={handleAuthSubmit} className="space-y-3 font-sans">
              {authMode === "register" && (
                <input
                  type="text"
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  placeholder="ФИО / Имя"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              )}
              <input
                type="email"
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                placeholder="Электронная почта"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
              />
              <input
                type="password"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                placeholder="Пароль"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
              />
              <button type="submit" disabled={isSubmittingAuth} className="w-full py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:bg-zinc-200 uppercase">
                {isSubmittingAuth ? "Загрузка..." : authMode === "login" ? "Войти" : "Зарегистрироваться"}
              </button>
            </form>
            <div className="text-center pt-2">
              <button
                onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                className="text-xs text-app-muted hover:text-white font-mono underline"
              >
                {authMode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Shop Modal */}
      {isCreatingShop && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-6 text-white space-y-4">
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <h3 className="text-sm font-semibold tracking-tight font-mono">Создать заведение</h3>
              <button onClick={() => setIsCreatingShop(false)} className="text-app-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            {createShopError && <p className="text-xs text-rose-400 font-mono">{createShopError}</p>}
            <form onSubmit={handleCreateShop} className="space-y-3 font-sans">
              <div>
                <input
                  type="text"
                  value={newShopData.name}
                  onChange={e => setNewShopData(p => ({ ...p, name: e.target.value }))}
                  placeholder="Название заведения *"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
                {createShopFieldErrors.name && <p className="text-[11px] text-rose-400 mt-1 font-mono">{createShopFieldErrors.name}</p>}
              </div>
              <div>
                <input
                  type="text"
                  value={newShopData.slug}
                  onChange={e => setNewShopData(p => ({ ...p, slug: e.target.value }))}
                  placeholder="URL-слаг (напр. coffee-bar) *"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
                />
                {createShopFieldErrors.slug && <p className="text-[11px] text-rose-400 mt-1 font-mono">{createShopFieldErrors.slug}</p>}
              </div>
              <textarea
                rows={2}
                value={newShopData.description}
                onChange={e => setNewShopData(p => ({ ...p, description: e.target.value }))}
                placeholder="Описание заведения..."
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none resize-none"
              />
              <button type="submit" className="w-full py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:bg-zinc-200 uppercase">
                Создать заведение
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {isAddingService && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-6 text-white space-y-4">
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <h3 className="text-sm font-semibold font-mono">Новая услуга / позиция</h3>
              <button onClick={() => setIsAddingService(false)} className="text-app-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            {serviceError && <p className="text-xs text-rose-400 font-mono">{serviceError}</p>}
            <form onSubmit={handleAddService} className="space-y-3 font-sans">
              <input
                type="text"
                value={newServiceData.title}
                onChange={e => setNewServiceData(p => ({ ...p, title: e.target.value }))}
                placeholder="Название *"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
              />
              <input
                type="number"
                value={newServiceData.price}
                onChange={e => setNewServiceData(p => ({ ...p, price: e.target.value }))}
                placeholder="Цена (₽) *"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
              />
              <input
                type="text"
                value={newServiceData.category}
                onChange={e => setNewServiceData(p => ({ ...p, category: e.target.value }))}
                placeholder="Категория (напр. Кофе, Десерты)"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
              />
              <textarea
                rows={2}
                value={newServiceData.description}
                onChange={e => setNewServiceData(p => ({ ...p, description: e.target.value }))}
                placeholder="Описание..."
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none resize-none"
              />
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-app-muted font-mono uppercase">Изображение (URL / пресеты)</span>
                  {newServiceData.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setNewServiceData(p => ({ ...p, imageUrl: "" }))}
                      className="text-[9px] text-rose-400 font-mono hover:underline cursor-pointer"
                    >
                      Очистить
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={newServiceData.imageUrl}
                  onChange={e => setNewServiceData(p => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="Вставьте ссылку на картинку..."
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: "☕ Кофе", url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=300" },
                    { label: "🍰 Торт", url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=300" },
                    { label: "🍔 Бургер", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=300" },
                    { label: "🍕 Пицца", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=300" },
                    { label: "💈 Стрижка", url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=300" },
                  ].map(pr => (
                    <button
                      key={pr.label}
                      type="button"
                      onClick={() => setNewServiceData(p => ({ ...p, imageUrl: pr.url }))}
                      className={`px-2 py-0.5 rounded border text-[9px] font-mono transition-colors cursor-pointer ${
                        newServiceData.imageUrl === pr.url
                          ? "bg-app-accent text-app-accent-fg border-transparent font-semibold"
                          : "bg-zinc-900 border-app-border text-app-muted hover:text-white"
                      }`}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>
                {newServiceData.imageUrl && (
                  <div className="mt-1 flex items-center justify-center border border-app-border rounded-xl overflow-hidden bg-zinc-950/50 p-2">
                    <img
                      src={newServiceData.imageUrl}
                      alt="Превью"
                      className="max-h-24 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=300";
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
              <button type="submit" className="w-full py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:bg-zinc-200 uppercase">
                Сохранить позицию
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-6 text-white space-y-4">
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <h3 className="text-sm font-semibold font-mono">Редактирование услуги</h3>
              <button onClick={() => setEditingService(null)} className="text-app-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            {editServiceError && <p className="text-xs text-rose-400 font-mono">{editServiceError}</p>}
            <form onSubmit={handleSaveEditService} className="space-y-3 font-sans">
              <input
                type="text"
                value={editServiceData.title}
                onChange={e => setEditServiceData(p => ({ ...p, title: e.target.value }))}
                placeholder="Название *"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
              />
              <input
                type="number"
                value={editServiceData.price}
                onChange={e => setEditServiceData(p => ({ ...p, price: e.target.value }))}
                placeholder="Цена (₽) *"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
              />
              <input
                type="text"
                value={editServiceData.category}
                onChange={e => setEditServiceData(p => ({ ...p, category: e.target.value }))}
                placeholder="Категория"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
              />
              <textarea
                rows={2}
                value={editServiceData.description}
                onChange={e => setEditServiceData(p => ({ ...p, description: e.target.value }))}
                placeholder="Описание..."
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none resize-none"
              />
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-app-muted font-mono uppercase">Изображение (URL / пресеты)</span>
                  {editServiceData.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setEditServiceData(p => ({ ...p, imageUrl: "" }))}
                      className="text-[9px] text-rose-400 font-mono hover:underline cursor-pointer"
                    >
                      Очистить
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={editServiceData.imageUrl}
                  onChange={e => setEditServiceData(p => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="Вставьте ссылку на картинку..."
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: "☕ Кофе", url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=300" },
                    { label: "🍰 Торт", url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=300" },
                    { label: "🍔 Бургер", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=300" },
                    { label: "🍕 Пицца", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=300" },
                    { label: "💈 Стрижка", url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=300" },
                  ].map(pr => (
                    <button
                      key={pr.label}
                      type="button"
                      onClick={() => setEditServiceData(p => ({ ...p, imageUrl: pr.url }))}
                      className={`px-2 py-0.5 rounded border text-[9px] font-mono transition-colors cursor-pointer ${
                        editServiceData.imageUrl === pr.url
                          ? "bg-app-accent text-app-accent-fg border-transparent font-semibold"
                          : "bg-zinc-900 border-app-border text-app-muted hover:text-white"
                      }`}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>
                {editServiceData.imageUrl && (
                  <div className="mt-1 flex items-center justify-center border border-app-border rounded-xl overflow-hidden bg-zinc-950/50 p-2">
                    <img
                      src={editServiceData.imageUrl}
                      alt="Превью"
                      className="max-h-24 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=300";
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
              <button type="submit" disabled={isSavingEditService} className="w-full py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:bg-zinc-200 uppercase">
                {isSavingEditService ? "Сохранение..." : "Обновить позицию"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-6 text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <h3 className="text-sm font-semibold font-mono">Настройки заведения</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-app-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            {settingsError && <p className="text-xs text-rose-400 font-mono">{settingsError}</p>}
            <form onSubmit={handleSaveSettings} className="space-y-3 font-sans">
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1">
                  Название заведения *
                </label>
                <input
                  type="text"
                  value={settingsData.name}
                  onChange={e => setSettingsData(p => ({ ...p, name: e.target.value }))}
                  placeholder="Название заведения *"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1">
                  Приветственное сообщение / Описание (витрина)
                </label>
                <textarea
                  rows={3}
                  value={settingsData.description}
                  onChange={e => setSettingsData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Приветственное сообщение или описание заведения, которое увидят клиенты на главной странице..."
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1">
                  Токен Telegram бота
                </label>
                <input
                  type="text"
                  value={settingsData.botToken}
                  onChange={e => setSettingsData(p => ({ ...p, botToken: e.target.value }))}
                  placeholder="Токен Telegram бота"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1">
                  ID чата администратора
                </label>
                <input
                  type="text"
                  value={settingsData.adminChatId}
                  onChange={e => setSettingsData(p => ({ ...p, adminChatId: e.target.value }))}
                  placeholder="ID чата администратора"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1">
                  Часы работы
                </label>
                <input
                  type="text"
                  value={settingsData.workingHours}
                  onChange={e => setSettingsData(p => ({ ...p, workingHours: e.target.value }))}
                  placeholder="Часы работы (напр. 09:00 - 22:00)"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1">
                  Фактический адрес
                </label>
                <input
                  type="text"
                  value={settingsData.address}
                  onChange={e => setSettingsData(p => ({ ...p, address: e.target.value }))}
                  placeholder="Фактический адрес"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1">
                  Контактный телефон
                </label>
                <input
                  type="text"
                  value={settingsData.phone}
                  onChange={e => setSettingsData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="Контактный телефон"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isOpenCheck"
                  checked={settingsData.isOpen}
                  onChange={e => setSettingsData(p => ({ ...p, isOpen: e.target.checked }))}
                  className="rounded bg-app-card border-app-border text-app-primary focus:ring-0"
                />
                <label htmlFor="isOpenCheck" className="text-xs font-mono text-app-secondary">Заведение открыто для заказов</label>
              </div>
              <button type="submit" disabled={isSavingSettings} className="w-full py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-opacity uppercase">
                {isSavingSettings ? "Сохранение..." : "Сохранить настройки"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Promo Modal */}
      {isCreatingPromo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-6 text-white space-y-4">
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <h3 className="text-sm font-semibold font-mono">Создать промокод</h3>
              <button onClick={() => setIsCreatingPromo(false)} className="text-app-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            {promoError && <p className="text-xs text-rose-400 font-mono">{promoError}</p>}
            <form onSubmit={handleCreatePromocode} className="space-y-3 font-sans">
              <input
                type="text"
                value={newPromoData.code}
                onChange={e => setNewPromoData(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="ПРОМОКОД (напр. SALE20) *"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono uppercase"
              />
              <input
                type="number"
                value={newPromoData.discountPercent}
                onChange={e => setNewPromoData(p => ({ ...p, discountPercent: e.target.value }))}
                placeholder="Процент скидки (%)"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
              />
              <input
                type="number"
                value={newPromoData.discountAmount}
                onChange={e => setNewPromoData(p => ({ ...p, discountAmount: e.target.value }))}
                placeholder="Фиксированная скидка (₽)"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
              />
              <input
                type="number"
                value={newPromoData.usageLimit}
                onChange={e => setNewPromoData(p => ({ ...p, usageLimit: e.target.value }))}
                placeholder="Лимит использований (опционально)"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
              />
              <button type="submit" className="w-full py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:bg-zinc-200 uppercase">
                Создать промокод
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Banner Modal */}
      {isCreatingBanner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-6 text-white space-y-4">
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <h3 className="text-sm font-semibold font-mono">Создать баннер</h3>
              <button onClick={() => setIsCreatingBanner(false)} className="text-app-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            {bannerError && <p className="text-xs text-rose-400 font-mono">{bannerError}</p>}
            <form onSubmit={handleCreateBanner} className="space-y-3 font-sans">
              <input
                type="text"
                value={newBannerData.title}
                onChange={e => setNewBannerData(p => ({ ...p, title: e.target.value }))}
                placeholder="Заголовок *"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
              />
              <input
                type="text"
                value={newBannerData.subtitle}
                onChange={e => setNewBannerData(p => ({ ...p, subtitle: e.target.value }))}
                placeholder="Подзаголовок"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
              />
              <input
                type="text"
                value={newBannerData.badge}
                onChange={e => setNewBannerData(p => ({ ...p, badge: e.target.value }))}
                placeholder="Текст бейджа (напр. АКЦИЯ, НОВИНКА)"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
              />
              <button type="submit" className="w-full py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:bg-zinc-200 uppercase">
                Сохранить баннер
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Broadcast Modal */}
      {isCreatingBroadcast && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-app-surface border border-app-border rounded-3xl p-6 text-white flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto">
            {/* Left Column: Form Settings */}
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center border-b border-app-border pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold font-mono text-white">Гибкий конструктор рассылки</h3>
                  <p className="text-[11px] text-app-muted font-sans">Настройте таргетинг, шаблоны и интерактивные кнопки</p>
                </div>
                <button onClick={() => setIsCreatingBroadcast(false)} className="text-app-muted hover:text-white md:hidden">
                  <X size={18} />
                </button>
              </div>

              {broadcastError && <p className="text-xs text-rose-400 font-mono bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">{broadcastError}</p>}

              <form onSubmit={handleCreateBroadcast} className="space-y-4 font-sans text-xs">
                {/* Campaign Name */}
                <div className="space-y-1">
                  <label className="block text-[11px] text-app-muted font-mono uppercase tracking-wider">Заголовок кампании *</label>
                  <input
                    type="text"
                    value={newBroadcastData.title}
                    onChange={e => setNewBroadcastData(p => ({ ...p, title: e.target.value }))}
                    placeholder="Например: Спецпредложение для постоянных клиентов! 🔥"
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-app-border"
                    required
                  />
                </div>

                {/* Target Audience selection */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] text-app-muted font-mono uppercase tracking-wider">Целевая аудитория (Таргетинг)</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { id: "ALL", label: "Все клиенты", desc: "Вся база CRM" },
                      { id: "ACTIVE", label: "Активные", desc: "Сделали >1 заказа" },
                      { id: "INACTIVE", label: "Спящие", desc: "0 заказов в CRM" },
                      { id: "NEW", label: "Новые", desc: "Регистрация <7 дней" },
                      { id: "VIP", label: "VIP клиенты", desc: "Сумма трат >3000 ₽" },
                      { id: "BONUS_HOLDERS", label: "С бонусами", desc: "Баланс бонусов >0" },
                    ].map(target => (
                      <button
                        key={target.id}
                        type="button"
                        onClick={() => setNewBroadcastData(p => ({ ...p, targetFilter: target.id }))}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 ${
                          newBroadcastData.targetFilter === target.id
                            ? "bg-app-accent text-app-accent-fg border-white font-bold animate-pulse-subtle"
                            : "bg-app-card border-app-border text-app-secondary hover:border-app-border"
                        }`}
                      >
                        <span className="font-semibold block text-[11px] font-mono">{target.label}</span>
                        <span className={`text-[9px] block ${newBroadcastData.targetFilter === target.id ? "text-zinc-600" : "text-app-muted"}`}>{target.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Text with variable helpers */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <label className="block text-[11px] text-app-muted font-mono uppercase tracking-wider">Текст сообщения *</label>
                    <span className="text-[10px] text-app-muted font-mono">Переменная: {"{name}"}</span>
                  </div>
                  <textarea
                    rows={4}
                    value={newBroadcastData.message}
                    onChange={e => setNewBroadcastData(p => ({ ...p, message: e.target.value }))}
                    placeholder="Привет, {name}! Мы приготовили для вас специальный бонус..."
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-app-border resize-none leading-relaxed"
                    required
                  />
                  <p className="text-[10px] text-app-muted italic">Используйте {"{name}"}, чтобы автоматически подставить имя клиента при отправке.</p>
                </div>

                {/* Banner Image link or Presets */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] text-app-muted font-mono uppercase tracking-wider">Изображение (URL или шаблон)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBroadcastData.imageUrl || ""}
                      onChange={e => setNewBroadcastData(p => ({ ...p, imageUrl: e.target.value }))}
                      placeholder="Вставьте ссылку на картинку..."
                      className="flex-1 bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-app-border font-mono"
                    />
                    {newBroadcastData.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setNewBroadcastData(p => ({ ...p, imageUrl: "" }))}
                        className="px-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-app-secondary font-mono"
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                  {/* Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { label: "🎁 Подарок", url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=400" },
                      { label: "💈 Стрижка", url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=400" },
                      { label: "🔥 Акция", url: "https://images.unsplash.com/photo-1557200134-90327ee9fafa?auto=format&fit=crop&q=80&w=400" },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setNewBroadcastData(p => ({ ...p, imageUrl: preset.url }))}
                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono transition-colors ${
                          newBroadcastData.imageUrl === preset.url
                            ? "bg-zinc-200 text-black border-transparent font-semibold"
                            : "bg-zinc-900 border-app-border text-app-muted hover:text-white"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interactive Action Button Label */}
                <div className="space-y-1">
                  <label className="block text-[11px] text-app-muted font-mono uppercase tracking-wider">Интерактивная кнопка</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBroadcastData.buttonText || ""}
                      onChange={e => setNewBroadcastData(p => ({ ...p, buttonText: e.target.value }))}
                      placeholder="Например: 🛒 Открыть Меню"
                      className="flex-1 bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-app-border"
                    />
                    <div className="flex gap-1">
                      {["🛒 Заказать", "⭐ Оставить отзыв", "🎁 Забрать бонус"].map(btnPreset => (
                        <button
                          key={btnPreset}
                          type="button"
                          onClick={() => setNewBroadcastData(p => ({ ...p, buttonText: btnPreset }))}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] rounded-lg text-app-secondary transition-colors"
                        >
                          {btnPreset.split(" ")[1] || btnPreset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-3 border-t border-app-border">
                  <button
                    type="button"
                    onClick={() => setIsCreatingBroadcast(false)}
                    className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-app-secondary font-mono font-bold rounded-xl transition-colors uppercase tracking-wider"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-2.5 bg-app-accent text-app-accent-fg hover:bg-zinc-200 font-mono font-bold rounded-xl transition-colors uppercase tracking-wider"
                  >
                    🚀 Запустить рассылку
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Live Telegram Smartphone Preview */}
            <div className="w-full md:w-80 flex flex-col bg-[#141416] border border-app-border rounded-3xl p-4 space-y-4">
              <div className="flex justify-between items-center border-b border-app-border pb-2">
                <span className="text-[11px] font-mono text-app-muted uppercase tracking-widest">Интерактивный Превью</span>
                <button onClick={() => setIsCreatingBroadcast(false)} className="text-app-muted hover:text-white hidden md:block">
                  <X size={18} />
                </button>
              </div>

              {/* Smartphone Shell */}
              <div className="flex-1 bg-[#0d0d0f] rounded-2xl p-3 flex flex-col justify-between border border-zinc-900 shadow-inner relative overflow-hidden min-h-[380px]">
                {/* Simulated status bar */}
                <div className="flex justify-between items-center text-[9px] text-app-muted font-mono px-1">
                  <span>12:30 📱</span>
                  <span>LTE 🔋</span>
                </div>

                {/* Simulated Telegram Message Area */}
                <div className="flex-1 flex flex-col justify-end py-4">
                  {/* Message Bubble Container */}
                  <div className="bg-app-card rounded-2xl p-3 border border-app-border space-y-3 shadow-xl w-full relative">
                    {/* Bot Title Header */}
                    <div className="flex items-center gap-1.5 pb-1 border-b border-app-border">
                      <div className="w-5 h-5 bg-zinc-700 rounded-full flex items-center justify-center text-[10px] font-bold text-white font-mono">
                        {selectedShop?.name?.substring(0,1) || "Б"}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold leading-none text-white">{selectedShop?.name || "Бот-Ассистент"}</div>
                        <div className="text-[8px] text-sky-400 leading-none">bot</div>
                      </div>
                    </div>

                    {/* Image Preview if provided */}
                    {newBroadcastData.imageUrl && (
                      <div className="rounded-lg overflow-hidden border border-app-border bg-app-surface aspect-[1.9/1] flex items-center justify-center">
                        <img
                          src={newBroadcastData.imageUrl}
                          alt="Banner Preview"
                          className="w-full h-full object-cover"
                          onError={(e: any) => { e.target.style.display = "none"; }}
                        />
                      </div>
                    )}

                    {/* Broadcast Content */}
                    <div className="space-y-1 font-sans">
                      <div className="text-xs font-bold text-white leading-tight">
                        {newBroadcastData.title || "Заголовок рассылки"}
                      </div>
                      <div className="text-[11px] text-app-secondary leading-relaxed whitespace-pre-wrap">
                        {newBroadcastData.message
                          ? newBroadcastData.message.replace(/\{name\}/g, "Александр")
                          : "Здесь будет отображаться текст вашего сообщения. Поддерживается переменная имени."}
                      </div>
                    </div>
                  </div>

                  {/* Inline Action Button */}
                  {newBroadcastData.buttonText && (
                    <div className="mt-2 w-full">
                      <button
                        type="button"
                        className="w-full py-1.5 bg-[#202024] hover:bg-[#28282c] text-sky-400 border border-sky-400/15 rounded-xl text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1.5"
                      >
                        {newBroadcastData.buttonText}
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom line mimicking modern phone */}
                <div className="w-16 h-1 bg-zinc-800 rounded-full mx-auto mt-1"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal & Plan Modal */}
      <QrGeneratorModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        shopName={selectedShop?.name || "My Shop"}
        shopSlug={selectedShop?.slug || "shop"}
      />

      <PlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        currentPlan={user?.plan || "FREE"}
        token={token}
        onPlanUpdated={(newPlan) => {
          if (user) {
            user.plan = newPlan as any;
          }
        }}
      />

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
                <p className="text-xs text-app-muted leading-relaxed font-sans">
                  {confirmModal.message}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-[#1c1c20] border border-app-border text-app-secondary rounded-xl hover:bg-zinc-800 text-xs font-mono transition-colors"
                >
                  {confirmModal.cancelText || "Отмена"}
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold text-white transition-colors ${
                    confirmModal.isDangerous 
                      ? "bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-900/20" 
                      : "bg-[#1c1c20] border border-app-border hover:bg-zinc-800"
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
