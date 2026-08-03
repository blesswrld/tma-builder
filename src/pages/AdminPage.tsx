import React, { useEffect, useState, FormEvent, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
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
  UserPlus, CheckCircle, Key, Loader2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useRealtime, useRealtimeEvent } from "../context/RealtimeContext";
import { useTheme } from "../context/ThemeContext";
import QrGeneratorModal from "../components/QrGeneratorModal";
import PlanModal from "../components/PlanModal";
import AnalyticsTab from "../components/AnalyticsTab";
import { AdminPageSkeleton, ReviewSkeletonList, SpinnerLoader, Skeleton } from "../components/Skeleton";
import ImageUploader from "../components/ImageUploader";
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
  const { user, token, isLoading: authLoading, login, register, logout, sendCode, verifyCode, resetPassword, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

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
      setShops(prev => (prev || []).map(s => s.id === selectedShop?.id ? {
        ...s,
        services: [event.payload, ...(s.services || []).filter(srv => srv.id !== event.payload.id)]
      } : s));
      setSelectedShop(prev => prev ? {
        ...prev,
        services: [event.payload, ...(prev.services || []).filter(srv => srv.id !== event.payload.id)]
      } : prev);
    }
  });

  useRealtimeEvent("SERVICE_UPDATED", (event) => {
    if (event.payload && event.shopId === selectedShop?.id) {
      setShops(prev => (prev || []).map(s => s.id === selectedShop?.id ? {
        ...s,
        services: (s.services || []).map(srv => srv.id === event.payload.id ? { ...srv, ...event.payload } : srv)
      } : s));
      setSelectedShop(prev => prev ? {
        ...prev,
        services: (prev.services || []).map(srv => srv.id === event.payload.id ? { ...srv, ...event.payload } : srv)
      } : prev);
    }
  });

  useRealtimeEvent("SERVICE_DELETED", (event) => {
    if (event.payload?.id && event.shopId === selectedShop?.id) {
      setShops(prev => (prev || []).map(s => s.id === selectedShop?.id ? {
        ...s,
        services: (s.services || []).filter(srv => srv.id !== event.payload.id)
      } : s));
      setSelectedShop(prev => prev ? {
        ...prev,
        services: (prev.services || []).filter(srv => srv.id !== event.payload.id)
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

  useRealtimeEvent("REVIEW_DELETED", (event) => {
    if (event.payload && event.shopId === selectedShop?.id) {
      setReviews(prev => prev.filter(r => r.id !== event.payload.id));
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

  useRealtimeEvent("SHOP_CREATED", (event) => {
    if (event.payload?.id) {
      fetchShops();
    }
  });

  useRealtimeEvent("SHOP_DELETED", (event) => {
    if (event.payload?.id) {
      setShops(prev => prev.filter(s => s.id !== event.payload.id));
      if (selectedShop?.id === event.payload.id) {
        setSelectedShop(null);
      }
    }
  });

  useRealtimeEvent("TEAM_MEMBER_ADDED", (event) => {
    if (selectedShop?.id && event.shopId === selectedShop.id) {
      fetchTeam(selectedShop.id);
    }
  });

  useRealtimeEvent("TEAM_MEMBER_REMOVED", (event) => {
    if (selectedShop?.id && event.shopId === selectedShop.id) {
      fetchTeam(selectedShop.id);
    }
  });

  useRealtimeEvent("INVITE_CREATED", (event) => {
    if (selectedShop?.id && event.shopId === selectedShop.id) {
      fetchTeam(selectedShop.id);
    }
  });

  useRealtimeEvent("INVITE_REVOKED", (event) => {
    if (selectedShop?.id && event.shopId === selectedShop.id) {
      fetchTeam(selectedShop.id);
    }
  });

  useRealtimeEvent("CUSTOMER_DELETED", (event) => {
    if (event.payload?.id && event.shopId === selectedShop?.id) {
      setCustomers(prev => prev.filter(c => c.id !== event.payload.id));
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
    isAvailable: true
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
    isAvailable: true
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

  const fetchTeam = async (shopId: string) => {
    if (!token) return;
    setTeamLoading(true);
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
      setTeamLoading(false);
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

      setSelectedShop(prev => {
        if (prev) {
          const updated = data.find((s: Shop) => s.id === prev.id);
          if (updated) return updated;
        }
        return data.length > 0 ? data[0] : null;
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
          isAvailable: newServiceData.isAvailable
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
        isAvailable: true
      });
      setIsAddingService(false);
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
        parsedGallery = JSON.parse(service.gallery);
      } catch {
        parsedGallery = service.gallery.split(",").map(s => s.trim()).filter(Boolean);
      }
    }

    setEditServiceData({
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
      isAvailable: service.isAvailable !== false
    });
    setEditServiceError(null);
    setIsProfileOpen(false);
    setIsSettingsOpen(false);
    setIsCreatingShop(false);
    setIsAddingService(false);
    setEditingService(service);
    setActiveTab("editservice");
  };

  const handleSaveEditService = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    const titleRes = validateItemTitle(editServiceData.title);
    if (!titleRes.isValid) {
      setEditServiceError(titleRes.error || "Укажите название");
      return;
    }

    const priceRes = validatePrice(editServiceData.price);
    if (!priceRes.isValid) {
      setEditServiceError(priceRes.error || "Укажите цену");
      return;
    }

    setIsSavingEditService(true);
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
          oldPrice: editServiceData.oldPrice ? Number(editServiceData.oldPrice) : undefined,
          description: editServiceData.description.trim() || undefined,
          category: editServiceData.category.trim() || undefined,
          imageUrl: editServiceData.imageUrl.trim() || undefined,
          gallery: (editServiceData.gallery || []).length > 0 ? JSON.stringify(editServiceData.gallery) : undefined,
          badge: editServiceData.badge.trim() || undefined,
          tags: editServiceData.tags.trim() || undefined,
          prepTime: editServiceData.prepTime.trim() || undefined,
          weight: editServiceData.weight.trim() || undefined,
          isAvailable: editServiceData.isAvailable
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
      showToast("Услуга успешно обновлена", "success");
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

  const fetchReviews = async () => {
    if (!selectedShop) return;
    setReviewsLoading(true);
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
      if (e instanceof TypeError || (e?.message && e.message.includes("Failed to fetch"))) {
        console.warn("Failed to fetch reviews (network offline):", e.message);
      } else {
        console.error(e);
      }
    } finally {
      setReviewsLoading(false);
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

    let parsedDelivery = { pickup: true, courier: true, shipping: false, minOrder: "0", deliveryFee: "0" };
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
        showToast("На вкладке «Команда» нет дополнительных полей для очистки", "info");
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

      setIsSettingsOpen(false);
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

  const filteredOrders = orders.filter(o => orderStatusFilter === "ALL" || o.status === orderStatusFilter);

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
                v2.4
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
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
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
              { id: "profile", label: "Профиль администратора", icon: User }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === "profile") {
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
                    <Icon size={15} className={isActive ? "text-app-accent-fg" : "text-app-muted"} />
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
                    className="p-1.5 text-app-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer" 
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
                  setNewServiceData({ title: "", price: "", category: "", imageUrl: "", description: "", badge: "", prepTime: "", weight: "", tags: "", isAvailable: true, oldPrice: "" });
                  setServiceError(null);
                  setServiceFieldErrors({});
                  setIsAddingService(true);
                  setActiveTab("addservice");
                }}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus size={14} /> <span>Добавить услугу</span>
              </button>
            )}

            {activeTab === "orders" && (
              <button
                onClick={exportOrdersToCsv}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={14} /> <span>Экспорт CSV</span>
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
          {loading && <AdminPageSkeleton />}

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
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-xs font-mono rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          {isSendingProfileCode && <SpinnerLoader size={12} />}
                          <Send size={12} />
                          <span>{isSendingProfileCode ? "Отправка..." : "Запросить код на E-mail"}</span>
                        </button>
                      </div>

                      {profileCodeSentMsg && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-mono flex items-center gap-2">
                          <Check size={14} className="shrink-0" />
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
                    className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} />
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

          {/* PAGE VIEW: SETTINGS */}
          {activeTab === "settings" && !loading && selectedShop && (
            <div className="max-w-4xl mx-auto bg-app-surface border border-app-border rounded-3xl p-6 sm:p-8 text-app-primary space-y-6 shadow-sm">
              <div className="border-b border-app-border pb-5">
                <h3 className="text-base font-bold font-mono flex items-center gap-2 text-app-primary">
                  <Settings size={18} />
                  Настройки заведения: {selectedShop.name}
                </h3>
                <p className="text-xs text-app-muted mt-0.5 font-sans">Управление параметрами, брендингом и Telegram интеграциями</p>
              </div>

              {settingsError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs flex items-center gap-2.5 font-mono">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{settingsError}</span>
                </div>
              )}

              {/* Navigation Tabs for Settings */}
              <div className="flex gap-2 border-b border-app-border pb-3 overflow-x-auto scrollbar-none font-mono text-xs">
                {[
                  { id: "general", label: "Основное", icon: Store },
                  { id: "branding", label: "Брендинг", icon: ImageIcon },
                  { id: "integrations", label: "Telegram", icon: Send },
                  { id: "delivery", label: "Доставка и Соцсети", icon: Globe },
                  { id: "team", label: "Команда и доступ", icon: UserPlus }
                ].map(t => {
                  const Icon = t.icon;
                  const isActive = settingsActiveTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSettingsActiveTab(t.id as any)}
                      className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                        isActive
                          ? "bg-app-accent text-app-accent-fg font-bold shadow-sm"
                          : "bg-app-card hover:bg-app-hover text-app-muted hover:text-app-primary border border-app-border"
                      }`}
                    >
                      <Icon size={14} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6 font-sans text-xs">
                {/* TAB GENERAL */}
                {settingsActiveTab === "general" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                          Название заведения *
                        </label>
                        <input
                          type="text"
                          value={settingsData.name}
                          onChange={e => setSettingsData(p => ({ ...p, name: e.target.value }))}
                          placeholder="Название *"
                          className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                          Slug витрины (URL) *
                        </label>
                        <input
                          type="text"
                          value={settingsData.slug}
                          onChange={e => setSettingsData(p => ({ ...p, slug: transliterateToSlug(e.target.value) }))}
                          placeholder="slug"
                          className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                        Описание заведения
                      </label>
                      <textarea
                        rows={3}
                        value={settingsData.description}
                        onChange={e => setSettingsData(p => ({ ...p, description: e.target.value }))}
                        placeholder="Краткое описание витрины..."
                        className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                          Адрес заведения
                        </label>
                        <input
                          type="text"
                          value={settingsData.address}
                          onChange={e => setSettingsData(p => ({ ...p, address: e.target.value }))}
                          placeholder="ул. Пушкина, д. 10"
                          className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                          Контактный телефон
                        </label>
                        <input
                          type="text"
                          value={settingsData.phone}
                          onChange={e => setSettingsData(p => ({ ...p, phone: e.target.value }))}
                          placeholder="+7 (999) 000-00-00"
                          className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                          График работы
                        </label>
                        <input
                          type="text"
                          value={settingsData.workingHours}
                          onChange={e => setSettingsData(p => ({ ...p, workingHours: e.target.value }))}
                          placeholder="Пн-Вс: 08:00 - 22:00"
                          className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                          Процент кэшбэка бонусных баллов (%)
                        </label>
                        <input
                          type="number"
                          value={settingsData.cashbackPercent}
                          onChange={e => setSettingsData(p => ({ ...p, cashbackPercent: Number(e.target.value) }))}
                          placeholder="5"
                          className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-app-card/60 border border-app-border rounded-2xl">
                      <input
                        type="checkbox"
                        id="shopIsOpen"
                        checked={settingsData.isOpen}
                        onChange={e => setSettingsData(p => ({ ...p, isOpen: e.target.checked }))}
                        className="rounded bg-app-card border-app-border text-app-primary cursor-pointer w-4 h-4"
                      />
                      <label htmlFor="shopIsOpen" className="text-xs font-mono text-app-primary cursor-pointer font-semibold">
                        Заведение открыто для заказов
                      </label>
                    </div>
                  </div>
                )}

                {/* TAB BRANDING */}
                {settingsActiveTab === "branding" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono font-semibold text-app-secondary mb-2">Логотип заведения</label>
                      <ImageUploader
                        value={settingsData.logoUrl}
                        onChange={(url) => setSettingsData(p => ({ ...p, logoUrl: url }))}
                        type="photo"
                        label="Загрузить логотип заведения"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-semibold text-app-secondary mb-2">Обложка / Баннер шапки</label>
                      <ImageUploader
                        value={settingsData.bannerUrl}
                        onChange={(url) => setSettingsData(p => ({ ...p, bannerUrl: url }))}
                        type="banner"
                        label="Загрузить баннер витрины"
                      />
                    </div>
                  </div>
                )}

                {/* TAB TELEGRAM INTEGRATIONS */}
                {settingsActiveTab === "integrations" && (
                  <div className="space-y-6">
                    {/* Header / Intro banner */}
                    <div className="p-4 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-sky-500/20 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2.5 text-sky-400 font-bold font-mono text-xs">
                        <Send size={16} />
                        <span>Telegram Mini App & Бот Уведомлений</span>
                      </div>
                      <p className="text-xs text-app-secondary leading-relaxed">
                        Подключите собственного Telegram-бота от <code className="bg-app-card px-1.5 py-0.5 rounded text-sky-400">@BotFather</code>. 
                        Ваши клиенты смогут открывать ваш магазин прямо из чата Telegram, а все заказы и отзывы будут поступать вам в личные сообщения!
                      </p>
                    </div>

                    {/* Bot Token Configuration */}
                    <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs font-mono text-app-primary flex items-center gap-2">
                          <Key size={14} className="text-amber-400" />
                          <span>1. Токен Telegram-бота</span>
                        </h4>
                        {botTestResult?.botInfo && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1.5">
                            <CheckCircle2 size={12} />
                            @{botTestResult.botInfo.username}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[11px] font-mono text-app-muted">
                          Bot API Token (полученный в @BotFather)
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={settingsData.botToken}
                            onChange={e => {
                              setSettingsData(p => ({ ...p, botToken: e.target.value }));
                              setBotTestResult(null);
                            }}
                            placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                            className="flex-1 bg-app-bg border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleTestBotToken}
                            disabled={!settingsData.botToken || isTestingBot}
                            className="px-4 py-2.5 bg-app-hover hover:bg-app-border text-app-primary border border-app-border rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                          >
                            {isTestingBot ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                            <span>Проверить бота</span>
                          </button>
                        </div>

                        {botTestResult?.error && (
                          <p className="text-[11px] text-rose-400 font-mono mt-1 flex items-center gap-1">
                            <AlertCircle size={12} /> {botTestResult.error}
                          </p>
                        )}

                        {botTestResult?.botInfo && (
                          <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-xs space-y-1">
                            <div className="text-emerald-400 font-bold flex items-center gap-2">
                              <span>Имя бота:</span> <span className="text-app-primary font-normal">{botTestResult.botInfo.first_name}</span>
                            </div>
                            <div className="text-emerald-400 font-bold flex items-center gap-2">
                              <span>Username:</span> <a href={`https://t.me/${botTestResult.botInfo.username}`} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline font-mono">@{botTestResult.botInfo.username}</a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin Chat ID & Webhook Integration */}
                    <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs font-mono text-app-primary flex items-center gap-2">
                          <MessageSquare size={14} className="text-sky-400" />
                          <span>2. Chat ID для уведомлений администратору</span>
                        </h4>
                        {settingsData.adminChatId ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                            Chat ID: {settingsData.adminChatId}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
                            Не подключен
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-mono text-app-muted mb-1.5">
                            Telegram Chat ID владельца (или зажмите /start в боте)
                          </label>
                          <input
                            type="text"
                            value={settingsData.adminChatId}
                            onChange={e => setSettingsData(p => ({ ...p, adminChatId: e.target.value }))}
                            placeholder="123456789 или отправьте /start боту"
                            className="w-full bg-app-bg border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handleSetupWebhook}
                            disabled={!settingsData.botToken || isSettingWebhook}
                            className="px-4 py-2.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSettingWebhook ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            <span>Активировать Webhook</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleSendTestNotification}
                            disabled={!settingsData.botToken || !settingsData.adminChatId || isSendingTestNotification}
                            className="px-4 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSendingTestNotification ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            <span>Тестовое уведомление</span>
                          </button>
                        </div>

                        {webhookStatus && (
                          <p className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                            <CheckCircle2 size={13} className="shrink-0" />
                            <span>{webhookStatus}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Guide for BotFather */}
                    <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-4 font-sans">
                      <h4 className="font-bold text-xs font-mono text-app-primary flex items-center gap-2">
                        <Smartphone size={14} className="text-purple-400" />
                        <span>Инструкция: Пошаговая настройка в @BotFather</span>
                      </h4>

                      <div className="space-y-3 text-xs text-app-secondary">
                        <div className="p-3 bg-app-bg border border-app-border rounded-xl space-y-1.5">
                          <div className="font-bold text-app-primary font-mono text-[11px] flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px]">1</span>
                            <span>Получите токен бота:</span>
                          </div>
                          <p className="pl-7 text-app-muted">
                            Откройте <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline font-medium">@BotFather</a> в Telegram, отправьте <code className="bg-app-card px-1.5 py-0.5 rounded text-sky-300">/newbot</code>, задайте имя и юзернейм. Скопируйте полученный API Token и вставьте выше.
                          </p>
                        </div>

                        <div className="p-3 bg-app-bg border border-app-border rounded-xl space-y-1.5">
                          <div className="font-bold text-app-primary font-mono text-[11px] flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px]">2</span>
                            <span>Укажите ссылку на Mini App (кнопка Меню):</span>
                          </div>
                          <p className="pl-7 text-app-muted mb-2">
                            В <code className="bg-app-card px-1.5 py-0.5 rounded text-sky-300">@BotFather</code> отправьте <code className="bg-app-card px-1.5 py-0.5 rounded text-sky-300">/mybots</code> → Выберите бота → <b>Bot Settings</b> → <b>Menu Button</b> → <b>Configure menu button</b> и вставьте URL витрины:
                          </p>
                          <div className="pl-7 flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={`${window.location.origin}/${selectedShop?.slug}`}
                              className="flex-1 bg-app-card border border-app-border rounded-lg px-2.5 py-1.5 text-[11px] text-sky-400 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/${selectedShop?.slug}`);
                                showToast("Ссылка скопирована в буфер обмена!", "success");
                              }}
                              className="px-3 py-1.5 bg-app-hover hover:bg-app-border text-app-primary border border-app-border rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Copy size={12} />
                              <span>Копировать</span>
                            </button>
                          </div>
                        </div>

                        <div className="p-3 bg-app-bg border border-app-border rounded-xl space-y-1.5">
                          <div className="font-bold text-app-primary font-mono text-[11px] flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px]">3</span>
                            <span>Авто-привязка Chat ID:</span>
                          </div>
                          <p className="pl-7 text-app-muted">
                            После ввода токена нажмите <b>«Активировать Webhook»</b> и перейдите в диалог с ботом. Нажмите команду <code className="bg-app-card px-1.5 py-0.5 rounded text-sky-300">/start</code> — бот пришлет подтверждение и автоматически сохранит ваш Chat ID!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB DELIVERY & SOCIALS */}
                {settingsActiveTab === "delivery" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-mono text-app-muted mb-1.5">Telegram канал / чат</label>
                        <input
                          type="text"
                          value={settingsData.socialLinks.telegram}
                          onChange={e => setSettingsData(p => ({ ...p, socialLinks: { ...p.socialLinks, telegram: e.target.value } }))}
                          placeholder="https://t.me/yourchannel"
                          className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-app-muted mb-1.5">Instagram</label>
                        <input
                          type="text"
                          value={settingsData.socialLinks.instagram}
                          onChange={e => setSettingsData(p => ({ ...p, socialLinks: { ...p.socialLinks, instagram: e.target.value } }))}
                          placeholder="https://instagram.com/..."
                          className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-app-muted mb-1.5">Инструкция по оплате заказа</label>
                      <textarea
                        rows={3}
                        value={settingsData.paymentInstructions}
                        onChange={e => setSettingsData(p => ({ ...p, paymentInstructions: e.target.value }))}
                        placeholder="Реквизиты для перевода или информация для покупателей..."
                        className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* TAB TEAM & ACCESS */}
                {settingsActiveTab === "team" && (
                  <div className="space-y-6 font-sans">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-app-card border border-app-border rounded-2xl">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm font-mono text-app-primary flex items-center gap-2">
                          <UserPlus size={16} className="text-emerald-400" />
                          Приглашение сотрудников
                        </h4>
                        <p className="text-xs text-app-muted">
                          Создайте ссылку-приглашение для коллег, чтобы дать им доступ к заведению.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsInviteModalOpen(true);
                          setCreatedInviteUrl(null);
                        }}
                        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-mono font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
                      >
                        <UserPlus size={14} />
                        <span>Пригласить сотрудника</span>
                      </button>
                    </div>

                    {/* Members List */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs font-mono text-app-muted uppercase tracking-wider">
                        Состав команды ({(teamMembers || []).length + (selectedShop?.owner ? 1 : 0)})
                      </h4>

                      <div className="grid grid-cols-1 gap-2.5">
                        {/* Owner item */}
                        {selectedShop?.owner && (
                          <div className="p-3.5 bg-app-card border border-app-border rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                                👑
                              </div>
                              <div>
                                <div className="font-bold text-xs text-app-primary flex items-center gap-2">
                                  <span>{selectedShop.owner.name || selectedShop.owner.email}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                    Владелец
                                  </span>
                                </div>
                                <p className="text-[11px] text-app-muted font-mono">{selectedShop.owner.email}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Members */}
                        {(teamMembers || []).map(m => (
                          <div key={m.id} className="p-3.5 bg-app-card border border-app-border rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm font-mono">
                                <User size={16} />
                              </div>
                              <div>
                                <div className="font-bold text-xs text-app-primary flex items-center gap-2">
                                  <span>{m.name || m.email}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                                    {m.role === "MANAGER" ? "Менеджер" : "Сотрудник"}
                                  </span>
                                </div>
                                <p className="text-[11px] text-app-muted font-mono">{m.email}</p>
                              </div>
                            </div>

                            {user && selectedShop?.ownerId === user.id && (
                              <button
                                type="button"
                                onClick={() => requestConfirm("Исключить сотрудника", `Удалить ${m.name || m.email} из команды заведения?`, () => handleRemoveMember(m.userId))}
                                className="p-2 text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl transition-all cursor-pointer"
                                title="Исключить из команды"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Active Invites List */}
                    <div className="space-y-3 pt-4 border-t border-app-border">
                      <h4 className="font-bold text-xs font-mono text-app-muted uppercase tracking-wider">
                        Активные ссылки и коды приглашений ({(teamInvites || []).length})
                      </h4>

                      {(teamInvites || []).length === 0 ? (
                        <p className="text-xs text-app-muted italic font-mono bg-app-card p-4 rounded-2xl border border-app-border text-center">
                          Нет активных ссылок приглашений. Нажмите «Пригласить сотрудника», чтобы сгенерировать ссылку.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {(teamInvites || []).map(inv => (
                            <div key={inv.id} className="p-3.5 bg-app-card border border-app-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs text-emerald-400 px-2.5 py-0.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                    {inv.code}
                                  </span>
                                  <span className="text-[11px] text-app-muted font-mono">
                                    Использовано: {inv.usedCount} из {inv.maxUses}
                                  </span>
                                </div>
                                <p className="text-[11px] font-mono text-app-muted truncate max-w-md">
                                  {inv.inviteUrl}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(inv.inviteUrl);
                                    showToast("Ссылка-приглашение скопирована в буфер!", "success");
                                  }}
                                  className="px-3 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-primary flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Copy size={13} />
                                  <span>Скопировать</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRevokeInvite(inv.code)}
                                  className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                                  title="Отозвать приглашение"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-app-border flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleClearSettingsFields}
                    className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} />
                    <span>Очистить доп. поля</span>
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
                    disabled={isSavingSettings}
                    className="flex-1 py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-opacity uppercase flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isSavingSettings && <SpinnerLoader size={14} />}
                    {isSavingSettings ? "Сохранение..." : "Сохранить настройки"}
                  </button>
                </div>

                <div className="pt-4 border-t border-rose-500/20 mt-4 space-y-2">
                  <label className="block text-[11px] font-mono text-rose-400 uppercase tracking-wider font-semibold">
                    Опасная зона
                  </label>
                  <p className="text-[11px] text-app-muted leading-relaxed">
                    Удаление заведения приведёт к каскадному удалению всех его услуг, истории заказов, отзывов и баннеров.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedShop) handleDeleteShop(selectedShop);
                    }}
                    className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-mono font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Удалить заведение
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PAGE VIEW: ADD SERVICE */}
          {activeTab === "addservice" && !loading && selectedShop && (
            <div className="max-w-3xl mx-auto bg-app-surface border border-app-border rounded-3xl p-6 sm:p-8 text-app-primary space-y-6 shadow-sm">
              <div className="border-b border-app-border pb-5">
                <h3 className="text-base font-bold font-mono text-app-primary">Новая услуга / позиция меню</h3>
                <p className="text-xs text-app-muted mt-0.5 font-sans">Добавление позиции в каталог {selectedShop.name}</p>
              </div>

              {serviceError && <p className="text-xs text-rose-400 font-mono p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">{serviceError}</p>}

              <form onSubmit={handleAddService} className="space-y-5 font-sans">
                <div>
                  <label className="block text-[11px] font-mono text-app-muted mb-1.5">Название позиции *</label>
                  <input
                    type="text"
                    value={newServiceData.title}
                    onChange={e => setNewServiceData(p => ({ ...p, title: e.target.value }))}
                    placeholder="Например: Двойной Эспрессо"
                    className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5">Текущая цена ({selectedShop?.currencySymbol || "₽"}) *</label>
                    <input
                      type="number"
                      value={newServiceData.price}
                      onChange={e => setNewServiceData(p => ({ ...p, price: e.target.value }))}
                      placeholder="350"
                      className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5">Старая цена (зачеркнута)</label>
                    <input
                      type="number"
                      value={newServiceData.oldPrice}
                      onChange={e => setNewServiceData(p => ({ ...p, oldPrice: e.target.value }))}
                      placeholder="450"
                      className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-muted focus:outline-none focus:border-app-accent font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5">Категория</label>
                    <input
                      type="text"
                      value={newServiceData.category}
                      onChange={e => setNewServiceData(p => ({ ...p, category: e.target.value }))}
                      placeholder="Кофе, Десерты, Завтраки..."
                      className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5">Плашка (Бейдж)</label>
                    <input
                      type="text"
                      value={newServiceData.badge}
                      onChange={e => setNewServiceData(p => ({ ...p, badge: e.target.value }))}
                      placeholder="🔥 Хит, NEW, -20%"
                      className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5">Время приготовления / сеанса</label>
                    <input
                      type="text"
                      value={newServiceData.prepTime}
                      onChange={e => setNewServiceData(p => ({ ...p, prepTime: e.target.value }))}
                      placeholder="10-15 мин"
                      className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5">Вес / Объём</label>
                    <input
                      type="text"
                      value={newServiceData.weight}
                      onChange={e => setNewServiceData(p => ({ ...p, weight: e.target.value }))}
                      placeholder="250 мл / 300 г"
                      className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-app-muted mb-1.5">Описание позиции</label>
                  <textarea
                    rows={3}
                    value={newServiceData.description}
                    onChange={e => setNewServiceData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Состав, особенности приготовления или детали услуги..."
                    className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-app-secondary mb-2">Главное фото товара</label>
                  <ImageUploader
                    value={newServiceData.imageUrl}
                    onChange={(url) => setNewServiceData(p => ({ ...p, imageUrl: url }))}
                    type="product"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-app-muted mb-1.5">Теги (через запятую)</label>
                  <input
                    type="text"
                    value={newServiceData.tags}
                    onChange={e => setNewServiceData(p => ({ ...p, tags: e.target.value }))}
                    placeholder="без сахара, веган, горячий"
                    className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-app-card/60 border border-app-border rounded-2xl">
                  <input
                    type="checkbox"
                    id="newServiceAvailable font-mono font-semibold"
                    checked={newServiceData.isAvailable}
                    onChange={e => setNewServiceData(p => ({ ...p, isAvailable: e.target.checked }))}
                    className="rounded bg-app-card border-app-border text-app-primary cursor-pointer w-4 h-4"
                  />
                  <label htmlFor="newServiceAvailable font-mono font-semibold" className="text-xs font-mono text-app-primary cursor-pointer font-semibold">Позиция доступна для заказа</label>
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
                    Добавить в меню
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PAGE VIEW: EDIT SERVICE */}
          {activeTab === "editservice" && !loading && selectedShop && editingService && (
            <div className="max-w-3xl mx-auto bg-app-surface border border-app-border rounded-3xl p-6 sm:p-8 text-app-primary space-y-6 shadow-sm">
              <div className="border-b border-app-border pb-5">
                <h3 className="text-base font-bold font-mono text-app-primary">Редактирование услуги</h3>
                <p className="text-xs text-app-muted mt-0.5 font-sans">Изменение параметров позиции {editingService?.title}</p>
              </div>

              {editServiceError && <p className="text-xs text-rose-400 font-mono p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">{editServiceError}</p>}

              <form onSubmit={handleSaveEditService} className="space-y-5 font-sans">
                <div>
                  <label className="block text-[11px] font-mono text-app-muted mb-1.5">Название позиции *</label>
                  <input
                    type="text"
                    value={editServiceData.title}
                    onChange={e => setEditServiceData(p => ({ ...p, title: e.target.value }))}
                    placeholder="Название *"
                    className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5">Текущая цена ({selectedShop?.currencySymbol || "₽"}) *</label>
                    <input
                      type="number"
                      value={editServiceData.price}
                      onChange={e => setEditServiceData(p => ({ ...p, price: e.target.value }))}
                      placeholder="350"
                      className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5">Старая цена</label>
                    <input
                      type="number"
                      value={editServiceData.oldPrice}
                      onChange={e => setEditServiceData(p => ({ ...p, oldPrice: e.target.value }))}
                      placeholder="450"
                      className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-muted focus:outline-none focus:border-app-accent font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5">Категория</label>
                    <input
                      type="text"
                      value={editServiceData.category}
                      onChange={e => setEditServiceData(p => ({ ...p, category: e.target.value }))}
                      placeholder="Категория"
                      className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5">Плашка (Бейдж)</label>
                    <input
                      type="text"
                      value={editServiceData.badge}
                      onChange={e => setEditServiceData(p => ({ ...p, badge: e.target.value }))}
                      placeholder="🔥 Хит"
                      className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5">Время приготовления</label>
                    <input
                      type="text"
                      value={editServiceData.prepTime}
                      onChange={e => setEditServiceData(p => ({ ...p, prepTime: e.target.value }))}
                      placeholder="10 мин"
                      className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-app-muted mb-1.5">Вес / Объём</label>
                    <input
                      type="text"
                      value={editServiceData.weight}
                      onChange={e => setEditServiceData(p => ({ ...p, weight: e.target.value }))}
                      placeholder="300 г"
                      className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-app-muted mb-1.5">Описание</label>
                  <textarea
                    rows={3}
                    value={editServiceData.description}
                    onChange={e => setEditServiceData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Описание..."
                    className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-app-secondary mb-2">Главное фото товара</label>
                  <ImageUploader
                    value={editServiceData.imageUrl}
                    onChange={(url) => setEditServiceData(p => ({ ...p, imageUrl: url }))}
                    type="product"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-app-muted mb-1.5">Теги (через запятую)</label>
                  <input
                    type="text"
                    value={editServiceData.tags}
                    onChange={e => setEditServiceData(p => ({ ...p, tags: e.target.value }))}
                    placeholder="тег1, тег2"
                    className="w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent"
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-app-card/60 border border-app-border rounded-2xl">
                  <input
                    type="checkbox"
                    id="editServiceAvailable"
                    checked={editServiceData.isAvailable}
                    onChange={e => setEditServiceData(p => ({ ...p, isAvailable: e.target.checked }))}
                    className="rounded bg-app-card border-app-border text-app-primary cursor-pointer w-4 h-4"
                  />
                  <label htmlFor="editServiceAvailable" className="text-xs font-mono text-app-primary cursor-pointer font-semibold">Позиция доступна для заказа</label>
                </div>

                <div className="pt-4 border-t border-app-border flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeSubView}
                    className="px-5 py-2.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button type="submit" disabled={isSavingEditService} className="flex-1 py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 uppercase flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                    {isSavingEditService && <SpinnerLoader size={14} />}
                    {isSavingEditService ? "Сохранение..." : "Обновить позицию"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {!selectedShop && !loading && !isProfileOpen && activeTab !== "profile" && !isCreatingShop && activeTab !== "createshop" && (
            <div className="py-20 text-center bg-app-surface border border-dashed border-app-border rounded-3xl p-8 space-y-4 max-w-md mx-auto">
              <Store size={36} className="mx-auto text-app-muted" />
              <h3 className="text-base font-semibold text-app-primary">Заведение не создано</h3>
              <p className="text-xs text-app-muted leading-relaxed">
                Создайте свое первое заведение в Telegram Mini App, чтобы начать управлять каталогом, заказами и акциями.
              </p>
              <button
                onClick={handleOpenCreateShop}
                className="px-5 py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-colors uppercase tracking-wider cursor-pointer"
              >
                + Создать заведение
              </button>
            </div>
          )}

          {selectedShop && !["profile", "createshop", "settings", "addservice", "editservice"].includes(activeTab) && (
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

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-app-surface p-2.5 sm:p-3 rounded-2xl border border-app-border">
                    <div className="relative flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none touch-pan-x w-full pr-6">
                        <button
                          onClick={() => setSelectedCategoryFilter("ALL")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                            selectedCategoryFilter === "ALL" 
                              ? "bg-app-accent text-app-accent-fg font-bold shadow-sm" 
                              : "text-app-muted hover:text-app-primary hover:bg-app-card"
                          }`}
                        >
                          ВСЕ
                        </button>
                        {categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategoryFilter(cat)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                              selectedCategoryFilter === cat 
                                ? "bg-app-accent text-app-accent-fg font-bold shadow-sm" 
                                : "text-app-muted hover:text-app-primary hover:bg-app-card"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="absolute right-0 top-0 bottom-1 sm:bottom-0 w-8 bg-gradient-to-l from-app-surface to-transparent pointer-events-none" />
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
                      <input
                        type="search"
                        value={serviceSearchQuery}
                        onChange={e => setServiceSearchQuery(e.target.value)}
                        placeholder="Поиск по меню..."
                        className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-10 py-1.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans search-input"
                      />
                      <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-app-muted border border-app-border bg-app-surface px-1 py-0.5 rounded pointer-events-none hidden sm:inline">⌘K</kbd>
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
                            <div className="h-36 w-full overflow-hidden bg-app-card border-b border-app-border relative">
                              <img
                                src={service.imageUrl}
                                alt={service.title}
                                className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                                referrerPolicy="no-referrer"
                              />
                              {service.category && (
                                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 border border-white/10 text-[9px] font-mono text-white keep-white uppercase tracking-wider backdrop-blur-md">
                                  {service.category}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="p-5 flex-1 flex flex-col justify-between">
                            <div className="space-y-2 mb-4">
                              <div className="flex justify-between items-start gap-2">
                                <h3 className="text-sm font-semibold text-app-primary">{service.title}</h3>
                                <span className="text-xs font-mono font-bold text-app-primary px-2 py-0.5 rounded-md bg-app-card border border-app-border shrink-0">
                                  {service.price} ₽
                                </span>
                              </div>
                              {!service.imageUrl && service.category && (
                                <span className="inline-block px-1.5 py-0.5 rounded-md bg-app-card border border-app-border text-[9px] font-mono text-app-muted uppercase tracking-wider">
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
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                    : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                }`}
                              >
                                {service.isAvailable !== false ? "В наличии" : "Отключено"}
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditService(service)}
                                  className="p-1.5 bg-app-card hover:bg-app-hover border border-app-border rounded-lg text-app-muted hover:text-app-primary transition-colors cursor-pointer"
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
                  <div className="relative">
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-none touch-pan-x bg-app-surface p-2.5 sm:p-3 rounded-2xl border border-app-border w-full pr-10">
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                            orderStatusFilter === statusObj.key ? "bg-app-accent text-app-accent-fg font-bold shadow-sm" : "text-app-muted hover:text-app-primary hover:bg-app-card"
                          }`}
                        >
                          {statusObj.label}
                        </button>
                      ))}
                    </div>
                    <div className="absolute right-1 top-1 bottom-2 w-10 bg-gradient-to-l from-app-surface to-transparent pointer-events-none" />
                  </div>

                  {ordersLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="p-5 rounded-2xl bg-app-surface border border-app-border space-y-3">
                          <div className="flex justify-between items-center">
                            <Skeleton className="h-4 w-28 rounded-md" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                          </div>
                          <Skeleton className="h-4 w-3/4 rounded-md" />
                          <Skeleton className="h-3.5 w-1/2 rounded-md" />
                        </div>
                      ))}
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="py-20 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
                      <ShoppingBag size={28} className="mx-auto text-app-muted mb-2" />
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
                                <span className="text-app-primary font-bold">#{order.id.slice(-6)}</span>
                                <span className="text-app-muted">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {order.tableNumber && (
                                  <span className="px-2 py-0.5 bg-app-card border border-app-border text-app-secondary rounded font-bold">
                                    Столик {order.tableNumber}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto max-w-full pb-0.5 no-scrollbar touch-pan-x shrink-0">
                                {[
                                  { key: "PENDING", label: "Ожидает" },
                                  { key: "CONFIRMED", label: "Принят" },
                                  { key: "COMPLETED", label: "Готов" },
                                  { key: "CANCELLED", label: "Отменен" }
                                ].map(st => (
                                  <button
                                    key={st.key}
                                    onClick={() => handleUpdateOrderStatus(order.id, st.key as any)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                                      order.status === st.key 
                                        ? st.key === 'COMPLETED' ? 'bg-emerald-500 text-black' :
                                          st.key === 'CONFIRMED' ? 'bg-amber-500 text-black' :
                                          st.key === 'CANCELLED' ? 'bg-rose-500 text-white' : 'bg-app-accent text-app-accent-fg'
                                        : 'bg-app-card text-app-muted hover:text-app-primary border border-app-border'
                                    }`}
                                  >
                                    {st.label}
                                  </button>
                                ))}
                                <button onClick={() => handleDeleteOrder(order.id)} className="p-1 text-app-muted hover:text-rose-400 shrink-0 cursor-pointer" title="Удалить заказ">
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
                                <p className="font-semibold text-app-primary">{order.customerName}</p>
                                <p className="font-mono text-app-muted">{order.customerPhone}</p>
                                <div className="pt-2 border-t border-app-border flex justify-between font-mono font-bold text-app-primary text-sm">
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
                      <Tag size={28} className="mx-auto text-app-muted mb-2" />
                      <p className="text-xs text-app-muted font-mono">Нет активных промокодов.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {promocodes.map(promo => (
                        <div key={promo.id} className="p-5 rounded-2xl bg-app-surface border border-app-border flex justify-between items-start">
                          <div className="space-y-2.5">
                            <div>
                              <span className="inline-block px-2.5 py-1 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-lg uppercase shadow-sm">
                                {promo.code}
                              </span>
                            </div>
                            <p className="text-xs text-app-primary font-mono">
                              Скидка: <span className="font-semibold text-app-primary">{promo.discountPercent > 0 ? `${promo.discountPercent}%` : `${promo.discountAmount} ₽`}</span>
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
                  {/* UNIFIED MINIMALIST METRICS BAR */}
                  <div className="p-4 rounded-2xl bg-app-surface border border-app-border grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-app-border shadow-sm">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase text-app-muted block tracking-wider">Средний рейтинг</span>
                      <div className="flex items-baseline gap-1.5 font-mono">
                        <span className="text-2xl font-bold text-app-primary">{computedAvgRating}</span>
                        <span className="text-amber-400 text-sm">★</span>
                        <span className="text-[11px] text-app-muted">({totalReviewsCount})</span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-2 sm:pt-0 sm:pl-4">
                      <span className="text-[10px] font-mono uppercase text-app-muted block tracking-wider">Всего отзывов</span>
                      <span className="text-2xl font-bold font-mono text-app-primary">{totalReviewsCount}</span>
                    </div>

                    <div className="space-y-1 pt-2 sm:pt-0 sm:pl-4">
                      <span className="text-[10px] font-mono uppercase text-app-muted block tracking-wider">Довольные клиенты</span>
                      <span className="text-2xl font-bold font-mono text-emerald-400">{positivePercentage}%</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReviewReplyFilter(reviewReplyFilter === "UNREPLIED" ? "ALL" : "UNREPLIED")}
                      className="space-y-1 pt-2 sm:pt-0 sm:pl-4 text-left group cursor-pointer"
                    >
                      <span className="text-[10px] font-mono uppercase text-app-muted block tracking-wider group-hover:text-app-primary">
                        Требуют ответа
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className={`text-2xl font-bold ${unrepliedCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                          {unrepliedCount}
                        </span>
                        {unrepliedCount > 0 && (
                          <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full font-sans">
                            Без ответа
                          </span>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* RATING DISTRIBUTION QUICK ROW */}
                  {totalReviewsCount > 0 && (
                    <div className="p-3.5 rounded-2xl bg-app-surface border border-app-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold uppercase text-app-primary">
                          Распределение оценок
                        </span>
                        {reviewStarFilter !== "ALL" && (
                          <button
                            onClick={() => setReviewStarFilter("ALL")}
                            className="text-[10px] font-mono text-emerald-400 hover:underline cursor-pointer"
                          >
                            Сбросить фильтр
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = starCounts[star as keyof typeof starCounts];
                          const pct = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
                          const isSelected = reviewStarFilter === star;

                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewStarFilter(isSelected ? "ALL" : star)}
                              className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-app-accent text-app-accent-fg border-app-accent font-bold"
                                  : "bg-app-card border-app-border text-app-muted hover:text-app-primary"
                              }`}
                            >
                              <span className="flex items-center gap-1 font-semibold">
                                {star} <Star size={11} className="fill-current text-amber-400" />
                              </span>
                              <span className="text-[11px] opacity-80">{count} ({pct}%)</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SEARCH & FILTER TOOLBAR */}
                  <div className="p-3.5 rounded-2xl bg-app-surface border border-app-border space-y-2.5">
                    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                      {/* Search */}
                      <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
                        <input
                          type="search"
                          value={reviewSearchQuery}
                          onChange={(e) => setReviewSearchQuery(e.target.value)}
                          placeholder="Поиск по имени или тексту..."
                          className="w-full bg-app-card border border-app-border rounded-xl pl-8 pr-12 py-1.5 text-xs text-app-primary focus:outline-none search-input"
                        />
                        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-app-muted border border-app-border bg-app-surface px-1 py-0.5 rounded pointer-events-none hidden sm:inline">⌘K</kbd>
                        {reviewSearchQuery && (
                          <button
                            onClick={() => setReviewSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-primary cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {/* Custom Sort Dropdown */}
                      <div className="relative shrink-0" ref={sortDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                          className="bg-app-card border border-app-border text-app-primary text-xs font-mono rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer flex items-center gap-2 hover:border-app-accent/50 transition-colors shadow-sm"
                        >
                          <SlidersHorizontal size={13} className="text-app-muted" />
                          <span>
                            {
                              {
                                NEWEST: "Сначала новые",
                                OLDEST: "Сначала старые",
                                RATING_DESC: "Высокий рейтинг",
                                RATING_ASC: "Низкий рейтинг"
                              }[reviewSortOrder]
                            }
                          </span>
                          <ChevronDown
                            size={13}
                            className={`text-app-muted transition-transform duration-200 ${isSortDropdownOpen ? "rotate-180" : ""}`}
                          />
                        </button>

                        <AnimatePresence>
                          {isSortDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -4, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -4, scale: 0.98 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-0 top-full mt-1.5 z-30 w-44 bg-app-surface border border-app-border rounded-xl shadow-xl p-1 font-mono text-xs space-y-0.5"
                            >
                              {[
                                { id: "NEWEST", label: "Сначала новые" },
                                { id: "OLDEST", label: "Сначала старые" },
                                { id: "RATING_DESC", label: "Высокий рейтинг" },
                                { id: "RATING_ASC", label: "Низкий рейтинг" }
                              ].map((opt) => {
                                const isSelected = reviewSortOrder === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                      setReviewSortOrder(opt.id as any);
                                      setIsSortDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                                      isSelected
                                        ? "bg-app-accent text-app-accent-fg font-semibold"
                                        : "text-app-primary hover:bg-app-card"
                                    }`}
                                  >
                                    <span>{opt.label}</span>
                                    {isSelected && <Check size={13} />}
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Status Tabs */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app-border pt-2.5">
                      <div className="flex items-center gap-1 bg-app-card border border-app-border p-1 rounded-xl font-mono text-[11px]">
                        <button
                          type="button"
                          onClick={() => setReviewReplyFilter("ALL")}
                          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                            reviewReplyFilter === "ALL" ? "bg-app-accent text-app-accent-fg font-bold" : "text-app-muted hover:text-app-primary"
                          }`}
                        >
                          Все ({totalReviewsCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewReplyFilter("UNREPLIED")}
                          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                            reviewReplyFilter === "UNREPLIED" ? "bg-app-accent text-app-accent-fg font-bold" : "text-app-muted hover:text-app-primary"
                          }`}
                        >
                          <span>Без ответа</span>
                          {unrepliedCount > 0 && (
                            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px]">
                              {unrepliedCount}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewReplyFilter("REPLIED")}
                          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                            reviewReplyFilter === "REPLIED" ? "bg-app-accent text-app-accent-fg font-bold" : "text-app-muted hover:text-app-primary"
                          }`}
                        >
                          С ответом ({repliedCount})
                        </button>
                      </div>

                      {/* Stars filter quick pills */}
                      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none font-mono text-[11px]">
                        {(["ALL", 5, 4, 3, 2, 1] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setReviewStarFilter(s)}
                            className={`px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                              reviewStarFilter === s
                                ? "bg-app-accent text-app-accent-fg border-app-accent font-bold"
                                : "border-app-border text-app-muted hover:text-app-primary"
                            }`}
                          >
                            {s === "ALL" ? "Все ★" : `${s} ★`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* REVIEW LIST */}
                  {reviewsLoading ? (
                    <div className="py-16 text-center bg-app-surface border border-app-border rounded-2xl p-6">
                      <SpinnerLoader size={24} className="mx-auto text-app-accent" />
                      <p className="text-xs text-app-muted font-mono mt-2">Загрузка отзывов...</p>
                    </div>
                  ) : filteredReviews.length === 0 ? (
                    <div className="py-12 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6 space-y-2">
                      <MessageSquare className="mx-auto text-app-muted" size={24} />
                      <p className="text-xs text-app-muted font-mono">
                        {reviews.length === 0
                          ? "Отзывов пока нет."
                          : "Отзывы по заданным фильтрам не найдены."}
                      </p>
                      {(reviewSearchQuery || reviewStarFilter !== "ALL" || reviewReplyFilter !== "ALL") && (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewSearchQuery("");
                            setReviewStarFilter("ALL");
                            setReviewReplyFilter("ALL");
                          }}
                          className="text-xs text-emerald-400 hover:underline font-mono mt-2 cursor-pointer"
                        >
                          Сбросить все фильтры
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredReviews.map((rev) => {
                        const isReplying = replyingReviewId === rev.id;
                        const isDeleting = deletingReviewId === rev.id;

                        return (
                          <div
                            key={rev.id}
                            className="p-4 rounded-2xl bg-app-surface border border-app-border space-y-2.5 transition-all relative"
                          >
                            {/* Header row */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-app-card border border-app-border flex items-center justify-center font-bold font-mono text-xs text-app-primary uppercase shrink-0">
                                  {rev.customerName ? rev.customerName[0] : "К"}
                                </div>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs text-app-primary">
                                      {rev.customerName || "Клиент"}
                                    </span>
                                    <span className="text-xs font-bold font-mono text-amber-400 flex items-center gap-0.5">
                                      <Star size={11} className="fill-amber-400 text-amber-400" />
                                      {rev.rating}.0
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-app-muted font-mono block">
                                    {new Date(rev.createdAt).toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {/* Delete review button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(rev.id)}
                                disabled={isDeleting}
                                className="p-1.5 rounded-xl text-app-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Удалить отзыв"
                              >
                                {isDeleting ? <SpinnerLoader size={14} /> : <Trash2 size={14} />}
                              </button>
                            </div>

                            {/* Review Comment - Direct text without nested box */}
                            {rev.comment ? (
                              <p className="text-xs text-app-primary leading-relaxed font-sans pt-0.5">
                                {rev.comment}
                              </p>
                            ) : (
                              <p className="text-[11px] text-app-muted italic font-sans">
                                (Без текста отзыва)
                              </p>
                            )}

                            {/* Admin Reply Block */}
                            {rev.reply && !isReplying ? (
                              <div className="mt-2 pt-1.5 pl-3 border-l-2 border-emerald-500/70 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                                    Ответ заведения
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReplyingReviewId(rev.id);
                                      setReplyText(rev.reply);
                                    }}
                                    className="text-[10px] font-mono text-app-muted hover:text-app-primary cursor-pointer underline"
                                  >
                                    Изменить
                                  </button>
                                </div>
                                <p className="text-xs text-app-secondary leading-relaxed font-sans">{rev.reply}</p>
                              </div>
                            ) : isReplying ? (
                              <div className="p-3.5 bg-app-card rounded-xl border border-app-border space-y-2.5 mt-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-mono font-bold text-app-primary">
                                    Ответ клиенту
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReplyingReviewId(null);
                                      setReplyText("");
                                    }}
                                    className="text-app-muted hover:text-app-primary text-xs cursor-pointer"
                                  >
                                    <X size={15} />
                                  </button>
                                </div>

                                <textarea
                                  rows={2}
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Напишите ответ..."
                                  className="w-full bg-app-surface border border-app-border rounded-xl p-2.5 text-xs text-app-primary focus:outline-none resize-none font-sans"
                                />

                                {/* Quick templates */}
                                <div className="flex flex-wrap gap-1">
                                  {[
                                    "Спасибо за отзыв! Ждём вас снова!",
                                    "Благодарим за обратную связь!",
                                    "Спасибо за оценку! Обязательно учтём ваши пожелания."
                                  ].map((tmpl, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setReplyText(tmpl)}
                                      className="px-2 py-0.5 bg-app-surface border border-app-border hover:border-emerald-500/40 rounded-lg text-[10px] text-app-muted hover:text-app-primary transition-colors cursor-pointer text-left truncate max-w-xs font-sans"
                                    >
                                      {tmpl}
                                    </button>
                                  ))}
                                </div>

                                <div className="flex gap-2 justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReplyingReviewId(null);
                                      setReplyText("");
                                    }}
                                    className="px-3 py-1 bg-app-surface hover:bg-app-hover border border-app-border text-app-muted font-mono text-xs rounded-xl cursor-pointer"
                                  >
                                    Отмена
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReplyReview(rev.id)}
                                    className="px-3 py-1 bg-app-accent text-app-accent-fg font-mono text-xs font-bold rounded-xl hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
                                  >
                                    <Send size={12} />
                                    <span>Сохранить</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingReviewId(rev.id);
                                  setReplyText("");
                                }}
                                className="text-xs text-emerald-400 hover:text-emerald-300 font-mono font-semibold flex items-center gap-1 cursor-pointer py-0.5"
                              >
                                <MessageSquare size={12} />
                                <span>+ Ответить на отзыв</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
                        <div key={banner.id} className="p-6 rounded-2xl bg-app-surface border border-app-border space-y-3 relative shadow-sm">
                          <button onClick={() => handleDeleteBanner(banner.id)} className="absolute top-4 right-4 p-1.5 text-app-muted hover:text-rose-500 transition-colors cursor-pointer" title="Удалить">
                            <Trash2 size={15} />
                          </button>
                          {banner.badge && (
                            <span className="inline-block px-2.5 py-0.5 bg-app-badge text-app-primary font-mono text-[10px] font-bold rounded-full uppercase tracking-wider border border-app-border">
                              {banner.badge}
                            </span>
                          )}
                          <h3 className="text-base font-bold text-app-primary tracking-tight">{banner.title}</h3>
                          {banner.subtitle && <p className="text-xs text-app-muted leading-relaxed">{banner.subtitle}</p>}
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
                                    <span className="px-2 py-0.5 bg-app-card border border-app-border text-app-secondary text-[9px] font-mono rounded-md">
                                      🎯 {targetLabels[bc.targetFilter] || bc.targetFilter || "Все клиенты"}
                                    </span>
                                  </div>
                                  <h3 className="text-sm font-bold text-app-primary font-mono pt-1">{bc.title}</h3>
                                </div>
                                <button onClick={() => handleDeleteBroadcast(bc.id)} className="p-1.5 text-app-muted hover:text-rose-400 hover:bg-rose-500/5 rounded-lg transition-colors">
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              {/* Image preset if exists */}
                              {bc.imageUrl && (
                                <div className="rounded-xl overflow-hidden h-24 bg-app-card border border-app-border">
                                  <img src={bc.imageUrl} alt={bc.title} className="w-full h-full object-cover" />
                                </div>
                              )}

                              <p className="text-xs text-app-secondary leading-relaxed font-sans line-clamp-3">{bc.message}</p>
                            </div>

                            {/* Footer stats / buttons */}
                            <div className="pt-3 border-t border-app-border flex items-center justify-between text-[10px] font-mono text-app-muted">
                              <div>
                                Получателей: <span className="text-app-primary font-bold">{bc.sentCount || 1}</span>
                              </div>
                              {bc.buttonText && (
                                <div className="px-2 py-1 bg-app-card border border-app-border text-app-secondary rounded-lg text-[9px]">
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
                        <tbody className="divide-y divide-app-border">
                          {customers.map(c => (
                            <tr key={c.id} className="hover:bg-app-hover transition-colors">
                              <td className="p-3 text-app-primary font-semibold">{c.name || "Клиент"}</td>
                              <td className="p-3 text-app-muted">{c.phone}</td>
                              <td className="p-3 text-app-primary">{c.ordersCount || 1}</td>
                              <td className="p-3 text-emerald-500 font-bold">{c.totalSpent || 0} ₽</td>
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
                      <span className="text-xs font-semibold text-app-primary font-mono">{selectedShop.name} Бот</span>
                    </div>
                    <span className="text-[10px] text-app-muted font-mono">Telegram Симулятор</span>
                  </div>

                  <div className="h-80 overflow-y-auto space-y-3 p-2 font-sans">
                    {botSimMessages.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3 rounded-2xl max-w-[80%] text-xs ${msg.sender === 'user' ? 'bg-app-accent text-app-accent-fg' : 'bg-app-card text-app-primary border border-app-border'}`}>
                          <p>{msg.text}</p>
                          {msg.button && (
                            <a
                              href={`/${selectedShop.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 block w-full py-2 bg-app-accent text-app-accent-fg text-center rounded-xl font-mono text-xs font-bold hover:opacity-90 transition-colors"
                            >
                              {msg.button}
                            </a>
                          )}
                        </div>
                        <span className="text-[9px] text-app-muted font-mono mt-1">{msg.time}</span>
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
                      className="flex-1 bg-app-card border border-app-border rounded-xl px-3 py-2 text-xs text-app-primary focus:outline-none"
                    />
                    <button onClick={() => handleSendBotSimMessage(botSimInput)} className="px-3 py-2 bg-app-accent text-app-accent-fg rounded-xl font-mono text-xs font-bold">
                      Отправить
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: TEAM & ACCESS */}
              {activeTab === "team" && selectedShop && (
                <div className="max-w-4xl mx-auto bg-app-surface border border-app-border rounded-3xl p-6 sm:p-8 text-app-primary space-y-6 shadow-sm font-sans">
                  <div className="border-b border-app-border pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold font-mono flex items-center gap-2 text-app-primary">
                        <Users size={18} className="text-emerald-400" />
                        Команда и доступ: {selectedShop.name}
                      </h3>
                      <p className="text-xs text-app-muted mt-0.5 font-sans">Управление сотрудниками, ролями и ссылками-приглашениями</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsInviteModalOpen(true);
                        setCreatedInviteUrl(null);
                      }}
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-mono font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    >
                      <UserPlus size={15} />
                      <span>Пригласить сотрудника</span>
                    </button>
                  </div>

                  {/* Members List */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs font-mono text-app-muted uppercase tracking-wider">
                      Состав команды ({(teamMembers || []).length + (selectedShop?.owner ? 1 : 0)})
                    </h4>

                    <div className="grid grid-cols-1 gap-2.5">
                      {/* Owner Item */}
                      {selectedShop?.owner && (
                        <div className="p-4 bg-app-card border border-app-border rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-base shrink-0">
                              👑
                            </div>
                            <div>
                              <div className="font-bold text-xs text-app-primary flex items-center gap-2">
                                <span>{selectedShop.owner.name || selectedShop.owner.email}</span>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  Владелец
                                </span>
                              </div>
                              <p className="text-[11px] text-app-muted font-mono">{selectedShop.owner.email}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Staff Members */}
                      {(teamMembers || []).map(m => (
                        <div key={m.id} className="p-4 bg-app-card border border-app-border rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm font-mono shrink-0">
                              <User size={18} />
                            </div>
                            <div>
                              <div className="font-bold text-xs text-app-primary flex items-center gap-2">
                                <span>{m.name || m.email}</span>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                                  {m.role === "MANAGER" ? "Менеджер" : "Сотрудник"}
                                </span>
                              </div>
                              <p className="text-[11px] text-app-muted font-mono">{m.email}</p>
                            </div>
                          </div>

                          {user && selectedShop?.ownerId === user.id && (
                            <button
                              type="button"
                              onClick={() => requestConfirm("Исключить сотрудника", `Удалить ${m.name || m.email} из команды заведения?`, () => handleRemoveMember(m.userId))}
                              className="p-2 text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl transition-all cursor-pointer"
                              title="Исключить из команды"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Invites Section */}
                  <div className="space-y-3 pt-6 border-t border-app-border">
                    <h4 className="font-bold text-xs font-mono text-app-muted uppercase tracking-wider">
                      Активные пригласительные ссылки ({(teamInvites || []).length})
                    </h4>

                    {(teamInvites || []).length === 0 ? (
                      <div className="p-6 bg-app-card border border-app-border rounded-2xl text-center space-y-2">
                        <UserPlus size={24} className="text-app-muted mx-auto" />
                        <p className="text-xs text-app-muted font-mono">
                          Нет созданных приглашений. Сгенерируйте ссылку выше и отправьте сотрудникам для предоставления доступа.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {(teamInvites || []).map(inv => (
                          <div key={inv.id} className="p-4 bg-app-card border border-app-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-emerald-400 px-2.5 py-0.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                  {inv.code}
                                </span>
                                <span className="text-[11px] text-app-muted font-mono">
                                  Использовано: {inv.usedCount} из {inv.maxUses}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-app-muted truncate max-w-md">
                                {inv.inviteUrl}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(inv.inviteUrl);
                                  showToast("Ссылка-приглашение скопирована в буфер!", "success");
                                }}
                                className="px-3.5 py-2 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-primary flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Copy size={13} />
                                <span>Скопировать</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevokeInvite(inv.code)}
                                className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                                title="Отозвать ссылку"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* DRAWERS & MODALS */}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-6 text-app-primary space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-emerald-400" />
                <h3 className="text-sm font-semibold tracking-tight uppercase font-mono">Пригласить сотрудника</h3>
              </div>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-app-muted hover:text-app-primary p-1 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {!createdInviteUrl ? (
              <div className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block text-app-muted mb-1.5">Роль для приглашаемого</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as any)}
                    className="w-full bg-app-card border border-app-border rounded-xl p-2.5 text-app-primary focus:outline-none focus:border-app-accent"
                  >
                    <option value="STAFF">Сотрудник (просмотр и обработка заказов)</option>
                    <option value="MANAGER">Менеджер (полное управление)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-app-muted mb-1.5">Лимит активаций ссылки</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={inviteMaxUses}
                    onChange={e => setInviteMaxUses(Number(e.target.value))}
                    className="w-full bg-app-card border border-app-border rounded-xl p-2.5 text-app-primary focus:outline-none focus:border-app-accent"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCreateInvite}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl shadow-sm transition-all cursor-pointer uppercase tracking-wider"
                >
                  Сгенерировать ссылку
                </button>
              </div>
            ) : (
              <div className="space-y-4 font-mono text-xs text-center">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
                  <CheckCircle size={28} className="text-emerald-400 mx-auto" />
                  <p className="font-bold text-sm text-app-primary">Ссылка создана!</p>
                  <p className="text-app-muted text-[11px]">Отправьте эту ссылку сотруднику. Перейдя по ней, он сможет войти или зарегистрироваться и автоматически получит доступ к заведению.</p>
                </div>

                <div className="p-3 bg-app-card border border-app-border rounded-xl break-all text-[11px] text-emerald-400 font-mono select-all">
                  {createdInviteUrl}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdInviteUrl);
                      showToast("Ссылка скопирована в буфер!", "success");
                    }}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy size={14} />
                    <span>Скопировать</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsInviteModalOpen(false);
                      setCreatedInviteUrl(null);
                    }}
                    className="py-2.5 px-4 bg-app-card hover:bg-app-hover border border-app-border text-app-primary font-bold rounded-xl cursor-pointer"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-6 text-app-primary space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                <h3 className="text-sm font-semibold tracking-tight uppercase font-mono">
                  {authMode === "otp" && "Вход по коду из E-mail"}
                  {authMode === "login" && "Вход по паролю"}
                  {authMode === "register" && "Регистрация аккаунта"}
                  {authMode === "reset" && "Восстановление пароля"}
                </h3>
              </div>
              <button onClick={() => { setIsAuthModalOpen(false); setAuthError(null); setAuthSuccessMsg(null); }} className="text-app-muted hover:text-app-primary p-1 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-app-card p-1 rounded-xl border border-app-border text-xs font-mono">
              <button
                type="button"
                onClick={() => { setAuthMode("otp"); setOtpStep("email"); setAuthError(null); setAuthSuccessMsg(null); }}
                className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                  authMode === "otp" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30" : "text-app-muted hover:text-app-primary"
                }`}
              >
                <Mail size={12} />
                <span>E-mail код</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setAuthError(null); setAuthSuccessMsg(null); }}
                className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 border cursor-pointer ${
                  authMode === "login" ? "bg-app-accent text-app-accent-fg border-app-border font-bold shadow-sm" : "border-transparent text-app-muted hover:text-app-primary"
                }`}
              >
                <Lock size={12} />
                <span>Пароль</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("register"); setAuthError(null); setAuthSuccessMsg(null); }}
                className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 border cursor-pointer ${
                  authMode === "register" ? "bg-app-accent text-app-accent-fg border-app-border font-bold shadow-sm" : "border-transparent text-app-muted hover:text-app-primary"
                }`}
              >
                <User size={12} />
                <span>Создать</span>
              </button>
            </div>

            {authError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
                <AlertCircle size={15} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>{authSuccessMsg}</span>
              </div>
            )}

            {/* OTP Code Step (Unified for OTP Login, Registration, and Password Reset) */}
            {otpStep === "code" ? (
              <form onSubmit={handleVerifyOtpCode} className="space-y-3 font-sans">
                <p className="text-xs text-app-muted">
                  {authMode === "register" && (
                    <>Код подтверждения отправлен на <strong className="text-app-primary">{authEmail}</strong> для завершения регистрации.</>
                  )}
                  {authMode === "reset" && (
                    <>Код подтверждения отправлен на <strong className="text-app-primary">{authEmail}</strong> для сброса пароля.</>
                  )}
                  {authMode === "otp" && (
                    <>Код отправлен на <strong className="text-app-primary">{authEmail}</strong>.</>
                  )}
                </p>

                {authDevCode ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-200">
                          SMTP-сервер не настроен в <code>.env</code>
                        </p>
                        <p className="text-[11px] text-amber-300/80 mt-0.5">
                          В тестовом контейнере нет почтового сервера, поэтому код сгенерирован локально:
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-amber-500/20 font-mono">
                      <span className="text-sm font-bold text-white tracking-widest">{authDevCode}</span>
                      <button
                        type="button"
                        onClick={() => setAuthOtpCode(authDevCode)}
                        className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] rounded border border-amber-500/40 font-mono transition-colors"
                      >
                        Вставить код
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-[11px] flex items-center gap-2">
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                    <span>Письмо успешно отправлено по SMTP на {authEmail}. Проверьте папку «Входящие» или «Спам».</span>
                  </div>
                )}

                <div>
                  <label className="text-[11px] text-app-muted font-mono mb-1 block">6-значный код подтверждения</label>
                  <input
                    type="text"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={authOtpCode}
                    onChange={e => setAuthOtpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-3 text-center text-lg font-mono font-bold tracking-[8px] text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingAuth || authOtpCode.length !== 6}
                  className="w-full py-2.5 bg-emerald-500 text-black font-mono font-bold text-xs rounded-xl hover:bg-emerald-400 transition-colors uppercase flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingAuth ? <SpinnerLoader size={14} /> : <ShieldCheck size={14} />}
                  {isSubmittingAuth
                    ? "Проверка..."
                    : authMode === "register"
                    ? "Подтвердить и зарегистрироваться"
                    : authMode === "reset"
                    ? "Сохранить новый пароль"
                    : "Подтвердить и войти"}
                </button>

                <div className="flex justify-between items-center text-xs pt-1">
                  <button
                    type="button"
                    disabled={resendTimer > 0 || isSubmittingAuth}
                    onClick={() => handleSendOtpCode(authMode === "register" ? "REGISTER" : authMode === "reset" ? "RESET_PASSWORD" : "LOGIN")}
                    className="text-app-muted hover:text-app-primary font-mono text-[11px] flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw size={12} className={isSubmittingAuth ? "animate-spin" : ""} />
                    {resendTimer > 0 ? `Повтор через ${resendTimer}с` : "Отправить код повторно"}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setOtpStep("email"); setAuthOtpCode(""); }}
                    className="text-app-muted hover:text-app-primary font-mono text-[11px] underline cursor-pointer"
                  >
                    Изменить данные
                  </button>
                </div>
              </form>
            ) : (
              /* Email / Credentials Forms Step */
              <>
                {/* E-mail OTP Login Tab */}
                {authMode === "otp" && (
                  <div className="space-y-3 font-sans">
                    <p className="text-xs text-app-muted">
                      Введите ваш E-mail. Мы мгновенно отправим 6-значный одноразовый код для входа.
                    </p>
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
                      className="w-full py-2.5 bg-emerald-500 text-black font-mono font-bold text-xs rounded-xl hover:bg-emerald-400 transition-colors uppercase flex items-center justify-center gap-2"
                    >
                      {isSubmittingAuth ? <SpinnerLoader size={14} /> : <Mail size={14} />}
                      {isSubmittingAuth ? "Отправка кода..." : "Получить код на E-mail"}
                    </button>
                  </div>
                )}

                {/* Password Login / Registration / Reset Tabs */}
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
                        placeholder="Пароль (мин. 6 символов)"
                        className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none"
                      />
                    )}

                    {authMode === "reset" && (
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        placeholder="Новый пароль (мин. 6 символов)"
                        className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none"
                      />
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingAuth}
                      className="w-full py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:bg-zinc-200 uppercase flex items-center justify-center gap-2"
                    >
                      {isSubmittingAuth && <SpinnerLoader size={14} />}
                      {isSubmittingAuth
                        ? "Отправка..."
                        : authMode === "login"
                        ? "Войти в аккаунт"
                        : authMode === "register"
                        ? "Зарегистрироваться"
                        : "Получить код сброса"}
                    </button>
                  </form>
                )}
              </>
            )}

            <div className="text-center pt-2 flex items-center justify-center gap-4 text-xs font-mono text-app-muted">
              {authMode === "login" && (
                <button
                  type="button"
                  onClick={() => { setAuthMode("reset"); setAuthError(null); setAuthSuccessMsg(null); }}
                  className="hover:text-app-primary underline cursor-pointer"
                >
                  Забыли пароль?
                </button>
              )}
              {authMode === "reset" && (
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setAuthError(null); setAuthSuccessMsg(null); }}
                  className="hover:text-app-primary underline cursor-pointer"
                >
                  Вернуться ко входу
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Promo Modal */}
      {isCreatingPromo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-6 text-app-primary space-y-4">
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <h3 className="text-sm font-semibold font-mono">Создать промокод</h3>
              <button onClick={() => setIsCreatingPromo(false)} className="text-app-muted hover:text-app-primary">
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
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none font-mono uppercase"
              />
              <input
                type="number"
                value={newPromoData.discountPercent}
                onChange={e => setNewPromoData(p => ({ ...p, discountPercent: e.target.value }))}
                placeholder="Процент скидки (%)"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none font-mono"
              />
              <input
                type="number"
                value={newPromoData.discountAmount}
                onChange={e => setNewPromoData(p => ({ ...p, discountAmount: e.target.value }))}
                placeholder="Фиксированная скидка (₽)"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none font-mono"
              />
              <input
                type="number"
                value={newPromoData.usageLimit}
                onChange={e => setNewPromoData(p => ({ ...p, usageLimit: e.target.value }))}
                placeholder="Лимит использований (опционально)"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none font-mono"
              />
              <button type="submit" className="w-full py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 uppercase">
                Создать промокод
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Banner Modal */}
      {isCreatingBanner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-6 text-app-primary space-y-4">
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <h3 className="text-sm font-semibold font-mono">Создать баннер</h3>
              <button onClick={() => setIsCreatingBanner(false)} className="text-app-muted hover:text-app-primary">
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
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none"
              />
              <input
                type="text"
                value={newBannerData.subtitle}
                onChange={e => setNewBannerData(p => ({ ...p, subtitle: e.target.value }))}
                placeholder="Подзаголовок"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none"
              />
              <input
                type="text"
                value={newBannerData.badge}
                onChange={e => setNewBannerData(p => ({ ...p, badge: e.target.value }))}
                placeholder="Текст бейджа (напр. АКЦИЯ, НОВИНКА)"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none font-mono"
              />
              <button type="submit" className="w-full py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 uppercase">
                Сохранить баннер
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Broadcast Modal */}
      {isCreatingBroadcast && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-app-modal border border-app-border rounded-3xl p-6 text-app-primary flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto">
            {/* Left Column: Form Settings */}
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center border-b border-app-border pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold font-mono text-app-primary">Гибкий конструктор рассылки</h3>
                  <p className="text-[11px] text-app-muted font-sans">Настройте таргетинг, шаблоны и интерактивные кнопки</p>
                </div>
                <button onClick={() => setIsCreatingBroadcast(false)} className="text-app-muted hover:text-app-primary md:hidden">
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
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none focus:border-app-border"
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
                            ? "bg-app-accent text-app-accent-fg border-app-border font-bold animate-pulse-subtle"
                            : "bg-app-card border-app-border text-app-secondary hover:border-app-border"
                        }`}
                      >
                        <span className="font-semibold block text-[11px] font-mono">{target.label}</span>
                        <span className={`text-[9px] block ${newBroadcastData.targetFilter === target.id ? "text-app-accent-fg/80" : "text-app-muted"}`}>{target.desc}</span>
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
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none focus:border-app-border resize-none leading-relaxed"
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
                      className="flex-1 bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none focus:border-app-border font-mono"
                    />
                    {newBroadcastData.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setNewBroadcastData(p => ({ ...p, imageUrl: "" }))}
                        className="px-3 bg-app-secondary hover:bg-app-hover rounded-xl text-app-primary font-mono transition-colors"
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
                            ? "bg-app-accent text-app-accent-fg border-transparent font-semibold"
                            : "bg-app-card border-app-border text-app-muted hover:text-app-primary"
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
                      className="flex-1 bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none focus:border-app-border"
                    />
                    <div className="flex gap-1">
                      {["🛒 Заказать", "⭐ Оставить отзыв", "🎁 Забрать бонус"].map(btnPreset => (
                        <button
                          key={btnPreset}
                          type="button"
                          onClick={() => setNewBroadcastData(p => ({ ...p, buttonText: btnPreset }))}
                          className="px-2 py-1 bg-app-secondary hover:bg-app-hover text-[10px] rounded-lg text-app-primary transition-colors"
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
                    className="flex-1 py-2.5 bg-app-secondary hover:bg-app-hover text-app-primary font-mono font-bold rounded-xl transition-colors uppercase tracking-wider"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-2.5 bg-app-accent text-app-accent-fg hover:opacity-90 font-mono font-bold rounded-xl transition-colors uppercase tracking-wider"
                  >
                    🚀 Запустить рассылку
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Live Telegram Smartphone Preview */}
            <div className="w-full md:w-80 flex flex-col bg-app-card border border-app-border rounded-3xl p-4 space-y-4">
              <div className="flex justify-between items-center border-b border-app-border pb-2">
                <span className="text-[11px] font-mono text-app-muted uppercase tracking-widest">Интерактивный Превью</span>
                <button onClick={() => setIsCreatingBroadcast(false)} className="text-app-muted hover:text-app-primary hidden md:block">
                  <X size={18} />
                </button>
              </div>

              {/* Smartphone Shell */}
              <div className="flex-1 bg-app-surface rounded-2xl p-3 flex flex-col justify-between border border-app-border shadow-inner relative overflow-hidden min-h-[380px]">
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
                      <div className="w-5 h-5 bg-app-accent text-app-accent-fg rounded-full flex items-center justify-center text-[10px] font-bold font-mono">
                        {selectedShop?.name?.substring(0,1) || "Б"}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold leading-none text-app-primary">{selectedShop?.name || "Бот-Ассистент"}</div>
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
                        <kbd className="px-1.5 py-0.5 bg-app-surface border border-app-border rounded text-app-accent font-bold">1</kbd>
                        <kbd className="px-1.5 py-0.5 bg-app-surface border border-app-border rounded text-app-accent font-bold">2</kbd>
                        <kbd className="px-1.5 py-0.5 bg-app-surface border border-app-border rounded text-app-accent font-bold">3</kbd>
                        <kbd className="px-1.5 py-0.5 bg-app-surface border border-app-border rounded text-app-accent font-bold">4</kbd>
                        <kbd className="px-1.5 py-0.5 bg-app-surface border border-app-border rounded text-app-accent font-bold">5</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Принять новый заказ в работу</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-emerald-400 font-bold">A</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Завершить заказ в работе</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-indigo-400 font-bold">C</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-app-card border border-app-border rounded-xl">
                      <span className="text-app-primary font-medium">Экспорт всех заказов в CSV</span>
                      <kbd className="px-2 py-0.5 bg-app-surface border border-app-border font-mono text-[10px] rounded text-amber-400 font-bold">E</kbd>
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
