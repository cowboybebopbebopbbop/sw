// validator.js - Deterministic validation for generated email content

/**
 * Validation severity levels
 */
const Severity = {
    ERROR: 'ERROR',
    WARNING: 'WARNING',
    INFO: 'INFO'
};

/**
 * Violation object structure
 * @typedef {Object} Violation
 * @property {string} code - Unique violation code
 * @property {string} severity - ERROR, WARNING, or INFO
 * @property {string} message - Human-readable description
 * @property {string} location - Where in the output the violation occurred
 * @property {string} evidence - The problematic text fragment
 * @property {string} [suggestedFix] - Optional suggestion for fixing
 */

/**
 * Extract 3-grams (3 consecutive words) from text for duplication detection
 * @param {string} text - Input text
 * @returns {Set<string>} Set of normalized 3-grams
 */
function extract3Grams(text) {
    if (!text) return new Set();
    
    // Normalize: lowercase, remove punctuation, collapse whitespace
    const normalized = text
        .toLowerCase()
        .replace(/[.,!?;:—–\-«»"""''\(\)\[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    const words = normalized.split(' ').filter(w => w.length > 0);
    const grams = new Set();
    
    for (let i = 0; i <= words.length - 3; i++) {
        const gram = `${words[i]} ${words[i+1]} ${words[i+2]}`;
        grams.add(gram);
    }
    
    return grams;
}

/**
 * Check for forbidden words with context-aware exceptions
 * @param {string} text - Text to check
 * @param {string} location - Location identifier
 * @returns {Violation[]} Array of violations
 */
function checkForbiddenWords(text, location) {
    if (!text) return [];
    const violations = [];
    const lowerText = text.toLowerCase();
    
    // Check "дегустация" - allowed ONLY in "мероприятие с дегустацией вин"
    if (lowerText.includes('дегустац')) {
        const allowedPattern = /мероприятие\s+с\s+дегустацией\s+вин/i;
        if (!allowedPattern.test(text)) {
            violations.push({
                code: 'FORBIDDEN_DEGUSTATSIYA',
                severity: Severity.ERROR,
                message: 'Слово "дегустация" запрещено, кроме фразы "мероприятие с дегустацией вин"',
                location,
                evidence: text.substring(text.toLowerCase().indexOf('дегустац'), Math.min(text.length, text.toLowerCase().indexOf('дегустац') + 50)),
                suggestedFix: 'Используйте: "винный вечер", "вечер с винами", "винное мероприятие"'
            });
        }
    }
    
    // Check "купить" - allowed ONLY with "в винотеке"
    if (lowerText.includes('купи')) {
        const context = text.substring(
            Math.max(0, lowerText.indexOf('купи') - 20),
            Math.min(text.length, lowerText.indexOf('купи') + 30)
        );
        if (!/в\s+винотек/i.test(context)) {
            violations.push({
                code: 'FORBIDDEN_KUPIT',
                severity: Severity.ERROR,
                message: 'Слово "купить" запрещено, кроме "купить в винотеке"',
                location,
                evidence: context,
                suggestedFix: 'Используйте: "заказать", "выбрать", "собрать корзину"'
            });
        }
    }
    
    // Check "покупка/покупать" forms - allowed ONLY with "в винотеке"
    const pokupkaPattern = /покупк|покупа[тюе]/i;
    if (pokupkaPattern.test(text)) {
        const match = text.match(pokupkaPattern);
        if (match) {
            const startIdx = match.index;
            const context = text.substring(
                Math.max(0, startIdx - 20),
                Math.min(text.length, startIdx + 40)
            );
            if (!/в\s+винотек/i.test(context)) {
                violations.push({
                    code: 'FORBIDDEN_POKUPKA',
                    severity: Severity.ERROR,
                    message: 'Слова "покупка/покупать" запрещены, кроме случаев с "в винотеке"',
                    location,
                    evidence: context,
                    suggestedFix: 'Переформулируйте без использования слова "покупка"'
                });
            }
        }
    }
    
    // Check "букет" - should be replaced
    if (/\bбукет/i.test(text)) {
        violations.push({
            code: 'FORBIDDEN_BUKET',
            severity: Severity.ERROR,
            message: 'Слово "букет" запрещено',
            location,
            evidence: text.match(/[^.]*букет[^.]*/i)?.[0] || text.substring(0, 50),
            suggestedFix: 'Замените на "профиль" или конкретные ароматы/вкусы'
        });
    }
    
    // Check "послевкусие" - should be "финиш"
    if (/послевкус/i.test(text)) {
        violations.push({
            code: 'FORBIDDEN_POSLEVKUSIE',
            severity: Severity.ERROR,
            message: 'Слово "послевкусие" запрещено',
            location,
            evidence: text.match(/[^.]*послевкус[^.]*/i)?.[0] || text.substring(0, 50),
            suggestedFix: 'Замените на "финиш"'
        });
    }
    
    return violations;
}

/**
 * Check for banned clichés
 * @param {string} text - Text to check
 * @param {string} location - Location identifier
 * @returns {Violation[]} Array of violations
 */
function checkBannedCliches(text, location) {
    if (!text) return [];
    const violations = [];
    
    const bannedCliches = [
        { pattern: /с\s+характером(?!\s+[—:].{3,})/i, message: '"с характером" - запрещено без конкретного объяснения' },
        { pattern: /для\s+истинных\s+ценителей\s+и\s+особых\s+моментов/i, message: 'Штамп: "для истинных ценителей и особых моментов"' },
        { pattern: /отличный\s+повод/i, message: 'Штамп: "отличный повод"' },
        { pattern: /никого\s+не\s+оставит\s+равнодушным/i, message: 'Штамп: "Никого не оставит равнодушным"' },
        { pattern: /икона\s+стиля/i, message: 'Штамп: "Икона стиля"' },
        { pattern: /лето,?\s+которое\s+хочется\s+пить/i, message: 'Штамп: "Лето, которое хочется пить"' },
        { pattern: /уютный\s+вечер\s+под\s+пледом/i, message: 'Штамп: "уютный вечер под пледом"' },
        { pattern: /для\s+душевных\s+разговоров/i, message: 'Штамп: "Для душевных разговоров"' },
        { pattern: /со\s+смыслом/i, message: 'Штамп: "со смыслом"' },
        { pattern: /больше,?\s+чем\s+просто\s+вино/i, message: 'Штамп: "Больше, чем просто вино"' }
    ];
    
    for (const cliche of bannedCliches) {
        if (cliche.pattern.test(text)) {
            const match = text.match(cliche.pattern);
            violations.push({
                code: 'BANNED_CLICHE',
                severity: Severity.ERROR,
                message: cliche.message,
                location,
                evidence: match ? match[0] : '',
                suggestedFix: 'Переформулируйте оригинально'
            });
        }
    }
    
    return violations;
}

/**
 * Check geography label usage (SW_GLOBAL_RULES)
 * Region/country must not be used as standalone "label-noun" without "вина" or wine-adjective
 * @param {string} text - Text to check
 * @param {string} location - Location identifier
 * @returns {Violation[]} Array of violations
 */
function checkGeographyLabels(text, location) {
    if (!text) return [];
    const violations = [];
    
    // Common regions/countries (not exhaustive, but covers main cases)
    const regions = [
        'Пьемонт', 'Тоскан', 'Бордо', 'Бургунд', 'Испан', 'Италь', 'Франц',
        'Португал', 'Чили', 'Аргентин', 'Австрали', 'Новая Зеландия'
    ];
    
    for (const region of regions) {
        // Patterns that are FORBIDDEN (region as standalone label/noun without "вина" nearby)
        const forbiddenPatterns = [
            new RegExp(`(пробу[ем]|попробу[ем]|дегуст[ие])\\s+${region}`, 'iu'),
            new RegExp(`вечер\\s+${region}`, 'iu'),
            new RegExp(`${region}\\s+в\\s+бокале`, 'iu'),
            new RegExp(`(немного|глоток|вкус|капл[яа])\\s+${region}`, 'iu'),
            new RegExp(`${region}(?!.{0,40}вин)(?!.{0,10}(ск|н)[иоеа])\\s+(на\\s+столе|для\\s+вас|ждет)`, 'iu')
        ];
        
        for (const pattern of forbiddenPatterns) {
            if (pattern.test(text)) {
                const match = text.match(pattern);
                violations.push({
                    code: 'GEOGRAPHY_LABEL_MISUSE',
                    severity: Severity.ERROR,
                    message: `Регион "${region}" используется как самостоятельный "ярлык" без упоминания вина`,
                    location,
                    evidence: match ? match[0] : '',
                    suggestedFix: `Используйте: "вина ${region}а" или "${region.toLowerCase()}ские вина"`
                });
            }
        }
    }
    
    return violations;
}

/**
 * Check character limits
 * @param {string} text - Text to check
 * @param {number} limit - Character limit
 * @param {string} location - Location identifier
 * @returns {Violation[]} Array of violations
 */
function checkCharLimit(text, limit, location) {
    if (!text) return [];
    const violations = [];
    
    // Use Array.from to handle Unicode correctly (e.g., emojis as single chars)
    const length = Array.from(text).length;
    
    if (length > limit) {
        violations.push({
            code: 'CHAR_LIMIT_EXCEEDED',
            severity: Severity.ERROR,
            message: `Превышен лимит символов: ${length} > ${limit}`,
            location,
            evidence: text,
            suggestedFix: `Сократите на ${length - limit} символов`
        });
    }
    
    return violations;
}

/**
 * Check for emojis
 * @param {string} text - Text to check
 * @param {string} location - Location identifier
 * @returns {Violation[]} Array of violations
 */
function checkEmojis(text, location) {
    if (!text) return [];
    const violations = [];
    
    // Unicode emoji ranges (basic coverage)
    const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    
    if (emojiPattern.test(text)) {
        violations.push({
            code: 'EMOJI_FORBIDDEN',
            severity: Severity.ERROR,
            message: 'Эмодзи запрещены',
            location,
            evidence: text,
            suggestedFix: 'Удалите все эмодзи'
        });
    }
    
    return violations;
}

/**
 * Parse email output structure from LLM response
 * Extracts structured parts from SPEC_EMAIL_V1 output format
 * @param {string} output - LLM output text
 * @returns {Object} Parsed email structure
 */
function parseEmailOutput(output) {
    if (!output) return null;
    
    const structure = {
        subject: [],
        preheader: [],
        bannerTitle: [],
        bannerSubtitle: [],
        introText: '',
        introCTA: [],
        productHeading: [],
        blocks: []
    };
    
    // Simple parsing: look for known section headers
    const lines = output.split('\n');
    let currentSection = null;
    let currentBlock = null;
    let variantBuffer = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        if (!line) continue;
        
        // CRITICAL: Strip numbered prefixes like "1)", "2)", "3)" that LLMs often add
        // This prevents parsing failures when format is "1) ТЕМА" instead of "ТЕМА"
        const lineNormalized = line.replace(/^\d+[.)\):]\s*/, '');
        
        // Detect section headers (use normalized line for matching)
        if (/^(ТЕМА|Тема|Subject)/i.test(lineNormalized)) {
            if (variantBuffer.length > 0) {
                pushVariants(structure, currentSection, variantBuffer);
                variantBuffer = [];
            }
            currentSection = 'subject';
            continue;
        }
        
        if (/^(ПРЕХЕДЕР|Прехедер|Preheader)/i.test(lineNormalized)) {
            if (variantBuffer.length > 0) {
                pushVariants(structure, currentSection, variantBuffer);
                variantBuffer = [];
            }
            currentSection = 'preheader';
            continue;
        }
        
        if (/^(ГЛАВНЫЙ БАННЕР|Главный баннер|Banner)/i.test(lineNormalized)) {
            if (variantBuffer.length > 0) {
                pushVariants(structure, currentSection, variantBuffer);
                variantBuffer = [];
            }
            currentSection = 'banner';
            continue;
        }
        
        if (/^(Заголовок|Title|ЗАГОЛОВОК)(\s+баннера)?\s*[—\-—]/i.test(lineNormalized)) {
            if (variantBuffer.length > 0) {
                pushVariants(structure, currentSection, variantBuffer);
                variantBuffer = [];
            }
            currentSection = 'bannerTitle';
            continue;
        }
        
        if (/^(Подзаголовок|Subtitle|ПОДЗАГОЛОВОК)(\s+баннера)?\s*[—\-—]/i.test(lineNormalized)) {
            if (variantBuffer.length > 0) {
                pushVariants(structure, currentSection, variantBuffer);
                variantBuffer = [];
            }
            currentSection = 'bannerSubtitle';
            continue;
        }
        
        if (/^(ВВОДНЫЙ ТЕКСТ|Вводный текст|Intro)/i.test(lineNormalized)) {
            if (variantBuffer.length > 0) {
                pushVariants(structure, currentSection, variantBuffer);
                variantBuffer = [];
            }
            currentSection = 'intro';
            continue;
        }
        
        if (/^(Кнопка|CTA|КТА)\s*[:\uff1a—\-—]/i.test(lineNormalized)) {
            if (variantBuffer.length > 0) {
                pushVariants(structure, currentSection, variantBuffer);
                variantBuffer = [];
            }
            currentSection = 'introCTA';
            continue;
        }
        
        if (/^(БЛОК|Блок)\s+\d+/i.test(lineNormalized)) {
            if (variantBuffer.length > 0) {
                pushVariants(structure, currentSection, variantBuffer, currentBlock);
                variantBuffer = [];
            }
            currentBlock = { title: [], text: '', cta: [] };
            structure.blocks.push(currentBlock);
            currentSection = 'blockTitle';
            continue;
        }
        
        // Collect variants (lines starting with numbers or dashes)
        if (/^(\d+[.)\-]|[-•*])\s+/.test(line)) {
            const cleaned = line.replace(/^(\d+[.)\-]|[-•*])\s+/, '').trim();
            variantBuffer.push(cleaned);
        }
    }
    
    // Push remaining variants
    if (variantBuffer.length > 0) {
        pushVariants(structure, currentSection, variantBuffer, currentBlock);
    }
    
    return structure;
}

function pushVariants(structure, section, variants, currentBlock) {
    if (!section) return;
    
    switch (section) {
        case 'subject':
            structure.subject.push(...variants);
            break;
        case 'preheader':
            structure.preheader.push(...variants);
            break;
        case 'bannerTitle':
            structure.bannerTitle.push(...variants);
            break;
        case 'bannerSubtitle':
            structure.bannerSubtitle.push(...variants);
            break;
        case 'intro':
            structure.introText = variants.join(' ');
            break;
        case 'introCTA':
            structure.introCTA.push(...variants);
            break;
        case 'blockTitle':
            if (currentBlock) currentBlock.title.push(...variants);
            break;
        case 'blockCTA':
            if (currentBlock) currentBlock.cta.push(...variants);
            break;
    }
}

/**
 * Main validation function
 * @param {string} output - Generated email content
 * @param {Object} parsedBrief - The parsed brief object (not used directly but available for context)
 * @param {Object} spec - Spec requirements (variant counts, limits, etc.)
 * @returns {Object} { valid: boolean, violations: Violation[] }
 */
function validateEmail(output, parsedBrief, spec) {
    const violations = [];
    
    // Parse the output structure
    const structure = parseEmailOutput(output);
    
    if (!structure) {
        violations.push({
            code: 'PARSE_FAILED',
            severity: Severity.ERROR,
            message: 'Не удалось распарсить структуру email',
            location: 'output',
            evidence: output.substring(0, 100)
        });
        return { valid: false, violations };
    }
    
    // Check variant counts (SPEC_EMAIL_V1 requires 3 variants for most fields)
    const requiredVariants = spec.variantCounts || { subject: 3, preheader: 3, bannerTitle: 3, bannerSubtitle: 3, introCTA: 3 };
    
    if (structure.subject.length < requiredVariants.subject) {
        violations.push({
            code: 'VARIANT_COUNT_INSUFFICIENT',
            severity: Severity.ERROR,
            message: `Недостаточно вариантов темы: ${structure.subject.length} < ${requiredVariants.subject}`,
            location: 'subject',
            evidence: structure.subject.join('; ')
        });
    }
    
    if (structure.preheader.length < requiredVariants.preheader) {
        violations.push({
            code: 'VARIANT_COUNT_INSUFFICIENT',
            severity: Severity.ERROR,
            message: `Недостаточно вариантов прехедера: ${structure.preheader.length} < ${requiredVariants.preheader}`,
            location: 'preheader',
            evidence: structure.preheader.join('; ')
        });
    }
    
    if (structure.bannerTitle.length < requiredVariants.bannerTitle) {
        violations.push({
            code: 'VARIANT_COUNT_INSUFFICIENT',
            severity: Severity.ERROR,
            message: `Недостаточно вариантов заголовка баннера: ${structure.bannerTitle.length} < ${requiredVariants.bannerTitle}`,
            location: 'bannerTitle',
            evidence: structure.bannerTitle.join('; ')
        });
    }
    
    // Check character limits
    for (const subject of structure.subject) {
        violations.push(...checkCharLimit(subject, 30, 'subject'));
        violations.push(...checkEmojis(subject, 'subject'));
        violations.push(...checkForbiddenWords(subject, 'subject'));
        violations.push(...checkBannedCliches(subject, 'subject'));
        violations.push(...checkGeographyLabels(subject, 'subject'));
    }
    
    for (const preheader of structure.preheader) {
        violations.push(...checkCharLimit(preheader, 75, 'preheader'));
        violations.push(...checkEmojis(preheader, 'preheader'));
        violations.push(...checkForbiddenWords(preheader, 'preheader'));
        violations.push(...checkBannedCliches(preheader, 'preheader'));
        violations.push(...checkGeographyLabels(preheader, 'preheader'));
    }
    
    // Check all banner content
    for (const title of structure.bannerTitle) {
        violations.push(...checkEmojis(title, 'bannerTitle'));
        violations.push(...checkForbiddenWords(title, 'bannerTitle'));
        violations.push(...checkBannedCliches(title, 'bannerTitle'));
        violations.push(...checkGeographyLabels(title, 'bannerTitle'));
    }
    
    for (const subtitle of structure.bannerSubtitle) {
        violations.push(...checkEmojis(subtitle, 'bannerSubtitle'));
        violations.push(...checkForbiddenWords(subtitle, 'bannerSubtitle'));
        violations.push(...checkBannedCliches(subtitle, 'bannerSubtitle'));
        violations.push(...checkGeographyLabels(subtitle, 'bannerSubtitle'));
    }
    
    // Check intro and CTAs
    violations.push(...checkForbiddenWords(structure.introText, 'intro'));
    violations.push(...checkBannedCliches(structure.introText, 'intro'));
    violations.push(...checkGeographyLabels(structure.introText, 'intro'));
    
    for (const cta of structure.introCTA) {
        violations.push(...checkForbiddenWords(cta, 'introCTA'));
    }
    
    // Check 3-gram duplication between key parts
    const keyParts = {
        subject: structure.subject.join(' '),
        preheader: structure.preheader.join(' '),
        bannerTitle: structure.bannerTitle.join(' '),
        bannerSubtitle: structure.bannerSubtitle.join(' '),
        intro: structure.introText
    };
    
    const partNames = Object.keys(keyParts);
    for (let i = 0; i < partNames.length; i++) {
        for (let j = i + 1; j < partNames.length; j++) {
            const grams1 = extract3Grams(keyParts[partNames[i]]);
            const grams2 = extract3Grams(keyParts[partNames[j]]);
            
            const intersection = [...grams1].filter(g => grams2.has(g));
            if (intersection.length > 0) {
                violations.push({
                    code: 'TRIGRAM_DUPLICATION',
                    severity: Severity.ERROR,
                    message: `Дублирование 3+ слов между ${partNames[i]} и ${partNames[j]}`,
                    location: `${partNames[i]} <-> ${partNames[j]}`,
                    evidence: intersection.slice(0, 3).join('; '),
                    suggestedFix: 'Переформулируйте один из фрагментов'
                });
            }
        }
    }
    
    // Check exact equality constraints
    for (let i = 0; i < structure.subject.length; i++) {
        for (let j = 0; j < structure.bannerTitle.length; j++) {
            if (structure.subject[i].trim() === structure.bannerTitle[j].trim()) {
                violations.push({
                    code: 'EXACT_EQUALITY',
                    severity: Severity.ERROR,
                    message: 'Тема не должна точно совпадать с заголовком баннера',
                    location: 'subject == bannerTitle',
                    evidence: structure.subject[i]
                });
            }
        }
    }
    
    for (let i = 0; i < structure.preheader.length; i++) {
        for (let j = 0; j < structure.bannerSubtitle.length; j++) {
            if (structure.preheader[i].trim() === structure.bannerSubtitle[j].trim()) {
                violations.push({
                    code: 'EXACT_EQUALITY',
                    severity: Severity.ERROR,
                    message: 'Прехедер не должен точно совпадать с подзаголовком баннера',
                    location: 'preheader == bannerSubtitle',
                    evidence: structure.preheader[i]
                });
            }
        }
    }
    
    // Check block length (max 1-2 paragraphs per block)
    if (structure.blocks && Array.isArray(structure.blocks)) {
        structure.blocks.forEach((block, index) => {
            const blockNum = index + 1;
            const blockText = typeof block === 'string' ? block : 
                (block.description || block.copy || block.text || '');
            
            // Count paragraphs (separated by double newlines or <br> tags)
            const paragraphs = blockText
                .split(/\n\n+|<br\s*\/?>/gi)
                .filter(p => p.trim().length > 0);
            
            if (paragraphs.length > 2) {
                violations.push({
                    code: 'BLOCK_TOO_LONG',
                    severity: Severity.WARNING,
                    message: `В блоке ${blockNum} больше 2 абзацев (найдено: ${paragraphs.length})`,
                    location: `blocks[${index}]`,
                    evidence: blockText.substring(0, 100) + (blockText.length > 100 ? '...' : ''),
                    suggestedFix: 'Сократите до 1-2 абзацев, сохранив только ключевые факты из FACTS/KEY_POINTS'
                });
            }
        });
    }
    
    // Check for service phrases (internal checklists, status messages)
    // Exception: @SWChecks_bot is a legitimate Telegram bot name, not a service phrase
    const servicePatterns = [
        /\[?CHECK/i, /\[?VALID/i, /PREFLIGHT/i, /violation/i,
        /все правила соблюдены/i, /проверка пройдена/i
    ];
    
    for (const pattern of servicePatterns) {
        const match = output.match(pattern);
        if (match) {
            const matchedText = match[0];
            const matchIndex = match.index;
            
            // Exception: Skip if "Check" is part of @SWChecks_bot or SWChecks_bot
            const contextBefore = output.substring(Math.max(0, matchIndex - 10), matchIndex);
            const contextAfter = output.substring(matchIndex, Math.min(output.length, matchIndex + matchedText.length + 10));
            const fullContext = contextBefore + contextAfter;
            
            if (/SWChecks_bot|@SWChecks_bot/i.test(fullContext)) {
                continue; // Skip this match, it's the Telegram bot name
            }
            
            violations.push({
                code: 'SERVICE_PHRASE_DETECTED',
                severity: Severity.ERROR,
                message: 'Обнаружены служебные фразы или чеклисты в выводе',
                location: 'output',
                evidence: matchedText,
                suggestedFix: 'Удалите все служебные фразы, показывайте только контент'
            });
        }
    }
    
    return {
        valid: violations.filter(v => v.severity === Severity.ERROR).length === 0,
        violations,
        structure
    };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.EmailValidator = {
        validateEmail,
        parseEmailOutput,
        Severity
    };
}
