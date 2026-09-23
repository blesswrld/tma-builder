import type { Express, Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import nodeCrypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "smart-menu-secret-key-2026";

export interface TelegramAuthSession {
  sessionId: string;
  status: "PENDING" | "CONFIRMED" | "EXPIRED" | "CANCELLED";
  createdAt: number;
  expiresAt: number;
  phone?: string;
  verificationCode?: string;
  referralCode?: string;
  token?: string;
  user?: any;
  telegramUser?: {
    id: string | number;
    username?: string;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    photo_url?: string;
  };
}

// In-memory sessions cache with 15 min TTL
const authSessions = new Map<string, TelegramAuthSession>();
// Codes map: key = phone or handle, value = { code, expiresAt, referralCode }
const phoneCodeSessions = new Map<string, { code: string; expiresAt: number; referralCode?: string }>();

// Cleanup stale sessions every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of authSessions.entries()) {
    if (session.expiresAt < now) {
      authSessions.delete(key);
    }
  }
  for (const [phone, codeInfo] of phoneCodeSessions.entries()) {
    if (codeInfo.expiresAt < now) {
      phoneCodeSessions.delete(phone);
    }
  }
}, 2 * 60 * 1000);

function generateReferralCode(): string {
  return "REF" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function normalizePhone(rawPhone?: string | null): string {
  if (!rawPhone) return "";
  const cleaned = rawPhone.replace(/[^\d+]/g, "").trim();
  if (cleaned.startsWith("8") && cleaned.length === 11) {
    return "+7" + cleaned.slice(1);
  }
  if (!cleaned.startsWith("+") && cleaned.length > 0) {
    return "+" + cleaned;
  }
  return cleaned;
}

function formatUserResponse(user: any) {
  const isDev =
    user.email?.toLowerCase().trim() === "gelgaev.dev@mail.ru" ||
    user.email?.toLowerCase().trim() === "roninfortnite71@gmail.com";
  let resolvedRole = user.role || "USER";
  if (isDev) {
    resolvedRole = "ADMIN";
  } else if (resolvedRole === "DEVELOPER") {
    resolvedRole = "ADMIN";
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name || null,
    phone: user.phone || null,
    avatarUrl: user.avatarUrl || null,
    telegramHandle: user.telegramHandle || null,
    telegramId: user.telegramId || null,
    githubHandle: user.githubHandle || null,
    githubId: user.githubId || null,
    companyName: user.companyName || null,
    plan: user.plan || "FREE",
    subscriptionExpiresAt: user.subscriptionExpiresAt || null,
    referralCode: user.referralCode || null,
    referredById: user.referredById || null,
    isBanned: Boolean(user.isBanned),
    banReason: user.banReason || null,
    bannedAt: user.bannedAt || null,
    role: resolvedRole,
    balance: Number(user.balance) || 0,
    city: user.city || null,
    isVerified: Boolean(user.isVerified),
    createdAt: user.createdAt || null
  };
}

export function isPhoneLikeString(str: string | null | undefined): boolean {
  if (!str) return false;
  const s = str.trim();
  if (s.startsWith("+")) return true;
  // If only digits, spaces, dashes or parens and has at least 6 digits
  const digitsOnly = s.replace(/\D/g, "");
  if (digitsOnly.length >= 6 && s.replace(/[\d\s\-\+\(\)]/g, "").length === 0) {
    return true;
  }
  if (s.startsWith("tg_") || s.startsWith("Telegram #")) return true;
  return false;
}

export const NICKNAME_ADJECTIVES = [
  "Cyber", "Neon", "Quantum", "Hyper", "Pixel", "Cosmic", "Solar", "Turbo",
  "Aero", "Pulse", "Nova", "Apex", "Vortex", "Echo", "Atlas", "Titan",
  "Shadow", "Vector", "Matrix", "Zenith", "Prime", "Flash", "Swift", "Astra",
  "Orbit", "Lumen", "Flux", "Nano", "Alpha", "Stellar", "Atomic", "Sonic",
  "Mystic", "Blaze", "Omega", "Phantom", "Spark", "Frost", "Iron", "Vibe"
];

export const NICKNAME_NOUNS = [
  "Pilot", "Falcon", "Runner", "Fox", "Builder", "Coder", "Dev", "Knight",
  "Hunter", "Spark", "Rider", "Ghost", "Hawk", "Crafter", "Node", "Wave",
  "Pioneer", "Creator", "Nexus", "Eagle", "Wolf", "Lynx", "Architect", "Master",
  "Scout", "Voyager", "Rebel", "Cipher", "Phoenix", "Bot", "Byte", "Rocket",
  "Hero", "Agent", "Wizard", "Titan", "Tiger", "Panther", "Sparky", "Samurai"
];

/**
 * Generates a unique, non-repeating nickname for a user.
 * Guarantees uniqueness by checking the database.
 */
export async function generateUniqueNickname(
  db: PrismaClient,
  seedSuggestion?: string | null,
  excludeUserId?: string | null
): Promise<string> {
  const cleanSeed = seedSuggestion
    ? seedSuggestion.trim().replace(/^@/, "").replace(/[^\w\d_а-яА-ЯёЁ]/g, "")
    : "";
  const isSeedValid = cleanSeed.length >= 2 && !isPhoneLikeString(cleanSeed);

  // If a valid custom seed (e.g. from Telegram first_name or username) is provided, test it
  if (isSeedValid) {
    try {
      const existing = await db.user.findFirst({
        where: {
          name: { equals: cleanSeed, mode: "insensitive" },
          ...(excludeUserId ? { NOT: { id: excludeUserId } } : {})
        }
      });
      if (!existing) {
        return cleanSeed;
      }

      // If exact seed is taken, try seed with numeric suffixes
      for (let i = 0; i < 20; i++) {
        const suffix = Math.floor(100 + Math.random() * 900);
        const candidate = `${cleanSeed}_${suffix}`;
        const taken = await db.user.findFirst({
          where: {
            name: { equals: candidate, mode: "insensitive" },
            ...(excludeUserId ? { NOT: { id: excludeUserId } } : {})
          }
        });
        if (!taken) {
          return candidate;
        }
      }
    } catch {}
  }

  // Generate a random unique handle (e.g. CyberFalcon_482, NeonPilot_719)
  for (let attempt = 0; attempt < 50; attempt++) {
    const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)];
    const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const candidate = `${adj}${noun}_${num}`;

    try {
      const taken = await db.user.findFirst({
        where: {
          name: { equals: candidate, mode: "insensitive" },
          ...(excludeUserId ? { NOT: { id: excludeUserId } } : {})
        }
      });

      if (!taken) {
        return candidate;
      }
    } catch {
      return candidate;
    }
  }

  // Fallback with timestamp slice
  return `User_${Date.now().toString().slice(-6)}`;
}

export function getAuthBotConfig(): { token: string; username: string } {
  const token = (process.env.TELEGRAM_AUTH_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const rawUsername = (process.env.TELEGRAM_AUTH_BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME || "tma_app_builder_bot").trim();
  const username = rawUsername.replace(/^@/, "");
  return { token, username };
}

let cachedBotInfo: { username: string | null; id: number | null; first_name?: string } | null = null;

export async function fetchSystemBotInfo(): Promise<{ username: string | null; id: number | null; first_name?: string }> {
  if (cachedBotInfo) return cachedBotInfo;
  const { token, username: configuredUsername } = getAuthBotConfig();

  if (configuredUsername) {
    cachedBotInfo = { username: configuredUsername, id: null, first_name: "TMA Builder Auth" };
  }

  if (token) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await res.json();
      if (data.ok && data.result?.username) {
        cachedBotInfo = {
          username: data.result.username,
          id: data.result.id,
          first_name: data.result.first_name
        };
        return cachedBotInfo;
      }
    } catch (e) {
      console.warn("[TelegramAuth] Failed to fetch bot info:", e);
    }
  }

  return cachedBotInfo || { username: configuredUsername || null, id: null };
}

/**
 * Configure Telegram Auth Bot profile, descriptions and commands via Telegram API
 */
export async function configureAuthBotProfile(token: string) {
  if (!token) return;
  try {
    // 1. Set bot name
    await fetch(`https://api.telegram.org/bot${token}/setMyName`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "TMA Builder Auth" })
    }).catch(() => {});

    // 2. Set description (shown in empty chat window before user clicks Start)
    await fetch(`https://api.telegram.org/bot${token}/setMyDescription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "🔐 Официальный бот авторизации платформы TMA Builder (Smart Menu).\n\n• Подтверждение входа в 1 клик\n• Одноразовые коды безопасности (OTP)\n• Безопасная регистрация аккаунта\n\nДля входа на платформу запустите бота по ссылке из браузера или отправьте команду /start."
      })
    }).catch(() => {});

    // 3. Set short description (shown in bot profile share)
    await fetch(`https://api.telegram.org/bot${token}/setMyShortDescription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        short_description: "🔐 Вход и авторизация в TMA Builder"
      })
    }).catch(() => {});

    // 4. Set bot menu commands
    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "start", description: "Вход и авторизация в TMA Builder" },
          { command: "help", description: "Справка по безопасности" }
        ]
      })
    }).catch(() => {});

    console.log("[TelegramAuth] Auth bot profile & commands updated successfully.");
  } catch (e) {
    console.warn("[TelegramAuth] Note: Error updating bot profile via API:", e);
  }
}

/**
 * Core resolver: find or create a user by Telegram profile / phone
 */
export async function authenticateTelegramUser(
  db: PrismaClient,
  tgData: {
    telegramId: string;
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    photo_url?: string | null;
    phone?: string | null;
    referralCode?: string | null;
  }
) {
  const telegramIdStr = String(tgData.telegramId);
  const cleanUsername = tgData.username ? tgData.username.replace(/^@/, "").trim().toLowerCase() : null;
  const normPhone = normalizePhone(tgData.phone);

  // Derive seed suggestion only from genuine names/handles, never from phone numbers
  const rawFirstName = tgData.first_name ? [tgData.first_name, tgData.last_name].filter(Boolean).join(" ").trim() : null;
  const rawSeed =
    (rawFirstName && !isPhoneLikeString(rawFirstName) ? rawFirstName : null) ||
    (cleanUsername && !isPhoneLikeString(cleanUsername) ? cleanUsername : null) ||
    null;

  const avatarUrl =
    tgData.photo_url ||
    (cleanUsername ? `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}` : null);

  // Search by telegramId, phone, email or handle
  let user = await db.user.findFirst({
    where: {
      OR: [
        { telegramId: telegramIdStr },
        ...(normPhone ? [{ phone: normPhone }] : []),
        { email: `tg_${telegramIdStr}@telegram.org` },
        ...(cleanUsername
          ? [{ telegramHandle: cleanUsername }, { email: `${cleanUsername}@telegram.org` }]
          : [])
      ]
    }
  });

  if (user) {
    const updateData: any = {};
    if (!user.telegramId) updateData.telegramId = telegramIdStr;
    if (normPhone && (!user.phone || user.phone !== normPhone)) updateData.phone = normPhone;
    if (cleanUsername && (!user.telegramHandle || user.telegramHandle !== cleanUsername)) {
      updateData.telegramHandle = cleanUsername;
    }
    if (avatarUrl && !user.avatarUrl) updateData.avatarUrl = avatarUrl;

    // Fix if existing user's display name is empty, null, or a phone number (+1475...)
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
    // New user registration: generate GUARANTEED UNIQUE random nickname
    const uniqueNickname = await generateUniqueNickname(db, rawSeed);

    let referredById: string | null = null;
    if (tgData.referralCode && typeof tgData.referralCode === "string") {
      const cleanRef = tgData.referralCode.trim();
      const referrer = await db.user.findFirst({
        where: { OR: [{ referralCode: cleanRef }, { id: cleanRef }] }
      });
      if (referrer) referredById = referrer.id;
    }

    const email = cleanUsername
      ? `${cleanUsername}@telegram.org`
      : normPhone
      ? `tg_${normPhone.replace(/\D/g, "")}@telegram.org`
      : `tg_${telegramIdStr}@telegram.org`;

    const generatedPassword = await bcrypt.hash("tg_auth_" + telegramIdStr + "_" + Date.now(), 10);

    user = await db.user.create({
      data: {
        email,
        password: generatedPassword,
        name: uniqueNickname,
        phone: normPhone || null,
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
    throw new Error(`Аккаунт заблокирован. Причина: ${user.banReason || "Нарушение правил"}`);
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: "60d" }
  );

  return {
    user: formatUserResponse(user),
    token
  };
}

/**
 * Start background Long-Polling for system Telegram Bot so users can confirm
 * auth in 1-click via /start auth_<sessionId> or pressing the inline button.
 */
let isPollingStarted = false;
let pollingOffset = 0;

export async function startSystemBotListener(db: PrismaClient) {
  const { token } = getAuthBotConfig();
  if (!token) {
    console.log("[TelegramAuth] TELEGRAM_AUTH_BOT_TOKEN / TELEGRAM_BOT_TOKEN not provided, skipping system bot polling.");
    return;
  }
  if (isPollingStarted) return;
  isPollingStarted = true;

  console.log("[TelegramAuth] Starting system Telegram bot background listener for instant auth...");

  // Automatically configure bot profile & descriptions in Telegram
  configureAuthBotProfile(token).catch(() => {});

  // Drop pending webhook if any to allow getUpdates
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`);
  } catch {}

  const pollLoop = async () => {
    while (isPollingStarted) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${token}/getUpdates?offset=${pollingOffset + 1}&timeout=20&allowed_updates=["message","callback_query"]`
        );
        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            pollingOffset = Math.max(pollingOffset, update.update_id);
            try {
              await processBotUpdate(db, token, update);
            } catch (err) {
              console.error("[TelegramAuth] Error processing bot update:", err);
            }
          }
        } else {
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (err) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  };

  pollLoop().catch((e) => console.error("[TelegramAuth] Poll loop crashed:", e));
}

async function sendBotMessage(token: string, chatId: number | string, text: string, replyMarkup?: any) {
  try {
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: "HTML"
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn("[TelegramAuth] sendBotMessage error:", err);
  }
}

async function processBotUpdate(db: PrismaClient, botToken: string, update: any) {
  // 1. Process Callback Query (Inline buttons clicked)
  if (update.callback_query) {
    const cq = update.callback_query;
    const data = cq.data || "";
    const fromUser = cq.from;
    const chatId = cq.message?.chat?.id;

    if (data.startsWith("tg_auth_")) {
      const sessionId = data.replace("tg_auth_", "").trim();
      const session = authSessions.get(sessionId);

      if (!session || session.expiresAt < Date.now()) {
        try {
          await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callback_query_id: cq.id,
              text: "⚠️ Срок действия сессии истек. Запросите вход заново на сайте.",
              show_alert: true
            })
          });
        } catch {}
        return;
      }

      // Authenticate user
      const authResult = await authenticateTelegramUser(db, {
        telegramId: String(fromUser.id),
        username: fromUser.username,
        first_name: fromUser.first_name,
        last_name: fromUser.last_name,
        photo_url: null,
        referralCode: session.referralCode
      });

      session.status = "CONFIRMED";
      session.token = authResult.token;
      session.user = authResult.user;
      session.telegramUser = {
        id: fromUser.id,
        username: fromUser.username,
        first_name: fromUser.first_name,
        last_name: fromUser.last_name
      };

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: cq.id,
            text: "✅ Вход успешно подтвержден!"
          })
        });

        // Edit message
        if (chatId && cq.message?.message_id) {
          await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: cq.message.message_id,
              parse_mode: "HTML",
              text: `✅ <b>Вход подтвержден!</b>\n\nДобро пожаловать в TMA Builder, <b>${fromUser.first_name || fromUser.username || "пользователь"}</b>!\nВы можете вернуться в браузер — панель управления уже открыта.`
            })
          });
        }
      } catch (e) {
        console.warn("[TelegramAuth] answerCallbackQuery error:", e);
      }
      return;
    }

    if (data.startsWith("tg_cancel_")) {
      const sessionId = data.replace("tg_cancel_", "").trim();
      const session = authSessions.get(sessionId);
      if (session) {
        session.status = "CANCELLED";
      }
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: cq.id,
            text: "Вход отклонен"
          })
        });
        if (chatId && cq.message?.message_id) {
          await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: cq.message.message_id,
              text: "❌ Запрос на авторизацию отклонен."
            })
          });
        }
      } catch {}
      return;
    }
  }

  // 2. Process Messages (Deep links /start auth_... or shared contact)
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat?.id;
    const text = (msg.text || "").trim();
    const fromUser = msg.from;

    if (!chatId || !fromUser) return;

    // Contact sharing (user shares phone number)
    if (msg.contact && msg.contact.phone_number) {
      const phone = normalizePhone(msg.contact.phone_number);
      // Check if there is an active session or code request waiting for this phone or telegramId
      let matchedSession: TelegramAuthSession | null = null;
      for (const s of authSessions.values()) {
        if (s.status === "PENDING") {
          if (s.phone && normalizePhone(s.phone) === phone) {
            matchedSession = s;
            break;
          }
        }
      }

      const authResult = await authenticateTelegramUser(db, {
        telegramId: String(fromUser.id),
        username: fromUser.username,
        first_name: fromUser.first_name,
        last_name: fromUser.last_name,
        phone: phone,
        referralCode: matchedSession?.referralCode
      });

      if (matchedSession) {
        matchedSession.status = "CONFIRMED";
        matchedSession.token = authResult.token;
        matchedSession.user = authResult.user;
        matchedSession.phone = phone;
      }

      await sendBotMessage(
        botToken,
        chatId,
        `✅ <b>Номер телефона ${phone} подтвержден!</b>\n\nВы успешно вошли в аккаунт TMA Builder. Вернитесь на сайт для продолжения работы.`,
        { remove_keyboard: true }
      );
      return;
    }

    // Command: /start auth_<sessionId>
    if (text.startsWith("/start auth_")) {
      const sessionId = text.replace("/start auth_", "").trim();
      const session = authSessions.get(sessionId);

      if (!session || session.expiresAt < Date.now()) {
        await sendBotMessage(
          botToken,
          chatId,
          "⚠️ <b>Ссылка авторизации устарела</b>\n\nПожалуйста, вернитесь на сайт и нажмите кнопку «Войти через Telegram» заново."
        );
        return;
      }

      // Send prompt with inline buttons and real verification code
      const replyMarkup = {
        inline_keyboard: [
          [
            { text: "✅ Подтвердить вход на сайте", callback_data: `tg_auth_${sessionId}` },
            { text: "❌ Отклонить", callback_data: `tg_cancel_${sessionId}` }
          ]
        ]
      };

      const codeText = session.verificationCode
        ? `\n\n🔑 <b>Ваш код подтверждения:</b> <code>${session.verificationCode}</code>\n<i>(Вы можете нажать кнопку ниже или ввести этот код на сайте)</i>`
        : "";

      await sendBotMessage(
        botToken,
        chatId,
        `🔐 <b>Запрос на авторизацию в TMA Builder</b>\n\nВы запросили вход в панель управления платформы TMA Builder.${codeText}\n\nНажмите <b>«Подтвердить вход на сайте»</b>, чтобы войти в аккаунт в 1 клик.`,
        replyMarkup
      );
      return;
    }

    // Command: /start code_<6digits>
    if (text.startsWith("/start code_") || text.startsWith("/start login_")) {
      const code = text.replace(/^\/start (code_|login_)/, "").trim();
      // Match phone or session by code
      let matchedSession: TelegramAuthSession | null = null;
      for (const s of authSessions.values()) {
        if (s.status === "PENDING" && s.verificationCode === code) {
          matchedSession = s;
          break;
        }
      }

      const authResult = await authenticateTelegramUser(db, {
        telegramId: String(fromUser.id),
        username: fromUser.username,
        first_name: fromUser.first_name,
        last_name: fromUser.last_name,
        referralCode: matchedSession?.referralCode
      });

      if (matchedSession) {
        matchedSession.status = "CONFIRMED";
        matchedSession.token = authResult.token;
        matchedSession.user = authResult.user;
      }

      await sendBotMessage(
        botToken,
        chatId,
        `✅ <b>Код ${code} подтвержден!</b>\n\nВход в TMA Builder выполнен. Окно браузера на сайте обновится автоматически.`
      );
      return;
    }

    // Default /start or /help
    if (text === "/start" || text === "/help" || text === "/login") {
      await sendBotMessage(
        botToken,
        chatId,
        `👋 <b>Здравствуйте, ${fromUser.first_name || fromUser.username || "пользователь"}!</b>\n\nЭто официальный бот авторизации платформы <b>TMA Builder (Smart Menu)</b>.\n\n🔒 <b>Возможности:</b>\n• Вход в панель управления в 1 клик\n• Получение защитных кодов подтверждения (OTP)\n• Безопасная регистрация аккаунта без паролей\n\nДля входа перейдите на наш сайт и нажмите кнопку <b>«Войти через Telegram»</b>.`
      );
      return;
    }
  }
}

/**
 * Register all Telegram Auth routes
 */
export function setupTelegramAuthRoutes(app: Express, db: PrismaClient) {
  // 1. Get bot info
  app.get("/api/auth/telegram/bot-info", async (req: Request, res: Response) => {
    try {
      const info = await fetchSystemBotInfo();
      res.json({
        isConfigured: Boolean(info.username || process.env.TELEGRAM_BOT_TOKEN),
        botUsername: info.username || null,
        botId: info.id || null
      });
    } catch {
      res.json({ isConfigured: false, botUsername: null });
    }
  });

  // 2. Create instant QR / Deep-link Auth Session
  app.post("/api/auth/telegram/session/create", async (req: Request, res: Response) => {
    try {
      const { referralCode, phone } = req.body || {};
      const botInfo = await fetchSystemBotInfo();
      const sessionId = nodeCrypto.randomBytes(16).toString("hex");
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      const session: TelegramAuthSession = {
        sessionId,
        status: "PENDING",
        createdAt: Date.now(),
        expiresAt,
        phone: phone ? normalizePhone(phone) : undefined,
        referralCode: referralCode || undefined
      };

      authSessions.set(sessionId, session);

      const botUsername = botInfo.username || "tma_app_builder_bot";
      const deepLink = `https://t.me/${botUsername}?start=auth_${sessionId}`;

      res.json({
        sessionId,
        deepLink,
        botUsername,
        expiresAt
      });
    } catch (err: any) {
      console.error("[TelegramAuth] session create error:", err);
      res.status(500).json({ error: "Не удалось создать сессию авторизации Telegram" });
    }
  });

  // 3. Poll session status
  app.get("/api/auth/telegram/session/status", async (req: Request, res: Response) => {
    try {
      const sessionId = String(req.query.sessionId || "").trim();
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId обязателен" });
      }

      const session = authSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Сессия не найдена или истекла", status: "EXPIRED" });
      }

      if (session.expiresAt < Date.now()) {
        session.status = "EXPIRED";
        return res.json({ status: "EXPIRED" });
      }

      if (session.status === "CONFIRMED") {
        return res.json({
          status: "CONFIRMED",
          token: session.token,
          user: session.user
        });
      }

      res.json({
        status: session.status
      });
    } catch (err: any) {
      res.status(500).json({ error: "Ошибка проверки статуса сессии" });
    }
  });

  // 4. Send Verification Code to Telegram by Phone or Handle
  app.post("/api/auth/telegram/send-code", async (req: Request, res: Response) => {
    try {
      const { phone, handle, referralCode } = req.body;
      const normPhone = normalizePhone(phone);
      const cleanHandle = handle ? String(handle).replace(/^@/, "").trim().toLowerCase() : null;

      if (!normPhone && !cleanHandle) {
        return res.status(400).json({ error: "Укажите номер телефона или логин Telegram (@username)" });
      }

      const key = normPhone || cleanHandle!;
      // Generate 6-digit numeric OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      phoneCodeSessions.set(key, { code, expiresAt, referralCode });

      // Create linked auth session
      const sessionId = nodeCrypto.randomBytes(16).toString("hex");
      authSessions.set(sessionId, {
        sessionId,
        status: "PENDING",
        createdAt: Date.now(),
        expiresAt,
        phone: normPhone,
        verificationCode: code,
        referralCode
      });

      const botInfo = await fetchSystemBotInfo();
      const { token: botToken } = getAuthBotConfig();
      const botUsername = botInfo.username || "tma_app_builder_bot";

      let sentDirectly = false;

      // Try finding user with this phone or handle to get telegramId
      const existingUser = await db.user.findFirst({
        where: {
          OR: [
            ...(normPhone ? [{ phone: normPhone }] : []),
            ...(cleanHandle ? [{ telegramHandle: cleanHandle }] : [])
          ]
        }
      });

      if (botToken && existingUser?.telegramId) {
        try {
          await sendBotMessage(
            botToken,
            existingUser.telegramId,
            `🔐 <b>Код авторизации в TMA Builder:</b> <code>${code}</code>\n\nНикому не сообщайте этот проверочный код. Срок действия: 10 минут.`
          );
          sentDirectly = true;
        } catch (e) {
          console.warn("[TelegramAuth] Direct bot message failed:", e);
        }
      }

      // Link for user to open bot to receive prompt and confirm in 1 click or get code
      const botUrl = `https://t.me/${botUsername}?start=auth_${sessionId}`;

      res.json({
        success: true,
        sessionId,
        botUsername,
        botUrl,
        sentDirectly,
        message: sentDirectly
          ? "Код подтверждения успешно отправлен в ваш Telegram-чат с ботом"
          : `Код безопасности сформирован. Откройте @${botUsername} для подтверждения входа или введите код:`
      });
    } catch (err: any) {
      console.error("[TelegramAuth] send-code error:", err);
      res.status(500).json({ error: "Не удалось отправить код в Telegram" });
    }
  });

  // 5. Verify Telegram Code
  app.post("/api/auth/telegram/verify-code", async (req: Request, res: Response) => {
    try {
      const { phone, handle, code, sessionId, referralCode } = req.body;
      const cleanCode = String(code || "").trim();
      const normPhone = normalizePhone(phone);
      const cleanHandle = handle ? String(handle).replace(/^@/, "").trim().toLowerCase() : null;

      if (!cleanCode) {
        return res.status(400).json({ error: "Введите код подтверждения" });
      }

      const key = normPhone || cleanHandle;
      const savedInfo = key ? phoneCodeSessions.get(key) : null;
      const session = sessionId ? authSessions.get(sessionId) : null;

      const isValidCode =
        (savedInfo && savedInfo.code === cleanCode && savedInfo.expiresAt > Date.now()) ||
        (session && session.verificationCode === cleanCode && session.expiresAt > Date.now());

      if (!isValidCode) {
        return res.status(400).json({ error: "Неверный или устаревший проверочный код" });
      }

      // Resolve or create user
      const effectiveRef = referralCode || savedInfo?.referralCode || session?.referralCode;

      const authResult = await authenticateTelegramUser(db, {
        telegramId: session?.telegramUser?.id ? String(session.telegramUser.id) : (normPhone ? normPhone.replace(/\D/g, "") : String(Date.now())),
        username: cleanHandle || session?.telegramUser?.username || undefined,
        phone: normPhone || session?.phone || undefined,
        first_name: session?.telegramUser?.first_name || (cleanHandle ? `@${cleanHandle}` : undefined),
        referralCode: effectiveRef
      });

      // Clear sessions
      if (key) phoneCodeSessions.delete(key);
      if (session) {
        session.status = "CONFIRMED";
        session.token = authResult.token;
        session.user = authResult.user;
      }

      res.json(authResult);
    } catch (err: any) {
      console.error("[TelegramAuth] verify-code error:", err);
      res.status(500).json({ error: err.message || "Ошибка проверки кода" });
    }
  });
}
