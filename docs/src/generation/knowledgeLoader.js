// knowledgeLoader.js - Loads generation rules and specs into window globals

/**
 * Load all knowledge files needed for generation
 * @returns {Promise<void>}
 */
async function loadKnowledgeFiles() {
    try {
        // Load system instructions (paths relative to index.html in docs root)
        const systemInstructionsResp = await fetch('knowledge/prompts/system_instructions.txt');
        if (!systemInstructionsResp.ok) throw new Error(`Failed to fetch system_instructions.txt: ${systemInstructionsResp.status}`);
        window.SYSTEM_INSTRUCTIONS = await systemInstructionsResp.text();
        
        // Load email spec
        const emailSpecResp = await fetch('knowledge/formats/email/SPEC_EMAIL_V1.md');
        if (!emailSpecResp.ok) throw new Error(`Failed to fetch SPEC_EMAIL_V1.md: ${emailSpecResp.status}`);
        window.SPEC_EMAIL_V1 = await emailSpecResp.text();
        
        // Load multiformat spec
        const multiformatSpecResp = await fetch('knowledge/formats/multiformat/SPEC_MULTIFORMAT_V1.md');
        if (!multiformatSpecResp.ok) throw new Error(`Failed to fetch SPEC_MULTIFORMAT_V1.md: ${multiformatSpecResp.status}`);
        window.SPEC_MULTIFORMAT_V1 = await multiformatSpecResp.text();
        
        // Load lexicon bans
        const lexiconResp = await fetch('knowledge/rules/SW_LEXICON_AND_BANS.md');
        if (!lexiconResp.ok) throw new Error(`Failed to fetch SW_LEXICON_AND_BANS.md: ${lexiconResp.status}`);
        window.SW_LEXICON_AND_BANS = await lexiconResp.text();
        
        // Load global rules
        const globalRulesResp = await fetch('knowledge/rules/SW_GLOBAL_RULES.md');
        if (!globalRulesResp.ok) throw new Error(`Failed to fetch SW_GLOBAL_RULES.md: ${globalRulesResp.status}`);
        window.SW_GLOBAL_RULES = await globalRulesResp.text();
        
        console.log('✓ Knowledge files loaded successfully');
        return true;
    } catch (error) {
        console.error('Failed to load knowledge files:', error);
        throw new Error(`Knowledge loading failed: ${error.message}`);
    }
}

// Auto-load on script load
if (typeof window !== 'undefined') {
    window.KnowledgeLoader = {
        loadKnowledgeFiles
    };
}
