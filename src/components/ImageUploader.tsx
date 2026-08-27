import React, { useState, useRef } from "react";
import { Upload, Link as LinkIcon, Image as ImageIcon, X, Sparkles, Crop } from "lucide-react";
import ImageCropperModal from "./ImageCropperModal";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  type?: "photo" | "avatar" | "banner" | "product";
  presets?: Array<{ label: string; url: string }>;
  maxHeightClass?: string;
}

const DEFAULT_AVATAR_PRESETS = [
  { label: "Бизнес 👨‍💼", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300" },
  { label: "Креатив 👩‍🎨", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300" },
  { label: "Кофейня ☕", url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=300" },
  { label: "Барбер 💈", url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=300" },
  { label: "Ресторан 🍷", url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=300" },
  { label: "Цветы 🌸", url: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&q=80&w=300" }
];

const DEFAULT_PHOTO_PRESETS = [
  { label: "☕ Кофе", url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=500" },
  { label: "🍰 Десерт", url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=500" },
  { label: "🍔 Бургер", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=500" },
  { label: "🍕 Пицца", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=500" },
  { label: "💈 Стрижка", url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=500" },
  { label: "💆 Спа / Уход", url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=500" }
];

const DEFAULT_BANNER_PRESETS = [
  { label: "Темный Градиент 🌌", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000" },
  { label: "Кофейный Уют ☕", url: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&q=80&w=1000" },
  { label: "Премиум Зал 🍸", url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1000" },
  { label: "Стиль & Мода ✂️", url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1000" }
];

// Helper to scale & compress client side
async function compressImageFile(file: File, maxDimension = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", quality);
          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export default function ImageUploader({
  value = "",
  onChange,
  label,
  placeholder = "Вставьте ссылку или загрузите фото...",
  type = "photo",
  presets,
  maxHeightClass = "max-h-36"
}: ImageUploaderProps) {
  const [tab, setTab] = useState<"file" | "link" | "presets">("file");
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState("");
  const [uploaderError, setUploaderError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePresets = presets || (type === "avatar" ? DEFAULT_AVATAR_PRESETS : type === "banner" ? DEFAULT_BANNER_PRESETS : DEFAULT_PHOTO_PRESETS);

  const defaultRatio = type === "avatar" ? "1:1" : type === "banner" ? "16:9" : "4:3";

  const MAX_FILE_SIZE_MB = 15;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const processFile = async (file: File) => {
    setUploaderError(null);
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploaderError("Пожалуйста, выберите файл изображения (PNG, JPG, WEBP, GIF)");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploaderError(`Файл слишком большой (${(file.size / (1024 * 1024)).toFixed(1)} МБ). Максимум — ${MAX_FILE_SIZE_MB} МБ`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsCompressing(true);
    try {
      const maxDim = type === "avatar" ? 800 : type === "banner" ? 1200 : 1000;
      const optimizedDataUrl = await compressImageFile(file, maxDim, 0.85);
      setIsCompressing(false);
      onChange(optimizedDataUrl);
      setCropperImage(optimizedDataUrl);
      setCropperOpen(true);
    } catch (err: any) {
      setIsCompressing(false);
      setUploaderError(err?.message || "Ошибка при обработке изображения.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between items-center">
          <label className="block text-[11px] font-mono text-app-muted uppercase tracking-wider">{label}</label>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-[10px] text-app-muted hover:text-app-primary font-mono flex items-center gap-0.5 cursor-pointer transition-colors"
            >
              <X size={12} /> Очистить
            </button>
          )}
        </div>
      )}

      {uploaderError && (
        <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-400 font-mono flex items-center justify-between gap-2">
          <span>{uploaderError}</span>
          <button
            type="button"
            onClick={() => setUploaderError(null)}
            className="text-rose-400 hover:text-rose-300 p-0.5"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Control Tabs */}
      <div className="flex gap-1 bg-app-card p-1 rounded-xl border border-app-border text-[10px] font-mono">
        <button
          type="button"
          onClick={() => setTab("file")}
          className={`flex-1 py-1 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
            tab === "file" ? "bg-app-accent text-app-accent-fg font-bold shadow-sm" : "text-app-muted hover:text-app-primary"
          }`}
        >
          <Upload size={12} /> Загрузить файл
        </button>
        <button
          type="button"
          onClick={() => setTab("presets")}
          className={`flex-1 py-1 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
            tab === "presets" ? "bg-app-accent text-app-accent-fg font-bold shadow-sm" : "text-app-muted hover:text-app-primary"
          }`}
        >
          <Sparkles size={12} /> Галерея пресетов
        </button>
        <button
          type="button"
          onClick={() => setTab("link")}
          className={`flex-1 py-1 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
            tab === "link" ? "bg-app-accent text-app-accent-fg font-bold shadow-sm" : "text-app-muted hover:text-app-primary"
          }`}
        >
          <LinkIcon size={12} /> Вставить URL
        </button>
      </div>

      {/* Tab Contents */}
      {tab === "file" && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
          className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition-all space-y-1 group ${
            isDraggingOver
              ? "border-app-accent bg-app-accent/10"
              : "border-app-border hover:border-app-accent/50 bg-app-card/60 hover:bg-app-card"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <div className="w-7 h-7 bg-app-surface text-app-primary border border-app-border rounded-lg flex items-center justify-center mx-auto shadow-xs group-hover:scale-105 transition-transform">
            {isCompressing ? <Sparkles size={14} className="animate-spin text-app-accent" /> : <Upload size={14} />}
          </div>
          <p className="text-[11px] text-app-primary font-medium">
            {isCompressing ? "Оптимизация и обработка..." : "Нажмите или перетащите фото сюда"}
          </p>
          <p className="text-[9px] text-app-muted font-mono">PNG, JPG, WEBP, GIF (до 15 МБ, с кадрированием)</p>
        </div>
      )}

      {tab === "presets" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
          {activePresets.map((pr) => (
            <button
              key={pr.label}
              type="button"
              onClick={() => onChange(pr.url)}
              className={`p-1.5 rounded-lg border text-[10px] font-mono transition-all flex items-center gap-1.5 text-left cursor-pointer ${
                value === pr.url
                  ? "bg-app-accent text-app-accent-fg border-app-border font-bold shadow-xs"
                  : "bg-app-card border-app-border text-app-secondary hover:text-app-primary hover:bg-app-hover"
              }`}
            >
              <div className="w-5 h-5 rounded-md overflow-hidden shrink-0 bg-app-surface border border-app-border/60">
                <img
                  src={pr.url}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <span className="truncate">{pr.label}</span>
            </button>
          ))}
        </div>
      )}

      {tab === "link" && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-app-card border border-app-border rounded-xl px-3 py-2 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono transition-colors"
        />
      )}

      {/* Preview box if value is set */}
      {value && (
        <div className="mt-2 relative rounded-xl overflow-hidden bg-app-card border border-app-border p-2 flex items-center justify-center">
          {type === "avatar" ? (
            <div className="w-18 h-18 rounded-2xl overflow-hidden shadow-sm border border-app-border/80 bg-app-surface">
              <img
                src={value}
                alt="Логотип"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300";
                }}
              />
            </div>
          ) : (
            <div className={`w-full ${maxHeightClass} overflow-hidden rounded-lg bg-app-surface border border-app-border/60 flex items-center justify-center`}>
              <img
                src={value}
                alt="Превью"
                className="max-h-full max-w-full object-cover rounded-md"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=500";
                }}
              />
            </div>
          )}

          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-10">
            <button
              type="button"
              onClick={() => {
                setCropperImage(value);
                setCropperOpen(true);
              }}
              className="p-1.5 bg-black/80 hover:bg-black text-white rounded-lg transition-all cursor-pointer shadow-md flex items-center gap-1 text-[10px] font-mono px-2 backdrop-blur-sm"
              title="Кадрировать / Обрезать фото"
            >
              <Crop size={11} className="text-white shrink-0" />
              <span>Обрезать</span>
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-1.5 bg-black/80 text-white rounded-lg hover:bg-black transition-all cursor-pointer shadow-md backdrop-blur-sm"
              title="Удалить фото"
            >
              <X size={12} className="text-white shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={cropperOpen}
        imageUrl={cropperImage}
        onClose={() => setCropperOpen(false)}
        onCropComplete={(croppedUrl) => {
          onChange(croppedUrl);
        }}
        defaultAspectRatio={defaultRatio}
      />
    </div>
  );
}
