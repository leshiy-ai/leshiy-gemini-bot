🤖 Многофункциональный Telegram-бот "Gemini AI" by Leshiy на базе **Cloudflare Workers**
- **Google Gemini 2.5 Flash** (текст, изображения, видео, аудио)
- **Cloudflare Workers AI** (Stable Diffusion, Whisper)
- **Render-сервис** для медиа-обработки (поворот, резайз, GIF, стоп-кадры)

> 💡 Бот умеет:
> – генерировать изображения по тексту (/create)  
> – улучшать фото (/photo)  
> – создавать видео и аватары (/video)  
> – транскрибировать аудио/видео  
> – озвучивать текст голосом (/say)  
> – и многое другое!

---

## 🔧 Технологии

- **Frontend**: Telegram Bot API
- **Backend**: Cloudflare Workers (JavaScript/Node.js)
- **AI**: Gemini, Workers AI, Stability AI, Kie.ai
- **Медиа-обработка**: FFmpeg на Render (`leshiy-media-converter`)
- **Хранилище**: Cloudflare KV

---

## 🌐 Внешние сервисы
Медиа-конвертер: leshiy-media-converter
(резайз, поворот, GIF, стоп-кадр → MP4/JPG/PNG)

## 🚀 Быстрый старт

1. **Создайте бота в Telegram**:  
   Напишите [@BotFather](https://t.me/BotFather) → `/newbot` → получите `TELEGRAM_BOT_TOKEN`.

2. **Настройте Cloudflare Worker**:  
   - Зайдите в [Cloudflare Dashboard → Workers](https://dash.cloudflare.com)
   - Создайте Worker `gemini-photo-bot`
   - Свяжите с GitHub-репозиторием
   - Задайте переменные окружения (см. ниже)

3. **Установите вебхук**:  
   ```bash
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://gemini-photo-bot.<ваш-аккаунт>.workers.dev"

## 📜 Лицензия
MIT © Leshiy (Огорельцев Александр Валерьевич)
