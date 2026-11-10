import React, { useState, useRef, useEffect } from "react";
import {
  Music,
  Play,
  Pause,
  Plus,
  Trash2,
  Radio,
  Sliders,
  Check,
  Disc,
  ExternalLink,
  Info,
  AlertTriangle,
  ArrowRight,
  Loader2,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MusicSettings, MusicTrack } from "../../types";
import { detectStreamingService, isDirectPlayableAudioUrl } from "../../utils/musicHelper";

interface AdminMusicSettingsSectionProps {
  musicSettings: MusicSettings;
  onChange: (newSettings: MusicSettings) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export const PRESET_RADIO_STATIONS = [
  {
    id: "lounge",
    name: "Lounge & Coffee",
    desc: "Мягкий расслабляющий лаунж для уютных кофеен и ресторанов",
    streamUrl: "/api/radio-stream/lounge",
    fallbackUrl: "https://ice1.somafm.com/groovesalad-128-mp3",
    genre: "Lounge"
  },
  {
    id: "lofi",
    name: "Lo-Fi Beats & Relax",
    desc: "Спокойный ненавязчивый бит для стильных пространств",
    streamUrl: "/api/radio-stream/lofi",
    fallbackUrl: "https://ice1.somafm.com/illstreet-128-mp3",
    genre: "Lo-Fi"
  },
  {
    id: "deephouse",
    name: "Deep House & Salon",
    desc: "Энергичный стильный грув для барбершопов и салонов красоты",
    streamUrl: "/api/radio-stream/deephouse",
    fallbackUrl: "https://ice1.somafm.com/beatblender-128-mp3",
    genre: "Deep House"
  },
  {
    id: "jazz",
    name: "Smooth Jazz Cafe",
    desc: "Классический джаз и босса-нова для гастробаров и бутиков",
    streamUrl: "/api/radio-stream/jazz",
    fallbackUrl: "https://ice1.somafm.com/secretagent-128-mp3",
    genre: "Jazz"
  },
  {
    id: "spa",
    name: "Ambient Spa & Relax",
    desc: "Медитативные звуки природы и эмбиент для СПА и массажа",
    streamUrl: "/api/radio-stream/spa",
    fallbackUrl: "https://ice1.somafm.com/deepspaceone-128-mp3",
    genre: "Ambient"
  }
];

const MAX_CUSTOM_TRACKS = 25;
const MAX_TITLE_LEN = 80;
const MAX_DESC_LEN = 200;
const MAX_TRACK_TITLE_LEN = 80;
const MAX_ARTIST_LEN = 60;
const MAX_URL_LEN = 500;

export const AdminMusicSettingsSection: React.FC<AdminMusicSettingsSectionProps> = ({
  musicSettings,
  onChange,
  showToast
}) => {
  const [newTrackTitle, setNewTrackTitle] = useState("");
  const [newTrackArtist, setNewTrackArtist] = useState("");
  const [newTrackUrl, setNewTrackUrl] = useState("");
  const [newTrackGenre, setNewTrackGenre] = useState<string>("lounge");

  // Inline radio track add form state
  const [isAddingRadioTrack, setIsAddingRadioTrack] = useState(false);
  const [radioTrackTitle, setRadioTrackTitle] = useState("");
  const [radioTrackArtist, setRadioTrackArtist] = useState("");
  const [radioTrackUrl, setRadioTrackUrl] = useState("");
  const [filterGenre, setFilterGenre] = useState<string>("all");
  const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);
  const genreDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isGenreDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (genreDropdownRef.current && !genreDropdownRef.current.contains(e.target as Node)) {
        setIsGenreDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsGenreDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGenreDropdownOpen]);

  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const activeRequestIdRef = useRef<number>(0);

  // Stop preview audio when component unmounts
  useEffect(() => {
    return () => {
      activeRequestIdRef.current++;
      if (audioPreviewRef.current) {
        const audio = audioPreviewRef.current;
        audio.onplaying = null;
        audio.onerror = null;
        audio.onended = null;
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        audioPreviewRef.current = null;
      }
    };
  }, []);

  const handleTogglePreview = (id: string, streamUrl: string, fallbackUrl?: string) => {
    const requestId = ++activeRequestIdRef.current;

    // Cleanly stop any existing playing audio
    if (audioPreviewRef.current) {
      const oldAudio = audioPreviewRef.current;
      oldAudio.onplaying = null;
      oldAudio.onerror = null;
      oldAudio.onended = null;
      oldAudio.pause();
      oldAudio.removeAttribute("src");
      oldAudio.load();
      audioPreviewRef.current = null;
    }

    // If user clicks the currently active or loading preview, stop it
    if (previewingId === id || previewLoadingId === id) {
      setPreviewingId(null);
      setPreviewLoadingId(null);
      return;
    }

    // If it's a web page (e.g. Yandex Music, Spotify), open in new tab
    const streamInfo = detectStreamingService(streamUrl);
    if (streamInfo.isStreamingWebUrl || !isDirectPlayableAudioUrl(streamUrl)) {
      window.open(streamUrl, "_blank", "noopener,noreferrer");
      if (showToast) {
        showToast(`Ссылка на ${streamInfo.serviceName || "сервис"} открыта в новой вкладке`, "info");
      }
      setPreviewingId(null);
      setPreviewLoadingId(null);
      return;
    }

    // Set new track as loading
    setPreviewingId(null);
    setPreviewLoadingId(id);

    const playStream = (url: string, isFallback = false) => {
      if (activeRequestIdRef.current !== requestId) return;

      const audio = new Audio();
      audio.preload = "auto";
      audio.crossOrigin = "anonymous";
      audio.src = url;
      audio.volume = 0.6;
      audioPreviewRef.current = audio;

      const cleanupListeners = () => {
        audio.onplaying = null;
        audio.onerror = null;
        audio.onended = null;
      };

      audio.onplaying = () => {
        if (activeRequestIdRef.current !== requestId) {
          cleanupListeners();
          audio.pause();
          return;
        }
        setPreviewingId(id);
        setPreviewLoadingId(null);
      };

      audio.onended = () => {
        if (activeRequestIdRef.current === requestId) {
          setPreviewingId(null);
          setPreviewLoadingId(null);
        }
      };

      audio.onerror = () => {
        if (activeRequestIdRef.current !== requestId) return;
        if (!isFallback && fallbackUrl) {
          playStream(fallbackUrl, true);
          return;
        }
        if (activeRequestIdRef.current === requestId) {
          setPreviewingId(null);
          setPreviewLoadingId(null);
          if (showToast) showToast("Не удалось воспроизвести аудиопоток", "error");
        }
      };

      audio.play().then(() => {
        if (activeRequestIdRef.current !== requestId) {
          cleanupListeners();
          audio.pause();
          return;
        }
        setPreviewingId(id);
        setPreviewLoadingId(null);
      }).catch((err) => {
        if (activeRequestIdRef.current !== requestId || err.name === "AbortError") {
          return;
        }
        if (!isFallback && fallbackUrl) {
          playStream(fallbackUrl, true);
          return;
        }
        if (activeRequestIdRef.current === requestId) {
          setPreviewingId(null);
          setPreviewLoadingId(null);
          if (showToast) showToast("Не удалось воспроизвести аудиопоток", "error");
        }
      });
    };

    playStream(streamUrl);
  };

  const detectedStreaming = newTrackUrl ? detectStreamingService(newTrackUrl) : null;
  const detectedRadioStreaming = radioTrackUrl ? detectStreamingService(radioTrackUrl) : null;

  const handleTransferToStreaming = () => {
    if (!detectedStreaming || !detectedStreaming.field) return;
    onChange({
      ...musicSettings,
      sourceType: "playlist",
      [detectedStreaming.field]: newTrackUrl.trim()
    });
    setNewTrackUrl("");
    if (showToast) {
      showToast(`Ссылка перенесена в раздел «Стриминги» (${detectedStreaming.serviceName})`, "success");
    }
  };

  const handleAddTrack = (targetGenre?: string) => {
    if ((musicSettings.tracks?.length || 0) >= MAX_CUSTOM_TRACKS) {
      if (showToast) showToast(`Достигнут лимит треков (максимум ${MAX_CUSTOM_TRACKS})`, "warning");
      return;
    }

    if (!newTrackTitle.trim()) {
      if (showToast) showToast("Укажите название трека", "error");
      return;
    }
    if (!newTrackUrl.trim()) {
      if (showToast) showToast("Укажите ссылку на аудиофайл или веб-трек", "error");
      return;
    }

    const genreId = targetGenre || newTrackGenre || "lounge";
    const genreObj = PRESET_RADIO_STATIONS.find(s => s.id === genreId);

    const newTrack: MusicTrack = {
      id: "trk-" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4),
      title: newTrackTitle.trim().slice(0, MAX_TRACK_TITLE_LEN),
      artist: (newTrackArtist.trim() || "Неизвестный исполнитель").slice(0, MAX_ARTIST_LEN),
      url: newTrackUrl.trim().slice(0, MAX_URL_LEN),
      duration: "03:30",
      genre: genreId,
      genreName: genreObj?.name || "Lounge"
    };

    const updatedTracks = [...(musicSettings.tracks || []), newTrack];
    onChange({
      ...musicSettings,
      tracks: updatedTracks
    });

    setNewTrackTitle("");
    setNewTrackArtist("");
    setNewTrackUrl("");
    if (showToast) showToast(`Трек добавлен в стиль «${genreObj?.name || "Lounge"}»`, "success");
  };

  const handleAddRadioTrack = (genreId: string) => {
    if ((musicSettings.tracks?.length || 0) >= MAX_CUSTOM_TRACKS) {
      if (showToast) showToast(`Достигнут лимит треков (максимум ${MAX_CUSTOM_TRACKS})`, "warning");
      return;
    }

    if (!radioTrackTitle.trim()) {
      if (showToast) showToast("Укажите название трека для радиостанции", "error");
      return;
    }
    if (!radioTrackUrl.trim()) {
      if (showToast) showToast("Укажите ссылку на аудиофайл или веб-трек", "error");
      return;
    }

    const genreObj = PRESET_RADIO_STATIONS.find(s => s.id === genreId);

    const newTrack: MusicTrack = {
      id: "trk-" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4),
      title: radioTrackTitle.trim().slice(0, MAX_TRACK_TITLE_LEN),
      artist: (radioTrackArtist.trim() || "Неизвестный исполнитель").slice(0, MAX_ARTIST_LEN),
      url: radioTrackUrl.trim().slice(0, MAX_URL_LEN),
      duration: "03:30",
      genre: genreId,
      genreName: genreObj?.name || "Lounge"
    };

    const updatedTracks = [...(musicSettings.tracks || []), newTrack];
    onChange({
      ...musicSettings,
      tracks: updatedTracks
    });

    setRadioTrackTitle("");
    setRadioTrackArtist("");
    setRadioTrackUrl("");
    setIsAddingRadioTrack(false);
    if (showToast) showToast(`Трек добавлен в стиль «${genreObj?.name || "Lounge"}»`, "success");
  };

  const handleRemoveTrack = (trackId?: string, index?: number) => {
    // If the removed track is currently playing or loading preview, stop it cleanly
    const previewKey = trackId || (typeof index === "number" ? `track-${index}` : null);
    if (previewingId === previewKey || (trackId && previewingId === trackId)) {
      if (audioPreviewRef.current) {
        const audio = audioPreviewRef.current;
        audio.onplaying = null;
        audio.onerror = null;
        audio.onended = null;
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        audioPreviewRef.current = null;
      }
      setPreviewingId(null);
      setPreviewLoadingId(null);
    }

    const updatedTracks = (musicSettings.tracks || []).filter((t, i) => {
      if (trackId && t.id) {
        return t.id !== trackId;
      }
      if (typeof index === "number") {
        return i !== index;
      }
      return true;
    });

    onChange({
      ...musicSettings,
      tracks: updatedTracks
    });

    if (showToast) showToast("Трек успешно удален", "info");
  };

  const handleRemoveAllTracks = (genreId?: string) => {
    if (audioPreviewRef.current) {
      const audio = audioPreviewRef.current;
      audio.onplaying = null;
      audio.onerror = null;
      audio.onended = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioPreviewRef.current = null;
    }
    setPreviewingId(null);
    setPreviewLoadingId(null);

    if (genreId) {
      const genreObj = PRESET_RADIO_STATIONS.find(s => s.id === genreId);
      const updated = (musicSettings.tracks || []).filter(t => (t.genre || "lounge") !== genreId);
      onChange({ ...musicSettings, tracks: updated });
      if (showToast) showToast(`Все треки стиля «${genreObj?.name || genreId}» удалены`, "info");
    } else {
      onChange({ ...musicSettings, tracks: [] });
      if (showToast) showToast("Все треки удалены из плейлиста", "info");
    }
  };

  return (
    <div className="space-y-6 font-sans text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-app-border pb-4">
        <div>
          <h4 className="text-xs font-bold font-mono text-app-primary uppercase tracking-wider flex items-center gap-2">
            <Music size={16} className="text-app-muted" />
            Музыка и Атмосфера заведения
          </h4>
          <p className="text-xs text-app-muted mt-1 font-sans">
            Позвольте гостям слушать музыку и плейлисты вашего заведения прямо в мини-аппе
          </p>
        </div>

        {/* Global Enabled Toggle - High Contrast & Clearly Visible in both light and dark themes */}
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(musicSettings.enabled)}
          onClick={() => onChange({ ...musicSettings, enabled: !musicSettings.enabled })}
          className="flex items-center gap-3 cursor-pointer group focus:outline-none select-none shrink-0"
        >
          <div
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out border ${
              musicSettings.enabled
                ? "bg-emerald-500 border-emerald-600 shadow-sm"
                : "bg-zinc-300 dark:bg-zinc-700 border-zinc-400/60 dark:border-zinc-600"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                musicSettings.enabled ? "translate-x-5.5" : "translate-x-0.5"
              }`}
            />
          </div>
          <span
            className={`text-xs font-mono font-bold transition-colors ${
              musicSettings.enabled
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {musicSettings.enabled ? "Включено" : "Выключено"}
          </span>
        </button>
      </div>

      {musicSettings.enabled && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* General Playlist Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono text-app-muted uppercase tracking-wider">
                  Название плейлиста / радиостанции
                </label>
                <span className="text-[10px] font-mono text-app-muted">
                  {(musicSettings.title || "").length}/{MAX_TITLE_LEN}
                </span>
              </div>
              <input
                type="text"
                maxLength={MAX_TITLE_LEN}
                value={musicSettings.title || ""}
                onChange={(e) => onChange({ ...musicSettings, title: e.target.value })}
                placeholder="Например: Плейлист салона «Атмосфера»"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono text-app-muted uppercase tracking-wider">
                  Описание или слоган плейлиста
                </label>
                <span className="text-[10px] font-mono text-app-muted">
                  {(musicSettings.description || "").length}/{MAX_DESC_LEN}
                </span>
              </div>
              <input
                type="text"
                maxLength={MAX_DESC_LEN}
                value={musicSettings.description || ""}
                onChange={(e) => onChange({ ...musicSettings, description: e.target.value })}
                placeholder="Например: Музыка, которая играет у нас каждый день"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
              />
            </div>
          </div>

          {/* Source Type Selector */}
          <div className="space-y-3">
            <label className="block text-[11px] font-mono text-app-muted uppercase tracking-wider">
              Источник музыки и воспроизведения
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  type: "radio" as const,
                  title: "Фоновое радио",
                  desc: "Готовые стильные потоки",
                  icon: Radio
                },
                {
                  type: "playlist" as const,
                  title: "Стриминги",
                  desc: "Яндекс, Spotify, VK и др.",
                  icon: ExternalLink
                },
                {
                  type: "tracks" as const,
                  title: "Свои треки",
                  desc: "MP3 аудиофайлы и ссылки",
                  icon: Disc
                },
                {
                  type: "custom" as const,
                  title: "Свой поток",
                  desc: "Прямой Stream URL",
                  icon: Sliders
                }
              ].map((src) => {
                const isSelected = (musicSettings.sourceType || "playlist") === src.type;
                const Icon = src.icon;
                return (
                  <div
                    key={src.type}
                    onClick={() => onChange({ ...musicSettings, sourceType: src.type })}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "bg-app-accent text-app-accent-fg border-transparent shadow-sm"
                        : "bg-app-card hover:bg-app-hover border-app-border text-app-secondary hover:text-app-primary"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon size={18} />
                      {isSelected && <Check size={14} />}
                    </div>
                    <div>
                      <div className="font-mono font-bold text-xs">{src.title}</div>
                      <div className={`text-[10px] mt-0.5 font-sans ${isSelected ? "opacity-80" : "text-app-muted"}`}>
                        {src.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SOURCE 1: PRESET RADIO */}
          {musicSettings.sourceType === "radio" && (() => {
            const selectedGenreId = musicSettings.selectedRadioGenre || "lounge";
            const activeStation = PRESET_RADIO_STATIONS.find((s) => s.id === selectedGenreId) || PRESET_RADIO_STATIONS[0];
            const allTracks = musicSettings.tracks || [];
            const stationTracks = allTracks.filter(
              (t) => (t.genre || "lounge") === activeStation.id
            );

            return (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono text-app-muted uppercase tracking-wider mb-2">
                    Выберите стиль радиостанции
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PRESET_RADIO_STATIONS.map((station) => {
                      const isSelected = selectedGenreId === station.id;
                      const isPreview = previewingId === station.id;
                      const isLoading = previewLoadingId === station.id;
                      const countTracks = allTracks.filter(
                        (t) => (t.genre || "lounge") === station.id
                      ).length;

                      return (
                        <div
                          key={station.id}
                          onClick={() => onChange({ ...musicSettings, selectedRadioGenre: station.id })}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-app-card border-app-accent shadow-xs ring-1 ring-app-accent/20"
                              : "bg-app-card hover:bg-app-hover border-app-border"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "bg-app-accent text-app-accent-fg"
                                  : "bg-app-surface text-app-muted"
                              }`}
                            >
                              <Radio size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-xs text-app-primary truncate">
                                  {station.name}
                                </span>
                                {countTracks > 0 && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-app-surface border border-app-border text-app-muted shrink-0">
                                    +{countTracks}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-app-muted font-sans truncate">
                                {station.desc}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePreview(station.id, station.streamUrl, station.fallbackUrl);
                            }}
                            className={`p-2 rounded-lg border transition-all shrink-0 cursor-pointer ${
                              isPreview
                                ? "bg-emerald-500 text-white border-transparent shadow-sm"
                                : isLoading
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse"
                                : "bg-app-surface border-app-border text-app-muted hover:text-app-primary"
                            }`}
                            title={isPreview ? "Остановить" : isLoading ? "Загрузка потока..." : "Прослушать онлайн-поток"}
                          >
                            {isPreview ? (
                              <Pause size={13} />
                            ) : isLoading ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Play size={13} />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-section: Tracks for the selected Radio Style */}
                <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-app-border/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Disc size={15} className="text-app-muted" />
                        <h5 className="font-mono font-bold text-xs text-app-primary">
                          Треки в стиле «{activeStation.name}»
                        </h5>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-app-surface border border-app-border text-app-muted">
                          {stationTracks.length} {stationTracks.length === 1 ? "трек" : stationTracks.length >= 2 && stationTracks.length <= 4 ? "трека" : "треков"}
                        </span>
                      </div>
                      <p className="text-[11px] text-app-muted font-sans mt-0.5">
                        Вы можете добавлять свои композиции в выбранный стиль радиостанции или удалять их.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {stationTracks.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAllTracks(activeStation.id)}
                          className="px-2.5 py-1.5 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 border border-rose-500/20 rounded-xl text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1.5"
                          title="Удалить все добавленные треки из этого стиля"
                        >
                          <Trash2 size={12} />
                          <span>Очистить стиль</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsAddingRadioTrack(!isAddingRadioTrack)}
                        className="px-3 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border rounded-xl text-app-primary text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <Plus size={13} />
                        <span>{isAddingRadioTrack ? "Скрыть форму" : "Добавить трек"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Add Track to Radio Style Form */}
                  {isAddingRadioTrack && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-3.5 bg-app-surface border border-app-border rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] text-app-primary font-bold">
                          Новый трек для стиля «{activeStation.name}»
                        </span>
                        <span className="font-mono text-[10px] text-app-muted">
                          Лимит: {allTracks.length}/{MAX_CUSTOM_TRACKS}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono text-app-muted mb-1">
                            Название трека *
                          </label>
                          <input
                            type="text"
                            maxLength={MAX_TRACK_TITLE_LEN}
                            value={radioTrackTitle}
                            onChange={(e) => setRadioTrackTitle(e.target.value)}
                            placeholder="Coffee Breeze"
                            className="w-full bg-app-card border border-app-border rounded-lg px-2.5 py-1.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-app-muted mb-1">
                            Исполнитель
                          </label>
                          <input
                            type="text"
                            maxLength={MAX_ARTIST_LEN}
                            value={radioTrackArtist}
                            onChange={(e) => setRadioTrackArtist(e.target.value)}
                            placeholder="Lounge Band"
                            className="w-full bg-app-card border border-app-border rounded-lg px-2.5 py-1.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-app-muted mb-1">
                            Ссылка на аудиофайл (MP3 / Direct URL) *
                          </label>
                          <input
                            type="url"
                            maxLength={MAX_URL_LEN}
                            value={radioTrackUrl}
                            onChange={(e) => setRadioTrackUrl(e.target.value)}
                            placeholder="https://example.com/track.mp3"
                            className="w-full bg-app-card border border-app-border rounded-lg px-2.5 py-1.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                          />
                        </div>
                      </div>

                      {detectedRadioStreaming?.isStreamingWebUrl && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-app-card border border-app-border rounded-xl flex items-start gap-2.5"
                        >
                          <AlertTriangle size={15} className="text-app-muted shrink-0 mt-0.5" />
                          <div className="space-y-0.5 min-w-0 text-xs">
                            <p className="font-semibold text-app-primary">
                              Обнаружена ссылка сервиса {detectedRadioStreaming.serviceName}
                            </p>
                            <p className="text-app-muted leading-relaxed font-sans text-[11px]">
                              Для радио рекомендуется прямая ссылка на аудиофайл (<span className="font-mono text-app-primary">.mp3</span> / прямой онлайн-поток). Ссылки {detectedRadioStreaming.serviceName} открываются в приложении сервиса.
                            </p>
                          </div>
                        </motion.div>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingRadioTrack(false);
                            setRadioTrackTitle("");
                            setRadioTrackArtist("");
                            setRadioTrackUrl("");
                          }}
                          className="px-3 py-1.5 bg-app-card hover:bg-app-hover border border-app-border text-app-muted hover:text-app-primary font-mono text-xs rounded-lg transition-all cursor-pointer"
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddRadioTrack(activeStation.id)}
                          className="px-4 py-1.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-lg hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <Plus size={13} />
                          <span>Сохранить в «{activeStation.name}»</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* List of tracks for this specific style */}
                  {stationTracks.length === 0 ? (
                    <div className="p-4 bg-app-surface/60 border border-dashed border-app-border rounded-xl text-center text-app-muted font-mono text-[11px]">
                      В стиле «{activeStation.name}» пока нет отдельных загруженных треков. Воспроизводится онлайн-поток станции. Нажмите «Добавить трек», чтобы дополнить стиль своими аудиозаписями.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stationTracks.map((track, sIdx) => {
                        const trackIdentifier = track.id || `station-track-${sIdx}`;
                        const isPreview = previewingId === trackIdentifier;
                        const isLoading = previewLoadingId === trackIdentifier;
                        const serviceInfo = detectStreamingService(track.url);

                        return (
                          <div
                            key={trackIdentifier}
                            className="p-2.5 bg-app-surface border border-app-border rounded-xl flex items-center justify-between gap-3 hover:border-app-border/80 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-mono text-xs text-app-muted w-5 text-center shrink-0">
                                {sIdx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs text-app-primary truncate">
                                    {track.title}
                                  </span>
                                  {serviceInfo.isStreamingWebUrl && (
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono border font-semibold ${serviceInfo.badgeClass}`}>
                                      {serviceInfo.badge}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-app-muted truncate font-sans">
                                  {track.artist || "Неизвестный исполнитель"}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {serviceInfo.isStreamingWebUrl ? (
                                <a
                                  href={track.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-app-card hover:bg-app-hover border border-app-border rounded-lg text-app-primary font-mono text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                                  title={`Открыть в ${serviceInfo.serviceName}`}
                                >
                                  <span>{serviceInfo.badge}</span>
                                  <ExternalLink size={11} className="text-app-muted" />
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePreview(trackIdentifier, track.url, `/api/audio-proxy?url=${encodeURIComponent(track.url)}`)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    isPreview
                                      ? "bg-emerald-500 text-white border-transparent shadow-sm"
                                      : isLoading
                                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse"
                                      : "bg-app-card border-app-border text-app-muted hover:text-app-primary"
                                  }`}
                                  title={isPreview ? "Остановить" : isLoading ? "Загрузка..." : "Прослушать трек"}
                                >
                                  {isPreview ? (
                                    <Pause size={12} />
                                  ) : isLoading ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <Play size={12} />
                                  )}
                                </button>
                              )}

                              {/* DELETE BUTTON FROM RADIO STYLE */}
                              <button
                                type="button"
                                onClick={() => handleRemoveTrack(track.id, allTracks.indexOf(track))}
                                className="p-1.5 bg-app-card hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 border border-app-border rounded-lg text-app-muted transition-all cursor-pointer flex items-center gap-1"
                                title="Удалить трек из этого стиля"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* SOURCE 2: STREAMING PLAYLISTS */}
          {musicSettings.sourceType === "playlist" && (
            <div className="space-y-4">
              <div className="p-3.5 bg-app-card/60 border border-app-border rounded-xl flex items-start gap-2.5">
                <Info size={16} className="text-app-muted shrink-0 mt-0.5" />
                <p className="text-xs text-app-muted font-sans leading-relaxed">
                  Укажите ссылки на ваши официальные плейлисты в популярных музыкальных сервисах. Гости смогут одним кликом открывать их в своих приложениях и подписываться.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                    Яндекс.Музыка (Ссылка на плейлист / альбом / трек)
                  </label>
                  <input
                    type="url"
                    maxLength={MAX_URL_LEN}
                    value={musicSettings.yandexMusicUrl || ""}
                    onChange={(e) => onChange({ ...musicSettings, yandexMusicUrl: e.target.value })}
                    placeholder="https://music.yandex.ru/album/.../track/..."
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                    Spotify (Ссылка на плейлист)
                  </label>
                  <input
                    type="url"
                    maxLength={MAX_URL_LEN}
                    value={musicSettings.spotifyUrl || ""}
                    onChange={(e) => onChange({ ...musicSettings, spotifyUrl: e.target.value })}
                    placeholder="https://open.spotify.com/playlist/..."
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                    VK Музыка (Ссылка на плейлист)
                  </label>
                  <input
                    type="url"
                    maxLength={MAX_URL_LEN}
                    value={musicSettings.vkMusicUrl || ""}
                    onChange={(e) => onChange({ ...musicSettings, vkMusicUrl: e.target.value })}
                    placeholder="https://vk.com/music/playlist/..."
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                    Apple Music (Ссылка на плейлист)
                  </label>
                  <input
                    type="url"
                    maxLength={MAX_URL_LEN}
                    value={musicSettings.appleMusicUrl || ""}
                    onChange={(e) => onChange({ ...musicSettings, appleMusicUrl: e.target.value })}
                    placeholder="https://music.apple.com/.../playlist/..."
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                    SoundCloud (Ссылка на плейлист или трек)
                  </label>
                  <input
                    type="url"
                    maxLength={MAX_URL_LEN}
                    value={musicSettings.soundcloudUrl || ""}
                    onChange={(e) => onChange({ ...musicSettings, soundcloudUrl: e.target.value })}
                    placeholder="https://soundcloud.com/.../sets/..."
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                    YouTube Music (Ссылка на плейлист)
                  </label>
                  <input
                    type="url"
                    maxLength={MAX_URL_LEN}
                    value={musicSettings.youtubeMusicUrl || ""}
                    onChange={(e) => onChange({ ...musicSettings, youtubeMusicUrl: e.target.value })}
                    placeholder="https://music.youtube.com/playlist?list=..."
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SOURCE 3: CUSTOM TRACKS */}
          {musicSettings.sourceType === "tracks" && (() => {
            const allTracks = musicSettings.tracks || [];
            const filteredTracks = filterGenre === "all"
              ? allTracks
              : allTracks.filter((t) => (t.genre || "lounge") === filterGenre);

            return (
              <div className="space-y-4">
                <div className="p-4 bg-app-card border border-app-border rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-mono font-bold text-xs text-app-primary flex items-center gap-2">
                      <Plus size={14} className="text-app-muted" />
                      Добавить трек в плейлист
                    </h5>
                    <span className="font-mono text-[10px] text-app-muted">
                      Треков: {allTracks.length}/{MAX_CUSTOM_TRACKS}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-app-muted mb-1">
                        Название трека * ({newTrackTitle.length}/{MAX_TRACK_TITLE_LEN})
                      </label>
                      <input
                        type="text"
                        maxLength={MAX_TRACK_TITLE_LEN}
                        value={newTrackTitle}
                        onChange={(e) => setNewTrackTitle(e.target.value)}
                        placeholder="Sunset Lounge"
                        className="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-app-muted mb-1">
                        Исполнитель ({newTrackArtist.length}/{MAX_ARTIST_LEN})
                      </label>
                      <input
                        type="text"
                        maxLength={MAX_ARTIST_LEN}
                        value={newTrackArtist}
                        onChange={(e) => setNewTrackArtist(e.target.value)}
                        placeholder="Chillhop Music"
                        className="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2 text-xs text-app-primary focus:outline-none focus:border-app-accent font-sans"
                      />
                    </div>
                    <div className="relative" ref={genreDropdownRef}>
                      <label className="block text-[10px] font-mono text-app-muted mb-1">
                        Стиль радио / Жанр
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsGenreDropdownOpen(!isGenreDropdownOpen)}
                        className={`w-full bg-app-surface border border-app-border rounded-xl px-3 py-2 text-xs text-app-primary flex items-center justify-between gap-2 hover:bg-app-hover hover:border-app-border/80 transition-all cursor-pointer select-none font-mono ${
                          isGenreDropdownOpen ? "ring-2 ring-app-accent/30 border-app-accent" : ""
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Radio size={13} className="text-app-muted shrink-0" />
                          <span className="truncate font-semibold font-mono">
                            {PRESET_RADIO_STATIONS.find((s) => s.id === newTrackGenre)?.name || "Lounge & Coffee"}
                          </span>
                        </span>
                        <ChevronDown
                          size={14}
                          className={`text-app-muted transition-transform duration-200 shrink-0 ${
                            isGenreDropdownOpen ? "rotate-180 text-app-primary" : ""
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {isGenreDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.97, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: -4 }}
                            transition={{ duration: 0.12, ease: "easeOut" }}
                            className="absolute left-0 right-0 mt-1.5 min-w-[220px] bg-app-card border border-app-border rounded-xl shadow-xl z-50 p-1.5 backdrop-blur-md overflow-hidden"
                          >
                            <div className="max-h-60 overflow-y-auto space-y-1">
                              {PRESET_RADIO_STATIONS.map((station) => {
                                const isSelected = station.id === newTrackGenre;
                                return (
                                  <button
                                    key={station.id}
                                    type="button"
                                    onClick={() => {
                                      setNewTrackGenre(station.id);
                                      setIsGenreDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-app-surface border border-app-accent/40 text-app-primary font-bold shadow-2xs"
                                        : "text-app-primary hover:bg-app-hover border border-transparent"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div
                                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                          isSelected
                                            ? "bg-app-accent text-app-accent-fg"
                                            : "bg-app-surface text-app-muted"
                                        }`}
                                      >
                                        <Radio size={12} />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-mono text-xs truncate">
                                          {station.name}
                                        </div>
                                        <div className="text-[10px] text-app-muted font-sans truncate">
                                          {station.desc}
                                        </div>
                                      </div>
                                    </div>

                                    {isSelected && (
                                      <Check size={14} className="text-app-primary shrink-0 ml-1" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-app-muted mb-1">
                        Ссылка на трек или аудиофайл *
                      </label>
                      <input
                        type="url"
                        maxLength={MAX_URL_LEN}
                        value={newTrackUrl}
                        onChange={(e) => setNewTrackUrl(e.target.value)}
                        placeholder="https://example.com/track.mp3"
                        className="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                      />
                    </div>
                  </div>

                  {/* Warning / Suggestion if user enters a streaming URL */}
                  {detectedStreaming?.isStreamingWebUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-app-card border border-app-border rounded-xl flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <AlertTriangle size={15} className="text-app-muted shrink-0 mt-0.5" />
                        <div className="space-y-0.5 min-w-0 text-xs">
                          <p className="font-semibold text-app-primary">
                            Обнаружена ссылка сервиса {detectedStreaming.serviceName}
                          </p>
                          <p className="text-app-muted text-[11px] leading-relaxed font-sans">
                            Веб-треки открываются в приложении сервиса. Вы можете перенести ссылку в раздел «Стриминги» или оставить в списке как быстрый веб-трек.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleTransferToStreaming}
                        className="px-3 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary font-mono text-[11px] rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <span>Перенести</span>
                        <ArrowRight size={12} className="text-app-muted" />
                      </button>
                    </motion.div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleAddTrack()}
                      disabled={allTracks.length >= MAX_CUSTOM_TRACKS}
                      className="px-4 py-2 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Plus size={14} />
                      <span>Добавить трек</span>
                    </button>
                  </div>
                </div>

                {/* Genre Filter & Clear buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilterGenre("all")}
                      className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${
                        filterGenre === "all"
                          ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                          : "bg-app-card hover:bg-app-hover border border-app-border text-app-muted"
                      }`}
                    >
                      Все ({allTracks.length})
                    </button>
                    {PRESET_RADIO_STATIONS.map((station) => {
                      const count = allTracks.filter((t) => (t.genre || "lounge") === station.id).length;
                      return (
                        <button
                          key={station.id}
                          type="button"
                          onClick={() => setFilterGenre(station.id)}
                          className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${
                            filterGenre === station.id
                              ? "bg-app-accent text-app-accent-fg font-bold shadow-xs"
                              : "bg-app-card hover:bg-app-hover border border-app-border text-app-muted"
                          }`}
                        >
                          {station.name.split(" ")[0]} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {allTracks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAllTracks(filterGenre === "all" ? undefined : filterGenre)}
                      className="px-2.5 py-1 text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 rounded-lg text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Trash2 size={11} />
                      <span>{filterGenre === "all" ? "Удалить все треки" : `Очистить категорию`}</span>
                    </button>
                  )}
                </div>

                {/* Tracks List */}
                <div className="space-y-2">
                  {filteredTracks.length === 0 ? (
                    <div className="p-6 bg-app-card/50 border border-dashed border-app-border rounded-xl text-center text-app-muted font-mono text-xs">
                      {allTracks.length === 0
                        ? "В плейлисте пока нет добавленных треков. Добавьте первый трек выше!"
                        : "В выбранной категории нет добавленных треков."}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTracks.map((track, idx) => {
                        const trackIdKey = track.id || `custom-track-${idx}`;
                        const isPreview = previewingId === trackIdKey;
                        const isLoading = previewLoadingId === trackIdKey;
                        const serviceInfo = detectStreamingService(track.url);
                        const stationInfo = PRESET_RADIO_STATIONS.find((s) => s.id === (track.genre || "lounge"));

                        return (
                          <div
                            key={trackIdKey}
                            className="p-3 bg-app-card border border-app-border rounded-xl flex items-center justify-between gap-3 hover:border-app-border/80 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-mono text-xs text-app-muted w-5 text-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-xs text-app-primary truncate">
                                    {track.title}
                                  </span>
                                  {stationInfo && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-app-surface border border-app-border text-app-muted">
                                      {stationInfo.name.split(" ")[0]}
                                    </span>
                                  )}
                                  {serviceInfo.isStreamingWebUrl && (
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono border font-semibold ${serviceInfo.badgeClass}`}>
                                      {serviceInfo.badge}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-app-muted truncate font-sans">
                                  {track.artist || "Неизвестный исполнитель"}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {serviceInfo.isStreamingWebUrl ? (
                                <a
                                  href={track.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 bg-app-surface hover:bg-app-hover border border-app-border rounded-lg text-app-primary font-mono text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                                  title={`Открыть в ${serviceInfo.serviceName}`}
                                >
                                  <span>{serviceInfo.badge}</span>
                                  <ExternalLink size={12} className="text-app-muted" />
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePreview(trackIdKey, track.url, `/api/audio-proxy?url=${encodeURIComponent(track.url)}`)}
                                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                                    isPreview
                                      ? "bg-emerald-500 text-white border-transparent shadow-sm"
                                      : isLoading
                                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse"
                                      : "bg-app-surface border-app-border text-app-muted hover:text-app-primary"
                                  }`}
                                  title={isPreview ? "Остановить" : isLoading ? "Загрузка..." : "Прослушать трек"}
                                >
                                  {isPreview ? (
                                    <Pause size={12} />
                                  ) : isLoading ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <Play size={12} />
                                  )}
                                </button>
                              )}

                              {/* DELETE BUTTON */}
                              <button
                                type="button"
                                onClick={() => handleRemoveTrack(track.id, allTracks.indexOf(track))}
                                className="p-2 bg-app-surface hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 border border-app-border rounded-lg text-app-muted transition-all cursor-pointer flex items-center justify-center"
                                title="Удалить трек из плейлиста"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* SOURCE 4: CUSTOM STREAM */}
          {musicSettings.sourceType === "custom" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-app-muted mb-1.5 uppercase tracking-wider">
                  Прямой URL аудиопотока (Icecast / Shoutcast / MP3 Stream)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    maxLength={MAX_URL_LEN}
                    value={musicSettings.customStreamUrl || ""}
                    onChange={(e) => onChange({ ...musicSettings, customStreamUrl: e.target.value })}
                    placeholder="https://ice1.somafm.com/groovesalad-128-mp3"
                    className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary focus:outline-none focus:border-app-accent font-mono"
                  />
                    {musicSettings.customStreamUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          handleTogglePreview(
                            "custom-stream",
                            musicSettings.customStreamUrl || "",
                            `/api/audio-proxy?url=${encodeURIComponent(musicSettings.customStreamUrl || "")}`
                          )
                        }
                        className={`px-3 py-2.5 border rounded-xl font-mono text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-all ${
                          previewingId === "custom-stream"
                            ? "bg-emerald-500 text-white border-transparent shadow-sm"
                            : previewLoadingId === "custom-stream"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse"
                            : "bg-app-card border-app-border text-app-primary hover:bg-app-hover"
                        }`}
                      >
                        {previewingId === "custom-stream" ? (
                          <Pause size={14} />
                        ) : previewLoadingId === "custom-stream" ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Play size={14} />
                        )}
                        <span>Тест</span>
                      </button>
                    )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
