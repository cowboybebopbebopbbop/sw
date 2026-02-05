# Test all file paths are accessible
Write-Host "Testing file paths..." -ForegroundColor Cyan

$baseUrl = "http://localhost:8000"
$testPaths = @(
    "/public/",
    "/public/css/main.css",
    "/public/js/app.js",
    "/src/core/parsing-spec.js",
    "/src/generation/knowledgeLoader.js",
    "/src/generation/validator.js",
    "/src/generation/promptComposer.js",
    "/src/generation/generateEmail.js",
    "/knowledge/prompts/system_instructions.txt",
    "/knowledge/formats/email/SPEC_EMAIL_V1.md",
    "/knowledge/rules/SW_GLOBAL_RULES.md",
    "/knowledge/rules/SW_LEXICON_AND_BANS.md"
)

$passed = 0
$failed = 0

foreach ($path in $testPaths) {
    $url = $baseUrl + $path
    try {
        $response = Invoke-WebRequest -Uri $url -Method Head -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  OK: $path" -ForegroundColor Green
            $passed++
        }
    }
    catch {
        Write-Host "  FAIL: $path" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`nResults: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Yellow' })
