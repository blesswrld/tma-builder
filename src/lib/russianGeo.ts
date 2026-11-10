// Russian Federation, CIS & Multi-Currency Geolocation & Mapping Utilities
// Guaranteed 100% Russian Localization — zero English/Latin names for addresses

export interface RussianCity {
  name: string;
  region: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  zoom: number;
}

export interface AddressSuggestion {
  label: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  countryCode?: string;
}

// Comprehensive database of major cities across Russia, Kazakhstan, Belarus & CIS
export const RUSSIAN_POPULAR_CITIES: RussianCity[] = [
  // --- Россия (RUB — ₽) ---
  { name: 'Грозный', region: 'Чеченская Республика', country: 'Россия', countryCode: 'ru', lat: 43.3179, lng: 45.6982, zoom: 13 },
  { name: 'Москва', region: 'г. Москва', country: 'Россия', countryCode: 'ru', lat: 55.7558, lng: 37.6173, zoom: 12 },
  { name: 'Санкт-Петербург', region: 'г. Санкт-Петербург', country: 'Россия', countryCode: 'ru', lat: 59.9343, lng: 30.3351, zoom: 12 },
  { name: 'Казань', region: 'Республика Татарстан', country: 'Россия', countryCode: 'ru', lat: 55.7961, lng: 49.1064, zoom: 13 },
  { name: 'Махачкала', region: 'Республика Дагестан', country: 'Россия', countryCode: 'ru', lat: 42.9849, lng: 47.5046, zoom: 13 },
  { name: 'Краснодар', region: 'Краснодарский край', country: 'Россия', countryCode: 'ru', lat: 45.0355, lng: 38.9753, zoom: 12 },
  { name: 'Сочи', region: 'Краснодарский край', country: 'Россия', countryCode: 'ru', lat: 43.5855, lng: 39.7231, zoom: 13 },
  { name: 'Владикавказ', region: 'Республика Северная Осетия', country: 'Россия', countryCode: 'ru', lat: 43.0367, lng: 44.6678, zoom: 13 },
  { name: 'Нальчик', region: 'Кабардино-Балкария', country: 'Россия', countryCode: 'ru', lat: 43.4853, lng: 43.6071, zoom: 13 },
  { name: 'Пятигорск', region: 'Ставропольский край', country: 'Россия', countryCode: 'ru', lat: 44.0486, lng: 43.0594, zoom: 13 },
  { name: 'Ставрополь', region: 'Ставропольский край', country: 'Россия', countryCode: 'ru', lat: 45.0433, lng: 41.9691, zoom: 12 },
  { name: 'Ростов-на-Дону', region: 'Ростовская область', country: 'Россия', countryCode: 'ru', lat: 47.2221, lng: 39.7188, zoom: 12 },
  { name: 'Екатеринбург', region: 'Свердловская область', country: 'Россия', countryCode: 'ru', lat: 56.8389, lng: 60.6057, zoom: 12 },
  { name: 'Новосибирск', region: 'Новосибирская область', country: 'Россия', countryCode: 'ru', lat: 55.0084, lng: 82.9357, zoom: 12 },
  { name: 'Нижний Новгород', region: 'Нижегородская область', country: 'Россия', countryCode: 'ru', lat: 56.3269, lng: 44.0059, zoom: 12 },
  { name: 'Самара', region: 'Самарская область', country: 'Россия', countryCode: 'ru', lat: 53.1959, lng: 50.1002, zoom: 12 },
  { name: 'Уфа', region: 'Республика Башкортостан', country: 'Россия', countryCode: 'ru', lat: 54.7388, lng: 55.9721, zoom: 12 },
  { name: 'Челябинск', region: 'Челябинская область', country: 'Россия', countryCode: 'ru', lat: 55.1644, lng: 61.4368, zoom: 12 },
  { name: 'Красноярск', region: 'Красноярский край', country: 'Россия', countryCode: 'ru', lat: 56.0153, lng: 92.8932, zoom: 12 },
  { name: 'Воронеж', region: 'Воронежская область', country: 'Россия', countryCode: 'ru', lat: 51.6608, lng: 39.2003, zoom: 12 },
  { name: 'Пермь', region: 'Пермский край', country: 'Россия', countryCode: 'ru', lat: 58.0105, lng: 56.2502, zoom: 12 },
  { name: 'Волгоград', region: 'Волгоградская область', country: 'Россия', countryCode: 'ru', lat: 48.7080, lng: 44.5133, zoom: 12 },
  { name: 'Саратов', region: 'Саратовская область', country: 'Россия', countryCode: 'ru', lat: 51.5335, lng: 46.0342, zoom: 12 },
  { name: 'Тюмень', region: 'Тюменская область', country: 'Россия', countryCode: 'ru', lat: 57.1530, lng: 65.5343, zoom: 12 },
  { name: 'Тольятти', region: 'Самарская область', country: 'Россия', countryCode: 'ru', lat: 53.5088, lng: 49.4192, zoom: 12 },
  { name: 'Барнаул', region: 'Алтайский край', country: 'Россия', countryCode: 'ru', lat: 53.3548, lng: 83.7698, zoom: 12 },
  { name: 'Ижевск', region: 'Удмуртская Республика', country: 'Россия', countryCode: 'ru', lat: 56.8528, lng: 53.2115, zoom: 12 },
  { name: 'Хабаровск', region: 'Хабаровский край', country: 'Россия', countryCode: 'ru', lat: 48.4802, lng: 135.0719, zoom: 12 },
  { name: 'Ульяновск', region: 'Ульяновская область', country: 'Россия', countryCode: 'ru', lat: 54.3142, lng: 48.4031, zoom: 12 },
  { name: 'Иркутск', region: 'Иркутская область', country: 'Россия', countryCode: 'ru', lat: 52.2870, lng: 104.3050, zoom: 12 },
  { name: 'Владивосток', region: 'Приморский край', country: 'Россия', countryCode: 'ru', lat: 43.1155, lng: 131.8855, zoom: 12 },
  { name: 'Ярославль', region: 'Ярославская область', country: 'Россия', countryCode: 'ru', lat: 57.6261, lng: 39.8845, zoom: 12 },
  { name: 'Севастополь', region: 'г. Севастополь', country: 'Россия', countryCode: 'ru', lat: 44.6160, lng: 33.5254, zoom: 12 },
  { name: 'Симферополь', region: 'Республика Крым', country: 'Россия', countryCode: 'ru', lat: 44.9521, lng: 34.1024, zoom: 12 },
  { name: 'Томск', region: 'Томская область', country: 'Россия', countryCode: 'ru', lat: 56.4977, lng: 84.9744, zoom: 12 },
  { name: 'Оренбург', region: 'Оренбургская область', country: 'Россия', countryCode: 'ru', lat: 51.7682, lng: 55.0970, zoom: 12 },
  { name: 'Кемерово', region: 'Кемеровская область', country: 'Россия', countryCode: 'ru', lat: 55.3549, lng: 86.0872, zoom: 12 },
  { name: 'Калининград', region: 'Калининградская область', country: 'Россия', countryCode: 'ru', lat: 54.7104, lng: 20.4522, zoom: 12 },
  { name: 'Магас', region: 'Республика Ингушетия', country: 'Россия', countryCode: 'ru', lat: 43.1678, lng: 44.8122, zoom: 13 },
  { name: 'Назрань', region: 'Республика Ингушетия', country: 'Россия', countryCode: 'ru', lat: 43.2272, lng: 44.7628, zoom: 13 },
  { name: 'Дербент', region: 'Республика Дагестан', country: 'Россия', countryCode: 'ru', lat: 42.0678, lng: 48.2899, zoom: 13 },
  { name: 'Каспийск', region: 'Республика Дагестан', country: 'Россия', countryCode: 'ru', lat: 42.8817, lng: 47.6394, zoom: 13 },
  { name: 'Хасавюрт', region: 'Республика Дагестан', country: 'Россия', countryCode: 'ru', lat: 43.2508, lng: 46.5872, zoom: 13 },
  { name: 'Черкесск', region: 'Карачаево-Черкесия', country: 'Россия', countryCode: 'ru', lat: 44.2233, lng: 42.0578, zoom: 13 },
  { name: 'Майкоп', region: 'Республика Адыгея', country: 'Россия', countryCode: 'ru', lat: 44.6089, lng: 40.1058, zoom: 13 },
  { name: 'Элиста', region: 'Республика Калмыкия', country: 'Россия', countryCode: 'ru', lat: 46.3078, lng: 44.2558, zoom: 13 },

  // --- Казахстан (KZT — ₸) ---
  { name: 'Алматы', region: 'г. Алматы', country: 'Казахстан', countryCode: 'kz', lat: 43.2389, lng: 76.8897, zoom: 12 },
  { name: 'Астана', region: 'г. Астана', country: 'Казахстан', countryCode: 'kz', lat: 51.1694, lng: 71.4491, zoom: 12 },
  { name: 'Шымкент', region: 'г. Шымкент', country: 'Казахстан', countryCode: 'kz', lat: 42.3417, lng: 69.5901, zoom: 12 },
  { name: 'Караганда', region: 'Карагандинская область', country: 'Казахстан', countryCode: 'kz', lat: 49.8047, lng: 73.1094, zoom: 12 },
  { name: 'Актобе', region: 'Актюбинская область', country: 'Казахстан', countryCode: 'kz', lat: 50.2839, lng: 57.1670, zoom: 12 },
  { name: 'Тараз', region: 'Жамбылская область', country: 'Казахстан', countryCode: 'kz', lat: 42.9000, lng: 71.3667, zoom: 12 },
  { name: 'Павлодар', region: 'Павлодарская область', country: 'Казахстан', countryCode: 'kz', lat: 52.2878, lng: 76.9674, zoom: 12 },
  { name: 'Усть-Каменогорск', region: 'Восточно-Казахстанская область', country: 'Казахстан', countryCode: 'kz', lat: 49.9500, lng: 82.6167, zoom: 12 },
  { name: 'Семей', region: 'Абайская область', country: 'Казахстан', countryCode: 'kz', lat: 50.4111, lng: 80.2275, zoom: 12 },
  { name: 'Атырау', region: 'Атырауская область', country: 'Казахстан', countryCode: 'kz', lat: 47.1167, lng: 51.8833, zoom: 12 },
  { name: 'Костанай', region: 'Костанайская область', country: 'Казахстан', countryCode: 'kz', lat: 53.2144, lng: 63.6246, zoom: 12 },
  { name: 'Кызылорда', region: 'Кызылординская область', country: 'Казахстан', countryCode: 'kz', lat: 44.8528, lng: 65.5092, zoom: 12 },
  { name: 'Уральск', region: 'Западно-Казахстанская область', country: 'Казахстан', countryCode: 'kz', lat: 51.2333, lng: 51.3667, zoom: 12 },
  { name: 'Актау', region: 'Мангистауская область', country: 'Казахстан', countryCode: 'kz', lat: 43.6500, lng: 51.1500, zoom: 12 },

  // --- Беларусь (BYN — Br) ---
  { name: 'Минск', region: 'г. Минск', country: 'Беларусь', countryCode: 'by', lat: 53.9006, lng: 27.5590, zoom: 12 },
  { name: 'Гомель', region: 'Гомельская область', country: 'Беларусь', countryCode: 'by', lat: 52.4345, lng: 30.9754, zoom: 12 },
  { name: 'Могилёв', region: 'Могилёвская область', country: 'Беларусь', countryCode: 'by', lat: 53.8981, lng: 30.3325, zoom: 12 },
  { name: 'Витебск', region: 'Витебская область', country: 'Беларусь', countryCode: 'by', lat: 55.1904, lng: 30.2049, zoom: 12 },
  { name: 'Гродно', region: 'Гродненская область', country: 'Беларусь', countryCode: 'by', lat: 53.6884, lng: 23.8258, zoom: 12 },
  { name: 'Брест', region: 'Брестская область', country: 'Беларусь', countryCode: 'by', lat: 52.0976, lng: 23.7341, zoom: 12 },
  { name: 'Бобруйск', region: 'Могилёвская область', country: 'Беларусь', countryCode: 'by', lat: 53.1384, lng: 29.2214, zoom: 12 },
  { name: 'Барановичи', region: 'Брестская область', country: 'Беларусь', countryCode: 'by', lat: 53.1327, lng: 26.0139, zoom: 12 },

  // --- Страны СНГ и соседи ---
  { name: 'Ереван', region: 'Армения', country: 'Армения', countryCode: 'am', lat: 40.1792, lng: 44.4991, zoom: 12 },
  { name: 'Бишкек', region: 'Кыргызстан', country: 'Кыргызстан', countryCode: 'kg', lat: 42.8746, lng: 74.5698, zoom: 12 },
  { name: 'Ташкент', region: 'Узбекистан', country: 'Узбекистан', countryCode: 'uz', lat: 41.2995, lng: 69.2401, zoom: 12 },
  { name: 'Самарканд', region: 'Узбекистан', country: 'Узбекистан', countryCode: 'uz', lat: 39.6542, lng: 66.9597, zoom: 12 },
  { name: 'Тбилиси', region: 'Грузия', country: 'Грузия', countryCode: 'ge', lat: 41.7151, lng: 44.8271, zoom: 12 },
  { name: 'Баку', region: 'Азербайджан', country: 'Азербайджан', countryCode: 'az', lat: 40.4093, lng: 49.8671, zoom: 12 }
];

// In-memory geocode cache
const geocodeCache = new Map<string, { lat: number; lng: number; formattedAddress: string }>();

// Russian Translation & Localization Dictionaries for Geocoding APIs
const ENGLISH_TO_RUSSIAN_TERMS: Record<string, string> = {
  // Street & Way Types
  'avenue': 'проспект',
  'ave': 'проспект',
  'street': 'улица',
  'st': 'улица',
  'boulevard': 'бульвар',
  'blvd': 'бульвар',
  'lane': 'переулок',
  'ln': 'переулок',
  'drive': 'проезд',
  'dr': 'проезд',
  'passage': 'проезд',
  'pass': 'проезд',
  'highway': 'шоссе',
  'hwy': 'шоссе',
  'road': 'улица',
  'rd': 'улица',
  'square': 'площадь',
  'sq': 'площадь',
  'embankment': 'набережная',
  'emb': 'набережная',
  'alley': 'аллея',
  'microdistrict': 'микрорайон',
  'microraion': 'микрорайон',
  'mkr': 'микрорайон',
  'quarter': 'квартал',
  'district': 'район',
  'raion': 'район',
  'region': 'область',
  'oblast': 'область',
  'krai': 'край',
  'kray': 'край',
  'republic': 'Республика',
  'okrug': 'округ',
  'city': 'г.',
  'town': 'город',
  'village': 'село',
  'settlement': 'посёлок',
  'building': 'д.',
  'bldg': 'д.',
  'house': 'д.',
  'apartment': 'кв.',
  'apt': 'кв.',

  // Notable Proper Names in Russia & CIS
  'nazarbayev': 'Назарбаева',
  'nazarbayeva': 'Назарбаева',
  'nursultan': 'Нурсултан',
  'putin': 'Путина',
  'putina': 'Путина',
  'kadyrov': 'Кадырова',
  'kadyrova': 'Кадырова',
  'esambayev': 'Эсамбаева',
  'esambaeva': 'Эсамбаева',
  'esambayeva': 'Эсамбаева',
  'lorsanov': 'Лорсанова',
  'lorsanova': 'Лорсанова',
  'sheripov': 'Шерипова',
  'sheripova': 'Шерипова',
  'dudayev': 'Дудаева',
  'dudayeva': 'Дудаева',
  'lenin': 'Ленина',
  'lenina': 'Ленина',
  'gagarin': 'Гагарина',
  'gagarina': 'Гагарина',
  'mira': 'Мира',
  'mir': 'Мира',
  'pobeda': 'Победы',
  'pobedy': 'Победы',
  'sovetskaya': 'Советская',
  'tsentralnaya': 'Центральная',
  'pushkin': 'Пушкина',
  'pushkina': 'Пушкина',
  'lermontov': 'Лермонтова',
  'lermontova': 'Лермонтова',
  'mayakovsky': 'Маяковского',
  'chekhov': 'Чехова',
  'tolstoy': 'Толстого',
  'abay': 'Абая',
  'abaya': 'Абая',
  'dostyk': 'Достык',
  'al-farabi': 'Аль-Фараби',
  'seifullin': 'Сейфуллина',
  'seifullina': 'Сейфуллина',
  'tole bi': 'Толе би',
  'kabanbay batyr': 'Кабанбай батыра',
  'nezavisimosti': 'Независимости',
  'pobediteley': 'Победителей',

  // Administrative Divisions & Regions
  'chechnya': 'Чеченская Республика',
  'chechen': 'Чеченская',
  'chechen republic': 'Чеченская Республика',
  'dagestan': 'Республика Дагестан',
  'ingushetia': 'Республика Ингушетия',
  'north ossetia': 'Северная Осетия',
  'kabardino-balkaria': 'Кабардино-Балкария',
  'karachay-cherkessia': 'Карачаево-Черкесия',
  'tatarstan': 'Республика Татарстан',
  'bashkortostan': 'Республика Башкортостан',
  'crimea': 'Республика Крым',
  'krasnodar krai': 'Краснодарский край',
  'stavropol krai': 'Ставропольский край',
  'rostov oblast': 'Ростовская область',
  'moscow oblast': 'Московская область',
  'leningrad oblast': 'Ленинградская область',
  'sverdlovsk oblast': 'Свердловская область',
  'novosibirsk oblast': 'Новосибирская область',
  'samara oblast': 'Самарская область',
  'nizhny novgorod oblast': 'Нижегородская область',

  // Major Cities
  'grozny': 'Грозный',
  'groznyy': 'Грозный',
  'moscow': 'Москва',
  'moskva': 'Москва',
  'saint petersburg': 'Санкт-Петербург',
  'st petersburg': 'Санкт-Петербург',
  'st. petersburg': 'Санкт-Петербург',
  'saint-petersburg': 'Санкт-Петербург',
  'spb': 'Санкт-Петербург',
  'kazan': 'Казань',
  'makhachkala': 'Махачкала',
  'krasnodar': 'Краснодар',
  'sochi': 'Сочи',
  'vladikavkaz': 'Владикавказ',
  'nalchik': 'Нальчик',
  'pyatigorsk': 'Пятигорск',
  'stavropol': 'Ставрополь',
  'rostov-on-don': 'Ростов-на-Дону',
  'rostov': 'Ростов-на-Дону',
  'yekaterinburg': 'Екатеринбург',
  'ekaterinburg': 'Екатеринбург',
  'novosibirsk': 'Новосибирск',
  'nizhny novgorod': 'Нижний Новгород',
  'samara': 'Самара',
  'ufa': 'Уфа',
  'chelyabinsk': 'Челябинск',
  'krasnoyarsk': 'Красноярск',
  'voronezh': 'Воронеж',
  'perm': 'Пермь',
  'volgograd': 'Волгоград',
  'saratov': 'Саратов',
  'tyumen': 'Тюмень',
  'tolyatti': 'Тольятти',
  'barnaul': 'Барнаул',
  'izhevsk': 'Ижевск',
  'khabarovsk': 'Хабаровск',
  'ulyanovsk': 'Ульяновск',
  'irkutsk': 'Иркутск',
  'vladivostok': 'Владивосток',
  'yaroslavl': 'Ярославль',
  'sevastopol': 'Севастополь',
  'simferopol': 'Симферополь',
  'tomsk': 'Томск',
  'orenburg': 'Оренбург',
  'kemerovo': 'Кемерово',
  'novokuznetsk': 'Новокузнецк',
  'ryazan': 'Рязань',
  'astrakhan': 'Астрахань',
  'penza': 'Пенза',
  'kirov': 'Киров',
  'lipetsk': 'Липецк',
  'cheboksary': 'Чебоксары',
  'kaliningrad': 'Калининград',
  'tula': 'Тула',
  'kursk': 'Курск',
  'surgut': 'Сургут',
  'tver': 'Тверь',
  'magas': 'Магас',
  'nazran': 'Назрань',
  'derbent': 'Дербент',
  'kaspiysk': 'Каспийск',
  'khasavyurt': 'Хасавюрт',
  'cherkessk': 'Черкесск',
  'maykop': 'Майкоп',
  'elista': 'Элиста',

  // Kazakhstan
  'almaty': 'Алматы',
  'alma-ata': 'Алматы',
  'astana': 'Астана',
  'nur-sultan': 'Астана',
  'shymkent': 'Шымкент',
  'karaganda': 'Караганда',
  'aktobe': 'Актобе',
  'taraz': 'Тараз',
  'pavlodar': 'Павлодар',
  'ust-kamenogorsk': 'Усть-Каменогорск',
  'semey': 'Семей',
  'atyrau': 'Атырау',
  'kostanay': 'Костанай',
  'kyzylorda': 'Кызылорда',
  'uralsk': 'Уральск',
  'petropavl': 'Петропавловск',
  'petropavlovsk': 'Петропавловск',
  'aktau': 'Актау',
  'temirtau': 'Темиртау',
  'turkestan': 'Туркестан',
  'turkistan': 'Туркестан',
  'kokshetau': 'Кокшетау',

  // Belarus
  'minsk': 'Минск',
  'gomel': 'Гомель',
  'mogilev': 'Могилёв',
  'vitebsk': 'Витебск',
  'grodno': 'Гродно',
  'brest': 'Брест',
  'bobruisk': 'Бобруйск',
  'baranovichi': 'Барановичи',
  'borisov': 'Борисов',
  'pinsk': 'Пинск',

  // Countries
  'russia': 'Россия',
  'russian federation': 'Россия',
  'kazakhstan': 'Казахстан',
  'republic of kazakhstan': 'Казахстан',
  'belarus': 'Беларусь',
  'republic of belarus': 'Беларусь',
  'belorussia': 'Беларусь',
  'armenia': 'Армения',
  'yerevan': 'Ереван',
  'kyrgyzstan': 'Кыргызстан',
  'bishkek': 'Бишкек',
  'uzbekistan': 'Узбекистан',
  'tashkent': 'Ташкент',
  'samarkand': 'Самарканд',
  'georgia': 'Грузия',
  'tbilisi': 'Тбилиси',
  'batumi': 'Батуми',
  'azerbaijan': 'Азербайджан',
  'baku': 'Баку',
  'united states': 'США',
  'usa': 'США',
  'germany': 'Германия',
  'france': 'Франция',
  'italy': 'Италия',
  'spain': 'Испания',
  'turkey': 'Турция',
  'uae': 'ОАЭ'
};

// Transliteration table for Russian phonetic transcription of Latin names
const LATIN_TO_CYRILLIC_MAP: Record<string, string> = {
  'shch': 'щ', 'yo': 'ё', 'zh': 'ж', 'kh': 'х', 'ts': 'ц', 'ch': 'ч', 'sh': 'ш',
  'yu': 'ю', 'ya': 'я', 'ye': 'е', 'iy': 'ий', 'ij': 'ий',
  'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'z': 'з', 'i': 'и',
  'j': 'й', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р',
  's': 'с', 't': 'т', 'u': 'у', 'f': 'ф', 'h': 'х', 'c': 'к', 'y': 'ы',
  'q': 'к', 'w': 'в', 'x': 'кс'
};

/**
 * Transliterates Latin text to Russian Cyrillic if any untranslated Latin remains.
 */
export function transliterateToRussian(str: string): string {
  if (!/[a-zA-Z]/.test(str)) return str;

  let result = str;
  // Multi-character replacements first
  const multiPairs: [RegExp, string][] = [
    [/shch/gi, 'щ'],
    [/yo/gi, 'ё'],
    [/zh/gi, 'ж'],
    [/kh/gi, 'х'],
    [/ts/gi, 'ц'],
    [/ch/gi, 'ч'],
    [/sh/gi, 'ш'],
    [/yu/gi, 'ю'],
    [/ya/gi, 'я'],
    [/ye/gi, 'е'],
    [/iy\b/gi, 'ий'],
    [/ij\b/gi, 'ий'],
    [/jj\b/gi, 'й']
  ];

  for (const [re, cyr] of multiPairs) {
    result = result.replace(re, (match) => {
      const isUpper = match[0] === match[0].toUpperCase();
      return isUpper ? cyr.charAt(0).toUpperCase() + cyr.slice(1) : cyr;
    });
  }

  // Single characters
  let finalCyr = '';
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    const lower = char.toLowerCase();
    if (LATIN_TO_CYRILLIC_MAP[lower]) {
      const cyr = LATIN_TO_CYRILLIC_MAP[lower];
      finalCyr += char === char.toUpperCase() ? cyr.toUpperCase() : cyr;
    } else {
      finalCyr += char;
    }
  }

  return finalCyr;
}

/**
 * Ensures complete Russian localization for any address or geographical component.
 * Converts all English/Latin terms (e.g. "Nazarbayev Avenue", "Grozny", "Chechnya")
 * into authentic Russian Cyrillic ("проспект Назарбаева", "Грозный", "Чеченская Республика").
 */
export function localizeToRussian(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  // Split by comma to preserve address hierarchy
  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);

  const localizedParts = parts.map((part) => {
    const lowerPart = part.toLowerCase();

    // 1. Direct dictionary match for the whole segment
    if (ENGLISH_TO_RUSSIAN_TERMS[lowerPart]) {
      return ENGLISH_TO_RUSSIAN_TERMS[lowerPart];
    }

    // 2. Word-by-word replacement and syntax reordering
    // Handle cases like "Nazarbayev Avenue" -> "проспект Назарбаева"
    let workingPart = part;

    // Replace English street descriptors
    const streetTypes = [
      { en: /\bavenue\b/gi, ru: 'проспект' },
      { en: /\bave\.?\b/gi, ru: 'проспект' },
      { en: /\bstreet\b/gi, ru: 'улица' },
      { en: /\bst\.?\b/gi, ru: 'улица' },
      { en: /\bboulevard\b/gi, ru: 'бульвар' },
      { en: /\bblvd\.?\b/gi, ru: 'бульвар' },
      { en: /\blane\b/gi, ru: 'переулок' },
      { en: /\bln\.?\b/gi, ru: 'переулок' },
      { en: /\bdrive\b/gi, ru: 'проезд' },
      { en: /\bdr\.?\b/gi, ru: 'проезд' },
      { en: /\bhighway\b/gi, ru: 'шоссе' },
      { en: /\bhwy\.?\b/gi, ru: 'шоссе' },
      { en: /\bsquare\b/gi, ru: 'площадь' },
      { en: /\bsq\.?\b/gi, ru: 'площадь' },
      { en: /\bembankment\b/gi, ru: 'набережная' },
      { en: /\bdistrict\b/gi, ru: 'район' },
      { en: /\bregion\b/gi, ru: 'область' },
      { en: /\boblast\b/gi, ru: 'область' },
      { en: /\bkrai\b/gi, ru: 'край' },
      { en: /\brepublic\b/gi, ru: 'Республика' }
    ];

    let foundType = '';
    for (const st of streetTypes) {
      if (st.en.test(workingPart)) {
        foundType = st.ru;
        workingPart = workingPart.replace(st.en, '').trim();
        break;
      }
    }

    // Translate remaining words
    const words = workingPart.split(/\s+/).filter(Boolean);
    const translatedWords = words.map((w) => {
      const cleanW = w.toLowerCase().replace(/[^\w-]/g, '');
      if (ENGLISH_TO_RUSSIAN_TERMS[cleanW]) {
        return ENGLISH_TO_RUSSIAN_TERMS[cleanW];
      }
      if (/[a-zA-Z]/.test(w)) {
        return transliterateToRussian(w);
      }
      return w;
    });

    let reconstructed = translatedWords.join(' ').trim();
    if (foundType) {
      // Grammatically natural Russian order: "проспект Назарбаева" or "улица Пушкина"
      if (foundType === 'проспект' || foundType === 'бульвар' || foundType === 'переулок' || foundType === 'проезд' || foundType === 'шоссе') {
        reconstructed = `${foundType} ${reconstructed}`.trim();
      } else if (foundType === 'район' || foundType === 'область' || foundType === 'край') {
        reconstructed = `${reconstructed} ${foundType}`.trim();
      } else {
        reconstructed = `${foundType} ${reconstructed}`.trim();
      }
    }

    return reconstructed || part;
  });

  return localizedParts.join(', ');
}

/**
 * Format address components into a clean, 100% Russian human-readable string
 */
function formatRussianAddressString(props: {
  city?: string;
  road?: string;
  street?: string;
  housenumber?: string;
  house?: string;
  district?: string;
  state?: string;
  country?: string;
  name?: string;
}): { title: string; subtitle: string; full: string } {
  const rawCity = props.city || props.district || '';
  const rawRoad = props.road || props.street || props.name || '';
  const house = (props.housenumber || props.house || '').trim();
  const rawState = props.state || '';
  const rawCountry = props.country || '';

  const city = localizeToRussian(rawCity);
  let road = localizeToRussian(rawRoad);
  const state = localizeToRussian(rawState);
  const country = localizeToRussian(rawCountry);

  // Avoid repetitive city name inside road
  if (city && road.toLowerCase() === city.toLowerCase()) {
    road = '';
  }

  let title = road;
  if (house) {
    if (road) {
      // If road already has "д." or "дом", don't duplicate
      if (/\b(д\.|дом)\b/i.test(house)) {
        title = `${road}, ${house}`;
      } else {
        title = `${road}, д. ${house}`;
      }
    } else {
      title = `д. ${house}`;
    }
  } else if (!road && city) {
    title = city;
  } else if (!road && !city) {
    title = localizeToRussian(props.name || 'Точка на карте');
  }

  const subParts: string[] = [];
  if (city && !title.includes(city)) subParts.push(city);
  if (state && state !== city && !subParts.includes(state)) subParts.push(state);
  if (country && country !== 'Россия' && !subParts.includes(country)) subParts.push(country);

  const subtitle = subParts.join(', ') || 'Россия';
  const full = title ? `${title}, ${subtitle}` : subtitle;

  return { title, subtitle, full };
}

/**
 * Autocomplete suggestions for all existing addresses across:
 * - Russian Federation (all 89 regions, cities, towns, streets, buildings)
 * - Kazakhstan (KZT currency)
 * - Belarus (BYN currency)
 * - Other supported currency countries
 *
 * Fully localized to Russian — guaranteed 0% English words in labels or subtitles.
 */
export async function searchRussianAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  const clean = (query || '').trim();
  if (clean.length < 2) return [];

  const results: AddressSuggestion[] = [];
  const seenKeys = new Set<string>();

  // 1. Instant match in comprehensive cities directory (Russia, Kazakhstan, Belarus)
  const queryLower = clean.toLowerCase();
  const cityMatches = RUSSIAN_POPULAR_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(queryLower) ||
      c.region.toLowerCase().includes(queryLower) ||
      c.country.toLowerCase().includes(queryLower)
  ).slice(0, 4);

  for (const c of cityMatches) {
    const key = `${c.name}_${c.lat}_${c.lng}`;
    seenKeys.add(key);
    const subtitle = c.country === 'Россия' ? c.region : `${c.region}, ${c.country}`;
    results.push({
      label: `${c.name}, ${subtitle}`,
      title: c.name,
      subtitle,
      lat: c.lat,
      lng: c.lng,
      countryCode: c.countryCode
    });
  }

  // 2. Primary Online Provider: Nominatim OpenStreetMap with full Russian Localization
  // OpenStreetMap contains all real-world registered addresses, streets and building numbers in RF and CIS
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    // Target countries corresponding to supported currencies: RU, KZ, BY, AM, KG, UZ, GE
    const countryCodesParam = 'countrycodes=ru,kz,by,am,kg,uz,ge';
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&${countryCodesParam}&addressdetails=1&accept-language=ru,ru-RU;q=0.9&limit=8&q=${encodeURIComponent(clean)}`;

    const nomRes = await fetch(nomUrl, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'ru, ru-RU;q=0.9, en;q=0.1',
        'User-Agent': 'TMA-App-UnifiedGeo/3.0'
      }
    });
    clearTimeout(timeoutId);

    if (nomRes.ok) {
      const data = await nomRes.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const key = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);

          const addr = item.address || {};
          const countryCode = (addr.country_code || '').toLowerCase();

          const formatted = formatRussianAddressString({
            city: addr.city || addr.town || addr.village || addr.settlement || addr.municipality,
            street: addr.road || addr.pedestrian || addr.street,
            housenumber: addr.house_number,
            district: addr.city_district || addr.suburb,
            state: addr.state,
            country: addr.country,
            name: item.name
          });

          // Ensure 100% Russian Cyrillic representation
          const localizedTitle = localizeToRussian(formatted.title || item.display_name.split(',')[0]);
          const localizedSubtitle = localizeToRussian(
            formatted.subtitle || item.display_name.split(',').slice(1, 3).join(', ').trim()
          );

          results.push({
            label: `${localizedTitle}, ${localizedSubtitle}`,
            title: localizedTitle,
            subtitle: localizedSubtitle,
            lat,
            lng,
            countryCode
          });

          if (results.length >= 10) break;
        }
      }
    }
  } catch (err) {
    console.warn('[Geo] Nominatim primary search failed, falling back to Photon:', err);
  }

  // 3. Secondary Online Provider: Photon API (Fast OSM Geocoder) if more suggestions needed
  if (results.length < 5) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2800);

      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(clean)}&limit=8`;
      const res = await fetch(photonUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.features)) {
          for (const feat of data.features) {
            const p = feat.properties || {};
            const coords = feat.geometry?.coordinates;
            if (!coords || coords.length < 2) continue;

            const countryCode = (p.countrycode || '').toLowerCase();
            // Allow Russia, Kazakhstan, Belarus, CIS and international currency countries
            const allowedCountries = new Set(['ru', 'kz', 'by', 'am', 'kg', 'uz', 'ge', 'us', 'de', 'fr', 'it', 'es']);
            if (countryCode && !allowedCountries.has(countryCode)) continue;

            const lng = coords[0];
            const lat = coords[1];
            const key = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);

            const formatted = formatRussianAddressString({
              city: p.city || p.town || p.village,
              street: p.street || p.name,
              housenumber: p.housenumber,
              district: p.district,
              state: p.state,
              country: p.country,
              name: p.name
            });

            const localizedTitle = localizeToRussian(formatted.title);
            const localizedSubtitle = localizeToRussian(formatted.subtitle);

            results.push({
              label: `${localizedTitle}, ${localizedSubtitle}`,
              title: localizedTitle,
              subtitle: localizedSubtitle,
              lat,
              lng,
              countryCode
            });

            if (results.length >= 10) break;
          }
        }
      }
    } catch (err) {
      console.warn('[Geo] Photon secondary query error:', err);
    }
  }

  return results;
}

/**
 * Searches coordinates and formatted Russian address for any address string.
 */
export async function geocodeRussianAddress(address: string): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  const clean = (address || '').trim();
  if (!clean) return null;

  const cacheKey = clean.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // 1. Direct match in popular cities directory (Russia, Kazakhstan, Belarus)
  const directCity = RUSSIAN_POPULAR_CITIES.find(
    (c) =>
      c.name.toLowerCase() === clean.toLowerCase() ||
      `${c.name}, ${c.region}`.toLowerCase() === clean.toLowerCase() ||
      `${c.name}, ${c.country}`.toLowerCase() === clean.toLowerCase()
  );
  if (directCity) {
    const formattedAddress =
      directCity.country === 'Россия'
        ? `${directCity.name}, ${directCity.region}`
        : `${directCity.name}, ${directCity.region}, ${directCity.country}`;
    const res = { lat: directCity.lat, lng: directCity.lng, formattedAddress };
    geocodeCache.set(cacheKey, res);
    return res;
  }

  // 2. Query Nominatim with Russian parameters
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ru,kz,by,am,kg,uz,ge&addressdetails=1&accept-language=ru,ru-RU;q=0.9&limit=1&q=${encodeURIComponent(clean)}`;
    const nomResp = await fetch(nomUrl, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'ru, ru-RU;q=0.9',
        'User-Agent': 'TMA-App-UnifiedGeo/3.0'
      }
    });
    clearTimeout(timeoutId);

    if (nomResp.ok) {
      const data = await nomResp.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const addr = item.address || {};
        const formatted = formatRussianAddressString({
          city: addr.city || addr.town || addr.village || addr.settlement,
          street: addr.road || addr.pedestrian || addr.street,
          housenumber: addr.house_number,
          district: addr.city_district || addr.suburb,
          state: addr.state,
          country: addr.country,
          name: item.name
        });

        const localized = localizeToRussian(formatted.full || item.display_name);
        const res = { lat, lng, formattedAddress: localized };
        geocodeCache.set(cacheKey, res);
        return res;
      }
    }
  } catch (err) {
    console.warn('[Geo] Nominatim geocode failed:', err);
  }

  // 3. Fallback to Photon geocoding
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(clean)}&limit=1`;
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        const feat = data.features[0];
        const coords = feat.geometry?.coordinates;
        if (coords && coords.length >= 2) {
          const lng = coords[0];
          const lat = coords[1];
          const p = feat.properties || {};
          const formatted = formatRussianAddressString({
            city: p.city || p.town || p.village,
            street: p.street || p.name,
            housenumber: p.housenumber,
            district: p.district,
            state: p.state,
            country: p.country,
            name: p.name
          });

          const localized = localizeToRussian(formatted.full || clean);
          const res = { lat, lng, formattedAddress: localized };
          geocodeCache.set(cacheKey, res);
          return res;
        }
      }
    }
  } catch (err) {
    console.warn('[Geo] Photon geocode fallback failed:', err);
  }

  // 4. Substring city matching in directory
  const matchedCity = RUSSIAN_POPULAR_CITIES.find((c) =>
    clean.toLowerCase().includes(c.name.toLowerCase())
  );
  if (matchedCity) {
    const res = {
      lat: matchedCity.lat,
      lng: matchedCity.lng,
      formattedAddress: localizeToRussian(clean)
    };
    geocodeCache.set(cacheKey, res);
    return res;
  }

  // Default fallback: Grozny center
  const defaultCity = RUSSIAN_POPULAR_CITIES[0];
  return { lat: defaultCity.lat, lng: defaultCity.lng, formattedAddress: localizeToRussian(clean) };
}

/**
 * Reverse geocodes coordinates to a human-readable Russian street address.
 * Prioritizes Nominatim with `accept-language=ru` to avoid English names
 * (e.g. returns "проспект Назарбаева, Грозный, Чеченская Республика", never English "Nazarbayev Avenue, Grozny, Chechnya").
 */
export async function reverseGeocodeRussian(lat: number, lng: number): Promise<string> {
  // 1. Primary: Nominatim OpenStreetMap Reverse with strict Russian Language Header
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=ru,ru-RU;q=0.9`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'ru, ru-RU;q=0.9, en;q=0.1',
        'User-Agent': 'TMA-App-UnifiedGeo/3.0'
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.address) {
        const a = data.address;
        const formatted = formatRussianAddressString({
          city: a.city || a.town || a.village || a.settlement || a.county,
          street: a.road || a.pedestrian || a.street,
          housenumber: a.house_number,
          district: a.city_district || a.suburb,
          state: a.state,
          country: a.country,
          name: data.name
        });

        if (formatted.full) {
          return localizeToRussian(formatted.full);
        }
        if (data.display_name) {
          return localizeToRussian(data.display_name.split(',').slice(0, 3).join(', ').trim());
        }
      }
    }
  } catch (err) {
    console.warn('[Geo] Nominatim primary reverse geocode error:', err);
  }

  // 2. Secondary: Photon reverse geocode, translated via Russian Localization Engine
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        const p = data.features[0].properties || {};
        const formatted = formatRussianAddressString({
          city: p.city || p.town || p.village,
          street: p.street || p.name,
          housenumber: p.housenumber,
          district: p.district,
          state: p.state,
          country: p.country,
          name: p.name
        });
        if (formatted.full) {
          return localizeToRussian(formatted.full);
        }
      }
    }
  } catch (err) {
    console.warn('[Geo] Photon reverse geocoding fallback failed:', err);
  }

  // 3. Coordinate fallback with nearest known city
  const closestCity = RUSSIAN_POPULAR_CITIES.reduce(
    (prev, curr) => {
      const d = calculateDistanceKm(lat, lng, curr.lat, curr.lng);
      return d < prev.dist ? { city: curr, dist: d } : prev;
    },
    { city: RUSSIAN_POPULAR_CITIES[0], dist: Infinity }
  );

  if (closestCity.dist <= 15) {
    return `${closestCity.city.name} (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Calculate distance in km between two lat/lng coordinates (Haversine formula)
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance in meters or kilometers (e.g. "450 м" or "3.2 км")
 */
export function formatDistanceString(km: number): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} м`;
  }
  return `${km.toFixed(1)} км`;
}

/**
 * External navigation URLs for Russian and regional mapping apps
 */
export function getExternalMapLinks(params: { address: string; lat?: number; lng?: number; shopName?: string }) {
  const { address, lat, lng, shopName } = params;
  const cleanAddress = localizeToRussian(address);
  const encodedAddress = encodeURIComponent(cleanAddress);
  const query = shopName ? encodeURIComponent(`${shopName}, ${cleanAddress}`) : encodedAddress;

  const yandexMapsUrl = lat && lng
    ? `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto`
    : `https://yandex.ru/maps/?text=${query}`;

  const twoGisUrl = lat && lng
    ? `https://2gis.ru/geo/${lng},${lat}`
    : `https://2gis.ru/search/${query}`;

  const googleMapsUrl = lat && lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;

  return {
    yandex: yandexMapsUrl,
    twoGis: twoGisUrl,
    google: googleMapsUrl
  };
}
