import React, { useState, useRef } from "react";
import {
  Film,
  Plus,
  Trash2,
  ExternalLink,
  Upload,
  Link as LinkIcon,
  Play,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  Video,
  Info,
} from "lucide-react";
import {
  ShopVideo,
  parseVideoSource,
  extractUrlFromIframeOrText,
  validateVideoLink,
  validateVideoFile,
  MAX_VIDEO_FILE_SIZE_BYTES,
  MAX_VIDEO_FILE_SIZE_LABEL,
} from "../../lib/videoUtils";

interface AdminShopVideosManagerProps {
  videos: ShopVideo[];
  onChange: (videos: ShopVideo[]) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
  token?: string | null;
}

export const AdminShopVideosManager: React.FC<AdminShopVideosManagerProps> = ({
  videos = [],
  onChange,
  showToast,
  token,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [mode, setMode] = useState<"link" | "file">("link");
  const [linkInput, setLinkInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const safeVideos = Array.isArray(videos) ? videos.slice(0, 2) : [];
  const canAddMore = safeVideos.length < 2;

  // Real-time link validation
  const linkValidation = linkInput.trim() ? validateVideoLink(linkInput) : null;
  const parsedLink = linkValidation?.isValid ? parseVideoSource(linkInput) : null;

  const handleOpenAdd = () => {
    setIsAdding(true);
    setLinkInput("");
    setTitleInput("");
    setValidationError(null);
    setFileValidationError(null);
    setMode("link");
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setLinkInput("");
    setTitleInput("");
    setValidationError(null);
    setFileValidationError(null);
    setIsUploading(false);
  };

  const handleAddLinkVideo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canAddMore) {
      if (showToast) showToast("Можно добавить не более 2 видео", "warning");
      return;
    }

    const cleanUrl = extractUrlFromIframeOrText(linkInput);
    if (!cleanUrl) {
      setValidationError("Введите ссылку на видео");
      return;
    }

    const validation = validateVideoLink(cleanUrl);
    if (!validation.isValid) {
      setValidationError(validation.warning || "Неподдерживаемый формат ссылки на видео");
      if (showToast) showToast(validation.warning || "Неверная ссылка", "error");
      return;
    }

    const parsed = parseVideoSource(cleanUrl);
    const newVideo: ShopVideo = {
      id: `vid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: parsed.type,
      url: cleanUrl,
      embedUrl: parsed.embedUrl,
      title: titleInput.trim() || undefined,
    };

    const updated = [...safeVideos, newVideo];
    onChange(updated);
    if (showToast) showToast(`Видео «${parsed.platformName}» добавлено!`, "success");
    handleCancelAdd();
  };

  const processFile = async (file: File) => {
    if (!file) return;

    if (!canAddMore) {
      if (showToast) showToast("Можно добавить не более 2 видео", "warning");
      return;
    }

    // Comprehensive format and size validation
    const fileCheck = validateVideoFile(file);
    if (!fileCheck.isValid) {
      setFileValidationError(fileCheck.warning || "Неподдерживаемый формат файла");
      if (showToast) showToast(fileCheck.warning || "Ошибка файла", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFileValidationError(null);
    setValidationError(null);
    setIsUploading(true);
    setUploadProgress(15);

    try {
      // Read file to base64
      const reader = new FileReader();
      reader.onprogress = (pe) => {
        if (pe.lengthComputable) {
          const pct = Math.round((pe.loaded / pe.total) * 60);
          setUploadProgress(pct);
        }
      };

      reader.onerror = () => {
        setIsUploading(false);
        setFileValidationError("Не удалось прочитать файл на устройстве");
      };

      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        setUploadProgress(70);

        try {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          const authToken = token || localStorage.getItem("token") || localStorage.getItem("auth_token");
          if (authToken) {
            headers["Authorization"] = `Bearer ${authToken}`;
          }

          const res = await fetch("/api/upload/video", {
            method: "POST",
            headers,
            body: JSON.stringify({
              data: base64Data,
              filename: file.name,
              mimeType: file.type || "video/mp4",
            }),
          });

          setUploadProgress(95);

          const result = await res.json();
          if (!res.ok) {
            throw new Error(result.error || "Ошибка загрузки видео на сервер");
          }

          const newVideo: ShopVideo = {
            id: `vid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type: "file",
            url: result.streamUrl || result.url,
            embedUrl: result.streamUrl || result.url,
            title: titleInput.trim() || file.name.replace(/\.[^/.]+$/, ""),
            size: file.size,
          };

          const updated = [...safeVideos, newVideo];
          onChange(updated);
          if (showToast) showToast("Видеофайл успешно загружен!", "success");
          handleCancelAdd();
        } catch (uploadErr: any) {
          const msg = uploadErr.message || "Не удалось загрузить видеофайл";
          setFileValidationError(msg);
          if (showToast) showToast(msg, "error");
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploading(false);
      setFileValidationError(err.message || "Ошибка обработки файла");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDeleteVideo = (id: string) => {
    const updated = safeVideos.filter((v) => v.id !== id);
    onChange(updated);
    if (activePreviewId === id) setActivePreviewId(null);
    if (showToast) showToast("Видео удалено", "info");
  };

  const getBadgeStyle = (type: ShopVideo["type"]) => {
    switch (type) {
      case "youtube":
        return "bg-red-500/10 text-red-500 border-red-500/30";
      case "vk":
        return "bg-sky-500/10 text-sky-500 border-sky-500/30";
      case "rutube":
        return "bg-blue-600/10 text-blue-400 border-blue-500/30";
      default:
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
    }
  };

  const getPlatformName = (type: ShopVideo["type"]) => {
    switch (type) {
      case "youtube":
        return "YouTube";
      case "vk":
        return "VK Видео";
      case "rutube":
        return "RuTube";
      default:
        return "Видеофайл";
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-mono text-app-muted uppercase tracking-wider flex items-center gap-1.5">
              <Film size={13} className="text-emerald-500" />
              <span>Видео о заведении (до 2 видео)</span>
            </label>
            <span className="px-2 py-0.5 rounded-full bg-app-card border border-app-border text-[10px] font-mono font-medium text-app-muted">
              {safeVideos.length} / 2
            </span>
          </div>
          <p className="text-[11px] text-app-muted mt-0.5 font-sans">
            Видеоэкскурсия, демонстрация интерьера, процесс работы или услуг. Клиенты увидят видео в окне «О заведении».
          </p>
        </div>

        {canAddMore && !isAdding && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-mono text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 active:scale-95"
          >
            <Plus size={14} />
            <span>Добавить видео</span>
          </button>
        )}
      </div>

      {/* Videos List */}
      {safeVideos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {safeVideos.map((video, idx) => {
            const isPreviewing = activePreviewId === video.id;
            return (
              <div
                key={video.id || idx}
                className="p-3.5 bg-app-card border border-app-border rounded-2xl space-y-2.5 shadow-xs relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-app-surface border border-app-border text-[10px] font-mono font-medium flex items-center justify-center text-app-primary shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium ${getBadgeStyle(
                            video.type
                          )}`}
                        >
                          {getPlatformName(video.type)}
                        </span>
                        {video.size && (
                          <span className="text-[10px] font-mono text-app-muted">
                            {(video.size / (1024 * 1024)).toFixed(1)} МБ
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-app-primary truncate mt-1">
                        {video.title || "Без названия"}
                      </p>
                      <p className="text-[10px] font-mono text-app-muted truncate mt-0.5">
                        {video.url}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActivePreviewId(isPreviewing ? null : video.id)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isPreviewing
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-app-surface text-app-muted hover:text-app-primary border-app-border"
                      }`}
                      title={isPreviewing ? "Скрыть плеер" : "Предпросмотр"}
                    >
                      {isPreviewing ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVideo(video.id)}
                      className="p-1.5 bg-app-surface hover:bg-red-500/20 text-app-muted hover:text-red-400 border border-app-border hover:border-red-500/30 rounded-lg transition-colors cursor-pointer"
                      title="Удалить видео"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Inline Preview */}
                {isPreviewing && (
                  <div className="pt-2 border-t border-app-border">
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-app-border">
                      {video.type === "file" ? (
                        <video
                          src={video.url}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <iframe
                          src={video.embedUrl || video.url}
                          title={video.title || "Предпросмотр"}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Adding Form Card */}
      {isAdding && canAddMore && (
        <div className="p-4 bg-app-surface border-2 border-dashed border-emerald-500/40 rounded-2xl space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-app-border pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Video size={15} />
              </div>
              <div>
                <h5 className="text-xs font-medium text-app-primary">
                  Добавление видео #{safeVideos.length + 1}
                </h5>
                <p className="text-[10px] text-app-muted">
                  Выберите удобный способ: ссылка (YouTube, VK, RuTube) или загрузка видеофайла
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelAdd}
              className="p-1 text-app-muted hover:text-app-primary rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("link");
                setValidationError(null);
                setFileValidationError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl font-mono text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === "link"
                  ? "bg-app-card text-app-primary border border-app-border shadow-xs"
                  : "bg-app-surface/50 text-app-muted hover:text-app-primary border border-transparent"
              }`}
            >
              <LinkIcon size={14} />
              <span>Ссылка (YouTube, VK, RuTube)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("file");
                setValidationError(null);
                setFileValidationError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl font-mono text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === "file"
                  ? "bg-app-card text-app-primary border border-app-border shadow-xs"
                  : "bg-app-surface/50 text-app-muted hover:text-app-primary border border-transparent"
              }`}
            >
              <Upload size={14} />
              <span>Загрузить файл (до 30 МБ)</span>
            </button>
          </div>

          {/* Optional Title Input */}
          <div>
            <label className="block text-[11px] font-mono text-app-muted mb-1 uppercase tracking-wider">
              Название / Подпись к видео (необязательно)
            </label>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="Например: Обзор заведения и атмосфера"
              maxLength={60}
              className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          {/* LINK MODE */}
          {mode === "link" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1 uppercase tracking-wider">
                  Ссылка на видео *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={linkInput}
                    onChange={(e) => {
                      setLinkInput(e.target.value);
                      setValidationError(null);
                    }}
                    placeholder="https://youtube.com/watch?v=... или https://vk.com/video... или rutube.ru/video/..."
                    className={`w-full bg-app-card border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none font-mono pr-28 transition-colors ${
                      linkValidation && !linkValidation.isValid
                        ? "border-amber-500 dark:border-amber-500/70 focus:border-amber-600 dark:focus:border-amber-400 ring-1 ring-amber-500/30"
                        : linkValidation?.isValid
                        ? "border-emerald-500/70 focus:border-emerald-500"
                        : "border-app-border focus:border-emerald-500"
                    }`}
                  />
                  {linkValidation?.isValid && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      {linkValidation.platformName}
                    </span>
                  )}
                  {linkValidation && !linkValidation.isValid && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Неверный формат
                    </span>
                  )}
                </div>

                {/* Minimalist Text Warning: If URL is invalid or unsupported format */}
                {linkValidation && !linkValidation.isValid && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 font-sans">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-normal">{linkValidation.warning}</p>
                  </div>
                )}

                {/* Minimalist Text Success: Platform recognized */}
                {linkValidation && linkValidation.isValid && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Видео успешно распознано: {linkValidation.platformName}</span>
                  </p>
                )}

                {/* Supported services guide note */}
                <div className="mt-2 p-2.5 rounded-xl bg-app-card border border-app-border text-[11px] font-mono text-app-muted space-y-1">
                  <div className="flex items-center gap-1.5 text-app-primary font-medium">
                    <Info size={13} className="text-emerald-500 shrink-0" />
                    <span>Поддерживаемые ссылки:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-0.5 text-[10px]">
                    <span className="flex items-center gap-1 text-app-muted">
                      <span className="text-red-400 font-medium">YouTube:</span> видео, Shorts, youtu.be
                    </span>
                    <span className="flex items-center gap-1 text-app-muted">
                      <span className="text-sky-400 font-medium">VK Видео:</span> видео, клипы, vkvideo.ru
                    </span>
                    <span className="flex items-center gap-1 text-app-muted">
                      <span className="text-blue-400 font-medium">RuTube:</span> ролики, embed-код
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Link Preview */}
              {parsedLink && parsedLink.isValid && (
                <div className="p-3 bg-app-card border border-app-border rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                      <Play size={12} />
                      Предпросмотр ({parsedLink.platformName})
                    </span>
                    <span className="text-app-muted text-[10px]">Проверьте воспроизведение перед сохранением</span>
                  </div>
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black border border-app-border">
                    <iframe
                      src={parsedLink.embedUrl}
                      title="Предпросмотр ссылки"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Submit Link Button */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelAdd}
                  className="px-3.5 py-1.5 bg-app-card hover:bg-app-hover text-app-muted hover:text-app-primary border border-app-border rounded-xl text-xs font-mono transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={!linkInput.trim() || !linkValidation?.isValid}
                  onClick={handleAddLinkVideo}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  <span>Сохранить видео</span>
                </button>
              </div>
            </div>
          )}

          {/* FILE MODE */}
          {mode === "file" && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/ogg"
                onChange={handleFileInputChange}
                disabled={isUploading}
                className="hidden"
                id="shop-video-file-input"
              />

              <label
                htmlFor="shop-video-file-input"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                  isDragOver
                    ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
                    : isUploading
                    ? "border-emerald-500 bg-emerald-500/5 opacity-75 pointer-events-none"
                    : fileValidationError
                    ? "border-red-500/50 bg-red-500/5 hover:border-red-500/70"
                    : "border-app-border hover:border-emerald-500/50 bg-app-card hover:bg-app-hover"
                }`}
              >
                {isUploading ? (
                  <div className="space-y-2.5 text-center">
                    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-medium text-app-primary font-mono">
                      Загрузка видеофайла на сервер... {uploadProgress}%
                    </p>
                    <div className="w-48 h-1.5 bg-app-surface rounded-full overflow-hidden mx-auto">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-1.5">
                    <div className="w-10 h-10 rounded-2xl bg-app-surface border border-app-border flex items-center justify-center text-emerald-500 mx-auto">
                      <Upload size={18} />
                    </div>
                    <p className="text-xs font-medium text-app-primary font-mono">
                      Нажмите для выбора или перетащите видеофайл сюда
                    </p>
                    <p className="text-[11px] text-app-muted font-mono">
                      Форматы MP4, WebM, MOV. Максимальный размер — <span className="text-emerald-400 font-medium">{MAX_VIDEO_FILE_SIZE_LABEL}</span>
                    </p>
                  </div>
                )}
              </label>

              {/* Minimalist Text Warning: If selected/dropped file format is unsupported or too big */}
              {fileValidationError && (
                <div className="flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400 font-sans">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="leading-relaxed font-normal">{fileValidationError}</p>
                    <p className="text-[11px] text-app-muted font-mono">
                      Разрешены только видеофайлы .mp4, .webm, .mov, .ogg размером до 30 МБ.
                    </p>
                  </div>
                </div>
              )}

              {/* Supported formats informational block */}
              <div className="p-2.5 rounded-xl bg-app-card border border-app-border text-[11px] font-mono text-app-muted space-y-1">
                <div className="flex items-center gap-1.5 text-app-primary font-medium">
                  <Info size={13} className="text-emerald-500 shrink-0" />
                  <span>Требования к видеофайлу:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-app-muted text-[10px]">
                  <li>Допустимые форматы: <span className="text-emerald-600 dark:text-emerald-400 font-medium">MP4 (.mp4), WebM (.webm), QuickTime (.mov)</span></li>
                  <li>Максимальный размер одного файла: <span className="text-emerald-600 dark:text-emerald-400 font-medium">до 30 МБ</span></li>
                  <li>Если ваше видео весит больше 30 МБ, переключитесь на вкладку «Ссылка» и укажите ссылку на YouTube, VK или RuTube.</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelAdd}
                  disabled={isUploading}
                  className="px-3.5 py-1.5 bg-app-card hover:bg-app-hover text-app-muted hover:text-app-primary border border-app-border rounded-xl text-xs font-mono transition-colors cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {/* Minimalist General Submit Error Message */}
          {validationError && (
            <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-sans">
              <AlertCircle size={14} className="shrink-0" />
              <span className="font-normal">{validationError}</span>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {safeVideos.length === 0 && !isAdding && (
        <div className="p-4 bg-app-card/60 border border-app-border rounded-2xl text-center space-y-2">
          <div className="w-8 h-8 rounded-xl bg-app-surface border border-app-border flex items-center justify-center text-app-muted mx-auto">
            <Film size={16} />
          </div>
          <p className="text-xs text-app-muted font-sans max-w-sm mx-auto">
            Видео еще не добавлены. Загрузите видеофайл (до 30 МБ) или укажите ссылку на ролик в YouTube, RuTube или VK.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminShopVideosManager;
