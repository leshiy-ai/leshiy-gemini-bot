const { USER_DB_ADAPTER, FILES_DB_ADAPTER, TypedValues, runQuery, filesDriver } = require('./db_adapter');
const nodeCrypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ВАЖНО: Удаляем FormData из зависимостей, берем нативную или фиксим через глобал
const NativeFormData = global.FormData || require('form-data');

// ЖЕСТКАЯ ПОДМЕНА для всего проекта
global.FormData = NativeFormData;
global.crypto = nodeCrypto;

// Магия: подменяем модуль в кэше, чтобы воркер не юзал свою старую версию
require.cache[require.resolve('form-data')] = { exports: NativeFormData };

// Сохраняем чистый системный fetch
const originalFetch = global.fetch;

// Функция пересборки Multipart formData при каждом обращении
async function prepareMultipart(formData) {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const chunks = [];
    const crlf = '\r\n';

    for (const [key, value] of formData.entries()) {
        chunks.push(Buffer.from(`--${boundary}${crlf}`));
        if (value && typeof value === 'object' && (value.arrayBuffer || Buffer.isBuffer(value))) {
            const filename = value.name || 'file.dat';
            const type = value.type || 'application/octet-stream';
            chunks.push(Buffer.from(`Content-Disposition: form-data; name="${key}"; filename="${filename}"${crlf}`));
            chunks.push(Buffer.from(`Content-Type: ${type}${crlf}${crlf}`));
            const buffer = value.arrayBuffer ? Buffer.from(await value.arrayBuffer()) : value;
            chunks.push(buffer);
        } else {
            chunks.push(Buffer.from(`Content-Disposition: form-data; name="${key}"${crlf}${crlf}`));
            chunks.push(Buffer.from(String(value)));
        }
        chunks.push(Buffer.from(crlf));
    }
    chunks.push(Buffer.from(`--${boundary}--${crlf}`));

    const finalBuffer = Buffer.concat(chunks);

    // Прикидываемся стримом для старых библиотек типа node-fetch v2
    finalBuffer.on = () => {}; 
    finalBuffer.pause = () => {};
    finalBuffer.resume = () => {};

    return {
        body: finalBuffer,
        contentType: `multipart/form-data; boundary=${boundary}`
    };
}

// --- УНИВЕРСАЛЬНАЯ ОБЕРТКА FETCH ---
const smartFetch = async (url, opts) => {
    const isFormData = opts?.body && (
        opts.body instanceof FormData || 
        opts.body.constructor.name === 'FormData' ||
        (typeof opts.body === 'object' && opts.body.append)
    );

    if (isFormData) {
        const { body, contentType } = await prepareMultipart(opts.body);
        const newOpts = { ...opts };
        const rawHeaders = {};
        if (opts.headers) {
            const entries = opts.headers instanceof Headers ? [...opts.headers] : Object.entries(opts.headers);
            for (const [k, v] of entries) { rawHeaders[k.toLowerCase()] = String(v); }
        }
        rawHeaders['content-type'] = contentType;
        rawHeaders['content-length'] = String(body.length);
        newOpts.body = body;
        newOpts.headers = rawHeaders;
        return originalFetch(url, newOpts);
    }
    return originalFetch(url, opts);
};

// ГЛОБАЛЬНАЯ ПОДМЕНА
global.fetch = smartFetch;
global.FormData = FormData;
global.crypto = nodeCrypto;

// ПОДМЕНА МОДУЛЯ node-fetch (Критично для воркера!)
require.cache[require.resolve('node-fetch')] = {
    exports: smartFetch
};

// Только ПОСЛЕ этого подключаем воркер и webHandler
const worker = require('./worker');
const webHandler = require('./webHandler');

// Строим monolith-контекст для webHandler — это функции и данные из worker.js
const monolithContext = {
    AI_MODELS: worker.AI_MODELS,
    AI_MODEL_MENU_CONFIG: worker.AI_MODEL_MENU_CONFIG,
    extractAndCleanModelResponse: worker.extractAndCleanModelResponse,
    syncS3Chat: worker.syncS3Chat,
    uploadBase64ImageToPublicUrl: worker.uploadBase64ImageToPublicUrl,
    createTaskKieAi: worker.createTaskKieAi,
    getKieAiTaskResultForWeb: worker.getKieAiTaskResultForWeb,
};

module.exports.handler = async (event, context) => {
    // ==========================================
    // 1. РАЗДАЧА ФРОНТЕНДА (HTML/CSS/JS)
    // ==========================================
    let requestPath = event.path || '/';
    if (requestPath.startsWith('http')) {
        try { requestPath = new URL(requestPath).pathname; } catch(e) {}
    }
    if ((!requestPath || requestPath === '/') && event.headers) {
        const origPath = event.headers['x-envoy-original-path'] || event.headers['X-Envoy-Original-Path'];
        if (origPath) requestPath = origPath;
    }
    if (event.url && (!requestPath || requestPath === '/')) {
        try { requestPath = new URL(event.url).pathname; } catch(e) {}
    }
    
    // Если зашли в корень сайта — отдаем HTML
    if (event.httpMethod === 'GET' && (requestPath === '/' || requestPath === '/index.html')) {
        try {
            const htmlPath = path.join(__dirname, 'public', 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf8');
            return {
                statusCode: 200,
                headers: { 
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'no-cache' 
                },
                body: html
            };
        } catch (err) {
            console.error("HTML read error:", err);
            return { statusCode: 500, body: 'Frontend not found' };
        }
    }

    // Раздача статических файлов: vk.html, tg.html, /images/*, /css/*, /js/*
    if (event.httpMethod === 'GET') {
        const staticFiles = {
            '/vk.html': { mime: 'text/html; charset=utf-8', file: 'vk.html' },
            '/tg.html': { mime: 'text/html; charset=utf-8', file: 'tg.html' },
        };
        const staticExtensions = {
            '.svg': 'image/svg+xml',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.ico': 'image/x-icon',
            '.webp': 'image/webp',
            '.css': 'text/css; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
        };

        // Проверяем точное совпадение или совпадение по концу пути
        let matchedStatic = staticFiles[requestPath] || null;
        if (!matchedStatic) {
            for (const [spath, sconf] of Object.entries(staticFiles)) {
                if (requestPath.endsWith(spath)) {
                    matchedStatic = sconf;
                    break;
                }
            }
        }

        if (matchedStatic) {
            try {
                const filePath = path.join(__dirname, 'public', matchedStatic.file);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    return {
                        statusCode: 200,
                        headers: {
                            'Content-Type': matchedStatic.mime,
                            'Cache-Control': 'no-cache'
                        },
                        body: content
                    };
                }
            } catch (err) {
                console.error("Static file error:", requestPath, err);
            }
        }

        // Проверяем /images/* и другие подпапки public/
        if (requestPath.startsWith('/images/') || requestPath.startsWith('/css/') || requestPath.startsWith('/js/')) {
            const ext = path.extname(requestPath).toLowerCase();
            if (staticExtensions[ext]) {
                try {
                    const safePath = requestPath.replace(/\.\./g, '').replace(/\/\/+/g, '/');
                    const filePath = path.join(__dirname, 'public', safePath);
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath);
                        const isBinary = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp'].includes(ext);
                        return {
                            statusCode: 200,
                            headers: {
                                'Content-Type': staticExtensions[ext],
                                'Cache-Control': 'public, max-age=3600',
                                'Access-Control-Allow-Origin': '*'
                            },
                            body: isBinary ? content.toString('base64') : content.toString('utf8'),
                            isBase64Encoded: isBinary
                        };
                    }
                } catch (err) {
                    console.error("Static file error:", requestPath, err);
                }
            }
            return { statusCode: 404, body: 'Not Found' };
        }
    }

    // ==========================================
    // 2. ОБРАБОТКА CORS (Для API запросов с фронтенда)
    // ==========================================
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
            body: ''
        };
    }

    // ==========================================
    // 3b. VK PAYMENT CALLBACK — обработка уведомлений от VK
    // ==========================================
    // VK отправляет POST на callback URL с параметрами: notification_type, item, order_id, status, sig и т.д.
    // https://dev.vk.com/ru/api/payments/virtual-goods/vk
    //
    // 🔑 ВАЖНО: event.path содержит ПАТТЕРН маршрута шлюза (например '/{proxy+}'),
    // а НЕ реальный URL. Реальный URL — в заголовке x-envoy-original-path.
    if (event.httpMethod === 'POST') {
        const _actualPath = (event.headers && (event.headers['x-envoy-original-path'] || event.headers['X-Envoy-Original-Path'])) || requestPath || '';

        // ===== VK PAYMENT CALLBACK =====
        if (_actualPath === '/vk-payment-callback' || _actualPath.endsWith('/vk-payment-callback')) {
            try {
                const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : (event.body || '');
                console.log('[VK-Payment] Callback received, actualPath=' + _actualPath + ', body:', rawBody.substring(0, 500));

                const params = {};
                rawBody.split('&').forEach(pair => {
                    const [key, ...vals] = pair.split('=');
                    params[decodeURIComponent(key)] = decodeURIComponent(vals.join('='));
                });

                const notificationType = params.notification_type;
                console.log('[VK-Payment] notification_type:', notificationType, 'item:', params.item, 'order_id:', params.order_id);

                const env = {
                    ...process.env,
                    LAST_PHOTO_STORAGE: USER_DB_ADAPTER,
                    BOT_LOGS_STORAGE: USER_DB_ADAPTER,
                    FILES_DB: FILES_DB_ADAPTER,
                    TypedValues,
                    runQuery,
                    filesDriver,
                    nodeCrypto,
                };

                if (notificationType === 'get_item' || notificationType === 'get_item_test') {
                    const result = await webHandler.handleVKGetItem(params, env, rawBody);
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(result)
                    };
                }

                if (notificationType === 'order_status_change' || notificationType === 'order_status_change_test') {
                    const result = await webHandler.handleVKOrderStatusChange(params, env, rawBody);
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(result)
                    };
                }

                console.error('[VK-Payment] Unknown notification_type:', notificationType);
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: { error_code: 100, error_msg: 'Unknown notification type', critical: true } })
                };
            } catch (err) {
                console.error('[VK-Payment] Callback error:', err.message, err.stack);
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: { error_code: 100, error_msg: 'Internal server error', critical: true } })
                };
            }
        }

        // ===== OK PAYMENT CALLBACK (Одноклассники) =====
        // https://dev.vk.com/ru/api/payments/virtual-goods/ok
        if (_actualPath === '/ok-payment-callback' || _actualPath.endsWith('/ok-payment-callback')) {
            try {
                const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : (event.body || '');
                console.log('[OK-Payment] Callback received, actualPath=' + _actualPath + ', body:', rawBody.substring(0, 500));

                // OK шлёт параметры как application/x-www-form-urlencoded
                const params = {};
                rawBody.split('&').forEach(pair => {
                    const [key, ...vals] = pair.split('=');
                    params[decodeURIComponent(key)] = decodeURIComponent(vals.join('='));
                });

                const method = params.method;
                console.log('[OK-Payment] method:', method, 'type:', params.type, 'product_code:', params.product_code);

                const env = {
                    ...process.env,
                    LAST_PHOTO_STORAGE: USER_DB_ADAPTER,
                    BOT_LOGS_STORAGE: USER_DB_ADAPTER,
                    FILES_DB: FILES_DB_ADAPTER,
                    TypedValues,
                    runQuery,
                    filesDriver,
                    nodeCrypto,
                };

                const result = await webHandler.handleOKPayment(params, env, rawBody);
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(result)
                };
            } catch (err) {
                console.error('[OK-Payment] Callback error:', err.message, err.stack);
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: { error_code: 100, error_msg: 'Internal server error', critical: true } })
                };
            }
        }
    }

    // ==========================================
    // 3. WEB API — Маршрут /api для фронтенда
    // ==========================================
    // Фронтенд отправляет POST на /api с JSON { mode, auth, payload }
    // Это направляется в webHandler.handleWebRequest()
    if (event.httpMethod === 'POST' && (requestPath === '/api' || requestPath.endsWith('/api'))) {
        try {
            let requestBody = {};
            try {
                const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
                requestBody = JSON.parse(rawBody);
            } catch (e) {
                console.error("[API] Failed to parse request body:", e.message);
                return {
                    statusCode: 400,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*' 
                    },
                    body: JSON.stringify({ success: false, error: 'Невалидный JSON в запросе' })
                };
            }

            console.log(`[API] mode=${requestBody.mode} auth=${requestBody.auth?.id || 'guest'}`);

            // Собираем env для webHandler
            const env = {
                ...process.env,
                LAST_PHOTO_STORAGE: USER_DB_ADAPTER, 
                BOT_LOGS_STORAGE: USER_DB_ADAPTER,
                FILES_DB: FILES_DB_ADAPTER,
                TypedValues,
                runQuery,
                filesDriver,
                nodeCrypto,
                LESHIY_AI_PROXY: {
                    toString: () => process.env.LESHIY_AI_PROXY || '',
                    fetch: (url, opts) => fetch(process.env.LESHIY_AI_PROXY || url, opts)
                },
                LESHIY_CONVERTER: {
                    toString: () => process.env.LESHIY_CONVERTER,
                    fetch: async (url, opts) => {
                        let finalOpts = { ...opts };
                        if (opts.body && (opts.body instanceof FormData || opts.body.constructor.name === 'FormData')) {
                            const { body, contentType } = await prepareMultipart(opts.body);
                            finalOpts.body = body;
                            finalOpts.headers = {
                                ...(opts.headers || {}),
                                'Content-Type': contentType,
                                'Content-Length': body.length.toString()
                            };
                        }
                        const finalUrl = (typeof url === 'string') ? url : process.env.LESHIY_CONVERTER;
                        return fetch(finalUrl, finalOpts);
                    }
                }
            };

            // Вызываем webHandler
            const result = await webHandler.handleWebRequest(requestBody, env, monolithContext);

            console.log(`[API] result: success=${result.success} type=${result.data?.type || 'none'}`);

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(result)
            };
        } catch (err) {
            console.error("[API] WebHandler error:", err.message, err.stack);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ success: false, error: 'Внутренняя ошибка: ' + err.message })
            };
        }
    }

    // ==========================================
    // 4. TELEGRAM WEBHOOK — всё остальное идёт в воркер
    // ==========================================
    let uri = event.url || event.headers['x-envoy-original-path'] || '/';    
    const domain = process.env.WORKER_DOMAIN || "https://d5d2v5jjmbggp9k8qe8q.pdkwbi1w.apigw.yandexcloud.net";
    const origin = domain.startsWith('http') ? domain : `https://${domain}`;

    const urlObj = new URL(uri, origin);
    const fullUrl = urlObj.toString();

    const headers = new Headers();
    for (const [key, value] of Object.entries(event.headers || {})) {
        headers.set(key, value);
    }

    const requestOptions = {
        method: event.httpMethod,
        headers: headers,
    };

    if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD' && event.body) {
        requestOptions.body = event.isBase64Encoded 
            ? Buffer.from(event.body, 'base64') 
            : event.body;
        headers.delete('content-length'); 
    }

    console.log(`[TG] URL=${fullUrl} METHOD=${requestOptions.method}`);

    const env = {
        ...process.env,
        LAST_PHOTO_STORAGE: USER_DB_ADAPTER, 
        BOT_LOGS_STORAGE: USER_DB_ADAPTER,
        FILES_DB: FILES_DB_ADAPTER,
        TypedValues,
        runQuery,
        filesDriver,
        nodeCrypto,
        LESHIY_AI_PROXY: {
            toString: () => process.env.LESHIY_AI_PROXY || '',
            fetch: (url, opts) => fetch(process.env.LESHIY_AI_PROXY || url, opts)
        },
        LESHIY_CONVERTER: {
            toString: () => process.env.LESHIY_CONVERTER,
            fetch: async (url, opts) => {
                let finalOpts = { ...opts };
                if (opts.body && (opts.body instanceof FormData || opts.body.constructor.name === 'FormData')) {
                    const { body, contentType } = await prepareMultipart(opts.body);
                    finalOpts.body = body;
                    finalOpts.headers = {
                        ...(opts.headers || {}),
                        'Content-Type': contentType,
                        'Content-Length': body.length.toString()
                    };
                }
                const finalUrl = (typeof url === 'string') ? url : process.env.LESHIY_CONVERTER;
                return fetch(finalUrl, finalOpts);
            }
        }
    };

    const pendingPromises = [];
    const ctx = { 
        waitUntil: (promise) => {
            pendingPromises.push(promise);
        } 
    };

    try {
        const request = new Request(fullUrl, requestOptions);
        const responsePromise = worker.fetch ? 
            worker.fetch(request, env, ctx) : 
            worker.worker_code_fetch(request, env, ctx);

        ctx.waitUntil(responsePromise);

        const response = await responsePromise;

        const responseArrayBuffer = await response.arrayBuffer();
        const responseBuffer = Buffer.from(responseArrayBuffer);
        
        const responseHeaders = {};
        response.headers.forEach((v, k) => { responseHeaders[k] = v; });
        responseHeaders['Access-Control-Allow-Origin'] = '*';
    
        if (pendingPromises.length > 1) {
            await Promise.all(pendingPromises);
        }
        
        return {
            statusCode: response.status || 200,
            headers: responseHeaders,
            body: responseBuffer.toString('base64'),
            isBase64Encoded: true 
        };

    } catch (err) {
        console.error("CRITICAL ERROR:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message, stack: err.stack })
        };
    }
};