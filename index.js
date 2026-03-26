const { USER_DB_ADAPTER, FILES_DB_ADAPTER, TypedValues, runQuery, filesDriver } = require('./db_adapter');
const nodeCrypto = require('crypto');
const worker = require('./worker'); 
const fetch = require('node-fetch');
const FormData = require('form-data');
global.FormData = require('form-data');

// Один-в-один как в работающем сторадже
global.fetch = fetch;
global.Headers = fetch.Headers;
global.Request = fetch.Request;
global.Response = fetch.Response;
global.crypto = nodeCrypto;

// Функция пересборки Multipart formData при каждом обращении
async function prepareMultipart(formData) {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const chunks = [];
    const crlf = '\r\n';

    for (const [key, value] of formData.entries()) {
        chunks.push(Buffer.from(`--${boundary}${crlf}`));
        
        // Проверяем, файл это или обычное поле
        if (value && typeof value === 'object' && (value.arrayBuffer || value instanceof Buffer)) {
            const filename = value.name || 'file.dat';
            const type = value.type || 'application/octet-stream';
            chunks.push(Buffer.from(`Content-Disposition: form-data; name="${key}"; filename="${filename}"${crlf}`));
            chunks.push(Buffer.from(`Content-Type: ${type}${crlf}${crlf}`));
            
            const buffer = value.arrayBuffer ? await value.arrayBuffer() : value;
            chunks.push(Buffer.from(buffer));
        } else {
            chunks.push(Buffer.from(`Content-Disposition: form-data; name="${key}"${crlf}${crlf}`));
            chunks.push(Buffer.from(String(value)));
        }
        chunks.push(Buffer.from(crlf));
    }
    chunks.push(Buffer.from(`--${boundary}--${crlf}`));

    return {
        body: Buffer.concat(chunks),
        contentType: `multipart/form-data; boundary=${boundary}`
    };
}

// --- ПЕРЕХВАТ ГЛОБАЛЬНОГО FETCH ---
const originalFetch = global.fetch;
global.fetch = async (url, opts) => {
    if (opts && opts.body && (opts.body instanceof FormData || opts.body.constructor.name === 'FormData')) {
        const { body, contentType } = await prepareMultipart(opts.body);
        
        // Создаем новые опции, чтобы не мутировать старые
        const newOpts = { ...opts };
        newOpts.body = body;
        newOpts.headers = {
            ...(opts.headers || {}),
            'Content-Type': contentType,
            'Content-Length': body.length.toString()
        };
        return originalFetch(url, newOpts);
    }
    return originalFetch(url, opts);
};

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

    // ДЕБАГ-ЛОГ: Всё в одну строку для удобства чтения в Cloud Logs
    console.log(`🛠 [WORKER_IN] URL ДЛЯ ВОРКЕРА ${fullUrl} -> ${requestOptions.method} | TYPE: ${headers.get('content-type') || 'none'}`);

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