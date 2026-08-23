import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Wrench,
  CheckCircle2,
  XCircle,
  Lock,
  ChevronDown,
  Check
} from "lucide-react";

export type ReportStatusType = "NEW" | "IN_PROGRESS" | "RESOLVED" | "REJECTED" | "CLOSED";

interface StatusOption {
  value: ReportStatusType;
  label: string;
  dotColor: string;
  bgBadge: string;
  textColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

export const STATUS_CONFIG: Record<ReportStatusType, StatusOption> = {
  NEW: {
    value: "NEW",
    label: "НОВЫЙ",
    dotColor: "bg-emerald-500",
    bgBadge: "bg-emerald-500/10 dark:bg-emerald-500/20",
    textColor: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-500/30",
    icon: <Sparkles size={13} className="text-emerald-500" />
  },
  IN_PROGRESS: {
    value: "IN_PROGRESS",
    label: "В РАБОТЕ",
    dotColor: "bg-amber-500",
    bgBadge: "bg-amber-500/10 dark:bg-amber-500/20",
    textColor: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-500/30",
    icon: <Wrench size={13} className="text-amber-500" />
  },
  RESOLVED: {
    value: "RESOLVED",
    label: "РЕШЕНО",
    dotColor: "bg-blue-500",
    bgBadge: "bg-blue-500/10 dark:bg-blue-500/20",
    textColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-500/30",
    icon: <CheckCircle2 size={13} className="text-blue-500" />
  },
  REJECTED: {
    value: "REJECTED",
    label: "ОТКЛОНЕНО",
    dotColor: "bg-rose-500",
    bgBadge: "bg-rose-500/10 dark:bg-rose-500/20",
    textColor: "text-rose-600 dark:text-rose-400",
    borderColor: "border-rose-500/30",
    icon: <XCircle size={13} className="text-rose-500" />
  },
  CLOSED: {
    value: "CLOSED",
    label: "ЗАКРЫТО",
    dotColor: "bg-zinc-400",
    bgBadge: "bg-zinc-500/10 dark:bg-zinc-500/20",
    textColor: "text-zinc-600 dark:text-zinc-400",
    borderColor: "border-zinc-500/30",
    icon: <Lock size={13} className="text-zinc-400" />
  }
};

interface ReportStatusDropdownProps {
  status: string;
  onChange: (newStatus: ReportStatusType) => void;
  disabled?: boolean;
  align?: "left" | "right";
  size?: "sm" | "md";
}

export function ReportStatusDropdown({
  status,
  onChange,
  disabled = false,
  align = "left",
  size = "sm"
}: ReportStatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentConfig = STATUS_CONFIG[(status as ReportStatusType) || "NEW"] || STATUS_CONFIG.NEW;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: ReportStatusType) => {
    if (val !== status) {
      onChange(val);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-1.5 font-mono font-medium transition-all duration-150 rounded-lg border border-app-border bg-app-card hover:bg-app-hover text-app-primary shadow-xs cursor-pointer select-none ${
          size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
        } ${
          isOpen ? "ring-2 ring-app-primary/20 scale-[0.98]" : "active:scale-95"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        title="Изменить статус отчёта"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${currentConfig.dotColor}`} />
        <span className="truncate tracking-wide">{currentConfig.label}</span>
        <ChevronDown
          size={12}
          className={`shrink-0 text-app-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Floating Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={`absolute z-50 mt-1.5 min-w-[170px] bg-app-card border border-app-border rounded-xl shadow-xl overflow-hidden py-1 backdrop-blur-md ${
              align === "right" ? "right-0" : "left-0"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2.5 py-1 text-[10px] uppercase font-mono font-semibold text-app-muted border-b border-app-border/60">
              Статус тикета
            </div>

            <div className="p-1 space-y-0.5">
              {(Object.keys(STATUS_CONFIG) as ReportStatusType[]).map((key) => {
                const opt = STATUS_CONFIG[key];
                const isSelected = key === status;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelect(key)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg font-mono font-medium transition-colors cursor-pointer text-left ${
                      isSelected
                        ? "bg-app-hover text-app-primary font-bold"
                        : "text-app-secondary hover:bg-app-hover hover:text-app-primary"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
                      <span className="text-[11px] tracking-wide">{opt.label}</span>
                    </div>

                    {isSelected && (
                      <Check size={13} className="text-app-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
