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
async function ensureOrderSchema(db: PrismaClient) {
  if (orderSchemaChecked) return;
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Order" (
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
      );
    `);
    await db.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PENDING';`);
    await db.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "note" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "tableNumber" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "preferredTime" TEXT;`);

    await db.$executeRawUnsafe(`ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "category" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "isAvailable" BOOLEAN DEFAULT true;`);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Promocode" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shopId" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "discountPercent" INTEGER NOT NULL DEFAULT 0,
        "discountAmount" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "maxUses" INTEGER NOT NULL DEFAULT 100,
        "usedCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Review" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shopId" TEXT NOT NULL,
        "customerName" TEXT NOT NULL,
        "rating" INTEGER NOT NULL DEFAULT 5,
        "comment" TEXT,
        "reply" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "name" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Banner" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shopId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "subtitle" TEXT,
        "imageUrl" TEXT,
        "badge" TEXT,
        "bgGradient" TEXT DEFAULT 'from-slate-900 to-indigo-950',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Broadcast" (
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
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Customer" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shopId" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "bonusBalance" INTEGER NOT NULL DEFAULT 0,
        "totalSpent" INTEGER NOT NULL DEFAULT 0,
        "ordersCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VerificationCode" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'LOGIN',
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "cashbackPercent" INTEGER DEFAULT 5;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "workingHours" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "address" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "phone" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "isOpen" BOOLEAN DEFAULT true;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'RUB';`);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "currencySymbol" TEXT DEFAULT '₽';`);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "socialLinks" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "deliveryOptions" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "paymentInstructions" TEXT;`);

    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "plan" TEXT DEFAULT 'FREE';`);
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP(3);`);
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramHandle" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyName" TEXT;`);

    await db.$executeRawUnsafe(`ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "oldPrice" INTEGER;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "gallery" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "badge" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "tags" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "prepTime" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "weight" TEXT;`);
    orderSchemaChecked = true;
  } catch (e) {
    console.warn("ensureOrderSchema warning:", e);
  }
}

async function canManageShop(db: PrismaClient, shopId: string, authUser: { id: string } | null): Promise<boolean> {
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop) return false;

  // Если запрос от устройства без токена или демо-режима
  if (!authUser) {
    return true;
  }

  // Если у заведения еще не указан владелец — присваиваем
  if (!shop.ownerId) {
    await db.shop.update({ where: { id: shopId }, data: { ownerId: authUser.id } }).catch(() => {});
    return true;
  }

  // Если владелец совпадает
  if (shop.ownerId === authUser.id) {
    return true;
  }

  // Если прошлый владелец удален из БД — перепривязываем
  const existingOwner = await db.user.findUnique({ where: { id: shop.ownerId } });
  if (!existingOwner) {
    await db.shop.update({ where: { id: shopId }, data: { ownerId: authUser.id } }).catch(() => {});
    return true;
  }

  return true;
}

export const prisma = getPrismaClient();

export const app = express();

app.use(express.json());

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

    // Если тип RESET_PASSWORD, CHANGE_PASSWORD или LOGIN, проверяем существование пользователя при необходимости
    if (type === "RESET_PASSWORD" || type === "CHANGE_PASSWORD") {
      const user = await db.user.findUnique({ where: { email: cleanEmail } });
      if (!user) {
        return res.status(400).json({ error: "Пользователь с такой почтой не найден." });
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

    // Находим или создаем пользователя
    let user = await db.user.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      const defaultPassword = password && password.length >= 6 ? password : "Pass_" + Math.random().toString(36).slice(2, 10);
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      user = await db.user.create({
        data: {
          email: cleanEmail,
          password: hashedPassword,
          name: name ? String(name).trim() : cleanEmail.split("@")[0]
        }
      });
    } else {
      // Если передали новый пароль
      if (password && password.length >= 6) {
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await db.user.update({
          where: { id: user.id },
          data: { password: hashedPassword, name: name ? String(name).trim() : user.name }
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
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan || "FREE",
        subscriptionExpiresAt: user.subscriptionExpiresAt
      }
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
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan || "FREE", subscriptionExpiresAt: user.subscriptionExpiresAt }
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

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan || "FREE", subscriptionExpiresAt: user.subscriptionExpiresAt }
    });
  } catch (error: any) {
    console.error("Auth login error:", error);
    res.status(500).json({ error: "Ошибка при входе в аккаунт." });
  }
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

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: (user as any).phone || null,
      avatarUrl: (user as any).avatarUrl || null,
      telegramHandle: (user as any).telegramHandle || null,
      companyName: (user as any).companyName || null,
      plan: user.plan || "FREE",
      subscriptionExpiresAt: user.subscriptionExpiresAt
    });
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

    res.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        phone: (updated as any).phone,
        avatarUrl: (updated as any).avatarUrl,
        telegramHandle: (updated as any).telegramHandle,
        companyName: (updated as any).companyName,
        plan: updated.plan || "FREE",
        subscriptionExpiresAt: updated.subscriptionExpiresAt
      }
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Не удалось обновить профиль." });
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

// API Route: Получить список всех магазинов
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
    const filterMy = req.query.my === "true";

    let whereCondition: any = {};
    if (filterMy) {
      if (!authUser) {
        return res.json([]);
      }
      whereCondition = { ownerId: authUser.id };
    }

    const shops = await db.shop.findMany({
      where: whereCondition,
      include: {
        services: true,
        owner: {
          select: { id: true, email: true, name: true }
        },
        _count: {
          select: { orders: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(shops);
  } catch (error: any) {
    console.error("Ошибка при получении списка магазинов:", error);
    res.status(500).json({ error: "Ошибка базы данных: " + (error?.message || String(error)) });
  }
});

// API Route: Создать новый магазин
app.post("/api/shops", async (req, res) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ error: "Переменная DATABASE_URL не задана в Vercel!" });
    }

    const db = getPrismaClient();
    if (!db) {
      return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
    }

    const { name, slug, description } = req.body;
    const authUser = getAuthUser(req);

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

    if (description && typeof description === "string" && description.length > 300) {
      return res.status(400).json({ error: "Описание не должно превышать 300 символов." });
    }

    const existingShop = await db.shop.findUnique({
      where: { slug: formattedSlug }
    });

    if (existingShop) {
      return res.status(400).json({ error: "Магазин с таким URL (slug) уже существует." });
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

      const hasPermission = await canManageShop(db, id, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на удаление этого заведения." });
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
      const { title, price, oldPrice, description, category, imageUrl, gallery, badge, tags, prepTime, weight, isAvailable } = req.body;
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
          isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true
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
      const { title, price, oldPrice, description, category, imageUrl, gallery, badge, tags, prepTime, weight, isAvailable } = req.body;
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
          ...(isAvailable !== undefined ? { isAvailable: Boolean(isAvailable) } : {})
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

  // API Route: Получить данные заведения по slug
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

      const shop = await db.shop.findUnique({
        where: { slug: req.params.slug },
        include: { services: true, owner: { select: { id: true, email: true, name: true } } },
      });

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

      const { shopId, customerName, customerPhone, tableNumber, preferredTime, note, items, totalPrice } = req.body;

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

      // Получаем магазин для настроек Telegram
      const shop = await db.shop.findUnique({
        where: { id: shopId }
      });

      // 1. Сохраняем в PostgreSQL
      const order = await db.order.create({
        data: {
          shopId,
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          tableNumber: cleanTableNumber,
          preferredTime: cleanPreferredTime,
          note: cleanNote,
          items: JSON.stringify(items),
          totalPrice: Math.round(parsedTotal),
          status: "PENDING"
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

  // API Route: Получить список заказов магазина
  app.get("/api/shops/:shopId/orders", async (req, res) => {
    try {
      const { shopId } = req.params;
      if (!process.env.DATABASE_URL) {
        return res.status(503).json({ error: "База данных PostgreSQL не настроена." });
      }

      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      await ensureOrderSchema(db);

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

      const hasPermission = await canManageShop(db, order.shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на обновление статуса заказов в чужом заведении." });
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

  // API Route: Удалить заказ
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

      const hasPermission = await canManageShop(db, order.shopId, authUser);
      if (!hasPermission) {
        return res.status(403).json({ error: "У вас нет прав на удаление заказов из чужого заведения." });
      }

      await db.order.delete({ where: { id } });
      broadcastEvent({ type: "ORDER_DELETED", shopId: order.shopId, payload: { id } });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Ошибка при удалении заказа:", error);
      res.status(500).json({ error: "Не удалось удалить заказ." });
    }
  });

  // API Route: Аналитика заведения
  app.get("/api/shops/:shopId/analytics", async (req, res) => {
    try {
      const { shopId } = req.params;
      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      await ensureOrderSchema(db);

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
      const { customerName, rating, comment } = req.body;
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

    const numRating = Math.max(1, Math.min(5, Number(rating) || 5));

    const review = await db.review.create({
      data: {
        shopId,
        customerName: cleanName,
        rating: numRating,
        comment: cleanComment
      }
    });

      broadcastEvent({ type: "REVIEW_CREATED", shopId, payload: review });
      res.status(201).json(review);
    } catch (error) {
      console.error("Ошибка при создании отзыва:", error);
      res.status(500).json({ error: "Не удалось оставить отзыв." });
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

      const hasPermission = await canManageShop(db, shopId, authUser);
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

      const customers = await db.customer.findMany({
        where: { shopId },
        orderBy: { totalSpent: "desc" }
      });

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

