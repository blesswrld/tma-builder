import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Crop,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  Grid,
  Move,
  RefreshCw,
  Maximize2,
  Square,
  Monitor,
  Smartphone,
  Eye,
  EyeOff
} from "lucide-react";
import { useScrollLock } from "../hooks/useScrollLock";

interface ImageCropperModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  defaultAspectRatio?: "1:1" | "16:9" | "4:3" | "3:4" | "21:9" | "free";
}

type AspectRatioOption = "free" | "1:1" | "16:9" | "4:3" | "3:4" | "21:9";

const ASPECT_RATIOS: {
  label: string;
  value: AspectRatioOption;
  ratio: number | null;
  icon: React.ReactNode;
}[] = [
  { label: "Оригинал", value: "free", ratio: null, icon: <Maximize2 size={13} /> },
  { label: "1:1 Квадрат", value: "1:1", ratio: 1, icon: <Square size={13} /> },
  { label: "16:9 Баннер", value: "16:9", ratio: 16 / 9, icon: <Monitor size={13} /> },
  { label: "4:3 Фото", value: "4:3", ratio: 4 / 3, icon: <Square size={13} /> },
  { label: "3:4 Портрет", value: "3:4", ratio: 3 / 4, icon: <Smartphone size={13} /> },
  { label: "21:9 Широкий", value: "21:9", ratio: 21 / 9, icon: <Monitor size={13} /> }
];

export default function ImageCropperModal({
  isOpen,
  imageUrl,
  onClose,
  onCropComplete,
  defaultAspectRatio = "free"
}: ImageCropperModalProps) {
  useScrollLock(isOpen);

  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>(defaultAspectRatio);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [flipX, setFlipX] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({ width: 500, height: 380 });

  const containerRef = useRef<HTMLDivElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load natural dimensions whenever imageUrl changes
  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        }
      };
      img.src = imageUrl;
    }
  }, [imageUrl]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setFlipX(false);
      setShowGrid(true);
      setPosition({ x: 0, y: 0 });
      setAspectRatio(defaultAspectRatio);
    }
  }, [isOpen, imageUrl, defaultAspectRatio]);

  // Track container dimensions on resize
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.clientWidth || 500,
          height: containerRef.current.clientHeight || 380
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [isOpen]);

  // Calculate target aspect ratio
  const selectedRatioConfig = ASPECT_RATIOS.find((r) => r.value === aspectRatio);
  let targetRatio = selectedRatioConfig?.ratio;
  if (!targetRatio && naturalSize.width && naturalSize.height) {
    targetRatio = naturalSize.width / naturalSize.height;
  }
  if (!targetRatio) targetRatio = 1;

  // Frame size inside editor container
  const maxFrameW = Math.min(containerDimensions.width - 32, 540);
  const maxFrameH = Math.min(containerDimensions.height - 32, 400);

  let frameW = maxFrameW;
  let frameH = maxFrameW / targetRatio;

  if (frameH > maxFrameH) {
    frameH = maxFrameH;
    frameW = maxFrameH * targetRatio;
  }

  // Calculate rotation-aware image aspect ratio
  const isRotated90 = rotation === 90 || rotation === 270;
  const rawW = naturalSize.width || 800;
  const rawH = naturalSize.height || 600;
  const natRatio = rawW / rawH;

  const effectiveRatio = isRotated90 ? (1 / natRatio) : natRatio;
  const frameRatio = frameW / frameH;

  let baseDisplayW = frameW;
  let baseDisplayH = frameH;

  if (effectiveRatio > frameRatio) {
    baseDisplayH = frameH;
    baseDisplayW = frameH * effectiveRatio;
  } else {
    baseDisplayW = frameW;
    baseDisplayH = frameW / effectiveRatio;
  }

  // Unrotated dimensions for display & canvas
  const imgUnrotatedW = isRotated90 ? baseDisplayH : baseDisplayW;
  const imgUnrotatedH = isRotated90 ? baseDisplayW : baseDisplayH;

  // Visual dimensions after rotation
  const visualW = isRotated90 ? imgUnrotatedH * zoom : imgUnrotatedW * zoom;
  const visualH = isRotated90 ? imgUnrotatedW * zoom : imgUnrotatedH * zoom;

  // Clamping drag bounds so no black gaps appear
  const maxX = Math.max(0, (visualW - frameW) / 2);
  const maxY = Math.max(0, (visualH - frameH) / 2);

  const clampPosition = useCallback((pos: { x: number; y: number }, mX: number, mY: number) => {
    return {
      x: Math.min(mX, Math.max(-mX, pos.x)),
      y: Math.min(mY, Math.max(-mY, pos.y))
    };
  }, []);

  useEffect(() => {
    setPosition((prev) => clampPosition(prev, maxX, maxY));
  }, [zoom, aspectRatio, rotation, maxX, maxY, clampPosition]);

  // Drag handling
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;
    setPosition(clampPosition({ x: newX, y: newY }, maxX, maxY));
  }, [isDragging, dragStart, maxX, maxY, clampPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleMouseMove);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Non-passive wheel listener for zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isOpen) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.min(Math.max(prev + delta, 1), 3.5));
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isOpen]);

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
    setPosition({ x: 0, y: 0 });
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
    setPosition({ x: 0, y: 0 });
  };

  // COMPLETE RESET FUNCTION: Resets everything including original aspect ratio format
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setFlipX(false);
    setPosition({ x: 0, y: 0 });
    setAspectRatio(defaultAspectRatio);
  };

  const handleSaveCrop = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let canvasW = 1000;
    let canvasH = Math.round(1000 / targetRatio);

    if (targetRatio < 1) {
      canvasH = 1000;
      canvasW = Math.round(1000 * targetRatio);
    }

    canvas.width = canvasW;
    canvas.height = canvasH;

    const scale = canvasW / frameW;

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.translate(position.x * scale, position.y * scale);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipX ? -1 : 1, 1);

    const drawW = imgUnrotatedW * zoom * scale;
    const drawH = imgUnrotatedH * zoom * scale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();

    const resultDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onCropComplete(resultDataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-app-card border border-app-border text-app-primary rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-app-border flex items-center justify-between bg-app-surface">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-app-card text-app-primary flex items-center justify-center border border-app-border shrink-0 shadow-sm">
              <Crop size={19} className="text-app-muted" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-app-primary">Редактор и кадрирование фото</h3>
                {naturalSize.width > 0 && (
                  <span className="text-[10px] font-mono bg-app-card text-app-muted px-2 py-0.5 rounded-md border border-app-border">
                    {naturalSize.width} × {naturalSize.height} px
                  </span>
                )}
              </div>
              <p className="text-[11px] text-app-muted font-mono">
                Перетаскивайте и масштабируйте кадрирование фото
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-app-muted hover:text-app-primary hover:bg-app-hover transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Aspect Ratio Selector Pills */}
        <div className="px-4 py-2.5 bg-app-surface border-b border-app-border flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-mono text-app-muted mr-1 shrink-0 flex items-center gap-1">
            <Grid size={12} /> Формат:
          </span>
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.value}
              type="button"
              onClick={() => {
                setAspectRatio(ar.value);
                setPosition({ x: 0, y: 0 });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono shrink-0 transition-all cursor-pointer border flex items-center gap-1.5 ${
                aspectRatio === ar.value
                  ? "bg-app-accent text-app-accent-fg font-bold border-app-border shadow-sm"
                  : "bg-app-card text-app-secondary border-app-border hover:bg-app-hover hover:text-app-primary"
              }`}
            >
              {ar.icon}
              <span>{ar.label}</span>
            </button>
          ))}
        </div>

        {/* Interactive Cropper Area */}
        <div
          ref={containerRef}
          className="p-4 flex-1 flex items-center justify-center bg-zinc-950 relative min-h-[340px] max-h-[460px] overflow-hidden"
        >
          {/* Active Crop Box Frame */}
          <div
            ref={cropBoxRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            style={{
              width: `${frameW}px`,
              height: `${frameH}px`
            }}
            className="relative overflow-hidden cursor-grab active:cursor-grabbing shadow-[0_0_0_9999px_rgba(0,0,0,0.75)] rounded-xl border-2 border-white/80 z-10"
          >
            {/* Rule of Thirds Grid Lines (toggleable) */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none z-20 grid grid-cols-3 grid-rows-3 border border-white/20">
                <div className="border-r border-b border-emerald-400/20"></div>
                <div className="border-r border-b border-emerald-400/20"></div>
                <div className="border-b border-emerald-400/20"></div>
                <div className="border-r border-b border-emerald-400/20"></div>
                <div className="border-r border-b border-emerald-400/20"></div>
                <div className="border-b border-emerald-400/20"></div>
                <div className="border-r border-emerald-400/20"></div>
                <div className="border-r border-emerald-400/20"></div>
                <div></div>
              </div>
            )}

            {/* Drag Badge */}
            <div className="absolute top-2.5 left-2.5 z-30 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-white/90 border border-white/20 flex items-center gap-1.5 pointer-events-none shadow-md">
              <Move size={12} /> Зажмите и тяните
            </div>

            {/* Image rendered inside crop box */}
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Crop preview"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: `${imgUnrotatedW * zoom}px`,
                height: `${imgUnrotatedH * zoom}px`,
                maxWidth: "none",
                maxHeight: "none",
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) rotate(${rotation}deg) scale(${flipX ? -1 : 1}, 1)`,
                transition: isDragging ? "none" : "transform 0.15s ease-out"
              }}
              className="select-none pointer-events-none object-cover"
              crossOrigin="anonymous"
            />
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="p-4 bg-app-surface border-t border-app-border space-y-3">
          {/* Zoom Controls */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-app-muted flex items-center gap-1 shrink-0 w-20">
              <ZoomIn size={14} /> Масштаб:
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
              className="p-1.5 bg-app-card hover:bg-app-hover text-app-primary rounded-lg border border-app-border cursor-pointer transition-colors"
              title="Уменьшить"
            >
              <ZoomOut size={14} />
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 cursor-pointer h-1.5 bg-app-card rounded-lg accent-app-accent"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
              className="p-1.5 bg-app-card hover:bg-app-hover text-app-primary rounded-lg border border-app-border cursor-pointer transition-colors"
              title="Увеличить"
            >
              <ZoomIn size={14} />
            </button>
            <span className="text-xs font-mono text-app-primary font-bold w-12 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Action Buttons: Rotate, Flip, Toggle Grid, Reset, Save */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleRotateLeft}
                className="px-2.5 py-1.5 bg-app-card hover:bg-app-hover text-app-primary text-xs font-mono rounded-xl border border-app-border flex items-center gap-1 cursor-pointer transition-all"
                title="Повернуть влево"
              >
                <RotateCcw size={13} /> -90°
              </button>
              <button
                type="button"
                onClick={handleRotateRight}
                className="px-2.5 py-1.5 bg-app-card hover:bg-app-hover text-app-primary text-xs font-mono rounded-xl border border-app-border flex items-center gap-1 cursor-pointer transition-all"
                title="Повернуть вправо"
              >
                <RotateCw size={13} /> +90°
              </button>
              <button
                type="button"
                onClick={() => setFlipX(!flipX)}
                className={`px-2.5 py-1.5 text-xs font-mono rounded-xl border flex items-center gap-1 cursor-pointer transition-all ${
                  flipX
                    ? "bg-app-accent text-app-accent-fg border-app-border font-semibold shadow-sm"
                    : "bg-app-card hover:bg-app-hover text-app-primary border-app-border"
                }`}
                title="Отразить по горизонтали"
              >
                <FlipHorizontal size={13} /> Отразить
              </button>
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={`px-2.5 py-1.5 text-xs font-mono rounded-xl border flex items-center gap-1 cursor-pointer transition-all ${
                  showGrid
                    ? "bg-app-accent text-app-accent-fg border-app-border font-semibold shadow-sm"
                    : "bg-app-card hover:bg-app-hover text-app-muted border-app-border"
                }`}
                title="Показать / скрыть сетку"
              >
                {showGrid ? <Eye size={13} /> : <EyeOff size={13} />} Сетка
              </button>

              {/* Complete Reset Button */}
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 bg-app-card hover:bg-app-hover text-app-muted hover:text-app-primary text-xs font-mono font-medium rounded-xl border border-app-border flex items-center gap-1.5 cursor-pointer transition-all backdrop-blur-sm"
                title="Сбросить все изменения к исходному фото"
              >
                <RefreshCw size={13} /> Сброс
              </button>
            </div>

            {/* Confirm / Save Button */}
            <button
              type="button"
              onClick={handleSaveCrop}
              className="px-5 py-2 bg-app-accent hover:opacity-90 text-app-accent-fg font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all shrink-0 font-mono uppercase tracking-wider"
            >
              <Check size={16} /> Сохранить фото
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
