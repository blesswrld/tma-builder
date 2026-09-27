import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
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

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
      localStorage.setItem("theme_mode", theme);

      // Sync Telegram WebApp native top/bottom chrome
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
          const bg = theme === "dark" ? "#09090c" : "#ffffff";
          const secondaryBg = theme === "dark" ? "#101014" : "#f7f7f9";
          tg.setHeaderColor?.(bg);
          tg.setBackgroundColor?.(secondaryBg);
        }
      } catch {}
    }
  }, [theme]);

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

  const value = useMemo(() => ({
    theme,
    toggleTheme,
    setTheme
  }), [theme, toggleTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
