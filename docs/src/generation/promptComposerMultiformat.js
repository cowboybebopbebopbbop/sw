// promptComposerMultiformat.js - Composes prompts for multiformat generation

(function() {
'use strict';

/**
 * Load the multiformat generation specs and rules
 * @returns {Object} Object containing all rules and specs
 */
function loadMultiformatRules() {
    return {
        systemInstructions: window.SYSTEM_INSTRUCTIONS || '',
        multiformatSpec: window.SPEC_MULTIFORMAT_V1 || '',
        lexiconBans: window.SW_LEXICON_AND_BANS || '',
        globalRules: window.SW_GLOBAL_RULES || ''
    };
}

/**
 * Determine which formats are needed based on parsed brief
 * @param {Object} parsedBrief - The parsed brief JSON from BriefParser
 * @returns {Object} Object with format flags
 */
function determineRequiredFormats(parsedBrief) {
    const formats = parsedBrief.formats_required || {};
    
    return {
        push: {
            announce: formats.push?.needed || false,
            reminder: formats.push?.has_reminder || false,
            lastCall: formats.push?.has_last_call || false
        },
        sms: {
            announce: formats.sms?.needed || false,
            reminder: formats.sms?.needed || false,
            lastCall: formats.sms?.needed || false
        },
        yandexMaps: formats.yandex_maps?.needed || false,
        onboarding: formats.onboarding?.needed || false,
        landingPage: formats.landing_page?.needed || true, // Default to true
        tabs: formats.tabs?.needed || false,
        stickyBanner: formats.sticky_banner?.needed || false,
        stickyBannerTimer: formats.sticky_banner?.has_timer || false,
        ticker: formats.ticker?.needed || false
    };
}

/**
 * Format parsed brief JSON as readable context for LLM
 * @param {Object} parsedBrief - The parsed brief JSON
 * @returns {string} Formatted brief text
 */
function formatBriefForPrompt(parsedBrief) {
    const sections = [];

    // Campaign info
    if (parsedBrief.campaign) {
        const c = parsedBrief.campaign;
        sections.push(`## КАМПАНИЯ
- Название: ${c.internal_name || 'Не указано'}
- Тип: ${c.type || 'promo'}
- Период: ${c.period?.raw_text || 'Не указан'}
  - Старт: ${c.period?.start || '-'}
  - Конец: ${c.period?.end || '-'}
- Главный месседж: ${c.key_message_inputs?.main_line || 'Не указан'}
- Саб-лайн: ${c.key_message_inputs?.sub_line || '-'}`);
    }

    // Mechanics
    if (parsedBrief.mechanics) {
        const m = parsedBrief.mechanics;
        sections.push(`## МЕХАНИКА
- Скидка: ${m.discount_percent || 'Не указана'}
- Условие: ${m.condition_text || 'от 1 бутылки'}
- Минимум: ${m.min_quantity || 1} шт.
- Глубокая скидка: ${m.is_deep_discount ? 'Да' : 'Нет'}`);
    }

    // Assortment
    if (parsedBrief.assortment_normalized) {
        const a = parsedBrief.assortment_normalized;
        sections.push(`## АССОРТИМЕНТ
- Категории: ${a.categories?.join(', ') || 'Все'}
- Выбор покупателей: ${a.is_buyers_choice ? 'Да' : 'Нет'}
- Без алкоголя: ${a.excludes_alcohol ? 'Да' : 'Нет'}`);
        
        if (a.sku_list?.length > 0) {
            sections.push(`- SKU примеры:
${a.sku_list.slice(0, 5).map(s => `  - ${s.code}: ${s.name}`).join('\n')}`);
        }
    }

    // Segments
    if (parsedBrief.segments?.length > 0) {
        sections.push(`## СЕГМЕНТЫ
${parsedBrief.segments.map(s => `- ${s.type}: ${s.raw} (канал: ${s.channel})`).join('\n')}`);
    }

    // Formats required
    if (parsedBrief.formats_required) {
        const f = parsedBrief.formats_required;
        const formatsList = [];
        
        if (f.push?.needed) {
            formatsList.push(`- ПУШ: анонс${f.push.has_reminder ? ', напоминание' : ''}${f.push.has_last_call ? ', последний звонок' : ''}`);
        }
        if (f.sms?.needed) {
            formatsList.push('- СМС: анонс, напоминание, последний звонок');
        }
        if (f.yandex_maps?.needed) formatsList.push('- Яндекс Карты');
        if (f.onboarding?.needed) formatsList.push('- Онбординг');
        if (f.landing_page?.needed) formatsList.push('- Лендинг (LP)');
        if (f.tabs?.needed) formatsList.push('- Табы');
        if (f.sticky_banner?.needed) {
            formatsList.push(`- Стики-баннер${f.sticky_banner.has_timer ? ' с таймером' : ''}`);
        }
        if (f.ticker?.needed) formatsList.push('- Бегущая строка');

        if (formatsList.length > 0) {
            sections.push(`## ТРЕБУЕМЫЕ ФОРМАТЫ
${formatsList.join('\n')}`);
        }
    }

    return sections.join('\n\n');
}

/**
 * Build the format-specific generation instructions
 * @param {Object} requiredFormats - Which formats are needed
 * @returns {string} Instructions for which blocks to generate
 */
function buildFormatInstructions(requiredFormats) {
    const instructions = ['Генерируй ТОЛЬКО следующие блоки:'];

    if (requiredFormats.push.announce || requiredFormats.push.reminder || requiredFormats.push.lastCall) {
        instructions.push('\n### 1. ПУШ');
        if (requiredFormats.push.announce) instructions.push('- 1.1. ПУШ — АНОНС (5 вариантов)');
        if (requiredFormats.push.reminder) instructions.push('- 1.2. ПУШ — НАПОМИНАНИЕ (5 вариантов)');
        if (requiredFormats.push.lastCall) instructions.push('- 1.3. ПУШ — ПОСЛЕДНИЙ ЗВОНОК (5 вариантов)');
    }

    if (requiredFormats.sms.announce || requiredFormats.sms.reminder || requiredFormats.sms.lastCall) {
        instructions.push('\n### 2. СМС (БЕЗ упоминания алкоголя!)');
        if (requiredFormats.sms.announce) instructions.push('- 2.1. СМС — АНОНС (5 вариантов)');
        if (requiredFormats.sms.reminder) instructions.push('- 2.2. СМС — НАПОМИНАНИЕ (5 вариантов)');
        if (requiredFormats.sms.lastCall) instructions.push('- 2.3. СМС — ПОСЛЕДНИЙ ЗВОНОК (5 вариантов)');
    }

    instructions.push('\n### 3. ВЕБ И МИКРОФОРМАТЫ');
    if (requiredFormats.yandexMaps) instructions.push('- 3.1. ЯНДЕКС КАРТЫ (1 вариант)');
    if (requiredFormats.onboarding) instructions.push('- 3.2. ОНБОРДИНГ (5 вариантов)');
    if (requiredFormats.landingPage) instructions.push('- 3.3. ТЕКСТ НА LP (2 варианта)');
    if (requiredFormats.tabs) instructions.push('- 3.4. ТАБЫ (1 вариант)');
    if (requiredFormats.stickyBanner) instructions.push('- 3.5. СТИКИ-БАННЕР БЕЗ ТАЙМЕРА (5 вариантов)');
    if (requiredFormats.stickyBannerTimer) instructions.push('- 3.6. СТИКИ-БАННЕР С ТАЙМЕРОМ (5 вариантов)');
    if (requiredFormats.ticker) instructions.push('- 3.7. БЕГУЩАЯ СТРОКА (5 вариантов)');

    return instructions.join('\n');
}

/**
 * Compose the initial generation prompt for multiformat
 * @param {Object} parsedBrief - The parsed brief JSON
 * @param {Object} rules - The generation rules
 * @returns {Object} { systemPrompt: string, userPrompt: string }
 */
function composeMultiformatGenerationPrompt(parsedBrief, rules) {
    const requiredFormats = determineRequiredFormats(parsedBrief);
    const briefText = formatBriefForPrompt(parsedBrief);
    const formatInstructions = buildFormatInstructions(requiredFormats);

    const systemPrompt = `${rules.systemInstructions}

===== KNOWLEDGE: SPEC_MULTIFORMAT_V1 =====
${rules.multiformatSpec}

===== KNOWLEDGE: SW_LEXICON_AND_BANS =====
${rules.lexiconBans}

===== KNOWLEDGE: SW_GLOBAL_RULES =====
${rules.globalRules}

ТЫ — копирайтер SimpleWine. Твоя задача — генерировать мультиформатные тексты по брифу.

КРИТИЧЕСКИ ВАЖНО:
1. Соблюдай ВСЕ лимиты символов из SPEC_MULTIFORMAT_V1
2. В SMS ЗАПРЕЩЕНО упоминать алкоголь!
3. Стики-баннер с таймером ДОЛЖЕН заканчиваться на [таймер]
4. Единый месседж: цифры скидок идентичны во всех форматах
5. CTA: "Заказать", "Выбрать", "Открыть" (НЕ "Купить")`;

    const userPrompt = `# БРИФ

${briefText}

---

# ЗАДАНИЕ

${formatInstructions}

Следуй OUTPUT_CONTRACT из SPEC_MULTIFORMAT_V1. Генерируй каждый вариант с разным углом подачи.

ПОМНИ:
- Пуш заголовок ≤ 32 символов
- Пуш подзаголовок ≤ 60 символов  
- SMS ≤ 78 символов (+ "по карте №12345")
- SMS: НИКАКОГО алкоголя, только "хиты", "подборка", "ассортимент"
- Бегущая строка ≤ 40 символов
- Стики ≤ 50 символов (или ≤ 58 с [таймер])

Начинай генерацию:`;

    return { systemPrompt, userPrompt };
}

/**
 * Compose a repair prompt for fixing violations
 * @param {string} previousOutput - The previous generation output
 * @param {Array} violations - Array of validation violations
 * @param {Object} parsedBrief - The parsed brief JSON
 * @param {Object} rules - The generation rules
 * @returns {Object} { systemPrompt: string, userPrompt: string }
 */
function composeMultiformatRepairPrompt(previousOutput, violations, parsedBrief, rules) {
    const systemPrompt = `${rules.systemInstructions}

===== KNOWLEDGE: SPEC_MULTIFORMAT_V1 =====
${rules.multiformatSpec}

ТЫ — редактор. Твоя задача — исправить ошибки в сгенерированных текстах.`;

    const violationsText = violations.map((v, i) => 
        `${i + 1}. [${v.severity}] ${v.code}: ${v.message}
   Где: ${v.location}
   Проблема: "${v.evidence}"
   ${v.suggestedFix ? `Решение: ${v.suggestedFix}` : ''}`
    ).join('\n\n');

    const userPrompt = `# ПРЕДЫДУЩИЙ ВЫВОД (с ошибками)

${previousOutput}

---

# НАЙДЕННЫЕ ОШИБКИ

${violationsText}

---

# ЗАДАНИЕ

Исправь ТОЛЬКО блоки с ошибками. Сохрани остальные блоки без изменений.
Выведи ПОЛНЫЙ исправленный результат в том же формате OUTPUT_CONTRACT.

КРИТИЧЕСКИ ВАЖНО:
- Соблюдай лимиты символов
- В SMS запрещён алкоголь
- Стики с таймером → [таймер] в конце

Начинай исправленный вывод:`;

    return { systemPrompt, userPrompt };
}

// Export for use in app
if (typeof window !== 'undefined') {
    window.PromptComposerMultiformat = {
        loadMultiformatRules,
        determineRequiredFormats,
        formatBriefForPrompt,
        composeMultiformatGenerationPrompt,
        composeMultiformatRepairPrompt
    };
    console.log('✓ PromptComposerMultiformat exported to window');
}

})(); // End IIFE
