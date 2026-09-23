import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { validateEmail, validatePassword } from "../lib/validation";
import { useRealtimeEvent } from "./RealtimeContext";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  telegramHandle?: string | null;
  telegramId?: string | null;
  githubHandle?: string | null;
  githubId?: string | null;
  companyName?: string | null;
  plan?: string;
  subscriptionExpiresAt?: string | null;
  role?: "USER" | "SELLER" | "MODERATOR" | "ADMIN" | "DEVELOPER";
  balance?: number;
  city?: string | null;
  isVerified?: boolean;
  referralCode?: string | null;
  referredById?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGitHub: (referralCode?: string) => Promise<{ user: User; token: string }>;
  fastLoginWithGitHub: (username: string, referralCode?: string) => Promise<{ user: User; token: string }>;
  loginWithTelegram: (customInitData?: string, referralCode?: string) => Promise<{ user: User; token: string }>;
  fastLoginWithTelegram: (username: string, referralCode?: string) => Promise<{ user: User; token: string }>;
  loginWithTelegramWidget: (widgetData: any, referralCode?: string) => Promise<{ user: User; token: string }>;
  createTelegramSession: (params?: { referralCode?: string; phone?: string }) => Promise<{ sessionId: string; deepLink: string; botUsername: string; expiresAt: number }>;
  pollTelegramSession: (sessionId: string) => Promise<{ status: "PENDING" | "CONFIRMED" | "EXPIRED" | "CANCELLED"; user?: User; token?: string }>;
  sendTelegramCode: (params: { phone?: string; handle?: string; referralCode?: string }) => Promise<{ success: boolean; sessionId?: string; botUrl?: string; botUsername?: string; sentDirectly?: boolean; message?: string; devCode?: string }>;
  verifyTelegramCode: (params: { phone?: string; handle?: string; code: string; sessionId?: string; referralCode?: string }) => Promise<{ user: User; token: string }>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  sendCode: (email: string, type?: "LOGIN" | "REGISTER" | "RESET_PASSWORD") => Promise<{ devCode?: string; message: string }>;
  verifyCode: (params: { email: string; code: string; name?: string; password?: string }) => Promise<void>;
  resetPassword: (params: { email: string; code: string; newPassword: string }) => Promise<{ message: string }>;
  updateProfile: (data: {
    name?: string;
    phone?: string;
    avatarUrl?: string;
    telegramHandle?: string;
    githubHandle?: string;
    companyName?: string;
    city?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem("auth_user");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync user state to localStorage cache
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem("auth_user", JSON.stringify(user));
      } catch {
        // ignore
      }
    } else {
      localStorage.removeItem("auth_user");
    }
  }, [user]);

  // Realtime updates for user changes, plan changes, and bans
  useRealtimeEvent(["USER_UPDATED", "PLAN_UPDATED"], (event) => {
    const targetId = event.payload?.id || event.payload?.userId || event.userId;
    if (targetId) {
      setUser(prev => {
        if (!prev || prev.id !== targetId) return prev;
        const next = { ...prev, ...event.payload, id: prev.id };
        if (event.payload.plan) next.plan = event.payload.plan;
        if (event.payload.subscriptionExpiresAt !== undefined) {
          next.subscriptionExpiresAt = event.payload.subscriptionExpiresAt;
        }
        return next;
      });
    }
  });

  useRealtimeEvent("USER_BANNED", (event) => {
    const targetId = event.payload?.userId || event.payload?.id;
    if (targetId && user?.id === targetId) {
      logout();
    }
  });

  useRealtimeEvent("USER_DELETED", (event) => {
    const targetId = event.payload?.userId || event.payload?.id;
    if (targetId && user?.id === targetId) {
      logout();
    }
  });

  // Cross-tab sync via storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth_user") {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {}
      } else if (e.key === "auth_token") {
        setToken(e.newValue);
        if (!e.newValue) setUser(null);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("auth_token");
      if (!storedToken) {
        // Auto-login with Telegram WebApp if running inside Telegram
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.initData) {
          try {
            const tgRes = await fetch("/api/auth/telegram/webapp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ initData: tg.initData })
            });
            if (tgRes.ok) {
              const tgData = await tgRes.json();
              localStorage.setItem("auth_token", tgData.token);
              localStorage.setItem("auth_user", JSON.stringify(tgData.user));
              setUser(tgData.user);
              setToken(tgData.token);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.warn("Telegram WebApp auto-auth error:", e);
          }
        }
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${storedToken}`
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          setToken(storedToken);
        } else if (res.status === 401 || res.status === 403 || res.status === 404) {
          // Token is genuinely invalid or expired
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          setUser(null);
          setToken(null);
        } else {
          console.warn("Auth check returned non-critical status:", res.status);
        }
      } catch (err) {
        console.warn("Auth check network/timeout error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const emailRes = validateEmail(email);
    if (!emailRes.isValid) throw new Error(emailRes.error);

    const passRes = validatePassword(password);
    if (!passRes.isValid) throw new Error(passRes.error);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailRes.email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Не удалось войти");
    }

    localStorage.setItem("auth_token", data.token);
    setToken(data.token);
    setUser(data.user);
    try {
      window.dispatchEvent(new CustomEvent("app:auth_token_changed", { detail: { token: data.token } }));
    } catch {}
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const emailRes = validateEmail(email);
    if (!emailRes.isValid) throw new Error(emailRes.error);

    const passRes = validatePassword(password);
    if (!passRes.isValid) throw new Error(passRes.error);

    let pendingRef: string | null = null;
    try {
      pendingRef = localStorage.getItem("pending_referral_code");
    } catch {
      // ignore
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailRes.email,
        password,
        name: name ? name.trim() : undefined,
        referralCode: pendingRef || undefined
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Не удалось зарегистрироваться");
    }

    try {
      localStorage.removeItem("pending_referral_code");
    } catch {
      // ignore
    }

    localStorage.setItem("auth_token", data.token);
    setToken(data.token);
    setUser(data.user);
    try {
      window.dispatchEvent(new CustomEvent("app:auth_token_changed", { detail: { token: data.token } }));
    } catch {}
  }, []);

  const sendCode = useCallback(async (email: string, type: "LOGIN" | "REGISTER" | "RESET_PASSWORD" = "LOGIN") => {
    const emailRes = validateEmail(email);
    if (!emailRes.isValid) throw new Error(emailRes.error);

    const res = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailRes.email, type })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Не удалось отправить код");
    }

    return { devCode: data.devCode, message: data.message };
  }, []);

  const verifyCode = useCallback(async (params: { email: string; code: string; name?: string; password?: string; referralCode?: string }) => {
    let pendingRef: string | null = params.referralCode || null;
    if (!pendingRef) {
      try {
        pendingRef = localStorage.getItem("pending_referral_code");
      } catch {
        // ignore
      }
    }

    const res = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        referralCode: pendingRef || undefined
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Неверный код из письма");
    }

    try {
      localStorage.removeItem("pending_referral_code");
    } catch {
      // ignore
    }

    localStorage.setItem("auth_token", data.token);
    setToken(data.token);
    setUser(data.user);
    try {
      window.dispatchEvent(new CustomEvent("app:auth_token_changed", { detail: { token: data.token } }));
    } catch {}
  }, []);

  const resetPassword = useCallback(async (params: { email: string; code: string; newPassword: string }) => {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Не удалось сбросить пароль");
    }

    return { message: data.message };
  }, []);

  const updateProfile = useCallback(async (profileData: {
    name?: string;
    phone?: string;
    avatarUrl?: string;
    telegramHandle?: string;
    companyName?: string;
    currentPassword?: string;
    newPassword?: string;
    emailCode?: string;
  }) => {
    const storedToken = localStorage.getItem("auth_token");
    if (!storedToken) throw new Error("Пользователь не авторизован");

    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${storedToken}`
      },
      body: JSON.stringify(profileData)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Не удалось обновить профиль");
    }

    setUser(data.user);
    return data.user;
  }, []);

  const loginWithGitHub = useCallback(async (referralCode?: string): Promise<{ user: User; token: string }> => {
    let pendingRef: string | null = referralCode || null;
    if (!pendingRef) {
      try {
        pendingRef = localStorage.getItem("pending_referral_code");
      } catch {}
    }

    const res = await fetch(`/api/auth/github/url?referralCode=${encodeURIComponent(pendingRef || "")}`);
    const data = await res.json();

    if (!data.url) {
      throw new Error(data.message || "GITHUB_CLIENT_ID не настроен на сервере");
    }

    const width = 600;
    const height = 720;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    const popup = window.open(
      data.url,
      "github_oauth_popup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      window.location.href = data.url;
      return new Promise(() => {});
    }

    return new Promise<{ user: User; token: string }>((resolve, reject) => {
      let isCompleted = false;

      const handleMessage = (event: MessageEvent) => {
        if (!event.data || typeof event.data !== "object") return;
        if (event.data.type === "OAUTH_AUTH_SUCCESS" && event.data.provider === "github") {
          isCompleted = true;
          window.removeEventListener("message", handleMessage);
          clearInterval(checkClosedInterval);

          const authUser = event.data.user;
          const authToken = event.data.token;

          localStorage.setItem("auth_token", authToken);
          localStorage.setItem("auth_user", JSON.stringify(authUser));
          setToken(authToken);
          setUser(authUser);

          try {
            localStorage.removeItem("pending_referral_code");
            window.dispatchEvent(new CustomEvent("app:auth_token_changed", { detail: { token: authToken } }));
          } catch {}

          resolve({ user: authUser, token: authToken });
        } else if (event.data.type === "OAUTH_AUTH_ERROR") {
          isCompleted = true;
          window.removeEventListener("message", handleMessage);
          clearInterval(checkClosedInterval);
          reject(new Error(event.data.error || "Ошибка авторизации через GitHub"));
        }
      };

      window.addEventListener("message", handleMessage);

      const checkClosedInterval = setInterval(() => {
        if (popup.closed && !isCompleted) {
          clearInterval(checkClosedInterval);
          window.removeEventListener("message", handleMessage);

          const currentToken = localStorage.getItem("auth_token");
          const currentUserStr = localStorage.getItem("auth_user");
          if (currentToken && currentUserStr) {
            try {
              const parsedUser = JSON.parse(currentUserStr);
              setToken(currentToken);
              setUser(parsedUser);
              resolve({ user: parsedUser, token: currentToken });
              return;
            } catch {}
          }
          reject(new Error("Окно авторизации GitHub было закрыто"));
        }
      }, 500);
    });
  }, []);

  const fastLoginWithGitHub = useCallback(async (username: string, referralCode?: string): Promise<{ user: User; token: string }> => {
    let pendingRef: string | null = referralCode || null;
    if (!pendingRef) {
      try {
        pendingRef = localStorage.getItem("pending_referral_code");
      } catch {}
    }

    const res = await fetch("/api/auth/github/fast-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        referralCode: pendingRef || undefined
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Не удалось войти через GitHub");
    }

    try {
      localStorage.removeItem("pending_referral_code");
    } catch {}

    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);

    try {
      window.dispatchEvent(new CustomEvent("app:auth_token_changed", { detail: { token: data.token } }));
    } catch {}

    return { user: data.user, token: data.token };
  }, []);

  const loginWithTelegram = useCallback(async (customInitData?: string, referralCode?: string): Promise<{ user: User; token: string }> => {
    let pendingRef: string | null = referralCode || null;
    if (!pendingRef) {
      try {
        pendingRef = localStorage.getItem("pending_referral_code");
      } catch {}
    }

    const initData = customInitData || (window as any).Telegram?.WebApp?.initData;
    if (!initData) {
      throw new Error("Telegram WebApp данные не обнаружены. Пожалуйста, откройте приложение внутри Telegram.");
    }

    const res = await fetch("/api/auth/telegram/webapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData,
        referralCode: pendingRef || undefined
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Ошибка авторизации через Telegram WebApp");
    }

    try {
      localStorage.removeItem("pending_referral_code");
    } catch {}

    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);

    try {
      window.dispatchEvent(new CustomEvent("app:auth_token_changed", { detail: { token: data.token } }));
    } catch {}

    return { user: data.user, token: data.token };
  }, []);

  const fastLoginWithTelegram = useCallback(async (username: string, referralCode?: string): Promise<{ user: User; token: string }> => {
    let pendingRef: string | null = referralCode || null;
    if (!pendingRef) {
      try {
        pendingRef = localStorage.getItem("pending_referral_code");
      } catch {}
    }

    const res = await fetch("/api/auth/telegram/fast-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        referralCode: pendingRef || undefined
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Не удалось войти через Telegram");
    }

    try {
      localStorage.removeItem("pending_referral_code");
    } catch {}

    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);

    try {
      window.dispatchEvent(new CustomEvent("app:auth_token_changed", { detail: { token: data.token } }));
    } catch {}

    return { user: data.user, token: data.token };
  }, []);

  const loginWithTelegramWidget = useCallback(async (widgetData: any, referralCode?: string): Promise<{ user: User; token: string }> => {
    let pendingRef: string | null = referralCode || null;
    if (!pendingRef) {
      try {
        pendingRef = localStorage.getItem("pending_referral_code");
      } catch {}
    }

    const res = await fetch("/api/auth/telegram/widget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...widgetData,
        referralCode: pendingRef || undefined
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Не удалось авторизоваться через Telegram");
    }

    try {
      localStorage.removeItem("pending_referral_code");
    } catch {}

    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);

    try {
      window.dispatchEvent(new CustomEvent("app:auth_token_changed", { detail: { token: data.token } }));
    } catch {}

    return { user: data.user, token: data.token };
  }, []);

  const createTelegramSession = useCallback(async (params?: { referralCode?: string; phone?: string }) => {
    let pendingRef: string | null = params?.referralCode || null;
    if (!pendingRef) {
      try {
        pendingRef = localStorage.getItem("pending_referral_code");
      } catch {}
    }

    const res = await fetch("/api/auth/telegram/session/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referralCode: pendingRef || undefined,
        phone: params?.phone || undefined
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Не удалось создать сессию Telegram авторизации");
    }

    return data as { sessionId: string; deepLink: string; botUsername: string; expiresAt: number };
  }, []);

  const pollTelegramSession = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/auth/telegram/session/status?sessionId=${encodeURIComponent(sessionId)}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Ошибка проверки статуса сессии");
    }

    if (data.status === "CONFIRMED" && data.token && data.user) {
      try {
        localStorage.removeItem("pending_referral_code");
      } catch {}
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);

      try {
        window.dispatchEvent(new CustomEvent("app:auth_token_changed", { detail: { token: data.token } }));
      } catch {}
    }

    return data;
  }, []);

  const sendTelegramCode = useCallback(async (params: { phone?: string; handle?: string; referralCode?: string }) => {
    let pendingRef: string | null = params.referralCode || null;
    if (!pendingRef) {
      try {
        pendingRef = localStorage.getItem("pending_referral_code");
      } catch {}
    }

    const res = await fetch("/api/auth/telegram/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: params.phone,
        handle: params.handle,
        referralCode: pendingRef || undefined
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Не удалось отправить код в Telegram");
    }

    return data;
  }, []);

  const verifyTelegramCode = useCallback(async (params: { phone?: string; handle?: string; code: string; sessionId?: string; referralCode?: string }) => {
    let pendingRef: string | null = params.referralCode || null;
    if (!pendingRef) {
      try {
        pendingRef = localStorage.getItem("pending_referral_code");
      } catch {}
    }

    const res = await fetch("/api/auth/telegram/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        referralCode: pendingRef || undefined
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Неверный код подтверждения");
    }

    try {
      localStorage.removeItem("pending_referral_code");
    } catch {}

    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);

    try {
      window.dispatchEvent(new CustomEvent("app:auth_token_changed", { detail: { token: data.token } }));
    } catch {}

    return { user: data.user, token: data.token };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
    try {
      window.dispatchEvent(new CustomEvent("app:auth_token_changed", { detail: { token: null } }));
    } catch {}
  }, []);

  const contextValue = useMemo(() => ({
    user,
    token,
    isLoading,
    login,
    loginWithGitHub,
    fastLoginWithGitHub,
    loginWithTelegram,
    fastLoginWithTelegram,
    loginWithTelegramWidget,
    createTelegramSession,
    pollTelegramSession,
    sendTelegramCode,
    verifyTelegramCode,
    register,
    sendCode,
    verifyCode,
    resetPassword,
    updateProfile,
    logout
  }), [user, token, isLoading, login, loginWithGitHub, fastLoginWithGitHub, loginWithTelegram, fastLoginWithTelegram, loginWithTelegramWidget, createTelegramSession, pollTelegramSession, sendTelegramCode, verifyTelegramCode, register, sendCode, verifyCode, resetPassword, updateProfile, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
