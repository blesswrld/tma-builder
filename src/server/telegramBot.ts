import { PrismaClient } from "@prisma/client";
import { parseTelegramSettings, TelegramSettings, TelegramSubscriber, maskTelegramToken } from "../types.js";

// Global in-memory FSM state map: key = chatId, value = { state, data, expiresAt }
interface UserFSMState {
  state: "REPLY_REVIEW" | "SEARCH_ORDER" | "SEARCH_CUSTOMER" | "ADJUST_BONUS" | "IDLE";
  data: any;
  expiresAt: number;
}

const userStates = new Map<string, UserFSMState>();

function setUserState(chatId: string, state: UserFSMState["state"], data: any = {}) {
  userStates.set(chatId, {
    state,
    data,
    expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes TTL
  });
}

function getUserState(chatId: string): UserFSMState | null {
  const s = userStates.get(chatId);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    userStates.delete(chatId);
    return null;
  }
  return s;
}

function clearUserState(chatId: string) {
  userStates.delete(chatId);
}

// ==========================================
// TELEGRAM HTTP API CLIENT
// ==========================================

export async function getTelegramMe(botToken: string): Promise<{
  ok: boolean;
  result?: { id: number; is_bot: boolean; first_name: string; username: string; can_join_groups?: boolean };
  description?: string;
  error_code?: number;
}> {
  try {
    const cleanToken = botToken.trim();
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message || "Сетевая ошибка при запросе к Telegram API" };
  }
}

export async function getTelegramWebhookInfo(botToken: string): Promise<{
  ok: boolean;
  result?: {
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
    max_connections?: number;
  };
  description?: string;
}> {
  try {
    const cleanToken = botToken.trim();
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getWebhookInfo`);
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message || "Ошибка получения Webhook info" };
  }
}

export async function setTelegramWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken?: string
): Promise<{ ok: boolean; description?: string }> {
  try {
    const cleanToken = botToken.trim();
    const body: any = {
      url: webhookUrl,
      allowed_updates: ["message", "edited_message", "callback_query"]
    };
    if (secretToken) {
      body.secret_token = secretToken;
    }

    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message || "Ошибка установки Webhook" };
  }
}

export async function deleteTelegramWebhook(botToken: string): Promise<{ ok: boolean; description?: string }> {
  try {
    const cleanToken = botToken.trim();
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/deleteWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drop_pending_updates: false })
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message || "Ошибка удаления Webhook" };
  }
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  extra: {
    parse_mode?: "Markdown" | "HTML";
    reply_markup?: any;
    disable_web_page_preview?: boolean;
  } = {}
): Promise<{ ok: boolean; result?: any; description?: string }> {
  try {
    const cleanToken = botToken.trim();
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: extra.parse_mode !== undefined ? extra.parse_mode : "Markdown",
      reply_markup: extra.reply_markup,
      disable_web_page_preview: extra.disable_web_page_preview ?? true
    };

    let res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    let data = await res.json();

    // Fallback: if markdown parsing failed, retry as plain text so the message is always delivered!
    if (!data.ok && data.description && data.description.includes("can't parse entities")) {
      delete payload.parse_mode;
      res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      data = await res.json();
    }

    return data;
  } catch (err: any) {
    console.error("Telegram send error:", err);
    return { ok: false, description: err.message || "Ошибка отправки в Telegram" };
  }
}

export async function editTelegramMessage(
  botToken: string,
  chatId: string | number,
  messageId: number,
  text: string,
  extra: {
    parse_mode?: "Markdown" | "HTML";
    reply_markup?: any;
    disable_web_page_preview?: boolean;
  } = {}
): Promise<{ ok: boolean; result?: any; description?: string }> {
  try {
    const cleanToken = botToken.trim();
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: extra.parse_mode !== undefined ? extra.parse_mode : "Markdown",
      reply_markup: extra.reply_markup,
      disable_web_page_preview: extra.disable_web_page_preview ?? true
    };

    let res = await fetch(`https://api.telegram.org/bot${cleanToken}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    let data = await res.json();

    if (!data.ok && data.description && data.description.includes("can't parse entities")) {
      delete payload.parse_mode;
      res = await fetch(`https://api.telegram.org/bot${cleanToken}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      data = await res.json();
    }

    return data;
  } catch (err: any) {
    console.error("Telegram edit error:", err);
    return { ok: false, description: err.message || "Ошибка изменения сообщения в Telegram" };
  }
}

export async function answerTelegramCallback(
  botToken: string,
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<{ ok: boolean }> {
  try {
    const cleanToken = botToken.trim();
    await fetch(`https://api.telegram.org/bot${cleanToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert
      })
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ==========================================
// RBAC & ROLE CHECKING FOR TELEGRAM USERS
// ==========================================

export async function resolveTelegramUserRole(
  db: PrismaClient,
  shop: any,
  chatId: string,
  fromUser?: { id: number; username?: string; first_name?: string }
): Promise<{ role: "OWNER" | "ADMIN" | "STAFF" | "NONE"; subscriber?: TelegramSubscriber }> {
  const strChatId = String(chatId).trim();
  const settings = parseTelegramSettings(shop.telegramSettings);

  // 1. Primary shop owner chat ID
  if (shop.adminChatId && String(shop.adminChatId).trim() === strChatId) {
    return { role: "OWNER" };
  }

  // 2. Check in subscribers list
  const sub = settings.subscribers?.find(s => String(s.chatId).trim() === strChatId);
  if (sub) {
    return { role: sub.role, subscriber: sub };
  }

  // 3. Check if fromUser username matches shop owner or ShopMember
  if (fromUser?.username) {
    const handleClean = fromUser.username.replace(/^@/, "").toLowerCase();
    
    // Check Shop owner User
    if (shop.ownerId) {
      const ownerUser = await db.user.findUnique({ where: { id: shop.ownerId } });
      if (ownerUser?.telegramHandle && ownerUser.telegramHandle.replace(/^@/, "").toLowerCase() === handleClean) {
        return { role: "OWNER" };
      }
    }

    // Check ShopMember by telegram handle
    try {
      const members: any[] = await db.$queryRawUnsafe(
        `SELECT sm."role", u."telegramHandle" FROM "ShopMember" sm 
         JOIN "User" u ON sm."userId" = u."id" 
         WHERE sm."shopId" = $1 AND LOWER(REPLACE(u."telegramHandle", '@', '')) = $2 LIMIT 1;`,
        shop.id,
        handleClean
      );
      if (members && members.length > 0) {
        const rawRole = (members[0].role || "").toUpperCase();
        if (rawRole === "MANAGER" || rawRole === "ADMIN") return { role: "ADMIN" };
        return { role: "STAFF" };
      }
    } catch {
      // Ignore query errors
    }
  }

  return { role: "NONE" };
}

// ==========================================
// TELEGRAM UI BUILDERS & KEYBOARDS
// ==========================================

export function getPersistentReplyKeyboard(shop: any, role: "OWNER" | "ADMIN" | "STAFF" | "NONE", shopUrl: string) {
  if (role === "NONE") {
    return {
      keyboard: [
        [{ text: "🛍️ Открыть витрину (Mini App)", web_app: { url: shopUrl } }],
        [{ text: "ℹ️ О заведении" }, { text: "💬 Помощь" }]
      ],
      resize_keyboard: true,
      persistent: true
    };
  }

  if (role === "STAFF") {
    return {
      keyboard: [
        [{ text: "📦 Заказы" }, { text: "📋 Стоп-лист" }],
        [{ text: "🛍️ Открыть витрину", web_app: { url: shopUrl } }, { text: "🔄 Обновить" }]
      ],
      resize_keyboard: true,
      persistent: true
    };
  }

  // OWNER or ADMIN
  return {
    keyboard: [
      [{ text: "📦 Заказы" }, { text: "⭐ Отзывы" }],
      [{ text: "📊 Статистика" }, { text: "👥 Клиенты" }],
      [{ text: "📋 Стоп-лист" }, { text: "⚙️ Настройки" }],
      [{ text: "🛍️ Открыть витрину", web_app: { url: shopUrl } }, { text: "🔄 Обновить" }]
    ],
    resize_keyboard: true,
    persistent: true
  };
}

export function formatOrderStatusBadge(status: string): string {
  switch (status) {
    case "PENDING":
      return "🟡 Ожидает подтверждения";
    case "CONFIRMED":
      return "🔵 Подтверждён (Готовится)";
    case "IN_PROGRESS":
      return "🟠 В работе / У курьера";
    case "COMPLETED":
      return "🟢 Выполнен / Завершён";
    case "CANCELLED":
      return "🔴 Отменён";
    default:
      return status;
  }
}

export function getOrderCardText(order: any, shop: any): string {
  const shortId = (order.id || "").slice(-6).toUpperCase();
  const createdDate = order.createdAt ? new Date(order.createdAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "Только что";
  const statusBadge = formatOrderStatusBadge(order.status);

  let itemsList = "Состав заказа не указан";
  try {
    const parsed = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    if (Array.isArray(parsed) && parsed.length > 0) {
      itemsList = parsed
        .map((i: any) => `• *${i.title}* (x${i.quantity || 1}) — ${(i.price || 0) * (i.quantity || 1)} ${shop.currencySymbol || "₽"}${i.note ? `\n   ↳ _Примечание: ${i.note}_` : ""}`)
        .join("\n");
    }
  } catch {
    itemsList = String(order.items || "—");
  }

  let deliveryInfo = "";
  const methodLabel = order.fulfillmentMethod === "courier"
    ? "🛵 Доставка курьером"
    : order.fulfillmentMethod === "shipping"
    ? "📦 СДЭК / Почта"
    : order.fulfillmentMethod === "online"
    ? "🌐 Онлайн услуга"
    : "🛍️ Самовывоз из заведения";

  deliveryInfo += `\n🚚 *Способ:* ${methodLabel}`;
  if (order.deliveryAddress) deliveryInfo += `\n📍 *Адрес:* \`${order.deliveryAddress}\``;
  if (order.tableNumber) deliveryInfo += `\n🪑 *Столик / Место:* ${order.tableNumber}`;
  if (order.preferredTime) deliveryInfo += `\n⏰ *Желаемое время:* ${order.preferredTime}`;
  if (order.note) deliveryInfo += `\n📝 *Комментарий:* _${order.note}_`;

  return (
    `📦 *Заказ #${shortId}*\n` +
    `📅 ${createdDate} (МСК)\n` +
    `📊 *Статус:* ${statusBadge}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Клиент:* ${order.customerName || "Не указано"}\n` +
    `📱 *Телефон:* \`${order.customerPhone || "—"}\`` +
    `${deliveryInfo}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🛒 *Позиции:*\n${itemsList}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *Сумма к оплате:* *${order.totalPrice || 0} ${shop.currencySymbol || "₽"}*\n` +
    `💳 *Оплата:* При получении / Согласовано`
  );
}

export function getOrderInlineButtons(order: any, shop: any) {
  const buttons: any[][] = [];
  const status = order.status;

  if (status === "PENDING") {
    buttons.push([
      { text: "✅ Принять заказ", callback_data: `order:status:${order.id}:CONFIRMED` },
      { text: "❌ Отклонить", callback_data: `order:status:${order.id}:CANCELLED` }
    ]);
    buttons.push([
      { text: "👨‍🍳 Сразу в работу", callback_data: `order:status:${order.id}:IN_PROGRESS` }
    ]);
  } else if (status === "CONFIRMED") {
    buttons.push([
      { text: "👨‍🍳 Передать в работу", callback_data: `order:status:${order.id}:IN_PROGRESS` },
      { text: "🏁 Завершить (Выполнен)", callback_data: `order:status:${order.id}:COMPLETED` }
    ]);
    buttons.push([
      { text: "❌ Отменить заказ", callback_data: `order:status:${order.id}:CANCELLED` }
    ]);
  } else if (status === "IN_PROGRESS") {
    buttons.push([
      { text: "🏁 Завершить (Выполнен)", callback_data: `order:status:${order.id}:COMPLETED` },
      { text: "❌ Отменить заказ", callback_data: `order:status:${order.id}:CANCELLED` }
    ]);
  } else if (status === "COMPLETED" || status === "CANCELLED") {
    buttons.push([
      { text: "🔄 Вернуть в обработку", callback_data: `order:status:${order.id}:CONFIRMED` }
    ]);
  }

  // Quick contact button
  const phoneClean = (order.customerPhone || "").replace(/[^\d+]/g, "");
  const contactRow: any[] = [];
  if (phoneClean) {
    contactRow.push({ text: `📞 Позвонить`, url: `tel:${phoneClean}` });
  }
  contactRow.push({ text: "🔄 Обновить", callback_data: `order:view:${order.id}` });
  buttons.push(contactRow);

  buttons.push([
    { text: "📋 Список заказов", callback_data: "order:list:PENDING:0" },
    { text: "🏠 Главное меню", callback_data: "menu:main" }
  ]);

  return { inline_keyboard: buttons };
}

export function getReviewCardText(review: any, shop: any): string {
  const stars = "⭐".repeat(Math.max(1, Math.min(5, review.rating || 5)));
  const createdDate = review.createdAt ? new Date(review.createdAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "Только что";

  let text =
    `⭐ *Отзыв от ${review.customerName || "Покупателя"}*\n` +
    `📅 ${createdDate} (МСК)\n` +
    `⭐ *Оценка:* ${stars} (${review.rating}/5)\n` +
    `━━━━━━━━━━━━━━━━━━━\n`;

  if (review.comment) {
    text += `💬 *Текст:* "${review.comment}"\n`;
  } else {
    text += `💬 _Без текстового комментария_\n`;
  }

  if (review.imageUrl) {
    text += `🖼️ *Прикреплено фото:* [Посмотреть фото](${review.imageUrl})\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━\n`;
  if (review.reply) {
    text += `👑 *Ответ заведения:* "${review.reply}"\n`;
  } else {
    text += `⏳ *Ответ заведения:* _Ещё не предоставлен_\n`;
  }

  return text;
}

export function getReviewInlineButtons(review: any, role: "OWNER" | "ADMIN" | "STAFF" | "NONE") {
  const buttons: any[][] = [];

  if (role === "OWNER" || role === "ADMIN") {
    buttons.push([
      { text: review.reply ? "✏️ Изменить ответ" : "💬 Ответить на отзыв", callback_data: `review:reply:${review.id}` }
    ]);
  }

  if (role === "OWNER") {
    buttons.push([
      { text: "🗑️ Удалить отзыв", callback_data: `review:delete:${review.id}` }
    ]);
  }

  buttons.push([
    { text: "⭐ Список отзывов", callback_data: "review:list:ALL:0" },
    { text: "🏠 Главное меню", callback_data: "menu:main" }
  ]);

  return { inline_keyboard: buttons };
}

// ==========================================
// BUSINESS STATS CALCULATOR
// ==========================================

export async function getShopBusinessStats(db: PrismaClient, shopId: string, period: "today" | "week" | "month" | "all") {
  const now = new Date();
  let startDate = new Date(0);

  if (period === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "month") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const [orders, reviews, customersCount, servicesCount] = await Promise.all([
    db.order.findMany({
      where: {
        shopId,
        createdAt: { gte: startDate }
      }
    }),
    db.review.findMany({
      where: {
        shopId,
        createdAt: { gte: startDate }
      }
    }),
    db.customer.count({ where: { shopId } }),
    db.service.count({ where: { shopId, isAvailable: true } })
  ]);

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === "COMPLETED");
  const inProgressOrders = orders.filter(o => o.status === "CONFIRMED" || o.status === "IN_PROGRESS");
  const pendingOrders = orders.filter(o => o.status === "PENDING");
  const cancelledOrders = orders.filter(o => o.status === "CANCELLED");

  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const avgCheck = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;

  const totalRatingSum = reviews.reduce((sum, r) => sum + (r.rating || 5), 0);
  const avgRating = reviews.length > 0 ? (totalRatingSum / reviews.length).toFixed(1) : "5.0";

  return {
    period,
    totalOrders,
    completedCount: completedOrders.length,
    inProgressCount: inProgressOrders.length,
    pendingCount: pendingOrders.length,
    cancelledCount: cancelledOrders.length,
    totalRevenue,
    avgCheck,
    reviewsCount: reviews.length,
    avgRating,
    customersCount,
    servicesCount
  };
}

// ==========================================
// BROADCAST NOTIFICATION ENGINE
// ==========================================

export async function broadcastTelegramNotification(
  db: PrismaClient,
  shop: any,
  type: "NEW_ORDER" | "ORDER_STATUS" | "NEW_REVIEW" | "LOW_RATING" | "BROADCAST",
  payload: any
) {
  if (!shop.botToken) return;

  const settings = parseTelegramSettings(shop.telegramSettings);

  // Check notification preferences
  if (type === "NEW_ORDER" && settings.notifyOnNewOrder === false) return;
  if (type === "ORDER_STATUS" && settings.notifyOnOrderStatus === false) return;
  if (type === "NEW_REVIEW" && settings.notifyOnNewReview === false) return;
  if (type === "LOW_RATING" && settings.notifyOnLowRating === false) return;

  const targetChatIds = new Set<string>();

  // Primary shop admin chat ID
  if (shop.adminChatId && String(shop.adminChatId).trim()) {
    targetChatIds.add(String(shop.adminChatId).trim());
  }

  // Subscribers
  if (Array.isArray(settings.subscribers)) {
    for (const sub of settings.subscribers) {
      if (!sub.chatId) continue;
      if (type === "NEW_ORDER" || type === "ORDER_STATUS" || type === "BROADCAST") {
        if (sub.notifyOrders !== false) targetChatIds.add(String(sub.chatId).trim());
      } else if (type === "NEW_REVIEW" || type === "LOW_RATING") {
        if (sub.notifyReviews !== false) targetChatIds.add(String(sub.chatId).trim());
      }
    }
  }

  if (targetChatIds.size === 0) return;

  let text = "";
  let reply_markup: any = undefined;

  if (type === "NEW_ORDER") {
    text = `🎉 *НОВЫЙ ЗАКАЗ В «${shop.name}»!*\n\n` + getOrderCardText(payload, shop);
    reply_markup = getOrderInlineButtons(payload, shop);
  } else if (type === "ORDER_STATUS") {
    const shortId = (payload.id || "").slice(-6).toUpperCase();
    const statusBadge = formatOrderStatusBadge(payload.status);
    text = `🔔 *Обновление статуса заказа #${shortId}*\n\n📊 *Новый статус:* ${statusBadge}\n👤 *Клиент:* ${payload.customerName}\n💰 *Сумма:* ${payload.totalPrice} ${shop.currencySymbol || "₽"}`;
    reply_markup = getOrderInlineButtons(payload, shop);
  } else if (type === "NEW_REVIEW" || type === "LOW_RATING") {
    const isLow = payload.rating && payload.rating <= 2;
    text = `${isLow ? "⚠️ *ВНИМАНИЕ: НИЗКАЯ ОЦЕНКА!*" : "⭐ *НОВЫЙ ОТЗЫВ!*"} в заведении «${shop.name}»\n\n` + getReviewCardText(payload, shop);
    reply_markup = getReviewInlineButtons(payload, "ADMIN");
  } else if (type === "BROADCAST") {
    text = payload.text || `📣 *[РАССЫЛКА КЛИЕНТАМ]*\n\n📌 *${payload.title}*\n${payload.message}\n\n📊 *Получателей:* ${payload.count || 0}`;
  }

  // Dispatch to all targets in parallel with catch handlers
  await Promise.all(
    Array.from(targetChatIds).map(chatId =>
      sendTelegramMessage(shop.botToken, chatId, text, {
        parse_mode: "Markdown",
        reply_markup
      }).catch(err => {
        console.error(`Failed to send telegram notification to ${chatId}:`, err);
      })
    )
  );
}

// ==========================================
// TELEGRAM WEBHOOK INCOMING UPDATE HANDLER
// ==========================================

export async function handleTelegramWebhookUpdate(
  db: PrismaClient,
  shopId: string,
  update: any,
  originUrl: string,
  broadcastWSEvent: (evt: any) => void
) {
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop || !shop.botToken) return;

  const botToken = shop.botToken;
  const hostUrl = originUrl.replace(/\/$/, "");
  const shopUrl = `${hostUrl}/${shop.slug}`;

  // -------------------------------------------------------------
  // 1. HANDLE CALLBACK QUERY (Inline buttons clicks)
  // -------------------------------------------------------------
  if (update.callback_query) {
    const cq = update.callback_query;
    const cqId = cq.id;
    const chatId = String(cq.message?.chat?.id || cq.from?.id);
    const messageId = cq.message?.message_id;
    const data = cq.data || "";

    const userAuth = await resolveTelegramUserRole(db, shop, chatId, cq.from);
    const role = userAuth.role;

    if (role === "NONE") {
      await answerTelegramCallback(botToken, cqId, "❌ У вас нет прав администратора в этом заведении", true);
      return;
    }

    const parts = data.split(":");
    const domain = parts[0];
    const action = parts[1];

    // ROUTE: ORDER ACTIONS
    if (domain === "order") {
      if (action === "view") {
        const orderId = parts[2];
        const order = await db.order.findUnique({ where: { id: orderId } });
        if (!order || order.shopId !== shop.id) {
          await answerTelegramCallback(botToken, cqId, "❌ Заказ не найден или был удалён", true);
          return;
        }
        await answerTelegramCallback(botToken, cqId, "✅ Карточка заказа обновлена");
        const cardText = getOrderCardText(order, shop);
        const cardButtons = getOrderInlineButtons(order, shop);
        if (messageId) {
          await editTelegramMessage(botToken, chatId, messageId, cardText, {
            parse_mode: "Markdown",
            reply_markup: cardButtons
          });
        }
        return;
      }

      if (action === "status") {
        const orderId = parts[2];
        const newStatus = parts[3];
        const validStatuses = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
        if (!validStatuses.includes(newStatus)) {
          await answerTelegramCallback(botToken, cqId, "Недопустимый статус", true);
          return;
        }

        const existingOrder = await db.order.findUnique({ where: { id: orderId } });
        if (!existingOrder || existingOrder.shopId !== shop.id) {
          await answerTelegramCallback(botToken, cqId, "❌ Заказ не найден", true);
          return;
        }

        if (existingOrder.status === newStatus) {
          await answerTelegramCallback(botToken, cqId, `Статус уже "${formatOrderStatusBadge(newStatus)}"`);
          return;
        }

        const updatedOrder = await db.order.update({
          where: { id: orderId },
          data: { status: newStatus }
        });

        // Broadcast to WebSocket clients
        broadcastWSEvent({
          type: "ORDER_STATUS_UPDATED",
          shopId: shop.id,
          payload: updatedOrder
        });

        await answerTelegramCallback(botToken, cqId, `✅ Статус изменён: ${formatOrderStatusBadge(newStatus)}`, false);

        // Edit Telegram message in-place
        const cardText = getOrderCardText(updatedOrder, shop);
        const cardButtons = getOrderInlineButtons(updatedOrder, shop);
        if (messageId) {
          await editTelegramMessage(botToken, chatId, messageId, cardText, {
            parse_mode: "Markdown",
            reply_markup: cardButtons
          });
        }
        return;
      }

      if (action === "list") {
        const filter = parts[2] || "PENDING"; // PENDING, ACTIVE, COMPLETED, ALL
        const page = parseInt(parts[3] || "0", 10);
        const pageSize = 5;

        let whereClause: any = { shopId: shop.id };
        if (filter === "PENDING") {
          whereClause.status = "PENDING";
        } else if (filter === "ACTIVE") {
          whereClause.status = { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] };
        } else if (filter === "COMPLETED") {
          whereClause.status = "COMPLETED";
        }

        const [ordersList, totalCount] = await Promise.all([
          db.order.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            skip: page * pageSize,
            take: pageSize
          }),
          db.order.count({ where: whereClause })
        ]);

        await answerTelegramCallback(botToken, cqId);

        let listText = `📦 *Список заказов (${filter === "PENDING" ? "Ожидающие" : filter === "ACTIVE" ? "Активные" : "Все"})*\nВсего: ${totalCount}\n━━━━━━━━━━━━━━━━━━━\n`;

        if (ordersList.length === 0) {
          listText += `_Нет заказов по данному фильтру._`;
        } else {
          ordersList.forEach((o, idx) => {
            const shortId = o.id.slice(-6).toUpperCase();
            const timeStr = new Date(o.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
            listText += `${idx + 1 + page * pageSize}. *#${shortId}* — ${o.customerName} (${o.totalPrice} ${shop.currencySymbol || "₽"})\n` +
              `   ↳ ${formatOrderStatusBadge(o.status)} • _${timeStr}_\n`;
          });
        }

        const buttons: any[][] = [];

        // Single order open buttons
        const orderBtnsRow: any[] = [];
        ordersList.slice(0, 5).forEach((o) => {
          const shortId = o.id.slice(-6).toUpperCase();
          orderBtnsRow.push({ text: `#${shortId}`, callback_data: `order:view:${o.id}` });
        });
        if (orderBtnsRow.length > 0) buttons.push(orderBtnsRow);

        // Filter tabs
        buttons.push([
          { text: filter === "PENDING" ? "• 🟡 Ожидают •" : "🟡 Ожидают", callback_data: "order:list:PENDING:0" },
          { text: filter === "ACTIVE" ? "• 👨‍🍳 В работе •" : "👨‍🍳 В работе", callback_data: "order:list:ACTIVE:0" },
          { text: filter === "COMPLETED" ? "• 🏁 Завершены •" : "🏁 Завершены", callback_data: "order:list:COMPLETED:0" }
        ]);

        // Pagination
        const navRow: any[] = [];
        if (page > 0) {
          navRow.push({ text: "⬅️ Назад", callback_data: `order:list:${filter}:${page - 1}` });
        }
        if ((page + 1) * pageSize < totalCount) {
          navRow.push({ text: "Вперёд ➡️", callback_data: `order:list:${filter}:${page + 1}` });
        }
        if (navRow.length > 0) buttons.push(navRow);

        buttons.push([
          { text: "🔍 Найти по номеру/телефону", callback_data: "order:search" },
          { text: "🏠 Главное меню", callback_data: "menu:main" }
        ]);

        if (messageId) {
          await editTelegramMessage(botToken, chatId, messageId, listText, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: buttons }
          });
        }
        return;
      }

      if (action === "search") {
        setUserState(chatId, "SEARCH_ORDER", { shopId: shop.id });
        await answerTelegramCallback(botToken, cqId);
        await sendTelegramMessage(
          botToken,
          chatId,
          `🔍 *Поиск заказа*\n\nВведите последние символы номера заказа, имя клиента или номер телефона (напр. \`+79991234567\` или \`A1B2\`):\n\n_Для отмены введите /cancel_`
        );
        return;
      }
    }

    // ROUTE: REVIEW ACTIONS
    if (domain === "review") {
      if (action === "view") {
        const reviewId = parts[2];
        const review = await db.review.findUnique({ where: { id: reviewId } });
        if (!review || review.shopId !== shop.id) {
          await answerTelegramCallback(botToken, cqId, "❌ Отзыв не найден", true);
          return;
        }
        await answerTelegramCallback(botToken, cqId, "✅ Отзыв загружен");
        const cardText = getReviewCardText(review, shop);
        const cardButtons = getReviewInlineButtons(review, role);
        if (messageId) {
          await editTelegramMessage(botToken, chatId, messageId, cardText, {
            parse_mode: "Markdown",
            reply_markup: cardButtons
          });
        }
        return;
      }

      if (action === "reply") {
        const reviewId = parts[2];
        const review = await db.review.findUnique({ where: { id: reviewId } });
        if (!review || review.shopId !== shop.id) {
          await answerTelegramCallback(botToken, cqId, "❌ Отзыв не найден", true);
          return;
        }

        setUserState(chatId, "REPLY_REVIEW", { reviewId, shopId: shop.id, messageId });
        await answerTelegramCallback(botToken, cqId);
        await sendTelegramMessage(
          botToken,
          chatId,
          `✍️ *Ответ на отзыв от ${review.customerName}*\nОценка: ${"⭐".repeat(review.rating)}\n` +
          `Текст отзыва: _"${review.comment || "Без текста"}"_\n\n` +
          `💬 *Отправьте сообщением ваш официальный ответ.* Он будет виден всем покупателям на витрине.\n\n_Для отмены отправьте /cancel_`
        );
        return;
      }

      if (action === "delete") {
        if (role !== "OWNER") {
          await answerTelegramCallback(botToken, cqId, "❌ Только владелец может удалять отзывы", true);
          return;
        }
        const reviewId = parts[2];
        await db.review.delete({ where: { id: reviewId } }).catch(() => {});
        broadcastWSEvent({ type: "REVIEW_DELETED", shopId: shop.id, payload: { id: reviewId } });
        await answerTelegramCallback(botToken, cqId, "🗑️ Отзыв успешно удалён", false);
        if (messageId) {
          await editTelegramMessage(botToken, chatId, messageId, "🗑️ *Отзыв был удалён из системы.*", {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[{ text: "⭐ К списку отзывов", callback_data: "review:list:ALL:0" }]]
            }
          });
        }
        return;
      }

      if (action === "list") {
        const page = parseInt(parts[3] || "0", 10);
        const pageSize = 5;

        const [reviewsList, totalCount] = await Promise.all([
          db.review.findMany({
            where: { shopId: shop.id },
            orderBy: { createdAt: "desc" },
            skip: page * pageSize,
            take: pageSize
          }),
          db.review.count({ where: { shopId: shop.id } })
        ]);

        await answerTelegramCallback(botToken, cqId);

        let listText = `⭐ *Отзывы заведения «${shop.name}»*\nВсего отзывов: ${totalCount}\n━━━━━━━━━━━━━━━━━━━\n`;
        if (reviewsList.length === 0) {
          listText += `_Отзывов пока нет._`;
        } else {
          reviewsList.forEach((r, idx) => {
            const stars = "⭐".repeat(r.rating || 5);
            const dateStr = new Date(r.createdAt).toLocaleDateString("ru-RU");
            listText += `${idx + 1 + page * pageSize}. *${r.customerName}* ${stars} (${dateStr})\n` +
              `   💬 "${(r.comment || "Без текста").slice(0, 50)}${(r.comment || "").length > 50 ? "..." : ""}"\n` +
              `   ↳ ${r.reply ? "✅ _Ответ дан_" : "⏳ _Без ответа_"}\n`;
          });
        }

        const buttons: any[][] = [];
        const revBtnsRow: any[] = [];
        reviewsList.forEach((r, idx) => {
          revBtnsRow.push({ text: `Отзыв #${idx + 1 + page * pageSize}`, callback_data: `review:view:${r.id}` });
        });
        if (revBtnsRow.length > 0) buttons.push(revBtnsRow);

        const navRow: any[] = [];
        if (page > 0) {
          navRow.push({ text: "⬅️ Назад", callback_data: `review:list:ALL:${page - 1}` });
        }
        if ((page + 1) * pageSize < totalCount) {
          navRow.push({ text: "Вперёд ➡️", callback_data: `review:list:ALL:${page + 1}` });
        }
        if (navRow.length > 0) buttons.push(navRow);

        buttons.push([{ text: "🏠 Главное меню", callback_data: "menu:main" }]);

        if (messageId) {
          await editTelegramMessage(botToken, chatId, messageId, listText, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: buttons }
          });
        }
        return;
      }
    }

    // ROUTE: STOP-LIST ACTIONS
    if (domain === "stoplist") {
      if (action === "toggle") {
        const serviceId = parts[2];
        const service = await db.service.findUnique({ where: { id: serviceId } });
        if (!service || service.shopId !== shop.id) {
          await answerTelegramCallback(botToken, cqId, "❌ Товар не найден", true);
          return;
        }

        const newAvailability = !service.isAvailable;
        const updated = await db.service.update({
          where: { id: serviceId },
          data: { isAvailable: newAvailability }
        });

        broadcastWSEvent({
          type: "SERVICE_UPDATED",
          shopId: shop.id,
          payload: updated
        });

        const statusMsg = newAvailability ? `🟢 «${service.title}» возвращён в меню` : `🔴 «${service.title}» добавлен в СТОП-ЛИСТ`;
        await answerTelegramCallback(botToken, cqId, statusMsg, false);

        // Re-render stoplist
        const page = parseInt(parts[3] || "0", 10);
        await renderStopListMessage(db, shop, chatId, messageId, page, botToken);
        return;
      }

      if (action === "list") {
        const page = parseInt(parts[2] || "0", 10);
        await answerTelegramCallback(botToken, cqId);
        await renderStopListMessage(db, shop, chatId, messageId, page, botToken);
        return;
      }
    }

    // ROUTE: STATS ACTIONS
    if (domain === "stats") {
      const period = (action as any) || "today";
      await answerTelegramCallback(botToken, cqId);
      const stats = await getShopBusinessStats(db, shop.id, period);

      const periodLabel = period === "today" ? "Сегодня" : period === "week" ? "Последние 7 дней" : period === "month" ? "Последние 30 дней" : "Всё время";

      const statsText =
        `📊 *Аналитика заведения «${shop.name}»*\n` +
        `⏱ *Период:* ${periodLabel}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💰 *Выручка (выполненные):* *${stats.totalRevenue.toLocaleString("ru-RU")} ${shop.currencySymbol || "₽"}*\n` +
        `🧾 *Средний чек:* *${stats.avgCheck.toLocaleString("ru-RU")} ${shop.currencySymbol || "₽"}*\n\n` +
        `📦 *Заказы всего:* *${stats.totalOrders}*\n` +
        `  • 🟢 Выполнено: ${stats.completedCount}\n` +
        `  • 🟠 В работе: ${stats.inProgressCount}\n` +
        `  • 🟡 Ожидает: ${stats.pendingCount}\n` +
        `  • 🔴 Отменено: ${stats.cancelledCount}\n\n` +
        `⭐ *Отзывы:* ${stats.reviewsCount} шт. (средний балл *${stats.avgRating}/5*)\n` +
        `👥 *Клиентская база:* ${stats.customersCount} чел.\n` +
        `🍽 *Активных позиций в меню:* ${stats.servicesCount} шт.`;

      const buttons = [
        [
          { text: period === "today" ? "• Сегодня •" : "Сегодня", callback_data: "stats:today" },
          { text: period === "week" ? "• 7 дней •" : "7 дней", callback_data: "stats:week" }
        ],
        [
          { text: period === "month" ? "• 30 дней •" : "30 дней", callback_data: "stats:month" },
          { text: period === "all" ? "• Всё время •" : "Всё время", callback_data: "stats:all" }
        ],
        [{ text: "🏠 Главное меню", callback_data: "menu:main" }]
      ];

      if (messageId) {
        await editTelegramMessage(botToken, chatId, messageId, statsText, {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: buttons }
        });
      }
      return;
    }

    // ROUTE: TOGGLE OPEN / CLOSED
    if (domain === "shop" && action === "toggle_open") {
      if (role !== "OWNER" && role !== "ADMIN") {
        await answerTelegramCallback(botToken, cqId, "❌ Недостаточно прав", true);
        return;
      }

      const newIsOpen = !shop.isOpen;
      const updatedShop = await db.shop.update({
        where: { id: shop.id },
        data: { isOpen: newIsOpen }
      });

      broadcastWSEvent({
        type: "SHOP_UPDATED",
        shopId: shop.id,
        payload: updatedShop
      });

      await answerTelegramCallback(botToken, cqId, newIsOpen ? "🟢 Заведение открыто для заказов" : "🔴 Заведение закрыто на приём заказов", false);

      const statusText =
        `⚙️ *Управление заведением «${shop.name}»*\n\n` +
        `Статус приёма заказов: ${newIsOpen ? "🟢 *ОТКРЫТО* (Клиенты могут заказывать)" : "🔴 *ЗАКРЫТО* (Приём заказов приостановлен)"}\n\n` +
        `🌐 *Онлайн-витрина:* [Открыть меню](${shopUrl})`;

      const buttons = [
        [{ text: newIsOpen ? "🔴 Закрыть приём заказов" : "🟢 Открыть заведение", callback_data: "shop:toggle_open" }],
        [{ text: "🏠 Главное меню", callback_data: "menu:main" }]
      ];

      if (messageId) {
        await editTelegramMessage(botToken, chatId, messageId, statusText, {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: buttons }
        });
      }
      return;
    }

    // ROUTE: MAIN MENU
    if (domain === "menu" && action === "main") {
      await answerTelegramCallback(botToken, cqId);
      const welcomeText =
        `👋 *Панель управления заведением «${shop.name}»*\n\n` +
        `👤 *Ваша роль:* ${role === "OWNER" ? "👑 Владелец" : role === "ADMIN" ? "⭐ Администратор" : "👨‍🍳 Сотрудник"}\n` +
        `Статус заведения: ${shop.isOpen ? "🟢 Открыто" : "🔴 Закрыто"}\n\n` +
        `Выберите раздел для работы:`;

      const buttons = [
        [
          { text: "📦 Заказы", callback_data: "order:list:PENDING:0" },
          { text: "⭐ Отзывы", callback_data: "review:list:ALL:0" }
        ],
        [
          { text: "📊 Статистика", callback_data: "stats:today" },
          { text: "📋 Стоп-лист", callback_data: "stoplist:list:0" }
        ],
        [
          { text: shop.isOpen ? "🔴 Закрыть заведение" : "🟢 Открыть заведение", callback_data: "shop:toggle_open" }
        ],
        [
          { text: "🛍️ Открыть витрину (Mini App)", web_app: { url: shopUrl } }
        ]
      ];

      if (messageId) {
        await editTelegramMessage(botToken, chatId, messageId, welcomeText, {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: buttons }
        });
      }
      return;
    }
  }

  // -------------------------------------------------------------
  // 2. HANDLE TEXT MESSAGES & COMMANDS
  // -------------------------------------------------------------
  const message = update.message || update.edited_message;
  if (!message || !message.chat || !message.chat.id) return;

  const chatId = String(message.chat.id);
  const text = (message.text || "").trim();
  const fromUser = message.from;

  // CANCEL COMMAND
  if (text === "/cancel" || text === "❌ Отмена" || text === "Отмена") {
    clearUserState(chatId);
    const userAuth = await resolveTelegramUserRole(db, shop, chatId, fromUser);
    const replyKb = getPersistentReplyKeyboard(shop, userAuth.role, shopUrl);
    await sendTelegramMessage(botToken, chatId, "👌 Действие отменено.", {
      reply_markup: replyKb
    });
    return;
  }

  // CHECK ACTIVE FSM STATE
  const activeState = getUserState(chatId);
  if (activeState) {
    // 1. REPLYING TO REVIEW
    if (activeState.state === "REPLY_REVIEW") {
      const reviewId = activeState.data.reviewId;
      clearUserState(chatId);

      const review = await db.review.findUnique({ where: { id: reviewId } });
      if (!review || review.shopId !== shop.id) {
        await sendTelegramMessage(botToken, chatId, "❌ Отзыв не найден.");
        return;
      }

      const updated = await db.review.update({
        where: { id: reviewId },
        data: { reply: text }
      });

      broadcastWSEvent({
        type: "REVIEW_UPDATED",
        shopId: shop.id,
        payload: updated
      });

      await sendTelegramMessage(
        botToken,
        chatId,
        `✅ *Ваш официальный ответ сохранён и опубликован!*\n\n` + getReviewCardText(updated, shop),
        {
          reply_markup: getReviewInlineButtons(updated, "ADMIN")
        }
      );
      return;
    }

    // 2. SEARCHING ORDER
    if (activeState.state === "SEARCH_ORDER") {
      clearUserState(chatId);
      const query = text.replace(/#/g, "").trim().toLowerCase();

      const orders = await db.order.findMany({
        where: {
          shopId: shop.id,
          OR: [
            { id: { contains: query, mode: "insensitive" } },
            { customerPhone: { contains: query, mode: "insensitive" } },
            { customerName: { contains: query, mode: "insensitive" } }
          ]
        },
        orderBy: { createdAt: "desc" },
        take: 5
      });

      if (orders.length === 0) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `🔍 По запросу «${text}» ничего не найдено.\n\nПопробуйте ещё раз через меню /orders или нажмите кнопку ниже.`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: "📦 Список заказов", callback_data: "order:list:PENDING:0" }]]
            }
          }
        );
        return;
      }

      await sendTelegramMessage(botToken, chatId, `🔍 Найдено заказов: *${orders.length}*`);
      for (const ord of orders) {
        await sendTelegramMessage(botToken, chatId, getOrderCardText(ord, shop), {
          reply_markup: getOrderInlineButtons(ord, shop)
        });
      }
      return;
    }
  }

  // -------------------------------------------------------------
  // DEEP LINKING: /start bind_<role>_<code> or /start
  // -------------------------------------------------------------
  if (text.startsWith("/start")) {
    const parts = text.split(" ");
    const param = parts[1] || "";

    // Employee Invite Bind Handler: /start bind_STAFF_abc123
    if (param.startsWith("bind_")) {
      const bindParts = param.split("_");
      const requestedRole = (bindParts[1] || "STAFF").toUpperCase() as "ADMIN" | "STAFF";
      const code = bindParts[2] || "";

      const settings = parseTelegramSettings(shop.telegramSettings);
      const invite = settings.inviteCodes?.find(
        i => i.code === code && new Date(i.expiresAt).getTime() > Date.now()
      );

      if (invite) {
        // Add or update subscriber
        const currentSubs = settings.subscribers || [];
        const existingIdx = currentSubs.findIndex(s => s.chatId === chatId);

        const newSub: TelegramSubscriber = {
          chatId,
          name: [fromUser?.first_name, fromUser?.last_name].filter(Boolean).join(" ") || fromUser?.username || "Сотрудник",
          username: fromUser?.username ? `@${fromUser.username}` : undefined,
          role: invite.role || requestedRole,
          addedAt: new Date().toISOString(),
          notifyOrders: true,
          notifyReviews: invite.role === "ADMIN"
        };

        if (existingIdx >= 0) {
          currentSubs[existingIdx] = newSub;
        } else {
          currentSubs.push(newSub);
        }

        // Remove used single-use invite
        settings.subscribers = currentSubs;
        settings.inviteCodes = settings.inviteCodes?.filter(i => i.code !== code);

        await db.shop.update({
          where: { id: shop.id },
          data: { telegramSettings: JSON.stringify(settings) }
        });

        const replyKb = getPersistentReplyKeyboard(shop, newSub.role, shopUrl);

        await sendTelegramMessage(
          botToken,
          chatId,
          `🎉 *Вы успешно привязаны к заведению «${shop.name}»!*\n\n` +
          `👤 *Ваша роль:* ${newSub.role === "ADMIN" ? "⭐ Администратор" : "👨‍🍳 Сотрудник"}\n` +
          `📱 Вам будут приходить мгновенные уведомления о заказах с кнопками смены статуса.\n\n` +
          `Используйте кнопки меню ниже для управления:`,
          { reply_markup: replyKb }
        );
        return;
      }
    }

    // Default /start handler
    const userAuth = await resolveTelegramUserRole(db, shop, chatId, fromUser);
    const replyKb = getPersistentReplyKeyboard(shop, userAuth.role, shopUrl);

    // If unlinked, but shop has no adminChatId, auto-bind as Owner
    if (!shop.adminChatId || shop.adminChatId === chatId) {
      if (!shop.adminChatId) {
        await db.shop.update({
          where: { id: shop.id },
          data: { adminChatId: chatId }
        });
      }

      await sendTelegramMessage(
        botToken,
        chatId,
        `🎉 *Бот заведения «${shop.name}» успешно подключён!*\n\n` +
        `👤 *Владелец / Администратор:* ${fromUser?.first_name || "Админ"}\n` +
        `🆔 *Ваш Chat ID:* \`${chatId}\`\n\n` +
        `📱 Сюда будут приходить все новые заказы с кнопками мгновенной обработки (Принять, В работу, Завершить).\n\n` +
        `🌐 [Открыть витрину заведения](${shopUrl})`,
        {
          reply_markup: replyKb
        }
      );
      return;
    }

    if (userAuth.role !== "NONE") {
      await sendTelegramMessage(
        botToken,
        chatId,
        `👋 *Добро пожаловать в систему управления «${shop.name}»!*\n\n` +
        `👤 *Ваша роль:* ${userAuth.role === "OWNER" ? "👑 Владелец" : userAuth.role === "ADMIN" ? "⭐ Администратор" : "👨‍🍳 Сотрудник"}\n` +
        `Используйте меню для работы с заказами, стоп-листом и статистикой.`,
        { reply_markup: replyKb }
      );
      return;
    }

    // Regular customer visiting the bot
    await sendTelegramMessage(
      botToken,
      chatId,
      `👋 Здравствуйте, ${fromUser?.first_name || "гость"}!\n\n` +
      `Добро пожаловать в бота заведения *«${shop.name}»*.\n` +
      `Здесь вы можете посмотреть актуальное меню и оформить онлайн-заказ прямо через Telegram Mini App!`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🛍️ Открыть меню и сделать заказ", web_app: { url: shopUrl } }]
          ]
        }
      }
    );
    return;
  }

  // -------------------------------------------------------------
  // TEXT COMMANDS & KEYBOARD BUTTON ROUTING
  // -------------------------------------------------------------
  const userAuth = await resolveTelegramUserRole(db, shop, chatId, fromUser);
  const role = userAuth.role;

  if (role === "NONE") {
    await sendTelegramMessage(
      botToken,
      chatId,
      `👋 Вы можете открыть витрину заведения «${shop.name}» по кнопке ниже:`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "🛍️ Открыть витрину", web_app: { url: shopUrl } }]]
        }
      }
    );
    return;
  }

  // 1. ORDERS COMMAND / BUTTON
  if (text === "📦 Заказы" || text === "/orders" || text === "/active") {
    const pendingOrders = await db.order.findMany({
      where: { shopId: shop.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    const pendingCount = await db.order.count({ where: { shopId: shop.id, status: "PENDING" } });
    const inProgressCount = await db.order.count({ where: { shopId: shop.id, status: { in: ["CONFIRMED", "IN_PROGRESS"] } } });

    let msg = `📦 *Раздел: Заказы «${shop.name}»*\n\n` +
      `🟡 Ожидают подтверждения: *${pendingCount}*\n` +
      `🟠 В работе: *${inProgressCount}*\n━━━━━━━━━━━━━━━━━━━\n`;

    if (pendingOrders.length === 0) {
      msg += `_Нет новых заказов, ожидающих подтверждения._`;
    } else {
      msg += `*Свежие заказы в ожидании:*\n`;
      pendingOrders.forEach((o, i) => {
        const shortId = o.id.slice(-6).toUpperCase();
        msg += `${i + 1}. *#${shortId}* — ${o.customerName} (${o.totalPrice} ${shop.currencySymbol || "₽"})\n`;
      });
    }

    const buttons: any[][] = [];
    const ordRow: any[] = [];
    pendingOrders.forEach(o => {
      const shortId = o.id.slice(-6).toUpperCase();
      ordRow.push({ text: `#${shortId}`, callback_data: `order:view:${o.id}` });
    });
    if (ordRow.length > 0) buttons.push(ordRow);

    buttons.push([
      { text: "🟡 Ожидают", callback_data: "order:list:PENDING:0" },
      { text: "👨‍🍳 В работе", callback_data: "order:list:ACTIVE:0" },
      { text: "🏁 Все заказы", callback_data: "order:list:ALL:0" }
    ]);
    buttons.push([
      { text: "🔍 Поиск заказа", callback_data: "order:search" }
    ]);

    await sendTelegramMessage(botToken, chatId, msg, {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // 2. REVIEWS COMMAND / BUTTON
  if (text === "⭐ Отзывы" || text === "/reviews") {
    const reviews = await db.review.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      take: 3
    });
    const totalCount = await db.review.count({ where: { shopId: shop.id } });

    let msg = `⭐ *Раздел: Отзывы «${shop.name}»*\nВсего отзывов: *${totalCount}*\n━━━━━━━━━━━━━━━━━━━\n`;
    if (reviews.length === 0) {
      msg += `_Отзывов пока нет._`;
    } else {
      reviews.forEach((r, i) => {
        const stars = "⭐".repeat(r.rating || 5);
        msg += `${i + 1}. *${r.customerName}* ${stars}\n   💬 "${(r.comment || "Без текста").slice(0, 60)}"\n   ↳ ${r.reply ? "✅ _Ответ дан_" : "⏳ _Ждёт ответа_"}\n`;
      });
    }

    const buttons: any[][] = [];
    const revRow: any[] = [];
    reviews.forEach((r, i) => {
      revRow.push({ text: `Отзыв #${i + 1}`, callback_data: `review:view:${r.id}` });
    });
    if (revRow.length > 0) buttons.push(revRow);

    buttons.push([
      { text: "📋 Все отзывы", callback_data: "review:list:ALL:0" }
    ]);

    await sendTelegramMessage(botToken, chatId, msg, {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // 3. STATS COMMAND / BUTTON
  if (text === "📊 Статистика" || text === "/stats") {
    const stats = await getShopBusinessStats(db, shop.id, "today");
    const statsText =
      `📊 *Сводка за СЕГОДНЯ: «${shop.name}»*\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `💰 *Выручка:* *${stats.totalRevenue.toLocaleString("ru-RU")} ${shop.currencySymbol || "₽"}*\n` +
      `🧾 *Средний чек:* *${stats.avgCheck.toLocaleString("ru-RU")} ${shop.currencySymbol || "₽"}*\n\n` +
      `📦 *Заказы сегодня:* *${stats.totalOrders}*\n` +
      `  • 🟢 Выполнено: ${stats.completedCount}\n` +
      `  • 🟠 В работе: ${stats.inProgressCount}\n` +
      `  • 🟡 Ожидает: ${stats.pendingCount}\n` +
      `  • 🔴 Отменено: ${stats.cancelledCount}\n\n` +
      `⭐ *Отзывов сегодня:* ${stats.reviewsCount} шт.\n` +
      `👥 *Всего клиентов:* ${stats.customersCount} чел.`;

    const buttons = [
      [
        { text: "• Сегодня •", callback_data: "stats:today" },
        { text: "7 дней", callback_data: "stats:week" }
      ],
      [
        { text: "30 дней", callback_data: "stats:month" },
        { text: "Всё время", callback_data: "stats:all" }
      ]
    ];

    await sendTelegramMessage(botToken, chatId, statsText, {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // 4. STOP-LIST COMMAND / BUTTON
  if (text === "📋 Стоп-лист" || text === "/stoplist") {
    await renderStopListMessage(db, shop, chatId, undefined, 0, botToken);
    return;
  }

  // 5. CUSTOMERS COMMAND / BUTTON
  if (text === "👥 Клиенты" || text === "/customers") {
    const customers = await db.customer.findMany({
      where: { shopId: shop.id },
      orderBy: { totalSpent: "desc" },
      take: 5
    });

    let msg = `👥 *Постоянные клиенты «${shop.name}»*\n━━━━━━━━━━━━━━━━━━━\n`;
    if (customers.length === 0) {
      msg += `_Клиентская база формируется автоматически при заказах._`;
    } else {
      customers.forEach((c, idx) => {
        msg += `${idx + 1}. *${c.name || "Гость"}* (\`${c.phone}\`)\n` +
          `   ↳ Заказов: *${c.ordersCount || 0}* • Потратил: *${(c.totalSpent || 0).toLocaleString("ru-RU")} ${shop.currencySymbol || "₽"}* • Бонусы: *${c.bonusBalance || 0}*\n`;
      });
    }

    await sendTelegramMessage(botToken, chatId, msg, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛍️ Открыть Mini App витрину", web_app: { url: shopUrl } }]
        ]
      }
    });
    return;
  }

  // 6. SETTINGS COMMAND / BUTTON
  if (text === "⚙️ Настройки" || text === "/settings" || text === "/status") {
    const settings = parseTelegramSettings(shop.telegramSettings);
    const subsCount = (settings.subscribers || []).length + (shop.adminChatId ? 1 : 0);

    const statusText =
      `⚙️ *Настройки заведения «${shop.name}»*\n\n` +
      `Статус приёма заказов: ${shop.isOpen ? "🟢 *ОТКРЫТО*" : "🔴 *ЗАКРЫТО*"}\n` +
      `Сотрудников в Telegram: *${subsCount}*\n` +
      `Бот: @${settings.botUsername || "бот"}\n\n` +
      `🌐 *Витрина:* [${shopUrl}](${shopUrl})`;

    const buttons = [
      [{ text: shop.isOpen ? "🔴 Закрыть заведение" : "🟢 Открыть заведение", callback_data: "shop:toggle_open" }],
      [{ text: "📦 Перейти к заказам", callback_data: "order:list:PENDING:0" }]
    ];

    await sendTelegramMessage(botToken, chatId, statusText, {
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // 7. REFRESH / UPDATE BUTTON
  if (text === "🔄 Обновить" || text === "/refresh") {
    const replyKb = getPersistentReplyKeyboard(shop, role, shopUrl);
    await sendTelegramMessage(
      botToken,
      chatId,
      `✅ Панель синхронизирована с базой данных заведения «${shop.name}».`,
      { reply_markup: replyKb }
    );
    return;
  }

  // Fallback help
  await sendTelegramMessage(
    botToken,
    chatId,
    `💡 *Команды Telegram-бота «${shop.name}»:*\n\n` +
    `• 📦 *Заказы* — управление и смена статусов заказов\n` +
    `• ⭐ *Отзывы* — просмотр оценок и ответы клиентам\n` +
    `• 📊 *Статистика* — выручка, средний чек и аналитика\n` +
    `• 📋 *Стоп-лист* — мгновенное отключение/включение блюд\n` +
    `• ⚙️ *Настройки* — режим работы (Открыто/Закрыто)\n` +
    `• /cancel — отмена текущего ввода`
  );
}

// Helper: Renders Stop List interactive message with page navigation
async function renderStopListMessage(
  db: PrismaClient,
  shop: any,
  chatId: string,
  messageId: number | undefined,
  page: number,
  botToken: string
) {
  const pageSize = 6;
  const [services, totalCount] = await Promise.all([
    db.service.findMany({
      where: { shopId: shop.id },
      orderBy: [{ category: "asc" }, { title: "asc" }],
      skip: page * pageSize,
      take: pageSize
    }),
    db.service.count({ where: { shopId: shop.id } })
  ]);

  let text = `📋 *Стоп-лист заведения «${shop.name}»*\n` +
    `Нажимайте на кнопки товаров, чтобы моментально включать или выключать их доступность на витрине:\n━━━━━━━━━━━━━━━━━━━\n`;

  if (services.length === 0) {
    text += `_В меню пока нет добавленных позиций._`;
  } else {
    services.forEach((s) => {
      text += `${s.isAvailable ? "🟢" : "🔴"} *${s.title}* — ${s.price} ${shop.currencySymbol || "₽"} ${s.isAvailable ? "(В наличии)" : "*(В СТОП-ЛИСТЕ)*"}\n`;
    });
  }

  const buttons: any[][] = [];

  // Toggle item buttons
  services.forEach((s) => {
    const icon = s.isAvailable ? "🟢" : "🔴";
    const label = `${icon} ${s.title.slice(0, 24)}`;
    buttons.push([
      { text: label, callback_data: `stoplist:toggle:${s.id}:${page}` }
    ]);
  });

  // Pagination
  const navRow: any[] = [];
  if (page > 0) {
    navRow.push({ text: "⬅️ Назад", callback_data: `stoplist:list:${page - 1}` });
  }
  if ((page + 1) * pageSize < totalCount) {
    navRow.push({ text: "Вперёд ➡️", callback_data: `stoplist:list:${page + 1}` });
  }
  if (navRow.length > 0) buttons.push(navRow);

  buttons.push([{ text: "🏠 Главное меню", callback_data: "menu:main" }]);

  if (messageId) {
    await editTelegramMessage(botToken, chatId, messageId, text, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  } else {
    await sendTelegramMessage(botToken, chatId, text, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  }
}
