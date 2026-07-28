import "dotenv/config";
import express from "express";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "smart-menu-secret-key-2026";

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

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaClient(): PrismaClient | null {
  try {
    if (globalForPrisma.prisma) return globalForPrisma.prisma;

    let dbUrl = process.env.DATABASE_URL || "";
    if (!dbUrl) return null;

    // Автоматическая настройка параметров для Supabase
    if (!dbUrl.includes("sslmode=")) {
      dbUrl += (dbUrl.includes("?") ? "&" : "?") + "sslmode=require";
    }
    // Если порт 6543 (Supabase Connection Pooler) или ссылка pooler, добавляем pgbouncer=true
    if ((dbUrl.includes(":6543") || dbUrl.includes("pooler.supabase.com")) && !dbUrl.includes("pgbouncer=")) {
      dbUrl += "&pgbouncer=true";
    }

    // Ограничиваем пул подключений до 3 штук, чтобы избежать превышения лимита pool_size=15
    if (!dbUrl.includes("connection_limit=")) {
      dbUrl += "&connection_limit=3";
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
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "name" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "workingHours" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "address" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "phone" TEXT;`);
    await db.$executeRawUnsafe(`ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "isOpen" BOOLEAN DEFAULT true;`);
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "plan" TEXT DEFAULT 'FREE';`);
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP(3);`);
    orderSchemaChecked = true;
  } catch (e) {
    console.warn("ensureOrderSchema warning:", e);
  }
}

async function canManageShop(db: PrismaClient, shopId: string, authUser: { id: string } | null): Promise<boolean> {
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop) return false;

  // Если у заведения не указан владельца
  if (!shop.ownerId) {
    if (authUser) {
      await db.shop.update({ where: { id: shopId }, data: { ownerId: authUser.id } }).catch(() => {});
    }
    return true;
  }

  // Если владелец совпадает с текущим пользователем
  if (authUser && shop.ownerId === authUser.id) {
    return true;
  }

  // Проверяем, существует ли указанный владелец в БД
  const existingOwner = await db.user.findUnique({ where: { id: shop.ownerId } });
  if (!existingOwner && authUser) {
    // Старый владелец удален из базы - перепривязываем на текущего пользователя
    await db.shop.update({ where: { id: shopId }, data: { ownerId: authUser.id } }).catch(() => {});
    return true;
  }

  return false;
}

export const prisma = getPrismaClient();

export const app = express();

app.use(express.json());

// Auth Route: Регистрация нового администратора
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

    const user = await db.user.findUnique({ where: { id: authUser.id } });
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден." });
    }

    res.json({ id: user.id, email: user.email, name: user.name, plan: user.plan || "FREE", subscriptionExpiresAt: user.subscriptionExpiresAt });
  } catch (error: any) {
    res.status(500).json({ error: "Ошибка получения профиля." });
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

    const formattedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");

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
      const { title, price, description, category } = req.body;
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

      const service = await db.service.create({
        data: {
          shopId,
          title: title.trim(),
          price: Math.round(parsedPrice),
          description: description?.trim() || null,
          category: category?.trim() || null
        }
      });

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
      const { title, price, description, category } = req.body;
      const authUser = getAuthUser(req);

      if (!title || typeof title !== "string" || title.trim().length < 2) {
        return res.status(400).json({ error: "Название услуги должно содержать минимум 2 символа." });
      }

      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ error: "Укажите корректную положительную цену (больше 0 ₽)." });
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

      const updatedService = await db.service.update({
        where: { id },
        data: {
          title: title.trim(),
          price: Math.round(parsedPrice),
          description: description?.trim() || null,
          category: category?.trim() || null
        }
      });

      res.json(updatedService);
    } catch (error) {
      console.error("Ошибка при обновлении услуги:", error);
      res.status(500).json({ error: "Не удалось обновить услугу." });
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
      const { name, description, botToken, adminChatId, workingHours, address, phone, isOpen } = req.body;
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

      const updatedShop = await db.shop.update({
        where: { id },
        data: {
          name: name !== undefined ? name : shop.name,
          description: description !== undefined ? description : shop.description,
          botToken: botToken !== undefined ? botToken : shop.botToken,
          adminChatId: adminChatId !== undefined ? adminChatId : shop.adminChatId,
          workingHours: workingHours !== undefined ? workingHours : (shop as any).workingHours,
          address: address !== undefined ? address : (shop as any).address,
          phone: phone !== undefined ? phone : (shop as any).phone,
          isOpen: isOpen !== undefined ? Boolean(isOpen) : ((shop as any).isOpen !== undefined ? (shop as any).isOpen : true)
        } as any,
        include: {
          services: true,
          owner: { select: { id: true, email: true, name: true } },
          _count: { select: { orders: true } }
        }
      });
      
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

      if (!customerName || typeof customerName !== "string" || customerName.trim().length < 2) {
        return res.status(400).json({ error: "Укажите корректное имя (минимум 2 символа)." });
      }

      if (customerName.trim().length > 60) {
        return res.status(400).json({ error: "Имя клиента слишком длинное (макс. 60 символов)." });
      }

      // Проверка номера телефона
      const cleanPhone = String(customerPhone || "").trim();
      const phoneRegex = /^[\+0-9\s\-\(\)]{7,20}$/;
      if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
        return res.status(400).json({ error: "Укажите действительный номер телефона (например, +7 (999) 000-00-00)." });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Корзина пуста. Выберите хотя бы одну услугу." });
      }

      const parsedTotal = Number(totalPrice);
      if (isNaN(parsedTotal) || parsedTotal <= 0) {
        return res.status(400).json({ error: "Некорректная итоговая сумма заказа." });
      }

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
          tableNumber: tableNumber ? String(tableNumber).trim() : null,
          preferredTime: preferredTime ? String(preferredTime).trim() : null,
          note: note ? String(note).trim() : null,
          items: JSON.stringify(items),
          totalPrice: Math.round(parsedTotal),
          status: "PENDING"
        },
      });

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

      res.status(201).json(order);
    } catch (error) {
      console.error("Ошибка при создании заказа:", error);
      res.status(500).json({ error: "Не удалось создать заказ." });
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

      const validStatuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Недопустимый статус заказа." });
      }

      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      await ensureOrderSchema(db);

      const updatedOrder = await db.order.update({
        where: { id },
        data: { status }
      });

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

      const db = getPrismaClient();
      if (!db) {
        return res.status(500).json({ error: "Не удалось инициализировать клиент базы данных." });
      }

      await ensureOrderSchema(db);

      await db.order.delete({ where: { id } });
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

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Сервер запущен на порту ${PORT}`);
    });
  }

  startServer();
}

export default app;
