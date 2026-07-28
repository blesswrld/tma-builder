import "dotenv/config";
import express from "express";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { createServer as createViteServer } from "vite";

const prisma = new PrismaClient();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Получить список всех магазинов
  app.get("/api/shops", async (req, res) => {
    try {
      if (!process.env.DATABASE_URL) {
        return res.status(503).json({ error: "База данных PostgreSQL не настроена." });
      }

      const shops = await prisma.shop.findMany({
        include: {
          services: true,
          _count: {
            select: { orders: true }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      res.json(shops);
    } catch (error) {
      console.error("Ошибка при получении списка магазинов:", error);
      res.status(500).json({ error: "Не удалось получить список магазинов." });
    }
  });

  // API Route: Создать новый магазин
  app.post("/api/shops", async (req, res) => {
    try {
      if (!process.env.DATABASE_URL) {
        return res.status(503).json({ error: "База данных PostgreSQL не настроена." });
      }

      const { name, slug, description } = req.body;

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

      const existingShop = await prisma.shop.findUnique({
        where: { slug: formattedSlug }
      });

      if (existingShop) {
        return res.status(400).json({ error: "Магазин с таким URL (slug) уже существует." });
      }

      const newShop = await prisma.shop.create({
        data: {
          name: name.trim(),
          slug: formattedSlug,
          description: description?.trim() || null
        },
        include: {
          services: true,
          _count: {
            select: { orders: true }
          }
        }
      });

      res.status(201).json(newShop);
    } catch (error) {
      console.error("Ошибка при создании магазина:", error);
      res.status(500).json({ error: "Не удалось создать магазин." });
    }
  });

  // API Route: Удалить магазин
  app.delete("/api/shops/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!process.env.DATABASE_URL) {
        return res.status(503).json({ error: "База данных PostgreSQL не настроена." });
      }

      // Используем транзакцию для безопасного каскадного удаления всех зависимых сущностей
      await prisma.$transaction([
        prisma.service.deleteMany({ where: { shopId: id } }),
        prisma.order.deleteMany({ where: { shopId: id } }),
        prisma.shop.delete({ where: { id } })
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
      const { title, price, description } = req.body;

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

      const service = await prisma.service.create({
        data: {
          shopId,
          title: title.trim(),
          price: Math.round(parsedPrice),
          description: description?.trim() || null
        }
      });

      res.status(201).json(service);
    } catch (error) {
      console.error("Ошибка при добавлении услуги:", error);
      res.status(500).json({ error: "Не удалось добавить услугу." });
    }
  });

  // API Route: Удалить услугу
  app.delete("/api/services/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.service.delete({ where: { id } });
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

      const shop = await prisma.shop.findUnique({
        where: { slug: req.params.slug },
        include: { services: true },
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
      const { name, description, botToken, adminChatId } = req.body;
      
      const updatedShop = await prisma.shop.update({
        where: { id },
        data: {
          name,
          description,
          botToken,
          adminChatId
        },
        include: {
          services: true,
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

      const { shopId, customerName, customerPhone, items, totalPrice } = req.body;

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
      const shop = await prisma.shop.findUnique({
        where: { id: shopId }
      });

      // 1. Сохраняем в PostgreSQL
      const order = await prisma.order.create({
        data: {
          shopId,
          customerName,
          customerPhone,
          items: JSON.stringify(items),
          totalPrice,
        },
      });

      // 2. Отправляем уведомление в Telegram (если настроено)
      const botToken = shop?.botToken || process.env.TELEGRAM_BOT_TOKEN;
      const chatId = shop?.adminChatId || process.env.ADMIN_CHAT_ID;

      if (botToken && chatId) {
        const itemsList = items
          .map((i: any) => `• ${i.title} (x${i.quantity}): ${i.price * i.quantity} ₽`)
          .join("\n");
          
        const text = `🎉 *Новый заказ в магазине "${shop?.name || ''}"!*\n\n👤 *Имя:* ${customerName}\n📱 *Телефон:* ${customerPhone}\n\n🛒 *Корзина:*\n${itemsList}\n\n💰 *Итого:* ${totalPrice} ₽`;

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

  // Vite middleware для разработки
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // В продакшене отдаем собранную статику
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
