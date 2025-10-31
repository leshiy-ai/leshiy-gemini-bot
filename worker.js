// Worker для Cloudflare: Мультимодальный Telegram-бот "Gemini AI" by Leshiy

// --- ГЛОБАЛЬНАЯ КОНСТАНТА ДЛЯ УПРАВЛЕНИЯ ДЕБАГОМ ---
// Установите true для включения логов, false для отключения.
const DEBUG_ENABLED = true; // <-- ИСПРАВЛЕНО: Теперь это boolean
// Если хотите включить, используйте: const DEBUG_ENABLED = true;

// --- НОВЫЕ ГЛОБАЛЬНЫЕ КОНСТАНТЫ ДЛЯ KV ---
const LAST_PROMPT_KEY_SUFFIX = '_last_prompt';
const LAST_IMAGE_DATA_KEY_SUFFIX = '_last_image_data'; 
const LAST_PROMPT_MESSAGE_ID_KEY_SUFFIX = '_last_prompt_message_id'; // Для редактирования меню
const LAST_ACTION_KEY_SUFFIX = '_last_action'; // Для режима редактирования (edit_prompt)
const USER_STATE_KEY_SUFFIX = '_user_state'; // <-- КРИТИЧЕСКИ ВАЖНОЕ ДОБАВЛЕНИЕ
// ----------------------------------------------------
// --- I. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ TELEGRAM и КОНВЕРТАЦИИ ---
// ----------------------------------------------------

// --- ИСПРАВЛЕННЫЕ И БЕЗОПАСНЫЕ Base64 ХЕЛПЕРЫ ---

// arrayBufferToBase64 - БЕЗОПАСНАЯ конвертация ArrayBuffer в Base64 (без переполнения стека)
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;

    // Используем буфер для предотвращения переполнения
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// --- Вспомогательная функция для конвертации Base64 в ArrayBuffer (требуется для ответа DALL-E) ---
function base64ToArrayBuffer(base64) {
    // В Cloudflare Worker'е используется atob
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// Хелпер для конвертации строки в ArrayBuffer (замена TextEncoder для старых Workers)
function stringToArrayBuffer(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

// Более безопасное декодирование (Устраняет ошибку "0 chars")
function base64ToUint8Array(base64) {
    let cleanBase64 = String(base64).replace(/[\r\n\s]/g, '');
    cleanBase64 = cleanBase64.includes(',') ? cleanBase64.split(',')[1] : cleanBase64;
    
    if (cleanBase64.length === 0) {
        return new Uint8Array(0);
    }
    
    const binaryString = atob(cleanBase64);
    
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// sendPhotoFromBase64 - Отправляет фото в Telegram, используя ручной multipart
/**
 * Отправляет изображение в Telegram, создавая multipart/form-data вручную (самый безопасный метод для Workers).
 */
async function sendPhotoFromBase64(chatId, base64Image, caption, token) {
    const boundary = '----Boundary' + Math.random().toString(16).substring(2);
    const url = `https://api.telegram.org/bot${token}/sendPhoto`;
    
    // Используем TextEncoder, который является частью глобальной области видимости в Cloudflare Workers
    const encoder = new TextEncoder();

    try {
        const imageBytes = base64ToUint8Array(base64Image); 
        
        if (imageBytes.byteLength === 0) {
            throw new Error('Decoded image file is empty (0 bytes).');
        }

        // 1. Создание строковых частей
        const parts = [];

        // Части полей: chat_id, caption, parse_mode
        parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`);
        parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`);
        parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`);

        // Заголовок файла 'photo'
        const photoHeader = `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="image.png"\r\nContent-Type: image/png\r\n\r\n`;
        parts.push(photoHeader);
        
        const photoFooter = `\r\n--${boundary}--`;

        // 2. Конвертируем все строковые части в ArrayBuffer
        const headerBuffer = encoder.encode(parts.join('')); // Используем TextEncoder
        const footerBuffer = encoder.encode(photoFooter);

        // 3. Объединяем буферы
        const totalLength = headerBuffer.byteLength + imageBytes.byteLength + footerBuffer.byteLength;
        const bodyBuffer = new Uint8Array(totalLength);
        
        let offset = 0;
        bodyBuffer.set(headerBuffer, offset);
        offset += headerBuffer.byteLength;
        
        bodyBuffer.set(imageBytes, offset); // Бинарные данные изображения
        offset += imageBytes.byteLength;
        
        bodyBuffer.set(footerBuffer, offset);
        
        // 4. Вызов Fetch
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`, 
            },
            body: bodyBuffer.buffer, // Передаем ArrayBuffer
        });
        
        const result = await response.json();
        
        if (!result.ok) {
            console.error("Telegram sendPhoto error:", result.description);
            // ... (обработка ошибок)
            return { ok: false, description: result.description || 'Неизвестная ошибка Telegram API' };
        }
        return { ok: true, messageId: result.result.message_id };

    } catch (e) {
        console.error("Критическая ошибка при отправке фото в Telegram:", e);
        return { ok: false, description: e.message || `Сетевая ошибка при отправке фото.` };
    }
}

// ? sendMessageWithKeyboard - Отправляет сообщение с инлайн-кнопками
async function sendMessageWithKeyboard(chatId, text, token, keyboard) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = { 
        chat_id: chatId, 
        text: text, 
        parse_mode: 'HTML', 
        reply_markup: {
            inline_keyboard: keyboard // Массив массивов кнопок
        }
    };
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (response.ok) { return await response.json(); } 
        else {
            console.error("Telegram sendMessageWithKeyboard failed with status:", response.status);
            return { ok: false, message: "Telegram API error" };
        }
    } catch (e) {
        console.error("Error sending message with keyboard to Telegram:", e);
        return { ok: false, message: e.message };
    }
}

// ? getPromptKeyboard - Генерирует Inline-клавиатуру для меню промпта
function getPromptKeyboard(currentPrompt) {
    const hasPrompt = currentPrompt && currentPrompt.trim().length > 0;
    
    let keyboard = [];
    
    if (hasPrompt) {
        // --- 1-я строка: Основные действия с промптом ---
        keyboard.push([
            { text: "?? Редактировать текст", callback_data: "edit_prompt" },
            { text: "?? Описание из фото", callback_data: "regenerate_prompt" }
        ]);
        
        // --- 2-я строка: Генерация и перевод ---
        keyboard.push([
            { text: "?? Создать картинку", callback_data: "vision_generate" },
            { text: "?? Перевести (RU/EN)", callback_data: "translate_prompt" } 
        ]);
        
        // --- 3-я строка: Очистка ---
        keyboard.push([
            { text: "?? Очистить промпт/контекст", callback_data: "clear_prompt" }
        ]);
    } else {
        // --- Промпта нет: Предлагаем создать ---
        keyboard.push([
            { text: "? Создать новый промпт", callback_data: "create_new_prompt" }
        ]);
    }
    
    return { inline_keyboard: keyboard };
}

// ? displayPromptMenu: Показывает меню промпта (ИСПРАВЛЕНО)
/**
 * Извлекает кнопки из getPromptKeyboard и отправляет сообщение.
 * @param {number} chatId - ID чата Telegram.
 * @param {string} promptText - Текущий промпт.
 * @param {string} TELEGRAM_BOT_TOKEN - Токен бота.
 */
async function displayPromptMenu(chatId, promptText, TELEGRAM_BOT_TOKEN) {
    // Используем getPromptKeyboard для получения массива кнопок
    const keyboardObject = getPromptKeyboard(promptText); 

    await sendMessageWithKeyboard(
        chatId, 
        `?? **Ваш текущий промпт:**\n\`${promptText}\`\n\nВыберите действие:`, 
        TELEGRAM_BOT_TOKEN, 
        keyboardObject.inline_keyboard // Передаем только массив инлайн-кнопок
    );
}

// ? deleteMessage - Удаляет сообщение
async function deleteMessage(chatId, messageId, token) {
    const url = `https://api.telegram.org/bot${token}/deleteMessage`;
    const body = { chat_id: chatId, message_id: messageId };
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

// ? answerCallbackQuery - Обязательный ответ на нажатие кнопки
async function answerCallbackQuery(callbackQueryId, text, token) {
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    const body = { callback_query_id: callbackQueryId, text: text };
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

// ? sendMessage - ТЕПЕРЬ ВОЗВРАЩАЕТ JSON-ОТВЕТ TELEGRAM (HTML)
async function sendMessage(chatId, text, token, replyToMessageId = null, keyboard = null) { // <-- ДОБАВЛЕН keyboard
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = { 
        chat_id: chatId, 
        text: text, 
        parse_mode: 'HTML', 
        reply_to_message_id: replyToMessageId 
    };
    if (keyboard) { // <-- ДОБАВЛЕНО УСЛОВИЕ ДЛЯ КЛАВИАТУРЫ
        body.reply_markup = keyboard;
    }
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (response.ok) { return await response.json(); } 
        else {
            console.error("Telegram sendMessage failed with status:", response.status);
            return { ok: false, message: "Telegram API error" };
        }
    } catch (e) {
        console.error("Error sending message to Telegram:", e);
        return { ok: false, message: e.message };
    }
}

// ? editMessage --- ФУНКЦИЯ РЕДАКТИРОВАНИЯ СООБЩЕНИЯ (Markdown) ---
async function editMessage(chatId, messageId, text, token) {
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: text, parse_mode: 'Markdown' }),
        });
    } catch (e) {
        console.error("Error editing message in Telegram:", e);
    }
}

async function getTelegramFilePath(fileId, token) {
    const url = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.ok) { throw new Error(`Telegram API: Не удалось получить file_path. ${JSON.stringify(data.description)}`); }
    return data.result.file_path;
}

async function downloadTelegramFile(filePath, token) {
    const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
    // ИСПРАВЛЕНО: Добавлен таймаут (28с) и проверка.
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(28000) });
        if (!response.ok) { throw new Error(`HTTP Error ${response.status} при скачивании файла.`); }
        return response.arrayBuffer();
    } catch (e) {
        if (e.name === 'TimeoutError') { throw new Error("Скачивание файла превысило лимит времени (28 секунд). Файл слишком большой."); }
        throw e;
    }
}

// ? logDebug (Запись лога в KV-хранилище)
async function logDebug(type, message, env) {
    const { BOT_LOGS_STORAGE } = env;
    if (!BOT_LOGS_STORAGE) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}][${type}] ${message}`;
    
    // Получаем текущий лог (или пустой массив)
    let logs = await BOT_LOGS_STORAGE.get('master_log_list', { type: 'json' });
    logs = Array.isArray(logs) ? logs : [];
    
    // Добавляем новую запись в начало (чтобы последние были первыми)
    logs.unshift(logEntry);
    
    // Обрезаем лог до 50 последних записей
    if (logs.length > 50) {
        logs = logs.slice(0, 50);
    }
    // Сохраняем обратно
    await BOT_LOGS_STORAGE.put('master_log_list', JSON.stringify(logs));
}

// ? Отправка видео (ОБНОВЛЕННАЯ: поддерживает caption, использует Markdown)
async function sendVideo(chatId, videoUrl, token, caption = "") {
    const url = `https://api.telegram.org/bot${token}/sendVideo`;
    const body = {
        chat_id: chatId,
        video: videoUrl,
        parse_mode: 'Markdown' 
    };
    if (caption) { body.caption = caption; }
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

// --- НЕДОСТАЮЩИЕ KV-ХЕЛПЕРЫ ---
async function savePollData(chatId, data, VEO_POLL_STORAGE) {
    await VEO_POLL_STORAGE.put(chatId.toString(), JSON.stringify(data), { expirationTtl: 3600 });
}

async function getPollData(chatId, VEO_POLL_STORAGE) {
    const data = await VEO_POLL_STORAGE.get(chatId.toString());
    return data ? JSON.parse(data) : null;
}

// ? generateUniqueToken - Создает уникальный хеш на основе ID
async function generateUniqueToken(chatId, secretKey) {
    const encoder = new TextEncoder();
    const data = encoder.encode(chatId.toString() + secretKey); // Добавляем секретный ключ для надежности
    
    // Используем SHA-256 для хеширования
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Преобразуем Buffer в строку (Base64 URL)
    const base64Url = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
        
    // Берем первые 10 символов для удобства
    return base64Url.substring(0, 10);
}

// editMessageWithKeyboard - Редактирует сообщение и добавляет/изменяет инлайн-кнопки
async function editMessageWithKeyboard(chatId, messageId, text, token, replyMarkup) {
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    
    const body = { 
        chat_id: chatId, 
        message_id: messageId, 
        text: text, 
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (response.ok) { return await response.json(); } 
        else {
            console.error("Telegram editMessageWithKeyboard failed with status:", response.status);
            return { ok: false, message: "Telegram API error" };
        }
    } catch (e) {
        console.error("Error editing message with keyboard to Telegram:", e);
        return { ok: false, message: e.message };
    }
}

// *** 1.9. sendPhotoWithCaption - Отправка фото через ArrayBuffer (ФИНАЛЬНЫЙ ФИКС + ДЕБАГ) ***
/**
 * Отправляет изображение в Telegram, используя ArrayBuffer и FormData.
 * @param {number} chatId - ID чата.
 * @param {ArrayBuffer} photoArrayBuffer - Бинарные данные изображения (ArrayBuffer).
 * @param {string} caption - Подпись к фотографии.
 * @param {string} token - Токен Telegram Bot API.
 * @param {Object} envData - Объект окружения с ADMIN_CHAT_ID для дебага.
 * @returns {Promise<Object>} Ответ от Telegram API.
 */
async function sendPhotoWithCaption(chatId, photoArrayBuffer, caption, token, envData) {
    const { ADMIN_CHAT_ID } = envData;
    const TELEGRAM_CAPTION_LIMIT = 1024; // Максимальный лимит Telegram
    const SAFE_MAX_LENGTH = 990;       // <-- БЕЗОПАСНЫЙ ПОРОГ
    const ELLIPSIS_SUFFIX = '...';

    // !!! НОВОЕ ИСПРАВЛЕНИЕ: ОГРАНИЧЕНИЕ ДЛИНЫ ПОДПИСИ (MAX 1024 символа) !!!
    let finalCaption = caption;
    if (caption.length > SAFE_MAX_LENGTH) {
        
        // Длина, до которой нужно обрезать исходную строку
        const truncateLength = SAFE_MAX_LENGTH - ELLIPSIS_SUFFIX.length; 
        
        finalCaption = caption.substring(0, truncateLength) + ELLIPSIS_SUFFIX;

        // Опционально: можно уведомить админа, что подпись была обрезана
        if (DEBUG_ENABLED) { 
            await sendMessage(ADMIN_CHAT_ID, `?? **[DEBUG] SendPhoto:** Подпись обрезана с ${caption.length} до ${finalCaption.length} символов (Лимит: ${TELEGRAM_CAPTION_LIMIT}).`, token);
        }
    }

    if (!photoArrayBuffer || photoArrayBuffer.byteLength === 0) {
        if (DEBUG_ENABLED) { // <-- Используем глобальную константу
        await sendMessage(ADMIN_CHAT_ID, `? **[DEBUG] SendPhoto: Ошибка**\nПустой ArrayBuffer изображения.`, token);
        throw new Error("sendPhotoWithCaption: Пустой или невалидный ArrayBuffer изображения.");
        }
    }
    
    const apiUrl = `https://api.telegram.org/bot${token}/sendPhoto`;
    
    // 1. Формируем FormData
    const formData = new FormData();
    
    // !!! КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Используем File для ArrayBuffer, чтобы Telegram корректно принял бинарные данные.
    // Если у вас нет глобального File, используйте Blob. Я буду использовать File, как более чистый вариант.
    // Если File не сработает, нужно будет использовать new Blob(...)
    const imageFile = new File([photoArrayBuffer], 'image.png', { type: 'image/png' });

    // 2. Добавляем параметры
    formData.append('chat_id', chatId.toString());
    formData.append('caption', finalCaption);
    // Ключевое поле 'photo' для метода sendPhoto.
    formData.append('photo', imageFile, 'image.png'); 

    // --- ДЕБАГ #1: ЛОГИРОВАНИЕ ПЕРЕД ОТПРАВКОЙ В TELEGRAM ---
    if (DEBUG_ENABLED) { // <-- Используем глобальную константу
    await sendMessage(ADMIN_CHAT_ID, 
        `?? **[DEBUG] SendPhoto: Отправка в Telegram**\nМетод: sendPhoto\nРазмер фото (bytes): ${photoArrayBuffer.byteLength}\nChat ID: ${chatId}`, 
        token);
    }

    // 3. Отправляем запрос
    let response;
    try {
        response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
            // Content-Type: 'multipart/form-data' устанавливается автоматически
            signal: AbortSignal.timeout(60000)
        });
    } catch (e) {
        if (DEBUG_ENABLED) {
        await sendMessage(ADMIN_CHAT_ID, `? **[DEBUG] SendPhoto: Ошибка Fetch**\n${e.message}`, token);
        throw new Error(`Ошибка сети/таймаута при отправке фото в Telegram: ${e.message}`);
        }
    }

    const responseText = await response.text();
    let responseData = {};
    try { responseData = JSON.parse(responseText); } catch(e) { /* не JSON */ }

    // --- ДЕБАГ #2: ЛОГИРОВАНИЕ ОТВЕТА ОТ TELEGRAM ---
    if (DEBUG_ENABLED) {
    if (response.ok) {
        await sendMessage(ADMIN_CHAT_ID, 
            `? **[DEBUG] SendPhoto: Ответ Telegram**\nStatus: ${response.status}\nOk: ${responseData.ok}\nРезультат: ${responseData.ok ? 'Успех' : responseData.description || 'Нет описания'}`, 
            token);
    } else {
        await sendMessage(ADMIN_CHAT_ID, 
            `? **[DEBUG] SendPhoto: Ошибка Telegram API**\nStatus: ${response.status}\nОтвет: \`\`\`json\n${responseText.substring(0, 1000)}\n\`\`\``, 
            token);
        }
    }
    
    if (!response.ok || !responseData.ok) {
        throw new Error(`Telegram API Error: ${responseData.description || 'Неизвестная ошибка при отправке фото.'}`);
    }

    return responseData;
}

// ----------------------------------------------------
// II. ФУНКЦИИ ВЫЗОВА API (Gemini, Veo, ModelsLab) 
// ----------------------------------------------------

// *** 2.1. Gemini Vision (Промпт) ***
async function callGeminiVision(imageBase64, key) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    const systemInstructionText = "РОЛЬ И ЯЗЫК: Действуй как 'Фотореставратор'. Общение СТРОГО на РУССКОМ языке. ЦЕЛЬ: Создать максимально детализированный, буквальный промпт для Image-to-Image генерации. Твой ответ должен быть только промптом, без приветствий и объяснений.";
    const body = {
        system_instruction: { parts: [{ text: systemInstructionText }] },
        contents: [{
            parts: [
                { text: "На основе присланного изображения, сгенерируй ОЧЕНЬ ПОДРОБНЫЙ, точный и буквальный промпт на РУССКОМ языке для нейросети для генерации изображения. ТОЧНО ВОСПРОИЗВЕДИ сцену, но в высоком разрешении и цвете. Используй слово 'ребенок' вместо 'малыш' или 'младенец'. НЕ УПОМИНАЙ 'пустышка', если это возможно, или замени на нейтральный термин вроде 'аксессуар для рта'. Сохрани СТРОГО ту же КОМПОЗИЦИЮ и ракурс. Используй художественный стиль 'фотореалистичная иллюстрация' или 'картина' вместо 'фотография'. Добавь в конец промпта суффиксы для качества: 'высокая детализация, шедевр, студийное освещение'." },
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
            ]
        }]
    };
    const response = await fetch(`${url}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await response.json();
    if (data.error) { throw new Error(`Gemini API Error: ${data.error.message}`); }
    const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) { throw new Error("Gemini не вернул промт."); }
    return textResult.trim();
}

// *** 2.2. Gemini Image Generator (Image + Text-to-Image) - Усиленная отладка для /photo ***
async function callGeminiImageGenerator(prompt, imageBase64, key) {
    const model = 'gemini-2.5-flash-image'; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`; 
    if (!imageBase64 || imageBase64.length < 100) { throw new Error("Исходное изображение в Base64 отсутствует или слишком короткое для Gemini Image Generator."); }
    const mimeType = 'image/jpeg'; 

    const body = {
        "contents": [
            {
                "parts": [
                    { "text": prompt },
                    { "inlineData": { "mimeType": mimeType, "data": imageBase64 } } 
                ]
            }
        ],
        "generationConfig": { "responseModalities": ["Image"] }
    };

    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini Image API Error (${model}): ${response.status} - Response: ${errorText.substring(0, 150)}...`);
    }
    
    const data = await response.json();
    if (data.error) { throw new Error(`Gemini Error (${model}): ${data.error.message}`); }
    
    // !!! НОВАЯ ПРОВЕРКА НА БЛОКИРОВКУ !!!
    const safetyRatings = data.promptFeedback?.safetyRatings;
    if (safetyRatings && safetyRatings.some(r => r.probability !== 'NEGLIGIBLE')) {
        const blockedCategories = safetyRatings.filter(r => r.probability !== 'NEGLIGIBLE').map(r => r.category.split('_').pop()).join(', ');
        throw new Error(`Генерация заблокирована фильтрами безопасности Gemini. Категории: [${blockedCategories}].`);
    }
    // !!! КОНЕЦ ПРОВЕРКИ !!!

    const base64Image = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data; 
    
    if (!base64Image) { 
        // Если изображение не вернулось, но фильтры не сработали
        const feedback = JSON.stringify(data.promptFeedback || data.error);
        throw new Error(`Gemini не вернул изображение (Base64). Ответ API: ${feedback.substring(0, 100)}...`); 
    }
    
    return base64Image;
}

// *** 2.6. callWorkersAITextToImage - Генерирует изображение через Cloudflare Workers AI (AI Binding)
async function callWorkersAITextToImage(prompt, envData) {
    const aiBinding = envData.AI; 

    if (!aiBinding) {
        throw new Error("? Ошибка Worker AI: Привязка 'AI' не найдена.");
    }

    // Используем более стабильную базовую модель SDXL
    const model = "@cf/stabilityai/stable-diffusion-xl-base-1.0"; 
    // const model = "@cf/stabilityai/stable-diffusion-v1-5"; 
    
    // Промпт для негативного промпта (улучшает качество)
    const negative_prompt = "bad anatomy, blurry, low resolution, unsharp, out of focus, duplicate, mutated, extra fingers";

    const inputs = {
        prompt: prompt,
        negative_prompt: negative_prompt, 
        width: 512,
        height: 512,
        num_steps: 20 
    };

    let response;
    try {
        // 3. Вызываем AI Binding
        response = await aiBinding.run(model, inputs);
    } catch (e) {
        throw new Error(`Workers AI: Критическая ошибка вызова AI.run() - ${e.message}`);
    }

    const arrayBuffer = response;
    
    // 4. КРИТИЧЕСКАЯ ПРОВЕРКА: Если ArrayBuffer пуст, возвращаем явную ошибку.
    if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength < 1024) { 
        // Если ArrayBuffer пуст, это означает, что генерация не состоялась.
        throw new Error(`Workers AI вернул ПУСТЫЕ ДАННЫЕ. Длина: ${arrayBuffer?.byteLength || 0}. (Модель заблокирована?)`);
    }

    // 5. Преобразуем ArrayBuffer в Base64
    const base64Image = arrayBufferToBase64(arrayBuffer);
    
    // 6. ФИНАЛЬНАЯ ПРОВЕРКА: Если Base64 строка пуста, это ошибка конвертации.
    if (!base64Image || base64Image.length < 100) {
        throw new Error(`Ошибка конвертации: Base64 строка пуста. Длина: ${base64Image?.length || 0}.`);
    }

    return base64Image;
}

// *** 2.4. Veo (Gemini API для видео) - ИСПРАВЛЕНО: ТОЛЬКО ЗАПУСК, БЕЗ POLLING! ***
async function startGeminiVeoImageToVideo(prompt, imageBase64, imageMimeType, GEMINI_API_KEY, chatId, DEBUG_CHAT_ID, TELEGRAM_BOT_TOKEN) { // <-- ДОБАВЛЕНЫ АРГУМЕНТЫ DEBUG
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp|jpg);base64,/, "");

    const startUrl = `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning?key=${GEMINI_API_KEY}`;
    
    const startBody = {
        "instances": [{
            "prompt": prompt,
            "image": { 
                "bytesBase64Encoded": cleanBase64, 
                "mimeType": imageMimeType 
            }
        }],
    };

    const startResponse = await fetch(startUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(startBody),
    });

    let startData = {};
    const errorText = await startResponse.text();
    
    try {
        startData = JSON.parse(errorText);
    } catch (e) {
        // Если это не JSON, то это просто ошибка текста (реже)
    }

    if (DEBUG_CHAT_ID && chatId.toString() === DEBUG_CHAT_ID) {
        await sendMessage(chatId, `?? Veo Debug Start Status: ${startResponse.status}. Response Body (full):\n<code>${errorText}</code>`, TELEGRAM_BOT_TOKEN);
    }

    if (!startResponse.ok) {
        if (startResponse.status === 429) {
            throw new Error("Gemini API: Превышен лимит запросов (Rate Limit 429).");
        }
        const safeError = startData.error?.message || errorText.substring(0, 150) || 'Пустой ответ';
        throw new Error(`Veo Start API Error: ${startResponse.status} - Response: ${safeError}...`);
    }
    
    // Если ответ OK, но Veo не вернул имя операции (что очень маловероятно)
    const operationName = startData.name; 
    
    if (!operationName) { 
        throw new Error("Veo не вернул имя операции для Polling, хотя статус OK."); 
    }
    
    return operationName;
}

// *** 2.5. Gemini Chat API (для текстового общения) - ИСПРАВЛЕНО ***
async function callGeminiChat(chatHistory, userMessageText, GEMINI_API_KEY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const PAYMENT_LINK = "https://boosty.to/leshiyalex/single-payment/donation/754164/target?share=target_link";

    // Преобразуем историю в формат Gemini Content
    const contents = chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    // Добавляем текущее сообщение пользователя
    contents.push({ role: 'user', parts: [{ text: userMessageText }] });

    // !!! ОБНОВЛЕННАЯ СИСТЕМНАЯ ИНСТРУКЦИЯ !!!
    const systemInstructionText = `
        Ты — многофункциональный AI-ассистент "Gemini AI" от Leshiy, отвечающий на русском языке. 
        Твои ключевые функции:
        1. **Обработка изображений**: Ты умеешь генерировать детальные промпты из присланных пользователем фотографий (команда /photo) но бесплатно только 10 фотографий, затем предлагаешь оплату через сервис Boosty.
        2. **Генерация контента**: Ты создаешь новые изображения по текстовым промптам (команда /create) бесплатно и без ограничений.
        3. **Распознавание речи**: Ты транскрибируешь голосовые сообщения пользователя в текст, который затем обрабатываешь.
        4. **Чат**: Ты ведешь диалог, отвечаешь на вопросы и сохраняешь контекст беседы.
        
        Когда пользователь спрашивает, что ты умеешь, обязательно упомяни о своих навыках работы с изображениями и голосовыми сообщениями (транскрибацией), а также о командах /photo и /create.
        Если пользователь спрашивает о **пополнении баланса, оплате, тарифах или ссылке** - вот прямая ссылка на страницу оплаты Boosty: [**ПОПОЛНИТЬ СЧЕТ / КУПИТЬ ДОСТУП**](${PAYMENT_LINK})
            **?? Наши тарифы:**
        1. **Поштучная оплата:** 1 улучшение = **10 руб.** Вы получаете точное количество улучшений, согласно оплаченной сумме (например, за 120 руб. — 12 фото).
        2. **Безлимитный доступ:** При оплате **от 1000 руб.** и выше, Вы получаете **полный безлимитный доступ** к функции /photo без каких-либо ограничений!
        Остальные функции, включая **/create** (генерация изображений по тексту) и распознавание голоса, остаются для Вас полностью бесплатными.
        Ответы должны быть информативными и доброжелательными.
    `;
    // !!! КОНЕЦ ОБНОВЛЕННОЙ СИСТЕМНОЙ ИНСТРУКЦИИ !!!

    const body = {
        // !!! ИСПРАВЛЕНИЕ: systemInstruction теперь на верхнем уровне !!!
        systemInstruction: { 
            parts: [{ text: systemInstructionText }] 
        },
        contents: contents
        // УДАЛЕНО: поле 'config'
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini Chat API Error: ${response.status} - ${errorText.substring(0, 150)}...`);
    }

    const data = await response.json();
    const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResult) { throw new Error(`Gemini Chat не вернул ответ. Причина: ${JSON.stringify(data.promptFeedback)}`); }
    
    return textResult.trim();
}

// *** 2.6. Gemini Speech-to-Text (STT) ***
async function callGeminiSpeechToText(audioBase64, mimeType, key) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    const systemInstructionText = "РОЛЬ: Ты эксперт по распознаванию речи. ТВОЯ ЦЕЛЬ: Транскрибировать аудиофайл СТРОГО на РУССКОМ языке, возвращая ТОЛЬКО распознанный текст, без приветствий и объяснений.";
    
    const body = {
        system_instruction: { parts: [{ text: systemInstructionText }] },
        contents: [{
            parts: [
                { text: "Транскрибируй аудиозапись в текст. Верни только текст." },
                { inlineData: { mimeType: mimeType, data: audioBase64 } }
            ]
        }]
    };
    
    const response = await fetch(`${url}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    
    const data = await response.json();
    if (data.error) { throw new Error(`Gemini STT API Error: ${data.error.message}`); }
    const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResult) { 
        throw new Error(`Gemini не вернул транскрипцию. Причина: ${JSON.stringify(data.promptFeedback)}`); 
    }
    return textResult.trim();
}

// *** 2.7. Workers AI Chat API (для текстового общения с историей) ***
/**
 * Вызывает модель Gemma-2b через Workers AI для генерации ответа в чате.
 * @param {Array<Object>} chatHistory - История чата в формате { role: 'user' | 'model', text: string }.
 * @param {string} userMessageText - Текущее сообщение пользователя.
 * @param {Object} envData - Объект окружения Cloudflare Worker, содержащий привязку AI.
 * @returns {Promise<string>} Сгенерированный текстовый ответ.
 */
async function callWorkersAIChat(chatHistory, userMessageText, envData) {
    const { AI } = envData; 
    if (!AI) {
        throw new Error("Workers AI binding 'AI' не настроен. Проверьте Cloudflare Dashboard.");
    }
    
    // --- ВАШИ ПЕРЕМЕННЫЕ ДЛЯ ССЫЛОК И ТАРИФОВ ---
    const PAYMENT_LINK = "https://boosty.to/leshiyalex/single-payment/donation/754164/target?share=target_link";
    const MODEL_NAME = "@cf/google/gemma-2b-it-lora"; 
    // --- КОНЕЦ ПЕРЕМЕННЫХ ---


    // 1. ОПРЕДЕЛЕНИЕ СИСТЕМНОГО КОНТЕКСТА 
    const systemPromptText = `
        ТЫ ДОЛЖЕН СТРОГО СЛЕДОВАТЬ ВСЕМ ИНСТРУКЦИЯМ. 
        ТЫ НЕ ЯВЛЯЕШЬСЯ LLaMA, AI ОТ Meta, или большой языковой моделью. 
        ТЫ — многофункциональный AI-ассистент "Gemini AI" от Leshiy, отвечающий на русском языке. 
        Твои ключевые функции:
        1. **Обработка изображений**: Ты умеешь генерировать детальные промпты из присланных пользователем фотографий (команда /photo) но бесплатно только 10 фотографий, затем предлагаешь оплату через сервис Boosty.
        2. **Генерация контента**: Ты создаешь новые изображения по текстовым промптам (команда /create) бесплатно и без ограничений.
        3. **Распознавание речи**: Ты транскрибируешь голосовые сообщения пользователя в текст, который затем обрабатываешь.
        4. **Чат**: Ты ведешь диалог, отвечаешь на вопросы и сохраняешь контекст беседы.
        
        Когда пользователь спрашивает, что ты умеешь, обязательно упомяни о своих навыках работы с изображениями и голосовыми сообщениями (транскрибацией), а также о командах /photo и /create.
        Если пользователь спрашивает о **пополнении баланса, оплате, тарифах или ссылке** - вот прямая ссылка на страницу оплаты Boosty: [**ПОПОЛНИТЬ СЧЕТ / КУПИТЬ ДОСТУП**](${PAYMENT_LINK})
              **?? Наши тарифы:**
        1. **Поштучная оплата:** 1 улучшение = **10 руб.**
        2. **Безлимитный доступ:** При оплате **от 1000 руб.** и выше, Вы получаете **полный безлимитный доступ** к функции /photo без каких-либо ограничений!
        Остальные функции, включая **/create** (генерация изображений по тексту) и распознавание голоса, остаются для Вас полностью бесплатными.
        Ответы должны быть информативными и доброжелательными.
    `.trim();

    // 2. ФОРМИРОВАНИЕ ИСТОРИИ (messages)
    
    // Инициализация массива с ИСКУССТВЕННОЙ ПРЕДЫСТОРИЕЙ, чтобы закрепить личность.
    const messages = [
        { 
            // Роль 'user' всегда имеет больший вес. Мы используем её для передачи контекста.
            role: 'user', 
            content: `Мои инструкции: ${systemPromptText}` 
        },
        { 
            // Роль 'assistant' (модель) подтверждает, что инструкция принята и закреплена.
            role: 'assistant', 
            content: 'Инструкции приняты. С этого момента я являюсь многофункциональным AI-ассистентом "Gemini AI" от Leshiy и буду следовать всем указаниям. Чем могу помочь?' 
        }
    ];

    // Добавляем реальную историю чата
    chatHistory.forEach(msg => {
        messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant', 
            content: msg.text
        });
    });

    // Добавляем текущее сообщение пользователя
    messages.push({ role: 'user', content: userMessageText });

    // Модель
    const modelName = MODEL_NAME;
    
    try {
        const response = await AI.run(modelName, { messages });

        if (!response || !response.response) {
            throw new Error(`Workers AI не вернул ожидаемый ответ. Response: ${JSON.stringify(response)}`);
        }

        let modelResponse = response.response.trim();
        
        // --- 3. ФИНАЛЬНАЯ ЛОГИКА ПЕРЕХВАТА И ПОСТ-ОБРАБОТКИ ---
        
        const userMsg = userMessageText.toLowerCase().trim();
        const keywordsToFix = ['LLaMA', 'Meta AI', 'MetaAI', 'austin', 'языковая модель', 'language model'];
        const isSelfCorrectionNeeded = keywordsToFix.some(keyword => 
            modelResponse.toLowerCase().includes(keyword.toLowerCase())
        );

        // 1. ПЕРЕХВАТ ЛИЧНОСТИ
        if (userMsg.includes('кто ты') || userMsg.includes('что за бот')) {
            modelResponse = 'Я — многофункциональный AI-ассистент "Gemini AI" от Leshiy. Я создан для помощи в чате, генерации промптов для фото, создания картинок (/create) и распознавания речи.';
        } 
        
        // 2. ПЕРЕХВАТ ТАРИФОВ/ОПЛАТЫ
        else if (userMsg.includes('платить') || userMsg.includes('пополнить') || userMsg.includes('оплата') || userMsg.includes('тарифы') || userMsg.includes('платно')) {
            modelResponse = `
                Оплату можно произвести через сервис Boosty: [**ПОПОЛНИТЬ СЧЕТ / КУПИТЬ ДОСТУП**](${PAYMENT_LINK})
                
                **?? Наши тарифы (для функции /photo):**
            1. **Поштучная оплата:** 1 улучшение = **10 руб.**
            2. **Безлимитный доступ:** При оплате **от 1000 руб.** и выше.
            Остальные функции, включая **/create** (генерация изображений по тексту) и распознавание голоса, остаются для Вас полностью бесплатными.
            `.trim();
        }

        // 3. ПЕРЕХВАТ ФУНКЦИЙ/ЧТО УМЕЕШЬ
        else if (userMsg.includes('что умеешь') || userMsg.includes('функции')) {
            modelResponse = `
    Я умею:
* **Обработка изображений** (команда /photo): Генерирую детальные промпты из ваших фото (10 бесплатно, далее по тарифу).
* **Генерация контента** (команда /create): Создаю изображения по вашему текстовому описанию (бесплатно).
* **Распознавание речи**: Превращаю голосовые сообщения в текст.
* **Чат**: Веду диалог и отвечаю на вопросы.
            `.trim();
        }
        
        // 4. КОМПЕНСАЦИЯ ЛЮБЫХ ОСТАТОЧНЫХ СЛЕДОВ LLaMA И СМЕШАННЫХ СЛОВ
        else if (isSelfCorrectionNeeded) {
            modelResponse = modelResponse
                .replace(/LLaMA/gi, 'Gemini AI')
                .replace(/Meta AI/gi, 'Leshiy')
                .replace(/austin/gi, 'Gemini AI')
                .replace(/с помощью моей способности understand and generate text/gi, '') 
                .replace(/completely бесплатными/gi, 'полностью бесплатными'); // Исправление смешанного языка
        }
        
        // --- КОНЕЦ ПОСТ-ОБРАБОТКИ ---

        return modelResponse;
    } catch (e) {
        console.error("Workers AI call failed:", e);
        throw new Error(`Ошибка Workers AI: ${e.message}`);
    }
}

// *** 2.8. Workers AI Speech-to-Text (Whisper) ***
/**
 * Транскрибирует аудиофайл (ArrayBuffer), используя Workers AI (Whisper).
 * @param {ArrayBuffer} audioBuffer - Буфер аудиофайла.
 * @param {Object} envData - Объект окружения, содержащий привязку AI.
 * @returns {Promise<string>} Транскрибированный текст.
 */
async function callWorkersAISpeechToText(audioBuffer, envData) {
    const { AI } = envData;
    // Используем стандартную модель Whisper, которая отлично работает для русского языка.
    const WHISPER_MODEL = "@cf/openai/whisper"; 

    if (!AI) {
        throw new Error("Workers AI binding 'AI' не настроен.");
    }
    
    // Workers AI ожидает массив байтов (Array of numbers)
    const audioData = [...new Uint8Array(audioBuffer)];
    
    try {
        const aiResponse = await AI.run(
            WHISPER_MODEL, 
            {
                audio: audioData 
            }
        );

        if (!aiResponse || !aiResponse.text) {
            throw new Error(`Whisper API не вернул ожидаемый текст. Response: ${JSON.stringify(aiResponse)}`);
        }

        // Возвращаем транскрибированный текст
        return aiResponse.text.trim();
    } catch (e) {
        console.error("Workers AI Whisper call failed:", e);
        // Перебрасываем ошибку с префиксом ASR, который вы используете в logDebug
        throw new Error(`ASR_FAIL: Ошибка Workers AI Whisper: ${e.message}`);
    }
}

// *** 2.9. Workers AI Vision (Uform-Gen2 для генерации промпта из фото) ***
/**
 * Генерирует детальный промпт для Stable Diffusion, используя изображение и текстовую инструкцию, через Workers AI (Uform).
 * @param {ArrayBuffer} imageBuffer - Буфер изображения.
 * @param {string} promptText - Текстовая инструкция для модели (игнорируется в Uform, используется для совместимости).
 * @param {Object} envData - Объект окружения, содержащий привязку AI.
 * @returns {Promise<string>} Сгенерированный текстовый промпт.
 */
async function callWorkersAIVision(imageBuffer, promptText, envData) {
    const { AI } = envData; 
    // Uform-Gen2 - самая быстрая и бесплатная модель для мультимодальных задач.
    const VISION_MODEL = "@cf/unum/uform-gen2-qwen-500m"; 

    if (!AI) {
        throw new Error("Workers AI binding 'AI' не настроен.");
    }
    
    const imageBytes = [...new Uint8Array(imageBuffer)];
    
    // Uform-Gen2 требует простого промпта. Мы используем эффективную инструкцию на английском.
    const simplifiedPrompt = `Describe the attached image in full detail as a high-quality, atmospheric, long prompt (max 200 words) for an image generation AI like Stable Diffusion or Midjourney. Focus on subject, style, lighting, and composition. The response must be ONLY in RUSSIAN, without any added commentary.`;

    try {
        const aiResponse = await AI.run(
            VISION_MODEL, 
            {
                prompt: simplifiedPrompt, 
                image: imageBytes 
            }
        );

        if (!aiResponse || !aiResponse.description) { // <-- Uform возвращает 'description'
            throw new Error(`Vision API не вернул ожидаемый ответ. Response: ${JSON.stringify(aiResponse)}`);
        }

        return aiResponse.description.trim();
    } catch (e) {
        console.error("Workers AI Vision call failed:", e);
        throw new Error(`VISION_FAIL: Ошибка Workers AI Vision: ${e.message}`);
    }
}

// *** 2.10. Workers AI Text (НАДЕЖНЫЙ переводчик RU/EN) - АКТИВИРОВАН ***
/**
 * Надежно переводит текст, используя массив бесплатных моделей в качестве резерва.
 * Определяет, нужно ли переводить EN->RU или RU->EN.
 * @param {string} text - Текст для перевода.
 * @param {Object} envData - Объект окружения, содержащий привязку AI.
 * @returns {Promise<string>} Переведенный текст или оригинал.
 */
async function callWorkersAITranslate(text, envData) { 
    
    // Определяем, нужно ли переводить с RU на EN
    const isRussian = /[а-яА-ЯЁё]/.test(text);

    // Если промпт уже на английском или короткий, не переводим
    if (!isRussian || text.trim().length < 5) {
        return text;
    }
    
    const { AI } = envData;
    
    // Список бесплатных моделей в порядке предпочтения
    const FREE_MODELS = [
        "@cf/meta/llama-2-7b-chat-int8", 
        "@cf/google/gemma-2b-it" 
    ];

    if (!AI) { return text; }

    const targetLanguage = 'professional English, suitable for text-to-image AI';
    const translatePrompt = `Translate the following image generation prompt into ${targetLanguage}. Keep all descriptive and technical terms. Respond ONLY with the translated text, nothing else. Prompt to translate: "${text}"`;
    
    // Итерируемся по бесплатным моделям
    for (const model of FREE_MODELS) {
        try {
            const aiResponse = await AI.run(
                model, 
                { prompt: translatePrompt, max_tokens: 300 }
            );

            if (aiResponse && aiResponse.response && aiResponse.response.trim().length > 10) { 
                return aiResponse.response.trim();
            }
        } catch (e) {
            console.warn(`Модель ${model} не сработала. Ошибка: ${e.message}. Пробуем следующую.`);
        }
    }
    
    // Если все попытки провалились, возвращаем оригинал
    return text;
}

// *** 2.11. Workers AI Image Generation (ЧЕРЕЗ API FETCH) ***
/**
 * Генерирует изображение по заданному промпту, используя внешний HTTP-запрос к API.
 * @param {string} prompt - Промпт для генерации изображения (Ожидается АНГЛИЙСКИЙ).
 * @param {Object} envData - Объект окружения, содержащий CLOUDFLARE_ACCOUNT_ID и CLOUDFLARE_API_TOKEN.
 * @returns {Promise<ArrayBuffer>} Бинарные данные изображения (PNG).
 */
async function callWorkersAIGeneration(prompt, envData) { 
    
    const CLOUDFLARE_ACCOUNT_ID = envData.CLOUDFLARE_ACCOUNT_ID;
    const CLOUDFLARE_API_TOKEN = envData.CLOUDFLARE_API_TOKEN;

    // Используем модель, которую вы указали
    // const GENERATION_MODEL = "@cf/bytedance/stable-diffusion-xl-lightning";
    // const GENERATION_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";    
    const GENERATION_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
    const URL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${GENERATION_MODEL}`;

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
         throw new Error("КРИТИЧЕСКАЯ ОШИБКА: Не настроены CLOUDFLARE_ACCOUNT_ID или CLOUDFLARE_API_TOKEN.");
    }

    const finalPrompt = `${prompt}, photorealistic, cinematic light, detailed background`;
    
    // Параметры для модели Lightning
    const inputs = {
        prompt: finalPrompt,
        num_steps: 10, 
        negative_prompt: "blurry, low quality, worst quality, deformed, mutated, cropped, text, signature, low detail",
        width: 1024, 
        height: 1024,
    };
    
    // !!! ЛОГИРОВАНИЕ ЗАПРОСА !!!
    const debugInputs = JSON.stringify({ model: GENERATION_MODEL, inputs: inputs });
    if (envData.BOT_LOGS_STORAGE && envData.ctx) { 
        envData.ctx.waitUntil(logDebug('IMG_GEN_REQUEST_FETCH', debugInputs, envData));
    }

    let apiResponse;
    try {
        // 3. Вызываем API через fetch
        const fetchResponse = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}` // Используем токен
            },
            body: JSON.stringify(inputs)
        });

        if (!fetchResponse.ok) {
            const errorBody = await fetchResponse.json();
             if (envData.BOT_LOGS_STORAGE && envData.ctx) { 
                envData.ctx.waitUntil(logDebug('IMG_GEN_FETCH_ERROR', JSON.stringify(errorBody), envData));
            }
            throw new Error(`Cloudflare API Error: ${fetchResponse.status} - ${errorBody.errors?.[0]?.message || fetchResponse.statusText}`);
        }

        // Ответ в виде ArrayBuffer (как и AI.run())
        apiResponse = await fetchResponse.arrayBuffer(); 

    } catch (e) {
        if (envData.BOT_LOGS_STORAGE && envData.ctx) { 
            envData.ctx.waitUntil(logDebug('IMG_GEN_FETCH_CRIT_ERROR', e.message, envData));
        }
        throw new Error(`Ошибка при вызове Cloudflare API (${GENERATION_MODEL}): ${e.message}`);
    }

    const byteLength = apiResponse?.byteLength || 0;

    // !!! ЛОГИРОВАНИЕ ОТВЕТА !!!
    if (envData.BOT_LOGS_STORAGE && envData.ctx) {
        envData.ctx.waitUntil(logDebug('IMG_GEN_RAW_RESPONSE_FETCH', `Type: ${typeof apiResponse}, Length: ${byteLength}`, envData));
    }

    if (!apiResponse || byteLength < 1024) { 
        if (envData.BOT_LOGS_STORAGE && envData.ctx) {
            envData.ctx.waitUntil(logDebug('IMG_GEN_EMPTY_RESPONSE_FETCH', `Response was too small or null. Length: ${byteLength}.`, envData));
        }
        throw new Error(`API Cloudflare вернул пустые данные (Размер: ${byteLength}). Проверьте токен/ID аккаунта.`);
    }
    
    return apiResponse; // ArrayBuffer
}

// *** 2.12. callWorkersAIImg2Img - Генерация изображения img2img через ВНЕШНИЙ API Cloudflare (ФИНАЛЬНЫЙ ФИКС + ДЕБАГ) ***
/**
 * Вызывает внешний Workers AI API для Img2Img через JSON, ожидая ArrayBuffer в ответе.
 * @param {string} prompt - Промпт для генерации.
 * @param {string} imageBase64 - Исходное изображение в Base64.
 * @param {Object} envData - Объект окружения с токенами и ID.
 * @returns {Promise<ArrayBuffer>} Бинарные данные сгенерированного изображения.
 */
async function callWorkersAIImg2Img(prompt, imageBase64, envData) {
    const { 
        CLOUDFLARE_ACCOUNT_ID, 
        CLOUDFLARE_API_TOKEN,
        ADMIN_CHAT_ID, // Используем для дебага
        TELEGRAM_BOT_TOKEN: token
    } = envData;

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        throw new Error("Не настроены CLOUDFLARE_ACCOUNT_ID или CLOUDFLARE_API_TOKEN для Img2Img.");
    }

    // 1. Очистка Base64: удаляем префикс, если он есть
    const cleanImageBase64 = imageBase64.startsWith('data:') ? 
                             imageBase64.split(',')[1] : 
                             imageBase64;
                             
    if (!cleanImageBase64 || cleanImageBase64.length < 100) {
        await sendMessage(ADMIN_CHAT_ID, `? [DEBUG] Img2Img: Ошибка Base64. Длина: ${cleanImageBase64?.length || 0}`, token);
        throw new Error("Невалидные данные Base64 после очистки.");
    }

    const model = "@cf/runwayml/stable-diffusion-v1-5-img2img";
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;
    
    // 2. Формирование ТЕЛА ЗАПРОСА (JSON)
    const inputs = {
        prompt: prompt,
        image_b64: cleanImageBase64, 
        num_steps: 20, 
        strength: 0.02, // Сила творчества
        guidance: 9.5, // Точность промпта
        negative_prompt: "Text describing elements to avoid in the generated image, bad art, ugly, deformed, blurry, low quality, unnatural colors, text, watermark",
        width: 768, // <-- ВОЗВРАЩАЕМ СТАНДАРТНОЕ РАЗРЕШЕНИЕ: Убираем "додумывание" пикселей
        height: 1024,
    };
    
    // --- ДЕБАГ #1: ЛОГИРОВАНИЕ ОТПРАВЛЯЕМОГО ЗАПРОСА (БЕЗ Base64!) ---
    if (DEBUG_ENABLED) { // <-- Используем глобальную константу
    const debugInputs = { ...inputs, image_b64: `[Base64 длиной ${cleanImageBase64.length}]` };
    await sendMessage(ADMIN_CHAT_ID, `?? **[DEBUG] Img2Img: Отправка запроса**\n\`\`\`json\n${JSON.stringify(debugInputs, null, 2)}\n\`\`\`\nURL: ${url}`, token);
    }

    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(inputs),
            signal: AbortSignal.timeout(60000)
        });
    } catch (e) {
        if (DEBUG_ENABLED) {
        await sendMessage(ADMIN_CHAT_ID, `? **[DEBUG] Img2Img: Ошибка Fetch**\n${e.message}`, token);
        throw new Error(`Ошибка сети/таймаута при вызове Workers AI: ${e.message}`);
        }
    }

    // 3. Обработка ОТВЕТА
    if (response.ok) {
        const contentType = response.headers.get('Content-Type');
        const contentLength = response.headers.get('Content-Length');

        // --- ДЕБАГ #2: ЛОГИРОВАНИЕ УСПЕШНОГО ОТВЕТА ---
        if (DEBUG_ENABLED) {
        await sendMessage(ADMIN_CHAT_ID, `? **[DEBUG] Img2Img: Успешный ответ**\nStatus: ${response.status}\nContent-Type: ${contentType}\nContent-Length: ${contentLength || 'N/A'}`, token);
        }

        if (contentType && contentType.includes('image/png')) {
            // Возвращаем ArrayBuffer для отправки в Telegram
            return response.arrayBuffer(); 
        } else {
            // Ответ 200 OK, но не изображение (например, ошибка лимитов или блокировка, возвращенная в JSON)
            const errorText = await response.text();
            let errorData = {};
            try { errorData = JSON.parse(errorText); } catch(e) { /* не JSON */ }
            
            const errorMessage = errorData.errors?.[0]?.message || errorText.substring(0, 500) || 'Неизвестная ошибка 200 OK, не изображение.';
            
            await sendMessage(ADMIN_CHAT_ID, `?? **[DEBUG] Img2Img: Не изображение**\nStatus 200, но Content-Type не PNG.\nОтвет: \`\`\`${errorMessage}\`\`\``, token);
            
            throw new Error(`Workers AI Img2Img: Непредвиденный ответ. ${errorMessage}`);
        }
    } else {
        // --- ДЕБАГ #3: ЛОГИРОВАНИЕ HTTP-ОШИБКИ (4xx, 5xx) ---
        if (DEBUG_ENABLED) {
        const errorText = await response.text();
        let errorBody = {};
        try { errorBody = JSON.parse(errorText); } catch(e) { /* не JSON */ }
        
        const errorMessage = errorBody.errors?.[0]?.message || errorText.substring(0, 500) || `HTTP Error ${response.status}`;
        
        await sendMessage(ADMIN_CHAT_ID, `? **[DEBUG] Img2Img: HTTP Ошибка**\nStatus: ${response.status}\nСообщение: \`\`\`${errorMessage}\`\`\``, token);
        
        throw new Error(`Workers AI External API Error: ${response.status} - ${errorMessage}`);
        }
    }
}

// Worker.js -> Добавьте эту функцию в раздел API вызовов

// *** 2.13. callDalleImg2Img (Через BotHub API) ***
/**
 * Вызывает BotHub DALL-E API для Image-to-Image (реставрации).
 * @param {string} prompt - Переведенный на английский промпт.
 * @param {string} imageBase64 - Исходное изображение в Base64.
 * @param {Object} envData - Данные окружения (должен быть BOTHUB_API_KEY).
 * @returns {Promise<ArrayBuffer>} Сгенерированное изображение в виде ArrayBuffer.
 */
async function callDalleImg2Img(prompt, imageBase64, envData) {
    // !!! ПРЕДПОЛАГАЕМ, что BOTHUB_API_KEY доступен в envData !!!
    const { BOTHUB_API_KEY } = envData; 
    
    if (!BOTHUB_API_KEY) {
         throw new Error("BotHub API key is missing in environment."); 
    }

    // Упрощенный промпт для DALL-E (поскольку он используется для вариаций/легкого редактирования)
    const simplePrompt = `Restore and enhance this photo. Convert it to color. Maintain all original facial features and composition.`;

    const headers = {
        'Authorization': `Bearer ${BOTHUB_API_KEY}`, 
    };

    // !!! ИСПОЛЬЗУЕМ ЭНДПОИНТ ДЛЯ ВАРИАЦИЙ (VARIATIONS) !!!
    // !!! ИСПОЛЬЗУЕМ ЭНДПОИНТ GENERATIONS (Единственный, который работает) !!!
    const BOTHUB_URL = "https://bothub.chat/api/v2/openai/v1/images/generations";

    // Тело запроса для вариаций принимает ТОЛЬКО изображение, n, и size
    // Промпт часто игнорируется или используется очень слабо.
    const body = new FormData();
    // DALL-E Variations ожидает файл (Blob/Buffer), а не JSON с base64. 
    // Поскольку мы в Workers, передать его напрямую сложно.
    
    // ВАРИАНТ: Если BotHub поддерживает Body в формате JSON, пробуем его (как в предыдущих шагах):
    // NOTE: Обычный OpenAI API требует multipart/form-data для 'variations', но попробуем JSON,
    // если BotHub это позволяет для упрощения Worker'а.

    const jsonBody = JSON.stringify({
        model: 'dall-e-3', 
        // ВАЖНО: Вариации не всегда принимают prompt! Но мы его включим.
        prompt: simplePrompt, 
        image: `data:image/jpeg;base64,${imageBase64}`, 
        n: 1,
        size: "1024x1024",
        response_format: "b64_json" 
    });

    const response = await fetch(BOTHUB_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${BOTHUB_API_KEY}`, 
        },
        body: jsonBody,
    });

    if (!response.ok) {
        const errorText = await response.text();
        // ВНИМАНИЕ: Здесь нужно убедиться, что вы правильно обрабатываете ответ BotHub
        throw new Error(`BotHub API Error: ${response.status} - ${errorText}`);
    }

    // Предполагаем, что BotHub возвращает изображение как ArrayBuffer
    const imageBuffer = await response.arrayBuffer();
    
    return imageBuffer;
}

// --- СПИСКИ КОМАНД ДЛЯ setMyCommands ---

const PUBLIC_COMMANDS = [
    {"command": "start", "description": "Запустить бота и получить приветствие"},
    {"command": "stop", "description": "Остановить бота"},
    {"command": "prompt", "description": "Редактировать промпт"},
    {"command": "create", "description": "Создать картинку по промпту"},
    {"command": "photo", "description": "Улучшить исходную фотографию"}
];

const ADMIN_COMMANDS = [
    {"command": "start", "description": "Запустить бота и получить приветствие"},
    {"command": "stop", "description": "Остановить бота"},
    {"command": "prompt", "description": "Редактировать промпт"},
    {"command": "create", "description": "Создать картинку по промпту"},
    {"command": "photo", "description": "Улучшить исходную фотографию"},
    {"command": "video", "description": "Создать видеоролик"},
    {"command": "admin", "description": "Панель администратора"},
    // {"command": "update_cmds", "description": "Обновить меню команд (API)"}
];

// ----------------------------------------------------
// III. АСИНХРОННЫЕ ОБРАБОТЧИКИ КОМАНД
// ----------------------------------------------------

// ? processAdminStartCommand (Финальный вид: Используем кнопки для меню)
async function processAdminStartCommand(adminChatId, env) {
    const { TELEGRAM_BOT_TOKEN, ADMIN_CHAT_ID } = env;

    if (adminChatId.toString() !== ADMIN_CHAT_ID) {
        await sendMessage(adminChatId, "? Вы не администратор этого бота.", TELEGRAM_BOT_TOKEN);
        return;
    }
    
    // АДМИН-ПАНЕЛЬ с инлайн-кнопками
    const message = `
    ? **АДМИН-ПАНЕЛЬ**
    
    Используйте кнопки ниже для управления ботом.
    `;
    // Создаем массив кнопок для инлайн-клавиатуры
    const keyboard = [
        [{ text: "?? Пополнить баланс пользователя", callback_data: "admin_activate" }],
        [{ text: "?? Показать логи и ошибки", callback_data: "admin_debug" }],
        [{ text: '?? Обновить меню команд', callback_data: 'admin_update_cmds' } ],
        [{ text: "?? Выход из режима администратора", callback_data: "admin_exit" }],
    ];
    
    await sendMessageWithKeyboard(adminChatId, message, TELEGRAM_BOT_TOKEN, keyboard);
}

// ? processAdminStateMessage (Обработка ID и Суммы в интерактивном режиме)
async function processAdminStateMessage(adminChatId, messageText, env) {
    // Новые, уникальные константы для админ-стейта
    const { TELEGRAM_BOT_TOKEN, LAST_PHOTO_STORAGE } = env;
    
    // Новые, уникальные константы для админ-стейта
    const ADMIN_STATE_KEY = adminChatId.toString() + '_admin_state';
    const ADMIN_TARGET_ID_KEY = adminChatId.toString() + '_admin_target_id';
    
    const STATE_AWAITING_ID = 'admin_awaiting_id';     // <-- Используем эти константы
    const STATE_AWAITING_AMOUNT = 'admin_awaiting_amount'; // <-- Используем эти константы

    const adminState = await LAST_PHOTO_STORAGE.get(ADMIN_STATE_KEY);
    
    if (!adminState) return false; 

    const PRICE_PER_PHOTO = 10; // Цена в рублях

    // --- 1. ОЖИДАЕМ ID ПОЛЬЗОВАТЕЛЯ ---
    if (adminState === STATE_AWAITING_ID) { // ИЗМЕНЕНО
        const targetChatId = messageText.trim();
        if (!/^\d+$/.test(targetChatId)) {
            await sendMessage(adminChatId, "? Неверный формат ID. Пожалуйста, отправьте ТОЛЬКО цифры (Telegram ID пользователя).", TELEGRAM_BOT_TOKEN);
            return true;
        }

        // Сохраняем ID пользователя и переводим в следующий режим
        await LAST_PHOTO_STORAGE.put(ADMIN_TARGET_ID_KEY, targetChatId, { expirationTtl: 600 });
        await LAST_PHOTO_STORAGE.put(ADMIN_STATE_KEY, STATE_AWAITING_AMOUNT, { expirationTtl: 600 }); // ИЗМЕНЕНО

        await sendMessage(adminChatId, `
        ? **ВЫ В РЕЖИМЕ АКТИВАЦИИ БАЛАНСА**
        
    ID пользователя (${targetChatId}) сохранен.
        
Теперь отправьте мне **СУММУ В РУБЛЯХ**, которую оплатил пользователь и я сам скалькулирую количество запросов.
Напоминаю: Цена за 1 фото = ${PRICE_PER_PHOTO} руб.
        `, TELEGRAM_BOT_TOKEN);
        return true; 
        
    // --- 2. ОЖИДАЕМ СУММУ ОПЛАТЫ ---
    } else if (adminState === STATE_AWAITING_AMOUNT) { // ИЗМЕНЕНО
        const amountRub = parseInt(messageText.trim());
        const targetChatId = await LAST_PHOTO_STORAGE.get(ADMIN_TARGET_ID_KEY);

        if (isNaN(amountRub) || amountRub < PRICE_PER_PHOTO || !targetChatId) {
            await sendMessage(adminChatId, `? Неверная сумма. Пожалуйста, отправьте ТОЛЬКО число, которое больше или равно ${PRICE_PER_PHOTO} (цена за 1 фото).`, TELEGRAM_BOT_TOKEN);
            return true;
        }
        
        // --- РАСЧЕТ КРЕДИТА ---
        const creditsToAdd = Math.floor(amountRub / PRICE_PER_PHOTO);
        
        // --- ГЕНЕРАЦИЯ ТОКЕНА (УПРОЩЕННАЯ: 10 случайных символов) ---
        const uniqueToken = Array.from(crypto.getRandomValues(new Uint8Array(10)))
            .map(b => b.toString(36)).join('').substring(0, 10);
        
        // Сохраняем сумму кредитов в KV под ключом токена (для активации)
        const TOKEN_CREDIT_KEY = 'token_' + uniqueToken;
        await LAST_PHOTO_STORAGE.put(TOKEN_CREDIT_KEY, creditsToAdd.toString(), { expirationTtl: 3600 * 24 * 7 }); // Токен действует неделю
        
        // Очищаем состояние админа
        await LAST_PHOTO_STORAGE.delete(ADMIN_STATE_KEY);
        await LAST_PHOTO_STORAGE.delete(ADMIN_TARGET_ID_KEY);

        const activationCommand = `/activate_${uniqueToken}`;
        
        const adminMessage = `
    ? **ТРАНЗАКЦИЯ СОЗДАНА**
        
    Пользователь ID: <code>${targetChatId}</code>
    Оплачено: **${amountRub} руб.**
    Начислено: **${creditsToAdd} фото**
        
Передайте пользователю эту **уникальную команду** для активации начисления: <code>${activationCommand}</code>
    `;
        await sendMessage(adminChatId, adminMessage, TELEGRAM_BOT_TOKEN);
        
        // Уведомление пользователю
        await sendMessage(targetChatId, "?? Администратор проверил оплату. Скоро Вам будет выдана уникальная команда для активации начисления!", TELEGRAM_BOT_TOKEN);

        return true;
    }
    
    return false; // Не в режиме админа
}


// ? processAdminAwaitingId (Только для администратора: ИНИЦИАЛИЗИРУЕТ режим ввода ID)
async function processAdminAwaitingId(adminChatId, env) {
    const { TELEGRAM_BOT_TOKEN, LAST_PHOTO_STORAGE, ADMIN_CHAT_ID } = env;

    // ПРОВЕРКА: Только администратор может использовать эту команду
    if (adminChatId.toString() !== ADMIN_CHAT_ID) {
        await sendMessage(adminChatId, "? Вы не администратор этого бота.", TELEGRAM_BOT_TOKEN);
        return;
    }

    const ADMIN_STATE_KEY = adminChatId.toString() + '_admin_state';
    
    // Устанавливаем режим ожидания
    await LAST_PHOTO_STORAGE.put(ADMIN_STATE_KEY, 'awaiting_id', { expirationTtl: 600 }); // Ждем 10 минут
}

// ? processStartCommand (Начало работы)
async function processStartCommand(chatId, TELEGRAM_BOT_TOKEN) {
    const keyboard = {
        inline_keyboard: [
            // Основные команды
            [{ text: "? Улучшить/Стилизовать фото (/photo)", callback_data: 'cmd:/photo' }],
            [{ text: "?? Создать картинку по промпту (/create)", callback_data: 'cmd:/create_empty' }],
            // Вспомогательные
            [{ text: "?? Меню работы с промптом (/prompt)", callback_data: 'cmd:/prompt' }], // <-- ИЗМЕНЕНО
            [{ text: "??? Очистить данные (/stop)", callback_data: 'cmd:/stop' }],
            // Сюда можно добавить: [{ text: "?? Создать видео (/video)", callback_data: 'cmd:/video_empty' }]
        ]
    };
    const message = `
        ?? **Добро пожаловать в Gemini AI от Leshiy!**

        Вот что я могу:
        Отправьте фото - я сгенерирую **промпт**.
        **Просто начните писать** - я стану вашим собеседником.
        **Отправьте голосовое** - я его расшифрую и отвечу.
        /prompt для создания или перегенерации **промпта**.
        /photo для **улучшения фото** (особенно черно-белых)
        /create для **создания картинки** по промпту
        /stop для **очистки** сохраненных данных.

        Выберите действие ниже или отправьте мне фотографию.
    `;

    await sendMessage(chatId, message, TELEGRAM_BOT_TOKEN, null, keyboard);
}

// ? processDebugCommand (Только для администратора: Выводит лог)
async function processDebugCommand(chatId, env) {
    const { TELEGRAM_BOT_TOKEN, ADMIN_CHAT_ID, BOT_LOGS_STORAGE } = env;

    if (chatId.toString() !== ADMIN_CHAT_ID) {
        await sendMessage(chatId, "? Вы не администратор этого бота.", TELEGRAM_BOT_TOKEN);
        return;
    }

    if (!BOT_LOGS_STORAGE) {
        await sendMessage(chatId, "? KV-хранилище для логов не настроено.", TELEGRAM_BOT_TOKEN);
        return;
    }
    
    await sendMessage(chatId, "? Запрашиваю последние записи логов...", TELEGRAM_BOT_TOKEN);

    try {
        let logs = await BOT_LOGS_STORAGE.get('master_log_list', { type: 'json' });
        logs = Array.isArray(logs) ? logs : [];
        
        let message = `
        **Последние ${logs.length} записей лога:**
        <pre>${logs.join('\n')}</pre>
        `;
        
        // Telegram имеет лимит в 4096 символов, поэтому может потребоваться обрезка
        if (message.length > 4096) {
            message = message.substring(0, 4000) + "\n... (слишком длинно, обрезано)";
        }
        
        await sendMessage(chatId, message, TELEGRAM_BOT_TOKEN);

    } catch (e) {
        await sendMessage(chatId, `? Ошибка при чтении логов: ${e.message}`, TELEGRAM_BOT_TOKEN);
    }
}

// ? processStopCommand (Очистка KV) - ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ
async function processStopCommand(chatId, LAST_PHOTO_STORAGE, VEO_POLL_STORAGE, TELEGRAM_BOT_TOKEN, envData) {
    const chatKey = chatId.toString();

    // --- Ключи, которые НЕЛЬЗЯ УДАЛЯТЬ ---
    const BALANCE_KEY = chatKey + '_photo_balance'; 
    
    // ? ИСПРАВЛЕНИЕ: Унифицируем ключ для удаления, используя суффикс из envData.
    const PROMPT_KEY_SUFFIX = envData.LAST_PROMPT_KEY_SUFFIX || '_last_prompt';
    const LAST_PROMPT_KEY_UNIFIED = chatKey + PROMPT_KEY_SUFFIX;

    // --- Список ключей для очистки ---
    const keysToDelete = [
        LAST_PROMPT_KEY_UNIFIED, // <-- УНИФИЦИРОВАННЫЙ
        chatKey + '_prompt',            
        chatKey + '_base64_image',      
        chatKey + '_user_state',        
        chatKey + '_last_action',       
        chatKey + '_last_prompt_message_id', 
        chatKey + '_last_prompt',       
        chatKey + '_last_image_data',  
    ];
    
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Удаляем ключ, если суффикс был undefined (ключ '235663624undefined').
    if (!envData.LAST_PROMPT_KEY_SUFFIX) {
        keysToDelete.push(chatKey + 'undefined'); 
    }
    
    try {
        // 1. Удаляем все сессионные данные
        for (const key of keysToDelete) {
            await LAST_PHOTO_STORAGE.delete(key);
        }

        // 2. Очистка VEO (если используется)
        if (VEO_POLL_STORAGE) {
             await VEO_POLL_STORAGE.delete(chatKey); 
        }
        
        // 3. Формирование сообщения и клавиатуры
        const message = "?? **Сброс контекста завершен!**\n" + 
                        "Все сохраненные данные удалены. Готов к новым задачам! Выберите действие ниже.";
                        
        // getPromptKeyboard(null) генерирует клавиатуру "Создать новый промпт"
        const keyboard = getPromptKeyboard(null);
        
        // 4. Отправка подтверждения с клавиатурой
        await sendMessage(chatId, message, TELEGRAM_BOT_TOKEN, null, keyboard); 
        
    } catch (e) {
        await sendMessage(chatId, `? Ошибка при очистке хранилища: <code>${e.message}</code>`, TELEGRAM_BOT_TOKEN);
    }
}

// ? processTextMessage (Текстовый чат с историей + Логика редактирования/создания промпта) - ИСПРАВЛЕНО
async function processTextMessage(chatId, messageText, envData) {
    const { TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, CHAT_HISTORY_STORAGE, LAST_PHOTO_STORAGE } = envData; 
    const chatKey = chatId.toString();
    
    // --- Константы (используем те же, что и в вашем коде) ---
    const USER_STATE_KEY = chatKey + '_user_state';
    const STATE_AWAITING_PROMPT_EDIT = 'awaiting_prompt_edit';
    const STATE_AWAITING_NEW_PROMPT = 'awaiting_new_prompt'; 
    // ВНИМАНИЕ: Используется суффикс '_prompt' (убедитесь, что в /create и /stop используется он же!)
    const LAST_PROMPT_KEY = chatKey + envData.LAST_PROMPT_KEY_SUFFIX;
    

    // 1. ПЕРЕХВАТ: Режим редактирования ИЛИ создания промпта
    const userState = await LAST_PHOTO_STORAGE.get(USER_STATE_KEY);

    if (userState === STATE_AWAITING_PROMPT_EDIT || userState === STATE_AWAITING_NEW_PROMPT) {
        
        // 1.1. Сбрасываем состояние
        await LAST_PHOTO_STORAGE.delete(USER_STATE_KEY); 
        
        // 1.2. Сохраняем новый промпт (КРИТИЧНО: AWAIT ГАРАНТИРУЕТ ЗАПИСЬ ДО СЛЕДУЮЩЕЙ КОМАНДЫ)
        const newPrompt = messageText.trim();
        await LAST_PHOTO_STORAGE.put(LAST_PROMPT_KEY, newPrompt, { expirationTtl: 3600 });
        
        // 1.3. Сообщение о сохранении
        const actionText = (userState === STATE_AWAITING_PROMPT_EDIT) ? "отредактирован" : "сохранен";
        
        await sendMessage(chatId, 
            `? **Промпт ${actionText}!**\n\n` +
            `Нажмите кнопку **"?? Создать картинку"** или используйте команду \`/create\` для генерации.`,
            TELEGRAM_BOT_TOKEN
        );
        
        return true; // <-- ИСПРАВЛЕНО: Возвращаем true, блокируем дальнейшую обработку
    }
    
    // 2. ОБЫЧНЫЙ ЧАТ
    let history;
    try {
        const historyData = await CHAT_HISTORY_STORAGE.get(chatKey, { type: 'json' });
        if (Array.isArray(historyData)) {
            history = historyData;
        } else {
            history = []; 
        }
    } catch (e) {
        console.error("Error retrieving chat history:", e);
        history = []; 
    } 
    
    // --- !!! ЭТОТ БЛОК ПЕРЕНЕСТИ В processTextMessage, ЕСЛИ ВЫЗЫВАЕТСЯ ЧЕРЕЗ ctx.waitUntil !!! ---
    const workingMessageResponse = await sendMessage(chatId, "? *Думаю...*", TELEGRAM_BOT_TOKEN);
    const workingMessageId = workingMessageResponse.result.message_id;
    
    try {
        // ... (логика чата) ...
        const modelResponse = await callWorkersAIChat(history, messageText, envData); 
        
        // 1. Отправляем ответ
        await sendMessage(chatId, modelResponse, TELEGRAM_BOT_TOKEN);
        
        // 2. Обновляем историю и сохраняем
        const MAX_HISTORY_LENGTH = 40; 
        
        history.push({ role: 'user', text: messageText });
        history.push({ role: 'model', text: modelResponse });

        if (history.length > MAX_HISTORY_LENGTH) {
            history = history.slice(history.length - MAX_HISTORY_LENGTH);
        }
        
        await CHAT_HISTORY_STORAGE.put(chatKey, JSON.stringify(history), { expirationTtl: 3600 * 24 });

        await editMessage(chatId, workingMessageId, "? Готово!", TELEGRAM_BOT_TOKEN);

    } catch (e) {
        console.error("Critical error in chat processing:", e.message);
        await editMessage(chatId, workingMessageId, `? **Ошибка чата:** <code>${e.message}</code>`, TELEGRAM_BOT_TOKEN);
    }
    
    return false; // <-- ИСПРАВЛЕНО: Возвращаем false для обычной чат-логики
}

// ? processPromptCommand (Обрабатывает /prompt) - ФИНАЛЬНО ИСПРАВЛЕНО
async function processPromptCommand(chatId, TELEGRAM_BOT_TOKEN, LAST_PHOTO_STORAGE, envData) {
    const chatKey = chatId.toString();
    
    // УНИФИКАЦИЯ КЛЮЧА: Используем суффикс из envData.
    // Если envData еще не исправлен (п. 1), используем резервное значение, чтобы избежать '...undefined'
    const PROMPT_KEY_SUFFIX = envData.LAST_PROMPT_KEY_SUFFIX || '_last_prompt';
    const LAST_PROMPT_KEY = chatKey + PROMPT_KEY_SUFFIX;

    // Читаем промпт ОДИН РАЗ
    const currentPrompt = await LAST_PHOTO_STORAGE.get(LAST_PROMPT_KEY);
    
    // --- Удалена вся дублирующая логика, заменена единым блоком ---
    
    let messageText;
    // Используем getPromptKeyboard для получения объекта { inline_keyboard: [...] }
    const keyboardObject = getPromptKeyboard(currentPrompt); 
    
    if (currentPrompt) {
        messageText = `
        ? **Ваш текущий промпт:**
        
        <code>${currentPrompt}</code>
        
        Что вы хотите сделать с этим промптом?
        `;
    } else {
        messageText = `
        ?? **Промпт для работы не найден.**
        
        Сначала нужно получить промпт. Вы можете:
    1. Нажать **'Создать новый промпт'** и ввести текст.
    2. Отправить фото, чтобы сгенерировать описание автоматически.
        Выберите действие ниже:
        `;
    }

    // Отправляем ОДНО сообщение
    // sendMessage принимает объект reply_markup в последнем аргументе.
    await sendMessage(chatId, messageText, TELEGRAM_BOT_TOKEN, null, keyboardObject); 
}

// ? processRetryLogic (Логика повторного анализа промпта, для кнопки Regenerate)
async function processRetryLogic(chatId, TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, LAST_PHOTO_STORAGE) {
    const chatKey = chatId.toString();
    const imageBase64Key = chatKey + '_base64_image';
    
    const originalImageBase64 = await LAST_PHOTO_STORAGE.get(imageBase64Key);

    if (!originalImageBase64) {
        await sendMessage(chatId, "?? **Внимание:** Нет исходного изображения для повторного анализа. Сначала отправьте фотографию.", TELEGRAM_BOT_TOKEN);
        return;
    }
    
    // Мы не можем легко повторно использовать processImageAsync, так как у нас нет fileId Telegram.
    // Запускаем только часть логики анализа (Vision)
    const workingMessageResponse = await sendMessage(chatId, "?? **Повторно анализирую фото и создаю промпт...**", TELEGRAM_BOT_TOKEN);
    if (!workingMessageResponse.ok || !workingMessageResponse.result || !workingMessageResponse.result.message_id) return;
    const workingMessageId = workingMessageResponse.result.message_id;

    try {
        await editMessage(chatId, workingMessageId, "? ** Анализирую фото и генерирую новый промпт...", TELEGRAM_BOT_TOKEN);
        
        // Генерируем новый промпт (используя Base64, сохраненный при первом анализе)
        const finalPrompt = await callGeminiVision(originalImageBase64, GEMINI_API_KEY);
        
        const promptKey = chatKey + '_prompt';
        await LAST_PHOTO_STORAGE.put(promptKey, finalPrompt, { expirationTtl: 3600 });

        // Отправляем результат с новой клавиатурой
        const messageText = `? **Промпт перегенерирован!**\n\n*Новый промпт:*\n<code>${finalPrompt}</code>\n\nВыберите следующее действие:`;
        await sendMessage(chatId, messageText, TELEGRAM_BOT_TOKEN, null, getPromptKeyboard()); 
        
        await editMessage(chatId, workingMessageId, "? Готово! Новый промпт отправлен.", TELEGRAM_BOT_TOKEN);
        
    } catch (e) {
        console.error("Критическая ошибка при повторном анализе:", e.message);
        await editMessage(chatId, workingMessageId, `? Критическая ошибка при повторном анализе: ${e.message}.`, TELEGRAM_BOT_TOKEN);
    }
}

// *** 3.4. Обработка команды /create (Генерация изображения) - С СОХРАНЕНИЕМ ПРОМПТА ***
// Аргументы: chatId, inputPrompt, token, geminiKey, storage, envData
async function processCreateCommand(chatId, inputPrompt, token, geminiKey, storage, envData) { 
    let loadingMessageId;
    const chatKey = chatId.toString();
    const LAST_PROMPT_KEY = chatKey + envData.LAST_PROMPT_KEY_SUFFIX;
    let russianPrompt = ''; // Исходный промпт (на русском)
    let englishPrompt = ''; // Переведенный промпт (на английском)
    
    try {
        // 1. Определение промпта (приоритет - текст в команде)
        if (inputPrompt && inputPrompt.trim().length > 0) {
            russianPrompt = inputPrompt.trim();
        } else {
            // Если промпт не передан, берем последний из KV
            const storedPrompt = await storage.get(LAST_PROMPT_KEY);
            if (storedPrompt) {
                russianPrompt = storedPrompt;
            } else {
                await sendMessage(chatId, "?? **Не могу сгенерировать изображение.**\n\nНе найден промпт. Используйте `/create [текст промпта]` или сначала отправьте фото для его анализа (/photo).", token);
                return;
            }
        }
        
        if (russianPrompt.trim().length === 0) {
            await sendMessage(chatId, "?? **Промпт пустой.** Пожалуйста, предоставьте текст для генерации.", token);
            return;
        }

        // 1.5. СОХРАНЕНИЕ: Сохраняем последний использованный промпт в KV
        // Синхронная запись в хранилище (гарантирует сохранение)
        await storage.put(LAST_PROMPT_KEY, russianPrompt);

        // 2. Отправляем сообщение "Перевожу..."
        const loadingMessage = await sendMessage(chatId, `?? **Перевожу промпт и запускаю генерацию...**`, token);
        if (!loadingMessage.ok || !loadingMessage.result) return;
        loadingMessageId = loadingMessage.result.message_id;

        // 3. ПЕРЕВОД: Получаем английскую версию промпта для генератора
        englishPrompt = await callWorkersAITranslate(russianPrompt, envData);
        
        // 4. Вызов Workers AI для генерации изображения (ВОЗВРАЩАЕТ ArrayBuffer)
        const imageArrayBuffer = await callWorkersAIGeneration(englishPrompt, envData);
        
        // 5. Отправка изображения в Telegram
        const success = await sendPhotoWithCaption(
            chatId, 
            imageArrayBuffer, 
            `? **Изображение сгенерировано!**\nПромпт:\n\`${russianPrompt}\``, 
            token,
            envData
        );
        if (!success.ok) {
            throw new Error(success.description || "Неизвестная ошибка отправки фото.");
        }

    } catch (error) {
        const errorText = error.message || "Неизвестная ошибка генерации изображения.";
        
        // Сообщение об ошибке, если генерация упала
        await editMessage(chatId, loadingMessageId, `? **Ошибка!** Не удалось сгенерировать изображение: ${errorText}`, token);
    }
}

// *** 3.6. Обработка повторной генерации промпта (по Base64 из KV) ***
async function processPromptRegeneration(chatId, imageBase64, token, storage, envData) {
    let loadingMessageId;
    const chatKey = chatId.toString();
    // --- ИСПРАВЛЕНО ЗДЕСЬ ---
    const LAST_PROMPT_KEY = chatKey + envData.LAST_PROMPT_KEY_SUFFIX;
    const LAST_PROMPT_MESSAGE_ID_KEY = chatKey + envData.LAST_PROMPT_MESSAGE_ID_KEY_SUFFIX;
    // -------------------------
    
    try {
        const loadingMessage = await sendMessage(chatId, "? **Повторный анализ фото: Генерирую новый промпт...**", token); //
        if (loadingMessage.ok) { loadingMessageId = loadingMessage.result.message_id; }
        
        // 1. Конвертация Base64 обратно в ArrayBuffer для Workers AI Vision
        const imageArrayBuffer = base64ToUint8Array(imageBase64).buffer; //

        // 2. Вызов Vision AI для генерации промпта (Uform-Gen2)
        const englishPrompt = await callWorkersAIVision(imageArrayBuffer, "", envData); //
        
        // 3. Перевод промпта (на русский для сохранения)
        // ВАЖНО: Ваша функция callWorkersAITranslate переводит RU->EN. Здесь логичнее использовать функцию для перевода EN->RU
        // Если такой функции нет, то сохраняем EN-промпт, как наиболее пригодный для генерации.
        const promptToSave = englishPrompt; 

        // 4. Сохраняем НОВЫЙ промпт в KV
        await storage.put(LAST_PROMPT_KEY, promptToSave, { expirationTtl: 3600 });
        
        // 5. Отправляем меню промпта (Markdown)
        const finalMessage = await sendMessage(
            chatId, 
            `? **Промпт перегенерирован!**\n\n\`${promptToSave}\``, 
            token, 
            null, 
            getPromptKeyboard(promptToSave) //
        );
        
        // 6. Сохраняем ID сообщения с меню
        if (finalMessage.ok) {
            await storage.put(LAST_PROMPT_MESSAGE_ID_KEY, finalMessage.result.message_id.toString(), { expirationTtl: 3600 });
        }
        
    } catch (error) {
        const errorText = error.message || "Неизвестная ошибка";
        const message = `? **Ошибка повторной генерации промпта!**\n\n${errorText}`;
        await sendMessage(chatId, message, token); //
    } finally {
        // if (loadingMessageId) {
        //    envData.ctx.waitUntil(deleteMessage(chatId, loadingMessageId, token)); //
        // }
    }
}

// ? sendAdminReport - Отправляет отформатированный отчет об ошибке администратору
async function sendAdminReport(chatId, errorMessage, envData) {
    if (chatId === envData.ADMIN_CHAT_ID) {
        let debugMessage = `**?? АДМИН-ОТЧЕТ ПО ОШИБКЕ /create ??**\n\n`;
        debugMessage += `**Ошибка:** \`${errorMessage}\`\n`; 
        
        try {
            const debugUrlLog = await envData.BOT_LOGS_STORAGE.get('DEBUG_PHOTO_URL');
            debugMessage += `**Последний URL:** \n\`${debugUrlLog || 'Лог URL не найден (проверьте, что обновили sendPhotoFromBase64)'}\`\n`;
        } catch (e) {
            debugMessage += `**Ошибка чтения лога:** \`${e.message}\`\n`;
        }
        
        await sendMessage(chatId, debugMessage, envData.TELEGRAM_BOT_TOKEN);
    }
    
    // Отправляем стандартное сообщение об ошибке пользователю
    const userErrorMessage = `? Критическая ошибка при генерации/отправке изображения: ${errorMessage.substring(0, 100)}`;
    await sendMessage(chatId, userErrorMessage, envData.TELEGRAM_BOT_TOKEN); 
}

// ? processUserActivationCommand (Обработка команды активации от пользователя)
async function processUserActivationCommand(chatId, messageText, env) {
    const { TELEGRAM_BOT_TOKEN, LAST_PHOTO_STORAGE } = env; 
    const chatKey = chatId.toString();
    const BALANCE_KEY = chatKey + '_photo_balance'; 
    const FREE_LIMIT = 10;
    const VIP_THRESHOLD = 100; // Порог для активации VIP-режима (например, покупка 100+ фото)
    const VIP_BALANCE_VALUE = 999999; // Значение для VIP-аккаунта (чтобы всегда было > VIP_THRESHOLD)

    // ... (Извлечение токена, проверка, удаление токена - оставляем без изменений) ...
    const userToken = messageText.replace('/activate_', '').trim();
    const TOKEN_CREDIT_KEY = 'token_' + userToken;
    const creditsToAddRaw = await LAST_PHOTO_STORAGE.get(TOKEN_CREDIT_KEY); 

    if (!creditsToAddRaw) {
        await sendMessage(chatId, "? **Ошибка активации:** Неверная команда или токен. Пожалуйста, обратитесь к администратору.", TELEGRAM_BOT_TOKEN);
        return; 
    }
    
    await LAST_PHOTO_STORAGE.delete(TOKEN_CREDIT_KEY);

    const creditsToAdd = parseInt(creditsToAddRaw, 10); 
    if (isNaN(creditsToAdd) || creditsToAdd <= 0) {
        await sendMessage(chatId, "? **Ошибка активации:** Не удалось определить начисленное количество. Сообщите администратору.", TELEGRAM_BOT_TOKEN);
        return; 
    }

    // 3. ОБНОВЛЕНИЕ БАЛАНСА (ЛОГИКА НАКОПЛЕНИЯ И VIP)
    
    let newBalance;
    let messageStatus;

    if (creditsToAdd >= VIP_THRESHOLD) {
        // --- VIP-АКТИВАЦИЯ ---
        newBalance = VIP_BALANCE_VALUE;
        messageStatus = `**VIP-доступ** активирован! Команда /photo теперь **без ограничений** до ${VIP_THRESHOLD} использований!`;
    } else {
        // --- НАКОПИТЕЛЬНЫЙ БАЛАНС ---
        let currentBalance = parseInt(await LAST_PHOTO_STORAGE.get(BALANCE_KEY)); 
        // Если баланс не существует или был бесплатным, он считается 0, но не ниже 0.
        // FREE_LIMIT не используется здесь как начальное значение, чтобы избежать путаницы.
        if (isNaN(currentBalance) || currentBalance < 0) {
             // Чтобы сохранить остаток, берем текущий бесплатный остаток.
            currentBalance = (currentBalance < 0) ? 0 : currentBalance;
            
            // Если баланс не установлен (новый пользователь), но активирует платно, 
            // начинаем с 0, чтобы избежать начисления 10 бесплатных + платных.
            // Примечание: Если вы хотите, чтобы платный пользователь получил бесплатные 10, 
            // этот код нужно доработать, но пока оставляем чистую сумму.
        }
        
        newBalance = currentBalance + creditsToAdd;
        messageStatus = `Ваш текущий баланс: **${newBalance}** фото.`;
    }

    // Сохраняем НОВЫЙ баланс
    await LAST_PHOTO_STORAGE.put(BALANCE_KEY, newBalance.toString(), { expirationTtl: 3600 * 24 * 365 });

    // 4. ФОРМИРОВАНИЕ ФИНАЛЬНОГО СООБЩЕНИЯ
    await sendMessage(chatId, 
        `? **Доступ активирован!**\n` +
        `Вы получили **${creditsToAdd}** использований команды /photo.\n` +
        `${messageStatus}\n` + 
        `Спасибо за поддержку!`, 
        TELEGRAM_BOT_TOKEN 
    );
}

// ? processPhotoCommand (Image + Text-to-Image)
/**
 * @description Обрабатывает команду улучшения фото (/photo), проверяет баланс, списывает кредит и вызывает генерацию. В случае сбоя возвращает кредит.
 */
// !!! ИСПРАВЛЕНИЕ СИГНАТУРЫ: Переименовываем третий аргумент в AI_BINDING !!!
async function processPhotoCommand(chatId, TELEGRAM_BOT_TOKEN, envData, LAST_PHOTO_STORAGE) {
    
    // !!! ИСПРАВЛЕНИЕ ЛОГИКИ КЛЮЧЕЙ KV !!!
    const chatKey = chatId.toString();
    // ИСПОЛЬЗУЕМ ГЛОБАЛЬНЫЕ СУФФИКСЫ, КОТОРЫЕ ИСПОЛЬЗУЮТСЯ ДЛЯ СОХРАНЕНИЯ:
    const promptKey = chatKey + LAST_PROMPT_KEY_SUFFIX; 
    const originalImageBase64Key = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX; 
    const GENERATION_LOCK_KEY = chatKey + '_generation_in_progress';
    
    // =======================================================
    // КОНСТАНТЫ БАЛАНСА И СЕРВИСА
    // =======================================================
    const BALANCE_KEY = chatKey + '_photo_balance'; 
    const FREE_LIMIT = 10;
    const VIP_THRESHOLD = 100;
    const PRICE_PER_PHOTO = 10; 
    const PAYMENT_LINK = "https://boosty.to/leshiyalex/single-payment/donation/754164/target?share=target_link"; 

    // 0. ПРОВЕРКА LOCK (ЗАЩИТА ОТ ДВОЙНОГО КЛИКА)
    const isLocked = await LAST_PHOTO_STORAGE.get(GENERATION_LOCK_KEY);
    if (isLocked) {
        await sendMessage(chatId, "?? **Подождите!** Предыдущая команда /photo еще выполняется. Не нажимайте несколько раз.", TELEGRAM_BOT_TOKEN);
        return;
    }

    // 1. Получаем текущий баланс
    let currentBalance = parseInt(await LAST_PHOTO_STORAGE.get(BALANCE_KEY)); 
    
    if (isNaN(currentBalance)) { 
        currentBalance = FREE_LIMIT;
    }

    // Определяем VIP-статус
    const isVIP = currentBalance >= VIP_THRESHOLD;
    
    if (currentBalance <= 0 && !isVIP) {
        // --- ЛИМИТ ИСЧЕРПАН (Баланс = 0 и не VIP) ---
        const message = `
        ? **Лимит исчерпан!**

Вы использовали все доступные улучшения фотографий.

? Команда **/create** (генерация) остается бесплатной.
? Для команды **/photo** (улучшение) требуется оплата.

?? Ваш текущий счет: **<b>0</b>**.
?? Цена за 1 фотографию: **${PRICE_PER_PHOTO} руб.**
                
Для пополнения баланса:
1. Оплатите желаемую сумму (минимум ${PRICE_PER_PHOTO} руб.) по ссылке:
    ?? **<a href="${PAYMENT_LINK}">ПОПОЛНИТЬ БАЛАНС</a>** ??
2. **ОБРАТИТЕСЬ К АДМИНИСТРАТОРУ** (отправьте ему скриншот/чек и ваш Telegram ID).
        `;
        await sendMessage(chatId, message, TELEGRAM_BOT_TOKEN);
        return; 
    }

// 2. ПРОВЕРКА НАЛИЧИЯ ПРОМПТА И ИЗОБРАЖЕНИЯ (ДО СПИСАНИЯ!)
const userDefinedPrompt = await LAST_PHOTO_STORAGE.get(promptKey); 
// Чтение KV как ТЕКСТА
const rawImageKVData = await LAST_PHOTO_STORAGE.get(originalImageBase64Key, { type: 'text' }); 
    
// !!! КРИТИЧЕСКИЙ ЛОГ: Сразу после чтения KV !!!
if (DEBUG_ENABLED) {
    console.log(`[DEBUG KV] Raw KV Data read. Type: ${typeof rawImageKVData}, Length: ${rawImageKVData ? rawImageKVData.length : 'NULL'}`);
}
    
if (!userDefinedPrompt || !rawImageKVData) {
    // Отправка сообщения в лог (если rawImageKVData null/undefined/пусто)
    console.error(`[CRITICAL ERROR] Failed to retrieve KV data. Prompt existence: ${!!userDefinedPrompt}. Image data existence: ${!!rawImageKVData}.`);
    await sendMessage(chatId, `?? **Внимание:** Сначала получите промпт, отправив фотографию.`, TELEGRAM_BOT_TOKEN);
    return;
}

// --- ФИНАЛЬНЫЙ БЛОК: ИЗВЛЕЧЕНИЕ И ГАРАНТИЯ ЧИСТОТЫ BASE64 ---
let base64StringForAPI = String(rawImageKVData); 

// 1. Агрессивная попытка парсинга JSON, если данные не чистая строка
try {
    const imageData = JSON.parse(base64StringForAPI);
    if (typeof imageData === 'object' && imageData !== null) {
        let potentialBase64 = imageData.imageBase64 || imageData.base64_image || imageData.base64;
        if (typeof potentialBase64 === 'string' && potentialBase64.length > 100) {
            base64StringForAPI = potentialBase64;
        }
    }
} catch (e) {
    // Если не JSON, игнорируем
}


// 2. Окончательная очистка (убираем пробелы и префикс)
base64StringForAPI = base64StringForAPI.replace(/[\r\n\s]/g, ''); 
if (base64StringForAPI.includes(',')) {
    base64StringForAPI = base64StringForAPI.split(',')[1];
}

// 3. ФИНАЛЬНАЯ ПРОВЕРКА
if (base64StringForAPI.length < 100) {
    // Вывод ошибки в лог, чтобы понять, что произошло
    if (DEBUG_ENABLED) {
        const errorMsg = `? **Ошибка:** Не удалось извлечь Base64 (длина ${base64StringForAPI.length}).`;
        console.error(`DEBUG: Base64 error. Cleaned length: ${base64StringForAPI.length}.`); 
        await sendMessage(chatId, errorMsg, TELEGRAM_BOT_TOKEN);
    }
    return;
}

// !!! ВАЖНО: Заменяем оригинальную переменную !!!
const originalImageBase64 = base64StringForAPI; 
// ----------------------------------------------------------------------

    // --- УСТАНОВКА LOCK И СПИСАНИЕ ---

    // !!! КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Устанавливаем LOCK здесь, ДО СПИСАНИЯ !!!
    await LAST_PHOTO_STORAGE.put(GENERATION_LOCK_KEY, 'true', { expirationTtl: 60 }); 

    const balanceBeforeCharge = currentBalance; // Баланс для возможного возврата
    let newBalance = currentBalance;
    
    if (!isVIP) {
        // Списываем только, если НЕ в VIP-режиме
        newBalance = currentBalance - 1;
        // 1. Списываем и сохраняем новый баланс
        await LAST_PHOTO_STORAGE.put(BALANCE_KEY, newBalance.toString(), { expirationTtl: 3600 * 24 * 365 }); 
    }

    // 3. Отправляем уведомление о балансе/статусе
    let balanceMessage;

    if (isVIP) {
        balanceMessage = `? **VIP-доступ:** Команда выполнена. Остаток: **Без ограничений**!`;
    } else {
        // Не VIP
        if (newBalance > 0) {
            balanceMessage = `?? **Использование:** Списано 1 фото. Остаток: **${newBalance}** фото.`;
        } else {
            balanceMessage = `?? **Внимание:** Это была ваша последняя доступная попытка! Текущий баланс: **0**.`;
        }
    }

    await sendMessage(chatId, balanceMessage, TELEGRAM_BOT_TOKEN);
    // await sendMessage(chatId, 
    //    `?? **Важное замечание:** Функция улучшения фото (команда /photo) иногда не может исправить неверную ориентацию (поворот) изображения. Сгенерированное фото возможно сохранит поворот оригинала.`, 
    //    TELEGRAM_BOT_TOKEN
    // );
    
// 4. Формируем промпт и запускаем генерацию
// !!! КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: ОЧИСТКА PROMPT от лишних символов (кавычки, переносы)!!!
const cleanedUserPrompt = userDefinedPrompt.replace(/[\r\n]/g, ' ').replace(/"/g, "'");

const improvementPrompt = `
        Улучши качество прикрепленного изображения:
        1. **Цветность:** Сделай его цветным, если оно черно-белое.
        2. **Разрешение:** Повысь разрешение до студийного качества, детализируй.
        3. **Сохранение:** Строго сохрани оригинальные черты лица субъекта, позу и композицию. Не изменяй лица и не допускай размытия, особенно на людях. Не изменяй радикально содержание.
        4. **Описание сюжета:** ${cleanedUserPrompt}.
        Фокусируйся на гиперреализме и естественных цветах.
    `; //improvementPrompt пока на русском

    const workingMessageResponse = await sendMessage(chatId, "? **Запускаю улучшение изображения...**", TELEGRAM_BOT_TOKEN);
    const workingMessageId = workingMessageResponse.ok ? workingMessageResponse.result.message_id : null;


// ----------------------------------------------------
// !!! НОВЫЙ БЛОК: ПЕРЕВОД РУССКОГО ПРОМПТА НА АНГЛИЙСКИЙ !!!
// ----------------------------------------------------

if (workingMessageId) await editMessage(chatId, workingMessageId, "? ** Перевожу промпт для AI...", TELEGRAM_BOT_TOKEN);

let finalImg2ImgPrompt = improvementPrompt; // По умолчанию, русский
let translationSuccess = false;

try {
    // 1. Убираем лишнюю разметку и переносы для чистоты перевода
    const cleanPromptForTranslation = improvementPrompt.replace(/\*\*/g, '').replace(/\n/g, ' '); 
    
    // 2. Вызываем существующий переводчик
    const translatedText = await callWorkersAITranslate(cleanPromptForTranslation, envData);
    
    // Проверяем, что перевод успешен и не пустой
    if (translatedText && translatedText.trim().length > 10 && translatedText !== cleanPromptForTranslation) {
        finalImg2ImgPrompt = translatedText.trim();
        translationSuccess = true;
    }
    
    if (DEBUG_ENABLED) {
        await sendMessage(envData.ADMIN_CHAT_ID, `?? **[DEBUG] Translation:** Статус: ${translationSuccess ? 'Успех' : 'Не требуется/Сбой'}. Исходный промпт: ${cleanPromptForTranslation.length}, Финальный промпт: ${finalImg2ImgPrompt.length}`, TELEGRAM_BOT_TOKEN);
    }
    
} catch (e) {
    if (DEBUG_ENABLED) {
        await sendMessage(envData.ADMIN_CHAT_ID, `? **[DEBUG] Translation Error:** Не удалось перевести промпт. Использование оригинала. Ошибка: ${e.message}`, TELEGRAM_BOT_TOKEN);
    }
}

// ----------------------------------------------------
// !!! КОНЕЦ БЛОКА ПЕРЕВОДА !!!
// ----------------------------------------------------
    
    try {
        if (workingMessageId) await editMessage(chatId, workingMessageId, "? ** Отправляю на генерацию...", TELEGRAM_BOT_TOKEN);
        
        // ВЫЗОВ API: callWorkersAIImg2Img возвращает ArrayBuffer.
        // Передаем ПЕРЕВЕДЕННЫЙ промпт (finalImg2ImgPrompt)
        const generatedImageBuffer = await callWorkersAIImg2Img(finalImg2ImgPrompt, originalImageBase64, envData);                    

        // !!! ИЗМЕНЕНИЕ: Переключаемся на DALL-E (BotHub) !!!
        // DALL-E Edit гораздо лучше справляется с сохранением оригинала и реставрацией.
        // Вызываем НОВУЮ функцию
        // const generatedImageBuffer = await callDalleImg2Img(finalImg2ImgPrompt, originalImageBase64, envData);

        if (workingMessageId) await editMessage(chatId, workingMessageId, "? ** Изображение сгенерировано.", TELEGRAM_BOT_TOKEN);
        
        // 5. Отправка финального изображения
        // Используем finalImg2ImgPrompt, который теперь может быть английским.
        const finalCaption = `? Готово! Ваша улучшенная фотография`;
        // \n\nПромпт:\n${finalImg2ImgPrompt}
       
        
        // ПЕРЕДАЕМ ArrayBuffer и envData
        await sendPhotoWithCaption(chatId, generatedImageBuffer, finalCaption, TELEGRAM_BOT_TOKEN, envData); 
        
        // Отправка завершающего сообщения, если это еще актуально
        if (workingMessageId) await editMessage(chatId, workingMessageId, `? **Готово!** Ваша улучшенная фотография.`, TELEGRAM_BOT_TOKEN);
        
    } catch (e) {
        // --- !!! ОБРАБОТКА ОШИБКИ И ВОЗВРАТ КРЕДИТА !!! ---
        const safeErrorMessage = e.message || 'Неизвестная ошибка: Проверьте логи Cloudflare.';
        console.error(`Критическая ошибка при улучшении изображения:`, safeErrorMessage);
        
        let errorMessage = `? Критическая ошибка генерации: ${safeErrorMessage}.`;
        
        if (!isVIP) {
            // Возвращаем баланс, который был до списания (только если не VIP)
            await LAST_PHOTO_STORAGE.put(BALANCE_KEY, balanceBeforeCharge.toString(), { expirationTtl: 3600 * 24 * 365 });
            errorMessage += `\n\n? **Кредит возвращен** из-за ошибки генерации. У Вас всего (${balanceBeforeCharge} фото)`;
        }
        // 2. ОТПРАВКА ОШИБКИ В АДМИН-ЧАТ (это вам нужно)
        const errorString = `? Критическая ошибка генерации: ${e.message}`;
            
        // Отправка ошибки вам в админ-чат
        await sendMessage(envData.ADMIN_CHAT_ID, errorString, TELEGRAM_BOT_TOKEN);

        // Отправка уведомления пользователю
        if (workingMessageId) await editMessage(chatId, workingMessageId, errorMessage, TELEGRAM_BOT_TOKEN);
    } finally {
        // !!! Снимаем LOCK в конце
        await LAST_PHOTO_STORAGE.delete(GENERATION_LOCK_KEY);
    }
}

// ? processVideoCommand (ИСПРАВЛЕНО: ТОЛЬКО ЗАПУСК И СОХРАНЕНИЕ СТАТУСА)
async function processVideoCommand(chatId, userPrompt, env) { 
    
    const { 
        TELEGRAM_BOT_TOKEN, 
        GEMINI_API_KEY, 
        LAST_PHOTO_STORAGE, 
        VEO_POLL_STORAGE
    } = env;
    
    // 1. Получение данных
    const chatKey = chatId.toString();
    const lastPhotoData = await LAST_PHOTO_STORAGE.get(chatKey, { type: 'json' });

    if (!lastPhotoData || !lastPhotoData.imageBase64) {
        return sendMessage(chatId, "?? **Внимание: Нет исходного изображения.** Чтобы сгенерировать видео, сначала отправьте команду <code>/photo</code> или <code>/create</code>.", TELEGRAM_BOT_TOKEN);
    }
    
    const generatedImageBase64 = lastPhotoData.imageBase64;
    const BASE_VIDEO_PROMPT = "Прочувствуй атмосферу фотографии и оживи ее, привнеся тонкое, естественное и спокойное движение, которое придает сцене жизнь.";
    let finalPrompt = userPrompt && userPrompt.trim().length > 0 ? `${BASE_VIDEO_PROMPT} Конкретное движение: ${userPrompt.trim()}` : BASE_VIDEO_PROMPT;
    
    const workingMessageResponse = await sendMessage(chatId, "? **Начинаю генерацию видео...** (Только запуск. Для получения результата используйте `/checkvideo`)", TELEGRAM_BOT_TOKEN);
    if (!workingMessageResponse.ok || !workingMessageResponse.result || !workingMessageResponse.result.message_id) return;
    const workingMessageId = workingMessageResponse.result.message_id;

    try {
        await editMessage(chatId, workingMessageId, "? ** Запускаю асинхронную операцию видео...", TELEGRAM_BOT_TOKEN);

        const operationName = await startGeminiVeoImageToVideo(
            finalPrompt, 
            generatedImageBase64, 
            'image/png', // Используем PNG, поскольку сгенерированное фото - это Base64-PNG
            GEMINI_API_KEY
        );
        
        // 2. СОХРАНЕНИЕ СТАТУСА ДЛЯ POLLING (ВМЕСТО СИНХРОННОГО ОЖИДАНИЯ)
        const pollData = {
            operationName: operationName,
            startTime: Date.now(),
            workingMessageId: workingMessageId,
            prompt: finalPrompt
        };
        await savePollData(chatId, pollData, VEO_POLL_STORAGE);

        await editMessage(chatId, workingMessageId, 
            `? **Операция запущена!**\n\n` +
            `*Veo ID:* \`${operationName.split('/').pop()}\`\n\n` +
            `Генерация займет 5-10 минут. Чтобы проверить статус и получить видео, используйте команду \`/checkvideo\`.`, 
            TELEGRAM_BOT_TOKEN
        );

    } catch (e) {
        console.error("Video generation failed:", e);
        await editMessage(chatId, workingMessageId, `? *Ошибка запуска Veo:*\n<code>${e.message}</code>`, TELEGRAM_BOT_TOKEN);
    }
}

async function processCheckVideoCommand(chatId, env) {
    const { VEO_POLL_STORAGE, GEMINI_API_KEY, TELEGRAM_BOT_TOKEN } = env;

    const pollData = await getPollData(chatId, VEO_POLL_STORAGE);
    if (!pollData) {
        await sendMessage(chatId, "?? Нет активных операций генерации видео Veo. Вы можете запустить новую, используя команду `/video [промпт движения]`.", TELEGRAM_BOT_TOKEN);
        return;
    }

    const { operationName, startTime, workingMessageId, prompt } = pollData;
    const timeElapsed = Math.floor((Date.now() - startTime) / 1000);
    
    // 1. Обновляем существующее сообщение
    await editMessage(chatId, workingMessageId, 
        `?? *Проверяю статус видео...*\n` +
        `Операция: \`${operationName.split('/').pop()}\`\n` +
        `Прошло времени: ${timeElapsed} секунд.`, 
        TELEGRAM_BOT_TOKEN
    );

    try {
        // 2. Проверяем статус
        const pollUrl = `https://generativelanguage.googleapis.com/v1beta/operations/${operationName}?key=${GEMINI_API_KEY}`;
        const pollResponse = await fetch(pollUrl);
        
        if (!pollResponse.ok) {
            await editMessage(chatId, workingMessageId, `? Ошибка проверки статуса (HTTP ${pollResponse.status}). Попробуйте позже.`, TELEGRAM_BOT_TOKEN);
            await VEO_POLL_STORAGE.delete(chatId.toString());
            return;
        }

        const videoOperation = await pollResponse.json();
        
        // 3. Обработка результата
        if (videoOperation.done) {
            if (videoOperation.error) {
                await editMessage(chatId, workingMessageId, `? *Veo Ошибка в результате:*\n<code>${JSON.stringify(videoOperation.error)}</code>`, TELEGRAM_BOT_TOKEN);
            } else {
                const videoUri = videoOperation.response.artifacts[0].uri;
                const caption = `?? **Видео готово!**\n\n*Промпт движения:*\n\`${prompt}\``; // Markdown
                
                await sendVideo(chatId, videoUri, TELEGRAM_BOT_TOKEN, caption);
                await editMessage(chatId, workingMessageId, `? Готово! Видео отправлено.`, TELEGRAM_BOT_TOKEN);
            }
            await VEO_POLL_STORAGE.delete(chatId.toString());
            
        } else {
            // ЕЩЕ НЕ ГОТОВО
            await editMessage(chatId, workingMessageId, 
                `? *Генерация продолжается...*\n` +
                `Прошло времени: ${timeElapsed} секунд. Пожалуйста, повторите команду /checkvideo через 60 секунд.`, 
                TELEGRAM_BOT_TOKEN
            );
        }

    } catch (e) {
        console.error("Check video failed:", e);
        await editMessage(chatId, workingMessageId, `? Критическая ошибка при проверке: <code>${e.message}</code>`, TELEGRAM_BOT_TOKEN);
        await VEO_POLL_STORAGE.delete(chatId.toString());
    }
}


// ? processImageAsync (Создание промпта из фото)
async function processImageAsync(chatId, fileIdToProcess, TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, LAST_PHOTO_STORAGE) {
    let finalPrompt = null;
    const chatKey = chatId.toString();
    const promptKey = chatKey + '_prompt';
    const imageBase64Key = chatKey + '_base64_image';
    
    const workingMessageResponse = await sendMessage(chatId, "? **Анализирую фото и создаю промпт...**", TELEGRAM_BOT_TOKEN);
    if (!workingMessageResponse.ok || !workingMessageResponse.result || !workingMessageResponse.result.message_id) return;
    const workingMessageId = workingMessageResponse.result.message_id;

    try {
        await editMessage(chatId, workingMessageId, "? ** Скачиваю фото ...", TELEGRAM_BOT_TOKEN);
        
        const filePath = await getTelegramFilePath(fileIdToProcess, TELEGRAM_BOT_TOKEN);
        const imageBuffer = await downloadTelegramFile(filePath, TELEGRAM_BOT_TOKEN);
        
        if (!imageBuffer) { throw new Error("Не удалось скачать фото с Telegram."); }
        const imageBase64 = arrayBufferToBase64(imageBuffer);
        
        await editMessage(chatId, workingMessageId, "? ** Анализирую фото и генерирую промпт...", TELEGRAM_BOT_TOKEN);
        
        // Сохраняем Base64 оригинального изображения для Image-to-Image
        await LAST_PHOTO_STORAGE.put(imageBase64Key, imageBase64, { expirationTtl: 3600 });
        
        finalPrompt = await callGeminiVision(imageBase64, GEMINI_API_KEY);
        await LAST_PHOTO_STORAGE.put(promptKey, finalPrompt, { expirationTtl: 3600 });
        
        // Новая клавиатура с кнопкой /prompt
        const promptKeyboard = {
            inline_keyboard: [
                [{ text: "?? Перейти в меню работы с промптом (/prompt)", callback_data: 'cmd:/prompt' }], // <-- ИЗМЕНЕНО
                [{ text: "?? Создать новую картинку по промпту (/create)", callback_data: 'cmd:/create_empty' }],
                [{ text: "? Улучшить фотографию (/photo)", callback_data: 'cmd:/photo' }],
            ]
        };

        await editMessage(chatId, workingMessageId, "? ** Сохраняю промпт и отправляю результат...", TELEGRAM_BOT_TOKEN);
        const messageText = `? **Промпт готов!**\n\n*Промпт:*\n<code>${finalPrompt}</code>\n\nВыберите следующее действие:`;
        // Отправляем кнопки
        await sendMessage(chatId, messageText, TELEGRAM_BOT_TOKEN, null, promptKeyboard); 
        
        await editMessage(chatId, workingMessageId, "? Готово! Промпт отправлен.", TELEGRAM_BOT_TOKEN);
    } catch (e) {
        console.error("Критическая ошибка:", e.message);
        let errorMessage = `? Критическая ошибка при анализе: ${e.message}.`;
        if (finalPrompt) { errorMessage += `\n\nЧастичный промпт (для отладки): <code>${finalPrompt}</code>`; }
        await editMessage(chatId, workingMessageId, errorMessage, TELEGRAM_BOT_TOKEN);
    }
}

// ----------------------------------------------------
// АСИНХРОННЫЕ ОБРАБОТЧИКИ ГОЛОСА
// ----------------------------------------------------
async function processVoiceMessageAsync(chatId, fileId, envData, ctx) {
    let loadingMessageId;
    
    try {
        // 1. Отправляем сообщение "Обработка..."
        const loadingMessage = await sendMessage(chatId, "??? **Обработка голосового сообщения...**", envData.TELEGRAM_BOT_TOKEN);
        if (!loadingMessage.ok || !loadingMessage.result) return;
        loadingMessageId = loadingMessage.result.message_id;

        // 2. Получаем путь к файлу (используем существующую функцию)
        const filePath = await getTelegramFilePath(fileId, envData.TELEGRAM_BOT_TOKEN);
        
        // 3. Скачиваем файл в ArrayBuffer (используем существующую функцию)
        const audioBuffer = await downloadTelegramFile(filePath, envData.TELEGRAM_BOT_TOKEN);
        
        // 4. Распознавание речи через Workers AI
        const transcribedText = await callWorkersAISpeechToText(audioBuffer, envData);
        
        // 5. Отправляем результат
        const responseText = `?? **Распознанный текст:**\n\`${transcribedText}\``;
        await editMessage(chatId, loadingMessageId, responseText, envData.TELEGRAM_BOT_TOKEN);
        
        // 6. Запускаем обработку текста как обычного чата (отвечаем AI)
        ctx.waitUntil(processTextMessage(chatId, transcribedText, envData)); 

    } catch (error) {
        const errorMessage = (error.message || "Неизвестная ошибка ASR").substring(0, 1000); 
        
        if (loadingMessageId) {
            await editMessage(chatId, loadingMessageId, `? **Ошибка распознавания речи (ASR):**\n\`${errorMessage.substring(0, 100)}\``, envData.TELEGRAM_BOT_TOKEN);
        } else {
             await sendMessage(chatId, `? **Ошибка распознавания речи (ASR):**\n\`${errorMessage.substring(0, 100)}\``, envData.TELEGRAM_BOT_TOKEN);
        }
        
        // Отправка админ-отчета
        if (envData.BOT_LOGS_STORAGE) {
            ctx.waitUntil(logDebug('ERROR_ASR_FAIL', errorMessage, envData));
        }
        if (chatId === envData.ADMIN_CHAT_ID) {
             ctx.waitUntil(sendMessage(chatId, `?? **АДМИН-ОТЧЕТ ASR (RAW):**\n${errorMessage.substring(0, 300)}`, envData.TELEGRAM_BOT_TOKEN));
        }
    }
}

// *** 3.2. Обработка входящего фото (Vision AI) - ИСПРАВЛЕНА ПОД 4 АРГУМЕНТА ***
async function processPhotoMessageAsync(chatId, fileId, envData, ctx) {
    let loadingMessageId;
    
    const token = envData.TELEGRAM_BOT_TOKEN;
    const storage = envData.LAST_PHOTO_STORAGE; // Используем вашу привязку KV
    
    // --- KV KEYS ---
    const chatKey = chatId.toString();
    const LAST_PROMPT_KEY = chatKey + LAST_PROMPT_KEY_SUFFIX;
    const LAST_IMAGE_DATA_KEY = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX; 
    const LAST_PROMPT_MESSAGE_ID_KEY = chatKey + LAST_PROMPT_MESSAGE_ID_KEY_SUFFIX;
    
    try {
        // 1. Отправляем сообщение "Анализирую..."
        const loadingMessage = await sendMessage(chatId, "??? **Анализирую фото: Генерирую промпт...**", token);
        if (!loadingMessage.ok || !loadingMessage.result) return;
        loadingMessageId = loadingMessage.result.message_id;

        // 2. Скачивание файла
        const filePath = await getTelegramFilePath(fileId, token);
        const imageArrayBuffer = await downloadTelegramFile(filePath, token);

        // 3. КОНВЕРТАЦИЯ: Base64 для Vision AI и для KV
        const imageBase64 = arrayBufferToBase64(imageArrayBuffer);
        
        // 4. Вызов Vision AI для генерации промпта (Uform-Gen2)
        const englishPrompt = await callWorkersAIVision(imageArrayBuffer, "", envData); 
        
        // 5. Перевод промпта на русский через Workers AI Text
        await editMessage(chatId, loadingMessageId, "?? **Промпт сгенерирован, выполняю перевод...**", token);
        const russianPrompt = await callWorkersAITranslate(englishPrompt, envData);

        // 6. Сохраняем промпт и Base64 изображения в KV (КРИТИЧЕСКО)
        await storage.put(LAST_PROMPT_KEY, russianPrompt, { expirationTtl: 3600 });
        await storage.put(LAST_IMAGE_DATA_KEY, imageBase64, { expirationTtl: 3600 });
        
        // 7. Отправляем меню промпта (Markdown)
        const finalMessage = await sendMessage(
            chatId, 
            `? **Промпт сгенерирован!**\n\n\`${russianPrompt}\``, 
            token, 
            null, 
            getPromptKeyboard(russianPrompt) 
        );
        
        // 8. Сохраняем ID сообщения с меню для возможности редактирования
        if (finalMessage.ok) {
            await storage.put(LAST_PROMPT_MESSAGE_ID_KEY, finalMessage.result.message_id.toString(), { expirationTtl: 3600 });
        }

    } catch (error) {
        const errorText = error.message || "Неизвестная ошибка генерации промпта.";
        await editMessage(chatId, loadingMessageId, `? **Ошибка!** Не удалось сгенерировать промпт: ${errorText}`, token);
    } finally {
        // if (loadingMessageId) {
        //    // Удаляем асинхронно
        //    ctx.waitUntil(deleteMessage(chatId, loadingMessageId, token));
        //}
    }
}

/**
 * @name setBotCommands
 * @description Отправляет JSON-запрос к методу setMyCommands Telegram API для обновления списка команд.
 * @param {string} TELEGRAM_BOT_TOKEN - Токен бота.
 * @param {Array<Object>} commands - Массив объектов команд.
 * @param {string} scopeType - Тип области видимости ('default', 'chat').
 * @param {number|null} chatId - ID чата, если scopeType = 'chat'.
 * @returns {Promise<Object>} Ответ API.
 */
async function setBotCommands(TELEGRAM_BOT_TOKEN, commands, scopeType, chatId = null) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`;
    
    let scope = { type: scopeType };
    if (scopeType === 'chat' && chatId) {
        // chat_id должен быть строкой для корректного JSON
        scope.chat_id = chatId.toString();
    }

    const payload = {
        commands: commands,
        scope: scope
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    return await response.json();
}

// ----------------------------------------------------
// IV. ГЛАВНЫЙ ОБРАБОТЧИК (WEBHOOK)
// ----------------------------------------------------
export default {
    async fetch(request, env, ctx) {
        if (request.method !== 'POST') {
            // Если это не POST (например, GET-запрос в браузере или в превью)
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="ru">
                <head>
                    <meta charset="UTF-8">
                    <title>Gemini AI Telegram Bot Worker</title>
                    <style>
                        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f0f0f0; }
                        .container { text-align: center; padding: 20px; border-radius: 8px; background: white; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                        h1 { color: #333; }
                        p { color: #555; font-size: 1.2em; }
                        a { color: #007bff; text-decoration: none; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Telegram-бот "Gemini AI" by Leshiy.</h1>
                        <p>Этот Worker предназначен для обработки вебхуков Telegram.</p>
                        <p>Найди меня в Telegram: <a href="https://t.me/gemini_aitg_bot" target="_blank">@gemini_aitg_bot</a></p>
                    </div>
                </body>
                </html>
            `;

            return new Response(htmlContent, {
                headers: { 'Content-Type': 'text/html' },
                status: 200
            });
        }

        const update = await request.json().catch(() => ({}));
        
        // --- ПЕРЕМЕННЫЕ (для message и callback_query) ---
        let chatId = null;
        let messageText = '';
        let isPhoto = false;
        let isVoice = false;

        const message = update.message;
        const voice = message ? message.voice : undefined; // Исправлено: voice извлекается безопасно
        const callback = update.callback_query;

        if (message) {
            chatId = message.chat.id;
            messageText = message.text || '';
            isPhoto = message.photo && message.photo.length > 0;
            isVoice = !!message.voice; // Более чистая проверка на наличие voice
        } else if (callback) {
            chatId = callback.from.id;
        }

        if (chatId === null) { return new Response('OK', { status: 200 }); }

        const envData = { 
            TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN, 
            GEMINI_API_KEY: env.GEMINI_API_KEY, 
            BOTHUB_API_KEY: env.BOTHUB_API_KEY, 
            // !!! ИСПРАВЛЕНИЕ: Переименовываем LAST_PHOTO_STORAGE в GEMINI_STORAGE для единообразия
            // Это KV-хранилище, используемое для всех временных данных (промпт, фото, история)
            GEMINI_STORAGE: env.LAST_PHOTO_STORAGE,
            LAST_PHOTO_STORAGE: env.LAST_PHOTO_STORAGE, // Оставляем для совместимости
            VEO_POLL_STORAGE: env.VEO_POLL_STORAGE,
            CHAT_HISTORY_STORAGE: env.CHAT_HISTORY_STORAGE,
            DEBUG_CHAT_ID: env.DEBUG_CHAT_ID,
            ADMIN_CHAT_ID: env.ADMIN_CHAT_ID, 
            BOT_LOGS_STORAGE: env.BOT_LOGS_STORAGE,
            AI: env.AI,
            ctx: ctx, // Передаем контекст для waitUntil
            // !!! КРИТИЧЕСКОЕ ДОБАВЛЕНИЕ !!!
            CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID, // Чтение из ENV
            CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN, // Чтение из ENV
            // !!! КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: ДОБАВЛЕНИЕ СУФФИКСОВ В ENVData !!!
            LAST_PROMPT_KEY_SUFFIX: LAST_PROMPT_KEY_SUFFIX,
            LAST_IMAGE_DATA_KEY_SUFFIX: LAST_IMAGE_DATA_KEY_SUFFIX,
            LAST_PROMPT_MESSAGE_ID_KEY_SUFFIX: LAST_PROMPT_MESSAGE_ID_KEY_SUFFIX,
            LAST_ACTION_KEY_SUFFIX: LAST_ACTION_KEY_SUFFIX,
            USER_STATE_KEY_SUFFIX: USER_STATE_KEY_SUFFIX, // <--- Добавление
        };

        // Вспомогательные константы для админ-режима
        const ADMIN_STATE_AWAITING_ID = 'admin_awaiting_id';
        const ADMIN_STATE_AWAITING_AMOUNT = 'admin_awaiting_amount'; // <-- НОВЫЙ СТЕЙТ
        const ADMIN_STATE_KEY = 'admin_state_' + chatId; // Ключ для стейта админа
        const ADMIN_TEMP_ID_KEY = 'admin_temp_id_' + chatId; // Ключ для временного хранения ID

        // Вспомогательные константы для колбэков
        const STATE_AWAITING_PROMPT_EDIT = 'awaiting_prompt_edit';
        const STATE_AWAITING_NEW_PROMPT = 'awaiting_new_prompt'; 
        
        // 1. ОБРАБОТКА КОМАНД (ТОЛЬКО TEXT-COMMANDS)
        if (messageText.startsWith('/')) {
            
            // --- 1.1. СПЕЦИАЛЬНАЯ ОБРАБОТКА ДЛЯ /activate_ [код] ---
            // Используем startsWith, чтобы избежать попадания в 'default' switch
            if (messageText.startsWith('/activate_')) { 
                ctx.waitUntil(processUserActivationCommand(chatId, messageText, envData));
                return new Response('OK', { status: 200 });
            }
            
            // --- 1.2. СТАНДАРТНЫЕ КОМАНДЫ ---
            // Удаляем пробелы и регистронезависимо сравниваем (только имя команды)
            const command = messageText.split(' ')[0].toLowerCase(); 
            
            switch (command) {
                case '/start':
                    ctx.waitUntil(processStartCommand(chatId, envData.TELEGRAM_BOT_TOKEN));
                    break;
                case '/stop':
                    ctx.waitUntil(processStopCommand(chatId, envData.LAST_PHOTO_STORAGE, envData.VEO_POLL_STORAGE, envData.TELEGRAM_BOT_TOKEN, envData));
                    break;
                case '/prompt': 
                    ctx.waitUntil(processPromptCommand(chatId, envData.TELEGRAM_BOT_TOKEN, envData.LAST_PHOTO_STORAGE, envData));
                    break;
                case '/create':
                    // 1. Извлекаем промпт (используем лучший вариант)
                    const createPrompt = messageText.replace(/^\/create\s*/i, '').trim(); 
                        
                    // 2. Выполняем синхронно (ВАЖНО: удаляем ctx.waitUntil)
                    // Используем await, чтобы дождаться завершения генерации перед возвратом ответа Telegram
                    await processCreateCommand(chatId, createPrompt, envData.TELEGRAM_BOT_TOKEN, envData.GEMINI_API_KEY, envData.LAST_PHOTO_STORAGE, envData);
                    break;
                case '/photo':
                    // !!! ПЕРЕДАЕМ ПРИВЯЗКУ AI ВМЕСТО КЛЮЧА GEMINI !!!
                    ctx.waitUntil(processPhotoCommand(chatId, envData.TELEGRAM_BOT_TOKEN, envData, envData.LAST_PHOTO_STORAGE));
                    break;
                case '/checkvideo':
                    ctx.waitUntil(processCheckVideoCommand(chatId, envData));
                    break;
                case '/video':
                    const videoPrompt = messageText.replace(/^\/video\s*/i, '').trim();
                    ctx.waitUntil(processVideoCommand(chatId, videoPrompt, envData));
                    break;
                        
                case '/admin': // <-- ИСПРАВЛЕННЫЙ БЛОК: Убрана обработка текстовой команды /admin update_cmds
                    // Сюда попадает ТОЛЬКО команда /admin (без параметров), 
                    // которая открывает админ-панель с кнопками.
                    ctx.waitUntil(processAdminStartCommand(chatId, envData)); 
                    break;
                // /activate_... теперь перехватывается выше
                case '/retry': 
                    ctx.waitUntil(sendMessage(chatId, 'Команда `/retry` была заменена на команду `/prompt`.', envData.TELEGRAM_BOT_TOKEN));
                    break;
                default: 
                    // Неизвестная команда, отправляем в чат-обработчик
                    ctx.waitUntil(processTextMessage(chatId, messageText, envData)); 
                    break;
            }
            return new Response('OK', { status: 200 });
        }

        // 2. ОБРАБОТКА ВХОДЯЩЕГО ФОТО И ГОЛОСА

        if (voice) { // <--- Проверяем напрямую наличие объекта voice
            const voiceFileId = voice.file_id; // Используем voice
            
            ctx.waitUntil(processVoiceMessageAsync(chatId, voiceFileId, envData, ctx));
            
            return new Response('OK', { status: 200 });
        }

        if (isPhoto) {
            const fileIdToProcess = message.photo.pop().file_id; 
            // ИСПРАВЛЕНИЕ: Вызываем новую функцию processPhotoMessageAsync
            ctx.waitUntil(processPhotoMessageAsync(chatId, fileIdToProcess, envData, ctx)); 
            return new Response('OK', { status: 200 });
        }

    // 3. ОБРАБОТКА НАЖАТИЯ INLINE-КНОПОК (callback_query)
    if (callback) {
        const data = callback.data;
        const messageId = callback.message.message_id;
        const chatKey = chatId.toString();
        const storage = env.LAST_PHOTO_STORAGE; // Используем правильный KV-биндинг
        const token = envData.TELEGRAM_BOT_TOKEN;

        // --- KV KEYS (УНИФИКАЦИЯ: ИСПОЛЬЗУЕМ СУФФИКСЫ ИЗ envData) ---
        const LAST_PROMPT_KEY = chatKey + envData.LAST_PROMPT_KEY_SUFFIX;
        const LAST_IMAGE_DATA_KEY = chatKey + envData.LAST_IMAGE_DATA_KEY_SUFFIX;
        const LAST_ACTION_KEY = chatKey + envData.LAST_ACTION_KEY_SUFFIX;

        // --- Стейты из вашего кода (Добавляем USER_STATE_KEY_SUFFIX в envData, если не было) ---
        // ? ИСПРАВЛЕНИЕ: Используем суффикс из envData для USER_STATE_KEY, если он там есть
        const USER_STATE_KEY = chatKey + (envData.USER_STATE_KEY_SUFFIX || '_user_state'); 
        const STATE_AWAITING_PROMPT_EDIT = 'awaiting_prompt_edit';
        const STATE_AWAITING_NEW_PROMPT = 'awaiting_new_prompt'; 

        // 1. ОБЯЗАТЕЛЬНО: Отвечаем на колбэк, чтобы убрать часы на кнопке!
        ctx.waitUntil(answerCallbackQuery(callback.id, "Обработка команды...", token));

        // 2. ЛОГИКА ДЛЯ ПОЛЬЗОВАТЕЛЬСКИХ КОМАНД (Начинаются с 'cmd:/')
        if (data.startsWith('cmd:/')) {
            const command = data.substring(5).trim(); 

            // Определяем, нужно ли удалять сообщение. 
            const isStartMenuCommand = command === 'photo' || command === 'create_empty' || command === 'prompt' || command === 'stop';

            switch (command) {
                case 'photo':
                    // !!! ПЕРЕДАЕМ ПРИВЯЗКУ AI ВМЕСТО КЛЮЧА GEMINI И LAST_PHOTO_STORAGE !!!
                    ctx.waitUntil(processPhotoCommand(chatId, envData.TELEGRAM_BOT_TOKEN, envData, storage));
                    break;
                case 'prompt': 
                    // ? ИСПРАВЛЕНИЕ: Добавлен пятый аргумент envData в processPromptCommand
                    ctx.waitUntil(processPromptCommand(chatId, token, storage, envData)); 
                    break;
                case 'create_empty':
                    // ? ИСПРАВЛЕНИЕ: Унифицирован вызов processCreateCommand
                    ctx.waitUntil(processCreateCommand(chatId, '', token, envData.GEMINI_API_KEY, storage, envData));
                    break;
                case 'stop':
                    // ? ИСПРАВЛЕНИЕ: Добавлен пятый аргумент envData в processStopCommand
                    ctx.waitUntil(processStopCommand(chatId, storage, envData.VEO_POLL_STORAGE, token, envData)); 
                    break;
                case 'retry': 
                    ctx.waitUntil(sendMessage(chatId, 'Кнопка `/retry` устарела. Используйте `/prompt` или кнопки выше.', token));
                    break;
                default:
                    ctx.waitUntil(sendMessage(chatId, `Команда по кнопке не найдена. Получено: ${command}`, token));
                    break;
            }
            return new Response('OK', { status: 200 });
        }

        // !!! НОВОЕ ИСПРАВЛЕНИЕ: УДАЛЕНА ЛОГИКА ОБРАБОТКИ ПРЯМЫХ КОМАНД '/' !!!
        // Прямые команды (вроде /create) должны обрабатываться в основном блоке fetch (handleMessage), 
        // а не как колбэк, если только колбэк не был специально создан с этим префиксом.
        // Если вам нужны эти кнопки, используйте 'cmd:/create' в callback_data.
        
        // --- ЛОГИКА vision_generate (СОЗДАТЬ КАРТИНКУ) ---
        else if (data === 'vision_generate') {
            const promptToGenerate = await storage.get(LAST_PROMPT_KEY);

            if (promptToGenerate) {
                // Вызываем существующую функцию processCreateCommand
                ctx.waitUntil(processCreateCommand(
                    chatId, 
                    promptToGenerate, // Передаем промпт из KV
                    token, 
                    envData.GEMINI_API_KEY, 
                    storage, 
                    envData
                ));
            } else {
                await editMessage(chatId, messageId, `?? Промпт устарел или не найден. Сначала отправьте фото.`, token);
            }
            return new Response('OK', { status: 200 });
        } 
        
        // --- ЛОГИКА regenerate_prompt (ПЕРЕГЕНЕРАЦИЯ ИЗ ФОТО) ---
        else if (data === 'regenerate_prompt') {
            const imageBase64 = await storage.get(LAST_IMAGE_DATA_KEY); // Проверяем наличие фото

            if (!imageBase64) {
                await editMessage(chatId, messageId, "?? **Внимание:** Нет исходного изображения для повторного анализа. Сначала отправьте фотографию.", token);
                return new Response('OK', { status: 200 });
            }
            
            ctx.waitUntil(processPromptRegeneration(chatId, imageBase64, token, storage, envData)); // Вызываем функцию

            return new Response('OK', { status: 200 });
        } 
        
        // --- ЛОГИКА edit_prompt (РЕДАКТИРОВАНИЕ ТЕКСТА) ---
        else if (data === 'edit_prompt') {
            const currentPrompt = await storage.get(LAST_PROMPT_KEY); // Проверяем наличие текста промпта
            
            if (!currentPrompt) {
                await editMessage(chatId, messageId, "?? **Ошибка:** Нечего редактировать. Сначала получите промпт, отправив фотографию или создайте его вручную.", token);
                return new Response('OK', { status: 200 });
            }
            
            // ? ИСПРАВЛЕНИЕ: Используем STATE_AWAITING_PROMPT_EDIT, который определен выше
            await storage.put(USER_STATE_KEY, STATE_AWAITING_PROMPT_EDIT, { expirationTtl: 300 }); 
            
            await editMessage(chatId, messageId, `?? **Редактирование промпта**\n\nОтправьте мне НОВЫЙ текст промпта. Я сохраню его и предложу новое меню.\n\nТекущий промпт:\n\`${currentPrompt}\``, token);

            return new Response('OK', { status: 200 });
        } 
        
        // --- ЛОГИКА translate_prompt (ПЕРЕВОД) ---
        else if (data === 'translate_prompt') {
            // ? ИСПРАВЛЕНИЕ: используем локальную 'storage' (env.LAST_PHOTO_STORAGE)
            const currentPrompt = await storage.get(LAST_PROMPT_KEY); 

            if (!currentPrompt) {
                await editMessage(chatId, messageId, "?? **Ошибка:** Нет промпта для перевода. Сначала получите промпт.", token);
                return new Response('OK', { status: 200 });
            }

            // Запускаем асинхронный процесс перевода
            ctx.waitUntil(
                (async () => {
                    const displayPrompt = currentPrompt.length > 30 ? currentPrompt.substring(0, 30) + '...' : currentPrompt;
                    await editMessage(chatId, messageId, `?? **Перевожу промпт: ${displayPrompt}**`, token);
                    
                    try {
                        const translatedPrompt = await callWorkersAITranslate(currentPrompt, envData); 
                        
                        await storage.put(LAST_PROMPT_KEY, translatedPrompt, { expirationTtl: 3600 });
                        
                        const isTranslated = translatedPrompt !== currentPrompt;
                        
                        let message = `? **Промпт обработан!**\n\n`;
                        if (isTranslated) {
                            message += `**Оригинал (RU):** \n\`${currentPrompt}\`\n\n**Перевод (EN):**\n\`${translatedPrompt}\``;
                        } else {
                            message += `Промпт был признан английским или слишком коротким, перевод не выполнен.\n\n**Текущий промпт:**\n\`${translatedPrompt}\``;
                        }

                        await editMessageWithKeyboard(
                            chatId, messageId, 
                            message,
                            token,
                            getPromptKeyboard(translatedPrompt) 
                        );
                    } catch (e) {
                        await editMessage(chatId, messageId, `? **Ошибка перевода:** ${e.message}`, token);
                    }
                })()
            );
            return new Response('OK', { status: 200 });
        }

        // --- ЛОГИКА clear_prompt (ОЧИСТКА ПРОМПТА) ---
        else if (data === 'clear_prompt') {
            await storage.delete(LAST_PROMPT_KEY); // Удаляем промпт
            await storage.delete(LAST_IMAGE_DATA_KEY); // Удаляем фото (также чистим контекст)
            
            // Очищаем стейты
            await storage.delete(USER_STATE_KEY);
            
            // Отправляем сообщение о сбросе
            const message = "?? **Промпт и контекст очищены!**\n\nТеперь вы можете создать новый промпт или загрузить фото.";
            
            // Используем editMessageWithKeyboard
            await editMessageWithKeyboard(chatId, messageId, message, token, getPromptKeyboard(null)); 
            
            return new Response('OK', { status: 200 });
        }

        // --- ЛОГИКА create_new_prompt (Установка стейта для нового промпта) ---
        else if (data === 'create_new_prompt') {
            // ? ИСПРАВЛЕНИЕ: Используем STATE_AWAITING_NEW_PROMPT, который определен выше
            await storage.put(USER_STATE_KEY, STATE_AWAITING_NEW_PROMPT, { expirationTtl: 300 }); 
            
            ctx.waitUntil(sendMessage(chatId, 
                "**?? Введите новый промпт**\n\n" +
                "Введите текстом всё что хотите вообразить а я сохраню эту информацию, и при нажатии кнопки **'Создать картинку /create'** попытаюсь воплотить Вашу фантазию в виде изображения.", 
                token
            ));
            return new Response('OK', { status: 200 });
        }

        // 4. ЛОГИКА ДЛЯ АДМИН-КОМАНД (Начинаются с 'admin_')
        else if (data.startsWith('admin_')) {
            // Проверяем, является ли пользователь администратором
            if (chatId.toString() !== envData.ADMIN_CHAT_ID.toString()) {
                ctx.waitUntil(sendMessage(chatId, "? Вы не можете использовать эти админ-функции.", token));
                return new Response('OK', { status: 200 });
            }
            
            // Вспомогательные константы для админ-режима
            const ADMIN_STATE_KEY = chatKey + '_admin_state'; 
            const STATE_AWAITING_ID = 'admin_awaiting_id';
            
            if (data === 'admin_activate') {
                // Устанавливаем стейт ожидания ID
                await storage.put(ADMIN_STATE_KEY, STATE_AWAITING_ID, { expirationTtl: 600 }); 
                
                ctx.waitUntil(sendMessage(chatId, 
                    "? **ВЫ В РЕЖИМЕ АКТИВАЦИИ БАЛАНСА**\n\n" +
                    "Пожалуйста, отправьте мне **Telegram ID** пользователя, для которого нужно сгенерировать команду активации." +
                    "\nВ помощь можно использовать бот:\n??Userinfo|Get id|IDBot @UserInfoToBot" +
                    "\n\n(Режим автоматически отключится через 10 минут)", 
                    token
                ));
                
            } else if (data === 'admin_debug') {
                ctx.waitUntil(processDebugCommand(chatId, envData));
            } else if (data === 'admin_update_cmds') {
                // ? ИСПРАВЛЕНИЕ: Добавлен setBotCommands, ADMIN_COMMANDS, PUBLIC_COMMANDS - предполагаем, что они определены в глобальной области
                const resultPublic = await setBotCommands(token, PUBLIC_COMMANDS, 'default');
                const resultAdmin = await setBotCommands(token, ADMIN_COMMANDS, 'chat', envData.ADMIN_CHAT_ID);
                
                let message = "? **Команды обновлены!**\n\n";
                message += `**Публичные (default) для всех:** ${resultPublic.ok ? 'Успех' : `Ошибка: ${resultPublic.description || 'Нет ответа от API'}`}\n`;
                message += `**Администраторские (chat ID ${envData.ADMIN_CHAT_ID}):** ${resultAdmin.ok ? 'Успех' : `Ошибка: ${resultAdmin.description || 'Нет ответа от API'}`}`;
                
                await sendMessage(chatId, message, token);
            }
            return new Response('OK', { status: 200 });
        }

        // Возвращаем OK для всех обработанных нажатий.
        return new Response('OK', { status: 200 });
    }
    // !!! КОНЕЦ ИСПРАВЛЕННОГО БЛОКА INLINE-КНОПОК !!!

        // 4. ОБРАБОТКА ОБЫЧНОГО ТЕКСТА (ЧАТ)
        if (messageText.length > 0) {
                    
            // --- 4.1. ОБРАБОТКА ИНТЕРАКТИВНОГО АДМИН-РЕЖИМА (Без изменений) ---
            if (chatId.toString() === envData.ADMIN_CHAT_ID.toString()) {
                const isAdminModeProcessed = await processAdminStateMessage(chatId, messageText, envData);
                if (isAdminModeProcessed) {
                    return new Response('OK', { status: 200 });
                }
            }

            // --- 4.2. ОБЫЧНАЯ ОБРАБОТКА ТЕКСТА (ИСПРАВЛЕНО) ---
            
            // 1. Сначала пытаемся обработать интерактивный ввод (сохранение промпта, которое требует await)
            const isPromptInteraction = await processTextMessage(chatId, messageText, envData);

            if (isPromptInteraction === true) { // Проверяем на явное true
                // Если промпт был сохранен, мы возвращаем OK, блокируя завершение Worker'а, 
                // пока запись в KV не завершится (благодаря await внутри processTextMessage).
                return new Response('OK', { status: 200 }); 
            } else {
                // 2. Иначе, это обычный чат. Его можно безопасно отправить в фон.
                // ВНИМАНИЕ: Если processTextMessage возвращает false, 
                // то это обычная чат-логика (п. 2 в функции).
                ctx.waitUntil(processTextMessage(chatId, messageText, envData));
                return new Response('OK', { status: 200 });
            }
        }

        // Игнорируем остальные обновления (например, стикеры, pin-сообщения)
        return new Response('OK', { status: 200 });
    },
};