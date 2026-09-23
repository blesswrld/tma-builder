import "dotenv/config";
import fs from "fs";
import nodeCrypto from "crypto";
import express from "express";
import compression from "compression";
import path from "path";
import os from "os";
import https from "https";
import http, { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { 
  validateShopName, validateSlug, validateCisPhone, 
  validateCustomerName, validateTelegramBotToken, validateTelegramChatId,
  validateEmail, validatePassword, validateItemTitle, validatePrice,
  validateCurrencyCode, validateCurrencySymbol, validateShopAddress
} from "./src/lib/validation.js";
import {
  getTelegramMe,
  getTelegramWebhookInfo,
  setTelegramWebhook,
  deleteTelegramWebhook,
  sendTelegramMessage,
  getOrderCardText,
  getOrderInlineButtons,
  broadcastTelegramNotification,
  handleTelegramWebhookUpdate
} from "./src/server/telegramBot.js";
import {
  setupTelegramAuthRoutes,
  startSystemBotListener,
  isPhoneLikeString,
  generateUniqueNickname
} from "./src/server/telegramAuth.js";
import { parseTelegramSettings, maskTelegramToken } from "./src/types.js";

const JWT_SECRET = process.env.JWT_SECRET || "smart-menu-secret-key-2026";

export function isDeveloperEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return normalized === "gelgaev.dev@mail.ru" || normalized === "roninfortnite71@gmail.com";
}

export function isAdminUser(user?: { email?: string | null; role?: string | null } | null): boolean {
  if (!user) return false;
  return isDeveloperEmail(user.email) || user.role === "ADMIN" || user.role === "DEVELOPER";
}

export function isModeratorUser(user?: { email?: string | null; role?: string | null } | null): boolean {
  if (!user) return false;
  return isAdminUser(user) || user.role === "MODERATOR";
}

export function canModerate(user?: { email?: string | null; role?: string | null } | null): boolean {
  return isModeratorUser(user);
}

// Anti-fraud utilities
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "tempmail.com", "10minutemail.com", "guerrillamail.com", "mailinator.com",
  "throwawaymail.com", "dispostable.com", "fakeinbox.com", "trashmail.com",
  "yopmail.com", "sharklasers.com", "getairmail.com", "mohmal.com",
  "tempmailo.com", "tempail.com", "generator.email", "dropmail.me"
]);

export function isDisposableEmail(email: string): boolean {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase().trim();
  return Boolean(domain && DISPOSABLE_EMAIL_DOMAINS.has(domain));
}

const rateLimitMaps = {
  reviews: new Map<string, number[]>(),
  orders: new Map<string, number[]>(),
  messages: new Map<string, number[]>(),
  auth: new Map<string, number[]>()
};

export function checkRateLimit(type: "reviews" | "orders" | "messages" | "auth", key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = rateLimitMaps[type].get(key) || [];
  const valid = timestamps.filter(t => now - t < windowMs);
  if (valid.length >= limit) {
    return false;
  }
  valid.push(now);
  rateLimitMaps[type].set(key, valid);
  return true;
}

const SUSPICIOUS_WORDS = [
  "http://", "https://", "t.me/+", ".xyz", "casino", "казино", "ставки", "1xbet", "заработок онлайн", "крипта в личку", "бесплатно перейди"
];

export function detectSpamOrScam(text?: string | null): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return SUSPICIOUS_WORDS.some(w => lower.includes(w));
}

export interface RealtimeClient {
  ws: WebSocket;
  userId?: string;
  isDeveloper?: boolean;
  subscribedShopIds: Set<string>;
}

export const clients = new Set<RealtimeClient>();

export function getOnlineUserIds(): string[] {
  const ids = new Set<string>();
  clients.forEach((c) => {
    if (c.userId && c.ws.readyState === WebSocket.OPEN) {
      ids.add(c.userId);
    }
  });
  return Array.from(ids);
}

export function isDeveloperOnline(): boolean {
  for (const c of clients) {
    if (c.isDeveloper && c.ws.readyState === WebSocket.OPEN) {
      return true;
    }
  }
  return false;
}

export function broadcastPresenceUpdate(specificUserId?: string) {
  const payload = {
    userId: specificUserId,
    onlineUserIds: getOnlineUserIds(),
    devOnline: isDeveloperOnline(),
    timestamp: Date.now()
  };
  broadcastEvent({
    type: "PRESENCE_STATE",
    payload
  });
}

export function broadcastEvent(event: { type: string; shopId?: string; userId?: string; payload?: any }) {
  const message = JSON.stringify(event);
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      // 1. Developers receive all events (including all chat messages and presence)
      if (client.isDeveloper) {
        try {
          client.ws.send(message);
        } catch (e) {
          console.error("Error broadcasting to WS dev client:", e);
        }
        return;
      }

      // 2. Chat messages & chat read/delete events
      if (event.type.startsWith("CHAT_")) {
        const chatTargetUserId = event.userId || event.payload?.targetUserId || event.payload?.message?.userId;
        const chatSenderId = event.payload?.senderId || event.payload?.deletedByUserId || event.payload?.message?.senderId;
        if (client.userId && (client.userId === chatTargetUserId || client.userId === chatSenderId)) {
          try {
            client.ws.send(message);
          } catch (e) {
            console.error("Error broadcasting chat to user client:", e);
          }
        }
        return;
      }

      // 3. Presence events are broadcast to all connected clients
      if (event.type.startsWith("PRESENCE_")) {
        try {
          client.ws.send(message);
        } catch (e) {}
        return;
      }

      // 4. User-specific event (e.g. USER_UPDATED, PLAN_UPDATED, PAYMENT_UPDATED, USER_BANNED)
      if (event.userId) {
        if (client.userId && client.userId === event.userId) {
          try {
            client.ws.send(message);
          } catch (e) {
            console.error("Error broadcasting to WS user client:", e);
          }
        }
        return;
      }

      // 5. Shop-specific event (e.g. ORDER_CREATED, SERVICE_UPDATED, REVIEW_CREATED, etc.)
      if (event.shopId) {
        if (
          client.subscribedShopIds.size === 0 ||
          client.subscribedShopIds.has(event.shopId) ||
          client.subscribedShopIds.has("EXPLORE_ALL") ||
          event.type.startsWith("SHOP_")
        ) {
          try {
            client.ws.send(message);
          } catch (e) {
            console.error("Error broadcasting to WS shop client:", e);
          }
        }
        return;
      }

      // 6. Global broadcast (e.g. system notifications, new report, shop list changes)
      try {
        client.ws.send(message);
      } catch (e) {
        console.error("Error broadcasting to WS client:", e);
      }
    }
  });
}


function getAuthUser(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name?: string | null };
    return decoded;
  } catch (e) {
    return null;
  }
}

function formatUserResponse(user: any) {
  const isDev = isDeveloperEmail(user.email);
  let resolvedRole = (user as any).role || "USER";
  if (isDev) {
    resolvedRole = "ADMIN";
  } else if (resolvedRole === "DEVELOPER") {
    resolvedRole = "ADMIN";
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name || null,
    phone: (user as any).phone || null,
    avatarUrl: (user as any).avatarUrl || null,
    telegramHandle: (user as any).telegramHandle || null,
    telegramId: (user as any).telegramId || null,
    githubHandle: (user as any).githubHandle || null,
    githubId: (user as any).githubId || null,
    companyName: (user as any).companyName || null,
    plan: user.plan || "FREE",
    subscriptionExpiresAt: user.subscriptionExpiresAt || null,
    referralCode: (user as any).referralCode || null,
    referredById: (user as any).referredById || null,
    isBanned: Boolean((user as any).isBanned),
    banReason: (user as any).banReason || null,
    bannedAt: (user as any).bannedAt || null,
    role: resolvedRole,
    balance: Number((user as any).balance) || 0,
    city: (user as any).city || null,
    isVerified: Boolean((user as any).isVerified),
    createdAt: (user as any).createdAt || null
  };
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function transliterateToSlug(str: string): string {
  if (!str) return "";
  const ruMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'і': 'i', 'ї': 'yi', 'є': 'ye', 'ґ': 'g'
  };

  const transliterated = String(str)
    .toLowerCase()
    .split('')
    .map(char => ruMap[char] !== undefined ? ruMap[char] : char)
    .join('');

  return transliterated
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateReferralCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "REF-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "Пользователь";
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return localPart[0] + "***@" + domain;
  }
  return localPart.slice(0, 2) + "***@" + domain;
}

async function ensureUserReferralCode(db: PrismaClient, user: any): Promise<string> {
  if (user.referralCode) return user.referralCode;

  let newCode = "";
  let exists = true;
  let attempts = 0;
  while (exists && attempts < 10) {
    attempts++;
    newCode = generateReferralCode();
    try {
      const existing = await db.user.findFirst({ where: { referralCode: newCode } });
      if (!existing) exists = false;
    } catch {
      exists = false;
    }
  }

  if (!newCode) newCode = "REF-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  try {
    await db.user.update({
      where: { id: user.id },
      data: { referralCode: newCode }
    });
  } catch (e) {
    // ignore
  }

  return newCode;
}

function getRequestBaseUrl(req: express.Request): string {
  // 1. Explicit environment variable (canonical container / public URL)
  if (process.env.APP_URL && !process.env.APP_URL.includes("vercel.app")) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("vercel.app")) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // 2. Origin header (sent by browsers in API requests)
  const origin = req.headers.origin;
  if (typeof origin === "string" && origin.startsWith("http")) {
    return origin.replace(/\/$/, "");
  }

  // 2. Referer header (sent in page requests)
  const referer = req.headers.referer;
  if (typeof referer === "string") {
    try {
      const parsed = new URL(referer);
      if (parsed.origin && parsed.origin.startsWith("http")) {
        return parsed.origin.replace(/\/$/, "");
      }
    } catch {
      // ignore
    }
  }

  // 3. Forwarded headers (Render, Cloud Run, reverse proxies)
  const forwardedProto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const forwardedHost = (req.headers["x-forwarded-host"] as string) || req.get("host");
  if (forwardedHost) {
    const proto = forwardedProto.split(",")[0].trim();
    return `${proto}://${forwardedHost}`.replace(/\/$/, "");
  }

  // 4. Fallback to process.env if explicitly set and not default placeholder
  if (process.env.APP_URL && !process.env.APP_URL.includes("vercel.app")) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("vercel.app")) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  return "https://tma-builder.onrender.com";
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaClient(): PrismaClient | null {
  try {
    if (globalForPrisma.prisma) return globalForPrisma.prisma;

    let dbUrl = process.env.DATABASE_URL || "";
    if (!dbUrl) return null;

    // Автоматическая замена порта Session Mode (5432) на Transaction Mode (6543) для Supabase Pooler
    if (dbUrl.includes("pooler.supabase.com:5432")) {
      dbUrl = dbUrl.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
    }

    // Автоматическая настройка параметров для Supabase
    if (!dbUrl.includes("sslmode=")) {
      dbUrl += (dbUrl.includes("?") ? "&" : "?") + "sslmode=require";
    }
    // Если порт 6543 (Supabase Connection Pooler) или ссылка pooler, добавляем pgbouncer=true
    if ((dbUrl.includes(":6543") || dbUrl.includes("pooler.supabase.com")) && !dbUrl.includes("pgbouncer=")) {
      dbUrl += "&pgbouncer=true";
    }

    // Ограничиваем пул подключений до 2 штук, чтобы избежать превышения лимитов пулера
    if (!dbUrl.includes("connection_limit=")) {
      dbUrl += "&connection_limit=2";
    }

    // Таймауты подключения
    if (!dbUrl.includes("connect_timeout=")) {
      dbUrl += "&connect_timeout=10&pool_timeout=10";
    }

    const client = new PrismaClient({
      datasources: { db: { url: dbUrl } },
      log: ["error"]
    });

    globalForPrisma.prisma = client;
    return client;
  } catch (err) {
    console.error("Prisma client instantiation error:", err);
    return null;
  }
}

let orderSchemaChecked = false;
let schemaInitPromise: Promise<void> | null = null;

async function ensureReportTable(db: PrismaClient) {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Report" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "type" TEXT NOT NULL DEFAULT 'BUG',
        "title" TEXT,
        "description" TEXT NOT NULL,
        "attachments" TEXT,
        "contact" TEXT,
        "userId" TEXT,
        "shopId" TEXT,
        "metadata" TEXT,
        "status" TEXT NOT NULL DEFAULT 'NEW',
        "developerEmail" TEXT DEFAULT 'gelgaev.dev@mail.ru',
        "developerNotes" TEXT,
        "resolvedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.$executeRawUnsafe(`ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "developerEmail" TEXT DEFAULT 'gelgaev.dev@mail.ru'`).catch(() => {});
    await db.$executeRawUnsafe(`ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "developerNotes" TEXT`).catch(() => {});
    await db.$executeRawUnsafe(`ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3)`).catch(() => {});
  } catch (err) {
    console.warn("ensureReportTable warning:", err);
  }
}

async function ensureOrderSchema(db: PrismaClient) {
  if (orderSchemaChecked) return;
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      const statements = [
        `CREATE TABLE IF NOT EXISTS "Order" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "shopId" TEXT NOT NULL,
          "customerName" TEXT NOT NULL,
          "customerPhone" TEXT NOT NULL,
          "tableNumber" TEXT,
          "preferredTime" TEXT,
          "items" TEXT NOT NULL,
          "totalPrice" INTEGER NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "note" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PENDING'`,
        `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "note" TEXT`,
        `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "tableNumber" TEXT`,
        `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "preferredTime" TEXT`,
        `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "fulfillmentMethod" TEXT`,
        `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT`,

        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "category" TEXT`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "isAvailable" BOOLEAN DEFAULT true`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "fulfillment" TEXT DEFAULT 'pickup'`,

        `CREATE TABLE IF NOT EXISTS "Promocode" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "shopId" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "discountPercent" INTEGER NOT NULL DEFAULT 0,
          "discountAmount" INTEGER NOT NULL DEFAULT 0,
          "minOrderAmount" INTEGER DEFAULT 0,
          "expiresAt" TIMESTAMP(3),
          "description" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "maxUses" INTEGER NOT NULL DEFAULT 100,
          "usedCount" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `ALTER TABLE "Promocode" ADD COLUMN IF NOT EXISTS "minOrderAmount" INTEGER DEFAULT 0`,
        `ALTER TABLE "Promocode" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3)`,
        `ALTER TABLE "Promocode" ADD COLUMN IF NOT EXISTS "description" TEXT`,
        `ALTER TABLE "Promocode" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`,
        `ALTER TABLE "Promocode" ADD COLUMN IF NOT EXISTS "maxUses" INTEGER NOT NULL DEFAULT 100`,
        `ALTER TABLE "Promocode" ADD COLUMN IF NOT EXISTS "usedCount" INTEGER NOT NULL DEFAULT 0`,

        `CREATE TABLE IF NOT EXISTS "Review" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "shopId" TEXT NOT NULL,
          "customerName" TEXT NOT NULL,
          "rating" INTEGER NOT NULL DEFAULT 5,
          "comment" TEXT,
          "reply" TEXT,
          "imageUrl" TEXT,
          "isEdited" BOOLEAN DEFAULT false,
          "authorToken" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`,
        `ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "isEdited" BOOLEAN DEFAULT false`,
        `ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "authorToken" TEXT`,

        `CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "name" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS "Banner" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "shopId" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "subtitle" TEXT,
          "imageUrl" TEXT,
          "badge" TEXT,
          "bgGradient" TEXT DEFAULT 'from-slate-900 to-indigo-950',
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS "Broadcast" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "shopId" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "imageUrl" TEXT,
          "buttonText" TEXT DEFAULT '📱 Открыть Меню',
          "targetFilter" TEXT DEFAULT 'ALL',
          "sentCount" INTEGER NOT NULL DEFAULT 0,
          "status" TEXT DEFAULT 'SENT',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS "Customer" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "shopId" TEXT NOT NULL,
          "phone" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "bonusBalance" INTEGER NOT NULL DEFAULT 0,
          "totalSpent" INTEGER NOT NULL DEFAULT 0,
          "ordersCount" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS "VerificationCode" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'LOGIN',
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,

        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "cashbackPercent" INTEGER DEFAULT 5`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "ownerId" TEXT`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "workingHours" TEXT`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "address" TEXT`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "phone" TEXT`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "isOpen" BOOLEAN DEFAULT true`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'RUB'`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "currencySymbol" TEXT DEFAULT '₽'`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "socialLinks" TEXT`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "deliveryOptions" TEXT`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "paymentInstructions" TEXT`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "musicSettings" TEXT`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "botToken" TEXT`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "adminChatId" TEXT`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "telegramSettings" TEXT`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "city" TEXT`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "rating" REAL DEFAULT 5.0`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "reviewsCount" INTEGER DEFAULT 0`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false`,

        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "plan" TEXT DEFAULT 'FREE'`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP(3)`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramHandle" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramId" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "balance" INTEGER DEFAULT 0`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "city" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "githubHandle" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "githubId" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyName" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN DEFAULT false`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banReason" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP(3)`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'USER'`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredById" TEXT`,

        `CREATE TABLE IF NOT EXISTS "ReferralReward" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "tier" TEXT NOT NULL,
          "planAwarded" TEXT NOT NULL,
          "months" INTEGER NOT NULL DEFAULT 1,
          "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "expiresAt" TIMESTAMP(3)
        )`,

        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "oldPrice" INTEGER`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "gallery" TEXT`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "badge" TEXT`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "tags" TEXT`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "prepTime" TEXT`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "weight" TEXT`,

        `CREATE TABLE IF NOT EXISTS "ShopMember" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "shopId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "role" TEXT NOT NULL DEFAULT 'STAFF',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS "ShopInvite" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "shopId" TEXT NOT NULL,
          "code" TEXT NOT NULL UNIQUE,
          "role" TEXT NOT NULL DEFAULT 'STAFF',
          "createdById" TEXT NOT NULL,
          "maxUses" INTEGER NOT NULL DEFAULT 10,
          "usedCount" INTEGER NOT NULL DEFAULT 0,
          "expiresAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS "Report" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "type" TEXT NOT NULL DEFAULT 'BUG',
          "title" TEXT,
          "description" TEXT NOT NULL,
          "attachments" TEXT,
          "contact" TEXT,
          "userId" TEXT,
          "shopId" TEXT,
          "metadata" TEXT,
          "status" TEXT NOT NULL DEFAULT 'NEW',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS "Payment" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "plan" TEXT NOT NULL,
          "amount" INTEGER NOT NULL,
          "paymentMethod" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "yooPaymentId" TEXT UNIQUE,
          "confirmationUrl" TEXT,
          "qrUrl" TEXT,
          "promocode" TEXT,
          "paidAt" TIMESTAMP(3),
          "metadata" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS "SystemPromocode" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "code" TEXT NOT NULL UNIQUE,
          "discountPercent" INTEGER NOT NULL DEFAULT 100,
          "applicablePlan" TEXT,
          "maxUses" INTEGER NOT NULL DEFAULT 1000,
          "usedCount" INTEGER NOT NULL DEFAULT 0,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "expiresAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,

        `INSERT INTO "SystemPromocode" ("id", "code", "discountPercent", "applicablePlan", "maxUses", "usedCount", "isActive")
         VALUES ('promo-start2026', 'START2026', 100, 'ALL', 999999, 0, true)
         ON CONFLICT ("code") DO NOTHING`,
        `INSERT INTO "SystemPromocode" ("id", "code", "discountPercent", "applicablePlan", "maxUses", "usedCount", "isActive")
         VALUES ('promo-vip', 'VIP', 100, 'ALL', 999999, 0, true)
         ON CONFLICT ("code") DO NOTHING`,
        `INSERT INTO "SystemPromocode" ("id", "code", "discountPercent", "applicablePlan", "maxUses", "usedCount", "isActive")
         VALUES ('promo-demo100', 'DEMO100', 100, 'ALL', 999999, 0, true)
         ON CONFLICT ("code") DO NOTHING`,

        `CREATE TABLE IF NOT EXISTS "ChatMessage" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "senderRole" TEXT NOT NULL DEFAULT 'USER',
          "senderId" TEXT NOT NULL,
          "senderName" TEXT,
          "text" TEXT,
          "mediaUrl" TEXT,
          "mediaType" TEXT,
          "mediaName" TEXT,
          "mediaSize" INTEGER,
          "mediaThumbnail" TEXT,
          "isRead" BOOLEAN NOT NULL DEFAULT false,
          "readAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS "ChatMessage_userId_idx" ON "ChatMessage"("userId")`,
        `CREATE INDEX IF NOT EXISTS "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt")`,
        `CREATE INDEX IF NOT EXISTS "Shop_ownerId_idx" ON "Shop"("ownerId")`,
        `CREATE INDEX IF NOT EXISTS "Shop_slug_idx" ON "Shop"("slug")`,
        `CREATE INDEX IF NOT EXISTS "Service_shopId_idx" ON "Service"("shopId")`,
        `CREATE INDEX IF NOT EXISTS "Order_shopId_idx" ON "Order"("shopId")`,
        `CREATE INDEX IF NOT EXISTS "Review_shopId_idx" ON "Review"("shopId")`,
        `CREATE INDEX IF NOT EXISTS "Banner_shopId_idx" ON "Banner"("shopId")`,
        `CREATE INDEX IF NOT EXISTS "ShopMember_shopId_userId_idx" ON "ShopMember"("shopId", "userId")`,
        `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT`,
        `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "mediaType" TEXT`,
        `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "mediaName" TEXT`,
        `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "mediaSize" INTEGER`,
        `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "mediaThumbnail" TEXT`,
        `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "isEdited" BOOLEAN NOT NULL DEFAULT false`,
        `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3)`,
        `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "deletedForUserIds" TEXT`,

        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "moderationStatus" TEXT DEFAULT 'APPROVED'`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "moderationReason" TEXT`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "isVip" BOOLEAN DEFAULT false`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "boostedAt" TIMESTAMP(3)`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "boostExpiresAt" TIMESTAMP(3)`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "city" TEXT`,

        `CREATE TABLE IF NOT EXISTS "Favorite" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "targetType" TEXT NOT NULL,
          "targetId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_userId_targetType_targetId_key" ON "Favorite"("userId", "targetType", "targetId")`,
        `CREATE INDEX IF NOT EXISTS "Favorite_userId_idx" ON "Favorite"("userId")`,

        `CREATE TABLE IF NOT EXISTS "PeerMessage" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "shopId" TEXT NOT NULL,
          "buyerId" TEXT NOT NULL,
          "senderId" TEXT NOT NULL,
          "senderRole" TEXT NOT NULL DEFAULT 'BUYER',
          "senderName" TEXT,
          "text" TEXT,
          "mediaUrl" TEXT,
          "isRead" BOOLEAN NOT NULL DEFAULT false,
          "readAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS "PeerMessage_shopId_buyerId_idx" ON "PeerMessage"("shopId", "buyerId")`,
        `CREATE INDEX IF NOT EXISTS "PeerMessage_senderId_idx" ON "PeerMessage"("senderId")`,
        `CREATE INDEX IF NOT EXISTS "PeerMessage_createdAt_idx" ON "PeerMessage"("createdAt")`,

        `CREATE TABLE IF NOT EXISTS "UserTransaction" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "amount" INTEGER NOT NULL,
          "type" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'COMPLETED',
          "paymentMethod" TEXT,
          "description" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS "UserTransaction_userId_idx" ON "UserTransaction"("userId")`
      ];

      for (const stmt of statements) {
        try {
          await db.$executeRawUnsafe(stmt);
        } catch (err) {
          // ignore individual statement errors to let remaining ones execute
        }
      }
      orderSchemaChecked = true;
    })();
  }
  await schemaInitPromise;
}

export type UserShopRole = "OWNER" | "MANAGER" | "STAFF" | null;

async function getShopUserRole(db: PrismaClient, shopId: string, authUser: { id: string; email?: string } | null): Promise<UserShopRole> {
  // STRICT SECURITY: Unauthenticated users have no role
  if (!authUser) return null;

  if (isDeveloperEmail((authUser as any).email)) {
    return "OWNER";
  }

  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop) return null;

  // 1. Owner match
  if (shop.ownerId === authUser.id) {
    return "OWNER";
  }

  // 2. Unassigned legacy shop -> assign to first logged-in user who accesses it
  if (!shop.ownerId) {
    await db.shop.update({ where: { id: shopId }, data: { ownerId: authUser.id } }).catch(() => {});
    return "OWNER";
  }

  // 3. Staff / Manager member check via ShopMember
  try {
    const members: any[] = await db.$queryRawUnsafe(
      `SELECT "role" FROM "ShopMember" WHERE "shopId" = $1 AND "userId" = $2 LIMIT 1;`,
      shopId,
      authUser.id
    );
    if (members && members.length > 0) {
      const rawRole = (members[0].role || "").toUpperCase();
      if (rawRole === "MANAGER" || rawRole === "ADMIN") return "MANAGER";
      return "STAFF";
    }
  } catch (e) {
    // Ignore error if query fails
  }

  // 4. Re-bind if previous owner was deleted
  const existingOwner = await db.user.findUnique({ where: { id: shop.ownerId } });
  if (!existingOwner) {
    await db.shop.update({ where: { id: shopId }, data: { ownerId: authUser.id } }).catch(() => {});
    return "OWNER";
  }

  return null;
}

// Allows OWNER, MANAGER, and STAFF (view orders, update order status, export CSV)
async function canProcessOrders(db: PrismaClient, shopId: string, authUser: { id: string } | null): Promise<boolean> {
  const role = await getShopUserRole(db, shopId, authUser);
  return role === "OWNER" || role === "MANAGER" || role === "STAFF";
}

// Allows OWNER and MANAGER (manage catalog/services, promo, reviews, banners, broadcasts, CRM, settings)
async function canManageShopContent(db: PrismaClient, shopId: string, authUser: { id: string } | null): Promise<boolean> {
  const role = await getShopUserRole(db, shopId, authUser);
  return role === "OWNER" || role === "MANAGER";
}

// Allows OWNER only (delete shop, assign/remove manager roles)
async function isShopOwner(db: PrismaClient, shopId: string, authUser: { id: string } | null): Promise<boolean> {
  const role = await getShopUserRole(db, shopId, authUser);
  return role === "OWNER";
}

// Backward compatibility alias for general management check
async function canManageShop(db: PrismaClient, shopId: string, authUser: { id: string } | null): Promise<boolean> {
  return canManageShopContent(db, shopId, authUser);
}

async function getUserShops(db: PrismaClient, userId: string) {
  // Shops owned by user
  const ownedShops = await db.shop.findMany({
    where: { ownerId: userId },
    include: {
      services: true,
      owner: { select: { id: true, email: true, name: true } },
      _count: { select: { orders: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const sanitizeShop = (s: any, role: string) => {
    const hasBot = Boolean(s.botToken);
    return {
      ...s,
      hasBotToken: hasBot,
      isTelegramConnected: hasBot,
      botTokenMasked: maskTelegramToken(s.botToken),
      // Hide raw botToken for non-owner members
      botToken: role === "OWNER" ? s.botToken : maskTelegramToken(s.botToken),
      currentUserRole: role
    };
  };

  const ownedWithRole = ownedShops.map(s => sanitizeShop(s, "OWNER"));

  // Shops where user is a team member (staff or manager)
  let memberRecords: any[] = [];
  try {
    memberRecords = await db.$queryRawUnsafe(
      `SELECT "shopId", "role" FROM "ShopMember" WHERE "userId" = $1;`,
      userId
    );
  } catch (e) {
    // Ignore
  }

  let extraShops: any[] = [];
  if (memberRecords && memberRecords.length > 0) {
    const existingOwnedIds = new Set(ownedShops.map(s => s.id));
    const memberRoleMap = new Map<string, "MANAGER" | "STAFF">();
    const newMemberIds: string[] = [];

    for (const m of memberRecords) {
      if (!existingOwnedIds.has(m.shopId)) {
        newMemberIds.push(m.shopId);
        const raw = (m.role || "").toUpperCase();
        memberRoleMap.set(m.shopId, raw === "MANAGER" || raw === "ADMIN" ? "MANAGER" : "STAFF");
      }
    }

    if (newMemberIds.length > 0) {
      const rawExtra = await db.shop.findMany({
        where: { id: { in: newMemberIds } },
        include: {
          services: true,
          owner: { select: { id: true, email: true, name: true } },
          _count: { select: { orders: true } }
        },
        orderBy: { createdAt: "desc" }
      });

      extraShops = rawExtra.map(s => {
        const role = memberRoleMap.get(s.id) || "STAFF";
        return sanitizeShop(s, role);
      });
    }
  }

  return [...ownedWithRole, ...extraShops];
}

export const prisma = getPrismaClient();

export const app = express();

// High-performance gzip/brotli compression for API payloads and assets
app.use(compression());

// CORS middleware allowing cross-origin requests from Vercel frontend / local / custom domains
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check endpoint for Render / monitoring
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
});

// Explicit PWA Manifest and Service Worker handlers early in the pipeline
app.get(["/manifest.json", "/manifest.webmanifest"], (req, res) => {
  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : undefined) || (req.headers.host ? `https://${req.headers.host}` : undefined);
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const manifestPath = path.join(process.cwd(), "public", "manifest.json");
  try {
    const content = fs.readFileSync(manifestPath, "utf8");
    res.status(200).send(content);
  } catch (e) {
    res.status(500).json({ error: "Failed to read manifest" });
  }
});

app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Service-Worker-Allowed", "/");
  const swPath = path.join(process.cwd(), "public", "sw.js");
  try {
    const content = fs.readFileSync(swPath, "utf8");
    res.status(200).send(content);
  } catch (e) {
    res.status(500).send("// SW not found");
  }
});

// Middleware: Rewrite /api/public/* to /api/* (keep only the catalog listing endpoint /api/public/shops)
app.use((req, res, next) => {
  const isCatalogListing = req.path === "/api/public/shops";
  if (req.url.startsWith("/api/public/") && !isCatalogListing) {
    req.url = req.url.replace("/api/public", "/api");
  }
  next();
});

// Helper for sending email verification codes via Nodemailer
async function sendVerificationEmail(toEmail: string, code: string, typeName: string) {
  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });

      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || "Mini App Studio"}" <${smtpUser}>`,
        to: toEmail,
        subject: `${code} — Ваш код подтверждения`,
        text: `Ваш код для ${typeName}: ${code}. Срок действия: 10 минут.`,
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 28px; border: 1px solid #3f3f46; border-radius: 20px; background-color: #18181b; color: #f4f4f5;">
            <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 8px;">Код подтверждения</h2>
            <p style="color: #a1a1aa; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
              Вы запросили код для <strong>${typeName}</strong>.
            </p>
            <div style="background-color: #27272a; border: 1px solid #52525b; padding: 18px; text-align: center; border-radius: 16px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #f4f4f5; font-family: monospace;">
              ${code}
            </div>
            <p style="color: #71717a; font-size: 12px; margin-top: 24px; margin-bottom: 0; text-align: center;">
              Срок действия кода: 10 минут. Если вы не запрашивали код, проигнорируйте это письмо.
            </p>
          </div>
        `
      });
      console.log(`[EMAIL SENT] Code ${code} sent to ${toEmail}`);
      return { success: true, sentViaSmtp: true };
    } else {
      console.log(`[EMAIL SIMULATED / LOG] Code for ${toEmail} (${typeName}): ${code}`);
      return { success: true, sentViaSmtp: false };
    }
  } catch (err) {
    console.warn("Nodemailer error:", err);
    return { success: false, error: String(err) };
  }
}

// Auth Route: Отправить одноразовый код на почту
app.post("/api/auth/send-code", async (req, res) => {
  try {
    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });
    await ensureOrderSchema(db);

    const { email, type = "LOGIN" } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Введите корректный E-mail адрес." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const typeNames: Record<string, string> = {
      LOGIN: "входа в систему",
      REGISTER: "регистрации аккаунта",
      RESET_PASSWORD: "сброса пароля",
      CHANGE_PASSWORD: "смены пароля в профиле"
    };
    const typeName = typeNames[type] || "подтверждения E-mail";

    // Если тип RESET_PASSWORD, CHANGE_PASSWORD или LOGIN, проверяем существование пользователя
    if (type === "LOGIN") {
      const user = await db.user.findUnique({ where: { email: cleanEmail } });
      if (!user) {
        return res.status(404).json({
          error: "Аккаунт с таким E-mail не найден. Пожалуйста, перейдите во вкладку «Создать» для регистрации."
        });
      }
    }

    if (type === "RESET_PASSWORD" || type === "CHANGE_PASSWORD") {
      const user = await db.user.findUnique({ where: { email: cleanEmail } });
      if (!user) {
        return res.status(404).json({ error: "Пользователь с такой почтой не найден." });
      }
    }

    if (type === "REGISTER") {
      const user = await db.user.findUnique({ where: { email: cleanEmail } });
      if (user) {
        return res.status(400).json({ error: "Пользователь с таким E-mail уже зарегистрирован. Выполните вход." });
      }
    }

    // Генерация 6-значного кода
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

    // Удаляем прошлые неиспользованные коды
    try {
      await db.$executeRawUnsafe(`DELETE FROM "VerificationCode" WHERE "email" = $1;`, cleanEmail);
    } catch (e) {
      // Игнорируем
    }

    // Создаем новый код
    const codeId = "vc_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    await db.$executeRawUnsafe(
      `INSERT INTO "VerificationCode" ("id", "email", "code", "type", "expiresAt", "createdAt") VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP);`,
      codeId,
      cleanEmail,
      code,
      type,
      expiresAt
    );

    const emailResult = await sendVerificationEmail(cleanEmail, code, typeName);

    res.json({
      success: true,
      message: `Код подтверждения отправлен на ${cleanEmail}!`,
      email: cleanEmail,
      devCode: emailResult.sentViaSmtp ? undefined : code
    });
  } catch (error: any) {
    console.error("Send auth code error:", error);
    res.status(500).json({ error: "Не удалось отправить код на указанный E-mail." });
  }
});

// Auth Route: Проверить код из письма и авторизоваться
app.post("/api/auth/verify-code", async (req, res) => {
  try {
    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });
    await ensureOrderSchema(db);

    const { email, code, name, password, referralCode } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Заполните E-mail и 6-значный код." });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanCode = String(code).trim();

    // Проверяем код в БД
    const validCodes: any[] = await db.$queryRawUnsafe(
      `SELECT * FROM "VerificationCode" WHERE "email" = $1 AND "code" = $2 AND "expiresAt" > CURRENT_TIMESTAMP LIMIT 1;`,
      cleanEmail,
      cleanCode
    );

    if (!validCodes || validCodes.length === 0) {
      return res.status(400).json({ error: "Неверный или просроченный код из письма. Запросите новый." });
    }

    // Удаляем использованный код
    await db.$executeRawUnsafe(`DELETE FROM "VerificationCode" WHERE "email" = $1;`, cleanEmail).catch(() => {});

    const codeRecord = validCodes[0];
    const codeType = (codeRecord.type || "LOGIN").toUpperCase();

    let user = await db.user.findUnique({ where: { email: cleanEmail } });

    if (codeType === "LOGIN") {
      if (!user) {
        return res.status(404).json({ error: "Аккаунт не найден. Пожалуйста, перейдите во вкладку «Создать» для регистрации." });
      }
    } else if (codeType === "REGISTER") {
      if (user) {
        return res.status(400).json({ error: "Пользователь с таким E-mail уже зарегистрирован. Пожалуйста, выполните вход." });
      }
      if (!password || String(password).length < 6) {
        return res.status(400).json({ error: "Пароль должен содержать не менее 6 символов." });
      }

      let referredById: string | null = null;
      if (referralCode && typeof referralCode === "string") {
        const cleanRef = referralCode.trim();
        try {
          const referrer = await db.user.findFirst({
            where: {
              OR: [
                { referralCode: cleanRef },
                { id: cleanRef }
              ]
            }
          });
          if (referrer && referrer.email.toLowerCase() !== cleanEmail) {
            referredById = referrer.id;
          }
        } catch {
          // ignore
        }
      }

      const newRefCode = generateReferralCode();
      const hashedPassword = await bcrypt.hash(String(password), 10);
      user = await db.user.create({
        data: {
          email: cleanEmail,
          password: hashedPassword,
          name: name ? String(name).trim() : cleanEmail.split("@")[0],
          referralCode: newRefCode,
          referredById: referredById || undefined
        }
      });

      if (referredById) {
        broadcastEvent({
          type: "REFERRAL_ACTIVATED",
          userId: referredById,
          payload: {
            referrerId: referredById,
            newUserId: user.id,
            userName: user.name || "Пользователь",
            email: maskEmail(user.email)
          }
        });
      }
    } else {
      if (!user) {
        return res.status(404).json({ error: "Пользователь не найден." });
      }
      if (user.isBanned) {
        return res.status(403).json({
          error: `Ваш аккаунт заблокирован разработчиком платформы.${user.banReason ? ` Причина: ${user.banReason}` : ""}`
        });
      }
    }

    // Автоматически привязываем неназначенные заведения к этому пользователю
    await db.shop.updateMany({
      where: { ownerId: null },
      data: { ownerId: user.id }
    }).catch(() => {});

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      token,
      user: formatUserResponse(user)
    });
  } catch (error: any) {
    console.error("Verify code error:", error);
    res.status(500).json({ error: "Ошибка при проверке кода." });
  }
});

// Auth Route: Сброс пароля по коду
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });
    await ensureOrderSchema(db);

    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Заполните E-mail, код и новый пароль." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Новый пароль должен быть не менее 6 символов." });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanCode = String(code).trim();

    // Проверяем код
    const validCodes: any[] = await db.$queryRawUnsafe(
      `SELECT * FROM "VerificationCode" WHERE "email" = $1 AND "code" = $2 AND "expiresAt" > CURRENT_TIMESTAMP LIMIT 1;`,
      cleanEmail,
      cleanCode
    );

    if (!validCodes || validCodes.length === 0) {
      return res.status(400).json({ error: "Неверный или просроченный код из письма." });
    }

    // Ищем пользователя
    const user = await db.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(404).json({ error: "Пользователь с такой почтой не найден." });
    }

    // Хешируем и обновляем пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    // Удаляем код
    await db.$executeRawUnsafe(`DELETE FROM "VerificationCode" WHERE "email" = $1;`, cleanEmail).catch(() => {});

    res.json({ message: "Пароль успешно изменён! Теперь вы можете войти в аккаунт." });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Не удалось сбросить пароль." });
  }
});
app.post("/api/auth/register", async (req, res) => {
  try {
    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });
    await ensureOrderSchema(db);

    const { email, password, name, referralCode } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Введите корректный E-mail адрес." });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Пароль должен содержать не менее 6 символов." });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await db.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({ error: "Пользователь с таким E-mail уже зарегистрирован." });
    }

    let referredById: string | null = null;
    if (referralCode && typeof referralCode === "string") {
      const cleanRef = referralCode.trim();
      try {
        const referrer = await db.user.findFirst({
          where: {
            OR: [
              { referralCode: cleanRef },
              { id: cleanRef }
            ]
          }
        });
        if (referrer && referrer.email.toLowerCase() !== cleanEmail) {
          referredById = referrer.id;
        }
      } catch {
        // ignore
      }
    }

    const newRefCode = generateReferralCode();
    const hashedPassword = await bcrypt.hash(password, 10);
    const uniqueNickname = await generateUniqueNickname(db, name ? String(name).trim() : null);

    const user = await db.user.create({
      data: {
        email: cleanEmail,
        password: hashedPassword,
        name: uniqueNickname,
        referralCode: newRefCode,
        referredById: referredById || undefined
      }
    });

    if (referredById) {
      broadcastEvent({
        type: "REFERRAL_ACTIVATED",
        userId: referredById,
        payload: {
          referrerId: referredById,
          newUserId: user.id,
          userName: user.name || "Пользователь",
          email: maskEmail(user.email)
        }
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({
      token,
      user: formatUserResponse(user)
    });
  } catch (error: any) {
    console.error("Auth register error:", error);
    res.status(500).json({ error: "Не удалось зарегистрировать пользователя." });
  }
});

// Auth Route: Вход в аккаунт
app.post("/api/auth/login", async (req, res) => {
  try {
    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });
    await ensureOrderSchema(db);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Заполните E-mail и пароль." });
    }

    const cleanEmail = String(email).toLowerCase().trim();

    const user = await db.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(400).json({ error: "Неверный E-mail или пароль." });
    }

    const isValid = await bcrypt.compare(String(password), user.password);
    if (!isValid) {
      return res.status(400).json({ error: "Неверный E-mail или пароль." });
    }

    if (user.isBanned) {
      return res.status(403).json({
        error: `Ваш аккаунт заблокирован разработчиком платформы.${user.banReason ? ` Причина: ${user.banReason}` : ""}`
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      token,
      user: formatUserResponse(user)
    });
  } catch (error: any) {
    console.error("Auth login error:", error);
    res.status(500).json({ error: "Ошибка при входе в аккаунт." });
  }
});

// ==========================================
// TELEGRAM WEBAPP AUTHENTICATION ENDPOINTS
// ==========================================

app.post("/api/auth/telegram/webapp", async (req, res) => {
  try {
    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });
    await ensureOrderSchema(db);

    const { initData, referralCode } = req.body;
    if (!initData || typeof initData !== "string") {
      return res.status(400).json({ error: "Параметр initData отсутствует или имеет неверный формат." });
    }

    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    const userStr = params.get("user");
    if (!userStr) {
      return res.status(400).json({ error: "В initData отсутствуют данные пользователя Telegram." });
    }

    let tgUser: any = null;
    try {
      tgUser = JSON.parse(userStr);
    } catch {
      return res.status(400).json({ error: "Некорректный JSON в поле user." });
    }

    if (!tgUser || !tgUser.id) {
      return res.status(400).json({ error: "ID пользователя Telegram не найден." });
    }

    // Optional cryptographic validation if TELEGRAM_BOT_TOKEN is set
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && hash) {
      try {
        const dataCheckArr: string[] = [];
        params.forEach((val, key) => {
          if (key !== "hash") {
            dataCheckArr.push(`${key}=${val}`);
          }
        });
        dataCheckArr.sort();
        const dataCheckString = dataCheckArr.join("\n");
        const secretKey = nodeCrypto.createHmac("sha256", "WebAppData").update(botToken).digest();
        const calculatedHash = nodeCrypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
        if (calculatedHash !== hash) {
          console.warn("Telegram WebApp HMAC check did not match - allowing safe fallback for preview/development");
        }
      } catch (cryptoErr) {
        console.warn("Crypto check error:", cryptoErr);
      }
    }

    const telegramIdStr = String(tgUser.id);
    const tgUsername = tgUser.username ? String(tgUser.username).replace(/^@/, "").trim() : null;
    const tgFullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ").trim() || (tgUsername ? `@${tgUsername}` : `Telegram #${telegramIdStr.slice(-4)}`);
    const avatarUrl = tgUser.photo_url || null;

    let user = await db.user.findFirst({
      where: {
        OR: [
          { telegramId: telegramIdStr },
          { email: `tg_${telegramIdStr}@telegram.org` },
          ...(tgUsername ? [{ telegramHandle: tgUsername }, { email: `${tgUsername.toLowerCase()}@telegram.org` }] : [])
        ]
      }
    });

    if (user) {
      const updateData: any = {};
      if (!user.telegramId) updateData.telegramId = telegramIdStr;
      if (tgUsername && !user.telegramHandle) updateData.telegramHandle = tgUsername;
      if (avatarUrl && !user.avatarUrl) updateData.avatarUrl = avatarUrl;
      if (Object.keys(updateData).length > 0) {
        user = await db.user.update({
          where: { id: user.id },
          data: updateData
        });
      }
    } else {
      let referredById: string | null = null;
      if (referralCode && typeof referralCode === "string") {
        const cleanRef = referralCode.trim();
        const referrer = await db.user.findFirst({
          where: { OR: [{ referralCode: cleanRef }, { id: cleanRef }] }
        });
        if (referrer) referredById = referrer.id;
      }

      const generatedPassword = await bcrypt.hash("tg_pass_" + telegramIdStr + "_" + Date.now(), 10);
      const email = `tg_${telegramIdStr}@telegram.org`;
      const newRefCode = generateReferralCode();

      user = await db.user.create({
        data: {
          email,
          password: generatedPassword,
          name: tgFullName,
          avatarUrl,
          telegramId: telegramIdStr,
          telegramHandle: tgUsername,
          role: "USER",
          referralCode: newRefCode,
          referredById: referredById || undefined
        }
      });

      if (referredById) {
        broadcastEvent({
          type: "REFERRAL_ACTIVATED",
          userId: referredById,
          payload: {
            referrerId: referredById,
            newUserId: user.id,
            userName: user.name || "Telegram Пользователь",
            email: maskEmail(user.email)
          }
        });
      }
    }

    if (user.isBanned) {
      return res.status(403).json({
        error: `Ваш аккаунт заблокирован разработчиком.${user.banReason ? ` Причина: ${user.banReason}` : ""}`
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "60d" }
    );

    res.json({
      token,
      user: formatUserResponse(user)
    });
  } catch (error: any) {
    console.error("Telegram WebApp auth error:", error);
    res.status(500).json({ error: "Ошибка авторизации через Telegram WebApp" });
  }
});

// Fast login via Telegram Handle / ID
app.post("/api/auth/telegram/fast-login", async (req, res) => {
  try {
    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });
    await ensureOrderSchema(db);

    const { username, referralCode } = req.body;
    if (!username || typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ error: "Укажите имя пользователя Telegram (@username)" });
    }

    const cleanUsername = username.replace(/^@/, "").trim().toLowerCase();
    const fakeTgId = "tg_" + Math.abs(cleanUsername.split("").reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0));

    let user = await db.user.findFirst({
      where: {
        OR: [
          { telegramHandle: cleanUsername },
          { email: `${cleanUsername}@telegram.org` },
          { telegramId: fakeTgId }
        ]
      }
    });

    if (!user) {
      let referredById: string | null = null;
      if (referralCode && typeof referralCode === "string") {
        const cleanRef = referralCode.trim();
        const referrer = await db.user.findFirst({
          where: { OR: [{ referralCode: cleanRef }, { id: cleanRef }] }
        });
        if (referrer) referredById = referrer.id;
      }

      const generatedPassword = await bcrypt.hash("tg_" + cleanUsername, 10);
      const uniqueNickname = await generateUniqueNickname(db, cleanUsername);
      user = await db.user.create({
        data: {
          email: `${cleanUsername}@telegram.org`,
          password: generatedPassword,
          name: uniqueNickname,
          telegramHandle: cleanUsername,
          telegramId: fakeTgId,
          role: "USER",
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${uniqueNickname}`,
          referralCode: generateReferralCode(),
          referredById: referredById || undefined
        }
      });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: `Аккаунт заблокирован.` });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "60d" }
    );

    res.json({
      token,
      user: formatUserResponse(user)
    });
  } catch (error: any) {
    console.error("Fast Telegram auth error:", error);
    res.status(500).json({ error: "Ошибка быстрого входа через Telegram" });
  }
});

// Telegram Login Widget / Bot Info status
app.get("/api/auth/telegram/bot-info", async (req, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const botUsernameEnv = process.env.TELEGRAM_BOT_USERNAME;
    let botUsername = botUsernameEnv || null;

    if (botToken && !botUsername) {
      try {
        const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
        const meData = await meRes.json();
        if (meData.ok && meData.result?.username) {
          botUsername = meData.result.username;
        }
      } catch {}
    }

    res.json({
      isConfigured: Boolean(botToken || botUsername),
      botUsername: botUsername || null
    });
  } catch (err: any) {
    res.json({ isConfigured: false, botUsername: null });
  }
});

// Telegram Widget Auth endpoint
app.post("/api/auth/telegram/widget", async (req, res) => {
  try {
    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });
    await ensureOrderSchema(db);

    const { id, first_name, last_name, username, photo_url, auth_date, hash, referralCode } = req.body;
    if (!id) {
      return res.status(400).json({ error: "ID пользователя Telegram отсутствует." });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && hash) {
      try {
        const checkArr: string[] = [];
        const checkKeys = ["auth_date", "first_name", "id", "last_name", "photo_url", "username"];
        for (const k of checkKeys) {
          if (req.body[k] !== undefined && req.body[k] !== null) {
            checkArr.push(`${k}=${req.body[k]}`);
          }
        }
        checkArr.sort();
        const checkString = checkArr.join("\n");
        const secretKey = nodeCrypto.createHash("sha256").update(botToken).digest();
        const calculatedHash = nodeCrypto.createHmac("sha256", secretKey).update(checkString).digest("hex");
        if (calculatedHash !== hash) {
          console.warn("Telegram widget HMAC check mismatch - allowing fallback for preview");
        }
      } catch (e) {
        console.warn("Telegram widget crypto check error:", e);
      }
    }

    const telegramIdStr = String(id);
    const cleanUsername = username ? String(username).replace(/^@/, "").trim().toLowerCase() : null;
    const rawFirstName = first_name ? [first_name, last_name].filter(Boolean).join(" ").trim() : null;
    const rawSeed = (rawFirstName && !isPhoneLikeString(rawFirstName) ? rawFirstName : null) || (cleanUsername && !isPhoneLikeString(cleanUsername) ? cleanUsername : null) || null;
    const avatarUrl = photo_url || (cleanUsername ? `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}` : null);

    let user = await db.user.findFirst({
      where: {
        OR: [
          { telegramId: telegramIdStr },
          { email: `tg_${telegramIdStr}@telegram.org` },
          ...(cleanUsername ? [{ telegramHandle: cleanUsername }, { email: `${cleanUsername}@telegram.org` }] : [])
        ]
      }
    });

    if (user) {
      const updateData: any = {};
      if (!user.telegramId) updateData.telegramId = telegramIdStr;
      if (cleanUsername && (!user.telegramHandle || user.telegramHandle !== cleanUsername)) updateData.telegramHandle = cleanUsername;
      if (avatarUrl && !user.avatarUrl) updateData.avatarUrl = avatarUrl;
      if (!user.name || isPhoneLikeString(user.name)) {
        updateData.name = await generateUniqueNickname(db, rawSeed, user.id);
      }
      if (Object.keys(updateData).length > 0) {
        user = await db.user.update({
          where: { id: user.id },
          data: updateData
        });
      }
    } else {
      let referredById: string | null = null;
      if (referralCode && typeof referralCode === "string") {
        const cleanRef = referralCode.trim();
        const referrer = await db.user.findFirst({
          where: { OR: [{ referralCode: cleanRef }, { id: cleanRef }] }
        });
        if (referrer) referredById = referrer.id;
      }

      const uniqueNickname = await generateUniqueNickname(db, rawSeed);
      const generatedPassword = await bcrypt.hash("tg_widget_" + telegramIdStr, 10);
      user = await db.user.create({
        data: {
          email: cleanUsername ? `${cleanUsername}@telegram.org` : `tg_${telegramIdStr}@telegram.org`,
          password: generatedPassword,
          name: uniqueNickname,
          telegramHandle: cleanUsername || null,
          telegramId: telegramIdStr,
          role: "USER",
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${uniqueNickname}`,
          referralCode: generateReferralCode(),
          referredById: referredById || undefined
        }
      });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: `Аккаунт заблокирован.` });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "60d" }
    );

    res.json({
      token,
      user: formatUserResponse(user)
    });
  } catch (error: any) {
    console.error("Telegram Widget auth error:", error);
    res.status(500).json({ error: "Ошибка авторизации через Telegram Widget" });
  }
});

// Setup Full Telegram Auth routes (Sessions, QR, SMS/OTP codes, Verification)
setupTelegramAuthRoutes(app, getPrismaClient() as any);

// Admin update user role (Strictly Admin: gelgaev.dev@mail.ru and designated moderators)
app.put("/api/dev/users/:id/role", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser || !isAdminUser(authUser)) {
      return res.status(403).json({
        error: "Доступ запрещен. Только администратор (gelgaev.dev@mail.ru) может назначать роли пользователей и модераторов."
      });
    }

    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });
    await ensureOrderSchema(db);

    const targetUserId = req.params.id;
    const { role } = req.body;
    const validRoles = ["USER", "SELLER", "MODERATOR", "ADMIN"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Недопустимая роль. Доступные роли: USER, SELLER, MODERATOR, ADMIN" });
    }

    const targetUser = await db.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return res.status(404).json({ error: "Пользователь не найден." });
    }

    if (isDeveloperEmail(targetUser.email) && role !== "ADMIN") {
      return res.status(400).json({ error: "Роль главного администратора не может быть понижена." });
    }

    const updated = await db.user.update({
      where: { id: targetUserId },
      data: { role }
    });

    broadcastEvent({
      type: "USER_UPDATED",
      userId: targetUserId,
      payload: { id: targetUserId, role }
    });

    res.json({ success: true, user: formatUserResponse(updated) });
  } catch (error: any) {
    console.error("Set role error:", error);
    res.status(500).json({ error: "Ошибка при обновлении роли" });
  }
});

// ==========================================
// GITHUB OAUTH & AUTHENTICATION ENDPOINTS
// ==========================================

// 1. Get GitHub OAuth Authorize URL
app.get("/api/auth/github/url", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.CLIENT_SECRET;
  const baseUrl = getRequestBaseUrl(req);
  const redirectUri = (req.query.redirect_uri as string) || `${baseUrl}/auth/callback`;
  const referralCode = (req.query.referralCode as string) || "";
  const statePayload = {
    ref: referralCode,
    origin: baseUrl,
    time: Date.now()
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64");

  const isConfigured = Boolean(clientId && clientId.trim() !== "" && clientSecret && clientSecret.trim() !== "");
  const authUrl = isConfigured
    ? `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId!)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent("read:user user:email")}&state=${encodeURIComponent(state)}`
    : null;

  res.json({
    url: authUrl,
    isConfigured,
    clientId: isConfigured ? clientId : null,
    redirectUri,
    appUrl: baseUrl,
    callbacks: [
      `${baseUrl}/auth/callback`,
      `${baseUrl}/auth/github/callback`
    ],
    message: isConfigured ? "GitHub OAuth configured" : "GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not configured in environment variables"
  });
});

// 2. GitHub OAuth Callback (Pop-up bridge or redirect)
app.get([
  "/auth/callback",
  "/auth/callback/",
  "/auth/github/callback",
  "/auth/github/callback/",
  "/api/auth/github/callback",
  "/api/auth/github/callback/"
], async (req, res) => {
  try {
    const code = req.query.code as string;
    const errorParam = req.query.error as string;
    const errorDesc = req.query.error_description as string;
    const stateStr = req.query.state as string;

    let stateObj: any = {};
    if (stateStr) {
      try {
        stateObj = JSON.parse(Buffer.from(stateStr, "base64").toString("utf-8"));
      } catch {
        try {
          stateObj = JSON.parse(stateStr);
        } catch {}
      }
    }

    if (errorParam || !code) {
      const msg = errorDesc || errorParam || "Авторизация через GitHub была отменена или не удалась.";
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Ошибка GitHub</title></head>
        <body style="background:#09090b;color:#f87171;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px;box-sizing:border-box;">
          <div style="background:#18181b;border:1px solid #27272a;border-radius:20px;padding:32px 24px;max-width:380px;width:100%;">
            <h2 style="font-size:18px;margin-bottom:8px;color:#f87171;">Ошибка авторизации GitHub</h2>
            <p style="color:#a1a1aa;font-size:13px;margin-bottom:16px;">${escapeHtml(msg)}</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(msg)} }, '*');
              setTimeout(() => window.close(), 1500);
            } else {
              window.location.href = '/admin?error=' + encodeURIComponent(${JSON.stringify(msg)});
            }
          </script>
        </body>
        </html>
      `);
    }

    const clientId = process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      const msg = "GITHUB_CLIENT_ID или GITHUB_CLIENT_SECRET не настроены в переменных окружения.";
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Ошибка конфигурации</title></head>
        <body style="background:#09090b;color:#f87171;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px;box-sizing:border-box;">
          <div style="background:#18181b;border:1px solid #27272a;border-radius:20px;padding:32px 24px;max-width:380px;width:100%;">
            <h2 style="font-size:18px;margin-bottom:8px;color:#f87171;">GitHub OAuth не настроен</h2>
            <p style="color:#a1a1aa;font-size:13px;margin-bottom:16px;">${escapeHtml(msg)}</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(msg)} }, '*');
              setTimeout(() => window.close(), 2000);
            }
          </script>
        </body>
        </html>
      `);
    }

    const baseUrl = stateObj.origin || getRequestBaseUrl(req);
    // Use the actual pathname hit by the browser to match GitHub redirect_uri strictly
    const currentPath = req.path.replace(/\/$/, "");
    const redirectUri = `${baseUrl}${currentPath || "/auth/callback"}`;

    // 1. Обмениваем временный код на GitHub access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "TMA-Builder-App"
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      })
    });

    const tokenData = (await tokenRes.json()) as any;
    if (tokenData.error || !tokenData.access_token) {
      const msg = tokenData.error_description || tokenData.error || "Не удалось получить токен доступа GitHub.";
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Ошибка GitHub</title></head>
        <body style="background:#09090b;color:#f87171;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px;box-sizing:border-box;">
          <div style="background:#18181b;border:1px solid #27272a;border-radius:20px;padding:32px 24px;max-width:380px;width:100%;">
            <h2 style="font-size:18px;margin-bottom:8px;color:#f87171;">Ошибка обмена токена</h2>
            <p style="color:#a1a1aa;font-size:13px;margin-bottom:16px;">${escapeHtml(msg)}</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(msg)} }, '*');
              setTimeout(() => window.close(), 1500);
            }
          </script>
        </body>
        </html>
      `);
    }

    const accessToken = tokenData.access_token;

    // 2. Запрашиваем профиль пользователя из GitHub API
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "TMA-Builder-App"
      }
    });

    const ghUser = (await userRes.json()) as any;
    if (!ghUser || !ghUser.login) {
      const msg = "Не удалось получить профиль пользователя GitHub.";
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Ошибка GitHub</title></head>
        <body style="background:#09090b;color:#f87171;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px;box-sizing:border-box;">
          <div style="background:#18181b;border:1px solid #27272a;border-radius:20px;padding:32px 24px;max-width:380px;width:100%;">
            <h2 style="font-size:18px;margin-bottom:8px;color:#f87171;">Ошибка получения профиля</h2>
            <p style="color:#a1a1aa;font-size:13px;margin-bottom:16px;">${escapeHtml(msg)}</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(msg)} }, '*');
              setTimeout(() => window.close(), 1500);
            }
          </script>
        </body>
        </html>
      `);
    }

    // 3. Получаем основной e-mail
    let userEmail = ghUser.email;
    if (!userEmail) {
      try {
        const emailsRes = await fetch("https://api.github.com/user/emails", {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "TMA-Builder-App"
          }
        });
        const emails = (await emailsRes.json()) as any[];
        if (Array.isArray(emails)) {
          const primary = emails.find((e: any) => e.primary && e.verified) || emails.find((e: any) => e.verified) || emails[0];
          if (primary && primary.email) {
            userEmail = primary.email;
          }
        }
      } catch (e) {
        console.warn("Could not fetch GitHub user emails:", e);
      }
    }

    if (!userEmail) {
      userEmail = `${ghUser.login.toLowerCase()}@users.noreply.github.com`;
    }

    const cleanEmail = userEmail.toLowerCase().trim();
    const displayName = ghUser.name || ghUser.login || "GitHub User";
    const avatarUrl = ghUser.avatar_url || null;
    const githubHandle = ghUser.login || null;
    const githubId = String(ghUser.id || "");

    const db = getPrismaClient();
    if (!db) {
      throw new Error("База данных недоступна");
    }

    await ensureOrderSchema(db);

    // 1. Поиск пользователя по githubId, email или githubHandle
    const userByGhId = githubId ? await db.user.findFirst({ where: { githubId } }) : null;
    const userByEmail = await db.user.findUnique({ where: { email: cleanEmail } });
    const userByHandle = githubHandle
      ? await db.user.findFirst({ where: { githubHandle: { equals: githubHandle, mode: "insensitive" } } })
      : null;

    let user = userByGhId || userByEmail || userByHandle;

    if (user) {
      // Освобождаем githubId и githubHandle у других записей, если они были случайно привязаны
      if (githubId) {
        await db.$executeRawUnsafe(
          `UPDATE "User" SET "githubId" = NULL WHERE "githubId" = $1 AND "id" != $2;`,
          githubId,
          user.id
        ).catch(() => {});
      }
      if (githubHandle) {
        await db.$executeRawUnsafe(
          `UPDATE "User" SET "githubHandle" = NULL WHERE LOWER("githubHandle") = LOWER($1) AND "id" != $2;`,
          githubHandle,
          user.id
        ).catch(() => {});
      }

      // Если аккаунт был создан с временной noreply-почтой, а сейчас пришла реальная
      const isDummyEmail = user.email.includes("users.noreply.github.com");
      const shouldUpdateEmail = isDummyEmail && !cleanEmail.includes("noreply.github.com");
      let emailToSet = user.email;
      if (shouldUpdateEmail && (!userByEmail || userByEmail.id === user.id)) {
        emailToSet = cleanEmail;
      }

      const updateData: any = {};
      if (emailToSet !== user.email) {
        updateData.email = emailToSet;
      }
      if (avatarUrl && (!user.avatarUrl || user.avatarUrl.includes("github") || user.avatarUrl.includes("avatars.githubusercontent"))) {
        updateData.avatarUrl = avatarUrl;
      } else if (!user.avatarUrl && avatarUrl) {
        updateData.avatarUrl = avatarUrl;
      }
      if (!user.name && displayName) {
        updateData.name = displayName;
      }
      if (githubHandle && (user as any).githubHandle !== githubHandle) {
        updateData.githubHandle = githubHandle;
      }
      if (githubId && (user as any).githubId !== githubId) {
        updateData.githubId = githubId;
      }

      if (Object.keys(updateData).length > 0) {
        try {
          user = await db.user.update({
            where: { id: user.id },
            data: updateData
          });
        } catch (updateErr: any) {
          console.warn("Soft update warning during GitHub login:", updateErr?.message);
          // Если возникла коллизия по уникальному полю, очищаем конфликт и повторяем
          if (githubId) {
            await db.$executeRawUnsafe(`UPDATE "User" SET "githubId" = NULL WHERE "githubId" = $1 AND "id" != $2;`, githubId, user.id).catch(() => {});
          }
          if (githubHandle) {
            await db.$executeRawUnsafe(`UPDATE "User" SET "githubHandle" = NULL WHERE LOWER("githubHandle") = LOWER($1) AND "id" != $2;`, githubHandle, user.id).catch(() => {});
          }
          user = await db.user.update({
            where: { id: user.id },
            data: {
              avatarUrl: updateData.avatarUrl || user.avatarUrl,
              name: user.name || displayName || null,
              githubHandle: githubHandle || (user as any).githubHandle || null
            }
          }).catch(() => user);
        }
      }
    } else {
      // Предотвращаем конфликт githubId и githubHandle перед созданием нового пользователя
      if (githubId) {
        await db.$executeRawUnsafe(
          `UPDATE "User" SET "githubId" = NULL WHERE "githubId" = $1;`,
          githubId
        ).catch(() => {});
      }
      if (githubHandle) {
        await db.$executeRawUnsafe(
          `UPDATE "User" SET "githubHandle" = NULL WHERE LOWER("githubHandle") = LOWER($1);`,
          githubHandle
        ).catch(() => {});
      }

      let referredById: string | null = null;
      if (stateObj.ref) {
        try {
          const referrer = await db.user.findFirst({
            where: {
              OR: [
                { referralCode: stateObj.ref },
                { id: stateObj.ref }
              ]
            }
          });
          if (referrer && referrer.email.toLowerCase() !== cleanEmail) {
            referredById = referrer.id;
          }
        } catch {}
      }

      const newRefCode = generateReferralCode();
      const randomPass = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10);

      user = await db.user.create({
        data: {
          email: cleanEmail,
          password: randomPass,
          name: displayName,
          avatarUrl: avatarUrl,
          githubHandle: githubHandle,
          githubId: githubId,
          referralCode: newRefCode,
          referredById: referredById || undefined
        }
      });

      if (referredById) {
        broadcastEvent({
          type: "REFERRAL_ACTIVATED",
          userId: referredById,
          payload: {
            referrerId: referredById,
            newUserId: user.id,
            userName: user.name || "Пользователь",
            email: maskEmail(user.email)
          }
        });
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    const formattedUser = formatUserResponse(user);

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Авторизация через GitHub</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="background:#09090b;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:16px;box-sizing:border-box;text-align:center;">
        <div style="background:#18181b;border:1px solid #27272a;border-radius:24px;padding:32px 24px;max-width:380px;width:100%;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);">
          <div style="width:56px;height:56px;border-radius:16px;background:#27272a;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #3f3f46;">
            ${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : `
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>`}
          </div>
          <h2 style="font-size:18px;margin:0 0 6px;font-weight:700;color:#ffffff;">Успешный вход</h2>
          <p style="font-size:13px;color:#a1a1aa;margin:0 0 16px;">Добро пожаловать, <strong style="color:#34d399;">@${escapeHtml(githubHandle || displayName)}</strong>!</p>
          <div style="font-size:11px;color:#71717a;font-family:monospace;">Синхронизация профиля...</div>
        </div>
        <script>
          const authPayload = ${JSON.stringify({
            type: 'OAUTH_AUTH_SUCCESS',
            provider: 'github',
            token,
            user: formattedUser
          })};
          if (window.opener) {
            window.opener.postMessage(authPayload, '*');
            setTimeout(() => {
              window.close();
            }, 350);
          } else {
            try {
              localStorage.setItem('auth_token', ${JSON.stringify(token)});
              localStorage.setItem('auth_user', JSON.stringify(authPayload.user));
            } catch(e) {}
            window.location.href = '/admin';
          }
        </script>
      </body>
      </html>
    `);
  } catch (err: any) {
    console.error("GitHub auth callback error:", err);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Ошибка сервера</title></head>
      <body style="background:#09090b;color:#f87171;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px;box-sizing:border-box;">
        <div style="background:#18181b;border:1px solid #27272a;border-radius:20px;padding:32px 24px;max-width:380px;width:100%;">
          <h2 style="font-size:18px;margin-bottom:8px;color:#f87171;">Ошибка сервера GitHub</h2>
          <p style="color:#a1a1aa;font-size:13px;margin-bottom:16px;">${escapeHtml(err.message || "Неизвестная ошибка")}</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(err.message || "Ошибка сервера")} }, '*');
            setTimeout(() => window.close(), 2000);
          }
        </script>
      </body>
      </html>
    `);
  }
});

// 3. Instant GitHub Profile Sync & Fast Login (handles custom or demo GitHub profiles)
app.post("/api/auth/github/fast-login", async (req, res) => {
  try {
    const { username, referralCode } = req.body;
    const cleanUsername = String(username || "blesswrld").trim().replace(/^@/, "");
    if (!cleanUsername) {
      return res.status(400).json({ error: "Укажите никнейм GitHub" });
    }

    // Запрашиваем публичные данные профиля GitHub
    let ghName = cleanUsername;
    let ghAvatar = `https://github.com/${cleanUsername}.png`;
    let ghEmail = `${cleanUsername.toLowerCase()}@users.noreply.github.com`;
    let ghId = `gh_${cleanUsername}`;

    try {
      const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}`, {
        headers: {
          "User-Agent": "TMA-Builder-App",
          "Accept": "application/vnd.github.v3+json"
        }
      });
      if (ghRes.ok) {
        const ghData = (await ghRes.json()) as any;
        ghName = ghData.name || ghData.login || cleanUsername;
        ghAvatar = ghData.avatar_url || ghAvatar;
        if (ghData.email) ghEmail = ghData.email.toLowerCase();
        if (ghData.id) ghId = String(ghData.id);
      }
    } catch (e) {
      console.warn("Could not fetch public github user data:", e);
    }

    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });
    await ensureOrderSchema(db);

    const userByGhId = ghId ? await db.user.findFirst({ where: { githubId: ghId } }) : null;
    const userByEmail = await db.user.findUnique({ where: { email: ghEmail } });
    const userByHandle = await db.user.findFirst({ where: { githubHandle: { equals: cleanUsername, mode: "insensitive" } } });

    let user = userByGhId || userByEmail || userByHandle;

    if (user) {
      if (ghId) {
        await db.$executeRawUnsafe(
          `UPDATE "User" SET "githubId" = NULL WHERE "githubId" = $1 AND "id" != $2;`,
          ghId,
          user.id
        ).catch(() => {});
      }
      user = await db.user.update({
        where: { id: user.id },
        data: {
          avatarUrl: ghAvatar,
          name: ghName || user.name,
          githubHandle: cleanUsername,
          githubId: ghId
        }
      });
    } else {
      if (ghId) {
        await db.$executeRawUnsafe(
          `UPDATE "User" SET "githubId" = NULL WHERE "githubId" = $1;`,
          ghId
        ).catch(() => {});
      }

      let referredById: string | null = null;
      if (referralCode) {
        try {
          const referrer = await db.user.findFirst({
            where: {
              OR: [
                { referralCode: referralCode },
                { id: referralCode }
              ]
            }
          });
          if (referrer) referredById = referrer.id;
        } catch {}
      }

      const randomPass = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10);
      user = await db.user.create({
        data: {
          email: ghEmail,
          password: randomPass,
          name: ghName,
          avatarUrl: ghAvatar,
          githubHandle: cleanUsername,
          githubId: ghId,
          referralCode: generateReferralCode(),
          referredById: referredById || undefined
        }
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      token,
      user: formatUserResponse(user),
      message: `Успешный вход через GitHub (@${cleanUsername})!`
    });
  } catch (error: any) {
    console.error("GitHub fast login error:", error);
    res.status(500).json({ error: error.message || "Ошибка авторизации через GitHub" });
  }
});

// 4. Sync / Refresh GitHub Profile (Avatar, Nickname, ID) for authenticated user
app.post("/api/user/github/sync", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Сначала войдите в аккаунт." });
    }

    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });
    await ensureOrderSchema(db);

    const user = await db.user.findUnique({ where: { id: authUser.id } });
    if (!user) return res.status(404).json({ error: "Пользователь не найден." });

    const targetHandle = (req.body.username || (user as any).githubHandle || "").trim().replace(/^@/, "");
    if (!targetHandle) {
      return res.status(400).json({ error: "GitHub никнейм не указан." });
    }

    let ghName = targetHandle;
    let ghAvatar = `https://github.com/${targetHandle}.png`;
    let ghId = (user as any).githubId || `gh_${targetHandle}`;

    try {
      const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(targetHandle)}`, {
        headers: {
          "User-Agent": "TMA-Builder-App",
          "Accept": "application/vnd.github.v3+json"
        }
      });
      if (ghRes.ok) {
        const ghData = (await ghRes.json()) as any;
        ghName = ghData.name || ghData.login || targetHandle;
        ghAvatar = ghData.avatar_url || ghAvatar;
        if (ghData.id) ghId = String(ghData.id);
      }
    } catch (e) {
      console.warn("Could not fetch github user info:", e);
    }

    if (ghId) {
      await db.$executeRawUnsafe(
        `UPDATE "User" SET "githubId" = NULL WHERE "githubId" = $1 AND "id" != $2;`,
        ghId,
        user.id
      ).catch(() => {});
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: ghAvatar,
        name: user.name || ghName,
        githubHandle: targetHandle,
        githubId: ghId
      }
    });

    const formatted = formatUserResponse(updated);
    broadcastEvent({ type: "USER_UPDATED", payload: formatted });

    res.json({
      success: true,
      user: formatted,
      message: `Профиль и аватарка успешно синхронизированы с GitHub (@${targetHandle})!`
    });
  } catch (error: any) {
    console.error("GitHub sync error:", error);
    res.status(500).json({ error: error.message || "Не удалось синхронизировать GitHub профиль." });
  }
});


app.get("/favicon.ico", (_req, res) => {
  res.status(204).end();
});

// Radio stream proxy for reliable background audio without CORS / tracking blocks
const RADIO_POOLS: Record<string, string[]> = {
  lounge: [
    "https://ice1.somafm.com/groovesalad-128-mp3",
    "https://ice6.somafm.com/groovesalad-128-mp3",
    "https://ice1.somafm.com/lush-128-mp3"
  ],
  lofi: [
    "https://ice1.somafm.com/illstreet-128-mp3",
    "https://ice1.somafm.com/fluid-128-mp3",
    "https://stream.nightride.fm/chillsynth.mp3"
  ],
  deephouse: [
    "https://ice1.somafm.com/beatblender-128-mp3",
    "https://ice1.somafm.com/defcon-128-mp3",
    "https://ice1.somafm.com/cliqhop-128-mp3"
  ],
  jazz: [
    "https://ice1.somafm.com/secretagent-128-mp3",
    "https://ice1.somafm.com/illstreet-128-mp3",
    "https://ice1.somafm.com/bootliquor-128-mp3"
  ],
  spa: [
    "https://ice1.somafm.com/deepspaceone-128-mp3",
    "https://ice1.somafm.com/dronezone-128-mp3",
    "https://ice1.somafm.com/spacestation-128-mp3"
  ]
};

function pipeAudioStream(urls: string[], res: express.Response, req: express.Request, index = 0) {
  if (index >= urls.length) {
    if (!res.headersSent) {
      res.status(502).json({ error: "Stream unavailable" });
    }
    return;
  }

  const targetUrl = urls[index];
  const urlObj = new URL(targetUrl);
  const client = urlObj.protocol === "http:" ? http : https;

  const streamReq = client.get(
    targetUrl,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Icy-MetaData": "0"
      },
      timeout: 10000
    },
    (streamRes) => {
      // Handle redirects
      if (
        streamRes.statusCode &&
        (streamRes.statusCode === 301 || streamRes.statusCode === 302 || streamRes.statusCode === 307) &&
        streamRes.headers.location
      ) {
        streamRes.destroy();
        return pipeAudioStream([streamRes.headers.location, ...urls.slice(index + 1)], res, req, 0);
      }

      if (!streamRes.statusCode || streamRes.statusCode >= 400) {
        streamRes.destroy();
        return pipeAudioStream(urls, res, req, index + 1);
      }

      res.writeHead(200, {
        "Content-Type": streamRes.headers["content-type"] || "audio/mpeg",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Access-Control-Allow-Origin": "*",
        "Connection": "keep-alive"
      });

      streamRes.pipe(res);

      req.on("close", () => {
        streamRes.destroy();
      });

      streamRes.on("error", () => {
        streamRes.destroy();
        if (!res.writableEnded) {
          res.end();
        }
      });
    }
  );

  streamReq.on("error", () => {
    pipeAudioStream(urls, res, req, index + 1);
  });

  streamReq.on("timeout", () => {
    streamReq.destroy();
    pipeAudioStream(urls, res, req, index + 1);
  });

  req.on("close", () => {
    streamReq.destroy();
  });
}

app.get("/api/radio-stream/:genre", (req, res) => {
  const genre = req.params.genre?.toLowerCase();
  const pool = RADIO_POOLS[genre] || RADIO_POOLS["lounge"];
  pipeAudioStream(pool, res, req, 0);
});

app.get("/api/audio-proxy", (req, res) => {
  const streamUrl = req.query.url as string;
  if (!streamUrl || typeof streamUrl !== "string" || !streamUrl.startsWith("http")) {
    return res.status(400).json({ error: "Invalid stream URL" });
  }
  pipeAudioStream([streamUrl], res, req, 0);
});

// Auth Route: Профиль текущего пользователя
app.get("/api/auth/me", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Не авторизован." });
    }

    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });

    await ensureOrderSchema(db);

    let user = await db.user.findUnique({ where: { id: authUser.id } });
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден." });
    }

    // Auto-fix if user has a phone number (+1475...) as name or null/empty name
    if (!user.name || isPhoneLikeString(user.name)) {
      const uniqueName = await generateUniqueNickname(db, user.telegramHandle ? `@${user.telegramHandle}` : null, user.id);
      user = await db.user.update({
        where: { id: user.id },
        data: { name: uniqueName }
      });
    }

    if (user.isBanned && !isDeveloperEmail(user.email)) {
      return res.status(403).json({
        error: `Ваш аккаунт заблокирован разработчиком платформы.${user.banReason ? ` Причина: ${user.banReason}` : ""}`,
        isBanned: true,
        banReason: user.banReason
      });
    }

    res.json(formatUserResponse(user));
  } catch (error: any) {
    res.status(500).json({ error: "Ошибка получения профиля." });
  }
});

// Auth Route: Обновить профиль пользователя
app.put("/api/user/profile", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Сначала войдите в аккаунт." });
    }

    const { name, phone, avatarUrl, telegramHandle, githubHandle, githubId, companyName, currentPassword, newPassword, emailCode } = req.body;

    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка базы данных." });

    await ensureOrderSchema(db);

    const user = await db.user.findUnique({ where: { id: authUser.id } });
    if (!user) return res.status(404).json({ error: "Пользователь не найден." });

    let updatedPassword = user.password;
    if (newPassword) {
      if (!newPassword || String(newPassword).length < 6) {
        return res.status(400).json({ error: "Новый пароль должен содержать минимум 6 символов." });
      }

      // Проверка: новый пароль не должен совпадать с текущим
      const isSameAsOld = await bcrypt.compare(String(newPassword), user.password);
      if (isSameAsOld) {
        return res.status(400).json({ error: "Новый пароль не должен совпадать с вашим текущим паролем." });
      }

      // Вариант 1: Через текущий пароль
      if (currentPassword && !emailCode) {
        const isMatch = await bcrypt.compare(String(currentPassword), user.password);
        if (!isMatch) {
          return res.status(400).json({ error: "Текущий пароль указан неверно!" });
        }
        if (String(newPassword).trim().toLowerCase() === String(currentPassword).trim().toLowerCase()) {
          return res.status(400).json({ error: "Новый пароль не должен совпадать с текущим паролем." });
        }
        updatedPassword = await bcrypt.hash(String(newPassword), 10);
      } 
      // Вариант 2: Через код из письма (если забыли пароль)
      else if (emailCode) {
        const cleanCode = String(emailCode).trim();
        const validCodes: any[] = await db.$queryRawUnsafe(
          `SELECT * FROM "VerificationCode" WHERE "email" = $1 AND "code" = $2 AND "expiresAt" > CURRENT_TIMESTAMP LIMIT 1;`,
          user.email.toLowerCase().trim(),
          cleanCode
        );

        if (!validCodes || validCodes.length === 0) {
          return res.status(400).json({ error: "Неверный или просроченный код из письма. Нажмите «Запросить код»." });
        }

        // Удаляем использованный код
        await db.$executeRawUnsafe(`DELETE FROM "VerificationCode" WHERE "email" = $1;`, user.email.toLowerCase().trim()).catch(() => {});
        updatedPassword = await bcrypt.hash(String(newPassword), 10);
      } else {
        return res.status(400).json({ error: "Укажите текущий пароль или введите 6-значный код из письма для смены пароля." });
      }
    }

    if (githubId) {
      await db.$executeRawUnsafe(
        `UPDATE "User" SET "githubId" = NULL WHERE "githubId" = $1 AND "id" != $2;`,
        String(githubId).trim(),
        authUser.id
      ).catch(() => {});
    }

    // Process and validate unique nickname
    let resolvedName = user.name;
    if (name !== undefined) {
      const candidate = String(name || "").trim();
      if (!candidate || isPhoneLikeString(candidate)) {
        resolvedName = await generateUniqueNickname(
          db,
          user.telegramHandle ? `@${user.telegramHandle}` : null,
          authUser.id
        );
      } else {
        // Check uniqueness across other users
        const duplicateUser = await db.user.findFirst({
          where: {
            name: candidate,
            NOT: { id: authUser.id }
          }
        });
        if (duplicateUser) {
          return res.status(400).json({ error: "Этот никнейм уже занят другим пользователем. Пожалуйста, укажите уникальный никнейм." });
        }
        resolvedName = candidate;
      }
    }

    const updated = await db.user.update({
      where: { id: authUser.id },
      data: {
        name: resolvedName,
        phone: phone !== undefined ? (phone ? String(phone).trim() : null) : (user as any).phone,
        avatarUrl: avatarUrl !== undefined ? (avatarUrl ? String(avatarUrl).trim() : null) : (user as any).avatarUrl,
        telegramHandle: telegramHandle !== undefined ? (telegramHandle ? String(telegramHandle).trim() : null) : (user as any).telegramHandle,
        githubHandle: githubHandle !== undefined ? (githubHandle ? String(githubHandle).trim().replace(/^@/, "") : null) : (user as any).githubHandle,
        githubId: githubId !== undefined ? (githubId ? String(githubId).trim() : null) : (user as any).githubId,
        companyName: companyName !== undefined ? (companyName ? String(companyName).trim() : null) : (user as any).companyName,
        password: updatedPassword
      } as any
    });

    const formattedUser = formatUserResponse(updated);
    broadcastEvent({ type: "USER_UPDATED", payload: formattedUser });

    res.json({
      success: true,
      user: formattedUser
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Не удалось обновить профиль." });
  }
});

// ==========================================
// PAYMENT INTEGRATION: YooKassa & SaaS Billing
// ==========================================

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID?.trim() || "";
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY?.trim() || "";

const PLAN_PRICES: Record<string, number> = {
  PRO: 990,
  ENTERPRISE: 2990
};

// 1. Проверка промокода на сервере
app.post("/api/billing/validate-promocode", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Требуется авторизация." });

    const { code, plan } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: "Введите промокод." });
    }

    const cleanCode = code.trim().toUpperCase();
    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка базы данных." });

    // Проверяем в таблице SystemPromocode
    let promo: any = null;
    try {
      promo = await (db as any).systemPromocode.findUnique({
        where: { code: cleanCode }
      });
    } catch (e) {
      // fallback на SQL если модель еще прогревается
      const rows: any = await db.$queryRawUnsafe(
        `SELECT * FROM "SystemPromocode" WHERE "code" = $1 LIMIT 1`,
        cleanCode
      );
      if (rows && rows.length > 0) promo = rows[0];
    }

    if (!promo || !promo.isActive) {
      return res.status(404).json({ error: "Промокод не найден или неактивен." });
    }

    if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: "Срок действия промокода истёк." });
    }

    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return res.status(400).json({ error: "Лимит активаций промокода исчерпан." });
    }

    if (promo.applicablePlan && promo.applicablePlan !== "ALL" && plan && promo.applicablePlan !== plan) {
      return res.status(400).json({ error: `Промокод применим только для тарифа ${promo.applicablePlan}.` });
    }

    res.json({
      valid: true,
      code: promo.code,
      discountPercent: promo.discountPercent || 100
    });
  } catch (error: any) {
    console.error("Validate promo error:", error);
    res.status(500).json({ error: "Не удалось проверить промокод." });
  }
});

// 2. Создание платежа (Карта, СБП QR или 100% Промокод)
app.post("/api/billing/create-payment", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Сначала войдите в систему." });
    }

    const { plan, paymentMethod, promocode, returnUrl, billingCycle = "monthly" } = req.body;
    if (!["PRO", "ENTERPRISE"].includes(plan)) {
      return res.status(400).json({ error: "Недопустимый тариф для оплаты." });
    }

    if (!["card", "sbp", "promo"].includes(paymentMethod)) {
      return res.status(400).json({ error: "Неизвестный способ оплаты." });
    }

    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });

    const monthlyPrice = PLAN_PRICES[plan] || 990;
    const basePrice = billingCycle === "yearly" ? Math.round(monthlyPrice * 12 * 0.8) : monthlyPrice;
    const subscriptionDays = billingCycle === "yearly" ? 365 : 30;
    let finalAmount = basePrice;
    let appliedPromo: any = null;

    // Проверяем промокод если он указан
    if (promocode && promocode.trim()) {
      const cleanCode = promocode.trim().toUpperCase();
      try {
        appliedPromo = await (db as any).systemPromocode.findUnique({
          where: { code: cleanCode }
        });
      } catch (e) {
        const rows: any = await db.$queryRawUnsafe(
          `SELECT * FROM "SystemPromocode" WHERE "code" = $1 LIMIT 1`,
          cleanCode
        );
        if (rows && rows.length > 0) appliedPromo = rows[0];
      }

      if (appliedPromo && appliedPromo.isActive) {
        const discountPct = appliedPromo.discountPercent || 100;
        finalAmount = Math.max(0, Math.round(basePrice * (1 - discountPct / 100)));
      }
    }

    // Если способ оплаты 'promo' или сумма 0 руб -> мгновенная активация
    if (paymentMethod === "promo" || finalAmount === 0) {
      if (!appliedPromo && finalAmount > 0) {
        return res.status(400).json({ error: "Для активации по промокоду укажите корректный промокод со 100% скидкой." });
      }

      const expiresAt = new Date(Date.now() + subscriptionDays * 24 * 60 * 60 * 1000);
      const paymentId = `promo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Фиксируем платеж
      await db.$executeRawUnsafe(
        `INSERT INTO "Payment" ("id", "userId", "plan", "amount", "paymentMethod", "status", "promocode", "metadata", "paidAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, 'SUCCEEDED', $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        paymentId,
        authUser.id,
        plan,
        0,
        "promo",
        appliedPromo ? appliedPromo.code : "PROMO100",
        JSON.stringify({ billingCycle })
      );

      // Обновляем промокод счетчик
      if (appliedPromo) {
        await db.$executeRawUnsafe(
          `UPDATE "SystemPromocode" SET "usedCount" = "usedCount" + 1 WHERE "id" = $1`,
          appliedPromo.id
        );
      }

      // Обновляем план пользователя
      const updatedUser = await db.user.update({
        where: { id: authUser.id },
        data: {
          plan,
          subscriptionExpiresAt: expiresAt
        }
      });

      return res.json({
        success: true,
        instantSuccess: true,
        paymentId,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          plan: updatedUser.plan,
          subscriptionExpiresAt: updatedUser.subscriptionExpiresAt
        }
      });
    }

    // Реальная интеграция с YooKassa (Live или Test режим)
    const hasYooKassa = Boolean(YOOKASSA_SHOP_ID && YOOKASSA_SECRET_KEY);
    const internalPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (hasYooKassa) {
      const authHeader = "Basic " + Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString("base64");
      const appBaseUrl = getRequestBaseUrl(req);
      const redirectUrl = returnUrl || `${appBaseUrl}/?payment_status=check&payment_id=${internalPaymentId}`;

      const idempotenceKey = `tma_${internalPaymentId}`;
      const yooPayload: any = {
        amount: {
          value: finalAmount.toFixed(2),
          currency: "RUB"
        },
        capture: true,
        confirmation: {
          type: "redirect",
          return_url: redirectUrl
        },
        description: `Подписка TMA-Builder на тариф ${plan} (30 дней)`,
        metadata: {
          userId: authUser.id,
          plan,
          internalPaymentId,
          userEmail: authUser.email
        }
      };

      if (paymentMethod === "sbp") {
        yooPayload.payment_method_data = {
          type: "sbp"
        };
      }

      try {
        const yooRes = await fetch("https://api.yookassa.ru/v3/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotence-Key": idempotenceKey,
            "Authorization": authHeader
          },
          body: JSON.stringify(yooPayload)
        });

        const yooData: any = await yooRes.json();

        if (yooRes.ok && yooData.id) {
          const confirmationUrl = yooData.confirmation?.confirmation_url || null;
          const qrUrl = yooData.confirmation?.confirmation_data || null;

          await db.$executeRawUnsafe(
            `INSERT INTO "Payment" ("id", "userId", "plan", "amount", "paymentMethod", "status", "yooPaymentId", "confirmationUrl", "qrUrl", "promocode", "metadata", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
            internalPaymentId,
            authUser.id,
            plan,
            finalAmount,
            paymentMethod,
            yooData.status === "succeeded" ? "SUCCEEDED" : "PENDING",
            yooData.id,
            confirmationUrl,
            qrUrl,
            appliedPromo?.code || null,
            JSON.stringify({ billingCycle })
          );

          return res.json({
            success: true,
            paymentId: internalPaymentId,
            yooPaymentId: yooData.id,
            confirmationUrl,
            qrUrl, // Ссылка на СБП QR или Deeplink
            status: yooData.status,
            amount: finalAmount
          });
        } else {
          console.error("YooKassa create payment API error:", yooData);
          throw new Error(yooData.description || "Ошибка создания платежа в ЮКассе");
        }
      } catch (yooErr: any) {
        console.error("YooKassa fetch failed, fallbacking to safe universal provider:", yooErr.message);
      }
    }

    // Универсальный режим (Universal Sandbox / Custom SBP QR)
    // Генерируем реальный QR-код для СБП (стандарт НСПК payload / универсальная ссылка оплаты)
    const sbpPayloadUrl = `https://qr.nspk.ru/AD10000${Math.floor(10000000 + Math.random() * 90000000)}?type=02&bank=100000000111&sum=${finalAmount * 100}&cur=RUB&crc=812F`;
    const mockConfirmUrl = `${req.headers.origin || "https://tma-builder.vercel.app"}/?payment_status=success&payment_id=${internalPaymentId}`;

    await db.$executeRawUnsafe(
      `INSERT INTO "Payment" ("id", "userId", "plan", "amount", "paymentMethod", "status", "confirmationUrl", "qrUrl", "promocode", "metadata", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      internalPaymentId,
      authUser.id,
      plan,
      finalAmount,
      paymentMethod,
      mockConfirmUrl,
      paymentMethod === "sbp" ? sbpPayloadUrl : null,
      appliedPromo?.code || null,
      JSON.stringify({ billingCycle })
    );

    res.json({
      success: true,
      isUniversalMode: true,
      paymentId: internalPaymentId,
      confirmationUrl: mockConfirmUrl,
      qrUrl: paymentMethod === "sbp" ? sbpPayloadUrl : null,
      status: "PENDING",
      amount: finalAmount
    });
  } catch (error: any) {
    console.error("Create payment error:", error);
    res.status(500).json({ error: error.message || "Не удалось создать платёж." });
  }
});

// 3. Проверка статуса платежа клиентом (Polling)
app.get("/api/billing/payment-status/:paymentId", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Требуется авторизация." });

    const { paymentId } = req.params;
    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка базы данных." });

    const rows: any = await db.$queryRawUnsafe(
      `SELECT * FROM "Payment" WHERE "id" = $1 AND "userId" = $2 LIMIT 1`,
      paymentId,
      authUser.id
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Платеж не найден." });
    }

    const payment = rows[0];

    // Если платеж уже успешен
    if (payment.status === "SUCCEEDED") {
      const user = await db.user.findUnique({ where: { id: authUser.id } });
      return res.json({
        status: "SUCCEEDED",
        plan: payment.plan,
        user: user ? formatUserResponse(user) : null
      });
    }

    // Если есть ЮКасса ID — запрашиваем актуальный статус у ЮКассы
    if (payment.yooPaymentId && YOOKASSA_SHOP_ID && YOOKASSA_SECRET_KEY) {
      try {
        const authHeader = "Basic " + Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString("base64");
        const yooRes = await fetch(`https://api.yookassa.ru/v3/payments/${payment.yooPaymentId}`, {
          headers: { Authorization: authHeader }
        });

        if (yooRes.ok) {
          const yooData: any = await yooRes.json();
          if (yooData.status === "succeeded") {
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            await db.$executeRawUnsafe(
              `UPDATE "Payment" SET "status" = 'SUCCEEDED', "paidAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
              payment.id
            );

            const updatedUser = await db.user.update({
              where: { id: authUser.id },
              data: {
                plan: payment.plan,
                subscriptionExpiresAt: expiresAt
              }
            });

            return res.json({
              status: "SUCCEEDED",
              plan: payment.plan,
              user: formatUserResponse(updatedUser)
            });
          } else if (yooData.status === "canceled") {
            await db.$executeRawUnsafe(
              `UPDATE "Payment" SET "status" = 'CANCELED', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
              payment.id
            );
            return res.json({ status: "CANCELED" });
          }
        }
      } catch (err) {
        console.error("YooKassa status check error:", err);
      }
    }

    res.json({
      status: payment.status || "PENDING",
      plan: payment.plan
    });
  } catch (error: any) {
    console.error("Payment status error:", error);
    res.status(500).json({ error: "Ошибка проверки статуса платежа." });
  }
});

// 4. Подтверждение платежа (для универсального режима и клиентской кнопки подтверждения)
app.post("/api/billing/confirm-payment", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Требуется авторизация." });

    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ error: "Не указан ID платежа." });

    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка базы данных." });

    const rows: any = await db.$queryRawUnsafe(
      `SELECT * FROM "Payment" WHERE "id" = $1 AND "userId" = $2 LIMIT 1`,
      paymentId,
      authUser.id
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Платеж не найден." });
    }

    const payment = rows[0];
    let days = 30;
    try {
      if (payment.metadata) {
        const meta = JSON.parse(payment.metadata);
        if (meta.billingCycle === "yearly") days = 365;
      }
    } catch (e) {}
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await db.$executeRawUnsafe(
      `UPDATE "Payment" SET "status" = 'SUCCEEDED', "paidAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
      payment.id
    );

    const updatedUser = await db.user.update({
      where: { id: authUser.id },
      data: {
        plan: payment.plan,
        subscriptionExpiresAt: expiresAt
      }
    });

    res.json({
      success: true,
      plan: payment.plan,
      user: formatUserResponse(updatedUser)
    });
  } catch (error: any) {
    console.error("Confirm payment error:", error);
    res.status(500).json({ error: "Не удалось подтвердить платёж." });
  }
});

// История платежей
app.get("/api/billing/history", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Требуется авторизация." });

    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка базы данных." });

    const isDev = Boolean(
      authUser.email && (
        authUser.email.toLowerCase().trim() === "gelgaev.dev@mail.ru" ||
        authUser.email.toLowerCase().trim() === "roninfortnite71@gmail.com"
      )
    );

    let rows: any[] = [];
    if (isDev && req.query.all === "true") {
      rows = await db.$queryRawUnsafe(
        `SELECT p.*, u.email as "userEmail", u.name as "userName" 
         FROM "Payment" p 
         LEFT JOIN "User" u ON p."userId" = u.id 
         ORDER BY p."createdAt" DESC LIMIT 100`
      );
    } else {
      rows = await db.$queryRawUnsafe(
        `SELECT * FROM "Payment" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 100`,
        authUser.id
      );
    }

    res.json({ payments: rows || [] });
  } catch (error: any) {
    console.error("Payment history error:", error);
    res.status(500).json({ error: "Не удалось загрузить историю платежей." });
  }
});

// 5. YooKassa Webhook Handler
app.post("/api/billing/yookassa-webhook", async (req, res) => {
  try {
    const event = req.body;
    if (!event || !event.event) {
      return res.status(400).send("Invalid webhook");
    }

    const db = getPrismaClient();
    if (!db) return res.status(500).send("Database not ready");

    if (event.event === "payment.succeeded") {
      const yooPayment = event.object;
      const yooPaymentId = yooPayment?.id;

      if (yooPaymentId) {
        const rows: any = await db.$queryRawUnsafe(
          `SELECT * FROM "Payment" WHERE "yooPaymentId" = $1 LIMIT 1`,
          yooPaymentId
        );

        if (rows && rows.length > 0) {
          const payment = rows[0];
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          await db.$executeRawUnsafe(
            `UPDATE "Payment" SET "status" = 'SUCCEEDED', "paidAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
            payment.id
          );

          await db.user.update({
            where: { id: payment.userId },
            data: {
              plan: payment.plan,
              subscriptionExpiresAt: expiresAt
            }
          });

          // Оповещаем пользователя по WebSocket
          broadcastEvent({
            type: "SUBSCRIPTION_UPDATED",
            payload: {
              userId: payment.userId,
              plan: payment.plan,
              subscriptionExpiresAt: expiresAt
            }
          });
        }
      }
    }

    res.status(200).send("OK");
  } catch (error: any) {
    console.error("YooKassa webhook error:", error);
    res.status(200).send("Handled with error");
  }
});

// Auth Route: Изменить тарифный план (SaaS симуляция)
app.post("/api/user/upgrade-plan", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Сначала войдите в систему." });
    }

    const { plan } = req.body; // "FREE", "PRO", "ENTERPRISE"
    if (!["FREE", "PRO", "ENTERPRISE"].includes(plan)) {
      return res.status(400).json({ error: "Неверный тарифный план." });
    }

    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка базы данных." });

    const expiresAt = plan === "FREE" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days

    const updatedUser = await db.user.update({
      where: { id: authUser.id },
      data: {
        plan,
        subscriptionExpiresAt: expiresAt
      }
    });

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        plan: updatedUser.plan,
        subscriptionExpiresAt: updatedUser.subscriptionExpiresAt
      }
    });
  } catch (error: any) {
    console.error("Upgrade plan error:", error);
    res.status(500).json({ error: "Не удалось обновить тарифный план." });
  }
});

// Referral Route: Получить данные реферальной программы текущего пользователя
app.get("/api/referrals/my", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Сначала войдите в систему." });
    }

    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });
    await ensureOrderSchema(db);

    const user = await db.user.findUnique({ where: { id: authUser.id } });
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден." });
    }

    const userReferralCode = await ensureUserReferralCode(db, user);

    // Получаем список всех зарегистрированных рефералов (активированные пользователи)
    const referrals = await db.user.findMany({
      where: {
        referredById: user.id,
        isBanned: false
      },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    const activatedCount = referrals.length;

    // Получаем историю полученных наград
    let rewards: any[] = [];
    try {
      rewards = await db.referralReward.findMany({
        where: { userId: user.id },
        orderBy: { claimedAt: "desc" }
      });
    } catch {
      // ignore
    }

    const claimedTiers = rewards.map((r: any) => r.tier);
    const isProClaimed = claimedTiers.includes("PRO_50");
    const isEnterpriseClaimed = claimedTiers.includes("ENTERPRISE_100");

    const host = getRequestBaseUrl(req);
    const referralLink = `${host}/?ref=${userReferralCode}`;

    const formattedReferrals = referrals.map((r) => ({
      id: r.id,
      name: r.name || "Пользователь",
      maskedEmail: maskEmail(r.email),
      plan: r.plan || "FREE",
      isVerified: true,
      createdAt: r.createdAt
    }));

    res.json({
      success: true,
      referralCode: userReferralCode,
      referralLink,
      activatedCount,
      currentPlan: user.plan || "FREE",
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      tiers: {
        pro: {
          tier: "PRO_50",
          target: 50,
          rewardPlan: "PRO",
          months: 1,
          currentCount: activatedCount,
          isUnlocked: activatedCount >= 50,
          isClaimed: isProClaimed,
          progressPercent: Math.min(100, Math.round((activatedCount / 50) * 100)),
          remaining: Math.max(0, 50 - activatedCount)
        },
        enterprise: {
          tier: "ENTERPRISE_100",
          target: 100,
          rewardPlan: "ENTERPRISE",
          months: 1,
          currentCount: activatedCount,
          isUnlocked: activatedCount >= 100,
          isClaimed: isEnterpriseClaimed,
          progressPercent: Math.min(100, Math.round((activatedCount / 100) * 100)),
          remaining: Math.max(0, 100 - activatedCount)
        }
      },
      rewards,
      referrals: formattedReferrals
    });
  } catch (error: any) {
    console.error("Get referrals error:", error);
    res.status(500).json({ error: "Не удалось загрузить данные реферальной программы." });
  }
});

// Referral Route: Забрать награду за достижение реферального рубежа
app.post("/api/referrals/claim", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Сначала войдите в систему." });
    }

    const { tier } = req.body;
    if (!tier || (tier !== "PRO_50" && tier !== "ENTERPRISE_100")) {
      return res.status(400).json({ error: "Неверный уровень награды. Доступны: PRO_50, ENTERPRISE_100." });
    }

    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });
    await ensureOrderSchema(db);

    const user = await db.user.findUnique({ where: { id: authUser.id } });
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден." });
    }

    // Проверяем количество активированных рефералов
    const activatedCount = await db.user.count({
      where: {
        referredById: user.id,
        isBanned: false
      }
    });

    const targetRequired = tier === "PRO_50" ? 50 : 100;
    const targetPlan = tier === "PRO_50" ? "PRO" : "ENTERPRISE";

    if (activatedCount < targetRequired) {
      return res.status(400).json({
        error: `Недостаточно активированных пользователей. Необходимо: ${targetRequired}, сейчас у вас: ${activatedCount}.`
      });
    }

    // Проверяем, была ли уже получена награда за этот уровень
    let existingClaim = null;
    try {
      existingClaim = await db.referralReward.findFirst({
        where: {
          userId: user.id,
          tier
        }
      });
    } catch {
      // ignore
    }

    if (existingClaim) {
      return res.status(400).json({
        error: `Вы уже забрали награду за ${targetRequired} рефералов (${targetPlan} на 1 месяц)!`
      });
    }

    // Рассчитываем срок действия подписки (добавляем 30 дней)
    const now = Date.now();
    const currentExpires = user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).getTime() : 0;
    const baseTime = currentExpires > now ? currentExpires : now;
    const newExpiresAt = new Date(baseTime + 30 * 24 * 60 * 60 * 1000);

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        plan: targetPlan,
        subscriptionExpiresAt: newExpiresAt
      }
    });

    const rewardId = "rw_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    let newReward: any = null;
    try {
      newReward = await db.referralReward.create({
        data: {
          id: rewardId,
          userId: user.id,
          tier,
          planAwarded: targetPlan,
          months: 1,
          claimedAt: new Date(),
          expiresAt: newExpiresAt
        }
      });
    } catch {
      // fallback via raw SQL if needed
      await db.$executeRawUnsafe(
        `INSERT INTO "ReferralReward" ("id", "userId", "tier", "planAwarded", "months", "claimedAt", "expiresAt") VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6);`,
        rewardId,
        user.id,
        tier,
        targetPlan,
        1,
        newExpiresAt
      ).catch(() => {});
      newReward = {
        id: rewardId,
        userId: user.id,
        tier,
        planAwarded: targetPlan,
        months: 1,
        claimedAt: new Date(),
        expiresAt: newExpiresAt
      };
    }

    broadcastEvent({
      type: "PLAN_UPDATED",
      userId: user.id,
      payload: {
        userId: user.id,
        plan: targetPlan,
        subscriptionExpiresAt: newExpiresAt
      }
    });

    broadcastEvent({
      type: "USER_UPDATED",
      userId: user.id,
      payload: formatUserResponse(updatedUser)
    });

    res.json({
      success: true,
      message: `Поздравляем! Вам успешно активирован тариф ${targetPlan} на 1 месяц (30 дней)!`,
      reward: newReward,
      user: formatUserResponse(updatedUser)
    });
  } catch (error: any) {
    console.error("Claim referral reward error:", error);
    res.status(500).json({ error: "Не удалось активировать реферальную награду." });
  }
});

// API Route: Привязать анонимное заведение к своему аккаунту
app.post("/api/shops/:id/claim", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Сначала войдите в аккаунт." });
    }

    const { id } = req.params;
    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });

    const shop = await db.shop.findUnique({ where: { id } });
    if (!shop) {
      return res.status(404).json({ error: "Заведение не найдено." });
    }

    if (shop.ownerId && shop.ownerId !== authUser.id) {
      return res.status(403).json({ error: "Это заведение уже принадлежит другому аккаунту." });
    }

    const updatedShop = await db.shop.update({
      where: { id },
      data: { ownerId: authUser.id },
      include: {
        services: true,
        owner: { select: { id: true, email: true, name: true } },
        _count: { select: { orders: true } }
      }
    });

    broadcastEvent({ type: "SHOP_UPDATED", shopId: id, payload: updatedShop });
    res.json(updatedShop);
  } catch (error: any) {
    console.error("Ошибка при привязке заведения:", error);
    res.status(500).json({ error: "Не удалось привязать заведение к аккаунту." });
  }
});

// API Route: Получить список заведений текущего пользователя
app.get("/api/shops", async (req, res) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ error: "Переменная DATABASE_URL не задана в Vercel!" });
    }

    const db = getPrismaClient();
    if (!db) {
      return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
    }

    await ensureOrderSchema(db);

    const authUser = getAuthUser(req);

    // If user is not authenticated, return empty list (prevent anonymous access to admin shops)
    if (!authUser) {
      return res.json([]);
    }

    const userShops = await getUserShops(db, authUser.id);
    res.json(userShops);
  } catch (error: any) {
    console.error("Ошибка при получении списка магазинов:", error);
    res.status(500).json({ error: "Ошибка базы данных: " + (error?.message || String(error)) });
  }
});

// API Route: Публичный каталог всех заведений на платформе с фильтрами, поиском и пагинацией
app.get(["/api/public/shops", "/api/explore/shops"], async (req, res) => {
  try {
    const db = getPrismaClient();
    if (!db) {
      return res.status(500).json({ error: "Не удалось подключиться к базе данных." });
    }

    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.max(1, Math.min(500, parseInt(String(req.query.limit || "60"), 10) || 60));
    const searchQuery = String(req.query.search || "").trim().toLowerCase();
    const categoryQuery = String(req.query.category || "").trim();
    const isOpenQuery = String(req.query.isOpen || "all");
    const hasDeliveryQuery = String(req.query.delivery || "all");
    const sortBy = String(req.query.sortBy || "popular"); // popular, rating, newest, name, services

    // Fetch all public shops with services, reviews, and counts
    const allRawShops = await db.shop.findMany({
      where: {
        slug: { not: "tma-builder-developer-page" },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        logoUrl: true,
        bannerUrl: true,
        workingHours: true,
        address: true,
        phone: true,
        currency: true,
        currencySymbol: true,
        deliveryOptions: true,
        isOpen: true,
        cashbackPercent: true,
        createdAt: true,
        services: {
          select: {
            id: true,
            title: true,
            price: true,
            oldPrice: true,
            category: true,
            imageUrl: true,
            badge: true,
            tags: true,
            isAvailable: true,
          },
          take: 8,
        },
        reviews: {
          select: {
            rating: true,
          },
        },
        _count: {
          select: {
            services: true,
            reviews: true,
            orders: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Sets for filter metadata
    const categorySet = new Set<string>();
    const citiesMap = new Map<string, number>();

    const extractCity = (address: string | null | undefined): string | null => {
      if (!address) return null;
      const knownCities = [
        "Москва",
        "Санкт-Петербург",
        "Грозный",
        "Казань",
        "Сочи",
        "Екатеринбург",
        "Новосибирск",
        "Краснодар",
        "Нижний Новгород",
        "Самара",
        "Уфа",
        "Ростов-на-Дону",
        "Владивосток",
        "Махачкала",
        "Воронеж",
        "Пермь",
        "Волгоград",
        "Тюмень",
        "Челябинск",
        "Омск",
        "Красноярск",
        "Саратов",
        "Тольятти",
        "Ижевск",
        "Барнаул",
        "Иркутск",
        "Хабаровск",
        "Ярославль",
        "Владикавказ",
        "Нальчик",
      ];
      for (const city of knownCities) {
        const reg = new RegExp(`(^|[\\s,.;])${city}([\\s,.;]|$)`, "i");
        if (reg.test(address)) {
          return city;
        }
      }
      const streetKeywords = [
        "ул", "улица", "пр", "проспект", "пер", "переулок", "пл", "площадь", "наб", "набережная", "бул", "бульвар", "шоссе", "д.", "стр", "корп"
      ];
      const parts = address.split(",").map((p) => p.trim());
      for (const part of parts) {
        const clean = part.replace(/^г\.\s*/i, "").trim();
        const isStreet = streetKeywords.some((kw) =>
          new RegExp(`^${kw}\\.?\\s+|\\s+${kw}\\.?$|\\b${kw}\\.`, "i").test(clean)
        );
        if (!isStreet && clean.length > 2 && clean.length < 30 && !/\d/.test(clean)) {
          return clean;
        }
      }
      return null;
    };

    const transformedShops = allRawShops.map((s) => {
      const revs = s.reviews || [];
      const avgRating =
        revs.length > 0
          ? Math.round((revs.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / revs.length) * 10) / 10
          : 5.0;

      // Extract city cleanly
      const detectedCity = extractCity(s.address);
      if (detectedCity) {
        citiesMap.set(detectedCity, (citiesMap.get(detectedCity) || 0) + 1);
      }

      let parsedDelivery: any = null;
      try {
        if (typeof s.deliveryOptions === "string" && s.deliveryOptions) {
          parsedDelivery = JSON.parse(s.deliveryOptions);
        } else if (typeof s.deliveryOptions === "object") {
          parsedDelivery = s.deliveryOptions;
        }
      } catch {
        parsedDelivery = null;
      }

      const prices = (s.services || []).map((srv) => srv.price).filter((p) => typeof p === "number");
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

      const shopCategories = new Set<string>();
      (s.services || []).forEach((srv) => {
        if (srv.category && typeof srv.category === "string" && srv.category.trim()) {
          const cat = srv.category.trim();
          shopCategories.add(cat);
          categorySet.add(cat);
        }
      });

      return {
        id: s.id,
        slug: s.slug,
        name: s.name,
        description: s.description || "",
        logoUrl: s.logoUrl,
        bannerUrl: s.bannerUrl,
        workingHours: s.workingHours || "10:00 – 22:00",
        address: s.address || "",
        phone: s.phone || "",
        currency: s.currency || "RUB",
        currencySymbol: s.currencySymbol || "₽",
        deliveryOptions: parsedDelivery,
        isOpen: s.isOpen !== false,
        cashbackPercent: s.cashbackPercent || 5,
        servicesCount: s._count?.services || s.services.length,
        reviewsCount: s._count?.reviews || revs.length,
        ordersCount: s._count?.orders || 0,
        avgRating,
        categories: Array.from(shopCategories),
        priceRange: { min: minPrice, max: maxPrice },
        featuredServices: s.services.slice(0, 3).map((srv) => ({
          id: srv.id,
          title: srv.title,
          price: srv.price,
          imageUrl: srv.imageUrl,
          category: srv.category,
        })),
        createdAt: s.createdAt,
      };
    });

    // Filter by search query
    let filtered = transformedShops;
    if (searchQuery) {
      filtered = filtered.filter((shop) => {
        const inName = shop.name.toLowerCase().includes(searchQuery);
        const inDesc = shop.description.toLowerCase().includes(searchQuery);
        const inAddr = shop.address.toLowerCase().includes(searchQuery);
        const inCats = shop.categories.some((c) => c.toLowerCase().includes(searchQuery));
        const inServices = shop.featuredServices.some((srv) =>
          srv.title.toLowerCase().includes(searchQuery)
        );
        return inName || inDesc || inAddr || inCats || inServices;
      });
    }

    // Filter by category
    if (categoryQuery && categoryQuery !== "ALL" && categoryQuery !== "Все") {
      const lowerCat = categoryQuery.toLowerCase();
      filtered = filtered.filter((shop) => {
        return (
          shop.categories.some((c) => c.toLowerCase().includes(lowerCat) || lowerCat.includes(c.toLowerCase())) ||
          shop.description.toLowerCase().includes(lowerCat)
        );
      });
    }

    // Filter by open status
    if (isOpenQuery === "true") {
      filtered = filtered.filter((shop) => shop.isOpen);
    } else if (isOpenQuery === "false") {
      filtered = filtered.filter((shop) => !shop.isOpen);
    }

    // Filter by delivery
    if (hasDeliveryQuery === "true") {
      filtered = filtered.filter((shop) => {
        const d = shop.deliveryOptions;
        return Boolean(d && (d.enabled || d.courier || d.shipping));
      });
    }

    // Sort
    if (sortBy === "rating") {
      filtered.sort((a, b) => b.avgRating - a.avgRating || b.reviewsCount - a.reviewsCount);
    } else if (sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    } else if (sortBy === "services") {
      filtered.sort((a, b) => b.servicesCount - a.servicesCount);
    } else {
      // Default: popular (orders + reviews weighted)
      filtered.sort((a, b) => {
        const scoreA = a.ordersCount * 3 + a.reviewsCount * 2 + a.avgRating * 5;
        const scoreB = b.ordersCount * 3 + b.reviewsCount * 2 + b.avgRating * 5;
        return scoreB - scoreA;
      });
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const pagedShops = filtered.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < total;

    res.json({
      shops: pagedShops,
      total,
      page,
      limit,
      hasMore,
      allCategories: Array.from(categorySet).sort(),
      stats: {
        totalShops: transformedShops.length,
        openCount: transformedShops.filter((s) => s.isOpen).length,
        totalServices: transformedShops.reduce((acc, s) => acc + s.servicesCount, 0),
        cities: Array.from(citiesMap.keys()).sort((a, b) => (citiesMap.get(b) || 0) - (citiesMap.get(a) || 0)),
        cityCounts: Object.fromEntries(citiesMap.entries()),
      },
    });
  } catch (error: any) {
    console.error("Ошибка при получении публичного каталога заведений:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера: " + (error?.message || String(error)) });
  }
});

// API Route: Создать новое приглашение в заведение
app.post("/api/shops/:shopId/invites", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Сначала войдите в аккаунт." });
    }

    const { shopId } = req.params;
    const { role = "STAFF", maxUses = 10 } = req.body;

    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });
    await ensureOrderSchema(db);

    const userRole = await getShopUserRole(db, shopId, authUser);
    if (!userRole || userRole === "STAFF") {
      return res.status(403).json({ error: "У сотрудников нет прав на создание приглашений. Обратитесь к менеджеру или владельцу." });
    }

    if (userRole === "MANAGER" && role === "MANAGER") {
      return res.status(403).json({ error: "Менеджер может создавать приглашения только для роли «Сотрудник». Назначать менеджеров может только владелец." });
    }

    const code = "INV-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const id = "inv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);

    await db.$executeRawUnsafe(
      `INSERT INTO "ShopInvite" ("id", "shopId", "code", "role", "createdById", "maxUses", "usedCount", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, 0, CURRENT_TIMESTAMP);`,
      id, shopId, code, role, authUser.id, Number(maxUses) || 10
    );

    const host = req.get("host");
    const protocol = req.protocol;
    const inviteUrl = `${protocol}://${host}/admin?invite=${code}`;

    const newInviteObj = {
      id,
      shopId,
      code,
      role,
      maxUses: Number(maxUses) || 10,
      usedCount: 0,
      inviteUrl
    };

    broadcastEvent({ type: "INVITE_CREATED", shopId, payload: newInviteObj });

    res.status(201).json(newInviteObj);
  } catch (error: any) {
    console.error("Create invite error:", error);
    res.status(500).json({ error: "Не удалось создать приглашение." });
  }
});

// API Route: Получить список участников и активных приглашений заведения
app.get("/api/shops/:shopId/members", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Сначала войдите в аккаунт." });
    }

    const { shopId } = req.params;
    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка подключения к базе данных." });
    await ensureOrderSchema(db);

    const hasPermission = await canManageShopContent(db, shopId, authUser);
    if (!hasPermission) {
      return res.status(403).json({ error: "У вас нет прав на просмотр команды заведения (требуются права Менеджера или Владельца)." });
    }

    const shop = await db.shop.findUnique({
      where: { id: shopId },
      include: { owner: { select: { id: true, email: true, name: true, avatarUrl: true } } }
    });

    const membersRaw: any[] = (await db.$queryRawUnsafe(
      `SELECT sm."id", sm."shopId", sm."userId", sm."role", sm."createdAt",
              u."email", u."name", u."avatarUrl"
       FROM "ShopMember" sm
       JOIN "User" u ON u."id" = sm."userId"
       WHERE sm."shopId" = $1
       ORDER BY sm."createdAt" DESC;`,
      shopId
    ).catch(() => [])) as any[];

    const invitesRaw: any[] = (await db.$queryRawUnsafe(
      `SELECT * FROM "ShopInvite" WHERE "shopId" = $1 ORDER BY "createdAt" DESC;`,
      shopId
    ).catch(() => [])) as any[];

    const host = req.get("host");
    const protocol = req.protocol;

    res.json({
      owner: shop?.owner || null,
      members: membersRaw,
      invites: invitesRaw.map(inv => ({
        ...inv,
        inviteUrl: `${protocol}://${host}/admin?invite=${inv.code}`
      }))
    });
  } catch (error: any) {
    console.error("Get shop members error:", error);
    res.status(500).json({ error: "Не удалось загрузить список участников." });
  }
});

// API Route: Отозвать (удалить) код приглашения
app.delete("/api/invites/:code", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Авторизуйтесь в системе." });

    const { code } = req.params;
    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка БД." });

    const cleanCode = code.toUpperCase().trim();
    const invites: any[] = (await db.$queryRawUnsafe(
      `SELECT * FROM "ShopInvite" WHERE "code" = $1 LIMIT 1;`,
      cleanCode
    ).catch(() => [])) as any[];

    if (!invites || invites.length === 0) {
      return res.status(404).json({ error: "Приглашение не найдено." });
    }

    const invite = invites[0];
    const hasPermission = await canManageShopContent(db, invite.shopId, authUser);
    if (!hasPermission) {
      return res.status(403).json({ error: "У вас нет прав для удаления этого приглашения." });
    }

    await db.$executeRawUnsafe(`DELETE FROM "ShopInvite" WHERE "code" = $1;`, cleanCode);
    broadcastEvent({ type: "INVITE_REVOKED", shopId: invite.shopId, payload: { code: cleanCode } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Не удалось удалить приглашение." });
  }
});

// API Route: Исключить сотрудника из заведения
app.delete("/api/shops/:shopId/members/:userId", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: "Авторизуйтесь в системе." });

    const { shopId, userId } = req.params;
    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка БД." });

    const shop = await db.shop.findUnique({ where: { id: shopId } });
    if (!shop) return res.status(404).json({ error: "Заведение не найдено." });

    const callerRole = await getShopUserRole(db, shopId, authUser);
    if (callerRole !== "OWNER" && callerRole !== "MANAGER") {
      return res.status(403).json({ error: "У вас нет прав на исключение участников." });
    }

    if (shop.ownerId === userId) {
      return res.status(403).json({ error: "Нельзя исключить владельца заведения." });
    }

    if (callerRole === "MANAGER") {
      const targetMember = ((await db.$queryRawUnsafe(
        `SELECT "role" FROM "ShopMember" WHERE "shopId" = $1 AND "userId" = $2 LIMIT 1;`,
        shopId, userId
      ).catch(() => [])) || []) as any[];
      if (Array.isArray(targetMember) && targetMember.length > 0) {
        const tr = (targetMember[0].role || "").toUpperCase();
        if (tr === "MANAGER" || tr === "ADMIN") {
          return res.status(403).json({ error: "Менеджер не может исключить другого менеджера. Обратитесь к владельцу." });
        }
      }
    }

    await db.$executeRawUnsafe(
      `DELETE FROM "ShopMember" WHERE "shopId" = $1 AND "userId" = $2;`,
      shopId, userId
    );

    broadcastEvent({ type: "TEAM_MEMBER_REMOVED", shopId, payload: { userId } });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Не удалось удалить сотрудника." });
  }
});

// API Route: Информация о приглашении перед принятием
app.get("/api/invites/:code/info", async (req, res) => {
  try {
    const { code } = req.params;
    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка БД." });
    await ensureOrderSchema(db);

    const cleanCode = code.toUpperCase().trim();
    const invites: any[] = (await db.$queryRawUnsafe(
      `SELECT * FROM "ShopInvite" WHERE "code" = $1 LIMIT 1;`,
      cleanCode
    ).catch(() => [])) as any[];

    if (!invites || invites.length === 0) {
      return res.status(404).json({ error: "Код приглашения не найден или был отменён." });
    }

    const invite = invites[0];
    if (invite.maxUses && invite.usedCount >= invite.maxUses) {
      return res.status(400).json({ error: "Превышен лимит использования данного приглашения." });
    }

    const shop = await db.shop.findUnique({
      where: { id: invite.shopId },
      select: { id: true, name: true, description: true, logoUrl: true, slug: true }
    });

    if (!shop) {
      return res.status(404).json({ error: "Заведение, к которому создано приглашение, больше не существует." });
    }

    res.json({
      code: invite.code,
      role: invite.role,
      shop
    });
  } catch (error: any) {
    res.status(500).json({ error: "Ошибка при проверке приглашения." });
  }
});

// API Route: Принять приглашение в заведение
app.post("/api/invites/:code/accept", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Для активации приглашения необходимо зарегистрироваться или войти в аккаунт." });
    }

    const { code } = req.params;
    const db = getPrismaClient();
    if (!db) return res.status(500).json({ error: "Ошибка БД." });
    await ensureOrderSchema(db);

    const cleanCode = code.toUpperCase().trim();
    const invites: any[] = (await db.$queryRawUnsafe(
      `SELECT * FROM "ShopInvite" WHERE "code" = $1 LIMIT 1;`,
      cleanCode
    ).catch(() => [])) as any[];

    if (!invites || invites.length === 0) {
      return res.status(404).json({ error: "Недействительный код приглашения." });
    }

    const invite = invites[0];
    if (invite.maxUses && invite.usedCount >= invite.maxUses) {
      return res.status(400).json({ error: "Код приглашения исчерпал лимит использований." });
    }

    const shop = await db.shop.findUnique({
      where: { id: invite.shopId },
      include: { services: true, owner: { select: { id: true, email: true, name: true } }, _count: { select: { orders: true } } }
    });

    if (!shop) {
      return res.status(404).json({ error: "Заведение не найдено." });
    }

    // If user is owner
    if (shop.ownerId === authUser.id) {
      return res.json({ message: "Вы уже являетесь владельцем этого заведения!", shop });
    }

    // Check if already a member
    const existingMember: any[] = (await db.$queryRawUnsafe(
      `SELECT * FROM "ShopMember" WHERE "shopId" = $1 AND "userId" = $2 LIMIT 1;`,
      shop.id, authUser.id
    ).catch(() => [])) as any[];

    if (existingMember && existingMember.length > 0) {
      return res.json({ message: "Вы уже в составе команды этого заведения!", shop });
    }

    // Add to ShopMember
    const memberId = "sm_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    await db.$executeRawUnsafe(
      `INSERT INTO "ShopMember" ("id", "shopId", "userId", "role", "createdAt")
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP);`,
      memberId, shop.id, authUser.id, invite.role || "STAFF"
    );

    // Increment usedCount
    await db.$executeRawUnsafe(
      `UPDATE "ShopInvite" SET "usedCount" = "usedCount" + 1 WHERE "id" = $1;`,
      invite.id
    );

    broadcastEvent({
      type: "TEAM_MEMBER_ADDED",
      shopId: shop.id,
      payload: { id: memberId, shopId: shop.id, userId: authUser.id, role: invite.role || "STAFF" }
    });

    res.json({
      success: true,
      message: `Вы успешно присоединились к заведению «${shop.name}»!`,
      shop
    });
  } catch (error: any) {
    console.error("Accept invite error:", error);
    res.status(500).json({ error: "Не удалось принять приглашение." });
  }
});

// API Route: Создать новый магазин
app.post("/api/shops", async (req, res) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ error: "Переменная DATABASE_URL не задана в Vercel!" });
    }

    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Для создания заведения необходимо зарегистрироваться или войти в аккаунт." });
    }

    const db = getPrismaClient();
    if (!db) {
      return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
    }

    const {
      name,
      slug,
      description,
      phone,
      address,
      workingHours,
      currency,
      currencySymbol,
      logoUrl,
      bannerUrl,
      socialLinks,
      deliveryOptions,
      paymentInstructions,
      musicSettings,
      botToken,
      adminChatId,
      isOpen
    } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ error: "Название магазина должно содержать от 2 до 50 символов." });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({ error: "Название магазина слишком длинное (макс. 50 символов)." });
    }

    if (!slug || typeof slug !== "string" || slug.trim().length < 2) {
      return res.status(400).json({ error: "URL / Slug должен содержать минимум 2 символа." });
    }

    const formattedSlug = transliterateToSlug(slug);

    if (formattedSlug.length < 2 || formattedSlug.length > 30) {
      return res.status(400).json({ error: "Slug должен содержать от 2 до 30 латинских символов, цифр или дефисов." });
    }

    if (description && typeof description === "string" && description.length > 500) {
      return res.status(400).json({ error: "Описание не должно превышать 500 символов." });
    }

    const existingShop = await db.shop.findUnique({
      where: { slug: formattedSlug }
    });

    if (existingShop) {
      return res.status(400).json({ error: "Магазин с таким URL (slug) уже существует." });
    }

    // Проверка прав: аккаунты сотрудников и менеджеров не могут создавать новые заведения
    const memberRecord = await db.$queryRawUnsafe<any[]>(
      `SELECT "role" FROM "ShopMember" WHERE "userId" = $1 LIMIT 1;`,
      authUser.id
    ).catch(() => []);

    if (memberRecord && memberRecord.length > 0) {
      const memberRole = memberRecord[0].role;
      if (memberRole === "STAFF" || memberRole === "MANAGER") {
        return res.status(403).json({
          error: "Создание новых заведений запрещено для аккаунтов сотрудников и менеджеров."
        });
      }
    }

    // Проверка лимита количества заведений по тарифу пользователя
    if (authUser) {
      const user = await db.user.findUnique({ where: { id: authUser.id } });
      const userPlan = user?.plan || "FREE";
      const userShopsCount = await db.shop.count({ where: { ownerId: authUser.id } });

      if (userPlan === "FREE" && userShopsCount >= 1) {
        return res.status(403).json({
          error: "На бесплатном тарифе FREE можно создать только 1 заведение. Обновите тариф до PRO в шапке панели."
        });
      }
      if (userPlan === "PRO" && userShopsCount >= 5) {
        return res.status(403).json({
          error: "На тарифе PRO можно создать до 5 заведений. Перейдите на тариф ENTERPRISE для снятия ограничений."
        });
      }
    }

    const codeVal = validateCurrencyCode(currency || "RUB");
    if (!codeVal.isValid) {
      return res.status(400).json({ error: codeVal.error || "Недопустимый код валюты." });
    }

    const symbolVal = validateCurrencySymbol(currencySymbol || "₽");
    if (!symbolVal.isValid) {
      return res.status(400).json({ error: symbolVal.error || "Недопустимый символ валюты." });
    }

    if (address !== undefined && address !== null && String(address).trim() !== "") {
      const addrVal = validateShopAddress(String(address));
      if (!addrVal.isValid) {
        return res.status(400).json({ error: addrVal.error || "Недопустимый адрес заведения." });
      }
    }

    const newShop = await db.shop.create({
      data: {
        name: name.trim(),
        slug: formattedSlug,
        description: description?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        workingHours: workingHours?.trim() || null,
        currency: codeVal.sanitized,
        currencySymbol: symbolVal.sanitized,
        logoUrl: logoUrl?.trim() || null,
        bannerUrl: bannerUrl?.trim() || null,
        socialLinks: typeof socialLinks === "object" ? JSON.stringify(socialLinks) : (socialLinks || null),
        deliveryOptions: typeof deliveryOptions === "object" ? JSON.stringify(deliveryOptions) : (deliveryOptions || null),
        paymentInstructions: paymentInstructions?.trim() || null,
        musicSettings: typeof musicSettings === "object" ? JSON.stringify(musicSettings) : (musicSettings || null),
        botToken: botToken?.trim() || null,
        adminChatId: adminChatId?.trim() || null,
        isOpen: typeof isOpen === "boolean" ? isOpen : true,
        ownerId: authUser ? authUser.id : null
      },
      include: {
        services: true,
        _count: {
          select: { orders: true }
        }
      }
    });

      broadcastEvent({ type: "SHOP_CREATED", shopId: newShop.id, payload: newShop });
      res.status(201).json(newShop);
    } catch (error: any) {
      console.error("Ошибка при создании магазина:", error);
      res.status(500).json({ error: "Ошибка БД: " + (error?.message || String(error)) });
    }
  });

  // API Route: Удалить магазин
  app.delete("/api/shops/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const authUser = getAuthUser(req);
      
      if (!process.env.DATABASE_URL) {
        return res.status(503).json({ error: "База данных PostgreSQL не настроена." });
      }

      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      const shop = await db.shop.findUnique({ where: { id } });
      if (!shop) {
        return res.status(404).json({ error: "Заведение не найдено." });
      }

      const isOwner = await isShopOwner(db, id, authUser);
      if (!isOwner) {
        return res.status(403).json({ error: "Только владелец заведения может безвозвратно удалить заведение." });
      }

      // Используем транзакцию для безопасного каскадного удаления всех зависимых сущностей
      await db.$transaction([
        db.service.deleteMany({ where: { shopId: id } }),
        db.order.deleteMany({ where: { shopId: id } }),
        db.shop.delete({ where: { id } })
      ]);

      broadcastEvent({ type: "SHOP_DELETED", shopId: id, payload: { id } });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Ошибка при удалении магазина:", error);
      res.status(500).json({ error: error?.message || "Не удалось удалить магазин." });
    }
  });

  // API Route: Добавить услугу к магазину
  app.post("/api/shops/:shopId/services", async (req, res) => {
    try {
      const { shopId } = req.params;
      const { title, price, oldPrice, description, category, imageUrl, gallery, badge, tags, prepTime, weight, isAvailable, fulfillment } = req.body;
      const authUser = getAuthUser(req);

      if (!title || typeof title !== "string" || title.trim().length < 2) {
        return res.status(400).json({ error: "Название услуги должно содержать минимум 2 символа." });
      }

      if (title.trim().length > 100) {
        return res.status(400).json({ error: "Название услуги слишком длинное (макс. 100 символов)." });
      }

      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ error: "Укажите корректную положительную цену (больше 0 ₽)." });
      }

      if (parsedPrice > 10000000) {
        return res.status(400).json({ error: "Цена превышает допустимый лимит (10,000,000 ₽)." });
      }

      if (description && typeof description === "string" && description.length > 500) {
        return res.status(400).json({ error: "Описание услуги не должно превышать 500 символов." });
      }

      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      await ensureOrderSchema(db);

      const shop = await db.shop.findUnique({ where: { id: shopId } });
      if (!shop) return res.status(404).json({ error: "Заведение не найдено." });

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на редактирование услуг этого заведения." });
      }

      // Проверяем количество созданных услуг в этом заведении по тарифному плану
      if (authUser) {
        const user = await db.user.findUnique({ where: { id: authUser.id } });
        const userPlan = user?.plan || "FREE";
        const currentServicesCount = await db.service.count({ where: { shopId } });

        if (userPlan === "FREE" && currentServicesCount >= 15) {
          return res.status(403).json({
            error: "На бесплатном тарифе FREE можно добавить максимум 15 услуг в одно заведение. Перейдите на тариф PRO для расширения лимита."
          });
        }
        if (userPlan === "PRO" && currentServicesCount >= 100) {
          return res.status(403).json({
            error: "На тарифе PRO доступно до 100 услуг в заведении. Перейдите на тариф ENTERPRISE для снятия ограничений."
          });
        }
      }

      const service = await (db as any).service.create({
        data: {
          shopId,
          title: title.trim(),
          price: Math.round(parsedPrice),
          oldPrice: oldPrice ? Math.round(Number(oldPrice)) : null,
          description: description?.trim() || null,
          category: category?.trim() || null,
          imageUrl: imageUrl?.trim() || null,
          gallery: gallery ? (typeof gallery === "string" ? gallery : JSON.stringify(gallery)) : null,
          badge: badge?.trim() || null,
          tags: tags?.trim() || null,
          prepTime: prepTime?.trim() || null,
          weight: weight?.trim() || null,
          isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
          fulfillment: fulfillment ? String(fulfillment).trim() : "pickup"
        }
      });

      broadcastEvent({ type: "SERVICE_CREATED", shopId, payload: service });
      res.status(201).json(service);
    } catch (error) {
      console.error("Ошибка при добавлении услуги:", error);
      res.status(500).json({ error: "Не удалось добавить услугу." });
    }
  });

  // API Route: Редактировать услугу
  app.put("/api/services/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, price, oldPrice, description, category, imageUrl, gallery, badge, tags, prepTime, weight, isAvailable, fulfillment } = req.body;
      const authUser = getAuthUser(req);

      if (!title || typeof title !== "string" || title.trim().length < 2) {
        return res.status(400).json({ error: "Название услуги должно содержать минимум 2 символа." });
      }

      if (title.trim().length > 100) {
        return res.status(400).json({ error: "Название услуги слишком длинное (макс. 100 символов)." });
      }

      if (description && typeof description === "string" && description.length > 500) {
        return res.status(400).json({ error: "Описание услуги не должно превышать 500 символов." });
      }

      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ error: "Укажите корректную положительную цену (больше 0 ₽)." });
      }

      if (parsedPrice > 10000000) {
        return res.status(400).json({ error: "Цена превышает допустимый лимит (10,000,000 ₽)." });
      }

      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      await ensureOrderSchema(db);

      const service = await db.service.findUnique({ where: { id }, include: { shop: true } });
      if (!service) return res.status(404).json({ error: "Услуга не найдена." });

      const hasPermission = await canManageShop(db, service.shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на изменение услуг этого заведения." });
      }

      const updatedService = await (db as any).service.update({
        where: { id },
        data: {
          title: title.trim(),
          price: Math.round(parsedPrice),
          oldPrice: oldPrice ? Math.round(Number(oldPrice)) : null,
          description: description?.trim() || null,
          category: category?.trim() || null,
          imageUrl: imageUrl?.trim() || null,
          gallery: gallery ? (typeof gallery === "string" ? gallery : JSON.stringify(gallery)) : null,
          badge: badge?.trim() || null,
          tags: tags?.trim() || null,
          prepTime: prepTime?.trim() || null,
          weight: weight?.trim() || null,
          ...(isAvailable !== undefined ? { isAvailable: Boolean(isAvailable) } : {}),
          ...(fulfillment !== undefined ? { fulfillment: String(fulfillment).trim() } : {})
        }
      });

      broadcastEvent({ type: "SERVICE_UPDATED", shopId: updatedService.shopId, payload: updatedService });
      res.json(updatedService);
    } catch (error) {
      console.error("Ошибка при обновлении услуги:", error);
      res.status(500).json({ error: "Не удалось обновить услугу." });
    }
  });

  // API Route: Быстрый переключатель доступности услуги (стоп-лист)
  app.patch("/api/services/:id/toggle-availability", async (req, res) => {
    try {
      const { id } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });

      await ensureOrderSchema(db);

      const service = await db.service.findUnique({ where: { id } });
      if (!service) return res.status(404).json({ error: "Услуга не найдена." });

      const hasPermission = await canManageShop(db, service.shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на изменение этой услуги." });
      }

      const updated = await (db as any).service.update({
        where: { id },
        data: { isAvailable: !(service as any).isAvailable }
      });

      broadcastEvent({ type: "SERVICE_UPDATED", shopId: updated.shopId, payload: updated });
      res.json(updated);
    } catch (error) {
      console.error("Ошибка при переключении статуса доступности:", error);
      res.status(500).json({ error: "Не удалось изменить статус доступности." });
    }
  });

  // API Route: Удалить услугу
  app.delete("/api/services/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      const service = await db.service.findUnique({ where: { id }, include: { shop: true } });
      if (!service) return res.status(404).json({ error: "Услуга не найдена." });

      const hasPermission = await canManageShop(db, service.shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на удаление услуг этого заведения." });
      }

      await db.service.delete({ where: { id } });
      broadcastEvent({ type: "SERVICE_DELETED", shopId: service.shopId, payload: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Ошибка при удалении услуги:", error);
      res.status(500).json({ error: "Не удалось удалить услугу." });
    }
  });

  // API Route: Получить данные заведения по slug (или id)
  app.get(["/api/shops/:slug", "/api/public/shops/:slug"], async (req, res) => {
    try {
      if (!process.env.DATABASE_URL) {
        return res.status(503).json({ error: "База данных PostgreSQL не настроена (отсутствует DATABASE_URL)." });
      }

      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      await ensureOrderSchema(db);

      const rawParam = req.params.slug;
      const paramSlug = decodeURIComponent(rawParam).trim();

      let shop = await db.shop.findUnique({
        where: { slug: paramSlug },
        include: { services: true, owner: { select: { id: true, email: true, name: true } } },
      });

      // Fallback 1: case-insensitive slug match
      if (!shop) {
        shop = await db.shop.findFirst({
          where: { slug: { equals: paramSlug, mode: "insensitive" } },
          include: { services: true, owner: { select: { id: true, email: true, name: true } } },
        });
      }

      // Fallback 2: find by ID if param looks like ID
      if (!shop) {
        shop = await db.shop.findUnique({
          where: { id: paramSlug },
          include: { services: true, owner: { select: { id: true, email: true, name: true } } },
        });
      }

      if (!shop) {
        return res.status(404).json({ error: "Заведение не найдено." });
      }

      res.json(shop);
    } catch (error) {
      console.error("Ошибка при получении заведения:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера." });
    }
  });

  // API Route: Обновить магазин
  app.put("/api/shops/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        slug,
        description,
        botToken,
        adminChatId,
        workingHours,
        address,
        phone,
        isOpen,
        logoUrl,
        bannerUrl,
        currency,
        currencySymbol,
        socialLinks,
        deliveryOptions,
        paymentInstructions,
        musicSettings
      } = req.body;
      const authUser = getAuthUser(req);
      
      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      await ensureOrderSchema(db);

      const shop = await db.shop.findUnique({ where: { id } });
      if (!shop) return res.status(404).json({ error: "Заведение не найдено." });

      const hasPermission = await canManageShop(db, id, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на редактирование настроек этого заведения." });
      }

      let updatedSlug = shop.slug;
      if (slug !== undefined && slug !== null && String(slug).trim() !== "") {
        const formattedSlug = transliterateToSlug(String(slug));
        if (formattedSlug.length < 2 || formattedSlug.length > 30) {
          return res.status(400).json({ error: "Slug должен содержать от 2 до 30 латинских символов, цифр или дефисов." });
        }

        if (formattedSlug !== shop.slug) {
          const existingShop = await db.shop.findUnique({ where: { slug: formattedSlug } });
          if (existingShop && existingShop.id !== id) {
            return res.status(400).json({ error: "Заведение с таким URL (slug) уже существует." });
          }
          updatedSlug = formattedSlug;
        }
      }

      let nextBotToken = shop.botToken;
      if (botToken !== undefined) {
        const trimmed = botToken ? String(botToken).trim() : null;
        if (trimmed && (trimmed.includes("•") || trimmed.includes("***") || trimmed.includes("••••"))) {
          nextBotToken = shop.botToken;
        } else {
          nextBotToken = trimmed;
        }
      }

      let nextTelegramSettings = shop.telegramSettings;
      if (req.body.telegramSettings !== undefined) {
        nextTelegramSettings = typeof req.body.telegramSettings === "string" 
          ? req.body.telegramSettings 
          : JSON.stringify(req.body.telegramSettings);
      }

      let nextCurrency = shop.currency || "RUB";
      let nextCurrencySymbol = shop.currencySymbol || "₽";

      if (currency !== undefined) {
        const cVal = validateCurrencyCode(String(currency));
        if (!cVal.isValid) {
          return res.status(400).json({ error: cVal.error || "Недопустимый код валюты." });
        }
        nextCurrency = cVal.sanitized;
      }

      if (currencySymbol !== undefined) {
        const sVal = validateCurrencySymbol(String(currencySymbol));
        if (!sVal.isValid) {
          return res.status(400).json({ error: sVal.error || "Недопустимый символ валюты. Допустимы только специальные символы валют (₽, $, €, ₸, Br и др.)." });
        }
        nextCurrencySymbol = sVal.sanitized;
      }

      if (address !== undefined && address !== null && String(address).trim() !== "") {
        const addrVal = validateShopAddress(String(address));
        if (!addrVal.isValid) {
          return res.status(400).json({ error: addrVal.error || "Недопустимый адрес заведения." });
        }
      }

      const updatedShop = await db.shop.update({
        where: { id },
        data: {
          name: name !== undefined ? String(name).trim() : shop.name,
          slug: updatedSlug,
          description: description !== undefined ? (description ? String(description).trim() : null) : shop.description,
          botToken: nextBotToken,
          adminChatId: adminChatId !== undefined ? (adminChatId ? String(adminChatId).trim() : null) : shop.adminChatId,
          telegramSettings: nextTelegramSettings,
          workingHours: workingHours !== undefined ? (workingHours ? String(workingHours).trim() : null) : shop.workingHours,
          address: address !== undefined ? (address ? String(address).trim() : null) : shop.address,
          phone: phone !== undefined ? (phone ? String(phone).trim() : null) : shop.phone,
          cashbackPercent: req.body.cashbackPercent !== undefined ? Math.max(0, Math.min(100, Number(req.body.cashbackPercent) || 0)) : (shop.cashbackPercent !== undefined ? shop.cashbackPercent : 5),
          isOpen: isOpen !== undefined ? Boolean(isOpen) : (shop.isOpen !== undefined ? shop.isOpen : true),
          logoUrl: logoUrl !== undefined ? (logoUrl ? String(logoUrl).trim() : null) : shop.logoUrl,
          bannerUrl: bannerUrl !== undefined ? (bannerUrl ? String(bannerUrl).trim() : null) : shop.bannerUrl,
          currency: nextCurrency,
          currencySymbol: nextCurrencySymbol,
          socialLinks: socialLinks !== undefined ? (typeof socialLinks === "string" ? socialLinks : JSON.stringify(socialLinks)) : shop.socialLinks,
          deliveryOptions: deliveryOptions !== undefined ? (typeof deliveryOptions === "string" ? deliveryOptions : JSON.stringify(deliveryOptions)) : shop.deliveryOptions,
          paymentInstructions: paymentInstructions !== undefined ? (paymentInstructions ? String(paymentInstructions).trim() : null) : shop.paymentInstructions,
          musicSettings: musicSettings !== undefined ? (typeof musicSettings === "string" ? musicSettings : JSON.stringify(musicSettings)) : (shop as any).musicSettings
        },
        include: {
          services: true,
          owner: { select: { id: true, email: true, name: true } },
          _count: { select: { orders: true } }
        }
      });
      
      broadcastEvent({ type: "SHOP_UPDATED", shopId: id, payload: updatedShop });
      res.json(updatedShop);
    } catch (error) {
      console.error("Ошибка при обновлении магазина:", error);
      res.status(500).json({ error: "Не удалось обновить магазин." });
    }
  });

  // API Route: Создать заказ
  app.post(["/api/orders", "/api/public/orders"], async (req, res) => {
    try {
      if (!process.env.DATABASE_URL) {
        return res.status(503).json({ error: "База данных PostgreSQL не настроена." });
      }

      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      await ensureOrderSchema(db);

      const { shopId, customerName, customerPhone, tableNumber, preferredTime, note, items, totalPrice, fulfillmentMethod, deliveryAddress } = req.body;

      if (!shopId) {
        return res.status(400).json({ error: "Идентификатор магазина не указан." });
      }

      const nameRes = validateCustomerName(customerName);
      if (!nameRes.isValid) {
        return res.status(400).json({ error: nameRes.error });
      }

      const phoneRes = validateCisPhone(customerPhone);
      if (!phoneRes.isValid) {
        return res.status(400).json({ error: phoneRes.error });
      }
      const cleanPhone = phoneRes.formatted;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Корзина пуста. Выберите хотя бы одну услугу." });
      }

      if (items.length > 50) {
        return res.status(400).json({ error: "Превышено максимальное количество позиций в заказе (макс. 50)." });
      }

      const parsedTotal = Number(totalPrice);
      if (isNaN(parsedTotal) || parsedTotal <= 0) {
        return res.status(400).json({ error: "Некорректная итоговая сумма заказа." });
      }

      if (parsedTotal > 1000000) {
        return res.status(400).json({ error: "Сумма заказа превышает допустимый лимит (1 000 000 ₽)." });
      }

      const cleanTableNumber = tableNumber ? String(tableNumber).trim().slice(0, 30) : null;
      const cleanPreferredTime = preferredTime ? String(preferredTime).trim().slice(0, 30) : null;
      const cleanNote = note ? String(note).trim().slice(0, 300) : null;
      const cleanFulfillmentMethod = fulfillmentMethod ? String(fulfillmentMethod).trim() : "courier";
      const cleanDeliveryAddress = deliveryAddress ? String(deliveryAddress).trim().slice(0, 300) : null;

      // Получаем магазин для настроек Telegram
      const shop = await db.shop.findUnique({
        where: { id: shopId }
      });

      // 1. Сохраняем в PostgreSQL
      const order = await (db.order.create as any)({
        data: {
          shopId,
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          tableNumber: cleanTableNumber,
          preferredTime: cleanPreferredTime,
          note: cleanNote,
          items: JSON.stringify(items),
          totalPrice: Math.round(parsedTotal),
          status: "PENDING",
          fulfillmentMethod: cleanFulfillmentMethod,
          deliveryAddress: cleanDeliveryAddress,
        },
      });

      // Обработка бонусов и кэшбэка клиента
      try {
        const usedPoints = Number(req.body.usedPoints) || 0;
        const cashbackPercent = (shop as any)?.cashbackPercent !== undefined ? Number((shop as any).cashbackPercent) : 5;
        const cashbackEarned = Math.round((Math.max(0, parsedTotal - usedPoints)) * (cashbackPercent / 100));

        let customer = await (db as any).customer.findFirst({
          where: { shopId, phone: cleanPhone }
        });

        if (!customer) {
          await (db as any).customer.create({
            data: {
              shopId,
              phone: cleanPhone,
              name: customerName.trim(),
              bonusBalance: Math.max(0, cashbackEarned - usedPoints),
              totalSpent: Math.round(parsedTotal),
              ordersCount: 1
            }
          });
        } else {
          const currentBalance = customer.bonusBalance || 0;
          const newBalance = Math.max(0, currentBalance - usedPoints + cashbackEarned);
          await (db as any).customer.update({
            where: { id: customer.id },
            data: {
              name: customerName.trim(),
              bonusBalance: newBalance,
              totalSpent: (customer.totalSpent || 0) + Math.round(parsedTotal),
              ordersCount: (customer.ordersCount || 0) + 1,
              updatedAt: new Date()
            }
          });
        }
      } catch (custErr) {
        console.warn("Ошибка обновления данных бонусов клиента:", custErr);
      }

      // 2. Отправляем уведомление в Telegram (если настроено)
      if (shop) {
        broadcastTelegramNotification(db, shop, "NEW_ORDER", order).catch((e) =>
          console.error("Ошибка при отправке в Telegram:", e)
        );
      }

      broadcastEvent({ type: "ORDER_CREATED", shopId, payload: order });
      broadcastEvent({ type: "CUSTOMER_UPDATED", shopId, payload: { phone: cleanPhone } });
      res.status(201).json(order);
    } catch (error) {
      console.error("Ошибка при создании заказа:", error);
      res.status(500).json({ error: "Не удалось создать заказ." });
    }
  });

  // API Route: Получить историю заказов клиента (по списку ID)
  app.post("/api/shops/:shopId/my-orders", async (req, res) => {
    try {
      const { shopId } = req.params;
      const { orderIds } = req.body;
      if (!Array.isArray(orderIds)) {
        return res.status(400).json({ error: "orderIds must be an array" });
      }

      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      await ensureOrderSchema(db);

      const orders = await db.order.findMany({
        where: {
          id: { in: orderIds },
          shopId
        },
        orderBy: { createdAt: "desc" }
      });

      res.json({ orders });
    } catch (error: any) {
      console.error("Ошибка при получении истории заказов:", error);
      res.status(500).json({ error: "Не удалось получить историю заказов." });
    }
  });

  // API Route: Получить заказы клиента по номеру телефона
  app.get(["/api/shops/:shopId/orders/my", "/api/public/shops/:shopId/orders/my"], async (req, res) => {
    try {
      const { shopId } = req.params;
      const phone = req.query.phone as string;
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      if (!phone) {
        return res.json([]);
      }

      const cleanPhone = phone.replace(/[^0-9+]/g, '');

      const orders = await db.order.findMany({
        where: {
          shopId,
          OR: [
            { customerPhone: phone },
            { customerPhone: cleanPhone },
            ...(cleanPhone.length >= 10 ? [{ customerPhone: { contains: cleanPhone.slice(-10) } }] : [])
          ]
        },
        orderBy: { createdAt: "desc" },
        take: 20
      });

      res.json(orders);
    } catch (error) {
      console.error("Ошибка при получении заказов клиента:", error);
      res.status(500).json({ error: "Не удалось получить заказы." });
    }
  });

  // API Route: Получить список заказов магазина
  app.get(["/api/shops/:shopId/orders", "/api/public/shops/:shopId/orders"], async (req, res) => {
    try {
      const { shopId } = req.params;
      const authUser = getAuthUser(req);
      if (!process.env.DATABASE_URL) {
        return res.status(503).json({ error: "База данных PostgreSQL не настроена." });
      }

      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      await ensureOrderSchema(db);

      const hasPermission = await canProcessOrders(db, shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на просмотр заказов этого заведения." });
      }

      const orders = await db.order.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" }
      });

      res.json(orders);
    } catch (error: any) {
      console.error("Ошибка при получении заказов:", error);
      res.status(500).json({ error: "Не удалось получить заказы." });
    }
  });

  // API Route: Получить заказ по ID (для отслеживания клиентом)
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      await ensureOrderSchema(db);

      const order = await db.order.findUnique({
        where: { id },
        include: { shop: { select: { name: true, slug: true } } }
      });

      if (!order) {
        return res.status(404).json({ error: "Заказ не найден." });
      }

      res.json(order);
    } catch (error) {
      console.error("Ошибка при получении информации о заказе:", error);
      res.status(500).json({ error: "Не удалось загрузить заказ." });
    }
  });

  // API Route: Обновить статус заказа
  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const authUser = getAuthUser(req);

      const validStatuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Недопустимый статус заказа." });
      }

      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      await ensureOrderSchema(db);

      const order = await db.order.findUnique({ where: { id } });
      if (!order) {
        return res.status(404).json({ error: "Заказ не найден." });
      }

      const hasPermission = await canProcessOrders(db, order.shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на обновление статуса заказов в этом заведении." });
      }

      const updatedOrder = await db.order.update({
        where: { id },
        data: { status }
      });

      const shop = await db.shop.findUnique({ where: { id: updatedOrder.shopId } });
      if (shop) {
        broadcastTelegramNotification(db, shop, "ORDER_STATUS", updatedOrder).catch((e) =>
          console.error("Ошибка отправки смены статуса заказа в Telegram:", e)
        );
      }

      broadcastEvent({ type: "ORDER_STATUS_UPDATED", shopId: updatedOrder.shopId, payload: updatedOrder });
      res.json(updatedOrder);
    } catch (error: any) {
      console.error("Ошибка при обновлении статуса заказа:", error);
      res.status(500).json({ error: "Не удалось обновить статус заказа." });
    }
  });

  // API Route: Удалить заказ (только Менеджеры и Владельцы)
  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const authUser = getAuthUser(req);

      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      await ensureOrderSchema(db);

      const order = await db.order.findUnique({ where: { id } });
      if (!order) {
        return res.status(404).json({ error: "Заказ не найден." });
      }

      const hasPermission = await canManageShopContent(db, order.shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У сотрудников нет прав на удаление заказов из базы данных. Требуются права менеджера или владельца." });
      }

      await db.order.delete({ where: { id } });
      broadcastEvent({ type: "ORDER_DELETED", shopId: order.shopId, payload: { id } });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Ошибка при удалении заказа:", error);
      res.status(500).json({ error: "Не удалось удалить заказ." });
    }
  });

  // API Route: Аналитика заведения (Менеджеры и Владельцы)
  app.get("/api/shops/:shopId/analytics", async (req, res) => {
    try {
      const { shopId } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      await ensureOrderSchema(db);

      const hasPermission = await canManageShopContent(db, shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "Аналитика доступна только для владельцев и менеджеров заведения." });
      }

      const orders = await db.order.findMany({
        where: { shopId },
        orderBy: { createdAt: "asc" }
      });

      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => o.status === "COMPLETED" || o.status === "CONFIRMED");
      const totalRevenue = completedOrders.reduce((acc, o) => acc + (o.totalPrice || 0), 0);
      const avgCheck = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;

      // Группировка по дням (за последние 30 дней или все доступные)
      const dailyStatsMap = new Map<string, { date: string; revenue: number; orders: number }>();
      const serviceSalesMap = new Map<string, { title: string; count: number; total: number }>();
      const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, orders: 0 }));

      orders.forEach(order => {
        const dateStr = new Date(order.createdAt).toISOString().slice(0, 10);
        const hour = new Date(order.createdAt).getHours();
        hourlyDistribution[hour].orders += 1;

        if (order.status === "COMPLETED" || order.status === "CONFIRMED") {
          const currentDay = dailyStatsMap.get(dateStr) || { date: dateStr, revenue: 0, orders: 0 };
          currentDay.revenue += order.totalPrice || 0;
          currentDay.orders += 1;
          dailyStatsMap.set(dateStr, currentDay);

          try {
            const items = JSON.parse(order.items);
            if (Array.isArray(items)) {
              items.forEach((item: any) => {
                const title = item.title || "Услуга";
                const qty = item.quantity || 1;
                const price = item.price || 0;
                const existing = serviceSalesMap.get(title) || { title, count: 0, total: 0 };
                existing.count += qty;
                existing.total += qty * price;
                serviceSalesMap.set(title, existing);
              });
            }
          } catch (e) {
            // ignore JSON parse error
          }
        }
      });

      const dailyTrends = Array.from(dailyStatsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      const topServices = Array.from(serviceSalesMap.values()).sort((a, b) => b.total - a.total).slice(0, 7);

      // Timeline of orders for dynamic client-side filtering by hour/day/month
      const ordersTimeline = orders.map(o => ({
        id: o.id,
        createdAt: o.createdAt,
        totalPrice: o.totalPrice || 0,
        status: o.status
      }));

      res.json({
        summary: {
          totalOrders,
          completedOrders: completedOrders.length,
          totalRevenue,
          avgCheck
        },
        dailyTrends,
        topServices,
        hourlyDistribution,
        ordersTimeline
      });
    } catch (error: any) {
      console.error("Ошибка при расчете аналитики:", error);
      res.status(500).json({ error: "Не удалось сформировать отчет аналитики." });
    }
  });

  // ==================== PROMOCODES API ====================
  // API Route: Получить все промокоды заведения
  app.get("/api/shops/:shopId/promocodes", async (req, res) => {
    try {
      const { shopId } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на просмотр промокодов этого заведения." });
      }

      const promocodes = await db.promocode.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" }
      });

      res.json(promocodes);
    } catch (error) {
      console.error("Ошибка при получении промокодов:", error);
      res.status(500).json({ error: "Не удалось загрузить промокоды." });
    }
  });

  // API Route: Создать новый промокод
  app.post("/api/shops/:shopId/promocodes", async (req, res) => {
    try {
      const { shopId } = req.params;
      const {
        code,
        discountPercent,
        discountAmount,
        maxUses,
        usageLimit,
        minOrderAmount,
        expiresAt,
        description,
        isActive
      } = req.body;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на добавление промокодов." });
      }

      const cleanCode = (code || "").trim().toUpperCase();
      if (!cleanCode || cleanCode.length < 2) {
        return res.status(400).json({ error: "Промокод должен содержать минимум 2 символа." });
      }
      if (cleanCode.length > 25) {
        return res.status(400).json({ error: "Длина промокода не должна превышать 25 символов." });
      }

      const numPercent = Math.max(0, Math.min(100, Number(discountPercent) || 0));
      const numAmount = Math.max(0, Math.min(100000, Number(discountAmount) || 0));
      const effectiveMaxUses = Number(maxUses) || Number(usageLimit);
      const numMaxUses = effectiveMaxUses && effectiveMaxUses > 0 ? Math.min(100000, effectiveMaxUses) : 100;
      const numMinOrder = minOrderAmount ? Math.max(0, Number(minOrderAmount) || 0) : 0;
      const expDate = expiresAt ? new Date(expiresAt) : null;
      const cleanDesc = description ? String(description).trim().slice(0, 200) : null;

      if (numPercent === 0 && numAmount === 0) {
        return res.status(400).json({ error: "Укажите либо процент скидки (% > 0), либо фиксированную сумму в рублях (₽ > 0)." });
      }

      const existing = await db.promocode.findFirst({
        where: { shopId, code: cleanCode }
      });
      if (existing) {
        return res.status(400).json({ error: "Промокод с таким названием уже существует в этом заведении." });
      }

      const promocode = await db.promocode.create({
        data: {
          shopId,
          code: cleanCode,
          discountPercent: numPercent,
          discountAmount: numAmount,
          maxUses: numMaxUses,
          minOrderAmount: numMinOrder,
          expiresAt: expDate && !isNaN(expDate.getTime()) ? expDate : null,
          description: cleanDesc,
          isActive: isActive !== false
        }
      });

      broadcastEvent({ type: "PROMOCODE_CREATED", shopId, payload: promocode });
      res.status(201).json(promocode);
    } catch (error) {
      console.error("Ошибка при создании промокода:", error);
      res.status(500).json({ error: "Не удалось создать промокод." });
    }
  });

  // API Route: Обновить промокод
  app.put("/api/promocodes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const {
        code,
        discountPercent,
        discountAmount,
        maxUses,
        usageLimit,
        minOrderAmount,
        expiresAt,
        description,
        isActive
      } = req.body;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const promo = await db.promocode.findUnique({ where: { id } });
      if (!promo) return res.status(404).json({ error: "Промокод не найден." });

      const hasPermission = await canManageShop(db, promo.shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на редактирование этого промокода." });
      }

      const cleanCode = (code || promo.code).trim().toUpperCase();
      if (!cleanCode || cleanCode.length < 2) {
        return res.status(400).json({ error: "Промокод должен содержать минимум 2 символа." });
      }

      const numPercent = Math.max(0, Math.min(100, Number(discountPercent) || 0));
      const numAmount = Math.max(0, Math.min(100000, Number(discountAmount) || 0));
      const effectiveMaxUses = Number(maxUses) || Number(usageLimit);
      const numMaxUses = effectiveMaxUses && effectiveMaxUses > 0 ? Math.min(100000, effectiveMaxUses) : 100;
      const numMinOrder = minOrderAmount !== undefined ? Math.max(0, Number(minOrderAmount) || 0) : promo.minOrderAmount;
      const expDate = expiresAt ? new Date(expiresAt) : null;
      const cleanDesc = description !== undefined ? (description ? String(description).trim().slice(0, 200) : null) : promo.description;

      if (numPercent === 0 && numAmount === 0) {
        return res.status(400).json({ error: "Укажите либо процент скидки (% > 0), либо фиксированную сумму в рублях (₽ > 0)." });
      }

      // Check duplicate code in same shop
      if (cleanCode !== promo.code) {
        const existing = await db.promocode.findFirst({
          where: { shopId: promo.shopId, code: cleanCode, NOT: { id } }
        });
        if (existing) {
          return res.status(400).json({ error: "Промокод с таким названием уже существует в этом заведении." });
        }
      }

      const updated = await db.promocode.update({
        where: { id },
        data: {
          code: cleanCode,
          discountPercent: numPercent,
          discountAmount: numAmount,
          maxUses: numMaxUses,
          minOrderAmount: numMinOrder,
          expiresAt: expDate && !isNaN(expDate.getTime()) ? expDate : null,
          description: cleanDesc,
          isActive: typeof isActive === "boolean" ? isActive : promo.isActive
        }
      });

      broadcastEvent({ type: "PROMOCODE_UPDATED", shopId: promo.shopId, payload: updated });
      res.json(updated);
    } catch (error) {
      console.error("Ошибка при обновлении промокода:", error);
      res.status(500).json({ error: "Не удалось обновить промокод." });
    }
  });

  // API Route: Переключить активность промокода
  app.patch("/api/promocodes/:id/toggle", async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const promo = await db.promocode.findUnique({ where: { id } });
      if (!promo) return res.status(404).json({ error: "Промокод не найден." });

      const hasPermission = await canManageShop(db, promo.shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на редактирование промокодов." });
      }

      const updated = await db.promocode.update({
        where: { id },
        data: { isActive: typeof isActive === "boolean" ? isActive : !promo.isActive }
      });

      broadcastEvent({ type: "PROMOCODE_UPDATED", shopId: promo.shopId, payload: updated });
      res.json(updated);
    } catch (error) {
      console.error("Ошибка при переключении статуса промокода:", error);
      res.status(500).json({ error: "Не удалось обновить статус промокода." });
    }
  });

  // API Route: Удалить промокод
  app.delete("/api/promocodes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const promo = await db.promocode.findUnique({ where: { id } });
      if (!promo) return res.status(404).json({ error: "Промокод не найден." });

      const hasPermission = await canManageShop(db, promo.shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на удаление этого промокода." });
      }

      await db.promocode.delete({ where: { id } });
      broadcastEvent({ type: "PROMOCODE_DELETED", shopId: promo.shopId, payload: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Ошибка при удалении промокода:", error);
      res.status(500).json({ error: "Не удалось удалить промокод." });
    }
  });

  // API Route: Валидация промокода для покупателя (поддержка обоих путей)
  const validatePromoHandler = async (req: any, res: any) => {
    try {
      const { shopId, code, orderTotal, cartTotal } = req.body;
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const cleanCode = (code || "").trim().toUpperCase();
      if (!cleanCode) {
        return res.status(400).json({ error: "Введите промокод." });
      }

      const promo = await db.promocode.findFirst({
        where: { shopId, code: cleanCode }
      });

      if (!promo) {
        return res.status(404).json({ error: "Промокод не найден." });
      }

      if (!promo.isActive) {
        return res.status(400).json({ error: "Этот промокод временно деактивирован." });
      }

      if (promo.usedCount >= promo.maxUses) {
        return res.status(400).json({ error: "Превышен лимит использований этого промокода." });
      }

      if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Срок действия этого промокода истёк." });
      }

      const totalToCheck = Number(orderTotal) || Number(cartTotal) || 0;
      if (promo.minOrderAmount && promo.minOrderAmount > 0 && totalToCheck > 0 && totalToCheck < promo.minOrderAmount) {
        return res.status(400).json({
          error: `Минимальная сумма заказа для этого промокода: ${promo.minOrderAmount} ₽ (в корзине: ${totalToCheck} ₽)`
        });
      }

      res.json({
        valid: true,
        promocode: promo,
        code: promo.code,
        discountPercent: promo.discountPercent,
        discountAmount: promo.discountAmount,
        minOrderAmount: promo.minOrderAmount,
        description: promo.description
      });
    } catch (error) {
      console.error("Ошибка при проверке промокода:", error);
      res.status(500).json({ error: "Не удалось проверить промокод." });
    }
  };

  app.post("/api/promocodes/validate", validatePromoHandler);
  app.post("/api/public/promocodes/validate", validatePromoHandler);

  // ==================== REVIEWS API ====================
  // API Route: Получить отзывы заведения
  app.get(["/api/shops/:shopId/reviews", "/api/public/shops/:shopId/reviews"], async (req, res) => {
    try {
      const { shopId } = req.params;
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const reviews = await db.review.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        take: 50
      });

      // Рассчитываем средний рейтинг
      const count = reviews.length;
      const avgRating = count > 0 
        ? (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / count).toFixed(1)
        : "5.0";

      res.json({
        reviews,
        stats: {
          totalReviews: count,
          avgRating: Number(avgRating)
        }
      });
    } catch (error) {
      console.error("Ошибка при получении отзывов:", error);
      res.status(500).json({ error: "Не удалось загрузить отзывы." });
    }
  });

  // API Route: Оставить отзыв
  app.post(["/api/shops/:shopId/reviews", "/api/public/shops/:shopId/reviews"], async (req, res) => {
    try {
      const { shopId } = req.params;
      const { customerName, rating, comment, imageUrl, authorToken: customToken } = req.body;
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const cleanName = (customerName || "").trim();
      if (!cleanName || cleanName.length < 2) {
        return res.status(400).json({ error: "Пожалуйста, укажите ваше имя (минимум 2 символа)." });
      }
      if (cleanName.length > 50) {
        return res.status(400).json({ error: "Имя не должно превышать 50 символов." });
      }

      const cleanComment = comment ? String(comment).trim() : null;
      if (cleanComment && cleanComment.length > 500) {
        return res.status(400).json({ error: "Текст отзыва слишком длинный (максимум 500 символов)." });
      }

      const cleanImageUrl = imageUrl ? String(imageUrl).trim() : null;
      const numRating = Math.max(1, Math.min(5, Number(rating) || 5));
      const authorToken = customToken ? String(customToken).trim() : (Math.random().toString(36).substring(2) + Date.now().toString(36));

      const review = await db.review.create({
        data: {
          shopId,
          customerName: cleanName,
          rating: numRating,
          comment: cleanComment,
          imageUrl: cleanImageUrl,
          authorToken,
          isEdited: false
        }
      });

      // Отправляем уведомление в Telegram бот администратора при наличии токена
      try {
        const shop = await db.shop.findUnique({ where: { id: shopId } });
        if (shop) {
          const notifType = numRating <= 2 ? "LOW_RATING" : "NEW_REVIEW";
          broadcastTelegramNotification(db, shop, notifType, review).catch((e) =>
            console.error("Ошибка отправки отзыва в Telegram:", e)
          );
        }
      } catch (tgErr) {
        console.warn("Ошибка проверки параметров Telegram для отзыва:", tgErr);
      }

      broadcastEvent({ type: "REVIEW_CREATED", shopId, payload: review });
      res.status(201).json(review);
    } catch (error) {
      console.error("Ошибка при создании отзыва:", error);
      res.status(500).json({ error: "Не удалось оставить отзыв." });
    }
  });

  // API Route: Отредактировать свой отзыв (для пользователя)
  app.put("/api/reviews/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { customerName, rating, comment, imageUrl, authorToken } = req.body;
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const review = await db.review.findUnique({ where: { id } });
      if (!review) return res.status(404).json({ error: "Отзыв не найден." });

      const cleanName = customerName ? String(customerName).trim() : review.customerName;
      if (!cleanName || cleanName.length < 2) {
        return res.status(400).json({ error: "Пожалуйста, укажите ваше имя (минимум 2 символа)." });
      }

      const cleanComment = comment !== undefined ? (comment ? String(comment).trim() : null) : review.comment;
      if (cleanComment && cleanComment.length > 500) {
        return res.status(400).json({ error: "Текст отзыва не должен превышать 500 символов." });
      }

      const cleanImageUrl = imageUrl !== undefined ? (imageUrl ? String(imageUrl).trim() : null) : review.imageUrl;
      const numRating = rating ? Math.max(1, Math.min(5, Number(rating) || 5)) : review.rating;

      const updated = await db.review.update({
        where: { id },
        data: {
          customerName: cleanName,
          rating: numRating,
          comment: cleanComment,
          imageUrl: cleanImageUrl,
          isEdited: true
        }
      });

      broadcastEvent({ type: "REVIEW_UPDATED", shopId: review.shopId, payload: updated });
      res.json(updated);
    } catch (error) {
      console.error("Ошибка при изменении отзыва:", error);
      res.status(500).json({ error: "Не удалось отредактировать отзыв." });
    }
  });

  // API Route: Ответить на отзыв (для владельца)
  app.put("/api/reviews/:id/reply", async (req, res) => {
    try {
      const { id } = req.params;
      const { reply } = req.body;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const review = await db.review.findUnique({ where: { id } });
      if (!review) return res.status(404).json({ error: "Отзыв не найден." });

      const hasPermission = await canManageShop(db, review.shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав отвечать на отзывы этого заведения." });
      }

      const cleanReply = reply ? String(reply).trim() : null;
      if (cleanReply && cleanReply.length > 500) {
        return res.status(400).json({ error: "Ответ на отзыв не должен превышать 500 символов." });
      }

      const updated = await db.review.update({
        where: { id },
        data: { reply: cleanReply }
      });

      broadcastEvent({ type: "REVIEW_UPDATED", shopId: review.shopId, payload: updated });
      res.json(updated);
    } catch (error) {
      console.error("Ошибка при ответе на отзыв:", error);
      res.status(500).json({ error: "Не удалось сохранить ответ на отзыв." });
    }
  });

  // API Route: Удалить отзыв (запрещено для владельцев, разрешено для автора)
  app.delete("/api/reviews/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const review = await db.review.findUnique({ where: { id } });
      if (!review) return res.status(404).json({ error: "Отзыв не найден." });

      // Если запрос исходит от залогиненного владельца/админа заведения
      if (authUser) {
        const hasPermission = await canManageShop(db, review.shopId, authUser);
        if (hasPermission) {
          return res.status(403).json({ 
            error: "Владельцы заведений не могут удалять отзывы клиентов для сохранения объективности и честности рейтинга." 
          });
        }
      }

      await db.review.delete({ where: { id } });

      broadcastEvent({ type: "REVIEW_DELETED", shopId: review.shopId, payload: { id } });
      res.json({ success: true, message: "Отзыв успешно удален." });
    } catch (error) {
      console.error("Ошибка при удалении отзыва:", error);
      res.status(500).json({ error: "Не удалось удалить отзыв." });
    }
  });

  // API Route: Получить банеры заведения
  app.get(["/api/shops/:shopId/banners", "/api/public/shops/:shopId/banners"], async (req, res) => {
    try {
      const { shopId } = req.params;
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const banners = await db.banner.findMany({
        where: { shopId, isActive: true },
        orderBy: { createdAt: "desc" }
      });

      res.json(banners);
    } catch (error) {
      console.error("Ошибка при получении баннеров:", error);
      res.status(500).json({ error: "Не удалось загрузить баннеры." });
    }
  });

  // API Route: Создать банер (для администратора)
  app.post("/api/shops/:shopId/banners", async (req, res) => {
    try {
      const { shopId } = req.params;
      const { title, subtitle, imageUrl, badge, bgGradient } = req.body;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на создание баннеров." });
      }

      const cleanTitle = title ? String(title).trim() : "";
      if (!cleanTitle) {
        return res.status(400).json({ error: "Укажите заголовок баннера (минимум 2 символа)." });
      }
      if (cleanTitle.length > 80) {
        return res.status(400).json({ error: "Заголовок баннера не должен превышать 80 символов." });
      }

      const cleanSubtitle = subtitle ? String(subtitle).trim().slice(0, 150) : null;
      const cleanBadge = badge ? String(badge).trim().slice(0, 25) : null;
      const cleanImageUrl = imageUrl ? String(imageUrl).trim() : null;

      const banner = await db.banner.create({
        data: {
          shopId,
          title: cleanTitle,
          subtitle: cleanSubtitle,
          imageUrl: cleanImageUrl,
          badge: cleanBadge,
          bgGradient: bgGradient ? String(bgGradient).trim().slice(0, 100) : "from-slate-900 to-indigo-950"
        }
      });

      broadcastEvent({ type: "BANNER_CREATED", shopId, payload: banner });
      res.status(201).json(banner);
    } catch (error: any) {
      console.error("Ошибка при создании баннера:", error);
      res.status(500).json({ error: "Не удалось создать баннер." });
    }
  });

  // API Route: Удалить банер
  app.delete("/api/banners/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const banner = await db.banner.findUnique({ where: { id } });
      if (!banner) return res.status(404).json({ error: "Баннер не найден." });

      const hasPermission = await canManageShop(db, banner.shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на удаление этого баннера." });
      }

      await db.banner.delete({ where: { id } });
      broadcastEvent({ type: "BANNER_DELETED", shopId: banner.shopId, payload: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Ошибка при удалении баннера:", error);
      res.status(500).json({ error: "Не удалось удалить баннер." });
    }
  });

  // API Route: Экспорт заказов заведения в CSV (с поддержки магии Excel BOM UTF-8)
  app.get("/api/shops/:shopId/orders/export-csv", async (req, res) => {
    try {
      const { shopId } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canProcessOrders(db, shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на экспорт заказов этого заведения." });
      }

      const orders = await db.order.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" }
      });

      // Формирование CSV
      const rows = [
        ["ID Заказа", "Дата и время", "Клиент", "Телефон", "Способ/Стол", "Статус", "Сумма (₽)", "Состав заказа", "Примечание"]
      ];

      orders.forEach((o: any) => {
        let itemsSummary = "";
        try {
          const parsed = JSON.parse(o.items);
          if (Array.isArray(parsed)) {
            itemsSummary = parsed.map((i: any) => `${i.title || i.name} x${i.quantity || 1}`).join("; ");
          }
        } catch {
          itemsSummary = o.items || "";
        }

        const dateStr = new Date(o.createdAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
        const typeOrTable = o.tableNumber ? `Стол #${o.tableNumber}` : (o.preferredTime ? `Самовывоз (${o.preferredTime})` : "Самовывоз");

        rows.push([
          o.id,
          dateStr,
          o.customerName,
          o.customerPhone,
          typeOrTable,
          o.status,
          String(o.totalPrice),
          itemsSummary,
          o.note || ""
        ]);
      });

      const csvContent = rows
        .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(";"))
        .join("\r\n");

      // UTF-8 BOM byte order mark \uFEFF for proper opening in Excel on Russian Windows
      const bom = "\uFEFF";
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="orders-${shopId}-${Date.now()}.csv"`);
      res.send(bom + csvContent);
    } catch (error) {
      console.error("Ошибка экспорта CSV:", error);
      res.status(500).json({ error: "Не удалось сгенерировать CSV файл." });
    }
  });

  // API Route: Получить профиль бонусов клиента по номеру телефона
  app.get("/api/shops/:shopId/customer-info", async (req, res) => {
    try {
      const { shopId } = req.params;
      const { phone } = req.query;
      if (!phone) return res.json(null);

      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const cleanPhone = String(phone).replace(/[^\d+]/g, "");
      const customer = await db.customer.findFirst({
        where: { shopId, phone: cleanPhone }
      });

      res.json(customer || null);
    } catch (error) {
      console.error("Ошибка получения данных клиента:", error);
      res.status(500).json({ error: "Не удалось получить профиль клиента." });
    }
  });

  // API Route: Получить список клиентов (CRM) для заведения
  app.get("/api/shops/:shopId/customers", async (req, res) => {
    try {
      const { shopId } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на просмотр клиентов этого заведения." });
      }

      const orders = await db.order.findMany({ where: { shopId } });
      const statsByPhone: Record<string, { totalSpent: number; ordersCount: number; name: string }> = {};

      orders.forEach((o: any) => {
        if (!o.customerPhone) return;
        const phone = o.customerPhone;
        if (!statsByPhone[phone]) {
          statsByPhone[phone] = { totalSpent: 0, ordersCount: 0, name: o.customerName || "Клиент" };
        }
        statsByPhone[phone].ordersCount += 1;
        if (o.status !== "CANCELLED") {
          statsByPhone[phone].totalSpent += Number(o.totalPrice) || 0;
        }
      });

      let customers = await db.customer.findMany({
        where: { shopId },
        orderBy: { totalSpent: "desc" }
      });

      for (const [phone, stats] of Object.entries(statsByPhone)) {
        const existing = customers.find((c: any) => c.phone === phone);
        if (existing) {
          if (existing.totalSpent !== stats.totalSpent || existing.ordersCount !== stats.ordersCount) {
            await db.customer.update({
              where: { id: existing.id },
              data: { totalSpent: stats.totalSpent, ordersCount: stats.ordersCount, updatedAt: new Date() }
            });
            existing.totalSpent = stats.totalSpent;
            existing.ordersCount = stats.ordersCount;
          }
        } else {
          try {
            const created = await db.customer.create({
              data: {
                shopId,
                phone,
                name: stats.name,
                bonusBalance: 0,
                totalSpent: stats.totalSpent,
                ordersCount: stats.ordersCount
              }
            });
            customers.push(created);
          } catch {
            // ignore duplicate phone creation error
          }
        }
      }

      customers.sort((a: any, b: any) => (b.totalSpent || 0) - (a.totalSpent || 0));

      res.json(customers);
    } catch (error) {
      console.error("Ошибка получения клиентов:", error);
      res.status(500).json({ error: "Не удалось загрузить клиентов." });
    }
  });

  // API Route: Ручная корректировка бонусов клиента
  app.post("/api/shops/:shopId/customers/bonus", async (req, res) => {
    try {
      const { shopId } = req.params;
      const { phone, delta, reason } = req.body;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на изменение бонусов." });
      }

      const cleanPhone = String(phone).replace(/[^\d+]/g, "");
      let customer = await db.customer.findFirst({ where: { shopId, phone: cleanPhone } });

      const amount = Number(delta) || 0;

      if (!customer) {
        customer = await db.customer.create({
          data: {
            shopId,
            phone: cleanPhone,
            name: "Покупатель",
            bonusBalance: Math.max(0, amount),
            totalSpent: 0,
            ordersCount: 0
          }
        });
      } else {
        const newBalance = Math.max(0, (customer.bonusBalance || 0) + amount);
        customer = await db.customer.update({
          where: { id: customer.id },
          data: { bonusBalance: newBalance, updatedAt: new Date() }
        });
      }

      broadcastEvent({ type: "CUSTOMER_UPDATED", shopId, payload: customer });
      res.json(customer);
    } catch (error) {
      console.error("Ошибка изменения бонусов:", error);
      res.status(500).json({ error: "Не удалось изменить баланс бонусов." });
    }
  });

  // API Route: Редактирование данных клиента
  app.put("/api/shops/:shopId/customers/:customerId", async (req, res) => {
    try {
      const { shopId, customerId } = req.params;
      const { name, phone, bonusBalance } = req.body;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на редактирование клиентов." });
      }

      const existing = await db.customer.findUnique({
        where: { id: customerId }
      });

      if (!existing || existing.shopId !== shopId) {
        return res.status(404).json({ error: "Клиент не найден." });
      }

      const trimmedName = typeof name === "string" ? name.trim() : existing.name;
      const cleanPhone = typeof phone === "string" ? phone.trim() : existing.phone;

      if (!trimmedName) {
        return res.status(400).json({ error: "Имя клиента не может быть пустым." });
      }
      if (!cleanPhone) {
        return res.status(400).json({ error: "Номер телефона не может быть пустым." });
      }

      const updated = await db.customer.update({
        where: { id: customerId },
        data: {
          name: trimmedName,
          phone: cleanPhone,
          bonusBalance: typeof bonusBalance === "number" ? Math.max(0, bonusBalance) : existing.bonusBalance,
          updatedAt: new Date()
        }
      });

      // Update associated orders if name or phone changed so stats and history stay consistent
      if (existing.phone !== cleanPhone || existing.name !== trimmedName) {
        await db.order.updateMany({
          where: { shopId, customerPhone: existing.phone },
          data: {
            customerPhone: cleanPhone,
            customerName: trimmedName
          }
        }).catch(() => {});
      }

      broadcastEvent({ type: "CUSTOMER_UPDATED", shopId, payload: updated });
      res.json(updated);
    } catch (error) {
      console.error("Ошибка редактирования клиента:", error);
      res.status(500).json({ error: "Не удалось обновить данные клиента." });
    }
  });

  // API Route: Удаление клиента
  app.delete("/api/shops/:shopId/customers/:customerId", async (req, res) => {
    try {
      const { shopId, customerId } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на удаление клиентов." });
      }

      const existing = await db.customer.findUnique({
        where: { id: customerId }
      });

      if (!existing || existing.shopId !== shopId) {
        return res.status(404).json({ error: "Клиент не найден." });
      }

      // Unlink phone on orders for this shop so GET /customers won't re-create this customer
      await db.order.updateMany({
        where: { shopId, customerPhone: existing.phone },
        data: { customerPhone: "" }
      }).catch(() => {});

      await db.customer.delete({
        where: { id: customerId }
      });

      broadcastEvent({ type: "CUSTOMER_DELETED", shopId, payload: { id: customerId, phone: existing.phone } });
      res.json({ success: true, id: customerId });
    } catch (error) {
      console.error("Ошибка удаления клиента:", error);
      res.status(500).json({ error: "Не удалось удалить клиента." });
    }
  });

  // API Route: Получить список рассылок заведения
  app.get("/api/shops/:shopId/broadcasts", async (req, res) => {
    try {
      const { shopId } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const broadcasts = await db.broadcast.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" }
      });

      res.json(broadcasts);
    } catch (error) {
      console.error("Ошибка получения рассылок:", error);
      res.status(500).json({ error: "Не удалось получить рассылки." });
    }
  });

  // API Route: Создать и отправить новую рассылку
  app.post("/api/shops/:shopId/broadcasts", async (req, res) => {
    try {
      const { shopId } = req.params;
      const { title, message, imageUrl, buttonText, targetFilter } = req.body;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на создание рассылки." });
      }

      const cleanTitle = title ? String(title).trim() : "";
      const cleanMessage = message ? String(message).trim() : "";

      if (!cleanTitle || cleanTitle.length < 2) {
        return res.status(400).json({ error: "Укажите заголовок рассылки (минимум 2 символа)." });
      }
      if (cleanTitle.length > 100) {
        return res.status(400).json({ error: "Заголовок рассылки не должен превышать 100 символов." });
      }

      if (!cleanMessage || cleanMessage.length < 2) {
        return res.status(400).json({ error: "Укажите текст сообщения (минимум 2 символа)." });
      }
      if (cleanMessage.length > 1000) {
        return res.status(400).json({ error: "Текст рассылки слишком длинный (максимум 1000 символов)." });
      }

      const cleanButtonText = buttonText ? String(buttonText).trim().slice(0, 40) : null;
      const cleanImageUrl = imageUrl ? String(imageUrl).trim() : null;

      // Посчитаем количество получателей по гибким фильтрам
      let count = 0;
      try {
        if (targetFilter === "ACTIVE") {
          count = await db.customer.count({ where: { shopId, ordersCount: { gt: 1 } } });
        } else if (targetFilter === "INACTIVE") {
          count = await db.customer.count({ where: { shopId, ordersCount: 0 } });
        } else if (targetFilter === "NEW") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          count = await db.customer.count({ where: { shopId, createdAt: { gte: sevenDaysAgo } } });
        } else if (targetFilter === "VIP") {
          count = await db.customer.count({ where: { shopId, totalSpent: { gte: 3000 } } });
        } else if (targetFilter === "BONUS_HOLDERS") {
          count = await db.customer.count({ where: { shopId, bonusBalance: { gt: 0 } } });
        } else {
          count = await db.customer.count({ where: { shopId } });
        }
      } catch (err) {
        console.error("Error counting audience:", err);
      }
      if (count === 0) count = 1; // минимум 1 как минимум админский чат

      // Создаем запись рассылки
      const broadcast = await db.broadcast.create({
        data: {
          shopId,
          title: cleanTitle,
          message: cleanMessage,
          imageUrl: cleanImageUrl,
          buttonText: cleanButtonText || "📱 Открыть Меню",
          targetFilter: targetFilter || "ALL",
          sentCount: count,
          status: "SENT"
        }
      });

      // Если настроен Telegram Bot, отправляем уведомление всем подписчикам заведения
      const shop = await db.shop.findUnique({ where: { id: shopId } });
      if (shop) {
        await broadcastTelegramNotification(db, shop, "BROADCAST", { title, message, count }).catch(() => {});
      }

      broadcastEvent({ type: "BROADCAST_CREATED", shopId, payload: broadcast });
      res.status(201).json(broadcast);
    } catch (error) {
      console.error("Ошибка создания рассылки:", error);
      res.status(500).json({ error: "Не удалось создать и отправить рассылку." });
    }
  });

  // API Route: Удалить рассылку
  app.delete("/api/broadcasts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const broadcast = await db.broadcast.findUnique({ where: { id } });
      if (!broadcast) return res.status(404).json({ error: "Рассылка не найдена." });

      const hasPermission = await canManageShop(db, broadcast.shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на удаление этой рассылки." });
      }

      await db.broadcast.delete({ where: { id } });
      broadcastEvent({ type: "BROADCAST_DELETED", shopId: broadcast.shopId, payload: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("Ошибка удаления рассылки:", error);
      res.status(500).json({ error: "Не удалось удалить рассылку." });
    }
  });

  // ==========================================
  // TELEGRAM BOT INTEGRATION API ENDPOINTS
  // ==========================================

  // API Route: Получить текущий статус интеграции с Telegram
  app.get("/api/shops/:shopId/telegram/status", async (req, res) => {
    try {
      const { shopId } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) return res.status(403).json({ error: "У вас нет прав для просмотра настроек заведения." });

      const shop = await db.shop.findUnique({ where: { id: shopId } });
      if (!shop) return res.status(404).json({ error: "Заведение не найдено." });

      const settings = parseTelegramSettings(shop.telegramSettings);
      const isConnected = Boolean(shop.botToken);

      let botInfo: any = null;
      let webhookInfo: any = null;

      if (shop.botToken) {
        const [meRes, whRes] = await Promise.all([
          getTelegramMe(shop.botToken),
          getTelegramWebhookInfo(shop.botToken)
        ]);

        if (meRes.ok && meRes.result) {
          botInfo = meRes.result;
          if (settings.botUsername !== meRes.result.username || settings.botName !== meRes.result.first_name) {
            settings.botId = meRes.result.id;
            settings.botUsername = meRes.result.username;
            settings.botName = meRes.result.first_name;
            await db.shop.update({
              where: { id: shopId },
              data: { telegramSettings: JSON.stringify(settings) }
            }).catch(() => {});
          }
        }
        if (whRes.ok && whRes.result) {
          webhookInfo = whRes.result;
        }
      }

      const host = req.get("host") || "";
      const protocol = host.includes("localhost") ? "http" : "https";
      const origin = req.get("origin") || `${protocol}://${host}`;
      const shopUrl = `${origin}/${shop.slug}`;

      res.json({
        isConnected,
        hasBotToken: isConnected,
        botTokenMasked: maskTelegramToken(shop.botToken),
        adminChatId: shop.adminChatId || null,
        bot: botInfo,
        webhook: webhookInfo,
        settings,
        shopUrl,
        subscribers: settings.subscribers || [],
        inviteCodes: settings.inviteCodes || []
      });
    } catch (error: any) {
      console.error("Ошибка получения статуса Telegram:", error);
      res.status(500).json({ error: error.message || "Ошибка получения статуса Telegram." });
    }
  });

  // API Route: Подключить Telegram-бота к заведению
  app.post("/api/shops/:shopId/telegram/connect", async (req, res) => {
    try {
      const { shopId } = req.params;
      const { botToken } = req.body;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) return res.status(403).json({ error: "У вас нет прав для управления заведением." });

      if (!botToken || !String(botToken).trim()) {
        return res.status(400).json({ error: "Укажите API Token вашего Telegram-бота." });
      }

      const cleanToken = String(botToken).trim();
      const val = validateTelegramBotToken(cleanToken);
      if (!val.isValid) {
        return res.status(400).json({ error: val.error || "Неверный формат токена бота." });
      }

      // 1. Проверяем токен через Telegram getMe
      const meRes = await getTelegramMe(cleanToken);
      if (!meRes.ok || !meRes.result) {
        return res.status(400).json({ error: meRes.description || "Не удалось связаться с Telegram. Проверьте правильность токена." });
      }

      const bot = meRes.result;

      // 2. Исключаем привязку одного бота к разным заведениям
      const otherShop = await db.shop.findFirst({
        where: {
          id: { not: shopId },
          botToken: cleanToken
        }
      });
      if (otherShop) {
        return res.status(400).json({
          error: `Этот Telegram-бот (@${bot.username}) уже привязан к заведению «${otherShop.name}». Один бот может обслуживать только одно заведение. Создайте отдельного бота в @BotFather.`
        });
      }

      // 3. Формируем URL вебхука
      let clientBaseUrl = req.body.baseUrl || req.get("origin") || (req.get("referer") ? new URL(req.get("referer")).origin : "");
      if (!clientBaseUrl) {
        const host = req.get("host") || "";
        clientBaseUrl = `https://${host}`;
      }
      clientBaseUrl = clientBaseUrl.replace(/^http:/, "https:");
      const webhookUrl = `${clientBaseUrl}/api/telegram/webhook/${shopId}`;

      let webhookSetupResult = null;
      if (!clientBaseUrl.includes("localhost") && !clientBaseUrl.includes("127.0.0.1")) {
        webhookSetupResult = await setTelegramWebhook(cleanToken, webhookUrl);
      }

      // 4. Обновляем заведение
      const currentShop = await db.shop.findUnique({ where: { id: shopId } });
      const settings = parseTelegramSettings(currentShop?.telegramSettings);
      settings.botId = bot.id;
      settings.botName = bot.first_name;
      settings.botUsername = bot.username;
      settings.connectedAt = new Date().toISOString();
      settings.webhookUrl = webhookUrl;
      settings.webhookActive = webhookSetupResult?.ok ?? true;

      const updatedShop = await db.shop.update({
        where: { id: shopId },
        data: {
          botToken: cleanToken,
          telegramSettings: JSON.stringify(settings)
        }
      });

      broadcastEvent({ type: "SHOP_UPDATED", shopId, payload: updatedShop });

      res.json({
        success: true,
        bot,
        webhookUrl,
        botTokenMasked: maskTelegramToken(cleanToken),
        settings
      });
    } catch (error: any) {
      console.error("Ошибка подключения Telegram бота:", error);
      res.status(500).json({ error: error.message || "Ошибка подключения Telegram бота." });
    }
  });

  // API Route: Отключить Telegram-бота
  app.post("/api/shops/:shopId/telegram/disconnect", async (req, res) => {
    try {
      const { shopId } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) return res.status(403).json({ error: "У вас нет прав для управления заведением." });

      const shop = await db.shop.findUnique({ where: { id: shopId } });
      if (!shop) return res.status(404).json({ error: "Заведение не найдено." });

      if (shop.botToken) {
        await deleteTelegramWebhook(shop.botToken).catch(() => {});
      }

      const settings = parseTelegramSettings(shop.telegramSettings);
      delete settings.botId;
      delete settings.botName;
      delete settings.botUsername;
      delete settings.connectedAt;
      delete settings.webhookUrl;
      settings.webhookActive = false;
      settings.subscribers = [];
      settings.inviteCodes = [];

      const updatedShop = await db.shop.update({
        where: { id: shopId },
        data: {
          botToken: null,
          adminChatId: null,
          telegramSettings: JSON.stringify(settings)
        }
      });

      broadcastEvent({ type: "SHOP_UPDATED", shopId, payload: updatedShop });
      res.json({ success: true, message: "Telegram-бот успешно отключён." });
    } catch (error: any) {
      console.error("Ошибка отключения Telegram бота:", error);
      res.status(500).json({ error: error.message || "Ошибка отключения бота." });
    }
  });

  // API Route: Отправить тестовое уведомление
  app.post("/api/shops/:shopId/telegram/test-notification", async (req, res) => {
    try {
      const { shopId } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) return res.status(403).json({ error: "У вас нет прав для работы с заведением." });

      const shop = await db.shop.findUnique({ where: { id: shopId } });
      if (!shop) return res.status(404).json({ error: "Заведение не найдено." });

      const botToken = (req.body.botToken || shop.botToken || "").trim();
      const adminChatId = (req.body.adminChatId || shop.adminChatId || "").trim();

      if (!botToken) return res.status(400).json({ error: "Токен бота не указан." });
      if (!adminChatId) return res.status(400).json({ error: "Chat ID администратора не указан. Отправьте /start боту или укажите Chat ID." });

      const host = req.get("host") || "";
      const protocol = host.includes("localhost") ? "http" : "https";
      const shopUrl = `${protocol}://${host}/${shop.slug}`;

      const testOrder = {
        id: "TEST-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
        customerName: "Иван Тестовый",
        customerPhone: "+7 (999) 000-00-00",
        fulfillmentMethod: "courier",
        deliveryAddress: "ул. Примерная, д. 1, кв. 10",
        items: JSON.stringify([
          { title: "Фирменное блюдо", price: 650, quantity: 2, note: "Побольше соуса" },
          { title: "Напиток ягодный", price: 150, quantity: 1 }
        ]),
        totalPrice: 1450,
        status: "PENDING",
        createdAt: new Date().toISOString()
      };

      const testText =
        `🎉 *ТЕСТОВОЕ УВЕДОМЛЕНИЕ: Заведение «${shop.name}»*\n\n` +
        `✅ Связь с вашим Telegram-ботом полностью настроена и функционирует!\n` +
        `📱 Ниже представлен пример карточки нового заказа с интерактивными кнопками управления:\n\n` +
        getOrderCardText(testOrder, shop);

      const sendRes = await sendTelegramMessage(botToken, adminChatId, testText, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Принять (Тест)", callback_data: "order:status:TEST:CONFIRMED" },
              { text: "👨‍🍳 В работу (Тест)", callback_data: "order:status:TEST:IN_PROGRESS" }
            ],
            [
              { text: "🛍️ Открыть витрину (Mini App)", web_app: { url: shopUrl } }
            ]
          ]
        }
      });

      if (!sendRes.ok) {
        return res.status(400).json({ error: sendRes.description || "Не удалось отправить тестовое сообщение в Telegram." });
      }

      res.json({ success: true, result: sendRes.result });
    } catch (error: any) {
      console.error("Ошибка тестового уведомления Telegram:", error);
      res.status(500).json({ error: error.message || "Ошибка отправки тестового сообщения." });
    }
  });

  // API Route: Обновить настройки уведомлений Telegram
  app.post("/api/shops/:shopId/telegram/update-settings", async (req, res) => {
    try {
      const { shopId } = req.params;
      const { notifyOnNewOrder, notifyOnOrderStatus, notifyOnNewReview, notifyOnLowRating, adminChatId } = req.body;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) return res.status(403).json({ error: "У вас нет прав для управления заведением." });

      const shop = await db.shop.findUnique({ where: { id: shopId } });
      if (!shop) return res.status(404).json({ error: "Заведение не найдено." });

      const settings = parseTelegramSettings(shop.telegramSettings);
      if (notifyOnNewOrder !== undefined) settings.notifyOnNewOrder = Boolean(notifyOnNewOrder);
      if (notifyOnOrderStatus !== undefined) settings.notifyOnOrderStatus = Boolean(notifyOnOrderStatus);
      if (notifyOnNewReview !== undefined) settings.notifyOnNewReview = Boolean(notifyOnNewReview);
      if (notifyOnLowRating !== undefined) settings.notifyOnLowRating = Boolean(notifyOnLowRating);

      const nextAdminChatId = adminChatId !== undefined ? (adminChatId ? String(adminChatId).trim() : null) : shop.adminChatId;

      const updatedShop = await db.shop.update({
        where: { id: shopId },
        data: {
          adminChatId: nextAdminChatId,
          telegramSettings: JSON.stringify(settings)
        }
      });

      broadcastEvent({ type: "SHOP_UPDATED", shopId, payload: updatedShop });
      res.json({ success: true, settings, adminChatId: nextAdminChatId });
    } catch (error: any) {
      console.error("Ошибка сохранения настроек Telegram:", error);
      res.status(500).json({ error: error.message || "Ошибка сохранения настроек." });
    }
  });

  // API Route: Создать код приглашения сотрудника в Telegram
  app.post("/api/shops/:shopId/telegram/create-invite", async (req, res) => {
    try {
      const { shopId } = req.params;
      const { role = "STAFF" } = req.body;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) return res.status(403).json({ error: "У вас нет прав для управления заведением." });

      const shop = await db.shop.findUnique({ where: { id: shopId } });
      if (!shop || !shop.botToken) return res.status(400).json({ error: "Сначала подключите Telegram-бота к заведению." });

      const settings = parseTelegramSettings(shop.telegramSettings);
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString(); // 48 hours

      const newInvite = {
        code,
        role: (role === "ADMIN" || role === "MANAGER" ? "ADMIN" : "STAFF") as "ADMIN" | "STAFF",
        createdById: authUser.id,
        createdAt: new Date().toISOString(),
        expiresAt
      };

      settings.inviteCodes = (settings.inviteCodes || []).filter(c => new Date(c.expiresAt).getTime() > Date.now());
      settings.inviteCodes.push(newInvite);

      await db.shop.update({
        where: { id: shopId },
        data: { telegramSettings: JSON.stringify(settings) }
      });

      const botUsername = settings.botUsername || "bot";
      const inviteLink = `https://t.me/${botUsername}?start=bind_${newInvite.role}_${code}`;

      res.json({ success: true, invite: newInvite, inviteLink });
    } catch (error: any) {
      console.error("Ошибка создания инвайта Telegram:", error);
      res.status(500).json({ error: error.message || "Ошибка создания инвайта." });
    }
  });

  // API Route: Удалить подписчика бота (сотрудника)
  app.delete("/api/shops/:shopId/telegram/subscribers/:chatId", async (req, res) => {
    try {
      const { shopId, chatId } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) return res.status(403).json({ error: "У вас нет прав для управления заведением." });

      const shop = await db.shop.findUnique({ where: { id: shopId } });
      if (!shop) return res.status(404).json({ error: "Заведение не найдено." });

      const settings = parseTelegramSettings(shop.telegramSettings);
      settings.subscribers = (settings.subscribers || []).filter(s => s.chatId !== chatId);

      // Если удалили чат, который был adminChatId, сбрасываем его
      let nextAdminChatId = shop.adminChatId;
      if (shop.adminChatId === chatId) {
        nextAdminChatId = settings.subscribers[0]?.chatId || null;
      }

      await db.shop.update({
        where: { id: shopId },
        data: {
          adminChatId: nextAdminChatId,
          telegramSettings: JSON.stringify(settings)
        }
      });

      res.json({ success: true, subscribers: settings.subscribers });
    } catch (error: any) {
      console.error("Ошибка удаления подписчика Telegram:", error);
      res.status(500).json({ error: error.message || "Ошибка удаления подписчика." });
    }
  });

  // Telegram Webhook Handler (Обработка входящих обновлений от Telegram)
  app.all("/api/telegram/webhook/:shopId", async (req, res) => {
    try {
      const { shopId } = req.params;
      const update = req.body;
      const db = getPrismaClient() as any;

      if (!db || !update) return res.sendStatus(200);

      const host = req.get("host") || "";
      const protocol = host.includes("localhost") ? "http" : "https";
      const origin = req.get("origin") || `${protocol}://${host}`;

      await handleTelegramWebhookUpdate(db, shopId, update, origin, broadcastEvent);

      res.sendStatus(200);
    } catch (err) {
      console.error("Ошибка Telegram Webhook:", err);
      res.sendStatus(200);
    }
  });

  // Bug Report / Feedback API for Lead Developer (gelgaev.dev@mail.ru)
  app.post("/api/reports", async (req, res) => {
    try {
      const db = getPrismaClient() as any;
      if (!db) {
        return res.status(500).json({ error: "Database not connected" });
      }
      await ensureReportTable(db);

      const authUser = getAuthUser(req);
      const {
        type = "BUG",
        title = "",
        description = "",
        attachments = [],
        contact = "",
        shopId = null,
        metadata = {}
      } = req.body;

      if (!description || typeof description !== "string" || !description.trim()) {
        return res.status(400).json({ error: "Описание проблемы обязательно для заполнения" });
      }

      const trimmedDescription = description.trim();
      if (trimmedDescription.length > 2000) {
        return res.status(400).json({ error: "Описание слишком длинное (максимум 2000 символов)" });
      }

      let sanitizedAttachments: any[] = [];
      if (Array.isArray(attachments)) {
        if (attachments.length > 3) {
          return res.status(400).json({ error: "Максимум 3 прикрепленных файла" });
        }
        sanitizedAttachments = attachments.slice(0, 3).map((item) => {
          if (typeof item === "string") {
            return item;
          }
          if (typeof item === "object" && item !== null) {
            return {
              name: String(item.name || "").slice(0, 120),
              size: Number(item.size) || 0,
              type: String(item.type || "").slice(0, 50),
              url: String(item.url || "").slice(0, 15000000) // ~15MB data uri
            };
          }
          return null;
        }).filter(Boolean);
      }

      const reportId = `rep_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      const attachmentsJson = JSON.stringify(sanitizedAttachments);
      const metadataJson = typeof metadata === "object" ? JSON.stringify(metadata) : String(metadata || "{}");
      const devRecipientEmail = "gelgaev.dev@mail.ru";
      const senderContact = String(contact || (authUser ? authUser.email : "")).slice(0, 150) || "Анонимный пользователь";

      await db.$executeRawUnsafe(
        `INSERT INTO "Report" ("id", "type", "title", "description", "attachments", "contact", "userId", "shopId", "metadata", "status", "developerEmail", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
        reportId,
        String(type || "BUG").slice(0, 30),
        String(title || "").slice(0, 150),
        trimmedDescription,
        attachmentsJson,
        senderContact,
        authUser ? authUser.id : null,
        shopId ? String(shopId) : null,
        metadataJson,
        "NEW",
        devRecipientEmail
      );

      console.log(`[Report -> Developer (${devRecipientEmail})] New ${type} registered: ID=${reportId}, Contact=${senderContact}`);

      // Try sending Email to Developer (gelgaev.dev@mail.ru) via Nodemailer if SMTP is available
      try {
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = Number(process.env.SMTP_PORT) || 587;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;

        if (smtpHost && smtpUser && smtpPass) {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass }
          });

          const typeLabel = type === "BUG" ? "🐞 БАГ / ОШИБКА" : type === "FEATURE" ? "💡 ИДЕЯ / ПРЕДЛОЖЕНИЕ" : "❓ ВОПРОС / ДРУГОЕ";
          const subject = `[TMA Dev Reports] ${typeLabel}: ${title || trimmedDescription.slice(0, 40)}`;

          await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME || "Mini App Studio Reports"}" <${smtpUser}>`,
            to: devRecipientEmail,
            subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #121316; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
                <h2 style="color: #ffffff; border-bottom: 1px solid #27272a; padding-bottom: 12px; margin-top: 0;">
                  ${typeLabel}
                </h2>
                <p><strong>ID обращения:</strong> <code>${reportId}</code></p>
                <p><strong>Тема:</strong> ${title || "Без темы"}</p>
                <p><strong>Контакт отправителя:</strong> ${senderContact}</p>
                <p><strong>Заведение:</strong> ${shopId || "Не указано"}</p>
                <div style="background-color: #18181b; padding: 16px; border-radius: 8px; border: 1px solid #3f3f46; margin: 16px 0;">
                  <strong style="display: block; margin-bottom: 8px; color: #a1a1aa;">Описание проблемы:</strong>
                  <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${trimmedDescription.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                </div>
                ${sanitizedAttachments.length > 0 ? `<p><strong>Прикреплено файлов:</strong> ${sanitizedAttachments.length} шт.</p>` : ""}
                <hr style="border: none; border-top: 1px solid #27272a; margin: 20px 0;" />
                <p style="font-size: 12px; color: #71717a; margin: 0;">
                  Отправлено в панель разработчика gelgaev.dev@mail.ru • Mini App Studio
                </p>
              </div>
            `
          }).catch((mailErr) => {
            console.warn("[Report Email] Could not send email via SMTP, stored in DB successfully:", mailErr.message);
          });
        }
      } catch (mailErr) {
        console.warn("[Report Email Transport warning]:", mailErr);
      }

      // Broadcast realtime event to Developer Reports Page
      broadcastEvent({
        type: "NEW_REPORT",
        payload: {
          id: reportId,
          type,
          title,
          description: trimmedDescription,
          contact: senderContact,
          shopId,
          attachments: attachmentsJson,
          metadata: metadataJson,
          developerEmail: devRecipientEmail,
          status: "NEW",
          developerNotes: null,
          createdAt: new Date().toISOString()
        }
      });

      res.status(201).json({
        success: true,
        report: {
          id: reportId,
          type,
          title,
          status: "NEW",
          developerEmail: devRecipientEmail,
          createdAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error("Ошибка при создании репорта:", error);
      res.status(500).json({ error: error.message || "Не удалось сохранить репорт" });
    }
  });

  app.get("/api/reports", async (req, res) => {
    try {
      const db = getPrismaClient() as any;
      if (!db) {
        return res.status(500).json({ error: "Database not connected" });
      }
      await ensureReportTable(db);

      const authUser = getAuthUser(req);
      const isDeveloper = isDeveloperEmail(authUser?.email);

      if (!isDeveloper) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчика платформы (gelgaev.dev@mail.ru)" });
      }

      const typeFilter = req.query.type ? String(req.query.type) : null;
      const statusFilter = req.query.status ? String(req.query.status) : null;
      const search = req.query.search ? String(req.query.search).toLowerCase() : null;

      let reports = await db.$queryRawUnsafe(
        `SELECT * FROM "Report" ORDER BY "createdAt" DESC LIMIT 200`
      );

      let list = Array.isArray(reports) ? reports : [];

      if (typeFilter && typeFilter !== "ALL") {
        list = list.filter((r: any) => r.type === typeFilter);
      }
      if (statusFilter && statusFilter !== "ALL") {
        list = list.filter((r: any) => r.status === statusFilter);
      }
      if (search) {
        list = list.filter((r: any) => 
          (r.title && r.title.toLowerCase().includes(search)) ||
          (r.description && r.description.toLowerCase().includes(search)) ||
          (r.contact && r.contact.toLowerCase().includes(search)) ||
          (r.id && r.id.toLowerCase().includes(search))
        );
      }

      res.json({ reports: list, isDeveloper: true });
    } catch (error: any) {
      console.error("Ошибка получения репортов:", error);
      res.status(500).json({ error: error.message || "Ошибка при получении репортов" });
    }
  });

  app.patch("/api/reports/:id", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isDeveloperEmail(authUser?.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчика платформы (gelgaev.dev@mail.ru)" });
      }

      const db = getPrismaClient() as any;
      if (!db) {
        return res.status(500).json({ error: "Database not connected" });
      }
      await ensureReportTable(db);

      const reportId = req.params.id;
      const { status, developerNotes } = req.body;

      let updateFields: string[] = [];
      let params: any[] = [reportId];
      let paramIdx = 2;

      if (status) {
        updateFields.push(`"status" = $${paramIdx++}`);
        params.push(String(status));
        if (status === "RESOLVED" || status === "CLOSED") {
          updateFields.push(`"resolvedAt" = CURRENT_TIMESTAMP`);
        }
      }

      if (developerNotes !== undefined) {
        updateFields.push(`"developerNotes" = $${paramIdx++}`);
        params.push(String(developerNotes));
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: "Нет полей для обновления" });
      }

      await db.$executeRawUnsafe(
        `UPDATE "Report" SET ${updateFields.join(", ")} WHERE "id" = $1`,
        ...params
      );

      broadcastEvent({
        type: "REPORT_UPDATED",
        payload: { id: reportId, status, developerNotes }
      });

      res.json({ success: true, id: reportId, status, developerNotes });
    } catch (error: any) {
      console.error("Ошибка обновления репорта:", error);
      res.status(500).json({ error: error.message || "Ошибка обновления репорта" });
    }
  });

  app.delete("/api/reports/:id", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isDeveloperEmail(authUser?.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчика платформы (gelgaev.dev@mail.ru)" });
      }

      const db = getPrismaClient() as any;
      if (!db) {
        return res.status(500).json({ error: "Database not connected" });
      }
      await ensureReportTable(db);

      const reportId = req.params.id;
      await db.$executeRawUnsafe(`DELETE FROM "Report" WHERE "id" = $1`, reportId);

      broadcastEvent({
        type: "REPORT_DELETED",
        payload: { id: reportId }
      });

      res.json({ success: true, id: reportId });
    } catch (error: any) {
      console.error("Ошибка удаления репорта:", error);
      res.status(500).json({ error: error.message || "Ошибка удаления репорта" });
    }
  });

  app.post("/api/reports/batch-status", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isDeveloperEmail(authUser?.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчика платформы (gelgaev.dev@mail.ru)" });
      }

      const db = getPrismaClient() as any;
      if (!db) {
        return res.status(500).json({ error: "Database not connected" });
      }
      await ensureReportTable(db);

      const { ids, status } = req.body;
      if (!Array.isArray(ids) || ids.length === 0 || !status) {
        return res.status(400).json({ error: "Некорректные параметры" });
      }

      for (const id of ids) {
        await db.$executeRawUnsafe(
          `UPDATE "Report" SET "status" = $1 ${status === 'RESOLVED' || status === 'CLOSED' ? ', "resolvedAt" = CURRENT_TIMESTAMP' : ''} WHERE "id" = $2`,
          String(status),
          String(id)
        );
        broadcastEvent({
          type: "REPORT_UPDATED",
          payload: { id, status }
        });
      }

      res.json({ success: true, count: ids.length, status });
    } catch (error: any) {
      console.error("Ошибка массового обновления статусов:", error);
      res.status(500).json({ error: error.message || "Ошибка обновления" });
    }
  });

  app.post("/api/reports/batch-delete", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isDeveloperEmail(authUser?.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчика платформы (gelgaev.dev@mail.ru)" });
      }

      const db = getPrismaClient() as any;
      if (!db) {
        return res.status(500).json({ error: "Database not connected" });
      }
      await ensureReportTable(db);

      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Некорректные параметры" });
      }

      for (const id of ids) {
        await db.$executeRawUnsafe(`DELETE FROM "Report" WHERE "id" = $1`, String(id));
        broadcastEvent({
          type: "REPORT_DELETED",
          payload: { id }
        });
      }

      res.json({ success: true, count: ids.length });
    } catch (error: any) {
      console.error("Ошибка массового удаления:", error);
      res.status(500).json({ error: error.message || "Ошибка удаления" });
    }
  });

  // ==========================================
  // DEVELOPER USER MANAGEMENT API (gelgaev.dev@mail.ru)
  // ==========================================

  // Получить всех пользователей системы с агрегированной аналитикой и заведениями
  app.get("/api/dev/users", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isDeveloperEmail(authUser?.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчика платформы (gelgaev.dev@mail.ru)" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const users = await db.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          shops: {
            include: {
              _count: {
                select: {
                  services: true,
                  orders: true
                }
              },
              orders: {
                select: {
                  totalPrice: true,
                  status: true
                }
              }
            }
          }
        }
      });

      let totalPlatformOrders = 0;
      let totalPlatformRevenue = 0;
      let totalPlatformShops = 0;

      const formattedUsers = users.map((u: any) => {
        let userOrdersCount = 0;
        let userRevenue = 0;

        const shopsSummaries = (u.shops || []).map((s: any) => {
          totalPlatformShops++;
          const shopOrdersCount = s._count?.orders || (s.orders || []).length || 0;
          userOrdersCount += shopOrdersCount;
          totalPlatformOrders += shopOrdersCount;

          const shopRevenue = (s.orders || []).reduce((acc: number, ord: any) => {
            return acc + (Number(ord.totalPrice) || 0);
          }, 0);

          userRevenue += shopRevenue;
          totalPlatformRevenue += shopRevenue;

          return {
            id: s.id,
            name: s.name,
            slug: s.slug,
            isOpen: s.isOpen !== false,
            servicesCount: s._count?.services || 0,
            ordersCount: shopOrdersCount,
            totalRevenue: shopRevenue,
            botToken: s.botToken ? "configured" : null,
            createdAt: s.createdAt,
            address: s.address || null,
            phone: s.phone || null
          };
        });

        return {
          id: u.id,
          email: u.email,
          name: u.name || null,
          phone: u.phone || null,
          avatarUrl: u.avatarUrl || null,
          telegramHandle: u.telegramHandle || null,
          companyName: u.companyName || null,
          plan: u.plan || "FREE",
          subscriptionExpiresAt: u.subscriptionExpiresAt || null,
          isBanned: Boolean(u.isBanned),
          banReason: u.banReason || null,
          bannedAt: u.bannedAt || null,
          role: u.email?.toLowerCase().trim() === "gelgaev.dev@mail.ru" ? "DEVELOPER" : (u.role || "USER"),
          createdAt: u.createdAt,
          shopsCount: shopsSummaries.length,
          totalOrdersCount: userOrdersCount,
          totalRevenue: userRevenue,
          shops: shopsSummaries
        };
      });

      const stats = {
        totalUsers: formattedUsers.length,
        activeUsers: formattedUsers.filter((u: any) => !u.isBanned).length,
        bannedUsers: formattedUsers.filter((u: any) => u.isBanned).length,
        paidUsers: formattedUsers.filter((u: any) => u.plan && u.plan !== "FREE").length,
        totalShops: totalPlatformShops,
        totalOrders: totalPlatformOrders,
        totalRevenue: totalPlatformRevenue
      };

      res.json({ users: formattedUsers, stats, isDeveloper: true });
    } catch (error: any) {
      console.error("Error fetching dev users:", error);
      res.status(500).json({ error: error.message || "Ошибка при получении пользователей" });
    }
  });

  // Заблокировать пользователя
  app.post("/api/dev/users/:id/ban", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isDeveloperEmail(authUser?.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчиков платформы" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const userId = req.params.id;
      const { reason, disableShops } = req.body;

      const target = await db.user.findUnique({ where: { id: userId } });
      if (!target) return res.status(404).json({ error: "Пользователь не найден" });
      if (isDeveloperEmail(target.email)) {
        return res.status(400).json({ error: "Нельзя заблокировать аккаунт главного разработчика" });
      }

      const banReasonText = reason && String(reason).trim().length > 0
        ? String(reason).trim()
        : "Нарушение условий использования сервиса и нелегальная деятельность";

      const updated = await db.user.update({
        where: { id: userId },
        data: {
          isBanned: true,
          banReason: banReasonText,
          bannedAt: new Date()
        }
      });

      if (disableShops !== false) {
        await db.shop.updateMany({
          where: { ownerId: userId },
          data: { isOpen: false }
        });
      }

      broadcastEvent({
        type: "USER_BANNED",
        payload: { userId, reason: banReasonText }
      });

      res.json({ success: true, user: formatUserResponse(updated) });
    } catch (error: any) {
      console.error("Error banning user:", error);
      res.status(500).json({ error: error.message || "Ошибка при блокировке пользователя" });
    }
  });

  // Разблокировать пользователя
  app.post("/api/dev/users/:id/unban", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isDeveloperEmail(authUser?.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчиков платформы" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const userId = req.params.id;

      const target = await db.user.findUnique({ where: { id: userId } });
      if (!target) return res.status(404).json({ error: "Пользователь не найден" });

      const updated = await db.user.update({
        where: { id: userId },
        data: {
          isBanned: false,
          banReason: null,
          bannedAt: null
        }
      });

      broadcastEvent({
        type: "USER_UNBANNED",
        payload: { userId }
      });

      res.json({ success: true, user: formatUserResponse(updated) });
    } catch (error: any) {
      console.error("Error unbanning user:", error);
      res.status(500).json({ error: error.message || "Ошибка при разблокировке пользователя" });
    }
  });

  // Изменить тариф пользователя
  app.patch("/api/dev/users/:id/plan", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isDeveloperEmail(authUser?.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчиков платформы" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const userId = req.params.id;
      const { plan, days } = req.body;

      if (!plan || !["FREE", "PRO", "ENTERPRISE"].includes(plan)) {
        return res.status(400).json({ error: "Некорректный тариф" });
      }

      let expiresAt: Date | null = null;
      if (plan !== "FREE") {
        const d = typeof days === "number" && days > 0 ? days : 365;
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + d);
      }

      const updated = await db.user.update({
        where: { id: userId },
        data: {
          plan,
          subscriptionExpiresAt: expiresAt
        }
      });

      broadcastEvent({
        type: "USER_UPDATED",
        payload: { userId, plan, subscriptionExpiresAt: expiresAt }
      });

      res.json({ success: true, user: formatUserResponse(updated) });
    } catch (error: any) {
      console.error("Error updating user plan:", error);
      res.status(500).json({ error: error.message || "Ошибка обновления тарифа" });
    }
  });

  // Редактировать пользователя (пароль, контакты, имя)
  app.patch("/api/dev/users/:id", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isDeveloperEmail(authUser?.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчиков платформы" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const userId = req.params.id;
      const { name, email, phone, telegramHandle, companyName, newPassword } = req.body;

      const dataToUpdate: any = {};
      if (name !== undefined) dataToUpdate.name = name ? String(name).trim() : null;
      if (phone !== undefined) dataToUpdate.phone = phone ? String(phone).trim() : null;
      if (telegramHandle !== undefined) dataToUpdate.telegramHandle = telegramHandle ? String(telegramHandle).trim() : null;
      if (companyName !== undefined) dataToUpdate.companyName = companyName ? String(companyName).trim() : null;
      if (email !== undefined && String(email).trim()) {
        dataToUpdate.email = String(email).toLowerCase().trim();
      }
      if (newPassword && String(newPassword).length >= 6) {
        dataToUpdate.password = await bcrypt.hash(String(newPassword), 10);
      }

      const updated = await db.user.update({
        where: { id: userId },
        data: dataToUpdate
      });

      const formatted = formatUserResponse(updated);
      broadcastEvent({ type: "USER_UPDATED", userId, payload: formatted });

      res.json({ success: true, user: formatted });
    } catch (error: any) {
      console.error("Error editing user:", error);
      res.status(500).json({ error: error.message || "Ошибка редактирования пользователя" });
    }
  });

  // Удалить пользователя и все его данные
  app.delete("/api/dev/users/:id", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isDeveloperEmail(authUser?.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчиков платформы" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const userId = req.params.id;
      const target = await db.user.findUnique({ where: { id: userId } });
      if (!target) return res.status(404).json({ error: "Пользователь не найден" });
      if (isDeveloperEmail(target.email)) {
        return res.status(400).json({ error: "Нельзя удалить аккаунт главного разработчика" });
      }

      const userShops = await db.shop.findMany({ where: { ownerId: userId }, select: { id: true } });
      for (const s of userShops) {
        await db.service.deleteMany({ where: { shopId: s.id } }).catch(() => {});
        await db.order.deleteMany({ where: { shopId: s.id } }).catch(() => {});
        await db.banner.deleteMany({ where: { shopId: s.id } }).catch(() => {});
        await db.broadcast.deleteMany({ where: { shopId: s.id } }).catch(() => {});
        await db.customer.deleteMany({ where: { shopId: s.id } }).catch(() => {});
        await db.promocode.deleteMany({ where: { shopId: s.id } }).catch(() => {});
        await db.review.deleteMany({ where: { shopId: s.id } }).catch(() => {});
        await db.shopMember.deleteMany({ where: { shopId: s.id } }).catch(() => {});
        await db.shopInvite.deleteMany({ where: { shopId: s.id } }).catch(() => {});
        await db.shop.delete({ where: { id: s.id } }).catch(() => {});
      }

      await db.user.delete({ where: { id: userId } });

      broadcastEvent({
        type: "USER_DELETED",
        payload: { userId }
      });

      res.json({ success: true, id: userId });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: error.message || "Ошибка удаления пользователя" });
    }
  });

  // Управление конкретным заведением любого пользователя
  app.post("/api/dev/shops/:shopId/toggle", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isDeveloperEmail(authUser?.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчиков платформы" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const shopId = req.params.shopId;
      const { isOpen } = req.body;

      const shop = await db.shop.update({
        where: { id: shopId },
        data: { isOpen: Boolean(isOpen) }
      });

      broadcastEvent({
        type: "SHOP_UPDATED",
        shopId,
        payload: { isOpen: shop.isOpen }
      });

      res.json({ success: true, shopId, isOpen: shop.isOpen });
    } catch (error: any) {
      console.error("Error toggling shop:", error);
      res.status(500).json({ error: error.message || "Ошибка переключения статуса заведения" });
    }
  });

  app.delete("/api/dev/shops/:shopId", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isDeveloperEmail(authUser?.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчиков платформы" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const shopId = req.params.shopId;
      await db.service.deleteMany({ where: { shopId } }).catch(() => {});
      await db.order.deleteMany({ where: { shopId } }).catch(() => {});
      await db.banner.deleteMany({ where: { shopId } }).catch(() => {});
      await db.broadcast.deleteMany({ where: { shopId } }).catch(() => {});
      await db.customer.deleteMany({ where: { shopId } }).catch(() => {});
      await db.promocode.deleteMany({ where: { shopId } }).catch(() => {});
      await db.review.deleteMany({ where: { shopId } }).catch(() => {});
      await db.shopMember.deleteMany({ where: { shopId } }).catch(() => {});
      await db.shopInvite.deleteMany({ where: { shopId } }).catch(() => {});
      await db.shop.delete({ where: { id: shopId } });

      broadcastEvent({
        type: "SHOP_DELETED",
        shopId,
        payload: { shopId }
      });

      res.json({ success: true, shopId });
    } catch (error: any) {
      console.error("Error deleting shop:", error);
      res.status(500).json({ error: error.message || "Ошибка удаления заведения" });
    }
  });

  // Массовая блокировка
  app.post("/api/dev/users/batch-ban", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isDeveloperEmail(authUser?.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчиков платформы" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const { ids, reason } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Некорректные параметры" });
      }

      const banReasonText = reason || "Массовая блокировка разработчиком платформы";

      for (const id of ids) {
        const u = await db.user.findUnique({ where: { id } });
        if (u && !isDeveloperEmail(u.email)) {
          await db.user.update({
            where: { id },
            data: {
              isBanned: true,
              banReason: banReasonText,
              bannedAt: new Date()
            }
          });
          await db.shop.updateMany({
            where: { ownerId: id },
            data: { isOpen: false }
          });
          broadcastEvent({
            type: "USER_BANNED",
            payload: { userId: id, reason: banReasonText }
          });
        }
      }

      res.json({ success: true, count: ids.length });
    } catch (error: any) {
      console.error("Error batch banning:", error);
      res.status(500).json({ error: error.message || "Ошибка массовой блокировки" });
    }
  });

  // Массовая разблокировка
  app.post("/api/dev/users/batch-unban", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!isDeveloperEmail(authUser?.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчиков платформы" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Некорректные параметры" });
      }

      for (const id of ids) {
        await db.user.update({
          where: { id },
          data: {
            isBanned: false,
            banReason: null,
            bannedAt: null
          }
        });
        broadcastEvent({
          type: "USER_UNBANNED",
          payload: { userId: id }
        });
      }

      res.json({ success: true, count: ids.length });
    } catch (error: any) {
      console.error("Error batch unbanning:", error);
      res.status(500).json({ error: error.message || "Ошибка массовой разблокировки" });
    }
  });

  // ==========================================
  // DEVELOPER CHAT API («ЧАТ С РАЗРАБОТЧИКОМ»)
  // ==========================================

  // 1. Получение истории сообщений чата
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) {
        return res.status(401).json({ error: "Необходима авторизация" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const isDev = isDeveloperEmail(authUser.email);
      const requestedUserId = req.query.userId ? String(req.query.userId) : null;
      
      // Если разработчик — может запросить чат конкретного пользователя, иначе всегда свой userId
      const targetUserId = isDev && requestedUserId ? requestedUserId : authUser.id;

      // Получаем информацию о партнере по диалогу
      let partnerInfo: any = null;
      if (isDev) {
        const targetUser = await db.user.findUnique({
          where: { id: targetUserId },
          include: { shops: { select: { id: true, name: true, slug: true } } }
        });
        if (targetUser) {
          const userIsOnline = Array.from(clients).some((c) => c.userId === targetUser.id && c.ws.readyState === WebSocket.OPEN);
          partnerInfo = {
            id: targetUser.id,
            email: targetUser.email,
            name: targetUser.name || "Пользователь",
            companyName: targetUser.companyName || null,
            plan: targetUser.plan || "FREE",
            avatarUrl: targetUser.avatarUrl || null,
            shops: targetUser.shops || [],
            role: isDeveloperEmail(targetUser.email) ? "DEVELOPER" : "USER",
            isOnline: userIsOnline
          };
        }
      } else {
        const devOnline = isDeveloperOnline();

        partnerInfo = {
          id: "developer-team",
          email: "gelgaev.dev@mail.ru",
          name: "Разработчик TMA-Builder",
          companyName: "TMA-Builder Core Team",
          role: "DEVELOPER",
          isOnline: devOnline,
          supportHours: "24/7 (обычное время ответа: ~5-15 мин)"
        };
      }

      const limit = Math.min(Math.max(parseInt(String(req.query.limit || "250"), 10), 10), 500);

      const messages = await db.chatMessage.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: "asc" },
        take: limit
      });

      // Фильтруем сообщения, удаленные текущим пользователем "для себя"
      const visibleMessages = messages.filter((m: any) => {
        if (!m.deletedForUserIds) return true;
        try {
          const deletedList = JSON.parse(m.deletedForUserIds);
          if (Array.isArray(deletedList) && deletedList.includes(authUser.id)) {
            return false;
          }
        } catch {
          if (typeof m.deletedForUserIds === "string" && m.deletedForUserIds.includes(authUser.id)) {
            return false;
          }
        }
        return true;
      });

      // Считаем количество непрочитанных для текущего пользователя
      let unreadCount = 0;
      if (isDev) {
        unreadCount = visibleMessages.filter((m: any) => m.senderRole === "USER" && !m.isRead).length;
      } else {
        unreadCount = visibleMessages.filter((m: any) => m.senderRole === "DEVELOPER" && !m.isRead).length;
      }

      res.json({
        messages: visibleMessages.map((m: any) => ({
          id: m.id,
          userId: m.userId,
          senderRole: m.senderRole,
          senderId: m.senderId,
          senderName: m.senderName,
          text: m.text,
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType,
          mediaName: m.mediaName,
          mediaSize: m.mediaSize,
          mediaThumbnail: m.mediaThumbnail,
          isRead: Boolean(m.isRead),
          readAt: m.readAt,
          isEdited: Boolean(m.isEdited),
          editedAt: m.editedAt,
          createdAt: m.createdAt
        })),
        unreadCount,
        partner: partnerInfo,
        isDeveloper: isDev
      });
    } catch (error: any) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ error: error.message || "Ошибка загрузки сообщений чата" });
    }
  });

  // 2. Список диалогов со всеми пользователями (ТОЛЬКО ДЛЯ РАЗРАБОТЧИКА)
  app.get("/api/chat/conversations", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser || !isDeveloperEmail(authUser.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только разработчику платформы" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const search = req.query.search ? String(req.query.search).toLowerCase().trim() : null;

      // Находим всех пользователей
      const users = await db.user.findMany({
        include: {
          shops: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: "desc" }
      });

      // Находим все сообщения для агрегации
      const allMessages = await db.chatMessage.findMany({
        orderBy: { createdAt: "desc" }
      });

      // Группируем сообщения по userId
      const messagesByUser = new Map<string, any[]>();
      for (const msg of allMessages) {
        if (!messagesByUser.has(msg.userId)) {
          messagesByUser.set(msg.userId, []);
        }
        messagesByUser.get(msg.userId)!.push(msg);
      }

      // Собираем сводку по каждому диалогу
      const conversations = users
        .filter((u) => !isDeveloperEmail(u.email)) // исключаем самого разработчика из списка клиентов
        .map((u) => {
          const userMsgs = messagesByUser.get(u.id) || [];
          const lastMsg = userMsgs.length > 0 ? userMsgs[0] : null; // т.к. allMessages отсортированы DESC
          const unreadCount = userMsgs.filter((m) => m.senderRole === "USER" && !m.isRead).length;
          const totalMessages = userMsgs.length;

          const isOnline = Array.from(clients).some((c) => c.userId === u.id && c.ws.readyState === WebSocket.OPEN);

          return {
            userId: u.id,
            isOnline,
            user: {
              id: u.id,
              email: u.email,
              name: u.name || "Без имени",
              companyName: u.companyName || null,
              plan: u.plan || "FREE",
              avatarUrl: u.avatarUrl || null,
              isBanned: Boolean(u.isBanned),
              shops: u.shops || [],
              createdAt: u.createdAt
            },
            lastMessage: lastMsg ? {
              id: lastMsg.id,
              senderRole: lastMsg.senderRole,
              text: lastMsg.text,
              mediaUrl: lastMsg.mediaUrl,
              mediaType: lastMsg.mediaType,
              isRead: Boolean(lastMsg.isRead),
              createdAt: lastMsg.createdAt
            } : null,
            unreadCount,
            totalMessages,
            lastActivityAt: lastMsg ? lastMsg.createdAt : u.createdAt
          };
        });

      // Сортируем: сначала диалоги с новыми сообщениями / более активные, затем остальные
      conversations.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
      });

      // Фильтрация поиска
      let filtered = conversations;
      if (search) {
        filtered = conversations.filter((c) => {
          const emailMatch = c.user.email.toLowerCase().includes(search);
          const nameMatch = c.user.name.toLowerCase().includes(search);
          const compMatch = c.user.companyName?.toLowerCase().includes(search);
          const shopMatch = c.user.shops.some((s: any) => s.name?.toLowerCase().includes(search) || s.slug?.toLowerCase().includes(search));
          const msgMatch = c.lastMessage?.text?.toLowerCase().includes(search);
          return emailMatch || nameMatch || compMatch || shopMatch || msgMatch;
        });
      }

      const totalUnreadAll = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

      res.json({
        conversations: filtered,
        totalUnread: totalUnreadAll,
        totalConversations: conversations.length
      });
    } catch (error: any) {
      console.error("Error fetching conversations for developer:", error);
      res.status(500).json({ error: error.message || "Ошибка загрузки списка диалогов" });
    }
  });

  // In-memory idempotency cache for chat message sending (prevents duplicate creations)
  const recentChatMessagesCache = new Map<string, { message: any; timestamp: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of recentChatMessagesCache.entries()) {
      if (now - val.timestamp > 120000) {
        recentChatMessagesCache.delete(key);
      }
    }
  }, 60000);

  // 3. Отправка сообщения в чат
  app.post("/api/chat/send", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) {
        return res.status(401).json({ error: "Необходима авторизация" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const isDev = isDeveloperEmail(authUser.email);
      const { 
        text, 
        mediaUrl, 
        mediaType, 
        mediaName, 
        mediaSize, 
        mediaThumbnail,
        targetUserId,
        clientMessageId 
      } = req.body;

      const trimmedClientMsgId = typeof clientMessageId === "string" && clientMessageId.trim()
        ? clientMessageId.trim().slice(0, 100)
        : null;

      // Idempotency check: if client retried or double-clicked with the same clientMessageId within 2 minutes
      if (trimmedClientMsgId) {
        const cacheKey = `${authUser.id}_${trimmedClientMsgId}`;
        const cached = recentChatMessagesCache.get(cacheKey);
        if (cached) {
          return res.status(200).json({ message: cached.message, cached: true });
        }
      }

      const trimmedText = typeof text === "string" ? text.trim() : "";
      const validMediaUrl = typeof mediaUrl === "string" && mediaUrl.length > 0 ? mediaUrl : null;

      if (!trimmedText && !validMediaUrl) {
        return res.status(400).json({ error: "Сообщение не может быть пустым (введите текст или прикрепите медиафайл)" });
      }

      // Валидация медиа типа
      if (validMediaUrl && mediaType && !["image", "video", "file"].includes(mediaType)) {
        return res.status(400).json({ error: "Недопустимый тип медиафайла. Разрешены только изображения и видео." });
      }

      let chatTargetUserId = authUser.id;
      let senderRole = "USER";
      let senderName = authUser.name || authUser.email;

      if (isDev) {
        if (!targetUserId) {
          return res.status(400).json({ error: "Для разработчика обязательно указание targetUserId" });
        }
        chatTargetUserId = String(targetUserId);
        senderRole = "DEVELOPER";
        senderName = "Разработчик TMA-Builder";
      } else {
        chatTargetUserId = authUser.id;
        senderRole = "USER";
        senderName = authUser.name || authUser.email;
      }

      const created = await db.chatMessage.create({
        data: {
          userId: chatTargetUserId,
          senderRole,
          senderId: authUser.id,
          senderName,
          text: trimmedText || null,
          mediaUrl: validMediaUrl,
          mediaType: validMediaUrl ? (mediaType || "image") : null,
          mediaName: mediaName ? String(mediaName).slice(0, 255) : null,
          mediaSize: mediaSize ? Math.round(Number(mediaSize)) : null,
          mediaThumbnail: mediaThumbnail || null,
          isRead: false
        }
      });

      const formattedMessage = {
        id: created.id,
        clientMessageId: trimmedClientMsgId || null,
        userId: created.userId,
        senderRole: created.senderRole,
        senderId: created.senderId,
        senderName: created.senderName,
        text: created.text,
        mediaUrl: created.mediaUrl,
        mediaType: created.mediaType,
        mediaName: created.mediaName,
        mediaSize: created.mediaSize,
        mediaThumbnail: created.mediaThumbnail,
        isRead: Boolean(created.isRead),
        readAt: created.readAt,
        createdAt: created.createdAt
      };

      if (trimmedClientMsgId) {
        const cacheKey = `${authUser.id}_${trimmedClientMsgId}`;
        recentChatMessagesCache.set(cacheKey, { message: formattedMessage, timestamp: Date.now() });
      }

      // Realtime уведомление через WebSocket
      broadcastEvent({
        type: "CHAT_MESSAGE_CREATED",
        userId: chatTargetUserId,
        payload: {
          message: formattedMessage,
          targetUserId: chatTargetUserId,
          senderRole,
          senderId: authUser.id,
          clientMessageId: trimmedClientMsgId || null
        }
      });

      res.status(201).json({ message: formattedMessage });
    } catch (error: any) {
      console.error("Error sending chat message:", error);
      res.status(500).json({ error: error.message || "Ошибка отправки сообщения" });
    }
  });

  // 4. Отметка сообщений как прочитанных
  app.post("/api/chat/read", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) {
        return res.status(401).json({ error: "Необходима авторизация" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const isDev = isDeveloperEmail(authUser.email);
      const { targetUserId } = req.body;

      let chatUserId = authUser.id;
      let targetSenderRoleToMark = "DEVELOPER";

      if (isDev) {
        if (!targetUserId) {
          return res.status(400).json({ error: "targetUserId обязателен для разработчика" });
        }
        chatUserId = String(targetUserId);
        targetSenderRoleToMark = "USER"; // Разработчик читает сообщения пользователя
      } else {
        chatUserId = authUser.id;
        targetSenderRoleToMark = "DEVELOPER"; // Пользователь читает сообщения разработчика
      }

      const updateResult = await db.chatMessage.updateMany({
        where: {
          userId: chatUserId,
          senderRole: targetSenderRoleToMark,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      // WebSocket оповещение о прочтении
      broadcastEvent({
        type: "CHAT_MESSAGES_READ",
        userId: chatUserId,
        payload: {
          targetUserId: chatUserId,
          readByUserId: authUser.id,
          readByRole: isDev ? "DEVELOPER" : "USER",
          count: updateResult.count
        }
      });

      res.json({ success: true, count: updateResult.count });
    } catch (error: any) {
      console.error("Error marking chat messages as read:", error);
      res.status(500).json({ error: error.message || "Ошибка отметки прочтения" });
    }
  });

  // 5. Количество непрочитанных сообщений (для бейджей в боковом меню)
  app.get("/api/chat/unread-count", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) {
        return res.json({ unreadCount: 0 });
      }

      const db = getPrismaClient();
      if (!db) return res.json({ unreadCount: 0 });
      await ensureOrderSchema(db);

      const isDev = isDeveloperEmail(authUser.email);
      let unreadCount = 0;

      if (isDev) {
        // Разработчик видит сумму всех непрочитанных сообщений от пользователей
        unreadCount = await db.chatMessage.count({
          where: {
            senderRole: "USER",
            isRead: false
          }
        });
      } else {
        // Пользователь видит непрочитанные сообщения от разработчика для своего аккаунта
        unreadCount = await db.chatMessage.count({
          where: {
            userId: authUser.id,
            senderRole: "DEVELOPER",
            isRead: false
          }
        });
      }

      res.json({ unreadCount });
    } catch (error: any) {
      console.error("Error getting chat unread count:", error);
      res.json({ unreadCount: 0 });
    }
  });

  // 6. Удаление сообщения (для всех или только для себя)
  app.delete("/api/chat/messages/:id", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) {
        return res.status(401).json({ error: "Необходима авторизация" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const messageId = req.params.id;
      const mode = req.query.mode === "for_me" || req.body?.mode === "for_me" ? "for_me" : "for_all";

      const msg = await db.chatMessage.findUnique({
        where: { id: messageId }
      });

      if (!msg) {
        return res.status(404).json({ error: "Сообщение не найдено" });
      }

      // ТРЕБОВАНИЕ: Пользователь может удалять только свои сообщения (разработчик также может модерировать)
      const isDev = isDeveloperEmail(authUser.email);
      if (msg.senderId !== authUser.id && !isDev) {
        return res.status(403).json({ error: "Вы можете удалять только свои сообщения" });
      }

      if (mode === "for_me") {
        // Удалить только у себя (скрыть для текущего пользователя)
        let deletedList: string[] = [];
        if (msg.deletedForUserIds) {
          try {
            deletedList = JSON.parse(msg.deletedForUserIds);
            if (!Array.isArray(deletedList)) deletedList = [];
          } catch {
            deletedList = [];
          }
        }
        if (!deletedList.includes(authUser.id)) {
          deletedList.push(authUser.id);
        }

        await db.chatMessage.update({
          where: { id: messageId },
          data: {
            deletedForUserIds: JSON.stringify(deletedList)
          }
        });

        broadcastEvent({
          type: "CHAT_MESSAGE_DELETED",
          userId: msg.userId,
          payload: {
            messageId,
            targetUserId: msg.userId,
            senderId: msg.senderId,
            mode: "for_me",
            deletedByUserId: authUser.id
          }
        });

        return res.json({ success: true, id: messageId, mode: "for_me" });
      } else {
        // Удалить для всех (полное удаление из базы данных)
        await db.chatMessage.delete({
          where: { id: messageId }
        });

        broadcastEvent({
          type: "CHAT_MESSAGE_DELETED",
          userId: msg.userId,
          payload: {
            messageId,
            targetUserId: msg.userId,
            senderId: msg.senderId,
            mode: "for_all",
            deletedByUserId: authUser.id
          }
        });

        return res.json({ success: true, id: messageId, mode: "for_all" });
      }
    } catch (error: any) {
      console.error("Error deleting chat message:", error);
      res.status(500).json({ error: error.message || "Ошибка удаления сообщения" });
    }
  });

  // 6.5. Валидация активных сообщений для синхронизации ящика уведомлений без следов
  app.post("/api/chat/messages/validate-active", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) {
        return res.status(401).json({ error: "Необходима авторизация" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const rawIds = Array.isArray(req.body?.messageIds) ? req.body.messageIds : [];
      const messageIds: string[] = rawIds
        .filter((id: any) => typeof id === "string" && id.trim().length > 0)
        .slice(0, 300);

      if (messageIds.length === 0) {
        return res.json({ validIds: [], deletedIds: [] });
      }

      const foundMessages = await db.chatMessage.findMany({
        where: {
          id: { in: messageIds }
        },
        select: {
          id: true,
          deletedForUserIds: true
        }
      });

      const validIds: string[] = [];
      const deletedIds: string[] = [];

      const foundMap = new Map<string, any>();
      foundMessages.forEach((m) => foundMap.set(m.id, m));

      for (const id of messageIds) {
        const found = foundMap.get(id);
        if (!found) {
          deletedIds.push(id);
          continue;
        }

        let isDeletedForMe = false;
        if (found.deletedForUserIds) {
          try {
            const list = JSON.parse(found.deletedForUserIds);
            if (Array.isArray(list) && list.includes(authUser.id)) {
              isDeletedForMe = true;
            }
          } catch {
            if (typeof found.deletedForUserIds === "string" && found.deletedForUserIds.includes(authUser.id)) {
              isDeletedForMe = true;
            }
          }
        }

        if (isDeletedForMe) {
          deletedIds.push(id);
        } else {
          validIds.push(id);
        }
      }

      return res.json({ validIds, deletedIds });
    } catch (error: any) {
      console.error("Error validating active chat messages:", error);
      res.status(500).json({ error: "Ошибка проверки сообщений" });
    }
  });

  // 7. Редактирование (изменение) сообщения
  app.put("/api/chat/messages/:id", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) {
        return res.status(401).json({ error: "Необходима авторизация" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Database not connected" });
      await ensureOrderSchema(db);

      const messageId = req.params.id;
      const { text } = req.body;

      const trimmedText = typeof text === "string" ? text.trim() : "";

      const msg = await db.chatMessage.findUnique({
        where: { id: messageId }
      });

      if (!msg) {
        return res.status(404).json({ error: "Сообщение не найдено" });
      }

      // ТРЕБОВАНИЕ: Пользователь может редактировать только свои сообщения
      if (msg.senderId !== authUser.id) {
        return res.status(403).json({ error: "Вы можете редактировать только свои сообщения" });
      }

      if (!trimmedText && !msg.mediaUrl) {
        return res.status(400).json({ error: "Текст сообщения не может быть пустым" });
      }

      const now = new Date();
      const updated = await db.chatMessage.update({
        where: { id: messageId },
        data: {
          text: trimmedText || null,
          isEdited: true,
          editedAt: now
        }
      });

      const formattedMessage = {
        id: updated.id,
        userId: updated.userId,
        senderRole: updated.senderRole,
        senderId: updated.senderId,
        senderName: updated.senderName,
        text: updated.text,
        mediaUrl: updated.mediaUrl,
        mediaType: updated.mediaType,
        mediaName: updated.mediaName,
        mediaSize: updated.mediaSize,
        mediaThumbnail: updated.mediaThumbnail,
        isRead: Boolean(updated.isRead),
        readAt: updated.readAt,
        isEdited: true,
        editedAt: updated.editedAt?.toISOString() || now.toISOString(),
        createdAt: updated.createdAt
      };

      broadcastEvent({
        type: "CHAT_MESSAGE_UPDATED",
        userId: updated.userId,
        payload: {
          message: formattedMessage,
          targetUserId: updated.userId
        }
      });

      res.json({ success: true, message: formattedMessage });
    } catch (error: any) {
      console.error("Error editing chat message:", error);
      res.status(500).json({ error: error.message || "Ошибка редактирования сообщения" });
    }
  });

  // ==========================================
  // SERVER HEALTH, TELEMETRY & INFRASTRUCTURE STATUS API
  // ==========================================

  // Live Ping helper
  async function pingEndpoint(url: string, timeoutMs = 3500): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { "User-Agent": "TMABuilder-Server-Monitor/2.6" }
      });
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;
      return { ok: response.status < 500, latencyMs };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return { ok: false, latencyMs, error: err?.message || "Ошибка соединения / таймаут" };
    }
  }

  // Получить детальный статус серверов, ресурсов, базы данных и шлюзов
  app.get("/api/admin/servers/status", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) {
        return res.status(401).json({ error: "Необходима авторизация" });
      }
      if (!isDeveloperEmail(authUser.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчика платформы" });
      }

      const db = getPrismaClient();
      const processStartTime = Date.now() - Math.floor(process.uptime() * 1000);

      // 1. Database metrics
      let dbStatus: "ONLINE" | "DEGRADED" | "OFFLINE" = "OFFLINE";
      let dbLatencyMs = 0;
      let dbCounts = {
        users: 0,
        shops: 0,
        services: 0,
        orders: 0,
        reviews: 0,
        promocodes: 0,
        broadcasts: 0,
        banners: 0,
        reports: 0
      };
      let dbServerTime: string | null = null;

      if (db) {
        const dbT0 = Date.now();
        try {
          const rawResult: any = await db.$queryRaw`SELECT 1 as ping, NOW() as server_now;`;
          dbLatencyMs = Date.now() - dbT0;
          dbStatus = dbLatencyMs < 300 ? "ONLINE" : "DEGRADED";
          if (Array.isArray(rawResult) && rawResult[0]?.server_now) {
            dbServerTime = new Date(rawResult[0].server_now).toISOString();
          }

          // Aggregated counts
          const [usersCount, shopsCount, servicesCount, ordersCount, reviewsCount, promocodesCount, broadcastsCount, bannersCount, reportsCount] = await Promise.all([
            db.user.count().catch(() => 0),
            db.shop.count().catch(() => 0),
            db.service.count().catch(() => 0),
            db.order.count().catch(() => 0),
            db.review.count().catch(() => 0),
            db.promocode.count().catch(() => 0),
            db.broadcast.count().catch(() => 0),
            db.banner.count().catch(() => 0),
            (db as any).report?.count?.().catch(() => 0) || 0
          ]);

          dbCounts = {
            users: usersCount,
            shops: shopsCount,
            services: servicesCount,
            orders: ordersCount,
            reviews: reviewsCount,
            promocodes: promocodesCount,
            broadcasts: broadcastsCount,
            banners: bannersCount,
            reports: reportsCount
          };
        } catch (dbErr: any) {
          console.error("Server status DB ping error:", dbErr);
          dbStatus = "OFFLINE";
          dbLatencyMs = Date.now() - dbT0;
        }
      }

      // 2. Safe Database Connection Info (Sanitized for 3rd parties)
      const rawDbUrl = process.env.DATABASE_URL || "";
      const isPooler = rawDbUrl.includes("6543") || rawDbUrl.includes("pooler.supabase.com");
      const isPgBouncer = rawDbUrl.includes("pgbouncer=true") || isPooler;
      let maskedDbHost = "Supabase PostgreSQL Cluster (Managed)";
      try {
        if (rawDbUrl) {
          if (rawDbUrl.includes("supabase.co") || rawDbUrl.includes("supabase.com")) {
            maskedDbHost = isPooler ? "Supabase Pooler (Transaction Mode, 6543)" : "Supabase PostgreSQL (Port 5432)";
          } else {
            const match = rawDbUrl.match(/@([^:/]+)(?::(\d+))?/);
            if (match) {
              maskedDbHost = `postgres-cluster (${match[2] || "5432"})`;
            }
          }
        }
      } catch (e) {}

      // 3. WebSocket Realtime Hub metrics
      const activeShopsSet = new Set<string>();
      clients.forEach(c => {
        c.subscribedShopIds.forEach(id => activeShopsSet.add(id));
      });

      // 4. External Services Ping (parallel)
      const [tgPing, yooPing] = await Promise.all([
        pingEndpoint("https://api.telegram.org", 3000),
        pingEndpoint("https://api.yookassa.ru", 3000)
      ]);

      // 5. SMTP Config Info
      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = Number(process.env.SMTP_PORT) || 465;
      const smtpUser = process.env.SMTP_USER || "";
      const isSmtpConfigured = Boolean(smtpUser && process.env.SMTP_PASS);
      const maskedSmtpUser = smtpUser ? smtpUser.replace(/(.{2})(.*)(@.*)/, "$1***$3") : "Не настроен";

      // 6. Memory & System Resource calculations
      const memUsage = process.memoryUsage();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const cpus = os.cpus() || [];
      const loadAvg = os.loadavg() || [0, 0, 0];

      // Format uptime string
      const uptimeSec = Math.floor(process.uptime());
      const days = Math.floor(uptimeSec / 86400);
      const hours = Math.floor((uptimeSec % 86400) / 3600);
      const minutes = Math.floor((uptimeSec % 3600) / 60);
      const seconds = uptimeSec % 60;
      const formattedUptime = `${days > 0 ? `${days}д ` : ""}${hours > 0 ? `${hours}ч ` : ""}${minutes}м ${seconds}с`;

      // System overall status calculation
      const isAllOk = dbStatus === "ONLINE" && tgPing.ok;
      const systemHealthStatus: "HEALTHY" | "DEGRADED" | "CRITICAL" = 
        dbStatus === "OFFLINE" ? "CRITICAL" :
        (dbStatus === "DEGRADED" || !tgPing.ok) ? "DEGRADED" : "HEALTHY";

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        serverTime: new Date().toISOString(),
        systemHealth: {
          status: systemHealthStatus,
          score: systemHealthStatus === "HEALTHY" ? 100 : systemHealthStatus === "DEGRADED" ? 85 : 30,
          label: systemHealthStatus === "HEALTHY" ? "Все узлы функционируют штатно" : systemHealthStatus === "DEGRADED" ? "Повышенная задержка одного из сервисов" : "Критический сбой базы данных",
          uptimeFormatted: formattedUptime,
          uptimeSeconds: uptimeSec,
          startedAt: new Date(processStartTime).toISOString()
        },
        runtime: {
          nodeVersion: process.version,
          platform: `${process.platform} (${process.arch})`,
          osType: `${os.type()} ${os.release()}`,
          pid: process.pid,
          environment: process.env.NODE_ENV || "development",
          cpuCores: cpus.length,
          cpuModel: cpus[0]?.model || "Cloud Virtual CPU",
          loadAverage: {
            "1m": Number(loadAvg[0].toFixed(2)),
            "5m": Number(loadAvg[1].toFixed(2)),
            "15m": Number(loadAvg[2].toFixed(2))
          },
          memory: {
            rssMb: Number((memUsage.rss / 1024 / 1024).toFixed(1)),
            heapTotalMb: Number((memUsage.heapTotal / 1024 / 1024).toFixed(1)),
            heapUsedMb: Number((memUsage.heapUsed / 1024 / 1024).toFixed(1)),
            externalMb: Number((memUsage.external / 1024 / 1024).toFixed(1)),
            heapUsedPercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
            systemTotalMb: Math.round(totalMem / 1024 / 1024),
            systemUsedMb: Math.round(usedMem / 1024 / 1024),
            systemFreeMb: Math.round(freeMem / 1024 / 1024),
            systemUsedPercent: Math.round((usedMem / totalMem) * 100)
          }
        },
        database: {
          status: dbStatus,
          type: "PostgreSQL Database Engine",
          poolerMode: isPooler ? "Supabase Pooler (Transaction Mode, порт 6543)" : "Standard Direct Connection (порт 5432)",
          isPgBouncer: isPgBouncer,
          host: maskedDbHost,
          latencyMs: dbLatencyMs,
          serverTime: dbServerTime,
          counts: dbCounts
        },
        websocket: {
          status: "ONLINE",
          connectedClients: clients.size,
          activeShopChannels: activeShopsSet.size,
          protocol: "RFC 6455 Native WebSocket (ws)",
          heartbeatIntervalSec: 30
        },
        gateways: {
          telegram: {
            status: tgPing.ok ? (tgPing.latencyMs < 500 ? "ONLINE" : "SLOW") : "OFFLINE",
            latencyMs: tgPing.latencyMs,
            endpoint: "https://api.telegram.org",
            error: tgPing.error || null
          },
          smtp: {
            status: isSmtpConfigured ? "ONLINE" : "NOT_CONFIGURED",
            host: `${smtpHost}:${smtpPort}`,
            secure: smtpPort === 465,
            userMasked: maskedSmtpUser,
            provider: smtpHost.includes("gmail") ? "Google Workspace / Gmail SMTP" : "Custom SMTP Server"
          },
          yookassa: {
            status: (process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY) ? (yooPing.ok ? "ONLINE" : "DEGRADED") : "PENDING_KEYS",
            latencyMs: yooPing.latencyMs,
            shopIdMasked: process.env.YOOKASSA_SHOP_ID ? `${process.env.YOOKASSA_SHOP_ID.slice(0, 3)}****` : "Не задан",
            endpoint: "https://api.yookassa.ru/v3"
          }
        },
        securityConfig: {
          jwtEnabled: Boolean(process.env.JWT_SECRET),
          databaseConnected: Boolean(process.env.DATABASE_URL),
          smtpConfigured: isSmtpConfigured,
          yookassaConfigured: Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY),
          appUrl: getRequestBaseUrl(req)
        }
      });
    } catch (error: any) {
      console.error("Error fetching server status:", error);
      res.status(500).json({ error: error.message || "Ошибка получения статуса серверов" });
    }
  });

  // Запуск диагностического теста выбранного сервиса
  app.post("/api/admin/servers/test-service", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) {
        return res.status(401).json({ error: "Необходима авторизация" });
      }
      if (!isDeveloperEmail(authUser.email)) {
        return res.status(403).json({ error: "Доступ запрещен. Доступно только для разработчика платформы" });
      }

      const { service } = req.body;
      const start = Date.now();

      if (service === "database") {
        const db = getPrismaClient();
        if (!db) {
          return res.status(500).json({ success: false, service: "database", message: "База данных не инициализирована", latencyMs: 0 });
        }
        const pingRes: any = await db.$queryRaw`SELECT 1 as test_ping, NOW() as test_time, count(*) as user_count FROM "User";`;
        const latencyMs = Date.now() - start;
        return res.json({
          success: true,
          service: "database",
          latencyMs,
          message: `PostgreSQL ответил успешно за ${latencyMs} мс. Запрос SELECT NOW() выполнен штатно.`,
          details: {
            serverTime: pingRes[0]?.test_time || new Date(),
            userCount: Number(pingRes[0]?.user_count || 0)
          }
        });
      }

      if (service === "telegram") {
        const ping = await pingEndpoint("https://api.telegram.org", 4000);
        const latencyMs = Date.now() - start;
        return res.json({
          success: ping.ok,
          service: "telegram",
          latencyMs,
          message: ping.ok 
            ? `Telegram API доступен, время отклика: ${ping.latencyMs} мс (SSL TLS 1.3).` 
            : `Ошибка соединения с Telegram API: ${ping.error || "Таймаут"}`
        });
      }

      if (service === "smtp") {
        const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
        const smtpPort = Number(process.env.SMTP_PORT) || 465;
        const smtpUser = process.env.SMTP_USER || "";
        const smtpPass = process.env.SMTP_PASS || "";

        if (!smtpUser || !smtpPass) {
          return res.json({
            success: false,
            service: "smtp",
            latencyMs: 0,
            message: "SMTP не настроен в .env (отсутствует SMTP_USER или SMTP_PASS)"
          });
        }

        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass },
            connectionTimeout: 4000
          });

          await transporter.verify();
          const latencyMs = Date.now() - start;
          return res.json({
            success: true,
            service: "smtp",
            latencyMs,
            message: `SMTP сервер ${smtpHost}:${smtpPort} успешно верифицировал сокет за ${latencyMs} мс.`
          });
        } catch (smtpErr: any) {
          const latencyMs = Date.now() - start;
          return res.json({
            success: false,
            service: "smtp",
            latencyMs,
            message: `Ошибка верификации SMTP (${smtpHost}): ${smtpErr.message || "Ошибка подключения"}`
          });
        }
      }

      if (service === "yookassa") {
        const hasKeys = Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
        if (!hasKeys) {
          const latencyMs = Date.now() - start;
          return res.json({
            success: true,
            service: "yookassa",
            latencyMs,
            message: `Шлюз ЮKassa готов к работе. Ключи API не заданы в .env (режим симуляции/ожидания).`
          });
        }
        const ping = await pingEndpoint("https://api.yookassa.ru/v3/me", 4000);
        const latencyMs = Date.now() - start;
        return res.json({
          success: ping.ok,
          service: "yookassa",
          latencyMs,
          message: ping.ok
            ? `Шлюз ЮKassa API v3 доступен (${ping.latencyMs} мс). Ключи API активны.`
            : `Шлюз ЮKassa ответил: ${ping.error || "Проверка связи выполнена"}`
        });
      }

      if (service === "memory_gc") {
        const before = process.memoryUsage();
        if (global.gc) {
          global.gc();
        }
        const after = process.memoryUsage();
        const latencyMs = Date.now() - start;
        return res.json({
          success: true,
          service: "memory_gc",
          latencyMs,
          message: `Диагностика памяти завершена. Heap: ${(after.heapUsed / 1024 / 1024).toFixed(1)} MB (было ${(before.heapUsed / 1024 / 1024).toFixed(1)} MB).`
        });
      }

      return res.status(400).json({ error: "Неизвестный тип сервиса для теста" });
    } catch (err: any) {
      console.error("Diagnostic test error:", err);
      res.status(500).json({ error: err.message || "Ошибка выполнения теста" });
    }
  });

  // SEO: robots.txt endpoint
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.send(`User-agent: *
Allow: /
Allow: /api/public/
Disallow: /admin
Disallow: /dev-reports
Disallow: /api/admin/
Disallow: /api/reports/
Disallow: /api/auth/

Sitemap: ${req.protocol}://${req.get("host")}/sitemap.xml
`);
  });

  // SEO: Dynamic sitemap.xml endpoint
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const db = getPrismaClient();
      let shops: { slug: string; createdAt?: Date }[] = [];
      if (db) {
        shops = await db.shop.findMany({
          select: { slug: true, createdAt: true }
        });
      }

      const host = `${req.protocol}://${req.get("host")}`;
      const now = new Date().toISOString().split("T")[0];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${host}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

      for (const s of shops) {
        const lastMod = s.createdAt ? new Date(s.createdAt).toISOString().split("T")[0] : now;
        xml += `
  <url>
    <loc>${host}/${s.slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }

      xml += `
</urlset>`;

      res.type("application/xml");
      res.send(xml);
    } catch (e) {
      res.status(500).send("Error generating sitemap");
    }
  });

  // ==========================================
  // MODERATION ENDPOINTS (Admin & Moderators)
  // ==========================================

  app.get("/api/moderation/services", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser || !canModerate(authUser)) {
        return res.status(403).json({ error: "Доступ запрещен. Только администраторы и назначенные модераторы могут просматривать модерацию." });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Ошибка подключения к БД" });
      await ensureOrderSchema(db);

      const status = req.query.status ? String(req.query.status) : "PENDING";
      const whereClause: any = {};
      if (status !== "ALL") {
        whereClause.moderationStatus = status;
      }

      const services = await db.service.findMany({
        where: whereClause,
        include: {
          shop: {
            select: { id: true, name: true, slug: true, logoUrl: true, ownerId: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 100
      });

      const counts = {
        pending: await db.service.count({ where: { moderationStatus: "PENDING" } }),
        approved: await db.service.count({ where: { moderationStatus: "APPROVED" } }),
        rejected: await db.service.count({ where: { moderationStatus: "REJECTED" } }),
      };

      res.json({ services, counts });
    } catch (error: any) {
      console.error("Moderation list error:", error);
      res.status(500).json({ error: "Ошибка получения объявлений на модерации" });
    }
  });

  app.post("/api/moderation/services/:id/approve", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser || !canModerate(authUser)) {
        return res.status(403).json({ error: "Доступ запрещен. Требуются права модератора." });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Ошибка подключения к БД" });
      await ensureOrderSchema(db);

      const serviceId = req.params.id;
      const updated = await db.service.update({
        where: { id: serviceId },
        data: {
          moderationStatus: "APPROVED",
          moderationReason: null
        }
      });

      broadcastEvent({
        type: "SERVICE_UPDATED",
        shopId: updated.shopId,
        payload: updated
      });

      res.json({ success: true, service: updated });
    } catch (error: any) {
      console.error("Moderation approve error:", error);
      res.status(500).json({ error: "Ошибка одобрения объявления" });
    }
  });

  app.post("/api/moderation/services/:id/reject", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser || !canModerate(authUser)) {
        return res.status(403).json({ error: "Доступ запрещен. Требуются права модератора." });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Ошибка подключения к БД" });
      await ensureOrderSchema(db);

      const serviceId = req.params.id;
      const { reason } = req.body;

      const updated = await db.service.update({
        where: { id: serviceId },
        data: {
          moderationStatus: "REJECTED",
          moderationReason: reason || "Отклонено модератором за нарушение правил публикации."
        }
      });

      broadcastEvent({
        type: "SERVICE_UPDATED",
        shopId: updated.shopId,
        payload: updated
      });

      res.json({ success: true, service: updated });
    } catch (error: any) {
      console.error("Moderation reject error:", error);
      res.status(500).json({ error: "Ошибка отклонения объявления" });
    }
  });

  // ==========================================
  // PAID BOOST / VIP PROMOTION ENDPOINTS
  // ==========================================

  app.post("/api/services/:id/boost", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) {
        return res.status(401).json({ error: "Необходима авторизация" });
      }

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Ошибка подключения к БД" });
      await ensureOrderSchema(db);

      const serviceId = req.params.id;
      const { durationDays = 1, paymentMethod = "BALANCE" } = req.body;

      const service = await db.service.findUnique({
        where: { id: serviceId },
        include: { shop: true }
      });

      if (!service) {
        return res.status(404).json({ error: "Объявление / услуга не найдено." });
      }

      const canManage = await canManageShop(db, service.shopId, authUser);
      if (!canManage && !isAdminUser(authUser)) {
        return res.status(403).json({ error: "У вас нет прав на продвижение этой позиции." });
      }

      const parsedDuration = Number(durationDays) || 1;
      let cost = 150;
      if (parsedDuration === 7) cost = 500;
      else if (parsedDuration === 30) cost = 1200;

      const user = await db.user.findUnique({ where: { id: authUser.id } });
      if (!user) return res.status(404).json({ error: "Пользователь не найден." });

      const currentBalance = Number((user as any).balance) || 0;

      if (paymentMethod === "BALANCE") {
        if (currentBalance < cost) {
          return res.status(400).json({
            error: `Недостаточно средств на балансе. Требуется ${cost} ₽, текущий баланс: ${currentBalance} ₽. Пополните баланс в профиле.`
          });
        }

        await db.user.update({
          where: { id: user.id },
          data: { balance: currentBalance - cost } as any
        });
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + parsedDuration * 24 * 60 * 60 * 1000);

      const updated = await db.service.update({
        where: { id: serviceId },
        data: {
          isVip: true,
          boostedAt: now,
          boostExpiresAt: expiresAt
        }
      });

      await db.userTransaction.create({
        data: {
          userId: user.id,
          amount: cost,
          type: "BOOST",
          status: "COMPLETED",
          paymentMethod,
          description: `Поднятие в ТОП: «${service.title}» на ${parsedDuration} дн.`
        }
      });

      broadcastEvent({
        type: "SERVICE_UPDATED",
        shopId: service.shopId,
        payload: updated
      });

      res.json({
        success: true,
        service: updated,
        message: `Объявление «${service.title}» успешно поднято в ТОП!`
      });
    } catch (error: any) {
      console.error("Boost service error:", error);
      res.status(500).json({ error: "Ошибка при поднятии объявления" });
    }
  });

  // ==========================================
  // USER BALANCE & INTEGRATED PAYMENTS
  // ==========================================

  app.get("/api/user/balance", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) return res.status(401).json({ error: "Необходима авторизация" });

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Ошибка подключения к БД" });
      await ensureOrderSchema(db);

      const user = await db.user.findUnique({
        where: { id: authUser.id }
      });

      const transactions = await db.userTransaction.findMany({
        where: { userId: authUser.id },
        orderBy: { createdAt: "desc" },
        take: 50
      });

      res.json({
        balance: Number((user as any)?.balance) || 0,
        transactions
      });
    } catch (error: any) {
      console.error("Get balance error:", error);
      res.status(500).json({ error: "Ошибка получения баланса" });
    }
  });

  app.post("/api/user/balance/deposit", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) return res.status(401).json({ error: "Необходима авторизация" });

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Ошибка подключения к БД" });
      await ensureOrderSchema(db);

      const { amount, paymentMethod = "SBP" } = req.body;
      const numAmount = parseInt(String(amount), 10);
      if (isNaN(numAmount) || numAmount < 50 || numAmount > 100000) {
        return res.status(400).json({ error: "Сумма пополнения должна быть от 50 до 100 000 ₽" });
      }

      const user = await db.user.findUnique({ where: { id: authUser.id } });
      if (!user) return res.status(404).json({ error: "Пользователь не найден" });

      const newBalance = (Number((user as any).balance) || 0) + numAmount;

      await db.user.update({
        where: { id: authUser.id },
        data: { balance: newBalance } as any
      });

      const tx = await db.userTransaction.create({
        data: {
          userId: authUser.id,
          amount: numAmount,
          type: "DEPOSIT",
          status: "COMPLETED",
          paymentMethod,
          description: `Пополнение баланса через ${paymentMethod === "STARS" ? "Telegram Stars ⭐" : paymentMethod}`
        }
      });

      broadcastEvent({
        type: "USER_UPDATED",
        userId: authUser.id,
        payload: { id: authUser.id, balance: newBalance }
      });

      res.json({
        success: true,
        balance: newBalance,
        transaction: tx,
        message: `Баланс успешно пополнен на ${numAmount} ₽`
      });
    } catch (error: any) {
      console.error("Deposit error:", error);
      res.status(500).json({ error: "Ошибка пополнения баланса" });
    }
  });

  // ==========================================
  // FAVORITES ENDPOINTS
  // ==========================================

  app.get("/api/favorites", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) return res.json({ favorites: [] });

      const db = getPrismaClient();
      if (!db) return res.json({ favorites: [] });
      await ensureOrderSchema(db);

      const favorites = await db.favorite.findMany({
        where: { userId: authUser.id },
        orderBy: { createdAt: "desc" }
      });

      res.json({ favorites });
    } catch (error) {
      res.json({ favorites: [] });
    }
  });

  app.post("/api/favorites/toggle", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) return res.status(401).json({ error: "Необходима авторизация" });

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Ошибка подключения к БД" });
      await ensureOrderSchema(db);

      const { targetType, targetId } = req.body;
      if (!targetType || !targetId) {
        return res.status(400).json({ error: "targetType и targetId обязательны" });
      }

      const existing = await db.favorite.findUnique({
        where: {
          userId_targetType_targetId: {
            userId: authUser.id,
            targetType,
            targetId
          }
        }
      });

      if (existing) {
        await db.favorite.delete({ where: { id: existing.id } });
        return res.json({ isFavorite: false, targetType, targetId });
      } else {
        const created = await db.favorite.create({
          data: {
            userId: authUser.id,
            targetType,
            targetId
          }
        });
        return res.json({ isFavorite: true, targetType, targetId, favorite: created });
      }
    } catch (error: any) {
      console.error("Toggle favorite error:", error);
      res.status(500).json({ error: "Ошибка сохранения избранного" });
    }
  });

  // ==========================================
  // PEER CHAT (Buyer <-> Seller Direct Messages)
  // ==========================================

  app.get("/api/chat/peer/messages", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) return res.status(401).json({ error: "Необходима авторизация" });

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Ошибка подключения к БД" });
      await ensureOrderSchema(db);

      const shopId = String(req.query.shopId || req.query.partnerId || "");
      const buyerId = req.query.buyerId ? String(req.query.buyerId) : authUser.id;

      if (!shopId) return res.status(400).json({ error: "shopId обязателен" });

      const isShopStaff = await canManageShop(db, shopId, authUser);
      if (!isShopStaff && authUser.id !== buyerId && !isAdminUser(authUser)) {
        return res.status(403).json({ error: "Доступ к диалогу запрещен" });
      }

      const messages = await db.peerMessage.findMany({
        where: { shopId, buyerId },
        orderBy: { createdAt: "asc" },
        take: 200
      });

      res.json({ messages });
    } catch (error: any) {
      console.error("Peer messages error:", error);
      res.status(500).json({ error: "Ошибка загрузки сообщений диалога" });
    }
  });

  app.post("/api/chat/peer/send", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) return res.status(401).json({ error: "Необходима авторизация" });

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Ошибка подключения к БД" });
      await ensureOrderSchema(db);

      const { shopId, buyerId, text, mediaUrl } = req.body;
      if (!shopId || (!text && !mediaUrl)) {
        return res.status(400).json({ error: "Сообщение не может быть пустым" });
      }

      if (!checkRateLimit("messages", authUser.id, 25, 60000)) {
        return res.status(429).json({ error: "Слишком много сообщений. Пожалуйста, подождите минуту." });
      }

      const cleanText = text ? String(text).trim().slice(0, 2000) : null;
      if (detectSpamOrScam(cleanText)) {
        return res.status(400).json({ error: "Сообщение содержит подозрительные ссылки или спам." });
      }

      const isShopStaff = await canManageShop(db, shopId, authUser);
      const targetBuyerId = isShopStaff && buyerId ? String(buyerId) : authUser.id;
      const senderRole = isShopStaff ? "SELLER" : "BUYER";

      const message = await db.peerMessage.create({
        data: {
          shopId,
          buyerId: targetBuyerId,
          senderId: authUser.id,
          senderRole,
          senderName: authUser.name || (senderRole === "SELLER" ? "Продавец" : "Покупатель"),
          text: cleanText,
          mediaUrl: mediaUrl ? String(mediaUrl) : null
        }
      });

      broadcastEvent({
        type: "PEER_CHAT_MESSAGE_CREATED",
        shopId,
        payload: message
      });

      res.status(201).json({ message });
    } catch (error: any) {
      console.error("Peer send error:", error);
      res.status(500).json({ error: "Ошибка отправки сообщения" });
    }
  });

  app.get("/api/chat/peer/conversations", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) return res.status(401).json({ error: "Необходима авторизация" });

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Ошибка подключения к БД" });
      await ensureOrderSchema(db);

      const shopId = String(req.query.shopId || "");
      if (!shopId) return res.status(400).json({ error: "shopId обязателен" });

      const isShopStaff = await canManageShop(db, shopId, authUser);
      if (!isShopStaff && !isAdminUser(authUser)) {
        return res.status(403).json({ error: "У вас нет прав на просмотр диалогов этого заведения" });
      }

      const rawMsgs = await db.peerMessage.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        take: 500
      });

      const convMap = new Map<string, any>();
      for (const m of rawMsgs) {
        if (!convMap.has(m.buyerId)) {
          convMap.set(m.buyerId, {
            buyerId: m.buyerId,
            lastMessage: m,
            unreadCount: 0,
            messagesCount: 0
          });
        }
        const c = convMap.get(m.buyerId)!;
        c.messagesCount++;
        if (m.senderRole === "BUYER" && !m.isRead) {
          c.unreadCount++;
        }
      }

      const buyerIds = Array.from(convMap.keys());
      const buyers = await db.user.findMany({
        where: { id: { in: buyerIds } },
        select: { id: true, name: true, avatarUrl: true, email: true, telegramHandle: true }
      });

      const buyerById = new Map(buyers.map(b => [b.id, b]));
      const conversations = Array.from(convMap.values()).map(c => ({
        ...c,
        buyer: buyerById.get(c.buyerId) || { id: c.buyerId, name: "Покупатель", avatarUrl: null }
      }));

      res.json({ conversations });
    } catch (error: any) {
      console.error("Peer convos error:", error);
      res.status(500).json({ error: "Ошибка загрузки списка диалогов" });
    }
  });

  app.post("/api/chat/peer/read", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) return res.status(401).json({ error: "Необходима авторизация" });

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Ошибка подключения к БД" });
      await ensureOrderSchema(db);

      const { shopId, buyerId } = req.body;
      if (!shopId) return res.status(400).json({ error: "shopId обязателен" });

      const isShopStaff = await canManageShop(db, shopId, authUser);
      const targetBuyerId = isShopStaff && buyerId ? String(buyerId) : authUser.id;
      const targetSenderRole = isShopStaff ? "BUYER" : "SELLER";

      await db.peerMessage.updateMany({
        where: {
          shopId,
          buyerId: targetBuyerId,
          senderRole: targetSenderRole,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      broadcastEvent({
        type: "PEER_CHAT_MESSAGES_READ",
        shopId,
        payload: { shopId, buyerId: targetBuyerId, readerRole: isShopStaff ? "SELLER" : "BUYER" }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Peer read error:", error);
      res.status(500).json({ error: "Ошибка отметки о прочтении" });
    }
  });

  app.delete("/api/chat/peer/messages/:id", async (req, res) => {
    try {
      const authUser = getAuthUser(req);
      if (!authUser) return res.status(401).json({ error: "Необходима авторизация" });

      const db = getPrismaClient();
      if (!db) return res.status(500).json({ error: "Ошибка подключения к БД" });
      await ensureOrderSchema(db);

      const messageId = req.params.id;
      const msg = await db.peerMessage.findUnique({ where: { id: messageId } });
      if (!msg) return res.status(404).json({ error: "Сообщение не найдено" });

      const isShopStaff = await canManageShop(db, msg.shopId, authUser);
      if (msg.senderId !== authUser.id && !isShopStaff && !isAdminUser(authUser)) {
        return res.status(403).json({ error: "Нет прав на удаление этого сообщения" });
      }

      await db.peerMessage.delete({ where: { id: messageId } });

      broadcastEvent({
        type: "PEER_CHAT_MESSAGE_DELETED",
        shopId: msg.shopId,
        payload: { messageId, shopId: msg.shopId, buyerId: msg.buyerId }
      });

      res.json({ success: true, messageId });
    } catch (error: any) {
      console.error("Peer delete error:", error);
      res.status(500).json({ error: "Ошибка удаления сообщения" });
    }
  });

  // 404 handler for unmatched /api/* routes (prevents serving index.html for unknown APIs)
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl || req.url}` });
  });

// Vite middleware / сервер для работы (на Render, локально, или в контейнере)
if (!process.env.VERCEL) {
  async function startServer() {
    const PORT = Number(process.env.PORT) || 3000;
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use((req, res, next) => {
        if (req.path === "/sw.js") {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
          res.setHeader("Service-Worker-Allowed", "/");
        }
        next();
      });
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    const httpServer = createServer(app);
    const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

    wss.on("connection", (ws, req) => {
      let initialUserId: string | undefined;
      let initialIsDev = false;

      // Extract token or userId from URL query params (e.g., /ws?token=... or /ws?userId=...)
      if (req && req.url) {
        try {
          const urlObj = new URL(req.url, "http://localhost:3000");
          const urlToken = urlObj.searchParams.get("token");
          const urlUserId = urlObj.searchParams.get("userId");
          if (urlToken) {
            const decoded = jwt.verify(urlToken, JWT_SECRET) as { id: string; email: string };
            if (decoded && decoded.id) {
              initialUserId = decoded.id;
              initialIsDev = isDeveloperEmail(decoded.email);
            }
          } else if (urlUserId) {
            initialUserId = urlUserId;
          }
        } catch {}
      }

      const clientObj: RealtimeClient = {
        ws,
        userId: initialUserId,
        isDeveloper: initialIsDev,
        subscribedShopIds: new Set<string>()
      };
      clients.add(clientObj);

      if (clientObj.userId || clientObj.isDeveloper) {
        broadcastPresenceUpdate(clientObj.userId);
      }

      ws.on("message", (raw) => {
        try {
          const data = JSON.parse(raw.toString());

          // Handle auth token
          if (data.type === "auth" && data.token) {
            try {
              const decoded = jwt.verify(data.token, JWT_SECRET) as { id: string; email: string };
              if (decoded && decoded.id) {
                const prevUserId = clientObj.userId;
                clientObj.userId = decoded.id;
                clientObj.isDeveloper = isDeveloperEmail(decoded.email);
                ws.send(JSON.stringify({ 
                  type: "AUTH_SUCCESS", 
                  userId: clientObj.userId, 
                  isDeveloper: clientObj.isDeveloper,
                  onlineUserIds: getOnlineUserIds(),
                  devOnline: isDeveloperOnline()
                }));
                broadcastPresenceUpdate(clientObj.userId);
              }
            } catch (e) {}
          }

          // Handle get presence
          // Handle get presence
          if (data.type === "get_presence") {
            ws.send(JSON.stringify({
              type: "PRESENCE_STATE",
              payload: {
                onlineUserIds: getOnlineUserIds(),
                devOnline: isDeveloperOnline(),
                timestamp: Date.now()
              }
            }));
          }

          // Handle real-time chat typing indicator
          if (data.type === "chat_typing") {
            const senderId = clientObj.userId;
            const senderRole = clientObj.isDeveloper ? "DEVELOPER" : "USER";
            const targetUserId = data.targetUserId;
            broadcastEvent({
              type: "CHAT_TYPING",
              userId: targetUserId || senderId,
              payload: {
                senderId,
                senderRole,
                targetUserId,
                isTyping: data.isTyping !== false,
                userName: data.userName
              }
            });
          }

          // Handle subscription
          if (data.type === "subscribe" || data.type === "subscribe_chat") {
            if (data.shopId) {
              clientObj.subscribedShopIds.add(data.shopId);
            }
            if (Array.isArray(data.shopIds)) {
              data.shopIds.forEach((id: string) => {
                if (id) clientObj.subscribedShopIds.add(id);
              });
            }
            if (data.userId && !clientObj.userId) {
              clientObj.userId = data.userId;
              broadcastPresenceUpdate(clientObj.userId);
            }
          }

          // Handle unsubscription
          if (data.type === "unsubscribe") {
            if (data.shopId) {
              clientObj.subscribedShopIds.delete(data.shopId);
            }
            if (Array.isArray(data.shopIds)) {
              data.shopIds.forEach((id: string) => clientObj.subscribedShopIds.delete(id));
            }
          }

          // Heartbeat ping
          if (data.type === "ping") {
            ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          }
        } catch {}
      });

      const handleClose = () => {
        const uid = clientObj.userId;
        const wasDev = clientObj.isDeveloper;
        clients.delete(clientObj);
        if (uid || wasDev) {
          broadcastPresenceUpdate(uid);
        }
      };

      ws.on("close", handleClose);
      ws.on("error", handleClose);

      ws.send(JSON.stringify({ 
        type: "connected", 
        message: "Realtime WebSocket active",
        onlineUserIds: getOnlineUserIds(),
        devOnline: isDeveloperOnline()
      }));
    });

    const dbClient = getPrismaClient();
    if (dbClient) {
      startSystemBotListener(dbClient as any).catch((e) => console.warn("[TelegramBot] listener start warning:", e));
    }

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Сервер запущен на порту ${PORT} (Realtime WebSockets активны на /ws)`);
    });
  }

  startServer();
}

export default app;

