import React, { useRef, useCallback, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export interface CustomNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  value?: number | string;
  defaultValue?: number | string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (val: number) => void;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  leftIcon?: React.ReactNode;
  suffix?: React.ReactNode;
  wrapperClassName?: string;
  className?: string;
  hideStepper?: boolean;
}

export const CustomNumberInput = React.forwardRef<HTMLInputElement, CustomNumberInputProps>(
  (
    {
      value,
      defaultValue,
      onChange,
      onValueChange,
      min,
      max,
      step = 1,
      disabled = false,
      readOnly = false,
      leftIcon,
      suffix,
      wrapperClassName = "",
      className = "",
      hideStepper = false,
      placeholder,
      id,
      ...props
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = (forwardedRef as React.RefObject<HTMLInputElement>) || internalRef;
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const stepNumber = typeof step === "number" ? step : parseFloat(step as string) || 1;
    const minNumber = min !== undefined && min !== "" ? Number(min) : undefined;
    const maxNumber = max !== undefined && max !== "" ? Number(max) : undefined;

    // Helper to safely format numbers and avoid floating point quirks (e.g. 0.1 + 0.2)
    const clampAndFormat = useCallback(
      (val: number): number => {
        let res = val;
        if (minNumber !== undefined) res = Math.max(minNumber, res);
        if (maxNumber !== undefined) res = Math.min(maxNumber, res);

        // Determine precision based on step
        const stepDecimals = (stepNumber.toString().split(".")[1] || "").length;
        const factor = Math.pow(10, Math.max(stepDecimals, 0));
        return Math.round(res * factor) / factor;
      },
      [minNumber, maxNumber, stepNumber]
    );

    const getCurrentValue = useCallback((): number => {
      if (inputRef.current) {
        const val = parseFloat(inputRef.current.value);
        if (!isNaN(val)) return val;
      }
      if (value !== undefined && value !== "") {
        const val = typeof value === "number" ? value : parseFloat(value);
        if (!isNaN(val)) return val;
      }
      if (defaultValue !== undefined && defaultValue !== "") {
        const val = typeof defaultValue === "number" ? defaultValue : parseFloat(defaultValue.toString());
        if (!isNaN(val)) return val;
      }
      return minNumber !== undefined ? minNumber : 0;
    }, [value, defaultValue, minNumber, inputRef]);

    const triggerChange = useCallback(
      (newVal: number) => {
        const formatted = clampAndFormat(newVal);
        const strVal = String(formatted);

        if (inputRef.current) {
          const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;
          if (nativeSetter) {
            nativeSetter.call(inputRef.current, strVal);
          } else {
            inputRef.current.value = strVal;
          }

          const event = new Event("input", { bubbles: true });
          inputRef.current.dispatchEvent(event);

          if (onChange) {
            const syntheticEvent = {
              target: inputRef.current,
              currentTarget: inputRef.current,
              preventDefault: () => {},
              stopPropagation: () => {},
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
          }
        }

        if (onValueChange) {
          onValueChange(formatted);
        }
      },
      [clampAndFormat, inputRef, onChange, onValueChange]
    );

    const handleStep = useCallback(
      (direction: "up" | "down") => {
        if (disabled || readOnly) return;
        const current = getCurrentValue();
        const delta = direction === "up" ? stepNumber : -stepNumber;
        triggerChange(current + delta);
      },
      [disabled, readOnly, getCurrentValue, stepNumber, triggerChange]
    );

    const stopContinuousStep = useCallback(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, []);

    const startContinuousStep = useCallback(
      (direction: "up" | "down", e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (disabled || readOnly) return;

        handleStep(direction);
        stopContinuousStep();

        timerRef.current = setTimeout(() => {
          intervalRef.current = setInterval(() => {
            handleStep(direction);
          }, 60);
        }, 320);
      },
      [disabled, readOnly, handleStep, stopContinuousStep]
    );

    useEffect(() => {
      return () => {
        stopContinuousStep();
      };
    }, [stopContinuousStep]);

    const isAtMin =
      minNumber !== undefined &&
      (value !== undefined && value !== "" ? Number(value) <= minNumber : false);
    const isAtMax =
      maxNumber !== undefined &&
      (value !== undefined && value !== "" ? Number(value) >= maxNumber : false);

    return (
      <div
        className={`relative inline-flex items-center w-full group ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        } ${wrapperClassName}`}
      >
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10">
            {leftIcon}
          </div>
        )}

        <input
          ref={inputRef}
          type="number"
          id={id}
          value={value}
          defaultValue={defaultValue}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={onChange}
          className={`w-full custom-number-input transition-colors ${
            leftIcon ? "pl-9" : "pl-3"
          } ${
            hideStepper ? (suffix ? "pr-8" : "pr-3") : suffix ? "pr-14" : "pr-8"
          } ${className}`}
          {...props}
        />

        {suffix && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 flex items-center pointer-events-none select-none text-app-muted z-10 ${
              hideStepper ? "right-3" : "right-8"
            }`}
          >
            {suffix}
          </div>
        )}

        {!hideStepper && (
          <div
            className={`absolute right-1 top-1 bottom-1 flex flex-col w-5.5 sm:w-6 border-l border-app-border/40 pl-0.5 justify-center z-10 select-none ${
              disabled || readOnly ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <button
              type="button"
              tabIndex={-1}
              aria-label="Увеличить значение"
              disabled={disabled || readOnly || isAtMax}
              onMouseDown={(e) => startContinuousStep("up", e)}
              onMouseUp={stopContinuousStep}
              onMouseLeave={stopContinuousStep}
              onTouchStart={(e) => startContinuousStep("up", e)}
              onTouchEnd={stopContinuousStep}
              className="flex-1 flex items-center justify-center text-app-muted hover:text-app-primary hover:bg-app-hover active:bg-app-surface rounded-t transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ChevronUp size={12} strokeWidth={2.2} />
            </button>
            <div className="h-[1px] w-full bg-app-border/30" />
            <button
              type="button"
              tabIndex={-1}
              aria-label="Уменьшить значение"
              disabled={disabled || readOnly || isAtMin}
              onMouseDown={(e) => startContinuousStep("down", e)}
              onMouseUp={stopContinuousStep}
              onMouseLeave={stopContinuousStep}
              onTouchStart={(e) => startContinuousStep("down", e)}
              onTouchEnd={stopContinuousStep}
              className="flex-1 flex items-center justify-center text-app-muted hover:text-app-primary hover:bg-app-hover active:bg-app-surface rounded-b transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ChevronDown size={12} strokeWidth={2.2} />
            </button>
          </div>
        )}
      </div>
    );
  }
);

CustomNumberInput.displayName = "CustomNumberInput";
