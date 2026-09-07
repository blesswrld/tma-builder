import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  Calculator,
  RotateCcw,
  Copy,
  Check,
  TrendingUp,
  Percent,
  Layers,
  ArrowRight
} from "lucide-react";

interface MarginCalculatorProps {
  topServices?: Array<{ title: string; count: number; total: number }>;
  avgCheck?: number;
  currencySymbol?: string;
}

export default function MarginCalculator({
  topServices = [],
  avgCheck = 0,
  currencySymbol = "₽"
}: MarginCalculatorProps) {
  // Primary state
  const defaultPrice = avgCheck > 0 ? avgCheck : 1500;
  const [sellingPrice, setSellingPrice] = useState<number>(defaultPrice);
  const [costPrice, setCostPrice] = useState<number>(Math.round(defaultPrice * 0.35));
  const [volume, setVolume] = useState<number>(100);
  const [taxRate, setTaxRate] = useState<number>(3); // %
  const [copied, setCopied] = useState<boolean>(false);

  // Calculations
  const calc = useMemo(() => {
    const price = Math.max(0, sellingPrice || 0);
    const cost = Math.max(0, costPrice || 0);
    const rate = Math.max(0, taxRate || 0);
    const qty = Math.max(1, volume || 1);

    const taxAmount = Math.round((price * rate) / 100);
    const totalUnitCost = cost + taxAmount;
    const unitNetProfit = price - totalUnitCost;

    // Margin % = (Net Profit / Price) * 100
    const marginPercent = price > 0 ? (unitNetProfit / price) * 100 : 0;

    // Markup % = (Net Profit / Cost) * 100
    const markupPercent = cost > 0 ? (unitNetProfit / cost) * 100 : 0;

    // Totals for volume
    const totalRevenue = price * qty;
    const totalCosts = totalUnitCost * qty;
    const totalNetProfit = unitNetProfit * qty;

    // Health categorization
    let healthLabel = "Оптимальная маржа";
    let healthColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";

    if (unitNetProfit <= 0) {
      healthLabel = "Убыток";
      healthColor = "text-rose-500 bg-rose-500/10 border-rose-500/20";
    } else if (marginPercent < 20) {
      healthLabel = "Низкая маржа";
      healthColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    } else if (marginPercent < 45) {
      healthLabel = "Умеренная маржа";
      healthColor = "text-blue-500 bg-blue-500/10 border-blue-500/20";
    } else if (marginPercent < 65) {
      healthLabel = "Высокая маржа";
      healthColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    } else {
      healthLabel = "Сверхвысокая маржа";
      healthColor = "text-purple-500 bg-purple-500/10 border-purple-500/20";
    }

    // Shares in price
    const costShare = price > 0 ? Math.min(100, Math.max(0, (cost / price) * 100)) : 0;
    const taxShare = price > 0 ? Math.min(100, Math.max(0, (taxAmount / price) * 100)) : 0;
    const profitShare = Math.max(0, 100 - costShare - taxShare);

    return {
      price,
      cost,
      taxAmount,
      totalUnitCost,
      unitNetProfit,
      marginPercent,
      markupPercent,
      totalRevenue,
      totalCosts,
      totalNetProfit,
      costShare,
      taxShare,
      profitShare,
      healthLabel,
      healthColor,
      qty
    };
  }, [sellingPrice, costPrice, taxRate, volume]);

  const handleCopy = () => {
    const text = `Маржинальность: Цена ${calc.price} ₽ | Себестоимость ${calc.cost} ₽ | Прибыль/шт ${calc.unitNetProfit} ₽ (${calc.marginPercent.toFixed(1)}%) | Наценка ${calc.markupPercent.toFixed(1)}% | На ${calc.qty} шт: ${calc.totalNetProfit.toLocaleString("ru-RU")} ₽`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    const base = avgCheck > 0 ? avgCheck : 1500;
    setSellingPrice(base);
    setCostPrice(Math.round(base * 0.35));
    setVolume(100);
    setTaxRate(3);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-app-surface p-5 rounded-2xl border border-app-border space-y-4"
    >
      {/* Header: Title, Subtitle, Quick Picks & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-app-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-app-card text-app-primary rounded-xl shrink-0 border border-app-border">
            <Calculator size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-app-primary">Калькулятор маржинальности</h3>
              <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border ${calc.healthColor}`}>
                {calc.healthLabel}
              </span>
            </div>
            <p className="text-xs text-app-muted font-mono">
              Экспресс-расчёт себестоимости, наценки и чистой прибыли
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-secondary hover:text-app-primary rounded-xl text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Скопировать расчёт"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span className="hidden sm:inline">{copied ? "Скопировано" : "Копировать"}</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-secondary hover:text-app-primary rounded-xl text-xs font-mono transition-colors cursor-pointer"
            title="Сбросить"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Row 1: Compact Inputs Bar (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Selling Price */}
        <div className="bg-app-card p-3 rounded-xl border border-app-border space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-app-muted">
            <span>Цена продажи</span>
            <span>{currencySymbol}</span>
          </div>
          <input
            type="number"
            min="0"
            step="50"
            value={sellingPrice || ""}
            onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
            className="w-full bg-app-surface border border-app-border rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono text-app-primary focus:outline-none focus:border-app-primary transition-colors"
            placeholder="0"
          />
          <div className="flex items-center gap-1 pt-0.5">
            {[500, 1000, 2000, 3000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setSellingPrice(val)}
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono cursor-pointer transition-colors border ${
                  sellingPrice === val
                    ? "bg-app-surface text-app-primary font-bold border-app-border"
                    : "text-app-muted hover:text-app-secondary border-transparent hover:bg-app-hover"
                }`}
              >
                {val >= 1000 ? `${val / 1000}k` : val}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Cost Price */}
        <div className="bg-app-card p-3 rounded-xl border border-app-border space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-app-muted">
            <span>Себестоимость</span>
            <span>{currencySymbol}</span>
          </div>
          <input
            type="number"
            min="0"
            step="50"
            value={costPrice || ""}
            onChange={(e) => setCostPrice(Number(e.target.value) || 0)}
            className="w-full bg-app-surface border border-app-border rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono text-app-primary focus:outline-none focus:border-app-primary transition-colors"
            placeholder="0"
          />
          <div className="flex items-center gap-1 pt-0.5">
            {[20, 35, 50].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setCostPrice(Math.round((sellingPrice * pct) / 100))}
                className="px-1.5 py-0.5 rounded text-[9.5px] font-mono text-app-muted hover:text-app-secondary hover:bg-app-hover cursor-pointer transition-colors"
                title={`${pct}% от цены`}
              >
                {pct}%
              </button>
            ))}
            <span className="text-[9.5px] font-mono text-app-muted ml-auto">
              {calc.costShare.toFixed(0)}% доли
            </span>
          </div>
        </div>

        {/* 3. Sales Volume (Units) */}
        <div className="bg-app-card p-3 rounded-xl border border-app-border space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-app-muted">
            <span>Объём партии</span>
            <span>шт</span>
          </div>
          <input
            type="number"
            min="1"
            step="10"
            value={volume || ""}
            onChange={(e) => setVolume(Number(e.target.value) || 1)}
            className="w-full bg-app-surface border border-app-border rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono text-app-primary focus:outline-none focus:border-app-primary transition-colors"
            placeholder="100"
          />
          <div className="flex items-center gap-1 pt-0.5">
            {[1, 10, 50, 100, 250].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setVolume(val)}
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono cursor-pointer transition-colors border ${
                  volume === val
                    ? "bg-app-surface text-app-primary font-bold border-app-border"
                    : "text-app-muted hover:text-app-secondary border-transparent hover:bg-app-hover"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Tax / Overhead % */}
        <div className="bg-app-card p-3 rounded-xl border border-app-border space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-app-muted">
            <span>Эквайринг & Налог</span>
            <span>%</span>
          </div>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={taxRate || ""}
            onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
            className="w-full bg-app-surface border border-app-border rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono text-app-primary focus:outline-none focus:border-app-primary transition-colors"
            placeholder="0"
          />
          <div className="flex items-center gap-1 pt-0.5">
            {[0, 1.5, 3, 6].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setTaxRate(rate)}
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono cursor-pointer transition-colors border ${
                  taxRate === rate
                    ? "bg-app-surface text-app-primary font-bold border-app-border"
                    : "text-app-muted hover:text-app-secondary border-transparent hover:bg-app-hover"
                }`}
              >
                {rate}%
              </button>
            ))}
            <span className="text-[9.5px] font-mono text-app-muted ml-auto">
              ~{calc.taxAmount} ₽/ед
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Four Harmonious KPI Metric Cards (Identical style to the top Analytics KPI cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Unit Profit */}
        <div className="bg-app-card p-3.5 rounded-xl border border-app-border flex flex-col justify-between">
          <p className="text-[10px] font-mono uppercase tracking-wider text-app-muted">
            Прибыль с 1 шт
          </p>
          <div className="text-xl font-bold font-mono text-app-primary mt-1">
            {calc.unitNetProfit.toLocaleString("ru-RU")} {currencySymbol}
          </div>
          <p className="text-[10px] font-mono text-app-muted mt-1">
            Себест. + расходы: {calc.totalUnitCost.toLocaleString("ru-RU")} {currencySymbol}
          </p>
        </div>

        {/* KPI 2: Margin % */}
        <div className="bg-app-card p-3.5 rounded-xl border border-app-border flex flex-col justify-between">
          <p className="text-[10px] font-mono uppercase tracking-wider text-app-muted">
            Маржинальность
          </p>
          <div className="text-xl font-bold font-mono text-app-primary mt-1">
            {calc.marginPercent.toFixed(1)}%
          </div>
          <p className="text-[10px] font-mono text-app-secondary mt-1">
            Доля чистой прибыли в чеке
          </p>
        </div>

        {/* KPI 3: Markup % */}
        <div className="bg-app-card p-3.5 rounded-xl border border-app-border flex flex-col justify-between">
          <p className="text-[10px] font-mono uppercase tracking-wider text-app-muted">
            Наценка (Markup)
          </p>
          <div className="text-xl font-bold font-mono text-app-primary mt-1">
            {calc.markupPercent.toFixed(1)}%
          </div>
          <p className="text-[10px] font-mono text-app-secondary mt-1">
            Отношение прибыли к себестоимости
          </p>
        </div>

        {/* KPI 4: Total Batch Profit */}
        <div className="bg-app-card p-3.5 rounded-xl border border-app-border flex flex-col justify-between">
          <p className="text-[10px] font-mono uppercase tracking-wider text-app-muted">
            Итого на {calc.qty} шт
          </p>
          <div className="text-xl font-bold font-mono text-emerald-500 mt-1">
            {calc.totalNetProfit.toLocaleString("ru-RU")} {currencySymbol}
          </div>
          <p className="text-[10px] font-mono text-app-muted mt-1">
            Выручка: {calc.totalRevenue.toLocaleString("ru-RU")} {currencySymbol}
          </p>
        </div>
      </div>

      {/* Row 3: Slim Price Structure Progress Bar (h-1.5) */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-app-muted">
          <span>Структура розничной цены: 100% ({calc.price.toLocaleString("ru-RU")} {currencySymbol})</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
              Себестоимость {calc.costShare.toFixed(0)}%
            </span>
            {calc.taxShare > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                Расходы {calc.taxShare.toFixed(0)}%
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Прибыль {calc.profitShare.toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="h-1.5 w-full bg-app-card rounded-full overflow-hidden flex border border-app-border/40">
          <div
            style={{ width: `${calc.costShare}%` }}
            className="h-full bg-zinc-400 dark:bg-zinc-600 transition-all duration-300"
          />
          {calc.taxShare > 0 && (
            <div
              style={{ width: `${calc.taxShare}%` }}
              className="h-full bg-amber-500/80 transition-all duration-300"
            />
          )}
          <div
            style={{ width: `${calc.profitShare}%` }}
            className={`h-full transition-all duration-300 ${
              calc.unitNetProfit > 0 ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
        </div>
      </div>
    </motion.div>
  );
}
