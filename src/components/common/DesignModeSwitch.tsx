import React from "react";
import { Layers, Sparkles, RotateCcw } from "lucide-react";
import { useTheme, DesignMode } from "../../context/ThemeContext";

interface DesignModeSwitchProps {
  compact?: boolean;
  className?: string;
}

const MODES: { id: DesignMode; label: string; shortLabel: string; hint: string }[] = [
  {
    id: "swiss",
    label: "Swiss",
    shortLabel: "Swiss",
    hint: "Швейцарский минимализм: строгий графит, линии 1px и углы 8–12px",
  },
  {
    id: "atelier",
    label: "Atelier",
    shortLabel: "Atelier",
    hint: "Editorial Atelier: тёплый люкс (эспрессо и лён), антиква с засечками и журнальная вёрстка",
  },
  {
    id: "classic",
    label: "Classic",
    shortLabel: "Classic",
    hint: "Контрольная точка: классический базовый дизайн",
  },
];

export const DesignModeSwitch: React.FC<DesignModeSwitchProps> = ({
  compact = false,
  className = "",
}) => {
  const { designMode, setDesignMode } = useTheme();

  if (compact) {
    return (
      <div
        className={`inline-flex items-center p-0.5 h-8 rounded-lg bg-app-card border border-app-border text-[10.5px] font-mono select-none shrink-0 ${className}`}
        title="Переключение архитектуры интерфейса: Swiss (Минимализм) · Atelier (Тёплый люкс) · Classic (Исходный)"
      >
        {MODES.map((m) => {
          const isActive = designMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setDesignMode(m.id)}
              title={m.hint}
              className={`h-full px-2 rounded-md transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-app-accent text-app-accent-fg font-semibold shadow-2xs"
                  : "text-app-muted hover:text-app-primary"
              }`}
            >
              {m.id === "swiss" && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-emerald-500" : "bg-app-muted/60"}`} />
              )}
              {m.id === "atelier" && (
                <Sparkles size={10} className={isActive ? "text-amber-500" : "text-amber-500/70"} />
              )}
              {m.id === "classic" && (
                <RotateCcw size={9.5} className="opacity-75" />
              )}
              <span className={m.id === "atelier" ? "font-editorial tracking-wide text-xs font-semibold" : ""}>
                {m.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-lg bg-app-card border border-app-border text-[11px] font-mono select-none shrink-0 ${className}`}
      title="Переключение дизайна интерфейса: Swiss · Atelier · Classic"
    >
      {MODES.map((m) => {
        const isActive = designMode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => setDesignMode(m.id)}
            title={m.hint}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              isActive
                ? "bg-app-accent text-app-accent-fg font-semibold shadow-2xs"
                : "text-app-muted hover:text-app-primary"
            }`}
          >
            {m.id === "swiss" && <Layers size={11} className={isActive ? "text-emerald-500" : "text-app-muted"} />}
            {m.id === "atelier" && <Sparkles size={11} className="text-amber-500" />}
            {m.id === "classic" && <RotateCcw size={10} />}
            <span className={m.id === "atelier" ? "font-editorial text-xs font-semibold tracking-wide" : ""}>
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
