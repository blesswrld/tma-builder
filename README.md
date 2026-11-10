<div align="center">

# ⚡ TMA Platform (Telegram Mini App Constructor)

### Универсальная платформа для создания и мгновенного запуска витрин, каталогов услуг и Telegram Mini Apps для любого бизнеса

[![Version](https://img.shields.io/badge/version-v3.1.0-emerald.svg?style=for-the-badge&logo=semver&logoColor=white)](package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg?style=for-the-badge&logo=open-source-initiative&logoColor=white)](LICENSE)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js_20+-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Telegram WebApp](https://img.shields.io/badge/Telegram_Mini_App-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://core.telegram.org/bots/webapps)

<br />

[🌐 Живая демо-витрина](https://tma-builder.onrender.com) • [🤖 Telegram Bot авторизации](https://t.me/tma_auth_robot) • [📚 База знаний](https://docs.gitbook.com) • [🐛 Сообщить о баге](https://github.com/blesswrld/tma-builder/issues)

</div>

---

## 🌟 О проекте

**TMA Platform** — это готовое full-stack решение для ресторанов, кафе, бьюти-мастеров, барбершопов, ритейла и сервисных компаний. Платформа позволяет за считанные минуты создать заведение, наполнить меню или каталог услуг, привязать Telegram-бота и принимать заказы напрямую в мессенджере с автоматическими push-уведомлениями.

Встроенная CRM в реальном времени позволяет администраторам менять статусы заказов, вести клиентскую базу, запускать промокоды и рассылки, получать чеки в PDF и управлять правами команды.

---

## ✨ Ключевые возможности

### 🎨 Двойная дизайн-система (Dual Design Architecture)
* **Swiss Minimalism (`swiss`):** Ультра-чистое пространство, строгие 1px разделители, графитово-изумрудная палитра, геометрическая строгость и максимальный фокус на контенте без визуального шума.
* **Editorial Atelier (`atelier`):** Премиальная люкс-эстетика, антиквенная типографика (*Cormorant Garamond*), теплая песочная палитра и журнальная сетка.
* **Бесшовный тогл:** Мгновенное переключение тем и стилей на лету без перезагрузки страницы с автоматическим сохранением предпочтений в сессии.

### 🛡️ Безопасность и управление доступом
* **Разделение прав владения:** Четкая изоляция «Мои заведения» (созданные текущим пользователем) и «Все заведения» (где пользователь состоит как администратор или сотрудник).
* **Защита от удаления:** Невозможно удалить заведение, в которое пользователя пригласили в качестве персонала.
* **Пакетное удаление (Batch Delete):** Массовое удаление заведений с защитным подтверждением кодовым словом `УДАЛИТЬ` и валидацией прав.

### 🏪 Ультрачистый Storefront для покупателей
* **Быстродействие и адаптивность:** Первый экран загружается без визуального шума, со скрытием пустых категорий каталога.
* **Компактная карусель акций:** Горизонтальный сенсорный свайпер промо-баннеров, экономящий высоту экрана смартфона.
* **Адаптивный Hero-блок:** Обложка заведения со встроенным эквалайзером атмосферных аудио-треков и интерактивным рейтингом.
* **Гибкие форматы получения:**
  * 🛍 **Навынос (Pickup)**
  * 🍽 **В заведении (Dine-in)** с указанием столика
  * 🚚 **Доставка курьером (Courier)** с расчетом порога бесплатной доставки
  * 📦 **Транспортная компания (Shipping)**
* **Генерация PDF-чеков:** Мгновенное формирование фискального товарного чека на клиенте.

### 📊 Панель управления & CRM
* **Realtime заказы:** WebSocket-синхронизация новых заказов и статусов (*В ожидании*, *Готовится*, *Выполнен*, *Отменен*).
* **Аналитика бизнеса:** Выручка, средний чек, количество заказов и динамика за выбранный период.
* **Маркетинг и лояльность:** Гибкие промокоды (процент/фикс, минимальный заказ, лимит использований), настраиваемый кешбэк бонусами и баннеры.
* **Отзывы покупателей:** Публичные отзывы с оценкой, загрузкой фото и возможностью официального ответа от заведения.

### 🤖 Нативная интеграция с Telegram
* **Мгновенные уведомления:** Детальные карточки новых заказов отправляются прямо в Telegram-чат или канал администратора.
* **Вход в один клик:** Бесшовная авторизация через Telegram Login Widget и нативный `Telegram.WebApp.initData`.
* **Встроенный симулятор бота:** Тестирование взаимодействия покупателя с ботом прямо в панели управления.

---

## 🛠 Технологический стек

| Слой | Технологии |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS 4, Motion (Framer Motion), Lucide React, jsPDF |
| **Backend** | Node.js (v20+), Express 4, TypeScript, WebSocket (ws), bcryptjs, JWT |
| **База данных** | PostgreSQL, Prisma ORM 6 |
| **Почта & Уведомления** | Nodemailer (SMTP), Telegram Bot API |
| **Карты и Гео** | Leaflet, OpenStreetMap, Nominatim (с поддержкой адресов РФ/СНГ) |
| **Сборка & Деплой** | esbuild, Render, Vercel |

---

## 🚀 Быстрый старт

### 1. Требования к окружению
* **Node.js** версии 20.x или выше
* **npm** версии 10.x или выше (или **pnpm** / **bun**)
* База данных **PostgreSQL** (локальная или облачная: Supabase, Neon, Railway, Render)

### 2. Клонирование репозитория
```bash
git clone https://github.com/blesswrld/tma-builder.git
cd tma-builder
```

### 3. Установка зависимостей
```bash
npm install
```

### 4. Настройка переменных окружения
Создайте файл `.env` в корне проекта (на основе `.env.example`):

```bash
cp .env.example .env
```

Заполните ключевые переменные в `.env`:
```env
# База данных PostgreSQL (Prisma)
DATABASE_URL="postgresql://user:password@localhost:5432/tma_builder?schema=public"

# URL приложения
APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Безопасность
JWT_SECRET="super-secret-jwt-token-key-change-me"
PORT=3000

# Telegram бот авторизации (опционально)
TELEGRAM_AUTH_BOT_TOKEN="1234567890:ABC..."
TELEGRAM_AUTH_BOT_USERNAME="tma_auth_robot"

# GitHub OAuth (опционально)
GITHUB_CLIENT_ID="Ov23li..."
GITHUB_CLIENT_SECRET="35a08f..."

# SMTP для отправки одноразовых кодов E-mail (опционально)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM_NAME="TMA Platform"
```

### 5. Инициализация базы данных
Примените миграции схемы Prisma к вашей базе данных:
```bash
npx prisma db push
```

*(Опционально) Наполните базу тестовыми демо-заведениями и товарами:*
```bash
npm run seed
```

### 6. Запуск сервера разработки
```bash
npm run dev
```
Откройте в браузере: **`http://localhost:3000`**

---

## 📦 Сборка и Продакшн-развертывание

### Сборка проекта
```bash
npm run build
```
Команда собирает фронтенд с помощью Vite в папку `dist` и компилирует Node.js бэкенд через esbuild в оптимизированный файл `dist/server.cjs`.

### Запуск продакшн-сервера
```bash
npm start
```

---

## 📋 Доступные npm-скрипты

| Команда | Назначение |
| :--- | :--- |
| `npm run dev` | Запуск сервера разработки с поддержкой HMR и API на порту 3000 |
| `npm run build` | Полная сборка фронтенда и сервера для продакшна |
| `npm start` | Запуск собранного приложения (`node dist/server.cjs`) |
| `npm run lint` | Проверка типов TypeScript во всем проекте (`tsc --noEmit`) |
| `npm run seed` | Заполнение базы данных тестовыми данными |
| `npm run render-build` | Скрипт сборки для облачного хостинга Render |

---

## 🗂 Структура проекта

```text
├── api/                    # Vercel serverless entry point
├── prisma/                 # Схема Prisma ORM и скрипты начальных данных (seed)
│   └── schema.prisma       # Модели User, Shop, Service, Order, Review, Promocode
├── public/                 # Статические файлы, манифест PWA и иконки
│   ├── favicon.svg         # Логотип платформы
│   └── manifest.json       # PWA Web App Manifest
├── src/
│   ├── components/         # React-компоненты
│   │   ├── admin/          # Табы и модальные окна панели управления
│   │   ├── auth/           # Кнопки входа Telegram и GitHub OAuth
│   │   ├── chat/           # Realtime-чат с клиентами и поддержкой
│   │   ├── explore/        # Каталог всех заведений платформы
│   │   └── shop/           # Витрина магазина, корзина, карточки товаров
│   ├── context/            # React Context (Auth, Theme, Language, Realtime)
│   ├── data/               # Статические справочники (Changelog, Документация)
│   ├── hooks/              # Пользовательские хуки (useScrollLock, useDebounce)
│   ├── pages/              # Страницы приложения (AdminPage, ShopPage, ExplorePage)
│   └── lib/                # Валидаторы, хелперы геокодинга, API-клиенты
├── server.ts               # Express Backend + WebSocket Server + Telegram Bot Engine
├── vite.config.ts          # Конфигурация сборщика Vite
└── README.md               # Документация проекта
```

---

## 🤝 Вклад в проект (Contributing)

Мы приветствуем вклад сообщества в развитие платформы!

1. Сделайте **Fork** репозитория
2. Создайте свою ветку функционала: `git checkout -b feature/amazing-feature`
3. Зафиксируйте изменения: `git commit -m 'feat: add amazing feature'`
4. Отправьте ветку в GitHub: `git push origin feature/amazing-feature`
5. Откройте **Pull Request**

---

## 🌟 Поддержка

Если вам понравился проект **TMA Platform**, поддержите его развитие:

* ⭐ Поставьте **Star** в правом верхнем углу репозитория
* 📢 Поделитесь ссылкой с коллегами и предпринимателями
* 💬 Обратная связь и предложения: [@tamerlan_webdev](https://t.me/tamerlan_webdev)

---

## 📄 Лицензия

Проект распространяется под открытой лицензией [MIT License](LICENSE).  
Copyright © 2026 TMA Platform. All rights reserved.
