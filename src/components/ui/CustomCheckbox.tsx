import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";

export interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
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
  label,
  description,
  className = "",
  id,
}) => {
  const sizeClasses = {
    sm: "w-4 h-4 rounded-md text-[10px]",
    md: "w-5 h-5 rounded-lg text-xs",
    lg: "w-6 h-6 rounded-lg text-sm",
  };

  const iconSizes = {
    sm: 11,
    md: 13,
    lg: 15,
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
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className={`relative flex items-center justify-center transition-all duration-150 shrink-0 border ${
          sizeClasses[size]
        } ${
          checked
            ? "bg-app-primary border-app-primary text-app-surface shadow-xs"
            : "bg-app-surface border-app-border hover:border-app-primary/60 text-transparent"
        } ${
          disabled ? "" : "active:scale-90"
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/30`}
      >
        <AnimatePresence initial={false}>
          {checked && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex items-center justify-center pointer-events-none"
            >
              <Check
                size={iconSizes[size]}
                strokeWidth={3}
                className="text-app-surface"
              />
            </motion.div>
          )}
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
