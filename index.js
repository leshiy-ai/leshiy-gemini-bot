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

    // ДЕБАГ-ЛОГ (добавь временно, чтобы увидеть, что доходит до воркера)
    console.log("🛠 REQUEST TO WORKER:", {url: fullUrl, method: requestOptions.method, contentType: headers.get('content-type')});

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
        // Функции с методом fetch:
        LESHIY_AI_PROXY: {
            fetch: (url, opts) => fetch(process.env.LESHIY_AI_PROXY || url, opts)
        },
        LESHIY_CONVERTER: {
            // Принимаем url, который пришел из воркера (тот самый DEBUG_URL или ROTATE_URL)
            fetch: (url, opts) => {
                // Если url пришел как строка (результат сложения объекта со строкой), 
                // используем его. Если нет — берем базу.
                const finalUrl = (typeof url === 'string') ? url : process.env.LESHIY_CONVERTER;
                
                // ЛОГ, чтобы ты увидел в консоли Яндекса: ">>> FETCHING: .../rotate-image"
                console.log(`[CONVERTER] ${opts.method || 'GET'} -> ${finalUrl}`);
                
                return fetch(finalUrl, opts);
            },
            // МАГИЯ: этот метод вызывается, когда ты делаешь + "/debug"
            toString: () => process.env.LESHIY_CONVERTER.replace(/\/$/, '')
        }
    };

    const ctx = { waitUntil: (promise) => promise };

    try {
        // Пробуем вызвать воркер
        //const response = await (worker.fetch ? worker.fetch(request, env, ctx) : worker.worker_code_fetch(request, env, ctx));
        const response = await (worker.fetch ? 
            worker.fetch(new Request(fullUrl, requestOptions), env, ctx) : 
            worker.worker_code_fetch(new Request(fullUrl, requestOptions), env, ctx)
        );

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