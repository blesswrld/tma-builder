import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CustomDatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  minDate?: string; // YYYY-MM-DD
  placeholder?: string;
  className?: string;
  position?: "top" | "bottom";
}

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function CustomDatePicker({
  value,
  onChange,
  minDate,
  placeholder = "Выберите дату",
  className = "",
  position = "top",
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Today string YYYY-MM-DD
  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;

  // Internal view year and month (0-indexed)
  const initialYear = value ? parseInt(value.split("-")[0], 10) : todayObj.getFullYear();
  const initialMonth = value ? parseInt(value.split("-")[1], 10) - 1 : todayObj.getMonth();

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  // Synchronize view with value when opened
  useEffect(() => {
    if (isOpen && value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [isOpen, value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Days matrix calculation (Monday-first)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // 0 = Mon, 6 = Sun

  const days: { day: number; dateStr: string; isCurrentMonth: boolean; isDisabled: boolean }[] = [];

  // Previous month trailing days
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = viewMonth === 0 ? 12 : viewMonth;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({
      day: d,
      dateStr,
      isCurrentMonth: false,
      isDisabled: Boolean(minDate && dateStr < minDate),
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({
      day: d,
      dateStr,
      isCurrentMonth: true,
      isDisabled: Boolean(minDate && dateStr < minDate),
    });
  }

  // Next month leading days to complete grid (multiples of 7)
  const totalSlots = Math.ceil(days.length / 7) * 7;
  const remaining = totalSlots - days.length;
  for (let d = 1; d <= remaining; d++) {
    const m = viewMonth === 11 ? 1 : viewMonth + 2;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({
      day: d,
      dateStr,
      isCurrentMonth: false,
      isDisabled: Boolean(minDate && dateStr < minDate),
    });
  }

  const handleSelectDate = (dateStr: string, isDisabled: boolean) => {
    if (isDisabled) return;
    onChange(dateStr);
    setIsOpen(false);
  };

  // Format value for display (e.g. 31.08.2026)
  const formattedDisplay = value
    ? (() => {
        const parts = value.split("-");
        if (parts.length === 3) {
          return `${parts[2]}.${parts[1]}.${parts[0]}`;
        }
        return value;
      })()
    : null;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-app-surface border ${
          isOpen ? "border-app-accent shadow-xs" : "border-app-border"
        } rounded-xl px-3 py-1.5 sm:py-2 text-xs font-mono flex items-center justify-between transition-all cursor-pointer text-left hover:border-app-primary/40`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon size={14} className="text-app-muted shrink-0" />
          <span className={formattedDisplay ? "text-app-primary font-medium truncate" : "text-app-muted truncate"}>
            {formattedDisplay || placeholder}
          </span>
        </div>
        {value && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            title="Очистить дату"
            className="p-0.5 hover:bg-app-hover rounded-md text-app-muted hover:text-app-primary transition-colors cursor-pointer shrink-0"
          >
            <X size={13} />
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: position === "top" ? 6 : -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === "top" ? 6 : -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 left-0 sm:left-auto right-0 ${
              position === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
            } w-64 p-2.5 bg-app-modal border border-app-border rounded-2xl shadow-2xl backdrop-blur-md`}
          >
            {/* Header: Month / Year Navigation */}
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-app-border">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-app-surface text-app-secondary hover:text-app-primary transition-colors cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>

              <div className="font-mono text-[11px] font-bold text-app-primary">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-app-surface text-app-secondary hover:text-app-primary transition-colors cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
              {DAY_NAMES.map((d, i) => (
                <span
                  key={d}
                  className={`text-[9px] font-mono font-semibold ${
                    i >= 5 ? "text-rose-500" : "text-app-secondary"
                  }`}
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {days.map(({ day, dateStr, isCurrentMonth, isDisabled }, idx) => {
                const isSelected = value === dateStr;
                const isToday = todayStr === dateStr;

                return (
                  <button
                    key={`${dateStr}-${idx}`}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleSelectDate(dateStr, isDisabled)}
                    className={`h-6.5 w-6.5 mx-auto rounded-lg text-[11px] font-mono flex items-center justify-center transition-all ${
                      isDisabled
                        ? "text-app-muted/30 opacity-40 cursor-not-allowed"
                        : isSelected
                        ? "bg-app-accent text-app-accent-fg font-bold shadow-2xs cursor-pointer scale-105"
                        : isCurrentMonth
                        ? "text-app-primary hover:bg-app-surface cursor-pointer"
                        : "text-app-secondary/50 hover:bg-app-surface/50 cursor-pointer"
                    } ${isToday && !isSelected ? "border border-app-border font-bold text-app-primary" : ""}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions Footer */}
            <div className="mt-2 pt-1.5 border-t border-app-border flex items-center justify-between text-[10px] font-mono">
              <button
                type="button"
                onClick={() => {
                  onChange(todayStr);
                  setIsOpen(false);
                }}
                className="text-app-secondary hover:text-app-primary cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-app-surface transition-colors font-medium"
              >
                Сегодня
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-app-secondary hover:text-app-primary cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-app-surface transition-colors font-medium"
              >
                Бессрочно
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
