## 🤖 Многофункциональный Telegram-бот "Gemini AI" by Leshiy

Бот-ассистент на базе **Cloudflare Workers** с интегрированными мощными AI-моделями для обработки текста, изображений, видео и аудио.

## 🌟 Основные возможности и AI-интеграции

- **Google Gemini 2.5 Flash**: Высокоскоростная модель для чата, анализа изображений и генерации промптов.
- **Cloudflare Workers AI**: Использование моделей Stable Diffusion (генерация изображений), Whisper (транскрипция аудио), Llama/Qwen (дополнительные чат-модели).
- **Render-сервис** (`leshiy-media-converter`): Внешняя медиа-обработка (поворот, ресайз, конвертация GIF в видео, создание стоп-кадров).
- **Платные сервисы**: Интеграция с Kie.ai, Stability AI, FusionBrain и другими для расширенных функций.

## 💡 **Бот умеет:**
* – Генерировать изображения по тексту, улучшать промпты: `/create`
* – Улучшать качество фото (особенно черно-белых): `/photo`
* – Создавать видеоролики и анимированные аватары: `/video`, `/avatar`
* – Транскрибировать аудио/видео (через Whisper/FFmpeg)
* – Озвучивать текст голосом (TTS): `/say`
* – Управлять балансом кредитов и API-ключами: `/balance`, `/apikey`
* – Очищать историю чата: `/stop`

---

## 🔧 Технологический стек

* **Frontend**: Telegram Bot API
* **Backend & CI/CD**: Cloudflare Workers (JavaScript/Node.js) и Wrangler CLI
* **AI/LLM**: Google Gemini, Workers AI, Stability AI, Kie.ai, FusionBrain, DeepSeek
* **Медиа-обработка**: FFmpeg на сервисе [Render](https://render.com) (`leshiy-media-converter`)
* **Хранилище данных**: Cloudflare Key-Value (KV)

---

## 🌐 Внешние сервисы

| Сервис | Описание | URL (при необходимости) |
| :--- | :--- | :--- |
| **Медиа-конвертер** | Обработка видео: ресайз, поворот, GIF в MP4, стоп-кадр. | `https://leshiy-media-converter.onrender.com` |
| **Платежи** | Ссылка для пополнения кредитов бота. | `https://boosty.to/leshiyalex/...` |

---

## 🚀 Быстрый старт (Развертывание)

Для запуска бота вам понадобится аккаунт **Cloudflare** и **GitHub**.

### 1. Подготовка Telegram

1.  **Создайте бота:** Напишите [@BotFather](https://t.me/BotFather) → `/newbot` → получите `TELEGRAM_BOT_TOKEN`.
2.  **Получите ID чата:** Узнайте ваш личный ID чата (для администрирования и отладки).

### 2. Настройка Cloudflare Worker и Wrangler

1.  **Клонируйте репозиторий.**
2.  **Установите Wrangler CLI** (глобально):
    ```bash
    npm install -g wrangler@4
    ```
3.  **Авторизуйтесь в Cloudflare:**
    ```bash
    wrangler login
    ```
4.  **Создайте KV-хранилища (Namespaces)** для данных:
    * `LAST_PHOTO_STORAGE` (для временных данных)
    * `CHAT_HISTORY_STORAGE` (для истории чатов)
5.  **Настройте Worker:**
    * Зайдите в [Cloudflare Dashboard → Workers & Pages](https://dash.cloudflare.com)
    * Создайте Worker `gemini-photo-bot` и свяжите его с вашим GitHub-репозиторием.

### 3. Настройка Переменных Окружения (Секретов и Привязок)

Вам необходимо настроить **Секреты** (API-ключи) и **Привязки** (KV, Workers AI) в Cloudflare Dashboard, используя имена из файла `wrangler.toml`.

#### 3.1. Переменные (Vars)

| Имя | Пример | Описание |
| :--- | :--- | :--- |
| `LESHIY_RENDER_HOST` | `https://leshiy-media-converter.onrender.com` | URL вашего медиа-конвертера. |
| `WORKER_DOMAIN` | `https://...workers.dev` | URL вашего Worker'а. |
| `PAYMENT_LINK` | `https://boosty.to/...` | Ссылка для доната/пополнения. |
| `DEBUG_ENABLED` | `true` / `false` | Включение режима отладки. |
| `ADMIN_CHAT_ID` | `<Ваш-ID-чата*` | ID чата администратора (для логов и команд). |
| *И другие из секции `[vars]` в `wrangler.toml`* | | |

#### 3.2. Секреты (Secrets)

В Cloudflare Dashboard (Settings → Environment Variables) вручную добавьте **значения** для следующих переменных:

| Имя | Описание |
| :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | Токен, полученный от BotFather. |
| `GEMINI_API_KEY` | API-ключ для Google Gemini. |
| `CLOUDFLARE_ACCOUNT_ID` | Ваш ID аккаунта Cloudflare. |
| `CLOUDFLARE_API_TOKEN` | Токен API с правами на Workers/KV. |
| *И все остальные ключи: `GROK_API_KEY`, `KIEAI_API_KEY`, и т.д.* | |

#### 3.3. Привязки (Bindings)

В Cloudflare Dashboard (Bindings) вручную привяжите следующие сервисы:

| Имя переменной в Worker'е | Тип привязки | Описание |
| :--- | :--- | :--- |
| `LAST_PHOTO_STORAGE` | KV Namespace | Хранилище для временных данных и лимитов. |
| `CHAT_HISTORY_STORAGE` | KV Namespace | Хранилище для истории чатов. |
| `AI` | Workers AI | Привязка к моделям Workers AI (Stable Diffusion, Llama). |

### 4. Установка вебхука

После успешного развертывания Worker'а, установите вебхук, чтобы Telegram знал, куда отправлять обновления:

```bash
curl "[https://api.telegram.org/bot](https://api.telegram.org/bot)<TELEGRAM_BOT_TOKEN*/setWebhook?url=https://gemini-photo-bot.<ваш-аккаунт*.workers.dev"
