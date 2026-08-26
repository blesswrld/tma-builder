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
  isBanned?: boolean;
  banReason?: string | null;
  bannedAt?: string | null;
  role?: "USER" | "DEVELOPER" | "ADMIN";
  createdAt?: string;
}

export interface DevShopSummary {
  id: string;
  name: string;
  slug: string;
  isOpen: boolean;
  servicesCount: number;
  ordersCount: number;
  totalRevenue: number;
  botToken?: string | null;
  createdAt: string;
  address?: string | null;
  phone?: string | null;
}

export interface DevUser extends User {
  shopsCount: number;
  totalOrdersCount: number;
  totalRevenue: number;
  shops: DevShopSummary[];
}

export interface DevUsersStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  paidUsers: number;
  totalShops: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface Service {
  id: string;
  shopId?: string;
  title: string;
  price: number;
  oldPrice?: number | null;
  description?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  gallery?: string | null;
  badge?: string | null;
  tags?: string | null;
  prepTime?: string | null;
  weight?: string | null;
  isAvailable?: boolean;
  position?: number;
  fulfillment?: string | null;
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
  minOrder?: number | string;
  deliveryFee?: number | string;
  pickupAddress?: string;
  deliveryMinOrder?: number | string;
  deliveryFeeVal?: number | string;
  freeDeliveryThreshold?: number | string;
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
  currency?: string | null;
  currencySymbol?: string | null;
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
  } | null;
  services?: Service[];
  currentUserRole?: "OWNER" | "MANAGER" | "STAFF";
  _count?: {
    orders?: number;
  };
}

export interface Banner {
  id: string;
  shopId?: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  badge?: string | null;
  bgGradient?: string | null;
  createdAt?: string;
}

export interface Review {
  id: string;
  shopId?: string;
  customerName: string;
  rating: number;
  comment?: string | null;
  imageUrl?: string | null;
  reply?: string | null;
  isEdited?: boolean;
  authorToken?: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  note?: string;
}

export interface Order {
  id: string;
  shopId: string;
  customerName: string;
  customerPhone: string;
  tableNumber?: string | null;
  preferredTime?: string | null;
  fulfillmentMethod?: "courier" | "pickup" | "shipping" | "online" | string;
  deliveryAddress?: string | null;
  items: string; // JSON string of OrderItem[]
  totalPrice: number;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  note?: string | null;
  createdAt: string;
}

export interface Promocode {
  id: string;
  shopId: string;
  code: string;
  discountPercent?: number | null;
  discountAmount?: number | null;
  usageLimit?: number | null;
  timesUsed: number;
  isActive: boolean;
  createdAt?: string;
}

export interface Customer {
  id: string;
  phone: string;
  name?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: string;
  notes?: string;
}

export interface TeamMember {
  id: string;
  shopId: string;
  userId: string;
  role: "ADMIN" | "MANAGER" | "COURIER";
  user?: {
    id: string;
    email: string;
    name?: string | null;
  };
  createdAt?: string;
}

export interface Broadcast {
  id: string;
  shopId: string;
  title: string;
  message: string;
  recipientsCount: number;
  sentAt: string;
}

export interface BugReport {
  id?: string;
  type: "BUG" | "FEATURE" | "OTHER";
  title?: string;
  description: string;
  attachments?: Array<{ name: string; size: number; type: string; url: string }> | string;
  contact?: string;
  userId?: string;
  shopId?: string;
  metadata?: any;
  status?: "NEW" | "IN_PROGRESS" | "RESOLVED" | "REJECTED" | "CLOSED" | string;
  developerEmail?: string;
  developerNotes?: string;
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof window !== "undefined" ? window.btoa(binary) : Buffer.from(binary, "binary").toString("base64");
};

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
  if (!data) return {};
  if (typeof data === "object") return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return {};
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

export function getServiceBadges(service: Service): string[] {
  if (!service.badge) return [];
  return service.badge.split(",").map(b => b.trim()).filter(Boolean);
}
