import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

export type Theme = "dark" | "light";
export type DesignMode = "swiss" | "atelier" | "classic";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  designMode: DesignMode;
  toggleDesignMode: () => void;
  setDesignMode: (mode: DesignMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
  designMode: "swiss",
  toggleDesignMode: () => {},
  setDesignMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme_mode");
      if (saved === "light" || saved === "dark") return saved;
      const tgScheme = (window as any).Telegram?.WebApp?.colorScheme;
      if (tgScheme === "light" || tgScheme === "dark") return tgScheme;
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
        return "light";
      }
    }
    return "dark";
  });

  const [designMode, setDesignModeState] = useState<DesignMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app_design_mode");
      if (saved === "swiss" || saved === "atelier") return saved;
    }
    return "swiss";
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
      localStorage.setItem("theme_mode", theme);

      // Sync Telegram WebApp native top/bottom chrome (supported from Telegram WebApp v6.1+)
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg && tg.initData) {
          const supportsColors = typeof tg.isVersionAtLeast === "function" ? tg.isVersionAtLeast("6.1") : false;
          if (supportsColors) {
            let bg = "#08090c";
            let secondaryBg = "#0e1015";
            if (designMode === "atelier") {
              bg = theme === "dark" ? "#110e0c" : "#f7f3eb";
              secondaryBg = theme === "dark" ? "#1a1512" : "#fdfbf7";
            } else {
              bg = theme === "dark" ? "#08090c" : "#fafafc";
              secondaryBg = theme === "dark" ? "#0e1015" : "#ffffff";
            }
            tg.setHeaderColor?.(bg);
            tg.setBackgroundColor?.(secondaryBg);
          }
        }
      } catch {}
    }
  }, [theme, designMode]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-design", designMode);
      document.documentElement.classList.remove("design-swiss", "design-atelier", "design-classic");
      document.documentElement.classList.add(`design-${designMode}`);
      try {
        localStorage.setItem("app_design_mode", designMode);
      } catch {}
    }
  }, [designMode]);

  // Listen to Telegram themeChanged events if user hasn't explicitly overridden theme
  useEffect(() => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.onEvent) {
        const handleTgTheme = () => {
          const manualOverride = localStorage.getItem("theme_mode_manual");
          if (!manualOverride && tg.colorScheme) {
            setThemeState(tg.colorScheme === "light" ? "light" : "dark");
          }
        };
        tg.onEvent("themeChanged", handleTgTheme);
        return () => {
          tg.offEvent?.("themeChanged", handleTgTheme);
        };
      }
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("theme_mode_manual", "true");
      } catch {}
      return next;
    });
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("theme_mode_manual", "true");
    } catch {}
  }, []);

  const toggleDesignMode = useCallback(() => {
    setDesignModeState(prev => (prev === "swiss" ? "atelier" : "swiss"));
  }, []);

  const setDesignMode = useCallback((mode: DesignMode) => {
    setDesignModeState(mode);
  }, []);

  const value = useMemo(() => ({
    theme,
    toggleTheme,
    setTheme,
    designMode,
    toggleDesignMode,
    setDesignMode
  }), [theme, toggleTheme, setTheme, designMode, toggleDesignMode, setDesignMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
