# 🚀 Pre-Launch Checklist

Complete this checklist before using the email generation pipeline in production.

## ✅ File Structure Verification

- [ ] **Core Files Present**
  - [ ] `index.html` - Main UI (updated with generation section)
  - [ ] `app.js` - Application logic (updated with generation handlers)
  - [ ] `styles.css` - Styling (updated with generation UI)
  - [ ] `parsing-spec.js` - Parser specification

- [ ] **Generation Modules** (`src/generation/`)
  - [ ] `validator.js` - Validation engine
  - [ ] `promptComposer.js` - Prompt composition
  - [ ] `generateEmail.js` - Main orchestrator
  - [ ] `knowledgeLoader.js` - Rule loader

- [ ] **Knowledge Files** (must be accessible via HTTP)
  - [ ] `system_instructions.txt`
  - [ ] `SPEC_EMAIL_V1.md`
  - [ ] `SW_LEXICON_AND_BANS.md`
  - [ ] `SW_GLOBAL_RULES.md`

- [ ] **Tests**
  - [ ] `tests/test-runner.html` - Browser test runner
  - [ ] `tests/validator.test.js` - Node.js tests
  - [ ] `tests/fixtures/sample-digest-parsed.md` - Sample fixture

- [ ] **Documentation**
  - [ ] `README.md` - Updated with generation features
  - [ ] `GENERATION.md` - Architecture and API reference
  - [ ] `DEV_GUIDE.md` - Developer integration guide
  - [ ] `QUICK_REFERENCE.md` - Quick lookup reference
  - [ ] `CHANGELOG.md` - Version history
  - [ ] `IMPLEMENTATION_SUMMARY.md` - Implementation details

## ✅ Local Testing

### 1. Start Local Server
```bash
cd parser
python -m http.server 8000
# Or: npx serve
# Or: VS Code Live Server
```

- [ ] Server starts successfully
- [ ] No port conflicts
- [ ] Can access http://localhost:8000

### 2. Run Test Suite
Open `http://localhost:8000/tests/test-runner.html`

- [ ] All 14 tests pass (green ✓)
- [ ] No JavaScript errors in console
- [ ] Violations display correctly

Expected output:
```
✓ Detects forbidden "дегустация" without allowed pattern
✓ Allows "дегустация" in correct pattern
✓ Detects forbidden "купить" without винотека
✓ Allows "купить" with винотека
✓ Detects forbidden "покупка"
✓ Detects forbidden "букет"
✓ Detects forbidden "послевкусие"
✓ Detects subject exceeding 30 chars
✓ Allows subject within 30 chars
✓ Detects banned cliché "отличный повод"
✓ Detects insufficient subject variants
✓ Accepts correct variant count
✓ Detects geography label misuse "Пробуем Пьемонт"
✓ Allows correct geography usage "Вина Пьемонта"
✓ Detects emojis

Test Summary: ✓ 14 Passed, ✗ 0 Failed
```

### 3. Check Knowledge Loading
Open browser console and verify:

```javascript
console.log('Knowledge loaded:', {
  system: !!window.SYSTEM_INSTRUCTIONS,
  spec: !!window.SPEC_EMAIL_V1,
  lexicon: !!window.SW_LEXICON_AND_BANS,
  global: !!window.SW_GLOBAL_RULES
});
```

Expected output:
```
Knowledge loaded: {
  system: true,
  spec: true,
  lexicon: true,
  global: true
}
```

- [ ] All knowledge files loaded (all `true`)
- [ ] No 404 errors in Network tab
- [ ] Console shows "✓ Knowledge files loaded successfully"

### 4. End-to-End Test

**Step 1: Configure API Key**
- [ ] Click Settings button
- [ ] Enter valid OpenRouter API key (starts with `sk-or-`)
- [ ] Select model (Claude Sonnet 4.5 recommended)
- [ ] Click Save Settings
- [ ] Status shows "API key configured ✓"

**Step 2: Upload & Parse**
- [ ] Drag-drop or click to upload a DOCX brief
- [ ] File converts to Markdown (1-2 seconds)
- [ ] Markdown displays correctly
- [ ] Click "Parse Brief"
- [ ] Wait 10-30 seconds
- [ ] Parsed brief displays with [CAMPAIGN], [BLOCK] tags
- [ ] "Generate Email" button appears and is enabled

**Step 3: Generate Email**
- [ ] Click "Generate Email"
- [ ] Status indicator shows "Generating..." with spinner
- [ ] Attempt counter displays (1/3)
- [ ] Progress messages update
- [ ] Generation completes (10-90 seconds depending on attempts)
- [ ] Generated email displays
- [ ] Success message shows: "✓ Email generated successfully!" OR
- [ ] Warning shows: "⚠ Generation completed with N issue(s)"

**Step 4: Review Output**
- [ ] Email has correct sections (ТЕМА, ПРЕХЕДЕР, ГЛАВНЫЙ БАННЕР, etc.)
- [ ] Variant counts are correct (3 for subject, preheader, etc.)
- [ ] No violations listed (or check violations list if any)
- [ ] Copy button works

**Step 5: Violations Check (if any)**
If violations present:
- [ ] Violations list displays
- [ ] Error violations shown in red
- [ ] Warning violations shown in yellow
- [ ] Each violation has: code, message, location, evidence
- [ ] Suggested fixes provided where applicable

## ✅ API Configuration

- [ ] **OpenRouter Account**
  - [ ] Account created at https://openrouter.ai
  - [ ] API key generated (https://openrouter.ai/keys)
  - [ ] Key starts with `sk-or-v1-`
  - [ ] Credits available in account

- [ ] **Model Selection**
  - [ ] Model dropdown populated
  - [ ] Claude Sonnet 4.5 available (recommended)
  - [ ] Alternative models available (GPT, Gemini, etc.)

## ✅ Validation Rules Verification

Test each rule with sample text:

### Forbidden Words
- [ ] **дегустация** detected (except "мероприятие с дегустацией вин")
- [ ] **купить** detected (except "купить в винотеке")
- [ ] **покупка** detected (except with "в винотеке")
- [ ] **букет** detected
- [ ] **послевкусие** detected

### Banned Clichés
- [ ] "отличный повод" detected
- [ ] "со смыслом" detected
- [ ] Other clichés from lexicon detected

### Geography Labels
- [ ] "Пробуем Пьемонт" detected
- [ ] "Вина Пьемонта" allowed
- [ ] "Пьемонтские вина" allowed

### Limits & Counts
- [ ] Subject > 30 chars detected
- [ ] Preheader > 75 chars detected
- [ ] Missing variants detected
- [ ] Unicode chars counted correctly

### Duplication
- [ ] 3+ word sequences between parts detected
- [ ] Exact equality (Subject=Banner) detected

### Other
- [ ] Emojis detected
- [ ] Service phrases detected

## ✅ Browser Compatibility

Test in each browser:

- [ ] **Chrome/Edge** (Chromium)
  - [ ] UI renders correctly
  - [ ] File upload works
  - [ ] Generation completes
  - [ ] No console errors

- [ ] **Firefox**
  - [ ] UI renders correctly
  - [ ] File upload works
  - [ ] Generation completes
  - [ ] No console errors

- [ ] **Safari** (if Mac available)
  - [ ] UI renders correctly
  - [ ] File upload works
  - [ ] Generation completes
  - [ ] No console errors

## ✅ Error Handling

Test error scenarios:

- [ ] **No API Key**
  - [ ] "Parse Brief" disabled
  - [ ] "Generate Email" disabled
  - [ ] Clear error message shown

- [ ] **Invalid API Key**
  - [ ] Generation fails gracefully
  - [ ] Error message shown
  - [ ] Can retry after fixing

- [ ] **Network Error**
  - [ ] Handles fetch failures
  - [ ] Shows user-friendly error
  - [ ] Can retry

- [ ] **Knowledge Files Missing**
  - [ ] Console shows warning
  - [ ] "Generate Email" functionality disabled or shows error

- [ ] **LLM Timeout**
  - [ ] Handles long response times
  - [ ] Shows appropriate status

- [ ] **Max Attempts Reached**
  - [ ] Returns best attempt
  - [ ] Shows violations
  - [ ] User can review and manually fix

## ✅ Performance

- [ ] **Parsing**: Completes in < 30 seconds
- [ ] **Generation Attempt 1**: Completes in < 30 seconds
- [ ] **Repair Attempts**: Each < 30 seconds
- [ ] **Total Worst-Case**: < 90 seconds (3 attempts)
- [ ] **UI Responsive**: No freezing during operations
- [ ] **Progress Updates**: Real-time feedback

## ✅ Documentation

- [ ] **README.md**
  - [ ] Accurate feature list
  - [ ] Clear setup instructions
  - [ ] Usage workflow documented
  - [ ] Links to other docs

- [ ] **GENERATION.md**
  - [ ] Architecture diagram clear
  - [ ] API references accurate
  - [ ] Code examples work
  - [ ] Validation rules complete

- [ ] **DEV_GUIDE.md**
  - [ ] Integration examples work
  - [ ] Custom validation howto clear
  - [ ] Troubleshooting helpful

- [ ] **QUICK_REFERENCE.md**
  - [ ] All rules listed
  - [ ] Examples accurate
  - [ ] Quick to scan

## ✅ Deployment (GitHub Pages)

If deploying:

- [ ] **Repository Setup**
  - [ ] All files committed
  - [ ] No sensitive data (API keys) in repo
  - [ ] .gitignore configured

- [ ] **GitHub Pages Settings**
  - [ ] Settings > Pages
  - [ ] Source: Deploy from branch
  - [ ] Branch: main, folder: / (root)
  - [ ] Save clicked

- [ ] **Wait for Deployment**
  - [ ] 2-3 minutes for initial deploy
  - [ ] Green checkmark in Actions tab
  - [ ] URL shown in Pages settings

- [ ] **Test Live Site**
  - [ ] Visit https://USERNAME.github.io/REPO_NAME/
  - [ ] All files load (check Network tab)
  - [ ] No 404 errors
  - [ ] Knowledge files accessible
  - [ ] Full workflow works (upload → parse → generate)

## ✅ Production Readiness

Final checks:

- [ ] **Security**
  - [ ] API keys only in localStorage (browser)
  - [ ] No hardcoded secrets
  - [ ] HTTPS enforced (if deployed)

- [ ] **User Experience**
  - [ ] Clear instructions
  - [ ] Helpful error messages
  - [ ] Progress feedback
  - [ ] Can copy results easily

- [ ] **Data Privacy**
  - [ ] No data sent to external servers (except OpenRouter)
  - [ ] API keys stored locally only
  - [ ] No tracking/analytics (unless explicitly added)

- [ ] **Maintenance**
  - [ ] Documentation complete
  - [ ] Code commented
  - [ ] Tests passing
  - [ ] Known limitations documented

## 🎉 Launch!

When all checkboxes are ✓:

1. **Announce**: Share URL with team/users
2. **Monitor**: Watch for issues in first uses
3. **Iterate**: Gather feedback and improve
4. **Document**: Keep track of common violations and patterns

## 📞 Support Contacts

- **Issues**: GitHub Issues tab
- **Questions**: See DEV_GUIDE.md
- **Tests**: Run tests/test-runner.html
- **Docs**: See GENERATION.md

---

**Checklist Version**: 2.0.0
**Last Updated**: January 14, 2026
