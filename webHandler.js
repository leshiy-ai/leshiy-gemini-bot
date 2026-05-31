// ============================================================
// webHandler.js — Изолированный Шлюз для Веб-фронтенда
// ============================================================
// Не трогает worker.js. Принимает JSON от фронтенда,
// вызывает функции монолита, возвращает чистый JSON.
//
// Контракт запроса:
//   { mode, auth: {provider, id, hash}, payload: {...} }
//
// Контракт ответа:
//   { success, error, credits_left, data: {type, content} }
//
// ПОДДЕРЖКА CLOUDFLARE WORKERS AI:
// Если есть CLOUDFLARE_ACCOUNT_ID и CLOUDFLARE_API_TOKEN,
// модели WORKERS_AI вызываются через REST API:
//   POST https://api.cloudflare.com/client/v4/accounts/{id}/ai/run/{model}
//   Authorization: Bearer {token}
// Это позволяет использовать Cloudflare AI с любого хостинга.
// ============================================================

/**
 * 🛑 КРИТИЧЕСКАЯ ВАЛИДАЦИЯ: Проверяет, что auth.id — реальный идентификатор,
 * а не мусор вроде "undefined", "null", пустой строки.
 * Без этого chatId в callback'ах KieAI становится "undefined".
 */
function isValidAuthId(id) {
    if (!id) return false;
    const s = String(id).trim();
    return s !== '' && s !== 'undefined' && s !== 'null' && s !== 'guest' && s !== 'NaN';
}

module.exports.handleWebRequest = async function(body, env, ctx) {
    const { mode, auth, payload } = body;

    // Привязываем контекст воркера (AI_MODELS, функции и т.д.)
    const monolith = ctx || {};

    // 🛑 СТАБ env.ctx для Yandex Cloud (worker.js использует env.ctx.waitUntil)
    if (!env.ctx) {
        env.ctx = {
            waitUntil: (promise) => { /* no-op on Yandex Cloud */ }
        };
    }

    try {
        switch (mode) {
            case 'chat':
                return await handleChat(auth, payload, env, monolith);
            case 'image':
                return await handleImage(auth, payload, env, monolith);
            case 'video':
                return await handleVideo(auth, payload, env, monolith);
            case 'audio':
                return await handleAudio(auth, payload, env, monolith);
            case 'models':
                return await handleModels(auth, env, monolith);
            case 'balance':
                return await handleBalance(auth, env, monolith);
            case 'keys':
                return await handleKeys(auth, env);
            case 'ai-config':
                return await handleAIConfig(auth, env, monolith);
            case 'admin':
                return await handleAdmin(auth, payload, env, monolith);
            case 'credit_history':
                return await handleCreditHistory(auth, env, monolith);
            case 'task_status':
                return await handleTaskStatus(auth, payload, env, monolith);
            default:
                return formatResponse(false, "Неизвестный режим: " + mode);
        }
    } catch (err) {
        console.error("[WebHandler] Error:", err.message, err.stack);
        return formatResponse(false, "Внутренняя ошибка: " + err.message);
    }
};

// ============================================================
// 🧠 ВЫБОР МОДЕЛИ — КАК В ЛЕШИЙ-АИ: БЕЗ ПОДМЕН И ФАЛБЭКОВ
// ============================================================
// Если юзер выбрал модель — используем ТОЛЬКО её.
// Если модель не выбрана — берём первую из AI_MODEL_MENU_CONFIG.
// Никаких перекрёстных подмен между сервисами!
// Все чат-модели умеют вижн, все видео2текст умеют транскрибацию,
// все аудио2текст умеют транскрибировать аудио.

/**
 * Выбирает модель для веб-запроса.
 * КАК В ТЕЛЕГРАМ-БОТЕ: никакой подмены между сервисами.
 *
 * 1. Если юзер явно указал payload.model → используем её, БЕЗ подмен
 * 2. По умолчанию — первая модель из AI_MODEL_MENU_CONFIG[serviceType]
 */
function getWebModel(serviceType, AI_MODELS, AI_MODEL_MENU_CONFIG, payloadModel, env) {
    // 1. Явный выбор юзера — ИСПОЛЬЗУЕМ КАК ЕСТЬ, без подмен
    if (payloadModel && AI_MODELS[payloadModel]) {
        return { config: AI_MODELS[payloadModel], key: payloadModel };
    }

    // 2. По умолчанию — для TEXT_TO_AUDIO приоритет VoiceRSS (бесплатно, без авторизации)
    if (serviceType === 'TEXT_TO_AUDIO') {
        if (AI_MODELS['TEXT_TO_AUDIO_VOICERSS']) {
            return { config: AI_MODELS['TEXT_TO_AUDIO_VOICERSS'], key: 'TEXT_TO_AUDIO_VOICERSS' };
        }
    }

    // 3. По умолчанию — первая модель из меню (как loadActiveConfig в телеграм-боте)
    const menuConfig = AI_MODEL_MENU_CONFIG[serviceType];
    if (menuConfig && menuConfig.models) {
        const firstKey = Object.keys(menuConfig.models)[0];
        if (firstKey && AI_MODELS[firstKey]) {
            return { config: AI_MODELS[firstKey], key: firstKey };
        }
    }

    return null;
}

/**
 * 🧠🧠 КЛЮЧЕВАЯ ФУНКЦИЯ: Находит модель ТЕГО ЖЕ СЕРВИСА для обработки вложений.
 *
 * Принцип: если юзер выбрал Gemini-чат, то и вижн/STT должны быть Gemini.
 * Если выбрал Workers AI-чат — вижн/STT тоже Workers AI.
 * НИКАКИХ ПЕРЕКРЁСТНЫХ ПОДМЕН МЕЖДУ СЕРВИСАМИ!
 *
 * @param {string} serviceType - Тип сервиса для вложения (IMAGE_TO_TEXT, AUDIO_TO_TEXT, VIDEO_TO_TEXT)
 * @param {string} chatService - Сервис чат-модели (GEMINI, WORKERS_AI, BOTHUB и т.д.)
 * @param {object} AI_MODELS - Все модели
 * @param {object} AI_MODEL_MENU_CONFIG - Конфиг меню моделей
 * @returns {{config, key}|null}
 */
function getModelForAttachmentByService(serviceType, chatService, AI_MODELS, AI_MODEL_MENU_CONFIG) {
    // 1. Ищем модель нужного типа (IMAGE_TO_TEXT/AUDIO_TO_TEXT/VIDEO_TO_TEXT)
    //    из ТЕГО ЖЕ сервиса что и чат-модель
    const menuConfig = AI_MODEL_MENU_CONFIG[serviceType];
    if (menuConfig && menuConfig.models) {
        for (const [modelKey, friendlyName] of Object.entries(menuConfig.models)) {
            const modelDetails = AI_MODELS[modelKey];
            if (modelDetails && modelDetails.SERVICE === chatService) {
                return { config: modelDetails, key: modelKey };
            }
        }
    }

    // 2. Если модель того же сервиса не найдена — берём первую из меню
    //    (это НЕ подмена — это фолбэк внутри категории)
    if (menuConfig && menuConfig.models) {
        const firstKey = Object.keys(menuConfig.models)[0];
        if (firstKey && AI_MODELS[firstKey]) {
            return { config: AI_MODELS[firstKey], key: firstKey };
        }
    }

    return null;
}

// ============================================================
// ☁️ CLOUDFLARE REST API — Вызов Workers AI через HTTP
// ============================================================
// Работает с любого хостинга (Yandex Cloud, VPS и т.д.)
// Документация: https://developers.cloudflare.com/workers-ai/rest-api/

async function callCloudflareRestAPI(modelName, requestBody, env) {
    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !apiToken) {
        throw new Error('CLOUDFLARE_ACCOUNT_ID или CLOUDFLARE_API_TOKEN не заданы');
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelName}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare API error ${response.status}: ${errorText}`);
    }

    // Проверяем Content-Type ответа
    const contentType = response.headers.get('content-type') || '';

    // Бинарный ответ (изображение, аудио)
    if (contentType.includes('image/') || contentType.includes('audio/') || contentType.includes('video/') || contentType.includes('octet-stream')) {
        const buffer = Buffer.from(await response.arrayBuffer());
        return { binary: true, data: buffer, contentType };
    }

    // JSON ответ
    const json = await response.json();
    if (!json.success && json.errors) {
        throw new Error('Cloudflare API error: ' + (json.errors[0]?.message || JSON.stringify(json.errors)));
    }
    return json;
}

/**
 * Универсальный вызов WORKERS_AI модели для веба.
 * Определяет тип модели и формирует правильный запрос к REST API.
 */
async function callWorkersAIWeb(config, ...args) {
    const modelName = config.MODEL; // e.g. '@cf/qwen/qwen2.5-coder-32b-instruct'

    // === ТЕКСТОВЫЙ ЧАТ ===
    if (config.FUNCTION.name === 'callWorkersAIChat') {
        const [history, message, env] = args;
        const messages = (history || []).map(m => ({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.text || m.content || ''
        }));
        if (message) messages.push({ role: 'user', content: message });
        const result = await callCloudflareRestAPI(modelName, { messages }, env);
        return result.result?.response || result.result?.content || JSON.stringify(result.result || result);
    }

    // === VISION (Image → Text) ===
    if (config.FUNCTION.name === 'callWorkersAIVision') {
        const [imageBuffer, env] = args;
        // Uform-Gen2 ожидает { prompt, image: [byte_array] }, НЕ messages-формат!
        const base64 = Buffer.isBuffer(imageBuffer) ? imageBuffer.toString('base64') : imageBuffer;
        const imageBytes = [...new Uint8Array(Buffer.from(base64, 'base64'))];
        const prompt = 'Опиши это изображение подробно на русском языке';
        const result = await callCloudflareRestAPI(modelName, {
            prompt: prompt,
            image: imageBytes
        }, env);
        return result.result?.description || result.result?.response || JSON.stringify(result.result || result);
    }

    // === STT (Audio → Text / Video → Text) ===
    if (config.FUNCTION.name === 'callWorkersAISpeechToText') {
        const [audioBuffer, env] = args;
        const audioBase64 = Buffer.isBuffer(audioBuffer) ? audioBuffer.toString('base64') : audioBuffer;

        // Cloudflare Whisper REST API: отправляем как multipart/form-data
        const accountId = env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = env.CLOUDFLARE_API_TOKEN;
        if (!accountId || !apiToken) {
            throw new Error('CLOUDFLARE_ACCOUNT_ID или CLOUDFLARE_API_TOKEN не заданы');
        }

        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelName}`;
        const audioBufferRaw = Buffer.from(audioBase64, 'base64');

        // Формируем multipart/form-data
        const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
        const parts = [];
        parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="audio.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n`));
        parts.push(audioBufferRaw);
        parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
        const body = Buffer.concat(parts);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body: body,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Cloudflare Whisper API error ${response.status}: ${errorText}`);
        }

        const json = await response.json();
        return json.result?.text || json.result?.transcription || JSON.stringify(json.result || json);
    }

    // === TTS (Text → Audio) ===
    if (config.FUNCTION.name === 'callWorkersAITextToAudio') {
        const [text, env, voice] = args;
        // Cloudflare Deepgram Aura model expects 'text' not 'prompt'
        const result = await callCloudflareRestAPI(modelName, {
            text: text,
            voice: voice || 'female'
        }, env);
        // Возвращаем результат в формате { audioBase64, mimeType } для унификации
        if (result.binary) {
            const b64 = result.data.toString('base64');
            const mime = result.contentType || 'audio/mpeg';
            return { audioBase64: b64, mimeType: mime.startsWith('audio/') ? mime : 'audio/mpeg' };
        }
        return result.result;
    }

    // === TEXT → IMAGE ===
    if (config.FUNCTION.name === 'callWorkersAITextToImage') {
        const [prompt, env] = args;
        const result = await callCloudflareRestAPI(modelName, {
            prompt: prompt + ', photorealistic, cinematic light, detailed background',
            num_steps: 10,
            negative_prompt: 'blurry, low quality, worst quality, deformed, mutated, cropped, text, signature, low detail',
        }, env);
        // Возвращаем бинарный результат (изображение)
        if (result.binary) return result.data;
        return result.result;
    }

    // === IMAGE → IMAGE (img2img) ===
    if (config.FUNCTION.name === 'callWorkersAIImg2Img') {
        const [prompt, env, refImage] = args;
        const imageBase64 = typeof refImage === 'string' ? refImage : Buffer.isBuffer(refImage) ? refImage.toString('base64') : '';
        // Cloudflare img2img API: используем image_b64 для base64 строки
        // (поле 'image' ожидает массив байтов, 'image_b64' — base64 строку)
        const result = await callCloudflareRestAPI(modelName, {
            prompt: prompt,
            image_b64: imageBase64,
            num_steps: 20,
            strength: 0.6,
            guidance: 7.5,
        }, env);
        if (result.binary) return result.data;
        return result.result;
    }

    // Фоллбэк — пробуем как chat
    console.log(`[WebHandler] Unknown WORKERS_AI function: ${config.FUNCTION.name}, trying as chat`);
    const [fallbackArg1, fallbackArg2] = args;
    const envArg = args.find(a => a && typeof a === 'object' && !Buffer.isBuffer(a) && !Array.isArray(a));
    if (envArg) {
        const messages = [{ role: 'user', content: String(fallbackArg1 || '') }];
        const result = await callCloudflareRestAPI(modelName, { messages }, envArg);
        return result.result?.response || JSON.stringify(result.result || result);
    }
    throw new Error('Не удалось вызвать WORKERS_AI модель: ' + config.FUNCTION.name);
}

// Хелпер: получить URL конвертера (может быть объектом с .toString() или строкой)
function getConverterUrl(env) {
    const raw = env.LESHIY_CONVERTER;
    if (!raw) return '';
    if (typeof raw === 'string') return raw;
    if (typeof raw.toString === 'function') return raw.toString();
    return '';
}

// Хелпер: получить URL прокси
function getProxyUrl(env) {
    const raw = env.LESHIY_AI_PROXY;
    if (!raw) return '';
    if (typeof raw === 'string') return raw;
    if (typeof raw.toString === 'function') return raw.toString();
    return '';
}

// ============================================================
// 🟢 ЧАТ — Бесплатно для всех (гости + авторизованные)
// ============================================================
async function handleChat(auth, payload, env, monolith) {
    const userMessage = (payload.prompt || '').trim();
    if (!userMessage && (!payload.attachments || payload.attachments.length === 0)) {
        return formatResponse(false, 'Пустое сообщение');
    }

    const { AI_MODELS, AI_MODEL_MENU_CONFIG, extractAndCleanModelResponse, syncS3Chat } = monolith;

    const browserHistory = payload.history || [];
    const historyForModel = browserHistory.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        text: m.content
    }));

    const isAuth = !!(auth && isValidAuthId(auth.id));
    const chatId = isAuth ? String(auth.id) : 'guest';

    // Авторизованный — сохраняем в S3
    if (isAuth && syncS3Chat) {
        try {
            const s3History = await syncS3Chat(chatId, userMessage || '[Файлы]', 'user', env);
            const convertedHistory = s3History.map(m => ({
                role: m.role === 'ai' ? 'model' : 'user',
                text: m.content
            }));
            historyForModel.length = 0;
            historyForModel.push(...convertedHistory);
        } catch (e) {
            console.error("[WebHandler] S3 sync error:", e.message);
        }
    }

    // 🧠🧠 КЛЮЧЕВОЙ ПРИНЦИП: ВЫБРАННЫЙ ЧАТ-МОДЕЛЬ ОПРЕДЕЛЯЕТ СЕРВИС
    // Если юзер выбрал Gemini — ВСЁ идёт через Gemini (текст, вижн, STT)
    // Если выбрал Workers AI — ВСЁ идёт через Workers AI
    // НИКАКИХ ПЕРЕКРЁСТНЫХ ПОДМЕН МЕЖДУ СЕРВИСАМИ!

    const hasAttachments = payload.attachments && payload.attachments.length > 0;
    let attachmentServiceType = null; // IMAGE_TO_TEXT, AUDIO_TO_TEXT, VIDEO_TO_TEXT

    if (hasAttachments) {
        const hasImage = payload.attachments.some(a => a.type && a.type.startsWith('image/'));
        const hasAudio = payload.attachments.some(a => a.type && a.type.startsWith('audio/'));
        const hasVideo = payload.attachments.some(a => a.type && a.type.startsWith('video/'));

        if (hasImage) attachmentServiceType = 'IMAGE_TO_TEXT';
        else if (hasAudio) attachmentServiceType = 'AUDIO_TO_TEXT';
        else if (hasVideo) attachmentServiceType = 'VIDEO_TO_TEXT';
        else attachmentServiceType = 'IMAGE_TO_TEXT'; // документы — тоже через вижн
    }

    // Шаг 1: Определяем чат-модель и её СЕРВИС
    const chatModelInfo = getWebModel('TEXT_TO_TEXT', AI_MODELS, AI_MODEL_MENU_CONFIG, payload.model, env);
    if (!chatModelInfo) {
        return formatResponse(false, 'Нет доступной модели для чата');
    }
    const chatService = chatModelInfo.config.SERVICE; // GEMINI, WORKERS_AI, BOTHUB и т.д.
    console.log(`[WebHandler] Chat model: ${chatModelInfo.key} (SERVICE=${chatService})`);

    // Шаг 2: Для вложений — находим модель ТЕГО ЖЕ СЕРВИСА
    // Если чат = Gemini → вижн/STT тоже Gemini
    // Если чат = Workers AI → вижн/STT тоже Workers AI
    let attachmentModelInfo = null;
    if (attachmentServiceType) {
        attachmentModelInfo = getModelForAttachmentByService(
            attachmentServiceType, chatService, AI_MODELS, AI_MODEL_MENU_CONFIG
        );
        if (attachmentModelInfo) {
            console.log(`[WebHandler] Attachment model: ${attachmentModelInfo.key} (SERVICE=${attachmentModelInfo.config.SERVICE}, same as chat)`);
        } else {
            console.log(`[WebHandler] No ${attachmentServiceType} model for service ${chatService}, will use chat model`);
        }
    }

    // Шаг 3: Вызываем модель. Для текста — чат-модель, для вложений — модель того же сервиса
    let finalResponse;
    try {
        // --- ВЛОЖЕНИЕ-ИЗОБРАЖЕНИЕ → Vision (модель того же сервиса что чат) ---
        if (hasAttachments && payload.attachments.some(a => a.type && a.type.startsWith('image/'))) {
            const imageAttachments = payload.attachments.filter(a => a.type && a.type.startsWith('image/'));
            const imageBase64 = imageAttachments[0].base64;
            const imageBuffer = Buffer.from(imageBase64, 'base64');
            const vModel = attachmentModelInfo || chatModelInfo;
            const vConfig = vModel.config;
            const vIsWorkersAI = vConfig.SERVICE === 'WORKERS_AI';

            console.log(`[WebHandler] Vision using: ${vModel.key} (${vConfig.SERVICE})`);

            if (vIsWorkersAI) {
                const visionResult = await callWorkersAIWeb(vConfig, imageBuffer, env);
                finalResponse = typeof visionResult === 'string' ? visionResult : String(visionResult);
            } else if (vConfig.FUNCTION.name === 'callGeminiVision' || vConfig.FUNCTION.name === 'callGeminiChat') {
                const result = await vConfig.FUNCTION(vConfig, imageBuffer, env);
                finalResponse = typeof result === 'string' ? result : (extractAndCleanModelResponse(result).finalResponse || String(result));
            } else if (vConfig.FUNCTION.name === 'callPollinationsVision' || vConfig.FUNCTION.name === 'callBotHubVisionChat') {
                // callPollinationsVision(config, imageBuffer, envData)
                // callBotHubVisionChat(config, imageData, envData)
                // Обе функции ожидают (config, buffer, env)
                const result = await vConfig.FUNCTION(vConfig, imageBuffer, env);
                finalResponse = typeof result === 'string' ? result : (extractAndCleanModelResponse(result).finalResponse || String(result));
            } else if (vConfig.FUNCTION.name === 'callBotHubTextChat' || vConfig.FUNCTION.name === 'callPollinationsChat') {
                // callBotHubTextChat(config, history, messageText, envData)
                // callPollinationsChat(config, history, messageText, envData)
                // Для чат-моделей с картинкой — добавляем описание картинки в сообщение
                const visionPrompt = userMessage || 'Опиши это изображение подробно';
                const result = await vConfig.FUNCTION(vConfig, historyForModel, visionPrompt, env);
                finalResponse = typeof result === 'string' ? result : (extractAndCleanModelResponse(result).finalResponse || String(result));
            } else {
                // Прочие модели — пробуем вызвать напрямую
                const fileInfo = payload.attachments.map(a => a.name).join(', ');
                const combinedMessage = userMessage ? `${userMessage}\n\n[Прикреплены файлы: ${fileInfo}]` : `Пользователь прикрепил файлы: ${fileInfo}. Опиши их.`;
                const modelResponse = await vConfig.FUNCTION(vConfig, historyForModel, combinedMessage, env);
                finalResponse = typeof modelResponse === 'string' ? modelResponse : extractAndCleanModelResponse(modelResponse).finalResponse;
            }

        // --- ВЛОЖЕНИЕ-АУДИО → STT (модель того же сервиса что чат) ---
        } else if (hasAttachments && payload.attachments.some(a => a.type && a.type.startsWith('audio/'))) {
            const audioAttachments = payload.attachments.filter(a => a.type && a.type.startsWith('audio/'));
            const audioBase64 = audioAttachments[0].base64;
            const audioBuffer = Buffer.from(audioBase64, 'base64');
            const sModel = attachmentModelInfo || chatModelInfo;
            const sConfig = sModel.config;
            const sIsWorkersAI = sConfig.SERVICE === 'WORKERS_AI';

            console.log(`[WebHandler] STT using: ${sModel.key} (${sConfig.SERVICE})`);

            let result;
            if (sIsWorkersAI) {
                result = await callWorkersAIWeb(sConfig, audioBuffer, env);
            } else if (sConfig.FUNCTION.name === 'callGeminiSpeechToText' || sConfig.FUNCTION.name === 'callGeminiChat') {
                result = await sConfig.FUNCTION(sConfig, audioBuffer, env);
            } else {
                result = await sConfig.FUNCTION(sConfig, audioBase64, env);
            }
            finalResponse = typeof result === 'string' ? result : (extractAndCleanModelResponse(result).finalResponse || String(result));

        // --- ВЛОЖЕНИЕ-ВИДЕО → транскрибация/анализ (модель того же сервиса что чат) ---
        } else if (hasAttachments && payload.attachments.some(a => a.type && a.type.startsWith('video/'))) {
            const videoAttachments = payload.attachments.filter(a => a.type && a.type.startsWith('video/'));
            const videoBase64 = videoAttachments[0].base64;
            const videoBuffer = Buffer.from(videoBase64, 'base64');
            const vModel = attachmentModelInfo || chatModelInfo;
            const vConfig = vModel.config;
            const vIsWorkersAI = vConfig.SERVICE === 'WORKERS_AI';

            console.log(`[WebHandler] Video STT using: ${vModel.key} (${vConfig.SERVICE})`);

            let result;
            if (vIsWorkersAI) {
                result = await callWorkersAIWeb(vConfig, videoBuffer, env);
            } else if (vConfig.FUNCTION.name === 'callGeminiSpeechToText' || vConfig.FUNCTION.name === 'callGeminiVideoVision') {
                result = await vConfig.FUNCTION(vConfig, videoBuffer, env);
            } else {
                result = await vConfig.FUNCTION(vConfig, videoBase64, env);
            }
            finalResponse = typeof result === 'string' ? result : (extractAndCleanModelResponse(result).finalResponse || String(result));

        // --- Остальные файлы (PDF, документы) → чат-модель ---
        } else if (hasAttachments) {
            const fileInfo = payload.attachments.map(a => a.name).join(', ');
            const combinedMessage = userMessage ? `${userMessage}\n\n[Прикреплены файлы: ${fileInfo}]` : `Пользователь прикрепил файлы: ${fileInfo}. Опиши их.`;
            let modelResponse;
            if (chatModelInfo.config.SERVICE === 'WORKERS_AI') {
                modelResponse = await callWorkersAIWeb(chatModelInfo.config, historyForModel, combinedMessage, env);
            } else {
                modelResponse = await chatModelInfo.config.FUNCTION(chatModelInfo.config, historyForModel, combinedMessage, env);
            }
            finalResponse = typeof modelResponse === 'string' ? modelResponse : extractAndCleanModelResponse(modelResponse).finalResponse;
        } else {
            // --- Обычный текстовый чат ---
            let modelResponse;
            if (chatModelInfo.config.SERVICE === 'WORKERS_AI') {
                modelResponse = await callWorkersAIWeb(chatModelInfo.config, historyForModel, userMessage, env);
            } else {
                modelResponse = await chatModelInfo.config.FUNCTION(chatModelInfo.config, historyForModel, userMessage, env);
            }
            if (typeof modelResponse === 'string') {
                finalResponse = modelResponse;
            } else {
                const cleaned = extractAndCleanModelResponse(modelResponse);
                finalResponse = cleaned.finalResponse;
            }
        }
    } catch (e) {
        console.error("[WebHandler] AI call error:", e.message);
        return formatResponse(false, "Ошибка ИИ: " + e.message);
    }

    // Авторизованный — сохраняем ответ в S3
    if (isAuth && syncS3Chat) {
        try {
            await syncS3Chat(chatId, finalResponse, 'assistant', env);
        } catch (e) {
            console.error("[WebHandler] S3 save error:", e.message);
        }
    }

    return formatResponse(true, null, null, {
        type: 'text',
        content: finalResponse
    });
}

// ============================================================
// 🎨 ИЗОБРАЖЕНИЕ — Поддержка t2i, i2i, upscale, rotate, convert
// ============================================================
async function handleImage(auth, payload, env, monolith) {
    const { AI_MODELS, AI_MODEL_MENU_CONFIG, uploadBase64ImageToPublicUrl } = monolith;
    const isAuth = !!(auth && isValidAuthId(auth.id));
    const chatId = isAuth ? String(auth.id) : 'guest';
    const imageMode = payload.image_mode || 't2i';

    // === UPSCALE ===
    if (imageMode === 'upscale') {
        if (!payload.image_base64) return formatResponse(false, 'Нет изображения для апскейла');
        if (!isAuth) return formatResponse(false, 'Нужна авторизация для апскейла');

        const balance = await getUserBalance(chatId, env, monolith);
        if (balance < 2) return formatResponse(false, 'Недостаточно кредитов. Нужно 2¢.', balance);

        let imageResult;
        try {
            const modelInfo = getWebModel('IMAGE_TO_UPSCALE', AI_MODELS, AI_MODEL_MENU_CONFIG, payload.model, env);
            if (!modelInfo) return formatResponse(false, 'Нет модели для апскейла');
            console.log(`[WebHandler] Upscale using: ${modelInfo.key} (${modelInfo.config.SERVICE})`);

            if (modelInfo.config.SERVICE === 'KIEAI') {
                // 🛑 KIEAI: вызываем createTaskKieAi напрямую с chatId в callbackUrl
                const { createTaskKieAi } = monolith;
                if (!createTaskKieAi) return formatResponse(false, 'Функция создания задач недоступна');

                // Загружаем изображение в публичный URL для KIEAI
                let imageUrl;
                try {
                    imageUrl = await uploadBase64ImageToPublicUrl(payload.image_base64, env, chatId);
                    if (!imageUrl) throw new Error('Не удалось загрузить изображение');
                } catch (e) {
                    return formatResponse(false, 'Ошибка загрузки изображения: ' + e.message);
                }

                const workerDomain = env.WORKER_DOMAIN || '';
                const callbackUrl = workerDomain ? `${workerDomain.startsWith('http') ? workerDomain : 'https://' + workerDomain}/api/kieai-callback?chatId=${chatId}` : null;

                const input = { image: imageUrl };

                const taskId = await createTaskKieAi(chatId, modelInfo.config, input, env, callbackUrl);
                if (!taskId) return formatResponse(false, 'Не удалось создать задачу апскейла');

                const creditsLeft = await deductCredits(chatId, 2, env, monolith);
                return formatResponse(true, null, creditsLeft, { type: 'image_task', content: taskId });
            }

            // Другие сервисы (STABILITY и т.д.) — вызываем напрямую
            imageResult = await modelInfo.config.FUNCTION(modelInfo.config, payload.image_base64, env);
        } catch (e) {
            console.error("[WebHandler] Upscale error:", e.message);
            return formatResponse(false, "Ошибка апскейла: " + e.message);
        }

        const creditsLeft = await deductCredits(chatId, 2, env, monolith);
        return formatImageResult(imageResult, creditsLeft, uploadBase64ImageToPublicUrl, env, chatId);
    }

    // === ROTATE (бесплатно через конвертер) ===
    if (imageMode === 'rotate') {
        if (!payload.image_base64) return formatResponse(false, 'Нет изображения для поворота');
        const angle = payload.angle || '-90';

        try {
            const converterUrl = getConverterUrl(env);
            if (converterUrl) {
                const baseUrl = converterUrl.endsWith('/') ? converterUrl.slice(0, -1) : converterUrl;
                const imageBuffer = Buffer.from(payload.image_base64, 'base64');
                // Converter expects multipart/form-data for rotate-image
                const boundary = '----FormBoundary' + Date.now().toString(36);
                const bodyParts = [
                    '--' + boundary,
                    'Content-Disposition: form-data; name="image"; filename="input.png"',
                    'Content-Type: image/png',
                    '',
                    ''
                ];
                const headerBytes = Buffer.from(bodyParts.join('\r\n') + '\r\n', 'utf8');
                const footerBytes = Buffer.from('\r\n--' + boundary + '--\r\n', 'utf8');
                const fullBody = Buffer.concat([headerBytes, imageBuffer, footerBytes]);

                const response = await fetch(`${baseUrl}/rotate-image?angle=${angle}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
                    body: fullBody
                });
                if (!response.ok) throw new Error('Ошибка конвертера: ' + response.status);
                const resultBuffer = Buffer.from(await response.arrayBuffer());
                const resultBase64 = resultBuffer.toString('base64');
                return formatResponse(true, null, null, { type: 'image_base64', content: resultBase64 });
            }
            return formatResponse(false, 'Конвертер недоступен');
        } catch (e) {
            console.error("[WebHandler] Rotate error:", e.message);
            return formatResponse(false, "Ошибка поворота: " + e.message);
        }
    }

    // === CONVERT (бесплатно через конвертер) ===
    if (imageMode === 'convert') {
        if (!payload.image_base64) return formatResponse(false, 'Нет изображения для конвертации');
        const targetFormat = payload.target_format || 'png';
        // sourceFormat — исходный формат (для выбора эндпоинта конвертера)
        const sourceFormat = (payload.source_format || '').toLowerCase();

        try {
            const converterUrl = getConverterUrl(env);
            if (!converterUrl) return formatResponse(false, 'Конвертер недоступен');
            const baseUrl = converterUrl.endsWith('/') ? converterUrl.slice(0, -1) : converterUrl;
            const imageBuffer = Buffer.from(payload.image_base64, 'base64');

            // 🧠 Выбираем эндпоинт конвертера по исходному и целевому формату
            let endpoint = null;
            let fieldName = 'image'; // имя поля в multipart

            if (sourceFormat === 'webp' && targetFormat === 'png') {
                endpoint = '/webp2png';
            } else if (sourceFormat === 'heic' && targetFormat === 'jpg') {
                endpoint = '/heic2jpg';
            } else if (sourceFormat === 'gif' && targetFormat === 'mp4') {
                // GIF → Video (gif2video endpoint, fieldName = 'gif')
                endpoint = '/gif2video';
                fieldName = 'gif';
            } else {
                // Универсальная конвертация через /rotate-image или Canvas fallback
                // Для rotate/resize используем конкретные эндпоинты
                if (payload.convert_action === 'rotate') {
                    const angle = payload.angle || '90';
                    endpoint = '/rotate-image?angle=' + encodeURIComponent(angle);
                } else if (payload.convert_action === 'resize') {
                    const res = payload.resolution || '720p';
                    endpoint = '/resize-image?resolution=' + encodeURIComponent(res);
                } else {
                    // Фоллбэк: пробуем webp2png если целевой png, иначе heic2jpg для heic
                    // Или отправляем как octet-stream на универсальный эндпоинт
                    endpoint = '/webp2png'; // Подходит для большинства форматов
                }
            }

            console.log(`[WebHandler] Image convert: ${sourceFormat || 'auto'} → ${targetFormat}, endpoint: ${endpoint}`);

            // 🧠 Отправляем через multipart/form-data (конвертер ожидает formData!)
            // В Cloudflare Workers нет FormData API для fetch — собираем вручную
            const boundary = '----FormBoundary' + Date.now().toString(36);
            const fileName = 'input.' + (sourceFormat || 'png');
            const fileMime = sourceFormat === 'heic' ? 'image/heic' : sourceFormat === 'gif' ? 'image/gif' : sourceFormat === 'webp' ? 'image/webp' : 'image/png';
            const bodyParts = [
                '--' + boundary,
                'Content-Disposition: form-data; name="' + fieldName + '"; filename="' + fileName + '"',
                'Content-Type: ' + fileMime,
                '',
                '' // placeholder — binary data follows
            ];
            const headerBytes = Buffer.from(bodyParts.join('\r\n') + '\r\n', 'utf8');
            const footerBytes = Buffer.from('\r\n--' + boundary + '--\r\n', 'utf8');
            const fullBody = Buffer.concat([headerBytes, imageBuffer, footerBytes]);

            const response = await fetch(`${baseUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
                body: fullBody
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error('Конвертер вернул ' + response.status + ': ' + errText.substring(0, 200));
            }
            // Проверяем тип ответа — может быть бинарный (изображение/видео) или JSON (video2image)
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('json')) {
                const jsonData = await response.json();
                if (jsonData.image) {
                    // data:image/jpeg;base64,... — извлекаем base64
                    const b64 = jsonData.image.split(',')[1] || jsonData.image;
                    return formatResponse(true, null, null, { type: 'image_base64', content: b64 });
                }
                if (jsonData.success === false) {
                    throw new Error(jsonData.error || 'Ошибка конвертера');
                }
            }
            const resultBuffer = Buffer.from(await response.arrayBuffer());
            const resultBase64 = resultBuffer.toString('base64');

            // GIF→MP4 возвращает video, не image
            if (sourceFormat === 'gif' && targetFormat === 'mp4') {
                return formatResponse(true, null, null, { type: 'video_base64', content: resultBase64 });
            }
            return formatResponse(true, null, null, { type: 'image_base64', content: resultBase64 });
        } catch (e) {
            console.error("[WebHandler] Image convert error:", e.message);
            return formatResponse(false, "Ошибка конвертации: " + e.message);
        }
    }

    // === I2I (Image-to-Image) ===
    if (imageMode === 'i2i') {
        const prompt = (payload.prompt || '').trim();
        if (!prompt) return formatResponse(false, 'Пустой промпт');
        if (!payload.reference_images || payload.reference_images.length === 0) {
            return formatResponse(false, 'Нет референсных изображений для i2i');
        }

        if (!isAuth) return formatResponse(false, 'Для I2I нужна авторизация');
        const balance = await getUserBalance(chatId, env, monolith);
        if (balance < 4) return formatResponse(false, 'Недостаточно кредитов. Нужно 4¢.', balance);

        let imageResult;
        try {
            const modelInfo = getWebModel('IMAGE_TO_IMAGE', AI_MODELS, AI_MODEL_MENU_CONFIG, payload.model, env);
            if (!modelInfo) return formatResponse(false, 'Нет модели для I2I');
            console.log(`[WebHandler] I2I using: ${modelInfo.key} (${modelInfo.config.SERVICE})`);

            const refImage = payload.reference_images[0];
            const isKieAi = modelInfo.config.SERVICE === 'KIEAI';

            if (isKieAi) {
                // 🛑 KIEAI: вызываем createTaskKieAi напрямую с chatId в callbackUrl
                const { createTaskKieAi } = monolith;
                if (!createTaskKieAi) return formatResponse(false, 'Функция создания задач недоступна');

                // Загружаем референсное изображение в публичный URL
                let imageUrl;
                try {
                    imageUrl = await uploadBase64ImageToPublicUrl(refImage, env, chatId);
                    if (!imageUrl) throw new Error('Не удалось загрузить изображение');
                } catch (e) {
                    return formatResponse(false, 'Ошибка загрузки изображения: ' + e.message);
                }

                const workerDomain = env.WORKER_DOMAIN || '';
                const callbackUrl = workerDomain ? `${workerDomain.startsWith('http') ? workerDomain : 'https://' + workerDomain}/api/kieai-callback?chatId=${chatId}` : null;

                const input = {
                    prompt: prompt,
                    image_urls: [imageUrl],
                    output_format: 'png',
                    aspect_ratio: payload.aspect_ratio || '1:1'
                };

                const taskId = await createTaskKieAi(chatId, modelInfo.config, input, env, callbackUrl);
                if (!taskId) return formatResponse(false, 'Не удалось создать задачу I2I');

                const creditsLeft = await deductCredits(chatId, 4, env, monolith);
                return formatResponse(true, null, creditsLeft, { type: 'image_task', content: taskId });
            } else if (modelInfo.config.SERVICE === 'WORKERS_AI') {
                imageResult = await callWorkersAIWeb(modelInfo.config, prompt, env, refImage);
            } else {
                imageResult = await modelInfo.config.FUNCTION(modelInfo.config, prompt, env, refImage);
            }
        } catch (e) {
            console.error("[WebHandler] I2I error:", e.message);
            return formatResponse(false, "Ошибка I2I: " + e.message);
        }

        const creditsLeft = await deductCredits(chatId, 4, env, monolith);
        return formatImageResult(imageResult, creditsLeft, uploadBase64ImageToPublicUrl, env, chatId);
    }

    // === T2I (Text-to-Image, default) ===
    const prompt = (payload.prompt || '').trim();
    if (!prompt) return formatResponse(false, 'Пустой промпт');

    // 🧠 УМНЫЙ ВЫБОР МОДЕЛИ
    const modelInfo = getWebModel('TEXT_TO_IMAGE', AI_MODELS, AI_MODEL_MENU_CONFIG, payload.model, env);
    if (!modelInfo) return formatResponse(false, 'Нет доступной модели для генерации изображений');

    const isFreeModel = modelInfo.config.SERVICE === 'WORKERS_AI' || !modelInfo.config.pricing;
    const isKieAi = modelInfo.config.SERVICE === 'KIEAI';

    if (!isFreeModel) {
        if (!isAuth) return formatResponse(false, 'Для платных моделей нужна авторизация');
        const balance = await getUserBalance(chatId, env, monolith);
        if (balance < 4) return formatResponse(false, 'Недостаточно кредитов. Нужно 4¢.', balance);
    }

    let imageResult;
    try {
        console.log(`[WebHandler] T2I using: ${modelInfo.key} (${modelInfo.config.SERVICE})`);

        if (isKieAi) {
            // 🛑 KIEAI: вызываем createTaskKieAi напрямую с chatId в callbackUrl
            // НЕ вызываем startKieAiTextToImage — она Telegram-специфичная
            const { createTaskKieAi } = monolith;
            if (!createTaskKieAi) return formatResponse(false, 'Функция создания задач недоступна');

            const workerDomain = env.WORKER_DOMAIN || '';
            const callbackUrl = workerDomain ? `${workerDomain.startsWith('http') ? workerDomain : 'https://' + workerDomain}/api/kieai-callback?chatId=${chatId}` : null;

            // KieAI: aspect_ratio — основной параметр (image_size deprecated)
            const kieRatio = payload.aspect_ratio || '1:1';
            const input = {
                prompt: prompt,
                output_format: 'png',
                aspect_ratio: kieRatio
            };

            const taskId = await createTaskKieAi(chatId, modelInfo.config, input, env, callbackUrl);
            if (!taskId) return formatResponse(false, 'Не удалось создать задачу генерации изображения');

            let creditsLeft = null;
            if (!isFreeModel && isAuth) {
                creditsLeft = await deductCredits(chatId, 4, env, monolith);
            }
            return formatResponse(true, null, creditsLeft, { type: 'image_task', content: taskId });
        } else if (modelInfo.config.SERVICE === 'WORKERS_AI') {
            imageResult = await callWorkersAIWeb(modelInfo.config, prompt, env);
        } else {
            imageResult = await modelInfo.config.FUNCTION(modelInfo.config, prompt, env);
        }
    } catch (e) {
        console.error("[WebHandler] Image gen error:", e.message);
        return formatResponse(false, "Ошибка генерации: " + e.message);
    }

    let creditsLeft = null;
    if (!isFreeModel && isAuth) {
        creditsLeft = await deductCredits(chatId, 4, env, monolith);
    }

    return formatImageResult(imageResult, creditsLeft, uploadBase64ImageToPublicUrl, env, chatId);
}

// Helper: форматирование результата изображения
async function formatImageResult(imageResult, creditsLeft, uploadBase64ImageToPublicUrl, env, chatId) {
    // Логируем тип результата для дебага
    const resultType = imageResult === null ? 'null' : imageResult === undefined ? 'undefined' :
        (imageResult instanceof ArrayBuffer || imageResult?.constructor?.name === 'ArrayBuffer') ? 'ArrayBuffer' :
        (imageResult instanceof Uint8Array) ? 'Uint8Array' :
        Buffer.isBuffer(imageResult) ? 'Buffer' :
        typeof imageResult === 'string' ? `string(${imageResult.length})` :
        typeof imageResult === 'object' ? `object{${Object.keys(imageResult).join(',')}}` :
        typeof imageResult;
    console.log(`[WebHandler] formatImageResult: type=${resultType}`);

    // Gemini text2image / image2image могут вернуть {imageBase64, mimeType} или просто base64
    if (imageResult && typeof imageResult === 'object' && imageResult.imageBase64) {
        return formatResponse(true, null, creditsLeft, { type: 'image_base64', content: imageResult.imageBase64 });
    }
    // Gemini может вернуть {url, ...}
    if (imageResult && typeof imageResult === 'object' && imageResult.url) {
        return formatResponse(true, null, creditsLeft, { type: 'image_url', content: imageResult.url });
    }
    // ArrayBuffer / Uint8Array (Gemini T2I, DALL-E, Stability возвращают ArrayBuffer)
    if (imageResult instanceof ArrayBuffer || imageResult instanceof Uint8Array || (imageResult && imageResult.constructor?.name === 'ArrayBuffer')) {
        const base64 = Buffer.from(imageResult).toString('base64');
        console.log(`[WebHandler] ArrayBuffer result: base64 length=${base64.length}`);
        // Всегда возвращаем base64 напрямую — KV-URL через /kv-images/ может быть недоступен с клиента (404)
        return formatResponse(true, null, creditsLeft, { type: 'image_base64', content: base64 });
    }
    // Строка — URL или base64
    if (typeof imageResult === 'string') {
        if (imageResult.startsWith('http')) {
            return formatResponse(true, null, creditsLeft, { type: 'image_url', content: imageResult });
        }
        return formatResponse(true, null, creditsLeft, { type: 'image_base64', content: imageResult });
    }
    // Buffer
    if (Buffer.isBuffer(imageResult)) {
        const base64 = imageResult.toString('base64');
        return formatResponse(true, null, creditsLeft, { type: 'image_base64', content: base64 });
    }
    // Объект с другими полями — пробуем извлечь URL или base64
    if (imageResult && typeof imageResult === 'object') {
        for (const field of ['imageUrl', 'image_url', 'outputUrl', 'output_url', 'url', 'src', 'data']) {
            if (imageResult[field] && typeof imageResult[field] === 'string') {
                if (imageResult[field].startsWith('http')) {
                    return formatResponse(true, null, creditsLeft, { type: 'image_url', content: imageResult[field] });
                }
                // Может быть base64
                return formatResponse(true, null, creditsLeft, { type: 'image_base64', content: imageResult[field] });
            }
        }
        // Может быть вложенный объект
        if (imageResult.data && typeof imageResult.data === 'string') {
            return formatResponse(true, null, creditsLeft, { type: 'image_base64', content: imageResult.data });
        }
        console.error(`[WebHandler] Unknown object format:`, JSON.stringify(imageResult).substring(0, 500));
    }

    return formatResponse(false, 'Неожиданный формат ответа от ИИ: ' + resultType);
}

// ============================================================
// 🎬 ВИДЕО — Поддержка generate, convert, upscale, rotate
// ============================================================
async function handleVideo(auth, payload, env, monolith) {
    const { AI_MODELS, AI_MODEL_MENU_CONFIG, extractAndCleanModelResponse } = monolith;
    const isAuth = !!(auth && isValidAuthId(auth.id));
    const chatId = isAuth ? String(auth.id) : 'guest';
    const videoMode = payload.video_mode || 'generate';

    // === CONVERT (конвертация видео через конвертер, бесплатно) ===
    if (videoMode === 'convert') {
        if (!payload.video_base64) return formatResponse(false, 'Нет видеофайла для конвертации');
        const targetFormat = (payload.target_format || 'mp4').toLowerCase();
        const sourceFormat = (payload.source_format || '').toLowerCase();

        try {
            const converterUrl = getConverterUrl(env);
            if (!converterUrl) return formatResponse(false, 'Конвертер недоступен');
            const baseUrl = converterUrl.endsWith('/') ? converterUrl.slice(0, -1) : converterUrl;
            const videoBuffer = Buffer.from(payload.video_base64, 'base64');

            let endpoint = null;
            let fieldName = 'video';

            if (sourceFormat === 'webm' && targetFormat === 'mp4') {
                endpoint = '/webm2mp4';
            } else if (sourceFormat === 'gif' && targetFormat !== 'gif') {
                // GIF → MP4 (gif2video endpoint, field name = 'gif')
                endpoint = '/gif2video';
                fieldName = 'gif';
            } else if (targetFormat === 'gif') {
                // Video → GIF
                const start = payload.start || '0';
                const end = payload.end || '3';
                const fps = payload.fps || '10';
                const width = payload.width || '480';
                const format = targetFormat === 'mp4' ? 'mp4' : 'gif';
                endpoint = `/video2gif?start=${start}&end=${end}&fps=${fps}&width=${width}&format=${format}`;
            } else if (targetFormat === 'mp3') {
                // Video → MP3 (извлечение аудио)
                endpoint = '/video2mp3';
            } else if (targetFormat === 'image' || targetFormat === 'jpg' || targetFormat === 'png') {
                // Video → Image (скриншот кадра)
                const timestamp = payload.timestamp || '00:00:01.000';
                const imgFormat = targetFormat === 'png' ? 'png' : 'jpg';
                endpoint = `/video2image?timestamp=${encodeURIComponent(timestamp)}&format=${imgFormat}`;
            } else if (payload.convert_action === 'rotate') {
                const angle = payload.angle || '90';
                endpoint = '/rotate-video?angle=' + encodeURIComponent(angle);
            } else if (payload.convert_action === 'resize') {
                const res = payload.resolution || '720p';
                endpoint = '/resize-video?resolution=' + encodeURIComponent(res);
            } else {
                // По умолчанию — webm2mp4 (самый частый кейс)
                endpoint = '/webm2mp4';
            }

            console.log(`[WebHandler] Video convert: ${sourceFormat || 'auto'} → ${targetFormat}, endpoint: ${endpoint}`);

            // Multipart/form-data
            const boundary = '----FormBoundary' + Date.now().toString(36);
            const fileName = 'input.' + (sourceFormat || 'webm');
            const fileMime = sourceFormat === 'gif' ? 'image/gif' : sourceFormat === 'mp4' ? 'video/mp4' : 'video/webm';
            const bodyParts = [
                '--' + boundary,
                'Content-Disposition: form-data; name="' + fieldName + '"; filename="' + fileName + '"',
                'Content-Type: ' + fileMime,
                '',
                ''
            ];
            const headerBytes = Buffer.from(bodyParts.join('\r\n') + '\r\n', 'utf8');
            const footerBytes = Buffer.from('\r\n--' + boundary + '--\r\n', 'utf8');
            const fullBody = Buffer.concat([headerBytes, videoBuffer, footerBytes]);

            const response = await fetch(`${baseUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
                body: fullBody
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error('Конвертер вернул ' + response.status + ': ' + errText.substring(0, 200));
            }

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('json')) {
                // video2image возвращает JSON с base64
                const jsonData = await response.json();
                if (jsonData.image) {
                    const b64 = jsonData.image.split(',')[1] || jsonData.image;
                    return formatResponse(true, null, null, { type: 'image_base64', content: b64 });
                }
            }

            const resultBuffer = Buffer.from(await response.arrayBuffer());
            const resultBase64 = resultBuffer.toString('base64');

            // Определяем тип результата
            if (targetFormat === 'mp3') {
                return formatResponse(true, null, null, { type: 'audio_base64', content: resultBase64 });
            } else if (targetFormat === 'image' || targetFormat === 'jpg' || targetFormat === 'png') {
                return formatResponse(true, null, null, { type: 'image_base64', content: resultBase64 });
            }
            return formatResponse(true, null, null, { type: 'video_base64', content: resultBase64 });
        } catch (e) {
            console.error("[WebHandler] Video convert error:", e.message);
            const actionLabel = payload.convert_action === 'resize' ? 'ресайза' : payload.convert_action === 'rotate' ? 'поворота' : 'конвертации';
            return formatResponse(false, "Ошибка " + actionLabel + " видео: " + e.message);
        }
    }

    // === ANALYSIS (анализ видео через AI модели) ===
    if (videoMode === 'analysis') {
        if (!payload.video_base64) return formatResponse(false, 'Нет видеофайла для анализа');
        const prompt = (payload.prompt || 'Проанализируй это видео подробно').trim();

        let result;
        try {
            let modelInfo = getWebModel('VIDEO_TO_ANALYSIS', AI_MODELS, AI_MODEL_MENU_CONFIG, payload.model, env);
            if (!modelInfo) return formatResponse(false, 'Нет модели для анализа видео');
            console.log(`[WebHandler] Video analysis using: ${modelInfo.key} (${modelInfo.config.SERVICE})`);

            const config = modelInfo.config;
            const videoBuffer = Buffer.from(payload.video_base64, 'base64');

            // Different video analysis functions have different signatures
            try {
                const videoMime = payload.video_mime_type || 'video/mp4';
                if (config.FUNCTION.name === 'callGeminiVideoVision') {
                    // Gemini Video Vision: (config, videoBuffer, mimeType, envData)
                    result = await config.FUNCTION(config, videoBuffer, videoMime, env);
                } else if (config.FUNCTION.name === 'callBothubVideoVision') {
                    result = await config.FUNCTION(config, videoBuffer, videoMime, env);
                } else if (config.FUNCTION.name === 'callWorkersAISpeechToText') {
                    result = await callWorkersAIWeb(config, videoBuffer, env);
                } else if (config.FUNCTION.name === 'callBotHubAudioToText') {
                    result = await callBotHubSTTWeb(config, videoBuffer, env, videoMime);
                } else if (config.FUNCTION.name === 'callPollinationsSTT') {
                    result = await callPollinationsSTTWeb(config, videoBuffer, env, videoMime);
                } else if (config.FUNCTION.name === 'callGeminiSpeechToText') {
                    result = await config.FUNCTION(config, videoBuffer, env);
                } else {
                    try {
                        result = await config.FUNCTION(config, prompt, env, payload.video_base64);
                    } catch(_) {
                        try {
                            result = await config.FUNCTION(config, videoBuffer, env);
                        } catch(__) {
                            result = await config.FUNCTION(config, payload.video_base64, env);
                        }
                    }
                }
            } catch (modelErr) {
                // 🛑 Фоллбэк: если основная модель не работает (нет API ключа) — пробуем другую
                if (modelErr.message && modelErr.message.includes('key is missing')) {
                    console.warn(`[WebHandler] Video analysis model ${modelInfo.key} failed (missing key), trying fallback models...`);
                    // Пробуем все модели VIDEO_TO_ANALYSIS по очереди
                    const menuConfig = AI_MODEL_MENU_CONFIG['VIDEO_TO_ANALYSIS'];
                    if (menuConfig && menuConfig.models) {
                        for (const [fallbackKey] of Object.entries(menuConfig.models)) {
                            if (fallbackKey === modelInfo.key) continue; // Пропускаем уже пробованную
                            const fallbackModel = AI_MODELS[fallbackKey];
                            if (!fallbackModel) continue;
                            console.log(`[WebHandler] Trying fallback: ${fallbackKey} (${fallbackModel.SERVICE})`);
                            try {
                                if (fallbackModel.FUNCTION.name === 'callWorkersAISpeechToText') {
                                    result = await callWorkersAIWeb(fallbackModel, videoBuffer, env);
                                } else if (fallbackModel.FUNCTION.name === 'callBotHubAudioToText') {
                                    const videoMime = payload.video_mime_type || 'video/mp4';
                                    result = await callBotHubSTTWeb(fallbackModel, videoBuffer, env, videoMime);
                                } else if (fallbackModel.FUNCTION.name === 'callPollinationsSTT') {
                                    const videoMime = payload.video_mime_type || 'video/mp4';
                                    result = await callPollinationsSTTWeb(fallbackModel, videoBuffer, env, videoMime);
                                } else if (fallbackModel.FUNCTION.name === 'callGeminiSpeechToText') {
                                    result = await fallbackModel.FUNCTION(fallbackModel, videoBuffer, env);
                                } else if (fallbackModel.FUNCTION.name === 'callGeminiVideoVision') {
                                    result = await fallbackModel.FUNCTION(fallbackModel, videoBuffer, videoMime, env);
                                } else {
                                    result = await fallbackModel.FUNCTION(fallbackModel, videoBuffer, env);
                                }
                                // Если успешно — выходим из цикла
                                if (result) break;
                            } catch (fallbackErr) {
                                console.warn(`[WebHandler] Fallback ${fallbackKey} also failed:`, fallbackErr.message);
                                continue;
                            }
                        }
                    }
                    if (!result) throw modelErr; // Если все фоллбэки не сработали — бросаем оригинальную ошибку
                } else {
                    throw modelErr;
                }
            }

            if (typeof result === 'string') {
                return formatResponse(true, null, null, { type: 'text', content: result });
            }
            const cleaned = extractAndCleanModelResponse(result);
            return formatResponse(true, null, null, { type: 'text', content: cleaned.finalResponse || String(result) });
        } catch (e) {
            console.error("[WebHandler] Video analysis error:", e.message);
            return formatResponse(false, "Ошибка анализа видео: " + e.message);
        }
    }

    // === ROTATE (бесплатно через конвертер) ===
    if (videoMode === 'rotate') {
        if (!payload.video_base64) return formatResponse(false, 'Нет видеофайла для поворота');
        const angle = payload.angle || '-90';
        try {
            const converterUrl = getConverterUrl(env);
            if (converterUrl) {
                const baseUrl = converterUrl.endsWith('/') ? converterUrl.slice(0, -1) : converterUrl;
                const videoBuffer = Buffer.from(payload.video_base64, 'base64');
                // Converter expects multipart/form-data for rotate-video
                const boundary = '----FormBoundary' + Date.now().toString(36);
                const bodyParts = [
                    '--' + boundary,
                    'Content-Disposition: form-data; name="video"; filename="input.mp4"',
                    'Content-Type: video/mp4',
                    '',
                    ''
                ];
                const headerBytes = Buffer.from(bodyParts.join('\r\n') + '\r\n', 'utf8');
                const footerBytes = Buffer.from('\r\n--' + boundary + '--\r\n', 'utf8');
                const fullBody = Buffer.concat([headerBytes, videoBuffer, footerBytes]);

                const response = await fetch(`${baseUrl}/rotate-video?angle=${angle}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
                    body: fullBody
                });
                if (!response.ok) throw new Error('Ошибка конвертера: ' + response.status);
                const resultBuffer = Buffer.from(await response.arrayBuffer());
                const resultBase64 = resultBuffer.toString('base64');
                return formatResponse(true, null, null, { type: 'video_base64', content: resultBase64 });
            }
            return formatResponse(false, 'Конвертер недоступен');
        } catch (e) {
            console.error("[WebHandler] Video rotate error:", e.message);
            return formatResponse(false, "Ошибка поворота видео: " + e.message);
        }
    }

    // === UPSCALE (10¢) ===
    if (videoMode === 'upscale') {
        if (!isAuth) return formatResponse(false, 'Нужна авторизация');
        const balance = await getUserBalance(chatId, env, monolith);
        if (balance < 10) return formatResponse(false, 'Недостаточно кредитов. Нужно 10¢.', balance);

        // KIE.AI upscale — используем startKieAiVideoUpscale через createTaskKieAi
        const { createTaskKieAi } = monolith;
        if (!createTaskKieAi) return formatResponse(false, 'Функция создания задач недоступна');

        let taskId;
        try {
            const modelInfo = getWebModel('VIDEO_TO_UPSCALE', AI_MODELS, AI_MODEL_MENU_CONFIG, payload.model, env);
            if (!modelInfo) return formatResponse(false, 'Нет модели для апскейла видео');
            const workerDomain = env.WORKER_DOMAIN || '';
            const callbackUrl = workerDomain ? `${workerDomain.startsWith('http') ? workerDomain : 'https://' + workerDomain}/api/kieai-callback?chatId=${chatId}` : null;

            const input = {
                video_base64: payload.video_base64,
                quality: payload.quality || '720p'
            };

            taskId = await createTaskKieAi(chatId, modelInfo.config, input, env, callbackUrl);
        } catch (e) {
            console.error("[WebHandler] Video upscale error:", e.message);
            return formatResponse(false, "Ошибка апскейла видео: " + e.message);
        }

        if (!taskId) return formatResponse(false, 'Не удалось создать задачу апскейла видео');

        const creditsLeft = await deductCredits(chatId, 10, env, monolith);
        return formatResponse(true, null, creditsLeft, { type: 'video_task', content: taskId });
    }

    // === GENERATE (default, 20¢) ===
    const prompt = (payload.prompt || '').trim();
    if (!prompt) return formatResponse(false, 'Пустой промпт');

    if (!isAuth) return formatResponse(false, 'Для генерации видео нужна авторизация');

    const balance = await getUserBalance(chatId, env, monolith);
    if (balance < 20) return formatResponse(false, 'Недостаточно кредитов. Нужно 20¢.', balance);

    const { createTaskKieAi } = monolith;
    if (!createTaskKieAi) return formatResponse(false, 'Функция создания задач недоступна');

    let taskId;
    try {
        // Определяем подтип видео по videoSubMode
        let videoServiceType = 'TEXT_TO_VIDEO';
        if (payload.video_submode === 'i2v') videoServiceType = 'IMAGE_TO_VIDEO';
        else if (payload.video_submode === 'v2v') videoServiceType = 'VIDEO_TO_VIDEO';
        else if (payload.video_submode === 'a2v') videoServiceType = 'AUDIO_TO_VIDEO';

        const modelInfo = getWebModel(videoServiceType, AI_MODELS, AI_MODEL_MENU_CONFIG, payload.model, env);
        if (!modelInfo) return formatResponse(false, 'Нет модели для генерации видео');

        const workerDomain = env.WORKER_DOMAIN || '';
        const callbackUrl = workerDomain ? `${workerDomain.startsWith('http') ? workerDomain : 'https://' + workerDomain}/api/kieai-callback?chatId=${chatId}` : null;

        const input = {
            prompt: prompt,
            aspect_ratio: payload.aspect_ratio || '16:9',
            duration: payload.duration || '5',
            quality: payload.quality || '480p',
            mode: 'normal'
        };

        // Добавляем референсное изображение если есть (i2v)
        if (payload.reference_image) {
            input.image_base64 = payload.reference_image;
        }
        // Добавляем референсное видео если есть (v2v)
        if (payload.reference_video) {
            input.video_base64 = payload.reference_video;
        }
        // Добавляем аудио если есть (a2v)
        if (payload.reference_audio) {
            input.audio_base64 = payload.reference_audio;
        }

        console.log(`[WebHandler] Video gen using: ${modelInfo.key}`);
        taskId = await createTaskKieAi(chatId, modelInfo.config, input, env, callbackUrl);
    } catch (e) {
        console.error("[WebHandler] Video task error:", e.message);
        return formatResponse(false, "Ошибка создания задачи видео: " + e.message);
    }

    if (!taskId) return formatResponse(false, 'Не удалось создать задачу генерации видео');

    const creditsLeft = await deductCredits(chatId, 20, env, monolith);
    return formatResponse(true, null, creditsLeft, { type: 'video_task', content: taskId });
}

// ============================================================
// 🔊 АУДИО — Поддержка TTS, STT, convert, voice_clone
// ============================================================
async function handleAudio(auth, payload, env, monolith) {
    const { AI_MODELS, AI_MODEL_MENU_CONFIG, extractAndCleanModelResponse } = monolith;
    const isAuth = !!(auth && isValidAuthId(auth.id));
    const chatId = isAuth ? String(auth.id) : 'guest';
    const audioMode = payload.audio_mode || 'tts';

    // === STT (Speech-to-Text, бесплатно) ===
    if (audioMode === 'stt') {
        if (!payload.audio_base64) return formatResponse(false, 'Нет аудиофайла для распознавания');

        let result;
        try {
            let modelInfo = getWebModel('AUDIO_TO_TEXT', AI_MODELS, AI_MODEL_MENU_CONFIG, payload.model, env);
            if (!modelInfo) return formatResponse(false, 'Нет модели для распознавания');
            console.log(`[WebHandler] STT using: ${modelInfo.key} (${modelInfo.config.SERVICE})`);

            const audioBuffer = Buffer.from(payload.audio_base64, 'base64');
            const audioMimeType = payload.audio_mime_type || 'audio/mpeg';

            // Different STT functions have different signatures
            try {
                const config = modelInfo.config;
                if (config.FUNCTION.name === 'callGeminiSpeechToText') {
                    result = await config.FUNCTION(config, audioBuffer, env);
                } else if (config.FUNCTION.name === 'callWorkersAISpeechToText') {
                    result = await callWorkersAIWeb(config, audioBuffer, env);
                } else if (config.FUNCTION.name === 'callBotHubAudioToText') {
                    result = await callBotHubSTTWeb(config, audioBuffer, env, audioMimeType);
                } else if (config.FUNCTION.name === 'callPollinationsSTT') {
                    result = await callPollinationsSTTWeb(config, audioBuffer, env, audioMimeType);
                } else {
                    try {
                        result = await config.FUNCTION(config, audioBuffer, env);
                    } catch(_) {
                        result = await config.FUNCTION(config, payload.audio_base64, env);
                    }
                }
            } catch (modelErr) {
                // 🛑 Фоллбэк: если основная модель не работает (нет API ключа / Invalid audio input) — пробуем другую
                if (modelErr.message && (modelErr.message.includes('key is missing') || modelErr.message.includes('Invalid audio'))) {
                    console.warn(`[WebHandler] STT model ${modelInfo.key} failed: ${modelErr.message}, trying fallback...`);
                    const menuConfig = AI_MODEL_MENU_CONFIG['AUDIO_TO_TEXT'];
                    if (menuConfig && menuConfig.models) {
                        for (const [fallbackKey] of Object.entries(menuConfig.models)) {
                            if (fallbackKey === modelInfo.key) continue;
                            const fallbackModel = AI_MODELS[fallbackKey];
                            if (!fallbackModel) continue;
                            console.log(`[WebHandler] Trying STT fallback: ${fallbackKey} (${fallbackModel.SERVICE})`);
                            try {
                                if (fallbackModel.FUNCTION.name === 'callWorkersAISpeechToText') {
                                    result = await callWorkersAIWeb(fallbackModel, audioBuffer, env);
                                } else if (fallbackModel.FUNCTION.name === 'callBotHubAudioToText') {
                                    result = await callBotHubSTTWeb(fallbackModel, audioBuffer, env, audioMimeType);
                                } else if (fallbackModel.FUNCTION.name === 'callPollinationsSTT') {
                                    result = await callPollinationsSTTWeb(fallbackModel, audioBuffer, env, audioMimeType);
                                } else if (fallbackModel.FUNCTION.name === 'callGeminiSpeechToText') {
                                    result = await fallbackModel.FUNCTION(fallbackModel, audioBuffer, env);
                                } else {
                                    result = await fallbackModel.FUNCTION(fallbackModel, audioBuffer, env);
                                }
                                if (result) break;
                            } catch (fallbackErr) {
                                console.warn(`[WebHandler] STT fallback ${fallbackKey} also failed:`, fallbackErr.message);
                                continue;
                            }
                        }
                    }
                    if (!result) throw modelErr;
                } else {
                    throw modelErr;
                }
            }

            if (typeof result === 'string') {
                return formatResponse(true, null, null, { type: 'text', content: result });
            }
            const cleaned = extractAndCleanModelResponse(result);
            return formatResponse(true, null, null, { type: 'text', content: cleaned.finalResponse || String(result) });
        } catch (e) {
            console.error("[WebHandler] STT error:", e.message, e.stack);
            return formatResponse(false, "Ошибка распознавания: " + e.message);
        }
    }

    // === CONVERT (бесплатно через конвертер) ===
    if (audioMode === 'convert') {
        if (!payload.audio_base64) return formatResponse(false, 'Нет аудиофайла для конвертации');
        const targetFormat = (payload.target_format || 'mp3').toLowerCase();
        const sourceFormat = (payload.source_format || '').toLowerCase();

        try {
            const converterUrl = getConverterUrl(env);
            if (!converterUrl) return formatResponse(false, 'Конвертер недоступен');
            const baseUrl = converterUrl.endsWith('/') ? converterUrl.slice(0, -1) : converterUrl;
            const audioBuffer = Buffer.from(payload.audio_base64, 'base64');

            let endpoint = null;
            let fieldName = 'audio';

            // Determine endpoint based on source and target format
            // Converter supports: ogg2mp3, wav2mp3, pcm2mp3, and generic ffmpeg conversion
            if (targetFormat === 'mp3') {
                if (sourceFormat === 'ogg' || sourceFormat === 'opus') {
                    endpoint = '/ogg2mp3';
                } else if (sourceFormat === 'wav') {
                    endpoint = '/wav2mp3';
                } else if (sourceFormat === 'pcm') {
                    const sampleRate = payload.sample_rate || '24000';
                    const channels = payload.channels || '1';
                    const pcmFormat = payload.pcm_format || 's16le';
                    const response = await fetch(`${baseUrl}/pcm2mp3?sampleRate=${sampleRate}&channels=${channels}&format=${pcmFormat}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/octet-stream' },
                        body: audioBuffer
                    });
                    if (!response.ok) throw new Error('Конвертер вернул ' + response.status);
                    const resultBuffer = Buffer.from(await response.arrayBuffer());
                    return formatResponse(true, null, null, { type: 'audio_base64', content: resultBuffer.toString('base64') });
                } else {
                    // Try ogg2mp3 as default fallback — most audio can be read as ogg-compatible
                    endpoint = '/ogg2mp3';
                }
            } else if (targetFormat === 'wav' || targetFormat === 'ogg' || targetFormat === 'flac') {
                // For non-mp3 targets: first convert to mp3, then let ffmpeg handle the rest
                // Use the generic convert endpoint if available, otherwise convert to mp3 first
                // The converter's /convert endpoint supports arbitrary format conversion
                endpoint = '/convert?outputFormat=' + encodeURIComponent(targetFormat);
            } else {
                // Default: ogg2mp3
                endpoint = '/ogg2mp3';
            }

            // Multipart/form-data
            const boundary = '----FormBoundary' + Date.now().toString(36);
            const fileName = 'input.' + (sourceFormat || 'ogg');
            const mimeMap = { wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac', m4a: 'audio/mp4', aac: 'audio/aac' };
            const fileMime = mimeMap[sourceFormat] || 'audio/ogg';
            const bodyParts = [
                '--' + boundary,
                'Content-Disposition: form-data; name="' + fieldName + '"; filename="' + fileName + '"',
                'Content-Type: ' + fileMime,
                '',
                ''
            ];
            const headerBytes = Buffer.from(bodyParts.join('\r\n') + '\r\n', 'utf8');
            const footerBytes = Buffer.from('\r\n--' + boundary + '--\r\n', 'utf8');
            const fullBody = Buffer.concat([headerBytes, audioBuffer, footerBytes]);

            console.log(`[WebHandler] Audio convert: ${sourceFormat || 'auto'} → ${targetFormat}, endpoint: ${endpoint}`);

            const response = await fetch(`${baseUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
                body: fullBody
            });
            if (!response.ok) {
                // If the /convert endpoint failed, fallback to ogg2mp3 for mp3 target
                if (endpoint !== '/ogg2mp3' && targetFormat === 'mp3') {
                    console.log('[WebHandler] Audio convert: fallback to ogg2mp3');
                    const fallbackBody = Buffer.concat([headerBytes, audioBuffer, footerBytes]);
                    const fallbackResp = await fetch(`${baseUrl}/ogg2mp3`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
                        body: fallbackBody
                    });
                    if (!fallbackResp.ok) throw new Error('Конвертер вернул ' + fallbackResp.status);
                    const resultBuffer = Buffer.from(await fallbackResp.arrayBuffer());
                    return formatResponse(true, null, null, { type: 'audio_base64', content: resultBuffer.toString('base64') });
                }
                throw new Error('Конвертер вернул ' + response.status);
            }
            const resultBuffer = Buffer.from(await response.arrayBuffer());
            return formatResponse(true, null, null, { type: 'audio_base64', content: resultBuffer.toString('base64') });
        } catch (e) {
            console.error("[WebHandler] Audio convert error:", e.message);
            return formatResponse(false, "Ошибка конвертации: " + e.message);
        }
    }

    // === VOICE CLONE ===
    if (audioMode === 'voice_clone') {
        const text = (payload.text || '').trim();
        if (!text) return formatResponse(false, 'Пустой текст');
        if (!payload.voice_sample) return formatResponse(false, 'Нет образца голоса');
        if (!isAuth) return formatResponse(false, 'Нужна авторизация');

        const balance = await getUserBalance(chatId, env, monolith);
        if (balance < 10) return formatResponse(false, 'Недостаточно кредитов. Нужно 10¢.', balance);

        let audioResult;
        try {
            const modelInfo = getWebModel('TEXT_TO_AUDIO', AI_MODELS, AI_MODEL_MENU_CONFIG, payload.model, env);
            if (!modelInfo) return formatResponse(false, 'Нет модели для клонирования');
            const config = modelInfo.config;

            if (config.FUNCTION.name === 'callGeminiTextToAudio') {
                audioResult = await config.FUNCTION(config, text, env, 'user_voice', payload.voice_sample);
            } else {
                try { audioResult = await config.FUNCTION(config, text, env, payload.voice_sample); }
                catch(_) { audioResult = await config.FUNCTION(config, text, env); }
            }
        } catch (e) {
            console.error("[WebHandler] Voice clone error:", e.message);
            return formatResponse(false, "Ошибка клонирования: " + e.message);
        }

        const creditsLeft = await deductCredits(chatId, 10, env, monolith);
        const audioBase64 = extractAudioBase64(audioResult);
        if (!audioBase64) return formatResponse(false, 'Сервер не вернул аудио');
        return formatResponse(true, null, creditsLeft, { type: 'audio_base64', content: audioBase64 });
    }

    // === TTS (default, 2¢) ===
    const text = (payload.text || payload.prompt || '').trim();
    if (!text) return formatResponse(false, 'Пустой текст');

    // Determine model first to check if it's free (VoiceRSS)
    const ttsModelInfo = getWebModel('TEXT_TO_AUDIO', AI_MODELS, AI_MODEL_MENU_CONFIG, payload.model, env);
    if (!ttsModelInfo) return formatResponse(false, 'Нет модели для TTS');

    // VoiceRSS is free — no auth needed. Other TTS models require auth.
    const isFreeTTS = ttsModelInfo.config.SERVICE === 'VOICERSS';
    if (!isFreeTTS && !isAuth) return formatResponse(false, 'Для этой модели озвучки нужна авторизация');
    
    // Check credits only for paid models
    if (!isFreeTTS && isAuth) {
        const balance = await getUserBalance(chatId, env, monolith);
        if (balance < 2) return formatResponse(false, 'Недостаточно кредитов. Нужно 2¢.', balance);
    }

    let audioResult;
    try {
        const config = ttsModelInfo.config;
        const voice = payload.voice || 'Female';

        console.log(`[WebHandler] TTS using: ${ttsModelInfo.key} (${config.SERVICE}), voice: ${voice}`);

        // Вызываем TTS-функцию с правильной сигнатурой
        if (config.SERVICE === 'WORKERS_AI') {
            // Workers AI TTS через Cloudflare REST API
            audioResult = await callWorkersAIWeb(config, text, env, voice);
        } else if (config.SERVICE === 'GEMINI' || config.FUNCTION.name === 'callGeminiTextToAudio') {
            audioResult = await config.FUNCTION(config, text, env, voice);
        } else if (config.SERVICE === 'VOICERSS' || config.FUNCTION.name === 'callVoiceRSSTextToAudio') {
            audioResult = await config.FUNCTION(config, text, env, voice);
        } else if (config.SERVICE === 'KIEAI') {
            // KIE.AI TTS — async task via createTaskKieAi
            const { createTaskKieAi } = monolith;
            if (!createTaskKieAi) return formatResponse(false, 'Kie.AI TTS недоступен');
            const workerDomain = env.WORKER_DOMAIN || '';
            const callbackUrl = workerDomain ? `${workerDomain.startsWith('http') ? workerDomain : 'https://' + workerDomain}/api/kieai-callback?chatId=${chatId}` : null;
            const input = { text, voice };
            const taskId = await createTaskKieAi(chatId, config, input, env, callbackUrl);
            if (!taskId) return formatResponse(false, 'Не удалось создать задачу TTS');
            // Deduct credits before returning task ID
            let creditsLeft = null;
            if (!isFreeTTS && isAuth) {
                creditsLeft = await deductCredits(chatId, 2, env, monolith);
            }
            return formatResponse(true, null, creditsLeft, { type: 'audio_task', content: taskId });
        } else {
            // BotHub и прочие — пробуем с voice
            try { audioResult = await config.FUNCTION(config, text, env, voice); }
            catch(_) { audioResult = await config.FUNCTION(config, text, env); }
        }
    } catch (e) {
        console.error("[WebHandler] Audio gen error:", e.message);
        return formatResponse(false, "Ошибка генерации аудио: " + e.message);
    }

    let creditsLeft = null;
    if (!isFreeTTS && isAuth) {
        creditsLeft = await deductCredits(chatId, 2, env, monolith);
    }

    // 🛑 КРИТИЧЕСКИ ВАЖНО: Gemini TTS возвращает {audioBase64, mimeType},
    // а НЕ ArrayBuffer. Нужно правильно извлечь base64.
    const audioBase64 = extractAudioBase64(audioResult);
    if (!audioBase64) {
        console.error("[WebHandler] Audio result type:", typeof audioResult, "keys:", audioResult ? Object.keys(audioResult) : 'null');
        return formatResponse(false, 'Сервер не вернул аудио');
    }

    return formatResponse(true, null, creditsLeft, { type: 'audio_base64', content: audioBase64 });
}

/**
 * Универсальный экстрактор base64 из разных форматов ответа AI-функций:
 * - Gemini TTS: { audioBase64: '...', mimeType: 'audio/mpeg' }
 * - ArrayBuffer / Uint8Array / Buffer
 * - Просто base64 строка
 */
function extractAudioBase64(result) {
    if (!result) return null;

    // Gemini TTS формат: { audioBase64, mimeType }
    if (typeof result === 'object' && result.audioBase64) {
        return result.audioBase64;
    }

    // Buffer
    if (Buffer.isBuffer(result)) {
        return result.toString('base64');
    }

    // ArrayBuffer / Uint8Array
    if (result instanceof ArrayBuffer || (result && result.constructor?.name === 'ArrayBuffer')) {
        return Buffer.from(result).toString('base64');
    }
    if (result instanceof Uint8Array) {
        return Buffer.from(result).toString('base64');
    }

    // Строка — может быть base64 или URL
    if (typeof result === 'string') {
        if (result.startsWith('http')) {
            // URL — не base64, возвращаем как есть (фронтенд скачает)
            return null; // TODO: скачать и конвертировать
        }
        // Предполагаем base64
        if (result.length > 100) return result;
    }

    return null;
}

// ============================================================
// 🎤 BotHub STT для веба — с правильным MIME-типом
// ============================================================
async function callBotHubSTTWeb(config, audioBuffer, env, mimeType) {
    const endpoint = '/audio/transcriptions';
    const apiUrl = `${config.BASE_URL}${endpoint}`;
    const tokenKey = config.API_KEY;
    const token = env[tokenKey];
    if (!token) throw new Error(`API Token (${tokenKey}) не настроен`);

    // Определяем расширение и MIME из переданного типа (для веба — реальный формат, не хардкод ogg)
    const effectiveMime = mimeType || 'audio/mpeg';
    const ext = effectiveMime.includes('ogg') ? 'ogg' : effectiveMime.includes('wav') ? 'wav' : effectiveMime.includes('webm') ? 'webm' : 'mp3';
    const filename = `audio_file.${ext}`;

    // Manual multipart/form-data (как в callBotHubAudioToText, но с правильным MIME)
    const boundary = '----BothubWebSTT' + Math.random().toString(16).slice(2);
    const parts = [];
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${config.MODEL}\r\n`));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${effectiveMime}\r\n\r\n`));
    parts.push(Buffer.isBuffer(audioBuffer) ? audioBuffer : Buffer.from(audioBuffer));
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: body,
        signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`BotHub Whisper API Error (${response.status}): ${errorText.substring(0, 500)}`);
    }

    const data = await response.json();
    return data.text ? data.text.trim() : JSON.stringify(data);
}

// ============================================================
// 🎤 Pollinations STT для веба — manual multipart (без Blob/FormData)
// ============================================================
async function callPollinationsSTTWeb(config, audioBuffer, env, mimeType) {
    const API_KEY = env[config.API_KEY];
    const BASE_URL = config.BASE_URL;
    const MODEL = config.MODEL || 'whisper';

    if (!API_KEY) throw new Error(`Pollinations API key is missing (${config.API_KEY})`);

    const url = `${BASE_URL.endsWith('/') ? BASE_URL : BASE_URL + '/'}v1/audio/transcriptions`;

    const effectiveMime = mimeType || 'audio/mpeg';
    const ext = effectiveMime.includes('ogg') ? 'ogg' : effectiveMime.includes('wav') ? 'wav' : 'mp3';

    // Manual multipart/form-data (не используем Blob/FormData — их может не быть в Node.js)
    const boundary = '----PollinationsWebSTT' + Math.random().toString(16).slice(2);
    const parts = [];
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${MODEL}\r\n`));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nru\r\n`));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n`));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="voice.${ext}"\r\nContent-Type: ${effectiveMime}\r\n\r\n`));
    parts.push(Buffer.isBuffer(audioBuffer) ? audioBuffer : Buffer.from(audioBuffer));
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: body,
        signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pollinations STT Error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    if (!data.text) throw new Error("Pollinations STT вернул пустой результат");
    return data.text.trim();
}

// ============================================================
// 📋 МОДЕЛИ — Возврат списка доступных моделей
// ============================================================
async function handleModels(auth, env, monolith) {
    const { AI_MODELS, AI_MODEL_MENU_CONFIG } = monolith;

    const models = {
        chat: [], image: [], image_i2i: [], image_vision: [], image_upscale: [],
        video_t2v: [], video_i2v: [], video_v2v: [], video_a2v: [], video_analysis: [], video_upscale: [],
        audio_tts: [], audio_stt: []
    };

    const serviceMapping = {
        'TEXT_TO_TEXT':     { target: 'chat',          freeByDefault: true  },
        'IMAGE_TO_TEXT':    { target: 'image_vision',  freeByDefault: true  },
        'TEXT_TO_IMAGE':    { target: 'image',         freeByDefault: false },
        'IMAGE_TO_IMAGE':   { target: 'image_i2i',     freeByDefault: false },
        'IMAGE_TO_UPSCALE': { target: 'image_upscale', freeByDefault: false },
        'TEXT_TO_VIDEO':    { target: 'video_t2v',     freeByDefault: false },
        'IMAGE_TO_VIDEO':   { target: 'video_i2v',     freeByDefault: false },
        'VIDEO_TO_VIDEO':   { target: 'video_v2v',     freeByDefault: false },
        'AUDIO_TO_VIDEO':   { target: 'video_a2v',     freeByDefault: false },
        'VIDEO_TO_UPSCALE': { target: 'video_upscale', freeByDefault: false },
        'VIDEO_TO_ANALYSIS':{ target: 'video_analysis', freeByDefault: true  },
        'TEXT_TO_AUDIO':    { target: 'audio_tts',     freeByDefault: true  }, // VoiceRSS бесплатный!
        'AUDIO_TO_TEXT':    { target: 'audio_stt',     freeByDefault: true  },
        'VIDEO_TO_TEXT':    { target: 'audio_stt',     freeByDefault: true  },
        'AUDIO_TO_AUDIO':   { target: 'audio_stt',     freeByDefault: true  },
    };

    // Не скрываем модели — юзер сам решает

    for (const [serviceType, menuConfig] of Object.entries(AI_MODEL_MENU_CONFIG)) {
        const mapping = serviceMapping[serviceType];
        if (!mapping) continue;
        const targetArray = models[mapping.target];
        if (!targetArray) continue;

        for (const [modelKey, friendlyName] of Object.entries(menuConfig.models)) {
            const modelDetails = AI_MODELS[modelKey];
            if (!modelDetails) continue;

            // Показываем ВСЕ модели — юзер сам выбирает. Никакого скрытия!

            const isFree = (!modelDetails.pricing && mapping.freeByDefault) || modelDetails.SERVICE === 'WORKERS_AI' || modelDetails.SERVICE === 'VOICERSS';
            const cost = typeof modelDetails.pricing === 'number' ? modelDetails.pricing : (modelDetails.pricing ? 'дин.' : 0);
            const isDynamicPricing = typeof modelDetails.pricing === 'object' && modelDetails.pricing !== null;

            targetArray.push({
                key: modelKey,
                displayName: friendlyName,
                modelShort: modelDetails.MODEL?.split('/').pop() || modelDetails.MODEL || '',
                service: modelDetails.SERVICE,
                serviceLabel: getShortServiceName(modelDetails.SERVICE),
                isFree: isFree,
                cost: cost,
                isDynamicPricing: isDynamicPricing
            });
        }
    }

    // Дедупликация по key
    for (const arr of Object.values(models)) {
        const seen = new Set();
        const unique = [];
        for (const m of arr) {
            if (!seen.has(m.key)) {
                seen.add(m.key);
                unique.push(m);
            }
        }
        arr.length = 0;
        arr.push(...unique);
    }

    // 🛑 ФИКС: VoiceRSS — бесплатный TTS, ставим ПЕРВЫМ в audio_tts
    // Чтобы юзер по умолчанию получал бесплатную озвучку без авторизации
    if (models.audio_tts && models.audio_tts.length > 0) {
        const voicerssIdx = models.audio_tts.findIndex(m => m.service === 'VOICERSS');
        if (voicerssIdx > 0) {
            const [voicerss] = models.audio_tts.splice(voicerssIdx, 1);
            models.audio_tts.unshift(voicerss);
        } else if (voicerssIdx === -1) {
            // VoiceRSS нет в списке — добавляем первой (бесплатная!)
            const voicerssConfig = AI_MODELS['TEXT_TO_AUDIO_VOICERSS'];
            if (voicerssConfig) {
                models.audio_tts.unshift({
                    key: 'TEXT_TO_AUDIO_VOICERSS',
                    displayName: 'VoiceRSS: TTS-Model',
                    modelShort: 'TTS-Model',
                    service: 'VOICERSS',
                    serviceLabel: 'VoiceRSS',
                    isFree: true,
                    cost: 0,
                    isDynamicPricing: false
                });
            }
        }
    }

    return formatResponse(true, null, null, models);
}

function getShortServiceName(service) {
    const names = {
        'WORKERS_AI': 'Cloudflare',
        'GEMINI': 'Gemini',
        'KIEAI': 'KIE.AI',
        'BOTHUB': 'BotHub',
        'POLLINATIONS': 'Pollinations',
        'FUSIONBRAIN': 'Kandinsky',
        'STABILITY': 'Stability',
        'VOICERSS': 'VoiceRSS'
    };
    return names[service] || service || '';
}

// ============================================================
// 🔑 КЛЮЧИ — Возврат API ключей и прокси-URL
// ============================================================
async function handleKeys(auth, env) {
    const proxyUrl = getProxyUrl(env);
    const converterUrl = getConverterUrl(env);

    const keys = {
        GEMINI_API_KEY: env.GEMINI_API_KEY || '',
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN || '',
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID || '',
        POLLINATIONS_API_KEY: env.POLLINATIONS_API_KEY || '',
        BOTHUB_API_KEY: env.BOTHUB_API_KEY || '',
        DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY || '',
        VOICERSS_API_KEY: env.VOICERSS_API_KEY || '',
        PROXY_URL: proxyUrl || 'https://d5dtt5rfr7nk66bbrec2.kf69zffa.apigw.yandexcloud.net/ai-proxy',
        PROXY_SECRET_KEY: env.PROXY_SECRET_KEY || env.GEMINI_PROXY_KEY || '',
        FALLBACK_PROXY: env.FALLBACK_PROXY || 'https://leshiy-ai-proxy.leshiyalex.workers.dev',
        GEMINI_PROXY: env.GEMINI_PROXY || 'https://gemini-proxy.leshiyalex.workers.dev',
        GEMINI_PROXY_KEY: env.GEMINI_PROXY_KEY || env.PROXY_SECRET_KEY || '',
        MP3_CONVERTER_URL: converterUrl || 'https://d5dtt5rfr7nk66bbrec2.kf69zffa.apigw.yandexcloud.net/converter'
    };
    return formatResponse(true, null, null, keys);
}

// ============================================================
// 🤖 AI-КОНФИГ — Возврат AI_MODELS без FUNCTION
// ============================================================
async function handleAIConfig(auth, env, monolith) {
    const { AI_MODELS, AI_MODEL_MENU_CONFIG } = monolith;
    if (!AI_MODELS) return formatResponse(false, 'AI_MODELS не загружены');

    // Показываем ВСЕ модели — юзер сам выбирает
    const safeModels = {};

    for (const [key, val] of Object.entries(AI_MODELS)) {
        if (!val || typeof val !== 'object') continue;
        // Никакого скрытия WORKERS_AI — если юзер выбрал, используем

        safeModels[key] = {
            SERVICE: val.SERVICE,
            MODEL: val.MODEL,
            API_KEY: val.API_KEY,
            BASE_URL: val.BASE_URL,
            ...(val.API_PATH ? { API_PATH: val.API_PATH } : {}),
            ...(val.voices ? { voices: val.voices } : {}),
            ...(val.pricing ? { pricing: val.pricing } : {})
        };
    }

    return formatResponse(true, null, null, {
        AI_MODELS: safeModels,
        AI_MODEL_MENU_CONFIG: AI_MODEL_MENU_CONFIG || {}
    });
}

// ============================================================
// 🔑 АДМИН-ПАНЕЛЬ — Управление балансом, VIP и моделями
// ============================================================
// Доступ только для ADMIN_CHAT_ID (как в телеграм-боте)
async function handleAdmin(auth, payload, env, monolith) {
    // Проверка прав админа
    if (!auth || !isValidAuthId(auth.id)) {
        return formatResponse(false, 'Не авторизован');
    }
    const chatId = String(auth.id);
    const isAdmin = await checkAdminStatusAsync(chatId, env);
    if (!isAdmin) {
        return formatResponse(false, 'Доступ запрещён: вы не админ');
    }

    const action = payload.action;
    
    // === УСТАНОВИТЬ БАЛАНС ===
    if (action === 'set_balance') {
        const targetId = payload.target_id;
        const amount = payload.amount;
        if (!targetId || amount === undefined || amount === null) {
            return formatResponse(false, 'Укажите target_id и amount');
        }
        if (!env.LAST_PHOTO_STORAGE) {
            return formatResponse(false, 'База данных недоступна');
        }
        try {
            // Как в телеграм-боте: ключ = {targetId}_credit_balance
            const balanceKey = targetId + '_credit_balance';
            await env.LAST_PHOTO_STORAGE.put(balanceKey, String(amount), { expirationTtl: 86400 * 365 });
            console.log(`[Admin] Balance set: ${targetId} → ${amount}`);
            await logCreditTransaction(targetId, amount, 'admin_set', env, 'Админ установил баланс: ' + amount);
            return formatResponse(true, null, null, { type: 'admin', action: 'set_balance', target_id: targetId, new_balance: amount });
        } catch (e) {
            return formatResponse(false, 'Ошибка записи баланса: ' + e.message);
        }
    }

    // === УСТАНОВИТЬ VIP ===
    if (action === 'set_vip') {
        const targetId = payload.target_id;
        const days = payload.days || 30;
        if (!targetId) {
            return formatResponse(false, 'Укажите target_id');
        }
        if (!env.LAST_PHOTO_STORAGE) {
            return formatResponse(false, 'База данных недоступна');
        }
        try {
            // Как в телеграм-боте: ключ = {targetId}_sub_end_credit
            const subEndKey = targetId + '_sub_end_credit';
            const endTime = Date.now() + (days * 86400 * 1000);
            await env.LAST_PHOTO_STORAGE.put(subEndKey, String(endTime), { expirationTtl: 86400 * 365 });
            console.log(`[Admin] VIP set: ${targetId} → ${days} days (until ${new Date(endTime).toISOString()})`);
            await logCreditTransaction(targetId, 0, 'admin_vip', env, 'Админ установил VIP на ' + days + ' дней');
            return formatResponse(true, null, null, { type: 'admin', action: 'set_vip', target_id: targetId, days: days, until: endTime });
        } catch (e) {
            return formatResponse(false, 'Ошибка установки VIP: ' + e.message);
        }
    }

    // === ПОЛУЧИТЬ ИНФО О ЮЗЕРЕ ===
    if (action === 'get_user_info') {
        const targetId = payload.target_id;
        if (!targetId) {
            return formatResponse(false, 'Укажите target_id');
        }
        if (!env.LAST_PHOTO_STORAGE) {
            return formatResponse(false, 'База данных недоступна');
        }
        try {
            const balanceKey = targetId + '_credit_balance';
            const subEndKey = targetId + '_sub_end_credit';
            const [balance, subEnd] = await Promise.all([
                env.LAST_PHOTO_STORAGE.get(balanceKey),
                env.LAST_PHOTO_STORAGE.get(subEndKey)
            ]);
            const isVip = subEnd ? parseInt(subEnd, 10) > Date.now() : false;
            return formatResponse(true, null, null, { 
                type: 'admin', action: 'get_user_info', target_id: targetId,
                balance: balance ? parseInt(balance, 10) : 0,
                isVip: isVip,
                vipUntil: subEnd ? parseInt(subEnd, 10) : null
            });
        } catch (e) {
            return formatResponse(false, 'Ошибка чтения данных: ' + e.message);
        }
    }

    // === ДОБАВИТЬ АДМИНА ===
    if (action === 'add_admin') {
        const targetId = payload.target_id;
        if (!targetId) {
            return formatResponse(false, 'Укажите target_id');
        }
        if (!env.LAST_PHOTO_STORAGE) {
            return formatResponse(false, 'База данных недоступна');
        }
        try {
            const stored = await env.LAST_PHOTO_STORAGE.get('admin_ids');
            let adminIds = stored ? stored.split(',').map(id => id.trim()).filter(id => id) : [];
            if (adminIds.includes(String(targetId))) {
                return formatResponse(true, null, null, { type: 'admin', action: 'add_admin', target_id: targetId, message: 'Уже админ' });
            }
            adminIds.push(String(targetId));
            await env.LAST_PHOTO_STORAGE.put('admin_ids', adminIds.join(','), { expirationTtl: 86400 * 365 * 10 });
            console.log(`[Admin] Admin added: ${targetId}. Current admins: ${adminIds.join(',')}`);
            return formatResponse(true, null, null, { type: 'admin', action: 'add_admin', target_id: targetId, admin_ids: adminIds });
        } catch (e) {
            return formatResponse(false, 'Ошибка добавления админа: ' + e.message);
        }
    }

    // === УДАЛИТЬ АДМИНА ===
    if (action === 'remove_admin') {
        const targetId = payload.target_id;
        if (!targetId) {
            return formatResponse(false, 'Укажите target_id');
        }
        if (!env.LAST_PHOTO_STORAGE) {
            return formatResponse(false, 'База данных недоступна');
        }
        try {
            // Don't allow removing the ADMIN_CHAT_ID from env
            const adminChatId = env.ADMIN_CHAT_ID;
            if (adminChatId && String(targetId) === String(adminChatId)) {
                return formatResponse(false, 'Нельзя удалить основного админа (ADMIN_CHAT_ID)');
            }
            const stored = await env.LAST_PHOTO_STORAGE.get('admin_ids');
            let adminIds = stored ? stored.split(',').map(id => id.trim()).filter(id => id) : [];
            if (!adminIds.includes(String(targetId))) {
                return formatResponse(true, null, null, { type: 'admin', action: 'remove_admin', target_id: targetId, message: 'Не был админом' });
            }
            adminIds = adminIds.filter(id => id !== String(targetId));
            await env.LAST_PHOTO_STORAGE.put('admin_ids', adminIds.join(','), { expirationTtl: 86400 * 365 * 10 });
            console.log(`[Admin] Admin removed: ${targetId}. Current admins: ${adminIds.join(',')}`);
            return formatResponse(true, null, null, { type: 'admin', action: 'remove_admin', target_id: targetId, admin_ids: adminIds });
        } catch (e) {
            return formatResponse(false, 'Ошибка удаления админа: ' + e.message);
        }
    }

    // === СПИСОК АДМИНОВ ===
    if (action === 'list_admins') {
        if (!env.LAST_PHOTO_STORAGE) {
            return formatResponse(false, 'База данных недоступна');
        }
        try {
            const stored = await env.LAST_PHOTO_STORAGE.get('admin_ids');
            const kvAdmins = stored ? stored.split(',').map(id => id.trim()).filter(id => id) : [];
            const envAdmin = env.ADMIN_CHAT_ID ? [String(env.ADMIN_CHAT_ID)] : [];
            return formatResponse(true, null, null, { type: 'admin', action: 'list_admins', env_admin: envAdmin, kv_admins: kvAdmins, all_admins: [...new Set([...envAdmin, ...kvAdmins])] });
        } catch (e) {
            return formatResponse(false, 'Ошибка чтения списка админов: ' + e.message);
        }
    }

    return formatResponse(false, 'Неизвестное действие админа: ' + action);
}

// ============================================================
// 💰 БАЛАНС — Запрос текущего баланса
// ============================================================
// ============================================================
// 🔄 СКАЧИВАНИЕ ИЗОБРАЖЕНИЯ С ПРОКСИ-ФОЛЛБЭКОМ
// ============================================================
// Пробуем скачать изображение напрямую, затем через прокси.
// Возвращает base64 строку или null если все попытки провалились.
async function downloadImageWithProxy(imageUrl, env) {
    console.log(`[WebHandler] downloadImageWithProxy: ${imageUrl.substring(0, 100)}`);

    // --- ПОПЫТКА 1: Прямой fetch ---
    try {
        const imgResponse = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*,*/*;q=0.8'
            },
            signal: AbortSignal.timeout(30000)
        });
        if (imgResponse.ok) {
            const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
            if (imgBuffer.length > 500) {
                console.log(`[WebHandler] Direct download OK: ${imgBuffer.length} bytes`);
                return imgBuffer.toString('base64');
            }
            console.warn(`[WebHandler] Direct download suspicious: only ${imgBuffer.length} bytes`);
        } else {
            console.warn(`[WebHandler] Direct download failed: HTTP ${imgResponse.status}`);
        }
    } catch (e) {
        console.warn(`[WebHandler] Direct download error: ${e.message}`);
    }

    // --- ПОПЫТКА 2: Через Yandex Cloud Proxy (LESHIY_AI_PROXY) ---
    const yandexProxy = env.LESHIY_AI_PROXY;
    if (yandexProxy && typeof yandexProxy.fetch === 'function') {
        try {
            console.log(`[WebHandler] Trying Yandex proxy download...`);
            const proxyResponse = await yandexProxy.fetch(imageUrl, {
                method: 'GET',
                headers: {
                    'X-Target-URL': imageUrl,
                    'X-Proxy-Secret': env.PROXY_SECRET_KEY || env.GEMINI_PROXY_KEY || '',
                    'Accept': 'image/*,*/*;q=0.8'
                }
            });
            if (proxyResponse.ok) {
                const imgBuffer = Buffer.from(await proxyResponse.arrayBuffer());
                if (imgBuffer.length > 500) {
                    console.log(`[WebHandler] Yandex proxy download OK: ${imgBuffer.length} bytes`);
                    return imgBuffer.toString('base64');
                }
            }
            console.warn(`[WebHandler] Yandex proxy returned: ${proxyResponse.status}`);
        } catch (e) {
            console.warn(`[WebHandler] Yandex proxy error: ${e.message}`);
        }
    }

    // --- ПОПЫТКА 3: Через Cloudflare Fallback Proxy ---
    const fallbackProxy = env.FALLBACK_PROXY || 'https://leshiy-ai-proxy.leshiyalex.workers.dev';
    if (fallbackProxy) {
        try {
            console.log(`[WebHandler] Trying CF fallback proxy download...`);
            const proxyResponse = await fetch(fallbackProxy, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Target-URL': imageUrl,
                    'X-Proxy-Secret': env.PROXY_SECRET_KEY || env.GEMINI_PROXY_KEY || '',
                    'X-HTTP-Method': 'GET'
                },
                body: JSON.stringify({ _proxy_target: imageUrl })
            });
            if (proxyResponse.ok) {
                const ct = proxyResponse.headers.get('content-type') || '';
                // Если вернулся JSON с URL — пробуем скачать по нему
                if (ct.includes('json')) {
                    try {
                        const jsonData = await proxyResponse.json();
                        const proxyUrl = jsonData.url || jsonData.data?.url || jsonData.image_url;
                        if (proxyUrl) {
                            console.log(`[WebHandler] CF proxy returned URL: ${proxyUrl.substring(0, 80)}`);
                            const imgResponse = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
                            if (imgResponse.ok) {
                                const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
                                if (imgBuffer.length > 500) return imgBuffer.toString('base64');
                            }
                        }
                    } catch (_) {}
                } else {
                    // Бинарный ответ — это само изображение
                    const imgBuffer = Buffer.from(await proxyResponse.arrayBuffer());
                    if (imgBuffer.length > 500) {
                        console.log(`[WebHandler] CF proxy binary download OK: ${imgBuffer.length} bytes`);
                        return imgBuffer.toString('base64');
                    }
                }
            }
            console.warn(`[WebHandler] CF fallback proxy returned: ${proxyResponse.status}`);
        } catch (e) {
            console.warn(`[WebHandler] CF fallback proxy error: ${e.message}`);
        }
    }

    // --- ПОПЫТКА 4: Через Gemini Proxy ---
    const geminiProxy = env.GEMINI_PROXY || 'https://gemini-proxy.leshiyalex.workers.dev';
    const geminiProxyKey = env.GEMINI_PROXY_KEY || env.PROXY_SECRET_KEY || '';
    if (geminiProxy) {
        try {
            console.log(`[WebHandler] Trying Gemini proxy download...`);
            const proxyUrl = `${geminiProxy.startsWith('http') ? geminiProxy : 'https://' + geminiProxy}/proxy-image`;
            const proxyResponse = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Proxy-Secret': geminiProxyKey,
                    'X-Target-URL': imageUrl
                },
                body: JSON.stringify({ url: imageUrl })
            });
            if (proxyResponse.ok) {
                const imgBuffer = Buffer.from(await proxyResponse.arrayBuffer());
                if (imgBuffer.length > 500) {
                    console.log(`[WebHandler] Gemini proxy download OK: ${imgBuffer.length} bytes`);
                    return imgBuffer.toString('base64');
                }
            }
        } catch (e) {
            console.warn(`[WebHandler] Gemini proxy error: ${e.message}`);
        }
    }

    // --- ПОПЫТКА 5: Повторный прямой fetch с другими заголовками ---
    try {
        console.log(`[WebHandler] Final retry with minimal headers...`);
        const imgResponse = await fetch(imageUrl, {
            redirect: 'follow',
            signal: AbortSignal.timeout(15000)
        });
        if (imgResponse.ok) {
            const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
            if (imgBuffer.length > 500) {
                console.log(`[WebHandler] Final retry OK: ${imgBuffer.length} bytes`);
                return imgBuffer.toString('base64');
            }
        }
    } catch (e) {
        console.warn(`[WebHandler] Final retry failed: ${e.message}`);
    }

    console.error(`[WebHandler] All 5 download attempts failed for: ${imageUrl.substring(0, 100)}`);
    return null;
}

// ============================================================
// 🔄 TASK STATUS — Polling KieAI task results
// ============================================================
// Web frontend polls this endpoint to check if an async KieAI
// task (image/video generation) has completed.
async function handleTaskStatus(auth, payload, env, monolith) {
    if (!auth || !isValidAuthId(auth.id)) {
        return formatResponse(false, 'Не авторизован');
    }
    const chatId = String(auth.id);
    const taskId = payload?.task_id;
    const taskType = payload?.task_type || 'image'; // 'image' or 'video'
    const { uploadBase64ImageToPublicUrl } = monolith || {};

    if (!taskId) {
        return formatResponse(false, 'Не указан task_id');
    }

    // Get the KieAI API key
    const apiKey = env.KIEAI_API_KEY;
    if (!apiKey) {
        return formatResponse(false, 'KieAI API ключ не настроен');
    }

    try {
        const url = `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[WebHandler] KieAI recordInfo error: ${response.status}`, errorText);
            return formatResponse(false, 'Ошибка проверки статуса задачи: ' + response.status);
        }

        const result = await response.json();
        // ✅ Логируем полный ответ KieAI для дебага (безопасно)
        const safeLogResult = result != null ? (JSON.stringify(result) || '').substring(0, 2000) : 'null';
        console.log(`[WebHandler] KieAI task ${taskId} response:`, safeLogResult);

        if (result.code !== 200 && result.code !== undefined) {
            return formatResponse(false, 'KieAI API ошибка: ' + (result.msg || result.message || 'Unknown error'));
        }

        const state = result.data?.state;
        const output = result.data?.output;
        const resultJson = result.data?.resultJson; // KieAI использует resultJson для хранения URL

        if (state === 'success' || state === 'succeeded') {
            // ✅ Улучшенное извлечение результата: проверяем все возможные форматы ответа KieAI
            let resultUrl = null;

            // -1. KieAI format: resultJson — JSON-строка с resultUrls[]
            if (!resultUrl && resultJson) {
                try {
                    const parsed = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson;
                    // resultUrls — основной формат KieAI для изображений и видео
                    if (Array.isArray(parsed?.resultUrls) && parsed.resultUrls.length > 0) {
                        resultUrl = parsed.resultUrls[0];
                        console.log(`[WebHandler] Found URL in resultJson.resultUrls[0]: ${String(resultUrl || '').substring(0, 100)}`);
                    }
                    // Также проверяем другие поля в resultJson
                    if (!resultUrl) {
                        for (const field of ['url', 'videoUrl', 'imageUrl', 'downloadUrl', 'outputUrl', 'src', 'source_url']) {
                            if (parsed?.[field] && typeof parsed[field] === 'string' && parsed[field].startsWith('http')) {
                                resultUrl = parsed[field];
                                console.log(`[WebHandler] Found URL in resultJson.${field}: ${String(resultUrl || '').substring(0, 100)}`);
                                break;
                            }
                        }
                    }
                    // images/videos массивы
                    if (!resultUrl) {
                        for (const field of ['images', 'videos', 'urls', 'outputs']) {
                            if (Array.isArray(parsed?.[field]) && parsed[field].length > 0) {
                                const first = parsed[field][0];
                                if (typeof first === 'string' && first.startsWith('http')) {
                                    resultUrl = first;
                                    console.log(`[WebHandler] Found URL in resultJson.${field}[0]`);
                                    break;
                                } else if (typeof first === 'object' && first?.url) {
                                    resultUrl = first.url;
                                    console.log(`[WebHandler] Found URL in resultJson.${field}[0].url`);
                                    break;
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.warn(`[WebHandler] Failed to parse resultJson: ${e.message}`);
                }
            }

            // 0. KieAI часто возвращает output как массив строк-URL
            if (Array.isArray(output) && output.length > 0) {
                for (const item of output) {
                    if (typeof item === 'string' && item.startsWith('http')) {
                        resultUrl = item;
                        console.log(`[WebHandler] Found URL in output array: ${String(resultUrl || '').substring(0, 100)}`);
                        break;
                    } else if (typeof item === 'object' && item !== null) {
                        for (const field of ['url', 'videoUrl', 'imageUrl', 'downloadUrl', 'src', 'source_url']) {
                            if (item[field] && typeof item[field] === 'string' && item[field].startsWith('http')) {
                                resultUrl = item[field];
                                console.log(`[WebHandler] Found URL in output[].${field}: ${String(resultUrl || '').substring(0, 100)}`);
                                break;
                            }
                        }
                        if (resultUrl) break;
                    }
                }
            }

            // 1. Прямые URL поля
            if (!resultUrl) {
                const urlFields = ['videoUrl', 'url', 'video_url', 'imageUrl', 'image_url', 'outputUrl', 'output_url', 'downloadUrl', 'download_url', 'resultUrl', 'result_url', 'source_url', 'src'];
                for (const field of urlFields) {
                    if (output?.[field] && typeof output[field] === 'string' && output[field].startsWith('http')) {
                        resultUrl = output[field];
                        console.log(`[WebHandler] Found URL in output.${field}: ${String(resultUrl || '').substring(0, 100)}`);
                        break;
                    }
                }
            }

            // 2. Массивы URL
            if (!resultUrl) {
                const arrayFields = ['videos', 'images', 'urls', 'outputs', 'results', 'files'];
                for (const field of arrayFields) {
                    if (Array.isArray(output?.[field]) && output[field].length > 0) {
                        const item = output[field][0];
                        if (typeof item === 'string' && item.startsWith('http')) {
                            resultUrl = item;
                        } else if (typeof item === 'object') {
                            const urlFields = ['url', 'videoUrl', 'imageUrl', 'downloadUrl', 'src'];
                            for (const subField of urlFields) {
                                if (item[subField] && typeof item[subField] === 'string' && item[subField].startsWith('http')) {
                                    resultUrl = item[subField];
                                    break;
                                }
                            }
                        }
                        if (resultUrl) {
                            console.log(`[WebHandler] Found URL in output.${field}[0]`);
                            break;
                        }
                    }
                }
            }

            // 3. Если output — сам строка URL
            if (!resultUrl && typeof output === 'string' && output.startsWith('http')) {
                resultUrl = output;
            }

            // 3b. Если output — строка base64 (без http префикса)
            if (!resultUrl && typeof output === 'string' && output.length > 100) {
                // Может быть base64 данные изображения
                console.log(`[WebHandler] Output is a long string (${output.length} chars), treating as base64`);
                return formatResponse(true, null, null, { type: 'image_base64', content: output });
            }

            // 4. Проверяем data.result/data.output на верхнем уровне
            if (!resultUrl) {
                const topLevel = result.data || result;
                const urlFields = ['videoUrl', 'url', 'video_url', 'imageUrl', 'image_url', 'outputUrl', 'output_url', 'downloadUrl', 'download_url', 'resultUrl', 'result_url', 'source_url', 'src'];
                for (const field of urlFields) {
                    if (topLevel?.[field] && typeof topLevel[field] === 'string' && topLevel[field].startsWith('http')) {
                        resultUrl = topLevel[field];
                        break;
                    }
                }
            }

            // 5. Проверяем data.images / data.videos (KieAI T2I/I2I формат)
            if (!resultUrl && result.data) {
                const imgOrVidFields = ['images', 'videos', 'results', 'output_images', 'output_videos'];
                for (const field of imgOrVidFields) {
                    const arr = result.data[field];
                    if (Array.isArray(arr) && arr.length > 0) {
                        const first = arr[0];
                        if (typeof first === 'string' && first.startsWith('http')) {
                            resultUrl = first;
                            console.log(`[WebHandler] Found URL in data.${field}[0]`);
                            break;
                        } else if (typeof first === 'object' && first !== null) {
                            for (const subField of ['url', 'imageUrl', 'videoUrl', 'downloadUrl', 'src']) {
                                if (first[subField] && typeof first[subField] === 'string' && first[subField].startsWith('http')) {
                                    resultUrl = first[subField];
                                    console.log(`[WebHandler] Found URL in data.${field}[0].${subField}`);
                                    break;
                                }
                            }
                            if (resultUrl) break;
                        }
                    }
                }
            }

            if (resultUrl) {
                // 🧠 Для изображений — скачиваем на сервере и возвращаем base64,
                // т.к. временные URL (tempfile.aiquickdraw.com) часто недоступны с клиента
                // Также KV-URL через /kv-images/ может возвращать 404, поэтому всегда base64
                if (taskType !== 'video' && taskType !== 'audio') {
                    const downloaded = await downloadImageWithProxy(resultUrl, env);
                    if (downloaded) {
                        const imgBase64 = downloaded;
                        console.log(`[WebHandler] Downloaded image: base64 length=${imgBase64.length}`);
                        // Всегда возвращаем base64 напрямую — KV-URL может быть недоступен с клиента (404)
                        return formatResponse(true, null, null, { type: 'image_base64', content: imgBase64 });
                    }
                    // Все способы скачивания не удаллись — для изображений это фатально
                    console.error(`[WebHandler] All download methods failed for: ${resultUrl.substring(0, 100)}`);
                    return formatResponse(false, 'Не удалось скачать изображение. Попробуйте другую модель.');
                }
                // Для видео — возвращаем URL как есть
                if (taskType === 'audio') {
                    return formatResponse(true, null, null, { type: 'audio_url', content: resultUrl });
                }
                return formatResponse(true, null, null, { type: 'video_url', content: resultUrl });
            } else {
                // 6. Глубокий рекурсивный поиск URL во всём ответе
                const deepFindUrl = (obj, depth) => {
                    if (depth > 5 || !obj || typeof obj !== 'object') return null;
                    for (const key of Object.keys(obj)) {
                        const val = obj[key];
                        if (typeof val === 'string' && val.startsWith('http') && (val.includes('.png') || val.includes('.jpg') || val.includes('.webp') || val.includes('.mp4') || val.includes('.mp3') || val.includes('/image') || val.includes('/video') || val.includes('/audio') || val.includes('storage') || val.includes('cdn') || val.includes('s3') || val.includes('blob'))) {
                            console.log(`[WebHandler] Deep found URL at depth ${depth} key="${key}": ${val.substring(0, 100)}`);
                            return val;
                        }
                        if (typeof val === 'string' && val.startsWith('http') && val.length > 50) {
                            console.log(`[WebHandler] Deep found possible URL at depth ${depth} key="${key}": ${val.substring(0, 100)}`);
                            return val;
                        }
                        const nested = deepFindUrl(val, depth + 1);
                        if (nested) return nested;
                    }
                    return null;
                };

                resultUrl = deepFindUrl(result, 0);

                if (resultUrl) {
                    // Для изображений — скачиваем и возвращаем base64 (та же причина: KV-URL может быть 404)
                    if (taskType !== 'video' && taskType !== 'audio') {
                        const downloaded = await downloadImageWithProxy(resultUrl, env);
                        if (downloaded) {
                            console.log(`[WebHandler] Deep-found URL, downloaded: base64 length=${downloaded.length}`);
                            return formatResponse(true, null, null, { type: 'image_base64', content: downloaded });
                        }
                        return formatResponse(false, 'Не удалось скачать изображение по найденному URL');
                    }
                    const resultType = taskType === 'audio' ? 'audio_url' : 'video_url';
                    return formatResponse(true, null, null, { type: resultType, content: resultUrl });
                }

                // Output exists but no recognizable URL — логируем полный ответ для дебага
                const safeOutput = output != null ? (JSON.stringify(output) || '').substring(0, 2000) : 'null';
                const safeResult = result != null ? (JSON.stringify(result) || '').substring(0, 2000) : 'null';
                console.log(`[WebHandler] KieAI success but no URL found. Full output:`, safeOutput);
                console.log(`[WebHandler] Full result:`, safeResult);
                // 🛑 ФАТАЛЬНАЯ ошибка — НЕ повторять! Задача выполнена но результат не найден
                return formatResponse(false, 'Задача не удалась: результат не найден в ответе KieAI');
            }
        } else if (state === 'waiting' || state === 'processing' || state === 'queued') {
            // Task still in progress
            return formatResponse(true, null, null, { type: 'task_pending', state: state });
        } else if (state === 'failed') {
            const errorMsg = output?.error || output?.message || result.data?.error || 'Задача не удалась';
            return formatResponse(false, 'Задача не удалась: ' + errorMsg);
        } else {
            // Unknown state — treat as pending
            return formatResponse(true, null, null, { type: 'task_pending', state: state || 'unknown' });
        }
    } catch (e) {
        console.error("[WebHandler] Task status check error:", e.message);
        return formatResponse(false, 'Ошибка проверки статуса: ' + e.message);
    }
}

async function handleBalance(auth, env, monolith) {
    if (!auth || !isValidAuthId(auth.id)) {
        return formatResponse(false, 'Не авторизован');
    }
    const chatId = String(auth.id);
    const balance = await getUserBalance(chatId, env, monolith);
    const isVip = await checkVipStatus(chatId, env);
    const isAdmin = await checkAdminStatusAsync(chatId, env);
    const history = await getCreditHistory(chatId, env);

    return formatResponse(true, null, balance, { 
        type: 'balance', 
        balance: balance, 
        isVip: isVip,
        isAdmin: isAdmin,
        history: history
    });
}

async function handleCreditHistory(auth, env, monolith) {
    if (!auth || !isValidAuthId(auth.id)) {
        return formatResponse(false, 'Не авторизован');
    }
    const chatId = String(auth.id);
    const history = await getCreditHistory(chatId, env);
    const balance = await getUserBalance(chatId, env, monolith);
    const isVip = await checkVipStatus(chatId, env);
    const isAdmin = await checkAdminStatusAsync(chatId, env);
    return formatResponse(true, null, balance, {
        type: 'credit_history',
        balance: balance,
        isVip: isVip,
        isAdmin: isAdmin,
        history: history
    });
}

// ============================================================
// 👑 VIP — Проверка VIP-статуса из базы
// ============================================================
// VIP = активная подписка: в KV хранится _sub_end_credit с timestamp окончания
// Если timestamp > Date.now() — подписка активна
async function checkVipStatus(chatId, env) {
    if (!env.LAST_PHOTO_STORAGE) return false;
    try {
        // Как в телеграм-боте: ключ = {chatId}_sub_end_credit
        const subEndKey = chatId + '_sub_end_credit';
        const subEnd = await env.LAST_PHOTO_STORAGE.get(subEndKey);
        if (subEnd) {
            const endTime = parseInt(subEnd, 10);
            if (endTime > Date.now()) {
                return true;
            }
        }
    } catch (e) {
        console.error("[WebHandler] VIP check error:", e.message);
    }
    return false;
}

// ============================================================
// 🔑 ADMIN — Проверка прав администратора
// ============================================================
// Проверяет:
// 1. ADMIN_CHAT_ID из env (как в телеграм-боте)
// 2. Список admin_ids из KV (для VK/TG веб-пользователей)
function checkAdminStatus(chatId, env) {
    const adminChatId = env.ADMIN_CHAT_ID;
    // Check env.ADMIN_CHAT_ID (single admin, as in Telegram bot)
    if (adminChatId && String(chatId) === String(adminChatId)) {
        return true;
    }
    // Check KV storage for admin_ids list (supports VK/TG web users)
    if (env.LAST_PHOTO_STORAGE) {
        try {
            // Synchronous check — we'll load from KV via a separate async version
            // For now, the sync check covers the env variable
        } catch(e) {}
    }
    return false;
}

// Async version that also checks KV storage for admin IDs list
async function checkAdminStatusAsync(chatId, env) {
    // First check env.ADMIN_CHAT_ID
    const adminChatId = env.ADMIN_CHAT_ID;
    if (adminChatId && String(chatId) === String(adminChatId)) {
        return true;
    }
    // Then check KV storage for admin_ids list
    if (env.LAST_PHOTO_STORAGE) {
        try {
            const stored = await env.LAST_PHOTO_STORAGE.get('admin_ids');
            if (stored) {
                const adminIds = stored.split(',').map(id => id.trim()).filter(id => id);
                if (adminIds.includes(String(chatId))) {
                    return true;
                }
            }
        } catch(e) {
            console.error("[WebHandler] Admin IDs read error:", e.message);
        }
    }
    return false;
}

// ============================================================
// 💰 БАЛАНС — Чтение и списание кредитов
// ============================================================

async function getUserBalance(chatId, env, monolith) {
    // Сначала проверяем VIP — если активен, баланс = бесконечность
    const isVip = await checkVipStatus(chatId, env);
    if (isVip) return 999999;

    if (env.LAST_PHOTO_STORAGE) {
        try {
            // Как в телеграм-боте: ключ = {chatId}_credit_balance
            const balanceKey = chatId + '_credit_balance';
            const stored = await env.LAST_PHOTO_STORAGE.get(balanceKey);
            if (stored !== null && stored !== undefined) {
                const val = parseInt(stored, 10);
                if (!isNaN(val)) return val;
            }
            // Если баланса нет в базе — создаём начальный (80 бесплатных кредитов)
            await env.LAST_PHOTO_STORAGE.put(balanceKey, '80', { expirationTtl: 86400 * 365 });
            await logCreditTransaction(chatId, 80, 'registration', env, 'Начальные бесплатные кредиты');
            return 80;
        } catch (e) {
            console.error("[WebHandler] Balance read error:", e.message);
        }
    }
    return 0; // Нет доступа к базе = нет кредитов
}

async function deductCredits(chatId, amount, env, monolith) {
    // VIP не тратит кредиты
    const isVip = await checkVipStatus(chatId, env);
    if (isVip) return 999999;

    if (!env.LAST_PHOTO_STORAGE) return null;
    try {
        // Как в телеграм-боте: ключ = {chatId}_credit_balance
        const balanceKey = chatId + '_credit_balance';
        const current = await getUserBalance(chatId, env, monolith);
        const newBalance = Math.max(0, current - amount);
        await env.LAST_PHOTO_STORAGE.put(balanceKey, String(newBalance), { expirationTtl: 86400 * 365 });
        // Log the transaction
        await logCreditTransaction(chatId, -amount, 'spend', env, 'Списание ' + amount + ' кредитов');
        return newBalance;
    } catch (e) {
        console.error("[WebHandler] Credit deduction error:", e.message);
        return null;
    }
}

// Логирование транзакций в KV (ключ = {chatId}_credit_log)
async function logCreditTransaction(chatId, amount, operation, env, details = '') {
    if (!env.LAST_PHOTO_STORAGE) return;
    try {
        const logKey = chatId + '_credit_log';
        let log = [];
        const stored = await env.LAST_PHOTO_STORAGE.get(logKey);
        if (stored) {
            try { log = JSON.parse(stored); } catch(_) {}
        }
        log.unshift({
            ts: Date.now(),
            amount: amount,         // positive = credit, negative = debit
            operation: operation,   // 'purchase', 'spend', 'admin_set', 'vip_daily', 'registration'
            details: details,
            balance_after: null     // will be filled if possible
        });
        // Keep last 100 transactions
        if (log.length > 100) log = log.slice(0, 100);
        await env.LAST_PHOTO_STORAGE.put(logKey, JSON.stringify(log), { expirationTtl: 86400 * 365 });
    } catch (e) {
        console.error("[WebHandler] Credit log error:", e.message);
    }
}

// Get credit transaction history
async function getCreditHistory(chatId, env) {
    if (!env.LAST_PHOTO_STORAGE) return [];
    try {
        const logKey = chatId + '_credit_log';
        const stored = await env.LAST_PHOTO_STORAGE.get(logKey);
        if (stored) {
            try { return JSON.parse(stored); } catch(_) {}
        }
    } catch (e) {
        console.error("[WebHandler] Credit history read error:", e.message);
    }
    return [];
}

// ============================================================
// 📦 УТИЛИТЫ
// ============================================================

function bufferToBase64(buffer) {
    if (Buffer.isBuffer(buffer)) return buffer.toString('base64');
    if (buffer instanceof ArrayBuffer || (buffer && buffer.constructor?.name === 'ArrayBuffer'))
        return Buffer.from(buffer).toString('base64');
    if (typeof buffer === 'string') return buffer;
    return '';
}

function formatResponse(success, error = null, creditsLeft = null, data = null) {
    const response = { success };
    if (error) response.error = error;
    if (creditsLeft !== null) response.credits_left = creditsLeft;
    if (data) response.data = data;
    return response;
}