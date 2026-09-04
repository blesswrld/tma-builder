import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Store,
  ShoppingBag,
  Check,
  Settings,
  Plus,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
  Tag,
  Star,
  Image as ImageIcon,
  Send,
  Users,
  UserPlus,
  BarChart3,
  Gift,
  Smartphone,
  CreditCard,
  MessageSquare,
  Server,
  ShieldAlert,
  Bug,
  User,
  Volume2,
  VolumeX,
  QrCode,
  Crown,
  LogOut,
  LogIn,
  ShieldCheck,
  Sparkles,
  Github,
  X,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  GripVertical
} from "lucide-react";
import { CHANGELOG_DATA } from "../../data/changelogData";

interface Service {
  id: string;
  title: string;
  price: number;
}

interface Order {
  id: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
}

interface Shop {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  ownerId?: string;
  currentUserRole?: "OWNER" | "MANAGER" | "STAFF";
  services?: Service[];
  owner?: any;
}

interface AdminSidebarProps {
  sidebarWidth: number;
  isResizingSidebar: boolean;
  startResizingSidebar: (e: React.MouseEvent | React.TouchEvent) => void;
  resetSidebarWidth: (e: React.MouseEvent) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  selectedShop: Shop | null;
  setSelectedShop: (shop: Shop) => void;
  shops: Shop[];
  activeShops: Shop[];
  activeTab: string;
  setActiveTab: (tab: any) => void;
  closeSubView: () => void;
  isStaff: boolean;
  isManager: boolean;
  isOwner: boolean;
  isDeveloperUser: boolean;
  unreadChatCount: number;
  unhandledReportsCount: number;
  orders: Order[];
  promocodes: any[];
  reviews: any[];
  banners: any[];
  broadcasts: any[];
  customers: any[];
  teamMembers: any[];
  user: any;
  token: string | null;
  theme: "light" | "dark";
  toggleTheme: () => void;
  isAudioEnabled: boolean;
  handleToggleAdminAudio: () => void;
  handleOpenCreateShop: () => void;
  handleOpenSettings: (shop: Shop) => void;
  handleDeleteShop: (shop: Shop) => void;
  handleOpenProfile: () => void;
  handleLogoutRequest: () => void;
  setIsAuthModalOpen: (open: boolean) => void;
  setIsQrModalOpen: (open: boolean) => void;
  setIsPlanModalOpen: (open: boolean) => void;
  setIsPrivacyModalOpen: (open: boolean) => void;
  setIsChangelogOpen: (open: boolean) => void;
  setIsHelpCenterOpen: (open: boolean) => void;
  shopFilterMode: "my" | "all";
  setShopFilterMode: (mode: "my" | "all") => void;
}

interface SidebarNavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
  alert?: boolean;
}

interface SidebarNavGroup {
  title: string;
  items: SidebarNavItem[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  sidebarWidth,
  isResizingSidebar,
  startResizingSidebar,
  resetSidebarWidth,
  isSidebarOpen,
  setIsSidebarOpen,
  isSidebarCollapsed,
  toggleSidebarCollapsed,
  selectedShop,
  setSelectedShop,
  shops,
  activeShops,
  activeTab,
  setActiveTab,
  closeSubView,
  isStaff,
  isManager,
  isOwner,
  isDeveloperUser,
  unreadChatCount,
  unhandledReportsCount,
  orders,
  promocodes,
  reviews,
  banners,
  broadcasts,
  customers,
  teamMembers,
  user,
  token,
  isAudioEnabled,
  handleToggleAdminAudio,
  handleOpenCreateShop,
  handleOpenSettings,
  handleDeleteShop,
  handleOpenProfile,
  handleLogoutRequest,
  setIsAuthModalOpen,
  setIsQrModalOpen,
  setIsPlanModalOpen,
  setIsPrivacyModalOpen,
  setIsChangelogOpen,
  shopFilterMode,
  setShopFilterMode
}) => {
  const navigate = useNavigate();
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
  const [sidebarFilterQuery, setSidebarFilterQuery] = useState("");
  const [isQuickShopSearchOpen, setIsQuickShopSearchOpen] = useState(false);
  const [shopSearchInput, setShopSearchInput] = useState("");
  const shopDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shopDropdownRef.current && !shopDropdownRef.current.contains(event.target as Node)) {
        setIsShopDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pendingOrdersCount = (orders || []).filter((o) => o.status === "PENDING").length;

  // Navigation Items Categorization
  const navigationGroups: SidebarNavGroup[] = isStaff
    ? [
        {
          title: "Сотрудник",
          items: [
            { id: "orders", label: "Заказы", icon: ShoppingBag, badge: pendingOrdersCount, alert: pendingOrdersCount > 0 },
            { id: "botsim", label: "Симулятор бота", icon: Smartphone },
            ...(isDeveloperUser
              ? [
                  { id: "devchat", label: "Чат поддержки", icon: MessageSquare, badge: unreadChatCount, alert: unreadChatCount > 0 },
                  { id: "dev-users", label: "Пользователи", icon: ShieldAlert },
                  { id: "reports", label: "Репорты", icon: Bug, badge: unhandledReportsCount, alert: unhandledReportsCount > 0 }
                ]
              : []),
            { id: "profile", label: "Профиль сотрудника", icon: User }
          ]
        }
      ]
    : [
        {
          title: "Основное",
          items: [
            { id: "services", label: "Меню и услуги", icon: Layers, badge: (selectedShop?.services || []).length },
            { id: "orders", label: "Заказы", icon: ShoppingBag, badge: pendingOrdersCount, alert: pendingOrdersCount > 0 },
            { id: "customers", label: "Клиенты CRM", icon: Users, badge: (customers || []).length }
          ]
        },
        {
          title: "Маркетинг & Продажи",
          items: [
            { id: "promocodes", label: "Промокоды", icon: Tag, badge: (promocodes || []).length },
            { id: "reviews", label: "Отзывы", icon: Star, badge: (reviews || []).length },
            { id: "banners", label: "Баннеры", icon: ImageIcon, badge: (banners || []).length },
            { id: "broadcasts", label: "Рассылки", icon: Send, badge: (broadcasts || []).length },
            { id: "referrals", label: "Рефералы", icon: Gift }
          ]
        },
        {
          title: "Управление & Инструменты",
          items: [
            { id: "analytics", label: "Аналитика", icon: BarChart3 },
            { id: "team", label: "Команда и доступ", icon: UserPlus, badge: (teamMembers || []).length + (selectedShop?.owner ? 1 : 0) },
            { id: "botsim", label: "Симулятор бота", icon: Smartphone },
            { id: "payments", label: "История оплат", icon: CreditCard }
          ]
        },
        ...(isDeveloperUser
          ? [
              {
                title: "Разработка (Dev)",
                items: [
                  { id: "devchat", label: "Чат поддержки", icon: MessageSquare, badge: unreadChatCount, alert: unreadChatCount > 0 },
                  { id: "servers", label: "Серверы", icon: Server },
                  { id: "dev-users", label: "Пользователи", icon: ShieldAlert },
                  { id: "reports", label: "Репорты", icon: Bug, badge: unhandledReportsCount, alert: unhandledReportsCount > 0 }
                ]
              }
            ]
          : [])
      ];

  // Filter items if user typed in sidebar quick filter
  const filteredNavGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(sidebarFilterQuery.toLowerCase().trim())
      )
    }))
    .filter((group) => group.items.length > 0);

  const filteredShopsList = activeShops.filter(
    (s) =>
      s.name.toLowerCase().includes(shopSearchInput.toLowerCase().trim()) ||
      s.slug.toLowerCase().includes(shopSearchInput.toLowerCase().trim())
  );

  const handleNavClick = (tabId: string) => {
    if (tabId === "dev-users") {
      navigate("/dev-users");
    } else if (tabId === "reports") {
      navigate("/reports");
    } else if (tabId === "profile") {
      handleOpenProfile();
    } else {
      closeSubView();
      setActiveTab(tabId as any);
    }
    setIsSidebarOpen(false);
  };

  const effectiveWidth = isSidebarCollapsed ? 64 : sidebarWidth;

  return (
    <aside
      style={{ ["--sidebar-w" as any]: `${effectiveWidth}px` }}
      className={`
        fixed md:sticky top-0 left-0 z-50 h-[100dvh] md:h-screen max-h-[100dvh] md:max-h-screen bg-app-surface border-r border-app-border
        ${isSidebarCollapsed ? "w-16 md:w-16" : "w-[280px] max-w-[85vw] md:w-[var(--sidebar-w)] md:max-w-none"}
        shrink-0 transition-[width] duration-200 ease-out
        ${isResizingSidebar ? "select-none" : ""}
        ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0 shadow-none"}
      `}
    >
      <div className="h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col justify-between p-2.5 space-y-2.5 pb-6 md:pb-2.5">
        <div className="space-y-2.5">
          {/* Top Brand & Collapse Bar */}
          <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} px-1 pt-0.5`}>
            {isSidebarCollapsed ? (
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                className="w-9 h-9 rounded-xl bg-app-card hover:bg-app-hover border border-app-border flex items-center justify-center font-mono font-bold text-xs text-app-primary transition-all cursor-pointer group shadow-2xs"
                title="Развернуть боковое меню (Compact Mode)"
              >
                <span className="group-hover:hidden text-xs">▲</span>
                <PanelLeftOpen size={16} className="hidden group-hover:block text-app-accent" />
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-app-accent text-app-accent-fg flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-2xs">
                    ▲
                  </div>
                  <span className="font-bold text-xs tracking-tight text-app-primary font-mono truncate">
                    TMA BUILDER
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-app-card border border-app-border text-[9px] font-mono text-app-muted shrink-0">
                    {CHANGELOG_DATA[0]?.version || "v2.8.0"}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleSidebarCollapsed}
                    className="hidden md:flex p-1.5 rounded-lg text-app-muted hover:text-app-primary hover:bg-app-hover border border-transparent hover:border-app-border transition-all cursor-pointer"
                    title="Свернуть панель (Компактный режим)"
                  >
                    <PanelLeftClose size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 rounded-lg text-app-muted hover:text-app-primary bg-app-card border border-app-border md:hidden cursor-pointer"
                    title="Закрыть меню"
                  >
                    <X size={14} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Compact Shop Switcher Popover */}
          <div className="relative" ref={shopDropdownRef}>
            {isSidebarCollapsed ? (
              <button
                type="button"
                onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
                className="w-full h-10 rounded-xl bg-app-card hover:bg-app-hover border border-app-border flex items-center justify-center text-app-primary relative transition-colors cursor-pointer group shadow-2xs"
                title={selectedShop ? `Заведение: ${selectedShop.name} (${selectedShop.slug})` : "Выбрать заведение"}
              >
                <Store size={16} className="text-app-secondary group-hover:text-app-primary" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            ) : (
              <div className="p-1.5 bg-app-card border border-app-border rounded-xl space-y-1.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
                  className="w-full flex items-center justify-between gap-1.5 text-left transition-colors cursor-pointer group rounded-lg p-1 hover:bg-app-surface"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded-lg bg-app-surface border border-app-border flex items-center justify-center shrink-0">
                      <Store size={13} className="text-app-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11.5px] font-semibold text-app-primary truncate group-hover:text-app-accent leading-none">
                          {selectedShop ? selectedShop.name : "Выберите заведение"}
                        </span>
                      </div>
                      <p className="text-[9.5px] font-mono text-app-muted truncate mt-0.5">
                        {selectedShop ? `/${selectedShop.slug}` : "нет заведений"}
                      </p>
                    </div>
                  </div>

                  <ChevronDown
                    size={13}
                    className={`text-app-muted group-hover:text-app-primary shrink-0 transition-transform duration-200 ${
                      isShopDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Quick Shop Action Mini-Strip */}
                {selectedShop && (
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-app-border/50">
                    {!isStaff && (
                      <button
                        type="button"
                        onClick={handleOpenCreateShop}
                        className="flex-1 py-1 px-1.5 rounded-md bg-app-surface hover:bg-app-hover border border-app-border/80 text-[10px] font-mono text-app-secondary hover:text-app-primary flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Создать новое заведение"
                      >
                        <Plus size={11} className="text-emerald-500" />
                        <span>Новое</span>
                      </button>
                    )}
                    {!isStaff && (
                      <button
                        type="button"
                        onClick={() => handleOpenSettings(selectedShop)}
                        className="p-1 rounded-md bg-app-surface hover:bg-app-hover border border-app-border/80 text-app-muted hover:text-app-primary transition-colors cursor-pointer"
                        title="Настройки заведения"
                      >
                        <Settings size={12} />
                      </button>
                    )}
                    <a
                      href={`/${selectedShop.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded-md bg-app-surface hover:bg-app-hover border border-app-border/80 text-app-muted hover:text-app-primary transition-colors"
                      title="Открыть витрину заведения"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Shop Dropdown Menu Popover */}
            <AnimatePresence>
              {isShopDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className={`absolute ${
                    isSidebarCollapsed ? "left-full ml-2 top-0 w-64" : "left-0 right-0 top-full mt-1.5"
                  } z-50 bg-app-modal border border-app-border rounded-xl shadow-2xl p-2 space-y-1.5 backdrop-blur-xl`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-app-muted pb-1 border-b border-app-border">
                    <span className="font-semibold text-app-primary">
                      Заведения ({shops.length})
                    </span>
                    {shops.length > 3 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShopFilterMode(shopFilterMode === "my" ? "all" : "my");
                        }}
                        className="text-app-accent hover:underline cursor-pointer"
                      >
                        {shopFilterMode === "my" ? "Все заведения" : "Мои"}
                      </button>
                    )}
                  </div>

                  {/* Shop Search Filter inside Dropdown */}
                  {shops.length > 4 && (
                    <div className="relative">
                      <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-app-muted" />
                      <input
                        type="text"
                        value={shopSearchInput}
                        onChange={(e) => setShopSearchInput(e.target.value)}
                        placeholder="Поиск заведения..."
                        className="w-full pl-6 pr-2 py-1 text-[11px] bg-app-input border border-app-border rounded-md text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-secondary font-mono"
                      />
                    </div>
                  )}

                  <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
                    {filteredShopsList.length === 0 ? (
                      <div className="p-3 text-center text-[11px] text-app-muted font-mono">
                        Заведений не найдено
                      </div>
                    ) : (
                      filteredShopsList.map((s) => {
                        const isSelected = selectedShop?.id === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedShop(s);
                              setIsShopDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer text-left ${
                              isSelected
                                ? "bg-app-accent text-app-accent-fg font-bold shadow-2xs"
                                : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-1 truncate">
                              <Store size={13} className={isSelected ? "text-app-accent-fg shrink-0" : "text-app-muted shrink-0"} />
                              <span className="truncate text-[11px]">{s.name}</span>
                              <span className={`text-[9.5px] ${isSelected ? "text-app-accent-fg/80" : "text-app-muted"} shrink-0`}>
                                ({s.slug})
                              </span>
                            </div>
                            {isSelected && <Check size={13} className="text-app-accent-fg shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {!isStaff && !isManager && (
                    <div className="pt-1.5 border-t border-app-border space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsShopDropdownOpen(false);
                          handleOpenCreateShop();
                        }}
                        className="w-full py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold bg-app-card hover:bg-app-hover text-app-primary border border-app-border flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus size={13} className="text-emerald-500" />
                        <span>Создать заведение</span>
                      </button>

                      {isOwner && selectedShop && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsShopDropdownOpen(false);
                            handleDeleteShop(selectedShop);
                          }}
                          className="w-full py-1 px-2 rounded-lg text-[10px] font-mono text-rose-500 hover:bg-rose-500/10 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 size={11} />
                          <span>Удалить текущее заведение</span>
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Nav Search Filter (when expanded) */}
          {!isSidebarCollapsed && (
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-app-muted" />
              <input
                type="text"
                value={sidebarFilterQuery}
                onChange={(e) => setSidebarFilterQuery(e.target.value)}
                placeholder="Фильтр меню..."
                className="w-full pl-7 pr-6 py-1.5 text-[11px] bg-app-card border border-app-border rounded-lg text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-secondary transition-colors font-mono"
              />
              {sidebarFilterQuery && (
                <button
                  type="button"
                  onClick={() => setSidebarFilterQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-primary cursor-pointer p-0.5"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          )}

          {/* Categorized Navigation List */}
          <nav className="space-y-3 font-mono">
            {filteredNavGroups.map((group, groupIdx) => (
              <div key={group.title || groupIdx} className="space-y-1">
                {!isSidebarCollapsed && group.title && (
                  <div className="px-2 pt-1 text-[9.5px] uppercase font-bold tracking-wider text-app-muted select-none flex items-center justify-between">
                    <span>{group.title}</span>
                  </div>
                )}
                {isSidebarCollapsed && groupIdx > 0 && (
                  <div className="w-8 mx-auto my-1 border-t border-app-border/40" />
                )}

                <div className="space-y-0.5">
                  {group.items.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    if (isSidebarCollapsed) {
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => handleNavClick(tab.id)}
                          className={`relative w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all cursor-pointer group ${
                            isActive
                              ? "bg-app-accent text-app-accent-fg font-bold shadow-2xs"
                              : "text-app-muted hover:text-app-primary hover:bg-app-hover"
                          }`}
                          title={`${tab.label}${tab.badge ? ` (${tab.badge})` : ""}`}
                        >
                          <Icon size={16} className={isActive ? "text-app-accent-fg" : (tab.id === "reports" && unhandledReportsCount > 0 ? "text-rose-500" : "text-app-muted group-hover:text-app-primary")} />

                          {tab.badge !== undefined && tab.badge > 0 && (
                            <span
                              className={`absolute top-1.5 right-1.5 min-w-[7px] h-[7px] rounded-full ${
                                tab.alert ? "bg-rose-500 animate-pulse" : "bg-app-accent"
                              }`}
                            />
                          )}
                        </button>
                      );
                    }

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleNavClick(tab.id)}
                        className={`relative w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-[11.5px] ${
                          isActive
                            ? "bg-app-accent text-app-accent-fg font-bold shadow-2xs"
                            : "text-app-secondary hover:text-app-primary hover:bg-app-hover"
                        }`}
                      >
                        <div className="flex items-center gap-2 z-10 min-w-0">
                          <Icon
                            size={14}
                            className={`shrink-0 ${
                              isActive
                                ? "text-app-accent-fg"
                                : tab.id === "reports" && unhandledReportsCount > 0
                                ? "text-rose-500"
                                : "text-app-muted"
                            }`}
                          />
                          <span className="truncate">{tab.label}</span>
                        </div>

                        {tab.badge !== undefined && tab.badge > 0 && (
                          <span
                            className={`z-10 px-1.5 py-0.2 rounded-md text-[9.5px] font-mono font-bold transition-all shrink-0 ${
                              tab.alert
                                ? "bg-rose-500 text-white animate-pulse"
                                : isActive
                                ? "bg-app-accent-fg/20 text-app-accent-fg"
                                : "bg-app-card text-app-muted border border-app-border"
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Sidebar Compact Footer */}
        <div className="space-y-2 pt-2 border-t border-app-border font-mono">
          {/* Quick System Icons Strip */}
          <div className={`flex items-center ${isSidebarCollapsed ? "flex-col gap-1.5" : "justify-between gap-1"} px-0.5`}>
            <button
              type="button"
              onClick={handleToggleAdminAudio}
              className="p-1.5 bg-app-card hover:bg-app-hover border border-app-border rounded-lg text-app-primary transition-colors cursor-pointer flex items-center justify-center"
              title={isAudioEnabled ? "Звук уведомлений включен" : "Звук уведомлений выключен"}
            >
              {isAudioEnabled ? <Volume2 size={13} className="text-app-primary shrink-0" /> : <VolumeX size={13} className="text-app-muted shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsQrModalOpen(true);
                setIsSidebarOpen(false);
              }}
              className="p-1.5 bg-app-card hover:bg-app-hover border border-app-border rounded-lg text-app-primary transition-colors cursor-pointer flex items-center justify-center"
              title="Генератор QR-кодов"
            >
              <QrCode size={13} className="text-app-primary shrink-0" />
            </button>

            {!isSidebarCollapsed && (
              <button
                type="button"
                onClick={() => {
                  setIsPlanModalOpen(true);
                  setIsSidebarOpen(false);
                }}
                className="flex-1 px-2 py-1 bg-app-card hover:bg-app-hover border border-app-border text-app-primary rounded-lg text-[9.5px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer truncate"
              >
                <Crown size={11} className="text-amber-400 shrink-0" />
                <span className="truncate">{user?.plan || "FREE"}</span>
              </button>
            )}
          </div>

          {/* Compact Profile Card */}
          {isSidebarCollapsed ? (
            <button
              type="button"
              onClick={handleOpenProfile}
              className="w-10 h-10 mx-auto rounded-xl bg-app-surface border border-app-border flex items-center justify-center relative hover:border-app-secondary transition-colors cursor-pointer group shadow-2xs"
              title={`Профиль: ${user?.name || user?.email || "Администратор"}`}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full rounded-xl object-cover" />
              ) : (
                <span className="text-xs font-bold text-app-primary">
                  {user?.name ? user.name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : "А"}
                </span>
              )}
              <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-app-surface ${token ? "bg-emerald-500" : "bg-amber-500"}`} />
            </button>
          ) : (
            <div className="p-1.5 bg-app-surface border border-app-border rounded-xl flex items-center justify-between shadow-2xs">
              <button
                type="button"
                onClick={handleOpenProfile}
                className="flex items-center gap-2 min-w-0 text-left hover:opacity-85 transition-opacity flex-1 mr-1 cursor-pointer group"
                title="Настройки профиля"
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-lg object-cover border border-app-border shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-app-accent text-app-accent-fg border border-app-border flex items-center justify-center text-[11px] font-bold shrink-0">
                    {user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : "А"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-app-primary truncate group-hover:text-app-accent transition-colors leading-tight">
                    {user?.name || user?.email || "Администратор"}
                  </p>
                  <div className="flex items-center gap-1 text-[9.5px] text-app-muted truncate font-mono mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${token ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                    <span className="truncate">{user?.companyName || (token ? "Онлайн" : "Гость")}</span>
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-0.5 shrink-0">
                {token ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleLogoutRequest();
                      setIsSidebarOpen(false);
                    }}
                    className="p-1 text-app-muted hover:text-rose-500 hover:bg-app-hover rounded-md transition-colors cursor-pointer"
                    title="Выйти из аккаунта"
                  >
                    <LogOut size={13} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAuthModalOpen(true);
                      setIsSidebarOpen(false);
                    }}
                    className="p-1 text-app-accent hover:bg-app-hover rounded-md transition-colors cursor-pointer"
                    title="Войти"
                  >
                    <LogIn size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Micro Footer Links (when expanded) */}
          {!isSidebarCollapsed && (
            <div className="grid grid-cols-3 gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsPrivacyModalOpen(true);
                  setIsSidebarOpen(false);
                }}
                className="p-1 bg-app-surface hover:bg-app-hover border border-app-border rounded-lg flex items-center justify-center gap-1 text-[9.5px] font-mono text-app-muted hover:text-app-primary transition-colors cursor-pointer text-center"
                title="Политика конфиденциальности"
              >
                <ShieldCheck size={11} className="text-emerald-500 shrink-0" />
                <span className="truncate">ФЗ-152</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsChangelogOpen(true);
                  setIsSidebarOpen(false);
                }}
                className="p-1 bg-app-surface hover:bg-app-hover border border-app-border rounded-lg flex items-center justify-center gap-1 text-[9.5px] font-mono text-app-muted hover:text-app-primary transition-colors cursor-pointer text-center"
                title="История обновлений"
              >
                <Sparkles size={11} className="text-indigo-500 shrink-0" />
                <span className="truncate">{CHANGELOG_DATA[0]?.version || "v2.8.0"}</span>
              </button>

              <a
                href="https://github.com/blesswrld/tma-builder"
                target="_blank"
                rel="noreferrer"
                className="p-1 bg-app-surface hover:bg-app-hover border border-app-border rounded-lg flex items-center justify-center gap-1 text-[9.5px] font-mono text-app-muted hover:text-app-primary transition-colors text-center"
                title="Исходный код на GitHub"
              >
                <Github size={11} className="text-app-primary shrink-0" />
                <span className="truncate">Git</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Drag Resizer Handle (only when not collapsed) */}
      {!isSidebarCollapsed && (
        <div
          onMouseDown={startResizingSidebar}
          onTouchStart={startResizingSidebar}
          onDoubleClick={resetSidebarWidth}
          title="Потяните для изменения ширины. Двойной клик — сбросить (256px)"
          className="hidden md:flex absolute top-0 -right-2 bottom-0 w-4 cursor-col-resize z-50 group items-center justify-center select-none"
        >
          <div
            className={`absolute top-0 bottom-0 w-0.5 right-2 transition-colors duration-150 ${
              isResizingSidebar ? "bg-amber-400 opacity-100" : "bg-transparent group-hover:bg-app-accent/50 opacity-70"
            }`}
          />
          <div
            className={`
              relative z-10 flex items-center justify-center w-3 h-7 rounded-full bg-app-surface border border-app-border shadow-xs
              transition-all duration-200 group-hover:scale-110 group-hover:border-app-accent
              ${isResizingSidebar ? "border-amber-400 bg-amber-500/15 scale-110 text-amber-400" : "opacity-40 group-hover:opacity-100 text-app-muted"}
            `}
          >
            <GripVertical size={9} className="shrink-0" />
          </div>
        </div>
      )}
    </aside>
  );
};
