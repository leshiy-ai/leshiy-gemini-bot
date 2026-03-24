const { USER_DB_ADAPTER, FILES_DB_ADAPTER, TypedValues, runQuery, filesDriver } = require('./db_adapter');
const nodeCrypto = require('crypto');
const worker = require('./worker'); 
const fetch = require('node-fetch');

// Глобальные пропсы для имитации среды Cloudflare/Browser
global.fetch = fetch;
global.Headers = fetch.Headers;
global.Request = fetch.Request;
global.Response = fetch.Response;
global.crypto = nodeCrypto; // Для генерации хешей/айдишников внутри конвертера

// Полифиллы для atob и btoa, которые отсутствуют в Node.js
global.atob = (b64) => Buffer.from(b64, 'base64').toString('binary');
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');


module.exports.handler = async (event, context) => {
    let body = {};
    try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
    } catch (e) {
        body = event.body;
    }

    // 1. Получаем путь из события Яндекса
    let uri = event.url || event.headers['x-envoy-original-path'] || '/';

    // ЭТО ГЛАВНОЕ: Убираем префикс /gemini, если он пришел из Шлюза
    // Чтобы воркер видел путь как "/" или "/webhook", а не "/gemini/webhook"
    if (uri.startsWith('/gemini')) {
        uri = uri.replace('/gemini', '') || '/';
    }

    // 2. Сборка URL (чтобы конвертер понимал пути)
    //const uri = event.url || event.headers['x-envoy-original-path'] || '/';
    const domain = process.env.WORKER_DOMAIN || "d5dtt5rfr7nk66bbrec2.apigw.yandexcloud.net";
    const fullUrl = `https://${domain.replace(/\/$/, '')}${uri}`;

    // 3. Создание объекта Request (имитируем Fetch API для воркера)
    const requestOptions = {
        method: event.httpMethod,
        headers: { ...event.headers }, // Копируем заголовки
    };

    if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD' && event.body) {
        requestOptions.body = event.isBase64Encoded 
            ? Buffer.from(event.body, 'base64') 
            : event.body;
    }

    const request = new fetch.Request(fullUrl, requestOptions);

    // 4. Окружение (ENV)
    // Сюда прокидываем все ключи, которые конвертер ждет в env
    const env = {
        // Сначала подмешиваем ВСЕ переменные из Yandex Cloud (GitHub Secrets + Vars)
        ...process.env,
        // Адаптеры для баз данных
        LAST_PHOTO_STORAGE: USER_DB_ADAPTER, 
        CHAT_HISTORY_STORAGE: USER_DB_ADAPTER,
        BOT_LOGS_STORAGE: USER_DB_ADAPTER,
        FILES_DB: FILES_DB_ADAPTER,
        // YDB-специфичные функции и переменные
        TypedValues: TypedValues, // Переменная из db_adapter
        runQuery: runQuery,       // Функция из db_adapter
        filesDriver: filesDriver, // Драйвер из db_adapter
        // Зависимости Node.js
        nodeCrypto: nodeCrypto,
    };

    const ctx = { 
        waitUntil: (promise) => promise 
    };

    // 5. ЗАПУСК КОНВЕРТЕРА
    try {
        // Если там export default { fetch... }, то пишем worker.default.fetch
        const response = await (worker.fetch ? worker.fetch(request, env, ctx) : worker.worker_code_fetch(request, env, ctx));
        
        // 6. Формирование ответа для Яндекса
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