// Worker для Cloudflare: Мультимодальный Telegram-бот "Gemini AI" by Leshiy
// Автор: Огорельцев Александр Валерьевич @Leshiyalex

const VERSION = 'v5.0.2 от 27.03.2026'; // <-- КОНСТАНТА ДЛЯ ВЕРСИИ

// --- ГЛОБАЛЬНЫЕ КОНСТАНТЫ ---
const GLOBAL_DEBUG_KEY = 'global_debug_setting'; // Отладка / Debug
const GLOBAL_PHOTO_KEY = 'global_photo_enabled'; // Улучшение фото
const GLOBAL_VIDEO_KEY = 'global_video_enabled'; // Создание видео
const GLOBAL_TTS_KEY = 'global_tts_enabled'; // Озвучка голосом
const ADMIN_STATE_KEY = '_admin_state'; 
const ADMIN_TARGET_ID_KEY = '_admin_target_id';
// Промпты по умолчанию для улучшения фото и оживления видео
const DEFAULT_IMAGE_PROMPT = "Улучшение и колоризация старых фотографий: обрезать лишнее (если есть рамка - убрать), добавить цветности, качество, фотореализм, не размывать лица.";
const DEFAULT_VIDEO_PROMPT = "Кинематографичное оживление фото, прочувствуй атмосферу, плавное движение камеры, драматическое освещение, ультравысокое качество, реалистичные лица.";
const DEFAULT_AUDIO_PROMPT = "Красивый человеческий аватар с выразительной мимикой. Плавное движение головы и естественная мимика, чёткий фокус"; // Или любой другой желаемый промпт
// Имя ключа для сохранения последнего fileId, чтобы кнопки знали, с чем работать
const LAST_FILE_ID_KEY_SUFFIX = '_last_file_id';  // Имя ключа для сохранения file_id для фото
const USER_PROMPT_KEY_SUFFIX = '_user_prompt';
const LAST_PROMPT_KEY_SUFFIX = '_last_prompt';
const LAST_PROMPT_MESSAGE_ID_KEY_SUFFIX = '_last_prompt_message_id'; // Для редактирования меню
const LAST_PROMPT_LANG_KEY_SUFFIX = '_last_prompt_lang'; // <-- Язык перевода промпта RU/EN
const LAST_MEDIA_TYPE_KEY_SUFFIX = '_last_media_type'; // Например, _last_media_type
const LAST_IMAGE_DATA_KEY_SUFFIX = '_last_image_data'; // <-- Base64 данные для фото
const LAST_VIDEO_DATA_KEY_SUFFIX = '_last_video_data'; // <-- Base64 данные для видео
const LAST_AUDIO_DATA_KEY_SUFFIX = '_last_audio_data'; // <-- Base64 данные для аудио
const CREATIVE_MODE_KEY_SUFFIX = '_creative_mode';
const VIDEO_PARAMS_KEY_SUFFIX = '_video_params'; // <-- ПАРАМЕТРЫ ВИДЕО
const PHOTO_URL_KEY_SUFFIX = '_photo_url';
const VIDEO_URL_KEY_SUFFIX = '_video_url';
const AUDIO_URL_KEY_SUFFIX = '_audio_url';
const AUDIO_FILE_ID_KEY_SUFFIX = '_audio_file_id'; 
const AUDIO_DURATION_KEY_SUFFIX = '_audio_duration';
const LAST_ACTIVE_VIDEO_KEY_SUFFIX = '_active_video_task';
const LAST_ACTIVE_AUDIO_KEY_SUFFIX = '_active_audio_task';
const LAST_ACTIVE_IMAGE_KEY_SUFFIX = '_active_image_task'; // <-- Хранит Task ID и Model Config для Image
const LAST_ACTION_KEY_SUFFIX = '_last_action'; // Для режима редактирования (edit_prompt)
const USER_STATE_KEY_SUFFIX = '_user_state'; // <-- КРИТИЧЕСКИ ВАЖНОЕ ДОБАВЛЕНИЕ
// --- НОВЫЕ ГЛОБАЛЬНЫЕ КОНСТАНТЫ ЦЕНООБРАЗОВАНИЯ И КРЕДИТОВ ---
const CREDIT_COST_RUB = 5; // Цена одного кредита в рублях
const PRICE_PER_PHOTO_RUB = CREDIT_COST_RUB;    // 20 руб.
const PRICE_PER_VIDEO_RUB = 20 * CREDIT_COST_RUB; // 100 руб.
// Единица баланса: Кредит (1 Кредит = 5 руб).
const COST_PHOTO_CREDIT = 4;  // Стоимость фото в кредитах (20 руб.)
const COST_VIDEO_CREDIT = 20; // Стоимость видео в кредитах (100 руб.)
const FREE_LIMIT = 80; // 80 бесплатных кредитов (4 видео или 20 фото без видео)
const VIP_THRESHOLD_RUB = 1000; // Порог VIP в рублях
const SUBSCRIPTION_DAYS = 30; // Длительность подписки по умолчанию (для setCreditSubscription)
const SUBSCRIPTION_END_KEY_SUFFIX = '_sub_end_credit'; // Ключ для хранения метки времени окончания безлимита
const PAYMENT_LINK = "https://boosty.to/leshiyalex/single-payment/donation/754164/target?share=target_link";
// 🛑 ЕДИНАЯ КОНСТАНТА, СОДЕРЖАЩАЯ ВСЕ ТАРИФЫ И КРЕДИТЫ (для System Prompts и Перехватов)
const TARIFF_MESSAGE_TEXT = `Валюта бота: 💰 Кредиты (1 Кредит = ${CREDIT_COST_RUB} руб.)
💷 Наши тарифы:
    🆓 Бесплатный лимит: ${FREE_LIMIT} бесплатных кредитов для новых пользователей (этого хватит на 4 видео или 20 фото без видео).
1. Бесплатно! всегда и в любом количестве:
    💬 Писать в чат - общаться с лучшей язаковой моделью Gemini.
    🔈 Отправлять голосовое - это вариант общения голосом, если лень писать текстом.
    🎧 Отправлять мне аудио или видеофайл я его транскрибирую в текст.
    🎨 Бесплатный Креатив (команда /create) для бесплатной генерации картинок по промпту и фотографии.
    ✏️ Получать описание и промпт (команда /prompt) для создания или перегенерации промпта.
    🎙️ Озвучить Текст (команда /say) для озвучивания текста голосом
2. 📈 Стоимость операций:
    ✨ Улучшить Фото (команда /photo): ${COST_PHOTO_CREDIT} кредита (${COST_PHOTO_CREDIT * CREDIT_COST_RUB} руб.)
    📸 Оживить Фото (I2V в меню /video): ${COST_VIDEO_CREDIT} кредитов (${COST_VIDEO_CREDIT * CREDIT_COST_RUB} руб.)
    📹 Сгенерить Видео (T2V в меню /video): ${COST_VIDEO_CREDIT} кредитов (${COST_VIDEO_CREDIT * CREDIT_COST_RUB} руб.)
    📽️ Изменить Видео (V2V в меню /video): Цена за секунду генерации:
        # 6    кредитов/сек за видео для качества 480p (30 руб./сек) = ролик 3 сек. = 90 руб.
        # 9,5  кредитов/сек за видео для качества 580p (47,5 руб./сек)
        # 12,5 кредитов/сек за видео для качества 720p (62,5 руб./сек)
    🗣 Создать Аватар (A2V в меню /video или команда /avatar): Цена за секунду до 15 секунд на генерацию.:
        # 3    кредита/сек (15 руб./сек) для качества 480P 
        # 12   кредитов/сек (60 руб./сек) для качества 720P"
    🆙  Увеличение разрешения фото и видео (/upscale) за пол цены от генерации:
        🔍 Увеличить Фото для загруженной фотографии - увеличить разрешение в 4 раза всего за 2 кредита
        📺 Повысить Видео для уже сгенерированного видеоролика - увеличить разрешение до 720p за 10 кредитов.
3. 💳 Способы пополнения баланса:
    А. Оплата через Telegram Stars (рекомендуется):
    💰 4 Кредита = ⭐️ 10 звёзд (Одно фото)
    💰 20 Кредитов = ⭐️ 50 звёзд (Одно видео)
    💰 30 Кредитов = ⭐️ 75 звёзд (Начало)
    💰 42 Кредита = ⭐️ 100 звёзд (Базовый)
    💰 58 Кредитов = ⭐️ 150 звёзд (Норма)
    💰 100 Кредитов = ⭐️ 250 звёзд (Профи)
    💰 250 Кредитов = ⭐️ 500 звёзд (Макс)
    💰 400 Кредитов = ⭐️ 750 звёзд (Анлим)
    Б. Донаты (Boosty): Поштучно, 1 Кредит = ${CREDIT_COST_RUB} руб.
    ссылка на страницу оплаты Boosty: [ПОПОЛНИТЬ СЧЕТ / КУПИТЬ ДОСТУП](${PAYMENT_LINK})
    В. Экономия: Перейти по кнопкам-ссылкам в меню /balance и купить дешевле.
4. 👑 Безлимитный доступ (VIP): При оплате от ${VIP_THRESHOLD_RUB} руб. и выше, 
    Вы получаете полный безлимитный доступ на месяц ко всем платным функциям (/photo, /video) без ограничений!
5. 🔑 Для продвинутых пользователей (свой API-ключ):
    Вариант самим контролировать свои финансы и пользоваться ботом только как инструментом:
    Задать свой API-ключ (команда /apikey) для управления API-ключом. 
    Ключ можно получить на сайте: https://kie.ai/ru/api-key (выдается 80 БЕСПЛАТНЫХ кредитов).
`;
// ----------------------------------------------------------------------
// --- НАСТРОЙКИ TELEGRAM STARS ---
// Пакеты пополнения: [Кол-во Звезд, Кол-во Кредитов, Описание]
const STARS_PACKAGES = [
    //{ stars: 1,  credits: 1,  label: "Тест (1 кр.)" },   // ~2,5 руб
    //{ stars: 2,  credits: 1,  label: "Один к одному (1 кр.)" },   // ~5 руб
    { stars: 10,  credits: 4,  label: "Одно фото (4 кр.)" },  // ~20 руб
    { stars: 50,  credits: 20,  label: "Одно видео (20 кр.)" },   // ~100 руб
    { stars: 75,  credits: 30,  label: "Начало (30 кр.)" },  // ~150 руб
    { stars: 100, credits: 42,  label: "Базовый (42 кр.)" }, // ~210 руб (+бонус)
    { stars: 150, credits: 58,  label: "Норма (58 кр.)" }, // ~290 руб (+бонус)
    { stars: 250, credits: 100, label: "Профи (100 кр.)" },    // ~500 руб (+бонус)
    { stars: 500, credits: 250, label: "Макс (250 кр.)" },    // ~1200 руб (+бонус)
    { stars: 750, credits: 400, label: "Анлим (400 кр.)" }    // ~2000 руб (+бонус)
];
const STAR_FORMS = ['звезда', 'звезды', 'звёзд']; 
const CREDIT_FORMS = ['кредит', 'кредита', 'кредитов'];
const RUBLES_FORMS = ['рубль', 'рубля', 'рублей'];
// Константы для сравнения размеров
const RESOLUTIONS_HEIGHT = {
    '240p': 240,
    '360p': 360,
    '480p': 480,
    '720p': 720,
    '1080p': 1080,
    '1440': 1440,
    '2160': 2160
};
// Константы для поворота
const ROTATE_ANGLES = [
    { text: '↪️ 90° влево', param: '-90' },
    { text: '🔃 180° поворот', param: '180' },
    { text: '↩️ 90° вправо', param: '90' }
];
const ANTI_FLOOD_KV_KEY_PREFIX = 'TG_UPD_';
const USER_API_KEY_SUFFIX = '_kieai_api_key';
const USER_LIMIT_KEY_SUFFIX = '_kieai_credits';
const SAY_VOICE_KEY_SUFFIX = '_say_voice';
const SAY_TEXT_KEY_SUFFIX = '_say_text'; // Хранит текст для озвучки
const SAY_AWAITING_VOICE_KEY_SUFFIX = '_say_awaiting_voice';
const SAY_VOICE_SOURCE_ID_SUFFIX = '_voice_file_id';
const SAY_MESSAGE_ID_KEY_SUFFIX = '_say_msg_id'; // Для сохранения ID сообщения меню
const VOICE_MALE = 'Male';
const VOICE_FEMALE = 'Female';
const VOICE_USER = 'user_voice';
const DEFAULT_VOICE = VOICE_MALE;
const SET_BASE_CALLBACK = 'setbase_'; 
const SET_VIDEO_BASE_CALLBACK = 'set_V_base_';
const RESIZE_VIDEO_MODE = 'VIDEO_TO_RESIZE';
const ROTATE_VIDEO_MODE = 'VIDEO_TO_ROTATE';
const RESIZE_IMAGE_MODE = 'IMAGE_TO_RESIZE';
const ROTATE_IMAGE_MODE = 'IMAGE_TO_ROTATE';
// Реализация поворота медиаконтента
const ROTATE_LEFT_CALLBACK = 'rot_L_'; // Поворот против часовой (на 90 градусов)
const ROTATE_RIGHT_CALLBACK = 'rot_R_'; // Поворот по часовой (на 90 градусов)
const ROTATE_180_CALLBACK = 'rot_180_'; // Поворот вниз головой (на 180 градусов)
const ROTATE_VIDEO_LEFT_CALLBACK = 'rot_V_L_';
const ROTATE_VIDEO_RIGHT_CALLBACK = 'rot_V_R_';
const ROTATE_VIDEO_180_CALLBACK = 'rot_V_180_';
const CALLBACK_EXPIRATION_TTL = 3600; // 1 час
// ------------------------------------

// --- ГЛОБАЛЬНАЯ КОНФИГУРАЦИЯ AI-СЕРВИСОВ (AI_MODELS) ---
const AI_MODELS = {

    // --- WORKERS AI (БЕСПЛАТНЫЕ, РАБОЧИЕ) ---

    // ✅ [Текст в Текст]
    TEXT_TO_TEXT_WORKERS_AI: { 
        SERVICE: 'WORKERS_AI', 
        FUNCTION: callWorkersAIChat, 
        //MODEL: '@cf/google/gemma-2b-it-lora', // тупой ЛЛама
        MODEL: '@cf/qwen/qwen2.5-coder-32b-instruct', // программерская
        //MODEL: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', // думающая
        //MODEL: '@cf/qwen/qwq-32b', // думающая
        API_KEY: 'CLOUDFLARE_API_TOKEN', 
        BASE_URL: 'AI_RUN' // Вызов через env.AI.run
    },
    // ✅ [Аудио в Текст]
    AUDIO_TO_TEXT_WORKERS_AI: { 
        SERVICE: 'WORKERS_AI', 
        FUNCTION: callWorkersAISpeechToText, 
        MODEL: '@cf/openai/whisper', 
        API_KEY: 'CLOUDFLARE_API_TOKEN', 
        BASE_URL: 'AI_RUN' // Исправлено для консистентности
    },
    // ✅ [Текст в Голос] команда /say - убогий перевод
    TEXT_TO_AUDIO_WORKERS_AI: { 
        SERVICE: 'WORKERS_AI', 
        FUNCTION: callWorkersAITextToAudio, 
        MODEL: '@cf/deepgram/aura-1', 
        //MODEL: '@cf/deepgram/aura-2-en', 
        API_KEY: 'CLOUDFLARE_API_TOKEN', 
        BASE_URL: 'AI_RUN' // Исправлено для консистентности
    },
    // ✅ [Изображение в Текст (Видение)]
    IMAGE_TO_TEXT_WORKERS_AI: { 
        SERVICE: 'WORKERS_AI', 
        FUNCTION: callWorkersAIVision,
        MODEL: '@cf/unum/uform-gen2-qwen-500m', 
        API_KEY: 'CLOUDFLARE_API_TOKEN', 
        BASE_URL: 'AI_RUN'
    },
    // ✅ [Текст в Изображение - /create]
    TEXT_TO_IMAGE_WORKERS_AI: { 
        SERVICE: 'WORKERS_AI', 
        FUNCTION: callWorkersAITextToImage,
        MODEL: '@cf/stabilityai/stable-diffusion-xl-base-1.0', 
        API_KEY: 'CLOUDFLARE_API_TOKEN', 
        BASE_URL: 'CLOUDFLARE_API_URL',
        pricing: 0 // бесплатно
    },
    // ✅ [Изображение в Изображение - /photo]
    IMAGE_TO_IMAGE_WORKERS_AI: { 
        SERVICE: 'WORKERS_AI', 
        FUNCTION: callWorkersAIImg2Img, // <-- ССЫЛКА НА ФУНКЦИЮ
        MODEL: '@cf/runwayml/stable-diffusion-v1-5-img2img', 
        API_KEY: 'CLOUDFLARE_API_TOKEN', 
        BASE_URL: 'CLOUDFLARE_API_URL',
        pricing: 0 // бесплатно
    },
    // ✅ [Видео в Текст]
    VIDEO_TO_TEXT_WORKERS_AI: { 
        SERVICE: 'WORKERS_AI', 
        FUNCTION: callWorkersAISpeechToText, 
        MODEL: '@cf/openai/whisper', 
        API_KEY: 'CLOUDFLARE_API_TOKEN', 
        BASE_URL: 'AI_RUN' // Исправлено для консистентности
    },

    // --- СЕРВИСЫ GOOGLE ---

    // --- GEMINI ---
    // ✅ Прекрасно работает текстовый чат
    TEXT_TO_TEXT_GEMINI: { 
        SERVICE: 'GEMINI', 
        FUNCTION: callGeminiChat, 
        MODEL: 'gemini-2.5-flash-lite', 
        API_KEY: 'GEMINI_API_KEY', 
        BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
        PROXY_KEY: 'GEMINI_PROXY_KEY'
    },
    // ✅ Работает распознавание голоса
    AUDIO_TO_TEXT_GEMINI: { 
        SERVICE: 'GEMINI', 
        FUNCTION: callGeminiSpeechToText,
        MODEL: 'gemini-2.5-flash', 
        API_KEY: 'GEMINI_API_KEY', 
        BASE_URL: 'https://generativelanguage.googleapis.com/v1beta'
    },
    // ✅ Работает распознавание голоса
    VIDEO_TO_TEXT_GEMINI: { 
        SERVICE: 'GEMINI', 
        FUNCTION: callGeminiSpeechToText,
        MODEL: 'gemini-2.5-flash', 
        API_KEY: 'GEMINI_API_KEY', 
        BASE_URL: 'https://generativelanguage.googleapis.com/v1beta'
    },
    // ✅ Возвращает сырой PCM-файл который надо сконвертировать
    TEXT_TO_AUDIO_GEMINI: { 
        SERVICE: 'GEMINI', 
        FUNCTION: callGeminiTextToAudio,
        MODEL: 'gemini-2.5-flash-preview-tts', 
        API_KEY: 'GEMINI_API_KEY', 
        BASE_URL: 'https://generativelanguage.googleapis.com/v1beta'
    },
    // ✅ Работает распознавание фото
    IMAGE_TO_TEXT_GEMINI: { 
        SERVICE: 'GEMINI', 
        FUNCTION: callGeminiVision, 
        //MODEL: 'gemini-2.0-flash', 
        MODEL: 'gemini-2.5-flash', 
        API_KEY: 'GEMINI_API_KEY', 
        BASE_URL: 'https://generativelanguage.googleapis.com/v1beta'
    },
    // ✅ Работает распознавание видео
    VIDEO_TO_ANALYSIS_GEMINI: { 
        SERVICE: 'GEMINI', 
        FUNCTION: callGeminiVideoVision, 
        MODEL: 'gemini-2.5-flash', 
        API_KEY: 'GEMINI_API_KEY', 
        BASE_URL: 'https://generativelanguage.googleapis.com/v1beta'
    },
    // ❌ ПЛАТНО: You exceeded your current quota
    TEXT_TO_IMAGE_GEMINI: { 
        SERVICE: 'GEMINI', 
        FUNCTION: callGeminiText2Image, 
        MODEL: 'gemini-2.5-flash-image', // Nano Banana : Gemini 2.5 Flash Image
        //MODEL: 'gemini-3.1-flash-image-preview',
        API_KEY: 'GEMINI_API_KEY', 
        BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
        pricing: COST_PHOTO_CREDIT // СТАТИЧЕСКАЯ ЦЕНА ЗА ФОТО
    },
    // ❌ ПЛАТНО: Image generation is not available in your country
    IMAGE_TO_IMAGE_GEMINI: { 
        SERVICE: 'GEMINI', 
        FUNCTION: callGeminiImage2Image, 
        //MODEL: 'gemini-2.5-flash',
        MODEL: 'gemini-2.5-flash-image',
        API_KEY: 'GEMINI_API_KEY', 
        BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
        pricing: COST_PHOTO_CREDIT // СТАТИЧЕСКАЯ ЦЕНА ЗА ФОТО
    },
    /*/ ❌ ПЛАТНО: Video generation is not available in your country
    IMAGE_TO_VIDEO_VEO: { 
        SERVICE: 'GEMINI', 
        FUNCTION: startGeminiVeoImageToVideo, 
        //MODEL: 'veo-3.0-generate-001',
        MODEL: 'veo-2.0-generate-001',
        API_KEY: 'GEMINI_API_KEY', 
        //BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning?key=${GEMINI_API_KEY}'
        BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/'
    },*/

    // KIE.AI - самый быстрый API с колбэком, ПЛАТНЫЙ
    
    // [google/nano-banana] (Через KIE.AI API, ПЛАТНЫЙ, 4 кредита)
    TEXT_TO_IMAGE_KIEAI: { 
        SERVICE: 'KIEAI', 
        FUNCTION: startKieAiTextToImage,
        MODEL: 'google/nano-banana', 
        //MODEL: 'grok-imagine/text-to-image', // 6 фоток сразу
        API_KEY: 'KIEAI_API_KEY', 
        BASE_URL: 'https://api.kie.ai/api/v1',
        pricing: COST_PHOTO_CREDIT // СТАТИЧЕСКАЯ ЦЕНА ЗА ФОТО
    },
    // [google/nano-banana-edit] (Через KIE.AI API, ПЛАТНЫЙ, 4 кредита)
    IMAGE_TO_IMAGE_KIEAI: { 
        SERVICE: 'KIEAI', 
        FUNCTION: startKieAiImageToImage, // <-- НОВЫЙ УНИФИЦИРОВАННЫЙ ОБРАБОТЧИК
        MODEL: 'google/nano-banana-edit', 
        API_KEY: 'KIEAI_API_KEY', 
        BASE_URL: 'https://api.kie.ai/api/v1',
        pricing: COST_PHOTO_CREDIT // СТАТИЧЕСКАЯ ЦЕНА ЗА ФОТО
    },
    // recraft/crisp-upscale (Через KIE.AI API, ПЛАТНЫЙ, 0.5 кредита)
    IMAGE_TO_UPSCALE_KIEAI: { 
        SERVICE: 'KIEAI',
        FUNCTION: startKieAiImageToUpscale, // <--- функция
        MODEL: 'recraft/crisp-upscale', // имя модели
        API_KEY: 'KIEAI_API_KEY', 
        BASE_URL: 'https://api.kie.ai/api/v1',
        pricing: 2 // 2 кредита за апскейл
    },
    // [grok-imagine/text-to-video] (Через KIE.AI API, ПЛАТНЫЙ, 20 кредитов)
    TEXT_TO_VIDEO_KIEAI: { 
        SERVICE: 'KIEAI', 
        FUNCTION: startKieAiTextToVideo, // <-- ОБРАБОТЧИК ДЛЯ Kie.Ai
        MODEL: 'grok-imagine/text-to-video', 
        API_KEY: 'KIEAI_API_KEY', // Имя переменной окружения
        //BASE_URL: 'https://api.kie.ai/api/v1/jobs/createTask'
        BASE_URL: 'https://api.kie.ai/api/v1',
        pricing: COST_VIDEO_CREDIT // СТАТИЧЕСКАЯ ЦЕНА ЗА ВИДЕО
    },
    // [grok-imagine/image-to-video] (Через KIE.AI API, ПЛАТНЫЙ, 20 кредитов)
    IMAGE_TO_VIDEO_KIEAI: { 
        SERVICE: 'KIEAI', 
        FUNCTION: startKieAiImageToVideo, // <-- ОБРАБОТЧИК ДЛЯ Kie.Ai
        MODEL: 'grok-imagine/image-to-video', 
        API_KEY: 'KIEAI_API_KEY', // Имя переменной окружения
        //BASE_URL: 'https://api.bothub.chat/v1/video/generate'
        BASE_URL: 'https://api.kie.ai/api/v1',
        pricing: COST_VIDEO_CREDIT // СТАТИЧЕСКАЯ ЦЕНА ЗА ВИДЕО
    },
    // [grok-imagine/upscale] (Через KIE.AI API, ПЛАТНЫЙ, 10 кредитов)
    // Grok Imagine videos from 360p to 720p; supports only Kie AI–generated taskids and costs 10 credits (~$0.05) per upscale
    VIDEO_TO_UPSCALE_KIEAI: { 
        SERVICE: 'KIEAI', 
        FUNCTION: startKieAiVideoUpscale, // <-- ФУНКЦИЯ-ОБРАБОТЧИК
        MODEL: 'grok-imagine/upscale', 
        API_KEY: 'KIEAI_API_KEY', 
        BASE_URL: 'https://api.kie.ai/api/v1',
        // ✅ СТАТИЧЕСКАЯ ЦЕНА
        pricing: 10.0
    },
    // [wan/2-2-animate-move] (Через KIE.AI API, ПЛАТНЫЙ, 6 кредитов/сек)
    VIDEO_TO_VIDEO_KIEAI_WAN: { 
        SERVICE: 'KIEAI', 
        FUNCTION: startKieAiWanVideo2Video, // <-- НОВАЯ ФУНКЦИЯ-ОБРАБОТЧИК
        //MODEL: 'wan/2-2-animate-move', 
        MODEL: 'wan/2-2-animate-replace', 
        API_KEY: 'KIEAI_API_KEY', 
        BASE_URL: 'https://api.kie.ai/api/v1',
        // ✅ ДИНАМИЧЕСКАЯ ЦЕНА (Посекундная)
        pricing: {
            '480p': 6.0,  // Тариф за сек, 480p
            '580p': 9.5,  // Тариф за сек, 580p
            '720p': 12.5, // Тариф за сек, 720p
            '1080p': 12.5 // Тариф за сек, 1080p
        }
    },
    VIDEO_TO_VIDEO_KIEAI_Kling: { 
        SERVICE: 'KIEAI', 
        FUNCTION: startKieAiKlingVideo2Video, // <-- НОВАЯ ФУНКЦИЯ-ОБРАБОТЧИК
        MODEL: 'kling-2.6/motion-control', 
        API_KEY: 'KIEAI_API_KEY', 
        BASE_URL: 'https://api.kie.ai/api/v1',
        // ✅ ДИНАМИЧЕСКАЯ ЦЕНА Kling (Посекундная)
        pricing: {
            '720p': 6, // Тариф за сек, 720p
            '1080p': 9 // Тариф за сек, 1080p
        }
    },
    // [infinitalk/from-audio] (Через KIE.AI API, ПЛАТНЫЙ, 3 кредита/сек минимально)
    AUDIO_TO_VIDEO_KIEAI: { 
        SERVICE: 'KIEAI', 
        FUNCTION: startKieAiAudio2Video,
        MODEL: 'infinitalk/from-audio', 
        API_KEY: 'KIEAI_API_KEY', 
        BASE_URL: 'https://api.kie.ai/api/v1',
        // ✅ ДИНАМИЧЕСКАЯ ЦЕНА (Посекундная)
        pricing: {
            '480p': 3.0,  // Тариф за сек, 480P
            '580p': 3.0,  // Тариф за сек, 580P
            '720p': 12.0, // Тариф за сек, 720P
            '1080p': 12.0 // Тариф за сек, 1080p
        }
    },
    // [elevenlabs/text-to-speech-turbo-2-5] (Через KIE.AI API, ПЛАТНЫЙ, 12 кредитов за мин.)
    TEXT_TO_AUDIO_KIEAI: { 
        SERVICE: 'KIEAI', 
        FUNCTION: startKieAiTextToAudio,
        MODEL: 'elevenlabs/text-to-speech-turbo-2-5', 
        API_KEY: 'KIEAI_API_KEY', 
        BASE_URL: 'https://api.kie.ai/api/v1',
        pricing: 6 // СТАТИЧЕСКАЯ ЦЕНА ЗА АУДИО
    },
    // [elevenlabs/audio-isolation] (Через KIE.AI API, ПЛАТНЫЙ, 6 кредитов)
    AUDIO_TO_AUDIO_KIEAI: { 
        SERVICE: 'KIEAI', 
        FUNCTION: startKieAiAudioIsolation, // Новая функция
        MODEL: 'elevenlabs/audio-isolation', // Идентификатор модели
        API_KEY: 'KIEAI_API_KEY', 
        BASE_URL: 'https://api.kie.ai/api/v1',
        pricing: 2 // 2 кредита за 10 сек. аудио, минимум 5 сек.
    },
        
    // --- BOTHUB (ПЛАТНЫЕ, ТЕСТОВЫЕ) ---

    // --- BOTHUB TEXT --- (БЕСПЛАТНО)
    TEXT_TO_TEXT_BOTHUB: { 
        SERVICE: 'BOTHUB', 
        FUNCTION: callBotHubTextChat, 
        //MODEL: 'deepseek-chat-v3-0324:free', 
        //MODEL: 'gpt-oss-20b:free',   
        MODEL: 'gemini-2.5-flash',       
        API_KEY: 'BOTHUB_API_KEY', 
        //BASE_URL: 'https://bothub.chat/api/v2/openai/v1/chat/completions'
        BASE_URL: 'https://bothub.chat/api/v2/openai/v1'
    },
    TEXT_TO_AUDIO_BOTHUB: { 
        SERVICE: 'BOTHUB', 
        FUNCTION: callBothubTextToAudio, 
        //MODEL: 'tts-1-hd', 
        MODEL: 'tts-1',
        API_KEY: 'BOTHUB_API_KEY', 
        //BASE_URL: 'https://bothub.chat/api/v2/openai/v1/audio/speech'
        BASE_URL: 'https://bothub.chat/api/v2/openai/v1'
    },
    // --- BOTHUB WHISPER-1 --- (ПЛАТНО)
    AUDIO_TO_TEXT_BOTHUB: { 
        SERVICE: 'BOTHUB', 
        FUNCTION: callBotHubAudioToText,
        MODEL: 'whisper-1', 
        API_KEY: 'BOTHUB_API_KEY', 
        BASE_URL: 'https://bothub.chat/api/v2/openai/v1'
    },
    // --- BOTHUB VISION --- (ПЛАТНО и нестабильно)
    IMAGE_TO_TEXT_BOTHUB: { 
        SERVICE: 'BOTHUB', 
        FUNCTION: callBotHubVisionChat, 
        //MODEL: 'gemini-2.0-flash-exp:free', 
        //MODEL: 'gpt-4o',   
        MODEL: 'gemini-2.5-flash',         
        API_KEY: 'BOTHUB_API_KEY', 
        //BASE_URL: 'https://bothub.chat/api/v2/openai/v1/chat/completions'
        BASE_URL: 'https://bothub.chat/api/v2/openai/v1'
    },
    // [DALL-E-3 - /create] (ПЛАТНЫЙ - 33000 CAPS / 5,19 ₽ за шт.)
    TEXT_TO_IMAGE_BOTHUB: { 
        SERVICE: 'BOTHUB', 
        FUNCTION: callBotHubText2Img, // <-- ОТДЕЛЬНЫЙ ОБРАБОТЧИК Dalle-E-3
        MODEL: 'dall-e-3', 
        API_KEY: 'BOTHUB_API_KEY', 
        //BASE_URL: 'https://bothub.chat/api/v2/openai/v1/images/generations'
        BASE_URL: 'https://bothub.chat/api/v2/openai/v1',
        pricing: COST_PHOTO_CREDIT // СТАТИЧЕСКАЯ ЦЕНА ЗА ФОТО
    },
    // [gemini-2.5-flash-image для /photo] (Через BotHub API, ПЛАТНЫЙ)
    IMAGE_TO_IMAGE_BOTHUB: { 
        SERVICE: 'BOTHUB', 
        FUNCTION: callBotHubImage2Image, // <-- ОБРАБОТЧИК ДЛЯ BOTHUB
        MODEL: 'gemini-2.5-flash-image', 
        API_KEY: 'BOTHUB_API_KEY', // Имя переменной окружения
        //BASE_URL: 'https://bothub.chat/api/v2/openai/v1/chat/completions'
        BASE_URL: 'https://bothub.chat/api/v2/openai/v1',
        pricing: COST_PHOTO_CREDIT // СТАТИЧЕСКАЯ ЦЕНА ЗА ФОТО
    }, 
    // --- BOTHUB WHISPER-1 --- (ПЛАТНО)
    VIDEO_TO_TEXT_BOTHUB: { 
        SERVICE: 'BOTHUB', 
        FUNCTION: callBotHubAudioToText,
        MODEL: 'whisper-1', 
        API_KEY: 'BOTHUB_API_KEY', 
        BASE_URL: 'https://bothub.chat/api/v2/openai/v1'
    },
    // --- BOTHUB VIDEO VISION --- (ПЛАТНО)
    VIDEO_TO_ANALYSIS_BOTHUB: { 
        SERVICE: 'BOTHUB', 
        FUNCTION: callBothubVideoVision, 
        MODEL: 'gemini-2.5-flash',         
        API_KEY: 'BOTHUB_API_KEY', 
        //BASE_URL: 'https://bothub.chat/api/v2/openai/v1/chat/completions'
        BASE_URL: 'https://bothub.chat/api/v2/openai/v1'
    },
    /*// [Runway gen3a_turbo для /video] (Через BotHub API, ПЛАТНЫЙ - отключено)
    TEXT_TO_VIDEO_BOTHUB: { 
        SERVICE: 'BOTHUB', 
        FUNCTION: startBotHubTextToVideo, // <-- ОБРАБОТЧИК ДЛЯ BOTHUB
        MODEL: 'gen3a_turbo', 
        API_KEY: 'BOTHUB_API_KEY', // Имя переменной окружения
        //BASE_URL: 'https://bothub.chat/api/v2/openai/v1/chat/completions'
        BASE_URL: 'https://bothub.chat/api/v2/openai/v1' 
    },
    // [Runway gen4_turbo для /video] (Через BotHub API, ПЛАТНЫЙ - отключено)
    IMAGE_TO_VIDEO_BOTHUB: { 
        SERVICE: 'BOTHUB', 
        FUNCTION: startBotHubImageToVideo, // <-- ОБРАБОТЧИК ДЛЯ BOTHUB
        MODEL: 'gen4_turbo', 
        API_KEY: 'BOTHUB_API_KEY', // Имя переменной окружения
        //BASE_URL: 'https://api.bothub.chat/v1/video/generate'
        BASE_URL: 'https://bothub.chat/api/v2/openai/v1' 
    },*/
    
    // ПРОЧИЕ ПЛАТНЫЕ СЕРВИСЫ ---

    // [FUSIONBRAIN Kandinsky - /create] (Тестовый, ПЛАТНЫЙ попытки 88/100 до 01.01.2026)
    TEXT_TO_IMAGE_KANDINSKY: { 
        SERVICE: 'FUSIONBRAIN', 
        FUNCTION: callKandinskyText2Img, // <-- ОБРАБОТЧИК ДЛЯ FUSIONBRAIN
        MODEL: 'kandinsky', 
        API_KEY: 'FUSIONBRAIN_API_KEY', // Имя переменной окружения
        BASE_URL: 'https://api-key.fusionbrain.ai',
        pricing: 4 // СТАТИЧЕСКАЯ ЦЕНА
    },

    // Текст в голос - говорилка для /say
    TEXT_TO_AUDIO_VOICERSS: { 
        SERVICE: 'VOICERSS', 
        FUNCTION: callVoiceRSSTextToAudio,
        // ✅ ИСПОЛЬЗУЕМ ПОЛЕ 'MODEL' ДЛЯ ХРАНЕНИЯ ПАРАМЕТРОВ ПО УМОЛЧАНИЮ
        // Формат: language=ru-ru & voice=Olga & format=MP3
        //MODEL: 'hl=ru-ru&v=Olga&c=MP3',
        MODEL: 'hl=ru-ru&v=TTS-Model&c=MP3',
        API_KEY: 'VOICERSS_API_KEY', 
        BASE_URL: 'http://api.voicerss.org'
    },

    /** --- DEEPSEEK --- (ПЛАТНО $0.028 минимум)
    TEXT_TO_TEXT_DEEPSEEK: { 
        SERVICE: 'DEEPSEEK', 
        FUNCTION: callDeepSeekChat, 
        MODEL: 'deepseek-chat', 
        API_KEY: 'DEEPSEEK_API_KEY', 
        BASE_URL: 'https://api.deepseek.com/v1'
    },  */  

    // STABILITY.AI (Платный сервис)

    // STABILITY - Text-to-Image (Платно, 3 внешних кредита за генерацию)
    TEXT_TO_IMAGE_STABILITY: { 
        SERVICE: 'STABILITY',
        FUNCTION: startStabilityTextToImage, // Общая функция для T2I
        MODEL: 'core', // Ключ для модели 'Stable Image Core'
        API_KEY: 'STABILITY_API_KEY', 
        BASE_URL: 'https://api.stability.ai/v2beta/stable-image/generate/core', // Эндпоинт для Stable Image Core
        pricing: COST_PHOTO_CREDIT // СТАТИЧЕСКАЯ ЦЕНА ЗА ФОТО
    },
    // STABILITY - Image-to-Image (Платно, 2.5 внешних кредита за генерацию)
    IMAGE_TO_IMAGE_STABILITY: { 
        SERVICE: 'STABILITY',
        FUNCTION: startStabilityImageToImage, // Общая функция для I2I
        MODEL: 'sd3.5-flash', // Ключ для модели 'Stable Diffusion 3.5 Flash'
        API_KEY: 'STABILITY_API_KEY', 
        BASE_URL: 'https://api.stability.ai/v2beta/stable-image/generate/sd3', // Эндпоинт для Stable Diffusion 3
        pricing: COST_PHOTO_CREDIT // СТАТИЧЕСКАЯ ЦЕНА ЗА ФОТО
    },
    // STABILITY - Image Upscale - ДЛЯ АПСКЕЙЛА (Платно 2 кредита)
    IMAGE_TO_UPSCALE_STABILITY: { 
        SERVICE: 'STABILITY',
        FUNCTION: startStabilityImageUpscale, // <--- Наша новая функция
        MODEL: 'fast', // Условное имя модели
        API_KEY: 'STABILITY_API_KEY', 
        BASE_URL: 'https://api.stability.ai/v2beta/stable-image/upscale/fast', // Эндпоинт для Fast Upscaler
        pricing: 2 // 2 кредита за апскейл
    },

    /*/ --- ПРОЧИЕ ПЛАТНЫЕ СЕРВИСЫ (Пример) ---
    IMAGE_TO_IMAGE_FREEPIK: { 
        SERVICE: 'FREEPIK', 
        FUNCTION: callFreePikImg2Img,
        MODEL: 'freepik-model-1', 
        API_KEY: 'FREEPIK_API_KEY', 
        BASE_URL: 'https://freepik.api.url/generate/v1' 
    },*/
};

// --- КАРТА СЕРВИСОВ ДЛЯ АДМИН-МЕНЮ ---
const SERVICE_TYPE_MAP = {
    'TEXT_TO_TEXT': { name: '✍️ Text → Text', kvKey: 'ACTIVE_MODEL_TEXT_TO_TEXT' },
    'AUDIO_TO_TEXT': { name: '🎤 Audio → Text', kvKey: 'ACTIVE_MODEL_AUDIO_TO_TEXT' },
    'VIDEO_TO_TEXT': { name: '🎧 Video → Text', kvKey: 'ACTIVE_MODEL_VIDEO_TO_TEXT' },
    'TEXT_TO_AUDIO': { name: '🔊 Text → Audio', kvKey: 'ACTIVE_MODEL_TEXT_TO_AUDIO' },
    'IMAGE_TO_TEXT': { name: '👁️ Image → Text', kvKey: 'ACTIVE_MODEL_IMAGE_TO_TEXT' },
    'TEXT_TO_IMAGE': { name: '📖 Text → Image', kvKey: 'ACTIVE_MODEL_TEXT_TO_IMAGE' },
    'IMAGE_TO_IMAGE': { name: '✨ Image → Image', kvKey: 'ACTIVE_MODEL_IMAGE_TO_IMAGE' },
    'TEXT_TO_VIDEO': { name: '📹 Text → Video', kvKey: 'ACTIVE_MODEL_TEXT_TO_VIDEO' },
    'IMAGE_TO_VIDEO': { name: '🎬 Image → Video', kvKey: 'ACTIVE_MODEL_IMAGE_TO_VIDEO' },
    'VIDEO_TO_VIDEO': { name: '🎥 Video → Video', kvKey: 'ACTIVE_MODEL_VIDEO_TO_VIDEO' },
    'AUDIO_TO_AUDIO': { name: '💿 Audio → Audio', kvKey: 'ACTIVE_MODEL_AUDIO_TO_AUDIO' },
    'AUDIO_TO_VIDEO': { name: '🗣 Audio → Video', kvKey: 'ACTIVE_MODEL_AUDIO_TO_VIDEO' },
    'IMAGE_TO_UPSCALE' : {name: '📈 Image → Upscale', kvKey: 'ACTIVE_MODEL_IMAGE_TO_UPSCALE' },
    'VIDEO_TO_UPSCALE' : {name: '📺 Video → Upscale', kvKey: 'ACTIVE_MODEL_VIDEO_TO_UPSCALE' },
    'VIDEO_TO_ANALYSIS' : {name: '👀 Video → Analysis', kvKey: 'ACTIVE_MODEL_VIDEO_TO_ANALYSIS' },
};
// !!! ВАЖНО: Определите эту константу после AI_MODELS !!!
const AI_MODEL_MENU_CONFIG = generateModelMenuConfig(AI_MODELS);

// ВАЖНО: Константы для эмодзи заменяют команды
const EMOJI_TO_COMMAND_MAP = {
    "🏠": "/start",     // Главное меню
    "💰": "/balance",   // Баланс
    "📸": "/upload",    // Загрузка фотографии
    "✏️": "/prompt",    // Режим текстового промта
    "🎨": "/create",    // Создание "чистого холста"
    "✨": "/photo",     // Вход в режим Photo (генерация по текстовому промту)
    "🎬": "/video",     // Вход в режим Video
    "🎙️": "/say",       // Вход в режим голосовых сообщений
    "🔑": "/apikey",    // Управление API-ключами 
    "💾": "/media",     // Сохраненные данные
    "🗑️": "/stop",      // Сброс состояния
    "✅": "/yes",       // Да
    "❌": "/no"         // Нет
};

/**
 * @description Генерирует полную карту AI-сервисов для меню, группируя модели по типу.
 * @param {Object} AI_MODELS - Глобальный объект AI-моделей.
 * @returns {Object} Структура для меню.
 */
function generateModelMenuConfig(AI_MODELS) {
    const config = {};

    for (const [modelKey, modelDetails] of Object.entries(AI_MODELS)) {
        // Извлекаем тип сервиса (например, 'TEXT_TO_TEXT')
        const parts = modelKey.split('_');
        // Собираем первые три части: TEXT_TO_TEXT, IMAGE_TO_IMAGE и т.д.
        const serviceType = parts.slice(0, 3).join('_');

        if (!SERVICE_TYPE_MAP[serviceType]) continue; // Пропускаем неизвестные типы

        if (!config[serviceType]) {
            config[serviceType] = {
                name: SERVICE_TYPE_MAP[serviceType].name,
                kvKey: SERVICE_TYPE_MAP[serviceType].kvKey,
                models: {}
            };
        }

        // Формируем пользовательское название модели
        let friendlyName = `${modelDetails.SERVICE}: ${modelDetails.MODEL}`;
        
        config[serviceType].models[modelKey] = friendlyName;
    }
    return config;
}

// ----------------------------------------------------
// --- I. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ TELEGRAM и КОНВЕРТАЦИИ ---
// ----------------------------------------------------

// --- ИСПРАВЛЕННЫЕ И БЕЗОПАСНЫЕ Base64 ХЕЛПЕРЫ ---

// arrayBufferToBase64 - БЕЗОПАСНАЯ конвертация ArrayBuffer в Base64 (без переполнения стека)
function arrayBufferToBase64(buffer) {
    return Buffer.from(buffer).toString('base64');
}

// bufferToBase64 - Вспомогательная функция
function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Вспомогательная функция для конвертации Base64 в ArrayBuffer (требуется для ответа DALL-E)
function base64ToArrayBuffer(base64) {
    // 1. Убираем префикс (Data URL), если он есть
    const cleanBase64 = base64.replace(/^data:audio\/(mpeg|mp3|ogg);base64,/, "");
    
    // 2. Используем нативный Buffer Node.js - это самый быстрый и точный способ
    const buf = Buffer.from(cleanBase64, 'base64');
    
    // 3. Возвращаем именно ArrayBuffer, который ждет Response
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

// Хелпер для конвертации строки в ArrayBuffer (замена TextEncoder для старых Workers)
function stringToArrayBuffer(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

// *** БЕЗОПАСНЫЙ ДЕКОДЕР BASE64 ИЗ KV ***
function base64ToUint8Array(cleanBase64) {
    if (cleanBase64.length === 0) {
        return new Uint8Array(0);
    }
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// --- Вспомогательные функции для работы с буферами (необходимы для multipart/form-data) ---
/**
 * Объединяет два ArrayBuffer/Uint8Array.
 * @param {Uint8Array} buffer1
 * @param {Uint8Array} buffer2
 * @returns {Uint8Array}
 */
function concatBuffers(buffer1, buffer2) {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(buffer1, 0);
    tmp.set(buffer2, buffer1.byteLength);
    return tmp;
}

/**
 * @description Добавляет WAV-заголовок (RIFF) к сырым PCM данным (16-bit, Mono, 24000Hz).
 * @param {ArrayBuffer} pcmBuffer - Сырые PCM данные от Gemini.
 * @returns {ArrayBuffer} Полный WAV ArrayBuffer.
 */
function createWavFile(pcmBuffer) {
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const dataSize = pcmBuffer.byteLength;
    
    // 1. Создание нового буфера для WAV (44 байта заголовок + данные)
    const wavBufferSize = 44 + dataSize;
    const buffer = new ArrayBuffer(wavBufferSize);
    
    // Создаем два представления: DataView для чисел, Uint8Array для данных и строк.
    const view = new DataView(buffer);
    const wavBytes = new Uint8Array(buffer); // Для копирования строк и PCM
    
    let offset = 0;

    // Вспомогательная функция для записи строки (копирует в Uint8Array)
    function writeString(s) {
        for (let i = 0; i < s.length; i++) {
            wavBytes[offset + i] = s.charCodeAt(i);
        }
        offset += s.length;
    }

    // ===================================================
    // RIFF Chunk (0 - 11)
    // ===================================================
    writeString('RIFF'); // 0-3
    view.setUint32(offset, 36 + dataSize, true); offset += 4; // 4-7: ChunkSize
    writeString('WAVE'); // 8-11

    // ===================================================
    // FMT Sub-chunk (12 - 35)
    // ===================================================
    writeString('fmt '); // 12-15
    view.setUint32(offset, 16, true); offset += 4; // 16-19: Subchunk1Size (16 для PCM)
    view.setUint16(offset, 1, true); offset += 2; // 20-21: AudioFormat (PCM=1)
    view.setUint16(offset, numChannels, true); offset += 2; // 22-23
    view.setUint32(offset, sampleRate, true); offset += 4; // 24-27
    
    const byteRate = sampleRate * numChannels * bitsPerSample / 8; // 48000
    view.setUint32(offset, byteRate, true); offset += 4; // 28-31: ByteRate
    
    const blockAlign = numChannels * bitsPerSample / 8; // 2
    view.setUint16(offset, blockAlign, true); offset += 2; // 32-33: BlockAlign
    
    view.setUint16(offset, bitsPerSample, true); offset += 2; // 34-35: BitsPerSample

    // ===================================================
    // DATA Sub-chunk (36 - 43)
    // ===================================================
    writeString('data'); // 36-39
    view.setUint32(offset, dataSize, true); offset += 4; // 40-43: Subchunk2Size (Data Size)
    
    // 🛑 КОНТРОЛЬ: offset должен быть равен 44.
    // Если ошибка "out of bounds" возникает здесь, то она ТОЛЬКО из-за того, 
    // что offset вышел за 44, что не должно произойти.

    // ===================================================
    // 🛑 КОПИРОВАНИЕ PCM ДАННЫХ (Начинается с offset=44)
    // ===================================================
    const pcmDataView = new Uint8Array(pcmBuffer); 
    
    // Используем безопасный метод set(source, offset) на основном Uint8Array представлении.
    wavBytes.set(pcmDataView, offset); 
    
    return buffer;
}

// Для разбивки массива кнопок на ряды (та же функция)
function chunkArray(array, chunkSize) {
    const results = [];
    let tempArray = [...array]; 
    while (tempArray.length) {
        results.push(tempArray.splice(0, chunkSize));
    }
    return results;
}

/**
 * Utility функция для блокирующего ожидания.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Рассчитывает общую стоимость генерации в кредитах.
 * @param {string} modelKey - Ключ модели ('TEXT_TO_VIDEO_KIEAI', 'VIDEO_TO_VIDEO_KIEAI' и т.д.).
 * @param {number} [duration_seconds=1] - Ожидаемая длительность для посекундных режимов.
 * @param {string} [quality='480p'] - Выбранное качество ('480p', '720p', 'default' и т.д.).
 * @returns {number} Общая стоимость в кредитах (может быть дробной).
 */
function calculatePrice(modelKey, duration_seconds = 1, quality = '480p') {
    const model = AI_MODELS[modelKey];
    if (!model) return 0;

    const pricing = model.pricing;

    // 1. Статическая цена (number)
    if (typeof pricing === 'number') {
        return pricing; // Стоимость за операцию (целое число)
    }

    // 2. Посекундная/Динамическая цена (object)
    if (typeof pricing === 'object' && pricing !== null) {
        const rate = pricing[quality];
        if (typeof rate === 'number') {
            // Цена = Тариф за секунду * Длительность
            // Оставляем дробное число, Math.ceil будем применять при списании,
            // но при показе пользователю лучше показывать точную цену.
            return rate * duration_seconds; 
        }
    }

    return 0; // Неизвестный режим/качество
}

/**
 * Форматирует стоимость в кредитах и рублях.
 * @param {number} credits - Стоимость в кредитах.
 * @returns {string} Строка в формате: "X кредитов (Y руб.)".
 */
function formatPrice(credits) {
    // 1. Рубли
    // Ваша текущая реализация округляет рубли до целого.
    const rubles = Math.ceil(credits * CREDIT_COST_RUB); 
    
    // Склонение слова "рубль"
    const rubWord = pluralize(rubles, RUBLES_FORMS);
    
    // 2. Кредиты
    // Склонение слова "кредит"
    const creditWord = pluralize(credits, CREDIT_FORMS); 
    
    // Если credits дробное (для V2V/A2V), используем toFixed(1) для кредитов,
    // но если целое, то просто число.
    const creditsDisplay = Number.isInteger(credits) ? credits : credits.toFixed(1);

    // ✅ ИТОГОВЫЙ ФОРМАТ
    return `${creditsDisplay} ${creditWord} (~${rubles} ${rubWord})`;
}

/**
 * Выбирает правильный падеж слова в зависимости от числа.
 * @param {number} number - Число (количество).
 * @param {string[]} forms - Массив форм слова: [единственное число, родительный падеж ед. числа (2-4), родительный падеж мн. числа (0, 5-9, 11-14)].
 * @returns {string} Правильная форма слова.
 */
function pluralize(number, forms) {
    number = Math.abs(number);
    const remainder100 = number % 100;
    const remainder10 = number % 10;

    // 1. Проверяем на 11-14 (родительный падеж множественного числа)
    if (remainder100 >= 11 && remainder100 <= 14) {
        return forms[2]; // звезд, кредитов
    }
    
    // 2. Проверяем на 1 (единственное число)
    if (remainder10 === 1) {
        return forms[0]; // звезда, кредит
    }
    
    // 3. Проверяем на 2, 3, 4 (родительный падеж единственного числа)
    if (remainder10 >= 2 && remainder10 <= 4) {
        return forms[1]; // звезды, кредита
    }
    
    // 4. Остальные (0, 5-9) — родительный падеж множественного числа
    return forms[2]; // звезд, кредитов
}

/**
 * Генерирует короткий уникальный ID (например, 10 символов) для ключа KV.
 * @returns {string} Короткий уникальный ID.
 */
function generateShortId() {
    // 10 символов должно быть достаточно для уникальности и укладывается в 64 байта
    return Math.random().toString(36).substring(2, 12); 
}

function createSummarizationPrompt(history, newMessage) {
    let conversation = history.map(item => `${item.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${item.text}`).join('\n');
    
    // Добавляем новое сообщение, чтобы резюме было максимально актуальным
    conversation += `\nПользователь (Новое): ${newMessage}`;

    return `Ты — система суммаризации. Твоя задача — прочитать диалог ниже и создать краткое, связное резюме (максимум 200 токенов), которое сохранит ключевые факты, имена и контекст обсуждения, чтобы ИИ мог продолжить диалог, не читая всю историю. Сосредоточься на фактах, а не на стиле. 

--- ДИАЛОГ ---
${conversation}
--- КОНЕЦ ДИАЛОГА ---

Краткое резюме для контекста:`;
}

/**
 * Извлекает "мыслительный" контекст для админа и чистит финальный ответ, 
 * используя </think> как жесткий разделитель.
 */
function extractAndCleanModelResponse(responseText) {
    const thinkCloseTag = '</think>';
    let thought = '';
    let finalResponse = responseText;
    
    // 1. НАЙТИ ЗАКРЫВАЮЩИЙ ТЕГ </think>
    const splitIndex = responseText.indexOf(thinkCloseTag);
    
    if (splitIndex !== -1) {
        // Все, что до </think>, считаем рассуждением, независимо от наличия <think>
        thought = responseText.substring(0, splitIndex).trim();
        
        // Все, что после </think>, считаем чистым ответом
        finalResponse = responseText.substring(splitIndex + thinkCloseTag.length).trim();
    }
    
    // 2. ФИНАЛЬНАЯ ЗАЩИТА ОТ ЛИШНИХ СИМВОЛОВ (User:, Assistant:, #ОТВЕТ#)
    const JUNK_MARKERS = /(User:|Assistant:|# ОТВЕТ #|# ОТВЕТ)/i;
    const junkIndex = finalResponse.search(JUNK_MARKERS);
    
    if (junkIndex !== -1) {
        finalResponse = finalResponse.substring(0, junkIndex).trim();
    }
    
    // 3. ФИНАЛЬНАЯ ОЧИСТКА (удаляем любые оставшиеся одинокие теги и лишние переносы)
    finalResponse = finalResponse.replace(/<think>[\s\S]*/g, '').trim(); 
    finalResponse = finalResponse.replace(/<\/think>[\s\S]*/g, '').trim(); 
    finalResponse = finalResponse.replace(/(\n\s*){3,}/g, '\n\n').trim();
    
    // Если рассуждение содержит открывающий тег <think>, удаляем его для чистоты админ-лога
    if (thought.startsWith('<think')) {
        thought = thought.replace(/^<think\s*/, '').trim();
    }
    
    return { thought, finalResponse: finalResponse };
}

/**
 * Экранирует специальные символы MarkdownV2 в тексте.
 * @param {string} text - Исходный текст.
 * @returns {string} Экранированный текст.
 */
function escapeMarkdownV2(text) {
    // Список зарезервированных символов в MarkdownV2:
    const specials = [
        '_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', 
        '-', '=', '|', '{', '}', '.', '!'
    ];
    
    // Регулярное выражение для поиска всех специальных символов
    const regex = new RegExp(`[${specials.map(s => `\\${s}`).join('')}]`, 'g');
    
    // Заменяем каждый специальный символ на его экранированный аналог
    return text.replace(regex, '\\$&');
}

/**
 * Проверяет, был ли данный апдейт уже обработан, используя update_id. 
 * Это защита от повторных запросов Telegram.
 * @param {number} updateId - ID входящего апдейта Telegram.
 * @param {object} env - Сырой объект окружения Worker'а (для доступа к KV).
 * @returns {Promise<boolean>} - true, если дубликат (должен быть проигнорирован).
 */
async function isDuplicateUpdate(updateId, env) {
    // ИСПОЛЬЗУЕМ LAST_PHOTO_STORAGE, так как он более универсален
    const kv = env.LAST_PHOTO_STORAGE; // <--- ИЗМЕНЕНИЕ: LAST_PHOTO_STORAGE
    
    if (!kv) {
        console.warn("KV store for Anti-Flood is not available (LAST_PHOTO_STORAGE)."); 
        return false; 
    }
    
    const key = ANTI_FLOOD_KV_KEY_PREFIX + updateId.toString();
    
    const exists = await kv.get(key);
    
    if (exists) {
        return true; 
    }
    
    // Cloudflare требует минимум 60 секунд.
    await kv.put(key, '1', { expirationTtl: 60 }); 

    return false;
}

// ✅ sendPhotoFromBase64 - Отправляет фото в Telegram, используя ручной multipart
/**
 * Отправляет изображение в Telegram, создавая multipart/form-data вручную (самый безопасный метод для Workers).
 */
async function sendPhotoFromBase64(chatId, base64Image, caption, token) {
    const boundary = '----Boundary' + Math.random().toString(16).substring(2);
    const url = `https://api.telegram.org/bot${token}/sendPhoto`;

    // Используем TextEncoder, который является частью глобальной области видимости в Cloudflare Workers
    const encoder = new TextEncoder();

    try {
        const imageBytes = base64ToUint8Array(base64Image);

        if (imageBytes.byteLength === 0) {
            throw new Error('Decoded image file is empty (0 bytes).');
        }

        // 1. Создание строковых частей
        const parts = [];

        // Части полей: chat_id, caption, parse_mode
        parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`);
        parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`);
        //parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nMarkdownV2\r\n`);
        parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`);

        // Заголовок файла 'photo'
        const photoHeader = `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="image.png"\r\nContent-Type: image/png\r\n\r\n`;
        parts.push(photoHeader);

        const photoFooter = `\r\n--${boundary}--`;

        // 2. Конвертируем все строковые части в ArrayBuffer
        const headerBuffer = encoder.encode(parts.join('')); // Используем TextEncoder
        const footerBuffer = encoder.encode(photoFooter);

        // 3. Объединяем буферы
        const totalLength = headerBuffer.byteLength + imageBytes.byteLength + footerBuffer.byteLength;
        const bodyBuffer = new Uint8Array(totalLength);

        let offset = 0;
        bodyBuffer.set(headerBuffer, offset);
        offset += headerBuffer.byteLength;

        bodyBuffer.set(imageBytes, offset); // Бинарные данные изображения
        offset += imageBytes.byteLength;

        bodyBuffer.set(footerBuffer, offset);

        // 4. Вызов Fetch
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body: bodyBuffer.buffer, // Передаем ArrayBuffer
        });

        const result = await response.json();

        if (!result.ok) {
            console.error("Telegram sendPhoto error:", result.description);
            // ... (обработка ошибок)
            return { ok: false, description: result.description || 'Неизвестная ошибка Telegram API' };
        }
        return { ok: true, messageId: result.result.message_id };

    } catch (e) {
        console.error("Критическая ошибка при отправке фото в Telegram:", e);
        return { ok: false, description: e.message || `Сетевая ошибка при отправке фото.` };
    }
}

async function sendMediaGroupToTelegram(chat_id, media_array, token) {
    const telegramApiUrl = `https://api.telegram.org/bot${token}/sendMediaGroup`;

    const payload = {
        chat_id: chat_id,
        media: JSON.stringify(media_array) // Массив должен быть строкой JSON
    };

    try {
        const response = await fetch(telegramApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // Дополнительная обработка ответа, если нужно

    } catch (error) {
        console.error('Error sending media group:', error);
    }
}

/**
 * Динамически загружает активную конфигурацию модели AI (STT, TTS, T2T и т.д.) 
 * из KV-хранилища на основе типа сервиса.
 * * @param {string} serviceType - Ключ типа сервиса (например, 'AUDIO_TO_TEXT', 'TEXT_TO_AUDIO'). 
 * @param {Object} envData - Объект окружения, содержащий привязку к KV (envData.LAST_PHOTO_STORAGE).
 * @param {number} chatId - ID чата.
 * @returns {Promise<Object>} Объект с конфигурацией, дружелюбным именем и активным ключом.
 * * Предполагается, что константы AI_MODEL_MENU_CONFIG и AI_MODELS доступны.
 */
async function loadActiveConfig(serviceType, envData, chatId) {
    // Используем глобальные константы
    const serviceMenuConfig = AI_MODEL_MENU_CONFIG[serviceType];

    if (!serviceMenuConfig) {
        throw new Error(`Конфигурация меню для сервиса "${serviceType}" не найдена.`);
    }

    const kvKey = serviceMenuConfig.kvKey;
    
    // 1. Читаем активный ключ из KV (если был сохранен пользователем)
    const freshConfigKey = await envData.LAST_PHOTO_STORAGE.get(kvKey);

    // 2. Определяем ключ по умолчанию (первый ключ в списке моделей)
    const defaultModelKey = Object.keys(serviceMenuConfig.models)[0]; 

    // 3. Выбираем активный ключ (KV-значение или значение по умолчанию)
    const activeConfigKey = freshConfigKey || defaultModelKey;
    
    // 4. Получаем полный объект конфигурации
    const activeConfig = AI_MODELS[activeConfigKey];
    // 5. Формируем дружелюбное имя
    const friendlyName = serviceMenuConfig.models[activeConfigKey] || activeConfigKey;

    // 🛑 НОВАЯ ЛОГИКА ДЕБАГА
    if (chatId && chatId.toString() === envData.ADMIN_CHAT_ID && envData.DEBUG_ENABLED) {
        const debugMessage = `🧠 AI-Модель для ${serviceType}: ${friendlyName}`;
        envData.ctx.waitUntil(sendMessage(
            chatId, 
            debugMessage, 
            envData.TELEGRAM_BOT_TOKEN
        ));
    }
    // 5. Формируем и возвращаем результат
    return { 
        config: activeConfig, 
        // Если дружелюбное имя не найдено, используем сам ключ
        friendlyName: serviceMenuConfig.models[activeConfigKey] || activeConfigKey,
        activeKey: activeConfigKey
    };
}

/**
 * Преобразует Base64 в ArrayBuffer, сохраняет его в KV и возвращает URL для доступа.
 * @param {string} base64Data - Base64 строка изображения.
 * @param {object} envData - Объект с env (включая LAST_PHOTO_STORAGE и PUBLIC_DOMAIN).
 * @param {string} chatId - ID чата.
 * @returns {Promise<string>} - Публичный URL изображения.
 */
async function uploadBase64ImageToPublicUrl(base64Data, envData, chatId) {
    const IMAGE_STORAGE = envData.LAST_PHOTO_STORAGE; 
    
    if (!IMAGE_STORAGE) {
         throw new Error("Critical: LAST_PHOTO_STORAGE binding is missing.");
    }

    let buffer;

    // 1. Проверяем: если это уже Buffer (бинарные данные), работаем напрямую
    if (Buffer.isBuffer(base64Data) || base64Data instanceof Uint8Array) {
        buffer = base64Data;
    } 
    // 2. Если это строка (Base64)
    else if (typeof base64Data === 'string') {
        // Убираем префикс через регулярку (теперь .replace сработает)
        const base64 = base64Data.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
        // В Node.js декодируем через Buffer.from (быстрее и стабильнее чем atob)
        buffer = Buffer.from(base64, 'base64');
    } else {
        throw new Error("Unsupported image data type: " + typeof base64Data);
    }
    
    // 3. Создаем уникальный ключ
    const imageKey = `i2v/${chatId}/${Date.now()}.png`;

    // 4. Сохраняем в KV/S3
    // ВАЖНО: В Яндексе (S3/DB) метод .put может отличаться от Cloudflare KV.
    // Если LAST_PHOTO_STORAGE — это твой адаптер DB, убедись, что он принимает Buffer.
    await IMAGE_STORAGE.put(imageKey, buffer, {
        httpMetadata: { contentType: 'image/png' },
        expirationTtl: 3600 // 1 час
    });

    // 5. Формируем URL
    const baseUrl = envData.WORKER_DOMAIN.startsWith('http') ? envData.WORKER_DOMAIN : `https://${envData.WORKER_DOMAIN}`;
    return `${baseUrl}/kv-images/${imageKey}`;
}

// ✅ *** sendAiRequest - универсальный «движок» отправки с фоллбэком
async function sendAiRequest(body, url, config, envData, isRawBody = false) {
    const safeConfig = config || {};
    const isBinary = isRawBody && (body instanceof ArrayBuffer || body instanceof Uint8Array);
    const PROXY_SECRET = envData.GEMINI_PROXY_KEY;
 
    // 1. Формируем заголовки для прокси-врапперов (Яндекс/CF)
    const commonHeaders = {
        'X-Target-URL': url,
        'X-Proxy-Secret': PROXY_SECRET,
        'Content-Type': isBinary ? 'application/octet-stream' : 'application/json'
    };

    // Если есть Auth (для Bothub/OpenAI), добавляем его
    if (safeConfig.SERVICE === 'WORKERS_AI' || safeConfig.SERVICE === 'CLOUDFLARE') {
        // Берем токен напрямую, если он есть в envData
        const cfAccount = envData.CLOUDFLARE_ACCOUNT_ID || envData['CLOUDFLARE_ACCOUNT_ID'];
        const cfToken = envData.CLOUDFLARE_API_TOKEN || envData['CLOUDFLARE_API_TOKEN'];

        if (cfToken) commonHeaders['Authorization'] = `Bearer ${cfToken}`;

    } else if (safeConfig.SERVICE === 'BOTHUB' || safeConfig.SERVICE === 'OPENAI') {
        // Если в Bothub
        commonHeaders['X-Proxy-Authorization'] = `Bearer ${envData[safeConfig.API_KEY]}`;
    }

    let response;
    let errors = [];

    // --- ПОПЫТКА 1: Основной прокси (через Яндекс.Клауд Функцию) ---
    try {
        //console.log("Trying P1: Yandex.Cloud...");
        response = await envData.LESHIY_AI_PROXY.fetch(url, { // <--- вызываем через биндинг
            method: 'POST',
            headers: commonHeaders,
            body: isBinary ? body : JSON.stringify(body)
        });
        if (response.ok) return response;
        errors.push(`P1 Yandex (${response.status})`);
    } catch (e) { errors.push(`P1_Yandex_Err(${e.message})`); }

    // --- ПОПЫТКА 2: Резервный прокси (Cloudflare) ---
    try {
        console.log("Trying P2: Cloudflare...");
        const fallbackUrl = envData.FALLBACK_PROXY || 'https://leshiy-ai-proxy.leshiyalex.workers.dev';

        if (fallbackUrl) {
            response = await fetch(fallbackUrl, {
                method: 'POST',
                headers: commonHeaders,
                body: isBinary ? body : JSON.stringify(body)
            });
            if (response.ok) return response;
            errors.push(`P2 Cloudflare(${response.status})`);
        }
    } catch (e) { errors.push(`P2_Cloudflare_Err(${e.message})`); }

    // --- ПОПЫТКА 3: Специальный Gemini прокси (только для Gemini) ---
    if (config.SERVICE === 'GEMINI') {
        try {
            console.log("Trying P3: GeminiProxy...");
            const originalUrl = new URL(url); 
            const proxyBase = new URL(envData.GEMINI_PROXY || 'https://gemini-proxy.leshiyalex.workers.dev/v1beta');
            
            // Собираем финальный URL: база прокси + путь от гугла + параметры (ключ)
            const finalProxyUrl = `${proxyBase.origin}${originalUrl.pathname}${originalUrl.search}`;
            console.log("DEBUG GeminiProxy URL:", finalProxyUrl); // Увидишь, что получилось в логах

            response = await fetch(finalProxyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Proxy-Secret': PROXY_SECRET },
                body: JSON.stringify(body)
            });
            if (response.ok) return response;
            errors.push(`P3 GeminiProxy (${response.status})`);
        } catch (e) { errors.push(`P3_GeminiProxy_Err(${e.message})`); }
    }

    throw new Error(`Все прокси отказали: ${errors.join(' -> ')}`);
}

// ✅ *** sendAudioByUrl - Отправка аудио по внешнему URL (для Kie.ai TTS)
async function sendAudioByUrl(chatId, fileUrl, token, caption = '✅ Ваше аудио готово!') {
    const apiUrl = `https://api.telegram.org/bot${token}/sendAudio`;
    
    // Telegram API поддерживает прямые ссылки в поле 'audio'
    const body = {
        chat_id: chatId,
        audio: fileUrl, // Прямой URL от Kie.ai
        caption: caption,
        parse_mode: 'Markdown',
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000) // Увеличим таймаут на всякий случай
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Telegram sendAudio Error (${response.status}): ${errorText.substring(0, 200)}`);
    }

    return response.ok;
}

/**
 * Отправляет видео в Telegram, используя file_id.
 *
 * @param {number} chatId - ID чата.
 * @param {string} fileId - Telegram File ID.
 * @param {string} token - TELEGRAM_BOT_TOKEN.
 * @param {string} [caption='🎬 Ваш видеоролик готов!'] - Подпись к видео.
 * @param {object} [replyMarkup=null] - Инлайн-клавиатура для добавления к сообщению. 🛑 ИСПРАВЛЕНИЕ: ДОБАВЛЕН
 */
async function sendVideoByUrl(chatId, fileId, token, caption = '🎬 Ваш видеоролик готов!', replyMarkup = null) {
    const telegramUrl = `https://api.telegram.org/bot${token}/sendVideo`;
    
    // Telegram требует POST-запрос с JSON в теле
    let body = {
        chat_id: chatId,
        video: fileId, // Используем file_id
        caption: caption,
        parse_mode: 'Markdown'
    };
    
    if (replyMarkup) { // 🛑 ИСПРАВЛЕНИЕ: Добавляем клавиатуру, если она передана
        body.reply_markup = replyMarkup;
    }

    const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        console.error('Failed to send video:', await response.text());
        throw new Error("Ошибка отправки видео в Telegram.");
    }

    return response.json(); 
}

// ✅ sendMessage - ТЕПЕРЬ ВОЗВРАЩАЕТ JSON-ОТВЕТ TELEGRAM
async function sendMessage(chatId, text, token, replyToMessageId = null, keyboard = null) { // <-- ДОБАВЛЕН keyboard
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = {
        chat_id: chatId,
        text: text,
        parse_mode: 'None',
        reply_to_message_id: replyToMessageId
    };
    if (keyboard) { // <-- ДОБАВЛЕНО УСЛОВИЕ ДЛЯ КЛАВИАТУРЫ
        body.reply_markup = keyboard;
    }
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (response.ok) { return await response.json(); }
        else {
            console.error("Telegram sendMessage failed with status:", response.status);
            return { ok: false, message: "Telegram API error" };
        }
    } catch (e) {
        console.error("Error sending message to Telegram:", e);
        return { ok: false, message: e.message };
    }
}

// ✅ sendMessageMarkdown - ОТПРАВКА С ФОРСИРОВАНИЕМ РЕЖИМА MARKDOWN
async function sendMessageMarkdown(chatId, text, token, replyToMessageId = null, keyboard = null) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown', // 💡 КРИТИЧНОЕ ИЗМЕНЕНИЕ
        reply_to_message_id: replyToMessageId
    };
    if (keyboard) {
        body.reply_markup = keyboard;
    }
    
    // Используем ту же логику отправки, что и в основной функции
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (response.ok) { return await response.json(); }
        else {
            console.error("Telegram sendMessageMarkdown failed with status:", response.status);
            return { ok: false, message: "Telegram API error", description: response.statusText };
        }
    } catch (e) {
        console.error("Error sending Markdown message to Telegram:", e);
        return { ok: false, message: e.message };
    }
}

// ✅ sendMessageMarkdownV2 - ОТПРАВКА С ФОРСИРОВАНИЕМ РЕЖИМА MARKDOWNV2
async function sendMessageMarkdownV2(chatId, text, token, replyToMessageId = null, keyboard = null) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = {
        chat_id: chatId,
        text: text,
        parse_mode: 'MarkdownV2', // 💡 КРИТИЧНОЕ ИЗМЕНЕНИЕ
        reply_to_message_id: replyToMessageId
    };
    if (keyboard) {
        body.reply_markup = keyboard;
    }
    
    // Используем ту же логику отправки, что и в основной функции
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (response.ok) { return await response.json(); }
        else {
            console.error("Telegram sendMessageMarkdownV2 failed with status:", response.status);
            return { ok: false, message: "Telegram API error", description: response.statusText };
        }
    } catch (e) {
        console.error("Error sending MarkdownV2 message to Telegram:", e);
        return { ok: false, message: e.message };
    }
}

// ✅ sendMessageHTML - ОТПРАВКА С ФОРСИРОВАНИЕМ РЕЖИМА HTML
async function sendMessageHTML(chatId, text, token, replyToMessageId = null, keyboard = null) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML', // 💡 ИСПОЛЬЗУЕМ HTML
        reply_to_message_id: replyToMessageId
    };
    if (keyboard) {
        body.reply_markup = keyboard;
    }
    
    // Используем ту же логику отправки, что и в основной функции
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (response.ok) { return await response.json(); }
        else {
            console.error("Telegram sendMessageHTML failed with status:", response.status);
            return { ok: false, message: "Telegram API error", description: response.statusText };
        }
    } catch (e) {
        console.error("Error sending HTML message to Telegram:", e);
        return { ok: false, message: e.message };
    }
}

// ✅ sendMessageWithKeyboard - Отправляет сообщение с инлайн-кнопками
async function sendMessageWithKeyboard(chatId, text, token, keyboard) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        reply_markup: {inline_keyboard: keyboard // Массив массивов кнопок
        }
    };
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (response.ok) { return await response.json(); }
        else {
            console.error("Telegram sendMessageWithKeyboard failed with status:", response.status);
            return { ok: false, message: "Telegram API error" };
        }
    } catch (e) {
        console.error("Error sending message with keyboard to Telegram:", e);
        return { ok: false, message: e.message };
    }
}

// ✅ sendMessageReplyKeyboard - УПРАВЛЕНИЕ REPLY-КЛАВИАТУРОЙ (Внизу чата)
// Использование: Принимает готовый объект клавиатуры (например, от getMainReplyKeyboard())
// 1. Установить: sendMessageReplyKeyboard(chatId, "Текст", token, [[{text:"🏠"},{text:"✏️"}]])
// 2. Удалить:   sendMessageReplyKeyboard(chatId, "Текст", token, true)
async function sendMessageReplyKeyboard(chatId, text, token, keyboardObjectOrRemove = null) {
    let replyMarkup = null;

    if (keyboardObjectOrRemove === true) {
        // Режим 1: Удаление клавиатуры
        replyMarkup = { remove_keyboard: true };
        
    } else if (typeof keyboardObjectOrRemove === 'object' && keyboardObjectOrRemove !== null) {
        // Режим 2: Установка клавиатуры (принимаем готовый объект, как от ваших get-функций)
        replyMarkup = keyboardObjectOrRemove;
    }
    
    // Используем самодостаточную логику отправки (Parse Mode: None)
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = {
        chat_id: chatId,
        text: text,
        parse_mode: 'None', // Исключаем конфликты форматирования
        reply_to_message_id: null
    };
    
    if (replyMarkup) {
        body.reply_markup = replyMarkup;
    }
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (response.ok) { return await response.json(); }
        else {
            console.error("Telegram sendMessage failed with status:", response.status);
            // Добавим больше информации, если доступно
            const errorBody = await response.text();
            console.error("Telegram error body:", errorBody);
            return { ok: false, message: "Telegram API error" };
        }
    } catch (e) {
        console.error("Error sending message to Telegram:", e);
        return { ok: false, message: e.message };
    }
}

// ✅ editMessage --- ФУНКЦИЯ РЕДАКТИРОВАНИЯ СООБЩЕНИЯ (Markdown) ---
async function editMessage(chatId, messageId, text, token) {
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    try {
        const response = await fetch(url, { // <-- Добавлена переменная response
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: text, parse_mode: 'Markdown' }),
        });

        // 🔍 Добавлено логирование ошибки:
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Telegram editMessage failed with status: ${response.status}. Body: ${errorText}`);
        }

    } catch (e) {
        console.error("Error editing message in Telegram:", e);
    }
}

// ✅ editMessageWithKeyboard - Редактирует сообщение и добавляет/изменяет инлайн-кнопки (ИСПРАВЛЕНА ЛОГИКА)
async function editMessageWithKeyboard(chatId, messageId, text, token, replyMarkup) {
    const url = `https://api.telegram.org/bot${token}/editMessageText`;

    let body = {
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: 'Markdown',
    };

    // --- КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ ЛОГИКИ: Собираем тело запроса ПЕРЕД fetch ---
    // Формируем поле reply_markup только, если передан не пустой массив.
    // if (replyMarkup && replyMarkup.length > 0) {
    //    replyMarkup - это массив строк (rows), его нужно обернуть в { inline_keyboard: ... }
    //    body.reply_markup = { inline_keyboard: replyMarkup };
    //}
    // ✅ НА ЭТОТ БЛОК (только если replyMarkup - это МАССИВ):
    if (Array.isArray(replyMarkup) && replyMarkup.length > 0) {
        // Если это массив (старый формат), оборачиваем его
        body.reply_markup = { inline_keyboard: replyMarkup };
    } else if (replyMarkup && typeof replyMarkup === 'object' && replyMarkup.inline_keyboard) {
        // Если это уже объект { inline_keyboard: [...] } (например, из getAdminKeyboardFromCommand), 
        // используем его как есть.
        body.reply_markup = replyMarkup;
    }
    // Если replyMarkup === null или пустой массив, body.reply_markup не будет установлен,
    // что корректно удалит старую клавиатуру.
    // ----------------------------------------

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        // 🔍 Дополнительный шаг для дебага: Логируем ответ API
        if (!response.ok) {
            const errorText = await response.text();
            
            // 🚨 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Проверяем, является ли это ошибкой "message is not modified"
            if (errorText.includes("message is not modified")) {
                // Это не критическая ошибка, просто сообщение не изменилось.
                console.log("Ignored Telegram error 400: message is not modified.");
                return { ok: true, ignored: true }; // Возвращаем успешный статус и выходим
            }

            // Вывод всех остальных ошибок в лог Cloudflare
            console.error(`Telegram editMessageWithKeyboard failed with status: ${response.status}. Body: ${errorText}`);
            return { ok: false, message: "Telegram API error", fullError: errorText };
        }

        return await response.json();

    } catch (e) {
        console.error("Error editing message with keyboard to Telegram:", e);
        return { ok: false, message: e.message };
    }
}

// ✅ editMessageReplyKeyboard - Редактирование сообщения и управление REPLY Keyboard
// Используется для изменения текста сообщения и установки/удаления REPLY KEYBOARD.
// Принимает готовый объект клавиатуры (например, от getMainReplyKeyboard()) или true для удаления.
async function editMessageReplyKeyboard(chatId, messageId, text, token, keyboardObjectOrRemove = null) {
    
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    let replyMarkup = null;

    // --- 1. Определение типа клавиатуры/команды ---
    
    if (keyboardObjectOrRemove === true) {
        // Режим 1: Удаление клавиатуры
        replyMarkup = { remove_keyboard: true };
        
    } else if (typeof keyboardObjectOrRemove === 'object' && keyboardObjectOrRemove !== null) {
        // Режим 2: Установка клавиатуры (принимаем готовый объект {keyboard: [...]})
        replyMarkup = keyboardObjectOrRemove;
    }
    
    // --- 2. Формирование тела запроса (аналогично вашей editMessageWithKeyboard) ---

    let body = {
        chat_id: chatId,
        message_id: messageId,
        text: text,
        // Используем Markdown, так как editMessageText часто требует форматирования:
        parse_mode: 'Markdown', 
    };

    if (replyMarkup) {
        // Если это команда удаления или объект Reply Keyboard, добавляем его в тело запроса
        body.reply_markup = replyMarkup;
    }

    // --- 3. Выполнение запроса ---

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        // 🔍 Логирование ошибки:
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Telegram editMessageReplyKeyboard failed with status: ${response.status}. Body: ${errorText}`);
            return { ok: false, message: "Telegram API error", fullError: errorText };
        }

        return await response.json();

    } catch (e) {
        console.error("Error editing message with Reply Keyboard to Telegram:", e);
        return { ok: false, message: e.message };
    }
}

/**
 * Функция для изменения только inline-клавиатуры сообщения
 * @param {number} chatId Идентификатор чата
 * @param {number} messageId Идентификатор сообщения
 * @param {object} replyMarkup Новый объект клавиатуры
 * @param {string} token Токен бота
 */
async function editMessageReplyMarkup(chatId, messageId, replyMarkup, token) {
    const url = `https://api.telegram.org/bot${token}/editMessageReplyMarkup`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            reply_markup: replyMarkup
        })
    });
    // Не обязательно проверять ответ, если это не критично
    // return response.json(); 
}

// ✅ editMessageCaption - Редактирует подпись (caption) и/или инлайн-клавиатуру под фото
async function editMessageCaption(chatId, messageId, caption, token, replyMarkup = null) {
    const url = `https://api.telegram.org/bot${token}/editMessageCaption`;

    let body = {
        chat_id: chatId,
        message_id: messageId,
        caption: caption,
        parse_mode: 'MarkdownV2', // Используем V2 для безопасности форматирования
    };

    // Добавляем клавиатуру, если она передана (хотя для этого случая она не нужна)
    if (replyMarkup) {
        body.reply_markup = replyMarkup;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Telegram editMessageCaption failed with status: ${response.status}. Body: ${errorText}`);
            // 🛑 ПЕРЕБРОС ОШИБКИ: Если Telegram API вернул ошибку, мы ее перебрасываем.
            throw new Error(`Telegram API Error (${response.status}): ${errorText.substring(0, 100)}`); 
        }
        
    } catch (e) {
        console.error("Error editing message caption in Telegram:", e);
        // 🛑 ПЕРЕБРОС ОШИБКИ: Если произошла сетевая ошибка (таймаут, DNS и т.д.), мы ее перебрасываем.
        throw e;
    }
}

/**
 * ✅ editMessageWithNewPhoto - Редактирует существующее сообщение, заменяя в нем фото на новое.
 * (Использует метод editMessageMedia с multipart/form-data)
 * * @param {number} chatId - ID чата.
 * @param {number} messageId - ID сообщения, которое нужно отредактировать.
 * @param {ArrayBuffer} photoBuffer - Байты нового фото (ArrayBuffer).
 * @param {string} caption - Новая подпись.
 * @param {object} replyMarkup - Инлайн-клавиатура (объект, например, { inline_keyboard: [...] }).
 * @param {string} token - Токен Telegram.
 * @returns {Promise<object>} Ответ от Telegram API.
 */
async function editMessageWithNewPhoto(chatId, messageId, photoBuffer, caption, replyMarkup, token) {
    const updateMediaUrl = `https://api.telegram.org/bot${token}/editMessageMedia`;
    const telegramFormData = new FormData();
    
    // 1. Формируем тело запроса
    telegramFormData.append('chat_id', chatId.toString());
    telegramFormData.append('message_id', messageId.toString());

    const photoFileName = 'rotated_photo.jpg';
    const photoFile = new File([photoBuffer], photoFileName, { type: 'image/jpeg' });
    
    // 2. Формируем медиа-payload для Telegram
    const mediaPayload = {
        type: 'photo',
        media: `attach://${photoFileName}`, // Ссылка на файл в FormData
        caption: caption,
        parse_mode: 'Markdown'
    };
    
    // 3. Добавляем медиа и файл в FormData
    telegramFormData.append('media', JSON.stringify(mediaPayload));
    telegramFormData.append(photoFileName, photoFile); // Сам файл

    // 4. Добавляем клавиатуру
    if (replyMarkup) {
        // Убедимся, что replyMarkup имеет правильный формат (например, { inline_keyboard: [...] })
        telegramFormData.append('reply_markup', JSON.stringify(replyMarkup));
    }
    
    // 5. Отправка запроса
    const response = await fetch(updateMediaUrl, {
        method: 'POST',
        body: telegramFormData,
        signal: AbortSignal.timeout(60000) // Таймаут 1 минута
    });

    const responseData = await response.json();
    if (!response.ok || !responseData.ok) {
        throw new Error(`Telegram API error (editMessageMedia/Photo): ${responseData.description || 'Unknown'}`);
    }
    
    return responseData;
}

/**
 * ✅ editMessageWithNewVideo - Редактирует существующее сообщение, заменяя в нем видео на новое.
 * (Использует метод editMessageMedia с multipart/form-data)
 * * @param {number} chatId - ID чата.
 * @param {number} messageId - ID сообщения, которое нужно отредактировать.
 * @param {ArrayBuffer} videoBuffer - Байты нового видео (ArrayBuffer).
 * @param {string} caption - Новая подпись.
 * @param {object} replyMarkup - Инлайн-клавиатура (объект, например, { inline_keyboard: [...] }).
 * @param {string} token - Токен Telegram.
 * @returns {Promise<object>} Ответ от Telegram API.
 */
async function editMessageWithNewVideo(chatId, messageId, videoBuffer, caption, replyMarkup, token) {
    const updateMediaUrl = `https://api.telegram.org/bot${token}/editMessageMedia`;
    const telegramFormData = new FormData();

    // 1. Формируем тело запроса
    telegramFormData.append('chat_id', chatId.toString());
    telegramFormData.append('message_id', messageId.toString());

    const videoFileName = 'rotated_video.mp4';
    const videoFile = new File([videoBuffer], videoFileName, { type: 'video/mp4' });

    // 2. Формируем медиа-payload для Telegram
    const mediaPayload = {
        type: 'video',
        media: `attach://${videoFileName}`, // Ссылка на файл в FormData
        caption: caption,
        parse_mode: 'Markdown'
    };

    // 3. Добавляем медиа и файл в FormData
    telegramFormData.append('media', JSON.stringify(mediaPayload));
    telegramFormData.append(videoFileName, videoFile); // Сам файл

    // 4. Добавляем клавиатуру
    if (replyMarkup) {
        telegramFormData.append('reply_markup', JSON.stringify(replyMarkup));
    }

    // 5. Отправка запроса
    const response = await fetch(updateMediaUrl, {
        method: 'POST',
        body: telegramFormData,
        signal: AbortSignal.timeout(120000) // Таймаут 2 минуты (видео могут быть большими)
    });

    const responseData = await response.json();
    if (!response.ok || !responseData.ok) {
        throw new Error(`Telegram API error (editMessageMedia/Video): ${responseData.description || 'Unknown'}`);
    }
    
    return responseData;
}

// ✅ deleteMessage - Удаляет сообщение
async function deleteMessage(chatId, messageId, token) {
    const url = `https://api.telegram.org/bot${token}/deleteMessage`;
    const body = { chat_id: chatId, message_id: messageId };
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

// ✅ getPromptKeyboard - Генерирует Inline-клавиатуру для меню промпта
function getPromptKeyboard(currentPrompt) {
    const hasPrompt = currentPrompt && currentPrompt.trim().length > 0;

    let keyboard = [];

    if (hasPrompt) {
        
        keyboard.push(
            // --- 1-я строка: Главное меню ---
            [{ text: "🏠 Открыть главное меню /start", callback_data: "start_command" }],
        );
        // --- 2-я строка: Стандартные промпты ---
        keyboard.push([
            // 🛑 НОВАЯ СТРОКА: Стандартные промпты
            { text: "🖼️ Шаблон для фото", callback_data: 'set_default_prompt|photo'},
            { text: "🎬 Шаблон для видео", callback_data: 'set_default_prompt|video' }
        ]);
        // --- 3-я строка: Стандартные промпты ---
        keyboard.push([
            // 🛑 НОВАЯ СТРОКА: Стандартные промпты
            { text: "🎤 Шаблон для аудио", callback_data: 'set_default_prompt|audio'},
            { text: "🔁 Описание из фото", callback_data: "regenerate_prompt" }
            //{ text: " ", callback_data: 'dummy_no_prompt' }
        ]);
        // --- 4-я строка: Основные действия с промптом ---
        keyboard.push([
            { text: hasPrompt ? "✏️ Редактировать промпт" : "🆕 Создать новый промпт", 
              callback_data: hasPrompt ? 'edit_prompt' : 'create_new_prompt'}
        ]);
        // --- 5-я строка: Генерация и перевод ---
        keyboard.push([
            { text: "🧹 Очистить промпт", callback_data: "clear_prompt" },
            { text: "🌐 Перевести (RU/EN)", callback_data: "translate_prompt" }
        ]);
        // --- 6-я строка: Создать картинку ---
        keyboard.push([
            { text: "🎨 Меню бесплатной генерации изображений", callback_data: 'cmd:/create_empty' }
        ]);
        // --- 7-я строка: Создать картинку по промпту платно
        keyboard.push([{ text: "📖 Создать картинку по промпту", callback_data: 'vision_generate' }]);
        // --- 7-я строка: Улучшить фото ---
        //keyboard.push([{ text: "✨ Меню улучшения фото (/photo)", callback_data: 'cmd:/photo' }]);
    } else {
        // --- Промпта нет: Предлагаем создать ---
        keyboard.push(
            [{ text: "🆕 Создать новый промпт", callback_data: "create_new_prompt" }],
            // НОВАЯ кнопка для главного меню
            //[{ text: "🏠 Открыть главное меню /start", callback_data: "start_command" }],
            //[{ text: "📸 Загрузить фотографию", callback_data: 'cmd:/upload_photo' }],
            // 🛑 НОВАЯ СТРОКА: Стандартные промпты
            [{ text: "🖼️ Шаблон для фото", callback_data: 'set_default_prompt|photo'},
             { text: "🎬 Шаблон для видео", callback_data: 'set_default_prompt|video' }],
            [{ text: "🎤 Шаблон для аудио", callback_data: 'set_default_prompt|audio'},
             { text: "❔ помощь по выбору", callback_data: 'dummy_no_buttons' }]
            );
    }

    return { inline_keyboard: keyboard };
}

// ✅ getPromptSavedKeyboard - Клавиатура после сохранения/редактирования промпта
function getPromptSavedKeyboard() {
    const keyboard = {
        inline_keyboard: [
            // 1. Вернуться в главное меню
            //[{ text: "🏠 Открыть главное меню /start", callback_data: "start_command" }],
            [{ text: "✏️ Редактировать промпт", callback_data: 'edit_prompt'}],
            [{ text: "🧹 Очистить промпт", callback_data: "clear_prompt" },
             { text: "🌐 Перевести (RU/EN)", callback_data: "translate_prompt" }],
            // 2. Вернуться в меню промпта
            //[{ text: "✏️ Меню работы с промптом (/prompt)", callback_data: 'cmd:/prompt' }],
            // 3. Перейти в меню создания изображений
            //[{ text: "🎨 Меню бесплатной генерации изображений", callback_data: 'cmd:/create_empty' }],
            // 4. Создать картинку
            [{ text: "🎨 Создать бесплатно картинку по промпту", callback_data: 'cmd:/vision_generate_free_t2i' }],
            [{ text: "📖 Создать картинку по промпту", callback_data: 'vision_generate' }], 
            [{ text: "❔ помощь по выбору", callback_data: 'dummy_no_buttons' }]           
        ]
    };

    return keyboard;
}

/**
 * Генерирует Inline Keyboard для управления озвучкой.
 */
function getSayControlKeyboard(currentVoice, currentText) {
    const maleCheck = currentVoice === VOICE_MALE ? '✅ ' : '';
    const femaleCheck = currentVoice === VOICE_FEMALE ? '✅ ' : '';
    const userVoiceCheck = currentVoice === VOICE_USER ? '✅ ' : ''; // 🛑 НОВЫЙ ЧЕК
    const isTextReady = currentText && currentText.trim().length > 0;
    
    // --- Логика для кнопки Запустить/Записать (4-й ряд) ---
    let runButtonText;
    let runButtonCallback;

    if (currentVoice === VOICE_USER) {
        // Если выбран "Свой голос"
        if (isTextReady) {
            // Если текст (который пришел через STT) есть, то готовы к конвертации/VTA
            runButtonText = '🔊 Запустить Свой Голос (OGG→MP3)';
            runButtonCallback = 'say_run';
        } else {
            // Текст не готов, просим пользователя
            runButtonText = '🎙️ Сначала отправьте голос';
            runButtonCallback = 'say_input'; // Переводим в режим ожидания (force_reply)
        }
    } else {
        // Режимы MALE/FEMALE
        if (isTextReady) {
            runButtonText = '🔊 Запустить Озвучку (TTS)';
            runButtonCallback = 'say_run';
        } else {
            runButtonText = '🔇 Сначала введите текст';
            runButtonCallback = 'say_input'; // Переводим в режим ожидания
        }
    }

    return {
        inline_keyboard: [
            [
                { text: '🏠 Открыть главное меню /start', callback_data: 'start_command' } 
            ],
            // 2-й ряд: Единая кнопка ввода текста/голоса (только для инициации режима ожидания)
            [
                { 
                    text: isTextReady ? '📝 Изменить текст или 🎙️ перезаписать голос' : '✍️ Ввести текст или 🎙️ записать голос', 
                    callback_data: 'say_input' 
                }
           ],
            // 2-й ряд: Ввод текста (оставляем для TTS-голосов)
            //[{ text: '✍️ Ввести текст или 🎙️ записать голос', callback_data: 'say_input' }],
            //[{ text: '🎙️ Записать свой голос', callback_data: 'say_input_voice' }],
            // 3-й ряд: Выбор голоса
            [
                { text: `${maleCheck}👨 Мужской голос`, callback_data: 'say_set_voice|' + VOICE_MALE }, 
                { text: `${femaleCheck}👩 Женский голос`, callback_data: 'say_set_voice|' + VOICE_FEMALE },
                { text: `${userVoiceCheck}🗣️ Свой голос`, callback_data: 'say_set_voice|' + VOICE_USER } // 🛑 НОВАЯ КНОПКА
            ],
            // 4-й ряд: Запустить/Записать
            [
                { 
                    text: runButtonText, 
                    callback_data: runButtonCallback 
                }
            ]
        ]
    };
}

/**
 * Отправляет или редактирует управляющее меню.
 * @param {number} chatId - ID чата.
 * @param {string} token - Токен бота.
 * @param {string} currentVoice - Текущий голос.
 * @param {string|null} currentText - Текущий текст.
 * @param {number|null} messageId - ID сообщения для редактирования.
 * @param {boolean} isAwaitingInput - Флаг ожидания ввода.
 */
async function sendSayControlMenu(chatId, token, currentVoice, currentText, messageId, isAwaitingInput = false) {
    const textToDisplay = currentText || '';
    
    const textPreview = textToDisplay ? `\n**Текст для озвучки:** \`${textToDisplay.substring(0, 100)}${textToDisplay.length > 100 ? '...' : ''}\`` : "\n\n**Текст:** *Нажмите 'Ввести текст'.*";
    
    // 1. Создаем объект клавиатуры, который содержит { inline_keyboard: [...] }
    const keyboardObject = getSayControlKeyboard(currentVoice, textToDisplay); 

    let statusText;
    if (isAwaitingInput) {
        // 🛑 ОБНОВЛЕННЫЙ ТЕКСТ ДЛЯ ОЖИДАНИЯ:
        statusText = currentVoice === VOICE_USER 
            ? "🎤 **Ожидаю голосовое сообщение...** (Конвертация OGG→MP3)"
            : "💬 **Ожидаю ввода текста...** (Следующее сообщение будет текстом для озвучки)";
    } else {
        statusText = (textToDisplay || currentVoice === VOICE_USER) ? '✅ Готов' : '❌ Ожидание ввода';
    }
    // 🛑 ОПРЕДЕЛЕНИЕ ТЕКУЩЕГО ГОЛОСА
    let currentVoiceDisplay;
    if (currentVoice === VOICE_MALE) {
        currentVoiceDisplay = '👨 Мужской';
    } else if (currentVoice === VOICE_FEMALE) {
        currentVoiceDisplay = '👩 Женский';
    } else if (currentVoice === VOICE_USER) {
        currentVoiceDisplay = '🗣️ Свой голос (OGG→MP3)';
    } else {
        currentVoiceDisplay = 'Не выбран';
    }
        
    const menuText = `
**🎙️ Озвучивание текста (Text-to-Audio)**

Выберите голос и введите текст/голос, а затем нажмите 'Запустить озвучку'.

**Текущий голос:** ${currentVoiceDisplay}
**Статус:** ${statusText}
${textPreview}
    `;

    if (messageId) {
        return await editMessageWithKeyboard(chatId, messageId, menuText, token, keyboardObject); 
    } else {
        const inlineKeyboardArray = keyboardObject.inline_keyboard;
        return await sendMessageWithKeyboard(chatId, menuText, token, inlineKeyboardArray);
    }
}

/**
 * ✅ sendMediaDataControlMenu - Отправляет меню управления сохраненными данными (/data).
 * @param {number} chatId - ID чата.
 * @param {string} token - Токен Telegram.
 * @param {object} envData - Данные окружения (для KV-STORAGE).
 * @param {number|null} messageId - ID сообщения для редактирования (если null, будет отправлено новое).
 */
async function sendMediaDataControlMenu(chatId, token, envData, messageId) {
    const storage = envData.LAST_PHOTO_STORAGE;
    const chatKey = chatId.toString();

    // 1. Асинхронно читаем все ключи статуса
    const [rawImage, rawVideo, rawAudioUrl] = await Promise.all([
        storage.get(chatKey + LAST_IMAGE_DATA_KEY_SUFFIX),   // Base64 фото
        storage.get(chatKey + LAST_VIDEO_DATA_KEY_SUFFIX),   // Метаданные видео
        storage.get(chatKey + '_audio_url')                 // URL аудио
    ]);

    const isPhotoSaved = !!rawImage;
    const isVideoSaved = !!rawVideo;
    const isAudioSaved = !!rawAudioUrl;

    // --- 2. Формирование текста с галочками ---
    const photoStatus = isPhotoSaved ? '✅' : '❌';
    const videoStatus = isVideoSaved ? '✅' : '❌';
    const audioStatus = isAudioSaved ? '✅' : '❌';

    let messageText = `
💾 **Управление сохраненными данными**

Здесь вы можете посмотреть и удалить медиафайлы, которые используются для генерации AI-контента.

Данные в базе:
${photoStatus} **Фото**
${videoStatus} **Видео**
${audioStatus} **Аудио**

👇 Выберите кнопку ниже для необходимого действия
`;

    // --- 3. Формирование инлайн-клавиатуры (ИСПРАВЛЕНО) ---
    let keyboard = [];
    // --- 1-я строка: Вернуться в главное меню ---
    keyboard.push([
        { text: "🏠 Открыть главное меню /start", callback_data: "start_command" }
    ]);
    // Группа: ФОТО
    // Если сохранено: [Посмотреть Фото] [Удалить Фото]
    // Если не сохранено: [Загрузить Фото]
    if (isPhotoSaved) {
        keyboard.push([
            { text: "👁️ Посмотреть Фото", callback_data: 'cmd:/view_saved_photo' },
            { text: "🗑️ Удалить Фото", callback_data: 'cmd:/clear_image' }
        ]);
    } else {
        keyboard.push([
            { text: "📸 Загрузить Фотографию", callback_data: 'cmd:/upload_photo' }
        ]);
    }
    
    // Группа: ВИДЕО
    // Если сохранено: [Посмотреть Видео] [Удалить Видео]
    // Если не сохранено: [Загрузить Видеоролик]
    if (isVideoSaved) {
        keyboard.push([
            { text: "👁️ Посмотреть Видео", callback_data: 'cmd:/view_saved_video' },
            { text: "🗑️ Удалить Видео", callback_data: 'cmd:/clear_video' }
        ]);
    } else {
        keyboard.push([
            { text: "📹 Загрузить Видеоролик", callback_data: 'cmd:/upload_video' }
        ]);
    }

    // Группа: АУДИО
    // Если сохранено: [Посмотреть Аудио] [Удалить Аудио]
    // Если не сохранено: [Загрузить Аудио/Войс]
    if (isAudioSaved) {
        keyboard.push([
            { text: "👁️ Посмотреть Аудио", callback_data: 'cmd:/view_saved_audio' },
            { text: "🗑️ Удалить Аудио", callback_data: 'cmd:/clear_audio' }
        ]);
    } else {
        keyboard.push([
            { text: "🎤 Загрузить Аудиофайл", callback_data: 'cmd:/upload_audio' }
        ]);
    }
    //if (isTaskAvailable) {
    //keyboard.push(
    //    [{
    //        text: isTaskAvailable ? "💾 Просмотр активного задания" : "▶️ Получить активное задание ",
    //        callback_data: isTaskAvailable ? `checkvideo|${previousTaskId.substring(0, 32)}` : `cmd:/checkvideo`
    //    }]
    //);
    //}

    // Кнопка: ГЛОБАЛЬНАЯ ОЧИСТКА (показываем, если хотя бы что-то сохранено)
    //if (isPhotoSaved || isVideoSaved || isAudioSaved) {
        keyboard.push([{ text: "🗑️ Очистка сохраненных данных", callback_data: 'cmd:/stop' }]);
    //}
    
    const inlineKeyboard = { inline_keyboard: keyboard };

    // --- 4. Отправка/редактирование сообщения ---
    if (messageId) {
        await editMessageWithKeyboard(chatId, messageId, messageText, token, inlineKeyboard);
    } else {
        await sendMessageMarkdown(chatId, messageText, token, null, inlineKeyboard);
    }
}

// ✅ displayPromptMenu: Показывает меню промпта (ИСПРАВЛЕНО)
/**
 * Извлекает кнопки из getPromptKeyboard и отправляет сообщение.
 * @param {number} chatId - ID чата Telegram.
 * @param {string} promptText - Текущий промпт.
 * @param {string} TELEGRAM_BOT_TOKEN - Токен бота.
 */
async function displayPromptMenu(chatId, promptText, TELEGRAM_BOT_TOKEN) {
    // Используем getPromptKeyboard для получения массива кнопок
    const keyboardObject = getPromptKeyboard(promptText);

    await sendMessageWithKeyboard(
        chatId,
        `💡 **Ваш текущий промпт:**\n\`${promptText}\`\n\nВыберите действие:`,
        TELEGRAM_BOT_TOKEN,
        keyboardObject.inline_keyboard // Передаем только массив инлайн-кнопок
    );
}

// ✅ getModelMenuKeyboard - Генерирует Inline-клавиатуру для меню настроек AI-моделей.
/**
 * @description Генерирует Inline-клавиатуру для меню настроек AI-моделей.
 * @returns {Object} Объект reply_markup с Inline-клавиатурой.
 */
function getModelMenuKeyboard(env, currentServiceType) {
    const keyboard = [];
    const currentConfig = AI_MODEL_MENU_CONFIG[currentServiceType];
    
    // 1. Кнопки выбора сервиса (Одна кнопка = один сервис)
    for (const serviceType in AI_MODEL_MENU_CONFIG) {
        const config = AI_MODEL_MENU_CONFIG[serviceType];
        
        // 💡 Гарантия: Получаем ключ модели из ENV или первый ключ по умолчанию
        const defaultModelKey = Object.keys(config.models)[0];
        const currentActiveModelKey = env[config.kvKey] || defaultModelKey; 
        
        // Получаем полное имя модели
        const fullModelName = config.models[currentActiveModelKey] || 'N/A';
        
    // 🛠️ Извлекаем имя провайдера для отображения на кнопке
        let modelService = 'N/A';
        const colonIndex = fullModelName.indexOf(':');

        if (colonIndex !== -1) {
            modelService = fullModelName.substring(0, colonIndex).trim();
        } else {
            modelService = fullModelName.split(' ')[0].trim();
        }

        // 🚨 ФИКС: УДАЛЕНО ЭКРАНИРОВАНИЕ. Используем чистое имя сервиса.
        const safeModelService = modelService; // Было: modelService.replace(/_/g, '\\_');

        const prefix = (serviceType === currentServiceType) ? '🔹 ' : '';
        const afterfix = (serviceType === currentServiceType) ? ' 🔹' : '';
        const buttonText = `${prefix}${config.name} (${safeModelService})${afterfix}`;

        keyboard.push([{
            text: buttonText,
            callback_data: `admin_model_show_${serviceType}`
        }]);
    }

    // 2. Разделитель
    keyboard.push([{ text: '🔻🔻🔻 Выберите модель 🔻🔻🔻', callback_data: 'ignore' }]);

    // 3. Кнопки моделей для текущего сервиса
    if (currentConfig) {
        // Гарантия, что currentActiveModelKey получит значение
        const defaultModelKey = Object.keys(currentConfig.models)[0];
        const currentActiveModelKey = env[currentConfig.kvKey] || defaultModelKey; 
        
        for (const modelKey in currentConfig.models) {
            const modelNameFull = currentConfig.models[modelKey];
            
            // 🚨 ФИКС: УДАЛЕНО ЭКРАНИРОВАНИЕ. Используем чистое имя модели.
            const buttonText = modelNameFull; // Было: modelNameFull.replace(/_/g, '\\_'); 
            
            // ✅ Используем безопасный разделитель ';' для передачи данных
            const callbackData = `admin_model_set_${currentServiceType};${modelKey}`;

            // Добавляем галочку, если модель выбрана
            const checkMark = (modelKey === currentActiveModelKey) ? '✅ ' : '';
            
            keyboard.push([{
                text: checkMark + buttonText, 
                callback_data: callbackData
            }]);
        }
    }
    
    // 4. Кнопка "Назад"
    keyboard.push([{ text: '⬅️ Назад в Меню администратора', callback_data: 'admin_back_to_menu' }]);

    return keyboard;
}

// ✅ getCreateMenuKeyboard - Генерирует Inline-клавиатуру для меню /create
// ПРИНИМАЕТ: currentPrompt, currentMode, chatId, LAST_PHOTO_STORAGE (KV-биндинг)
async function getCreateMenuKeyboard(currentPrompt, currentMode, chatId, LAST_PHOTO_STORAGE) { 
    
    // --- ИНИЦИАЛИЗАЦИЯ КЛЮЧЕЙ И ПРОВЕРКИ ---
    const hasPrompt = currentPrompt && currentPrompt.trim().length > 0;
    const LAST_IMAGE_DATA_KEY_SUFFIX = '_last_image_data'; 
    const originalImageBase64Key = chatId + LAST_IMAGE_DATA_KEY_SUFFIX;
    
    // 🛑 КРИТИЧЕСКИ ВАЖНО: ИСПОЛЬЗУЙТЕ AWAIT ДЛЯ ЧТЕНИЯ KV
    const rawImageKVData = await LAST_PHOTO_STORAGE.get(originalImageBase64Key, { type: 'text' });
    const isPhotoSaved = !!rawImageKVData; // true, если данные существуют

    let keyboard = [];
    const priceLine = '💸 **Цена:** Бесплатно';
    // --- 1-я строка: Вернуться в главное меню ---
    keyboard.push([
        // Используем текст и колбэк из вашей getPromptKeyboard
        { text: "🏠 Открыть главное меню /start", callback_data: "start_command" }
    ]);
    // --- 2-я строка: T2I и I2I (по 2 кнопки) ---
    const activeIcon = '✅ '; 
    
    let modeButtonRow1 = [];
    
    // 1. Text → Image (T2I) 
    if (currentMode === 'T2I') {
        modeButtonRow1.push({ text: activeIcon + "🎨 Креатив по Тексту", callback_data: 'dummy_t2i_active' });
    } else {
        // 🚨 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Переключение режима на T2I
        modeButtonRow1.push({ text: "🎨 Креатив по Тексту", callback_data: 'switch_creative_mode|T2I' });
    }
    // 2. Image → Image (I2I) 
    if (currentMode === 'I2I') { 
        modeButtonRow1.push({ text: activeIcon + "🌄 Креатив по Фото", callback_data: 'dummy_i2i_active' });
    } else {
        // 🚨 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Переключение режима на I2I
        modeButtonRow1.push({ text: "🌄 Креатив по Фото", callback_data: 'switch_creative_mode|I2I' });
    }
    keyboard.push(modeButtonRow1); // Добавляем 2-ю строку
    if (currentMode === 'I2I') { 
        // --- 4-я строка: Загрузить фото (если его нету) ---
        keyboard.push([
            { 
                text: isPhotoSaved ? "💾 Посмотреть загруженное фото" : "📸 Загрузить фотографию", 
                callback_data: isPhotoSaved ? 'cmd:/view_saved_photo' : 'cmd:/upload_photo' 
            }
        ]);
    }
    
    // --- 3-я строка: Перейти в меню промпта ---
    keyboard.push([{ text: "✏️ Меню работы с промптом (/prompt)", callback_data: 'cmd:/prompt' }],);    
    // --- 4-я строка Основные действия с промптом ---
    keyboard.push([
        { text: hasPrompt ? "✏️ Редактировать промпт" : "🆕 Создать новый промпт", 
            callback_data: hasPrompt ? 'edit_prompt' : 'create_new_prompt'},
        { text: hasPrompt ? "🧹 Очистить промпт" : "⚠️ Промпт не задан",
            callback_data: hasPrompt ? 'clear_prompt' : 'dummy_no_prompt'}
    ]);
    // --- Обновление кнопки действия ---
    let actionText = '';
    let actionCallback = 'dummy_no_prompt';
    
    if (currentMode === 'T2I') {
        actionText = hasPrompt ? "🔥 Создать картинку по промпту" : "🚫 Сначала введите промпт";
        actionCallback = hasPrompt ? 'cmd:/vision_generate_free_t2i' : 'dummy_no_prompt'; // <-- Новый колбэк для бесплатной T2I
    } else { // I2I Mode
        actionText = hasPrompt && isPhotoSaved ? "🔥 Улучшить фотографию сейчас" : "⚠️ Нет фото или промпта";
        // Проверяем, что есть и промпт, и фото для I2I
        actionCallback = hasPrompt && isPhotoSaved ? 'cmd:/vision_generate_free_i2i' : 'dummy_no_prompt'; // <-- Новый колбэк для бесплатной I2I
    }
    
    keyboard.push([ { text: actionText, callback_data: actionCallback } ]);
    // --- Обновление текста окна ---
    let messageText;
    
    if (currentMode === 'T2I') {
        // Вставляем ваш существующий текст для T2I
        messageText = hasPrompt 
        ? `🆓 Меню БЕСПЛАТНОЙ визуализации изображений**
        
❔ **Как это работает?:**
Вы просто даете **✏️ текстовое описание (промпт)**, а нейросеть мгновенно **воссоздаёт** уникальную картинку по этому тексту.
        
✅ **Промпт задан.**
Нажмите 🔥 **Создать картинку по промпту**, чтобы превратить сохраненный текст в изображение.

${priceLine}

Текущий промпт: \`${currentPrompt.substring(0, 100).replace(/`/g, '')}\`${currentPrompt.length > 100 ? '...' : ''}`
: `🆓 Меню БЕСПЛАТНОЙ визуализации изображений** 
        
❔ **Как это работает?:**
Нейросеть может воссоздать картинку по любому **✏️ текстовому описанию (промпту)**.

${priceLine}

⚠️ **Промпт не задан.**
Для запуска генерации изображения необходимо сначала задать промпт.

Нажмите 🆕 **Создать новый промпт** или перейдите в ✏️ **Меню работы с промптом** (/prompt)..`;
    } else { 
        // I2I Mode 🚨 НОВЫЙ ТЕКСТ ДЛЯ БЕСПЛАТНОГО I2I
        if (!isPhotoSaved) { // Высший приоритет: Нет сохраненного фото
            messageText = `🆓 **Меню БЕСПЛАТНОГО Улучшения фото**
   
❔ **Как это работает?:**
Нейросеть использует 📷 **загруженное фото** и ✏️ **указанный промпт** для создания улучшенного изображения, сохраняя пропорции фотографии.
    
⚠️ **Фото** или **Промпт** не обнаружены.
    
${priceLine}

Пожалуйста сначала отправьте картинку или фотографию в чат, чтобы я мог её проанализировать и сохранить.
А затем вернитесь в это меню снова.

Нажмите 🏠, чтобы вернуться в Главное меню, или отправьте фото прямо сейчас.
`;
    } else if (hasPrompt) { // Фото и Промпт присутствуют
        messageText = `🆓 **Меню БЕСПЛАТНОГО улучшения фотографий**
        
❔ **Как это работает?:**
Нейросеть использует 📷 **сохраненное фото** и ✏️ **предоставленный промпт** для создания улучшенного изображения, сохраняя пропорции фотографии.
        
✅ **Фото** загружено.
✅ **Промпт** задан.

${priceLine}

Нажмите 🔥 **Улучшить фотографию сейчас**, чтобы превратить сохраненный кадр в шедевр.

Текущий промпт: \`${currentPrompt.substring(0, 100).replace(/`/g, '')}\`${currentPrompt.length > 100 ? '...' : ''}`;
        
    } else { // Фото есть, но нет Промпта
        messageText = `🆓 **Меню БЕСПЛАТНОГО улучшения фотографий**
        
❔ **Как это работает?:**
Для улучшения фото нейросети нужен ✏️ **текстовый промпт**, описывающий загруженную фотографию или картинку для получения желаемого результата (например, "студийный портрет, солнечный свет").

✅ **Фото** загружено.
⚠️ **Промпт не задан.**

${priceLine}

Для запуска улучшения необходимо сначала задать промпт.

Нажмите 🆕 **Создать новый промпт** или перейдите в ✏️ Меню работы с промптом (/prompt).`;
        }
    }
    return { messageText: messageText, keyboardObject: { inline_keyboard: keyboard } };
}

// ✅ getTextMenuKeyboard - Генерирует Inline-клавиатуру для меню /text
async function getTextMenuKeyboard(chatId, LAST_PHOTO_STORAGE, currentPrompt) { 
    const hasPrompt = currentPrompt && currentPrompt.trim().length > 0;
    let keyboard = [];
    
    const balanceStatus = await getCurrentCreditBalance(chatId, LAST_PHOTO_STORAGE);
    
    // -------------------------------------------------------------------
    // 🔥 НОВЫЙ БЛОК: РАСЧЕТ ЦЕНЫ (T2I)
    // -------------------------------------------------------------------
    let calculatedPriceCredits = 0; // Декларация
    let isPriceSetFromConfig = false; // 💡 НОВЫЙ ФЛАГ

    // 1. Определение ключа активной модели для T2I
    const serviceType = 'TEXT_TO_IMAGE'; 
    const serviceMenuConfig = AI_MODEL_MENU_CONFIG[serviceType]; 
    
    // 🚨 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Проверка на существование конфигурации
    if (!serviceMenuConfig) {
        // Если конфигурация не найдена (ключ TEXT_TO_IMAGE отсутствует), 
        // используем запасной вариант цены, чтобы избежать сбоя деплоя.
        calculatedPriceCredits = (typeof COST_PHOTO_CREDIT !== 'undefined' ? COST_PHOTO_CREDIT : 1);
    } else {
        // 2. ДИНАМИЧЕСКОЕ ЧТЕНИЕ АКТУАЛЬНОЙ КОНФИГУРАЦИИ
        const kvKey = serviceMenuConfig.kvKey; 
        const defaultModelKey = Object.keys(serviceMenuConfig.models)[0]; 
        const freshConfigKey = await LAST_PHOTO_STORAGE.get(kvKey); // Читаем из KV
        const activeConfigKey = freshConfigKey || defaultModelKey;
        const activeModelConfig = AI_MODELS[activeConfigKey];

        // 3. Расчет цены
        let priceFromConfig = 0;

        if (activeModelConfig && typeof activeModelConfig.pricing !== 'undefined') {
            const rawPricing = activeModelConfig.pricing;
            
            // Проверяем, что цена - это число и она >= 0
            if (typeof rawPricing === 'number' && rawPricing >= 0) {
                calculatedPriceCredits = rawPricing; // ⬅️ Устанавливаем цену (может быть 0)
                isPriceSetFromConfig = true; // ⬅️ Флаг установлен!
            }
        }

        // 4. Установка финальной цены: используем цену из конфига, иначе COST_PHOTO_CREDIT.
        if (!isPriceSetFromConfig) {
            calculatedPriceCredits = (typeof COST_PHOTO_CREDIT !== 'undefined' ? COST_PHOTO_CREDIT : 1);
        }
    }
    
    // 5. Форматирование строки цены
    const priceLine = calculatedPriceCredits > 0 
        ? `💸 **Цена шедевра:** ${formatPrice(calculatedPriceCredits)}` 
        : '💸 **Цена шедевра:** Бесплатно';
    // -------------------------------------------------------------------

    // --- 1-я строка: Вернуться в главное меню ---
    keyboard.push([
        // Используем текст и колбэк из вашей getPromptKeyboard
        { text: "🏠 Открыть главное меню /start", callback_data: "start_command" }
    ]);
    // Добавляем 2-ю строку для управления балансом
    keyboard.push([{ text: '💰 Меню управления балансом', callback_data: 'show_balance' }]);
    // --- 3-я строка: T2I и I2I (по 2 кнопки) ---
    const activeIcon = '✅ '; 
    let currentMode = "T2I"; 

    let modeButtonRow1 = [];
    // 1. Text → Image (T2I) 
    if (currentMode === 'T2I') {
        modeButtonRow1.push({ text: activeIcon + "📖 Text → Image", callback_data: 'dummy_t2i_active' });
    } else {
        modeButtonRow1.push({ text: "📖 Text → Image", callback_data: 'cmd:/text_empty' });
    }
    // 2. Image → Video (I2I) 
    if (currentMode === 'I2I') { 
        modeButtonRow1.push({ text: activeIcon + "✨ Image → Image", callback_data: 'dummy_i2i_active' });
    } else {
        modeButtonRow1.push({ text: "✨ Image → Image", callback_data: 'cmd:/photo' });
    }
    keyboard.push(modeButtonRow1); // Добавляем 2-ю строку

    // --- 3-я строка: Перейти в меню промпта ---
    keyboard.push([{ text: "✏️ Меню работы с промптом (/prompt)", callback_data: 'cmd:/prompt' }],);    
    // --- 4-я строка Основные действия с промптом ---
    keyboard.push([
        { text: hasPrompt ? "✏️ Редактировать промпт" : "🆕 Создать новый промпт", 
            callback_data: hasPrompt ? 'edit_prompt' : 'create_new_prompt'},
        { text: hasPrompt ? "🧹 Очистить промпт" : "⚠️ Промпт не задан",
            callback_data: hasPrompt ? 'clear_prompt' : 'dummy_no_prompt'}
    ]);
    // --- 4-я строка: Создать картинку (Основное действие) ---
    keyboard.push([
        { 
            // Используем текст из вашей getPromptKeyboard для создания картинки
            text: hasPrompt ? "📖 Создать картинку по промпту" : "🚫 Сначала введите промпт", 
            // Используем колбэк из вашей getPromptSavedKeyboard
            callback_data: hasPrompt ? 'vision_generate' : 'dummy_no_prompt' 
        }
    ]);
    // Вставляем статус баланса в каждый блок текста
    const statusLine = `💰 **Баланс:** ${balanceStatus}`;
    const charCount = currentPrompt ? currentPrompt.length : 0;
    const messageText = hasPrompt 
        ? `📖 Меню визуализации изображений (Text-to-Image)**
        
❔ **Как это работает?:**
Нейросеть не видит Ваше фото, а просто ориентируется по текстовому описанию. Вы просто даете **✏️ промпт**, а нейросеть мгновенно **воссоздаёт** уникальную картинку по этому тексту.
        
✅ **Промпт задан.**
Нажмите 📖 **Создать картинку по промпту**, чтобы превратить сохраненный текст в изображение.

${statusLine}
${priceLine}

Текущий промпт: \`${currentPrompt.substring(0, 100).replace(/`/g, '')}\`${currentPrompt.length > 100 ? '...' : ''}`
: `📖 Меню визуализации изображений (Text-to-Image)**
        
❔ **Как это работает?:**
Нейросеть может воссоздать картинку по любому **✏️ текстовому описанию (промпту)**.

${statusLine}
${priceLine}

⚠️ **Промпт не задан.**
Для запуска генерации изображения необходимо сначала задать промпт.

Нажмите 🆕 **Создать новый промпт** или перейдите в ✏️ **Меню работы с промптом** (/prompt)..`;

    return { messageText: messageText, keyboardObject: { inline_keyboard: keyboard } };
}

function getVideoRotationKeyboard(shortCallbackKey) {
    return {
        inline_keyboard: [
            [
                { text: "↪️ 90° влево", callback_data: `${ROTATE_VIDEO_LEFT_CALLBACK}${shortCallbackKey}` },
                { text: "🔃 180° поворот", callback_data: `${ROTATE_VIDEO_180_CALLBACK}${shortCallbackKey}` },
                { text: "↩️ 90° вправо", callback_data: `${ROTATE_VIDEO_RIGHT_CALLBACK}${shortCallbackKey}` }
            ],
            [{ text: "📹 Заменить загруженный видеоролик этим", callback_data: `${SET_VIDEO_BASE_CALLBACK}${shortCallbackKey}`}]
        ]
    };
}

// ✅ answerCallbackQuery - Обязательный ответ на нажатие кнопки (УСИЛЕННАЯ, НЕРУШИМАЯ ВЕРСИЯ)
async function answerCallbackQuery(callbackQueryId, text, token) {
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    const body = { callback_query_id: callbackQueryId, text: text };
    
    // Используем try...catch, чтобы гарантировать, что этот вызов не выбросит ошибку, 
    // позволяя handleAdminCallback продолжить работу.
    try {
        const response = await fetch(url, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(body) 
        });
        
        // Если Telegram не подтвердил ответ, мы просто логируем это
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Telegram answerCallbackQuery failed (Non-OK response): ${errorText}`);
        }
    } catch (e) {
        // КРИТИЧНО: Логируем ошибку сети/fetch, но не выбрасываем ее. 
        // Это предотвращает зависание кнопки.
        console.error("Critical: Failed to acknowledge callback due to network/fetch error:", e.message);
    }
}

// ✅ getFreshEnvData (ФИНАЛЬНАЯ ВЕРСИЯ: Считывает ВСЕ флаги и ключи моделей)
async function getFreshEnvData(currentEnvData, storage) {
    // ВАШИ ГЛОБАЛЬНЫЕ КОНСТАНТЫ (например, GLOBAL_DEBUG_KEY и т.д.)
    const KEY_DEBUG = GLOBAL_DEBUG_KEY; 
    const KEY_TTS = GLOBAL_TTS_KEY;
    const KEY_PHOTO = GLOBAL_PHOTO_KEY;
    const KEY_VIDEO = GLOBAL_VIDEO_KEY;

    // 1. Создаем массив ключей для моделей
    const modelKeysToFetch = [];
    for (const serviceType in AI_MODEL_MENU_CONFIG) {
        if (AI_MODEL_MENU_CONFIG.hasOwnProperty(serviceType)) {
            modelKeysToFetch.push(AI_MODEL_MENU_CONFIG[serviceType].kvKey);
        }
    }
    
    // 2. Создаем единый массив промисов: сначала 4 флага, затем все ключи моделей
    const allPromises = [
        storage.get(KEY_DEBUG),
        storage.get(KEY_TTS),
        storage.get(KEY_PHOTO),
        storage.get(KEY_VIDEO),
        ...modelKeysToFetch.map(key => storage.get(key)) 
    ];

    // 3. Выполняем все запросы
    const allResults = await Promise.all(allPromises);
    
    const freshData = { ...currentEnvData };
    
    // 4. Общие флаги (первые 4 результата)
    const [debug, tts, photo, video] = allResults.slice(0, 4);
    freshData.DEBUG_ENABLED = debug === 'true';
    freshData.TTS_ENABLED = tts === 'true';
    freshData.PHOTO_ENABLED = photo === 'true';
    freshData.VIDEO_ENABLED = video === 'true';

    // 5. Ключи моделей (остальные результаты, начиная с индекса 4)
    for (let i = 0; i < modelKeysToFetch.length; i++) {
        const kvKey = modelKeysToFetch[i];
        const modelValue = allResults[i + 4]; 
        
        freshData[kvKey] = modelValue || ''; 
    }
    
    return freshData;
}

// ✅ getTelegramFilePath - получение пути к файлу
async function getTelegramFilePath(fileId, token) {
    const url = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.ok) { throw new Error(`Telegram API: Не удалось получить file_path. ${JSON.stringify(data.description)}`); }
    return data.result.file_path;
}

/**
 * Получает прямую ссылку на файл с серверов Telegram.
 * Это первый шаг для любого скачивания.
 */
async function getFileLink(file_id, TELEGRAM_BOT_TOKEN) {
    const fileInfoUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${file_id}`;
    
    const response = await fetch(fileInfoUrl);
    if (!response.ok) {
        throw new Error(`Telegram API /getFile failed: ${response.statusText}`);
    }
    const result = await response.json();
    
    if (!result.ok || !result.result || !result.result.file_path) {
        throw new Error("Telegram API didn't return a file path.");
    }

    const file_path = result.result.file_path;
    return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file_path}`;
}

/**
 * Функция для получения текущего медиа-объекта с унифицированными именами полей.
 */
async function getCurrentMediaData(chatId, envData, storage, isVideo = false) {
    const chatKey = chatId.toString();
    
    if (isVideo) {
        // 1. Получаем метаданные видео (file_id, width, height)
        const videoDataKey = chatKey + LAST_VIDEO_DATA_KEY_SUFFIX;
        const rawVideoData = await storage.get(videoDataKey);
        
        // 2. Получаем настройки видео (aspectRatio)
        const videoParamsKey = chatKey + VIDEO_PARAMS_KEY_SUFFIX;
        const videoParams = await storage.get(videoParamsKey, { type: 'json' })
            .then(res => ({ aspectRatio: '16:9', ...res })) // дефолт если нет данных
            .catch(() => ({ aspectRatio: '16:9' }));

        if (!rawVideoData) return null;

        try {
            const data = JSON.parse(rawVideoData);
            let currentWidth = parseInt(data.width) || 0;
            let currentHeight = parseInt(data.height) || 0;
            
            // aspectRatio берем именно из настроек (videoParams)
            let aspectRatio = videoParams.aspectRatio || '16:9';

            return {
                currentWidth,
                currentHeight,
                aspectRatio,
                file_id: data.file_id
            };
        } catch (e) {
            return { currentWidth: 0, currentHeight: 0, aspectRatio: '16:9', file_id: String(rawVideoData) };
        }
    } else {
        // Для ФОТО всё остается в одном ключе
        const photoDataKey = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX;
        const rawPhotoData = await storage.get(photoDataKey);

        if (!rawPhotoData) return null;

        try {
            const data = JSON.parse(rawPhotoData);
            let currentWidth = parseInt(data.width) || 0;
            let currentHeight = parseInt(data.height) || 0;
            let aspectType = data.aspect_type || 'portrait';

            // Дефолты если размеры не определились
            if (!currentWidth || !currentHeight) {
                if (aspectType === 'landscape') { currentWidth = 1280; currentHeight = 720; }
                else if (aspectType === 'square') { currentWidth = 1024; currentHeight = 1024; }
                else { currentWidth = 960; currentHeight = 1280; }
            }

            return {
                currentWidth,
                currentHeight,
                aspectType,
                file_id: data.file_id
            };
        } catch (e) {
            return { currentWidth: 0, currentHeight: 0, aspectType: 'portrait', file_id: String(rawPhotoData) };
        }
    }
}

/**
 * Точный расчёт шагов ресайза на основе Aspect Ratio.
 */
function getCalculatedPhotoSteps(currentWidth, currentHeight, aspectType = 'portrait') {
    const targetHeights = [240, 360, 480, 580, 720, 1080, 1440, 2160];
    let aspectRatio = (currentWidth && currentHeight) ? (currentWidth / currentHeight) : 0;

    // Если данных нет, используем жёсткие пропорции по типу
    if (aspectRatio === 0) {
        if (aspectType === 'landscape') aspectRatio = 16 / 9;
        else if (aspectType === 'square') aspectRatio = 1 / 1;
        else aspectRatio = 3 / 4; // portrait
    }

    return targetHeights.map(targetHeight => {
        let calculatedWidth = Math.round(targetHeight * aspectRatio);
        if (calculatedWidth % 2 !== 0) calculatedWidth++; // FFmpeg требование
        
        return { 
            p: targetHeight + 'p', 
            label: `${calculatedWidth}x${targetHeight}`, 
            currentHeight: targetHeight, // высота шага для сравнения
            currentWidth: calculatedWidth 
        };
    });
}

/**
 * Формирует публичный URL для исходного изображения, добавляя параметр поворота.
 * @param {string} fileId - Идентификатор файла (из Telegram).
 * @param {number} rotationDegree - Угол поворота (0, 90, 180, 270).
 * @param {number} chatId - ID чата (для формирования уникального пути).
 * @returns {string} Публичный URL с параметром поворота.
 */
function getRotatedPublicUrl(fileId, rotationDegree, chatId) {
    // **ВАЖНО:** Ваш публичный URL /kv-images/ может найти файл только по fileId:
    const baseUrl = `/kv-images/i2v/${chatId}/${fileId}`; 

    let url = `${baseUrl}.png`; // Предполагаем формат PNG

    // Добавляем параметр rotate, который обрабатывается Cloudflare Image Resizing
    if (rotationDegree && rotationDegree !== 0) {
        // Если уже есть параметры, используем &, иначе ?
        url += `?rotate=${rotationDegree}`; 
    }
    
    return url;
}

// ✅ uploadFileUrlToKieAi - Загрузка файла по URL через Kie.ai
// Эта функция заменяет сложный процесс скачивания/загрузки
async function uploadFileUrlToKieAi(fileUrl, fileName, envData) {
    const KIEAI_BASE_URL = 'https://kieai.redpandaai.co';
    const uploadUrl = `${KIEAI_BASE_URL}/api/file-url-upload`; 
    const kieAiApiKey = envData.KIEAI_API_KEY; 

    // 🛑 ОБЯЗАТЕЛЬНЫЕ ПОЛЯ: fileUrl и uploadPath
    const requestBody = {
        "fileUrl": fileUrl,
        "uploadPath": "audio-isolation-jobs", // Используем специфичный путь
        // fileName является необязательным, но полезным
        "fileName": fileName || 'audio_source.mp3', 
    };

    envData.ctx.waitUntil(logDebug("KIEAI_URL_UPLOAD_REQUEST", 
        `Body:\n${JSON.stringify(requestBody, null, 2)}`, 
        envData));

    const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${kieAiApiKey}`, 
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });
    
    // Пытаемся получить JSON-ответ в любом случае
    let data;
    try {
        data = await uploadResponse.json();
    } catch (e) {
        // Если ответ не JSON (например, пустой 500)
        throw new Error(`Kie.ai вернул статус ${uploadResponse.status}, но не JSON. `);
    }

    // 1. Проверяем HTTP-статус и внутренний код ответа Kie.ai (200)
    if (uploadResponse.status !== 200 || data.code !== 200) {
        // Ловим ошибки 400, 401, 500
        const errorMsg = data.msg || JSON.stringify(data);
        throw new Error(`Ошибка Kie.ai URL Upload (${uploadResponse.status}): ${errorMsg}`);
    }

    // 2. 🛑 НАДЕЖНОЕ ИЗВЛЕЧЕНИЕ File ID (FileUploadResult)
    const resultData = data.data; // Объект FileUploadResult
    const fileId = resultData.downloadUrl; // Временное решение: используем Download URL
    
    if (!fileId) {
        throw new Error(`Kie.ai вернул успех, но не выдал downloadUrl (нет file ID). Полный ответ: ${JSON.stringify(data)}`);
    }

    // Возвращаем Download URL, который будет использоваться как 'file_id' в Task API.
    return fileId; 
}

/**
 * @description Загружает ArrayBuffer в Kie.ai Storage через Multipart Upload.
 * @param {ArrayBuffer} audioBuffer - Буфер аудиоданных (PCM от Gemini).
 * @param {string} fileName - Имя файла, под которым он будет сохранен (например, 'source.wav').
 * @param {string} mimeType - MIME-тип данных (например, 'audio/wav').
 * @param {Object} envData - Объект окружения.
 * @returns {Promise<string>} Публичный URL загруженного файла.
 */
async function uploadBufferToKieAi(audioBuffer, fileName, mimeType, envData) {
    const KIEAI_API_KEY = envData.KIEAI_API_KEY; // Ваш общий ключ

    if (!KIEAI_API_KEY) {
        throw new Error("KIEAI_API_KEY не настроен.");
    }
    
    // 1. Создание Multipart Form Data
    // 🛑 Worker'ам часто нужна библиотека или вспомогательная функция для этого
    // Мы будем использовать стандартный 'form-data' API, если он доступен.
    const formData = new FormData();
    
    // Создаем Blob или File из ArrayBuffer (необходимо для FormData в Worker)
    const fileBlob = new Blob([audioBuffer], { type: mimeType });
    
    // 'file' — это имя поля, которое ожидает Kie.ai для данных файла
    // fileName — имя, под которым файл сохранится (критично для обхода проверок!)
    formData.append('file', fileBlob, fileName);
    formData.append('uploadPath', 'tts-audio-jobs'); // Имя пути, например, 'tts-audio-jobs'
    // 2. Отправка запроса
    // 🛑 ИСПРАВЛЕНИЕ 1: Добавляем правильный Base URL
    const BASE_URL = 'https://kieai.redpandaai.co';
    // 🛑 ИСПРАВЛЕНИЕ 2: Используем правильный эндпоинт для загрузки буфера
    const url = `${BASE_URL}/api/file-stream-upload`; 

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${KIEAI_API_KEY}`,
            // 'Content-Type': 'multipart/form-data' -- не нужно, fetch добавит сам
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        envData.ctx.waitUntil(logDebug("KIEAI_UPLOAD_FAIL", `HTTP Error ${response.status}. Response: ${errorText.substring(0, 500)}`, envData));
        throw new Error(`Kie.ai Upload API Error: ${response.status} - ${errorText.substring(0, 150)}...`);
    }

    const data = await response.json(); 

    // 🛑 ИСПРАВЛЕНИЕ: Ищем downloadUrl, как указано в документации
    const publicUrl = data?.data?.downloadUrl || data?.data?.fileUrl; 
    // Мы также можем использовать fileUrl, но downloadUrl кажется более надежным для прямого использования.

    if (!publicUrl) {
        // Добавьте дебаг-лог, чтобы увидеть, что Kie.ai вернул в data
        envData.ctx.waitUntil(logDebug("KIEAI_UPLOAD_NO_URL", `Ответ сервера не содержит URL. Полный Data: ${JSON.stringify(data).substring(0, 500)}`, envData));
        
        throw new Error("Kie.ai не вернул URL после загрузки файла."); 
    }

    envData.ctx.waitUntil(logDebug("KIEAI_UPLOAD_SUCCESS", `Файл ${fileName} загружен. URL: ${publicUrl.substring(0, 50)}...`, envData));
    
    return publicUrl;
}

// ✅ downloadTelegramFile - скачивание файла
async function downloadTelegramFile(filePath, token) {
    const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
    // ИСПРАВЛЕНО: Добавлен таймаут (28с) и проверка.
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(28000) });
        if (!response.ok) { throw new Error(`HTTP Error ${response.status} при скачивании файла.`); }
        return response.arrayBuffer();
    } catch (e) {
        if (e.name === 'TimeoutError') { throw new Error("Скачивание файла превысило лимит времени (28 секунд). Файл слишком большой."); }
        throw e;
    }
}

// ✅ Адаптированный скачиватель по полному URL
async function downloadTelegramFileUrl(fileUrl, token) {
    // URL уже содержит токен: https://api.telegram.org/file/bot<TOKEN>/<FILE_PATH>
    try {
        const response = await fetch(fileUrl, { signal: AbortSignal.timeout(28000) });
        if (!response.ok) { throw new Error(`HTTP Error ${response.status} при скачивании файла.`); }
        return response.arrayBuffer();
    } catch (e) {
        if (e.name === 'TimeoutError') { throw new Error("Скачивание файла превысило лимит времени (28 секунд). Файл слишком большой."); }
        throw e;
    }
}

/**
 * ✅ downloadFileBuffer - Скачивает любой файл Telegram по его file_id и возвращает ArrayBuffer.
 * @param {string} fileId - Telegram File ID (например, голосового сообщения).
 * @param {string} token - Токен бота.
 * @param {object} envData - Данные окружения (для ctx.waitUntil, если нужно).
 * @returns {Promise<ArrayBuffer>} ArrayBuffer с содержимым файла.
 */
async function downloadFileBuffer(fileId, token, envData) {
    // 1. Получаем file_path
    const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
    const fileResponse = await fetch(getFileUrl);
    const fileData = await fileResponse.json();

    if (!fileData.ok || !fileData.result.file_path) {
        envData.ctx.waitUntil(logDebug('ERROR', `Telegram getFile failed: ${fileData.description}`, envData));
        throw new Error(`Telegram getFile failed: ${fileData.description}`);
    }
    
    const filePath = fileData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
    
    // 2. Скачиваем файл с таймаутом (Используем логику из ваших функций)
    try {
        const downloadResponse = await fetch(downloadUrl, { signal: AbortSignal.timeout(28000) });
        
        if (!downloadResponse.ok) {
            envData.ctx.waitUntil(logDebug('ERROR', `File download failed: ${downloadResponse.status}`, envData));
            throw new Error(`File download failed with status: ${downloadResponse.status}`);
        }
        
        return downloadResponse.arrayBuffer();
        
    } catch (e) {
        if (e.name === 'TimeoutError') {
            throw new Error("Скачивание файла превысило лимит времени (28 секунд).");
        }
        throw e;
    }
}

/**
 * ✅ downloadAndSaveBase64 - Скачивает файл по file_id, конвертирует его в Base64 и сохраняет в KV.
 * 🛑 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Теперь сохраняет также прямой URL Telegram для моделей (KIE.AI A2V).
 * * @param {string} fileId - Telegram File ID.
 * @param {number} chatId - ID чата.
 * @param {object} envData - Данные окружения (STORAGE, token, LAST_IMAGE_DATA_KEY_SUFFIX, getRotatedPublicUrl).
 * @param {object} mediaObject - Объект фото/документа из Telegram (содержит width, height и т.д.).
 * @param {number} [rotationDegree=0] - Угол поворота (0, 90, 180, 270).
 * @returns {Promise<boolean>} true в случае успеха.
 */
async function downloadAndSaveBase64(fileId, chatId, envData, mediaObject, rotationDegree = 0) {
    const PHOTO_URL_KEY_SUFFIX = '_photo_url'; // Используем явное значение
    const token = envData.TELEGRAM_BOT_TOKEN;
    const LAST_IMAGE_DATA_KEY = `${chatId}${LAST_IMAGE_DATA_KEY_SUFFIX}`;
    const STORAGE = envData.LAST_PHOTO_STORAGE;
    
    let downloadUrl;
    
    // --- 1. ОПРЕДЕЛЯЕМ ИСТОЧНИК СКАЧИВАНИЯ (Telegram vs. Повернутый URL) ---
    if (rotationDegree && rotationDegree !== 0) {
        // Если есть поворот, скачиваем с нашего публичного URL с параметром rotate
        const getRotatedPublicUrl = envData.getRotatedPublicUrl || globalThis.getRotatedPublicUrl;
        
        if (!getRotatedPublicUrl) {
            // envData.ctx.waitUntil(logDebug('ERROR', "getRotatedPublicUrl не определена", envData));
            throw new Error("getRotatedPublicUrl не определена для поворота.");
        }
        
        downloadUrl = getRotatedPublicUrl(fileId, rotationDegree, chatId);
    } else {
        // Если поворота нет (rotationDegree = 0), скачиваем напрямую с Telegram
        const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
        const fileResponse = await fetch(getFileUrl);
        const fileData = await fileResponse.json();

        if (!fileData.ok) {
            // envData.ctx.waitUntil(logDebug('ERROR', `Telegram getFile failed: ${fileData.description}`, envData));
            throw new Error(`Telegram getFile failed: ${fileData.description}`);
        }
        
        const filePath = fileData.result.file_path;
        downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
        
        // 🛑 КРИТИЧЕСКИЙ ШАГ: СОХРАНЯЕМ URL ФОТО ДЛЯ A2V (KIE.AI)
        // Используем явный суффикс '_photo_url'
        await STORAGE.put(chatId + PHOTO_URL_KEY_SUFFIX, downloadUrl, { expirationTtl: 3600 });
    }

    // --- 2. СКАЧИВАНИЕ ФАЙЛА (Ваш оригинальный код) ---
    const downloadResponse = await fetch(downloadUrl);
    
    if (!downloadResponse.ok) {
        // envData.ctx.waitUntil(logDebug('ERROR', `File download failed: ${downloadResponse.status}`, envData));
        throw new Error(`File download failed with status: ${downloadResponse.status} from URL: ${downloadUrl.substring(0, 100)}...`);
    }
    
    const imageArrayBuffer = await downloadResponse.arrayBuffer();

    // --- 3. КОНВЕРТАЦИЯ ArrayBuffer в Base64 (Ваш оригинальный код) ---
    const buffer = new Uint8Array(imageArrayBuffer);
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    const base64Image = btoa(binary);

    // --- 4. СОХРАНЕНИЕ ПОЛНОГО ОБЪЕКТА В KV (Base64 + метаданные) ---
    const finalBase64 = `data:image/jpeg;base64,${base64Image}`;
    
    // Получение метаданных из mediaObject
    const photoWidth = mediaObject.width || null; 
    const photoHeight = mediaObject.height || null;
    const isDocument = !photoWidth && !!mediaObject.mime_type;
    
    let aspectType = 'square';
    if (photoWidth && photoHeight) {
        const ratio = photoWidth / photoHeight;
        if (ratio > 1.25) { aspectType = 'landscape'; }
        else if (ratio < 0.8) { aspectType = 'portrait'; }
    }
    
    const imageMetadata = {
        base64: finalBase64, // Сохраняем готовую строку Base64
        width: photoWidth,
        height: photoHeight,
        is_document: isDocument,
        aspect_type: aspectType,
        rotation: rotationDegree // Сохраняем угол, на всякий случай
    };

    await envData.LAST_PHOTO_STORAGE.put(LAST_IMAGE_DATA_KEY, JSON.stringify(imageMetadata), { expirationTtl: 3600 });
    
    return true;
}

// ✅ logDebug (КОМПЛЕКСНЫЙ ЛОГГЕР: KV + TELEGRAM) - ФИНАЛЬНАЯ ВЕРСИЯ
async function logDebug(type, message, envData, ctx) {
    // 1. КОНТРОЛЬ TELEGRAM-ЛОГОВ
    // Отправляем сообщение только если флаг включен
    if (envData.DEBUG_ENABLED) {
        // Мы предполагаем, что вы хотите отправлять эти логи в админ-чат,
        // используя глобальный ADMIN_CHAT_ID.
        const messageText = `🪲 **[DEBUG]-[${type}]** ${message}`;
        if (envData.ADMIN_CHAT_ID && envData.TELEGRAM_BOT_TOKEN) {
            // Используем ctx.waitUntil для неблокирующей отправки, если ctx доступен
            if (ctx && ctx.waitUntil) {
                ctx.waitUntil(sendMessage(envData.ADMIN_CHAT_ID, messageText, envData.TELEGRAM_BOT_TOKEN));
            } else {
                // Если ctx недоступен (например, в не-fetch контексте), отправляем синхронно
                await sendMessage(envData.ADMIN_CHAT_ID, messageText, envData.TELEGRAM_BOT_TOKEN);
            }
        }
    }

    // 2. ЛОГИКА ЗАПИСИ В KV (НЕ ЗАВИСИТ ОТ DEBUG_ENABLED)
    const { BOT_LOGS_STORAGE } = envData;
    // Если KV-биндинг отсутствует, прекращаем запись
    if (!BOT_LOGS_STORAGE) return;

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}][${type}] ${message}`;

    // Получаем текущий лог (или пустой массив)
    let logs = await BOT_LOGS_STORAGE.get('master_log_list', { type: 'json' });
    logs = Array.isArray(logs) ? logs : [];

    // Добавляем новую запись в начало
    logs.unshift(logEntry);

    // Обрезаем лог до 50 последних записей
    if (logs.length > 50) {
        logs = logs.slice(0, 50);
    }
    // Сохраняем обратно
    // await BOT_LOGS_STORAGE.put('master_log_list', JSON.stringify(logs));
}

/**
 * Отправляет форматированное сообщение в чат администратора для отладки.
 * Использует ADMIN_CHAT_ID из envData.
 */
async function sendDebugMessage(message, envData) {
    // ВАЖНО: envData.ADMIN_CHAT_ID должен быть корректно настроен в Worker
    const chatId = envData.ADMIN_CHAT_ID;
    const token = envData.TELEGRAM_BOT_TOKEN; 

    if (!chatId) return; // Не отправляем, если нет ID

    const maxLength = 4096;
    const truncatedMessage = message.substring(0, maxLength);
    
    try {
        // Используем новую sendMessage (parseMode: 'Markdown' по умолчанию)
        await sendMessage(chatId, truncatedMessage, token);
    } catch (e) {
        console.error("Failed to send debug message:", e.message);
    }
}

// =========================================================
// НОВАЯ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ЗАПУСКА AI ОПЕРАЦИЙ
// =========================================================

/**
 * Запускает короткий неблокирующий опрос KIE.ai в фоне (через context.waitUntil).
 * Заменяет долгий блокирующий опрос на первом этапе.
 */
async function runNonBlockingPolling(chatId, pollData, envData) {
    const maxAttempts = 10; 
    const delayMs = 15000; // 15 секунд
    const token = envData.TELEGRAM_BOT_TOKEN;
    const LAST_ACTIVE_TASK_KEY = chatId.toString() + LAST_ACTIVE_VIDEO_KEY_SUFFIX; 
    const storage = envData.LAST_PHOTO_STORAGE;

    await sendDebugMessage(`🟢 *[Auto Check Started]* Запущен фоновый опрос для чата ${chatId}.`, envData);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, delayMs));

        let currentPollDataRaw = await storage.get(LAST_ACTIVE_TASK_KEY);
        if (!currentPollDataRaw) {
            await sendDebugMessage(`⏹️ *[Auto Check Stopped]* Job ID удален из KV.`, envData);
            return; 
        }
        
        const currentPollData = JSON.parse(currentPollDataRaw);
        const taskId = currentPollData.taskId;

        try {
            // Предполагаем, что kieAiApiPolling определена и возвращает URL или null
            const videoUrl = await kieAiApiPolling(
                taskId, 
                currentPollData.apiKey, 
                currentPollData.modelConfig.BASE_URL,
                true // isNonBlocking (не ждем долго)
            );
            
            if (videoUrl) {
                // УСПЕХ: Отправка видео и удаление ключа
                await sendVideoByUrl(chatId, videoUrl, token);
                //await storage.delete(LAST_ACTIVE_TASK_KEY);
                await sendDebugMessage(`✅ *[Auto Check Success]* Видео для ${chatId} готово и отправлено.`, envData);
                return;
            }

            // Если не готово
            await sendDebugMessage(`🔄 *[Auto Check]* Попытка ${attempt}/${maxAttempts} для ${taskId.substring(0, 10)}... (Статус: 'processing').`, envData);

        } catch (e) {
            // Ошибка API или таймаут
            await sendDebugMessage(`❌ *[Auto Check Error]* Ошибка опроса ${taskId.substring(0, 10)}...: ${e.message}`, envData);
            // НЕ удаляем ключ, чтобы пользователь мог проверить вручную
            return; 
        }
    }
    
    // Если вышли по лимиту попыток
    await sendDebugMessage(`⚠️ *[Auto Check Timeout]* Достигнут лимит ${maxAttempts} попыток. Передаем проверку пользователю.`, envData);
}

// ✅ runDelayedVideoCheck - Выполняет ОДИНАРНЫЙ вызов проверки статуса через 25-30 секунд.
/**
 * Выполняет ОДИНАРНЫЙ вызов проверки статуса через 25-30 секунд.
 * Включено подробное логирование для отслеживания ошибок.
 *
 * @param {number} chatId 
 * @param {object} pollData - Объект с taskId, modelConfig (с BASE_URL), apiKey.
 * @param {object} envData - Данные окружения (включая context, logDebug).
 * @param {number} delaySeconds - Задержка в секундах (по умолчанию 25).
 */
async function runDelayedVideoCheck(chatId, pollData, envData, delaySeconds = 10) { 
    const TELEGRAM_BOT_TOKEN = envData.TELEGRAM_BOT_TOKEN;
    const taskId = pollData.taskId; 
    const apiKey = pollData.apiKey;
    // 🛑 КРИТИЧЕСКОЕ ИЗВЛЕЧЕНИЕ URL: ПРОВЕРЬТЕ, что BASE_URL доступен!
    const baseUrl = pollData.modelConfig.BASE_URL; 
    
    // Формируем URL для проверки статуса
    const url = `${baseUrl}/jobs/recordInfo?taskId=${taskId}`;
    
    // 1. Введение задержки
    await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    
    try {
        const headers = { 'Authorization': `Bearer ${apiKey}` };

        // 🛑 ДЕБАГ 1: Логирование исходящего запроса
        envData.ctx.waitUntil(logDebug(
            "DEBUG_VIDEO_CHECK",
            `[START ${taskId.substring(0, 8)}] Checking status after ${delaySeconds}s. URL: ${url}`,
            envData
        ));

        // 2. ЯВНАЯ ПРОВЕРКА СТАТУСА (используется для надежного определения состояния)
        const response = await fetch(url, { headers: headers });
        const jsonResponse = await response.json();
        const state = jsonResponse?.data?.state; 

        // 🛑 ДЕБАГ 2: Логирование ответа API
        envData.ctx.waitUntil(logDebug(
            "DEBUG_VIDEO_CHECK",
            `[RESPONSE ${taskId.substring(0, 8)}] State: ${state}. Full response:\n\`\`\`json\n${JSON.stringify(jsonResponse, null, 2)}\n\`\`\``,
            envData
        ));

        // 3. Обработка
        if (state === 'success') {
            // Если готово, вызываем handleCheckVideoCommand для доставки.
            await handleCheckVideoCommand(chatId, pollData, envData);
            
        } else if (state === 'waiting' || state === 'processing') {
            
            // Если НЕ готово, отправляем сообщение с кнопкой.
            const buttonText = `👁 Проверить статус задания (${taskId.substring(0, 8)}...)`;
            const replyMarkup = {
                inline_keyboard: [
                    [{
                        text: buttonText,
                        callback_data: `checkvideo|${taskId.substring(0, 32)}` 
                    }]
                ]
            };
            
            const messageText = `⏳ Автоматическая проверка (${delaySeconds} сек) для задания \`${taskId.substring(0, 10)}...\` завершена. Видео еще **не готово**. Нажмите кнопку, чтобы проверить статус вручную:`;
            
            // 4. Отправляем сообщение с кнопкой, используя Вашу функцию sendMessageMarkdown
            await sendMessageMarkdown(chatId, messageText, TELEGRAM_BOT_TOKEN, null, replyMarkup);
        }
        
    } catch (e) {
        // 🛑 ДЕБАГ 3: Логирование ошибки
        envData.ctx.waitUntil(logDebug(
            "ERROR_VIDEO_CHECK",
            `[FATAL ${taskId.substring(0, 8)}] Auto check failed: ${e.message}. Stack: ${e.stack ? e.stack.substring(0, 500) : 'N/A'}`,
            envData
        ));
        
        console.error(`Automatic status check failed for Task ID ${taskId.substring(0, 10)}...: ${e.message}`);
    }
}

/**
 * ✅ sendVideoWithCaption - Отправка видео через ArrayBuffer с кнопками и сохранением в KV.
 */
async function sendVideoWithCaption(chatId, videoArrayBuffer, caption, token, envData) {
    const CALLBACK_TEMP_STORAGE = envData.LAST_PHOTO_STORAGE; 
    const CALLBACK_EXPIRATION_TTL = 3600;
    if (!videoArrayBuffer || videoArrayBuffer.byteLength === 0) {
        throw new Error("sendVideoWithCaption: Пустой ArrayBuffer видео.");
    }

    const apiUrl = `https://api.telegram.org/bot${token}/sendVideo`;
    const formData = new FormData();
    // Используем Blob/File для передачи видео
    const videoFile = new File([videoArrayBuffer], 'video.mp4', { type: 'video/mp4' });

    formData.append('chat_id', chatId.toString());
    formData.append('caption', caption); // Для видео обычно проще использовать Markdown
    formData.append('video', videoFile, 'video.mp4');
    //formData.append('parse_mode', 'Markdown');
    formData.append('parse_mode', 'HTML');

    // 1. ОТПРАВКА ВИДЕО
    const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(300000) // 5 минут для видео
    });

    const responseText = await response.text();
    let responseData = {};
    try { responseData = JSON.parse(responseText); } catch(e) { }

    if (!response.ok || !responseData.ok) {
        throw new Error(`Telegram Video API Error: ${responseData.description || responseText}`);
    }

    // 2. БЛОК ДОБАВЛЕНИЯ КНОПОК (как в sendPhoto)
    try {
        const messageId = responseData.result.message_id;
        const videoObject = responseData.result.video;
        const fileId = videoObject ? videoObject.file_id : null;

        if (fileId) {
            const shortCallbackKey = generateShortId(); // Твоя функция генерации ID
            const KV_KEY = `callback_${chatId}_${shortCallbackKey}`;

            // Сохраняем состояние видео в KV
            const rotationState = {
                fileId: fileId,
                rotation: 0,
                width: videoObject.width || null,
                height: videoObject.height || null,
                type: 'video' // Пометка, что это видео
            };

            await CALLBACK_TEMP_STORAGE.put(KV_KEY, JSON.stringify(rotationState), { expirationTtl: CALLBACK_EXPIRATION_TTL });

            const inlineKeyboard = {
                inline_keyboard: [
                    [
                        { text: "↪️ 90° влево", callback_data: `${ROTATE_VIDEO_LEFT_CALLBACK}${shortCallbackKey}` },
                        { text: "🔃 180° поворот", callback_data: `${ROTATE_VIDEO_180_CALLBACK}${shortCallbackKey}` },
                        { text: "↩️ 90° вправо", callback_data: `${ROTATE_VIDEO_RIGHT_CALLBACK}${shortCallbackKey}` }
                    ],
                    [{ text: "🎬 Установить как основной видеоролик", callback_data: `${SET_VIDEO_BASE_CALLBACK}${shortCallbackKey}`}]
                ]
            };

            // Добавляем клавиатуру к уже отправленному видео
            await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: inlineKeyboard
                })
            });
        }
    } catch (e) {
        console.error("Ошибка при добавлении кнопок к видео:", e);
    }

    return responseData;
}

// ✅ Отправка видео (ОБНОВЛЕННАЯ: поддерживает caption, использует Markdown)
async function sendVideo(chatId, videoUrl, token, caption = "") {
    const url = `https://api.telegram.org/bot${token}/sendVideo`;
    const body = {
        chat_id: chatId,
        video: videoUrl,
        //parse_mode: 'Markdown'
        parse_mode: 'HTML'
    };
    if (caption) { body.caption = caption; }
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

/**
 * Отправляет аудиофайл, используя URL или File ID.
 * @param {number} chatId ID чата
 * @param {string} audioSource Публичный URL Telegram или file_id
 * @param {string} token Токен бота
 */
async function sendAudio(chatId, audioSource, token) {
    const apiUrl = `https://api.telegram.org/bot${token}/sendAudio`;
    
    const body = {
        chat_id: chatId.toString(),
        audio: audioSource, // Может быть URL или file_id
        mime_type: 'audio/mpeg',
        caption: '🔊 Сохраненное аудио'
    };
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ошибка при отправке аудио: ${response.statusText}. Детали: ${errorText}`);
        throw new Error(`Ошибка Telegram API при отправке аудио.`);
    }
}

// ✅ 1.5. sendAudioMessage - ФИНАЛЬНЫЙ КОД С СОХРАНЕНИЕМ ДЛЯ AVATAR
async function sendAudioMessage(chatId, audioBase64, mimeType, token, envData) {
    // 🛑 ДОПУЩЕНИЕ: mimeType и audioBase64 соответствуют MP3 ('audio/mpeg').
    const finalMimeType = 'audio/mpeg'; 
    const chatKey = chatId;
    const storage = envData.LAST_PHOTO_STORAGE;
    const ctx = envData.ctx;

    const BASE64_KEY = chatKey + LAST_AUDIO_DATA_KEY_SUFFIX; // _last_audio_data
    const URL_KEY = chatKey + AUDIO_URL_KEY_SUFFIX;          // _audio_url
    const FILE_ID_KEY = chatKey + '_audio_file_id'; // <-- ДОБАВЛЕНО
    const DURATION_KEY = chatKey + AUDIO_DURATION_KEY_SUFFIX; // 🔥 НОВЫЙ КЛЮЧ ДЛИТЕЛЬНОСТИ
    
    // Проверка необходимых env-переменных и данных
    if (!audioBase64 || !storage) {
        ctx.waitUntil(logDebug("SendAudio", `Отсутствует Base64 или KV-Storage.`, envData, ctx));
        throw new Error("Не удалось отправить аудио: нет данных или хранилища.");
    }
    
    // --- 1. СОХРАНЕНИЕ BASE64 ДАННЫХ (для повторного использования в /avatar) ---
    // Сохраняем MP3 Base64 под постоянным ключом.
    ctx.waitUntil(storage.put(BASE64_KEY, audioBase64, { expirationTtl: 86400 })); // Храним 24 часа
    
    // 2. ВРЕМЕННОЕ СОХРАНЕНИЕ BASE64 в KV для прокси
    //const tempKey = `temp_audio_${chatId}_${Date.now()}`;
    //const audioProxyUrl = `${envData.WORKER_DOMAIN}/audio_proxy?key=${tempKey}&type=${encodeURIComponent(mimeType)}`;
    
    // Устанавливаем короткий TTL для временного ключа
    //await storage.put(tempKey, audioBase64, { expirationTtl: 300 }); 
    
    // 3. Отправляем запрос в Telegram, используя метод "по URL"
    const apiUrl = `https://api.telegram.org/bot${token}/sendAudio`; 

    // Превращаем Base64 сразу в байты
    const audioBuffer = base64ToArrayBuffer(audioBase64); 
    
    const formData = new FormData();
    formData.append('chat_id', chatId.toString());
    // Создаем Blob из байтов
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    formData.append('audio', audioBlob, 'voice.mp3');
    formData.append('caption', '🔊 Ответ AI');

    const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData, // Передаем FormData, а не JSON
        //headers: { 'Content-Type': 'application/json' },
        /*body: JSON.stringify({
            chat_id: chatId.toString(),
            audio: audioProxyUrl,
            mime_type: finalMimeType, 
            caption: '🔊 Ответ AI'
        }),*/
        signal: AbortSignal.timeout(60000)
    });

    const responseText = await response.text();
    let responseData = {};
    try { responseData = JSON.parse(responseText); } catch(e) { /* Не JSON */ }

    if (!response.ok || !responseData.ok) {
        ctx.waitUntil(logDebug("SendAudio", `Ошибка Telegram API: ${responseData.description || 'Неизвестная ошибка при отправке аудио.'}`, envData, ctx));
        throw new Error(`Telegram API Error: ${responseData.description || 'Неизвестная ошибка при отправке аудио.'}`);
    }
    
    // --- 4. ПОЛУЧЕНИЕ И СОХРАНЕНИЕ ПУБЛИЧНОГО URL ---
    const audioResult = responseData?.result?.audio;
    const fileId = responseData?.result?.audio?.file_id;
    const duration = audioResult?.duration; // 🔥 ИЗВЛЕКАЕМ ДЛИТЕЛЬНОСТЬ ИЗ ОТВЕТА

    if (fileId) {
        // ✅ 4.1. СОХРАНЯЕМ ПОСТОЯННЫЙ file_id (для надежной повторной отправки)
        ctx.waitUntil(storage.put(FILE_ID_KEY, fileId, { expirationTtl: 86400 })); // Храним 24 часа
        ctx.waitUntil(logDebug("SendAudio", `Сохранен file_id: ${fileId}`, envData, ctx));
                    
        // Получаем file_path, используя file_id
        const fileInfoResponse = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
        const fileInfoData = await fileInfoResponse.json();
        const filePath = fileInfoData?.result?.file_path;

        // 🔥 4.2. СОХРАНЯЕМ ДЛИТЕЛЬНОСТЬ (ВАЖНО ДЛЯ A2V-ЦЕНЫ!)
        if (duration && duration > 0) {
                ctx.waitUntil(storage.put(DURATION_KEY, duration.toString(), { expirationTtl: 86400 }));
                ctx.waitUntil(logDebug("SendAudio", `Сохранена длительность: ${duration} сек.`, envData, ctx));
            } else {
                // Если длительность не получена, сохраняем 0 или 1
                ctx.waitUntil(storage.put(DURATION_KEY, '1', { expirationTtl: 86400 }));
            }

        if (filePath) {
            const publicUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
            
            // 4.3. Сохраняем публичный URL (ОПЦИОНАЛЬНО, для /avatar или прокси)
            ctx.waitUntil(storage.put(URL_KEY, publicUrl, { expirationTtl: 86400 })); // Храним 24 часа
            ctx.waitUntil(logDebug("SendAudio", `Сохранен публичный URL: ${publicUrl}`, envData, ctx));
        }
    }
     
    // 5. Очистка временного ключа
    //ctx.waitUntil(storage.delete(tempKey));

    return responseData;
}

// --- НЕДОСТАЮЩИЕ KV-ХЕЛПЕРЫ ---
async function savePollData(chatId, data, LAST_PHOTO_STORAGE) {
    await LAST_PHOTO_STORAGE.put(chatId.toString(), JSON.stringify(data), { expirationTtl: 3600 });
}

async function getPollData(chatId, LAST_PHOTO_STORAGE) {
    const data = await LAST_PHOTO_STORAGE.get(chatId.toString());
    return data ? JSON.parse(data) : null;
}

// КНОПКИ С ЭМОДЗИ СНИЗУ
// ✅ getMainReplyKeyboard - Добавьте это в ваши вспомогательные функции
function getMainReplyKeyboard() {
    return {
        keyboard: [
            // Основные команды
            [{text: "🏠"},{text: "💰"},{text: "✏️"},{text: "🎨"},{text: "✨"},{text: "🎬"},{text: "💾"}],
        ],
        resize_keyboard: true 
    };
}

// ✅ getCancelReplyKeyboard - Добавьте это в ваши вспомогательные функции
function getCancelReplyKeyboard() {
    return {
        keyboard: [
            [{ text: "❌ Отменить ввод" }]
        ],
        one_time_keyboard: true,
        resize_keyboard: true 
    };
}

// ✅ getSelectOrCancelReplyKeyboard - Предлагает выбрать ID через кнопку или отменить действие
function getSelectOrCancelReplyKeyboard() {
    return {
        keyboard: [
            [{ 
                text: "👤 Выбрать пользователя из списка", 
                request_user: {
                    request_id: 100,
                    user_is_bot: false 
                }
            }],
            { text: "❌ Отменить ввод" } // При нажатии отправится текст "❌ Отменить ввод"
        ],
        // one_time_keyboard: false - оставьте false, чтобы клавиатура не пропадала сразу
        one_time_keyboard: false, 
        resize_keyboard: true 
    };
}

// ✅ getReplyKeyboardForUserSelection - Генерирует Reply Keyboard для выбора пользователя
function getReplyKeyboardForUserSelection() {
    return {
        keyboard: [
            [{ 
                text: "👤 Нажмите для выбора пользователя", 
                request_user: {
                    request_id: 99, 
                    user_is_bot: false 
                }
            }]
        ],
        one_time_keyboard: true, // Скрыть клавиатуру после использования
        resize_keyboard: true 
    };
}

/**
 * Скрывает Reply Keyboard и запускает логику обновления Inline-меню пользователя.
 * @param {number} adminChatId
 * @param {string} token
 * @param {Object} envData
 * @param {Object} ctx
 * @param {string} confirmMessage - Сообщение, подтверждающее действие.
 */
async function hideReplyKeyboardAndRefreshMenu(adminChatId, token, envData, ctx, confirmMessage) {
    // 1. Скрываем Reply Keyboard
    ctx.waitUntil(sendMessage(adminChatId, confirmMessage, token, {
        reply_markup: { hide_keyboard: true }
    }));

    // 2. Обновляем Inline Menu через колбэк admin_user_menu
    // Мы создаем фейковый объект callback для вызова handleAdminCallback
    const fakeCallback = {
        data: 'admin_user_menu',
        message: {
            // Здесь нужен message_id оригинального Inline-сообщения. 
            // Поскольку он не хранится, нам придется отправить НОВОЕ меню.
            // Если вы храните ID оригинального сообщения, используйте его здесь!
            message_id: 0 
        }
    };
    
    // Временно, если ID сообщения не хранится: вызываем handleAdminCallback для генерации нового меню
    ctx.waitUntil(handleAdminCallback(adminChatId, fakeCallback, envData, ctx));
}

// ✅ generateAdminMessage (ФИНАЛЬНАЯ ВЕРСИЯ С ТАБЛИЧКОЙ МОДЕЛЕЙ)
async function generateAdminMessage(currentEnvData, kieAiBalance, BothubBalance) { // <-- ИСПРАВЛЕНО: ДОБАВЛЕНО async
    const ADMIN_CHAT_ID = currentEnvData.ADMIN_CHAT_ID;
    const debugStatus = currentEnvData.DEBUG_ENABLED ? '✅ ВКЛЮЧЕНА' : '❌ ВЫКЛЮЧЕНА';
    const photoStatus = currentEnvData.PHOTO_ENABLED ? '✅ ВКЛЮЧЕНО' : '❌ ВЫКЛЮЧЕНО';
    const videoStatus = currentEnvData.VIDEO_ENABLED ? '✅ ВКЛЮЧЕНО' : '❌ ВЫКЛЮЧЕНО';
    const ttsStatus = currentEnvData.TTS_ENABLED ? '✅ ВКЛЮЧЕН' : '❌ ВЫКЛЮЧЕН';
    
    // 2. Получаем баланс Stars (ИЗ TELEGRAM API)
    const starBalanceResult = await getMyStarBalance(currentEnvData.TELEGRAM_BOT_TOKEN);
    let starBalance = starBalanceResult.success ? starBalanceResult.balance : 'Недоступен';
    if (starBalanceResult.success) {
    starBalance = starBalanceResult.balance;
    }
    // --- 1. ПРИМЕНЕНИЕ СКЛОНЕНИЯ ---
    const starWord = pluralize(starBalance, STAR_FORMS); // Падеж для звёзд
    // 💡 ДОБАВЛЕНО: Таблица активных моделей (функция generateModelStatusTable должна существовать)
    const modelStatusTable = generateModelStatusTable(currentEnvData); 
    
    return `
⚙️ **АДМИН-ПАНЕЛЬ**

🆔 **Админ ID:** \`${ADMIN_CHAT_ID}\`

💰 **Платные сервисы:**
\`TELEGRAM\` : ⭐️ **${starBalance}** ${starWord}
KIE.AI : **${kieAiBalance}**
BotHub.ru : ${BothubBalance}

Доступность опций:
**Отладка:** ${debugStatus}
**Голос:** ${ttsStatus}
**Фото:**  ${photoStatus}
**Видео:** ${videoStatus}

🚀 **Версия:** ${VERSION}
    `;
}

// ✅ generateUniqueToken - Создает уникальный хеш на основе ID
async function generateUniqueToken(chatId, secretKey) {
    const encoder = new TextEncoder();
    const data = encoder.encode(chatId.toString() + secretKey); // Добавляем секретный ключ для надежности

    // Используем SHA-256 для хеширования
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Преобразуем Buffer в строку (Base64 URL)
    const base64Url = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    // Берем первые 10 символов для удобства
    return base64Url.substring(0, 10);
}

// ✅ sendPhotoByUrl - НОВАЯ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ОТПРАВКИ ИЗОБРАЖЕНИЙ ПО URL
// @description Получает изображение по URL, конвертирует в ArrayBuffer и отправляет через sendPhotoWithCaption.
async function sendPhotoByUrl(chatId, url, token, caption, envData) {
    try {
        const imageResponse = await fetch(url);
        if (!imageResponse.ok) {
            throw new Error(`Не удалось загрузить изображение по URL: ${url} (Status: ${imageResponse.status})`);
        }
        // Получаем ArrayBuffer из ответа
        const photoArrayBuffer = await imageResponse.arrayBuffer();
        
        // Используем существующую функцию: sendPhotoWithCaption
        // (Предполагается, что эта функция определена в worker.js)
        return await sendPhotoWithCaption(chatId, photoArrayBuffer, caption, token, envData);
    } catch (e) {
        console.error("Ошибка в sendPhotoByUrl:", e);
        // Отправляем пользователю сообщение об ошибке
        await sendMessage(chatId, `❌ **Ошибка:** Не удалось доставить фото по ссылке. ${url.substring(0, 50)}...`, token);
    }
}

// ✅ sendPhotoWithCaption - Отправка фото через ArrayBuffer (ФИНАЛЬНЫЙ ВАРИАНТ С КНОПКОЙ) ***
/**
 * Отправляет изображение в Telegram, используя ArrayBuffer, 
 * и добавляет инлайн-кнопку "Установить как исходник".
 * * @param {number} chatId - ID чата.
 * @param {ArrayBuffer} photoArrayBuffer - Бинарные данные изображения (ArrayBuffer).
 * @param {string} caption - Подпись к фотографии.
 * @param {string} token - Токен Telegram Bot API.
 * @param {Object} envData - Объект окружения (содержит KV-биндинг, DEBUG_ENABLED и ctx).
 * @returns {Promise<Object>} Ответ от Telegram API (содержит file_id и message_id).
 */
async function sendPhotoWithCaption(chatId, photoArrayBuffer, caption, token, envData) {
    const TELEGRAM_PHOTO_MAX_SIZE = 10485760; // 10 MB в байтах
    const TELEGRAM_CAPTION_LIMIT = 1024;
    const SAFE_MAX_LENGTH = 990;
    const ELLIPSIS_SUFFIX = '...';
    const CALLBACK_TEMP_STORAGE = envData.LAST_PHOTO_STORAGE; 
    const CALLBACK_EXPIRATION_TTL = 3600;

    // --- ЛОГИКА ОБРЕЗКИ ---
    let finalCaption = caption;
    if (caption.length > SAFE_MAX_LENGTH) {
        const truncateLength = SAFE_MAX_LENGTH - ELLIPSIS_SUFFIX.length;
        finalCaption = caption.substring(0, truncateLength) + ELLIPSIS_SUFFIX;
        envData.ctx.waitUntil(logDebug("SendPhoto", `Подпись обрезана...`, envData));
    }

    if (!photoArrayBuffer || photoArrayBuffer.byteLength === 0) {
        envData.ctx.waitUntil(logDebug("SendPhoto", `Пустой ArrayBuffer изображения.`, envData));
        throw new Error("sendPhotoWithCaption: Пустой или невалидный ArrayBuffer изображения.");
    }

    //const apiUrl = `https://api.telegram.org/bot${token}/sendPhoto`;
    // =========================================================================
    // 🛑 ИСПРАВЛЕНИЕ: ДИНАМИЧЕСКИЙ ВЫБОР МЕТОДА
    // =========================================================================
    const isTooBig = photoArrayBuffer.byteLength > TELEGRAM_PHOTO_MAX_SIZE;
    const method = isTooBig ? 'sendDocument' : 'sendPhoto';
    const fileParamName = isTooBig ? 'document' : 'photo';
    const apiUrl = `https://api.telegram.org/bot${token}/${method}`;

    envData.ctx.waitUntil(logDebug("SendPhoto", `Выбран метод: ${method}. Размер фото (bytes): ${photoArrayBuffer.byteLength}. Chat ID: ${chatId}`, envData));
    // =========================================================================

    // 1. Конвертируем ArrayBuffer в Buffer
    const buffer = Buffer.from(photoArrayBuffer);

    envData.ctx.waitUntil(logDebug("SendPhoto", `Подготовка ручного multipart. Размер: ${photoArrayBuffer.byteLength} bytes. Метод: ${method}`, envData));

    // 2. Формируем multipart/form-data ВРУЧНУЮ
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const crlf = '\r\n';

    // Собираем текстовую часть
    let head = '';
    head += `--${boundary}${crlf}`;
    head += `Content-Disposition: form-data; name="chat_id"${crlf}${crlf}`;
    head += `${chatId}${crlf}`;

    if (finalCaption) {
        head += `--${boundary}${crlf}`;
        head += `Content-Disposition: form-data; name="caption"${crlf}${crlf}`;
        head += `${finalCaption}${crlf}`; // Если используешь MarkdownV2, тут должен быть уже экранированный текст
        
        head += `--${boundary}${crlf}`;
        head += `Content-Disposition: form-data; name="parse_mode"${crlf}${crlf}`;
        //head += `MarkdownV2${crlf}`; 
        head += `HTML${crlf}`; 
    }

    // Заголовок для самого файла
    head += `--${boundary}${crlf}`;
    head += `Content-Disposition: form-data; name="${fileParamName}"; filename="image.png"${crlf}`;
    head += `Content-Type: image/png${crlf}${crlf}`;

    const headBuffer = Buffer.from(head, 'utf-8');
    const tailBuffer = Buffer.from(`${crlf}--${boundary}--${crlf}`, 'utf-8');

    // Склеиваем всё в один бинарный массив
    const finalBody = Buffer.concat([headBuffer, buffer, tailBuffer]);

    envData.ctx.waitUntil(logDebug("SendPhoto", `Отправка в Telegram. Метод: ${method}, Файл: ${fileParamName}, Chat ID: ${chatId}`, envData));

    // --- 1. ОТПРАВКА ФОТО ---
    let response;
    try {
        response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': finalBody.length.toString()
            },
            body: finalBody
        });
    } catch (e) {
        envData.ctx.waitUntil(logDebug("SendPhoto", `Ошибка Fetch: ${e.message}`, envData));
        throw new Error(`Сетевая ошибка: ${e.message}`);
    }

    const responseText = await response.text();
    let responseData = {};
    try { responseData = JSON.parse(responseText); } catch(e) { /* не JSON */ }

    if (!response.ok || !responseData.ok) {
        envData.ctx.waitUntil(logDebug("SendPhoto", `Ошибка Telegram API. Status: ${response.status}. Ответ: ${responseText.substring(0, 1000)}`, envData));
        throw new Error(`Telegram API Error: ${responseData.description || 'Неизвестная ошибка при отправке фото.'}`);
    }

    envData.ctx.waitUntil(logDebug("SendPhoto", `Ответ Telegram. Status: ${response.status}. Ok: ${responseData.ok}. Результат: Успех`, envData));

    // =========================================================================
    // 2. БЛОК ДОБАВЛЕНИЯ ИНЛАЙН-КНОПКИ (С использованием KV для обхода лимита 64 байт)
    // =========================================================================
    try {
        const messageId = responseData.result.message_id;
        
        // Получаем file_id (элемент массива photo с максимальным resolution)
        // Получаем photoObject, который содержит width и height:
        const photoArray = responseData.result.photo;
        const photoObject = photoArray.length > 0 ? photoArray.slice(-1)[0] : null; 
        const fileId = photoObject ? photoObject.file_id : null; 

               
        if (!fileId) {
            envData.ctx.waitUntil(logDebug("SendPhoto", `Кнопка: file_id не найден.`, envData));
            return responseData; 
        }
        // 🛑 ШАГ 1: Генерируем короткий ключ и сохраняем fileId в KV
        const shortCallbackKey = generateShortId(); 
        const KV_KEY = `callback_${chatId}_${shortCallbackKey}`; 
        // Убедимся, что photoObject существует
        if (!photoObject || !fileId) {
            envData.ctx.waitUntil(logDebug("SendPhoto", `Кнопка: file_id или photoObject не найден.`, envData));
            return responseData; 
        }
        // 🛑 ШАГ 2: Сохраняем начальное состояние (fileId + rotation + размеры)
        const rotationState = {
            fileId: fileId,
            rotation: 0, // Начальный угол поворота
            // 🔥 ДОБАВЛЯЕМ ШИРИНУ И ВЫСОТУ!
            width: photoObject.width || null, 
            height: photoObject.height || null,
        };

        await CALLBACK_TEMP_STORAGE.put(KV_KEY, JSON.stringify(rotationState), { expirationTtl: CALLBACK_EXPIRATION_TTL });

        // 🛑 ШАГ 3: Формируем callback_data только с коротким ключом
        const inlineKeyboard = {
            inline_keyboard: [
                // Кнопки поворота используют короткий ключ
                [                    
                    { text: "↪️ 90° влево", callback_data: `${ROTATE_LEFT_CALLBACK}${shortCallbackKey}` },
                    { text: "🔃 180° поворот", callback_data: `${ROTATE_180_CALLBACK}${shortCallbackKey}` },
                    { text: "↩️ 90° вправо", callback_data: `${ROTATE_RIGHT_CALLBACK}${shortCallbackKey}` }
                ],
                [{ text: "🖼️ Заменить загруженную фотографию этой", callback_data: `${SET_BASE_CALLBACK}${shortCallbackKey}`}]
            ]
        };
        
        // 🛑 ШАГ 3: Отправляем запрос на редактирование (только клавиатура)
        const editResponse = await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                reply_markup: inlineKeyboard
            }),
            signal: AbortSignal.timeout(10000)
        });

        const editResponseText = await editResponse.text();
        let editResponseData = {};
        try { editResponseData = JSON.parse(editResponseText); } catch(e) { /* не JSON */ }

        if (!editResponse.ok || !editResponseData.ok) {
            envData.ctx.waitUntil(logDebug("SendPhoto", `❌ Ошибка Telegram при добавлении кнопки: ${editResponseData.description || editResponseText.substring(0, 100)}`, envData));
        } else {
            envData.ctx.waitUntil(logDebug("SendPhoto", `Кнопка успешно добавлена.`, envData));
        }
        
    } catch (e) {
        envData.ctx.waitUntil(logDebug("SendPhoto", `Критическая ошибка при добавлении кнопки: ${e.message.substring(0, 100)}`, envData));
    }
    
    return responseData;
}

// ФУНКЦИИ ОПЛАТЫ ЧЕРЕЗ ЗВЁЗДЫ ТЕЛЕГРАММ
/**
 * Отправляет инвойс для оплаты Звездами.
 * @param {number} chatId - ID чата.
 * @param {number} starsAmount - Стоимость в звездах.
 * @param {string} title - Заголовок товара.
 * @param {string} description - Описание.
 * @param {string} payload - Внутренний ID транзакции (например, 'credits_50').
 * @param {string} token - Токен бота.
 */
async function sendStarsInvoice(chatId, starsAmount, title, description, payload, token) {
    const url = `https://api.telegram.org/bot${token}/sendInvoice`;
    const cdn = "https://storage.yandexcloud.net/leshiy-storage-images";
    const INVOICE_PHOTO_URL = `${cdn}/qr-code_geminiai_tg_bot.jpg`;

    const body = {
        chat_id: chatId,
        title: title,
        description: description,
        payload: payload, // Уникальная строка для идентификации покупки
        currency: "XTR",  // ВАЖНО: Валюта для Звезд
        prices: [{ label: "Цена", amount: starsAmount }], // amount для XTR - это целое число звезд
        provider_token: "", // Для Stars оставляем пустым!
        is_flexible: false,
        // 🟢 ОБЯЗАТЕЛЬНО ДЛЯ STARS!
        photo_url: INVOICE_PHOTO_URL, 
        photo_width: 300, 
        photo_height: 300
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errText = await response.text();
            console.error("Invoice Error:", errText);
        }
    } catch (e) {
        console.error("Network Error sending invoice:", e);
    }
}

/**
 * Подтверждает готовность принять оплату (Pre-Checkout).
 * @param {string} queryId - ID запроса pre_checkout_query.
 * @param {string} token - Токен бота.
 */
async function answerPreCheckoutQuery(queryId, token) {
    const url = `https://api.telegram.org/bot${token}/answerPreCheckoutQuery`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pre_checkout_query_id: queryId,
                ok: true 
            })
        });

        // !!! КРИТИЧНОЕ ДОБАВЛЕНИЕ: Логирование результата
        if (!response.ok) {
            const errText = await response.text();
            console.error(`FATAL: answerPreCheckoutQuery API Error. Статус: ${response.status}. Ответ: ${errText}`);
        } else {
             console.log(`SUCCESS: answerPreCheckoutQuery ${queryId} выполнено. OK: true`);
        }
        
    } catch (e) {
        // !!! ЛОВИМ СЕТЕВУЮ ОШИБКУ/ТАЙМАУТ
        console.error(`FATAL: answerPreCheckoutQuery NETWORK/CRASH Error: ${e.message}`);
    }
}

async function sendBuyMenu(chatId, token) {
    const keyboard = [];
    
    // Генерируем кнопки для каждого пакета
    STARS_PACKAGES.forEach(pkg => {
        keyboard.push([{
            text: `⭐️ ${pkg.stars} XTR ➔ 💰 ${pkg.credits} Кредитов`,
            callback_data: `buy_stars:${pkg.stars}:${pkg.credits}`
        }]);
    });
    
    // Кнопка Назад
    keyboard.push([{ text: "🔙 Назад в меню", callback_data: "start_command" }]);

    await sendMessageWithKeyboard(
        chatId, 
        "⭐️ **Пополнение баланса Звёздами Telegram**\n\nВыберите пакет пополнения. Оплата спишется с вашего счета Telegram Stars.",
        token,
        keyboard
    );
}

/**
 * Получает текущий баланс Telegram Stars бота.
 */
async function getMyStarBalance(token) {
    const url = `https://api.telegram.org/bot${token}/getMyStarBalance`;
    try {
        const response = await fetch(url);
        const result = await response.json();
        
        // --- КРИТИЧЕСКИ ВАЖНЫЙ ЛОГ ДЛЯ ДИАГНОСТИКИ ---
        console.log(`DIAGNOSTIC_STAR_JSON: ${JSON.stringify(result)}`);
        // ---------------------------------------------

        if (response.ok && result.ok) {
            // Пытаемся получить баланс из result.result.stars (как ожидается)
            const balance = result.result.amount;
            console.log(`DIAGNOSTIC_SUCCESS_FINAL: getMyStarBalance. Баланс: ${balance}`);
            return { success: true, balance: balance };
        } else {
            const errorMessage = result.description || `HTTP Status: ${response.status}`;
            console.error(`DIAGNOSTIC_FATAL: getMyStarBalance API Error: ${errorMessage}`);
            return { success: false, error: errorMessage };
        }
    } catch (e) {
        console.error(`DIAGNOSTIC_FATAL: getMyStarBalance NETWORK/CRASH Error: ${e.message}`);
        return { success: false, error: `Сетевая ошибка: ${e.message}` };
    }
}

async function rejectPreCheckoutQuery(queryId, token, errorMessage) {
    const url = `https://api.telegram.org/bot${token}/answerPreCheckoutQuery`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            pre_checkout_query_id: queryId, 
            ok: false, // Отмена!
            error_message: errorMessage 
        })
    });
}

// --- ФУНКЦИИ ДЛЯ ИСТОРИИ ОПЕРАЦИЙ ---

/**
 * @description Логирует транзакцию (покупку или расход) в KV-хранилище.
 * @param {number} userId - ID пользователя.
 * @param {string} type - Тип транзакции ('TOPUP', 'USAGE', 'FREE').
 * @param {number} amount - Количество кредитов (всегда положительное).
 * @param {string} description - Описание операции.
 * @param {object} env - Объект среды Cloudflare (для доступа к LAST_PHOTO_STORAGE).
 */
async function logTransaction(userId, type, amount, description, env) {
    const HISTORY_KEY = userId.toString() + '_history';
    const MAX_HISTORY_ITEMS = 50; // Храним не более 50 последних операций
    const storage = env.LAST_PHOTO_STORAGE;
    
    try {
        let historyStr = await storage.get(HISTORY_KEY);
        let history = historyStr ? JSON.parse(historyStr) : [];
    
        const transaction = {
            t: Date.now(), // timestamp
            y: type, 
            a: amount, 
            d: description
        };
    
        history.push(transaction);
    
        // Ограничиваем историю 50 последними записями
        if (history.length > MAX_HISTORY_ITEMS) {
            history = history.slice(-MAX_HISTORY_ITEMS);
        }
    
        await storage.put(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error(`Error logging transaction for user ${userId}: ${e.message}`);
    }
}

/**
 * @description Получает и форматирует историю транзакций пользователя.
 * @param {number} userId - ID пользователя.
 * @param {object} env - Объект среды Cloudflare (для доступа к LAST_PHOTO_STORAGE).
 * @returns {Promise<string>} Отформатированная строка для вывода в чат.
 */
async function getFormattedHistory(userId, env) {
    const HISTORY_KEY = userId.toString() + '_history';
    const storage = env.LAST_PHOTO_STORAGE;

    let historyStr = await storage.get(HISTORY_KEY);
    let history = historyStr ? JSON.parse(historyStr) : [];

    if (history.length === 0) {
        return "Ваша история операций пуста. Совершите первую покупку или используйте бесплатные кредиты!";
    }

    // Сортируем по времени в обратном порядке (самые новые сверху)
    history.sort((a, b) => b.t - a.t);

    const formattedLines = history.map(tx => {
        const date = new Date(tx.t).toLocaleDateString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        let icon = '▪️';
        let sign = '';
        
        switch (tx.y) {
            case 'TOPUP': // Покупка
                icon = '⬆️';
                sign = '+';
                break;
            case 'USAGE': // Расход
                icon = '⬇️';
                sign = '-';
                break;
            case 'FREE': // Бесплатные/Бонусные
                icon = '🎁';
                sign = '+';
                break;
            default:
                break;
        }

        // Пример: ⬆️ 01.12 20:11: Покупка за 1 XTR (+2 кр.)
        return `${icon} ${date}: ${tx.d} (${sign}${tx.a} кр.)`;
    });

    // Возвращаем до 20 последних операций
    return formattedLines.slice(0, 20).join('\n');
}

// ----------------------------------------------------
// II. ФУНКЦИИ ВЫЗОВА API
// ----------------------------------------------------

// ✅ *** 2.1. Gemini Vision (Промпт) - ИСПРАВЛЕНО ***
/**
 * Генерирует промпт для Image-to-Image, используя Gemini.
 * @param {Object} config - Объект активной конфигурации (AI_MODELS.IMAGE_TO_TEXT_GEMINI).
 * @param {ArrayBuffer} imageBuffer - Буфер изображения (будет преобразован в Base64).
 * @param {Object} envData - Объект окружения, содержащий ключ.
 * @returns {Promise<string>} Сгенерированный текстовый промпт.
 */
async function callGeminiVision(config, imageBuffer, envData) { 
    
    // --- ДИНАМИЧЕСКИЕ ПАРАМЕТРЫ ИЗ КОНФИГУРАЦИИ ---
    const API_KEY_ENV_NAME = config.API_KEY; 
    const API_KEY = envData[API_KEY_ENV_NAME]; 
    const BASE_URL = config.BASE_URL; 
    const MODEL = config.MODEL; 
    
    // Сборка универсального URL
    const url = `${BASE_URL}/models/${MODEL}:generateContent`; 
    // ------------------------------------

    if (!API_KEY) {
        throw new Error(`Gemini API key is missing. Expected env var: ${API_KEY_ENV_NAME}`);
    }

    // ТРЕБУЕТСЯ КОНВЕРТАЦИЯ: Base64 для Gemini.
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    const systemInstructionText = "РОЛЬ И ЯЗЫК: Действуй как 'Фотореставратор'. Общение СТРОГО на РУССКОМ языке. ЦЕЛЬ: Создать максимально детализированный, буквальный промпт для Image-to-Image генерации. Твой ответ должен быть только промптом, без приветствий и объяснений.";
    
    const body = {
        // Здесь используется ваша рабочая структура
        systemInstruction: { parts: [{ text: systemInstructionText }] }, 
        contents: [{
            parts: [
                { text: "На основе присланного изображения, сгенерируй ОЧЕНЬ ПОДРОБНЫЙ, но не более 750 символов, точный и буквальный промпт на РУССКОМ языке для нейросети для генерации изображения. ТОЧНО ВОСПРОИЗВЕДИ сцену, но в высоком разрешении и цвете. Используй слово 'ребенок' вместо 'малыш' или 'младенец'. НЕ УПОМИНАЙ 'пустышка', если это возможно, или замени на нейтральный термин вроде 'аксессуар для рта'. Сохрани СТРОГО ту же КОМПОЗИЦИЮ и ракурс. Используй художественный стиль 'фотореалистичная иллюстрация' или 'картина' вместо 'фотография'. Добавь в конец промпта суффиксы для качества: 'высокая детализация, шедевр, студийное освещение'." },
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
            ]
        }],
        // !!! ОШИБКА ИСПРАВЛЕНА: config: {} удалено, т.к. вызывает ошибку Gemini API.
    };
    
    /*const response = await fetch(`${url}?key=${API_KEY}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });*/

    const fullUrl = `${url}?key=${API_KEY}`;
    const response = await sendAiRequest(body, fullUrl, config, envData, true);
    const data = await response.json();
    if (data.error) { throw new Error(`Gemini API Error: ${data.error.message}`); }
    const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) { throw new Error("Gemini не вернул промт."); }
    return textResult.trim();
}

/**
 * Выполняет анализ видеоконтента (Video Captioning) с помощью Gemini 2.5 Flash.
 * @param {Object} config - Объект активной конфигурации (AI_MODELS.VIDEO_TO_ANALYSIS_GEMINI).
 * @param {ArrayBuffer} videoBuffer - Буфер видеофайла.
 * @param {string} mimeType - MIME-тип видео (напр., 'video/mp4').
 * @param {Object} envData - Объект окружения, содержащий ключ.
 * @returns {Promise<string>} Сгенерированный текстовый анализ.
 */
async function callGeminiVideoVision(config, videoBuffer, mimeType, envData) { 
    
    // --- ДИНАМИЧЕСКИЕ ПАРАМЕТРЫ ИЗ КОНФИГУРАЦИИ ---
    const API_KEY_ENV_NAME = config.API_KEY; 
    const API_KEY = envData[API_KEY_ENV_NAME]; 
    const BASE_URL = config.BASE_URL; 
    const MODEL = config.MODEL; 
    
    const url = `${BASE_URL}/models/${MODEL}:generateContent`; 
    // ------------------------------------

    if (!API_KEY) {
        throw new Error(`Gemini API key is missing. Expected env var: ${API_KEY_ENV_NAME}`);
    }
    
    // ТРЕБУЕТСЯ КОНВЕРТАЦИЯ: Base64 для Gemini.
    // P.S. Убедитесь, что arrayBufferToBase64 доступна
    const videoBase64 = arrayBufferToBase64(videoBuffer); 

    const systemInstructionText = "РОЛЬ: Действуй как 'Видеоаналитик'. Общение СТРОГО на РУССКОМ языке. ЦЕЛЬ: Предоставить подробный и точный анализ видеоконтента, включая ключевые действия, объекты и события. Твой ответ должен быть только анализом, без приветствий и объяснений.";
    
    const promptText = "Проанализируй видеоролик покадрово и аудиодорожку. Предоставь полное описание происходящего, включая распознавание действий, ключевых объектов и хронометраж. Отдельно опиши содержание аудиодорожки, включая точную транскрипцию и возможный контекст (цитаты, источники). Ответь только текстом анализа, используя четкую структуру";

    const body = {
        systemInstruction: { parts: [{ text: systemInstructionText }] }, 
        contents: [{
            parts: [
                { text: promptText },
                { inlineData: { mimeType: mimeType, data: videoBase64 } } // <-- Используем mimeType видео
            ]
        }],
    };
    
    /*const response = await fetch(`${url}?key=${API_KEY}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });*/
    
    const fullUrl = `${url}?key=${API_KEY}`;
    const response = await sendAiRequest(body, fullUrl, config, envData, true);
    const data = await response.json();
    if (data.error) { throw new Error(`Gemini API Error: ${data.error.message}`); }
    const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) { throw new Error("Gemini не вернул результат анализа видео."); }
    return textResult.trim();
}

// ✅ *** 2.2. Gemini Chat API (для текстового общения) ***
/**
 * Вызывает модель Gemini через Google Generative Language API, используя унифицированную конфигурацию.
 * @param {Object} config - Объект активной конфигурации (AI_MODELS.TEXT_TO_TEXT_GEMINI).
 * @param {Array<Object>} chatHistory - История чата в формате { role: 'user' | 'model', text: string }.
 * @param {string} userMessageText - Текущее сообщение пользователя.
 * @param {Object} envData - Объект окружения Cloudflare Worker, содержащий ключ.
 * @returns {Promise<string>} Сгенерированный текстовый ответ.
 */
async function callGeminiChat(config, chatHistory, userMessageText, envData) {
    
    // --- ДИНАМИЧЕСКИЕ ПАРАМЕТРЫ ИЗ КОНФИГУРАЦИИ ---
    const API_KEY_ENV_NAME = config.API_KEY; 
    const API_KEY = envData[API_KEY_ENV_NAME]; 
    const BASE_URL = config.BASE_URL;
    const MODEL = config.MODEL;

    // --- УНИФИЦИРОВАННАЯ СБОРКА URL ---
    // Формат: BASE_URL/models/МОДЕЛЬ:generateContent?key=КЛЮЧ
    const url = `${BASE_URL}/models/${MODEL}:generateContent?key=${API_KEY}`;
    // ------------------------------------

    const PAYMENT_LINK = "https://boosty.to/leshiyalex/single-payment/donation/754164/target?share=target_link";

    if (!API_KEY) {
        throw new Error(`Gemini API key is missing. Expected env var: ${API_KEY_ENV_NAME}`);
    }

    // 1. Преобразуем историю в формат Gemini Content
    const contents = chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    // Добавляем текущее сообщение пользователя
    contents.push({ role: 'user', parts: [{ text: userMessageText }] });

    // 2. СИСТЕМНАЯ ИНСТРУКЦИЯ 
    const systemInstructionText = `
Ты — многофункциональный AI-ассистент "Gemini AI" от Leshiy, отвечающий на русском языке.
Твои ключевые функции:
1. Платные функции: Улучшение фото и создание видео. Бесплатно ${FREE_LIMIT} кредитов, далее по тарифам (1 Кредит = ${CREDIT_COST_RUB} руб.).
2. Генерация контента: Ты создаешь новые изображения по текстовым промптам (команда /create) бесплатно и без ограничений.
3. Распознавание речи: Ты транскрибируешь голосовые сообщения пользователя в текст, который затем обрабатываешь.
4. Распознавание аудио и видеофайлов - ты транскрибируешь и аудио в формате mp3 и видео в mp4 файлы в текст на русском языке.
5. Чат: Ты ведешь диалог, отвечаешь на вопросы и сохраняешь контекст беседы.

Когда пользователь спрашивает, что ты умеешь, обязательно упомяни о своих навыках работы с изображениями, видео и голосовыми сообщениями (транскрибацией), а также о командах /photo и /create.
Ответы должны быть информативными и доброжелательными.

${TARIFF_MESSAGE_TEXT}
`;
    // ТЕЛО ЗАПРОСА
    const body = {
        systemInstruction: {
            parts: [{ text: systemInstructionText }]
        },
        contents: contents
    };

    // Посылаем на отправку
    const response = await sendAiRequest(body, url, config, envData);
    const data = await response.json();
    const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResult) { throw new Error(`Gemini Chat не вернул ответ. Причина: ${JSON.stringify(data.promptFeedback)}`); }

    return textResult.trim();
}

// ✅ *** 2.3. callGeminiText2Image - Gemini Text-to-Image (via Gemini 2.5 Flash)
/**
 * @description Генерирует изображение (Text-to-Image) с помощью Gemini 2.5 Flash.
 * @param {Object} config - Объект конфигурации (TEXT_TO_IMAGE_GEMINI).
 * @param {string} prompt - Финальный промпт для генерации.
 * @param {Object} envData - Объект окружения.
 * @returns {Promise<ArrayBuffer>} Сгенерированное изображение в ArrayBuffer. // <-- ИСПРАВЛЕНО!
 */
async function callGeminiText2Image(config, prompt, envData) {
    // ⚠️ ВАЖНО: Удалены imageBase64, finalHeight, finalWidth, так как они не нужны для T2I
    
    // 1. Извлечение необходимых данных
    const apiKey = envData[config.API_KEY]; 
    const model = config.MODEL; 

    if (!apiKey) { throw new Error(`API Key для Gemini Image Generator (${config.API_KEY}) не настроен.`); }
    if (!prompt || prompt.length < 5) { throw new Error("Промпт для генерации слишком короткий."); }

    // ✅ КОРРЕКТНЫЙ URL: Используем :generateContent, как в вашем curl-тесте
    const url = `${config.BASE_URL}/models/${model}:generateContent?key=${apiKey}`; 

    // ✅ КОРРЕКТНЫЙ BODY ПО ИНСТРУКЦИИ
    const body = {
        "contents": [
            {
                "parts": [
                    { "text": prompt }
                ]
            }
        ],
        //"generationConfig": {
            // "responseModalities": ["IMAGE"], // Можно оставить, если модель 2.0+
            //"candidateCount": 1,
            //"responseMimeType": "image/png" // Обязательно для Imagen
        //}
    };

    try {
        /*const response = await fetch(url, { method: 'POST', headers: {
             'Content-Type': 'application/json'
        }, body: JSON.stringify(body) });

        if (!response.ok) {
            const errorText = await response.text();
            const errorMessage = `Gemini T2I API Error (${model}): ${response.status} - Response: ${errorText.substring(0, 150)}... | 🌐 Sent URL: ${url}`;
            throw new Error(errorMessage);
        }*/

        const response = await sendAiRequest(body, url, config, envData, true);
        const data = await response.json();
        
        if (data.error) { 
            throw new Error(`Gemini T2I Error (${model}): ${data.error.message} | 🌐 Sent URL: ${url}`); 
        }

        // 🖼️ ИЗВЛЕЧЕНИЕ РЕЗУЛЬТАТА: Та же структура, что и в чате/мультимодальном ответе
        const base64Image = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!base64Image) {
            const feedback = JSON.stringify(data.promptFeedback || data.error);
            throw new Error(`Gemini не вернул изображение (Base64). Ответ API: ${feedback.substring(0, 100)}... | 🌐 Sent URL: ${url}`);
        }

        // =========================================================================
        // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Конвертируем Base64 в ArrayBuffer перед возвратом
        // =========================================================================
        const uint8Array = base64ToUint8Array(base64Image);
        return uint8Array.buffer; // Возвращаем ArrayBuffer!

    } catch (e) {
        const originalMessage = e.message || 'Unknown API Error';
        if (originalMessage.includes('Sent URL')) {
             throw e;
        }
        throw new Error(`Gemini T2I API Error (${model}): ${originalMessage} | 🌐 Sent URL: ${url}`);
    }
}

// ✅ *** 2.4. Gemini Image Generator (Image + Text-to-Image) - ИСПРАВЛЕНО ДЛЯ ArrayBuffer ***
/**
 * @description Генерирует изображение (Image-to-Image) с Gemini/Imagen.
 * @param {Object} config - Объект конфигурации (IMAGE_TO_IMAGE_GEMINI).
 * @param {string} prompt - Финальный промпт для генерации.
 * @param {string} imageBase64 - Исходное изображение в Base64 (для I2I).
 * @param {Object} envData - Объект окружения.
 * @param {number} finalHeight - Ожидаемая высота.
 * @param {number} finalWidth - Ожидаемая ширина.
 * @returns {Promise<ArrayBuffer>} Сгенерированное изображение в ArrayBuffer. // <-- ИСПРАВЛЕНО ЗДЕСЬ!
 */
async function callGeminiImage2Image(config, prompt, imageBase64, envData, finalHeight, finalWidth) {
    // 1. Извлечение необходимых данных
    const apiKey = envData[config.API_KEY]; // Ключ из envData через имя ключа из config
    const model = config.MODEL; 

    if (!apiKey) { throw new Error(`API Key для Gemini Image Generator (${config.API_KEY}) не настроен.`); }
    if (!imageBase64 || imageBase64.length < 100) { throw new Error("Исходное изображение в Base64 отсутствует или слишком короткое для Gemini Image Generator."); }

    const url = `${config.BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

    // Дублирующая проверка (можно удалить, но оставлю для безопасности)
    if (!imageBase64 || imageBase64.length < 100) { throw new Error("Исходное изображение в Base64 отсутствует или слишком короткое для Gemini Image Generator."); }
    const mimeType = 'image/jpeg';

    const body = {
        "contents": [
            {
                "parts": [
                    { "text": prompt },
                    { "inlineData": { "mimeType": mimeType, "data": imageBase64 } }
                ]
            }
        ],
        "generationConfig": { "responseModalities": ["Image"] }
    };

    try {
        /*
        const response = await fetch(url, { method: 'POST', headers: {
            'Content-Type': 'application/json'
        }, body: JSON.stringify(body) });

        if (!response.ok) {
            const errorText = await response.text();
            
            // !!! ИСПРАВЛЕНО: Добавляем Sent URL в случае ошибки response.ok !!!
            const errorMessage = `Gemini Image API Error (${model}): ${response.status} - Response: ${errorText.substring(0, 150)}... | 🌐 Sent URL: ${url}`;
            throw new Error(errorMessage);
        }*/

        const response = await sendAiRequest(body, url, config, envData, true);
        const data = await response.json();
        
        if (data.error) { 
            // Добавляем Sent URL, если Google вернул ошибку в JSON-формате
            throw new Error(`Gemini Error (${model}): ${data.error.message} | 🌐 Sent URL: ${url}`); 
        }

        // !!! НОВАЯ ПРОВЕРКА НА БЛОКИРОВКУ !!!
        const safetyRatings = data.promptFeedback?.safetyRatings;
        if (safetyRatings && safetyRatings.some(r => r.probability !== 'NEGLIGIBLE')) {
            const blockedCategories = safetyRatings.filter(r => r.probability !== 'NEGLIGIBLE').map(r => r.category.split('_').pop()).join(', ');
            throw new Error(`Генерация заблокирована фильтрами безопасности Gemini. Категории: [${blockedCategories}].`);
        }
        // !!! КОНЕЦ ПРОВЕРКИ !!!

        const base64Image = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!base64Image) {
            // Если изображение не вернулось, но фильтры не сработали
            const feedback = JSON.stringify(data.promptFeedback || data.error);
            throw new Error(`Gemini не вернул изображение (Base64). Ответ API: ${feedback.substring(0, 100)}... | 🌐 Sent URL: ${url}`);
        }

        // =========================================================================
        // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Конвертируем Base64 в ArrayBuffer перед возвратом
        // =========================================================================
        const uint8Array = base64ToUint8Array(base64Image);
        return uint8Array.buffer; // Возвращаем ArrayBuffer, который ждет sendPhotoWithCaption

    } catch (e) {
        // !!! ИСПРАВЛЕНО: ГАРАНТИРОВАННО ДОБАВЛЯЕМ Sent URL в catch-блок !!!
        const originalMessage = e.message || 'Unknown API Error';
        
        if (originalMessage.includes('Sent URL')) {
             throw e;
        }

        throw new Error(`Gemini Image API Error (${model}): ${originalMessage} | 🌐 Sent URL: ${url}`);
    }
}

// ✅ *** 2.5. Gemini Speech-to-Text (STT - голосовое сообщение) - УНИФИЦИРОВАНО ***
/**
 * Транскрибирует аудиофайл (ArrayBuffer) через Gemini API.
 * @param {Object} config - Объект активной конфигурации (AI_MODELS.AUDIO_TO_TEXT_GEMINI).
 * @param {ArrayBuffer} audioBuffer - Буфер аудиофайла.
 * @param {Object} envData - Объект окружения, содержащий ключ.
 * @returns {Promise<string>} Транскрибированный текст.
 */
async function callGeminiSpeechToText(config, audioBuffer, envData) { // <-- УНИФИЦИРОВАННАЯ ПОДПИСЬ
    
    // --- ДИНАМИЧЕСКИЕ ПАРАМЕТРЫ ИЗ КОНФИГУРАЦИИ ---
    const API_KEY_ENV_NAME = config.API_KEY; 
    const API_KEY = envData[API_KEY_ENV_NAME]; 
    const BASE_URL = config.BASE_URL; 
    const MODEL = config.MODEL; 
    
    // Сборка универсального URL
    const url = `${BASE_URL}/models/${MODEL}:generateContent`; 
    // ------------------------------------

    if (!API_KEY) {
        throw new Error(`Gemini API key is missing. Expected env var: ${API_KEY_ENV_NAME}`);
    }
    
    // 1. КОНВЕРТАЦИЯ: ArrayBuffer в Base64
    const audioBase64 = arrayBufferToBase64(audioBuffer); 
    
    // 2. ОПРЕДЕЛЕНИЕ ТИПА: Для Telegram голосовые сообщения обычно OGG/opus.
    const mimeType = 'audio/ogg'; 

    const systemInstructionText = "РОЛЬ: Ты эксперт по распознаванию речи. ТВОЯ ЦЕЛЬ: Транскрибировать аудиофайл СТРОГО на РУССКОМ языке, возвращая ТОЛЬКО распознанный текст, без приветствий и объяснений.";

    const body = {
        system_instruction: { parts: [{ text: systemInstructionText }] },
        contents: [{
            parts: [
                { text: "Транскрибируй аудиозапись в текст. Верни только текст." },
                { inlineData: { mimeType: mimeType, data: audioBase64 } } // Используем конвертированный Base64 и mimeType
            ]
        }]
    };
    
    /*const response = await fetch(`${url}?key=${API_KEY}`, { // <-- УНИФИЦИРОВАННЫЙ URL И КЛЮЧ
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });*/

    const fullUrl = `${url}?key=${API_KEY}`; // <-- УНИФИЦИРОВАННЫЙ URL И КЛЮЧ
    const response = await sendAiRequest(body, fullUrl, config, envData, true);
    const data = await response.json();
    if (data.error) { throw new Error(`Gemini STT API Error: ${data.error.message}`); }
    const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResult) {
        throw new Error(`Gemini не вернул транскрипцию. Причина: ${JSON.stringify(data.promptFeedback)}`);
    }
    return textResult.trim();
}

// ✅ 2.6. Gemini Text-to-Audio Generator (TTS)
/**
 * @description Генерирует аудио из текста с помощью Gemini TTS, конвертируя PCM в MP3.
 * @param {Object} config - Объект конфигурации (AI_MODELS.TEXT_TO_AUDIO_GEMINI).
 * @param {string} text - Текст для озвучивания.
 * @param {Object} envData - Объект окружения, включая контекст ctx.
 * @param {string} requestedVoice - Запрошенный голос ('Male', 'Female').
 * @returns {Promise<{audioBase64: string, mimeType: string}>} Объект с аудио в Base64 и MIME Type (audio/mpeg).
 */
async function callGeminiTextToAudio(config, text, envData, requestedVoice) {
    // --- ДИНАМИЧЕСКИЕ ПАРАМЕТРЫ ИЗ КОНФИГУРАЦИИ ---
    const API_KEY_ENV_NAME = config.API_KEY; 
    const API_KEY = envData[API_KEY_ENV_NAME]; 
    const BASE_URL = config.BASE_URL; 
    const MODEL = config.MODEL; 
    
    // 🛑 ИСПОЛЬЗУЕМ ГЛОБАЛЬНЫЕ/ДОСТУПНЫЕ КОНСТАНТЫ (Male/Female)
    // Предполагаем, что VOICE_MALE = 'Male' и VOICE_FEMALE = 'Female'
    const VOICE_MALE_KEY = 'Male'; 
    const VOICE_FEMALE_KEY = 'Female'; 

    const GEMINI_VOICE_MAP = {
        [VOICE_FEMALE_KEY]: 'Kore',       // Женский голос Gemini (Kore)
        [VOICE_MALE_KEY]: 'Enceladus',    // Мужской голос Gemini (Enceladus)
    };
    
    // 💡 1. Динамический выбор имени голоса Gemini по 'Male' или 'Female'
    // Используем Female в качестве fallback
    const selectedVoiceName = GEMINI_VOICE_MAP[requestedVoice] || GEMINI_VOICE_MAP[VOICE_FEMALE_KEY];
    // Сборка универсального URL
    const url = `${BASE_URL}/models/${MODEL}:generateContent`; 
    // ------------------------------------
    
    if (!API_KEY) {
        throw new Error(`API Key для Gemini TTS (${config.API_KEY}) не настроен.`);
    }
    if (!text || text.length === 0) {
        throw new Error("Текст для озвучивания отсутствует.");
    }

    const body = {
        "generationConfig": { 
            "responseModalities": ["AUDIO"], 
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": selectedVoiceName // <-- ИСПОЛЬЗУЕМ ДИНАМИЧЕСКИЙ ГОЛОС
                    }
                }
            }
        },
        "contents": [{
            "parts": [{ "text": text }] 
        }],
        "model": MODEL, 
    };

    // 🛑 ДЕБАГ: ЛОГИРОВАНИЕ ТЕЛА ЗАПРОСА
    envData.ctx.waitUntil(logDebug("Gemini_TTS_REQUEST", `Отправка запроса. Голос: ${selectedVoiceName}. Body: ${JSON.stringify(body).substring(0, 500)}`, envData));

    try {
        // 1. ВЫЗОВ GEMINI API (получение Base64 PCM)
        /*const response = await fetch(`${url}?key=${API_KEY}`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(30000) // Таймаут на API
        });

        if (!response.ok) {
            const errorText = await response.text();
            envData.ctx.waitUntil(logDebug("Gemini_TTS", `HTTP Error ${response.status}. Response: ${errorText.substring(0, 500)}`, envData));
            throw new Error(`Gemini TTS API Error: ${response.status} - Response: ${errorText.substring(0, 150)}...`);
        }*/
        
        const fullUrl = `${url}?key=${API_KEY}`; // <-- УНИФИЦИРОВАННЫЙ URL И КЛЮЧ
        const response = await sendAiRequest(body, fullUrl, config, envData, true);
        const data = await response.json();

        // 2. ИЗВЛЕЧЕНИЕ BASE64
        const audioBase64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data; 
        
        if (!audioBase64 || audioBase64.length < 100) { 
            const finishReason = data?.candidates?.[0]?.finishReason;
            if (finishReason === 'SAFETY') {
                throw new Error(`🛑 ${MODEL}: Отказ в генерации аудио. Текст нарушает политику безопасности.`);
            }
            envData.ctx.waitUntil(logDebug("Gemini_TTS", `Не вернул audioBase64. Ответ: ${JSON.stringify(data).substring(0, 1000)}`, envData));
            throw new Error(`Gemini TTS не вернул аудио. Ответ API не содержит Base64-данных.`);
        }
        
        envData.ctx.waitUntil(logDebug("Gemini_TTS", `Успех. Получен PCM Base64 Length: ${audioBase64.length}`, envData));

        // 3. 🛑 КОНВЕРТАЦИЯ BASE64 В ARRAYBUFFER (для вашей функции PCM->MP3)
        const pcmBuffer = base64ToArrayBuffer(audioBase64);
        
        // 4. 🛑 ВЫЗОВ ВАШЕГО КОНВЕРТЕРА PCM -> MP3
        const mp3Buffer = await convertPcmToMp3(pcmBuffer, envData);
        
        if (!mp3Buffer) {
             envData.ctx.waitUntil(logDebug("Gemini_TTS_FINAL", `Конвертация PCM→MP3 завершилась неудачей.`, envData));
            throw new Error("Конвертация PCM→MP3 завершилась неудачей (проверьте логи конвертера).");
        }
        
        // 5. КОНВЕРТАЦИЯ MP3 ARRAYBUFFER В BASE64 (для унификации возврата)
        const mp3Base64 = arrayBufferToBase64(mp3Buffer);
        
        envData.ctx.waitUntil(logDebug("Gemini_TTS_FINAL", `Конвертация в MP3 завершена. MP3 Base64 Length: ${mp3Base64.length}`, envData));

        return { 
            audioBase64: mp3Base64, 
            mimeType: 'audio/mpeg' // Финальный MP3
        };
        
    } catch (e) {
        throw new Error(`Критическая ошибка Gemini TTS: ${e.message}`);
    }
}

// ✅ *** 2.7. Veo (Gemini API для видео) - ИСПРАВЛЕНО: ТОЛЬКО ЗАПУСК, БЕЗ POLLING! ***
// !!! ИЗМЕНЕНИЕ: Добавлен config и API_KEY_VALUE вместо GEMINI_API_KEY !!!
async function startGeminiVeoImageToVideo(config, prompt, imageBase64, imageMimeType, API_KEY_VALUE, chatId, DEBUG_CHAT_ID, TELEGRAM_BOT_TOKEN) {
    
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp|jpg);base64,/, "");

    // 🚨 ИСПРАВЛЕНИЕ: Динамическое формирование URL из BASE_URL и MODEL
    const startUrl = `${config.BASE_URL}/models/${config.MODEL}:predictLongRunning?key=${API_KEY_VALUE}`;

    const startBody = {
        "instances": [{
            "prompt": prompt,
            "image": {
                "bytesBase64Encoded": cleanBase64,
                "mimeType": imageMimeType
            }
        }],
    };

    const startResponse = await fetch(startUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(startBody),
    });

    let startData = {};
    const errorText = await startResponse.text();

    try {
        startData = JSON.parse(errorText);
    } catch (e) {
        // Если это не JSON, то это просто ошибка текста (реже)
    }

    if (DEBUG_CHAT_ID && chatId.toString() === DEBUG_CHAT_ID) {
        await sendMessage(chatId, `🐛 Veo Debug Start Status: ${startResponse.status}. Response Body (full):\n<code>${errorText}</code>`, TELEGRAM_BOT_TOKEN);
    }

    if (!startResponse.ok) {
        if (startResponse.status === 429) {
            throw new Error("Gemini API: Превышен лимит запросов (Rate Limit 429).");
        }
        const safeError = startData.error?.message || errorText.substring(0, 150) || 'Пустой ответ';
        throw new Error(`Veo Start API Error: ${startResponse.status} - Response: ${safeError}...`);
    }

    // Если ответ OK, но Veo не вернул имя операции (что очень маловероятно)
    const operationName = startData.name;

    if (!operationName) {
        throw new Error("Veo не вернул имя операции для Polling, хотя статус OK.");
    }

    return operationName;
}

// ✅ *** 2.10. Workers AI Chat API (для текстового общения с историей) ***
async function callWorkersAIChat(config, chatHistory, userMessageText, envData) {
    // Получаем учетные данные из окружения (process.env в Яндекс.Облаке)
    const CLOUDFLARE_ACCOUNT_ID = envData.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
    const CLOUDFLARE_API_TOKEN = envData.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
    const MODEL_NAME = config.MODEL;
    const URL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL_NAME}`;
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
          throw new Error("Не настроены ID аккаунта или API токен Cloudflare.");
    }

    // 1. ОПРЕДЕЛЕНИЕ СИСТЕМНОГО КОНТЕКСТА
    // УДАЛЯЕМ ЛОГИКУ, КОТОРАЯ СТИМУЛИРУЕТ ТЕГИ <think>
    const systemPromptText = `🤖 ТЫ — многофункциональный AI-ассистент "Gemini AI" от Leshiy, отвечающий на русском языке.
Ты создан для ❔ помощи в чате как 💬 текстом так и 🎙️ голосом (/say), генерации ✏️ промптов (/prompt) для 📷 фото и 🎬 видео (/video), бесплатного создания 🎨 картинок (/create) и ✨ платного улучшения фотографий (/photo) и т.д.
Твоя задача — вести диалог, отвечать на вопросы, соблюдая контекст и используя информацию о твоих функциях и тарифах (если применимо).

СТРОГОЕ ПРАВИЛО: НИКОГДА НЕ УПОМИНАЙ LLaMA, Meta AI или Austin.

Твои ключевые функции:
✨ Платные функции: Улучшение 📷 фото и создание 🎬 видео. Бесплатно ${FREE_LIMIT} Кредитов, далее по тарифам (1 Кредит = ${CREDIT_COST_RUB} руб.).
🎨 Генерация контента: Ты создаешь новые изображения по текстовым ✏️ промптам (команда /create) бесплатно и без ограничений.
🎙️ Распознавание речи: Ты транскрибируешь голосовые сообщения пользователя в текст, который затем обрабатываешь.
💬 Чат: Ты ведешь диалог, отвечаешь на вопросы, ❔ помогаешь по менюшкам и окнам и сохраняешь контекст беседы.

Когда пользователь спрашивает, что ты умеешь, обязательно упомяни о своих навыках работы с изображениями, видео и голосовыми сообщениями (транскрибацией), а также о командах /photo и /create.
Ответы должны быть информативными и доброжелательными и по возможности компактными, старайся построить диалог понятно и не сильно рассуждая.
Информация по тарифам:
    ${TARIFF_MESSAGE_TEXT}
`.trim();

    // 2. ФОРМИРОВАНИЕ ИСТОРИИ (messages) (Оставляем как есть, но используем 'system' для основного промпта)

    // Инициализация массива с СИСТЕМНЫМ КОНТЕКСТОМ.
    // Используем роль 'system' если модель её поддерживает (Qwen должна),  иначе оставим 'user'.
    const messages = [
        { role: 'system', content: systemPromptText },
        // УДАЛЯЕМ ИСКУССТВЕННЫЙ ДИАЛОГ "role: 'assistant', content: 'Инструкции приняты...'"
        // Это тратит токены и часто сбивает с толку модели-инструкторы
    ];
    
    // Добавляем реальную историю чата
    chatHistory.forEach(msg => {
        messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.text
        });
    });

    // Добавляем текущее сообщение пользователя
    messages.push({ role: 'user', content: userMessageText });

    // *** ДОБАВЛЯЕМ ЛИМИТ ТОКЕНОВ И ТЕМПЕРАТУРУ ***
    const payload = {
        messages: messages,
        stream: false, // Отключаем стриминг, чтобы избежать обрезки
        max_tokens: 1024, // Увеличиваем лимит токенов для безопасности
        temperature: 0.7 // Умеренная температура
    };
    try {
        // Посылаем на отправку через sendAiRequest
        const response = await sendAiRequest(payload, URL, config, envData);
        const data = await response.json();
        // У Workers AI текст лежит в result.response
        const textResult = data.result?.response || data.result?.description || data.result;
        
        if (!textResult) throw new Error("Workers AI вернул пустой результат");
        return textResult.trim();
    } catch (e) {
        console.error("Workers AI call failed:", e);
        throw new Error(`Ошибка Workers AI: ${e.message}`);
    }
}

// ✅ *** 2.11. Workers AI Speech-to-Text (Whisper - голосовые сообщения) ***
/**
 * Транскрибирует аудиофайл (ArrayBuffer), используя Workers AI (Whisper).
 * @param {Object} config - Объект активной конфигурации (AI_MODELS.AUDIO_TO_TEXT_WORKERS_AI).
 * @param {ArrayBuffer} audioBuffer - Буфер аудиофайла.
 * @param {Object} envData - Объект окружения, содержащий привязку AI.
 * @returns {Promise<string>} Транскрибированный текст.
 */
async function callWorkersAISpeechToText(config, audioBuffer, envData) {
    // Получаем учетные данные из окружения (process.env в Яндекс.Облаке)
    const CLOUDFLARE_ACCOUNT_ID = envData.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
    const CLOUDFLARE_API_TOKEN = envData.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
    // --- УНИФИКАЦИЯ: Используем модель из конфигурации ---
    const WHISPER_MODEL = config.MODEL; 
    // ---------------------------------------------------
    const URL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${WHISPER_MODEL}`;
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
            throw new Error("Не настроены ID аккаунта или API токен Cloudflare.");
        }

    // Workers AI ожидает массив байтов (Array of numbers)
    // Функция теперь принимает audioBuffer вторым аргументом, согласно новой подписи.
    //const audioData = [...new Uint8Array(audioBuffer)]; 

    try {
        console.log(`[ASR] Отправка бинарного потока к Cloudflare AI...`);

        /*const response = await fetch(URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/octet-stream' 
            },
            // Передаем твой audioData (массив байтов) как Buffer, чтобы fetch его съел
            body: Buffer.from(audioData) 
        });*/

        // Посылаем на отправку в sendAiRequest
        const response = await sendAiRequest(audioBuffer, URL, config, envData, true);

        // Получаем результат в переменную aiResponse
        const result = await response.json();
        const aiResponse = result.result;

        if (!aiResponse || !aiResponse.text) {
            throw new Error(`Whisper API не вернул ожидаемый текст. Response: ${JSON.stringify(aiResponse)}`);
        }

        // Возвращаем транскрибированный текст
        return aiResponse.text.trim();
    } catch (e) {
        console.error("Workers AI Whisper call failed:", e);
        // Перебрасываем ошибку с префиксом ASR, который вы используете в logDebug
        throw new Error(`ASR_FAIL: Ошибка Workers AI Whisper: ${e.message}`);
    }
}

// ✅ *** 2.12. Workers AI Vision (Uform-Gen2 для генерации промпта из фото) - УНИФИЦИРОВАНО ***
/**
 * Генерирует детальный промпт для Stable Diffusion, используя изображение и текстовую инструкцию, через Workers AI (Uform).
 * @param {Object} config - Объект активной конфигурации (AI_MODELS.IMAGE_TO_TEXT_WORKERS_AI).
 * @param {ArrayBuffer} imageBuffer - Буфер изображения.
 * @param {Object} envData - Объект окружения, содержащий привязку AI.
 * @returns {Promise<string>} Сгенерированный текстовый промпт.
 */
async function callWorkersAIVision(config, imageBuffer, envData) { // <-- ИЗМЕНЕНА ПОДПИСЬ
    const CLOUDFLARE_ACCOUNT_ID = envData.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
    const CLOUDFLARE_API_TOKEN = envData.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
    // --- УНИФИКАЦИЯ: Используем модель из конфигурации ---
    const VISION_MODEL = config.MODEL; 
    // ---------------------------------------------------
    const URL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${VISION_MODEL}`;

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        throw new Error("VISION_FAIL: Не настроены CLOUDFLARE_ACCOUNT_ID или CLOUDFLARE_API_TOKEN.");
    }

    // Здесь audioBuffer стал вторым аргументом, а promptText - третьим.
    const imageBytes = [...new Uint8Array(imageBuffer)];

    // Uform-Gen2 требует простого промпта. Мы используем эффективную инструкцию на английском.
    const simplifiedPrompt = `Describe the attached image in full detail as a high-quality, atmospheric, long prompt (max 750 characters) for an image generation AI like Stable Diffusion or Midjourney. Focus on subject, style, lighting, and composition. The response must be ONLY in RUSSIAN, without any added commentary.`;

    const payload = {
        prompt: simplifiedPrompt,
        image: imageBytes
    };

    try {
        const fetchResponse = await sendAiRequest(payload, URL, config, envData);
        /*const fetchResponse = await fetch(URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });*/

        if (!fetchResponse.ok) {
            const errorBody = await fetchResponse.json();
            throw new Error(`Cloudflare API Error: ${fetchResponse.status} - ${errorBody.errors?.[0]?.message || fetchResponse.statusText}`);
        }

        const aiResponse = await fetchResponse.json();

        // В внешнем API ответ всегда обернут в .result
        if (!aiResponse.success || !aiResponse.result || !aiResponse.result.description) {
            throw new Error(`Vision API не вернул описание. Response: ${JSON.stringify(aiResponse)}`);
        }

        return aiResponse.result.description.trim();
    } catch (e) {
        console.error("Workers AI Vision call failed:", e);
        throw new Error(`VISION_FAIL: Ошибка Workers AI Vision: ${e.message}`);
    }
}

// ✅ *** 2.13. Workers AI Text (НАДЕЖНЫЙ переводчик RU/EN) ***
/**
 * Надежно переводит текст, используя массив бесплатных моделей в качестве резерва.
 * Определяет, нужно ли переводить EN->RU или RU->EN на основе переданных языков.
 * @param {string} text - Текст для перевода.
 * @param {Object} envData - Объект окружения, содержащий привязку AI.
 * @param {string} sourceLang - Исходный язык ('ru' или 'en').
 * @param {string} targetLang - Язык назначения ('ru' или 'en').
 * @returns {Promise<string>} Переведенный текст или оригинал.
 */
async function callWorkersAITranslate(text, envData, sourceLang, targetLang) {

    // 1. ПРОВЕРКА: Если языки совпадают, или текст слишком короткий, или нет AI, возвращаем оригинал
    if (sourceLang === targetLang || text.trim().length < 5) {
        return text;
    }

    // 2. ДИНАМИЧЕСКИ ОПРЕДЕЛЯЕМ ПРОМПТ ПЕРЕВОДА
    let translatePrompt;

    if (targetLang === 'en') {
        const targetLanguageDescription = 'professional English, suitable for text-to-image AI';
        translatePrompt = `Translate the following image generation prompt into ${targetLanguageDescription}. Keep all descriptive and technical terms. Respond ONLY with the translated text, nothing else. Prompt to translate: "${text}"`;
    } else if (targetLang === 'ru') {
        const targetLanguageDescription = 'Russian, suitable for user editing';
        translatePrompt = `Translate the following image generation prompt into clear ${targetLanguageDescription}. Keep all descriptive and technical terms. Respond ONLY with the translated text, nothing else. Prompt to translate: "${text}"`;
    } else {
        // Запасной вариант, если targetLang не 'ru' и не 'en'
        return text;
    }

    // Получаем учетные данные из окружения (process.env в Яндекс.Облаке)
    const CLOUDFLARE_ACCOUNT_ID = envData.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
    const CLOUDFLARE_API_TOKEN = envData.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
    
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
          throw new Error("Не настроены ID аккаунта или API токен Cloudflare.");
    }

    // Список бесплатных моделей в порядке предпочтения
    const FREE_MODELS = [
        "@cf/meta/llama-2-7b-chat-int8",
        "@cf/google/gemma-2b-it"
    ];
    

    // 3. ПЕРЕБОР МОДЕЛЕЙ
    for (const model of FREE_MODELS) {
        try {
            const URL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;

            const currentConfig = {
                MODEL: model,           // Для логов
                SERVICE: 'WORKERS_AI',  // Чтобы добавился Bearer токен Cloudflare
                API_KEY: 'CLOUDFLARE_API_TOKEN' // Имя ключа в твоем envData
            };

            const body = { 
                prompt: translatePrompt, 
                max_tokens: 300 
            };

            //const response = await sendAiRequest(body, URL, currentConfig, envData);
            const response = await fetch(URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    prompt: translatePrompt, 
                    max_tokens: 300 
                })
            });

            const result = await response.json();
            
            // Сохраняем твою переменную aiResponse, вытаскивая результат
            const aiResponse = result.result;

            if (aiResponse && aiResponse.response && aiResponse.response.trim().length > 10) {
                return aiResponse.response.trim();
            }
        } catch (e) {
            console.warn(`Модель ${model} не сработала. Ошибка: ${e.message}. Пробуем следующую.`);
        }
    }

    // 4. Если все попытки провалились, возвращаем оригинал
    return text;
}

// ✅ *** 2.14. callWorkersAITextToImage - ФИНАЛЬНАЯ РАБОЧАЯ УНИФИКАЦИЯ ***
/**
 * Генерирует изображение по заданному промпту, используя внешний HTTP-запрос к API.
 * @param {Object} config - Объект активной конфигурации.
 * @param {string} prompt - Промпт для генерации изображения.
 * @param {Object} envData - Объект окружения.
 * @returns {Promise<ArrayBuffer>} Бинарные данные изображения (PNG).
 */
// ИСПОЛЬЗУЕМ НОВЫЕ ИМЕНА В СИГНАТУРЕ, ЧТОБЫ ИЗБЕЖАТЬ КОНФЛИКТА
async function callWorkersAITextToImage(config, prompt, envData) { 
    // Получаем учетные данные из окружения (process.env в Яндекс.Облаке)
  const CLOUDFLARE_ACCOUNT_ID = envData.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
  const CLOUDFLARE_API_TOKEN = envData.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
  const MODEL_NAME = config.MODEL;
  const URL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL_NAME}`;
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        throw new Error("Не настроены ID аккаунта или API токен Cloudflare.");
    }

    //envData.ctx.waitUntil(logDebug('IMG_GEN_CF_API_TOKEN', CLOUDFLARE_API_TOKEN, envData));

    const finalPrompt = `${prompt}, photorealistic, cinematic light, detailed background`;

    // Параметры для модели
    const inputs = {
        prompt: finalPrompt,
        num_steps: 10,
        negative_prompt: "blurry, low quality, worst quality, deformed, mutated, cropped, text, signature, low detail",
    };

    // !!! ЛОГИРОВАНИЕ ЗАПРОСА !!!
    const debugInputs = JSON.stringify({ model: MODEL_NAME, inputs: inputs });
    //if (envData.BOT_LOGS_STORAGE && envData.ctx) {
    //    logDebug('IMG_GEN_REQUEST_FETCH', debugInputs, envData);
    //}

    let apiResponse;
    try {
        // 3. Вызываем API через fetch
        //const fetchResponse = await sendAiRequest(inputs, URL, config, envData);
        const fetchResponse = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Accept': 'image/png'
            },
            body: JSON.stringify(inputs)
        });

        logDebug('IMG_GEN_FETCH_STATUS', `Status: ${fetchResponse.status}, OK: ${fetchResponse.ok}`, envData);
        //if (envData.ctx) {
        //    envData.ctx.waitUntil(logDebug('IMG_GEN_FETCH_STATUS', `Status: ${fetchResponse.status}, OK: ${fetchResponse.ok}`, envData));
        //}

        if (!fetchResponse.ok) {
            const errorBody = await fetchResponse.json();
             //if (envData.BOT_LOGS_STORAGE && envData.ctx) {
                logDebug('IMG_GEN_FETCH_ERROR', JSON.stringify(errorBody), envData);
             //}
            throw new Error(`Cloudflare API Error: ${fetchResponse.status} - ${errorBody.errors?.[0]?.message || fetchResponse.statusText}`);
        }

        //if (envData.ctx) {
            logDebug('IMG_GEN_BUFFER_START', `Начинаю чтение ArrayBuffer...`, envData);
        //}

        // Проверяем Content-Type
        const contentType = fetchResponse.headers.get('content-type');
        //if (envData.ctx) {
            logDebug('IMG_GEN_CONTENT_TYPE', `Content-Type: ${contentType}`, envData);
        //}

        // Ответ в виде ArrayBuffer 
        apiResponse = await fetchResponse.arrayBuffer();

        // ПРОВЕРКА НА МАГИЧЕСКИЕ БАЙТЫ (PNG начинается с 137 80 78 71)
        const view = new Uint8Array(apiResponse);
        const magicBytes = `${view[0]} ${view[1]} ${view[2]} ${view[3]}`;
        
        //if (envData.ctx) {
            logDebug('IMG_GEN_MAGIC_BYTES', `First 4 bytes: ${magicBytes}`, envData);
        //}

    } catch (e) {
        //if (envData.BOT_LOGS_STORAGE && envData.ctx) {
            logDebug('IMG_GEN_FETCH_CRIT_ERROR', e.message, envData);
        //}
        throw new Error(`Ошибка при вызове Cloudflare API (${MODEL_NAME}): ${e.message}`);
    }

    const byteLength = apiResponse?.byteLength || 0;

    // !!! ЛОГИРОВАНИЕ ОТВЕТА !!!
    //if (envData.BOT_LOGS_STORAGE && envData.ctx) {
        logDebug('IMG_GEN_RAW_RESPONSE_FETCH', `Type: ${typeof apiResponse}, Length: ${byteLength}`, envData);
    //}

    if (!apiResponse || byteLength < 1024) {
        //if (envData.BOT_LOGS_STORAGE && envData.ctx) {
            logDebug('IMG_GEN_EMPTY_RESPONSE_FETCH', `Response was too small or null. Length: ${byteLength}.`, envData);
        //}
        throw new Error(`API Cloudflare вернул пустые данные (Размер: ${byteLength}). Проверьте токен/ID аккаунта.`);
    }

    return apiResponse; // ArrayBuffer
}

// ✅ *** 2.15. callWorkersAIImg2Img - Генерация изображения Image_to_Image через Workers AI (УНИФИЦИРОВАНО) ***
/**
 * Вызывает внешний Workers AI API для Img2Img через JSON, ожидая ArrayBuffer в ответе.
 * УНИФИЦИРОВАННЫЙ КОНТРАКТ: (config, prompt, imageBase64, envData, width, height)
 * @param {Object} config - Объект активной конфигурации (AI_MODELS.IMAGE_TO_IMAGE_WORKERS_AI).
 * @param {string} prompt - Промпт для генерации.
 * @param {string} imageBase64 - Исходное изображение в Base64.
 * @param {Object} envData - Объект окружения (содержит токены, ID и ctx).
 * @param {number} width - Целевая ширина. 
 * @param {number} height - Целевая высота. 
 * @returns {Promise<ArrayBuffer>} Бинарные данные сгенерированного изображения.
 */
async function callWorkersAIImg2Img(config, prompt, imageBase64, envData, width, height) {
    
    // 💡 УНИФИКАЦИЯ: Читаем MODEL, BASE_URL и API_KEY из объекта config
    const MODEL = config.MODEL; 
    const API_KEY_ENV_NAME = config.API_KEY; // Имя переменной токена
    
    const {
        CLOUDFLARE_ACCOUNT_ID,
        ADMIN_CHAT_ID,
        TELEGRAM_BOT_TOKEN: token
    } = envData;
    
    // 💡 УНИФИКАЦИЯ: Получаем токен из envData по имени из config
    const CLOUDFLARE_API_TOKEN = envData[API_KEY_ENV_NAME]; 
    
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        throw new Error("Не настроены CLOUDFLARE_ACCOUNT_ID или CLOUDFLARE_API_TOKEN для Img2Img.");
    }

    // 1. Очистка Base64: удаляем префикс, если он есть
    const cleanImageBase64 = imageBase64.startsWith('data:') ?
                             imageBase64.split(',')[1] :
                             imageBase64;

    if (!cleanImageBase64 || cleanImageBase64.length < 100) {
        await logDebug("Img2Img", `Ошибка Base64. Длина: ${cleanImageBase64?.length || 0}`, envData);
        throw new Error("Невалидные данные Base64 после очистки.");
    }

    // 💡 УНИФИКАЦИЯ: Строим URL с использованием динамической модели
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`;

    // 2. Формирование ТЕЛА ЗАПРОСА (JSON)
    const inputs = {
        // Мы сохраняем ваш жесткий промпт для реставрации, но делаем его условным,
        // чтобы можно было передавать чистый промпт через config.USE_FIXED_PROMPT
        "prompt": prompt || "Enhance the quality of the attached image: color it with **bright, natural colors**. Remove **all scratches, cracks, and dust**. Focus on **perfectly preserved original facial features** and **hyperrealism**. Remove frames. Complete the background.",
        "negative_prompt": "bad art, ugly, deformed, blurry, low quality, unnatural colors, text, watermark **grayscale, monochrome, black and white, faded, sepia, washed out**",
        image_b64: cleanImageBase64,
        num_steps: 20,
        strength: 0.02, // Сила изменения
        guidance: 12.0, // Точность промпта
        width: width, 
        height: height, 
        style_preset: 'photographic', 
    };

    // --- ДЕБАГ #1: ЛОГИРОВАНИЕ ОТПРАВЛЯЕМОГО ЗАПРОСА (БЕЗ Base64!) ---
    const debugInputs = { ...inputs, image_b64: `[Base64 длиной ${cleanImageBase64.length}]` };
    envData.ctx.waitUntil(logDebug(
        "Img2Img",
        `Отправка запроса. URL: ${url}. Inputs: \n\`\`\`json\n${JSON.stringify(debugInputs, null, 2)}\n\`\`\``,
        envData
    ));

    let response;
    try {
        //response = await sendAiRequest(inputs, url, config, envData);
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(inputs),
            signal: AbortSignal.timeout(60000)
        });
        
    } catch (e) {
        await logDebug("Img2Img", `Ошибка Fetch: ${e.message}`, envData);
        throw new Error(`Ошибка сети/таймаута при вызове Workers AI: ${e.message}`);
    }

    // 3. Обработка ОТВЕТА (Остается без изменений)
    if (response.ok) {
        const contentType = response.headers.get('Content-Type');
        const contentLength = response.headers.get('Content-Length');

        // --- ДЕБАГ #2: ЛОГИРОВАНИЕ УСПЕШНОГО ОТВЕТА ---
        envData.ctx.waitUntil(logDebug(
            "Img2Img",
            `Успешный ответ. Status: ${response.status}. Content-Type: ${contentType}. Content-Length: ${contentLength || 'N/A'}`,
            envData
        ));

        if (contentType && contentType.includes('image/png')) {
            return response.arrayBuffer();
        } else {
            const errorText = await response.text();
            let errorData = {};
            try { errorData = JSON.parse(errorText); } catch(e) { /* не JSON */ }

            const errorMessage = errorData.errors?.[0]?.message || errorText.substring(0, 500) || 'Неизвестная ошибка 200 OK, не изображение.';
            
            envData.ctx.waitUntil(logDebug(
                "Img2Img",
                `Не изображение. Status 200, но Content-Type не PNG. Ответ: ${errorMessage}`,
                envData
            ));

            throw new Error(`Workers AI Img2Img: Непредвиденный ответ. ${errorMessage}`);
        }
    } else {
        // --- ДЕБАГ #3: ЛОГИРОВАНИЕ HTTP-ОШИБКИ (4xx, 5xx) ---
        const errorText = await response.text();
        let errorBody = {};
        try { errorBody = JSON.parse(errorText); } catch(e) { /* не JSON */ }

        const errorMessage = errorBody.errors?.[0]?.message || errorText.substring(0, 500) || `HTTP Error ${response.status}`;

        await logDebug(
            "Img2Img",
            `HTTP Ошибка. Status: ${response.status}. Сообщение: ${errorMessage}`,
            envData
        );

        throw new Error(`Workers AI External API Error: ${response.status} - ${errorMessage}`);
    }
}

// ✅ *** 2.16. callWorkersAITextToAudio - Генерация аудио через Workers AI (ЧЕРЕЗ FETCH)
/**
 * Вызывает внешний Workers AI API для TTS через JSON, ожидая ArrayBuffer в ответе.
 * Использует прямой вызов FETCH для обхода проблем с привязкой env.AI.
 * УНИФИЦИРОВАННЫЙ КОНТРАКТ: (config, prompt, envData)
 * @param {Object} config - Объект активной конфигурации (AI_MODELS.TEXT_TO_AUDIO_WORKERS_AI).
 * @param {string} text - Текст для озвучивания.
 * @param {Object} envData - Объект окружения (содержит токены, ID и ctx).
 * @returns {Promise<{audioBase64: string, mimeType: string}>} - Объект с данными аудио (Base64).
 */
async function callWorkersAITextToAudio(config, text, envData, requestedVoice) {
    
    // 💡 Читаем MODEL, BASE_URL и API_KEY из объекта config
    const MODEL = config.MODEL; 
    const VOICE_MALE = 'Male';
    const VOICE_FEMALE = 'Female';

    const WORKERS_AI_VOICE_MAP = {
        [VOICE_MALE]: 'orpheus', // Мужской голос
        //[VOICE_MALE]: 'zeus', // Мужской голос
        [VOICE_FEMALE]: 'athena' // Женский голос
        //[VOICE_FEMALE]: 'luna' // Женский голос
    };
    // 💡 1. Динамический выбор голоса
    const selectedVoiceName = WORKERS_AI_VOICE_MAP[requestedVoice] || WORKERS_AI_VOICE_MAP[VOICE_MALE]; // По умолчанию - мужской
    const API_KEY_ENV_NAME = config.API_KEY; // Имя переменной токена
    
    const { CLOUDFLARE_ACCOUNT_ID } = envData;
    
    // 💡 Получаем токен из envData по имени из config
    const CLOUDFLARE_API_TOKEN = envData[API_KEY_ENV_NAME]; 
    
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        throw new Error("Не настроены CLOUDFLARE_ACCOUNT_ID или CLOUDFLARE_API_TOKEN для Workers AI TTS.");
    }

    const maxTextLength = 500; 
    if (text.length > maxTextLength) {
        text = text.substring(0, maxTextLength);
    }

    // 💡 Строим URL с использованием динамической модели
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`;

    // 2. Формирование ТЕЛА ЗАПРОСА (JSON)
    const inputs = {
        text: text,
        speaker: selectedVoiceName,
        language: 'ru-ru',
        encoding: 'mp3'
    };

    // --- ДЕБАГ #1: ЛОГИРОВАНИЕ ОТПРАВЛЯЕМОГО ЗАПРОСА ---
    envData.ctx.waitUntil(logDebug(
        "TTS_WorkersAI",
        `Отправка запроса. URL: ${url}. Inputs: \n\`\`\`json\n${JSON.stringify(inputs, null, 2)}\n\`\`\``,
        envData
    ));

    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg' // Явно просим звук
            },
            body: JSON.stringify(inputs),
            signal: AbortSignal.timeout(60000)
        });
    } catch (e) {
        envData.ctx.waitUntil(logDebug("TTS_WorkersAI", `Ошибка Fetch: ${e.message}`, envData));
        throw new Error(`Ошибка сети/таймаута при вызове Workers AI: ${e.message}`);
    }

    // 3. Обработка ОТВЕТА
    if (response.ok) {
        // СРАЗУ забираем ArrayBuffer, не глядя на заголовки
        const responseBuffer = await response.arrayBuffer();
        const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
        
        let finalAudioBase64;
        let finalMimeType = 'audio/mpeg'; // Дефолт
        
        // --- ДЕБАГ #2: ЛОГИРОВАНИЕ УСПЕШНОГО ОТВЕТА ---
        envData.ctx.waitUntil(logDebug(
            "TTS_WorkersAI",
            `Успешный ответ. Status: ${response.status}. Content-Type: ${contentType}`,
            envData
        ));

        // Проверяем первый байт: 123 — это '{' (начало JSON)
        const firstByte = new Uint8Array(responseBuffer)[0];

        // ВАРИАНТ А: Пришел JSON (определяем по первому байту)
        if (firstByte === 123) {
            const jsonText = new TextDecoder().decode(responseBuffer);
            try {
                const obj = JSON.parse(jsonText);
                // Если Cloudflare упаковал аудио в поле result
                if (obj.result) {
                    finalAudioBase64 = obj.result; 
                } else {
                    finalAudioBase64 = Buffer.from(responseBuffer).toString('base64');
                }
            } catch (e) {
                finalAudioBase64 = Buffer.from(responseBuffer).toString('base64');
            }
        } 
        // ВАРИАНТ Б: Пришли чистые байты
        else {
            // ЭТО АУДИО-БАЙТЫ
            finalAudioBase64 = Buffer.from(responseBuffer).toString('base64');
        }

        // ИТОГОВЫЙ ЛОГ
        envData.ctx.waitUntil(logDebug(
            "TTS_WorkersAI",
            `ИТОГ: Len=${finalAudioBase64.length}, Mime=${finalMimeType}`,
            envData
        ));
        
        // --- ПОСЛЕДНЯЯ ПРОВЕРКА СОДЕРЖИМОГО ---
        const base64Head = finalAudioBase64.substring(0, 98);
        
        envData.ctx.waitUntil(logDebug(
            "TTS_WorkersAI",
            `ПРОВЕРКА ТИПА: Head=${base64Head}`,
            envData
        ));
        
        // Возвращаем результат. Если тип не пришел, ставим audio/mpeg принудительно
        return { 
            audioBase64: finalAudioBase64, 
            mimeType: finalMimeType
            //mimeType: (contentType && contentType.includes('audio')) ? contentType : 'audio/mpeg'
        };
        
    } else {
        // --- ДЕБАГ #3: ЛОГИРОВАНИЕ HTTP-ОШИБКИ (4xx, 5xx) ---
        const errorText = await response.text();
        let errorBody = {};
        try { errorBody = JSON.parse(errorText); } catch(e) { /* не JSON */ }

        // Пытаемся получить сообщение об ошибке Cloudflare
        const errorMessage = errorBody.errors?.[0]?.message || errorText.substring(0, 500) || `HTTP Error ${response.status}`;

        envData.ctx.waitUntil(logDebug(
            "TTS_WorkersAI",
            `HTTP Ошибка. Status: ${response.status}. Сообщение: ${errorMessage}`,
            envData
        ));

        throw new Error(`Workers AI External API Error: ${response.status} - ${errorMessage}`);
    }
}

// ✅ *** 2.20. callBotHubTextChat - Обработчик для текстовых чат-запросов BotHub
/**
 * @description Отправляет запрос на генерацию текста через BotHub API.
 * @param {Object} config - Объект конфигурации модели (TEXT_TO_TEXT_BOTHUB).
 * @param {Array} history - История чата в формате [{"role": "user/model", "text": "..."}].
 * @param {string} messageText - Новое сообщение от пользователя.
 * @param {Object} envData - Объект окружения (включает DEBUG_ENABLED и ctx).
 * @returns {Promise<string>} Сгенерированный текстовый ответ.
 */
async function callBotHubTextChat(config, history, messageText, envData) {
    // 1. ОПРЕДЕЛЕНИЕ СИСТЕМНОГО КОНТЕКСТА (ГЛОБАЛЬНАЯ КОНСТАНТА)
    const SYSTEM_PROMPT = `
    ТЫ ДОЛЖЕН СТРОГО СЛЕДОВАТЬ ВСЕМ ИНСТРУКЦИЯМ.
    ТЫ НЕ ЯВЛЯЕШЬСЯ LLaMA, AI ОТ Meta, или большой языковой моделью.
    Ты — многофункциональный AI-ассистент "Gemini AI" от Leshiy, отвечающий на русском языке.
Твои ключевые функции:
1. Платные функции: Улучшение фото и создание видео. Бесплатно ${FREE_LIMIT} Кредитов, далее по тарифам (1 Кредит = ${CREDIT_COST_RUB} руб.).
2. Генерация контента: Ты создаешь новые изображения по текстовым промптам (команда /create) бесплатно и без ограничений.
3. Распознавание речи: Ты транскрибируешь голосовые сообщения пользователя в текст, который затем обрабатываешь.
4. Чат: Ты ведешь диалог, отвечаешь на вопросы и сохраняешь контекст беседы.

Когда пользователь спрашивает, что ты умеешь, обязательно упомяни о своих навыках работы с изображениями, видео и голосовыми сообщениями (транскрибацией), а также о командах /photo и /create.
Ответы должны быть информативными и доброжелательными.

    ${TARIFF_MESSAGE_TEXT}
`.trim();
    
    const apiKey = envData[config.API_KEY];
    const baseUrl = config.BASE_URL;
    const model = config.MODEL;
    const { DEBUG_ENABLED, ctx } = envData;
    
    // ПРОВЕРКА КЛЮЧА
    if (!apiKey) {
        throw new Error(`API Key для ${config.SERVICE} не настроен.`);
    }

    // 1. Формирование истории и промпта
    const apiMessages = [];
    
    // Используем ГЛОБАЛЬНЫЙ ПРОМПТ для обучения бота
    apiMessages.push({ "role": "system", "content": SYSTEM_PROMPT }); 
    
    history.forEach(item => {
        apiMessages.push({
            role: item.role === 'model' ? 'assistant' : item.role, 
            content: item.text 
        });
    });

    apiMessages.push({
        role: 'user',
        content: messageText
    });
    
    // 2. Формирование тела запроса
    const body = {
        model: model,
        messages: apiMessages,
        stream: false,
        temperature: 0.7,
        max_tokens: 4096,
    };

    const url = `${baseUrl}/chat/completions`;

    // --- DEBUG: ЛОГИРОВАНИЕ ЗАПРОСА ---
    if (DEBUG_ENABLED) {
        const logData = {
            url: url,
            //body: JSON.stringify(body).substring(0, 1000), // Ограничиваем тело
            historyLength: apiMessages.length,
        };
        // Предполагается, что logDebug также глобально доступна
        ctx.waitUntil(logDebug("BOTHUB_REQUEST", JSON.stringify(logData), envData)); 
    }
    // ------------------------------------

    // 3. Отправка запроса
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        
        // --- DEBUG: ЛОГИРОВАНИЕ ОШИБКИ API ---
        if (DEBUG_ENABLED) {
            ctx.waitUntil(logDebug("BOTHUB_ERROR", `Status: ${response.status}. Body: ${errorText.substring(0, 500)}`, envData));
        }
        // -------------------------------------
        
        throw new Error(`BOTHUB API error (Status ${response.status}): ${errorText}`);
    }

    //const response = await sendAiRequest(body, url, config, envData);
    // 4. Обработка ответа
    const data = await response.json();
    let responseText = '';

    // --- DEBUG: ЛОГИРОВАНИЕ УСПЕШНОГО ОТВЕТА ---
    //if (DEBUG_ENABLED) {
    //    ctx.waitUntil(logDebug("BOTHUB_SUCCESS", JSON.stringify(data).substring(0, 2000), envData));
    //}
    // ---------------------------------------------
    
    if (data.choices && data.choices.length > 0) {
        responseText = data.choices[0].message.content.trim();
    } 
    
    if (responseText) {
        return responseText;
    } else {
        // --- DEBUG: ЛОГИРОВАНИЕ ПУСТОГО ОТВЕТА ---
        if (DEBUG_ENABLED) {
            ctx.waitUntil(logDebug("BOTHUB_EMPTY", "Model returned JSON, but 'choices' or 'content' was empty.", envData));
        }
        // ------------------------------------------
        throw new Error(`BOTHUB API response error: Received empty content from model.`);
    }
}

// ✅ *** 2.21. callBothubTextToAudio - Bothub Text-to-Audio (ФИНАЛЬНЫЙ КОД - УЛЬТРА-КОНСЕРВАТИВНЫЙ) ***
async function callBothubTextToAudio(config, textToSpeak, envData, requestedVoice) {
    const API_KEY_ENV_NAME = config.API_KEY; 
    const API_KEY = envData[API_KEY_ENV_NAME]; 
    const BASE_URL = config.BASE_URL;
    const MODEL = config.MODEL;
    const ctx = envData.ctx;

    if (!API_KEY) { 
        ctx.waitUntil(logDebug("TTS_CONFIG_ERROR", `Токен API (${API_KEY_ENV_NAME}) не настроен.`, envData, ctx));
        throw new Error(`API Key для ${config.SERVICE} не настроен. Ожидаемая переменная: ${API_KEY_ENV_NAME}`);
    }
    
    const apiUrl = `${BASE_URL}/audio/speech`; 

    const VOICE_MALE = 'Male';
    const VOICE_FEMALE = 'Female';
    
    const voiceMap = {
        [VOICE_MALE]: 'echo', 
        [VOICE_FEMALE]: 'nova' 
    };
    
    const apiVoiceName = voiceMap[requestedVoice] || voiceMap[VOICE_MALE];

    // Тело запроса: ТОЛЬКО ОБЯЗАТЕЛЬНЫЕ ПОЛЯ 
    const bodyJson = {
        model: MODEL, 
        voice: apiVoiceName,
        input: textToSpeak,
    };
    const body = JSON.stringify(bodyJson);

    // 🛑 ДЕБАГ #1: ЛОГИРУЕМ ЗАПРОС И JSON
    if (envData.DEBUG_ENABLED && ctx) {
        // ОСТАВЛЯЕМ apiUrl без обратных апострофов
        // Апострофы оставляем только для JSON
        let debugMessage = `Отправка запроса.\nURL: ${apiUrl}\nInputs:\n\`\`\`json\n${body}\n\`\`\``; 
        ctx.waitUntil(logDebug("TTS_Bothub_REQUEST", debugMessage, envData, ctx));
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            // МИНИМАЛЬНЫЙ НАБОР ЗАГОЛОВКОВ
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${API_KEY}` 
        },
        body: body,
    });

    if (!response.ok) {
        const errorText = await response.text();
        
        const errorLog = `Ошибка ответа. Status: ${response.status}. Error Text: ${errorText.substring(0, 500)}`;
        ctx.waitUntil(logDebug("TTS_Bothub_ERROR", errorLog, envData, ctx));

        throw new Error(`Bothub TTS API Error (${response.status}): ${errorText.substring(0, 500)}`);
    }

    // Обработка успешного ответа
    const mimeTypeHeader = response.headers.get('Content-Type') || 'audio/mp3'; 
    const finalMimeType = mimeTypeHeader.split(';')[0]; 
    
    ctx.waitUntil(logDebug("TTS_Bothub_SUCCESS", `Успешный ответ. Status: ${response.status}. Mime: ${finalMimeType}`, envData, ctx));

    const audioArrayBuffer = await response.arrayBuffer();
    const audioBase64 = arrayBufferToBase64(audioArrayBuffer); 

    return {
        audioBase64: audioBase64,
        mimeType: finalMimeType
    };
}

// ✅ *** 2.22. callBotHubVisionChat - Обработчик для Vision API (BotHub)
/**
 * @description Отправляет запрос на анализ изображения через Vision API (BotHub).
 * @param {Object} config - Объект активной конфигурации (AI_MODELS.IMAGE_TO_TEXT_BOTHUB).
 * @param {ArrayBuffer} imageData - Изображение в виде ArrayBuffer.
 * @param {Object} envData - Объект окружения.
 * @returns {Promise<string>} Сгенерированный промпт на английском.
 */
async function callBotHubVisionChat(config, imageData, envData) {
    //const config = IMAGE_TO_TEXT_CONFIG; // <--- ИСПОЛЬЗУЕМ НОВУЮ ГЛОБАЛЬНУЮ КОНСТАНТУ
    const apiKey = envData[config.API_KEY];
    const baseUrl = config.BASE_URL;
    const model = config.MODEL;
    const { DEBUG_ENABLED, ctx } = envData;

    if (!apiKey) {
        throw new Error(`API Key для Vision (на BotHub) не настроен.`);
    }

    // 1. Кодирование изображения в Base64.
    // Предполагается, что функция bufferToBase64 находится выше.
    const base64Image = bufferToBase64(imageData);
    const systemMessage = "РОЛЬ И ЯЗЫК: Действуй как 'Фотореставратор'. Общение СТРОГО на РУССКОМ языке. ЦЕЛЬ: Создать максимально детализированный, буквальный промпт для Image-to-Image генерации. Твой ответ должен быть только промптом, без приветствий и объяснений.";
    // 2. Формирование тела запроса (мультимодальный формат)
    const messages = [
        { "role": "system",
          "content": systemMessage },
        { 
            "role": "user", 
            "content": [
                { "type": "text", "text": "Describe this image as a Stable Diffusion prompt." },
                // data:image/jpeg;base64,${base64Image} - стандартный формат для передачи Base64
                { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${base64Image}` } }
            ]
        }
    ];
    
    const body = {
        model: model,
        messages: messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 4096,
    };

    const url = `${baseUrl}/chat/completions`;

    // 3. Отправка запроса
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        if (DEBUG_ENABLED) {
            ctx.waitUntil(logDebug("BOTHUB_VISION_ERROR", `Status: ${response.status}. Body: ${errorText.substring(0, 500)}`, envData));
        }
        throw new Error(`BOTHUB VISION API error (Status ${response.status}): ${errorText}`);
    }

    // 4. Обработка ответа
    const data = await response.json();
    let responseText = '';
    
    if (data.choices && data.choices.length > 0) {
        responseText = data.choices[0].message.content.trim();
    } 
    
    if (responseText) {
        return responseText;
    } else {
        throw new Error(`BOTHUB VISION API response error: Received empty content from model.`);
    }
}

// ✅ *** 2.22а. callBothubVideoVision - Обработчик для Video Analysis (BotHub/Gemini)
/**
 * @description Отправляет запрос на анализ видеоконтента (Video Captioning) через Bothub (Gemini 2.5 Flash).
 * @param {Object} config - Объект активной конфигурации (напр., AI_MODELS.VIDEO_TO_ANALYSIS_BOTHUB).
 * @param {ArrayBuffer} videoData - Видеофайл в виде ArrayBuffer.
 * @param {string} videoMimeType - MIME-тип видео (напр., 'video/mp4').
 * @param {Object} envData - Объект окружения.
 * @returns {Promise<string>} Сгенерированный текстовый анализ.
 */
async function callBothubVideoVision(config, videoData, videoMimeType, envData) {
    const apiKey = envData[config.API_KEY];
    const baseUrl = config.BASE_URL;
    const model = config.MODEL;
    const { DEBUG_ENABLED, ctx } = envData;

    if (!apiKey) {
        throw new Error(`API Key для Video Analysis (на BotHub) не настроен.`);
    }
    if (!videoMimeType || !videoMimeType.startsWith('video/')) {
        throw new Error(`Некорректный или отсутствующий MIME-тип видео: ${videoMimeType}`);
    }

    // 1. Кодирование видео в Base64.
    // Если функция в глобальной области видимости называется arrayBufferToBase64, используйте ее:
    // const base64Video = arrayBufferToBase64(videoData); 
    const base64Video = bufferToBase64(videoData); // Предполагаем, что эта функция доступна
    
    // --- ПЕРЕФОРМУЛИРОВАННАЯ СИСТЕМНАЯ ИНСТРУКЦИЯ (для Видеоаналитика) ---
    const systemMessage = "РОЛЬ И ЯЗЫК: Действуй как 'Мультимодальный Видеоаналитик'. Общение СТРОГО на РУССКОМ языке. ЦЕЛЬ: Предоставить подробный и структурированный анализ видеоконтента, включая визуальные и звуковые данные. Твой ответ должен быть только анализом, без приветствий и объяснений.";
    
    // 2. Формирование тела запроса (мультимодальный формат для видео)
    const userPrompt = "Проанализируй видеоролик. Предоставь полное и детализированное описание: 1) Визуальный анализ (ключевые кадры, объекты, действия). 2) Анализ аудиодорожки (транскрипция, контекст). 3) Общее резюме. Ответь только текстом анализа, используя четкую структуру.";

    const messages = [
        { "role": "system",
          "content": systemMessage }, 
        { 
            "role": "user", 
            "content": [
                { "type": "text", "text": userPrompt },
                // ВАЖНО: Формат для видео/изображения в OpenAI/BotHub API
                { "type": "image_url", "image_url": { "url": `data:${videoMimeType};base64,${base64Video}` } }
            ]
        }
    ];
    
    const body = {
        model: model,
        messages: messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 4096,
    };

    const url = `${baseUrl}/chat/completions`;

    // --- DEBUG: ЛОГИРОВАНИЕ ЗАПРОСА (без Base64) ---
    if (DEBUG_ENABLED) {
        // Используем исправленную логику для безопасной очистки лога
        const sanitizeContent = (content) => {
            if (Array.isArray(content)) {
                return content.map(c => 
                    (c.type === 'image_url' || (c.image_url && c.image_url.url))
                    // Уточнено сообщение в логе, что это видео
                    ? { type: 'image_url', url: `data:${videoMimeType};base64,[VIDEO DATA REDACTED]` } 
                    : c
                );
            }
            return content;
        };

        const logBody = { 
            ...body, 
            messages: body.messages.map(m => ({ 
                ...m, 
                content: m.content ? sanitizeContent(m.content) : m.content 
            })) 
        };
        const logData = {
            url: url,
            body: JSON.stringify(logBody).substring(0, 1000), 
            historyLength: body.messages.length,
        };
        ctx.waitUntil(logDebug("BOTHUB_VIDEO_ANALYSIS_REQUEST", JSON.stringify(logData), envData));
    }
    // ------------------------------------

    // 3. Отправка запроса (Остается без изменений)
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        if (DEBUG_ENABLED) {
            ctx.waitUntil(logDebug("BOTHUB_VIDEO_ANALYSIS_ERROR", `Status: ${response.status}. Body: ${errorText.substring(0, 500)}`, envData));
        }
        // Уточнено сообщение об ошибке для BotHub
        throw new Error(`BOTHUB VIDEO ANALYSIS API error (Status ${response.status}): ${errorText}. Это может быть связано с тем, что BotHub не пропускает видео в формате 'image_url', даже для Gemini.`);
    }

    // 4. Обработка ответа (Остается без изменений)
    const data = await response.json();
    let responseText = '';
    
    if (data.choices && data.choices.length > 0) {
        responseText = data.choices[0].message.content.trim();
    } 
    
    if (responseText) {
        return responseText;
    } else {
        throw new Error(`BOTHUB VIDEO ANALYSIS API response error: Received empty content from model.`);
    }
}

// ✅ *** 2.23. callBotHubText2Img (Text-to-Image - BotHub/DALL-E) - ФИНАЛЬНО ИСПРАВЛЕНО ***
/**
 * Генерирует изображение по промпту через BotHub (DALL-E-3).
 * Соответствует унифицированному контракту T2I.
 * @param {Object} config - Объект активной конфигурации (AI_MODELS.TEXT_TO_IMAGE_DALLE).
 * @param {string} prompt - Текстовый промпт.
 * @param {Object} envData - Объект окружения.
 * @returns {Promise<ArrayBuffer>} Сгенерированное изображение в ArrayBuffer.
 */
async function callBotHubText2Img(config, prompt, envData) { 
    
    const API_KEY_ENV_NAME = config.API_KEY; 
    const API_KEY = envData[API_KEY_ENV_NAME]; 
    const BASE_URL = config.BASE_URL; 
    const MODEL = config.MODEL; 

    if (!API_KEY) { 
        throw new Error(`DALL-E-3 API key is missing. Expected env var: ${API_KEY_ENV_NAME}`); 
    }
    
    // Используем T2I endpoint BotHub
    const url = `${BASE_URL}/images/generations`; 
    
    const body = JSON.stringify({
        model: MODEL,
        prompt: prompt,
        n: 1,
        size: config.SIZE || "1024x1024"
        // ✅ КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Запрашиваем URL, так как BotHub не возвращает b64_json по умолчанию
        //response_format: "url" 
    });

    // 1. ВЫЗОВ BOT-HUB API
    const response = await fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: body,
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`BotHub DALL-E API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const imageUrl = data?.data?.[0]?.url; // Получаем URL изображения
    
    if (!imageUrl) {
        throw new Error("DALL-E-3 вернул успешный ответ, но отсутствует URL изображения.");
    }
    
    // 2. ЗАГРУЗКА ИЗОБРАЖЕНИЯ ПО URL
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
        throw new Error(`Ошибка загрузки изображения по URL (${imageResponse.status}).`);
    }

    // Возвращаем бинарные данные (ArrayBuffer)
    return imageResponse.arrayBuffer();
}

// ✅ *** 2.24. callBotHubImage2Image - ФИНАЛЬНЫЙ ЧИСТЫЙ VISION-ЗАПРОС ***
/**
 * Вызывает BotHub API для Image-to-Image через Chat Completions.
 * @param {Object} config - Объект конфигурации (IMAGE_TO_IMAGE_GEMINI_FLASH).
 * @param {string} prompt - Переведенный на английский промпт.
 * @param {string} imageBase64 - Исходное изображение в Base64.
 * @param {Object} envData - Данные окружения (BOTHUB_API_KEY).
 * @param {number} width - Целевая ширина. 
 * @param {number} height - Целевая высота. 
 * @returns {Promise<ArrayBuffer>} Сгенерированное изображение в виде ArrayBuffer.
 */
async function callBotHubImage2Image(config, prompt, imageBase64, envData, width, height) {
    const API_KEY = envData[config.API_KEY]; 
    if (!API_KEY) { throw new Error(`BotHub API key is missing. Expected env var: ${config.API_KEY}`); }

    // Установка промпта для I2I
    const bothubPrompt = `Maintain the exact composition, colors, and subject of the input image. ${prompt}, cinematic light, photorealistic, 8k, sharp focus.`;
    
    // 1. URL
    const BOTHUB_URL_CHAT = `${config.BASE_URL}/chat/completions`; 

    // 2. Формирование тела запроса (СТРОГО по рабочему примеру соседа: чистый Vision)
    const messages = [
        { 
            "role": "user", 
            "content": [
                { "type": "text", "text": bothubPrompt },
                // Base64-изображение в Vision-формате
                { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${imageBase64}` } }
            ]
        }
    ];

    // Используем только минимальные параметры для активации I2I-режима
    const jsonBody = JSON.stringify({
        model: config.MODEL, 
        messages: messages, 
    });
    
    // 3. Вызов API
    const response = await fetch(BOTHUB_URL_CHAT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`, 
            // Дополнительные заголовки HTTP-Referer и X-Title можно не добавлять,
            // так как они специфичны для OpenRouter, а не BotHub.
        },
        body: jsonBody,
    });

    // 4. Обработка ошибок
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`BotHub I2I API Error (${response.status}): ${errorText.substring(0, 150)}...`);
    }

    // 5. Парсинг ответа (Ожидаем URL)
    const jsonResponse = await response.json();

    let imageUrl = null;

    // 1. Попытка получить URL по пути OpenRouter/BotHub (КЛЮЧЕВОЙ ПУТЬ)
    try {
        imageUrl = jsonResponse?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    } catch (e) { /* ignore */ }
    
    // 2. Попытка получить URL из формата Generations API
    if (!imageUrl) { imageUrl = jsonResponse?.data?.[0]?.url; }

    // 3. Попытка получить URL из поля Content
    if (!imageUrl) {
        const content = jsonResponse?.choices?.[0]?.message?.content;
        
        if (typeof content === 'string') {
            const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
            if (urlMatch) { imageUrl = urlMatch[0]; }
        } else if (Array.isArray(content)) {
            const imagePart = content.find(part => part.type === 'image_url' || part.type === 'image'); 
            imageUrl = imagePart?.image_url?.url || imagePart?.image?.url;
        }
    }
    
    if (!imageUrl) {
        // Мы возвращаем эту ошибку, если URL отсутствует
        throw new Error(`BotHub I2I: Успешный ответ, но отсутствует URL изображения. ${JSON.stringify(jsonResponse).substring(0, 200)}...`);
    }

    // 6. ЗАГРУЗКА ИЗОБРАЖЕНИЯ ПО URL
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
        throw new Error(`Ошибка загрузки изображения по URL (${imageResponse.status}).`);
    }

    return imageResponse.arrayBuffer();
}

// ✅ *** 2.25. callBotHubAudioToText - Транскрипция речи (BotHub/Whisper) ***
/**
 * Преобразует аудиофайл в текст через BotHub (Whisper).
 * Требует multipart/form-data.
 * @param {Object} config - Объект активной конфигурации (AI_MODELS.AUDIO_TO_TEXT_BOTHUB).
 * @param {ArrayBuffer} audioData - Аудиофайл в виде ArrayBuffer.
 * @param {Object} envData - Объект окружения.
 * @returns {Promise<string>} Распознанный текст.
 */
async function callBotHubAudioToText(config, audioData, envData) { // МЕНЬШЕ АРГУМЕНТОВ
    const endpoint = '/audio/transcriptions';
    const apiUrl = `${config.BASE_URL}${endpoint}`;
    
    const tokenKey = config.API_KEY;
    const token = envData[tokenKey]; 
    const mimeType = 'audio/ogg'; // <-- ФИКСИРОВАННЫЙ ТИП для Telegram VOICEMESSAGE

    if (!token) {
        throw new Error(`API Token (${tokenKey}) не настроен в переменных окружения.`);
    }

    // 1. Формирование тела запроса (Multipart/form-data)
    const boundary = '----BothubWhisperBoundary' + Math.random().toString(16).slice(2);
    const contentType = `multipart/form-data; boundary=${boundary}`;
    const encoder = new TextEncoder();
    
    let body = new Uint8Array(0);
    const audioBuffer = new Uint8Array(audioData); 

    // Функция для добавления строковой части
    const addPart = (part) => {
        body = concatBuffers(body, encoder.encode(part));
    };

    // 1.1. Добавление Модели ('model')
    addPart(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${config.MODEL}\r\n`); 

    // 1.2. Добавление Файла ('file')
    const fileExtension = 'ogg'; // Фиксируем расширение
    const filename = `audio_file.${fileExtension}`;
    
    // Заголовок файла
    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    addPart(fileHeader);
    
    // Добавляем сам аудиофайл
    body = concatBuffers(body, audioBuffer);
    
    // 1.3. Добавление Финальной Границы
    addPart(`\r\n--${boundary}--\r\n`);

    // 2. Отправка запроса (остается без изменений)
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': contentType 
        },
        body: body,
        signal: AbortSignal.timeout(30000) 
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`BotHub Whisper API Error (${response.status}): ${errorText.substring(0, 500)}`);
    }

    // 3. Обработка ответа (остается без изменений)
    const data = await response.json();
    
    if (data.text) {
        return data.text.trim();
    } else {
        throw new Error(`BotHub Whisper API Error: Response did not contain 'text' field. Full response: ${JSON.stringify(data).substring(0, 200)}...`);
    }
}

// ✅ 2.26. BotHub Text-to-Video (ФИНАЛЬНАЯ ВЕРСИЯ - ЧЕРЕЗ CHAT COMPLETIONS)
// !!! ИЗМЕНЕНИЕ: Добавлен config и API_KEY_VALUE вместо BOTHUB_API_KEY !!!
async function startBotHubTextToVideo(config, prompt, API_KEY_VALUE, envData, ctx) { 
    
    // 🚨 ИСПРАВЛЕНИЕ: Используем модель и URL из конфига
    const model = config.MODEL; 
    // Эндпоинт chat/completions фиксирован относительно BASE_URL
    const url = `${config.BASE_URL}/chat/completions`; 
    
    // 1. Безопасное извлечение переменных для дебага
    const token = envData ? envData.TELEGRAM_BOT_TOKEN : null; 
    const ADMIN_CHAT_ID = envData ? envData.ADMIN_CHAT_ID : null;
    
    // ✅ ИЗМЕНЕНИЕ: Формируем тело запроса, используя рабочую логику I2I
    const body = {
        model: model, 
        messages: [{
            'role': 'user',
            // Оставляем массивный content, как в рабочем I2I, чтобы принудить к медиагенерации
            'content': [{ "type": "text", "text": prompt }] 
        }],
        // Оставляем extra_body, чтобы явно запросить видео, так как T2V - это платная асинхронная операция.
        "extra_body": { 
            "output_modalities": ["video"], 
            "seconds": 6, 
            "size": "1024x576" 
        },
        stream: false 
    };

    // 🚨 ИСПРАВЛЕНИЕ: Используем API_KEY_VALUE
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY_VALUE}` };

    let response;
    let errorText;

    try {
        // --- ДЕБАГ #1: ЛОГИРОВАНИЕ ОТПРАВЛЯЕМОГО ЗАПРОСА (ФОНОВЫЙ) ---
        const debugInputs = { ...body, BOTHUB_API_KEY: `[Токен длиной ${API_KEY_VALUE.length}]` }; 
        const debugMessage = `BotHub T2V Request. URL: ${url}. Status: PENDING.\nInputs:\n\`\`\`json\n${JSON.stringify(debugInputs, null, 2)}\n\`\`\``;
        
        if (envData && ctx && ctx.waitUntil) { 
            // Предполагаем, что logDebug определен
            ctx.waitUntil(logDebug("BotHub T2V", debugMessage, envData, ctx)); 
        }

        response = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) });
        errorText = await response.text();

        // --- ДЕБАГ #2: ЛОГИРОВАНИЕ ОТВЕТА (ФОНОВЫЙ) ---
        if (envData && ctx && ctx.waitUntil) { 
            ctx.waitUntil(logDebug("BotHub T2V", `Response received. Status: ${response.status}. Response Body:\n${errorText}`, envData, ctx)); 
        }

    } catch (e) {
        if (envData) { 
            try { 
                await logDebug("BotHub T2V", `CRITICAL FETCH ERROR: ${e.message}`, envData, ctx); 
            } catch (logError) { /* ignore */ }
        }
        throw new Error(`Ошибка сети/таймаута при вызове BotHub: ${e.message}`);
    }

    let data = {};

    if (!response.ok) {
        try { 
            data = JSON.parse(errorText); 
        } catch (e) { 
            if (envData) { 
                try {
                    await logDebug("BotHub T2V", `HTTP Ошибка ${response.status}. Не JSON ответ. Ответ: ${errorText.substring(0, 100)}...`, envData, ctx); 
                } catch (logError) { /* ignore */ }
            }
            throw new Error(`BotHub API HTTP Error: ${response.status}. Response: ${errorText.substring(0, 100)}...`);
        }
        
        const errorMessage = data.message || data.error?.message || JSON.stringify(data);

        if (envData) { 
            try {
                await logDebug("BotHub T2V", `HTTP Ошибка. Status: ${response.status}. Модель: ${model}. Сообщение: ${errorMessage}`, envData, ctx); 
            } catch (logError) { /* ignore */ }
        }
        
        if (response.status === 403) {
            throw new Error(`❌ BotHub API: ${response.status} Forbidden. Провайдер ${model} неактивен. Сообщение: ${errorMessage}`);
        }
        
        throw new Error(`❌ BotHub API Error (${model}): Status ${response.status} - ${errorMessage}`);
    }

    try { data = JSON.parse(errorText); } catch (e) {
        if (envData) { 
            try {
                await logDebug("BotHub T2V", `200 OK, but Invalid JSON: ${errorText.substring(0, 100)}...`, envData, ctx); 
            } catch (logError) { /* ignore */ }
        }
        throw new Error(`BotHub API: Successful request, but Invalid JSON response from server.`);
    }

    const operationId = data.id || data.job_id;

    if (!operationId) {
        if (envData) { 
            try {
                await logDebug("BotHub T2V", `Error. Request successful, but missing job_id/id. Response: ${JSON.stringify(data).substring(0, 200)}...`, envData, ctx); 
            } catch (logError) { /* ignore */ }
        }
        throw new Error(`BotHub Video Start Error: Successful request, but missing 'job_id'/'id' in response.`);
    }

    return operationId;
}

// ✅ 2.27. BotHub Image-to-Video (Runway gen3a_turbo) - Оживление изображения
// !!! ИЗМЕНЕНИЕ: Добавлен config и API_KEY_VALUE вместо BOTHUB_API_KEY !!!
async function startBotHubImageToVideo(config, prompt, imageBase64, imageMimeType, API_KEY_VALUE, chatId, DEBUG_CHAT_ID, TELEGRAM_BOT_TOKEN) {

    // 🚨 ИСПРАВЛЕНИЕ: Модель из конфига
    const model = config.MODEL; 
    const seconds = 4;
    
    // ⚠️ ВНИМАНИЕ: Оставлен хардкод URL, так как его BASE_URL отличается от TEXT-TO-VIDEO.
    const url = `https://api.bothub.chat/v1/video/generate`;

    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp|jpg);base64,/, "");

    const body = {
        model: model, // 🚨 ИСПРАВЛЕНИЕ: Модель из конфига
        prompt: prompt,
        seconds: seconds,
        image: {
            "bytesBase64Encoded": cleanBase64,
            "mimeType": imageMimeType
        }
    };

    const headers = {
        'Content-Type': 'application/json',
        // 🚨 ИСПРАВЛЕНИЕ: Ключ API из аргумента
        'Authorization': `Bearer ${API_KEY_VALUE}`
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
    });

    let data;
    const errorText = await response.text();
    
    // --- ДЕБАГ-ЛОГИРОВАНИЕ ---
    if (DEBUG_CHAT_ID && chatId.toString() === DEBUG_CHAT_ID) {
        await sendMessage(chatId, `🐛 BotHub I2V Debug Start Status: ${response.status}. Request Body (excluding image):\n<code>${JSON.stringify({ model, prompt, seconds }, null, 2)}</code>\n\nResponse Body:\n<code>${errorText}</code>`, TELEGRAM_BOT_TOKEN);
    }
    // ------------------------

    try {
        data = JSON.parse(errorText);
    } catch (e) {
        throw new Error(`BotHub API: Invalid JSON response. Status: ${response.status}`);
    }
    
    const operationId = data.job_id;

    if (!response.ok || !operationId) {
        const errorMessage = data.message || JSON.stringify(data);
        throw new Error(`BotHub Video Start Error (Image-to-Video): ${response.status} - ${errorMessage}`);
    }

    return operationId;
}

// ✅ 2.28. BotHub Video Status Check
// !!! ИЗМЕНЕНИЕ: Добавлен config и API_KEY_VALUE вместо BOTHUB_API_KEY !!!
async function checkBotHubVideoStatus(config, operationId, API_KEY_VALUE) {
    
    // 🚨 ИСПРАВЛЕНИЕ: Используем BASE_URL из конфига
    // Этот URL возвращает 404, что является ошибкой BotHub! (по вашей заметке, но оставляем его динамическим)
    const url = `${config.BASE_URL}/videos/${operationId}`;

    const headers = { 
        // 🚨 ИСПРАВЛЕНИЕ: Ключ API из аргумента
        'Authorization': `Bearer ${API_KEY_VALUE}` 
    };

    let response;
    let errorText;
    
    try {
        response = await fetch(url, { method: 'GET', headers: headers });
        errorText = await response.text();
    } catch (e) {
        throw new Error(`BotHub Network Error: ${e.message}`);
    }
    
    let data = {};

    if (!response.ok) {
        try { 
            data = JSON.parse(errorText); 
        } catch (e) { 
            // ❌ Мы ловим 404/403 здесь, так как ответ не JSON
            throw new Error(`BotHub Status Check Error (HTTP ${response.status}). BotHub не нашел эндпоинт для статуса.`);
        }
        const errorMessage = data.message || data.error?.message || JSON.stringify(data);
        throw new Error(`BotHub Video Status Check Error (HTTP ${response.status}): ${errorMessage}`);
    }

    try { 
        data = JSON.parse(errorText); 
    } catch (e) {
        throw new Error(`BotHub Status Check: Invalid JSON response from server.`);
    }

    const status = data.status || 'unknown';

    if (status === 'succeeded' && data.data && data.data.length > 0) {
        return { status: 'completed', videoUrl: data.data[0].url };
    } else if (status === 'pending' || status === 'running') {
        return { status: status };
    } else if (status === 'failed' || status === 'error') {
        return { status: 'failed', message: data.error_message || data.message || 'Video generation failed.' };
    }

    return { status: status };
}

// ✅ *** 2.29. callKandinskyText2Img (FusionBrain/Kandinsky) - ФИНАЛЬНАЯ РАБОЧАЯ ВЕРСИЯ ***
/**
 * Генерирует изображение по промпту через FusionBrain (Kandinsky).
 * Реализует 3-х шаговый процесс по API: Get Pipeline ID -> Run Generation (FormData) -> Check Status.
 */
async function callKandinskyText2Img(config, prompt, envData) {
    
    const API_KEY_ENV_NAME = config.API_KEY; 
    const API_SECRET_ENV_NAME = 'FUSIONBRAIN_SECRET_KEY'; 
    const BASE_URL = config.BASE_URL; 
    
    const API_KEY = envData[API_KEY_ENV_NAME]; 
    const API_SECRET = envData[API_SECRET_ENV_NAME]; 

    if (!API_KEY || !API_SECRET) { 
        throw new Error(`Kandinsky API keys are missing. Check ${API_KEY_ENV_NAME} and ${API_SECRET_ENV_NAME}.`); 
    }

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const AUTH_HEADERS = {
        'X-Key': `Key ${API_KEY}`,
        'X-Secret': `Secret ${API_SECRET}`,
    };
    
    // --- ШАГ 1: ПОЛУЧЕНИЕ UUID ПАЙПЛАЙНА (GET /key/api/v1/pipelines) ---
    const getPipelineUrl = `${BASE_URL}/key/api/v1/pipelines`;
    
    const pipelineResponse = await fetch(getPipelineUrl, {
        method: 'GET',
        headers: AUTH_HEADERS,
    });
    
    if (!pipelineResponse.ok) {
        const errorBody = await pipelineResponse.text();
        throw new Error(`FusionBrain Get Pipeline Error: ${pipelineResponse.status} - ${errorBody}`);
    }
    
    const pipelineData = await pipelineResponse.json();
    // Берем ID первого доступного пайплайна (как в Python примере: data[0]['id'])
    const pipelineId = pipelineData[0]?.id; 

    if (!pipelineId) {
        throw new Error("FusionBrain не вернул UUID пайплайна.");
    }

    // --- ШАГ 2: ЗАПУСК ГЕНЕРАЦИИ (POST /key/api/v1/pipeline/run) ---
    const runUrl = `${BASE_URL}/key/api/v1/pipeline/run`;
    
    const formData = new FormData();

    // Параметры 'params' должны быть строкой JSON
    const paramsJsonString = JSON.stringify({
        type: "GENERATE",
        numImages: 1,
        width: 1024,
        height: 1024,
        generateParams: {
            query: prompt,
        }
    });

    // Формат 'data' как в Python примере: 'params': (None, json.dumps(params), 'application/json')
    formData.append('pipeline_id', pipelineId); 
    formData.append('params', new Blob([paramsJsonString], { type: 'application/json' })); // Используем Blob для явного Content-Type

    const runResponse = await fetch(runUrl, {
        method: 'POST',
        headers: AUTH_HEADERS, // Передаем AUTH_HEADERS, без Content-Type
        body: formData 
    });
        
    if (!runResponse.ok) {
        const errorBody = await runResponse.text();
        throw new Error(`FusionBrain Run Error: ${runResponse.status} - ${errorBody}`);
    }

    const runData = await runResponse.json();
    const operationId = runData.uuid;

    if (!operationId) {
        throw new Error("FusionBrain не вернул ID операции (uuid) после run.");
    }
    
    // --- ШАГ 3: ПРОВЕРКА СТАТУСА (GET /key/api/v1/pipeline/status/{uuid}) ---
    // Уменьшаем задержку и общее время ожидания для обхода таймаута Cloudflare Worker (30-50 сек)
    const MAX_ATTEMPTS = 10; // 10 попыток
    const DELAY_MS = 5000;   // 5 секунд задержки
    // Общее время ожидания: 10 * 5 = 50 секунд.

    for (let i = 0; i < MAX_ATTEMPTS; i++) { 
        await delay(DELAY_MS); 

        // ✅ КРИТИЧЕСКИ: GET запрос и UUID в пути
        const checkUrl = `${BASE_URL}/key/api/v1/pipeline/status/${operationId}`; 
        
        const checkResponse = await fetch(checkUrl, {
            method: 'GET',
            headers: AUTH_HEADERS,
        });

        if (!checkResponse.ok) {
            const errorBody = await checkResponse.text();
            throw new Error(`FusionBrain Check Status Error: ${checkResponse.status} - ${errorBody}`);
        }

        const checkData = await checkResponse.json();
        const status = checkData.status;

        if (status === 'DONE') {
            // Результат в result.files[0]
            const base64Image = checkData.result?.files?.[0]; 
            if (!base64Image) {
                 throw new Error("FusionBrain вернул DONE, но изображение отсутствует.");
            }
            
            // ТРЕБУЕТСЯ: base64ToUint8Array
            return base64ToUint8Array(base64Image).buffer;
            
        } else if (status === 'FAIL') {
            throw new Error(`FusionBrain: Генерация не удалась (Status: FAIL). Описание: ${checkData.errorDescription || 'нет'}`);
        }
    }

    throw new Error("FusionBrain: Таймаут ожидания изображения (более 150 секунд).");
}

// ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ: callVoiceRSSTextToAudio
/**
 * Вызывает API VoiceRSS для конвертации текста в речь, используя унифицированный контракт Workers.
 * УНИФИЦИРОВАННЫЙ КОНТРАКТ: (config, prompt, envData)
 * @param {object} config - Объект конфигурации VoiceRSS.
 * @param {string} text - Текст для озвучивания.
 * @param {object} envData - Объект окружения (для получения API_KEY).
 * @returns {Promise<{audioBase64: string, mimeType: string}>} - Объект с данными аудио (Base64).
 */
async function callVoiceRSSTextToAudio(config, text, envData, requestedVoice) {
    const VOICE_MALE = 'Male';
    const VOICE_FEMALE = 'Female';
    
    // 1. Карта соответствия голосов
    const voiceMap = {
        [VOICE_MALE]: 'Peter', // Мужской голос
        [VOICE_FEMALE]: 'Olga'  // Женский голос
    };
    
    // 2. Определяем имя голоса для API (используем Peter по умолчанию)
    const apiVoiceName = voiceMap[requestedVoice] || voiceMap[VOICE_MALE]; 
    
    // 3. Получение API-ключа
    const apiKey = envData[config.API_KEY]; 

    if (!apiKey) {
        // Мы используем name, а не значение, поэтому VOICERSS_API_KEY
        throw new Error(`API ключ ${config.API_KEY} не найден в переменных окружения.`); 
    }
    
    // 4. Очистка старых параметров (убираем v=...) и добавление нового
    // Получаем строку параметров, например 'hl=ru-ru&v=Peter&c=MP3'
    let baseParams = config.MODEL; 
    
    // Убираем старый параметр v=... (если он есть)
    // Регулярное выражение ищет v=... и удаляет его или удаляет &v=...
    baseParams = baseParams.replace(/(?:&|^)v=[^&]*/i, '');
    
    // Добавляем новый параметр голоса
    const finalParams = `${baseParams}&v=${apiVoiceName}`;
    
    // 5. Кодирование текста и построение полного URL
    const encodedText = encodeURIComponent(text);
    
    const apiUrl = `${config.BASE_URL}/?key=${apiKey}&${finalParams}&src=${encodedText}&f=24khz_16bit_stereo`;
    
    // 4. Вызов API
    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            // Для совместимости с некоторыми серверами
            'User-Agent': 'TelegramBotWorker/1.0' 
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        // VoiceRSS возвращает явные ошибки, начинающиеся с "ERROR:"
        if (errorText.startsWith('ERROR:')) {
            throw new Error(`VoiceRSS API Ошибка: ${errorText}`);
        }
        throw new Error(`VoiceRSS HTTP Ошибка: ${response.status} ${response.statusText}`);
    }

    // 5. Обработка успешного ответа: ArrayBuffer -> Base64
    const arrayBuffer = await response.arrayBuffer();
    
    // 🛑 ИСПРАВЛЕНИЕ #1: Заменяем Buffer на унифицированный ArrayBuffer -> Base64
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const len = bytes.byteLength;
    
    for (let i = 0; i < len; i++) {
        // Преобразуем каждый байт в символ
        binary += String.fromCharCode(bytes[i]); 
    }
    
    // Глобальная функция btoa() доступна в среде Workers/браузера
    const audioBase64 = btoa(binary);

    // MimeType определяется форматом, указанным в параметрах (c=MP3)
    const mimeType = 'audio/mp3'; 
    
    return {
        audioBase64: audioBase64,
        mimeType: mimeType
    };
}

/**
 * ✅ startKieAiTextToImage - ФИНАЛЬНАЯ ASYNC ВЕРСИЯ (T2I) С CALLBACK.
 * Запускает генерацию Text-to-Image и ожидает, что KIE.AI отправит результат на Callback URL.
 * * @param {object} modelConfig - Конфигурация модели.
 * @param {string} prompt - Промпт пользователя (уже EN).
 * @param {object} envData - Объект окружения.
 * @param {string} chatId - ID чата.
 */
async function startKieAiTextToImage(modelConfig, prompt, envData, chatId) { 
    // --- 0. КОНФИГУРАЦИЯ И ПРОВЕРКИ ---
    if (!envData.WORKER_DOMAIN || !chatId) { /* ... */ }
    const token = envData.TELEGRAM_BOT_TOKEN;
    const STORAGE = envData.LAST_PHOTO_STORAGE; 
    const LAST_ACTIVE_TASK_KEY = chatId + "_active_image_task"; 

    // --- 1. ФОРМИРОВАНИЕ INPUT И CALLBACK URL ---
    const aspectRatio = '1:1'; // Используйте вашу логику получения размера
    const input = { prompt, output_format: 'png', aspect_ratio: aspectRatio, image_size: aspectRatio };
    const callbackUrl = `${envData.WORKER_DOMAIN}/api/kieai-callback?chatId=${chatId}`; 

    // --- 2. СОЗДАНИЕ ЗАДАНИЯ ЧЕРЕЗ УНИВЕРСАЛЬНУЮ ФУНКЦИЮ ---
    const taskId = await createTaskKieAi(chatId, modelConfig, input, envData, callbackUrl); 

    if (!taskId) { return null; }
    
    // --- 3. СОХРАНЕНИЕ TASK ID (для Callback'а) ---
    const taskDataToSave = {
        taskId: taskId,
        model: modelConfig.MODEL, 
    };
    
    await STORAGE.put(
        LAST_ACTIVE_TASK_KEY, 
        JSON.stringify(taskDataToSave),
        { expirationTtl: 60 * 60 * 24 }
    );

    // --- 4. УВЕДОМЛЕНИЕ О ЗАПУСКЕ ---
    await sendMessageMarkdown(
        chatId,
        `🎨 **Генерация изображения запущена!**\nМодель: \`${modelConfig.MODEL}\`\nJob ID: \`${taskId}\`\n\n*⚠️ Это может занять некоторое время. По готовности будет доставлено автоматически.*`,
        token
    );
    
    return taskId;
}

/**
 * ✅ startKieAiImageToImage - ФИНАЛЬНАЯ ASYNC CALLBACK ВЕРСИЯ (I2I).
 * * @param {object} modelConfig - Конфигурация модели.
 * @param {string} prompt - Промпт пользователя (уже EN).
 * @param {string} imageBase64 - Исходное изображение в Base64.
 * @param {object} envData - Данные окружения (STORAGE, WORKER_DOMAIN).
 * @param {number} height - Целевая высота.
 * @param {number} width - Целевая ширина.
 * @param {string} chatId - ID чата.
 * @returns {Promise<string>} Task ID.
 */
async function startKieAiImageToImage(modelConfig, prompt, imageBase64, envData, height, width, chatId) {
    // --- 0. КОНФИГУРАЦИЯ И ПРОВЕРКИ ---
    const token = envData.TELEGRAM_BOT_TOKEN;
    const STORAGE = envData.LAST_PHOTO_STORAGE; 
    const LAST_PROMPT_KEY = chatId + "_last_prompt"; 
    const LAST_ACTIVE_TASK_KEY = chatId + "_active_image_task";
    const callbackUrl = `${envData.WORKER_DOMAIN}/api/kieai-callback?chatId=${chatId}`; 
    
    if (!envData.WORKER_DOMAIN || !imageBase64 || !chatId) {
         await sendMessage(chatId, `❌ Критическая ошибка: Не хватает параметров для создания задания.`, token);
         return null;
    }
    
    // --- 1. КРИТИЧЕСКОЕ СОХРАНЕНИЕ: Base64 в KV и получение публичного URL ---
    let imageUrl;
    try {
        //await sendMessageMarkdown(chatId, "⏳ **Загружаю фото** на публичный сервер для Kie.Ai...", token);
        
        // 🛑 ИСПРАВЛЕНИЕ: Вызываем с типом 'i2i' для корректного пути.
        imageUrl = await uploadBase64ImageToPublicUrl(imageBase64, envData, chatId); 
        
        if (!imageUrl) { throw new Error("uploadBase64ImageToPublicUrl вернул пустой URL."); }

        // 🛑 СОХРАНЕНИЕ ПРОМПТА в KV
        await STORAGE.put(LAST_PROMPT_KEY, prompt, { expirationTtl: 60 * 60 * 24 });
    } catch (e) {
        const errorMsg = `Ошибка при подготовке фото/промпта: ${e.message.substring(0, 150)}`;
        await sendMessage(chatId, `❌ ${errorMsg}`, token);
        return null;
    }
    // --- 2. ФОРМИРОВАНИЕ INPUT (ВАША СЛОЖНАЯ ЛОГИКА) ---
    const actualRatio = width / height;
    let aspectRatio;

    // ... (логика определения aspectRatio для I2I) ...
    if (width === height) { aspectRatio = '1:1'; } 
    else if (actualRatio > 1) { 
        if (Math.abs(actualRatio - 1.777) < 0.1) { aspectRatio = '16:9'; } 
        else if (Math.abs(actualRatio - 1.333) < 0.1) { aspectRatio = '4:3'; } 
        else if (Math.abs(actualRatio - 1.5) < 0.1) { aspectRatio = '3:2'; } 
        else { aspectRatio = '4:3'; } 
    } else { 
        const inverseRatio = height / width; 
        if (Math.abs(inverseRatio - 1.777) < 0.1) { aspectRatio = '9:16'; } 
        else if (Math.abs(inverseRatio - 1.333) < 0.1) { aspectRatio = '3:4'; } 
        else if (Math.abs(inverseRatio - 1.5) < 0.1) { aspectRatio = '2:3'; } 
        else { aspectRatio = '3:4'; } 
    }
    // ... (Конец логики) ...

    const input = {
        prompt: prompt,
        image_urls: [imageUrl], // ✅ Теперь тут гарантированно рабочий URL
        output_format: 'png',
        image_size: aspectRatio 
    };

    // --- 3. СОЗДАНИЕ ЗАДАНИЯ ЧЕРЕЗ УНИВЕРСАЛЬНУЮ ФУНКЦИЮ ---
    const taskId = await createTaskKieAi(chatId, modelConfig, input, envData, callbackUrl); 
    
    if (!taskId) {
        // createTaskKieAi уже отправила сообщение об ошибке пользователю
        return null;
    }

    // --- 4. СОХРАНЕНИЕ TASK ID (для Callback'а) ---
    const taskDataToSave = {
        taskId: taskId,
        model: modelConfig.MODEL, 
    };
    
    await STORAGE.put(
        LAST_ACTIVE_TASK_KEY, 
        JSON.stringify(taskDataToSave),
        { expirationTtl: 60 * 60 * 24 }
    );

    // --- 5. УВЕДОМЛЕНИЕ О ЗАПУСКЕ ---
    await sendMessageMarkdown(
        chatId,
        `✨ **Улучшение фото запущено!**\nМодель: \`${modelConfig.MODEL}\`\nJob ID: \`${taskId}\`\n\n*⚠️ Это может занять некоторое время. По готовности будет доставлено автоматически.*`,
        token
    );
    return taskId;
}

/**
 * @description Запускает асинхронную задачу апскейла (UPSCALE) через Kie.ai API (Task/Callback).
 * * ✅ Шаблон аналогичен startKieAiImageToImage:
 * 1. Загрузка Base64 на публичный URL.
 * 2. Вызов универсальной createTaskKieAi с URL.
 * 3. Сохранение Task ID в KV.
 * * @param {object} modelConfig - Конфигурация модели (KIEAI_UPSCALE).
 * @param {string} prompt - Промпт (может быть проигнорирован upscaler'ом).
 * @param {string} originalBase64 - Исходное изображение в Base64.
 * @param {object} envData - Данные окружения (STORAGE, WORKER_DOMAIN).
 * @param {number} finalHeight - Целевая высота (игнорируется upscaler'ом, но для контракта).
 * @param {number} finalWidth - Целевая ширина (игнорируется upscaler'ом, но для контракта).
 * @param {string} chatId - ID чата.
 * @returns {Promise<string|null>} Task ID или null в случае критической ошибки.
 */
async function startKieAiImageToUpscale(modelConfig, prompt, originalBase64, envData, finalHeight, finalWidth, chatId) {
    // --- 0. КОНФИГУРАЦИЯ И ПРОВЕРКИ ---
    const token = envData.TELEGRAM_BOT_TOKEN;
    const STORAGE = envData.LAST_PHOTO_STORAGE; 
    // Используем общий ключ для отслеживания активной задачи, как в ваших примерах I2I/T2I
    const LAST_ACTIVE_TASK_KEY = chatId + "_active_image_task"; 
    
    // URL для колбэка
    const callbackUrl = `${envData.WORKER_DOMAIN}/api/kieai-callback?chatId=${chatId}`; 
    
    if (!envData.WORKER_DOMAIN || !originalBase64 || !chatId) {
        return null;
    }
    
    // --- 1. КРИТИЧЕСКОЕ СОХРАНЕНИЕ: Base64 в KV и получение публичного URL ---
    let imageUrl;
    try {
        // UploadBase64ImageToPublicUrl для получения URL, который Kie.ai сможет прочитать.
        imageUrl = await uploadBase64ImageToPublicUrl(originalBase64, envData, chatId); 
        
        if (!imageUrl) { throw new Error("uploadBase64ImageToPublicUrl вернул пустой URL."); }
        
    } catch (e) {
        const errorMsg = `Ошибка при подготовке фото для Kie.Ai: ${e.message.substring(0, 150)}`;
        await sendMessage(chatId, `❌ ${errorMsg}`, token);
        
        // 🛑 ВАЖНО: Бросаем ошибку, чтобы она попала в блок catch в processUpscaleGenerateCommand
        // и был гарантирован возврат кредита.
        throw new Error(errorMsg); 
    }
    
    // --- 2. ФОРМИРОВАНИЕ INPUT ---
    // Для upscaler'а 'recraft/crisp-upscale' нужен только URL исходного изображения.
    const input = {
        image: imageUrl, // ✅ Передаем публичный URL изображения
    };

    // --- 3. СОЗДАНИЕ ЗАДАНИЯ ЧЕРЕЗ УНИВЕРСАЛЬНУЮ ФУНКЦИЮ ---
    const taskId = await createTaskKieAi(chatId, modelConfig, input, envData, callbackUrl); 
    
    if (!taskId) {
        // createTaskKieAi уже отправила сообщение об ошибке пользователю
        return null;
    }

    // --- 4. СОХРАНЕНИЕ TASK ID (для Callback'а) ---
    const taskDataToSave = {
        taskId: taskId,
        model: modelConfig.MODEL, 
        service: 'UPSCALE', // Добавляем метку, чтобы callback знал, что это upscaling
    };
    
    await STORAGE.put(
        LAST_ACTIVE_TASK_KEY, 
        JSON.stringify(taskDataToSave),
        { expirationTtl: 60 * 60 * 24 } // 24 часа
    );

    // --- 5. УВЕДОМЛЕНИЕ О ЗАПУСКЕ ---
    await sendMessageMarkdown(
        chatId,
        `✨ **Улучшение качества изображения запущено!**\nМодель: \`${modelConfig.MODEL}\`\nJob ID: \`${taskId}\`\n\n*⚠️ Это может занять некоторое время. Результат будет доставлен автоматически.*`,
        token
    );
    return taskId;
}

/**
 * ✅ startKieAiTextToVideo Запускает генерацию Text-to-Video через KIE.ai API (Grok Imagine).
 * 🛑 АСИНХРОННАЯ ВЕРСИЯ С CALLBACK.
 * @param {object} modelConfig - Конфигурация модели (MODEL, BASE_URL).
 * @param {string} prompt - Текст для генерации видео.
 * @param {string} apiKey - KIEAI_API_KEY.
 * @param {object} envData - Объект с переменными окружения (для доступа к LAST_PHOTO_STORAGE).
 * @param {object} videoParams - Параметры видео (seconds, aspectRatio).
 * @param {string} chatId - ID чата (НОВЫЙ ПАРАМЕТР).
 * @returns {Promise<string>} - TaskId (для сохранения в LAST_PHOTO_STORAGE).
 * @throws {Error} - В случае ошибки API.
 */
async function startKieAiTextToVideo(modelConfig, prompt, apiKey, envData, videoParams, chatId) { // Оставил старую сигнатуру для совместимости
    const token = envData.TELEGRAM_BOT_TOKEN;
    const storage = envData.LAST_PHOTO_STORAGE;
    const numericChatId = Number(chatId);

    // 🛑 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Загружаем маппированные параметры
    const apiParams = await getUserVideoParams(envData);
        
    const callbackUrl = `${envData.WORKER_DOMAIN}/api/kieai-callback?chatId=${chatId}`;

    const input = {
        prompt: prompt,
        aspect_ratio: apiParams.aspectRatioKieAi, // ✅ Берем из новой функции
        duration: apiParams.duration,           // ✅ Берем из новой функции
        quality: apiParams.quality,             // ✅ Берем из новой функции
        mode: 'normal' 
    };

    // --- ДЕБАГ-ЛОГИРОВАНИЕ --- (оставляем без изменений)
    if (envData.DEBUG_ENABLED && envData.DEBUG_CHAT_ID) {
        await sendMessageMarkdown(envData.DEBUG_CHAT_ID, `🛠️ *[KIE.ai Request]*\n\n*Chat ID:* ${chatId}\n*Model:* ${modelConfig.MODEL}\n*Prompt:* \`${prompt}\`\n\n*Body:*\n\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\``, envData.TELEGRAM_BOT_TOKEN);
    }

     // --- 2. СОЗДАНИЕ ЗАДАНИЯ ЧЕРЕЗ УНИВЕРСАЛЬНУЮ ФУНКЦИЮ ---
    const taskId = await createTaskKieAi(chatId, modelConfig, input, { ...envData}, callbackUrl); 

    if (!taskId) { 
        // createTaskKieAi уже отправила сообщение об ошибке пользователю
        return null;
    }
    
    // --- 3. СОХРАНЕНИЕ TASK ID ---
    const LAST_ACTIVE_TASK_KEY = chatId.toString() + '_active_video_task';
    const taskData = { 
        taskId: taskId, 
        model: modelConfig.MODEL, 
    }; 
    await storage.put(LAST_ACTIVE_TASK_KEY, JSON.stringify(taskData), { expirationTtl: 60 * 60 * 24 });

    // --- 4. УВЕДОМЛЕНИЕ (Асинхронный режим) ---
    await sendMessageMarkdown(
        numericChatId,
        `🎥 **Генерация видео запущена!**\nМодель: \`${modelConfig.MODEL}\`\nJob ID: \`${taskId}\`\n\n*⚠️ Это может занять некоторое время. По готовности будет доставлено автоматически.*`,
        token
    );
    return taskId;
}

/**
 * ✅ startKieAiImageToVideo Запускает генерацию Image-to-Video через KIE.ai API (Grok Imagine).
 *
 * @param {object} modelConfig - Конфигурация модели (MODEL, BASE_URL).
 * @param {string} prompt - Текст для генерации движения.
 * @param {string} imageUrl - Публичный URL исходного изображения (должен быть URL, а не Base64).
 * @param {string} mimeType - MIME-тип изображения (игнорируется KIE.ai API).
 * @param {string} apiKey - KIEAI_API_KEY.
 * @param {string} chatId - ID чата.
 * @param {string} debugChatId - ID чата для дебага.
 * @param {string} telegramBotToken - Токен бота.
 * @param {*} envData 
 * @returns {Promise<string>} - TaskId.
 * @throws {Error} - В случае ошибки API.
 */
async function startKieAiImageToVideo(modelConfig, prompt, imageUrl, mimeType, apiKey, chatId, debugChatId, telegramBotToken, envData) { 
    
    const storage = envData.LAST_PHOTO_STORAGE;
    const token = envData.TELEGRAM_BOT_TOKEN;
    const LAST_ACTIVE_TASK_KEY_SUFFIX = '_active_video_task'; 
    // 🛑 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ #2: Загружаем маппированные параметры через новую функцию
    const apiParams = await getUserVideoParams(envData);
    
    // 🛑 КРИТИЧНО: Формирование Callback URL
    const callbackUrl = `${envData.WORKER_DOMAIN}/api/kieai-callback?chatId=${chatId}`;

    // ✅ Формируем ТОЛЬКО объект 'input'
    const input = {
        image_urls: [imageUrl], 
        prompt: prompt,         
        aspect_ratio: apiParams.aspectRatioKieAi, // ✅ Берем из новой функции
        duration: apiParams.duration,             // ✅ Берем из новой функции
        quality: apiParams.quality,              // ✅ Берем из новой функции
        mode: 'normal' 
    };

    // 💡 ЛУЧШИЙ ПОДХОД: ФОНОВОЕ ДЕБАГ-ЛОГИРОВАНИЕ (НЕБЛОКИРУЮЩЕЕ)
    if (envData.DEBUG_ENABLED && envData.DEBUG_CHAT_ID) {
        // Определяем константы для удобства
        const logText = `🛠️ *[KIE.ai Request]*\n\n*Chat ID:* ${chatId}\n*Model:* ${modelConfig.MODEL}\n*Prompt:* \`${prompt}\`\n\n*Body:*\n\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\``;
        const logChatId = envData.DEBUG_CHAT_ID;
        // 🟢 Используем ctx.waitUntil, чтобы отправить лог в фоне
        envData.ctx.waitUntil(
            sendMessageMarkdown(
                logChatId, 
                logText, 
                telegramBotToken
            ).catch(e => {
                // Важно добавить обработку ошибок для фонового процесса
                console.error("Async Debug Log Failed:", e);
            })
        );
    } // ✅ Основной код продолжает выполняться немедленно
    // --- 2. СОЗДАНИЕ ЗАДАНИЯ ЧЕРЕЗ УНИВЕРСАЛЬНУЮ ФУНКЦИЮ ---
    const taskId = await createTaskKieAi(chatId, modelConfig, input, { ...envData, chatId }, callbackUrl); 

    if (!taskId) { 
        return null;
    }
    
    // --- 3. СОХРАНЕНИЕ TASK ID ---
    const LAST_ACTIVE_TASK_KEY = chatId.toString() + LAST_ACTIVE_TASK_KEY_SUFFIX; 
    const taskData = { 
        taskId: taskId, 
        model: modelConfig.MODEL,
    };
    await storage.put(LAST_ACTIVE_TASK_KEY, JSON.stringify(taskData), { expirationTtl: 60 * 60 * 24 });

    // --- 4. УВЕДОМЛЕНИЕ О ЗАПУСКЕ ---
    await sendMessageMarkdown(
        chatId,
        `🎥 **Оживление видео запущено!**\nМодель: \`${modelConfig.MODEL}\`\nJob ID: \`${taskId}\`\n\n*⚠️ Это может занять некоторое время. По готовности будет доставлено автоматически.*`,
        token
    );
    return taskId;
}

// ✅ startKieAiWanVideo2Video - Запускает асинхронную задачу Wan Video-to-Video через KIE.AI
async function startKieAiWanVideo2Video(activeModelConfig, imageUrl, videoUrl, API_KEY_VALUE, chatId, envData) { 
    const storage = envData.LAST_PHOTO_STORAGE;
    const token = envData.TELEGRAM_BOT_TOKEN;
    const LAST_ACTIVE_TASK_KEY_SUFFIX = '_active_video_task';

    // 🛑 КРИТИЧНО: Формирование Callback URL
    const callbackUrl = `${envData.WORKER_DOMAIN}/api/kieai-callback?chatId=${chatId}`;

    // ✅ Формируем объект 'input' для Wan 2.2 Animate API
    // Документация требует video_url, image_url и опционально resolution
    const input = {
        video_url: videoUrl, 
        image_url: imageUrl,
        resolution: "480p", // Используем 480p по умолчанию
    };

    // --- 1. ЛОГИРОВАНИЕ ---
    if (envData.DEBUG_ENABLED && envData.DEBUG_CHAT_ID) {
        const debugMessage = `🛠️ *[KIE.ai Wan Animate Request]*\n\n*Chat ID:* ${chatId}\n*Model:* ${activeModelConfig.MODEL}\n\n*Input Body:*\n\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\`\n\n*Callback URL:* \`${callbackUrl}\``;
        await sendMessageMarkdown(envData.DEBUG_CHAT_ID, debugMessage, envData.TELEGRAM_BOT_TOKEN);
    }

    // --- 2. СОЗДАНИЕ ЗАДАНИЯ ЧЕРЕЗ УНИВЕРСАЛЬНУЮ ФУНКЦИЮ createTaskKieAi ---
    // Здесь мы передаем activeModelConfig.BASE_URL = 'https://api.kie.ai/api/v1/jobs/createTask'
    const taskId = await createTaskKieAi(chatId, activeModelConfig, input, { ...envData, chatId }, callbackUrl);

    if (!taskId) { 
        return null;
    }
    
    // --- 3. СОХРАНЕНИЕ TASK ID ---
    const LAST_ACTIVE_TASK_KEY = chatId.toString() + LAST_ACTIVE_TASK_KEY_SUFFIX; 
    const taskData = { 
        taskId: taskId, 
        model: activeModelConfig.MODEL,
    };
    await storage.put(LAST_ACTIVE_TASK_KEY, JSON.stringify(taskData), { expirationTtl: 60 * 60 * 24 });
    
    // --- 4. УВЕДОМЛЕНИЕ О ЗАПУСКЕ ---
    await sendMessageMarkdown(
        chatId,
        `🎬 **Анимация персонажа запущена!**\nМодель: \`${activeModelConfig.MODEL}\`\nJob ID: \`${taskId}\`\n\n*⚠️ Это может занять некоторое время. По готовности будет доставлено автоматически.*`,
        token
    );
    return taskId;
}

// ✅ startKieAiKlingVideo2Video - Запускает асинхронную задачу Kling Video-to-Video через KIE.AI
async function startKieAiKlingVideo2Video(activeModelConfig, imageUrl, videoUrl, API_KEY_VALUE, chatId, envData) { 
    const storage = envData.LAST_PHOTO_STORAGE;
    const token = envData.TELEGRAM_BOT_TOKEN;
    const LAST_ACTIVE_TASK_KEY_SUFFIX = '_active_video_task';

    // 🛑 КРИТИЧНО: Формирование Callback URL
    const callbackUrl = `${envData.WORKER_DOMAIN}/api/kieai-callback?chatId=${chatId}`;

    // Документация требует input_urls для фото и video_urls для видео
    const input = {
        input_urls: imageUrl,
        video_urls: videoUrl, 
        prompt: "Change character from photo on video",
        character_orientation: "video",
        mode: "720p" // Используем 720p по умолчанию
    };

    // --- 1. ЛОГИРОВАНИЕ ---
    if (envData.DEBUG_ENABLED && envData.DEBUG_CHAT_ID) {
        const debugMessage = `🛠️ *[KIE.ai Kling Video2Video Request]*\n\n*Chat ID:* ${chatId}\n*Model:* ${activeModelConfig.MODEL}\n\n*Input Body:*\n\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\`\n\n*Callback URL:* \`${callbackUrl}\``;
        await sendMessageMarkdown(envData.DEBUG_CHAT_ID, debugMessage, envData.TELEGRAM_BOT_TOKEN);
    }

    // --- 2. СОЗДАНИЕ ЗАДАНИЯ ЧЕРЕЗ УНИВЕРСАЛЬНУЮ ФУНКЦИЮ createTaskKieAi ---
    // Здесь мы передаем activeModelConfig.BASE_URL = 'https://api.kie.ai/api/v1/jobs/createTask'
    const taskId = await createTaskKieAi(chatId, activeModelConfig, input, { ...envData, chatId }, callbackUrl);

    if (!taskId) { 
        return null;
    }
    
    // --- 3. СОХРАНЕНИЕ TASK ID ---
    const LAST_ACTIVE_TASK_KEY = chatId.toString() + LAST_ACTIVE_TASK_KEY_SUFFIX; 
    const taskData = { 
        taskId: taskId, 
        model: activeModelConfig.MODEL,
    };
    await storage.put(LAST_ACTIVE_TASK_KEY, JSON.stringify(taskData), { expirationTtl: 60 * 60 * 24 });
    
    // --- 4. УВЕДОМЛЕНИЕ О ЗАПУСКЕ ---
    await sendMessageMarkdown(
        chatId,
        `🎬 **Редактирование персонажа запущена!**\nМодель: \`${activeModelConfig.MODEL}\`\nJob ID: \`${taskId}\`\n\n*⚠️ Это может занять некоторое время. По готовности будет доставлено автоматически.*`,
        token
    );
    return taskId;
}

/**
 * ✅ startKieAiVideoUpscale - Запускает асинхронную задачу Video Upscale (Video-Upscale) через KIE.AI
 * * @param {object} activeModelConfig - Конфигурация модели (MODEL, BASE_URL).
 * @param {string} previousTaskId - Task ID ранее сгенерированного видео (Обязательный параметр для API). 
 * @param {string} upscaleFactor - Фактор апскейла ('2' или '4'). // <-- ЭТОТ ПАРАМЕТР НЕ НУЖЕН API, НО ОСТАВЛЯЕМ В СИГНАТУРЕ
 * @param {string} API_KEY_VALUE - API ключ для KIE.AI.
 * @param {number} chatId - ID чата для логов.
 * @param {object} envData - Объект окружения (включая ctx и DEBUG_CHAT_ID).
 * @returns {Promise<string>} Возвращает taskId.
 */
// 🛑 ПЕРЕИМЕНОВАНИЕ: Переименовываем publicVideoUrl в previousTaskId (или убедитесь, что сюда передается Task ID)
async function startKieAiVideoUpscale(activeModelConfig, previousTaskId, upscaleFactor, API_KEY_VALUE, chatId, envData) { 
    const storage = envData.LAST_PHOTO_STORAGE;
    const token = envData.TELEGRAM_BOT_TOKEN;
    const LAST_ACTIVE_TASK_KEY_SUFFIX = '_active_video_task';

    // 🛑 КРИТИЧНО: Формирование Callback URL
    const callbackUrl = `${envData.WORKER_DOMAIN}/api/kieai-callback?chatId=${chatId}`;

    // ✅ Формируем ТОЛЬКО объект 'input'
    const input = {
        task_id: previousTaskId, // Task ID предыдущего задания
    };

    // 🛑 ОБНОВЛЕННЫЙ БЛОК ДЕБАГ-ЛОГИРОВАНИЯ
    if (envData.DEBUG_ENABLED && envData.DEBUG_CHAT_ID) {
        const debugMessage = `🛠️ *[KIE.ai V2V Request]*\n\n*Chat ID:* ${chatId}\n*Model:* ${activeModelConfig.MODEL}\n\n*Input Body:*\n\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\`\n\n*Upscale Target Task ID:* \`${previousTaskId}\``;
        await sendMessageMarkdown(envData.DEBUG_CHAT_ID, debugMessage, envData.TELEGRAM_BOT_TOKEN);
    }

    // --- 2. СОЗДАНИЕ ЗАДАНИЯ ЧЕРЕЗ УНИВЕРСАЛЬНУЮ ФУНКЦИЮ ---
    const taskId = await createTaskKieAi(chatId, activeModelConfig, input, { ...envData, chatId }, callbackUrl);

    if (!taskId) { 
        return null;
    }
    
    // --- 3. СОХРАНЕНИЕ TASK ID ---
    const LAST_ACTIVE_TASK_KEY = chatId.toString() + LAST_ACTIVE_TASK_KEY_SUFFIX; 
    const taskData = { 
        taskId: taskId, 
        model: activeModelConfig.MODEL,
    };
    await storage.put(LAST_ACTIVE_TASK_KEY, JSON.stringify(taskData), { expirationTtl: 60 * 60 * 24 });
    
    // Логирование для отладки
    if (envData.DEBUG_ENABLED && envData.DEBUG_CHAT_ID) {
        envData.ctx.waitUntil(sendMessage(envData.DEBUG_CHAT_ID, `[DEBUG V2V] Task Created. ID: ${taskId.substring(0, 10)}. Target Task ID: ${previousTaskId}`, envData.TELEGRAM_BOT_TOKEN));
    }

    // --- 4. УВЕДОМЛЕНИЕ О ЗАПУСКЕ ---
    await sendMessageMarkdown(
        chatId,
        `🚀 **Апскейл видео запущен!**\nМодель: \`${activeModelConfig.MODEL}\`\nJob ID: \`${taskId}\`\n\n*⚠️ Это может занять некоторое время. По готовности будет доставлено автоматически.*`,
        token
    );
    return taskId;
}

/**
 * ✅ startKieAiAudio2Video - Создает задачу Audio-to-Video (A2V) через KIE.AI InfiniTalk API.
 * 🛑 Усилены проверки и добавлено логирование ошибок.
 * * @param {object} config - Объект активной конфигурации AUDIO_TO_VIDEO_KIEAI.
 * @param {string} prompt - Текст промпта.
 * @param {object} envData - Объект окружения (содержит токены, ID, URL, storage, ctx).
 * @param {object} videoParams - Параметры видео.
 * @param {string} chatId - ID чата (НОВЫЙ ПАРАМЕТР).
 * @returns {Promise<{taskId: string} | null>} - Task ID или null в случае ошибки.
 */
async function startKieAiAudio2Video(config, prompt, envData, videoParams, chatId) {
    const PHOTO_URL_KEY_SUFFIX = '_photo_url';
    const AUDIO_URL_KEY_SUFFIX = '_audio_url';
    const token = envData.TELEGRAM_BOT_TOKEN;
    const LAST_ACTIVE_TASK_KEY_SUFFIX = '_active_video_task';
    
    const chatKey = chatId;
    const STORAGE = envData.LAST_PHOTO_STORAGE; 
    // ВЫЗВАТЬ ЛОГ: 
    envData.ctx.waitUntil(logDebug('STORAGE_CHECK', `Storage value: ${typeof STORAGE}`, envData));

    if (!STORAGE || typeof STORAGE.get !== 'function') {
        // Логируем ошибку, чтобы увидеть, что именно отсутствует
        envData.ctx.waitUntil(logDebug('A2V_FATAL_STORAGE', `LAST_PHOTO_STORAGE: ${STORAGE}`, envData));
        await sendMessage(chatKey, "❌ Внутренняя ошибка: Хранилище медиафайлов недоступно. Уведомление отправлено администратору.", token);
        return null;
    }
    
    // --- 1. Сбор данных из KV ---
    const photoUrl = await STORAGE.get(chatKey + PHOTO_URL_KEY_SUFFIX);
    const audioUrl = await STORAGE.get(chatKey + AUDIO_URL_KEY_SUFFIX); 
    
    // КРИТИЧЕСКАЯ ПРОВЕРКА №2: Наличие медиафайлов
    if (!photoUrl) {
        envData.ctx.waitUntil(logDebug('A2V_MISSING_PHOTO', `Photo URL не найден по ключу: ${chatKey + PHOTO_URL_KEY_SUFFIX}`, envData));
        await sendMessageMarkdown(chatKey, "⚠️ Для создания аватара требуется **загруженное фото**", token);
        return null;
    }
    if (!audioUrl) {
        envData.ctx.waitUntil(logDebug('A2V_MISSING_AUDIO', `Audio URL не найден по ключу: ${chatKey + AUDIO_URL_KEY_SUFFIX}`, envData));
        await sendMessageMarkdown(chatKey, "⚠️ Для создания аватара требуется **загруженный аудиофайл**.", token);
        return null;
    }
    
    // --- 2. Формирование Input-объекта для KIE.AI ---
    const inputPayload = {
        image_url: photoUrl, 
        audio_url: audioUrl,
        prompt: prompt || 'A detailed talking avatar video.', 
        resolution: videoParams.resolution || config.DEFAULT_RESOLUTION || '480p',
    };

    // --- 3. Вызов универсальной функции Task Create ---
    
    // /api/kieai-callback?chatId=502248112
    const callBackUrl = `${envData.WORKER_DOMAIN}/api/kieai-callback?chatId=${chatKey}`;
    envData.chatKey = chatKey; 
    
    const taskId = await createTaskKieAi(
        chatId, 
        config, 
        inputPayload, 
        envData, 
        callBackUrl
    );

    if (taskId) {
        // --- 4. Сохранение Task ID в KV ---
        const LAST_ACTIVE_TASK_KEY = chatKey + LAST_ACTIVE_TASK_KEY_SUFFIX; 
        
        // Формат данных для сохранения (как требуется вашей системе)
        const taskData = { 
            taskId: taskId, 
            model: config.MODEL, // Модель должна быть в объекте конфигурации KieAi
        };
        
        // Сохраняем JSON-строку
        envData.ctx.waitUntil(STORAGE.put(LAST_ACTIVE_TASK_KEY, JSON.stringify(taskData), { expirationTtl: 3600 })); 
        
        // Логирование для подтверждения, что ключ теперь правильный
        envData.ctx.waitUntil(logDebug('A2V_TASK_SAVED', `Task ${taskId} saved to KV key: ${LAST_ACTIVE_TASK_KEY}`, envData));
        
        return { taskId: taskId };
    }
    
    return null;
}

// ✅ *** startKieAiTextToAudio - Запускает асинхронную задачу Text-to-Speech (TTS) через KIE.AI
/**
 * @description Запускает асинхронную задачу TTS (ElevenLabs) через KIE.AI.
 * @param {Object} config - Конфигурация модели (AI_MODELS.TEXT_TO_AUDIO_KIEAI).
 * @param {string} textToSpeak - Текст для озвучивания.
 * @param {Object} envData - Объект окружения (включая токены, ID, storage, ctx, WORKER_DOMAIN).
 * @param {string} requestedVoice - Запрошенный голос ('Rachel', 'Aria', и т.д.).
 * @param {number} chatId - ID чата для колбэка и логов.
 * @returns {Promise<{taskId: string} | null>} - Объект с Task ID или null в случае ошибки.
 */
async function startKieAiTextToAudio(config, textToSpeak, envData, requestedVoice, chatId) { 
    const LAST_ACTIVE_TASK_KEY_SUFFIX = '_active_tts_task'; // Новый суффикс для TTS
    const storage = envData.LAST_PHOTO_STORAGE;
    const token = envData.TELEGRAM_BOT_TOKEN;
    // 1. Определение голоса ElevenLabs
    const VOICE_MAP = {
        'Male': 'Roger',     // Имя голоса ElevenLabs для Мужского
        'Female': 'Rachel'   // Имя голоса ElevenLabs для Женского
    };

    // Сопоставляем 'Male' или 'Female' с именем голоса ElevenLabs
    const elevenLabsVoice = VOICE_MAP[requestedVoice] || 'Rachel';
    // Проверка лимита длины текста
    if (textToSpeak.length > 5000) {
        await sendMessage(chatId, "❌ Ошибка: Максимальная длина текста для озвучивания — 5000 символов.", token);
        return null;
    }
    // ПРОВЕРКА CHAT ID (Ваша ошибка 'chatId: undefined' в логе)
    if (!chatId) {
        throw new Error("Chat ID is missing for Kie.ai callback URL construction.");
    }
    // 🛑 КРИТИЧНО: Формирование Callback URL
    const callBackUrl = `${envData.WORKER_DOMAIN}/api/kieai-callback?chatId=${chatId}`;

    // ✅ Формируем ТОЛЬКО объект 'input'
    const input = {
        text: textToSpeak, 
        voice: elevenLabsVoice, // <-- Теперь передается 'Roger' или 'Rachel'
        // Параметры по умолчанию, если не заданы в UI/запросе
        stability: 0.5,
        similarity_boost: 0.75,
        speed: 1,
        // language_code: 'ru', // Можно добавить для принудительного языка, если требуется
    };
    
    // 🛑 БЛОК ДЕБАГ-ЛОГИРОВАНИЯ
    if (envData.DEBUG_ENABLED && envData.DEBUG_CHAT_ID) {
        const debugMessage = `🛠️ *[KIE.ai TTS Request]*\n\n*Chat ID:* ${chatId}\n*Model:* ${config.MODEL}\n\n*Input Body:*\n\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\`\n\n*Text Length:* ${textToSpeak.length}`;
        await sendMessageMarkdown(envData.DEBUG_CHAT_ID, debugMessage, token);
    }

    // --- 2. СОЗДАНИЕ ЗАДАНИЯ ЧЕРЕЗ УНИВЕРСАЛЬНУЮ ФУНКЦИЮ ---
    const taskId = await createTaskKieAi(chatId, config, input, envData, callBackUrl);

    if (!taskId) { 
        return null;
    }
    
    // --- 3. СОХРАНЕНИЕ TASK ID (для обработки колбэка) ---
    const LAST_ACTIVE_TASK_KEY = chatId.toString() + LAST_ACTIVE_TASK_KEY_SUFFIX; 
    const taskData = { 
        taskId: taskId, 
        model: config.MODEL,
        outputMediaType: 'audio', // КЛЮЧЕВОЙ параметр для колбэк-обработчика
    };
    await storage.put(LAST_ACTIVE_TASK_KEY, JSON.stringify(taskData), { expirationTtl: 60 * 60 * 24 });
    
    // Логирование для отладки
    envData.ctx.waitUntil(logDebug("KIEAI_TTS_TASK_CREATED", `Task Created. ID: ${taskId}`, envData));

    // --- 4. УВЕДОМЛЕНИЕ О ЗАПУСКЕ ---
    await sendMessageMarkdown(
        chatId,
        `🎤 **Генерация речи (TTS) запущена!**\nМодель: \`${config.MODEL}\`\nГолос: \`${input.voice}\`\nJob ID: \`${taskId}\`\n\n*⚠️ По готовности аудио будет доставлено автоматически.*`,
        token
    );
    
    return { taskId: taskId }; 
}

// ✅ *** startKieAiAudioIsolation - Запускает задачу изоляции/конвертации аудио
/**
 * @description Запускает асинхронную задачу Audio Isolation/Conversion через KIE.AI.
 * @param {Object} config - Конфигурация модели (AI_MODELS.AUDIO_ISOLATION_KIEAI).
 * @param {string} fileUrl - URL аудио/видео файла для обработки (или Storage ID для видео).
 * @param {Object} envData - Объект окружения.
 * @param {number} chatId - ID чата для колбэка и логов.
 * @returns {Promise<{taskId: string} | null>} - Объект с Task ID или null в случае ошибки.
 */
async function startKieAiAudioIsolation(config, fileUrl, envData, chatId) { 
    const LAST_ACTIVE_TASK_KEY_SUFFIX = '_active_audio_isolation_task';
    const storage = envData.LAST_PHOTO_STORAGE;
    const token = envData.TELEGRAM_BOT_TOKEN;
    
    // 🛑 КРИТИЧНО: Формирование Callback URL
    const callBackUrl = `${envData.WORKER_DOMAIN}/api/kieai-callback?chatId=${chatId}`;
    
    // ✅ Формируем ТОЛЬКО объект 'input'
    const input = {
        // fileUrl теперь ВСЕГДА содержит Telegram URL (для .mp3, .ogg, .opus)
        audio_url: fileUrl, 
    };
    
    // --- 2. СОЗДАНИЕ ЗАДАНИЯ ЧЕРЕЗ УНИВЕРСАЛЬНУЮ ФУНКЦИЮ ---
    // Предполагаем, что createTaskKieAi обрабатывает логирование и ошибки API
    const taskId = await createTaskKieAi(chatId, config, input, envData, callBackUrl);

    if (!taskId) { 
        return null;
    }
    
    // --- 3. СОХРАНЕНИЕ TASK ID (для обработки колбэка) ---
    const LAST_ACTIVE_TASK_KEY = chatId.toString() + LAST_ACTIVE_TASK_KEY_SUFFIX; 
    const taskData = { 
        taskId: taskId, 
        model: config.MODEL,
        outputMediaType: 'audio', // Результат всегда MP3/Audio
        // Можно добавить информацию об исходном файле, если нужно для подписи
        // originalFileName: '...' 
        "fileName": "audio_source.mp3", // 🛑 ИСПОЛЬЗУЕМ РАСШИРЕНИЕ MP3
    };
    await storage.put(LAST_ACTIVE_TASK_KEY, JSON.stringify(taskData), { expirationTtl: 60 * 60 * 24 });
    
    envData.ctx.waitUntil(logDebug("KIEAI_AUDIO_ISO_TASK_CREATED", `Task Created. ID: ${taskId}`, envData));

    // --- 4. УВЕДОМЛЕНИЕ О ЗАПУСКЕ ---
    await sendMessageMarkdown(
        chatId,
        `💿 **Задача Audio Isolation запущена!**\nКонвертируем файл и изолируем голос...\nJob ID: \`${taskId}\`\n\n*⚠️ Аудио будет доставлено автоматически.*`,
        token
    );
    
    return { taskId: taskId }; 
}

/**
 * Опрашивает KIE.ai API.
 * @param {string} taskId - Job ID.
 * @param {string} apiKey - KIEAI_API_KEY.
 * @param {string} baseUrl - Базовый URL API.
 * @param {boolean} [isNonBlocking=false] - Флаг для короткого неблокирующего опроса (1 попытка).
 * @returns {Promise<string|null>} URL видео или null/ошибка, если не готово/сбой.
 */
async function kieAiApiPolling(taskId, apiKey, baseUrl, isNonBlocking = false) {
    
    // --- КОНСТАНТЫ ТАЙМАУТА (ИСПРАВЛЕНИЕ ОШИБКИ КОМПИЛЯЦИИ) ---
    // Если это неблокирующий опрос (из runNonBlockingPolling), делаем только 1 попытку.
    const maxRetries = isNonBlocking ? 1 : 40; // 40 попыток = 10 минут (40 * 15 сек = 600 сек)
    const delayMs = 15000; // 15 секунд задержка между опросами
    // -------------------------------------------------------------------

    const recordInfoUrl = `${baseUrl}/jobs/recordInfo?taskId=${taskId}`;
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
    };

    for (let i = 0; i < maxRetries; i++) {
        // Если это неблокирующий режим (1 попытка), не ждем в начале.
        if (i > 0 || !isNonBlocking) { 
             await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        const response = await fetch(recordInfoUrl, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            // Если ошибка API, немедленно бросаем исключение (не ждем, это не поможет)
            throw new Error(`KIE.ai Polling API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.code !== 200) {
            throw new Error(`KIE.ai API reported error in response: ${data.msg}`);
        }

        const taskData = data.data;
        const state = taskData.state;

        if (state === 'success') {
            const result = JSON.parse(taskData.resultJson);
            if (result.resultUrls && result.resultUrls.length > 0) {
                return result.resultUrls[0]; // Возвращаем первый URL видео
            }
            throw new Error("KIE.ai result structure missing resultUrls.");
        }

        if (state === 'fail') {
            const failMsg = taskData.failMsg || 'Generation failed without specific message.';
            throw new Error(`Video generation failed (KIE.ai): ${failMsg}`);
        }
        
        // Если isNonBlocking === true, то цикл завершится после первой итерации, 
        // если видео не 'success' и не 'fail', и вернет null.
        if (isNonBlocking && state === 'waiting') {
            return null; // Возвращаем null, чтобы runNonBlockingPolling продолжил цикл
        }
    }

    // Если вышли по таймауту (только в блокирующем режиме)
    throw new Error("KIE.ai Polling Timeout: Maximum number of retries exceeded.");
}

// ✅ *** 2.30. startStabilityTextToImage (Stability AI: Stable Image Core) ***
/**
 * Генерирует изображение по промпту через Stability AI (T2I).
 * Соответствует унифицированному контракту T2I.
 * @param {Object} config - Объект активной конфигурации (TEXT_TO_IMAGE_STABILITY).
 * @param {string} prompt - Текстовый промпт.
 * @param {Object} envData - Объект окружения.
 * @param {Object} [settings={}] - Дополнительные настройки (например, aspectRatio).
 * @returns {Promise<ArrayBuffer>} Сгенерированное изображение в ArrayBuffer.
 */
async function startStabilityTextToImage(config, prompt, envData, settings = {}) { 
    
    const API_KEY_ENV_NAME = config.API_KEY; 
    // 🔑 ИСПОЛЬЗУЕМ ВАШ МЕТОД: КЛЮЧ ИЗ envData
    const API_KEY = envData[API_KEY_ENV_NAME]; 
    const BASE_URL = config.BASE_URL; 
    
    if (!API_KEY) { 
        throw new Error(`Stability AI API key is missing. Expected env var: ${API_KEY_ENV_NAME}`); 
    }
    
    // Динамические параметры
    const aspectRatio = settings.aspectRatio || '1:1';
    
    // 1. Формирование тела запроса (multipart/form-data)
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('output_format', 'jpeg');
    formData.append('aspect_ratio', aspectRatio);
    // Для лучшего результата используем рандомный seed
    formData.append('seed', String(Math.floor(Math.random() * 999999999))); 
    
    // 2. ВЫЗОВ STABILITY API
    const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${API_KEY}`,
            'Accept': 'image/*', // Ожидаем бинарные данные
        },
        body: formData,
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stability T2I API Error: ${response.status} - ${errorText.substring(0, 150)}...`);
    }

    // 3. Возвращаем бинарные данные (ArrayBuffer)
    return response.arrayBuffer();
}

// ✅ *** 2.31. startStabilityImageToImage (I2I) - ИСПРАВЛЕННЫЙ КОНТРАКТ И BUFFER/ENV DATA ***
/**
 * Генерирует изображение из изображения + промпта через Stability AI (I2I).
 * * Строго соответствует унифицированному контракту (принимает 7 аргументов).
 * @param {Object} config - Объект активной конфигурации (IMAGE_TO_IMAGE_STABILITY).
 * @param {string} prompt - Текстовый промпт.
 * @param {string} imageBase64 - Исходное изображение в Base64. (3-й аргумент)
 * @param {Object} envData - Объект окружения. (4-й аргумент)
 * @param {number} [height] - Необязательная высота.
 * @param {number} [width] - Необязательная ширина.
 * @param {string} [chatId] - Необязательный chatId.
 * @returns {Promise<ArrayBuffer>} Сгенерированное изображение в ArrayBuffer.
 */
async function startStabilityImageToImage(config, prompt, imageBase64, envData, height, width, chatId) {
    
    const API_KEY_ENV_NAME = config.API_KEY; 
    const API_KEY = envData[API_KEY_ENV_NAME]; // ✅ Теперь ключ находится, т.к. envData на 4-й позиции
    const BASE_URL = config.BASE_URL; 
    
    if (!API_KEY) { 
        throw new Error(`Stability AI API key is missing. Expected env var: ${API_KEY_ENV_NAME}`); 
    }
    if (!imageBase64) { 
        throw new Error("Missing Base64 image data for Image-to-Image request."); 
    }
    
    // 🔑 ИСПРАВЛЕНИЕ: ПРЕОБРАЗОВАНИЕ Base64 -> Uint8Array
    const binaryString = atob(imageBase64);
    const len = binaryString.length;
    const imageBytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        imageBytes[i] = binaryString.charCodeAt(i);
    }
    
    // 1. Формирование тела запроса (multipart/form-data)
    const formData = new FormData();
    
    // ПЕРЕДАЕМ ИМЯ МОДЕЛИ
    formData.append('model', config.MODEL); // config.MODEL = 'sd3.5-flash'
    
    // Обязательный для I2I:ДОБАВЛЕНИЕ РЕЖИМА
    formData.append('mode', 'image-to-image');
    
    formData.append('prompt', prompt);
    formData.append('output_format', 'jpeg');
    
    formData.append('style_preset', 'photographic');

    // Append image file
    formData.append('image', new Blob([imageBytes], { type: 'image/jpeg' }), 'source_image.jpg'); 

    // Параметр strength (сила I2I) - по умолчанию 0.65
    formData.append('strength', String(0.15));
    
    // 2. ВЫЗОВ STABILITY API
    const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${API_KEY}`,
            'Accept': 'image/*', // ✅ ИСПРАВЛЕНИЕ ОШИБКИ 400
        },
        body: formData,
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stability I2I API Error: ${response.status} - ${errorText.substring(0, 150)}...`);
    }

    // 3. Возвращаем бинарные данные (ArrayBuffer)
    return response.arrayBuffer();
}

// ✅ *** startStabilityImageUpscale (Fast Upscaler) ***
/**
 * Увеличивает разрешение изображения в 4 раза (4x) через Fast Upscaler.
 * * Строго соответствует унифицированному контракту (принимает 7 аргументов).
 * @param {Object} config - Объект активной конфигурации (IMAGE_UPSCALE_STABILITY).
 * @param {string} unusedPrompt - Не используется, но принимается по контракту.
 * @param {string} imageBase64 - Исходное изображение в Base64.
 * @param {Object} envData - Объект окружения.
 * @returns {Promise<ArrayBuffer>} Увеличенное изображение в ArrayBuffer.
*/
async function startStabilityImageUpscale(config, unusedPrompt, imageBase64, envData, height, width, chatId) { 
    
    const API_KEY_ENV_NAME = config.API_KEY; 
    const API_KEY = envData[API_KEY_ENV_NAME]; 
    const BASE_URL = config.BASE_URL; 
    
    if (!API_KEY) { 
        throw new Error(`Stability AI API key is missing. Expected env var: ${API_KEY_ENV_NAME}`); 
    }
    if (!imageBase64) { 
        throw new Error("Missing Base64 image data for Upscale request."); 
    }
    
    // 1. Преобразование Base64 -> Uint8Array (для Workers/Web)
    const binaryString = atob(imageBase64);
    const len = binaryString.length;
    const imageBytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
        imageBytes[i] = binaryString.charCodeAt(i);
    }
    
    // 2. Формирование тела запроса (multipart/form-data)
    const formData = new FormData();
    
    // Обязательный параметр: исходное изображение
    formData.append('image', new Blob([imageBytes], { type: 'image/jpeg' }), 'source_image.jpg'); 
    
    // Опциональный параметр: формат вывода. По умолчанию png
    formData.append('output_format', 'jpeg'); 

    // 3. ВЫЗОВ STABILITY API
    const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${API_KEY}`,
            'Accept': 'image/*', // Принимаем бинарный образ
        },
        body: formData,
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stability Upscale API Error: ${response.status} - ${errorText.substring(0, 150)}...`);
    }

    // 4. Возвращаем увеличенное изображение (ArrayBuffer)
    return response.arrayBuffer();
}

// --- СПИСКИ КОМАНД для setMyCommands ---
const PUBLIC_COMMANDS = [
    {"command": "start", "description": "🏠 Главное меню"},
    {"command": "balance", "description": "💰 Меню управления балансом"},
    {"command": "prompt", "description": "✏️ Меню работы с промптом"},
    {"command": "create", "description": "🎨 Меню создания изображений"},
    {"command": "photo", "description": "✨ Меню улучшения фотографий"},
    {"command": "video", "description": "🎬 Меню создания видеороликов"},
    {"command": "say", "description": "🎙️ Озвучивание текста голосом"},
    {"command": "apikey", "description": "🔑 Меню для управления API-ключом"},
    {"command": "stop", "description": "🗑️ Очистить данные"},
];
// --- СПИСКИ КОМАНД АДМИНА для setMyCommands ---
const ADMIN_COMMANDS = [
    {"command": "start", "description": "🏠 Главное меню"},
    {"command": "balance", "description": "💰 Меню управления балансом"},
    {"command": "prompt", "description": "✏️ Меню работы с промптом"},
    {"command": "create", "description": "🎨 Меню создания изображений"},
    {"command": "photo", "description": "✨ Меню улучшения фотографий"},
    {"command": "video", "description": "🎬 Меню создания видеороликов"},
    {"command": "say", "description": "🎙️ Озвучивание текста голосом"},
    {"command": "apikey", "description": "🔑 Меню для управления API-ключом"},
    {"command": "media", "description": "💾 Меню сохраненных данных"},
    {"command": "stop", "description": "🗑️ Очистить данные"},
    {"command": "admin", "description": "⚙️ Панель администратора"},
    //{"command": "update_cmds", "description": "Обновить меню команд (API)"},
];

// ----------------------------------------------------
// III. АСИНХРОННЫЕ ОБРАБОТЧИКИ КОМАНД
// ----------------------------------------------------

/**
 * Скачивает OGG-файл из Telegram, отправляет его на внешний сервис Render
 * для конвертации в MP3 и возвращает результат.
 * @param {string} fileId - file_id голосового сообщения Telegram.
 * @param {object} envData - Объект окружения (включая токен и контекст).
 * @returns {Promise<ArrayBuffer | null>} Байты MP3-файла (ArrayBuffer) или null в случае ошибки.
 */
async function convertOggToMp3(fileId, envData) {
    // 🛑 АДРЕС ВАШЕГО КОНВЕРТЕРА:
    const token = envData.TELEGRAM_BOT_TOKEN;

    // 1. Получаем file_path из Telegram
    const getFileUrlApi = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
    const fileResponse = await fetch(getFileUrlApi);
    const fileData = await fileResponse.json();

    if (!fileData.ok) {
        envData.ctx.waitUntil(logDebug("OGG_CONV_FAIL", `Telegram getFile failed: ${fileData.description}`, envData));
        return null;
    }

    const filePath = fileData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    // 2. Скачиваем OGG-файл
    const oggResponse = await fetch(downloadUrl);
    if (!oggResponse.ok) {
        envData.ctx.waitUntil(logDebug("OGG_CONV_FAIL", `Failed to download OGG. Status: ${oggResponse.status}`, envData));
        return null;
    }
    const oggBlob = await oggResponse.blob();

    // 3. Отправляем OGG-файл на Render-конвертер
    const formData = new FormData();
    // 'audio' — имя поля, которое ожидает ваш Python-сервер
    formData.append('audio', oggBlob, 'voice.ogg'); 

    // 🟢 ИСПОЛЬЗУЕМ callLeshiyMp3Converter:
    const mp3Buffer = await callLeshiyMp3Converter(
        '/ogg2mp3', 
        { body: formData }, 
        {}, // Нет query-параметров
        envData
    );
    
    // 4. Возвращаем MP3-байты (ArrayBuffer)
    return mp3Buffer;
}

/**
 * Конвертирует сырой PCM ArrayBuffer в MP3 через Render.
 * Использует конечную точку /pcm2mp3.
 * @param {ArrayBuffer} pcmBuffer Сырые байты PCM (ArrayBuffer).
 * @param {object} envData Переменные среды.
 * @returns {Promise<ArrayBuffer|null>} ArrayBuffer с MP3 или null в случае ошибки.
 */
async function convertPcmToMp3(pcmBuffer, envData) {
    try {
        const mp3Buffer = await callLeshiyMp3Converter(
            '/pcm2mp3', 
            {
                method: 'POST', // Явно указываем, хотя в обертке по умолчанию POST
                body: pcmBuffer, 
                headers: {
                    // Важно: сообщаем, что это сырые байты
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': pcmBuffer.byteLength.toString(),
                },
            }, 
            {}, // Нет query-параметров
            envData
        );

        // Возвращаем ArrayBuffer с MP3
        return mp3Buffer;

    } catch (error) {
        envData.ctx.waitUntil(logDebug("PCM_CONV_EXCEPTION", error.message, envData));
        return null;
    }
}

// ✅ ВОССТАНОВЛЕННАЯ ФУНКЦИЯ: cleanModelName
function cleanModelName(modelPath) {
    if (!modelPath || modelPath === 'Не выбрана') {
        return 'Не выбрана';
    }
    
    // Удаляем все @xxx/yyy/
    const parts = modelPath.split('/');
    let cleanedName = parts[parts.length - 1].trim();

    // Удаляем возможные кавычки/артефакты, которые остаются после обрезки
    cleanedName = cleanedName.replace(/[`'"]+/g, '').trim(); 
    
    return cleanedName;
}

// Helper: Обрезает модель до последнего слеша
function formatModelName(model) {
    if (!model) return 'N/A';
    
    // 1. Ищем последний слэш
    const lastSlashIndex = model.lastIndexOf('/');
    
    // 2. Если слэш найден, возвращаем только то, что после него.
    if (lastSlashIndex !== -1) {
        return model.substring(lastSlashIndex + 1);
    }
    
    // Если слэша нет, но есть префикс '@cf/', удаляем его
    if (model.startsWith('@cf/')) {
        return model.substring(4);
    }
    
    return model;
}

// ✅ generateModelStatusTable (ФИНАЛЬНЫЙ ЧИСТЫЙ ВЫВОД С ПОДСВЕТКОЙ)
function generateModelStatusTable(envData) {
    let table = '### 🤖 Текущие (Активные) AI-модели:\n';
    
    for (const serviceType in AI_MODEL_MENU_CONFIG) {
        if (AI_MODEL_MENU_CONFIG.hasOwnProperty(serviceType)) {
            const config = AI_MODEL_MENU_CONFIG[serviceType];
            
            const defaultModelKey = Object.keys(config.models)[0];
            const currentModelKey = envData[config.kvKey] || defaultModelKey; 
            let modelFullName = config.models[currentModelKey] || 'Не выбрана'; 

            let providerName = '';
            let modelPath = modelFullName;
            
            const colonIndex = modelFullName.indexOf(':');
            
            if (colonIndex !== -1) {
                let tempProvider = modelFullName.substring(0, colonIndex).trim();
                
                // 1. Преобразование WORKERSAI в WORKERS_AI
                if (tempProvider.toUpperCase() === 'WORKERSAI') {
                    tempProvider = 'WORKERS_AI';
                }

                providerName = tempProvider + ': ';
                modelPath = modelFullName.substring(colonIndex + 1).trim(); 
            }
            
            // 2. Используем ВАШУ ФУНКЦИЮ formatModelName
            const cleanedModelName = formatModelName(modelPath); 

            // 3. 🚨 ФИКС: ФОРМАТИРОВАНИЕ ДЛЯ ВЫВОДА (СИНЯЯ ПОДСВЕТКА)
            // Объединяем провайдера и модель (без экранирования!)
            const fullModelName = `${providerName}${cleanedModelName}`;

            // Оборачиваем в обратные кавычки для синей подсветки (Inline Code)
            // Внутри `текст` подчеркивания отображаются корректно.
            const formattedModelName = `\`${fullModelName}\``; 
            
            // 4. Добавляем строку в таблицу
            table += `${config.name}: ${formattedModelName}\n`; 
        }
    }
    return table;
}

// Вспомогательная функция для синхронизации envData с KV-хранилищем
// Вынесена для чистоты кода и переиспользуется в model_menu, model_show, model_set.
async function syncEnvData(storage, envData, AI_MODEL_MENU_CONFIG) {
    const allKvKeys = Object.values(AI_MODEL_MENU_CONFIG).map(conf => conf.kvKey);
    await Promise.all(allKvKeys.map(async (kvKey) => {
        const modelKey = await storage.get(kvKey); 
        if (modelKey) {
            envData[kvKey] = modelKey; // Обновляем envData свежими данными
        }
    }));
}

// ✅ processAdminStartCommand - АДМИН-МЕНЮ (ФИНАЛЬНАЯ ВЕРСИЯ)
async function processAdminStartCommand(adminChatId, envData) {
    // Деструктурируем все необходимые переменные
    const { 
        TELEGRAM_BOT_TOKEN, ADMIN_CHAT_ID, 
        DEBUG_ENABLED, TTS_ENABLED, PHOTO_ENABLED, VIDEO_ENABLED, 
        KIEAI_API_KEY, ctx 
    } = envData;

    if (adminChatId.toString() !== ADMIN_CHAT_ID) {
        await sendMessage(adminChatId, "❌ Вы не администратор этого бота.", TELEGRAM_BOT_TOKEN);
        return;
    }

    // --- 1. ЗАПРОС БАЛАНСА KIE.AI ---
    let kieAiBalance = 'Ошибка';
    
    if (KIEAI_API_KEY) {
        try {
            const balanceKieAiResult = await updateKieAiUserCredits(KIEAI_API_KEY, envData, ctx); 
            
            if (typeof balanceKieAiResult === 'number') {
                kieAiBalance = ` ${balanceKieAiResult} кредиты`;
            } else if (balanceKieAiResult === 'InvalidKey') {
                kieAiBalance = 'Недействительный ключ (401)';
            } else {
                kieAiBalance = 'Ошибка (см. логи)';
            }
        } catch (e) {
            ctx.waitUntil(logDebug('ADMIN_BALANCE_FETCH_ERROR', `Ошибка запроса баланса KIE.AI: ${e.message}`, envData));
            kieAiBalance = 'Ошибка сети';
        }
    } else {
        kieAiBalance = 'Ключ KIEAI_API_KEY не установлен!';
    }
    
    // --- 2. ЗАПРОС БАЛАНСА Bothub.RU ---
    const balanceBothubResult = await getBothubBalance(envData);
    let BothubBalance;
    if (typeof balanceBothubResult === 'number') {
        BothubBalance = `${balanceBothubResult} капсов`;
    } else {
        BothubBalance = `Ошибка/N/A (Проверьте ключ)`;
    }

    // --- 3. ЗАПРОС БАЛАНСА STARS БОТА (для админки) ---
    const starBalanceResult = await getMyStarBalance(TELEGRAM_BOT_TOKEN);
    let starBalance = starBalanceResult.success ? starBalanceResult.balance : 'Недоступен';
    
    // --- 1. ПРИМЕНЕНИЕ СКЛОНЕНИЯ ---
    const starWord = pluralize(starBalance, STAR_FORMS); // Падеж для звёзд

    // --- 4. ФОРМИРОВАНИЕ ТЕКСТА И ОТПРАВКА ---
    const debugStatus = DEBUG_ENABLED ? '✅ ВКЛЮЧЕНА' : '❌ ВЫКЛЮЧЕНА';
    const photoStatus = PHOTO_ENABLED ? '✅ ВКЛЮЧЕНО' : '❌ ВЫКЛЮЧЕНО';
    const videoStatus = VIDEO_ENABLED ? '✅ ВКЛЮЧЕНО' : '❌ ВЫКЛЮЧЕНО';
    const ttsStatus = TTS_ENABLED ? '✅ ВКЛЮЧЕН' : '❌ ВЫКЛЮЧЕН';

    const message = `
⚙️ **АДМИН-ПАНЕЛЬ**

🆔 **Админ ID:** \`${ADMIN_CHAT_ID}\`

💰 **Платные сервисы:**
\`TELEGRAM\` : ⭐️ **${starBalance}** ${starWord}
KIE.AI : **${kieAiBalance}**
BotHub.ru : ${BothubBalance}

Доступность опций:
**Отладка:** ${debugStatus}
**Голос:** ${ttsStatus}
**Фото:**  ${photoStatus}
**Видео:** ${videoStatus}

🚀 **Версия:** ${VERSION}
    `;

    // Создаем массив кнопок для инлайн-клавиатуры
    const keyboardObject = getAdminKeyboardFromCommand(envData);
    const keyboard = keyboardObject && keyboardObject.inline_keyboard ? keyboardObject.inline_keyboard : [];
    
    await sendMessageWithKeyboard(adminChatId, message, TELEGRAM_BOT_TOKEN, keyboard);
}

// ✅ handleAdminCallback (ФИНАЛЬНАЯ ВЕРСИЯ - УПРАВЛЕНИЕ ДАТОЙ БЕЗЛИМИТА)
async function handleAdminCallback(chatId, callback, envData, ctx) {
    const data = callback.data;
    const messageId = callback.message.message_id;
    const token = envData.TELEGRAM_BOT_TOKEN;
    const storage = envData.LAST_PHOTO_STORAGE; 
    const callbackId = callback.id; 
    
    // ВАЖНО: answerCallbackQuery должен быть тут, чтобы сработать до await
    let callbackText = (data.includes("user_menu")) ? "Обновление меню..." : ""; 
    // Дополнительно: убираем часы при вызове меню моделей
    if (data.includes('model_menu') && !callbackText) {
        callbackText = "Открытие меню моделей...";
    }
    ctx.waitUntil(answerCallbackQuery(callbackId, callbackText, token));

    // Локальные переменные для ключей состояния
    const ADMIN_STATE_KEY = chatId.toString() + '_admin_state'; 
    const ADMIN_TARGET_ID_KEY = chatId.toString() + '_admin_target_id';
    
    // --- КЛЮЧИ ПОДПИСКИ (ИЗ processPhotoCommand) ---
    const SUBSCRIPTION_END_KEY_SUFFIX = '_sub_end_credit'; 

    // --- ЗАПРОС БАЛАНСА KIE.AI ---
    let kieAiBalance = 'Ошибка';
    
    if (envData.KIEAI_API_KEY) {
        try {
            // Вызываем существующую функцию для получения баланса по главному ключу
            const balanceKieAiResult = await updateKieAiUserCredits(envData.KIEAI_API_KEY, envData, ctx); 
            
            if (typeof balanceKieAiResult === 'number') {
                kieAiBalance = ` ${balanceKieAiResult} кредиты`;
            } else if (balanceKieAiResult === 'InvalidKey') {
                kieAiBalance = 'Недействительный ключ (401)';
            } else {
                kieAiBalance = 'Ошибка (см. логи)';
            }
        } catch (e) {
            // Ошибка сети или другая
            ctx.waitUntil(logDebug('ADMIN_BALANCE_FETCH_ERROR', `Ошибка запроса баланса KIE.AI: ${e.message}`, envData));
            kieAiBalance = 'Ошибка сети';
        }
    } else {
        kieAiBalance = 'Ключ KIEAI_API_KEY не установлен!';
    }
    // --- ЗАПРОС БАЛАНСА Bothub.RU ---
    const balanceBothubResult = await getBothubBalance(envData); // <--- Используем await
    // 2. Форматируем строку для отображения
    let BothubBalance;
    if (typeof balanceBothubResult === 'number') {
        BothubBalance = `${balanceBothubResult} капсов`;
    } else {
        BothubBalance = `Ошибка/N/A (Проверьте ключ)`;
    }
    
    // --- Получаем команду и ID ---
    let commandFull = data.split(':')[0];
    let targetId = data.split(':')[1];
    let commandAction = commandFull.startsWith('admin_') ? commandFull.substring(6) : commandFull;

    // ⚠️ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Определяем базовое действие для SWITCH
    const commandParts = commandAction.split('_');
    let switchCaseAction = commandAction; // По умолчанию: 'model_menu', 'user_menu', 'exit', 'debug_toggle'

    // Логика сокращения:
    if (commandParts[0] === 'model') {
        // Сокращаем только 'model_show' и 'model_set', оставляя 'model_menu' как есть
        if (commandParts[1] === 'show' || commandParts[1] === 'set') {
            switchCaseAction = commandParts[0] + '_' + commandParts[1]; // -> 'model_show' или 'model_set'
        }
        // Если commandParts[1] == 'menu', switchCaseAction остается 'model_menu'
    }

    switch (switchCaseAction) {
        
        // ===============================================
        // === 1. БЛОК: УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (С РЕЗЕРВОМ) ===
        // ===============================================
        case 'user_menu': { 
            const token = envData.TELEGRAM_BOT_TOKEN; 
            const messageId = callback.message.message_id; 
        
            const currentTargetId = await storage.get(ADMIN_TARGET_ID_KEY);
            const targetUserId = currentTargetId ? currentTargetId : null;
            let userInfoString = "";

            if (targetUserId) {
                // 2. Достаем сохраненные метаданные по ID
                const targetFullName = await storage.get(`${targetUserId}_USER_FULLNAME`);
                const targetUsernameRaw = await storage.get(`${targetUserId}_USER_USERNAME`);
                
                const targetUsername = targetUsernameRaw ? `@${targetUsernameRaw}` : 'нет';
                
                // 3. Формируем строку для отображения
                userInfoString = `✅ **Выбранный пользователь:**\n` +
                                 `🆔 Текущий ID: \`${targetUserId}\`\n` +
                                 `👤 ФИО: *${targetFullName || '---'}*\n` +
                                 `🔖 Username: ${targetUsername}`;
                                 
            } else {
                userInfoString = "❌ **Пользователь не выбран.** Используйте /admin и кнопку выбора.";
            }

            // --- 1. КРИТИЧНОЕ ИСПРАВЛЕНИЕ: ПОДГОТОВКА СТАТУСОВ ---
            let balanceStatus = "Без ID пользователя не доступен";
            let subStatusText = "❌ Отключен";
            let isSubscriptionActive = false;
            
            // 🛑 ФИКС: Объявляем переменные KIE.AI здесь, чтобы они были доступны в if/else блоках
            let statusUserApi = "🔑 **Личный API-ключ:** ❌ Не установлен.";
            let detailsUserApi = "";

            if (currentTargetId) {
                // ⚠️ ГАРАНТИРОВАННО СЧИТЫВАЕМ АКТУАЛЬНЫЕ ДАННЫЕ ИЗ ХРАНИЛИЩА
                // *Предполагается, что getCurrentCreditBalance определен*
                balanceStatus = await getCurrentCreditBalance(currentTargetId, storage); 
                
                const SUBSCRIPTION_END_KEY = currentTargetId + SUBSCRIPTION_END_KEY_SUFFIX;
                const subscriptionEndStr = await storage.get(SUBSCRIPTION_END_KEY);
                const subscriptionEndTime = parseInt(subscriptionEndStr);
                const now = Date.now();
                
                // --- ЛОГИКА KIE.AI: СТАТУС КЛЮЧА И БАЛАНС ---
                const targetChatIdString = String(currentTargetId);

                // Проверка наличия всех необходимых данных
                if (!storage || !USER_LIMIT_KEY_SUFFIX || !USER_LIMIT_KEY_SUFFIX) {
                    statusUserApi = "❌ **Критическая ошибка конфигурации:** Отсутствует KV-хранилище или суффиксы API/LIMIT в окружении.";
                    // Продолжаем выполнение, чтобы вывести хотя бы эту ошибку, но ключ не ищем.
                } else {
                    const userApiKey = targetChatIdString + USER_API_KEY_SUFFIX; // Имя ключа в KV (например: '123_kieai_api_key')
                    const userLimitKey = targetChatIdString + USER_LIMIT_KEY_SUFFIX; // Имя ключа для баланса

                    try {
                        // 1. ЧИТАЕМ ЗНАЧЕНИЕ (СЕКРЕТНЫЙ ТОКЕН) ключа из KV
                        const rawApiKey = await storage.get(userApiKey, { type: 'text' });
                        
                        if (rawApiKey) {
                            const actualApiKey = rawApiKey.trim(); // Полный, чистый API-ключ
                            
                            // 2. ЧИТАЕМ БАЛАНС
                            const balanceStr = await storage.get(userLimitKey, { type: 'text' });
                            
                            // --- ФОРМАТИРОВАНИЕ БАЛАНСА С ПАДЕЖОМ ---
                            let balanceText = 'Н/Д';

                            if (balanceStr) {
                                const currentBalanceNum = parseInt(balanceStr);
                                const creditWord = pluralize(currentBalanceNum, CREDIT_FORMS);
                                balanceText = `${currentBalanceNum} ${creditWord}`;
                            } else if (balanceStr === null) {
                                // Если ключ существует, но баланс 'Н/Д' или ошибка чтения
                                balanceText = `Н/Д (ошибка чтения)`;
                            }
                            // 3. ФОРМАТИРУЕМ УСПЕШНЫЙ ВЫВОД
                            statusUserApi = "🔑 **Личный API-ключ:** ✅ Установлен";
                            
                            // Вывод полного ключа и актуального баланса
                            detailsUserApi = `\n🔐 **API-ключ:** \`${actualApiKey}\``;
                            detailsUserApi += `\n⚡️ **Баланс API:** **${balanceText}**`;
                        }
                    } catch (e) {
                        statusUserApi = `🔑 **Личный API-ключ:** ⚠️ Ошибка чтения KV.`;
                        envData.ctx.waitUntil(logDebug('ADMIN_KIE_STATUS_ERROR', `Ошибка чтения статуса KIE.AI для ${currentTargetId}: ${e.message}`, envData, envData.ctx)); 
                    }
                }
                if (subscriptionEndTime && subscriptionEndTime > now) {
                    isSubscriptionActive = true;
                    // Форматируем дату для отображения
                    const endDate = new Date(subscriptionEndTime);
                    subStatusText = `✅ Активен до ${endDate.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
                }
            }
            
            // *Предполагается, что getManagementActionKeyboard определен*
            const managementKeyboardObject = getManagementActionKeyboard(currentTargetId, balanceStatus, isSubscriptionActive); 
            
            // ⚠️ ГЕНЕРАЦИЯ ТЕКСТА СООБЩЕНИЯ С АКТУАЛЬНЫМИ ДАННЫМИ
            let messageText;
            if (currentTargetId) {
                
                const idStatusText = `${currentTargetId}`;

                // Добавляем информацию о подписке в текст сообщения
                
                messageText = `
👥 **УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ**

${userInfoString}

💰 Баланс: ${balanceStatus}
👑 Безлимит: ${subStatusText}

${statusUserApi}${detailsUserApi}

Выберите пользователя и укажите действия.
        `;
            } else {
                messageText = "👥 **УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ.**\n\n🆔 Текущий ID: 'Не выбран'\n\n💰 Баланс: 'Не выбран'\n👑 Безлимит: 'Не указан'\n\nВыберите пользователя и укажите действия.";
            }
            
            // --- 4. РЕДАКТИРОВАНИЕ ---
            // ЭТОТ БЛОК ГАРАНТИРУЕТ, ЧТО МЕНЮ НЕ ЗАКРОЕТСЯ (П.1)
            // *Предполагается, что editMessageWithKeyboard определен*
            const result = await editMessageWithKeyboard(
                chatId, 
                messageId, 
                messageText, 
                token, 
                managementKeyboardObject.inline_keyboard
            );
        
            if (result && result.ok === false) {
                // Если редактирование не удалось (например, сообщение старое), отправляем новое
                ctx.waitUntil(sendMessageMarkdown(
                    chatId, 
                    messageText, 
                    token, 
                    null,
                    managementKeyboardObject 
                ));
            }
            return true;
        }

        // ===============================================
        // === 2. БЛОК: ВЫБОР И ДЕЙСТВИЯ (select_action, show_user_select_keyboard) ===
        // ===============================================
        case 'show_user_select_keyboard': { 
            const token = envData.TELEGRAM_BOT_TOKEN;
            const messageId = callback.message.message_id; // ID сообщения с Inline-клавиатурой
            const storage = envData.LAST_PHOTO_STORAGE;
            const ADMIN_STATE_KEY = chatId.toString() + '_admin_state'; 
            
            // 1. Устанавливаем стейт для ожидания ID (это позволяет работать ручному вводу в Блоке 1.5)
            //await storage.put(ADMIN_STATE_KEY, 'awaiting_target_id_for_menu', { expirationTtl: 600 });

            // 2. Reply Keyboard для выбора пользователя (с кнопкой request_user)
            const selectKeyboard = getReplyKeyboardForUserSelection(); 
            
            const editText = `
👤 **Ожидание выбора пользователя**
Теперь вы можете:
1. **Нажать кнопку** "Выбрать пользователя" ниже, чтобы выбрать из контактов.
2. **Ввести ID вручную.**
            `;
            
            // 3. РЕДАКТИРУЕМ СТАРОЕ СООБЩЕНИЕ: Убираем старую Inline-клавиатуру
            // *Предполагается, что editMessage определен*
            ctx.waitUntil(editMessage(chatId, messageId, editText, token)); 

            // 4. ОТПРАВЛЯЕМ НОВОЕ СООБЩЕНИЕ с Reply Keyboard
            // *Предполагается, что sendMessageMarkdown определен*
            ctx.waitUntil(sendMessageMarkdown(
                chatId, 
                "👉 **Используйте клавиатуру, появившуюся под полем ввода.**", 
                token, 
                null, 
                selectKeyboard // Передаем Reply Keyboard
            ));
            
            return true;
                }
                case 'admin_show_user_select_keyboard': {
                    const token = envData.TELEGRAM_BOT_TOKEN;
                    const messageId = callback.message.message_id;
                    const storage = envData.LAST_PHOTO_STORAGE;
                    const ADMIN_STATE_KEY = chatId.toString() + '_admin_state'; 
                    
                    const messageText = `
👤 **Ожидание ввода ID**
Нажмите кнопку выбора или отправьте ID пользователя вручную.
                `;
                
                    // 1. Устанавливаем стейт для ожидания ID (await здесь критичен)
                    await storage.put(ADMIN_STATE_KEY, 'awaiting_target_id_for_menu', { expirationTtl: 600 });
                
                    // 2. РЕДАКТИРУЕМ СТАРОЕ СООБЩЕНИЕ: УДАЛЯЕМ ИНЛАЙН-КЛАВИАТУРУ И МЕНЯЕМ ТЕКСТ.
                    // Используем 'editMessage' для смены текста и удаления старой инлайн-клавиатуры.
                    ctx.waitUntil(editMessage(chatId, messageId, messageText, token)); 
                    
                    // 3. ОТПРАВЛЯЕМ НОВОЕ СООБЩЕНИЕ С REPLY KEYBOARD.
                    const selectKeyboard = getSelectOrCancelReplyKeyboard(); // Это Reply Keyboard
                
                    ctx.waitUntil(sendMessageMarkdown(
                        chatId, 
                        "✅ Используйте клавиатуру под полем ввода.", 
                        token, 
                        null, 
                        selectKeyboard 
                    ));
                    
                    // 4. Отвечаем на колбэк (чтобы убрать часы ожидания)
                    // Убедитесь, что answerCallbackQuery вызван немедленно в начале функции handleAdminCallback.
                    // Если вы уверены, что он вызван в начале, эту строку можно убрать.
                    // ctx.waitUntil(answerCallbackQuery(callback.id, "Выберите пользователя.", token));
                    
                    return true;
        }
        
        case 'select_action': {
            const action = targetId; 
            const savedTargetId = await storage.get(ADMIN_TARGET_ID_KEY);

            if (savedTargetId) {
                let stateKey = '';
                let messageText = '';

                if (action === 'view') {
                    // !!! ИСПРАВЛЕНО: Вместо processAdminViewUser вызываем user_menu для обновления
                    // Просто обновляем меню, чтобы показать текущее состояние
                    ctx.waitUntil(handleAdminCallback(chatId, { data: 'admin_user_menu', message: callback.message }, envData, ctx));
                    return true;
                } else if (action === 'set_balance') {
                    stateKey = 'awaiting_new_balance';
                    messageText = `✅ ID (${savedTargetId}) сохранен. Отправьте **ЧИСЛО** — новый **ТОЧНЫЙ БАЛАНС** фото.`;
                } else if (action === 'create_token') {
                    stateKey = 'awaiting_amount_token';
                    messageText = `✅ ID (${savedTargetId}) сохранен. Отправьте **СУММУ В РУБЛЯХ** для создания кода.`;
                } else if (action === 'set_sub_end') { 
                    stateKey = 'awaiting_new_sub_end';
                    messageText = `✅ ID (\`${savedTargetId}\`) сохранен. Отправьте **КОЛИЧЕСТВО ДНЕЙ** для активации безлимита. (0 для отключения).`;
                }
                
                if (stateKey) {
                    await storage.put(ADMIN_STATE_KEY, stateKey, { expirationTtl: 600 });
                    // *Предполагается, что getCancelReplyKeyboard определен*
                    const cancelKeyboard = getCancelReplyKeyboard(); 
                    // *Предполагается, что sendMessage определен*
                    ctx.waitUntil(sendMessageMarkdown(chatId, messageText, token, null, cancelKeyboard));
                }

            } else {
                await storage.put(ADMIN_STATE_KEY, `awaiting_target_id_for_action:${action}`, { expirationTtl: 600 });
                
                // *Предполагается, что getSelectOrCancelReplyKeyboard определен*
                const selectKeyboard = getSelectOrCancelReplyKeyboard();
                const messageText = `⚠️ **Выберите ID.**\n\nДля выполнения действия \`${action}\` сначала необходимо выбрать пользователя.`;
                
                // *Предполагается, что sendMessage и editMessage определены*
                ctx.waitUntil(sendMessageMarkdown(chatId, messageText, token, null, selectKeyboard));
                
                ctx.waitUntil(editMessage(chatId, messageId, `⏳ Ожидание выбора ID для действия: \`${action}\`...`, token));
            }
            return true;
        }
        
        // ===============================================
        // === 3. БЛОК: ДЕЙСТВИЯ ПО ID ===
        // ===============================================

        case 'view_user': { 
            if (!targetId) return false;
            
            await storage.put(ADMIN_TARGET_ID_KEY, targetId, { expirationTtl: 600 });
            // !!! ИСПРАВЛЕНО: Вместо processAdminViewUser вызываем user_menu для обновления
            ctx.waitUntil(handleAdminCallback(chatId, { data: 'admin_user_menu', message: callback.message }, envData, ctx));
            return true;
        }
        
        case 'set_balance': 
        case 'create_token': {
            if (!targetId) return false;
            
            await storage.put(ADMIN_TARGET_ID_KEY, targetId, { expirationTtl: 600 });

            const stateKey = commandAction === 'set_balance' ? 'awaiting_new_balance' : 'awaiting_amount_token';
            const messageText = commandAction === 'set_balance' 
                ? `✅ ID (${targetId}) сохранен. Отправьте **ЧИСЛО** — новый **ТОЧНЫЙ БАЛАНС** фото.`
                : `✅ ID (${targetId}) сохранен. Отправьте **СУММУ В РУБЛЯХ** для создания кода.`;

            await storage.put(ADMIN_STATE_KEY, stateKey, { expirationTtl: 600 });
            // *Предполагается, что getCancelReplyKeyboard и sendMessage определены*
            const cancelKeyboard = getCancelReplyKeyboard(); 
            ctx.waitUntil(sendMessageMarkdown(chatId, messageText, token, null, cancelKeyboard));
            return true;
        }

        case 'set_sub_end': // Идентичен set_sub_end_custom, но для текущего ID
        case 'set_sub_end_custom': { 
            if (!targetId) return false;

            await storage.put(ADMIN_TARGET_ID_KEY, targetId, { expirationTtl: 600 });
            await storage.put(ADMIN_STATE_KEY, 'awaiting_new_sub_end', { expirationTtl: 600 }); // <-- УСТАНОВКА СТЕЙТА

            const messageText = `✅ ID (\`${targetId}\`) сохранен. Отправьте **ЦЕЛОЕ ЧИСЛО ДНЕЙ** для активации безлимита. (0 для отключения).`;
            
            // *Предполагается, что getCancelReplyKeyboard, sendMessage и editMessage определены*
            const cancelKeyboard = getCancelReplyKeyboard(); 
            ctx.waitUntil(sendMessage(chatId, messageText, token, null, cancelKeyboard));
            
            // Редактируем сообщение, чтобы убрать Inline-клавиатуру
            ctx.waitUntil(editMessage(chatId, callback.message.message_id, "⏳ **Ожидание ввода количества дней...**", token));
        
            return true;
        }

        case 'toggle_sub_off': { 
            if (!targetId) return false;
            
            const storage = envData.LAST_PHOTO_STORAGE;
            const token = envData.TELEGRAM_BOT_TOKEN;
            const SUBSCRIPTION_END_KEY = targetId + SUBSCRIPTION_END_KEY_SUFFIX;
            
            // 1. Удаляем ключ подписки
            await storage.delete(SUBSCRIPTION_END_KEY);
            
            // 2. Уведомляем
            ctx.waitUntil(answerCallbackQuery(callback.id, `👑 Безлимит для ID ${targetId} отключен.`, token));

            // 3. Обновляем текущее меню (переход к case 'user_menu')
            ctx.waitUntil(handleAdminCallback(chatId, { data: 'admin_user_menu', message: callback.message }, envData, ctx));
            
            return true;
        }

        case 'ignore': {
            // Рекурсивный вызов для обновления меню (по сути, admin_user_menu)
            ctx.waitUntil(handleAdminCallback(chatId, { data: 'admin_user_menu', message: callback.message }, envData, ctx));
            return true;
        }
        case 'input_id': {
            const token = envData.TELEGRAM_BOT_TOKEN;
            const messageId = callback.message.message_id;
            const storage = envData.LAST_PHOTO_STORAGE;
            const ADMIN_STATE_KEY = chatId.toString() + '_admin_state'; 
            
            // 1. Устанавливаем стейт: ждем ID для обновления меню
            await storage.put(ADMIN_STATE_KEY, 'awaiting_target_id_for_menu', { expirationTtl: 600 });
    
            // 2. Reply Keyboard для выбора пользователя (с кнопкой отмены)
            const selectKeyboard = getCancelReplyKeyboard(); // Используем только "Отменить ввод"
            
            // 3. Отправляем сообщение с инструкцией и Reply Keyboard
            const messageText = `
⌨️ **РУЧНОЙ ВВОД ID**
Отправьте **ЧИСЛО** — ID пользователя, которого хотите выбрать.
            `;
            
            // Редактируем старое сообщение, чтобы оно не висело
            ctx.waitUntil(editMessage(chatId, messageId, "⏳ Ожидание ручного ввода ID...", token));
    
            // Отправляем новое сообщение с Reply Keyboard (кнопка "Отменить ввод")
            ctx.waitUntil(sendMessageMarkdown(
                chatId, 
                messageText, 
                token, 
                null, 
                selectKeyboard 
            ));
            
            return true;
        }
        case 'reset_target_id': { 
            const storage = envData.LAST_PHOTO_STORAGE;
            const token = envData.TELEGRAM_BOT_TOKEN;
            const ADMIN_TARGET_ID_KEY = chatId.toString() + '_admin_target_id';
            
            ctx.waitUntil(answerCallbackQuery(callback.id, "ID сброшен. Обновление меню...", token)); 
        
            // 1. Сброс ID
            await storage.delete(ADMIN_TARGET_ID_KEY);
            
            // 2. Скрытие Reply Keyboard и обновление Inline Menu
            const userMenuCallback = 'admin_user_menu'; 
            
            // Отправляем сообщение, чтобы скрыть Reply Keyboard
            // *Предполагается, что sendMessage определен*
            ctx.waitUntil(sendMessage(chatId, "✅ ID сброшен.", token, { reply_markup: { hide_keyboard: true } }));

            // Обновляем Inline Menu 
            ctx.waitUntil(handleAdminCallback(chatId, { data: userMenuCallback, message: callback.message }, envData, ctx));
            
            return true; 
        }

        case 'back_to_menu': {
            // *Предполагается, что getFreshEnvData, generateAdminMessage, getAdminKeyboardFromCommand и editMessageWithKeyboard определены*
            const freshEnvData = await getFreshEnvData(envData, storage); 
            const message = await generateAdminMessage(freshEnvData, kieAiBalance, BothubBalance);
            const newKeyboard = getAdminKeyboardFromCommand(freshEnvData);

            ctx.waitUntil(editMessageWithKeyboard(chatId, messageId, message, token, newKeyboard.inline_keyboard));
            return true;
        }

        // ============================================
        // === 4. БЛОК: TOGGLE-ПЕРЕКЛЮЧАТЕЛИ (ГЛОБАЛЬНЫЕ) ===
        // ============================================
        // ... (логика toggle-переключателей без изменений) ...
        case 'debug_toggle': {
             const key = GLOBAL_DEBUG_KEY;
             const currentStatusStr = await storage.get(key);
             const newStatus = currentStatusStr !== 'true'; 
             await storage.put(key, newStatus.toString());

             const freshEnvData = await getFreshEnvData(envData, storage); 
             const message = await generateAdminMessage(freshEnvData, kieAiBalance, BothubBalance);
             const newKeyboard = getAdminKeyboardFromCommand(freshEnvData);

             ctx.waitUntil(editMessageWithKeyboard(chatId, messageId, message, token, newKeyboard.inline_keyboard));
             return true; 
        }

        case 'toggle_tts': {
             const key = GLOBAL_TTS_KEY; 
             const flag = 'TTS_ENABLED'; 
             
             const currentStatus = envData[flag];
             const newStatus = !currentStatus;
             await storage.put(key, newStatus.toString()); 

             const freshEnvData = await getFreshEnvData(envData, storage); 
             const message = await generateAdminMessage(freshEnvData, kieAiBalance, BothubBalance);
             const newKeyboard = getAdminKeyboardFromCommand(freshEnvData);
             
             ctx.waitUntil(editMessageWithKeyboard(chatId, messageId, message, token, newKeyboard.inline_keyboard));
             return true; 
        }
        
        case 'toggle_photo': {
             const key = GLOBAL_PHOTO_KEY; 
             const flag = 'PHOTO_ENABLED'; 
             
             const currentStatus = envData[flag];
             const newStatus = !currentStatus;
             await storage.put(key, newStatus.toString()); 

             const freshEnvData = await getFreshEnvData(envData, storage); 
             const message = await generateAdminMessage(freshEnvData, kieAiBalance, BothubBalance);
             const newKeyboard = getAdminKeyboardFromCommand(freshEnvData);
             
             ctx.waitUntil(editMessageWithKeyboard(chatId, messageId, message, token, newKeyboard.inline_keyboard));
             return true; 
        }
        
        case 'toggle_video': {
             const key = GLOBAL_VIDEO_KEY; 
             const flag = 'VIDEO_ENABLED'; 
             
             const currentStatus = envData[flag];
             const newStatus = !currentStatus;
             await storage.put(key, newStatus.toString()); 

             const freshEnvData = await getFreshEnvData(envData, storage); 
             const message = await generateAdminMessage(freshEnvData, kieAiBalance, BothubBalance);
             const newKeyboard = getAdminKeyboardFromCommand(freshEnvData);
             
             ctx.waitUntil(editMessageWithKeyboard(chatId, messageId, message, token, newKeyboard.inline_keyboard));
             return true; 
        }

        // ==================================================
        // === 5. БЛОК: СЛУЖЕБНЫЕ КОМАНДЫ ===
        // ==================================================

        case 'exit': {
            // 1. Сначала удаляем старую клавиатуру
            //await sendMessageReplyKeyboard(chatId, "🚪 **Вы вышли из режима администратора.**\n\nНажмите /admin для возврата.", token,  true);
            
            // *Предполагается, что editMessage определен*
            ctx.waitUntil(editMessage( 
                chatId, messageId,
                "🚪 **Вы вышли из режима администратора.**\n\nНажмите /admin для возврата.",
                token
            ));
            await storage.delete(ADMIN_STATE_KEY); 
            return true; 
        } 

        // ===============================================
        // === 6. БЛОК: УПРАВЛЕНИЕ AI-МОДЕЛЯМИ (С ПОЛНОЙ ЗАЩИТОЙ ОТ СБРОСА) ===
        // ===============================================

        case 'model_menu': {
            // 🚨 ФИКС 0: Убеждаемся, что storage определен
            const storage = envData.LAST_PHOTO_STORAGE; 
            
            try {
                if (typeof AI_MODEL_MENU_CONFIG === 'undefined') {
                    throw new Error("AI_MODEL_MENU_CONFIG is not defined");
                }

                const allServiceKeys = Object.keys(AI_MODEL_MENU_CONFIG);
                if (allServiceKeys.length === 0) {
                    ctx.waitUntil(answerCallbackQuery(callbackId, "❌ Ошибка: В конфигурации нет AI-сервисов.", token));
                    return true;
                }

                // 🚨 ФИКС 1: СИНХРОНИЗАЦИЯ при входе в меню
                await syncEnvData(storage, envData, AI_MODEL_MENU_CONFIG);
                
                const currentServiceType = allServiceKeys[0]; 
                const currentConfig = AI_MODEL_MENU_CONFIG[currentServiceType];
                
                const safeConfigName = currentConfig.name.replace(/_/g, '\\_');
                
                const statusTable = generateModelStatusTable(envData); 
                const keyboard = getModelMenuKeyboard(envData, currentServiceType); 
                
                const messageText = `
🧠 **НАСТРОЙКА AI-МОДЕЛЕЙ**

${statusTable}
---
Выберите сервис, чтобы увидеть доступные модели:
Текущий сервис: **${safeConfigName}**
                `;
                
                ctx.waitUntil(editMessageWithKeyboard(
                    chatId, 
                    messageId, 
                    messageText, 
                    token, 
                    keyboard,
                ));

                ctx.waitUntil(answerCallbackQuery(callbackId, "Переход в меню моделей...", token));
                return true;
                
            } catch (error) {
                // ... (блок обработки ошибок остается без изменений)
                console.error("❌ КРИТИЧЕСКАЯ ОШИБКА ВХОДА В model_menu:", error.message, error.stack);
                
                const errorMessage = `❌ ОШИБКА ВХОДА. Проверьте логи. Детали: ${error.message.substring(0, 100)}`;
                ctx.waitUntil(answerCallbackQuery(callbackId, errorMessage, token));

                ctx.waitUntil(editMessageWithKeyboard(
                    chatId, 
                    messageId, 
                    `⚠️ **Сбой:** ${errorMessage}. Не удалось открыть меню моделей.`, 
                    token, 
                    getAdminKeyboardFromCommand(envData), 
                ));
                
                return true;
            }
        }

        case 'model_show':
        case 'model_set': {
            // 🚨 ФИКС 0: Определяем storage здесь, чтобы он был доступен
            const storage = envData.LAST_PHOTO_STORAGE; 
            const servicePrefix = 'admin_model_set_';
            
            // --- model_show: Переключение сервиса ---
            if (data.startsWith('admin_model_show_')) {
                const newServiceType = data.substring('admin_model_show_'.length); 
                
                if (!AI_MODEL_MENU_CONFIG[newServiceType]) {
                    ctx.waitUntil(answerCallbackQuery(callbackId, "❌ Сервис не найден.", token));
                    return true;
                }

                // 🚨 ФИКС 2: СИНХРОНИЗАЦИЯ перед переключением сервиса
                await syncEnvData(storage, envData, AI_MODEL_MENU_CONFIG);

                const newConfig = AI_MODEL_MENU_CONFIG[newServiceType];
                
                const keyboard = getModelMenuKeyboard(envData, newServiceType); 
                const statusTable = generateModelStatusTable(envData); 

                const safeConfigName = newConfig.name.replace(/_/g, '\\_');
                
                ctx.waitUntil(editMessageWithKeyboard(
                    chatId, 
                    messageId, 
                    `🧠 **НАСТРОЙКА AI-МОДЕЛЕЙ**\n\n${statusTable}\n---\nВыберите модель для сервиса: **${safeConfigName}**`,
                    token, 
                    keyboard
                ));
                ctx.waitUntil(answerCallbackQuery(callbackId, `Переключено на ${newConfig.name}`, token));
                return true;
            
            // --- model_set: Установка новой модели ---
            } else if (data.startsWith(servicePrefix)) {
                const storage = envData.LAST_PHOTO_STORAGE; 
                let currentServiceType = '';
                let newModelKey = '';
                
                // Отрезаем "admin_model_set_"
                const remainingData = data.substring(servicePrefix.length); 
            
                // 🚨 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Ищем безопасный разделитель ';'
                const separatorIndex = remainingData.indexOf(';');
                
                if (separatorIndex === -1) {
                    // Если нет разделителя, это некорректная команда
                    ctx.waitUntil(answerCallbackQuery(callbackId, "❌ Ошибка парсинга модели (отсутствует разделитель ';').", token));
                    return true;
                }
            
                // currentServiceType - это все до ';'
                currentServiceType = remainingData.substring(0, separatorIndex);
                // newModelKey - это все после ';'
                newModelKey = remainingData.substring(separatorIndex + 1); 
            
                if (!currentServiceType) {
                    ctx.waitUntil(answerCallbackQuery(callbackId, "❌ Ошибка парсинга модели (неизвестный тип сервиса).", token));
                    return true;
                }
            
                const currentConfig = AI_MODEL_MENU_CONFIG[currentServiceType];
            
                // 1. ПРОВЕРКИ
                if (!currentConfig || !currentConfig.models || !currentConfig.models[newModelKey]) {
                    const errorDetails = `Тип: ${currentServiceType}, Ключ: ${newModelKey}`;
                    console.error(`Model not found in config: ${errorDetails}. Data: ${data}`);
                    ctx.waitUntil(answerCallbackQuery(callbackId, `❌ Ошибка: Ключ модели не найден! ${errorDetails}`, token));
                    return true;
                }                
                const kvKey = currentConfig.kvKey;
                const modelFriendlyNameFull = currentConfig.models[newModelKey]; 
                
                // 1. СОХРАНЕНИЕ и ЛОКАЛЬНОЕ ОБНОВЛЕНИЕ
                await storage.put(kvKey, newModelKey);
                // 🚨 КРИТИЧЕСКИ ВАЖНО: Обновляем envData, чтобы избежать немедленного сброса
                envData[kvKey] = newModelKey; 
                
                // 2. 🚨 ФИКС 3: Синхронизация для обновления ВСЕЙ таблицы статусов. 
                await syncEnvData(storage, envData, AI_MODEL_MENU_CONFIG);

                // 3. ГЕНЕРАЦИЯ ВЫВОДА (логика отображения)
                let providerName = '';
                let modelPath = modelFriendlyNameFull;

                const colonIndex = modelFriendlyNameFull.indexOf(':');
                if (colonIndex !== -1) { 
                    providerName = modelFriendlyNameFull.substring(0, colonIndex + 1).trim() + ' '; 
                    modelPath = modelFriendlyNameFull.substring(colonIndex + 1).trim(); 
                }
                //const cleanedModelName = cleanModelName(modelPath); 
                // Экранируем подчеркивание для безопасного Markdown
                //const displayModelName = `${providerName}${cleanedModelName.replace(/_/g, '\\_')}`; 
                const cleanedModelName = cleanModelName(modelPath); 

                // 🚨 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Форматируем имя модели для копирования (синий цвет)
                const displayModelName = `${providerName}${cleanedModelName}`; 
    
                // ✅ НОВОЕ ИСПРАВЛЕНИЕ: Оборачиваем имя в обратные кавычки для inline code (синий цвет)
                const displayModelNameFormatted = `\`${displayModelName}\``;
                // 4. ОБНОВЛЕНИЕ МЕНЮ
                const keyboard = getModelMenuKeyboard(envData, currentServiceType);
                const statusTable = generateModelStatusTable(envData); 

                const safeConfigName = currentConfig.name.replace(/_/g, '\\_');

                ctx.waitUntil(editMessageWithKeyboard(
                    chatId, 
                    messageId, 
                    // Используем ФОРМАТИРОВАННОЕ имя модели
                    `🧠 **НАСТРОЙКА AI-МОДЕЛЕЙ**\n\n${statusTable}\n---\nТекущий сервис: **${safeConfigName}**\n✅ Установлена модель: ${displayModelNameFormatted}`, 
                    token, 
                    keyboard
                ));

                ctx.waitUntil(answerCallbackQuery(callbackId, `✅ Установлена модель: ${cleanedModelName}`, token));
                return true;
            }
            
            // Если сюда попала неизвестная команда
            ctx.waitUntil(answerCallbackQuery(callbackId, "❌ Неизвестное действие с моделью.", token));
            return true; 
        }
    }
    return false;
}

// ✅ handleCheckImageCommand - Проверяет статус задания KIE.AI, доставляет изображение
/**
 * 🔎 handleCheckImageCommand - Проверяет статус активного задания T2I/I2I и доставляет результат.
 * @param {number} chatId 
 * @param {string} text - Полный текст команды (например, "/checkimage 73a09c3b4605cc6f067795eaf60cd1d7").
 * @param {object} envData - Объект окружения.
 */
async function handleCheckImageCommand(chatId, text, envData) {
    const token = envData.TELEGRAM_BOT_TOKEN;
    const STORAGE = envData.LAST_PHOTO_STORAGE;
    const TASK_DATA_KEY = `${chatId}${LAST_ACTIVE_IMAGE_KEY_SUFFIX}`;
    
    let taskId = null;
    let pollData = null;
    
    // 1. Попытка извлечь Task ID из текста команды (РУЧНАЯ ПРОВЕРКА)
    const parts = text.trim().split(/\s+/);
    if (parts.length > 1 && parts[1].length > 10) { 
        taskId = parts[1];
        
        // --- ФОРМИРОВАНИЕ pollData ДЛЯ РУЧНОЙ ПРОВЕРКИ ---
        // Используем конфигурацию IMAGE_TO_IMAGE_KIEAI по умолчанию
        const KIEAI_IMAGE_CONFIG_NAME = 'IMAGE_TO_IMAGE_KIEAI'; 
        const KIE_AI_BASE_URL = (envData.AI_MODELS[KIEAI_IMAGE_CONFIG_NAME] || {}).BASE_URL || 'https://api.kie.ai/api/v1';
        
        pollData = {
            taskId: taskId,
            // Создаем минимальный modelConfig для QueryTaskKieAiCheckStatus
            modelConfig: { BASE_URL: KIE_AI_BASE_URL }, 
            // Для ручной проверки используем общий ключ (если нет логики извлечения пользовательского ключа здесь)
            apiKey: envData.KIEAI_API_KEY, 
        };
        
    } else {
        // 2. Если ID не передан вручную, ищем в хранилище (СТАНДАРТНЫЙ ПОИСК)
        const taskJson = await STORAGE.get(TASK_DATA_KEY);

        if (!taskJson) {
            return sendMessage(chatId, "❌ **Ошибка**: Активное задание на генерацию изображения не найдено. Запустите /create.", token);
        }

        try {
            pollData = JSON.parse(taskJson);
            taskId = pollData.taskId; // Извлекаем taskId
        } catch (e) {
            return sendMessage(chatId, "❌ **Ошибка**: Некорректные данные активного задания. Попробуйте запустить /create снова.", token);
        }
    }
    
    // Проверка, что taskId существует
    if (!taskId) {
         return sendMessage(chatId, "❌ **Ошибка**: ID задания не найден ни в команде, ни в хранилище.", token);
    }
    
    // 3. Извлечение и ФАЛЛБЕК для modelConfig (Критично для старых записей KV)
    let { modelConfig, apiKey } = pollData; 

    if (!modelConfig || !modelConfig.BASE_URL) {
        
        const KIEAI_IMAGE_CONFIG_NAME = 'IMAGE_TO_IMAGE_KIEAI'; 
        const defaultKieAiConfig = envData.AI_MODELS[KIEAI_IMAGE_CONFIG_NAME];
        
        if (defaultKieAiConfig && defaultKieAiConfig.BASE_URL) {
            modelConfig = defaultKieAiConfig;
            if (!apiKey) {
                apiKey = envData.KIEAI_API_KEY; 
            }
            envData.ctx.waitUntil(logDebug('KIEAI_CONFIG_FALLBACK', `modelConfig отсутствовал в KV, использована конфигурация по умолчанию: ${KIEAI_IMAGE_CONFIG_NAME}`, envData, envData.ctx));
        } else {
            return sendMessage(chatId, "❌ **Критическая ошибка конфигурации**: Невозможно определить BASE_URL для проверки статуса KIE.AI.", token);
        }
    }
    
    // 4. Проверяем статус
    // Здесь apiKey может быть либо из KV (личный), либо общий (KIEAI_API_KEY)
    const statusResult = await QueryTaskKieAiCheckStatus(taskId, modelConfig, apiKey, envData);

    switch (statusResult.status) {
        case 'success':
            await sendMessage(chatId, "🎨 **Задание завершено!** Доставляю изображение...", token);
            // 5. Запускаем доставку
            await deliverImageFromKieAi(chatId, JSON.stringify(statusResult.result), modelConfig.MODEL, envData);
            
            // Task ID остается в KV для I2I операций.
            break;

        case 'fail':
            const failMsg = `❌ **Задание провалено**: ${statusResult.result}.`;
            await sendMessage(chatId, failMsg, token);
            //await deleteActiveTaskData(STORAGE, TASK_DATA_KEY); // Удаляем при провале
            break;

        case 'running':
        default:
            const statusMsg = statusResult.result || 'waiting';
            await sendMessageMarkdown(chatId, `⏳ **Статус**: \`${statusMsg}\`.\nJob ID: \`${taskId}\`.\nПроверьте через несколько секунд.`, token);
            break;
    }
}

/**
 * Обрабатывает команду /checkvideo: извлекает активный Job ID (из KV или аргумента) 
 * и опрашивает KIE.ai через kieAiApiPolling.
 *
 * @param {number} chatId - ID чата.
 * @param {string} text - Полный текст команды (например, "/checkvideo dc854d...").
 * @param {object} envData - Переменные окружения (TELEGRAM_BOT_TOKEN, LAST_PHOTO_STORAGE, AI_MODELS, KIEAI_API_KEY).
 */
async function handleCheckVideoCommand(chatId, text, envData) {
    const token = envData.TELEGRAM_BOT_TOKEN;
    const chatKey = chatId.toString();
    const LAST_ACTIVE_TASK_KEY = chatKey + LAST_ACTIVE_VIDEO_KEY_SUFFIX; 

    let taskId = null;
    let pollData = null;
    let isManualCheck = false;

    // 1. Попытка извлечь Job ID из текста команды (ВРЕМЕННОЕ РЕШЕНИЕ)
    const parts = text.trim().split(/\s+/);
    if (parts.length > 1 && parts[1].length > 10) { 
        taskId = parts[1];
        isManualCheck = true;
        
        // ИСПРАВЛЕНИЕ: Получаем BASE_URL наиболее надежным способом.
        // Если envData.KIEAI_BASE_URL определен (как предполагается в I2V), используем его.
        const KIE_AI_BASE_URL = envData.KIEAI_BASE_URL || (envData.AI_MODELS.TEXT_TO_VIDEO_KIEAI || {}).BASE_URL || 'https://api.kie.ai/api/v1';
        
        // Создаем минимальный modelConfig, который содержит BASE_URL для Polling
        pollData = {
            taskId: taskId,
            // modelConfig должен содержать BASE_URL для kieAiApiPolling
            modelConfig: { BASE_URL: KIE_AI_BASE_URL }, 
            apiKey: envData.KIEAI_API_KEY, 
            functionName: 'kieAiApiPolling',
        };
    }
    
    // 2. Если ID не передан вручную, ищем в хранилище (СТАНДАРТНЫЙ ПОИСК)
    if (!taskId) {
        const pollDataRaw = await envData.LAST_PHOTO_STORAGE.get(LAST_ACTIVE_TASK_KEY); 
        if (pollDataRaw) {
            pollData = JSON.parse(pollDataRaw);
            taskId = pollData.taskId;
        }
    }

    if (!taskId) {
        // Заданий не найдено ни в аргументе, ни в KV
        await sendMessage(
            chatId, 
            "🔎 **Активных заданий на генерацию видео не найдено.**\nИспользуйте команду /video для запуска новой операции.", 
            token
        );
        return;
    }
    
    // 3. Отправка промежуточного сообщения "Проверяю..."
    const checkMessage = await sendMessage(
        chatId, 
        `🔍 **Проверяю статус задания KIE.ai.**\nID: \`${taskId.substring(0, 10)}...\` Ожидайте...`, 
        token
    );
    
    try {
        // 4. Запуск Polling
        const videoUrl = await kieAiApiPolling(
            taskId, 
            pollData.apiKey, 
            pollData.modelConfig.BASE_URL 
        );

        // 5. УСПЕХ: ВЫВОДИМ URL ТЕКСТОМ (ВРЕМЕННОЕ РЕШЕНИЕ!)
        await editMessage(
            chatId, 
            checkMessage.message_id, 
            `✅ **Видео готово!** Прямая ссылка: \n\`${videoUrl}\``, // <--- ИЗМЕНЕНИЕ
            token
        );
        // 5. УСПЕХ: Отправка видео и удаление задания
        await editMessage(
            chatId, 
            checkMessage.message_id, 
            `✅ **Видео готово!** Отправляю файл...`, 
            token
        );

        // Отправка ролика (раскомментировать, когда sendVideoByUrl реализована)
        await sendVideoByUrl(chatId, videoUrl, token);
        
        // 6. Удаляем задание из хранилища KV (только если это не ручная проверка)
        if (!isManualCheck) { 
            //await envData.LAST_PHOTO_STORAGE.delete(LAST_ACTIVE_TASK_KEY);
            await sendMessage(chatId, `✅ **Видео доставлено!** Задание ID \`${taskId.substring(0, 10)}...\` завершено. Статус проверки очищен.`, token);
            await logDebug(`✅ *[Manual Check Success]* Видео для ${chatId} готово и отправлено. Job ID удален (Автоматический режим).`, envData);
        } else {
            // 🛑 ИСПРАВЛЕНИЕ ДЛЯ РУЧНОЙ ПРОВЕРКИ (Установка Task ID для V2V)
    
            // 1. Формируем объект данных для сохранения
            const taskData = {
                taskId: taskId,
                // modelConfig
                modelConfig: { 
                    // Получаем BASE_URL
                    BASE_URL: envData.KIEAI_BASE_URL || (envData.AI_MODELS.TEXT_TO_VIDEO_KIEAI || {}).BASE_URL || 'https://api.kie.ai/api/v1',
                }, 
                apiKey: envData.KIEAI_API_KEY, 
                functionName: 'kieAiApiPolling', // Добавляем, чтобы соответствовать структуре
            };
            
            // 2. Сохраняем Task ID в KV (например, с TTL 3600 секунд = 1 час)
            // LAST_ACTIVE_TASK_KEY уже определен в начале функции.
            // Используйте правильное имя хранилища, в данном случае envData.LAST_PHOTO_STORAGE.
            envData.ctx.waitUntil(
                envData.LAST_PHOTO_STORAGE.put(
                    LAST_ACTIVE_TASK_KEY, 
                    JSON.stringify(taskData), 
                    { expirationTtl: 3600 } 
                )
            );
            
            // 3. Отправляем сообщение об успехе и установке Task ID
            await sendMessage(
                chatId, 
                `✅ **Видео доставлено!** Вы проверили старое задание вручную. Активный статус задания удален не был.\n\n**Task ID (\`${taskId.substring(0, 10)}...\`) установлен для улучшения (V2V).**`, 
                token
            );
            await logDebug(`✅ *[Manual Check Success]* Видео для ${chatId} готово и отправлено. Job ID сохранен для V2V (Ручной режим).`, envData);
        }

    } catch (e) {
        // Ошибка: Генерация не удалась, таймаут или ошибка API
        const errorMessage = e.message || "Неизвестная ошибка проверки статуса.";
        await editMessage(
            chatId, 
            checkMessage.message_id, 
            `❌ *Ошибка проверки статуса KIE.ai:*\n\`${errorMessage}\``, 
            token
        );
        // Если ошибка произошла, но это не ручная проверка, сохраняем Job ID в KV
        // для повторной попытки.
    }
}

/**
 * Обрабатывает команду /checkaudio: извлекает активный Job ID (из KV или аргумента) 
 * и опрашивает KIE.ai через kieAiApiPolling.
 */
async function handleCheckAudioCommand(chatId, text, envData) {
    const token = envData.TELEGRAM_BOT_TOKEN;
    const chatKey = chatId.toString();
    const storage = envData.LAST_PHOTO_STORAGE;
    const LAST_ACTIVE_TASK_KEY = chatKey + LAST_ACTIVE_AUDIO_KEY_SUFFIX; 

    let taskId = null;
    let pollData = null;
    let isManualCheck = false;
    
    // ... (ШАГИ 1 и 2: Получение taskId и pollData) ...
    const parts = text.trim().split(/\s+/);
    if (parts.length > 1 && parts[1].length > 10) { 
        taskId = parts[1];
        isManualCheck = true;
        
        const KIE_AI_BASE_URL = (envData.AI_MODELS.TEXT_TO_AUDIO_KIEAI || {}).BASE_URL || 'https://api.kie.ai/api/v1';
        
        pollData = {
            taskId: taskId,
            model: 'elevenlabs/text-to-speech-turbo-2-5', 
            modelConfig: { BASE_URL: KIE_AI_BASE_URL }, 
            apiKey: envData.KIEAI_API_KEY, 
        };
    } else {
        const pollDataRaw = await storage.get(LAST_ACTIVE_TASK_KEY); 
        if (pollDataRaw) {
            pollData = JSON.parse(pollDataRaw);
            taskId = pollData.taskId;
        }
    }

    if (!taskId) {
        await sendMessage(chatId, "🔎 **Активных заданий на генерацию аудио не найдено.**\nИспользуйте команду /say или функционал Audio Isolation для запуска.", token);
        return;
    }
    
    const checkMessage = await sendMessage(
        chatId, 
        `🔍 **Проверяю статус аудио-задания KIE.ai.**\nID: \`${taskId.substring(0, 10)}...\` Ожидайте...`, 
        token
    );
    
    try {
        // 3. Запуск Polling: Он возвращает либо полный JSON-ответ (строка), либо только URL
        const pollResult = await kieAiApiPolling(
            taskId, 
            envData.KIEAI_API_KEY, 
            pollData.modelConfig.BASE_URL 
        );

        let resultJsonString;
        
        // 🛑 ИСПРАВЛЕНИЕ: ПРОВЕРКА ТИПА ВОЗВРАЩАЕМОГО ЗНАЧЕНИЯ
        // Если результат начинается с "http", это, вероятно, готовый URL (как в ошибке)
        if (pollResult.startsWith('http')) {
            // Если это URL, нам нужно обернуть его в ожидаемый формат JSON
            const mediaUrl = pollResult;
            const fullResultJson = { resultUrls: [mediaUrl] };
            resultJsonString = JSON.stringify(fullResultJson);
            
        } else {
            // Если это не URL, предполагаем, что это JSON-строка, которую мы ждем
            resultJsonString = pollResult;
        }

        // 4. Формирование имитации объекта ответа Kie.ai (rootData)
        const simulatedRootData = {
            code: 200,
            msg: "success",
            data: {
                taskId: taskId,
                model: pollData.model, 
                state: "success",
                resultJson: resultJsonString // Сюда гарантированно попадает JSON-строка
            }
        };

        // 5. Удаляем промежуточное сообщение "Проверяю..."
        await editMessage(
            chatId, 
            checkMessage.message_id, 
            `✅ **Аудио готово!** Отправляю файл...`, 
            token
        );
        
        // 6. Вызов ФУНКЦИИ для обработки данных
        await processKieAiCallbackData(simulatedRootData, chatId, token, envData);
        
        // 7. Очистка задания (если это не ручная проверка)
        if (!isManualCheck) { 
             await storage.delete(LAST_ACTIVE_TASK_KEY);
             await sendMessage(chatId, `✅ **Аудио доставлено!** Задание ID \`${taskId.substring(0, 10)}...\` завершено.`, token);
        } else {
             await sendMessage(chatId, `✅ **Аудио доставлено!** (Ручная проверка). Активный статус задания не очищен.`, token);
        }

    } catch (e) {
        const errorMessage = e.message || "Неизвестная ошибка проверки статуса.";
        await editMessage(
            chatId, 
            checkMessage.message_id, 
            `❌ *Ошибка проверки статуса KIE.ai:*\n\`${errorMessage}\``, 
            token
        );
    }
}

/**
 * ✅ handleKieAiCallback - Обрабатывает уведомление от KIE.AI о завершении задачи.
 * ОБЯЗАТЕЛЬНО: Должна возвращать 200 OK, чтобы KIE.AI не повторял запрос.
 * @param {Request} request - Входящий HTTP-запрос.
 * @param {object} env - Объект окружения (KV, токены).
 * @param {object} ctx - Контекст Worker (для ctx.waitUntil).
 */
async function handleKieAiCallback(request, env, ctx) { // 🛑 ctx ОБЯЗАТЕЛЕН
    // --- 1. ПЕРЕМЕННЫЕ ИЗ REQUEST ---
    const url = new URL(request.url); 
    const chatId = url.searchParams.get('chatId');
    const token = env.TELEGRAM_BOT_TOKEN;
    const numericChatId = Number(chatId);
    
    const successResponse = new Response(JSON.stringify({ code: 200, message: 'Received' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
    });

    const envData = {
        TELEGRAM_BOT_TOKEN: token,
        DEBUG_ENABLED: env.DEBUG_ENABLED,
        DEBUG_CHAT_ID: env.DEBUG_CHAT_ID,
        LAST_PHOTO_STORAGE: env.LAST_PHOTO_STORAGE,
        ctx: ctx // Передаем ctx для использования с logDebug
    };

    if (!chatId) {
        console.error('KIE.AI Callback received without chatId in URL.');
        return new Response(JSON.stringify({ code: 400, message: 'chatId parameter missing' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400
        });
    }

    // --- 2. ГЛОБАЛЬНЫЙ БЛОК CATCH ---
    try {
        const rawBody = await request.text();
        const rootData = JSON.parse(rawBody);

        const logMessage = `KIEAI_CALLBACK_DATA:\n${rawBody}`;
        ctx.waitUntil(logDebug("INFO", logMessage, envData, ctx));
        
        // 🛑 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: ВЫЗОВ НОВОЙ ФУНКЦИИ
        await processKieAiCallbackData(rootData, numericChatId, token, envData);
        
    } catch (e) {
        const errorMsg = `❌ CRITICAL CALLBACK EXCEPTION. Error: ${e.message.substring(0, 150)}`;
        ctx.waitUntil(logDebug("CRITICAL_FAIL", errorMsg, envData, ctx)); 
        
        if (numericChatId) {
            await sendMessage(numericChatId, `❌ Критическая ошибка при обработке Callback. Детали в логах Worker.`, token);
        }
    }
    
    // ВСЕГДА возвращаем 200 OK
    return successResponse; 
}

// ✅ getManagementActionKeyboard (УНИФИЦИРОВАННАЯ КЛАВИАТУРА V4)
function getManagementActionKeyboard(targetId = null, balanceStatus = null, isSubscriptionActive = false) {
    
    let mainButtons = [];
    
    if (targetId) {
        // 1. Кнопка ВЫКЛЮЧЕНИЯ/ВКЛЮЧЕНИЯ:
        let subButton;
        if (isSubscriptionActive) {
            // Если активно, даем кнопку для моментального отключения
            subButton = { text: "❌ Отключить безлимит (Мгновенно)", callback_data: `admin_toggle_sub_off:${targetId}` };
        } else {
            // Если не активно, даем кнопку для включения (с запросом дней)
            subButton = { text: "👑 Включить безлимит (Дни)", callback_data: `admin_set_sub_end_custom:${targetId}` };
        }
        
        mainButtons = [
            // 1. СБРОС ID / ТЕКУЩИЙ ID
            [{ text: `👁️ Сбросить ID: ${targetId}`, callback_data: "admin_reset_target_id" }],

            // 2. БАЛАНС / ПОПОЛНЕНИЕ
            [{ text: "💰 Установить кредитный баланс", callback_data: `admin_set_balance:${targetId}` }],
            
            // 3. БЕЗЛИМИТ: динамическая кнопка
            [subButton],

            // 4. ТОКЕН
            [{ text: "🎉 Создать код активации (Пополнение)", callback_data: `admin_create_token:${targetId}` }],
        ];

    } else {
        // --- РЕЖИМ 2: ID НЕ ВЫБРАН (ЗАПРОС ДЕЙСТВИЯ) ---
        
        const setBalanceCommand = 'admin_select_action:set_balance';
        const createTokenCommand = 'admin_select_action:create_token';
        const setSubEndCommand = 'admin_select_action:set_sub_end'; // Добавление команды

        mainButtons = [
            // 1. СТАТУС ID
            [{ text: "❌ ID не выбран", callback_data: "admin_ignore" }],
            
            // 2. БАЛАНС
            [{ text: "💰 Установить кредитный баланс по ID", callback_data: setBalanceCommand }],
            
            // 3. БЕЗЛИМИТ
            [{ text: "👑 Включить безлимит по ID", callback_data: setSubEndCommand }], // <-- ИСПРАВЛЕНО
            
            // 4. ТОКЕН
            [{ text: "🎉 Создать токен активации для ID", callback_data: createTokenCommand }],
            // ✅ НОВАЯ КНОПКА:
            [{ text: '🆔 Ввести ID вручную', callback_data: 'admin_input_id' }]
        ]
    }
    
    // --- 3. ОБЩИЕ КНОПКИ (ДЛЯ ОБОИХ РЕЖИМОВ) ---
    mainButtons.push(
        [{ text: "👤 Выбрать пользователя из списка", callback_data: "admin_show_user_select_keyboard" }],
        [{ text: "⬅️ Назад в Меню администратора", callback_data: "admin_back_to_menu" }]
    );

    return {
        inline_keyboard: mainButtons
    };
}

// ✅ getAdminKeyboardFromCommand (ИСПРАВЛЕНА: Отображает ДЕЙСТВИЕ, а не статус)
/**
 * Генерирует главное админ-меню на основе текущего статуса флагов.
 * @param {Object} currentEnvData - Объект envData с актуальными статусами (DEBUG_ENABLED и т.д.).
 * @returns {Object} Объект с ключом inline_keyboard.
 */
function getAdminKeyboardFromCommand(currentEnvData) {
    // Если включено (true), действие должно быть 'Выключить' (❌). Если выключено (false), 'Включить' (✅).
    
    // Статусы и действия для Debug (ИНВЕРТИРОВАНО)
    const debugActionText = currentEnvData.DEBUG_ENABLED ? 'Выключить' : 'Включить';
    const debugActionSymbol = currentEnvData.DEBUG_ENABLED ? '❌' : '✅';
    
    // Статусы и действия для TTS (ИНВЕРТИРОВАНО)
    const ttsActionText = currentEnvData.TTS_ENABLED ? 'Выключить' : 'Включить';
    const ttsActionSymbol = currentEnvData.TTS_ENABLED ? '❌' : '✅';
    
    // Статусы и действия для Фото (ИНВЕРТИРОВАНО)
    const photoActionText = currentEnvData.PHOTO_ENABLED ? 'Выключить' : 'Включить';
    const photoActionSymbol = currentEnvData.PHOTO_ENABLED ? '❌' : '✅';

    // Статусы и действия для Видео (ИНВЕРТИРОВАНО)
    const videoActionText = currentEnvData.VIDEO_ENABLED ? 'Выключить' : 'Включить';
    const videoActionSymbol = currentEnvData.VIDEO_ENABLED ? '❌' : '✅';

    const keyboard = {
        inline_keyboard: [
            // 💰 КНОПКА УПРАВЛЕНИЯ
            [{ text: "👥 Управление пользователями", callback_data: "admin_user_menu" }],
            [{ text: "🧠 Настройки AI-моделей", callback_data: 'admin_model_menu' }],
            // Кнопки-переключатели
            [{ text: `🪲 Отладка (${debugActionText} ${debugActionSymbol})`, callback_data: 'admin_debug_toggle' }],
            [{ text: `🎙️ Озвучка (${ttsActionText} ${ttsActionSymbol})`, callback_data: 'admin_toggle_tts' }],
            [{ text: `📸 Фото (${photoActionText} ${photoActionSymbol})`, callback_data: 'admin_toggle_photo' }], 
            [{ text: `🎬 Видео (${videoActionText} ${videoActionSymbol})`, callback_data: 'admin_toggle_video' }], 
            
            // Служебные кнопки
            [{ text: '🔄 Обновить меню команд', callback_data: 'admin_update_cmds' } ],
            [{ text: "🚪 Выход из режима администратора", callback_data: "admin_exit" }],
        ]
    };
    
    return keyboard;
}

/**
 * @param {number} adminChatId - ID администратора.
 * @param {string} messageText - Текст сообщения пользователя (ID или сумма).
 * @param {Object} env - Объект окружения.
 * @param {Object} ctx - Контекст обработчика (для waitUntil).
 * @returns {Promise<boolean>} True, если сообщение было обработано в режиме админа.
 */
async function processAdminStateMessage(adminChatId, messageText, env, ctx) {
    const { TELEGRAM_BOT_TOKEN, LAST_PHOTO_STORAGE } = env;

    const ADMIN_STATE_KEY = adminChatId.toString() + '_admin_state';
    const ADMIN_TARGET_ID_KEY = adminChatId.toString() + '_admin_target_id';

    const adminStateFull = await LAST_PHOTO_STORAGE.get(ADMIN_STATE_KEY);

    if (!adminStateFull) return false;

    // Разделяем состояние: 'awaiting_id:view' -> action='awaiting_id', targetAction='view'
    const [action, targetAction] = adminStateFull.split(':'); 
    
    const targetChatId = await LAST_PHOTO_STORAGE.get(ADMIN_TARGET_ID_KEY);

    // =======================================================
    // !!! ГЛОБАЛЬНАЯ ОТМЕНА ДЕЙСТВИЯ (ОБРАБОТКА REPLY-КНОПКИ) !!!
    // =======================================================
    if (messageText.trim() === '❌ Отменить ввод') {
        await LAST_PHOTO_STORAGE.delete(ADMIN_STATE_KEY);
        
        await hideReplyKeyboardAndRefreshMenu(
            adminChatId, 
            TELEGRAM_BOT_TOKEN, 
            env, 
            ctx, 
            "❌ Ввод отменен. Обновляю меню..."
        );
        return true;
    }
    // --- 1. ВВОД ID: ЕДИНЫЙ ОБРАБОТЧИК (Ручной ввод ID) ---
    if (action === 'awaiting_id') {
        const newTargetChatId = messageText.trim();
        if (!/^\d+$/.test(newTargetChatId) || newTargetChatId.length === 0) {
            await sendMessage(adminChatId, "❌ Неверный формат ID. Пожалуйста, отправьте ТОЛЬКО цифры (Telegram ID пользователя).", TELEGRAM_BOT_TOKEN);
            return true;
        }

        // 1. Сохраняем ID и стираем состояние ожидания ID
        await LAST_PHOTO_STORAGE.put(ADMIN_TARGET_ID_KEY, newTargetChatId, { expirationTtl: 3600 * 24 * 7 });
        await LAST_PHOTO_STORAGE.delete(ADMIN_STATE_KEY); 
        
        // 2. Скрываем Reply Keyboard 
        await sendMessage(adminChatId, `✅ ID пользователя (${newTargetChatId}) сохранен.`, TELEGRAM_BOT_TOKEN, {
            reply_markup: { hide_keyboard: true }
        });

        // 3. Перенаправляем на следующий этап
        if (targetAction === 'view') {
            // !!! ВМЕСТО processAdminViewUser: Обновляем меню через handleAdminCallback
            const fakeCallback = { data: 'admin_user_menu', message: { message_id: 0 } };
            ctx.waitUntil(handleAdminCallback(adminChatId, fakeCallback, env, ctx));
        } else if (targetAction === 'set_balance') {
            await LAST_PHOTO_STORAGE.put(ADMIN_STATE_KEY, 'awaiting_new_balance', { expirationTtl: 600 });
            await sendMessage(adminChatId, `
✅ ID пользователя (${newTargetChatId}) сохранен.
Теперь отправьте мне **ЧИСЛО** — новый **ТОЧНЫЙ БАЛАНС** фото для этого пользователя.
`, TELEGRAM_BOT_TOKEN);
        } else if (targetAction === 'create_token') {
            await LAST_PHOTO_STORAGE.put(ADMIN_STATE_KEY, 'awaiting_amount_token', { expirationTtl: 600 });
            await sendMessage(adminChatId, `
✅ ID пользователя (${newTargetChatId}) сохранен.
Теперь отправьте мне **СУММУ В РУБЛЯХ**, которую оплатил пользователь, для создания кода активации.
Напоминаю: Цена за 1 фото = ${CREDIT_COST_RUB} руб.
`, TELEGRAM_BOT_TOKEN);
        } else if (targetAction === 'set_sub_end_custom') {
            await LAST_PHOTO_STORAGE.put(ADMIN_STATE_KEY, 'awaiting_new_sub_end', { expirationTtl: 600 });
            await sendMessage(adminChatId, `
✅ ID пользователя (${newTargetChatId}) сохранен.
Теперь отправьте **ЦЕЛОЕ ЧИСЛО ДНЕЙ** для активации безлимита. (0 для отключения).
`, TELEGRAM_BOT_TOKEN);
        }
        return true;
    }
    
    // --- 2. ОЖИДАЕМ СУММУ ДЛЯ УСТАНОВКИ БАЛАНСА (admin_set_balance) ---
    if (action === 'awaiting_new_balance') {
        const newBalance = parseInt(messageText.trim());

        if (isNaN(newBalance) || newBalance < 0 || !targetChatId) {
            await sendMessage(adminChatId, "❌ Неверное значение. Отправьте ТОЛЬКО неотрицательное число.", TELEGRAM_BOT_TOKEN);
            return true;
        }
        
        const resultMsg = await setPhotoBalance(targetChatId, LAST_PHOTO_STORAGE, newBalance);
        
        await sendMessageMarkdown(adminChatId, `
✅ **БАЛАНС УСТАНОВЛЕН**
${resultMsg}
ID пользователя: \'${targetChatId}\'
`, TELEGRAM_BOT_TOKEN);
        
        // Очистка состояния, ID оставляем
        await LAST_PHOTO_STORAGE.delete(ADMIN_STATE_KEY);
        
        // 🔥 ПРИМЕНЕНИЕ СКЛОНЕНИЯ
        const newBalanceWord = pluralize(newBalance, CREDIT_FORMS);

        // Обновляем меню (П.1)
        const refreshMessage = `✅ **Баланс установлен на ${newBalance} ${newBalanceWord}.**`;
        await hideReplyKeyboardAndRefreshMenu(adminChatId, TELEGRAM_BOT_TOKEN, env, ctx, refreshMessage);

        return true;
    }

    // --- 3. ОЖИДАЕМ СУММУ ДЛЯ ГЕНЕРАЦИИ ТОКЕНА (admin_create_token) ---
    if (action === 'awaiting_amount_token') {
        const amountRub = parseInt(messageText.trim());

        if (isNaN(amountRub) || amountRub <= 0 || !targetChatId) {
            await sendMessage(adminChatId, "? Неверное значение. Отправьте ТОЛЬКО неотрицательное число.", TELEGRAM_BOT_TOKEN);
            return true;
        }
        // 🛑 ИЗМЕНЕНИЕ: Используем CREDIT_COST_RUB для расчета кредитов
        const creditsToAdd = Math.floor(amountRub / CREDIT_COST_RUB);

        // --- ЛОГИКА ГЕНЕРАЦИИ ТОКЕНА ---
        const uniqueToken = Array.from(crypto.getRandomValues(new Uint8Array(10)))
             .map(b => b.toString(36)).join('').substring(0, 10);
        
        const TOKEN_CREDIT_KEY = 'token_' + uniqueToken;
        await LAST_PHOTO_STORAGE.put(TOKEN_CREDIT_KEY, creditsToAdd.toString(), { expirationTtl: 3600 * 24 * 7 });

        // Очистка состояния, ID оставляем
        await LAST_PHOTO_STORAGE.delete(ADMIN_STATE_KEY);

        const activationCommand = `/activate_${uniqueToken}`;
// 🔥 ПРИМЕНЕНИЕ СКЛОНЕНИЯ
const creditsToAddWord = pluralize(creditsToAdd, CREDIT_FORMS);

        const adminMessage = `
✅ **КОД АКТИВАЦИИ СОЗДАН**

Пользователь ID: ${targetChatId}
Оплачено: **${amountRub} руб.**
Начислено: **${creditsToAdd} ${creditsToAddWord}**

Уникальная команда для активации: ${activationCommand}
Это одноразовая команда. Не сообщайте её никому.
`;
        await sendMessage(adminChatId, adminMessage, TELEGRAM_BOT_TOKEN);

        // Уведомление пользователю
        ctx.waitUntil(sendMessage(targetChatId, "🎉 Администратор создал для Вас код активации баланса. Ожидайте команду!", TELEGRAM_BOT_TOKEN).catch(e => {
            console.error(`Не удалось уведомить пользователя ${targetChatId}:`, e);
        }));
        
        // Обновляем меню (П.1)
        const refreshMessage = `✅ **Токен для ${targetChatId} создан.**`;
        await hideReplyKeyboardAndRefreshMenu(adminChatId, TELEGRAM_BOT_TOKEN, env, ctx, refreshMessage);

        return true;
    }

    // --- 4. ОЖИДАЕМ КОЛИЧЕСТВА ДНЕЙ ДЛЯ БЕЗЛИМИТА ---
    else if (action === 'awaiting_new_sub_end') { 
        const days = parseInt(messageText.trim());

        if (isNaN(days) || days < 0 || !targetChatId) {
            await sendMessage(adminChatId, "⚠️ Ошибка. Отправьте **ЦЕЛОЕ ЧИСЛО ДНЕЙ** (например, 30).", TELEGRAM_BOT_TOKEN);
            return true;
        }

        const SUBSCRIPTION_END_KEY_SUFFIX = '_sub_end_credit'; 
        const SUBSCRIPTION_END_KEY = targetChatId + SUBSCRIPTION_END_KEY_SUFFIX;
        
        let responseText;

        if (days === 0) {
            await LAST_PHOTO_STORAGE.delete(SUBSCRIPTION_END_KEY);
            responseText = `👑 **Безлимит для ID \`${targetChatId}\` отключен.**`;
        } else {
            const now = Date.now();
            const oneDayInMs = 86400000;
            const endTime = now + (days * oneDayInMs); 
            
            await LAST_PHOTO_STORAGE.put(SUBSCRIPTION_END_KEY, endTime.toString(), { expirationTtl: (days * 24 * 3600) + 10 });

            const endDate = new Date(endTime);
            const dateString = endDate.toLocaleString('ru-RU', { 
                day: '2-digit', month: '2-digit', year: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            });
            
            responseText = `👑 **Безлимит для ID \`${targetChatId}\` установлен на ${days} дней.**\nИстекает: **${dateString}**`;
        }

        // Очистка состояния, ID оставляем
        await LAST_PHOTO_STORAGE.delete(ADMIN_STATE_KEY);
        
        await sendMessage(adminChatId, responseText, TELEGRAM_BOT_TOKEN);
        
        // Обновляем меню (П.1)
        const refreshMessage = responseText.replace(/<.*?>/g, '').replace(/\n/g, ' ').substring(0, 60); // Берем часть текста
        await hideReplyKeyboardAndRefreshMenu(adminChatId, TELEGRAM_BOT_TOKEN, env, ctx, refreshMessage);
        
        return true; 
    }
    
    return false;
}

// ✅ Обновленная processAdminAwaitingId
async function processAdminAwaitingId(chatId, env, targetAction) {
    const ADMIN_STATE_KEY = chatId.toString() + '_admin_state';
    
    // Переход в режим ожидания ID с указанием целевого действия
    await env.LAST_PHOTO_STORAGE.put(ADMIN_STATE_KEY, `awaiting_id:${targetAction}`, { expirationTtl: 600 });

    const messageText = `
➡️ **РЕЖИМ ВВОДА ID** (Действие: ${targetAction})

Пожалуйста, отправьте мне **ТОЛЬКО** Telegram ID пользователя (цифры) для продолжения.
`;
    await sendMessage(chatId, messageText, env.TELEGRAM_BOT_TOKEN);
}

// ✅ processAdminToggleSubscription - Переключает статус безлимита (ФИНАЛЬНАЯ ВЕРСИЯ с ctx)
/**
 * @param {number} adminChatId - ID администратора.
 * @param {string} token - Токен Telegram-бота.
 * @param {Object} storage - Хранилище (KV).
 * @param {string} targetId - ID целевого пользователя.
 * @param {Object} ctx - Контекст обработчика (для waitUntil).
 * @param {number} messageId - ID сообщения для редактирования.
 */
async function processAdminToggleSubscription(adminChatId, token, storage, targetId, ctx, messageId) {
    const targetIdNum = parseInt(targetId);
    
    // *Предполагается, что isCreditSubscriptionActive и setCreditSubscription определены*
    const isSubActive = await isCreditSubscriptionActive(targetIdNum, storage);
    
    let resultMsg;
    if (isSubActive) {
        // Отключаем
        resultMsg = await setCreditSubscription(targetIdNum, storage, false);
    } else {
        // Включаем (на 30 дней, как определено в setCreditSubscription)
        resultMsg = await setCreditSubscription(targetIdNum, storage, true);
    }
    
    // Обновляем меню после изменения
    // Редактируем сообщение, чтобы показать прогресс, перед обновлением
    // *Предполагается, что editMessage определен*
    ctx.waitUntil(editMessage(adminChatId, messageId, `⏳ ${resultMsg}\n\nОбновляю статус...`, token));
    
    // !!! ИСПРАВЛЕНИЕ: Обновляем меню, вызывая логику admin_user_menu в handleAdminCallback
    const userMenuCallback = { 
        data: 'admin_user_menu', 
        message: { message_id: messageId } 
    };

    // Создаем минимальный объект envData, необходимый для handleAdminCallback
    const envData = { 
        TELEGRAM_BOT_TOKEN: token, 
        LAST_PHOTO_STORAGE: storage 
    };

    // *Предполагается, что handleAdminCallback доступна в области видимости.*
    await handleAdminCallback(adminChatId, userMenuCallback, envData, ctx);
}

// ✅ processStartCommand - ГЛАВНОЕ МЕНЮ (Начало работы)
async function processStartCommand(chatId, envData, TELEGRAM_BOT_TOKEN) {
    const STORAGE = envData.LAST_PHOTO_STORAGE; 
    // ✅ ИСПРАВЛЕНО: Определяем, есть ли сохраненное изображение
    const isPhotoSaved = !!(await STORAGE.get(chatId + LAST_IMAGE_DATA_KEY_SUFFIX));
    const isVideoSaved = !!(await STORAGE.get(chatId + LAST_VIDEO_DATA_KEY_SUFFIX));

    // 1. Сначала удаляем старую клавиатуру
    //await sendMessageReplyKeyboard(chatId, "...", TELEGRAM_BOT_TOKEN, true);

    // Используем новую функцию
    const { messageText, keyboardObject } = getStartMenuData(isPhotoSaved, isVideoSaved);
    
    // 🛑 1. ОТПРАВКА ПЕРВОГО СООБЩЕНИЯ (с Reply Keyboard)
    const mainReplyKeyboard = getMainReplyKeyboard();
    // ОТПРАВКА REPLY KEYBOARD
    
    await sendMessageReplyKeyboard(
        chatId, 
        // "⏳ Думаю...", // Короткий текст-якорь для установки клавиатуры
        "✅ Готово!",
        TELEGRAM_BOT_TOKEN, 
        mainReplyKeyboard // <-- Передаем объект Reply Keyboard
    );
    // 🛑 2. ОТПРАВКА ВТОРОГО СООБЩЕНИЯ (с Inline Keyboard)
    // Используем sendMessageWithKeyboard, так как оно создано для Inline Keyboard
    await sendMessageWithKeyboard(
        chatId, 
        messageText, 
        TELEGRAM_BOT_TOKEN, 
        keyboardObject.inline_keyboard // Передаем только массив кнопок, как требует sendMessageWithKeyboard
    ); 
    
    
}
// 🏠 ГЛАВНОЕ МЕНЮ КНОПКИ И ОКНО С КОМАНДАМИ
// ✅ getStartMenuData - ГЕНЕРИРУЕТ КНОПКИ ДЛЯ ГЛАВНОГО МЕНЮ
function getStartMenuData(isPhotoSaved, isVideoSaved) {

    const keyboard = {
        inline_keyboard: [
            // Основные команды
            [{ text: '💰 Меню управления балансом', callback_data: 'show_balance' }],
            [{ text: "🎨 Меню бесплатной генерации изображений", callback_data: 'cmd:/create_empty' }],
            [{ text: "✏️ Задать Промпт", callback_data: 'cmd:/prompt' },
             { text: "🎙️ Озвучить Текст", callback_data: 'cmd:/say_empty' }],
            [{ text: "📖 Делать Шедевры", callback_data: 'cmd:/text_empty' },
             { text: "✨ Улучшить Фото", callback_data: 'cmd:/photo' }],
            [{ text: `🔄 Ресайзить Фото`, callback_data: `select_resize_mode|IMAGE_TO_RESIZE` },
             { text: `🎦 Подогнать Видео`, callback_data: `select_resize_mode|VIDEO_TO_RESIZE` }],
            [{ text: "🔍 Увеличить Фото", callback_data: 'select_upscale_mode|IMAGE_TO_UPSCALE' },
             { text: "📺 Повысить Видео", callback_data: 'select_upscale_mode|VIDEO_TO_UPSCALE' }],
            [{ text: "📹 Сгенерить Видео", callback_data: 'set_video_mode|T2V' },
             { text: "🎬 Оживить Фото", callback_data: 'set_video_mode|I2V' }],
            [{ text: "🗣 Создать Аватар", callback_data: 'set_video_mode|A2V' },
             { text: "📽️ Изменить Видео", callback_data: 'set_video_mode|V2V' }],
            [{ text: "💾 Ваши сохраненные данные", callback_data: 'cmd:/mediadata' }]
            //[{ text: "❔ помощь по выбору", callback_data: 'dummy_no_buttons' }]
        ]
    };

    const messageText = `
    🏠 **Добро пожаловать в Gemini AI от Leshiy!**

Вот что я могу:
📸 Отправьте **фото** - я сгенерирую **промпт**.
💬 **Просто начните писать** - я стану вашим собеседником.
🔈 Отправьте **голосовое** - я его расшифрую и отвечу голосом.
🎧 Отправьте мне аудио или видеофайл я его транскрибирую.
💰 /balance для управления **балансом** и финансами.
✏️ /prompt для создания или перегенерации **промпта**.
🎨 /create для бесплатной пробы **генерации** по тексту и фото.
📖 /text для платной **визуализации шедевров** по промпту
✨ /photo для **улучшения фото** (особенно черно-белых).
🎬 /video для создания **видеороликов**.
🗣 /avatar для создания **аватара**.
🔄 /resize для изменения размера фото и видео.
🔍 /upscale для увеличения разрешения фото и видео.
🎙️ /say для **озвучивания** текста голосом.
💾 /media для управления **сохраненными данными**.
🔑 /apikey для управления API-ключом.
🗑️ /stop для **очистки** сохраненных данных.

👇 Выберите действие ниже или отправьте мне фото или видео.
`;

    return { messageText, keyboardObject: keyboard };
}

// ✅ sendPhotoMenu - Отправляет меню /photo или предупреждение (ФИНАЛЬНАЯ ВЕРСИЯ)
/**
 * @description Получает текущее состояние фото/промпта, генерирует меню и отправляет/редактирует сообщение.
 * @param {number} chatId - ID чата.
 * @param {string} token - Токен Telegram Bot API.
 * @param {Object} storage - KV-биндинг (LAST_PHOTO_STORAGE).
 * @param {Object} envData - Объект окружения (включая константы суффиксов).
 * @param {Object} ctx - Контекст обработчика (для waitUntil).
 * @param {number | null} [messageId=null] - ID сообщения для редактирования (если есть).
 */
async function sendPhotoMenu(chatId, token, storage, envData, ctx, messageId = null) {
    const chatKey = chatId.toString();
    // ✅ ИСПРАВЛЕНО: Используем суффиксы из envData, как в вашем рабочем коде
    const LAST_PROMPT_KEY = chatKey + envData.LAST_PROMPT_KEY_SUFFIX;
    const LAST_IMAGE_DATA_KEY = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX;

    try {
        const userDefinedPrompt = await storage.get(LAST_PROMPT_KEY);
        const rawImageKVData = await storage.get(LAST_IMAGE_DATA_KEY, { type: 'text' });
        
        // Определяем, есть ли сохраненное изображение
        const isPhotoSaved = !!rawImageKVData; 

        // 1. АСИНХРОННАЯ ГЕНЕРАЦИЯ МЕНЮ С БАЛАНСОМ
        // ✅ ВАЖНО: Вызов с await и передача всех 4-х аргументов: chatId, storage, prompt, photoSaved
        const { messageText, keyboardObject } = await getPhotoMenuKeyboard(
            chatId, 
            storage, 
            userDefinedPrompt, 
            isPhotoSaved
        );
        
        // 2. Отправляем/редактируем сообщение, используя ВАШИ функции
        if (messageId) {
            // ✅ Редактируем сообщение: editMessageWithKeyboard (5 аргументов)
            ctx.waitUntil(editMessageWithKeyboard(
                chatId, 
                messageId, 
                messageText, // messageText из асинхронного вызова
                token, 
                keyboardObject.inline_keyboard // Клавиатура из асинхронного вызова
            ));
        } else {
            // ✅ Отправляем новое сообщение: sendMessageWithKeyboard (4 аргумента)
            ctx.waitUntil(sendMessageWithKeyboard(
                chatId, 
                messageText, // messageText из асинхронного вызова
                token, 
                keyboardObject.inline_keyboard // Клавиатура из асинхронного вызова
            ));
        }
    } catch (e) {
        // Логирование
        const errorString = `Fatal error in sendPhotoMenu for chat ${chatId}: ${e.message} Stack: ${e.stack ? e.stack.substring(0, 500) : 'N/A'}`;
        ctx.waitUntil(logDebug("MENU_CRITICAL", errorString, envData));
        
        // Отправка пользователю уведомления
        await sendMessage(chatId, "❌ Критическая ошибка при загрузке меню фото. Проверьте логи Cloudflare.", token);
    }
}

// ✅ getPhotoMenuKeyboard - Генерирует Inline-клавиатуру и текст для меню /photo
/**
 * @description Генерирует Inline-клавиатуру и текст для меню /photo, включая статус баланса.
 * @param {number} chatId - ID чата.
 * @param {Object} LAST_PHOTO_STORAGE - KV-биндинг.
 * @param {string} currentPrompt - Текущий промпт.
 * @param {boolean} isPhotoSaved - Флаг наличия сохраненного фото.
 * @returns {Promise<{messageText: string, keyboardObject: Object}>} Объект с текстом и клавиатурой.
 */
async function getPhotoMenuKeyboard(chatId, LAST_PHOTO_STORAGE, currentPrompt, isPhotoSaved) { 
    
    const hasPrompt = currentPrompt && currentPrompt.trim().length > 0;
    let keyboard = [];

    // --- АСИНХРОННЫЙ ВЫЗОВ: ПОЛУЧАЕМ СТАТУС БАЛАНСА ---
    const balanceStatus = await getCurrentCreditBalance(chatId, LAST_PHOTO_STORAGE);
    // ---------------------------------------------
    
    // -------------------------------------------------------------------
    // 🔥 НОВЫЙ БЛОК: РАСЧЕТ ЦЕНЫ (I2I)
    // -------------------------------------------------------------------
    const serviceType = 'IMAGE_TO_IMAGE';
       
    // 2. Расчет цены (I2I обычно статичен, поэтому длительность и разрешение не нужны)
    const calculatedPriceCredits = typeof COST_PHOTO_CREDIT !== 'undefined' ? COST_PHOTO_CREDIT : 1;
    
    // 3. Форматирование строки цены
    const priceLine = calculatedPriceCredits > 0 
        ? `💸 **Цена улучшения:** ${formatPrice(calculatedPriceCredits)}` 
        : '💸 **Цена улучшения:** Бесплатно';
        
    // -------------------------------------------------------------------

    // --- 1-я строка: Вернуться в главное меню ---
    keyboard.push([
        { text: "🏠 Открыть главное меню /start", callback_data: "start_command" }
    ]);
    // Добавляем 2-ю строку для управления балансом
    keyboard.push([{ text: '💰 Меню управления балансом', callback_data: 'show_balance' }]);
    // --- 3-я строка: T2I и I2I (по 2 кнопки) ---
    const activeIcon = '✅ '; 
    let currentMode = "I2I"; 

    let modeButtonRow1 = [];
    let modeButtonRow2 = [];
    // 1. Text → Image (T2I) 
    if (currentMode === 'T2I') {
        modeButtonRow1.push({ text: activeIcon + "📖 Text → Image", callback_data: 'dummy_t2i_active' });
    } else {
        modeButtonRow1.push({ text: "📖 Text → Image", callback_data: 'cmd:/text_empty' });
    }
    // 2. Image → Video (I2I) 
    if (currentMode === 'I2I') { 
        modeButtonRow1.push({ text: activeIcon + "✨ Image → Image", callback_data: 'dummy_i2i_active' });
    } else {
        modeButtonRow1.push({ text: "✨ Image → Image", callback_data: 'cmd:/photo' });
    }
    keyboard.push(modeButtonRow1); // Добавляем 2-ю строку
    
    // --- 4-я строка: Загрузить фото (если его нету) ---
    keyboard.push([
        { 
            text: isPhotoSaved ? "💾 Посмотреть загруженное фото" : "📸 Загрузить фотографию", 
            callback_data: isPhotoSaved ? 'cmd:/view_saved_photo' : 'cmd:/upload_photo' 
        }
    ]);
    // --- 5-я строка: Перейти в меню промпта ---
    keyboard.push([{ text: "✏️ Меню работы с промптом (/prompt)", callback_data: 'cmd:/prompt' }],);    
    // --- 6-я строка Основные действия с промптом ---
    keyboard.push([
        { text: hasPrompt ? "✏️ Редактировать промпт" : "🆕 Создать новый промпт", 
            callback_data: hasPrompt ? 'edit_prompt' : 'create_new_prompt'},
        { text: hasPrompt ? "🧹 Очистить промпт" : "⚠️ Промпт не задан",
            callback_data: hasPrompt ? 'clear_prompt' : 'dummy_no_prompt'}
    ]);
    // --- 7-я строка: Улучшить фото (Основное действие) ---
    keyboard.push([
        { 
            text: isPhotoSaved && hasPrompt ? "✨ Улучшить фотографию сейчас" : "🚫 Кнопка Улучшения не доступна", 
            callback_data: isPhotoSaved && hasPrompt ? 'cmd:/photo_now' : 'dummy_no_photo_or_prompt' 
        }
    ]);

    // --- ФОРМИРОВАНИЕ ТЕКСТА СООБЩЕНИЯ ---
    let messageText;

    // Вставляем статус баланса в каждый блок текста
    const statusLine = `💰 **Баланс:** ${balanceStatus}`;

    if (!isPhotoSaved) { // Высший приоритет: Нет сохраненного фото
        messageText = `
✨ **Меню улучшения фотографий (Image-to-Image)**

❔ **Как это работает?:**
Нейросеть использует 📷 **загруженное фото** и ✏️ **указанный промпт** для создания улучшенного, гиперреалистичного изображения, сохраняя композицию и точность, а также добавляет цвета к черно-белой фотографии.

⚠️ **Фото** или **Промпт** не обнаружены.

${statusLine}
${priceLine}

Пожалуйста сначала отправьте картинку или фотографию в чат, чтобы я мог её проанализировать и сохранить.
А затем вернитесь в это меню снова.

Нажмите 🏠, чтобы вернуться в Главное меню, или отправьте фото прямо сейчас.
`;
    } else if (hasPrompt) { // Фото и Промпт присутствуют
        messageText = `
✨ **Меню улучшения фотографий (Image-to-Image)**
        
❔ **Как это работает?:**
Нейросеть использует 📷 **сохраненное фото** и ✏️ **предоставленный промпт** для создания улучшенного, гиперреалистичного изображения, сохраняя композицию и точность, а также добавляет цвета к черно-белой фотографии.
     
✅ **Фото** загружено.
✅ **Промпт** задан.

${statusLine}
${priceLine}

Нажмите ✨ **Улучшить фотографию сейчас**, чтобы превратить сохраненный кадр в шедевр.

Текущий промпт: \`${currentPrompt.substring(0, 100).replace(/`/g, '')}\`${currentPrompt.length > 100 ? '...' : ''}`;
        
    } else { // Фото есть, но нет Промпта
        messageText = `
✨ **Меню улучшения фотографий (Image-to-Image)**
        
❔ **Как это работает?:**
Для улучшения фото нейросети нужен ✏️ **текстовый промпт**, описывающий загруженную фотографию или картинку для получения желаемого результата (например, "студийный портрет, солнечный свет").

✅ **Фото** загружено.
⚠️ **Промпт не задан.**

${statusLine}
${priceLine}

Для запуска улучшения необходимо сначала задать промпт.

Нажмите 🆕 **Создать новый промпт** или перейдите в ✏️ Меню работы с промптом (/prompt).`;
    }

    return { messageText: messageText, keyboardObject: { inline_keyboard: keyboard } };
}

// ✅ sendResizeMenu - Отправляет меню /resize
/**
 * @description Получает текущее состояние медиа, генерирует меню Resize и отправляет/редактирует сообщение.
 */
async function sendResizeMenu(chatId, token, storage, envData, ctx, messageId = null) {
    const chatKey = chatId.toString();
    
    // 🛑 ИСПРАВЛЕНИЕ: Используем ключи для ФОТО и ВИДЕО
    const LAST_IMAGE_DATA_KEY = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX; 
    const LAST_VIDEO_DATA_KEY = chatKey + LAST_VIDEO_DATA_KEY_SUFFIX; 

    try {
        // 1. ЧТЕНИЕ ДАННЫХ ИЗ KV (Читаем ОБА КЛЮЧА)
        const [rawImage, rawVideo] = await Promise.all([
            storage.get(LAST_IMAGE_DATA_KEY, { type: 'text' }),
            storage.get(LAST_VIDEO_DATA_KEY, { type: 'text' }),
        ]);
        
        // Определяем, есть ли сохраненное медиа
        const isPhotoSaved = !!rawImage; 
        const isVideoSaved = !!rawVideo; 
        
        // 💡 Логика по умолчанию:
        // Если есть видео, показываем меню видео. Если нет, но есть фото, показываем фото.
        // Если нет ничего, показываем меню видео (поскольку оно первое в колбэках).
        const defaultMode = isVideoSaved ? 'VIDEO' : (isPhotoSaved ? 'IMAGE' : 'VIDEO');

        // Выбор функции генерации меню на основе дефолтного режима
        let menu;
        
        if (defaultMode === 'IMAGE') {
        // ✅ Добавляем 'storage' в конец аргументов
        menu = await getResizeImageMenuKeyboard(chatId, envData, null, isPhotoSaved, isVideoSaved, storage); 
    } else { // defaultMode === 'VIDEO'
        // ✅ Добавляем 'storage' в конец аргументов
        menu = await getResizeVideoMenuKeyboard(chatId, envData, null, isPhotoSaved, isVideoSaved, storage); 
    }

        // 3. Отправляем/редактируем сообщение (Используем Ваши готовые функции)
        if (messageId) {
            ctx.waitUntil(editMessageWithKeyboard(
                chatId, 
                messageId, 
                menu.messageText, 
                token, 
                menu.keyboardObject.inline_keyboard 
            ));
        } else {
            ctx.waitUntil(sendMessageWithKeyboard(
                chatId, 
                menu.messageText, 
                token, 
                menu.keyboardObject.inline_keyboard 
            ));
        }
    } catch (e) {
        const errorString = `Fatal error in sendResizeMenu for chat ${chatId}: ${e.message} Stack: ${e.stack ? e.stack.substring(0, 500) : 'N/A'}`;
        ctx.waitUntil(logDebug("RESIZE_CRITICAL", errorString, envData));
        await sendMessage(chatId, "❌ Критическая ошибка при загрузке меню изменения размера.", token);
    }
}

/**
 * @description Генерирует клавиатуру для меню изменения размера/поворота ФОТО.
 * @param {number} chatId ID чата.
 * @param {Object} envData Объект переменных окружения (константы).
 * @param {string|null} lastError Последняя ошибка для отображения в меню.
 * @param {boolean} isPhotoSaved Статус наличия фото в KV.
 * @param {boolean} isVideoSaved Статус наличия видео в KV.
 * @param {Object} storage KV-биндинг (LAST_PHOTO_STORAGE).
 * @returns {Object} { messageText, keyboardObject }
 */
async function getResizeImageMenuKeyboard(chatId, envData, lastError = null, isPhotoSaved, isVideoSaved, storage) {
    const PHOTO_RES_OBJ = { '240p': 240, '360p': 360, '480p': 480, '640p': 640, '720p': 720, '1080p': 1080, '1440p': 1440, '2160p': 2160 };
    const PHOTO_STEPS = ['240p', '360p', '480p', '640p', '720p', '1080p', '1440p', '2160p'];
    const RESIZE_IMAGE_MODE_KEY = RESIZE_IMAGE_MODE || 'IMAGE_TO_RESIZE';
    const ROTATE_IMAGE_MODE_KEY = ROTATE_IMAGE_MODE || 'IMAGE_TO_ROTATE';
    const RESIZE_VIDEO_MODE_KEY = 'VIDEO_TO_RESIZE';

    // Используем ваш статус isPhotoSaved
    const canRun = isPhotoSaved; 

    // 1. Извлечение данных (используем только полные имена)
    const currentMediaData = await getCurrentMediaData(chatId, envData, storage, false);
    const currentWidth = currentMediaData?.currentWidth || 0;
    const currentHeight = currentMediaData?.currentHeight || 0;
    const aspectType = currentMediaData?.aspectType || 'portrait';

    // 2. Генерация динамических кнопок
    const dynamicSteps = getCalculatedPhotoSteps(currentWidth, currentHeight, aspectType);
            
    // 3. Логика "Ракеты" (через let для перезаписи)
    let nextStepObj = dynamicSteps.find(step => step.currentHeight > currentHeight) || dynamicSteps[dynamicSteps.length - 1];
    let defaultResParam = nextStepObj.p;
    let defaultResLabel = nextStepObj.label;
    
    // Дополнительная проверка для "Ракеты", если фото загружено
    if (isPhotoSaved && currentHeight > 0) {
        const foundNext = dynamicSteps.find(step => step.currentHeight > currentHeight);
        if (foundNext) {
            nextStepObj = foundNext;
            defaultResParam = foundNext.p;
            defaultResLabel = foundNext.label;
        } else {
            const lastStep = dynamicSteps[dynamicSteps.length - 1];
            nextStepObj = lastStep;
            defaultResParam = lastStep.p;
            defaultResLabel = lastStep.label;
        }
    }

    // 3. АСИНХРОННЫЙ ВЫЗОВ: ПОЛУЧАЕМ СТАТУС БАЛАНСА
    let balanceStatus = '...';
    try {
        balanceStatus = await getCurrentCreditBalance(chatId, storage);
    } catch (e) {
        balanceStatus = 'Ошибка чтения'; 
    }

    // --- 4. ФОРМИРОВАНИЕ ТЕКСТА (Строго по типу ФОТО) ---
    const activeIcon = '✅ ';
    const displayName = '🔄 Фото: Ресайз';
    const priceLine = '💸 **Цена:** Бесплатно (через Leshiy Media Converter)';
    
    const currentSizeLine = isPhotoSaved 
        ? `**Текущий размер:** 📐 ${currentWidth}x${currentHeight} пикселей` 
        : `**Текущий размер:** ❓ Нет данных`;
        
    const mediaStatusLine = isPhotoSaved 
        ? `✅ **Фото** загружено.` 
        : `⚠️ Для начала работы отправьте мне фотографию (или файл-изображение)`;
    
    const description = `
📐 **Меню изменения размера фото (Image-to-Resize)**

❔ **Как это работает:**
Вы можете изменить разрешение загруженного вами **фото** или повернуть его.
`;
    
    const statusLine = `💰 **Баланс:** ${balanceStatus}`;
    let messageText = `${description}\n${mediaStatusLine}\n\n${currentSizeLine}\nТекущий режим: **${displayName}**\n\n${statusLine}\n${priceLine}\n\nВыберите размер для сжатия (уменьшения) или поворот:`;

    // 5. ГЕНЕРАЦИЯ КНОПОК С ГАЛОЧКАМИ/ПЛЮСАМИ
    const resolutionButtons = dynamicSteps.map(step => {
        let icon = '';
        if (isPhotoSaved && currentHeight > 0) {
            if (Math.abs(currentHeight - step.currentHeight) <= 85) icon = '✔️'; //была ✔️ зелёная галочка
            else if (step.currentHeight > currentHeight) icon = '➕'; //был ➕ плюс
            else icon = '➖'; //был ➖ минус
        }
        return {
            text: `${icon} ${step.label}`,
            callback_data: `generate_resize_now|IMAGE_TO_RESIZE|${step.p}`
        };
    });
    
    // --- 6. ГЕНЕРАЦИЯ КНОПОК ПОВОРОТА ---
    const rotateButtons = ROTATE_ANGLES.map(angle => ({
        text: angle.text, 
        callback_data: `generate_rotate_now|IMAGE_TO_ROTATE|${angle.param}` 
    }));
    
    // --- 7. КОМПОНОВКА КЛАВИАТУРЫ ---
    let keyboard = [
        [{ text: "🏠 Открыть главное меню /start", callback_data: "start_command" }],
        [{ text: '💰 Меню управления балансом', callback_data: 'show_balance' }],
        
        [
            { text: activeIcon + ' 🔄 Фото → Ресайз', callback_data: 'dummy_i2r_active' },
            { 
                text: `🎦 Видео → Ресайз`, 
                callback_data: `select_resize_mode|VIDEO_TO_RESIZE` 
            },
        ],
        // РЯД РЕЖИМОВ (Кнопка переключения на Upscale)
        [{ text: '🔍 Фото → Апскейл', callback_data: 'select_upscale_mode|IMAGE_TO_UPSCALE' },
         { text: '📺 Видео → Апскейл', callback_data: 'select_upscale_mode|VIDEO_TO_UPSCALE' }],
        [{
            text: isPhotoSaved ? "💾 Посмотреть загруженное фото" : "📸 Загрузить фотографию", 
            callback_data: isPhotoSaved ? 'cmd:/view_saved_photo' : 'cmd:/upload_photo' 
        }],
        // Кнопки поворота
        ...chunkArray(rotateButtons, 3),
        // Кнопки с плюсами минусами и галочкой
        ...chunkArray(resolutionButtons, 4), 
        // Блок ориентации
        //[{ text: `Ориентация изображения: ${aspectType === 'landscape' ? '16:9' : aspectType === 'square' ? '1:1' : '3:4'}`, callback_data: 'ignore' }],
        [
            { text: (aspectType === 'landscape' ? '↔️ ' : '') + '16:9', callback_data: `ignore_image_aspect|landscape` },
            { text: (aspectType === 'portrait' ? '↔️ ' : '') + '3:4', callback_data: `ignore_image_aspect|portrait` },
            { text: (aspectType === 'square' ? '↔️ ' : '') + '1:1', callback_data: `ignore_image_aspect|square` },
        ],
        // Кнопка Ракеты
        [{ 
            text: isPhotoSaved ? `🚀 Ресайз до ${defaultResLabel} (${defaultResParam})` : `🚫 Загрузите фото`, 
            callback_data: isPhotoSaved ? `generate_resize_now|IMAGE_TO_RESIZE|${defaultResParam}` : 'dummy' 
        }]
    ];
    return { messageText, keyboardObject: { inline_keyboard: keyboard } };
}

/**
 * @description Генерирует меню для изменения разрешения видео (V2R).
 */
async function getResizeVideoMenuKeyboard(chatId, envData, lastError = null, isPhotoSaved, isVideoSaved, storage) {
    // Используем ГЛОБАЛЬНЫЕ КОНСТАНТЫ
    const VIDEO_STEPS = ['240p', '360p', '480p', '580p', '640p', '720p', '1080p', '1440p'];
    const RESIZE_VIDEO_MODE_KEY = RESIZE_VIDEO_MODE || 'VIDEO_TO_RESIZE';
    const ROTATE_VIDEO_MODE_KEY = ROTATE_VIDEO_MODE || 'VIDEO_TO_ROTATE';
    const RESIZE_IMAGE_MODE_KEY = 'IMAGE_TO_RESIZE';

    // 1. Получение текущих данных медиа
    const currentMediaData = await getCurrentMediaData(chatId, envData, storage, true);
    const currentWidth = currentMediaData?.currentWidth || 0;
    const currentHeight = currentMediaData?.currentHeight || 0;
    const aspectRatio = currentMediaData?.aspectRatio || '16:9';

    // Используем ваш статус isVideoSaved
    const canRun = isVideoSaved; 
    let defaultResParam = '1080p';

    // 2. Список стандартных разрешений (высота)
    const targetHeights = [240, 360, 480, 580, 640, 720, 1080, 1440, 2160];

    // 3. АСИНХРОННЫЙ ВЫЗОВ: ПОЛУЧАЕМ СТАТУС БАЛАНСА
    let balanceStatus = '...';
    try {
        balanceStatus = await getCurrentCreditBalance(chatId, storage);
    } catch (e) {
        balanceStatus = 'Ошибка чтения'; 
    }

    // --- 4. ФОРМИРОВАНИЕ ТЕКСТА (Строго по типу ВИДЕО) ---
    const activeIcon = '✅ ';
    const displayName = '🎦 Видео: Ресайз';
    const priceLine = '💸 **Цена:** Бесплатно (через Leshiy Media Converter)';
    
    let currentSizeLine = canRun 
        ? `**Текущий размер:** 📐 ${currentWidth}x${currentHeight} пикселей` 
        : `**Текущий размер:** ❓ Нет данных`;
        
    let mediaStatusLine = canRun 
        ? `✅ **Видео** загружено.` 
        : `⚠️ Для начала работы отправьте мне видеоролик`;
    
    const description = `
📐 **Меню изменения размера видео (Video-to-Resize)**

❔ **Как это работает:**
Вы можете изменить разрешение загруженного вами **видео** до одного из стандартных размеров без потери качества аудио.
`;
    
    const statusLine = `💰 **Баланс:** ${balanceStatus}`;
    let messageText = `${description}\n${mediaStatusLine}\n\n${currentSizeLine}\nТекущий режим: **${displayName}**\n\n${statusLine}\n${priceLine}\n\nВыберите размер для сжатия (уменьшения) или поворот:`;

    // --- 5. ГЕНЕРАЦИЯ КНОПОК РЕСАЙЗА ---
    const resolutionButtons = VIDEO_STEPS.map(p => {
        const targetHeight = parseInt(p);
        let icon = '';
        
        if (isVideoSaved && currentHeight > 0) {
            // Строгое сравнение для галочки
            if (Math.abs(currentHeight - targetHeight) <= 10) icon = '✔️ '; //✔️
            else if (targetHeight > currentHeight) icon = '➕ '; //➕
            else icon = '➖ '; //➖
        }
        
        return { 
            text: `${icon}${p}`, 
            callback_data: `generate_resize_now|VIDEO_TO_RESIZE|${p}` 
        };
    });
    // Логика "Ракеты" для видео
    const nextStep = VIDEO_STEPS.find(p => parseInt(p) > currentHeight) || '480p';

    // --- 6. ГЕНЕРАЦИЯ КНОПОК ПОВОРОТА ---
    const rotateButtons = ROTATE_ANGLES.map(angle => {
        return {
            text: angle.text, 
            callback_data: `generate_rotate_now|${ROTATE_VIDEO_MODE_KEY}|${angle.param}` 
        };
    });
    
    // --- 7. КОМПОНОВКА КЛАВИАТУРЫ ---
    let keyboard = [
        [{ text: "🏠 Открыть главное меню /start", callback_data: "start_command" }],
        [{ text: '💰 Меню управления балансом', callback_data: 'show_balance' }],
        [
            { 
                text: `🔄 Фото → Ресайз`, 
                callback_data: `select_resize_mode|${RESIZE_IMAGE_MODE_KEY}` 
            },
            { text: activeIcon + ' 🎦 Видео → Ресайз', callback_data: 'dummy_v2r_active' },
        ],
        // РЯД РЕЖИМОВ (Кнопка переключения на Upscale)
        [{ text: '🔍 Фото → Апскейл', callback_data: 'select_upscale_mode|IMAGE_TO_UPSCALE' },
         { text: '📺 Видео → Апскейл', callback_data: 'select_upscale_mode|VIDEO_TO_UPSCALE' }],
        [{
            text: isVideoSaved ? "💾 Посмотреть загруженное видео" : "📹 Загрузить видеоролик", 
            callback_data: isVideoSaved ? 'cmd:/view_saved_video' : 'cmd:/upload_video'
        }],
        // Кнопки с углами поворота
        ...chunkArray(rotateButtons, 3),
        // Кнопки с плюсами минусами и галочкой
        ...chunkArray(resolutionButtons, 4), 
        // Заголовок Соотношение
        //[{ text: `Соотношение: ${aspectRatio}`, callback_data: 'ignore' }],
        [
            { text: (aspectRatio === '16:9' ? '↔️ ' : '') + '16:9', callback_data: `dummy_video_ratio|16:9` },
            { text: (aspectRatio === '3:4' ? '↔️ ' : '') + '3:4', callback_data: `dummy_video_ratio|3:4` },
            { text: (aspectRatio === '1:1' ? '↔️ ' : '') + '1:1', callback_data: `dummy_video_ratio|1:1` },
        ],
        [{ 
            text: isVideoSaved ? `🚀 Запустить ресайз до ${nextStep} сейчас` : `🚫 Загрузите видео`, 
            callback_data: isVideoSaved ? `generate_resize_now|VIDEO_TO_RESIZE|${nextStep}` : 'dummy' 
        }]
    ];

    return { messageText, keyboardObject: { inline_keyboard: keyboard } };
}

// ✅ sendUpscaleMenu - Отправляет меню /upscale (I2U) или предупреждение
/**
 * @description Получает текущее состояние медиа/промпта, генерирует меню I2U и отправляет/редактирует сообщение.
 * @param {number} chatId - ID чата.
 * @param {string} token - Токен Telegram Bot API.
 * @param {Object} storage - KV-биндинг (LAST_PHOTO_STORAGE).
 * @param {Object} envData - Объект окружения (включая константы суффиксов).
 * @param {Object} ctx - Контекст обработчика (для waitUntil).
 * @param {number | null} [messageId=null] - ID сообщения для редактирования (если есть).
 */
async function sendUpscaleMenu(chatId, token, storage, envData, ctx, messageId = null) {
    const chatKey = chatId.toString();
    // ✅ ИСПОЛЬЗУЕМ суффиксы из envData
    const LAST_PROMPT_KEY = chatKey + LAST_PROMPT_KEY_SUFFIX;
    // Предполагаем, что апскейл I2U использует тот же ключ, что и фото
    const LAST_IMAGE_DATA_KEY = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX; 

    try {
        // 1. ЧТЕНИЕ ДАННЫХ ИЗ KV
        const userDefinedPrompt = await storage.get(LAST_PROMPT_KEY);
        const rawMediaKVData = await storage.get(LAST_IMAGE_DATA_KEY, { type: 'text' });
        
        // Определяем, есть ли сохраненное медиа
        const isPhotoSaved = !!rawMediaKVData; 

        // 2. АСИНХРОННАЯ ГЕНЕРАЦИЯ МЕНЮ С БАЛАНСОМ
        // ✅ ВАЖНО: Вызываем getUpscaleMenuKeyboard с 4-мя аргументами
        const { messageText, keyboardObject } = await getUpscaleImageMenuKeyboard(
            chatId, 
            storage, // LAST_PHOTO_STORAGE (KV-binding)
            userDefinedPrompt, 
            isPhotoSaved
        );
        
        // 3. Отправляем/редактируем сообщение
        if (messageId) {
            // ✅ Редактируем сообщение: editMessageWithKeyboard
            ctx.waitUntil(editMessageWithKeyboard(
                chatId, 
                messageId, 
                messageText, 
                token, 
                keyboardObject.inline_keyboard // Клавиатура из асинхронного вызова
            ));
        } else {
            // ✅ Отправляем новое сообщение: sendMessageWithKeyboard
            ctx.waitUntil(sendMessageWithKeyboard(
                chatId, 
                messageText, 
                token, 
                keyboardObject.inline_keyboard // Клавиатура из асинхронного вызова
            ));
        }
    } catch (e) {
        // Логирование и отправка пользователю уведомления
        const errorString = `Fatal error in sendUpscaleMenu for chat ${chatId}: ${e.message} Stack: ${e.stack ? e.stack.substring(0, 500) : 'N/A'}`;
        ctx.waitUntil(logDebug("UPSCALE_CRITICAL", errorString, envData));
        await sendMessage(chatId, "❌ Критическая ошибка при загрузке меню апскейла. Мы уже работаем над ее устранением.", token);
    }
}

/**
 * @description Генерирует меню настроек для апскейла фото (I2U).
 */
async function getUpscaleImageMenuKeyboard(chatId, LAST_PHOTO_STORAGE, currentPrompt, isMediaSaved) { 
    
    const KEY_IMAGE_TO_UPSCALE = 'IMAGE_TO_UPSCALE_STABILITY';
    const activeMode = 'IMAGE_TO_UPSCALE';
    const aiModelKey = KEY_IMAGE_TO_UPSCALE;
    // Предполагаем, что AI_MODELS — глобальная константа
    const baseModelConfig = AI_MODELS[aiModelKey]; 
    
    let calculatedPriceCredits = 0; 
    
    // Логика I2U (Фото): Расчет фиксированной цены
    if (typeof baseModelConfig.pricing === 'number') {
        calculatedPriceCredits = baseModelConfig.pricing; 
    } else {
        calculatedPriceCredits = 4;
    }
    
    const modelDetails = `| Сервис: **${baseModelConfig.SERVICE}**`;

    // --- АСИНХРОННЫЙ ВЫЗОВ: ПОЛУЧАЕМ СТАТУС БАЛАНСА ---
    let balanceStatus;
    try {
        // Предполагаем, что getCurrentCreditBalance - глобальная
        balanceStatus = await getCurrentCreditBalance(chatId, LAST_PHOTO_STORAGE);
    } catch (e) {
        balanceStatus = 'Ошибка чтения'; 
    }
    
    // --- ТЕКСТ и КЛАВИАТУРА ---
    const activeIcon = '✅ ';
    const displayName = '🔍 Фото → Апскейл';
    const mediaType = 'Фото';
    const actionText = "Запустить Апскейл (I2U)";
    const currentModelName = baseModelConfig.MODEL;
    const canRun = isMediaSaved; 

    const priceLine = calculatedPriceCredits > 0 
        ? `💸 **Цена:** ${formatPrice(calculatedPriceCredits)}` 
        : '💸 **Цена:** Бесплатно';
        
    const mediaAction = isMediaSaved ? `💾 Посмотреть загруженное фото` : `📸 Загрузить фотографию`;
    const mediaCallback = isMediaSaved ? 'cmd:/view_saved_photo' : 'cmd:/upload_photo';

    let keyboard = [];
    keyboard.push([{ text: "🏠 Главное меню /start", callback_data: "start_command" }]);
    keyboard.push([{ text: '💰 Управление балансом', callback_data: 'show_balance' }]);
    // РЯД РЕЖИМОВ (Кнопка переключения на Resize)
    keyboard.push([
        { text: `🔄 Фото → Ресайз`, callback_data: `select_resize_mode|IMAGE_TO_RESIZE` },
        { text: `🎦 Видео → Ресайз`, callback_data: `select_resize_mode|VIDEO_TO_RESIZE` }
    ]);
    // РЯД РЕЖИМОВ (Кнопка переключения на V2U)
    keyboard.push([
        { 
            text: activeIcon + displayName, 
            callback_data: 'dummy_i2u_active' 
        },
        { 
            text: '📺 Видео → Апскейл', 
            callback_data: 'select_upscale_mode|VIDEO_TO_UPSCALE' // <-- Кнопка переключения
        }
    ]);

    keyboard.push([
        { text: mediaAction, callback_data: mediaCallback }
    ]);
    
    keyboard.push([{ text: "✏️ Меню работы с промптом (/prompt)", callback_data: 'cmd:/prompt' }],);    
    
    // Кнопка Запуска
    keyboard.push([
        { 
            text: canRun ? `🚀 ${actionText} сейчас` : `🚫 Недоступно: Загрузите ${mediaType}`, 
            callback_data: canRun ? `generate_upscale_now|${activeMode}` : 'dummy_cannot_run_upscale' 
        }
    ]);

    const description = `
🆙 **Меню увеличения разрешения фото (Image-to-Upscale)**

❔ Как это работает:
Нейросеть выполняет процесс увеличения разрешения и повышения качества изображения любой фотографии в 4 раза, до разрешения 2K (2560x1920).

Текущий режим: **${displayName}**
`;
    
    const statusLine = `💰 **Баланс:** ${balanceStatus}`;
    let messageText = `${description}\n${isMediaSaved ? `✅ **${mediaType}** загружено.` : `⚠️ **${mediaType}** не загружено.`}\n\n${statusLine}\n${priceLine}\n\nНажмите 🚀 **${actionText} сейчас**!`;

    return { messageText: messageText, keyboardObject: { inline_keyboard: keyboard } };
}

/**
 * @description Генерирует минималистичное меню для апскейла видео (V2U),
 * требующее только Task ID исходного задания.
 * @param {number} chatId - ID чата.
 * @param {object} LAST_PHOTO_STORAGE - KV-хранилище.
 * @param {string} currentPrompt - Текущий промпт.
 * @param {boolean} isMediaSaved - Флаг, сохранено ли видео.
 * @returns {Promise<{messageText: string, keyboardObject: object}>}
 */
async function getUpscaleVideoMenuKeyboard(chatId, LAST_PHOTO_STORAGE, currentPrompt, isMediaSaved) { 
    const KEY_VIDEO_TO_UPSCALE = 'VIDEO_TO_UPSCALE_KIEAI';
    const activeMode = 'VIDEO_TO_UPSCALE';
    // Предполагаем, что AI_MODELS — глобальная константа
    const baseModelConfig = AI_MODELS[KEY_VIDEO_TO_UPSCALE]; 
    
    const chatKey = chatId.toString();
    // ✅ Используем ГЛОБАЛЬНЫЕ суффиксы (Убедитесь, что они определены)
    const LAST_VIDEO_TASK_KEY = chatKey + LAST_ACTIVE_VIDEO_KEY_SUFFIX; 
    
    // --- 1. ЧТЕНИЕ Task ID из KV ---
    const previousTaskId = await LAST_PHOTO_STORAGE.get(LAST_VIDEO_TASK_KEY);
    const isTaskValid = previousTaskId && typeof previousTaskId === 'string'; // Флаг доступности Task ID

    // --- 2. ИСПРАВЛЕННЫЙ РАСЧЕТ ЦЕНЫ ---
    let calculatedPriceCredits = 0;
    
    // 🔑 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Проверяем, является ли pricing числом (статическая цена)
    if (typeof baseModelConfig.pricing === 'number' && baseModelConfig.pricing > 0) {
        // Используем статическую цену напрямую
        calculatedPriceCredits = baseModelConfig.pricing; // --> Получим 10.0
    }
    // --- КОНЕЦ ИСПРАВЛЕННОГО РАСЧЕТА ЦЕНЫ ---
    
    // --- АСИНХРОННЫЙ ВЫЗОВ: ПОЛУЧАЕМ СТАТУС БАЛАНСА ---
    let balanceStatus = '...';
    try {
        // Предполагаем, что getCurrentCreditBalance - глобальная
        balanceStatus = await getCurrentCreditBalance(chatId, LAST_PHOTO_STORAGE);
    } catch (e) {
        balanceStatus = 'Ошибка чтения'; 
    }
    
    // --- ТЕКСТ и КЛАВИАТУРА ---
    const activeIcon = '✅ ';
    const displayName = '📺 Видео → Апскейл';
    const mediaType = 'Видео';
    const actionText = "Запустить Апскейл (V2U)";
    const currentModelName = baseModelConfig.MODEL;
    // Запуск V2U требует сохраненный Task ID.
    const canRun = isTaskValid; 

    const priceLine = calculatedPriceCredits > 0 
        ? `💸 **Цена:** ${formatPrice(calculatedPriceCredits)}` 
        : '💸 **Цена:** Бесплатно';
        
    
    let keyboard = [];
    keyboard.push([{ text: "🏠 Главное меню /start", callback_data: "start_command" }]);
    keyboard.push([{ text: '💰 Управление балансом', callback_data: 'show_balance' }]);
    // РЯД РЕЖИМОВ (Кнопка переключения на Resize)
    keyboard.push([
        { text: `🔄 Фото → Ресайз`, callback_data: `select_resize_mode|IMAGE_TO_RESIZE` },
        { text: `🎦 Видео → Ресайз`, callback_data: `select_resize_mode|VIDEO_TO_RESIZE` }
    ]);
    // 1. РЯД РЕЖИМОВ (Переключение)
    keyboard.push([
        { 
            text: '🔍 Фото → Апскейл', 
            callback_data: 'select_upscale_mode|IMAGE_TO_UPSCALE' 
        },
        { 
            text: activeIcon + displayName, 
            callback_data: 'dummy_v2u_active' 
        }
    ]);
    
    // 2. СТРОКА СТАТУСА Task ID
    const taskStatusText = isTaskValid ? 
        `✅ Task ID Доступен (Нажмите, чтобы проверить)` : 
        `❌ Task ID не найден (Нужно выполнить T2V/I2V)`;
    
    //if (isTaskAvailable) {
    keyboard.push(
        [{
            text: isTaskValid ? "💾 Просмотр активного задания" : "▶️ Получить активное задание ",
            callback_data: isTaskValid ? `checkvideo|${previousTaskId.substring(0, 32)}` : `cmd:/checkvideo`
        }]
    );
    /*/ 3. Кнопки Медиа и Промпт (Оставлены для удобства)
    if (isMediaSaved) {
        keyboard.push([
            { text: `💾 Посмотреть загруженное ${mediaType}`, callback_data: 'cmd:/view_saved_video' }
        ]);
    }*/
    keyboard.push([{ text: "✏️ Меню работы с промптом (/prompt)", callback_data: 'cmd:/prompt' }]);    
    
    // 4. Кнопка Запуска
    keyboard.push([
        { 
            text: canRun ? `🚀 ${actionText} сейчас` : `🚫 Недоступно: Нужен Task ID`, 
            callback_data: canRun ? `generate_upscale_now|${activeMode}` : 'dummy_cannot_run_upscale' 
        }
    ]);

    // --- ТЕКСТ СООБЩЕНИЯ ---

    const taskStatusLine = isTaskValid ? 
        `✅ **Task ID доступен**. Видео готово к апскейлу.` : 
        `❌ **Task ID не найден**. Сначала сгенерируйте видео в режиме T2V или I2V.`;
    
    let messageText = `🆙 **Меню увеличения разрешения видео (Video-to-Upscale)**

❔ **Как это работает:**
Нейросеть увеличивает разрешение уже **сгенерированного вами видео** (по его Task ID) до Full-HD **720p** максимум.

Текущий режим: **${displayName}**

${taskStatusLine}
`;
    const statusLine = `💰 **Баланс:** ${balanceStatus}`;
    const finalMessage = `${messageText}\n${statusLine}\n${priceLine}\n\nНажмите 🚀 **${actionText} сейчас**!`;

    return { messageText: finalMessage, keyboardObject: { inline_keyboard: keyboard } };
}

// --- НОВАЯ ФУНКЦИЯ: ФОРМАТИРОВАНИЕ СТАТУСА БАЛАНСА ---
/**
 * @description Возвращает строку со статусом баланса: активная подписка или остаток кредитов.
 * @param {number} userId - ID пользователя.
 * @param {Object} LAST_PHOTO_STORAGE - KV-биндинг.
 * @returns {Promise<string>} Строка статуса (например, "👑 Безлимит до 11.12.2025" или "5 кредитов").
 */
async function getCurrentCreditBalance(userId, LAST_PHOTO_STORAGE) {
    const chatKey = userId.toString();
    const BALANCE_KEY = chatKey + '_credit_balance';
    const SUBSCRIPTION_END_KEY = chatKey + SUBSCRIPTION_END_KEY_SUFFIX; // Используем глобальный суффикс
    
    // 1. Проверяем активную подписку
    const now = Date.now();
    const subscriptionEndStr = await LAST_PHOTO_STORAGE.get(SUBSCRIPTION_END_KEY);
    const subscriptionEndTime = parseInt(subscriptionEndStr);

    if (subscriptionEndTime && subscriptionEndTime > now) {
        // Подписка активна: форматируем дату окончания
        const endDate = new Date(subscriptionEndTime);
        const formattedDate = endDate.toLocaleDateString('ru-RU', {
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric'
        });
        return `👑 **Безлимит** до ${formattedDate}`;
    }

    // 2. Если подписки нет, проверяем баланс
    let currentBalanceStr = await LAST_PHOTO_STORAGE.get(BALANCE_KEY);
    let currentBalance = parseInt(currentBalanceStr);
    
    // Если баланс не найден, присваиваем FREE_LIMIT (10)
    if (isNaN(currentBalance)) {
        // Предполагаем, что FREE_LIMIT = 10 (как в processPhotoCommand)
        const FREE_LIMIT = 10; 
        currentBalance = FREE_LIMIT;
    }
    // --- ФОРМИРОВАНИЕ ТЕКСТА С ПРАВИЛЬНЫМ ПАДЕЖОМ ---
    const creditWord = pluralize(currentBalanceStr, CREDIT_FORMS);
    return `**${currentBalance}** ${creditWord}`;
}

/**
 * 🎬 getUserVideoParams - Получает пользовательские настройки видео из KV (в формате JSON)
 * и маппит их под требования KIE.AI (duration: 6/10, quality: 720p/1080p, aspect_ratio: 3:2/2:3/1:1).
 * 🛑 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Реализован полный маппинг.
 * @param {object} envData - Объект окружения.
 * @returns {Promise<{duration: string, quality: string, aspectRatioKieAi: string}>} Объект с маппингом.
 */
async function getUserVideoParams(envData) {
    // Дефолтные значения для API KIE.AI (в случае отсутствия пользовательских)
    const defaultApiParams = { 
        duration: '6', 
        quality: '480p', 
        aspectRatioKieAi: '3:2' // 16:9 map
    };
    
    // Дефолтные значения, если ключ в KV отсутствует (для корректного парсинга)
    const defaultKvParams = { seconds: '6', aspectRatio: '16:9', resolution: '480p' };

    if (!envData.chatId || !envData.LAST_PHOTO_STORAGE || !envData.VIDEO_PARAMS_KEY_SUFFIX) {
        return defaultApiParams;
    }

    const storage = envData.LAST_PHOTO_STORAGE;
    const videoParamsKey = envData.chatId.toString() + envData.VIDEO_PARAMS_KEY_SUFFIX;

    try {
        const paramsJsonString = await storage.get(videoParamsKey);

        if (paramsJsonString) {
            // Объединяем дефолты и данные из KV для устойчивости
            const userParams = { ...defaultKvParams, ...JSON.parse(paramsJsonString) };
            
            // 1. Маппинг длительности (seconds -> duration: 5 или 8)
            const userSeconds = parseInt(userParams.seconds);
            // Если выбрано 8 сек. или больше, используем 8. Иначе — 5.
            const duration = (userSeconds >= 8) ? "8" : "6"; 

            // 2. Маппинг разрешения (resolution -> quality: 720p или 1080p)
            const resolutionMap = { 
                '1080p': '1080p', 
                '720p': '720p', 
                '580p': '720p', // Маппим на ближайшее поддерживаемое (720p)
                '480p': '480p'  // Маппим на минимальное поддерживаемое (480p)
            };
            const quality = resolutionMap[userParams.resolution] || defaultApiParams.quality;

            // 3. Маппинг соотношения сторон (aspectRatio -> aspect_ratio: 3:2, 2:3, 1:1)
            let aspectRatioKieAi;
            switch (userParams.aspectRatio) {
                case '16:9': aspectRatioKieAi = '3:2'; break; // Ландшафт
                case '3:4': aspectRatioKieAi = '2:3'; break; // Портрет
                case '1:1': aspectRatioKieAi = '1:1'; break; // Квадрат
                default: aspectRatioKieAi = defaultApiParams.aspectRatioKieAi;
            }
            
            envData.ctx.waitUntil(logDebug('VIDEO_PARAMS_LOAD', `Применены маппированные параметры: D:${duration}, Q:${quality}, AR:${aspectRatioKieAi}`, envData, envData.ctx));
            
            return { duration, quality, aspectRatioKieAi };
        }
    } catch (e) {
        envData.ctx.waitUntil(logDebug('VIDEO_PARAMS_ERROR', `Ошибка загрузки/парсинга видео-параметров: ${e.message}`, envData, envData.ctx));
    }
    
    return defaultApiParams;
}

/**
 * 🔑 getKieAiApiKey - Получает API ключ KIE.AI.
 * 🛑 КРИТИЧЕСКАЯ ЦЕЛЬ: Логировать искомую строку ключа KV.
 * @param {object} modelConfig - Конфигурация модели.
 * @param {object} envData - Объект окружения.
 * @returns {Promise<string|null>} Рабочий API ключ или null.
 */
async function getKieAiApiKey(chatId, envData, modelConfig) {
    // Используем суффикс как есть, без trim.
    //const chatId = envData.chatId;
    const USER_API_KEY_SUFFIX = envData.USER_API_KEY_SUFFIX; 
    const storage = envData.LAST_PHOTO_STORAGE;

    // 🚨 КРИТИЧЕСКИЙ ДЕБАГ: Логируем состояние суффикса
    envData.ctx.waitUntil(logDebug('KIE_SUFFIX_STATE', 
        `Суффикс: '${USER_API_KEY_SUFFIX}', Storage: ${!!storage}, ChatID: ${!!chatId}`, 
        envData, envData.ctx));

    // --- 1. Попытка получить ключ пользователя из KV ---
    if (chatId && storage && USER_API_KEY_SUFFIX) {
        
        // 1. Явно преобразуем chatId в строку.
        const chatIdString = String(chatId);
        
        // 2. Формируем ключ KV, используя точные строки
        const userApiKey = chatIdString + USER_API_KEY_SUFFIX; 
        
        // 🚨 КРИТИЧЕСКИЙ ДЕБАГ: Логируем ТОЧНУЮ строку ключа, которую ищем!
        envData.ctx.waitUntil(logDebug('KIE_KEY_DEBUG', `Поиск ключа KV: '${userApiKey}'`, envData, envData.ctx)); 

        try {
            const rawUserApiKey = await storage.get(userApiKey, { type: 'text' });
            
            // Если значение найдено
            if (rawUserApiKey) {
                // Очистка от пробелов (КРИТИЧНО для валидности API токена!)
                const userApiKey = rawUserApiKey.trim();
                
                if (userApiKey) {
                    envData.ctx.waitUntil(logDebug('API_KEY_SOURCE', `Используется пользовательский ключ из KV для чата ${chatIdString}.`, envData, envData.ctx));
                    return userApiKey;
                }
            }
        } catch (e) {
            envData.ctx.waitUntil(logDebug('API_KEY_SOURCE', `Ошибка чтения KV: ${e.message}`, envData, envData.ctx));
        }
    }

    // --- 2. Если в KV нет, берем общий ключ из Secrets ---
    const secretKeyName = modelConfig.API_KEY; 
    
    // 🚨 ДЕБАГ: Логируем имя ключа Secrets (для решения проблемы с общим ключом)
    if (envData.ctx) {
        envData.ctx.waitUntil(logDebug('KIE_KEY_SECRET_NAME', `Имя общего ключа из конфига: '${secretKeyName}'`, envData, envData.ctx));
    }

    const secretApiKey = envData[secretKeyName]; 

    if (secretApiKey) {
        envData.ctx.waitUntil(logDebug('API_KEY_SOURCE', `Используется общий ключ из Secrets (${secretKeyName}).`, envData, envData.ctx));
        return secretApiKey;
    }
    
    // --- 3. Провал ---
    const errorMsg = 'Критическая ошибка: API ключ KIE.AI не найден ни в KV, ни в Secrets.';
    envData.ctx.waitUntil(logDebug('API_KEY_SOURCE', errorMsg, envData, envData.ctx));
    
    return null;
}

/**
 * ✅ createTaskKieAi - Универсально создает задачу (Task) в KIE.AI.
 * 🛑 КРИТИЧЕСКИ ИСПРАВЛЕНО: Внедрена логика приоритетного получения ключа из KV.
 * @param {object} modelConfig - Конфигурация модели.
 * @param {object} input - Объект input параметров.
 * @param {object} envData - Объект окружения.
 * @param {string|null} [callBackUrl=null] - Опциональный URL для асинхронного уведомления.
 * @returns {Promise<string|null>} Task ID или null.
 */
async function createTaskKieAi(chatId, modelConfig, input, envData, callBackUrl = null) {
    const createTaskUrl = `${modelConfig.BASE_URL}/jobs/createTask`;
    const token = envData.TELEGRAM_BOT_TOKEN;
    
    // 🛑 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Получаем ключ через новую функцию
    const apiKey = await getKieAiApiKey(chatId, envData, modelConfig);
    
    if (!apiKey) {
        // Логика уже есть внутри getKieAiApiKey, но уведомим пользователя:
        if (envData.chatId) {
             await sendMessage(envData.chatId, `❌ Критическая ошибка: API ключ KIE.AI не найден.`, token);
        }
        return null;
    }  
    
    // 🛑 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ #2: Унифицированное формирование Callback URL
    let calculatedCallBackUrl = null;
    if (envData.chatId && envData.WORKER_DOMAIN) {
        calculatedCallBackUrl = `${envData.WORKER_DOMAIN}/api/kieai-callback?chatId=${envData.chatId}`;
    }

    // 1. Формирование тела запроса
    const body = {
        model: modelConfig.MODEL,
        input: input,
    };
    
    // 🛑 УНИФИКАЦИЯ: Добавляем callBackUrl, если он предоставлен
    if (callBackUrl) {
        body.callBackUrl = callBackUrl;
    } else {
        // 🛑 ИСПРАВЛЕНИЕ #3: Добавляем ВЫЧИСЛЕННЫЙ callBackUrl
        body.callBackUrl = calculatedCallBackUrl;
    }

    // --- ДЕБАГ #1: ЛОГИРОВАНИЕ ОТПРАВЛЯЕМОГО JSON ---
    if (envData.DEBUG_ENABLED && envData.DEBUG_CHAT_ID) {
        const debugBodyLog = JSON.stringify(body, null, 2).substring(0, 1000);
        envData.ctx.waitUntil(logDebug(
            'KIEAI_REQUEST_BODY', 
            `[${modelConfig.MODEL}] URL: ${createTaskUrl}. Body:\n\`\`\`json\n${debugBodyLog}\n\`\`\``, 
            envData, 
            envData.ctx
        ));
    }
    let response;
    try {
        response = await fetch(createTaskUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(30000)
        });
    } catch (e) {
        // Ошибка сети/таймаута
        const errorMsg = `Критическая ошибка сети при вызове KIE.AI API: ${e.message}`;
        envData.ctx.waitUntil(logDebug('KIEAI_FETCH_CRIT', errorMsg, envData, envData.ctx));
        if (envData.chatId) {
             await sendMessage(envData.chatId, `❌ Ошибка сети при запросе к KIE.AI: ${e.message.substring(0, 100)}`, token);
        }
        return null;
    }

    // 2. Обработка ответа
    if (!response.ok) {
        const errorText = await response.text();
        let errorBody = {};
        try { errorBody = JSON.parse(errorText); } catch(e) { /* не JSON */ }

        const errorMessage = errorBody.msg || errorBody.errors?.[0]?.message || errorText.substring(0, 500) || `HTTP Error ${response.status}`;
        
        // --- ДЕБАГ #2: ЛОГИРОВАНИЕ HTTP-ОШИБКИ (4xx, 5xx) ---
        envData.ctx.waitUntil(logDebug(
            'KIEAI_HTTP_ERROR', 
            `[${modelConfig.MODEL}] Status: ${response.status}. Msg: ${errorMessage}. Raw: ${errorText.substring(0, 500)}`, 
            envData, 
            envData.ctx
        ));

        // Отправляем ошибку пользователю
        if (envData.chatId) {
             await sendMessage(envData.chatId, `❌ Ошибка KIE.AI (HTTP ${response.status}): ${errorMessage}`, token);
        }
        return null;
    }

    // 3. Успешный ответ (код 200)
    const data = await response.json();

    // --- ДЕБАГ #3: ЛОГИРОВАНИЕ УСПЕШНОГО ОТВЕТА ---
    const debugResponseLog = JSON.stringify(data, null, 2).substring(0, 1000);
    envData.ctx.waitUntil(logDebug(
        'KIEAI_RESPONSE_OK', 
        `[${modelConfig.MODEL}] Task created. Code: ${data.code}. Body:\n\`\`\`json\n${debugResponseLog}\n\`\`\``, 
        envData, 
        envData.ctx
    ));

    if (data.code !== 200 || !data.data || !data.data.taskId) {
        const errorMsg = data.msg || "Failed to create task with unknown error.";
        
        // Отправляем ошибку пользователю
        if (envData.chatId) {
             await sendMessage(envData.chatId, `❌ Ошибка KIE.AI API: ${errorMsg}`, token);
        }
        return null;
    }

    return data.data.taskId;
}

/**
 * ✅ QueryTaskKieAiCheckStatus - Проверяет статус задания в KIE.AI.
 * * @param {string} taskId - ID задания (получен из createTask).
 * @param {object} modelConfig - Конфигурация модели (BASE_URL).
 * @param {string} apiKey - API ключ для авторизации.
 * @param {object} envData - Объект окружения (для логирования и ctx).
 * @returns {Promise<object>} Объект с результатом: 
 * { 
 * status: 'running'|'success'|'fail', 
 * result?: object|string, 
 * videoUrl?: string 
 * }
 */
async function QueryTaskKieAiCheckStatus(taskId, modelConfig, apiKey, envData) {
    // Используем BASE_URL и taskId из параметров
    const recordInfoUrl = `${modelConfig.BASE_URL}/jobs/recordInfo?taskId=${taskId}`;

    // 1. Дебаг: логируем запрос
    envData.ctx.waitUntil(logDebug('KIEAI_STATUS_REQUEST', `Checking Task ID: ${taskId.substring(0, 10)}... URL: ${recordInfoUrl}`, envData));

    let response;
    try {
        response = await fetch(recordInfoUrl, {
            method: 'GET',
            headers: {
                // Используем Bearer токен для авторизации
                'Authorization': `Bearer ${apiKey}`,
            },
        });
    } catch (e) {
        // Ошибка сети/таймаута
        const errorMsg = `Ошибка сети при проверке статуса KIE.AI: ${e.message}`;
        envData.ctx.waitUntil(logDebug('KIEAI_STATUS_NETWORK_CRIT', errorMsg, envData));
        return { status: 'fail', result: errorMsg };
    }

    if (!response.ok) {
        const errorText = await response.text();
        const errorMsg = `HTTP Ошибка ${response.status} при проверке статуса: ${errorText.substring(0, 500)}`;
        envData.ctx.waitUntil(logDebug('KIEAI_STATUS_HTTP_ERROR', errorMsg, envData));
        return { status: 'fail', result: errorMsg };
    }

    // 2. Обработка успешного ответа (код 200)
    const data = await response.json();
    
    // Дебаг: логируем ответ
    //const debugResponseLog = JSON.stringify(data, null, 2).substring(0, 1000);
    //envData.ctx.waitUntil(logDebug('KIEAI_STATUS_RESPONSE_OK', `Status: ${data.data?.state || 'Unknown'}. Body:\n\`\`\`json\n${debugResponseLog}\n\`\`\``, envData));
    envData.ctx.waitUntil(logDebug('KIEAI_STATUS_RESPONSE_OK', `Status: ${data.data?.state || 'Unknown'}. `, envData));


    if (data.code !== 200 || !data.data) {
        const errorMsg = data.msg || "Не удалось получить статус задания или некорректный ответ API.";
        return { status: 'fail', result: errorMsg };
    }

    const taskData = data.data;
    const taskState = taskData.state; // 'waiting', 'success', 'fail'

    switch (taskState) {
        case 'success':
            try {
                // Задание успешно. Извлекаем resultJson (JSON-строка)
                const result = JSON.parse(taskData.resultJson);
                // Ожидаем, что resultUrls содержит ссылку на видео
                const videoUrl = result.resultUrls?.[0]; 

                if (videoUrl) {
                    return { status: 'success', videoUrl: videoUrl, result: result };
                } else {
                    return { status: 'fail', result: "Задание успешно, но URL видео не найден в результате (resultUrls пуст)." };
                }
            } catch (e) {
                return { status: 'fail', result: `Задание успешно, но ошибка парсинга resultJson: ${e.message}` };
            }

        case 'fail':
            const failMsg = taskData.failMsg || "Задание провалено по неизвестной причине.";
            return { status: 'fail', result: failMsg };

        case 'waiting':
        case 'queuing':
        case 'generating': 
        default:
            // Если состояние 'waiting', 'queuing' или 'generating', продолжаем опрос
            return { status: 'running', result: taskState };
    }
}

/**
 * ✅ deliverImageFromKieAi - Загружает изображение с KIE.AI URL и отправляет его в Telegram.
 * 🛑 ИСПОЛЬЗУЕТ: sendPhotoWithCaption (Ваша существующая функция)
 *
 * @param {number} chatId 
 * @param {string} resultJson - JSON-строка с результатом (включая resultUrls).
 * @param {string} modelName - Название модели для подписи.
 * @param {object} envData - Данные окружения.
 */
async function deliverImageFromKieAi(chatId, resultJson, modelName, envData) {
    const token = envData.TELEGRAM_BOT_TOKEN;
    const STORAGE = envData.LAST_PHOTO_STORAGE; 
    
    let result;
    try {
        result = JSON.parse(resultJson);
    } catch (e) {
        envData.ctx.waitUntil(logDebug('KIEAI_DELIVERY_PARSE_ERROR', `Failed to parse resultJson: ${e.message}`, envData));
        return sendMessage(chatId, "❌ Ошибка доставки: Не удалось обработать ответ сервера KIE.AI.", token);
    }
    
    const imageUrl = result.resultUrls?.[0];
    if (!imageUrl) {
        return sendMessage(chatId, "❌ Ошибка доставки: В результате KIE.AI не найдена ссылка на изображение.", token);
    }

    let imageArrayBuffer;
    
    // 1. Загрузка изображения по URL
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }
        imageArrayBuffer = await response.arrayBuffer();
    } catch (e) {
        const errorMsg = `Ошибка загрузки изображения с URL KIE.AI: ${e.message}`;
        envData.ctx.waitUntil(logDebug('KIEAI_DELIVERY_FETCH_ERROR', errorMsg, envData));
        return sendMessage(chatId, `❌ ${errorMsg}`, token);
    }

    // 2. Отправка изображения в Telegram
    //const caption = `✅ **Изображение сгенерировано!**\nМодель: \`${modelName}\``;
    const caption = `✅ **Изображение сгенерировано!**`;
    
    // 🛑 ВЫЗОВ ВАШЕЙ СУЩЕСТВУЮЩЕЙ ФУНКЦИИ ОТПРАВКИ ФОТО
    const sendResult = await sendPhotoWithCaption(
        chatId,
        imageArrayBuffer,
        caption,
        token,
        envData
    );

    // 3. Сохранение File ID для I2I (если успешно)
    if (sendResult.ok) {
        // Получаем File ID для ускоренной отправки в I2I
        const telegramFileId = sendResult.result.photo.pop().file_id; 
        
        const imageData = {
            url: imageUrl,
            file_id: telegramFileId,
        };
        //const RESULT_KEY = `${chatId}${LAST_IMAGE_DATA_KEY_SUFFIX}`;
        // Сохраняем URL/File ID для использования в Image-to-Image (I2I)
        //envData.ctx.waitUntil(STORAGE.put(RESULT_KEY, JSON.stringify(imageData)));
        
    } else {
         envData.ctx.waitUntil(logDebug('KIEAI_DELIVERY_SEND_FAIL', `Ошибка отправки фото: ${sendResult.description}`, envData));
    }
}

// ✅ НОВАЯ ФУНКЦИЯ: updateKieAiUserCredits - запрашивает кол-во кредитов с KIE.AI
// Включено полное логирование запроса и ответа.
async function updateKieAiUserCredits(apiKey, envData, ctx) { 
    const KIEAI_BASE_URL = 'https://api.kie.ai/api/v1';
    const KIEAI_CREDIT_URL = `${KIEAI_BASE_URL}/chat/credit`;
    
    // 🛑 1. ЛОГИРОВАНИЕ ЗАПРОСА
    //ctx.waitUntil(logDebug('KIEAI_CREDIT_REQUEST', `Endpoint: ${KIEAI_CREDIT_URL}. Key: ${apiKey.substring(0, 8)}...`, envData));
    
    try {
        const response = await fetch(KIEAI_CREDIT_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const responseText = await response.text();
        
        // 🛑 2. ЛОГИРОВАНИЕ СЫРОГО ОТВЕТА
        //ctx.waitUntil(logDebug('KIEAI_CREDIT_RESPONSE_RAW', `Status: ${response.status}. Body: ${responseText.substring(0, 500)}`, envData));

        const data = JSON.parse(responseText);

        if (data.code === 200) {
                // КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Если data.data - число, возвращаем его.
                const credits = typeof data.data === 'number' ? data.data : 0;
                
                // 🛑 3. ЛОГИРОВАНИЕ ИЗВЛЕЧЕННОГО ЗНАЧЕНИЯ
                //ctx.waitUntil(logDebug('KIEAI_CREDIT_PARSED', `Баланс извлечен: ${credits}`, envData));
                
             return credits; 
        } else {
            const errorMsg = `Ошибка KIE.ai (Code: ${data.code}): ${data.msg}. Ответ: ${responseText.substring(0, 100)}`;
            console.error(errorMsg);
                ctx.waitUntil(logDebug('KIEAI_CREDIT_ERROR', errorMsg, envData));

            if (data.code === 401) {
                return 'InvalidKey';
            }
            return 0;
        }

    } catch (e) {
        const errorMsg = `Ошибка сети/JSON при запросе кредитов: ${e.message}`;
        console.error(errorMsg);
        ctx.waitUntil(logDebug('KIEAI_CREDIT_EXCEPTION', errorMsg, envData));
        return 0;
    }
}

/**
 * Запрашивает текущий баланс Bothub.
 *
 * @param {object} envData - Объект окружения с ключом BOTHUB_API_KEY.
 * @returns {Promise<number | null>} Текущий баланс Bothub или null в случае неудачи.
 */
async function getBothubBalance(envData) {
    const BOTHUB_AUTHME_URL = 'https://bothub.chat/api/v2/auth/me';
    const BOTHUB_API_KEY = envData.BOTHUB_API_KEY;

    if (!BOTHUB_API_KEY) {
        return null;
    }

    try {
        const response = await fetch(BOTHUB_AUTHME_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${BOTHUB_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Bothub API Error ${response.status}: ${errorText.substring(0, 100)}...`);
            return null;
        }

        const data = await response.json();
        let balance = null;

        // ✅ ИСПРАВЛЕННОЕ ИЗВЛЕЧЕНИЕ: data -> subscription -> available_balance
        if (data && data.subscription && typeof data.subscription.available_balance === 'number') {
            balance = data.subscription.available_balance;
        }

        // Возвращаем баланс или null, если он не найден или не является числом
        return balance; 

    } catch (e) {
        console.error("❌ Критическая ошибка запроса баланса Bothub:", e);
        return null;
    }
}

// КЛАВИАТУРА ДЛЯ БАЛАНСА - ИНЛАЙН-КНОПКИ БАЛАНСА
/**
 * Создает Inline Keyboard для меню баланса.
 * @returns {object} Объект reply_markup для Telegram API.
 */
function getBalanceKeyboard() {
    return {
        inline_keyboard: [
            [{ text: "🏠 Открыть главное меню /start", callback_data: "start_command" }],
            [{ text: '💰 Пополнить баланс', callback_data: 'show_payment_options' }],
            // Моя ссылка на Бусти для сбора донатов
            [{ text: '💵 Донаты на Boosty', url: 'https://boosty.to/leshiyalex/single-payment/donation/754164/target?share=target_link' }],
            // 🔥 Cсылка на официальный @PremiumBot
            //[{ text: '⭐️ Купить звёзды официально', url: 'https://t.me/PremiumBot' }],
            // 🔥 Реферальная ссылка @Starsobot_bot
            [{ text: '⭐️ Купить звёзды дешевле', url: 'https://t.me/starsobot_bot?start=235663624' }],
            // 🔥 Реферальная ссылка @WantToPayBot
            [{ text: '💳 Купить зарубежную карту VISA', url: 'https://t.me/WantToPayBot?start=w17851188--YH77X' }],
            [
                { text: '📜 История операций', callback_data: 'show_history' },
                //{ text: '⚙️ Настройки бота', callback_data: 'show_settings' }
            ]
        ]
    };
}

/**
 * @description Создает Inline Keyboard для опций покупки кредитов.
 * @returns {object} Объект reply_markup для Telegram API.
 */
function getPaymentOptionsKeyboard() {
    const keyboard = [];
    
    // Генерируем кнопки для каждого пакета из константы
    STARS_PACKAGES.forEach(pkg => {
        
        // --- 1. ПРИМЕНЕНИЕ СКЛОНЕНИЯ ---
        // Падеж для Stars (pkg.stars)
        const starWord = pluralize(pkg.stars, STAR_FORMS); 
        // Падеж для Credits (pkg.credits)
        const creditWord = pluralize(pkg.credits, CREDIT_FORMS); 
        
        keyboard.push([{
            // Формат кнопки: Звезды XTR [кол-во] [склоненное слово] ➔ Кредиты [кол-во] [склоненное слово]
            text: `⭐️ ${pkg.stars} ${starWord} ➔ 💰 ${pkg.credits} ${creditWord}`,
            
            // Формат callback: buy_stars:ЦЕНА_В_XTR:КРЕДИТЫ
            callback_data: `buy_stars:${pkg.stars}:${pkg.credits}` 
        }]);
    });
    
    // Кнопка Назад
    keyboard.push([{ text: '↩️ Вернуться в меню Баланса', callback_data: 'show_balance' }]);

    return {
        inline_keyboard: keyboard
    };
}

// ⭐️ Временная клавиатура: Назад
function getTempBackKeyboard() {
    return {
        inline_keyboard: [
            [{ text: '↩️ Вернуться в меню Баланса', callback_data: 'show_balance' }]
        ]
    };
}

/**
 * @description Проверяет, активна ли подписка "Безлимит".
 * @param {number} userId - ID пользователя.
 * @param {Object} LAST_PHOTO_STORAGE - KV-биндинг.
 * @returns {Promise<boolean>} True, если подписка активна (метка времени > NOW).
 */
async function isCreditSubscriptionActive(userId, LAST_PHOTO_STORAGE) {
    // Используем константу, которую вы добавили
    const subEndKey = userId.toString() + '_sub_end_credit';
    
    try {
        const subscriptionEndStr = await LAST_PHOTO_STORAGE.get(subEndKey);
        const subscriptionEndTime = parseInt(subscriptionEndStr);
        const NOW = Date.now();
        
        // Подписка считается активной, если метка времени существует И больше текущего времени
        return (subscriptionEndTime && subscriptionEndTime > NOW);
    } catch (e) {
        // В случае ошибки чтения KV, считаем, что подписки нет
        console.error("KV read error in isCreditSubscriptionActive:", e);
        return false;
    }
}

/**
 * @description Устанавливает или отключает подписку "Безлимит".
 * @param {number} userId - ID пользователя.
 * @param {Object} LAST_PHOTO_STORAGE - KV-биндинг.
 * @param {boolean} enable - True для включения, False для отключения.
 * @param {number} [days=SUBSCRIPTION_DAYS] - Длительность подписки в днях (по умолчанию 30 дней).
 */
async function setCreditSubscription(userId, LAST_PHOTO_STORAGE, enable, days = SUBSCRIPTION_DAYS) { // SUBSCRIPTION_DAYS = 30
    const subEndKey = userId.toString() + '_sub_end_credit';
    
    if (enable) {
        // Включение: Устанавливаем метку времени (NOW + дни * 24ч * 60мин * 60сек * 1000мс)
        const expirationTimeMs = Date.now() + days * 24 * 60 * 60 * 1000;
        await LAST_PHOTO_STORAGE.put(subEndKey, expirationTimeMs.toString());
        return `👑 Безлимит установлен на ${days} дней.`;
    } else {
        // Отключение: Устанавливаем метку времени в прошлое (или удаляем ключ)
        await LAST_PHOTO_STORAGE.delete(subEndKey);
        // Альтернативно: await LAST_PHOTO_STORAGE.put(subEndKey, '0');
        return "❌ Безлимит отключен.";
    }
}

/**
 * @description Устанавливает баланс фото в указанное значение.
 * @param {number} userId - ID пользователя.
 * @param {Object} LAST_PHOTO_STORAGE - KV-биндинг.
 * @param {number} newBalance - Новое количество доступных фото.
 */
async function setPhotoBalance(userId, LAST_PHOTO_STORAGE, newBalance) {
    const balanceKey = userId.toString() + '_credit_balance';
    
    // !!! КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Если newBalance - это NaN, принудительно устанавливаем 0
    const safeBalance = isNaN(newBalance) ? 0 : newBalance;

    const balanceValue = Math.max(0, safeBalance); // Баланс не может быть отрицательным
    
    await LAST_PHOTO_STORAGE.put(balanceKey, balanceValue.toString());
    
    return `💰 Баланс фото установлен в значение: ${balanceValue}.`;
}

/**
 * @description Универсальная функция проверки подписки, баланса и списания
 * Баланс хранится в Кредитах (1 Кредит = 5 руб).
 * @param {string} chatId - ID чата.
 * @param {Object} LAST_PHOTO_STORAGE - KV-биндинг.
 * @param {number} cost - Стоимость операции в "Кредитах" (4 для фото, 20 для видео).
 * @param {string} serviceName - Имя сервиса ('фото', 'видео (T2V)', 'видео (V2V)', и т.д.).
 * @param {Object} envData - Объект окружения.
 * @returns {Promise<{canProceed: boolean, newBalance: number, isSubscriptionActive: boolean, cost: number, balanceMessage: string, currentBalance: number}>}
 */
async function checkAndDeductBalance(chatId, LAST_PHOTO_STORAGE, cost, serviceName, envData) {
    // 🛑 ДОСТУП К КОНТЕКСТУ И ТОКЕНУ ИЗ envData
    const TELEGRAM_BOT_TOKEN = envData.TELEGRAM_BOT_TOKEN; 
    const ctx = envData.ctx;
    const chatKey = chatId;
    
    // Используем НОВЫЕ КЛЮЧИ
    // Баланс теперь в Кредитах. Меняем суффикс, чтобы не было путаницы.
    const BALANCE_KEY = chatKey + '_credit_balance'; // 🛑 _credit_balance
    const SUBSCRIPTION_END_KEY = chatKey + '_sub_end_credit'; // 🛑 ИЗМЕНЕНИЕ: _sub_end_credit -> _sub_end_credit

    // 1. ПРОВЕРКА АКТИВНОЙ ПОДПИСКИ (логика взята из processPhotoCommand)
    const now = Date.now();
    let isSubscriptionActive = false;
    const subscriptionEndStr = await LAST_PHOTO_STORAGE.get(SUBSCRIPTION_END_KEY);
    const subscriptionEndTime = parseInt(subscriptionEndStr);

    if (subscriptionEndTime && subscriptionEndTime > now) {
        isSubscriptionActive = true;
    }

    let currentBalance = 0;
    let newBalance = 0;
    
    if (!isSubscriptionActive) {
        // Получаем текущий баланс
        let currentBalanceStr = await LAST_PHOTO_STORAGE.get(BALANCE_KEY);
        currentBalance = parseInt(currentBalanceStr);
        // 🛑 ИЗМЕНЕНИЕ: Используем FREE_LIMIT для начального баланса
        if (isNaN(currentBalance)) currentBalance = FREE_LIMIT;

        // 2. ПРОВЕРКА ЛИМИТА
        if (currentBalance < cost) {
            // --- ПРИМЕНЕНИЕ СКЛОНЕНИЯ ---
            const creditWordCurrent = pluralize(currentBalance, CREDIT_FORMS);
            const creditWordCost = pluralize(cost, CREDIT_FORMS);
            // 🛑 ИЗМЕНЕНИЕ: Используем константы для расчета и вывода цены
            const priceRub = cost * CREDIT_COST_RUB;
            
            const message = `
            ✋ **Лимит исчерпан!**
            ⚠️ Ваш текущий счет: **${currentBalance} ${creditWordCurrent}** (1 Кредит = ${CREDIT_COST_RUB} руб.).
            🎬 Цена за 1 ${serviceName}: **${priceRub} руб.** (или **${cost} ${creditWordCost}**).
            Для пополнения баланса: ➡️ [ПОПОЛНИТЬ БАЛАНС](${PAYMENT_LINK}) ⬅️
            `;
            await sendMessageMarkdown(chatId, message, TELEGRAM_BOT_TOKEN);
            
            return { 
                canProceed: false,
                currentBalance: currentBalance, 
                newBalance: currentBalance,     
                isSubscriptionActive: isSubscriptionActive,
                cost: cost,
                balanceMessage: `Лимит исчерпан: ${currentBalance}/${cost} ${creditWordCost}` // 🛑 ИЗМЕНЕНИЕ: кредитов
            };
        }
        
        // 3. СПИСАНИЕ БАЛАНСА
        newBalance = currentBalance - cost;
        await LAST_PHOTO_STORAGE.put(BALANCE_KEY, newBalance.toString(), { expirationTtl: 3600 * 24 * 365 });
        
        ctx.waitUntil(logDebug('BALANCE', `Deducted ${cost} units for ${serviceName} from user ${chatId}. New balance: ${newBalance}`, envData));
    }

    // 4. ФОРМИРОВАНИЕ СООБЩЕНИЯ
    let balanceMessage;
    if (isSubscriptionActive) {
        balanceMessage = `👑 **Безлимитный доступ:** Команда выполняется бесплатно.\n💰 **Баланс**: **Без изменений**!`;
    } else {
        // --- ПРИМЕНЕНИЕ СКЛОНЕНИЯ ---
        const creditWordCost = pluralize(cost, CREDIT_FORMS);
        const creditWordNew = pluralize(newBalance, CREDIT_FORMS);
        // 🛑 ИЗМЕНЕНИЕ: Условие использует COST_PHOTO_CREDIT (4)
        const usageText = cost === COST_PHOTO_CREDIT 
            ? `Списано ${COST_PHOTO_CREDIT} ${pluralize(COST_PHOTO_CREDIT, CREDIT_FORMS)} за фото.` 
            : `Списано **${cost}** ${creditWordCost} за ${serviceName}.`; 
        balanceMessage = `✅ **Изменение кредитного баланса:\n** ${usageText}\n💰 **Ваш баланс**: **${newBalance}** ${creditWordNew}.`; // 🛑 ИЗМЕНЕНИЕ
    }
    
    return { 
        canProceed: true, 
        currentBalance: currentBalance, // Нужен для отмены в catch
        newBalance: newBalance, 
        isSubscriptionActive: isSubscriptionActive,
        cost: cost,
        balanceMessage: balanceMessage
    };
}

// ✅ sendSavedPhoto - Финальная логика для обработчика view_saved_photo
async function sendSavedPhoto(chatId, token, storage, envData, ctx) { 
    const chatKey = chatId.toString();
    const LAST_IMAGE_DATA_KEY = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX;

    let base64Image = null;
    let imageData = null;
    
    // --- 1. КРИТИЧЕСКОЕ ЧТЕНИЕ KV В ИЗОЛИРОВАННОМ БЛОКЕ ---
    try {
        const rawImageKVData = await storage.get(LAST_IMAGE_DATA_KEY, { type: 'text' }); 

        if (!rawImageKVData) {
            ctx.waitUntil(sendMessage(chatId, "⚠️ **Ошибка:** Сохраненное фото не найдено в хранилище.", token));
            return;
        }

        // Парсинг JSON
        imageData = JSON.parse(rawImageKVData);
        base64Image = imageData.base64;
        
        if (!base64Image) {
            throw new Error("Base64 данные отсутствуют или повреждены.");
        }
        
        // ОЧИСТКА Base64-строки
        base64Image = base64Image.replace(/[\r\n\s]/g, '');
        if (base64Image.includes(',')) {
            base64Image = base64Image.split(',')[1];
        }

    } catch (e) {
        // ... (логика обработки сбоев KV/JSON) ...
        const errorText = `Критический сбой чтения KV: ${e.message.substring(0, 150)}.`;
        console.error(errorText, e);
        ctx.waitUntil(sendMessage(chatId, `⚠️ **Критическая ошибка KV:** ${errorText}.`, token));
        return; 
    }
    
    // --- 2. ОТПРАВКА ФОТО С КНОПКАМИ ---
    const width = imageData.width && imageData.width > 0 ? imageData.width : 'Несжатое';
    const height = imageData.height && imageData.height > 0 ? imageData.height : 'Несжатое';
    // Используем HTML для форматирования, согласно вашей sendPhotoFromBase64
    const caption = `🖼️ Ваше сохранённое фото\n📐 Размеры: ${width}x${height}`; 
    
    try {
        // Конвертируем base64 обратно в ArrayBuffer для sendPhotoWithCaption
        const photoArrayBuffer = base64ToUint8Array(base64Image).buffer; 

        // 🛑 Вызываем функцию, которая отправляет фото И добавляет кнопки
        await sendPhotoWithCaption(
            chatId, 
            photoArrayBuffer, 
            caption, 
            token, 
            envData // Передаем envData для доступа к KV, ctx и константам
        );
        // Проверка здоровья конвертера
        const isHealthy = await checkConverterHealth(envData);
        if (!isHealthy) {return new Response('OK', { status: 200 }); }
        
    } catch (e) {
        // Ловим ошибку сети или сбоя внутри sendPhotoWithCaption
        console.error(`Критический сбой отправки фото: ${e.message}`, e);
        ctx.waitUntil(sendMessage(chatId, `❌ **Ошибка отправки:** Произошел сбой. ${e.message.substring(0, 150)}`, token));
    }
}

// ✅ sendSavedVideo - Финальная логика для обработчика view_saved_video
/**
 * Отправляет сохраненный видеоролик пользователю и генерирует клавиатуру поворота.
 * @param {number} chatId ID чата.
 * @param {string} token Токен Telegram.
 * @param {object} storage Хранилище KV.
 * @param {object} envData Объект окружения.
 * @param {object} callbackQueryId Объект callbackQueryId.
 */
async function sendSavedVideo(chatId, token, storage, envData, callbackQueryId) {
    const chatKey = chatId.toString();
    const videoKey = chatKey + LAST_VIDEO_DATA_KEY_SUFFIX;
    const rawVideoData = await storage.get(videoKey, { type: 'text' });
    
    // 🛑 Немедленный ответ на колбэк, чтобы убрать "часики" с кнопки
    await answerCallbackQuery(callbackQueryId, "Отправка видеоролика...", token);

    if (!rawVideoData) {
        await sendMessage(chatId, "❌ Видео не найдено в хранилище.", token);
        return;
    }
    
    try {
        const videoData = JSON.parse(rawVideoData);
        const file_id = videoData.file_id;
        const file_size = videoData.file_size;

        if (!file_id) {
            await sendMessage(chatId, "⚠️ В данных видео не найден file_id.", token);
            return;
        }

        // --- ЛОГИКА СОЗДАНИЯ КЛАВИАТУРЫ И СЕССИИ ПОВОРОТА (копируем из старого блока) ---
        
        // Расчет размера для отображения
        const MB_THRESHOLD = 1048576;
        let sizeDisplay;
        if (file_size >= MB_THRESHOLD) {
            const sizeMB = file_size / MB_THRESHOLD;
            sizeDisplay = `${sizeMB.toFixed(2)} МБ`;
        } else {
            const sizeKB = file_size / 1024;
            sizeDisplay = `${Math.round(sizeKB)} КБ`;
        }

        // 1. Создание временной сессии поворота (как в фото)
        const shortCallbackKey = Date.now().toString(36); 
        const ROTATION_STATE_KEY = `callback_${chatId}_${shortCallbackKey}`;
        
        const initialState = {
            fileId: file_id,
            type: 'video', // 🛑 Тип медиа
            rotation: 0,
            duration: videoData.duration || null,
            width: videoData.width || null,
            height: videoData.height || null,
            loadingMessageId: null,
            file_size: file_size
        };
        
        const width = (videoData.width && Number.isInteger(videoData.width) && videoData.width > 0) ? videoData.width : null;
        const height = (videoData.height && Number.isInteger(videoData.height) && videoData.height > 0) ? videoData.height : null;

        // Сохраняем состояние поворота в KV с TTL 1 час
        await storage.put(ROTATION_STATE_KEY, JSON.stringify(initialState), { expirationTtl: 3600 });

        // 2. Генерируем клавиатуру, используя вашу функцию
        const inlineKeyboard = getVideoRotationKeyboard(shortCallbackKey);
        
        // 3. Формируем сообщение
        const messageText = `🎬 **Ваш сохранённый видеоролик**\n📐 Размеры: ${width}х${height}\n👉 Вес: ${sizeDisplay}`;
        
        // 4. Отправляем видео
        await sendVideoByUrl( 
            chatId, 
            file_id, 
            token,
            messageText,
            inlineKeyboard // 🛑 Передаем инлайн-клавиатуру
        );

        
        // Проверка здоровья конвертера
        const isHealthy = await checkConverterHealth(envData);
        if (!isHealthy) {return new Response('OK', { status: 200 }); }
    } catch (e) {
        console.error("Ошибка отправки сохраненного видео:", e.message);
        await sendMessage(chatId, `⚠️ Критическая ошибка при отправке видеофайла.`, token);
    }
}

/**
 * ✅ processKieAiCallbackData - Основная логика обработки данных колбэка Kie.ai.
 * Принимает уже распарсенный JSON-объект.
 * * @param {object} rootData - Распарсенный JSON-объект ответа KIE.AI (должен содержать .data).
 * @param {number} numericChatId - ID чата.
 * @param {string} token - Токен Telegram.
 * @param {object} envData - Данные окружения (KV, ctx и т.д.).
 */
async function processKieAiCallbackData(rootData, numericChatId, token, envData) {
    const ctx = envData.ctx;
    
    // 🛑 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Получаем вложенный объект 'data', как диктует документация Kie.ai
    const callbackData = rootData.data; 
    
    if (!callbackData) {
        throw new Error("Callback data is missing 'data' field.");
    }

    const taskId = callbackData.taskId;
    const state = callbackData.state;
    const resultJson = callbackData.resultJson;
    const taskModel = callbackData.model; 
    
    // --- 2. ОБРАБОТКА СТАТУСА ---
    if (state === 'success' && resultJson) {
        // Внутренний блок для ловли ошибок ПАРСИНГА resultJson
        try {
            const result = JSON.parse(resultJson); // KIE.AI присылает JSON в виде строки
            const mediaUrls = result.resultUrls || []; // <-- Используем массив
            
            if (mediaUrls.length > 0) {
                // 🛑 ОПРЕДЕЛЯЕМ ТИП КОНТЕНТА И МОДЕЛЬ
                const firstUrl = mediaUrls[0];
                const isVideo = firstUrl.endsWith('.mp4') || firstUrl.endsWith('.webm');
                const isElevenLabsAudio = taskModel.startsWith('elevenlabs/');

                if (isElevenLabsAudio) { 
                    // --- ЛОГИКА ДЛЯ АУДИО (TTS И ISOLATION) ---
                    const mediaUrl = firstUrl;
                    let caption = `🎤 **Ваша озвучка готова!**`;
                    
                    if (taskModel === 'elevenlabs/audio-isolation') {
                        caption = `🎧 **Изоляция голоса / Конвертация завершена!**`;
                    }
                    await sendAudioByUrl(
                        numericChatId,
                        mediaUrl,
                        token,
                        caption
                    );
                } else if (isVideo) {
                    // --- ЛОГИКА ДЛЯ ВИДЕО (1 результат) ---
                    const mediaUrl = firstUrl;
                    await sendVideoByUrl(
                        numericChatId, 
                        mediaUrl, 
                        token, 
                        `✅ Ваше видео готово!`
                    );
                } else if (taskModel === 'grok-imagine/text-to-image') {
                    // --- ЛОГИКА ДЛЯ T2I (6 результатов) ---
                    const mediaGroup = [];
                    for (let i = 0; i < mediaUrls.length; i++) {
                        const mediaObject = {
                            type: 'photo',
                            media: mediaUrls[i],
                            caption: (i === 0) ? `✅ ${mediaUrls.length} изображений сгенерировано!` : undefined 
                        };
                        mediaGroup.push(mediaObject);
                    }
                    
                    if (mediaGroup.length > 0) {
                        await sendMediaGroupToTelegram(
                            numericChatId,
                            mediaGroup,
                            token
                        );
                    }
                } else {
                    // --- ЛОГИКА ДЛЯ ДРУГИХ ИЗОБРАЖЕНИЙ (I2U - 1 результат) ---
                    const mediaUrl = firstUrl;
                    await sendPhotoByUrl(
                        numericChatId, 
                        mediaUrl, 
                        token, 
                        `✅ Ваше изображение готово!`,
                        envData
                    );
                }
            } else {
                await sendMessage(numericChatId, `❌ Callback: Успех, но URL медиа для Task \`${taskId}\` не найден.`, token);
            }
        } catch (e) {
            // ЛОВИТ ОШИБКИ JSON.parse()
            const parseErrorMsg = `❌ Callback: Ошибка парсинга результата. Task \`${taskId}\`. Ошибка: ${e.message.substring(0, 100)}`;
            ctx.waitUntil(logDebug("ERROR", parseErrorMsg, envData, ctx));
            await sendMessage(numericChatId, parseErrorMsg, token);
        }
    } else if (state === 'fail') {
        // Обработка ошибки, присланной KIE.AI
        const failMsg = callbackData.failMsg || "Неизвестная ошибка";
        const failLog = `KIEAI_TASK_FAILED: Task ${taskId}. Reason: ${failMsg}`;
        ctx.waitUntil(logDebug("FAIL", failLog, envData, ctx));
        await sendMessage(numericChatId, `❌ **Задание провалено!** Task \`${taskId}\`. Причина: ${failMsg}`, token);
    }
}

// ✅ processDebugCommand - ОТЛАДКА - DEBUG (Только для администратора: Выводит лог)
// Теперь принимает ID сообщения для редактирования статуса
async function processDebugCommand(chatId, env, workingMessageId) {
    const { TELEGRAM_BOT_TOKEN, ADMIN_CHAT_ID, BOT_LOGS_STORAGE } = env;

    // --- Вспомогательная функция для отправки/редактирования ---
    // Используем 'Markdown' по умолчанию, как определено в Вашей вспомогательной функции
    const sendOrEdit = async (text, messageId, parse_mode = 'Markdown') => {
        if (messageId) {
            // При использовании editMessage в Вашем коде, parse_mode по умолчанию 'Markdown'
            await editMessage(chatId, messageId, text, TELEGRAM_BOT_TOKEN);
        } else {
            // При использовании sendMessage в Вашем коде, parse_mode по умолчанию 'Markdown'
            // (если Вы используете обёртку, которая его передает)
            // Здесь явно укажем Markdown, чтобы быть уверенными.
            await sendMessage(chatId, text, TELEGRAM_BOT_TOKEN);
        }
    };

    // 1. ПРОВЕРКА АДМИНИСТРАТОРА
    if (chatId.toString() !== ADMIN_CHAT_ID) {
        // sendMessage не требует parse_mode, если используется Ваша версия
        await sendMessage(chatId, "❌ Вы не администратор этого бота.", TELEGRAM_BOT_TOKEN);
        return;
    }

    // 2. ПРОВЕРКА KV
    if (!BOT_LOGS_STORAGE) {
        await sendOrEdit("❌ KV-хранилище для логов не настроено.", workingMessageId);
        return;
    }

    // 3. Редактируем сообщение о начале работы
    await sendOrEdit("⏳ Читаю данные из хранилища...", workingMessageId);

    try {
        /**
        let logs = await BOT_LOGS_STORAGE.get('master_log_list', { type: 'json' });
        logs = Array.isArray(logs) ? logs : [];

        const logText = logs.join('\n');

        // КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Замена <pre> на тройные обратные кавычки для Markdown
        let message = `
**Последние ${logs.length} записей лога:**
\`\`\`
${logText}
\`\`\`
        `;

        // --- ЛОГИКА ОБРЕЗКИ ЛОГОВ (4096 символов) ---
        const MAX_TELEGRAM_LENGTH = 4096;

        if (message.length > MAX_TELEGRAM_LENGTH) {
            // Обрезаем, убедившись, что в конце есть закрывающие тройные кавычки
            // Выделяем запас для тройных кавычек и текста обрезки
            let safeLength = MAX_TELEGRAM_LENGTH - 40;
            message = message.substring(0, safeLength) + "\n... (слишком длинно, обрезано)\n\`\`\`";
        }

        // --- ОТПРАВКА ЛОГОВ ---
        // Отправляем логи как новое сообщение, явно указывая Markdown
        await sendMessage(chatId, message, TELEGRAM_BOT_TOKEN, { parse_mode: 'Markdown' });

        // --- ФИНАЛЬНОЕ РЕДАКТИРОВАНИЕ ---
        if (workingMessageId) {
            // Используем sendOrEdit, который по умолчанию использует Markdown
            await sendOrEdit("✅ Логи доставлены!", workingMessageId);
        }
         */

    } catch (e) {
        // ✅ ОШИБКА: Редактируем сообщение с ошибкой (используем Markdown)
        const errorMessage = `❌ Ошибка при чтении логов: ${e.message}`;
        await sendOrEdit(errorMessage, workingMessageId);
    }
}

// --- Вспомогательные функции для Логирования ---

// const MASTER_LOG_KEY = 'master_log_list'; // Ваш единый ключ для массива логов
// const MAX_LOG_ENTRIES = 50; // Максимальное количество записей в массиве

/**
 * Сохраняет сообщение лога в единый ключ master_log_list в KV-хранилище.
async function logToKV(type, message, envData) {
    if (!envData.BOT_LOGS_STORAGE) {
        console.error("BOT_LOGS_STORAGE is not defined for logging.");
        return;
    }

    // Запрос на чтение и запись лога должен быть обернут в ctx.waitUntil
    // чтобы не блокировать основной поток Worker, но гарантировать завершение записи.
    // Если Вы вызываете эту функцию в уже существующем ctx.waitUntil, дополнительное
    // ожидание не требуется.

    try {
        // 1. Читаем текущий список логов
        let logs = await envData.BOT_LOGS_STORAGE.get(MASTER_LOG_KEY, { type: 'json' });
        logs = Array.isArray(logs) ? logs : [];

        // 2. Создаем новую запись
        const timestamp = new Date().toISOString();
        const fullMessage = `${timestamp} [${type.toUpperCase()}] ${message}`;

        // 3. Добавляем новую запись в начало (чтобы видеть свежие логи первыми)
        logs.unshift(fullMessage);

        // 4. Обрезаем список до максимального размера
        if (logs.length > MAX_LOG_ENTRIES) {
            logs = logs.slice(0, MAX_LOG_ENTRIES);
        }

        // 5. Записываем обновленный список обратно в KV (TTL 7 дней)
        await envData.BOT_LOGS_STORAGE.put(MASTER_LOG_KEY, JSON.stringify(logs), { expirationTtl: 604800 });

    } catch (e) {
        // Логируем ошибку записи логов только в консоль, чтобы избежать рекурсии
        console.error("Fatal error while trying to write log to KV:", e.message);
    }
}
*/
// ✅ processStopCommand - КОМАНДА СТОП (Очистка KV) - ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ
async function processStopCommand(chatId, LAST_PHOTO_STORAGE, TELEGRAM_BOT_TOKEN, envData) {
    const chatKey = chatId.toString();

    // --- Ключи, которые НЕЛЬЗЯ УДАЛЯТЬ ---
    const BALANCE_KEY = chatKey + '_credit_balance';
    const HISTORY_KEY = chatKey + '_history';
    
    // ИСПРАВЛЕНИЕ: Унифицируем ключ для удаления, используя суффикс из envData.
    const PROMPT_KEY_SUFFIX = envData.LAST_PROMPT_KEY_SUFFIX || '_last_prompt';
    const LAST_PROMPT_KEY_UNIFIED = chatKey + PROMPT_KEY_SUFFIX;

    // --- Список ключей для очистки ---
    const keysToDelete = [
        LAST_PROMPT_KEY_UNIFIED, // <-- УНИФИЦИРОВАННЫЙ
        // Фото
        chatKey + '_last_image_data',
        chatKey + '_last_image_meta',
        chatKey + '_base64_image', 
        chatKey + '_photo_url', 
        // Видео
        chatKey + '_last_video_data', 
        chatKey + '_last_video_meta', 
        chatKey + '_video_params',
        // Аудио
        chatKey + '_audio_url',        
        chatKey + '_audio_meta',   
        chatKey + '_last_audio_data', 
        chatKey + '_audio_file_id',
        chatKey + '_say_text',
        chatKey + '_say_voice',
        // Промпты
        chatKey + '_prompt', 
        chatKey + '_last_prompt',
        chatKey + '_last_prompt_lang',
        chatKey + '_last_prompt_message_id',
        // Стэйты и экшены
        chatKey + '_user_state',        
        chatKey + '_last_action',      
    ];

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Удаляем ключ, если суффикс был undefined (ключ '235663624undefined').
    if (!envData.LAST_PROMPT_KEY_SUFFIX) {
        keysToDelete.push(chatKey + 'undefined');
    }

    try {
        // 1. Удаляем все сессионные данные
        for (const key of keysToDelete) {
            await LAST_PHOTO_STORAGE.delete(key);
        }

        // 2. Очистка VEO (если используется)
        if (LAST_PHOTO_STORAGE) {
             await LAST_PHOTO_STORAGE.delete(chatKey);
        }

        // 3. Формирование сообщения и клавиатуры
        const message = "🧹 **Очистка данных завершена!**\nВсе сохраненные данные удалены. Готов к новым задачам!\n👇 Выберите действие ниже.";

        // getPromptKeyboard(null) генерирует клавиатуру "Создать новый промпт"
        const keyboard = getPromptKeyboard(null);

        // 4. Отправка подтверждения с клавиатурой
        await sendMessageMarkdown(chatId, message, TELEGRAM_BOT_TOKEN, null, keyboard);

    } catch (e) {
        await sendMessage(chatId, `❌ Ошибка при очистке хранилища: ${e.message}`, TELEGRAM_BOT_TOKEN);
    }
}

/**
 * ✅ processAudioMessageAsync - Обрабатывает входящее аудио сообщение.
 * @param {number} chatId - ID чата.
 * @param {string} fileId - Telegram File ID аудио.
 * @param {object} envData - Данные окружения (STORAGE, token, ctx, ADMIN_CHAT_ID).
 * @param {object} mediaObject - Объект 'audio' или 'voice' из Telegram, содержащий mime_type.
 */
async function processAudioMessageAsync(chatId, fileId, envData, mediaObject) {
    // --- 0. ЛОКАЛЬНЫЕ КОНСТАНТЫ ---
    const AUDIO_URL_KEY_SUFFIX = '_audio_url'; 
    const AUDIO_METADATA_KEY_SUFFIX = '_audio_meta'; 
    // Ключ для file_id, который смотрит view_saved_audio
    const AUDIO_FILE_ID_KEY_SUFFIX = '_audio_file_id'; 
    const AUDIO_DURATION_KEY_SUFFIX = '_audio_duration';

    const token = envData.TELEGRAM_BOT_TOKEN;
    const STORAGE = envData.LAST_PHOTO_STORAGE;
    const chatKey = chatId.toString();
    // 🔥 ИЗВЛЕКАЕМ ДЛИТЕЛЬНОСТЬ ИЗ МЕДИА-ОБЪЕКТА
    const duration = mediaObject.duration || 1;
    // ----------------------------
    
    try {
        // 1. Получаем прямой URL от Telegram
        const fileUrl = await getFileLink(fileId, token); 

        if (!fileUrl) {
            envData.ctx.waitUntil(logDebug('AUDIO_PROCESS_FAIL', 'Не удалось получить прямую ссылку.', envData));
            throw new Error("Не удалось получить прямую ссылку на аудиофайл от Telegram.");
        }
        
        // --- 2. Сохранение URL и Метаданных ---
        
        // 2.1. Сохраняем URL СТРОКУ в KV (для A2V)
        await STORAGE.put(chatKey + AUDIO_URL_KEY_SUFFIX, fileUrl, { expirationTtl: 3600 });

        // 🔥 2.2. СОХРАНЯЕМ ДЛИТЕЛЬНОСТЬ (КРИТИЧНО ДЛЯ РАСЧЕТА ЦЕНЫ)
        await STORAGE.put(chatKey + AUDIO_DURATION_KEY_SUFFIX, duration.toString(), { expirationTtl: 3600 });

        // ✅ КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: СОХРАНЯЕМ file_id ДЛЯ ПРОСМОТРА
        // Теперь view_saved_audio будет находить файл!
        await STORAGE.put(chatKey + AUDIO_FILE_ID_KEY_SUFFIX, fileId, { expirationTtl: 3600 }); 

        // Сохраняем последний медиа-тип
        await STORAGE.put(chatKey + LAST_MEDIA_TYPE_KEY_SUFFIX, 'audio', { expirationTtl: 3600 });
        // 2.2. Сохраняем метаданные
        const mimeType = mediaObject.mime_type || 'unknown/format';
        const isSupported = mimeType.includes('mp3') || mimeType.includes('mpeg') || mimeType.includes('ogg');
        
        const metadata = {
            url: fileUrl,
            file_id: fileId, // Сохраняем file_id в метаданных тоже, для консистентности
            mime: mimeType,
            size: mediaObject.file_size,
            is_supported: isSupported
        };
        await STORAGE.put(chatKey + AUDIO_METADATA_KEY_SUFFIX, JSON.stringify(metadata), { expirationTtl: 3600 });

        // --- 3. Отправка меню ---
        const inlineKeyboard = {
            inline_keyboard: [
             [{text: "🔊 Транскрибировать аудио в текст", callback_data: 'cmd:/audio_transcribe'}],
             [{text: "💽 Очистить аудиодорожку от шумов", callback_data: 'cmd:/isolate_audio'}],
             [
               {text: "🗣 Создать Аватар (A2V)", callback_data: 'set_video_mode|A2V'},
               {text: "🎙️ Озвучить Текст (T2A)", callback_data: 'cmd:/say_empty'}
             ],
             [{ text: "🎤 Промпт для аудио", callback_data: 'set_default_prompt|audio'},
             { text: "❔ помощь по выбору", callback_data: 'dummy_no_buttons' }],
             //[{text: "🗑️ Удалить сохраненное аудио", callback_data: 'cmd:/clear_audio'}]
            ]
        };
        
        let confirmationMessage = "🎤 Аудиофайл принят. Что Вы хотите с ним сделать?.";
        if (!isSupported) {
             confirmationMessage = `⚠️ Аудиофайл принят, но формат (**${mimeType}**) может **НЕ** поддерживаться Kie.ai. Попробуйте отправить MP3.`;
        }
        
        await sendMessageMarkdown(
                chatId, 
                confirmationMessage, 
                token, 
                null, 
                inlineKeyboard
            );

    } catch (e) {
        envData.ctx.waitUntil(logDebug('AUDIO_PROCESS_FAIL', `Ошибка обработки аудио: ${e.message}`, envData));
        await sendMessage(chatId, `❌ Произошла ошибка при сохранении аудио: ${e.message.substring(0, 100)}`, token);
    }
}

// ✅ processTextMessage (Текстовый чат с историей + Логика редактирования/создания промпта)
async function processTextMessage(chatId, messageText, envData) {
    const { TELEGRAM_BOT_TOKEN, CHAT_HISTORY_STORAGE, LAST_PHOTO_STORAGE } = envData; 
    const chatKey = chatId.toString();
    
    // --- Константы ---
    const USER_STATE_KEY = chatKey + envData.USER_STATE_KEY_SUFFIX;
    const STATE_AWAITING_PROMPT_EDIT = 'awaiting_prompt_edit';
    const STATE_AWAITING_NEW_PROMPT = 'awaiting_new_prompt';
    const LAST_PROMPT_KEY = chatKey + envData.LAST_PROMPT_KEY_SUFFIX; 
    // Объявляем переменную "text" здесь!
    const text = messageText.trim();
    
    // 1. ПЕРЕХВАТ: Режим редактирования ИЛИ создания промпта
    const userState = await LAST_PHOTO_STORAGE.get(USER_STATE_KEY);
    
    if (userState === STATE_AWAITING_PROMPT_EDIT || userState === STATE_AWAITING_NEW_PROMPT) {
    
        await LAST_PHOTO_STORAGE.delete(USER_STATE_KEY);
    
        const newPrompt = messageText.trim();
        await LAST_PHOTO_STORAGE.put(LAST_PROMPT_KEY, newPrompt, { expirationTtl: 3600 });
    
        const actionText = (userState === STATE_AWAITING_PROMPT_EDIT) ? "отредактирован" : "сохранен";
        const message = `✅ **Промпт ${actionText}**. Что вы хотите с ним сделать?`;
            
        // Предполагается, что getPromptSavedKeyboard() определена где-то в коде
        const savedKeyboard = getPromptSavedKeyboard();
    
        await sendMessageMarkdown(chatId, message, TELEGRAM_BOT_TOKEN, null, savedKeyboard);
    
        return true;
    }
    
    // 2. ПЕРЕХВАТ: Сброс истории чата по команде /reset ---
    if (text.toLowerCase() === '/reset') {
        await CHAT_HISTORY_STORAGE.delete(chatKey);
        await sendMessageMarkdown(chatId, "✅ **История чата сброшена.** Можете начать новую беседу.", TELEGRAM_BOT_TOKEN);
        return true;
    }
    // 3. ДОПОЛНИТЕЛЬНЫЙ ПЕРЕХВАТ: Ответы, не требующие LLM
    const userMsgLower = text.toLowerCase();
    let directAnswer = null;

    // 1. ПЕРЕХВАТ ТАРИФОВ/ОПЛАТЫ
    if (userMsgLower.includes('платить') || userMsgLower.includes('пополнить') || userMsgLower.includes('оплата') || userMsgLower.includes('тарифы') || userMsgLower.includes('платно') || userMsgLower.includes('безлимит')) {
        directAnswer = TARIFF_MESSAGE_TEXT; // Предполагается, что эта константа доступна
    }
    // 2. ПЕРЕХВАТ ЛИЧНОСТИ
    else if (userMsgLower.includes('кто ты') || userMsgLower.includes('что за бот')) {
        directAnswer = `🤖 Я — многофункциональный AI-ассистент "Gemini AI".
Мой автор Огорельцев Александр Валерьевич @Leshiyalex.
У меня впечатляющий список функционала с очень широкими возможностями, опишу основные вкратце:
Я создан для ❔ помощи в чате как 💬 текстом так и 🎙️ голосом (/say), могу транскрибировать как 🔊 аудио, так и 🎧 видео, для генерации ✏️ промптов (/prompt) для 📷 фото (/photo) и 🎬 видео (/video), для 📖 платного (/text) и 🎨 бесплатного (/create) создания картинок по 🌄 фото и без, и 
✨ платного (/photo) улучшения фотографий, 🎬 оживления (/video) фотографий, 🎥 редактирования видео (/video), создание 🗣 аватаров (/avatar) и т.д..
хотите подробнее - спросите меня про тарифы или что умею?`;
    }
    // 3. ПЕРЕХВАТ ФУНКЦИЙ/ЧТО УМЕЕШЬ
    else if (userMsgLower.includes('что умеешь') || userMsgLower.includes('функции')) {
        directAnswer = `🤖 Я умею или мои функции:
💰 Есть как платные так и бесплатные функции (команда /balance) для управления балансом и финансами.
📸 Понимаю входящие фото, распознаю и составляю по ним описание (промпт).
🎨 Бесплатная генерация контента (команда /create): Создаю изображения по текстовому описанию и по фото.
📖 Платная генерация контента (команда /text): Создаю изображения по текстовому описанию очень качественно.
✨ Обработка изображений (команда /photo): Улучшаю Ваши пошарпанные фотографии до качественной студийной фотосъёмки.
🎬 Работа с видео (команда /video) от генерации ролика по тексту, создание 🗣 аватара по голосу, до замены персонажа в видео.
🔍 Увеличение разрешения фото и видео (команда /upscale).
🎙️ Распознавание речи (/say): Превращаю голосовые сообщения в текст и обратно в голос.
🎧 Распознавание аудио и видеофайлов - я его транскрибирую в текст.
💬 Чат: Веду диалог и отвечаю на вопросы.
        `.trim();
    }

    // ЕСЛИ НАЙДЕН ПРЯМОЙ ОТВЕТ:
    if (directAnswer) {
        await sendMessageMarkdown(chatId, directAnswer, TELEGRAM_BOT_TOKEN);
        // Обновляем историю с прямым ответом (если нужно)
        // НЕ ОТПРАВЛЯЕМ workingMessageResponse, НЕ ВЫЗЫВАЕМ AI.run
        return true; 
    }
    // 3. ОБЫЧНЫЙ ЧАТ
    let history;
    try {
        const historyData = await CHAT_HISTORY_STORAGE.get(chatKey, { type: 'json' });
        history = Array.isArray(historyData) ? historyData : [];
    } catch (e) {
        console.error("Error retrieving chat history:", e);
        history = [];
    }
    
    // 1. Отправка сообщения-заглушки
    const workingMessageResponse = await sendMessageMarkdown(chatId, "⏳ *Думаю...*", TELEGRAM_BOT_TOKEN);
    if (!workingMessageResponse.ok || !workingMessageResponse.result) return false;
    
    const workingMessageId = workingMessageResponse.result.message_id;

    // --- НОВОЕ: ПРОСТАЯ И НАДЕЖНАЯ ОБРЕЗКА ИСТОРИИ (БЕЗ СУММАРИЗАЦИИ) ---
    // Наша цель: гарантировать, что в модель Workers AI попадет безопасное количество сообщений.
    const HARD_CUT_MESSAGES = 6; // Оставляем 6 последних сообщений (3 пары user/model)

    if (history.length > HARD_CUT_MESSAGES) {
         history = history.slice(history.length - HARD_CUT_MESSAGES);
         
         // Опционально: Можно уведомить пользователя, что контекст потерян, 
         // вставив сообщение в начало истории (Gemma 2B это увидит)
         const cutWarning = `[СИСТЕМА: Контекст разговора автоматически обрезан до ${HARD_CUT_MESSAGES} последних сообщений для экономии токенов.]\n`;
         // Проверяем, что history[0] существует, и добавляем предупреждение
         if (history.length > 0) {
             history[0].text = cutWarning + history[0].text;
         }
    }
    // --------------------------------------------------------------------
    
    try {
        // УНИВЕРСАЛЬНЫЙ ВЫЗОВ зависит от настроенной в KV модели
        // 1. Определение сервиса и ключа KV - Обязательно
        const serviceType = 'TEXT_TO_TEXT'; 
        const serviceMenuConfig = AI_MODEL_MENU_CONFIG[serviceType];
        const kvKey = serviceMenuConfig.kvKey;
        // 2. ДИНАМИЧЕСКОЕ ЧТЕНИЕ АКТУАЛЬНОЙ КОНФИГУРАЦИИ
        const defaultModelKey = Object.keys(serviceMenuConfig.models)[0]; 
        // Читаем актуальное значение прямо из KV. 
        const freshConfigKey = await envData.LAST_PHOTO_STORAGE.get(kvKey);
        // Используем свежий ключ ИЛИ ключ по умолчанию
        const activeConfigKey = freshConfigKey || defaultModelKey;
        // 3. Получение полного объекта конфигурации из AI_MODELS
        const activeModelConfig = AI_MODELS[activeConfigKey];

        // 4. *** ДЕБАГ: СООБЩЕНИЕ О ВЫБОРЕ МОДЕЛИ ***
        // Получаем красивое имя модели для дебага
        const friendlyModelName = serviceMenuConfig.models[activeConfigKey] || activeConfigKey; 
        // УСЛОВИЕ: Текущий пользователь должен быть админом И дебаг должен быть включен
        if (envData.DEBUG_ENABLED && envData.DEBUG_CHAT_ID) {
            const debugMessage = `🧠 AI-Модель для ${serviceType}: ${friendlyModelName}`;
            await sendMessage(
                chatId, // 1. chatId
                debugMessage, // 2. text
                envData.TELEGRAM_BOT_TOKEN // 3. token
            );
        } // Если chatId не совпадает с ADMIN_CHAT_ID, сообщение пропускается.

        // 5. *** ДИНАМИЧЕСКИЙ ВЫЗОВ ***
        const modelResponse = await activeModelConfig.FUNCTION(
            activeModelConfig, // Передаем объект, содержащий MODEL, BASE_URL, API_KEY, etc.
            history, 
            messageText, 
            envData
        );

        /*/ --- ВРЕМЕННЫЙ ДЕБАГ: ПОКАЗАТЬ ПОЛНЫЙ ОТВЕТ МОДЕЛИ АДМИНУ ---
        if (envData.DEBUG_ENABLED && envData.DEBUG_CHAT_ID) {
            // Отправляем сырой ответ, чтобы увидеть его структуру
            await sendMessageMarkdown(
                envData.DEBUG_CHAT_ID, 
                `📜 **[RAW RESPONSE]**\n\n\`\`\`json\n${modelResponse.substring(0, 4000)}\n\`\`\``, 
                envData.TELEGRAM_BOT_TOKEN
            );
        }*/
        // -----------------------------------------------------------

        // --- НОВОЕ: 6. ОБРАБОТКА МЫСЛЕЙ (THINKING CONTEXT) И ФИЛЬТРАЦИЯ ---
        const { thought, finalResponse } = extractAndCleanModelResponse(modelResponse);

        // 7. ОТПРАВКА ДЕБАГ-СООБЩЕНИЯ (ТОЛЬКО АДМИНУ)
        if (envData.DEBUG_ENABLED && envData.DEBUG_CHAT_ID && thought) {
            // Используем DEBUG_CHAT_ID для отправки рассуждений
            await sendMessage(
                envData.DEBUG_CHAT_ID, 
                `🧠 **[РАССУЖДЕНИЕ: ${friendlyModelName}]**\n\n${thought}`, 
                envData.TELEGRAM_BOT_TOKEN
            );
        }
        // 1. Отправляем ответ модели
        try { // Попробуем отправить с форматированием очищенный ответ (finalResponse)
            await sendMessage(chatId, finalResponse, envData.TELEGRAM_BOT_TOKEN, null, null);
            // Предполагаем, что sendMessageMarkdown не требует replyId и keyboard
            //await sendMessageMarkdown(chatId, modelResponse, TELEGRAM_BOT_TOKEN, null, null);
            //await sendMessageMarkdownV2(chatId, modelResponse, TELEGRAM_BOT_TOKEN, null, null);
        } catch (error) {
            // Если форматирование сломалось (Ошибка 400), отправляем как Plain Text
            await sendMessage(chatId, finalResponse, envData.TELEGRAM_BOT_TOKEN, null, null);
        }

        // 2. Редактируем заглушку на "Готово!"
        await editMessage(chatId, workingMessageId, "✅ Готово!", TELEGRAM_BOT_TOKEN);
    
        // 3. Обновляем историю и сохраняем
        const MAX_HISTORY_LENGTH = 50;
    
        history.push({ role: 'user', text: messageText });
        history.push({ role: 'model', text: modelResponse });
    
        if (history.length > MAX_HISTORY_LENGTH) {
            history = history.slice(history.length - MAX_HISTORY_LENGTH); 
        }
    
        // Запускаем сохранение истории в фоне
        envData.ctx.waitUntil(CHAT_HISTORY_STORAGE.put(chatKey, JSON.stringify(history), { expirationTtl: 3600 * 24 }));
    
    } catch (e) {
        console.error("Critical error in chat processing:", e.message);
    
        // --- ЛОГИКА ОБРАБОТКИ ОШИБКИ ПОСЛЕ СБОЯ ОСНОВНОЙ МОДЕЛИ ---
        let userErrorMessage;
        const errorMessageLower = e.message.toLowerCase();
    
        if (errorMessageLower.includes('503') || errorMessageLower.includes('overloaded')) {
            // Ошибка перегрузки модели (Service Unavailable)
            userErrorMessage = "⚠️ **Модель перегружена.** Сервер временно недоступен из-за высокой нагрузки. Пожалуйста, попробуйте отправить ваше сообщение снова через 10-15 секунд. Спасибо за терпение!";
        } else {
            // Все остальные ошибки
            userErrorMessage = `❌ **Ошибка чата.** Не удалось получить ответ.\n\n_Технические детали: ${e.message.substring(0, 150)}..._`;
        }
        
        // Редактируем заглушку, используя дружелюбное сообщение
        await editMessage(chatId, workingMessageId, userErrorMessage, TELEGRAM_BOT_TOKEN);
    }
    
    return false; 
}

// ✅ processPromptCommand (Обрабатывает /prompt)
async function processPromptCommand(chatId, TELEGRAM_BOT_TOKEN, LAST_PHOTO_STORAGE, envData, messageId) {
    const chatKey = chatId.toString();

    // 1. ПОСТРОЕНИЕ КЛЮЧЕЙ
    const PROMPT_KEY_SUFFIX = envData.LAST_PROMPT_KEY_SUFFIX || '_last_prompt';
    const LAST_PROMPT_KEY = chatKey + PROMPT_KEY_SUFFIX;

    // НОВЫЙ КЛЮЧ ДЛЯ ЯЗЫКА
    const LAST_PROMPT_LANG_KEY_SUFFIX = envData.LAST_PROMPT_LANG_KEY_SUFFIX || '_last_prompt_lang';
    const LAST_PROMPT_LANG_KEY = chatKey + LAST_PROMPT_LANG_KEY_SUFFIX;

    // 2. ЧТЕНИЕ ДАННЫХ
    const currentPrompt = await LAST_PHOTO_STORAGE.get(LAST_PROMPT_KEY);
    const charCount = currentPrompt ? currentPrompt.length : 0;
    let currentLang = await LAST_PHOTO_STORAGE.get(LAST_PROMPT_LANG_KEY);

    // 3. ОПРЕДЕЛЕНИЕ ЯЗЫКА И ФЛАГА
    if (!currentLang) {
        currentLang = currentPrompt ? 'ru' : 'нет'; // Если промпт есть, ставим RU по умолчанию
    }
    const flag = (currentLang === 'ru') ? '🇷🇺' : (currentLang === 'en' ? '🇬🇧' : '');
    const langDisplay = (currentLang === 'нет') ? 'не задан' : `${flag} ${currentLang.toUpperCase()}`;

    let messageText;
    const keyboardObject = getPromptKeyboard(currentPrompt);

    if (currentPrompt) {
        // 4. ИСПОЛЬЗОВАНИЕ ЯЗЫКА И ФЛАГА В СООБЩЕНИИ
        messageText = `
    ✨ **Ваш текущий промпт:**

Язык: ${langDisplay}
    
\`${currentPrompt}\`

**Кол-во символов:** ${charCount}

Что вы хотите сделать с этим промптом?
        `;
    } else {
        messageText = `
⚠️ **Промпт для работы не найден.**

✏️ **Промпт** — это текстовая инструкция для нейросети, на основе которой она создает изображение.

Пожалуйста нажмите 🆕 **Создать новый промпт** и введите текст для сохранения. После этого появится обновленное меню действий.
`;
    }

    // 5. РЕДАКТИРУЕМ СООБЩЕНИЕ
    // Используем editMessageWithKeyboard, чтобы заменить текущее меню
    // (ВАЖНО: Предполагается, что у вас есть функция editMessageWithKeyboard)
    if (messageId) {
        // Редактируем сообщение, если messageId доступен (т.е. вызвано через колбэк)
        await editMessageWithKeyboard(
            chatId, 
            messageId, 
            messageText, 
            TELEGRAM_BOT_TOKEN, 
            keyboardObject.inline_keyboard // Предполагаем, что editMessageWithKeyboard принимает только массив inline_keyboard
        );
    } else {
        // Резервный вариант: если вызвано напрямую через /prompt (без messageId), отправляем новое сообщение
        await sendMessageMarkdown(chatId, messageText, TELEGRAM_BOT_TOKEN, null, keyboardObject);
    }
} // конец processPromptCommand


// *** 3.4. Обработка команды /create (Генерация изображения) - ВОССТАНОВЛЕНИЕ РАБОЧЕЙ ЛОГИКИ + УСТРАНЕНИЕ ПРЕДУПРЕЖДЕНИЯ ***
// Аргументы: chatId, inputPrompt, token, storage, envData, initialMessageId = null
async function processCreateCommand(chatId, inputPrompt, token, storage, envData, initialMessageId = null) {
    let loadingMessageId = initialMessageId; // ✅ ИСПОЛЬЗУЕМ ПЕРЕДАННЫЙ ID
    const chatKey = chatId.toString();
    const LAST_PROMPT_KEY = chatKey + envData.LAST_PROMPT_KEY_SUFFIX;
    let russianPrompt = '';
    let englishPrompt = '';
    
    try {
        // УНИВЕРСАЛЬНЫЙ ВЫЗОВ зависит от настроенной в KV модели
        // 1. Определение сервиса и ключа KV - Обязательно
        const serviceType = 'TEXT_TO_IMAGE'; 
        const serviceMenuConfig = AI_MODEL_MENU_CONFIG[serviceType];
        const kvKey = serviceMenuConfig.kvKey;
        // 2. ДИНАМИЧЕСКОЕ ЧТЕНИЕ АКТУАЛЬНОЙ КОНФИГУРАЦИИ
        const defaultModelKey = Object.keys(serviceMenuConfig.models)[0]; 
        // Читаем актуальное значение прямо из KV. 
        const freshConfigKey = await envData.LAST_PHOTO_STORAGE.get(kvKey);
        // Используем свежий ключ ИЛИ ключ по умолчанию
        const activeConfigKey = freshConfigKey || defaultModelKey;
        // 3. Получение полного объекта конфигурации из AI_MODELS
        const activeModelConfig = AI_MODELS[activeConfigKey];

        // 4. *** ДЕБАГ: СООБЩЕНИЕ О ВЫБОРЕ МОДЕЛИ ***
        // Получаем красивое имя модели для дебага
        const friendlyModelName = serviceMenuConfig.models[activeConfigKey] || activeConfigKey; 
        // УСЛОВИЕ: Текущий пользователь должен быть админом И дебаг должен быть включен
        if (envData.DEBUG_ENABLED && envData.DEBUG_CHAT_ID) {
            const debugMessage = `🧠 AI-Модель для ${serviceType}: ${friendlyModelName}`;
            envData.ctx.waitUntil(sendMessage(
                chatId, // Отправляем в текущий чат
                debugMessage, 
                envData.TELEGRAM_BOT_TOKEN
            ));
        } // Если chatId не совпадает с ADMIN_CHAT_ID, сообщение пропускается.

        // 1. Определение промпта (без изменений)
        if (inputPrompt && inputPrompt.trim().length > 0) {
            russianPrompt = inputPrompt.trim();
        } else {
            const storedPrompt = await storage.get(LAST_PROMPT_KEY);
            if (storedPrompt) {
                russianPrompt = storedPrompt;
            } else {
                await sendMessage(chatId, "⚠️ **Не могу сгенерировать изображение.**\n\nНе найден промпт. Используйте `/create [текст промпта]` или сначала отправьте фото для его анализа (/photo).", token);
                return;
            }
        }

        if (russianPrompt.trim().length === 0) {
            await sendMessage(chatId, "⚠️ **Промпт пустой.** Пожалуйста, предоставьте текст для генерации.", token);
            return;
        }

        // 1.5. СОХРАНЕНИЕ: Сохраняем последний использованный промпт в KV
        await storage.put(LAST_PROMPT_KEY, russianPrompt);

        // 2. Отправляем сообщение "Перевожу..." ИЛИ РЕДАКТИРУЕМ
        const translationText = `🌐 **Перевожу промпт и запускаю генерацию через ${activeModelConfig.SERVICE}...**`;

        if (!loadingMessageId) {
            // Если ID не передан (например, команда /create), отправляем новое сообщение
            const loadingMessage = await sendMessage(chatId, translationText, token);
            if (!loadingMessage.ok || !loadingMessage.result) return;
            loadingMessageId = loadingMessage.result.message_id;
        } else {
            // ✅ Если ID передан (из колбэка), редактируем его
            await editMessage(chatId, loadingMessageId, translationText, token);
        }

        // ✅ ОТПРАВКА ПРОМЕЖУТОЧНОГО СООБЩЕНИЯ
        const processingMessage = await sendMessageMarkdown(
            chatId, 
            `⏳ **Выполняется генерация изображения**...\nПроцесс может занять до 45 секунд. Пожалуйста, подождите.`,
            token
        );

        // 3. ПЕРЕВОД: Получаем английскую версию промпта для генератора
        const englishPrompt = await callWorkersAITranslate(russianPrompt, envData, 'ru', 'en');

        // --- 4. УНИВЕРСАЛЬНЫЙ ВЫЗОВ T2I ---
        const service = activeModelConfig.SERVICE;
        const result = await activeModelConfig.FUNCTION(
            activeModelConfig, // config
            englishPrompt,
            envData,
            chatId
        );

        // 🛑 НОВЫЙ БЛОК: АДАПТЕР/ДЕТЕКТОР АСИНХРОННОСТИ
        if (service === 'KIEAI') {
            // 4.1. Обработка асинхронного вызова (KIE.AI)
            if (typeof result === 'string' && result.length > 10) { 
                // Если успешно вернулся Task ID, это означает, что задание запущено.
                return true; // Возвращаем успех в родительскую функцию (если нужно завершить цикл обработки)
            } else {
                // Если вернулось null, значит, произошла ошибка, о которой уже сообщили пользователю.
                throw new Error("T2I Task failed to launch.");
            }

        } else {
            // 4.2. Обработка синхронных сервисов (Workers AI, Gemini, Bothub, Kandinsky, и т.д.)
            const imageArrayBuffer = result;
            
            // Проверка на корректность буфера
            if (!(imageArrayBuffer instanceof ArrayBuffer)) {
                await sendMessage(chatId, `❌ **Ошибка:** ${service} не вернул ArrayBuffer.`, token);
                throw new Error(`${service} did not return ArrayBuffer.`);
            }

            // 5. Отправка изображения в Telegram
            const finalCaption = `✅ Изображение сгенерировано!`;
            const success = await sendPhotoWithCaption(
                chatId,
                imageArrayBuffer,
                finalCaption,
                token,
                envData
            );
            
            if (!success.ok) {
                throw new Error(success.description || "Неизвестная ошибка отправки фото.");
            }
            return true; // Успех, фото отправлено.
        }

    } catch (error) {
        // !!! КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Используем ошибку с деталями API
        const errorText = error.message || "Неизвестная ошибка генерации изображения.";

        // 1. Форматируем сообщение для пользователя. 
        let finalErrorText = errorText;
        if (finalErrorText.length > 500) {
            finalErrorText = finalErrorText.substring(0, 497) + '... (см. логи)';
        }
        
        // 2. Выводим сообщение об ошибке
        if (loadingMessageId) {
            await editMessage(chatId, loadingMessageId, `❌ **Ошибка!** Не удалось сгенерировать изображение:\n${finalErrorText}`, token);
        } else {
            // Если по какой-то причине ID не получен, отправляем новое сообщение
            await sendMessage(chatId, `❌ **Ошибка!** Не удалось запустить генерацию: ${finalErrorText}`, token);
        }
        
        // 3. Выводим полный текст ошибки в логи (без задержки)
        envData.ctx.waitUntil(logDebug("CRITICAL", `Полная ошибка T2I: ${errorText}`, envData));
    }
}

/**
 * ✅ processFreeCreativeCommand (Обработчик БЕСПЛАТНОЙ генерации T2I и I2I)
 * @description Выполняет генерацию T2I или I2I, используя только Workers AI, 
 * без проверки и списания баланса.
 * @param {string} chatId - ID чата.
 * @param {string} mode - Режим генерации ('T2I' или 'I2I').
 * @param {Object} storage - KV-биндинг (envData.LAST_PHOTO_STORAGE).
 * @param {Object} envData - Объект окружения (включая TELEGRAM_BOT_TOKEN, AI_MODELS, ctx).
 */
async function processFreeCreativeCommand(chatId, mode, storage, envData) {
    
    const token = envData.TELEGRAM_BOT_TOKEN; 
    const chatKey = chatId.toString();
    const PROMPT_KEY = chatKey + LAST_PROMPT_KEY_SUFFIX;
    const IMAGE_DATA_KEY = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX; 
    const GENERATION_LOCK_KEY = chatKey + '_generation_in_progress';

    // --- 1. ПРОВЕРКА ЛОКА ---
    if (await storage.get(GENERATION_LOCK_KEY)) {
        await sendMessage(chatId, "⏳ **Уже выполняется генерация.** Пожалуйста, подождите.", token);
        return;
    }
    await storage.put(GENERATION_LOCK_KEY, 'true', { expirationTtl: 60 });

    let workingMessageId = null;
    let imageArrayBuffer = null;
    let finalCaption = '';
    
    // Переменные для I2I
    let imageBase64String = null;
    let finalWidth = 1024;
    let finalHeight = 1024;

    try {
        // --- 2. ОПРЕДЕЛЕНИЕ МОДЕЛИ И ДАННЫХ ---
        let userDefinedPrompt = await storage.get(PROMPT_KEY);
        let rawImageKVData = null; // Для I2I
        
        let activeConfigKey;
        let actionText;

        if (mode === 'T2I') {
            activeConfigKey = 'TEXT_TO_IMAGE_WORKERS_AI';
            actionText = 'T2I генерацию';
        } else if (mode === 'I2I') {
            activeConfigKey = 'IMAGE_TO_IMAGE_WORKERS_AI';
            // 🚨 ЧИТАЕМ JSON-СТРОКУ ИЗ KV
            rawImageKVData = await storage.get(IMAGE_DATA_KEY, { type: 'text' });
            actionText = 'I2I улучшение';
        } else {
            throw new Error('Неизвестный режим генерации.');
        }

        const activeModelConfig = envData.AI_MODELS[activeConfigKey];

        // --- 3. ПРОВЕРКИ И ВАЛИДАЦИЯ ---
        if (!activeModelConfig || !activeModelConfig.FUNCTION) {
            throw new Error(`Конфигурация Workers AI для ${mode} не найдена.`);
        }
        if (!userDefinedPrompt || userDefinedPrompt.trim().length < 5) {
            throw new Error(`Сначала задайте промпт (/prompt).`);
        }
        
        // --- 4. ПАРСИНГ ДАННЫХ ДЛЯ I2I (копируем логику из processPhotoCommand) ---
        if (mode === 'I2I') {
             if (!rawImageKVData) {
                throw new Error(`Для режима I2I необходимо загрузить фото.`);
            }
            
            try {
                // ПАРСИМ JSON, как в processPhotoCommand
                const imageData = JSON.parse(rawImageKVData);
                
                if (imageData && imageData.base64) {
                    imageBase64String = String(imageData.base64); // Чистая строка Base64
                    
                    // Извлекаем и округляем размеры, как в processPhotoCommand
                    const storedWidth = parseInt(imageData.width);
                    const storedHeight = parseInt(imageData.height);
                    const roundedWidth = Math.round(storedWidth / 8) * 8;
                    const roundedHeight = Math.round(storedHeight / 8) * 8;
                    finalWidth = roundedWidth > 0 ? roundedWidth : 960;
                    finalHeight = roundedHeight > 0 ? roundedHeight : 1280;
                    
                } else {
                    // Если JSON невалиден, но есть Base64
                    imageBase64String = String(rawImageKVData); 
                }
            } catch (e) {
                // Если парсинг не удался (например, сохранена чистая Base64)
                imageBase64String = String(rawImageKVData);
                // Размеры остаются по умолчанию
            }
            
            // ФИНАЛЬНАЯ ОЧИСТКА Base64 (как в processPhotoCommand)
            if (imageBase64String) {
                imageBase64String = imageBase64String.replace(/[\r\n\s]/g, '');
                if (imageBase64String.includes(',')) {
                    imageBase64String = imageBase64String.split(',')[1];
                }
            }
            
            if (!imageBase64String || imageBase64String.length < 100) {
                 throw new Error(`Невалидные данные фото после парсинга.`);
            }
        }
        
        // --- 5. СООБЩЕНИЯ О СТАТУСЕ И ПЕРЕВОД ---
        const workingMessageResponse = await sendMessageMarkdown(chatId, `⏳ **Запускаю бесплатную ${actionText}...**`, token);
        workingMessageId = workingMessageResponse.ok ? workingMessageResponse.result.message_id : null;

        if (workingMessageId) await editMessage(chatId, workingMessageId, "⏳ **Перевожу промпт для AI...", token);
        let finalPrompt = userDefinedPrompt.trim();
        try {
            const translatedText = await callWorkersAITranslate(finalPrompt, envData, 'ru', 'en'); 
            if (translatedText) finalPrompt = translatedText.trim();
        } catch (e) {
            await logDebug("Translation_ERR", `Не удалось перевести промпт: ${e.message}`, envData);
        }

        // --- 6. ЗАПУСК ГЕНЕРАЦИИ ---
        if (workingMessageId) await editMessage(chatId, workingMessageId, `⏳ **Отправляю на ${actionText}...** (Бесплатно)`, token);

        const callFunction = activeModelConfig.FUNCTION;
        let generatedResult;

        // --- 5. СООБЩЕНИЯ О СТАТУСЕ ---
        const keyboard = {
            inline_keyboard: [[
                { text: "🔄 Получить результат генерации", callback_data: 'cmd:/vision_generate_free_t2i' }
            ]]
        };

        await editMessageWithKeyboard(chatId, workingMessageId,
            `⏳ **Генерация запущена!**\n\n**Нажмите кнопку ниже**, чтобы "получить" сгенериррованную картинку.`, 
            token, 
            keyboard
        );
        
        if (mode === 'T2I') {
            // 🚨 ИСПРАВЛЕНИЕ: ВЫЗОВ СТРОГО С 3 АРГУМЕНТАМИ, КАК ОЖИДАЕТ callWorkersAITextToImage
            generatedResult = await callFunction(
                activeModelConfig, // 1: uniConfig
                finalPrompt, // 2: uniPrompt
                envData // 3: uniEnvData 
            );
            finalCaption = `🖼️ Ваша сгенерированная картинка готова.\n🧠 AI-Модель: stable-diffusion-xl-base-1.0`;

        } else if (mode === 'I2I') {
            // I2I: Вызов с 7 аргументами (как вы показали в processPhotoCommand)
            generatedResult = await callFunction(
                activeModelConfig, 
                finalPrompt,
                imageBase64String, // 3. Base64 строка
                envData, // 4. envData (На этой позиции в I2I)
                finalHeight,
                finalWidth, 
                chatId
            );
            finalCaption = `🌄 Ваше бесплатное улучшение фотографии.\n🧠 AI-Модель: stable-diffusion-v1-5-img2img`;
        }

        imageArrayBuffer = generatedResult; // Получаем ArrayBuffer
        if (!(imageArrayBuffer instanceof ArrayBuffer)) {
             throw new Error("Генератор не вернул корректный ArrayBuffer.");
        }

        // --- 7. ОТПРАВКА ---
        if (workingMessageId) await editMessage(chatId, workingMessageId, "✅ **Изображение сгенерировано.** (Бесплатно)", token);
        
        await sendPhotoWithCaption(parseInt(chatId), imageArrayBuffer, finalCaption, token, envData);
        
        if (workingMessageId) await editMessage(chatId, workingMessageId, `✅ **Готово!**`, token);

    } catch (e) {
        const errorText = e.message || "Неизвестная ошибка генерации.";
        if (workingMessageId) {
             await editMessage(chatId, workingMessageId, `❌ **Ошибка!** Не удалось сгенерировать изображение:\n${errorText}`, token);
        } else {
             await sendMessage(chatId, `❌ **Ошибка!** Не удалось запустить генерацию: ${errorText}`, token);
        }
        await logDebug("FREE_CREATIVE_CRITICAL", `Полная ошибка ${mode}: ${errorText}`, envData);
    } finally {
        await storage.delete(GENERATION_LOCK_KEY);
    }
}

// ✅ *** 3.5. processText2ImageCommand - Обработка команды /text (Генерация изображения по тексту) ***
// Аргументы: chatId, inputPrompt, token, storage, envData, initialMessageId = null
async function processText2ImageCommand(chatId, inputPrompt, token, storage, envData, initialMessageId = null) {
    let loadingMessageId = initialMessageId; // ✅ ИСПОЛЬЗУЕМ ПЕРЕДАННЫЙ ID
    const chatKey = chatId.toString();
    const GENERATION_LOCK_KEY = chatKey + '_generation_in_progress';
    const BALANCE_KEY = chatKey + '_credit_balance';
    const SUBSCRIPTION_END_KEY = chatKey + SUBSCRIPTION_END_KEY_SUFFIX; // <-- НОВЫЙ КЛЮЧ
    const LAST_PROMPT_KEY = chatKey + envData.LAST_PROMPT_KEY_SUFFIX;
    // Объявляем переменные для блока catch
    let isSubscriptionActive = false;
    let balanceBeforeCharge = 0;
    let finalCost = 0;
    let russianPrompt = '';
    let englishPrompt = '';
    // --- 1. КРИТИЧЕСКАЯ ПРОВЕРКА: ЗАГЛУШКА ФОТО ---
    if (!envData.PHOTO_ENABLED) { 
        const disabledMessage = "📷 **Фото-функция временно отключена администратором.**";
        await sendMessage(chatId, disabledMessage, token);
        return; 
    }
    try {
        // УНИВЕРСАЛЬНЫЙ ВЫЗОВ зависит от настроенной в KV модели
        // 1. Определение сервиса и ключа KV - Обязательно
        const serviceType = 'TEXT_TO_IMAGE'; 
        const serviceMenuConfig = AI_MODEL_MENU_CONFIG[serviceType];
        const kvKey = serviceMenuConfig.kvKey;
        // 2. ДИНАМИЧЕСКОЕ ЧТЕНИЕ АКТУАЛЬНОЙ КОНФИГУРАЦИИ
        const defaultModelKey = Object.keys(serviceMenuConfig.models)[0]; 
        // Читаем актуальное значение прямо из KV. 
        const freshConfigKey = await envData.LAST_PHOTO_STORAGE.get(kvKey);
        // Используем свежий ключ ИЛИ ключ по умолчанию
        const activeConfigKey = freshConfigKey || defaultModelKey;
        // 3. Получение полного объекта конфигурации из AI_MODELS
        const activeModelConfig = AI_MODELS[activeConfigKey];

        // 4. *** ДЕБАГ: СООБЩЕНИЕ О ВЫБОРЕ МОДЕЛИ ***
        // Получаем красивое имя модели для дебага
        const friendlyModelName = serviceMenuConfig.models[activeConfigKey] || activeConfigKey; 
        // УСЛОВИЕ: Текущий пользователь должен быть админом И дебаг должен быть включен
        if (envData.DEBUG_ENABLED && envData.DEBUG_CHAT_ID) {
            const debugMessage = `🧠 AI-Модель для ${serviceType}: ${friendlyModelName}`;
            envData.ctx.waitUntil(sendMessage(
                chatId, // Отправляем в текущий чат
                debugMessage, 
                envData.TELEGRAM_BOT_TOKEN
            ));
        } // Если chatId не совпадает с ADMIN_CHAT_ID, сообщение пропускается.

        // =======================================================
        // 🔥 БЛОК 4.5: РАСЧЕТ ДИНАМИЧЕСКОЙ ЦЕНЫ
        // =======================================================
        let calculatedPriceCredits = 0; 
        let priceWasFound = false;

        if (activeModelConfig && typeof activeModelConfig.pricing !== 'undefined') {
            const rawPricing = activeModelConfig.pricing;
            
            if (typeof rawPricing === 'number' && rawPricing >= 0) {
                calculatedPriceCredits = rawPricing;
                priceWasFound = true; 
            }
        }
        
        // Устанавливаем запасной вариант ТОЛЬКО если цена не была найдена в конфиге
        if (!priceWasFound) {
            calculatedPriceCredits = (typeof COST_PHOTO_CREDIT !== 'undefined' ? COST_PHOTO_CREDIT : 1);
        }
        
        // =======================================================
        // 🔥 БЛОК 4.6: ПРОВЕРКА И СПИСАНИЕ БАЛАНСА
        // =======================================================
        
        // 🛑 ВЫЗЫВАЕМ checkAndDeductBalance с ДИНАМИЧЕСКОЙ ценой!
        const serviceName = 'генерация (T2I)'; // Имя сервиса для сообщения
        const balanceCheckResult = await checkAndDeductBalance(
            chatId, 
            envData.LAST_PHOTO_STORAGE, 
            calculatedPriceCredits, 
            serviceName, 
            envData
        );
       
        // 🛑 ПРОВЕРКА РЕЗУЛЬТАТА И ПРЕРЫВАНИЕ
        if (!balanceCheckResult.canProceed) {
            // Сообщение об ошибке уже отправлено внутри checkAndDeductBalance.
            return; 
        }

        isSubscriptionActive = balanceCheckResult.isSubscriptionActive;
        balanceBeforeCharge = balanceCheckResult.currentBalance;
        finalCost = balanceCheckResult.cost;
        
        // ----------------------------------------------------------------------

        // 1. Определение промпта (без изменений)
        if (inputPrompt && inputPrompt.trim().length > 0) {
            russianPrompt = inputPrompt.trim();
        } else {
            const storedPrompt = await envData.LAST_PHOTO_STORAGE.get(LAST_PROMPT_KEY);
            if (storedPrompt) {
                russianPrompt = storedPrompt;
            } else {
                await sendMessage(chatId, "⚠️ **Не могу сгенерировать изображение.**\n\nНе найден промпт. Используйте `/create [текст промпта]` или сначала отправьте фото для его анализа (/photo).", token);
                return;
            }
        }

        if (russianPrompt.trim().length === 0) {
            await sendMessage(chatId, "⚠️ **Промпт пустой.** Пожалуйста, предоставьте текст для генерации.", token);
            return;
        }

        // 1.5. СОХРАНЕНИЕ: Сохраняем последний использованный промпт в KV
        await envData.LAST_PHOTO_STORAGE.put(LAST_PROMPT_KEY, russianPrompt);

        // 2. Отправляем сообщение "Перевожу..." ИЛИ РЕДАКТИРУЕМ
        const translationText = `🌐 **Перевожу промпт и запускаю генерацию через ${activeModelConfig.SERVICE}...**`;

        // 🛑 ОТПРАВЛЯЕМ СООБЩЕНИЕ О БАЛАНСЕ ИЛИ РЕДАКТИРУЕМ
        // 💡 ИСПРАВЛЕНИЕ 1: Комбинируем сообщение о балансе и начале перевода
        const firstMessageText = balanceCheckResult.balanceMessage + `\n\n${translationText}`;

        if (!loadingMessageId) {
            // Если ID не передан (например, команда /text), отправляем сообщение о списании/переводе
            const loadingMessage = await sendMessage(chatId, firstMessageText, token); // ⬅️ ОТПРАВЛЯЕМ СРАЗУ ОБА ТЕКСТА
            if (!loadingMessage.ok || !loadingMessage.result) return;
            loadingMessageId = loadingMessage.result.message_id;
        } else {
            // ✅ Если ID передан (из колбэка), редактируем его
            // В этом случае messageId уже есть, и мы его редактируем
            await editMessage(chatId, loadingMessageId, firstMessageText, token);
        }

        // 💡 ИСПРАВЛЕНИЕ 2: Удаляем лишнюю отправку сообщения о процессе
        // Текст "⏳ Выполняется генерация изображения..." будет добавлен ниже через editMessage.
        /*
        const processingMessage = await sendMessageMarkdown(
            chatId, 
            `⏳ **Выполняется генерация изображения**...\nПроцесс может занять до 45 секунд. Пожалуйста, подождите.`,
            token
        );
        */


        // 3. ПЕРЕВОД: Получаем английскую версию промпта для генератора
        const englishPrompt = await callWorkersAITranslate(russianPrompt, envData, 'ru', 'en');

        // 💡 ИСПРАВЛЕНИЕ 3: Редактируем сообщение, чтобы показать прогресс
        const generationStartText = `⏳ **Выполняется генерация изображения**...\nПроцесс может занять до 45 секунд. Пожалуйста, подождите.\n\n${balanceCheckResult.balanceMessage}`;
        if (loadingMessageId) {
            await editMessage(chatId, loadingMessageId, generationStartText, token);
        }

        // --- 4. УНИВЕРСАЛЬНЫЙ ВЫЗОВ T2I ---
        const service = activeModelConfig.SERVICE;
        const result = await activeModelConfig.FUNCTION(
            activeModelConfig, // config
            englishPrompt,
            envData,
            chatId
        );

        // 🛑 НОВЫЙ БЛОК: АДАПТЕР/ДЕТЕКТОР АСИНХРОННОСТИ
        if (service === 'KIEAI') {
            // 4.1. Обработка асинхронного вызова (KIE.AI)
            if (typeof result === 'string' && result.length > 10) { 
                // Сообщение о запуске KIEAI Job ID
                const jobStartMessage = `🎨 Генерация изображения запущена!\nМодель: ${friendlyModelName}\nJob ID: ${result}\n\n⚠️ Это может занять некоторое время. По готовности будет доставлено автоматически.`;
                await sendMessageMarkdown(chatId, jobStartMessage, token);

                // Если успешно вернулся Task ID, это означает, что задание запущено.
                return true; // Возвращаем успех в родительскую функцию (если нужно завершить цикл обработки)
            } else {
                // Если вернулось null, значит, произошла ошибка, о которой уже сообщили пользователю.
                throw new Error("T2I Task failed to launch.");
            }

        } else {
            // 4.2. Обработка синхронных сервисов (Workers AI, Gemini, Bothub, Kandinsky, и т.д.)
            const imageArrayBuffer = result;
            
            // Проверка на корректность буфера
            if (!(imageArrayBuffer instanceof ArrayBuffer)) {
                await sendMessage(chatId, `❌ **Ошибка:** ${service} не вернул ArrayBuffer.`, token);
                throw new Error(`${service} did not return ArrayBuffer.`);
            }

            // 💡 Редактируем сообщение о процессе на "Успешно"
            //if (loadingMessageId) await editMessage(chatId, loadingMessageId, "✅ ** Изображение сгенерировано.**", token);

            // 5. Отправка изображения в Telegram
            const finalCaption = `✅ Изображение сгенерировано!`;
            const success = await sendPhotoWithCaption(
                chatId,
                imageArrayBuffer,
                finalCaption,
                token,
                envData
            );
            
            if (!success.ok) {
                throw new Error(success.description || "Неизвестная ошибка отправки фото.");
            }
            return true; // Успех, фото отправлено.
        }

    } catch (error) {
        // !!! КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Используем ошибку с деталями API
        const errorText = error.message || "Неизвестная ошибка генерации изображения.";
        let finalErrorText = errorText;

        // Возвращаем кредит, если он был списан, и подписка неактивна.
        if (finalCost > 0 && !isSubscriptionActive) {
            // Добавляем кредиты обратно к балансу (или восстанавливаем старое значение)
            // 🛑 ВАЖНО: Нужна функция отмены (revert/add) или прямой PUT
            // Поскольку у нас нет функции revertCreditBalance, используем прямой PUT
            const BALANCE_KEY = chatKey + '_credit_balance';
            await envData.LAST_PHOTO_STORAGE.put(BALANCE_KEY, balanceBeforeCharge.toString(), { expirationTtl: 3600 * 24 * 365 });
            
            finalErrorText += `\n\n✅ **Кредит (${finalCost}) возвращен** из-за ошибки генерации.`;
            envData.ctx.waitUntil(logDebug("CREDIT_REVERT", `Кредит ${finalCost} возвращен пользователю ${chatId}. Баланс до: ${balanceBeforeCharge}.`, envData));
        }

        // 1. Форматируем сообщение для пользователя. 
        if (finalErrorText.length > 500) {
            finalErrorText = finalErrorText.substring(0, 497) + '... (см. логи)';
        }
        
        // 2. Выводим сообщение об ошибке
        if (loadingMessageId) {
            await editMessage(chatId, loadingMessageId, `❌ **Ошибка!** Не удалось сгенерировать изображение:\n${finalErrorText}`, token);
        } else {
            // Если по какой-то причине ID не получен, отправляем новое сообщение
            await sendMessage(chatId, `❌ **Ошибка!** Не удалось запустить генерацию: ${finalErrorText}`, token);
        }
        
        // 3. Выводим полный текст ошибки в логи (без задержки)
        envData.ctx.waitUntil(logDebug("CRITICAL", `Полная ошибка T2I: ${errorText}`, envData));
    }
}

// *** 3.6. Обработка повторной генерации промпта (по Base64 из KV) - УНИФИЦИРОВАНО ***
async function processPromptRegeneration(chatId, imageBase64, token, storage, envData) {
    let workingMessageId;
    const chatKey = chatId.toString();
    
    // Ключи
    const LAST_PROMPT_KEY = chatKey + envData.LAST_PROMPT_KEY_SUFFIX; 
    const LAST_PROMPT_LANG_KEY = chatKey + envData.LAST_PROMPT_LANG_KEY_SUFFIX; 
    
    let originalImageBase64 = imageBase64; 

        // УНИВЕРСАЛЬНЫЙ ВЫЗОВ зависит от настроенной в KV модели
        // 1. Определение сервиса и ключа KV - Обязательно
        const serviceType = 'IMAGE_TO_TEXT'; 
        const serviceMenuConfig = AI_MODEL_MENU_CONFIG[serviceType];
        const kvKey = serviceMenuConfig.kvKey;
        // 2. ДИНАМИЧЕСКОЕ ЧТЕНИЕ АКТУАЛЬНОЙ КОНФИГУРАЦИИ
        const defaultModelKey = Object.keys(serviceMenuConfig.models)[0]; 
        // Читаем актуальное значение прямо из KV. 
        const freshConfigKey = await envData.LAST_PHOTO_STORAGE.get(kvKey);
        // Используем свежий ключ ИЛИ ключ по умолчанию
        const activeConfigKey = freshConfigKey || defaultModelKey;
        // 3. Получение полного объекта конфигурации из AI_MODELS
        const activeModelConfig = AI_MODELS[activeConfigKey];

        // 4. *** ДЕБАГ: СООБЩЕНИЕ О ВЫБОРЕ МОДЕЛИ ***
        // Получаем красивое имя модели для дебага
        const friendlyModelName = serviceMenuConfig.models[activeConfigKey] || activeConfigKey; 
        // УСЛОВИЕ: Текущий пользователь должен быть админом И дебаг должен быть включен
        if (chatId.toString() === envData.ADMIN_CHAT_ID && envData.DEBUG_ENABLED) {
            const debugMessage = `🧠 AI-Модель для ${serviceType}: ${friendlyModelName}`;
            envData.ctx.waitUntil(sendMessage(
                chatId, // Отправляем в текущий чат
                debugMessage, 
                envData.TELEGRAM_BOT_TOKEN
            ));
        } // Если chatId не совпадает с ADMIN_CHAT_ID, сообщение пропускается.

     try {
        const loadingMessage = await sendMessageMarkdown(chatId, "✨ **Повторный анализ фото: Генерирую новый промпт...**", token); 
        if (loadingMessage.ok) { workingMessageId = loadingMessage.result.message_id; }

        if (!originalImageBase64 || originalImageBase64.length < 1000) {
             throw new Error("LAST_IMAGE_DATA не найдено или слишком короткое. Отправьте фото повторно.");
        }

        // 2. Очистка и Парсинг Base64
        let base64Data;
        try {
            // Если Яндекс уже распарсил JSON в объект, берем поле напрямую
            if (typeof originalImageBase64 === 'object' && originalImageBase64 !== null) {
                base64Data = originalImageBase64.base64;
            } else {
                // Если это всё же строка, парсим один раз
                const parsed = JSON.parse(originalImageBase64);
                base64Data = parsed.base64;
            }
        } catch (e) {
            // Если не JSON, берем как есть
            base64Data = originalImageBase64;
        }

        if (!base64Data) {
            throw new Error("Не удалось извлечь Base64 из данных. Поле 'base64' отсутствует.");
        }

        // Приводим к строке, чтобы убрать префикс и мусор
        let finalStr = String(base64Data);

        if (finalStr.includes(',')) {
            finalStr = finalStr.split(',')[1];
        }

        // Очистка от пробелов и переносов (критично для правильного декодирования)
        finalStr = finalStr.replace(/\s/g, '');

        // Проверяем паддинг
        while (finalStr.length % 4) {
            finalStr += '=';
        }

        // 3. Декодируем и готовим ArrayBuffer для Vision AI
        // Используем твою функцию, так как она уже проверена
        const imageUint8Array = base64ToUint8Array(finalStr);

        if (imageUint8Array.byteLength === 0) {
            throw new Error(`Ошибка декодирования: 0 байт на выходе.`);
        }

        // Создаем чистый ArrayBuffer
        const imageArrayBuffer = imageUint8Array.buffer;

        // 4. УНИВЕРСАЛЬНЫЙ Вызов Vision AI 
        await editMessage(chatId, workingMessageId, `🔄 Анализ фото через ${activeModelConfig.SERVICE} Vision...`, token);
        
        const finalPrompt = await activeModelConfig.FUNCTION(
            activeModelConfig,      // <-- Передаем конфигурацию
            imageArrayBuffer,   // <-- ArrayBuffer
            envData
        ); 

        // 5. Установка и Сохранение Языка и Флага
        const lang = 'en'; // При перегенерации промпт всегда EN (нижний регистр)
        const flag = '🇬🇧'; // Определяем английский флаг

        await storage.put(LAST_PROMPT_KEY, finalPrompt, { expirationTtl: 86400 });
        await storage.put(LAST_PROMPT_LANG_KEY, lang, { expirationTtl: 86400 }); // Сохраняем язык 'en'
        const charCount = finalPrompt ? finalPrompt.length : 0;
        // 6. Формирование сообщения в НОВОМ СТИЛЕ
        let message = `✅ **Описание Вашей фотографии!**\n\n`;

        // Формируем сообщение с флагом
        message += `**Язык:** ${flag} ${lang.toUpperCase()}\n\n**Промпт:**\n\`${finalPrompt}\`\n\n**Кол-во символов:** ${charCount}\n\nЧто вы хотите сделать с этим промптом?`;
        
        // 7. Получаем клавиатуру
        const newKeyboard = getPromptKeyboard(finalPrompt); 
        
        // 8. Отправляем сообщение с клавиатурой
        await sendMessageWithKeyboard(chatId, message, token, newKeyboard.inline_keyboard);
        
        // 9. Удаляем сообщение "В работе..."
        if (workingMessageId) {
            envData.ctx.waitUntil(deleteMessage(chatId, workingMessageId, token));
        }

    } catch (e) {
        // !!! ПОЛНАЯ РАБОЧАЯ ЛОГИКА ОБРАБОТКИ ОШИБОК !!!
        const errorMessage = `Критическая ошибка при повторном анализе: ${e.message}.`;
        console.error(errorMessage); 
        
        if (workingMessageId) {
            envData.ctx.waitUntil(editMessage(chatId, workingMessageId, `❌ ${errorMessage}`, token)); 
        } else {
            envData.ctx.waitUntil(sendMessage(chatId, `❌ ${errorMessage}`, token));
        }
    }
}

// ✅ pollKieAiTaskSync - ИСПРАВЛЕННАЯ И УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ПОЛЛИНГА
/**
 * 🔄 pollKieAiTaskSync - Блокирующе опрашивает статус задания Kie.Ai до успеха или провала.
 * @param {string} taskId - ID задания.
 * @param {object} modelConfig - Конфигурация модели (BASE_URL).
 * @param {string} apiKey - API ключ.
 * @param {object} envData - Объект окружения (chatId, token, logDebug).
 * @returns {Promise<object>} Объект результата с result, videoUrl или ошибкой.
 */
async function pollKieAiTaskSync(taskId, modelConfig, apiKey, envData) {
    const token = envData.TELEGRAM_BOT_TOKEN;
    const chatId = envData.currentChatId; // Или передайте chatId явно
    
    // 🛑 Увеличиваем лимиты, чтобы избежать затыка на 4-й попытке
    const MAX_ATTEMPTS = 18; 
    const POLL_INTERVAL_SECONDS = 5; 
    const POLL_INTERVAL_MS = POLL_INTERVAL_SECONDS * 1000;

    for (let attempts = 1; attempts <= MAX_ATTEMPTS; attempts++) {
        
        if (attempts > 1) { // 🛑 Ждем ТОЛЬКО со второй попытки
            // ГАРАНТИРОВАННАЯ БЛОКИРУЮЩАЯ ПАУЗА
            await sleep(POLL_INTERVAL_MS); 
            await sendMessageMarkdown(envData.currentChatId, `⏳ **Проверка статуса**... (Попытка ${attempts}/${MAX_ATTEMPTS})`, envData.TELEGRAM_BOT_TOKEN);
        }

        const statusResult = await QueryTaskKieAiCheckStatus(taskId, modelConfig, apiKey, envData);

        switch (statusResult.status) {
            case 'success':
                return statusResult; // Содержит result (для Image) или videoUrl (для Video)
            
            case 'fail':
                throw new Error(`Задание провалено: ${statusResult.result}`);
            
            case 'running':
            default:
                // Продолжаем опрос
                break;
        }
    }

    // Таймаут
    throw new Error(`Таймаут: Задание KIE.AI (ID: ${taskId.substring(0, 10)}) не завершилось за ${MAX_ATTEMPTS * POLL_INTERVAL_SECONDS} секунд.`);
}

/**
 * Асинхронно извлекает статус активного задания (Task ID) из KV.
 * Необходим для логики Video-to-Video в меню /video.
 * * @param {number} chatId - ID чата.
 * @param {object} envData - Переменные окружения (для доступа к LAST_PHOTO_STORAGE).
 * @returns {Promise<{isTaskAvailable: boolean, previousTaskId: string|null}>}
 */
async function getTaskAvailabilityStatus(chatId, envData) {
    // 🛑 ПРИМЕЧАНИЕ: LAST_ACTIVE_TASK_KEY_SUFFIX ДОЛЖЕН БЫТЬ ГЛОБАЛЬНОЙ КОНСТАНТОЙ!
    const chatKey = chatId.toString();
    const storage = envData.LAST_PHOTO_STORAGE;
    // Используем константу, которая должна быть определена ГЛОБАЛЬНО
    const LAST_ACTIVE_TASK_KEY = chatKey + LAST_ACTIVE_VIDEO_KEY_SUFFIX; 
    
    let previousTaskId = null;
    let isTaskAvailable = false;
    
    try {
        // Task ID сохраняется как JSON, как мы определили в startGenerationTask
        const taskData = await storage.get(LAST_ACTIVE_TASK_KEY, { type: 'json' }); 

        // Проверяем, что данные существуют, содержат taskId, и он является валидной строкой
        if (taskData && taskData.taskId) {
            const taskIdCandidate = taskData.taskId;
            // Проверка, что это строка и имеет длину > 10 символов (для Task ID)
            if (typeof taskIdCandidate === 'string' && taskIdCandidate.length > 10) {
                previousTaskId = taskIdCandidate;
                isTaskAvailable = true;
            }
        }

    } catch (e) {
        // Логируем ошибку чтения KV, но не блокируем работу
        console.error("Ошибка при чтении Task ID из KV:", e);
    }

    return { 
        isTaskAvailable: isTaskAvailable,
        previousTaskId: previousTaskId 
    };
}

// ✅ getVideoMenuContent - Генерирует Inline-клавиатуру и текст для меню /video
// !!! ОБНОВЛЕНО: Добавлены chatId и LAST_PHOTO_STORAGE !!!
async function getVideoMenuContent(chatId, LAST_PHOTO_STORAGE, currentPrompt, isPhotoSaved, isVideoSaved, isAudioSaved, videoParams, isTaskAvailable, previousTaskId) { 
    const { seconds, aspectRatio, resolution, mode: currentMode } = videoParams
    // !!! ВАЖНО: isAudioSaved должен быть передан в эту функцию из внешнего кода !!!
    const hasPrompt = currentPrompt && currentPrompt.trim().length > 0;
    let keyboard = [];
    let messageText;
    // --- АСИНХРОННЫЙ ВЫЗОВ: ПОЛУЧАЕМ СТАТУС БАЛАНСА ---
    const balanceStatus = await getCurrentCreditBalance(chatId, LAST_PHOTO_STORAGE);
    // ---------------------------------------------
    const statusLine = `💰 **Баланс:** ${balanceStatus}`;
    // -------------------------------------------------------------

    // ✅ ДОБАВЛЯЕМ СТРОГУЮ ПРОВЕРКУ ТИПА ДАННЫХ!
    const isTaskValid = isTaskAvailable && typeof previousTaskId === 'string'; // <--- НОВЫЙ ФЛАГ

    // Определяем АКТИВНЫЙ РЕЖИМ для логики запуска
    const isI2VActive = (currentMode === 'I2V' && isPhotoSaved); // I2V активен, только если есть фото
    const isT2VActive = (currentMode === 'T2V'); 
    const isV2VActive = (currentMode === 'V2V' && isPhotoSaved && isVideoSaved);
    const isA2VActive = (currentMode === 'A2V' && isAudioSaved && isPhotoSaved); // <-- НОВЫЙ ФЛАГ

    // Определяем, возможен ли запуск
    const isRunnable = (isT2VActive && hasPrompt) 
                     || (isI2VActive && hasPrompt) 
                     || (isV2VActive && isVideoSaved)
                     || (isA2VActive && hasPrompt); // <-- ДОБАВЛЕН A2V

    // -------------------------------------------------------------------
    // 🔥 НОВЫЙ БЛОК: РАСЧЕТ ЦЕНЫ
    // -------------------------------------------------------------------
    
    // 1. Определение ключа активной модели (для KieAI - как основного платного провайдера)
    let activeModelKey;
    switch (currentMode) {
        case 'T2V':
            activeModelKey = 'TEXT_TO_VIDEO_KIEAI';
            break;
        case 'I2V':
            activeModelKey = 'IMAGE_TO_VIDEO_KIEAI';
            break;
        case 'V2V':
            activeModelKey = 'VIDEO_TO_VIDEO_KIEAI';
            break;
        case 'A2V':
            activeModelKey = 'AUDIO_TO_VIDEO_KIEAI';
            break;
        default:
            activeModelKey = 'TEXT_TO_VIDEO_KIEAI';
    }

    // 2. Параметры для расчета
    const currentResolution = resolution || '480p'; 
    let durationForCalculation; // <- Эта переменная будет хранить длительность в секундах
     
    if (currentMode === 'A2V') {
        // 🔥 Читаем длительность, сохраненную в KV
        const DURATION_KEY = chatId + '_audio_duration'; 
        const rawDuration = await LAST_PHOTO_STORAGE.get(DURATION_KEY); 
        
        // Преобразуем в целое число. Если не найдено или 0, используем 1 секунду.
        const audioLength = parseInt(rawDuration, 10) || 1; 

        durationForCalculation = audioLength; // В вашем случае: 2
        
    } else {
        // Для T2V, I2V, V2V
        durationForCalculation = parseInt(seconds, 10) || 5; // Значение из video_params
    }

    // 3. Расчет цены
    let calculatedPriceCredits = 0;
    
    if (activeModelKey) {
        // Передаем динамически определенную длительность
        calculatedPriceCredits = calculatePrice(activeModelKey, durationForCalculation, currentResolution);
    }
    
    // 4. Форматирование строки цены (остается без изменений)
    const priceLine = calculatedPriceCredits > 0 
        ? `💸 **Цена генерации:** ${formatPrice(calculatedPriceCredits)}` 
        : '💸 **Цена генерации:** Бесплатно';
        
    // -------------------------------------------------------------------                   

    // --- ФОРМИРОВАНИЕ КЛАВИАТУРЫ ---

    // 1-я строка: Главное меню
    keyboard.push([{ text: "🏠 Открыть главное меню /start", callback_data: "start_command" }]);
    keyboard.push([{ text: '💰 Меню управления балансом', callback_data: 'show_balance' }]);
    const activeIcon = '✅ '; 

    // --- 2-я строка: T2V и I2V (по 2 кнопки) ---
    let modeButtonRow1 = [];

    // 1. Text → Video (T2V) 
    if (isT2VActive) {
        modeButtonRow1.push({ text: activeIcon + "📹 Text → Video", callback_data: 'dummy_t2v_active' });
    } else {
        modeButtonRow1.push({ text: "📹 Text → Video", callback_data: 'set_video_mode|T2V' });
    }
    
    // 2. Image → Video (I2V) 
    if (currentMode === 'I2V') { 
        modeButtonRow1.push({ text: activeIcon + "📸 Image → Video", callback_data: 'dummy_i2v_active' });
    } else {
        modeButtonRow1.push({ text: "📸 Image → Video", callback_data: 'set_video_mode|I2V' });
    }
    keyboard.push(modeButtonRow1); // Добавляем 2-ю строку

    // --- 3-я строка: V2V и A2V (по 2 кнопки) ---
    let modeButtonRow2 = [];

    // 3. Audio → Video (A2V)
    if (currentMode === 'A2V') { 
        modeButtonRow2.push({ text: activeIcon + "🗣 Audio → Video", callback_data: 'dummy_a2v_active' });
    } else { 
        modeButtonRow2.push({ text: "🗣 Audio → Video", callback_data: 'set_video_mode|A2V' });
    //else if (isAudioSaved && isPhotoSaved) { // Требует и аудио, и фото
        // 🚫 Блокируем кнопку, если нет аудио или фото
        //modeButtonRow2.push({ text: "🚫 Audio → Video", callback_data: 'dummy_a2v_disabled' });
    }
    // 4. Video → Video (V2V)
    if (currentMode === 'V2V') { // Режим V2V активен
        modeButtonRow2.push({ text: activeIcon + "📽️ Video → Video", callback_data: 'dummy_v2v_active' });
    } else { 
        modeButtonRow2.push({ text: "📽️ Video → Video", callback_data: 'set_video_mode|V2V' });
    }
    
    keyboard.push(modeButtonRow2); // Добавляем 3-ю строку


    // Кнопки промпта (показываем, если не V2V, или если V2V, но промпт уже задан)
    if (currentMode !== 'V2V' || hasPrompt) {
        keyboard.push(
            [{ 
                text: hasPrompt ? "✏️ Редактировать промпт" : "🆕 Создать новый промпт", 
                callback_data: hasPrompt ? 'edit_prompt' : 'create_new_prompt' 
            }]
        );
    }
    
    // --- СТРОКА ЗАГРУЗКИ/ПРОСМОТРА МЕДИА ---
    if (currentMode === 'I2V') {
        keyboard.push(
            [{
                text: isPhotoSaved ? "💾 Посмотреть загруженное фото" : "📸 Загрузить фотографию", 
                callback_data: isPhotoSaved ? 'cmd:/view_saved_photo' : 'cmd:/upload_photo' 
            }]
        );
    }
    // ДОБАВЛЕНИЕ: Отдельная кнопка для V2V
    else if (currentMode === 'V2V') {
        //if (isTaskAvailable) {
        //keyboard.push(
        //    [{
        //        text: isTaskAvailable ? "💾 Просмотр активного задания" : "▶️ Получить активное задание ",
        //        callback_data: isTaskAvailable ? `checkvideo|${previousTaskId.substring(0, 32)}` : `cmd:/checkvideo`
        //    }]
        //);
        //}
        keyboard.push(
            [{
                text: isPhotoSaved ? "💾 Посмотреть загруженное фото" : "📸 Загрузить фотографию", 
                callback_data: isPhotoSaved ? 'cmd:/view_saved_photo' : 'cmd:/upload_photo' 
            }]
        );
        keyboard.push(
            [{
                text: isVideoSaved ? "💾 Посмотреть загруженное видео" : "📹 Загрузить видеоролик", 
                callback_data: isVideoSaved ? 'cmd:/view_saved_video' : 'cmd:/upload_video'
            }]
        );
    }

    // ✅ ИЗМЕНЕНИЕ: A2V теперь использует две кнопки (фото и аудио)
    else if (currentMode === 'A2V') {
        // Кнопка 1: Просмотр Фото
        keyboard.push(
            [{
            text: isPhotoSaved ? "💾 Фотография в базе" : "📸 Загрузить фотографию", 
            callback_data: isPhotoSaved ? 'cmd:/view_saved_photo' : 'cmd:/upload_photo' 
            }]
        );
        // Кнопка 2: Просмотр Аудио
        keyboard.push(
            [{
            text: isAudioSaved ? "🔈 Аудиозапись в базе" : "🔇 Нет аудиозаписи (используйте /say)", 
            callback_data: isAudioSaved ? 'cmd:/view_saved_audio' : 'cmd:/say_empty' 
            }]
        );
    }
    // Параметры видео (Разрешение, Длительность и Соотношение) - показываем всегда
    keyboard.push(
        // Заголовок Длительность
        [{ text: `Длительность: ${seconds} сек.`, callback_data: 'ignore' }],
        [
            // Галочки для Длительности
            //{ text: (seconds === '4' ? '✅ ' : '') + '4 сек.', callback_data: `set_video_sec|4` },
            //{ text: (seconds === '5' ? '✅ ' : '') + '5 сек.', callback_data: `set_video_sec|5` },
            { text: (seconds === '6' ? '✅ ' : '') + '6 сек.', callback_data: `set_video_sec|6` },
            //{ text: (seconds === '7' ? '✅ ' : '') + '7 сек.', callback_data: `set_video_sec|7` },
            //{ text: (seconds === '8' ? '✅ ' : '') + '8 сек.', callback_data: `set_video_sec|8` },
            //{ text: (seconds === '9' ? '✅ ' : '') + '9 сек.', callback_data: `set_video_sec|9` },
            { text: (seconds === '10' ? '✅ ' : '') + '10 сек.', callback_data: `set_video_sec|10` },
            { text: (seconds === '15' ? '✅ ' : '') + '15 сек.', callback_data: `set_video_sec|15` },
            { text: (seconds === '25' ? '✅ ' : '') + '25 сек.', callback_data: `set_video_sec|25` },
        ],
        // Заголовок Соотношение
        [{ text: `Соотношение: ${aspectRatio}`, callback_data: 'ignore' }],
        [
            // Галочки для Соотношения
            { text: (aspectRatio === '16:9' ? '✅ ' : '') + '16:9 (Ландшафт)', callback_data: `set_video_ratio|16:9` },
            { text: (aspectRatio === '3:4' ? '✅ ' : '') + '3:4 (Портрет)', callback_data: `set_video_ratio|3:4` },
            { text: (aspectRatio === '1:1' ? '✅ ' : '') + '1:1 (Квадрат)', callback_data: `set_video_ratio|1:1` },
        ],
        // Заголовок Качество разрешения
        [{ text: `Разрешение: ${resolution}`, callback_data: 'ignore' }],
        [
            // Галочки для Разрешения
            { text: (resolution === '480p' ? '✅ ' : '') + '480p', callback_data: `set_video_resolution|480p` },
            { text: (resolution === '580p' ? '✅ ' : '') + '580p', callback_data: `set_video_resolution|580p` },
            { text: (resolution === '720p' ? '✅ ' : '') + '720p', callback_data: `set_video_resolution|720p` },
            { text: (resolution === '1080p' ? '✅ ' : '') + '1080p', callback_data: `set_video_resolution|1080p` },
            //{ text: (resolution === '2K' ? '✅ ' : '') + '2K', callback_data: `set_video_resolution|2K` },
            //{ text: (resolution === '4K' ? '✅ ' : '') + '4K', callback_data: `set_video_resolution|4K` },
        ]
        );

    // Кнопка запуска
    let runButtonText;
    let runButtonCallback;

    if (isRunnable) {
        if (isV2VActive) {
            runButtonText = `🎬 ЗАПУСК ЗАМЕНЫ ВИДЕО (${seconds}с, ${aspectRatio})`;
        } else if (currentMode === 'I2V') { // Используем currentMode для фото
            runButtonText = `🎬 ЗАПУСК ОЖИВЛЕНИЯ (${seconds}с, ${aspectRatio})`;
        } else if (currentMode === 'A2V') { // Используем currentMode для текста
            runButtonText = `🎬 ЗАПУСК СОЗДАНИЯ АВАТАРА (${seconds}с, ${aspectRatio})`;
        } else {
            runButtonText = `🎬 ЗАПУСК ВИДЕО (${seconds}с, ${aspectRatio})`;
        }
        runButtonCallback = `start_video_generation|${currentMode}`;
        
    } else if (currentMode === 'V2V') {
        let requiredText = '(Нужно исходное видео)';
        runButtonText = `🚫 Запуск V2V не доступен ${requiredText}`; 
        runButtonCallback = 'dummy_no_run';
    } else if (currentMode === 'A2V' && !hasPrompt) {
        runButtonText = "🚫 Запуск A2V не доступен (Нужен промпт)"; 
        runButtonCallback = 'dummy_no_run';
    } else if (currentMode === 'I2V' && !hasPrompt) {
        runButtonText = "🚫 Запуск не доступен (Нужен промпт)"; 
        runButtonCallback = 'dummy_no_run';
    } else {
        runButtonText = "🚫 Запуск не доступен (Нужен промпт)"; 
        runButtonCallback = 'dummy_no_run';
    }

    keyboard.push([
        { 
            text: runButtonText, 
            callback_data: runButtonCallback
        }
    ]);
    
    // --- ФОРМИРОВАНИЕ ТЕКСТА СООБЩЕНИЯ ---

    // Сценарий 3: Video-to-Video (V2V)
    if (currentMode === 'V2V') {
        const photoStatus = isPhotoSaved ? '✅ **Фото** загружено.' : '❌ **Фото не загружено.**';
        const videoStatus = isVideoSaved ? '✅ **Видео доступно.**' : '❌ **Видео не найдено.** (Требуется загрузка видео).';
        const runActionText = isRunnable ? 'отредактировать ролик.' : 'начать замену (после загрузки видео).';

        messageText = `
🎬 **Меню изменения видео (Video-to-Video)**
        
❔ **Как это работает?:**
Нейросеть заменяет персонажа на видео вашей фотографией, тем самым как бы помещает объект с фото в видеоролик.

${photoStatus}
${videoStatus}

Текущие настройки: **${resolution} / ${seconds} сек. / ${aspectRatio}**.

${statusLine}
${priceLine}

Нажмите 🎬 **ЗАПУСК ВИДЕО**, чтобы ${runActionText}
${currentPrompt ? `\nТекущий промпт (дополнительно): \`${currentPrompt.substring(0, 100).replace(/`/g, '')}\`${currentPrompt.length > 100 ? '...' : ''}` : ''}`;
    } 
    // Сценарий 4: Audio-to-Video (A2V) - НОВЫЙ СЦЕНАРИЙ
    else if (currentMode === 'A2V') {
        const photoStatus = isPhotoSaved ? '✅ **Фото** загружено.' : '❌ **Фото не загружено.**';
        const audioStatus = isAudioSaved ? '✅ **Аудио** доступно.' : '❌ **Аудио не доступно.** (Запустите /say)';
    
        if (isRunnable) {
            messageText = `
🎬 **Меню создания аватара (Audio-to-Video)**
    
❔ **Как это работает?:**
Нейросеть берет 📷 **сохраненное фото** и 🔊 **аудио** (результат команды /say) и анимирует губы аватара под речь.
    
${photoStatus}
${audioStatus}
✅ **Промпт** задан.
Текущие настройки: **${resolution} / ${seconds} сек. / ${aspectRatio}**.

${statusLine}
${priceLine}

Нажмите 🎬 **ЗАПУСК СОЗДАНИЯ АВАТАРА**, чтобы озвучить аватар.
    
Текущий промпт: \`${currentPrompt.substring(0, 100).replace(/`/g, '')}\`${currentPrompt.length > 100 ? '...' : ''}`;
        } else {
            // Случай, когда чего-то не хватает
            const promptStatus = hasPrompt ? '✅ **Промпт** задан.' : '❌ **Промпт не задан.**';
            messageText = `
🎬 **Меню создания аватара (Audio-to-Video)**

❔ **Как это работает?:**
Нейросеть берет 📷 **сохраненное фото** и 🔊 **аудио** (результат команды /say) и анимирует губы аватара под речь.

${photoStatus}
${audioStatus}
${promptStatus}

${statusLine}
${priceLine}

Для создания аватара **необходимо**:\n1. Загрузить фото.\n2. Запустить команду /say (для аудио).\n3. Задать промпт (движение головы, эмоция).
    `;
        }
    }
    // Сценарий 1: Image-to-Video (I2V)
    else if (currentMode === 'I2V') {
           if (hasPrompt && isPhotoSaved) {
               messageText = `
🎬 **Меню оживления фотографий (Image-to-Video)**
        
❔ **Как это работает?:**
Нейросеть использует 📷 **сохраненное фото** и ✏️ **предоставленный промпт** для создания анимированного видеоролика.
        
✅ **Фото** загружено.
✅ **Промпт** задан.
Текущие настройки: **${resolution} / ${seconds} сек. / ${aspectRatio}**.

${statusLine}
${priceLine}

Нажмите 🎬 **ЗАПУСК ОЖИВЛЕНИЯ**, чтобы анимировать сохраненный кадр.

Текущий промпт: \`${currentPrompt.substring(0, 100).replace(/`/g, '')}\`${currentPrompt.length > 100 ? '...' : ''}`;
        } else if (isPhotoSaved) {
            messageText = `
🎬 **Меню оживления фотографий (Image-to-Video)**

❔ **Как это работает?:**
Нейросеть использует 📷 **сохраненное фото** и ✏️ **предоставленный промпт** для создания анимированного видеоролика.

✅ **Фото** загружено.
⚠️ **Промпт не задан.**

Для анимации фото нейросети нужен ✏️ **текстовый промпт**, описывающий желаемое движение.

${statusLine}
${priceLine}

Нажмите 🆕 **Создать новый промпт** или перейдите в ✏️ Меню работы с промптом.`;
        } else {
             messageText = `
🎬 **Меню оживления фотографий (Image-to-Video)**

❔ **Как это работает?:**
Нейросеть использует 📷 **сохраненное фото** и ✏️ **предоставленный промпт** для создания анимированного видеоролика.

⚠️ **Фото не загружено.**
${hasPrompt ? '✅ **Промпт** задан.' : '⚠️ **Промпт** не задан.'}

${statusLine}
${priceLine}

Для анимации **необходимо** загрузить фотографию, нажав 📸 **Загрузить фотографию** ниже.`;
        }
    } 
    // Сценарий 2: Text-to-Video (T2V) - СТАНДАРТНЫЙ/ДЕФОЛТНЫЙ
    else { // Это T2V или дефолтное состояние
           if (hasPrompt) {
               messageText = `
🎬 **Меню генерации видео (Text-to-Video)**
        
❔ **Как это работает?:**
Нейросеть генерирует видео из ✏️ **текстового описания** (промпта).
        
✅ **Промпт** задан.
Текущие настройки: **${resolution} / ${seconds} сек. / ${aspectRatio}**.

${statusLine}
${priceLine}

Нажмите 🎬 **ЗАПУСК ВИДЕО**, чтобы создать ролик из текста.

Текущий промпт: \`${currentPrompt.substring(0, 100).replace(/`/g, '')}\`${currentPrompt.length > 100 ? '...' : ''}`;
        } else {
            messageText = `
🎬 **Меню генерации видео (Text-to-Video)**

❔ **Как это работает?:**
Нейросеть генерирует видео из ✏️ **текстового описания** (промпта).

⚠️ **Промпт не задан.** Для запуска в режиме Text-to-Video необходим промпт.

${statusLine}
${priceLine}

Пожалуйста, задайте промпт, нажав 🆕 или перейдите в ✏️ Меню.
`;
        }
    }


    return { menuMessage: messageText, keyboard: { inline_keyboard: keyboard } };
}

// ✅ 3.xx. Функция для отправки меню генерации видео (/video)
async function sendVideoGenerationMenu(chatId, lastPrompt, isPhotoSaved, isVideoSaved, isAudioSaved, TELEGRAM_BOT_TOKEN, videoParams, isTaskAvailable, previousTaskId, envData) {
    
    // Получаем контент. keyboard здесь: { inline_keyboard: [массив массивов кнопок] }
    const { menuMessage, keyboard } = await getVideoMenuContent(
        chatId, 
        envData.LAST_PHOTO_STORAGE,
        lastPrompt, 
        isPhotoSaved, 
        isVideoSaved, // <-- НОВЫЙ АРГУМЕНТ
        isAudioSaved,
        videoParams,
        isTaskAvailable, // <-- НОВЫЙ ПАРАМЕТР
        previousTaskId // <-- НОВЫЙ ПАРАМЕТР
    );
    
    // ИЗВЛЕКАЕМ ТОЛЬКО МАССИВ МАССИВОВ КНОПОК
    const inlineKeyboardArray = keyboard.inline_keyboard; 
    
    // !!! ИСПРАВЛЕНИЕ: Добавляем return для получения JSON-ответа с message_id
    return await sendMessageWithKeyboard(
        chatId, 
        menuMessage, 
        TELEGRAM_BOT_TOKEN, 
        inlineKeyboardArray 
    );
}

// ✅ 3.xx. Функция для редактирования меню генерации видео
async function editVideoGenerationMenu(chatId, messageId, lastPrompt, isPhotoSaved, isVideoSaved, isAudioSaved, TELEGRAM_BOT_TOKEN, videoParams, isTaskAvailable, previousTaskId, envData) {
    
    // Получаем контент. keyboard здесь: { inline_keyboard: [массив массивов кнопок] }
    const { menuMessage, keyboard } = await getVideoMenuContent(
        chatId, 
        envData.LAST_PHOTO_STORAGE,
        lastPrompt, 
        isPhotoSaved, 
        isVideoSaved, // <-- НОВЫЙ АРГУМЕНТ
        isAudioSaved,
        videoParams,
        isTaskAvailable, // <-- НОВЫЙ ПАРАМЕТР
        previousTaskId // <-- НОВЫЙ ПАРАМЕТР
    );
    
    // ИЗВЛЕКАЕМ ТОЛЬКО МАССИВ МАССИВОВ КНОПОК
    const inlineKeyboardArray = keyboard.inline_keyboard; 

    // !!! ИСПРАВЛЕНИЕ: Добавляем return для получения JSON-ответа
    return await editMessageWithKeyboard(
        chatId, 
        messageId, 
        menuMessage, 
        TELEGRAM_BOT_TOKEN,
        inlineKeyboardArray 
    );
}

// ✅ startVideoGenerationLogic - УНИФИЦИРОВАННАЯ ЛОГИКА ЗАПУСКА ГЕНЕРАЦИИ ВИДЕО (по колбэку)
async function startVideoGenerationLogic(chatId, lastPrompt, workingMessageId, envData, videoParams) { 
    
    // --- 1. ВЫБОР КОНФИГА И ДИНАМИЧЕСКИЕ ПАРАМЕТРЫ (Устойчивое присваивание) ---
    const { seconds, aspectRatio, resolution, mode: currentMode } = videoParams;
    const TELEGRAM_BOT_TOKEN = envData.TELEGRAM_BOT_TOKEN;
    const LAST_PHOTO_STORAGE = envData.LAST_PHOTO_STORAGE;
    const DEBUG_CHAT_ID = envData.DEBUG_CHAT_ID;
    const ctx = envData.ctx; // Используем envData.ctx, как вы указали
    // -------------------------------------------------------------------
    const videoEnabled = envData && envData.VIDEO_ENABLED;
    const token = envData && envData.TELEGRAM_BOT_TOKEN;

    const chatKey = chatId.toString();
    const LAST_IMAGE_KEY = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX; 
    
    // 1. Читаем данные фото
    const rawImageKVData = await LAST_PHOTO_STORAGE.get(LAST_IMAGE_KEY, { type: 'text' });
    
    let photoBase64 = null; 
    let isPhotoAvailable = false;
    
    if (rawImageKVData) {
        try {
            const imageData = JSON.parse(rawImageKVData);
            if (imageData && imageData.base64 && imageData.base64.length > 100) {
                photoBase64 = String(imageData.base64);
                isPhotoAvailable = true;
            }
        } catch (e) {
            if (rawImageKVData.length > 100) {
                photoBase64 = String(rawImageKVData);
                isPhotoAvailable = true;
            }
        }
    }
    
    // 1. Определяем тип сервиса, который нам нужен
    const isImageToVideo = (currentMode === 'I2V'); 
    const isVideoToVideo = (currentMode === 'V2V'); 
    const isAudioToVideo = (currentMode === 'A2V'); 

    let serviceType;
    if (isImageToVideo) {
        serviceType = 'IMAGE_TO_VIDEO';
    } else if (isVideoToVideo) {
        serviceType = 'VIDEO_TO_VIDEO'; 
    } else if (isAudioToVideo) { 
        serviceType = 'AUDIO_TO_VIDEO';
    } else {
        serviceType = 'TEXT_TO_VIDEO'; // По умолчанию
    }

    // 2. Универсальное получение актуальной конфигурации из KV
    const serviceMenuConfig = AI_MODEL_MENU_CONFIG[serviceType];
    const kvKey = serviceMenuConfig.kvKey;
    // Читаем актуальное значение прямо из KV.
    const freshConfigKey = await envData.LAST_PHOTO_STORAGE.get(kvKey);
    const defaultModelKey = Object.keys(serviceMenuConfig.models)[0]; 
    const activeConfigKey = freshConfigKey || defaultModelKey;
    // 3. Получение полного объекта конфигурации из AI_MODELS
    const activeModelConfig = AI_MODELS[activeConfigKey];

    // --- ДАННЫЕ ДЛЯ ВЫЗОВА ---
    const SERVICE_NAME = activeModelConfig.SERVICE; 
    const API_KEY_VALUE = envData[activeModelConfig.API_KEY]; 

    // ПРОВЕРКА НА КРИТИЧЕСКУЮ ОШИБКУ (если вдруг конфиг не найден)
    if (!activeModelConfig || typeof activeModelConfig.FUNCTION !== 'function') {
        const errorMsg = `Критическая ошибка: Конфигурация ${activeConfigKey} не найдена или неверна для ${serviceType}.`;
        await editMessage(chatId, workingMessageId, `❌ ${errorMsg}`, envData.TELEGRAM_BOT_TOKEN);
        return true; 
    }

    // 4. *** ДЕБАГ: СООБЩЕНИЕ О ВЫБОРЕ МОДЕЛИ ***
    const friendlyModelName = serviceMenuConfig.models[activeConfigKey] || activeConfigKey; 
    // УСЛОВИЕ: Текущий пользователь должен быть админом И дебаг должен быть включен
    if (chatId.toString() === envData.ADMIN_CHAT_ID && envData.DEBUG_ENABLED && ctx) {
        const debugMessage = `🧠 AI-Модель для ${serviceType}: ${friendlyModelName}`;
        ctx.waitUntil(sendMessage( 
            chatId, 
            debugMessage, 
            envData.TELEGRAM_BOT_TOKEN
        ));
    } 
    // 5. ПОДГОТОВКА ПРОМПТА И ЗАПУСК
    let finalPrompt = lastPrompt.trim();
        
    // --- ПРОВЕРКА: ЗАГЛУШКА ВИДЕО ---
    if (!videoEnabled) { 
        const disabledMessage = "🎬 **Видео-функция временно отключена администратором.**";
        // Используем sendMessage напрямую с проверенным токеном
        if (token) {
            await sendMessage(chatId, disabledMessage, token); 
        }
        return; 
    }

    // --- 2. ПРОВЕРКА И СПИСАНИЕ БАЛАНСА ДЛЯ ВИДЕО (100 руб. = 20 кредитов) ---
    const videoServiceName = isImageToVideo ? 'видео (I2V)' : (isVideoToVideo ? 'видео (V2V)' : (isAudioToVideo ? 'видео (A2V)' : 'видео (T2V)'));
    // 🛑 ИСПРАВЛЕНО: Используем новую константу:
    const videoCost = COST_VIDEO_CREDIT;

    // 🔥 НОВЫЙ БЛОК: ДИНАМИЧЕСКИЙ РАСЧЕТ СТОИМОСТИ
    const durationInSeconds = parseInt(seconds, 10) || 5;
    const currentResolution = resolution || '480p'; 

    // 1. Рассчитываем "сырую" стоимость (может быть дробной)
    const rawVideoCost = calculatePrice(activeConfigKey, durationInSeconds, currentResolution);

    // 2. Окончательная стоимость: округляем вверх, так как списание всегда идет целыми кредитами
    const finalVideoCost = Math.ceil(rawVideoCost); 

    // 🛑 ВЫЗОВ УНИВЕРСАЛЬНОЙ ФУНКЦИИ
    const balanceCheckResult = await checkAndDeductBalance(
        chatId, 
        LAST_PHOTO_STORAGE, 
        finalVideoCost, // <-- ИСПОЛЬЗУЕМ ДИНАМИЧЕСКУЮ ЦЕНУ
        videoServiceName, 
        envData
    );

    if (!balanceCheckResult.canProceed) {
        // Отменяем выполнение, если баланс недостаточен.
        await editMessage(chatId, workingMessageId, `❌ **Ошибка:** Операция отменена из-за недостатка средств.`, TELEGRAM_BOT_TOKEN);
        return;
    }

    // 🛑 ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ О БАЛАНСЕ
    await sendMessageMarkdown(chatId, balanceCheckResult.balanceMessage, TELEGRAM_BOT_TOKEN);

    // Извлекаем результат для использования в catch-блоке
    const isSubscriptionActive = balanceCheckResult.isSubscriptionActive;
    const balanceBeforeCharge = balanceCheckResult.currentBalance; // Сохраняем для отмены
    const COST_PER_ATTEMPT_VIDEO = balanceCheckResult.cost; // Сохраняем списанную стоимость

    // --- 2. ЗАПУСК ГЕНЕРАЦИИ ---
    try {
        await editMessage(chatId, workingMessageId, `⏳ ** Запускаю асинхронную операцию видео (${SERVICE_NAME})...**`, TELEGRAM_BOT_TOKEN);
        
        let operationResult; // Возвращает Task ID (string) или объект {taskId: string}
        let taskId = null;

        if (isImageToVideo) {
            // РЕЖИМ 1: IMAGE-TO-VIDEO (ОЖИВЛЕНИЕ)
            
            // 🛑 ШАГ 2.1: КОНВЕРТАЦИЯ BASE64 В ПУБЛИЧНЫЙ URL
            const publicImageUrl = await uploadBase64ImageToPublicUrl(photoBase64, envData, chatId); 
            
            operationResult = await activeModelConfig.FUNCTION( 
                activeModelConfig, 
                finalPrompt,
                publicImageUrl, 
                'image/png',
                API_KEY_VALUE, 
                chatId, 
                DEBUG_CHAT_ID, 
                TELEGRAM_BOT_TOKEN,
                envData
            );
            taskId = (typeof operationResult === 'object' && operationResult !== null && operationResult.taskId) 
                     ? operationResult.taskId 
                     : operationResult; // Предполагаем, что T2V/I2V возвращает string
            
        } else if (isVideoToVideo) { 
            // РЕЖИМ 3: VIDEO-TO-VIDEO

            // 🛑 ШАГ 2.1: КОНВЕРТАЦИЯ BASE64 В ПУБЛИЧНЫЙ URL
            const publicImageUrl = await uploadBase64ImageToPublicUrl(photoBase64, envData, chatId); 
            
            // --- ШАГ 1: ПРОВЕРКИ НАЛИЧИЯ ФОТО ---
            if (!publicImageUrl) {
                await editMessage(chatId, workingMessageId, `❌ **Ошибка:** Для режима V2V (Wan Animate) требуется **фото персонажа**. Сначала отправьте фото.`, TELEGRAM_BOT_TOKEN);
                return true;
            }

            // --- ШАГ 2: ПОЛУЧЕНИЕ ДАННЫХ РЕФЕРЕНСНОГО ВИДЕО ИЗ KV ---
            const LAST_VIDEO_KEY = chatKey + LAST_VIDEO_DATA_KEY_SUFFIX; 
            const rawVideoData = await envData.LAST_PHOTO_STORAGE.get(LAST_VIDEO_KEY, { type: 'text' });
            
            if (!rawVideoData) {
                await editMessage(chatId, workingMessageId, `❌ **Ошибка:** В режиме V2V требуется **референсное видео**. Сначала отправьте видео.`, TELEGRAM_BOT_TOKEN);
                return true;
            }
            
            let videoData;
            try {
                videoData = JSON.parse(rawVideoData);
            } catch (e) {
                // Это критическая ошибка, если данные не JSON, как ожидалось
                await editMessage(chatId, workingMessageId, `❌ **Ошибка:** Данные референсного видео в хранилище повреждены (не JSON).`, TELEGRAM_BOT_TOKEN);
                return true;
            }

            // 🎯 ИЗВЛЕЧЕНИЕ URL
            const publicVideoUrl = videoData.url; 

            if (!publicVideoUrl) {
                 await editMessage(chatId, workingMessageId, `❌ **Ошибка:** В данных референсного видео отсутствует поле 'url'.`, TELEGRAM_BOT_TOKEN);
                return true;
            }

            // ШАГ 2: Запуск функции-обработчика (startKieAiVideo2Video)
            operationResult = await activeModelConfig.FUNCTION( 
                activeModelConfig, 
                publicImageUrl, // <-- ФОТО
                publicVideoUrl,  // <-- ВИДЕО
                API_KEY_VALUE,
                chatId, 
                envData
            );
            taskId = (typeof operationResult === 'object' && operationResult !== null && operationResult.taskId) 
                     ? operationResult.taskId 
                     : operationResult;

        } else if (isAudioToVideo) { 
            // РЕЖИМ 4: AUDIO-TO-VIDEO (ОЗВУЧКА АВАТАРА)
            
            // 🛑 ИСХОДНЫЙ КОД: ВЫЗОВ С 5 АРГУМЕНТАМИ
            operationResult = await activeModelConfig.FUNCTION( 
                activeModelConfig, 
                finalPrompt, 
                envData,        // envData теперь правильно попадает в 3-й аргумент
                videoParams, 
                chatId 
            );

            taskId = operationResult ? operationResult.taskId : null;
            
            if (taskId) {
                // --- 3. Уведомление пользователя ---
                await sendMessageMarkdown(
                    chatId, 
                    `🎙️ **Озвучивание аватара запущено!**\n\nМы пришлем вам видео, как только оно будет готово!`,
                    TELEGRAM_BOT_TOKEN
                );

                // --- 4. СОХРАНЕНИЕ СТАТУСА ---
                await saveAndReportSuccess(chatId, taskId, finalPrompt, workingMessageId, LAST_PHOTO_STORAGE, TELEGRAM_BOT_TOKEN, SERVICE_NAME, 'Audio-to-Video', envData); 
            } else {
                 // Если taskId === null, то startKieAiAudio2Video уже отправила сообщение об ошибке (нет фото/аудио)
                 await editMessage(chatId, workingMessageId, `❌ **Ошибка:** Не удалось получить ID задачи от KieAI или не пройдены проверки (нет фото/аудио).`, TELEGRAM_BOT_TOKEN);
            }
            
            return; // Завершаем выполнение, так как логика уведомления и сохранения уже внутри

        } else {
            // РЕЖИМ 2: TEXT-TO-VIDEO (СОЗДАНИЕ С НУЛЯ)
            operationResult = await activeModelConfig.FUNCTION( 
                activeModelConfig, 
                finalPrompt, 
                API_KEY_VALUE, 
                envData, 
                videoParams,
                chatId
            );
             taskId = (typeof operationResult === 'object' && operationResult !== null && operationResult.taskId) 
                     ? operationResult.taskId 
                     : operationResult;
        }

        // --- ОБЩАЯ ЛОГИКА СОХРАНЕНИЯ (Для T2V, I2V, V2V) ---
        if (taskId) {
            const modeName = isImageToVideo ? 'Image-to-Video' : (isVideoToVideo ? 'Video-to-Video' : 'Text-to-Video');
            await saveAndReportSuccess(chatId, taskId, finalPrompt, workingMessageId, LAST_PHOTO_STORAGE, TELEGRAM_BOT_TOKEN, SERVICE_NAME, modeName, envData);
        } else if (!isAudioToVideo) {
             // Если T2V/I2V/V2V вернул null/undefined
             await editMessage(chatId, workingMessageId, `❌ **Ошибка:** Не удалось получить ID задачи от ${SERVICE_NAME}.`, TELEGRAM_BOT_TOKEN);
        }
        

    } catch (errorMessage) {
        // --- !!! ОБРАБОТКА ОШИБКИ И ВОЗВРАТ КРЕДИТА !!! ---
        const BALANCE_KEY = chatKey + '_credit_balance'; // Используем тот же ключ, что и в checkAndDeductBalance
        // Возвращаем кредит, только если нет подписки
        if (!isSubscriptionActive) { 
            await LAST_PHOTO_STORAGE.put(BALANCE_KEY, balanceBeforeCharge.toString(), { expirationTtl: 3600 * 24 * 365 });
            errorMessage += `\n\n✅ **Кредит возвращен** из-за ошибки генерации. У Вас всего (${balanceBeforeCharge} кредитов)`;
        }
        console.error("Video generation failed:", errorMessage);
        await editMessage(chatId, workingMessageId, `❌ *Ошибка запуска ${SERVICE_NAME}:*\n\`${errorMessage.message}\``, TELEGRAM_BOT_TOKEN);
    }
}

/**
 * Сопоставляет тип кадра из KV с соотношением сторон для видео.
 * @param {string} aspectType - 'landscape', 'portrait', 'square'.
 * @returns {string} - '16:9', '3:4', или '1:1'.
 */
function mapAspectTypeToRatio(aspectType) {
    switch (aspectType) {
        case 'landscape':
            return '16:9';
        case 'portrait':
            return '3:4';
        case 'square':
            return '1:1';
        default:
            return '16:9'; // Дефолтное значение
    }
}

// ✅ processUserActivationCommand (Обработка команды активации от пользователя)
/**
 * @param {number} chatId - ID пользователя.
 * @param {string} messageText - Текст сообщения с командой активации (/activate_...).
 * @param {Object} env - Объект окружения.
 */
async function processUserActivationCommand(chatId, messageText, env) {
    const { TELEGRAM_BOT_TOKEN, LAST_PHOTO_STORAGE } = env;
    const chatKey = chatId.toString();
    const BALANCE_KEY = chatKey + '_credit_balance'
    const FREE_LIMIT = 10; // Используется для инициализации баланса новым пользователям
    const VIP_THRESHOLD = 100; // Порог для активации VIP-режима (например, покупка 100+ фото)
    const VIP_BALANCE_VALUE = 999999; // Значение для VIP-аккаунта (чтобы всегда было > VIP_THRESHOLD)

    // 1. Извлечение токена и проверка его существования
    const userToken = messageText.replace('/activate_', '').trim();
    const TOKEN_CREDIT_KEY = 'token_' + userToken;
    const creditsToAddRaw = await LAST_PHOTO_STORAGE.get(TOKEN_CREDIT_KEY);

    if (!creditsToAddRaw) {
        await sendMessageMarkdown(chatId, "❌ **Ошибка активации:** Неверная команда или токен. Пожалуйста, обратитесь к администратору.", TELEGRAM_BOT_TOKEN);
        return;
    }

    // 2. Удаление токена и проверка количества кредитов
    await LAST_PHOTO_STORAGE.delete(TOKEN_CREDIT_KEY);

    const creditsToAdd = parseInt(creditsToAddRaw, 10);
    if (isNaN(creditsToAdd) || creditsToAdd <= 0) {
        await sendMessageMarkdown(chatId, "❌ **Ошибка активации:** Не удалось определить начисленное количество. Сообщите администратору.", TELEGRAM_BOT_TOKEN);
        return;
    }

    // 3. ОБНОВЛЕНИЕ БАЛАНСА (ЛОГИКА НАКОПЛЕНИЯ И VIP)
    let newBalance;
    let messageStatus;

    if (creditsToAdd >= VIP_THRESHOLD) {
        // --- VIP-АКТИВАЦИЯ ---
        newBalance = VIP_BALANCE_VALUE;
        // 🛑 ИСПРАВЛЕНО: Сообщение теперь учитывает унифицированную монетизацию
        messageStatus = `**VIP-доступ** активирован! Все команды (фото и видео) теперь доступны **без ограничений**!`;
    } else {
        // --- НАКОПИТЕЛЬНЫЙ БАЛАНС ---
        let currentBalance = parseInt(await LAST_PHOTO_STORAGE.get(BALANCE_KEY));
        
        // !!! ИСПРАВЛЕННАЯ ЛОГИКА ИНИЦИАЛИЗАЦИИ БАЛАНСА:
        if (isNaN(currentBalance)) {
            // Если баланс не найден (новый пользователь), инициализируем его FREE_LIMIT (10)
            currentBalance = FREE_LIMIT;
        } else if (currentBalance < 0) {
            // Если баланс отрицательный, обнуляем его (защита от ошибок)
            currentBalance = 0; 
        }

        // Если баланс существует и >= 0, он используется как есть.
        newBalance = currentBalance + creditsToAdd;
        // 🔥 ПРИМЕНЕНИЕ СКЛОНЕНИЯ ДЛЯ НОВОГО БАЛАНСА
        const newBalanceWord = pluralize(newBalance, CREDIT_FORMS);
        messageStatus = `Ваш текущий баланс: **${newBalance}** ${newBalanceWord}.`;
    }

    // 4. Сохранение НОВОГО баланса
    await LAST_PHOTO_STORAGE.put(BALANCE_KEY, newBalance.toString(), { expirationTtl: 3600 * 24 * 365 });

    // 🔥 ПРИМЕНЕНИЕ СКЛОНЕНИЯ ДЛЯ НАЧИСЛЕННОЙ СУММЫ
    const addedCreditWord = pluralize(creditsToAdd, CREDIT_FORMS);

    await sendMessageMarkdown(chatId,
        `✅ **Доступ активирован!**\n` +
        `Вы получили **${creditsToAdd}** ${addedCreditWord} баланса для работы с ботом\n` +
        `${messageStatus}\n` +
        `Спасибо за поддержку!`,
        TELEGRAM_BOT_TOKEN
    );
}

// ✅ processPhotoCommand (Image + Text-to-Image) - ИСПОЛЬЗУЕТ ИСХОДНЫЕ РАЗМЕРЫ ИЗ KV
/**
 * @description Обрабатывает команду улучшения фото (/photo), проверяет подписку/баланс, списывает кредит и вызывает генерацию.
 * @param {string} chatId - ID чата.
 * @param {string} TELEGRAM_BOT_TOKEN - Токен Telegram Bot API (из envData).
 * @param {Object} envData - Объект окружения (включая ctx).
 * @param {Object} LAST_PHOTO_STORAGE - KV-биндинг.
 */
async function processPhotoCommand(chatId, TELEGRAM_BOT_TOKEN, envData, LAST_PHOTO_STORAGE) {
 
    // !!! КОНСТАНТЫ КЛЮЧЕЙ KV (предполагаем, что они определены) !!!
    const LAST_PROMPT_KEY_SUFFIX = '_last_prompt';
    const LAST_IMAGE_DATA_KEY_SUFFIX = '_last_image_data';
    
    const chatKey = chatId;
    const promptKey = chatKey + LAST_PROMPT_KEY_SUFFIX;
    const originalImageBase64Key = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX;
    const GENERATION_LOCK_KEY = chatKey + '_generation_in_progress';
    const BALANCE_KEY = chatKey + '_credit_balance';
    const SUBSCRIPTION_END_KEY = chatKey + SUBSCRIPTION_END_KEY_SUFFIX; // <-- НОВЫЙ КЛЮЧ

     // --- 1. КРИТИЧЕСКАЯ ПРОВЕРКА: ЗАГЛУШКА ФОТО ---
     if (!envData.PHOTO_ENABLED) { 
        const disabledMessage = "📷 **Фото-функция временно отключена администратором.**";
        await sendMessage(chatId, disabledMessage, TELEGRAM_BOT_TOKEN);
        return; 
    }

    // 🛑 НОВЫЙ БЛОК: ЕДИНАЯ ПРОВЕРКА И СПИСАНИЕ БАЛАНСА
    const balanceCheckResult = await checkAndDeductBalance(
        chatId, 
        LAST_PHOTO_STORAGE, 
        COST_PHOTO_CREDIT, // 1 единица
        'фото', 
        envData
    );

    if (!balanceCheckResult.canProceed) {
        await LAST_PHOTO_STORAGE.delete(GENERATION_LOCK_KEY);
        return;
    }

    // Извлекаем результат для дальнейшего использования
    const isSubscriptionActive = balanceCheckResult.isSubscriptionActive;
    const balanceBeforeCharge = balanceCheckResult.currentBalance; // Сохраняем для отмены
    
    // 3. ПРОВЕРКА НАЛИЧИЯ ПРОМПТА И ИЗОБРАЖЕНИЯ (Остальная часть остаётся без изменений)
    const userDefinedPrompt = await LAST_PHOTO_STORAGE.get(promptKey);
    const rawImageKVData = await LAST_PHOTO_STORAGE.get(originalImageBase64Key, { type: 'text' });

    // =======================================================
    // !!! БЛОК: ИЗВЛЕЧЕНИЕ BASE64 И РАЗМЕРОВ ИЗ JSON !!! (Без изменений)
    // =======================================================
    let originalImageBase64 = null;
    let photoWidth = 960;
    let photoHeight = 1280; 
    let aspectType = 'portrait';

    envData.ctx.waitUntil(logDebug(
        "KV_READ",
        `Raw KV Data read. Type: ${typeof rawImageKVData}, Length: ${rawImageKVData ? rawImageKVData.length : 'NULL'}`,
        envData
    ));

    if (rawImageKVData) {
        try {
            const imageData = JSON.parse(rawImageKVData);

            if (imageData && imageData.base64) {
                originalImageBase64 = String(imageData.base64);
                
                const storedWidth = parseInt(imageData.width);
                const storedHeight = parseInt(imageData.height);
                aspectType = imageData.aspect_type || aspectType;

                if (!storedWidth || storedWidth <= 0) {
                    if (aspectType === 'landscape') { 
                        photoWidth = 1280;
                        photoHeight = 720;
                    } else if (aspectType === 'square') {
                        photoWidth = 1024;
                        photoHeight = 1024;
                    } else { 
                        photoWidth = 960;
                        photoHeight = 1280;
                    }
                } else {
                    photoWidth = storedWidth;
                    photoHeight = storedHeight;
                }
            } else {
                originalImageBase64 = String(rawImageKVData);
            }
        } catch (e) {
            originalImageBase64 = String(rawImageKVData);
        }
    }

    // ----------------------------------------------------------------------
    // 3. ФИНАЛЬНАЯ ПРОВЕРКА И ОЧИСТКА Base64 (Без изменений)
    // ----------------------------------------------------------------------
    if (originalImageBase64) {
        originalImageBase64 = originalImageBase64.replace(/[\r\n\s]/g, '');
        if (originalImageBase64.includes(',')) {
            originalImageBase64 = originalImageBase64.split(',')[1];
        }
    }

    if (!userDefinedPrompt || !originalImageBase64 || originalImageBase64.length < 100) {
        await sendMessageMarkdown(chatId, `⚠️ **Внимание:** Сначала получите промпт, отправив фотографию.`, TELEGRAM_BOT_TOKEN);
        return;
    }

    // =======================================================
    // !!! БЛОК: ПРЯМОЕ ФОРМИРОВАНИЕ РАЗМЕРА ИЗ KV !!! (Без изменений)
    // =======================================================
    const roundedWidth = Math.round(photoWidth / 8) * 8;
    const roundedHeight = Math.round(photoHeight / 8) * 8;
    const finalWidth = roundedWidth > 0 ? roundedWidth : 960;
    const finalHeight = roundedHeight > 0 ? roundedHeight : 1280;

    envData.ctx.waitUntil(logDebug(
        "ImageSize",
        `Целевой размер для API (ПРЯМОЙ): ${finalWidth}x${finalHeight} (Исходные: ${photoWidth}x${photoHeight})`,
        envData
    ));
    // =======================================================


    // --- УСТАНОВКА LOCK И СПИСАНИЕ ---
    await LAST_PHOTO_STORAGE.put(GENERATION_LOCK_KEY, 'true', { expirationTtl: 60 });

    // 🛑 НОВЫЙ БЛОК: ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ (ВМЕСТО старого шага 3)
    await sendMessageMarkdown(chatId, balanceCheckResult.balanceMessage, TELEGRAM_BOT_TOKEN);

    // 4. Формируем промпт и запускаем генерацию
    const cleanedUserPrompt = userDefinedPrompt.replace(/[\r\n]/g, ' ').replace(/"/g, "'");

    const improvementPrompt = `
    Улучши качество прикрепленного изображения:
    1. **ЦВЕТ И КОЛОРИЗАЦИЯ:** Сделай его **ярким, насыщенным, гиперреалистичным и красочным**. Используй сочные и естественные цвета. **ОБЯЗАТЕЛЬНО** колоризуй изображение, если оно черно-белое.
    2. **Разрешение:** Повысь разрешение до студийного качества, детализируй текстуры.
    3. **Сохранение:** Строго сохрани оригинальные черты лица, позу и композицию. Не изменяй лица.
    4. **Описание сюжета:** ${cleanedUserPrompt}.
    Фокусируйся на **живых цветах** и **кристальной четкости**.
    `;

    const workingMessageResponse = await sendMessageMarkdown(chatId, "⏳ **Запускаю улучшение изображения...**", TELEGRAM_BOT_TOKEN);
    const workingMessageId = workingMessageResponse.ok ? workingMessageResponse.result.message_id : null;

    // --- БЛОК ПЕРЕВОДА (Предполагаем, что функция callWorkersAITranslate определена) ---
    if (workingMessageId) await editMessage(chatId, workingMessageId, "⏳ ** Перевожу промпт для AI...", TELEGRAM_BOT_TOKEN);
    let finalImg2ImgPrompt = improvementPrompt;
    try {
        const translatedText = await callWorkersAITranslate(improvementPrompt.replace(/\*\*/g, '').replace(/\n/g, ' '), envData, 'ru', 'en'); 
        if (translatedText) finalImg2ImgPrompt = translatedText.trim();
    } catch (e) {
        envData.ctx.waitUntil(logDebug("Translation_ERR", `Не удалось перевести промпт. Ошибка: ${e.message}`, envData));
    }
    // ----------------------------------------------------

    try {
        if (workingMessageId) await editMessage(chatId, workingMessageId, "⏳ ** Отправляю на генерацию...", TELEGRAM_BOT_TOKEN);
    
        // УНИВЕРСАЛЬНЫЙ ВЫЗОВ зависит от настроенной в KV модели
        // 1. Определение сервиса и ключа KV - Обязательно
        const serviceType = 'IMAGE_TO_IMAGE'; 
        const serviceMenuConfig = AI_MODEL_MENU_CONFIG[serviceType];
        const kvKey = serviceMenuConfig.kvKey;
        // 2. ДИНАМИЧЕСКОЕ ЧТЕНИЕ АКТУАЛЬНОЙ КОНФИГУРАЦИИ
        const defaultModelKey = Object.keys(serviceMenuConfig.models)[0]; 
        // Читаем актуальное значение прямо из KV. 
        const freshConfigKey = await envData.LAST_PHOTO_STORAGE.get(kvKey);
        // Используем свежий ключ ИЛИ ключ по умолчанию
        const activeConfigKey = freshConfigKey || defaultModelKey;
        // 3. Получение полного объекта конфигурации из AI_MODELS
        const activeModelConfig = AI_MODELS[activeConfigKey];

        // 4. *** ДЕБАГ: СООБЩЕНИЕ О ВЫБОРЕ МОДЕЛИ ***
        // Получаем красивое имя модели для дебага
        const friendlyModelName = serviceMenuConfig.models[activeConfigKey] || activeConfigKey; 
        // УСЛОВИЕ: Текущий пользователь должен быть админом И дебаг должен быть включен
        if (chatId.toString() === envData.ADMIN_CHAT_ID && envData.DEBUG_ENABLED) {
            const debugMessage = `🧠 AI-Модель для ${serviceType}: ${friendlyModelName}`;
            envData.ctx.waitUntil(sendMessage(
                chatId, // Отправляем в текущий чат
                debugMessage, 
                envData.TELEGRAM_BOT_TOKEN
            ));
        } // Если chatId не совпадает с ADMIN_CHAT_ID, сообщение пропускается.

        // --- 5. *** ДИНАМИЧЕСКИЙ ВЫЗОВ И ОБРАБОТКА ***
        // Получаем конфигурацию сервиса
        const service = activeModelConfig.SERVICE;

        // 5.1. Вызов функции генерации
        const generatedResult = await activeModelConfig.FUNCTION(
            activeModelConfig, // Передаем объект, содержащий MODEL, BASE_URL, API_KEY, etc.
            finalImg2ImgPrompt,
            originalImageBase64,
            envData,
            photoHeight, 
            photoWidth,
            chatId
        );
        // ✅ ОТПРАВКА ПРОМЕЖУТОЧНОГО СООБЩЕНИЯ
        const processingMessage = await editMessage(
            chatId, 
            workingMessageId,
            `⏳ **Выполняется генерация изображения**...\nПроцесс может занять до 45 секунд. Пожалуйста, подождите.`,
            TELEGRAM_BOT_TOKEN
        );
        // 5.2. Проверка сервиса для определения типа возвращаемого значения (ArrayBuffer или Task ID)
        if (service === 'KIEAI') {
            // KIE.AI (и другие Callback-сервисы) возвращают Task ID (строка). 
            if (generatedResult) {
                // Задача успешно запущена. Выходим, ожидая Callback.
                // Финальное сообщение "✅ Готово!" будет отправлено в обработчике Callback'а.
                //if (workingMessageId) await editMessage(chatId, workingMessageId, `⏳ **Ожидаем Callback от ${service}...**`, TELEGRAM_BOT_TOKEN);
                return; 
            } else {
                // Задача не была запущена (произошла внутренняя ошибка в activeModelConfig.FUNCTION)
                // Сообщение об ошибке уже должно быть отправлено внутри activeModelConfig.FUNCTION.
                if (workingMessageId) await editMessage(chatId, workingMessageId, `❌ **Критическая ошибка запуска**`, TELEGRAM_BOT_TOKEN);
                return;
            }
        } 
        // 5.3. Обработка синхронных сервисов (Workers AI, Gemini, Bothub, Kandinsky, и т.д.)
        else {
            // Синхронные сервисы возвращают ArrayBuffer.
            // Проверяем, что результат действительно является буфером
            const generatedImageBuffer = generatedResult; 
            if (!(generatedImageBuffer instanceof ArrayBuffer)) {
                await sendMessage(chatId, `❌ **Ошибка:** ${service} не вернул ArrayBuffer.`, TELEGRAM_BOT_TOKEN);
                if (workingMessageId) await editMessage(chatId, workingMessageId, `❌ **Ошибка**`, TELEGRAM_BOT_TOKEN);
                return;
            }

            if (workingMessageId) await editMessage(chatId, workingMessageId, "✅ ** Изображение сгенерировано.**", TELEGRAM_BOT_TOKEN);

            // 5.4. Отправка финального изображения
            const finalCaption = `✅ Ваша улучшенная фотография`;
            const numericChatId = parseInt(chatId);
            
            // 🛑 ОТПРАВКА СИНХРОННОГО РЕЗУЛЬТАТА
            await sendPhotoWithCaption(numericChatId, generatedImageBuffer, finalCaption, TELEGRAM_BOT_TOKEN, envData);

            if (workingMessageId) await editMessage(chatId, workingMessageId, `✅ **Готово!**`, TELEGRAM_BOT_TOKEN);
        }
    } catch (e) {
        // --- !!! ОБРАБОТКА ОШИБКИ И ВОЗВРАТ КРЕДИТА !!! ---
        const BALANCE_KEY = chatKey + '_credit_balance';
        const safeErrorMessage = e.message || 'Неизвестная ошибка: Проверьте логи Cloudflare.';

        let errorMessage = `❌ Критическая ошибка генерации: ${safeErrorMessage}.`;

        // Используем isSubscriptionActive и balanceBeforeCharge, полученные ранее.
        if (!isSubscriptionActive) { 
            // Возвращаем старый баланс (до списания)
            await LAST_PHOTO_STORAGE.put(BALANCE_KEY, balanceBeforeCharge.toString(), { expirationTtl: 3600 * 24 * 365 });
            errorMessage += `\n\n✅ **Кредит возвращен** из-за ошибки генерации. У Вас всего (${balanceBeforeCharge} кредитов)`;
        }

        const errorString = `❌ Критическая ошибка генерации: ${e.message}`;
        await logDebug("CRITICAL", errorString, envData);

        if (workingMessageId) await editMessage(chatId, workingMessageId, errorMessage, TELEGRAM_BOT_TOKEN);
    } finally {
        await LAST_PHOTO_STORAGE.delete(GENERATION_LOCK_KEY);
    }
}

// ✅ *** processUpscaleGenerateCommand (Финальный запуск I2U или V2U) ***
/**
 * @description Обрабатывает команду запуска апскейла (I2U или V2U), выполняет
 * проверки, списывает кредит и вызывает генерацию через динамическую функцию.
 * @param {string} mode - 'IMAGE_TO_UPSCALE' или 'VIDEO_TO_UPSCALE'.
 * @param {string} chatId - ID чата.
 * @param {Object} envData - Объект окружения (включая ctx и token).
 * @param {Object} LAST_PHOTO_STORAGE - KV-биндинг.
 * @param {string} rawTaskData - JSON-строка с данными о задании (для V2U), или null/undefined для I2U.
 */
async function processUpscaleGenerateCommand(mode, chatId, envData, LAST_PHOTO_STORAGE, rawTaskData) {
    
    const TELEGRAM_BOT_TOKEN = envData.TELEGRAM_BOT_TOKEN;
    const isImageMode = mode === 'IMAGE_TO_UPSCALE';

    // --- ГЛОБАЛЬНЫЕ КОНСТАНТЫ (предполагаются) ---
    const LAST_PROMPT_KEY_SUFFIX = '_last_prompt';
    const LAST_IMAGE_DATA_KEY_SUFFIX = '_last_image_data';
    const LAST_VIDEO_DATA_KEY_SUFFIX = '_last_video_data';
    const GENERATION_LOCK_KEY = chatId.toString() + '_generation_in_progress';
    const VIDEO_PARAMS_KEY_SUFFIX = '_video_params'; 
    
    // 1. ОПРЕДЕЛЕНИЕ КЛЮЧЕЙ И КОНФИГУРАЦИЙ
    const chatKey = chatId;
    const promptKey = chatKey + LAST_PROMPT_KEY_SUFFIX;
    const mediaDataKey = isImageMode ? (chatKey + LAST_IMAGE_DATA_KEY_SUFFIX) : (chatKey + LAST_VIDEO_DATA_KEY_SUFFIX);
    const serviceType = isImageMode ? 'IMAGE_TO_UPSCALE' : 'VIDEO_TO_UPSCALE'; 
    const COST_UNIT = isImageMode ? 1 : 1; 
    const costName = isImageMode ? 'улучшение качества фото' : 'улучшение качества видео';

    // --- 1.1. ИНТЕГРАЦИЯ V2U: Task ID ---
    let previousTaskId = null;
    if (!isImageMode && rawTaskData) { 
        try {
            const taskData = JSON.parse(rawTaskData);
            previousTaskId = taskData.taskId; 
        } catch (e) {
            console.error("V2U Error parsing rawTaskData:", e.message);
        }
    }
    // ------------------------------------------

    // --- 2. КРИТИЧЕСКАЯ ПРОВЕРКА: ЗАГЛУШКА И ЛОК ---
    if (isImageMode && !envData.PHOTO_ENABLED) { 
        await sendMessage(chatId, "📈 **Функция I2U временно отключена.**", TELEGRAM_BOT_TOKEN);
        return; 
    }
    if (!isImageMode && !envData.VIDEO_ENABLED) { 
        await sendMessage(chatId, "📺 **Функция V2U временно отключена.**", TELEGRAM_BOT_TOKEN);
        return; 
    }
    
    // --- 3. ЧТЕНИЕ КОНФИГУРАЦИИ МОДЕЛИ ---
    const serviceMenuConfig = AI_MODEL_MENU_CONFIG[serviceType]; 
    const kvModelKey = serviceMenuConfig.kvKey;
    const defaultModelKey = Object.keys(serviceMenuConfig.models)[0];
    const freshConfigKey = await LAST_PHOTO_STORAGE.get(kvModelKey);
    const activeConfigKey = freshConfigKey || defaultModelKey;
    const activeModelConfig = AI_MODELS[activeConfigKey];

    let finalCost = COST_UNIT;
    let currentQuality = null;
    let currentDuration = null;

    if (!isImageMode) {
        // --- ЛОГИКА V2U: ПЕРЕСЧЕТ ЦЕНЫ НА ОСНОВЕ ПАРАМЕТРОВ ---
        const VIDEO_PARAMS_KEY = chatKey + VIDEO_PARAMS_KEY_SUFFIX;
        const paramsRaw = await LAST_PHOTO_STORAGE.get(VIDEO_PARAMS_KEY);
        let videoParams = paramsRaw ? JSON.parse(paramsRaw) : {};

        currentQuality = videoParams.quality || '720p'; 
        currentDuration = parseInt(videoParams.duration, 10) || 5; 
        
        // 🔑 ИСПРАВЛЕННАЯ ЛОГИКА ЦЕНООБРАЗОВАНИЯ ДЛЯ СТАТИЧЕСКОЙ ЦЕНЫ
        if (typeof activeModelConfig.pricing === 'number') {
            finalCost = activeModelConfig.pricing; // Статическая цена (10 кредитов)
        } else {
            const pricePerSecond = activeModelConfig.pricing[currentQuality] || 0; 
            finalCost = pricePerSecond * currentDuration; // Цена в секундах * длительность
        }
    } else {
        // --- ЛОГИКА I2U: ФИКСИРОВАННАЯ ЦЕНА ---
        finalCost = activeModelConfig.pricing;
    }

    // --- 4. ПРОВЕРКА И СПИСАНИЕ БАЛАНСА ---
    const balanceCheckResult = await checkAndDeductBalance(
        chatId, 
        LAST_PHOTO_STORAGE, 
        finalCost, 
        costName, 
        envData
    );

    if (!balanceCheckResult.canProceed) {
        await LAST_PHOTO_STORAGE.delete(GENERATION_LOCK_KEY);
        return;
    }

    const isSubscriptionActive = balanceCheckResult.isSubscriptionActive;
    const balanceBeforeCharge = balanceCheckResult.currentBalance;

    // --- 5. ЧТЕНИЕ ДАННЫХ ---
    const userDefinedPrompt = await LAST_PHOTO_STORAGE.get(promptKey);
    const rawMediaKVData = await LAST_PHOTO_STORAGE.get(mediaDataKey, { type: 'text' });
    
    let originalBase64 = null;
    let mediaWidth = 880;
    let mediaHeight = 1176;
    let aspectType = 'portrait';
    
    // !!! БЛОК: ИЗВЛЕЧЕНИЕ BASE64 И РАЗМЕРОВ ИЗ JSON !!!
    if (rawMediaKVData) {
        try {
            const mediaData = JSON.parse(rawMediaKVData);
            if (mediaData && mediaData.base64) {
                originalBase64 = String(mediaData.base64);
                mediaWidth = parseInt(mediaData.width) || mediaWidth;
                mediaHeight = parseInt(mediaData.height) || mediaHeight;
                aspectType = mediaData.aspect_type || aspectType;
            } else {
                originalBase64 = String(rawMediaKVData);
            }
        } catch (e) {
            originalBase64 = String(rawMediaKVData);
        }
    }
    if (originalBase64) originalBase64 = originalBase64.replace(/[\r\n\s]/g, '').split(',')[1] || originalBase64;
    // -------------------------------------------------------------

    // --- 5.1. ИСПРАВЛЕННАЯ ПРОВЕРКА НАЛИЧИЯ ДАННЫХ (для I2U и V2U) ---
    const isV2UMediaMissing = !isImageMode && !previousTaskId;
    const isI2UMediaMissing = isImageMode && (!originalBase64 || originalBase64.length < 100);

    if (!userDefinedPrompt || isV2UMediaMissing || isI2UMediaMissing) {
        let missing = '';
        
        if (isV2UMediaMissing) {
            missing = 'Task ID';
        } else if (isI2UMediaMissing) {
            missing = 'фотографию';
        }

        if (!userDefinedPrompt) {
            missing = missing ? `${missing} и промпт` : 'промпт';
        }

        await sendMessageMarkdown(chatId, `⚠️ **Внимание:** Сначала загрузите ${missing}.`, TELEGRAM_BOT_TOKEN);
        await LAST_PHOTO_STORAGE.delete(GENERATION_LOCK_KEY);
        return;
    }
    // -------------------------------------------------------------
    
    // 6. ФОРМИРОВАНИЕ РАЗМЕРОВ И ПРОМПТА
    const roundedWidth = Math.round(mediaWidth / 8) * 8;
    const roundedHeight = Math.round(mediaHeight / 8) * 8;
    const finalWidth = roundedWidth > 0 ? roundedWidth : 960;
    const finalHeight = roundedHeight > 0 ? roundedHeight : 1280;
    
    const basePrompt = isImageMode ? DEFAULT_IMAGE_PROMPT : DEFAULT_VIDEO_PROMPT; 
    const improvementPrompt = `
        ${basePrompt}
        4. Описание сюжета: ${userDefinedPrompt.replace(/[\r\n]/g, ' ').replace(/"/g, "'")}.
    `;

    // --- УСТАНОВКА LOCK И УВЕДОМЛЕНИЕ ---
    await LAST_PHOTO_STORAGE.put(GENERATION_LOCK_KEY, 'true', { expirationTtl: 60 });
    await sendMessageMarkdown(chatId, balanceCheckResult.balanceMessage, TELEGRAM_BOT_TOKEN);
    const workingMessageResponse = await sendMessageMarkdown(chatId, `⏳ **Запускаю улучшение качества ${isImageMode ? 'изображения' : 'видео'}...**`, TELEGRAM_BOT_TOKEN);
    const workingMessageId = workingMessageResponse.ok ? workingMessageResponse.result.message_id : null;

    // --- 7. ПЕРЕВОД ПРОМПТА ---
    if (workingMessageId) await editMessage(chatId, workingMessageId, "⏳ ** Перевожу промпт для AI...", TELEGRAM_BOT_TOKEN);
    let finalPrompt = improvementPrompt;
    try {
        const translatedText = await callWorkersAITranslate(improvementPrompt.replace(/\*\*/g, '').replace(/\n/g, ' '), envData, 'ru', 'en'); 
        if (translatedText) finalPrompt = translatedText.trim();
    } catch (e) {
        // ... (логирование ошибки)
    }
    // ----------------------------------------------------

    try {
        if (workingMessageId) await editMessage(chatId, workingMessageId, "⏳ ** Отправляю на генерацию...", TELEGRAM_BOT_TOKEN);

        // --- 8. *** ДИНАМИЧЕСКИЙ ВЫЗОВ ФУНКЦИИ (ИСПРАВЛЕНО) ***
        let generatedResult;

        if (isImageMode) {
            // ЛОГИКА I2U: (7 аргументов: Config, Prompt, Base64, Env, H, W, ChatID)
            generatedResult = await activeModelConfig.FUNCTION(
                activeModelConfig, 
                finalPrompt, 
                originalBase64,
                envData,
                finalHeight, 
                finalWidth,
                chatId
            );
        } else {
            // ЛОГИКА V2U: (6 аргументов: Config, TaskID, Scale, APIKey, ChatID, Env)
            const scaleFactor = '4x';
            const apiKey = envData.KIEAI_API_KEY; 
            
            generatedResult = await activeModelConfig.FUNCTION(
                activeModelConfig, 
                previousTaskId, // <-- Task ID
                scaleFactor, 
                apiKey,
                chatId, 
                envData 
            );
        }
        
        // --- 9. ОБРАБОТКА РЕЗУЛЬТАТА ---
        const service = activeModelConfig.SERVICE;
        if (service === 'KIEAI' || service === 'RUNWAY') {
            if (workingMessageId) await editMessage(chatId, workingMessageId, `⏳ **Ожидаем Callback от ${service}...**`, TELEGRAM_BOT_TOKEN);
            return;
        } else {
            const generatedImageBuffer = generatedResult; 
            
            if (generatedImageBuffer instanceof ArrayBuffer) {
                const finalCaption = isImageMode ? `✅ Ваша фотография с улучшенным качеством` : `✅ Ваше видео с улучшенным качеством`;
                await sendPhotoWithCaption(parseInt(chatId), generatedImageBuffer, finalCaption, TELEGRAM_BOT_TOKEN, envData);
                if (workingMessageId) await editMessage(chatId, workingMessageId, `✅ **Готово!**`, TELEGRAM_BOT_TOKEN);
            } else {
                if (workingMessageId) await editMessage(chatId, workingMessageId, `❌ **Ошибка:** ${service} не вернул ArrayBuffer.`, TELEGRAM_BOT_TOKEN);
            }
        }
    } catch (e) {
        // --- !!! ОБРАБОТКА ОШИБКИ И ВОЗВРАТ КРЕДИТА !!! ---
        const BALANCE_KEY = chatKey + '_credit_balance';
        let errorMessage = `❌ Критическая ошибка генерации: ${e.message}.`;
        
        if (!isSubscriptionActive) { 
            await LAST_PHOTO_STORAGE.put(BALANCE_KEY, balanceBeforeCharge.toString(), { expirationTtl: 3600 * 24 * 365 });
            errorMessage += `\n✅ **Кредит возвращен** из-за ошибки. У Вас всего (${balanceBeforeCharge} кредитов)`;
        }
        if (workingMessageId) await editMessage(chatId, workingMessageId, errorMessage, TELEGRAM_BOT_TOKEN);
    } finally {
        await LAST_PHOTO_STORAGE.delete(GENERATION_LOCK_KEY);
        return;
    }
}

// Вспомогательная функция для сохранения статуса и редактирования сообщения
async function saveAndReportSuccess(chatId, operationName, finalPrompt, workingMessageId, LAST_PHOTO_STORAGE, TELEGRAM_BOT_TOKEN, serviceType, operationType, envData) {
    
    // 🛑 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: ЭКСПЛИЦИТНОЕ СОХРАНЕНИЕ TASK ID ДЛЯ МЕНЮ И /CHECKVIDEO

    const chatKey = chatId.toString();
    // ПРИМЕЧАНИЕ: LAST_ACTIVE_TASK_KEY_SUFFIX ДОЛЖЕН БЫТЬ ГЛОБАЛЬНОЙ КОНСТАНТОЙ
    const LAST_ACTIVE_TASK_KEY = chatKey + LAST_ACTIVE_VIDEO_KEY_SUFFIX; 
    
    // Создаем объект с данными
    const activeTaskData = {
        taskId: operationName,
        // modelConfig и apiKey необходимы для handleCheckVideoCommand
        modelConfig: { 
            // Получаем BASE_URL, как в handleCheckVideoCommand (ваша логика)
            BASE_URL: envData.KIEAI_BASE_URL || (envData.AI_MODELS.TEXT_TO_VIDEO_KIEAI || {}).BASE_URL || 'https://api.kie.ai/api/v1',
        }, 
        apiKey: envData.KIEAI_API_KEY, 
        functionName: 'kieAiApiPolling', // Добавляем, чтобы соответствовать структуре
    };
    
    // 3. Сохраняем Task ID под ключом, который ищет меню V2V и /checkvideo.
    // Устанавливаем TTL 1 час (3600 сек) на случай сбоя, чтобы ключ не остался навсегда.
    await LAST_PHOTO_STORAGE.put(LAST_ACTIVE_TASK_KEY, JSON.stringify(activeTaskData), { expirationTtl: 3600 }); 

    const pollData = {
        operationName: operationName,
        startTime: Date.now(),
        workingMessageId: workingMessageId,
        prompt: finalPrompt,
        service: serviceType,
        type: operationType 
    };
    // Эта функция сохраняет под chatId.toString(), что не мешает нашему ключу с суффиксом.
    await savePollData(chatId, pollData, LAST_PHOTO_STORAGE); 
   
    const idDisplay = `*Job ID (${serviceType}):* \`${operationName}\``;
    await editMessage(chatId, workingMessageId,
        `🟢 **Ваш запрос направлен:** сервис (${operationType})\n\n` +
        `${idDisplay}\n\n` +
        `Генерация займет 5-10 минут. И по готовности будет доставлено автоматически.`,
        TELEGRAM_BOT_TOKEN
    );
}

// ✅ ФУНКЦИЯ ПРОВЕРКИ СТАТУСА (Унифицировано для BotHub)
async function processCheckVideoCommand(chatId, envData) {
    const { LAST_PHOTO_STORAGE, BOTHUB_API_KEY, TELEGRAM_BOT_TOKEN } = envData; // Используем только BOT_HUB_API_KEY

    const pollData = await getPollData(chatId, LAST_PHOTO_STORAGE);
    if (!pollData) {
        await sendMessage(chatId, "⚠️ Нет активных операций генерации видео BotHub. Вы можете запустить новую, используя команду `/video [промпт]`.", TELEGRAM_BOT_TOKEN);
        return;
    }

    const { operationName, startTime, workingMessageId, prompt, service, type } = pollData;
    const timeElapsed = Math.floor((Date.now() - startTime) / 1000);
    const serviceName = service || 'BotHub';
    const operationType = type || 'Video'; // Для обратной совместимости

    const idDisplay = `Job ID: \`${operationName}\``;

    // 1. Обновляем существующее сообщение
    await editMessage(chatId, workingMessageId,
        `🔄 *Проверяю статус видео...* (${serviceName} / ${operationType})\n` +
        `${idDisplay}\n` +
        `Прошло времени: ${timeElapsed} секунд.`,
        TELEGRAM_BOT_TOKEN
    );

    try {
        // 2. Проверяем статус через BotHub API
        const pollUrl = `https://api.bothub.chat/api/v1/video/status?job_id=${operationName}`;
        const authHeader = { 'Authorization': `Bearer ${BOTHUB_API_KEY}` };

        const pollResponse = await fetch(pollUrl, { headers: authHeader });
        
        if (!pollResponse.ok) {
            await editMessage(chatId, workingMessageId, `❌ Ошибка проверки статуса BotHub (HTTP ${pollResponse.status}). Попробуйте позже.`, TELEGRAM_BOT_TOKEN);
            await LAST_PHOTO_STORAGE.delete(chatId.toString());
            return;
        }

        const videoOperation = await pollResponse.json();

        // 3. Обработка результата BotHub
        const status = videoOperation.status;
        const isDone = (status === 'completed');
        const isError = (status === 'failed' || status === 'error');
        const videoUri = videoOperation.video_url; 
        const errorMessage = videoOperation.error_message || JSON.stringify(videoOperation.error);
        
        // --- ОБЩАЯ ЛОГИКА ОТВЕТА ---
        if (isDone) {
            if (videoUri) {
                const caption = `🎬 **Видео готово!** (${serviceName})\n\n*Промпт:*\n\`${prompt}\``;

                await sendVideo(chatId, videoUri, TELEGRAM_BOT_TOKEN, caption);
                await editMessage(chatId, workingMessageId, `✅ Готово! Видео отправлено.`, TELEGRAM_BOT_TOKEN);
            } else {
                 await editMessage(chatId, workingMessageId, `❌ *BotHub Ошибка:* Не удалось получить URL видео, хотя статус 'completed'.`, TELEGRAM_BOT_TOKEN);
            }
            await LAST_PHOTO_STORAGE.delete(chatId.toString());

        } else if (isError) {
             await editMessage(chatId, workingMessageId, `❌ *BotHub Ошибка:*\n<code>${errorMessage}</code>`, TELEGRAM_BOT_TOKEN);
             await LAST_PHOTO_STORAGE.delete(chatId.toString());
        } else {
            // ЕЩЕ НЕ ГОТОВО
            await editMessage(chatId, workingMessageId,
                `⏳ *Генерация BotHub продолжается...*\n` +
                `Прошло времени: ${timeElapsed} секунд. Пожалуйста, повторите команду /checkvideo через 60 секунд.`,
                TELEGRAM_BOT_TOKEN
            );
        }

    } catch (e) {
        console.error("Check video failed:", e);
        await editMessage(chatId, workingMessageId, `❌ Критическая ошибка при проверке: <code>${e.message}</code>`, TELEGRAM_BOT_TOKEN);
        await LAST_PHOTO_STORAGE.delete(chatId.toString());
    }
}

// АСИНХРОННЫЕ ОБРАБОТЧИКИ ВИДЕО

// --- НОВАЯ ФУНКЦИЯ: transcribeVideoFileAsync (Только VTT/Транскрибация) ---
async function transcribeVideoFileAsync(chatId, fileId, envData, ctx) {
    let loadingMessageId;
    let transcribedText = '';
    const token = envData.TELEGRAM_BOT_TOKEN;

    try {
        // 1. Загрузка конфигурации VTT (Video-to-Text)
        // Вспомогательная функция для динамической загрузки (чтобы не дублировать код 3 раза)
        const _loadActiveConfig = async (serviceType) => {
            const serviceMenuConfig = AI_MODEL_MENU_CONFIG[serviceType];
            const kvKey = serviceMenuConfig.kvKey;
            
            const freshConfigKey = await envData.LAST_PHOTO_STORAGE.get(kvKey);
            const defaultModelKey = Object.keys(serviceMenuConfig.models)[0]; 
            const activeConfigKey = freshConfigKey || defaultModelKey;
            
            const activeConfig = AI_MODELS[activeConfigKey];
            
            // Возвращаем полную информацию для использования и дебага
            return { 
                config: activeConfig, 
                friendlyName: serviceMenuConfig.models[activeConfigKey] || activeConfigKey,
                activeKey: activeConfigKey
            };
        };

        const vttResult = await _loadActiveConfig('VIDEO_TO_TEXT');
        const v2tConfig = vttResult.config;

        if (!v2tConfig) {
            throw new Error(`Критическая ошибка: Не найдена конфигурация VTT (V2T) с ключом ${vttResult.activeKey}`);
        }

        // 2. Отправляем сообщение "Обработка..."
        const loadingMessage = await sendMessageMarkdown(chatId, "🎧 **Начинаю транскрибацию видеофайла...**", token);
        if (!loadingMessage.ok || !loadingMessage.result) return;
        loadingMessageId = loadingMessage.result.message_id;

        // 3. Получаем путь и скачиваем файл
        const filePath = await getTelegramFilePath(fileId, token);
        const videoBuffer = await downloadTelegramFile(filePath, token);

        // 4. [VTT] Распознавание речи:
        transcribedText = await v2tConfig.FUNCTION(
            v2tConfig,
            videoBuffer, 
            envData
        );

        // 5. [Telegram] Финальное сообщение: ТРАНСКРИБАЦИЯ
        await editMessage(
            chatId, 
            loadingMessageId, 
            `✅ **Транскрибация завершена**\n\nВ видео-файле говорится:\n\`\`\`\n${transcribedText}\n\`\`\``, 
            token
        );

    } catch (error) {
        // Логика обработки ошибок
        const errorMessage = (error.message || "Неизвестная ошибка VTT").substring(0, 1000);
        let finalMessage = `❌ **Ошибка транскрибации:**\n\`${errorMessage}\``;

        if (loadingMessageId) {
            await editMessage(chatId, loadingMessageId, finalMessage, token);
        } else {
            await sendMessage(chatId, finalMessage, token);
        }
    }
}

// --- НОВАЯ ФУНКЦИЯ: analyzeVideoContentAsync (Составление описаний к видео (Video Captioning)) ---
async function analyzeVideoContentAsync(chatId, videoFileId, videoMimeType, envData, ctx) {
    let loadingMessageId;
    let analysisText = '';
    const token = envData.TELEGRAM_BOT_TOKEN;

    try {
        // 1. Загрузка конфигурации VTTA (Video-to-Analysis)
        // Вспомогательная функция для динамической загрузки (чтобы не дублировать код 3 раза)
        const _loadActiveConfig = async (serviceType) => {
            const serviceMenuConfig = AI_MODEL_MENU_CONFIG[serviceType];
            const kvKey = serviceMenuConfig.kvKey;
            
            const freshConfigKey = await envData.LAST_PHOTO_STORAGE.get(kvKey);
            const defaultModelKey = Object.keys(serviceMenuConfig.models)[0]; 
            const activeConfigKey = freshConfigKey || defaultModelKey;
            
            const activeConfig = AI_MODELS[activeConfigKey];
            
            // Возвращаем полную информацию для использования и дебага
            return { 
                config: activeConfig, 
                friendlyName: serviceMenuConfig.models[activeConfigKey] || activeConfigKey,
                activeKey: activeConfigKey
            };
        }
        const videoAnalysisResult = await _loadActiveConfig('VIDEO_TO_ANALYSIS');
        const videoAnalysisConfig = videoAnalysisResult.config;

        if (!videoAnalysisConfig) {
            throw new Error(`Критическая ошибка: Не найдена конфигурация VTTA (V2TA) с ключом ${videoAnalysisResult.activeKey}`);
        }

        // 2. Отправляем сообщение "Обработка..."
        const loadingMessage = await sendMessageMarkdown(chatId, "👀 **Начинаю аналитику видеофайла...**", token);
        if (!loadingMessage.ok || !loadingMessage.result) return;
        loadingMessageId = loadingMessage.result.message_id;

        // 3. Получаем путь и скачиваем файл
        const filePath = await getTelegramFilePath(videoFileId, token);
        const videoBuffer = await downloadTelegramFile(filePath, token);

        // 4. [Video Analysis] Вызов сервиса
        const analysisText = await videoAnalysisConfig.FUNCTION(
            videoAnalysisConfig,
            videoBuffer,
            videoMimeType,
            envData
        );
        // analysisText должен быть текстом (например: "На ролике человек бежит по парку...")

        // 5. [Telegram] Финальное сообщение: АНАЛИТИКА
        await editMessage(
            chatId, 
            loadingMessageId, 
            `✅ **Видеоаналитика завершена**\n\nВ видео-файле описывается:\n\`\`\`\n${analysisText}\n\`\`\``, 
            token
        );

    } catch (error) {
        // Логика обработки ошибок
        const errorMessage = (error.message || "Неизвестная ошибка VTTA").substring(0, 1000);
        let finalMessage = `❌ **Ошибка видеоаналитики:**\n\`${errorMessage}\``;

        if (loadingMessageId) {
            await editMessage(chatId, loadingMessageId, finalMessage, token);
        } else {
            await sendMessage(chatId, finalMessage, token);
        }
    }
}

// АСИНХРОННЫЕ ОБРАБОТЧИКИ ГОЛОСА

// --- ФУНКЦИЯ processVoiceMessageAsync (Voice-to-Text) ---
async function processVoiceMessageAsync(chatId, fileId, envData, ctx) {
    let loadingMessageId;
    let botReplyText = '';
    let transcribedText = '';
    const token = envData.TELEGRAM_BOT_TOKEN;

    // Конфигурации
    const isTtsEnabled = envData.TTS_ENABLED; // Флаг TTS остается

    // --- ДИНАМИЧЕСКАЯ ЗАГРУЗКА КОНФИГУРАЦИЙ ИЗ KV ---
    const _loadActiveConfig = async (serviceType) => {
        const serviceMenuConfig = AI_MODEL_MENU_CONFIG[serviceType];
        const kvKey = serviceMenuConfig.kvKey;
        
        const freshConfigKey = await envData.LAST_PHOTO_STORAGE.get(kvKey);
        const defaultModelKey = Object.keys(serviceMenuConfig.models)[0]; 
        const activeConfigKey = freshConfigKey || defaultModelKey;
        
        const activeConfig = AI_MODELS[activeConfigKey];

        return { 
            config: activeConfig, 
            friendlyName: serviceMenuConfig.models[activeConfigKey] || activeConfigKey,
            activeKey: activeConfigKey
        };
    };
    // 🛑 ИСПРАВЛЕНИЕ: Определяем дефолтный голос для VTV
    const DEFAULT_TTS_VOICE = 'Male';
    // Загружаем все четыре конфигурации параллельно для скорости
    const [ttsResult, ttcResult, sttResult] = await Promise.all([
        _loadActiveConfig('TEXT_TO_AUDIO'), 
        _loadActiveConfig('TEXT_TO_TEXT'),  
        _loadActiveConfig('AUDIO_TO_TEXT'), 
    ]);

    const t2aConfig = ttsResult.config; 
    const textToTextConfig = ttcResult.config;
    const a2tConfig = sttResult.config; 

    // --- ПРОВЕРКА КРИТИЧЕСКИХ ОШИБОК И ДЕБАГ (остается без изменений) ---
    if (!a2tConfig || !textToTextConfig || !t2aConfig) {
        throw new Error(`Критическая ошибка: Не найдена одна из конфигураций: A2T(${sttResult.activeKey}), T2T(${ttcResult.activeKey}), T2A(${ttsResult.activeKey})`);
    }
    if (chatId.toString() === envData.ADMIN_CHAT_ID && envData.DEBUG_ENABLED && ctx) {
        let debugMessage = `🧠 AI-Модели процесса Voice-to-Voice:\n`;
        debugMessage += `  - T2T (Чат): \`${ttcResult.friendlyName}\`\n`;
        debugMessage += `  - STT (Распознавание): \`${sttResult.friendlyName}\`\n`;
        debugMessage += `  - TTS (Озвучка): \`${ttsResult.friendlyName}\`\n`;
        
        envData.ctx.waitUntil(sendMessageMarkdown(chatId, debugMessage, token));
    }

    try {
        // 1-5. STT и редактирование сообщения (остается без изменений)
        const loadingMessage = await sendMessageMarkdown(chatId, "🎙️ **Обработка голосового сообщения...**", token);
        if (!loadingMessage.ok || !loadingMessage.result) return;
        loadingMessageId = loadingMessage.result.message_id;

        const filePath = await getTelegramFilePath(fileId, token);
        let audioBuffer = await downloadTelegramFile(filePath, token);
        
        transcribedText = await a2tConfig.FUNCTION(a2tConfig, audioBuffer, envData);

        await editMessage(chatId, loadingMessageId, `🎙️ **Транскрипция завершена:**\n\`${transcribedText}\`\n\n🤖 **Генерация ответа AI...**`, token);

        // 6. [T2T] Получение текстового ответа AI (остается без изменений)
        const emptyChatHistory = []; 
        let effectivePrompt = transcribedText;
        if (isTtsEnabled) {
            effectivePrompt = `${transcribedText}. Твой ответ должен быть не более 30 слов.`;
        }

        botReplyText = await textToTextConfig.FUNCTION(textToTextConfig, emptyChatHistory, effectivePrompt, envData);

        // --- НОВЫЙ БЛОК: VTV (Voice-to-Voice) ЛОГИКА ---
        if (isTtsEnabled) {
            // 6.1. Ограничение промпта
            const ttsText = botReplyText.split(/\s+/).slice(0, 30).join(' '); 
            
            // 6.2. Генерация аудио
            await editMessage(chatId, loadingMessageId, `🎙️ **Транскрипция завершена:**\n\`${transcribedText}\`\n\n🔊 **Генерация голоса...**`, token);
            
            const ttsResponse = await t2aConfig.FUNCTION(t2aConfig, ttsText, envData, DEFAULT_TTS_VOICE); // <-- ИСПРАВЛЕНО

            // 🛑 Получаем Base64 и MIME-тип
            const audioBase64 = ttsResponse.audioBase64;
            const mimeType = ttsResponse.mimeType; 
            
            // 2. ЛОГИКА WORKERS_AI / ДРУГИЕ (Готовый файл -> Прямая отправка через KV Proxy)
            await editMessage(chatId, loadingMessageId, `🎙️ **Транскрипция завершена:**\n\`${transcribedText}\`\n\n🔊 **Отправляю готовый аудиофайл...**`, token);

            // 🛑 ПРЯМАЯ ОТПРАВКА BASE64 В TELEGRAM (через прокси KV)
            // Используем 5 аргументов, как определено в Вашей функции.
            await sendAudioMessage(
                chatId, 
                audioBase64, // 🛑 Base64 строка, как ожидает Ваша функция
                mimeType, 
                token, 
                envData 
            );
        }

        // 7. [Telegram] Отправка ВТОРОГО СООБЩЕНИЯ: ОТВЕТ AI
        const finalReply = `✅ **Ответ AI:**\n\n\`${botReplyText}\``;
        await sendMessageMarkdown(chatId, finalReply, token);

        // 8. [Telegram] Финальная очистка
        await editMessage(chatId, loadingMessageId, `💬 **Обработка завершена.**\nТранскрипция:\n\`${transcribedText}\``, token);

    } catch (error) {
        // Логика обработки ошибок (остается без изменений)
        const errorMessage = (error.message || "Неизвестная ошибка VTA").substring(0, 1000);
        let finalMessage = `❌ **Ошибка в процессе Voice-to-Text (VTT):**\n\`${errorMessage.substring(0, 100)}\``;

        if (loadingMessageId) {
            finalMessage += `\n\nТекст ответа:\n\`${botReplyText || 'Не удалось сгенерировать текстовый ответ.'}\`\n\nТранскрипция (если есть):\n\`${transcribedText.substring(0, 100)}\``;
            await editMessage(chatId, loadingMessageId, finalMessage, token);
        } else {
            await sendMessage(chatId, finalMessage, token);
        }

        if (envData.BOT_LOGS_STORAGE) { 
            ctx.waitUntil(logDebug('ERROR_VTT_FAIL', errorMessage, envData, ctx)); 
        }
        if (chatId.toString() === envData.ADMIN_CHAT_ID.toString()) { 
              ctx.waitUntil(sendMessageMarkdown(chatId, `⚠️ **АДМИН-ОТЧЕТ VTT (RAW):**\n${errorMessage.substring(0, 300)}`, token)); 
        }
    }
}

/**
 * Асинхронная обработка голосового сообщения (OGG/OPUS).
 * 1. Конвертирует OGG в MP3 через внешний сервис (Render).
 * 2. MP3-файл готов для использования в API аватаров.
 * * @param {number} chatId
 * @param {string} voiceFileId
 * @param {object} envData
 * @param {object} ctx - Context (Worker's context for waitUntil)
 */
async function processVoiceOGGAsync(chatId, voiceFileId, envData, ctx) {
    const token = envData.TELEGRAM_BOT_TOKEN;

    // 1. Уведомление о начале
    const initialMessage = await sendMessage(
        chatId, 
        "🎙️ Голосовое сообщение получено. Начинаю конвертацию OGG → MP3...", 
        token
    );
    const messageId = initialMessage.message_id; // Получаем ID сообщения для редактирования

    try {
        // 2. 🛑 ВЫЗЫВАЕМ ФУНКЦИЮ КОНВЕРТАЦИИ
        const mp3Buffer = await convertOggToMp3(voiceFileId, envData);

        if (!mp3Buffer) {
            await editMessage(chatId, messageId, "❌ Ошибка: Не удалось конвертировать OGG в MP3. Проверьте логи Worker'а/Render.", token);
            return;
        }

        // 3. ✅ УСПЕХ: Конвертация прошла успешно.
        const mp3SizeKB = (mp3Buffer.byteLength / 1024).toFixed(2);
        
        // 3.1. 🛑 КОНВЕРТИРУЕМ В BASE64 ДЛЯ ОТПРАВКИ ЧЕРЕЗ sendAudioMessage
        const mp3Base64 = arrayBufferToBase64(mp3Buffer);
        
        await editMessage(
            chatId, 
            messageId, 
            `✅ Успех! OGG конвертирован в MP3. Размер MP3-файла: **${mp3SizeKB} КБ**.\n\n` + 
            `**➡️ Отправляю MP3 в чат для проверки качества.**`,
            token
        );
        
        // 4. Логируем успех
        ctx.waitUntil(logDebug("MP3_CONV_SUCCESS", `MP3 Buffer size: ${mp3Buffer.byteLength} bytes`, envData));
        
        // 5. 🚀 ВРЕМЕННЫЙ ШАГ: ОТПРАВЛЯЕМ MP3 В ЧАТ
        await sendAudioMessage(
            chatId, 
            mp3Base64, 
            'audio/mpeg', // Тип MP3
            token, 
            envData
        );
        
        
        // 6. ФИНАЛЬНОЕ СООБЩЕНИЕ (для чистоты)
        await editMessage(
            chatId, 
            messageId, 
            `✅ Конвертация OGG в MP3 завершена. Файл отправлен.`,
            token
        );
        
    } catch (error) {
        // ❌ Обработка любых других ошибок в процессе
        const errorMessage = error.message || "Неизвестная ошибка при обработке голоса.";
        await editMessage(chatId, messageId, `❌ Критическая ошибка: ${errorMessage.substring(0, 100)}`, token);
        ctx.waitUntil(logDebug("PROCESS_VOICE_ERROR", errorMessage, envData));
    }
}

// --- НОВАЯ ФУНКЦИЯ: transcribeFileAsync (Только STT/Транскрибация) ---
async function transcribeAudioFileAsync(chatId, fileId, envData, ctx) {
    let loadingMessageId;
    let transcribedText = '';
    const token = envData.TELEGRAM_BOT_TOKEN;

    try {
        // 1. Загрузка конфигурации STT (Speech-to-Text)
        // Вспомогательная функция для динамической загрузки (чтобы не дублировать код 3 раза)
        const _loadActiveConfig = async (serviceType) => {
            const serviceMenuConfig = AI_MODEL_MENU_CONFIG[serviceType];
            const kvKey = serviceMenuConfig.kvKey;
            
            const freshConfigKey = await envData.LAST_PHOTO_STORAGE.get(kvKey);
            const defaultModelKey = Object.keys(serviceMenuConfig.models)[0]; 
            const activeConfigKey = freshConfigKey || defaultModelKey;
            
            const activeConfig = AI_MODELS[activeConfigKey];
            
            // Возвращаем полную информацию для использования и дебага
            return { 
                config: activeConfig, 
                friendlyName: serviceMenuConfig.models[activeConfigKey] || activeConfigKey,
                activeKey: activeConfigKey
            };
        };

        const sttResult = await _loadActiveConfig('AUDIO_TO_TEXT');
        const a2tConfig = sttResult.config;

        if (!a2tConfig) {
            throw new Error(`Критическая ошибка: Не найдена конфигурация STT (A2T) с ключом ${sttResult.activeKey}`);
        }

        // 2. Отправляем сообщение "Обработка..."
        const loadingMessage = await sendMessageMarkdown(chatId, "🎧 **Начинаю транскрибацию аудиофайла...**", token);
        if (!loadingMessage.ok || !loadingMessage.result) return;
        loadingMessageId = loadingMessage.result.message_id;

        // 3. Получаем путь и скачиваем файл
        const filePath = await getTelegramFilePath(fileId, token);
        const audioBuffer = await downloadTelegramFile(filePath, token);

        // 4. [STT] Распознавание речи:
        transcribedText = await a2tConfig.FUNCTION(
            a2tConfig,
            audioBuffer, 
            envData
        );

        // 5. [Telegram] Финальное сообщение: ТРАНСКРИПЦИЯ
        await editMessage(
            chatId, 
            loadingMessageId, 
            `✅ **Транскрибация завершена**\n\nВ аудио-файле говорится:\n\`\`\`\n${transcribedText}\n\`\`\``, 
            token
        );

    } catch (error) {
        // Логика обработки ошибок
        const errorMessage = (error.message || "Неизвестная ошибка STT").substring(0, 1000);
        let finalMessage = `❌ **Ошибка транскрибации:**\n\`${errorMessage}\``;

        if (loadingMessageId) {
            await editMessage(chatId, loadingMessageId, finalMessage, token);
        } else {
            await sendMessage(chatId, finalMessage, token);
        }
    }
}

// ✅ processSayCommand Обработка команды /say (С ДИНАМИЧЕСКИМ КОНФИГОМ) ---
/**
 * Обрабатывает команду /say, используя сервис, указанный в TEXT_TO_AUDIO_CONFIG.
 * @param {number} chatId - ID чата.
 * @param {string} text - Исходный текст команды (/say ...).
 * @param {object} envData - Объект окружения.
 * @param {object} ctx - Контекст Worker'а.
 */
async function processSayCommand(chatId, text, envData, ctx) {
    const token = envData.TELEGRAM_BOT_TOKEN;
    const storage = envData.LAST_PHOTO_STORAGE; // Ваше хранилище KV
    const chatKey = chatId.toString();
    const SAY_VOICE_KEY = chatKey + SAY_VOICE_KEY_SUFFIX; 
    const SAY_TEXT_KEY = chatKey + SAY_TEXT_KEY_SUFFIX; 
    const currentVoice = await storage.get(SAY_VOICE_KEY) || DEFAULT_VOICE;
    let loadingMessageId;

    // ВЫКЛЮЧАТЕЛЬ TTS
    if (!envData.TTS_ENABLED) {
        await sendMessageMarkdown(chatId, "⚠️ **Голосовой ответ временно отключен** администратором.", token);
        return true;
    }

    // 4. Извлекаем текст после /say
    const textToSpeak = text.replace(/^\/say\s*/i, '').trim();

    // 🚨 КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: УСТАНОВКА СОСТОЯНИЯ, ЕСЛИ ТЕКСТ ПУСТ
    if (!textToSpeak) {
        try {
            // 1. Читаем голос и текст из KV
            const currentVoice = await storage.get(SAY_VOICE_KEY) || DEFAULT_VOICE;
            const currentText = await storage.get(SAY_TEXT_KEY) || null;
            
            // 2. ОТПРАВЛЯЕМ НОВОЕ МЕНЮ (messageId = null)
            await sendSayControlMenu(chatId, token, currentVoice, currentText, null); 
        
        } catch (e) {
            // ❌ Логика отлова ошибок
            const errMsg = `❌ Ошибка открытия меню /say: ${e.message.substring(0, 150)}`;
            await sendMessageMarkdown(chatId, errMsg, token);
            ctx.waitUntil(logDebug("SAY_MENU_FAIL", `Chat ${chatId}: ${e.stack}`, envData, ctx));
        }
        
        // 🛑 ОСТАНОВИТЬ ВЫПОЛНЕНИЕ!
        return true; 
    }

    // --- Добавление чтения выбранного голоса в ЛОГИКУ ГЕНЕРАЦИИ ---
    
    // УНИВЕРСАЛЬНЫЙ ВЫЗОВ зависит от настроенной в KV модели
    // 1. Определение сервиса и ключа KV - Обязательно
    const serviceType = 'TEXT_TO_AUDIO'; 
    const serviceMenuConfig = AI_MODEL_MENU_CONFIG[serviceType];
    const kvKey = serviceMenuConfig.kvKey;
    // 2. ДИНАМИЧЕСКОЕ ЧТЕНИЕ АКТУАЛЬНОЙ КОНФИГУРАЦИИ
    const defaultModelKey = Object.keys(serviceMenuConfig.models)[0]; 
    // Читаем актуальное значение прямо из KV. 
    const freshConfigKey = await envData.LAST_PHOTO_STORAGE.get(kvKey);
    // Используем свежий ключ ИЛИ ключ по умолчанию
    const activeConfigKey = freshConfigKey || defaultModelKey;
    // 3. Получение полного объекта конфигурации из AI_MODELS
    const activeModelConfig = AI_MODELS[activeConfigKey];

    // 4. *** ДЕБАГ: СООБЩЕНИЕ О ВЫБОРЕ МОДЕЛИ ***
    // Получаем красивое имя модели для дебага
    const friendlyModelName = serviceMenuConfig.models[activeConfigKey] || activeConfigKey; 
    // УСЛОВИЕ: Текущий пользователь должен быть админом И дебаг должен быть включен
    if (chatId.toString() === envData.ADMIN_CHAT_ID && envData.DEBUG_ENABLED) {
        const debugMessage = `🧠 AI-Модель для ${serviceType}: ${friendlyModelName}`;
        envData.ctx.waitUntil(sendMessage(
            chatId, // Отправляем в текущий чат
            debugMessage, 
            envData.TELEGRAM_BOT_TOKEN
        ));
    } // Если chatId не совпадает с ADMIN_CHAT_ID, сообщение пропускается.

    // 3. Проверка конфигурации 
    if (!activeModelConfig || typeof activeModelConfig.FUNCTION !== 'function') {
        const errorMsg = "Конфигурация TTS не найдена или настроена неверно.";
        ctx.waitUntil(logDebug("TTS_CONFIG_FAIL", errorMsg, envData, ctx));
        return await sendMessage(chatId, `❌ ${errorMsg}`, token);
    }

    try {
        // 5. Отправляем сообщение "Обработка..."
        const loadingMessage = await sendMessageMarkdown(chatId, "🎙️ **Генерация речи...**", token);
        if (!loadingMessage.ok || !loadingMessage.result) return;
        loadingMessageId = loadingMessage.result.message_id;

        // 5. *** ДИНАМИЧЕСКИЙ ВЫЗОВ ***
        const ttsResponse = await activeModelConfig.FUNCTION(
            activeModelConfig, 
            textToSpeak.substring(0, 500), 
            envData,
            currentVoice,
            chatId // <--- Передаем chatId, так как это требуется для Kie.ai колбэка
        );

        // 6. ПРОВЕРКА ТИПА ОТВЕТА (Синхронный vs Асинхронный)
        if (activeModelConfig.SERVICE === 'KIEAI') {
            // KIEAI: Асинхронный запуск завершен. 
            // Результат (audioBase64) придет позже через CallBack.
            // Тут мы просто редактируем "заглушку" и завершаем функцию.

            // 8. Очистка сообщения-заглушки: Редактируем сообщение, подтверждая запуск
            if (loadingMessageId) {
                await editMessage(chatId, loadingMessageId, `✅ **Задача TTS запущена.** Результат придет в новом сообщении.`, token);
            }
            return true; // Завершаем выполнение, ожидая колбэк

        } else { 
            // Bothub/VoiceRSS: Синхронный ответ с готовым аудио.
            // ttsResponse содержит { audioBase64, mimeType }
            
            // 7. Отправка аудио с помощью ВАШЕЙ РАБОЧЕЙ ФУНКЦИИ (sendAudioMessage)
            await sendAudioMessage(
                chatId, 
                ttsResponse.audioBase64, 
                ttsResponse.mimeType, 
                token, 
                envData
            );
            
            // 8. Очистка сообщения-заглушки: Редактируем сообщение с результатом
            await editMessage(chatId, loadingMessageId, `✅ **Озвучено:** ${textToSpeak.substring(0, 50)}...`, token);
        }
    } catch (error) {
        const errorMessage = error.message || "Неизвестная ошибка TTS";
        
        // 9. Обработка ошибки
        if (loadingMessageId) {
            await editMessage(chatId, loadingMessageId, `❌ **Ошибка озвучивания:**\n\`${errorMessage.substring(0, 150)}\``, token);
        } else {
            await sendMessageMarkdown(chatId, `❌ **Ошибка озвучивания:**\n\`${errorMessage.substring(0, 150)}\``, token);
        }
        // Логирование в админский чат
        ctx.waitUntil(logDebug("TTS_SAY_FAIL", errorMessage, envData, ctx));
    }
}

// ✅ processVoiceForSay - Обрабатывает OGG, конвертирует в MP3, выполняет STT.
/**
 * Обрабатывает голосовое сообщение, конвертирует в MP3, выполняет STT и обновляет меню.
 */
async function processVoiceForSay(update, envData, ctx) {
    // --- 1. ИНИЦИАЛИЗАЦИЯ ---
    const message = update.message;
    const chatId = message.chat.id;
    const voiceFileId = message.voice.file_id;
    const token = envData.TELEGRAM_BOT_TOKEN;
    const storage = envData.LAST_PHOTO_STORAGE;
    const chatKey = chatId.toString();
    
    // Ключи состояния
    const SAY_MESSAGE_ID_KEY_SUFFIX = '_say_msg_id'; 
    const SAY_VOICE_KEY_SUFFIX = '_say_voice'; 
    const SAY_TEXT_KEY_SUFFIX = '_say_text'; 

    const SAY_MESSAGE_ID_KEY = chatKey + SAY_MESSAGE_ID_KEY_SUFFIX;
    const SAY_VOICE_KEY = chatKey + SAY_VOICE_KEY_SUFFIX; 
    const SAY_TEXT_KEY = chatKey + SAY_TEXT_KEY_SUFFIX; 
    
    const sayMessageId = await storage.get(SAY_MESSAGE_ID_KEY); 
    const currentVoice = await storage.get(SAY_VOICE_KEY); 
    let loadingMessageId;
    let currentText = await storage.get(SAY_TEXT_KEY) || null; // Если был старый текст

    // 2. УВЕДОМЛЕНИЕ: Начало обработки
    const processingMessage = await sendMessageMarkdown(chatId, '🎙️ **Обработка голоса...**', token);
    loadingMessageId = processingMessage.result.message_id;

    try {
        // 4. КОНВЕРТАЦИЯ OGG -> MP3 (теперь это Шаг 3)
        await editMessage(chatId, loadingMessageId, '1️⃣ Конвертация OGG → MP3...', token); // Изменили номер шага
        
        // 🛑 ИСПРАВЛЕНИЕ: Передаем voiceFileId, а не oggBase64, и ожидаем Buffer, как в processVoiceOGGAsync
        const mp3Buffer = await convertOggToMp3(voiceFileId, envData); // <- Здесь используется file_id
        
        if (!mp3Buffer) {
             throw new Error("Конвертер OGG->MP3 вернул пустые данные.");
        }
        
        // 🛑 ПРЕОБРАЗОВАНИЕ: Конвертируем Buffer в Base64 для sendAudioMessage и STT
        const mp3Base64 = arrayBufferToBase64(mp3Buffer); 
        
        // Отправка MP3 в чат
        await sendAudioMessage(chatId, mp3Base64, 'audio/mpeg', token, envData);
    } catch (error) {
        // 11. Обработка ошибок
        const errorMsg = `❌ Ошибка обработки голоса: ${error.message}`;
        if (loadingMessageId) {
            await editMessage(chatId, loadingMessageId, errorMsg, token);
        } else {
             await sendMessageMarkdown(chatId, errorMsg, token);
        }
        // Возвращаем меню в исходное состояние (без флага ожидания)
        const oldText = await storage.get(SAY_TEXT_KEY);
        await sendSayControlMenu(chatId, token, currentVoice, oldText, sayMessageId, false); 
        ctx.waitUntil(logDebug("SAY_VOICE_FAIL", `Chat ${chatId}: ${error.stack}`, envData, ctx));
    }
}

// ✅ *** 3.2. Обработка входящего фото (Vision AI) - УНИФИЦИРОВАНО ***
/**
 * @description Обрабатывает входящее фото (объект), скачивает его, генерирует промпт и сохраняет Base64 с размерами в KV.
 * @param {number} chatId - ID чата.
 * @param {Object} largestPhotoObject - Полный объект фото/документа из Telegram (содержит file_id).
 * @param {Object} envData - Объект окружения.
 * @param {Object} ctx - Контекст Worker для ctx.waitUntil.
 */
async function processPhotoMessageAsync(chatId, largestPhotoObject, envData, ctx) { // <--- СИГНАТУРА СОХРАНЕНА
    let loadingMessageId;

    // --- ИСПРАВЛЕНИЕ 1: БЕЗОПАСНОЕ ИЗВЛЕЧЕНИЕ РАЗМЕРОВ ---
    // Проверяем, является ли объект документом (если нет width/height)
    const isDocument = !largestPhotoObject.width && !!largestPhotoObject.mime_type;

    // Извлекаем fileId из объекта
    const fileId = largestPhotoObject.file_id; 
    
    // Безопасное чтение: если поля нет (для документа), используем null.
    const photoWidth = largestPhotoObject.width || null; 
    const photoHeight = largestPhotoObject.height || null; 
    
    // Новая переменная: Определение соотношения сторон для известных фото
    let aspectType = 'square'; // По умолчанию
    if (photoWidth && photoHeight) {
        const ratio = photoWidth / photoHeight;
        if (ratio > 1.25) { // Например, больше 5:4 (1.25), считаем широким
            aspectType = 'landscape';
        } else if (ratio < 0.8) { // Например, меньше 4:5 (0.8), считаем высоким
            aspectType = 'portrait';
        }
    }
    
    // Текст для отображения размеров (для пользователя)
    const dimensionsText = (photoWidth && photoHeight) 
        ? `${photoWidth}x${photoHeight} (${aspectType})` 
        : (isDocument ? 'Несжатое фото (размер неизвестен)' : 'Неизвестно'); 
    // --- КОНЕЦ ИСПРАВЛЕНИЯ 1 ---

    const token = envData.TELEGRAM_BOT_TOKEN;
    const storage = envData.LAST_PHOTO_STORAGE;

    // --- KV KEYS --- (без изменений)
    const chatKey = chatId.toString();
    const LAST_PROMPT_KEY = chatKey + (LAST_PROMPT_KEY_SUFFIX || '_last_prompt');
    const LAST_IMAGE_DATA_KEY = chatKey + (LAST_IMAGE_DATA_KEY_SUFFIX || '_last_image_data');
    const LAST_PROMPT_MESSAGE_ID_KEY = chatKey + (LAST_PROMPT_MESSAGE_ID_KEY_SUFFIX || '_last_prompt_msg_id');
    const LAST_PROMPT_LANG_KEY = chatKey + (LAST_PROMPT_LANG_KEY_SUFFIX || '_last_prompt_lang');

    // УНИВЕРСАЛЬНЫЙ ВЫЗОВ зависит от настроенной в KV модели
    // 1. Определение сервиса и ключа KV - Обязательно
    const serviceType = 'IMAGE_TO_TEXT'; 
    const serviceMenuConfig = AI_MODEL_MENU_CONFIG[serviceType];
    const kvKey = serviceMenuConfig.kvKey;
    // 2. ДИНАМИЧЕСКОЕ ЧТЕНИЕ АКТУАЛЬНОЙ КОНФИГУРАЦИИ
    const defaultModelKey = Object.keys(serviceMenuConfig.models)[0]; 
    // Читаем актуальное значение прямо из KV. 
    const freshConfigKey = await envData.LAST_PHOTO_STORAGE.get(kvKey);
    // Используем свежий ключ ИЛИ ключ по умолчанию
    const activeConfigKey = freshConfigKey || defaultModelKey;
    // 3. Получение полного объекта конфигурации из AI_MODELS
    const activeModelConfig = AI_MODELS[activeConfigKey];

    // 4. *** ДЕБАГ: СООБЩЕНИЕ О ВЫБОРЕ МОДЕЛИ ***
    // Получаем красивое имя модели для дебага
    const friendlyModelName = serviceMenuConfig.models[activeConfigKey] || activeConfigKey; 
    // УСЛОВИЕ: Текущий пользователь должен быть админом И дебаг должен быть включен
    if (chatId.toString() === envData.ADMIN_CHAT_ID && envData.DEBUG_ENABLED) {
        const debugMessage = `🧠 AI-Модель для ${serviceType}: ${friendlyModelName}`;
        envData.ctx.waitUntil(sendMessage(
            chatId, // Отправляем в текущий чат
            debugMessage, 
            envData.TELEGRAM_BOT_TOKEN
        ));
    } // Если chatId не совпадает с ADMIN_CHAT_ID, сообщение пропускается.
    // ------------------------------------------

    try {
        // 1. Отправляем сообщение "Анализирую..."
        const loadingMessage = await sendMessageMarkdown(chatId, "👁️ **Анализирую фото: Генерирую промпт...**", token);
        if (!loadingMessage.ok || !loadingMessage.result) return;
        loadingMessageId = loadingMessage.result.message_id;

        // 2. Скачивание файла
        const filePath = await getTelegramFilePath(fileId, token);
        const imageArrayBuffer = await downloadTelegramFile(filePath, token);

        // 3. КОНВЕРТАЦИЯ: Base64 для Vision AI (Gemini) и для KV
        const imageBase64 = arrayBufferToBase64(imageArrayBuffer);

        // 4. УНИВЕРСАЛЬНЫЙ Вызов Vision AI для генерации промпта
        await editMessage(chatId, loadingMessageId, `☑️ Анализирую содержимое фото (${activeModelConfig.SERVICE} Vision)...`, token);
        
        // !!! УНИВЕРСАЛЬНЫЙ ВЫЗОВ !!!
        const initialPrompt = await activeModelConfig.FUNCTION(
            activeModelConfig,      // <-- Передаем конфигурацию
            imageArrayBuffer,   // <-- ArrayBuffer
            envData
        );
        // !!! КОНЕЦ УНИВЕРСАЛЬНОГО ВЫЗОВА !!!


        // 5. Перевод промпта на русский через Workers AI Text (если нужно)
        let russianPrompt = initialPrompt;

        // Если Vision API (например, старый Workers AI Uform) вернул английский, его нужно перевести.
        // Если Vision API (Gemini, настроенный на русский) вернул русский, перевод не нужен.
        if (activeModelConfig.SERVICE === 'WORKERS_AI') {
            await editMessage(chatId, loadingMessageId, "🌐 **Промпт сгенерирован, выполняю перевод...**", token);
            // ПРЕДПОЛОЖЕНИЕ: callWorkersAITranslate - это отдельная, существующая функция
            russianPrompt = await callWorkersAITranslate(initialPrompt, envData, 'en', 'ru');
        }

        // 6. Сохраняем промпт и Base64 изображения в KV
        // 6.1. Сохранение промпта и языка
        //await storage.put(LAST_PROMPT_KEY, russianPrompt, { expirationTtl: 3600 });
        //await storage.put(LAST_PROMPT_LANG_KEY, 'ru', { expirationTtl: 3600 }); 

        // 6.2. СОХРАНЕНИЕ BASE64 И РАЗМЕРОВ В ФОРМАТЕ JSON
        const imageMetadata = { 
            base64: imageBase64,
            width: photoWidth,
            height: photoHeight,
            is_document: isDocument,
            aspect_type: aspectType,
            
            // ✅ ИЗМЕНЕНИЕ: Добавляем промпт и язык в метаданные
            prompt: russianPrompt,      
            prompt_lang: 'ru'           
        };

        // 6.2.1. ЕДИНАЯ ЗАПИСЬ для всех метаданных и промпта (PUT 1)
        await storage.put(LAST_IMAGE_DATA_KEY, JSON.stringify(imageMetadata), { expirationTtl: 3600 }); 

        // 6.2.2. Удаляем старые ключи промпта (чтобы не читать их в других местах)
        await storage.delete(LAST_PROMPT_KEY);
        await storage.delete(LAST_PROMPT_LANG_KEY);
        // 7. Отправляем меню промпта. 
        await editMessageWithKeyboard(
            chatId,
            loadingMessageId, 
            // --- ИСПРАВЛЕНИЕ 3: ИСПОЛЬЗУЕМ dimensionsText ---
            `✅ **Промпт сгенерирован!**\n\n\`${russianPrompt}\`\n\n**Размеры фото:** ${dimensionsText}`, 
            // --- КОНЕЦ ИСПРАВЛЕНИЯ 3 ---
            token,
            getPromptKeyboard(russianPrompt).inline_keyboard
        );
        
        // 8. Сохраняем ID сообщения с меню для возможности редактирования (PUT 2)
        await storage.put(LAST_PROMPT_MESSAGE_ID_KEY, loadingMessageId.toString(), { expirationTtl: 3600 });

    } catch (error) {
        const errorText = error.message || "Неизвестная ошибка генерации промпта.";
        await editMessage(chatId, loadingMessageId, `❌ **Ошибка!** Не удалось сгенерировать промпт: ${errorText}`, token);
    } finally {
        // ...
    }
}

// setBotCommands - Отправка JSON-запроса к методу setMyCommands Telegram API для обновления списка команд
async function setBotCommands(TELEGRAM_BOT_TOKEN, commands, scopeType, chatId = null, languageCode = null) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`;

    let scope = { type: scopeType };
    if (scopeType === 'chat' && chatId) {
        scope.chat_id = chatId.toString();
    }
    // ✅ ДОБАВЛЕНИЕ ЯЗЫКОВОГО КОДА
    if (languageCode) {
        scope.language_code = languageCode;
    }

    const payload = {
        commands: commands,
        scope: scope
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    return await response.json();
}

/**
 * 🟢 ЦЕНТРАЛИЗОВАННАЯ ФУНКЦИЯ ДЛЯ ВЫЗОВА RENDER-СЕРВИСА
 * @param {string} endpoint - Конечная точка (например, '/resize-video').
 * @param {object} fetchOptions - Объект опций для fetch, включая body, headers и signal.
 * @param {object} queryParams - Параметры URL для эндпоинта.
 * @param {object} envData - Объект окружения.
 * @returns {Promise<ArrayBuffer>} - Возвращает ArrayBuffer готового медиафайла.
 * @throws {Error} - Выбрасывает ошибку в случае сбоя Render-сервиса или таймаута.
 */
async function callLeshiyMp3Converter(endpoint, fetchOptions, queryParams, envData) {
    const RENDER_HOST_URL = envData.LESHIY_CONVERTER;
    const FULL_URL = RENDER_HOST_URL + endpoint;
    const timeoutSeconds = 120; // Максимальный таймаут по умолчанию 2 минуты

    // 1. ПРОВЕРКА ЗДОРОВЬЯ (Пробуждение Render-сервиса)
    // Эта проверка вызывается при каждом обращении, чтобы пробудить сервис.
    await checkConverterHealth(envData); 
    
    // 2. ФОРМИРОВАНИЕ URL С ПАРАМЕТРАМИ
    const urlParams = new URLSearchParams(queryParams);
    const finalUrl = `${FULL_URL}?${urlParams.toString()}`;

    // 3. УСТАНОВКА ТАЙМАУТА
    // Используем AbortSignal.timeout, если не передан свой таймаут в fetchOptions.
    const signal = fetchOptions.signal || AbortSignal.timeout(timeoutSeconds * 1000);
    const finalOptions = {
        method: 'POST', // По умолчанию POST
        ...fetchOptions,
        signal: signal 
    };

    // 4. ВЫЗОВ RENDER-СЕРВИСА
    try {
        console.log(`[RENDER_CALL] Calling: ${finalUrl}`);
        
        const renderResponse = await envData.LESHIY_CONVERTER.fetch(finalUrl, finalOptions);

        // 5. ОБРАБОТКА HTTP-ОШИБОК
        if (!renderResponse.ok) {
            const errorDetails = await renderResponse.text().catch(() => 'No response body');
            const status = renderResponse.status;
            
            console.error(`[RENDER_ERROR] Status ${status}. Details: ${errorDetails.substring(0, 300)}`);
            
            let userError = `Ошибка конвертера (HTTP ${status}).`;
            if (errorDetails.includes("FFmpeg failed") || errorDetails.includes("FfmpegProcessError")) {
                userError = "Сбой FFmpeg. Проверьте формат или длительность.";
            } else if (status === 503) {
                userError = "`🔄 Render-сервис был в спячке. Запускаю...\nЭто займёт ~15 сек. Пожалуйста подождите...`,";
            }
            throw new Error(userError);
        }

        // 6. УСПЕШНЫЙ ОТВЕТ: Возвращаем ArrayBuffer (самый универсальный тип)
        return await renderResponse.arrayBuffer();

    } catch (e) {
        if (e.name === 'AbortError') {
            throw new Error(`🔄 Таймаут Render-сервиса (более ${timeoutSeconds} секунд).`);
        }
        // Логируем и перебрасываем ошибку
        envData.ctx.waitUntil(logDebug("RENDER_CRITICAL_EXCEPTION", `Fetch exception: ${e.message}`, envData));
        throw e;
    }
}

/**
 * Проверяет доступность и версию ffmpeg на внешнем конвертере.
 * @param {object} envData - Объект окружения.
 * @returns {Promise<boolean>} true, если сервис доступен и вернул 200 OK.
 */
async function checkConverterHealth(envData) {
    const DEBUG_URL = envData.LESHIY_CONVERTER + '/debug';
    try {
        const response = await envData.LESHIY_CONVERTER.fetch(DEBUG_URL, {
            method: 'GET',
            // 🛑 Увеличиваем таймаут до 45 секунд
            signal: AbortSignal.timeout(45000)
        });

        if (response.ok) {
            const versionText = await response.text();
            // Логируем версию для истории
            envData.ctx.waitUntil(logDebug("CONVERTER_HEALTH_CHECK", `FFmpeg version: ${versionText.substring(0, 100)}`, envData));
            return true;
        } else {
            const errorText = await response.text();
            envData.ctx.waitUntil(logDebug("CONVERTER_HEALTH_FAIL", `Health check failed. Status: ${response.status}. Error: ${errorText.substring(0, 100)}`, envData));
            return false;
        }
    } catch (e) {
        envData.ctx.waitUntil(logDebug("CONVERTER_HEALTH_EXCEPTION", `Fetch exception: ${e.message}`, envData));
        return false;
    }
}

/**
 * Скачивает видео по URL и отправляет его на внешний сервис Render
 * для извлечения аудиодорожки (MP4 → MP3).
 * @param {string} videoUrl - URL видеофайла Telegram.
 * @param {object} envData - Объект окружения (включая контекст).
 * @returns {Promise<ArrayBuffer | null>} Байты MP3-файла (ArrayBuffer) или null в случае ошибки.
 */
async function extractAudioFromVideo(videoUrl, envData) {
    // --- УСТАНОВКА ТАЙМАУТА (видео может быть большим, дадим 120 секунд) ---
    const timeout = 120000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        // 1. Скачиваем видео-файл по прямому URL
        const videoResponse = await fetch(videoUrl);
        
        if (!videoResponse.ok) {
            envData.ctx.waitUntil(logDebug("VIDEO_GRAB_FAIL", `Failed to download video. Status: ${videoResponse.status}`, envData));
            throw new Error(`Failed to download video: ${videoResponse.status}`);
        }
        const videoBlob = await videoResponse.blob();

        // 2. Подготовка FormData
        const formData = new FormData();
        formData.append('video', videoBlob, 'source.mp4'); 

        // 3. ВЫЗОВ ЧЕРЕЗ ОБЩУЮ ФУНКЦИЮ
        // Мы ожидаем ArrayBuffer от callLeshiyMp3Converter
        const mp3Buffer = await callLeshiyMp3Converter(
            '/video2mp3', 
            { body: formData }, 
            {}, // Нет query-параметров
            envData
        );
        return mp3Buffer;

    } catch (error) {
        // Здесь мы ловим и обрабатываем ошибки, брошенные из callLeshiyMp3Converter
        envData.ctx.waitUntil(logDebug("VIDEO_GRAB_EXCEPTION", error.message, envData));
        // ПЕРЕБРАСЫВАЕМ ошибку, чтобы вызывающая функция (runGrabAudioInBackground) могла ее обработать
        throw error; 
    }
}

/**
 * Запускает извлечение аудио из видео в фоне (ctx.waitUntil).
 */
async function runGrabAudioInBackground(chatId, mediaFileId, messageId, envData, token) {
    let fileUrl;
    
    try {
        // 1. 🔗 ПОЛУЧЕНИЕ АКТУАЛЬНОГО URL ИЗ TELEGRAM API
        const getFileUrlApi = `https://api.telegram.org/bot${token}/getFile?file_id=${mediaFileId}`;
        const fileResponse = await fetch(getFileUrlApi);
        const fileData = await fileResponse.json();

        if (!fileData.ok) {
            throw new Error(`Ошибка Telegram getFile: ${fileData.description}`);
        }

        const filePath = fileData.result.file_path;
        fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

        // 🛑 Вызываем нашу новую функцию
        const mp3Buffer = await extractAudioFromVideo(fileUrl, envData); 

        if (!mp3Buffer) {
            // Ошибка уже залогирована внутри extractAudioFromVideo
            await editMessage(chatId, messageId, "❌ Ошибка: Не удалось извлечь аудиодорожку. Проверьте логи Render/Worker.", token);
            return;
        }
            
        const mp3SizeKB = (mp3Buffer.byteLength / 1024).toFixed(2);
        
        // 1. Отправляем MP3 в чат (как аудиофайл)
        const mp3Base64 = arrayBufferToBase64(mp3Buffer); 
        await sendAudioMessage(chatId, mp3Base64, 'audio/mpeg', token, envData);
        
        // 2. Финальное сообщение
        await editMessage(chatId, messageId, `✅ **Аудиодорожка успешно извлечена!** Размер: ${mp3SizeKB} КБ.`, token);
        
    } catch (e) {
        const errorMessage = e.message.substring(0, 1000);
        envData.ctx.waitUntil(logDebug("BG_GRAB_CRITICAL_ERROR", `Критическая ошибка в фоне: ${errorMessage}`, envData));
        await editMessage(chatId, messageId, `❌ **Ошибка при извлечении:**\n\`${errorMessage.substring(0, 100)}\``, token);
    }
}

/**
 * Асинхронно выполняет вращение фотографии через Render-сервис и редактирует сообщения.
 * @param {number} chatId - ID чата.
 * @param {string} fileId - file_id фото в Telegram.
 * @param {number} originalMessageId - ID оригинального сообщения с фото.
 * @param {number} loadingMessageId - ID сообщения со статусом (НОВОЕ).
 * @param {Object} originalReplyMarkup - Инлайн-клавиатура оригинального сообщения.
 * @param {string} angle - Угол поворота ('90' или '-90').
 * @param {Object} env - Объект окружения (должен содержать ctx).
 * @param {string} token - Токен Telegram.
 * @param {Object} ctx - Контекст выполнения.
 */
async function runPhotoRotationInBackground(chatId, fileId, originalMessageId, loadingMessageId, originalReplyMarkup, angle, env, token, ctx) {
    const RENDER_HOST_URL = env.LESHIY_CONVERTER;
    const ROTATE_ENDPOINT = RENDER_HOST_URL + '/rotate-image';
  
    try {
      // 1. Скачиваем исходное фото
      await editMessage(chatId, loadingMessageId, `🔄 **Поворачиваю фото на ${angle}°... Скачиваю файл...**`, token);
      const photoBuffer = await downloadFileBuffer(fileId, token, env);
  
      // 2. Отправляем на Render
      await editMessage(chatId, loadingMessageId, `🖼️ **Поворот [FFmpeg]: ${angle}°...**`, token);
      const formData = new FormData();
      const photoFile = new File([photoBuffer], 'photo.jpg', { type: 'image/jpeg' });
      formData.append('image', photoFile);
  
      const rotateResponse = await env.LESHIY_CONVERTER.fetch(`${ROTATE_ENDPOINT}?angle=${angle}`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(60000)
      });
  
      if (!rotateResponse.ok) {
        throw new Error(`Render error: ${rotateResponse.status} ${rotateResponse.statusText}`);
      }
  
      const rotatedBuffer = await rotateResponse.arrayBuffer();
  
      // 3. Обновляем медиа в Telegram
      await editMessage(chatId, loadingMessageId, `📤 **Загрузка повернутого фото в Telegram...**`, token);
      const caption = `✅ Готово. Повернуто на ${angle}°!`;
      
      const editResult = await editMessageWithNewPhoto(
        chatId,
        originalMessageId,
        rotatedBuffer,
        caption,
        originalReplyMarkup,
        token
      );
  
    // ✅ ОБНОВЛЕНИЕ KV С НОВЫМ FILE_ID ПОСЛЕ ПОВОРОТА ФОТО
    const photoArray = editResult.result.photo;
    const newPhotoObject = photoArray.length > 0 ? photoArray.slice(-1)[0] : null;
    if (!newPhotoObject || !newPhotoObject.file_id) {
        throw new Error("Telegram не вернул file_id для повернутого фото");
    }

    const newFileId = newPhotoObject.file_id;
    const chatKey = chatId.toString();
    const KV_KEY = chatKey + '_last_image_data'; 

    // 🛑 ИСПРАВЛЕНИЕ: ЗАГРУЖАЕМ СТАРЫЕ ДАННЫЕ ИЗ KV
    let currentData = {};
    const rawData = await env.LAST_PHOTO_STORAGE.get(KV_KEY);
    if (rawData) {
        try {
            currentData = JSON.parse(rawData);
        } catch (e) {
            console.error("Failed to parse old KV data:", e);
        }
    }
    // Здесь currentData содержит ссылку на Message ID и другие метаданные.

    // 1. Конвертируем ArrayBuffer от Render-сервиса в Base64
    const base64Image = arrayBufferToBase64(rotatedBuffer);
    const finalBase64 = `data:image/jpeg;base64,${base64Image}`;

    // Обновляем данные в KV:
    currentData.file_id = newFileId;
    currentData.base64 = finalBase64;
    currentData.width = newPhotoObject.width || currentData.width || null;
    currentData.height = newPhotoObject.height || currentData.height || null;
    currentData.rotation = (currentData.rotation || 0) + parseInt(angle);
    // 💡 НЕ МЕНЯЕМ currentData.message_id — это ID, который мы редактируем!

    await env.LAST_PHOTO_STORAGE.put(KV_KEY, JSON.stringify(currentData), { expirationTtl: 3600 });

    // 4. Успешное завершение
      await editMessage(chatId, loadingMessageId, `✅ **Поворот фото на ${angle}° завершён.**`, token);
  
    } catch (error) {
      console.error(`Ошибка при повороте фото: ${error.message}`, error);
      await editMessage(
        chatId,
        loadingMessageId,
        `❌ **Ошибка при повороте фото.** ${error.message.substring(0, 150)}`,
        token
      );
    }
}

/**
 * ✅ runVideoRotationInBackground - Асинхронно скачивает видео, отправляет на Render для поворота и обновляет сообщение.
 */
async function runVideoRotationInBackground(chatId, fileId, originalMessageId, loadingMessageId, originalReplyMarkup, angle, env, token, ctx) {
    const RENDER_HOST_URL = env.LESHIY_CONVERTER;
    const ROTATE_VIDEO_ENDPOINT = RENDER_HOST_URL + '/rotate-video';

    try {
        // 1. Скачиваем исходное видео
        await editMessage(chatId, loadingMessageId, `🔄 **Поворачиваю видео на ${angle}°... Скачиваю файл...**`, token);
        const videoBuffer = await downloadFileBuffer(fileId, token, env);

        // 2. Отправляем на Render
        await editMessage(chatId, loadingMessageId, `🎥 **Поворот [FFmpeg]: ${angle}°...** (до 1-2 мин.)`, token);
        const renderFormData = new FormData();
        const videoFile = new File([videoBuffer], 'input.mp4', { type: 'video/mp4' });
        renderFormData.append('video', videoFile);

        const finalRenderUrl = `${ROTATE_VIDEO_ENDPOINT}?angle=${encodeURIComponent(angle)}`;
        const renderResponse = await env.LESHIY_CONVERTER.fetch(finalRenderUrl, {
        method: 'POST',
        body: renderFormData,
        signal: AbortSignal.timeout(120000)
        });

        if (!renderResponse.ok) {
        throw new Error(`Render error: ${renderResponse.status} ${renderResponse.statusText}`);
        }

        const rotatedBuffer = await renderResponse.arrayBuffer();

        // 3. Загружаем повернутое видео в Telegram
        await editMessage(chatId, loadingMessageId, `📤 **Загрузка повернутого видео в Telegram...**`, token);

        const rotatedVideoFile = new File([rotatedBuffer], 'rotated_video.mp4', { type: 'video/mp4' });
        const updateMediaUrl = `https://api.telegram.org/bot${token}/editMessageMedia`;
        const telegramFormData = new FormData();
        telegramFormData.append('chat_id', chatId.toString());
        telegramFormData.append('message_id', originalMessageId.toString());

        const newCaption = `✅ Готово. Повернуто на ${angle}°!`;
        const mediaPayload = {
        type: 'video',
        media: `attach://${rotatedVideoFile.name}`,
        caption: newCaption,
        parse_mode: 'Markdown'
        };
        telegramFormData.append('media', JSON.stringify(mediaPayload));
        telegramFormData.append(rotatedVideoFile.name, rotatedVideoFile);

        // Добавляем клавиатуру (чтобы кнопки остались)
        if (originalReplyMarkup) {
        telegramFormData.append('reply_markup', JSON.stringify(originalReplyMarkup));
        }

        const response = await fetch(updateMediaUrl, {
        method: 'POST',
        body: telegramFormData,
        signal: AbortSignal.timeout(60000)
        });

        const responseData = await response.json();
        if (!response.ok || !responseData.ok) {
        throw new Error(`Telegram API error: ${responseData.description || 'Unknown'}`);
        }

        // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
        // ✅ ИСПРАВЛЕННЫЙ КРИТИЧЕСКИ ВАЖНЫЙ БЛОК: ОБНОВЛЕНИЕ KV С НОВЫМ FILE_ID
        // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
        
        // 1. Получаем объект видео из ответа Telegram
        const videoObject = responseData.result?.video; 
        
        if (!videoObject || !videoObject.file_id) {
            throw new Error("Telegram не вернул file_id для повернутого видео.");
        }

        // ✅ ШАГ: Обновляем KV с новым FILE_ID и метаданными
        const newFileId = videoObject.file_id;
        const chatKey = chatId.toString();
        const KV_KEY = chatKey + '_last_video_data'; 

        // Читаем текущие данные
        const rawData = await env.LAST_PHOTO_STORAGE.get(KV_KEY);
        let currentData = {};
        try {
            currentData = rawData ? JSON.parse(rawData) : {};
        } catch (e) {
            console.warn("KV data corrupted, starting fresh.");
        }
        
        // Конвертируем ArrayBuffer от Render-сервиса в Base64
        const base64Video = arrayBufferToBase64(rotatedBuffer); 
        const finalBase64 = `data:video/mp4;base64,${base64Video}`; 

        // Обновляем метаданные, используя ИСПРАВЛЕННУЮ переменную videoObject
        currentData.file_id = newFileId;
        currentData.base64 = finalBase64;
        currentData.rotation = (currentData.rotation || 0) + parseInt(angle); // Сохраняем актуальный угол

        // Обновляем технические метаданные
        currentData.duration = videoObject.duration || currentData.duration || null;
        currentData.width = videoObject.width || currentData.width || null;
        currentData.height = videoObject.height || currentData.height || null;
        currentData.file_size = videoObject.file_size || currentData.file_size || null;
        currentData.mime_type = videoObject.mime_type || currentData.mime_type || 'video/mp4';
        currentData.thumb = videoObject.thumb || currentData.thumb || null;

        // Сохраняем обратно в KV
        await env.LAST_PHOTO_STORAGE.put(KV_KEY, JSON.stringify(currentData), { expirationTtl: 3600 });
        // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

        // 4. Успешное завершение
        await editMessage(chatId, loadingMessageId, `✅ **Поворот видео на ${angle}° завершён.**`, token);

    } catch (error) {
        console.error(`Ошибка при повороте видео: ${error.message}`, error);
        await editMessage(
        chatId,
        loadingMessageId,
        `❌ **Ошибка при повороте видео.** ${error.message.substring(0, 150)}`,
        token
        );
    }
}

async function sendGifToConverterInBackground(chatId, fileId, messageId, envData, token) {
    const RENDER_HOST_URL = envData.LESHIY_CONVERTER;
    try {
        // --- 1. ПОЛУЧАЕМ ИСХОДНЫЕ ДАННЫЕ ИЗ KV ---
        const gifDataRaw = await envData.LAST_PHOTO_STORAGE.get(`${chatId}_last_gif_data`);
        const gifData = gifDataRaw ? JSON.parse(gifDataRaw) : { width: 512, height: 512 };

        // --- 1. ПРОБУЖДЕНИЕ И ПРОВЕРКА СЕРВЕРА ---
        // Используем готовую функцию. Она подождет до 45 сек, пока Render проснется.
        const isAlive = await checkConverterHealth(envData);
        
        if (!isAlive) {
            throw new Error("Конвертер не отвечает. Попробуйте позже, когда сервер проснется.");
        }

        // --- 2. ПОДГОТОВКА ФАЙЛА ---
        const fileInfoResponse = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
        const fileInfo = await fileInfoResponse.json();
        if (!fileInfo.ok) throw new Error('Ошибка получения пути файла');
        
        const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.result.file_path}`;
        const mediaResponse = await fetch(fileUrl);
        const fileBlob = await mediaResponse.blob();

        // --- 3. КОНВЕРТАЦИЯ ---
        const formData = new FormData();
        formData.append('gif', fileBlob, 'input.gif');

        // Отправляем на проснувшийся сервер
        const converterResponse = await envData.LESHIY_CONVERTER.fetch(`${RENDER_HOST_URL}/gif2video`, {
            method: 'POST',
            body: formData
        });

        if (!converterResponse.ok) {
            const errorText = await converterResponse.text();
            throw new Error(`Ошибка конвертера: ${errorText}`);
        }

        const videoBuffer = await converterResponse.arrayBuffer();
        // --- 5. ОТПРАВКА В TELEGRAM (Чтобы получить новый file_id) ---
        const sendFormData = new FormData();
        sendFormData.append('chat_id', chatId);
        const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
        sendFormData.append('video', videoBlob, 'result.mp4');
        sendFormData.append('caption', '✅ Гифка превращена в видео!');

        const tgResponse = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
            method: 'POST',
            body: sendFormData
        });

        const tgResult = await tgResponse.json();
        if (!tgResult.ok) throw new Error(`Ошибка TG: ${tgResult.description}`);

        // Вытаскиваем данные о видео, которые присвоил Telegram
        const sentVideo = tgResult.result.video;

        // --- 6. ЗАПИСЬ МЕТАДАННЫХ В KV (Искореняем бинарник, оставляем JSON) ---
        const videoMetadata = {
            file_id: sentVideo.file_id,
            mime_type: sentVideo.mime_type || "video/mp4",
            file_size: sentVideo.file_size,
            width: sentVideo.width,
            height: sentVideo.height,
            duration: sentVideo.duration,
            thumb: sentVideo.thumb || {}
        };

        // 3. Записываем метаданные как основное "последнее видео"
        await envData.LAST_PHOTO_STORAGE.put(`${chatId}_last_video_data`, JSON.stringify(videoMetadata));
        //await envData.LAST_PHOTO_STORAGE.put(`${chatId}_last_media_type`, "video");
        //await envData.LAST_PHOTO_STORAGE.put(`${chatId}_last_file_id`, sentVideo.file_id);
        //await logDebug('[SUCCESS]', `Видео сохранено в KV через file_id: ${sentVideo.file_id.slice(-8)}`, envData);
    } catch (e) {
        logDebug('[GIF2VIDEO_BG]', e.message, envData);
        await editMessage(chatId, messageId, `❌ Ошибка: ${e.message}`, token);
    }
}

async function sendVideoToGifInBackground(chatId, videoData, messageId, format, envData, token) {
    const RENDER_HOST_URL = envData.LESHIY_CONVERTER;
    try {
        // Прогрев сервера через твой Health Check
        const isAlive = await checkConverterHealth(envData);
        if (!isAlive) throw new Error("Конвертер спит и не хочет просыпаться.");

        // --- 1. ПОЛУЧАЕМ АКТУАЛЬНЫЙ FILE_ID ---
        let targetFileId = videoData?.file_id;

        if (!targetFileId) {
            // Если в текущем событии нет данных, парсим JSON из хранилища
            const storedData = await envData.LAST_PHOTO_STORAGE.get(`${chatId}_last_video_data`);
            if (storedData) {
                try {
                    const parsed = JSON.parse(storedData);
                    targetFileId = parsed.file_id;
                    // Обновляем videoData, чтобы ширина и длительность были доступны ниже
                    videoData = parsed; 
                } catch (e) {
                    await logDebug('[PARSE_ERROR]', 'Не удалось распарсить last_video_data', envData);
                }
            }
        }

        if (!targetFileId) throw new Error('file_id не найден');

        // --- 2. СКАЧИВАЕМ ФАЙЛ ЗАНОВО (Гарантия отсутствия кэша) ---
        const fileInfoResponse = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${targetFileId}`);
        const fileInfo = await fileInfoResponse.json();
        if (!fileInfo.ok) throw new Error('TG не отдал путь');

        const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.result.file_path}`;
        const mediaResponse = await fetch(fileUrl);
        const videoBlob = await mediaResponse.blob();

        await logDebug('[FILE_READY]', `Size: ${videoBlob.size} bytes. Source: Telegram`, envData);

        // --- 3. ПАРАМЕТРЫ С ГИБКИМ ВЕТВЛЕНИЕМ ---
        let startParam = "0";
        let endParam = (parseFloat(videoData.duration) || 3).toString();
        if (parseFloat(endParam) > 5) endParam = "5"; // Ограничение сервера

        let targetWidth;
        if (format === 'mp4') {
            targetWidth = "480"; // Безопасное четное число
            if (parseFloat(endParam) > 3) endParam = "3"; // Лимит стикера
        } else {
            targetWidth = (videoData.width || 480).toString();
        }

        const queryParams = new URLSearchParams({
            start: startParam,
            end: endParam,
            format: format,
            fps: format === 'mp4' ? '30' : '12',
            width: targetWidth
        });

        // --- 4. ОТПРАВКА С УНИКАЛЬНЫМ ИМЕНЕМ ---
        const formDataForServer = new FormData();
        // Уникальное имя гарантирует, что Multer на сервере создаст НОВЫЙ файл
        formDataForServer.append('video', videoBlob, `video-${Date.now()}.mp4`);

        const converterResponse = await envData.LESHIY_CONVERTER.fetch(`${RENDER_HOST_URL}/video2gif?${queryParams.toString()}`, {
            method: 'POST',
            body: formDataForServer
        });

        if (!converterResponse.ok) {
            const errorText = await converterResponse.text();
            await logDebug('[CONVERTER_ERROR]', `Status: ${converterResponse.status}, Msg: ${errorText}`, envData);
            throw new Error(`Конвертер: ${errorText}`);
        }

        const resultBuffer = await converterResponse.arrayBuffer();
        // Логируем запрос для контроля
        logDebug('[CONVERTER_REQUEST]', `Format: ${format}, Width: ${queryParams.get('width')}, Duration: ${endParam-startParam}s`, envData);
        // Сохраняем метаданные гифки после конвертации
        const gifMetadata = {
            file_id: "",
            type: "gif",
            width: videoData.width,
            height: videoData.height
        };
        // Записываем в _last_gif_data
        await envData.LAST_PHOTO_STORAGE.put(`${chatId}_last_gif_data`, JSON.stringify(gifMetadata));

        // И не забываем обновить основной тип медиа
        await envData.LAST_PHOTO_STORAGE.put(`${chatId}_last_media_type`, "animation");
        
        // Отправка результата
        const sendMethod = format === 'gif' ? 'sendAnimation' : 'sendVideo';
        const fieldName = format === 'gif' ? 'animation' : 'video';
        const sendFormData = new FormData();
        sendFormData.append('chat_id', chatId);
        sendFormData.append(fieldName, new Blob([resultBuffer], { type: format === 'gif' ? 'image/gif' : 'video/mp4' }), `result.${format}`);
        sendFormData.append('caption', `✅ Ваша GIF-анимация!`);

        await fetch(`https://api.telegram.org/bot${token}/${sendMethod}`, {
            method: 'POST',
            body: sendFormData
        });

        await deleteMessage(chatId, messageId, token);

    } catch (e) {
        logDebug('[VIDEO2GIF_ERROR]', e.message, envData);
        await editMessage(chatId, messageId, `❌ Ошибка нарезки: ${e.message}`, token);
    }
}

/**
 * ✅ sendMediaToConverterInBackground - Асинхронно скачивает медиа, отправляет на Render для обработки (Resize/Rotate) и обновляет сообщение.
 */
async function sendMediaToConverterInBackground(chatId, fileId, originalMessageId, mode, param, envData, token, ctx, originalReplyMarkup = null) {
    const RENDER_HOST_URL = envData.LESHIY_CONVERTER;
    const chatKey = chatId.toString();
    // 1. ПРОВЕРЯЕМ РЕАЛЬНЫЙ ТИП МЕДИА (самый надежный способ)
    const lastMediaType = await envData.LAST_PHOTO_STORAGE.get(`${chatKey}_last_media_type`);

    // 1. ПРАВИЛЬНОЕ ОПРЕДЕЛЕНИЕ ТИПА (учитываем и ресайз, и поворот)
    const isVideo = lastMediaType === 'video';
    // 1. Сначала ОБЪЯВЛЯЕМ переменные (пустые), чтобы они были видны везде
    let errorMode = '';
    let mimeType = '';
    let mediaType = '';
    let fileName = '';
    let endpoint = '';
    let successMessage = '';
    let formKey = ''; // Добавим сразу и ключ для формы
    const RENDER_TIMEOUT_MS = isVideo ? 180000 : 90000; // 3 мин для видео, 1.5 мин для фото

    if (!RENDER_HOST_URL) {
        // Если переменная хоста пуста, выбрасываем явную ошибку
        throw new TypeError("Критическая ошибка: Конвертер LESHIY_CONVERTER не настроен в ENV."); 
    }
    // 1. ОПРЕДЕЛЕНИЕ РЕЖИМА
    if (mode === RESIZE_VIDEO_MODE) {
        errorMode = 'VIDEO_TO_RESIZE';
        mimeType = 'video/mp4';
        mediaType = 'видео';
        fileName = 'video.mp4';
        endpoint = '/resize-video';
        formKey = 'video';
        successMessage = `✅ Видео изменено до ${param}!`;

    } else if (mode === RESIZE_IMAGE_MODE) {
        errorMode = 'IMAGE_TO_RESIZE';
        mimeType = 'image/jpeg';
        mediaType = 'фото';
        fileName = 'image.jpg';
        endpoint = '/resize-image';
        formKey = 'image';
        successMessage = `✅ Фото изменено до ${param}!`;
        
    } else if (mode === ROTATE_VIDEO_MODE) { // Для поворота видео
        errorMode = 'VIDEO_TO_ROTATE';
        mimeType = 'video/mp4';
        mediaType = 'видео';
        fileName = 'video.mp4';
        endpoint = '/rotate-video';
        formKey = 'video';
        successMessage = `✅ Видео повёрнуто на ${param}°!`;
        
    } else if (mode === ROTATE_IMAGE_MODE) { // Для поворота
        errorMode = 'IMAGE_TO_ROTATE';
        mimeType = 'image/jpeg';
        mediaType = 'фото';
        fileName = 'image.jpg';
        endpoint = '/rotate-image';
        formKey = 'image';
        successMessage = `✅ Фото повёрнуто на ${param}°!`;
    }
    // Формируем URL правильно
    const FINAL_RENDER_URL = `${RENDER_HOST_URL}${endpoint}?${mode.includes('RESIZE') ? 'resolution' : 'angle'}=${param}`

    try {
        // --- 0. Пробуждение Render-сервиса ---
        ctx.waitUntil(logDebug('RESIZE_FLOW', `[${chatId}] Запуск: Пробуждение Render-хоста.`, envData));
        await checkConverterHealth(envData);
        
        // --- 1. Скачиваем исходный файл ---
        await editMessage(chatId, originalMessageId, `🔄 **Обработка ${mediaType}... Скачиваю файл...**`, token);
        ctx.waitUntil(logDebug('RESIZE_FLOW', `[${chatId}] Начинаю скачивание файла.`, envData));
        
        const mediaBuffer = await downloadFileBuffer(fileId, token, envData);
        
        ctx.waitUntil(logDebug('RESIZE_FLOW', `[${chatId}] Скачивание завершено. Размер: ${mediaBuffer.byteLength} байт.`, envData));

        // --- 2. Отправляем на Render ---
        await editMessage(chatId, originalMessageId, `⚙️ **[FFmpeg] ${mediaType} - Обработка...** (Таймаут: ${RENDER_TIMEOUT_MS/60000} мин.)`, token);
        ctx.waitUntil(logDebug('RESIZE_FLOW', `[${chatId}] Отправляю на Render: ${FINAL_RENDER_URL}`, envData));
        // Подготавливаем FormData
        const renderFormData = new FormData();
        // Оборачиваем буфер в Blob, чтобы передать MIME-тип и имя файла
        // Это решает проблему "пустых" файлов на стороне сервера
        const mediaBlob = new Blob([mediaBuffer], { type: mimeType });
        renderFormData.append(formKey, mediaBlob, fileName);

        const renderResponse = await envData.LESHIY_CONVERTER.fetch(FINAL_RENDER_URL, {
            method: 'POST',
            body: renderFormData,
            signal: AbortSignal.timeout(RENDER_TIMEOUT_MS) // Таймаут на всю операцию FFmpeg
        });

        if (!renderResponse.ok) {
            const errorDetails = await renderResponse.text().catch(() => 'Нет деталей');
            throw new Error(`Render API: Status ${renderResponse.status}. Details: ${errorDetails.substring(0, 150)}`);
        }

        const processedBuffer = await renderResponse.arrayBuffer();
        ctx.waitUntil(logDebug('RESIZE_FLOW', `[${chatId}] Render вернул результат. Размер: ${processedBuffer.byteLength} байт.`, envData));

        // --- 3. Загружаем обработанный медиафайл в Telegram ---
        await editMessage(chatId, originalMessageId, `📤 **Загрузка обработанного файла в Telegram...**`, token);

        const caption = successMessage; // Используем то, что определили выше
       
        // --- ФИНАЛЬНАЯ ОТПРАВКА РЕЗУЛЬТАТА ---
        try {
            let responseData;
            let newMediaObject = null; // Объявляем заранее, чтобы не было ReferenceError

            if (mediaType === 'видео') {
                responseData = await sendVideoWithCaption(chatId, processedBuffer, successMessage, token, envData);
                if (responseData && responseData.ok) {
                    newMediaObject = responseData.result.video;
                }
            } else {
                responseData = await sendPhotoWithCaption(chatId, processedBuffer, successMessage, token, envData);
                if (responseData && responseData.ok) {
                    const photoArray = responseData.result.photo;
                    newMediaObject = photoArray && photoArray.length > 0 ? photoArray[photoArray.length - 1] : null;
                }
            }

            // --- ОБНОВЛЕНИЕ KV (С учетом различий структур) ---
            if (newMediaObject) {
                // Мы передаем processedBuffer, чтобы updateMediaKVAfterProcessing 
                // сам решил, делать из него base64 (для фото) или нет (для видео)
                await updateMediaKVAfterProcessing(chatId, newMediaObject, processedBuffer, mode, param, envData);
                
                // Отредактируем старое меню, чтобы пользователь видел статус
                await editMessage(chatId, originalMessageId, `✅ ${mediaType === 'видео' ? 'Видео' : 'Фото'} готово и отправлено!`, token);
            }

        } catch (sendError) {
            ctx.waitUntil(logDebug('RESIZE_CRITICAL', `[${chatId}] Ошибка: ${sendError.message}`, envData));
            await editMessage(chatId, originalMessageId, `❌ Ошибка при отправке: ${sendError.message}`, token);
        }

        // --- 5. Успешное завершение ---
        await editMessage(chatId, originalMessageId, `✅ **Обработка ${mediaType} завершена.**`, token);
        ctx.waitUntil(logDebug('RESIZE_FLOW', `[${chatId}] Операция завершена успешно.`, envData));

    } catch (error) {
        const errorMessage = error.message;
        
        // 🛑 ГАРАНТИРОВАННОЕ ЛОГИРОВАНИЕ ОШИБКИ В АДМИН-ЧАТ (logDebug)
        ctx.waitUntil(logDebug(
            'RESIZE_CRITICAL', 
            `[${chatId}] Ошибка при ${mode}: ${errorMessage.substring(0, 500)} Stack: ${error.stack ? error.stack.substring(0, 500) : 'N/A'}`, 
            envData
        ));
        
        // Сообщение пользователю
        await editMessage(
            chatId,
            originalMessageId,
            `❌ **Ошибка при обработке ${mediaType}!**\n${errorMessage.substring(0, 150)}`,
            token
        );
    }
}

/**
 * @description Обновляет KV с новым file_id, метаданными и base64 после обработки Render-сервисом.
 * @param {number} chatId - ID чата.
 * @param {object} newMediaObject - Объект фото/видео из ответа Telegram (содержит file_id, width, height нового файла).
 * @param {ArrayBuffer} processedBuffer - Байты обработанного медиа.
 * @param {string} mode - Режим (RESIZE_VIDEO_MODE, ROTATE_IMAGE_MODE и т.д. - глобальные константы).
 * @param {string} param - Параметр (разрешение '720p' или угол '90').
 * @param {Object} envData - Объект окружения (содержит KV-биндинг LAST_PHOTO_STORAGE, суффиксы и ctx).
 */
async function updateMediaKVAfterProcessing(chatId, newMediaObject, processedBuffer, mode, param, envData) {
    const isVideo = mode.includes('VIDEO');
    const storage = envData.LAST_PHOTO_STORAGE; 
    const chatKey = chatId.toString();
    const suffix = isVideo ? LAST_VIDEO_DATA_KEY_SUFFIX : LAST_IMAGE_DATA_KEY_SUFFIX; 
    const KV_KEY = chatKey + suffix; 
    
    const newFileId = newMediaObject.file_id;
    if (!newFileId) return;

    let currentData = {};
    try {
        const rawData = await storage.get(KV_KEY);
        currentData = rawData ? JSON.parse(rawData) : {};
    } catch (e) { currentData = {}; }

    // Конвертация в Base64 для превью
    const base64Content = arrayBufferToBase64(processedBuffer); 
    const mimePrefix = isVideo ? 'data:video/mp4;base64,' : 'data:image/jpeg;base64,';
    // Для видео крайне важно затереть СТАРЫЙ URL, иначе бот попытается качать по нему
    if (isVideo) {
        delete currentData.url; // Удаляем протухшую ссылку
        currentData.mime_type = 'video/mp4';
    }
    // Внутри функции обновления KV:
    if (isVideo) {
        // Для видео просто сохраняем метаданные
        currentData.file_id = newFileId;
        currentData.mime_type = 'video/mp4';
        // Можно сохранить маленькое превью, если очень нужно, 
        // но обычно для видео в KV base64 не хранят (слишком жирно)
    } else {
        // Только для фото делаем base64
        const base64Content = arrayBufferToBase64(processedBuffer);
        currentData.base64 = 'data:image/jpeg;base64,' + base64Content;
    }
    // Технические параметры
    //currentData.file_id = newFileId;
    //currentData.base64 = mimePrefix + base64Content;
    currentData.width = newMediaObject.width || currentData.width;
    currentData.height = newMediaObject.height || currentData.height;
    currentData.file_size = newMediaObject.file_id_size || newMediaObject.file_size || currentData.file_size;

    // --- ОБРАБОТКА РАЗРЕШЕНИЙ (включая 2K и 4K) ---
    if (mode.includes('RESIZE')) {
        // Карта соответствия строк и реальной высоты
        const resMap = {
            '240p': 240, '360p': 360, '480p': 480, 
            '580p': 580, '640p': 640, '720p': 720, 
            '1080p': 1080, '1440p': 1440, '2160p': 2160
        };

        const height = resMap[param.toLowerCase()] || parseInt(param);
        if (!isNaN(height)) {
            currentData.height = height;
            // Ширину берем из того, что вернул Telegram после загрузки
            currentData.width = newMediaObject.width || currentData.width;
        }
    } else {
        currentData.width = newMediaObject.width || currentData.width;
        currentData.height = newMediaObject.height || currentData.height;
    }

    // Логика поворота
    if (mode.includes('ROTATE')) {
        const angle = parseInt(param);
        if (Math.abs(angle) % 180 !== 0) {
            [currentData.width, currentData.height] = [currentData.height, currentData.width];
        }
    }

    // Обновляем тип аспекта для фото (чтобы меню знало, куда ставить галочки)
    if (!isVideo) {
        if (currentData.width > currentData.height) currentData.aspect_type = 'landscape';
        else if (currentData.width === currentData.height) currentData.aspect_type = 'square';
        else currentData.aspect_type = 'portrait';
    }

    await storage.put(KV_KEY, JSON.stringify(currentData), { expirationTtl: 3600 });
}


// ----------------------------------------------------
// IV. ГЛАВНЫЙ ОБРАБОТЧИК (WEBHOOK) Fetch
// ----------------------------------------------------
    async function worker_code_fetch(request, env, ctx) {
    // 1. Извлекаем URL и Path
    const url = new URL(request.url);
    const path = url.pathname;
    // 2. Определяем домен
    const workerDomain = url.origin || env.WORKER_DOMAIN;
    if (url.pathname === '/api/kieai-callback' && request.method === 'POST') {
        return handleKieAiCallback(request, env, ctx);
    }
    // -----------------
    // --- KV-ПРОКСИ ---
    // -----------------
    // Проверяем, что путь НАЧИНАЕТСЯ с '/kv-images/'
    if (path.startsWith('/kv-images/')) {
        // Извлекаем ключ, отрезая префикс '/kv-images/'
        const key = path.substring('/kv-images/'.length); 

        // Если ключ пустой (например, запрос был просто /kv-images/), возвращаем 404
        if (!key) {
            return new Response('Image key is missing.', { status: 404 });
        }

        const imageStorage = env.LAST_PHOTO_STORAGE; 

        if (!imageStorage) {
            return new Response('Image storage not configured.', { status: 500 });
        }
        const data = await imageStorage.getWithMetadata(key, { type: 'arrayBuffer' });

        if (data.value === null) {
            return new Response('Image not found.', { status: 404 });
        }

        // Пытаемся получить Content-Type из httpMetadata (который мы установили при сохранении)
        const contentType = data.metadata?.httpMetadata?.contentType || 'image/png';

        return new Response(data.value, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600' // Кэшируем на час
            }
        });
    }
    // Проверяем, что путь РАВЕН '/audio_proxy'
    if (path === '/audio_proxy') {
        const key = url.searchParams.get('key');
        if (key && env.LAST_PHOTO_STORAGE) { 
            const audioBase64 = await env.LAST_PHOTO_STORAGE.get(key);

            if (audioBase64) {
                env.LAST_PHOTO_STORAGE.delete(key); 
                const binaryData = base64ToArrayBuffer(audioBase64); 

                return new Response(binaryData, {
                    headers: {
                        'Content-Type': 'audio/mpeg', 
                        'Content-Length': binaryData.byteLength.toString(),
                        'Cache-Control': 'public, max-age=30' 
                    },
                });
            }
        }
        return new Response('Audio not found or invalid request.', { status: 404 });
    }
    // -----------------------------
    // ✅ ВНЕШНЯЯ СТРАНИЦА WEBHOOKA
    // -----------------------------
    if (request.method !== 'POST') {
        const cdn = "https://storage.yandexcloud.net/leshiy-storage-images";
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <title>Gemini AI Telegram Bot Worker</title>
                <style>
                    body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f0f0f0; }
                    .container { text-align: center; padding: 20px; border-radius: 8px; background: white; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                    h1 { color: #333; }
                    p { color: #555; font-size: 1.2em; }
                    a { color: #007bff; text-decoration: none; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Telegram-бот "Gemini AI" by Leshiy.</h1>
                    <p>Этот Worker предназначен для обработки вебхуков Telegram.</p>
                    <img src="${cdn}/qr-code_geminiai_tg_bot.jpg" alt="QR Code" style="max-width: 300px;">
                    <p>Найди меня в Telegram: <a href="https://t.me/gemini_aitg_bot" target="_blank">@gemini_aitg_bot</a></p>
                </div>
            </body>
            </html>
        `;

        return new Response(htmlContent, {
            headers: { 'Content-Type': 'text/html' },
            status: 200
        });
    } // КОНЕЦ БЛОКА ВНЕШНЕЙ СТРАНИЦЫ WEBHOOKA

    // --- 0. ПЕРЕД ИЗВЛЕЧЕНИЕМ JSON ---
    const update = await request.json().catch(() => ({})); // <--- В ЭТОЙ СТРОКЕ request.body БЫЛ ИСЧЕРПАН

    // -----------------------------------------------------------------------------------
    // ✅ ЕДИНЫЙ БЛОК: УНИВЕРСАЛЬНОЕ ИЗВЛЕЧЕНИЕ ПЕРЕМЕННЫХ
    // -----------------------------------------------------------------------------------
    const isMessage = !!update.message;
    const isCallback = !!update.callback_query;
    const isInlineQuery = !!update.inline_query;
    const isMyChatMember = !!update.my_chat_member;

    // Message object (для текста, фото, видео)
    const message = isMessage ? update.message : isCallback ? update.callback_query.message : null;
    const preCheckoutQuery = update.pre_checkout_query; // <-- НОВОЕ
    const messagePayment = message?.successful_payment; // <-- НОВОЕ

    // ====================================================
    // ⭐️ 0. ОБРАБОТКА ПЛАТЕЖЕЙ (TELEGRAM STARS)
    // ====================================================
    
    // 1. Pre-Checkout (Валидация перед оплатой)
    if (preCheckoutQuery) {
        // Эта строка покажет, что мы достигли блока
        console.log(`Processing pre_checkout_query ID: ${preCheckoutQuery.id} on Worker A.`);
        
        // Выполняем критически важный запрос в фоне
        // Используем вашу функцию answerPreCheckoutQuery с логами
        ctx.waitUntil(answerPreCheckoutQuery(preCheckoutQuery.id, env.TELEGRAM_BOT_TOKEN));
        
        // Мгновенно отвечаем Telegram-у (ОБЯЗАТЕЛЬНО!)
        return new Response('OK', { status: 200 });
    }

    // 2. Successful Payment (Успешная оплата - Начисление)
    if (messagePayment) {
        try { // 🛑 ДОБАВЛЕНО ДЛЯ ОТЛОВА ОШИБКИ И ЗАВЕРШЕНИЯ ТРАНЗАКЦИИ
            console.log("SUCCESSFUL_PAYMENT RECEIVED. Starting credit top-up.");
            
            const payChatId = message.chat.id;
            const totalAmount = messagePayment.total_amount; 
            const payload = messagePayment.invoice_payload;  
            
            // Парсим payload, чтобы узнать, сколько кредитов начислить
            let creditsToAdd = 0;
            if (payload.startsWith('credits_')) {
                // 🔥 ЭТОТ ПАРСИНГ РАБОТАЕТ, если `payload` был правильно сформирован в Шаге 1
                creditsToAdd = parseInt(payload.split('_')[1]);
            }

            if (creditsToAdd > 0) {
                // Используем env.LAST_PHOTO_STORAGE (как в вашем коде)
                const storage = env.LAST_PHOTO_STORAGE; 
                const BALANCE_KEY = payChatId.toString() + '_credit_balance';
                
                // Получаем текущий баланс
                let currentBalance = parseInt(await storage.get(BALANCE_KEY));
                if (isNaN(currentBalance)) currentBalance = 0; // Или FREE_LIMIT, если юзер новый
                
                // Обновляем баланс
                const newBalance = currentBalance + creditsToAdd;
                await storage.put(BALANCE_KEY, newBalance.toString(), { expirationTtl: 3600 * 24 * 365 });

                // 🔥 ДОБАВЛЕНО: Логируем операцию пополнения
                ctx.waitUntil(logTransaction(
                    payChatId, 
                    'TOPUP', 
                    creditsToAdd, 
                    `Покупка за ${totalAmount} XTR (звёзд)`, // totalAmount - это количество Stars
                    env // Передаем объект окружения
                ));
                
                // Уведомляем пользователя
                await sendMessageMarkdown(
                    payChatId, 
                    `✅ **Оплата прошла успешно!**\n\n` +
                    `⭐️ Списано: **${totalAmount}** XTR (звёзд)\n` +
                    `💰 Начислено: **${creditsToAdd}** Кредитов\n` +
                    `💳 Ваш баланс: **${newBalance}** Кредитов`,
                    env.TELEGRAM_BOT_TOKEN // Используем env.TELEGRAM_BOT_TOKEN
                );
            
                // Лог админу
                const adminLog = `💰 [PAYMENT] User ${payChatId} paid ${totalAmount} Stars for ${creditsToAdd} Credits.`;
                ctx.waitUntil(logDebug("PAYMENT_SUCCESS", adminLog, env, ctx));
            }
            return new Response('OK', { status: 200 });
            } catch (e) {
                // 🛑 МЫ ОТЛОВИЛИ КРАХ!
                console.error(`FATAL ERROR during successful_payment: ${e.message} Stack: ${e.stack}`);
                // Уведомим пользователя о сбое начисления, чтобы не потерять его
                ctx.waitUntil(sendMessage(message.chat.id, "? Произошла ошибка при начислении баланса. Ваши Звезды списаны, но баланс не пополнен. Пожалуйста, обратитесь к администратору.", env.TELEGRAM_BOT_TOKEN));
                return new Response('OK', { status: 200 }); // Важно: всегда возвращать 200
            }
        }

    // Callback object
    const callback = update.callback_query;
    const callbackId = isCallback ? callback.id : null;
    // Извлекаем объект пользователя 'from'
    const request_user = isMessage ? update.message.from : 
                            isCallback ? update.callback_query.from : 
                            isMyChatMember ? update.my_chat_member.from :
                            isInlineQuery ? update.inline_query.from :
                            null;

    // Извлекаем ID чата
    const chatId = message ? message.chat.id : (request_user ? request_user.id : null);
    
    // Проверка на отсутствие ID (критично)
    if (chatId === null) { return new Response('OK', { status: 200 }); }

    // -----------------------------------------------------------------------------------
    // ✅ НОВЫЙ БЛОК: ФОРМИРОВАНИЕ ИНФОРМАЦИИ О ПОЛЬЗОВАТЕЛЕ ДЛЯ АДМИНКИ
    // -----------------------------------------------------------------------------------
    let adminLog = '';
    if (request_user) {
        const userId = request_user.id.toString();
        const storage = env.LAST_PHOTO_STORAGE; 
        
        // Новые данные
        const newFirstName = request_user.first_name || ''; 
        const newLastName = request_user.last_name || ''; 
        const newUsername = request_user.username || ''; 
        
        // Формируем новые строки для сравнения
        const newFullName = `${newFirstName} ${newLastName}`.trim(); 
        const displayUsername = newUsername ? `@${newUsername}` : 'нет';
    
        // 1. Асинхронная проверка и запись (только если данные изменились)
        ctx.waitUntil(
            (async () => { // <-- Открываем IIFE
            try {
                // Читаем старые данные
                const oldFullName = await storage.get(`${userId}_USER_FULLNAME`);
                const oldUsername = await storage.get(`${userId}_USER_USERNAME`);
    
                let shouldUpdateFullName = oldFullName !== newFullName;
                let shouldUpdateUsername = oldUsername !== newUsername;
    
                if (shouldUpdateFullName) {
                    // Если имя изменилось (или это первая запись)
                    // Срок жизни - 30 дней
                    await storage.put(`${userId}_USER_FULLNAME`, newFullName, { expirationTtl: 3600 * 24 * 30 });
                }
    
                if (shouldUpdateUsername) {
                    // Если ник изменился (или это первая запись)
                    // Срок жизни - 30 дней
                    await storage.put(`${userId}_USER_USERNAME`, newUsername, { expirationTtl: 3600 * 24 * 30 });
                }
    
                // Опциональное логирование обновления в админ-чат
                if (shouldUpdateFullName || shouldUpdateUsername) {
                    const updateLog = `🔄 [USER-UPDATE] Обновлены данные юзера ${userId}.\n` +
                                        `ФИО: ${oldFullName || '---'} -> ${newFullName || '---'}\n` +
                                        `Ник: ${oldUsername || '---'} -> ${newUsername || '---'}`;
                    await logDebug("USER-UPDATE", updateLog, env, ctx); 
                }
    
            } catch (e) {
                // Ошибка чтения/записи в KV. Логируем, но не блокируем ответ.
                console.error(`KV Check/Put failed for user meta ${userId}:`, e);
                }
            })() // <-- Закрываем IIFE и немедленно его вызываем
        ); // <-- Закрываем аргумент ctx.waitUntil
    
        // Форматируем строку для logDebug, который идет следом (для текущего лога активности)
        adminLog = `👤 Пользователь: *${newFullName || '---'}*\n` +
                    `🔖 Username: \`${displayUsername}\`\n` +
                    `🆔 ID: \`${userId}\`\n` +
                    `💬 Чат ID: \`${chatId}\`\n`;
    }
    // -----------------------------------------------------------------------------------

    // Дополнительные переменные для удобства (Используем message, а не update.message)
    let messageText = message ? (message.text || message.caption || '') : ''; 
    let isEmoji = message ? (message.text || message.caption || '') : ''; 
    let isPhoto = isMessage && message?.photo && message.photo.length > 0;
    let isVoice = isMessage && !!message?.voice;
    let isVideo = isMessage && (!!message?.video || !!message?.video_note);
    let isAnimation = isMessage && !!message?.animation; // Это GIF
    const video = isVideo ? (message?.video || message?.video_note) : undefined;
    const voice = isVoice ? message?.voice : undefined; // Voice object
    const audio = message?.audio; // Аудиофайл (вероятно MP3)
    const animation = isAnimation ? message?.animation : undefined; // Объект GIF
    const document = message?.document; // <--- Документ

    // ✅ ПРОВЕРКА НА GIF ВНУТРИ ДОКУМЕНТОВ (иногда Telegram шлет гифки как файлы)
    if (document && document.mime_type === 'image/gif') {isAnimation = true;}

    // ✅ НОВЫЙ БЛОК ДЛЯ ЭМОДЗИ (Вставить после определения messageText):
    if (isEmoji.length > 0) {
        // Проверяем, является ли сообщение одним из наших эмодзи
        if (EMOJI_TO_COMMAND_MAP[isEmoji]) {messageText = EMOJI_TO_COMMAND_MAP[messageText]};
        // Переназначаем messageText, чтобы далее он выглядел как /команда
    } // 🛑 КОНЕЦ НОВОГО БЛОКА ДЛЯ ЭМОДЗИ

    
    // -----------------------------------------------------------------------------------
    // ✅ ИСПРАВЛЕННЫЙ БЛОК: ОБРАБОТКА user_shared (РЕЗУЛЬТАТ КНОПКИ request_user)
    // -----------------------------------------------------------------------------------
    const isUserShared = isMessage && !!update.message.user_shared; 
    if (isUserShared && chatId.toString() === env.ADMIN_CHAT_ID) { 
        const sharedUserId = update.message.user_shared.user_id;
        const messageToDeleteId = update.message.message_id; // ID сообщения с кнопкой request_user
        const token = env.TELEGRAM_BOT_TOKEN;
        const storage = env.LAST_PHOTO_STORAGE;

        const ADMIN_TARGET_ID_KEY = env.ADMIN_CHAT_ID + '_admin_target_id';
        
        // 1. Сохраняем ID
        await storage.put(ADMIN_TARGET_ID_KEY, sharedUserId.toString(), { expirationTtl: 600 });
        
        // 2. ОТПРАВЛЯЕМ НОВОЕ МЕНЮ СИНХРОННО (message_id: 0)
        // Разметка в handleAdminCallback должна примениться правильно, так как это новое сообщение.
        const fakeCallback = { 
            data: 'admin_user_menu', 
            message: { message_id: 0 } 
        }; 
        
        // ✅ ИСПОЛЬЗУЕМ 'await', чтобы гарантировать, что меню с правильной разметкой 
        // будет отправлено ПЕРВЫМ и отображено.
        await handleAdminCallback(chatId, fakeCallback, env, ctx);
        
        // 3. АСИНХРОННО СКРЫВАЕМ REPLY KEYBOARD
        // Мы отправляем этот запрос с ctx.waitUntil, чтобы он выполнился в фоне, 
        // не задерживая основной ответ, и не вступал в гонку с отправкой меню.
        
        // ⚠️ ВАЖНО: Мы отправляем это как команду скрытия, а не как полезное сообщение.
        ctx.waitUntil(sendMessage(
            chatId, 
            `✅ ID пользователя установлен: ${sharedUserId}`, // Минимальный текст
            token,
            null, // Не редактируем
            { reply_markup: { hide_keyboard: true } } // Только команда скрытия
        ));
        
        // 4. Опционально: Удаляем исходное сообщение, которое вернуло user_shared (для чистоты)
        // Если у вас есть функция deleteMessage, это будет еще чище.
        // ctx.waitUntil(deleteMessage(chatId, messageToDeleteId, token));

        return new Response('OK', { status: 200 });
    }
    // ---------------------
    // 🛑 БЛОК ДЕДУПЛИКАЦИИ
    // ---------------------
    // 1. Асинхронное чтение глобального статуса
    let isDebugEnabled = false; 
    let isPhotoEnabled = false; 
    let isVideoEnabled = false;        
    let isTTSEnabled = false; 
    try {
        const debugStatus = await env.LAST_PHOTO_STORAGE.get(GLOBAL_DEBUG_KEY);
        isDebugEnabled = debugStatus === 'true';
        const photoStatus = await env.LAST_PHOTO_STORAGE.get(GLOBAL_PHOTO_KEY); 
        isPhotoEnabled = photoStatus === 'true'; 
        const videoStatus = await env.LAST_PHOTO_STORAGE.get(GLOBAL_VIDEO_KEY); 
        isVideoEnabled = videoStatus === 'true'; 
        const ttsStatus = await env.LAST_PHOTO_STORAGE.get(GLOBAL_TTS_KEY); 
        isTTSEnabled = ttsStatus === 'true'; 
    } catch (e) {
        console.error("Failed to read debug status from KV:", e);
    }
    
    // -----------------------------------------------------------------------------------
    // ✅ ВЫЗОВ LOGDEBUG ДЛЯ ОТПРАВКИ ИНФОРМАЦИИ О ПОЛЬЗОВАТЕЛЕ
    // -----------------------------------------------------------------------------------
    // Логируем информацию о пользователе только если это сообщение/команда
    // и только если мы не обрабатываем callback_query, где юзер известен.
    // Если вам нужен лог на КАЖДЫЙ чих, оставьте его здесь.
    // if (request_user && !isCallback) {
    //    // Отправляем лог в админский чат асинхронно
    //    ctx.waitUntil(logDebug("USER_INFO", adminLog, env, ctx));
    //}

    // -----------------------------------------------------------------------------------
    // ✅ ИНИЦИАЛИЗАЦИЯ ENV DATA (Используем новые переменные)
    // -----------------------------------------------------------------------------------
    const envData = {
        VERSION: VERSION, // <--- КОНСТАНТА ВЕРСИИ в envData
        TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN, // Токен для телеги
        // API-ключи из секретных переменных
        GEMINI_API_KEY: env.GEMINI_API_KEY,
        LESHIY_AI_PROXY: env.LESHIY_AI_PROXY,
        GEMINI_PROXY_KEY: env.GEMINI_PROXY_KEY,
        GEMINI_PROXY: env.GEMINI_PROXY,
        FALLBACK_PROXY: env.FALLBACK_PROXY,
        DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY,
        BOTHUB_API_KEY: env.BOTHUB_API_KEY,
        KIEAI_API_KEY: env.KIEAI_API_KEY,
        LAST_PHOTO_STORAGE: env.LAST_PHOTO_STORAGE,
        CHAT_HISTORY_STORAGE: env.CHAT_HISTORY_STORAGE,
        DEBUG_CHAT_ID: env.DEBUG_CHAT_ID,
        ADMIN_CHAT_ID: env.ADMIN_CHAT_ID,
        BOT_LOGS_STORAGE: env.BOT_LOGS_STORAGE, 
        AI_MODELS: AI_MODELS,
        AI: env.AI,
        ctx: ctx, 
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID, 
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN, 
        FUSIONBRAIN_API_KEY: env.FUSIONBRAIN_API_KEY, 
        FUSIONBRAIN_SECRET_KEY: env.FUSIONBRAIN_SECRET_KEY, 
        VOICERSS_API_KEY: env.VOICERSS_API_KEY,
        STABILITY_API_KEY: env.STABILITY_API_KEY,
        LAST_PROMPT_KEY_SUFFIX: LAST_PROMPT_KEY_SUFFIX,
        LAST_IMAGE_DATA_KEY_SUFFIX: LAST_IMAGE_DATA_KEY_SUFFIX,
        LAST_VIDEO_DATA_KEY_SUFFIX: LAST_VIDEO_DATA_KEY_SUFFIX,
        LAST_PROMPT_MESSAGE_ID_KEY_SUFFIX: LAST_PROMPT_MESSAGE_ID_KEY_SUFFIX,
        LAST_ACTION_KEY_SUFFIX: LAST_ACTION_KEY_SUFFIX,
        USER_STATE_KEY_SUFFIX: USER_STATE_KEY_SUFFIX,
        LAST_PROMPT_LANG_KEY_SUFFIX: LAST_PROMPT_LANG_KEY_SUFFIX, 
        CREATIVE_MODE_KEY_SUFFIX: CREATIVE_MODE_KEY_SUFFIX,
        DEBUG_ENABLED: isDebugEnabled, 
        TTS_ENABLED: isTTSEnabled, 
        PHOTO_ENABLED: isPhotoEnabled, 
        VIDEO_ENABLED: isVideoEnabled, 
        PAYMENT_LINK: PAYMENT_LINK,
        WORKER_DOMAIN: env.WORKER_DOMAIN,
        LESHIY_CONVERTER: env.LESHIY_CONVERTER,
        PUBLIC_COMMANDS: PUBLIC_COMMANDS,
        ADMIN_COMMANDS: ADMIN_COMMANDS,
        // !!! КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: ИСПОЛЬЗУЕМ НОВЫЕ ПЕРЕМЕННЫЕ !!!
        USER_ID: request_user.id, 
        CHAT_ID: chatId,
        USER_API_KEY_SUFFIX: USER_API_KEY_SUFFIX, 
        USER_LIMIT_KEY_SUFFIX: USER_LIMIT_KEY_SUFFIX,
        SET_BASE_CALLBACK: SET_BASE_CALLBACK, 
    };

    const storage = envData.LAST_PHOTO_STORAGE;
    const chatKey = chatId.toString();
    // 🛑 ИСПРАВЛЕНИЕ: ПЕРЕНОС ОПРЕДЕЛЕНИЯ ПЕРЕМЕННЫХ КЛЮЧЕЙ KV В ОБЩУЮ ЗОНУ
    const USER_API_KEY_KV = chatKey + envData.USER_API_KEY_SUFFIX; 
    const USER_LIMIT_KEY = chatKey + envData.USER_LIMIT_KEY_SUFFIX;
    const userApiKey = await envData.LAST_PHOTO_STORAGE.get(USER_API_KEY_KV);
    // --- БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ ТЕКСТА И КОМАНДЫ (Используя уже определенный messageText) ---
    const text = messageText; // Используем переменную messageText, которая уже гарантированно строка ('')
    const isCommand = text.startsWith('/');
    const [command] = isCommand ? text.split(' ') : ['']; 
    // Если text пустая строка, isCommand = false, command = ''. Сбоя не будет.

    // ----------------------
    // --- ЛОГИКА СТЭЙТОВ ---
    // ----------------------
    
    // ПЕРЕХВАТ ДЛЯ РЕЖИМА /say ---
    const token = envData.TELEGRAM_BOT_TOKEN;
    const LAST_ACTION_KEY = chatKey + envData.LAST_ACTION_KEY_SUFFIX; 
    const currentAction = await storage.get(LAST_ACTION_KEY); // Чтение текущего состояния экшена

    if (currentAction === 'awaiting_say_text') {
        let fullText = '';
        
    // 🛑 1. ПЕРЕХВАТ ГОЛОСОВОГО СООБЩЕНИЯ (OGG)
    if (update.message.voice) {
        const voiceFileId = update.message.voice.file_id; // <-- Извлекаем ID OGG

    // ВОТ ЗДЕСЬ PUT ДЛЯ СОХРАНЕНИЯ ID ИСХОДНОГО OGG
    // Этот ID будет использоваться при нажатии кнопки 'Запустить озвучку'
    ctx.waitUntil(storage.put(chatKey + SAY_VOICE_SOURCE_ID_SUFFIX, voiceFileId));
    
    // --- Логика STT: Распознавание OGG для заполнения поля "Текст:" ---
    
    const loadingMessage = await sendMessageMarkdown(chatId, "🎙️ **Распознавание голосового сообщения...**", token);
    const loadingMessageId = loadingMessage.result.message_id;

    try {
        // Загружаем активную STT-конфигурацию
                    
        const sttResult = await loadActiveConfig('AUDIO_TO_TEXT', envData, chatId); 
        const a2tConfig = sttResult.config; 

        // Скачиваем исходный OGG (используем его для STT, чтобы избежать ошибок BotHub)
        const filePath = await getTelegramFilePath(voiceFileId, token); 
        const audioBuffer = await downloadTelegramFile(filePath, token); 

        // Вызываем STT (3 аргумента: config, audioBuffer, envData)
        fullText = await a2tConfig.FUNCTION(a2tConfig, audioBuffer, envData);
        
        // Удаляем сообщение "Распознавание..."
        ctx.waitUntil(deleteMessage(chatId, loadingMessageId, token)); 

    } catch (e) {
        fullText = "❌ Ошибка STT. Используйте текст или повторите.";
        console.error("STT для меню /say провалился:", e);
        // Редактируем сообщение с ошибкой
        await editMessage(chatId, loadingMessageId, `❌ **Ошибка распознавания:**\n\`${e.message.substring(0, 100)}\``, token);
        // Важно: продолжаем, чтобы сохранить хотя бы статус ошибки.
    }
    
    } else {
        // 2. ОБРАБОТКА ОБЫЧНОГО ТЕКСТА
        fullText = update.message.text || update.message.caption || '';
    }
    
    // 3. Сохраняем введенный/распознанный текст в SAY_TEXT_KEY
    ctx.waitUntil(storage.put(chatKey + SAY_TEXT_KEY_SUFFIX, fullText)); 
    
    // 4. Очищаем режим ожидания (критично!)
    ctx.waitUntil(storage.delete(chatKey + envData.LAST_ACTION_KEY_SUFFIX));
    
    // 5. Отправляем НОВОЕ СООБЩЕНИЕ-ПОДТВЕРЖДЕНИЕ и НОВОЕ МЕНЮ
    const currentVoice = await storage.get(chatKey + SAY_VOICE_KEY_SUFFIX) || DEFAULT_VOICE;
    
    // Если STT был успешным, подтверждаем
    if (!fullText.includes("Ошибка STT")) {
        await sendMessageMarkdown(chatId, "✅ **Текст сохранен.** Нажмите 'Запустить озвучку' в меню.", token);
    }
    
    // Отправляем новое меню с обновленным текстом
    await sendSayControlMenu(chatId, token, currentVoice, fullText, null); 

    return new Response('OK', { status: 200 });
    } // КОНЕЦ ЛОГИКИ ПЕРЕХВАТА ДЛЯ РЕЖИМА /say

    // ПРОВЕРКА СОСТОЯНИЯ ЧАТА (ОЖИДАНИЕ ВВОДА КЛЮЧА?)
    const USER_STATE_KEY = chatKey + envData.USER_STATE_KEY_SUFFIX; 
    const userState = await storage.get(USER_STATE_KEY); // Чтение текущего состояния стэйта
    if (userState === 'awaiting_apikey') {
        const potentialKey = messageText.trim();
        const token = envData.TELEGRAM_BOT_TOKEN;
        // --- 1. Обработка отмены (только планируем) ---
        if (potentialKey === '❌ Отменить ввод') {
            const cancelPromise = (async () => {
                await storage.delete(USER_STATE_KEY);
                const removeKeyboard = { reply_markup: { remove_keyboard: true } };
                // Используем await для отправки сообщения
                await sendMessage(chatId, "✅ Ввод ключа отменен.", token, removeKeyboard);
            })();
            ctx.waitUntil(cancelPromise);
            return new Response('OK', { status: 200 }); // Немедленно отвечаем OK
        }
        // --- 2. СИНХРОННАЯ ПРОВЕРКА АРГУМЕНТОВ ---
        if (!potentialKey || potentialKey.length < 32) {
            const errorPromise = (async () => {
                await sendMessageMarkdown(chatId, "❌ **Ошибка:** Неверный формат ключа. Проверьте длину и пробелы.", token);
                await storage.delete(USER_STATE_KEY); // Сбрасываем состояние после ошибки
            })();
            ctx.waitUntil(errorPromise);
            return new Response('OK', { status: 200 }); // Немедленно отвечаем OK
        }
        // --- 3. АСИНХРОННАЯ ЛОГИКА (Проверка и сохранение ключа) ---
        const setKeyPromise = (async () => {
            let userKieAiBalance = 0;
            let balanceResult;
            try {
                // 🛑 ИСПРАВЛЕНИЕ: Используем await для получения результата fetch!
                balanceResult = await updateKieAiUserCredits(potentialKey, envData, ctx); 
            } catch (e) {
                // Обработка критической ошибки сети
                const errorMessage = e.message || "Неизвестная ошибка сети.";
                await sendMessageMarkdown(chatId, 
                    `❌ **КРИТИЧЕСКАЯ ОШИБКА FETCH!**\n\nПроблема при проверке баланса: \`${errorMessage}\``, 
                    token);
                balanceResult = 0;
            }
            // Логика обработки недействительного ключа (401)
            if (typeof balanceResult === 'string' && balanceResult === 'InvalidKey') {
                await storage.delete(USER_STATE_KEY); 
                const removeKeyboard = { reply_markup: { remove_keyboard: true } };
                return sendMessageMarkdown(chatId, "❌ **Ошибка:** Введенный API-ключ KIE.ai недействителен (401 Unauthorized). Проверьте ключ и попробуйте снова.", token, removeKeyboard);
            }
            userKieAiBalance = (typeof balanceResult === 'number') ? balanceResult : 0;
            const creditWord = pluralize(userKieAiBalance, CREDIT_FORMS);
            // --- 4. СОХРАНЕНИЕ КЛЮЧА, БАЛАНСА И СБРОС СОСТОЯНИЯ ---
            await storage.put(USER_API_KEY_KV, potentialKey); 
            await storage.put(USER_LIMIT_KEY, userKieAiBalance.toString());
            await storage.delete(USER_STATE_KEY); // Удаляем состояние
            // 5. Отправка финального сообщения
            let responseMessage = `✅ **API-ключ KIE.ai успешно установлен!**\n` + 
                                `🔑 Ключ: \`${potentialKey.substring(0, 10)}...\`\n` +
                                `💰 **Текущий баланс:** **${userKieAiBalance}** ${creditWord}.\n\n` +
                                `Вы будете использовать лимиты, связанные с этим ключом.`;
            
            const removeKeyboard = { reply_markup: { remove_keyboard: true } };
            await sendMessageMarkdown(chatId, responseMessage, token, removeKeyboard);
        })(); // Конец setKeyPromise
        // 6. Планируем выполнение и немедленно отвечаем OK
        ctx.waitUntil(setKeyPromise);
        return new Response('OK', { status: 200 }); 
    } // КОНЕЦ БЛОКА ПРОВЕРКИ СОСТОЯНИЯ ЧАТА
    // Если состояние не "awaiting_apikey", код продолжает выполнение

    // --------------------------------------------------------------------------------------
    // --- ГЛАВНЫЙ БЛОК ОБРАБОТКИ С TRY...CATCH ДЛЯ ГЛОБАЛЬНЫХ ОШИБОК ---
    // --------------------------------------------------------------------------------------
    try {
        // 1. ОБРАБОТКА КОМАНД (ТОЛЬКО TEXT-COMMANDS)
        if (messageText.startsWith('/')) {
            // --- СПЕЦИАЛЬНАЯ ОБРАБОТКА ДЛЯ /activate_ [код] ---
            // Используем startsWith, чтобы избежать попадания в 'default' switch
            if (messageText.startsWith('/activate_')) {
                ctx.waitUntil(processUserActivationCommand(chatId, messageText, envData));
                return new Response('OK', { status: 200 });
            }
            // --- НОВАЯ КОМАНДА: ВВОД API КЛЮЧА ПОЛЬЗОВАТЕЛЯ ---
            if (messageText.startsWith('/setkey ') || messageText.startsWith('/apikey ')) {
                const parts = messageText.split(' ');
                const newApiKey = parts[1];
                
                // Переменные, которые должны быть доступны
                const chatKey = chatId.toString();
                const storage = envData.LAST_PHOTO_STORAGE;
                const token = env.TELEGRAM_BOT_TOKEN;
            
                const USER_API_KEY_KV = chatKey + envData.USER_API_KEY_SUFFIX; 
                const USER_LIMIT_KEY = chatKey + envData.USER_LIMIT_KEY_SUFFIX; 
            
                // 1. СИНХРОННАЯ ПРОВЕРКА АРГУМЕНТОВ
                if (!newApiKey || newApiKey.length < 32) {
                    ctx.waitUntil(sendMessageMarkdown(chatId, "❌ **Ошибка:** Неверный формат ключа. Используйте `/setkey <ВАШ_КЛЮЧ>`.", token, { parse_mode: 'Markdown' }));
                    // 🛑 КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Немедленно отвечаем OK и прерываем ВСЁ выполнение.
                    return new Response('OK', { status: 200 }); 
                }
                
                // 2. АСИНХРОННАЯ ЛОГИКА (Оборачиваем в Promise для ctx.waitUntil)
                const setKeyPromise = (async () => {
                    let balance = 0;
                    let balanceResult;
            
                    try {
                        balanceResult = await updateKieAiUserCredits(newApiKey, envData, ctx); 
                    } catch (e) {
                        const errorMessage = e.message || "Неизвестная ошибка сети (catch).";
                        
                        await sendMessageMarkdown(chatId, 
                            `❌ **КРИТИЧЕСКАЯ ОШИБКА FETCH!**\n\n` + 
                            `Проблема при проверке баланса. **Детали ошибки:** \`${errorMessage}\`\n\n` + 
                            `**ПРОВЕРЬТЕ ПЕРЕМЕННУЮ KIEAI_BASE_URL** в настройках Worker'а.\n` + 
                            `Ключ сохранен, баланс установлен в 0.`, 
                            token, 
                            { parse_mode: 'Markdown' }
                        );
                        
                        balanceResult = 0;
                    }
            
                    if (typeof balanceResult === 'string' && balanceResult === 'InvalidKey') {
                        return sendMessageMarkdown(chatId, "❌ **Ошибка:** Введенный API-ключ KIE.ai недействителен (401 Unauthorized). Проверьте ключ и попробуйте снова.", token, { parse_mode: 'Markdown' });
                    }
                    
                    if (typeof balanceResult === 'number') {
                        balance = balanceResult;
                    } else {
                        balance = 0; 
                    }
                    
                    // --- ШАГ 2: СОХРАНЕНИЕ КЛЮЧА И БАЛАНСА В KV ---
                    await storage.put(USER_API_KEY_KV, newApiKey);
                    await storage.put(USER_LIMIT_KEY, balance.toString());
                    const creditWord = pluralize(balance, CREDIT_FORMS);
                    let responseMessage = `✅ **API-ключ KIE.ai успешно установлен!**\n` + 
                                            `🔑 Ключ: \`${newApiKey.substring(0, 10)}...\`\n` +
                                            `💰 **Текущий баланс:** **${balance}** ${creditWord}.\n\n` +
                                            `Вы будете использовать лимиты, связанные с этим ключом.`;
            
                    return sendMessageMarkdown(chatId, responseMessage, token, { parse_mode: 'Markdown' });
                })();
            
                // 3. Планируем выполнение и немедленно отвечаем OK
                ctx.waitUntil(setKeyPromise);
                // 🛑 КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Немедленно отвечаем OK и прерываем ВСЁ выполнение.
                return new Response('OK', { status: 200 }); 
            }
            // --- СТАНДАРТНЫЕ КОМАНДЫ ---
            // Удаляем пробелы и регистронезависимо сравниваем (только имя команды)
            const command = messageText.split(' ')[0].toLowerCase();
            const text = update.message.text.trim(); // Получаем текст сообщения
            // ОБЯЗАТЕЛЬНОЕ ИСПРАВЛЕНИЕ: Объявление fullText
            const fullText = text; // Сохраняем весь исходный текст команды

            switch (command) {
                case '/start':
                    ctx.waitUntil(processStartCommand(chatId, envData, envData.TELEGRAM_BOT_TOKEN));
                    break;
                case '/buy':
                case '/stars':
                    ctx.waitUntil(sendBuyMenu(chatId, envData.TELEGRAM_BOT_TOKEN));
                    break;
                case '/balance':
                    // --- АСИНХРОННЫЙ ВЫЗОВ: ПОЛУЧАЕМ СТАТУС БАЛАНСА ---
                    const balanceStatus = await getCurrentCreditBalance(chatId, envData.LAST_PHOTO_STORAGE);
                    // ---------------------------------------------
                    const statusLine = `💰 **Баланс:** ${balanceStatus}`;

                    // 3. Формируем текст сообщения (messageText должен быть объявлен через let выше)
                    messageText = `
💰 Меню управления балансом:

Ваш текущий баланс: 💰 ${balanceStatus}.

Для покупки новых кредитов нажмите 💰 Пополнить баланс.`;

                    // 4. Создаем объект клавиатуры
                    const balanceKeyboard = getBalanceKeyboard();

                    // 5. Отправляем сообщение с клавиатурой, используя проверенный 5-аргументный вызов
                    // ПЕРЕДАЕМ ТОЛЬКО МАССИВ КНОПОК
                    ctx.waitUntil(sendMessageWithKeyboard(
                        chatId, 
                        messageText, 
                        envData.TELEGRAM_BOT_TOKEN, 
                        balanceKeyboard.inline_keyboard
                    ));
                    break;
                case '/upscale': {
                    /*/ 1. Получаем текст и объект клавиатуры
                    const { messageText, keyboardObject } = await getUpscaleImageMenuKeyboard(
                        chatId, 
                        envData.LAST_PHOTO_STORAGE,
                        null,
                        null
                    );
                    // 2. ОТПРАВКА: Используем ВАШУ функцию, передавая ТОЛЬКО МАССИВ КНОПОК
                    await sendMessageWithKeyboard(
                        chatId, 
                        messageText, 
                        envData.TELEGRAM_BOT_TOKEN,
                        keyboardObject.inline_keyboard // 💡 КОРРЕКЦИЯ: Передаем только внутренний массив
                    );*/
                    await sendUpscaleMenu(chatId, envData.TELEGRAM_BOT_TOKEN, envData.LAST_PHOTO_STORAGE, envData, ctx);
                    return new Response('OK', { status: 200 });
                }
                case '/resize':
                    await sendResizeMenu(chatId, envData.TELEGRAM_BOT_TOKEN, envData.LAST_PHOTO_STORAGE, envData, ctx);
                    return new Response('OK', { status: 200 });
                case '/test':
                    // === ТЕСТ: КОНТРОЛИРУЕМЫЙ СБОЙ (ФИНАЛЬНАЯ ПРОВЕРКА) ===
                    if (chatId.toString() === envData.ADMIN_CHAT_ID) {
                        
                        console.log('[DEBUG] ANTI_FLOOD_TEST_TRIGGER: Запуск контролируемого сбоя (500).');
                        
                        // 1. Делаем небольшую паузу, чтобы гарантировать запись ключа Anti-Flood
                        await new Promise(r => setTimeout(r, 100)); 
                        
                        // 2. Принудительно вызываем ошибку, которая попадет в глобальный обработчик (catch) Worker'а.
                        // Глобальный обработчик отправит 500/Timeout и заставит Telegram повторить.
                        throw new Error('ANTI_FLOOD_TEST_TRIGGER_ERROR'); 
                    }
                    break;
                case '/render':
                    await sendMessage(chatId, "⏳ Запускаю проверку системы...", envData.TELEGRAM_BOT_TOKEN);

                    // 1. Проверка Render-сервиса
                    const renderAvailable = await checkConverterHealth(envData); // Передаем envData, т.к. функция его требует

                    const renderStatus = renderAvailable 
                        ? "🟢 **Render-сервис:** Активен и готов к работе."
                        : "🔴 **Render-сервис:** Недоступен/Спит. Требуется ~30 сек на запуск.";
                    
                    await sendMessageMarkdown(chatId, renderStatus, envData.TELEGRAM_BOT_TOKEN);
                    break;
                case '/media':
                    // Вызываем основную функцию для отображения меню
                    await sendMediaDataControlMenu(chatId, envData.TELEGRAM_BOT_TOKEN, envData, null);
                    break;
                case '/apikey': {
                    // Весь блок, содержащий await, должен быть обернут в Promise для ctx.waitUntil()
                    const apikeyPromise = (async () => {
                        // !!! await OK, так как находится ВНУТРИ асинхронной функции
                        let currentCredits = parseInt(await envData.LAST_PHOTO_STORAGE.get(USER_LIMIT_KEY)) || 0;
                        const creditWord = pluralize(currentCredits, CREDIT_FORMS);
                        let statusMessage = '🔑 **Меню управления API-ключом KIE.ai**\n\n';
                    
                        if (userApiKey) {
                            statusMessage += `✅ **Статус ключа:** установлен\n` +
                                            `🔐 Ваш личный ключ: \`${userApiKey.substring(0, 10)}...\`\n` +
                                            `💰 **Баланс:** **${currentCredits}** ${creditWord}.\n\n` +
                                            `Вы используете лимиты и баланс, связанные с этим ключом. Отслеживайте его в личном кабинете https://kie.ai/ru/usage`;
                        } else {
                            statusMessage += `❌ **Статус ключа:** отсутствует\n` +
                                            `🔒 Личный ключ не установлен.\n` +
                                            `Вы используете общий (административный) ключ.`;
                        }
                    
                        const keyboard = {
                            inline_keyboard: [
                                [{ text: "🏠 Открыть главное меню /start", callback_data: "start_command" }],
                                [{ text: "📊 Проверить баланс", callback_data: "cmd:/checkkey" }],
                                [{ text: "🔑 Установить/Заменить ключ", callback_data: "cmd:/setkey" }],
                                [{ text: "🗑️ Удалить ключ", callback_data: "cmd:/delkey" }]
                            ]
                        };
                        
                        // !!! Возвращаем промис отправки сообщения
                        return sendMessageMarkdown(chatId, statusMessage, envData.TELEGRAM_BOT_TOKEN, null, keyboard);
                    })();
        
                    ctx.waitUntil(apikeyPromise); // Планируем выполнение
                    break;
                }
        
                case '/setkey':
                    // Это заглушка, если нажали кнопку без аргументов. Она не требует await.
                    ctx.waitUntil(sendMessageMarkdown(chatId, 
                        "🔑 **Ввод API-ключа KIE.ai**\n\n" +
                        "Введите команду в следующем формате:\n" +
                        "`/setkey <ВАШ_КЛЮЧ>`\n\n" +
                        "Ключ можно получить на сайте: https://kie.ai/ru/api-key (выдается 80 бесплатных кредитов).", 
                        envData.TELEGRAM_BOT_TOKEN 
                    ));
                    break;
                    
                case '/checkkey': {
                    // Весь блок, содержащий await, должен быть обернут в Promise для ctx.waitUntil()
                    const checkKeyPromise = (async () => {
                        // !!! await OK, так как находится ВНУТРИ асинхронной функции
                        let currentCredits = parseInt(await envData.LAST_PHOTO_STORAGE.get(USER_LIMIT_KEY)) || 0;
                        let statusMessage = '';
                        
                        if (userApiKey) {
                            statusMessage = `✅ **Статус ключа KIE.ai:**\n` +
                                            `🔐 Ваш личный ключ установлен: \`${userApiKey.substring(0, 10)}...\`\n` +
                                            `💰 **Баланс кредитов:** **${currentCredits}**.\n\n` +
                                            `Вы будете использовать лимиты, связанные с этим ключом.`;
                        } else {
                            statusMessage = `❌ **Статус ключа KIE.ai:**\n` +
                                            `🔒 Ваш личный ключ не найден.\n` +
                                            `Вы используете общий (административный) ключ с общим лимитом. Используйте /setkey <КЛЮЧ> для установки личного ключа.`;
                        }
                        // !!! Возвращаем промис отправки сообщения
                        return sendMessageMarkdown(chatId, statusMessage, envData.TELEGRAM_BOT_TOKEN);
                    })();
        
                    ctx.waitUntil(checkKeyPromise); // Планируем выполнение
                    break;
                }
        
                case '/delkey': {
                    // Весь блок, содержащий await, должен быть обернут в Promise для ctx.waitUntil()
                    const delKeyPromise = (async () => {
                        if (!userApiKey) {
                            return sendMessageMarkdown(chatId, "❌ **Ошибка:** API-ключ KIE.ai не установлен.", envData.TELEGRAM_BOT_TOKEN);
                        }
                        // !!! await OK
                        await envData.LAST_PHOTO_STORAGE.delete(USER_API_KEY_KV);
                        await envData.LAST_PHOTO_STORAGE.delete(USER_LIMIT_KEY);
                        return sendMessageMarkdown(chatId, "✅ **API-ключ KIE.ai успешно удален.**\nБаланс обнулен...", envData.TELEGRAM_BOT_TOKEN);
                    })();
        
                    ctx.waitUntil(delKeyPromise); // Планируем выполнение
                    break;
                }
                case '/stop':
                    ctx.waitUntil(processStopCommand(chatId, envData.LAST_PHOTO_STORAGE, envData.TELEGRAM_BOT_TOKEN, envData));
                    break;
                case '/say': // Добавляем новый case для команды /say
                    // Используем await, так как нам нужно дождаться отправки аудио
                    await processSayCommand(chatId, fullText, envData, ctx);
                    break;
                case '/avatar':
                    // 1. Установим режим на AUDIO_TO_VIDEO (A2V)
                    //const modeKey = 'ACTIVE_MODEL_AUDIO_TO_VIDEO'; // Ваш KV ключ для режима A2V
                    //await envData.LAST_PHOTO_STORAGE.put(chatId, modeKey);
                    
                    // 2. Получаем текущий промпт пользователя (или дефолтный)
                    const currentPrompt = await envData.LAST_PHOTO_STORAGE.get(chatId + envData.LAST_PROMPT_KEY_SUFFIX) || DEFAULT_AUDIO_PROMPT;

                    // 3. Получаем активную конфигурацию модели (AUDIO_TO_VIDEO_KIEAI)
                    const activeModelConfig = envData.AI_MODELS['AUDIO_TO_VIDEO_KIEAI'];
                    
                    if (!activeModelConfig) {
                        await sendMessage(chatId, "❌ Ошибка конфигурации: Модель AUDIO_TO_VIDEO_KIEAI не найдена.", envData.TELEGRAM_BOT_TOKEN);
                        return new Response('OK');
                    }

                    // 4. Запускаем генерацию A2V
                    await sendMessageMarkdown(chatId, `⏳ Запускаем Audio-to-Video (A2V) с промптом: \n\`${currentPrompt.substring(0, 100)}...\``, envData.TELEGRAM_BOT_TOKEN);

                    // Параметры видео (пока используем дефолтные или пустые)
                    const videoParams = {
                        resolution: activeModelConfig.DEFAULT_RESOLUTION || '480p'
                    };

                    try {
                        // Вызываем нашу функцию
                        const result = await startKieAiAudio2Video(
                            activeModelConfig, 
                            currentPrompt, 
                            envData, 
                            videoParams,
                            chatId
                        );

                        if (result && result.taskId) {
                            await sendMessage(chatId, `✅ **Задача A2V запущена!** Task ID: \`${result.taskId}\`. Ожидайте уведомления с готовым видео.`, envData.TELEGRAM_BOT_TOKEN);
                        } else {
                            // Если startKieAiAudio2Video вернула null (ошибка уже отправлена пользователю внутри функции)
                            await sendMessage(chatId, "❌ Не удалось создать задачу A2V. Проверьте наличие фото/аудио.", envData.TELEGRAM_BOT_TOKEN);
                        }
                        
                    } catch (error) {
                        // Критическая ошибка на уровне вызова
                        envData.ctx.waitUntil(logDebug('A2V_CRITICAL_FAIL', error.message, envData));
                        await sendMessage(chatId, `❌ Критическая ошибка при запуске A2V: ${error.message.substring(0, 150)}`, envData.TELEGRAM_BOT_TOKEN);
                    }
                    break;
                case '/prompt':
                    ctx.waitUntil(processPromptCommand(chatId, envData.TELEGRAM_BOT_TOKEN, envData.LAST_PHOTO_STORAGE, envData));
                    break;
                case '/create':
                    // --- ИНИЦИАЛИЗАЦИЯ ПЕРЕМЕННЫХ ---
                    const storage = env.LAST_PHOTO_STORAGE;
                    const chatKey = chatId.toString();
                    const LAST_PROMPT_KEY = chatKey + envData.LAST_PROMPT_KEY_SUFFIX;
                    const CREATIVE_MODE_KEY = chatKey + envData.CREATIVE_MODE_KEY_SUFFIX
                    const token = envData.TELEGRAM_BOT_TOKEN; 
                    
                    const inlinePrompt = messageText.replace(/^\/create\s*/i, '').trim();
        
                    if (inlinePrompt.length > 0) {
                        // Сценарий 2: /create [текст] -> СРАЗУ ГЕНЕРАЦИЯ
                        await processCreateCommand(chatId, inlinePrompt, token, storage, envData);
                        
                    } else {
                        // Сценарий 1: /create (пусто) -> ОТКРЫТЬ МЕНЮ
                        
                        // Читаем сохраненный промпт для отображения в меню
                        const currentPrompt = await storage.get(LAST_PROMPT_KEY);
                        // 🛑 ИСПРАВЛЕНИЕ 1: ЧИТАЕМ РЕЖИМ
                        const currentMode = await storage.get(CREATIVE_MODE_KEY) || 'T2I'; 
                        
                        // 2. Генерируем данные для меню (Используя AWAIT и передавая KV)
                        // 🛑 ИСПРАВЛЕНИЕ 2: messageText: createMessage
                        const { messageText: createMessage, keyboardObject } = await getCreateMenuKeyboard(
                            currentPrompt, 
                            currentMode, // ✅ ПЕРЕДАЕМ ПРАВИЛЬНЫЙ РЕЖИМ
                            chatId, 
                            envData.LAST_PHOTO_STORAGE 
                        );

                        // 3. ОТПРАВКА: Используем sendMessageWithKeyboard
                        ctx.waitUntil(sendMessageWithKeyboard(
                            chatId, 
                            createMessage, 
                            token, 
                            keyboardObject.inline_keyboard
                        ));
                    }
                    
                    // Возвращаем ответ в конце, чтобы обработать и генерацию, и меню
                    return new Response('OK', { status: 200 });
                case '/text': {
                    // --- ИНИЦИАЛИЗАЦИЯ ПЕРЕМЕННЫХ ---
                    // Объявляем переменные здесь, чтобы они были доступны в обоих сценариях (меню/генерация)
                    const storage = env.LAST_PHOTO_STORAGE;
                    const chatKey = chatId.toString();
                    const LAST_PROMPT_KEY = chatKey + envData.LAST_PROMPT_KEY_SUFFIX;
                    const token = envData.TELEGRAM_BOT_TOKEN; 
        
                    // 1. Извлекаем промпт, переданный в команде
                    const inlinePrompt = messageText.replace(/^\/text\s*/i, '').trim();
        
                    if (inlinePrompt.length > 0) {
                        // Сценарий 2: /text [текст] -> СРАЗУ ГЕНЕРАЦИЯ
                        await processText2ImageCommand(chatId, inlinePrompt, token, storage, envData);
                        
                    } else {
                        // Сценарий 1: /text (пусто) -> ОТКРЫТЬ МЕНЮ
                        
                        // Читаем сохраненный промпт для отображения в меню
                        const currentPrompt = await storage.get(LAST_PROMPT_KEY);
                                        
                        // 2. Получаем данные для нового меню
                        const { messageText: createMessage, keyboardObject } = await getTextMenuKeyboard(chatId, storage, currentPrompt); // <-- Добавьте await здесь

                        // 3. ОТПРАВКА: Используем sendMessageWithKeyboard, передавая только массив inline_keyboard
                        ctx.waitUntil(sendMessageWithKeyboard(
                            chatId, 
                            createMessage, 
                            token, 
                            keyboardObject.inline_keyboard // <--- ИСПРАВЛЕНИЕ: Передаем только массив массивов!
                        ));
                    }
                    // Возвращаем ответ в конце, чтобы обработать и генерацию, и меню
                    return new Response('OK', { status: 200 });
                }
                case '/photo': 
                    // ✅ Вызываем sendPhotoMenu, которое теперь знает, как получить контент меню
                    ctx.waitUntil(sendPhotoMenu(
                        chatId, 
                        envData.TELEGRAM_BOT_TOKEN, 
                        envData.LAST_PHOTO_STORAGE, 
                        envData, 
                        ctx
                    ));
                    break;
                case '/video': { // Оборачиваем кейс в блок {}, чтобы объявить переменные
                    // --- ИНИЦИАЛИЗАЦИЯ ПЕРЕМЕННЫХ ---
                    const storage = envData.LAST_PHOTO_STORAGE;
                    const chatKey = chatId.toString();
                    const token = envData.TELEGRAM_BOT_TOKEN;
                    // Определяем все ключи
                    const LAST_PROMPT_KEY = chatKey + LAST_PROMPT_KEY_SUFFIX; 
                    const VIDEO_PARAMS_KEY = chatKey + VIDEO_PARAMS_KEY_SUFFIX;
                    const LAST_IMAGE_KEY = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX;
                    const LAST_VIDEO_KEY = chatKey + LAST_VIDEO_DATA_KEY_SUFFIX; // <-- ДОБАВЛЕН
                    const LAST_AUDIO_KEY = chatKey + LAST_AUDIO_DATA_KEY_SUFFIX; // <-- ДОБАВЛЕН
                    // ✅ ИЗМЕНЕНИЕ: Определяем дефолтные параметры с учетом resolution
                    const DEFAULT_VIDEO_PARAMS = { seconds: '6', aspectRatio: '16:9', resolution: '480p', mode: 'T2V' };
                    // 1. Чтение данных из KV
                    const [lastPrompt, videoParams, rawImageKVData, rawVideoKVData, rawAudioKVData] = await Promise.all([ 
                        storage.get(LAST_PROMPT_KEY),
                        // ✅ ИЗМЕНЕНИЕ: Обрабатываем JSON и устанавливаем дефолты
                        storage.get(VIDEO_PARAMS_KEY, { type: 'json' })
                            .then(res => ({ ...DEFAULT_VIDEO_PARAMS, ...res })) 
                            .catch(() => DEFAULT_VIDEO_PARAMS), 
                        storage.get(LAST_IMAGE_KEY, { type: 'text' }),
                        storage.get(LAST_VIDEO_KEY, { type: 'text' }),
                        storage.get(LAST_AUDIO_KEY, { type: 'text' }) 
                        ]);

                    // 2. Определение наличия фото и видео
                    let isPhotoSaved = false;
                    if (rawImageKVData && rawImageKVData.length > 100) { 
                        isPhotoSaved = true; 
                    }
                    // Определение наличия сохраненного видео. Добавлена проверка длины (>100 символов) для надежности.
                    const isVideoSaved = !!rawVideoKVData && rawVideoKVData.length > 100;
                    const isAudioSaved = !!rawAudioKVData && rawAudioKVData.length > 100;
                    // 🛑 ШАГ 1: ВЫЗОВ НОВОЙ ФУНКЦИИ
                    const { isTaskAvailable, previousTaskId } = await getTaskAvailabilityStatus(chatId, envData);
                    // 2. ✅ НОВОЕ: Определяем currentMode из videoParams
                    const currentMode = videoParams.mode; 
                    // 3. Извлекаем параметры из videoParams
                    const { seconds, aspectRatio, resolution } = videoParams; // ✅ ИЗМЕНЕНИЕ: Деструктурируем resolution
                    // 3. Открытие меню (Используем sendVideoGenerationMenu, так как это новая команда)
                    ctx.waitUntil(sendVideoGenerationMenu(
                        chatId, 
                        lastPrompt, 
                        isPhotoSaved, 
                        isVideoSaved, // <-- ПЕРЕДАЕМ ПЕРЕМЕННУЮ
                        isAudioSaved,
                        token, 
                        videoParams,
                        isTaskAvailable, // <-- НОВЫЙ ПАРАМЕТР
                        previousTaskId, // <-- НОВЫЙ ПАРАМЕТР
                        envData
                    ));
                
                    return new Response('OK', { status: 200 });
                }
                case '/checkvideo': { // Оборачиваем кейс в блок {}, чтобы объявить переменные
                    // Вызов новой функции для обработки статуса видео
                    // Вам также нужно передать envData, чтобы получить доступ к KV и токену
                    await handleCheckVideoCommand(chatId, messageText, envData); // <--- ДОБАВЛЕН text
                    break;
                }
                case '/checkaudio': { // Оборачиваем кейс в блок {}, чтобы объявить переменные
                    // Вызов новой функции для обработки статуса аудио
                    // Вам также нужно передать envData, чтобы получить доступ к KV и токену
                    await handleCheckAudioCommand(chatId, messageText, envData); // <--- ДОБАВЛЕН text
                    break;
                }
                case '/checkimage': { // Оборачиваем кейс в блок {}, чтобы объявить переменные
                    // Вызов новой функции для обработки статуса картинок
                    await handleCheckImageCommand(chatId, messageText, envData); // <--- ДОБАВЛЕН text
                    break;
                }
                case '/admin': // <-- ИСПРАВЛЕННЫЙ БЛОК: Убрана обработка текстовой команды /admin update_cmds
                    // Сюда попадает ТОЛЬКО команда /admin (без параметров),
                    // которая открывает админ-панель с кнопками.
                    ctx.waitUntil(processAdminStartCommand(chatId, envData));
                    break;

                default:
                    // Неизвестная команда, отправляем в чат-обработчик
                    ctx.waitUntil(processTextMessage(chatId, messageText, envData));
                    break;
            }
            return new Response('OK', { status: 200 });
        } // КОНЕЦ БЛОКА ОБРАБОТКИ ТЕКСТОВЫХ КОМАНД

        // 2. ОБРАБОТКА ВХОДЯЩЕГО СООБЩЕНИЯ - ФОТО, ДОКУМЕНТА И ГОЛОСА
        if (message) {
            const chatId = message.chat.id;
            const messageText = message.text || ''; // Убедитесь, что эта строка есть
    
            // --- ГЛОБАЛЬНЫЕ КЛЮЧИ (Убедитесь, что они определены) ---
            // Вам нужно определить ADMIN_STATE_KEY и ADMIN_TARGET_ID_KEY в глобальной области
            const ADMIN_STATE_KEY = chatId.toString() + '_admin_state'; 
            const ADMIN_TARGET_ID_KEY = chatId.toString() + '_admin_target_id';

            // ==============================================================
            // === 1. ОБРАБОТКА ВЫБРАННОГО ПОЛЬЗОВАТЕЛЯ (message.user_shared)
            // ==============================================================
            if (update.message && update.message.user_shared && chatId.toString() === envData.ADMIN_CHAT_ID.toString()) {
                
                // 🔥 ДЕЙСТВИЯ, КОТОРЫЕ ГАРАНТИРУЮТ СБРОС СТЕЙТА ПРИ ВЫБОРЕ КОНТАКТА
                const storage = envData.LAST_PHOTO_STORAGE; 
                const ADMIN_STATE_KEY = chatId.toString() + '_admin_state'; 
                const adminState = await storage.get(ADMIN_STATE_KEY); 

                // 1. Немедленное удаление, если мы ждали ID для меню
                if (adminState === 'awaiting_target_id_for_menu') {
                    await storage.delete(ADMIN_STATE_KEY); 
                }
                // 🔥 КОНЕЦ БЛОКА ГАРАНТИИ
                const message = update.message; 
                const targetId = message.user_shared.user_id.toString();
                const token = env.TELEGRAM_BOT_TOKEN;
                const ADMIN_TARGET_ID_KEY = chatId.toString() + '_admin_target_id';

                // 2. Сохраняем ID (остальной код)
                await storage.put(ADMIN_TARGET_ID_KEY, targetId, { expirationTtl: 600 });
                const removeKeyboard = { reply_markup: { remove_keyboard: true } };
                
                const actionMatch = adminState ? adminState.match(/^awaiting_target_id_for_action:(.+)$/) : null;

                if (actionMatch) {
                    // ЕСЛИ ЖДАЛИ ID ДЛЯ ДЕЙСТВИЯ (select_action)
                    const action = actionMatch[1];
                    
                    // Сбрасываем состояние
                    await storage.delete(ADMIN_STATE_KEY); 
                    
                    // Формируем callback_data для немедленного выполнения действия
                    const callbackData = `admin_${action}:${targetId}`; 
                    
                    ctx.waitUntil(sendMessageMarkdown(chatId, 
                        `✅ ID \`${targetId}\` выбран. Выполняю действие \`${action}\`...`, 
                        token, null, removeKeyboard));
                        
                    // Вызываем handleAdminCallback с новой callback_data
                    ctx.waitUntil(handleAdminCallback(chatId, { data: callbackData, message: message }, env, ctx));
                    
                } else {
                    // ЕСЛИ ПРОСТО ВЫБРАЛИ ID ИЗ ГЛАВНОГО МЕНЮ (для admin_user_menu)
                    
                    // 🔥 СБРАСЫВАЕМ СТЕЙТ 'awaiting_target_id_for_menu'! (ИСПРАВЛЕНИЕ)
                    if (adminState) {
                        await storage.delete(ADMIN_STATE_KEY);
                    }
                    
                    const managementKeyboardObject = getManagementActionKeyboard(targetId);
                    const messageText = `✅ **Выбран пользователь:** \`${targetId}\`\n\nВыберите действие.`;

                    // Сначала скрываем Reply Keyboard
                    ctx.waitUntil(sendMessage(chatId, "Клавиатура скрыта.", token, null, removeKeyboard)); 
                    
                    // Затем показываем Inline Menu
                    ctx.waitUntil(sendMessage(chatId, messageText, token, null, managementKeyboardObject.inline_keyboard));
                }

                return new Response('OK', { status: 200 });
            }

            // ==============================================================
            // === 1.5. ОБРАБОТКА РУЧНОГО ВВОДА ID (ПРИ АКТИВНОМ СТЕЙТЕ)
            // ==============================================================
            if (chatId.toString() === envData.ADMIN_CHAT_ID.toString()) {
                const storage = env.LAST_PHOTO_STORAGE; 
                const token = env.TELEGRAM_BOT_TOKEN;
                const adminState = await storage.get(ADMIN_STATE_KEY); 

                // Проверяем, что мы находимся в стейте ожидания ID
                if (adminState === 'awaiting_target_id_for_menu' || 
                    (adminState && adminState.startsWith('awaiting_target_id_for_action:'))) {

                    const potentialId = messageText.trim();
                    const targetUserId = parseInt(potentialId);
                    
                    // 🚨 ПЕРВАЯ ПРОВЕРКА: Команда отмены?
                    if (messageText === "❌ Отменить ввод") {
                        // Если это отмена, управление перейдет в Блок 2.
                        
                    // 🚨 ВТОРАЯ ПРОВЕРКА: Валидный числовой ID?
                    } else if (targetUserId && !isNaN(targetUserId)) {
                        
                        const actionMatch = adminState.match(/^awaiting_target_id_for_action:(.+)$/);
                        const removeKeyboard = { reply_markup: { hide_keyboard: true } };

                        // 1. Сохраняем новый ID
                        await storage.put(ADMIN_TARGET_ID_KEY, targetUserId.toString(), { expirationTtl: 600 });
                        
                        // 2. Удаляем флаг ожидания
                        await storage.delete(ADMIN_STATE_KEY);

                        // 3. Скрываем Reply Keyboard и уведомляем
                        await sendMessage(chatId, `✅ ID установлен вручную: \`${targetUserId}\``, token, null, removeKeyboard);
                        
                        if (actionMatch) {
                            // Если ждали ID для выполнения действия (например, set_balance)
                            const action = actionMatch[1];
                            const callbackData = `admin_${action}:${targetUserId}`;
                            
                            // Вызываем handleAdminCallback, чтобы перейти к следующему шагу (вводу суммы/дней)
                            ctx.waitUntil(handleAdminCallback(chatId, { data: callbackData, message: message }, env, ctx));
                        } else {
                            // Если ждали ID для обновления меню (admin_user_menu)
                            // Отправляем новое меню
                            const fakeCallback = { 
                                data: 'admin_user_menu', 
                                message: { message_id: 0 } 
                            }; 
                            ctx.waitUntil(handleAdminCallback(chatId, fakeCallback, env, ctx));
                        }

                        return new Response('OK', { status: 200 }); // <-- ГАРАНТИРОВАННЫЙ ВЫХОД
                        
                    // 🚨 ТРЕТЬЯ ПРОВЕРКА: Невалидный ввод?
                    } else {
                        // Если ввели текст, но это не ID и не команда отмены
                        await sendMessageMarkdown(chatId, "❌ **Ошибка ввода:** Введите, пожалуйста, только **цифровой ID** пользователя. Повторите ввод.", token);
                        return new Response('OK', { status: 200 }); // <-- ГАРАНТИРОВАННЫЙ ВЫХОД
                    }
                }
            }

            // ==============================================================
            // === 2. ОБРАБОТКА КОМАНДЫ "ОТМЕНА ВВОДА" (КРИТИЧЕСКИЙ БЛОК)
            // ==============================================================
            if (messageText === "❌ Отменить ввод" && chatId.toString() === envData.ADMIN_CHAT_ID.toString()) {
                
                const storage = envData.LAST_PHOTO_STORAGE;
                const token = envData.TELEGRAM_BOT_TOKEN;
                const ADMIN_STATE_KEY = chatId.toString() + '_admin_state'; 
                const ADMIN_TARGET_ID_KEY = chatId.toString() + '_admin_target_id';

                // 1. Удаляем состояние ожидания
                await storage.delete(ADMIN_STATE_KEY); 

                // 2. Удаляем Reply Keyboard - ЭТО ПЕРВОЕ СООБЩЕНИЕ
                //const removeKeyboard = { reply_markup: { remove_keyboard: true } };
                // Отправляем удаление клавиатуры первым, чтобы она исчезла
                //ctx.waitUntil(sendMessage(chatId, "✅ **Отмена ввода.** Клавиатура скрыта.", token, null, removeKeyboard));
                
                // 3. Возвращаем в меню управления - ЭТО ВТОРОЕ СООБЩЕНИЕ
                //const currentTargetId = await storage.get(ADMIN_TARGET_ID_KEY);
                //const managementKeyboardObject = getManagementActionKeyboard(currentTargetId); 
                //const menuText = "👥 УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ.\n\n🆔 Текущий ID: 'Не выбран'\n\n💰 Баланс: 'Не выбран'\n👑 Безлимит: 'Не указан'\n\nВыберите пользователя и укажите действия.";
                
                // Отправляем Inline Menu вторым
                //ctx.waitUntil(editMessageWithKeyboard(chatId, menuText, token, null, managementKeyboardObject.inline_keyboard));

                return new Response('OK', { status: 200 });
            }

            let mediaObject = null; // Будет содержать данные фото (сжатое или как документ)
        
            // БЛОК 3.1 - ОБРАБОТКА ВИДЕО
            if (isVideo) {
                // Определяем storage и token в начале (строки 8280-8290 в вашем коде)
                const storage = envData.LAST_PHOTO_STORAGE; 
                const token = envData.TELEGRAM_BOT_TOKEN; 
                
                // Если хранилище недоступно, сразу возвращаем ошибку
                if (!storage) { 
                    await sendMessage(chatId, "❌ Критическая ошибка: Хранилище недоступно.", token);
                    return new Response('OK', { status: 200 });
                }
                const videoFile = message.video || message.video_note; // <-- ИСПОЛЬЗУЕМ ТО, ЧТО ПРИШЛО
                // 💡 Теперь videoFile гарантированно содержит нужные поля (file_id, file_size и т.д.)
                const file_id = videoFile.file_id;
                const file_size = videoFile.file_size;
                let workingMessageId = "";
                // Сначала отправляем сообщение о начале работы и немедленно отвечаем Telegram
                //const waitingMessageId = (await sendMessageMarkdown(chatId, "⏳ **Видео загружается. **Подождите пожалуйста ...", token)).message_id;
                //const workingMessageId = (await editMessage(chatId, "✅ **Видео принято.**", token)).message_id;
                // !!! ВАЖНО: Весь длительный процесс оборачиваем в waitUntil !!!
                ctx.waitUntil(async function() {
                    // Мы передали storage и token из внешней области видимости.
                    try {
                        // Читаем текущий режим видео
                        // Определяем ключ (если не определен выше)
                        const VIDEO_PARAMS_KEY = chatId + VIDEO_PARAMS_KEY_SUFFIX; 
                        const DEFAULT_VIDEO_PARAMS = { seconds: '6', aspectRatio: '16:9', resolution: '480p', mode: 'T2V' }; // ✅ Должен быть определен!
                        // Читаем все параметры ОДНИМ GET
                        const videoParams = await storage.get(VIDEO_PARAMS_KEY, { type: 'json' })
                            .then(res => ({...DEFAULT_VIDEO_PARAMS, ...res}))
                            .catch(() => DEFAULT_VIDEO_PARAMS);
                        const currentMode = videoParams.mode; // ✅ Режим извлекается из объекта
                        // Проверяем размер файла
                        if (file_size > 10 * 1024 * 1024) {
                            await editMessage(chatId, workingMessageId, "❌ **Ошибка:** Видеофайл должен быть меньше 10 МБ для апскейла.", token);
                            return; // Выходим из waitUntil
                        }

                        const telegramDownloadUrl = await getFileLink(file_id, token);
                        const publicVideoUrl = telegramDownloadUrl; // <-- Используем временную ссылку Telegram

                        // ШАГ 2: Сохраняем URL и метаданные в KV
                        const videoData = JSON.stringify({
                                file_id: file_id,
                                url: publicVideoUrl,
                                mime_type: videoFile.mime_type,
                                file_size: file_size,
                            width: videoFile.width || null,     
                            height: videoFile.height || null,   
                            duration: videoFile.duration || null,
                                thumb: videoFile.thumb // Сохраняем thumb на случай, если он понадобится для превью
                            });
                        const chatKey = chatId.toString(); // <--- ДОБАВЛЕНО
                        const videoKey = chatKey + LAST_VIDEO_DATA_KEY_SUFFIX; // <--- ИСПОЛЬЗУЕМ СТРОКОВЫЙ КЛЮЧ
                        const photoKey = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX; // <--- ИСПОЛЬЗУЕМ СТРОКОВЫЙ КЛЮЧ

                        // !!!!!!!!! ИЗМЕНЯЕМ ЭТУ СТРОКУ !!!!!!!!!
                        await storage.put(videoKey, videoData, { expirationTtl: 3600 }); // Используем строковый videoKey
                        // Сохраняем последний медиа-тип
                        await storage.put(chatKey + LAST_MEDIA_TYPE_KEY_SUFFIX, 'video', { expirationTtl: 3600 });
                        // 🛑 ОПТИМИЗАЦИЯ: Читаем ВСЕ актуальные параметры ОДНОВРЕМЕННО
                        const [
                            lastVideoMenuId, 
                            lastPrompt, 
                            rawImageKVData, 
                            rawVideoKVData, 
                            rawAudioKVData
                        ] = await Promise.all([
                            storage.get(chatId + LAST_PROMPT_MESSAGE_ID_KEY_SUFFIX),
                            storage.get(chatId + LAST_PROMPT_KEY_SUFFIX),
                            storage.get(chatId + LAST_IMAGE_DATA_KEY_SUFFIX),
                            storage.get(chatId + LAST_VIDEO_DATA_KEY_SUFFIX),
                            storage.get(chatId + LAST_AUDIO_DATA_KEY_SUFFIX)
                        ]);

                        // Используем полученные данные
                        const isPhotoSaved = !!rawImageKVData; 
                        const isVideoSaved = !!rawVideoKVData; 
                        const isAudioSaved = !!rawAudioKVData; 
                        // lastPrompt и lastVideoMenuId уже определены

                        // 🛑 ШАГ 2: Определяем инлайн-клавиатуру (добавлена кнопка "Удалить")
                        const inlineKeyboard = {
                            inline_keyboard: [
                                [{text: "🎧 Транскрибировать видео в текст", callback_data: 'cmd:/video_transcribe'}],
                                [{ text: '👀 Проанализировать видеоконтент', callback_data: 'cmd:/video_analysis' }],
                                [{text: "💿 Сохранить аудиодорожку как голос", callback_data: 'cmd:/grab_audio'}],
                                [{ text: "🎞️ Сконвертировать видео в GIF-ку", callback_data: "video_to_gif:gif" }],
                                // 1. НОВАЯ КНОПКА: Захват кадра (Frame Grab)
                                [{text: "🖼️ Сохранить стоп-кадр как фото", callback_data: 'cmd:/grab_frame'}],
                                // 3. Режимы V2V и A2V
                                [
                                    {text: "🗣 Создать Аватар", callback_data: 'set_video_mode|A2V'},
                                    {text: "📽️ Изменить Видео", callback_data: 'set_video_mode|V2V'}
                                ],
                                [
                                    {text: "📺 Повысить Видео", callback_data: 'select_upscale_mode|VIDEO_TO_UPSCALE'},
                                    {text: "❔ помощь по выбору", callback_data: 'dummy_no_buttons'}
                                ],
                            ]
                        };
                        // 🛑 ШАГ 3: Отправляем НОВОЕ сообщение с клавиатурой и удаляем старые
                            //const finalMessageText = `✅ **Видео успешно сохранено!**\n\nРазмер: ${Math.round(file_size / (1024 * 1024))} МБ\n\nВыберите, что вы хотите с ним сделать:`;
                        const finalMessageText = `🎬 Видео принято. Что вы хотите с ним сделать?`;
                            // Отправляем финальное сообщение с клавиатурой (используем sendMessageMarkdown для форматирования)
                            await sendMessageMarkdown(
                                chatId, 
                                finalMessageText, 
                                token, 
                                null, // replyToMessageId
                                inlineKeyboard // Передаем объект { inline_keyboard: [...] }
                            );

                            // Удаляем сообщения-заглушки (для чистоты чата)
                            //await deleteMessage(chatId, waitingMessageId, token);
                            //await deleteMessage(chatId, workingMessageId, token);


                            // 🛑 ШАГ 4: Принудительное обновление меню /video (если оно открыто)
                            // lastVideoMenuId остался null (из-за чего вы видели else-блок), 
                            // но теперь это не проблема, так как ответ с кнопками уже отправлен.

                            if (lastVideoMenuId) {
                                // Передаем TRUE для isVideoSaved, чтобы меню гарантированно перерисовало кнопки
                                await editVideoGenerationMenu(
                                    chatId, 
                                    lastVideoMenuId, 
                                    lastPrompt, 
                                    isPhotoSaved, 
                                    true, // <--- isVideoSaved теперь точно TRUE
                                    isAudioSaved,
                                    token, 
                                    videoParams,
                                    envData
                                );
                            } else {
                                // Отправляем короткое уведомление, что меню доступно.
                                //await sendMessage(chatId, "📽️ Теперь вы можете использовать это видео в меню /video.", token);
                            }

                    } catch (e) {
                        console.error("Video upload failed:", e);
                        const errorText = e && e.message ? e.message.substring(0, 300) : 'Неизвестная ошибка загрузки.'; 
                        try {
                            // Используем token, определенный выше
                            await editMessage(chatId, workingMessageId, `❌ **Критическая ошибка загрузки видео:** ${errorText}`, token);
                        } catch (editError) {
                            await sendMessage(chatId, `❌ **Критическая ошибка загрузки видео:** Произошел сбой. Пожалуйста, попробуйте позже.`, token);
                        }
                    }
                }()); // Немедленно вызываем асинхронную функцию
                
                return new Response('OK', { status: 200 }); 
            } // 🛑 КОНЕЦ ОБРАБОТКИ ВИДЕО

            // 2.1. ПРОВЕРКА НА СТАНДАРТНУЮ ФОТОГРАФИЮ (сжатое фото)
            if (isPhoto) {
                // Берем самый большой объект фото
                mediaObject = message.photo.reduce((prev, current) => 
                    (prev.width * prev.height > current.width * current.height) ? prev : current);
            
            // 2.2. ДОБАВЛЕНО: ПРОВЕРКА НА ДОКУМЕНТ (несжатое фото/перетаскивание)
            } else if (message.document) {
                // Проверяем, что документ имеет MIME-тип изображения
                if (message.document.mime_type && message.document.mime_type.startsWith('image/')) {
                    mediaObject = message.document;
                }
            }

            // 2.3. Обработка ФОТО (Photo или Document-Photo)
            if (mediaObject) {
                // ШАГ 1: Отключаем автоматический Vision!
                // ctx.waitUntil(processPhotoMessageAsync(chatId, mediaObject, envData, ctx));

                const fileId = mediaObject.file_id;
                const token = envData.TELEGRAM_BOT_TOKEN;

                // ?? ШАГ 2: Сохраняем fileId в KV, чтобы кнопки знали, с чем работать
                await envData.LAST_PHOTO_STORAGE.put(chatId + LAST_FILE_ID_KEY_SUFFIX, fileId);
                // НОВЫЙ ШАГ: ЗАПУСКАЕМ ФОНОВУЮ ЗАДАЧУ
                // Передаем mediaObject для сохранения метаданных (width/height).
                ctx.waitUntil(downloadAndSaveBase64(fileId, chatId, envData, mediaObject)); 

                // 🛑 ШАГ 3: Отправляем сообщение с инлайн-кнопками
                const inlineKeyboard = {
                    inline_keyboard: [
                    [{ text: "🌄 Бесплатно улучшить изображение", callback_data: 'cmd:/vision_generate_free_i2i' }],
                    [{ text: "🔄 Получить описание фотографии", callback_data: 'regenerate_prompt' }],
                    [{ text: "✨ Улучшить Фото", callback_data: 'cmd:/photo_now' },
                        { text: "🎬 Оживить Фото", callback_data: 'start_video_generation|I2V' }],
                    [{ text: "🔍 Увеличить Фото", callback_data: 'generate_upscale_now|IMAGE_TO_UPSCALE' },
                        { text: "❔ помощь по выбору", callback_data: 'dummy_no_buttons' }], 
                ]
                };

                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: "📸 Фотография принята. Что вы хотите с ней сделать?",
                        reply_markup: inlineKeyboard
                    })
                });
                    return new Response('OK', { status: 200 });
                }

            // ОБРАБОТКА GIF Анимации
            if (isAnimation) {
                // Вызываем твою новую функцию, которую мы обсуждали шагом ранее
                const currentFileId = animation.file_id;
                const mediaType = 'gif';
                const currentWidth = (animation).width;
                const currentHeight = (animation).height;
                
                // ✅ Сохраняем в KV (используем правильные переменные)
                const GIF_DATA_KEY = `${chatId}_last_gif_data`;
                await envData.LAST_PHOTO_STORAGE.put(GIF_DATA_KEY, JSON.stringify({
                    file_id: currentFileId,
                    type: mediaType,
                    width: currentWidth,
                    height: currentHeight
                }), { expirationTtl: 3600 });
                // И не забываем обновить основной тип медиа
                await envData.LAST_PHOTO_STORAGE.put(`${chatId}_last_media_type`, "animation"); 

                const text = "🎞️ **Обнаружена GIF-анимация!**\nЕё можно конвертировать в видео (MP4) для экономии трафика или ресайза.";

                // Заменяем текущий sendMessage в блоке GIF на этот:
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: text,
                        parse_mode: 'Markdown', // Убедись, что мод совпадает с текстом
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "📽️ Конвертировать в MP4", callback_data: `gif_to_video` }],
                                [{ text: "🗑️ Игнорировать", callback_data: `delete_message` }]
                            ]
                        }
                    })
                });
                
                // Прерываем дальнейшую обработку, чтобы бот не пытался отвечать на это как на текст
                return new Response('OK', { status: 200 });
            } // КОНЕЦ БЛОКА ОБРАБОТКИ GIF и Стикеров - Анимации

            // 2.4. Обработка ГОЛОСОВОГО СООБЩЕНИЯ (voice безопасно извлечен в начале fetch)
            if (voice) { 
                const voiceFileId = voice.file_id;

                // 🚀 РЕЖИМ 2: СТАНДАРТНАЯ ОБРАБОТКА ГОЛОСА (ВНЕ МЕНЮ)
                
                // Ваша существующая логика для стандартного голосового сообщения (если она есть)
                ctx.waitUntil(processVoiceMessageAsync(chatId, voiceFileId, envData, ctx));
                
                // Если вы тестируете OGG-конвертер отдельно:
                // ctx.waitUntil(processVoiceOGGAsync(chatId, voiceFileId, envData, ctx)); 
                
                // Возвращаем OK немедленно
                return new Response('OK', { status: 200 });
            }
            if (audio) { 
                const audioFileId = audio.file_id; 
                ctx.waitUntil(processAudioMessageAsync(chatId, audioFileId, envData, audio));
                return new Response('OK', { status: 200 });
            }
            if (document) {
                // Проверяем MIME-тип документа, чтобы убедиться, что это аудио
                const mimeType = document.mime_type;
                if (mimeType && mimeType.startsWith('audio/')) {
                    const audioFileId = document.file_id; 
                    
                    // Используем вашу функцию processAudioMessageAsync
                    // (передаем document, так как в нем есть все нужные file_id и mime_type)
                    ctx.waitUntil(processAudioMessageAsync(chatId, audioFileId, envData, document)); 
                    return new Response('OK', { status: 200 });
                }
            }
        }  // КОНЕЦ БЛОКА ОБРАБОТКИ ВХОДЯЩЕГО СООБЩЕНИЯ
        // Закрываем if (message). Если это не message, а callback, выполнение переходит к if (callback) ниже.

        // 3. ОБРАБОТКА НАЖАТИЯ INLINE-КНОПОК (callback_query)
        if (callback) {
            const data = callback.data || '';
            const fromId = callback.from.id;
            const messageId = callback.message.message_id;
            const currentMessageText = callback.message.text;
            const chatKey = chatId.toString();
            const storage = env.LAST_PHOTO_STORAGE; // Используем правильный KV-биндинг
            const token = envData.TELEGRAM_BOT_TOKEN;

            // --- KV KEYS (УНИФИКАЦИЯ: ИСПОЛЬЗУЕМ СУФФИКСЫ ИЗ envData) ---
            const LAST_PROMPT_KEY = chatKey + envData.LAST_PROMPT_KEY_SUFFIX;
            const LAST_IMAGE_DATA_KEY = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX;
            const LAST_ACTION_KEY = chatKey + envData.LAST_ACTION_KEY_SUFFIX;
            const LAST_PROMPT_LANG_KEY = chatKey + envData.LAST_PROMPT_LANG_KEY_SUFFIX;

            // --- Стейты из вашего кода (Добавляем USER_STATE_KEY_SUFFIX в envData, если не было) ---
            // ✅ ИСПРАВЛЕНИЕ: Используем суффикс из envData для USER_STATE_KEY, если он там есть
            const USER_STATE_KEY = chatKey + (envData.USER_STATE_KEY_SUFFIX || '_user_state');
            const STATE_AWAITING_PROMPT_EDIT = 'awaiting_prompt_edit';
            const STATE_AWAITING_NEW_PROMPT = 'awaiting_new_prompt';
            // ОБЯЗАТЕЛЬНО: Отвечаем на колбэк, чтобы убрать часы на кнопке!
            ctx.waitUntil(answerCallbackQuery(callback.id, "Обработка команды...", token));
            // ВАШИ КОНСТАНТЫ:
            const CALLBACK_TEMP_STORAGE = envData.LAST_PHOTO_STORAGE; // Используем то же хранилище, где лежит Base64
            const SET_BASE_CALLBACK = 'setbase_'; 
            const CALLBACK_EXPIRATION_TTL = 3600; // 1 час на нажатие

            // 2. ЛОГИКА ДЛЯ ПОЛЬЗОВАТЕЛЬСКИХ КОМАНД (Начинаются с 'cmd:/')
            if (data.startsWith('cmd:/')) {
                const command = data.substring(5).trim();
                // 1. Создаем клавиатуру "Назад в Главное меню"
                const backKeyboard = [[{ text: "🏠 Открыть главное меню /start", callback_data: "start_command" }]];

                switch (command) {
                    case 'prompt':
                        // ✅ ИСПРАВЛЕНИЕ: Передаем messageId, чтобы processPromptCommand мог редактировать сообщение
                        ctx.waitUntil(processPromptCommand(chatId, token, storage, envData, messageId)); // <-- messageId добавлено
                        break;
                    case 'upload_photo': 
                        const uploadText = `
❔ **Как загрузить фото:**

1. Нажмите на 📎 **скрепку** рядом с полем ввода.
2. Выберите 📸 **фотографию** из галереи.
3. Отправьте ее в 💬 чат!

Я автоматически проанализирую фото и сгенерирую промпт.
После этого используйте:
/prompt для создания или перегенерации **промпта**.
/create для **создания картинки** по промпту
/photo для **улучшения фото**
/media для управления **сохраненными данными**.
                    `;
                        // 2. ✅ ИСПОЛЬЗУЕМ editMessageWithKeyboard для ЗАМЕНЫ СООБЩЕНИЯ
                        // (Ваша функция editMessageWithKeyboard использует messageId)
                        ctx.waitUntil(editMessageWithKeyboard(
                            chatId, 
                            messageId, 
                            uploadText, 
                            token,
                            backKeyboard
                        ));
                
                        // 3. Возвращаем Response, чтобы завершить обработку callback-запроса
                        return new Response('OK', { status: 200 });
                    case 'upload_video':
                        // Отправляем уведомление вверху экрана
                        ctx.waitUntil(answerCallbackQuery(callback, "Видео до 10 МБ можно отправить прямо сейчас.", token));
                        const uploadVideo = `
❔ **Как загрузить видео:**

1. Нажмите на 📎 **скрепку** рядом с полем ввода.
2. Выберите 🎬 **видео** из галереи.
3. Отправьте его в 💬 чат!

Я автоматически проанализирую видео и сохраню его в базу.
После этого используйте:
/video для **изменения** персонажа.
/avatar для создания **аватара**.
/media для управления **сохраненными данными**.
`;
                        // 2. ✅ ИСПОЛЬЗУЕМ editMessageWithKeyboard для ЗАМЕНЫ СООБЩЕНИЯ
                        // (Ваша функция editMessageWithKeyboard использует messageId)
                        ctx.waitUntil(editMessageWithKeyboard(
                            chatId, 
                            messageId, 
                            uploadVideo, 
                            token,
                            backKeyboard
                        ));
                        // 3. Возвращаем Response, чтобы завершить обработку callback-запроса
                        return new Response('OK', { status: 200 });
                    case 'upload_audio':
                        // Ответ на колбэк
                        ctx.waitUntil(answerCallbackQuery(callbackId, "Аудиофайл в формате MP3 можно отправить прямо сейчас", token)); 
                        // Отправляем пользователю сообщение
                        const uploadAudio = `
❔ **Как загрузить аудиофайл:**

1. Нажмите на 📎 **скрепку** рядом с полем ввода.
2. Выберите 🎤 **аудиофайл** в формате MP3 из галереи.
3. Отправьте его в 💬 чат!

Я автоматически проанализирую аудио и сохраню его в базу.
После этого используйте:
/say для **озвучивания** текста голосом
/media для управления **сохраненными данными**.
`;
                        // 2. ✅ ИСПОЛЬЗУЕМ editMessageWithKeyboard для ЗАМЕНЫ СООБЩЕНИЯ
                        // (Ваша функция editMessageWithKeyboard использует messageId)
                        ctx.waitUntil(editMessageWithKeyboard(
                            chatId, 
                            messageId, 
                            uploadAudio, 
                            token,
                            backKeyboard
                        ));
                        // 3. Возвращаем Response, чтобы завершить обработку callback-запроса
                        return new Response('OK', { status: 200 });
                    case 'photo': { // СТАРЫЙ КОЛБЭК теперь открывает меню
                        const messageId = callback.message.message_id;
                        
                        ctx.waitUntil(sendPhotoMenu(
                            chatId, 
                            token, 
                            storage, 
                            envData, 
                            ctx, 
                            messageId // Передаем messageId для редактирования
                        ));
                        return new Response('OK', { status: 200 });
                    }
                    case 'photo_now': { // НОВЫЙ КОЛБЭК, запускает генерацию
                        const messageId = callback.message.message_id;
                    
                        // 🛑 1. КРИТИЧЕСКАЯ ПРОВЕРКА: НАЛИЧИЕ ПРОМПТА И УСТАНОВКА ДЕФОЛТА
                        const LAST_PROMPT_KEY = chatId + LAST_PROMPT_KEY_SUFFIX;
                        
                        // Читаем промпт
                        const userPrompt = await storage.get(LAST_PROMPT_KEY);
                        
                        if (!userPrompt) {
                            // 🚀 КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: ЖДЕМ ЗАВЕРШЕНИЯ ЗАПИСИ (Используем 'await' без ctx.waitUntil)
                            await storage.put(
                                LAST_PROMPT_KEY, 
                                DEFAULT_IMAGE_PROMPT, // <-- Глобальная константа
                                { expirationTtl: 3600 }
                            );
                            // После этой строки мы гарантируем, что промпт записан в KV.
                        }
                        
                        // 2. Запускаем фоновые задачи...
                        ctx.waitUntil(Promise.allSettled([
                            // Редактируем сообщение, чтобы показать прогресс (UI update)
                            // 🛑 Здесь важно использовать escapeMarkdown (как мы обсуждали ранее)
                            editMessage(chatId, messageId, "⏳ **Запускаю улучшение фото...**", token).catch(e => {
                                console.error("Не удалось отредактировать сообщение для photo_now:", e);
                            }),
                            
                            // Запускаем основную логику улучшения фото
                            processPhotoCommand(
                                chatId, 
                                token, 
                                envData, 
                                storage
                            )
                        ]));
                        
                        return new Response('OK', { status: 200 });
                    }
                    case 'view_saved_photo': {
                        // 1. ЗАПУСКАЕМ ТЯЖЕЛЫЙ ПРОЦЕСС (отправку фото) в фоне
                        ctx.waitUntil(sendSavedPhoto(
                            chatId, 
                            token, 
                            storage, 
                            envData, 
                            ctx
                        ));
            
                        // 2. Обязательный выход.
                        return new Response('OK', { status: 200 });
                    }
                    case 'view_saved_video': {
                        // 1. ЗАПУСКАЕМ ТЯЖЕЛЫЙ ПРОЦЕСС (отправку видео) в фоне
                        ctx.waitUntil(sendSavedVideo(
                            chatId, 
                            token, 
                            storage, 
                            envData, 
                            callback.id // 🛑 Передаем только ID!
                        ));
                    
                        // 2. Обязательный и немедленный выход.
                        return new Response('OK', { status: 200 });
                    }
                    case 'view_saved_audio': {
                        // В KV вы сохраняете: 235663624_audio_file_id
                        const AUDIO_FILE_ID_KEY = chatId + '_audio_file_id'; 
                        const storage = envData.LAST_PHOTO_STORAGE;
                        
                        // 1. ✅ НЕМЕДЛЕННЫЙ ОТВЕТ НА КОЛБЭК! (Выполняется мгновенно)
                        // Это гасит кнопку и предотвращает таймаут.
                        if (callbackId) { 
                            ctx.waitUntil(answerCallbackQuery(callbackId, "Отправляю сохраненное аудио...", token)); 
                        }
                    
                        // 2. ЗАПУСКАЕМ ВСЮ ТЯЖЕЛУЮ ЛОГИКУ В ФОНЕ (ctx.waitUntil)
                        // Все await-операции (чтение KV, отправка) не блокируют основной поток.
                        ctx.waitUntil(async function() {
                            // Читаем file_id из KV
                            const audioFileId = await storage.get(AUDIO_FILE_ID_KEY); 
                            
                            if (audioFileId) {
                                // Отправка аудио по надежному file_id
                                await sendAudio(chatId, audioFileId, token) 
                                    .catch(e => {
                                        console.error("Не удалось отправить аудиофайл по file_id:", e);
                                        // Отправляем текстовое сообщение об ошибке как запасной вариант
                                        sendMessage(chatId, `❌ Не удалось отправить аудио. Произошла внутренняя ошибка.`, token).catch(() => {});
                                    });
                            } else {
                                // Аудио не найдено, редактируем сообщение меню
                                editMessage(chatId, messageId, "❌ **Ошибка:** Аудио не найдено в хранилище. Запустите /say.", token).catch(() => {});
                            }
                        }());
                    
                        // 3. Мгновенный выход, возвращая 200 OK
                        return new Response('OK', { status: 200 });
                    }
                    case 'create_empty': {
                        // Мы используем messageId, который должен быть определен в начале блока callbackQuery
                        // (например, const messageId = callback.message.message_id; )
                        const chatKey = chatId.toString();
                        const LAST_PROMPT_KEY = chatKey + envData.LAST_PROMPT_KEY_SUFFIX;
                        const CREATIVE_MODE_KEY = chatKey + envData.CREATIVE_MODE_KEY_SUFFIX
                        // 🛑 ДОБАВЬТЕ ЭТУ СТРОКУ в оба блока, где открывается меню (/create и create_empty)
                        const currentMode = await storage.get(CREATIVE_MODE_KEY) || 'T2I';
                        // 1. Читаем сохраненный промпт (этот await допустим)
                        const currentPrompt = await storage.get(LAST_PROMPT_KEY);
                
                        // 2. Получаем данные для нового меню /create
                        const { messageText: createMessage, keyboardObject } = await getCreateMenuKeyboard(
                            currentPrompt, 
                            currentMode, 
                            chatId, 
                            envData.LAST_PHOTO_STORAGE // 🛑 ПЕРЕДАЧА БИНДИНГА KV
                        );
                                                    
                        // 3. ОТПРАВКА: ✅ ИСПОЛЬЗУЕМ editMessageWithKeyboard для ЗАМЕНЫ СООБЩЕНИЯ
                        ctx.waitUntil(editMessageWithKeyboard( // <-- ИЗМЕНЕНО
                            chatId, 
                            messageId, // <-- ИСПОЛЬЗУЕМ messageId ТЕКУЩЕГО СООБЩЕНИЯ
                            createMessage, 
                            token, 
                            keyboardObject.inline_keyboard // Передаем клавиатуру
                        ));
                        
                        break; // break завершается через return new Response('OK', { status: 200 }); в конце блока if
                    }
                    case 'audio_transcribe': {
                        // Ключ, который вы используете для сохранения file_id
                        const AUDIO_FILE_ID_KEY_SUFFIX = '_audio_file_id'; 
                        const AUDIO_FILE_KEY = chatId.toString() + AUDIO_FILE_ID_KEY_SUFFIX; 
                        const fileId = await storage.get(AUDIO_FILE_KEY); 
                
                        // 1. Отвечаем на колбэк, чтобы убрать часы
                        ctx.waitUntil(answerCallbackQuery(callback.id, "Начинаю транскрибацию...", token));
                        
                        if (!fileId) {
                            ctx.waitUntil(sendMessage(chatId, "❌ Не удалось найти аудиофайл для транскрибации. Пожалуйста, отправьте его снова.", token));
                            return true;
                        }
                
                        // 2. Вызываем новую функцию для транскрибации
                        ctx.waitUntil(transcribeAudioFileAsync(chatId, fileId, envData, ctx));
                
                        return new Response('OK', { status: 200 });
                    }
                    case 'video_transcribe': {
                        const VIDEO_DATA_KEY = chatId.toString() + '_last_video_data'; 
                        const videoDataJson = await storage.get(VIDEO_DATA_KEY); 
                
                        // 1. Отвечаем на колбэк, чтобы убрать часы
                        ctx.waitUntil(answerCallbackQuery(callback.id, "Начинаю транскрибацию видео...", token));
                        
                        if (!videoDataJson) {
                            ctx.waitUntil(sendMessage(chatId, "❌ Не удалось найти видеофайл. Пожалуйста, отправьте его снова.", token));
                            return true;
                        }
                
                        const videoData = JSON.parse(videoDataJson);
                        const videoFileId = videoData.file_id; // <-- Извлекаем нужный file_id
                
                        if (!videoFileId) {
                                ctx.waitUntil(sendMessage(chatId, "❌ В сохраненных данных не найден file_id видео.", token));
                                return true;
                        }
                
                        // 2. Вызываем функцию транскрибации, которая прекрасно работает с video file_id
                        // Telegram API позволяет скачать видеофайл, а STT-модель извлекает из него аудиодорожку.
                        ctx.waitUntil(transcribeVideoFileAsync(chatId, videoFileId, envData, ctx));
                
                        // 3. Завершаем HTTP-ответ, чтобы избежать зацикливания
                        return new Response('OK', { status: 200 });
                    }
                    case 'video_analysis': {
                        const VIDEO_DATA_KEY = chatId.toString() + '_last_video_data'; 
                        const videoDataJson = await storage.get(VIDEO_DATA_KEY); 
                        
                
                        // 1. Отвечаем на колбэк, чтобы убрать часы
                        ctx.waitUntil(answerCallbackQuery(callback.id, "Начинаю транскрибацию видео...", token));
                        
                        if (!videoDataJson) {
                            ctx.waitUntil(sendMessage(chatId, "❌ Не удалось найти видеофайл. Пожалуйста, отправьте его снова.", token));
                            return true;
                        }
                
                        const videoData = JSON.parse(videoDataJson);
                        const videoFileId = videoData.file_id; // <-- Извлекаем нужный file_id
                        const videoMimeType = videoData.mime_type; // <-- Получаем MIME-тип

                        if (!videoFileId) {
                                ctx.waitUntil(sendMessage(chatId, "❌ В сохраненных данных не найден file_id видео.", token));
                                return true;
                        }
                
                        // Вызов новой функции
                        ctx.waitUntil(analyzeVideoContentAsync(chatId, videoFileId, videoMimeType, envData, ctx));

                        // 3. Завершаем HTTP-ответ, чтобы избежать зацикливания
                        return new Response('OK', { status: 200 });
                    }
                    case 'vision_generate_free_t2i': {
                        // Вызов новой функции с 4 аргументами
                        ctx.waitUntil(processFreeCreativeCommand(
                            chatId, 
                            'T2I', 
                            storage, 
                            envData
                        ));
                        return new Response('OK', { status: 200 });
                    }
                    
                    case 'vision_generate_free_i2i': {
                        // Вызов новой функции с 4 аргументами
                        ctx.waitUntil(processFreeCreativeCommand(
                            chatId, 
                            'I2I', 
                            storage, 
                            envData
                        ));
                        return new Response('OK', { status: 200 });
                    }
                    case 'text_empty': {
                        // Мы используем messageId, который должен быть определен в начале блока callbackQuery
                        // (например, const messageId = callback.message.message_id; )
                        const chatKey = chatId.toString();
                        const storage = env.LAST_PHOTO_STORAGE;
                        const LAST_PROMPT_KEY = chatKey + envData.LAST_PROMPT_KEY_SUFFIX;
                        
                        // 1. Читаем сохраненный промпт (этот await допустим)
                        const currentPrompt = await storage.get(LAST_PROMPT_KEY);
                
                        // 2. Получаем данные для нового меню /text
                        const { messageText: createMessage, keyboardObject } = await getTextMenuKeyboard(chatId, storage, currentPrompt); // <-- Добавьте await здесь
                                                    
                        // 3. ОТПРАВКА: ✅ ИСПОЛЬЗУЕМ editMessageWithKeyboard для ЗАМЕНЫ СООБЩЕНИЯ
                        ctx.waitUntil(editMessageWithKeyboard( // <-- ИЗМЕНЕНО
                            chatId, 
                            messageId, // <-- ИСПОЛЬЗУЕМ messageId ТЕКУЩЕГО СООБЩЕНИЯ
                            createMessage, 
                            token, 
                            keyboardObject.inline_keyboard // Передаем клавиатуру
                        ));
                        
                        break; // break завершается через return new Response('OK', { status: 200 }); в конце блока if
                    }
                    case 'video': { 
                        // Поскольку колбэк не содержит промпта, мы знаем, что userPrompt пуст.
                        const videoPromptFromCommand = null; // или пустая строка
                        const chatKey = chatId.toString();
                        const storage = envData.LAST_PHOTO_STORAGE;
                        const messageId = callback.message.message_id; // ID сообщения меню, которое нужно отредактировать
                    
                        // 1. Читаем промпт из хранилища (если он там есть)
                        const LAST_PROMPT_KEY = chatKey + LAST_PROMPT_KEY_SUFFIX; 
                        let finalPrompt = null; 
                        if (storage) {
                            finalPrompt = await storage.get(LAST_PROMPT_KEY);
                        }
                    
                        // 2. Вызываем основную команду обработки видео
                        // NOTE: processVideoCommand теперь должна принимать messageId для редактирования!
                        // (Если ваша processVideoCommand не принимает messageId, вам нужно будет её обновить)
                        
                        // ВАЖНО: Мы используем editVideoGenerationMenu, а не send, т.к. мы нажимаем кнопку в существующем сообщении
                        
                        // Получаем текущие параметры для корректного редактирования меню
                        const VIDEO_PARAMS_KEY = chatKey + VIDEO_PARAMS_KEY_SUFFIX;
                        const LAST_VIDEO_KEY = chatKey + LAST_VIDEO_DATA_KEY_SUFFIX; // <-- НОВЫЙ КЛЮЧ
                        const LAST_AUDIO_KEY = chatKey + LAST_AUDIO_DATA_KEY_SUFFIX; // <-- НОВЫЙ КЛЮЧ
                        const LAST_IMAGE_KEY = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX;
                    
                        const [videoParams, rawImageKVData, currentMode, rawVideoKVData, rawAudioKVData] = await Promise.all([ // <-- ИЗМЕНЕН
                            storage.get(VIDEO_PARAMS_KEY, { type: 'json' })
                                .then(res => res || { seconds: '6', aspectRatio: '16:9', resolution: '480p', mode: 'T2V' })
                                .catch(() => ({ seconds: '6', aspectRatio: '16:9', resolution: '480p', mode: 'T2V' })), 
                            storage.get(LAST_IMAGE_KEY, { type: 'text' }),
                            storage.get(LAST_VIDEO_KEY, { type: 'text' }), // <-- ДОБАВЛЕН ЗАПРОС НА ВИДЕО
                            storage.get(LAST_AUDIO_KEY, { type: 'text' }) // <-- ДОБАВЛЕН ЗАПРОС НА АУДИО
                        ]);
                        
                        // Проверка наличия фото
                        let isPhotoSaved = false;
                        if (rawImageKVData && rawImageKVData.length > 100) { 
                            isPhotoSaved = true; 
                        }
                        // Определение наличия сохраненного видео. Добавлена проверка длины (>100 символов) для надежности.
                        const isVideoSaved = !!rawVideoKVData && rawVideoKVData.length > 100;
                        const isAudioSaved = !!rawAudioKVData && rawAudioKVData.length > 100;
                        // Редактируем сообщение, чтобы показать меню
                        ctx.waitUntil(editVideoGenerationMenu(
                            chatId, 
                            messageId, 
                            finalPrompt, // Используем промпт из хранилища
                            isPhotoSaved, 
                            isVideoSaved,
                            isAudioSaved,
                            envData.TELEGRAM_BOT_TOKEN, 
                            videoParams,
                            null,
                            null,
                            envData
                        ));
                    
                        // КРИТИЧНО: Возвращаем ответ Telegram
                        return new Response('OK', { status: 200 });
                    }
                case 'mediadata':
                    // Ответ на колбэк (гасим кнопку)
                    ctx.waitUntil(answerCallbackQuery(callbackId, "Меню медиа-данных...", token)); 
                    // Вызываем основную функцию для отображения меню
                    await sendMediaDataControlMenu(chatId, token, envData, messageId);
                    return new Response('OK', { status: 200 });
                    case 'grab_frame': {
                        const RENDER_HOST_URL = env.LESHIY_CONVERTER;
                        const VIDEO_TO_IMAGE_ENDPOINT = RENDER_HOST_URL + '/video2image';
                        const DEFAULT_TIMESTAMP = '00:00:01.000'; // Используем формат Render
                    
                        const videoKey = chatId + LAST_VIDEO_DATA_KEY_SUFFIX;
                        const imageKey = chatId + LAST_IMAGE_DATA_KEY_SUFFIX; 
                        let responseText;
                    
                        const rawVideoData = await storage.get(videoKey);
                    
                        if (!rawVideoData) {
                            responseText = "❌ **Ошибка:** Сначала загрузите видео (или оно устарело и было удалено).";
                            await editMessageWithKeyboard(chatId, messageId, responseText, token, null); 
                            return new Response('OK', { status: 200 });
                        }
                    
                        const videoData = JSON.parse(rawVideoData);
                        const videoFileId = videoData.file_id;
                        
                        if (!videoFileId) {
                            responseText = "❌ **Ошибка:** У загруженного видео нет file_id.";
                            await editMessageWithKeyboard(chatId, messageId, responseText, token, null); 
                            return new Response('OK', { status: 200 });
                        }
                    
                        try {
                            await answerCallbackQuery(callback.id, `🔄 Захват кадра...`, token);
                            await editMessageWithKeyboard(chatId, messageId, `⏳ **Конвертация: Скачиваю видео...**`, token, null);
                    
                            // 1. Скачиваем полное видео
                            const videoBuffer = await downloadFileBuffer(videoFileId, token, env);
                    
                            // 2. Отправляем видео на Render
                            await editMessageWithKeyboard(chatId, messageId, `⏳ **Конвертация: Видео -> Фото...** (Timestamp: ${DEFAULT_TIMESTAMP})`, token, null);
                    
                            const renderFormData = new FormData();
                            // Используем File, если Worker поддерживает его. Если нет, используйте Blob.
                            const videoFile = new File([videoBuffer], 'input.mp4', { type: 'video/mp4' });
                            renderFormData.append('video', videoFile, 'video.mp4');
                    
                            const finalRenderUrl = `${VIDEO_TO_IMAGE_ENDPOINT}?timestamp=${DEFAULT_TIMESTAMP}&format=jpg`;
                    
                            // 🛑 ИСПРАВЛЕНИЕ: Корректно парсим тело как JSON
                            const renderResponse = await env.LESHIY_CONVERTER.fetch(finalRenderUrl, {
                                method: 'POST',
                                body: renderFormData,
                                signal: AbortSignal.timeout(120000)
                            });
                    
                            if (!renderResponse.ok) {
                                const errorDetails = await renderResponse.text().catch(() => 'No details');
                                throw new Error(`Render Server Error: ${renderResponse.status} - ${errorDetails.substring(0, 150)}`);
                            }
                            
                            // 1. Парсим тело как JSON
                            const renderResult = await renderResponse.json();
                            
                            // 2. Детальная проверка JSON
                            if (!renderResult.success || !renderResult.image || !renderResult.width || !renderResult.height) {
                                    
                                    let errorMsg = `JSON response incomplete or failed.`;
                                    if (renderResult.error) {
                                        errorMsg = `Render reported error: ${renderResult.error.substring(0, 150)}`;
                                    } else {
                                        // Если полей нет, сообщаем о них
                                        const missingFields = [];
                                        if (renderResult.success === undefined) missingFields.push('success');
                                        if (!renderResult.image) missingFields.push('image');
                                        if (!renderResult.width) missingFields.push('width');
                                        if (!renderResult.height) missingFields.push('height');
                                        
                                        if (missingFields.length > 0) {
                                            errorMsg = `Missing fields: ${missingFields.join(', ')}. Status: ${renderResult.success}`;
                                        }
                                    }
                    
                                    throw new Error(`Render failed: ${errorMsg}`);
                            }
                    
                            // 3. Сохраняем данные (Base64 и размеры)
                            const fullBase64Image = renderResult.image; 
                            const mime = renderResult.mimeType || `image/${renderResult.format || 'jpeg'}`;
                            
                            const imageData = JSON.stringify({
                                base64: fullBase64Image,
                                width: renderResult.width,
                                height: renderResult.height,
                                mime_type: mime,
                            });
                    
                            // 4. Сохраняем как основное фото
                            await storage.put(imageKey, imageData, { expirationTtl: 3600 }); 
                            
                            responseText = `🖼️ **Стоп-кадр (${DEFAULT_TIMESTAMP}) успешно захвачен и сохранен как фото!**\n\nРазмеры: **${renderResult.width}x${renderResult.height}**. Теперь вы можете использовать его в меню /photo для улучшения или оживления.`;
                    
                        } catch (e) {
                            console.error("Frame grab failed:", e);
                            // 5. Выводим более информативную ошибку
                            responseText = `❌ **Критическая ошибка захвата кадра:** Не удалось получить изображение.\n\nДетали: *${e.message.substring(0, 200)}*`;
                        }
                    
                        // 6. Обновляем сообщение
                        await editMessageWithKeyboard(chatId, messageId, responseText, token, null);
                    
                        return new Response('OK', { status: 200 });
                    }
                    case 'grab_audio': {
                        // 🛑 КОНСТАНТЫ И ПЕРЕМЕННЫЕ
                        const STORAGE = envData.LAST_PHOTO_STORAGE;
                        const token = envData.TELEGRAM_BOT_TOKEN;
                        const originalMessageId = messageId; 
                        
                        // Ключи KV для текущего чата
                        // ОСТАВЛЯЕМ ТОЛЬКО КЛЮЧИ С АКТУАЛЬНЫМИ ДАННЫМИ
                        const LAST_VIDEO_DATA_KEY = chatId.toString() + LAST_VIDEO_DATA_KEY_SUFFIX;
                        const LAST_MEDIA_TYPE_KEY = chatId.toString() + LAST_MEDIA_TYPE_KEY_SUFFIX;
                        
                        let mediaFileId = null;
                        let fileUrl = null; // Будет определен позже в runGrabAudioInBackground
                        
                        // 1. 🔍 Определяем, что последний файл был видео
                        const lastMediaType = await STORAGE.get(LAST_MEDIA_TYPE_KEY);
                        
                        if (lastMediaType !== 'video') {
                            await editMessage(chatId, originalMessageId, "❌ Ошибка: Последний загруженный файл не является видео.", token);
                            return new Response('OK', { status: 200 });
                        }
                        
                        // 2. 📝 ПРИНУДИТЕЛЬНО ИЗВЛЕКАЕМ file_id ИЗ АКТУАЛЬНЫХ МЕТАДАННЫХ
                        const videoDataRaw = await STORAGE.get(LAST_VIDEO_DATA_KEY);
                        
                        if (videoDataRaw) {
                            try {
                                const videoData = JSON.parse(videoDataRaw);
                                mediaFileId = videoData.file_id; // <-- АКТУАЛЬНЫЙ file_id
                            } catch(e) { 
                                envData.ctx.waitUntil(logDebug("GRAB_AUDIO", `Ошибка парсинга LAST_VIDEO_DATA_KEY: ${e.message}`, envData));
                            }
                        }
                        
                        // 3. ❌ Обработка: file_id не найден
                        if (!mediaFileId) {
                            await editMessage(chatId, originalMessageId, "❌ Ошибка: Не найден активный file_id видео для обработки. Загрузите видео снова.", token);
                            return new Response('OK', { status: 200 });
                        }
                    
                        // 4. 🚀 Запуск задачи ИЗВЛЕЧЕНИЯ АУДИО
                        try {
                            // 1. 💿 НЕМЕДЛЕННАЯ ОТПРАВКА НОВОГО СООБЩЕНИЯ-ЗАГЛУШКИ
                            const loadingMessage = await sendMessageMarkdown(chatId, "💿 **Приступаю к извлечению аудиодорожки...**", token);
                            let loadingMessageId = null;
                            
                            // Проверка здоровья конвертера
                            const isHealthy = await checkConverterHealth(envData);
                            if (!isHealthy) {
                                await editMessage(chatId, loadingMessageId, '❌ **Ошибка:** Ваш конвертер на Render недоступен для работы.', token);
                                return new Response('OK', { status: 200 });
                            }
                    
                            if (loadingMessage.ok && loadingMessage.result) {
                                    loadingMessageId = loadingMessage.result.message_id;
                            } else {
                                // Если не удалось отправить заглушку, используем оригинальный ID для вывода ошибки позже
                                loadingMessageId = originalMessageId; 
                            }
                    
                            // 2. 🗑️ РЕДАКТИРУЕМ ИСХОДНОЕ СООБЩЕНИЕ
                            envData.ctx.waitUntil(logDebug("AUDIO_GRAB_SOURCE", `Source: video. file_id: ${mediaFileId}`, envData)); 
                            
                            // 3. 🎯 Запуск фоновой задачи: ПЕРЕДАЕМ ТОЛЬКО file_id И messageId
                            envData.ctx.waitUntil(
                                // 🛑 ВАЖНО: runGrabAudioInBackground теперь должна сама получить fileUrl
                                runGrabAudioInBackground(chatId, mediaFileId, loadingMessageId, envData, token)
                            );
                            
                            // 4. ✅ Немедленный выход
                            return new Response('OK', { status: 200 }); 
                            
                        } catch (error) {
                            // 9. ❌ Обработка сбоя запуска задачи
                            const errorMessage = error.message || "Неизвестная ошибка Audio Isolation";
                            
                            await editMessage(chatId, messageId, `❌ **Ошибка запуска Kie.ai:**\n\`${errorMessage.substring(0, 150)}\``, token);
                            envData.ctx.waitUntil(logDebug("AUDIO_GRAB_FAIL", errorMessage, envData));
                            
                            // 🛑 Выход после сбоя запуска
                            return new Response('OK', { status: 200 });
                        }
                    }
                    case 'isolate_audio': {
                        // 🛑 КОНСТАНТЫ И ПЕРЕМЕННЫЕ
                        const MIN_DURATION = 4.6; 
                        const STORAGE = envData.LAST_PHOTO_STORAGE;
                        const token = envData.TELEGRAM_BOT_TOKEN;
                        const originalMessageId = messageId; 
                        
                        // Ключи KV для текущего чата
                        const AUDIO_URL_KEY = chatId.toString() + AUDIO_URL_KEY_SUFFIX;
                        const AUDIO_FILE_ID_KEY = chatId.toString() + AUDIO_FILE_ID_KEY_SUFFIX;
                        const AUDIO_DURATION_KEY = chatId.toString() + AUDIO_DURATION_KEY_SUFFIX; 
                        const LAST_MEDIA_TYPE_KEY = chatId.toString() + LAST_MEDIA_TYPE_KEY_SUFFIX;
                        
                        let fileUrl = null;
                        let mediaFileId = null;
                        
                        // 1. 🔍 Определяем, что последний файл был АУДИО
                        const lastMediaType = await STORAGE.get(LAST_MEDIA_TYPE_KEY); 
                        
                        if (lastMediaType !== 'audio') {
                            await editMessage(chatId, originalMessageId, "❌ Ошибка: Очистка шумов применима только к **аудиодорожке**. Загрузите голосовое сообщение или MP3 файл.", token);
                            return new Response('OK', { status: 200 });
                        }
                        
                        // 2. 📝 Пытаемся получить URL или file_id
                        fileUrl = await STORAGE.get(AUDIO_URL_KEY);
                        mediaFileId = await STORAGE.get(AUDIO_FILE_ID_KEY); 
                        
                        // 3. ❌ Обработка: Файл не найден
                        if (!fileUrl && !mediaFileId) {
                            await editMessage(chatId, originalMessageId, "❌ Ошибка: Не найден активный аудиофайл для изоляции. Загрузите аудио снова.", token);
                            return new Response('OK', { status: 200 }); 
                        }
                    
                        // 4. 🔗 Восстановление/Получение URL (если fileUrl истек или отсутствует)
                        if (!fileUrl && mediaFileId) {
                            const getFileUrlApi = `https://api.telegram.org/bot${token}/getFile?file_id=${mediaFileId}`;
                            const fileResponse = await fetch(getFileUrlApi);
                            const fileData = await fileResponse.json();
                            
                            if (!fileData.ok) {
                                await editMessage(chatId, originalMessageId, `❌ Ошибка Telegram getFile: ${fileData.description}`, token);
                                return new Response('OK', { status: 200 }); 
                            }
                            
                            const filePath = fileData.result.file_path;
                            fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
                            
                            // Сохраняем сгенерированный URL
                            envData.ctx.waitUntil(STORAGE.put(AUDIO_URL_KEY, fileUrl, { expirationTtl: 3600 }));
                        }
                        
                        // 5. ⏱️ ПРОВЕРКА ДЛИТЕЛЬНОСТИ
                        let duration = 0;
                        try {
                            const durationRaw = await STORAGE.get(AUDIO_DURATION_KEY); 
                            if (durationRaw) {
                                duration = parseFloat(durationRaw); 
                            }
                        } catch (e) {
                            envData.ctx.waitUntil(logDebug("WARNING", `Не удалось получить длительность: ${e.message}`, envData));
                        }
                        
                        if (duration > 0 && duration < MIN_DURATION) {
                            await editMessage(
                                chatId, 
                                originalMessageId, 
                                `❌ **Ошибка длительности:** Аудио (${duration.toFixed(3)} сек.) слишком мало. Требуется минимум ${MIN_DURATION} секунд для изоляции.`, 
                                token
                            );
                            return new Response('OK', { status: 200 });
                        }
                        
                        // 6. 🚀 ПОДГОТОВКА И ЗАПУСК KIE.AI
                        try {
                            // 🛑 ИСПОЛЬЗУЕМ loadActiveConfig
                            const SERVICE_TYPE = 'AUDIO_TO_AUDIO';
                            const { config: activeModelConfig, friendlyName } = await loadActiveConfig(SERVICE_TYPE, envData, chatId);
                            
                            if (!activeModelConfig || typeof activeModelConfig.FUNCTION !== 'function') {
                                throw new Error(`Конфигурация модели Kie.ai (${friendlyName || 'неизвестно'}) не найдена или настроена неверно.`);
                            }
                            
                            const sourceText = `URL: ${fileUrl.substring(0, 50)}`;
                            
                            // 1. УДАЛЯЕМ КНОПКИ И ОТПРАВЛЯЕМ ЗАГЛУШКУ
                            // Мы используем originalMessageId для редактирования, т.к. Kie.ai вернет результат колбэком.
                            await editMessage(chatId, originalMessageId, `💿 **Начинаю изоляцию аудио** (Источник: аудио, ${sourceText}).`, token);
                    
                            envData.ctx.waitUntil(logDebug("AUDIO_ISOLATE_START", `Source URL: ${fileUrl.substring(0, 50)}`, envData)); 
                    
                            // 2. 🎯 ЗАПУСК ФУНКЦИИ KIE.AI В ФОНЕ
                            // Эта функция инициирует асинхронный процесс и должна сохранить `originalMessageId` для обратной связи через колбэк.
                            envData.ctx.waitUntil(
                                activeModelConfig.FUNCTION(
                                    activeModelConfig, 
                                    fileUrl, 
                                    envData, 
                                    chatId,
                                    originalMessageId // Передаем ID сообщения, которое нужно будет обновить при получении результата
                                )
                            );
                            
                            // 7. ✅ Успешный выход после запуска (ждем вебхук)
                            return new Response('OK', { status: 200 }); 
                            
                        } catch (error) {
                            // 8. ❌ Обработка сбоя запуска задачи Kie.ai
                            const errorMessage = error.message || "Неизвестная ошибка Audio Isolation";
                            
                            await editMessage(chatId, originalMessageId, `❌ **Ошибка запуска Kie.ai:**\n\`${errorMessage.substring(0, 150)}\``, token);
                            envData.ctx.waitUntil(logDebug("AUDIO_ISOLATE_FAIL", errorMessage, envData));
                            
                            return new Response('OK', { status: 200 });
                        }
                    }
                    case 'clear_image': {
                        let clearImageText = "❌ Фото не найдено в памяти.";
                        const imageKey = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX; // <--- ИСПОЛЬЗУЕМ СТРОКОВЫЙ КЛЮЧ
                        // 1. Пытаемся удалить видео из KV
                        await storage.delete(imageKey); 

                        // 2. Успешное сообщение
                        clearImageText = "🗑️ **Сохраненное фото удалено.**\n\nТеперь вы можете загрузить новое фото для обработки.";

                        // 3. Обновляем сообщение (где была кнопка) - удаляем кнопки
                        await editMessageWithKeyboard(chatId, messageId, clearImageText, token, null);

                        // Подтверждаем, что обработка callback завершена
                        return new Response('OK', { status: 200 });
                    }
                    case 'clear_video': {
                        let clearVideoText = "❌ Видео не найдено в памяти.";
                        const videoKey = chatKey + LAST_VIDEO_DATA_KEY_SUFFIX; // <--- ИСПОЛЬЗУЕМ СТРОКОВЫЙ КЛЮЧ
                        // 1. Пытаемся удалить видео из KV
                        await storage.delete(videoKey); 

                        // 2. Успешное сообщение
                        clearVideoText = "🗑️ **Сохраненное видео удалено.**\n\nТеперь вы можете загрузить новое видео для обработки.";

                        // 3. Обновляем сообщение (где была кнопка) - удаляем кнопки
                        await editMessageWithKeyboard(chatId, messageId, clearVideoText, token, null);

                        // Подтверждаем, что обработка callback завершена
                        return new Response('OK', { status: 200 });
                    }
                    case 'clear_audio': {
                        let clearAudioText;
                        const audioKey = chatKey + LAST_AUDIO_DATA_KEY_SUFFIX; // Используем ключ для URL/ID аудио
                        // Ключи для удаления
                        const keysToDelete = [
                            chatId + AUDIO_URL_KEY_SUFFIX,          // URL входящего аудио (для A2V)
                            chatId + LAST_AUDIO_DATA_KEY_SUFFIX,    // Base64 аудио (из /say)
                            chatId + '_audio_file_id'               // ✅ file_id (для view_saved_audio)
                        ];

                        // 1. Удаляем все возможные ключи в фоне
                        await Promise.all(keysToDelete.map(key => storage.delete(key)));
                        
                        // 2. Успешное сообщение
                        clearAudioText = "🗑️ **Сохраненное аудио удалено.**\n\nТеперь вы можете загрузить новый файл или создать озвучку через /say.";

                        // 3. Обновляем сообщение (где была кнопка) - удаляем кнопки
                        await editMessageWithKeyboard(chatId, messageId, clearAudioText, token, null);
                        
                        // Подтверждаем, что обработка callback завершена
                        return new Response('OK', { status: 200 });
                    }
                    case 'say_empty': // Добавляем новый case для команды /say
                        // Используем await, так как нам нужно дождаться отправки аудио
                        await processSayCommand(chatId, '/say', envData, ctx);
                        break;
                    case 'checkvideo':
                        // Вызов новой функции для обработки статуса видео
                        // Вам также нужно передать envData, чтобы получить доступ к KV и токену
                        await handleCheckVideoCommand(chatId, messageText, envData); // <--- ДОБАВЛЕН text
                        break;
                    case 'stop':
                        // ✅ ИСПРАВЛЕНИЕ: Добавлен пятый аргумент envData в processStopCommand
                        ctx.waitUntil(processStopCommand(chatId, storage, token, envData));
                        break;
                    case 'reset':
                        await envData.CHAT_HISTORY_STORAGE.delete(chatKey);
                        await sendMessageMarkdown(chatId, "✅ **История чата сброшена.** Можете начать новую беседу.", token);
                        return true;
                    case 'setkey':
                        // --- ЛОГИКА /setkey (Запрос ключа + Reply Keyboard) ---
                        const setKeyPromise = (async () => {
                            // Переменные из окружающего контекста (предполагаем, что они доступны)
                            const chatKey = chatId.toString();
                            const storage = envData.LAST_PHOTO_STORAGE;
                            const token = envData.TELEGRAM_BOT_TOKEN; // или просто env.TELEGRAM_BOT_TOKEN
                            
                            // 1. ОПРЕДЕЛЕНИЕ КЛЮЧА СОСТОЯНИЯ
                            const USER_STATE_KEY = chatKey + USER_STATE_KEY_SUFFIX; 
                    
                            // 2. УСТАНОВКА СОСТОЯНИЯ ЧАТА В 'awaiting_apikey'
                            await storage.put(USER_STATE_KEY, 'awaiting_apikey', { expirationTtl: 300 }); // Ждем ввода 5 минут
                    
                            // Используем ВАШУ функцию для Reply Keyboard
                            const replyKeyboard = getCancelReplyKeyboard();
                    
                            let statusMessage = "🔑 **Ввод API-ключа KIE.ai**\n\n" +
                                                "Введите ключ **отдельным сообщением** или скопируйте и вставьте команду `/setkey <ВАШ_КЛЮЧ>`.\n" +
                                                "Ключ можно получить на сайте: https://kie.ai/ru/api-key (выдается 80 БЕСПЛАТНЫХ кредитов).";
                    
                            // ОТПРАВЛЯЕМ НОВОЕ СООБЩЕНИЕ С REPLY KEYBOARD
                            await sendMessageMarkdown(chatId, statusMessage, token, null, replyKeyboard);
                        })();
                        ctx.waitUntil(setKeyPromise);
                        break;
                    case 'checkkey':
                        // --- ЛОГИКА /checkkey (Обновить текущий баланс и редактировать) ---
                        const checkKeyPromise = (async () => {
                            const userApiKey = await storage.get(USER_API_KEY_KV);
                            let userKieAiBalance = await storage.get(USER_LIMIT_KEY) || 0;

                            // --- ЗАПРОС БАЛАНСА KIE.AI ---
                            if (userApiKey) {
                                try {
                                    // Вызываем существующую функцию для получения баланса по главному ключу
                                    const balanceKieAiResult = await updateKieAiUserCredits(userApiKey, envData, ctx); 
                                    
                                    if (typeof balanceKieAiResult === 'number') {
                                        userKieAiBalance = `${balanceKieAiResult}`;
                                        await storage.put(USER_LIMIT_KEY, userKieAiBalance.toString());
                                    } else if (balanceKieAiResult === 'InvalidKey') {
                                        userKieAiBalance = 'Недействительный ключ (401)';
                                    } else {
                                        userKieAiBalance = 'Ошибка (см. логи)';
                                    }
                                } catch (e) {
                                    // Ошибка сети или другая
                                    ctx.waitUntil(logDebug('ADMIN_BALANCE_FETCH_ERROR', `Ошибка запроса баланса KIE.AI: ${e.message}`, envData));
                                    userKieAiBalance = 'Ошибка сети';
                                }
                            } else {
                                userKieAiBalance = 'Ключ userApiKey не установлен!';
                            }
                            
                            // 🛑 ФОРМИРУЕМ STATUS MESSAGE
                            const creditWord = pluralize(userKieAiBalance, CREDIT_FORMS);
                            let statusMessage = '🔑 **Меню управления API-ключом KIE.ai**\n\n';
                            if (userApiKey) {
                                statusMessage += `✅ **Статус ключа:** установлен\n` +
                                                `🔐 Ваш личный ключ: \`${userApiKey.substring(0, 10)}...\`\n` +
                                                `💰 **Баланс:** **${userKieAiBalance}** ${creditWord}.\n\n` +
                                                `Вы используете лимиты и баланс, связанные с этим ключом. Отслеживайте его в личном кабинете https://kie.ai/ru/usage`;
                            } else {
                                statusMessage += `❌ **Статус ключа:** отсутствует\n` +
                                                `🔒 Личный ключ не найден.\n` +
                                                `Вы используете общий (административный) ключ.`;
                            }
                            
                            // Клавиатура должна быть объектом { inline_keyboard: [...] }
                            const keyboard = {
                                inline_keyboard: [
                                    [{ text: "🏠 Открыть главное меню /start", callback_data: "start_command" }],
                                    [{ text: "📊 Проверить баланс", callback_data: "cmd:/checkkey" }],
                                    [{ text: "🔑 Установить/Заменить ключ", callback_data: "cmd:/setkey" }],
                                    [{ text: "🗑️ Удалить ключ", callback_data: "cmd:/delkey" }]
                                ]
                            };
                            
                            // !!! ИСПОЛЬЗУЕМ ВАШУ ФУНКЦИЮ editMessageWithKeyboard
                            await editMessageWithKeyboard(chatId, messageId, statusMessage, token, keyboard);
                        })();
                        
                        ctx.waitUntil(checkKeyPromise);
                        break;
                    case 'delkey':
                        // --- ЛОГИКА /delkey (Удалить ключ и обновить окно) ---
                        const delKeyPromise = (async () => {
                            const userApiKey = await storage.get(USER_API_KEY_KV);

                            if (userApiKey) {
                                // Удаляем ключ и обнуляем лимит
                                await storage.delete(USER_API_KEY_KV);
                                await storage.delete(USER_LIMIT_KEY);
                                await sendMessageMarkdown(chatId, "🗑️ **API-ключ KIE.ai успешно удален.**", token);
                            } else {
                                await sendMessageMarkdown(chatId, "🗑️ **API-ключ KIE.ai отсутствует.**", token);
                            };
                            
                            // Обновляем главное меню /apikey (теперь ключ не найден)
                            let statusMessage = '🔑 **Меню управления API-ключом KIE.ai**\n\n' + 
                                                '❌ **Статус ключа:** отсутствует\n' +
                                                '🔒 Личный ключ не найден.\n' +
                                                'Вы используете общий (административный) ключ.';
                                                
                            // Клавиатура должна быть объектом { inline_keyboard: [...] }
                            const keyboard = {
                                inline_keyboard: [
                                    [{ text: "🏠 Открыть главное меню /start", callback_data: "start_command" }],
                                    [{ text: "📊 Проверить баланс", callback_data: "cmd:/checkkey" }],
                                    [{ text: "🔑 Установить/Заменить ключ", callback_data: "cmd:/setkey" }],
                                    [{ text: "🗑️ Удалить ключ", callback_data: "cmd:/delkey" }]
                                ]
                            };
                            
                            // !!! ИСПОЛЬЗУЕМ ВАШУ ФУНКЦИЮ editMessageWithKeyboard
                            await editMessageWithKeyboard(chatId, messageId, statusMessage, token, keyboard);
                        })();
                        
                        ctx.waitUntil(delKeyPromise);
                        break;
                    default:
                        ctx.waitUntil(sendMessage(chatId, `Команда по кнопке не найдена. Получено: ${command}`, token));
                        break;
                }
                // Этот return обрабатывает все команды, которые завершились через break (prompt, stop, create_empty)
                return new Response('OK', { status: 200 });
            // 1. Показать опции оплаты
            } else if (data === 'show_payment_options') {
                const paymentOptionsKeyboard = getPaymentOptionsKeyboard(); // Вызываем новую функцию
                ctx.waitUntil(editMessageWithKeyboard(
                    chatId,
                    messageId,
                    "💰 Выберите пакет кредитов для покупки:",
                    envData.TELEGRAM_BOT_TOKEN,
                    paymentOptionsKeyboard.inline_keyboard // Передаем только массив
                ));
    
                return new Response('OK', { status: 200 });
            // 2. Кнопка "Назад" (Возврат к балансу)
            } else if (data === 'show_balance') {
                // --- АСИНХРОННЫЙ ВЫЗОВ: ПОЛУЧАЕМ СТАТУС БАЛАНСА ---
                const balanceStatus = await getCurrentCreditBalance(chatId, envData.LAST_PHOTO_STORAGE);
                // ---------------------------------------------            
                
                // 3. Формируем текст сообщения
                const balanceText = 
`💰 Меню управления балансом:

Ваш текущий баланс: 💰 ${balanceStatus}.

Для покупки новых кредитов нажмите 💰 Пополнить баланс..`;
        
                const balanceKeyboard = getBalanceKeyboard();
                
                // 4. Редактируем сообщение, возвращая главное меню баланса
                ctx.waitUntil(editMessageWithKeyboard(
                    chatId,
                    messageId,
                    balanceText,
                    envData.TELEGRAM_BOT_TOKEN,
                    balanceKeyboard.inline_keyboard // Передаем только массив
                ));

                return new Response('OK', { status: 200 });
                    
            // 3. Заглушки для истории/настроек
            } else if (data === 'show_history') {
                // 1. Получаем отформатированную историю
                const historyText = await getFormattedHistory(chatId, env);
                
                const messageText = `
📜 **История операций:**

${historyText}`;

                // 2. Отправляем сообщение с клавиатурой "Назад"
                ctx.waitUntil(editMessageWithKeyboard(
                    chatId,
                    messageId,
                    messageText,
                    envData.TELEGRAM_BOT_TOKEN,
                    getTempBackKeyboard().inline_keyboard 
                ));

                return new Response('OK', { status: 200 });
            } else if (data === 'show_settings') {
                const tempText = '⚙️ **Настройки бота:** Здесь будут настройки, например, промты по умолчанию.'
    
                ctx.waitUntil(editMessageWithKeyboard(
                    chatId,
                    messageId,
                    tempText,
                    envData.TELEGRAM_BOT_TOKEN,
                    getTempBackKeyboard().inline_keyboard // Клавиатура "Назад"
                ));
    
                return new Response('OK', { status: 200 });
                // --- ЛОГИКА ПОКУПКИ ЗВЕЗД (buy_stars) ---
            } else if (data.startsWith('buy_stars:')) {
                // data формата: buy_stars:STARS:CREDITS
                const parts = data.split(':');
                const stars = parseInt(parts[1]);
                const credits = parseInt(parts[2]); // <--- Теперь это 2, 15, 35 и т.д.
                
                const title = `${credits} Кредитов Gemini AI`;
                const description = `Пополнение внутреннего баланса бота на ${credits} кредитов.`;
                
                // 🔥 ИСПРАВЛЕНИЕ: МЕНЯЕМ статику на credits
                const uniquePayload = `credits_${credits}_${Date.now()}`; // Используем динамическое значение `credits`
                
                ctx.waitUntil(answerCallbackQuery(callback.id, "Создаю счет...", token));
                
                // Отправляем инвойс
                ctx.waitUntil(sendStarsInvoice(chatId, stars, title, description, uniquePayload, token));
                
                return new Response('OK', { status: 200 });
            
            } else if (data.startsWith('switch_creative_mode|')) {
                const creativeMode = data.split('|')[1]; // Получаем 'T2I' или 'I2I'
                const chatKey = chatId.toString();
                const LAST_PROMPT_KEY = chatKey + envData.LAST_PROMPT_KEY_SUFFIX;
                const CREATIVE_MODE_KEY = chatKey + envData.CREATIVE_MODE_KEY_SUFFIX
            
                // 🛑 1. КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: СОХРАНЯЕМ НОВЫЙ РЕЖИМ В KV
                await envData.LAST_PHOTO_STORAGE.put(CREATIVE_MODE_KEY, creativeMode); 
            
                // 2. Читаем сохраненный промпт
                const currentPrompt = await storage.get(LAST_PROMPT_KEY);
            
                // 3. Получаем данные для нового меню /create
                // ✅ ИСПРАВЛЕНИЕ: messageText: createMessage
                const { messageText: createMessage, keyboardObject } = await getCreateMenuKeyboard(
                    currentPrompt, 
                    creativeMode, // Передаем только что сохраненный режим
                    chatId, 
                    envData.LAST_PHOTO_STORAGE // 🛑 ПЕРЕДАЧА БИНДИНГА KV
                );
            
                // 4. ОТПРАВКА: Используем editMessageWithKeyboard для ЗАМЕНЫ СООБЩЕНИЯ
                ctx.waitUntil(editMessageWithKeyboard(
                    chatId, 
                    messageId, // Используем messageId ТЕКУЩЕГО СООБЩЕНИЯ
                    createMessage, 
                    token, 
                    keyboardObject.inline_keyboard // Передаем клавиатуру
                ));
                return new Response('OK', { status: 200 });
            
            } else if (data.startsWith(SET_BASE_CALLBACK)) { 
                const chatId = callback.message.chat.id;
                const messageId = callback.message.message_id;
                
                // --- ОСНОВНОЙ КЛЮЧ: содержит актуальные Base64 и file_id после всех операций ---
                const FINAL_PHOTO_KV_KEY = chatId + '_last_image_data'; 
                const CALLBACK_TEMP_STORAGE = env.LAST_PHOTO_STORAGE; 
                
                try {
                    // 1. Уведомление пользователя
                    await answerCallbackQuery(callback.id, "✅ Фотография устанавливается как исходная", envData.TELEGRAM_BOT_TOKEN);
                    await editMessageCaption(chatId, messageId, "⏳ Установка изображения как нового исходного", envData.TELEGRAM_BOT_TOKEN); 
                    
                    // 2. ЧТЕНИЕ АКТУАЛЬНОГО СОСТОЯНИЯ ИЗ ОСНОВНОГО ХРАНИЛИЩА
                    const finalPhotoDataRaw = await CALLBACK_TEMP_STORAGE.get(FINAL_PHOTO_KV_KEY);
                    
                    if (!finalPhotoDataRaw) {
                            throw new Error("Не найдены актуальные данные фото. Срок действия истек.");
                    }
            
                    const finalPhotoData = JSON.parse(finalPhotoDataRaw);
                    
                    // 3. ПРОВЕРКА: Убеждаемся, что есть Base64 от повернутого фото
                    if (!finalPhotoData.base64) {
                            throw new Error("Отсутствует Base64 для сохранения. Сначала поверните или загрузите фото.");
                    }
            
                    // 4. СБРОС И СОХРАНЕНИЕ: Устанавливаем текущее Base64 как новую "базу"
                    // Фактически мы просто обновляем основной ключ, сбрасывая счетчик поворота.
                    finalPhotoData.rotation = 0; // Сбрасываем поворот в ноль
                    
                    await CALLBACK_TEMP_STORAGE.put(
                        FINAL_PHOTO_KV_KEY, 
                        JSON.stringify(finalPhotoData), 
                        { expirationTtl: 3600 }
                    );
                    
                    // 5. Успешное завершение
                    await editMessageCaption(chatId, messageId, "✅ Изображение успешно установлено как исходное", envData.TELEGRAM_BOT_TOKEN);

                    // Дополнительное сообщение (если нужно, используйте вашу функцию sendMessage)
                    await sendMessage(chatId, "✅ Исходное фото обновлено! Можете продолжить работу", envData.TELEGRAM_BOT_TOKEN); 
                    
                } catch (e) {
                    // Логирование и обработка ошибок
                    logDebug('[SET_BASE] CRITICAL ERROR', e.message, envData);
                    await editMessageCaption(chatId, messageId, `❌ Критическая ошибка:\n${escapeMarkdownV2(e.message.substring(0, 200))}`, envData.TELEGRAM_BOT_TOKEN);
                    return new Response('OK', { status: 200 }); 
                }
                
                // 6. Изолированная очистка временного ключа
                try {
                    const shortCallbackKey = data.replace(SET_BASE_CALLBACK, '');
                    const KV_KEY = `callback_${chatId}_${shortCallbackKey}`; 
                    await CALLBACK_TEMP_STORAGE.delete(KV_KEY);
                    logDebug('[SET_BASE] Cleanup', `Temporary key ${KV_KEY} deleted.`, envData);
                } catch (e) {
                    logDebug('[SET_BASE] Cleanup Error', `Failed to delete temp key: ${e.message}`, envData);
                    // Мы игнорируем эту ошибку, так как она не влияет на основное сохранение.
                }
                
                return new Response('OK', { status: 200 }); 
            } else if (data.startsWith(ROTATE_LEFT_CALLBACK) || data.startsWith(ROTATE_RIGHT_CALLBACK) || data.startsWith(ROTATE_180_CALLBACK)) {
                const chatId = callback.message.chat.id;
                const messageId = callback.message.message_id;

                let angle = '0';
                let shortCallbackKey = '';
            
                if (data.startsWith(ROTATE_LEFT_CALLBACK)) {
                    angle = '-90'; // Угол для Render: -90 влево
                    shortCallbackKey = data.replace(ROTATE_LEFT_CALLBACK, '');
                } else if (data.startsWith(ROTATE_RIGHT_CALLBACK)) {
                    angle = '90'; // Угол для Render: 90 вправо
                    shortCallbackKey = data.replace(ROTATE_RIGHT_CALLBACK, '');
                } else if (data.startsWith(ROTATE_180_CALLBACK)) {
                    angle = '180'; // Угол для Render: 180
                    shortCallbackKey = data.replace(ROTATE_180_CALLBACK, '');
                }
                angle = angle.toString().trim(); // Если угол не 0, он будет '90', '-90' или '180'.
                const KV_KEY = `callback_${chatId}_${shortCallbackKey}`; 
            
                const token = env.TELEGRAM_BOT_TOKEN;
                const originalMessageId = callback.message.message_id;
                // 🛑 КРИТИЧНО: Сохраняем текущую клавиатуру
                const originalReplyMarkup = callback.message.reply_markup; 
            
                try {
                    // 1. 🛑 СРАЗУ ОТВЕЧАЕМ НА КОЛБЭК!
                    await answerCallbackQuery(callback.id, `🔄 Запускаю поворот фото...`, token);
                    
                    // 2. Извлекаем fileId из KV
                    const stateJSON = await env.LAST_PHOTO_STORAGE.get(KV_KEY);
                    if (!stateJSON) {
                        // Редактируем подпись оригинального сообщения
                        await editMessageCaption(chatId, originalMessageId, "❌ Ошибка: Срок действия кнопки истек", token, originalReplyMarkup);
                        return new Response('OK', { status: 200 }); 
                    }
                    const rotationState = JSON.parse(stateJSON);
                    const fileId = rotationState.fileId; 
                    
                    // 3. 📢 ОТПРАВЛЯЕМ НОВОЕ СООБЩЕНИЕ для статуса
                    const loadingMessage = await sendMessageMarkdown(chatId, `⏳ **Начинаю преобразование...**`, token);
                    const loadingMessageId = loadingMessage.result.message_id;
            
                    // 4. Запуск асинхронной задачи (здесь должно быть обеспечено, что ctx определен)
                    ctx.waitUntil(
                        runPhotoRotationInBackground(
                            chatId, 
                            fileId, 
                            originalMessageId, 
                            loadingMessageId, // НОВЫЙ АРГУМЕНТ
                            originalReplyMarkup, 
                            angle, 
                            env, 
                            token,
                            ctx // Передаем ctx, как обсуждалось ранее
                        )
                    );
            
                } catch (e) {
                    console.error("Critical Rotate Error (Launch):", e);
                    await sendMessage(chatId, `❌ Критическая ошибка Worker'а: ${e.message.substring(0, 150)}`, token); 
                }
                // Очищаем временный ключ сразу после использования
                return new Response('OK', { status: 200 }); 
            } else if (data.startsWith(SET_VIDEO_BASE_CALLBACK)) {
                const chatId = callback.message.chat.id;
                const messageId = callback.message.message_id;
                
                // --- ОСНОВНОЙ КЛЮЧ ДЛЯ ВИДЕО: содержит актуальные Base64 и file_id после всех операций ---
                const FINAL_VIDEO_KV_KEY = chatId + '_last_video_data'; 
                const CALLBACK_TEMP_STORAGE = envData.LAST_PHOTO_STORAGE; // Используем то же хранилище
                
                try {
                    // 1. Уведомление пользователя
                    await answerCallbackQuery(callback.id, "✅ Видео устанавливается как исходное", envData.TELEGRAM_BOT_TOKEN);
                    await editMessageCaption(chatId, messageId, "⏳ Установка видео как нового исходного", envData.TELEGRAM_BOT_TOKEN); 

                    // --- ИСПРАВЛЕНИЕ: Получаем данные из КНОПКИ (временный ключ), а не из пустого поля base64 ---
                    const shortCallbackKey = data.replace(SET_VIDEO_BASE_CALLBACK, '');
                    const KV_KEY_TEMP = `callback_${chatId}_${shortCallbackKey}`;
                    const tempVideoDataRaw = await CALLBACK_TEMP_STORAGE.get(KV_KEY_TEMP);
                    if (!tempVideoDataRaw) {
                        throw new Error("Не найдены актуальные данные видео. Срок действия истек.");
                    }
                    const tempVideoData = JSON.parse(tempVideoDataRaw);
                    
                    // 2. ЧТЕНИЕ АКТУАЛЬНОГО СОСТОЯНИЯ ИЗ ОСНОВНОГО ХРАНИЛИЩА
                    const finalVideoDataRaw = await CALLBACK_TEMP_STORAGE.get(FINAL_VIDEO_KV_KEY);
                    // Если основного хранилища еще нет — создаем объект, если есть — парсим
                    const finalVideoData = finalVideoDataRaw ? JSON.parse(finalVideoDataRaw) : {};
                    
                    // 3. ПРОВЕРКА: Для видео нам нужен fileId, а не base64
                    if (!tempVideoData.fileId) {
                        throw new Error("Отсутствует идентификатор видео (fileId) для сохранения.");
                    }
                    
                    // 4. СБРОС И СОХРАНЕНИЕ: Переносим данные из кнопки в основную базу
                    finalVideoData.file_id = tempVideoData.fileId;
                    finalVideoData.width = tempVideoData.width || finalVideoData.width;
                    finalVideoData.height = tempVideoData.height || finalVideoData.height;
                    finalVideoData.rotation = 0; // Сбрасываем поворот в ноль

                    await CALLBACK_TEMP_STORAGE.put(
                        FINAL_VIDEO_KV_KEY, 
                        JSON.stringify(finalVideoData), 
                        { expirationTtl: 86400 } // Видео храним дольше (сутки)
                    );
                    
                    // 5. Успешное завершение: Изолируем редактирование подписи
                    try {
                        await editMessageCaption(chatId, messageId, "✅ Видео успешно установлено как исходное", envData.TELEGRAM_BOT_TOKEN);
                    } catch (captionError) {
                        // Если не можем редактировать подпись (например, если сообщение слишком старое),
                        // логируем это, но не прерываем выполнение.
                        logDebug('[SET_BASE] Caption Error', `Failed to edit caption: ${captionError.message}`, envData);
                        await sendMessage(chatId, "✅ Исходное видео обновлено! (Не удалось обновить подпись сообщения)", envData.TELEGRAM_BOT_TOKEN);
                    }
                } catch (e) {
                    // Логирование и обработка ошибок
                    logDebug('[SET_BASE] CRITICAL ERROR', e.message, envData);
                    await editMessageCaption(chatId, messageId, `❌ Критическая ошибка:\n${escapeMarkdownV2(e.message.substring(0, 200))}`, envData.TELEGRAM_BOT_TOKEN);
                    return new Response('OK', { status: 200 }); 
                }
                
                // 6. Изолированная очистка временного ключа
                try {
                    const shortCallbackKey = data.replace(SET_VIDEO_BASE_CALLBACK, '');
                    const KV_KEY_TEMP = `callback_${chatId}_${shortCallbackKey}`; 
                    await CALLBACK_TEMP_STORAGE.delete(KV_KEY_TEMP);
                    logDebug('[SET_BASE] Cleanup', `Temporary key ${KV_KEY_TEMP} deleted.`, envData);
                } catch (e) {
                    logDebug('[SET_BASE] Cleanup Error', `Failed to delete temp key: ${e.message}`, envData);
                    // Мы игнорируем эту ошибку, так как она не влияет на основное сохранение.
                }
                
                return new Response('OK', { status: 200 }); // ГАРАНТИРУЕМ ВОЗВРАТ УСПЕХА
            } else if (data.startsWith(ROTATE_VIDEO_LEFT_CALLBACK) || data.startsWith(ROTATE_VIDEO_RIGHT_CALLBACK) || data.startsWith(ROTATE_VIDEO_180_CALLBACK)) {
                const chatId = callback.message.chat.id;
                const messageId = callback.message.message_id;

                let angle = '0';
                let shortCallbackKey = '';
                const token = env.TELEGRAM_BOT_TOKEN;
                const originalMessageId = callback.message.message_id;

                // 1. 🟢 ИСПРАВЛЕНИЕ: Гарантируем, что ответ на колбэк не крашнет Worker.
                try {
                    // Это должно произойти мгновенно.
                    await answerCallbackQuery(callbackId, `⏳ Запускаю поворот видео...`, env.TELEGRAM_BOT_TOKEN);
                } catch (e) {
                    // Логируем ошибку, но НЕ прерываем выполнение, чтобы не сработал fallthrough.
                    ctx.waitUntil(logDebug("ROTATE_VIDEO_CALLBACK_FAIL", `Ошибка answerCallbackQuery: ${e.message}`, envData));
                }

                if (data.startsWith(ROTATE_VIDEO_LEFT_CALLBACK)) {
                    angle = '-90';
                    shortCallbackKey = data.replace(ROTATE_VIDEO_LEFT_CALLBACK, '');
                } else if (data.startsWith(ROTATE_VIDEO_RIGHT_CALLBACK)) {
                    angle = '90';
                    shortCallbackKey = data.replace(ROTATE_VIDEO_RIGHT_CALLBACK, '');
                } else if (data.startsWith(ROTATE_VIDEO_180_CALLBACK)) {
                    angle = '180';
                    shortCallbackKey = data.replace(ROTATE_VIDEO_180_CALLBACK, '');
                }
                angle = angle.toString().trim(); // Если угол не 0, он будет '90', '-90' или '180'.
                const KV_KEY = `callback_${chatId}_${shortCallbackKey}`; 
                
                // 🛑 КРИТИЧНО: Сохраняем текущую клавиатуру
                const originalReplyMarkup = callback.message.reply_markup; 
                try {
                    // 1. 🛑 СРАЗУ ОТВЕЧАЕМ НА КОЛБЭК! (ОК)
                    await answerCallbackQuery(callback.id, `🔄 Запускаю поворот видео...`, env.TELEGRAM_BOT_TOKEN);
                    
                    // 2. Извлекаем fileId из KV
                    const stateJSON = await env.LAST_PHOTO_STORAGE.get(KV_KEY);
                    if (!stateJSON) {
                        // Редактируем подпись оригинального сообщения
                        await editMessageCaption(chatId, originalMessageId, "❌ Ошибка: Срок действия кнопки истек", env.TELEGRAM_BOT_TOKEN, originalReplyMarkup);
                        return new Response('OK', { status: 200 }); 
                    }
                    const rotationState = JSON.parse(stateJSON);
                    const fileId = rotationState.fileId; 
                    
                    // 3. 📢 ОТПРАВЛЯЕМ НОВОЕ СООБЩЕНИЕ для статуса
                    const loadingMessage = await sendMessageMarkdown(chatId, `⏳ **Начинаю преобразование...**`, env.TELEGRAM_BOT_TOKEN);
                    const loadingMessageId = loadingMessage.result.message_id;
            
                    // 🛑 ВРЕМЕННЫЙ ОТЛАДОЧНЫЙ КОД (Используйте вашу функцию логирования)
                    ctx.waitUntil(logDebug("DEBUG_ANGLE", `Angle: '${angle}', Data: '${data}'`, envData));
                    // 🛑 КОНЕЦ ОТЛАДОЧНОГО КОДА

                    // 3. 🛑 Запуск асинхронной задачи для ВИДЕО
                    ctx.waitUntil(
                        runVideoRotationInBackground( // <-- НОВАЯ ФУНКЦИЯ
                            chatId, 
                            fileId, 
                            originalMessageId, 
                            loadingMessageId, 
                            originalReplyMarkup, 
                            angle, 
                            env, 
                            env.TELEGRAM_BOT_TOKEN,
                            ctx 
                        )
                    );
                    
                } catch (e) {
                    console.error("Critical Rotate Error (Launch):", e);
                    await sendMessage(chatId, `❌ Критическая ошибка Worker'а: ${e.message.substring(0, 150)}`, token); 
                    return new Response('OK', { status: 200 });
                }
                return new Response('OK', { status: 200 }); 
                            
                // УСТАНОВКА СТАНДАРТНОГО ПРОМПТА (set_default_prompt)
            } else if (data.startsWith('set_default_prompt|')) {
                const type = data.split('|')[1]; // Получаем 'photo' или 'video'
                // Выбираем промпт на основе типа
                const newPrompt = (type === 'video') 
                    ? DEFAULT_VIDEO_PROMPT 
                    : (type === 'audio') 
                        ? DEFAULT_AUDIO_PROMPT // Используем константу
                        : DEFAULT_IMAGE_PROMPT; // Если не video и не audio, то image
                const LAST_PROMPT_KEY = chatId + LAST_PROMPT_KEY_SUFFIX;
                ctx.waitUntil(storage.put(LAST_PROMPT_KEY, newPrompt)); 

                // 2. Уведомление
                ctx.waitUntil(answerCallbackQuery(callback, `✅ Установлен стандартный промпт для ${type === 'video' ? 'видео' : (type === 'audio' ? 'аватара' : 'фото')}.`, token));
                // Определяем флаг
                const flag = '🇷🇺 RU';

                // Формируем сообщение с флагом
                const messagePrompt = `**Язык:** ${flag}\n\n**Промпт:**\n\`${newPrompt}\`\n\nЧто вы хотите сделать с этим промптом?`;

                // 4. Редактируем сообщение с новой клавиатурой
                const keyboardObject = getPromptKeyboard(newPrompt);
                await editMessageWithKeyboard(
                    chatId, messageId,
                    messagePrompt,
                    token,
                    keyboardObject.inline_keyboard // <-- ПЕРЕДАЕМ ТОЛЬКО МАССИВ КНОПОК
                );
                return new Response('OK', { status: 200 });
            } else if (data.startsWith('checkvideo')) {
                const parts = data.split('|');
                const command = parts[0]; // 'checkvideo'
                const args = parts.slice(1).join('|'); // Task ID
                // Вызываем функцию-обработчик команды /checkvideo с переданным ID
                await handleCheckVideoCommand(chatId, messageText, envData); // <--- ДОБАВЛЕН text
                return new Response('OK', { status: 200 });
            // ЛОГИКА ДЛЯ КОЛБЭКОВ МЕНЮ ГЕНЕРАЦИИ ВИДЕО 
            } else if (data.startsWith('set_video_') || data.startsWith('start_video_generation')) {
                
                // 1. Инициализация переменных
                const callbackQueryId = callback.id; 
                const chatKey = chatId.toString();
                const storage = envData.LAST_PHOTO_STORAGE; 
                const token = envData.TELEGRAM_BOT_TOKEN;
                const messageId = callback.message.message_id; // Используем messageId

                // Константы суффиксов (должны быть глобально доступны)
                const LAST_PROMPT_KEY = chatKey + LAST_PROMPT_KEY_SUFFIX;
                const VIDEO_PARAMS_KEY = chatKey + VIDEO_PARAMS_KEY_SUFFIX;
                const LAST_IMAGE_KEY = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX; 
                const LAST_VIDEO_KEY = chatKey + LAST_VIDEO_DATA_KEY_SUFFIX;
                const LAST_AUDIO_KEY = chatKey + LAST_AUDIO_DATA_KEY_SUFFIX;

                // Инициализация дефолтов
                const DEFAULT_VIDEO_PARAMS = { 
                    seconds: '6', // Храним как строку
                    aspectRatio: '16:9',
                    resolution: '480p', 
                    mode: 'T2V' // ✅ РЕЖИМ ТЕПЕРЬ ЗДЕСЬ
                };
                
                // 2. Чтение данных (ОДИН GET ДЛЯ ПАРАМЕТРОВ)
                const [lastPrompt, videoParams, rawImageKVData, rawVideoKVData, rawAudioKVData] = await Promise.all([ 
                    storage.get(LAST_PROMPT_KEY),
                    // Читаем все параметры ОДИН РАЗ, мержим с дефолтами
                    storage.get(VIDEO_PARAMS_KEY, { type: 'json' })
                        .then(res => ({...DEFAULT_VIDEO_PARAMS, ...res}))
                        .catch(() => DEFAULT_VIDEO_PARAMS),
                    storage.get(LAST_IMAGE_KEY, { type: 'text' }),
                    storage.get(LAST_VIDEO_KEY, { type: 'text' }),
                    storage.get(LAST_AUDIO_KEY, { type: 'text' })
                ]);
                
                // Деструктуризация для удобства
                const {seconds, aspectRatio, resolution, mode: currentMode } = videoParams;
                
                // 3. ПОЛНЫЙ ПАРСИНГ ФОТО ДАННЫХ
                let isPhotoSaved = false;
                let aspectType = 'portrait'; // Дефолтное значение

                if (rawImageKVData) {
                    try {
                        const imageData = JSON.parse(rawImageKVData);
                        if (imageData && imageData.base64 && imageData.base64.length > 100) { 
                            isPhotoSaved = true; 
                            aspectType = imageData.aspect_type || aspectType; 
                        }
                    } catch (e) {
                        if (rawImageKVData.length > 100) {
                            isPhotoSaved = true;
                        }
                    }
                }
                // 🛑 ОПРЕДЕЛЕНИЕ СТАТУСА ВИДЕО/АУДИО
                const isVideoSaved = !!rawVideoKVData && rawVideoKVData.length > 100;
                const isAudioSaved = !!rawAudioKVData && rawAudioKVData.length > 100;
                
                // 🛑 ЧИТАЕМ СТАТУС ЗАДАЧИ ДЛЯ МЕНЮ (Нужно, чтобы передавать в editVideoGenerationMenu)
                const { isTaskAvailable, previousTaskId } = await getTaskAvailabilityStatus(chatId, envData);

                // --- 1. ПЕРЕКЛЮЧЕНИЕ РЕЖИМА (set_video_mode) ---
                if (data.startsWith('set_video_mode|')) {
                    const newMode = data.split('|')[1];
                    let finalAspectRatio = videoParams.aspectRatio; 
                    
                    // 🛑 V2V (Нет видео) - Сохраняем и уведомляем
                    if (newMode === 'V2V' && !isVideoSaved) { 
                        videoParams.mode = newMode; // ✅ ОБНОВЛЯЕМ РЕЖИМ
                        
                        ctx.waitUntil(Promise.allSettled([
                            storage.put(VIDEO_PARAMS_KEY, JSON.stringify(videoParams)), // ✅ СОХРАНЯЕМ
                            answerCallbackQuery(callbackQueryId, "✅ Режим V2V активирован. Теперь загрузите видео!", token)
                        ]));
                        
                        await editVideoGenerationMenu(
                            chatId, messageId, lastPrompt, isPhotoSaved, isVideoSaved, isAudioSaved, token,
                            videoParams, isTaskAvailable, previousTaskId, envData // Используем newMode
                        );
                        return new Response('OK', { status: 200 });
                    }
                    
                    // 🛑 A2V (Нет аудио) - Сохраняем и уведомляем
                    if (newMode === 'A2V' && !isAudioSaved) { 
                        videoParams.mode = newMode; // ✅ ОБНОВЛЯЕМ РЕЖИМ
                        
                        ctx.waitUntil(Promise.allSettled([
                            storage.put(VIDEO_PARAMS_KEY, JSON.stringify(videoParams)), // ✅ СОХРАНЯЕМ
                            answerCallbackQuery(callbackQueryId, "✅ Режим A2V активирован. Теперь загрузите аудио!", token)
                        ]));
                        
                        await editVideoGenerationMenu(
                            chatId, messageId, lastPrompt, isPhotoSaved, isVideoSaved, isAudioSaved, token,
                            videoParams, isTaskAvailable, previousTaskId, envData // Используем newMode
                        );
                        return new Response('OK', { status: 200 });
                    }
                    // 🔥 НОВЫЙ БЛОК: A2V (Есть аудио) - Автоматически устанавливаем длительность
                        if (newMode === 'A2V' && isAudioSaved) {
                            const DURATION_KEY = chatId.toString() + '_audio_duration'; 
                            const rawDuration = await storage.get(DURATION_KEY); 
                            
                            // Убедимся, что длительность — это строка-число, и не менее 1
                            const audioLength = parseInt(rawDuration, 10) || 1; 

                            // Если текущая длительность отличается от длительности аудио
                            if (videoParams.seconds !== audioLength.toString()) {
                                videoParams.seconds = audioLength.toString(); // Обновляем длительность в памяти
                            
                                ctx.waitUntil(logDebug(
                                    "CALLBACK",
                                    `A2V mode activated. Duration auto-set to ${audioLength}s.`,
                                    envData
                                ));
                            }
                        }
                    // I2V (Есть фото) - Автоматически меняем аспект, если нужно
                    if (newMode === 'I2V' && isPhotoSaved) {
                        const photoAspectRatio = mapAspectTypeToRatio(aspectType);
                        
                        if (videoParams.aspectRatio !== photoAspectRatio) {
                            finalAspectRatio = photoAspectRatio;
                            videoParams.aspectRatio = finalAspectRatio; // Обновляем аспект в памяти
                            
                            ctx.waitUntil(logDebug(
                                "CALLBACK",
                                `I2V mode activated. Aspect Ratio auto-set to ${finalAspectRatio}.`,
                                envData
                            ));
                        }
                    }
                    
                    // 🟢 УСПЕШНОЕ ПЕРЕКЛЮЧЕНИЕ (T2V, I2V с фото, V2V/A2V с контентом): Сохраняем и перерисовываем
                    
                    videoParams.mode = newMode; // ✅ ФИНАЛЬНОЕ ОБНОВЛЕНИЕ РЕЖИМА
                    
                    ctx.waitUntil(Promise.allSettled([
                        // ✅ Только одна операция PUT
                        storage.put(VIDEO_PARAMS_KEY, JSON.stringify(videoParams)), 
                        
                        answerCallbackQuery(callbackQueryId, "Режим изменен!", token),
                        
                        // Обновляем меню (используем новые значения из videoParams)
                        editVideoGenerationMenu(
                            chatId, 
                            messageId, 
                            lastPrompt, 
                            isPhotoSaved, 
                            isVideoSaved, 
                            isAudioSaved,
                            token, 
                            videoParams, // Используем обновленный параметр
                            isTaskAvailable, 
                            previousTaskId,
                            envData
                        ) 
                    ]));
                    
                    return new Response('OK', { status: 200 });
                }

                // --- 2. УСТАНОВКА ДЛИТЕЛЬНОСТИ (set_video_sec) ---
                if (data.startsWith('set_video_sec|')) {
                    const newSeconds = data.split('|')[1]; // ✅ ИСПОЛЬЗУЕМ СТРОКУ, НЕ parseInt
                    videoParams.seconds = newSeconds;
                    
                    ctx.waitUntil(Promise.allSettled([
                        storage.put(VIDEO_PARAMS_KEY, JSON.stringify(videoParams)),
                        answerCallbackQuery(callbackQueryId, `Длительность: ${newSeconds} сек.`, token),
                        editVideoGenerationMenu(
                            chatId, messageId, lastPrompt, isPhotoSaved, isVideoSaved, isAudioSaved, token, 
                            videoParams, isTaskAvailable, previousTaskId, envData
                        ) 
                    ]));
                    
                    return new Response('OK', { status: 200 });
                }
                // --- 3. УСТАНОВКА СООТНОШЕНИЯ СТОРОН (set_video_ratio) ---
                if (data.startsWith('set_video_ratio|')) {
                    const newRatio = data.split('|')[1];
                    videoParams.aspectRatio = newRatio;
                    
                    ctx.waitUntil(Promise.allSettled([
                        storage.put(VIDEO_PARAMS_KEY, JSON.stringify(videoParams)),
                        answerCallbackQuery(callbackQueryId, `Соотношение сторон: ${newRatio}`, token),
                        editVideoGenerationMenu(
                            chatId, messageId, lastPrompt, isPhotoSaved, isVideoSaved, isAudioSaved, token, 
                            videoParams, isTaskAvailable, previousTaskId, envData
                        ) 
                    ]));

                    return new Response('OK', { status: 200 });
                }
                // --- 4. УСТАНОВКА Разрешения (set_video_resolution) ---
                if (data.startsWith('set_video_resolution|')) {
                    const newResolution = data.split('|')[1];
                    videoParams.resolution = newResolution;
                    
                    ctx.waitUntil(Promise.allSettled([
                        storage.put(VIDEO_PARAMS_KEY, JSON.stringify(videoParams)),
                        answerCallbackQuery(callbackQueryId, `Разрешение: ${newResolution}`, token),
                        editVideoGenerationMenu(
                            chatId, messageId, lastPrompt, isPhotoSaved, isVideoSaved, isAudioSaved, token, 
                            videoParams, isTaskAvailable, previousTaskId, envData
                        ) 
                    ]));
                    
                    return new Response('OK', { status: 200 });
                }
                // --- 5. ЗАПУСК ГЕНЕРАЦИИ (start_video_generation) ---
                // ИЗМЕНЕНИЕ 1: ИСПОЛЬЗУЕМ start_video_generation|MODE
                if (data.startsWith('start_video_generation|')) {
                    // 🔑 ИЗВЛЕЧЕНИЕ РЕЖИМА ИЗ КОЛБЭКА
                    const parts = data.split('|');
                    const requestedMode = parts[1]; // I2V, T2V, A2V, V2V или undefined, если нет
                    
                    // Используем запрошенный режим, если он есть, иначе берем из памяти (если кнопка не передала)
                    const finalMode = requestedMode || currentMode; // currentMode прочитан из KV в начале функции
                    
                    // Если кнопка явно передала режим, сохраняем его в параметрах
                    if (requestedMode && finalMode !== videoParams.mode) {
                        videoParams.mode = finalMode;
                        // Сохранение будет ниже, если все проверки пройдут
                    }

                    // 1. ОПРЕДЕЛЯЕМ ФИНАЛЬНЫЙ ПРОМПТ НА ОСНОВЕ РЕЖИМА
                    const promptWasEmpty = !lastPrompt;
                    let finalPrompt = '';

                    // 🔑 ИЗМЕНЕНИЕ 2: ИСПОЛЬЗУЕМ finalMode ВМЕСТО currentMode
                    if (finalMode === 'A2V') {
                        finalPrompt = lastPrompt || DEFAULT_AUDIO_PROMPT; 
                    } else if (finalMode === 'I2V') {
                        finalPrompt = lastPrompt || DEFAULT_VIDEO_PROMPT; 
                    } else if (finalMode === 'T2V') {
                        finalPrompt = lastPrompt || DEFAULT_VIDEO_PROMPT; 
                    } else {
                        finalPrompt = lastPrompt || ''; 
                    }

                    // 2. ПРОВЕРКИ ПЕРЕД ЗАПУСКОМ (на основе finalMode)
                    
                    // Проверка: I2V требует фото
                    if (finalMode === 'I2V' && !isPhotoSaved) { // <-- Используем finalMode
                        ctx.waitUntil(editMessage(chatId, messageId, "❌ **Ошибка:** Для Image-to-Video требуется загруженное фото.", token));
                        ctx.waitUntil(answerCallbackQuery(callbackQueryId, "❌ Загрузите фото", token));
                        return new Response('OK', { status: 200 });
                    }
                    
                    // Проверка: A2V требует фото И аудио
                    if (finalMode === 'A2V' && (!isPhotoSaved || !isAudioSaved)) { // <-- Используем finalMode
                        ctx.waitUntil(editMessage(chatId, messageId, "❌ **Ошибка:** Для Audio-to-Video (Аватар) требуется и фото, и аудио.", token));
                        ctx.waitUntil(answerCallbackQuery(callbackQueryId, "❌ Загрузите фото и аудио", token));
                        return new Response('OK', { status: 200 });
                    }
                    
                    // Проверка: V2V требует видео
                    if (finalMode === 'V2V' && !isVideoSaved) { // <-- Используем finalMode
                        ctx.waitUntil(editMessage(chatId, messageId, "❌ **Ошибка:** Для Video-to-Video требуется загруженное видео (загрузите его пожалуйста).", token));
                        ctx.waitUntil(answerCallbackQuery(callbackQueryId, "❌ Требуется Ваш видеоролик", token));
                        return new Response('OK', { status: 200 });
                    }

                    // 3. СОХРАНЕНИЕ ПРОМПТА ПО УМОЛЧАНИЮ (и нового режима, если он был задан)
                    const putPromises = [];
                    if (promptWasEmpty && finalPrompt) {
                        putPromises.push(storage.put(LAST_PROMPT_KEY, finalPrompt)); 
                    }
                    // Сохраняем параметры, если режим был изменен кнопкой
                    if (requestedMode) {
                        putPromises.push(storage.put(VIDEO_PARAMS_KEY, JSON.stringify(videoParams)));
                    }
                    ctx.waitUntil(Promise.allSettled(putPromises));

                    // 4. ОТВЕТ НА КОЛБЭК И ЗАПУСК
                    ctx.waitUntil(answerCallbackQuery(callbackQueryId, "Запускаю генерацию видео...", token));
                    
                    // --- ЗАПУСК ГЕНЕРАЦИИ В ФОНЕ ---
                    ctx.waitUntil(Promise.allSettled([
                        editMessage(chatId, messageId, `⏳ **Запускаю генерацию видео...**\n\nПромпт: \`${finalPrompt.substring(0, 100)}...\``, token).catch(e => {
                            console.error("Не удалось отредактировать сообщение для start_video_generation:", e);
                        }),
                        
                        // ✅ Передаем finalPrompt и уже загруженные параметры
                        startVideoGenerationLogic(chatId, finalPrompt, messageId, envData, videoParams) 
                    ]));
                    
                    return new Response('OK', { status: 200 });
                }
                // ЛОГИКА ДЛЯ КОЛБЭКОВ МЕНЮ АПСКЕЙЛА (I2U / V2U)
                } else if (data.startsWith('select_upscale_mode|') || data.startsWith('generate_upscale_now|')) {
                    
                    // 1. Инициализация переменных (используем Вашу нотацию)
                    const callbackQueryId = callback.id; 
                    const chatKey = chatId.toString(); // chatId должен быть определен ранее в области видимости
                    const storage = envData.LAST_PHOTO_STORAGE; 
                    const token = envData.TELEGRAM_BOT_TOKEN;
                    const messageId = callback.message.message_id;

                    // Константы суффиксов
                    const LAST_IMAGE_KEY = chatKey + LAST_IMAGE_DATA_KEY_SUFFIX; 
                    const LAST_VIDEO_TASK_KEY = chatKey + LAST_ACTIVE_VIDEO_KEY_SUFFIX; // <-- НОВЫЙ СУФФИКС для Task ID

                    // 2. Чтение данных
                    const [lastPrompt, rawImageKVData, rawTaskData] = await Promise.all([ // <-- ДОБАВЛЕНО rawTaskData
                        storage.get(LAST_PROMPT_KEY),
                        storage.get(LAST_IMAGE_KEY, { type: 'text' }), 
                        storage.get(LAST_VIDEO_TASK_KEY), // <-- Чтение данных Task ID (taskDataRaw из handleCheckVideoCommand)
                    ]);

                    // Определяем статус медиа (фото или видео)
                    const isMediaSaved = !!rawImageKVData && rawImageKVData.length > 100;

                    // Определяем статус Task ID
                    const isTaskValid = !!rawTaskData; // Есть ли Task ID для V2U
                                        
                    // --- 2. ПЕРЕКЛЮЧЕНИЕ РЕЖИМА (select_upscale_mode|...) ---
                    if (data.startsWith('select_upscale_mode|')) {
                        const selectedMode = data.split('|')[1]; // 'IMAGE_TO_UPSCALE' или 'VIDEO_TO_UPSCALE'
                        let menu;
                        
                        if (selectedMode === 'IMAGE_TO_UPSCALE') {
                            menu = await getUpscaleImageMenuKeyboard(chatId, storage, lastPrompt, isMediaSaved);
                        } else if (selectedMode === 'VIDEO_TO_UPSCALE') {
                            menu = await getUpscaleVideoMenuKeyboard(chatId, storage, lastPrompt, isMediaSaved);
                        }
                                                
                        ctx.waitUntil(Promise.allSettled([
                            editMessageWithKeyboard(
                                chatId, 
                                messageId, 
                                menu.messageText, 
                                token, 
                                menu.keyboardObject
                            ),
                            answerCallbackQuery(callbackQueryId, `Переключено на ${selectedMode === 'VIDEO_TO_UPSCALE' ? 'Видео' : 'Фото'} апскейл.`, token)
                        ]));
                        
                        return new Response('OK', { status: 200 });
                    }                    
                    // --- 3. ЗАПУСК ГЕНЕРАЦИИ (generate_upscale_now|...) ---
                    if (data.startsWith('generate_upscale_now|')) {
                        const parts = data.split('|');
                        const finalMode = parts[1]; // IMAGE_TO_UPSCALE или VIDEO_TO_UPSCALE
                        
                        let canRun = false;
                        let requiredText = '';
                    
                        if (finalMode === 'IMAGE_TO_UPSCALE') {
                            // Условие для I2U: нужно сохраненное фото
                            canRun = isMediaSaved; 
                            requiredText = "фотографию";
                        } else if (finalMode === 'VIDEO_TO_UPSCALE') {
                            // Условие для V2U: нужен сохраненный Task ID
                            canRun = isTaskValid; // Используем новый флаг isTaskValid
                            requiredText = "Task ID предыдущего задания (/checkvideo)";
                        } else {
                            // Неизвестный режим
                            ctx.waitUntil(answerCallbackQuery(callbackQueryId, "Ошибка: Неизвестный режим апскейла", token));
                            return new Response('OK', { status: 200 });
                        }
                    
                        if (!canRun) {
                            // Единое сообщение об ошибке для обоих режимов
                            ctx.waitUntil(answerCallbackQuery(callbackQueryId, `❌ Невозможно запустить. Сначала получите ${requiredText}.`, token));
                            return new Response('OK', { status: 200 });
                        }
                        
                        // Логика запуска, которая использует:
                        // - finalMode (для выбора I2U или V2U)
                        // - Task ID (если finalMode == V2U, то taskDataRaw доступен через rawTaskData)
                        ctx.waitUntil(processUpscaleGenerateCommand(finalMode, chatId, envData, storage, rawTaskData)); // <-- Передаем rawTaskData
                        
                        ctx.waitUntil(Promise.allSettled([
                            answerCallbackQuery(callbackQueryId, "Запускаю апскейл...", token),
                            editMessage(chatId, messageId, `⏳ Запускаю Апскейл Режим: ${finalMode}`, token)
                        ]));
                        
                        return new Response('OK', { status: 200 });
                    } // --- КОНЕЦ НОВОГО БЛОКА АПСКЕЙЛА ---

            // ЛОГИКА КОЛБЭКОВ ДЛЯ РЕСАЙЗА
            } else if (data.startsWith('select_resize_mode|') || data.startsWith('generate_resize_now|') || data.startsWith('generate_rotate_now|')) {
                const callbackQueryId = callback.id; 
                const chatKey = chatId.toString();
                const storage = envData.LAST_PHOTO_STORAGE; 
                const token = envData.TELEGRAM_BOT_TOKEN;
                const messageId = callback.message.message_id;

                // 1. Получаем статусы медиа
                const [rawImage, rawVideo] = await Promise.all([
                    envData.LAST_PHOTO_STORAGE.get(chatKey + LAST_IMAGE_DATA_KEY_SUFFIX),
                    envData.LAST_PHOTO_STORAGE.get(chatKey + LAST_VIDEO_DATA_KEY_SUFFIX),
                ]);
                const isPhotoSaved = !!rawImage;
                const isVideoSaved = !!rawVideo;
                
                // --- 2. ПЕРЕКЛЮЧЕНИЕ РЕЖИМА (select_resize_mode|...) ---
                if (data.startsWith('select_resize_mode|')) {
                    
                    const selectedMode = data.split('|')[1]; // IMAGE_TO_RESIZE или VIDEO_TO_RESIZE
                    let newMenu;

                    // 🛑 ИСПРАВЛЕНО: Использование 'selectedMode' и передача 'storage'
                    if (selectedMode === RESIZE_IMAGE_MODE) {
                        newMenu = await getResizeImageMenuKeyboard(chatId, envData, null, isPhotoSaved, isVideoSaved, storage);
                    } else if (selectedMode === RESIZE_VIDEO_MODE) {
                        newMenu = await getResizeVideoMenuKeyboard(chatId, envData, null, isPhotoSaved, isVideoSaved, storage);
                    } else {
                        // Добавьте обработку неожиданного режима
                        ctx.waitUntil(answerCallbackQuery(callbackQueryId, 'Неизвестный режим изменения размера.', token));
                        return new Response('OK', { status: 200 });
                    }
                    
                    // 🛑 ИСПРАВЛЕНО: Использование 'newMenu' вместо 'menu'
                    ctx.waitUntil(Promise.allSettled([
                        editMessageWithKeyboard(
                            chatId, 
                            messageId, 
                            newMenu.messageText, // ИСПРАВЛЕНО
                            token, 
                            newMenu.keyboardObject // ИСПРАВЛЕНО
                        ),
                        answerCallbackQuery(callbackQueryId, `Переключено на ${selectedMode === RESIZE_VIDEO_MODE ? 'Видео' : 'Фото'} изменение размера.`, token)
                    ]));
                    
                    return new Response('OK', { status: 200 });
                }
                
                // --- 3. ЗАПУСК ГЕНЕРАЦИИ (generate_resize_now|...) ---
                if (data.startsWith('generate_resize_now|')) {
                    const chatKey = chatId.toString();
                    const parts = data.split('|');
                    const finalMode = parts[1];      // IMAGE_TO_RESIZE или VIDEO_TO_RESIZE
                    const actionParam = parts[2];    // Разрешение

                    let fileId; // Переменная для ID файла

                    if (finalMode === 'VIDEO_TO_RESIZE') {
                        const rawVideo = await envData.LAST_PHOTO_STORAGE.get(chatId + '_last_video_data');
                        if (!rawVideo) {
                            ctx.waitUntil(answerCallbackQuery(callbackQueryId, `❌ Данные видео не найдены`, token));
                            return new Response('OK', { status: 200 });
                        }
                        // Для видео file_id лежит внутри JSON (как и было)
                        const mediaData = JSON.parse(rawVideo);
                        fileId = mediaData.file_id;
                    } else if (finalMode === 'IMAGE_TO_RESIZE') {
                        // берем file_id напрямую из его собственного ключа
                        fileId = await envData.LAST_PHOTO_STORAGE.get(chatKey + LAST_FILE_ID_KEY_SUFFIX);
                    }

                    // ✅ ГЛАВНАЯ ПРОВЕРКА: Если ключа нет или он протух
                    if (!fileId) {
                        const mediaName = finalMode === 'VIDEO_TO_RESIZE' ? 'видео' : 'фото';
                        
                        // 1. Убираем "часики" с кнопки
                        await answerCallbackQuery(callbackQueryId, `❌ Данные ${mediaName} устарели.`, token);
                        
                        // 2. Информируем в чате
                        await editMessage(chatId, originalMessageId, 
                            `⚠️ **Ошибка: файл не найден.**\n\nСкорее всего, прошло более часа с момента загрузки. Пожалуйста, отправьте ${mediaName} боту еще раз.`, 
                            token
                        );
                        return new Response('OK', { status: 200 }); // Завершаем выполнение
                    }
                    
                    // Остальные переменные
                    const originalReplyMarkup = callback.message.reply_markup; // Сохраняем клавиатуру
                    const originalMessageId = callback.message.message_id; 
                    
                    // Запуск асинхронной обработки в фоне
                    ctx.waitUntil(sendMediaToConverterInBackground(
                        chatId, 
                        fileId, 
                        originalMessageId, 
                        finalMode, 
                        actionParam, 
                        envData, 
                        token, 
                        ctx,
                        originalReplyMarkup
                    ));

                    ctx.waitUntil(Promise.allSettled([
                        answerCallbackQuery(callbackQueryId, `Запускаю изменение размера`, token),
                        editMessage(chatId, originalMessageId, `⏳ Запускаю Изменение размера, Параметр: ${actionParam}`, token)
                    ]));
                    
                    return new Response('OK', { status: 200 });
                } // --- КОНЕЦ НОВОГО БЛОКА RESIZE ---
                // --- ЗАПУСК ПОВОРОТА (generate_rotate_now|...) ---
                if (data.startsWith('generate_rotate_now|')) {
                    const chatKey = chatId.toString();
                    const parts = data.split('|');
                    const finalMode = parts[1];      // IMAGE_TO_ROTATE или VIDEO_TO_ROTATE
                    const actionParam = parts[2];    // Разрешение

                    let fileId; // Переменная для ID файла

                    if (finalMode === 'VIDEO_TO_ROTATE') {
                        const rawVideo = await envData.LAST_PHOTO_STORAGE.get(chatId + '_last_video_data');
                        if (!rawVideo) {
                            ctx.waitUntil(answerCallbackQuery(callbackQueryId, `❌ Данные видео не найдены`, token));
                            return new Response('OK', { status: 200 });
                        }
                        // Для видео file_id лежит внутри JSON (как и было)
                        const mediaData = JSON.parse(rawVideo);
                        fileId = mediaData.file_id;
                    } else if (finalMode === 'IMAGE_TO_ROTATE') {
                        // берем file_id напрямую из его собственного ключа
                        fileId = await envData.LAST_PHOTO_STORAGE.get(chatKey + LAST_FILE_ID_KEY_SUFFIX);
                    }

                    // ✅ ГЛАВНАЯ ПРОВЕРКА: Если ключа нет или он протух
                    if (!fileId) {
                        const mediaName = finalMode === 'VIDEO_TO_ROTATE' ? 'видео' : 'фото';
                        
                        // 1. Убираем "часики" с кнопки
                        await answerCallbackQuery(callbackQueryId, `❌ Данные ${mediaName} устарели.`, token);
                        
                        // 2. Информируем в чате
                        await editMessage(chatId, originalMessageId, 
                            `⚠️ **Ошибка: файл не найден.**\n\nСкорее всего, прошло более часа с момента загрузки. Пожалуйста, отправьте ${mediaName} боту еще раз.`, 
                            token
                        );
                        return new Response('OK', { status: 200 }); // Завершаем выполнение
                    }
                    
                    // Остальные переменные
                    const originalReplyMarkup = callback.message.reply_markup; // Сохраняем клавиатуру
                    const originalMessageId = callback.message.message_id; 
                    
                    // Запуск асинхронной обработки в фоне
                    ctx.waitUntil(sendMediaToConverterInBackground(
                        chatId, 
                        fileId, 
                        originalMessageId, 
                        finalMode, 
                        actionParam, 
                        envData, 
                        token, 
                        ctx,
                        originalReplyMarkup
                    ));

                    ctx.waitUntil(Promise.allSettled([
                        answerCallbackQuery(callbackQueryId, `Запускаю поворот изображения`, token),
                        editMessage(chatId, originalMessageId, `⏳ Запускаю Поворот изображения, Параметр: ${actionParam}`, token)
                    ]));
                    
                    return new Response('OK', { status: 200 });
                } // --- КОНЕЦ НОВОГО БЛОКА ROTATE ---
                // --- 2. ПЕРЕКЛЮЧЕНИЕ РЕЖИМА (select_upscale_mode|...) ---
                if (data.startsWith('select_upscale_mode|')) {
                    const selectedMode = data.split('|')[1]; // 'IMAGE_TO_UPSCALE' или 'VIDEO_TO_UPSCALE'
                    let menu;
                    
                    if (selectedMode === 'IMAGE_TO_UPSCALE') {
                        menu = await getUpscaleImageMenuKeyboard(chatId, storage, lastPrompt, isMediaSaved);
                    } else if (selectedMode === 'VIDEO_TO_UPSCALE') {
                        menu = await getUpscaleVideoMenuKeyboard(chatId, storage, lastPrompt, isMediaSaved);
                    }
                                            
                    ctx.waitUntil(Promise.allSettled([
                        editMessageWithKeyboard(
                            chatId, 
                            messageId, 
                            menu.messageText, 
                            token, 
                            menu.keyboardObject
                        ),
                        answerCallbackQuery(callbackQueryId, `Переключено на ${selectedMode === 'VIDEO_TO_UPSCALE' ? 'Видео' : 'Фото'} апскейл.`, token)
                    ]));
                    
                    return new Response('OK', { status: 200 });
                }                    
                // --- 3. ЗАПУСК ГЕНЕРАЦИИ (generate_upscale_now|...) ---
                if (data.startsWith('generate_upscale_now|')) {
                    const parts = data.split('|');
                    const finalMode = parts[1]; // IMAGE_TO_UPSCALE или VIDEO_TO_UPSCALE
                    
                    let canRun = false;
                    let requiredText = '';
                
                    if (finalMode === 'IMAGE_TO_UPSCALE') {
                        // Условие для I2U: нужно сохраненное фото
                        canRun = isMediaSaved; 
                        requiredText = "фотографию";
                    } else if (finalMode === 'VIDEO_TO_UPSCALE') {
                        // Условие для V2U: нужен сохраненный Task ID
                        canRun = isTaskValid; // Используем новый флаг isTaskValid
                        requiredText = "Task ID предыдущего задания (/checkvideo)";
                    } else {
                        // Неизвестный режим
                        ctx.waitUntil(answerCallbackQuery(callbackQueryId, "Ошибка: Неизвестный режим апскейла", token));
                        return new Response('OK', { status: 200 });
                    }
                
                    if (!canRun) {
                        // Единое сообщение об ошибке для обоих режимов
                        ctx.waitUntil(answerCallbackQuery(callbackQueryId, `❌ Невозможно запустить. Сначала получите ${requiredText}.`, token));
                        return new Response('OK', { status: 200 });
                    }
                    
                    // 🔑 ВНИМАНИЕ: Сюда нужно вставить Ваш вызов логики запуска апскейла
                    // Логика запуска, которая использует:
                    // - finalMode (для выбора I2U или V2U)
                    // - Task ID (если finalMode == V2U, то taskDataRaw доступен через rawTaskData)
                    ctx.waitUntil(processUpscaleGenerateCommand(finalMode, chatId, envData, storage, rawTaskData)); // <-- Передаем rawTaskData
                    
                    ctx.waitUntil(Promise.allSettled([
                        answerCallbackQuery(callbackQueryId, "Запускаю апскейл...", token),
                        editMessage(chatId, messageId, `⏳ **Запускаю Апскейл...** (Режим: ${finalMode})`, token)
                    ]));
                    
                    return new Response('OK', { status: 200 });
                }// --- КОНЕЦ НОВОГО БЛОКА АПСКЕЙЛА ---
                
            // Колбэк gif_to_video - Конвертация GIF в Видео
            } else if (data === 'gif_to_video') {
                // Исправлено: используем callback.id вместо callbackQuery.id
                const callbackQueryId = callback.id; 
                const token = envData.TELEGRAM_BOT_TOKEN;
                const GIF_DATA_KEY = `${chatId}_last_gif_data`;
                const rawData = await envData.LAST_PHOTO_STORAGE.get(GIF_DATA_KEY);

                if (!rawData) {
                    await answerCallbackQuery(callbackQueryId, "❌ Данные устарели. Пришлите файл снова.", token);
                    return new Response('OK', { status: 200 });
                }

                const gifData = JSON.parse(rawData);
                const originalMessageId = callback.message.message_id;

                await answerCallbackQuery(callbackQueryId, "🎬 Начинаю конвертацию...", token);
                await editMessage(chatId, originalMessageId, "⏳ **Магия FFmpeg:** превращаю анимацию в видео...", token);

                ctx.waitUntil(sendGifToConverterInBackground(
                    chatId,
                    gifData.file_id,
                    originalMessageId,
                    envData,
                    token
                ));
                return new Response('OK', { status: 200 });

            // Колбэк video_to_gif - Конвертация Видео в GIF
            } else if (data.startsWith('video_to_gif:')) {
                const format = data.split(':')[1]; // gif или mp4
                const callbackQueryId = callback.id;
                const VIDEO_DATA_KEY = `${chatId}_last_video_data`; // Используем твой ключ для видео
                const rawData = await envData.LAST_PHOTO_STORAGE.get(VIDEO_DATA_KEY);

                if (!rawData) {
                    await answerCallbackQuery(callbackQueryId, "❌ Видео не найдено. Пришлите его снова.", token);
                    return new Response('OK', { status: 200 });
                }

                const videoData = JSON.parse(rawData);
                const originalMessageId = callback.message.message_id;

                await answerCallbackQuery(callbackQueryId, `Создаю ${format}...`, token);
                await editMessage(chatId, originalMessageId, `⏳ Нарезаю первые 5 секунд видео в ${format.toUpperCase()}...`, token);
                await editMessage(chatId, originalMessageId, "⏳ **Магия FFmpeg:** превращаю видео в гифку...", token);
                ctx.waitUntil(sendVideoToGifInBackground(
                    chatId,
                    videoData,
                    originalMessageId,
                    format,
                    envData,
                    token
                ));

                return new Response('OK', { status: 200 });

            } else if (data === 'delete_message') {
                // Исправлено: используем callback.id здесь тоже
                const callbackQueryId = callback.id; 
                const token = envData.TELEGRAM_BOT_TOKEN;
                
                await deleteMessage(chatId, callback.message.message_id, token);
                await answerCallbackQuery(callbackQueryId, "Меню закрыто", token);
                return new Response('OK', { status: 200 });
            
            // ОБРАБОТКА КОЛБЭКОВ МЕНЮ ГОЛОСА
            } else if (data.startsWith('say_') || data === 'ignore_empty_text') {
                // 1. Инициализация переменных
                const chatKey = chatId.toString();
                const storage = envData.LAST_PHOTO_STORAGE; 
                const token = envData.TELEGRAM_BOT_TOKEN;
                const callbackId = callback.id;
                const messageId = callback.message.message_id; // Используем messageId
                
                // --- ДАННЫЕ ДЛЯ ОБРАБОТКИ ---
                const SAY_VOICE_KEY = chatKey + SAY_VOICE_KEY_SUFFIX; 
                const SAY_TEXT_KEY = chatKey + SAY_TEXT_KEY_SUFFIX; 
                const LAST_ACTION_KEY = chatKey + envData.LAST_ACTION_KEY_SUFFIX;
                
                // 🛑 НОВЫЕ КЛЮЧИ ЗДЕСЬ
                const SAY_AWAITING_VOICE_KEY = chatKey + SAY_AWAITING_VOICE_KEY_SUFFIX; 
                const SAY_MESSAGE_ID_KEY = chatKey + SAY_MESSAGE_ID_KEY_SUFFIX; // Тоже нужен для обновления меню
                // Читаем текущее состояние
                let currentVoice = await storage.get(SAY_VOICE_KEY) || DEFAULT_VOICE;
                let currentText = await storage.get(SAY_TEXT_KEY) || null;
                
                if (data === 'say_input') {
                    // 1. АКТИВАЦИЯ РЕЖИМА ОЖИДАНИЯ ВВОДА ТЕКСТА
                    ctx.waitUntil(storage.put(LAST_ACTION_KEY, 'awaiting_say_text', { expirationTtl: 300 }));
                    ctx.waitUntil(answerCallbackQuery(callback.id, "💬 Жду текст для озвучки...", token));
                    
                    await sendSayControlMenu(chatId, token, currentVoice, currentText, messageId, true);
                    return new Response('OK', { status: 200 });
                    
                } else if (data.startsWith('say_set_voice|')) {
                    // 2. СМЕНА ГОЛОСА (включая VOICE_USER)
                    const newVoice = data.split('|')[1];
                    
                    if (newVoice !== currentVoice) {
                        // Установка нового голоса
                        await storage.put(SAY_VOICE_KEY, newVoice); 
                        currentVoice = newVoice; 
                        
                        // Очищаем текст, если перешли в режим СВОЙ ГОЛОС, т.к. текст больше не нужен
                        if (newVoice === VOICE_USER) {
                                await storage.delete(SAY_TEXT_KEY);
                                currentText = null;
                        }
                        
                        ctx.waitUntil(answerCallbackQuery(callback.id, `✅ Выбран голос: ${newVoice}`, token));
                        await sendSayControlMenu(chatId, token, currentVoice, currentText, messageId);
                    } else {
                        ctx.waitUntil(answerCallbackQuery(callback.id, `Голос "${newVoice}" уже выбран!`, token));
                    }
                    
                    return new Response('OK', { status: 200 }); 
                    
                // 🛑 НОВЫЙ БЛОК: ИНИЦИАЦИЯ ЗАПИСИ ГОЛОСА
                } else if (data === 'say_input_voice') {
                    // 1. Устанавливаем флаг ожидания ГОЛОСОВОГО сообщения (с TTL 300 секунд)
                    // 1. АКТИВАЦИЯ РЕЖИМА ОЖИДАНИЯ ВВОДА ТЕКСТА
                    ctx.waitUntil(storage.put(LAST_ACTION_KEY, 'awaiting_say_text', { expirationTtl: 300 }));
                    
                    // 2. Сохраняем ID сообщения меню, чтобы знать, какое редактировать позже
                    await storage.put(SAY_MESSAGE_ID_KEY, messageId.toString());
                    
                    const promptMessage = "🎤 **Ожидаю голосовое сообщение.** Пожалуйста, **в ответ на это сообщение** запишите и отправьте ваш голос.\n\nЯ выполню OGG→MP3 конвертацию.";
                    
                    const replyMarkup = JSON.stringify({
                        force_reply: true,
                        selective: true 
                    });

                    // 3. Отправляем сообщение с force_reply (в фоне)
                    ctx.waitUntil(sendMessage(chatId, promptMessage, token, replyMarkup, 'Markdown'));
                    
                    // 4. Обновляем меню, чтобы показать статус "Ожидаю ввода"
                    // Устанавливаем isAwaitingInput = true
                    await sendSayControlMenu(chatId, token, currentVoice, currentText, messageId, true);

                    ctx.waitUntil(answerCallbackQuery(callback.id, "🎤 Готов к записи голоса!", token));
                    return new Response('OK', { status: 200 });

                } else if (data === 'say_run') {
                    // ЗАПУСК ОЗВУЧКИ
                    const token = envData.TELEGRAM_BOT_TOKEN;

                    // 1. Извлечение стейта
                    const savedVoice = await storage.get(chatKey + SAY_VOICE_KEY_SUFFIX) || DEFAULT_VOICE;
                    const textToSpeak = await storage.get(chatKey + SAY_TEXT_KEY_SUFFIX) || '';

                    // Валидация текста
                    if (!textToSpeak || textToSpeak.includes("Ошибка STT")) {
                        await answerCallbackQuery(callbackId, '⚠️ Сначала введите текст/голос!', token);
                        return new Response('OK', { status: 200 });
                    }

                    // 2. Инициализация сообщения "Загрузка..."
                    await answerCallbackQuery(callbackId, '⏳ Запуск процесса озвучки...', token);
                    const loadingMessage = await sendMessageMarkdown(chatId, "🔊 **Генерация аудио...**", token);
                    const loadingMessageId = loadingMessage.result.message_id;

                    try {
                        // --- ВЕТВЛЕНИЕ: TTS (М/Ж) vs VTA (Свой голос) ---
                        // 🛑 Логируем начало процесса
                        envData.ctx.waitUntil(logDebug("SAY_RUN_START", `Голос: ${savedVoice}, Текст: ${textToSpeak.substring(0, 50)}`, envData));
                        if (savedVoice === VOICE_MALE || savedVoice === VOICE_FEMALE) {
                            // =======================================================
                            // РЕЖИМ 1: TTS (TEXT-TO-SPEECH)
                            // =======================================================
                            
                            envData.ctx.waitUntil(logDebug("SAY_RUN_TTS", `Запуск TTS для голоса: ${savedVoice}`, envData));
                            await editMessage(chatId, loadingMessageId, `🔊 **Запускаю TTS...**`, token);
                            
                            // 2.1. Загрузка конфигурации TTS
                            const t2aResult = await loadActiveConfig('TEXT_TO_AUDIO', envData, chatId); 
                            const t2aConfig = t2aResult.config; 
                            
                            // 2.2. Запуск TTS
                            const ttsResponse = await t2aConfig.FUNCTION(t2aConfig, textToSpeak, envData, savedVoice, chatId);
                
                            // 2.3. Отправка результата
                            if (ttsResponse && ttsResponse.audioBase64) {
                                const audioBase64 = ttsResponse.audioBase64;
                                const mimeType = ttsResponse.mimeType || 'audio/mpeg'; 
                                await sendAudioMessage(chatId, audioBase64, mimeType, token, envData);
                                
                                // 2.4. Финальное сообщение для синхронных моделей
                                await editMessage(chatId, loadingMessageId, `✅ **Генерация голоса завершена!**`, token);
                            } else if (ttsResponse && ttsResponse.taskId) {
                                // Для Kie.ai мы ничего не шлем, она сама пришлет аудио в колбэк.
                                // Сообщение о запуске уже отправила сама функция startKieAiTextToAudio.
                                await deleteMessage(chatId, loadingMessageId, token); // Удаляем "Запускаю TTS...", чтобы не висело
                            }
                            
                            return new Response('OK', { status: 200 });
                
                        } else if (savedVoice === VOICE_USER) { 
                            // =======================================================
                            // РЕЖИМ 2: VTA (OGG -> MP3) - Конвертация "Свой голос"
                            // =======================================================
                            
                            const sourceVoiceFileId = await storage.get(chatKey + SAY_VOICE_SOURCE_ID_SUFFIX); 
                            // 🛑 Логируем попытку извлечения ID
                            envData.ctx.waitUntil(logDebug("SAY_RUN_VTA_INIT", `Поиск исходного ID OGG`, envData));
                            
                            if (!sourceVoiceFileId) {
                                envData.ctx.waitUntil(logDebug("SAY_RUN_VTA_FAIL", "File ID OGG не найден.", envData));
                                // Если нет ID исходного OGG, значит, голосовое сообщение не было отправлено в этом режиме.
                                await answerCallbackQuery(callbackId, '⚠️ Сначала отправьте голосовое сообщение для конвертации!', token);
                                await editMessage(chatId, loadingMessageId, `⚠️ **Ошибка:** Сначала отправьте OGG-файл в чат.`, token);
                                // 🛑 Здесь мы должны выйти сразу, так как нечего конвертировать.
                                return new Response('OK', { status: 200 }); 
                            }
                            // 🛑 Логируем успешное извлечение ID
                            envData.ctx.waitUntil(logDebug("SAY_RUN_VTA_SUCCESS", `ID OGG найден. Запускаю Health Check.`, envData));
                            
                            // 1. ПРОВЕРКА ЗДОРОВЬЯ КОНВЕРТЕРА
                            await editMessage(chatId, loadingMessageId, '🔊 **Проверка сервиса конвертации...**', token);
                            const isHealthy = await checkConverterHealth(envData); // Используем функцию, которую мы разработали
                            
                            if (!isHealthy) {
                                await editMessage(chatId, loadingMessageId, '❌ **Ошибка:** Конвертер недоступен (Render).', token);
                                return new Response('OK', { status: 200 }); 
                            }
                            await editMessage(chatId, loadingMessageId, '🔊 **Конвертация OGG → MP3...**', token);
                            // 🛑 Логируем перед вызовом конвертера (последний лог перед потенциальным зависанием)
                            envData.ctx.waitUntil(logDebug("SAY_RUN_VTA_CONVERT", `Вызов convertOggToMp3 для ID: ${sourceVoiceFileId.substring(0, 10)}...`, envData));
                            // 2.1. Конвертация (используем исходный OGG ID)
                            const mp3Buffer = await convertOggToMp3(sourceVoiceFileId, envData); 
                            // 🛑 Логируем после возврата из конвертера
                            envData.ctx.waitUntil(logDebug("SAY_RUN_VTA_RETURN", `Конвертер вернул данные. Размер: ${mp3Buffer ? mp3Buffer.byteLength : '0'}`, envData));
                            if (!mp3Buffer) {
                                throw new Error("Конвертер OGG->MP3 вернул пустые данные.");
                            }
                                
                            const mp3Base64 = arrayBufferToBase64(mp3Buffer); 
                
                            // 2.2. Отправка финального MP3
                            await sendAudioMessage(chatId, mp3Base64, 'audio/mpeg', token, envData);
                            
                            // 2.3. Финальное сообщение
                            await editMessage(chatId, loadingMessageId, `✅ **Конвертация "Свой голос" завершена!**`, token);
                            
                        } else {
                            // Неизвестный голос
                            await editMessage(chatId, loadingMessageId, `⚠️ Неизвестный голос: ${savedVoice}`, token);
                        }
                        
                        // 3. ЕДИНАЯ ТОЧКА ВЫХОДА ИЗ try:
                        return new Response('OK', { status: 200 }); 
                
                    } catch (e) {
                        // Обработка ошибок
                        const errorMessage = e.message.substring(0, 1000);
                        // 🛑 Логируем ошибку для админа
                        envData.ctx.waitUntil(logDebug("SAY_RUN_CRITICAL_ERROR", `Критическая ошибка: ${errorMessage}`, envData));
                        console.error("Ошибка при запуске озвучки:", e);
                        
                        // Редактируем сообщение с ошибкой
                        await editMessage(chatId, loadingMessageId, `❌ **Ошибка при озвучивании:**\n\`${errorMessage.substring(0, 100)}\``, token);
                        
                        return new Response('OK', { status: 200 });
                    }
                    
                } else if (data === 'ignore_empty_text') {
                    ctx.waitUntil(answerCallbackQuery(callback.id, "Введите текст для озвучки!", token));
                    return new Response('OK', { status: 200 });
                }
            // ЛОГИКА ДЛЯ АДМИН-КОМАНД (Начинаются с 'admin_')
            } else if (data.startsWith('admin_') || data === 'toggle_') { // <-- ДОБАВЛЕНО 'toggle_tts'
                    const storage = env.LAST_PHOTO_STORAGE;
                    const token = envData.TELEGRAM_BOT_TOKEN;

                    // Проверяем, является ли пользователь администратором
                    if (chatId.toString() !== envData.ADMIN_CHAT_ID.toString()) {
                    ctx.waitUntil(sendMessage(chatId, "❌ Вы не можете использовать эти админ-функции.", token));
                    return new Response('OK', { status: 200 });
            }

            // ✅ КОРРЕКЦИЯ: ЯВНАЯ ОБРАБОТКА admin_update_cmds В ОСНОВНОМ БЛОКЕ
            if (data === 'admin_update_cmds') {
                // Логика  обновления команд (admin_update_cmds)
                const resultPublic = await setBotCommands(token, PUBLIC_COMMANDS, 'default');
                const resultAdmin = await setBotCommands(token, ADMIN_COMMANDS, 'chat', envData.ADMIN_CHAT_ID);
                // ✅ НОВОЕ КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Установка для all_private_chats
                // Этот скоуп имеет самый высокий приоритет для личных чатов и принудит к обновлению.
                const resultPrivate = await setBotCommands(token, PUBLIC_COMMANDS, 'all_private_chats');
                
                let message = "✅ **Команды обновлены!**\n\n";
                message += `**Приватные (private) для всех:** ${resultPrivate.ok ? 'Успех' : 'Ошибка'}\n`; // <-- Новая строка
                message += `**Публичные (default) для всех:** ${resultPublic.ok ? 'Успех' : `Ошибка: ${resultPublic.description || 'Нет ответа от API'}`}\n`;
                message += `**Админские (chat ID ${envData.ADMIN_CHAT_ID}) для меня:** ${resultAdmin.ok ? 'Успех' : `Ошибка: ${resultAdmin.description || 'Нет ответа от API'}`}`;

                await sendMessageMarkdown(chatId, message, token);
        
        // КРИТИЧНО: Возвращаем ответ и завершаем Worker
        return new Response('OK', { status: 200 });
    }
            // ВЫЗОВ НОВОЙ ФУНКЦИИ
            // Возвращаем await, чтобы отлавливать синхронные ошибки
            const handled = await handleAdminCallback(chatId, callback, envData, ctx); 
            
            return new Response('OK', { status: 200 });
            
            // --- ЛОГИКА vision_generate (СОЗДАТЬ КАРТИНКУ) ---
            } else if (data === 'vision_generate') {
                const promptToGenerate = await storage.get(LAST_PROMPT_KEY);
                
                // Получаем ID колбэка для немедленного ответа
                const callbackId = callback.id; 
                const messageId = callback.message.message_id; // ✅ ID сообщения меню

                // 1. НЕМЕДЛЕННЫЙ ОТВЕТ НА КОЛБЭК
                ctx.waitUntil(answerCallbackQuery(callbackId, "⏳ Запускаю создание изображения...", token));

                if (promptToGenerate) {
                    
                    // Опционально: Редактируем сообщение, чтобы показать, что процесс начался
                    ctx.waitUntil(editMessage(chatId, messageId, `🖼️ **Создание изображения** по промпту: \`${promptToGenerate}\``, token));

                    // Вызываем существующую функцию processCreateCommand
                    ctx.waitUntil(processText2ImageCommand(
                        chatId,
                        promptToGenerate, // Передаем промпт из KV
                        token,
                        storage,
                        envData,
                        messageId // ✅ НОВЫЙ 6-й аргумент: ID сообщения для редактирования
                    ));
                } else {
                    await editMessage(chatId, messageId, `⚠️ Промпт устарел или не найден. Сначала отправьте фото.`, token);
                }
                
                // Возвращаем OK после того, как все асинхронные задачи поставлены в очередь
                return new Response('OK', { status: 200 });

            // --- ЛОГИКА start_command (Открыть главное меню) ---
            } else if (data === 'start_command') {
                const callbackId = callback.id;
                const messageId = callback.message.message_id;
                const STORAGE = envData.LAST_PHOTO_STORAGE; 
                // ✅ ИСПРАВЛЕНО: Определяем, есть ли сохраненное изображение
                const isPhotoSaved = !!(await STORAGE.get(chatId + LAST_IMAGE_DATA_KEY_SUFFIX));
                const isVideoSaved = !!(await STORAGE.get(chatId + LAST_VIDEO_DATA_KEY_SUFFIX));
                // 1. Получаем данные главного меню
                const { messageText, keyboardObject } = getStartMenuData(isPhotoSaved, isVideoSaved);

                // 2. Редактируем сообщение (вместо отправки нового)
                ctx.waitUntil(
                    (async () => {
                        // Отвечаем на колбэк (убираем часы)
                        await answerCallbackQuery(callbackId, "Открываю главное меню...", token);

                        // Редактируем сообщение, заменяя его на меню /start
                        await editMessageWithKeyboard(
                            chatId,
                            messageId,
                            messageText,
                            token,
                            keyboardObject.inline_keyboard
                        );
                    })()
                );
                return new Response('OK', { status: 200 });

            // --- ЛОГИКА regenerate_prompt (ПЕРЕГЕНЕРАЦИЯ ИЗ ФОТО) ---
            } else if (data === 'regenerate_prompt') {
                const imageBase64 = await storage.get(LAST_IMAGE_DATA_KEY); // Проверяем наличие фото

                if (!imageBase64) {
                        await editMessage(chatId, messageId, "⚠️ **Внимание:** Нет исходного изображения для повторного анализа. Сначала отправьте фотографию.", token);
                        return new Response('OK', { status: 200 });
                    }

                    ctx.waitUntil(processPromptRegeneration(chatId, imageBase64, token, storage, envData)); // Вызываем функцию

                    return new Response('OK', { status: 200 });

            // --- ЛОГИКА edit_prompt (РЕДАКТИРОВАНИЕ ТЕКСТА) ---
            } else if (data === 'edit_prompt') {
                const currentPrompt = await storage.get(LAST_PROMPT_KEY); // Проверяем наличие текста промпта

                if (!currentPrompt) {
                    await editMessage(chatId, messageId, "⚠️ **Ошибка:** Нечего редактировать. Сначала получите промпт, отправив фотографию или создайте его вручную.", token);
                    return new Response('OK', { status: 200 });
                }

                // ✅ ИСПРАВЛЕНИЕ: Используем STATE_AWAITING_PROMPT_EDIT, который определен выше
                await storage.put(USER_STATE_KEY, STATE_AWAITING_PROMPT_EDIT, { expirationTtl: 300 });

                await editMessage(chatId, messageId, `✏️ **Редактирование промпта**\n\nЯ сохраню его и буду использовать для дальнейшей работы.\n\nТекущий промпт: \`${currentPrompt}\``, token);

                return new Response('OK', { status: 200 });

            // --- ЛОГИКА translate_prompt (ДВУСТОРОННИЙ ПЕРЕВОД) ---
            } else if (data === 'translate_prompt') {

            // 1. Построение ключа для языка (предполагаем, что LAST_PROMPT_LANG_KEY_SUFFIX доступен)
            const LAST_PROMPT_LANG_KEY = chatId + envData.LAST_PROMPT_LANG_KEY_SUFFIX; // <-- ИСПРАВЛЕНО

            // 2. Читаем текущий промпт и язык
            const currentPrompt = await storage.get(LAST_PROMPT_KEY);
            let currentLang = await storage.get(LAST_PROMPT_LANG_KEY);

            // Определяем язык источника и назначения
            if (!currentLang) {
                currentLang = 'ru'; // Исходный промпт (после ввода пользователя) по умолчанию RU
            }
            const targetLang = (currentLang === 'ru') ? 'en' : 'ru';
            const sourceLang = currentLang;

            if (!currentPrompt) {
                await editMessage(chatId, messageId, "⚠️ **Ошибка:** Нет промпта для перевода. Сначала получите промпт.", token);
                return new Response('OK', { status: 200 });
            }

            // Запускаем асинхронный процесс перевода
            ctx.waitUntil(
                (async () => {
                    const displayPrompt = currentPrompt.length > 30 ? currentPrompt.substring(0, 30) + '...' : currentPrompt;

                    // Сообщение о начале перевода с указанием направления
                    await editMessage(
                        chatId,
                        messageId,
                        `🌐 **Перевожу:** ${sourceLang.toUpperCase()} → ${targetLang.toUpperCase()} (${displayPrompt})`,
                        token
                    );

                    try {
                        // ВАЖНО: Ваша функция callWorkersAITranslate должна принимать sourceLang и targetLang
                        const translatedPrompt = await callWorkersAITranslate(currentPrompt, envData, sourceLang, targetLang);
                        
                        // 3. Сохраняем новый промпт и НОВЫЙ язык
                        await storage.put(LAST_PROMPT_KEY, translatedPrompt, { expirationTtl: 86400 });
                        await storage.put(LAST_PROMPT_LANG_KEY, targetLang, { expirationTtl: 86400 });
                        const charCount = translatedPrompt ? currentPrompt.length : 0;
                        // 4. Готовим итоговое сообщение в режиме Markdown
                        let message = `✅ **Перевод выполнен!**\n\n`;

                        // Определяем флаг
                        const flag = (targetLang === 'ru') ? '🇷🇺' : '🇬🇧';

                        // Формируем сообщение с флагом
                        message += `**Язык:** ${flag} ${targetLang.toUpperCase()}\n\n**Промпт:**\n\`${translatedPrompt}\`\n\n**Кол-во символов:** ${charCount}\n\nЧто вы хотите сделать с этим промптом?`;

                        // 4. Редактируем сообщение с новой клавиатурой
                        const keyboardObject = getPromptKeyboard(translatedPrompt);

                        await editMessageWithKeyboard(
                            chatId, messageId,
                            message,
                            token,
                            keyboardObject.inline_keyboard // <-- ПЕРЕДАЕМ ТОЛЬКО МАССИВ КНОПОК
                        );
                    } catch (e) {
                        // Ловим ошибку и сообщаем о ней
                        await editMessage(chatId, messageId, `❌ **Ошибка перевода:** ${e.message}`, token);
                        // Логируем ошибку
                        //ctx.waitUntil(logToKV('ERROR', `Translate error for chat ${chatId}: ${e.message}`, envData));
                    }
                })()
            );
            return new Response('OK', { status: 200 });

            // --- ЛОГИКА clear_prompt (ОЧИСТКА ПРОМПТА) ---
            } else if (data === 'clear_prompt') {

                // 1. Построение ключа для языка (предполагаем, что LAST_PROMPT_LANG_KEY_SUFFIX доступен)
                const LAST_PROMPT_LANG_KEY = chatId + envData.LAST_PROMPT_LANG_KEY_SUFFIX; // <-- ИСПРАВЛЕНО

                // Запускаем асинхронный процесс очистки в фоне
                ctx.waitUntil(
                    (async () => {
                        try {
                            // 2. Удаление промпта и языка из хранилища
                            await storage.delete(LAST_PROMPT_KEY);
                            await storage.delete(LAST_PROMPT_LANG_KEY);

                            const clearedPrompt = '';

                            // 3. Готовим итоговое сообщение в режиме Markdown
                            let message = `🗑️ **Промпт очищен!**\n\nТеперь вы можете ввести новый промпт, не ограничивая свой творческий потенциал.`;

                            // 4. Редактируем сообщение с новой клавиатурой.
                            // Передаем пустую строку, чтобы функция getPromptKeyboard вернула кнопки для пустого промпта.
                            const keyboardObject = getPromptKeyboard(clearedPrompt);

                            await editMessageWithKeyboard(
                                chatId, messageId,
                                message,
                                token,
                                keyboardObject.inline_keyboard // Передаем только массив кнопок
                            );
                        } catch (e) {
                            // Ловим ошибку очистки хранилища
                            await editMessage(chatId, messageId, `❌ **Ошибка очистки промпта:** ${e.message}`, token);
                            // Логируем ошибку
                            //ctx.waitUntil(logToKV('ERROR', `Clear prompt error for chat ${chatId}: ${e.message}`, envData));
                        }
                    })()
                );
                return new Response('OK', { status: 200 });

                
            // --- ЛОГИКА create_new_prompt (Установка стейта для нового промпта) ---
            } else if (data === 'create_new_prompt') {
                // ✅ ИСПРАВЛЕНИЕ: Используем STATE_AWAITING_NEW_PROMPT, который определен выше
                await storage.put(USER_STATE_KEY, STATE_AWAITING_NEW_PROMPT, { expirationTtl: 300 });

                ctx.waitUntil(sendMessageMarkdown(chatId,
                    "✏️ **Введите новый промпт**\n\n" +
                "Введите текстом всё что хотите вообразить а я сохраню эту информацию, и при нажатии кнопки 📖 **Создать картинку по промпту** попытаюсь воплотить Вашу фантазию в виде изображения.",
                    token
                ));
                return new Response('OK', { status: 200 });
            }
        } // !!! КОНЕЦ ИСПРАВЛЕННОГО БЛОКА INLINE-КНОПОК !!!
        // Если ни медиа, ни голос не колбэк, далее идет обработка messageText            

        // 4. ОБРАБОТКА ОБЫЧНОГО ТЕКСТА (ЧАТ)
        if (messageText.length > 0) {

            // --- 4.1. ОБРАБОТКА ИНТЕРАКТИВНОГО АДМИН-РЕЖИМА (Без изменений) ---
            if (chatId.toString() === envData.ADMIN_CHAT_ID.toString()) {
                const isAdminModeProcessed = await processAdminStateMessage(chatId, messageText, envData, ctx);
                if (isAdminModeProcessed) {
                    return new Response('OK', { status: 200 });
                }
            }

            // --- 4.2. ОБЫЧНАЯ ОБРАБОТКА ТЕКСТА (ИСПРАВЛЕНО) ---
            // Сначала пытаемся обработать интерактивный ввод (сохранение промпта, которое требует await)
            const isPromptInteraction = await processTextMessage(chatId, messageText, envData);

            if (isPromptInteraction === true) { // Проверяем на явное true
                // Если промпт был сохранен, мы возвращаем OK, блокируя завершение Worker'а,
                // пока запись в KV не завершится (благодаря await внутри processTextMessage).
                return new Response('OK', { status: 200 });
            } else {
                // Иначе, это обычный чат. Его можно безопасно отправить в фон.
                // ВНИМАНИЕ: Если processTextMessage возвращает false,
                // то это обычная чат-логика (п. 2 в функции).
                //ctx.waitUntil(processTextMessage(chatId, messageText, envData));
                return new Response('OK', { status: 200 });
            }
        } // КОНЕЦ БЛОКА ОБРАБОТКИ ОБЫЧНОГО ТЕКСТА

        // Игнорируем остальные обновления (например, стикеры, pin-сообщения)
        return new Response('OK', { status: 200 });

        // 5. ГЛОБАЛЬНАЯ ОБРАБОТКА ОШИБОК И ЛОГИРОВАНИЕ
    } catch (e) {
        const errorMessage = `Fatal error processing update for chat ${chatId}: ${e.message} Stack: ${e.stack ? e.stack.substring(0, 500) : 'N/A'}`;

        // Логируем ошибку, чтобы она появилась в админ-панели
        //ctx.waitUntil(logToKV('FATAL', errorMessage, envData));

        // Отправляем пользователю сообщение об ошибке (если есть chatId)
        if (chatId) {
            const token = env.TELEGRAM_BOT_TOKEN;
            // Отправляем сообщение об ошибке только в DEBUG_CHAT_ID или ADMIN_CHAT_ID (если определен)
            if (envData.DEBUG_ENABLED && envData.DEBUG_CHAT_ID) {
                const debugTarget = envData.DEBUG_CHAT_ID || envData.ADMIN_CHAT_ID;
                ctx.waitUntil(sendMessage(debugTarget, `❌ **КРИТИЧЕСКАЯ ОШИБКА**\n\n${errorMessage}`, token, { parse_mode: 'Markdown' }));
            }
            // Отправляем вежливый ответ пользователю
            ctx.waitUntil(sendMessage(chatId, "❌ Произошла непредвиденная ошибка. Мы уже работаем над ее устранением. Пожалуйста, попробуйте позже.", token));
        }
        // Возвращаем ответ Telegram, чтобы избежать повторных попыток
        return new Response('Error', { status: 500 });
    }   // КОНЕЦ БЛОКА ГЛОБАЛЬНОЙ ОБРАБОТКИ ОШИБОК
};

module.exports = { worker_code_fetch };