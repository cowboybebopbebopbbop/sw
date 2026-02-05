# SimpleWine Brief Parser - Structure Migration Script
# This script reorganizes the project into a production-ready structure

Write-Host "🚀 Starting project structure migration..." -ForegroundColor Cyan

# Get current directory
$projectRoot = Get-Location

# Phase 1: Create new folder structure
Write-Host "`n📁 Phase 1: Creating new folder structure..." -ForegroundColor Yellow

$folders = @(
    "public",
    "public/css",
    "public/js",
    "public/assets",
    "src/core",
    "src/generation",
    "src/export",
    "src/export/templates",
    "src/analytics",
    "src/batch",
    "src/utils",
    "src/ui",
    "knowledge/formats",
    "knowledge/formats/email",
    "knowledge/formats/email/examples",
    "knowledge/rules",
    "knowledge/prompts",
    "knowledge/prompts/templates",
    "tests/unit",
    "tests/integration",
    "tests/e2e",
    "tests/fixtures",
    "tests/fixtures/briefs",
    "tests/fixtures/expected-outputs",
    "tests/helpers",
    "docs/architecture",
    "docs/api",
    "docs/guides",
    "docs/troubleshooting",
    "scripts"
)

foreach ($folder in $folders) {
    $path = Join-Path $projectRoot $folder
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "  Created: $folder" -ForegroundColor Green
    }
    else {
        Write-Host "  Exists: $folder" -ForegroundColor Gray
    }
}

# Phase 2: Move existing files
Write-Host "`n📦 Phase 2: Moving existing files..." -ForegroundColor Yellow

# Move parsing logic to core
$coreMoves = @(
    @{From="parsing_logic"; To="src/core/briefParser.js"}
)

# Move generation files
$generationMoves = @(
    @{From="src/generation/generateEmail.js"; To="src/generation/generateEmail.js"; SkipIfSame=$true},
    @{From="src/generation/validator.js"; To="src/generation/validator.js"; SkipIfSame=$true},
    @{From="src/generation/promptComposer.js"; To="src/generation/promptComposer.js"; SkipIfSame=$true},
    @{From="src/generation/knowledgeLoader.js"; To="src/generation/knowledgeLoader.js"; SkipIfSame=$true},
    @{From="src/generation/surgicalRepair.js"; To="src/generation/surgicalRepair.js"; SkipIfSame=$true},
    @{From="src/generation/tieredKnowledge.js"; To="src/generation/tieredKnowledge.js"; SkipIfSame=$true}
)

# Move UI files
$uiMoves = @(
    @{From="index.html"; To="public/index.html"},
    @{From="styles.css"; To="public/css/main.css"},
    @{From="app.js"; To="public/js/app.js"}
)

# Move knowledge base
$knowledgeMoves = @(
    @{From="SPEC_EMAIL_V1.md"; To="knowledge/formats/email/SPEC_EMAIL_V1.md"},
    @{From="SW_GLOBAL_RULES.md"; To="knowledge/rules/SW_GLOBAL_RULES.md"},
    @{From="SW_LEXICON_AND_BANS.md"; To="knowledge/rules/SW_LEXICON_AND_BANS.md"},
    @{From="system_instructions.txt"; To="knowledge/prompts/system_instructions.txt"}
)

# Move tests
$testMoves = @(
    @{From="test-runner.html"; To="tests/test-runner.html"},
    @{From="test-buttons.html"; To="tests/test-buttons.html"},
    @{From="test-feedback.html"; To="tests/test-feedback.html"},
    @{From="test.html"; To="tests/test.html"},
    @{From="tests/audit.test.js"; To="tests/unit/audit.test.js"},
    @{From="tests/integration.test.js"; To="tests/integration/integration.test.js"},
    @{From="tests/surgical-repair.test.js"; To="tests/unit/surgical-repair.test.js"},
    @{From="tests/tiered-knowledge.test.js"; To="tests/unit/tiered-knowledge.test.js"},
    @{From="tests/validator.test.js"; To="tests/unit/validator.test.js"},
    @{From="tests/test-format-parsing.html"; To="tests/unit/test-format-parsing.html"},
    @{From="tests/fixtures/sample-digest-parsed.md"; To="tests/fixtures/briefs/sample-digest-parsed.md"}
)

# Move documentation
$docMoves = @(
    @{From="CHANGELOG.md"; To="docs/CHANGELOG.md"},
    @{From="GENERATION_LOGIC.md"; To="docs/architecture/generation-pipeline.md"},
    @{From="GENERATION.md"; To="docs/architecture/overview.md"},
    @{From="FORMAT_PARSING_FIX.md"; To="docs/troubleshooting/format-parsing-fix.md"},
    @{From="DEPLOYMENT.md"; To="docs/guides/deployment.md"},
    @{From="DEV_GUIDE.md"; To="docs/guides/dev-guide.md"},
    @{From="END_TO_END_WORKFLOW.md"; To="docs/architecture/end-to-end-workflow.md"},
    @{From="FIX_SUMMARY.md"; To="docs/troubleshooting/fix-summary.md"},
    @{From="IMPLEMENTATION_SUMMARY.md"; To="docs/architecture/implementation-summary.md"},
    @{From="PROJECT_SUMMARY.md"; To="docs/project-summary.md"},
    @{From="QUICK_REFERENCE.md"; To="docs/quick-reference.md"},
    @{From="QUICKSTART.md"; To="docs/GETTING_STARTED.md"},
    @{From="TEMPLATES.md"; To="docs/guides/templates.md"}
)

# Move reports to docs
$reportMoves = @(
    @{From="reports/ARCHITECTURAL_EVALUATION.md"; To="docs/architecture/evaluation.md"},
    @{From="reports/END_TO_END_WORKFLOW_AUDIT.md"; To="docs/architecture/workflow-audit.md"},
    @{From="reports/OPTIMIZATION_IMPLEMENTATION.md"; To="docs/architecture/optimization.md"}
)

function Move-FileIfExists {
    param($From, $To, $SkipIfSame)
    
    $sourcePath = Join-Path $projectRoot $From
    $destPath = Join-Path $projectRoot $To
    
    if ($SkipIfSame -and $sourcePath -eq $destPath) {
        Write-Host "  Skip (same location): $From" -ForegroundColor Gray
        return
    }
    
    if (Test-Path $sourcePath) {
        $destDir = Split-Path $destPath -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Move-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "  Moved: $From -> $To" -ForegroundColor Green
    }
    else {
        Write-Host "  Not found: $From" -ForegroundColor Red
    }
}

Write-Host "`n  Moving UI files..." -ForegroundColor Cyan
foreach ($move in $uiMoves) {
    Move-FileIfExists -From $move.From -To $move.To -SkipIfSame $move.SkipIfSame
}

Write-Host "`n  Moving knowledge base..." -ForegroundColor Cyan
foreach ($move in $knowledgeMoves) {
    Move-FileIfExists -From $move.From -To $move.To -SkipIfSame $move.SkipIfSame
}

Write-Host "`n  Moving tests..." -ForegroundColor Cyan
foreach ($move in $testMoves) {
    Move-FileIfExists -From $move.From -To $move.To -SkipIfSame $move.SkipIfSame
}

Write-Host "`n  Moving documentation..." -ForegroundColor Cyan
foreach ($move in $docMoves) {
    Move-FileIfExists -From $move.From -To $move.To -SkipIfSame $move.SkipIfSame
}

Write-Host "`n  Moving reports..." -ForegroundColor Cyan
foreach ($move in $reportMoves) {
    Move-FileIfExists -From $move.From -To $move.To -SkipIfSame $move.SkipIfSame
}

# Phase 3: Create index files
Write-Host "`n Phase 3: Creating index files..." -ForegroundColor Yellow

# Generation module index
$generationIndex = @"
/**
 * Generation Module - Main Exports
 * Entry point for email generation functionality
 */

export { generateEmail } from './generateEmail.js';
"@

Set-Content -Path (Join-Path $projectRoot "src/generation/index.js") -Value $generationIndex -Encoding UTF8
Write-Host "  Created: src/generation/index.js" -ForegroundColor Green

# Phase 4: Create package.json
Write-Host "`n Phase 4: Creating package.json..." -ForegroundColor Yellow

$packageJson = @'
{
  "name": "simplewine-brief-parser",
  "version": "1.0.0",
  "description": "AI-powered email generation for SimpleWine marketing campaigns",
  "type": "module",
  "scripts": {
    "serve": "python -m http.server 8000"
  }
}
'@

Set-Content -Path (Join-Path $projectRoot "package.json") -Value $packageJson -Encoding UTF8
Write-Host "  Created: package.json" -ForegroundColor Green

# Phase 5: Create docs README
Write-Host "`n Phase 5: Creating documentation..." -ForegroundColor Yellow

$docsReadme = @'
# SimpleWine Brief Parser - Documentation

See complete documentation in the docs/ folder.
'@

Set-Content -Path (Join-Path $projectRoot "docs/README.md") -Value $docsReadme -Encoding UTF8
Write-Host "  Created: docs/README.md" -ForegroundColor Green

# Create main README update
$mainReadme = @'
# SimpleWine Brief Parser

AI-powered email generation system for SimpleWine marketing campaigns.

## Quick Start

Start development server:
npm run serve

Open browser: http://localhost:8000/public/
'@

Set-Content -Path (Join-Path $projectRoot "README.md") -Value $mainReadme -Encoding UTF8
Write-Host "  Updated: README.md" -ForegroundColor Green

# Phase 6: Summary
Write-Host "`n ==========================================" -ForegroundColor Cyan
Write-Host " Migration completed successfully!" -ForegroundColor Green
Write-Host " ==========================================" -ForegroundColor Cyan

Write-Host "`n Summary:" -ForegroundColor Yellow
Write-Host "  Created $($folders.Count) new directories"
Write-Host "  Moved files to organized structure"
Write-Host "  Created package.json and documentation"

Write-Host "`n Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Update import paths in public/js/app.js"
Write-Host "  2. Test the application: npm run serve"
Write-Host "  3. Verify all tests pass"

Write-Host "`n Start dev server:" -ForegroundColor Cyan
Write-Host "  npm run serve"
Write-Host "  Open: http://localhost:8000/public/" -ForegroundColor Green

Write-Host "`n Migration complete!" -ForegroundColor Green
