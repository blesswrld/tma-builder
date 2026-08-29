import React, { useState, useRef, useEffect, useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
  disabled?: boolean;
}

interface CustomDropdownProps<T extends string = string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  align?: "left" | "right";
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  minMenuWidth?: string;
  id?: string;
}

export function CustomDropdown<T extends string = string>({
  value,
  options,
  onChange,
  label,
  icon,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  align = "left",
  placeholder = "Выберите...",
  size = "sm",
  disabled = false,
  minMenuWidth = "min-w-[180px]",
  id,
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const dropdownId = id || generatedId;

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const nextIndex = prev + 1 >= options.length ? 0 : prev + 1;
          return nextIndex;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const prevIndex = prev - 1 < 0 ? options.length - 1 : prev - 1;
          return prevIndex;
        });
      } else if (e.key === "Enter" || e.key === " ") {
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          e.preventDefault();
          const opt = options[highlightedIndex];
          if (!opt.disabled) {
            onChange(opt.value);
            setIsOpen(false);
            buttonRef.current?.focus();
          }
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, highlightedIndex, options, onChange]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionsListRef.current) {
      const highlightedEl = optionsListRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Reset highlight index when opened
  const handleOpen = () => {
    if (disabled) return;
    const currentIndex = options.findIndex((opt) => opt.value === value);
    setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
    setIsOpen((prev) => !prev);
  };

  const buttonSizeClasses =
    size === "sm"
      ? "px-3 py-1.5 text-xs rounded-xl font-mono"
      : size === "lg"
      ? "px-4 py-2.5 text-sm rounded-xl font-mono"
      : "px-3.5 py-2 text-xs sm:text-sm rounded-xl font-mono";

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef} id={`dropdown-container-${dropdownId}`}>
      {label && (
        <label className="block text-[11px] font-mono text-app-muted mb-1 select-none">
          {label}
        </label>
      )}

      <button
        ref={buttonRef}
        id={`dropdown-btn-${dropdownId}`}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={handleOpen}
        className={`w-full inline-flex items-center justify-between gap-2 bg-app-surface border border-app-border hover:bg-app-hover hover:border-app-border text-app-primary shadow-2xs transition-all duration-150 cursor-pointer select-none font-medium ${buttonSizeClasses} ${
          isOpen ? "ring-2 ring-app-primary/20 border-app-accent scale-[0.99]" : "active:scale-95"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${buttonClassName}`}
      >
        <span className="flex items-center gap-2 truncate min-w-0">
          {icon && <span className="text-app-muted shrink-0">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0 text-app-primary">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </span>
        <ChevronDown
          size={14}
          className={`text-app-muted transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-app-primary" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className={`absolute ${
              align === "right" ? "right-0" : "left-0"
            } mt-1.5 ${minMenuWidth} w-full max-w-[320px] bg-app-card border border-app-border rounded-xl shadow-xl z-50 p-1 backdrop-blur-md overflow-hidden ${menuClassName}`}
            onClick={(e) => e.stopPropagation()}
            role="listbox"
            tabIndex={-1}
          >
            <div ref={optionsListRef} className="max-h-60 overflow-y-auto space-y-0.5 font-mono text-xs custom-scrollbar">
              {options.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => {
                      if (!option.disabled) {
                        onChange(option.value);
                        setIsOpen(false);
                        buttonRef.current?.focus();
                      }
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg font-medium flex items-start justify-between gap-2.5 transition-colors cursor-pointer select-none ${
                      isSelected
                        ? "bg-app-surface text-app-primary font-bold shadow-2xs border border-app-border/60"
                        : isHighlighted
                        ? "bg-app-hover text-app-primary"
                        : "text-app-secondary hover:bg-app-hover hover:text-app-primary"
                    } ${option.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {option.icon && (
                        <span className={`shrink-0 mt-0.5 ${isSelected ? "text-app-primary" : "text-app-muted"}`}>
                          {option.icon}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{option.label}</div>
                        {option.description && (
                          <div className="text-[10px] text-app-muted font-normal mt-0.5 leading-snug break-words">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-center">
                      {option.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-mono rounded ${
                            option.badgeColor || "bg-app-surface text-app-muted border border-app-border"
                          }`}
                        >
                          {option.badge}
                        </span>
                      )}
                      {isSelected ? (
                        <Check size={14} className="text-app-primary shrink-0" />
                      ) : (
                        <span className="w-3.5" />
                      )}
                    </div>
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

