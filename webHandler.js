// webHandler.js - Изолированный шлюз для Веб-фронтенда (Node.js / Yandex Cloud)

async function handleWebRequest(requestBody, env, workerModule) {
    const { mode, auth, payload } = requestBody;

    // Вытаскиваем функции и конфиги из экспортов worker.js или глобального скоупа
    const AI_MODEL_MENU_CONFIG = workerModule.AI_MODEL_MENU_CONFIG || global.AI_MODEL_MENU_CONFIG;
    const AI_MODELS = workerModule.AI_MODELS || global.AI_MODELS;
    const extractAndCleanModelResponse = workerModule.extractAndCleanModelResponse || global.extractAndCleanModelResponse;
    const loadActiveConfig = workerModule.loadActiveConfig || global.loadActiveConfig;
    const createTaskKieAi = workerModule.createTaskKieAi || global.createTaskKieAi;
    const base64ToArrayBuffer = workerModule.base64ToArrayBuffer || global.base64ToArrayBuffer;

    const tools = { 
        AI_MODEL_MENU_CONFIG, 
        AI_MODELS, 
        extractAndCleanModelResponse, 
        loadActiveConfig,
        createTaskKieAi,
        base64ToArrayBuffer,
        workerDomain: process.env.WORKER_DOMAIN || "https://d5d2v5jjmbggp9k8qe8q.pdkwbi1w.apigw.yandexcloud.net"
    };

    // Фейковый ctx для обратной совместимости с воркером, если функции требуют ctx.waitUntil
    const webEnvData = { ...env, ctx: { waitUntil: () => {} }, DEBUG_ENABLED: false };

    try {
        switch (mode) {
            case 'chat':
                return await handleChat(auth, payload, webEnvData, tools);
            case 'image':
                return await handleImage(auth, payload, webEnvData, tools);
            case 'video':
                return await handleVideo(auth, payload, webEnvData, tools);
            case 'audio':
                return await handleAudio(auth, payload, webEnvData, tools);
            default:
                return formatResponse(false, "Неизвестный режим: " + mode);
        }
    } catch (err) {
        console.error("[WebHandler Error]:", err);
        return formatResponse(false, "Внутренняя ошибка шлюза: " + err.message);
    }
}

// ==========================================
// 💬 1. РЕЖИМ ЧАТА (Бесплатно)
// ==========================================
async function handleChat(auth, payload, envData, tools) {
    const userMessage = payload.prompt || '';
    const browserHistory = payload.history || [];

    if (!userMessage.trim()) {
        return formatResponse(false, "Пустом сообщение");
    }

    const historyForModel = browserHistory.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        text: m.content
    }));

    // Используем твою оригинальную функцию загрузки конфига!
    const { config } = await tools.loadActiveConfig('TEXT_TO_TEXT', envData, 'web');
    const reply = await config.FUNCTION(config, historyForModel, userMessage, envData);

    let finalResponse = reply;
    if (typeof tools.extractAndCleanModelResponse === 'function') {
        const cleaned = tools.extractAndCleanModelResponse(reply);
        finalResponse = cleaned.finalResponse;
    }

    return formatResponse(true, null, null, {
        type: 'text',
        content: finalResponse
    });
}

// ==========================================
// 🎨 2. РЕЖИМ ИЗОБРАЖЕНИЙ (SDXL - Бесплатно, Остальные - Платно)
// ==========================================
async function handleImage(auth, payload, envData, tools) {
    const prompt = payload.prompt || '';
    const isFreeModel = payload.model === 'free_sdxl';

    if (!prompt.trim()) {
        return formatResponse(false, "Пустой промпт");
    }

    // --- НАЧАЛО ТВОЕЙ БИЗНЕС ЛОГИКИ ТАРИФОВ ---
    if (!isFreeModel) {
        if (!auth || !auth.id) {
            return formatResponse(false, "Авторизуйтесь через Telegram, чтобы использовать платные модели");
        }
        // TODO: Здесь будет проверка баланса (минус 4 кредита)
        // const hasCredits = await checkAndDeductCredits(auth.id, 4, envData);
        // if (!hasCredits) return formatResponse(false, "Недостаточно кредитов. Нужно: 4 кр.");
    }
    // --- КОНЕЦ ЛОГИКИ ТАРИФОВ ---

    const { config: imageConfig } = await tools.loadActiveConfig('TEXT_TO_IMAGE', envData, 'web');
    const imageResult = await imageConfig.FUNCTION(imageConfig, prompt, envData);

    // Парсим твой оригинальный формат ответа в единый стандарт фронтенда
    if (imageResult instanceof ArrayBuffer || (imageResult && imageResult.constructor?.name === 'ArrayBuffer')) {
        const base64 = Buffer.from(imageResult).toString('base64');
        return formatResponse(true, null, null, {
            type: 'image_url', // Фронт ожидает ссылку или base64-дата-урл
            content: `data:image/png;base64,${base64}`
        });
    } else if (typeof imageResult === 'string') {
        return formatResponse(true, null, null, {
            type: 'image_url',
            content: imageResult.startsWith('http') ? imageResult : `data:image/png;base64,${imageResult}`
        });
    } else if (imageResult && imageResult.url) {
        return formatResponse(true, null, null, {
            type: 'image_url',
            content: imageResult.url
        });
    }

    return formatResponse(false, "Неожиданный формат ответа от ИИ-генератора");
}

// ==========================================
// 🎬 3. РЕЖИМ ВИДЕО (Конвертация - Бесплатно, Генерация - Платно)
// ==========================================
async function handleVideo(auth, payload, envData, tools) {
    // Если это просто проверка статуса асинхронной задачи (GET метод превратился в payload.action)
    if (payload.action === 'status') {
        const taskId = payload.taskId;
        if (!taskId) return formatResponse(false, "Missing taskId");

        const apiKey = envData.KIEAI_API_KEY;
        const statusUrl = `https://api.kie.ai/v1/task/${taskId}`;
        const statusResponse = await global.fetch(statusUrl, { headers: { 'Authorization': `Bearer ${apiKey}` } });
        const statusData = await statusResponse.json();

        if (statusData.status === 'completed' && statusData.output) {
            const videoUrl = statusData.output.video_url || statusData.output.url || null;
            return formatResponse(true, null, null, { status: 'completed', type: 'video_url', content: videoUrl });
        } else if (statusData.status === 'failed') {
            return formatResponse(false, statusData.error || 'Генерация видео не удалась');
        } else {
            return formatResponse(true, null, null, { status: 'processing', progress: statusData.progress || 0 });
        }
    }

    // --- ПЛАТНАЯ ГЕНЕРАЦИЯ ВИДЕО (20 кредитов) ---
    const prompt = payload.prompt || '';
    if (!prompt.trim()) return formatResponse(false, "Пустой промпт");

    if (!auth || !auth.id) {
        return formatResponse(false, "Авторизуйтесь через Telegram, чтобы генерировать видео (20 кредитов)");
    }
    // TODO: Списание 20 кредитов за T2V/I2V
    
    const { config: videoConfig } = await tools.loadActiveConfig('TEXT_TO_VIDEO', envData, 'web');
    const apiKey = envData[videoConfig.API_KEY];
    if (!apiKey) return formatResponse(false, "API ключ для видео не настроен на сервере");

    const callbackUrl = `${tools.workerDomain}/api/kieai-callback?chatId=web`;
    const input = {
        prompt: prompt,
        aspect_ratio: payload.aspect_ratio || '16:9',
        duration: '5',
        quality: '480p',
        mode: 'normal'
    };

    const taskId = await tools.createTaskKieAi('web', videoConfig, input, envData, callbackUrl);
    if (!taskId) return formatResponse(false, "Не удалось создать задачу генерации в KIE.AI");

    return formatResponse(true, null, null, {
        status: 'processing',
        taskId: taskId
    });
}

// ==========================================
// 🎵 4. РЕЖИМ АУДИО (Cloudflare - Бесплатно, Остальные - 2 кредита)
// ==========================================
async function handleAudio(auth, payload, envData, tools) {
    const text = payload.prompt || payload.text || ''; // поддерживаем оба формата
    const voice = payload.voice || 'Female';
    const isFreeAudio = payload.model === 'cloudflare';

    if (!text.trim()) return formatResponse(false, "Пустой текст для озвучки");

    if (!isFreeAudio) {
        if (!auth || !auth.id) {
            return formatResponse(false, "Авторизуйтесь через Telegram, чтобы использовать продвинутую озвучку (2 кредита)");
        }
        // TODO: Списание 2 кредитов
    }

    const { config: audioConfig } = await tools.loadActiveConfig('TEXT_TO_AUDIO', envData, 'web');
    
    let audioBuffer;
    if (audioConfig.FUNCTION.name === 'callGeminiTextToAudio' || audioConfig.SERVICE === 'GEMINI') {
        audioBuffer = await audioConfig.FUNCTION(audioConfig, text, envData, voice);
    } else {
        audioBuffer = await audioConfig.FUNCTION(audioConfig, text, envData);
    }

    // Конвертируем любой тип ответа аудио в base64 строку для передачи по JSON контракту
    let base64Audio = '';
    if (Buffer.isBuffer(audioBuffer)) {
        base64Audio = audioBuffer.toString('base64');
    } else if (audioBuffer instanceof ArrayBuffer || (audioBuffer && audioBuffer.constructor?.name === 'ArrayBuffer')) {
        base64Audio = Buffer.from(audioBuffer).toString('base64');
    } else if (typeof audioBuffer === 'string') {
        base64Audio = audioBuffer; // уже base64
    }

    if (!base64Audio) {
        return formatResponse(false, "Не удалось получить аудио-буфер от модели");
    }

    return formatResponse(true, null, null, {
        type: 'audio_url',
        content: `data:audio/mpeg;base64,${base64Audio}`
    });
}

// Утилита форматирования
function formatResponse(success, error = null, creditsLeft = null, data = null) {
    return { success, error, credits_left: creditsLeft, data };
}

module.exports = { handleWebRequest };