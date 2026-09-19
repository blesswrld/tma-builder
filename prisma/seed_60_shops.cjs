const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const OWNER_ID = "cmsag3jam0000s60dysw23ltf";

const SHOPS_DATA = [
  // 1. Кофейни & Завтраки
  {
    slug: "surf-coffee-flacon",
    name: "Surf Coffee x Flacon",
    description: "Культовая кофейня со спешелти зерном, свежей выпечкой и калифорнийской атмосферой.",
    logoUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
    address: "Москва, ул. Большая Новодмитровская, 36",
    phone: "+7 (495) 120-45-67",
    workingHours: "Пн-Вс: 08:00 – 22:00",
    isOpen: true,
    cashbackPercent: 7,
    delivery: { courier: true, takeaway: true, minOrder: 600, deliveryFee: 150 },
    category: "Кофейни",
    services: [
      { title: "Флэт Уайт на кокосовом", price: 380, category: "Кофе", imageUrl: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=400&q=80" },
      { title: "Фильтр-кофе Эфиопия", price: 250, category: "Кофе", imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80" },
      { title: "Круассан с миндальным кремом", price: 320, category: "Выпечка", imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 5, author: "Михаил", comment: "Лучший фильтр в районе Савеловской!" }]
  },
  {
    slug: "skuratov-coffee-dmitrovka",
    name: "Скуратов Кофе",
    description: "Брю-бар родом из Сибири. Знаменитый колд брю, нитро кофе и авторские напитки.",
    logoUrl: "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    address: "Москва, ул. Большая Дмитровка, 9",
    phone: "+7 (495) 933-21-44",
    workingHours: "Пн-Вс: 07:30 – 23:00",
    isOpen: true,
    cashbackPercent: 10,
    delivery: { courier: true, takeaway: true, minOrder: 500, deliveryFee: 120 },
    category: "Кофейни",
    services: [
      { title: "Нитро Колд Брю", price: 390, category: "Кофе", imageUrl: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=400&q=80" },
      { title: "Раф Халва с карамелью", price: 420, category: "Авторский кофе", imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=400&q=80" },
      { title: "Печенье с шоколадными каплями", price: 180, category: "Десерты", imageUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 5, author: "Анна С.", comment: "Любимое место на Дмитровке. Очень атмосферно." }]
  },
  {
    slug: "drinkit-pokrovka",
    name: "Дринкит Покровка",
    description: "Умная цифровая кофейня: авторский кофе с кастомизацией в один клик через Mini App.",
    logoUrl: "https://images.unsplash.com/photo-1497636577773-f1231844b336?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80",
    address: "Москва, ул. Покровка, 19",
    phone: "+7 (800) 555-35-35",
    workingHours: "Пн-Вс: 07:00 – 22:00",
    isOpen: true,
    cashbackPercent: 5,
    delivery: { courier: true, takeaway: true, minOrder: 400, deliveryFee: 100 },
    category: "Кофейни",
    services: [
      { title: "Матча Латте Земляничный", price: 360, category: "Чай & Матча", imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=400&q=80" },
      { title: "Капучино Grand 400мл", price: 290, category: "Кофе", imageUrl: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=400&q=80" },
      { title: "Тост со страчателлой и томатами", price: 450, category: "Завтраки", imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.8, author: "Денис", comment: "Очень быстро готовят заказ, кофе топ!" }]
  },
  {
    slug: "coffee-therapy-spb",
    name: "Coffee Therapy",
    description: "Уютный кофейный уголок на улице Рубинштейна. Авторские десерты и спешелти кофе.",
    logoUrl: "https://images.unsplash.com/photo-1507133750040-3a4f5bd86e8e?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80",
    address: "Санкт-Петербург, ул. Рубинштейна, 12",
    phone: "+7 (812) 640-20-11",
    workingHours: "Пн-Вс: 09:00 – 21:00",
    isOpen: true,
    cashbackPercent: 6,
    delivery: { courier: false, takeaway: true },
    category: "Кофейни",
    services: [
      { title: "Бамбл Кофе с апельсиновым фрешем", price: 390, category: "Кофе", imageUrl: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=400&q=80" },
      { title: "Чизкейк Сан-Себастьян", price: 380, category: "Десерты", imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 5, author: "Елена П.", comment: "Лучший Сан-Себастьян в Петербурге!" }]
  },
  {
    slug: "cooperative-black",
    name: "Кооператив Черный",
    description: "Микро-обжарка и философия чистого черного кофе. Только лучшие мировые лоты.",
    logoUrl: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=1200&q=80",
    address: "Москва, пер. Лялин, 20",
    phone: "+7 (495) 777-18-90",
    workingHours: "Пн-Вс: 08:00 – 20:00",
    isOpen: true,
    cashbackPercent: 5,
    delivery: { courier: true, takeaway: true, minOrder: 800, deliveryFee: 200 },
    category: "Кофейни",
    services: [
      { title: "Воронка V60 Кения", price: 340, category: "Фильтр кофе", imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80" },
      { title: "Зерно Колумбия Пакамара 250г", price: 1200, category: "Зерно", imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.9, author: "Иван", comment: "Для ценителей настоящего кофе." }]
  },
  {
    slug: "bushe-bakery-nevsky",
    name: "Буше Bakery & Cafe",
    description: "Знаменитая пекарня Петербурга: хрустящий тартин, вензеля с малиной и завтраки весь день.",
    logoUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
    address: "Санкт-Петербург, Невский проспект, 66",
    phone: "+7 (812) 314-15-92",
    workingHours: "Пн-Вс: 08:00 – 22:00",
    isOpen: true,
    cashbackPercent: 7,
    delivery: { courier: true, takeaway: true, minOrder: 700, deliveryFee: 150 },
    category: "Пекарни",
    services: [
      { title: "Вензель с малиной", price: 290, category: "Выпечка", imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=400&q=80" },
      { title: "Сырники из фермерского творога", price: 430, category: "Завтраки", imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=400&q=80" },
      { title: "Хлеб Ремесленный Тартин", price: 220, category: "Хлеб", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.9, author: "Ольга", comment: "Вензель с малиной — легенда!" }]
  },
  {
    slug: "coffeemania-kutuzov",
    name: "Кофемания Кутузовский",
    description: "Премиальный ресторан и кофейня с безупречным сервисом, авторской кухней и десертами.",
    logoUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    address: "Москва, Кутузовский проспект, 18",
    phone: "+7 (495) 777-50-50",
    workingHours: "Пн-Вс: Круглосуточно",
    isOpen: true,
    cashbackPercent: 5,
    delivery: { courier: true, takeaway: true, minOrder: 1500, deliveryFee: 250 },
    category: "Рестораны",
    services: [
      { title: "Раф Кофе Гранд", price: 590, category: "Кофе", imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=400&q=80" },
      { title: "Драники с лососем и яйцом пашот", price: 950, category: "Завтраки", imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.8, author: "Артем", comment: "Классика премиум-уровня. Все на высоте." }]
  },
  {
    slug: "stars-coffee-kazan",
    name: "Stars Coffee Баумана",
    description: "Стильная городская кофейня на пешеходной улице Казани. Свежая выпечка и кофейные коктейли.",
    logoUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    address: "Казань, ул. Баумана, 44",
    phone: "+7 (843) 292-10-88",
    workingHours: "Пн-Вс: 08:00 – 23:00",
    isOpen: true,
    cashbackPercent: 8,
    delivery: { courier: true, takeaway: true, minOrder: 500, deliveryFee: 130 },
    category: "Кофейни",
    services: [
      { title: "Фраппе Соленая Карамель", price: 370, category: "Кофе", imageUrl: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=400&q=80" },
      { title: "Маффин с черникой", price: 210, category: "Выпечка", imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.7, author: "Камила", comment: "Очень удобное место для встреч в центре." }]
  },

  // 2. Бургеры, Пицца & Стритфуд
  {
    slug: "dodo-pizza-tverskaya",
    name: "Додо Пицца Тверская",
    description: "Горячая хрустящая пицца с открытой кухней, додстерами и быстрой доставкой за 30 минут.",
    logoUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
    address: "Москва, ул. Тверская, 15",
    phone: "+7 (800) 302-00-60",
    workingHours: "Пн-Вс: Круглосуточно",
    isOpen: true,
    cashbackPercent: 10,
    delivery: { courier: true, takeaway: true, minOrder: 549, deliveryFee: 0 },
    category: "Пиццерии",
    services: [
      { title: "Пицца Пепперони 30см", price: 629, category: "Пицца", imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=400&q=80" },
      { title: "Додстер классический", price: 219, category: "Закуски", imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=400&q=80" },
      { title: "Пицца Четыре Сыра 35см", price: 849, category: "Пицца", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.9, author: "Сергей", comment: "Привезли за 23 минуты, горячая и сочная!" }]
  },
  {
    slug: "frank-by-basta-spb",
    name: "Frank by Баста Рубинштейна",
    description: "Культовые ребра на гриле, сочные бургеры и неформальная хип-хоп атмосфера.",
    logoUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
    address: "Санкт-Петербург, ул. Рубинштейна, 29",
    phone: "+7 (812) 925-50-60",
    workingHours: "Пн-Вс: 12:00 – 00:00",
    isOpen: true,
    cashbackPercent: 7,
    delivery: { courier: true, takeaway: true, minOrder: 1000, deliveryFee: 200 },
    category: "Бургеры & Гриль",
    services: [
      { title: "Свиные ребра в соусе BBQ", price: 890, category: "Ребра", imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80" },
      { title: "Бургер Frank с беконом", price: 650, category: "Бургеры", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 5, author: "Максим В.", comment: "Ребра тают во рту! Лучшие в городе." }]
  },
  {
    slug: "bb-burgers-tsvetnoy",
    name: "BB&Burgers Цветной",
    description: "Крафтовые бургеры из мраморной говядины Black Angus с фирменными булочками бриошь.",
    logoUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
    address: "Москва, Цветной бульвар, 7с1",
    phone: "+7 (495) 230-01-20",
    workingHours: "Пн-Вс: 11:00 – 23:00",
    isOpen: true,
    cashbackPercent: 5,
    delivery: { courier: true, takeaway: true, minOrder: 600, deliveryFee: 150 },
    category: "Бургеры & Гриль",
    services: [
      { title: "Бургер Пьяная Бабушка", price: 540, category: "Бургеры", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80" },
      { title: "Картофель Фри с трюфельным маслом", price: 290, category: "Закуски", imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.8, author: "Дмитрий", comment: "Мясо сочнейшее, булочка не размокает." }]
  },
  {
    slug: "papa-johns-kazan",
    name: "Папа Джонс Казань",
    description: "Лучшие ингредиенты, лучшая пицца. Традиционное тесто и знаменитый чесночный соус.",
    logoUrl: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=1200&q=80",
    address: "Казань, ул. Чистопольская, 20",
    phone: "+7 (843) 211-19-19",
    workingHours: "Пн-Вс: 10:00 – 23:00",
    isOpen: true,
    cashbackPercent: 8,
    delivery: { courier: true, takeaway: true, minOrder: 700, deliveryFee: 100 },
    category: "Пиццерии",
    services: [
      { title: "Супер Папа 30см", price: 799, category: "Пицца", imageUrl: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=400&q=80" },
      { title: "Сырный борт с моцареллой", price: 199, category: "Дополнения", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.7, author: "Рамиль", comment: "Чесночный соус и перчик — ванлав." }]
  },
  {
    slug: "shaurma-bro-grozny",
    name: "Шаурма Bro Грозный",
    description: "Настоящая кавказская шаурма на углях с отборным мясом, свежими овощами и авторским соусом.",
    logoUrl: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1200&q=80",
    address: "Грозный, пр. В.В. Путина, 14",
    phone: "+7 (928) 000-11-22",
    workingHours: "Пн-Вс: 10:00 – 01:00",
    isOpen: true,
    cashbackPercent: 5,
    delivery: { courier: true, takeaway: true, minOrder: 400, deliveryFee: 100 },
    category: "Стритфуд",
    services: [
      { title: "Шаурма Bro из говядины XL", price: 350, category: "Шаурма", imageUrl: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=400&q=80" },
      { title: "Шаурма с курицей в сырном лаваше", price: 290, category: "Шаурма", imageUrl: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 5, author: "Алихан", comment: "Мяса много, соус шикарный, очень вкусно!" }]
  },
  {
    slug: "pizza-22-sm-solyanka",
    name: "Пицца 22 см Солянка",
    description: "Неаполитанская пицца из дровяной печи. Пышные бортики с леопардовым припеком.",
    logoUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80",
    address: "Москва, ул. Солянка, 1/2",
    phone: "+7 (495) 150-22-22",
    workingHours: "Пн-Вс: 12:00 – 23:00",
    isOpen: true,
    cashbackPercent: 6,
    delivery: { courier: true, takeaway: true, minOrder: 700, deliveryFee: 150 },
    category: "Пиццерии",
    services: [
      { title: "Маргарита с моцареллой фиор ди латте", price: 540, category: "Пицца", imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80" },
      { title: "Пицца с мортаделлой и фисташками", price: 720, category: "Пицца", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.9, author: "Кристина", comment: "Настоящий Неаполь в Москве. Тесто воздушное." }]
  },
  {
    slug: "black-star-burger-grozny",
    name: "Black Star Burger Grand Park",
    description: "Сочные бургеры в черных перчатках. Халяль меню, высочайшее качество мяса.",
    logoUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1200&q=80",
    address: "Грозный, пр. Кадырова, 40 (ТРЦ Гранд Парк)",
    phone: "+7 (928) 777-33-44",
    workingHours: "Пн-Вс: 10:00 – 22:00",
    isOpen: true,
    cashbackPercent: 10,
    delivery: { courier: true, takeaway: true, minOrder: 600, deliveryFee: 120 },
    category: "Бургеры & Гриль",
    services: [
      { title: "VIP Бургер с трюфельным соусом", price: 690, category: "Бургеры", imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=400&q=80" },
      { title: "Крылышки BBQ Острые", price: 390, category: "Закуски", imageUrl: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.8, author: "Мансур", comment: "Вкусно и сытно, бургеры отличные." }]
  },
  {
    slug: "farsh-burger-ekb",
    name: "Farш Burger Вайнера",
    description: "Совместный проект Аркадия Новикова и Мираторг. Брянская говядина Black Angus.",
    logoUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
    address: "Екатеринбург, ул. Вайнера, 10",
    phone: "+7 (343) 287-99-00",
    workingHours: "Пн-Вс: 11:00 – 23:00",
    isOpen: true,
    cashbackPercent: 5,
    delivery: { courier: true, takeaway: true, minOrder: 500, deliveryFee: 140 },
    category: "Бургеры & Гриль",
    services: [
      { title: "Бургер Брянский Парень", price: 580, category: "Бургеры", imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80" },
      { title: "Луковые кольца в панировке", price: 240, category: "Закуски", imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.7, author: "Виктор", comment: "Брянский парень — топ, соус грибной решает." }]
  },

  // 3. Азиатская кухня & Суши
  {
    slug: "tanuki-premium-leninsky",
    name: "Тануки Premium Ленинский",
    description: "Японская и паназиатская кухня с доставкой. Свежий лосось с Фарерских островов.",
    logoUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80",
    address: "Москва, Ленинский проспект, 72",
    phone: "+7 (495) 223-22-23",
    workingHours: "Пн-Вс: Круглосуточно",
    isOpen: true,
    cashbackPercent: 7,
    delivery: { courier: true, takeaway: true, minOrder: 990, deliveryFee: 0 },
    category: "Суши & Азия",
    services: [
      { title: "Сет Филадельфия Deluxe", price: 1490, category: "Сеты", imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=400&q=80" },
      { title: "Том Ям с морепродуктами", price: 590, category: "Супы", imageUrl: "https://images.unsplash.com/photo-1547928576-a4a33237cbc3?auto=format&fit=crop&w=400&q=80" },
      { title: "Ролл Дракон с угрём", price: 670, category: "Роллы", imageUrl: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.9, author: "Светлана", comment: "Всегда свежайшая рыба, упаковка идеальная." }]
  },
  {
    slug: "yakitoriya-kamennoostrovsky",
    name: "Якитория Lounge Петроградка",
    description: "Легендарный ресторан японской кухни в сердце Петроградской стороны.",
    logoUrl: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=1200&q=80",
    address: "Санкт-Петербург, Каменноостровский пр-т, 40",
    phone: "+7 (812) 333-22-11",
    workingHours: "Пн-Вс: 11:00 – 01:00",
    isOpen: true,
    cashbackPercent: 5,
    delivery: { courier: true, takeaway: true, minOrder: 1000, deliveryFee: 150 },
    category: "Суши & Азия",
    services: [
      { title: "Ролл Калифорния в тобико", price: 520, category: "Роллы", imageUrl: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=400&q=80" },
      { title: "Удон с курицей терияки", price: 460, category: "Горячее", imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.8, author: "Павел", comment: "Отличное обслуживание и уютный интерьер." }]
  },
  {
    slug: "bluefin-sushi-city",
    name: "Bluefin Sushi & Oysters",
    description: "Премиальная морская кухня в башнях Москва-Сити. Дикий тунец Блюфин, устрицы и ежи.",
    logoUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1200&q=80",
    address: "Москва, Пресненская наб., 8с1 (Башня Город Столиц)",
    phone: "+7 (495) 266-02-02",
    workingHours: "Пн-Вс: 12:00 – 00:00",
    isOpen: true,
    cashbackPercent: 10,
    delivery: { courier: true, takeaway: true, minOrder: 3000, deliveryFee: 300 },
    category: "Суши & Азия",
    services: [
      { title: "Сашими из тунца Блюфин О-торо", price: 2400, category: "Сашими", imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=400&q=80" },
      { title: "Ролл с камчатским крабом и черной икрой", price: 1850, category: "Роллы", imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 5, author: "Николай", comment: "Безупречное качество морепродуктов. Уровень люкс." }]
  },
  {
    slug: "pho-bo-danilovsky",
    name: "Фо Бо Ханой Даниловский",
    description: "Аутентичный вьетнамский стритфуд. Наваристый бульон Фо Бо, хрустящие немы и манго шейки.",
    logoUrl: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=1200&q=80",
    address: "Москва, ул. Мытная, 74 (Даниловский рынок)",
    phone: "+7 (495) 120-77-88",
    workingHours: "Пн-Вс: 09:00 – 21:00",
    isOpen: true,
    cashbackPercent: 5,
    delivery: { courier: true, takeaway: true, minOrder: 500, deliveryFee: 120 },
    category: "Суши & Азия",
    services: [
      { title: "Суп Фо Бо XL (1000мл)", price: 490, category: "Супы", imageUrl: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=400&q=80" },
      { title: "Немы с креветками 3шт", price: 340, category: "Закуски", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.9, author: "Алексей", comment: "Огромная порция и настоящий ханойский вкус!" }]
  },
  {
    slug: "ku-ramen-smolenskaya",
    name: "Рамен и Изакая Ku:",
    description: "Японский рамен-бар с домашней лапшой, густыми бульонами и авторскими закусками.",
    logoUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80",
    address: "Москва, Смоленская площадь, 8",
    phone: "+7 (495) 780-00-55",
    workingHours: "Пн-Вс: 11:00 – 23:00",
    isOpen: true,
    cashbackPercent: 6,
    delivery: { courier: true, takeaway: true, minOrder: 800, deliveryFee: 150 },
    category: "Суши & Азия",
    services: [
      { title: "Тонкоцу Рамен со свининой тясю", price: 680, category: "Рамен", imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=80" },
      { title: "Гедза с креветкой и имбирем", price: 420, category: "Закуски", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.8, author: "Мария", comment: "Бульон варится 12 часов, это чувствуется!" }]
  },
  {
    slug: "sushi-wok-novosibirsk",
    name: "Суши Wok Красный Проспект",
    description: "Быстрая доставка суши, роллов и лапши в коробочках по выгодным ценам.",
    logoUrl: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=1200&q=80",
    address: "Новосибирск, Красный проспект, 55",
    phone: "+7 (383) 209-00-11",
    workingHours: "Пн-Вс: 10:00 – 23:00",
    isOpen: true,
    cashbackPercent: 5,
    delivery: { courier: true, takeaway: true, minOrder: 500, deliveryFee: 90 },
    category: "Суши & Азия",
    services: [
      { title: "WOK Стеклянная лапша с курицей", price: 340, category: "WOK", imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=80" },
      { title: "Запеченный ролл Аяши", price: 310, category: "Роллы", imageUrl: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.6, author: "Глеб", comment: "Быстро, сытно и недорого." }]
  },
  {
    slug: "hagakure-sochi",
    name: "Хагакурэ Японская Кухня",
    description: "Уютный ресторан на пешеходной Навагинской в Сочи. Авторские суши и коктейли.",
    logoUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=300&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80",
    address: "Сочи, ул. Навагинская, 11",
    phone: "+7 (862) 290-30-40",
    workingHours: "Пн-Вс: 12:00 – 00:00",
    isOpen: true,
    cashbackPercent: 8,
    delivery: { courier: true, takeaway: true, minOrder: 800, deliveryFee: 150 },
    category: "Суши & Азия",
    services: [
      { title: "Ролл Филадельфия с трюфелем", price: 780, category: "Роллы", imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=400&q=80" },
      { title: "Тартар из лосося с авокадо", price: 620, category: "Закуски", imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=400&q=80" }
    ],
    reviews: [{ rating: 4.9, author: "Юлия", comment: "Прекрасное место для ужина в Сочи." }]
  }
];

// Helper to generate the remaining shops to reach 60 diverse venues
const EXTRA_CATEGORIES = [
  { cat: "Рестораны", prefix: "Ресторан", icon: "restaurant" },
  { cat: "Барбершопы", prefix: "Барбершоп", icon: "barber" },
  { cat: "Цветы & Подарки", prefix: "Цветочный бутик", icon: "flowers" },
  { cat: "Фитнес & Спорт", prefix: "Фитнес-клуб", icon: "fitness" },
  { cat: "Авто & Детейлинг", prefix: "Детейлинг-центр", icon: "auto" },
  { cat: "Пекарни & Десерты", prefix: "Кондитерская", icon: "bakery" },
  { cat: "Красота & Спа", prefix: "Студия красоты", icon: "beauty" }
];

const CITIES = [
  { name: "Москва", streets: ["Тверская", "Новый Арбат", "Пятницкая", "Ленинский проспект", "Садовая-Кудринская"] },
  { name: "Санкт-Петербург", streets: ["Невский проспект", "Рубинштейна", "Марата", "Каменноостровский пр-т"] },
  { name: "Грозный", streets: ["пр. Кадырова", "пр. Путина", "ул. Маяковского", "ул. Лорсанова"] },
  { name: "Казань", streets: ["ул. Баумана", "ул. Чистопольская", "ул. Кремлевская"] },
  { name: "Екатеринбург", streets: ["ул. Вайнера", "ул. Малышева", "пр. Ленина"] },
  { name: "Сочи", streets: ["Курортный проспект", "ул. Навагинская", "ул. Черноморская"] }
];

const IMAGE_POOL = {
  restaurant: {
    logo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    service1: { title: "Стейк Рибай Прайм", price: 2100, img: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80" },
    service2: { title: "Тартар из говядины с бриошью", price: 780, img: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80" }
  },
  barber: {
    logo: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80",
    service1: { title: "Мужская стрижка ножницами", price: 1800, img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80" },
    service2: { title: "Моделирование и бритье бороды", price: 1200, img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80" }
  },
  flowers: {
    logo: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=1200&q=80",
    service1: { title: "Букет Пионовидных роз 15шт", price: 4200, img: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=400&q=80" },
    service2: { title: "Авторская композиция в шляпной коробке", price: 3600, img: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=400&q=80" }
  },
  fitness: {
    logo: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
    service1: { title: "Персональная тренировка с тренером", price: 2500, img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=400&q=80" },
    service2: { title: "Клубная карта Безлимит (1 месяц)", price: 6900, img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=400&q=80" }
  },
  auto: {
    logo: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1200&q=80",
    service1: { title: "Комплексный премиум-детейлинг кузова", price: 12000, img: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=400&q=80" },
    service2: { title: "Химчистка салона с озонированием", price: 5500, img: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=400&q=80" }
  },
  bakery: {
    logo: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80",
    service1: { title: "Торт Малиновый Бархат 1.2кг", price: 2400, img: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=400&q=80" },
    service2: { title: "Набор макаронс 10шт", price: 950, img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=400&q=80" }
  },
  beauty: {
    logo: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80",
    service1: { title: "Маникюр с покрытием гель-лак", price: 2200, img: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80" },
    service2: { title: "Уход за лицом Hydrafacial", price: 4500, img: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80" }
  }
};

const BRAND_NAMES = [
  "Сыроварня", "White Rabbit", "Купол", "Chop-Chop", "Boy Cut", "Britva",
  "Persona Lab", "Flowwow", "Flora Studio", "Розы & Пионы", "World Class",
  "Crocus Fitness", "Spirit Gym", "Black Star Wash", "Detailing Alarm",
  "Эклерная Клер", "Коржов", "Paul Bakery", "Моне", "OldBoy", "Ribambelle",
  "Мясо & Рыба", "Хачапури и Вино", "Чайхона Lounge", "Панорама", "Green Room",
  "Студия Реформа", "Crossfit Extreme", "АвтоСпа Люкс", "Angelica Desserts",
  "Cinnabon Delight", "Borodach", "La Fleur", "Top Detailing", "Beauty Bar",
  "ProFit Club", "Bella Napoli", "Craft Kitchen", "Coffee Port", "Urban Barber",
  "Sweet Corner", "Golden Scissors", "Royal Spa"
];

async function seed() {
  console.log("Starting seeding of 60 establishments...");

  // Build full list of 60 items
  const fullList = [...SHOPS_DATA];

  let brandIdx = 0;
  while (fullList.length < 60) {
    const catObj = EXTRA_CATEGORIES[fullList.length % EXTRA_CATEGORIES.length];
    const city = CITIES[fullList.length % CITIES.length];
    const street = city.streets[fullList.length % city.streets.length];
    const bName = BRAND_NAMES[brandIdx % BRAND_NAMES.length];
    brandIdx++;

    const num = fullList.length + 1;
    const slug = `${bName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}-${num}`;
    const name = `${bName} (${city.name})`;
    const pool = IMAGE_POOL[catObj.icon] || IMAGE_POOL.restaurant;

    const isOpen = num % 7 !== 0; // ~85% open, some closed for filter testing
    const hasDelivery = num % 3 !== 0;
    const cashback = [3, 5, 7, 10, 15][num % 5];

    fullList.push({
      slug,
      name,
      description: `${catObj.prefix} премиального класса в ${city.name}. Гарантия качества, сертифицированные специалисты и высокий сервис.`,
      logoUrl: pool.logo,
      bannerUrl: pool.banner,
      address: `${city.name}, ${street}, ${10 + (num % 50)}`,
      phone: `+7 (${city.name === "Москва" ? "495" : city.name === "Санкт-Петербург" ? "812" : "928"}) ${100 + num}-${20 + num}-${30 + num}`,
      workingHours: "Пн-Вс: 09:00 – 22:00",
      isOpen,
      cashbackPercent: cashback,
      delivery: hasDelivery ? { courier: true, takeaway: true, minOrder: 500 + num * 10, deliveryFee: 150 } : { courier: false, takeaway: true },
      category: catObj.cat,
      services: [
        { title: pool.service1.title, price: pool.service1.price, category: catObj.cat, imageUrl: pool.service1.img },
        { title: pool.service2.title, price: pool.service2.price, category: catObj.cat, imageUrl: pool.service2.img }
      ],
      reviews: [
        { rating: 4.8 + ((num % 3) * 0.1), author: "Клиент", comment: "Отличное обслуживание, все быстро и аккуратно!" }
      ]
    });
  }

  console.log(`Generated list of ${fullList.length} shops. Inserting into database...`);

  let createdCount = 0;
  for (const item of fullList) {
    try {
      const existing = await prisma.shop.findUnique({ where: { slug: item.slug } });
      if (existing) {
        console.log(`Shop ${item.slug} already exists, skipping.`);
        continue;
      }

      await prisma.shop.create({
        data: {
          slug: item.slug,
          name: item.name,
          description: item.description,
          logoUrl: item.logoUrl,
          bannerUrl: item.bannerUrl,
          address: item.address,
          phone: item.phone,
          workingHours: item.workingHours,
          isOpen: item.isOpen,
          cashbackPercent: item.cashbackPercent,
          deliveryOptions: JSON.stringify(item.delivery),
          currency: "RUB",
          currencySymbol: "₽",
          ownerId: OWNER_ID,
          services: {
            create: item.services.map((srv) => ({
              title: srv.title,
              price: srv.price,
              category: srv.category || item.category,
              imageUrl: srv.imageUrl,
              isAvailable: true
            }))
          },
          reviews: {
            create: item.reviews.map((rev) => ({
              rating: Math.max(1, Math.min(5, Math.round(rev.rating))),
              comment: rev.comment,
              customerName: rev.author || "Гость"
            }))
          }
        }
      });
      createdCount++;
    } catch (err) {
      console.error(`Error inserting ${item.slug}:`, err.message);
    }
  }

  const finalCount = await prisma.shop.count();
  console.log(`Seeding finished! Created: ${createdCount} shops. Total in DB: ${finalCount}`);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
