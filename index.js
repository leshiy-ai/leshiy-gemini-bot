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
    if (uri.startsWith('/gemini')) {
        uri = uri.replace('/gemini', '') || '/';
    }

    const domain = process.env.WORKER_DOMAIN || "d5dtt5rfr7nk66bbrec2.apigw.yandexcloud.net";
    const fullUrl = `https://${domain.replace(/\/$/, '')}${uri}`;
    console.log("🛠 URL ДЛЯ ВОРКЕРА:", fullUrl);
    const requestOptions = {
        method: event.httpMethod,
        headers: { ...event.headers },
    };

    if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD' && event.body) {
        requestOptions.body = event.isBase64Encoded 
            ? Buffer.from(event.body, 'base64') 
            : event.body;
    }

    // Используем глобальный Request (который мы приравняли к fetch.Request выше)
    const request = new Request(fullUrl, { ...requestOptions });

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
        // Теперь оба прокси — объекты с методом fetch, как и хочет воркер
        GEMINI_PROXY: {
            fetch: (url, opts) => fetch(process.env.GEMINI_PROXY || url, opts)
        },
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