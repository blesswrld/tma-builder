import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Minus } from "lucide-react";

export interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success";
  indeterminate?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  id?: string;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  onChange,
  disabled = false,
  size = "md",
  variant = "default",
  indeterminate = false,
  label,
  description,
  className = "",
  id,
}) => {
  const sizeClasses = {
    sm: "w-4 h-4 rounded-md text-[10px]",
    md: "w-[18px] h-[18px] rounded-lg text-xs",
    lg: "w-5 h-5 rounded-lg text-sm",
  };

  const iconSizes = {
    sm: 11,
    md: 12,
    lg: 14,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  const isCheckedOrIndeterminate = checked || indeterminate;

  // Variant styling
  const getCheckedClasses = () => {
    if (variant === "success") {
      return "bg-emerald-600 border-emerald-600 text-white shadow-xs";
    }
    return "bg-app-accent border-app-accent text-app-accent-fg shadow-xs";
  };

  const getUncheckedClasses = () => {
    if (variant === "success") {
      return "bg-app-card border-app-border hover:border-emerald-500/50 text-transparent";
    }
    return "bg-app-card border-app-border hover:border-app-border-focus text-transparent";
  };

  const getFocusRing = () => {
    if (variant === "success") {
      return "focus-visible:ring-2 focus-visible:ring-emerald-500/30";
    }
    return "focus-visible:ring-2 focus-visible:ring-app-primary/30";
  };

  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${className}`}
      onClick={handleClick}
      id={id}
    >
      <div
        role="checkbox"
        aria-checked={indeterminate ? "mixed" : checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className={`relative flex items-center justify-center transition-all duration-150 shrink-0 border ${
          sizeClasses[size]
        } ${
          isCheckedOrIndeterminate ? getCheckedClasses() : getUncheckedClasses()
        } ${disabled ? "" : "active:scale-95"} focus-visible:outline-none ${getFocusRing()}`}
      >
        <AnimatePresence initial={false}>
          {indeterminate ? (
            <motion.div
              key="indeterminate"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex items-center justify-center pointer-events-none"
            >
              <Minus
                size={iconSizes[size]}
                strokeWidth={3}
                className={variant === "success" ? "text-white" : "text-app-accent-fg"}
              />
            </motion.div>
          ) : checked ? (
            <motion.div
              key="checked"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex items-center justify-center pointer-events-none"
            >
              <Check
                size={iconSizes[size]}
                strokeWidth={3}
                className={variant === "success" ? "text-white" : "text-app-accent-fg"}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-xs font-mono font-medium text-app-primary leading-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[10px] font-mono text-app-muted mt-0.5 leading-tight">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
