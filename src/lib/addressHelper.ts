import { CITIES_DATA } from "../components/CityDropdown";
import { RUSSIAN_POPULAR_CITIES } from "./russianGeo";

// Consolidated list of all known Russian and CIS cities
export interface CityOption {
  id: string;
  name: string;
  region?: string;
  country?: string;
  popular?: boolean;
}

// Build unique list of cities
const cityMap = new Map<string, CityOption>();

// 1. Add from CITIES_DATA
CITIES_DATA.forEach((c) => {
  if (!cityMap.has(c.name.toLowerCase())) {
    cityMap.set(c.name.toLowerCase(), {
      id: c.id,
      name: c.name,
      region: c.region,
      country: c.country || "Россия",
      popular: c.popular,
    });
  }
});

// 2. Add from RUSSIAN_POPULAR_CITIES
RUSSIAN_POPULAR_CITIES.forEach((c) => {
  const key = c.name.toLowerCase();
  if (!cityMap.has(key)) {
    cityMap.set(key, {
      id: key.replace(/[^a-zа-я0-9]/gi, "-"),
      name: c.name,
      region: c.region,
      country: c.country || "Россия",
      popular: ["Грозный", "Москва", "Санкт-Петербург", "Казань", "Сочи", "Екатеринбург", "Махачкала", "Краснодар", "Новосибирск"].includes(c.name),
    });
  }
});

export const ALL_CITY_OPTIONS: CityOption[] = Array.from(cityMap.values());

// Set of lowercase city names for instant lookup
export const KNOWN_CITY_NAMES_LOWER = new Set(ALL_CITY_OPTIONS.map((c) => c.name.toLowerCase()));

/**
 * Проверка на недопустимый текст или клавиатурный мусор (gibberish/spam)
 */
export function isInvalidAddressText(text: string): { isInvalid: boolean; reason?: string } {
  if (!text || !text.trim()) return { isInvalid: false };
  const clean = text.trim();

  // 1. Недопустимые спецсимволы, которых не бывает в адресах
  if (/[<>{}$^*~=%@;?!\\]/.test(clean)) {
    return { isInvalid: true, reason: "Адрес содержит недопустимые спецсимволы" };
  }

  const lower = clean.toLowerCase();

  // 2. Повторение одного символа 4+ раз подряд (например: ааааа, 1111, .....)
  if (/(.)\1{3,}/.test(lower)) {
    return { isInvalid: true, reason: "Обнаружен спам (повторяющиеся символы)" };
  }

  // 3. Повторение слогов 3+ раза подряд (например: вфывфывфы, blablabla, testtesttest, qweqweqwe)
  if (/(.{2,5})\1{2,}/i.test(lower)) {
    return { isInvalid: true, reason: "Обнаружен некорректный ввод (повторяющийся набор знаков)" };
  }

  // 4. Клавиатурные спам-последовательности
  const spamSequences = [
    "asdf", "qwer", "zxcv", "йцук", "фыва", "ячсм",
    "вфы", "фыв", "йцу", "цыв", "вап", "прол", "asdfg",
    "123456", "111111", "000000", "777777", "999999", "qwerty", "123123"
  ];
  if (spamSequences.some((seq) => lower.includes(seq))) {
    return { isInvalid: true, reason: "Обнаружен клавиатурный спам (случайное нажатие клавиш)" };
  }

  // 5. Строка из 5+ согласных подряд без гласных букв
  const lettersOnly = lower.replace(/[^a-zа-яёіїєґәғқңөұүhҷ]/g, "");
  if (lettersOnly.length >= 5) {
    const vowelsCount = (lettersOnly.match(/[aeiouyаеёиоуыэюяіїєәөұү]/g) || []).length;
    if (vowelsCount === 0) {
      return { isInvalid: true, reason: "Текст не содержит гласных букв (не является адресом)" };
    }
  }

  return { isInvalid: false };
}

/**
 * Извлекает город и улицу из строки адреса
 */
export function extractCityAndStreet(rawAddress: string | null | undefined): {
  city: string;
  street: string;
} {
  if (!rawAddress || !rawAddress.trim()) {
    return { city: "", street: "" };
  }

  let text = rawAddress
    .trim()
    .replace(/^Россия,\s*/i, "")
    .replace(/^РФ,\s*/i, "");

  // Проверяем совпадение с известными городами
  let matchedCity = "";
  let matchedCityOriginal = "";

  for (const option of ALL_CITY_OPTIONS) {
    const cityName = option.name;
    // Регулярка для точного слова города
    const reg = new RegExp(`(^|[\\s,.;]|^г\\.\\s*|^г\\s*)${cityName}([\\s,.;]|$)`, "i");
    if (reg.test(text)) {
      matchedCity = cityName;
      matchedCityOriginal = cityName;
      break;
    }
  }

  if (matchedCity) {
    // Удаляем название города из строки, чтобы получить улицу
    let remaining = text
      .replace(new RegExp(`(^|[\\s,.;])г\\.\\s*${matchedCity}([\\s,.;]|$)`, "gi"), "$1$2")
      .replace(new RegExp(`(^|[\\s,.;])город\\s*${matchedCity}([\\s,.;]|$)`, "gi"), "$1$2")
      .replace(new RegExp(`(^|[\\s,.;])${matchedCity}([\\s,.;]|$)`, "gi"), "$1$2")
      .replace(/^[,\s.-]+|[,\s.-]+$/g, "")
      .replace(/\s*,\s*,+/g, ",")
      .trim();

    return {
      city: matchedCityOriginal,
      street: remaining,
    };
  }

  // Если точного города в базе нет, пробуем выделить первую часть до запятой, если это похоже на город
  const parts = text.split(",").map((p) => p.trim());
  if (parts.length > 1) {
    const candidateCity = parts[0].replace(/^г\.\s*/i, "").trim();
    if (candidateCity.length >= 2 && candidateCity.length <= 35 && !/\d/.test(candidateCity)) {
      return {
        city: candidateCity,
        street: parts.slice(1).join(", ").trim(),
      };
    }
  }

  // Если одна часть без запятых и без цифр — возможно это просто город
  if (text.length >= 2 && text.length <= 35 && !/\d/.test(text) && !isInvalidAddressText(text).isInvalid) {
    const cleanCity = text.replace(/^г\.\s*/i, "").trim();
    return {
      city: cleanCity,
      street: "",
    };
  }

  return {
    city: "",
    street: text,
  };
}

/**
 * Собирает итоговую строку адреса из города и улицы
 */
export function formatFullAddress(city: string, street?: string): string {
  const cleanCity = (city || "").replace(/^г\.\s*/i, "").trim();
  const cleanStreet = (street || "").replace(/^[,\s.-]+|[,\s.-]+$/g, "").trim();

  if (!cleanCity && !cleanStreet) return "";
  if (!cleanCity) return cleanStreet;
  if (!cleanStreet) return `г. ${cleanCity}`;

  return `г. ${cleanCity}, ${cleanStreet}`;
}

/**
 * Валидация адреса: город обязателен, улица опциональна (но проверяется на мусор)
 */
export function validatePhysicalAddress(
  city: string,
  street?: string,
  options?: { requireStreet?: boolean }
): { isValid: boolean; error?: string; formatted: string } {
  const cleanCity = (city || "").replace(/^г\.\s*/i, "").trim();
  const cleanStreet = (street || "").trim();

  // 1. Проверка города
  if (!cleanCity) {
    return {
      isValid: false,
      error: "Выберите город из выпадающего списка",
      formatted: "",
    };
  }

  const citySpamCheck = isInvalidAddressText(cleanCity);
  if (citySpamCheck.isInvalid) {
    return {
      isValid: false,
      error: citySpamCheck.reason || "Недопустимое название города",
      formatted: "",
    };
  }

  // 2. Проверка улицы
  if (cleanStreet) {
    const streetSpamCheck = isInvalidAddressText(cleanStreet);
    if (streetSpamCheck.isInvalid) {
      return {
        isValid: false,
        error: streetSpamCheck.reason || "Недопустимое значение улицы/дома",
        formatted: "",
      };
    }

    if (cleanStreet.length < 2) {
      return {
        isValid: false,
        error: "Название улицы слишком короткое (минимум 2 символа)",
        formatted: "",
      };
    }

    if (cleanStreet.length > 150) {
      return {
        isValid: false,
        error: "Адрес улицы слишком длинный (максимум 150 символов)",
        formatted: "",
      };
    }
  } else if (options?.requireStreet) {
    return {
      isValid: false,
      error: "Укажите улицу и номер дома для доставки",
      formatted: "",
    };
  }

  return {
    isValid: true,
    formatted: formatFullAddress(cleanCity, cleanStreet),
  };
}
