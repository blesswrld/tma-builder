import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  X,
  Lock,
  FileText,
  Eye,
  Database,
  UserCheck,
  Cookie,
  Mail,
  CheckCircle2,
  Copy,
  ChevronRight,
  ChevronLeft,
  Server,
  Key,
  Search,
  Printer,
  FileCheck2,
  Layers,
  Globe2,
  Clock,
  Receipt,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Building,
  Phone,
  Scale
} from "lucide-react";
import { useScrollLock } from "../hooks/useScrollLock";

export type LegalDocType = 
  | "privacy"
  | "terms"
  | "consent_pd"
  | "consent_ads"
  | "refunds"
  | "cookies"
  | "requisites";

export interface LegalCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName?: string;
  shopSlug?: string;
  source?: "admin" | "shop";
  initialDoc?: LegalDocType;
  shopData?: {
    legalName?: string;
    inn?: string;
    ogrn?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

export const LegalCenterModal: React.FC<LegalCenterModalProps> = ({
  isOpen,
  onClose,
  shopName = "Сервис TMA Builder",
  shopSlug,
  source = "shop",
  initialDoc = "privacy",
  shopData
}) => {
  useScrollLock(isOpen);
  const [activeDoc, setActiveDoc] = useState<LegalDocType>(initialDoc);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveDoc(initialDoc);
    }
  }, [isOpen, initialDoc]);

  const effectiveShopName自我 = shopName?.trim() || "TMA Builder";
  const legalName = shopData?.legalName || `ИП / Организация сервиса «${effectiveShopName自我}»`;
  const inn = shopData?.inn || "770000000000";
  const ogrn = shopData?.ogrn || "320000000000000";
  const address = shopData?.address || "Российская Федерация";
  const phone = shopData?.phone || "+7 (800) 000-00-00";
  const email = shopData?.email || "privacy@tma-builder.ru";
  const updateDate = "30.08.2026";

  const docs = useMemo(() => [
    {
      id: "privacy" as LegalDocType,
      title: "Политика конфиденциальности",
      subtitle: "152-ФЗ «О персональных данных»",
      icon: ShieldCheck,
      badge: "152-ФЗ РФ",
    },
    {
      id: "terms" as LegalDocType,
      title: "Пользовательское соглашение и оферта",
      subtitle: "ст. 437 ГК РФ, ЗоЗПП",
      icon: FileText,
      badge: "ГК РФ",
    },
    {
      id: "consent_pd" as LegalDocType,
      title: "Согласие на обработку ПДн",
      subtitle: "ст. 9 ФЗ № 152-ФЗ",
      icon: UserCheck,
      badge: "ст. 9 ФЗ-152",
    },
    {
      id: "consent_ads" as LegalDocType,
      title: "Согласие на рекламные рассылки",
      subtitle: "ст. 18 ФЗ № 38-ФЗ «О рекламе»",
      icon: Mail,
      badge: "38-ФЗ",
    },
    {
      id: "refunds" as LegalDocType,
      title: "Правила возврата и отмены",
      subtitle: "ст. 26.1 Закона о защите прав потребителей",
      icon: RotateCcw,
      badge: "ЗоЗПП РФ",
    },
    {
      id: "cookies" as LegalDocType,
      title: "Политика файлов Cookie",
      subtitle: "Регламент сбора технических данных",
      icon: Cookie,
      badge: "Cookies",
    },
    {
      id: "requisites" as LegalDocType,
      title: "Реквизиты и онлайн-чеки (54-ФЗ)",
      subtitle: "Сведения об операторе и фискализации",
      icon: Building,
      badge: "54-ФЗ",
    },
  ], []);

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}${shopSlug ? `/${shopSlug}` : ""}#legal-${activeDoc}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="legal-modal-container" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden font-sans">
          <motion.div
            key="legal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
          />

          <motion.div
            key="legal-window"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="w-full max-w-5xl h-[92vh] max-h-[850px] bg-app-modal border border-app-border rounded-3xl overflow-hidden shadow-2xl relative z-50 flex flex-col text-app-primary"
          >
            {/* Header */}
            <div className="h-16 px-5 sm:px-6 border-b border-app-border bg-app-modal-header flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Scale size={20} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-app-primary flex items-center gap-2">
                    <span>Правовой центр и соответствие законодательству РФ</span>
                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-semibold">
                      152-ФЗ / 54-ФЗ / 38-ФЗ
                    </span>
                  </h2>
                  <p className="text-[11px] text-app-muted font-mono truncate">
                    {effectiveShopName自我} • Редакция от {updateDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2 rounded-xl bg-app-surface border border-app-border hover:bg-app-hover text-app-muted hover:text-app-primary transition-colors text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                  title="Скопировать ссылку на документ"
                >
                  <Copy size={14} />
                  <span className="hidden md:inline">{copiedLink ? "Скопировано!" : "Копировать ссылку"}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-2 rounded-xl bg-app-surface border border-app-border hover:bg-app-hover text-app-muted hover:text-app-primary transition-colors cursor-pointer"
                  title="Распечатать документ"
                >
                  <Printer size={15} />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-app-surface border border-app-border hover:bg-app-hover text-app-muted hover:text-app-primary transition-colors cursor-pointer ml-1"
                  title="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content Body: Left Nav + Right Document */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Navigation */}
              <div className="w-full md:w-72 bg-app-bg/60 border-b md:border-b-0 md:border-r border-app-border p-3 overflow-x-auto md:overflow-y-auto shrink-0 flex md:flex-col gap-1.5 scrollbar-none">
                {docs.map((doc) => {
                  const Icon = doc.icon;
                  const isActive提高 = activeDoc === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setActiveDoc(doc.id);
                        contentContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`w-full text-left p-2.5 sm:p-3 rounded-2xl transition-all flex items-center gap-3 cursor-pointer shrink-0 md:shrink border ${
                        isActive提高
                          ? "bg-app-card border-app-border text-app-primary shadow-sm ring-1 ring-emerald-500/20"
                          : "border-transparent text-app-muted hover:text-app-primary hover:bg-app-card/40"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        isActive提高
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-app-surface text-app-muted border-app-border"
                      }`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold truncate block">
                            {doc.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-app-muted font-mono block truncate">
                          {doc.subtitle}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {/* РФ Compliance badge box */}
                <div className="hidden md:block mt-auto pt-3 border-t border-app-border/60 p-3 bg-app-surface/40 rounded-2xl text-[11px] space-y-1.5 font-mono text-app-muted">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <ShieldCheck size={14} />
                    <span>Защита данных РФ</span>
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    Базы данных и сервера авторизации размещены на территории Российской Федерации в соответствии с ч. 5 ст. 18 ФЗ № 152-ФЗ.
                  </p>
                </div>
              </div>

              {/* Right Document Display */}
              <div ref={contentContainerRef} className="flex-1 p-5 sm:p-8 overflow-y-auto space-y-6 text-app-secondary leading-relaxed font-sans scrollbar-thin">
                
                {/* 1. ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ (152-ФЗ) */}
                {activeDoc === "privacy" && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-app-border pb-4 space-y-1">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold block">
                        Федеральный закон № 152-ФЗ • Редакция от {updateDate}
                      </span>
                      <h1 className="text-xl sm:text-2xl font-bold text-app-primary">
                        Политика конфиденциальности и обработки персональных данных
                      </h1>
                      <p className="text-xs text-app-muted font-mono">
                        Оператор: {legalName} • Сервис: {effectiveShopName自我}
                      </p>
                    </div>

                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
                      <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1 text-app-primary">
                        <strong className="block font-mono">Соблюдение ч. 5 ст. 18 и ст. 18.1 ФЗ № 152-ФЗ РФ</strong>
                        <p className="text-app-muted leading-relaxed">
                          Настоящая Политика регламентирует порядок сбора, записи, систематизации, накопления, хранения, уточнения, извлечения, использования, передачи, обезличивания, блокирования и уничтожения персональных данных пользователей на территории РФ.
                        </p>
                      </div>
                    </div>

                    <section className="space-y-3">
                      <h3 className="text-sm font-bold text-app-primary font-mono uppercase tracking-wider">
                        1. Общие положения
                      </h3>
                      <p className="text-xs leading-relaxed">
                        1.1. Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты информации о физических лицах (далее — «Пользователи»), пользующихся услугами сервиса <strong>{effectiveShopName自我}</strong> и связанного Telegram Mini App.
                      </p>
                      <p className="text-xs leading-relaxed">
                        1.2. Оператором персональных данных является <strong>{legalName}</strong> (ИНН: {inn}, ОГРН/ОГРНИП: {ogrn}).
                      </p>
                      <p className="text-xs leading-relaxed">
                        1.3. Обработка персональных данных осуществляется с соблюдением принципов законности, справедливости, конфиденциальности и защиты прав субъектов персональных данных.
                      </p>
                    </section>

                    <section className="space-y-3">
                      <h3 className="text-sm font-bold text-app-primary font-mono uppercase tracking-wider">
                        2. Категории обрабатываемых данных
                      </h3>
                      <p className="text-xs leading-relaxed">
                        Оператор обрабатывает исключительно данные, необходимые для качественного исполнения обязательств:
                      </p>
                      <ul className="list-disc pl-5 text-xs space-y-1.5 text-app-muted">
                        <li><strong>Идентификационные данные:</strong> Имя (ФИО), контактный номер телефона, Telegram Username и числовой Telegram User ID;</li>
                        <li><strong>Данные для исполнения заказов:</strong> адрес доставки, состав корзины, комментарии к блюдам/услугам, примененные скидки и бонусы;</li>
                        <li><strong>Данные учетной записи администратора:</strong> адрес электронной почты, криптографический хеш пароля (bcrypt), название заведения;</li>
                        <li><strong>Технические сведения:</strong> IP-адрес, файлы cookies, тип браузера и операционной системы.</li>
                      </ul>
                    </section>

                    <section className="space-y-3">
                      <h3 className="text-sm font-bold text-app-primary font-mono uppercase tracking-wider">
                        3. Цели и правовые основания обработки (ст. 6 ФЗ-152)
                      </h3>
                      <p className="text-xs leading-relaxed">
                        Обработка данных производится на основании согласия Пользователя, а также для:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <div className="p-3 bg-app-surface border border-app-border rounded-xl text-xs space-y-1">
                          <span className="font-bold text-app-primary font-mono block">Исполнение заказов</span>
                          <span className="text-app-muted">Передача заказа на кухню, комплектацию и курьерскую доставку.</span>
                        </div>
                        <div className="p-3 bg-app-surface border border-app-border rounded-xl text-xs space-y-1">
                          <span className="font-bold text-app-primary font-mono block">Сервисные уведомления</span>
                          <span className="text-app-muted">Оповещение о статусе готовности и доставки в Telegram / SMS.</span>
                        </div>
                        <div className="p-3 bg-app-surface border border-app-border rounded-xl text-xs space-y-1">
                          <span className="font-bold text-app-primary font-mono block">Программа лояльности</span>
                          <span className="text-app-muted">Начисление и списание бонусных рублей и персональных промокодов.</span>
                        </div>
                        <div className="p-3 bg-app-surface border border-app-border rounded-xl text-xs space-y-1">
                          <span className="font-bold text-app-primary font-mono block">Безопасность (149-ФЗ)</span>
                          <span className="text-app-muted">Защита от мошеннических действий, спама и несанкционированного доступа.</span>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-3">
                      <h3 className="text-sm font-bold text-app-primary font-mono uppercase tracking-wider">
                        4. Место хранения и локализация данных (ч. 5 ст. 18 ФЗ-152)
                      </h3>
                      <p className="text-xs leading-relaxed">
                        В соответствии с требованиями Федерального закона № 152-ФЗ, при сборе персональных данных Оператор обеспечивает запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение персональных данных граждан Российской Федерации с использованием баз данных, находящихся на территории РФ.
                      </p>
                    </section>

                    <section className="space-y-3">
                      <h3 className="text-sm font-bold text-app-primary font-mono uppercase tracking-wider">
                        5. Права субъекта и порядок отзыва согласия (ст. 14, ст. 21 ФЗ-152)
                      </h3>
                      <p className="text-xs leading-relaxed">
                        Пользователь имеет право в любой момент:
                      </p>
                      <ul className="list-disc pl-5 text-xs space-y-1 text-app-muted">
                        <li>Получить сведения об обработке его персональных данных;</li>
                        <li>Потребовать уточнения, блокирования или уничтожения данных;</li>
                        <li>Отозвать согласие на обработку, направив заявление на email: <strong className="text-app-primary">{email}</strong> или через кнопку удаления данных в профиле.</li>
                      </ul>
                    </section>
                  </div>
                )}

                {/* 2. ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ И ПУБЛИЧНАЯ ОФЕРТА */}
                {activeDoc === "terms" && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-app-border pb-4 space-y-1">
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold block">
                        Статьи 435, 437, 438 ГК РФ • ЗоЗПП РФ
                      </span>
                      <h1 className="text-xl sm:text-2xl font-bold text-app-primary">
                        Пользовательское соглашение и Публичная оферта
                      </h1>
                      <p className="text-xs text-app-muted font-mono">
                        Публичное предложение о заключении договора дистанционной купли-продажи и использования сервиса
                      </p>
                    </div>

                    <section className="space-y-3">
                      <h3 className="text-sm font-bold text-app-primary font-mono uppercase tracking-wider">
                        1. Предмет соглашения
                      </h3>
                      <p className="text-xs leading-relaxed">
                        1.1. Настоящий документ является официальным публичным предложением (Публичной офертой в соответствии со ст. 437 Гражданского кодекса РФ) <strong>{legalName}</strong> заключить договор на условиях, изложенных в настоящем Соглашении.
                      </p>
                      <p className="text-xs leading-relaxed">
                        1.2. Акцептом настоящей оферты (ст. 438 ГК РФ) признается совершение Пользователем любого из следующих действий: регистрация в сервисе, подтверждение кода авторизации, оформление заказа или нажатие кнопки «Подтвердить заказ» / «Оплатить».
                      </p>
                    </section>

                    <section className="space-y-3">
                      <h3 className="text-sm font-bold text-app-primary font-mono uppercase tracking-wider">
                        2. Порядок оформления и исполнения заказов
                      </h3>
                      <p className="text-xs leading-relaxed">
                        2.1. Покупатель самостоятельно выбирает товары/услуги в каталоге, указывает способ получения (доставка курьером, самовывоз, доставка почтой/СДЭК) и подтверждает заказ.
                      </p>
                      <p className="text-xs leading-relaxed">
                        2.2. Заведение обязуется приготовить блюда или укомплектовать товары в соответствии со стандартами качества и санитарными нормами РФ (СанПиН).
                      </p>
                    </section>

                    <section className="space-y-3">
                      <h3 className="text-sm font-bold text-app-primary font-mono uppercase tracking-wider">
                        3. Оплата и фискализация (54-ФЗ)
                      </h3>
                      <p className="text-xs leading-relaxed">
                        3.1. Цены на все позиции в каталоге указаны в валюте Российской Федерации (рубли РФ) и включают все применимые налоги.
                      </p>
                      <p className="text-xs leading-relaxed">
                        3.2. При онлайн-оплате или безналичном расчете Покупателю формируется и направляется электронный кассовый чек в соответствии с требованиями Федерального закона № 54-ФЗ.
                      </p>
                    </section>

                    <section className="space-y-3">
                      <h3 className="text-sm font-bold text-app-primary font-mono uppercase tracking-wider">
                        4. Ограничения и запреты (15-ФЗ, 171-ФЗ, 436-ФЗ)
                      </h3>
                      <p className="text-xs leading-relaxed">
                        4.1. Дистанционная продажа табачной, никотинсодержащей продукции и алкогольных напитков не осуществляется в строгом соответствии с нормами действующего законодательства РФ. Позиции 18+ доступны исключительно для ознакомления и заказа непосредственно в зале заведения при предъявлении документа, удостоверяющего личность.
                      </p>
                    </section>
                  </div>
                )}

                {/* 3. СОГЛАСИЕ НА ОБРАБОТКУ ПДН (ст. 9 ФЗ-152) */}
                {activeDoc === "consent_pd" && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-app-border pb-4 space-y-1">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold block">
                        Статья 9 Федерального закона № 152-ФЗ
                      </span>
                      <h1 className="text-xl sm:text-2xl font-bold text-app-primary">
                        Согласие на обработку персональных данных
                      </h1>
                      <p className="text-xs text-app-muted font-mono">
                        Информированное, сознательное и конкретное согласие субъекта персональных данных
                      </p>
                    </div>

                    <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-3 text-xs">
                      <p>
                        Я, субъект персональных данных, регистрируясь на сайте / в приложении или оформляя заказ в <strong>{effectiveShopName自我}</strong>, свободно, своей волей и в своем интересе даю конкретное, предметное, информированное, сознательное и однозначное согласие <strong>{legalName}</strong> (Оператор) на обработку моих персональных данных со следующими условиями:
                      </p>

                      <div className="space-y-2 pt-1 font-mono text-[11px]">
                        <div className="p-2.5 bg-app-surface rounded-xl border border-app-border">
                          <strong className="text-app-primary block font-sans">1. Перечень данных:</strong>
                          <span className="text-app-muted">ФИО, контактный телефон, адрес электронной почты, адрес доставки, Telegram ID / Username, история заказов.</span>
                        </div>

                        <div className="p-2.5 bg-app-surface rounded-xl border border-app-border">
                          <strong className="text-app-primary block font-sans">2. Способы обработки:</strong>
                          <span className="text-app-muted">Сбор, запись, систематизация, накопление, хранение, уточнение, извлечение, использование, передача (курьерским службам), обезличивание, блокирование, уничтожение.</span>
                        </div>

                        <div className="p-2.5 bg-app-surface rounded-xl border border-app-border">
                          <strong className="text-app-primary block font-sans">3. Срок действия:</strong>
                          <span className="text-app-muted">Согласие действует до момента достижения целей обработки или до момента отзыва согласия субъектом.</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-app-muted pt-1">
                        Отзыв согласия осуществляется путем направления письменного или электронного заявления на адрес: <strong className="text-app-primary font-mono">{email}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. СОГЛАСИЕ НА РЕКЛАМНЫЕ РАССЫЛКИ (38-ФЗ) */}
                {activeDoc === "consent_ads" && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-app-border pb-4 space-y-1">
                      <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold block">
                        Часть 1 статьи 18 Федерального закона № 38-ФЗ «О рекламе»
                      </span>
                      <h1 className="text-xl sm:text-2xl font-bold text-app-primary">
                        Согласие на получение рекламных и информационных сообщений
                      </h1>
                      <p className="text-xs text-app-muted font-mono">
                        Условия подписки на скидки, промокоды и специальные предложения
                      </p>
                    </div>

                    <section className="space-y-3 text-xs leading-relaxed">
                      <p>
                        В соответствии с ч. 1 ст. 18 Федерального закона от 13.03.2006 № 38-ФЗ «О рекламе», ставя галочку в соответствующем поле формы или подтверждая подписку, Пользователь дает свое согласие <strong>{legalName}</strong> на получение рекламных, информационных и маркетинговых сообщений посредством:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-app-muted">
                        <li>Сообщений в мессенджере Telegram;</li>
                        <li>SMS-сообщений на указанный номер телефона;</li>
                        <li>Электронных писем на адрес E-mail;</li>
                        <li>Push-уведомлений в приложении.</li>
                      </ul>
                      <div className="p-3 bg-app-card border border-app-border rounded-xl text-[11px] space-y-1">
                        <strong className="text-app-primary block font-mono">Право на отписку в любой момент:</strong>
                        <p className="text-app-muted">
                          Пользователь вправе в любой момент отказаться от получения рекламных сообщений без объяснения причин, нажав кнопку «Отписаться» в профиле, отключив уведомления в боте или написав на <strong>{email}</strong>.
                        </p>
                      </div>
                    </section>
                  </div>
                )}

                {/* 5. ПРАВИЛА ВОЗВРАТА (2300-1) */}
                {activeDoc === "refunds" && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-app-border pb-4 space-y-1">
                      <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest font-bold block">
                        Закон РФ № 2300-1 «О защите прав потребителей» (ст. 26.1)
                      </span>
                      <h1 className="text-xl sm:text-2xl font-bold text-app-primary">
                        Правила возврата товаров, отмены заказов и возврата средств
                      </h1>
                      <p className="text-xs text-app-muted font-mono">
                        Порядок действий при дистанционной торговле и оказании услуг
                      </p>
                    </div>

                    <section className="space-y-3 text-xs leading-relaxed">
                      <h3 className="text-sm font-bold text-app-primary font-mono uppercase tracking-wider">
                        1. Продовольственные товары и готовые блюда
                      </h3>
                      <p>
                        В соответствии с законодательством РФ, продовольственные товары надлежащего качества (включая готовые блюда ресторанного питания и напитки) обмену и возврату не подлежат.
                      </p>
                      <p>
                        В случае обнаружения недостатков в качестве блюда или несоответствия заказу Покупатель вправе потребовать:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-app-muted">
                        <li>Безвозмездного устранения недостатков (замены блюда на свежее);</li>
                        <li>Соразмерного уменьшения покупной цены / начисления бонусов;</li>
                        <li>Полного возврата уплаченных денежных средств.</li>
                      </ul>
                    </section>

                    <section className="space-y-3 text-xs leading-relaxed">
                      <h3 className="text-sm font-bold text-app-primary font-mono uppercase tracking-wider">
                        2. Сроки и порядок возврата денежных средств
                      </h3>
                      <p>
                        Возврат денежных средств при безналичной оплате осуществляется на ту же банковскую карту или счет СБП, с которого была произведена транзакция.
                      </p>
                      <p className="text-app-muted">
                        Срок возврата денежных средств банком составляет от 1 до 10 рабочих дней в соответствии со ст. 22 Закона РФ «О защите прав потребителей».
                      </p>
                    </section>
                  </div>
                )}

                {/* 6. COOKIES */}
                {activeDoc === "cookies" && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-app-border pb-4 space-y-1">
                      <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold block">
                        Технический регламент • Cookies & LocalStorage
                      </span>
                      <h1 className="text-xl sm:text-2xl font-bold text-app-primary">
                        Политика использования файлов Cookie
                      </h1>
                      <p className="text-xs text-app-muted font-mono">
                        Описание категорий файлов cookie и способов управления ими
                      </p>
                    </div>

                    <section className="space-y-3 text-xs leading-relaxed">
                      <p>
                        Файлы cookie представляют собой небольшие текстовые файлы, сохраняемые на вашем устройстве для сохранения пользовательских сессий, темы оформления (темная/светлая), содержимого корзины и языковых настроек.
                      </p>
                      <div className="space-y-2 pt-2 font-mono text-[11px]">
                        <div className="p-3 bg-app-surface border border-app-border rounded-xl">
                          <strong className="text-app-primary block font-sans">Обязательные (технические):</strong>
                          <span className="text-app-muted">Необходимы для авторизации, защиты от CSRF/XSS и сохранения корзины покупок. Без них работа сервиса невозможна.</span>
                        </div>
                        <div className="p-3 bg-app-surface border border-app-border rounded-xl">
                          <strong className="text-app-primary block font-sans">Аналитические:</strong>
                          <span className="text-app-muted">Используются для подсчета посещаемости и оптимизации производительности без передачи третьим лицам.</span>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {/* 7. РЕКВИЗИТЫ И 54-ФЗ */}
                {activeDoc === "requisites" && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-app-border pb-4 space-y-1">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold block">
                        Статья 9 Закона РФ «О защите прав потребителей» • 54-ФЗ
                      </span>
                      <h1 className="text-xl sm:text-2xl font-bold text-app-primary">
                        Реквизиты оператора и фискализация (54-ФЗ)
                      </h1>
                      <p className="text-xs text-app-muted font-mono">
                        Официальная информация о продавце и выдаче электронных чеков
                      </p>
                    </div>

                    <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-3 text-xs font-mono">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="text-[10px] text-app-muted uppercase block">Наименование организации / ИП</span>
                          <span className="text-app-primary font-bold text-xs">{legalName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-app-muted uppercase block">ИНН</span>
                          <span className="text-app-primary font-bold text-xs">{inn}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-app-muted uppercase block">ОГРН / ОГРНИП</span>
                          <span className="text-app-primary font-bold text-xs">{ogrn}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-app-muted uppercase block">Контактный телефон</span>
                          <span className="text-app-primary font-bold text-xs">{phone}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-[10px] text-app-muted uppercase block">Фактический адрес</span>
                          <span className="text-app-primary font-medium text-xs">{address}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-[10px] text-app-muted uppercase block">E-mail для юридических претензий потребителей</span>
                          <span className="text-app-primary font-bold text-xs">{email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-app-surface border border-app-border rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-app-primary font-bold font-mono">
                        <Receipt size={16} className="text-emerald-400" />
                        <span>Применение ККТ и электронные чеки (54-ФЗ)</span>
                      </div>
                      <p className="text-app-muted leading-relaxed text-[11px]">
                        В соответствии со статьей 1.2 Федерального закона № 54-ФЗ «О применении контрольно-кассовой техники», при совершении расчетов покупателю в обязательном порядке направляется электронный кассовый чек на предоставленный абонентский номер либо адрес электронной почты.
                      </p>
                    </div>

                    {/* Disclaimer on foreign extremist platforms */}
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-mono text-amber-300 space-y-1">
                      <strong>* Примечание о маркировке:</strong>
                      <p>
                        Instagram и Facebook принадлежат компании Meta Platforms Inc., признанной экстремистской организацией и запрещенной на территории Российской Федерации.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="h-14 px-6 border-t border-app-border bg-app-modal-header flex items-center justify-between shrink-0 text-xs font-mono text-app-muted">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-app-surface border border-app-border text-[10px] text-emerald-400 font-bold">
                  РФ 0+
                </span>
                <span className="hidden sm:inline text-[11px]">
                  Все документы соответствуют нормам законодательства РФ
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="py-1.5 px-4 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary font-mono text-xs rounded-xl transition-colors cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
