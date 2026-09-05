import React, { useEffect, useState, useRef, useLayoutEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

export type TooltipPosition = "top" | "bottom" | "left" | "right" | "auto";

interface TooltipProps {
  content?: ReactNode;
  text?: string;
  position?: TooltipPosition;
  delay?: number;
  shortcut?: string;
  variant?: "default" | "danger" | "success" | "info";
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}

interface ActiveGlobalTooltip {
  id: string;
  text: string;
  shortcut?: string;
  rect: DOMRect;
  position: TooltipPosition;
  variant?: "default" | "danger" | "success" | "info";
}

/**
 * Helper to calculate responsive, non-clipping coordinates with arrow alignment
 */
function calculatePosition(
  rect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
  requestedPosition: TooltipPosition
) {
  const edgeMargin = 12;
  const gap = 8;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  let placement: "top" | "bottom" | "left" | "right" = "top";

  if (requestedPosition === "left" || requestedPosition === "right") {
    placement = requestedPosition;
    if (placement === "left" && rect.left - tooltipWidth - gap < edgeMargin) {
      placement = "right";
    } else if (placement === "right" && rect.right + tooltipWidth + gap > viewportWidth - edgeMargin) {
      placement = "left";
    }
  } else if (requestedPosition === "bottom") {
    placement = "bottom";
    if (rect.bottom + tooltipHeight + gap > viewportHeight - edgeMargin) {
      placement = "top";
    }
  } else if (requestedPosition === "top") {
    placement = "top";
    if (rect.top - tooltipHeight - gap < edgeMargin) {
      placement = "bottom";
    }
  } else {
    // auto mode
    if (rect.top - tooltipHeight - gap < edgeMargin) {
      placement = "bottom";
    } else {
      placement = "top";
    }
  }

  let rawX = 0;
  let rawY = 0;

  if (placement === "top") {
    rawY = rect.top - tooltipHeight - gap;
    rawX = centerX - tooltipWidth / 2;
  } else if (placement === "bottom") {
    rawY = rect.bottom + gap;
    rawX = centerX - tooltipWidth / 2;
  } else if (placement === "left") {
    rawX = rect.left - tooltipWidth - gap;
    rawY = centerY - tooltipHeight / 2;
  } else if (placement === "right") {
    rawX = rect.right + gap;
    rawY = centerY - tooltipHeight / 2;
  }

  // Strictly clamp within visible viewport
  const clampedX = Math.max(edgeMargin, Math.min(rawX, viewportWidth - tooltipWidth - edgeMargin));
  const clampedY = Math.max(edgeMargin, Math.min(rawY, viewportHeight - tooltipHeight - edgeMargin));

  // Arrow center relative to tooltip card
  const arrowX = Math.max(12, Math.min(centerX - clampedX, tooltipWidth - 12));
  const arrowY = Math.max(8, Math.min(centerY - clampedY, tooltipHeight - 8));

  return {
    x: clampedX,
    y: clampedY,
    arrowX,
    arrowY,
    placement,
  };
}

/**
 * Universal Tooltip Card with live DOM dimension measuring for 100% boundary safety
 */
const TooltipPortalCard: React.FC<{
  item: ActiveGlobalTooltip;
}> = ({ item }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState(() =>
    calculatePosition(item.rect, 140, 32, item.position)
  );

  useLayoutEffect(() => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const newCoords = calculatePosition(
        item.rect,
        rect.width || 140,
        rect.height || 32,
        item.position
      );
      setCoords(newCoords);
    }
  }, [item]);

  // Extract shortcut embedded in parentheses like "(Enter)" or "(?)" or "(Esc)" if not explicitly passed
  let cleanText = item.text;
  let detectedShortcut = item.shortcut;
  if (!detectedShortcut) {
    const match = item.text.match(/\((Enter|Esc|Ctrl\+S|⌘K|\?|Delete)\)$/i);
    if (match) {
      detectedShortcut = match[1];
      cleanText = item.text.replace(/\s*\((Enter|Esc|Ctrl\+S|⌘K|\?|Delete)\)$/i, "");
    }
  }

  const isDanger = item.variant === "danger" || /удалить|отменить|заблокировать/i.test(cleanText);
  const isSuccess = item.variant === "success" || /завершить|активен|доступен/i.test(cleanText);

  const cardVariantClass = isDanger
    ? "tooltip-danger"
    : isSuccess
    ? "tooltip-success"
    : "";

  return (
    <div className="fixed inset-0 pointer-events-none z-[999999] overflow-visible">
      <motion.div
        ref={cardRef}
        key={item.id}
        initial={{
          opacity: 0,
          scale: 0.94,
          y: coords.placement === "top" ? 3 : coords.placement === "bottom" ? -3 : 0,
          x: coords.placement === "left" ? 3 : coords.placement === "right" ? -3 : 0,
        }}
        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
        style={{
          left: `${coords.x}px`,
          top: `${coords.y}px`,
          maxWidth: "calc(100vw - 24px)",
        }}
        className="fixed pointer-events-none w-max max-w-xs sm:max-w-sm"
      >
        <div
          className={`tooltip-card keep-white dark-card relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-sans font-medium tracking-normal leading-tight text-center whitespace-normal select-none ${cardVariantClass}`}
          style={{
            color: isDanger ? '#fecdd3' : isSuccess ? '#a7f3d0' : '#ffffff',
            backgroundColor: isDanger ? '#1f0b0f' : isSuccess ? '#091a10' : '#121217',
          }}
        >
          <span
            className="leading-snug keep-white"
            style={{ color: isDanger ? '#fecdd3' : isSuccess ? '#a7f3d0' : '#ffffff' }}
          >
            {cleanText}
          </span>
          {detectedShortcut && (
            <kbd
              className="shrink-0 px-1.5 py-0.5 text-[9.5px] font-mono font-semibold rounded shadow-sm"
              style={{
                color: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              {detectedShortcut}
            </kbd>
          )}
        </div>
      </motion.div>
    </div>
  );
};

/**
 * Declarative Tooltip Component for specific elements
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  text,
  position = "top",
  delay = 100,
  shortcut,
  variant = "default",
  className = "",
  disabled = false,
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeItem, setActiveItem] = useState<ActiveGlobalTooltip | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayText = text || (typeof content === "string" ? content : "");

  const handleMouseEnter = () => {
    if (disabled || (!displayText && !content) || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    timerRef.current = setTimeout(() => {
      setActiveItem({
        id: Math.random().toString(36),
        text: displayText,
        shortcut,
        rect,
        position,
        variant,
      });
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
    setActiveItem(null);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleMouseLeave}
      className={`inline-flex ${className}`}
    >
      {children}
      <AnimatePresence>
        {isVisible && activeItem && <TooltipPortalCard item={activeItem} />}
      </AnimatePresence>
    </div>
  );
};

/**
 * Universal Global Tooltip Listener & Renderer
 * Automatically intercepts elements with:
 * - `data-tooltip="..."`
 * - `data-tip="..."`
 * - Native `title="..."` attribute (converts to custom tooltip and suppresses native OS tooltip)
 */
export const GlobalTooltip: React.FC = () => {
  const [activeTooltip, setActiveTooltip] = useState<ActiveGlobalTooltip | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.(
        "[data-tooltip], [data-tip], [data-tooltip-title], [title]"
      ) as HTMLElement | null;

      if (!target) {
        if (currentTargetRef.current) {
          if (timerRef.current) clearTimeout(timerRef.current);
          setActiveTooltip(null);
          currentTargetRef.current = null;
        }
        return;
      }

      // If native title is present, transfer it to data-tooltip-title to prevent default OS browser tooltip
      if (target.hasAttribute("title")) {
        const titleText = target.getAttribute("title") || "";
        if (titleText.trim()) {
          target.setAttribute("data-tooltip-title", titleText);
        }
        target.removeAttribute("title");
      }

      const text =
        target.getAttribute("data-tooltip") ||
        target.getAttribute("data-tip") ||
        target.getAttribute("data-tooltip-title") ||
        "";

      if (!text || !text.trim()) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setActiveTooltip(null);
        currentTargetRef.current = null;
        return;
      }

      if (currentTargetRef.current === target) return;

      currentTargetRef.current = target;
      if (timerRef.current) clearTimeout(timerRef.current);

      const delay = parseInt(target.getAttribute("data-tooltip-delay") || "110", 10);
      const positionAttr = (target.getAttribute("data-tooltip-position") ||
        target.getAttribute("data-tooltip-side") ||
        "auto") as TooltipPosition;
      const shortcutAttr = target.getAttribute("data-tooltip-shortcut") || undefined;
      const variantAttr = (target.getAttribute("data-tooltip-variant") || "default") as
        | "default"
        | "danger"
        | "success"
        | "info";

      timerRef.current = setTimeout(() => {
        if (!currentTargetRef.current) return;
        const rect = currentTargetRef.current.getBoundingClientRect();
        setActiveTooltip({
          id: `${rect.top}-${rect.left}-${text}`,
          text: text.trim(),
          shortcut: shortcutAttr,
          rect,
          position: positionAttr,
          variant: variantAttr,
        });
      }, delay);
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (currentTargetRef.current && (!related || !currentTargetRef.current.contains(related))) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setActiveTooltip(null);
        currentTargetRef.current = null;
      }
    };

    const handleScrollOrClick = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setActiveTooltip(null);
      currentTargetRef.current = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (timerRef.current) clearTimeout(timerRef.current);
        setActiveTooltip(null);
        currentTargetRef.current = null;
      }
    };

    document.addEventListener("mouseover", handleMouseOver, { passive: true });
    document.addEventListener("mouseout", handleMouseOut, { passive: true });
    document.addEventListener("mousedown", handleScrollOrClick, { passive: true });
    document.addEventListener("scroll", handleScrollOrClick, { passive: true, capture: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("mousedown", handleScrollOrClick);
      document.removeEventListener("scroll", handleScrollOrClick, { capture: true });
      window.removeEventListener("keydown", handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!activeTooltip) return null;

  return (
    <AnimatePresence>
      {activeTooltip && <TooltipPortalCard key={activeTooltip.id} item={activeTooltip} />}
    </AnimatePresence>
  );
};

export default Tooltip;
