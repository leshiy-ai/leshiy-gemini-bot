# 🤖 Release Notes: Pixel AI v5.1.0 (21.06.2026) — "Мультиплатформенный фронтенд"

## 🎨 Фронтенд (public/index.html)

### Чат
- **Мульти-чат:** Поддержка нескольких чатов с переключением, созданием, переименованием и удалением.
- **S3 история:** Загрузка истории из Yandex S3 с ленивой подгрузкой (порции по 10 сообщений при прокрутке вверх).
- **Очистка дубликатов:** При начальной загрузке `chatArea` очищается перед рендером (исправлено дублирование сообщений).
- **Прикрепление файлов:** Drag-and-drop в чат, вставка из буфера (Ctrl+V), 4 слота референсов для I2I.
- **Голосовой ввод:** Короткое нажатие — диктовка (ru-RU), долгое — запись голосового сообщения.
- **Голосовые команды:** Пунктуация, регистр, цифры, отмена слова, очистка, отправка.
- **Slash-команды:** 16 команд с автодополнением (`/start`, `/buy`, `/create`, `/video`, `/avatar`, `/say`, `/admin` и др.).
- **Мобильный drag-and-drop:** Long-press (400мс) → ghost-элемент, haptic-вибрация, подсветка drop-зон.

### Изображения
- **T2I / I2I:** Генерация по тексту и по референсам (до 4 изображений).
- **Vision (бесплатно):** Распознавание содержимого изображения.
- **Ресайз / Поворот / Конвертация (бесплатно):** С client-side Canvas fallback.
- Перетаскивание сгенерированных изображений обратно в чат или слоты других режимов.

### Видео
- **T2V / I2V / V2V / A2V:** Генерация видео, оживление фото, замена персонажа, говорящий аватар.
- **Анализ видео (V2T):** Описание содержимого видео.
- **Конвертация / Ресайз / Поворот / Стоп-кадр:** Обработка видео (бесплатно).
- Параметры: aspect_ratio, duration, resolution, mode.
- Асинхронные задачи: опрос до 20 минут + фоновый polling каждые 10 секунд.

### Аудио
- **TTS:** Multi-service (VoiceRSS бесплатно / Gemini / ElevenLabs / BotHub / Pollinations).
- **STT (бесплатно):** Транскрибация MP3/WAV/OGG до 20 МБ.
- **Клонирование голоса / Конвертация (бесплатно).**

### UI/UX
- **Камера:** Фото и видео съёмка прямо из чата (front/back, mini 1024px).
- **Lightbox:** Полноэкранный просмотр с pinch-to-zoom и свайп-навигацией.
- **Toast-уведомления:** Info/success/error/warning с авто-закрытием через 3 сек.
- **Адаптивность:** Responsive для планшетов и телефонов, touch-жесты.

---

## 🌐 Платформы

### VK Desktop (vk.com)
- **Авторизация:** VKWebAppGetUserInfo (автовход с именем и фото).
- **Платежи:** Голоса VK через VKWebAppShowOrderBox (тестовый режим для `_test` уведомлений).
- **Оплата работает** для владельца приложения (до прохождения модерации).

### VK Mobile
- Подсказка об оплате голосами (VKWebAppShowOrderBox работает на мобильных).
- Скрытие бейджа Premium для экономии места.

### Одноклассники (OK)
- **Определение:** `IS_OK` по `document.referrer` (ok.ru), `ancestorOrigins`, OK URL-параметрам.
- **Тексты "ОКи":** Вместо "голосов" в UI когда `IS_OK=true`.
- **Платежи:** VKWebAppShowOrderBox + `callbacks.payment` (GET `/ok-payment-callback`).
- **Подпись:** OK_PAYMENT_SECRET_KEY (MD5 по сырым URL-encoded параметрам).
- **Статус:** Ожидает модерации OK (показывает "на профилактике" для непроверенных приложений).

### Telegram Mini App
- **Авторизация:** `initDataUnsafe.user` или `/api validate_init_data` (HMAC-SHA256).
- **Платежи:** Telegram Stars через Bot API `createInvoiceLink`.
- **Локальный TG SDK:** `/telegram-web-app.js` (работает в РФ где telegram.org заблокирован).

### Браузер (standalone)
- **VK ID OAuth** (`vk.html`): OneTap + exchangeCode → redirect с `vk_user_id`.
- **TG Login Widget** (`tg.html`): 5 сценариев авторизации, fallback для РФ.

---

## 💰 Платежи (бэкенд)

### VK Payments
- `get_item` / `order_status_change` (POST `/vk-payment-callback`).
- Подпись MD5 с `VK_SECURE_KEY` / `VK_APP_SECRET`.
- TEST mode: пропуск подписи для `_test` уведомлений.
- Зачисление кредитов в KV (`{chatId}_credit_balance`, TTL 365 дней).
- Идемпотентность: проверка `vk_order_{order_id}` перед зачислением.

### OK Payments
- Тот же протокол + `callbacks.payment` (GET `/ok-payment-callback`).
- Подпись с `OK_PAYMENT_SECRET_KEY`.
- chatId с префиксом `ok_`.
- Ранний перехват payment callbacks (до HTML-обработчика).

### Telegram Stars
- `createInvoiceLink` (currency: XTR, без provider_token).
- Polling баланса каждые 5 сек в течение 5 минут после оплаты.

---

## 🛠 Технические исправления (Under the Hood)

### История чатов (S3)
- **Восстановлены функции** `loadChatIndex`, `saveChatIndex`, `createS3Chat`, `deleteS3Chat`, `renameS3Chat` в `worker.js`.
- **Экспорт функций** в `module.exports` (были определены, но не экспортировались).
- **monolithContext** в `index.js` дополнен всеми S3-функциями.
- **Дефолтное имя чата:** "Чат ВКонтакте" / "Чат в Телеграм" (вместо "Основной чат").
- **Очистка chatArea** при начальной загрузке (исправлено дублирование сообщений).

### Маршрутизация (index.js)
- **Ранний перехват** payment callbacks (до HTML/статики) — `_realPath` определяется в начале handler.
- **Парсинг `_realPath`** без query string (исправлена обработка GET `/ok-payment-callback?transaction_id=...`).
- **Поддержка GET** для OK `callbacks.payment` (раньше только POST).

### Подпись платежей (webHandler.js)
- `verifyVKSignature` определяет платформу по `site=OK` или `env._paymentPlatform`.
- Пробует `VK_SECURE_KEY` → `VK_APP_SECRET` → `OK_PAYMENT_SECRET_KEY`.
- TEST mode для `_test` уведомлений VK (пропуск подписи).
- Логирование с `[VK-Payment]` / `[OK-Payment]` префиксами.

### VK Desktop инициализация
- `IS_VK` / `IS_OK` / `IS_VK_OR_OK` определение в первом `<body>` скрипте.
- `VKWebAppInit` + `VKWebAppGetUserInfo` для автовхода.
- Тексты "ОКи" вместо "голосов" когда `IS_OK=true`.
- Скрытие TG-кнопок и внешних платежей в VK/OK контексте.

---

## 🚀 Ключевое изменение v5.X: Переезд на Yandex.Cloud
- **Среда выполнения**: Node.js 22 на Yandex Cloud Functions.
- **База данных**: Yandex Database (YDB) + Yandex S3 (история чатов).
- **Архитектура**: Адаптер `index.js` → `worker.js` (эмуляция Cloudflare Workers).
- **CI/CD**: GitHub Actions → Yandex Cloud Functions (автоматический деплой при push в main).
