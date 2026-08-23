import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { X, Printer, Download, QrCode, Copy, Check } from "lucide-react";
import { useScrollLock } from "../hooks/useScrollLock";

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
  useScrollLock(isOpen);

  const [mode, setMode] = useState<"single" | "batch">("single");
  const [tableNumber, setTableNumber] = useState("");
  const [batchStart, setBatchStart] = useState("1");
  const [batchEnd, setBatchEnd] = useState("6");
  const [ctaText, setCtaText] = useState("Отсканируйте QR-код для просмотра меню и заказа");
  const [accentColor, setAccentColor] = useState("#000000");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [batchQrs, setBatchQrs] = useState<Array<{ table: string; url: string; qrDataUrl: string }>>([]);
  const [copied, setCopied] = useState(false);

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
        .catch(err => console.error("Ошибка генерации QR-кода:", err));
    } else {
      const start = parseInt(batchStart, 10) || 1;
      const end = Math.min(parseInt(batchEnd, 10) || 6, start + 24);
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
    a.download = `qr_${shopSlug}${tableNumber ? `_stol_${tableNumber}` : ""}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-hidden text-app-primary font-sans">
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
            color: black !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="bg-app-modal rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-app-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-app-border flex items-center justify-between bg-app-modal-header">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-app-accent text-app-accent-fg rounded-xl">
              <QrCode size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-app-primary font-mono">Конструктор QR-кодов для столов</h2>
              <p className="text-xs text-app-muted">Генерация печатных материалов для заведения</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-app-muted hover:text-app-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 pb-0 flex gap-2 border-b border-app-border bg-app-surface font-mono">
          <button
            onClick={() => setMode("single")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              mode === "single"
                ? "border-app-primary text-app-primary font-bold"
                : "border-transparent text-app-muted hover:text-app-secondary"
            }`}
          >
            Одиночный макет
          </button>
          <button
            onClick={() => setMode("batch")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              mode === "batch"
                ? "border-app-primary text-app-primary font-bold"
                : "border-transparent text-app-muted hover:text-app-secondary"
            }`}
          >
            <span>Пакетная печать столов</span>
            <span className="px-1.5 py-0.2 bg-app-badge text-app-primary rounded text-[10px]">1..N</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {mode === "single" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Form Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-app-muted mb-1.5">
                    Номер стола / Место
                  </label>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    placeholder="Стол 5"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-app-input border border-app-border text-app-primary focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-app-muted mb-1.5">
                    Заголовок призыва к действию
                  </label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={e => setCtaText(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-app-input border border-app-border text-app-primary focus:outline-none transition-colors"
                  />
                </div>

                {/* Direct Link */}
                <div className="pt-2 font-mono">
                  <label className="block text-xs text-app-muted mb-1">
                    Прямая ссылка на витрину
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={fullUrl}
                      className="flex-1 px-3 py-2 text-[11px] text-app-secondary bg-app-input rounded-xl border border-app-border truncate select-all"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-2 bg-app-secondary hover:bg-app-hover text-app-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      <span>{copied ? "Скопировано" : "Копировать"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Printable Preview */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider mb-2">
                  Предпросмотр печати
                </span>

                <div
                  id="printable-qr-card"
                  className="w-full bg-white border-2 rounded-2xl p-6 text-center space-y-4 shadow-sm relative overflow-hidden text-zinc-900"
                  style={{ borderColor: accentColor }}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                      {shopName}
                    </span>
                    {tableNumber && (
                      <div className="inline-block px-3 py-0.5 bg-black text-white rounded-md text-xs font-bold font-mono">
                        {tableNumber.startsWith("Стол") || tableNumber.startsWith("Table") ? tableNumber : `Стол ${tableNumber}`}
                      </div>
                    )}
                  </div>

                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR Code"
                      className="w-44 h-44 mx-auto object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-44 h-44 bg-zinc-100 rounded-lg mx-auto flex items-center justify-center text-zinc-400 text-xs font-mono">
                      Генерация...
                    </div>
                  )}

                  <p className="text-[11px] font-medium text-zinc-700 leading-snug px-2">
                    {ctaText}
                  </p>

                  <div className="pt-2 border-t border-zinc-200 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                    <span>Сканируй и заказывай</span>
                    <span>Telegram Mini App</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Batch Mode */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-app-card p-4 rounded-2xl border border-app-border font-mono">
                <div>
                  <label className="block text-xs text-app-muted mb-1">
                    Начальный стол №
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={batchStart}
                    onChange={e => setBatchStart(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-app-input border border-app-border text-app-primary font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs text-app-muted mb-1">
                    Конечный стол №
                  </label>
                  <input
                    type="number"
                    max="50"
                    value={batchEnd}
                    onChange={e => setBatchEnd(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-app-input border border-app-border text-app-primary font-medium"
                  />
                </div>
              </div>

              {/* Batch Grid */}
              <div>
                <span className="text-xs font-mono text-app-muted block mb-3">
                  Карточки столов ({batchQrs.length} шт)
                </span>

                <div
                  id="printable-qr-card"
                  className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-app-card p-3 rounded-2xl border border-app-border"
                >
                  {batchQrs.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3 rounded-xl border border-zinc-200 text-center space-y-1.5 text-zinc-900"
                    >
                      <span className="text-[9px] font-mono text-zinc-400 block truncate">
                        {shopName}
                      </span>
                      <span className="inline-block px-2 py-0.5 bg-black text-white rounded text-[10px] font-bold font-mono">
                        {item.table}
                      </span>
                      <img src={item.qrDataUrl} alt={item.table} className="w-24 h-24 mx-auto object-contain" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-app-modal-header border-t border-app-border flex items-center justify-between gap-3 font-mono">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-app-secondary hover:bg-app-hover text-app-primary rounded-xl text-xs font-medium flex items-center gap-2 transition-colors"
          >
            <Download size={15} />
            <span>Скачать PNG</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-app-accent text-app-accent-fg font-bold rounded-xl text-xs flex items-center gap-2 transition-colors uppercase"
          >
            <Printer size={15} />
            <span>Печать листа</span>
          </button>
        </div>
      </div>
    </div>
  );
}
