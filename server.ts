import "dotenv/config";
import express from "express";
import path from "path";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { 
  validateShopName, validateSlug, validateCisPhone, 
  validateCustomerName, validateTelegramBotToken, validateTelegramChatId,
  validateEmail, validatePassword, validateItemTitle, validatePrice
} from "./src/lib/validation.js";

const JWT_SECRET = process.env.JWT_SECRET || "smart-menu-secret-key-2026";

const clients = new Set<{ ws: WebSocket; shopId?: string }>();

export function broadcastEvent(event: { type: string; shopId?: string; payload?: any }) {
  const message = JSON.stringify(event);
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (!event.shopId || !client.shopId || client.shopId === event.shopId) {
        try {
          client.ws.send(message);
        } catch (e) {
          console.error("Error broadcasting to WS client:", e);
        }
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

function isDeveloperEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return normalized === "gelgaev.dev@mail.ru" || normalized === "roninfortnite71@gmail.com";
}

function formatUserResponse(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name || null,
    phone: (user as any).phone || null,
    avatarUrl: (user as any).avatarUrl || null,
    telegramHandle: (user as any).telegramHandle || null,
    companyName: (user as any).companyName || null,
    plan: user.plan || "FREE",
    subscriptionExpiresAt: user.subscriptionExpiresAt || null,
    isBanned: Boolean((user as any).isBanned),
    banReason: (user as any).banReason || null,
    bannedAt: (user as any).bannedAt || null,
    role: isDeveloperEmail((user as any).email) ? "DEVELOPER" : ((user as any).role || "USER"),
    createdAt: (user as any).createdAt || null
  };
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
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "maxUses" INTEGER NOT NULL DEFAULT 100,
          "usedCount" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,

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
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "botToken" TEXT`,
        `ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "adminChatId" TEXT`,

        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "plan" TEXT DEFAULT 'FREE'`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP(3)`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramHandle" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyName" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN DEFAULT false`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banReason" TEXT`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP(3)`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'USER'`,

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
         ON CONFLICT ("code") DO NOTHING`
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

  const ownedWithRole = ownedShops.map(s => ({
    ...s,
    currentUserRole: "OWNER" as const
  }));

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

      extraShops = rawExtra.map(s => ({
        ...s,
        currentUserRole: memberRoleMap.get(s.id) || ("STAFF" as const)
      }));
    }
  }

  return [...ownedWithRole, ...extraShops];
}

export const prisma = getPrismaClient();

export const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Middleware: Rewrite /api/public/* to /api/*
app.use((req, res, next) => {
  if (req.url.startsWith("/api/public/")) {
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

    const { email, code, name, password } = req.body;

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
      const hashedPassword = await bcrypt.hash(String(password), 10);
      user = await db.user.create({
        data: {
          email: cleanEmail,
          password: hashedPassword,
          name: name ? String(name).trim() : cleanEmail.split("@")[0]
        }
      });
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

    const { email, password, name } = req.body;

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

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email: cleanEmail,
        password: hashedPassword,
        name: name ? String(name).trim() : null
      }
    });

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

app.get("/favicon.ico", (_req, res) => {
  res.status(204).end();
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

    const user = await db.user.findUnique({ where: { id: authUser.id } });
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден." });
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

    const { name, phone, avatarUrl, telegramHandle, companyName, currentPassword, newPassword, emailCode } = req.body;

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

    const updated = await db.user.update({
      where: { id: authUser.id },
      data: {
        name: name !== undefined ? (name ? String(name).trim() : null) : user.name,
        phone: phone !== undefined ? (phone ? String(phone).trim() : null) : (user as any).phone,
        avatarUrl: avatarUrl !== undefined ? (avatarUrl ? String(avatarUrl).trim() : null) : (user as any).avatarUrl,
        telegramHandle: telegramHandle !== undefined ? (telegramHandle ? String(telegramHandle).trim() : null) : (user as any).telegramHandle,
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
      const appBaseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || (req.headers.origin || "https://tma-builder.vercel.app");
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

    const newShop = await db.shop.create({
      data: {
        name: name.trim(),
        slug: formattedSlug,
        description: description?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        workingHours: workingHours?.trim() || null,
        currency: currency?.trim() || "RUB",
        currencySymbol: currencySymbol?.trim() || "₽",
        logoUrl: logoUrl?.trim() || null,
        bannerUrl: bannerUrl?.trim() || null,
        socialLinks: typeof socialLinks === "object" ? JSON.stringify(socialLinks) : (socialLinks || null),
        deliveryOptions: typeof deliveryOptions === "object" ? JSON.stringify(deliveryOptions) : (deliveryOptions || null),
        paymentInstructions: paymentInstructions?.trim() || null,
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
  app.get("/api/shops/:slug", async (req, res) => {
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
        paymentInstructions
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

      const updatedShop = await db.shop.update({
        where: { id },
        data: {
          name: name !== undefined ? String(name).trim() : shop.name,
          slug: updatedSlug,
          description: description !== undefined ? (description ? String(description).trim() : null) : shop.description,
          botToken: botToken !== undefined ? (botToken ? String(botToken).trim() : null) : shop.botToken,
          adminChatId: adminChatId !== undefined ? (adminChatId ? String(adminChatId).trim() : null) : shop.adminChatId,
          workingHours: workingHours !== undefined ? (workingHours ? String(workingHours).trim() : null) : shop.workingHours,
          address: address !== undefined ? (address ? String(address).trim() : null) : shop.address,
          phone: phone !== undefined ? (phone ? String(phone).trim() : null) : shop.phone,
          cashbackPercent: req.body.cashbackPercent !== undefined ? Number(req.body.cashbackPercent) : (shop.cashbackPercent || 5),
          isOpen: isOpen !== undefined ? Boolean(isOpen) : (shop.isOpen !== undefined ? shop.isOpen : true),
          logoUrl: logoUrl !== undefined ? (logoUrl ? String(logoUrl).trim() : null) : shop.logoUrl,
          bannerUrl: bannerUrl !== undefined ? (bannerUrl ? String(bannerUrl).trim() : null) : shop.bannerUrl,
          currency: currency !== undefined ? String(currency).trim() : (shop.currency || "RUB"),
          currencySymbol: currencySymbol !== undefined ? String(currencySymbol).trim() : (shop.currencySymbol || "₽"),
          socialLinks: socialLinks !== undefined ? (typeof socialLinks === "string" ? socialLinks : JSON.stringify(socialLinks)) : shop.socialLinks,
          deliveryOptions: deliveryOptions !== undefined ? (typeof deliveryOptions === "string" ? deliveryOptions : JSON.stringify(deliveryOptions)) : shop.deliveryOptions,
          paymentInstructions: paymentInstructions !== undefined ? (paymentInstructions ? String(paymentInstructions).trim() : null) : shop.paymentInstructions
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
  app.post("/api/orders", async (req, res) => {
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
      const botToken = shop?.botToken || process.env.TELEGRAM_BOT_TOKEN;
      const chatId = shop?.adminChatId || process.env.ADMIN_CHAT_ID;

      if (botToken && chatId) {
        const itemsList = items
          .map((i: any) => `• ${i.title} (x${i.quantity}): ${i.price * i.quantity} ₽`)
          .join("\n");

        let locationInfo = "";
        const methodLabel = cleanFulfillmentMethod === "courier" 
          ? "Курьер" 
          : cleanFulfillmentMethod === "shipping" 
          ? "Почта / СДЭК" 
          : cleanFulfillmentMethod === "online" 
          ? "Онлайн" 
          : "Самовывоз";
        locationInfo += `\n🚚 *Способ:* ${methodLabel}`;
        if (cleanDeliveryAddress) locationInfo += `\n📍 *Адрес / ПВЗ:* ${cleanDeliveryAddress}`;
        if (tableNumber) locationInfo += `\n🪑 *Столик:* ${tableNumber}`;
        if (preferredTime) locationInfo += `\n⏰ *Время:* ${preferredTime}`;
        if (note) locationInfo += `\n📝 *Комментарий:* ${note}`;
          
        const text = `🎉 *Новый заказ в "${shop?.name || ''}"!*\n\n👤 *Имя:* ${customerName}\n📱 *Телефон:* ${customerPhone}${locationInfo}\n\n🛒 *Заказ:*\n${itemsList}\n\n💰 *Итого:* ${totalPrice} ₽`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: "Markdown",
          }),
        }).catch((e) => console.error("Ошибка при отправке в Telegram:", e));
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
  app.get("/api/shops/:shopId/orders/my", async (req, res) => {
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
  app.get("/api/shops/:shopId/orders", async (req, res) => {
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

      res.json({
        summary: {
          totalOrders,
          completedOrders: completedOrders.length,
          totalRevenue,
          avgCheck
        },
        dailyTrends,
        topServices,
        hourlyDistribution
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
      const { code, discountPercent, discountAmount, maxUses } = req.body;
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
      if (cleanCode.length > 20) {
        return res.status(400).json({ error: "Длина промокода не должна превышать 20 символов." });
      }

      const numPercent = Math.max(0, Math.min(100, Number(discountPercent) || 0));
      const numAmount = Math.max(0, Math.min(100000, Number(discountAmount) || 0));
      const numMaxUses = Math.max(1, Math.min(100000, Number(maxUses) || 100));

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
          isActive: true
        }
      });

      broadcastEvent({ type: "PROMOCODE_CREATED", shopId, payload: promocode });
      res.status(201).json(promocode);
    } catch (error) {
      console.error("Ошибка при создании промокода:", error);
      res.status(500).json({ error: "Не удалось создать промокод." });
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

  // API Route: Валидация промокода для покупателя
  app.post("/api/promocodes/validate", async (req, res) => {
    try {
      const { shopId, code } = req.body;
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const cleanCode = (code || "").trim().toUpperCase();
      if (!cleanCode) {
        return res.status(400).json({ error: "Введите промокод." });
      }

      const promo = await db.promocode.findFirst({
        where: { shopId, code: cleanCode, isActive: true }
      });

      if (!promo) {
        return res.status(404).json({ error: "Промокод не найден или недействителен." });
      }

      if (promo.usedCount >= promo.maxUses) {
        return res.status(400).json({ error: "Превышен лимит использования этого промокода." });
      }

      res.json({
        valid: true,
        code: promo.code,
        discountPercent: promo.discountPercent,
        discountAmount: promo.discountAmount
      });
    } catch (error) {
      console.error("Ошибка при проверке промокода:", error);
      res.status(500).json({ error: "Не удалось проверить промокод." });
    }
  });

  // ==================== REVIEWS API ====================
  // API Route: Получить отзывы заведения
  app.get("/api/shops/:shopId/reviews", async (req, res) => {
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
  app.post("/api/shops/:shopId/reviews", async (req, res) => {
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
        const botToken = shop?.botToken || process.env.TELEGRAM_BOT_TOKEN;
        const chatId = shop?.adminChatId || process.env.ADMIN_CHAT_ID;

        if (botToken && chatId) {
          const stars = "⭐".repeat(numRating);
          const reviewText = `⭐ *Новый отзыв в заведении "${shop?.name || ''}"!*\n\n` +
            `👤 *Автор:* ${cleanName}\n` +
            `⭐ *Оценка:* ${stars} (${numRating}/5)\n` +
            (cleanComment ? `💬 *Отзыв:* ${cleanComment}\n` : "") +
            (cleanImageUrl ? `🖼️ *Фото в отзыве:* [Ссылка на фото](${cleanImageUrl})\n` : "");

          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: reviewText,
              parse_mode: "Markdown"
            })
          }).catch((e) => console.error("Ошибка отправки отзыва в Telegram:", e));
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
  app.get("/api/shops/:shopId/banners", async (req, res) => {
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
      const cleanImageUrl = imageUrl ? String(imageUrl).trim().slice(0, 1000) : null;

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
      const cleanImageUrl = imageUrl ? String(imageUrl).trim().slice(0, 1000) : null;

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

      // Если настроен Telegram Bot, отправляем уведомление в чат администратора
      const shop = await db.shop.findUnique({ where: { id: shopId } });
      const botToken = shop?.botToken || process.env.TELEGRAM_BOT_TOKEN;
      const chatId = shop?.adminChatId || process.env.ADMIN_CHAT_ID;

      if (botToken && chatId) {
        const text = `📣 *[РАССЫЛКА КЛИЕНТАМ]*\n\n📌 *${title}*\n${message}\n\n📊 *Получателей:* ${count}`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "Markdown"
          })
        }).catch(() => {});
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

  // API Route: Проверить валидность токена бота
  app.post("/api/shops/:shopId/telegram/test-bot", async (req, res) => {
    try {
      const { shopId } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) return res.status(403).json({ error: "У вас нет прав для работы с настройками заведения." });

      let botToken = req.body.botToken;
      if (!botToken) {
        const shop = await db.shop.findUnique({ where: { id: shopId } });
        botToken = shop?.botToken;
      }

      if (!botToken || !String(botToken).trim()) {
        return res.status(400).json({ error: "Укажите API Token вашего Telegram-бота." });
      }

      const cleanToken = String(botToken).trim();
      const tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      const tgData = await tgRes.json();

      if (!tgData.ok) {
        return res.status(400).json({ error: tgData.description || "Неверный токен Telegram-бота." });
      }

      res.json({ success: true, bot: tgData.result });
    } catch (error: any) {
      console.error("Ошибка проверки Telegram бота:", error);
      res.status(500).json({ error: error.message || "Ошибка при проверке токена бота." });
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
      const botToken = (req.body.botToken || shop?.botToken || "").trim();
      const adminChatId = (req.body.adminChatId || shop?.adminChatId || "").trim();

      if (!botToken) return res.status(400).json({ error: "Токен бота не указан." });
      if (!adminChatId) return res.status(400).json({ error: "Chat ID администратора не указан." });

      const text =
        `🎉 *Тестовое уведомление заведения «${shop?.name || 'Мини-магазин'}»!*\n\n` +
        `✅ Связь с вашим Telegram-ботом работает отлично.\n` +
        `📱 Теперь сюда в реальном времени будут приходить ваши заказы и отзывы клиентами.\n\n` +
        `⏰ _Отправлено: ${new Date().toLocaleString("ru-RU")}_`;

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: adminChatId,
          text,
          parse_mode: "Markdown"
        })
      });

      const tgData = await tgRes.json();
      if (!tgData.ok) {
        return res.status(400).json({ error: tgData.description || "Не удалось отправить тестовое сообщение в Telegram." });
      }

      res.json({ success: true, result: tgData.result });
    } catch (error: any) {
      console.error("Ошибка тестового уведомления Telegram:", error);
      res.status(500).json({ error: error.message || "Ошибка отправки тестового сообщения." });
    }
  });

  // API Route: Активировать/настроить Telegram Webhook
  app.post("/api/shops/:shopId/telegram/setup-webhook", async (req, res) => {
    try {
      const { shopId } = req.params;
      const authUser = getAuthUser(req);
      const db = getPrismaClient() as any;
      if (!db) return res.status(500).json({ error: "Не удалось инициализировать БД." });

      await ensureOrderSchema(db);

      const hasPermission = await canManageShop(db, shopId, authUser);
      if (!hasPermission) return res.status(403).json({ error: "У вас нет прав доступа." });

      const shop = await db.shop.findUnique({ where: { id: shopId } });
      const botToken = (req.body.botToken || shop?.botToken || "").trim();

      if (!botToken) return res.status(400).json({ error: "Укажите токен бота." });

      let clientBaseUrl = req.body.baseUrl || req.get("origin") || (req.get("referer") ? new URL(req.get("referer")).origin : "");
      if (!clientBaseUrl) {
        const host = req.get("host") || "";
        clientBaseUrl = `https://${host}`;
      }

      if (clientBaseUrl.includes("localhost") || clientBaseUrl.includes("127.0.0.1")) {
        return res.status(400).json({
          error: "Telegram Webhook требует публичный HTTPS-домен. В локальной среде (localhost) Telegram Webhook установить нельзя, однако отправка уведомлений о заказах будет работать штатно по Chat ID!"
        });
      }

      // Гарантируем протокол https:// для Telegram Webhook
      clientBaseUrl = clientBaseUrl.replace(/^http:/, "https:");
      const webhookUrl = `${clientBaseUrl}/api/telegram/webhook/${shopId}`;

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl })
      });

      const tgData = await tgRes.json();
      if (!tgData.ok) {
        return res.status(400).json({ error: tgData.description || "Telegram отклонил установку Webhook." });
      }

      // Если в запросе передали новый botToken, сразу сохраняем в базу
      if (req.body.botToken) {
        await db.shop.update({
          where: { id: shopId },
          data: { botToken }
        });
      }

      res.json({ success: true, webhookUrl, description: tgData.description });
    } catch (error: any) {
      console.error("Ошибка установки Webhook:", error);
      res.status(500).json({ error: error.message || "Ошибка при установке Webhook." });
    }
  });

  // Telegram Webhook Handler (Получает входящие апдейты от Telegram)
  app.all("/api/telegram/webhook/:shopId", async (req, res) => {
    try {
      const { shopId } = req.params;
      const update = req.body;
      const db = getPrismaClient() as any;

      if (!db || !update) return res.sendStatus(200);

      const shop = await db.shop.findUnique({ where: { id: shopId } });
      if (!shop || !shop.botToken) return res.sendStatus(200);

      const message = update.message || update.edited_message;
      if (message && message.chat && message.chat.id) {
        const chatId = String(message.chat.id);
        const text = (message.text || "").trim();
        const senderName = message.from?.first_name || message.from?.username || "Администратор";

        const host = req.get("host") || "";
        const protocol = host.includes("localhost") ? "http" : "https";
        const shopUrl = `${protocol}://${host}/${shop.slug}`;

        if (text.startsWith("/start")) {
          // Автоматически привязываем Chat ID
          await db.shop.update({
            where: { id: shopId },
            data: { adminChatId: chatId }
          });

          const replyText =
            `🎉 *Бот заведения «${shop.name}» успешно активирован!*\n\n` +
            `👤 *Владелец / Администратор:* ${senderName}\n` +
            `🆔 *Ваш Telegram Chat ID:* \`${chatId}\` (автоматически привязан!)\n\n` +
            `📱 Теперь в этот чат будут мгновенно поступать:\n` +
            `• Новые заказы покупателей с составом и суммой 🛒\n` +
            `• Новые отзывы и оценки клиентов ⭐\n\n` +
            `🌐 *Ваша витрина:* [Открыть магазин](${shopUrl})\n\n` +
            `💡 _Чтобы настроить кнопку Mini App внизу чата, перейдите в @BotFather -> /mybots -> Выберите этого бота -> Bot Settings -> Menu Button -> Configure menu button -> укажите URL:_\n\`${shopUrl}\``;

          await fetch(`https://api.telegram.org/bot${shop.botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: replyText,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [{ text: "🛍️ Открыть витрину магазина", web_app: { url: shopUrl } }]
                ]
              }
            })
          }).catch(() => {});
        } else if (text === "/orders" || text === "/status") {
          const pendingOrders = await db.order.count({
            where: { shopId, status: "PENDING" }
          });
          const totalOrders = await db.order.count({
            where: { shopId }
          });

          const replyText =
            `📊 *Статистика заведения «${shop.name}»*\n\n` +
            `⏳ *Заказов ожидает обработки:* ${pendingOrders}\n` +
            `📦 *Всего заказов за время:* ${totalOrders}\n\n` +
            `🌐 [Перейти в веб-панель управления](${protocol}://${host}/admin)`;

          await fetch(`https://api.telegram.org/bot${shop.botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: replyText,
              parse_mode: "Markdown"
            })
          }).catch(() => {});
        }
      }

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

      res.json({ success: true, user: formatUserResponse(updated) });
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

// Vite middleware / сервер для статической локальной работы (вне Vercel)
if (!process.env.VERCEL) {
  async function startServer() {
    const PORT = 3000;
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    const httpServer = createServer(app);
    const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

    wss.on("connection", (ws) => {
      const clientObj = { ws, shopId: undefined as string | undefined };
      clients.add(clientObj);

      ws.on("message", (raw) => {
        try {
          const data = JSON.parse(raw.toString());
          if (data.type === "subscribe" && data.shopId) {
            clientObj.shopId = data.shopId;
          }
          if (data.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
          }
        } catch {}
      });

      ws.on("close", () => {
        clients.delete(clientObj);
      });

      ws.on("error", () => {
        clients.delete(clientObj);
      });

      ws.send(JSON.stringify({ type: "connected", message: "Realtime WebSocket active" }));
    });

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Сервер запущен на порту ${PORT} (Realtime WebSockets активны на /ws)`);
    });
  }

  startServer();
}

export default app;

