import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, QrCode, Download, Copy, Check, ExternalLink } from "lucide-react";
import QRCode from "qrcode";

interface ReferralQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralLink: string;
  referralCode: string;
}

export const ReferralQrModal: React.FC<ReferralQrModalProps> = ({
  isOpen,
  onClose,
  referralLink,
  referralCode
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && referralLink && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        referralLink,
        {
          width: 240,
          margin: 2,
          color: {
            dark: "#09090b",
            light: "#ffffff"
          }
        },
        (error) => {
          if (error) console.error("QR render error:", error);
        }
      );
    }
  }, [isOpen, referralLink]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadQr = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `tma-referral-${referralCode || "qr"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-sm bg-app-card border border-app-border rounded-2xl p-6 shadow-2xl space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-app-primary/10 border border-app-primary/20 flex items-center justify-center text-app-primary">
                <QrCode size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-app-primary">QR-код ссылки</h3>
                <p className="text-[11px] text-app-muted font-mono">Код: {referralCode}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-app-muted hover:text-app-primary hover:bg-app-hover rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* QR Canvas */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-app-border shadow-inner">
            <canvas ref={canvasRef} className="rounded-lg max-w-full" />
            <span className="text-[10px] font-mono text-zinc-600 mt-2 font-medium tracking-wide">
              Наведите камеру смартфона для регистрации
            </span>
          </div>

          {/* Referral link preview */}
          <div className="p-2.5 bg-app-bg border border-app-border rounded-xl font-mono text-xs text-app-muted flex items-center justify-between gap-2 overflow-hidden">
            <span className="truncate">{referralLink}</span>
            <button
              onClick={handleCopyLink}
              className="p-1.5 hover:bg-app-hover text-app-primary rounded-lg transition-colors cursor-pointer shrink-0"
              title="Скопировать"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
            <button
              onClick={handleDownloadQr}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-app-bg hover:bg-app-hover border border-app-border text-app-primary font-medium rounded-xl transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Скачать PNG</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-app-accent text-app-accent-fg font-bold rounded-xl transition-all cursor-pointer shadow-sm hover:opacity-90"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? "Скопировано!" : "Копировать"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default ReferralQrModal;
