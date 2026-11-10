/**
 * Helper to dynamically manage SEO metadata and JSON-LD structured data
 */

export interface SeoConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogType?: "website" | "article" | "profile" | "product";
  ogTitle?: string;
  ogDescription?: string;
  themeColor?: string;
  structuredData?: Record<string, any>;
  noIndex?: boolean;
}

const DEFAULT_SEO: SeoConfig = {
  title: "TMA Platform — Конструктор Telegram Web App & Онлайн-каталогов",
  description: "Современная платформа для создания онлайн-витрин, каталогов услуг, доставки и Telegram Mini Apps для вашего бизнеса.",
  keywords: ["telegram mini app", "tma builder", "онлайн-меню", "доставка", "каталог услуг", "онлайн заказ", "telegram бот"],
  ogType: "website",
  themeColor: "#0f172a"
};

export function updatePageSeo(config: SeoConfig = {}) {
  const finalTitle = config.title ? `${config.title} | TMA Platform` : DEFAULT_SEO.title!;
  const finalDesc = config.description || DEFAULT_SEO.description!;
  const finalKeywords = (config.keywords || DEFAULT_SEO.keywords!).join(", ");
  const currentUrl = config.canonicalUrl || window.location.href;

  // Title
  document.title = finalTitle;

  // Helper to set or create meta tags
  const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  // Standard Meta
  setMetaTag('meta[name="description"]', "name", "description", finalDesc);
  setMetaTag('meta[name="keywords"]', "name", "keywords", finalKeywords);
  setMetaTag('meta[name="robots"]', "name", "robots", config.noIndex ? "noindex, nofollow" : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");
  setMetaTag('meta[name="author"]', "name", "author", "TMA Platform");

  // Open Graph
  setMetaTag('meta[property="og:title"]', "property", "og:title", config.ogTitle || finalTitle);
  setMetaTag('meta[property="og:description"]', "property", "og:description", config.ogDescription || finalDesc);
  setMetaTag('meta[property="og:type"]', "property", "og:type", config.ogType || "website");
  setMetaTag('meta[property="og:url"]', "property", "og:url", currentUrl);
  setMetaTag('meta[property="og:site_name"]', "property", "og:site_name", "TMA Platform");
  setMetaTag('meta[property="og:locale"]', "property", "og:locale", "ru_RU");

  // Twitter Card
  setMetaTag('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
  setMetaTag('meta[name="twitter:title"]', "name", "twitter:title", config.ogTitle || finalTitle);
  setMetaTag('meta[name="twitter:description"]', "name", "twitter:description", config.ogDescription || finalDesc);

  // Canonical link
  let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!canonicalEl) {
    canonicalEl = document.createElement("link");
    canonicalEl.setAttribute("rel", "canonical");
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute("href", currentUrl);

  // Theme color
  if (config.themeColor) {
    setMetaTag('meta[name="theme-color"]', "name", "theme-color", config.themeColor);
  }

  // JSON-LD Structured Data
  const jsonLdScriptId = "seo-json-ld";
  let jsonLdEl = document.getElementById(jsonLdScriptId);
  if (config.structuredData) {
    if (!jsonLdEl) {
      jsonLdEl = document.createElement("script");
      jsonLdEl.id = jsonLdScriptId;
      jsonLdEl.setAttribute("type", "application/ld+json");
      document.head.appendChild(jsonLdEl);
    }
    jsonLdEl.textContent = JSON.stringify(config.structuredData);
  } else if (jsonLdEl) {
    jsonLdEl.remove();
  }
}
