import React, { createContext, useContext, useState, useEffect } from "react";
import { validateEmail, validatePassword } from "../lib/validation";
import { useRealtimeEvent } from "./RealtimeContext";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  telegramHandle?: string | null;
  companyName?: string | null;
  plan?: string;
  subscriptionExpiresAt?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  sendCode: (email: string, type?: "LOGIN" | "REGISTER" | "RESET_PASSWORD") => Promise<{ devCode?: string; message: string }>;
  verifyCode: (params: { email: string; code: string; name?: string; password?: string }) => Promise<void>;
  resetPassword: (params: { email: string; code: string; newPassword: string }) => Promise<{ message: string }>;
  updateProfile: (data: {
    name?: string;
    phone?: string;
    avatarUrl?: string;
    telegramHandle?: string;
    companyName?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useRealtimeEvent("USER_UPDATED", (event) => {
    if (event.payload?.id) {
      setUser(prev => (prev && prev.id === event.payload.id ? { ...prev, ...event.payload } : prev));
    }
  });

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("auth_token");
      if (!storedToken) {
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

  const login = async (email: string, password: string) => {
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
  };

  const register = async (email: string, password: string, name?: string) => {
    const emailRes = validateEmail(email);
    if (!emailRes.isValid) throw new Error(emailRes.error);

    const passRes = validatePassword(password);
    if (!passRes.isValid) throw new Error(passRes.error);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailRes.email, password, name: name ? name.trim() : undefined })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Не удалось зарегистрироваться");
    }

    localStorage.setItem("auth_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const sendCode = async (email: string, type: "LOGIN" | "REGISTER" | "RESET_PASSWORD" = "LOGIN") => {
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
  };

  const verifyCode = async (params: { email: string; code: string; name?: string; password?: string }) => {
    const res = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Неверный код из письма");
    }

    localStorage.setItem("auth_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const resetPassword = async (params: { email: string; code: string; newPassword: string }) => {
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
  };

  const updateProfile = async (profileData: {
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
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, sendCode, verifyCode, resetPassword, updateProfile, logout }}>
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
