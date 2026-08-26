import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Bug,
  Lightbulb,
  HelpCircle,
  Clock,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Search,
  ArrowLeft,
  Sun,
  Moon,
  ExternalLink,
  Shield,
  Send,
  Mail,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  AlertTriangle,
  Monitor,
  Calendar,
  Eye,
  X,
  MessageSquare,
  Sparkles,
  Volume2,
  VolumeX,
  ArrowUpDown,
  CheckSquare,
  Square,
  Filter,
  Layers,
  Phone,
  Radio,
  FileCode,
  Users
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useRealtime } from "../context/RealtimeContext";
import { BugReport } from "../types";
import { useScrollLock } from "../hooks/useScrollLock";
import {
  ReportStatusDropdown,
  ReportStatusType
} from "../components/reports/ReportStatusDropdown";
import { ConfirmModal } from "../components/ConfirmModal";
import { playNotificationSound, playToggleOnSound, playToggleOffSound } from "../lib/sound";

type SortOption = "NEWEST" | "OLDEST" | "STATUS" | "TYPE";

async function getErrorMessage(res: Response, defaultText: string): Promise<string> {
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (json && json.error) return json.error;
    } catch {
      if (text && text.length < 120 && !text.includes("<html")) {
        return text;
      }
    }
  } catch {}
  return defaultText;
}

export default function DeveloperReportsPage() {
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

  const [reports, setReports] = useState<BugReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem("dev_reports_sound") !== "false";
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [shopFilter, setShopFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("NEWEST");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);

  // Batch selections
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Selected report for expanded details / notes
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [devNotesState, setDevNotesState] = useState<Record<string, string>>({});
  const [isSavingNotes, setIsSavingNotes] = useState<string | null>(null);

  // Newly arrived real-time IDs for highlight
  const [newlyArrivedIds, setNewlyArrivedIds] = useState<Set<string>>(new Set());

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals & Lightbox
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string } | null>(null);

  // Global scroll locking for all open modals / lightboxes
  const isAnyModalOpen = Boolean(
    previewImage || deleteConfirmId || isBatchDeleteConfirmOpen || alertModal?.isOpen
  );
  useScrollLock(isAnyModalOpen);

  const sortMenuRef = useRef<HTMLDivElement>(null);
  const shopMenuRef = useRef<HTMLDivElement>(null);

  // Toggle sound
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem("dev_reports_sound", String(next));
    } catch {}
    if (next) {
      playToggleOnSound();
    } else {
      playToggleOffSound();
    }
  };

  // Close menus on outside click
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
      if (shopMenuRef.current && !shopMenuRef.current.contains(e.target as Node)) {
        setIsShopDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, []);

  const fetchReports = async (silent = false) => {
    if (!isDeveloperUser) {
      setIsLoading(false);
      return;
    }
    if (!silent) setIsRefreshing(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/reports", { headers });
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          throw new Error("Доступ запрещен. Страница доступна только для разработчика (gelgaev.dev@mail.ru)");
        }
        const msg = await getErrorMessage(res, "Не удалось загрузить отчёты");
        throw new Error(msg);
      }
      const data = await res.json();
      const loadedReports: BugReport[] = Array.isArray(data.reports) ? data.reports : [];
      setReports(loadedReports);

      // Pre-fill dev notes state
      const notesMap: Record<string, string> = {};
      loadedReports.forEach((r) => {
        if (r.id) {
          notesMap[r.id] = r.developerNotes || "";
        }
      });
      setDevNotesState(notesMap);
    } catch (err: any) {
      console.error("Reports load error:", err);
      setError(err.message || "Ошибка подключения к серверу");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (isDeveloperUser) {
        fetchReports();
      } else {
        setIsLoading(false);
      }
    }
  }, [authLoading, isDeveloperUser]);

  // Listen for realtime events
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === "NEW_REPORT" && lastEvent.payload) {
      const newRep = lastEvent.payload;
      if (soundEnabled) {
        playNotificationSound();
      }

      setReports((prev) => {
        if (prev.some((r) => r.id === newRep.id)) return prev;
        return [newRep, ...prev];
      });

      if (newRep.id) {
        setNewlyArrivedIds((prev) => new Set(prev).add(newRep.id));
        setDevNotesState((prev) => ({ ...prev, [newRep.id]: newRep.developerNotes || "" }));
        setTimeout(() => {
          setNewlyArrivedIds((prev) => {
            const next = new Set(prev);
            next.delete(newRep.id);
            return next;
          });
        }, 5000);
      }
    } else if (lastEvent.type === "REPORT_UPDATED" && lastEvent.payload) {
      const { id, status, developerNotes } = lastEvent.payload;
      setReports((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            return {
              ...r,
              ...(status ? { status } : {}),
              ...(developerNotes !== undefined ? { developerNotes } : {})
            };
          }
          return r;
        })
      );
      if (id && developerNotes !== undefined) {
        setDevNotesState((prev) => ({ ...prev, [id]: developerNotes }));
      }
    } else if (lastEvent.type === "REPORT_DELETED" && lastEvent.payload) {
      const { id } = lastEvent.payload;
      setReports((prev) => prev.filter((r) => r.id !== id));
      setSelectedIds((prev) => prev.filter((selId) => selId !== id));
    }
  }, [lastEvent, soundEnabled]);

  const handleUpdateStatus = async (reportId: string, newStatus: ReportStatusType) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: newStatus as any } : r))
    );

    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error("Не удалось обновить статус");
    } catch (err: any) {
      console.error("Update status error:", err);
      fetchReports(true);
    }
  };

  const handleSaveDevNotes = async (reportId: string) => {
    setIsSavingNotes(reportId);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const notes = devNotesState[reportId] || "";

      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ developerNotes: notes })
      });

      if (!res.ok) throw new Error("Ошибка при сохранении заметок");

      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, developerNotes: notes } : r))
      );

      setCopiedId(`saved_notes_${reportId}`);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err: any) {
      setAlertModal({ isOpen: true, title: "Ошибка", message: err.message || "Не удалось сохранить заметку" });
    } finally {
      setIsSavingNotes(null);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/reports/${reportId}`, {
        method: "DELETE",
        headers
      });

      if (!res.ok) throw new Error("Ошибка при удалении отчёта");

      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setSelectedIds((prev) => prev.filter((id) => id !== reportId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      setAlertModal({ isOpen: true, title: "Ошибка", message: err.message || "Не удалось удалить отчёт" });
    }
  };

  const handleBatchStatus = async (newStatus: ReportStatusType) => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);

    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/reports/batch-status", {
        method: "POST",
        headers,
        body: JSON.stringify({ ids: selectedIds, status: newStatus })
      });

      if (!res.ok) throw new Error("Ошибка при массовом обновлении");

      setReports((prev) =>
        prev.map((r) => (r.id && selectedIds.includes(r.id) ? { ...r, status: newStatus as any } : r))
      );
      setSelectedIds([]);
    } catch (err: any) {
      setAlertModal({ isOpen: true, title: "Ошибка", message: err.message || "Не удалось обновить выбранные отчёты" });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);

    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/reports/batch-delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ ids: selectedIds })
      });

      if (!res.ok) throw new Error("Ошибка при массовом удалении");

      setReports((prev) => prev.filter((r) => r.id && !selectedIds.includes(r.id)));
      setSelectedIds([]);
      setIsBatchDeleteConfirmOpen(false);
    } catch (err: any) {
      setAlertModal({ isOpen: true, title: "Ошибка", message: err.message || "Не удалось удалить выбранные отчёты" });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Get unique shop names for shop filter dropdown
  const uniqueShops = useMemo(() => {
    const shopsSet = new Set<string>();
    reports.forEach((r) => {
      if (r.shopName) shopsSet.add(r.shopName);
    });
    return Array.from(shopsSet).sort();
  }, [reports]);

  // Filtered and sorted reports
  const filteredReports = useMemo(() => {
    return reports
      .filter((r) => {
        if (typeFilter !== "ALL") {
          if (typeFilter === "OTHER") {
            if (r.type !== "OTHER" && r.type !== "QUESTION") return false;
          } else if (r.type !== typeFilter) {
            return false;
          }
        }
        if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
        if (shopFilter !== "ALL" && r.shopName !== shopFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesTitle = (r.title || "").toLowerCase().includes(q);
          const matchesDesc = (r.description || "").toLowerCase().includes(q);
          const matchesContact = (r.userContact || "").toLowerCase().includes(q);
          const matchesUserEmail = (r.userEmail || "").toLowerCase().includes(q);
          const matchesShop = (r.shopName || "").toLowerCase().includes(q);
          const matchesNotes = (r.developerNotes || "").toLowerCase().includes(q);
          const matchesId = (r.id || "").toLowerCase().includes(q);

          if (
            !matchesTitle &&
            !matchesDesc &&
            !matchesContact &&
            !matchesUserEmail &&
            !matchesShop &&
            !matchesNotes &&
            !matchesId
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "NEWEST") {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (sortBy === "OLDEST") {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        if (sortBy === "STATUS") {
          const orderMap: Record<string, number> = {
            NEW: 1,
            IN_PROGRESS: 2,
            RESOLVED: 3,
            REJECTED: 4
          };
          return (orderMap[a.status] || 99) - (orderMap[b.status] || 99);
        }
        if (sortBy === "TYPE") {
          return (a.type || "").localeCompare(b.type || "");
        }
        return 0;
      });
  }, [reports, typeFilter, statusFilter, shopFilter, searchQuery, sortBy]);

  // Statistics summary
  const stats = useMemo(() => {
    const total = reports.length;
    const newCount = reports.filter((r) => r.status === "NEW").length;
    const inProgressCount = reports.filter((r) => r.status === "IN_PROGRESS").length;
    const resolvedCount = reports.filter((r) => r.status === "RESOLVED").length;
    const bugs = reports.filter((r) => r.type === "BUG").length;
    const features = reports.filter((r) => r.type === "FEATURE").length;
    const others = reports.filter((r) => r.type === "OTHER" || r.type === "QUESTION").length;

    return { total, newCount, inProgressCount, resolvedCount, bugs, features, others };
  }, [reports]);

  // Select all handler
  const isAllSelected =
    filteredReports.length > 0 &&
    filteredReports.every((r) => r.id && selectedIds.includes(r.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReports.map((r) => r.id!).filter(Boolean));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Export handlers
  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Дата",
      "Тип",
      "Статус",
      "Тема",
      "Описание",
      "Заведение",
      "Email пользователя",
      "Контакт",
      "Заметки разработчика"
    ];

    const rows = reports.map((r) => [
      r.id || "",
      r.createdAt ? new Date(r.createdAt).toLocaleString("ru-RU") : "",
      r.type || "",
      r.status || "",
      `"${(r.title || "").replace(/"/g, '""')}"`,
      `"${(r.description || "").replace(/"/g, '""')}"`,
      `"${(r.shopName || "").replace(/"/g, '""')}"`,
      `"${(r.userEmail || "").replace(/"/g, '""')}"`,
      `"${(r.userContact || "").replace(/"/g, '""')}"`,
      `"${(r.developerNotes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reports_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(reports, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `reports_export_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  // If unauthorized
  if (!authLoading && !isDeveloperUser) {
    return (
      <div className="min-h-screen bg-app-bg text-app-primary flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-app-surface border border-app-border rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 bg-app-card text-app-text-secondary rounded-2xl flex items-center justify-center mx-auto border border-app-border">
            <Shield size={28} />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-app-card text-app-text-secondary border border-app-border uppercase tracking-wider">
              403 Forbidden • Доступ ограничен
            </div>
            <h2 className="text-xl font-bold text-app-primary">Панель отчётов и обратной связи</h2>
            <p className="text-xs text-app-muted font-sans leading-relaxed">
              Централизованный входящий шлюз для отчётов об ошибках и предложений доступен исключительно для аккаунта главного разработчика.
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
              <span>Вернуться в панель управления</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-primary flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
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
              onClick={() => navigate("/dev-users")}
              className="p-1.5 sm:px-3 sm:py-1 text-app-muted hover:text-app-primary hover:bg-app-hover rounded-lg text-xs font-mono transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0 flex-none"
              title="Пользователи"
            >
              <Users size={14} className="shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Пользователи</span>
            </button>
            <button
              className="p-1.5 sm:px-3 sm:py-1 bg-app-accent text-app-accent-fg rounded-lg text-xs font-mono font-bold shadow-xs flex items-center gap-1 sm:gap-1.5 shrink-0 flex-none"
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
            className={`relative p-1.5 sm:p-2 bg-app-card hover:bg-app-hover border rounded-xl text-xs font-mono transition-all cursor-pointer shrink-0 flex-none flex items-center justify-center ${
              soundEnabled
                ? "border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                : "border-app-border text-app-muted hover:text-app-primary"
            }`}
            title={soundEnabled ? "Звуковые уведомления включены (нажмите, чтобы выключить)" : "Звуковые уведомления отключены (нажмите, чтобы включить)"}
          >
            {soundEnabled ? (
              <>
                <Volume2 size={15} className="text-emerald-400 shrink-0" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-app-surface" />
              </>
            ) : (
              <VolumeX size={15} className="text-app-muted shrink-0" />
            )}
          </button>

          {/* Realtime WebSocket status */}
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

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-app-muted hover:text-app-primary transition-all cursor-pointer shrink-0 flex-none"
            title={theme === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
          >
            {theme === "dark" ? (
              <Sun size={15} className="shrink-0" />
            ) : (
              <Moon size={15} className="shrink-0" />
            )}
          </button>

          {/* Refresh button - Icon only matching Sound and Theme buttons */}
          <button
            onClick={() => fetchReports()}
            disabled={isRefreshing}
            className="p-1.5 sm:p-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-app-muted hover:text-app-primary transition-all cursor-pointer shrink-0 flex-none disabled:opacity-50"
            title="Обновить список отчётов"
          >
            <RefreshCw size={15} className={`shrink-0 ${isRefreshing ? "animate-spin text-app-primary" : ""}`} />
          </button>

          {/* Export Dropdown */}
          <div className="hidden md:flex items-center gap-1 shrink-0 flex-none">
            <button
              onClick={handleExportCSV}
              disabled={reports.length === 0}
              className="px-2.5 py-1.5 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-[11px] font-mono text-app-secondary hover:text-app-primary transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              title="Экспорт в CSV"
            >
              <Download size={13} className="shrink-0" />
              <span className="whitespace-nowrap">CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              disabled={reports.length === 0}
              className="px-2.5 py-1.5 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-[11px] font-mono text-app-secondary hover:text-app-primary transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              title="Экспорт в JSON"
            >
              <Download size={13} className="shrink-0" />
              <span className="whitespace-nowrap">JSON</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6">
        {/* Developer verified card banner */}
        <div className="p-3.5 sm:p-4 bg-app-surface border border-app-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-xs">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-app-card border border-app-border flex items-center justify-center text-app-primary shrink-0 shadow-xs mt-0.5 sm:mt-0">
              <Mail size={18} className="text-app-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span className="text-xs font-bold font-mono text-app-primary">
                  Главный аккаунт разработчика:
                </span>
                <span className="text-xs font-mono font-bold text-app-primary underline decoration-app-border break-all">
                  gelgaev.dev@mail.ru
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-app-muted font-sans leading-relaxed">
                Все поступающие репорты сохраняются в базу данных, дублируются на этот почтовый ящик и
                транслируются в реальном времени.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0 pt-1 sm:pt-0">
            <button
              onClick={() => handleCopy("gelgaev.dev@mail.ru", "dev_email")}
              className="w-full sm:w-auto justify-center px-3.5 py-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-secondary hover:text-app-primary transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedId === "dev_email" ? (
                <>
                  <Check size={13} className="text-emerald-500" />
                  <span className="text-emerald-500 font-semibold">Скопировано</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Копировать Email</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-app-surface border border-app-border rounded-2xl space-y-1 shadow-xs">
            <span className="text-[11px] font-mono text-app-muted uppercase tracking-wider block font-medium">
              Всего отчётов
            </span>
            <div className="text-xl font-bold font-mono text-app-primary">{stats.total}</div>
            <div className="text-[11px] font-mono text-app-muted flex items-center gap-1.5 pt-0.5">
              <span>Баги: {stats.bugs}</span>
              <span className="opacity-40">•</span>
              <span>Идеи: {stats.features}</span>
              <span className="opacity-40">•</span>
              <span>Прочее: {stats.others}</span>
            </div>
          </div>

          <div className="p-3.5 bg-app-surface border border-app-border rounded-2xl space-y-1 shadow-xs">
            <span className="text-[11px] font-mono text-app-muted uppercase tracking-wider block font-medium">
              Новые
            </span>
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-300 flex items-center gap-1.5">
              <span>{stats.newCount}</span>
              {stats.newCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              )}
            </div>
            <div className="text-[10px] font-mono text-app-muted">Требуют внимания</div>
          </div>

          <div className="p-3.5 bg-app-surface border border-app-border rounded-2xl space-y-1 shadow-xs">
            <span className="text-[11px] font-mono text-app-muted uppercase tracking-wider block font-medium">
              В работе
            </span>
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-300">{stats.inProgressCount}</div>
            <div className="text-[10px] font-mono text-app-muted">В процессе исправления</div>
          </div>

          <div className="p-3.5 bg-app-surface border border-app-border rounded-2xl space-y-1 shadow-xs">
            <span className="text-[11px] font-mono text-app-muted uppercase tracking-wider block font-medium">
              Решено / Закрыто
            </span>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-300">{stats.resolvedCount}</div>
            <div className="text-[10px] font-mono text-app-muted">Успешно закрыто</div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-3.5 bg-app-surface border border-app-border rounded-2xl space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по описанию, теме, контакту, ID..."
                className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-3 py-2 text-xs text-app-primary placeholder:text-app-muted focus:outline-none font-sans transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-primary text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Type Filter Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 shrink-0 font-mono text-xs">
              {[
                { id: "ALL", label: `Все (${stats.total})` },
                { id: "BUG", label: `Баги (${stats.bugs})`, icon: Bug },
                { id: "FEATURE", label: `Идеи (${stats.features})`, icon: Lightbulb },
                { id: "OTHER", label: `Прочее (${stats.others})`, icon: Layers }
              ].map((t) => {
                const Icon = t.icon;
                const active = typeFilter === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTypeFilter(t.id)}
                    className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? "bg-app-card text-app-primary border-app-border font-medium"
                        : "bg-app-card/50 text-app-muted hover:text-app-primary border-transparent hover:border-app-border"
                    }`}
                  >
                    {Icon && <Icon size={12} />}
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-app-border/50 text-xs font-mono">
            {/* Status Filter */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-app-muted text-[11px] mr-1">Статус:</span>
              {[
                { id: "ALL", label: "Все" },
                { id: "NEW", label: `Новые (${stats.newCount})` },
                { id: "IN_PROGRESS", label: `В работе (${stats.inProgressCount})` },
                { id: "RESOLVED", label: `Решено (${stats.resolvedCount})` }
              ].map((s) => {
                const active = statusFilter === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id)}
                    className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      active
                        ? "bg-app-card text-app-primary border-app-border font-medium"
                        : "bg-app-card/30 text-app-muted hover:text-app-primary border-transparent"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* Sort & Shop Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Select All checkbox */}
              {filteredReports.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="px-2.5 py-1 bg-app-card border border-app-border text-app-muted hover:text-app-primary rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {isAllSelected ? (
                    <CheckSquare size={13} className="text-app-primary" />
                  ) : (
                    <Square size={13} />
                  )}
                  <span>Выбрать все ({filteredReports.length})</span>
                </button>
              )}

              {/* Shop Filter */}
              {uniqueShops.length > 0 && (
                <div className="relative" ref={shopMenuRef}>
                  <button
                    onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
                    className="px-2.5 py-1 bg-app-card border border-app-border rounded-lg text-app-secondary hover:text-app-primary flex items-center gap-1.5 cursor-pointer"
                  >
                    <Filter size={12} />
                    <span>
                      {shopFilter === "ALL" ? "Все заведения" : shopFilter}
                    </span>
                    <ChevronDown size={12} />
                  </button>

                  {isShopDropdownOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-app-surface border border-app-border rounded-xl shadow-xl z-20 py-1 font-mono text-xs max-h-48 overflow-y-auto">
                      <button
                        onClick={() => {
                          setShopFilter("ALL");
                          setIsShopDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-app-card cursor-pointer ${
                          shopFilter === "ALL" ? "font-bold text-app-primary" : "text-app-muted"
                        }`}
                      >
                        Все заведения
                      </button>
                      {uniqueShops.map((shop) => (
                        <button
                          key={shop}
                          onClick={() => {
                            setShopFilter(shop);
                            setIsShopDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 hover:bg-app-card cursor-pointer truncate ${
                            shopFilter === shop ? "font-bold text-app-primary" : "text-app-muted"
                          }`}
                        >
                          {shop}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sort Dropdown */}
              <div className="relative" ref={sortMenuRef}>
                <button
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className="px-2.5 py-1 bg-app-card border border-app-border rounded-lg text-app-secondary hover:text-app-primary flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowUpDown size={12} />
                  <span>
                    {sortBy === "NEWEST"
                      ? "Сначала новые"
                      : sortBy === "OLDEST"
                      ? "Сначала старые"
                      : sortBy === "STATUS"
                      ? "По статусу"
                      : "По типу"}
                  </span>
                  <ChevronDown size={12} />
                </button>

                {isSortDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-40 bg-app-surface border border-app-border rounded-xl shadow-xl z-20 py-1 font-mono text-xs">
                    {[
                      { id: "NEWEST", label: "Сначала новые" },
                      { id: "OLDEST", label: "Сначала старые" },
                      { id: "STATUS", label: "По статусу" },
                      { id: "TYPE", label: "По типу" }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setSortBy(opt.id as SortOption);
                          setIsSortDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-app-card cursor-pointer ${
                          sortBy === opt.id ? "font-bold text-app-primary" : "text-app-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error alert */}
        {error && (
          <div className="p-3 bg-app-card border border-app-border rounded-xl text-xs font-mono text-rose-700 dark:text-rose-300 font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchReports()}
              className="px-2 py-1 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary rounded text-[11px]"
            >
              Повторить
            </button>
          </div>
        )}

        {/* Main List of Reports */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 bg-app-surface border border-app-border rounded-2xl animate-pulse space-y-3"
              >
                <div className="h-4 bg-app-card rounded w-1/3" />
                <div className="h-10 bg-app-card rounded w-full" />
              </div>
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 bg-app-surface border border-app-border rounded-2xl text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 bg-app-card rounded-2xl flex items-center justify-center mx-auto text-app-muted border border-app-border">
              <Shield size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-app-primary">Отчёты не найдены</h3>
              <p className="text-xs text-app-muted max-w-xs mx-auto">
                По выбранным фильтрам или поисковому запросу ничего не найдено.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => {
              if (!report.id) return null;
              const isSelected = selectedIds.includes(report.id);
              const isNewlyArrived = newlyArrivedIds.has(report.id);
              const isExpanded = expandedId === report.id;

              let typeBadge = {
                label: "Ошибка / Баг",
                icon: Bug,
                style: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/20 font-semibold"
              };
              if (report.type === "BUG") {
                typeBadge = {
                  label: "Ошибка / Баг",
                  icon: Bug,
                  style: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/20 font-semibold"
                };
              } else if (report.type === "FEATURE") {
                typeBadge = {
                  label: "Предложение",
                  icon: Lightbulb,
                  style: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20 font-semibold"
                };
              } else if (report.type === "OTHER" || report.type === "QUESTION") {
                typeBadge = {
                  label: "Прочее",
                  icon: Layers,
                  style: "bg-app-card text-app-primary border-app-border font-semibold"
                };
              }

              const TypeIcon = typeBadge.icon;

              return (
                <motion.div
                  key={report.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-app-surface border rounded-2xl p-4 sm:p-5 transition-all shadow-xs ${
                    isNewlyArrived
                      ? "border-emerald-500/40 bg-emerald-500/[0.02]"
                      : isSelected
                      ? "border-app-border bg-app-card/30"
                      : "border-app-border hover:border-app-border/80"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Selection checkbox */}
                      <button
                        onClick={() => report.id && toggleSelectOne(report.id)}
                        className="mt-1 text-app-muted hover:text-app-primary cursor-pointer transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-app-primary" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>

                      <div className="space-y-1.5 min-w-0">
                        {/* Badges row */}
                        <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                          {/* Type Badge */}
                          <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${typeBadge.style}`}>
                            <TypeIcon size={11} />
                            <span>{typeBadge.label}</span>
                          </span>

                          {/* Shop Name */}
                          {report.shopName && (
                            <span className="px-2 py-0.5 rounded-md bg-app-card text-app-secondary border border-app-border font-bold">
                              {report.shopName}
                            </span>
                          )}

                          {/* Date */}
                          <span className="text-app-muted flex items-center gap-1">
                            <Clock size={11} />
                            <span>
                              {report.createdAt
                                ? new Date(report.createdAt).toLocaleString("ru-RU")
                                : "—"}
                            </span>
                          </span>

                          {/* Realtime tag */}
                          {isNewlyArrived && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 font-bold animate-pulse">
                              NEW REALTIME
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-bold text-app-primary break-words">
                          {report.title || "Без темы"}
                        </h3>
                      </div>
                    </div>

                    {/* Status Dropdown & Delete Action */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
                      <ReportStatusDropdown
                        status={(report.status as ReportStatusType) || "NEW"}
                        onChange={(newStat) => report.id && handleUpdateStatus(report.id, newStat)}
                      />

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : report.id!)}
                        className="p-1.5 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-app-secondary hover:text-app-primary transition-colors cursor-pointer text-xs font-mono flex items-center gap-1"
                        title="Развернуть детали"
                      >
                        <span>{isExpanded ? "Свернуть" : "Детали"}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      <button
                        onClick={() => setDeleteConfirmId(report.id!)}
                        className="p-1.5 bg-app-card hover:bg-rose-500/10 border border-app-border hover:border-rose-500/30 text-app-muted hover:text-rose-400 rounded-xl transition-colors cursor-pointer"
                        title="Удалить отчёт"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Description preview */}
                  <div className="mt-2.5 text-xs text-app-secondary font-sans leading-relaxed whitespace-pre-wrap">
                    {report.description}
                  </div>

                  {/* Expanded detail section */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-app-border space-y-4">
                      {/* Meta contacts & system info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-mono">
                        {report.userEmail && (
                          <div className="p-2.5 bg-app-card border border-app-border rounded-xl space-y-1">
                            <span className="text-[10px] text-app-muted uppercase">Email пользователя:</span>
                            <div className="flex items-center justify-between font-bold text-app-primary">
                              <span className="truncate">{report.userEmail}</span>
                              <button
                                onClick={() => handleCopy(report.userEmail!, `email_${report.id}`)}
                                className="p-1 text-app-muted hover:text-app-primary cursor-pointer"
                              >
                                {copiedId === `email_${report.id}` ? (
                                  <Check size={12} className="text-emerald-500" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {report.userContact && (
                          <div className="p-2.5 bg-app-card border border-app-border rounded-xl space-y-1">
                            <span className="text-[10px] text-app-muted uppercase">Доп. контакт:</span>
                            <div className="flex items-center justify-between font-bold text-app-primary">
                              <span className="truncate">{report.userContact}</span>
                              <button
                                onClick={() => handleCopy(report.userContact!, `contact_${report.id}`)}
                                className="p-1 text-app-muted hover:text-app-primary cursor-pointer"
                              >
                                {copiedId === `contact_${report.id}` ? (
                                  <Check size={12} className="text-emerald-500" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {report.systemInfo && (
                          <div className="p-2.5 bg-app-card border border-app-border rounded-xl space-y-1 sm:col-span-2 lg:col-span-1">
                            <span className="text-[10px] text-app-muted uppercase">Окружение / Браузер:</span>
                            <div className="text-[11px] text-app-secondary truncate">
                              {report.systemInfo}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Screenshot attachment preview */}
                      {report.imageUrl && (
                        <div className="space-y-1.5">
                          <span className="block text-[11px] font-mono text-app-muted uppercase tracking-wider">
                            Прикрепленный скриншот:
                          </span>
                          <div className="relative inline-block group">
                            <img
                              src={report.imageUrl}
                              alt="Screenshot"
                              className="w-48 h-32 object-cover rounded-xl border border-app-border cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setPreviewImage(report.imageUrl!)}
                            />
                            <button
                              onClick={() => setPreviewImage(report.imageUrl!)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-xl cursor-pointer"
                            >
                              <Eye size={20} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Developer Notes Input */}
                      {report.id && (
                        <div className="space-y-2">
                          <label className="block text-[11px] font-mono text-app-muted uppercase tracking-wider">
                            Заметка разработчика (сохраняется в БД):
                          </label>
                          <textarea
                            rows={2}
                            value={devNotesState[report.id] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDevNotesState((prev) => ({ ...prev, [report.id!]: val }));
                            }}
                            placeholder="Например: Исправлено в коммите abc123, отписать пользователю в Telegram..."
                            className="w-full bg-app-card border border-app-border rounded-xl p-2.5 text-xs text-app-primary placeholder:text-app-muted focus:outline-none font-sans transition-colors"
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] text-emerald-500 font-mono">
                              {copiedId === `saved_notes_${report.id}` ? "Заметка сохранена!" : ""}
                            </span>
                            <button
                              onClick={() => report.id && handleSaveDevNotes(report.id)}
                              disabled={isSavingNotes === report.id}
                              className="px-3 py-1.5 bg-app-accent hover:opacity-90 text-app-accent-fg font-bold rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 font-mono"
                            >
                              {isSavingNotes === report.id ? "Сохранение..." : "Сохранить заметку"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Batch Operations Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
          >
            <div className="pointer-events-auto bg-app-surface border border-app-border rounded-2xl shadow-2xl p-2.5 sm:p-3 sm:px-5 flex items-center gap-3 sm:gap-4 font-mono text-xs max-w-xl w-full justify-between backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <CheckSquare size={15} className="text-app-primary shrink-0" />
                <span className="font-bold text-app-primary">
                  Выбрано: {selectedIds.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isBatchProcessing}
                  onClick={() => handleBatchStatus("RESOLVED")}
                  className="px-3 py-1.5 bg-app-accent text-app-accent-fg hover:opacity-90 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <CheckCircle2 size={13} />
                  <span className="hidden sm:inline">Отметить решёнными</span>
                  <span className="sm:hidden">Решено</span>
                </button>

                <button
                  type="button"
                  disabled={isBatchProcessing}
                  onClick={() => handleBatchStatus("IN_PROGRESS")}
                  className="px-3 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-primary rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Clock size={13} className="text-app-muted" />
                  <span>В работу</span>
                </button>

                <button
                  type="button"
                  disabled={isBatchProcessing}
                  onClick={() => setIsBatchDeleteConfirmOpen(true)}
                  className="px-3 py-1.5 bg-app-card hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 border border-app-border text-app-secondary rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Trash2 size={13} />
                  <span className="hidden sm:inline">Удалить</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="p-1.5 text-app-muted hover:text-app-primary hover:bg-app-card rounded-lg transition-colors cursor-pointer"
                  title="Сбросить выбор"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Lightbox Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl max-h-[90vh] bg-app-surface border border-app-border rounded-2xl overflow-hidden shadow-2xl p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center px-4 py-2 border-b border-app-border">
                <span className="text-xs font-mono text-app-muted">
                  Просмотр скриншота
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={previewImage}
                    download="screenshot.png"
                    className="p-1.5 text-app-muted hover:text-app-primary rounded-lg cursor-pointer"
                    title="Скачать изображение"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="p-1.5 text-app-muted hover:text-app-primary rounded-lg cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="p-2 max-h-[80vh] overflow-auto flex items-center justify-center">
                <img
                  src={previewImage}
                  alt="Screenshot Full"
                  className="max-h-[75vh] w-auto object-contain rounded-xl"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Single Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDeleteReport(deleteConfirmId)}
        title="Удаление отчёта"
        message="Вы действительно хотите удалить этот отчёт из базы данных? Это действие нельзя отменить."
        confirmText="Удалить отчёт"
        variant="danger"
      />

      {/* Batch Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isBatchDeleteConfirmOpen}
        onClose={() => setIsBatchDeleteConfirmOpen(false)}
        onConfirm={handleBatchDelete}
        title="Удаление выбранных отчётов"
        message={`Вы собираетесь удалить ${selectedIds.length} отчётов. Это действие нельзя отменить.`}
        confirmText="Удалить все"
        variant="danger"
        isLoading={isBatchProcessing}
      />

      {/* Alert modal */}
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
