// generateEmail.js - Main orchestrator for email generation with validation & repair loop

// Default max attempts (can be overridden by settings)
const DEFAULT_MAX_REPAIR_ATTEMPTS = 3;

/**
 * Call OpenRouter API with given messages
 * @param {Array} messages - Array of {role, content} message objects
 * @param {Object} settings - API settings (apiKey, model, maxTokens)
 * @returns {Promise<string>} Generated content
 */
async function callLLM(messages, settings) {
    const maxTokens = settings.maxTokens || 16000;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Brief Parser - Email Generator'
        },
        body: JSON.stringify({
            model: settings.model,
            messages: messages,
            temperature: 0.2, // Low temperature for consistency
            max_tokens: maxTokens
        })
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response from API');
    }
    
    return data.choices[0].message.content;
}

/**
 * Main generation orchestrator
 * Generates email with validation and repair loop
 * @param {string} parsedBrief - The parsed brief markdown text
 * @param {Object} settings - API settings
 * @param {Function} onProgress - Progress callback (message, attempt, violations)
 * @returns {Promise<Object>} { success: boolean, content: string, violations: Array, attempts: number }
 */
async function generateEmail(parsedBrief, settings, onProgress = null) {
    if (!parsedBrief) {
        throw new Error('No parsed brief provided');
    }
    
    if (!settings.apiKey) {
        throw new Error('No API key configured');
    }
    
    // Load rules and extract requirements
    const rules = window.PromptComposer.loadGenerationRules();
    const requirements = window.PromptComposer.extractSpecRequirements(parsedBrief);
    
    // Determine max attempts based on settings
    const MAX_REPAIR_ATTEMPTS = settings.enableRepairLoop ? DEFAULT_MAX_REPAIR_ATTEMPTS : 1;
    
    let lastDraft = null;
    let lastValidation = null;
    const attemptHistory = [];
    
    // Attempt 1: Initial generation
    try {
        if (onProgress) {
            onProgress('Generating initial email draft...', 1, null);
        }
        
        const { systemPrompt, userPrompt } = window.PromptComposer.composeGenerationPrompt(
            parsedBrief,
            rules,
            requirements
        );
        
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];
        
        lastDraft = await callLLM(messages, settings);
        
        // Validate
        if (onProgress) {
            onProgress('Validating generated content...', 1, null);
        }
        
        lastValidation = window.EmailValidator.validateEmail(lastDraft, parsedBrief, requirements);
        
        attemptHistory.push({
            attempt: 1,
            draft: lastDraft,
            validation: lastValidation
        });
        
        if (lastValidation.valid) {
            if (onProgress) {
                onProgress('✓ Email generated successfully', 1, []);
            }
            return {
                success: true,
                content: lastDraft,
                violations: [],
                attempts: 1,
                structure: lastValidation.structure
            };
        }
        
        // Has violations, proceed to repair loop
        if (onProgress) {
            onProgress(
                `Found ${lastValidation.violations.length} violations, attempting repair...`,
                1,
                lastValidation.violations
            );
        }
        
    } catch (error) {
        throw new Error(`Initial generation failed: ${error.message}`);
    }
    
    // Repair loop: Attempts 2 to MAX_REPAIR_ATTEMPTS
    for (let attempt = 2; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
        try {
            if (onProgress) {
                onProgress(
                    `Repair attempt ${attempt - 1}/${MAX_REPAIR_ATTEMPTS - 1}...`,
                    attempt,
                    lastValidation.violations
                );
            }
            
            const { systemPrompt, userPrompt } = window.PromptComposer.composeRepairPrompt(
                parsedBrief,
                rules,
                requirements,
                lastDraft,
                lastValidation.violations
            );
            
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];
            
            lastDraft = await callLLM(messages, settings);
            
            // Validate the repair
            if (onProgress) {
                onProgress(`Validating repair attempt ${attempt - 1}...`, attempt, null);
            }
            
            lastValidation = window.EmailValidator.validateEmail(lastDraft, parsedBrief, requirements);
            
            attemptHistory.push({
                attempt,
                draft: lastDraft,
                validation: lastValidation
            });
            
            if (lastValidation.valid) {
                if (onProgress) {
                    onProgress(`✓ Email repaired successfully on attempt ${attempt}`, attempt, []);
                }
                return {
                    success: true,
                    content: lastDraft,
                    violations: [],
                    attempts: attempt,
                    structure: lastValidation.structure
                };
            }
            
            // Check if we're making progress (fewer violations)
            const prevViolationCount = attemptHistory[attemptHistory.length - 2].validation.violations.length;
            const currentViolationCount = lastValidation.violations.length;
            
            if (onProgress) {
                const progressMsg = currentViolationCount < prevViolationCount
                    ? `Reduced violations from ${prevViolationCount} to ${currentViolationCount}`
                    : `Still have ${currentViolationCount} violations`;
                onProgress(progressMsg, attempt, lastValidation.violations);
            }
            
            // Early stop if violations are repeating (same signature)
            if (attempt > 2) {
                const prevSignature = generateViolationSignature(attemptHistory[attemptHistory.length - 2].validation.violations);
                const currentSignature = generateViolationSignature(lastValidation.violations);
                
                if (prevSignature === currentSignature) {
                    // Same violations, likely stuck in a loop
                    if (onProgress) {
                        onProgress(
                            `⚠ Violations repeating, stopping repair loop`,
                            attempt,
                            lastValidation.violations
                        );
                    }
                    break;
                }
            }
            
        } catch (error) {
            console.error(`Repair attempt ${attempt} failed:`, error);
            // Continue to next attempt or return best effort
        }
    }
    
    // Max attempts reached or early stopped
    // Return the best attempt (fewest violations)
    const bestAttempt = attemptHistory.reduce((best, current) => {
        const bestErrors = best.validation.violations.filter(v => v.severity === 'ERROR').length;
        const currentErrors = current.validation.violations.filter(v => v.severity === 'ERROR').length;
        return currentErrors < bestErrors ? current : best;
    }, attemptHistory[0]);
    
    const errorCount = bestAttempt.validation.violations.filter(v => v.severity === 'ERROR').length;
    
    if (onProgress) {
        onProgress(
            `⚠ Max attempts reached. Best result has ${errorCount} error(s)`,
            bestAttempt.attempt,
            bestAttempt.validation.violations
        );
    }
    
    return {
        success: false,
        content: bestAttempt.draft,
        violations: bestAttempt.validation.violations,
        attempts: attemptHistory.length,
        structure: bestAttempt.validation.structure,
        warning: `Generated email has ${errorCount} validation error(s). Manual review required.`
    };
}

/**
 * Generate a signature from violations for detecting repetition
 * @param {Array} violations - Array of violation objects
 * @returns {string} Signature string
 */
function generateViolationSignature(violations) {
    return violations
        .map(v => `${v.code}:${v.location}`)
        .sort()
        .join('|');
}

// Export for use in app
if (typeof window !== 'undefined') {
    window.EmailGenerator = {
        generateEmail,
        DEFAULT_MAX_REPAIR_ATTEMPTS
    };
}
