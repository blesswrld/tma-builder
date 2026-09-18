import React, { useState, useMemo, useRef, useEffect } from "react";
import { useWorkerRevenueDynamics } from "../workers/useWorkerComputations";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  Calendar,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  RefreshCw,
  Zap,
  BarChart3,
  Activity,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Check,
  Percent
} from "lucide-react";

export interface OrderTimelineItem {
  id: string;
  createdAt: string | Date;
  totalPrice: number;
  status: string;
}

export interface RevenueDynamicsChartProps {
  ordersTimeline?: OrderTimelineItem[];
  dailyTrends?: Array<{ date: string; revenue: number; orders: number }>;
  hourlyDistribution?: Array<{ hour: string; orders: number }>;
  summary?: {
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    avgCheck: number;
  };
  onRefresh?: () => void;
}

export type PeriodType = "day" | "week" | "month";
type MetricType = "revenue" | "orders" | "both";
type ChartStyle = "area" | "bar";

const MONTH_NAMES_RU = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек"
];

const MONTH_NAMES_FULL_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const WEEKDAY_NAMES_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function formatDateRu(date: Date): string {
  const day = date.getDate();
  const month = MONTH_NAMES_RU[date.getMonth()];
  return `${day} ${month}`;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function RevenueDynamicsChart({
  ordersTimeline = [],
  dailyTrends = [],
  hourlyDistribution = [],
  summary,
  onRefresh
}: RevenueDynamicsChartProps) {
  const [period, setPeriod] = useState<PeriodType>("week");
  const [metricType, setMetricType] = useState<MetricType>("revenue");
  const [chartStyle, setChartStyle] = useState<ChartStyle>("area");
  const [selectedDayKey, setSelectedDayKey] = useState<string>("auto");
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState<boolean>(false);

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const periodDropdownRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target as Node)) {
        setShowPeriodDropdown(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowExportMenu(false);
        setShowPeriodDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Background computation via WebWorker for chart aggregations
  const workerResult = useWorkerRevenueDynamics({
    ordersTimeline,
    hourlyDistribution,
    summary,
    period,
    metricType,
    selectedDayKey,
  });

  const availableDates = workerResult.availableDates;

  // Determine active date for day (hourly) breakdown
  const activeDayKey = useMemo(() => {
    if (selectedDayKey !== "auto" && selectedDayKey !== "all") {
      return selectedDayKey;
    }
    if (selectedDayKey === "all") {
      return "all";
    }
    if (availableDates.length > 0) {
      return availableDates[0].key;
    }
    return formatDateKey(new Date());
  }, [selectedDayKey, availableDates]);

  // Active dataset and view metrics computed off-thread
  const activeDataset = workerResult.activeDataset;
  const viewMetrics = workerResult.viewMetrics;
  const xAxisInterval = workerResult.xAxisInterval;

  // Export handlers
  const handleExportCSV = () => {
    const headers = ["Интервал / Дата", "Выручка (руб)", "Количество заказов", "Средний чек (руб)"];
    const rows = activeDataset.map((d: any) => [
      `"${d.fullLabel || d.label}"`,
      d.revenue || 0,
      d.orders || 0,
      d.avgCheck || 0
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `revenue-dynamics-${period}-${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      setShowExportMenu(false);
      return;
    }

    const periodNames: Record<PeriodType, string> = {
      day: "День (почасово)",
      week: "Неделя (последние 7 дней)",
      month: "Месяц (последние 30 дней)"
    };

    const title = `Отчет: Динамика выручки — ${periodNames[period]}`;
    const dateStr = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const rowsHtml = activeDataset.map((d: any) => `
      <tr>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e5e7eb;">${d.fullLabel || d.label}</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${Number(d.revenue || 0).toLocaleString("ru-RU")} ₽</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${d.orders || 0} шт</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #4b5563;">${Number(d.avgCheck || 0).toLocaleString("ru-RU")} ₽</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ru">
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px; color: #111827; background: #ffffff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 24px; }
            h1 { margin: 0; font-size: 20px; font-weight: 700; color: #111827; }
            .meta { font-size: 12px; color: #6b7280; margin-top: 5px; }
            .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .kpi-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f9fafb; }
            .kpi-title { font-size: 10px; text-transform: uppercase; color: #6b7280; margin: 0 0 4px 0; font-weight: 600; letter-spacing: 0.5px; }
            .kpi-val { font-size: 17px; font-weight: 700; margin: 0; color: #111827; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; padding: 10px 12px; font-weight: 600; border-bottom: 2px solid #e5e7eb; color: #374151; }
            th.num { text-align: right; }
            @media print {
              body { padding: 16px; }
              @page { margin: 12mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${title}</h1>
              <div class="meta">Сформировано: ${dateStr}</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #4b5563;">
              Срез: <strong>${periodNames[period]}</strong>
            </div>
          </div>
          <div class="kpis">
            <div class="kpi-card">
              <div class="kpi-title">Выручка за период</div>
              <div class="kpi-val">${viewMetrics.totalRevenue.toLocaleString("ru-RU")} ₽</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Всего заказов</div>
              <div class="kpi-val">${viewMetrics.totalOrders} шт</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Средний чек</div>
              <div class="kpi-val">${viewMetrics.avgCheck.toLocaleString("ru-RU")} ₽</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Пиковый отрезок</div>
              <div class="kpi-val" style="font-size: 14px;">${viewMetrics.peakItem ? viewMetrics.peakItem.label : "—"}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Интервал / Дата</th>
                <th class="num">Выручка</th>
                <th class="num">Заказы</th>
                <th class="num">Средний чек</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setShowExportMenu(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-app-primary">Динамика выручки и заказов</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-app-card border border-app-border text-app-secondary">
              {period === "day" ? "День" : period === "week" ? "Неделя" : "Месяц"}
            </span>
          </div>
          <p className="text-xs text-app-muted font-mono mt-0.5">
            {period === "day"
              ? activeDayKey === "all"
                ? "Почасовая активность по суткам (00:00 — 23:00)"
                : `Почасовая динамика за ${availableDates.find(d => d.key === activeDayKey)?.label || activeDayKey}`
              : period === "week"
              ? "Ежедневная динамика за последние 7 дней"
              : "Показатели выручки и заказов за 30 дней"}
          </p>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector: 'День' | 'Неделя' | 'Месяц' */}
          <div className="flex items-center bg-app-card border border-app-border p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setPeriod("day")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                period === "day"
                  ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                  : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
              }`}
            >
              <Clock size={13} />
              <span>День</span>
            </button>
            <button
              type="button"
              onClick={() => setPeriod("week")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                period === "week"
                  ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                  : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
              }`}
            >
              <Calendar size={13} />
              <span>Неделя</span>
            </button>
            <button
              type="button"
              onClick={() => setPeriod("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                period === "month"
                  ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                  : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
              }`}
            >
              <BarChart3 size={13} />
              <span>Месяц</span>
            </button>
          </div>

          {/* Metric Selector Filter */}
          <div className="flex items-center bg-app-card border border-app-border p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMetricType("revenue")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                metricType === "revenue"
                  ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                  : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
              }`}
              title="Показывать выручку в рублях"
            >
              ₽ Выручка
            </button>
            <button
              type="button"
              onClick={() => setMetricType("orders")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                metricType === "orders"
                  ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                  : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
              }`}
              title="Показывать количество заказов"
            >
              шт Заказы
            </button>
            <button
              type="button"
              onClick={() => setMetricType("both")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                metricType === "both"
                  ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                  : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
              }`}
              title="Выручка и количество заказов одновременно"
            >
              Всё
            </button>
          </div>

          {/* Chart Style Switcher: Area vs Bar */}
          <div className="flex items-center bg-app-card border border-app-border p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setChartStyle("area")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chartStyle === "area"
                  ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                  : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
              }`}
              title="График с плавной заливкой"
            >
              <Activity size={14} />
            </button>
            <button
              type="button"
              onClick={() => setChartStyle("bar")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chartStyle === "bar"
                  ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                  : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
              }`}
              title="Столбчатая диаграмма"
            >
              <BarChart3 size={14} />
            </button>
          </div>

          {/* Export Dropdown Button in Top Right Corner */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-app-border bg-app-card text-xs font-mono font-medium text-app-secondary hover:text-app-primary hover:bg-app-hover transition-colors cursor-pointer shadow-2xs"
              title="Экспорт данных графика выручки"
            >
              <Download size={13} />
              <span>Экспорт</span>
              <ChevronDown size={11} className={`transition-transform duration-200 ${showExportMenu ? "rotate-180" : ""}`} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-48 bg-app-surface border border-app-border rounded-xl shadow-xl z-30 py-1.5 font-mono text-xs overflow-hidden">
                <div className="px-3 py-1 text-[10px] text-app-muted uppercase tracking-wider border-b border-app-border/40">
                  Формат экспорта
                </div>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-app-hover text-app-primary cursor-pointer transition-colors"
                >
                  <FileSpreadsheet size={15} className="text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-semibold text-xs">Таблица CSV</div>
                    <div className="text-[10px] text-app-muted">Excel / Google Таблицы</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-app-hover text-app-primary cursor-pointer transition-colors border-t border-app-border/30"
                >
                  <FileText size={15} className="text-rose-500 shrink-0" />
                  <div>
                    <div className="font-semibold text-xs">Отчет PDF / Печать</div>
                    <div className="text-[10px] text-app-muted">Готовая форма для печати</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 text-app-muted hover:text-app-primary hover:bg-app-hover rounded-xl border border-app-border bg-app-card transition-colors cursor-pointer"
              title="Обновить аналитику"
            >
              <RefreshCw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Sub-bar: Day selection chip list if 'День' is selected, plus Peak indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        {period === "day" ? (
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-app-muted mr-1 text-[11px]">Выбор даты:</span>
            {availableDates.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedDayKey("auto")}
                  className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedDayKey === "auto"
                      ? "bg-app-accent text-app-accent-fg border-app-accent font-bold"
                      : "bg-app-card border-app-border text-app-secondary hover:text-app-primary hover:bg-app-hover"
                  }`}
                >
                  {availableDates[0]?.label || "Сегодня"}
                </button>
                {availableDates.slice(1, 4).map(d => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setSelectedDayKey(d.key)}
                    className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-all ${
                      selectedDayKey === d.key
                        ? "bg-app-accent text-app-accent-fg border-app-accent font-bold"
                        : "bg-app-card border-app-border text-app-secondary hover:text-app-primary hover:bg-app-hover"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedDayKey("all")}
                  className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedDayKey === "all"
                      ? "bg-app-accent text-app-accent-fg border-app-accent font-bold"
                      : "bg-app-card border-app-border text-app-secondary hover:text-app-primary hover:bg-app-hover"
                  }`}
                >
                  Все дни суммарно
                </button>
              </>
            ) : (
              <span className="text-app-muted text-xs">Сегодня (24-часовая шкала)</span>
            )}
          </div>
        ) : (
          <div className="text-xs font-mono text-app-muted flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {period === "week" ? "Срез за 7 дней" : "Срез за 30 дней"} • {activeDataset.length} контрольных точек
            </span>
          </div>
        )}

        {/* Live Peak Summary Badge */}
        {viewMetrics.peakItem && (viewMetrics.peakItem.revenue > 0 || viewMetrics.peakItem.orders > 0) && (
          <div className="flex items-center gap-2 ml-auto text-xs font-mono bg-app-card border border-app-border px-3 py-1 rounded-xl shadow-2xs">
            <span className="flex items-center gap-1 text-amber-500 font-semibold">
              <Zap size={13} className="fill-amber-400 text-amber-400" />
              <span>Пик: {viewMetrics.peakItem.label}</span>
            </span>
            <span className="text-app-muted">•</span>
            <span className="text-app-primary font-bold">
              {viewMetrics.peakItem.revenue.toLocaleString("ru-RU")} ₽
            </span>
            <span className="text-app-secondary">({viewMetrics.peakItem.orders} зак.)</span>
          </div>
        )}
      </div>

      {/* Main Chart Canvas with Smooth Transition Animation */}
      <div className="h-72 w-full pt-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${period}-${metricType}-${chartStyle}-${selectedDayKey}`}
            initial={{ opacity: 0, y: 8, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.995 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-full h-full"
          >
            {activeDataset.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartStyle === "bar" ? (
                  <BarChart
                    data={activeDataset}
                    margin={{ top: 15, right: 15, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      interval={xAxisInterval}
                    />
                    <YAxis
                      yAxisId="left"
                      tickLine={false}
                      axisLine={false}
                      width={55}
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      tickFormatter={val =>
                        metricType === "orders"
                          ? `${val} шт`
                          : val >= 1000
                          ? `${Math.round(val / 1000)}k ₽`
                          : `${val} ₽`
                      }
                    />
                    {metricType === "both" && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                        tickFormatter={val => `${val} шт`}
                        allowDecimals={false}
                      />
                    )}
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const item = payload[0].payload;
                        return (
                          <div className="bg-app-surface border border-app-border rounded-xl p-3 shadow-xl font-mono text-xs space-y-1.5 min-w-[160px]">
                            <div className="font-bold text-app-primary border-b border-app-border/60 pb-1 flex items-center justify-between">
                              <span>{item.fullLabel || item.label}</span>
                              {item.orders > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                                  Активность
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-3 text-app-secondary">
                              <span>Выручка:</span>
                              <span className="font-bold text-app-primary">
                                {Number(item.revenue || 0).toLocaleString("ru-RU")} ₽
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-app-secondary">
                              <span>Заказы:</span>
                              <span className="font-bold text-app-primary">{item.orders || 0} шт</span>
                            </div>
                            {item.orders > 0 && (
                              <div className="flex items-center justify-between gap-3 text-app-muted text-[11px] pt-1 border-t border-app-border/40">
                                <span>Средний чек:</span>
                                <span>{Number(item.avgCheck || 0).toLocaleString("ru-RU")} ₽</span>
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    {(metricType === "revenue" || metricType === "both") && (
                      <Bar
                        yAxisId="left"
                        dataKey="revenue"
                        fill="var(--chart-line)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                        isAnimationActive={true}
                        animationDuration={450}
                        animationEasing="ease-out"
                      />
                    )}
                    {metricType === "orders" && (
                      <Bar
                        yAxisId="left"
                        dataKey="orders"
                        fill="var(--chart-line)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                        isAnimationActive={true}
                        animationDuration={450}
                        animationEasing="ease-out"
                      />
                    )}
                    {metricType === "both" && (
                      <Bar
                        yAxisId="right"
                        dataKey="orders"
                        fill="var(--text-muted)"
                        fillOpacity={0.65}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={24}
                        isAnimationActive={true}
                        animationDuration={450}
                        animationEasing="ease-out"
                      />
                    )}
                  </BarChart>
                ) : (
                  <AreaChart
                    data={activeDataset}
                    margin={{ top: 15, right: 15, left: 5, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorRevenueDarkGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-line)" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="var(--chart-line)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      interval={xAxisInterval}
                    />
                    <YAxis
                      yAxisId="left"
                      tickLine={false}
                      axisLine={false}
                      width={55}
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      tickFormatter={val =>
                        metricType === "orders"
                          ? `${val} шт`
                          : val >= 1000
                          ? `${Math.round(val / 1000)}k ₽`
                          : `${val} ₽`
                      }
                    />
                    {metricType === "both" && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                        tickFormatter={val => `${val} шт`}
                        allowDecimals={false}
                      />
                    )}
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const item = payload[0].payload;
                        return (
                          <div className="bg-app-surface border border-app-border rounded-xl p-3 shadow-xl font-mono text-xs space-y-1.5 min-w-[160px]">
                            <div className="font-bold text-app-primary border-b border-app-border/60 pb-1 flex items-center justify-between">
                              <span>{item.fullLabel || item.label}</span>
                              {item.orders > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                                  Активность
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-3 text-app-secondary">
                              <span>Выручка:</span>
                              <span className="font-bold text-app-primary">
                                {Number(item.revenue || 0).toLocaleString("ru-RU")} ₽
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-app-secondary">
                              <span>Заказы:</span>
                              <span className="font-bold text-app-primary">{item.orders || 0} шт</span>
                            </div>
                            {item.orders > 0 && (
                              <div className="flex items-center justify-between gap-3 text-app-muted text-[11px] pt-1 border-t border-app-border/40">
                                <span>Средний чек:</span>
                                <span>{Number(item.avgCheck || 0).toLocaleString("ru-RU")} ₽</span>
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    {(metricType === "revenue" || metricType === "both") && (
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        stroke="var(--chart-line)"
                        strokeWidth={2.2}
                        fillOpacity={1}
                        fill="url(#colorRevenueDarkGrad2)"
                        dot={{ r: 2.5, fill: "var(--chart-line)", strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "var(--chart-line)", stroke: "var(--surface)", strokeWidth: 2 }}
                        isAnimationActive={true}
                        animationDuration={500}
                        animationEasing="ease-out"
                      />
                    )}
                    {metricType === "orders" && (
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="orders"
                        stroke="var(--chart-line)"
                        strokeWidth={2.2}
                        fillOpacity={1}
                        fill="url(#colorRevenueDarkGrad2)"
                        dot={{ r: 2.5, fill: "var(--chart-line)", strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "var(--chart-line)", stroke: "var(--surface)", strokeWidth: 2 }}
                        isAnimationActive={true}
                        animationDuration={500}
                        animationEasing="ease-out"
                      />
                    )}
                    {metricType === "both" && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="orders"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ r: 2.5, fill: "#10b981", strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "#10b981", stroke: "var(--surface)", strokeWidth: 2 }}
                        isAnimationActive={true}
                        animationDuration={500}
                        animationEasing="ease-out"
                      />
                    )}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-app-muted font-mono">
                История выручки и заказов пока отсутствует
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Mini Metrics Summary for Selected Slice */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-app-border/40 font-mono">
        <div className="bg-app-card/60 p-2.5 rounded-xl border border-app-border/60">
          <p className="text-[10px] text-app-muted uppercase">Выручка среза</p>
          <p className="text-xs font-bold text-app-primary mt-0.5">
            {viewMetrics.totalRevenue.toLocaleString("ru-RU")} ₽
          </p>
        </div>
        <div className="bg-app-card/60 p-2.5 rounded-xl border border-app-border/60">
          <p className="text-[10px] text-app-muted uppercase">Заказов среза</p>
          <p className="text-xs font-bold text-app-primary mt-0.5">
            {viewMetrics.totalOrders} шт
          </p>
        </div>
        <div className="bg-app-card/60 p-2.5 rounded-xl border border-app-border/60">
          <p className="text-[10px] text-app-muted uppercase">Ср. чек среза</p>
          <p className="text-xs font-bold text-app-primary mt-0.5">
            {viewMetrics.avgCheck.toLocaleString("ru-RU")} ₽
          </p>
        </div>
        <div className="bg-app-card/60 p-2.5 rounded-xl border border-app-border/60">
          <p className="text-[10px] text-app-muted uppercase">Точек шкалы</p>
          <p className="text-xs font-bold text-app-primary mt-0.5">
            {activeDataset.length} интерв.
          </p>
        </div>
      </div>
    </div>
  );
}
