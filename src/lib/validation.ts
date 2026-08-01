/**
 * Валидация данных для СНГ (CIS) рынка
 */

// Резервированные URL-слаги, которые нельзя занимать
export const RESERVED_SLUGS = new Set([
  "admin", "api", "login", "register", "shop", "shops", "null", "undefined",
  "checkout", "orders", "app", "settings", "user", "profile", "cart",
  "dashboard", "auth", "public", "static", "bot", "telegram", "webhook",
  "pay", "payment", "success", "cancel", "help", "support", "faq"
]);

/**
 * Транслитерация кириллицы в латиницу (слаг)
 */
export function transliterateToSlug(str: string): string {
  if (!str) return "";
  const ruMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'і': 'i', 'ї': 'yi', 'є': 'ye', 'ґ': 'g', 'ә': 'a', 'ғ': 'g', 'қ': 'q',
    'ң': 'n', 'ө': 'o', 'ұ': 'u', 'ү': 'u', 'h': 'h', 'ҷ': 'j'
  };

  const transliterated = String(str)
    .toLowerCase()
    .split('')
    .map(char => ruMap[char] !== undefined ? ruMap[char] : char)
    .join('');

  return transliterated
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Очистка и обрезка слага для финального сохранения/запроса
 */
export function cleanSlugForSubmit(str: string): string {
  return transliterateToSlug(str).replace(/^-+|-+$/g, '');
}

/**
 * Проверка валидности URL-слага
 */
export function validateSlug(slugInput: string): { isValid: boolean; cleanSlug: string; error?: string } {
  const cleanSlug = cleanSlugForSubmit(slugInput);

  if (!cleanSlug) {
    return { isValid: false, cleanSlug: "", error: "Введите URL-адрес (slug)" };
  }

  if (cleanSlug.length < 2 || cleanSlug.length > 30) {
    return { isValid: false, cleanSlug, error: "Slug должен содержать от 2 до 30 латинских символов, цифр или дефисов" };
  }

  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!slugRegex.test(cleanSlug)) {
    return { isValid: false, cleanSlug, error: "Slug не может начинаться или заканчиваться дефисом и содержать двойные дефисы" };
  }

  if (RESERVED_SLUGS.has(cleanSlug)) {
    return { isValid: false, cleanSlug, error: "Этот URL-адрес зарезервирован системой" };
  }

  return { isValid: true, cleanSlug };
}

/**
 * Валидация и нормализация номеров телефонов СНГ
 * Поддерживает: Россия/Казахстан (+7/8), Беларусь (+375), Узбекистан (+998),
 * Украина (+380), Кыргызстан (+996), Таджикистан (+992), Армения (+374),
 * Азербайджан (+994), Молдова (+373), Туркменистан (+993), Грузия (+995)
 */
export function validateCisPhone(phoneInput: string): { isValid: boolean; formatted: string; error?: string } {
  if (!phoneInput || !phoneInput.trim()) {
    return { isValid: false, formatted: "", error: "Укажите номер телефона" };
  }

  // Удаляем все нецифровые символы, кроме ведущего +
  let raw = phoneInput.trim().replace(/[^\d+]/g, '');

  // Если номер начинается с 8 и имеет 11 цифр (формат РФ/РК без кода страны)
  if (raw.startsWith('8') && raw.length === 11 && !raw.startsWith('+')) {
    raw = '+7' + raw.slice(1);
  } else if (!raw.startsWith('+')) {
    // Если плюс не ввели, добавляем
    if (raw.startsWith('7') && raw.length === 11) {
      raw = '+' + raw;
    } else if (raw.startsWith('375') || raw.startsWith('998') || raw.startsWith('380') || raw.startsWith('996') || raw.startsWith('992') || raw.startsWith('374') || raw.startsWith('994') || raw.startsWith('373') || raw.startsWith('993') || raw.startsWith('995')) {
      raw = '+' + raw;
    } else {
      raw = '+' + raw;
    }
  }

  const digitsOnly = raw.replace(/\D/g, '');

  // Маски и длины по кодам стран СНГ
  if (raw.startsWith('+7')) {
    // РФ / РК: +7 + 10 цифр = 11 цифр всего
    if (digitsOnly.length !== 11) {
      return { isValid: false, formatted: raw, error: "Номер телефона (+7) должен состоять из 11 цифр, например +7 999 123-45-67" };
    }
    const d = digitsOnly.slice(1);
    const formatted = `+7 (${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6,8)}-${d.slice(8,10)}`;
    return { isValid: true, formatted };
  }

  if (raw.startsWith('+375')) {
    // Беларусь: +375 + 9 цифр = 12 цифр всего
    if (digitsOnly.length !== 12) {
      return { isValid: false, formatted: raw, error: "Номер Беларуси (+375) должен содержать 9 цифр после кода страны" };
    }
    const d = digitsOnly.slice(3);
    const formatted = `+375 (${d.slice(0,2)}) ${d.slice(2,5)}-${d.slice(5,7)}-${d.slice(7,9)}`;
    return { isValid: true, formatted };
  }

  if (raw.startsWith('+998')) {
    // Узбекистан: +998 + 9 цифр = 12 цифр всего
    if (digitsOnly.length !== 12) {
      return { isValid: false, formatted: raw, error: "Номер Узбекистана (+998) должен содержать 9 цифр после кода страны" };
    }
    const d = digitsOnly.slice(3);
    const formatted = `+998 (${d.slice(0,2)}) ${d.slice(2,5)}-${d.slice(5,7)}-${d.slice(7,9)}`;
    return { isValid: true, formatted };
  }

  if (raw.startsWith('+380')) {
    // Украина: +380 + 9 цифр = 12 цифр
    if (digitsOnly.length !== 12) {
      return { isValid: false, formatted: raw, error: "Номер (+380) должен содержать 9 цифр после кода страны" };
    }
    const d = digitsOnly.slice(3);
    const formatted = `+380 (${d.slice(0,2)}) ${d.slice(2,5)}-${d.slice(5,7)}-${d.slice(7,9)}`;
    return { isValid: true, formatted };
  }

  if (raw.startsWith('+996') || raw.startsWith('+992') || raw.startsWith('+994') || raw.startsWith('+995')) {
    // Кыргызстан, Таджикистан, Азербайджан, Грузия (12 цифр)
    if (digitsOnly.length !== 12) {
      return { isValid: false, formatted: raw, error: "Номер должен содержать 12 цифр (включая код страны)" };
    }
    const formatted = `+${digitsOnly}`;
    return { isValid: true, formatted };
  }

  if (raw.startsWith('+374') || raw.startsWith('+373') || raw.startsWith('+993')) {
    // Армения, Молдова, Туркменистан (11 цифр)
    if (digitsOnly.length !== 11) {
      return { isValid: false, formatted: raw, error: "Номер должен содержать 11 цифр (включая код страны)" };
    }
    const formatted = `+${digitsOnly}`;
    return { isValid: true, formatted };
  }

  // Общий международный формат (E.164): 10..15 цифр
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return { isValid: true, formatted: `+${digitsOnly}` };
  }

  return { isValid: false, formatted: raw, error: "Введите корректный номер телефона СНГ (напр. +7 999 123-45-67 или +375 29 123-45-67)" };
}

/**
 * Валидация имени клиента (ФИО)
 */
export function validateCustomerName(name: string): { isValid: boolean; formatted: string; error?: string } {
  if (!name || !name.trim()) {
    return { isValid: false, formatted: "", error: "Укажите ваше имя" };
  }

  const trimmed = name.trim().replace(/\s+/g, ' ');

  if (trimmed.length < 2) {
    return { isValid: false, formatted: trimmed, error: "Имя должно содержать не менее 2 символов" };
  }

  if (trimmed.length > 60) {
    return { isValid: false, formatted: trimmed, error: "Имя слишком длинное (макс. 60 символов)" };
  }

  // Токны кириллица (ru, uk, be, kk, uz), латиница, дефисы и апострофы
  const nameRegex = /^[a-zA-Zа-яА-ЯёЁіІїЇєЄґҐәӘғҒқҚңҢөӨұҰүҮhHҷҶ\s\-']+$/;
  if (!nameRegex.test(trimmed)) {
    return { isValid: false, formatted: trimmed, error: "Имя может содержать только буквы, пробелы и дефис" };
  }

  return { isValid: true, formatted: trimmed };
}

/**
 * Валидация токена Telegram бота (Bot Token)
 */
export function validateTelegramBotToken(tokenInput?: string): { isValid: boolean; token: string; error?: string } {
  if (!tokenInput || !tokenInput.trim()) {
    return { isValid: true, token: "" }; // Опциональное поле
  }

  const token = tokenInput.trim();
  // Формат от @BotFather: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789
  const botTokenRegex = /^\d{8,11}:[A-Za-z0-9_-]{35,50}$/;

  if (!botTokenRegex.test(token)) {
    return { isValid: false, token, error: "Некорректный Bot Token. Скопируйте токен от @BotFather (напр. 1234567890:ABC-DEF1234ghIkl-zyx57)" };
  }

  return { isValid: true, token };
}

/**
 * Валидация Telegram Chat ID
 */
export function validateTelegramChatId(chatIdInput?: string): { isValid: boolean; chatId: string; error?: string } {
  if (!chatIdInput || !chatIdInput.trim()) {
    return { isValid: true, chatId: "" }; // Опциональное поле
  }

  const chatId = chatIdInput.trim();
  // Либо личный ID (положительное число, 5-12 цифр), либо ID группы/канала (начинается с - или -100, 5-15 цифр)
  const chatIdRegex = /^-?\d{5,15}$/;

  if (!chatIdRegex.test(chatId)) {
    return { isValid: false, chatId, error: "Некорректный Chat ID. Должно быть число от @userinfobot (напр. 123456789 или -100123456789)" };
  }

  return { isValid: true, chatId };
}

/**
 * Валидация Email
 */
export function validateEmail(emailInput: string): { isValid: boolean; email: string; error?: string } {
  if (!emailInput || !emailInput.trim()) {
    return { isValid: false, email: "", error: "Введите адрес электронной почты" };
  }

  const email = emailInput.trim().toLowerCase();

  if (email.length < 5 || email.length > 100) {
    return { isValid: false, email, error: "Email должен содержать от 5 до 100 символов" };
  }

  // Строгая проверка структуры e-mail без двойных точек и со спецификацией СНГ почт
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}$/;
  if (!emailRegex.test(email) || email.includes("..") || email.startsWith(".") || email.includes("@.")) {
    return { isValid: false, email, error: "Введите корректный e-mail адрес (напр. user@mail.ru)" };
  }

  return { isValid: true, email };
}

/**
 * Валидация пароля
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: "Введите пароль" };
  }

  if (password.length < 6) {
    return { isValid: false, error: "Пароль должен содержать минимум 6 символов" };
  }

  if (password.length > 100) {
    return { isValid: false, error: "Пароль слишком длинный (максимум 100 символов)" };
  }

  return { isValid: true };
}

/**
 * Валидация цены товара / услуги
 */
export function validatePrice(priceInput: number | string): { isValid: boolean; price: number; error?: string } {
  if (priceInput === undefined || priceInput === null || String(priceInput).trim() === "") {
    return { isValid: false, price: 0, error: "Укажите цену товара" };
  }

  const num = typeof priceInput === "number" ? priceInput : parseFloat(String(priceInput).replace(',', '.'));

  if (isNaN(num)) {
    return { isValid: false, price: 0, error: "Цена должна быть числом" };
  }

  if (num <= 0) {
    return { isValid: false, price: num, error: "Цена должна быть больше 0" };
  }

  if (num > 10000000) {
    return { isValid: false, price: num, error: "Цена не может превышать 10 000 000" };
  }

  // Округление до 2 знаков после запятой
  const roundedPrice = Math.round(num * 100) / 100;

  return { isValid: true, price: roundedPrice };
}

/**
 * Валидация названия заведения / магазина
 */
export function validateShopName(nameInput: string): { isValid: boolean; name: string; error?: string } {
  if (!nameInput || !nameInput.trim()) {
    return { isValid: false, name: "", error: "Введите название заведения" };
  }

  const name = nameInput.trim().replace(/\s+/g, ' ');

  if (name.length < 2) {
    return { isValid: false, name, error: "Название должно содержать не менее 2 символов" };
  }

  if (name.length > 60) {
    return { isValid: false, name, error: "Название слишком длинное (максимум 60 символов)" };
  }

  return { isValid: true, name };
}

/**
 * Валидация названия товара / позиции
 */
export function validateItemTitle(titleInput: string): { isValid: boolean; title: string; error?: string } {
  if (!titleInput || !titleInput.trim()) {
    return { isValid: false, title: "", error: "Введите название товара" };
  }

  const title = titleInput.trim().replace(/\s+/g, ' ');

  if (title.length < 2) {
    return { isValid: false, title, error: "Название товара должно содержать не менее 2 символов" };
  }

  if (title.length > 100) {
    return { isValid: false, title, error: "Название товара слишком длинное (максимум 100 символов)" };
  }

  return { isValid: true, title };
}

/**
 * Валидация промокода
 */
export function validatePromoCodeData(
  code: string,
  discount: number | string,
  discountType: "percent" | "fixed",
  minOrderAmount?: number | string,
  expiresAt?: string
): { isValid: boolean; error?: string } {
  if (!code || !code.trim()) {
    return { isValid: false, error: "Введите код промокода" };
  }

  const cleanCode = code.trim().toUpperCase();
  const codeRegex = /^[A-Z0-9_-]{2,20}$/;
  if (!codeRegex.test(cleanCode)) {
    return { isValid: false, error: "Код промокода должен содержать от 2 до 20 символов (латинские буквы, цифры, дефис)" };
  }

  const numDiscount = typeof discount === "number" ? discount : parseFloat(String(discount));
  if (isNaN(numDiscount) || numDiscount <= 0) {
    return { isValid: false, error: "Размер скидки должен быть положительным числом" };
  }

  if (discountType === "percent" && numDiscount > 100) {
    return { isValid: false, error: "Процент скидки не может превышать 100%" };
  }

  if (discountType === "fixed" && numDiscount > 1000000) {
    return { isValid: false, error: "Фиксированная скидка слишком велика" };
  }

  if (minOrderAmount !== undefined && minOrderAmount !== null && String(minOrderAmount).trim() !== "") {
    const minAmt = typeof minOrderAmount === "number" ? minOrderAmount : parseFloat(String(minOrderAmount));
    if (isNaN(minAmt) || minAmt < 0) {
      return { isValid: false, error: "Минимальная сумма заказа не может быть отрицательной" };
    }
  }

  if (expiresAt && expiresAt.trim()) {
    const expDate = new Date(expiresAt);
    if (isNaN(expDate.getTime())) {
      return { isValid: false, error: "Некорректная дата окончания действия" };
    }
    // Срок действия не может быть в прошлом
    if (expDate.getTime() < Date.now() - 60000) {
      return { isValid: false, error: "Срок действия промокода не может быть в прошлом" };
    }
  }

  return { isValid: true };
}

/**
 * Валидация адреса доставки
 */
export function validateAddress(addressInput: string): { isValid: boolean; address: string; error?: string } {
  if (!addressInput || !addressInput.trim()) {
    return { isValid: false, address: "", error: "Укажите адрес доставки" };
  }

  const address = addressInput.trim().replace(/\s+/g, ' ');

  if (address.length < 5) {
    return { isValid: false, address, error: "Адрес должен быть подробнее (минимум 5 символов: город, улица, дом)" };
  }

  if (address.length > 250) {
    return { isValid: false, address, error: "Адрес слишком длинный (максимум 250 символов)" };
  }

  return { isValid: true, address };
}
