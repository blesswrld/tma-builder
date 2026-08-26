import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { TrendingUp, ShoppingBag, DollarSign, Award, RefreshCw, BarChart2 } from "lucide-react";
import { AnalyticsSkeleton } from "./Skeleton";
import { useRealtimeEvent } from "../context/RealtimeContext";

interface AnalyticsData {
  summary: {
    totalOrders: number;
    completedOrders: number;
    totalRevenue: number;
    avgCheck: number;
  };
  dailyTrends: Array<{ date: string; revenue: number; orders: number }>;
  topServices: Array<{ title: string; count: number; total: number }>;
  hourlyDistribution: Array<{ hour: string; orders: number }>;
}

interface AnalyticsTabProps {
  shopId: string;
}

const MONO_COLORS = ["var(--text-primary)", "var(--text-secondary)", "var(--text-muted)", "var(--border)"];

export default function AnalyticsTab({ shopId }: AnalyticsTabProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shops/${shopId}/analytics`);
      if (!res.ok) throw new Error("Не удалось загрузить аналитический отчёт");
      const analyticsData = await res.json();
      setData(analyticsData);
    } catch (err: any) {
      if (!silent) setError(err.message || "Ошибка при загрузке отчёта");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useRealtimeEvent(["ORDER_CREATED", "ORDER_STATUS_UPDATED", "ORDER_DELETED", "CUSTOMER_UPDATED"], (event) => {
    if (!event.shopId || event.shopId === shopId) {
      fetchAnalytics(true);
    }
  });

  useEffect(() => {
    if (shopId) {
      fetchAnalytics();
      const interval = setInterval(() => {
        fetchAnalytics(true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [shopId]);

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-app-surface rounded-3xl border border-app-border text-app-secondary space-y-3">
        <p className="text-xs font-mono text-app-muted">{error || "Данные отсутствуют"}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-app-accent text-zinc-950 font-mono font-bold rounded-xl text-xs hover:bg-app-hover transition-colors"
        >
          Обновить данные
        </button>
      </div>
    );
  }

  const summary = data.summary || { totalOrders: 0, completedOrders: 0, totalRevenue: 0, avgCheck: 0 };
  const dailyTrends = data.dailyTrends || [];
  const topServices = data.topServices || [];
  const hourlyDistribution = data.hourlyDistribution || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0 }}
          whileHover={{ y: -2 }}
          className="bg-app-surface p-5 rounded-2xl border border-app-border flex items-center gap-4 transition-shadow hover:shadow-md"
        >
          <div className="p-3 bg-app-card text-app-primary rounded-xl shrink-0 border border-app-border">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-app-muted">Общая выручка</p>
            <h3 className="text-xl font-bold text-app-primary mt-0.5 font-mono">
              {summary.totalRevenue.toLocaleString("ru-RU")} ₽
            </h3>
            <p className="text-[10px] text-emerald-500 font-mono mt-0.5 flex items-center gap-1">
              <TrendingUp size={12} /> Выполненные заказы
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          whileHover={{ y: -2 }}
          className="bg-app-surface p-5 rounded-2xl border border-app-border flex items-center gap-4 transition-shadow hover:shadow-md"
        >
          <div className="p-3 bg-app-card text-app-primary rounded-xl shrink-0 border border-app-border">
            <ShoppingBag size={20} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-app-muted">Заказы</p>
            <h3 className="text-xl font-bold text-app-primary mt-0.5 font-mono">{summary.totalOrders}</h3>
            <p className="text-[10px] text-app-secondary font-mono mt-0.5">
              {summary.completedOrders} выполнено ({summary.totalOrders > 0 ? Math.round((summary.completedOrders / summary.totalOrders) * 100) : 0}%)
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          whileHover={{ y: -2 }}
          className="bg-app-surface p-5 rounded-2xl border border-app-border flex items-center gap-4 transition-shadow hover:shadow-md"
        >
          <div className="p-3 bg-app-card text-app-primary rounded-xl shrink-0 border border-app-border">
            <Award size={20} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-app-muted">Средний чек</p>
            <h3 className="text-xl font-bold text-app-primary mt-0.5 font-mono">
              {summary.avgCheck.toLocaleString("ru-RU")} ₽
            </h3>
            <p className="text-[10px] text-app-secondary font-mono mt-0.5">На один заказ</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          whileHover={{ y: -2 }}
          className="bg-app-surface p-5 rounded-2xl border border-app-border flex items-center gap-4 transition-shadow hover:shadow-md"
        >
          <div className="p-3 bg-app-card text-app-primary rounded-xl shrink-0 border border-app-border">
            <BarChart2 size={20} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-app-muted">Размер каталога</p>
            <h3 className="text-xl font-bold text-app-primary mt-0.5 font-mono">{topServices.length}</h3>
            <p className="text-[10px] text-app-secondary font-mono mt-0.5">Активные позиции</p>
          </div>
        </motion.div>
      </div>

      {/* Revenue Chart + Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="lg:col-span-2 bg-app-surface p-6 rounded-2xl border border-app-border space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-app-primary">Динамика выручки</h3>
              <p className="text-xs text-app-muted font-mono">Ежедневный доход</p>
            </div>
            <button
              onClick={fetchAnalytics}
              className="p-1.5 text-app-muted hover:text-app-primary hover:bg-app-hover rounded-lg transition-colors"
              title="Обновить"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          <div className="h-64 w-full">
            {dailyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenueDark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-line)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--chart-line)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    tickFormatter={val => val.slice(5)}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--chart-tooltip-bg)",
                      borderRadius: "12px",
                      color: "var(--chart-tooltip-text)",
                      border: "1px solid var(--chart-tooltip-border)",
                      fontSize: "12px"
                    }}
                    formatter={(val: any) => [`${Number(val).toLocaleString("ru-RU")} ₽`, "Выручка"]}
                    labelFormatter={label => `Дата: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--chart-line)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenueDark)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-app-muted font-mono">
                История выручки пока отсутствует
              </div>
            )}
          </div>
        </motion.div>

        {/* Top Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="bg-app-surface p-6 rounded-2xl border border-app-border space-y-4"
        >
          <div>
            <h3 className="text-sm font-semibold text-app-primary">Популярные позиции</h3>
            <p className="text-xs text-app-muted font-mono">Лидеры продаж</p>
          </div>

          {topServices.length > 0 ? (
            <div className="space-y-3">
              {topServices.map((service, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.3 + idx * 0.04 }}
                  className="flex items-center justify-between text-xs hover:bg-app-hover/50 p-1.5 -mx-1.5 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: MONO_COLORS[idx % MONO_COLORS.length] }}
                    />
                    <span className="font-medium text-app-secondary truncate">{service.title}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-semibold text-app-primary font-mono">{service.total.toLocaleString("ru-RU")} ₽</span>
                    <span className="text-[10px] text-app-muted font-mono block">{service.count} шт</span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-app-muted font-mono">
              Данные о продажах отсутствуют
            </div>
          )}
        </motion.div>
      </div>

      {/* Hourly Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="bg-app-surface p-6 rounded-2xl border border-app-border space-y-4"
      >
        <div>
          <h3 className="text-sm font-semibold text-app-primary">Пиковые часы</h3>
          <p className="text-xs text-app-muted font-mono">Распределение заказов по времени суток</p>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--chart-tooltip-bg)",
                  borderRadius: "12px",
                  color: "var(--chart-tooltip-text)",
                  border: "1px solid var(--chart-tooltip-border)",
                  fontSize: "12px"
                }}
                formatter={(val: any) => [`${val} заказов`, "Количество"]}
              />
              <Bar dataKey="orders" fill="var(--chart-line)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
