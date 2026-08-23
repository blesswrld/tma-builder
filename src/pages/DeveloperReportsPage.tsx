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
  SlidersHorizontal,
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
  CheckCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useRealtime } from "../context/RealtimeContext";
import { BugReport } from "../types";
import { useScrollLock } from "../hooks/useScrollLock";
import {
  ReportStatusDropdown,
  ReportStatusType,
  STATUS_CONFIG
} from "../components/reports/ReportStatusDropdown";

type SortOption = "NEWEST" | "OLDEST" | "STATUS" | "TYPE";

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

export default function DeveloperReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isConnected, lastEvent } = useRealtime();

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

  // Global scroll locking for all open modals / lightboxes
  const isAnyModalOpen = Boolean(
    previewImage || deleteConfirmId || isBatchDeleteConfirmOpen
  );
  useScrollLock(isAnyModalOpen);

  const sortMenuRef = useRef<HTMLDivElement>(null);
  const shopMenuRef = useRef<HTMLDivElement>(null);

  // Toggle sound
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("dev_reports_sound", String(next));
    if (next) {
      playNotificationChime();
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

      const res = await fetch("/api/reports?dev=true", { headers });
      if (!res.ok) {
        throw new Error("Не удалось загрузить отчёты");
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
    fetchReports();
  }, []);

  // Listen for realtime events
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === "NEW_REPORT" && lastEvent.payload) {
      const newRep = lastEvent.payload;
      if (soundEnabled) {
        playNotificationChime();
      }

      setReports((prev) => {
        // Prevent duplicates
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
    // Optimistic update
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
      // Revert on error
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

      if (!res.ok) throw new Error("Не удалось сохранить заметку");

      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, developerNotes: notes } : r))
      );
      setCopiedId(`saved_notes_${reportId}`);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err: any) {
      alert(err.message || "Ошибка сохранения заметки");
    } finally {
      setIsSavingNotes(null);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/reports/${reportId}`, {
        method: "DELETE",
        headers
      });

      if (!res.ok) throw new Error("Не удалось удалить отчёт");

      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setSelectedIds((prev) => prev.filter((id) => id !== reportId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert(err.message || "Ошибка удаления");
    }
  };

  // Batch actions
  const handleBatchStatus = async (status: ReportStatusType) => {
    if (selectedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/reports/batch-status", {
        method: "POST",
        headers,
        body: JSON.stringify({ ids: selectedIds, status })
      });

      if (!res.ok) throw new Error("Ошибка массового обновления");

      setReports((prev) =>
        prev.map((r) => (selectedIds.includes(r.id || "") ? { ...r, status: status as any } : r))
      );
      setSelectedIds([]);
    } catch (err: any) {
      alert(err.message || "Ошибка при массовом обновлении");
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

      if (!res.ok) throw new Error("Ошибка массового удаления");

      setReports((prev) => prev.filter((r) => !selectedIds.includes(r.id || "")));
      setSelectedIds([]);
      setIsBatchDeleteConfirmOpen(false);
    } catch (err: any) {
      alert(err.message || "Ошибка при массовом удалении");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredReports.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReports.map((r) => r.id || "").filter(Boolean));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJSON = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reports, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `reports_export_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    if (reports.length === 0) return;
    const headers = [
      "ID",
      "Тип",
      "Статус",
      "Тема",
      "Описание",
      "Контакт",
      "Заведение",
      "Дата создания",
      "Заметки разработчика"
    ];
    const rows = reports.map((r) => [
      r.id || "",
      r.type || "",
      r.status || "NEW",
      `"${(r.title || "").replace(/"/g, '""')}"`,
      `"${(r.description || "").replace(/"/g, '""')}"`,
      `"${(r.contact || "").replace(/"/g, '""')}"`,
      r.shopId || "",
      r.createdAt || "",
      `"${(r.developerNotes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = reports.length;
    const newCount = reports.filter((r) => !r.status || r.status === "NEW").length;
    const inProgressCount = reports.filter((r) => r.status === "IN_PROGRESS").length;
    const resolvedCount = reports.filter(
      (r) => r.status === "RESOLVED" || r.status === "CLOSED"
    ).length;
    const bugs = reports.filter((r) => r.type === "BUG").length;
    const features = reports.filter((r) => r.type === "FEATURE").length;
    const others = reports.filter((r) => r.type === "OTHER").length;

    // Distinct shops
    const distinctShops = Array.from(
      new Set(reports.map((r) => r.shopId).filter(Boolean))
    ) as string[];

    return {
      total,
      newCount,
      inProgressCount,
      resolvedCount,
      bugs,
      features,
      others,
      distinctShops
    };
  }, [reports]);

  // Filtered and sorted reports
  const filteredReports = useMemo(() => {
    let result = reports.filter((r) => {
      if (typeFilter !== "ALL" && r.type !== typeFilter) return false;
      if (statusFilter !== "ALL") {
        if (statusFilter === "NEW" && r.status && r.status !== "NEW") return false;
        if (statusFilter !== "NEW" && r.status !== statusFilter) return false;
      }
      if (shopFilter !== "ALL" && r.shopId !== shopFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (r.title || "").toLowerCase().includes(q);
        const matchesDesc = (r.description || "").toLowerCase().includes(q);
        const matchesContact = (r.contact || "").toLowerCase().includes(q);
        const matchesId = (r.id || "").toLowerCase().includes(q);
        const matchesShop = (r.shopId || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesContact && !matchesId && !matchesShop) {
          return false;
        }
      }
      return true;
    });

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === "NEWEST") {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === "OLDEST") {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (sortBy === "TYPE") {
        return (a.type || "").localeCompare(b.type || "");
      }
      if (sortBy === "STATUS") {
        return (a.status || "").localeCompare(b.status || "");
      }
      return 0;
    });

    return result;
  }, [reports, typeFilter, statusFilter, shopFilter, searchQuery, sortBy]);

  const parseAttachments = (att: any) => {
    if (!att) return [];
    if (Array.isArray(att)) return att;
    try {
      return JSON.parse(att);
    } catch {
      return [];
    }
  };

  const parseMetadata = (meta: any) => {
    if (!meta) return null;
    if (typeof meta === "object") return meta;
    try {
      return JSON.parse(meta);
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-app-bg text-app-primary flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-app-surface/90 backdrop-blur-md border-b border-app-border px-4 lg:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin")}
            className="p-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-app-secondary hover:text-app-primary transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono"
            title="Вернуться в панель управления заведениями"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Панель управления</span>
          </button>

          <div className="h-4 w-[1px] bg-app-border mx-1" />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-app-primary flex items-center gap-1.5">
                <Shield size={16} className="text-emerald-500 shrink-0" />
                <span>Центр отчётов разработчика</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                gelgaev.dev@mail.ru
              </span>
            </div>
            <p className="text-[11px] text-app-muted font-mono hidden md:block">
              Прямой сбор всех баг-репортов, предложений и обратной связи от пользователей
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono transition-colors cursor-pointer ${
              soundEnabled ? "text-emerald-500" : "text-app-muted"
            }`}
            title={soundEnabled ? "Звуковые уведомления включены" : "Звуковые уведомления отключены"}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {/* Realtime status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-app-card border border-app-border rounded-xl text-[11px] font-mono text-app-muted">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="font-semibold text-app-primary">
              {isConnected ? "Realtime активен" : "Подключение..."}
            </span>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchReports()}
            disabled={isRefreshing}
            className="p-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-app-muted hover:text-app-primary transition-colors cursor-pointer disabled:opacity-50"
            title="Обновить список отчётов"
          >
            <RefreshCw size={15} className={isRefreshing ? "animate-spin text-app-primary" : ""} />
          </button>

          {/* Export Dropdown */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={handleExportCSV}
              disabled={reports.length === 0}
              className="px-2.5 py-1.5 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-[11px] font-mono text-app-secondary hover:text-app-primary transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Экспорт в CSV"
            >
              <Download size={13} />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              disabled={reports.length === 0}
              className="px-2.5 py-1.5 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-[11px] font-mono text-app-secondary hover:text-app-primary transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Экспорт в JSON"
            >
              <Download size={13} />
              <span>JSON</span>
            </button>
          </div>

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-app-muted hover:text-app-primary transition-colors cursor-pointer"
            title="Сменить тему"
          >
            {theme === "dark" ? (
              <Sun size={15} className="text-zinc-300" />
            ) : (
              <Moon size={15} className="text-zinc-600" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* Developer verified card banner */}
        <div className="p-4 bg-app-surface border border-app-border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-app-card border border-app-border flex items-center justify-center text-app-primary shrink-0 shadow-xs">
              <Mail size={20} className="text-app-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-app-primary">
                  Главный аккаунт разработчика:
                </span>
                <span className="text-xs font-mono font-bold text-app-primary underline decoration-app-border">
                  gelgaev.dev@mail.ru
                </span>
              </div>
              <p className="text-xs text-app-muted font-sans mt-0.5">
                Все поступающие репорты сохраняются в базу данных, дублируются на этот почтовый ящик и
                транслируются в реальном времени.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => handleCopy("gelgaev.dev@mail.ru", "dev_email")}
              className="px-3 py-1.5 bg-app-card hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-secondary hover:text-app-primary transition-all flex items-center gap-1.5 cursor-pointer"
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
            <span className="text-[11px] font-mono text-app-muted uppercase tracking-wider block">
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
            <span className="text-[11px] font-mono text-app-muted uppercase tracking-wider block">
              Новые (Необработанные)
            </span>
            <div className="text-xl font-bold font-mono text-rose-500 flex items-center gap-1.5">
              <span>{stats.newCount}</span>
              {stats.newCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
            <div className="text-[10px] font-mono text-app-muted">Требуют внимания</div>
          </div>

          <div className="p-3.5 bg-app-surface border border-app-border rounded-2xl space-y-1 shadow-xs">
            <span className="text-[11px] font-mono text-app-muted uppercase tracking-wider block">
              В работе
            </span>
            <div className="text-xl font-bold font-mono text-amber-500">{stats.inProgressCount}</div>
            <div className="text-[10px] font-mono text-app-muted">В процессе исправления</div>
          </div>

          <div className="p-3.5 bg-app-surface border border-app-border rounded-2xl space-y-1 shadow-xs">
            <span className="text-[11px] font-mono text-app-muted uppercase tracking-wider block">
              Решено / Закрыто
            </span>
            <div className="text-xl font-bold font-mono text-emerald-500">{stats.resolvedCount}</div>
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
                className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-3 py-2 text-xs text-app-primary placeholder:text-app-muted/60 focus:outline-none focus:border-app-border font-sans transition-colors"
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
                { id: "OTHER", label: `Прочее (${stats.others})`, icon: HelpCircle }
              ].map((btn) => {
                const Icon = btn.icon;
                const isSelected = typeFilter === btn.id;
                return (
                  <button
                    key={btn.id}
                    onClick={() => setTypeFilter(btn.id)}
                    className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      isSelected
                        ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                        : "bg-app-card hover:bg-app-hover text-app-secondary border border-app-border"
                    }`}
                  >
                    {Icon && <Icon size={12} />}
                    <span>{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Filter & Sort Line */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-app-border font-mono text-xs">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-app-muted text-[11px] mr-1">Статус:</span>
              {[
                { id: "ALL", label: "Все" },
                { id: "NEW", label: "Новые" },
                { id: "IN_PROGRESS", label: "В работе" },
                { id: "RESOLVED", label: "Решено" },
                { id: "REJECTED", label: "Отклонено" },
                { id: "CLOSED", label: "Закрыто" }
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${
                    statusFilter === st.id
                      ? "bg-app-card border border-app-border text-app-primary font-bold shadow-xs"
                      : "text-app-muted hover:text-app-primary"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Sort & Shop Custom Dropdowns */}
            <div className="flex items-center gap-2">
              {/* Shop Filter Custom Dropdown */}
              {stats.distinctShops.length > 0 && (
                <div className="relative" ref={shopMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
                    className="px-2.5 py-1 bg-app-card hover:bg-app-hover border border-app-border rounded-lg text-[11px] font-mono text-app-secondary hover:text-app-primary flex items-center gap-1.5 cursor-pointer"
                  >
                    <Filter size={11} className="text-app-muted" />
                    <span>
                      {shopFilter === "ALL" ? "Все заведения" : `Заведение: ${shopFilter}`}
                    </span>
                    <ChevronDown size={11} className="text-app-muted" />
                  </button>

                  <AnimatePresence>
                    {isShopDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -4 }}
                        className="absolute right-0 z-40 mt-1 min-w-[200px] bg-app-card border border-app-border rounded-xl shadow-xl p-1 font-mono text-xs backdrop-blur-md"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setShopFilter("ALL");
                            setIsShopDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer flex items-center justify-between ${
                            shopFilter === "ALL"
                              ? "bg-app-hover text-app-primary font-bold"
                              : "text-app-secondary hover:bg-app-hover"
                          }`}
                        >
                          <span>Все заведения</span>
                          {shopFilter === "ALL" && <Check size={12} />}
                        </button>
                        {stats.distinctShops.map((sId) => (
                          <button
                            key={sId}
                            type="button"
                            onClick={() => {
                              setShopFilter(sId);
                              setIsShopDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer flex items-center justify-between truncate ${
                              shopFilter === sId
                                ? "bg-app-hover text-app-primary font-bold"
                                : "text-app-secondary hover:bg-app-hover"
                            }`}
                          >
                            <span className="truncate">{sId}</span>
                            {shopFilter === sId && <Check size={12} className="shrink-0" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Sort Custom Dropdown */}
              <div className="relative" ref={sortMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className="px-2.5 py-1 bg-app-card hover:bg-app-hover border border-app-border rounded-lg text-[11px] font-mono text-app-secondary hover:text-app-primary flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowUpDown size={11} className="text-app-muted" />
                  <span>
                    {sortBy === "NEWEST"
                      ? "Сначала новые"
                      : sortBy === "OLDEST"
                      ? "Сначала старые"
                      : sortBy === "STATUS"
                      ? "По статусу"
                      : "По типу"}
                  </span>
                  <ChevronDown size={11} className="text-app-muted" />
                </button>

                <AnimatePresence>
                  {isSortDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -4 }}
                      className="absolute right-0 z-40 mt-1 min-w-[170px] bg-app-card border border-app-border rounded-xl shadow-xl p-1 font-mono text-xs backdrop-blur-md"
                    >
                      {[
                        { id: "NEWEST", label: "Сначала новые" },
                        { id: "OLDEST", label: "Сначала старые" },
                        { id: "STATUS", label: "По статусу" },
                        { id: "TYPE", label: "По типу" }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSortBy(opt.id as SortOption);
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer flex items-center justify-between ${
                            sortBy === opt.id
                              ? "bg-app-hover text-app-primary font-bold"
                              : "text-app-secondary hover:bg-app-hover"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {sortBy === opt.id && <Check size={12} />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Counter */}
              <span className="text-[11px] text-app-muted">
                {filteredReports.length} из {reports.length}
              </span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchReports()}
              className="underline hover:text-rose-300 cursor-pointer"
            >
              Повторить
            </button>
          </div>
        )}

        {/* Select All / Batch Action Controls */}
        {filteredReports.length > 0 && (
          <div className="flex items-center justify-between px-2 font-mono text-xs text-app-muted">
            <button
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 hover:text-app-primary transition-colors cursor-pointer"
            >
              {selectedIds.length === filteredReports.length && filteredReports.length > 0 ? (
                <CheckSquare size={14} className="text-emerald-500" />
              ) : (
                <Square size={14} />
              )}
              <span>
                {selectedIds.length === filteredReports.length && filteredReports.length > 0
                  ? "Снять выделение со всех"
                  : "Выбрать все в списке"}
              </span>
            </button>

            {selectedIds.length > 0 && (
              <span className="text-app-primary font-semibold">
                Выбрано элементов: {selectedIds.length}
              </span>
            )}
          </div>
        )}

        {/* Reports List */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-app-muted mx-auto" />
            <p className="text-xs font-mono text-app-muted">Загрузка отчётов разработчика...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center bg-app-surface border border-app-border rounded-2xl space-y-3">
            <CheckCircle2 size={36} className="text-app-muted mx-auto" />
            <h3 className="text-sm font-bold text-app-primary">
              {reports.length === 0 ? "Отчётов пока нет" : "Ничего не найдено по фильтрам"}
            </h3>
            <p className="text-xs text-app-secondary max-w-sm mx-auto font-sans">
              {reports.length === 0
                ? "Все отправленные через форму обратной связи баг-репорты и идеи будут мгновенно отображаться здесь."
                : "Попробуйте изменить параметры поиска или сбросить фильтры статуса."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => {
              const isExpanded = expandedId === report.id;
              const attachments = parseAttachments(report.attachments);
              const metadata = parseMetadata(report.metadata);
              const currentStatus = report.status || "NEW";
              const isSelected = selectedIds.includes(report.id || "");
              const isNewArrival = report.id ? newlyArrivedIds.has(report.id) : false;

              return (
                <motion.div
                  key={report.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-app-surface border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs transition-all ${
                    isNewArrival
                      ? "ring-2 ring-emerald-500 border-emerald-500/40"
                      : isSelected
                      ? "border-app-accent ring-1 ring-app-accent/30 bg-app-surface"
                      : "border-app-border"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => report.id && handleToggleSelectOne(report.id)}
                        className="text-app-muted hover:text-app-primary transition-colors cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-emerald-500" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>

                      {/* Type Badge */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-app-card text-app-secondary border border-app-border">
                        {report.type === "BUG" ? (
                          <Bug size={12} className="text-app-muted shrink-0" />
                        ) : report.type === "FEATURE" ? (
                          <Lightbulb size={12} className="text-app-muted shrink-0" />
                        ) : (
                          <HelpCircle size={12} className="text-app-muted shrink-0" />
                        )}
                        <span>
                          {report.type === "BUG"
                            ? "Ошибка"
                            : report.type === "FEATURE"
                            ? "Предложение"
                            : "Вопрос"}
                        </span>
                      </span>

                      {/* Custom Status Dropdown Menu */}
                      <ReportStatusDropdown
                        status={currentStatus}
                        onChange={(newStatus) => report.id && handleUpdateStatus(report.id, newStatus)}
                      />

                      {/* ID tag */}
                      <button
                        onClick={() => handleCopy(report.id || "", `id_${report.id}`)}
                        className="text-[11px] font-mono text-app-muted hover:text-app-primary transition-colors flex items-center gap-1 cursor-pointer"
                        title="Скопировать ID тикета"
                      >
                        <span>#{report.id?.slice(-8)}</span>
                        {copiedId === `id_${report.id}` ? (
                          <Check size={11} className="text-emerald-500" />
                        ) : (
                          <Copy size={11} className="opacity-60" />
                        )}
                      </button>

                      {/* New badge pulse */}
                      {isNewArrival && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500 text-white animate-pulse">
                          ТОЛЬКО ЧТО
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono text-app-muted self-end sm:self-auto">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>
                          {report.createdAt
                            ? new Date(report.createdAt).toLocaleString("ru-RU", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : "—"}
                        </span>
                      </span>

                      <button
                        onClick={() => report.id && setDeleteConfirmId(report.id)}
                        className="p-1.5 text-app-muted hover:text-rose-500 rounded-lg hover:bg-app-card transition-colors cursor-pointer"
                        title="Удалить отчёт"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Title / Subject if provided */}
                  {report.title && (
                    <h3 className="text-sm sm:text-base font-bold text-app-primary">
                      {report.title}
                    </h3>
                  )}

                  {/* Description Box */}
                  <div className="p-3.5 bg-app-card border border-app-border rounded-xl text-xs sm:text-sm text-app-primary font-sans leading-relaxed whitespace-pre-wrap">
                    {report.description}
                  </div>

                  {/* Contact Info & Shop context & Quick Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex flex-wrap items-center gap-2">
                      {report.contact && (
                        <div className="flex items-center gap-1.5 bg-app-card border border-app-border px-2.5 py-1 rounded-lg">
                          <Send size={12} className="text-app-muted" />
                          <span className="text-app-muted">Контакт:</span>
                          <span className="text-app-primary font-semibold">{report.contact}</span>

                          {/* Copy Contact */}
                          <button
                            onClick={() => handleCopy(report.contact!, `contact_${report.id}`)}
                            className="ml-1 text-app-muted hover:text-app-primary cursor-pointer"
                            title="Скопировать контакт"
                          >
                            {copiedId === `contact_${report.id}` ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>

                          {/* Quick Mailto Link if email */}
                          {report.contact.includes("@") && (
                            <a
                              href={`mailto:${report.contact}?subject=Отчёт #${report.id?.slice(
                                -8
                              )}: ${encodeURIComponent(report.title || "Обратная связь")}&body=Здравствуйте! По поводу вашего обращения в Mini App Studio:`}
                              className="ml-1 text-sky-500 hover:text-sky-400"
                              title="Написать ответ на email"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      )}

                      {report.shopId && (
                        <div className="flex items-center gap-1 bg-app-card border border-app-border px-2.5 py-1 rounded-lg">
                          <span className="text-app-muted">Заведение:</span>
                          <span className="text-app-primary font-semibold">{report.shopId}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Diagnostic Copy Button */}
                    <button
                      onClick={() => {
                        const jsonStr = JSON.stringify(
                          {
                            id: report.id,
                            type: report.type,
                            title: report.title,
                            description: report.description,
                            contact: report.contact,
                            shopId: report.shopId,
                            createdAt: report.createdAt,
                            metadata
                          },
                          null,
                          2
                        );
                        handleCopy(jsonStr, `diag_${report.id}`);
                      }}
                      className="px-2 py-1 bg-app-card hover:bg-app-hover border border-app-border rounded-lg text-[11px] text-app-secondary hover:text-app-primary transition-all flex items-center gap-1 cursor-pointer"
                      title="Скопировать полную техническую сводку в JSON"
                    >
                      <FileCode size={12} />
                      <span>
                        {copiedId === `diag_${report.id}` ? "Диагностика скопирована" : "JSON отчёта"}
                      </span>
                    </button>
                  </div>

                  {/* Attachments Section */}
                  {attachments.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-mono text-app-muted uppercase tracking-wider block">
                        Прикрепленные файлы ({attachments.length}):
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {attachments.map((file: any, fIdx: number) => {
                          const isImg =
                            file.type?.startsWith("image/") || file.url?.startsWith("data:image/");
                          return (
                            <div
                              key={fIdx}
                              onClick={() => isImg && setPreviewImage(file.url)}
                              className={`p-2 bg-app-card border border-app-border rounded-xl flex items-center gap-2 text-xs font-mono overflow-hidden transition-all ${
                                isImg ? "hover:border-app-muted cursor-pointer group" : ""
                              }`}
                            >
                              {isImg ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-app-surface shrink-0 border border-app-border group-hover:opacity-90">
                                  <img
                                    src={file.url}
                                    alt={file.name || "Screenshot"}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-app-surface flex items-center justify-center shrink-0 border border-app-border text-app-muted">
                                  <Eye size={16} />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] text-app-primary truncate font-medium">
                                  {file.name || "Файл"}
                                </p>
                                <span className="text-[9px] text-app-muted">
                                  {isImg ? "Клик для просмотра" : "Прикрепление"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Toggle Details (Diagnostics & Dev Notes) */}
                  <div className="pt-2 border-t border-app-border flex items-center justify-between text-xs font-mono">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : report.id || null)}
                      className="flex items-center gap-1.5 text-app-muted hover:text-app-primary transition-colors cursor-pointer py-1"
                    >
                      <SlidersHorizontal size={13} />
                      <span>
                        {isExpanded
                          ? "Скрыть технические данные и заметку"
                          : "Диагностика и заметка разработчика"}
                      </span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {report.developerNotes && !isExpanded && (
                      <span className="text-[11px] text-amber-500 flex items-center gap-1">
                        <MessageSquare size={11} />
                        <span>Есть заметка</span>
                      </span>
                    )}
                  </div>

                  {/* Expanded Section: Diagnostics & Developer Notes */}
                  {isExpanded && (
                    <div className="space-y-4 pt-2 animate-fade-in font-mono text-xs">
                      {/* Diagnostic details */}
                      {metadata && (
                        <div className="p-3 bg-app-card border border-app-border rounded-xl space-y-2 text-[11px] text-app-muted">
                          <div className="font-bold text-app-primary flex items-center gap-1.5">
                            <Monitor size={13} />
                            <span>Техническое окружение клиента:</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                            <div>
                              <span className="text-app-secondary">URL страницы:</span>{" "}
                              <span className="text-app-primary truncate">
                                {metadata.url || metadata.path || "—"}
                              </span>
                            </div>
                            <div>
                              <span className="text-app-secondary">Разрешение экрана:</span>{" "}
                              <span className="text-app-primary">
                                {metadata.screen || "—"} (DPR: {metadata.devicePixelRatio || 1})
                              </span>
                            </div>
                            <div>
                              <span className="text-app-secondary">Telegram WebApp:</span>{" "}
                              <span className="text-app-primary">
                                {metadata.isTelegramWebApp ? "Да (TMA)" : "Нет (Обычный браузер)"}
                              </span>
                            </div>
                            <div>
                              <span className="text-app-secondary">Источник:</span>{" "}
                              <span className="text-app-primary">{metadata.source || "web"}</span>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-app-secondary">User Agent:</span>{" "}
                              <span className="text-app-primary break-all">
                                {metadata.userAgent || "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Developer Notes Input */}
                      {report.id && (
                        <div className="space-y-2">
                          <label className="block text-[11px] font-mono text-app-muted uppercase tracking-wider">
                            Внутренняя заметка разработчика (сохраняется в БД):
                          </label>
                          <textarea
                            rows={2}
                            value={devNotesState[report.id] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDevNotesState((prev) => ({ ...prev, [report.id!]: val }));
                            }}
                            placeholder="Например: Исправлено в коммите abc123, отписать пользователю в Telegram..."
                            className="w-full bg-app-card border border-app-border rounded-xl p-2.5 text-xs text-app-primary placeholder:text-app-muted/60 focus:outline-none focus:border-app-border font-sans transition-colors"
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
            <div className="pointer-events-auto bg-app-surface border border-app-border rounded-2xl shadow-2xl p-3 sm:px-6 flex items-center gap-3 sm:gap-4 font-mono text-xs max-w-2xl w-full justify-between backdrop-blur-lg">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-emerald-500 shrink-0" />
                <span className="font-bold text-app-primary">
                  Выбрано: {selectedIds.length}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isBatchProcessing}
                  onClick={() => handleBatchStatus("RESOLVED")}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 size={13} />
                  <span className="hidden sm:inline">Отметить решёнными</span>
                  <span className="sm:hidden">Решено</span>
                </button>

                <button
                  type="button"
                  disabled={isBatchProcessing}
                  onClick={() => handleBatchStatus("IN_PROGRESS")}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <span className="hidden sm:inline">В работу</span>
                  <span className="sm:hidden">В работу</span>
                </button>

                <button
                  type="button"
                  disabled={isBatchProcessing}
                  onClick={() => setIsBatchDeleteConfirmOpen(true)}
                  className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  <span className="hidden sm:inline">Удалить</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="p-1.5 text-app-muted hover:text-app-primary rounded-lg cursor-pointer"
                  title="Сбросить выбор"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Lightbox Preview Modal with Scroll Lock */}
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
                  Просмотр прикрепленного скриншота
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

      {/* Single Delete Confirmation Modal with Scroll Lock */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-sm w-full bg-app-card border border-app-border rounded-2xl p-5 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 text-rose-500 font-mono font-bold text-sm">
                <AlertTriangle size={18} />
                <span>Удалить отчёт?</span>
              </div>
              <p className="text-xs text-app-secondary font-sans leading-relaxed">
                Вы действительно хотите удалить этот отчёт из базы данных? Это действие необратимо.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary rounded-xl text-xs font-mono cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => deleteConfirmId && handleDeleteReport(deleteConfirmId)}
                  className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-mono font-bold cursor-pointer"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Batch Delete Confirmation Modal with Scroll Lock */}
      <AnimatePresence>
        {isBatchDeleteConfirmOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsBatchDeleteConfirmOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-sm w-full bg-app-card border border-app-border rounded-2xl p-5 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 text-rose-500 font-mono font-bold text-sm">
                <AlertTriangle size={18} />
                <span>Удалить выбранные отчёты?</span>
              </div>
              <p className="text-xs text-app-secondary font-sans leading-relaxed">
                Вы собираетесь удалить сразу <b>{selectedIds.length}</b> отчётов. Действие нельзя отменить.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBatchDeleteConfirmOpen(false)}
                  className="px-3 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary rounded-xl text-xs font-mono cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleBatchDelete}
                  disabled={isBatchProcessing}
                  className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-mono font-bold cursor-pointer disabled:opacity-50"
                >
                  {isBatchProcessing ? "Удаление..." : "Удалить все"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
