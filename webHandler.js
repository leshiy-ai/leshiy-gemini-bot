// ============================================================
// webHandler.js — Изолированный Шлюз для Веб-фронтенда
// ============================================================
// Не трогает Telegram-логику. Принимает JSON от фронтенда,
// вызывает функции монолита, возвращает чистый JSON.
//
// Контракт запроса:
//   { mode, auth: {provider, id, hash}, payload: {...} }
//
// Контракт ответа:
//   { success, error, credits_left, data: {type, content} }
// ============================================================

module.exports.handleWebRequest = async function(body, env, monolith) {
    const { mode, auth, payload } = body;

    try {
        switch (mode) {
            case 'chat':     return await handleChat(auth, payload, env, monolith);
            case 'image':    return await handleImage(auth, payload, env, monolith);
            case 'video':    return await handleVideo(auth, payload, env, monolith);
            case 'audio':    return await handleAudio(auth, payload, env, monolith);
            case 'balance':  return await handleBalance(auth, env, monolith);
            case 'models':   return handleModels(monolith);
            default:         return formatResponse(false, "Неизвестный режим: " + mode);
        }
    } catch (err) {
        console.error("[WebHandler] Error:", err.message, err.stack);
        return formatResponse(false, "Внутренняя ошибка: " + err.message);
    }
};

// ============================================================
// 📋 МОДЕЛИ — Список доступных моделей для фронтенда
// ============================================================
function handleModels(monolith) {
    const { AI_MODELS, AI_MODEL_MENU_CONFIG } = monolith;
    if (!AI_MODELS || !AI_MODEL_MENU_CONFIG) {
        return { success: true, data: { chat: [], image: [], video: [], audio_tts: [], audio_stt: [] } };
    }

    const result = { chat: [], image: [], video: [], audio_tts: [], audio_stt: [] };

    // Маппинг типов сервисов монолита → режимы веба
    const serviceToMode = {
        'TEXT_TO_TEXT':  'chat',
        'TEXT_TO_IMAGE': 'image',
        'TEXT_TO_VIDEO': 'video',
        'TEXT_TO_AUDIO': 'audio_tts',
        'AUDIO_TO_TEXT': 'audio_stt',
    };

    for (const [serviceType, serviceConfig] of Object.entries(AI_MODEL_MENU_CONFIG)) {
        const webMode = serviceToMode[serviceType];
        if (!webMode) continue;

        for (const [modelKey, friendlyName] of Object.entries(serviceConfig.models)) {
            const modelConfig = AI_MODELS[modelKey];
            if (!modelConfig) continue;

            const pricing = modelConfig.pricing;
            const isFree = !pricing || pricing === 0;
            const cost = typeof pricing === 'number' ? pricing : 0;
            const isDynamicPricing = typeof pricing === 'object' && pricing !== null;
            const isAsync = modelConfig.SERVICE === 'KIEAI';

            result[webMode].push({
                key: modelKey,
                name: friendlyName,
                service: modelConfig.SERVICE,
                model: modelConfig.MODEL,
                isFree,
                cost,
                isAsync,
                isDynamicPricing,
                pricing: pricing || null
            });
        }
    }

    return { success: true, data: result };
}

// ============================================================
// 🟢 ЧАТ — Бесплатно для всех (гости + авторизованные)
// ============================================================
async function handleChat(auth, payload, env, monolith) {
    const userMessage = (payload.prompt || '').trim();
    if (!userMessage) return formatResponse(false, 'Пустое сообщение');

    const { AI_MODELS, extractAndCleanModelResponse, syncS3Chat } = monolith;
    const isAuth = !!(auth && auth.id);
    const chatId = isAuth ? String(auth.id) : 'guest';

    // Определяем модель из payload или по умолчанию
    const modelKey = payload.model || 'TEXT_TO_TEXT_GEMINI';
    const modelConfig = AI_MODELS[modelKey];
    if (!modelConfig) return formatResponse(false, 'Модель не найдена: ' + modelKey);

    // История из localStorage фронтенда → формат для AI-функций
    const browserHistory = payload.history || [];
    let historyForModel = browserHistory.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        text: m.content
    }));

    // Авторизованный пользователь — синхронизируем с S3
    if (isAuth && syncS3Chat) {
        try {
            const s3History = await syncS3Chat(chatId, userMessage, 'user', env);
            historyForModel = s3History.map(m => ({
                role: m.role === 'ai' ? 'model' : 'user',
                text: m.content
            }));
        } catch (e) {
            console.error("[WebHandler] S3 sync error (chat):", e.message);
            // Падаем на localStorage-историю
        }
    }

    // Вызываем AI-модель (единый интерфейс: config, history, message, env)
    let finalResponse;
    try {
        const modelResponse = await modelConfig.FUNCTION(modelConfig, historyForModel, userMessage, env);
        const cleaned = extractAndCleanModelResponse(modelResponse);
        finalResponse = cleaned.finalResponse;
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
// 🎨 ИЗОБРАЖЕНИЕ — Бесплатный SDXL или платные (4¢)
// ============================================================
async function handleImage(auth, payload, env, monolith) {
    const prompt = (payload.prompt || '').trim();
    if (!prompt) return formatResponse(false, 'Пустой промпт');

    const { AI_MODELS, uploadBase64ImageToPublicUrl, createTaskKieAi } = monolith;
    const isAuth = !!(auth && auth.id);
    const chatId = isAuth ? String(auth.id) : 'guest';
    const modelKey = payload.model || 'TEXT_TO_IMAGE_WORKERS_AI';
    const modelConfig = AI_MODELS[modelKey];
    if (!modelConfig) return formatResponse(false, 'Модель не найдена: ' + modelKey);

    const pricing = modelConfig.pricing;
    const isFree = !pricing || pricing === 0;
    const cost = typeof pricing === 'number' ? pricing : 0;
    const isKieAi = modelConfig.SERVICE === 'KIEAI';

    // Платная модель → проверяем авторизацию и баланс
    if (!isFree) {
        if (!isAuth) {
            return formatResponse(false, 'Для платных моделей нужна авторизация. Войдите через Telegram.');
        }
        const balanceCheck = await checkWebBalance(chatId, cost, env);
        if (!balanceCheck.canProceed) {
            return formatResponse(false, `Недостаточно кредитов. Нужно ${cost}¢, у вас ${balanceCheck.balance}¢. Пополните баланс.`, balanceCheck.balance);
        }
    }

    // Референсные изображения (до 4 штук, base64)
    const referenceImages = payload.reference_images || [];

    // ---- Синхронные сервисы (Workers AI, Gemini, BotHub, Pollinations, Kandinsky, Stability) ----
    if (!isKieAi) {
        let imageResult;
        try {
            // Универсальный вызов T2I: config, prompt, envData[, chatId][, options]
            const options = {};
            if (referenceImages.length > 0) {
                options.reference_images = referenceImages; // передаём как массив base64
                options.aspect_ratio = payload.aspect_ratio || payload.ratio || '1:1';
            }
            if (modelConfig.FUNCTION.length >= 5) {
                imageResult = await modelConfig.FUNCTION(modelConfig, prompt, env, chatId, options);
            } else if (modelConfig.FUNCTION.length >= 4) {
                imageResult = await modelConfig.FUNCTION(modelConfig, prompt, env, chatId);
            } else {
                imageResult = await modelConfig.FUNCTION(modelConfig, prompt, env);
            }
        } catch (e) {
            console.error("[WebHandler] Image gen error:", e.message);
            return formatResponse(false, "Ошибка генерации: " + e.message);
        }

        // Списываем кредиты за платную модель
        let creditsLeft = null;
        if (!isFree && isAuth) {
            const deductResult = await deductWebCredits(chatId, cost, env);
            creditsLeft = deductResult.balance;
        }

        // Конвертируем результат в URL или base64
        return processImageResult(imageResult, prompt, chatId, env, uploadBase64ImageToPublicUrl, creditsLeft);
    }

    // ---- Асинхронный сервис KIE.AI ----
    if (!isAuth) {
        return formatResponse(false, 'Для генерации через KIE.AI нужна авторизация.');
    }

    let taskId;
    try {
        const callbackUrl = env.WORKER_DOMAIN
            ? `${env.WORKER_DOMAIN.startsWith('http') ? env.WORKER_DOMAIN : 'https://' + env.WORKER_DOMAIN}/api/kieai-callback?chatId=${chatId}&source=web`
            : null;

        const input = {
            prompt: prompt,
            output_format: 'png',
            aspect_ratio: payload.aspect_ratio || '1:1',
            image_size: payload.aspect_ratio || '1:1'
        };
        // Референсные изображения для KIE.AI (img2img)
        if (referenceImages.length > 0) {
            input.reference_images = referenceImages;
        }

        taskId = await createTaskKieAi(chatId, modelConfig, input, env, callbackUrl);
    } catch (e) {
        console.error("[WebHandler] KIE.AI image task error:", e.message);
        return formatResponse(false, "Ошибка создания задачи: " + e.message);
    }

    if (!taskId) {
        return formatResponse(false, 'Не удалось создать задачу генерации изображения');
    }

    // Сохраняем taskId в KV для последующего поллинга
    const taskKey = chatId + '_active_image_task';
    if (env.LAST_PHOTO_STORAGE) {
        await env.LAST_PHOTO_STORAGE.put(taskKey, JSON.stringify({
            taskId: taskId,
            model: modelConfig.MODEL,
            source: 'web'
        }), { expirationTtl: 86400 });
    }

    // Списываем кредиты
    const deductResult = await deductWebCredits(chatId, cost, env);

    return formatResponse(true, null, deductResult.balance, {
        type: 'image_task',
        content: taskId  // Фронтенд будет поллить /api/image/status?taskId=
    });
}

// Обработка результата генерации изображения (синхронные сервисы)
function processImageResult(imageResult, prompt, chatId, env, uploadBase64ImageToPublicUrl, creditsLeft) {
    let imageUrl = null;

    if (imageResult instanceof ArrayBuffer || (imageResult && imageResult.constructor?.name === 'ArrayBuffer')) {
        // Бинарное изображение — сохраняем в KV и отдаём URL
        if (uploadBase64ImageToPublicUrl) {
            try {
                const base64 = Buffer.from(imageResult).toString('base64');
                imageUrl = uploadBase64ImageToPublicUrl(base64, env, chatId);
            } catch (e) {
                // Фолбэк — возвращаем base64
                const base64 = Buffer.from(imageResult).toString('base64');
                return formatResponse(true, null, creditsLeft, { type: 'image_base64', content: base64 });
            }
        } else {
            const base64 = Buffer.from(imageResult).toString('base64');
            return formatResponse(true, null, creditsLeft, { type: 'image_base64', content: base64 });
        }
    } else if (typeof imageResult === 'string') {
        if (imageResult.startsWith('http')) {
            imageUrl = imageResult;
        } else {
            return formatResponse(true, null, creditsLeft, { type: 'image_base64', content: imageResult });
        }
    } else if (imageResult && imageResult.url) {
        imageUrl = imageResult.url;
    }

    if (!imageUrl) {
        return formatResponse(false, 'Неожиданный формат ответа от ИИ');
    }

    return formatResponse(true, null, creditsLeft, {
        type: 'image_url',
        content: imageUrl
    });
}

// ============================================================
// 🎬 ВИДЕО — Платно (20¢+), асинхронно через KIE.AI
// ============================================================
async function handleVideo(auth, payload, env, monolith) {
    const prompt = (payload.prompt || '').trim();
    if (!prompt) return formatResponse(false, 'Пустой промпт');

    const { AI_MODELS, createTaskKieAi } = monolith;
    const isAuth = !!(auth && auth.id);
    const chatId = isAuth ? String(auth.id) : 'guest';
    const modelKey = payload.model || 'TEXT_TO_VIDEO_KIEAI';
    const modelConfig = AI_MODELS[modelKey];
    if (!modelConfig) return formatResponse(false, 'Модель не найдена: ' + modelKey);

    // Видео — только для авторизованных
    if (!isAuth) {
        return formatResponse(false, 'Для генерации видео нужна авторизация. Войдите через Telegram.');
    }

    // Рассчитываем стоимость
    const pricing = modelConfig.pricing;
    const isDynamicPricing = typeof pricing === 'object' && pricing !== null;
    const cost = typeof pricing === 'number' ? pricing : 20; // Дефолт 20¢

    // Для динамического прайсинга — предварительная оценка
    let estimatedCost = cost;
    if (isDynamicPricing) {
        const quality = payload.quality || '480p';
        const duration = parseInt(payload.duration) || 6;
        const rate = pricing[quality] || pricing['480p'] || 6;
        estimatedCost = Math.ceil(rate * duration);
    }

    // Проверка баланса
    const balanceCheck = await checkWebBalance(chatId, estimatedCost, env);
    if (!balanceCheck.canProceed) {
        return formatResponse(false, `Недостаточно кредитов. Нужно ~${estimatedCost}¢, у вас ${balanceCheck.balance}¢. Пополните баланс.`, balanceCheck.balance);
    }

    // Создаём задачу KIE.AI
    let taskId;
    try {
        const callbackUrl = env.WORKER_DOMAIN
            ? `${env.WORKER_DOMAIN.startsWith('http') ? env.WORKER_DOMAIN : 'https://' + env.WORKER_DOMAIN}/api/kieai-callback?chatId=${chatId}&source=web`
            : null;

        const input = {
            prompt: prompt,
            aspect_ratio: payload.aspect_ratio || '16:9',
            duration: payload.duration || '6',
            quality: payload.quality || '480p',
            mode: payload.video_mode || 'normal'
        };
        // Референсные медиа для видео (image/video/audio, base64)
        if (payload.reference_image) input.reference_image = payload.reference_image;
        if (payload.reference_audio) input.reference_audio = payload.reference_audio;
        if (payload.reference_video) input.reference_video = payload.reference_video;

        taskId = await createTaskKieAi(chatId, modelConfig, input, env, callbackUrl);
    } catch (e) {
        console.error("[WebHandler] Video task error:", e.message);
        return formatResponse(false, "Ошибка создания задачи видео: " + e.message);
    }

    if (!taskId) {
        return formatResponse(false, 'Не удалось создать задачу генерации видео');
    }

    // Списываем кредиты (для динамического прайсинга — предварительная сумма)
    const deductResult = await deductWebCredits(chatId, estimatedCost, env);

    return formatResponse(true, null, deductResult.balance, {
        type: 'video_task',
        content: taskId,
        estimated_cost: estimatedCost
    });
}

// ============================================================
// 🔊 АУДИО — TTS (платно/бесплатно), STT (бесплатно)
// ============================================================
async function handleAudio(auth, payload, env, monolith) {
    const audioMode = payload.audio_mode || 'tts'; // 'tts' или 'stt'
    const isAuth = !!(auth && auth.id);
    const chatId = isAuth ? String(auth.id) : 'guest';

    if (audioMode === 'tts') {
        return await handleTTS(auth, payload, env, monolith, chatId, isAuth);
    } else {
        return await handleSTT(auth, payload, env, monolith, chatId, isAuth);
    }
}

// TTS — Озвучка текста
async function handleTTS(auth, payload, env, monolith, chatId, isAuth) {
    const text = (payload.text || payload.prompt || '').trim();
    if (!text) return formatResponse(false, 'Пустой текст для озвучки');

    const { AI_MODELS } = monolith;
    const modelKey = payload.model || 'TEXT_TO_AUDIO_GEMINI';
    const modelConfig = AI_MODELS[modelKey];
    if (!modelConfig) return formatResponse(false, 'Модель не найдена: ' + modelKey);

    const pricing = modelConfig.pricing;
    const isFree = !pricing || pricing === 0;
    const cost = typeof pricing === 'number' ? pricing : 0;
    const voice = payload.voice || 'Female';
    const isKieAi = modelConfig.SERVICE === 'KIEAI';

    // Платная модель → проверка
    if (!isFree) {
        if (!isAuth) {
            return formatResponse(false, 'Для платной озвучки нужна авторизация. Войдите через Telegram.');
        }
        const balanceCheck = await checkWebBalance(chatId, cost, env);
        if (!balanceCheck.canProceed) {
            return formatResponse(false, `Недостаточно кредитов. Нужно ${cost}¢, у вас ${balanceCheck.balance}¢.`, balanceCheck.balance);
        }
    }

    // ---- Синхронные TTS (Gemini, VoiceRSS, Workers AI) ----
    if (!isKieAi) {
        let audioBuffer;
        try {
            // Функции TTS принимают (config, text, env, voice)
            audioBuffer = await modelConfig.FUNCTION(modelConfig, text, env, voice);
        } catch (e) {
            console.error("[WebHandler] TTS error:", e.message);
            return formatResponse(false, "Ошибка озвучки: " + e.message);
        }

        // Списываем кредиты за платную модель
        let creditsLeft = null;
        if (!isFree && isAuth) {
            const deductResult = await deductWebCredits(chatId, cost, env);
            creditsLeft = deductResult.balance;
        }

        // Конвертируем в base64 для передачи в JSON
        const audioBase64 = bufferToBase64(audioBuffer);
        if (!audioBase64) return formatResponse(false, 'Неожиданный формат аудио');

        return formatResponse(true, null, creditsLeft, {
            type: 'audio_base64',
            content: audioBase64
        });
    }

    // ---- Асинхронный KIE.AI TTS (ElevenLabs) ----
    if (!isAuth) {
        return formatResponse(false, 'Для ElevenLabs озвучки нужна авторизация.');
    }

    const { createTaskKieAi } = monolith;
    let taskId;
    try {
        const callbackUrl = env.WORKER_DOMAIN
            ? `${env.WORKER_DOMAIN.startsWith('http') ? env.WORKER_DOMAIN : 'https://' + env.WORKER_DOMAIN}/api/kieai-callback?chatId=${chatId}&source=web`
            : null;

        const input = { text: text, voice: voice };
        taskId = await createTaskKieAi(chatId, modelConfig, input, env, callbackUrl);
    } catch (e) {
        console.error("[WebHandler] KIE.AI TTS task error:", e.message);
        return formatResponse(false, "Ошибка создания задачи озвучки: " + e.message);
    }

    if (!taskId) {
        return formatResponse(false, 'Не удалось создать задачу озвучки');
    }

    // Списываем кредиты
    const deductResult = await deductWebCredits(chatId, cost, env);

    return formatResponse(true, null, deductResult.balance, {
        type: 'audio_task',
        content: taskId
    });
}

// STT — Транскрипция аудио (бесплатно)
async function handleSTT(auth, payload, env, monolith, chatId, isAuth) {
    // STT требует аудиофайл — пока поддерживаем через base64
    const audioBase64 = payload.audio_base64;
    if (!audioBase64) {
        return formatResponse(false, 'Нет аудиоданных. Отправьте audio_base64 в payload.');
    }

    const { AI_MODELS } = monolith;
    const modelKey = payload.model || 'AUDIO_TO_TEXT_WORKERS_AI';
    const modelConfig = AI_MODELS[modelKey];
    if (!modelConfig) return formatResponse(false, 'Модель не найдена: ' + modelKey);

    try {
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        const transcript = await modelConfig.FUNCTION(modelConfig, audioBuffer, env);
        return formatResponse(true, null, null, {
            type: 'text',
            content: transcript
        });
    } catch (e) {
        console.error("[WebHandler] STT error:", e.message);
        return formatResponse(false, "Ошибка распознавания: " + e.message);
    }
}

// ============================================================
// 💰 БАЛАНС — Запрос текущего баланса
// ============================================================
async function handleBalance(auth, env, monolith) {
    if (!auth || !auth.id) {
        return formatResponse(false, 'Не авторизован');
    }
    const chatId = String(auth.id);
    const balanceInfo = await getWebBalance(chatId, env);
    return formatResponse(true, null, balanceInfo.balance, { type: 'balance', balance: balanceInfo.balance, isVip: balanceInfo.isVip });
}

// ============================================================
// 💰 БАЛАНС — Чтение и списание (те же KV-ключи что в TG-боте)
// ============================================================

// Получить баланс (число или 'VIP')
async function getWebBalance(chatId, env) {
    const storage = env.LAST_PHOTO_STORAGE;
    if (!storage) return { balance: 80, isVip: false };

    const chatKey = String(chatId);
    const BALANCE_KEY = chatKey + '_credit_balance';
    const SUBSCRIPTION_END_KEY = chatKey + '_sub_end_credit';

    // 1. Проверяем подписку (VIP)
    const now = Date.now();
    try {
        const subEndStr = await storage.get(SUBSCRIPTION_END_KEY);
        const subEndTime = parseInt(subEndStr);
        if (subEndTime && subEndTime > now) {
            return { balance: 999999, isVip: true };
        }
    } catch (e) {}

    // 2. Читаем баланс
    try {
        let balanceStr = await storage.get(BALANCE_KEY);
        let balance = parseInt(balanceStr);
        if (isNaN(balance)) balance = 80; // FREE_LIMIT
        return { balance, isVip: false };
    } catch (e) {
        return { balance: 80, isVip: false };
    }
}

// Проверить, достаточно ли кредитов (без списания)
async function checkWebBalance(chatId, cost, env) {
    const info = await getWebBalance(chatId, env);
    if (info.isVip) return { canProceed: true, balance: 'VIP' };
    if (info.balance >= cost) return { canProceed: true, balance: info.balance };
    return { canProceed: false, balance: info.balance };
}

// Списать кредиты (после успешной генерации)
async function deductWebCredits(chatId, cost, env) {
    const storage = env.LAST_PHOTO_STORAGE;
    if (!storage) return { balance: null };

    const chatKey = String(chatId);
    const BALANCE_KEY = chatKey + '_credit_balance';
    const SUBSCRIPTION_END_KEY = chatKey + '_sub_end_credit';

    // Проверяем подписку
    try {
        const subEndStr = await storage.get(SUBSCRIPTION_END_KEY);
        const subEndTime = parseInt(subEndStr);
        if (subEndTime && subEndTime > Date.now()) {
            return { balance: 'VIP' }; // VIP — не списываем
        }
    } catch (e) {}

    try {
        let balanceStr = await storage.get(BALANCE_KEY);
        let balance = parseInt(balanceStr);
        if (isNaN(balance)) balance = 80;

        const newBalance = Math.max(0, balance - cost);
        await storage.put(BALANCE_KEY, String(newBalance), { expirationTtl: 86400 * 365 });
        return { balance: newBalance };
    } catch (e) {
        console.error("[WebHandler] Credit deduction error:", e.message);
        return { balance: null };
    }
}

// ============================================================
// 📦 УТИЛИТЫ
// ============================================================

function formatResponse(success, error = null, creditsLeft = null, data = null) {
    const response = { success };
    if (error) response.error = error;
    if (creditsLeft !== null && creditsLeft !== undefined) response.credits_left = creditsLeft;
    if (data) response.data = data;
    return response;
}

function bufferToBase64(buffer) {
    if (!buffer) return null;
    if (Buffer.isBuffer(buffer)) return buffer.toString('base64');
    if (buffer instanceof ArrayBuffer || (buffer && buffer.constructor?.name === 'ArrayBuffer')) {
        return Buffer.from(buffer).toString('base64');
    }
    if (typeof buffer === 'string') return buffer; // Уже base64
    return null;
}