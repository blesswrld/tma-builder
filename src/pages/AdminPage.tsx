import { useEffect, useState, FormEvent, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, ExternalLink, Store, ShoppingBag, Check, Copy, Settings, AlertCircle, Clock, CheckCircle2, XCircle, Package, RefreshCw, Phone, User, ListOrdered, Edit3, Search, BarChart3, Tag, TrendingUp, Layers, LogIn, LogOut, ShieldCheck, Mail, Lock, QrCode, Download, Volume2, VolumeX, Crown, FileSpreadsheet, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import QrGeneratorModal from "../components/QrGeneratorModal";
import PlanModal from "../components/PlanModal";
import AnalyticsTab from "../components/AnalyticsTab";

interface Service {
  id: string;
  title: string;
  price: number;
  description: string | null;
  category?: string | null;
}

interface OrderItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  shopId: string;
  customerName: string;
  customerPhone: string;
  tableNumber?: string | null;
  preferredTime?: string | null;
  items: string; // JSON
  totalPrice: number;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  note?: string | null;
  createdAt: string;
}

interface Shop {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  botToken?: string | null;
  adminChatId?: string | null;
  workingHours?: string | null;
  address?: string | null;
  phone?: string | null;
  isOpen?: boolean;
  ownerId?: string | null;
  owner?: {
    id: string;
    email: string;
    name?: string | null;
  } | null;
  services: Service[];
  _count?: {
    orders: number;
  };
}

export default function AdminPage() {
  const { user, token, login, register, logout } = useAuth();

  // Модалка авторизации
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Табы для управления магазином
  const [activeTab, setActiveTab] = useState<"services" | "orders" | "analytics">("services");

  // Заказы
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("ALL");

  // Форма создания магазина
  const [isCreatingShop, setIsCreatingShop] = useState(false);
  const [newShopData, setNewShopData] = useState({ name: "", slug: "", description: "" });
  const [createShopError, setCreateShopError] = useState<string | null>(null);
  const [createShopFieldErrors, setCreateShopFieldErrors] = useState<{ name?: string; slug?: string; description?: string }>({});

  // Форма добавления услуги
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceData, setNewServiceData] = useState({ title: "", price: "", description: "", category: "" });
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceFieldErrors, setServiceFieldErrors] = useState<{ title?: string; price?: string; description?: string }>({});

  // Форма редактирования услуги
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editServiceData, setEditServiceData] = useState({ title: "", price: "", description: "", category: "" });
  const [editServiceError, setEditServiceError] = useState<string | null>(null);
  const [editServiceFieldErrors, setEditServiceFieldErrors] = useState<{ title?: string; price?: string; description?: string }>({});
  const [isSavingEditService, setIsSavingEditService] = useState(false);

  // Фильтрация и поиск услуг
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");

  // Инструкция Telegram
  const [isTgGuideOpen, setIsTgGuideOpen] = useState(false);

  // Настройки и редактирование заведения
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsData, setSettingsData] = useState({
    name: "",
    description: "",
    botToken: "",
    adminChatId: "",
    workingHours: "",
    address: "",
    phone: "",
    isOpen: true
  });
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsFieldErrors, setSettingsFieldErrors] = useState<{ botToken?: string; adminChatId?: string; name?: string }>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Подтверждение и состояние удаления магазина
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);
  const [isDeletingShop, setIsDeletingShop] = useState(false);
  const [deleteShopError, setDeleteShopError] = useState<string | null>(null);

  // Разделение заведений по устройствам (локально)
  const [myDeviceShopIds, setMyDeviceShopIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("my_admin_shops");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [shopFilterMode, setShopFilterMode] = useState<"my" | "all">("my");

  // Состояния для SaaS фич
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
  const prevOrdersCountRef = useRef<number | null>(null);

  // Синтез звука встроенным Web Audio API
  const playOrderChime = () => {
    if (!isAudioEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Тон 1: D5
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.3);

      // Тон 2: A5 через 0.12 сек
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.12);
      osc2.stop(audioCtx.currentTime + 0.5);
    } catch (err) {
      console.error("Audio chime error:", err);
    }
  };

  // Выгрузка в CSV / Excel
  const exportOrdersToCsv = () => {
    if (!orders || orders.length === 0) {
      alert("Нет заказов для экспорта.");
      return;
    }

    let csvContent = "\uFEFFID Заказа;Дата и время;Имя клиента;Телефон;№ Столика / Время;Состав заказа;Итого (₽);Статус;Примечание\n";

    orders.forEach(order => {
      let parsedItems = "";
      try {
        const itemsArr = JSON.parse(order.items);
        if (Array.isArray(itemsArr)) {
          parsedItems = itemsArr.map((i: any) => `${i.title} (x${i.quantity})`).join(", ");
        } else {
          parsedItems = order.items;
        }
      } catch {
        parsedItems = order.items;
      }

      const tableOrTime = [order.tableNumber ? `Стол: ${order.tableNumber}` : "", order.preferredTime ? `Время: ${order.preferredTime}` : ""].filter(Boolean).join(" | ") || "—";
      const formattedDate = new Date(order.createdAt).toLocaleString("ru-RU");
      const statusMap: Record<string, string> = {
        PENDING: "Новый",
        CONFIRMED: "Принят",
        COMPLETED: "Выполнен",
        CANCELLED: "Отменен"
      };

      const row = [
        order.id,
        formattedDate,
        `"${(order.customerName || "").replace(/"/g, '""')}"`,
        `"${(order.customerPhone || "").replace(/"/g, '""')}"`,
        `"${tableOrTime.replace(/"/g, '""')}"`,
        `"${parsedItems.replace(/"/g, '""')}"`,
        order.totalPrice,
        statusMap[order.status] || order.status,
        `"${(order.note || "").replace(/"/g, '""')}"`
      ];

      csvContent += row.join(";") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `orders_${selectedShop?.slug || "shop"}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const linkShopToDevice = (shopId: string) => {
    try {
      const updated = Array.from(new Set([...myDeviceShopIds, shopId]));
      localStorage.setItem("my_admin_shops", JSON.stringify(updated));
      setMyDeviceShopIds(updated);
    } catch (e) {
      console.error("Storage error:", e);
    }
  };

  const unlinkShopFromDevice = (shopId: string) => {
    try {
      const updated = myDeviceShopIds.filter(id => id !== shopId);
      localStorage.setItem("my_admin_shops", JSON.stringify(updated));
      setMyDeviceShopIds(updated);
    } catch (e) {
      console.error("Storage error:", e);
    }
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmittingAuth(true);

    try {
      if (authMode === "login") {
        await login(authEmail, authPassword);
      } else {
        await register(authEmail, authPassword, authName);
      }
      setIsAuthModalOpen(false);
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
      await fetchShops();
    } catch (err: any) {
      setAuthError(err.message || "Ошибка авторизации");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const fetchShops = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/shops", { headers });
      if (!res.ok) {
        let errMsg = `Ошибка сервера (${res.status})`;
        const text = await res.text();
        try {
          const errData = JSON.parse(text);
          if (errData.error) errMsg = errData.error;
        } catch {
          if (text) errMsg = `${errMsg}: ${text.slice(0, 150)}`;
        }
        throw new Error(errMsg);
      }
      const data: Shop[] = await res.json();
      setShops(data);

      let currentDeviceIds = myDeviceShopIds;
      if (localStorage.getItem("my_admin_shops") === null && data.length > 0) {
        currentDeviceIds = data.map((s: Shop) => s.id);
        localStorage.setItem("my_admin_shops", JSON.stringify(currentDeviceIds));
        setMyDeviceShopIds(currentDeviceIds);
      }

      const myShops = data.filter((s: Shop) => currentDeviceIds.includes(s.id));
      const activeList = shopFilterMode === "my" && myShops.length > 0 ? myShops : data;

      setSelectedShop(prev => {
        if (prev) {
          const updated = data.find((s: Shop) => s.id === prev.id);
          if (updated) return updated;
        }
        return activeList.length > 0 ? activeList[0] : null;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, [token]);

  const fetchOrders = async (shopId: string, silent = false) => {
    if (!silent) setOrdersLoading(true);
    try {
      const res = await fetch(`/api/shops/${shopId}/orders`);
      if (res.ok) {
        const data: Order[] = await res.json();
        
        // Проверка поступления новых заказов для уведомления
        if (prevOrdersCountRef.current !== null && data.length > prevOrdersCountRef.current) {
          const newest = data[0];
          if (newest && newest.status === "PENDING") {
            setNewOrderAlert(newest);
            playOrderChime();
          }
        }
        prevOrdersCountRef.current = data.length;
        setOrders(data);
      }
    } catch (err) {
      console.error("Ошибка при получении заказов:", err);
    } finally {
      if (!silent) setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (selectedShop) {
      prevOrdersCountRef.current = null;
      fetchOrders(selectedShop.id);

      // Фоновый поллинг новых заказов каждые 10 секунд
      const interval = setInterval(() => {
        fetchOrders(selectedShop.id, true);
      }, 10000);

      return () => clearInterval(interval);
    } else {
      setOrders([]);
      prevOrdersCountRef.current = null;
    }
  }, [selectedShop?.id]);

  const handleUpdateOrderStatus = async (orderId: string, status: Order["status"]) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      } else {
        const err = await res.json();
        alert(err.error || "Не удалось обновить статус");
      }
    } catch (err: any) {
      alert("Ошибка сети: " + err.message);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот заказ?")) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
      }
    } catch (err: any) {
      alert("Не удалось удалить заказ: " + err.message);
    }
  };

  const validateCreateShop = () => {
    const errors: { name?: string; slug?: string; description?: string } = {};

    if (!newShopData.name.trim() || newShopData.name.trim().length < 2) {
      errors.name = "Название должно содержать минимум 2 символа";
    } else if (newShopData.name.trim().length > 50) {
      errors.name = "Название не должно превышать 50 символов";
    }

    const cleanSlug = newShopData.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
    const slugRegex = /^[a-z0-9-]{2,30}$/;
    if (!cleanSlug) {
      errors.slug = "Введите URL / Slug магазина";
    } else if (!slugRegex.test(cleanSlug)) {
      errors.slug = "Slug должен состоять из латинских букв, цифр или дефисов (от 2 до 30 символов)";
    }

    if (newShopData.description.length > 300) {
      errors.description = "Описание не должно превышать 300 символов";
    }

    setCreateShopFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateShop = async (e: FormEvent) => {
    e.preventDefault();
    setCreateShopError(null);

    if (!validateCreateShop()) return;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/shops", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: newShopData.name.trim(),
          slug: newShopData.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-"),
          description: newShopData.description.trim() || undefined
        })
      });

      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        if (!res.ok) {
          throw new Error(`Ошибка сервера (${res.status}): ${text.slice(0, 150)}`);
        }
        throw new Error("Сервер вернул некорректный ответ");
      }

      if (!res.ok) throw new Error(data.error || "Не удалось создать магазин");

      if (data?.id) {
        linkShopToDevice(data.id);
        setShopFilterMode("my");
      }

      setNewShopData({ name: "", slug: "", description: "" });
      setCreateShopFieldErrors({});
      setIsCreatingShop(false);
      await fetchShops();
      setSelectedShop(data);
    } catch (err: any) {
      setCreateShopError(err.message);
    }
  };

  const openDeleteConfirmation = (shop: Shop) => {
    console.log(`[DEBUG] Opening delete confirmation modal for shop id="${shop.id}", name="${shop.name}"`);
    setDeleteShopError(null);
    setShopToDelete(shop);
  };

  const confirmDeleteShop = async () => {
    if (!shopToDelete) return;

    setIsDeletingShop(true);
    setDeleteShopError(null);

    const targetUrl = `/api/shops/${shopToDelete.id}`;
    console.log(`[DEBUG] Initiating DELETE request to endpoint: ${targetUrl}`);

    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(targetUrl, { method: "DELETE", headers });
      const data = await res.json().catch(() => ({}));
      console.log(`[DEBUG] Delete request response status: ${res.status}`, data);

      if (!res.ok) {
        throw new Error(data.error || `Не удалось удалить магазин (Код ошибки: ${res.status})`);
      }

      console.log(`[DEBUG] Shop "${shopToDelete.name}" (ID: ${shopToDelete.id}) successfully deleted.`);
      unlinkShopFromDevice(shopToDelete.id);
      setShopToDelete(null);
      setSelectedShop(null);
      await fetchShops();
    } catch (err: any) {
      console.error("[DEBUG] Error caught during shop deletion:", err);
      setDeleteShopError(err.message || "Произошла ошибка при удалении магазина");
    } finally {
      setIsDeletingShop(false);
    }
  };

  const validateService = () => {
    const errors: { title?: string; price?: string; description?: string } = {};

    if (!newServiceData.title.trim() || newServiceData.title.trim().length < 2) {
      errors.title = "Название услуги должно содержать минимум 2 символа";
    } else if (newServiceData.title.trim().length > 100) {
      errors.title = "Название не должно превышать 100 символов";
    }

    const priceNum = Number(newServiceData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      errors.price = "Укажите корректную стоимость больше 0 ₽";
    } else if (priceNum > 10000000) {
      errors.price = "Цена превышает допустимый лимит (10,000,000 ₽)";
    }

    if (newServiceData.description.length > 500) {
      errors.description = "Описание не должно превышать 500 символов";
    }

    setServiceFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddService = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;
    setServiceError(null);

    if (!validateService()) return;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/shops/${selectedShop.id}/services`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: newServiceData.title.trim(),
          price: Number(newServiceData.price),
          description: newServiceData.description.trim() || undefined,
          category: newServiceData.category.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось добавить услугу");

      setNewServiceData({ title: "", price: "", description: "", category: "" });
      setServiceFieldErrors({});
      setIsAddingService(false);
      await fetchShops();
    } catch (err: any) {
      setServiceError(err.message);
    }
  };

  const handleOpenEditService = (service: Service) => {
    setEditingService(service);
    setEditServiceData({
      title: service.title,
      price: service.price.toString(),
      description: service.description || "",
      category: service.category || ""
    });
    setEditServiceError(null);
    setEditServiceFieldErrors({});
  };

  const handleSaveEditService = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    const errors: { title?: string; price?: string; description?: string } = {};
    if (!editServiceData.title.trim() || editServiceData.title.trim().length < 2) {
      errors.title = "Название услуги должно содержать минимум 2 символа";
    }
    const priceNum = Number(editServiceData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      errors.price = "Укажите корректную стоимость больше 0 ₽";
    }

    if (Object.keys(errors).length > 0) {
      setEditServiceFieldErrors(errors);
      return;
    }

    setIsSavingEditService(true);
    setEditServiceError(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/services/${editingService.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          title: editServiceData.title.trim(),
          price: Math.round(priceNum),
          description: editServiceData.description.trim() || undefined,
          category: editServiceData.category.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось обновить услугу");

      setEditingService(null);
      await fetchShops();
    } catch (err: any) {
      setEditServiceError(err.message);
    } finally {
      setIsSavingEditService(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/services/${serviceId}`, { method: "DELETE", headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Не удалось удалить услугу");
      await fetchShops();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const validateSettings = () => {
    const errors: { botToken?: string; adminChatId?: string; name?: string } = {};

    if (!settingsData.name.trim()) {
      errors.name = "Укажите название заведения";
    }

    if (settingsData.botToken.trim()) {
      const botTokenRegex = /^\d+:[A-Za-z0-9_-]{30,}$/;
      if (!botTokenRegex.test(settingsData.botToken.trim())) {
        errors.botToken = "Неверный формат Bot Token (пример: 123456789:AAH...)";
      }
    }

    if (settingsData.adminChatId.trim()) {
      const chatIdRegex = /^-?\d+$/;
      if (!chatIdRegex.test(settingsData.adminChatId.trim())) {
        errors.adminChatId = "Chat ID должен состоять только из цифр";
      }
    }

    setSettingsFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;
    setSettingsError(null);

    if (!validateSettings()) return;

    setIsSavingSettings(true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/shops/${selectedShop.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: settingsData.name.trim() || selectedShop.name,
          description: settingsData.description.trim() || undefined,
          botToken: settingsData.botToken.trim() || undefined,
          adminChatId: settingsData.adminChatId.trim() || undefined,
          workingHours: settingsData.workingHours.trim() || undefined,
          address: settingsData.address.trim() || undefined,
          phone: settingsData.phone.trim() || undefined,
          isOpen: settingsData.isOpen
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить настройки");

      setIsSettingsOpen(false);
      await fetchShops();
    } catch (err: any) {
      setSettingsError(err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const copyShopUrl = (slug: string) => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          <p className="text-xs font-medium text-slate-400">Загрузка панели управления...</p>
        </div>
      </div>
    );
  }

  const handleClaimShop = async (shopId: string) => {
    if (!token) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const res = await fetch(`/api/shops/${shopId}/claim`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Не удалось привязать заведение");
        return;
      }
      linkShopToDevice(shopId);
      await fetchShops();
    } catch (err) {
      console.error(err);
    }
  };

  const myShops = user
    ? shops.filter((s) => s.ownerId === user.id)
    : shops.filter((s) => myDeviceShopIds.includes(s.id) && !s.ownerId);

  const displayedShops = shopFilterMode === "my" ? myShops : shops;

  const allServices = selectedShop?.services || [];
  const categories = Array.from(new Set(allServices.map(s => s.category).filter(Boolean))) as string[];
  const filteredServices = allServices.filter(service => {
    const matchesCategory = selectedCategoryFilter === "ALL" || service.category === selectedCategoryFilter;
    const matchesSearch = service.title.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
      (service.description && service.description.toLowerCase().includes(serviceSearchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* Шапка */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold shadow-sm">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900">
                TMA Builder
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">Конструктор магазинов Telegram</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Кнопка вкл/выкл звуковых уведомлений */}
            <button
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              title={isAudioEnabled ? "Звук уведомлений включен" : "Звук уведомлений выключен"}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                isAudioEnabled 
                  ? "bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200" 
                  : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
              }`}
            >
              {isAudioEnabled ? <Volume2 size={16} className="text-emerald-600" /> : <VolumeX size={16} />}
              <span className="hidden md:inline text-[11px]">{isAudioEnabled ? "Звук вкл" : "Звук выкл"}</span>
            </button>

            {/* Плашка и кнопка выбора тарифа SaaS */}
            <button
              onClick={() => setIsPlanModalOpen(true)}
              className="px-3 py-1.5 bg-linear-to-r from-amber-500/10 via-amber-500/15 to-indigo-500/10 hover:from-amber-500/20 hover:to-indigo-500/20 text-slate-900 border border-amber-300/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-98"
            >
              <Crown size={15} className="text-amber-500 fill-amber-500" />
              <span>Тариф: {user?.plan || "FREE"}</span>
            </button>

            {/* Блок аутентификации пользователя */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-800">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span className="truncate max-w-[120px] sm:max-w-[180px]">{user.name || user.email}</span>
                </div>
                <button
                  onClick={logout}
                  title="Выйти из аккаунта"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthError(null);
                  setIsAuthModalOpen(true);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-98 border border-slate-200"
              >
                <LogIn size={15} />
                <span className="hidden sm:inline">Войти</span>
              </button>
            )}

            <button
              onClick={() => {
                setNewShopData({ name: "", slug: "", description: "" });
                setCreateShopFieldErrors({});
                setCreateShopError(null);
                setIsCreatingShop(true);
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 active:scale-98"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Создать магазин</span>
              <span className="sm:hidden">Создать</span>
            </button>
          </div>
        </div>
      </header>

      {/* Основной контейнер с сеткой */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Боковая панель выбора заведения */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Заведения
                  </span>
                </div>

                {/* Переключатель локального режима устройств */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setShopFilterMode("my");
                      if (myShops.length > 0 && (!selectedShop || !myDeviceShopIds.includes(selectedShop.id))) {
                        setSelectedShop(myShops[0]);
                      }
                    }}
                    className={`py-1.5 px-2 rounded-lg text-center transition-all ${
                      shopFilterMode === "my"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Мои ({myShops.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShopFilterMode("all")}
                    className={`py-1.5 px-2 rounded-lg text-center transition-all ${
                      shopFilterMode === "all"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Все ({shops.length})
                  </button>
                </div>
              </div>

              {displayedShops.length === 0 ? (
                <div className="text-center py-6 px-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                  <p className="text-xs text-slate-500">
                    {shopFilterMode === "my"
                      ? "На этом устройстве пока нет сохраненных заведений"
                      : "Заведений пока нет"}
                  </p>
                  <div className="flex flex-col gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingShop(true)}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      + Создать заведение
                    </button>
                    {shopFilterMode === "my" && shops.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShopFilterMode("all")}
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-800"
                      >
                        Показать все в базе ({shops.length})
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {displayedShops.map((shop) => {
                    const isSelected = selectedShop?.id === shop.id;
                    const isOwner = user
                      ? shop.ownerId === user.id
                      : myDeviceShopIds.includes(shop.id) && !shop.ownerId;
                    const hasOtherOwner = user
                      ? Boolean(shop.ownerId && shop.ownerId !== user.id)
                      : Boolean(shop.ownerId);

                    return (
                      <div
                        key={shop.id}
                        className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                            : "bg-slate-50/50 border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedShop(shop)}
                          className="flex items-center gap-3 overflow-hidden flex-1 text-left min-w-0"
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 uppercase ${
                              isSelected ? "bg-white/15 text-white" : "bg-slate-200/80 text-slate-700"
                            }`}
                          >
                            {shop.name.charAt(0)}
                          </div>
                          <div className="overflow-hidden flex-1 min-w-0">
                            <p
                              className={`text-xs font-semibold truncate ${
                                isSelected ? "text-white" : "text-slate-900"
                              }`}
                            >
                              {shop.name}
                            </p>
                            <p
                              className={`text-[10px] truncate ${
                                isSelected ? "text-slate-300" : "text-slate-400"
                              }`}
                            >
                              /{shop.slug}
                            </p>
                          </div>
                        </button>

                        {/* Безопасное отображение статуса владельца */}
                        {isOwner ? (
                          <span
                            title="Вы являетесь владельцем этого заведения"
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold shrink-0 ${
                              isSelected
                                ? "bg-emerald-500/30 text-emerald-200"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            Мое
                          </span>
                        ) : hasOtherOwner ? (
                          <span
                            title={`Заведение принадлежит пользователю ${shop.owner?.email || "другого аккаунта"}`}
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold shrink-0 select-none ${
                              isSelected
                                ? "bg-white/10 text-slate-400"
                                : "bg-slate-200/60 text-slate-500"
                            }`}
                          >
                            {shop.owner?.email ? shop.owner.email.split("@")[0] : "Чужое"}
                          </span>
                        ) : user ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaimShop(shop.id);
                            }}
                            title="Нажмите, чтобы привязать это анонимное заведение к вашему аккаунту"
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors shrink-0 ${
                              isSelected
                                ? "bg-blue-500/40 text-blue-100 hover:bg-blue-500/60"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            }`}
                          >
                            + Привязать
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (myDeviceShopIds.includes(shop.id)) {
                                unlinkShopFromDevice(shop.id);
                              } else {
                                linkShopToDevice(shop.id);
                              }
                            }}
                            title="Сохранить локально на этом устройстве"
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors shrink-0 ${
                              myDeviceShopIds.includes(shop.id)
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200/80 text-slate-700 hover:bg-slate-300"
                            }`}
                          >
                            {myDeviceShopIds.includes(shop.id) ? "Мое" : "+ Мое"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => {
                  setNewShopData({ name: "", slug: "", description: "" });
                  setCreateShopFieldErrors({});
                  setCreateShopError(null);
                  setIsCreatingShop(true);
                }}
                className="w-full py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={15} />
                <span>Добавить заведение</span>
              </button>
            </div>

            <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 text-xs text-blue-900 leading-relaxed space-y-1">
              <p className="font-semibold text-blue-950">💡 Витрина Mini App</p>
              <p className="text-[11px] text-blue-800">
                Каждый магазин сразу имеет готовую веб-витрину по адресу вида <code>/{selectedShop?.slug || "my-shop"}</code>.
              </p>
            </div>
          </aside>

          {/* Панель управления выбранным заведением */}
          <main className="lg:col-span-8 xl:col-span-9 space-y-6">
            {selectedShop ? (
              <>
                {/* Карточка заведения и аналитика */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl font-bold text-slate-900">{selectedShop.name}</h2>
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200 uppercase tracking-wider">
                          Активен
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {selectedShop.description || "Описание не указано"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsQrModalOpen(true)}
                        className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border border-indigo-200/80"
                      >
                        <QrCode size={15} />
                        <span>QR & Печать</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsTgGuideOpen(true)}
                        className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border border-blue-200/80"
                      >
                        <span>📱 Инструкция TG</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => copyShopUrl(selectedShop.slug)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        {copiedSlug === selectedShop.slug ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                        <span>{copiedSlug === selectedShop.slug ? "Скопировано" : "Ссылка"}</span>
                      </button>

                      <Link
                        to={`/${selectedShop.slug}`}
                        target="_blank"
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>Открыть Mini App</span>
                        <ExternalLink size={14} />
                      </Link>

                      <button
                        type="button"
                        disabled={Boolean(selectedShop.ownerId && selectedShop.ownerId !== user?.id)}
                        onClick={() => {
                          setSettingsData({
                            name: selectedShop.name || "",
                            description: selectedShop.description || "",
                            botToken: selectedShop.botToken || "",
                            adminChatId: selectedShop.adminChatId || "",
                            workingHours: selectedShop.workingHours || "Пн-Вс: 09:00 - 22:00",
                            address: selectedShop.address || "",
                            phone: selectedShop.phone || "",
                            isOpen: selectedShop.isOpen !== undefined ? selectedShop.isOpen : true
                          });
                          setSettingsFieldErrors({});
                          setSettingsError(null);
                          setIsSettingsOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        title={selectedShop.ownerId && selectedShop.ownerId !== user?.id ? "Редактирование настроек доступно только владельцу" : "Настройки заведения"}
                      >
                        <Settings size={18} />
                      </button>

                      <button
                        type="button"
                        disabled={Boolean(selectedShop.ownerId && selectedShop.ownerId !== user?.id)}
                        onClick={() => openDeleteConfirmation(selectedShop)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        title={selectedShop.ownerId && selectedShop.ownerId !== user?.id ? "Удаление доступно только владельцу" : "Удалить заведение"}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Информационные статусы владельца */}
                  {selectedShop.ownerId && selectedShop.ownerId !== user?.id && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertCircle size={17} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Чужое заведение (Режим просмотра)</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Владелец: <strong>{selectedShop.owner?.email || "Другой пользователь"}</strong>. Вам доступен просмотр каталога, но редактирование услуг и настроек заблокировано для чужих аккаунтов.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedShop.ownerId && selectedShop.ownerId === user?.id && (
                    <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-emerald-600" />
                        <span className="font-semibold">Вы владелец этого заведения</span>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-medium">{user.email}</span>
                    </div>
                  )}

                  {!selectedShop.ownerId && user && (
                    <div className="px-3.5 py-2 bg-blue-50 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-blue-600" />
                        <span className="font-medium">Заведение пока анонимно. Закрепите его за своим аккаунтом:</span>
                      </div>
                      <button
                        onClick={() => handleClaimShop(selectedShop.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors"
                      >
                        Привязать к {user.email}
                      </button>
                    </div>
                  )}

                  {/* Быстрая аналитика */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                    <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Выручка</span>
                        <TrendingUp size={14} className="text-emerald-500" />
                      </div>
                      <p className="text-base font-extrabold text-slate-900 font-mono">
                        {orders
                          .filter(o => o.status === "COMPLETED" || o.status === "CONFIRMED")
                          .reduce((sum, o) => sum + o.totalPrice, 0)
                          .toLocaleString("ru-RU")} ₽
                      </p>
                    </div>

                    <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Всего заказов</span>
                        <Package size={14} className="text-blue-500" />
                      </div>
                      <p className="text-base font-extrabold text-slate-900 font-mono">
                        {orders.length}
                      </p>
                    </div>

                    <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">В обработке</span>
                        <Clock size={14} className="text-amber-500" />
                      </div>
                      <p className="text-base font-extrabold text-amber-700 font-mono">
                        {orders.filter(o => o.status === "PENDING").length}
                      </p>
                    </div>

                    <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Средний чек</span>
                        <BarChart3 size={14} className="text-indigo-500" />
                      </div>
                      <p className="text-base font-extrabold text-slate-900 font-mono">
                        {(orders.length > 0
                          ? Math.round(orders.reduce((sum, o) => sum + o.totalPrice, 0) / orders.length)
                          : 0
                        ).toLocaleString("ru-RU")} ₽
                      </p>
                    </div>
                  </div>
                </div>

                {/* Табы навигации в заведении */}
                <div className="flex border-b border-slate-200/80 gap-2 flex-wrap">
                  <button
                    onClick={() => setActiveTab("services")}
                    className={`px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors ${
                      activeTab === "services"
                        ? "border-slate-900 text-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <ShoppingBag size={15} />
                    <span>Услуги и товары ({(selectedShop.services || []).length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("orders")}
                    className={`px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors ${
                      activeTab === "orders"
                        ? "border-slate-900 text-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <ListOrdered size={15} />
                    <span>Управление заказами ({orders.length})</span>
                    {orders.filter(o => o.status === "PENDING").length > 0 && (
                      <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-extrabold animate-pulse">
                        {orders.filter(o => o.status === "PENDING").length} нов.
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab("analytics")}
                    className={`px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors ${
                      activeTab === "analytics"
                        ? "border-slate-900 text-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <BarChart3 size={15} />
                    <span>Аналитика и финансовые отчеты</span>
                  </button>
                </div>

                {/* Вкладка 1: Услуги и товары */}
                {activeTab === "services" && (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                      {/* Таблица услуг */}
                      <div className="xl:col-span-8 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                          <h3 className="text-sm font-bold text-slate-900">
                            Каталог услуг ({filteredServices.length} из {allServices.length})
                          </h3>
                          <button
                            disabled={Boolean(selectedShop.ownerId && selectedShop.ownerId !== user?.id)}
                            onClick={() => {
                              setNewServiceData({ title: "", price: "", description: "", category: "" });
                              setServiceFieldErrors({});
                              setServiceError(null);
                              setIsAddingService(true);
                            }}
                            className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto disabled:opacity-40 disabled:hover:bg-slate-900 disabled:cursor-not-allowed"
                            title={selectedShop.ownerId && selectedShop.ownerId !== user?.id ? "Редактирование доступно только владельцу" : ""}
                          >
                            <Plus size={15} />
                            <span>Добавить услугу</span>
                          </button>
                        </div>

                        {/* Поиск и фильтры по категориям */}
                        {allServices.length > 0 && (
                          <div className="space-y-2.5">
                            <div className="relative">
                              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={serviceSearchQuery}
                                onChange={e => setServiceSearchQuery(e.target.value)}
                                placeholder="Поиск услуг по названию или описанию..."
                                className="w-full pl-9 pr-4 py-2 bg-white text-xs rounded-xl border border-slate-200/80 focus:border-slate-900 focus:outline-none transition-all"
                              />
                              {serviceSearchQuery && (
                                <button
                                  onClick={() => setServiceSearchQuery("")}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {categories.length > 0 && (
                              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                                <button
                                  onClick={() => setSelectedCategoryFilter("ALL")}
                                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 ${
                                    selectedCategoryFilter === "ALL"
                                      ? "bg-slate-900 text-white"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  Все категории ({allServices.length})
                                </button>
                                {categories.map(cat => (
                                  <button
                                    key={cat}
                                    onClick={() => setSelectedCategoryFilter(cat)}
                                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 ${
                                      selectedCategoryFilter === cat
                                        ? "bg-slate-900 text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                  >
                                    {cat} ({allServices.filter(s => s.category === cat).length})
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
                          {filteredServices.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                              <ShoppingBag size={36} className="mx-auto mb-3 opacity-30" />
                              <p className="font-semibold text-xs text-slate-700">Услуги не найдены</p>
                              <p className="text-[11px] text-slate-400 mt-1">Попробуйте изменить параметры поиска или фильтр категорий</p>
                            </div>
                          ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/60">
                                <tr>
                                  <th className="px-5 py-3">Услуга / Товар</th>
                                  <th className="px-5 py-3">Категория</th>
                                  <th className="px-5 py-3">Цена</th>
                                  <th className="px-5 py-3 text-right">Действия</th>
                                </tr>
                              </thead>
                              <tbody className="text-xs divide-y divide-slate-100">
                                {filteredServices.map((service) => (
                                  <tr key={service.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-3.5">
                                      <p className="font-semibold text-slate-900">{service.title}</p>
                                      {service.description && (
                                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{service.description}</p>
                                      )}
                                    </td>
                                    <td className="px-5 py-3.5">
                                      {service.category ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold">
                                          <Tag size={10} className="text-slate-400" />
                                          {service.category}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300 text-[10px]">—</span>
                                      )}
                                    </td>
                                    <td className="px-5 py-3.5 font-bold text-slate-900 font-mono">
                                      {service.price.toLocaleString("ru-RU")} ₽
                                    </td>
                                    <td className="px-5 py-3.5 text-right space-x-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditService(service)}
                                        className="text-slate-400 hover:text-slate-800 p-1.5 rounded-lg transition-colors hover:bg-slate-100"
                                        title="Редактировать услугу"
                                      >
                                        <Edit3 size={15} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteService(service.id)}
                                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition-colors hover:bg-red-50"
                                        title="Удалить услугу"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>

                  {/* Макет смартфона */}
                  <div className="xl:col-span-4 hidden xl:block space-y-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                      Предпросмотр Mini App
                    </span>
                    <div className="bg-slate-900 rounded-[32px] p-3 shadow-xl border border-slate-800 flex flex-col h-[500px] overflow-hidden relative">
                      <div className="w-20 h-4 bg-slate-950 rounded-b-xl absolute top-0 left-1/2 -translate-x-1/2 z-10"></div>
                      <div className="mt-4 flex-1 bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
                        <div>
                          <div className="bg-slate-900 text-white px-4 py-5 text-center">
                            <div className="w-9 h-9 bg-white/10 rounded-xl mb-2 flex items-center justify-center text-white font-bold text-sm uppercase mx-auto">
                              {selectedShop.name.charAt(0)}
                            </div>
                            <h3 className="text-xs font-bold truncate">{selectedShop.name}</h3>
                            <p className="text-[10px] text-slate-300 line-clamp-1 mt-0.5">{selectedShop.description || "Витрина"}</p>
                          </div>
                          <div className="p-3 space-y-2 max-h-[280px] overflow-y-auto">
                            {(selectedShop.services || []).slice(0, 3).map((s) => (
                              <div key={s.id} className="p-2 border border-slate-100 rounded-xl flex justify-between items-center bg-slate-50">
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-semibold text-slate-900">{s.title}</p>
                                  <p className="text-[10px] font-bold text-slate-900">{s.price} ₽</p>
                                </div>
                                <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-semibold rounded-full">
                                  Выбрать
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="p-3 bg-white border-t border-slate-100">
                          <div className="w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold text-center">
                            Оформить заказ
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

                {/* Вкладка 2: Управление заказами */}
                {activeTab === "orders" && (
                  <div className="space-y-4">
                    {/* Панель фильтрации заказов */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          { id: "ALL", label: "Все заказы", count: orders.length },
                          { id: "PENDING", label: "⏳ В обработке", count: orders.filter(o => o.status === "PENDING").length, color: "text-amber-700 bg-amber-50" },
                          { id: "CONFIRMED", label: "🤝 Подтвержден", count: orders.filter(o => o.status === "CONFIRMED").length, color: "text-blue-700 bg-blue-50" },
                          { id: "COMPLETED", label: "✅ Завершен", count: orders.filter(o => o.status === "COMPLETED").length, color: "text-emerald-700 bg-emerald-50" },
                          { id: "CANCELLED", label: "❌ Отменен", count: orders.filter(o => o.status === "CANCELLED").length, color: "text-rose-700 bg-rose-50" }
                        ].map((f) => {
                          const isActive = orderStatusFilter === f.id;
                          return (
                            <button
                              key={f.id}
                              onClick={() => setOrderStatusFilter(f.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                isActive
                                  ? "bg-slate-900 text-white shadow-2xs"
                                  : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80"
                              }`}
                            >
                              <span>{f.label}</span>
                              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                                {f.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={exportOrdersToCsv}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5"
                          title="Экспорт заказов в CSV / Excel"
                        >
                          <FileSpreadsheet size={15} />
                          <span className="hidden sm:inline">Экспорт CSV</span>
                        </button>

                        <button
                          onClick={() => fetchOrders(selectedShop.id)}
                          disabled={ordersLoading}
                          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
                          title="Обновить список заказов"
                        >
                          <RefreshCw size={14} className={ordersLoading ? "animate-spin" : ""} />
                          <span className="hidden sm:inline">Обновить</span>
                        </button>
                      </div>
                    </div>

                    {/* Список заказов */}
                    {ordersLoading ? (
                      <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
                        <RefreshCw size={28} className="mx-auto mb-2 animate-spin text-slate-400" />
                        <p className="text-xs font-semibold">Загрузка заказов...</p>
                      </div>
                    ) : orders.filter(o => orderStatusFilter === "ALL" || o.status === orderStatusFilter).length === 0 ? (
                      <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
                        <Package size={36} className="mx-auto mb-3 opacity-30" />
                        <p className="font-semibold text-xs text-slate-700">Заказов пока нет</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {orderStatusFilter === "ALL"
                            ? "Клиенты ещё не оформляли заказы в этом заведении"
                            : "Заказов с выбранным статусом не найдено"}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {orders
                          .filter(o => orderStatusFilter === "ALL" || o.status === orderStatusFilter)
                          .map((order) => {
                            let parsedItems: OrderItem[] = [];
                            try {
                              parsedItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
                            } catch (e) {
                              parsedItems = [];
                            }

                            const statusBadges: Record<string, { label: string; bg: string; text: string; border: string }> = {
                              PENDING: { label: "⏳ В обработке", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
                              CONFIRMED: { label: "🤝 Подтвержден", bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
                              COMPLETED: { label: "✅ Завершен", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
                              CANCELLED: { label: "❌ Отменен", bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" }
                            };

                            const currentBadge = statusBadges[order.status] || statusBadges.PENDING;

                            return (
                              <div
                                key={order.id}
                                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between gap-4"
                              >
                                <div className="space-y-3">
                                  {/* Шапка заказа */}
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Заказ #{order.id.slice(-6)}
                                      </span>
                                      <p className="text-[11px] font-medium text-slate-500">
                                        {new Date(order.createdAt).toLocaleString("ru-RU", {
                                          day: "2-digit",
                                          month: "short",
                                          hour: "2-digit",
                                          minute: "2-digit"
                                        })}
                                      </p>
                                    </div>

                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${currentBadge.bg} ${currentBadge.text} ${currentBadge.border}`}>
                                      {currentBadge.label}
                                    </span>
                                  </div>

                                  {/* Данные клиента */}
                                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-center gap-2 text-xs text-slate-900 font-semibold">
                                        <User size={14} className="text-slate-400 shrink-0" />
                                        <span>{order.customerName}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-slate-700">
                                        <Phone size={14} className="text-slate-400 shrink-0" />
                                        <a
                                          href={`tel:${order.customerPhone}`}
                                          className="hover:underline font-mono text-blue-600 font-semibold"
                                        >
                                          {order.customerPhone}
                                        </a>
                                      </div>
                                    </div>

                                    {(order.tableNumber || order.preferredTime) && (
                                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 text-xs flex-wrap">
                                        {order.tableNumber && (
                                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-md font-semibold text-[11px] flex items-center gap-1">
                                            🪑 Столик: <strong>{order.tableNumber}</strong>
                                          </span>
                                        )}
                                        {order.preferredTime && (
                                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200/60 rounded-md font-semibold text-[11px] flex items-center gap-1">
                                            ⏰ Время: <strong>{order.preferredTime}</strong>
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {order.note && (
                                      <p className="text-[11px] text-slate-600 bg-amber-50/80 border border-amber-200/60 p-2 rounded-lg italic">
                                        💬 {order.note}
                                      </p>
                                    )}
                                  </div>

                                  {/* Позиции заказа */}
                                  <div className="space-y-1.5 pt-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Состав заказа:</span>
                                    <div className="space-y-1 max-h-36 overflow-y-auto">
                                      {parsedItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs text-slate-800">
                                          <span className="font-medium text-slate-700 truncate max-w-[200px]">
                                            • {item.title} {item.quantity > 1 ? `(x${item.quantity})` : ""}
                                          </span>
                                          <span className="font-bold text-slate-900 font-mono">
                                            {(item.price * (item.quantity || 1)).toLocaleString("ru-RU")} ₽
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Итог и Действия со статусом */}
                                <div className="border-t border-slate-100 pt-3 space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">Итоговая сумма:</span>
                                    <span className="text-base font-extrabold text-slate-900">
                                      {order.totalPrice.toLocaleString("ru-RU")} ₽
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                    {order.status !== "CONFIRMED" && (
                                      <button
                                        onClick={() => handleUpdateOrderStatus(order.id, "CONFIRMED")}
                                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] transition-colors"
                                      >
                                        🤝 Подтвердить
                                      </button>
                                    )}
                                    {order.status !== "COMPLETED" && (
                                      <button
                                        onClick={() => handleUpdateOrderStatus(order.id, "COMPLETED")}
                                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[11px] transition-colors"
                                      >
                                        ✅ Завершить
                                      </button>
                                    )}
                                    {order.status !== "CANCELLED" && (
                                      <button
                                        onClick={() => handleUpdateOrderStatus(order.id, "CANCELLED")}
                                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] transition-colors"
                                      >
                                        ❌ Отменить
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteOrder(order.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                                      title="Удалить запись о заказе"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* Вкладка 3: Финансовая аналитика */}
                {activeTab === "analytics" && (
                  <AnalyticsTab shopId={selectedShop.id} />
                )}
              </>
            ) : (
              <div className="p-12 bg-white rounded-2xl border border-slate-200/80 text-center space-y-4">
                <Store size={40} className="text-slate-300 mx-auto" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Заведение не выбрано</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Выберите заведение из списка слева или создайте новое за несколько секунд.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreatingShop(true)}
                  className="px-5 py-2.5 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  Создать новое заведение
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Модалка создания магазина */}
      {isCreatingShop && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Новое заведение</h3>
              <button
                type="button"
                onClick={() => setIsCreatingShop(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            {createShopError && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium border border-red-100 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{createShopError}</span>
              </div>
            )}

            <form onSubmit={handleCreateShop} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Название заведения <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newShopData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const generatedSlug = name.toLowerCase().trim().replace(/[^a-zA-Z0-9-а-яА-Я]/g, "-").replace(/--+/g, "-");
                    setNewShopData((prev) => ({
                      ...prev,
                      name,
                      slug: prev.slug === "" ? generatedSlug : prev.slug
                    }));
                    if (createShopFieldErrors.name) setCreateShopFieldErrors(prev => ({ ...prev, name: undefined }));
                  }}
                  placeholder="Кофейня «Зерно»"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border transition-all focus:outline-none ${
                    createShopFieldErrors.name 
                      ? "border-red-300 focus:border-red-500" 
                      : "border-slate-200 focus:border-slate-900 focus:bg-white"
                  }`}
                />
                {createShopFieldErrors.name && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{createShopFieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL / Slug магазина <span className="text-red-500">*</span>
                </label>
                <div className={`flex items-center rounded-xl bg-slate-50 border overflow-hidden px-3 py-2 transition-all ${
                  createShopFieldErrors.slug ? "border-red-300" : "border-slate-200"
                }`}>
                  <span className="text-xs text-slate-400 mr-1 font-mono">/</span>
                  <input
                    type="text"
                    value={newShopData.slug}
                    onChange={(e) => {
                      setNewShopData((prev) => ({ ...prev, slug: e.target.value }));
                      if (createShopFieldErrors.slug) setCreateShopFieldErrors(prev => ({ ...prev, slug: undefined }));
                    }}
                    placeholder="coffee-zerno"
                    className="w-full bg-transparent text-xs focus:outline-none font-mono text-slate-900"
                  />
                </div>
                {createShopFieldErrors.slug && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{createShopFieldErrors.slug}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Описание
                </label>
                <textarea
                  rows={2}
                  value={newShopData.description}
                  onChange={(e) => {
                    setNewShopData((prev) => ({ ...prev, description: e.target.value }));
                    if (createShopFieldErrors.description) setCreateShopFieldErrors(prev => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Краткое описание для ваших клиентов"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border transition-all focus:outline-none ${
                    createShopFieldErrors.description ? "border-red-300" : "border-slate-200 focus:border-slate-900 focus:bg-white"
                  }`}
                />
                {createShopFieldErrors.description && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{createShopFieldErrors.description}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingShop(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка добавления услуги */}
      {isAddingService && selectedShop && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Новая услуга / товар</h3>
              <button
                type="button"
                onClick={() => setIsAddingService(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            {serviceError && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium border border-red-100 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{serviceError}</span>
              </div>
            )}

            <form onSubmit={handleAddService} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Название <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newServiceData.title}
                  onChange={(e) => {
                    setNewServiceData((prev) => ({ ...prev, title: e.target.value }));
                    if (serviceFieldErrors.title) setServiceFieldErrors(prev => ({ ...prev, title: undefined }));
                  }}
                  placeholder="Капучино 300мл"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border transition-all focus:outline-none ${
                    serviceFieldErrors.title ? "border-red-300" : "border-slate-200 focus:border-slate-900 focus:bg-white"
                  }`}
                />
                {serviceFieldErrors.title && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{serviceFieldErrors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Стоимость (рубли) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={newServiceData.price}
                  onChange={(e) => {
                    setNewServiceData((prev) => ({ ...prev, price: e.target.value }));
                    if (serviceFieldErrors.price) setServiceFieldErrors(prev => ({ ...prev, price: undefined }));
                  }}
                  placeholder="250"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border transition-all focus:outline-none font-mono ${
                    serviceFieldErrors.price ? "border-red-300" : "border-slate-200 focus:border-slate-900 focus:bg-white"
                  }`}
                />
                {serviceFieldErrors.price && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{serviceFieldErrors.price}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Категория (опционально)
                </label>
                <input
                  type="text"
                  value={newServiceData.category}
                  onChange={(e) => {
                    setNewServiceData((prev) => ({ ...prev, category: e.target.value }));
                  }}
                  placeholder="Например: Напитки, Десерты, Услуги..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border border-slate-200 focus:border-slate-900 focus:bg-white transition-all focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Описание
                </label>
                <textarea
                  rows={2}
                  value={newServiceData.description}
                  onChange={(e) => {
                    setNewServiceData((prev) => ({ ...prev, description: e.target.value }));
                    if (serviceFieldErrors.description) setServiceFieldErrors(prev => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Детали услуги или состав"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border transition-all focus:outline-none ${
                    serviceFieldErrors.description ? "border-red-300" : "border-slate-200 focus:border-slate-900 focus:bg-white"
                  }`}
                />
                {serviceFieldErrors.description && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{serviceFieldErrors.description}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingService(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка редактирования услуги */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Редактирование услуги</h3>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            {editServiceError && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium border border-red-100 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{editServiceError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditService} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Название <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editServiceData.title}
                  onChange={(e) => {
                    setEditServiceData((prev) => ({ ...prev, title: e.target.value }));
                    if (editServiceFieldErrors.title) setEditServiceFieldErrors(prev => ({ ...prev, title: undefined }));
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border transition-all focus:outline-none ${
                    editServiceFieldErrors.title ? "border-red-300" : "border-slate-200 focus:border-slate-900 focus:bg-white"
                  }`}
                />
                {editServiceFieldErrors.title && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{editServiceFieldErrors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Стоимость (рубли) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={editServiceData.price}
                  onChange={(e) => {
                    setEditServiceData((prev) => ({ ...prev, price: e.target.value }));
                    if (editServiceFieldErrors.price) setEditServiceFieldErrors(prev => ({ ...prev, price: undefined }));
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border transition-all focus:outline-none font-mono ${
                    editServiceFieldErrors.price ? "border-red-300" : "border-slate-200 focus:border-slate-900 focus:bg-white"
                  }`}
                />
                {editServiceFieldErrors.price && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{editServiceFieldErrors.price}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Категория
                </label>
                <input
                  type="text"
                  value={editServiceData.category}
                  onChange={(e) => {
                    setEditServiceData((prev) => ({ ...prev, category: e.target.value }));
                  }}
                  placeholder="Например: Напитки, Десерты..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border border-slate-200 focus:border-slate-900 focus:bg-white transition-all focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Описание
                </label>
                <textarea
                  rows={2}
                  value={editServiceData.description}
                  onChange={(e) => {
                    setEditServiceData((prev) => ({ ...prev, description: e.target.value }));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border border-slate-200 focus:border-slate-900 focus:bg-white transition-all focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditService}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs disabled:opacity-50"
                >
                  {isSavingEditService ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка инструкции для Telegram */}
      {isTgGuideOpen && selectedShop && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                🚀 Подключение «{selectedShop.name}» к Telegram
              </h3>
              <button
                type="button"
                onClick={() => setIsTgGuideOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <p className="font-bold text-slate-800">1. Откройте @BotFather в Telegram</p>
                <p className="text-slate-500">Найдите бота <strong>@BotFather</strong> и введите команду <code>/mybots</code> (выберите вашего бота).</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <p className="font-bold text-slate-800">2. Перейдите в настройки Menu Button</p>
                <p className="text-slate-500">
                  Выберите бота → <strong>Bot Settings</strong> → <strong>Menu Button</strong> → <strong>Configure menu button</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-100 space-y-2">
                <p className="font-bold text-blue-900">3. Вставьте URL Mini App:</p>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-blue-200/80 font-mono text-[11px] text-blue-800 break-all">
                  <span>{`${window.location.origin}/${selectedShop.slug}`}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyShopUrl(selectedShop.slug)}
                  className="w-full py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors text-xs flex items-center justify-center gap-1.5"
                >
                  <Copy size={14} />
                  <span>{copiedSlug === selectedShop.slug ? "Скопировано!" : "Скопировать WebApp URL"}</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsTgGuideOpen(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Модалка настроек и редактирования заведения */}
      {isSettingsOpen && selectedShop && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-900 text-white rounded-xl">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Редактирование заведения</h3>
                  <p className="text-[11px] text-slate-500">График, адрес, статус и интеграция с Telegram</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-4">
              {settingsError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{settingsError}</span>
                </div>
              )}

              {/* Переключатель статуса заведения (Открыто / Закрыто) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Прием заказов</span>
                    {settingsData.isOpen ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">Открыто</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md">Временно закрыто</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">Включите или отключите прием новых заказов покупателями</p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsData.isOpen}
                    onChange={(e) => setSettingsData({ ...settingsData, isOpen: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Название заведения */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Название заведения <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settingsData.name}
                  onChange={(e) => {
                    setSettingsData({ ...settingsData, name: e.target.value });
                    if (settingsFieldErrors.name) setSettingsFieldErrors(prev => ({ ...prev, name: undefined }));
                  }}
                  placeholder="Ресторан Кофе и Выпечка"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border transition-all focus:outline-none ${
                    settingsFieldErrors.name ? "border-red-300" : "border-slate-200 focus:border-slate-900 focus:bg-white"
                  }`}
                />
              </div>

              {/* Описание заведения */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Описание / Концепция
                </label>
                <textarea
                  rows={2}
                  value={settingsData.description}
                  onChange={(e) => setSettingsData({ ...settingsData, description: e.target.value })}
                  placeholder="Авторская кухня, свежий кофе и уютная атмосфера"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border border-slate-200 focus:border-slate-900 focus:bg-white transition-all focus:outline-none resize-none"
                />
              </div>

              {/* График работы */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  График работы
                </label>
                <input
                  type="text"
                  value={settingsData.workingHours}
                  onChange={(e) => setSettingsData({ ...settingsData, workingHours: e.target.value })}
                  placeholder="Пн-Пт: 08:00 - 22:00, Сб-Вс: 09:00 - 23:00"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border border-slate-200 focus:border-slate-900 focus:bg-white transition-all focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">Отображается клиентам в верхней части Mini App</p>
              </div>

              {/* Адрес и Телефон */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Адрес
                  </label>
                  <input
                    type="text"
                    value={settingsData.address}
                    onChange={(e) => setSettingsData({ ...settingsData, address: e.target.value })}
                    placeholder="г. Москва, ул. Арбат, д. 12"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border border-slate-200 focus:border-slate-900 focus:bg-white transition-all focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Контактный телефон
                  </label>
                  <input
                    type="text"
                    value={settingsData.phone}
                    onChange={(e) => setSettingsData({ ...settingsData, phone: e.target.value })}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border border-slate-200 focus:border-slate-900 focus:bg-white transition-all focus:outline-none"
                  />
                </div>
              </div>

              {/* Разделитель */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                  <span>Интеграция с Telegram Ботом</span>
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Telegram Bot Token
                    </label>
                    <input
                      type="text"
                      value={settingsData.botToken}
                      onChange={(e) => {
                        setSettingsData({ ...settingsData, botToken: e.target.value });
                        if (settingsFieldErrors.botToken) setSettingsFieldErrors(prev => ({ ...prev, botToken: undefined }));
                      }}
                      placeholder="123456789:AAH..."
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border font-mono transition-all focus:outline-none ${
                        settingsFieldErrors.botToken ? "border-red-300" : "border-slate-200 focus:border-slate-900 focus:bg-white"
                      }`}
                    />
                    {settingsFieldErrors.botToken ? (
                      <p className="text-[11px] text-red-500 mt-1 font-medium">{settingsFieldErrors.botToken}</p>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-1">Токен от бота @BotFather для отправки уведомлений</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ID Админского Чата
                    </label>
                    <input
                      type="text"
                      value={settingsData.adminChatId}
                      onChange={(e) => {
                        setSettingsData({ ...settingsData, adminChatId: e.target.value });
                        if (settingsFieldErrors.adminChatId) setSettingsFieldErrors(prev => ({ ...prev, adminChatId: undefined }));
                      }}
                      placeholder="12345678"
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-xs border font-mono transition-all focus:outline-none ${
                        settingsFieldErrors.adminChatId ? "border-red-300" : "border-slate-200 focus:border-slate-900 focus:bg-white"
                      }`}
                    />
                    {settingsFieldErrors.adminChatId ? (
                      <p className="text-[11px] text-red-500 mt-1 font-medium">{settingsFieldErrors.adminChatId}</p>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-1">Telegram Chat ID для получения заказов (узнать у @userinfobot)</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-xs transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isSavingSettings ? "Сохранение..." : "Сохранить изменения"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления магазина */}
      {shopToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Удаление заведения</h3>
              <button
                type="button"
                onClick={() => setShopToDelete(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Вы действительно хотите удалить магазин <strong className="text-slate-900">«{shopToDelete.name}»</strong>? Все связанные услуги и история заказов будут полностью удалены.
            </p>

            {deleteShopError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100">
                {deleteShopError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShopToDelete(null)}
                disabled={isDeletingShop}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmDeleteShop}
                disabled={isDeletingShop}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-2xs"
              >
                {isDeletingShop ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно Входа / Регистрации */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {authMode === "login" ? "Вход в аккаунт администратора" : "Регистрация администратора"}
                  </h3>
                  <p className="text-[11px] text-slate-500">Управляйте заведениями с любого устройства</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Табы режима: Вход / Регистрация */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                }}
                className={`py-2 px-3 rounded-lg text-center transition-all ${
                  authMode === "login"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Вход
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthError(null);
                }}
                className={`py-2 px-3 rounded-lg text-center transition-all ${
                  authMode === "register"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Регистрация
              </button>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-medium flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === "register" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ваше имя или название организации
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Иван Иванов"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail адрес <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="admin@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Пароль <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                  />
                </div>
                {authMode === "register" && (
                  <p className="text-[10px] text-slate-400 mt-1">Минимум 6 символов</p>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  disabled={isSubmittingAuth}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
                >
                  {isSubmittingAuth ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>{authMode === "login" ? "Войти" : "Зарегистрироваться"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Всплывающее плавающее уведомление о новом заказе */}
      {newOrderAlert && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 max-w-sm w-full animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500 text-slate-950 rounded-xl animate-bounce">
                <Bell size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-400">🔔 Новый заказ #{newOrderAlert.id.slice(-6)}!</h4>
                <p className="text-xs font-medium text-slate-200 mt-0.5">{newOrderAlert.customerName} ({newOrderAlert.customerPhone})</p>
                <p className="text-xs font-bold text-emerald-400 mt-1">{newOrderAlert.totalPrice.toLocaleString("ru-RU")} ₽</p>
              </div>
            </div>
            <button
              onClick={() => setNewOrderAlert(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <XCircle size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Модалка генератора QR-кодов и макетов столов */}
      {selectedShop && (
        <QrGeneratorModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          shopName={selectedShop.name}
          shopSlug={selectedShop.slug}
        />
      )}

      {/* Модалка выбора SaaS тарифов */}
      <PlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        currentPlan={user?.plan || "FREE"}
        token={token}
        onPlanUpdated={(newPlan) => {
          if (user) {
            user.plan = newPlan;
          }
          fetchShops();
        }}
      />
    </div>
  );
}
