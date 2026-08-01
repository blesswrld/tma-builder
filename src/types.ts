export interface User {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  telegramHandle?: string | null;
  companyName?: string | null;
  plan?: "FREE" | "PRO" | "ENTERPRISE";
  subscriptionExpiresAt?: string | null;
}

export interface Service {
  id: string;
  shopId: string;
  title: string;
  price: number;
  oldPrice?: number | null;
  description?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  gallery?: string | null; // JSON array string or comma separated
  badge?: string | null;
  tags?: string | null;
  prepTime?: string | null;
  weight?: string | null;
  isAvailable?: boolean;
  createdAt?: string;
}

export interface SocialLinks {
  telegram?: string;
  instagram?: string;
  whatsapp?: string;
  vk?: string;
  website?: string;
}

export interface DeliveryOptions {
  pickup?: boolean;
  courier?: boolean;
  shipping?: boolean;
  minOrder?: number;
  deliveryFee?: number;
}

export interface Shop {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  botToken?: string | null;
  adminChatId?: string | null;
  workingHours?: string | null;
  address?: string | null;
  phone?: string | null;
  currency?: string;
  currencySymbol?: string;
  socialLinks?: string | SocialLinks | null;
  deliveryOptions?: string | DeliveryOptions | null;
  paymentInstructions?: string | null;
  cashbackPercent?: number;
  isOpen?: boolean;
  ownerId?: string | null;
  owner?: {
    id: string;
    email: string;
    name?: string | null;
  };
  services?: Service[];
  _count?: {
    orders?: number;
  };
}

export function parseSocialLinks(data: any): SocialLinks {
  if (!data) return {};
  if (typeof data === "object") return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

export function parseDeliveryOptions(data: any): DeliveryOptions {
  if (!data) return { pickup: true, courier: true };
  if (typeof data === "object") return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return { pickup: true, courier: true };
  }
}

export function parseGallery(galleryStr?: string | null): string[] {
  if (!galleryStr) return [];
  try {
    const parsed = JSON.parse(galleryStr);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch (e) {
    return galleryStr.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [];
}
