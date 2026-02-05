// surgicalRepair.js - Surgical repair for field-specific regeneration
// Implements targeted fixes for violations without full email regeneration

/**
 * Determine the repair scope based on violation type
 * @param {Object} violation - The violation object with code, location, etc.
 * @returns {Object} { field: string, requiresFullContext: boolean }
 */
function determineRepairScope(violation) {
    // Cross-field violations require full regeneration
    const fullContextCodes = [
        'EXACT_EQUALITY',        // Subject === Banner title (needs both fields)
        'TRIGRAM_DUPLICATION',   // Trigrams repeated across fields
        'CROSS_FIELD_SIMILARITY' // Generic similarity check
    ];
    
    if (fullContextCodes.includes(violation.code)) {
        return {
            field: 'all',
            requiresFullContext: true
        };
    }
    
    // Most violations are field-specific
    // Use violation.location to determine which field needs repair
    const validLocations = ['subject', 'preheader', 'bannerTitle', 'bannerSubtitle', 'body', 'cta'];
    
    if (validLocations.includes(violation.location)) {
        return {
            field: violation.location,
            requiresFullContext: false
        };
    }
    
    // Fallback: if location is unclear, regenerate all
    return {
        field: 'all',
        requiresFullContext: true
    };
}

/**
 * Extract a specific field from email output
 * @param {string} output - Full email output text
 * @param {string} fieldName - Field to extract (subject, preheader, bannerTitle, etc.)
 * @returns {string|null} Extracted field content, or null if not found
 */
function extractField(output, fieldName) {
    // Define section headers for different fields
    const sectionPatterns = {
        subject: /ТЕМА\s*[—\-—]\s*\d+\s*вариант[аов]?/i,
        preheader: /ПРЕХЕДЕР\s*[—\-—]\s*\d+\s*вариант[аов]?/i,
        bannerTitle: /(ЗАГОЛОВОК|Title|ЗАГОЛОВОК БАННЕРА)\s*[—\-—]/i,
        bannerSubtitle: /(ПОДЗАГОЛОВОК|Subtitle|ПОДЗАГОЛОВОК БАННЕРА)\s*[—\-—]/i,
        body: /ТЕЛО\s*ПИСЬМА/i,
        cta: /CTA/i
    };
    
    const pattern = sectionPatterns[fieldName];
    if (!pattern) {
        return null;
    }
    
    const lines = output.split('\n');
    let inSection = false;
    let extractedLines = [];
    let sectionStartLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if we're starting the target section
        if (!inSection && pattern.test(line)) {
            inSection = true;
            sectionStartLine = i;
            extractedLines.push(line); // Include section header
            continue;
        }
        
        // If in section, collect lines until we hit another section header
        if (inSection) {
            // Check if we've hit another major section
            const isNewSection = /^(ТЕМА|ПРЕХЕДЕР|ЗАГОЛОВОК|ПОДЗАГОЛОВОК|ТЕЛО|CTA)\s*[—\-—]/i.test(line);
            
            if (isNewSection) {
                // We've hit the next section, stop extracting
                break;
            }
            
            // Add line to extraction (including empty lines for formatting)
            extractedLines.push(line);
        }
    }
    
    if (extractedLines.length === 0) {
        return null; // Field not found
    }
    
    return extractedLines.join('\n').trim();
}

/**
 * Replace a specific field in email output with new content
 * @param {string} output - Full email output text
 * @param {string} fieldName - Field to replace (subject, preheader, etc.)
 * @param {string} newContent - New content for the field (including section header)
 * @returns {string} Modified output with replaced field
 */
function replaceField(output, fieldName, newContent) {
    // Define section patterns
    const sectionPatterns = {
        subject: /ТЕМА\s*[—\-—]\s*\d+\s*вариант[аов]?/i,
        preheader: /ПРЕХЕДЕР\s*[—\-—]\s*\d+\s*вариант[аов]?/i,
        bannerTitle: /(ЗАГОЛОВОК|Title|ЗАГОЛОВОК БАННЕРА)\s*[—\-—]/i,
        bannerSubtitle: /(ПОДЗАГОЛОВОК|Subtitle|ПОДЗАГОЛОВОК БАННЕРА)\s*[—\-—]/i,
        body: /ТЕЛО\s*ПИСЬМА/i,
        cta: /CTA/i
    };
    
    const pattern = sectionPatterns[fieldName];
    if (!pattern) {
        return output; // Unknown field, return unchanged
    }
    
    const lines = output.split('\n');
    let inSection = false;
    let sectionStart = -1;
    let sectionEnd = -1;
    
    // Find section boundaries
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!inSection && pattern.test(line)) {
            inSection = true;
            sectionStart = i;
            continue;
        }
        
        if (inSection) {
            // Check if we've hit another section
            const isNewSection = /^(ТЕМА|ПРЕХЕДЕР|ЗАГОЛОВОК|ПОДЗАГОЛОВОК|ТЕЛО|CTA)\s*[—\-—]/i.test(line);
            
            if (isNewSection) {
                sectionEnd = i;
                break;
            }
        }
    }
    
    // If section not found, return unchanged
    if (sectionStart === -1) {
        return output;
    }
    
    // If no end found, section goes to end of document
    if (sectionEnd === -1) {
        sectionEnd = lines.length;
    }
    
    // Replace the section
    const beforeSection = lines.slice(0, sectionStart);
    const afterSection = lines.slice(sectionEnd);
    
    // Combine: before + newContent + after
    const newLines = [
        ...beforeSection,
        newContent,
        '', // Add blank line for separation
        ...afterSection
    ];
    
    return newLines.join('\n');
}

/**
 * Perform surgical repair on a specific field
 * @param {Object} violation - The violation to fix
 * @param {string} currentOutput - Current full email output
 * @param {string} parsedBrief - The original brief
 * @param {Object} knowledge - Knowledge base rules
 * @param {Function} callLLM - Function to call LLM
 * @returns {Promise<string>} Repaired output with only the specific field regenerated
 */
async function surgicalRepair(violation, currentOutput, parsedBrief, knowledge, callLLM) {
    const scope = determineRepairScope(violation);
    
    // If full context required, caller should do full regeneration
    if (scope.requiresFullContext) {
        return null; // Signal that surgical repair is not applicable
    }
    
    // Extract current field content
    const currentFieldContent = extractField(currentOutput, scope.field);
    
    if (!currentFieldContent) {
        return null; // Field not found, fallback to full regeneration
    }
    
    // Build surgical repair prompt
    const repairPrompt = buildSurgicalRepairPrompt(
        scope.field,
        currentFieldContent,
        violation,
        parsedBrief
    );
    
    // Call LLM with targeted prompt
    const repairedField = await callLLM(
        [{ role: 'user', content: repairPrompt }],
        { temperature: 0.4, max_tokens: 500 }
    );
    
    // Replace field in output
    const repairedOutput = replaceField(currentOutput, scope.field, repairedField);
    
    return repairedOutput;
}

/**
 * Build a surgical repair prompt for a specific field
 * @param {string} fieldName - Field to repair
 * @param {string} currentContent - Current field content
 * @param {Object} violation - The violation to fix
 * @param {string} parsedBrief - Original brief for context
 * @returns {string} LLM prompt for surgical repair
 */
function buildSurgicalRepairPrompt(fieldName, currentContent, violation, parsedBrief) {
    const fieldLabels = {
        subject: 'темы письма',
        preheader: 'прехедера',
        bannerTitle: 'заголовка баннера',
        bannerSubtitle: 'подзаголовка баннера',
        body: 'тела письма',
        cta: 'CTA'
    };
    
    const label = fieldLabels[fieldName] || fieldName;
    
    return `Ты — email-маркетолог. Нужно исправить ${label}.

**ТЕКУЩИЙ ВАРИАНТ:**
${currentContent}

**ПРОБЛЕМА:**
${violation.message}

**КОНТЕКСТ ИЗ БРИФА:**
${parsedBrief.substring(0, 500)}...

**ЗАДАЧА:**
Перепиши ТОЛЬКО варианты ${label}, исправив проблему.
Сохрани тот же стиль и креативное направление, но:
${violation.suggestedFix || 'Устрани указанную проблему'}

**ФОРМАТ ВЫВОДА:**
Выведи только секцию ${label} с исправленными вариантами в том же формате.`;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        determineRepairScope,
        extractField,
        replaceField,
        surgicalRepair,
        buildSurgicalRepairPrompt
    };
}
