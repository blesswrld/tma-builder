import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Compass,
  Heart,
  MessageSquare,
  Shield,
  LayoutDashboard,
  Wallet
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { BalanceModal } from "../profile/BalanceModal";

interface MobileNavBarProps {
  favoritesCount?: number;
  onOpenFavorites?: () => void;
  onOpenChat?: () => void;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  favoritesCount = 0,
  onOpenFavorites,
  onOpenChat
}) => {
  const location = useLocation();
  const { user } = useAuth();
  const [isBalanceOpen, setIsBalanceOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const isModeratorOrAdmin = Boolean(
    user && (
      user.role === "MODERATOR" ||
      user.role === "ADMIN" ||
      user.role === "DEVELOPER" ||
      user.email?.toLowerCase().trim() === "gelgaev.dev@mail.ru" ||
      user.email?.toLowerCase().trim() === "roninfortnite71@gmail.com"
    )
  );

  const isExplore = location.pathname.startsWith("/explore") || location.pathname === "/catalog";
  const isAdmin = location.pathname.startsWith("/admin") || location.pathname === "/";
  const isModeration = location.pathname.startsWith("/moderation");

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-app-surface/90 backdrop-blur-md border-t border-app-border px-3 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] transition-colors shadow-lg">
        <div className="flex items-center justify-around">
          {/* 1. Explore / Catalog */}
          <Link
            to="/explore"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
              isExplore
                ? "text-app-primary font-bold"
                : "text-app-muted hover:text-app-primary"
            }`}
          >
            <Compass size={20} className={isExplore ? "stroke-[2.5]" : ""} />
            <span className="text-[10px] font-mono leading-none">Каталог</span>
          </Link>

          {/* 2. Favorites */}
          <button
            type="button"
            onClick={onOpenFavorites}
            className="relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-app-muted hover:text-app-primary transition-colors cursor-pointer"
          >
            <Heart size={20} />
            <span className="text-[10px] font-mono leading-none">Избранное</span>
            {favoritesCount > 0 && (
              <span className="absolute top-0.5 right-2 px-1 py-0.2 bg-app-accent text-app-accent-fg rounded-full text-[9px] font-mono font-bold leading-none min-w-[14px] text-center">
                {favoritesCount}
              </span>
            )}
          </button>

          {/* 3. Direct Chat */}
          <button
            type="button"
            onClick={onOpenChat}
            className="relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-app-muted hover:text-app-primary transition-colors cursor-pointer"
          >
            <MessageSquare size={20} />
            <span className="text-[10px] font-mono leading-none">Чат</span>
            {unreadChatCount > 0 && (
              <span className="absolute top-0.5 right-2 px-1 py-0.2 bg-app-accent text-app-accent-fg rounded-full text-[9px] font-mono font-bold leading-none min-w-[14px] text-center">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* 4. Moderation (if moderator or admin) or Balance */}
          {isModeratorOrAdmin ? (
            <Link
              to="/moderation"
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
                isModeration
                  ? "text-app-primary font-bold"
                  : "text-app-muted hover:text-app-primary"
              }`}
            >
              <Shield size={20} className={isModeration ? "stroke-[2.5]" : ""} />
              <span className="text-[10px] font-mono leading-none">Модерация</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setIsBalanceOpen(true)}
              className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-app-muted hover:text-app-primary transition-colors cursor-pointer"
            >
              <Wallet size={20} />
              <span className="text-[10px] font-mono leading-none">Баланс</span>
            </button>
          )}

          {/* 5. Admin / Dashboard */}
          <Link
            to="/admin"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
              isAdmin
                ? "text-app-primary font-bold"
                : "text-app-muted hover:text-app-primary"
            }`}
          >
            <LayoutDashboard size={20} className={isAdmin ? "stroke-[2.5]" : ""} />
            <span className="text-[10px] font-mono leading-none">Кабинет</span>
          </Link>
        </div>
      </nav>

      {/* Global Balance Modal from Mobile Bar */}
      <BalanceModal
        isOpen={isBalanceOpen}
        onClose={() => setIsBalanceOpen(false)}
      />
    </>
  );
};
