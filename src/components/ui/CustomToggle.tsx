import React from "react";

interface CustomToggleProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "success";
  size?: "sm" | "md";
}

export const CustomToggle: React.FC<CustomToggleProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
  className = "",
  variant = "default",
  size = "md"
}) => {
  const isSm = size === "sm";

  const trackActiveBg =
    variant === "success"
      ? "bg-emerald-500 border-emerald-600"
      : "bg-app-accent border-app-border";

  return (
    <label
      htmlFor={id}
      className={`relative inline-flex items-center shrink-0 select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div
        className={`transition-colors rounded-full border ${
          isSm ? "w-9 h-5" : "w-11 h-6"
        } ${
          checked
            ? trackActiveBg
            : "bg-app-surface border-app-border hover:border-app-border-focus"
        }`}
      >
        <div
          className={`absolute rounded-full transition-transform shadow-xs ${
            isSm
              ? `top-[2px] left-[2px] w-4 h-4 ${
                  checked
                    ? "translate-x-4 bg-app-accent-fg"
                    : "translate-x-0 bg-app-muted"
                }`
              : `top-[2px] left-[2px] w-5 h-5 ${
                  checked
                    ? "translate-x-5 bg-app-accent-fg"
                    : "translate-x-0 bg-app-muted"
                }`
          }`}
        />
      </div>
    </label>
  );
};
