/**
 * Валидация данных для СНГ (CIS) рынка с защитой от спама и некорректного ввода
 */

// Резервированные URL-слаги, которые нельзя занимать
export const RESERVED_SLUGS = new Set([
  "admin", "api", "login", "register", "shop", "shops", "null", "undefined",
  "checkout", "orders", "app", "settings", "user", "profile", "cart",
  "dashboard", "auth", "public", "static", "bot", "telegram", "webhook",
  "pay", "payment", "success", "cancel", "help", "support", "faq"
]);

/**
 * Проверка на случайный спам клавиш (keyboard mash / repeating characters)
 */
export function isGibberish(text: string): boolean {
  if (!text || text.length < 3) return false;
  const clean = text.toLowerCase().trim();

  // 1. Повторение одного и того же символа 4+ раз подряд (напр. "ааааа", "11111", ".....")
  if (/(.)\1{3,}/.test(clean)) {
    return true;
  }

  // 2. Стандартные последовательности клавиатурного спама
  const knownSpamSequences = [
    "asdf", "qwer", "zxcv", "йцук", "фыва", "ячсм",
    "123456", "111111", "000000", "777777", "999999", "qwerty", "123123"
  ];
  if (knownSpamSequences.some(seq => clean.includes(seq))) {
    return true;
  }

  // 3. Строка из одних согласных или без гласных букв длиной более 5 символов
  const lettersOnly = clean.replace(/[^a-zа-яёіїєґәғқңөұүhҷ]/g, '');
  if (lettersOnly.length >= 5) {
    const vowelsCount = (lettersOnly.match(/[aeiouyаеёиоуыэюяіїєәөұү]/g) || []).length;
    if (vowelsCount === 0) {
      return true;
    }
  }

  return false;
}

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
 * Генерация уникального URL-слага из случайных слогов и корней названия
 */
export function generateRandomSyllableSlug(name: string, previousSlugs?: string | string[]): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "";

  const translit = cleanSlugForSubmit(transliterateToSlug(trimmed));
  const words = translit.split('-').filter(Boolean);

  const excludedSet = new Set<string>();
  if (translit) excludedSet.add(translit);

  if (Array.isArray(previousSlugs)) {
    previousSlugs.forEach(s => {
      const clean = cleanSlugForSubmit(s);
      if (clean) excludedSet.add(clean);
    });
  } else if (previousSlugs) {
    const clean = cleanSlugForSubmit(previousSlugs);
    if (clean) excludedSet.add(clean);
  }

  const syllables = [
    "zen", "vibe", "nova", "hub", "spot", "loft", "bar", "lab", 
    "box", "pro", "mix", "bay", "lux", "co", "go", "one", 
    "star", "flow", "wave", "craft", "joy", "top", "zone", "fox", 
    "lumi", "sol", "orbit", "pulse", "nord", "apex", "aura", "echo", 
    "kai", "rio", "nero", "flux", "tide", "core", "neon", "drift",
    "prime", "mint", "spark", "pure", "glow", "nest", "haven", "bloom"
  ];

  const shortSyllables = [
    "ka", "ro", "vi", "ta", "lu", "ze", "no", "mi", "ba", "fo", 
    "da", "re", "ko", "pa", "si", "ti", "la", "mo", "xi", "zo",
    "ne", "va", "le", "to", "yu", "ma", "sa", "pe", "ri", "go"
  ];

  const roots: string[] = [];
  for (const w of words) {
    if (w.length >= 3) {
      roots.push(w.slice(0, Math.min(w.length, 5)));
      if (w.length > 5) {
        roots.push(w.slice(0, 3));
      }
    } else if (w.length > 0) {
      roots.push(w);
    }
  }

  const baseRoot = roots[0] || "shop";
  const secondRoot = roots[1] || "";

  for (let i = 0; i < 60; i++) {
    const r1 = syllables[Math.floor(Math.random() * syllables.length)];
    const r2 = syllables[Math.floor(Math.random() * syllables.length)];
    const s1 = shortSyllables[Math.floor(Math.random() * shortSyllables.length)];
    const s2 = shortSyllables[Math.floor(Math.random() * shortSyllables.length)];
    const num = Math.floor(Math.random() * 89 + 10);
    const shortNum = Math.floor(Math.random() * 9 + 1);

    const templates = [
      `${baseRoot}-${r1}`,
      `${r1}-${baseRoot}`,
      secondRoot ? `${baseRoot}-${secondRoot}-${s1}` : `${baseRoot}-${s1}-${s2}`,
      secondRoot ? `${baseRoot}-${s1}-${secondRoot}` : `${baseRoot}-${r1}-${shortNum}`,
      `${baseRoot}${s1}-${r1}`,
      `${r1}-${baseRoot}-${num}`,
      `${baseRoot}-${s1}${s2}`,
      `${baseRoot}-${s1}-${num}`,
      `${r1}-${s1}-${baseRoot}`,
      `${baseRoot}-${r1}-${r2}`,
      `${s1}${s2}-${baseRoot}`,
      `${baseRoot}-${num}${s1}`,
      secondRoot ? `${secondRoot}-${r1}-${shortNum}` : `${baseRoot}-${r2}-${num}`
    ];

    const chosen = cleanSlugForSubmit(templates[Math.floor(Math.random() * templates.length)]);

    if (
      chosen &&
      !excludedSet.has(chosen) &&
      !RESERVED_SLUGS.has(chosen) &&
      chosen.length >= 3 &&
      chosen.length <= 25
    ) {
      return chosen;
    }
  }

  // Guaranteed fallback
  for (let attempt = 0; attempt < 10; attempt++) {
    const fallbackSyl = syllables[Math.floor(Math.random() * syllables.length)];
    const randomHex = Math.random().toString(36).substring(2, 6);
    const candidate = `${baseRoot.slice(0, 4)}-${fallbackSyl}-${randomHex}`;
    if (!excludedSet.has(candidate) && !RESERVED_SLUGS.has(candidate)) {
      return candidate;
    }
  }

  const fallbackSyl = syllables[Math.floor(Math.random() * syllables.length)];
  const fallbackNum = Math.floor(Math.random() * 899 + 100);
  return `${baseRoot.slice(0, 4)}-${fallbackSyl}-${fallbackNum}`;
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
 * Автоматическое форматирование номера телефона при вводе в реальном времени
 */
export function formatPhoneInputLive(val: string): string {
  if (!val) return "";
  const digits = val.replace(/\D/g, "");
  if (!digits) return "";

  // Если первая цифра 7 или 8 — форматируем как +7 (XXX) XXX-XX-XX
  if (digits.startsWith("7") || digits.startsWith("8")) {
    const rest = digits.slice(1);
    let res = "+7";
    if (rest.length > 0) res += ` (${rest.slice(0, 3)}`;
    if (rest.length >= 3) res += `) ${rest.slice(3, 6)}`;
    if (rest.length >= 6) res += `-${rest.slice(6, 8)}`;
    if (rest.length >= 8) res += `-${rest.slice(8, 10)}`;
    return res;
  }

  // Если начинается с 375 (Беларусь)
  if (digits.startsWith("375")) {
    const rest = digits.slice(3);
    let res = "+375";
    if (rest.length > 0) res += ` (${rest.slice(0, 2)}`;
    if (rest.length >= 2) res += `) ${rest.slice(2, 5)}`;
    if (rest.length >= 5) res += `-${rest.slice(5, 7)}`;
    if (rest.length >= 7) res += `-${rest.slice(7, 9)}`;
    return res;
  }

  // Если начинается с 998 (Узбекистан)
  if (digits.startsWith("998")) {
    const rest = digits.slice(3);
    let res = "+998";
    if (rest.length > 0) res += ` (${rest.slice(0, 2)}`;
    if (rest.length >= 2) res += `) ${rest.slice(2, 5)}`;
    if (rest.length >= 5) res += `-${rest.slice(5, 7)}`;
    if (rest.length >= 7) res += `-${rest.slice(7, 9)}`;
    return res;
  }

  // Если начинается с 9 (российский мобильный без +7)
  if (digits.startsWith("9")) {
    let res = "+7 (" + digits.slice(0, 3);
    if (digits.length >= 3) res += `) ${digits.slice(3, 6)}`;
    if (digits.length >= 6) res += `-${digits.slice(6, 8)}`;
    if (digits.length >= 8) res += `-${digits.slice(8, 10)}`;
    return res;
  }

  // Общий международный
  return val.startsWith("+") ? `+${digits}` : `+${digits}`;
}

/**
 * Валидация и нормализация номеров телефонов СНГ
 * Защищает от фальшивых номеров вида +7777777777, +7000000000, 1111111111 и т.д.
 */
export function validateCisPhone(phoneInput: string): { isValid: boolean; formatted: string; error?: string } {
  if (!phoneInput || !phoneInput.trim()) {
    return { isValid: false, formatted: "", error: "Укажите номер телефона" };
  }

  let raw = phoneInput.trim().replace(/[^\d+]/g, '');

  if (raw.startsWith('8') && raw.length === 11 && !raw.startsWith('+')) {
    raw = '+7' + raw.slice(1);
  } else if (!raw.startsWith('+')) {
    if (raw.startsWith('7') && raw.length === 11) {
      raw = '+' + raw;
    } else if (raw.startsWith('9') && raw.length === 10) {
      raw = '+7' + raw;
    } else {
      raw = '+' + raw;
    }
  }

  const digitsOnly = raw.replace(/\D/g, '');

  // 1. Проверка на одинаковые повторяющиеся цифры (напр. 77777777777, 00000000000)
  if (/^(\d)\1{7,}$/.test(digitsOnly)) {
    return { isValid: false, formatted: raw, error: "Укажите настоящий номер телефона, а не повторяющиеся цифры" };
  }

  // 2. Проверка последовательностей типа 1234567890
  if (digitsOnly.includes("12345678") || digitsOnly.includes("98765432")) {
    return { isValid: false, formatted: raw, error: "Укажите реальный номер телефона" };
  }

  // РФ / Казахстан: +7 (11 цифр всего)
  if (raw.startsWith('+7')) {
    if (digitsOnly.length !== 11) {
      return { isValid: false, formatted: raw, error: "Номер телефона (+7) должен содержать 11 цифр: +7 (9XX) XXX-XX-XX" };
    }
    const d = digitsOnly.slice(1);
    // Проверка первой цифры кода региона / оператора (для РФ 9xx - мобильные, 3xx/4xx/8xx - городские)
    const firstCodeDigit = d[0];
    if (firstCodeDigit === '0' || firstCodeDigit === '1' || firstCodeDigit === '2') {
      return { isValid: false, formatted: raw, error: "Некорректный код оператора. Номер должен начинаться с +7 (9XX)..." };
    }
    const formatted = `+7 (${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6,8)}-${d.slice(8,10)}`;
    return { isValid: true, formatted };
  }

  if (raw.startsWith('+375')) {
    if (digitsOnly.length !== 12) {
      return { isValid: false, formatted: raw, error: "Номер Беларуси (+375) должен содержать 9 цифр после кода: +375 (XX) XXX-XX-XX" };
    }
    const d = digitsOnly.slice(3);
    const formatted = `+375 (${d.slice(0,2)}) ${d.slice(2,5)}-${d.slice(5,7)}-${d.slice(7,9)}`;
    return { isValid: true, formatted };
  }

  if (raw.startsWith('+998')) {
    if (digitsOnly.length !== 12) {
      return { isValid: false, formatted: raw, error: "Номер Узбекистана (+998) должен содержать 9 цифр после кода: +998 (XX) XXX-XX-XX" };
    }
    const d = digitsOnly.slice(3);
    const formatted = `+998 (${d.slice(0,2)}) ${d.slice(2,5)}-${d.slice(5,7)}-${d.slice(7,9)}`;
    return { isValid: true, formatted };
  }

  if (raw.startsWith('+380')) {
    if (digitsOnly.length !== 12) {
      return { isValid: false, formatted: raw, error: "Номер (+380) должен содержать 12 цифр" };
    }
    const d = digitsOnly.slice(3);
    const formatted = `+380 (${d.slice(0,2)}) ${d.slice(2,5)}-${d.slice(5,7)}-${d.slice(7,9)}`;
    return { isValid: true, formatted };
  }

  if (raw.startsWith('+996') || raw.startsWith('+992') || raw.startsWith('+994') || raw.startsWith('+995')) {
    if (digitsOnly.length !== 12) {
      return { isValid: false, formatted: raw, error: "Номер должен содержать 12 цифр (включая код страны)" };
    }
    return { isValid: true, formatted: `+${digitsOnly}` };
  }

  if (raw.startsWith('+374') || raw.startsWith('+373') || raw.startsWith('+993')) {
    if (digitsOnly.length !== 11) {
      return { isValid: false, formatted: raw, error: "Номер должен содержать 11 цифр (включая код страны)" };
    }
    return { isValid: true, formatted: `+${digitsOnly}` };
  }

  // Общий международный формат (E.164): 10..15 цифр
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return { isValid: true, formatted: `+${digitsOnly}` };
  }

  return { isValid: false, formatted: raw, error: "Введите корректный номер телефона (например, +7 965 951-57-11)" };
}

/**
 * Валидация имени клиента (ФИО) с защитой от спама
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
    return { isValid: false, formatted: trimmed, error: "Имя слишком длинное (максимум 60 символов)" };
  }

  if (isGibberish(trimmed)) {
    return { isValid: false, formatted: trimmed, error: "Укажите настоящее имя (без случайного набора букв)" };
  }

  // Только буквы, пробелы, дефисы и апострофы
  const nameRegex = /^[a-zA-Zа-яА-ЯёЁіІїЇєЄґҐәӘғҒқҚңҢөӨұҰүҮhHҷҶ\s\-']+$/;
  if (!nameRegex.test(trimmed)) {
    return { isValid: false, formatted: trimmed, error: "Имя может содержать только буквы, пробелы и дефис" };
  }

  return { isValid: true, formatted: trimmed };
}

/**
 * Строгая валидация адреса доставки (Курьер или Почта/СДЭК)
 * Предотвращает отправку бессмысленного текста или неполных данных
 */
export function validateDeliveryAddress(
  addressInput: string,
  options?: {
    city?: string;
    fulfillmentMethod?: "courier" | "shipping" | "pickup" | "online" | string;
  }
): { isValid: boolean; address: string; error?: string } {
  const method = options?.fulfillmentMethod || "courier";
  const city = options?.city?.trim() || "";
  const rawAddress = (addressInput || "").trim().replace(/\s+/g, ' ');

  // 1. Проверка города (если передается отдельно или нужен)
  if ((method === "courier" || method === "shipping") && !city && !rawAddress) {
    return { isValid: false, address: "", error: "Выберите город и укажите адрес доставки" };
  }

  if (!rawAddress) {
    return {
      isValid: false,
      address: "",
      error: method === "shipping"
        ? "Укажите индекс/адрес отделения Почты или ПВЗ СДЭК"
        : "Укажите улицу и номер дома"
    };
  }

  // 2. Защита от спама клавиш (aaaaa, asdfg, 11111)
  if (isGibberish(rawAddress)) {
    return { isValid: false, address: rawAddress, error: "Укажите реальный адрес (обнаружен некорректный ввод)" };
  }

  // 3. Минимальная длина
  if (rawAddress.length < 4) {
    return { isValid: false, address: rawAddress, error: "Адрес слишком короткий (укажите улицу и номер дома)" };
  }

  if (rawAddress.length > 250) {
    return { isValid: false, address: rawAddress, error: "Адрес слишком длинный (максимум 250 символов)" };
  }

  // 4. Проверка структуры для курьерской доставки:
  // Должно быть название улицы (буквы) и номер дома (цифра или ключевое слово д./дом/кв/корпус/строение)
  if (method === "courier") {
    const hasDigits = /\d+/.test(rawAddress);
    const hasHouseKeywords = /(дом|д\.|кв|квартира|корпус|корп|стр|строение|блок|мкр|микрорайон|уч|участок|пер|переулок|пр|проспект|ул|улица)/i.test(rawAddress);
    const hasLetters = /[a-zA-Zа-яА-ЯёЁ]/.test(rawAddress);

    if (!hasLetters) {
      return { isValid: false, address: rawAddress, error: "Адрес должен содержать название улицы" };
    }

    if (!hasDigits && !hasHouseKeywords && rawAddress.split(' ').length < 2) {
      return {
        isValid: false,
        address: rawAddress,
        error: "Укажите не только улицу, но и номер дома (например: ул. Мира, д. 15)"
      };
    }
  }

  // 5. Проверка для Почты / СДЭК
  if (method === "shipping") {
    const hasPostalIndex = /\b\d{6}\b/.test(rawAddress);
    const hasPvzKeywords = /(сдэк|cdek|почт|пвз|отделени|пункт|выдач|индекс|boxberry)/i.test(rawAddress);
    const hasAddressDetails = rawAddress.length >= 6;

    if (!hasPostalIndex && !hasPvzKeywords && !hasAddressDetails) {
      return {
        isValid: false,
        address: rawAddress,
        error: "Укажите 6-значный почтовый индекс или адрес пункта выдачи СДЭК"
      };
    }
  }

  // Формируем полный адрес с городом
  const fullAddress = city && !rawAddress.toLowerCase().includes(city.toLowerCase())
    ? `г. ${city}, ${rawAddress}`
    : rawAddress;

  return { isValid: true, address: fullAddress };
}

/**
 * Валидация адреса (обратная совместимость)
 */
export function validateAddress(addressInput: string): { isValid: boolean; address: string; error?: string } {
  return validateDeliveryAddress(addressInput, { fulfillmentMethod: "courier" });
}

/**
 * Валидация токена Telegram бота (Bot Token)
 */
export function validateTelegramBotToken(tokenInput?: string): { isValid: boolean; token: string; error?: string } {
  if (!tokenInput || !tokenInput.trim()) {
    return { isValid: true, token: "" };
  }

  const token = tokenInput.trim();
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
    return { isValid: true, chatId: "" };
  }

  const chatId = chatIdInput.trim();
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
    return { isValid: false, price: num, error: "Цена должна быть больше 0 ₽" };
  }

  if (num > 10000000) {
    return { isValid: false, price: num, error: "Цена не может превышать 10 000 000 ₽" };
  }

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

  if (isGibberish(name)) {
    return { isValid: false, name, error: "Название заведения не должно содержать бессмысленный набор букв" };
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

  if (isGibberish(title)) {
    return { isValid: false, title, error: "Укажите понятное название товара" };
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
    // If date is passed in YYYY-MM-DD format, consider it valid until end of that day
    const dateStr = expiresAt.includes("T") ? expiresAt : `${expiresAt}T23:59:59.999`;
    const expDate = new Date(dateStr);
    if (isNaN(expDate.getTime())) {
      return { isValid: false, error: "Некорректная дата окончания действия" };
    }
    if (expDate.getTime() < Date.now()) {
      return { isValid: false, error: "Срок действия промокода не может быть в прошлом" };
    }
  }

  return { isValid: true };
}
