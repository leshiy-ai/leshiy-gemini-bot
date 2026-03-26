const { USER_DB_ADAPTER, FILES_DB_ADAPTER, TypedValues, runQuery, filesDriver } = require('./db_adapter');
const nodeCrypto = require('crypto');
const worker = require('./worker'); 
const fetch = require('node-fetch');

// Один-в-один как в работающем сторадже
global.fetch = fetch;
global.Headers = fetch.Headers;
global.Request = fetch.Request;
global.Response = fetch.Response;
global.crypto = nodeCrypto;

module.exports.handler = async (event, context) => {
    let body = {};
    try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
    } catch (e) {
        body = event.body;
    }

    let uri = event.url || event.headers['x-envoy-original-path'] || '/';
    /*if (uri.startsWith('/gemini')) {
        uri = uri.replace('/gemini', '') || '/';
    }*/

    const domain = process.env.WORKER_DOMAIN || "d5d2v5jjmbggp9k8qe8q.pdkwbi1w.apigw.yandexcloud.net";
    //const fullUrl = `https://${domain.replace(/\/$/, '')}${uri}`;
    const fullUrl = `https://${domain}${uri}`;
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

    // 2. Обработка Body
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD' && event.body) {
        requestOptions.body = event.isBase64Encoded 
            ? Buffer.from(event.body, 'base64') 
            : event.body;
            
        // КРИТИЧНО: Если это POST, нам нужно убедиться, что Content-Length не конфликтует
        // node-fetch сам пересчитает его для Buffer
        headers.delete('content-length'); 
    }

    // 3. Создаем запрос ПРЯМО из опций
    const request = new Request(fullUrl, requestOptions);

    // ДЕБАГ-ЛОГ (добавь временно, чтобы увидеть, что доходит до воркера)
    console.log("🛠 REQUEST TO WORKER:", {
        method: request.method,
        url: request.url,
        contentType: request.headers.get('content-type'),
        bodyLength: requestOptions.body ? requestOptions.body.length : 0
    });

    const env = {
        ...process.env,
        LAST_PHOTO_STORAGE: USER_DB_ADAPTER, 
        CHAT_HISTORY_STORAGE: USER_DB_ADAPTER,
        BOT_LOGS_STORAGE: USER_DB_ADAPTER,
        FILES_DB: FILES_DB_ADAPTER,
        TypedValues,
        runQuery,
        filesDriver,
        nodeCrypto,
        // Теперь АИ-прокси — объект с методом fetch, как и хочет воркер
        LESHIY_AI_PROXY: {
            fetch: (url, opts) => fetch(process.env.LESHIY_AI_PROXY || url, opts)
        }
    };

    const ctx = { waitUntil: (promise) => promise };

    try {
        // Пробуем вызвать воркер
        const response = await (worker.fetch ? worker.fetch(request, env, ctx) : worker.worker_code_fetch(request, env, ctx));
        
        const responseText = await response.text();
        const responseHeaders = {};
        response.headers.forEach((v, k) => { responseHeaders[k] = v; });

        return {
            statusCode: response.status || 200,
            headers: responseHeaders,
            body: responseText,
            isBase64Encoded: false
        };

    } catch (err) {
        console.error("CRITICAL ERROR:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message, stack: err.stack })
        };
    }
};