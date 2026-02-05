// promptComposer.js - Composes prompts for email generation

/**
 * Load the generation specs and rules
 * @returns {Object} Object containing all rules and specs
 */
function loadGenerationRules() {
    // These will be loaded from the files
    return {
        systemInstructions: window.SYSTEM_INSTRUCTIONS || '',
        emailSpec: window.SPEC_EMAIL_V1 || '',
        lexiconBans: window.SW_LEXICON_AND_BANS || '',
        globalRules: window.SW_GLOBAL_RULES || ''
    };
}

/**
 * Extract spec requirements from parsed brief
 * @param {string} parsedBrief - The parsed brief text
 * @returns {Object} Extracted requirements (variant counts, limits, campaign type)
 */
function extractSpecRequirements(parsedBrief) {
    const requirements = {
        campaignType: 'email',
        variantCounts: {
            subject: 3,
            preheader: 3,
            bannerTitle: 3,
            bannerSubtitle: 3,
            introCTA: 3
        },
        limits: {
            subject: 30,
            preheader: 75
        },
        blocks: []
    };
    
    // Extract campaign type from [CAMPAIGN type=...]
    const campaignMatch = parsedBrief.match(/\[CAMPAIGN\s+type=(\w+)/i);
    if (campaignMatch) {
        requirements.campaignType = campaignMatch[1];
    }
    
    // Extract variant requirements from [VAR ...]
    const varMatches = [...parsedBrief.matchAll(/\[VAR\s+([^=]+)=(\d+)([^\]]*)\]/gi)];
    for (const match of varMatches) {
        const fields = match[1].split(/\s+/);
        const count = parseInt(match[2], 10);
        for (const field of fields) {
            const normalized = field.trim().toLowerCase();
            if (normalized === 'subject' || normalized === 'тема') {
                requirements.variantCounts.subject = count;
            } else if (normalized === 'preheader' || normalized === 'прехедер') {
                requirements.variantCounts.preheader = count;
            } else if (normalized === 'title' || normalized === 'заголовок') {
                requirements.variantCounts.bannerTitle = count;
            } else if (normalized === 'subtitle' || normalized === 'подзаголовок') {
                requirements.variantCounts.bannerSubtitle = count;
            } else if (normalized === 'cta' || normalized === 'кнопка') {
                requirements.variantCounts.introCTA = count;
            }
        }
    }
    
    // Extract limit requirements from [LIMIT ...]
    const limitMatches = [...parsedBrief.matchAll(/\[LIMIT\s+([^<]+)<=(\d+)([^\]]*)\]/gi)];
    for (const match of limitMatches) {
        const field = match[1].trim().toLowerCase();
        const limit = parseInt(match[2], 10);
        if (field === 'subject' || field === 'тема') {
            requirements.limits.subject = limit;
        } else if (field === 'preheader' || field === 'прехедер') {
            requirements.limits.preheader = limit;
        }
    }
    
    // Extract blocks
    const blockMatches = [...parsedBrief.matchAll(/\[BLOCK\s+id=([^\s\]]+)[^\]]*\]/gi)];
    for (const match of blockMatches) {
        requirements.blocks.push(match[1]);
    }
    
    return requirements;
}

/**
 * Compose the initial generation prompt
 * @param {string} parsedBrief - The parsed brief markdown
 * @param {Object} rules - The generation rules
 * @param {Object} requirements - Extracted spec requirements
 * @returns {Object} { systemPrompt: string, userPrompt: string }
 */
function composeGenerationPrompt(parsedBrief, rules, requirements) {
    const systemPrompt = `${rules.systemInstructions}

===== KNOWLEDGE: SW_LEXICON_AND_BANS_V1 =====
${rules.lexiconBans}

===== KNOWLEDGE: SW_GLOBAL_RULES_V1 =====
${rules.globalRules}

===== KNOWLEDGE: SPEC_EMAIL_V1 =====
${rules.emailSpec}

===== END KNOWLEDGE =====

You are generating an email for SimpleWine. Follow ALL rules strictly, with SW_LEXICON_AND_BANS_V1 having absolute priority.

CRITICAL CONSTRAINTS:
1. NO emojis anywhere
2. "дегустация" FORBIDDEN except ONLY in exact phrase "мероприятие с дегустацией вин"
3. "купить" FORBIDDEN except with "в винотеке"; "покупка/покупать" FORBIDDEN except with "в винотеке"
4. "букет" FORBIDDEN (use "профиль" or specific aromas/flavors)
5. "послевкусие" FORBIDDEN (use "финиш")
6. NO banned clichés from lexicon
7. Geography: regions/countries must have "вина" or wine-adjective nearby, NOT as standalone labels
8. Subject ≤ ${requirements.limits.subject} chars; Preheader ≤ ${requirements.limits.preheader} chars
9. Output EXACTLY ${requirements.variantCounts.subject} subject variants, ${requirements.variantCounts.preheader} preheader variants, etc.
10. NO 3+ word duplication between Subject/Preheader/Banner/Intro
11. Subject ≠ Banner Title; Preheader ≠ Banner Subtitle (no exact equality)
12. NO service phrases, checklists, or status messages in output

OUTPUT ONLY the final email content in SPEC_EMAIL_V1 format. Nothing else.`;

    const userPrompt = `Generate a compliant SimpleWine email based on this parsed brief:

${parsedBrief}

Requirements:
- Campaign type: ${requirements.campaignType}
- Subject variants: ${requirements.variantCounts.subject} (≤ ${requirements.limits.subject} chars each)
- Preheader variants: ${requirements.variantCounts.preheader} (≤ ${requirements.limits.preheader} chars each)
- Banner title variants: ${requirements.variantCounts.bannerTitle}
- Banner subtitle variants: ${requirements.variantCounts.bannerSubtitle}
- CTA variants: ${requirements.variantCounts.introCTA}

CRITICAL: CHARACTER LIMITS ARE ABSOLUTE
- Subject: Each variant MUST be ≤ ${requirements.limits.subject} characters (count ALL characters: letters, spaces, punctuation, em-dashes)
- Preheader: Each variant MUST be ≤ ${requirements.limits.preheader} characters
- Aim for 5-10 chars BELOW the limit to ensure safety margin
- If a variant is too long, REWRITE IT SHORTER before including it in output
- Remove filler words, conjunctions, unnecessary details to fit limits
- Examples: "в разделе событий" → "в афише" (saves 9 chars), "приватные залы" → "залы" (saves 10 chars)

Follow SPEC_EMAIL_V1 OUTPUT_CONTRACT exactly. Generate all required variants. Apply all lexicon bans and rules.

CRITICAL FORMAT REQUIREMENTS:
- Use EXACT section headers from OUTPUT_CONTRACT without any numbering prefixes (1), 2), etc.)
- Section headers MUST match exactly: "ТЕМА — 3 варианта", "ПРЕХЕДЕР — 3 варианта", "ГЛАВНЫЙ БАННЕР:", etc.
- Do NOT add decorative numbering like "1) ТЕМА" or "2) ПРЕХЕДЕР" - use plain headers only
- Use em-dash (—) in variant headers, not hyphen (-) or colon (:)
- Each variant should be on its own line, numbered 1., 2., 3. (NOT in headers, only in variant lists)
- Example correct format:

ТЕМА — 3 варианта
1. Первый вариант
2. Второй вариант
3. Третий вариант

ПРЕХЕДЕР — 3 варианта
1. Первый вариант
2. Второй вариант
3. Третий вариант

ГЛАВНЫЙ БАННЕР:
Заголовок — 3 варианта
1. Первый вариант
2. Второй вариант
3. Третий вариант

Подзаголовок — 3 варианта
1. Первый вариант
2. Второй вариант
3. Третий вариант

КРИТИЧНО (не нарушать):
1) Лексика: не используй слово «напитки» и любые формы («напиток», «напитками», «напитков» и т.д.). Если во входном материале оно встречается — перепиши. Замены по смыслу: «алкоголь», «крепкое/крепкий алкоголь», «категория», «ассортимент», «позиции», «подборка».
2) Объём: текст КАЖДОГО блока (1–5) — максимум 1–2 абзаца. COPY_BASE используй только как источник, сжимай до сути: оставь факты/выгоды/цифры из FACTS/KEY_POINTS, убери длинные цитаты и "статьевость".

Сгенерируй письмо строго по SPEC_EMAIL_V1.
Выводи только итоговый контент письма.`;

    return { systemPrompt, userPrompt };
}

/**
 * Compose a repair prompt after validation failures
 * @param {string} parsedBrief - The original parsed brief
 * @param {Object} rules - The generation rules
 * @param {Object} requirements - Extracted spec requirements
 * @param {string} lastDraft - The previous generation attempt
 * @param {Array} violations - Array of violation objects from validator
 * @returns {Object} { systemPrompt: string, userPrompt: string }
 */
function composeRepairPrompt(parsedBrief, rules, requirements, lastDraft, violations) {
    // Group violations by location
    const violationsByLocation = {};
    for (const v of violations) {
        if (!violationsByLocation[v.location]) {
            violationsByLocation[v.location] = [];
        }
        violationsByLocation[v.location].push(v);
    }
    
    const violationSummary = Object.entries(violationsByLocation)
        .map(([loc, viols]) => {
            const items = viols.map(v => `  - [${v.code}] ${v.message}${v.evidence ? ` | Evidence: "${v.evidence}"` : ''}${v.suggestedFix ? ` | Fix: ${v.suggestedFix}` : ''}`).join('\n');
            return `${loc}:\n${items}`;
        })
        .join('\n\n');
    
    const systemPrompt = `${rules.systemInstructions}

===== KNOWLEDGE: SW_LEXICON_AND_BANS_V1 =====
${rules.lexiconBans}

===== KNOWLEDGE: SW_GLOBAL_RULES_V1 =====
${rules.globalRules}

===== KNOWLEDGE: SPEC_EMAIL_V1 =====
${rules.emailSpec}

===== END KNOWLEDGE =====

You are REPAIRING a SimpleWine email that had validation violations. Follow ALL rules strictly.

CRITICAL: This is a REPAIR operation. The previous draft violated rules. Fix ONLY what violates. Preserve the meaning and structure where valid.`;

    const userPrompt = `REPAIR TASK

Original Brief:
${parsedBrief}

Previous Draft (with violations):
${lastDraft}

VIOLATIONS TO FIX:
${violationSummary}

Правки вносить МИНИМАЛЬНО, не переписывая всё письмо и не меняя структуру, если это не требуется нарушениями.

Обязательные ограничения:
1) Запрещено слово «напитки» и любые формы («напиток», «напитками», «напитков» и т.д.). Если встречается — замени по смыслу на «алкоголь», «крепкое/крепкий алкоголь», «категория», «ассортимент», «позиции», «подборка».
2) Если какой-либо блок (1–5) длиннее 2 абзацев — сократи его до 1–2 абзацев, сохранив только факты/выгоды из brief (FACTS/KEY_POINTS). Длинные цитаты и "мини-статья" должны быть удалены.

Instructions:
1. Fix ALL violations listed above
2. Preserve valid content and meaning
3. Maintain all required variant counts: Subject=${requirements.variantCounts.subject}, Preheader=${requirements.variantCounts.preheader}, Banner Title=${requirements.variantCounts.bannerTitle}, etc.
4. Keep Subject ≤ ${requirements.limits.subject} chars, Preheader ≤ ${requirements.limits.preheader} chars
5. Ensure NO 3+ word duplication between parts
6. Apply all lexicon bans strictly
7. Output ONLY the corrected email in SPEC_EMAIL_V1 format, nothing else

ИСПРАВЬ перечисленные нарушения, сохранив остальной текст без изменений.
Выводи только итоговый контент письма.

CRITICAL: CHARACTER LIMIT VIOLATIONS
If CHAR_LIMIT_EXCEEDED appears above, you MUST shorten the text aggressively:
- For Subject/Preheader: Remove filler words, conjunctions, unnecessary adjectives
- Aim for 5-10 chars BELOW the limit (not exactly at limit)
- Prioritize core message, cut decorative phrases
- Examples of what to remove: "в разделе событий" → "в афише", "приватные залы и вечера" → "залы и вечера"
- Count every character including spaces, punctuation, em-dashes

CRITICAL FORMAT REQUIREMENTS:
- Use EXACT section headers from OUTPUT_CONTRACT without any numbering prefixes (1), 2), etc.)
- Section headers MUST match exactly: "ТЕМА — 3 варианта", "ПРЕХЕДЕР — 3 варианта", "ГЛАВНЫЙ БАННЕР:", etc.
- Do NOT add decorative numbering like "1) ТЕМА" or "2) ПРЕХЕДЕР" - use plain headers only
- Use em-dash (—) in variant headers: "ТЕМА — 3 варианта", NOT "ТЕМА - 3 варианта" or "ТЕМА: 3 варианта"
- Banner subsections: "Заголовок — 3 варианта" and "Подзаголовок — 3 варианта" (nested under ГЛАВНЫЙ БАННЕР:)
- Each variant should be on its own line, numbered 1., 2., 3. (NOT in headers, only in variant lists)`;

    return { systemPrompt, userPrompt };
}

/**
 * Compose an error analysis prompt for LLM to explain violations
 * @param {string} parsedBrief - The original parsed brief
 * @param {Object} rules - The generation rules
 * @param {Object} requirements - Extracted spec requirements
 * @param {string} generatedOutput - The generated email with violations
 * @param {Array} violations - Array of violation objects from validator
 * @returns {Object} { systemPrompt: string, userPrompt: string }
 */
function composeErrorAnalysisPrompt(parsedBrief, rules, requirements, generatedOutput, violations) {
    const systemPrompt = `You are an expert analyzer of email generation systems for SimpleWine. Your role is to explain why validation errors occurred during email generation.

You have access to:
1. The generation rules and constraints
2. The parsed brief (input)
3. The generated output (with violations)
4. The validation violations detected

Your task: Provide a clear, detailed explanation of WHY each violation occurred, what in the generation logic or output caused it, and specific recommendations to fix it.

===== KNOWLEDGE: Generation Rules =====
${rules.systemInstructions}

===== KNOWLEDGE: SW_LEXICON_AND_BANS_V1 =====
${rules.lexiconBans}

===== KNOWLEDGE: SW_GLOBAL_RULES_V1 =====
${rules.globalRules}

===== KNOWLEDGE: SPEC_EMAIL_V1 =====
${rules.emailSpec}

===== END KNOWLEDGE =====`;

    const violationSummary = violations.map((v, idx) => {
        return `${idx + 1}. [${v.code}] ${v.message}
   Location: ${v.location}
   ${v.evidence ? `Evidence: "${v.evidence}"` : ''}
   ${v.suggestedFix ? `Suggested Fix: ${v.suggestedFix}` : ''}`;
    }).join('\n\n');

    const userPrompt = `TASK: Analyze and explain the following validation errors that occurred during email generation.

===== PARSED BRIEF (Input) =====
${parsedBrief}

===== GENERATED EMAIL OUTPUT =====
${generatedOutput}

===== VALIDATION ERRORS (${violations.length}) =====
${violationSummary}

===== REQUIREMENTS FROM BRIEF =====
- Campaign Type: ${requirements.campaignType}
- Required Subject Variants: ${requirements.variantCounts.subject}
- Required Preheader Variants: ${requirements.variantCounts.preheader}
- Required Banner Title Variants: ${requirements.variantCounts.bannerTitle}
- Subject Char Limit: ≤ ${requirements.limits.subject}
- Preheader Char Limit: ≤ ${requirements.limits.preheader}

===== YOUR ANALYSIS TASK =====

For EACH violation listed above, provide:

1. **Root Cause**: Why did this specific violation occur? What in the generated output triggered it?

2. **Generation Logic Analysis**: Which part of the generation rules or constraints was not followed? Was it:
   - A parsing issue (output structure not recognized due to wrong section headers or numbered prefixes like "1) ТЕМА" instead of "ТЕМА")?
   - A generation issue (LLM didn't produce required variants)?
   - A formatting issue (wrong section headers, missing variants)?
   - A content issue (forbidden words, wrong patterns)?

3. **Evidence from Output**: Point to the specific part of the generated email that caused the violation.

4. **Fix Recommendation**: What specific change would resolve this violation?

5. **Prevention**: How to avoid this in future generations?

Format your response clearly with headers for each violation. Be specific and reference exact text from the generated output.

Start with a brief overall summary, then analyze each violation in detail.`;

    return { systemPrompt, userPrompt };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PromptComposer = {
        loadGenerationRules,
        extractSpecRequirements,
        composeGenerationPrompt,
        composeRepairPrompt,
        composeErrorAnalysisPrompt
    };
}
