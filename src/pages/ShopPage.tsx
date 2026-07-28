import React, { useEffect, useState, FormEvent } from "react";
import { useParams } from "react-router-dom";
import { Plus, Minus, X, CheckCircle, AlertCircle } from "lucide-react";
import NotFoundPage from "./NotFoundPage";

declare global {
  interface Window {
    Telegram?: any;
  }
}

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
  logoUrl: string | null;
  services: Service[];
}

export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>();
  
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  
  // Корзина: { [serviceId]: quantity }
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: ""
  });
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; general?: string }>({});
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    // Инициализация Telegram WebApp
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      if (user?.first_name) {
        setFormData(prev => ({ ...prev, name: user.first_name + (user.last_name ? ` ${user.last_name}` : '') }));
      }
    }

    const fetchShop = async () => {
      try {
        const res = await fetch(`/api/shops/${slug}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Ошибка загрузки данных заведения");
        }
        const data = await res.json();
        setShop(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchShop();
  }, [slug]);

  if (notFound) return <NotFoundPage />;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100/80 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-3 border-slate-100 border-t-slate-900 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium mt-4">Загрузка заведения...</p>
        </div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-slate-100/80 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
            <X size={24} />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">Ошибка загрузки</h2>
          <p className="text-slate-500 text-xs leading-relaxed">{error || "Не удалось найти заведение."}</p>
        </div>
      </div>
    );
  }

  const handleAddToCart = (serviceId: string) => {
    setCart(prev => ({
      ...prev,
      [serviceId]: (prev[serviceId] || 0) + 1
    }));
  };

  const handleRemoveFromCart = (serviceId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[serviceId] > 1) {
        newCart[serviceId]--;
      } else {
        delete newCart[serviceId];
      }
      return newCart;
    });
  };

  const totalItems: number = (Object.values(cart) as number[]).reduce((a, b) => a + b, 0);
  const totalPrice: number = Object.entries(cart).reduce((total: number, [id, qty]: [string, number]) => {
    const service = shop.services.find(s => s.id === id);
    return total + (service?.price || 0) * qty;
  }, 0);

  const validateForm = () => {
    const errors: { name?: string; phone?: string } = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = "Имя должно содержать минимум 2 символа";
    }

    const cleanPhone = formData.phone.trim();
    const phoneRegex = /^[\+0-9\s\-\(\)]{7,20}$/;
    if (!cleanPhone) {
      errors.phone = "Введите номер телефона";
    } else if (!phoneRegex.test(cleanPhone)) {
      errors.phone = "Некорректный номер (пример: +7 999 000-00-00)";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    const items = Object.entries(cart).map(([id, qty]: [string, number]) => {
      const service = shop.services.find(s => s.id === id);
      return {
        id,
        title: service?.title,
        price: service?.price,
        quantity: qty
      };
    });

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shop.id,
          customerName: formData.name.trim(),
          customerPhone: formData.phone.trim(),
          items,
          totalPrice
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ошибка при оформлении заказа");
      }

      setOrderSuccess(true);
      setCart({});
      
      try {
        if (window.Telegram?.WebApp?.isVersionAtLeast?.('6.1') && window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      } catch (e) {
        console.error("Haptic feedback error:", e);
      }

    } catch (err: any) {
      setFormErrors({ general: err.message || "Не удалось отправить заказ" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishOrder = () => {
    // 1. Сбрасываем состояния в React для работы в веб-браузере и превью
    setOrderSuccess(false);
    setIsCheckoutOpen(false);
    setCart({});
    
    // 2. Если мы внутри Telegram WebApp, также закрываем окно шторки
    try {
      if (window.Telegram?.WebApp?.close) {
        window.Telegram.WebApp.close();
      }
    } catch (e) {
      console.error("Telegram close error:", e);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-slate-100/80 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
            <CheckCircle size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Заказ успешно оформлен!</h2>
            <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
              Благодарим за заказ. Менеджер свяжется с вами по указанному номеру телефона для подтверждения.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFinishOrder}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-2xl transition-all shadow-md active:scale-98"
          >
            Вернуться в магазин
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 sm:py-8 sm:px-4 font-sans text-slate-800 flex flex-col items-center justify-start">
      {/* Адаптированный контейнер смартфона / карточки */}
      <div className="w-full max-w-md bg-white sm:rounded-[32px] sm:border sm:border-slate-200/80 sm:shadow-2xl overflow-hidden min-h-screen sm:min-h-[780px] relative flex flex-col justify-between">
        
        <div>
          {/* Шапка магазина */}
          <div className="bg-slate-900 text-white px-6 py-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl mb-3 flex items-center justify-center text-white font-bold text-xl border border-white/20 uppercase shadow-inner">
                {shop.name.charAt(0)}
              </div>
              <h1 className="text-lg font-bold tracking-tight">{shop.name}</h1>
              {shop.description && (
                <p className="text-slate-300 text-xs mt-1.5 leading-relaxed max-w-xs font-normal">
                  {shop.description}
                </p>
              )}
            </div>
          </div>

          {/* Список услуг */}
          <div className="p-5 space-y-3 pb-28">
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Услуги и товары</h2>
              <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                {(shop.services || []).length} позиции
              </span>
            </div>
            
            {(shop.services || []).length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-xs font-medium">Каталог услуг пока пуст</p>
              </div>
            ) : (
              (shop.services || []).map((service) => {
                const qty: number = cart[service.id] || 0;
                
                return (
                  <div 
                    key={service.id} 
                    className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center bg-white hover:border-slate-200 transition-all shadow-sm group"
                  >
                    <div className="flex-1 space-y-1 pr-4">
                      <h3 className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{service.title}</h3>
                      <p className="text-xs font-bold text-slate-900">{service.price.toLocaleString("ru-RU")} ₽</p>
                      {service.description && (
                        <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2 pt-0.5">
                          {service.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="shrink-0 flex justify-end">
                      {qty > 0 ? (
                        <div className="flex items-center gap-1.5 bg-slate-900 text-white rounded-full p-1 shadow-sm">
                          <button 
                            type="button"
                            onClick={() => handleRemoveFromCart(service.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-800 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="font-bold text-[11px] w-4 text-center">{qty}</span>
                          <button 
                            type="button"
                            onClick={() => handleAddToCart(service.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-800 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => handleAddToCart(service.id)}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-800 text-[11px] font-semibold rounded-full transition-all shadow-2xs"
                        >
                          Добавить
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Плавающая корзина внизу смартфона */}
        {totalItems > 0 && !isCheckoutOpen && (
          <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 z-20">
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-semibold tracking-wide shadow-lg flex items-center justify-between px-5 transition-all active:scale-98"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center text-xs font-bold">
                  {totalItems}
                </div>
                <span>Оформить заказ</span>
              </div>
              <span className="font-bold">{totalPrice.toLocaleString("ru-RU")} ₽</span>
            </button>
          </div>
        )}

        {/* Модалка оформления заказа */}
        {isCheckoutOpen && (
          <div className="absolute inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom duration-250">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Оформление заказа</h2>
              <button 
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Сводка заказа */}
              <div>
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Состав заказа</h3>
                <div className="space-y-2.5 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  {Object.entries(cart).map(([id, qty]: [string, number]) => {
                    const service = (shop.services || []).find(s => s.id === id);
                    if (!service) return null;
                    return (
                      <div key={id} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-semibold">{qty}x</span>
                          <span className="font-medium text-slate-800">{service.title}</span>
                        </div>
                        <span className="font-bold text-slate-900">{(service.price * qty).toLocaleString("ru-RU")} ₽</span>
                      </div>
                    );
                  })}
                  <div className="border-t border-slate-200/60 pt-3 flex justify-between items-center font-bold text-xs text-slate-900 mt-2">
                    <span>Итого:</span>
                    <span className="text-slate-900 text-sm">{totalPrice.toLocaleString("ru-RU")} ₽</span>
                  </div>
                </div>
              </div>

              {/* Поля формы с валидацией */}
              <div>
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Контактные данные</h3>
                
                {formErrors.general && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{formErrors.general}</span>
                  </div>
                )}

                <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ваше имя <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => {
                        setFormData(prev => ({ ...prev, name: e.target.value }));
                        if (formErrors.name) setFormErrors(prev => ({ ...prev, name: undefined }));
                      }}
                      placeholder="Александр"
                      className={`w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border transition-all focus:outline-none ${
                        formErrors.name 
                          ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100" 
                          : "border-slate-200 focus:border-slate-900 focus:bg-white"
                      }`}
                    />
                    {formErrors.name && (
                      <p className="text-[11px] text-red-500 mt-1 font-medium px-1">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Номер телефона <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={e => {
                        setFormData(prev => ({ ...prev, phone: e.target.value }));
                        if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: undefined }));
                      }}
                      placeholder="+7 (999) 000-00-00"
                      className={`w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border transition-all focus:outline-none ${
                        formErrors.phone 
                          ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100" 
                          : "border-slate-200 focus:border-slate-900 focus:bg-white"
                      }`}
                    />
                    {formErrors.phone && (
                      <p className="text-[11px] text-red-500 mt-1 font-medium px-1">{formErrors.phone}</p>
                    )}
                  </div>
                </form>
              </div>
            </div>
            
            <div className="p-4 bg-white border-t border-slate-100">
              <button
                form="checkout-form"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-semibold tracking-wide shadow-lg disabled:opacity-50 transition-all flex justify-center items-center active:scale-98"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  `Подтвердить заказ (${totalPrice.toLocaleString("ru-RU")} ₽)`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
