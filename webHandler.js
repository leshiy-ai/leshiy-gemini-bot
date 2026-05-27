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
            default:
                return formatResponse(false, "Неизвестный режим: " + mode);
        }
    } catch (err) {
        console.error("[WebHandler] Error:", err.message, err.stack);
        return formatResponse(false, "Внутренняя ошибка: " + err.message);
    }
};

// ============================================================
// 🧠 УМНЫЙ ВЫБОР МОДЕЛИ ДЛЯ ВЕБА
// ============================================================
// WORKERS_AI модели работают через Cloudflare REST API если есть креды.
// Иначе подбираем альтернативу из других сервисов.

// Приоритет сервисов для веба (WORKERS_AI через REST API работает!)
const WEB_SERVICE_PRIORITY = ['WORKERS_AI', 'GEMINI', 'KIEAI', 'BOTHUB', 'POLLINATIONS', 'VOICERSS', 'STABILITY', 'FUSIONBRAIN'];

// Явные маппинги: какой ключ модели использовать по умолчанию для каждого типа
// WORKERS_AI модели ПЕРВЫЕ — они бесплатные и быстрые через REST API
const WEB_DEFAULT_MODELS = {
    'TEXT_TO_TEXT':       'TEXT_TO_TEXT_WORKERS_AI',
    'IMAGE_TO_TEXT':     'IMAGE_TO_TEXT_WORKERS_AI',
    'TEXT_TO_IMAGE':     'TEXT_TO_IMAGE_WORKERS_AI',
    'IMAGE_TO_IMAGE':    'IMAGE_TO_IMAGE_WORKERS_AI',
    'IMAGE_TO_UPSCALE':  'IMAGE_TO_UPSCALE_KIEAI',
    'TEXT_TO_VIDEO':     'TEXT_TO_VIDEO_KIEAI',
    'IMAGE_TO_VIDEO':    'IMAGE_TO_VIDEO_KIEAI',
    'VIDEO_TO_VIDEO':    'VIDEO_TO_VIDEO_KIEAI_WAN',
    'AUDIO_TO_VIDEO':    'AUDIO_TO_VIDEO_KIEAI',
    'VIDEO_TO_UPSCALE':  'VIDEO_TO_UPSCALE_KIEAI',
    'VIDEO_TO_ANALYSIS': 'VIDEO_TO_ANALYSIS_GEMINI',
    'TEXT_TO_AUDIO':     'TEXT_TO_AUDIO_WORKERS_AI',
    'AUDIO_TO_TEXT':     'AUDIO_TO_TEXT_WORKERS_AI',
    'VIDEO_TO_TEXT':     'VIDEO_TO_TEXT_WORKERS_AI',
    'AUDIO_TO_AUDIO':    'AUDIO_TO_AUDIO_KIEAI',
};

/**
 * Проверяет, доступен ли Cloudflare REST API
 */
function hasCloudflareRestAPI(env) {
    return !!(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN);
}

/**
 * Выбирает модель для веб-запроса.
 * WORKERS_AI модели РАБОТАЮТ через REST API если есть CLOUDFLARE_ACCOUNT_ID.
 * Если нет — подбираем альтернативу.
 *
 * 1. Если юзер явно указал payload.model → используем её (если доступна)
 * 2. По умолчанию берём из WEB_DEFAULT_MODELS
 * 3. Фоллбэк: ищем первую доступную модель в AI_MODEL_MENU_CONFIG
 */
function getWebModel(serviceType, AI_MODELS, AI_MODEL_MENU_CONFIG, payloadModel, env) {
    const cfAvailable = hasCloudflareRestAPI(env);

    // 1. Явный выбор юзера
    if (payloadModel && AI_MODELS[payloadModel]) {
        const model = AI_MODELS[payloadModel];
        // WORKERS_AI доступна через REST API
        if (model.SERVICE === 'WORKERS_AI' && cfAvailable) {
            return { config: model, key: payloadModel };
        }
        // WORKERS_AI НЕ доступна — подбираем замену
        if (model.SERVICE === 'WORKERS_AI' && !cfAvailable) {
            console.log(`[WebHandler] Model ${payloadModel} is WORKERS_AI but no CF creds, substituting...`);
        } else {
            return { config: model, key: payloadModel };
        }
    }

    // 2. Явный дефолт из таблицы
    const defaultKey = WEB_DEFAULT_MODELS[serviceType];
    if (defaultKey && AI_MODELS[defaultKey]) {
        const model = AI_MODELS[defaultKey];
        if (model.SERVICE === 'WORKERS_AI' && !cfAvailable) {
            // Дефолтная WORKERS_AI недоступна — ищем замену ниже
        } else {
            return { config: model, key: defaultKey };
        }
    }

    // 3. Ищем первую доступную модель в AI_MODEL_MENU_CONFIG
    const menuConfig = AI_MODEL_MENU_CONFIG[serviceType];
    if (menuConfig && menuConfig.models) {
        for (const [modelKey] of Object.entries(menuConfig.models)) {
            const model = AI_MODELS[modelKey];
            if (!model) continue;
            if (model.SERVICE === 'WORKERS_AI' && !cfAvailable) continue;
            return { config: model, key: modelKey };
        }
    }

    // 4. Фоллбэк: перебираем все AI_MODELS по приоритету сервиса
    for (const preferredService of WEB_SERVICE_PRIORITY) {
        if (preferredService === 'WORKERS_AI' && !cfAvailable) continue;
        for (const [modelKey, model] of Object.entries(AI_MODELS)) {
            if (model.SERVICE === preferredService) {
                const modelServiceType = modelKey.split('_').slice(0, 3).join('_');
                if (modelServiceType === serviceType) {
                    return { config: model, key: modelKey };
                }
            }
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
        const base64 = Buffer.isBuffer(imageBuffer) ? imageBuffer.toString('base64') : imageBuffer;
        const prompt = 'Опиши это изображение подробно на русском языке';
        const messages = [{
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
            ]
        }];
        const result = await callCloudflareRestAPI(modelName, { messages }, env);
        return result.result?.response || result.result?.description || JSON.stringify(result.result || result);
    }

    // === STT (Audio → Text / Video → Text) ===
    if (config.FUNCTION.name === 'callWorkersAISpeechToText') {
        const [audioBuffer, env] = args;
        const base64 = Buffer.isBuffer(audioBuffer) ? audioBuffer.toString('base64') : audioBuffer;
        const result = await callCloudflareRestAPI(modelName, {
            audio: base64
        }, env);
        return result.result?.text || result.result?.transcription || JSON.stringify(result.result || result);
    }

    // === TTS (Text → Audio) ===
    if (config.FUNCTION.name === 'callWorkersAITextToAudio') {
        const [text, env, voice] = args;
        const result = await callCloudflareRestAPI(modelName, {
            prompt: text,
            voice: voice || 'female'
        }, env);
        // Возвращаем бинарный результат
        if (result.binary) return result.data;
        return result.result;
    }

    // === TEXT → IMAGE ===
    if (config.FUNCTION.name === 'callWorkersAITextToImage') {
        const [prompt, env] = args;
        const result = await callCloudflareRestAPI(modelName, {
            prompt: prompt
        }, env);
        // Возвращаем бинарный результат (изображение)
        if (result.binary) return result.data;
        return result.result;
    }

    // === IMAGE → IMAGE (img2img) ===
    if (config.FUNCTION.name === 'callWorkersAIImg2Img') {
        const [prompt, env, refImage] = args;
        const imageBase64 = typeof refImage === 'string' ? refImage : Buffer.isBuffer(refImage) ? refImage.toString('base64') : '';
        const result = await callCloudflareRestAPI(modelName, {
            prompt: prompt,
            image: imageBase64
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

    const isAuth = !!(auth && auth.id);
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

    // Определяем тип сервиса
    const hasAttachments = payload.attachments && payload.attachments.length > 0;
    let serviceType = 'TEXT_TO_TEXT';

    if (hasAttachments) {
        const hasImage = payload.attachments.some(a => a.type && a.type.startsWith('image/'));
        const hasAudio = payload.attachments.some(a => a.type && a.type.startsWith('audio/'));
        const hasVideo = payload.attachments.some(a => a.type && a.type.startsWith('video/'));

        if (hasImage) serviceType = 'IMAGE_TO_TEXT';
        else if (hasAudio) serviceType = 'AUDIO_TO_TEXT';
        else if (hasVideo) serviceType = 'VIDEO_TO_TEXT';
    }

    // 🧠 УМНЫЙ ВЫБОР МОДЕЛИ — WORKERS_AI через REST API или другие сервисы
    let finalResponse;
    try {
        const modelInfo = getWebModel(serviceType, AI_MODELS, AI_MODEL_MENU_CONFIG, payload.model, env);
        if (!modelInfo) {
            return formatResponse(false, `Нет доступной модели для ${serviceType}`);
        }
        const config = modelInfo.config;
        const isWorkersAI = config.SERVICE === 'WORKERS_AI';
        console.log(`[WebHandler] Chat using model: ${modelInfo.key} (${config.SERVICE}${isWorkersAI ? ' via REST API' : ''})`);

        if (serviceType === 'IMAGE_TO_TEXT' && hasAttachments) {
            // === VISION ===
            const imageAttachments = payload.attachments.filter(a => a.type && a.type.startsWith('image/'));
            if (imageAttachments.length === 0) {
                return formatResponse(false, 'Нет изображений для распознавания');
            }

            const imageBase64 = imageAttachments[0].base64;
            const imageBuffer = Buffer.from(imageBase64, 'base64');

            if (isWorkersAI) {
                // Cloudflare Workers AI Vision через REST API
                const visionResult = await callWorkersAIWeb(config, imageBuffer, env);
                finalResponse = typeof visionResult === 'string' ? visionResult : String(visionResult);
            } else if (config.FUNCTION.name === 'callGeminiVision') {
                const visionResult = await config.FUNCTION(config, imageBuffer, env);
                if (typeof visionResult === 'string') {
                    finalResponse = visionResult;
                } else {
                    const cleaned = extractAndCleanModelResponse(visionResult);
                    finalResponse = cleaned.finalResponse || String(visionResult);
                }
            } else if (config.FUNCTION.name === 'callPollinationsVision' || config.FUNCTION.name === 'callBotHubVisionChat') {
                const visionPrompt = userMessage || 'Опиши это изображение подробно';
                const visionResult = await config.FUNCTION(config, visionPrompt, env, imageBase64);
                if (typeof visionResult === 'string') {
                    finalResponse = visionResult;
                } else {
                    const cleaned = extractAndCleanModelResponse(visionResult);
                    finalResponse = cleaned.finalResponse || String(visionResult);
                }
            } else {
                const fileInfo = payload.attachments.map(a => a.name).join(', ');
                const combinedMessage = userMessage ? `${userMessage}\n\n[Прикреплены файлы: ${fileInfo}]` : `Пользователь прикрепил файлы: ${fileInfo}. Опиши их.`;
                const modelResponse = await config.FUNCTION(config, historyForModel, combinedMessage, env);
                const cleaned = extractAndCleanModelResponse(modelResponse);
                finalResponse = cleaned.finalResponse;
            }
        } else if (serviceType === 'AUDIO_TO_TEXT' && hasAttachments) {
            const audioAttachments = payload.attachments.filter(a => a.type && a.type.startsWith('audio/'));
            if (audioAttachments.length > 0) {
                const audioBase64 = audioAttachments[0].base64;
                const audioBuffer = Buffer.from(audioBase64, 'base64');
                let result;
                if (isWorkersAI) {
                    result = await callWorkersAIWeb(config, audioBuffer, env);
                } else if (config.FUNCTION.name === 'callGeminiSpeechToText') {
                    result = await config.FUNCTION(config, audioBuffer, env);
                } else {
                    result = await config.FUNCTION(config, audioBase64, env);
                }
                if (typeof result === 'string') {
                    finalResponse = result;
                } else {
                    const cleaned = extractAndCleanModelResponse(result);
                    finalResponse = cleaned.finalResponse || String(result);
                }
            }
        } else if (serviceType === 'VIDEO_TO_TEXT' && hasAttachments) {
            const videoAttachments = payload.attachments.filter(a => a.type && a.type.startsWith('video/'));
            if (videoAttachments.length > 0) {
                const videoBase64 = videoAttachments[0].base64;
                const videoBuffer = Buffer.from(videoBase64, 'base64');
                let result;
                if (isWorkersAI) {
                    result = await callWorkersAIWeb(config, videoBuffer, env);
                } else if (config.FUNCTION.name === 'callGeminiSpeechToText') {
                    result = await config.FUNCTION(config, videoBuffer, env);
                } else {
                    result = await config.FUNCTION(config, videoBase64, env);
                }
                if (typeof result === 'string') {
                    finalResponse = result;
                } else {
                    const cleaned = extractAndCleanModelResponse(result);
                    finalResponse = cleaned.finalResponse || String(result);
                }
            }
        } else {
            // Обычный текстовый чат
            let modelResponse;
            if (isWorkersAI) {
                modelResponse = await callWorkersAIWeb(config, historyForModel, userMessage, env);
            } else {
                modelResponse = await config.FUNCTION(config, historyForModel, userMessage, env);
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
    const isAuth = !!(auth && auth.id);
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
            console.log(`[WebHandler] Upscale using: ${modelInfo.key}`);
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
                const response = await fetch(`${baseUrl}/rotate?angle=${angle}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    body: imageBuffer
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

        try {
            const converterUrl = getConverterUrl(env);
            if (converterUrl) {
                const baseUrl = converterUrl.endsWith('/') ? converterUrl.slice(0, -1) : converterUrl;
                const imageBuffer = Buffer.from(payload.image_base64, 'base64');
                const response = await fetch(`${baseUrl}/convert-image?format=${targetFormat}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    body: imageBuffer
                });
                if (!response.ok) throw new Error('Ошибка конвертера: ' + response.status);
                const resultBuffer = Buffer.from(await response.arrayBuffer());
                const resultBase64 = resultBuffer.toString('base64');
                return formatResponse(true, null, null, { type: 'image_base64', content: resultBase64 });
            }
            return formatResponse(false, 'Конвертер недоступен');
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
            if (modelInfo.config.SERVICE === 'WORKERS_AI') {
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

    if (!isFreeModel) {
        if (!isAuth) return formatResponse(false, 'Для платных моделей нужна авторизация');
        const balance = await getUserBalance(chatId, env, monolith);
        if (balance < 4) return formatResponse(false, 'Недостаточно кредитов. Нужно 4¢.', balance);
    }

    let imageResult;
    try {
        console.log(`[WebHandler] T2I using: ${modelInfo.key} (${modelInfo.config.SERVICE})`);
        if (modelInfo.config.SERVICE === 'WORKERS_AI') {
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
function formatImageResult(imageResult, creditsLeft, uploadBase64ImageToPublicUrl, env, chatId) {
    // Gemini text2image / image2image могут вернуть {imageBase64, mimeType} или просто base64
    if (imageResult && typeof imageResult === 'object' && imageResult.imageBase64) {
        return formatResponse(true, null, creditsLeft, { type: 'image_base64', content: imageResult.imageBase64 });
    }
    // Gemini может вернуть {url, ...}
    if (imageResult && typeof imageResult === 'object' && imageResult.url) {
        return formatResponse(true, null, creditsLeft, { type: 'image_url', content: imageResult.url });
    }
    // ArrayBuffer / Uint8Array
    if (imageResult instanceof ArrayBuffer || (imageResult && imageResult.constructor?.name === 'ArrayBuffer')) {
        const base64 = Buffer.from(imageResult).toString('base64');
        // Пробуем загрузить в публичный URL
        if (uploadBase64ImageToPublicUrl) {
            try {
                const imageUrl = uploadBase64ImageToPublicUrl(base64, env, chatId);
                if (imageUrl && typeof imageUrl === 'string') {
                    return formatResponse(true, null, creditsLeft, { type: 'image_url', content: imageUrl });
                }
                // Может быть Promise
                if (imageUrl && typeof imageUrl.then === 'function') {
                    // Асинхронная загрузка — возвращаем base64 сразу
                }
            } catch (e) {
                // fallback to base64
            }
        }
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
    // Promise (не должно быть)
    if (imageResult && typeof imageResult.then === 'function') {
        return formatResponse(false, 'Асинхронный результат не поддерживается');
    }

    return formatResponse(false, 'Неожиданный формат ответа от ИИ: ' + typeof imageResult);
}

// ============================================================
// 🎬 ВИДЕО — Поддержка generate, convert, upscale, rotate
// ============================================================
async function handleVideo(auth, payload, env, monolith) {
    const { AI_MODELS, AI_MODEL_MENU_CONFIG, extractAndCleanModelResponse } = monolith;
    const isAuth = !!(auth && auth.id);
    const chatId = isAuth ? String(auth.id) : 'guest';
    const videoMode = payload.video_mode || 'generate';

    // === CONVERT / ANALYSIS (бесплатно) ===
    if (videoMode === 'convert') {
        if (!payload.video_base64) return formatResponse(false, 'Нет видеофайла для анализа');
        const prompt = (payload.prompt || 'Проанализируй это видео подробно').trim();

        let result;
        try {
            const modelInfo = getWebModel('VIDEO_TO_ANALYSIS', AI_MODELS, AI_MODEL_MENU_CONFIG, payload.model, env);
            if (!modelInfo) return formatResponse(false, 'Нет модели для анализа видео');
            console.log(`[WebHandler] Video analysis using: ${modelInfo.key}`);

            const config = modelInfo.config;
            if (config.FUNCTION.name === 'callGeminiVideoVision') {
                result = await config.FUNCTION(config, prompt, env, payload.video_base64);
            } else {
                result = await config.FUNCTION(config, prompt, env, payload.video_base64);
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
                const response = await fetch(`${baseUrl}/rotate-video?angle=${angle}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    body: videoBuffer
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
    const isAuth = !!(auth && auth.id);
    const chatId = isAuth ? String(auth.id) : 'guest';
    const audioMode = payload.audio_mode || 'tts';

    // === STT (Speech-to-Text, бесплатно) ===
    if (audioMode === 'stt') {
        if (!payload.audio_base64) return formatResponse(false, 'Нет аудиофайла для распознавания');

        let result;
        try {
            const modelInfo = getWebModel('AUDIO_TO_TEXT', AI_MODELS, AI_MODEL_MENU_CONFIG, payload.model, env);
            if (!modelInfo) return formatResponse(false, 'Нет модели для распознавания');
            console.log(`[WebHandler] STT using: ${modelInfo.key}`);

            const config = modelInfo.config;
            if (config.FUNCTION.name === 'callGeminiSpeechToText') {
                // Gemini STT принимает Buffer
                const audioBuffer = Buffer.from(payload.audio_base64, 'base64');
                result = await config.FUNCTION(config, audioBuffer, env);
            } else {
                result = await config.FUNCTION(config, payload.audio_base64, env);
            }
            if (typeof result === 'string') {
                return formatResponse(true, null, null, { type: 'text', content: result });
            }
            const cleaned = extractAndCleanModelResponse(result);
            return formatResponse(true, null, null, { type: 'text', content: cleaned.finalResponse || String(result) });
        } catch (e) {
            console.error("[WebHandler] STT error:", e.message);
            return formatResponse(false, "Ошибка распознавания: " + e.message);
        }
    }

    // === CONVERT (бесплатно через конвертер) ===
    if (audioMode === 'convert') {
        if (!payload.audio_base64) return formatResponse(false, 'Нет аудиофайла для конвертации');
        const targetFormat = payload.target_format || 'mp3';

        try {
            const converterUrl = getConverterUrl(env);
            if (converterUrl) {
                const baseUrl = converterUrl.endsWith('/') ? converterUrl.slice(0, -1) : converterUrl;
                const audioBuffer = Buffer.from(payload.audio_base64, 'base64');
                const response = await fetch(`${baseUrl}/convert-audio?format=${targetFormat}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    body: audioBuffer
                });
                if (!response.ok) throw new Error('Ошибка конвертера: ' + response.status);
                const resultBuffer = Buffer.from(await response.arrayBuffer());
                const resultBase64 = resultBuffer.toString('base64');
                return formatResponse(true, null, null, { type: 'audio_base64', content: resultBase64 });
            }
            return formatResponse(false, 'Конвертер недоступен');
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

    if (!isAuth) return formatResponse(false, 'Для озвучки нужна авторизация');
    const balance = await getUserBalance(chatId, env, monolith);
    if (balance < 2) return formatResponse(false, 'Недостаточно кредитов. Нужно 2¢.', balance);

    let audioResult;
    try {
        const modelInfo = getWebModel('TEXT_TO_AUDIO', AI_MODELS, AI_MODEL_MENU_CONFIG, payload.model, env);
        if (!modelInfo) return formatResponse(false, 'Нет модели для TTS');
        const config = modelInfo.config;
        const voice = payload.voice || 'Female';

        console.log(`[WebHandler] TTS using: ${modelInfo.key} (${config.SERVICE}), voice: ${voice}`);

        // Вызываем TTS-функцию с правильной сигнатурой
        if (config.SERVICE === 'WORKERS_AI') {
            // Workers AI TTS через Cloudflare REST API
            audioResult = await callWorkersAIWeb(config, text, env, voice);
        } else if (config.SERVICE === 'GEMINI' || config.FUNCTION.name === 'callGeminiTextToAudio') {
            audioResult = await config.FUNCTION(config, text, env, voice);
        } else if (config.SERVICE === 'VOICERSS' || config.FUNCTION.name === 'callVoiceRSSTextToAudio') {
            audioResult = await config.FUNCTION(config, text, env, voice);
        } else {
            // KIE.AI, BotHub и прочие — пробуем с voice
            try { audioResult = await config.FUNCTION(config, text, env, voice); }
            catch(_) { audioResult = await config.FUNCTION(config, text, env); }
        }
    } catch (e) {
        console.error("[WebHandler] Audio gen error:", e.message);
        return formatResponse(false, "Ошибка генерации аудио: " + e.message);
    }

    let creditsLeft = null;
    if (isAuth) {
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
        'TEXT_TO_AUDIO':    { target: 'audio_tts',     freeByDefault: false },
        'AUDIO_TO_TEXT':    { target: 'audio_stt',     freeByDefault: true  },
        'VIDEO_TO_TEXT':    { target: 'audio_stt',     freeByDefault: true  },
        'AUDIO_TO_AUDIO':   { target: 'audio_stt',     freeByDefault: true  },
    };

    const hasCloudflare = !!(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN);

    for (const [serviceType, menuConfig] of Object.entries(AI_MODEL_MENU_CONFIG)) {
        const mapping = serviceMapping[serviceType];
        if (!mapping) continue;
        const targetArray = models[mapping.target];
        if (!targetArray) continue;

        for (const [modelKey, friendlyName] of Object.entries(menuConfig.models)) {
            const modelDetails = AI_MODELS[modelKey];
            if (!modelDetails) continue;

            // 🛑 Скрываем WORKERS_AI модели если нет Cloudflare кредов
            if (modelDetails.SERVICE === 'WORKERS_AI' && !hasCloudflare) continue;

            const isFree = mapping.freeByDefault || !modelDetails.pricing || modelDetails.SERVICE === 'WORKERS_AI';
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

    const hasCloudflare = !!(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN);
    const safeModels = {};

    for (const [key, val] of Object.entries(AI_MODELS)) {
        if (!val || typeof val !== 'object') continue;
        // Скрываем WORKERS_AI если нет Cloudflare
        if (val.SERVICE === 'WORKERS_AI' && !hasCloudflare) continue;

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
// 💰 БАЛАНС — Запрос текущего баланса
// ============================================================
async function handleBalance(auth, env, monolith) {
    if (!auth || !auth.id) {
        return formatResponse(false, 'Не авторизован');
    }
    const chatId = String(auth.id);
    const balance = await getUserBalance(chatId, env, monolith);
    const isVip = false; // TODO: implement VIP check

    return formatResponse(true, null, balance, { type: 'balance', balance: balance, isVip: isVip });
}

// ============================================================
// 💰 БАЛАНС — Чтение и списание кредитов
// ============================================================

async function getUserBalance(chatId, env, monolith) {
    if (env.LAST_PHOTO_STORAGE) {
        try {
            const balanceKey = `users/${chatId}/balance`;
            const stored = await env.LAST_PHOTO_STORAGE.get(balanceKey);
            if (stored) return parseInt(stored, 10);
        } catch (e) {
            console.error("[WebHandler] Balance read error:", e.message);
        }
    }
    return 80;
}

async function deductCredits(chatId, amount, env, monolith) {
    if (!env.LAST_PHOTO_STORAGE) return null;
    try {
        const balanceKey = `users/${chatId}/balance`;
        const current = await getUserBalance(chatId, env, monolith);
        const newBalance = Math.max(0, current - amount);
        await env.LAST_PHOTO_STORAGE.put(balanceKey, String(newBalance), { expirationTtl: 86400 * 365 });
        return newBalance;
    } catch (e) {
        console.error("[WebHandler] Credit deduction error:", e.message);
        return null;
    }
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