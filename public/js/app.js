// app.js - Main application logic with OpenRouter integration

// State
let currentFile = null;
let markdownContent = null;
let parsedContent = null;        // For email: markdown table, for multiformat: display JSON string
let parsedBriefJSON = null;      // For multiformat: actual JSON object from BriefParser
let generatedEmail = null;
let generatedMultiformat = null;
let knowledgeLoaded = false;
let selectedFormat = null; // 'email' or 'multiformat'

// Settings
const SETTINGS_KEY = 'briefParser_settings';
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';

// DOM Elements - initialized after DOM loads
let settingsBtn, settingsModal, closeSettings, apiKeyInput, modelSelect;
let maxTokensInput, enableRepairLoopCheckbox, apiStatus, apiStatusText;
let saveSettings, clearSettingsBtn, uploadArea, fileInput, fileInfo;
let fileName, clearFileBtn, uploadSection, processingSection, statusText;
let markdownSection, parsedSection, generationSection, feedbackSection;
let errorSection, errorText, retryBtn, markdownOutput, parsedOutput;
let generatedOutput, generationStatus, generationStatusText, generationAttempts;
let attemptNumber, maxAttempts, violationsList, explainErrorsBtn;
let errorExplanationSection, errorExplanationContent, parseBtn;
let generateEmailBtn, newFileBtn;
let formatSelectionSection, formatCards, backToFormats, selectedFormatBadge;

// Initialize DOM elements
function initializeDOMElements() {
    settingsBtn = document.getElementById('settingsBtn');
    settingsModal = document.getElementById('settingsModal');
    closeSettings = document.getElementById('closeSettings');
    apiKeyInput = document.getElementById('apiKey');
    modelSelect = document.getElementById('modelSelect');
    maxTokensInput = document.getElementById('maxTokens');
    enableRepairLoopCheckbox = document.getElementById('enableRepairLoop');
    apiStatus = document.getElementById('apiStatus');
    apiStatusText = document.getElementById('apiStatusText');
    saveSettings = document.getElementById('saveSettings');
    clearSettingsBtn = document.getElementById('clearSettings');

    uploadArea = document.getElementById('uploadArea');
    fileInput = document.getElementById('fileInput');
    fileInfo = document.getElementById('fileInfo');
    fileName = document.getElementById('fileName');
    clearFileBtn = document.getElementById('clearFile');

    uploadSection = document.getElementById('uploadSection');
    processingSection = document.getElementById('processingSection');
    statusText = document.getElementById('statusText');
    markdownSection = document.getElementById('markdownSection');
    parsedSection = document.getElementById('parsedSection');
    generationSection = document.getElementById('generationSection');
    feedbackSection = document.getElementById('feedbackSection');
    errorSection = document.getElementById('errorSection');
    errorText = document.getElementById('errorText');
    retryBtn = document.getElementById('retryBtn');

    markdownOutput = document.getElementById('markdownOutput');
    parsedOutput = document.getElementById('parsedOutput');
    generatedOutput = document.getElementById('generatedOutput');
    generationStatus = document.getElementById('generationStatus');
    generationStatusText = document.getElementById('generationStatusText');
    generationAttempts = document.getElementById('generationAttempts');
    attemptNumber = document.getElementById('attemptNumber');
    maxAttempts = document.getElementById('maxAttempts');
    violationsList = document.getElementById('violationsList');
    explainErrorsBtn = document.getElementById('explainErrorsBtn');
    errorExplanationSection = document.getElementById('errorExplanationSection');
    errorExplanationContent = document.getElementById('errorExplanationContent');
    parseBtn = document.getElementById('parseBtn');
    generateEmailBtn = document.getElementById('generateEmailBtn');
    newFileBtn = document.getElementById('newFileBtn');
    
    // Format selection elements
    formatSelectionSection = document.getElementById('formatSelectionSection');
    formatCards = document.querySelectorAll('.format-card');
    backToFormats = document.getElementById('backToFormats');
    selectedFormatBadge = document.getElementById('selectedFormatBadge');
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function initApp() {
    console.log('Initializing app...');
    initializeDOMElements();
    console.log('DOM elements initialized');
    console.log('settingsBtn:', settingsBtn);
    console.log('uploadArea:', uploadArea);
    initializeApp();
}


async function initializeApp() {
    loadSettings();
    attachEventListeners();
    checkAPIKeyStatus();
    
    // Load knowledge files for generation
    try {
        await window.KnowledgeLoader.loadKnowledgeFiles();
        knowledgeLoaded = true;
    } catch (error) {
        console.warn('Knowledge files not loaded:', error);
        knowledgeLoaded = false;
    }
}

// Settings Management
function loadSettings() {
    const settings = getSettings();
    if (settings.apiKey) {
        apiKeyInput.value = settings.apiKey;
    }
    if (settings.model) {
        modelSelect.value = settings.model;
    }
    if (settings.maxTokens) {
        maxTokensInput.value = settings.maxTokens;
    }
    if (settings.enableRepairLoop !== undefined) {
        enableRepairLoopCheckbox.checked = settings.enableRepairLoop;
    }
}

function getSettings() {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
        try {
            const settings = JSON.parse(stored);
            // Ensure defaults for new settings
            return {
                apiKey: settings.apiKey || '',
                model: settings.model || DEFAULT_MODEL,
                maxTokens: settings.maxTokens || 16000,
                enableRepairLoop: settings.enableRepairLoop !== undefined ? settings.enableRepairLoop : false
            };
        } catch (e) {
            console.error('Failed to parse settings:', e);
        }
    }
    return { apiKey: '', model: DEFAULT_MODEL, maxTokens: 16000, enableRepairLoop: false };
}

function saveSettingsToStorage() {
    const settings = {
        apiKey: apiKeyInput.value.trim(),
        model: modelSelect.value,
        maxTokens: parseInt(maxTokensInput.value) || 16000,
        enableRepairLoop: enableRepairLoopCheckbox.checked
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    checkAPIKeyStatus();
}

function clearSettings() {
    if (confirm('Are you sure you want to clear all settings?')) {
        localStorage.removeItem(SETTINGS_KEY);
        apiKeyInput.value = '';
        modelSelect.value = DEFAULT_MODEL;
        maxTokensInput.value = '16000';
        enableRepairLoopCheckbox.checked = false;
        checkAPIKeyStatus();
    }
}

function checkAPIKeyStatus() {
    const settings = getSettings();
    if (settings.apiKey && settings.apiKey.startsWith('sk-or-')) {
        apiStatus.classList.add('success');
        apiStatus.classList.remove('warning');
        apiStatusText.textContent = 'API key configured ✓';
        parseBtn.disabled = false;
    } else {
        apiStatus.classList.remove('success');
        apiStatus.classList.add('warning');
        apiStatusText.textContent = 'No API key configured';
        parseBtn.disabled = true;
    }
}

// Event Listeners
function attachEventListeners() {
    console.log('Attaching event listeners...');
    console.log('settingsBtn in attachEventListeners:', settingsBtn);
    
    // Format selection
    formatCards.forEach(card => {
        card.addEventListener('click', () => {
            const format = card.dataset.format;
            selectFormat(format);
        });
    });
    
    // Back to format selection
    backToFormats.addEventListener('click', () => {
        showFormatSelection();
    });
    
    // Settings modal
    settingsBtn.addEventListener('click', () => {
        console.log('Settings button clicked!');
        settingsModal.style.display = 'flex';
    });

    closeSettings.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    saveSettings.addEventListener('click', () => {
        saveSettingsToStorage();
        settingsModal.style.display = 'none';
        showNotification('Settings saved successfully', 'success');
    });

    clearSettingsBtn.addEventListener('click', clearSettings);

    // File upload
    uploadArea.addEventListener('click', () => {
        console.log('Upload area clicked!');
        fileInput.click();
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragging');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragging');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragging');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    clearFileBtn.addEventListener('click', resetApp);
    retryBtn.addEventListener('click', resetApp);
    newFileBtn.addEventListener('click', resetApp);
    parseBtn.addEventListener('click', handleParseBrief);
    generateEmailBtn.addEventListener('click', handleGenerateEmail);
    explainErrorsBtn.addEventListener('click', handleExplainErrors);

    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const targetId = btn.dataset.target;
            const content = document.getElementById(targetId).textContent;
            
            try {
                await navigator.clipboard.writeText(content);
                
                const originalHTML = btn.innerHTML;
                btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg> Copied!`;
                btn.classList.add('copied');
                
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('copied');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                showNotification('Failed to copy to clipboard', 'error');
            }
        });
    });
}

// File Processing
async function handleFile(file) {
    if (!file.name.endsWith('.docx')) {
        showError('Please upload a .docx file');
        return;
    }
    
    currentFile = file;
    fileName.textContent = file.name;
    fileInfo.style.display = 'flex';
    uploadArea.style.display = 'none';
    
    await convertToMarkdown(file);
}

async function convertToMarkdown(file) {
    try {
        hideAllSections();
        showProcessing('Converting DOCX to Markdown...');
        
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value;
        
        // Convert HTML to Markdown
        const turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            emDelimiter: '_',
        });
        
        // Custom rules for better table handling
        turndownService.addRule('tables', {
            filter: 'table',
            replacement: function(content, node) {
                return '\n\n' + content + '\n\n';
            }
        });
        
        markdownContent = turndownService.turndown(html);
        
        // Clean markdown (remove base64 images)
        markdownContent = cleanMarkdown(markdownContent);
        
        // Display markdown
        displayMarkdown();
        
    } catch (error) {
        console.error('Conversion error:', error);
        showError('Failed to convert DOCX to Markdown: ' + error.message);
    }
}

function displayMarkdown() {
    hideAllSections();
    markdownOutput.textContent = markdownContent;
    markdownSection.style.display = 'block';
    checkAPIKeyStatus(); // Update parse button state
}

/**
 * Clean markdown content by removing base64 embedded images
 * Called automatically after DOCX conversion to clean display and reduce token usage
 * @param {string} markdown - Raw markdown content
 * @returns {string} Cleaned markdown
 */
function cleanMarkdown(markdown) {
    if (!markdown) return markdown;
    
    // Remove base64 embedded images in multiple formats:
    // 1. ![](data:image/png;base64,...)
    // 2. **![](data:image/png;base64,...)**
    // 3. ![alt text](data:image/png;base64,...)
    // Pattern matches: optional **, optional ![any text], data:image, base64 data until ) or **
    const base64ImagePattern = /\*?\*?!\[[^\]]*\]\(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+\)\*?\*?/g;
    
    let cleaned = markdown.replace(base64ImagePattern, '');
    
    // Remove any standalone base64 strings that might be left (extra cautious)
    // This catches cases like: data:image/png;base64,iVBORw0KG...
    const standaloneBase64Pattern = /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g;
    cleaned = cleaned.replace(standaloneBase64Pattern, '');
    
    // Clean up multiple consecutive blank lines that may result from removal
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    return cleaned.trim();
}

// OpenRouter Integration
async function handleParseBrief() {
    const settings = getSettings();
    
    if (!settings.apiKey) {
        showError('Please configure your OpenRouter API key in Settings');
        return;
    }
    
    if (!markdownContent) {
        showError('No markdown content to parse');
        return;
    }
    
    try {
        hideError();
        
        if (selectedFormat === 'multiformat') {
            // Multiformat: use local BriefParser (JSON output)
            showProcessing('Парсинг брифа для мультиформата...');
            
            const parser = new window.BriefParser();
            parsedBriefJSON = parser.parse(markdownContent, currentFile?.name || 'brief.docx');
            parsedContent = JSON.stringify(parsedBriefJSON, null, 2);
            
            displayParsedBrief();
        } else {
            // Email: use OpenRouter API (markdown table output)
            showProcessing('Parsing brief with AI... This may take 10-30 seconds.');
            
            // Markdown is already cleaned after conversion, use directly
            parsedContent = await callOpenRouter(markdownContent, settings);
            parsedBriefJSON = null;
            
            displayParsedBrief();
        }
        
    } catch (error) {
        console.error('Parsing error:', error);
        showError(error.message || 'Failed to parse brief');
    }
}

async function callOpenRouter(markdown, settings) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Brief Parser'
        },
        body: JSON.stringify({
            model: settings.model,
            messages: [
                {
                    role: 'system',
                    content: window.PARSING_SPEC
                },
                {
                    role: 'user',
                    content: `Please parse this marketing brief according to the parsing logic specification:\n\n${markdown}`
                }
            ],
            temperature: 0.1, // Low temperature for consistent parsing
            max_tokens: 8000
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

function displayParsedBrief() {
    hideAllSections();
    parsedOutput.textContent = parsedContent;
    parsedSection.style.display = 'block';
    markdownSection.style.display = 'block'; // Show both sections
    
    // Update generate button text based on format
    if (selectedFormat === 'multiformat') {
        generateEmailBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            Генерировать мультиформат
        `;
    } else {
        generateEmailBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            Generate Email
        `;
    }
    
    // Enable generate button if knowledge is loaded
    if (knowledgeLoaded && getSettings().apiKey) {
        generateEmailBtn.disabled = false;
    }
}

// Feedback Form Functions
function showFeedbackForm() {
    console.log('Showing feedback form...');
    console.log('feedbackSection:', feedbackSection);
    feedbackSection.style.display = 'block';
    feedbackSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Reset form
    document.getElementById('feedbackRating').value = '';
    document.getElementById('feedbackComments').value = '';
    document.querySelectorAll('.rating-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('submitFeedbackBtn').disabled = true;
    console.log('Feedback form displayed');
    
    // Setup listeners for this feedback form
    setupFeedbackListenersNow();
}

function setupFeedbackListenersNow() {
    const ratingButtons = document.querySelectorAll('.rating-btn');
    const feedbackRating = document.getElementById('feedbackRating');
    const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
    const skipFeedbackBtn = document.getElementById('skipFeedbackBtn');
    
    console.log('Setting up feedback listeners...');
    console.log('Found rating buttons:', ratingButtons.length);
    console.log('submitFeedbackBtn:', submitFeedbackBtn);
    
    // Remove any existing listeners by cloning buttons
    ratingButtons.forEach((btn, index) => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });
    
    // Get the new buttons after cloning
    const newRatingButtons = document.querySelectorAll('.rating-btn');
    
    // Rating button selection
    newRatingButtons.forEach((btn, index) => {
        console.log(`Adding listener to button ${index}:`, btn);
        btn.addEventListener('click', () => {
            console.log('Rating button clicked!', btn.dataset.rating);
            newRatingButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            feedbackRating.value = btn.dataset.rating;
            submitFeedbackBtn.disabled = false;
            console.log('Submit button enabled, value:', feedbackRating.value);
        });
    });
    
    // Submit feedback
    submitFeedbackBtn.addEventListener('click', async () => {
        console.log('Submit feedback clicked');
        await submitFeedback();
    });
    
    // Skip feedback
    skipFeedbackBtn.addEventListener('click', () => {
        feedbackSection.style.display = 'none';
        showToast('Feedback skipped', 'info');
    });
}

async function submitFeedback() {
    console.log('=== submitFeedback called ===');
    const rating = document.getElementById('feedbackRating').value;
    const comments = document.getElementById('feedbackComments').value;
    
    console.log('Rating:', rating);
    console.log('Comments:', comments);
    
    if (!rating) {
        console.log('No rating selected');
        showToast('Please select a rating', 'error');
        return;
    }
    
    console.log('Generating report...');
    // Package all information
    const report = generateFeedbackReport(rating, comments);
    
    console.log('Downloading report...');
    // Download as text file
    downloadReport(report);
    
    // Hide feedback section
    feedbackSection.style.display = 'none';
    
    showToast('Thank you for your feedback!', 'success');
    console.log('=== submitFeedback completed ===');
}

function generateFeedbackReport(rating, comments) {
    const timestamp = new Date().toISOString();
    const settings = getSettings();
    
    const ratingLabels = {
        '1': 'Poor',
        '2': 'Fair',
        '3': 'Good',
        '4': 'Very Good',
        '5': 'Excellent'
    };
    
    let report = `=================================================
BRIEF PARSER - GENERATION FEEDBACK REPORT
=================================================

Generated: ${timestamp}

=================================================
USER FEEDBACK
=================================================

Rating: ${rating}/5 (${ratingLabels[rating] || 'Unknown'})

Comments:

${comments || 'No comments provided'}

=================================================
SETTINGS
=================================================

Model: ${settings.model || 'N/A'}
Max Tokens: ${settings.maxTokens || 'N/A'}
Repair Loop Enabled: ${settings.enableRepairLoop ? 'Yes' : 'No'}

=================================================
ORIGINAL BRIEF (MARKDOWN)
=================================================

${markdownContent || 'N/A'}

=================================================
PARSED BRIEF (JSON)
=================================================

${parsedContent ? JSON.stringify(parsedContent, null, 2) : 'N/A'}

=================================================
GENERATED EMAIL
=================================================

${generatedEmail || 'N/A'}

=================================================
GENERATION METADATA
=================================================

Filename: ${currentFile?.name || 'N/A'}
File Size: ${currentFile?.size || 'N/A'} bytes
Knowledge Files Loaded: ${knowledgeLoaded ? 'Yes' : 'No'}

=================================================
END OF REPORT
=================================================
`;
    
    return report;
}

function downloadReport(content) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `feedback-report-${timestamp}.txt`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Report downloaded:', filename);
}


function showToast(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Could add visual toast notification here in the future
}

// Generation Handler (routes to Email or Multiformat)
async function handleGenerateEmail() {
    const settings = getSettings();
    
    if (!settings.apiKey) {
        showError('Please configure your OpenRouter API key in Settings');
        return;
    }
    
    if (!knowledgeLoaded) {
        showError('Generation rules not loaded. Please refresh the page.');
        return;
    }
    
    if (!parsedContent) {
        showError('No parsed brief available. Please parse a brief first.');
        return;
    }
    
    // Route to appropriate generator
    if (selectedFormat === 'multiformat') {
        await handleGenerateMultiformat();
    } else {
        await handleGenerateEmailContent();
    }
}

// Email Generation
async function handleGenerateEmailContent() {
    const settings = getSettings();
    
    try {
        // Show generation section
        hideError();
        generationSection.style.display = 'block';
        parsedSection.style.display = 'block';
        markdownSection.style.display = 'block';
        
        generationStatus.style.display = 'block';
        generationAttempts.style.display = 'block';
        violationsList.style.display = 'none';
        generatedOutput.textContent = '';
        maxAttempts.textContent = settings.enableRepairLoop ? window.EmailGenerator.DEFAULT_MAX_REPAIR_ATTEMPTS : 1;
        
        // Disable button during generation
        generateEmailBtn.disabled = true;
        
        const result = await window.EmailGenerator.generateEmail(
            parsedContent,
            settings,
            (message, attempt, violations) => {
                generationStatusText.textContent = message;
                attemptNumber.textContent = attempt;
                
                if (violations && violations.length > 0) {
                    displayViolations(violations);
                }
            }
        );
        
        generatedEmail = result.content;
        
        // Hide status, show result
        generationStatus.style.display = 'none';
        generationAttempts.style.display = 'none';
        generatedOutput.textContent = result.content;
        
        // Store result for error analysis
        lastGenerationResult = result;
        
        if (result.success) {
            showNotification('✓ Email generated successfully!', 'success');
            violationsList.style.display = 'none';
            explainErrorsBtn.style.display = 'none';
            errorExplanationSection.style.display = 'none';
        } else {
            showNotification(`⚠ Generation completed with ${result.violations.length} issue(s)`, 'warning');
            displayViolations(result.violations);
        }
        
        // Show feedback form after ANY generation (success or with errors)
        showFeedbackForm();
        
    } catch (error) {
        console.error('Generation error:', error);
        showError(error.message || 'Failed to generate email');
    } finally {
        generateEmailBtn.disabled = false;
    }
}

// Multiformat Generation
async function handleGenerateMultiformat() {
    const settings = getSettings();
    
    if (!parsedBriefJSON) {
        showError('No parsed brief JSON available. Please parse a brief first.');
        return;
    }
    
    try {
        // Show generation section
        hideError();
        generationSection.style.display = 'block';
        parsedSection.style.display = 'block';
        markdownSection.style.display = 'block';
        
        generationStatus.style.display = 'block';
        generationAttempts.style.display = 'block';
        violationsList.style.display = 'none';
        generatedOutput.textContent = '';
        maxAttempts.textContent = settings.enableRepairLoop ? 3 : 1;
        
        // Disable button during generation
        generateEmailBtn.disabled = true;
        
        const result = await window.generateMultiformat(
            parsedBriefJSON,
            settings,
            (message, attempt, violations) => {
                generationStatusText.textContent = message;
                attemptNumber.textContent = attempt;
                
                if (violations && violations.length > 0) {
                    displayViolations(violations);
                }
            }
        );
        
        generatedMultiformat = result.content;
        
        // Hide status, show result
        generationStatus.style.display = 'none';
        generationAttempts.style.display = 'none';
        generatedOutput.textContent = result.content;
        
        // Store result for error analysis
        lastGenerationResult = result;
        
        if (result.success) {
            showNotification('✓ Мультиформат сгенерирован успешно!', 'success');
            violationsList.style.display = 'none';
            explainErrorsBtn.style.display = 'none';
            errorExplanationSection.style.display = 'none';
        } else {
            showNotification(`⚠ Генерация завершена с ${result.violations.length} ошибками`, 'warning');
            displayViolations(result.violations);
        }
        
        // Show feedback form after ANY generation (success or with errors)
        showFeedbackForm();
        
    } catch (error) {
        console.error('Multiformat generation error:', error);
        showError(error.message || 'Failed to generate multiformat content');
    } finally {
        generateEmailBtn.disabled = false;
    }
}

function displayViolations(violations) {
    if (!violations || violations.length === 0) {
        explainErrorsBtn.style.display = 'none';
        return;
    }
    
    violationsList.style.display = 'block';
    
    const errorViolations = violations.filter(v => v.severity === 'ERROR');
    const warningViolations = violations.filter(v => v.severity === 'WARNING');
    
    let html = '<div class="violations-header">Validation Issues:</div>';
    
    if (errorViolations.length > 0) {
        html += '<div class="violations-group error-group">';
        html += `<div class="group-title">❌ Errors (${errorViolations.length})</div>`;
        errorViolations.forEach(v => {
            html += `<div class="violation-item">
                <div class="violation-code">${v.code}</div>
                <div class="violation-message">${v.message}</div>
                <div class="violation-location">Location: ${v.location}</div>
                ${v.evidence ? `<div class="violation-evidence">Evidence: "${v.evidence}"</div>` : ''}
                ${v.suggestedFix ? `<div class="violation-fix">💡 ${v.suggestedFix}</div>` : ''}
            </div>`;
        });
        html += '</div>';
    }
    
    if (warningViolations.length > 0) {
        html += '<div class="violations-group warning-group">';
        html += `<div class="group-title">⚠️ Warnings (${warningViolations.length})</div>`;
        warningViolations.forEach(v => {
            html += `<div class="violation-item">
                <div class="violation-code">${v.code}</div>
                <div class="violation-message">${v.message}</div>
                <div class="violation-location">Location: ${v.location}</div>
            </div>`;
        });
        html += '</div>';
    }
    
    violationsList.innerHTML = html;
    
    // Show "Explain Errors" button
    explainErrorsBtn.style.display = 'inline-flex';
    explainErrorsBtn.disabled = false;
}

// Error Analysis Handler
let lastGenerationResult = null;

async function handleExplainErrors() {
    const settings = getSettings();
    
    if (!settings.apiKey) {
        showError('Please configure your OpenRouter API key in Settings');
        return;
    }
    
    if (!lastGenerationResult || !lastGenerationResult.violations || lastGenerationResult.violations.length === 0) {
        showNotification('No errors to explain', 'info');
        return;
    }
    
    try {
        explainErrorsBtn.disabled = true;
        explainErrorsBtn.innerHTML = `<svg class="spinner small" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5"></circle></svg> Analyzing...`;
        
        errorExplanationSection.style.display = 'block';
        errorExplanationContent.innerHTML = '<div class="analyzing-message"><div class="spinner small"></div>Asking AI to analyze errors...</div>';
        
        const rules = window.PromptComposer.loadGenerationRules();
        const requirements = window.PromptComposer.extractSpecRequirements(parsedContent);
        
        const { systemPrompt, userPrompt } = window.PromptComposer.composeErrorAnalysisPrompt(
            parsedContent,
            rules,
            requirements,
            lastGenerationResult.content,
            lastGenerationResult.violations
        );
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Brief Parser - Error Analysis'
            },
            body: JSON.stringify({
                model: settings.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3,
                max_tokens: 4000
            })
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        const explanation = data.choices[0].message.content;
        
        // Format and display explanation
        errorExplanationContent.innerHTML = `<div class="explanation-text">${formatExplanation(explanation)}</div>`;
        
        showNotification('✓ Error analysis complete', 'success');
        
    } catch (error) {
        console.error('Error analysis failed:', error);
        errorExplanationContent.innerHTML = `<div class="error-message">Failed to analyze errors: ${error.message}</div>`;
        showNotification('Failed to analyze errors', 'error');
    } finally {
        explainErrorsBtn.disabled = false;
        explainErrorsBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg> Explain Errors`;
    }
}

function formatExplanation(text) {
    // Convert markdown-style formatting to HTML
    let formatted = text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/^### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^## (.+)$/gm, '<h3>$1</h3>')
        .replace(/^# (.+)$/gm, '<h2>$1</h2>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^- (.+)$/gm, '<li>$1</li>');
    
    // Wrap list items
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Wrap in paragraphs
    formatted = '<p>' + formatted + '</p>';
    
    // Clean up empty paragraphs
    formatted = formatted.replace(/<p>\s*<\/p>/g, '');
    
    return formatted
    violationsList.innerHTML = html;
}

// UI Helper Functions
function showProcessing(message) {
    processingSection.style.display = 'block';
    statusText.textContent = message;
}

function showError(message) {
    hideAllSections();
    errorText.textContent = message;
    errorSection.style.display = 'block';
}

function hideError() {
    errorSection.style.display = 'none';
}

function hideAllSections() {
    processingSection.style.display = 'none';
    markdownSection.style.display = 'none';
    parsedSection.style.display = 'none';
    generationSection.style.display = 'none';
    errorSection.style.display = 'none';
}

// Format Selection Functions
function selectFormat(format) {
    selectedFormat = format;
    
    // Update badge based on format
    const formatConfig = {
        email: { icon: '📧', name: 'Email рассылка' },
        multiformat: { icon: '📦', name: 'Мультиформат' }
    };
    
    const config = formatConfig[format] || formatConfig.email;
    selectedFormatBadge.querySelector('.format-icon').textContent = config.icon;
    selectedFormatBadge.querySelector('.format-name').textContent = config.name;
    
    // Show upload section, hide format selection
    formatSelectionSection.style.display = 'none';
    uploadSection.style.display = 'block';
    
    console.log('Format selected:', format);
}

function showFormatSelection() {
    selectedFormat = null;
    formatSelectionSection.style.display = 'block';
    uploadSection.style.display = 'none';
    hideAllSections();
    
    // Reset all state
    currentFile = null;
    markdownContent = null;
    parsedContent = null;
    parsedBriefJSON = null;
    generatedEmail = null;
    generatedMultiformat = null;
    fileInput.value = '';
    fileInfo.style.display = 'none';
    uploadArea.style.display = 'block';
}

function resetApp() {
    currentFile = null;
    markdownContent = null;
    parsedContent = null;
    parsedBriefJSON = null;
    generatedEmail = null;
    generatedMultiformat = null;
    
    fileInput.value = '';
    fileInfo.style.display = 'none';
    uploadArea.style.display = 'block';
    
    // Go back to format selection
    showFormatSelection();
}

function showNotification(message, type = 'info') {
    console.log(`[${type}] ${message}`);
}

// ============================================
// FEEDBACK SYSTEM - ALL FUNCTIONS HERE
// ============================================

function setupFeedbackListeners() {
    const ratingButtons = document.querySelectorAll('.rating-btn');
    const feedbackRating = document.getElementById('feedbackRating');
    const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
    const skipFeedbackBtn = document.getElementById('skipFeedbackBtn');
    
    console.log('Setting up feedback listeners...');
    console.log('Found rating buttons:', ratingButtons.length);
    console.log('submitFeedbackBtn:', submitFeedbackBtn);
    
    // Rating button selection
    ratingButtons.forEach((btn, index) => {
        console.log(`Adding listener to button ${index}:`, btn);
        btn.addEventListener('click', () => {
            console.log('Rating button clicked!', btn.dataset.rating);
            ratingButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            feedbackRating.value = btn.dataset.rating;
            submitFeedbackBtn.disabled = false;
            console.log('Submit button enabled');
        });
    });
    
    // Submit feedback
    submitFeedbackBtn.addEventListener('click', async () => {
        console.log('Submit feedback clicked');
        await submitFeedback();
    });
    
    // Skip feedback
    skipFeedbackBtn.addEventListener('click', () => {
        feedbackSection.style.display = 'none';
        showToast('Feedback skipped', 'info');
    });
}

