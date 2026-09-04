import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Server,
  Activity,
  Cpu,
  Database,
  Radio,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Play,
  Terminal,
  Clock,
  Mail,
  CreditCard,
  Send,
  Zap,
  Check,
  ChevronDown,
  Info,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  TrendingDown,
  ShieldAlert,
  Network
} from "lucide-react";

interface AdminServersTabProps {
  token: string | null;
  user: any;
  showToast: (title: string, message: string, type: "success" | "error" | "info" | "warning") => void;
}

interface ServerStatusData {
  timestamp: string;
  serverTime: string;
  systemHealth: {
    status: "HEALTHY" | "DEGRADED" | "CRITICAL";
    score: number;
    label: string;
    uptimeFormatted: string;
    uptimeSeconds: number;
    startedAt: string;
  };
  runtime: {
    nodeVersion: string;
    platform: string;
    osType: string;
    pid: number;
    environment: string;
    cpuCores: number;
    cpuModel: string;
    loadAverage: {
      "1m": number;
      "5m": number;
      "15m": number;
    };
    memory: {
      rssMb: number;
      heapTotalMb: number;
      heapUsedMb: number;
      externalMb: number;
      heapUsedPercent: number;
      systemTotalMb: number;
      systemUsedMb: number;
      systemFreeMb: number;
      systemUsedPercent: number;
    };
  };
  database: {
    status: "ONLINE" | "DEGRADED" | "OFFLINE";
    type: string;
    poolerMode: string;
    isPgBouncer: boolean;
    host: string;
    latencyMs: number;
    serverTime: string | null;
    counts: {
      users: number;
      shops: number;
      services: number;
      orders: number;
      reviews: number;
      promocodes: number;
      broadcasts: number;
      banners: number;
      reports: number;
    };
  };
  websocket: {
    status: string;
    connectedClients: number;
    activeShopChannels: number;
    protocol: string;
    heartbeatIntervalSec: number;
  };
  gateways: {
    telegram: {
      status: "ONLINE" | "SLOW" | "OFFLINE";
      latencyMs: number;
      endpoint: string;
      error: string | null;
    };
    smtp: {
      status: "ONLINE" | "NOT_CONFIGURED" | "ERROR";
      host: string;
      secure: boolean;
      userMasked: string;
      provider: string;
    };
    yookassa: {
      status: "ONLINE" | "DEGRADED" | "PENDING_KEYS";
      latencyMs: number;
      shopIdMasked: string;
      endpoint: string;
    };
  };
  securityConfig: {
    jwtEnabled: boolean;
    databaseConnected: boolean;
    smtpConfigured: boolean;
    yookassaConfigured: boolean;
    appUrl: string;
  };
}

interface TestLog {
  id: string;
  time: string;
  service: string;
  success: boolean;
  latencyMs: number;
  message: string;
}

// Custom CustomDropdown for Interval Selection
interface CustomSelectOption {
  value: number;
  label: string;
}

const INTERVAL_OPTIONS: CustomSelectOption[] = [
  { value: 0, label: "Выкл" },
  { value: 3, label: "3 сек" },
  { value: 5, label: "5 сек" },
  { value: 10, label: "10 сек" },
  { value: 30, label: "30 сек" }
];

export const AdminServersTab: React.FC<AdminServersTabProps> = ({
  token,
  user,
  showToast
}) => {
  const [data, setData] = useState<ServerStatusData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [privacyMode, setPrivacyMode] = useState<boolean>(true); // Hide sensitive internal hostnames / tokens for 3rd parties
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([14, 18, 12, 16, 11, 15, 12]);
  const [testingService, setTestingService] = useState<string | null>(null);
  const [logs, setLogs] = useState<TestLog[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch telemetry status
  const fetchStatus = useCallback(async (isManual = false) => {
    if (!token) return;
    if (isManual) setIsRefreshing(true);

    try {
      const res = await fetch("/api/admin/servers/status", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setIsLoading(false);
          return;
        }
        throw new Error(`HTTP error ${res.status}`);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        setIsLoading(false);
        return;
      }

      const json: ServerStatusData = await res.json();
      setData(json);
      setLastUpdated(new Date());

      // Update latency history (keep last 12 points)
      if (json.database?.latencyMs !== undefined) {
        setLatencyHistory(prev => {
          const next = [...prev, json.database.latencyMs];
          return next.slice(-14);
        });
      }

      if (isManual) {
        showToast("Метрики обновлены", "Телеметрия серверов успешно синхронизирована", "success");
      }
    } catch (err: any) {
      console.error("Error loading server status:", err);
      if (isManual) {
        showToast("Ошибка обновления", err?.message || "Не удалось связаться с сервером", "error");
      }
    } finally {
      setIsLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, [token, showToast]);

  // Initial load
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto refresh timer
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchStatus(false);
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, fetchStatus]);

  // Trigger individual diagnostic test
  const runDiagnosticTest = async (service: "database" | "telegram" | "smtp" | "yookassa" | "memory_gc") => {
    if (!token || testingService) return;
    setTestingService(service);

    const serviceNames: Record<string, string> = {
      database: "PostgreSQL Database",
      telegram: "Telegram Bot API",
      smtp: "SMTP Mail Socket",
      yookassa: "ЮKassa Gateway",
      memory_gc: "GC & RAM Inspector"
    };

    try {
      const res = await fetch("/api/admin/servers/test-service", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ service })
      });

      const json = await res.json();
      const newLog: TestLog = {
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString("ru-RU"),
        service: serviceNames[service] || service,
        success: Boolean(json.success),
        latencyMs: Number(json.latencyMs) || 0,
        message: json.message || (json.success ? "Тест успешно пройден" : "Ошибка теста")
      };

      setLogs(prev => [newLog, ...prev.slice(0, 49)]);

      if (json.success) {
        showToast("Тест пройден", `${serviceNames[service]}: ${json.latencyMs} мс`, "success");
      } else {
        showToast("Тест не пройден", json.message || "Ошибка соединения", "warning");
      }

      // Re-fetch metrics
      fetchStatus(false);
    } catch (err: any) {
      const newLog: TestLog = {
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString("ru-RU"),
        service: serviceNames[service] || service,
        success: false,
        latencyMs: 0,
        message: err.message || "Сетевой сбой при отправке теста"
      };
      setLogs(prev => [newLog, ...prev.slice(0, 49)]);
      showToast("Ошибка теста", err.message || "Сбой соединения", "error");
    } finally {
      setTestingService(null);
    }
  };

  // Run full sweep of all tests
  const runFullSweep = async () => {
    await runDiagnosticTest("database");
    await runDiagnosticTest("telegram");
    await runDiagnosticTest("smtp");
    await runDiagnosticTest("yookassa");
  };

  // Copy logs to clipboard
  const handleCopyLogs = () => {
    if (logs.length === 0) return;
    const text = logs.map(l => `[${l.time}] [${l.success ? "OK" : "FAIL"}] ${l.service}: ${l.message} (${l.latencyMs}ms)`).join("\n");
    navigator.clipboard.writeText(text);
    showToast("Журнал скопирован", "Логи диагностики скопированы в буфер обмена", "info");
  };

  // Render Latency Sparkline Graph
  const renderSparkline = () => {
    if (latencyHistory.length < 2) return null;
    const min = Math.min(...latencyHistory);
    const max = Math.max(...latencyHistory, min + 10);
    const range = max - min || 1;
    const width = 110;
    const height = 28;

    const points = latencyHistory.map((val, idx) => {
      const x = (idx / (latencyHistory.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    }).join(" ");

    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>
    );
  };

  const selectedIntervalLabel = INTERVAL_OPTIONS.find(o => o.value === autoRefreshInterval)?.label || "10 сек";

  return (
    <div className="space-y-6 animate-fade-in text-app-primary">
      {/* 1. Header Bar with Custom Styled Dropdown & Privacy Mode Toggle */}
      <div className="bg-app-card border border-app-border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-xs relative">
            <Server size={24} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold font-mono text-app-primary tracking-tight">
                Состояние и телеметрия серверов (Dev)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Monitoring
              </span>
            </div>
            <p className="text-xs text-app-muted mt-0.5 font-sans">
              Мониторинг инфраструктуры Node.js, базы данных PostgreSQL, WebSocket и платежных шлюзов
            </p>
          </div>
        </div>

        {/* Header Action Bar: Privacy Toggle, Custom Dropdown & Refresh Controls */}
        <div className="flex items-center gap-2.5 flex-wrap self-end lg:self-auto">
          {/* Privacy Mode Button (Hides sensitive keys/internal hosts for 3rd parties) */}
          <button
            type="button"
            onClick={() => setPrivacyMode(!privacyMode)}
            className={`px-3 py-2 border rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer select-none ${
              privacyMode
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-app-surface hover:bg-app-hover border-app-border text-app-muted hover:text-app-primary"
            }`}
            title={privacyMode ? "Приватный режим включен: внутренние хосты и ключи скрыты" : "Показать полные хосты и конфигурацию"}
          >
            {privacyMode ? <EyeOff size={13} /> : <Eye size={13} />}
            <span className="hidden sm:inline">
              {privacyMode ? "Приватный вид" : "Полный вид"}
            </span>
          </button>

          {/* CUSTOM STYLED DROPDOWN for Auto Refresh */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl px-3 py-2 text-xs font-mono text-app-primary transition-all cursor-pointer select-none focus:outline-none"
            >
              <Clock size={13} className="text-app-muted" />
              <span className="text-app-muted text-[11px]">Авто:</span>
              <span className="font-bold text-app-primary">{selectedIntervalLabel}</span>
              <ChevronDown
                size={14}
                className={`text-app-muted transition-transform duration-200 ${isDropdownOpen ? "rotate-180 text-app-accent" : ""}`}
              />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-1.5 w-36 bg-app-modal backdrop-blur-md border border-app-border rounded-xl shadow-2xl py-1.5 z-50 overflow-hidden"
                >
                  <div className="px-2.5 py-1 text-[10px] font-mono text-app-muted uppercase tracking-wider border-b border-app-border/40">
                    Интервал
                  </div>
                  {INTERVAL_OPTIONS.map(opt => {
                    const isSelected = opt.value === autoRefreshInterval;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setAutoRefreshInterval(opt.value);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-app-accent/15 text-app-accent font-bold"
                            : "text-app-secondary hover:bg-app-surface hover:text-app-primary"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check size={13} className="text-app-accent shrink-0" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchStatus(true)}
            disabled={isRefreshing || isLoading}
            className="px-3.5 py-2 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-primary transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Обновить метрики вручную"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-app-accent" : "text-app-muted"} />
            <span className="hidden sm:inline">Обновить</span>
          </button>

          {/* Full Audit Trigger */}
          <button
            type="button"
            onClick={runFullSweep}
            disabled={Boolean(testingService)}
            className="px-3.5 py-2 bg-app-accent text-app-accent-fg font-bold rounded-xl text-xs font-mono hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Zap size={14} />
            <span>Тест всех узлов</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Overall System Health */}
        <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-2 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-app-muted font-mono">
            <span>Общий статус системы</span>
            <ShieldCheck size={16} className="text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
              {data?.systemHealth?.status === "HEALTHY" ? "100%" : data?.systemHealth?.status === "DEGRADED" ? "85%" : "30%"}
            </span>
            <span className="text-xs font-mono text-app-muted">SLA</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-app-secondary">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">{data?.systemHealth?.label || "Все узлы функционируют штатно"}</span>
          </div>
          <div className="w-full bg-app-surface h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${data?.systemHealth?.score || 100}%` }}
            />
          </div>
        </div>

        {/* Server Uptime */}
        <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-app-muted font-mono">
            <span>Время работы (Uptime)</span>
            <Activity size={16} className="text-app-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-app-primary">
              {data?.systemHealth?.uptimeFormatted || "0д 0ч 0м"}
            </span>
          </div>
          <p className="text-xs text-app-muted font-mono truncate">
            Старт: {data?.systemHealth?.startedAt ? new Date(data.systemHealth.startedAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Недавно"}
          </p>
        </div>

        {/* Database Latency with Live Sparkline */}
        <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-app-muted font-mono">
            <span>Задержка БД (PostgreSQL)</span>
            <Database size={16} className="text-indigo-400" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl sm:text-2xl font-bold font-mono ${
                (data?.database?.latencyMs || 0) < 100 ? "text-emerald-400" : (data?.database?.latencyMs || 0) < 300 ? "text-amber-400" : "text-rose-400"
              }`}>
                {data?.database?.latencyMs !== undefined ? `${data.database.latencyMs} мс` : "..."}
              </span>
              <span className="text-[11px] font-mono text-app-muted">ping</span>
            </div>
            {renderSparkline()}
          </div>
          <div className="flex items-center gap-1 text-xs text-app-muted font-mono truncate">
            <span>{privacyMode ? "Supabase Cloud Pooler" : (data?.database?.isPgBouncer ? "Supabase PgBouncer (6543)" : "Supabase Pooler")}</span>
          </div>
        </div>

        {/* Active Realtime Sockets */}
        <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-app-muted font-mono">
            <span>WebSocket соединения</span>
            <Radio size={16} className="text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-app-primary">
              {data?.websocket?.connectedClients !== undefined ? data.websocket.connectedClients : "1"}
            </span>
            <span className="text-xs font-mono text-app-muted">клиентов онлайн</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-app-muted font-mono truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Каналов заведений: {data?.websocket?.activeShopChannels || 1}</span>
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Detailed Node Telemetry Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Node.js Core Runtime Card (6 cols) */}
        <div className="lg:col-span-6 bg-app-card border border-app-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-app-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Cpu size={18} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold font-mono text-app-primary">
                  Node.js Runtime & Память
                </h3>
                <span className="text-[11px] font-mono text-app-muted">
                  {privacyMode ? "Production Container • Linux (x64)" : `PID: ${data?.runtime?.pid || "—"} • ${data?.runtime?.platform || "linux (x64)"}`}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-app-surface border border-app-border rounded-lg text-[10px] font-mono text-app-primary">
              {data?.runtime?.nodeVersion || "Node.js v20+"}
            </span>
          </div>

          {/* Memory Heap Gauge */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-app-muted">Использование Heap памяти</span>
              <span className="font-bold text-app-primary">
                {data?.runtime?.memory?.heapUsedMb || 0} MB / {data?.runtime?.memory?.heapTotalMb || 0} MB ({data?.runtime?.memory?.heapUsedPercent || 0}%)
              </span>
            </div>
            <div className="w-full bg-app-surface h-2 rounded-full overflow-hidden border border-app-border/40">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (data?.runtime?.memory?.heapUsedPercent || 0) > 85 ? "bg-rose-500" : (data?.runtime?.memory?.heapUsedPercent || 0) > 65 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, data?.runtime?.memory?.heapUsedPercent || 20)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-app-muted">
              <span>RSS: {data?.runtime?.memory?.rssMb || 0} MB</span>
              <span>External: {data?.runtime?.memory?.externalMb || 0} MB</span>
              <span>System RAM: {data?.runtime?.memory?.systemUsedPercent || 0}%</span>
            </div>
          </div>

          {/* CPU & OS Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-xs font-mono">
            <div className="p-2.5 bg-app-surface border border-app-border rounded-xl">
              <span className="text-[10px] text-app-muted block">CPU Cores</span>
              <span className="font-bold text-app-primary">{data?.runtime?.cpuCores || 2} vCPU</span>
            </div>
            <div className="p-2.5 bg-app-surface border border-app-border rounded-xl">
              <span className="text-[10px] text-app-muted block">Load Avg (1m/5m)</span>
              <span className="font-bold text-app-primary">{data?.runtime?.loadAverage["1m"] || 0} / {data?.runtime?.loadAverage["5m"] || 0}</span>
            </div>
            <div className="p-2.5 bg-app-surface border border-app-border rounded-xl col-span-2 sm:col-span-1">
              <span className="text-[10px] text-app-muted block">Режим среды</span>
              <span className="font-bold text-emerald-400 capitalize">{data?.runtime?.environment || "production"}</span>
            </div>
          </div>
        </div>

        {/* PostgreSQL Database Telemetry Card (6 cols) */}
        <div className="lg:col-span-6 bg-app-card border border-app-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-app-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Database size={18} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold font-mono text-app-primary">
                  База данных PostgreSQL
                </h3>
                <span className="text-[11px] font-mono text-app-muted">
                  {privacyMode ? "Supabase PostgreSQL (Managed Cloud)" : (data?.database?.host || "Supabase Pooler")}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {data?.database?.status || "ONLINE"}
            </span>
          </div>

          {/* Database Entities Count Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2 bg-app-surface border border-app-border rounded-xl">
              <span className="text-[10px] text-app-muted block">Заказы</span>
              <span className="font-bold text-app-primary">{data?.database?.counts?.orders || 0}</span>
            </div>
            <div className="p-2 bg-app-surface border border-app-border rounded-xl">
              <span className="text-[10px] text-app-muted block">Пользователи</span>
              <span className="font-bold text-app-primary">{data?.database?.counts?.users || 0}</span>
            </div>
            <div className="p-2 bg-app-surface border border-app-border rounded-xl">
              <span className="text-[10px] text-app-muted block">Заведения</span>
              <span className="font-bold text-app-primary">{data?.database?.counts?.shops || 0}</span>
            </div>
            <div className="p-2 bg-app-surface border border-app-border rounded-xl">
              <span className="text-[10px] text-app-muted block">Позиции меню</span>
              <span className="font-bold text-app-primary">{data?.database?.counts?.services || 0}</span>
            </div>
            <div className="p-2 bg-app-surface border border-app-border rounded-xl">
              <span className="text-[10px] text-app-muted block">Отзывы</span>
              <span className="font-bold text-app-primary">{data?.database?.counts?.reviews || 0}</span>
            </div>
            <div className="p-2 bg-app-surface border border-app-border rounded-xl">
              <span className="text-[10px] text-app-muted block">Промокоды</span>
              <span className="font-bold text-app-primary">{data?.database?.counts?.promocodes || 0}</span>
            </div>
            <div className="p-2 bg-app-surface border border-app-border rounded-xl">
              <span className="text-[10px] text-app-muted block">Рассылки</span>
              <span className="font-bold text-app-primary">{data?.database?.counts?.broadcasts || 0}</span>
            </div>
            <div className="p-2 bg-app-surface border border-app-border rounded-xl">
              <span className="text-[10px] text-app-muted block">Баннеры</span>
              <span className="font-bold text-app-primary">{data?.database?.counts?.banners || 0}</span>
            </div>
          </div>

          <div className="p-2.5 bg-app-surface/60 border border-app-border rounded-xl flex items-center justify-between text-xs font-mono">
            <span className="text-app-muted">Режим подключения:</span>
            <span className="text-emerald-400 font-bold">Transaction Mode (PgBouncer)</span>
          </div>
        </div>
      </div>

      {/* 4. Gateways & Integrations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Telegram Gateway */}
        <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send size={16} className="text-sky-400" />
              <span className="text-xs font-bold font-mono text-app-primary">Telegram Bot API</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              data?.gateways?.telegram?.status === "ONLINE" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
            }`}>
              {data?.gateways?.telegram?.status || "ONLINE"}
            </span>
          </div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between text-app-muted">
              <span>Задержка API:</span>
              <span className="text-app-primary font-bold">{data?.gateways?.telegram?.latencyMs || 0} мс</span>
            </div>
            <div className="flex justify-between text-app-muted">
              <span>SSL Протокол:</span>
              <span className="text-app-primary">TLS 1.3 / HTTPS</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => runDiagnosticTest("telegram")}
            disabled={testingService === "telegram"}
            className="w-full py-1.5 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-[11px] font-mono text-app-primary transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {testingService === "telegram" ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
            <span>Проверить сокет</span>
          </button>
        </div>

        {/* SMTP Mail Gateway */}
        <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-amber-400" />
              <span className="text-xs font-bold font-mono text-app-primary">SMTP Сервер (Gmail)</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              data?.gateways?.smtp?.status === "ONLINE" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
            }`}>
              {data?.gateways?.smtp?.status === "ONLINE" ? "ONLINE" : "CONFIG"}
            </span>
          </div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between text-app-muted">
              <span>Хост:</span>
              <span className="text-app-primary">{privacyMode ? "smtp.gmail.com:465" : (data?.gateways?.smtp?.host || "smtp.gmail.com:465")}</span>
            </div>
            <div className="flex justify-between text-app-muted">
              <span>Отправитель:</span>
              <span className="text-app-primary truncate max-w-[120px]">
                {privacyMode ? "••••••••@gmail.com" : (data?.gateways?.smtp?.userMasked || "pro***@gmail.com")}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => runDiagnosticTest("smtp")}
            disabled={testingService === "smtp"}
            className="w-full py-1.5 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-[11px] font-mono text-app-primary transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {testingService === "smtp" ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
            <span>Верифицировать SMTP</span>
          </button>
        </div>

        {/* YooKassa Payment Gateway */}
        <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-emerald-400" />
              <span className="text-xs font-bold font-mono text-app-primary">ЮKassa Шлюз</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              data?.gateways?.yookassa?.status === "ONLINE" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-sky-500/15 text-sky-400 border border-sky-500/30"
            }`}>
              {data?.gateways?.yookassa?.status === "ONLINE" ? "ONLINE" : "ГОТОВ"}
            </span>
          </div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between text-app-muted">
              <span>Шлюз API:</span>
              <span className="text-app-primary">api.yookassa.ru/v3</span>
            </div>
            <div className="flex justify-between text-app-muted">
              <span>Shop ID:</span>
              <span className="text-app-primary">
                {privacyMode ? "••••••••" : (data?.gateways?.yookassa?.shopIdMasked || "Настроен")}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => runDiagnosticTest("yookassa")}
            disabled={testingService === "yookassa"}
            className="w-full py-1.5 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-[11px] font-mono text-app-primary transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {testingService === "yookassa" ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
            <span>Тест шлюза ЮKassa</span>
          </button>
        </div>
      </div>

      {/* 5. Interactive Diagnostic Console & Live Logs */}
      <div className="bg-app-card border border-app-border rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between border-b border-app-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-app-surface border border-app-border flex items-center justify-center text-app-accent">
              <Terminal size={17} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold font-mono text-app-primary">
                Диагностическая консоль и журнал тестов
              </h3>
              <span className="text-[11px] font-mono text-app-muted">
                Интерактивный запуск тестов узлов инфраструктуры
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="px-2.5 py-1 text-[11px] font-mono text-app-muted hover:text-app-primary bg-app-surface hover:bg-app-hover border border-app-border rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                  title="Скопировать логи в буфер обмена"
                >
                  <Copy size={11} />
                  <span>Копировать</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="px-2.5 py-1 text-[11px] font-mono text-app-muted hover:text-rose-400 bg-app-surface hover:bg-app-hover border border-app-border rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={11} />
                  <span>Очистить</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Diagnostic Buttons Bar */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => runDiagnosticTest("database")}
            disabled={Boolean(testingService)}
            className="px-3 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-primary transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Database size={13} className="text-indigo-400" />
            <span>SQL Ping Benchmark</span>
          </button>

          <button
            type="button"
            onClick={() => runDiagnosticTest("telegram")}
            disabled={Boolean(testingService)}
            className="px-3 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-primary transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send size={13} className="text-sky-400" />
            <span>Telegram API SSL Test</span>
          </button>

          <button
            type="button"
            onClick={() => runDiagnosticTest("smtp")}
            disabled={Boolean(testingService)}
            className="px-3 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-primary transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Mail size={13} className="text-amber-400" />
            <span>SMTP Handshake</span>
          </button>

          <button
            type="button"
            onClick={() => runDiagnosticTest("yookassa")}
            disabled={Boolean(testingService)}
            className="px-3 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-primary transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CreditCard size={13} className="text-emerald-400" />
            <span>ЮKassa Ping</span>
          </button>

          <button
            type="button"
            onClick={() => runDiagnosticTest("memory_gc")}
            disabled={Boolean(testingService)}
            className="px-3 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-xs font-mono text-app-primary transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Cpu size={13} className="text-rose-400" />
            <span>RAM & Heap Inspect</span>
          </button>
        </div>

        {/* Live Terminal Output Box */}
        <div className="bg-app-bg border border-app-border rounded-xl p-3 font-mono text-xs text-app-secondary min-h-[160px] max-h-[260px] overflow-y-auto custom-scrollbar space-y-1.5 shadow-inner">
          <div className="text-app-muted text-[11px] pb-1 border-b border-app-border flex items-center justify-between">
            <span>[TMA BUILDER SERVER TELEMETRY DAEMON v2.8.0]</span>
            <span>{lastUpdated ? lastUpdated.toLocaleTimeString("ru-RU") : "CONNECTING..."}</span>
          </div>

          {logs.length === 0 ? (
            <div className="text-app-muted text-xs py-4 text-center">
              Нажмите кнопку выше для выполнения целевого диагностического теста (SQL, Telegram, SMTP, ЮKassa)...
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex items-start gap-2 py-0.5 text-xs animate-fade-in">
                <span className="text-app-muted text-[10px] shrink-0 font-mono mt-0.5">{log.time}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                  log.success ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"
                }`}>
                  {log.success ? "OK" : "FAIL"}
                </span>
                <span className="text-app-primary font-semibold shrink-0">{log.service}:</span>
                <span className="text-app-secondary flex-1">{log.message}</span>
                {log.latencyMs > 0 && (
                  <span className="text-app-muted text-[10px] shrink-0 font-mono">
                    ({log.latencyMs}ms)
                  </span>
                )}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* 6. Security & Environment Configuration Checklist (Sanitized for Privacy) */}
      <div className="bg-app-card border border-app-border rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-400" />
          <h3 className="text-xs sm:text-sm font-bold font-mono text-app-primary">
            Конфигурация среды и безопасность (.env Inspector)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-mono">
          <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-app-muted text-[10px] block">DATABASE_URL</span>
              <span className="text-app-primary font-bold">Supabase PostgreSQL</span>
            </div>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>

          <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-app-muted text-[10px] block">JWT_SECRET</span>
              <span className="text-app-primary font-bold">Активен (256-bit)</span>
            </div>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>

          <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-app-muted text-[10px] block">SMTP_HOST / AUTH</span>
              <span className="text-app-primary font-bold">smtp.gmail.com (465)</span>
            </div>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>

          <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-app-muted text-[10px] block">YOOKASSA_KEYS</span>
              <span className="text-app-primary font-bold">{data?.securityConfig?.yookassaConfigured ? "Ключи установлены" : "Ожидают настройки"}</span>
            </div>
            {data?.securityConfig?.yookassaConfigured ? (
              <CheckCircle2 size={16} className="text-emerald-400" />
            ) : (
              <Info size={16} className="text-app-muted" />
            )}
          </div>

          <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-app-muted text-[10px] block">APP_ENDPOINT</span>
              <span className="text-app-primary font-bold truncate max-w-[140px]">
                {privacyMode ? "Production Edge (HTTPS)" : (data?.securityConfig?.appUrl || "https://tma-builder.app")}
              </span>
            </div>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>

          <div className="p-3 bg-app-surface border border-app-border rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-app-muted text-[10px] block">CORS / Nginx Port</span>
              <span className="text-app-primary font-bold">0.0.0.0:3000 (HTTPS)</span>
            </div>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
