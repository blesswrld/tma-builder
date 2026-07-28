import { useEffect, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, ExternalLink, Store, ShoppingBag, Check, Copy, Settings, AlertCircle } from "lucide-react";

interface Service {
  id: string;
  title: string;
  price: number;
  description: string | null;
}

interface Shop {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  botToken?: string | null;
  adminChatId?: string | null;
  services: Service[];
  _count?: {
    orders: number;
  };
}

export default function AdminPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Форма создания магазина
  const [isCreatingShop, setIsCreatingShop] = useState(false);
  const [newShopData, setNewShopData] = useState({ name: "", slug: "", description: "" });
  const [createShopError, setCreateShopError] = useState<string | null>(null);
  const [createShopFieldErrors, setCreateShopFieldErrors] = useState<{ name?: string; slug?: string; description?: string }>({});

  // Форма добавления услуги
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceData, setNewServiceData] = useState({ title: "", price: "", description: "" });
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceFieldErrors, setServiceFieldErrors] = useState<{ title?: string; price?: string; description?: string }>({});

  // Инструкция Telegram
  const [isTgGuideOpen, setIsTgGuideOpen] = useState(false);

  // Настройки магазина
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsData, setSettingsData] = useState({ botToken: "", adminChatId: "" });
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsFieldErrors, setSettingsFieldErrors] = useState<{ botToken?: string; adminChatId?: string }>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Подтверждение и состояние удаления магазина
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);
  const [isDeletingShop, setIsDeletingShop] = useState(false);
  const [deleteShopError, setDeleteShopError] = useState<string | null>(null);

  const fetchShops = async () => {
    try {
      const res = await fetch("/api/shops");
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
      const data = await res.json();
      setShops(data);

      setSelectedShop(prev => {
        if (prev) {
          const updated = data.find((s: Shop) => s.id === prev.id);
          return updated || (data.length > 0 ? data[0] : null);
        }
        return data.length > 0 ? data[0] : null;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

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
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(targetUrl, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      console.log(`[DEBUG] Delete request response status: ${res.status}`, data);

      if (!res.ok) {
        throw new Error(data.error || `Не удалось удалить магазин (Код ошибки: ${res.status})`);
      }

      console.log(`[DEBUG] Shop "${shopToDelete.name}" (ID: ${shopToDelete.id}) successfully deleted.`);
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
      const res = await fetch(`/api/shops/${selectedShop.id}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newServiceData.title.trim(),
          price: Number(newServiceData.price),
          description: newServiceData.description.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось добавить услугу");

      setNewServiceData({ title: "", price: "", description: "" });
      setServiceFieldErrors({});
      setIsAddingService(false);
      await fetchShops();
    } catch (err: any) {
      setServiceError(err.message);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      const res = await fetch(`/api/services/${serviceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Не удалось удалить услугу");
      await fetchShops();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const validateSettings = () => {
    const errors: { botToken?: string; adminChatId?: string } = {};

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
      const res = await fetch(`/api/shops/${selectedShop.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedShop.name,
          description: selectedShop.description,
          botToken: settingsData.botToken.trim() || null,
          adminChatId: settingsData.adminChatId.trim() || null
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

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg text-xs text-slate-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>База данных PostgreSQL</span>
            </div>
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
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Ваши заведения ({shops.length})
                </span>
              </div>

              {shops.length === 0 ? (
                <div className="text-center py-6 px-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 mb-3">У вас пока нет созданных магазинов</p>
                  <button
                    onClick={() => setIsCreatingShop(true)}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    + Создать первый магазин
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {shops.map((shop) => {
                    const isSelected = selectedShop?.id === shop.id;
                    return (
                      <button
                        key={shop.id}
                        onClick={() => setSelectedShop(shop)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 ${
                          isSelected
                            ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                            : "bg-slate-50/50 border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 uppercase ${
                          isSelected ? "bg-white/15 text-white" : "bg-slate-200/80 text-slate-700"
                        }`}>
                          {shop.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden flex-1">
                          <p className={`text-xs font-semibold truncate ${isSelected ? "text-white" : "text-slate-900"}`}>
                            {shop.name}
                          </p>
                          <p className={`text-[11px] truncate ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                            /{shop.slug}
                          </p>
                        </div>
                      </button>
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
                {/* Карточка заведения */}
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
                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 font-medium">
                        <span>Услуг: <strong className="text-slate-700">{(selectedShop.services || []).length}</strong></span>
                        <span>•</span>
                        <span>Всего заказов: <strong className="text-slate-700">{selectedShop._count?.orders || 0}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
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
                        onClick={() => {
                          setSettingsData({
                            botToken: selectedShop.botToken || "",
                            adminChatId: selectedShop.adminChatId || ""
                          });
                          setSettingsFieldErrors({});
                          setSettingsError(null);
                          setIsSettingsOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                        title="Настройки заведения"
                      >
                        <Settings size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteConfirmation(selectedShop)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                        title="Удалить заведение"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Секция услуг + предпросмотр */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  {/* Таблица услуг */}
                  <div className="xl:col-span-8 space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <h3 className="text-sm font-bold text-slate-900">
                        Список услуг и товаров ({(selectedShop.services || []).length})
                      </h3>
                      <button
                        onClick={() => {
                          setNewServiceData({ title: "", price: "", description: "" });
                          setServiceFieldErrors({});
                          setServiceError(null);
                          setIsAddingService(true);
                        }}
                        className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-2xs"
                      >
                        <Plus size={15} />
                        <span>Добавить услугу</span>
                      </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
                      {(selectedShop.services || []).length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                          <ShoppingBag size={36} className="mx-auto mb-3 opacity-30" />
                          <p className="font-semibold text-xs text-slate-700">В магазине пока нет услуг</p>
                          <p className="text-[11px] text-slate-400 mt-1">Нажмите «Добавить услугу», чтобы наполнить каталог</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/60">
                              <tr>
                                <th className="px-5 py-3">Услуга / Товар</th>
                                <th className="px-5 py-3">Цена</th>
                                <th className="px-5 py-3 text-right">Действия</th>
                              </tr>
                            </thead>
                            <tbody className="text-xs divide-y divide-slate-100">
                              {(selectedShop.services || []).map((service) => (
                                <tr key={service.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-5 py-3.5">
                                    <p className="font-semibold text-slate-900">{service.title}</p>
                                    {service.description && (
                                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{service.description}</p>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5 font-bold text-slate-900">
                                    {service.price.toLocaleString("ru-RU")} ₽
                                  </td>
                                  <td className="px-5 py-3.5 text-right">
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

      {/* Модалка настроек магазина */}
      {isSettingsOpen && selectedShop && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Настройки интеграции Telegram</h3>
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
                  <p className="text-[11px] text-slate-400 mt-1">Токен от бота @BotFather</p>
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
                  <p className="text-[11px] text-slate-400 mt-1">Telegram Chat ID для заказов (узнать у @userinfobot)</p>
                )}
              </div>

              <div className="pt-2 flex gap-3">
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
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  {isSavingSettings ? "Сохранение..." : "Сохранить"}
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
    </div>
  );
}
