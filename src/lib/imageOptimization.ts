/**
 * Image optimization utilities for responsive images, picture sources, and srcset generation.
 */

export type ResponsiveImagePreset = "card" | "hero" | "banner" | "avatar" | "gallery" | "thumbnail" | "modal";

export interface ResponsiveSource {
  media?: string;
  type?: string;
  srcSet: string;
  sizes?: string;
}

/**
 * Checks if a URL is hosted on an image CDN that supports query-based resizing and format transformation.
 */
export function isOptimizableImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("data:") || url.startsWith("blob:") || url.endsWith(".svg")) return false;
  return (
    url.includes("unsplash.com") ||
    url.includes("images.unsplash.com") ||
    url.includes("cloudinary.com") ||
    url.includes("imgix.net") ||
    url.includes("fastly.net") ||
    url.includes("googleusercontent.com") ||
    url.includes("githubusercontent.com") ||
    url.includes("supabase.co") ||
    url.includes("cdn.")
  );
}

/**
 * Transforms an image URL to a specific width and format for dynamic CDNs.
 */
export function getOptimizedImageUrl(
  url: string,
  width: number,
  format?: "webp" | "avif" | "jpeg" | "auto",
  quality = 80
): string {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("data:") || url.startsWith("blob:") || url.endsWith(".svg")) return url;

  try {
    // Unsplash
    if (url.includes("unsplash.com")) {
      const parsed = new URL(url);
      parsed.searchParams.set("w", String(width));
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("fit", "crop");
      parsed.searchParams.set("q", String(quality));
      if (format && format !== "auto") {
        parsed.searchParams.set("fm", format);
      }
      return parsed.toString();
    }

    // Cloudinary
    if (url.includes("cloudinary.com") && url.includes("/upload/")) {
      const transform = `w_${width},q_${quality},f_${format || "auto"},c_limit`;
      return url.replace("/upload/", `/upload/${transform}/`);
    }

    // Google User Content
    if (url.includes("googleusercontent.com") && !url.includes("=s")) {
      return `${url}=w${width}-h${width}-c`;
    }
  } catch {
    // Return original on URL parsing errors
  }

  return url;
}

/**
 * Generates standard responsive srcset string for an image URL.
 */
export function generateSrcSet(
  url: string,
  widths: number[] = [320, 480, 640, 768, 1024, 1280],
  format?: "webp" | "avif" | "auto"
): string {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("data:") || url.startsWith("blob:") || url.endsWith(".svg")) return "";

  if (isOptimizableImageUrl(url)) {
    return widths
      .map((w) => `${getOptimizedImageUrl(url, w, format)} ${w}w`)
      .join(", ");
  }

  // Fallback 1x and 2x pixel density descriptor
  return `${url} 1x, ${url} 2x`;
}

/**
 * Generates <picture> source tags configuration with mobile-first media queries and modern formats.
 */
export function generatePictureSources(
  url: string,
  options: {
    preset?: ResponsiveImagePreset;
    customSizes?: string;
  } = {}
): ResponsiveSource[] {
  if (!url || typeof url !== "string" || url.startsWith("data:") || url.startsWith("blob:") || url.endsWith(".svg")) {
    return [];
  }

  const { preset = "card" } = options;
  const sources: ResponsiveSource[] = [];

  // Width presets based on device viewport breakpoints
  let mobileWidths = [320, 480, 640];
  let tabletWidths = [640, 768, 960];
  let desktopWidths = [960, 1280, 1600];

  if (preset === "hero") {
    mobileWidths = [480, 640];
    tabletWidths = [768, 1024];
    desktopWidths = [1280, 1600, 1920];
  } else if (preset === "avatar" || preset === "thumbnail") {
    mobileWidths = [64, 96, 128];
    tabletWidths = [128, 192];
    desktopWidths = [192, 256];
  }

  const isCdn = isOptimizableImageUrl(url);

  if (isCdn) {
    // 1. WebP Format Source for Modern Browsers
    sources.push({
      type: "image/webp",
      media: "(max-width: 639px)",
      srcSet: mobileWidths.map((w) => `${getOptimizedImageUrl(url, w, "webp")} ${w}w`).join(", "),
      sizes: "(max-width: 639px) 100vw, 640px",
    });

    sources.push({
      type: "image/webp",
      media: "(max-width: 1023px)",
      srcSet: tabletWidths.map((w) => `${getOptimizedImageUrl(url, w, "webp")} ${w}w`).join(", "),
      sizes: "(max-width: 1023px) 50vw, 768px",
    });

    sources.push({
      type: "image/webp",
      media: "(min-width: 1024px)",
      srcSet: desktopWidths.map((w) => `${getOptimizedImageUrl(url, w, "webp")} ${w}w`).join(", "),
      sizes: preset === "hero" ? "100vw" : "(min-width: 1024px) 33vw, 1200px",
    });

    // 2. Standard Fallback Sources per Breakpoint
    sources.push({
      media: "(max-width: 639px)",
      srcSet: mobileWidths.map((w) => `${getOptimizedImageUrl(url, w, "auto")} ${w}w`).join(", "),
      sizes: "(max-width: 639px) 100vw, 640px",
    });

    sources.push({
      media: "(min-width: 640px)",
      srcSet: desktopWidths.map((w) => `${getOptimizedImageUrl(url, w, "auto")} ${w}w`).join(", "),
      sizes: preset === "hero" ? "100vw" : "(min-width: 640px) 50vw, 33vw",
    });
  }

  return sources;
}

/**
 * Standard sizes string helper for common layout archetypes.
 */
export function getStandardImageSizes(preset: ResponsiveImagePreset = "card"): string {
  switch (preset) {
    case "hero":
      return "100vw";
    case "banner":
      return "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px";
    case "card":
      return "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px";
    case "thumbnail":
      return "(max-width: 640px) 112px, 144px";
    case "avatar":
      return "(max-width: 640px) 48px, 64px";
    case "gallery":
    case "modal":
      return "(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 640px";
    default:
      return "100vw";
  }
}
