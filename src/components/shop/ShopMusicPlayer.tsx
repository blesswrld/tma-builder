import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  Radio,
  Disc3,
  ListMusic,
  X,
  Share2,
  Check,
  AlertCircle
} from "lucide-react";
import { Shop, MusicTrack, parseMusicSettings } from "../../types";
import { useScrollLock } from "../../hooks/useScrollLock";
import { detectStreamingService, isDirectPlayableAudioUrl } from "../../utils/musicHelper";

// Высококачественные проверенные потоки без авторских отчислений для фонового лаунжа
export const PRESET_RADIO_GENRES = [
  {
    id: "lounge",
    name: "Lounge & Coffee",
    description: "Мягкий расслабляющий лаунж для кофеен и ресторанов",
    streamUrl: "/api/radio-stream/lounge",
    fallbackUrl: "https://ice1.somafm.com/groovesalad-128-mp3",
    iconColor: "text-amber-400",
    bgGradient: "from-amber-500/20 to-orange-500/10"
  },
  {
    id: "lofi",
    name: "Lo-Fi Chill & Beats",
    description: "Уютный чилловый бит для студий, креативных салонов и работы",
    streamUrl: "/api/radio-stream/lofi",
    fallbackUrl: "https://ice1.somafm.com/illstreet-128-mp3",
    iconColor: "text-purple-400",
    bgGradient: "from-purple-500/20 to-indigo-500/10"
  },
  {
    id: "deephouse",
    name: "Deep House & Salon",
    description: "Стильный динамичный фон для барбершопов и бьюти-салонов",
    streamUrl: "/api/radio-stream/deephouse",
    fallbackUrl: "https://ice1.somafm.com/beatblender-128-mp3",
    iconColor: "text-emerald-400",
    bgGradient: "from-emerald-500/20 to-teal-500/10"
  },
  {
    id: "jazz",
    name: "Smooth Jazz & Cafe",
    description: "Теплый живой джаз и акустика для гастробаров и бутиков",
    streamUrl: "/api/radio-stream/jazz",
    fallbackUrl: "https://ice1.somafm.com/secretagent-128-mp3",
    iconColor: "text-yellow-400",
    bgGradient: "from-yellow-500/20 to-amber-500/10"
  },
  {
    id: "spa",
    name: "Ambient Spa & Relax",
    description: "Спокойный гармоничный релакс для спа, массажа и клиник",
    streamUrl: "/api/radio-stream/spa",
    fallbackUrl: "https://ice1.somafm.com/deepspaceone-128-mp3",
    iconColor: "text-sky-400",
    bgGradient: "from-sky-500/20 to-blue-500/10"
  }
];

interface ShopMusicPlayerProps {
  shop: Shop;
  isModalOpen: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
}

export const ShopMusicPlayer: React.FC<ShopMusicPlayerProps> = ({
  shop,
  isModalOpen,
  onCloseModal,
  onOpenModal,
}) => {
  useScrollLock(isModalOpen);
  const musicSettings = parseMusicSettings(shop.musicSettings);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Определяем активный источник воспроизведения
  const sourceType = musicSettings.sourceType || "playlist";
  const selectedGenre = PRESET_RADIO_GENRES.find(
    (g) => g.id === musicSettings.selectedRadioGenre
  ) || PRESET_RADIO_GENRES[0];

  const tracks: MusicTrack[] = Array.isArray(musicSettings.tracks) && musicSettings.tracks.length > 0
    ? musicSettings.tracks
    : [];

  const currentTrack = tracks[currentTrackIndex] || null;
  const currentTrackStreaming = currentTrack ? detectStreamingService(currentTrack.url) : null;

  // Определяем рабочий прямой URL для аудио (только если это прямой аудиофайл / поток)
  const getActiveAudioUrl = (): string | null => {
    if (sourceType === "tracks" && currentTrack?.url) {
      if (isDirectPlayableAudioUrl(currentTrack.url)) {
        return currentTrack.url;
      }
      return null;
    }
    if (sourceType === "custom" && musicSettings.customStreamUrl) {
      if (isDirectPlayableAudioUrl(musicSettings.customStreamUrl)) {
        return musicSettings.customStreamUrl;
      }
      return null;
    }
    if (sourceType === "radio") {
      return selectedGenre.streamUrl;
    }
    return null;
  };

  const audioUrl = getActiveAudioUrl();
  const canPlayDirectAudio = Boolean(audioUrl);

  // Инициализация аудио элемента
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "none";
      audioRef.current = audio;
    }

    const audio = audioRef.current;

    const handleWaiting = () => setAudioLoading(true);
    const handlePlaying = () => {
      setAudioLoading(false);
      setAudioError(false);
    };
    const handleError = () => {
      setAudioLoading(false);
      setAudioError(true);
      setIsPlaying(false);
    };
    const handleEnded = () => {
      if (sourceType === "tracks" && tracks.length > 1) {
        // Find next playable audio track
        const nextIndex = (currentTrackIndex + 1) % tracks.length;
        setCurrentTrackIndex(nextIndex);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("error", handleError);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Синхронизация источника при смене трека или стрима
  useEffect(() => {
    if (audioRef.current) {
      if (audioUrl) {
        const isCurrentlyPlaying = isPlaying;
        audioRef.current.src = audioUrl;
        audioRef.current.volume = isMuted ? 0 : volume;
        if (isCurrentlyPlaying) {
          setAudioLoading(true);
          audioRef.current
            .play()
            .catch((err) => {
              if (err?.name !== "AbortError") {
                setIsPlaying(false);
                setAudioLoading(false);
              }
            });
        }
      } else {
        audioRef.current.pause();
        audioRef.current.src = "";
        if (isPlaying) {
          setIsPlaying(false);
        }
      }
    }
  }, [audioUrl, currentTrackIndex]);

  // Управление воспроизведением
  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setAudioLoading(true);
      setAudioError(false);
      if (!audioRef.current.src || audioRef.current.src !== audioUrl) {
        audioRef.current.src = audioUrl;
      }
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setAudioLoading(false);
        })
        .catch((err) => {
          console.warn("Audio play blocked or error:", err);
          setIsPlaying(false);
          setAudioLoading(false);
          setAudioError(true);
        });
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioRef.current.volume = newMuted ? 0 : volume;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : val;
    }
  };

  // Внешние ссылки на сервисы
  const playlistLinks = [
    {
      name: "Яндекс Музыка",
      url: musicSettings.yandexMusicUrl || (musicSettings.playlistUrl?.includes("yandex") ? musicSettings.playlistUrl : null),
      color: "from-amber-500 to-yellow-500 text-black",
      badge: "Яндекс",
    },
    {
      name: "VK Музыка",
      url: musicSettings.vkMusicUrl || (musicSettings.playlistUrl?.includes("vk.com") ? musicSettings.playlistUrl : null),
      color: "from-blue-600 to-sky-500 text-white",
      badge: "VK",
    },
    {
      name: "Spotify",
      url: musicSettings.spotifyUrl || (musicSettings.playlistUrl?.includes("spotify") ? musicSettings.playlistUrl : null),
      color: "from-emerald-600 to-green-500 text-white",
      badge: "Spotify",
    },
    {
      name: "Apple Music",
      url: musicSettings.appleMusicUrl || (musicSettings.playlistUrl?.includes("apple") ? musicSettings.playlistUrl : null),
      color: "from-rose-600 to-pink-500 text-white",
      badge: "Apple",
    },
    {
      name: "SoundCloud",
      url: musicSettings.soundcloudUrl || (musicSettings.playlistUrl?.includes("soundcloud") ? musicSettings.playlistUrl : null),
      color: "from-orange-600 to-amber-500 text-white",
      badge: "SoundCloud",
    },
    {
      name: "YouTube Music",
      url: musicSettings.youtubeMusicUrl || (musicSettings.playlistUrl?.includes("youtube") ? musicSettings.playlistUrl : null),
      color: "from-red-600 to-rose-500 text-white",
      badge: "YouTube",
    },
  ].filter((p) => Boolean(p.url));

  // Если указана только общая ссылка
  if (
    musicSettings.playlistUrl &&
    !playlistLinks.some((p) => p.url === musicSettings.playlistUrl)
  ) {
    playlistLinks.unshift({
      name: "Открыть плейлист",
      url: musicSettings.playlistUrl,
      color: "from-zinc-700 to-zinc-800 text-white",
      badge: "Плейлист",
    });
  }

  const hasAnyContent =
    musicSettings.enabled !== false &&
    (playlistLinks.length > 0 ||
      canPlayDirectAudio ||
      tracks.length > 0 ||
      musicSettings.title ||
      musicSettings.description);

  if (!hasAnyContent) return null;

  const displayTitle =
    musicSettings.title ||
    (sourceType === "radio" ? selectedGenre.name : "Музыка заведения");
  const displayDescription =
    musicSettings.description ||
    (sourceType === "radio"
      ? selectedGenre.description
      : "Саундтрек и любимые треки, создающие атмосферу в нашем салоне");

  return (
    <>
      {/* 1. Плавающий компактный виджет внизу экрана (только для Desktop) */}
      <div className="hidden lg:block fixed bottom-6 right-6 z-40 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 260 }}
          className="flex items-center gap-2"
        >
          <div
            onClick={onOpenModal}
            role="button"
            tabIndex={0}
            className={`group relative flex items-center gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl border backdrop-blur-xl shadow-xl transition-all cursor-pointer select-none ${
              isPlaying
                ? "bg-app-card/95 border-emerald-500/50 shadow-emerald-500/10 text-app-primary"
                : "bg-app-card/90 hover:bg-app-card border-app-border text-app-secondary hover:text-app-primary"
            }`}
          >
            {/* Анимированный эквалайзер / иконка диска */}
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-app-surface border border-app-border shrink-0 overflow-hidden">
              {isPlaying ? (
                <div className="flex items-end justify-center gap-0.5 h-4 w-4">
                  <span className="w-1 bg-emerald-500 rounded-full animate-[bounce_0.6s_infinite_ease-in-out]" style={{ height: "60%" }} />
                  <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_ease-in-out]" style={{ height: "100%" }} />
                  <span className="w-1 bg-emerald-500 rounded-full animate-[bounce_0.5s_infinite_ease-in-out]" style={{ height: "40%" }} />
                </div>
              ) : (
                <Disc3 size={17} className="text-app-muted group-hover:text-app-primary transition-transform group-hover:rotate-45 duration-300" />
              )}
            </div>

            {/* Текст и статус */}
            <div className="text-left pr-1 max-w-[130px] sm:max-w-[180px] min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-mono font-bold truncate text-app-primary">
                  {displayTitle}
                </span>
                {isPlaying && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                )}
              </div>
              <p className="text-[10px] font-mono text-app-muted truncate">
                {isPlaying
                  ? audioLoading
                    ? "Подключение..."
                    : "Играет сейчас"
                  : playlistLinks.length > 0
                  ? "Плейлист заведения"
                  : "Фоновая музыка"}
              </p>
            </div>

            {/* Кнопка быстрого Play/Pause если доступно прямое аудио */}
            {canPlayDirectAudio && (
              <button
                type="button"
                onClick={togglePlay}
                className="w-8 h-8 rounded-xl bg-app-surface hover:bg-app-hover border border-app-border flex items-center justify-center text-app-primary transition-all cursor-pointer shrink-0 active:scale-95"
                title={isPlaying ? "Пауза" : "Воспроизвести"}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* 2. Полноэкранное модальное окно «Музыка заведения» */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-app-card border border-app-border rounded-3xl shadow-2xl overflow-hidden z-10 font-sans"
            >
              {/* Шапка модалки */}
              <div className="p-5 border-b border-app-border flex items-center justify-between bg-app-surface/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-app-accent text-app-accent-fg flex items-center justify-center shrink-0">
                    <Music size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold tracking-tight text-app-primary truncate">
                      Музыка заведения
                    </h3>
                    <p className="text-xs font-mono text-app-muted truncate">
                      {shop.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onCloseModal}
                  className="w-8 h-8 rounded-full bg-app-surface hover:bg-app-hover border border-app-border flex items-center justify-center text-app-muted hover:text-app-primary transition-all cursor-pointer"
                  title="Закрыть"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Тело модалки */}
              <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Карточка текущей атмосферы */}
                <div className="p-4 rounded-2xl bg-app-surface border border-app-border/80 space-y-3 relative overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono uppercase text-app-muted tracking-wider">
                          Атмосфера салона
                        </span>
                        {isPlaying && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            ON AIR
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-app-primary mt-1">
                        {displayTitle}
                      </h4>
                    </div>

                    <div className="w-12 h-12 rounded-2xl bg-app-card border border-app-border flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                      {shop.logoUrl ? (
                        <img
                          src={shop.logoUrl}
                          alt={shop.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Radio size={22} className="text-app-muted" />
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-app-secondary leading-relaxed">
                    {displayDescription}
                  </p>

                  {/* Аудиоконтроллер для прямого потока/mp3 */}
                  {canPlayDirectAudio && (
                    <div className="pt-2 border-t border-app-border/60 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={togglePlay}
                          disabled={audioLoading}
                          className={`flex-1 py-2.5 px-4 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] ${
                            isPlaying
                              ? "bg-app-card hover:bg-app-hover text-app-primary border border-app-border"
                              : "bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-400/40"
                          }`}
                        >
                          {isPlaying ? (
                            <>
                              <Pause size={15} />
                              <span>Приостановить</span>
                            </>
                          ) : (
                            <>
                              <Play size={15} className="ml-0.5" />
                              <span>{audioLoading ? "Загрузка..." : "Слушать онлайн"}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={toggleMute}
                          className="w-10 h-10 rounded-xl bg-app-card hover:bg-app-hover border border-app-border flex items-center justify-center text-app-secondary hover:text-app-primary transition-all cursor-pointer shrink-0"
                          title={isMuted ? "Включить звук" : "Выключить звук"}
                        >
                          {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                      </div>

                      {/* Регулятор громкости */}
                      <div className="flex items-center gap-3 px-1">
                        <span className="text-[11px] font-mono text-app-muted">Громкость:</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="flex-1 accent-emerald-500 cursor-pointer h-1.5 rounded-lg bg-app-card"
                        />
                        <span className="text-[11px] font-mono text-app-muted w-8 text-right">
                          {Math.round((isMuted ? 0 : volume) * 100)}%
                        </span>
                      </div>

                      {audioError && (
                        <p className="text-[11px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl text-center flex items-center justify-center gap-1.5">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>Не удалось загрузить аудиопоток. Откройте плейлист по ссылкам ниже.</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Кнопка внешнего стриминга для текущего трека (если это веб-ссылка, а не прямой MP3) */}
                  {sourceType === "tracks" && currentTrackStreaming?.isStreamingWebUrl && currentTrack?.url && (
                    <div className="pt-2 border-t border-app-border/60">
                      <a
                        href={currentTrack.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 bg-app-card hover:bg-app-hover border border-app-border rounded-xl font-mono text-xs font-bold text-app-primary flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                      >
                        <span>Слушать «{currentTrack.title}» в {currentTrackStreaming.serviceName}</span>
                        <ExternalLink size={14} className="text-app-muted" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Список пользовательских треков (если добавлены) */}
                {tracks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ListMusic size={14} className="text-app-muted" />
                      <span className="text-xs font-mono uppercase text-app-muted">
                        Треки салона ({tracks.length})
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {tracks.map((track, idx) => {
                        const isThisTrack = currentTrackIndex === idx;
                        const trackInfo = detectStreamingService(track.url);

                        return (
                          <div
                            key={track.id || idx}
                            onClick={() => {
                              if (trackInfo.isStreamingWebUrl) {
                                window.open(track.url, "_blank", "noopener,noreferrer");
                              } else {
                                if (isThisTrack) {
                                  togglePlay();
                                } else {
                                  setCurrentTrackIndex(idx);
                                  setIsPlaying(true);
                                }
                              }
                            }}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                              isThisTrack && isPlaying
                                ? "bg-app-card border-emerald-500/40 text-app-primary"
                                : "bg-app-surface/60 hover:bg-app-surface border-app-border text-app-secondary hover:text-app-primary"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-xs font-mono text-app-muted w-4 text-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-medium text-app-primary truncate">
                                    {track.title}
                                  </p>
                                  {trackInfo.isStreamingWebUrl && (
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono border font-semibold ${trackInfo.badgeClass}`}>
                                      {trackInfo.badge}
                                    </span>
                                  )}
                                </div>
                                {track.artist && (
                                  <p className="text-[10px] font-mono text-app-muted truncate">
                                    {track.artist}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {trackInfo.isStreamingWebUrl ? (
                                <ExternalLink size={13} className="text-app-muted" />
                              ) : (
                                <>
                                  {track.duration && (
                                    <span className="text-[10px] font-mono text-app-muted">
                                      {track.duration}
                                    </span>
                                  )}
                                  {isThisTrack && isPlaying ? (
                                    <Pause size={13} className="text-emerald-400" />
                                  ) : (
                                    <Play size={13} className="text-app-muted" />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Внешние стриминговые ссылки (Яндекс, Спотифай, ВК, Эппл) */}
                {playlistLinks.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase text-app-muted">
                        Слушать в приложениях
                      </span>
                      <span className="text-[10px] font-mono text-app-muted">
                        Добавить в медиатеку
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {playlistLinks.map((link, i) => (
                        <a
                          key={i}
                          href={link.url!}
                          target="_blank"
                          rel="noreferrer"
                          className="group p-3 rounded-2xl bg-app-surface hover:bg-app-card border border-app-border hover:border-app-border/80 transition-all flex items-center justify-between gap-3 shadow-xs cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-app-card border border-app-border flex items-center justify-center font-mono font-bold text-xs text-app-primary shrink-0 group-hover:scale-105 transition-transform">
                              {link.badge.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-app-primary truncate">
                                {link.name}
                              </p>
                              <p className="text-[10px] font-mono text-app-muted truncate">
                                Открыть официальный плейлист
                              </p>
                            </div>
                          </div>

                          <ExternalLink
                            size={14}
                            className="text-app-muted group-hover:text-app-primary transition-colors shrink-0"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Кнопка поделиться / скопировать ссылку */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.href);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2500);
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-app-surface hover:bg-app-hover border border-app-border text-xs font-mono font-medium text-app-secondary hover:text-app-primary transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check size={14} className="text-emerald-400" />
                        <span className="text-emerald-400">Ссылка скопирована!</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={14} className="text-app-muted" />
                        <span>Поделиться витриной с друзьями</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
