// validatorMultiformat.js - Deterministic validation for multiformat content

(function() {
'use strict';

/**
 * Validation severity levels
 */
const Severity = {
    ERROR: 'ERROR',
    WARNING: 'WARNING',
    INFO: 'INFO'
};

/**
 * Character limits for each format
 */
const LIMITS = {
    push: {
        title: 32,
        subtitle: 60
    },
    sms: {
        text: 78 // + "по карте №12345"
    },
    yandex_maps: {
        text_min: 150,
        text_max: 300
    },
    onboarding: {
        title: 40,
        subtitle: 60
    },
    landing_page: {
        title: 47,
        description: 428,
        description_recommended: 375
    },
    tabs: {
        text_min: 250,
        text_max: 500,
        text_optimal_min: 350,
        text_optimal_max: 400
    },
    sticky_banner: {
        text: 50
    },
    sticky_banner_timer: {
        text: 58
    },
    ticker: {
        text: 40
    }
};

/**
 * Alcohol-related words forbidden in SMS
 */
const SMS_FORBIDDEN_ALCOHOL = [
    'вино', 'вина', 'вином', 'вину',
    'алкогол', 
    'игрист', 
    'крепк', 
    'шампан',
    'коньяк', 'виски', 'водк', 'текил', 'ром',
    'красн', 'бел', // в контексте вина
    'просекко', 'кава'
];

/**
 * Main validation function for multiformat content
 * @param {string} generatedContent - The generated multiformat content
 * @param {Object} parsedBrief - The parsed brief JSON
 * @returns {Object} { isValid: boolean, violations: Array, stats: Object }
 */
function validateMultiformat(generatedContent, parsedBrief) {
    const violations = [];
    const stats = {
        totalChecks: 0,
        errors: 0,
        warnings: 0
    };

    // Parse the generated content into sections
    const sections = parseGeneratedContent(generatedContent);

    // 1. Check length limits for each format
    checkLengthLimits(sections, violations, stats);

    // 2. Check SMS alcohol restrictions
    checkSMSAlcoholRestrictions(sections, violations, stats);

    // 3. Check sticky banner with timer ends with [таймер]
    checkStickyTimerFormat(sections, violations, stats);

    // 4. Check for abbreviated words
    checkAbbreviations(generatedContent, violations, stats);

    // 5. Check forbidden word "напиток"
    checkForbiddenNapitok(generatedContent, violations, stats);

    // 6. Check CTA rules (no "купить")
    checkCTARules(generatedContent, violations, stats);

    // 7. Check message consistency (discount % should match across formats)
    checkMessageConsistency(sections, parsedBrief, violations, stats);

    const isValid = stats.errors === 0;

    return {
        isValid,
        violations,
        stats
    };
}

/**
 * Parse generated content into sections by format type
 */
function parseGeneratedContent(content) {
    const sections = {
        push_announce: [],
        push_reminder: [],
        push_last_call: [],
        sms_announce: [],
        sms_reminder: [],
        sms_last_call: [],
        yandex_maps: [],
        onboarding: [],
        landing_page: [],
        tabs: [],
        sticky_banner: [],
        sticky_banner_timer: [],
        ticker: []
    };

    const lines = content.split('\n');
    let currentSection = null;
    let currentVariant = null;

    for (const line of lines) {
        const trimmed = line.trim();

        // Detect section headers
        if (/1\.1\.\s*ПУШ\s*[—–-]\s*АНОНС/i.test(trimmed)) {
            currentSection = 'push_announce';
        } else if (/1\.2\.\s*ПУШ\s*[—–-]\s*НАПОМИНАНИЕ/i.test(trimmed)) {
            currentSection = 'push_reminder';
        } else if (/1\.3\.\s*ПУШ\s*[—–-]\s*ПОСЛЕДНИЙ\s*ЗВОНОК/i.test(trimmed)) {
            currentSection = 'push_last_call';
        } else if (/2\.1\.\s*СМС\s*[—–-]\s*АНОНС/i.test(trimmed)) {
            currentSection = 'sms_announce';
        } else if (/2\.2\.\s*СМС\s*[—–-]\s*НАПОМИНАНИЕ/i.test(trimmed)) {
            currentSection = 'sms_reminder';
        } else if (/2\.3\.\s*СМС\s*[—–-]\s*ПОСЛЕДНИЙ\s*ЗВОНОК/i.test(trimmed)) {
            currentSection = 'sms_last_call';
        } else if (/3\.1\.\s*ЯНДЕКС\s*КАРТЫ/i.test(trimmed)) {
            currentSection = 'yandex_maps';
        } else if (/3\.2\.\s*ОНБОРДИНГ/i.test(trimmed)) {
            currentSection = 'onboarding';
        } else if (/3\.3\.\s*ТЕКСТ\s*НА\s*LP/i.test(trimmed)) {
            currentSection = 'landing_page';
        } else if (/3\.4\.\s*ТАБЫ/i.test(trimmed)) {
            currentSection = 'tabs';
        } else if (/3\.5\.\s*СТИКИ-БАННЕР\s*БЕЗ\s*ТАЙМЕРА/i.test(trimmed)) {
            currentSection = 'sticky_banner';
        } else if (/3\.6\.\s*СТИКИ-БАННЕР\s*С\s*ТАЙМЕРОМ/i.test(trimmed)) {
            currentSection = 'sticky_banner_timer';
        } else if (/3\.7\.\s*БЕГУЩАЯ\s*СТРОКА/i.test(trimmed)) {
            currentSection = 'ticker';
        }

        // Parse variant content
        if (currentSection && trimmed) {
            // Check for variant start
            const variantMatch = trimmed.match(/^-?\s*Вариант\s*(\d+)/i);
            if (variantMatch) {
                currentVariant = { number: parseInt(variantMatch[1]) };
                sections[currentSection].push(currentVariant);
            }

            // Parse fields within variant
            if (currentVariant) {
                const titleMatch = trimmed.match(/Заголовок:\s*(.+)/i);
                const subtitleMatch = trimmed.match(/Подзаголовок:\s*(.+)/i);
                const textMatch = trimmed.match(/Текст:\s*(.+)/i);
                const descMatch = trimmed.match(/Описание:\s*(.+)/i);
                const buttonMatch = trimmed.match(/Кнопка:\s*(.+)/i);

                if (titleMatch) currentVariant.title = titleMatch[1].trim();
                if (subtitleMatch) currentVariant.subtitle = subtitleMatch[1].trim();
                if (textMatch) currentVariant.text = textMatch[1].trim();
                if (descMatch) currentVariant.description = descMatch[1].trim();
                if (buttonMatch) currentVariant.button = buttonMatch[1].trim();

                // SMS single line format
                if (currentSection.startsWith('sms_') && !textMatch) {
                    const smsLineMatch = trimmed.match(/^-?\s*Вариант\s*\d+:\s*(.+)/i);
                    if (smsLineMatch) {
                        currentVariant.text = smsLineMatch[1].trim();
                    }
                }

                // Ticker/Sticky single line format
                if ((currentSection === 'ticker' || currentSection === 'sticky_banner' || currentSection === 'sticky_banner_timer') && !textMatch) {
                    const singleLineMatch = trimmed.match(/^-?\s*Вариант\s*\d+:\s*(.+)/i);
                    if (singleLineMatch) {
                        currentVariant.text = singleLineMatch[1].trim();
                    }
                }
            }
        }
    }

    return sections;
}

/**
 * Check length limits for all formats
 */
function checkLengthLimits(sections, violations, stats) {
    // Push formats
    ['push_announce', 'push_reminder', 'push_last_call'].forEach(section => {
        sections[section].forEach((variant, idx) => {
            stats.totalChecks++;
            if (variant.title && variant.title.length > LIMITS.push.title) {
                violations.push({
                    code: 'PUSH_TITLE_OVERLIMIT',
                    severity: Severity.ERROR,
                    message: `Пуш заголовок превышает лимит ${LIMITS.push.title} символов`,
                    location: `${section} вариант ${variant.number || idx + 1}`,
                    evidence: `"${variant.title}" (${variant.title.length} символов)`,
                    suggestedFix: `Сократите до ${LIMITS.push.title} символов`
                });
                stats.errors++;
            }

            stats.totalChecks++;
            if (variant.subtitle && variant.subtitle.length > LIMITS.push.subtitle) {
                violations.push({
                    code: 'PUSH_SUBTITLE_OVERLIMIT',
                    severity: Severity.ERROR,
                    message: `Пуш подзаголовок превышает лимит ${LIMITS.push.subtitle} символов`,
                    location: `${section} вариант ${variant.number || idx + 1}`,
                    evidence: `"${variant.subtitle}" (${variant.subtitle.length} символов)`,
                    suggestedFix: `Сократите до ${LIMITS.push.subtitle} символов`
                });
                stats.errors++;
            }
        });
    });

    // SMS formats
    ['sms_announce', 'sms_reminder', 'sms_last_call'].forEach(section => {
        sections[section].forEach((variant, idx) => {
            stats.totalChecks++;
            if (variant.text && variant.text.length > LIMITS.sms.text) {
                violations.push({
                    code: 'SMS_TEXT_OVERLIMIT',
                    severity: Severity.ERROR,
                    message: `SMS текст превышает лимит ${LIMITS.sms.text} символов (без учёта "по карте №12345")`,
                    location: `${section} вариант ${variant.number || idx + 1}`,
                    evidence: `"${variant.text}" (${variant.text.length} символов)`,
                    suggestedFix: `Сократите до ${LIMITS.sms.text} символов`
                });
                stats.errors++;
            }
        });
    });

    // Yandex Maps
    sections.yandex_maps.forEach((variant, idx) => {
        stats.totalChecks++;
        const text = variant.text || '';
        if (text.length < LIMITS.yandex_maps.text_min) {
            violations.push({
                code: 'YANDEX_TEXT_UNDERLIMIT',
                severity: Severity.WARNING,
                message: `Яндекс Карты текст меньше минимума ${LIMITS.yandex_maps.text_min} символов`,
                location: `yandex_maps вариант ${variant.number || idx + 1}`,
                evidence: `"${text}" (${text.length} символов)`
            });
            stats.warnings++;
        }
        if (text.length > LIMITS.yandex_maps.text_max) {
            violations.push({
                code: 'YANDEX_TEXT_OVERLIMIT',
                severity: Severity.ERROR,
                message: `Яндекс Карты текст превышает лимит ${LIMITS.yandex_maps.text_max} символов`,
                location: `yandex_maps вариант ${variant.number || idx + 1}`,
                evidence: `"${text}" (${text.length} символов)`
            });
            stats.errors++;
        }
    });

    // Onboarding
    sections.onboarding.forEach((variant, idx) => {
        stats.totalChecks++;
        if (variant.title && variant.title.length > LIMITS.onboarding.title) {
            violations.push({
                code: 'ONBOARDING_TITLE_OVERLIMIT',
                severity: Severity.ERROR,
                message: `Онбординг заголовок превышает лимит ${LIMITS.onboarding.title} символов`,
                location: `onboarding вариант ${variant.number || idx + 1}`,
                evidence: `"${variant.title}" (${variant.title.length} символов)`
            });
            stats.errors++;
        }
        if (variant.subtitle && variant.subtitle.length > LIMITS.onboarding.subtitle) {
            violations.push({
                code: 'ONBOARDING_SUBTITLE_OVERLIMIT',
                severity: Severity.ERROR,
                message: `Онбординг подзаголовок превышает лимит ${LIMITS.onboarding.subtitle} символов`,
                location: `onboarding вариант ${variant.number || idx + 1}`,
                evidence: `"${variant.subtitle}" (${variant.subtitle.length} символов)`
            });
            stats.errors++;
        }
    });

    // Landing Page
    sections.landing_page.forEach((variant, idx) => {
        stats.totalChecks++;
        if (variant.title && variant.title.length > LIMITS.landing_page.title) {
            violations.push({
                code: 'LP_TITLE_OVERLIMIT',
                severity: Severity.ERROR,
                message: `LP заголовок превышает лимит ${LIMITS.landing_page.title} символов`,
                location: `landing_page вариант ${variant.number || idx + 1}`,
                evidence: `"${variant.title}" (${variant.title.length} символов)`
            });
            stats.errors++;
        }
        if (variant.description && variant.description.length > LIMITS.landing_page.description) {
            violations.push({
                code: 'LP_DESC_OVERLIMIT',
                severity: Severity.ERROR,
                message: `LP описание превышает лимит ${LIMITS.landing_page.description} символов`,
                location: `landing_page вариант ${variant.number || idx + 1}`,
                evidence: `(${variant.description.length} символов)`
            });
            stats.errors++;
        } else if (variant.description && variant.description.length > LIMITS.landing_page.description_recommended) {
            violations.push({
                code: 'LP_DESC_OVER_RECOMMENDED',
                severity: Severity.WARNING,
                message: `LP описание превышает рекомендуемые ${LIMITS.landing_page.description_recommended} символов`,
                location: `landing_page вариант ${variant.number || idx + 1}`,
                evidence: `(${variant.description.length} символов)`
            });
            stats.warnings++;
        }
    });

    // Sticky Banner (no timer)
    sections.sticky_banner.forEach((variant, idx) => {
        stats.totalChecks++;
        const text = variant.text || '';
        if (text.length > LIMITS.sticky_banner.text) {
            violations.push({
                code: 'STICKY_TEXT_OVERLIMIT',
                severity: Severity.ERROR,
                message: `Стики-баннер текст превышает лимит ${LIMITS.sticky_banner.text} символов`,
                location: `sticky_banner вариант ${variant.number || idx + 1}`,
                evidence: `"${text}" (${text.length} символов)`
            });
            stats.errors++;
        }
    });

    // Sticky Banner (with timer)
    sections.sticky_banner_timer.forEach((variant, idx) => {
        stats.totalChecks++;
        const text = variant.text || '';
        if (text.length > LIMITS.sticky_banner_timer.text) {
            violations.push({
                code: 'STICKY_TIMER_TEXT_OVERLIMIT',
                severity: Severity.ERROR,
                message: `Стики-баннер с таймером превышает лимит ${LIMITS.sticky_banner_timer.text} символов`,
                location: `sticky_banner_timer вариант ${variant.number || idx + 1}`,
                evidence: `"${text}" (${text.length} символов)`
            });
            stats.errors++;
        }
    });

    // Ticker (бегущая строка)
    sections.ticker.forEach((variant, idx) => {
        stats.totalChecks++;
        const text = variant.text || '';
        if (text.length > LIMITS.ticker.text) {
            violations.push({
                code: 'TICKER_TEXT_OVERLIMIT',
                severity: Severity.ERROR,
                message: `Бегущая строка превышает лимит ${LIMITS.ticker.text} символов`,
                location: `ticker вариант ${variant.number || idx + 1}`,
                evidence: `"${text}" (${text.length} символов)`
            });
            stats.errors++;
        }
    });
}

/**
 * Check SMS for forbidden alcohol words
 */
function checkSMSAlcoholRestrictions(sections, violations, stats) {
    ['sms_announce', 'sms_reminder', 'sms_last_call'].forEach(section => {
        sections[section].forEach((variant, idx) => {
            stats.totalChecks++;
            const text = (variant.text || '').toLowerCase();
            
            for (const word of SMS_FORBIDDEN_ALCOHOL) {
                if (text.includes(word)) {
                    violations.push({
                        code: 'SMS_ALCOHOL_MENTION',
                        severity: Severity.ERROR,
                        message: `SMS содержит упоминание алкоголя ("${word}")`,
                        location: `${section} вариант ${variant.number || idx + 1}`,
                        evidence: variant.text,
                        suggestedFix: 'Используйте: "коллекция", "ассортимент", "хиты", "подборка", "выгода"'
                    });
                    stats.errors++;
                    break; // One error per variant is enough
                }
            }
        });
    });
}

/**
 * Check sticky banner with timer ends with [таймер]
 */
function checkStickyTimerFormat(sections, violations, stats) {
    sections.sticky_banner_timer.forEach((variant, idx) => {
        stats.totalChecks++;
        const text = variant.text || '';
        if (!text.includes('[таймер]') && !text.includes('[timer]')) {
            violations.push({
                code: 'STICKY_TIMER_MISSING_TAG',
                severity: Severity.ERROR,
                message: 'Стики-баннер с таймером должен заканчиваться на [таймер]',
                location: `sticky_banner_timer вариант ${variant.number || idx + 1}`,
                evidence: text,
                suggestedFix: 'Добавьте [таймер] в конец текста'
            });
            stats.errors++;
        }
    });
}

/**
 * Check for abbreviated words (forbidden)
 */
function checkAbbreviations(content, violations, stats) {
    stats.totalChecks++;
    
    // Common abbreviation patterns
    const abbreviationPatterns = [
        /\bт\.к\./gi,
        /\bт\.е\./gi,
        /\bи т\.д\./gi,
        /\bи т\.п\./gi,
        /\bдр\./gi,
        /\bг\./gi, // год -> г.
        /\bруб\./gi,
        /\bтыс\./gi,
        /\bмлн\./gi
    ];

    for (const pattern of abbreviationPatterns) {
        const match = content.match(pattern);
        if (match) {
            violations.push({
                code: 'ABBREVIATED_WORD',
                severity: Severity.WARNING,
                message: `Найдено сокращённое слово: "${match[0]}"`,
                location: 'Общий текст',
                evidence: match[0],
                suggestedFix: 'Запрещено сокращать слова'
            });
            stats.warnings++;
        }
    }
}

/**
 * Check for forbidden word "напиток"
 */
function checkForbiddenNapitok(content, violations, stats) {
    stats.totalChecks++;
    
    if (/напит[оа]к/i.test(content)) {
        violations.push({
            code: 'FORBIDDEN_NAPITOK',
            severity: Severity.ERROR,
            message: 'Слово "напиток" запрещено',
            location: 'Общий текст',
            evidence: content.match(/напит[оа]к[а-яё]*/i)?.[0] || 'напиток',
            suggestedFix: 'Используйте конкретные названия: вино, игристое, коньяк'
        });
        stats.errors++;
    }
}

/**
 * Check CTA rules - "купить" is forbidden except "купить в винотеке"
 */
function checkCTARules(content, violations, stats) {
    stats.totalChecks++;
    
    const lowerContent = content.toLowerCase();
    if (/\bкупи/.test(lowerContent)) {
        // Check if it's the allowed exception
        if (!/купить?\s+в\s+винотек/i.test(content)) {
            violations.push({
                code: 'FORBIDDEN_KUPIT_CTA',
                severity: Severity.ERROR,
                message: 'CTA "купить" запрещён (кроме "купить в винотеке")',
                location: 'Общий текст',
                evidence: content.match(/купи[тьа]?[^\s]*/i)?.[0] || 'купить',
                suggestedFix: 'Используйте: "Заказать", "Выбрать", "Открыть"'
            });
            stats.errors++;
        }
    }
}

/**
 * Check that discount percentages are consistent across formats
 */
function checkMessageConsistency(sections, parsedBrief, violations, stats) {
    stats.totalChecks++;
    
    const discountPattern = /-?\d{1,2}%/g;
    const foundDiscounts = new Set();

    // Collect all discount values mentioned
    const allVariants = [
        ...sections.push_announce,
        ...sections.push_reminder,
        ...sections.push_last_call,
        ...sections.sms_announce,
        ...sections.sms_reminder,
        ...sections.sms_last_call,
        ...sections.onboarding,
        ...sections.landing_page,
        ...sections.ticker,
        ...sections.sticky_banner,
        ...sections.sticky_banner_timer
    ];

    for (const variant of allVariants) {
        const text = [variant.title, variant.subtitle, variant.text, variant.description]
            .filter(Boolean)
            .join(' ');
        
        const matches = text.match(discountPattern);
        if (matches) {
            matches.forEach(m => foundDiscounts.add(m.replace('-', '')));
        }
    }

    // If multiple different discount values found, warn
    if (foundDiscounts.size > 2) { // Allow "до X%" pattern which may show range
        violations.push({
            code: 'INCONSISTENT_DISCOUNTS',
            severity: Severity.WARNING,
            message: `Найдены разные значения скидок: ${[...foundDiscounts].join(', ')}`,
            location: 'Все форматы',
            evidence: [...foundDiscounts].join(', '),
            suggestedFix: 'Убедитесь, что цифры скидок идентичны во всех форматах'
        });
        stats.warnings++;
    }
}

// Export for use in app
if (typeof window !== 'undefined') {
    window.ValidatorMultiformat = {
        validateMultiformat,
        Severity,
        LIMITS
    };
    console.log('✓ ValidatorMultiformat exported to window');
}

})(); // End IIFE
