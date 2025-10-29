// Worker для Cloudflare: Мультимодальный Telegram-бот "Gemini AI" by Leshiy

// ----------------------------------------------------
// --- I. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ TELEGRAM и КОНВЕРТАЦИИ ---
// ----------------------------------------------------

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

// ? getPromptKeyboard - Генерирует Inline-клавиатуру для промпта
function getPromptKeyboard() {
    return {
        inline_keyboard: [
            [
                // Кнопка, переводящая в режим ожидания нового текста
                { text: "?? Редактировать промпт", callback_data: `edit_prompt` },
                // Кнопка, запускающая автоматическую перегенерацию промпта (имитация старого /retry)
                { text: "?? Перегенерировать автоматически", callback_data: `regenerate_prompt` },
            ],
            [
                { text: "? Улучшить фото (/photo)", callback_data: 'cmd:/photo' },
                { text: "?? Создать новое (/create)", callback_data: 'cmd:/create_empty' },
            ]
        ],
    };
}

// ? displayPromptMenu: Показывает меню промпта
async function displayPromptMenu(chatId, promptText, TELEGRAM_BOT_TOKEN) {
    const keyboard = {
        inline_keyboard: [
            [{ text: "?? Редактировать промпт", callback_data: "edit_prompt" }, { text: "? Сгенерировать (ещё раз)", callback_data: "create_command" }],
            [{ text: "?? Улучшить фото", callback_data: "photo_command" }]
        ]
    };
    await sendMessage(chatId, `**Ваш последний промпт:**\n\n${promptText}\n\nЧто дальше?`, TELEGRAM_BOT_TOKEN, keyboard);
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

// --- ИСПРАВЛЕННЫЕ И БЕЗОПАСНЫЕ Base64 ХЕЛПЕРЫ ---

// ?? ИСПРАВЛЕНО: Более надежная конвертация ArrayBuffer в Base64 с помощью TextDecoder
function arrayBufferToBase64(buffer) {
    // Используем TextDecoder для преобразования ArrayBuffer в бинарную строку (ISO-8859-1)
    const binary = new TextDecoder('iso-8859-1').decode(buffer); 
    
    // Проверка на случай, если buffer был пуст
    if (binary.length === 0) {
        throw new Error("Конвертация: ArrayBuffer вернул пустую бинарную строку.");
    }
    
    // Преобразование бинарной строки в Base64
    return btoa(binary);
}

// ?? Более безопасное декодирование
function base64ToUint8Array(base64) {
    // Убираем потенциальные пробелы и переносы
    const cleanBase64 = base64.replace(/\s/g, ''); 
    // atob не справляется с очень большими строками, но это стандартный метод для Cloudflare Workers
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    
    // Если binaryString пуст, значит, atob не справился или Base64 был пуст/некорректен.
    if (len === 0) {
        // Мы НЕ ДОЛЖНЫ возвращать пустой массив, если input был не пуст, 
        // но для защиты от ошибки file must be non-empty - это хорошо.
        return new Uint8Array(0); 
    }
    
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// Отправка файла, закодированного в Base64, как фотографии 
async function sendPhotoFromBase64(chatId, base64Image, token, caption = "", env) {
    const arrayBuffer = base64ToUint8Array(base64Image);
    const blob = new Blob([arrayBuffer], { type: 'image/png' }); 
    const finalCaption = caption.length > 1000 ? caption.substring(0, 997) + '...' : caption;
    
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', blob, 'image.png'); 
    if (finalCaption) { 
        formData.append('caption', finalCaption); 
        formData.append('parse_mode', 'Markdown'); // Добавляем parse_mode для Markdown в подписи
    }

    const url = `https://api.telegram.org/bot${token}/sendPhoto`;
    
    // !!! КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ URL !!!
    if (env && env.BOT_LOGS_STORAGE) {
        // Вызываем logDebug с URL
        await logDebug('DEBUG_PHOTO_URL', `Attempting sendPhoto to: ${url.replace(token, '[TOKEN_REDACTED]')}`, env);
    }
    
    const response = await fetch(url, { method: 'POST', body: formData });
    
    if (!response.ok) {
        const errorText = await response.text();
        const errorMsg = `Telegram sendPhoto failed: ${response.status} - ${errorText.substring(0, 150)}`;
        
        if (env && env.BOT_LOGS_STORAGE) {
            await logDebug('ERROR_PHOTO_FAIL', errorMsg, env);
        }
        
        throw new Error(errorMsg);
    }
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

// *** 2.3. ??? callWorkersAITextToImage - Генерирует изображение через Cloudflare Workers AI (AI Binding)
async function callWorkersAITextToImage(prompt, envData) {
    const aiBinding = envData.AI; 

    if (!aiBinding) {
        throw new Error("? Ошибка Worker AI: Привязка 'AI' не найдена.");
    }

    // !! Возвращаем рабочий ID !!
    const model = "@cf/bytedance/stable-diffusion-xl-lightning"; 
    
    const inputs = {
        prompt: prompt
        // width: 512,
        // height: 512,
        // num_steps: 10 
    };

    let response;
    try {
        // 3. Вызываем AI Binding
        response = await aiBinding.run(model, inputs);
    } catch (e) {
        throw new Error(`Workers AI: Критическая ошибка вызова AI.run() - ${e.message}`);
    }

    const arrayBuffer = response;
    
    // !!! КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: ПРОВЕРКА НА NULL/UNDEFINED !!!
    if (arrayBuffer === null || arrayBuffer === undefined) {
         throw new Error("Workers AI вернул NULL/UNDEFINED. Вероятно, превышены лимиты или внутренняя ошибка сервиса.");
    }
    // !!! КОНЕЦ КРИТИЧЕСКОГО ИСПРАВЛЕНИЯ !!!

    // 4.1. Если это ArrayBuffer и он не пуст - отлично, продолжаем.
    if (arrayBuffer instanceof ArrayBuffer && arrayBuffer.byteLength > 0) {
        // 5. Преобразуем ArrayBuffer в Base64 (Используем ваш исправленный TextDecoder-метод)
        const base64Image = arrayBufferToBase64(arrayBuffer);
        return base64Image;
    }
    
    // 4.2. Если это не ArrayBuffer или он пуст, пытаемся прочитать как ошибку JSON
    let errorMessage = `Тип: ${typeof arrayBuffer}, Длина: ${arrayBuffer?.byteLength || 0}.`;
    
    try {
        // Если это не ArrayBuffer, это может быть JSON-ответ об ошибке.
        if (typeof arrayBuffer === 'object' && arrayBuffer.byteLength > 0) { 
             const decoder = new TextDecoder("utf-8");
             // ИСПОЛЬЗУЕМ БЕЗОПАСНУЮ ПРОВЕРКУ: arrayBuffer instanceof ArrayBuffer
             if (arrayBuffer instanceof ArrayBuffer) {
                const errorText = decoder.decode(arrayBuffer);
                if (errorText.length > 0) {
                    errorMessage = `Workers AI вернул ошибку: ${errorText.substring(0, 300)}`;
                }
             }
        }
        
    } catch (decodeError) {
        errorMessage += ` (Ошибка декодирования: ${decodeError.message})`;
    }
    
    // 4.3. Бросаем ошибку
    throw new Error(`Workers AI вернул некорректный ответ. ${errorMessage}.`);
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
 * Вызывает модель Mistral-7B через Workers AI для генерации ответа в чате.
 * * @param {Array<Object>} chatHistory - История чата в формате { role: 'user' | 'model', text: string }.
 * @param {string} userMessageText - Текущее сообщение пользователя.
 * @param {Object} envData - Объект окружения Cloudflare Worker, содержащий привязку AI.
 * @returns {Promise<string>} Сгенерированный текстовый ответ.
 */
async function callWorkersAIChat(chatHistory, userMessageText, envData) {
    // Теперь переменная, которую мы используем, - это envData
    const { AI } = envData; // <--- Теперь мы ищем AI в envData!

    if (!AI) {
        throw new Error("Workers AI binding 'AI' не настроен. Проверьте wrangler.toml.");
    }
    
    // Преобразуем историю в формат Workers AI messages:
    // 'model' в вашем коде соответствует 'assistant' в API Workers AI.
    const messages = chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant', 
        content: msg.text
    }));

    // Добавляем текущее сообщение пользователя
    messages.push({ role: 'user', content: userMessageText });

    // Новая, стабильная модель: Llama 3 8B
    const modelName = "@cf/meta/llama-3-8b-instruct";
    
    try {
        const response = await AI.run(modelName, { messages });

        if (!response || !response.response) {
            // Если ответ пуст или некорректен, логируем и выбрасываем ошибку
            throw new Error(`Workers AI не вернул ожидаемый ответ. Response: ${JSON.stringify(response)}`);
        }

        // Возвращаем чистый текст
        return response.response.trim();
    } catch (e) {
        console.error("Workers AI call failed:", e);
        throw new Error(`Ошибка Workers AI: ${e.message}`);
    }
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

// ? processStopCommand (Очистка KV)
async function processStopCommand(chatId, LAST_PHOTO_STORAGE, VEO_POLL_STORAGE, TELEGRAM_BOT_TOKEN) {
    const chatKey = chatId.toString();
    
    // --- Ключи, которые НЕЛЬЗЯ УДАЛЯТЬ ---
    const BALANCE_KEY = chatKey + '_photo_balance'; // Ключ баланса
    
    // --- Список ключей для очистки ---
    const keysToDelete = [
        chatKey + '_prompt',            // Последний промпт
        chatKey + '_base64_image',      // Последнее обработанное изображение
        chatKey + '_user_state',        // Режим редактирования промпта
        // ... (добавьте сюда другие ключи, которые вы храните, например, для /video) ...
    ];
    try {
        // Удаляем данные, которые нужны только для текущей сессии
        for (const key of keysToDelete) {
            await LAST_PHOTO_STORAGE.delete(key);
        }

        // Если у вас есть VEO_POLL_STORAGE, удалите и его данные
        // await VEO_POLL_STORAGE.delete(chatKey); 
        
        // Если баланс хранится в LAST_PHOTO_STORAGE, 
        // МЫ ЕГО ЯВНО НЕ УДАЛЯЕМ, оставляя его там.
        await sendMessage(chatId, "?? **Хранилище очищено!**\nВсе сохраненные данные удалены.\nБот остановлен.", TELEGRAM_BOT_TOKEN);
    } catch (e) {
        await sendMessage(chatId, `? Ошибка при очистке хранилища: <code>${e.message}</code>`, TELEGRAM_BOT_TOKEN);
    }
}

// ? processTextMessage (Текстовый чат с историей + Логика редактирования/создания промпта)
async function processTextMessage(chatId, messageText, env) {
    const { TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, CHAT_HISTORY_STORAGE, LAST_PHOTO_STORAGE } = env; 
    const chatKey = chatId.toString();
    
    // --- Константы, которые должны быть определены в Секции IV или в начале файла ---
    const USER_STATE_KEY = chatKey + '_user_state';
    const STATE_AWAITING_PROMPT_EDIT = 'awaiting_prompt_edit';
    const STATE_AWAITING_NEW_PROMPT = 'awaiting_new_prompt'; 
    const LAST_PROMPT_KEY = chatKey + '_prompt';

    // 1. ПЕРЕХВАТ: Режим редактирования ИЛИ создания промпта
    const userState = await LAST_PHOTO_STORAGE.get(USER_STATE_KEY);

    if (userState === STATE_AWAITING_PROMPT_EDIT || userState === STATE_AWAITING_NEW_PROMPT) {
        // 1.1. Сбрасываем состояние
        await LAST_PHOTO_STORAGE.delete(USER_STATE_KEY); 
        
        // 1.2. Сохраняем новый промпт
        const newPrompt = messageText.trim();
        await LAST_PHOTO_STORAGE.put(LAST_PROMPT_KEY, newPrompt, { expirationTtl: 3600 });
        
        // 1.3. Сообщение о сохранении (Единообразно для обоих случаев)
        // Определяем, что произошло: редактирование или создание/сохранение
        const actionText = (userState === STATE_AWAITING_PROMPT_EDIT) ? "отредактирован" : "сохранен";
        
        await sendMessage(chatId, 
            `? **Промпт ${actionText}!**\n\n` +
            `Нажмите кнопку **"?? Создать картинку"** или используйте команду \`/create\` для генерации.`,
            TELEGRAM_BOT_TOKEN
        );
        
        return; // Блокируем дальнейшую обработку чата
    }
    
    // 2. ОБЫЧНЫЙ ЧАТ
    let history;
    try {
        const historyData = await CHAT_HISTORY_STORAGE.get(chatKey, { type: 'json' });
        // Проверка, что история — это массив (для защиты от поврежденных данных)
        if (Array.isArray(historyData)) {
            history = historyData;
        } else {
            history = []; 
        }
    } catch (e) {
        console.error("Error retrieving chat history:", e);
        history = []; 
    }
    // --- !!! ЭТОТ БЛОК ДОЛЖЕН БЫТЬ ПЕРЕД try { !!! ---
    const workingMessageResponse = await sendMessage(chatId, "? *Думаю...*", TELEGRAM_BOT_TOKEN);
    const workingMessageId = workingMessageResponse.result.message_id;
    try {
        // !!! ИСПОЛЬЗУЕМ Workers AI !!!
        // Обратите внимание: теперь мы передаем весь объект env (env) вместо только ключа API (GEMINI_API_KEY)
        const modelResponse = await callWorkersAIChat(history, messageText, env); 
        
        // const modelResponse = await callGeminiChat(history, messageText, GEMINI_API_KEY); // <-- Оригинальная строка Gemini (можно закомментировать)
        
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
}

// ? processPromptCommand (Обрабатывает /prompt)
async function processPromptCommand(chatId, TELEGRAM_BOT_TOKEN, LAST_PHOTO_STORAGE) {
    const chatKey = chatId.toString();
    const promptKey = chatKey + '_prompt'; 
    
    const lastPrompt = await LAST_PHOTO_STORAGE.get(promptKey);

    let actionButtons = [];
    let messageText = "";

    if (lastPrompt) {
        // --- ПРОМПТ СУЩЕСТВУЕТ (Полный набор опций) ---
        actionButtons = [
            [
                { text: "?? Редактировать", callback_data: `edit_prompt` },        // Редактировать (уже существующий)
                { text: "?? Перегенерировать", callback_data: `regenerate_prompt` }, // Перегенерировать (из существующего фото)
            ],
            // Сюда добавим опцию создания с нуля:
            // [{ text: "?? Создать новый промпт", callback_data: 'create_new_prompt' }], // Создать (новый с нуля)
            [{ text: "?? Создать картинку (/create)", callback_data: 'cmd:/create_empty' }],
            [{ text: "? Улучшить фото (/photo)", callback_data: 'cmd:/photo' }],
        ];

        messageText = `
        ? **Ваш последний сохраненный промпт:**
        
        <code>${lastPrompt}</code>
        
        Что вы хотите сделать с этим промптом?
        `;
       
    } else {
        // --- ПРОМПТА НЕТ (Только опции создания промпта и запуска /create) ---
        actionButtons = [
            [
                { text: "?? Создать новый промпт", callback_data: 'create_new_prompt' },         // Активирует режим ввода промпта
                { text: "?? Перегенерировать", callback_data: `regenerate_prompt` } // Активирует режим ожидания фото для промпта
            ],
                // Кнопка для запуска /create (чтобы пользователь мог создать картинку после того, как введет промпт)
                [{ text: "?? Создать картинку (/create)", callback_data: 'cmd:/create_empty' }],
                [{ text: "? Улучшить фото (/photo)", callback_data: 'cmd:/photo' }],
            ];
            messageText = `
    ?? **Промпт для работы не найден.**
        
    Сначала нужно получить промпт. Вы можете:
1. Нажать **'Создать НОВЫЙ промпт'** и ввести текст.
2. Нажать **'Сгенерировать автоматически'** и отправить фото.
    Выберите действие ниже:
    `;
        }    
    const keyboard = { inline_keyboard: actionButtons };
    
    await sendMessage(chatId, messageText, TELEGRAM_BOT_TOKEN, null, keyboard); 
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

// ? processCreateCommand (Text-to-Image через Workers AI)
// ИСПРАВЛЕНИЕ: Удалена переменная `model` из строки ошибки (Шаг 1)
async function processCreateCommand(chatId, userProvidedPrompt, TELEGRAM_BOT_TOKEN, _GEMINI_API_KEY_UNUSED, LAST_PHOTO_STORAGE, envData) {
    
    const chatKey = chatId.toString();
    const promptKey = chatKey + '_prompt';
    let loadingMessage = {}; 
    let finalPrompt;

    // --- (Код определения промпта опущен, предполагаем, что он работает) ---
    if (userProvidedPrompt && userProvidedPrompt.trim().length > 0) {
        finalPrompt = userProvidedPrompt.trim();
    } else {
        finalPrompt = await LAST_PHOTO_STORAGE.get(promptKey); 
    }
    
    if (!finalPrompt) {
        await sendMessage(chatId, "?? **Внимание:** Для команды `/create` нужен промпт...", TELEGRAM_BOT_TOKEN);
        return;
    }
    
    await LAST_PHOTO_STORAGE.put(promptKey, finalPrompt, { expirationTtl: 3600 }); 
    loadingMessage = await sendMessage(chatId, `? **Запускаю генерацию изображения через Workers AI...**\nПромпт: <code>${finalPrompt}</code>`, TELEGRAM_BOT_TOKEN);
    if (!loadingMessage.ok || !loadingMessage.result || !loadingMessage.result.message_id) return;
    const workingMessageId = loadingMessage.result.message_id;

    try {
        // 4. Вызов функции генерации
        const generatedBase64Image = await callWorkersAITextToImage(finalPrompt, envData); 
        
        // 5. Критическая проверка: изображение должно быть достаточно большим
        if (!generatedBase64Image || generatedBase64Image.length < 1024) { 
             throw new Error("Workers AI вернул недопустимо малое изображение. Длина Base64: " + (generatedBase64Image?.length || 0));
        }

        // --- (Код сохранения и отправки изображения опущен, он работает) ---
        const videoData = { prompt: finalPrompt, imageBase64: generatedBase64Image };
        await LAST_PHOTO_STORAGE.put(chatKey + '_generated_base64_image', JSON.stringify(videoData), { expirationTtl: 3600 });
        
        const caption = `?? *Ваша картинка по промпту:*\n\`${finalPrompt}\``;
        await sendPhotoFromBase64(chatId, generatedBase64Image, envData.TELEGRAM_BOT_TOKEN, caption, envData); 
        
        await editMessage(chatId, workingMessageId, "? **Готово!** Ваша картинка по текстовому описанию (Workers AI).", TELEGRAM_BOT_TOKEN);
        
    } catch (error) {
        
        const errorMessage = error.message || "Неизвестная ошибка";
        
        // 1. Пытаемся удалить сообщение "Генерация..."
        if (loadingMessage && loadingMessage.result && loadingMessage.result.message_id) {
            await deleteMessage(chatId, loadingMessage.result.message_id, envData.TELEGRAM_BOT_TOKEN);
        }

        // --- КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: ПРОВЕРКА ЛИМИТОВ ---
        if (errorMessage.includes("Тип: object, Длина: 0.") || errorMessage.includes("NULL/UNDEFINED")) {
            const limitErrorMsg = `
            ? **ОШИБКА ГЕНЕРАЦИИ (ЛИМИТ)**
            
            Workers AI вернул пустой ответ (NULL/0 байт). Это стандартный признак **превышения бесплатных лимитов** или **региональной блокировки**.
            
            Пожалуйста, проверьте в панели Cloudflare:
            1. Доступность модели для генерации изображений.
            2. Лимиты использования Workers AI (Usage / Analytics).
            
            Использование: \`/create\` временно остановлено.
            `;
            await sendMessage(chatId, limitErrorMsg, envData.TELEGRAM_BOT_TOKEN);
            
            // Заменяем админ-отчет на чистую ошибку
            await sendAdminReport(chatId, `Workers AI: Лимит исчерпан. (RAW: ${errorMessage})`, envData);
            return;
        }
        
        // --- (Остальной код админ-отчета опущен) ---
        await sendAdminReport(chatId, errorMessage, envData);
    }
}

// ? sendAdminReport - Отправляет отформатированный отчет об ошибке администратору
async function sendAdminReport(chatId, errorMessage, envData) {
    if (chatId.toString() === envData.ADMIN_CHAT_ID.toString()) {
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
 * @description Обрабатывает команду улучшения фото (/photo), проверяет баланс (накопительный / VIP), 
 * устанавливает блокировку, списывает кредит и вызывает генерацию. В случае сбоя возвращает кредит.
 */
async function processPhotoCommand(chatId, TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, LAST_PHOTO_STORAGE) {
    const chatKey = chatId.toString();
    const promptKey = chatKey + '_prompt';
    const originalImageBase64Key = chatKey + '_base64_image';
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
    const originalImageBase64 = await LAST_PHOTO_STORAGE.get(originalImageBase64Key);
    
    if (!userDefinedPrompt || !originalImageBase64) {
        await sendMessage(chatId, `?? **Внимание:** Сначала получите промпт, отправив фотографию.`, TELEGRAM_BOT_TOKEN);
        return;
    }

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
    await sendMessage(chatId, 
        `?? **Важное замечание:** Функция улучшения фото (команда /photo) иногда не может исправить неверную ориентацию (поворот) изображения. Сгенерированное фото возможно сохранит поворот оригинала.`, 
        TELEGRAM_BOT_TOKEN
    );
    
    // 4. Формируем промпт и запускаем генерацию
    const improvementPrompt = `
        Улучши качество прикрепленного изображения:
        1. **Цветность:** Сделай его цветным, если оно черно-белое.
        2. **Разрешение:** Повысь разрешение до студийного качества, детализируй.
        3. **Сохранение:** Сохрани оригинального субъекта, композицию и атмосферу. Не изменяй радикально содержание.
        4. **Описание сюжета:** ${userDefinedPrompt}.
        Фокусируйся на реализме и естественных цветах.
    `;

    const workingMessageResponse = await sendMessage(chatId, "? **Запускаю улучшение изображения...**", TELEGRAM_BOT_TOKEN);
    const workingMessageId = workingMessageResponse.ok ? workingMessageResponse.result.message_id : null;

    try {
        if (workingMessageId) await editMessage(chatId, workingMessageId, "? ** Отправляю на генерацию...", TELEGRAM_BOT_TOKEN);
        
        // ВЫЗОВ API: Здесь может произойти сбой
        const generatedBase64Image = await callGeminiImageGenerator(improvementPrompt, originalImageBase64, GEMINI_API_KEY); 
        
        const imageData = { 
            prompt: improvementPrompt,
            imageBase64: generatedBase64Image
        };
        
        await LAST_PHOTO_STORAGE.put(chatKey + '_last_generated_image', JSON.stringify(imageData), { expirationTtl: 3600 });
        
        if (workingMessageId) await editMessage(chatId, workingMessageId, "? ** Изображение сгенерировано.", TELEGRAM_BOT_TOKEN);
        
        // Отправка финального изображения
        await sendPhotoFromBase64(chatId, generatedBase64Image, TELEGRAM_BOT_TOKEN, ""); 
        
        if (workingMessageId) await editMessage(chatId, workingMessageId, `? **Готово!** Ваша улучшенная фотография.`, TELEGRAM_BOT_TOKEN);
        
    } catch (e) {
        // --- !!! ОБРАБОТКА ОШИБКИ И ВОЗВРАТ КРЕДИТА !!! ---
        const safeErrorMessage = e.message || 'Неизвестная ошибка: Проверьте логи Cloudflare.';
        console.error(`Критическая ошибка при улучшении изображения:`, safeErrorMessage);
        
        let errorMessage = `? Критическая ошибка Gemini: ${safeErrorMessage}.`;
        
        if (!isVIP) {
            // Возвращаем баланс, который был до списания (только если не VIP)
            await LAST_PHOTO_STORAGE.put(BALANCE_KEY, balanceBeforeCharge.toString(), { expirationTtl: 3600 * 24 * 365 });
            errorMessage += `\n\n? **Кредит (${balanceBeforeCharge} фото) возвращен** из-за ошибки генерации.`;
        }

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

// ? processVoiceMessageAsync (Обработка голосовых сообщений)
async function processVoiceMessageAsync(chatId, voiceFileId, mimeType, env) {
    const { TELEGRAM_BOT_TOKEN, GEMINI_API_KEY } = env; 
    let workingMessageId = null; 

    try {
        const workingMessageResponse = await sendMessage(chatId, "? **Анализирую голосовое сообщение...**", TELEGRAM_BOT_TOKEN);
        if (workingMessageResponse.ok && workingMessageResponse.result) {
            workingMessageId = workingMessageResponse.result.message_id;
        }

        await editMessage(chatId, workingMessageId, "? ** Скачиваю аудио...", TELEGRAM_BOT_TOKEN);
        
        // 1. Скачивание аудиофайла
        const filePath = await getTelegramFilePath(voiceFileId, TELEGRAM_BOT_TOKEN);
        const audioBuffer = await downloadTelegramFile(filePath, TELEGRAM_BOT_TOKEN);
        if (!audioBuffer) { throw new Error("Не удалось скачать аудиофайл с Telegram."); }
        const audioBase64 = arrayBufferToBase64(audioBuffer);

        await editMessage(chatId, workingMessageId, "? ** Распознаю аудио...", TELEGRAM_BOT_TOKEN);
        
        // 2. Транскрибация
        const transcribedText = await callGeminiSpeechToText(audioBase64, mimeType, GEMINI_API_KEY);
        
        await editMessage(chatId, workingMessageId, "? ** Транскрипция завершена. Отправляю в чат...", TELEGRAM_BOT_TOKEN);

        // 3. Передача транскрибированного текста в чат-обработчик
        // Сначала удаляем временное сообщение, чтобы избежать дублирования
        // (Мы не хотим видеть "? Готово!" в новом месте)
        await deleteMessage(chatId, workingMessageId, TELEGRAM_BOT_TOKEN);
        
        // Отправляем транскрибированный текст, чтобы пользователь видел, что распозналось
        await sendMessage(chatId, `?? *Распознано:*\n${transcribedText}`, TELEGRAM_BOT_TOKEN);
        
        // Теперь запускаем обработчик чата с транскрибированным текстом
        // Используем ctx.waitUntil, чтобы не блокировать основной поток
        await processTextMessage(chatId, transcribedText, env);
        
    } catch (e) {
        console.error("Критическая ошибка при обработке голосового сообщения:", e.message);
        const errorMessage = `? Критическая ошибка при обработке аудио: ${e.message}.`;
        if (workingMessageId) {
            await editMessage(chatId, workingMessageId, errorMessage, TELEGRAM_BOT_TOKEN);
        } else {
            await sendMessage(chatId, errorMessage, TELEGRAM_BOT_TOKEN);
        }
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
        const callback = update.callback_query;

        if (message) {
            chatId = message.chat.id;
            messageText = message.text || '';
            isPhoto = message.photo && message.photo.length > 0;
            isVoice = message.voice && message.voice.file_id;
        } else if (callback) {
            chatId = callback.from.id;
        }

        if (chatId === null) { return new Response('OK', { status: 200 }); }

        const envData = { 
            TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN, 
            GEMINI_API_KEY: env.GEMINI_API_KEY, 
            LAST_PHOTO_STORAGE: env.LAST_PHOTO_STORAGE,
            VEO_POLL_STORAGE: env.VEO_POLL_STORAGE,
            CHAT_HISTORY_STORAGE: env.CHAT_HISTORY_STORAGE,
            DEBUG_CHAT_ID: env.DEBUG_CHAT_ID,
            ADMIN_CHAT_ID: env.ADMIN_CHAT_ID, 
            BOT_LOGS_STORAGE: env.BOT_LOGS_STORAGE,
            AI: env.AI,
        };

        // Вспомогательные константы для админ-режима
        const ADMIN_STATE_AWAITING_ID = 'admin_awaiting_id';
        const ADMIN_STATE_AWAITING_AMOUNT = 'admin_awaiting_amount'; // <-- НОВЫЙ СТЕЙТ
        const ADMIN_STATE_KEY = 'admin_state_' + chatId; // Ключ для стейта админа
        const ADMIN_TEMP_ID_KEY = 'admin_temp_id_' + chatId; // Ключ для временного хранения ID

        // Вспомогательные константы для колбэков
        const USER_STATE_KEY_SUFFIX = '_user_state';
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
                    ctx.waitUntil(processStopCommand(chatId, envData.LAST_PHOTO_STORAGE, envData.VEO_POLL_STORAGE, envData.TELEGRAM_BOT_TOKEN));
                    break;
                case '/prompt': 
                    ctx.waitUntil(processPromptCommand(chatId, envData.TELEGRAM_BOT_TOKEN, envData.LAST_PHOTO_STORAGE));
                    break;
                case '/create':
                    const createPrompt = messageText.replace(/^\/create\s*/i, '').trim(); 
                    // ? ИСПРАВЛЕНО: Добавлен envData шестым аргументом!
                    ctx.waitUntil(processCreateCommand(chatId, createPrompt, envData.TELEGRAM_BOT_TOKEN, envData.GEMINI_API_KEY, envData.LAST_PHOTO_STORAGE, envData));
                    break;
                case '/photo':
                    ctx.waitUntil(processPhotoCommand(chatId, envData.TELEGRAM_BOT_TOKEN, envData.GEMINI_API_KEY, envData.LAST_PHOTO_STORAGE));
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
        if (isVoice) {
            const voiceFileId = message.voice.file_id;
            const mimeType = message.voice.mime_type || 'audio/ogg'; 
            
            ctx.waitUntil(processVoiceMessageAsync(chatId, voiceFileId, mimeType, envData));
            return new Response('OK', { status: 200 });
        }

        if (isPhoto) {
            const fileIdToProcess = message.photo.pop().file_id; 
            ctx.waitUntil(processImageAsync(chatId, fileIdToProcess, envData.TELEGRAM_BOT_TOKEN, envData.GEMINI_API_KEY, envData.LAST_PHOTO_STORAGE));
            return new Response('OK', { status: 200 });
        }

        // 3. ОБРАБОТКА НАЖАТИЯ INLINE-КНОПОК (callback_query)
        if (callback) {
            const data = callback.data;
            const messageId = callback.message.message_id;
            const chatKey = chatId.toString();
            
            // 1. ОБЯЗАТЕЛЬНО: Отвечаем на колбэк, чтобы убрать часы на кнопке!
            ctx.waitUntil(answerCallbackQuery(callback.id, "Обработка команды...", envData.TELEGRAM_BOT_TOKEN));
            
        // 2. ЛОГИКА ДЛЯ ПОЛЬЗОВАТЕЛЬСКИХ КОМАНД (Начинаются с 'cmd:/')
        if (data.startsWith('cmd:/')) {
            const command = data.substring(5).trim(); 

            // Определяем, нужно ли удалять сообщение. 
            // Сообщение НЕ удаляется, если это /start, чтобы меню оставалось
            const isStartMenuCommand = command === 'photo' || command === 'create_empty' || command === 'prompt' || command === 'stop';
            
            // Если колбэк пришел из сообщения, которое НЕ является стартовым меню, или если это не cmd-команда
            if (!isStartMenuCommand) {
                // Удаляем сообщение с кнопками (для команд, не из /start)
                ctx.waitUntil(deleteMessage(chatId, messageId, envData.TELEGRAM_BOT_TOKEN)); 
            }
            
            switch (command) {
                case 'photo':
                    ctx.waitUntil(processPhotoCommand(chatId, envData.TELEGRAM_BOT_TOKEN, envData.GEMINI_API_KEY, envData.LAST_PHOTO_STORAGE));
                    break;
                case 'prompt': 
                    ctx.waitUntil(processPromptCommand(chatId, envData.TELEGRAM_BOT_TOKEN, envData.LAST_PHOTO_STORAGE));
                    break;
                case 'create_empty':
                    // ? ИСПРАВЛЕНО: Добавлен envData шестым аргументом!
                    ctx.waitUntil(processCreateCommand(chatId, '', envData.TELEGRAM_BOT_TOKEN, envData.GEMINI_API_KEY, envData.LAST_PHOTO_STORAGE, envData));
                    break;
                case 'stop':
                    ctx.waitUntil(processStopCommand(chatId, envData.LAST_PHOTO_STORAGE, envData.VEO_POLL_STORAGE, envData.TELEGRAM_BOT_TOKEN));
                    break;
                case 'retry': 
                    ctx.waitUntil(sendMessage(chatId, 'Кнопка `/retry` устарела. Используйте `/prompt` или кнопки выше.', envData.TELEGRAM_BOT_TOKEN));
                    break;
                default:
                    ctx.waitUntil(sendMessage(chatId, `Команда по кнопке не найдена. Получено: ${command}`, envData.TELEGRAM_BOT_TOKEN));
                    break;
            }
            return new Response('OK', { status: 200 });
        }

            // 3. ЛОГИКА ДЛЯ ФУНКЦИЙ РЕДАКТИРОВАНИЯ/СОЗДАНИЯ ПРОМПТА
            if (data === 'edit_prompt') {
                // Переводим пользователя в режим ожидания нового текста для РЕДАКТИРОВАНИЯ
                const USER_STATE_KEY = chatKey + USER_STATE_KEY_SUFFIX;
                await env.LAST_PHOTO_STORAGE.put(USER_STATE_KEY, STATE_AWAITING_PROMPT_EDIT, { expirationTtl: 300 }); 
                
                 ctx.waitUntil(sendMessage(chatId, 
                    "**?? Редактирование промпта.**\n\n" +
                    "Введите новый текст, чтобы заменить текущий. После сохранения промпта используйте **'Создать картинку /create'**.", 
                    envData.TELEGRAM_BOT_TOKEN
                ));
            } else if (data === 'create_new_prompt') {
                // Переводим пользователя в режим ожидания нового текста для СОЗДАНИЯ С НУЛЯ
                const USER_STATE_KEY = chatKey + USER_STATE_KEY_SUFFIX;
                await env.LAST_PHOTO_STORAGE.put(USER_STATE_KEY, STATE_AWAITING_NEW_PROMPT, { expirationTtl: 300 }); 
                
                ctx.waitUntil(sendMessage(chatId, 
                    "**?? Введите новый промпт**\n\n" +
                    "Введите текстом всё что хотите вообразить а я сохраню эту информацию, и при нажатии кнопки **'Создать картинку /create'** попытаюсь воплотить Вашу фантазию в виде изображения.", 
                    envData.TELEGRAM_BOT_TOKEN
                ));
            } else if (data === 'regenerate_prompt') {
                // Запуск автоматической перегенерации (логика старого /retry)
                ctx.waitUntil(processRetryLogic(chatId, envData.TELEGRAM_BOT_TOKEN, envData.GEMINI_API_KEY, envData.LAST_PHOTO_STORAGE));
            }

            // 4. ЛОГИКА ДЛЯ АДМИН-КОМАНД (Начинаются с 'admin_')
            if (data.startsWith('admin_')) {
                // Проверяем, является ли пользователь администратором
                if (chatId.toString() !== envData.ADMIN_CHAT_ID.toString()) {
                    ctx.waitUntil(sendMessage(chatId, "? Вы не можете использовать эти админ-функции.", envData.TELEGRAM_BOT_TOKEN));
                    return new Response('OK', { status: 200 });
                }
                
                // Удаляем сообщение с кнопками перед обработкой админ-действия
                // ctx.waitUntil(deleteMessage(chatId, messageId, envData.TELEGRAM_BOT_TOKEN));

                const ADMIN_STATE_KEY = chatKey + '_admin_state'; // chatKey - это adminChatId
                const STATE_AWAITING_ID = 'admin_awaiting_id';
                
                if (data === 'admin_activate') {
                    // Устанавливаем стейт ожидания ID
                    await env.LAST_PHOTO_STORAGE.put(ADMIN_STATE_KEY, STATE_AWAITING_ID, { expirationTtl: 600 }); 
                    
                    ctx.waitUntil(sendMessage(chatId, 
                        "? **ВЫ В РЕЖИМЕ АКТИВАЦИИ БАЛАНСА**\n\n" +
                        "Пожалуйста, отправьте мне **Telegram ID** пользователя, для которого нужно сгенерировать команду активации." +
                        "\nВ помощь можно использовать бот:\n??Userinfo|Get id|IDBot @UserInfoToBot" +
                        "\n\n(Режим автоматически отключится через 10 минут)", 
                        envData.TELEGRAM_BOT_TOKEN
                    ));
                    
                } else if (data === 'admin_debug') {
                    ctx.waitUntil(processDebugCommand(chatId, envData));
                    } else if (data === 'admin_update_cmds') {
                                        
                    // --- !!! ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ ДЛЯ КНОПКИ !!! ---
                    // 1. Убираем удаление сообщения.
                    // 2. Выполняем API-вызовы напрямую с await для надежности.
                                        
                    const resultPublic = await setBotCommands(envData.TELEGRAM_BOT_TOKEN, PUBLIC_COMMANDS, 'default');
                    const resultAdmin = await setBotCommands(envData.TELEGRAM_BOT_TOKEN, ADMIN_COMMANDS, 'chat', envData.ADMIN_CHAT_ID);
                                        
                    let message = "? **Команды обновлены!**\n\n";
                    message += `**Публичные (default) для всех:** ${resultPublic.ok ? 'Успех' : `Ошибка: ${resultPublic.description || 'Нет ответа от API'}`}\n`;
                    message += `**Администраторские (chat ID ${envData.ADMIN_CHAT_ID}):** ${resultAdmin.ok ? 'Успех' : `Ошибка: ${resultAdmin.description || 'Нет ответа от API'}`}`;
                                        
                    await sendMessage(chatId, message, envData.TELEGRAM_BOT_TOKEN);
                    // --- КОНЕЦ ФИНАЛЬНОГО ИСПРАВЛЕНИЯ ---
                                        
                    }
                }
            
            // Возвращаем OK для всех обработанных нажатий.
            return new Response('OK', { status: 200 });
        }
        // !!! КОНЕЦ БЛОКА INLINE-КНОПОК !!!

        // 4. ОБРАБОТКА ОБЫЧНОГО ТЕКСТА (ЧАТ)
        if (messageText.length > 0) {
            
            // --- 4.1. ОБРАБОТКА ИНТЕРАКТИВНОГО АДМИН-РЕЖИМА (ID, Сумма) ---
            if (chatId.toString() === envData.ADMIN_CHAT_ID.toString()) {
                const isAdminModeProcessed = await processAdminStateMessage(chatId, messageText, envData);
                if (isAdminModeProcessed) {
                    return new Response('OK', { status: 200 });
                }
            }

            // --- 4.2. ОБЫЧНАЯ ОБРАБОТКА ТЕКСТА (Для всех, кроме команд) ---
            // Сюда попадает текст, который не был командой и не был перехвачен режимом редактирования в processTextMessage.
            ctx.waitUntil(processTextMessage(chatId, messageText, envData));
            return new Response('OK', { status: 200 });
        }

        // Игнорируем остальные обновления (например, стикеры, pin-сообщения)
        return new Response('OK', { status: 200 });
    },
};