import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bot,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  UserPlus,
  Users,
  Bell,
  Sliders,
  Key,
  MessageSquare,
  ShoppingBag,
  Star,
  Clock,
  Smartphone,
  Eye,
  EyeOff,
  ChevronDown,
  Info,
  Zap,
  HelpCircle,
  Shield,
  User
} from "lucide-react";
import { Shop, TelegramSettings, TelegramSubscriber, TelegramInviteCode } from "../../types";
import { SpinnerLoader } from "../Skeleton";
import { CustomDropdown } from "../CustomDropdown";
import { CustomCheckbox } from "../CustomCheckbox";

interface AdminTelegramIntegrationTabProps {
  shop: Shop;
  showToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void;
  onShopUpdated?: (shop: Shop) => void;
  isOwner?: boolean;
}

export const AdminTelegramIntegrationTab: React.FC<AdminTelegramIntegrationTabProps> = ({
  shop,
  showToast,
  onShopUpdated,
  isOwner = true,
}) => {
  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [activeInviteLink, setActiveInviteLink] = useState<{ link: string; code: string; expiresAt: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Integration state from server
  const [statusData, setStatusData] = useState<{
    isConnected: boolean;
    botTokenMasked?: string;
    adminChatId?: string | null;
    bot?: { id: number; first_name: string; username: string };
    webhook?: { url: string; has_custom_certificate: boolean; pending_update_count: number; last_error_message?: string };
    settings?: TelegramSettings;
    shopUrl?: string;
    subscribers?: TelegramSubscriber[];
    inviteCodes?: TelegramInviteCode[];
  }>({
    isConnected: false,
  });

  const [notificationSettings, setNotificationSettings] = useState<TelegramSettings>({
    notifyOnNewOrder: true,
    notifyOnOrderStatus: true,
    notifyOnNewReview: true,
    notifyOnLowRating: true,
  });

  // Load status
  const loadStatus = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/shops/${shop.id}/telegram/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
        if (data.settings) {
          setNotificationSettings({
            notifyOnNewOrder: data.settings.notifyOnNewOrder ?? true,
            notifyOnOrderStatus: data.settings.notifyOnOrderStatus ?? true,
            notifyOnNewReview: data.settings.notifyOnNewReview ?? true,
            notifyOnLowRating: data.settings.notifyOnLowRating ?? true,
          });
        }
      }
    } catch (err) {
      console.error("Ошибка загрузки статуса Telegram:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [shop.id]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast("Скопировано в буфер обмена", "success");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Connect Bot
  const handleConnectBot = async () => {
    if (!tokenInput.trim()) {
      showToast("Введите токен Telegram-бота", "warning");
      return;
    }

    try {
      setIsConnecting(true);
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const baseUrl = window.location.origin;

      const res = await fetch(`/api/shops/${shop.id}/telegram/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          botToken: tokenInput.trim(),
          baseUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось подключить бота");
      }

      showToast(`Бот @${data.bot?.username} успешно подключен к заведению!`, "success");
      setTokenInput("");
      await loadStatus();
      if (onShopUpdated) {
        onShopUpdated({ ...shop, botToken: tokenInput.trim() });
      }
    } catch (err: any) {
      showToast(err.message || "Ошибка подключения бота", "error");
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Bot
  const handleDisconnectBot = async () => {
    if (!window.confirm("Вы действительно хотите отключить Telegram-бота от этого заведения? Уведомления и интерактивные команды перестанут поступать.")) {
      return;
    }

    try {
      setIsDisconnecting(true);
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");

      const res = await fetch(`/api/shops/${shop.id}/telegram/disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось отключить бота");
      }

      showToast("Telegram-бот успешно отключен", "info");
      await loadStatus();
      if (onShopUpdated) {
        onShopUpdated({ ...shop, botToken: null as any, adminChatId: null as any });
      }
    } catch (err: any) {
      showToast(err.message || "Ошибка отключения бота", "error");
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Send Test Notification
  const handleSendTestNotification = async () => {
    try {
      setIsTesting(true);
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");

      const res = await fetch(`/api/shops/${shop.id}/telegram/test-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось отправить тестовое уведомление");
      }

      showToast("Тестовое уведомление успешно отправлено в Telegram!", "success");
    } catch (err: any) {
      showToast(err.message || "Ошибка отправки тестового уведомления", "error");
    } finally {
      setIsTesting(false);
    }
  };

  // Save Notification Preferences
  const handleSaveSettings = async (newSettings: TelegramSettings) => {
    setNotificationSettings(newSettings);
    try {
      setIsSavingSettings(true);
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");

      const res = await fetch(`/api/shops/${shop.id}/telegram/update-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newSettings),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось сохранить настройки");
      }

      showToast("Настройки уведомлений обновлены", "success");
    } catch (err: any) {
      showToast(err.message || "Ошибка сохранения настроек", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Create Staff Invite Link
  const handleCreateInvite = async () => {
    try {
      setIsCreatingInvite(true);
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");

      const res = await fetch(`/api/shops/${shop.id}/telegram/create-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось создать приглашение");
      }

      setActiveInviteLink({
        link: data.inviteLink,
        code: data.invite.code,
        expiresAt: data.invite.expiresAt,
      });
      showToast("Инвайт-ссылка для сотрудника сгенерирована!", "success");
      await loadStatus();
    } catch (err: any) {
      showToast(err.message || "Ошибка создания приглашения", "error");
    } finally {
      setIsCreatingInvite(false);
    }
  };

  // Remove Subscriber
  const handleRemoveSubscriber = async (chatId: string) => {
    if (!window.confirm("Удалить этого сотрудника из подписчиков бота? Он перестанет получать уведомления.")) {
      return;
    }

    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`/api/shops/${shop.id}/telegram/subscribers/${chatId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось удалить подписчика");
      }

      showToast("Сотрудник отвязан от Telegram-бота", "info");
      await loadStatus();
    } catch (err: any) {
      showToast(err.message || "Ошибка удаления подписчика", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 text-app-muted font-mono text-xs">
        <SpinnerLoader size={24} />
        <span>Загрузка статуса Telegram-интеграции...</span>
      </div>
    );
  }

  const isConnected = statusData.isConnected;
  const bot = statusData.bot;
  const webhook = statusData.webhook;
  const subscribers = statusData.subscribers || [];

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* Header & Status Banner */}
      <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isConnected ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-app-surface text-app-muted border border-app-border"}`}>
              <Bot size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold font-mono text-app-primary">
                  Интеграция с Telegram Ботом
                </h3>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 size={11} /> Активен
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <AlertTriangle size={11} /> Не подключен
                  </span>
                )}
              </div>
              <p className="text-app-muted text-[11px] font-mono mt-0.5">
                Полноценное управление заведением, уведомления и заказы прямо в мессенджере
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadStatus}
              title="Обновить статус"
              className="p-2 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-app-muted hover:text-app-primary transition-all cursor-pointer"
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              onClick={() => setIsGuideOpen(!isGuideOpen)}
              className="px-3 py-2 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary font-mono text-[11px] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <HelpCircle size={14} className="text-app-muted" />
              <span>Инструкция</span>
              <ChevronDown size={12} className={`transition-transform ${isGuideOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* Step-by-Step Guide Modal/Accordion */}
        <AnimatePresence>
          {isGuideOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-app-border pt-4"
            >
              <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
                <h4 className="font-bold font-mono text-app-primary text-xs flex items-center gap-1.5">
                  <Info size={14} className="text-app-accent" />
                  Как создать и подключить Telegram-бота за 2 минуты:
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-[11px] font-mono text-app-secondary leading-relaxed">
                  <li>
                    Откройте Telegram и перейдите в официальный бот{" "}
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noreferrer"
                      className="text-app-primary underline font-semibold inline-flex items-center gap-1"
                    >
                      @BotFather <ExternalLink size={10} />
                    </a>
                  </li>
                  <li>
                    Отправьте команду <code className="bg-app-card px-1.5 py-0.5 rounded border border-app-border text-app-primary">/newbot</code>, введите отображаемое имя (например, <em>«Заказы: {shop.name}»</em>) и уникальный username с окончанием <code>_bot</code>.
                  </li>
                  <li>
                    Скопируйте выданный <strong>HTTP API Token</strong> (вида <code>123456789:ABCdefGHIjkl...</code>) и вставьте в форму ниже.
                  </li>
                  <li>
                    Нажмите <strong>«Подключить бота»</strong> — система автоматически установит Webhook и свяжет бота с вашей витриной.
                  </li>
                  <li>
                    (Опционально) В @BotFather настройте кнопку Web App: <code className="bg-app-card px-1.5 py-0.5 rounded border border-app-border text-app-primary">/mybots &gt; выберите бота &gt; Bot Settings &gt; Menu Button &gt; Configure menu button</code> и вставьте ссылку на ваш магазин: <code className="bg-app-card px-1.5 py-0.5 rounded border border-app-border text-app-primary">{statusData.shopUrl || `${window.location.origin}/${shop.slug}`}</code>.
                  </li>
                </ol>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Connection Setup / Bot Details Card */}
      {!isConnected ? (
        <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-app-border pb-3">
            <h4 className="font-bold font-mono text-app-primary text-xs uppercase tracking-wider flex items-center gap-2">
              <Key size={15} className="text-app-muted" />
              Подключение Telegram Bot Token
            </h4>
            <p className="text-app-muted text-[11px] font-mono mt-1">
              Укажите API Token созданного бота для активации всех функций
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-[11px] font-mono text-app-muted">
              API Token Telegram-бота *
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
                className="w-full bg-app-surface border border-app-border rounded-xl px-3.5 py-2.5 pr-10 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-primary transition-colors cursor-pointer"
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleConnectBot}
                disabled={isConnecting || !tokenInput.trim()}
                className="px-4 py-2.5 bg-app-primary text-app-surface font-mono text-xs font-semibold rounded-xl hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {isConnecting ? <SpinnerLoader size={13} /> : <Zap size={14} />}
                <span>Подключить бота</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-mono font-bold text-lg">
                🤖
              </div>
              <div>
                <h4 className="text-sm font-bold font-mono text-app-primary flex items-center gap-2">
                  {bot?.first_name || "Telegram Бот"}
                  {bot?.username && (
                    <a
                      href={`https://t.me/${bot.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-app-muted hover:text-app-primary text-xs font-normal underline flex items-center gap-0.5"
                    >
                      @{bot.username} <ExternalLink size={11} />
                    </a>
                  )}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-mono text-app-muted">
                  <span>ID: <strong className="text-app-primary">{bot?.id}</strong></span>
                  <span>•</span>
                  <span>Токен: <code className="bg-app-surface px-1 py-0.5 rounded border border-app-border text-app-primary">{statusData.botTokenMasked}</code></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendTestNotification}
                disabled={isTesting}
                className="px-3 py-2 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary font-mono text-[11px] font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isTesting ? <SpinnerLoader size={12} /> : <Send size={13} className="text-app-muted" />}
                <span>Тест уведомлений</span>
              </button>

              {isOwner && (
                <button
                  type="button"
                  onClick={handleDisconnectBot}
                  disabled={isDisconnecting}
                  className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 font-mono text-[11px] font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDisconnecting ? <SpinnerLoader size={12} /> : <Trash2 size={13} />}
                  <span>Отключить</span>
                </button>
              )}
            </div>
          </div>

          {/* Webhook Status Info */}
          {webhook && (
            <div className="bg-app-surface border border-app-border rounded-xl p-3.5 text-[11px] font-mono space-y-1.5">
              <div className="flex items-center justify-between text-app-muted">
                <span className="flex items-center gap-1.5 font-medium text-app-primary">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  Состояние Telegram Webhook
                </span>
                <span className="text-emerald-500 font-bold">Активен (HTTPS)</span>
              </div>
              <p className="text-app-secondary truncate">
                URL: <code className="text-app-primary">{webhook.url}</code>
              </p>
              {webhook.last_error_message && (
                <p className="text-rose-500 flex items-center gap-1">
                  <AlertTriangle size={12} /> Ошибка доставки: {webhook.last_error_message}
                </p>
              )}
            </div>
          )}

          {/* Mini App Quick Link */}
          {bot?.username && (
            <div className="bg-app-surface border border-app-border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] font-mono">
              <div className="flex items-center gap-2.5">
                <Smartphone size={16} className="text-app-muted" />
                <div>
                  <span className="font-bold text-app-primary block">Прямая ссылка для клиентов (Telegram Mini App):</span>
                  <span className="text-app-muted">{`https://t.me/${bot.username}?start=app`}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(`https://t.me/${bot.username}?start=app`, "miniapp")}
                className="px-2.5 py-1.5 bg-app-card hover:bg-app-hover border border-app-border rounded-lg text-app-primary transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                {copiedKey === "miniapp" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>Скопировать ссылку</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notification Categories Settings */}
      {isConnected && (
        <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-app-border pb-3">
            <h4 className="font-bold font-mono text-app-primary text-xs uppercase tracking-wider flex items-center gap-2">
              <Bell size={15} className="text-app-muted" />
              Категории Telegram-уведомлений
            </h4>
            <p className="text-app-muted text-[11px] font-mono mt-1">
              Выберите, какие события должны мгновенно отправляться в чат с ботом
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* New Orders */}
            <div
              onClick={() =>
                handleSaveSettings({
                  ...notificationSettings,
                  notifyOnNewOrder: !(notificationSettings.notifyOnNewOrder ?? true),
                })
              }
              className={`p-3.5 bg-app-surface border rounded-xl flex items-center justify-between gap-3 cursor-pointer select-none transition-all duration-150 ${
                (notificationSettings.notifyOnNewOrder ?? true)
                  ? "border-app-border hover:border-app-primary/40 hover:bg-app-hover"
                  : "border-app-border/60 opacity-60 hover:opacity-90 hover:bg-app-hover"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <ShoppingBag size={16} />
                </div>
                <div className="min-w-0">
                  <span className="font-bold font-mono text-app-primary block text-xs truncate">Новые заказы</span>
                  <span className="text-[10px] font-mono text-app-muted truncate block">Состав, сумма, адрес и клиент</span>
                </div>
              </div>
              <CustomCheckbox
                checked={notificationSettings.notifyOnNewOrder ?? true}
                onChange={(checked) =>
                  handleSaveSettings({
                    ...notificationSettings,
                    notifyOnNewOrder: checked,
                  })
                }
                size="md"
              />
            </div>

            {/* Order Status Changes */}
            <div
              onClick={() =>
                handleSaveSettings({
                  ...notificationSettings,
                  notifyOnOrderStatus: !(notificationSettings.notifyOnOrderStatus ?? true),
                })
              }
              className={`p-3.5 bg-app-surface border rounded-xl flex items-center justify-between gap-3 cursor-pointer select-none transition-all duration-150 ${
                (notificationSettings.notifyOnOrderStatus ?? true)
                  ? "border-app-border hover:border-app-primary/40 hover:bg-app-hover"
                  : "border-app-border/60 opacity-60 hover:opacity-90 hover:bg-app-hover"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <Clock size={16} />
                </div>
                <div className="min-w-0">
                  <span className="font-bold font-mono text-app-primary block text-xs truncate">Смена статуса заказов</span>
                  <span className="text-[10px] font-mono text-app-muted truncate block">Принят, в работе, завершён</span>
                </div>
              </div>
              <CustomCheckbox
                checked={notificationSettings.notifyOnOrderStatus ?? true}
                onChange={(checked) =>
                  handleSaveSettings({
                    ...notificationSettings,
                    notifyOnOrderStatus: checked,
                  })
                }
                size="md"
              />
            </div>

            {/* New Reviews */}
            <div
              onClick={() =>
                handleSaveSettings({
                  ...notificationSettings,
                  notifyOnNewReview: !(notificationSettings.notifyOnNewReview ?? true),
                })
              }
              className={`p-3.5 bg-app-surface border rounded-xl flex items-center justify-between gap-3 cursor-pointer select-none transition-all duration-150 ${
                (notificationSettings.notifyOnNewReview ?? true)
                  ? "border-app-border hover:border-app-primary/40 hover:bg-app-hover"
                  : "border-app-border/60 opacity-60 hover:opacity-90 hover:bg-app-hover"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Star size={16} />
                </div>
                <div className="min-w-0">
                  <span className="font-bold font-mono text-app-primary block text-xs truncate">Новые отзывы и оценки</span>
                  <span className="text-[10px] font-mono text-app-muted truncate block">Оценка со звёздами и комментарий</span>
                </div>
              </div>
              <CustomCheckbox
                checked={notificationSettings.notifyOnNewReview ?? true}
                onChange={(checked) =>
                  handleSaveSettings({
                    ...notificationSettings,
                    notifyOnNewReview: checked,
                  })
                }
                size="md"
              />
            </div>

            {/* Low Ratings Alert */}
            <div
              onClick={() =>
                handleSaveSettings({
                  ...notificationSettings,
                  notifyOnLowRating: !(notificationSettings.notifyOnLowRating ?? true),
                })
              }
              className={`p-3.5 bg-app-surface border rounded-xl flex items-center justify-between gap-3 cursor-pointer select-none transition-all duration-150 ${
                (notificationSettings.notifyOnLowRating ?? true)
                  ? "border-app-border hover:border-app-primary/40 hover:bg-app-hover"
                  : "border-app-border/60 opacity-60 hover:opacity-90 hover:bg-app-hover"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} />
                </div>
                <div className="min-w-0">
                  <span className="font-bold font-mono text-app-primary block text-xs truncate">Низкие оценки (1-2 ⭐)</span>
                  <span className="text-[10px] font-mono text-app-muted truncate block">Приоритетные алерты для быстрой реакции</span>
                </div>
              </div>
              <CustomCheckbox
                checked={notificationSettings.notifyOnLowRating ?? true}
                onChange={(checked) =>
                  handleSaveSettings({
                    ...notificationSettings,
                    notifyOnLowRating: checked,
                  })
                }
                size="md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Team / Staff Subscribers & Invite Generator */}
      {isConnected && (
        <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-4">
            <div>
              <h4 className="font-bold font-mono text-app-primary text-xs uppercase tracking-wider flex items-center gap-2">
                <Users size={15} className="text-app-muted" />
                Команда в Telegram ({subscribers.length})
              </h4>
              <p className="text-app-muted text-[11px] font-mono mt-1">
                Подключите администраторов и сотрудников для совместной обработки заказов
              </p>
            </div>

            <div className="flex items-center gap-2">
              <CustomDropdown<"STAFF" | "ADMIN">
                value={inviteRole}
                onChange={(newRole) => setInviteRole(newRole)}
                options={[
                  {
                    value: "STAFF",
                    label: "Роль: Сотрудник",
                    description: "Просмотр и смена статусов заказов",
                    icon: <User size={14} />,
                    badge: "Базовый",
                  },
                  {
                    value: "ADMIN",
                    label: "Роль: Менеджер / Админ",
                    description: "Полный доступ, модерация отзывов, рассылки",
                    icon: <Shield size={14} />,
                    badge: "Полный",
                    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
                  },
                ]}
                align="right"
                size="sm"
                minMenuWidth="min-w-[240px]"
                buttonClassName="bg-app-surface text-[11px] py-2 px-3 border-app-border"
              />

              <button
                type="button"
                onClick={handleCreateInvite}
                disabled={isCreatingInvite}
                className="px-3.5 py-2 bg-app-primary text-app-surface font-mono text-xs font-semibold rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm shrink-0"
              >
                {isCreatingInvite ? <SpinnerLoader size={12} /> : <UserPlus size={13} />}
                <span>Создать инвайт</span>
              </button>
            </div>
          </div>

          {/* Display Generated Invite Link */}
          {activeInviteLink && (
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2 text-[11px] font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-500 flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  Пригласительная ссылка готова (действует 48 ч):
                </span>
                <span className="text-app-muted text-[10px]">Код: {activeInviteLink.code}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={activeInviteLink.link}
                  className="w-full bg-app-card border border-emerald-500/30 rounded-lg px-3 py-1.5 text-app-primary text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(activeInviteLink.link, "invite")}
                  className="px-3 py-1.5 bg-emerald-500 text-white font-semibold rounded-lg hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copiedKey === "invite" ? <Check size={12} /> : <Copy size={12} />}
                  <span>Копировать</span>
                </button>
              </div>
              <p className="text-app-muted text-[10px]">
                Передайте эту ссылку сотруднику. При переходе бот автоматически привяжет его Telegram-аккаунт.
              </p>
            </div>
          )}

          {/* Subscribers List */}
          {subscribers.length === 0 ? (
            <div className="p-6 bg-app-surface border border-app-border rounded-xl text-center space-y-2 text-app-muted font-mono">
              <Users size={24} className="mx-auto opacity-40" />
              <p className="text-xs">Пока нет привязанных сотрудников в Telegram</p>
              <p className="text-[11px] text-app-secondary">
                Отправьте команду <code>/start</code> боту или создайте инвайт-ссылку выше
              </p>
            </div>
          ) : (
            <div className="divide-y divide-app-border border border-app-border rounded-xl overflow-hidden bg-app-surface">
              {subscribers.map((sub) => (
                <div key={sub.chatId} className="p-3.5 flex items-center justify-between gap-3 hover:bg-app-card transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-app-card border border-app-border flex items-center justify-center font-mono font-bold text-xs text-app-primary">
                      {sub.firstName?.[0] || "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-app-primary text-xs">
                          {sub.firstName} {sub.lastName || ""}
                        </span>
                        {sub.username && (
                          <span className="text-app-muted text-[11px] font-mono">@{sub.username}</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${sub.role === "OWNER" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : sub.role === "ADMIN" ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" : "bg-app-card text-app-muted border border-app-border"}`}>
                          {sub.role === "OWNER" ? "Владелец" : sub.role === "ADMIN" ? "Администратор" : "Сотрудник"}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-app-muted mt-0.5">
                        Chat ID: <code>{sub.chatId}</code> • Добавлен: {new Date(sub.joinedAt).toLocaleDateString("ru-RU")}
                      </div>
                    </div>
                  </div>

                  {isOwner && sub.role !== "OWNER" && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSubscriber(sub.chatId)}
                      title="Удалить сотрудника"
                      className="p-1.5 text-app-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
