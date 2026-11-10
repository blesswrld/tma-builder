// Helper utilities for music detection, streaming links, and validation

export interface StreamingServiceInfo {
  isStreamingWebUrl: boolean;
  serviceName: string;
  badge: string;
  field?: "yandexMusicUrl" | "spotifyUrl" | "vkMusicUrl" | "appleMusicUrl" | "soundcloudUrl" | "youtubeMusicUrl";
  brandColor?: string;
  badgeClass?: string;
  gradientClass?: string;
}

export function detectStreamingService(url?: string | null): StreamingServiceInfo {
  if (!url || typeof url !== "string") {
    return {
      isStreamingWebUrl: false,
      serviceName: "",
      badge: ""
    };
  }

  const clean = url.trim().toLowerCase();

  if (clean.includes("music.yandex") || clean.includes("yandex.ru/music") || clean.includes("yandex.by/music") || clean.includes("yandex.kz/music")) {
    return {
      isStreamingWebUrl: true,
      serviceName: "Яндекс Музыка",
      badge: "Яндекс",
      field: "yandexMusicUrl",
      brandColor: "#fc3f1d",
      badgeClass: "bg-amber-500/15 text-amber-500 border-amber-500/30",
      gradientClass: "from-amber-500 to-yellow-500 text-black"
    };
  }

  if (clean.includes("spotify.com") || clean.includes("open.spotify.com")) {
    return {
      isStreamingWebUrl: true,
      serviceName: "Spotify",
      badge: "Spotify",
      field: "spotifyUrl",
      brandColor: "#1db954",
      badgeClass: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
      gradientClass: "from-emerald-600 to-green-500 text-white"
    };
  }

  if (clean.includes("vk.com/music") || clean.includes("vk.com/audio") || clean.includes("vk.ru/music") || clean.includes("vk.com")) {
    // Only if it looks like music or vk audio
    if (clean.includes("audio") || clean.includes("music") || clean.includes("playlist")) {
      return {
        isStreamingWebUrl: true,
        serviceName: "VK Музыка",
        badge: "VK",
        field: "vkMusicUrl",
        brandColor: "#0077ff",
        badgeClass: "bg-blue-500/15 text-blue-500 border-blue-500/30",
        gradientClass: "from-blue-600 to-sky-500 text-white"
      };
    }
  }

  if (clean.includes("music.apple.com") || clean.includes("itunes.apple.com") || (clean.includes("apple.com") && clean.includes("playlist"))) {
    return {
      isStreamingWebUrl: true,
      serviceName: "Apple Music",
      badge: "Apple",
      field: "appleMusicUrl",
      brandColor: "#fc3c44",
      badgeClass: "bg-pink-500/15 text-pink-500 border-pink-500/30",
      gradientClass: "from-rose-600 to-pink-500 text-white"
    };
  }

  if (clean.includes("soundcloud.com")) {
    return {
      isStreamingWebUrl: true,
      serviceName: "SoundCloud",
      badge: "SoundCloud",
      field: "soundcloudUrl",
      brandColor: "#ff5500",
      badgeClass: "bg-orange-500/15 text-orange-500 border-orange-500/30",
      gradientClass: "from-orange-600 to-amber-500 text-white"
    };
  }

  if (clean.includes("youtube.com") || clean.includes("youtu.be")) {
    return {
      isStreamingWebUrl: true,
      serviceName: "YouTube Music",
      badge: "YouTube",
      field: "youtubeMusicUrl",
      brandColor: "#ff0000",
      badgeClass: "bg-red-500/15 text-red-500 border-red-500/30",
      gradientClass: "from-red-600 to-rose-500 text-white"
    };
  }

  if (clean.includes("deezer.com")) {
    return {
      isStreamingWebUrl: true,
      serviceName: "Deezer",
      badge: "Deezer",
      badgeClass: "bg-purple-500/15 text-purple-500 border-purple-500/30",
      gradientClass: "from-purple-600 to-indigo-500 text-white"
    };
  }

  return {
    isStreamingWebUrl: false,
    serviceName: "",
    badge: ""
  };
}

/**
 * Checks whether an audio URL is a direct playable media stream/file
 * (and not a web page that would cause NotSupportedError in HTML5 audio)
 */
export function isDirectPlayableAudioUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const clean = url.trim();
  if (
    !clean.startsWith("http://") &&
    !clean.startsWith("https://") &&
    !clean.startsWith("/") &&
    !clean.startsWith("data:audio") &&
    !clean.startsWith("blob:")
  ) {
    return false;
  }
  
  // If it matches a known streaming web page, it cannot be played directly by <audio>
  const info = detectStreamingService(clean);
  if (info.isStreamingWebUrl) return false;

  return true;
}
