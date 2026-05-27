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
// ============================================================

module.exports.handleWebRequest = async function(body, env, ctx) {
    const { mode, auth, payload } = body;

    // Привязываем контекст воркера (AI_MODELS, функции и т.д.)
    const monolith = ctx || {};

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
            default:
                return formatResponse(false, "Неизвестный режим: " + mode);
        }
    } catch (err) {
        console.error("[WebHandler] Error:", err.message, err.stack);
        return formatResponse(false, "Внутренняя ошибка: " + err.message);
    }
};

// ============================================================
// 🟢 ЧАТ — Бесплатно для всех (гости + авторизованные)
// ============================================================
async function handleChat(auth, payload, env, monolith) {
    const userMessage = (payload.prompt || '').trim();
    // Allow empty text if there are attachments
    if (!userMessage && (!payload.attachments || payload.attachments.length === 0)) {
        return formatResponse(false, 'Пустое сообщение');
    }

    const { AI_MODELS, AI_MODEL_MENU_CONFIG, loadActiveConfig, extractAndCleanModelResponse, syncS3Chat } = monolith;

    // История из localStorage фронтенда → формат для AI-функций
    const browserHistory = payload.history || [];
    const historyForModel = browserHistory.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        text: m.content
    }));

    const isAuth = !!(auth && auth.id);
    const chatId = isAuth ? String(auth.id) : 'guest';

    // === Авторизованный пользователь — сохраняем в S3 ===
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
            console.error("[WebHandler] S3 sync error (chat):", e.message);
        }
    }

    // Determine if we have attachments that need Vision
    const hasAttachments = payload.attachments && payload.attachments.length > 0;
    let serviceType = 'TEXT_TO_TEXT';

    if (hasAttachments) {
        // Check if any attachment is an image → use Vision
        const hasImage = payload.attachments.some(a => a.type && a.type.startsWith('image/'));
        const hasAudio = payload.attachments.some(a => a.type && a.type.startsWith('audio/'));
        const hasVideo = payload.attachments.some(a => a.type && a.type.startsWith('video/'));

        if (hasImage) serviceType = 'IMAGE_TO_TEXT';
        else if (hasAudio) serviceType = 'AUDIO_TO_TEXT';
        else if (hasVideo) serviceType = 'VIDEO_TO_TEXT';
    }

    // Загружаем модель: из payload (выбор юзера) или активную из KV
    let finalResponse;
    let config;
    try {
        if (payload.model && AI_MODELS[payload.model]) {
            config = AI_MODELS[payload.model];
        } else {
            const loaded = await loadActiveConfig(serviceType, env, chatId);
            config = loaded.config;
        }

        if (serviceType === 'IMAGE_TO_TEXT' && hasAttachments) {
            // Vision: send images to the model
            const imageAttachments = payload.attachments.filter(a => a.type && a.type.startsWith('image/'));
            if (imageAttachments.length > 0 && config.FUNCTION.name === 'callGeminiVision') {
                const visionPrompt = userMessage || 'Опиши это изображение подробно';
                const imageBase64 = imageAttachments[0].base64;
                const modelResponse = await config.FUNCTION(config, visionPrompt, env, imageBase64);
                const cleaned = extractAndCleanModelResponse(modelResponse);
                finalResponse = cleaned.finalResponse;
            } else if (imageAttachments.length > 0 && config.FUNCTION.name === 'callWorkersAIVision') {
                const visionPrompt = userMessage || 'Опиши это изображение подробно';
                const imageBase64 = imageAttachments[0].base64;
                const modelResponse = await config.FUNCTION(config, visionPrompt, env, imageBase64);
                const cleaned = extractAndCleanModelResponse(modelResponse);
                finalResponse = cleaned.finalResponse;
            } else {
                // Fallback: just send text with file names
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
                const modelResponse = await config.FUNCTION(config, audioBase64, env);
                const cleaned = extractAndCleanModelResponse(modelResponse);
                finalResponse = cleaned.finalResponse;
            }
        } else {
            const modelResponse = await config.FUNCTION(config, historyForModel, userMessage, env);
            const cleaned = extractAndCleanModelResponse(modelResponse);
            finalResponse = cleaned.finalResponse;
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
    const { AI_MODELS, AI_MODEL_MENU_CONFIG, loadActiveConfig, syncS3Chat, uploadBase64ImageToPublicUrl } = monolith;
    const isAuth = !!(auth && auth.id);
    const chatId = isAuth ? String(auth.id) : 'guest';
    const imageMode = payload.image_mode || 't2i'; // t2i, i2i, upscale, rotate, convert

    // === UPSCALE ===
    if (imageMode === 'upscale') {
        if (!payload.image_base64) return formatResponse(false, 'Нет изображения для апскейла');
        if (!isAuth) return formatResponse(false, 'Нужна авторизация для апскейла');

        const balance = await getUserBalance(chatId, env, monolith);
        if (balance < 2) return formatResponse(false, 'Недостаточно кредитов. Нужно 2¢.', balance);

        let imageResult;
        try {
            const config = (payload.model && AI_MODELS[payload.model]) ? AI_MODELS[payload.model] : (await loadActiveConfig('IMAGE_TO_UPSCALE', env, chatId)).config;
            imageResult = await config.FUNCTION(config, payload.image_base64, env);
        } catch (e) {
            console.error("[WebHandler] Upscale error:", e.message);
            return formatResponse(false, "Ошибка апскейла: " + e.message);
        }

        const creditsLeft = await deductCredits(chatId, 2, env, monolith);
        return formatImageResult(imageResult, creditsLeft, uploadBase64ImageToPublicUrl, env, chatId);
    }

    // === ROTATE ===
    if (imageMode === 'rotate') {
        if (!payload.image_base64) return formatResponse(false, 'Нет изображения для поворота');
        const angle = payload.angle || '-90';

        // Rotate via converter (free operation)
        try {
            const converterUrl = env.LESHIY_CONVERTER;
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

    // === CONVERT ===
    if (imageMode === 'convert') {
        if (!payload.image_base64) return formatResponse(false, 'Нет изображения для конвертации');
        const targetFormat = payload.target_format || 'png';

        try {
            const converterUrl = env.LESHIY_CONVERTER;
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
            const config = (payload.model && AI_MODELS[payload.model]) ? AI_MODELS[payload.model] : (await loadActiveConfig('IMAGE_TO_IMAGE', env, chatId)).config;
            const refImage = payload.reference_images[0]; // First reference image
            imageResult = await config.FUNCTION(config, prompt, env, refImage);
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

    const selectedModel = payload.model || 'default';
    const isFreeModel = (selectedModel === 'free_sdxl' || selectedModel.startsWith('WORKERS_AI'));

    if (!isFreeModel) {
        if (!isAuth) return formatResponse(false, 'Для платных моделей нужна авторизация');
        const balance = await getUserBalance(chatId, env, monolith);
        if (balance < 4) return formatResponse(false, 'Недостаточно кредитов. Нужно 4¢.', balance);
    }

    let imageResult;
    try {
        const config = (payload.model && AI_MODELS[payload.model]) ? AI_MODELS[payload.model] : (await loadActiveConfig('TEXT_TO_IMAGE', env, chatId)).config;
        imageResult = await config.FUNCTION(config, prompt, env);
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

// Helper: format image result
function formatImageResult(imageResult, creditsLeft, uploadBase64ImageToPublicUrl, env, chatId) {
    let imageUrl = null;

    if (imageResult instanceof ArrayBuffer || (imageResult && imageResult.constructor?.name === 'ArrayBuffer')) {
        if (uploadBase64ImageToPublicUrl) {
            try {
                const base64 = Buffer.from(imageResult).toString('base64');
                // Synchronous check, but uploadBase64ImageToPublicUrl may be async
                imageUrl = uploadBase64ImageToPublicUrl(base64, env, chatId);
            } catch (e) {
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
    } else if (imageResult && typeof imageResult.then === 'function') {
        // Promise — shouldn't happen but handle gracefully
        return formatResponse(false, 'Асинхронный результат не поддерживается');
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
// 🎬 ВИДЕО — Поддержка generate, convert, upscale, rotate
// ============================================================
async function handleVideo(auth, payload, env, monolith) {
    const { AI_MODELS, loadActiveConfig, createTaskKieAi, extractAndCleanModelResponse } = monolith;
    const isAuth = !!(auth && auth.id);
    const chatId = isAuth ? String(auth.id) : 'guest';
    const videoMode = payload.video_mode || 'generate'; // generate, convert, upscale, rotate

    // === CONVERT / ANALYSIS (free) ===
    if (videoMode === 'convert') {
        if (!payload.video_base64) return formatResponse(false, 'Нет видеофайла для анализа');
        const prompt = (payload.prompt || 'Проанализируй это видео подробно').trim();

        let result;
        try {
            const config = (payload.model && AI_MODELS[payload.model]) ? AI_MODELS[payload.model] : (await loadActiveConfig('VIDEO_TO_ANALYSIS', env, chatId)).config;
            if (config.FUNCTION.name === 'callGeminiVideoVision' || config.FUNCTION.name === 'callGeminiSpeechToText') {
                const videoBase64 = payload.video_base64;
                result = await config.FUNCTION(config, prompt, env, videoBase64);
            } else {
                result = await config.FUNCTION(config, prompt, env, payload.video_base64);
            }
            const cleaned = extractAndCleanModelResponse(result);
            return formatResponse(true, null, null, { type: 'text', content: cleaned.finalResponse || result });
        } catch (e) {
            console.error("[WebHandler] Video analysis error:", e.message);
            return formatResponse(false, "Ошибка анализа видео: " + e.message);
        }
    }

    // === ROTATE (free via converter) ===
    if (videoMode === 'rotate') {
        if (!payload.video_base64) return formatResponse(false, 'Нет видеофайла для поворота');
        const angle = payload.angle || '-90';
        try {
            const converterUrl = env.LESHIY_CONVERTER;
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

        let taskId;
        try {
            const upscaleConfig = (payload.model && AI_MODELS[payload.model]) ? AI_MODELS[payload.model] : (await loadActiveConfig('VIDEO_TO_UPSCALE', env, chatId)).config;
            const workerDomain = env.WORKER_DOMAIN || '';
            const callbackUrl = workerDomain ? `${workerDomain.startsWith('http') ? workerDomain : 'https://' + workerDomain}/api/kieai-callback?chatId=${chatId}` : null;

            const input = {
                video_base64: payload.video_base64,
                quality: payload.quality || '720p'
            };

            taskId = await createTaskKieAi(chatId, upscaleConfig, input, env, callbackUrl);
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

    let taskId;
    try {
        const videoConfig = (payload.model && AI_MODELS[payload.model]) ? AI_MODELS[payload.model] : (await loadActiveConfig('TEXT_TO_VIDEO', env, chatId)).config;
        const workerDomain = env.WORKER_DOMAIN || '';
        const callbackUrl = workerDomain ? `${workerDomain.startsWith('http') ? workerDomain : 'https://' + workerDomain}/api/kieai-callback?chatId=${chatId}` : null;

        const input = {
            prompt: prompt,
            aspect_ratio: payload.aspect_ratio || '16:9',
            duration: payload.duration || '5',
            quality: payload.quality || '480p',
            mode: 'normal'
        };

        // Add reference image if provided
        if (payload.reference_image) {
            input.image_base64 = payload.reference_image;
        }

        taskId = await createTaskKieAi(chatId, videoConfig, input, env, callbackUrl);
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
    const { AI_MODELS, loadActiveConfig, extractAndCleanModelResponse } = monolith;
    const isAuth = !!(auth && auth.id);
    const chatId = isAuth ? String(auth.id) : 'guest';
    const audioMode = payload.audio_mode || 'tts';

    // === STT (Speech-to-Text, free) ===
    if (audioMode === 'stt') {
        if (!payload.audio_base64) return formatResponse(false, 'Нет аудиофайла для распознавания');

        let result;
        try {
            const config = (payload.model && AI_MODELS[payload.model]) ? AI_MODELS[payload.model] : (await loadActiveConfig('AUDIO_TO_TEXT', env, chatId)).config;
            result = await config.FUNCTION(config, payload.audio_base64, env);
            const cleaned = extractAndCleanModelResponse(result);
            return formatResponse(true, null, null, { type: 'text', content: cleaned.finalResponse || result });
        } catch (e) {
            console.error("[WebHandler] STT error:", e.message);
            return formatResponse(false, "Ошибка распознавания: " + e.message);
        }
    }

    // === CONVERT (free via converter) ===
    if (audioMode === 'convert') {
        if (!payload.audio_base64) return formatResponse(false, 'Нет аудиофайла для конвертации');
        const targetFormat = payload.target_format || 'mp3';

        try {
            const converterUrl = env.LESHIY_CONVERTER;
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

        // Voice clone uses the same TTS function but with voice sample
        let audioBuffer;
        try {
            const audioConfig = (payload.model && AI_MODELS[payload.model]) ? AI_MODELS[payload.model] : (await loadActiveConfig('TEXT_TO_AUDIO', env, chatId)).config;
            // Pass voice sample to the function if it supports it
            if (audioConfig.FUNCTION.name === 'callGeminiTextToAudio') {
                audioBuffer = await audioConfig.FUNCTION(audioConfig, text, env, 'user_voice', payload.voice_sample);
            } else {
                audioBuffer = await audioConfig.FUNCTION(audioConfig, text, env);
            }
        } catch (e) {
            console.error("[WebHandler] Voice clone error:", e.message);
            return formatResponse(false, "Ошибка клонирования: " + e.message);
        }

        const creditsLeft = await deductCredits(chatId, 10, env, monolith);
        const audioBase64 = bufferToBase64(audioBuffer);
        return formatResponse(true, null, creditsLeft, { type: 'audio_base64', content: audioBase64 });
    }

    // === TTS (default, 2¢) ===
    const text = (payload.text || payload.prompt || '').trim();
    if (!text) return formatResponse(false, 'Пустой текст');

    if (!isAuth) return formatResponse(false, 'Для озвучки нужна авторизация');
    const balance = await getUserBalance(chatId, env, monolith);
    if (balance < 2) return formatResponse(false, 'Недостаточно кредитов. Нужно 2¢.', balance);

    let audioBuffer;
    try {
        const audioConfig = (payload.model && AI_MODELS[payload.model]) ? AI_MODELS[payload.model] : (await loadActiveConfig('TEXT_TO_AUDIO', env, chatId)).config;
        const voice = payload.voice || 'Female';

        if (audioConfig.FUNCTION.name === 'callGeminiTextToAudio' || audioConfig.SERVICE === 'GEMINI') {
            audioBuffer = await audioConfig.FUNCTION(audioConfig, text, env, voice);
        } else {
            audioBuffer = await audioConfig.FUNCTION(audioConfig, text, env);
        }
    } catch (e) {
        console.error("[WebHandler] Audio gen error:", e.message);
        return formatResponse(false, "Ошибка генерации аудио: " + e.message);
    }

    let creditsLeft = null;
    if (isAuth) {
        creditsLeft = await deductCredits(chatId, 2, env, monolith);
    }

    const audioBase64 = bufferToBase64(audioBuffer);
    return formatResponse(true, null, creditsLeft, { type: 'audio_base64', content: audioBase64 });
}

// ============================================================
// 📋 МОДЕЛИ — Возврат списка доступных моделей
// ============================================================
async function handleModels(auth, env, monolith) {
    const { AI_MODELS, AI_MODEL_MENU_CONFIG } = monolith;

    const models = {
        chat: [],
        image: [],
        image_i2i: [],
        video: [],
        audio_tts: [],
        audio_stt: []
    };

    // Маппинг: сервис-тип → целевой массив + признак бесплатности
    const serviceMapping = {
        'TEXT_TO_TEXT':   { target: 'chat',     freeByDefault: true  },
        'IMAGE_TO_TEXT':  { target: 'chat',     freeByDefault: true  },
        'TEXT_TO_IMAGE':  { target: 'image',    freeByDefault: false },
        'IMAGE_TO_IMAGE': { target: 'image_i2i', freeByDefault: false },
        'IMAGE_TO_UPSCALE': { target: 'image_i2i', freeByDefault: false },
        'TEXT_TO_VIDEO':  { target: 'video',    freeByDefault: false },
        'IMAGE_TO_VIDEO': { target: 'video',    freeByDefault: false },
        'VIDEO_TO_VIDEO': { target: 'video',    freeByDefault: false },
        'AUDIO_TO_VIDEO': { target: 'video',    freeByDefault: false },
        'VIDEO_TO_UPSCALE': { target: 'video',  freeByDefault: false },
        'VIDEO_TO_ANALYSIS': { target: 'video', freeByDefault: true  },
        'TEXT_TO_AUDIO':  { target: 'audio_tts', freeByDefault: false },
        'AUDIO_TO_TEXT':  { target: 'audio_stt', freeByDefault: true  },
    };

    // Перебираем ВСЕ модели из AI_MODEL_MENU_CONFIG и AI_MODELS
    for (const [serviceType, menuConfig] of Object.entries(AI_MODEL_MENU_CONFIG)) {
        const mapping = serviceMapping[serviceType];
        if (!mapping) continue;
        const targetArray = models[mapping.target];
        if (!targetArray) continue;

        for (const [modelKey, friendlyName] of Object.entries(menuConfig.models)) {
            const modelDetails = AI_MODELS[modelKey];
            if (!modelDetails) continue;

            const isFree = mapping.freeByDefault || !modelDetails.pricing || modelDetails.SERVICE === 'WORKERS_AI';
            const cost = typeof modelDetails.pricing === 'number' ? modelDetails.pricing : (modelDetails.pricing ? 'дин.' : 0);

            targetArray.push({
                key: modelKey,
                displayName: friendlyName,
                modelShort: modelDetails.MODEL?.split('/').pop() || modelDetails.MODEL || '',
                service: modelDetails.SERVICE,
                serviceLabel: getShortServiceName(modelDetails.SERVICE),
                isFree: isFree,
                cost: cost
            });
        }
    }

    // Дедупликация по key (модели могут попасть в один массив из разных сервис-типов)
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
// 💰 БАЛАНС — Запрос текущего баланса
// ============================================================
async function handleBalance(auth, env, monolith) {
    if (!auth || !auth.id) {
        return formatResponse(false, 'Не авторизован');
    }
    const chatId = String(auth.id);
    const balance = await getUserBalance(chatId, env, monolith);

    // Check VIP status
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
    if (typeof buffer === 'string') return buffer; // Already base64
    return '';
}

function formatResponse(success, error = null, creditsLeft = null, data = null) {
    const response = { success };
    if (error) response.error = error;
    if (creditsLeft !== null) response.credits_left = creditsLeft;
    if (data) response.data = data;
    return response;
}