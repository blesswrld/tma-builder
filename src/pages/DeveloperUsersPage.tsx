import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Ban,
  Unlock,
  Crown,
  Store,
  Coins,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Copy,
  Check,
  Building2,
  Phone,
  Mail,
  Send,
  Edit3,
  Trash2,
  Download,
  RefreshCw,
  Volume2,
  VolumeX,
  Radio,
  CheckSquare,
  Square,
  Key,
  ShoppingBag,
  Eye,
  AlertTriangle,
  Info,
  Sun,
  Moon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useRealtime } from "../context/RealtimeContext";
import { useScrollLock } from "../hooks/useScrollLock";
import { CustomDropdown } from "../components/CustomDropdown";
import { ConfirmModal } from "../components/ConfirmModal";

export interface DevShopSummary {
  id: string;
  name: string;
  slug: string;
  isOpen: boolean;
  servicesCount: number;
  ordersCount: number;
  totalRevenue: number;
  botToken: string | null;
  createdAt: string;
  address?: string | null;
  phone?: string | null;
}

export interface DevUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  telegramHandle: string | null;
  companyName: string | null;
  avatarUrl: string | null;
  plan: "FREE" | "PRO" | "ENTERPRISE";
  subscriptionExpiresAt: string | null;
  isBanned: boolean;
  banReason: string | null;
  bannedAt: string | null;
  createdAt: string;
  shopsCount: number;
  totalOrdersCount: number;
  totalRevenue: number;
  shops: DevShopSummary[];
}

export interface DevUsersStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  paidUsers: number;
  totalShops: number;
  totalOrders: number;
  totalRevenue: number;
}

type StatusFilter = "ALL" | "ACTIVE" | "BANNED";
type PlanFilter = "ALL" | "FREE" | "PRO" | "ENTERPRISE";
type ShopsFilter = "ALL" | "WITH_SHOPS" | "NO_SHOPS";
type SortOption = "NEWEST" | "OLDEST" | "REVENUE" | "ORDERS" | "SHOPS" | "EMAIL";

const BAN_REASONS = [
  "Нелегальная деятельность и запрещённый контент",
  "Спам, фишинг и вредоносная активность",
  "Нарушение правил и условий использования платформы",
  "Мошенничество и обман покупателей",
  "Неоплата тарифа / Задолженность"
];

function playNotificationChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Ignore audio errors
  }
}

async function getErrorMessage(res: Response, defaultText: string): Promise<string> {
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (json && json.error) return json.error;
    } catch {
      // Return raw text if not empty and short
      if (text && text.length < 120 && !text.includes("<html")) {
        return text;
      }
    }
  } catch {
    // Fallthrough
  }
  return defaultText;
}

export default function DeveloperUsersPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isConnected, lastEvent } = useRealtime();

  const isDeveloperUser = Boolean(
    user?.email && (
      user.email.toLowerCase().trim() === "gelgaev.dev@mail.ru" ||
      user.email.toLowerCase().trim() === "roninfortnite71@gmail.com"
    )
  );

  const [users, setUsers] = useState<DevUser[]>([]);
  const [stats, setStats] = useState<DevUsersStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sound
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem("dev_users_sound") !== "false";
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("ALL");
  const [shopsFilter, setShopsFilter] = useState<ShopsFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("NEWEST");
  const [viewMode, setViewMode] = useState<"CARDS" | "TABLE">("CARDS");

  // Selection for batch actions
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Expanded shop cards in card view
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());

  // Modals state
  const [banModalUser, setBanModalUser] = useState<DevUser | null>(null);
  const [banReason, setBanReason] = useState(BAN_REASONS[0]);
  const [customBanReason, setCustomBanReason] = useState("");
  const [disableShopsOnBan, setDisableShopsOnBan] = useState(true);
  const [isBanning, setIsBanning] = useState(false);

  const [editModalUser, setEditModalUser] = useState<DevUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    telegramHandle: "",
    companyName: "",
    plan: "FREE",
    subscriptionDays: 365,
    newPassword: ""
  });
  const [isSavingUser, setIsSavingUser] = useState(false);

  const [deleteConfirmUser, setDeleteConfirmUser] = useState<DevUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [batchBanModalOpen, setBatchBanModalOpen] = useState(false);
  const [batchBanReason, setBatchBanReason] = useState(BAN_REASONS[0]);
  const [isBatchBanning, setIsBatchBanning] = useState(false);

  const [unbanConfirmUser, setUnbanConfirmUser] = useState<DevUser | null>(null);
  const [deleteShopConfirm, setDeleteShopConfirm] = useState<{ shopId: string; shopName: string } | null>(null);
  const [batchUnbanConfirm, setBatchUnbanConfirm] = useState(false);

  const [selectedUserForDetail, setSelectedUserForDetail] = useState<DevUser | null>(null);

  // Alert Modal
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string } | null>(null);

  // Copy indicator
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Scroll lock for modals
  const isAnyModalOpen = Boolean(
    banModalUser ||
    editModalUser ||
    deleteConfirmUser ||
    batchBanModalOpen ||
    selectedUserForDetail ||
    unbanConfirmUser ||
    deleteShopConfirm ||
    batchUnbanConfirm ||
    alertModal?.isOpen
  );
  useScrollLock(isAnyModalOpen);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("dev_users_sound", String(next));
      return next;
    });
  };

  // Fetch all users
  const fetchUsers = async (showLoadingState = true) => {
    if (showLoadingState) setIsRefreshing(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/dev/users", { headers });
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Доступ разрешен только для разработчиков платформы");
        }
        const msg = await getErrorMessage(res, "Не удалось загрузить список пользователей");
        throw new Error(msg);
      }
      const data = await res.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error("Dev users load error:", err);
      setError(err.message || "Ошибка загрузки списка пользователей");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (isDeveloperUser) {
        fetchUsers();
      } else {
        setIsLoading(false);
      }
    }
  }, [authLoading, isDeveloperUser]);

  // Realtime events listener
  useEffect(() => {
    if (!lastEvent) return;

    if (
      lastEvent.type === "USER_BANNED" ||
      lastEvent.type === "USER_UNBANNED" ||
      lastEvent.type === "USER_UPDATED" ||
      lastEvent.type === "USER_DELETED" ||
      lastEvent.type === "SHOP_UPDATED" ||
      lastEvent.type === "SHOP_DELETED"
    ) {
      if (soundEnabled) {
        playNotificationChime();
      }
      fetchUsers(false);
    }
  }, [lastEvent]);

  // Ban action
  const handleBanUser = async () => {
    if (!banModalUser) return;
    setIsBanning(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const finalReason = customBanReason.trim() || banReason;
      const res = await fetch(`/api/dev/users/${banModalUser.id}/ban`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: finalReason,
          disableShops: disableShopsOnBan
        })
      });
      if (!res.ok) {
        const msg = await getErrorMessage(res, "Ошибка блокировки пользователя");
        throw new Error(msg);
      }
      setBanModalUser(null);
      setCustomBanReason("");
      fetchUsers(false);
    } catch (err: any) {
      setAlertModal({ isOpen: true, title: "Ошибка блокировки", message: err.message });
    } finally {
      setIsBanning(false);
    }
  };

  // Unban action
  const handleConfirmUnban = async () => {
    if (!unbanConfirmUser) return;
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/dev/users/${unbanConfirmUser.id}/unban`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const msg = await getErrorMessage(res, "Ошибка разблокировки пользователя");
        throw new Error(msg);
      }
      setUnbanConfirmUser(null);
      fetchUsers(false);
    } catch (err: any) {
      setAlertModal({ isOpen: true, title: "Ошибка разблокировки", message: err.message });
    }
  };

  // Quick Plan Change
  const handleQuickPlanChange = async (userId: string, plan: "FREE" | "PRO" | "ENTERPRISE") => {
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/dev/users/${userId}/plan`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan, days: 365 })
      });
      if (!res.ok) {
        const msg = await getErrorMessage(res, "Ошибка изменения тарифа");
        throw new Error(msg);
      }
      fetchUsers(false);
    } catch (err: any) {
      setAlertModal({ isOpen: true, title: "Ошибка", message: err.message });
    }
  };

  // Save edited user
  const handleSaveUser = async () => {
    if (!editModalUser) return;
    setIsSavingUser(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/dev/users/${editModalUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editForm.name,
          phone: editForm.phone,
          telegramHandle: editForm.telegramHandle,
          companyName: editForm.companyName,
          newPassword: editForm.newPassword || undefined
        })
      });
      if (!res.ok) {
        const msg = await getErrorMessage(res, "Ошибка сохранения профиля");
        throw new Error(msg);
      }

      if (editForm.plan !== editModalUser.plan) {
        await fetch(`/api/dev/users/${editModalUser.id}/plan`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            plan: editForm.plan,
            days: editForm.subscriptionDays
          })
        });
      }

      setEditModalUser(null);
      fetchUsers(false);
    } catch (err: any) {
      setAlertModal({ isOpen: true, title: "Ошибка сохранения", message: err.message });
    } finally {
      setIsSavingUser(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/dev/users/${deleteConfirmUser.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const msg = await getErrorMessage(res, "Ошибка удаления пользователя");
        throw new Error(msg);
      }
      setDeleteConfirmUser(null);
      fetchUsers(false);
    } catch (err: any) {
      setAlertModal({ isOpen: true, title: "Ошибка удаления", message: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle specific shop open/close
  const handleToggleShop = async (shopId: string, currentIsOpen: boolean) => {
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/dev/shops/${shopId}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isOpen: !currentIsOpen })
      });
      if (!res.ok) {
        const msg = await getErrorMessage(res, "Ошибка переключения заведения");
        throw new Error(msg);
      }
      fetchUsers(false);
    } catch (err: any) {
      setAlertModal({ isOpen: true, title: "Ошибка", message: err.message });
    }
  };

  // Delete specific shop confirm
  const handleConfirmDeleteShop = async () => {
    if (!deleteShopConfirm) return;
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/dev/shops/${deleteShopConfirm.shopId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const msg = await getErrorMessage(res, "Ошибка удаления заведения");
        throw new Error(msg);
      }
      setDeleteShopConfirm(null);
      fetchUsers(false);
    } catch (err: any) {
      setAlertModal({ isOpen: true, title: "Ошибка", message: err.message });
    }
  };

  // Batch Ban
  const handleBatchBan = async () => {
    if (selectedUserIds.size === 0) return;
    setIsBatchBanning(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const ids = Array.from(selectedUserIds);
      const res = await fetch("/api/dev/users/batch-ban", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ids, reason: batchBanReason })
      });
      if (!res.ok) {
        const msg = await getErrorMessage(res, "Ошибка массовой блокировки");
        throw new Error(msg);
      }
      setSelectedUserIds(new Set());
      setBatchBanModalOpen(false);
      fetchUsers(false);
    } catch (err: any) {
      setAlertModal({ isOpen: true, title: "Ошибка массовой блокировки", message: err.message });
    } finally {
      setIsBatchBanning(false);
    }
  };

  // Batch Unban Confirm
  const handleConfirmBatchUnban = async () => {
    if (selectedUserIds.size === 0) return;
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const ids = Array.from(selectedUserIds);
      const res = await fetch("/api/dev/users/batch-unban", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ids })
      });
      if (!res.ok) {
        const msg = await getErrorMessage(res, "Ошибка массовой разблокировки");
        throw new Error(msg);
      }
      setSelectedUserIds(new Set());
      setBatchUnbanConfirm(false);
      fetchUsers(false);
    } catch (err: any) {
      setAlertModal({ isOpen: true, title: "Ошибка", message: err.message });
    }
  };

  // Toggle user expansion for shops
  const toggleUserExpansion = (id: string) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Email",
      "Имя",
      "Телефон",
      "Telegram",
      "Компания",
      "Тариф",
      "Статус",
      "Причина бана",
      "Заведений",
      "Заказов",
      "Выручка (₽)",
      "Дата регистрации"
    ];
    const rows = users.map((u) => [
      u.id,
      `"${u.email || ""}"`,
      `"${(u.name || "").replace(/"/g, '""')}"`,
      `"${(u.phone || "").replace(/"/g, '""')}"`,
      `"${(u.telegramHandle || "").replace(/"/g, '""')}"`,
      `"${(u.companyName || "").replace(/"/g, '""')}"`,
      u.plan || "FREE",
      u.isBanned ? "BANNED" : "ACTIVE",
      `"${(u.banReason || "").replace(/"/g, '""')}"`,
      u.shopsCount || 0,
      u.totalOrdersCount || 0,
      u.totalRevenue || 0,
      u.createdAt || ""
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `users_platform_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Filtered and sorted users
  const filteredUsers = useMemo(() => {
    let result = users.filter((u) => {
      if (statusFilter === "ACTIVE" && u.isBanned) return false;
      if (statusFilter === "BANNED" && !u.isBanned) return false;

      if (planFilter !== "ALL" && u.plan !== planFilter) return false;

      if (shopsFilter === "WITH_SHOPS" && (u.shopsCount || 0) === 0) return false;
      if (shopsFilter === "NO_SHOPS" && (u.shopsCount || 0) > 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesEmail = (u.email || "").toLowerCase().includes(q);
        const matchesName = (u.name || "").toLowerCase().includes(q);
        const matchesPhone = (u.phone || "").toLowerCase().includes(q);
        const matchesTg = (u.telegramHandle || "").toLowerCase().includes(q);
        const matchesCompany = (u.companyName || "").toLowerCase().includes(q);
        const matchesId = (u.id || "").toLowerCase().includes(q);
        const matchesShop = (u.shops || []).some(
          (s) =>
            s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q)
        );

        if (
          !matchesEmail &&
          !matchesName &&
          !matchesPhone &&
          !matchesTg &&
          !matchesCompany &&
          !matchesId &&
          !matchesShop
        ) {
          return false;
        }
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "NEWEST") {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === "OLDEST") {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (sortBy === "REVENUE") {
        return (b.totalRevenue || 0) - (a.totalRevenue || 0);
      }
      if (sortBy === "ORDERS") {
        return (b.totalOrdersCount || 0) - (a.totalOrdersCount || 0);
      }
      if (sortBy === "SHOPS") {
        return (b.shopsCount || 0) - (a.shopsCount || 0);
      }
      if (sortBy === "EMAIL") {
        return (a.email || "").localeCompare(b.email || "");
      }
      return 0;
    });

    return result;
  }, [users, statusFilter, planFilter, shopsFilter, searchQuery, sortBy]);

  // Selection helpers
  const isAllSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((u) => selectedUserIds.has(u.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Open Edit Modal
  const openEditModal = (targetUser: DevUser) => {
    setEditModalUser(targetUser);
    setEditForm({
      name: targetUser.name || "",
      phone: targetUser.phone || "",
      telegramHandle: targetUser.telegramHandle || "",
      companyName: targetUser.companyName || "",
      plan: targetUser.plan || "FREE",
      subscriptionDays: 365,
      newPassword: ""
    });
  };

  // Open Ban Modal
  const openBanModal = (targetUser: DevUser) => {
    setBanModalUser(targetUser);
    setBanReason(BAN_REASONS[0]);
    setCustomBanReason("");
    setDisableShopsOnBan(true);
  };

  // Format currency
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0
    }).format(val);
  };

  // If unauthorized
  if (!authLoading && !isDeveloperUser) {
    return (
      <div className="min-h-screen bg-app-bg text-app-primary flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-app-surface border border-app-border rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 bg-app-card text-app-text-secondary rounded-2xl flex items-center justify-center mx-auto border border-app-border">
            <ShieldAlert size={28} />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-app-card text-app-text-secondary border border-app-border uppercase tracking-wider">
              403 Forbidden • Доступ ограничен
            </div>
            <h2 className="text-xl font-bold text-app-primary">Панель контроля разработчика</h2>
            <p className="text-xs text-app-muted font-sans leading-relaxed">
              Страница управления пользователями и блокировки доступна только для аккаунтов разработчиков.
            </p>
            {user?.email && (
              <p className="text-[11px] text-app-muted font-mono pt-1">
                Текущий аккаунт: <span className="text-app-primary font-medium">{user.email}</span>
              </p>
            )}
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate("/admin")}
              className="w-full py-2.5 px-4 bg-app-accent hover:opacity-90 text-app-accent-fg font-mono font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} />
              <span>Вернуться в панель заведений</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-primary flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-app-surface/90 backdrop-blur-md border-b border-app-border px-2 sm:px-4 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between shadow-xs gap-1.5 sm:gap-2 select-none">
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            onClick={() => navigate("/admin")}
            className="p-1.5 sm:p-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-app-secondary hover:text-app-primary transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono shrink-0 flex-none"
            title="Вернуться в панель управления заведениями"
          >
            <ArrowLeft size={15} className="shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">Панель управления</span>
          </button>

          <div className="hidden sm:block h-4 w-[1px] bg-app-border mx-0.5 shrink-0" />

          {/* Nav pills */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-app-card p-0.5 sm:p-1 rounded-xl border border-app-border shrink-0 flex-none">
            <button
              className="p-1.5 sm:px-3 sm:py-1 bg-app-accent text-app-accent-fg rounded-lg text-xs font-mono font-bold shadow-xs flex items-center gap-1 sm:gap-1.5 shrink-0 flex-none"
              title="Пользователи"
            >
              <Users size={14} className="shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Пользователи</span>
            </button>
            <button
              onClick={() => navigate("/dev-reports")}
              className="p-1.5 sm:px-3 sm:py-1 text-app-muted hover:text-app-primary hover:bg-app-hover rounded-lg text-xs font-mono transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0 flex-none"
              title="Репорты"
            >
              <Shield size={14} className="shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Репорты</span>
            </button>
          </div>

          <div className="hidden xl:flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-app-text-secondary bg-app-card border border-app-border flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>DEV ACCESS</span>
              <span className="text-app-muted">•</span>
              <span className="text-app-text-primary font-medium">{user?.email}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-none">
          {/* Sound toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-1.5 sm:p-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono transition-colors cursor-pointer shrink-0 flex-none ${
              soundEnabled ? "text-emerald-500" : "text-app-muted"
            }`}
            title={soundEnabled ? "Звуковые сигналы включены" : "Звуковые сигналы отключены"}
          >
            {soundEnabled ? <Volume2 size={15} className="shrink-0" /> : <VolumeX size={15} className="shrink-0" />}
          </button>

          {/* Realtime WebSocket indicator */}
          <div
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-app-card border border-app-border rounded-xl text-[11px] font-mono transition-all duration-150 select-none shrink-0 flex-none ${
              isConnected
                ? "text-emerald-400 border-app-border hover:border-emerald-500/30"
                : "text-amber-400 border-app-border animate-pulse"
            }`}
            title={isConnected ? "WebSocket соединение активно (Realtime)" : "Переподключение WebSocket..."}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isConnected
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                  : "bg-amber-500"
              }`}
            />
            <span className="hidden sm:inline font-bold tracking-tight whitespace-nowrap">
              {isConnected ? "Realtime активен" : "Синхронизация..."}
            </span>
            <span className="sm:hidden font-bold text-[10px] tracking-tight whitespace-nowrap">
              {isConnected ? "Realtime" : "Sync"}
            </span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-app-muted hover:text-app-primary transition-all cursor-pointer shrink-0 flex-none"
            title={theme === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
          >
            {theme === "dark" ? <Sun size={15} className="shrink-0" /> : <Moon size={15} className="shrink-0" />}
          </button>

          {/* Refresh button - Icon only matching Sound and Theme buttons */}
          <button
            onClick={() => fetchUsers(true)}
            disabled={isRefreshing}
            className="p-1.5 sm:p-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-app-muted hover:text-app-primary transition-all cursor-pointer shrink-0 flex-none disabled:opacity-50"
            title="Обновить список пользователей"
          >
            <RefreshCw size={15} className={`shrink-0 ${isRefreshing ? "animate-spin text-app-primary" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-8 space-y-6">
        {/* Error Alert Banner */}
        {error && (
          <div className="p-3.5 bg-app-card border border-app-border rounded-2xl flex items-center justify-between text-app-text-primary text-xs font-mono">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchUsers(true)}
              className="px-2.5 py-1 bg-app-surface hover:bg-app-hover border border-app-border rounded-lg transition-all cursor-pointer font-medium shrink-0 text-app-text-primary"
            >
              Повторить
            </button>
          </div>
        )}

        {/* Top Bento Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
          {/* Total Users */}
          <div className="p-3.5 sm:p-4 bg-app-surface border border-app-border rounded-2xl flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-app-muted">
              <span className="text-[11px] font-mono uppercase tracking-wider font-medium">Всего юзеров</span>
              <Users size={16} className="text-app-text-secondary" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-app-primary tracking-tight">
              {stats ? stats.totalUsers : users.length}
            </div>
            <div className="text-[10px] text-app-muted font-mono mt-0.5">В базе платформы</div>
          </div>

          {/* Active Users */}
          <div className="p-3.5 sm:p-4 bg-app-surface border border-app-border rounded-2xl flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-app-muted">
              <span className="text-[11px] font-mono uppercase tracking-wider font-medium">Активные</span>
              <ShieldCheck size={16} className="text-emerald-400/90" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-app-primary tracking-tight">
              {stats ? stats.activeUsers : users.filter((u) => !u.isBanned).length}
            </div>
            <div className="text-[10px] text-app-muted font-mono mt-0.5">Без ограничений</div>
          </div>

          {/* Banned Users */}
          <div className="p-3.5 sm:p-4 bg-app-surface border border-app-border rounded-2xl flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-app-muted">
              <span className="text-[11px] font-mono uppercase tracking-wider font-medium">Забанены</span>
              <Ban size={16} className="text-rose-400/80" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-app-primary tracking-tight">
              {stats ? stats.bannedUsers : users.filter((u) => u.isBanned).length}
            </div>
            <div className="text-[10px] text-app-muted font-mono mt-0.5">Блокировка доступа</div>
          </div>

          {/* PRO & Enterprise */}
          <div className="p-3.5 sm:p-4 bg-app-surface border border-app-border rounded-2xl flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-app-muted">
              <span className="text-[11px] font-mono uppercase tracking-wider font-medium">Платные PRO</span>
              <Crown size={16} className="text-amber-400/80" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-app-primary tracking-tight">
              {stats ? stats.paidUsers : users.filter((u) => u.plan && u.plan !== "FREE").length}
            </div>
            <div className="text-[10px] text-app-muted font-mono mt-0.5">PRO и Enterprise</div>
          </div>

          {/* Total Shops */}
          <div className="p-3.5 sm:p-4 bg-app-surface border border-app-border rounded-2xl flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-app-muted">
              <span className="text-[11px] font-mono uppercase tracking-wider font-medium">Заведений</span>
              <Store size={16} className="text-indigo-400/80" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-app-primary tracking-tight">
              {stats ? stats.totalShops : users.reduce((acc, u) => acc + (u.shopsCount || 0), 0)}
            </div>
            <div className="text-[10px] text-app-muted font-mono mt-0.5">Все витрины</div>
          </div>

          {/* Total Revenue */}
          <div className="p-3.5 sm:p-4 bg-app-surface border border-app-border rounded-2xl flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-app-muted">
              <span className="text-[11px] font-mono uppercase tracking-wider font-medium">Оборот</span>
              <Coins size={16} className="text-app-text-secondary" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-app-primary tracking-tight truncate">
              {formatMoney(stats ? stats.totalRevenue : users.reduce((acc, u) => acc + (u.totalRevenue || 0), 0))}
            </div>
            <div className="text-[10px] text-app-muted font-mono mt-0.5">
              Заказов: {stats ? stats.totalOrders : users.reduce((acc, u) => acc + (u.totalOrdersCount || 0), 0)}
            </div>
          </div>
        </div>

        {/* Filter and Control Bar */}
        <div className="p-4 bg-app-surface border border-app-border rounded-2xl space-y-3.5 shadow-2xs">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-muted" size={16} />
              <input
                type="text"
                placeholder="Поиск по E-mail, имени, телефону, Telegram @username, заведению..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-app-card border border-app-border rounded-xl text-xs font-sans text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-border transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-primary p-0.5 rounded cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Actions & Export */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Batch Actions Button if selection exists */}
              {selectedUserIds.size > 0 && (
                <div className="flex items-center gap-2 bg-app-card p-1 rounded-xl border border-app-border animate-in fade-in duration-150">
                  <span className="text-xs font-mono font-medium text-app-primary px-2">
                    Выбрано: {selectedUserIds.size}
                  </span>
                  <button
                    onClick={() => setBatchBanModalOpen(true)}
                    className="px-2.5 py-1 bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Ban size={13} />
                    <span>Забанить</span>
                  </button>
                  <button
                    onClick={() => setBatchUnbanConfirm(true)}
                    className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Unlock size={13} />
                    <span>Разбанить</span>
                  </button>
                </div>
              )}

              {/* View Switcher */}
              <div className="flex items-center bg-app-card p-1 rounded-xl border border-app-border">
                <button
                  onClick={() => setViewMode("CARDS")}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    viewMode === "CARDS"
                      ? "bg-app-surface text-app-primary font-medium border border-app-border"
                      : "text-app-muted hover:text-app-primary"
                  }`}
                >
                  Карточки
                </button>
                <button
                  onClick={() => setViewMode("TABLE")}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    viewMode === "TABLE"
                      ? "bg-app-surface text-app-primary font-medium border border-app-border"
                      : "text-app-muted hover:text-app-primary"
                  }`}
                >
                  Таблица
                </button>
              </div>

              {/* Export CSV */}
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-text-secondary hover:text-app-primary rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer"
                title="Экспорт списка пользователей в CSV"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Экспорт CSV</span>
              </button>
            </div>
          </div>

          {/* Filter Pills row */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs font-mono pt-2 border-t border-app-border/50">
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0 -mx-1 px-1 shrink-0">
              {/* Status Filter */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-app-muted pr-0.5 text-[11px]">Статус:</span>
                <div className="flex items-center gap-0.5 bg-app-card p-0.5 rounded-xl border border-app-border">
                  {[
                    { id: "ALL", label: `Все (${users.length})` },
                    { id: "ACTIVE", label: `Активные (${users.filter((u) => !u.isBanned).length})` },
                    { id: "BANNED", label: `Забанены (${users.filter((u) => u.isBanned).length})` }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setStatusFilter(item.id as StatusFilter)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        statusFilter === item.id
                          ? "bg-app-surface text-app-primary font-medium border border-app-border"
                          : "text-app-muted hover:text-app-primary"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan Filter */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-app-muted pr-0.5 text-[11px]">Тариф:</span>
                <div className="flex items-center gap-0.5 bg-app-card p-0.5 rounded-xl border border-app-border">
                  {["ALL", "FREE", "PRO", "ENTERPRISE"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlanFilter(p as PlanFilter)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        planFilter === p
                          ? "bg-app-surface text-app-primary font-medium border border-app-border"
                          : "text-app-muted hover:text-app-primary"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shops Filter */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-app-muted pr-0.5 text-[11px]">Заведения:</span>
                <div className="flex items-center gap-0.5 bg-app-card p-0.5 rounded-xl border border-app-border">
                  {[
                    { id: "ALL", label: "Все" },
                    { id: "WITH_SHOPS", label: "С заведениями" },
                    { id: "NO_SHOPS", label: "Без заведений" }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setShopsFilter(s.id as ShopsFilter)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        shopsFilter === s.id
                          ? "bg-app-surface text-app-primary font-medium border border-app-border"
                          : "text-app-muted hover:text-app-primary"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sort Custom Dropdown */}
            <div className="w-full lg:w-48 shrink-0">
              <CustomDropdown
                value={sortBy}
                onChange={(val) => setSortBy(val as SortOption)}
                options={[
                  { value: "NEWEST", label: "Сначала новые" },
                  { value: "OLDEST", label: "Сначала старые" },
                  { value: "REVENUE", label: "По выручке" },
                  { value: "ORDERS", label: "По заказам" },
                  { value: "SHOPS", label: "По заведениям" },
                  { value: "EMAIL", label: "По Email" }
                ]}
              />
            </div>
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-6 bg-app-surface border border-app-border rounded-2xl animate-pulse space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-app-card rounded-2xl" />
                    <div className="space-y-2">
                      <div className="w-48 h-4 bg-app-card rounded" />
                      <div className="w-32 h-3 bg-app-card rounded" />
                    </div>
                  </div>
                  <div className="w-24 h-8 bg-app-card rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          /* Empty State */
          <div className="p-12 bg-app-surface border border-app-border rounded-2xl text-center space-y-4 shadow-2xs">
            <div className="w-16 h-16 bg-app-card rounded-2xl flex items-center justify-center mx-auto text-app-muted border border-app-border">
              <Users size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-app-primary">Пользователи не найдены</h3>
              <p className="text-xs text-app-muted max-w-sm mx-auto">
                {searchQuery
                  ? "По вашему запросу ничего не найдено. Попробуйте изменить параметры поиска."
                  : "На платформе пока нет пользователей по заданным фильтрам."}
              </p>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-primary transition-all cursor-pointer"
              >
                Сбросить поиск
              </button>
            )}
          </div>
        ) : viewMode === "CARDS" ? (
          /* CARDS VIEW */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-app-muted px-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 hover:text-app-primary cursor-pointer"
                >
                  {isAllSelected ? <CheckSquare size={14} className="text-app-primary" /> : <Square size={14} />}
                  <span>Выбрать всех ({filteredUsers.length})</span>
                </button>
              </div>
              <div>Показано: {filteredUsers.length} из {users.length}</div>
            </div>

            {filteredUsers.map((targetUser) => {
              const isSelected = selectedUserIds.has(targetUser.id);
              const isExpanded = expandedUserIds.has(targetUser.id);
              const isDev =
                targetUser.email.toLowerCase().trim() === "gelgaev.dev@mail.ru" ||
                targetUser.email.toLowerCase().trim() === "roninfortnite71@gmail.com";

              return (
                <div
                  key={targetUser.id}
                  className={`bg-app-surface border rounded-2xl p-4 sm:p-5 transition-all shadow-2xs ${
                    targetUser.isBanned
                      ? "border-rose-500/20 bg-rose-500/[0.02]"
                      : isSelected
                      ? "border-app-border bg-app-card/30"
                      : "border-app-border hover:border-app-border/80"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelectUser(targetUser.id)}
                        disabled={isDev}
                        className={`mt-1.5 p-1 rounded-md cursor-pointer transition-colors ${
                          isDev ? "opacity-30 cursor-not-allowed" : "hover:text-app-primary text-app-muted"
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-app-primary" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>

                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {targetUser.avatarUrl ? (
                          <img
                            src={targetUser.avatarUrl}
                            alt={targetUser.name || targetUser.email}
                            className="w-11 h-11 rounded-2xl object-cover border border-app-border"
                          />
                        ) : (
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-mono font-bold text-sm border ${
                            targetUser.isBanned
                              ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/20"
                              : isDev
                              ? "bg-app-card text-app-primary border-app-border"
                              : "bg-app-card text-app-primary border-app-border"
                          }`}>
                            {(targetUser.name || targetUser.email).slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {targetUser.isBanned && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500/80 text-white rounded-full flex items-center justify-center text-[9px] shadow-sm">
                            <Ban size={10} />
                          </div>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-app-primary truncate">
                            {targetUser.name || "Без имени"}
                          </h3>

                          {/* Plan Badge */}
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider ${
                            targetUser.plan === "ENTERPRISE"
                              ? "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20"
                              : targetUser.plan === "PRO"
                              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20"
                              : "bg-app-card text-app-muted border border-app-border"
                          }`}>
                            {targetUser.plan || "FREE"}
                          </span>

                          {/* Status Badge */}
                          {targetUser.isBanned ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20 flex items-center gap-1">
                              <Ban size={10} />
                              ЗАБЛОКИРОВАН
                            </span>
                          ) : isDev ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1">
                              <Shield size={10} />
                              РАЗРАБОТЧИК
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                              АКТИВЕН
                            </span>
                          )}
                        </div>

                        {/* Contacts bar */}
                        <div className="flex items-center gap-3 flex-wrap text-xs text-app-muted font-mono">
                          {/* Email */}
                          <div className="flex items-center gap-1 text-app-primary font-medium">
                            <Mail size={12} className="text-app-muted" />
                            <span>{targetUser.email}</span>
                            <button
                              onClick={() => handleCopy(targetUser.email, `email-${targetUser.id}`)}
                              className="p-0.5 hover:text-app-primary cursor-pointer transition-colors"
                              title="Скопировать E-mail"
                            >
                              {copiedKey === `email-${targetUser.id}` ? (
                                <Check size={12} className="text-emerald-500" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>

                          {/* Phone */}
                          {targetUser.phone && (
                            <div className="flex items-center gap-1">
                              <Phone size={12} />
                              <span>{targetUser.phone}</span>
                            </div>
                          )}

                          {/* Telegram */}
                          {targetUser.telegramHandle && (
                            <a
                              href={`https://t.me/${targetUser.telegramHandle.replace("@", "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-app-text-secondary hover:underline"
                            >
                              <Send size={11} />
                              <span>{targetUser.telegramHandle}</span>
                            </a>
                          )}

                          {/* Company */}
                          {targetUser.companyName && (
                            <div className="flex items-center gap-1 text-app-secondary">
                              <Building2 size={12} />
                              <span>{targetUser.companyName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Developer Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap self-end lg:self-center shrink-0">
                      {/* BAN / UNBAN BUTTON */}
                      {targetUser.isBanned ? (
                        <button
                          onClick={() => setUnbanConfirmUser(targetUser)}
                          className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Разблокировать пользователя"
                        >
                          <Unlock size={14} />
                          <span>Разбанить</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => openBanModal(targetUser)}
                          disabled={isDev}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                            isDev
                              ? "bg-app-card text-app-muted border border-app-border opacity-50 cursor-not-allowed"
                              : "bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/25 cursor-pointer"
                          }`}
                          title={isDev ? "Нельзя забанить разработчика" : "Забанить пользователя и отключить его заведения"}
                        >
                          <Ban size={14} />
                          <span>Забанить</span>
                        </button>
                      )}

                      {/* QUICK PLAN SWITCH */}
                      <CustomDropdown
                        value={targetUser.plan || "FREE"}
                        onChange={(newPlan) =>
                          handleQuickPlanChange(
                            targetUser.id,
                            newPlan as "FREE" | "PRO" | "ENTERPRISE"
                          )
                        }
                        options={[
                          { value: "FREE", label: "FREE" },
                          { value: "PRO", label: "PRO" },
                          { value: "ENTERPRISE", label: "ENTERPRISE" }
                        ]}
                        size="sm"
                        align="right"
                      />

                      {/* EDIT USER */}
                      <button
                        onClick={() => openEditModal(targetUser)}
                        className="p-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-app-secondary hover:text-app-primary transition-all cursor-pointer"
                        title="Редактировать контакты или сбросить пароль"
                      >
                        <Edit3 size={14} />
                      </button>

                      {/* DELETE USER */}
                      <button
                        onClick={() => setDeleteConfirmUser(targetUser)}
                        disabled={isDev}
                        className={`p-2 rounded-xl transition-all border ${
                          isDev
                            ? "bg-app-card text-app-muted border-app-border opacity-40 cursor-not-allowed"
                            : "bg-app-card hover:bg-rose-500/10 border-app-border text-app-muted hover:text-rose-400 hover:border-rose-500/20 cursor-pointer"
                        }`}
                        title={isDev ? "Нельзя удалить разработчика" : "Удалить пользователя и все его данные"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Ban Notice Banner if user is banned */}
                  {targetUser.isBanned && (
                    <div className="mt-3 p-3 bg-app-card border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 font-mono">
                      <ShieldAlert size={16} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-semibold text-rose-800 dark:text-rose-300">Причина блокировки:</div>
                        <div className="text-app-primary font-sans">{targetUser.banReason || "Нарушение условий использования"}</div>
                        {targetUser.bannedAt && (
                          <div className="text-[10px] text-app-muted">
                            Дата бана: {new Date(targetUser.bannedAt).toLocaleString("ru-RU")}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Summary Metric Chips */}
                  <div className="mt-3 pt-3 border-t border-app-border/70 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    {/* Shops count with toggle */}
                    <button
                      onClick={() => toggleUserExpansion(targetUser.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                        isExpanded
                          ? "bg-app-card border-app-border text-app-primary font-medium"
                          : "bg-app-card/60 border-app-border/80 text-app-secondary hover:text-app-primary hover:bg-app-card"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Store size={13} className="text-indigo-400 shrink-0" />
                        <span>Заведений: <strong>{targetUser.shopsCount || 0}</strong></span>
                      </div>
                      {targetUser.shopsCount > 0 && (
                        isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </button>

                    {/* Orders count */}
                    <div className="p-2 bg-app-card/60 border border-app-border/80 rounded-xl flex items-center gap-1.5 text-app-secondary">
                      <ShoppingBag size={13} className="text-amber-400 shrink-0" />
                      <span>Заказов: <strong className="text-app-primary">{targetUser.totalOrdersCount || 0}</strong></span>
                    </div>

                    {/* Revenue */}
                    <div className="p-2 bg-app-card/60 border border-app-border/80 rounded-xl flex items-center gap-1.5 text-app-secondary">
                      <Coins size={13} className="text-emerald-400 shrink-0" />
                      <span>Выручка: <strong className="text-app-primary">{formatMoney(targetUser.totalRevenue || 0)}</strong></span>
                    </div>

                    {/* Reg Date */}
                    <div className="p-2 bg-app-card/60 border border-app-border/80 rounded-xl flex items-center gap-1.5 text-app-muted truncate">
                      <span>Рег: {new Date(targetUser.createdAt).toLocaleDateString("ru-RU")}</span>
                    </div>
                  </div>

                  {/* Expanded Shops Sub-list */}
                  <AnimatePresence>
                    {isExpanded && targetUser.shops && targetUser.shops.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-app-border space-y-2 overflow-hidden"
                      >
                        <div className="text-[11px] font-mono font-bold text-app-muted uppercase tracking-wider">
                          Привязанные витрины и заведения ({targetUser.shops.length}):
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {targetUser.shops.map((s) => (
                            <div
                              key={s.id}
                              className="p-3 bg-app-card border border-app-border rounded-xl flex items-center justify-between gap-2 text-xs font-mono"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5 font-bold text-app-primary truncate">
                                  <span>{s.name}</span>
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${s.isOpen ? "bg-emerald-500" : "bg-app-muted"}`} />
                                </div>
                                <div className="text-[10px] text-app-muted truncate">
                                  slug: /{s.slug} • услуг: {s.servicesCount} • заказов: {s.ordersCount}
                                </div>
                                <div className="text-[10px] text-app-text-secondary">
                                  Выручка: {formatMoney(s.totalRevenue)}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleToggleShop(s.id, s.isOpen)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                    s.isOpen
                                      ? "bg-app-surface text-app-text-secondary border-app-border hover:bg-app-hover"
                                      : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                                  }`}
                                >
                                  {s.isOpen ? "Закрыть" : "Открыть"}
                                </button>
                                <button
                                  onClick={() => setDeleteShopConfirm({ shopId: s.id, shopName: s.name })}
                                  className="p-1 text-app-muted hover:text-rose-400 rounded-lg hover:bg-app-surface border border-transparent hover:border-app-border transition-all cursor-pointer"
                                  title="Удалить заведение"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW WITH HORIZONTAL SCROLL */
          <div className="bg-app-surface border border-app-border rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-app-card/60 border-b border-app-border text-app-muted uppercase tracking-wider text-[10px]">
                    <th className="p-3 w-8">
                      <button onClick={toggleSelectAll} className="cursor-pointer">
                        {isAllSelected ? <CheckSquare size={14} className="text-app-primary" /> : <Square size={14} />}
                      </button>
                    </th>
                    <th className="p-3">Пользователь</th>
                    <th className="p-3">E-mail</th>
                    <th className="p-3">Тариф</th>
                    <th className="p-3">Статус</th>
                    <th className="p-3">Заведений</th>
                    <th className="p-3">Заказов</th>
                    <th className="p-3">Выручка</th>
                    <th className="p-3">Регистрация</th>
                    <th className="p-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border/50">
                  {filteredUsers.map((targetUser) => {
                    const isSelected = selectedUserIds.has(targetUser.id);
                    const isDev =
                      targetUser.email.toLowerCase().trim() === "gelgaev.dev@mail.ru" ||
                      targetUser.email.toLowerCase().trim() === "roninfortnite71@gmail.com";

                    return (
                      <tr
                        key={targetUser.id}
                        className={`hover:bg-app-card/30 transition-colors ${
                          targetUser.isBanned ? "bg-rose-500/[0.02]" : ""
                        }`}
                      >
                        <td className="p-3">
                          <button
                            onClick={() => toggleSelectUser(targetUser.id)}
                            disabled={isDev}
                            className="cursor-pointer disabled:opacity-30"
                          >
                            {isSelected ? (
                              <CheckSquare size={14} className="text-app-primary" />
                            ) : (
                              <Square size={14} />
                            )}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-app-primary truncate max-w-[150px]">
                            {targetUser.name || "Без имени"}
                          </div>
                          {targetUser.phone && (
                            <div className="text-[10px] text-app-muted truncate">{targetUser.phone}</div>
                          )}
                        </td>
                        <td className="p-3 text-app-primary">{targetUser.email}</td>
                        <td className="p-3">
                          <CustomDropdown
                            value={targetUser.plan || "FREE"}
                            onChange={(newPlan) =>
                              handleQuickPlanChange(
                                targetUser.id,
                                newPlan as "FREE" | "PRO" | "ENTERPRISE"
                              )
                            }
                            options={[
                              { value: "FREE", label: "FREE" },
                              { value: "PRO", label: "PRO" },
                              { value: "ENTERPRISE", label: "ENTERPRISE" }
                            ]}
                            size="sm"
                            align="left"
                          />
                        </td>
                        <td className="p-3">
                          {targetUser.isBanned ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20 font-semibold">
                              BANNED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-semibold">
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold">{targetUser.shopsCount || 0}</td>
                        <td className="p-3">{targetUser.totalOrdersCount || 0}</td>
                        <td className="p-3 font-bold">{formatMoney(targetUser.totalRevenue || 0)}</td>
                        <td className="p-3 text-app-muted text-[11px]">
                          {new Date(targetUser.createdAt).toLocaleDateString("ru-RU")}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {targetUser.isBanned ? (
                              <button
                                onClick={() => setUnbanConfirmUser(targetUser)}
                                className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                                title="Разблокировать"
                              >
                                <Unlock size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => openBanModal(targetUser)}
                                disabled={isDev}
                                className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer disabled:opacity-30"
                                title="Заблокировать"
                              >
                                <Ban size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(targetUser)}
                              className="p-1.5 text-app-secondary hover:text-app-primary rounded-lg cursor-pointer"
                              title="Редактировать"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmUser(targetUser)}
                              disabled={isDev}
                              className="p-1.5 text-app-muted hover:text-rose-400 rounded-lg cursor-pointer disabled:opacity-30"
                              title="Удалить"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* BAN USER MODAL */}
      {/* ========================================================= */}
      <AnimatePresence>
        {banModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-app-surface border border-app-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-app-border pb-3">
                <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-300 font-bold text-base">
                  <div className="p-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl">
                    <ShieldAlert size={18} />
                  </div>
                  <span>Блокировка пользователя</span>
                </div>
                <button
                  onClick={() => setBanModalUser(null)}
                  className="p-1 text-app-muted hover:text-app-primary rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-app-card border border-app-border rounded-xl space-y-1">
                  <div className="text-app-muted">Блокируемый аккаунт:</div>
                  <div className="text-app-primary font-bold text-sm">{banModalUser.email}</div>
                  <div className="text-[11px] text-app-muted">Имя: {banModalUser.name || "—"} • Заведений: {banModalUser.shopsCount}</div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-app-secondary font-medium">Выберите причину блокировки:</label>
                  <div className="space-y-1.5">
                    {BAN_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setBanReason(r);
                          setCustomBanReason("");
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                          banReason === r && !customBanReason
                            ? "bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 font-semibold"
                            : "bg-app-card border-app-border text-app-secondary hover:text-app-primary hover:bg-app-bg"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-app-secondary font-medium">Либо укажите свою причину:</label>
                  <textarea
                    rows={2}
                    placeholder="Например: Подозрение в мошеннических операциях..."
                    value={customBanReason}
                    onChange={(e) => setCustomBanReason(e.target.value)}
                    className="w-full p-2.5 bg-app-card border border-app-border rounded-xl text-xs text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-border"
                  />
                </div>

                <label className="flex items-center gap-2 p-2.5 bg-app-card border border-app-border rounded-xl cursor-pointer text-app-primary">
                  <input
                    type="checkbox"
                    checked={disableShopsOnBan}
                    onChange={(e) => setDisableShopsOnBan(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span>Также немедленно деактивировать все заведения этого пользователя</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-border">
                <button
                  type="button"
                  onClick={() => setBanModalUser(null)}
                  className="px-4 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-secondary rounded-xl text-xs font-mono cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleBanUser}
                  disabled={isBanning}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Ban size={14} />
                  <span>{isBanning ? "Блокировка..." : "Заблокировать аккаунт"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT USER MODAL */}
      <AnimatePresence>
        {editModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-app-surface border border-app-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-app-border pb-3">
                <div className="flex items-center gap-2 text-app-primary font-bold text-base">
                  <Edit3 size={18} className="text-app-primary" />
                  <span>Редактирование профиля</span>
                </div>
                <button
                  onClick={() => setEditModalUser(null)}
                  className="p-1 text-app-muted hover:text-app-primary rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-2.5 bg-app-card border border-app-border rounded-xl text-app-muted">
                  E-mail аккаунта: <strong className="text-app-primary">{editModalUser.email}</strong>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-app-muted">Имя / Фамилия:</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Иван Иванов"
                      className="w-full p-2 bg-app-card border border-app-border rounded-xl text-app-primary focus:outline-none focus:border-app-border"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-app-muted">Телефон:</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="+7 999 123-45-67"
                      className="w-full p-2 bg-app-card border border-app-border rounded-xl text-app-primary focus:outline-none focus:border-app-border"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-app-muted">Telegram Handle:</label>
                    <input
                      type="text"
                      value={editForm.telegramHandle}
                      onChange={(e) => setEditForm({ ...editForm, telegramHandle: e.target.value })}
                      placeholder="@username"
                      className="w-full p-2 bg-app-card border border-app-border rounded-xl text-app-primary focus:outline-none focus:border-app-border"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-app-muted">Организация / Бренд:</label>
                    <input
                      type="text"
                      value={editForm.companyName}
                      onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                      placeholder="ООО Компания"
                      className="w-full p-2 bg-app-card border border-app-border rounded-xl text-app-primary focus:outline-none focus:border-app-border"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-app-border">
                  <label className="text-app-muted flex items-center gap-1.5">
                    <Crown size={14} className="text-amber-400" />
                    <span>Тарифный план:</span>
                  </label>
                  <CustomDropdown
                    value={editForm.plan}
                    onChange={(val) => setEditForm({ ...editForm, plan: val })}
                    options={[
                      { value: "FREE", label: "FREE (Базовый)" },
                      { value: "PRO", label: "PRO (Продвинутый)" },
                      { value: "ENTERPRISE", label: "ENTERPRISE (Безлимитный)" }
                    ]}
                  />
                </div>

                <div className="space-y-1 pt-2 border-t border-app-border">
                  <label className="text-app-muted flex items-center gap-1.5">
                    <Key size={14} className="text-app-text-secondary" />
                    <span>Задать новый пароль для входа (опционально):</span>
                  </label>
                  <input
                    type="password"
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    placeholder="Оставьте пустым, если не нужно менять"
                    className="w-full p-2 bg-app-card border border-app-border rounded-xl text-app-primary focus:outline-none focus:border-app-border"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-border">
                <button
                  type="button"
                  onClick={() => setEditModalUser(null)}
                  className="px-4 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-secondary rounded-xl text-xs font-mono cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveUser}
                  disabled={isSavingUser}
                  className="px-4 py-2 bg-app-accent hover:opacity-90 text-app-accent-fg font-bold rounded-xl text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Check size={14} />
                  <span>{isSavingUser ? "Сохранение..." : "Сохранить профиль"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BATCH BAN MODAL */}
      <AnimatePresence>
        {batchBanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-app-surface border border-app-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-app-border pb-3">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-300 font-bold text-base">
                  <Ban size={18} />
                  <span>Массовая блокировка ({selectedUserIds.size})</span>
                </div>
                <button
                  onClick={() => setBatchBanModalOpen(false)}
                  className="p-1 text-app-muted hover:text-app-primary rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <p className="text-app-muted font-sans">
                  Выбранные аккаунты ({selectedUserIds.size}) будут заблокированы, а их заведения временно закрыты.
                </p>

                <div className="space-y-1.5">
                  <label className="text-app-secondary font-medium">Причина:</label>
                  <div className="space-y-1.5">
                    {BAN_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setBatchBanReason(r)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                          batchBanReason === r
                            ? "bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 font-semibold"
                            : "bg-app-card border-app-border text-app-secondary hover:text-app-primary hover:bg-app-bg"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-border">
                <button
                  type="button"
                  onClick={() => setBatchBanModalOpen(false)}
                  className="px-4 py-2 bg-app-card hover:bg-app-hover border border-app-border text-app-secondary rounded-xl text-xs font-mono cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleBatchBan}
                  disabled={isBatchBanning}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Ban size={14} />
                  <span>{isBatchBanning ? "Блокировка..." : `Забанить (${selectedUserIds.size})`}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION MODALS */}
      {/* 1. Unban confirm */}
      <ConfirmModal
        isOpen={Boolean(unbanConfirmUser)}
        onClose={() => setUnbanConfirmUser(null)}
        onConfirm={handleConfirmUnban}
        title="Разблокировка пользователя"
        message={
          <>
            Разблокировать доступ для аккаунта <strong className="text-app-primary">{unbanConfirmUser?.email}</strong>?
          </>
        }
        confirmText="Разблокировать"
        variant="info"
      />

      {/* 2. Delete user confirm */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmUser)}
        onClose={() => setDeleteConfirmUser(null)}
        onConfirm={handleDeleteUser}
        title="Удаление пользователя"
        message={
          <>
            Вы действительно хотите безвозвратно удалить пользователя <strong className="text-app-primary">{deleteConfirmUser?.email}</strong> со всеми его заведениями, блюдами и заказами?
          </>
        }
        confirmText="Удалить навсегда"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* 3. Delete shop confirm */}
      <ConfirmModal
        isOpen={Boolean(deleteShopConfirm)}
        onClose={() => setDeleteShopConfirm(null)}
        onConfirm={handleConfirmDeleteShop}
        title="Удаление заведения"
        message={
          <>
            Удалить заведение <strong className="text-app-primary">"{deleteShopConfirm?.shopName}"</strong> со всеми заказами, меню и данными?
          </>
        }
        confirmText="Удалить заведение"
        variant="danger"
      />

      {/* 4. Batch unban confirm */}
      <ConfirmModal
        isOpen={batchUnbanConfirm}
        onClose={() => setBatchUnbanConfirm(false)}
        onConfirm={handleConfirmBatchUnban}
        title="Массовая разблокировка"
        message={`Разблокировать выбранных пользователей (${selectedUserIds.size})?`}
        confirmText="Разблокировать всех"
        variant="info"
      />

      {/* 5. Alert modal for errors */}
      <ConfirmModal
        isOpen={Boolean(alertModal?.isOpen)}
        onClose={() => setAlertModal(null)}
        onConfirm={() => setAlertModal(null)}
        title={alertModal?.title || "Информация"}
        message={alertModal?.message || ""}
        confirmText="Понятно"
        cancelText="Закрыть"
        variant="warning"
      />
    </div>
  );
}
