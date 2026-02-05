// generateMultiformat.js - Orchestrator for multiformat generation with validation & repair loop

(function() {
'use strict';

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
            'X-Title': 'Brief Parser - Multiformat Generator'
        },
        body: JSON.stringify({
            model: settings.model,
            messages: messages,
            temperature: 0.3, // Slightly higher for creative variety
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
 * Main multiformat generation orchestrator
 * Generates multiformat content with validation and repair loop
 * @param {Object} parsedBrief - The parsed brief JSON from BriefParser
 * @param {Object} settings - API settings
 * @param {Function} onProgress - Progress callback (message, attempt, violations)
 * @returns {Promise<Object>} { success: boolean, content: string, violations: Array, attempts: number }
 */
async function generateMultiformat(parsedBrief, settings, onProgress = null) {
    if (!parsedBrief) {
        throw new Error('No parsed brief provided');
    }
    
    if (!settings.apiKey) {
        throw new Error('No API key configured');
    }
    
    // Load rules
    const rules = window.PromptComposerMultiformat.loadMultiformatRules();
    
    // Determine max attempts based on settings
    const MAX_REPAIR_ATTEMPTS = settings.enableRepairLoop ? DEFAULT_MAX_REPAIR_ATTEMPTS : 1;
    
    let lastDraft = null;
    let lastValidation = null;
    const attemptHistory = [];
    
    // Attempt 1: Initial generation
    try {
        if (onProgress) {
            onProgress('Генерация мультиформатного контента...', 1, null);
        }
        
        const { systemPrompt, userPrompt } = window.PromptComposerMultiformat.composeMultiformatGenerationPrompt(
            parsedBrief,
            rules
        );
        
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];
        
        lastDraft = await callLLM(messages, settings);
        
        // Validate the draft
        if (onProgress) {
            onProgress('Валидация результата...', 1, null);
        }
        
        lastValidation = window.ValidatorMultiformat.validateMultiformat(lastDraft, parsedBrief);
        
        attemptHistory.push({
            attempt: 1,
            draft: lastDraft,
            validation: lastValidation
        });
        
        // If valid or repair loop disabled, return
        if (lastValidation.isValid || !settings.enableRepairLoop) {
            if (onProgress) {
                const status = lastValidation.isValid ? 'Генерация завершена успешно!' : 'Генерация завершена с ошибками';
                onProgress(status, 1, lastValidation.violations);
            }
            
            return {
                success: lastValidation.isValid,
                content: lastDraft,
                violations: lastValidation.violations,
                attempts: 1,
                attemptHistory
            };
        }
        
    } catch (error) {
        console.error('Initial generation failed:', error);
        throw new Error(`Ошибка генерации: ${error.message}`);
    }
    
    // Repair loop (attempts 2+)
    for (let attempt = 2; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
        try {
            if (onProgress) {
                onProgress(`Исправление ошибок (попытка ${attempt}/${MAX_REPAIR_ATTEMPTS})...`, attempt, lastValidation.violations);
            }
            
            // Compose repair prompt
            const { systemPrompt, userPrompt } = window.PromptComposerMultiformat.composeMultiformatRepairPrompt(
                lastDraft,
                lastValidation.violations,
                parsedBrief,
                rules
            );
            
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];
            
            lastDraft = await callLLM(messages, settings);
            
            // Validate repaired draft
            lastValidation = window.ValidatorMultiformat.validateMultiformat(lastDraft, parsedBrief);
            
            attemptHistory.push({
                attempt,
                draft: lastDraft,
                validation: lastValidation
            });
            
            if (lastValidation.isValid) {
                if (onProgress) {
                    onProgress('Все ошибки исправлены!', attempt, []);
                }
                
                return {
                    success: true,
                    content: lastDraft,
                    violations: [],
                    attempts: attempt,
                    attemptHistory
                };
            }
            
        } catch (error) {
            console.error(`Repair attempt ${attempt} failed:`, error);
            // Continue to next attempt or return last valid draft
        }
    }
    
    // Max attempts reached
    if (onProgress) {
        onProgress(`Достигнут лимит попыток. Остались ошибки: ${lastValidation.violations.length}`, MAX_REPAIR_ATTEMPTS, lastValidation.violations);
    }
    
    return {
        success: false,
        content: lastDraft,
        violations: lastValidation.violations,
        attempts: MAX_REPAIR_ATTEMPTS,
        attemptHistory
    };
}

// Export for use in app
if (typeof window !== 'undefined') {
    window.generateMultiformat = generateMultiformat;
    console.log('✓ generateMultiformat exported to window');
}

})(); // End IIFE
