# 🤖 Многофункциональный Telegram-бот "Pixel AI" by Leshiy

Многофункциональный мультимодальный Telegram-бот, сочетающий возможности ИИ для работы с текстом, изображениями, аудио и видео. Предназначен как для личного творчества, так и для профессиональных задач в области цифровой обработки медиа.

---

## 🌟 Основные возможности и AI-интеграции

- **Google Gemini 1.5 Flash**: Высокоскоростная модель для чата, анализа изображений и генерации промптов.
- **Cloudflare Workers AI**: Использование моделей Stable Diffusion (генерация изображений), Whisper (транскрипция аудио), Llama/Qwen (дополнительные чат-модели).
- **leshiy-media-converter** (`leshiy-media-converter`): Внешняя медиа-обработка (поворот, ресайз, конвертация GIF в видео, создание стоп-кадров).
- **Платные сервисы**: Интеграция с Kie.ai, Stability AI, FusionBrain и другими для расширенных функций.

---

## 📝 Текст и чат

* **Бесконечная память (S3):** История диалогов сохраняется в облаке (S3), обеспечивая бесшовное продолжение общения даже после перезагрузки сервера.
* **Единый контекст:** Бот помнит вас на разных платформах в рамках нашей экосистемы.
* Общение на русском языке с контекстным запоминанием истории.
* Автоматический перевод промптов между русским и английским.
* Поддержка как бесплатных (Workers AI), так и платных (Gemini, Kie.ai) моделей.
* Поддержка эмодзи-кнопок → /команды для удобства пользователей.
* **Мульти-чат:** Поддержка нескольких чатов с переключением между ними, создание новых, переименование и удаление.
* **Ленивая подгрузка истории:** При прокрутке вверх подгружаются старые сообщения порциями по 10.
* **Прикрепление файлов:** Перетаскивание (drag-and-drop) файлов в чат, вставка из буфера обмена (Ctrl+V), поддержка изображений, аудио, видео и документов.
* **Голосовой ввод:** Короткое нажатие — диктовка с распознаванием речи (ru-RU), долгое — запись голосового сообщения.
* **Голосовые команды:** Пунктуация (тчк, запятая, вопрос), регистр (Aa/AA/aa), цифры, новая строка, отмена слова, очистка, отправка.
* **Slash-команды:** Автодополнение при вводе `/` — 16 команд (start, buy, balance, create, photo, text, video, avatar, say, recognize, resize, prompt, media, apikey, stop, admin).

## 🖼️ Работа с изображениями

* **T2I** — генерация изображений по текстовому описанию (бесплатно через Workers AI, платно через Kie.ai).
* **I2I** — редактирование изображений с до 4 референсами.
* **Распознавание (Vision)** — анализ содержимого изображения (бесплатно).
* **Ресайз** — изменение размера (бесплатно, с client-side Canvas fallback).
* **Поворот** — −90°, 180°, +90° (бесплатно, с client-side Canvas fallback).
* **Конвертация** — PNG / JPG / WebP / HEIC→JPG (бесплатно).
* Перетаскивание сгенерированных изображений обратно в чат или в слоты других режимов.

## 🎥 Работа с видео

* **T2V** — генерация видео по промпту.
* **I2V** — оживление фото (по изображению + промпту).
* **V2V** — замена персонажа (по референс-видео + фото).
* **A2V** — говорящий аватар (по фото + аудио, липсинк).
* **Анализ видео** — описание содержимого видео (V2T).
* **Конвертация** — MP4/WebM/AVI/MOV → MP4/WebM/GIF/MP3.
* **Ресайз/Поворот** — изменение размера и поворот видео (бесплатно).
* **Стоп-кадр** — извлечение кадра по таймстампу (HH:MM:SS.000).
* Параметры моделей: aspect_ratio (16:9, 9:16, 1:1), duration (5–10 сек), resolution (480p–1080p), mode.
* Асинхронные задачи: опрос статуса до 20 минут, фоновый polling каждые 10 секунд.

## 🎙️ Работа с аудио

* **TTS** — озвучка текста разными голосами (VoiceRSS бесплатно / Workers AI / Gemini / KieAI ElevenLabs / BotHub / Pollinations).
* **STT** — транскрибация аудио в текст (MP3/WAV/OGG до 20 МБ, бесплатно).
* **Клонирование голоса** — загрузка сэмпла голоса → конвертация в MP3 (бесплатно).
* **Конвертация** — MP3/WAV/OGG/FLAC (бесплатно).
* Распознавание голосовых сообщений и ответ голосом.
* Поддержка загрузки аудиофайлов (MP3/OGG) и их транскрибации в текст.
* Автоматическая изоляция голоса из фонового шума.

## 📦 Управление медиа и данными

* Сохранение последних фото, видео, аудио в KV-хранилище.
* Возможность просмотра, удаления и замены исходных материалов.
* Поворот и замена медиа прямо из чата.
* **Камера:** Фото и видео съёмка прямо из чата (front/back camera, mini 1024px для фото).
* **Lightbox:** Полноэкранный просмотр изображений с pinch-to-zoom и свайп-навигацией.

---

## 💰 Монетизация и баланс

* Валюта: Кредиты (1 кредит = 5 руб).
* Бесплатный лимит: 80 кредитов (на 4 видео или 20 фото).
* 8 пакетов пополнения: от 4¢ (фото) до 400¢ (анлим).

### Пополнение:

- **Telegram Stars** (от 10 XTR = 4 кредита) — через Bot API createInvoiceLink.
- **Голоса ВКонтакте** — через VKWebAppShowOrderBox (для VK Mini App).
- **ОКи** — через VKWebAppShowOrderBox (для OK Mini App, с подписью OK_PAYMENT_SECRET_KEY).
- **Boosty / ЮMoney / VK Донаты** — внешние ссылки (скрыты в VK/OK контексте).
- **VIP-доступ:** при покупке от 1000 руб — безлимит на 30 дней.

### VK/OK Платежи (callbacks):

- **VK:** `get_item` / `order_status_change` (POST `/vk-payment-callback`), подпись MD5 с VK_SECURE_KEY, тестовый режим для `_test` уведомлений.
- **OK:** тот же протокол + `callbacks.payment` (GET `/ok-payment-callback`), подпись с OK_PAYMENT_SECRET_KEY, chatId с префиксом `ok_`.

---

## 📊 Администрирование

- Админ-панель с 3 разделами: управление пользователями, настройка моделей, зачисление донатов.
- Настройка моделей по умолчанию для всех пользователей (11 категорий).
- Управление балансом и VIP-статусом пользователей.
- История транзакций с типами (регистрация/списание/покупка/админ/VIP).
- Информация о сервисах и балансах (KieAI, BotHub, VoiceRSS и др.).
- Версия приложения и статус сервисов.

---

## 🌐 Поддержка платформ

| Платформа | Авторизация | Оплата |
| :--- | :--- | :--- |
| **VK Desktop** | VKWebAppGetUserInfo | Голоса VK (VKWebAppShowOrderBox) |
| **VK Mobile** | VKWebAppGetUserInfo | Голоса VK + подсказка |
| **Одноклассники (OK)** | vk-bridge (IS_OK detection) | ОКи (callbacks.payment) |
| **Telegram Mini App** | initDataUnsafe.user / validate_init_data | Telegram Stars |
| **Браузер (standalone)** | VK ID OAuth (vk.html) / TG Login Widget (tg.html) | TG Stars / Boosty / ЮMoney |

### Определение платформы:

- `IS_VK` — по `vk_user_id` / `vk_platform` в URL (исключая OK).
- `IS_OK` — по `document.referrer` (ok.ru), `ancestorOrigins`, OK URL-параметрам.
- `IS_VK_MOBILE` — по `vk_platform` (mobile_android, mobile_iphone, mobile_ipad и др.).
- `IS_VK_OR_OK` — унифицированный флаг для VK/OK контекста.

---

## ⚙️ Техническая архитектура

* **Платформа**: Yandex.Cloud Functions (Node.js 22)
* **Frontend**: Single-page приложение (pure JS, без фреймворков), ~9750 строк
* **Backend**: Yandex.Cloud Functions + Cloudflare Workers (адаптер `index.js` → `worker.js`)
* **AI/LLM**: Google Gemini, Workers AI, Stability AI, Kie.ai, FusionBrain, DeepSeek, Z.AI
* **Медиа-обработка**: FFmpeg на самописанном конвертере [leshiy-media-converter](https://d5dtt5rfr7nk66bbrec2.kf69zffa.apigw.yandexcloud.net/converter)
* **Хранилище данных**: Yandex Database (YDB) + Yandex S3 (история чатов, индексы чатов, медиа)
* **Шлюз**: Yandex API Gateway (spec.yaml с маршрутами `/`, `/api/{proxy+}`, `/vk-payment-callback`, `/ok-payment-callback`, `/images/*`, `/kv-images/*`)

---

## 🚀 Быстрый старт (Развертывание)

Для запуска бота вам понадобится аккаунт на **Yandex.Cloud** и **GitHub**.

### 1. Подготовка Telegram

1.  **Создайте бота:** Напишите [@BotFather](https://t.me/BotFather) → `/newbot` → получите `TELEGRAM_BOT_TOKEN`.
2.  **Получите ID чата:** Узнайте ваш личный ID чата (для администрирования и отладки).

### 2. Настройте Yandex.Cloud

- Создайте [Yandex Database](https://cloud.yandex.ru/services/ydb) и получите эндпоинт и путь к базе данных.
- Установите и настройте [YC CLI](https://cloud.yandex.ru/docs/cli/quickstart).

### 3. Клонируйте и установите

1.  **Клонируйте репозиторий.**
2.  **Установите зависимости:**
    ```bash
    npm install
    ```

### 4. Настройка переменных окружения (секреты в GitHub)

#### 4.1. Переменные (Vars)

| Имя | Пример | Описание |
| :--- | :--- | :--- |
| `LESHIY_CONVERTER` | `https://...onrender.com` | URL вашего медиа-конвертера. |
| `WORKER_DOMAIN` | `https://...workers.dev` | URL вашего Worker'а. |
| `PAYMENT_LINK` | `https://boosty.to/...` | Ссылка для доната/пополнения. |
| `DEBUG_ENABLED` | `true` / `false` | Включение режима отладки. |
| `ADMIN_CHAT_ID` | `<Ваш-ID-чата>` | ID чата администратора. |

#### 4.2. Секреты (Secrets)

| Имя | Описание |
| :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | Токен от BotFather. |
| `GEMINI_API_KEY` | API-ключ Google Gemini. |
| `CLOUDFLARE_ACCOUNT_ID` | ID аккаунта Cloudflare. |
| `CLOUDFLARE_API_TOKEN` | Токен API Cloudflare. |
| `VK_APP_SECRET` | Защищённый ключ VK (для подписи платежей). |
| `VK_SECURE_KEY` | Защищённый ключ VK (альтернативный). |
| `OK_PAYMENT_SECRET_KEY` | Секретный ключ OK для платежей. |
| `YANDEX_S3_KEY_ID` | Ключ Yandex S3. |
| `YANDEX_S3_SECRET` | Секрет Yandex S3. |
| *И все остальные ключи из секции `environment` в `deploy.yml`* | |

### 5. Установка вебхука

После получения URL API-шлюза, установите вебхук:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<gateway-id>.apigw.yandexcloud.net/<function-name>"
```

---

## 🌐 Внешние сервисы

| Сервис | Описание | URL |
| :--- | :--- | :--- |
| **Медиа-конвертер** | Обработка видео: ресайз, поворот, GIF в MP4, стоп-кадр. | `https://leshiy-media-converter.onrender.com` |
| **Платежи** | Ссылка для пополнения кредитов бота. | `https://boosty.to/leshiyalex/...` |

---

## 📁 Структура проекта

```
├── index.js              # Точка входа Yandex Cloud Function (роутинг, статика, платежи)
├── worker.js             # Основной монолит (~22000 строк) — Cloudflare Worker адаптированный
├── webHandler.js         # Веб-API шлюз (16 режимов: chat, image, video, audio, payments и др.)
├── db_adapter.js         # Адаптер YDB → эмуляция Cloudflare KV
├── package.json          # Зависимости (ydb-sdk, node-fetch, aws-sdk, form-data)
├── .github/workflows/
│   └── deploy.yml        # CI/CD: GitHub Actions → Yandex Cloud Functions
├── public/
│   ├── index.html        # SPA фронтенд (~9750 строк, pure JS)
│   ├── style.css         # Стили (~1950 строк)
│   ├── vk.html           # VK ID OAuth страница
│   ├── tg.html           # TG Login Widget страница
│   ├── telegram-web-app.js # Локальная копия TG SDK
│   ├── Gemini.png        # Иконка
│   └── gemini_purple.png # Иконка
└── README.md
```
