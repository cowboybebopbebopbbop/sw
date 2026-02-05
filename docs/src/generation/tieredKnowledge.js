// tieredKnowledge.js - Context-aware rule loading for efficient token usage
// Loads only relevant rules based on violation types instead of full knowledge base

/**
 * Violation code to knowledge mapping
 * Maps each violation type to the minimal rule set needed
 */
const VIOLATION_TO_KNOWLEDGE_MAP = {
    // Character limit violations - need only length rules
    'CHAR_LIMIT_EXCEEDED': ['SPEC_CHAR_LIMITS'],
    
    // Forbidden word violations - need lexicon and bans
    'FORBIDDEN_WORD': ['SW_LEXICON_AND_BANS'],
    'EMOJI_USAGE': ['SW_LEXICON_AND_BANS'],
    
    // Geography violations - need location rules
    'GEOGRAPHY_LABEL_MISUSE': ['SW_GLOBAL_RULES_GEOGRAPHY'],
    'LOCATION_MISMATCH': ['SW_GLOBAL_RULES_GEOGRAPHY'],
    
    // Duplication violations - need minimal context (don't need full rules)
    'TRIGRAM_DUPLICATION': ['SPEC_CHAR_LIMITS'], // Just need to know variant count requirements
    'EXACT_EQUALITY': ['SPEC_CHAR_LIMITS'],
    
    // Variant count violations - need spec requirements
    'VARIANT_COUNT_INSUFFICIENT': ['SPEC_CHAR_LIMITS'],
    
    // CTA violations - need CTA patterns
    'CTA_MISSING': ['SW_GLOBAL_RULES_CTA'],
    'CTA_INVALID': ['SW_GLOBAL_RULES_CTA']
};

/**
 * Estimated token counts for each knowledge section
 * Based on typical file sizes
 */
const KNOWLEDGE_TOKEN_ESTIMATES = {
    'SPEC_CHAR_LIMITS': 150,
    'SW_LEXICON_AND_BANS': 2500,
    'SW_GLOBAL_RULES_GEOGRAPHY': 400,
    'SW_GLOBAL_RULES_CTA': 300,
    'FULL_KNOWLEDGE': 6300
};

/**
 * Select relevant knowledge based on violations
 * @param {Array} violations - Array of violation objects
 * @param {Object} knowledgeBase - Full knowledge base object with all rules
 * @returns {string} Combined relevant knowledge sections
 */
function selectRelevantKnowledge(violations, knowledgeBase) {
    if (!violations || violations.length === 0) {
        // No violations, return full knowledge (shouldn't happen in repair)
        return knowledgeBase['FULL_KNOWLEDGE'] || '';
    }
    
    // Collect unique knowledge sections needed
    const neededSections = new Set();
    let hasUnknownViolation = false;
    
    for (const violation of violations) {
        const knowledgeSections = VIOLATION_TO_KNOWLEDGE_MAP[violation.code];
        
        if (knowledgeSections) {
            knowledgeSections.forEach(section => neededSections.add(section));
        } else {
            // Unknown violation type - need full knowledge as fallback
            hasUnknownViolation = true;
        }
    }
    
    // If any unknown violation, return full knowledge
    if (hasUnknownViolation) {
        return knowledgeBase['FULL_KNOWLEDGE'] || '';
    }
    
    // If no known sections, fallback to full knowledge
    if (neededSections.size === 0) {
        return knowledgeBase['FULL_KNOWLEDGE'] || '';
    }
    
    // Combine needed sections
    const combinedKnowledge = [];
    
    for (const section of neededSections) {
        if (knowledgeBase[section]) {
            combinedKnowledge.push(knowledgeBase[section]);
        }
    }
    
    return combinedKnowledge.join('\n\n---\n\n');
}

/**
 * Estimate token count for violations (for testing and monitoring)
 * @param {Array} violations - Array of violation objects
 * @returns {number} Estimated token count
 */
function estimateTokenCount(violations) {
    if (!violations || violations.length === 0) {
        return KNOWLEDGE_TOKEN_ESTIMATES['FULL_KNOWLEDGE'];
    }
    
    const neededSections = new Set();
    let hasUnknownViolation = false;
    
    for (const violation of violations) {
        const knowledgeSections = VIOLATION_TO_KNOWLEDGE_MAP[violation.code];
        
        if (knowledgeSections) {
            knowledgeSections.forEach(section => neededSections.add(section));
        } else {
            hasUnknownViolation = true;
        }
    }
    
    if (hasUnknownViolation || neededSections.size === 0) {
        return KNOWLEDGE_TOKEN_ESTIMATES['FULL_KNOWLEDGE'];
    }
    
    // Sum token counts for needed sections
    let totalTokens = 0;
    for (const section of neededSections) {
        totalTokens += KNOWLEDGE_TOKEN_ESTIMATES[section] || 0;
    }
    
    return totalTokens;
}

/**
 * Calculate token savings vs full knowledge
 * @param {Array} violations - Array of violation objects
 * @returns {Object} { optimized: number, full: number, savedTokens: number, savedPercent: number }
 */
function calculateTokenSavings(violations) {
    const optimized = estimateTokenCount(violations);
    const full = KNOWLEDGE_TOKEN_ESTIMATES['FULL_KNOWLEDGE'];
    const savedTokens = full - optimized;
    const savedPercent = (savedTokens / full) * 100;
    
    return {
        optimized,
        full,
        savedTokens,
        savedPercent: Math.round(savedPercent * 10) / 10
    };
}

/**
 * Get knowledge sections for a violation (for debugging)
 * @param {string} violationCode - Violation code
 * @returns {Array} Array of knowledge section names
 */
function getKnowledgeSectionsForViolation(violationCode) {
    return VIOLATION_TO_KNOWLEDGE_MAP[violationCode] || ['FULL_KNOWLEDGE'];
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        selectRelevantKnowledge,
        estimateTokenCount,
        calculateTokenSavings,
        getKnowledgeSectionsForViolation,
        VIOLATION_TO_KNOWLEDGE_MAP,
        KNOWLEDGE_TOKEN_ESTIMATES
    };
}
