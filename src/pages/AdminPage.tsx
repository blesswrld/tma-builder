import React, { useEffect, useState, FormEvent, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Trash2, ExternalLink, Store, ShoppingBag, Check, Copy, Settings, 
  AlertCircle, Clock, CheckCircle2, XCircle, Package, RefreshCw, Phone, 
  User, ListOrdered, Edit3, Search, BarChart3, Tag, TrendingUp, Layers, 
  LogIn, LogOut, ShieldCheck, Mail, Lock, QrCode, Download, Volume2, 
  VolumeX, Crown, FileSpreadsheet, Bell, Star, Sparkles, Smartphone, 
  Image as ImageIcon, Send, Users, Radio, Gift, ChevronDown, ChevronUp, 
  Grid, X, Menu, SlidersHorizontal, ArrowUpRight, Zap, Sun, Moon, Globe, ArrowLeft,
  ThumbsUp, MessageCircle, BarChart2, Filter, MessageSquare, GripVertical, Keyboard,
  UserPlus, CheckCircle, Key, Loader2, Truck, CreditCard, Github, Bug
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useRealtime, useRealtimeEvent } from "../context/RealtimeContext";
import { useTheme } from "../context/ThemeContext";
import { useScrollLock } from "../hooks/useScrollLock";
import QrGeneratorModal from "../components/QrGeneratorModal";
import PlanModal from "../components/PlanModal";
import ReportModal from "../components/ReportModal";
import AnalyticsTab from "../components/AnalyticsTab";
import { AdminPageSkeleton, AdminContentSkeleton, ReviewSkeletonList, SpinnerLoader, Skeleton } from "../components/Skeleton";
import ImageUploader from "../components/ImageUploader";
import { AdminAuthModal } from "../components/admin/AdminAuthModal";
import { AdminSettingsTab } from "../components/admin/AdminSettingsTab";
import { AdminServicesTab } from "../components/admin/AdminServicesTab";
import { AdminOrdersTab } from "../components/admin/AdminOrdersTab";
import { AdminTeamTab } from "../components/admin/AdminTeamTab";
import { AdminBotSimTab } from "../components/admin/AdminBotSimTab";
import { AdminCustomersTab } from "../components/admin/AdminCustomersTab";
import { AdminBroadcastsTab } from "../components/admin/AdminBroadcastsTab";
import { AdminBannersTab } from "../components/admin/AdminBannersTab";
import { AdminPromocodesTab } from "../components/admin/AdminPromocodesTab";
import { AdminReviewsTab } from "../components/admin/AdminReviewsTab";
import { 
  validateShopName, validateSlug, cleanSlugForSubmit, transliterateToSlug, validateCisPhone, 
  validateTelegramBotToken, validateTelegramChatId, validateItemTitle, 
  validatePrice, validatePromoCodeData, validateAddress 
} from "../lib/validation";

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
  logoUrl?: string | null;
  bannerUrl?: string | null;
  currency?: string | null;
  currencySymbol?: string | null;
  socialLinks?: string | null;
  deliveryOptions?: string | null;
  paymentInstructions?: string | null;
  isOpen?: boolean;
  cashbackPercent?: number;
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
  const navigate = useNavigate();
  const { user, token, isLoading: authLoading, login, register, logout, sendCode, verifyCode, resetPassword, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Developer unhandled reports counter
  const [unhandledReportsCount, setUnhandledReportsCount] = useState(0);

  const fetchReportsCount = useCallback(async () => {
    try {
      const res = await fetch("/api/reports?status=NEW&dev=true");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.reports)) {
          setUnhandledReportsCount(data.reports.length);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchReportsCount();
  }, [fetchReportsCount]);

  // Auth modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "otp" | "reset">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authOtpCode, setAuthOtpCode] = useState("");
  const [authDevCode, setAuthDevCode] = useState<string | null>(null);
  const [otpStep, setOtpStep] = useState<"email" | "code">("email");
  const [resendTimer, setResendTimer] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const handleLogoutRequest = () => {
    requestConfirm(
      "Выход из аккаунта",
      "Вы уверены, что хотите выйти из текущего аккаунта? Потребуется повторный вход по паролю или коду из E-mail.",
      () => {
        logout();
        showToast("Вы успешно вышли из системы", "warning");
      },
      "Выйти из аккаунта",
      true
    );
  };

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);
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

  useScrollLock(confirmModal.isOpen);

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
      fetchOrders(selectedShop.id, true);
    }
  });

  useRealtimeEvent("ORDER_STATUS_UPDATED", (event) => {
    if (event.payload && event.shopId === selectedShop?.id) {
      setOrders(prev => prev.map(o => o.id === event.payload.id ? { ...o, status: event.payload.status } : o));
      fetchOrders(selectedShop.id, true);
    }
  });

  useRealtimeEvent("ORDER_DELETED", (event) => {
    if (event.payload?.id) {
      setOrders(prev => prev.filter(o => o.id !== event.payload.id));
      if (selectedShop?.id) fetchOrders(selectedShop.id, true);
    }
  });

  useRealtimeEvent("SERVICE_CREATED", (event) => {
    if (event.payload && (event.shopId === selectedShop?.id || !event.shopId)) {
      setShops(prev => (prev || []).map(s => s.id === (event.shopId || selectedShop?.id) ? {
        ...s,
        services: [event.payload, ...(s.services || []).filter(srv => srv.id !== event.payload.id)]
      } : s));
      setSelectedShop(prev => prev ? {
        ...prev,
        services: [event.payload, ...(prev.services || []).filter(srv => srv.id !== event.payload.id)]
      } : prev);
      fetchShops(true);
    }
  });

  useRealtimeEvent("SERVICE_UPDATED", (event) => {
    if (event.payload) {
      setShops(prev => (prev || []).map(s => s.id === (event.shopId || selectedShop?.id) ? {
        ...s,
        services: (s.services || []).map(srv => srv.id === event.payload.id ? { ...srv, ...event.payload } : srv)
      } : s));
      setSelectedShop(prev => prev ? {
        ...prev,
        services: (prev.services || []).map(srv => srv.id === event.payload.id ? { ...srv, ...event.payload } : srv)
      } : prev);
      fetchShops(true);
    }
  });

  useRealtimeEvent("SERVICE_DELETED", (event) => {
    if (event.payload?.id) {
      setShops(prev => (prev || []).map(s => s.id === (event.shopId || selectedShop?.id) ? {
        ...s,
        services: (s.services || []).filter(srv => srv.id !== event.payload.id)
      } : s));
      setSelectedShop(prev => prev ? {
        ...prev,
        services: (prev.services || []).filter(srv => srv.id !== event.payload.id)
      } : prev);
      fetchShops(true);
    }
  });

  useRealtimeEvent("REVIEW_CREATED", (event) => {
    if (event.payload && (event.shopId === selectedShop?.id || !event.shopId)) {
      setReviews(prev => [event.payload, ...prev.filter(r => r.id !== event.payload.id)]);
      fetchReviews(true);
    }
  });

  useRealtimeEvent("REVIEW_UPDATED", (event) => {
    if (event.payload && (event.shopId === selectedShop?.id || !event.shopId)) {
      setReviews(prev => prev.map(r => r.id === event.payload.id ? { ...r, ...event.payload } : r));
      fetchReviews(true);
    }
  });

  useRealtimeEvent("REVIEW_DELETED", (event) => {
    if (event.payload && (event.shopId === selectedShop?.id || !event.shopId)) {
      setReviews(prev => prev.filter(r => r.id !== event.payload.id));
      fetchReviews(true);
    }
  });

  useRealtimeEvent("CUSTOMER_UPDATED", (event) => {
    if (event.payload && (event.shopId === selectedShop?.id || !event.shopId)) {
      setCustomers(prev => {
        const exists = prev.some(c => c.id === event.payload.id || c.phone === event.payload.phone);
        if (!exists) return [event.payload, ...prev];
        return prev.map(c => (c.id === event.payload.id || c.phone === event.payload.phone) ? { ...c, ...event.payload } : c);
      });
      fetchCustomers(true);
    }
  });

  useRealtimeEvent("BROADCAST_CREATED", (event) => {
    if (event.payload && (event.shopId === selectedShop?.id || !event.shopId)) {
      setBroadcasts(prev => [event.payload, ...prev.filter(b => b.id !== event.payload.id)]);
      fetchBroadcasts(true);
    }
  });

  useRealtimeEvent("BROADCAST_DELETED", (event) => {
    if (event.payload?.id) {
      setBroadcasts(prev => prev.filter(b => b.id !== event.payload.id));
      fetchBroadcasts(true);
    }
  });

  useRealtimeEvent("PROMOCODE_CREATED", (event) => {
    if (event.payload && (event.shopId === selectedShop?.id || !event.shopId)) {
      setPromocodes(prev => [event.payload, ...prev.filter(p => p.id !== event.payload.id)]);
      fetchPromocodes(true);
    }
  });

  useRealtimeEvent("PROMOCODE_DELETED", (event) => {
    if (event.payload?.id) {
      setPromocodes(prev => prev.filter(p => p.id !== event.payload.id));
      fetchPromocodes(true);
    }
  });

  useRealtimeEvent("BANNER_CREATED", (event) => {
    if (event.payload && (event.shopId === selectedShop?.id || !event.shopId)) {
      setBanners(prev => [event.payload, ...prev.filter(b => b.id !== event.payload.id)]);
      fetchBanners(true);
    }
  });

  useRealtimeEvent("BANNER_DELETED", (event) => {
    if (event.payload?.id) {
      setBanners(prev => prev.filter(b => b.id !== event.payload.id));
      fetchBanners(true);
    }
  });

  useRealtimeEvent("SHOP_UPDATED", (event) => {
    if (event.payload?.id) {
      setShops(prev => prev.map(s => s.id === event.payload.id ? { ...s, ...event.payload } : s));
      if (selectedShop?.id === event.payload.id) {
        setSelectedShop(prev => prev ? { ...prev, ...event.payload } : prev);
      }
      fetchShops(true);
    }
  });

  useRealtimeEvent("SHOP_CREATED", (event) => {
    if (event.payload?.id) {
      fetchShops(true);
    }
  });

  useRealtimeEvent("SHOP_DELETED", (event) => {
    if (event.payload?.id) {
      setShops(prev => prev.filter(s => s.id !== event.payload.id));
      if (selectedShop?.id === event.payload.id) {
        setSelectedShop(null);
      }
      fetchShops(true);
    }
  });

  useRealtimeEvent("TEAM_MEMBER_ADDED", (event) => {
    if (selectedShop?.id && (event.shopId === selectedShop.id || !event.shopId)) {
      fetchTeam(selectedShop.id, true);
    }
  });

  useRealtimeEvent("TEAM_MEMBER_REMOVED", (event) => {
    if (selectedShop?.id && (event.shopId === selectedShop.id || !event.shopId)) {
      fetchTeam(selectedShop.id, true);
    }
  });

  useRealtimeEvent("INVITE_CREATED", (event) => {
    if (selectedShop?.id && (event.shopId === selectedShop.id || !event.shopId)) {
      fetchTeam(selectedShop.id, true);
    }
  });

  useRealtimeEvent("INVITE_REVOKED", (event) => {
    if (selectedShop?.id && (event.shopId === selectedShop.id || !event.shopId)) {
      fetchTeam(selectedShop.id, true);
    }
  });

  useRealtimeEvent("CUSTOMER_DELETED", (event) => {
    if (event.payload?.id && (event.shopId === selectedShop?.id || !event.shopId)) {
      setCustomers(prev => prev.filter(c => c.id !== event.payload.id));
      fetchCustomers(true);
    }
  });

  // Admin tabs
  const [activeTab, setActiveTab] = useState<"services" | "orders" | "promocodes" | "reviews" | "banners" | "broadcasts" | "customers" | "analytics" | "botsim" | "settings" | "profile" | "createshop" | "addservice" | "editservice" | "team">("services");

  const closeSubView = () => {
    setIsSettingsOpen(false);
    setIsProfileOpen(false);
    setIsCreatingShop(false);
    setIsAddingService(false);
    setEditingService(null);
    setActiveTab("services");
  };

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
  const [reviewStats, setReviewStats] = useState<{ totalReviews: number; avgRating: number }>({ totalReviews: 0, avgRating: 5.0 });
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reviewSearchQuery, setReviewSearchQuery] = useState("");
  const [reviewStarFilter, setReviewStarFilter] = useState<number | "ALL">("ALL");
  const [reviewReplyFilter, setReviewReplyFilter] = useState<"ALL" | "UNREPLIED" | "REPLIED">("ALL");
  const [reviewSortOrder, setReviewSortOrder] = useState<"NEWEST" | "OLDEST" | "RATING_DESC" | "RATING_ASC">("NEWEST");
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("ALL");
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>("");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("ALL");

  // Create Shop
  const [isCreatingShop, setIsCreatingShop] = useState(false);
  const [isSlugCustomized, setIsSlugCustomized] = useState(false);
  const [newShopData, setNewShopData] = useState({ name: "", slug: "", description: "" });
  const [createShopError, setCreateShopError] = useState<string | null>(null);
  const [createShopFieldErrors, setCreateShopFieldErrors] = useState<{ name?: string; slug?: string; description?: string }>({});

  // User Profile
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    phone: "",
    avatarUrl: "",
    telegramHandle: "",
    companyName: "",
    currentPassword: "",
    newPassword: "",
    emailCode: ""
  });

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        name: user.name || "",
        phone: user.phone || "",
        avatarUrl: user.avatarUrl || "",
        telegramHandle: user.telegramHandle || "",
        companyName: user.companyName || "",
      }));
    }
  }, [user]);
  const [passwordChangeMethod, setPasswordChangeMethod] = useState<"password" | "code">("password");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingProfileCode, setIsSendingProfileCode] = useState(false);
  const [profileCodeSentMsg, setProfileCodeSentMsg] = useState<string | null>(null);

  // Add Service
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceData, setNewServiceData] = useState({
    title: "",
    price: "",
    oldPrice: "",
    description: "",
    category: "",
    imageUrl: "",
    gallery: [] as string[],
    badge: "",
    tags: "",
    prepTime: "",
    weight: "",
    isAvailable: true,
    fulfillment: "pickup"
  });
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceFieldErrors, setServiceFieldErrors] = useState<{ title?: string; price?: string; description?: string }>({});

  // Edit Service
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editServiceData, setEditServiceData] = useState({
    title: "",
    price: "",
    oldPrice: "",
    description: "",
    category: "",
    imageUrl: "",
    gallery: [] as string[],
    badge: "",
    tags: "",
    prepTime: "",
    weight: "",
    isAvailable: true,
    fulfillment: "courier,pickup"
  });
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
  const [settingsActiveTab, setSettingsActiveTab] = useState<"general" | "branding" | "currency" | "delivery" | "social" | "telegram" | "team">("general");
  const [settingsData, setSettingsData] = useState({
    name: "",
    slug: "",
    description: "",
    botToken: "",
    adminChatId: "",
    workingHours: "",
    address: "",
    phone: "",
    logoUrl: "",
    bannerUrl: "",
    currency: "RUB",
    currencySymbol: "₽",
    socialLinks: { telegram: "", instagram: "", whatsapp: "", vk: "", website: "" },
    deliveryOptions: { pickup: true, courier: true, shipping: false, minOrder: "0", deliveryFee: "0" },
    paymentInstructions: "",
    cashbackPercent: 5,
    isOpen: true
  });
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsFieldErrors, setSettingsFieldErrors] = useState<{ botToken?: string; adminChatId?: string; name?: string }>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Telegram Bot integration states
  const [botTestResult, setBotTestResult] = useState<{ botInfo?: { id: number; first_name: string; username: string }; error?: string } | null>(null);
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);
  const [isSendingTestNotification, setIsSendingTestNotification] = useState(false);

  const handleTestBotToken = async () => {
    if (!settingsData.botToken || !selectedShop) return;
    setIsTestingBot(true);
    setBotTestResult(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/shops/${selectedShop.id}/telegram/test-bot`, {
        method: "POST",
        headers,
        body: JSON.stringify({ botToken: settingsData.botToken })
      });
      const data = await res.json().catch(() => ({ error: `Ошибка ответа сервера (${res.status})` }));
      if (!res.ok) throw new Error(data.error || "Не удалось проверить токен бота");
      setBotTestResult({ botInfo: data.bot });
      showToast(`Бот @${data.bot.username} успешно проверен!`, "success");
    } catch (err: any) {
      setBotTestResult({ error: err.message || "Ошибка проверки токена бота" });
      showToast(err.message || "Ошибка проверки токена бота", "error");
    } finally {
      setIsTestingBot(false);
    }
  };

  const handleSetupWebhook = async () => {
    if (!settingsData.botToken || !selectedShop) return;
    setIsSettingWebhook(true);
    setWebhookStatus(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/shops/${selectedShop.id}/telegram/setup-webhook`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          botToken: settingsData.botToken,
          baseUrl: window.location.origin
        })
      });
      const data = await res.json().catch(() => ({ error: `Ошибка ответа сервера (${res.status})` }));
      if (!res.ok) throw new Error(data.error || "Не удалось настроить Webhook");
      setWebhookStatus(`Webhook успешно активен: ${data.webhookUrl}`);
      showToast("Telegram Webhook успешно настроен!", "success");
    } catch (err: any) {
      showToast(err.message || "Ошибка установки Webhook", "error");
    } finally {
      setIsSettingWebhook(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!settingsData.botToken || !settingsData.adminChatId || !selectedShop) return;
    setIsSendingTestNotification(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/shops/${selectedShop.id}/telegram/test-notification`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          botToken: settingsData.botToken,
          adminChatId: settingsData.adminChatId
        })
      });
      const data = await res.json().catch(() => ({ error: `Ошибка ответа сервера (${res.status})` }));
      if (!res.ok) throw new Error(data.error || "Не удалось отправить сообщение");
      showToast("Тестовое уведомление отправлено в Telegram!", "success");
    } catch (err: any) {
      showToast(err.message || "Ошибка отправки тестового уведомления", "error");
    } finally {
      setIsSendingTestNotification(false);
    }
  };

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
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHotkeysModalOpen, setIsHotkeysModalOpen] = useState(false);

  // Team & Invitation Management
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamInvites, setTeamInvites] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<"STAFF" | "MANAGER">("STAFF");
  const [inviteMaxUses, setInviteMaxUses] = useState(10);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);

  // URL Invitation Code Auto-Acceptance
  const [urlInviteCode, setUrlInviteCode] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{ code: string; role: string; shop: { id: string; name: string; description?: string; logoUrl?: string } } | null>(null);
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false);

  // Lock body scrolling when mobile sidebar drawer is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isSidebarOpen]);

  // Sidebar Drag & Resize Width State (Persistent)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("tma_admin_sidebar_width");
      return saved ? Math.max(180, Math.min(480, parseInt(saved, 10))) : 256;
    } catch {
      return 256;
    }
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const startResizingSidebar = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingSidebar(true);
  }, []);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(480, e.clientX));
      setSidebarWidth(newWidth);
      try {
        localStorage.setItem("tma_admin_sidebar_width", newWidth.toString());
      } catch {}
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        const newWidth = Math.max(180, Math.min(480, e.touches[0].clientX));
        setSidebarWidth(newWidth);
        try {
          localStorage.setItem("tma_admin_sidebar_width", newWidth.toString());
        } catch {}
      }
    };

    const stopResizing = () => {
      setIsResizingSidebar(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResizing);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", stopResizing);

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", stopResizing);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizingSidebar]);

  const resetSidebarWidth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSidebarWidth(256);
    try {
      localStorage.setItem("tma_admin_sidebar_width", "256");
    } catch {}
  };

  // Custom Shop Selector Dropdown State
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
  const shopDropdownRef = useRef<HTMLDivElement>(null);

  // Custom Reviews Sort Dropdown State
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shopDropdownRef.current && !shopDropdownRef.current.contains(event.target as Node)) {
        setIsShopDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
  const prevOrdersCountRef = useRef<number | null>(null);

  useEffect(() => {
    const isAnyModalOpen = Boolean(
      isAuthModalOpen ||
      isCreatingBroadcast ||
      isCreatingBanner ||
      isCreatingPromo ||
      isTgGuideOpen ||
      shopToDelete ||
      isDeletingShop ||
      isQrModalOpen ||
      isPlanModalOpen ||
      isReportModalOpen ||
      isHotkeysModalOpen ||
      confirmModal?.isOpen ||
      newOrderAlert
    );

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [
    isAuthModalOpen,
    isCreatingBroadcast,
    isCreatingBanner,
    isCreatingPromo,
    isTgGuideOpen,
    shopToDelete,
    isDeletingShop,
    isQrModalOpen,
    isPlanModalOpen,
    isReportModalOpen,
    isHotkeysModalOpen,
    confirmModal?.isOpen,
    newOrderAlert
  ]);

  // Global Keyboard Shortcuts (Hotkeys) Manager
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          (activeEl as HTMLElement).isContentEditable);

      // 1. ESC KEY (Highest Priority, works even inside inputs)
      if (e.key === "Escape") {
        if (isInput) {
          (activeEl as HTMLElement).blur();
        }
        if (confirmModal?.isOpen) {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          return;
        }
        if (newOrderAlert) {
          setNewOrderAlert(null);
          return;
        }
        if (isHotkeysModalOpen) {
          setIsHotkeysModalOpen(false);
          return;
        }
        if (isReportModalOpen) {
          setIsReportModalOpen(false);
          return;
        }
        if (isAuthModalOpen) {
          setIsAuthModalOpen(false);
          return;
        }
        if (isQrModalOpen) {
          setIsQrModalOpen(false);
          return;
        }
        if (isPlanModalOpen) {
          setIsPlanModalOpen(false);
          return;
        }
        if (isCreatingPromo) {
          setIsCreatingPromo(false);
          return;
        }
        if (isCreatingBanner) {
          setIsCreatingBanner(false);
          return;
        }
        if (isCreatingBroadcast) {
          setIsCreatingBroadcast(false);
          return;
        }
        if (isTgGuideOpen) {
          setIsTgGuideOpen(false);
          return;
        }
        if (isSidebarOpen) {
          setIsSidebarOpen(false);
          return;
        }
        if (["settings", "profile", "createshop", "addservice", "editservice"].includes(activeTab)) {
          closeSubView();
          return;
        }
        return;
      }

      // 2. ENTER KEY inside Confirm Modal
      if (confirmModal?.isOpen && e.key === "Enter") {
        e.preventDefault();
        confirmModal.onConfirm();
        return;
      }

      // 3. SEARCH FOCUS: Cmd/Ctrl + K or "/" (when not typing)
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (!isInput && e.key === "/")) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[placeholder*="Поиск"], input[placeholder*="поиск"], input[placeholder*="Search"]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select?.();
        }
        return;
      }

      // 4. TOGGLE SIDEBAR: Cmd/Ctrl + B or Alt + B
      if ((e.metaKey || e.ctrlKey || e.altKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
        return;
      }

      // 5. SHOW HOTKEYS HELP MODAL: "?" or "Shift + /"
      if (!isInput && (e.key === "?" || (e.shiftKey && e.key === "/"))) {
        e.preventDefault();
        setIsHotkeysModalOpen(prev => !prev);
        return;
      }

      // Stop processing single-letter or Alt shortcuts if user is currently typing in an input
      if (isInput) return;

      // 6. QUICK TAB NAVIGATION (Alt + 1..8, Alt + S, Alt + P)
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === "1") { e.preventDefault(); setActiveTab("services"); return; }
        if (key === "2") { e.preventDefault(); setActiveTab("orders"); return; }
        if (key === "3") { e.preventDefault(); setActiveTab("promocodes"); return; }
        if (key === "4") { e.preventDefault(); setActiveTab("reviews"); return; }
        if (key === "5") { e.preventDefault(); setActiveTab("banners"); return; }
        if (key === "6") { e.preventDefault(); setActiveTab("broadcasts"); return; }
        if (key === "7") { e.preventDefault(); setActiveTab("customers"); return; }
        if (key === "8") { e.preventDefault(); setActiveTab("analytics"); return; }
        if (key === "s" && selectedShop) {
          e.preventDefault();
          handleOpenSettings(selectedShop);
          return;
        }
        if (key === "p") {
          e.preventDefault();
          handleOpenProfile();
          return;
        }
      }

      // 7. CREATE ITEM HOTKEYS ('N' or 'Alt + N')
      if (e.key.toLowerCase() === "n" || (e.altKey && e.key.toLowerCase() === "n")) {
        if (activeTab === "services") {
          e.preventDefault();
          setNewServiceData({ title: "", price: "", category: "", imageUrl: "", description: "", badge: "", prepTime: "", weight: "", tags: "", isAvailable: true, oldPrice: "" });
          setServiceError(null);
          setServiceFieldErrors({});
          setIsAddingService(true);
          setActiveTab("addservice");
          return;
        }
        if (activeTab === "promocodes") {
          e.preventDefault();
          setIsCreatingPromo(true);
          return;
        }
        if (activeTab === "banners") {
          e.preventDefault();
          setIsCreatingBanner(true);
          return;
        }
        if (activeTab === "broadcasts") {
          e.preventDefault();
          setIsCreatingBroadcast(true);
          return;
        }
      }

      // 8. ORDERS TAB SPECIFIC HOTKEYS
      if (activeTab === "orders") {
        // Status filter: 1 = ALL, 2 = PENDING, 3 = CONFIRMED, 4 = COMPLETED, 5 = CANCELLED
        if (e.key === "1") { setOrderStatusFilter("ALL"); return; }
        if (e.key === "2") { setOrderStatusFilter("PENDING"); return; }
        if (e.key === "3") { setOrderStatusFilter("CONFIRMED"); return; }
        if (e.key === "4") { setOrderStatusFilter("COMPLETED"); return; }
        if (e.key === "5") { setOrderStatusFilter("CANCELLED"); return; }

        // Confirm/Accept newest PENDING order with 'A'
        if (e.key.toLowerCase() === "a") {
          const firstPendingOrder = orders.find(o => o.status === "PENDING");
          if (firstPendingOrder) {
            e.preventDefault();
            handleUpdateOrderStatus(firstPendingOrder.id, "CONFIRMED");
          } else {
            showToast("Нет новых заказов для подтверждения", "warning");
          }
          return;
        }

        // Complete newest CONFIRMED order with 'C'
        if (e.key.toLowerCase() === "c") {
          const firstConfirmedOrder = orders.find(o => o.status === "CONFIRMED");
          if (firstConfirmedOrder) {
            e.preventDefault();
            handleUpdateOrderStatus(firstConfirmedOrder.id, "COMPLETED");
          } else {
            showToast("Нет заказов в работе для завершения", "warning");
          }
          return;
        }

        // Export CSV with 'E'
        if (e.key.toLowerCase() === "e") {
          e.preventDefault();
          exportOrdersToCsv();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeTab,
    confirmModal,
    newOrderAlert,
    isHotkeysModalOpen,
    isAuthModalOpen,
    isQrModalOpen,
    isPlanModalOpen,
    isCreatingPromo,
    isCreatingBanner,
    isCreatingBroadcast,
    isTgGuideOpen,
    isSidebarOpen,
    orders,
    selectedShop
  ]);

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

  const handleSendOtpCode = async (type: "LOGIN" | "REGISTER" | "RESET_PASSWORD" = "LOGIN") => {
    if (!authEmail || !authEmail.includes("@")) {
      setAuthError("Введите корректный E-mail адрес.");
      return;
    }
    if (type === "REGISTER") {
      if (!authName || authName.trim().length < 2) {
        setAuthError("Укажите ФИО или Название организации.");
        return;
      }
      if (!authPassword || authPassword.length < 6) {
        setAuthError("Пароль должен быть не менее 6 символов.");
        return;
      }
    }
    setAuthError(null);
    setAuthSuccessMsg(null);
    setIsSubmittingAuth(true);
    try {
      const result = await sendCode(authEmail, type);
      setAuthSuccessMsg(result.message);
      if (result.devCode) {
        setAuthDevCode(result.devCode);
        showToast(`Код отправлен! (SMTP не настроен: ${result.devCode})`, "warning");
      } else {
        setAuthDevCode(null);
        showToast(result.message, "success");
      }
      setOtpStep("code");
      setResendTimer(60);
    } catch (err: any) {
      setAuthError(err.message || "Ошибка отправки кода.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleVerifyOtpCode = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!authOtpCode || authOtpCode.trim().length !== 6) {
      setAuthError("Введите 6-значный код из письма.");
      return;
    }
    setAuthError(null);
    setIsSubmittingAuth(true);
    try {
      if (authMode === "reset") {
        const res = await resetPassword({ email: authEmail, code: authOtpCode, newPassword: authPassword });
        showToast(res.message, "success");
        setAuthMode("login");
        setOtpStep("email");
        setAuthOtpCode("");
        setAuthPassword("");
      } else {
        await verifyCode({
          email: authEmail,
          code: authOtpCode,
          name: authName,
          password: authPassword
        });
        showToast(authMode === "register" ? "Регистрация завершена! Вы вошли в аккаунт." : "Вы успешно авторизованы!", "success");
        setIsAuthModalOpen(false);
        setAuthOtpCode("");
        setAuthEmail("");
        setAuthPassword("");
        setAuthName("");
        setOtpStep("email");
        await fetchShops();
      }
    } catch (err: any) {
      setAuthError(err.message || "Ошибка проверки кода.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (authMode === "otp" || otpStep === "code") {
      return handleVerifyOtpCode(e);
    }

    if (authMode === "register") {
      return handleSendOtpCode("REGISTER");
    }

    setIsSubmittingAuth(true);

    try {
      if (authMode === "login") {
        await login(authEmail, authPassword);
      }
      showToast("Вы успешно авторизованы!", "success");
      setIsAuthModalOpen(false);
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
      setOtpStep("email");
      await fetchShops();
    } catch (err: any) {
      setAuthError(err.message || "Ошибка авторизации");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // URL Invitation Check & Auto-accept
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("invite");
    if (code) {
      const cleanCode = code.toUpperCase().trim();
      setUrlInviteCode(cleanCode);
      fetch(`/api/invites/${cleanCode}/info`)
        .then(res => res.json())
        .then(data => {
          if (data && data.shop) {
            setInviteInfo(data);
          }
        })
        .catch(err => console.error("Error checking invite:", err));
    }
  }, []);

  useEffect(() => {
    if (user && token && urlInviteCode) {
      const accept = async () => {
        setIsAcceptingInvite(true);
        try {
          const res = await fetch(`/api/invites/${urlInviteCode}/accept`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) {
            showToast(data.message || "Вы успешно присоединились к заведению!", "success");
            setUrlInviteCode(null);
            setInviteInfo(null);
            window.history.replaceState({}, "", "/admin");
            await fetchShops();
            if (data.shop) {
              setSelectedShop(data.shop);
            }
          } else {
            showToast(data.error || "Ошибка активации приглашения", "error");
          }
        } catch (err: any) {
          showToast(err.message || "Ошибка соединения", "error");
        } finally {
          setIsAcceptingInvite(false);
        }
      };
      accept();
    }
  }, [user, token, urlInviteCode]);

  const fetchTeam = async (shopId: string, silent = false) => {
    if (!token) return;
    if (!silent) setTeamLoading(true);
    try {
      const res = await fetch(`/api/shops/${shopId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
        setTeamInvites(data.invites || []);
      }
    } catch (err) {
      console.error("Failed to fetch team:", err);
    } finally {
      if (!silent) setTeamLoading(false);
    }
  };

  useEffect(() => {
    if (selectedShop?.id) {
      fetchTeam(selectedShop.id);
    }
  }, [selectedShop?.id, token]);

  const handleCreateInvite = async () => {
    if (!selectedShop || !token) return;
    try {
      const res = await fetch(`/api/shops/${selectedShop.id}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: inviteRole, maxUses: inviteMaxUses })
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedInviteUrl(data.inviteUrl);
        showToast("Ссылка-приглашение создана!", "success");
        fetchTeam(selectedShop.id);
      } else {
        showToast(data.error || "Не удалось создать приглашение", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Ошибка соединения", "error");
    }
  };

  const handleRevokeInvite = async (code: string) => {
    if (!token || !selectedShop) return;
    try {
      const res = await fetch(`/api/invites/${code}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Приглашение отозвано", "success");
        fetchTeam(selectedShop.id);
      } else {
        const data = await res.json();
        showToast(data.error || "Ошибка отзыва приглашения", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Ошибка соединения", "error");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!token || !selectedShop) return;
    try {
      const res = await fetch(`/api/shops/${selectedShop.id}/members/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Сотрудник удалён из команды", "success");
        fetchTeam(selectedShop.id);
      } else {
        const data = await res.json();
        showToast(data.error || "Ошибка удаления сотрудника", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Ошибка соединения", "error");
    }
  };

  const fetchShops = async (silent = false) => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch("/api/shops", { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        let errMsg = `Server error (${res.status})`;
        const text = await res.text();
        try {
          const errData = JSON.parse(text);
          if (errData.error) errMsg = errData.error;
        } catch {
          if (text) errMsg = `${errMsg}: ${text.slice(0, 150)}`;
        }
        if (!silent) throw new Error(errMsg);
        return;
      }
      const data: Shop[] = await res.json();
      setShops(data);

      setSelectedShop(prev => {
        if (prev) {
          const updated = data.find((s: Shop) => s.id === prev.id);
          if (updated) return updated;
        }
        return data.length > 0 ? data[0] : null;
      });
    } catch (err: any) {
      if (!silent) {
        if (err?.name === "AbortError") {
          console.warn("fetchShops timed out");
        } else if (err instanceof TypeError || (err?.message && err.message.includes("Failed to fetch"))) {
          console.warn("Failed to fetch shops (network offline):", err.message);
        } else {
          console.error(err);
        }
      }
    } finally {
      if (!silent) setLoading(false);
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

  const handleOpenCreateShop = () => {
    setIsSidebarOpen(false);
    setIsSlugCustomized(false);
    setNewShopData({ name: "", slug: "", description: "" });
    setCreateShopError(null);
    setCreateShopFieldErrors({});
    setIsProfileOpen(false);
    setIsSettingsOpen(false);
    setIsAddingService(false);
    setEditingService(null);
    setIsCreatingShop(true);
    setActiveTab("createshop");
  };

  const validateCreateShop = () => {
    const errors: { name?: string; slug?: string; description?: string } = {};

    const nameRes = validateShopName(newShopData.name);
    if (!nameRes.isValid) {
      errors.name = nameRes.error;
    }

    const slugRes = validateSlug(newShopData.slug);
    if (!slugRes.isValid) {
      errors.slug = slugRes.error;
    }

    if (newShopData.description && newShopData.description.trim().length > 300) {
      errors.description = "Описание не должно превышать 300 символов";
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
          slug: cleanSlugForSubmit(newShopData.slug),
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

  const handleDeleteShop = (shop: Shop) => {
    requestConfirm(
      "Удалить заведение?",
      `Вы действительно хотите навсегда удалить заведение «${shop.name}»? Все позиции меню, история заказов, отзывы и настройки этого заведения будут безвозвратно удалены.`,
      async () => {
        try {
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const res = await fetch(`/api/shops/${shop.id}`, { method: "DELETE", headers });
          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            throw new Error(data.error || "Не удалось удалить заведение");
          }

          unlinkShopFromDevice(shop.id);
          setIsSettingsOpen(false);
          showToast(`Заведение «${shop.name}» успешно удалено`, "success");

          const updatedShops = shops.filter(s => s.id !== shop.id);
          setShops(updatedShops);
          if (selectedShop?.id === shop.id) {
            setSelectedShop(updatedShops.length > 0 ? updatedShops[0] : null);
          }
          await fetchShops();
        } catch (err: any) {
          showToast(err.message || "Ошибка при удалении заведения", "error");
        }
      },
      "Удалить заведение",
      true
    );
  };

  const handleAddService = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;
    setServiceError(null);

    const titleRes = validateItemTitle(newServiceData.title);
    if (!titleRes.isValid) {
      setServiceError(titleRes.error || "Укажите название");
      return;
    }

    const priceRes = validatePrice(newServiceData.price);
    if (!priceRes.isValid) {
      setServiceError(priceRes.error || "Укажите цену");
      return;
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/shops/${selectedShop.id}/services`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: titleRes.title,
          price: priceRes.price,
          oldPrice: newServiceData.oldPrice ? Number(newServiceData.oldPrice) : undefined,
          description: newServiceData.description.trim() || undefined,
          category: newServiceData.category.trim() || undefined,
          imageUrl: newServiceData.imageUrl.trim() || undefined,
          gallery: (newServiceData.gallery || []).length > 0 ? JSON.stringify(newServiceData.gallery) : undefined,
          badge: newServiceData.badge.trim() || undefined,
          tags: newServiceData.tags.trim() || undefined,
          prepTime: newServiceData.prepTime.trim() || undefined,
          weight: newServiceData.weight.trim() || undefined,
          isAvailable: newServiceData.isAvailable,
          fulfillment: newServiceData.fulfillment
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось добавить позицию");

      setShops(prev => (prev || []).map(s => s.id === selectedShop.id ? {
        ...s,
        services: [data, ...(s.services || []).filter(srv => srv.id !== data.id)]
      } : s));
      setSelectedShop(prev => prev ? {
        ...prev,
        services: [data, ...(prev.services || []).filter(srv => srv.id !== data.id)]
      } : prev);

      setNewServiceData({
        title: "",
        price: "",
        oldPrice: "",
        description: "",
        category: "",
        imageUrl: "",
        gallery: [],
        badge: "",
        tags: "",
        prepTime: "",
        weight: "",
        isAvailable: true,
        fulfillment: "pickup"
      });
      setIsAddingService(false);
      setActiveTab("services");
      showToast("Услуга успешно добавлена в меню", "success");
      await fetchShops();
    } catch (err: any) {
      setServiceError(err.message);
    }
  };

  const handleOpenEditService = (service: Service) => {
    let parsedGallery: string[] = [];
    if (service.gallery) {
      try {
        parsedGallery = typeof service.gallery === "string" ? JSON.parse(service.gallery) : service.gallery;
      } catch {
        parsedGallery = String(service.gallery).split(",").map(s => s.trim()).filter(Boolean);
      }
    }

    const initialData = {
      title: service.title,
      price: service.price.toString(),
      oldPrice: service.oldPrice ? service.oldPrice.toString() : "",
      description: service.description || "",
      category: service.category || "",
      imageUrl: service.imageUrl || "",
      gallery: parsedGallery,
      badge: service.badge || "",
      tags: service.tags || "",
      prepTime: service.prepTime || "",
      weight: service.weight || "",
      isAvailable: service.isAvailable !== false,
      fulfillment: service.fulfillment || "courier,pickup"
    };

    setNewServiceData(initialData);
    setEditServiceData(initialData);
    setServiceError(null);
    setEditServiceError(null);
    setIsProfileOpen(false);
    setIsSettingsOpen(false);
    setIsCreatingShop(false);
    setIsAddingService(false);
    setEditingService(service);
    setActiveTab("services");
  };

  const handleSaveEditService = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    const currentData = { ...editServiceData, ...newServiceData };

    const titleRes = validateItemTitle(currentData.title);
    if (!titleRes.isValid) {
      setServiceError(titleRes.error || "Укажите название");
      setEditServiceError(titleRes.error || "Укажите название");
      return;
    }

    const priceRes = validatePrice(currentData.price);
    if (!priceRes.isValid) {
      setServiceError(priceRes.error || "Укажите цену");
      setEditServiceError(priceRes.error || "Укажите цену");
      return;
    }

    setIsSavingEditService(true);
    setServiceError(null);
    setEditServiceError(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/services/${editingService.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          title: titleRes.title,
          price: priceRes.price,
          oldPrice: currentData.oldPrice ? Number(currentData.oldPrice) : undefined,
          description: currentData.description.trim() || undefined,
          category: currentData.category.trim() || undefined,
          imageUrl: currentData.imageUrl.trim() || undefined,
          gallery: (currentData.gallery || []).length > 0 ? JSON.stringify(currentData.gallery) : undefined,
          badge: currentData.badge.trim() || undefined,
          tags: currentData.tags.trim() || undefined,
          prepTime: currentData.prepTime.trim() || undefined,
          weight: currentData.weight.trim() || undefined,
          isAvailable: currentData.isAvailable,
          fulfillment: currentData.fulfillment
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить изменения");

      setShops(prev => (prev || []).map(s => s.id === selectedShop.id ? {
        ...s,
        services: (s.services || []).map(srv => srv.id === data.id ? { ...srv, ...data } : srv)
      } : s));
      setSelectedShop(prev => prev ? {
        ...prev,
        services: (prev.services || []).map(srv => srv.id === data.id ? { ...srv, ...data } : srv)
      } : prev);

      setEditingService(null);
      setIsAddingService(false);
      setActiveTab("services");
      showToast("Услуга успешно обновлена", "success");
      await fetchShops();
    } catch (err: any) {
      setServiceError(err.message);
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

  const fetchPromocodes = async (silent = false) => {
    if (!selectedShop) return;
    if (!silent) setPromocodesLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/shops/${selectedShop.id}/promocodes`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPromocodes(data);
      }
    } catch (e: any) {
      if (!silent) {
        if (e instanceof TypeError || (e?.message && e.message.includes("Failed to fetch"))) {
          console.warn("Failed to fetch promocodes (network offline):", e.message);
        } else {
          console.error(e);
        }
      }
    } finally {
      if (!silent) setPromocodesLoading(false);
    }
  };

  const handleCreatePromocode = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;
    setPromoError(null);

    const discountVal = Number(newPromoData.discountPercent) || Number(newPromoData.discountAmount) || 0;
    const discountType = Number(newPromoData.discountPercent) > 0 ? "percent" : "fixed";

    const promoRes = validatePromoCodeData(newPromoData.code, discountVal, discountType);
    if (!promoRes.isValid) {
      setPromoError(promoRes.error || "Проверьте данные промокода");
      return;
    }

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

  const fetchReviews = async (silent = false) => {
    if (!selectedShop) return;
    if (!silent) setReviewsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/shops/${selectedShop.id}/reviews`, { headers });
      if (res.ok) {
        const data = await res.json();
        const revList = data.reviews || [];
        setReviews(revList);
        if (data.stats) {
          setReviewStats(data.stats);
        } else if (revList.length > 0) {
          const avg = revList.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0) / revList.length;
          setReviewStats({ totalReviews: revList.length, avgRating: Number(avg.toFixed(1)) });
        } else {
          setReviewStats({ totalReviews: 0, avgRating: 5.0 });
        }
      }
    } catch (e: any) {
      if (!silent) {
        if (e instanceof TypeError || (e?.message && e.message.includes("Failed to fetch"))) {
          console.warn("Failed to fetch reviews (network offline):", e.message);
        } else {
          console.error(e);
        }
      }
    } finally {
      if (!silent) setReviewsLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    requestConfirm(
      "Удаление отзыва",
      "Вы действительно хотите удалить этот отзыв? Это действие нельзя будет отменить.",
      async () => {
        setDeletingReviewId(reviewId);
        try {
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;
          const res = await fetch(`/api/reviews/${reviewId}`, {
            method: "DELETE",
            headers
          });
          if (res.ok) {
            showToast("Отзыв успешно удален", "success");
            fetchReviews();
          } else {
            showToast("Не удалось удалить отзыв", "error");
          }
        } catch (e: any) {
          showToast("Ошибка: " + e.message, "error");
        } finally {
          setDeletingReviewId(null);
        }
      }
    );
  };

  const fetchBanners = async (silent = false) => {
    if (!selectedShop) return;
    if (!silent) setBannersLoading(true);
    try {
      const res = await fetch(`/api/shops/${selectedShop.id}/banners`);
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      }
    } catch (e: any) {
      if (!silent) {
        if (e instanceof TypeError || (e?.message && e.message.includes("Failed to fetch"))) {
          console.warn("Failed to fetch banners (network offline):", e.message);
        } else {
          console.error(e);
        }
      }
    } finally {
      if (!silent) setBannersLoading(false);
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

  const fetchBroadcasts = async (silent = false) => {
    if (!selectedShop) return;
    if (!silent) setBroadcastsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/shops/${selectedShop.id}/broadcasts`, { headers });
      if (res.ok) {
        const data = await res.json();
        setBroadcasts(data);
      }
    } catch (e: any) {
      if (!silent) {
        if (e instanceof TypeError || (e?.message && e.message.includes("Failed to fetch"))) {
          console.warn("Failed to fetch broadcasts (network offline):", e.message);
        } else {
          console.error(e);
        }
      }
    } finally {
      if (!silent) setBroadcastsLoading(false);
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

  const fetchCustomers = async (silent = false) => {
    if (!selectedShop) return;
    if (!silent) setCustomersLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/shops/${selectedShop.id}/customers`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (e: any) {
      if (!silent) {
        if (e instanceof TypeError || (e?.message && e.message.includes("Failed to fetch"))) {
          console.warn("Failed to fetch customers (network offline):", e.message);
        } else {
          console.error(e);
        }
      }
    } finally {
      if (!silent) setCustomersLoading(false);
    }
  };

  useEffect(() => {
    if (selectedShop) {
      fetchPromocodes();
      fetchReviews();
      fetchBanners();
      fetchBroadcasts();
      fetchCustomers();

      const interval = setInterval(() => {
        fetchPromocodes(true);
        fetchReviews(true);
        fetchBanners(true);
        fetchBroadcasts(true);
        fetchCustomers(true);
        fetchShops(true);
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [selectedShop?.id]);

  const handleOpenProfile = () => {
    setIsSidebarOpen(false);
    if (user) {
      setProfileData({
        name: user.name || "",
        phone: user.phone || "",
        avatarUrl: user.avatarUrl || "",
        telegramHandle: user.telegramHandle || "",
        companyName: user.companyName || "",
        currentPassword: "",
        newPassword: "",
        emailCode: ""
      });
    }
    setProfileError(null);
    setProfileSuccess(null);
    setProfileCodeSentMsg(null);
    setIsSettingsOpen(false);
    setIsCreatingShop(false);
    setIsAddingService(false);
    setEditingService(null);
    setIsProfileOpen(true);
    setActiveTab("profile");
  };

  const handleSendProfileCode = async () => {
    if (!user?.email) return;
    setIsSendingProfileCode(true);
    setProfileError(null);
    setProfileCodeSentMsg(null);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, type: "CHANGE_PASSWORD" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось отправить код");
      setProfileCodeSentMsg(
        data.devCode
          ? `Код отправлен на ${user.email} (Тестовый код: ${data.devCode})`
          : `Код подтверждения отправлен на ${user.email}!`
      );
      showToast("Код подтверждения отправлен на почту", "success");
    } catch (err: any) {
      setProfileError(err.message || "Ошибка отправки кода на почту");
    } finally {
      setIsSendingProfileCode(false);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    let formattedPhone = profileData.phone.trim();
    if (formattedPhone) {
      const phoneRes = validateCisPhone(formattedPhone);
      if (!phoneRes.isValid) {
        setProfileError(phoneRes.error || "Укажите корректный номер телефона");
        return;
      }
      formattedPhone = phoneRes.formatted;
    }

    if (profileData.newPassword.trim() || profileData.currentPassword.trim() || profileData.emailCode.trim()) {
      if (!profileData.newPassword.trim() || profileData.newPassword.trim().length < 6) {
        setProfileError("Укажите новый пароль (минимум 6 символов)");
        return;
      }

      if (passwordChangeMethod === "password") {
        if (!profileData.currentPassword.trim()) {
          setProfileError("Укажите текущий пароль для подтверждения смены");
          return;
        }
        if (profileData.newPassword.trim() === profileData.currentPassword.trim()) {
          setProfileError("Новый пароль не должен совпадать с текущим паролем");
          return;
        }
      } else if (passwordChangeMethod === "code") {
        if (!profileData.emailCode.trim()) {
          setProfileError("Запросите и введите 6-значный код подтверждения из письма");
          return;
        }
      }
    }

    setIsSavingProfile(true);

    try {
      await updateProfile({
        name: profileData.name.trim(),
        phone: formattedPhone,
        avatarUrl: profileData.avatarUrl.trim(),
        telegramHandle: profileData.telegramHandle.trim(),
        companyName: profileData.companyName.trim(),
        currentPassword: (passwordChangeMethod === "password" && profileData.newPassword.trim()) ? profileData.currentPassword.trim() : undefined,
        newPassword: profileData.newPassword.trim() || undefined,
        emailCode: (passwordChangeMethod === "code" && profileData.newPassword.trim()) ? profileData.emailCode.trim() : undefined
      });

      setProfileSuccess("Ваш профиль и пароль успешно обновлены!");
      showToast("Профиль успешно обновлен", "success");
      setProfileData(p => ({ ...p, currentPassword: "", newPassword: "", emailCode: "" }));
      setProfileCodeSentMsg(null);
      setTimeout(() => {
        setIsProfileOpen(false);
      }, 1200);
    } catch (err: any) {
      setProfileError(err.message || "Не удалось обновить профиль");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleClearProfileFields = () => {
    setProfileData(p => ({
      ...p,
      name: "",
      phone: "",
      avatarUrl: "",
      telegramHandle: "",
      companyName: "",
      currentPassword: "",
      newPassword: "",
      emailCode: ""
    }));
    setProfileError(null);
    setProfileCodeSentMsg(null);
    setProfileSuccess("Поля формы очищены. Нажмите «Сохранить профиль» для сброса данных.");
  };

  const handleOpenSettings = (shop: Shop) => {
    setIsSidebarOpen(false);
    let parsedSocials = { telegram: "", instagram: "", whatsapp: "", vk: "", website: "" };
    if (shop.socialLinks) {
      try {
        parsedSocials = { ...parsedSocials, ...JSON.parse(shop.socialLinks) };
      } catch {}
    }

    let parsedDelivery = { 
      pickup: true, 
      courier: true, 
      shipping: false, 
      minOrder: "0", 
      deliveryFee: "0",
      pickupAddress: "",
      deliveryMinOrder: "0",
      freeDeliveryThreshold: "0",
      deliveryNotes: ""
    };
    if (shop.deliveryOptions) {
      try {
        parsedDelivery = { ...parsedDelivery, ...JSON.parse(shop.deliveryOptions) };
      } catch {}
    }

    setSettingsData({
      name: shop.name,
      slug: shop.slug || "",
      description: shop.description || "",
      botToken: shop.botToken || "",
      adminChatId: shop.adminChatId || "",
      workingHours: shop.workingHours || "",
      address: shop.address || "",
      phone: shop.phone || "",
      logoUrl: shop.logoUrl || "",
      bannerUrl: shop.bannerUrl || "",
      currency: shop.currency || "RUB",
      currencySymbol: shop.currencySymbol || "₽",
      socialLinks: parsedSocials,
      deliveryOptions: parsedDelivery,
      paymentInstructions: shop.paymentInstructions || "",
      cashbackPercent: shop.cashbackPercent || 5,
      isOpen: shop.isOpen !== false
    });
    setSettingsActiveTab("general");
    setSettingsError(null);
    setIsProfileOpen(false);
    setIsCreatingShop(false);
    setIsAddingService(false);
    setEditingService(null);
    setIsSettingsOpen(true);
    setActiveTab("settings");
  };

  const handleClearSettingsFields = () => {
    switch (settingsActiveTab) {
      case "general":
        setSettingsData(p => ({
          ...p,
          description: "",
          workingHours: "",
          address: "",
          phone: ""
        }));
        showToast("Доп. поля на вкладке «Основное» очищены", "warning");
        break;
      case "branding":
        setSettingsData(p => ({
          ...p,
          logoUrl: "",
          bannerUrl: ""
        }));
        showToast("Доп. поля на вкладке «Брендинг» очищены", "warning");
        break;
      case "integrations":
      case "telegram" as any:
        setSettingsData(p => ({
          ...p,
          botToken: "",
          adminChatId: ""
        }));
        setBotTestResult(null);
        setWebhookStatus(null);
        showToast("Доп. поля на вкладке «Telegram» очищены", "warning");
        break;
      case "delivery":
      case "social" as any:
        setSettingsData(p => ({
          ...p,
          paymentInstructions: "",
          socialLinks: { telegram: "", instagram: "", whatsapp: "", vk: "", website: "" },
          deliveryOptions: {
            ...p.deliveryOptions,
            pickupAddress: "",
            deliveryMinOrder: 0,
            deliveryFee: 0,
            freeDeliveryThreshold: 0
          }
        }));
        showToast("Доп. поля на вкладке «Доставка и Соцсети» очищены", "warning");
        break;
      case "team":
        showToast("На вкладке «Команда» нет дополнительных полей для очистки", "warning");
        break;
      default:
        break;
    }
    setSettingsError(null);
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;

    const nameRes = validateShopName(settingsData.name);
    if (!nameRes.isValid) {
      setSettingsError(nameRes.error || "Некорректное название");
      return;
    }

    const slugRes = validateSlug(settingsData.slug);
    if (!slugRes.isValid) {
      setSettingsError(slugRes.error || "Некорректный slug");
      return;
    }

    if (settingsData.botToken && settingsData.botToken.trim()) {
      const botRes = validateTelegramBotToken(settingsData.botToken);
      if (!botRes.isValid) {
        setSettingsError(botRes.error || "Некорректный Bot Token");
        return;
      }
    }

    if (settingsData.adminChatId && settingsData.adminChatId.trim()) {
      const chatRes = validateTelegramChatId(settingsData.adminChatId);
      if (!chatRes.isValid) {
        setSettingsError(chatRes.error || "Некорректный Chat ID");
        return;
      }
    }

    let formattedPhone = settingsData.phone.trim();
    if (formattedPhone) {
      const phoneRes = validateCisPhone(formattedPhone);
      if (!phoneRes.isValid) {
        setSettingsError(phoneRes.error || "Некорректный номер телефона");
        return;
      }
      formattedPhone = phoneRes.formatted;
    }

    setIsSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/shops/${selectedShop.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: nameRes.name,
          slug: slugRes.cleanSlug,
          description: settingsData.description.trim(),
          botToken: settingsData.botToken.trim(),
          adminChatId: settingsData.adminChatId.trim(),
          workingHours: settingsData.workingHours.trim(),
          address: settingsData.address.trim(),
          phone: formattedPhone,
          logoUrl: settingsData.logoUrl.trim(),
          bannerUrl: settingsData.bannerUrl.trim(),
          currency: settingsData.currency,
          currencySymbol: settingsData.currencySymbol,
          socialLinks: JSON.stringify(settingsData.socialLinks),
          deliveryOptions: JSON.stringify(settingsData.deliveryOptions),
          paymentInstructions: settingsData.paymentInstructions.trim(),
          cashbackPercent: Number(settingsData.cashbackPercent) || 5,
          isOpen: settingsData.isOpen
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось обновить настройки");

      setSettingsSuccess("Настройки заведения успешно сохранены!");
      showToast("Настройки заведения успешно сохранены", "success");
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
    ? Array.from(new Set((selectedShop.services || []).map(s => s.category).filter(Boolean))) as string[]
    : [];

  const filteredServices = (selectedShop?.services || []).filter(service => {
    const matchesCategory = selectedCategoryFilter === "ALL" || service.category === selectedCategoryFilter;
    const matchesSearch = service.title.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
      (service.description && service.description.toLowerCase().includes(serviceSearchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter !== "ALL" && o.status !== orderStatusFilter) return false;
    if (orderTypeFilter !== "ALL") {
      const method = (o as any).fulfillmentMethod || ((o as any).deliveryAddress ? "courier" : "pickup");
      if (method !== orderTypeFilter) return false;
    }
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase().trim();
      const matchId = (o.id || "").toLowerCase().includes(q);
      const matchName = (o.customerName || "").toLowerCase().includes(q);
      const matchPhone = (o.customerPhone || "").toLowerCase().includes(q);
      const matchAddr = (o.deliveryAddress || "").toLowerCase().includes(q);
      const matchItems = (o.items || "").toLowerCase().includes(q);
      return matchId || matchName || matchPhone || matchAddr || matchItems;
    }
    return true;
  });

  // Reviews Calculations & Filter
  const totalReviewsCount = reviews.length;
  const computedAvgRating = totalReviewsCount > 0
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / totalReviewsCount).toFixed(1)
    : "5.0";
  const positiveCount = reviews.filter(r => (Number(r.rating) || 0) >= 4).length;
  const positivePercentage = totalReviewsCount > 0 ? Math.round((positiveCount / totalReviewsCount) * 100) : 100;
  const unrepliedCount = reviews.filter(r => !r.reply || r.reply.trim() === "").length;
  const repliedCount = totalReviewsCount - unrepliedCount;

  // Rating distribution counts (5, 4, 3, 2, 1)
  const starCounts = {
    5: reviews.filter(r => Number(r.rating) === 5).length,
    4: reviews.filter(r => Number(r.rating) === 4).length,
    3: reviews.filter(r => Number(r.rating) === 3).length,
    2: reviews.filter(r => Number(r.rating) === 2).length,
    1: reviews.filter(r => Number(r.rating) === 1).length,
  };

  const filteredReviews = reviews.filter(rev => {
    const query = reviewSearchQuery.trim().toLowerCase();
    const nameMatch = rev.customerName?.toLowerCase().includes(query);
    const commentMatch = rev.comment?.toLowerCase().includes(query);
    const replyMatch = rev.reply?.toLowerCase().includes(query);
    const matchesSearch = !query || nameMatch || commentMatch || replyMatch;

    const matchesStar = reviewStarFilter === "ALL" || Number(rev.rating) === reviewStarFilter;

    const hasReply = Boolean(rev.reply && rev.reply.trim() !== "");
    const matchesReply = reviewReplyFilter === "ALL"
      ? true
      : reviewReplyFilter === "UNREPLIED"
      ? !hasReply
      : hasReply;

    return matchesSearch && matchesStar && matchesReply;
  }).sort((a, b) => {
    if (reviewSortOrder === "NEWEST") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (reviewSortOrder === "OLDEST") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (reviewSortOrder === "RATING_DESC") {
      return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    }
    if (reviewSortOrder === "RATING_ASC") {
      return (Number(a.rating) || 0) - (Number(b.rating) || 0);
    }
    return 0;
  });

  if (authLoading) {
    return <AdminPageSkeleton />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-app-bg text-app-primary flex items-center justify-center p-4 selection:bg-zinc-800 font-sans">
        <div className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent blur-sm" />

          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-app-accent text-app-accent-fg mx-auto flex items-center justify-center font-mono font-bold text-lg shadow-lg">
              ▲
            </div>
            <h1 className="text-xl font-bold font-mono tracking-tight text-app-primary">
              Панель администратора
            </h1>
            <p className="text-xs text-app-muted">
              Обязательная авторизация для доступа к заведениям и управлению заказами.
            </p>
          </div>

          {inviteInfo && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs font-mono">
                <Mail size={14} />
                <span>Приглашение в команду</span>
              </div>
              <p className="text-sm font-bold text-app-primary">Заведение «{inviteInfo.shop.name}»</p>
              <p className="text-xs text-app-muted leading-relaxed">
                Войдите или зарегистрируйтесь, чтобы автоматически принять приглашение и получить доступ к заведению.
              </p>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-app-card p-1 rounded-xl border border-app-border text-xs font-mono">
            <button
              type="button"
              onClick={() => { setAuthMode("otp"); setOtpStep("email"); setAuthError(null); setAuthSuccessMsg(null); }}
              className={`py-2 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                authMode === "otp" ? "bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30" : "text-app-muted hover:text-app-primary"
              }`}
            >
              <Mail size={12} />
              <span>E-mail код</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode("login"); setAuthError(null); setAuthSuccessMsg(null); }}
              className={`py-2 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 border cursor-pointer ${
                authMode === "login" ? "bg-app-accent text-app-accent-fg border-app-border font-bold shadow-sm" : "border-transparent text-app-muted hover:text-app-primary"
              }`}
            >
              <Lock size={12} />
              <span>Пароль</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode("register"); setAuthError(null); setAuthSuccessMsg(null); }}
              className={`py-2 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 border cursor-pointer ${
                authMode === "register" ? "bg-app-accent text-app-accent-fg border-app-border font-bold shadow-sm" : "border-transparent text-app-muted hover:text-app-primary"
              }`}
            >
              <User size={12} />
              <span>Создать</span>
            </button>
          </div>

          {authError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs font-mono">
              <AlertCircle size={14} className="shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccessMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-mono">
              <CheckCircle size={14} className="shrink-0" />
              <span>{authSuccessMsg}</span>
            </div>
          )}

          {/* Form rendering */}
          {authMode === "otp" && (
            <div className="space-y-3 font-sans">
              {otpStep === "email" ? (
                <>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    type="button"
                    disabled={isSubmittingAuth}
                    onClick={() => handleSendOtpCode("LOGIN")}
                    className="w-full py-2.5 bg-emerald-500 text-black font-mono font-bold text-xs rounded-xl hover:bg-emerald-400 transition-colors uppercase flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmittingAuth ? <SpinnerLoader size={14} /> : <Mail size={14} />}
                    {isSubmittingAuth ? "Отправка..." : "Получить код на E-mail"}
                  </button>
                </>
              ) : (
                <form onSubmit={handleVerifyOtpCode} className="space-y-3 font-sans">
                  <p className="text-xs text-app-muted">Код отправлен на <span className="font-mono text-app-primary">{authEmail}</span></p>
                  <input
                    type="text"
                    maxLength={6}
                    value={authOtpCode}
                    onChange={e => setAuthOtpCode(e.target.value)}
                    placeholder="6-значный код"
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-center font-mono text-base tracking-widest text-app-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="w-full py-2.5 bg-emerald-500 text-black font-mono font-bold text-xs rounded-xl hover:bg-emerald-400 transition-colors uppercase flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmittingAuth ? <SpinnerLoader size={14} /> : <ShieldCheck size={14} />}
                    {isSubmittingAuth ? "Проверка..." : "Войти"}
                  </button>
                </form>
              )}
            </div>
          )}

          {authMode !== "otp" && (
            <form onSubmit={handleAuthSubmit} className="space-y-3 font-sans">
              {authMode === "register" && (
                <input
                  type="text"
                  autoComplete="name"
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  placeholder="ФИО / Название организации"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none"
                />
              )}
              <input
                type="email"
                autoComplete="email"
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                placeholder="Электронная почта"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none"
              />
              {authMode !== "reset" && (
                <input
                  type="password"
                  autoComplete={authMode === "register" ? "new-password" : "current-password"}
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="Пароль"
                  className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none"
                />
              )}
              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-opacity uppercase cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmittingAuth ? <SpinnerLoader size={14} /> : <ShieldCheck size={14} />}
                <span>
                  {authMode === "login" && "Войти"}
                  {authMode === "register" && "Зарегистрироваться"}
                  {authMode === "reset" && "Восстановить пароль"}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-primary font-sans flex flex-col md:flex-row selection:bg-zinc-800 relative">
      {/* Mobile Sidebar Overlay Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* Mobile Top Navigation */}
      <div className="md:hidden sticky top-0 z-40 bg-app-surface/90 backdrop-blur-xl border-b border-app-border px-4 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-app-accent text-app-accent-fg flex items-center justify-center font-mono font-bold text-xs">
            ▲
          </div>
          <span className="font-semibold text-sm text-app-primary font-mono">TMA BUILDER</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 text-app-muted hover:text-app-primary bg-app-card border border-app-border rounded-lg transition-colors cursor-pointer"
            title="Переключить тему"
          >
            {theme === "dark" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />}
          </button>
          <button 
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-1.5 text-app-muted hover:text-app-primary bg-app-card border border-app-border rounded-lg transition-colors cursor-pointer"
            aria-label="Открыть меню"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Sleek Vercel / Linear Left Sidebar Navigation */}
      <aside
        style={{ width: `${sidebarWidth}px` }}
        className={`
          fixed md:sticky top-0 left-0 z-50 h-[100dvh] max-h-[100dvh] bg-app-surface border-r border-app-border max-w-[85vw] sm:max-w-[320px] md:max-w-none shrink-0 relative
          ${isResizingSidebar ? "select-none" : "transition-[transform] duration-200"}
          ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Inner Scrollable Navigation Container */}
        <div className="h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col justify-between p-4 space-y-6 pb-12 md:pb-4">
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
                v2.5
              </span>
            </div>

          {/* Workspace / Custom Shop Selector Dropdown */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-app-muted px-2 block">
              Активное заведение
            </label>

            <div className="relative" ref={shopDropdownRef}>
              <button
                type="button"
                onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
                className="w-full bg-app-card hover:bg-app-hover border border-app-border text-xs font-medium text-app-primary rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 transition-all cursor-pointer shadow-sm focus:outline-none"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span className="truncate font-semibold text-app-primary">
                    {selectedShop ? selectedShop.name : "Выберите заведение"}
                  </span>
                  {selectedShop && (
                    <span className="text-[10px] text-app-muted font-mono shrink-0">
                      ({selectedShop.slug})
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={14}
                  className={`text-app-muted shrink-0 transition-transform duration-200 ${
                    isShopDropdownOpen ? "rotate-180 text-app-primary" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {isShopDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-app-modal border border-app-border rounded-2xl shadow-2xl p-1.5 space-y-1 backdrop-blur-xl"
                  >
                    <div className="px-2 py-1 flex items-center justify-between text-[10px] font-mono text-app-muted border-b border-app-border pb-1.5 mb-1">
                      <span>Список заведений ({activeShops.length})</span>
                      {shops.length > activeShops.length && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShopFilterMode(shopFilterMode === "my" ? "all" : "my");
                          }}
                          className="text-app-accent hover:underline cursor-pointer"
                        >
                          {shopFilterMode === "my" ? "Все заведения" : "Мои заведения"}
                        </button>
                      )}
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
                      {activeShops.length === 0 ? (
                        <div className="p-3 text-center text-xs text-app-muted font-mono">
                          Заведений не найдено
                        </div>
                      ) : (
                        activeShops.map((s) => {
                          const isSelected = selectedShop?.id === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedShop(s);
                                setIsShopDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-mono transition-all cursor-pointer text-left ${
                                isSelected
                                  ? "bg-app-accent text-app-accent-fg font-bold shadow-sm"
                                  : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <Store size={14} className={isSelected ? "text-app-accent-fg shrink-0" : "text-app-muted shrink-0"} />
                                <span className="truncate">{s.name}</span>
                                <span className={`text-[10px] ${isSelected ? "text-app-accent-fg/80" : "text-app-muted"} shrink-0`}>
                                  ({s.slug})
                                </span>
                              </div>
                              {isSelected && <Check size={14} className="text-app-accent-fg shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div className="pt-1.5 border-t border-app-border">
                      <button
                        type="button"
                        onClick={() => {
                          setIsShopDropdownOpen(false);
                          handleOpenCreateShop();
                        }}
                        className="w-full py-2 px-2.5 rounded-xl text-xs font-mono font-bold bg-app-card hover:bg-app-hover text-app-primary border border-app-border flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Plus size={14} className="text-emerald-500" />
                        <span>Создать новое заведение</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Actions Bar */}
            {selectedShop && (
              <div className="flex items-center justify-between gap-1 px-1 pt-1">
                <button
                  onClick={handleOpenCreateShop}
                  className="flex-1 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-[11px] font-mono text-app-secondary hover:text-app-primary rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Заведение
                </button>
                <button
                  onClick={() => handleOpenSettings(selectedShop)}
                  className="p-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary rounded-lg transition-colors cursor-pointer"
                  title="Настройки заведения"
                >
                  <Settings size={13} />
                </button>
                <a
                  href={`/${selectedShop.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary rounded-lg transition-colors"
                  title="Открыть витрину"
                >
                  <ExternalLink size={13} />
                </a>
                <button
                  onClick={() => handleDeleteShop(selectedShop)}
                  className="p-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary rounded-lg transition-all cursor-pointer backdrop-blur-sm"
                  title="Удалить заведение"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1 font-mono text-xs">
            {[
              { id: "services", label: "Меню и услуги", icon: Layers, badge: (selectedShop?.services || []).length },
              { id: "orders", label: "Заказы", icon: ShoppingBag, badge: (orders || []).filter(o => o.status === "PENDING").length, alert: (orders || []).filter(o => o.status === "PENDING").length > 0 },
              { id: "promocodes", label: "Промокоды", icon: Tag, badge: (promocodes || []).length },
              { id: "reviews", label: "Отзывы", icon: Star, badge: (reviews || []).length },
              { id: "banners", label: "Баннеры", icon: ImageIcon, badge: (banners || []).length },
              { id: "broadcasts", label: "Рассылки", icon: Send, badge: (broadcasts || []).length },
              { id: "customers", label: "Клиенты CRM", icon: Users, badge: (customers || []).length },
              { id: "team", label: "Команда и доступ", icon: UserPlus, badge: (teamMembers || []).length + (selectedShop?.owner ? 1 : 0) },
              { id: "analytics", label: "Аналитика", icon: BarChart3 },
              { id: "botsim", label: "Симулятор бота", icon: Smartphone },
              { id: "reports", label: "Репорты (Dev)", icon: Bug, badge: unhandledReportsCount, alert: unhandledReportsCount > 0 },
              { id: "profile", label: "Профиль администратора", icon: User }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === "reports") {
                      navigate("/reports");
                    } else if (tab.id === "profile") {
                      handleOpenProfile();
                    } else {
                      closeSubView();
                      setActiveTab(tab.id as any);
                    }
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer ${
                    isActive 
                      ? "bg-app-accent text-app-accent-fg font-bold shadow-sm" 
                      : "text-app-muted hover:text-app-primary hover:bg-app-hover"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className={isActive ? "text-app-accent-fg" : (tab.id === "reports" && unhandledReportsCount > 0 ? "text-rose-500" : "text-app-muted")} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all ${
                      tab.alert 
                        ? "bg-rose-500 text-white animate-pulse" 
                        : isActive 
                          ? "bg-app-accent-fg/20 text-app-accent-fg border border-app-accent-fg/20" 
                          : "bg-app-card text-app-muted border border-app-border"
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
              className="p-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-app-muted hover:text-app-primary transition-colors cursor-pointer"
              title={isAudioEnabled ? "Отключить звук уведомлений" : "Включить звук уведомлений"}
            >
              {isAudioEnabled ? <Volume2 size={14} className="text-emerald-400" /> : <VolumeX size={14} />}
            </button>
            <button
              onClick={() => {
                setIsQrModalOpen(true);
                setIsSidebarOpen(false);
              }}
              className="p-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-app-muted hover:text-app-primary transition-colors cursor-pointer"
              title="Генератор QR-кодов"
            >
              <QrCode size={14} />
            </button>
            <button
              onClick={() => {
                setIsPlanModalOpen(true);
                setIsSidebarOpen(false);
              }}
              className="px-2.5 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
            >
              <Crown size={12} className="text-amber-400" />
              <span>{user?.plan || "БЕСПЛАТНЫЙ"}</span>
            </button>
          </div>

          <div className="p-3 bg-app-surface border border-app-border rounded-2xl flex items-center justify-between shadow-sm">
            <button 
              onClick={handleOpenProfile}
              className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-80 transition-opacity flex-1 mr-2 cursor-pointer group"
              title="Настройки профиля"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-xl object-cover border border-app-border shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-app-accent text-app-accent-fg border border-app-border flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : "А")}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-app-primary truncate group-hover:text-app-accent transition-colors">
                  {user?.name || user?.email || "Администратор"}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-app-muted truncate font-mono">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${token ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  <span className="truncate">
                    {user?.companyName || (token ? "Авторизован (Онлайн)" : "Гость (Не авторизован)")}
                  </span>
                </div>
              </div>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              {token ? (
                <>
                  <button 
                    onClick={handleOpenProfile}
                    className="p-1.5 text-app-muted hover:text-app-primary hover:bg-app-card rounded-lg transition-colors cursor-pointer"
                    title="Редактировать профиль"
                  >
                    <User size={14} className="text-app-primary" />
                  </button>
                  <button 
                    onClick={() => {
                      handleLogoutRequest();
                      setIsSidebarOpen(false);
                    }} 
                    className="p-1.5 text-app-muted hover:text-app-primary hover:bg-app-hover border border-transparent hover:border-app-border rounded-lg transition-all cursor-pointer backdrop-blur-sm" 
                    title="Выйти из аккаунта"
                  >
                    <LogOut size={14} />
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => {
                    setIsAuthModalOpen(true);
                    setIsSidebarOpen(false);
                  }} 
                  className="px-2.5 py-1.5 bg-app-accent text-app-accent-fg font-mono font-bold text-[10px] rounded-lg hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1 shrink-0" 
                  title="Войти в аккаунт"
                >
                  <LogIn size={12} />
                  <span>Войти</span>
                </button>
              )}
            </div>
          </div>

          {/* GitHub Open Source Link (Adjusted background to match profile card exactly) */}
          <a
            href="https://github.com/blesswrld/tma-builder"
            target="_blank"
            rel="noreferrer"
            className="p-2.5 bg-app-surface hover:bg-app-hover border border-app-border rounded-2xl flex items-center justify-between text-xs font-mono transition-colors group cursor-pointer shadow-sm"
            title="Открыть исходный код приложения на GitHub"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Github size={15} className="text-app-primary shrink-0" />
              <span className="truncate text-app-secondary group-hover:text-app-primary font-medium">Исходный код (GitHub)</span>
            </div>
            <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
          </a>
        </div>
      </div>

      {/* Minimalist Interactive Drag Resizer Handle */}
      <div
        onMouseDown={startResizingSidebar}
        onTouchStart={startResizingSidebar}
        onDoubleClick={resetSidebarWidth}
        title="Потяните для изменения ширины. Двойной клик — сбросить (256px)"
        className="hidden md:flex absolute top-0 -right-2 bottom-0 w-4 cursor-col-resize z-50 group items-center justify-center select-none"
      >
        {/* Active / Hover Guide Line */}
        <div
          className={`absolute top-0 bottom-0 w-0.5 right-2 transition-colors duration-150 ${
            isResizingSidebar ? "bg-amber-400 opacity-100" : "bg-transparent group-hover:bg-app-accent/50 opacity-70"
          }`}
        />

        {/* Sleek Centered Grip Pill */}
        <div
          className={`
            relative z-10 flex items-center justify-center w-3.5 h-8 rounded-full bg-app-surface border border-app-border shadow-sm
            transition-all duration-200 group-hover:scale-110 group-hover:border-app-accent group-hover:shadow-md
            ${isResizingSidebar ? "border-amber-400 bg-amber-500/15 scale-110 shadow-md text-amber-400" : "opacity-50 group-hover:opacity-100 text-app-muted"}
          `}
        >
          <GripVertical size={10} className="shrink-0" />
        </div>

        {/* Live Width Badge Tooltip */}
        <div
          className={`
            absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-150 z-50
            ${isResizingSidebar ? "opacity-100 scale-100" : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100"}
          `}
        >
          <div className="bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-xl flex items-center gap-1.5 whitespace-nowrap border border-app-border/40">
            <span>{sidebarWidth}px</span>
            {sidebarWidth === 256 && (
              <span className="text-[9px] opacity-60 font-sans">★</span>
            )}
          </div>
        </div>
      </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Workspace Top Bar Header */}
        <header className="min-h-[3.5rem] sm:min-h-[4rem] border-b border-app-border px-4 sm:px-6 py-2.5 sm:py-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-app-surface/80 backdrop-blur-md sticky top-14 md:top-0 z-30 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-app-muted font-mono">
                {activeTab === "profile" ? "Аккаунт /" : "Заведение /"}
              </span>
              <h2 className="text-sm font-semibold tracking-tight text-app-primary font-mono">
                {activeTab === "services" && "Меню и услуги"}
                {activeTab === "orders" && "Заказы"}
                {activeTab === "promocodes" && "Промокоды"}
                {activeTab === "reviews" && "Отзывы"}
                {activeTab === "banners" && "Баннеры"}
                {activeTab === "broadcasts" && "Рассылки"}
                {activeTab === "customers" && "Клиенты CRM"}
                {activeTab === "team" && "Команда и доступ"}
                {activeTab === "analytics" && "Аналитика"}
                {activeTab === "botsim" && "Симулятор бота"}
                {activeTab === "settings" && "Настройки заведения"}
                {activeTab === "profile" && "Профиль администратора"}
                {activeTab === "createshop" && "Создать заведение"}
                {activeTab === "addservice" && "Новая позиция меню"}
                {activeTab === "editservice" && "Редактирование позиции"}
              </h2>
            </div>
            <p className="text-[11px] text-app-muted font-sans truncate max-w-[200px] sm:max-w-xs">
              {activeTab === "profile"
                ? (user?.email || "Управление аккаунтом")
                : (activeTab === "createshop"
                  ? "Новое заведение"
                  : `Управление заведением ${selectedShop?.name || ""}`)}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Global Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-app-card hover:bg-app-hover border border-app-border text-app-primary rounded-xl transition-all cursor-pointer hidden md:flex items-center justify-center shrink-0"
              title={theme === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
            >
              {theme === "dark" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />}
            </button>

            {/* Hotkeys Helper Button */}
            <button
              type="button"
              onClick={() => setIsHotkeysModalOpen(true)}
              className="px-2.5 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-primary rounded-xl transition-all cursor-pointer hidden md:flex items-center gap-1.5 shrink-0 text-xs font-mono"
              title="Горячие клавиши (?)"
            >
              <Keyboard size={14} className="text-app-muted" />
              <span className="hidden lg:inline text-[9px] font-bold text-app-muted border border-app-border/80 px-1 py-0.5 rounded bg-app-surface/50">?</span>
            </button>

            {/* Report Bug / Feedback Button */}
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="px-2.5 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-primary rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 text-xs font-mono"
              title="Сообщить об ошибке / отправить идею"
            >
              <Bug size={14} className="text-app-muted" />
              <span className="hidden sm:inline text-[11px] font-semibold">Баг-репорт</span>
            </button>

            {["settings", "profile", "createshop", "addservice", "editservice"].includes(activeTab) && (
              <button
                onClick={closeSubView}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ArrowLeft size={14} /> <span>Вернуться к панели</span>
              </button>
            )}

            {activeTab === "services" && !isAddingService && !editingService && (
              <button
                onClick={() => {
                  setNewServiceData({ title: "", price: "", category: "", imageUrl: "", description: "", badge: "", prepTime: "", weight: "", tags: "", isAvailable: true, oldPrice: "", fulfillment: "courier,pickup" });
                  setServiceError(null);
                  setServiceFieldErrors({});
                  setEditingService(null);
                  setIsAddingService(true);
                  setActiveTab("services");
                }}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus size={14} /> <span>Добавить услугу</span>
              </button>
            )}

            {activeTab === "promocodes" && (
              <button
                onClick={() => setIsCreatingPromo(true)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> <span>Новый промокод</span>
              </button>
            )}

            {activeTab === "banners" && (
              <button
                onClick={() => setIsCreatingBanner(true)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> <span>Новый баннер</span>
              </button>
            )}

            {activeTab === "broadcasts" && (
              <button
                onClick={() => setIsCreatingBroadcast(true)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> <span>Новая рассылка</span>
              </button>
            )}
          </div>
        </header>

        {/* Tab Views Content Container */}
        <div className="p-4 sm:p-6 flex-1 space-y-6">
          {loading && <AdminContentSkeleton />}

          {/* PAGE VIEW: PROFILE */}
          {activeTab === "profile" && !loading && (
            <div className="max-w-3xl mx-auto bg-app-surface border border-app-border rounded-3xl p-6 sm:p-8 text-app-primary space-y-6 shadow-sm">
              <div className="border-b border-app-border pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-app-card border border-app-border flex items-center justify-center text-app-primary shadow-sm shrink-0">
                    <User size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-mono text-app-primary">
                      Профиль администратора
                    </h3>
                    <p className="text-xs text-app-muted mt-0.5 font-sans">
                      {user?.email || "Управление личными данными, контактами и безопасностью"}
                    </p>
                  </div>
                </div>
              </div>

              {profileError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs flex items-center gap-2.5 font-mono">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs flex items-center gap-2.5 font-mono">
                  <Check size={16} className="shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-6 font-sans text-xs">
                {/* Avatar Section */}
                <div className="p-5 bg-app-card/60 border border-app-border rounded-2xl space-y-3">
                  <label className="block text-xs font-mono font-semibold text-app-secondary">
                    Аватар профиля
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {profileData.avatarUrl ? (
                      <img src={profileData.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover border border-app-border shrink-0 shadow-sm" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-app-accent text-app-accent-fg border border-app-border flex items-center justify-center text-xl font-bold shrink-0 shadow-sm">
                        {profileData.name ? profileData.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : "А")}
                      </div>
                    )}
                    <div className="flex-1 w-full space-y-2">
                      <input
                        type="text"
                        value={profileData.avatarUrl}
                        onChange={e => setProfileData(p => ({ ...p, avatarUrl: e.target.value }))}
                        placeholder="https://example.com/avatar.png"
                        className="w-full bg-app-surface border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                      />
                      <ImageUploader 
                        value={profileData.avatarUrl}
                        onChange={(url) => setProfileData(p => ({ ...p, avatarUrl: url }))} 
                        type="avatar"
                        label="Загрузить изображение аватара"
                      />
                    </div>
                  </div>
                </div>

                {/* Personal Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                      Имя / Отображаемый ник
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))}
                      placeholder="Например, Тамерлан"
                      className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                      Название компании / Проекта
                    </label>
                    <input
                      type="text"
                      value={profileData.companyName}
                      onChange={e => setProfileData(p => ({ ...p, companyName: e.target.value }))}
                      placeholder="ООО Кофе и Сласти"
                      className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                    />
                  </div>
                </div>

                {/* Contacts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                      Телефон (СНГ, например +7...)
                    </label>
                    <input
                      type="text"
                      value={profileData.phone}
                      onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+7 (999) 000-00-00"
                      className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                      Telegram Username
                    </label>
                    <input
                      type="text"
                      value={profileData.telegramHandle}
                      onChange={e => setProfileData(p => ({ ...p, telegramHandle: e.target.value }))}
                      placeholder="@username"
                      className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                    />
                  </div>
                </div>

                {/* Password Change */}
                <div className="pt-4 border-t border-app-border space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-xs font-mono font-semibold text-app-secondary">
                      Смена пароля
                    </p>
                    <div className="flex items-center gap-1 bg-app-card p-1 rounded-xl border border-app-border self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => { setPasswordChangeMethod("password"); setProfileError(null); }}
                        className={`px-3 py-1 text-[11px] font-mono rounded-lg transition-all cursor-pointer ${
                          passwordChangeMethod === "password"
                            ? "bg-app-accent text-app-accent-fg font-bold shadow-sm"
                            : "text-app-muted hover:text-app-primary"
                        }`}
                      >
                        По текущему паролю
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPasswordChangeMethod("code"); setProfileError(null); }}
                        className={`px-3 py-1 text-[11px] font-mono rounded-lg transition-all cursor-pointer ${
                          passwordChangeMethod === "code"
                            ? "bg-app-accent text-app-accent-fg font-bold shadow-sm"
                            : "text-app-muted hover:text-app-primary"
                        }`}
                      >
                        Забыл пароль (код на E-mail)
                      </button>
                    </div>
                  </div>

                  {passwordChangeMethod === "password" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-app-card/50 border border-app-border rounded-2xl">
                      <div>
                        <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                          Текущий пароль
                        </label>
                        <input
                          type="password"
                          value={profileData.currentPassword}
                          onChange={e => setProfileData(p => ({ ...p, currentPassword: e.target.value }))}
                          placeholder="••••••••"
                          className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                          Новый пароль
                        </label>
                        <input
                          type="password"
                          value={profileData.newPassword}
                          onChange={e => setProfileData(p => ({ ...p, newPassword: e.target.value }))}
                          placeholder="Мин. 6 символов"
                          className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 p-4 bg-app-card/50 border border-app-border rounded-2xl">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <span className="text-[11px] font-mono text-app-muted">
                          Нажмите кнопку для отправки кода на {user?.email}
                        </span>
                        <button
                          type="button"
                          onClick={handleSendProfileCode}
                          disabled={isSendingProfileCode}
                          className="px-3 py-1.5 bg-app-card hover:bg-app-hover text-app-primary border border-app-border text-xs font-mono rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          {isSendingProfileCode && <SpinnerLoader size={12} />}
                          <Send size={12} className="text-app-muted" />
                          <span>{isSendingProfileCode ? "Отправка..." : "Запросить код на E-mail"}</span>
                        </button>
                      </div>

                      {profileCodeSentMsg && (
                        <div className="p-3 bg-app-card border border-app-border text-app-primary rounded-xl text-xs font-mono flex items-center gap-2">
                          <Check size={14} className="shrink-0 text-app-primary" />
                          <span>{profileCodeSentMsg}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                            Код из письма
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            value={profileData.emailCode}
                            onChange={e => setProfileData(p => ({ ...p, emailCode: e.target.value }))}
                            placeholder="123456"
                            className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono tracking-widest text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                            Новый пароль
                          </label>
                          <input
                            type="password"
                            value={profileData.newPassword}
                            onChange={e => setProfileData(p => ({ ...p, newPassword: e.target.value }))}
                            placeholder="Мин. 6 символов"
                            className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-app-border flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleClearProfileFields}
                    className="px-4 py-2.5 bg-app-card hover:bg-app-hover text-app-primary border border-app-border font-mono text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 font-medium"
                  >
                    <Trash2 size={14} className="text-app-muted" />
                    <span>Очистить поля</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeSubView}
                    className="px-5 py-2.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="flex-1 py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-opacity uppercase flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isSavingProfile && <SpinnerLoader size={14} />}
                    {isSavingProfile ? "Сохранение..." : "Сохранить профиль"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PAGE VIEW: CREATE SHOP */}
          {activeTab === "createshop" && !loading && (
            <div className="max-w-2xl mx-auto bg-app-surface border border-app-border rounded-3xl p-6 sm:p-8 text-app-primary space-y-6 shadow-sm">
              <div className="border-b border-app-border pb-5">
                <h3 className="text-base font-bold font-mono text-app-primary">Создать заведение</h3>
                <p className="text-xs text-app-muted mt-0.5 font-sans">Заполните название и системный идентификатор (slug)</p>
              </div>

              {createShopError && <p className="text-xs text-rose-400 font-mono p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">{createShopError}</p>}

              <form onSubmit={handleCreateShop} className="space-y-4 font-sans">
                <div>
                  <label className="block text-[11px] font-mono text-app-muted mb-1.5">Название заведения *</label>
                  <input
                    type="text"
                    value={newShopData.name}
                    onChange={e => {
                      const val = e.target.value;
                      setNewShopData(p => ({
                        ...p,
                        name: val,
                        slug: isSlugCustomized ? p.slug : transliterateToSlug(val)
                      }));
                    }}
                    placeholder="Например: Кофейня на Невском"
                    className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                  />
                  {createShopFieldErrors.name && <p className="text-[11px] text-rose-400 mt-1 font-mono">{createShopFieldErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                    URL-адрес (Slug) *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs text-app-muted font-mono select-none">/</span>
                    <input
                      type="text"
                      value={newShopData.slug}
                      onChange={e => {
                        const val = e.target.value;
                        const cleanVal = transliterateToSlug(val);
                        setIsSlugCustomized(cleanVal.length > 0);
                        setNewShopData(p => ({ ...p, slug: cleanVal }));
                      }}
                      placeholder="coffee-bar"
                      className="w-full bg-app-card border border-app-border rounded-xl pl-7 pr-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                    />
                  </div>
                  {createShopFieldErrors.slug && <p className="text-[11px] text-rose-400 mt-1 font-mono">{createShopFieldErrors.slug}</p>}
                  {newShopData.slug && (
                    <p className="text-[11px] text-app-muted mt-1 font-mono">
                      Ссылка на витрину: <span className="text-emerald-400 font-bold">/{cleanSlugForSubmit(newShopData.slug)}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                    Описание заведения
                  </label>
                  <textarea
                    rows={3}
                    value={newShopData.description}
                    onChange={e => setNewShopData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Описание заведения, особенности и акценты..."
                    className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-app-border flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeSubView}
                    className="px-5 py-2.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button type="submit" className="flex-1 py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 uppercase cursor-pointer shadow-sm">
                    Создать заведение
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === "settings" && !loading && selectedShop && (
            <AdminSettingsTab
              selectedShop={selectedShop}
              shops={shops}
              settingsData={settingsData}
              setSettingsData={setSettingsData}
              settingsError={settingsError}
              settingsSuccess={settingsSuccess}
              isSavingSettings={isSavingSettings}
              handleSaveSettings={handleSaveSettings}
              handleDeleteShop={handleDeleteShop}
              handleRegenerateSlug={() => {
                const autoSlug = transliterateToSlug(settingsData.name);
                setSettingsData((s: any) => ({ ...s, slug: autoSlug || s.slug }));
              }}
              setIsQrModalOpen={setIsQrModalOpen}
              requestConfirm={requestConfirm}
              showToast={showToast}
              settingsActiveTab={settingsActiveTab}
              setSettingsActiveTab={setSettingsActiveTab}
              handleClearSettingsFields={handleClearSettingsFields}
              handleTestBotToken={handleTestBotToken}
              handleSetupWebhook={handleSetupWebhook}
              handleSendTestNotification={handleSendTestNotification}
              botTestResult={botTestResult}
              isTestingBot={isTestingBot}
              isSettingWebhook={isSettingWebhook}
              webhookStatus={webhookStatus}
              isSendingTestNotification={isSendingTestNotification}
              onOpenReport={() => setIsReportModalOpen(true)}
            />
          )}

          {/* TAB: SERVICES */}
          {activeTab === "services" && !loading && (
            <AdminServicesTab
              services={filteredServices}
              selectedShop={selectedShop}
              searchQuery={serviceSearchQuery}
              setSearchQuery={setServiceSearchQuery}
              selectedCategory={selectedCategoryFilter}
              setSelectedCategory={setSelectedCategoryFilter}
              isAddingService={isAddingService}
              setIsAddingService={setIsAddingService}
              editingService={editingService}
              setEditingService={setEditingService}
              newServiceData={newServiceData}
              setNewServiceData={setNewServiceData}
              serviceError={serviceError}
              categories={categories}
              handleCreateService={handleAddService}
              handleUpdateService={handleSaveEditService}
              handleDeleteService={handleDeleteService}
              handleDuplicateService={(srv) => {
                let parsedGallery: string[] = [];
                if (srv.gallery) {
                  try {
                    parsedGallery = JSON.parse(srv.gallery);
                  } catch {
                    parsedGallery = srv.gallery.split(",").map(s => s.trim()).filter(Boolean);
                  }
                }
                setNewServiceData({
                  title: `${srv.title} (Копия)`,
                  price: String(srv.price),
                  oldPrice: srv.oldPrice ? String(srv.oldPrice) : "",
                  description: srv.description || "",
                  category: srv.category || "",
                  badge: srv.badge || "",
                  imageUrl: srv.imageUrl || "",
                  gallery: parsedGallery,
                  tags: srv.tags || "",
                  prepTime: srv.prepTime || "",
                  weight: srv.weight || "",
                  fulfillment: srv.fulfillment || "courier,pickup",
                  isAvailable: srv.isAvailable !== false
                });
                setIsAddingService(true);
              }}
              handleToggleAvailability={handleToggleServiceAvailability}
            />
          )}

          {/* TAB: ORDERS */}
          {activeTab === "orders" && (
            <AdminOrdersTab
              orders={filteredOrders}
              selectedShop={selectedShop}
              orderFilter={orderStatusFilter}
              setOrderFilter={setOrderStatusFilter}
              orderSearchQuery={orderSearchQuery}
              setOrderSearchQuery={setOrderSearchQuery}
              orderTypeFilter={orderTypeFilter}
              setOrderTypeFilter={setOrderTypeFilter}
              ordersLoading={ordersLoading}
              handleStatusChange={handleUpdateOrderStatus}
              fetchOrders={() => selectedShop && fetchOrders(selectedShop.id, true)}
            />
          )}

          {/* TAB: PROMOCODES */}
          {activeTab === "promocodes" && (
            <AdminPromocodesTab
              promocodes={promocodes}
              handleDeletePromocode={handleDeletePromocode}
              isCreatingPromo={isCreatingPromo}
              setIsCreatingPromo={setIsCreatingPromo}
              promoError={promoError}
              newPromoData={newPromoData}
              setNewPromoData={setNewPromoData}
              handleCreatePromocode={handleCreatePromocode}
            />
          )}

          {/* TAB: REVIEWS */}
          {activeTab === "reviews" && (
            <AdminReviewsTab
              computedAvgRating={computedAvgRating}
              totalReviewsCount={totalReviewsCount}
              positivePercentage={positivePercentage}
              unrepliedCount={unrepliedCount}
              repliedCount={repliedCount}
              starCounts={starCounts}
              reviewStarFilter={reviewStarFilter}
              setReviewStarFilter={setReviewStarFilter}
              reviewReplyFilter={reviewReplyFilter}
              setReviewReplyFilter={setReviewReplyFilter}
              reviewSearchQuery={reviewSearchQuery}
              setReviewSearchQuery={setReviewSearchQuery}
              reviewSortOrder={reviewSortOrder}
              setReviewSortOrder={setReviewSortOrder}
              isSortDropdownOpen={isSortDropdownOpen}
              setIsSortDropdownOpen={setIsSortDropdownOpen}
              sortDropdownRef={sortDropdownRef}
              reviewsLoading={reviewsLoading}
              filteredReviews={filteredReviews}
              reviews={reviews}
              deletingReviewId={deletingReviewId}
              replyingReviewId={replyingReviewId}
              setReplyingReviewId={setReplyingReviewId}
              replyText={replyText}
              setReplyText={setReplyText}
              handleDeleteReview={handleDeleteReview}
              handleReplyReview={handleReplyReview}
            />
          )}

          {/* TAB: BANNERS */}
          {activeTab === "banners" && (
            <AdminBannersTab
              banners={banners}
              handleDeleteBanner={handleDeleteBanner}
              isCreatingBanner={isCreatingBanner}
              setIsCreatingBanner={setIsCreatingBanner}
              bannerError={bannerError}
              newBannerData={newBannerData}
              setNewBannerData={setNewBannerData}
              handleCreateBanner={handleCreateBanner}
            />
          )}

          {/* TAB: BROADCASTS */}
          {activeTab === "broadcasts" && selectedShop && (
            <AdminBroadcastsTab
              selectedShop={selectedShop}
              broadcasts={broadcasts}
              handleDeleteBroadcast={handleDeleteBroadcast}
              isCreatingBroadcast={isCreatingBroadcast}
              setIsCreatingBroadcast={setIsCreatingBroadcast}
              broadcastError={broadcastError}
              newBroadcastData={newBroadcastData}
              setNewBroadcastData={setNewBroadcastData}
              handleCreateBroadcast={handleCreateBroadcast}
            />
          )}

          {/* TAB: CRM CUSTOMERS */}
          {activeTab === "customers" && (
            <AdminCustomersTab customers={customers} />
          )}

          {/* TAB: ANALYTICS */}
          {activeTab === "analytics" && selectedShop && (
            <AnalyticsTab shopId={selectedShop.id} />
          )}

          {/* TAB: BOT SIMULATOR */}
          {activeTab === "botsim" && selectedShop && (
            <AdminBotSimTab
              selectedShop={selectedShop}
              botSimMessages={botSimMessages}
              botSimInput={botSimInput}
              setBotSimInput={setBotSimInput}
              handleSendBotSimMessage={handleSendBotSimMessage}
            />
          )}

          {/* TAB: TEAM & ACCESS */}
          {activeTab === "team" && selectedShop && (
            <AdminTeamTab
              selectedShop={selectedShop}
              user={user}
              teamMembers={teamMembers}
              teamInvites={teamInvites}
              isInviteModalOpen={isInviteModalOpen}
              setIsInviteModalOpen={setIsInviteModalOpen}
              createdInviteUrl={createdInviteUrl}
              setCreatedInviteUrl={setCreatedInviteUrl}
              inviteRole={inviteRole}
              setInviteRole={setInviteRole}
              inviteMaxUses={inviteMaxUses}
              setInviteMaxUses={setInviteMaxUses}
              handleCreateInvite={handleCreateInvite}
              handleRevokeInvite={handleRevokeInvite}
              handleRemoveMember={handleRemoveMember}
              requestConfirm={requestConfirm}
              showToast={showToast}
            />
          )}
        </div>
      </main>

      {/* Auth Modal */}
      <AdminAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthError(null);
          setAuthSuccessMsg(null);
        }}
        authMode={authMode}
        setAuthMode={setAuthMode}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authName={authName}
        setAuthName={setAuthName}
        authOtpCode={authOtpCode}
        setAuthOtpCode={setAuthOtpCode}
        authDevCode={authDevCode}
        otpStep={otpStep}
        setOtpStep={setOtpStep}
        resendTimer={resendTimer}
        authError={authError}
        setAuthError={setAuthError}
        authSuccessMsg={authSuccessMsg}
        setAuthSuccessMsg={setAuthSuccessMsg}
        isSubmittingAuth={isSubmittingAuth}
        handleAuthSubmit={handleAuthSubmit}
        handleSendOtpCode={handleSendOtpCode}
        handleVerifyOtpCode={handleVerifyOtpCode}
      />


      {/* Hotkeys Helper Modal */}
      <AnimatePresence>
        {isHotkeysModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="max-w-xl w-full bg-app-surface border border-app-border rounded-3xl p-6 text-app-primary shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-app-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-app-accent/10 text-app-accent flex items-center justify-center border border-app-accent/20">
                    <Keyboard size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-mono tracking-tight text-app-primary">
                      Горячие клавиши (Hotkeys)
                    </h3>
                    <p className="text-xs text-app-muted font-sans">
                      Быстрое управление панелью администратора с клавиатуры
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHotkeysModalOpen(false)}
                  className="p-1.5 text-app-muted hover:text-app-primary hover:bg-app-card rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5 text-xs">
                {/* Section 1: Navigation */}
                <div>
                  <h4 className="text-[11px] font-bold font-mono text-app-muted uppercase tracking-wider mb-2.5">
                    Быстрый переход по разделам
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Меню и услуги</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">Alt + 1</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Заказы</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">Alt + 2</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Промокоды</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">Alt + 3</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Отзывы</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">Alt + 4</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Баннеры</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">Alt + 5</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Рассылки</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">Alt + 6</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Клиенты CRM</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">Alt + 7</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Аналитика</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">Alt + 8</kbd>
                    </div>
                  </div>
                </div>

                {/* Section 2: Global Controls */}
                <div>
                  <h4 className="text-[11px] font-bold font-mono text-app-muted uppercase tracking-wider mb-2.5">
                    Глобальное управление
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Показать / скрыть эту справку</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">?</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Быстрый поиск</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">⌘ K</kbd>
                        <span className="text-app-muted font-mono text-[10px]">или</span>
                        <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">/</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Закрыть окно / Назад</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">Esc</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Показать / скрыть меню (Sidebar)</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">⌘ B</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Настройки заведения</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">Alt + S</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Профиль администратора</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">Alt + P</kbd>
                    </div>
                  </div>
                </div>

                {/* Section 3: Orders Tab */}
                <div>
                  <h4 className="text-[11px] font-bold font-mono text-app-muted uppercase tracking-wider mb-2.5">
                    Работа с заказами (Вкладка «Заказы»)
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Фильтр по статусу (Все/Новые/В работе/Выполнен/Отменен)</span>
                      <div className="flex gap-1 font-mono text-[10px]">
                        <kbd className="px-1.5 py-0.5 bg-app-surface border border-app-border rounded text-app-primary font-bold">1</kbd>
                        <kbd className="px-1.5 py-0.5 bg-app-surface border border-app-border rounded text-app-primary font-bold">2</kbd>
                        <kbd className="px-1.5 py-0.5 bg-app-surface border border-app-border rounded text-app-primary font-bold">3</kbd>
                        <kbd className="px-1.5 py-0.5 bg-app-surface border border-app-border rounded text-app-primary font-bold">4</kbd>
                        <kbd className="px-1.5 py-0.5 bg-app-surface border border-app-border rounded text-app-primary font-bold">5</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Принять новый заказ в работу</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-primary font-bold">A</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Завершить заказ в работе</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-primary font-bold">C</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Экспорт всех заказов в CSV</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-primary font-bold">E</kbd>
                    </div>
                  </div>
                </div>

                {/* Section 4: Quick Create */}
                <div>
                  <h4 className="text-[11px] font-bold font-mono text-app-muted uppercase tracking-wider mb-2.5">
                    Быстрое создание
                  </h4>
                  <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                    <span className="text-app-primary font-medium">Создать услугу / промокод / баннер / рассылку</span>
                    <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-app-accent font-bold">N</kbd>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-app-border flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsHotkeysModalOpen(false)}
                  className="px-5 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-primary text-xs font-mono font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Понятно (Esc)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* Bug Report & Feedback Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        shopId={selectedShop?.id}
        shopName={selectedShop?.name}
        sourceContext="admin_panel"
      />

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
                <p className="text-xs text-app-muted leading-relaxed font-sans">
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
