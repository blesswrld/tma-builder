import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface CustomDropdownProps<T extends string = string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  align?: "left" | "right";
  placeholder?: string;
  size?: "sm" | "md";
  disabled?: boolean;
}

export function CustomDropdown<T extends string = string>({
  value,
  options,
  onChange,
  label,
  icon,
  className = "",
  align = "left",
  placeholder = "Выберите...",
  size = "sm",
  disabled = false
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const buttonSizeClasses =
    size === "sm"
      ? "px-2.5 py-1 text-xs rounded-xl font-mono font-medium"
      : "px-3 py-1.5 text-xs sm:text-sm rounded-xl font-mono font-medium";

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-[11px] font-mono text-app-muted mb-1">
          {label}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`w-full inline-flex items-center justify-between gap-1.5 bg-app-card border border-app-border hover:bg-app-hover hover:border-app-border text-app-primary shadow-2xs transition-all duration-150 cursor-pointer select-none ${buttonSizeClasses} ${
          isOpen ? "ring-2 ring-app-primary/20 scale-[0.99]" : "active:scale-95"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span className="flex items-center gap-1.5 truncate min-w-0">
          {icon && <span className="text-app-muted shrink-0">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </span>
        <ChevronDown
          size={13}
          className={`text-app-muted transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-app-primary" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className={`absolute ${
              align === "right" ? "right-0" : "left-0"
            } mt-1 w-full min-w-[150px] max-w-[260px] bg-app-surface/95 dark:bg-app-card border border-app-border rounded-xl shadow-xl z-50 p-1 backdrop-blur-md overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-56 overflow-y-auto space-y-0.5 font-mono text-xs">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-app-card text-app-primary font-bold shadow-2xs"
                        : "text-app-secondary hover:bg-app-hover hover:text-app-primary"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {option.icon && <span className="text-app-muted shrink-0">{option.icon}</span>}
                      <span className="truncate">{option.label}</span>
                    </span>

                    <span className="flex items-center gap-1 shrink-0 ml-1">
                      {option.badge !== undefined && (
                        <span className="px-1.5 py-0.2 text-[10px] bg-app-surface text-app-muted border border-app-border rounded">
                          {option.badge}
                        </span>
                      )}
                      {isSelected && <Check size={13} className="text-app-primary shrink-0" />}
                    </span>
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

export default CustomDropdown;

