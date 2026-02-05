# build-for-gh-pages.ps1
# Builds the project for GitHub Pages deployment

$ErrorActionPreference = "Stop"

Write-Host "Building for GitHub Pages..." -ForegroundColor Cyan

# Create docs folder
$rootPath = Join-Path $PSScriptRoot ".."
$docsPath = Join-Path $rootPath "docs-deploy"
if (Test-Path $docsPath) {
    Remove-Item -Recurse -Force $docsPath
}
New-Item -ItemType Directory -Path $docsPath | Out-Null

# Copy public folder contents to docs root
$publicPath = Join-Path $rootPath "public"
Copy-Item -Path (Join-Path $publicPath "*") -Destination $docsPath -Recurse

# Create src folder structure in docs
$srcDest = Join-Path $docsPath "src"
$srcSource = Join-Path $rootPath "src"
New-Item -ItemType Directory -Path $srcDest | Out-Null
Copy-Item -Path (Join-Path $srcSource "*") -Destination $srcDest -Recurse

# Create knowledge folder structure in docs
$knowledgeDest = Join-Path $docsPath "knowledge"
$knowledgeSource = Join-Path $rootPath "knowledge"
New-Item -ItemType Directory -Path $knowledgeDest | Out-Null
Copy-Item -Path (Join-Path $knowledgeSource "*") -Destination $knowledgeDest -Recurse

# Update paths in index.html (remove ../ prefix since everything is now at same level)
$indexPath = Join-Path $docsPath "index.html"
$content = Get-Content $indexPath -Raw
$content = $content -replace '\.\./src/', 'src/'
$content = $content -replace '\.\./knowledge/', 'knowledge/'
Set-Content -Path $indexPath -Value $content

Write-Host "Build complete! Files are in: $docsPath" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Rename 'docs-deploy' to 'docs'"
Write-Host "2. Commit and push to GitHub"
Write-Host "3. Go to repo Settings > Pages > Source: 'Deploy from branch'"
Write-Host "4. Select branch 'main' and folder '/docs'"
Write-Host "5. Save and wait for deployment"
