const { USER_DB_ADAPTER, FILES_DB_ADAPTER, TypedValues, runQuery, filesDriver } = require('./db_adapter');
const nodeCrypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ВАЖНО: Удаляем FormData из зависимостей, берем нативную или фиксим через глобал
// Если в Node 18+ есть глобальный FormData, используем его.
// Если нет — заставляем всех использовать одну и ту же версию.
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

    // --- ВОТ ЭТА МАГИЯ ---
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

// ГЛОБАЛЬНАЯ ПОДМЕНА (чтобы никто не ушел обиженным)
global.fetch = smartFetch;
global.FormData = FormData;
global.crypto = nodeCrypto;

// ПОДМЕНА МОДУЛЯ node-fetch (Критично для твоего воркера!)
// Если воркер делает require('node-fetch'), он получит наш smartFetch
require.cache[require.resolve('node-fetch')] = {
    exports: smartFetch
};

// Только ПОСЛЕ этого подключаем воркер
const worker = require('./worker');
const webHandler = require('./webHandler');

module.exports.handler = async (event, context) => {
    // ==========================================
    // 1. РАЗДАЧА ФРОНТЕНДА (HTML/CSS/JS)
    // ==========================================
    const requestPath = event.path || event.url || '/';
    
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

    // Раздача статических файлов: vk.html, tg.html, /images/*
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

        // Проверяем точное совпадение или совпадение по концу пути (API Gateway может добавлять префикс)
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
                    // Защита от path traversal
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
            // Файл не найден
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
    // 3. ТВОЙ СУЩЕСТВУЮЩИЙ КОД (без изменений)
    // ==========================================
    let body = {};
    try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
    } catch (e) {
        body = event.body;
    }

    let uri = event.url || event.headers['x-envoy-original-path'] || '/';    
    const domain = process.env.WORKER_DOMAIN || "https://d5d2v5jjmbggp9k8qe8q.pdkwbi1w.apigw.yandexcloud.net";
    const origin = domain.startsWith('http') ? domain : `https://${domain}`;

    // Используем конструктор URL для защиты от двойных слэшей и протоколов
    const urlObj = new URL(uri, origin);
    const fullUrl = urlObj.toString();
    //console.log("🛠 URL ДЛЯ ВОРКЕРА:", fullUrl);

    // 1. Формируем чистые заголовки
    const headers = new Headers();
    for (const [key, value] of Object.entries(event.headers || {})) {
        headers.set(key, value);
    }

    const requestOptions = {
        method: event.httpMethod,
        headers: headers, // Используем объект Headers
    };

    // Обработка Body (бинарники из Telegram приходят в base64)
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD' && event.body) {
        requestOptions.body = event.isBase64Encoded 
            ? Buffer.from(event.body, 'base64') 
            : event.body;
            
        // КРИТИЧНО: Если это POST, нам нужно убедиться, что Content-Length не конфликтует
        // node-fetch сам пересчитает его для Buffer
        headers.delete('content-length'); 
    }

    // ДЕБАГ-ЛОГ: Всё в одну строку для удобства чтения в Cloud Logs
    console.log(`🛠 [WORKER_IN] URL ДЛЯ ВОРКЕРА ${fullUrl} -> ${requestOptions.method} | TYPE: ${headers.get('content-type') || 'none'}`);

    const env = {
        ...process.env,
        LAST_PHOTO_STORAGE: USER_DB_ADAPTER, 
        BOT_LOGS_STORAGE: USER_DB_ADAPTER,
        FILES_DB: FILES_DB_ADAPTER,
        TypedValues,
        runQuery,
        filesDriver,
        nodeCrypto,
        // Функции с методом fetch:
        LESHIY_AI_PROXY: {
            fetch: (url, opts) => fetch(process.env.LESHIY_AI_PROXY || url, opts)
        },
        LESHIY_CONVERTER: {
            toString: () => process.env.LESHIY_CONVERTER,
            fetch: async (url, opts) => {
                let finalOpts = { ...opts };
    
                // Если пришел FormData — магия автоматизации
                if (opts.body && (opts.body instanceof FormData || opts.body.constructor.name === 'FormData')) {
                    const { body, contentType } = await prepareMultipart(opts.body);
                    finalOpts.body = body;
                    // Важно: перебиваем заголовки, чтобы был правильный boundary и длина
                    finalOpts.headers = {
                        ...(opts.headers || {}),
                        'Content-Type': contentType,
                        'Content-Length': body.length.toString()
                    };
                }
    
                // Вызываем системный fetch с уже "правильным" телом
                const finalUrl = (typeof url === 'string') ? url : process.env.LESHIY_CONVERTER;
                return fetch(finalUrl, finalOpts);
            }
        }
    };

    // Список для сбора обещаний, которые нужно дождаться
    const pendingPromises = [];
    const ctx = { 
        waitUntil: (promise) => {
            pendingPromises.push(promise);
        } 
    };

    try {
        // Пробуем вызвать воркер
        //const response = await (worker.fetch ? worker.fetch(request, env, ctx) : worker.worker_code_fetch(request, env, ctx));
        const request = new Request(fullUrl, requestOptions);
        const responsePromise = worker.fetch ? 
            worker.fetch(request, env, ctx) : 
            worker.worker_code_fetch(request, env, ctx);

        // Добавляем основной запрос в список ожидания
        ctx.waitUntil(responsePromise);

        // Ждем выполнения самого воркера
        const response = await responsePromise;

        // ВАЖНО: Читаем как ArrayBuffer, а не как текст!
        const responseArrayBuffer = await response.arrayBuffer();
        const responseBuffer = Buffer.from(responseArrayBuffer);
        
        const responseHeaders = {};
        response.headers.forEach((v, k) => { responseHeaders[k] = v; });
        responseHeaders['Access-Control-Allow-Origin'] = '*';
    
        // Ждем все остальные фоновые задачи воркера (логи, дебаги), 
        // которые он мог накидать в waitUntil
        if (pendingPromises.length > 1) {
            await Promise.all(pendingPromises);
        }
        
        return {
            statusCode: response.status || 200,
            headers: responseHeaders,
            // Передаем как Base64, чтобы Яндекс не ломал бинарные данные
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