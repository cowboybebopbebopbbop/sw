// knowledgeLoader.js - Loads generation rules and specs into window globals

/**
 * Determine the base path for knowledge files
 * - For local dev (public/index.html): '../knowledge/'
 * - For GitHub Pages (docs/index.html): 'knowledge/'
 */
function getBasePath() {
    // Check if we're in GitHub Pages or local dev by checking the current script src
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
        if (script.src.includes('knowledgeLoader.js')) {
            // If src starts with '../', we're in local dev (public/)
            if (script.getAttribute('src').startsWith('../')) {
                return '../knowledge/';
            }
            // Otherwise we're in GitHub Pages (docs/)
            return 'knowledge/';
        }
    }
    // Default to relative path for local dev
    return '../knowledge/';
}

/**
 * Load all knowledge files needed for generation
 * @returns {Promise<void>}
 */
async function loadKnowledgeFiles() {
    try {
        const basePath = getBasePath();
        console.log(`Using base path: ${basePath}`);
        
        // Load system instructions
        const systemInstructionsResp = await fetch(`${basePath}prompts/system_instructions.txt`);
        if (!systemInstructionsResp.ok) throw new Error(`Failed to fetch system_instructions.txt: ${systemInstructionsResp.status}`);
        window.SYSTEM_INSTRUCTIONS = await systemInstructionsResp.text();
        
        // Load email spec
        const emailSpecResp = await fetch(`${basePath}formats/email/SPEC_EMAIL_V1.md`);
        if (!emailSpecResp.ok) throw new Error(`Failed to fetch SPEC_EMAIL_V1.md: ${emailSpecResp.status}`);
        window.SPEC_EMAIL_V1 = await emailSpecResp.text();
        
        // Load multiformat spec
        const multiformatSpecResp = await fetch(`${basePath}formats/multiformat/SPEC_MULTIFORMAT_V1.md`);
        if (!multiformatSpecResp.ok) throw new Error(`Failed to fetch SPEC_MULTIFORMAT_V1.md: ${multiformatSpecResp.status}`);
        window.SPEC_MULTIFORMAT_V1 = await multiformatSpecResp.text();
        
        // Load lexicon bans
        const lexiconResp = await fetch(`${basePath}rules/SW_LEXICON_AND_BANS.md`);
        if (!lexiconResp.ok) throw new Error(`Failed to fetch SW_LEXICON_AND_BANS.md: ${lexiconResp.status}`);
        window.SW_LEXICON_AND_BANS = await lexiconResp.text();
        
        // Load global rules
        const globalRulesResp = await fetch(`${basePath}rules/SW_GLOBAL_RULES_v1.md`);
        if (!globalRulesResp.ok) throw new Error(`Failed to fetch SW_GLOBAL_RULES_v1.md: ${globalRulesResp.status}`);
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
