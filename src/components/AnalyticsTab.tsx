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
import { TrendingUp, ShoppingBag, DollarSign, Award, RefreshCw, BarChart2, Zap } from "lucide-react";
import { AnalyticsSkeleton } from "./Skeleton";
import { useRealtimeEvent } from "../context/RealtimeContext";
import { useAuth } from "../context/AuthContext";
import RevenueDynamicsChart, { OrderTimelineItem } from "./RevenueDynamicsChart";
import MarginCalculator from "./MarginCalculator";

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
  ordersTimeline?: OrderTimelineItem[];
}

interface AnalyticsTabProps {
  shopId: string;
}

const MONO_COLORS = ["var(--text-primary)", "var(--text-secondary)", "var(--text-muted)", "var(--border)"];

function AnalyticsTabComponent({ shopId }: AnalyticsTabProps) {
  const { token } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const authToken = token || localStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      const res = await fetch(`/api/shops/${shopId}/analytics`, { headers });
      if (!res.ok) throw new Error("Не удалось загрузить аналитический отчёт");
      const analyticsData = await res.json();
      setData(analyticsData);
    } catch (err: any) {
      if (!silent) setError(err.message || "Ошибка при загрузке отчёта");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useRealtimeEvent(["ORDER_CREATED", "ORDER_STATUS_UPDATED", "ORDER_DELETED", "CUSTOMER_UPDATED", "REALTIME_RECONNECTED"], (event) => {
    if (!event.shopId || event.shopId === shopId) {
      fetchAnalytics(true);
    }
  });

  useEffect(() => {
    if (shopId) {
      fetchAnalytics();
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
  const ordersTimeline = data.ordersTimeline || [];

  const completionRate = summary.totalOrders > 0
    ? Math.round((summary.completedOrders / summary.totalOrders) * 100)
    : 0;

  const totalServicesRev = topServices.reduce((acc, s) => acc + s.total, 0) || 1;

  const peakHour = hourlyDistribution.length > 0
    ? hourlyDistribution.reduce((max, h) => (h.orders > (max?.orders || 0) ? h : max), hourlyDistribution[0])
    : null;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0 }}
          whileHover={{ y: -2 }}
          className="bg-app-surface p-5 rounded-2xl border border-app-border flex flex-col justify-between transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-app-card text-app-primary rounded-xl shrink-0 border border-app-border">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-app-muted">Общая выручка</p>
              <h3 className="text-xl font-bold text-app-primary mt-0.5 font-mono">
                {summary.totalRevenue.toLocaleString("ru-RU")} ₽
              </h3>
              <p className="text-[10px] text-emerald-500 font-mono mt-0.5 flex items-center gap-1">
                <TrendingUp size={12} /> Завершённые заказы
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          whileHover={{ y: -2 }}
          className="bg-app-surface p-5 rounded-2xl border border-app-border flex flex-col justify-between transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-app-card text-app-primary rounded-xl shrink-0 border border-app-border">
              <ShoppingBag size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-wider text-app-muted">Всего заказов</p>
              <h3 className="text-xl font-bold text-app-primary mt-0.5 font-mono">{summary.totalOrders}</h3>
              <p className="text-[10px] text-app-secondary font-mono mt-0.5 flex items-center justify-between">
                <span>{summary.completedOrders} выполнено</span>
                <span className="font-semibold text-emerald-500">{completionRate}%</span>
              </p>
            </div>
          </div>
          <div className="w-full bg-app-card h-1.5 rounded-full overflow-hidden mt-3 border border-app-border/40">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, completionRate)}%` }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          whileHover={{ y: -2 }}
          className="bg-app-surface p-5 rounded-2xl border border-app-border flex flex-col justify-between transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-app-card text-app-primary rounded-xl shrink-0 border border-app-border">
              <Award size={20} />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-app-muted">Средний чек</p>
              <h3 className="text-xl font-bold text-app-primary mt-0.5 font-mono">
                {summary.avgCheck.toLocaleString("ru-RU")} ₽
              </h3>
              <p className="text-[10px] text-app-secondary font-mono mt-0.5">В расчете на один заказ</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          whileHover={{ y: -2 }}
          className="bg-app-surface p-5 rounded-2xl border border-app-border flex flex-col justify-between transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-app-card text-app-primary rounded-xl shrink-0 border border-app-border">
              <BarChart2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-app-muted">Топовых услуг</p>
              <h3 className="text-xl font-bold text-app-primary mt-0.5 font-mono">{topServices.length}</h3>
              <p className="text-[10px] text-app-secondary font-mono mt-0.5">
                {topServices.length > 0
                  ? `~${Math.round(summary.totalRevenue / topServices.length).toLocaleString("ru-RU")} ₽ / позиция`
                  : "Активные позиции"}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Revenue Chart + Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="lg:col-span-2 bg-app-surface p-6 rounded-2xl border border-app-border"
        >
          <RevenueDynamicsChart
            ordersTimeline={ordersTimeline}
            dailyTrends={dailyTrends}
            hourlyDistribution={hourlyDistribution}
            summary={summary}
            onRefresh={fetchAnalytics}
          />
        </motion.div>

        {/* Top Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="bg-app-surface p-6 rounded-2xl border border-app-border space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-app-primary">Популярные позиции</h3>
              <p className="text-xs text-app-muted font-mono">Доля в структуре продаж</p>
            </div>
            <span className="text-[10px] font-mono text-app-muted px-2 py-0.5 rounded bg-app-card border border-app-border">
              ТОП-{topServices.length}
            </span>
          </div>

          {topServices.length > 0 ? (
            <div className="space-y-3.5">
              {topServices.map((service, idx) => {
                const share = Math.round((service.total / totalServicesRev) * 100);
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0.3 + idx * 0.04 }}
                    className="text-xs hover:bg-app-hover/50 p-2 -mx-2 rounded-xl transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: MONO_COLORS[idx % MONO_COLORS.length] }}
                        />
                        <span className="font-medium text-app-secondary truncate">{service.title}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-semibold text-app-primary font-mono">
                          {service.total.toLocaleString("ru-RU")} ₽
                        </span>
                        <span className="text-[10px] text-app-muted font-mono ml-1.5">
                          ({service.count} шт)
                        </span>
                      </div>
                    </div>
                    {/* Share progress bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-app-card h-1.5 rounded-full overflow-hidden border border-app-border/40">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(4, share)}%`,
                            backgroundColor: MONO_COLORS[idx % MONO_COLORS.length]
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-app-muted shrink-0 w-8 text-right">
                        {share}%
                      </span>
                    </div>
                  </motion.div>
                );
              })}
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-app-primary">Пиковые часы нагрузки</h3>
            <p className="text-xs text-app-muted font-mono">Распределение оформленных заказов по времени суток</p>
          </div>
          {peakHour && peakHour.orders > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-xl">
              <Zap size={12} className="fill-amber-400 text-amber-400" />
              <span>Час пик: {peakHour.hour} ({peakHour.orders} зак.)</span>
            </div>
          )}
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyDistribution} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} allowDecimals={false} width={30} />
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
              <Bar
                dataKey="orders"
                fill="var(--chart-line)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
                animationDuration={500}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Margin & Profitability Calculator */}
      <MarginCalculator
        topServices={topServices}
        avgCheck={summary.avgCheck}
      />
    </div>
  );
}

export default React.memo(AnalyticsTabComponent);
