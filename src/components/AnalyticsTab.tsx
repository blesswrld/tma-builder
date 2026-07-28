import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { TrendingUp, ShoppingBag, DollarSign, Award, Clock, RefreshCw, BarChart2 } from "lucide-react";

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

const COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#64748b"];

export default function AnalyticsTab({ shopId }: AnalyticsTabProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shops/${shopId}/analytics`);
      if (!res.ok) throw new Error("Не удалось загрузить данные аналитики");
      const analyticsData = await res.json();
      setData(analyticsData);
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки отчета");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shopId) {
      fetchAnalytics();
    }
  }, [shopId]);

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-xs flex flex-col items-center justify-center gap-3">
        <RefreshCw size={24} className="animate-spin text-indigo-600" />
        <p className="text-xs font-semibold text-slate-500">Расчет финансовых и операционных показателей...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-rose-50 rounded-3xl border border-rose-100 text-rose-700 space-y-3">
        <p className="text-xs font-bold">{error || "Нет данных за выбранный период"}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors"
        >
          Повторить попытку
        </button>
      </div>
    );
  }

  const { summary, dailyTrends, topServices, hourlyDistribution } = data;

  return (
    <div className="space-y-6">
      {/* Ключевые показатели (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Выручка</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">
              {summary.totalRevenue.toLocaleString("ru-RU")} ₽
            </h3>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
              <TrendingUp size={12} /> Завершенные заказы
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
            <ShoppingBag size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Всего заказов</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{summary.totalOrders}</h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              {summary.completedOrders} выполнено ({summary.totalOrders > 0 ? Math.round((summary.completedOrders / summary.totalOrders) * 100) : 0}%)
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
            <Award size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Средний чек</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">
              {summary.avgCheck.toLocaleString("ru-RU")} ₽
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">На 1 оплаченный чек</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shrink-0">
            <BarChart2 size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Услуг в топе</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{topServices.length}</h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Популярные позиции</p>
          </div>
        </div>
      </div>

      {/* Графики динамики выручки и топ продаж */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Динамика выручки (2 столбца) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Динамика выручки</h3>
              <p className="text-xs text-slate-500">Доходы по дням на основе выполненных заказов</p>
            </div>
            <button
              onClick={fetchAnalytics}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Обновить"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="h-64 w-full">
            {dailyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={val => val.slice(5)}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "12px",
                      color: "#fff",
                      border: "none",
                      fontSize: "12px"
                    }}
                    formatter={(val: any) => [`${Number(val).toLocaleString("ru-RU")} ₽`, "Выручка"]}
                    labelFormatter={label => `Дата: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Недостаточно данных для построения графика выручки
              </div>
            )}
          </div>
        </div>

        {/* Топ блюд / услуг по продажам */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Топ услуг</h3>
            <p className="text-xs text-slate-500">Самые доходные позиции каталога</p>
          </div>

          {topServices.length > 0 ? (
            <div className="space-y-3">
              {topServices.map((service, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="font-semibold text-slate-800 truncate">{service.title}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900">{service.total.toLocaleString("ru-RU")} ₽</span>
                    <span className="text-[10px] text-slate-400 block">{service.count} шт.</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400 italic">
              Продаж пока не зафиксировано
            </div>
          )}
        </div>
      </div>

      {/* Распределение по часам суточной активности */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Пиковые часы заказов</h3>
          <p className="text-xs text-slate-500">Загрузка персонала и кухни в течение суток (00:00 - 23:00)</p>
        </div>

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderRadius: "12px",
                  color: "#fff",
                  border: "none",
                  fontSize: "12px"
                }}
                formatter={(val: any) => [`${val} заказов`, "Количество"]}
              />
              <Bar dataKey="orders" fill="#0284c7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
