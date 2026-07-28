import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { X, Printer, Download, QrCode, Sparkles, Copy, Check } from "lucide-react";

interface QrGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName: string;
  shopSlug: string;
}

export default function QrGeneratorModal({
  isOpen,
  onClose,
  shopName,
  shopSlug
}: QrGeneratorModalProps) {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [tableNumber, setTableNumber] = useState("");
  const [batchStart, setBatchStart] = useState("1");
  const [batchEnd, setBatchEnd] = useState("6");
  const [ctaText, setCtaText] = useState("Отсканируйте QR-код для просмотра меню и заказа");
  const [accentColor, setAccentColor] = useState("#0f172a");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [batchQrs, setBatchQrs] = useState<Array<{ table: string; url: string; qrDataUrl: string }>>([]);
  const [copied, setCopied] = useState(false);

  // Формируем полный URL для одиночного заведения
  const baseUrl = window.location.origin;
  const fullUrl = tableNumber.trim()
    ? `${baseUrl}/${shopSlug}?table=${encodeURIComponent(tableNumber.trim())}`
    : `${baseUrl}/${shopSlug}`;

  useEffect(() => {
    if (!isOpen) return;

    if (mode === "single") {
      QRCode.toDataURL(fullUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: accentColor,
          light: "#ffffff"
        }
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error("Error generating QR code:", err));
    } else {
      // Генерация пакета QR-кодов для столов
      const start = parseInt(batchStart, 10) || 1;
      const end = Math.min(parseInt(batchEnd, 10) || 6, start + 24); // Ограничение до 25 столов на лист
      const list: Array<{ table: string; url: string; qrDataUrl: string }> = [];

      const generateBatch = async () => {
        for (let t = start; t <= end; t++) {
          const tName = `Стол ${t}`;
          const tUrl = `${baseUrl}/${shopSlug}?table=${t}`;
          try {
            const qrUrl = await QRCode.toDataURL(tUrl, {
              width: 300,
              margin: 2,
              color: { dark: accentColor, light: "#ffffff" }
            });
            list.push({ table: tName, url: tUrl, qrDataUrl: qrUrl });
          } catch (e) {
            console.error(e);
          }
        }
        setBatchQrs(list);
      };

      generateBatch();
    }
  }, [fullUrl, accentColor, isOpen, mode, batchStart, batchEnd, shopSlug, baseUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr_${shopSlug}${tableNumber ? `_table_${tableNumber}` : ""}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Стили для идеальной печати на принтере */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-qr-card, #printable-qr-card * {
            visibility: visible;
          }
          #printable-qr-card {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 80mm;
            padding: 10mm;
            border: 2px solid ${accentColor};
            border-radius: 12px;
            text-align: center;
            background: white !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Заголовок модалки */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <QrCode size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">QR-код и печатные материалы</h2>
              <p className="text-xs text-slate-500">Готовые материалы для размещения на столах и стойках</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Переключатель режимов: Одиночный / Пакетный для всех столов */}
        <div className="px-6 pt-4 pb-0 flex gap-2 border-b border-slate-100 bg-white">
          <button
            onClick={() => setMode("single")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              mode === "single"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            Одиночный макет
          </button>
          <button
            onClick={() => setMode("batch")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              mode === "batch"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <span>Пакетная печать столов</span>
            <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-bold">1..N</span>
          </button>
        </div>

        {/* Контент */}
        <div className="p-6 overflow-y-auto">
          {mode === "single" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Конструктор параметров */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Номер стола / Место (опционально)
                  </label>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    placeholder="Например: Стол № 5 или Зал 1"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white focus:outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Если указать стол, при сканировании номер автоматичеcки подставится в заказ клиента.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Заголовок / Призыв к действию
                  </label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={e => setCtaText(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Цветовой акцент
                  </label>
                  <div className="flex items-center gap-2">
                    {[
                      "#0f172a", // Темный
                      "#2563eb", // Синий
                      "#059669", // Зеленый
                      "#d97706", // Оранжевый
                      "#7c3aed"  // Фиолетовый
                    ].map(color => (
                      <button
                        key={color}
                        onClick={() => setAccentColor(color)}
                        style={{ backgroundColor: color }}
                        className={`w-7 h-7 rounded-full transition-transform ${
                          accentColor === color ? "scale-110 ring-2 ring-offset-2 ring-slate-900" : "hover:scale-105"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Прямая ссылка */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Прямая ссылка
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={fullUrl}
                      className="flex-1 px-3 py-2 text-[11px] font-mono text-slate-600 bg-slate-100 rounded-xl border border-slate-200 truncate select-all"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copied ? "Скопировано" : "Копия"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Предпросмотр печатной карточки */}
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Предпросмотр макета
                </span>

                {/* Карточка для печати */}
                <div
                  id="printable-qr-card"
                  className="w-full bg-white border-2 rounded-3xl p-6 text-center space-y-4 shadow-sm relative overflow-hidden"
                  style={{ borderColor: accentColor }}
                >
                  <div className="space-y-1">
                    <div
                      className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"
                      style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                    >
                      {shopName}
                    </div>
                    {tableNumber.trim() && (
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        {tableNumber}
                      </h3>
                    )}
                  </div>

                  {/* QR Image */}
                  <div className="flex justify-center my-2">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="QR Code"
                        className="w-48 h-48 object-contain rounded-xl border border-slate-100"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400 animate-pulse">
                        Генерация QR...
                      </div>
                    )}
                  </div>

                  <p className="text-xs font-medium text-slate-600 px-2 leading-relaxed">
                    {ctaText}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1 text-[10px] text-slate-400 font-mono">
                    <Sparkles size={12} style={{ color: accentColor }} />
                    <span>Быстрый онлайн-заказ</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ПАКЕТНЫЙ РЕЖИМ СТОЛОВ */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Начальный стол №
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={batchStart}
                    onChange={e => setBatchStart(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Конечный стол №
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={batchEnd}
                    onChange={e => setBatchEnd(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Цвет рамок
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {["#0f172a", "#2563eb", "#059669", "#d97706"].map(c => (
                      <button
                        key={c}
                        onClick={() => setAccentColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          accentColor === c ? "scale-110 ring-2 ring-offset-1 ring-slate-900" : ""
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Сетка предпросмотра карточек */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-700">
                    Сетка наклеек на столы ({batchQrs.length} шт.)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Готово к распечатке на листе A4
                  </span>
                </div>

                <div
                  id="printable-qr-card"
                  className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-100 p-3 rounded-2xl border border-slate-200"
                >
                  {batchQrs.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3 rounded-xl border border-slate-200 text-center space-y-1.5 shadow-2xs"
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                        {shopName}
                      </span>
                      <h4 className="text-xs font-black text-slate-900">{item.table}</h4>
                      <img src={item.qrDataUrl} alt={item.table} className="w-24 h-24 mx-auto object-contain" />
                      <span className="text-[8px] font-medium text-slate-500 block truncate px-1">
                        Меню и онлайн-заказ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Подвал с действиями */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={handleDownload}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs"
          >
            <Download size={16} />
            <span>Скачать PNG</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Printer size={16} />
            <span>Распечатать макет</span>
          </button>
        </div>
      </div>
    </div>
  );
}
