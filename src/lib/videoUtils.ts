export interface ShopVideo {
  id: string;
  type: "youtube" | "vk" | "rutube" | "file";
  url: string;
  embedUrl?: string;
  title?: string;
  size?: number;
}

export const MAX_VIDEO_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB
export const MAX_VIDEO_FILE_SIZE_LABEL = "30 МБ";

/**
 * Extracts a clean URL if the user accidentally pasted an entire iframe tag
 */
export function extractUrlFromIframeOrText(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  const iframeSrcMatch = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    return iframeSrcMatch[1];
  }
  return trimmed;
}

/**
 * Parses and resolves video platform and embed URL
 */
export function parseVideoSource(rawUrl: string): {
  type: "youtube" | "vk" | "rutube" | "file";
  embedUrl: string;
  platformName: string;
  isValid: boolean;
  videoId?: string;
} {
  const url = extractUrlFromIframeOrText(rawUrl);

  // 1. YouTube
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: "youtube",
      embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`,
      platformName: "YouTube",
      isValid: true,
      videoId,
    };
  }

  // 2. VK Video
  // Check for video_ext.php directly
  const vkExtMatch = url.match(/(?:https?:)?\/\/(?:vk\.com|vkvideo\.ru)\/video_ext\.php\?([^"'\s>]+)/i);
  if (vkExtMatch) {
    let cleanParams = vkExtMatch[1].replace(/&amp;/g, "&");
    if (!cleanParams.includes("hd=")) cleanParams += "&hd=2";
    return {
      type: "vk",
      embedUrl: `https://vk.com/video_ext.php?${cleanParams}`,
      platformName: "VK Видео",
      isValid: true,
    };
  }

  // VK standard link: vk.com/video-123456_789012 or vkvideo.ru/video-123456_789012 or clip
  const vkLinkMatch = url.match(/(?:vk\.com|vkvideo\.ru)\/(?:video|clip)(-?\d+)_(\d+)/i);
  if (vkLinkMatch) {
    const oid = vkLinkMatch[1];
    const id = vkLinkMatch[2];
    return {
      type: "vk",
      embedUrl: `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hd=2`,
      platformName: "VK Видео",
      isValid: true,
      videoId: `${oid}_${id}`,
    };
  }

  // 3. RuTube
  const rutubeMatch = url.match(/rutube\.ru\/(?:video\/private\/|video\/|play\/embed\/|shorts\/)([a-zA-Z0-9]+)/i);
  if (rutubeMatch && rutubeMatch[1]) {
    const rutubeId = rutubeMatch[1];
    // Preserve private parameter if present
    const pMatch = url.match(/[?&]p=([a-zA-Z0-9_-]+)/);
    const pParam = pMatch ? `?p=${pMatch[1]}` : "";
    return {
      type: "rutube",
      embedUrl: `https://rutube.ru/play/embed/${rutubeId}/${pParam}`,
      platformName: "RuTube",
      isValid: true,
      videoId: rutubeId,
    };
  }

  // 4. Direct video file (local upload, MP4, WebM, MOV, OGG)
  const isDirectFile =
    url.startsWith("/uploads/videos/") ||
    url.startsWith("/api/videos/") ||
    url.startsWith("data:video/") ||
    url.startsWith("blob:") ||
    /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url);

  if (isDirectFile) {
    return {
      type: "file",
      embedUrl: url,
      platformName: "Видеофайл",
      isValid: true,
    };
  }

  return {
    type: "file",
    embedUrl: url,
    platformName: "Неизвестный источник",
    isValid: false,
  };
}

/**
 * Checks video link format and returns descriptive textual warnings if invalid or unsupported
 */
export function validateVideoLink(rawInput: string): {
  isValid: boolean;
  warning?: string;
  platformName?: string;
} {
  if (!rawInput || !rawInput.trim()) {
    return { isValid: false };
  }

  const url = extractUrlFromIframeOrText(rawInput.trim());

  // Check URL scheme
  if (
    !url.startsWith("http://") &&
    !url.startsWith("https://") &&
    !url.startsWith("//") &&
    !url.startsWith("/uploads/") &&
    !url.startsWith("/api/") &&
    !url.startsWith("data:") &&
    !url.startsWith("blob:")
  ) {
    return {
      isValid: false,
      warning: "Некорректная ссылка. Адрес должен начинаться с https:// или http:// (например: https://youtube.com/watch?v=...)",
    };
  }

  // Check popular unsupported video/social platforms with friendly guidance
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("tiktok.com")) {
    return {
      isValid: false,
      warning: "Ссылки из TikTok не поддерживаются. Разрешены только YouTube (включая Shorts), VK Видео и RuTube.",
    };
  }
  if (lowerUrl.includes("instagram.com")) {
    return {
      isValid: false,
      warning: "Ссылки из Instagram Reels не поддерживаются для плеера. Используйте YouTube, VK Видео, RuTube или загрузите видеофайл напрямую.",
    };
  }
  if (lowerUrl.includes("t.me") || lowerUrl.includes("telegram.me")) {
    return {
      isValid: false,
      warning: "Ссылки на посты Telegram не могут быть встроены в плеер. Загрузите видеофайл (до 30 МБ) через вкладку «Загрузить файл».",
    };
  }
  if (lowerUrl.includes("drive.google.com") || lowerUrl.includes("disk.yandex") || lowerUrl.includes("dropbox.com")) {
    return {
      isValid: false,
      warning: "Ссылки на облачные диски не поддерживаются плеером. Скачайте видео и загрузите его во вкладке «Загрузить файл» (до 30 МБ).",
    };
  }
  if (lowerUrl.includes("vimeo.com")) {
    return {
      isValid: false,
      warning: "Сервис Vimeo не поддерживается. Разрешены YouTube, VK Видео, RuTube или прямые ссылки на MP4/WebM.",
    };
  }

  // Test against supported platforms
  const parsed = parseVideoSource(url);
  if (parsed.isValid) {
    return {
      isValid: true,
      platformName: parsed.platformName,
    };
  }

  // If user pasted a YouTube link but video ID wasn't found
  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
    return {
      isValid: false,
      warning: "Не удалось определить ID ролика YouTube. Убедитесь, что ссылка ведет на конкретное видео или Shorts.",
    };
  }

  // If user pasted VK link but format is wrong
  if (lowerUrl.includes("vk.com") || lowerUrl.includes("vkvideo.ru")) {
    return {
      isValid: false,
      warning: "Не удалось распознать формат VK Видео. Поддерживаются ссылки вида vk.com/video-123_456, vkvideo.ru или код плеера video_ext.php.",
    };
  }

  // If user pasted RuTube link but ID is missing
  if (lowerUrl.includes("rutube.ru")) {
    return {
      isValid: false,
      warning: "Не удалось распознать ролик RuTube. Ссылка должна быть вида https://rutube.ru/video/ID/ или embed-код плеера.",
    };
  }

  // General unsupported format
  return {
    isValid: false,
    warning: "Неподдерживаемый сервис или формат ссылки. Разрешены только YouTube (в т.ч. Shorts), VK Видео, RuTube или прямые ссылки на видеофайлы (.mp4, .webm, .mov).",
  };
}

/**
 * Checks video file format and size, returns textual warning if invalid
 */
export function validateVideoFile(file: File): {
  isValid: boolean;
  warning?: string;
  ext?: string;
} {
  if (!file) {
    return { isValid: false, warning: "Файл не выбран" };
  }

  const name = file.name || "";
  const extMatch = name.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "";

  const allowedExts = ["mp4", "webm", "mov", "ogg"];
  const allowedMimes = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/ogg",
    "video/x-matroska",
    "video/mp4v-es",
  ];

  const hasAllowedExt = allowedExts.includes(ext);
  const hasAllowedMime = allowedMimes.includes(file.type.toLowerCase()) || file.type.startsWith("video/");

  // 1. Format check
  if (!hasAllowedExt && !allowedMimes.includes(file.type.toLowerCase())) {
    const extLabel = ext ? `.${ext.toUpperCase()}` : file.type || "неизвестный формат";
    return {
      isValid: false,
      ext,
      warning: `Неподдерживаемый тип файла «${name}» (${extLabel}). Разрешены только видеофайлы: MP4, WebM, MOV или OGG.`,
    };
  }

  // 2. Size check
  if (file.size > MAX_VIDEO_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      ext,
      warning: `Размер файла (${sizeMB} МБ) превышает лимит ${MAX_VIDEO_FILE_SIZE_LABEL}. Сожмите видео или укажите ссылку на YouTube, VK или RuTube.`,
    };
  }

  return { isValid: true, ext };
}

/**
 * Safely parse shop videos JSON from database or object
 */
export function parseShopVideos(raw: any): ShopVideo[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.slice(0, 2).map((item, idx) => {
      const parsed = parseVideoSource(item.url || "");
      return {
        id: item.id || `video-${idx}-${Date.now()}`,
        type: item.type || parsed.type,
        url: item.url || "",
        embedUrl: item.embedUrl || parsed.embedUrl,
        title: item.title || "",
        size: item.size,
      };
    });
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parseShopVideos(parsed);
      }
    } catch {
      return [];
    }
  }

  return [];
}
